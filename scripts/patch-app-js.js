const fs = require('fs');

const filePath = 'NBLMimic/js/app.js';
let js = fs.readFileSync(filePath, 'utf8');

const oldToggleSnippet = `  // Toggle Right Studio Panel
  const btnToggleStudio = document.getElementById('btn-toggle-studio');
  if (btnToggleStudio) {
    btnToggleStudio.onclick = () => {
      shell.classList.toggle('sidepanel-collapsed');
    };
  }`;

const newToggleSnippet = `  // Toggle Right Studio Panel (Auxiliary Pane)
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

if (js.includes(oldToggleSnippet)) {
  js = js.replace(oldToggleSnippet, newToggleSnippet);
  console.log('Successfully updated toggleStudio in app.js');
} else {
  console.warn('Could not find oldToggleSnippet in app.js');
}

fs.writeFileSync(filePath, js, 'utf8');
