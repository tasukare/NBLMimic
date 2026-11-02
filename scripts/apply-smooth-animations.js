const fs = require('fs');

console.log('--- Step 1: Patch CSS to remove heavy backdrop blur from scaling cards ---');

// 1. Update glass-folder-cards.css
let gfcCss = fs.readFileSync('NBLMimic/css/glass-folder-cards.css', 'utf8');
gfcCss = gfcCss.replace(
  /\.gf-expandable-modal\s*\{[\s\S]*?user-select:\s*text;/m,
`.gf-expandable-modal {
  position: relative;
  width: 100%;
  max-width: 660px;
  max-height: min(88vh, 780px);
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(26, 26, 32, 0.96) 0%, rgba(18, 18, 22, 0.98) 100%);
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 28px 75px -12px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transform-origin: center center;
  user-select: text;`
);
fs.writeFileSync('NBLMimic/css/glass-folder-cards.css', gfcCss, 'utf8');
console.log('Updated glass-folder-cards.css');

// 2. Update liquid-glass.css
let lgCss = fs.readFileSync('NBLMimic/css/liquid-glass.css', 'utf8');
lgCss = lgCss.replace(
  /\.notes-expandable-card\s*\{[\s\S]*?isolation:\s*isolate;/m,
`.notes-expandable-card {
  position: relative;
  width: 100%;
  max-width: 740px;
  height: min(84vh, 740px);
  background: linear-gradient(180deg, rgba(24, 24, 28, 0.96) 0%, rgba(16, 16, 20, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px;
  box-shadow:
    0 28px 75px -12px rgba(0, 0, 0, 0.72),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: text;
  isolation: isolate;
  transform-origin: center center;`
);

// Ensure .notes-expandable-overlay has clean base opacity: 0 and backdrop-filter
lgCss = lgCss.replace(
  /\.notes-expandable-overlay\s*\{[\s\S]*?opacity:\s*0;[^}]*\}/m,
`.notes-expandable-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(8, 8, 12, 0.65);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  opacity: 0;
}`
);

fs.writeFileSync('NBLMimic/css/liquid-glass.css', lgCss, 'utf8');
console.log('Updated liquid-glass.css');

// 3. Update app.js
let appJs = fs.readFileSync('NBLMimic/js/app.js', 'utf8');
const oldAppToggleSnippet = `  // Toggle Right Studio Panel (Auxiliary Pane)
  const toggleStudio = () => {
    shell.classList.toggle('sidepanel-collapsed');
  };

  const btnToggleStudio = document.getElementById('btn-toggle-studio');
  if (btnToggleStudio) {
    btnToggleStudio.onclick = toggleStudio;
  }

  const btnCloseStudio = document.getElementById('btn-close-studio');
  if (btnCloseStudio) {
    btnCloseStudio.onclick = () => {
      shell.classList.add('sidepanel-collapsed');
    };
  }

  // Global Keyboard Shortcut: Ctrl+Shift+B (Toggle Auxiliary Pane)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyB') {
      e.preventDefault();
      toggleStudio();
    }
  });`;

const newAppToggleSnippet = `  // Toggle Right Studio Panel (Auxiliary Pane)
  const toggleStudio = (forceState) => {
    if (typeof forceState === 'boolean') {
      shell.classList.toggle('sidepanel-collapsed', !forceState);
    } else {
      shell.classList.toggle('sidepanel-collapsed');
    }
    const isCollapsed = shell.classList.contains('sidepanel-collapsed');
    if (btnToggleStudio) {
      btnToggleStudio.title = isCollapsed ? 'Open Research Chat (Ctrl+Shift+B)' : 'Close Research Chat (Ctrl+Shift+B)';
      btnToggleStudio.setAttribute('aria-label', btnToggleStudio.title);
    }
  };

  const btnToggleStudio = document.getElementById('btn-toggle-studio');
  if (btnToggleStudio) {
    btnToggleStudio.onclick = () => toggleStudio();
  }

  const btnCloseStudio = document.getElementById('btn-close-studio');
  if (btnCloseStudio) {
    btnCloseStudio.onclick = () => toggleStudio(false);
  }

  const btnReopenStudio = document.getElementById('btn-reopen-studio');
  if (btnReopenStudio) {
    btnReopenStudio.onclick = () => toggleStudio(true);
  }

  // Global Keyboard Shortcut: Ctrl+Shift+B (Toggle Auxiliary Pane)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyB') {
      e.preventDefault();
      toggleStudio();
    }
  });`;

if (appJs.includes(oldAppToggleSnippet)) {
  appJs = appJs.replace(oldAppToggleSnippet, newAppToggleSnippet);
  fs.writeFileSync('NBLMimic/js/app.js', appJs, 'utf8');
  console.log('Updated app.js toggleStudio handlers');
} else {
  console.warn('Could not match oldAppToggleSnippet in app.js');
}

