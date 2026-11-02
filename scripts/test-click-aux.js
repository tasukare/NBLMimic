const http = require('http');
const { spawn } = require('child_process');
const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const proc = spawn(browserPath, [
  '--headless=new',
  '--remote-debugging-port=9292',
  '--user-data-dir=' + require('os').tmpdir() + '/test-click-' + Date.now(),
  'http://127.0.0.1:3000'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9292/json', (res) => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', () => {
      const tab = JSON.parse(data).find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const btn = document.getElementById('btn-toggle-studio');
                const hasOnclick = typeof btn.onclick === 'function';
                btn.click();
                const isCollapsed = document.getElementById('app-shell').classList.contains('sidepanel-collapsed');
                return { hasOnclick, isCollapsed };
              })()`,
              returnByValue: true
            }
          }));
        }, 3000);
      });
      ws.addEventListener('message', (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === 2) {
          console.log('Result after click:', m.result.value);
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 3,
              method: 'Runtime.evaluate',
              params: {
                expression: `(() => {
                  const fill = document.querySelector('.icon-aux-pane .aux-pane-fill');
                  const fillOpacity = window.getComputedStyle(fill).opacity;
                  const isCollapsed = document.getElementById('app-shell').classList.contains('sidepanel-collapsed');
                  const studioDisplay = window.getComputedStyle(document.getElementById('pane-studio')).display;
                  const canvasWidth = document.getElementById('pane-canvas').getBoundingClientRect().width;
                  return { fillOpacity, isCollapsed, studioDisplay, canvasWidth };
                })()`,
                returnByValue: true
              }
            }));
          }, 350);
        }
        if (m.id === 3) {
          console.log('Result after close animation completes:', m.result.value);
          proc.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2000);
