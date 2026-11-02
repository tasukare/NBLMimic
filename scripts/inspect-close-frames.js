const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function inspectCloseFrames() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9270',
    '--user-data-dir=' + require('os').tmpdir() + '/test-frames-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2200));

  http.get('http://127.0.0.1:9270/json', (res) => {
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

        // Click bubble to open
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-notes-bubble').click()`
        });

        // Wait 500ms for open to complete
        await new Promise(r => setTimeout(r, 500));

        console.log('Opened. Now triggering close...');

        // Start close
        await send('Runtime.evaluate', {
          expression: `(function() {
            window._closeStartTime = performance.now();
            document.getElementById('btn-notes-close').click();
          })()`
        });

        // Capture frames at 50ms, 100ms, 180ms, 260ms
        for (const delay of [50, 100, 180, 260]) {
          await new Promise(r => setTimeout(r, 60));
          const state = await send('Runtime.evaluate', {
            expression: `(function() {
              const card = document.querySelector('.notes-expandable-card');
              const overlay = document.querySelector('.notes-expandable-overlay');
              if (!card) return { status: 'unmounted' };
              const cs = window.getComputedStyle(card);
              const ocs = window.getComputedStyle(overlay);
              return {
                transform: cs.transform,
                opacity: cs.opacity,
                overlayOpacity: ocs.opacity,
                cardRect: card.getBoundingClientRect()
              };
            })()`,
            returnByValue: true
          });
          console.log('Frame at ~+' + delay + 'ms:', state.result.value);

          const shot = await send('Page.captureScreenshot', { format: 'png' });
          fs.writeFileSync('scripts/close_frame_' + delay + 'ms.png', Buffer.from(shot.data, 'base64'));
        }

        proc.kill();
        process.exit(0);
      });
    });
  });
}

inspectCloseFrames().catch(e => { console.error(e); process.exit(1); });
