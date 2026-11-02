const http = require('http');
const { spawn } = require('child_process');

async function measure() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9232',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);
  
  await new Promise(r => setTimeout(r, 2500));
  
  http.get('http://127.0.0.1:9232/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      });
      
      await new Promise(r => setTimeout(r, 3500));
      
      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          expression: "JSON.stringify({ containerWidth: document.getElementById('canvas-content-mount').clientWidth, gridWidth: document.querySelector('.gf-gallery-grid') ? document.querySelector('.gf-gallery-grid').clientWidth : 0, cardWidths: Array.from(document.querySelectorAll('.gf-root')).map(el => el.getBoundingClientRect().width), cardTops: Array.from(document.querySelectorAll('.gf-root')).map(el => el.getBoundingClientRect().top) })",
          returnByValue: true
        }
      }));
      
      ws.addEventListener('message', (e) => {
        const payload = JSON.parse(e.data);
        if (payload.id === 2) {
          console.log('MEASUREMENT:', payload.result.result.value);
          proc.kill();
          process.exit(0);
        }
      });
    });
  });
}
measure();
