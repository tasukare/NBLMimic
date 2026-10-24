@echo off
cd /d "%~dp0"
if exist "NBLMimic\server.js" cd NBLMimic

:: Check if server is already running on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    start "" http://localhost:3000
    exit /b 0
)

:: Launch Node.js server silently in background without terminal window
start /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'server.js' -WindowStyle Hidden"

:: Open browser
start "" http://localhost:3000
exit /b 0
