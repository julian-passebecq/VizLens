@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo VizLens Personal v1.0 - zero-quota pre-test verification
echo ============================================================

where node >nul 2>nul
if errorlevel 1 (
  echo FAIL  Node.js was not found in PATH.
  echo Install Node.js 20 or newer, open a new terminal, then retry.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo FAIL  npm was not found in PATH.
  exit /b 1
)

call npm run verify:personal
if errorlevel 1 (
  echo.
  echo FAIL  VizLens pre-test verification failed.
  exit /b 1
)

echo.
echo PASS  VizLens deterministic, proxy, fixture, BBC and Gemini-contract checks passed.
echo       No live Gemini request was made by this verification.
endlocal
