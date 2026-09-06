@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo VizLens: Node.js was not found in PATH.
  echo Install Node.js 20 or newer, open a new terminal, then retry.
  exit /b 1
)

if "%GEMINI_API_KEY%"=="" if "%GOOGLE_API_KEY%"=="" (
  echo VizLens: GEMINI_API_KEY or GOOGLE_API_KEY is not set.
  echo Add the key to your Windows User environment variables, open a new terminal, then run this file again.
  echo See START_HERE.md and KEY_MANAGEMENT.md.
  exit /b 1
)

echo Starting VizLens Personal v1.0 Gemini companion...
echo Health: http://127.0.0.1:3987/health
echo Keep this terminal open while using Gemini features. Press Ctrl+C to stop.
echo.
node server\gemini-proxy.mjs
