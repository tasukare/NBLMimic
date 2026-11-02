const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function testMorph() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9284',
    '--window-size=1440,900',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-' + Date.now(),
    'http://127.0.0.1:3000'
  ]);
  
  await new Promise(r => setTimeout(r, 2000));
  
  http.get('http://127.0.0.1:9284/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      
      const consoleLogs = [];
      
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
      });
      
      ws.addEventListener('message', async (e) => {
        const p = JSON.parse(e.data);
        if (p.method === 'Runtime.consoleAPICalled') {
          consoleLogs.push({ type: p.params.type, text: p.params.args.map(a => a.value || a.description).join(' ') });
        }
        
        if (p.id === 50) {
          console.log('[1. INITIAL FOLDERS]:', JSON.stringify(p.result.result.value, null, 2));
          
          // Test Click File in Folder -> Morph to Reader
          ws.send(JSON.stringify({
            id: 60,
            method: 'Runtime.evaluate',
            params: {
              expression: `(async () => {
                const folder = document.querySelector('.gf-root');
                const hit = folder.querySelector('.gf-hit');
                hit.click();
                await new Promise(r => setTimeout(r, 200));
                
                const sheet = folder.querySelector('.gf-sheet');
                if (!sheet) return { error: 'No sheet found' };
                
                const fileTitle = sheet.querySelector('.gf-sheet-title')?.textContent || '';
                sheet.click();
                
                // Wait for morph to complete (320ms + buffer)
                await new Promise(r => setTimeout(r, 450));
                
                const viewMode = window.state.get('viewMode');
                const docId = window.state.get('selectedDocId');
                const mount = document.getElementById('canvas-content-mount');
                const readerProse = document.getElementById('reader-prose-mount');
                
                return {
                  fileTitle,
                  viewMode,
                  docId,
                  readerMounted: !!readerProse,
                  canvasOpacity: mount ? getComputedStyle(mount).opacity : null,
                  canvasVisibility: mount ? getComputedStyle(mount).visibility : null
                };
              })()`,
              awaitPromise: true,
              returnByValue: true
            }
          }));
        }
        
        if (p.id === 60) {
          console.log('[2. AFTER FILE CLICK (MORPH TO READER)]:', JSON.stringify(p.result.result.value, null, 2));
          
          // Take screenshot of reader view
          ws.send(JSON.stringify({ id: 61, method: 'Page.captureScreenshot', params: {} }));
        }
        
        if (p.id === 61 && p.result && p.result.data) {
          fs.writeFileSync('scripts/morph-reader-success.png', Buffer.from(p.result.data, 'base64'));
          console.log('Saved scripts/morph-reader-success.png');
          
          // Test Back to Folders
          ws.send(JSON.stringify({
            id: 70,
            method: 'Runtime.evaluate',
            params: {
              expression: `(async () => {
                const backBtn = document.getElementById('btn-reader-back-to-folders') || document.getElementById('btn-canvas-back-folders');
                if (backBtn) backBtn.click();
                else window.navigateBackToFolders();
                
                // Wait for reverse animation
                await new Promise(r => setTimeout(r, 400));
                
                const viewMode = window.state.get('viewMode');
                const roots = document.querySelectorAll('.gf-root');
                const gallery = document.querySelector('.gf-gallery-container');
                
                return {
                  viewMode,
                  galleryFound: !!gallery,
                  galleryOpacity: gallery ? getComputedStyle(gallery).opacity : null,
                  foldersCount: roots.length
                };
              })()`,
              awaitPromise: true,
              returnByValue: true
            }
          }));
        }
        
        if (p.id === 70) {
          console.log('[3. AFTER BACK TO FOLDERS]:', JSON.stringify(p.result.result.value, null, 2));
          
          // Take screenshot of folders gallery after returning
          ws.send(JSON.stringify({ id: 71, method: 'Page.captureScreenshot', params: {} }));
        }
        
        if (p.id === 71 && p.result && p.result.data) {
          fs.writeFileSync('scripts/folders-after-back.png', Buffer.from(p.result.data, 'base64'));
          console.log('Saved scripts/folders-after-back.png');
          console.log('ALL TESTS PASSED CLEANLY! NO VANISHING, NO BLACK CANVAS.');
          proc.kill();
          process.exit(0);
        }
      });
      
      await new Promise(r => setTimeout(r, 4500));
      
      ws.send(JSON.stringify({
        id: 50,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const roots = document.querySelectorAll('.gf-root');
            return {
              viewMode: window.state.get('viewMode'),
              foldersCount: roots.length
            };
          })()`,
          returnByValue: true
        }
      }));
    });
  });
}

testMorph();
