$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "VizLens: Node.js was not found in PATH. Install Node.js 20 or newer, open a new terminal, and retry."
}
if (-not $env:GEMINI_API_KEY -and -not $env:GOOGLE_API_KEY) {
  throw "VizLens: GEMINI_API_KEY or GOOGLE_API_KEY is not set. Add it to your Windows User environment variables, open a new terminal, and retry. See START_HERE.md and KEY_MANAGEMENT.md."
}

Write-Host "Starting VizLens Personal v1.0 Gemini companion..."
Write-Host "Health: http://127.0.0.1:3987/health"
Write-Host "Keep this terminal open while using Gemini features. Press Ctrl+C to stop."
Write-Host ""
node server/gemini-proxy.mjs
