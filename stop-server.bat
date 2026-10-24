@echo off
echo Stopping Research Lab background server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo [OK] Background server stopped.
timeout /t 3 >nul
