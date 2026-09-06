$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

node scripts/build-store.mjs

$zip = Join-Path $root "dist/vizlens-chrome-web-store-v1.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $root "dist/store/*") -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Chrome Web Store ZIP: $zip"
