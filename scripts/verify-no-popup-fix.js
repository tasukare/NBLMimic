const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function verifyNoPopupFix() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9250',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9250/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      if (!tab) {
        console.error('Could not find localhost:3000 tab');
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
        await new Promise(r => setTimeout(r, 3500));

        // Test Scenario A: With Drive Token (First-Party Stream)
        const testDoc = {
          id: 'test-khmer-pdf-stream',
          driveFileId: '117zqgk-C4jqAsB-dvEF7YR6E1q3Jb26h',
          title: '៦_ព្រះរាជាណាចក្រកម្ពុជាទី២.pdf',
          mimeType: 'application/pdf',
          category: 'PDFs',
          source: 'Google Drive',
          sizeBytes: 3250000,
          sizeFormatted: '3.1 MB',
          webViewLink: 'https://drive.google.com/file/d/117zqgk-C4jqAsB-dvEF7YR6E1q3Jb26h/view',
          url: 'https://drive.google.com/file/d/117zqgk-C4jqAsB-dvEF7YR6E1q3Jb26h/view',
          date: 'Jul 9, 2024',
          timestamp: Date.now() - 86400000 * 20,
          excerpt: 'Archived PDF manuscript "ព្រះរាជាណាចក្រកម្ពុជាទី២". Verified cloud document (3.1 MB) synchronized from Google Drive. Full multi-page layout and figures ready for reading and AI synthesis.',
          content: null
        };

        const evalAuth = await send('Runtime.evaluate', {
          expression: `
            (function() {
              window.state.set('driveToken', 'ya29.mock_token_for_verification');
              window.state.set('sources', [${JSON.stringify(testDoc)}, ...(window.state.get('sources') || [])]);
              window.viewDocument('${testDoc.id}');

              const mount = document.getElementById('canvas-content-mount');
              const iframes = Array.from(mount.querySelectorAll('iframe'));
              const iframeSrcs = iframes.map(f => f.getAttribute('src'));
              const hasExternalDriveIframe = iframeSrcs.some(src => src && src.includes('drive.google.com/file/d/'));
              const hasFirstPartyStream = iframeSrcs.some(src => src && (src.includes('/api/drive/file') || src.startsWith('blob:')));

              return {
                viewMode: window.state.get('viewMode'),
                iframeCount: iframes.length,
                iframeSrcs: iframeSrcs,
                hasExternalDriveIframe,
                hasFirstPartyStream
              };
            })()
          `,
          returnByValue: true
        });

        console.log('Scenario A (Authenticated Stream):', JSON.stringify(evalAuth.result.value, null, 2));

        // Test Scenario B: Without Drive Token (Safe Placeholder, No Popups)
        const evalUnauth = await send('Runtime.evaluate', {
          expression: `
            (function() {
              window.state.set('driveToken', null);
              window.viewDocument('${testDoc.id}');

              const mount = document.getElementById('canvas-content-mount');
              const iframes = Array.from(mount.querySelectorAll('iframe'));
              const hasExternalDriveIframe = iframes.some(f => (f.getAttribute('src') || '').includes('drive.google.com'));
              const hasPlaceholder = Boolean(mount.querySelector('.reader-embed-placeholder-card'));
              const placeholderTitle = mount.querySelector('.reader-placeholder-title')?.innerText || '';

              return {
                viewMode: window.state.get('viewMode'),
                iframeCount: iframes.length,
                hasExternalDriveIframe,
                hasPlaceholder,
                placeholderTitle
              };
            })()
          `,
          returnByValue: true
        });

        console.log('Scenario B (Unauthenticated Safe Placeholder):', JSON.stringify(evalUnauth.result.value, null, 2));

        // Capture screenshot of the safe placeholder
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/no-popup-verified.png', Buffer.from(shot.data, 'base64'));
        console.log('Verification screenshot saved to scripts/no-popup-verified.png');

        proc.kill();
        process.exit(0);
      });
    });
  });
}

verifyNoPopupFix().catch(err => {
  console.error(err);
  process.exit(1);
});
