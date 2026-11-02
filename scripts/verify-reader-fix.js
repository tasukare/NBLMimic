const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function testReaderFix() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9235',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9235/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      if (!tab) {
        console.error('No tab found on port 3000');
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

        // Wait for page startup
        await new Promise(r => setTimeout(r, 3500));

        // Inject simulated Google Drive PDF and view it
        const evalResult = await send('Runtime.evaluate', {
          expression: `
            (function() {
              const testDoc = {
                id: 'drive-khmer-pdf-test',
                driveFileId: '12345KhmerPdfTest',
                title: '៦_ព្រះរាជាណាចក្រកម្ពុជាទី២.pdf',
                mimeType: 'application/pdf',
                category: 'PDFs',
                source: 'Google Drive',
                sizeBytes: 3250000,
                sizeFormatted: '3.1 MB',
                webViewLink: 'https://drive.google.com/file/d/12345KhmerPdfTest/view',
                url: 'https://drive.google.com/file/d/12345KhmerPdfTest/view',
                date: 'Jul 9',
                timestamp: Date.now() - 86400000 * 20,
                excerpt: 'Archived PDF manuscript "ព្រះរាជាណាចក្រកម្ពុជាទី២". Verified cloud document (3.1 MB) synchronized from Google Drive. Full multi-page layout and figures ready for reading and AI synthesis.',
                content: '%PDF-1.5 1 0 obj << /Type /Catalog /Pages 2 0 R /Lang(en-US) >> stream x... FlateDecode'
              };

              const currentSources = window.state.get('sources') || [];
              window.state.set('sources', [testDoc, ...currentSources]);
              
              window.viewDocument(testDoc.id);

              const mount = document.getElementById('canvas-content-mount');
              const textContent = mount ? mount.innerText : '';
              const htmlContent = mount ? mount.innerHTML : '';

              const hasIframe = Boolean(mount.querySelector('iframe.reader-embed-iframe'));
              const iframeSrc = hasIframe ? mount.querySelector('iframe.reader-embed-iframe').getAttribute('src') : '';
              const hasBinaryGarbage = textContent.includes('%PDF') || textContent.includes('FlateDecode');
              const badgeText = mount.querySelector('.reader-format-badge') ? mount.querySelector('.reader-format-badge').innerText : '';
              const statusText = mount.querySelector('.reader-status-pill') ? mount.querySelector('.reader-status-pill').innerText : '';
              const backBtn = Boolean(document.getElementById('btn-reader-back-to-folders'));

              return {
                viewMode: window.state.get('viewMode'),
                hasIframe,
                iframeSrc,
                hasBinaryGarbage,
                badgeText,
                statusText,
                backBtn,
                excerptPresent: textContent.includes('ព្រះរាជាណាចក្រកម្ពុជាទី២')
              };
            })()
          `,
          returnByValue: true
        });

        console.log('Reader View Evaluation:', JSON.stringify(evalResult.result.value, null, 2));

        // Take a screenshot of the reader view
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/reader-doc-fixed.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved screenshot to scripts/reader-doc-fixed.png');

        // Test clicking "Back to Folders"
        const backResult = await send('Runtime.evaluate', {
          expression: `
            (function() {
              const btn = document.getElementById('btn-reader-back-to-folders');
              if (btn) btn.click();
              return {
                viewMode: window.state.get('viewMode'),
                isFolders: window.state.get('viewMode') === 'folders'
              };
            })()
          `,
          returnByValue: true
        });
        console.log('Back to Folders Click Evaluation:', JSON.stringify(backResult.result.value, null, 2));

        proc.kill();
        process.exit(0);
      });
    });
  });
}

testReaderFix().catch(err => {
  console.error(err);
  process.exit(1);
});
