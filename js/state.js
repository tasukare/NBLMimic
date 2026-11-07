/**
 * NBLMimic — Centralized Reactive State Store
 * Manages in-memory workspace data, session persistence, and pub-sub events.
 */

class StateStore {
  constructor() {
    this._listeners = new Map();

    this.state = {
      // User Profile & Session
      user: null,
      isSignUpMode: false,
      googleClientId: '809750403592-tven0oabpuiq37oi8um5f102ck3lclkg.apps.googleusercontent.com',
      firebaseConfig: null,
      firebaseUser: null,
      isFirebaseAuthActive: false,

      // Research Sources & Grounding
      sources: [],
      activeSourceIds: new Set(),
      selectedDocId: null,
      viewMode: 'folders', // 'folders' | 'reader' | 'preview' | 'split' | 'news'
      filterCategory: 'all', // 'all' | 'drive' | 'docs' | 'pdfs' | 'notes'
      filterTag: 'all',
      searchQuery: '',

      // Studio Tabs & Notes
      currentTab: 'chat', // 'chat' | 'notes'
      activeModel: 'gemini-3.5-flash-lite',
      notesContent: '',

      // API Key / BYOK (Ephemeral / in-memory only)
      geminiApiKey: null,
      hasServerKey: false,

      // Google Drive Cloud Vault
      driveToken: null,
      driveTokenExpires: 0,
      isDriveConnected: false,
      driveFolderId: null,
      driveStorage: null,
      driveFiles: [],
      driveWebAppUrl: ''
    };
  }

  get(key) {
    return this.state[key];
  }

  set(key, value, silent = false) {
    const prev = this.state[key];
    this.state[key] = value;
    if (!silent && prev !== value) {
      this.emit(key, { value, prev });
      this.emit('*', { key, value, prev });
    }
  }

  update(partial, silent = false) {
    for (const [k, v] of Object.entries(partial)) {
      this.set(k, v, silent);
    }
  }

  subscribe(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    const callbacks = this._listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[StateStore] Error in listener for "${event}":`, err);
        }
      });
    }
  }
}

export const state = new StateStore();
