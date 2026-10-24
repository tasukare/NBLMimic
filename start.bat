@echo off
title NBLMimic Server
cd /d "%~dp0"
if exist "NBLMimic\server.js" cd NBLMimic
echo ====================================================
echo Starting NBLMimic on http://localhost:3000...
echo ====================================================
start "" http://localhost:3000
node server.js
pause
