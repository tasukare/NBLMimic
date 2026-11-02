const http = require('http');
const { spawn } = require('child_process');

async function inspectMatchedRules() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9265',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);
  
  await new Promise(r => setTimeout(r, 2000));
  
  http.get('http://127.0.0.1:9265/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      });
      
      await new Promise(r => setTimeout(r, 4500));
      
      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            document.documentElement.setAttribute('data-theme', 'dark');
            const form = document.getElementById('chat-composer-form');
            const rules = [];
            for (const sheet of document.styleSheets) {
              try {
                for (const rule of sheet.cssRules) {
                  if (rule.selectorText && form.matches(rule.selectorText)) {
                    rules.push({
                      sheet: sheet.href ? sheet.href.split('/').pop() : 'inline',
                      selector: rule.selectorText,
                      cssText: rule.cssText
                    });
                  }
                }
              } catch(e) {}
            }
            return {
              computedBg: window.getComputedStyle(form).backgroundColor,
              rules
            };
          })()`,
          returnByValue: true
        }
      }));
      
      ws.addEventListener('message', (e) => {
        const p = JSON.parse(e.data);
        if (p.id === 2) {
          console.log('MATCHED RULES:', JSON.stringify(p.result.result.value, null, 2));
          proc.kill();
          process.exit(0);
        }
      });
    });
  });
}

inspectMatchedRules();
