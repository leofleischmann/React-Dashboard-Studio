@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if "%~1"=="" (
  echo.
  echo  Usage: bump.bat ^<version^>
  echo  Beispiel: bump.bat 0.0.2
  echo.
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js wurde nicht gefunden. Bitte Node.js installieren.
  exit /b 1
)

node scripts/bump-version.mjs %1
if errorlevel 1 exit /b 1

echo.
echo  Version auf %~1 gesetzt in:
echo    package.json
echo    package-lock.json
echo    custom_components\homeassistant_dashboard_studio\manifest.json
echo.
