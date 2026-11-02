const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function verifyDocLayoutFix() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9253',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-doc-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9253/json', (res) => {
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

        // Exact document from user screenshot: "Bac II History Study Guide"
        const docxSampleText = `សៀវភៅណែនាំស្វ័យសិក្សាប្រវត្តិវិទ្យាថ្នាក់ទី១២ សម្រាប់ត្រៀមប្រឡងបាក់ឌុប (Bac II) កម្រងសំណួរ-ចម្លើយគន្លឹះ
សំណួរទី ១ (សំណួរទូទៅ)៖ តើប្រទេសកម្ពុជាស្ថិតក្រោមអាណាព្យាបាលបារាំងប៉ុន្មានឆ្នាំ? ចាប់ពីឆ្នាំណាដល់ឆ្នាំណា?
ចម្លើយ៖ ប្រទេសកម្ពុជាស្ថិតក្រោមអាណាព្យាបាលបារាំងចំនួន ៩០ ឆ្នាំ (ជិតមួយសតវត្សរ៍)។ ចាប់ពី ថ្ងៃទី ១១ ខែសីហា ឆ្នាំ ១៨៦៣ ដល់ ថ្ងៃទី ៩ ខែវិច្ឆិកា ឆ្នាំ ១៩៥៣។
សំណួរទី ២ (សំណួរទូទៅ)៖ មុនការមកដល់របស់បារាំង តើកម្ពុជាជួបប្រទះនូវវិបត្តិ ឬការគំរាមកំហែងបែបណាខ្លះ?
ចម្លើយ៖ ត្រូវរងការគាបសង្កត់ និងដណ្តើមទឹកដីពីសំណាក់ប្រទេសជិតខាងទាំងពីរ ពួកសៀម(ថៃ) និង ពួកយួន (វៀតណាម)។
សំណួរទី ៣ (សំណួរជ្រៅ)៖ តើព្រះបាទអង្គឌួងបានព្យាយាមទាក់ទងបារាំងដើម្បីអ្វី?
ចម្លើយសង្ខេប៖ ដើម្បីរំដោះប្រទេសកម្ពុជាពីការគាបសង្កត់របស់សៀម និងយួន។`;

        const testGoogleDoc = {
          id: 'test-bac-ii-history-doc',
          driveFileId: '1AbC_mock_bac_ii_history_id',
          title: 'Bac II History Study Guide',
          mimeType: 'application/vnd.google-apps.document',
          category: 'Docs',
          source: 'Google Drive',
          sizeBytes: 35120,
          sizeFormatted: '34.3 KB',
          webViewLink: 'https://docs.google.com/document/d/1AbC_mock_bac_ii_history_id/edit',
          url: 'https://docs.google.com/document/d/1AbC_mock_bac_ii_history_id/edit',
          date: 'Jul 9, 2024',
          timestamp: Date.now() - 86400000 * 25,
          excerpt: 'Research manuscript "Bac II History Study Guide". Cloud document (34.3 KB) synchronized from Google Drive. Ready for full-text inspection and grounded citation extraction.',
          content: docxSampleText
        };

        // 1. Set dark theme (matches user environment)
        await send('Runtime.evaluate', {
          expression: `
            document.documentElement.setAttribute('data-theme', 'dark');
            window.state.set('theme', 'dark');
          `
        });

        // 2. Test Original Document Layout (Default)
        const evalOriginal = await send('Runtime.evaluate', {
          expression: `
            (function() {
              window.state.set('driveToken', 'ya29.mock_token_for_verification');
              window.state.set('sources', [${JSON.stringify(testGoogleDoc)}, ...(window.state.get('sources') || [])]);
              window.viewDocument('${testGoogleDoc.id}');

              const mount = document.getElementById('canvas-content-mount');
              const originalPane = document.getElementById('reader-submode-original');
              const textPane = document.getElementById('reader-submode-text');
              const originalBtn = document.getElementById('btn-submode-original');
              const textBtn = document.getElementById('btn-submode-text');
              const iframe = originalPane ? originalPane.querySelector('iframe') : null;

              return {
                originalPaneVisible: originalPane && originalPane.style.display !== 'none',
                textPaneVisible: textPane && textPane.style.display !== 'none',
                originalBtnActive: originalBtn && originalBtn.classList.contains('is-active'),
                iframeSrc: iframe ? iframe.getAttribute('src') : null,
                streamValid: iframe && iframe.getAttribute('src').includes('/api/drive/file')
              };
            })()
          `,
          returnByValue: true
        });

        console.log('1. Original Document Layout (Dark Theme, Default):', JSON.stringify(evalOriginal.result.value, null, 2));

        const screenshotOriginal = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('D:\\NBLMimic project\\scripts\\doc-original-layout-dark.png', Buffer.from(screenshotOriginal.data, 'base64'));

        // 3. Switch to Clean Study Text Sub-mode in Dark Theme
        const evalTextMode = await send('Runtime.evaluate', {
          expression: `
            (function() {
              window.setDocReaderSubMode('text');

              const originalPane = document.getElementById('reader-submode-original');
              const textPane = document.getElementById('reader-submode-text');
              const originalBtn = document.getElementById('btn-submode-original');
              const textBtn = document.getElementById('btn-submode-text');

              const questionBlocks = Array.from(textPane.querySelectorAll('.prose-question-block'));
              const answerBlocks = Array.from(textPane.querySelectorAll('.prose-answer-block'));
              const paragraphs = Array.from(textPane.querySelectorAll('.prose-p'));

              const qTexts = questionBlocks.map(q => q.querySelector('.prose-question-text')?.textContent.trim());
              const aTexts = answerBlocks.map(a => a.querySelector('.prose-answer-text')?.textContent.trim());

              return {
                originalPaneVisible: originalPane && originalPane.style.display !== 'none',
                textPaneVisible: textPane && textPane.style.display !== 'none',
                textBtnActive: textBtn && textBtn.classList.contains('is-active'),
                questionCount: questionBlocks.length,
                answerCount: answerBlocks.length,
                paragraphCount: paragraphs.length,
                qTexts,
                aTexts
              };
            })()
          `,
          returnByValue: true
        });

        console.log('2. Clean Study Text Sub-mode (Dark Theme):', JSON.stringify(evalTextMode.result.value, null, 2));

        const screenshotText = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('D:\\NBLMimic project\\scripts\\doc-clean-study-text-dark.png', Buffer.from(screenshotText.data, 'base64'));

        console.log('Screenshots saved: doc-original-layout-dark.png, doc-clean-study-text-dark.png');

        ws.close();
        proc.kill();
        process.exit(0);
      });
    });
  });
}

verifyDocLayoutFix().catch(err => {
  console.error(err);
  process.exit(1);
});
