const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function testVisibleAnimations() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9285',
    '--user-data-dir=' + require('os').tmpdir() + '/test-vis-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2200));

  http.get('http://127.0.0.1:9285/json', (res) => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', async () => {
      const tab = JSON.parse(data).find(t => t.url.includes('3000'));
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

        await new Promise(r => setTimeout(r, 3000));
        await send('Runtime.evaluate', {
          expression: `(function() {
            const startup = document.getElementById('startup-screen');
            if (startup) startup.style.display = 'none';
          })()`
        });

        // ════════════════════════════════════════════════════════════
        // TEST 1: Notes Card Closing Animation Visibility
        // ════════════════════════════════════════════════════════════
        console.log('\n--- 1. Testing Notes Card Closing Animation ---');

        // Open notes
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-notes-bubble').click()`
        });
        await new Promise(r => setTimeout(r, 500));

        // Start close
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-notes-close').click()`
        });

        // Wait 120ms (mid-animation)
        await new Promise(r => setTimeout(r, 120));

        const midNotesState = await send('Runtime.evaluate', {
          expression: `(function() {
            const card = document.querySelector('.notes-expandable-card');
            const overlay = document.querySelector('.notes-expandable-overlay');
            if (!card) return { status: 'unmounted_prematurely' };
            const cs = window.getComputedStyle(card);
            const ocs = overlay ? window.getComputedStyle(overlay) : null;
            return {
              status: 'animating',
              cardOpacity: cs.opacity,
              cardTransform: cs.transform,
              overlayOpacity: ocs ? ocs.opacity : null
            };
          })()`,
          returnByValue: true
        });
        console.log('Notes Mid-Close Frame (120ms):', midNotesState.result.value);

        const shotNotesClose = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/screenshot_notes_mid_close.png', Buffer.from(shotNotesClose.data, 'base64'));
        console.log('Saved scripts/screenshot_notes_mid_close.png');

        // Wait for close to complete
        await new Promise(r => setTimeout(r, 300));
        const notesFinalCheck = await send('Runtime.evaluate', {
          expression: `document.querySelectorAll('.notes-expandable-card').length === 0`,
          returnByValue: true
        });
        console.log('Notes completely settled & unmounted after full animation:', notesFinalCheck.result.value);

        // ════════════════════════════════════════════════════════════
        // TEST 2: Folder Card Closing Animation Visibility
        // ════════════════════════════════════════════════════════════
        console.log('\n--- 2. Testing Folder Card Closing Animation ---');

        // Open folder
        await send('Runtime.evaluate', {
          expression: `document.querySelector('.gf-root .gf-hit').click()`
        });
        await new Promise(r => setTimeout(r, 500));

        // Start close
        await send('Runtime.evaluate', {
          expression: `document.querySelector('.gf-expandable-close').click()`
        });

        // Wait 120ms (mid-animation)
        await new Promise(r => setTimeout(r, 120));

        const midFolderState = await send('Runtime.evaluate', {
          expression: `(function() {
            const modal = document.querySelector('.gf-expandable-modal');
            const overlay = document.querySelector('.gf-expandable-overlay');
            if (!modal) return { status: 'unmounted_prematurely' };
            const cs = window.getComputedStyle(modal);
            const ocs = overlay ? window.getComputedStyle(overlay) : null;
            return {
              status: 'animating',
              modalOpacity: cs.opacity,
              modalTransform: cs.transform,
              overlayOpacity: ocs ? ocs.opacity : null
            };
          })()`,
          returnByValue: true
        });
        console.log('Folder Mid-Close Frame (120ms):', midFolderState.result.value);

        const shotFolderClose = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/screenshot_folder_mid_close.png', Buffer.from(shotFolderClose.data, 'base64'));
        console.log('Saved scripts/screenshot_folder_mid_close.png');

        // Wait for close to complete
        await new Promise(r => setTimeout(r, 300));
        const folderFinalCheck = await send('Runtime.evaluate', {
          expression: `document.querySelectorAll('.gf-expandable-modal').length === 0`,
          returnByValue: true
        });
        console.log('Folder completely settled & unmounted after full animation:', folderFinalCheck.result.value);

        proc.kill();
        process.exit(0);
      });
    });
  });
}

testVisibleAnimations().catch(e => { console.error(e); process.exit(1); });
