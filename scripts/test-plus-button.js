const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');

async function main() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const tmpDir = os.tmpdir() + '/test-plus-' + Date.now();
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9290',
    '--user-data-dir=' + tmpDir,
    '--window-size=1920,1080',
    'http://127.0.0.1:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  http.get('http://127.0.0.1:9290/json', (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', async () => {
      const tab = JSON.parse(d).find(t => t.url.includes('3000'));
      const ws = new WebSocket(tab.webSocketDebuggerUrl);

      const send = (method, params = {}) => new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const h = (ev) => {
          const m = JSON.parse(ev.data);
          if (m.id === id) { ws.removeEventListener('message', h); resolve(m.result); }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id, method, params }));
      });

      ws.onopen = async () => {
        await send('Runtime.enable');
        await send('Page.enable');
        await new Promise(r => setTimeout(r, 2000));

        // Dismiss startup
        await send('Runtime.evaluate', {
          expression: `(() => {
            const skip = document.getElementById('btn-startup-skip');
            if (skip) skip.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 500));

        console.log('--- TEST: Click + Button on Folder ---');
        // Click the + button on second folder ('Docs & Manuscripts')
        const clickKeyRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll('.gf-root'));
            const docCard = cards[1];
            const plusBtn = docCard.querySelector('.gf-key');
            if (plusBtn) plusBtn.click();
            const popover = docCard.querySelector('.gf-folder-popover-menu');
            return JSON.stringify({
              plusBtnFound: Boolean(plusBtn),
              popoverIsOpen: popover?.classList.contains('is-open'),
              popoverRect: popover?.getBoundingClientRect(),
              items: Array.from(popover?.querySelectorAll('.gf-popover-item, .gf-popover-theme-row') || []).map(el => el.textContent.trim().replace(/\\s+/g, ' '))
            });
          })()`,
          returnByValue: true
        });
        console.log('Plus Click Popover:', JSON.parse(clickKeyRes.result.value));

        // Take a screenshot of the open popover menu on the folder
        const snap1 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\dsoph\\.gemini\\antigravity\\brain\\a86339e8-0c17-437b-a6d3-d4692eef879a\\verified_folder_popover.png', Buffer.from(snap1.data, 'base64'));

        console.log('--- TEST: Check Delete Button Inside Expandable Modal ---');
        // Open the modal now
        await send('Runtime.evaluate', {
          expression: `(() => {
            const cards = Array.from(document.querySelectorAll('.gf-root'));
            const docCard = cards[1];
            const expandBtn = docCard.querySelector('.gf-popover-expand');
            if (expandBtn) expandBtn.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 450));

        const modalCheckRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const modal = document.querySelector('.gf-expandable-modal');
            const deleteBtn = modal?.querySelector('.btn-action-delete');
            const renameBtn = modal?.querySelector('.gf-expandable-action-btn:nth-child(3)');
            const addBtn = modal?.querySelector('.gf-expandable-action-btn:nth-child(2)');
            return JSON.stringify({
              modalIsOpen: Boolean(modal),
              deleteBtnFound: Boolean(deleteBtn),
              deleteBtnText: deleteBtn?.textContent.trim(),
              actions: Array.from(modal?.querySelectorAll('.gf-expandable-action-btn') || []).map(b => b.textContent.trim().replace(/\\s+/g, ' '))
            });
          })()`,
          returnByValue: true
        });
        console.log('Modal Actions Check:', JSON.parse(modalCheckRes.result.value));

        // Take a screenshot of the open modal with the delete button visible
        const snap2 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\dsoph\\.gemini\\antigravity\\brain\\a86339e8-0c17-437b-a6d3-d4692eef879a\\verified_modal_delete_button.png', Buffer.from(snap2.data, 'base64'));

        proc.kill();
        process.exit(0);
      };
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
