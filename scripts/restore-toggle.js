const fs = require('fs');

let appJs = fs.readFileSync('NBLMimic/js/app.js', 'utf8');

const targetSection = `  // Restore saved open/collapsed state (Remember where user left off)
  const savedPanelState = localStorage.getItem('nbl_chat_panel_state');
  if (savedPanelState === 'collapsed') {
    shell.classList.add('sidepanel-collapsed');
    if (btnToggleStudio) {
      btnToggleStudio.classList.add('is-collapsed');
      btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
      btnToggleStudio.setAttribute('aria-label', 'Open Auxiliary Pane (Ctrl+Shift+B)');
    }
  } else {
    shell.classList.remove('sidepanel-collapsed');
    if (btnToggleStudio) {
      btnToggleStudio.classList.remove('is-collapsed');
      btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
      btnToggleStudio.setAttribute('aria-label', 'Close Auxiliary Pane (Ctrl+Shift+B)');
    }
  }

  let isStudioAnimating = false;

  const toggleStudio = (forceState) => {
    if (isStudioAnimating) return;
    const isCurrentlyCollapsed = shell.classList.contains('sidepanel-collapsed');
    const willBeCollapsed = typeof forceState === 'boolean' ? !forceState : !isCurrentlyCollapsed;

    if (willBeCollapsed === isCurrentlyCollapsed) return;

    const paneCanvas = document.getElementById('pane-canvas');
    if (paneCanvas) paneCanvas.style.width = '';

    if (!willBeCollapsed) {
      // ── Expand into Chat Space (Aceternity Expandable Card Shared-Element Morph) ──
      const originRect = btnReopenStudio ? btnReopenStudio.getBoundingClientRect() : null;

      shell.classList.remove('sidepanel-collapsed');
      localStorage.setItem('nbl_chat_panel_state', 'open');

      if (btnToggleStudio) {
        btnToggleStudio.classList.remove('is-collapsed');
        btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
        btnToggleStudio.setAttribute('aria-label', 'Close Auxiliary Pane (Ctrl+Shift+B)');
      }

      if (paneStudio && originRect && originRect.width > 0 && window.innerWidth > 640) {
        isStudioAnimating = true;
        const targetRect = paneStudio.getBoundingClientRect();
        const scaleX = originRect.width / Math.max(targetRect.width, 1);
        const scaleY = originRect.height / Math.max(targetRect.height, 1);
        const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
        const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);

        paneStudio.style.willChange = 'transform, opacity, border-radius';

        const openMorph = paneStudio.animate([
          {
            transform: \`translate3d(\${deltaX}px, \${deltaY}px, 0) scale(\${scaleX}, \${scaleY})\`,
            borderRadius: '24px',
            opacity: 0.85
          },
          {
            transform: 'translate3d(0, 0, 0) scale(1, 1)',
            borderRadius: '0px',
            opacity: 1
          }
        ], {
          duration: 250,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });

        openMorph.onfinish = () => {
          openMorph.cancel();
          paneStudio.style.willChange = '';
          isStudioAnimating = false;
          const composerInput = document.getElementById('composer-textarea');
          if (composerInput) composerInput.focus();
        };
      } else {
        const composerInput = document.getElementById('composer-textarea');
        if (composerInput) composerInput.focus();
      }
    } else {
      // ── Minimize back to the Pill (Aceternity Expandable Card Collapse) ──
      const targetRect = btnReopenStudio ? btnReopenStudio.getBoundingClientRect() : null;
      const originRect = paneStudio ? paneStudio.getBoundingClientRect() : null;

      if (btnToggleStudio) {
        btnToggleStudio.classList.add('is-collapsed');
        btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
        btnToggleStudio.setAttribute('aria-label', 'Open Auxiliary Pane (Ctrl+Shift+B)');
      }

      if (paneStudio && targetRect && originRect && targetRect.width > 0 && window.innerWidth > 640) {
        isStudioAnimating = true;
        const scaleX = targetRect.width / Math.max(originRect.width, 1);
        const scaleY = targetRect.height / Math.max(originRect.height, 1);
        const deltaX = (targetRect.left + targetRect.width / 2) - (originRect.left + originRect.width / 2);
        const deltaY = (targetRect.top + targetRect.height / 2) - (originRect.top + originRect.height / 2);

        paneStudio.style.willChange = 'transform, opacity, border-radius';

        const closeMorph = paneStudio.animate([
          {
            transform: 'translate3d(0, 0, 0) scale(1, 1)',
            borderRadius: '0px',
            opacity: 1
          },
          {
            transform: \`translate3d(\${deltaX}px, \${deltaY}px, 0) scale(\${scaleX}, \${scaleY})\`,
            borderRadius: '24px',
            opacity: 0.8
          }
        ], {
          duration: 220,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });

        closeMorph.onfinish = () => {
          closeMorph.cancel();
          paneStudio.style.willChange = '';
          shell.classList.add('sidepanel-collapsed');
          localStorage.setItem('nbl_chat_panel_state', 'collapsed');
          isStudioAnimating = false;
        };
      } else {
        shell.classList.add('sidepanel-collapsed');
        localStorage.setItem('nbl_chat_panel_state', 'collapsed');
      }
    }
  };`;

const startMarker = '  // Restore saved open/collapsed state';
const endMarker = '  if (btnToggleStudio) {\n    btnToggleStudio.onclick = () => toggleStudio();';

const sIdx = appJs.indexOf(startMarker);
const eIdx = appJs.indexOf(endMarker);

if (sIdx !== -1 && eIdx !== -1) {
  appJs = appJs.slice(0, sIdx) + targetSection + '\n\n' + appJs.slice(eIdx);
  fs.writeFileSync('NBLMimic/js/app.js', appJs, 'utf8');
  console.log('Successfully restored toggleStudio in app.js');
} else {
  console.error('Markers not found', sIdx, eIdx);
}
