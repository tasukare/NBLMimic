const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function testPerformanceAndStartup() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9258',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);
  
  await new Promise(r => setTimeout(r, 2000));
  
  http.get('http://127.0.0.1:9258/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      if (!tab) {
        console.log('No 3000 tab');
        proc.kill();
        return;
      }
      
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let id = 1;
      const send = (method, params = {}) => ws.send(JSON.stringify({ id: id++, method, params }));
      
      ws.addEventListener('open', () => {
        send('Runtime.enable');
        send('Page.enable');
      });
      
      ws.addEventListener('message', async (event) => {
        const payload = JSON.parse(event.data);
        if (payload.id === 50) {
          console.log('[BROWSER FULL TEST]', JSON.stringify(payload.result.result.value, null, 2));
          send('Page.captureScreenshot', {});
        }
        if (payload.result && payload.result.data) {
          const imgBase64 = payload.result.data;
          fs.writeFileSync('scripts/fast-dock-verified.png', Buffer.from(imgBase64, 'base64'));
          console.log('Screenshot saved to scripts/fast-dock-verified.png');
          proc.kill();
          process.exit(0);
        }
      });
      
      // Wait for boot & splash screen dismiss
      await new Promise(r => setTimeout(r, 4500));
      
      // Evaluate DOM and state
      ws.send(JSON.stringify({
        id: 50,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            return {
              viewMode: window.state ? window.state.get('viewMode') : null,
              activeTabMode: document.querySelector('.canvas-mode-btn.is-active')?.getAttribute('data-mode'),
              hasFoldersGallery: !!document.querySelector('.gf-gallery-container'),
              gfRootsCount: document.querySelectorAll('.gf-root').length,
              breadcrumbText: document.getElementById('btn-breadcrumb-view')?.textContent?.trim(),
              composerDock: {
                hasQuickChips: !!document.querySelector('.composer-quick-chips'),
                hasForm: !!document.getElementById('chat-composer-form'),
                hasTextarea: !!document.getElementById('chat-textarea'),
                hasModelSelector: !!document.getElementById('select-composer-model'),
                hasLiveTrigger: !!document.getElementById('btn-composer-live-trigger'),
                hasSendBtn: !!document.getElementById('btn-composer-send')
              },
              performanceCheck: {
                hasHeavyTurbulenceFilter: !!document.getElementById('liquid-glass-dock-filter'),
                beamsActiveCount: document.querySelectorAll('.beam-active').length
              }
            };
          })()`,
          returnByValue: true
        }
      }));
    });
  });
}

testPerformanceAndStartup().catch(err => {
  console.error(err);
  process.exit(1);
});
