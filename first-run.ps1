$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "============================================================"
Write-Host "VizLens Personal v1.0 - first-run check"
Write-Host "============================================================"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js was not found in PATH. Install Node.js 20 or newer, open a new terminal, then retry."
}

node scripts/personal-doctor.mjs
if ($LASTEXITCODE -ne 0) {
  throw "A required local check failed. See the messages above."
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. If the Gemini key is missing, add GEMINI_API_KEY to your Windows User environment variables."
Write-Host "  2. Run start-vizlens.cmd and leave that terminal open."
Write-Host "  3. Open chrome://extensions, enable Developer mode, and Load unpacked from this folder."
Write-Host "  4. Open a normal web page, click the VizLens toolbar icon, then click Scan page."
Write-Host "  5. Read START_HERE.md and FIRST_TEST_CHECKLIST.md for the controlled tests."
Write-Host ""
Write-Host "Normal Scan page works without Gemini. Gemini actions require the local companion and key."
