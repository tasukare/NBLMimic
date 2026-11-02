const http = require('http');
const { spawn } = require('child_process');

async function checkCloseAnim() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9271',
    '--user-data-dir=' + require('os').tmpdir() + '/test-c1-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  http.get('http://127.0.0.1:9271/json', (res) => {
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

        // Click bubble to open
        await send('Runtime.evaluate', {
          expression: 'document.getElementById("btn-notes-bubble").click()'
        });
        await new Promise(r => setTimeout(r, 500));

        // Now inspect closing animation
        const res = await send('Runtime.evaluate', {
          expression: `(function() {
            const closeBtn = document.getElementById('btn-notes-close');
            const card = document.querySelector('.notes-expandable-card');
            const overlay = document.querySelector('.notes-expandable-overlay');
            
            closeBtn.click();
            
            const anims = card ? card.getAnimations() : [];
            return {
              animsCount: anims.length,
              anims: anims.map(a => ({
                duration: a.effect.getTiming().duration,
                playState: a.playState,
                currentTime: a.currentTime
              }))
            };
          })()`,
          returnByValue: true
        });
        console.log('Close animations on card:', res.result.value);

        // Track when onfinish fires
        const timingLog = await send('Runtime.evaluate', {
          expression: `new Promise((resolve) => {
            const t0 = performance.now();
            const check = () => {
              const card = document.querySelector('.notes-expandable-card');
              if (!card) {
                resolve({ elapsed: performance.now() - t0, unmounted: true });
              } else {
                requestAnimationFrame(check);
              }
            };
            requestAnimationFrame(check);
          })`,
          awaitPromise: true,
          returnByValue: true
        });
        console.log('Unmount timing:', timingLog.result.value);

        proc.kill();
        process.exit(0);
      });
    });
  });
}
checkCloseAnim();
