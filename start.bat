@echo off
title Research Lab (NBLMimic) Server
cd /d "%~dp0"
if exist "NBLMimic\server.js" cd NBLMimic
echo ====================================================
echo Starting Research Lab on http://localhost:3000...
echo ====================================================
start "" http://localhost:3000
node server.js
pause
