const http = require('http');
const { spawn } = require('child_process');

async function testAnimation() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9245',
    '--user-data-dir=' + require('os').tmpdir() + '/test-anim-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  http.get('http://127.0.0.1:9245/json', (res) => {
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

        // Click notes bubble
        const openLog = await send('Runtime.evaluate', {
          expression: `(function() {
            const startup = document.getElementById('startup-screen');
            if (startup) startup.style.display = 'none';

            const b = document.getElementById('btn-notes-bubble');
            const bRect = b.getBoundingClientRect();
            b.click();

            const card = document.querySelector('.notes-expandable-card');
            const cRect = card ? card.getBoundingClientRect() : null;
            return {
              bubbleRect: { l: bRect.left, t: bRect.top, w: bRect.width, h: bRect.height },
              cardInitialStyle: card ? {
                transform: card.style.transform,
                transition: card.style.transition,
                opacity: card.style.opacity,
                borderRadius: card.style.borderRadius
              } : null
            };
          })()`,
          returnByValue: true
        });
        console.log('Notes Open Initial:', openLog.result.value);

        await new Promise(r => setTimeout(r, 500));

        const openSettledLog = await send('Runtime.evaluate', {
          expression: `(function() {
            const card = document.querySelector('.notes-expandable-card');
            return card ? {
              transform: card.style.transform,
              transition: card.style.transition,
              computedTransform: window.getComputedStyle(card).transform
            } : null;
          })()`,
          returnByValue: true
        });
        console.log('Notes Open Settled:', openSettledLog.result.value);

        // Click close
        const closeLog = await send('Runtime.evaluate', {
          expression: `(function() {
            const closeBtn = document.getElementById('btn-notes-close');
            const card = document.querySelector('.notes-expandable-card');
            const overlay = document.querySelector('.notes-expandable-overlay');
            closeBtn.click();
            return {
              cardClosingStyle: {
                transform: card.style.transform,
                transition: card.style.transition,
                opacity: card.style.opacity
              },
              overlayClass: overlay.className,
              overlayStyle: overlay.style.cssText
            };
          })()`,
          returnByValue: true
        });
        console.log('Notes Close Triggered:', closeLog.result.value);

        proc.kill();
        process.exit(0);
      });
    });
  });
}
testAnimation();
