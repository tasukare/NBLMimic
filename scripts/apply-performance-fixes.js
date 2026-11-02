const fs = require('fs');

console.log('=== Applying Performance & Exit Animation Fixes ===');

// ─────────────────────────────────────────────────────────────
// 1. NBLMimic/css/layout.css
// ─────────────────────────────────────────────────────────────
let layoutCss = fs.readFileSync('NBLMimic/css/layout.css', 'utf8');

// Replace .pane-studio and .sidepanel-collapsed .pane-studio
const oldPaneStudioRegex = /\/\* Right Pane — Synthesis Studio \*\/[\s\S]*?\.sidepanel-collapsed \.pane-studio\s*\{[\s\S]*?\}/;
const newPaneStudioCss = `/* Right Pane — Synthesis Studio (GPU Composited Drawer — Zero Layout Reflow) */
.pane-studio {
  width: var(--sidepanel-width);
  min-width: 320px;
  max-width: 600px;
  height: 100%;
  background-color: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 35;
  will-change: transform;
  transform: translate3d(0, 0, 0);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.35);
}

.sidepanel-collapsed .pane-studio {
  transform: translate3d(100%, 0, 0);
  pointer-events: none;
}`;

if (oldPaneStudioRegex.test(layoutCss)) {
  layoutCss = layoutCss.replace(oldPaneStudioRegex, newPaneStudioCss);
  console.log('Updated .pane-studio to GPU translate3d in layout.css');
} else {
  console.warn('Could not match oldPaneStudioRegex in layout.css');
}

// Update splitter-right to live with the absolute studio pane
layoutCss = layoutCss.replace(
  /\.pane-splitter\s*\{[\s\S]*?z-index:\s*20;/,
  `.pane-splitter {
  width: 5px;
  margin: 0 -2px;
  height: 100%;
  cursor: col-resize;
  position: absolute;
  top: 0;
  bottom: 0;
  right: var(--sidepanel-width);
  z-index: 36;
  will-change: transform;
  transform: translate3d(0, 0, 0);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);`
);

// Remove frame-by-frame gap/margin/max-width reflow transitions on gallery
layoutCss = layoutCss.replace(
  /\.gf-gallery-grid,\s*\.gf-gallery-header\s*\{[\s\S]*?transition:[\s\S]*?\}/,
  `.gf-gallery-grid,
.gf-gallery-header {
  /* Zero frame-by-frame layout reflow transitions on width or gap */
}`
);

layoutCss = layoutCss.replace(
  /\.gf-root\s*\{\s*transition:\s*transform[\s\S]*?margin[\s\S]*?\}/,
  `.gf-root {
  will-change: transform;
  transform-style: preserve-3d;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}`
);

fs.writeFileSync('NBLMimic/css/layout.css', layoutCss, 'utf8');
console.log('Saved NBLMimic/css/layout.css');

// ─────────────────────────────────────────────────────────────
// 2. NBLMimic/css/glass-folder-cards.css
// ─────────────────────────────────────────────────────────────
let folderCss = fs.readFileSync('NBLMimic/css/glass-folder-cards.css', 'utf8');

// Update .gf-sheet base class to transition: transform 300ms ease-out, opacity 300ms ease-out !important;
const oldGfSheetPattern = /\.gf-sheet\s*\{[\s\S]*?transform-origin:\s*50%\s*100%;[\s\S]*?transition:[\s\S]*?\}/;
const newGfSheet = `.gf-sheet {
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
  pointer-events: auto;
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
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease-out !important;
}`;

if (oldGfSheetPattern.test(folderCss)) {
  folderCss = folderCss.replace(oldGfSheetPattern, newGfSheet);
  console.log('Updated .gf-sheet base class in glass-folder-cards.css');
} else {
  console.warn('Could not match oldGfSheetPattern in glass-folder-cards.css');
}

// Ensure .gf-root[data-open] .gf-sheet:hover only mutates transform
folderCss = folderCss.replace(
  /\.gf-root\[data-open\] \.gf-sheet:hover,\s*\.gf-root\[data-open\] \.gf-sheet:focus-visible\s*\{[\s\S]*?\}/,
  `.gf-root[data-open] .gf-sheet:hover,
.gf-root[data-open] .gf-sheet:focus-visible {
  transform:
    translate3d(calc(var(--gf-jx) + var(--gf-slot) * var(--gf-spread)), calc(var(--gf-lift) + var(--gf-depth) * var(--gf-stack) * -1 - 22px), 0)
    rotate(calc(var(--gf-slot) * var(--gf-fan) * .5)) scale(1.02);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease-out !important;
}`
);

// Ensure .gf-root and .gf-tilt have will-change: transform
folderCss = folderCss.replace(
  /\.gf-tilt\s*\{[\s\S]*?transform:[\s\S]*?\}/,
  `.gf-tilt {
  position: absolute;
  inset: 0;
  will-change: transform;
  transform-style: preserve-3d;
  transform: perspective(1400px) rotateX(calc(var(--gf-py) * -3deg)) rotateY(calc(var(--gf-px) * 4deg));
  transition: transform .9s var(--gf-ease);
}`
);

// Ensure .gf-expandable-modal has solid/high-opacity translucent bg and no animating backdrop-filter
folderCss = folderCss.replace(
  /\.gf-expandable-modal\s*\{[\s\S]*?z-index:\s*910;/,
  `.gf-expandable-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate3d(-50%, -50%, 0);
  width: min(760px, calc(100vw - 32px));
  max-height: min(840px, calc(100vh - 48px));
  background: rgba(14, 14, 18, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 22px;
  overflow: hidden;
  z-index: 910;
  box-shadow: 0 32px 80px -16px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08);
  will-change: transform, opacity;`
);

fs.writeFileSync('NBLMimic/css/glass-folder-cards.css', folderCss, 'utf8');
console.log('Saved NBLMimic/css/glass-folder-cards.css');

// ─────────────────────────────────────────────────────────────
// 3. NBLMimic/js/glass-folder-cards.js
// ─────────────────────────────────────────────────────────────
let folderJs = fs.readFileSync('NBLMimic/js/glass-folder-cards.js', 'utf8');

// Replace openAnim and closeModal in openExpandableFolderCard
const openAnimRegex = /\/\/ 7\. Trigger 60 FPS Web Animations API[\s\S]*?openAnim\.onfinish\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};[\s\S]*?\} else \{[\s\S]*?\}\s*\}/;

const newOpenAndCloseJs = `// 7. Explicit 0.2s easeOut Scale + Opacity + Y Transitions (Zero Nested LayoutId Lag)
  modal.style.willChange = "transform, opacity";
  const openAnim = modal.animate([
    { opacity: 0, transform: "scale(0.95) translateY(10px)" },
    { opacity: 1, transform: "scale(1) translateY(0px)" }
  ], {
    duration: 200,
    easing: "cubic-bezier(0, 0, 0.2, 1)",
    fill: "forwards"
  });

  const overlayOpenAnim = overlay.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], {
    duration: 200,
    easing: "ease-out",
    fill: "forwards"
  });

  openAnim.onfinish = () => {
    modal.style.willChange = "auto";
    const input = modal.querySelector(".gf-expandable-search-input");
    if (input) input.focus();
  };

  // 8. Event Handlers & Modal Dismissal (Explicit 0.2s Exit Animation)
  let isClosed = false;
  const closeModal = (afterCloseCb) => {
    if (isClosed) return;
    isClosed = true;

    window.removeEventListener("keydown", onKeyDown);
    if (openAnim) openAnim.cancel();
    if (overlayOpenAnim) overlayOpenAnim.cancel();

    modal.style.willChange = "transform, opacity";
    const closeAnim = modal.animate([
      { opacity: 1, transform: "scale(1) translateY(0px)" },
      { opacity: 0, transform: "scale(0.95) translateY(10px)" }
    ], {
      duration: 200,
      easing: "cubic-bezier(0, 0, 0.2, 1)",
      fill: "forwards"
    });

    const overlayCloseAnim = overlay.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: 200,
      easing: "ease-out",
      fill: "forwards"
    });

    closeAnim.onfinish = () => {
      document.body.style.overflow = prevOverflow;
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onClose === "function") onClose();
      if (typeof afterCloseCb === "function") afterCloseCb();
    };
  };`;

// Replace from line containing "// 7. Trigger 60 FPS Web Animations API" through end of closeModal
const fullBlockRegex = /\/\/ 7\. Trigger 60 FPS Web Animations API[\s\S]*?closeAnim\.onfinish\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*;\s*\}\s*else\s*\{[\s\S]*?\}\s*\};/;

if (fullBlockRegex.test(folderJs)) {
  folderJs = folderJs.replace(fullBlockRegex, newOpenAndCloseJs);
  console.log('Replaced open/close animations in glass-folder-cards.js');
} else {
  console.warn('Could not match fullBlockRegex in glass-folder-cards.js');
}

fs.writeFileSync('NBLMimic/js/glass-folder-cards.js', folderJs, 'utf8');
console.log('Saved NBLMimic/js/glass-folder-cards.js');

// ─────────────────────────────────────────────────────────────
// 4. NBLMimic/js/notes.js
// ─────────────────────────────────────────────────────────────
let notesJs = fs.readFileSync('NBLMimic/js/notes.js', 'utf8');

// Replace openAnim in notes.js
const notesOpenRegex = /\/\/ 8\. Trigger 60 FPS GPU Keyframe Expansion[\s\S]*?openAnim\.onfinish\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};/;
const newNotesOpenJs = `// 8. Explicit 0.2s easeOut Scale + Opacity + Y Transition
  card.style.willChange = 'transform, opacity';
  const openAnim = card.animate([
    { opacity: 0, transform: 'scale(0.95) translateY(10px)' },
    { opacity: 1, transform: 'scale(1) translateY(0px)' }
  ], {
    duration: 200,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    fill: 'forwards'
  });

  const overlayOpenAnim = overlay.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], {
    duration: 200,
    easing: 'ease-out',
    fill: 'forwards'
  });

  openAnim.onfinish = () => {
    card.style.willChange = 'auto';
    textarea.focus();
  };`;

if (notesOpenRegex.test(notesJs)) {
  notesJs = notesJs.replace(notesOpenRegex, newNotesOpenJs);
  console.log('Replaced open animation in notes.js');
} else {
  console.warn('Could not match notesOpenRegex in notes.js');
}

// Replace closeNotes in notes.js
const notesCloseRegex = /\/\/ 12\. Modal Dismissal[\s\S]*?closeAnim\.onfinish\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};\s*\};/;
const newNotesCloseJs = `// 12. Modal Dismissal (Explicit 0.2s Exit Animation)
  let isClosing = false;
  const closeNotes = () => {
    if (isClosing) return;
    isClosing = true;

    window.removeEventListener('keydown', onKeyDown);
    if (openAnim) openAnim.cancel();
    if (overlayOpenAnim) overlayOpenAnim.cancel();

    card.style.willChange = 'transform, opacity';
    const closeAnim = card.animate([
      { opacity: 1, transform: 'scale(1) translateY(0px)' },
      { opacity: 0, transform: 'scale(0.95) translateY(10px)' }
    ], {
      duration: 200,
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
      fill: 'forwards'
    });

    const overlayCloseAnim = overlay.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: 200,
      easing: 'ease-out',
      fill: 'forwards'
    });

    closeAnim.onfinish = () => {
      document.body.style.overflow = prevOverflow;
      if (card.parentNode) card.parentNode.removeChild(card);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      activeNotesInstance = null;
      if (triggerEl) triggerEl.focus();
    };
  };`;

if (notesCloseRegex.test(notesJs)) {
  notesJs = notesJs.replace(notesCloseRegex, newNotesCloseJs);
  console.log('Replaced close animation in notes.js');
} else {
  console.warn('Could not match notesCloseRegex in notes.js');
}

fs.writeFileSync('NBLMimic/js/notes.js', notesJs, 'utf8');
console.log('Saved NBLMimic/js/notes.js');

console.log('=== All files successfully patched! ===');
