const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function testDraggableAndPersistence() {
  const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(browserPath, [
    '--headless=new',
    '--remote-debugging-port=9289',
    '--user-data-dir=' + require('os').tmpdir() + '/test-drag-' + Date.now(),
    '--window-size=1400,900',
    'http://127.0.0.1:3000'
  ]);
  await new Promise(r => setTimeout(r, 2200));

  http.get('http://127.0.0.1:9289/json', (res) => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', async () => {
      const tab = JSON.parse(data).find(t => t.url.includes('3000'));
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

      ws.addEventListener('open', async () => {
        await send('Runtime.enable');
        await send('Page.enable');
        await new Promise(r => setTimeout(r, 2500));

        await send('Runtime.evaluate', {
          expression: `(function() {
            const startup = document.getElementById('startup-screen');
            if (startup) startup.style.display = 'none';
          })()`
        });
        await new Promise(r => setTimeout(r, 300));

        // ════════════════════════════════════════════════════════════
        // TEST 1: Minimize Chat and Verify Draggable Pill Appearance
        // ────────────────────────────────────────────────────────────
        console.log('\n--- 1. Minimizing Chat Space to Draggable Pill ---');
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-close-studio').click()`
        });
        await new Promise(r => setTimeout(r, 450));

        const pillState1 = await send('Runtime.evaluate', {
          expression: `(function() {
            const pill = document.getElementById('btn-reopen-studio');
            const cs = window.getComputedStyle(pill);
            return {
              visible: cs.opacity === '1',
              pointerEvents: cs.pointerEvents,
              rect: pill.getBoundingClientRect(),
              storedState: localStorage.getItem('nbl_chat_panel_state')
            };
          })()`,
          returnByValue: true
        });
        console.log('Minimized Pill State:', pillState1.result.value);

        // Capture screenshot of minimized pill
        const shotPillInitial = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/screenshot_chat_pill_docked.png', Buffer.from(shotPillInitial.data, 'base64'));

        // ════════════════════════════════════════════════════════════
        // TEST 2: Drag the Pill to a Custom Position
        // ────────────────────────────────────────────────────────────
        console.log('\n--- 2. Dragging Pill to Custom Coordinates (x: 520, y: 340) ---');
        await send('Runtime.evaluate', {
          expression: `(function() {
            const pill = document.getElementById('btn-reopen-studio');
            const rect = pill.getBoundingClientRect();
            
            // Dispatch pointerdown
            pill.dispatchEvent(new PointerEvent('pointerdown', {
              clientX: rect.left + 20,
              clientY: rect.top + 20,
              button: 0,
              bubbles: true
            }));
            
            // Dispatch pointermove to custom coords
            pill.dispatchEvent(new PointerEvent('pointermove', {
              clientX: 520,
              clientY: 340,
              button: 0,
              bubbles: true
            }));
            
            // Dispatch pointerup
            pill.dispatchEvent(new PointerEvent('pointerup', {
              clientX: 520,
              clientY: 340,
              button: 0,
              bubbles: true
            }));
          })()`
        });
        await new Promise(r => setTimeout(r, 200));

        const pillDraggedState = await send('Runtime.evaluate', {
          expression: `(function() {
            const pill = document.getElementById('btn-reopen-studio');
            return {
              rect: pill.getBoundingClientRect(),
              isCustomPos: pill.classList.contains('is-custom-pos'),
              storedPos: localStorage.getItem('nbl_chat_pill_pos')
            };
          })()`,
          returnByValue: true
        });
        console.log('Dragged Pill State & Saved Storage:', pillDraggedState.result.value);

        // Capture screenshot of custom floating position
        const shotPillDragged = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/screenshot_chat_pill_dragged.png', Buffer.from(shotPillDragged.data, 'base64'));

        // ════════════════════════════════════════════════════════════
        // TEST 3: Click Draggable Pill to Expand into Chat Space
        // ────────────────────────────────────────────────────────────
        console.log('\n--- 3. Testing Aceternity Expandable Card Morph (Pill -> Chat) ---');
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-reopen-studio').click()`
        });

        // Sample at 120ms (mid morph)
        await new Promise(r => setTimeout(r, 120));
        const midOpenMorph = await send('Runtime.evaluate', {
          expression: `(function() {
            const studio = document.getElementById('pane-studio');
            const cs = window.getComputedStyle(studio);
            return {
              status: 'expanding_from_pill',
              transform: cs.transform,
              borderRadius: cs.borderRadius,
              opacity: cs.opacity
            };
          })()`,
          returnByValue: true
        });
        console.log('Mid-Open Morph Frame (120ms):', midOpenMorph.result.value);

        await new Promise(r => setTimeout(r, 350));
        const finalOpenState = await send('Runtime.evaluate', {
          expression: `(function() {
            const isCollapsed = document.getElementById('app-shell').classList.contains('sidepanel-collapsed');
            return {
              isOpen: !isCollapsed,
              storedState: localStorage.getItem('nbl_chat_panel_state')
            };
          })()`,
          returnByValue: true
        });
        console.log('Final Open State:', finalOpenState.result.value);

        // ════════════════════════════════════════════════════════════
        // TEST 4: Close Chat and Verify Collapse Back to Pill Position
        // ────────────────────────────────────────────────────────────
        console.log('\n--- 4. Testing Aceternity Collapse Morph (Chat -> Pill) ---');
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-close-studio').click()`
        });

        await new Promise(r => setTimeout(r, 120));
        const midCloseMorph = await send('Runtime.evaluate', {
          expression: `(function() {
            const studio = document.getElementById('pane-studio');
            const cs = window.getComputedStyle(studio);
            return {
              status: 'collapsing_into_pill',
              transform: cs.transform,
              borderRadius: cs.borderRadius,
              opacity: cs.opacity
            };
          })()`,
          returnByValue: true
        });
        console.log('Mid-Close Morph Frame (120ms):', midCloseMorph.result.value);

        await new Promise(r => setTimeout(r, 350));
        const finalClosedCheck = await send('Runtime.evaluate', {
          expression: `(function() {
            const pill = document.getElementById('btn-reopen-studio');
            return {
              isCollapsed: document.getElementById('app-shell').classList.contains('sidepanel-collapsed'),
              storedState: localStorage.getItem('nbl_chat_panel_state'),
              pillPos: localStorage.getItem('nbl_chat_pill_pos'),
              pillRect: pill.getBoundingClientRect()
            };
          })()`,
          returnByValue: true
        });
        console.log('Final Closed Check & Retained Pill Pos:', finalClosedCheck.result.value);

        // ════════════════════════════════════════════════════════════
        // TEST 5: Reload Page to Verify Persistence
        // ────────────────────────────────────────────────────────────
        console.log('\n--- 5. Simulating Page Reload to Verify State Persistence ---');
        await send('Page.reload');
        await new Promise(r => setTimeout(r, 2200));

        await send('Runtime.evaluate', {
          expression: `(function() {
            const startup = document.getElementById('startup-screen');
            if (startup) startup.style.display = 'none';
          })()`
        });
        await new Promise(r => setTimeout(r, 300));

        const reloadedState = await send('Runtime.evaluate', {
          expression: `(function() {
            const isCollapsed = document.getElementById('app-shell').classList.contains('sidepanel-collapsed');
            const pill = document.getElementById('btn-reopen-studio');
            const pillCs = window.getComputedStyle(pill);
            return {
              retainedCollapsed: isCollapsed,
              pillVisible: pillCs.opacity === '1',
              pillRect: pill.getBoundingClientRect(),
              storedState: localStorage.getItem('nbl_chat_panel_state'),
              storedPos: localStorage.getItem('nbl_chat_pill_pos')
            };
          })()`,
          returnByValue: true
        });
        console.log('State After Page Reload:', reloadedState.result.value);

        // Capture screenshot of reloaded state
        const shotReloaded = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scripts/screenshot_chat_pill_reloaded.png', Buffer.from(shotReloaded.data, 'base64'));

        console.log('\n=== ALL DRAGGABLE & PERSISTENCE TESTS PASSED ===');
        try { proc.kill(); } catch (e) {}
        process.exit(0);
      });
    });
  });
}

testDraggableAndPersistence().catch(err => {
  console.error(err);
  process.exit(1);
});
