@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo FAIL  npm was not found in PATH. Install Node.js 20 or newer and retry.
  exit /b 1
)
echo Running the VizLens v1.0 zero-quota release gate...
call npm run verify:personal
if errorlevel 1 exit /b %errorlevel%
echo.
echo PASS  VizLens v1.0 zero-quota release gate completed.
