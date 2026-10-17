param([string]$Python = "$PSScriptRoot\..\.venv\Scripts\python.exe")
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
try {
    Push-Location frontend
    try {
        npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
        npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
    } finally { Pop-Location }
    & $Python -m PyInstaller --noconfirm --onedir --console --name CutSmart --distpath release --workpath build/windows --specpath build --paths backend --add-data "$root/frontend/dist;frontend/dist" backend/desktop.py
    if ($LASTEXITCODE -ne 0) { throw 'Packaging failed' }
    Copy-Item docs/LOCAL_APP.md release/CutSmart/START_HERE.md
    Compress-Archive -Path release/CutSmart -DestinationPath release/CutSmart-Windows-x64.zip -Force
    Get-FileHash release/CutSmart-Windows-x64.zip -Algorithm SHA256
} finally { Pop-Location }
