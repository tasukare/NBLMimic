const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function checkCurrentState() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9283',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);
  
  await new Promise(r => setTimeout(r, 2000));
  
  http.get('http://127.0.0.1:9283/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      
      const consoleLogs = [];
      
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
      });
      
      ws.addEventListener('message', async (e) => {
        const p = JSON.parse(e.data);
        if (p.method === 'Runtime.consoleAPICalled') {
          consoleLogs.push({ type: p.params.type, text: p.params.args.map(a => a.value || a.description).join(' ') });
        }
        if (p.id === 50) {
          console.log('[CURRENT PAGE STATE]:', JSON.stringify(p.result.result.value, null, 2));
          ws.send(JSON.stringify({ id: 51, method: 'Page.captureScreenshot', params: {} }));
        }
        if (p.id === 51 && p.result && p.result.data) {
          fs.writeFileSync('scripts/current-inspect.png', Buffer.from(p.result.data, 'base64'));
          console.log('Saved scripts/current-inspect.png');
          console.log('Console logs:', consoleLogs);
          proc.kill();
          process.exit(0);
        }
      });
      
      await new Promise(r => setTimeout(r, 4500));
      
      ws.send(JSON.stringify({
        id: 50,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const mount = document.getElementById('canvas-content-mount');
            const gallery = document.querySelector('.gf-gallery-container');
            const roots = document.querySelectorAll('.gf-root');
            const viewMode = window.state ? window.state.get('viewMode') : null;
            return {
              viewMode,
              mountExists: !!mount,
              mountOpacity: mount ? mount.style.opacity : null,
              mountTransform: mount ? mount.style.transform : null,
              galleryExists: !!gallery,
              galleryOpacity: gallery ? getComputedStyle(gallery).opacity : null,
              foldersCount: roots.length
            };
          })()`,
          returnByValue: true
        }
      }));
    });
  });
}

checkCurrentState();
