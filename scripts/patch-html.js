const fs = require('fs');

function patchHtmlFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Replace #btn-toggle-studio
  const oldToggleStudioRegex = /<button class="btn btn-icon" id="btn-toggle-studio"[^>]*>[\s\S]*?<\/button>/;
  const newToggleStudio = `<button class="btn btn-icon" id="btn-toggle-studio" title="Toggle Auxiliary Pane (Ctrl+Shift+B)" aria-label="Toggle Auxiliary Pane (Ctrl+Shift+B)">
        <svg class="icon-aux-pane" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/>
          <line x1="10.5" y1="2" x2="10.5" y2="14" stroke="currentColor" stroke-width="1.3"/>
          <rect class="aux-pane-fill" x="11.2" y="2.7" width="2.6" height="10.6" rx="0.8" fill="currentColor"/>
        </svg>
      </button>`;

  if (oldToggleStudioRegex.test(html)) {
    html = html.replace(oldToggleStudioRegex, newToggleStudio);
    console.log(`[${filePath}] Updated btn-toggle-studio`);
  } else {
    console.warn(`[${filePath}] Could not find old btn-toggle-studio`);
  }

  // 2. Add floating liquid notes bubble into #pane-canvas
  const notesBubbleHtml = `
      <!-- Floating Liquid Glass Lab Notes Bubble (Aceternity UI Expandable Card trigger) -->
      <button class="liquid-notes-bubble" id="btn-notes-bubble" title="Lab Notes & Ideas (Ctrl+Shift+N)" aria-label="Lab Notes & Ideas">
        <div class="liquid-notes-bubble-sheen" aria-hidden="true"></div>
        <div class="liquid-notes-bubble-inner">
          <svg class="icon-pen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <span class="liquid-notes-bubble-badge" id="notes-bubble-badge" style="display:none;"></span>
      </button>
    </main>`;

  if (!html.includes('id="btn-notes-bubble"')) {
    html = html.replace(/\s*<\/main>/, notesBubbleHtml);
    console.log(`[${filePath}] Added btn-notes-bubble to #pane-canvas`);
  }

  // 3. Replace studio-tab-header with studio-chat-header
  const oldStudioHeaderRegex = /<div class="studio-tab-header">[\s\S]*?<\/div>\s*<span[^>]*id="composer-grounding-count">[^<]*<\/span>\s*<\/div>/;
  const newStudioHeader = `<div class="studio-chat-header">
        <div class="studio-chat-title-group">
          <div class="studio-chat-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
            </svg>
            <span class="studio-chat-heading">Research Chat</span>
          </div>
          <span style="font-size:11px; color:var(--text-tertiary); font-variant-numeric:tabular-nums;" id="composer-grounding-count">0 sources in context</span>
        </div>
        <button class="btn-icon" id="btn-close-studio" title="Close Research Chat (Ctrl+Shift+B)" aria-label="Close Research Chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>`;

  if (oldStudioHeaderRegex.test(html)) {
    html = html.replace(oldStudioHeaderRegex, newStudioHeader);
    console.log(`[${filePath}] Updated studio header`);
  } else {
    console.warn(`[${filePath}] Could not find old studio-tab-header`);
  }

  // 4. Remove studio-panel-notes if present
  const oldNotesPanelRegex = /<!-- 2\. Lab Notes Tab -->[\s\S]*?<div class="studio-tab-panel" id="studio-panel-notes">[\s\S]*?<\/div>\s*<\/div>\s*<\/aside>/;
  if (oldNotesPanelRegex.test(html)) {
    html = html.replace(oldNotesPanelRegex, '</div>\n    </aside>');
    console.log(`[${filePath}] Removed fixed studio-panel-notes`);
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

patchHtmlFile('NBLMimic/index.html');
if (fs.existsSync('index.html')) {
  patchHtmlFile('index.html');
}
