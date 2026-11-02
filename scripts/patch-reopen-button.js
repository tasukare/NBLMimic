const fs = require('fs');

function patch(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  const reopenButtonHtml = `    </aside>

    <!-- Floating Right Edge Tab to Reopen Research Chat when closed -->
    <button class="btn-dock-open-chat" id="btn-reopen-studio" title="Open Research Chat (Ctrl+Shift+B)" aria-label="Open Research Chat">
      <div class="dock-chat-pill-inner">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
        </svg>
        <span>Research Chat</span>
        <kbd class="dock-chat-kbd">Ctrl+Shift+B</kbd>
      </div>
    </button>`;

  if (!html.includes('id="btn-reopen-studio"')) {
    html = html.replace(/\s*<\/aside>/, reopenButtonHtml);
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`[${filePath}] Added btn-reopen-studio`);
  } else {
    console.log(`[${filePath}] Already has btn-reopen-studio`);
  }
}

patch('NBLMimic/index.html');
if (fs.existsSync('index.html')) patch('index.html');
