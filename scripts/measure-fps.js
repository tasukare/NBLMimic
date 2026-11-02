const http = require('http');
const { spawn } = require('child_process');

async function measurePerf() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9261',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);
  
  await new Promise(r => setTimeout(r, 2000));
  
  http.get('http://127.0.0.1:9261/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      
      let msgId = 1;
      const send = (method, params = {}) => ws.send(JSON.stringify({ id: msgId++, method, params }));
      
      ws.addEventListener('open', () => {
        send('Runtime.enable');
        send('Performance.enable');
      });
      
      // Wait for boot screen dismiss (4.5s)
      await new Promise(r => setTimeout(r, 4500));
      
      // Measure FPS and layout duration
      send('Runtime.evaluate', {
        expression: `(async () => {
          let frames = 0;
          const start = performance.now();
          const target = start + 2000;
          await new Promise(resolve => {
            function step() {
              frames++;
              if (performance.now() < target) {
                requestAnimationFrame(step);
              } else {
                resolve();
              }
            }
            requestAnimationFrame(step);
          });
          const actualDuration = performance.now() - start;
          const fps = Math.round((frames / actualDuration) * 1000);
          return { fps, frames, actualDuration };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      
      ws.addEventListener('message', (e) => {
        const p = JSON.parse(e.data);
        if (p.result && p.result.result && p.result.result.value) {
          console.log('PERF RESULT:', p.result.result.value);
          proc.kill();
          process.exit(0);
        }
      });
    });
  });
}
measurePerf();
