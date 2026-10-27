param([string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $projectRoot '.tools'
foreach ($name in @('fastapi-local', 'react-local')) {
    $pidFile = Join-Path $toolsDir ($name + '.pid')
    if (Test-Path -LiteralPath $pidFile) {
        $serviceId = [int](Get-Content -LiteralPath $pidFile)
        $service = Get-CimInstance Win32_Process -Filter "ProcessId = $serviceId"
        $expectedPath = if ($name -eq 'fastapi-local') { Join-Path $toolsDir 'python\python.exe' } else { (Get-Command node.exe).Source }
        $expectedArgs = if ($name -eq 'fastapi-local') { '*-m app*' } else { '*frontend\node_modules\vite\bin\vite.js*--port 5173*' }
        if ($service -and $service.ExecutablePath -eq $expectedPath -and ($service.CommandLine -like $expectedArgs -or ($name -eq 'fastapi-local' -and $service.CommandLine -like '*backend\scripts\run_local.py*'))) {
            Stop-Process -Id $serviceId
            Write-Host "$name encerrado."
        } elseif ($service) {
            throw "PID $serviceId nao corresponde ao servico local esperado; nada foi encerrado."
        }
    }
}
$pgData = Join-Path $toolsDir 'pgdata'
if (Test-Path -LiteralPath (Join-Path $pgData 'PG_VERSION')) {
    & (Join-Path $PgBin 'pg_ctl.exe') -D $pgData status *> $null
    if ($LASTEXITCODE -eq 0) {
        & (Join-Path $PgBin 'pg_ctl.exe') -D $pgData stop -m fast
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao encerrar o PostgreSQL auxiliar.' }
    }
}
