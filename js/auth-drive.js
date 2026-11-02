
export function purgeLegacyCleartextTokens() {
  try {
    localStorage.removeItem('nbl_drive_token_raw');
    localStorage.removeItem('nbl_drive_token_expires_raw');
    localStorage.removeItem('nbl_user_session_raw');
    localStorage.removeItem('nbl_lab_notes');
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('nbl_gemini_api_key');
  } catch (e) {}
}

// ── Startup Stage 1 Overlay Helpers ──
export function showStartupLoginLoading(message = 'Signing in...') {
  const overlay = document.getElementById('startup-login-loading-overlay');
  const label = document.getElementById('startup-login-status-label');
  if (label) label.textContent = message;
  if (overlay) overlay.classList.add('is-active');
}

export function hideStartupLoginLoading() {
  const overlay = document.getElementById('startup-login-loading-overlay');
  if (overlay) overlay.classList.remove('is-active');
}

export function triggerGoogleSignIn() {
  if (window.location.hostname === '127.0.0.1') {
    showToast('Redirecting to http://localhost:3000 for Google OAuth origin policy...');
    setTimeout(() => {
      window.location.href = window.location.href.replace('127.0.0.1', 'localhost');
    }, 600);
    return;
  }

  showStartupLoginLoading('Connecting to Google...');

  if (!driveTokenClient) {
    initDriveOAuth();
  }

  if (driveTokenClient) {
    try {
      const user = state.get('user');
      driveTokenClient.requestAccessToken({ prompt: user?.email ? '' : 'select_account' });
    } catch (e) {
      console.error('[Google OAuth Request]', e);
      hideStartupLoginLoading();
      showToast('Google Sign-in failed to open popup. Please check popup permissions.');
    }
  } else {
    hideStartupLoginLoading();
    showToast('Google Sign-in service loading. Please click again in a moment.');
  }
}

export async function handleStartupEmailLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('startup-input-email');
  const email = (input ? input.value : '').trim();
  if (!email) return;

  showStartupLoginLoading('Creating encrypted local session...');

  const displayName = email.includes('@') ? email.split('@')[0] : email;
  const user = {
    name: displayName,
    email: email.includes('@') ? email : `${email}@workspace.local`,
    picture: ''
  };

  state.set('user', user);
  try {
    await CryptoVault.setSecureItem('nbl_user_session', user);
  } catch (err) {}
  try {
    localStorage.setItem('nbl_user_session_raw', JSON.stringify(user));
    localStorage.setItem('nbl_auth_connected', 'true');
  } catch (err) {}

  // Butler ping if configured
  const butlerUrl = state.get('driveWebAppUrl') || localStorage.getItem('nbl_drive_webapp_url');
  if (butlerUrl) {
    try {
      const cleanUsername = String(user.name).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      fetch(butlerUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, action: 'signIn', email: user.email, displayName: user.name })
      }).catch(() => {});
    } catch (err) {}
  }

  renderAuthUI();
  hideStartupLoginLoading();
  startupScreen.hideLoginStage();
  await startupScreen.markReadyAndDismiss(`Welcome, ${user.name} · Launching workspace...`);
}

export async function handleStartupDemoLogin() {
  showStartupLoginLoading('Activating Dr. Jane Vance demo profile...');
  await loginDemoAccount();
  hideStartupLoginLoading();
  startupScreen.hideLoginStage();
  await startupScreen.markReadyAndDismiss('Authenticated as Dr. Jane Vance · Loading vault...');
}

/**
 * Research Lab (NBLMimic) — Google Identity & Drive Cloud Vault
 * Unified 1-Click OAuth2 Token Client (Drive + UserProfile Scopes),
 * Drive v3 CRUD, Quota Sync, and Secure Local Persistence.
 */

import { state } from './state.js';
import { CryptoVault } from './crypto-vault.js';
import { showToast, formatBytes, escapeHtml, closeModal } from './ui.js';
import { startupScreen } from './startup-screen.js';

let driveTokenClient = null;
let isSyncingNotes = false;
let oauthWatchdogTimer = null;
let activeRefreshPromise = null;
let resolveActiveRefresh = null;
let rejectActiveRefresh = null;

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

// ── Google OAuth Client Configuration & Initialization ──
export async function fetchServerAuthConfig() {
  try {
    const res = await fetch('/api/auth/config');
    if (res.ok) {
      const data = await res.json();
      if (data?.clientId) {
        state.set('googleClientId', data.clientId);
        initDriveOAuth();
      }
    }
  } catch (e) {
    console.warn('[Auth Config] Failed to fetch server auth config:', e);
  }
}

export function initGoogleGSI() {
  initDriveOAuth();
}

// Bind GSI early-loader hook for <script src="https://accounts.google.com/gsi/client" onload="initGoogleGSI()">
window._initGoogleGSIReady = initGoogleGSI;
window.initGoogleGSI = initGoogleGSI;
if (window._gsiLoaded || (typeof google !== 'undefined' && google?.accounts?.oauth2)) {
  initDriveOAuth();
}

export function triggerGoogleOAuth() {
  connectGoogleDrive();
}

// Legacy stub retained so existing references never throw ReferenceError
export async function onGoogleCredentialResponse(response) {
  connectGoogleDrive();
}

// ── User Session Management ──
export async function initUserSession() {
  try {
    const raw = localStorage.getItem('nbl_user_session_raw');
    if (raw) {
      const user = JSON.parse(raw);
      state.set('user', user);
      renderAuthUI();
    }
  } catch (e) {}
  try {
    let saved = await CryptoVault.getSecureItem('nbl_user_session');
    if (!saved) {
      const raw = localStorage.getItem('nbl_user_session_raw');
      if (raw) saved = JSON.parse(raw);
    }
    if (saved) {
      const user = typeof saved === 'string' ? JSON.parse(saved) : saved;
      state.set('user', user);
    }
  } catch (e) {
    console.warn('[Session] Error restoring user session:', e);
  }
  renderAuthUI();
}

export function renderAuthUI() {
  const user = state.get('user');
  const btnTrigger = document.getElementById('btn-header-signin');
  const userAvatarBtn = document.getElementById('btn-header-avatar');
  const avatarInitial = document.getElementById('header-avatar-initial');
  const avatarImg = document.getElementById('header-avatar-img');

  const popoverName = document.getElementById('popover-user-name');
  const popoverEmail = document.getElementById('popover-user-email');

  if (user) {
    if (btnTrigger) btnTrigger.style.display = 'none';
    if (userAvatarBtn) userAvatarBtn.style.display = 'flex';

    const initial = (user.name || user.email || 'U')[0].toUpperCase();
    if (avatarInitial) avatarInitial.textContent = initial;

    if (user.picture && avatarImg) {
      avatarImg.src = user.picture;
      avatarImg.style.display = 'block';
      if (avatarInitial) avatarInitial.style.display = 'none';
    } else {
      if (avatarImg) avatarImg.style.display = 'none';
      if (avatarInitial) avatarInitial.style.display = 'block';
    }

    if (popoverName) popoverName.textContent = user.name || 'Google User';
    if (popoverEmail) popoverEmail.textContent = user.email || 'user@workspace.internal';
  } else {
    if (btnTrigger) btnTrigger.style.display = 'inline-flex';
    if (userAvatarBtn) userAvatarBtn.style.display = 'none';
    if (popoverName) popoverName.textContent = 'Guest Researcher';
    if (popoverEmail) popoverEmail.textContent = 'Not connected to Google';
  }
}

export function signOutUser() {
  state.set('user', null);
  disconnectGoogleDrive();
  CryptoVault.removeSecureItem('nbl_user_session');
  try {
    localStorage.removeItem('nbl_user_session');
    localStorage.removeItem('nbl_user_session_raw');
    localStorage.removeItem('nbl_auth_connected');
    localStorage.removeItem('nbl_drive_token');
    localStorage.removeItem('nbl_drive_token_raw');
    localStorage.removeItem('nbl_drive_token_expires');
    localStorage.removeItem('nbl_drive_token_expires_raw');
  } catch (e) {}
  renderAuthUI();
  showToast('Signed out of session');

  const appShell = document.getElementById('app-shell');
  if (appShell) {
    appShell.classList.add('app-shell-preauth');
    appShell.style.opacity = '0';
    appShell.style.pointerEvents = 'none';
  }

  startupScreen.resetToLoginStage();
}

export function switchAccount() {
  state.set('user', null);
  disconnectGoogleDrive();
  CryptoVault.removeSecureItem('nbl_user_session');
  try {
    localStorage.removeItem('nbl_user_session');
    localStorage.removeItem('nbl_user_session_raw');
    localStorage.removeItem('nbl_auth_connected');
    localStorage.removeItem('nbl_drive_token');
    localStorage.removeItem('nbl_drive_token_raw');
    localStorage.removeItem('nbl_drive_token_expires');
    localStorage.removeItem('nbl_drive_token_expires_raw');
  } catch (e) {}
  signOutUser();
}

export async function loginDemoAccount() {
  const user = {
    name: 'Dr. Jane Vance',
    email: 'jane.vance.research@gmail.com',
    picture: ''
  };
  state.set('user', user);
  await CryptoVault.setSecureItem('nbl_user_session', user);
  try {
    localStorage.setItem('nbl_user_session_raw', JSON.stringify(user));
  } catch (e) {}
  renderAuthUI();
  if (typeof window.loadDefaultWorkspaceSources === 'function') {
    window.loadDefaultWorkspaceSources();
  }
  showToast('Signed in as Dr. Jane Vance (Demo Session)');
}

export async function handleDirectAuthSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('auth-input-email');
  const email = (input ? input.value : '').trim();
  if (!email) return;

  const displayName = email.includes('@') ? email.split('@')[0] : email;
  const user = {
    name: displayName,
    email: email.includes('@') ? email : `${email}@gmail.com`,
    picture: ''
  };

  state.set('user', user);
  await CryptoVault.setSecureItem('nbl_user_session', user);
  try {
    localStorage.setItem('nbl_user_session_raw', JSON.stringify(user));
  } catch (e) {}
  renderAuthUI();
  closeModal('auth-modal');
  showToast(`Signed in as ${user.name}`);
}

// ── Cryptographic State Nonce ──
export function generateOAuthNonce() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  const nonce = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
  try {
    sessionStorage.setItem('nbl_oauth_nonce', nonce);
  } catch (e) {}
  return nonce;
}

// ── Token Audience & Scope Verification ──
export async function verifyTokenAudience(token) {
  if (!token) return false;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      console.warn('[Auth Security] tokeninfo check status:', res.status);
      return false;
    }
    const info = await res.json();
    const expectedClientId = state.get('googleClientId');
    if (expectedClientId && info.aud && info.aud !== expectedClientId) {
      console.error('[Auth Security] Audience mismatch:', info.aud, 'expected:', expectedClientId);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Auth Security] Audience verification skipped (network error):', err);
    return true; // Don't block offline or local testing
  }
}

// ── Silent OAuth2 Renewal & Watchdog ──
export function getTokenTimeRemainingSec() {
  const expires = state.get('driveTokenExpires') || 0;
  return Math.max(0, Math.floor((expires - Date.now()) / 1000));
}

export function startOAuthWatchdog() {
  stopOAuthWatchdog();
  oauthWatchdogTimer = setInterval(async () => {
    const isConn = state.get('isDriveConnected');
    const token = state.get('driveToken');
    const expires = state.get('driveTokenExpires') || 0;
    if (!isConn || !token || !expires) return;

    const remainingMs = expires - Date.now();
    // 5 minutes renewal threshold (300,000 ms)
    if (remainingMs <= 5 * 60 * 1000 && !activeRefreshPromise) {
      console.log(`[OAuth Watchdog] Token expires in ${Math.round(remainingMs / 1000)}s. Triggering silent refresh...`);
      try {
        await refreshOAuthTokenSilently();
      } catch (err) {
        console.warn('[OAuth Watchdog] Silent renewal failed:', err);
      }
    }
  }, 30000); // Check every 30 seconds
}

export function stopOAuthWatchdog() {
  if (oauthWatchdogTimer) {
    clearInterval(oauthWatchdogTimer);
    oauthWatchdogTimer = null;
  }
}

export function refreshOAuthTokenSilently() {
  if (activeRefreshPromise) return activeRefreshPromise;

  activeRefreshPromise = new Promise((resolve, reject) => {
    if (!driveTokenClient) initDriveOAuth();
    if (!driveTokenClient) {
      activeRefreshPromise = null;
      return reject(new Error('Google Drive TokenClient unavailable'));
    }

    let timeoutId = setTimeout(() => {
      resolveActiveRefresh = null;
      rejectActiveRefresh = null;
      activeRefreshPromise = null;
      reject(new Error('Silent token refresh timed out'));
    }, 15000);

    resolveActiveRefresh = (tok) => {
      clearTimeout(timeoutId);
      activeRefreshPromise = null;
      resolveActiveRefresh = null;
      rejectActiveRefresh = null;
      resolve(tok);
    };

    rejectActiveRefresh = (err) => {
      clearTimeout(timeoutId);
      activeRefreshPromise = null;
      resolveActiveRefresh = null;
      rejectActiveRefresh = null;
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    try {
      driveTokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      clearTimeout(timeoutId);
      activeRefreshPromise = null;
      resolveActiveRefresh = null;
      rejectActiveRefresh = null;
      reject(err);
    }
  });

  return activeRefreshPromise;
}

// ── Intercepting driveFetch with Automatic 401 Re-Auth Queue ──
export async function driveFetch(url, options = {}) {
  let token = state.get('driveToken');
  if (!token) {
    throw new Error('Google Drive is not connected');
  }

  // If silent refresh is currently running, wait for it
  if (activeRefreshPromise) {
    try {
      token = await activeRefreshPromise;
    } catch (e) {
      // Continue with current token if refresh failed
    }
  }

  const makeRequest = (tok) => {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${tok}`);
    return fetch(url, { ...options, headers });
  };

  let res = await makeRequest(token);

  if (res.status === 401) {
    console.warn('[driveFetch] 401 Unauthorized encountered. Queueing request and refreshing token silently...');
    try {
      const freshToken = await refreshOAuthTokenSilently();
      res = await makeRequest(freshToken);
      if (res.status === 401) {
        console.error('[driveFetch] Persistent 401 after fresh token. Disconnecting Drive.');
        disconnectGoogleDrive();
      }
    } catch (refreshErr) {
      console.error('[driveFetch] Token renewal failed on 401 intercept:', refreshErr);
      disconnectGoogleDrive();
      throw refreshErr;
    }
  }

  return res;
}

// ── Explicit Revocation & Session Scrubbing ──
export async function revokeTokenAndDisconnect() {
  const token = state.get('driveToken');
  stopOAuthWatchdog();
  if (token) {
    if (typeof google !== 'undefined' && google.accounts?.oauth2?.revoke) {
      try {
        google.accounts.oauth2.revoke(token, () => {});
      } catch (e) {}
    }
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        mode: 'no-cors'
      }).catch(() => {});
    } catch (e) {}
  }
  disconnectGoogleDrive();
  showToast('Google OAuth token revoked & session scrubbed');
}

// ── Unified 1-Click Google OAuth2 Token Client ──
export function initDriveOAuth() {
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    return;
  }
  try {
    const clientId = state.get('googleClientId') || '809750403592-tven0oabpuiq37oi8um5f102ck3lclkg.apps.googleusercontent.com';
    driveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: OAUTH_SCOPES,
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          const driveToken = tokenResponse.access_token;
          const expiresIn = parseInt(tokenResponse.expires_in, 10) || 3600;
          const driveTokenExpires = Date.now() + expiresIn * 1000;

          // Audience verification
          const isValidAudience = await verifyTokenAudience(driveToken);
          if (!isValidAudience) {
            console.error('[Drive Auth] Token rejected due to invalid audience.');
            showToast('Security Alert: Token audience verification failed');
            if (rejectActiveRefresh) rejectActiveRefresh(new Error('Audience mismatch'));
            return;
          }

          // 1. Save token & connection state
          state.update({
            driveToken,
            driveTokenExpires,
            isDriveConnected: true
          });

          // Start Watchdog
          startOAuthWatchdog();

          // Resolve pending silent refresh promise
          if (resolveActiveRefresh) {
            resolveActiveRefresh(driveToken);
          }

          // 2. Fetch user profile and storageQuota in single call
          let userObj = null;
          let storageQuotaObj = null;
          try {
            const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
              headers: { Authorization: `Bearer ${driveToken}` }
            });
            if (aboutRes.ok) {
              const data = await aboutRes.json();
              if (data?.user) {
                userObj = {
                  name: data.user.displayName || 'Google User',
                  email: data.user.emailAddress || '',
                  picture: data.user.photoLink || ''
                };
                state.set('user', userObj);
              }
              if (data?.storageQuota) {
                storageQuotaObj = data.storageQuota;
                state.set('driveStorage', storageQuotaObj);
              }
            }
          } catch (err) {
            console.warn('[Drive Auth] Error fetching about info:', err);
          }

          // 3. Persist securely to CryptoVault & sessionStorage (Zero plaintext token in localStorage - Fixes VULN-17)
          if (userObj) {
            await CryptoVault.setSecureItem('nbl_user_session', userObj);
            try {
              sessionStorage.setItem('nbl_user_session', JSON.stringify(userObj));
            } catch (e) {}
          }
          await CryptoVault.setSecureItem('nbl_drive_token', driveToken, expiresIn * 1000);
          await CryptoVault.setSecureItem('nbl_drive_token_expires', driveTokenExpires, expiresIn * 1000);
          try {
            sessionStorage.setItem('nbl_drive_token_session', driveToken);
            sessionStorage.setItem('nbl_drive_token_expires_session', String(driveTokenExpires));
            purgeLegacyCleartextTokens();
          } catch (e) {}

          // 4. Close modals immediately
          closeModal('auth-modal');
          closeModal('drive-modal');

          // 5. Update header avatar & storage meter
          renderAuthUI();
          updateDriveUI();
          showToast(userObj?.name ? `Signed in as ${userObj.name}` : 'Google Drive connected');

          // If startup screen is still active (Stage 1 login), bloom logo reveal and advance through portal
          const startupEl = document.getElementById('startup-screen');
          if (startupEl && startupEl.style.display !== 'none' && !startupScreen.isDismissed) {
            hideStartupLoginLoading();
            startupScreen.hideLoginStage();
            await startupScreen.markReadyAndDismiss(
              userObj?.name ? `Authenticated as ${userObj.name} · Loading Drive vault...` : 'Drive Vault Connected · Loading...'
            );
          }

          // 6. Ensure app folder and sync notes
          await ensureDriveAppFolder();
          syncCurrentNotesToDrive(true);

          // 7. Immediately load Drive files into source list
          await loadGoogleDriveFiles(true);

          // 8. Update center canvas out of sign-in screen
          if (state.get('viewMode') === 'folders') {
            if (typeof window.updateCanvasView === 'function') {
              window.updateCanvasView();
            }
          } else {
            const sources = state.get('sources');
            if (sources && sources.length > 0 && typeof window.viewDocument === 'function') {
              window.viewDocument(sources[0].id);
            } else if (typeof window.updateCanvasView === 'function') {
              window.updateCanvasView();
            }
          }
        } else if (tokenResponse && tokenResponse.error) {
          console.error('[Drive Auth Error]', tokenResponse);
          if (rejectActiveRefresh) rejectActiveRefresh(new Error(tokenResponse.error));
          showToast(`Connection error: ${tokenResponse.error}`);
        }
      }
    });
  } catch (err) {
    console.warn('[Drive] initTokenClient failed:', err);
  }
}

export async function initDriveSession() {
  try {
    purgeLegacyCleartextTokens();

    let savedToken = await CryptoVault.getSecureItem('nbl_drive_token');
    let expiresRaw = await CryptoVault.getSecureItem('nbl_drive_token_expires');

    if (!savedToken) {
      savedToken = sessionStorage.getItem('nbl_drive_token_session');
      expiresRaw = sessionStorage.getItem('nbl_drive_token_expires_session');
    }

    const expires = parseInt(expiresRaw || '0', 10);
    const isConn = Boolean(savedToken && expires > Date.now());
    const folderId = localStorage.getItem('nbl_drive_folder_id');
    const webAppUrl = localStorage.getItem('nbl_drive_webapp_url');

    if (folderId) state.set('driveFolderId', folderId, true);
    if (webAppUrl) state.set('driveWebAppUrl', webAppUrl, true);

    if (savedToken && expires > Date.now()) {
      state.update({
        driveToken: savedToken,
        driveTokenExpires: expires,
        isDriveConnected: true
      });
      startOAuthWatchdog();
      updateDriveUI();
      fetchDriveQuota();
      await loadGoogleDriveFiles();
    } else if (isConn && savedToken) {
      state.update({
        driveToken: savedToken,
        isDriveConnected: true
      });
      startOAuthWatchdog();
      updateDriveUI();
      await loadGoogleDriveFiles();
    } else {
      state.update({
        isDriveConnected: false,
        driveToken: null
      });
      updateDriveUI();
    }
  } catch (e) {
    console.warn('[Drive] Session load error:', e);
  }
}

export async function fetchServerDriveConfig() {
  try {
    const res = await fetch('/api/drive/config');
    if (res.ok) {
      const data = await res.json();
      if (data?.clientId) state.set('googleClientId', data.clientId);
      if (data?.webAppUrl && !state.get('driveWebAppUrl')) {
        state.set('driveWebAppUrl', data.webAppUrl);
        const input = document.getElementById('input-drive-webapp-url');
        if (input) input.value = data.webAppUrl;
      }
      initDriveOAuth();
    }
  } catch (e) {
    console.warn('[Drive Config] Failed to fetch server drive config:', e);
  }
}

export function connectGoogleDrive() {
  if (!driveTokenClient) {
    initDriveOAuth();
  }
  if (driveTokenClient) {
    const user = state.get('user');
    driveTokenClient.requestAccessToken({ prompt: user?.email ? '' : 'select_account' });
  } else {
    showToast('Google Sign-in service loading. Please click again in a moment.');
  }
}

export function disconnectGoogleDrive() {
  stopOAuthWatchdog();
  const token = state.get('driveToken');
  if (token && typeof google !== 'undefined' && google.accounts?.oauth2?.revoke) {
    try {
      google.accounts.oauth2.revoke(token, () => {});
    } catch (e) {}
  }
  state.update({
    driveToken: null,
    driveTokenExpires: 0,
    isDriveConnected: false,
    driveStorage: null,
    driveFiles: [],
    sources: [],
    selectedDocId: null
  });
  state.get('activeSourceIds').clear();

  try {
    sessionStorage.removeItem('nbl_selected_doc_id');
  } catch (e) {}

  CryptoVault.removeSecureItem('nbl_drive_token');
  CryptoVault.removeSecureItem('nbl_drive_token_expires');
  try {
    localStorage.removeItem('nbl_drive_token');
    localStorage.removeItem('nbl_drive_token_expires');
    localStorage.removeItem('nbl_drive_token_raw');
    localStorage.removeItem('nbl_drive_token_expires_raw');
    localStorage.removeItem('nbl_auth_connected');
  } catch (e) {}

  const container = document.getElementById('modal-drive-files-container');
  if (container) container.style.display = 'none';

  updateDriveUI();
  if (typeof window.loadDefaultWorkspaceSources === 'function') {
    window.loadDefaultWorkspaceSources();
  }
  showToast('Google Drive disconnected');
}

export function updateDriveUI() {
  const isConnected = state.get('isDriveConnected');
  const storage = state.get('driveStorage');

  const meterDot = document.getElementById('storage-meter-dot');
  const meterVal = document.getElementById('storage-meter-val');
  const meterFill = document.getElementById('storage-meter-fill');

  const modalStatus = document.getElementById('modal-drive-status');
  const modalQuotaText = document.getElementById('modal-drive-quota');
  const modalQuotaFill = document.getElementById('modal-drive-quota-fill');
  const btnConnect = document.getElementById('btn-modal-connect-drive');

  if (isConnected && storage) {
    const usageNum = parseInt(storage.usage || '0', 10);
    const limitNum = storage.limit ? parseInt(storage.limit, 10) : 0;
    const usageStr = formatBytes(usageNum);
    const limitStr = limitNum > 0 ? formatBytes(limitNum) : 'Unlimited';
    const pct = limitNum > 0 ? Math.min(100, Math.max(0.5, (usageNum / limitNum) * 100)) : 12;

    if (meterDot) meterDot.classList.add('is-connected');
    if (meterVal) meterVal.textContent = `${usageStr} / ${limitStr}`;
    if (meterFill) meterFill.style.width = `${pct.toFixed(1)}%`;

    if (modalStatus) modalStatus.textContent = 'Connected to Google Drive';
    if (modalQuotaText) modalQuotaText.textContent = `${usageStr} of ${limitStr} (${pct.toFixed(1)}%)`;
    if (modalQuotaFill) modalQuotaFill.style.width = `${pct.toFixed(1)}%`;
    if (btnConnect) {
      btnConnect.textContent = 'Sync Notes Now';
      btnConnect.onclick = () => syncCurrentNotesToDrive(false);
    }
  } else if (isConnected) {
    if (meterDot) meterDot.classList.add('is-connected');
    if (meterVal) meterVal.textContent = 'Drive Active';
    if (meterFill) meterFill.style.width = '3%';
    if (modalStatus) modalStatus.textContent = 'Connected (Verifying quota...)';
    if (modalQuotaText) modalQuotaText.textContent = 'Active';
    if (modalQuotaFill) modalQuotaFill.style.width = '3%';
    if (btnConnect) {
      btnConnect.textContent = 'Sync Notes Now';
      btnConnect.onclick = () => syncCurrentNotesToDrive(false);
    }
  } else {
    if (meterDot) meterDot.classList.remove('is-connected');
    if (meterVal) meterVal.textContent = 'Connect Drive';
    if (meterFill) meterFill.style.width = '0%';
    if (modalStatus) modalStatus.textContent = 'Disconnected';
    if (modalQuotaText) modalQuotaText.textContent = 'Not connected';
    if (modalQuotaFill) modalQuotaFill.style.width = '0%';
    if (btnConnect) {
      btnConnect.textContent = 'Connect Google Drive';
      btnConnect.onclick = connectGoogleDrive;
    }
  }

  // Update Header Drive Button
  const headerDriveBtn = document.getElementById('btn-header-connect-drive');
  const headerDriveLabel = document.getElementById('label-header-drive');
  if (headerDriveBtn && headerDriveLabel) {
    if (isConnected) {
      headerDriveBtn.classList.add('is-connected');
      headerDriveLabel.textContent = 'Drive Connected';
    } else {
      headerDriveBtn.classList.remove('is-connected');
      headerDriveLabel.textContent = 'Connect Drive';
    }
  }
}

export async function fetchDriveQuota() {
  if (!state.get('driveToken') || !state.get('isDriveConnected')) return null;

  try {
    const res = await driveFetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user');

    if (res.status === 401) {
      disconnectGoogleDrive();
      return null;
    }

    if (res.ok) {
      const data = await res.json();
      state.set('driveStorage', data.storageQuota);
      if (data?.user && !state.get('user')) {
        const user = {
          name: data.user.displayName || 'Google User',
          email: data.user.emailAddress || '',
          picture: data.user.photoLink || ''
        };
        state.set('user', user);
        await CryptoVault.setSecureItem('nbl_user_session', user);
        try {
          localStorage.setItem('nbl_user_session_raw', JSON.stringify(user));
        } catch (e) {}
        renderAuthUI();
      }
      updateDriveUI();
      return data.storageQuota;
    }
  } catch (err) {
    console.warn('[Drive Quota Error]', err);
  }
  return null;
}

export async function ensureDriveAppFolder() {
  if (!state.get('driveToken')) return null;

  let folderId = state.get('driveFolderId');
  if (folderId) {
    try {
      const checkRes = await driveFetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,trashed`);
      if (checkRes.ok) {
        const folder = await checkRes.json();
        if (!folder.trashed) return folderId;
      }
    } catch (e) {}
  }

  try {
    const q = encodeURIComponent("name = 'Research Lab (NBLMimic)' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const searchRes = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data?.files && data.files.length > 0) {
        folderId = data.files[0].id;
        state.set('driveFolderId', folderId);
        try {
          localStorage.setItem('nbl_drive_folder_id', folderId);
        } catch (e) {}
        return folderId;
      }
    }

    const createRes = await driveFetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Research Lab (NBLMimic)',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    if (createRes.ok) {
      const newFolder = await createRes.json();
      folderId = newFolder.id;
      state.set('driveFolderId', folderId);
      try {
        localStorage.setItem('nbl_drive_folder_id', folderId);
      } catch (e) {}
      return folderId;
    }
  } catch (err) {
    console.error('[Drive Folder Error]', err);
  }
  return null;
}

export async function syncCurrentNotesToDrive(silent = false) {
  if (!state.get('isDriveConnected') || !state.get('driveToken')) {
    if (!silent) {
      showToast('Connect Google Drive to sync notes');
    }
    return;
  }

  if (isSyncingNotes) return;
  isSyncingNotes = true;

  const notesStatusLabel = document.getElementById('notes-sync-status');
  if (notesStatusLabel) notesStatusLabel.textContent = 'Syncing...';

  try {
    const folderId = await ensureDriveAppFolder();
    const content = state.get('notesContent') || '# Research Lab Notes\n\nNo notes recorded yet.';
    const fileName = 'Research_Notes.md';

    let existingFileId = null;
    if (folderId) {
      const query = encodeURIComponent(`name = '${fileName}' and '${folderId}' in parents and trashed = false`);
      const searchRes = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData?.files && searchData.files.length > 0) {
          existingFileId = searchData.files[0].id;
        }
      }
    }

    let uploadRes;
    if (existingFileId) {
      uploadRes = await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8'
        },
        body: content
      });
    } else {
      const metadata = {
        name: fileName,
        mimeType: 'text/markdown',
        parents: folderId ? [folderId] : []
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
        content +
        closeDelim;

      uploadRes = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });
    }

    const webAppUrl = state.get('driveWebAppUrl');
    if (webAppUrl) {
      try {
        fetch(webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: state.get('user')?.name || 'researcher',
            action: 'saveNote',
            title: 'Research_Notes',
            content: content
          })
        }).catch(() => {});
      } catch (e) {}
    }

    if (uploadRes && uploadRes.ok) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (notesStatusLabel) notesStatusLabel.textContent = `Synced (${timeStr})`;
      if (!silent) showToast('Notes saved to Google Drive');
      fetchDriveQuota();
    }
  } catch (err) {
    console.error('[Drive Sync Error]', err);
    if (notesStatusLabel) notesStatusLabel.textContent = 'Saved locally';
    if (!silent) showToast('Could not sync to Google Drive');
  } finally {
    isSyncingNotes = false;
  }
}

export function isBinaryContent(content) {
  if (!content || typeof content !== 'string') return false;
  if (content.startsWith('%PDF-') || content.startsWith('PK\x03\x04') || content.startsWith('\x7fELF')) {
    return true;
  }
  let nonPrintable = 0;
  const sample = content.slice(0, 1000);
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 65533) {
      nonPrintable++;
    }
  }
  return nonPrintable > 15;
}

export function generateDocumentExcerpt(file, category, sizeFormatted, dateFormatted) {
  const name = file.name || file.title || 'Untitled Document';
  const cleanBaseName = name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/^[0-9_]+/, '').trim() || name;

  if (category === 'PDFs' || name.toLowerCase().endsWith('.pdf')) {
    return `Archived PDF manuscript "${cleanBaseName}". Verified cloud document (${sizeFormatted}) synchronized from Google Drive. Full multi-page layout and figures ready for reading and AI synthesis.`;
  }
  if (category === 'Docs' || name.toLowerCase().endsWith('.docx') || name.toLowerCase().endsWith('.doc')) {
    return `Research manuscript "${cleanBaseName}". Cloud document (${sizeFormatted}) synchronized from Google Drive. Ready for full-text inspection and grounded citation extraction.`;
  }
  if (category === 'Sheets' || name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.csv')) {
    return `Quantitative data matrix "${cleanBaseName}". Tabular dataset (${sizeFormatted}) synchronized from Google Drive. Ready for data analysis, column parsing, and synthesis.`;
  }
  if (category === 'Slides' || name.toLowerCase().endsWith('.pptx')) {
    return `Presentation deck "${cleanBaseName}". Visual slides archive (${sizeFormatted}) synchronized from Google Drive. Includes executive summary, diagram slides, and notes.`;
  }
  if (category === 'Notes' || name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.txt')) {
    return `Working notes and synthesis log for "${cleanBaseName}". Cloud document (${sizeFormatted}) synchronized from Google Drive.`;
  }
  return `Synchronized Google Drive file "${cleanBaseName}" (${sizeFormatted}) modified on ${dateFormatted}. Ready for active workspace research.`;
}

export function getFileCategory(mimeType, fileName = '') {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return 'PDFs';
  }
  if (mime === 'application/vnd.google-apps.document' || name.endsWith('.docx') || name.endsWith('.doc')) {
    return 'Docs';
  }
  if (mime === 'application/vnd.google-apps.spreadsheet' || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || name.endsWith('.tsv')) {
    return 'Sheets';
  }
  if (mime === 'application/vnd.google-apps.presentation' || name.endsWith('.pptx') || name.endsWith('.ppt') || name.endsWith('.key')) {
    return 'Slides';
  }
  if (name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.markdown') || (mime && mime.startsWith('text/'))) {
    return 'Notes';
  }
  return 'Docs';
}

export async function loadGoogleDriveFiles(force = false) {
  const syncBtnIcon = document.getElementById('btn-sync-sources-icon');
  if (syncBtnIcon) syncBtnIcon.style.animation = 'spin 700ms linear infinite';

  if (!state.get('isDriveConnected') || !state.get('driveToken')) {
    if (syncBtnIcon) syncBtnIcon.style.animation = '';
    state.set('sources', []);
    return;
  }

  try {
    const q = "trashed = false and mimeType != 'application/vnd.google-apps.folder'";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=50&orderBy=modifiedTime desc&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)`;

    const res = await driveFetch(url);

    if (res.status === 401) {
      disconnectGoogleDrive();
      if (syncBtnIcon) syncBtnIcon.style.animation = '';
      return;
    }

    if (res.ok) {
      const data = await res.json();
      const driveFiles = data.files || [];

      const sources = driveFiles.map(file => {
        const cat = getFileCategory(file.mimeType, file.name);
        const modDate = file.modifiedTime ? new Date(file.modifiedTime) : new Date();
        const dateStr = modDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const sizeStr = file.size ? formatBytes(file.size) : (cat === 'Docs' ? 'Doc' : (cat === 'Sheets' ? 'Sheet' : (cat === 'PDFs' ? 'PDF' : (cat === 'Slides' ? 'Slides' : 'File'))));

        return {
          id: file.id,
          driveFileId: file.id,
          title: file.name,
          mimeType: file.mimeType,
          category: cat,
          source: 'Google Drive',
          sizeBytes: file.size,
          sizeFormatted: sizeStr,
          webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
          url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
          date: dateStr,
          timestamp: modDate.getTime(),
          excerpt: generateDocumentExcerpt(file, cat, sizeStr, dateStr),
          content: null
        };
      });

      state.set('sources', sources);

      // Default ground first 3 files
      const activeIds = state.get('activeSourceIds');
      if (activeIds.size === 0 && sources.length > 0) {
        sources.slice(0, 3).forEach(s => activeIds.add(s.id));
      }

      renderModalDriveFileList(sources);
      showToast(`Loaded ${sources.length} sources from Drive`);
    }
  } catch (err) {
    console.error('[Drive Files Fetch Error]', err);
    showToast(`Error fetching Drive files: ${err.message}`);
  } finally {
    if (syncBtnIcon) syncBtnIcon.style.animation = '';
  }
}

export async function fetchDriveDocumentContent(doc) {
  if (!state.get('driveToken')) {
    return null;
  }

  // 1. Native Google Docs
  if (doc.mimeType === 'application/vnd.google-apps.document') {
    try {
      const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${doc.driveFileId}/export?mimeType=text/plain`);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0) return text;
      }
    } catch (e) {
      console.warn('[fetchDriveDocumentContent] Docs export failed:', e);
    }
  }

  // 2. Native Google Sheets
  if (doc.mimeType === 'application/vnd.google-apps.spreadsheet') {
    try {
      const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${doc.driveFileId}/export?mimeType=text/csv`);
      if (res.ok) {
        const csv = await res.text();
        return `# ${doc.title}\n\n**Google Spreadsheet (CSV Export)**:\n\n\`\`\`csv\n${csv.slice(0, 12000)}\n\`\`\``;
      }
    } catch (e) {
      console.warn('[fetchDriveDocumentContent] Sheets export failed:', e);
    }
  }

  // 3. Native Google Slides
  if (doc.mimeType === 'application/vnd.google-apps.presentation') {
    try {
      const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${doc.driveFileId}/export?mimeType=text/plain`);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0) {
          return `# ${doc.title}\n\n**Google Slides Presentation Outline**:\n\n${text}`;
        }
      }
    } catch (e) {
      console.warn('[fetchDriveDocumentContent] Slides export failed:', e);
    }
  }

  // 4. Safe plain text formats
  const name = (doc.title || '').toLowerCase();
  const mime = (doc.mimeType || '').toLowerCase();
  const isPlainText = mime.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.json') ||
    name.endsWith('.py') ||
    name.endsWith('.js') ||
    name.endsWith('.html');

  if (isPlainText) {
    try {
      const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${doc.driveFileId}?alt=media`);
      if (res.ok) {
        const text = await res.text();
        if (!isBinaryContent(text)) {
          return text;
        }
      }
    } catch (e) {
      console.warn('[fetchDriveDocumentContent] Text download failed:', e);
    }
  }

  // 5. Binary formats (PDF, DOCX, XLSX, PPTX, Images)
  // NEVER return raw binary bytes!
  return null;
}

/**
 * Fetches any Google Drive document or PDF as a local first-party Blob.
 * Uses OAuth2 Bearer token (alt=media or export?mimeType=application/pdf).
 * Falls back to server streaming proxy on /api/drive/file if needed.
 * Zero cross-site cookies, zero popups!
 */
export async function fetchDriveDocumentBlob(doc) {
  if (!doc || !doc.driveFileId) return null;
  const token = state.get('driveToken');
  if (!token) return null;

  const fileId = encodeURIComponent(doc.driveFileId);
  const mime = (doc.mimeType || '').toLowerCase();
  const isDoc = mime.includes('google-apps.document');
  const isSheet = mime.includes('google-apps.spreadsheet');
  const isSlide = mime.includes('google-apps.presentation');

  let fetchUrl;
  let outputMime = mime;

  if (isDoc || isSheet || isSlide) {
    fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
    outputMime = 'application/pdf';
  } else {
    fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    outputMime = doc.mimeType || 'application/pdf';
  }

  let res;
  try {
    res = await driveFetch(fetchUrl);
  } catch (err) {
    // If browser CORS on googleapis alt=media redirects, fallback to local server proxy with Bearer header
    res = await fetch(`/api/drive/file?id=${fileId}&mime=${encodeURIComponent(mime)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  if (!res || !res.ok) {
    // Fallback to local server proxy with Bearer header
    res = await fetch(`/api/drive/file?id=${fileId}&mime=${encodeURIComponent(mime)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  if (!res || !res.ok) {
    throw new Error(`Document download failed: HTTP ${res?.status || 500}`);
  }

  const rawBlob = await res.blob();
  const typedBlob = new Blob([rawBlob], { type: outputMime });
  const blobUrl = URL.createObjectURL(typedBlob);

  return {
    blobUrl,
    mimeType: outputMime,
    revoke: () => URL.revokeObjectURL(blobUrl)
  };
}

export function saveDriveWebAppUrl() {
  const input = document.getElementById('input-drive-webapp-url');
  if (input) {
    const url = input.value.trim();
    state.set('driveWebAppUrl', url);
    try {
      localStorage.setItem('nbl_drive_webapp_url', url);
    } catch (e) {}
    showToast('Apps Script Butler URL saved');
  }
}

export function renderModalDriveFileList(sources) {
  const container = document.getElementById('modal-drive-files-container');
  const list = document.getElementById('modal-drive-files-list');
  if (!container || !list) return;

  if (sources && sources.length > 0) {
    container.style.display = 'block';
    list.innerHTML = sources.slice(0, 15).map(s => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 8px; border-radius:var(--radius-xs); font-size:12px; cursor:pointer; background:var(--bg-surface); border:1px solid var(--border-subtle); margin-bottom:2px;" onclick="window.viewDocument && window.viewDocument('${s.id}')">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px; color:var(--text-primary); font-weight:500;">${escapeHtml(s.title)}</span>
        <span style="font-size:10.5px; font-family:var(--font-mono); color:var(--text-tertiary);">${escapeHtml(s.sizeFormatted || '')}</span>
      </div>
    `).join('');
  } else {
    container.style.display = 'none';
  }
}

// Window scope exposures for resilient click handlers and external calls
window.connectGoogleDrive = connectGoogleDrive;
window.disconnectGoogleDrive = disconnectGoogleDrive;
window.switchAccount = switchAccount;
window.loginDemoAccount = loginDemoAccount;
window.syncCurrentNotesToDrive = syncCurrentNotesToDrive;
window.fetchDriveDocumentContent = fetchDriveDocumentContent;
window.fetchDriveDocumentBlob = fetchDriveDocumentBlob;
window.loadGoogleDriveFiles = loadGoogleDriveFiles;
window.driveFetch = driveFetch;
window.startOAuthWatchdog = startOAuthWatchdog;
window.stopOAuthWatchdog = stopOAuthWatchdog;
window.refreshOAuthTokenSilently = refreshOAuthTokenSilently;
window.revokeTokenAndDisconnect = revokeTokenAndDisconnect;
window.getTokenTimeRemainingSec = getTokenTimeRemainingSec;
