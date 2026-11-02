const http = require('http');
const { spawn } = require('child_process');

async function testWaapi() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9250',
    '--user-data-dir=' + require('os').tmpdir() + '/test-waapi-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  http.get('http://127.0.0.1:9250/json', (res) => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', async () => {
      const tab = JSON.parse(data).find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      ws.addEventListener('open', async () => {
        const send = (method, params = {}) => new Promise((resolve) => {
          const id = Math.floor(Math.random() * 100000);
          const h = (ev) => {
            const m = JSON.parse(ev.data);
            if (m.id === id) { ws.removeEventListener('message', h); resolve(m.result); }
          };
          ws.addEventListener('message', h);
          ws.send(JSON.stringify({ id, method, params }));
        });

        await send('Runtime.enable');
        await new Promise(r => setTimeout(r, 2500));

        const testResult = await send('Runtime.evaluate', {
          expression: `(function() {
            const div = document.createElement('div');
            div.style.width = '100px';
            div.style.height = '100px';
            div.style.background = 'red';
            document.body.appendChild(div);
            const anim = div.animate([
              { transform: 'scale(0.5)' },
              { transform: 'scale(1)' }
            ], { duration: 300, fill: 'forwards' });
            return {
              playState: anim.playState,
              hasWebAnimation: typeof div.animate === 'function'
            };
          })()`,
          returnByValue: true
        });
        console.log('WAAPI Test:', testResult.result.value);

        proc.kill();
        process.exit(0);
      });
    });
  });
}
testWaapi();
