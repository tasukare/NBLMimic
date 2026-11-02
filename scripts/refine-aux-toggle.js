const fs = require('fs');

// Update app.js
let appJs = fs.readFileSync('NBLMimic/js/app.js', 'utf8');

// Update restore state
appJs = appJs.replace(
  /if \(savedPanelState === 'collapsed'\) \{[\s\S]*?\} else \{[\s\S]*?btnToggleStudio\.setAttribute\('aria-label', 'Close Auxiliary Pane \(Ctrl\+Shift\+B\)'\);\s*\}\s*\}/,
  `if (savedPanelState === 'collapsed') {
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
  }`
);

// Update toggleStudio when expanding
appJs = appJs.replace(
  /shell\.classList\.remove\('sidepanel-collapsed'\);[\s\S]*?localStorage\.setItem\('nbl_chat_panel_state', 'open'\);[\s\S]*?if \(btnToggleStudio\) \{[\s\S]*?btnToggleStudio\.setAttribute\('aria-label', 'Close Auxiliary Pane \(Ctrl\+Shift\+B\)'\);\s*\}/,
  `shell.classList.remove('sidepanel-collapsed');
      localStorage.setItem('nbl_chat_panel_state', 'open');

      if (btnToggleStudio) {
        btnToggleStudio.classList.remove('is-collapsed');
        btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
        btnToggleStudio.setAttribute('aria-label', 'Close Auxiliary Pane (Ctrl+Shift+B)');
      }`
);

// Update toggleStudio when closing
appJs = appJs.replace(
  /if \(btnToggleStudio\) \{\s*btnToggleStudio\.title = 'Toggle Auxiliary Pane \(Ctrl\+Shift\+B\)';\s*btnToggleStudio\.setAttribute\('aria-label', 'Open Auxiliary Pane \(Ctrl\+Shift\+B\)'\);\s*\}/g,
  `if (btnToggleStudio) {
            btnToggleStudio.classList.add('is-collapsed');
            btnToggleStudio.title = 'Toggle Auxiliary Pane (Ctrl+Shift+B)';
            btnToggleStudio.setAttribute('aria-label', 'Open Auxiliary Pane (Ctrl+Shift+B)');
          }`
);

// Update shortcut
appJs = appJs.replace(
  /if \(e\.ctrlKey && e\.shiftKey && e\.code === 'KeyB'\)/,
  `if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.code === 'KeyB' || e.key === 'B' || e.key === 'b'))`
);

fs.writeFileSync('NBLMimic/js/app.js', appJs, 'utf8');

// Update layout.css
let layoutCss = fs.readFileSync('NBLMimic/css/layout.css', 'utf8');
layoutCss = layoutCss.replace(
  /\.sidepanel-collapsed \.icon-aux-pane \.aux-pane-fill\s*\{[\s\S]*?\}/,
  `.sidepanel-collapsed .icon-aux-pane .aux-pane-fill,
#btn-toggle-studio.is-collapsed .icon-aux-pane .aux-pane-fill {
  opacity: 0 !important;
}`
);
fs.writeFileSync('NBLMimic/css/layout.css', layoutCss, 'utf8');

// Sync root index.html
fs.copyFileSync('NBLMimic/index.html', 'index.html');

console.log('App.js and Layout.css refined successfully.');
