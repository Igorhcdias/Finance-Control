param(
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $projectRoot '.tools'
$pythonExe = Join-Path $toolsDir 'python\python.exe'
$pgData = Join-Path $toolsDir 'pgdata'
$backendDir = Join-Path $projectRoot 'backend-python'
$frontendDir = Join-Path $projectRoot 'frontend'
$nodeExe = (Get-Command node.exe).Source

if (-not (Test-Path -LiteralPath $pythonExe)) { throw 'Runtime local ausente em .tools/python. Consulte backend-python/README.md para instalar Python e dependencias.' }
if (-not (Test-Path -LiteralPath (Join-Path $PgBin 'pg_ctl.exe'))) { throw 'PostgreSQL nao encontrado. Informe -PgBin com o diretorio bin instalado.' }
if (-not (Test-Path -LiteralPath (Join-Path $frontendDir 'node_modules\vite\bin\vite.js'))) { throw 'Execute npm.cmd ci em frontend antes de iniciar.' }
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION'))) {
    & (Join-Path $PgBin 'initdb.exe') -D $pgData -U finance -A trust --locale=C --encoding=UTF8
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar o PostgreSQL local.' }
}
& (Join-Path $PgBin 'pg_ctl.exe') -D $pgData status *> $null
if ($LASTEXITCODE -ne 0) {
    & (Join-Path $PgBin 'pg_ctl.exe') -D $pgData -l (Join-Path $toolsDir 'postgres.log') -o '-p 55432 -h 127.0.0.1' start
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar o PostgreSQL local. Confira .tools/postgres.log.' }
}
& $pythonExe (Join-Path $backendDir 'scripts\setup_local_db.py')
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o banco local.' }

# Set explicit process-local values, independent of production .env files.
$env:DATABASE_URL = 'postgresql://finance@127.0.0.1:55432/finance_dev'
$env:JWT_SECRET = 'finance-control-local-only-development-secret-2026'
$env:JWT_EXPIRES_IN = '1d'
$env:FRONTEND_URL = 'http://localhost:5173'
$env:PORT = '3333'
$env:VITE_API_URL = 'http://localhost:3333/api'

function Start-LocalService($Name, $Port, $Exe, $Arguments, $Directory) {
    $pidFile = Join-Path $toolsDir ($Name + '.pid')
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listener) {
        $savedId = if (Test-Path -LiteralPath $pidFile) { [int](Get-Content -LiteralPath $pidFile) } else { 0 }
        $ownerIds = @($listener | Select-Object -ExpandProperty OwningProcess -Unique)
        $ownedProcess = if ($savedId) { Get-CimInstance Win32_Process -Filter "ProcessId = $savedId" } else { $null }
        $expectedArgs = if ($Name -eq 'fastapi-local') { '*-m app*' } else { '*frontend\node_modules\vite\bin\vite.js*--port 5173*' }
        if ($savedId -and $ownerIds -contains $savedId -and $ownedProcess.ExecutablePath -eq $Exe -and $ownedProcess.CommandLine -like $expectedArgs) {
            Write-Host "$Name ja esta em execucao (PID $savedId)."
            return
        }
        throw "Porta $Port ocupada por outro processo. Nenhum processo foi encerrado."
    }
    $process = Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $toolsDir ($Name + '.out.log')) -RedirectStandardError (Join-Path $toolsDir ($Name + '.err.log'))
    Set-Content -LiteralPath $pidFile -Value $process.Id
    Write-Host "$Name iniciado (PID $($process.Id))."
}

Start-LocalService 'fastapi-local' 3333 $pythonExe '-m app' $backendDir
$viteScript = Join-Path $frontendDir 'node_modules\vite\bin\vite.js'
Start-LocalService 'react-local' 5173 $nodeExe ('"' + $viteScript + '" --host 127.0.0.1 --port 5173 --strictPort --mode development') $frontendDir

foreach ($url in @('http://127.0.0.1:3333/health', 'http://127.0.0.1:3333/docs', 'http://127.0.0.1:5173')) {
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw "Servico nao respondeu em $url. Confira os logs em .tools/." }
    Write-Host "OK: $url"
}
Write-Host 'Banco exclusivo de desenvolvimento: 127.0.0.1:55432/finance_dev'
