const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const innerDir = path.join(rootDir, 'NBLMimic');

console.log('Consolidating project from:', innerDir, 'to:', rootDir);

if (!fs.existsSync(innerDir)) {
  console.log('Inner NBLMimic folder does not exist. Already consolidated!');
  process.exit(0);
}

// 1. Critical directories to move
const dirsToMove = ['.git', 'js', 'css', 'avatars'];
for (const d of dirsToMove) {
  const src = path.join(innerDir, d);
  const dst = path.join(rootDir, d);
  if (fs.existsSync(src)) {
    if (fs.existsSync(dst)) {
      console.log(`Target ${dst} already exists, merging...`);
      fs.cpSync(src, dst, { recursive: true, force: true });
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      console.log(`Moving ${d} to root...`);
      fs.renameSync(src, dst);
    }
  }
}

// 2. Critical and project files to move/copy
const filesToMove = [
  '.env',
  '.env.example',
  'server.js',
  'components.html',
  'drive_butler_v2.js',
  'favicon.ico',
  'favicon.svg',
  'google_client_secret.json',
  'logo.jpg',
  'logo.png',
  'STYLEGUIDE.md',
  'tokens.css',
  'AGENTS.md'
];

for (const f of filesToMove) {
  const src = path.join(innerDir, f);
  const dst = path.join(rootDir, f);
  if (fs.existsSync(src)) {
    console.log(`Copying ${f} to root...`);
    fs.copyFileSync(src, dst);
  }
}

// 3. Update root package.json
const pkgPath = path.join(rootDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.main = 'server.js';
  pkg.scripts = {
    start: 'node server.js',
    dev: 'node server.js'
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log('✓ Updated root package.json to point to server.js');
}

// 4. Update root start.bat
const startBatPath = path.join(rootDir, 'start.bat');
const cleanStartBat = `@echo off
cd /d "%~dp0"

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
`;
fs.writeFileSync(startBatPath, cleanStartBat, 'utf8');
console.log('✓ Updated start.bat');

// 5. Update background-server.vbs
const vbsPath = path.join(rootDir, 'background-server.vbs');
const cleanVbs = `Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node server.js", 0, False
`;
fs.writeFileSync(vbsPath, cleanVbs, 'utf8');
console.log('✓ Updated background-server.vbs');

// 6. Safely remove inner NBLMimic folder
console.log('Removing inner NBLMimic folder...');
fs.rmSync(innerDir, { recursive: true, force: true });
console.log('✓ Removed duplicate inner NBLMimic folder!');

console.log('Consolidation complete!');
