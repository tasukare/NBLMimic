const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');

async function main() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const tmpDir = os.tmpdir() + '/test-final-verify-' + Date.now();
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9292',
    '--user-data-dir=' + tmpDir,
    '--window-size=1920,1080',
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9292/json', (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', async () => {
      const tab = JSON.parse(d).find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);

      const send = (method, params = {}) => new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const h = (ev) => {
          const m = JSON.parse(ev.data);
          if (m.id === id) { ws.removeEventListener('message', h); resolve(m.result); }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id, method, params }));
      });

      ws.onopen = async () => {
        await send('Runtime.enable');
        await send('Page.enable');
        await new Promise(r => setTimeout(r, 2000));

        // Dismiss startup
        await send('Runtime.evaluate', {
          expression: `(() => {
            const skip = document.getElementById('btn-startup-skip');
            if (skip) skip.click();
            const overlay = document.getElementById('startup-screen-overlay');
            if (overlay) overlay.style.display = 'none';
          })()`
        });
        await new Promise(r => setTimeout(r, 500));

        console.log('--- TEST 1: Layout & Canvas Width (No 380px Void) ---');
        const layoutRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const canvas = document.getElementById('pane-canvas')?.getBoundingClientRect();
            const studio = document.getElementById('pane-studio')?.getBoundingClientRect();
            const grid = document.querySelector('.gf-gallery-grid')?.getBoundingClientRect();
            return JSON.stringify({
              canvasWidth: canvas?.width,
              canvasRight: canvas?.right,
              studioLeft: studio?.left,
              studioWidth: studio?.width,
              gap: (studio?.left || 0) - (canvas?.right || 0),
              gridWidth: grid?.width
            });
          })()`,
          returnByValue: true
        });
        console.log('Layout:', JSON.parse(layoutRes.result.value));

        console.log('--- TEST 2: Note Bubble Aceternity Expandable Card Morph ---');
        // Open Note
        await send('Runtime.evaluate', {
          expression: `(() => {
            const noteBubble = document.getElementById('btn-notes-bubble');
            if (noteBubble) noteBubble.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 400));
        const noteOpenRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const modal = document.querySelector('.notes-expandable-card');
            const overlay = document.querySelector('.notes-expandable-overlay');
            return JSON.stringify({
              isOpen: Boolean(modal),
              rect: modal?.getBoundingClientRect(),
              overlayDisplay: overlay ? getComputedStyle(overlay).display : null
            });
          })()`,
          returnByValue: true
        });
        console.log('Note Open:', JSON.parse(noteOpenRes.result.value));

        // Close Note via #btn-notes-close
        await send('Runtime.evaluate', {
          expression: `(() => {
            const closeBtn = document.getElementById('btn-notes-close');
            if (closeBtn) closeBtn.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 500));
        const noteCloseRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const modal = document.querySelector('.notes-expandable-card');
            return JSON.stringify({ isUnmounted: !modal });
          })()`,
          returnByValue: true
        });
        console.log('Note Close Clean:', JSON.parse(noteCloseRes.result.value));

        console.log('--- TEST 3: Folder Aceternity Expandable Card Morph ---');
        // Click first folder
        await send('Runtime.evaluate', {
          expression: `(() => {
            const folder = document.querySelector('.gf-root');
            if (folder) folder.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 450));
        const folderOpenRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const modal = document.querySelector('.gf-expandable-modal');
            return JSON.stringify({
              isOpen: Boolean(modal),
              title: modal?.querySelector('.gf-expandable-title')?.textContent,
              rect: modal?.getBoundingClientRect()
            });
          })()`,
          returnByValue: true
        });
        console.log('Folder Open:', JSON.parse(folderOpenRes.result.value));

        // Close folder via .gf-expandable-close
        await send('Runtime.evaluate', {
          expression: `(() => {
            const closeBtn = document.querySelector('.gf-expandable-close');
            if (closeBtn) closeBtn.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 500));
        const folderCloseRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const modal = document.querySelector('.gf-expandable-modal');
            return JSON.stringify({ isUnmounted: !modal });
          })()`,
          returnByValue: true
        });
        console.log('Folder Close Clean:', JSON.parse(folderCloseRes.result.value));

        console.log('--- TEST 4: Auxiliary Pane Toggle & Widescreen Scaling ---');
        await send('Runtime.evaluate', {
          expression: `(() => {
            const toggle = document.getElementById('btn-toggle-studio');
            if (toggle) toggle.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 350));
        const collapsedRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const shell = document.getElementById('app-shell');
            const canvas = document.getElementById('pane-canvas')?.getBoundingClientRect();
            const studio = document.getElementById('pane-studio');
            const reopenBtn = document.getElementById('btn-reopen-studio');
            return JSON.stringify({
              isCollapsed: shell.classList.contains('sidepanel-collapsed'),
              canvasWidth: canvas?.width,
              studioDisplay: getComputedStyle(studio).display,
              reopenVisible: reopenBtn ? getComputedStyle(reopenBtn).display : null
            });
          })()`,
          returnByValue: true
        });
        console.log('Auxiliary Pane Collapsed:', JSON.parse(collapsedRes.result.value));

        // Reopen Auxiliary Pane
        await send('Runtime.evaluate', {
          expression: `(() => {
            const toggle = document.getElementById('btn-toggle-studio');
            if (toggle) toggle.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 350));

        console.log('--- TEST 5: XLSX Safe Stream URL (No Raw PK Zip Dump) ---');
        const xlsxTestRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const sampleDoc = {
              id: 'test-xlsx',
              title: 'សម្រាប់ ធ្វើឲ្យសិស្ស.xlsx',
              category: 'sheets',
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              driveFileId: '1ABcDefGhIjKlMnOpQrStUv'
            };
            const safeUrl = window.getSafeDocumentStreamUrl(sampleDoc);
            return JSON.stringify({
              safeUrl: safeUrl,
              isDrivePreview: safeUrl.includes('drive.google.com/file/d/1ABcDefGhIjKlMnOpQrStUv/preview'),
              isNotRawStream: !safeUrl.includes('/api/drive/file')
            });
          })()`,
          returnByValue: true
        });
        console.log('XLSX Stream URL Check:', JSON.parse(xlsxTestRes.result.value));

        // Take a screenshot of the fixed layout
        const snap = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\dsoph\\.gemini\\antigravity\\brain\\a86339e8-0c17-437b-a6d3-d4692eef879a\\verified_perfect_layout.png', Buffer.from(snap.data, 'base64'));
        console.log('Screenshot saved to verified_perfect_layout.png');

        proc.kill();
        process.exit(0);
      };
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
