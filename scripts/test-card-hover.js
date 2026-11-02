const http = require('http');
const { spawn } = require('child_process');
const os = require('os');
const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tmpDir = os.tmpdir() + '/test-hover-' + Date.now();
const proc = spawn(browserPath, [
  '--headless=new',
  '--remote-debugging-port=9291',
  '--user-data-dir=' + tmpDir,
  '--window-size=1920,1080',
  'http://127.0.0.1:3000'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9291/json', res => {
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
        await send('Runtime.evaluate', {
          expression: `(() => {
            const skip = document.getElementById('btn-startup-skip');
            if (skip) skip.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 500));
        
        // Inspect second card ('Docs & Manuscripts')
        const evalRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll('.gf-root'));
            const docCard = cards[1];
            const key = docCard.querySelector('.gf-key');
            const front = docCard.querySelector('.gf-front');
            const files = docCard.querySelector('.gf-files');
            const sheets = Array.from(docCard.querySelectorAll('.gf-sheet'));
            
            // Set open to trigger the same state as user screenshot
            docCard.setAttribute('data-open', 'true');

            return JSON.stringify({
              keyDisplay: getComputedStyle(key).display,
              keyVisibility: getComputedStyle(key).visibility,
              keyOpacity: getComputedStyle(key).opacity,
              keyZIndex: getComputedStyle(key).zIndex,
              keyTransform: getComputedStyle(key).transform,
              keyRect: key?.getBoundingClientRect(),
              frontZIndex: getComputedStyle(front).zIndex,
              frontRect: front?.getBoundingClientRect(),
              filesZIndex: getComputedStyle(files).zIndex,
              filesRect: files?.getBoundingClientRect(),
              sheetsRects: sheets.map(s => s.getBoundingClientRect())
            });
          })()`,
          returnByValue: true
        });
        console.log(JSON.stringify(JSON.parse(evalRes.result.value), null, 2));
        proc.kill();
        process.exit(0);
      };
    });
  });
}, 2000);
