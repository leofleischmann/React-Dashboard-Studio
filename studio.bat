@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo npm wurde nicht gefunden. Bitte Node.js installieren.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo  node_modules fehlt — npm install wird ausgefuehrt ...
  echo.
  call npm install
  if errorlevel 1 (
    echo npm install fehlgeschlagen.
    pause
    exit /b 1
  )
  echo.
)

:menu
cls
echo.
echo  Home Assistant Dashboard Studio
echo  ======================
echo.
echo   Dashboard ^(VS Code + HA^)
echo   -------------------------
echo   1  dev              Live-Vorschau
echo   2  sync:pull         HA -^> ./dashboard/
echo   3  sync:push         ./dashboard/ -^> HA
echo   4  sync:watch        Auto-Push bei Speichern
echo   5  gen:types         Entity-Typen + ENTITIES.md
echo   6  check:dashboard   ./dashboard/ pruefen
echo.
echo   Entwickler ^(Integration selbst erweitern^)
echo   -----------------------------------------
echo   A  build             Panel bauen ^(dashboard.js^)
echo   B  check:default     Demo-Dashboard pruefen ^(CI^)
echo.
echo   0  Beenden
echo.
set "choice="
set /p choice="Auswahl (1-6, A-B, 0): "

if "%choice%"=="1"  goto run_dev
if "%choice%"=="2"  goto run_sync_pull
if "%choice%"=="3"  goto run_sync_push
if "%choice%"=="4"  goto run_sync_watch
if "%choice%"=="5"  goto run_gen_types
if "%choice%"=="6"  goto run_check_dashboard
if /i "%choice%"=="A"  goto run_build
if /i "%choice%"=="B"  goto run_check_default
if "%choice%"=="0"  exit /b 0

echo.
echo  Ungueltige Auswahl.
timeout /t 2 >nul
goto menu

:run_dev
call npm run dev
goto after

:run_sync_pull
call npm run sync:pull
goto after

:run_sync_push
call npm run sync:push
goto after

:run_sync_watch
call npm run sync:watch
goto after

:run_gen_types
call npm run gen:types
goto after

:run_check_dashboard
call npm run check:dashboard
goto after

:run_build
call npm run build
goto after

:run_check_default
call npm run check:default
goto after

:after
echo.
pause
goto menu
