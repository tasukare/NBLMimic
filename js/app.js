/**
 * Research Lab (NBLMimic) — Main Entry Point (ES6 Module)
 * Orchestrates reactive state, UI bindings, keyboard shortcuts, resizable splitters, and subsystem lifecycle.
 */

import { state } from './state.js';
import { initTheme, toggleTheme, openModal, closeModal, closeAllModals, togglePopover, closePopover, showToast } from './ui.js';
import { CryptoVault } from './crypto-vault.js';
import { initUserSession, initDriveSession, fetchServerAuthConfig, fetchServerDriveConfig, loadGoogleDriveFiles, signOutUser, loginDemoAccount, handleDirectAuthSubmit, connectGoogleDrive, saveDriveWebAppUrl, getTokenTimeRemainingSec, revokeTokenAndDisconnect } from './auth-drive.js';
import { renderSources, updateCanvasView, viewDocument, loadDefaultWorkspaceSources, fetchWorldNews, navigateBackToFolders, switchCanvasMode } from './sources-reader.js';
import { saveCustomFolder } from './glass-folder-cards.js';
import { initChat, sendQuickPrompt, clearChatStream, generateAudioOverview } from './chat.js';
import { initLiveVoice } from './live-voice.js';
import { initNotes } from './notes.js';
import { startupScreen } from './startup-screen.js';
import { initLiquidGlass } from './liquid-glass.js';
import { initBackgroundBeams } from './background-beams.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 0. Launch Liquid Glass Startup Screen immediately
  startupScreen.init(async () => {
    // Retry connection callback
    startupScreen.hideErrorActions();
    startupScreen.setStatus('Retrying backend health check...', 'loading');
    const retryHealth = await runStartupVerification();
    if (retryHealth.ok) {
      const msg = retryHealth.hasServerKey
        ? `Backend reconnected · Key pool active (${retryHealth.keyPoolSize || 1} keys)`
        : 'Backend reconnected · Ready for client key';
      await startupScreen.markReadyAndDismiss(msg);
    } else {
      startupScreen.showErrorActions(`Retry failed: ${retryHealth.error || 'Server still offline'}`);
    }
  });

  startupScreen.setStatus('Initializing cryptographic vault & UI tokens...', 'loading');

  // 1. Initialize UI Foundations
  initTheme();
  initLiquidGlass();
  initBackgroundBeams();
  initSplitters();
  initGlobalShortcuts();

  // 2. Initialize Subsystems
  startupScreen.setStatus('Restoring user session & encrypted storage...', 'loading');
  await initUserSession();
  await initDriveSession();
  await initNotes();
  initChat();
  initLiveVoice();

  // 3. Connect Server Configurations & Run Verification
  startupScreen.setStatus('Verifying Gemini API key pool & server health...', 'loading');
  fetchServerAuthConfig();
  fetchServerDriveConfig();
  const health = await runStartupVerification();

  // 4. Initial Render
  bindGlobalEvents();

  if (state.get('isDriveConnected')) {
    startupScreen.setStatus('Loading connected Google Drive files...', 'loading');
    await loadGoogleDriveFiles();
  } else {
    loadDefaultWorkspaceSources();
  }

  // Default to main Folders view on startup
  state.set('viewMode', 'folders');
  state.set('selectedDocId', null);
  try {
    sessionStorage.removeItem('nbl_selected_doc_id');
  } catch (e) {}

  document.querySelectorAll('.canvas-mode-btn').forEach(b => {
    if (b.getAttribute('data-mode') === 'folders') {
      b.classList.add('is-active');
    } else {
      b.classList.remove('is-active');
    }
  });

  renderSources();
  updateCanvasView();

  // Subscribe state changes to re-render
  state.subscribe('sources', () => {
    renderSources();
    updateCanvasView();
  });
  state.subscribe('filterCategory', () => renderSources());
  state.subscribe('filterTag', () => renderSources());
  state.subscribe('searchQuery', () => renderSources());
  state.subscribe('viewMode', () => updateCanvasView());

  // 5. Complete Startup Check & Transition
  if (health.ok) {
    const msg = health.hasServerKey
      ? `Backend online · Gemini key pool active (${health.keyPoolSize || 1} keys)`
      : 'Backend online · Ready for client BYOK key';
    await startupScreen.markReadyAndDismiss(msg);
  } else {
    // Backend health check failed
    startupScreen.showErrorActions(`Backend issue: ${health.error || 'Server offline'}`);
  }
});

// ── Health Check & BYOK Security ──
async function runStartupVerification() {
  // Purge any legacy persistent localStorage keys for strict zero-disk credential persistence
  try {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('nbl_gemini_api_key');
  } catch (e) {}

  // Check sessionStorage if the user opted in
  try {
    const sessionKey = sessionStorage.getItem('nbl_session_gemini_key');
    if (sessionKey) {
      state.set('geminiApiKey', sessionKey);
      const rememberCheck = document.getElementById('setting-remember-session');
      if (rememberCheck) rememberCheck.checked = true;
      const keyInput = document.getElementById('setting-gemini-key');
      if (keyInput) keyInput.value = sessionKey;
    }
  } catch (e) {}

  let result = { ok: false, error: 'Connection failed' };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      state.set('hasServerKey', Boolean(data.hasServerKey));
      result = {
        ok: true,
        hasServerKey: Boolean(data.hasServerKey),
        keyPoolSize: data.keyPoolSize || 0,
        activeKeySlot: data.activeKeySlot || 1,
        defaultModel: data.defaultModel || 'gemini-3.5-flash-lite'
      };
    } else {
      state.set('hasServerKey', false);
      result = { ok: false, error: `HTTP ${res.status}` };
    }
  } catch (err) {
    state.set('hasServerKey', false);
    result = { ok: false, error: err.name === 'AbortError' ? 'Connection timed out' : 'Server unreachable' };
  }

  updateSettingsUI();
  return result;
}

async function checkHealth() {
  return await runStartupVerification();
}

let settingsTelemetryTimer = null;

async function refreshKeyTelemetry() {
  const poolEl = document.getElementById('setting-server-pool-status');
  const tokenEl = document.getElementById('setting-oauth-token-status');
  const vaultEl = document.getElementById('setting-vault-health-status');
  const revokeBtn = document.getElementById('btn-setting-revoke-token');

  // 1. Vault Health Telemetry
  try {
    const health = await CryptoVault.getVaultHealth();
    if (vaultEl) {
      vaultEl.textContent = `Vault: AES-GCM · ${health.storedKeys} items (${health.ttlItems} TTL-wrapped)`;
    }
  } catch (e) {
    if (vaultEl) vaultEl.textContent = 'Vault: AES-GCM (Session Salt)';
  }

  // 2. Server Key Pool Status
  try {
    const res = await fetch('/api/keys/status');
    if (res.ok) {
      const data = await res.json();
      if (poolEl) {
        if (!data.hasServerKeys || data.poolSize === 0) {
          poolEl.textContent = '0 Server Keys (BYOK)';
          poolEl.style.color = 'var(--text-tertiary)';
        } else {
          const cooldownCount = data.keys?.filter(k => k.cooldownRemainingSec > 0).length || 0;
          if (cooldownCount > 0) {
            poolEl.textContent = `Slot #${data.activeSlot} (${cooldownCount} Cooling)`;
            poolEl.style.color = 'var(--warning)';
          } else {
            poolEl.textContent = `Pool: ${data.poolSize} Active · Slot #${data.activeSlot}`;
            poolEl.style.color = 'var(--success)';
          }
        }
      }
    }
  } catch (err) {
    if (poolEl) {
      poolEl.textContent = 'Status Offline';
      poolEl.style.color = 'var(--text-tertiary)';
    }
  }

  // 3. OAuth2 Token TTL Countdown
  const isConn = state.get('isDriveConnected');
  const token = state.get('driveToken');
  if (isConn && token) {
    const remSec = getTokenTimeRemainingSec();
    if (tokenEl) {
      if (remSec <= 0) {
        tokenEl.textContent = 'Expired (Renewing...)';
        tokenEl.style.color = 'var(--warning)';
      } else {
        const mm = Math.floor(remSec / 60);
        const ss = String(remSec % 60).padStart(2, '0');
        tokenEl.textContent = `${mm}m ${ss}s remaining`;
        tokenEl.style.color = remSec < 300 ? 'var(--warning)' : 'var(--success)';
      }
    }
    if (revokeBtn) revokeBtn.style.display = 'inline-flex';
  } else {
    if (tokenEl) {
      tokenEl.textContent = 'Disconnected';
      tokenEl.style.color = 'var(--text-tertiary)';
    }
    if (revokeBtn) revokeBtn.style.display = 'none';
  }
}

function startSettingsTelemetryWatch() {
  stopSettingsTelemetryWatch();
  refreshKeyTelemetry();
  settingsTelemetryTimer = setInterval(() => {
    const modal = document.getElementById('settings-modal');
    if (modal && modal.classList.contains('is-active')) {
      refreshKeyTelemetry();
    } else {
      stopSettingsTelemetryWatch();
    }
  }, 1000);
}

function stopSettingsTelemetryWatch() {
  if (settingsTelemetryTimer) {
    clearInterval(settingsTelemetryTimer);
    settingsTelemetryTimer = null;
  }
}

function updateSettingsUI() {
  const badgeEl = document.getElementById('setting-key-badge');
  const statusEl = document.getElementById('setting-key-status');
  const input = document.getElementById('setting-gemini-key');
  const clearBtn = document.getElementById('btn-clear-api-key');

  const apiKey = state.get('geminiApiKey');
  const hasServerKey = state.get('hasServerKey');

  if (apiKey) {
    if (input && !input.value) input.value = apiKey;
    if (clearBtn) clearBtn.style.display = 'inline-flex';
    if (badgeEl) {
      badgeEl.textContent = 'BYOK Active';
      badgeEl.style.background = 'var(--bg-muted)';
      badgeEl.style.color = 'var(--text-primary)';
    }
    if (statusEl) {
      statusEl.textContent = 'Active ephemeral in-memory key (purged when tab closes).';
      statusEl.style.color = 'var(--text-secondary)';
    }
  } else if (hasServerKey) {
    if (input && !input.value) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (badgeEl) {
      badgeEl.textContent = 'Server .env';
      badgeEl.style.background = 'var(--success-subtle)';
      badgeEl.style.color = 'var(--success)';
    }
    if (statusEl) {
      statusEl.textContent = 'Default server credentials active (.env). Custom key will override.';
      statusEl.style.color = 'var(--success)';
    }
  } else {
    if (clearBtn) clearBtn.style.display = 'none';
    if (badgeEl) {
      badgeEl.textContent = 'Key Required';
      badgeEl.style.background = 'var(--warning-subtle)';
      badgeEl.style.color = 'var(--warning)';
    }
    if (statusEl) {
      statusEl.textContent = 'No API key configured. Enter your Gemini key to enable AI features.';
      statusEl.style.color = 'var(--warning)';
    }
  }

  refreshKeyTelemetry();
}

// ── Global Event Bindings ──
function bindGlobalEvents() {
  const shell = document.getElementById('app-shell');

  // Toggle Left Sidebar
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  if (btnToggleSidebar) {
    btnToggleSidebar.onclick = () => {
      shell.classList.toggle('sidebar-collapsed');
    };
  }

  // Toggle Right Studio Panel
  const btnToggleStudio = document.getElementById('btn-toggle-studio');
  if (btnToggleStudio) {
    btnToggleStudio.onclick = () => {
      shell.classList.toggle('sidepanel-collapsed');
    };
  }

  // Theme Switcher
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) btnTheme.onclick = toggleTheme;

  // Header Avatar / Popover
  const btnAvatar = document.getElementById('btn-header-avatar');
  if (btnAvatar) btnAvatar.onclick = (e) => {
    e.stopPropagation();
    togglePopover();
  };

  // Header Live World News (72h) Button
  const btnHeaderLiveNews = document.getElementById('btn-header-live-news');
  if (btnHeaderLiveNews) {
    btnHeaderLiveNews.onclick = () => {
      const currentMode = state.get('viewMode');
      if (currentMode === 'news') {
        switchCanvasMode('folders');
      } else {
        switchCanvasMode('news');
      }
    };
  }

  // Header Sign-in Button (Direct 1-Click Connect)
  const btnHeaderSignin = document.getElementById('btn-header-signin');
  if (btnHeaderSignin) btnHeaderSignin.onclick = () => connectGoogleDrive();

  // Header Dedicated Drive Connect Button
  const btnHeaderDrive = document.getElementById('btn-header-connect-drive');
  if (btnHeaderDrive) {
    btnHeaderDrive.onclick = () => {
      if (!state.get('isDriveConnected')) {
        connectGoogleDrive();
      } else {
        openModal('drive-modal');
      }
    };
  }

  // Canvas Top Bar "New Folder" Button
  const btnCanvasNewFolder = document.getElementById('btn-canvas-new-folder');
  if (btnCanvasNewFolder) {
    btnCanvasNewFolder.onclick = () => openModal('add-folder-modal');
  }

  // Create New Folder Form Submission
  const formCreateFolder = document.getElementById('form-create-folder');
  if (formCreateFolder) {
    // Theme options click
    const themeOptions = formCreateFolder.querySelectorAll('.theme-option');
    themeOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        themeOptions.forEach(o => o.classList.remove('is-active'));
        opt.classList.add('is-active');
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Tone options click
    let selectedTone = 'light';
    const toneBtns = formCreateFolder.querySelectorAll('#folder-tone-picker .segmented-segment');
    toneBtns.forEach(tb => {
      tb.addEventListener('click', () => {
        toneBtns.forEach(b => b.classList.remove('is-active'));
        tb.classList.add('is-active');
        selectedTone = tb.getAttribute('data-tone') || 'light';
      });
    });

    formCreateFolder.onsubmit = (e) => {
      e.preventDefault();
      const labelInput = document.getElementById('input-folder-label');
      const label = labelInput ? labelInput.value.trim() : '';
      if (!label) return;

      const checkedTheme = formCreateFolder.querySelector('input[name="folder-theme"]:checked');
      const art = checkedTheme ? checkedTheme.value : 'aurora';

      saveCustomFolder({
        id: 'f-' + Date.now(),
        label: label,
        tone: selectedTone,
        art: art,
        seed: Math.floor(Math.random() * 50) + 1,
        files: [
          {
            id: `doc-${Date.now()}-1`,
            title: `${label} Overview Brief`,
            source: "Research Lab · Custom",
            category: "Docs",
            topic: "ai",
            sizeFormatted: "2.1 KB",
            date: "Today",
            excerpt: `Initial synthesis notes, hypotheses, and working document archive for ${label}.`
          }
        ]
      });

      closeModal('add-folder-modal');
      if (labelInput) labelInput.value = '';
      updateCanvasView();
      showToast(`Created folder "${label}"`);
    };
  }

  // Header Settings Button
  const btnHeaderSettings = document.getElementById('btn-header-settings');
  if (btnHeaderSettings) btnHeaderSettings.onclick = () => {
    updateSettingsUI();
    openModal('settings-modal');
    startSettingsTelemetryWatch();
  };

  // Header Add Source Button
  const btnHeaderAdd = document.getElementById('btn-header-add-source');
  if (btnHeaderAdd) btnHeaderAdd.onclick = () => openModal('add-source-modal');

  // Sidebar Add Source Button
  const btnSidebarAdd = document.getElementById('btn-sidebar-add-source');
  if (btnSidebarAdd) btnSidebarAdd.onclick = () => openModal('add-source-modal');

  // Sidebar Refresh Button
  const btnRefreshSources = document.getElementById('btn-refresh-sources');
  if (btnRefreshSources) {
    btnRefreshSources.onclick = () => {
      if (state.get('isDriveConnected')) {
        loadGoogleDriveFiles(true);
      } else {
        loadDefaultWorkspaceSources();
        showToast('Reset to default research library');
      }
    };
  }

  // Spotlight Trigger Click
  const spotlightTrigger = document.getElementById('spotlight-search-trigger');
  if (spotlightTrigger) {
    spotlightTrigger.onclick = () => {
      const searchInput = document.getElementById('global-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    };
  }

  // Sidebar Storage Footer Click -> 1-Click Connect if disconnected, or open Drive Modal
  const sidebarStorageFooter = document.getElementById('sidebar-storage-footer');
  if (sidebarStorageFooter) {
    sidebarStorageFooter.onclick = () => {
      if (!state.get('isDriveConnected')) {
        connectGoogleDrive();
      } else {
        openModal('drive-modal');
      }
    };
  }

  // Popover Menu Actions
  const btnPopoverDrive = document.getElementById('btn-popover-drive');
  if (btnPopoverDrive) btnPopoverDrive.onclick = () => {
    closePopover();
    openModal('drive-modal');
  };

  const btnPopoverSwitch = document.getElementById('btn-popover-switch-account');
  if (btnPopoverSwitch) btnPopoverSwitch.onclick = () => {
    closePopover();
    openModal('auth-modal');
  };

  const btnPopoverSignout = document.getElementById('btn-popover-signout');
  if (btnPopoverSignout) btnPopoverSignout.onclick = () => {
    closePopover();
    signOutUser();
  };

  // Close modals on close button, cancel button, or back button via event delegation
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const modalId = closeBtn.getAttribute('data-close-modal');
      if (modalId) {
        closeModal(modalId);
        if (modalId === 'settings-modal') stopSettingsTelemetryWatch();
      }
      return;
    }

    // Clicking outside modal content card on the backdrop closes the modal
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
      closeModal(e.target.id);
      if (e.target.id === 'settings-modal') stopSettingsTelemetryWatch();
    }
  });

  // Global Escape key closes all modals and popovers
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
      stopSettingsTelemetryWatch();
    }
  });

  // Global Back to Folders Navigation
  const btnCanvasBack = document.getElementById('btn-canvas-back-folders');
  if (btnCanvasBack) {
    btnCanvasBack.onclick = (e) => {
      e.preventDefault();
      navigateBackToFolders();
    };
  }

  const btnBreadcrumbHome = document.getElementById('btn-breadcrumb-home');
  if (btnBreadcrumbHome) {
    btnBreadcrumbHome.onclick = (e) => {
      e.preventDefault();
      navigateBackToFolders();
    };
  }

  const btnBreadcrumbView = document.getElementById('btn-breadcrumb-view');
  if (btnBreadcrumbView) {
    btnBreadcrumbView.onclick = (e) => {
      e.preventDefault();
      navigateBackToFolders();
    };
  }

  // Delegated click for dynamic back buttons (Reader, News, etc.)
  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-reader-back-to-folders') || e.target.closest('#btn-news-back-to-folders')) {
      e.preventDefault();
      navigateBackToFolders();
    }
  });

  // Browser back / forward button support
  window.addEventListener('popstate', () => {
    navigateBackToFolders();
  });

  // Spotlight Search Input
  const globalSearchInput = document.getElementById('global-search-input');
  if (globalSearchInput) {
    globalSearchInput.oninput = (e) => {
      state.set('searchQuery', e.target.value.trim());
    };
  }

  // Sidebar Segmented Filter: All, Drive, Docs, PDFs, Notes
  document.querySelectorAll('.sidebar-filter-bar .segmented-segment').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.sidebar-filter-bar .segmented-segment').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const cat = btn.getAttribute('data-filter') || 'all';
      state.set('filterCategory', cat);
    };
  });

  // Tag Dropdown Filter
  const tagDropdown = document.getElementById('select-topic-filter');
  if (tagDropdown) {
    tagDropdown.onchange = (e) => {
      state.set('filterTag', e.target.value);
    };
  }

  // Canvas Mode Switcher: Folders vs Reader vs Split vs Preview vs News
  document.querySelectorAll('.canvas-mode-btn').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.getAttribute('data-mode') || 'folders';
      if (mode === 'folders' && state.get('viewMode') !== 'folders') {
        navigateBackToFolders(true);
      } else {
        switchCanvasMode(mode);
      }
    };
  });

  // Copy Document Text Button
  const btnCopyDoc = document.getElementById('btn-copy-doc-text');
  if (btnCopyDoc) {
    btnCopyDoc.onclick = () => {
      const selectedId = state.get('selectedDocId');
      const sources = state.get('sources');
      const doc = sources.find(s => s.id === selectedId);
      if (doc?.content) {
        navigator.clipboard.writeText(doc.content);
        showToast('Document text copied to clipboard');
      }
    };
  }

  // Studio Tab Switching: Research Chat vs Lab Notes
  const tabBtnChat = document.getElementById('studio-tab-chat');
  const tabBtnNotes = document.getElementById('studio-tab-notes');
  const panelChat = document.getElementById('studio-panel-chat');
  const panelNotes = document.getElementById('studio-panel-notes');

  if (tabBtnChat && tabBtnNotes) {
    tabBtnChat.onclick = () => {
      tabBtnChat.classList.add('is-active');
      tabBtnNotes.classList.remove('is-active');
      if (panelChat) panelChat.classList.add('is-active');
      if (panelNotes) panelNotes.classList.remove('is-active');
      state.set('currentTab', 'chat');
    };

    tabBtnNotes.onclick = () => {
      tabBtnNotes.classList.add('is-active');
      tabBtnChat.classList.remove('is-active');
      if (panelNotes) panelNotes.classList.add('is-active');
      if (panelChat) panelChat.classList.remove('is-active');
      state.set('currentTab', 'notes');
    };
  }

  // Aceternity / Linear-Style Animated Sliding Pill Tabs (Zero dependencies, pure GPU translate3d)
  setupSlidingPillTabs('.canvas-mode-switcher', '.canvas-mode-btn');
  setupSlidingPillTabs('.studio-segmented-tabs', '.studio-tab-btn');

  // Quick Action Suggestion Chips in Composer Dock
  const btnQuickOverview = document.getElementById('btn-chip-audio-overview');
  if (btnQuickOverview) btnQuickOverview.onclick = generateAudioOverview;

  const btnQuickSummarize = document.getElementById('btn-chip-summarize');
  if (btnQuickSummarize) {
    btnQuickSummarize.onclick = () => sendQuickPrompt('Summarize the key findings and methodology across active sources.');
  }

  const btnQuickClear = document.getElementById('btn-chip-clear');
  if (btnQuickClear) btnQuickClear.onclick = clearChatStream;

  // Settings Save & Clear Actions
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.onclick = () => {
      const keyInput = document.getElementById('setting-gemini-key');
      const keyVal = (keyInput ? keyInput.value : '').trim();
      const rememberCheck = document.getElementById('setting-remember-session');

      if (keyVal) {
        state.set('geminiApiKey', keyVal);
        if (rememberCheck?.checked) {
          sessionStorage.setItem('nbl_session_gemini_key', keyVal);
        } else {
          sessionStorage.removeItem('nbl_session_gemini_key');
        }
        showToast('Gemini API key active for this session');
      } else {
        state.set('geminiApiKey', null);
        sessionStorage.removeItem('nbl_session_gemini_key');
        showToast(state.get('hasServerKey') ? 'Reverted to server default key' : 'API key cleared');
      }

      updateSettingsUI();
      stopSettingsTelemetryWatch();
      closeModal('settings-modal');
    };
  }

  const btnClearKey = document.getElementById('btn-clear-api-key');
  if (btnClearKey) {
    btnClearKey.onclick = () => {
      state.set('geminiApiKey', null);
      sessionStorage.removeItem('nbl_session_gemini_key');
      const keyInput = document.getElementById('setting-gemini-key');
      if (keyInput) keyInput.value = '';
      updateSettingsUI();
      showToast('API key scrubbed from memory');
    };
  }

  const btnToggleKeyVis = document.getElementById('btn-toggle-key-vis');
  if (btnToggleKeyVis) {
    btnToggleKeyVis.onclick = () => {
      const keyInput = document.getElementById('setting-gemini-key');
      if (!keyInput) return;
      keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    };
  }

  // Settings Key & Token Rotation Actions
  const btnRotateKey = document.getElementById('btn-setting-rotate-key');
  if (btnRotateKey) {
    btnRotateKey.onclick = async () => {
      btnRotateKey.disabled = true;
      try {
        const res = await fetch('/api/keys/rotate', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          showToast(`Rotated to Server Key Slot #${data.activeSlot} (${data.keyPreview || ''})`);
        } else {
          showToast(`Rotation: ${data.message || data.error || 'Pool unchanged'}`);
        }
      } catch (e) {
        showToast('Failed to rotate server key');
      } finally {
        btnRotateKey.disabled = false;
        refreshKeyTelemetry();
      }
    };
  }

  const btnRevokeToken = document.getElementById('btn-setting-revoke-token');
  if (btnRevokeToken) {
    btnRevokeToken.onclick = async () => {
      btnRevokeToken.disabled = true;
      try {
        await revokeTokenAndDisconnect();
        refreshKeyTelemetry();
      } finally {
        btnRevokeToken.disabled = false;
      }
    };
  }

  // Drive Modal Actions
  const btnModalConnectDrive = document.getElementById('btn-modal-connect-drive');
  if (btnModalConnectDrive) {
    btnModalConnectDrive.onclick = () => {
      if (!state.get('isDriveConnected')) {
        connectGoogleDrive();
      } else {
        syncCurrentNotesToDrive(false);
      }
    };
  }

  const btnDriveRefresh = document.getElementById('btn-drive-refresh-list');
  if (btnDriveRefresh) {
    btnDriveRefresh.onclick = () => loadGoogleDriveFiles(true);
  }

  const btnSaveButler = document.getElementById('btn-save-butler-url');
  if (btnSaveButler) {
    btnSaveButler.onclick = saveDriveWebAppUrl;
  }

  // Add Source Modal Form
  const formManualSource = document.getElementById('form-manual-source');
  if (formManualSource) {
    formManualSource.onsubmit = (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('input-source-title');
      const contentInput = document.getElementById('input-source-content');
      const title = (titleInput ? titleInput.value : '').trim();
      const content = (contentInput ? contentInput.value : '').trim();

      if (!title || !content) {
        showToast('Please provide a title and content');
        return;
      }

      const newSource = {
        id: `local-${Date.now()}`,
        title,
        source: 'Lab Notes',
        category: 'Notes',
        sizeFormatted: `${Math.ceil(content.length / 1024)} KB`,
        date: 'Today',
        timestamp: Date.now(),
        excerpt: content.slice(0, 160) + '...',
        content
      };

      const sources = state.get('sources');
      sources.unshift(newSource);
      state.get('activeSourceIds').add(newSource.id);
      state.set('sources', [...sources]);

      viewDocument(newSource.id);
      closeModal('add-source-modal');
      titleInput.value = '';
      contentInput.value = '';
      showToast('Document added to workspace');
    };
  }

  // File Upload via Add Source Modal
  const fileDropZone = document.getElementById('source-file-dropzone');
  const fileInput = document.getElementById('source-file-input');

  if (fileDropZone && fileInput) {
    fileDropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = evt.target.result;
          const newSource = {
            id: `upload-${Date.now()}`,
            title: file.name,
            source: 'Upload',
            category: file.name.endsWith('.pdf') ? 'PDFs' : 'Docs',
            sizeFormatted: `${Math.ceil(file.size / 1024)} KB`,
            date: 'Today',
            timestamp: Date.now(),
            excerpt: text.slice(0, 160) + '...',
            content: text
          };

          const sources = state.get('sources');
          sources.unshift(newSource);
          state.get('activeSourceIds').add(newSource.id);
          state.set('sources', [...sources]);

          viewDocument(newSource.id);
          closeModal('add-source-modal');
          showToast(`Uploaded ${file.name}`);
        };
        reader.readAsText(file);
      }
    };
  }

  // Auth Form Handlers
  const formAuthEmail = document.getElementById('form-auth-email');
  if (formAuthEmail) formAuthEmail.onsubmit = handleDirectAuthSubmit;

  const btnDemoLogin = document.getElementById('btn-auth-demo');
  if (btnDemoLogin) {
    btnDemoLogin.onclick = () => {
      loginDemoAccount();
      closeModal('auth-modal');
    };
  }

  const btnModalGoogle = document.getElementById('btn-auth-google');
  if (btnModalGoogle) {
    btnModalGoogle.onclick = () => {
      closeModal('auth-modal');
      connectGoogleDrive();
    };
  }

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    const popover = document.getElementById('user-popover-menu');
    const trigger = document.getElementById('btn-header-avatar');
    if (popover && popover.classList.contains('is-active')) {
      if (!popover.contains(e.target) && !trigger?.contains(e.target)) {
        closePopover();
      }
    }
  });
}

// ── Resizable Splitters Interaction ──
function initSplitters() {
  const splitterLeft = document.getElementById('splitter-left');
  const splitterRight = document.getElementById('splitter-right');
  const paneSources = document.getElementById('pane-sources');
  const paneStudio = document.getElementById('pane-studio');

  if (splitterLeft && paneSources) {
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    splitterLeft.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = paneSources.offsetWidth;
      splitterLeft.classList.add('is-dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(240, Math.min(460, startWidth + deltaX));
      paneSources.style.width = `${newWidth}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        splitterLeft.classList.remove('is-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  if (splitterRight && paneStudio) {
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    splitterRight.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = paneStudio.offsetWidth;
      splitterRight.classList.add('is-dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(300, Math.min(640, startWidth + deltaX));
      paneStudio.style.width = `${newWidth}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        splitterRight.classList.remove('is-dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }
}

// ── Global Keyboard Shortcuts ──
function initGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    // ⌘K or Ctrl+K to open spotlight search
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('global-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }

    // Escape closes modals and popovers
    if (e.key === 'Escape') {
      closeAllModals();
      stopSettingsTelemetryWatch();
    }
  });
}

// Window scope exposures for resilient click handlers and external calls
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.togglePopover = togglePopover;
window.closePopover = closePopover;
window.showToast = showToast;
window.toggleTheme = toggleTheme;
window.refreshKeyTelemetry = refreshKeyTelemetry;
window.navigateBackToFolders = navigateBackToFolders;
window.CryptoVault = CryptoVault;


/**
 * Setup smooth animated sliding pill indicator for segmented tabs
 * Uses translate3d + cubic-bezier(0.22, 1, 0.36, 1) for 220ms silky glide
 */
function setupSlidingPillTabs(containerSelector, btnSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let indicator = container.querySelector('.tab-sliding-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'tab-sliding-indicator';
    container.insertBefore(indicator, container.firstChild);
  }

  const update = () => {
    const activeBtn = container.querySelector(`${btnSelector}.is-active`);
    if (!activeBtn) {
      indicator.style.opacity = '0';
      return;
    }
    const left = activeBtn.offsetLeft;
    const width = activeBtn.offsetWidth;
    indicator.style.transform = `translate3d(${left}px, 0, 0)`;
    indicator.style.width = `${width}px`;
    indicator.style.opacity = '1';
  };

  const observer = new MutationObserver(() => update());
  container.querySelectorAll(btnSelector).forEach(btn => {
    observer.observe(btn, { attributes: true, attributeFilter: ['class'] });
    btn.addEventListener('click', () => {
      setTimeout(update, 10);
    });
  });

  window.addEventListener('resize', update);
  requestAnimationFrame(update);
  setTimeout(update, 150);
  setTimeout(update, 500);
}
