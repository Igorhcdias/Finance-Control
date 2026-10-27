param(
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $projectRoot '.tools'
$pythonExe = Join-Path $toolsDir 'python\python.exe'
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'
$nodeExe = (Get-Command node.exe).Source

if (-not (Test-Path -LiteralPath $pythonExe)) { throw 'Runtime local ausente em .tools/python. Consulte backend/README.md para instalar Python e dependencias.' }
if (-not (Test-Path -LiteralPath (Join-Path $frontendDir 'node_modules\vite\bin\vite.js'))) { throw 'Execute npm.cmd ci em frontend antes de iniciar.' }
if (-not (Test-Path -LiteralPath (Join-Path $backendDir '.env'))) { throw 'Configure backend/.env antes de iniciar.' }
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

# Use backend/.env, including its hosted database, instead of inherited local overrides.
foreach ($variable in @('DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'FRONTEND_URL', 'PORT', 'VITE_API_URL')) {
    Remove-Item "Env:$variable" -ErrorAction SilentlyContinue
}
$env:PORT = '3333'
$env:FRONTEND_URL = 'http://localhost:5173'
$env:VITE_API_URL = 'http://127.0.0.1:3333/api'

# Read-only check: do not run seeds, migrations or schema creation on the hosted database.
Push-Location $backendDir
try {
    & $pythonExe 'scripts/check_database.py'
    if ($LASTEXITCODE -ne 0) { throw 'Falha na conexao configurada em backend/.env.' }
} finally {
    Pop-Location
}

function Start-LocalService($Name, $Port, $Exe, $Arguments, $Directory) {
    $pidFile = Join-Path $toolsDir ($Name + '.pid')
    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listener) {
        $savedId = if (Test-Path -LiteralPath $pidFile) { [int](Get-Content -LiteralPath $pidFile) } else { 0 }
        $ownerIds = @($listener | Select-Object -ExpandProperty OwningProcess -Unique)
        $ownedProcess = if ($savedId) { Get-CimInstance Win32_Process -Filter "ProcessId = $savedId" } else { $null }
        $expectedArgs = if ($Name -eq 'fastapi-local') { '*-m app*' } else { '*frontend\node_modules\vite\bin\vite.js*--port 5173*' }
        if ($savedId -and $ownerIds -contains $savedId -and $ownedProcess.ExecutablePath -eq $Exe -and ($ownedProcess.CommandLine -like $expectedArgs -or ($Name -eq 'fastapi-local' -and $ownedProcess.CommandLine -like '*backend\scripts\run_local.py*'))) {
            Stop-Process -Id $savedId -ErrorAction Stop
            Wait-Process -Id $savedId -Timeout 10 -ErrorAction SilentlyContinue
        }
        else { throw "Porta $Port ocupada por outro processo. Pare esse servico antes de iniciar." }
    }
    $process = Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $toolsDir ($Name + '.out.log')) -RedirectStandardError (Join-Path $toolsDir ($Name + '.err.log'))
    Set-Content -LiteralPath $pidFile -Value $process.Id
    Write-Host "$Name iniciado (PID $($process.Id))."
}

$apiLauncher = Join-Path $backendDir 'scripts\run_local.py'
Start-LocalService 'fastapi-local' 3333 $pythonExe ('"' + $apiLauncher + '"') $backendDir
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
Write-Host 'Banco: conexao definida em backend/.env. Frontend: http://localhost:5173'
