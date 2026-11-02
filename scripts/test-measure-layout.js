const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tmpDir = os.tmpdir() + '/test-measure-' + Date.now();
const proc = spawn(browserPath, [
  '--headless=new',
  '--remote-debugging-port=9298',
  '--user-data-dir=' + tmpDir,
  '--window-size=1920,1080',
  'http://127.0.0.1:3000'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9298/json', res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => {
      const tab = JSON.parse(d).find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      ws.onopen = async () => {
        const send = (m, p={}) => new Promise(r => {
          const id = Math.floor(Math.random()*10000);
          const h = (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id === id) { ws.removeEventListener('message', h); r(msg.result); }
          };
          ws.addEventListener('message', h);
          ws.send(JSON.stringify({id, method: m, params: p}));
        });
        await send('Runtime.enable');
        await new Promise(r => setTimeout(r, 2000));
        
        // Dismiss startup overlay if present
        await send('Runtime.evaluate', {
          expression: `(() => {
            const skipBtn = document.getElementById('btn-startup-skip');
            if (skipBtn) skipBtn.click();
            const overlay = document.getElementById('startup-screen-overlay');
            if (overlay) overlay.style.display = 'none';
          })()`
        });
        await new Promise(r => setTimeout(r, 500));

        const res = await send('Runtime.evaluate', {
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll('.gf-root')).slice(0, 3);
            return JSON.stringify({
              cards: cards.map(c => ({
                title: c.querySelector('.gf-front-title')?.textContent,
                rect: c.getBoundingClientRect()
              }))
            });
          })()`,
          returnByValue: true
        });
        console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
        proc.kill();
        process.exit(0);
      };
    });
  });
}, 2000);
