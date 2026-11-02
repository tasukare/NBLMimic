const http = require('http');
const { spawn } = require('child_process');

async function testAllFormats() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9240',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9240/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      if (!tab) {
        proc.kill();
        process.exit(1);
      }

      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let id = 1;
      const send = (method, params = {}) => new Promise((resolve) => {
        const curId = id++;
        const onMsg = (event) => {
          const payload = JSON.parse(event.data);
          if (payload.id === curId) {
            ws.removeEventListener('message', onMsg);
            resolve(payload.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });

      ws.addEventListener('open', async () => {
        await send('Runtime.enable');
        await send('Page.enable');
        await new Promise(r => setTimeout(r, 3000));

        const result = await send('Runtime.evaluate', {
          expression: `
            (function() {
              const formats = [
                {
                  id: 'test-docx',
                  driveFileId: 'docx-123',
                  title: 'Quarterly_Research_Summary.docx',
                  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  category: 'Docs',
                  sizeFormatted: '1.8 MB',
                  date: 'Oct 20',
                  content: null,
                  excerpt: 'Research manuscript "Quarterly_Research_Summary". Cloud document (1.8 MB) synchronized from Google Drive.'
                },
                {
                  id: 'test-sheet',
                  driveFileId: 'sheet-456',
                  title: 'Experiment_Metrics.xlsx',
                  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  category: 'Sheets',
                  sizeFormatted: '450 KB',
                  date: 'Yesterday',
                  content: null,
                  excerpt: 'Quantitative data matrix "Experiment_Metrics". Tabular dataset (450 KB) synchronized from Google Drive.'
                },
                {
                  id: 'test-gdoc',
                  driveFileId: 'gdoc-789',
                  title: 'Team Meeting Notes',
                  mimeType: 'application/vnd.google-apps.document',
                  category: 'Docs',
                  sizeFormatted: 'Doc',
                  date: 'Today',
                  content: '# Team Meeting Notes\\n\\n## Key Decisions\\n- Finalize 3D glass folders.\\n- Integrate native preview for all drive files.',
                  excerpt: 'Working notes for "Team Meeting Notes".'
                }
              ];

              window.state.set('sources', [...formats, ...(window.state.get('sources') || [])]);

              const out = {};
              for (const f of formats) {
                window.viewDocument(f.id);
                const mount = document.getElementById('canvas-content-mount');
                const badge = mount.querySelector('.reader-format-badge') ? mount.querySelector('.reader-format-badge').innerText : '';
                const iframe = Boolean(mount.querySelector('iframe.reader-embed-iframe'));
                const hasProse = Boolean(mount.querySelector('.reader-content-body'));
                out[f.id] = { badge, iframe, hasProse };
              }

              return out;
            })()
          `,
          returnByValue: true
        });

        console.log('Multi-Format Test Results:', JSON.stringify(result.result.value, null, 2));
        proc.kill();
        process.exit(0);
      });
    });
  });
}

testAllFormats();
