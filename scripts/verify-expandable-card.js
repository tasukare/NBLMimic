const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function test() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--user-data-dir=' + require('os').tmpdir() + '/test-prof-expandable-' + Date.now(),
    '--window-size=1280,900',
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9228/json', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', async () => {
      const tabs = JSON.parse(data);
      const tab = tabs.find(t => t.url.includes('3000'));
      if (!tab) {
        console.error('No 3000 tab found');
        proc.kill();
        process.exit(1);
      }

      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      let id = 1;
      const send = (method, params = {}) => new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const payload = JSON.parse(event.data);
          if (payload.id === msgId) {
            ws.removeEventListener('message', handler);
            resolve(payload.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });

      ws.addEventListener('open', async () => {
        await send('Runtime.enable');
        await send('Page.enable');
        console.log('Connected to DevTools WebSocket');

        // Wait 3.5s for initial startup screen
        await new Promise(r => setTimeout(r, 3500));

        // 1. Check if startup screen is dismissable or dismissed
        const readyStatus = await send('Runtime.evaluate', {
          expression: `(function() {
            const startup = document.getElementById('startup-screen');
            if (startup) {
              startup.style.display = 'none';
            }
            return {
              folderCards: document.querySelectorAll('.gf-root').length,
              currentView: window.state ? window.state.get('viewMode') : 'unknown'
            };
          })()`,
          returnByValue: true
        });
        console.log('Initial page state:', readyStatus.result.value);

        // 2. Click the first folder card
        console.log('Clicking the first glass folder card to test expandable pop-up...');
        const clickResult = await send('Runtime.evaluate', {
          expression: `(function() {
            const hit = document.querySelector('.gf-root .gf-hit');
            if (hit) {
              hit.click();
              return { success: true, folderTitle: document.querySelector('.gf-root .gf-title')?.textContent };
            }
            return { success: false, reason: 'hit-btn-not-found' };
          })()`,
          returnByValue: true
        });
        console.log('Folder click result:', clickResult.result.value);

        // Wait 400ms for spring pop-up animation
        await new Promise(r => setTimeout(r, 4500));

        // 3. Inspect Expandable Card Modal
        const modalInfo = await send('Runtime.evaluate', {
          expression: `(function() {
            const overlay = document.querySelector('.gf-expandable-overlay');
            const modal = document.querySelector('.gf-expandable-modal');
            if (!modal) return { open: false };
            const title = modal.querySelector('.gf-expandable-title')?.textContent;
            const kicker = modal.querySelector('.gf-expandable-kicker')?.textContent;
            const items = Array.from(modal.querySelectorAll('.gf-expandable-item')).map(item => ({
              title: item.querySelector('.gf-expandable-item-title')?.textContent,
              badge: item.querySelector('.gf-sheet-badge')?.textContent,
              meta: item.querySelector('.gf-sheet-meta')?.textContent
            }));
            const hasCanvas = !!modal.querySelector('.gf-expandable-banner-canvas');
            const hasSearch = !!modal.querySelector('.gf-expandable-search-input');
            const hasCloseBtn = !!modal.querySelector('.gf-expandable-close');
            return {
              open: true,
              title,
              kicker,
              itemsCount: items.length,
              items,
              hasCanvas,
              hasSearch,
              hasCloseBtn
            };
          })()`,
          returnByValue: true
        });
        console.log('Modal inspection:', JSON.stringify(modalInfo.result.value, null, 2));

        // 4. Capture screenshot of the Pop-up Modal
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        if (screenshot && screenshot.data) {
          const outPath = path.join(__dirname, 'expandable-card-popup-verified.png');
          fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
          console.log(`Saved screenshot to ${outPath}`);
        }

        // 5. Test real-time search filtering in modal
        console.log('Testing search filter with query "Constitutional"...');
        const filterResult = await send('Runtime.evaluate', {
          expression: `(function() {
            const input = document.querySelector('.gf-expandable-search-input');
            if (!input) return { error: 'no-input' };
            input.value = 'Constitutional';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const items = document.querySelectorAll('.gf-expandable-item');
            return {
              itemsAfterFilter: items.length,
              matchedTitle: items[0]?.querySelector('.gf-expandable-item-title')?.textContent
            };
          })()`,
          returnByValue: true
        });
        console.log('Filter result:', filterResult.result.value);

        // 6. Test closing via Escape key
        console.log('Testing dismissal via Escape key...');
        await send('Runtime.evaluate', {
          expression: `(function() {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          })()`
        });

        // Wait for exit animation
        await new Promise(r => setTimeout(r, 400));

        const closedState = await send('Runtime.evaluate', {
          expression: `(function() {
            const overlay = document.querySelector('.gf-expandable-overlay');
            const bodyOverflow = document.body.style.overflow;
            const openCards = document.querySelectorAll('.gf-root[data-open]').length;
            return {
              overlayExists: !!overlay,
              bodyOverflow,
              openCards
            };
          })()`,
          returnByValue: true
        });
        console.log('Closed state inspection:', closedState.result.value);

        proc.kill();
        process.exit(0);
      });
    });
  });
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
