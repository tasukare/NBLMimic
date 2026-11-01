# AGENTS.md — AI Developer & Agent Guidelines

Welcome, AI coding assistant! This repository contains **NBLMimic** (Research Lab), a private, self-hosted research and knowledge management interface mimicking Google NotebookLM, using Google Drive as a personal database and storage layer.

Please read and adhere strictly to the conventions and rules described in this file.

---

## 1. Project Overview & Philosophy

- **Goal:** Create a privacy-first, distraction-free knowledge notebook and research interface inspired by Google NotebookLM, Linear, and Readwise Reader.
- **Storage & Database:** Privacy-first design using Google Drive API and client-side AES-GCM-256 Web Crypto storage for user notes, sources, and knowledge graphs.
- **Tech Stack:**
  - Standard, dependency-light web technologies (HTML5, Modern CSS, Vanilla ES6+ JavaScript modules).
  - Fast, responsive, accessible, and self-contained with zero npm/bundler dependencies.
- **Design Core:** Typography-driven, warm-stone/zinc monochrome palette, 4px/8px grid system, and high information density with zero "AI slop" or emojis.

---

## 2. Modular File Architecture Map

```text
/
├── index.html                 # Clean semantic HTML shell (<500 lines), loads css/ and js/app.js
├── components.html            # Living design system synced with css/tokens.css & css/components.css
├── server.js                  # Node.js local proxy (Gemini API key safety, news feed, zero external dependencies)
├── drive_butler_v2.js         # Google Apps Script backend
├── package.json               # Zero-dependency config
├── AGENTS.md                  # AI agent instruction manual and coding standards (this file)
├── STYLEGUIDE.md              # Comprehensive design specification & design token dictionary
├── css/
│   ├── tokens.css             # Single source of truth for Light & Dark CSS custom properties
│   ├── layout.css             # 3-panel CSS layout, resizable splitters, header, responsive collapse
│   ├── components.css         # Buttons, inputs, segmented controls, source rows, modals, badges, toasts
│   └── reader-chat.css        # Editorial prose typography, citation chips, chat stream, composer dock
└── js/
    ├── app.js                 # Main entry point (ES6 module), global UI bindings, Cmd+K / Esc shortcuts
    ├── state.js               # Centralized reactive state store & session persistence
    ├── crypto-vault.js        # CryptoVault AES-GCM-256 Web Crypto hardware-bound encryption utility
    ├── auth-drive.js          # Google Identity Services (GSI), OAuth2 token client, Drive API v3 CRUD & quota
    ├── sources-reader.js      # Source list rendering, filtering, prose parser, and Drive iframe preview
    ├── chat.js                # Grounded Gemini chat (/api/chat), BYOK fallback, citation click navigation
    ├── live-voice.js          # Gemini 3.8 Live WebSocket (BidiGenerateContent), 16kHz PCM capture, 24kHz playback
    ├── notes.js               # Lab Notes scratchpad, word counter, .md export, debounced Drive sync
    └── ui.js                  # Theme switcher, modal manager, toast notifications, and SVG icon helper
```

---

## 3. Strict Development Rules for Agents

### Design & Styling (Strict Anti-Slop Rules)
1. **Zero Emojis in the UI:** Never introduce emojis into the interface. Use crisp 1.5px stroke Lucide SVGs (14px–16px) via `js/ui.js` `getIcon(name, size)`.
2. **Unified Monochrome Palette:** Always consult `STYLEGUIDE.md` and use tokens from `css/tokens.css` (e.g. `var(--bg-canvas)`, `var(--text-primary)`, `var(--border-subtle)`).
3. **Typography Standards:**
   - UI & Controls: `'Inter'`, `-apple-system`, sans-serif (`13px` base UI, `-0.01em` tracking, `tabular-nums` on numbers).
   - Reader & Notes Prose: `'Charter'`, `'Newsreader'`, `'Georgia'`, serif (`17px` body, `1.75` line-height, `65ch` optimal reading measure).
   - Citations & Shortcuts: `'JetBrains Mono'`, monospace (`11.5px`).
4. **Theme Support:** Ensure all components support both Light and Dark mode seamlessly via CSS custom properties.

### Architecture & Code Quality
1. **Zero External Bundlers:** The app runs directly in modern browsers via native ES6 modules (`<script type="module" src="js/app.js"></script>`). Do not introduce Vite, Webpack, Babel, or heavy npm runtime dependencies.
2. **Privacy First & BYOK Support:** Never write API keys or OAuth tokens in plaintext to disk or localStorage. Use `CryptoVault` for sensitive values and memory-only storage for BYOK Gemini keys.
3. **Reactive State:** State updates must flow through `state.set(key, value)` in `js/state.js` to ensure reactive subscribers update predictably.

---

## 4. Useful Development Commands

To run the application:
```bash
# Using Node.js server:
npm start
# or:
node server.js
```
The server runs on `http://127.0.0.1:3000` with loopback-only binding for complete local security.
