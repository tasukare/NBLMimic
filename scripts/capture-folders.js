const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function captureFolders() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);
  
  await new Promise(r => setTimeout(r, 2500));
  
  http.get('http://127.0.0.1:9230/json', (res) => {
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
        if (payload.id === 999) {
          const imgBase64 = payload.result.data;
          fs.writeFileSync('scripts/folders-view.png', Buffer.from(imgBase64, 'base64'));
          console.log('Folders screenshot saved to scripts/folders-view.png');
          proc.kill();
          process.exit(0);
        }
      });
      
      // Wait for boot
      await new Promise(r => setTimeout(r, 4500));
      
      // Click the first folder card
      send('Runtime.evaluate', {
        expression: "document.querySelector('.gf-root') ? document.querySelector('.gf-root').click() : 'no root'"
      });

      await new Promise(r => setTimeout(r, 800));
      
      ws.send(JSON.stringify({
        id: 999,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    });
  });
}
captureFolders();
