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

set "HAS_KEY=0"
if not "%GEMINI_API_KEY%"=="" set "HAS_KEY=1"
if not "%GOOGLE_API_KEY%"=="" set "HAS_KEY=1"

set "PROXY_RUNNING=0"
powershell -NoProfile -Command "try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:3987/health' -TimeoutSec 1; if ($r.ok) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 set "PROXY_RUNNING=1"

if "%PROXY_RUNNING%"=="1" (
  echo [OK] VizLens Gemini companion is already running.
) else if "%HAS_KEY%"=="1" (
  echo [OK] Gemini key detected in the environment ^(value is not displayed^).
  echo Starting the VizLens Gemini companion in a separate terminal...
  start "VizLens Gemini Companion" cmd /k "cd /d ""%~dp0"" && node server\gemini-proxy.mjs"
  timeout /t 2 /nobreak >nul
  powershell -NoProfile -Command "try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:3987/health' -TimeoutSec 2; if ($r.ok) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (
    set "PROXY_RUNNING=1"
    echo [OK] Gemini companion is healthy.
  ) else (
    echo [WARN] Companion did not answer the health check yet.
    echo        You can still test deterministic Scan page features.
  )
) else (
  echo [INFO] No GEMINI_API_KEY or GOOGLE_API_KEY is configured.
  echo        VizLens will still work in deterministic scan-only mode.
  echo        Add the key later and rerun this launcher to enable Gemini.
)

set "CHROME_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if defined CHROME_EXE (
  echo Opening Chrome extensions page...
  start "" "%CHROME_EXE%" "chrome://extensions/"
  if "%PROXY_RUNNING%"=="1" start "" "%CHROME_EXE%" "http://127.0.0.1:3987/health"
) else (
  echo Chrome executable was not auto-detected.
  echo Open manually: chrome://extensions/
  if "%PROXY_RUNNING%"=="1" echo Health: http://127.0.0.1:3987/health
)

echo.
echo Ready.
echo First run only: enable Developer mode and Load unpacked from this folder.
echo After that: open a normal page, click the VizLens toolbar icon, then Scan page.
echo.
endlocal
