/**
 * Research Lab (NBLMimic) — Lab Notes Subsystem (Aceternity UI Expandable Card)
 * High-performance 60 FPS Web Animations API (WAAPI) shared-element FLIP morph.
 * Smoothly expands from and collapses back into the bottom-right pen bubble.
 */

import { state } from './state.js';
import { CryptoVault } from './crypto-vault.js';
import { showToast, escapeHtml } from './ui.js';
import { syncCurrentNotesToDrive } from './auth-drive.js';

let debounceTimer = null;
let activeNotesInstance = null;

export async function initNotes() {
  // 1. Restore notes from CryptoVault or sessionStorage (Zero plaintext notes in localStorage - Fixes VULN-20)
  try {
    let legacyNotes = null;
    try {
      legacyNotes = localStorage.getItem('nbl_lab_notes');
      if (legacyNotes) {
        localStorage.removeItem('nbl_lab_notes'); // Active scrub
      }
    } catch (e) {}

    let saved = await CryptoVault.getSecureItem('nbl_lab_notes');
    if (!saved) {
      saved = sessionStorage.getItem('nbl_lab_notes') || legacyNotes;
    }
    if (saved) {
      state.set('notesContent', saved, true);
      sessionStorage.setItem('nbl_lab_notes', saved);
      CryptoVault.setSecureItem('nbl_lab_notes', saved).catch(() => {});
      updateBubbleBadge(true);
    }
  } catch (err) {
    console.warn('[Notes] Vault read fallback:', err);
  }

  // 2. Bind floating liquid notes bubble
  const btnBubble = document.getElementById('btn-notes-bubble');
  if (btnBubble) {
    btnBubble.onclick = (e) => {
      e.stopPropagation();
      toggleNotesCard(btnBubble);
    };
  }

  // 3. Global Keyboard Shortcut: Ctrl+Shift+N or Alt+N to open notes
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.code === 'KeyN') || (e.altKey && e.code === 'KeyN')) {
      e.preventDefault();
      const origin = document.getElementById('btn-notes-bubble') || document.body;
      toggleNotesCard(origin);
    }
  });
}

export function updateBubbleBadge(hasContent) {
  const badge = document.getElementById('notes-bubble-badge');
  if (badge) {
    const text = state.get('notesContent') || '';
    badge.style.display = (hasContent && text.trim().length > 0) ? 'block' : 'none';
  }
}

export function toggleNotesCard(originEl) {
  if (activeNotesInstance && typeof activeNotesInstance.closeNotes === 'function') {
    activeNotesInstance.closeNotes();
  } else {
    openNotesCard(originEl);
  }
}

/**
 * Opens the Aceternity UI Expandable Notes Card via Web Animations API (WAAPI)
 * Sibling-layered architecture ensures backdrop opacity doesn't hide the closing morph.
 */
export function openNotesCard(originEl) {
  if (activeNotesInstance) return;

  const triggerEl = originEl || document.getElementById('btn-notes-bubble') || document.body;
  const initialContent = state.get('notesContent') || '';
  const isDrive = state.get('isDriveConnected');

  // Prevent background scrolling
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  // 1. Build Overlay Backdrop (z-index 900)
  const overlay = document.createElement('div');
  overlay.className = 'notes-expandable-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Lab Notes & Hypotheses');

  // 2. Build Card as SIBLING (z-index 910)
  const card = document.createElement('div');
  card.className = 'notes-expandable-card';

  // 3. Banner
  const banner = document.createElement('div');
  banner.className = 'notes-expandable-banner';
  banner.innerHTML = `
    <div class="notes-expandable-banner-sheen" aria-hidden="true"></div>
    <div class="notes-expandable-top-row">
      <div class="notes-expandable-badges">
        <span class="notes-expandable-pill">Lab Notes & Synthesis</span>
        ${isDrive ? `
          <span class="notes-expandable-pill" style="color:#10b981; border-color:rgba(16, 185, 129, 0.4);">
            <svg width="10" height="10" viewBox="0 0 87.3 78"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/><path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z"/></svg>
            Drive Active
          </span>
        ` : ''}
      </div>
      <button class="notes-expandable-close" id="btn-notes-close" title="Close Notes (Esc)" aria-label="Close notes">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="notes-expandable-heading-row">
      <h2 class="notes-expandable-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span>Research Scratchpad & Ideas</span>
      </h2>
      <span style="font-size:11px; opacity:0.8; font-family:var(--font-mono); color:var(--text-secondary);">Encrypted Vault</span>
    </div>
  `;

  // 4. Formatting Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'notes-expandable-toolbar';
  toolbar.innerHTML = `
    <div class="notes-toolbar-group">
      <button type="button" class="notes-tool-btn btn-bold" data-action="bold" title="Bold (**text**)">B</button>
      <button type="button" class="notes-tool-btn btn-italic" data-action="italic" title="Italic (*text*)">I</button>
      <button type="button" class="notes-tool-btn" data-action="h2" title="Heading (## Title)">H2</button>
      <button type="button" class="notes-tool-btn" data-action="list" title="Bullet List (- Item)">&bull; List</button>
      <button type="button" class="notes-tool-btn" data-action="code" title="Code Block (\`\`\`)">&lt;/&gt;</button>
      <button type="button" class="notes-tool-btn" data-action="time" title="Insert Timestamp">Timestamp</button>
    </div>
    <div class="notes-toolbar-group">
      <span style="font-size:11px; color:var(--text-tertiary);">Markdown Enabled</span>
    </div>
  `;

  // 5. Body & Textarea
  const body = document.createElement('div');
  body.className = 'notes-expandable-body';

  const textarea = document.createElement('textarea');
  textarea.className = 'notes-expandable-textarea';
  textarea.placeholder = "Write your experimental thoughts, research hypotheses, or grounded synthesis here...\n\n- Quick notes are automatically encrypted in your local browser vault\n- Press Esc or click outside to minimize back to the liquid bubble";
  textarea.value = initialContent;
  textarea.spellcheck = false;
  body.appendChild(textarea);

  // 6. Footer Actions Bar
  const footer = document.createElement('div');
  footer.className = 'notes-expandable-footer';
  footer.innerHTML = `
    <div class="notes-footer-meta">
      <span id="notes-modal-word-count">0 words</span>
      <span>&middot;</span>
      <span id="notes-modal-sync-status">${isDrive ? 'Synced with Drive' : 'Saved to Local Vault'}</span>
    </div>
    <div class="notes-footer-actions">
      <button type="button" class="btn btn-secondary btn-sm" id="btn-notes-modal-copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>Copy</span>
      </button>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-notes-modal-export">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>Export .md</span>
      </button>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-notes-modal-drive">
        <svg width="12" height="12" viewBox="0 0 87.3 78"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/><path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z"/></svg>
        <span>${isDrive ? 'Sync Drive' : 'Drive Backup'}</span>
      </button>
      <button type="button" class="btn btn-primary btn-sm" id="btn-notes-modal-done">Done</button>
    </div>
  `;

  card.appendChild(banner);
  card.appendChild(toolbar);
  card.appendChild(body);
  card.appendChild(footer);

  // Mount card inside full-screen flex overlay directly to document.body
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  card.addEventListener('click', (e) => { e.stopPropagation(); });
  overlay.addEventListener('click', () => { closeNotes(); });

  // 7. Measure Coordinates for FLIP Shared-Element Expansion
  const originRect = triggerEl.getBoundingClientRect();
  const targetRect = card.getBoundingClientRect();

  const scaleX = originRect.width / targetRect.width;
  const scaleY = originRect.height / targetRect.height;
  const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
  const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);

  // 8. Aceternity Expandable Card FLIP Shared-Element Morph from Pen Bubble
  if (originRect && originRect.width > 0 && targetRect.width > 0) {
    const scaleX = Math.max(0.08, originRect.width / targetRect.width);
    const scaleY = Math.max(0.08, originRect.height / targetRect.height);
    const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
    const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);

    card.style.willChange = 'transform, opacity, border-radius';
    const openAnim = card.animate([
      {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        opacity: 0.6,
        borderRadius: '28px'
      },
      {
        transform: 'translate3d(0, 0, 0) scale(1, 1)',
        opacity: 1,
        borderRadius: '20px'
      }
    ], {
      duration: 280,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });

    overlay.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], {
      duration: 250,
      easing: 'ease-out'
    });

    openAnim.onfinish = () => {
      card.style.willChange = 'auto';
      card.style.transform = '';
      textarea.focus();
    };
  } else {
    card.style.willChange = 'transform, opacity';
    const openAnim = card.animate([
      { opacity: 0, transform: 'scale(0.95) translateY(10px)' },
      { opacity: 1, transform: 'scale(1) translateY(0px)' }
    ], {
      duration: 200,
      easing: 'cubic-bezier(0, 0, 0.2, 1)'
    });
    openAnim.onfinish = () => {
      card.style.willChange = 'auto';
      textarea.focus();
    };
  }

  // 9. Word Count Update Helper
  const countEl = card.querySelector('#notes-modal-word-count');
  const syncStatusEl = card.querySelector('#notes-modal-sync-status');
  const updateModalWordCount = () => {
    const text = textarea.value;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (countEl) countEl.textContent = `${words} words`;
    updateBubbleBadge(words > 0);
  };
  updateModalWordCount();

  // 10. Input & Auto-Save
  textarea.addEventListener('input', () => {
    const val = textarea.value;
    state.set('notesContent', val);
    sessionStorage.setItem('nbl_lab_notes', val);
    CryptoVault.setSecureItem('nbl_lab_notes', val).catch(() => {});
    updateModalWordCount();

    if (state.get('isDriveConnected')) {
      if (syncStatusEl) syncStatusEl.textContent = 'Unsynced edits...';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncCurrentNotesToDrive(true);
        if (syncStatusEl) syncStatusEl.textContent = 'Synced with Drive';
      }, 2500);
    } else {
      if (syncStatusEl) syncStatusEl.textContent = 'Saved to Local Vault';
    }
  });

  // 11. Markdown Toolbar Insertion Helper
  const applyMarkdownFormat = (action) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);

    let replacement = '';
    let newCursorPos = start;

    switch (action) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        newCursorPos = selected ? end + 4 : start + 2;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        newCursorPos = selected ? end + 2 : start + 1;
        break;
      case 'h2':
        replacement = `\n## ${selected || 'Section Title'}\n`;
        newCursorPos = start + replacement.length;
        break;
      case 'list':
        replacement = selected ? selected.split('\n').map(l => `- ${l}`).join('\n') : '\n- Item 1\n- Item 2\n';
        newCursorPos = start + replacement.length;
        break;
      case 'code':
        replacement = `\n\`\`\`\n${selected || '// code snippet'}\n\`\`\`\n`;
        newCursorPos = start + replacement.length;
        break;
      case 'time':
        const now = new Date().toLocaleString();
        replacement = `**[${now}]** `;
        newCursorPos = start + replacement.length;
        break;
    }

    textarea.value = val.substring(0, start) + replacement + val.substring(end);
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.dispatchEvent(new Event('input'));
  };

  toolbar.querySelectorAll('.notes-tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      applyMarkdownFormat(btn.dataset.action);
    });
  });

  // 12. Modal Dismissal (Aceternity Expandable Card Collapse back to Trigger)
  let isClosing = false;
  const closeNotes = () => {
    if (isClosing) return;
    isClosing = true;

    window.removeEventListener('keydown', onKeyDown);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      activeNotesInstance = null;
      if (triggerEl) triggerEl.focus();
    };

    const curOrigin = triggerEl ? triggerEl.getBoundingClientRect() : originRect;
    const curTarget = card.getBoundingClientRect();

    if (curOrigin && curOrigin.width > 0 && curTarget.width > 0) {
      const closeScaleX = Math.max(0.08, curOrigin.width / curTarget.width);
      const closeScaleY = Math.max(0.08, curOrigin.height / curTarget.height);
      const closeDeltaX = (curOrigin.left + curOrigin.width / 2) - (curTarget.left + curTarget.width / 2);
      const closeDeltaY = (curOrigin.top + curOrigin.height / 2) - (curTarget.top + curTarget.height / 2);

      card.style.willChange = 'transform, opacity, border-radius';
      const closeAnim = card.animate([
        {
          transform: 'translate3d(0, 0, 0) scale(1, 1)',
          opacity: 1,
          borderRadius: '20px'
        },
        {
          transform: `translate3d(${closeDeltaX}px, ${closeDeltaY}px, 0) scale(${closeScaleX}, ${closeScaleY})`,
          opacity: 0,
          borderRadius: '28px'
        }
      ], {
        duration: 240,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });

      overlay.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 220,
        easing: 'ease-out'
      });

      closeAnim.onfinish = cleanup;
      setTimeout(cleanup, 280);
    } else {
      overlay.classList.add('is-closing');
      card.classList.add('is-closing');
      card.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, 220);
    }
  };

  activeNotesInstance = { overlay, card, closeNotes };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeNotes();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  card.querySelector('#btn-notes-close')?.addEventListener('click', closeNotes);
  card.querySelector('#btn-notes-modal-done')?.addEventListener('click', closeNotes);

  overlay.addEventListener('click', (e) => {
    closeNotes();
  });

  // Action Buttons
  card.querySelector('#btn-notes-modal-copy')?.addEventListener('click', () => {
    copyNotes();
  });

  card.querySelector('#btn-notes-modal-export')?.addEventListener('click', () => {
    downloadNotes();
  });

  card.querySelector('#btn-notes-modal-drive')?.addEventListener('click', () => {
    syncCurrentNotesToDrive(false);
  });
}

export function copyNotes() {
  const content = state.get('notesContent') || '';
  navigator.clipboard.writeText(content);
  showToast('Notes copied to clipboard');
}

export function downloadNotes() {
  const content = state.get('notesContent') || '';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lab_Notes_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported notes as Markdown file');
}

// Window scope exposures
window.copyNotes = copyNotes;
window.downloadNotes = downloadNotes;
window.initNotes = initNotes;
window.openNotesCard = openNotesCard;
window.toggleNotesCard = toggleNotesCard;
