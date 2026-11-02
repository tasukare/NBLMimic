const http = require('http');
const { spawn } = require('child_process');

async function test() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);
  
  await new Promise(r => setTimeout(r, 2500));
  
  http.get('http://127.0.0.1:9227/json', (res) => {
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
        send('Log.enable');
      });
      
      ws.addEventListener('message', (event) => {
        const payload = JSON.parse(event.data);
        if (payload.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER CONSOLE]', payload.params.type, payload.params.args.map(a => a.value || a.description).join(' '));
        }
        if (payload.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', payload.params.exceptionDetails);
        }
        if (payload.result && payload.result.result) {
          console.log('[EVAL RESULT]', JSON.stringify(payload.result.result.value, null, 2));
        }
      });
      
      await new Promise(r => setTimeout(r, 4500));
      
      // Click the Folders tab
      send('Runtime.evaluate', {
        expression: `(function() {
          const btn = document.getElementById('tab-canvas-folders');
          if (btn) {
            btn.click();
            return 'clicked';
          }
          return 'btn-not-found';
        })()`,
        returnByValue: true
      });

      await new Promise(r => setTimeout(r, 1000));

      send('Runtime.evaluate', {
        expression: `JSON.stringify({
          hasFoldersBtn: !!document.getElementById('tab-canvas-folders'),
          foldersRendered: !!document.querySelector('.gf-gallery-grid'),
          folderCardsCount: document.querySelectorAll('.gf-root').length,
          folderTitles: Array.from(document.querySelectorAll('.gf-back-title')).map(el => el.textContent.trim()),
          folderMeta: Array.from(document.querySelectorAll('.gf-back-meta')).map(el => el.textContent.trim()),
          canvasSnippet: document.getElementById('canvas-content-mount') ? document.getElementById('canvas-content-mount').innerHTML.slice(0, 300) : ''
        })`,
        returnByValue: true
      });
      
      setTimeout(() => {
        proc.kill();
        process.exit(0);
      }, 2000);
    });
  });
}
test();
