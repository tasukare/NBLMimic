/**
 * NBLMimic — Firebase Authentication Service
 * Unified Google Sign-in with Firebase Auth + Google Drive Scopes.
 * Zero external bundlers: Uses Google's official modular ESM distribution.
 */

import { state } from './state.js';
import { CryptoVault } from './crypto-vault.js';
import { showToast } from './ui.js';

// Modular Firebase Web SDK endpoints (CDN ESM)
const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

let firebaseApp = null;
let firebaseAuth = null;
let fbModulePromise = null;
let isInitializing = false;

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * Dynamically import Firebase modular libraries on demand
 */
async function loadFirebaseModules() {
  if (fbModulePromise) return fbModulePromise;

  fbModulePromise = (async () => {
    try {
      const [appMod, authMod] = await Promise.all([
        import(FIREBASE_APP_URL),
        import(FIREBASE_AUTH_URL)
      ]);
      return {
        initializeApp: appMod.initializeApp,
        getApps: appMod.getApps,
        getApp: appMod.getApp,
        getAuth: authMod.getAuth,
        signInWithPopup: authMod.signInWithPopup,
        GoogleAuthProvider: authMod.GoogleAuthProvider,
        signOut: authMod.signOut,
        onAuthStateChanged: authMod.onAuthStateChanged,
        connectAuthEmulator: authMod.connectAuthEmulator
      };
    } catch (err) {
      console.warn('[Firebase Auth] Failed to import Firebase ESM modules:', err);
      fbModulePromise = null;
      throw err;
    }
  })();

  return fbModulePromise;
}

/**
 * Check whether Firebase configuration is present and valid
 */
export function isFirebaseConfigured() {
  const cfg = state.get('firebaseConfig') || {};
  return Boolean(cfg.apiKey && cfg.projectId);
}

/**
 * Initialize Firebase with server or local configuration
 */
export async function initFirebaseAuthConfig(config) {
  if (!config || !config.projectId) return null;

  state.set('firebaseConfig', config);

  // If no apiKey yet, don't attempt initializeApp (avoids throw)
  if (!config.apiKey) {
    console.info('[Firebase Auth] Project ID configured (' + config.projectId + '). Awaiting FIREBASE_API_KEY.');
    return null;
  }

  try {
    const modules = await loadFirebaseModules();
    const existingApps = modules.getApps();

    if (existingApps.length > 0) {
      firebaseApp = modules.getApp();
    } else {
      firebaseApp = modules.initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
        projectId: config.projectId,
        storageBucket: config.storageBucket || `${config.projectId}.firebasestorage.app`,
        messagingSenderId: config.messagingSenderId || '809750403592',
        appId: config.appId || undefined
      });
    }

    firebaseAuth = modules.getAuth(firebaseApp);
    console.log('[Firebase Auth] Initialized for project:', config.projectId);
    return firebaseAuth;
  } catch (err) {
    console.warn('[Firebase Auth] Initialization error:', err);
    return null;
  }
}

/**
 * Get active Firebase Auth instance, initializing if needed
 */
export async function getFirebaseAuthInstance() {
  if (firebaseAuth) return firebaseAuth;

  const cfg = state.get('firebaseConfig');
  if (cfg && cfg.apiKey) {
    return await initFirebaseAuthConfig(cfg);
  }
  return null;
}

/**
 * Sign in with Google using Firebase Authentication + Google Drive scopes.
 * Returns { user, driveToken, idToken } on success.
 */
export async function signInWithGoogleFirebase() {
  const modules = await loadFirebaseModules();
  let auth = firebaseAuth;

  if (!auth) {
    auth = await getFirebaseAuthInstance();
  }

  if (!auth) {
    throw new Error('Firebase Auth is not configured. Please set FIREBASE_API_KEY in .env or Settings.');
  }

  const provider = new modules.GoogleAuthProvider();
  for (const scope of DRIVE_SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    const result = await modules.signInWithPopup(auth, provider);
    const credential = modules.GoogleAuthProvider.credentialFromResult(result);
    const driveToken = credential?.accessToken || null;
    const fbUser = result.user;
    const idToken = await fbUser.getIdToken();

    const userObj = {
      uid: fbUser.uid,
      name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Google User'),
      email: fbUser.email || '',
      picture: fbUser.photoURL || '',
      authProvider: 'firebase-google',
      idToken: idToken
    };

    state.update({
      user: userObj,
      firebaseUser: fbUser,
      isFirebaseAuthActive: true
    });

    await CryptoVault.setSecureItem('nbl_user_session', userObj);
    try {
      sessionStorage.setItem('nbl_user_session', JSON.stringify(userObj));
    } catch (e) {}

    return {
      user: userObj,
      driveToken,
      idToken,
      firebaseUser: fbUser
    };
  } catch (error) {
    console.error('[Firebase Auth Google Sign-in Error]:', error);

    if (error.code === 'auth/unauthorized-domain') {
      showToast('Firebase Auth: Localhost is not authorized. Add "localhost" in Firebase Console > Authentication > Settings > Authorized domains.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      console.log('[Firebase Auth] Popup dismissed by user.');
    } else if (error.code === 'auth/popup-blocked') {
      showToast('Popup was blocked by your browser. Please allow popups for this site.');
    } else if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
      showToast('Firebase API Key is invalid. Check FIREBASE_API_KEY in .env or Settings.');
    } else {
      showToast(error.message || 'Firebase Google Sign-in failed');
    }

    throw error;
  }
}

/**
 * Sign out of Firebase Authentication
 */
export async function signOutFirebase() {
  try {
    if (firebaseAuth) {
      const modules = await loadFirebaseModules();
      await modules.signOut(firebaseAuth);
    }
  } catch (err) {
    console.warn('[Firebase Auth] Sign out error:', err);
  }
  state.set('firebaseUser', null);
  state.set('isFirebaseAuthActive', false);
}

/**
 * Initialize persistent Auth state listener
 */
export async function initFirebaseAuthListener(onUserChanged) {
  try {
    const auth = await getFirebaseAuthInstance();
    if (!auth) return;

    const modules = await loadFirebaseModules();
    modules.onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        state.set('firebaseUser', fbUser);
        state.set('isFirebaseAuthActive', true);
        if (typeof onUserChanged === 'function') {
          onUserChanged(fbUser);
        }
      } else {
        state.set('firebaseUser', null);
        state.set('isFirebaseAuthActive', false);
      }
    });
  } catch (err) {
    console.warn('[Firebase Auth] Failed to initialize state listener:', err);
  }
}
