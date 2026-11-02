const http = require('http');
const { spawn } = require('child_process');

async function debugCssRules() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9237',
    '--user-data-dir=' + require('os').tmpdir() + '/test-rules-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  http.get('http://127.0.0.1:9237/json', (res) => {
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
              const matched = [];
              for (const sheet of document.styleSheets) {
                try {
                  for (const rule of sheet.cssRules) {
                    if (rule.selectorText && b.matches(rule.selectorText)) {
                      matched.push({ sel: rule.selectorText, pos: rule.style.position, sheet: sheet.href ? sheet.href.split('/').pop() : 'inline' });
                    }
                  }
                } catch(e) {}
              }
              return matched;
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
debugCssRules();
