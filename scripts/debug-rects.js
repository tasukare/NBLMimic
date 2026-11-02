const http = require('http');
const { spawn } = require('child_process');

async function debugRects() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9236',
    '--user-data-dir=' + require('os').tmpdir() + '/test-rects-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  http.get('http://127.0.0.1:9236/json', (res) => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', async () => {
      const tab = JSON.parse(data).find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      ws.addEventListener('open', async () => {
        const id = 1;
        ws.send(JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: {
            expression: `(function() {
              const b = document.getElementById('btn-notes-bubble');
              const cs = window.getComputedStyle(b);
              const p = b.parentElement;
              const pcs = window.getComputedStyle(p);
              return {
                bubble: {
                  position: cs.position,
                  top: cs.top,
                  bottom: cs.bottom,
                  left: cs.left,
                  right: cs.right,
                  transform: cs.transform,
                  offsetLeft: b.offsetLeft,
                  offsetTop: b.offsetTop
                },
                parent: {
                  position: pcs.position,
                  direction: pcs.direction,
                  width: pcs.width,
                  clientWidth: p.clientWidth,
                  scrollWidth: p.scrollWidth
                }
              };
            })()`,
            returnByValue: true
          }
        }));
        ws.addEventListener('message', (ev) => {
          console.log(JSON.stringify(JSON.parse(ev.data).result.result.value, null, 2));
          proc.kill();
          process.exit(0);
        });
      });
    });
  });
}
debugRects();
