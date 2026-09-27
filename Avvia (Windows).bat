@echo off
rem Doppio clic per avviare l'app in locale su Windows.
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js non e' installato. Scaricalo da https://nodejs.org ^(versione LTS^), poi riprova.
  start https://nodejs.org
  pause
  exit /b 1
)

if not exist .env.local (
  echo DEMO=1> .env.local
)

if not exist node_modules (
  echo Primo avvio: installo i componenti ^(qualche minuto^)...
  call npm install
  if errorlevel 1 (
    echo Installazione non riuscita.
    pause
    exit /b 1
  )
)

echo Avvio l'app su http://localhost:3000 ^(chiudi questa finestra per fermarla^)
start "" cmd /c "timeout /t 8 >nul && start http://localhost:3000"
call npm run dev
