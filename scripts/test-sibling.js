const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function testSiblingClosing() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9280',
    '--user-data-dir=' + require('os').tmpdir() + '/test-sib-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2200));

  http.get('http://127.0.0.1:9280/json', (res) => {
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

        // Create sibling test elements in the page
        const testRes = await send('Runtime.evaluate', {
          expression: `(function() {
            const startup = document.getElementById('startup-screen');
            if (startup) startup.style.display = 'none';

            // Create backdrop
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.background = 'rgba(0,0,0,0.6)';
            overlay.style.zIndex = '900';
            document.body.appendChild(overlay);

            // Create card as sibling
            const card = document.createElement('div');
            card.style.position = 'fixed';
            card.style.inset = '0';
            card.style.margin = 'auto';
            card.style.width = '700px';
            card.style.height = '600px';
            card.style.background = '#1e1e24';
            card.style.borderRadius = '20px';
            card.style.zIndex = '910';
            card.style.transformOrigin = 'center center';
            document.body.appendChild(card);

            // Bubble at 1300, 720
            const bRect = { left: 1300, top: 720, width: 52, height: 52 };
            const cRect = card.getBoundingClientRect();

            const closeDeltaX = (bRect.left + 26) - (cRect.left + cRect.width / 2);
            const closeDeltaY = (bRect.top + 26) - (cRect.top + cRect.height / 2);
            const closeScaleX = 52 / cRect.width;
            const closeScaleY = 52 / cRect.height;

            const closeAnim = card.animate([
              { transform: 'translate3d(0, 0, 0) scale(1)', borderRadius: '20px', opacity: 1 },
              { transform: \`translate3d(\${closeDeltaX}px, \${closeDeltaY}px, 0) scale(\${closeScaleX}, \${closeScaleY})\`, borderRadius: '9999px', opacity: 0.9 }
            ], { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });

            overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'forwards' });

            return {
              closeDeltaX, closeDeltaY, closeScaleX, closeScaleY
            };
          })()`,
          returnByValue: true
        });
        console.log('Animation initiated:', testRes.result.value);

        // Take snapshot mid-animation at 180ms
        await new Promise(r => setTimeout(r, 180));
        const midSnap = await send('Runtime.evaluate', {
          expression: `(function() {
            const card = document.querySelectorAll('div')[document.querySelectorAll('div').length - 1];
            return {
              computedTransform: window.getComputedStyle(card).transform,
              computedOpacity: window.getComputedStyle(card).opacity
            };
          })()`,
          returnByValue: true
        });
        console.log('Mid-animation at 180ms:', midSnap.result.value);

        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/mid_close_sibling_test.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scripts/mid_close_sibling_test.png');

        proc.kill();
        process.exit(0);
      });
    });
  });
}
testSiblingClosing();
