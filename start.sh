#!/usr/bin/env bash
# NBLMimic — Linux One-Click / Terminal Launcher
cd "$(dirname "$0")"

echo "===================================================="
echo " Starting Research Lab on http://localhost:3000..."
echo "===================================================="

# Open browser if graphical environment is running
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:3000" >/dev/null 2>&1) &
fi

node server.js
