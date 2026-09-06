@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo VizLens Personal v1.0 - first-run check
echo ============================================================

where node >nul 2>nul
if errorlevel 1 (
  echo FAIL  Node.js was not found in PATH.
  echo Install Node.js 20 or newer, open a new terminal, then run this file again.
  exit /b 1
)

node scripts\personal-doctor.mjs
if errorlevel 1 (
  echo.
  echo A required local check failed. See the messages above.
  exit /b 1
)

echo.
echo Next steps:
echo   1. If the Gemini key is missing, add GEMINI_API_KEY to your Windows User environment variables.
echo   2. Run start-vizlens.cmd and leave that terminal open.
echo   3. Open chrome://extensions, enable Developer mode, and Load unpacked from this folder.
echo   4. Open a normal web page, click the VizLens toolbar icon, then click Scan page.
echo   5. Read START_HERE.md and FIRST_TEST_CHECKLIST.md for the controlled tests.
echo.
echo Normal Scan page works without Gemini. Gemini actions require the local companion and key.
