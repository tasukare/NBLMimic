/**
 * Research Lab (NBLMimic) — Lab Notes Subsystem
 * Scratchpad persistence, word count calculations, debounced Drive backup, and Markdown export.
 * Securely encrypted in local CryptoVault and synced with Drive.
 */

import { state } from './state.js';
import { CryptoVault } from './crypto-vault.js';
import { showToast } from './ui.js';
import { syncCurrentNotesToDrive } from './auth-drive.js';

let debounceTimer = null;

export async function initNotes() {
  const pad = document.getElementById('notes-scratchpad');
  if (!pad) return;

  try {
    let saved = await CryptoVault.getSecureItem('nbl_lab_notes');
    if (!saved) {
      saved = localStorage.getItem('nbl_lab_notes');
    }
    if (saved) {
      state.set('notesContent', saved, true);
      pad.value = saved;
      updateNotesWordCount();
    }
  } catch (err) {
    console.warn('[Notes] Vault read fallback:', err);
  }

  pad.addEventListener('input', () => {
    const val = pad.value;
    state.set('notesContent', val);
    localStorage.setItem('nbl_lab_notes', val);
    CryptoVault.setSecureItem('nbl_lab_notes', val).catch(() => {});
    updateNotesWordCount();

    if (state.get('isDriveConnected')) {
      const syncStatus = document.getElementById('notes-sync-status');
      if (syncStatus) syncStatus.textContent = 'Unsynced edits...';

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncCurrentNotesToDrive(true);
      }, 2500);
    }
  });

  const copyBtn = document.getElementById('btn-notes-copy');
  if (copyBtn) copyBtn.onclick = copyNotes;

  const exportBtn = document.getElementById('btn-notes-export');
  if (exportBtn) exportBtn.onclick = downloadNotes;

  const syncBtn = document.getElementById('btn-notes-sync-drive');
  if (syncBtn) syncBtn.onclick = () => syncCurrentNotesToDrive(false);
}

export function updateNotesWordCount() {
  const content = state.get('notesContent') || '';
  const count = content.trim().split(/\s+/).filter(Boolean).length;
  const countEl = document.getElementById('notes-word-count');
  if (countEl) {
    countEl.textContent = `${count} words`;
  }
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

// Window scope exposures for resilient click handlers and external calls
window.copyNotes = copyNotes;
window.downloadNotes = downloadNotes;
window.initNotes = initNotes;
