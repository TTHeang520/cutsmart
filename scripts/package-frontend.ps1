# Build the React site and zip it for uploading to PythonAnywhere.
# Run from the repository root:  .\scripts\package-frontend.ps1
# Output: release\cutsmart-frontend.zip (release\ is ignored by Git)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"
$release = Join-Path $root "release"
$zip = Join-Path $release "cutsmart-frontend.zip"

Push-Location $frontend
try {
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
} finally {
    Pop-Location
}

New-Item -ItemType Directory -Force $release | Out-Null
if (Test-Path $zip) { Remove-Item $zip }
# Zip the contents of dist (index.html, assets/...), not the dist folder itself.
# Entries are written with "/" separators: Compress-Archive in Windows PowerShell
# uses "\", which Linux's unzip can extract as odd file names.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$dist = (Resolve-Path (Join-Path $frontend "dist")).Path
$archive = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem $dist -Recurse -File | ForEach-Object {
        $entry = $_.FullName.Substring($dist.Length + 1).Replace("\", "/")
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive, $_.FullName, $entry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally {
    $archive.Dispose()
}
$size = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Created $zip ($size MB). Upload it to PythonAnywhere's Files tab."
