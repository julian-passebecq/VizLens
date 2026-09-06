@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo   VizLens Personal v1.0 launcher
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install Node.js 20 or newer, then open a new terminal.
  exit /b 1
)

if "%GEMINI_API_KEY%"=="" if "%GOOGLE_API_KEY%"=="" (
  echo [ERROR] GEMINI_API_KEY or GOOGLE_API_KEY is not set.
  echo Set it once in Windows User environment variables, then open a new terminal.
  echo See START_HERE.md for the exact steps.
  exit /b 1
)

echo [OK] Node.js found.
echo [OK] Gemini key detected in the environment ^(value is not displayed^).
echo.
echo Starting the VizLens Gemini companion in a separate terminal...
start "VizLens Gemini Companion" cmd /k "cd /d ""%~dp0"" && node server\gemini-proxy.mjs"

timeout /t 2 /nobreak >nul

set "CHROME_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME_EXE (
  echo Opening VizLens health check and Chrome extensions page...
  start "" "%CHROME_EXE%" "http://127.0.0.1:3987/health"
  start "" "%CHROME_EXE%" "chrome://extensions/"
) else (
  echo Chrome executable was not auto-detected.
  echo Open these manually:
  echo   http://127.0.0.1:3987/health
  echo   chrome://extensions/
)

echo.
echo VizLens is ready when /health shows "ok": true.
echo If this is your first run, enable Developer mode and Load unpacked once.
echo After that, you normally only need to run this launcher and use the VizLens toolbar icon.
echo.
endlocal
