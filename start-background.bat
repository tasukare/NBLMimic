@echo off
cd /d "%~dp0"
if exist "NBLMimic\server.js" cd NBLMimic

:: Check if server is already running on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    exit /b 0
)

:: Launch Node server silently in background with no window
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'server.js' -WorkingDirectory '%CD%' -WindowStyle Hidden"
exit /b 0
