@echo off
echo Enabling silent background auto-start for NBLMimic...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Startup'), 'NBLMimicServer.lnk')); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%~dp0background-server.vbs\"'; $s.WorkingDirectory = '%~dp0'; $s.Save()"
echo [OK] NBLMimic will now automatically start in the background when Windows boots!
pause
