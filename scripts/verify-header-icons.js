const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function testHeaderIcons() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9286',
    '--user-data-dir=' + require('os').tmpdir() + '/test-hdr-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2200));

  http.get('http://127.0.0.1:9286/json', (res) => {
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
        await new Promise(r => setTimeout(r, 500));

        // State 1: Open chat (aux-pane fill should be opacity 1)
        const shotOpen = await send('Page.captureScreenshot', {
          clip: { x: 1000, y: 0, width: 400, height: 70, scale: 2 }
        });
        fs.writeFileSync('scripts/screenshot_aux_open.png', Buffer.from(shotOpen.data, 'base64'));

        // Toggle to closed
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-toggle-studio').click()`
        });
        await new Promise(r => setTimeout(r, 400));

        // State 2: Closed chat (aux-pane fill should be opacity 0)
        const shotClosed = await send('Page.captureScreenshot', {
          clip: { x: 1000, y: 0, width: 400, height: 70, scale: 2 }
        });
        fs.writeFileSync('scripts/screenshot_aux_closed.png', Buffer.from(shotClosed.data, 'base64'));

        console.log('Saved screenshot_aux_open.png and screenshot_aux_closed.png');
        try { proc.kill(); } catch(e) {}
        process.exit(0);
      });
    });
  });
}

testHeaderIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
