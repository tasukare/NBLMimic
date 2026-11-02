const fs = require('fs');

console.log('=== Patching Draggable Chat Pill & Expandable Card Animation ===');

// ─────────────────────────────────────────────────────────────
// 1. Update NBLMimic/index.html and root index.html
// ─────────────────────────────────────────────────────────────
function updateIndexHtml(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const oldBtnRegex = /<button class="btn-dock-open-chat" id="btn-reopen-studio"[\s\S]*?<\/button>/;
  const newBtnHtml = `<button class="btn-dock-open-chat" id="btn-reopen-studio" title="Research Chat (Drag to reposition · Ctrl+Shift+B)" aria-label="Open Research Chat">
      <div class="dock-chat-pill-inner">
        <svg class="dock-chat-grip" width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
          <circle cx="2" cy="2" r="1.2"/>
          <circle cx="6" cy="2" r="1.2"/>
          <circle cx="2" cy="7" r="1.2"/>
          <circle cx="6" cy="7" r="1.2"/>
          <circle cx="2" cy="12" r="1.2"/>
          <circle cx="6" cy="12" r="1.2"/>
        </svg>
        <svg class="dock-chat-sparkle" width="14" height="14" viewBox="0 0 24 24" fill="#38bdf8">
          <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
        </svg>
        <span>Research Chat</span>
        <kbd class="dock-chat-kbd">Ctrl+Shift+B</kbd>
      </div>
    </button>`;

  if (oldBtnRegex.test(content)) {
    content = content.replace(oldBtnRegex, newBtnHtml);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated reopen button HTML in:', filePath);
  } else {
    console.warn('Could not find oldBtnRegex in:', filePath);
  }
}

updateIndexHtml('NBLMimic/index.html');
updateIndexHtml('index.html');

// ─────────────────────────────────────────────────────────────
// 2. Update NBLMimic/css/layout.css
// ─────────────────────────────────────────────────────────────
let layoutCss = fs.readFileSync('NBLMimic/css/layout.css', 'utf8');

const oldPillCssRegex = /\/\* ── Floating Reopen Research Chat Tab ── \*\/[\s\S]*?\.dock-chat-pill-inner\s*\{[\s\S]*?\}/;
const newPillCss = `/* ── Floating Reopen Research Chat Tab (Draggable & Aceternity Expandable) ── */
.btn-dock-open-chat {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%) translateX(105%);
  z-index: 75;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(28, 28, 34, 0.96) 0%, rgba(16, 16, 20, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-right: none;
  border-radius: 12px 0 0 12px;
  padding: 10px 14px 10px 12px;
  color: var(--text-primary);
  cursor: grab;
  box-shadow: -6px 12px 30px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, background 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
  touch-action: none;
}

[data-theme="light"] .btn-dock-open-chat {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 244, 240, 0.98) 100%);
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-right: none;
  box-shadow: -4px 10px 24px rgba(20, 20, 24, 0.12), inset 0 1px 0 rgba(255, 255, 255, 1);
  color: #18181b;
}

.sidepanel-collapsed .btn-dock-open-chat {
  transform: translateY(-50%) translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.sidepanel-collapsed .btn-dock-open-chat.is-custom-pos {
  transform: none !important;
  border-right: 1px solid rgba(255, 255, 255, 0.22) !important;
  border-radius: 9999px !important;
}

[data-theme="light"] .sidepanel-collapsed .btn-dock-open-chat.is-custom-pos {
  border-right: 1px solid rgba(0, 0, 0, 0.14) !important;
}

.btn-dock-open-chat:hover:not(.is-dragging):not(.is-custom-pos) {
  transform: translateY(-50%) translateX(-6px);
  background: linear-gradient(135deg, rgba(38, 38, 46, 0.98) 0%, rgba(22, 22, 28, 0.98) 100%);
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: -8px 16px 36px rgba(0, 0, 0, 0.55);
}

.btn-dock-open-chat:hover:not(.is-dragging).is-custom-pos {
  transform: scale(1.03) !important;
  background: linear-gradient(135deg, rgba(38, 38, 46, 0.98) 0%, rgba(22, 22, 28, 0.98) 100%);
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(56, 189, 248, 0.3);
}

.btn-dock-open-chat.is-dragging {
  cursor: grabbing !important;
  transition: none !important;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.65), 0 0 0 2px var(--accent) !important;
  transform: scale(1.06) !important;
}

.dock-chat-pill-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.dock-chat-grip {
  display: none;
  opacity: 0.45;
  margin-right: -2px;
}

.btn-dock-open-chat.is-custom-pos .dock-chat-grip {
  display: inline-block;
}`;

if (oldPillCssRegex.test(layoutCss)) {
  layoutCss = layoutCss.replace(oldPillCssRegex, newPillCss);
  fs.writeFileSync('NBLMimic/css/layout.css', layoutCss, 'utf8');
  console.log('Updated pill styles in layout.css');
} else {
  console.warn('Could not match oldPillCssRegex in layout.css');
}

// ─────────────────────────────────────────────────────────────
// 3. Update NBLMimic/js/app.js
// ─────────────────────────────────────────────────────────────
let appJs = fs.readFileSync('NBLMimic/js/app.js', 'utf8');

const targetStudioLogicRegex = /\/\/ Toggle Right Studio Panel \(Auxiliary Pane\)[\s\S]*?const btnReopenStudio = document\.getElementById\('btn-reopen-studio'\);\s*if \(btnReopenStudio\) \{\s*btnReopenStudio\.onclick = \(\) => toggleStudio\(true\);\s*\}/;

const newStudioLogic = `// ── Research Chat Panel State, Draggable Pill & Aceternity Expandable Card Morph ──
  const paneStudio = document.getElementById('pane-studio');
  const btnToggleStudio = document.getElementById('btn-toggle-studio');
  const btnCloseStudio = document.getElementById('btn-close-studio');
  const btnReopenStudio = document.getElementById('btn-reopen-studio');

  // Restore saved position of the draggable chat pill
  const restoreChatPillPos = () => {
    if (!btnReopenStudio) return;
    const savedPos = localStorage.getItem('nbl_chat_pill_pos');
    if (savedPos) {
      try {
        const { top, left } = JSON.parse(savedPos);
        const maxX = window.innerWidth - 180;
        const maxY = window.innerHeight - 56;
        const clampedTop = Math.max(12, Math.min(maxY, top));
        const clampedLeft = Math.max(12, Math.min(maxX, left));
        btnReopenStudio.style.top = \`\${clampedTop}px\`;
        btnReopenStudio.style.left = \`\${clampedLeft}px\`;
        btnReopenStudio.style.right = 'auto';
        btnReopenStudio.style.bottom = 'auto';
        btnReopenStudio.classList.add('is-custom-pos');
      } catch (e) {}
    }
  };
  restoreChatPillPos();

  // Restore saved open/collapsed state (Remember where user left off)
  const savedPanelState = localStorage.getItem('nbl_chat_panel_state');
  if (savedPanelState === 'collapsed') {
    shell.classList.add('sidepanel-collapsed');
    if (btnToggleStudio) {
      btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
      btnToggleStudio.setAttribute('aria-label', 'Open Auxiliary Pane (Ctrl+Shift+B)');
    }
  } else {
    shell.classList.remove('sidepanel-collapsed');
    if (btnToggleStudio) {
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

    if (!willBeCollapsed) {
      // ── Expand into Chat Space (Aceternity Expandable Card Shared-Element Morph) ──
      const originRect = btnReopenStudio ? btnReopenStudio.getBoundingClientRect() : null;

      shell.classList.remove('sidepanel-collapsed');
      localStorage.setItem('nbl_chat_panel_state', 'open');

      if (btnToggleStudio) {
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
          duration: 300,
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
          duration: 280,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });

        closeMorph.onfinish = () => {
          closeMorph.cancel();
          paneStudio.style.willChange = '';
          shell.classList.add('sidepanel-collapsed');
          localStorage.setItem('nbl_chat_panel_state', 'collapsed');
          isStudioAnimating = false;
          if (btnToggleStudio) {
            btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
            btnToggleStudio.setAttribute('aria-label', 'Open Auxiliary Pane (Ctrl+Shift+B)');
          }
        };
      } else {
        shell.classList.add('sidepanel-collapsed');
        localStorage.setItem('nbl_chat_panel_state', 'collapsed');
        if (btnToggleStudio) {
          btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
          btnToggleStudio.setAttribute('aria-label', 'Open Auxiliary Pane (Ctrl+Shift+B)');
        }
      }
    }
  };

  if (btnToggleStudio) {
    btnToggleStudio.onclick = () => toggleStudio();
  }

  if (btnCloseStudio) {
    btnCloseStudio.onclick = () => toggleStudio(false);
  }

  // ── Drag & Reposition Handler for the Research Chat Pill ──
  if (btnReopenStudio) {
    let isPointerDown = false;
    let isDragging = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let initialRect = null;

    btnReopenStudio.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      isPointerDown = true;
      hasMoved = false;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      initialRect = btnReopenStudio.getBoundingClientRect();
      btnReopenStudio.setPointerCapture(e.pointerId);
    });

    btnReopenStudio.addEventListener('pointermove', (e) => {
      if (!isPointerDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        hasMoved = true;
        isDragging = true;
        btnReopenStudio.classList.add('is-dragging');
        btnReopenStudio.classList.add('is-custom-pos');
      }

      if (isDragging && initialRect) {
        let newLeft = initialRect.left + dx;
        let newTop = initialRect.top + dy;
        const maxX = window.innerWidth - btnReopenStudio.offsetWidth - 12;
        const maxY = window.innerHeight - btnReopenStudio.offsetHeight - 12;
        newLeft = Math.max(12, Math.min(maxX, newLeft));
        newTop = Math.max(12, Math.min(maxY, newTop));

        btnReopenStudio.style.left = \`\${newLeft}px\`;
        btnReopenStudio.style.top = \`\${newTop}px\`;
        btnReopenStudio.style.right = 'auto';
        btnReopenStudio.style.bottom = 'auto';
      }
    });

    const onPointerUp = (e) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      try { btnReopenStudio.releasePointerCapture(e.pointerId); } catch(err) {}

      if (isDragging) {
        isDragging = false;
        btnReopenStudio.classList.remove('is-dragging');
        const rect = btnReopenStudio.getBoundingClientRect();
        localStorage.setItem('nbl_chat_pill_pos', JSON.stringify({ top: rect.top, left: rect.left }));
        setTimeout(() => { hasMoved = false; }, 80);
      }
    };

    btnReopenStudio.addEventListener('pointerup', onPointerUp);
    btnReopenStudio.addEventListener('pointercancel', onPointerUp);

    btnReopenStudio.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      toggleStudio(true);
    });
  }`;

if (targetStudioLogicRegex.test(appJs)) {
  appJs = appJs.replace(targetStudioLogicRegex, newStudioLogic);
  fs.writeFileSync('NBLMimic/js/app.js', appJs, 'utf8');
  console.log('Updated studio and draggable pill logic in NBLMimic/js/app.js');
} else {
  console.warn('Could not match targetStudioLogicRegex in app.js');
}

console.log('=== All files successfully patched! ===');
