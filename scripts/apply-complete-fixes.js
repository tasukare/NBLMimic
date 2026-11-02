const fs = require('fs');
const path = require('path');

// 1. UPDATE NBLMimic/css/layout.css
function updateLayoutCss() {
  const filePath = path.join(__dirname, '..', 'NBLMimic', 'css', 'layout.css');
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix .pane-canvas and .pane-studio
  content = content.replace(
    /\.pane-canvas\s*\{[\s\S]*?position:\s*relative;[\s\S]*?\}/,
    `.pane-canvas {
  flex: 1;
  min-width: 320px;
  height: 100%;
  background-color: var(--bg-canvas);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  margin-right: var(--sidepanel-width);
  transition: margin-right 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}`
  );

  content = content.replace(
    /\.sidepanel-collapsed\s+\.pane-studio\s*\{[\s\S]*?\}/,
    `.sidepanel-collapsed .pane-studio {
  display: none !important;
  transform: translate3d(100%, 0, 0);
  pointer-events: none;
}

.sidepanel-collapsed .pane-canvas {
  width: 100% !important;
  max-width: 100% !important;
  flex: 1 1 100% !important;
  margin-right: 0 !important;
}`
  );

  // Ensure #btn-reopen-studio has position: fixed !important and proper z-index
  content = content.replace(
    /\.btn-dock-open-chat\s*\{[\s\S]*?position:\s*fixed;/,
    `.btn-dock-open-chat {
  position: fixed !important;`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Updated NBLMimic/css/layout.css');
}

// 2. UPDATE NBLMimic/css/glass-folder-cards.css
function updateGlassFolderCardsCss() {
  const filePath = path.join(__dirname, '..', 'NBLMimic', 'css', 'glass-folder-cards.css');
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Grid container & Header width fixes
  content = content.replace(
    /\.gf-gallery-header\s*\{[\s\S]*?max-width:\s*1280px;[\s\S]*?\}/,
    `.gf-gallery-header {
  width: 100%;
  max-width: 100%;
  margin-bottom: var(--space-8);
  padding: 0 var(--space-4);
}`
  );

  content = content.replace(
    /\.gf-gallery-grid\s*\{[\s\S]*?perspective:\s*1400px;[\s\S]*?\}/,
    `.gf-gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  justify-items: center;
  align-items: end;
  gap: 36px 28px;
  max-width: 100%;
  width: 100%;
  perspective: 1400px;
  padding-bottom: var(--space-12);
}`
  );

  // 2. Hover glitches & Z-index fixes on folder elements
  // Ensure .gf-back has z-index: 1 and pointer-events: none
  content = content.replace(
    /\.gf-back\s*\{[\s\S]*?background:\s*linear-gradient\(180deg,\s*#f3f3f4 0%,\s*#e3e3e6 100%\);[\s\S]*?\}/,
    `.gf-back {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(180deg, #f3f3f4 0%, #e3e3e6 100%);
}`
  );

  // Ensure .gf-files has z-index: 2 and pointer-events: none
  content = content.replace(
    /\.gf-files\s*\{[\s\S]*?clip-path:\s*inset\(-400px -400px 10px -400px\);[\s\S]*?\}/,
    `.gf-files {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  clip-path: inset(-400px -400px 10px -400px);
}`
  );

  // Ensure .gf-sheet has pointer-events: none and 0.28s transition
  content = content.replace(
    /\.gf-sheet\s*\{[\s\S]*?pointer-events:\s*(?:auto|none);[\s\S]*?transition:[\s\S]*?;[\s\S]*?\}/,
    `.gf-sheet {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  left: 28px;
  top: 92px;
  width: 284px;
  height: 196px;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  pointer-events: none !important;
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%);
  padding: 12px 14px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .95),
    0 0 0 1px rgba(0, 0, 0, .08),
    0 12px 28px -6px rgba(10, 12, 20, .26);
  transform-origin: 50% 100%;
  will-change: transform, opacity;
  transform:
    translate3d(calc(var(--gf-jx) + var(--gf-slot) * var(--gf-spread)), calc(var(--gf-lift) + var(--gf-depth) * var(--gf-stack) * -1), 0)
    rotate(calc(var(--gf-jr) + var(--gf-slot) * var(--gf-fan)));
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
}`
  );

  // Ensure .gf-front has z-index: 3, pointer-events: none and 0.28s transition
  content = content.replace(
    /\.gf-front\s*\{[\s\S]*?z-index:\s*10;[\s\S]*?transition:[\s\S]*?;[\s\S]*?\}/,
    `.gf-front {
  position: absolute;
  left: 0;
  top: 70px;
  width: 340px;
  height: 202px;
  z-index: 3;
  pointer-events: none;
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  transform-origin: 50% 100%;
  transform: perspective(760px) rotateX(var(--gf-hinge));
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1) !important;
}`
  );

  // Ensure .gf-label has z-index: 4 and pointer-events: none
  content = content.replace(
    /\.gf-label\s*\{[\s\S]*?z-index:\s*2;/,
    `.gf-label {
  position: absolute;
  z-index: 4;`
  );

  // Ensure .gf-hit has z-index: 4 and pointer-events: auto
  content = content.replace(
    /\.gf-hit\s*\{[\s\S]*?z-index:\s*1;/,
    `.gf-hit {
  all: unset;
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: auto;`
  );

  // Ensure .gf-key (+ button) has z-index: 4 and pointer-events: auto
  content = content.replace(
    /\.gf-key\s*\{[\s\S]*?z-index:\s*15;/,
    `.gf-key {
  position: absolute;
  z-index: 4;
  pointer-events: auto;`
  );

  // 3. Expandable modal & backdrop: Flex centering, 9999 z-index, 10px blur, and 180ms closing keyframes
  content = content.replace(
    /\.gf-expandable-overlay\s*\{[\s\S]*?\}([\s\S]*?)\.gf-expandable-modal\s*\{[\s\S]*?\}/,
    `.gf-expandable-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(9, 9, 11, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: gfOverlayFadeIn 0.18s cubic-bezier(0, 0, 0.2, 1) forwards;
  overflow-y: auto;
}

[data-theme="light"] .gf-expandable-overlay {
  background: rgba(235, 232, 225, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.gf-expandable-overlay.is-closing {
  animation: gfOverlayFadeOut 0.18s cubic-bezier(0.4, 0, 1, 1) forwards;
  pointer-events: none;
}

.gf-expandable-modal {
  position: relative;
  margin: auto;
  width: min(760px, calc(100vw - 32px));
  max-height: min(88vh, 840px);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(24, 24, 28, 0.98) 0%, rgba(16, 16, 20, 0.99) 100%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 32px 80px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: text;
  animation: gfCardPopIn 0.18s cubic-bezier(0, 0, 0.2, 1) forwards;
}

[data-theme="light"] .gf-expandable-modal {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 246, 242, 0.99) 100%);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 32px 80px -12px rgba(20, 20, 24, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.gf-expandable-modal.is-closing {
  animation: gfCardPopOut 0.18s cubic-bezier(0.4, 0, 1, 1) forwards;
  pointer-events: none;
}`
  );

  // Keyframes for folder modal
  const keyframesBlock = `
@keyframes gfOverlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes gfOverlayFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes gfCardPopIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes gfCardPopOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
}
`;

  if (!content.includes('gfOverlayFadeIn')) {
    content += keyframesBlock;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Updated NBLMimic/css/glass-folder-cards.css');
}

// 3. UPDATE NBLMimic/css/liquid-glass.css
function updateLiquidGlassCss() {
  const filePath = path.join(__dirname, '..', 'NBLMimic', 'css', 'liquid-glass.css');
  let content = fs.readFileSync(filePath, 'utf8');

  // Disable / remove CPU-heavy url(#liquid-glass-dock-filter)
  content = content.replace(
    /backdrop-filter:\s*url\(#liquid-glass-dock-filter\)[^;]*;/g,
    'backdrop-filter: blur(10px);'
  );
  content = content.replace(
    /-webkit-backdrop-filter:\s*url\(#liquid-glass-dock-filter\)[^;]*;/g,
    '-webkit-backdrop-filter: blur(10px);'
  );

  // Update .notes-expandable-overlay and .notes-expandable-card
  content = content.replace(
    /\.notes-expandable-overlay\s*\{[\s\S]*?\}([\s\S]*?)\.notes-expandable-card\s*\{[\s\S]*?\}/,
    `.notes-expandable-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(9, 9, 11, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: notesOverlayFadeIn 0.18s cubic-bezier(0, 0, 0.2, 1) forwards;
  overflow-y: auto;
}

[data-theme="light"] .notes-expandable-overlay {
  background: rgba(235, 232, 225, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.notes-expandable-overlay.is-closing {
  animation: notesOverlayFadeOut 0.18s cubic-bezier(0.4, 0, 1, 1) forwards;
  pointer-events: none;
}

.notes-expandable-card {
  position: relative;
  margin: auto;
  width: min(740px, calc(100vw - 32px));
  height: min(84vh, 740px);
  z-index: 10000;
  background: linear-gradient(180deg, rgba(24, 24, 28, 0.98) 0%, rgba(16, 16, 20, 0.99) 100%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px;
  box-shadow:
    0 32px 80px -12px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: text;
  isolation: isolate;
  animation: notesCardPopIn 0.18s cubic-bezier(0, 0, 0.2, 1) forwards;
}

[data-theme="light"] .notes-expandable-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 246, 242, 0.99) 100%);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow:
    0 32px 80px -12px rgba(20, 20, 24, 0.2),
    0 0 0 1px rgba(0, 0, 0, 0.06);
}

.notes-expandable-card.is-closing {
  animation: notesCardPopOut 0.18s cubic-bezier(0.4, 0, 1, 1) forwards;
  pointer-events: none;
}`
  );

  const notesKeyframes = `
@keyframes notesOverlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes notesOverlayFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes notesCardPopIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes notesCardPopOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
}
`;

  if (!content.includes('notesOverlayFadeIn')) {
    content += notesKeyframes;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Updated NBLMimic/css/liquid-glass.css');
}

// 4. UPDATE NBLMimic/js/glass-folder-cards.js
function updateGlassFolderCardsJs() {
  const filePath = path.join(__dirname, '..', 'NBLMimic', 'js', 'glass-folder-cards.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Mount modal directly inside overlay, and overlay to document.body
  // Replace:
  // document.body.appendChild(overlay);
  // document.body.appendChild(modal);
  content = content.replace(
    /\/\/ Mount SIBLINGS to document\.body[\s\S]*?document\.body\.appendChild\(overlay\);[\s\S]*?document\.body\.appendChild\(modal\);/,
    `// Mount modal inside full-screen flex overlay directly to document.body
  overlay.appendChild(modal);
  document.body.appendChild(overlay);`
  );

  // Stop propagation on modal click
  content = content.replace(
    /modal\.appendChild\(body\);/,
    `modal.appendChild(body);
  modal.addEventListener('click', (e) => { e.stopPropagation(); });`
  );

  // Update closeModal to use .is-closing class with animationend
  content = content.replace(
    /let isClosed = false;[\s\S]*?const closeModal = \([\s\S]*?overlay\.__closeExpandable = closeModal;/,
    `let isClosed = false;
  const closeModal = (afterCloseCb) => {
    if (isClosed) return;
    isClosed = true;

    window.removeEventListener("keydown", onKeyDown);

    overlay.classList.add("is-closing");
    modal.classList.add("is-closing");

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onClose === "function") onClose();
      if (typeof afterCloseCb === "function") afterCloseCb();
    };

    modal.addEventListener("animationend", cleanup, { once: true });
    setTimeout(cleanup, 220); // Fallback
  };

  overlay.__closeExpandable = closeModal;`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Updated NBLMimic/js/glass-folder-cards.js');
}

// 5. UPDATE NBLMimic/js/notes.js
function updateNotesJs() {
  const filePath = path.join(__dirname, '..', 'NBLMimic', 'js', 'notes.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Mount card inside overlay, and overlay to document.body
  content = content.replace(
    /\/\/ Mount as SIBLINGS to document\.body[\s\S]*?document\.body\.appendChild\(overlay\);[\s\S]*?document\.body\.appendChild\(card\);/,
    `// Mount card inside full-screen flex overlay directly to document.body
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  card.addEventListener('click', (e) => { e.stopPropagation(); });
  overlay.addEventListener('click', () => { closeNotes(); });`
  );

  // Update closeNotes to use .is-closing with animationend
  content = content.replace(
    /let isClosing = false;[\s\S]*?const closeNotes = \(\) => \{[\s\S]*?activeNotesInstance = \{ overlay, card, closeNotes \};/,
    `let isClosing = false;
  const closeNotes = () => {
    if (isClosing) return;
    isClosing = true;

    window.removeEventListener('keydown', onKeyDown);

    overlay.classList.add('is-closing');
    card.classList.add('is-closing');

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      activeNotesInstance = null;
      if (triggerEl) triggerEl.focus();
    };

    card.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 220); // Fallback
  };

  activeNotesInstance = { overlay, card, closeNotes };`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Updated NBLMimic/js/notes.js');
}

// 6. UPDATE NBLMimic/js/app.js (toggleStudio & Clear inline canvas width)
function updateAppJs() {
  const filePath = path.join(__dirname, '..', 'NBLMimic', 'js', 'app.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // In toggleStudio, ensure paneCanvas.style.width = '' is always cleared
  content = content.replace(
    /const toggleStudio = \(forceState\) => \{[\s\S]*?if \(willBeCollapsed === isCurrentlyCollapsed\) return;/,
    `const toggleStudio = (forceState) => {
    if (isStudioAnimating) return;
    const isCurrentlyCollapsed = shell.classList.contains('sidepanel-collapsed');
    const willBeCollapsed = typeof forceState === 'boolean' ? !forceState : !isCurrentlyCollapsed;

    if (willBeCollapsed === isCurrentlyCollapsed) return;

    const paneCanvas = document.getElementById('pane-canvas');
    if (paneCanvas) paneCanvas.style.width = '';`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Updated NBLMimic/js/app.js');
}

// 7. SYNC ROOT index.html WITH NBLMimic/index.html
function syncRootIndex() {
  const src = path.join(__dirname, '..', 'NBLMimic', 'index.html');
  const dst = path.join(__dirname, '..', 'index.html');
  fs.copyFileSync(src, dst);
  console.log('✓ Synced root index.html');
}

updateLayoutCss();
updateGlassFolderCardsCss();
updateLiquidGlassCss();
updateGlassFolderCardsJs();
updateNotesJs();
updateAppJs();
syncRootIndex();
console.log('All complete fixes applied successfully!');
