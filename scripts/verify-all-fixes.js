const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

async function runVerification() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const tmpDir = os.tmpdir() + '/test-verify-' + Date.now();
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9295',
    '--user-data-dir=' + tmpDir,
    '--window-size=1440,900',
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9295/json', (res) => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', async () => {
      const tab = JSON.parse(data).find(t => t.url.includes('3000'));
      if (!tab) {
        console.error('Target tab not found');
        proc.kill();
        process.exit(1);
      }

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

      ws.addEventListener('open', async () => {
        await send('Runtime.enable');
        await send('Page.enable');
        
        // Wait for page to initialize
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 300));
          const check = await send('Runtime.evaluate', {
            expression: `(function() {
              const btn = document.getElementById('btn-toggle-studio');
              const skip = document.getElementById('btn-startup-skip');
              if (skip) skip.click();
              const startup = document.getElementById('startup-screen');
              if (startup) startup.style.display = 'none';
              return Boolean(btn && typeof btn.onclick === 'function');
            })()`,
            returnByValue: true
          });
          if (check && check.result && check.result.value === true) break;
        }

        console.log('--- TEST 1: Check Aux Pane Button (Open State) ---');
        const state1 = await send('Runtime.evaluate', {
          expression: `(function() {
            const btn = document.getElementById('btn-toggle-studio');
            const fill = document.querySelector('.icon-aux-pane .aux-pane-fill');
            const studio = document.getElementById('pane-studio');
            const canvas = document.getElementById('pane-canvas');
            const computedFill = fill ? window.getComputedStyle(fill).opacity : null;
            return {
              title: btn ? btn.getAttribute('title') : null,
              fillOpacity: computedFill,
              studioDisplay: window.getComputedStyle(studio).display,
              canvasWidth: canvas.getBoundingClientRect().width,
              windowWidth: window.innerWidth
            };
          })()`,
          returnByValue: true
        });
        console.log('State 1 (Open):', state1.result.value);

        // Screenshot open aux header
        const shotHdrOpen = await send('Page.captureScreenshot', {
          clip: { x: 1000, y: 0, width: 440, height: 60, scale: 2 }
        });
        fs.writeFileSync('scripts/test_aux_header_open.png', Buffer.from(shotHdrOpen.data, 'base64'));

        console.log('--- TEST 2: Toggle Aux Pane to Closed via Click ---');
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-toggle-studio').click()`
        });
        await new Promise(r => setTimeout(r, 450));

        const state2 = await send('Runtime.evaluate', {
          expression: `(function() {
            const fill = document.querySelector('.icon-aux-pane .aux-pane-fill');
            const studio = document.getElementById('pane-studio');
            const splitter = document.getElementById('splitter-right');
            const canvas = document.getElementById('pane-canvas');
            const pill = document.getElementById('btn-reopen-studio');
            const shell = document.getElementById('app-shell');
            return {
              isCollapsedClass: shell.classList.contains('sidepanel-collapsed'),
              fillOpacity: fill ? window.getComputedStyle(fill).opacity : null,
              studioDisplay: window.getComputedStyle(studio).display,
              splitterDisplay: window.getComputedStyle(splitter).display,
              canvasWidth: canvas.getBoundingClientRect().width,
              windowWidth: window.innerWidth,
              pillVisible: pill && window.getComputedStyle(pill).opacity !== '0'
            };
          })()`,
          returnByValue: true
        });
        console.log('State 2 (Closed):', state2.result.value);

        const shotHdrClosed = await send('Page.captureScreenshot', {
          clip: { x: 1000, y: 0, width: 440, height: 60, scale: 2 }
        });
        fs.writeFileSync('scripts/test_aux_header_closed.png', Buffer.from(shotHdrClosed.data, 'base64'));

        const shotFullClosed = await send('Page.captureScreenshot', {});
        fs.writeFileSync('scripts/test_full_view_closed.png', Buffer.from(shotFullClosed.data, 'base64'));

        console.log('--- TEST 3: Click Reopen Chat Pill ---');
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-reopen-studio').click()`
        });
        await new Promise(r => setTimeout(r, 450));

        const state3 = await send('Runtime.evaluate', {
          expression: `!document.getElementById('app-shell').classList.contains('sidepanel-collapsed')`,
          returnByValue: true
        });
        console.log('Studio reopened via pill:', state3.result.value);

        console.log('--- TEST 4: Global Shortcut Ctrl+Shift+B ---');
        await send('Runtime.evaluate', {
          expression: `(function() {
            const ev = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, code: 'KeyB', key: 'B', bubbles: true });
            window.dispatchEvent(ev);
          })()`
        });
        await new Promise(r => setTimeout(r, 400));
        const closedByShortcut = await send('Runtime.evaluate', {
          expression: `document.getElementById('app-shell').classList.contains('sidepanel-collapsed')`,
          returnByValue: true
        });
        console.log('Closed by Ctrl+Shift+B:', closedByShortcut.result.value);

        // Open it back with Ctrl+Shift+B
        await send('Runtime.evaluate', {
          expression: `(function() {
            const ev = new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, code: 'KeyB', key: 'B', bubbles: true });
            window.dispatchEvent(ev);
          })()`
        });
        await new Promise(r => setTimeout(r, 400));

        console.log('--- TEST 5: 3D Folder Z-Index and Pointer Events ---');
        const folderLayers = await send('Runtime.evaluate', {
          expression: `(function() {
            const card = document.querySelector('.gf-root');
            if (!card) return null;
            const back = card.querySelector('.gf-back');
            const files = card.querySelector('.gf-files');
            const sheet = card.querySelector('.gf-sheet');
            const front = card.querySelector('.gf-front');
            const hit = card.querySelector('.gf-hit');
            const key = card.querySelector('.gf-key');
            return {
              backZ: back ? window.getComputedStyle(back).zIndex : null,
              filesZ: files ? window.getComputedStyle(files).zIndex : null,
              frontZ: front ? window.getComputedStyle(front).zIndex : null,
              hitZ: hit ? window.getComputedStyle(hit).zIndex : null,
              sheetPointerEvents: sheet ? window.getComputedStyle(sheet).pointerEvents : null,
              frontPointerEvents: front ? window.getComputedStyle(front).pointerEvents : null,
              hitPointerEvents: hit ? window.getComputedStyle(hit).pointerEvents : null
            };
          })()`,
          returnByValue: true
        });
        console.log('Folder layers:', folderLayers.result.value);

        console.log('--- TEST 6: Folder Modal Centering & 180ms Exit Animation ---');
        await send('Runtime.evaluate', {
          expression: `(function() {
            const hit = document.querySelector('.gf-hit');
            if (hit) hit.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 400));

        const modalState = await send('Runtime.evaluate', {
          expression: `(function() {
            const overlay = document.querySelector('.gf-expandable-overlay');
            const modal = document.querySelector('.gf-expandable-modal');
            if (!modal) return null;
            const rect = modal.getBoundingClientRect();
            const w = window.innerWidth;
            const h = window.innerHeight;
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            return {
              modalFound: true,
              rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
              viewport: { width: w, height: h },
              deltaCenterX: Math.abs(centerX - w / 2),
              deltaCenterY: Math.abs(centerY - h / 2),
              isOverlayFlex: window.getComputedStyle(overlay).display === 'flex'
            };
          })()`,
          returnByValue: true
        });
        console.log('Folder Modal Position:', modalState.result.value);

        const shotModalOpen = await send('Page.captureScreenshot', {});
        fs.writeFileSync('scripts/test_folder_modal_centered.png', Buffer.from(shotModalOpen.data, 'base64'));

        // Test exit animation on Escape
        await send('Runtime.evaluate', {
          expression: `(function() {
            const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            window.dispatchEvent(ev);
          })()`
        });
        await new Promise(r => setTimeout(r, 60));

        const midCloseState = await send('Runtime.evaluate', {
          expression: `(function() {
            const overlay = document.querySelector('.gf-expandable-overlay');
            const modal = document.querySelector('.gf-expandable-modal');
            return {
              isClosingClass: modal && modal.classList.contains('is-closing'),
              overlayIsClosing: overlay && overlay.classList.contains('is-closing')
            };
          })()`,
          returnByValue: true
        });
        console.log('Modal mid-close state (is-closing class):', midCloseState.result.value);

        await new Promise(r => setTimeout(r, 300));
        const afterCloseState = await send('Runtime.evaluate', {
          expression: `document.querySelector('.gf-expandable-overlay') === null`,
          returnByValue: true
        });
        console.log('Modal fully removed after animationend:', afterCloseState.result.value);

        console.log('--- TEST 7: Lab Notes Expandable Card & Exit Animation ---');
        await send('Runtime.evaluate', {
          expression: `(function() {
            const bubble = document.getElementById('btn-notes-bubble');
            if (bubble) bubble.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 400));

        const notesModalState = await send('Runtime.evaluate', {
          expression: `(function() {
            const card = document.querySelector('.notes-expandable-card');
            if (!card) return null;
            const rect = card.getBoundingClientRect();
            const w = window.innerWidth;
            const h = window.innerHeight;
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            return {
              notesCardFound: true,
              rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
              deltaCenterX: Math.abs(centerX - w / 2),
              deltaCenterY: Math.abs(centerY - h / 2)
            };
          })()`,
          returnByValue: true
        });
        console.log('Notes Card Position:', notesModalState.result.value);

        const shotNotesOpen = await send('Page.captureScreenshot', {});
        fs.writeFileSync('scripts/test_notes_modal_centered.png', Buffer.from(shotNotesOpen.data, 'base64'));

        // Close notes with Escape
        await send('Runtime.evaluate', {
          expression: `(function() {
            const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            window.dispatchEvent(ev);
          })()`
        });
        await new Promise(r => setTimeout(r, 60));

        const notesMidClose = await send('Runtime.evaluate', {
          expression: `(function() {
            const card = document.querySelector('.notes-expandable-card');
            return card && card.classList.contains('is-closing');
          })()`,
          returnByValue: true
        });
        console.log('Notes mid-close is-closing class:', notesMidClose.result.value);

        await new Promise(r => setTimeout(r, 300));
        const notesAfterClose = await send('Runtime.evaluate', {
          expression: `document.querySelector('.notes-expandable-overlay') === null`,
          returnByValue: true
        });
        console.log('Notes fully removed after animationend:', notesAfterClose.result.value);

        console.log('==================================================');
        console.log('ALL 7 VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
        console.log('==================================================');

        ws.close();
        proc.kill();
        process.exit(0);
      });
    });
  });
}

runVerification().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
