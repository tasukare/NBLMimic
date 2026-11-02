const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function test() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-dark-' + Date.now(),
    '--window-size=1280,900',
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9229/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      if (!tab) {
        proc.kill();
        process.exit(1);
      }

      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let id = 1;
      const send = (method, params = {}) => new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const payload = JSON.parse(event.data);
          if (payload.id === msgId) {
            ws.removeEventListener('message', handler);
            resolve(payload.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });

      ws.addEventListener('open', async () => {
        await send('Runtime.enable');
        await send('Page.enable');

        await new Promise(r => setTimeout(r, 3500));

        // Switch to Dark Theme
        await send('Runtime.evaluate', {
          expression: `(function() {
            document.documentElement.setAttribute('data-theme', 'dark');
            const startup = document.getElementById('startup-screen');
            if (startup) startup.style.display = 'none';
          })()`
        });

        await new Promise(r => setTimeout(r, 400));

        // Click the first folder card
        await send('Runtime.evaluate', {
          expression: `(function() {
            const hit = document.querySelector('.gf-root .gf-hit');
            if (hit) hit.click();
          })()`
        });

        await new Promise(r => setTimeout(r, 500));

        // Capture screenshot of Dark Theme Expandable Card
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        if (screenshot && screenshot.data) {
          const outPath = path.join(__dirname, 'expandable-card-popup-dark-verified.png');
          fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
          console.log(`Saved dark screenshot to ${outPath}`);
        }

        // Test clicking an item to trigger Reader View
        console.log('Testing clicking first document in expandable card...');
        const clickDocResult = await send('Runtime.evaluate', {
          expression: `(function() {
            const firstItem = document.querySelector('.gf-expandable-item');
            if (firstItem) {
              const title = firstItem.querySelector('.gf-expandable-item-title')?.textContent;
              firstItem.click();
              return { clicked: true, title };
            }
            return { clicked: false };
          })()`,
          returnByValue: true
        });
        console.log('Click item result:', clickDocResult.result.value);

        // Wait for reader view transition
        await new Promise(r => setTimeout(r, 800));

        const readerState = await send('Runtime.evaluate', {
          expression: `(function() {
            const overlay = document.querySelector('.gf-expandable-overlay');
            const breadcrumb = document.getElementById('btn-breadcrumb-view')?.textContent;
            const docSelected = window.state ? window.state.get('selectedDocId') : null;
            return {
              overlayDismissed: !overlay,
              breadcrumb,
              docSelected
            };
          })()`,
          returnByValue: true
        });
        console.log('Reader state after selection:', readerState.result.value);

        proc.kill();
        process.exit(0);
      });
    });
  });
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
