@echo off
echo Disabling auto-start...
powershell -NoProfile -Command "Remove-Item -Path ([System.IO.Path]::Combine([Environment]::GetFolderPath('Startup'), 'ResearchLabServer.lnk')) -ErrorAction SilentlyContinue"
echo [OK] Auto-start removed from Windows Startup.
pause
