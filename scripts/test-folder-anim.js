const http = require('http');
const { spawn } = require('child_process');

async function testFolderAnim() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9246',
    '--user-data-dir=' + require('os').tmpdir() + '/test-folder-anim-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  http.get('http://127.0.0.1:9246/json', (res) => {
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

        // Click folder hit button
        const openLog = await send('Runtime.evaluate', {
          expression: `(function() {
            const startup = document.getElementById('startup-screen');
            if (startup) startup.style.display = 'none';

            const firstFolder = document.querySelector('.gf-root');
            const hitBtn = firstFolder.querySelector('.gf-hit');
            const fRect = firstFolder.getBoundingClientRect();
            hitBtn.click();

            const modal = document.querySelector('.gf-expandable-modal');
            return {
              folderRect: { l: fRect.left, t: fRect.top, w: fRect.width, h: fRect.height },
              modalInitialStyle: modal ? {
                transform: modal.style.transform,
                transition: modal.style.transition,
                opacity: modal.style.opacity,
                computedTransition: window.getComputedStyle(modal).transition,
                computedTransform: window.getComputedStyle(modal).transform
              } : null
            };
          })()`,
          returnByValue: true
        });
        console.log('Folder Open Initial:', openLog.result.value);

        await new Promise(r => setTimeout(r, 100));

        const midLog = await send('Runtime.evaluate', {
          expression: `(function() {
            const modal = document.querySelector('.gf-expandable-modal');
            return modal ? {
              computedTransform: window.getComputedStyle(modal).transform,
              inlineTransform: modal.style.transform
            } : null;
          })()`,
          returnByValue: true
        });
        console.log('Folder Open at 100ms:', midLog.result.value);

        proc.kill();
        process.exit(0);
      });
    });
  });
}
testFolderAnim();
