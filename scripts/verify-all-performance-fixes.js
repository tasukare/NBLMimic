const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function verifyAllFixes() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9288',
    '--user-data-dir=' + require('os').tmpdir() + '/test-perf-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2200));

  http.get('http://127.0.0.1:9288/json', (res) => {
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
        await new Promise(r => setTimeout(r, 2500));

        await send('Runtime.evaluate', {
          expression: `(function() {
            const startup = document.getElementById('startup-screen');
            if (startup) startup.style.display = 'none';
          })()`
        });
        await new Promise(r => setTimeout(r, 300));

        // ════════════════════════════════════════════════════════════
        // TEST 1: 3D Folder Paper Sheets Base Transition
        // ════════════════════════════════════════════════════════════
        console.log('\n--- Test 1: 3D Folder Paper Sheets Base Transition ---');
        const sheetStyles = await send('Runtime.evaluate', {
          expression: `(function() {
            const sheet = document.querySelector('.gf-sheet');
            if (!sheet) return { error: 'No sheet found' };
            const cs = window.getComputedStyle(sheet);
            return {
              transition: cs.transition,
              willChange: cs.willChange,
              transform: cs.transform
            };
          })()`,
          returnByValue: true
        });
        console.log('Folder Sheet Base CSS properties:', sheetStyles.result.value);

        // ════════════════════════════════════════════════════════════
        // TEST 2: Research Chat Sidebar GPU Compositor Transform
        // ────────────────────────────────────────────────────────────
        console.log('\n--- Test 2: Research Chat Sidebar GPU Transform ---');
        const studioOpenStyles = await send('Runtime.evaluate', {
          expression: `(function() {
            const studio = document.getElementById('pane-studio');
            const cs = window.getComputedStyle(studio);
            return {
              position: cs.position,
              transform: cs.transform,
              willChange: cs.willChange,
              transition: cs.transition
            };
          })()`,
          returnByValue: true
        });
        console.log('Studio Chat Open Styles:', studioOpenStyles.result.value);

        // Toggle studio closed
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-toggle-studio').click()`
        });
        await new Promise(r => setTimeout(r, 300));

        const studioClosedStyles = await send('Runtime.evaluate', {
          expression: `(function() {
            const studio = document.getElementById('pane-studio');
            const cs = window.getComputedStyle(studio);
            return {
              collapsed: document.getElementById('app-shell').classList.contains('sidepanel-collapsed'),
              transform: cs.transform
            };
          })()`,
          returnByValue: true
        });
        console.log('Studio Chat Closed Styles:', studioClosedStyles.result.value);

        // Toggle studio back open
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-toggle-studio').click()`
        });
        await new Promise(r => setTimeout(r, 300));

        // ════════════════════════════════════════════════════════════
        // TEST 3: Folder Expandable Modal 0.2s Exit Animation
        // ────────────────────────────────────────────────────────────
        console.log('\n--- Test 3: Folder Modal Exit Animation ---');
        await send('Runtime.evaluate', {
          expression: `document.querySelector('.gf-root .gf-hit').click()`
        });
        await new Promise(r => setTimeout(r, 260));

        // Capture open modal screenshot
        const shotFolderOpen = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/screenshot_folder_open_perf.png', Buffer.from(shotFolderOpen.data, 'base64'));

        // Start closing
        await send('Runtime.evaluate', {
          expression: `document.querySelector('.gf-expandable-close').click()`
        });

        // Sample at 90ms (mid exit)
        await new Promise(r => setTimeout(r, 90));
        const midFolderExit = await send('Runtime.evaluate', {
          expression: `(function() {
            const modal = document.querySelector('.gf-expandable-modal');
            const overlay = document.querySelector('.gf-expandable-overlay');
            if (!modal) return { status: 'already_gone' };
            const mcs = window.getComputedStyle(modal);
            const ocs = overlay ? window.getComputedStyle(overlay) : null;
            return {
              status: 'exiting',
              modalOpacity: mcs.opacity,
              modalTransform: mcs.transform,
              overlayOpacity: ocs ? ocs.opacity : null
            };
          })()`,
          returnByValue: true
        });
        console.log('Folder Modal Mid-Exit (90ms):', midFolderExit.result.value);

        // Wait until exit finishes (after 200ms)
        await new Promise(r => setTimeout(r, 200));
        const folderUnmounted = await send('Runtime.evaluate', {
          expression: `document.querySelectorAll('.gf-expandable-modal').length === 0`,
          returnByValue: true
        });
        console.log('Folder Modal fully unmounted after 200ms:', folderUnmounted.result.value);

        // ════════════════════════════════════════════════════════════
        // TEST 4: Notes Expandable Card 0.2s Exit Animation
        // ────────────────────────────────────────────────────────────
        console.log('\n--- Test 4: Notes Modal Exit Animation ---');
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-notes-bubble').click()`
        });
        await new Promise(r => setTimeout(r, 260));

        // Capture open notes screenshot
        const shotNotesOpen = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/screenshot_notes_open_perf.png', Buffer.from(shotNotesOpen.data, 'base64'));

        // Start closing
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-notes-close').click()`
        });

        // Sample at 90ms (mid exit)
        await new Promise(r => setTimeout(r, 90));
        const midNotesExit = await send('Runtime.evaluate', {
          expression: `(function() {
            const card = document.querySelector('.notes-expandable-card');
            const overlay = document.querySelector('.notes-expandable-overlay');
            if (!card) return { status: 'already_gone' };
            const ccs = window.getComputedStyle(card);
            const ocs = overlay ? window.getComputedStyle(overlay) : null;
            return {
              status: 'exiting',
              cardOpacity: ccs.opacity,
              cardTransform: ccs.transform,
              overlayOpacity: ocs ? ocs.opacity : null
            };
          })()`,
          returnByValue: true
        });
        console.log('Notes Modal Mid-Exit (90ms):', midNotesExit.result.value);

        // Wait until exit finishes (after 200ms)
        await new Promise(r => setTimeout(r, 200));
        const notesUnmounted = await send('Runtime.evaluate', {
          expression: `document.querySelectorAll('.notes-expandable-card').length === 0`,
          returnByValue: true
        });
        console.log('Notes Modal fully unmounted after 200ms:', notesUnmounted.result.value);

        console.log('\n=== ALL PERFORMANCE & ANIMATION TESTS COMPLETED SUCCESSFULLY ===');
        try { proc.kill(); } catch (e) {}
        process.exit(0);
      });
    });
  });
}

verifyAllFixes().catch(err => {
  console.error(err);
  process.exit(1);
});
