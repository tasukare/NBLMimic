# 🔬 NBLMimic (Research Lab)

> A private, distraction-free knowledge management and research notebook inspired by Google NotebookLM — featuring real-time AI reasoning, Gemini 3.8 Live Voice, and native Google Account authentication.

---

## 🎯 What Are We Building?

**NBLMimic** is our team's project to recreate the power of Google NotebookLM while keeping it self-hosted, lightweight, and 100% private. 

Instead of relying on black-box cloud databases, NBLMimic stores your documents, notes, and research sources directly in your browser's local storage and syncs securely with Google services.

---

### ✨ Key Features

- **📚 3-Panel Research Workspace:** 
  - **Left:** Source Library (manage uploaded documents, research papers, notes, and live news streams).
  - **Center:** Distraction-Free Document & Citation Reader.
  - **Right:** Notes editor, synthesis scratchpad, and grounded research chat.
- **🔐 Official Google Account Authentication:**
  - Real Google Identity Services (GSI) integration with one-click sign-in.
  - Displays your official Google profile avatar, name, and email in the top navigation bar.
  - Seamless account switcher, photo viewer, and session management saved safely to `localStorage`.
- **📰 Real-Time Live News Stream & Auto-Categorization:** 
  - Automatically aggregates top stories from Hacker News, Ars Technica, and ScienceDaily with sub-5ms cached responsiveness.
  - Intelligent keyword categorizer dynamically tags articles: `🤖 AI & ML`, `💻 Tech & Dev`, `🔬 Science`, `📈 Business`, `🌐 World & Policy`, or `📝 Notes & Uploads`.
  - Filter pills with live article counters and instant multi-criteria sorting (Recency, Alphabetical, Category, Source, Active Status).
  - User notes and uploaded source files are permanently preserved across live news updates.
- **⚡ In-Chat Quick Model Switcher:** Switch models on the fly with one click directly inside the chat interface:
  - `🚀 3.5 Lite` (Default — sub-second &lt;1s response, maximum free-tier quota, zero demand spikes)
  - `⚡ 3.5 Flash` (Standard model — 1M context window)
  - `✨ 3.8 Flash` (Next-generation multimodal reasoning preview)
- **🎙️ Gemini 3.8 Live Real-Time Voice:** Interactive spoken audio conversations over WebSockets (`wss://...BidiGenerateContent`) with ultra-low latency, natural voice personas (Aoede, Puck, Charon, Kore, Fenrir), real-time waveform visualizer, and dual-channel live transcription.
- **🎧 Audio Overview (NotebookLM Podcast):** One-click spoken deep dive synthesis analyzing all active research sources with natural conversation flow.
- **🧠 Grounded AI Research Partner:** Grounded research answering with strict source citation pills (`[1]`, `[2]`) that jump directly to matching reference documents.
- **🛡️ Smart Auto-Acceleration & High-Demand Recovery:** Automatically detects model rate limits (HTTP 429), server traffic spikes (HTTP 503), or server delays (>7s), instantly auto-routing your query through `gemini-3.5-flash-lite` so research answers are never blocked.
- **🔒 Zero-Leak Privacy & Automatic `.env` Sync:**
  - Put your Gemini API key in `.env` once; the local server automatically syncs it with the browser upon startup.
  - Zero risk of leaking secrets to git (strict `.gitignore` and zero npm dependencies).
  - Runs with standard Node.js built-in modules (`http`, `https`, `fs`, `path`, `url`).
- **🎨 Beautiful Design System:** Built with an 8px grid, typography-first layout (Inter + Charter), distinct Settings gear icon, and full Light/Dark mode support.

---

## 📂 Project Structure

| File / Folder | What it is |
|---|---|
| [`index.html`](file:///D:/NBLMimic%20project/NBLMimic/index.html) | The primary single-page web app and research interface |
| [`server.js`](file:///D:/NBLMimic%20project/NBLMimic/server.js) | Built-in zero-dependency Node.js HTTP server + secure API & live news proxy |
| [`start.bat`](file:///D:/NBLMimic%20project/start.bat) | 1-Click Windows launcher (starts the server and opens `http://localhost:3000`) |
| [`.env.example`](file:///D:/NBLMimic%20project/NBLMimic/.env.example) | Template for environment variables (`GEMINI_API_KEY`, `PORT`, `GOOGLE_CLIENT_ID`) |
| [`.gitignore`](file:///D:/NBLMimic%20project/NBLMimic/.gitignore) | Git exclusion rules preventing `.env` and secrets from being committed |
| [`google_client_secret.json`](file:///D:/NBLMimic%20project/NBLMimic/google_client_secret.json) | Google OAuth 2.0 Web Client configuration |
| [`components.html`](file:///D:/NBLMimic%20project/NBLMimic/components.html) | Component gallery showing all UI buttons, cards, and panels |
| [`tokens.css`](file:///D:/NBLMimic%20project/NBLMimic/tokens.css) | All design tokens (colors, typography, radii, elevation) |
| [`STYLEGUIDE.md`](file:///D:/NBLMimic%20project/NBLMimic/STYLEGUIDE.md) | Official design guidelines (typography, colors, margins) |
| [`AGENTS.md`](file:///D:/NBLMimic%20project/NBLMimic/AGENTS.md) | Architectural guidelines for AI coding assistants |
| [`README.md`](file:///D:/NBLMimic%20project/NBLMimic/README.md) | Project documentation and setup guide |

---

## 🚀 How to Run the App

### Option 1: 1-Click Launch with `start.bat` (Easiest for Windows)
Simply double-click [`start.bat`](file:///D:/NBLMimic%20project/start.bat) in the project directory. 
- It starts the local server on `http://localhost:3000`.
- Automatically launches your default web browser to the app.

---

### Option 2: Terminal / Command Line
1. Navigate to the project directory:
   ```powershell
   # If using quotes:
   cd "D:\NBLMimic project\NBLMimic"

   # Or using the space-free shortcut:
   cd D:\projects\NBLMimic
   ```
2. Make sure your `.env` contains your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
3. Start the server:
   ```bash
   npm start
   # or: node server.js
   ```
4. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> [!IMPORTANT]
> **Why `http://localhost:3000` is required for Google Sign-In:**
> Google's OAuth 2.0 security policies strictly disallow the `file://` protocol (opening the `.html` file directly from Windows Explorer will return `Error 400: invalid_request`). Running via the local server on `http://localhost:3000` provides the authorized web origin required for real Google Sign-In.

---

## 🔒 Security & Privacy

- **Protected Secrets:** `.env` and credentials files are permanently ignored by `.gitignore`.
- **Zero Third-Party Trackers:** No analytics, spyware, or ad scripts.
- **Zero NPM Dependencies:** `server.js` uses standard Node.js built-ins (`http`, `https`, `fs`, `path`, `dns`), eliminating third-party supply-chain risks.

---

## 🤝 Team Workflow

Always follow this simple routine when collaborating:

1. **Pull the latest changes:**
   ```bash
   git pull
   ```
2. **Make your changes & verify:**
   Test locally at `http://localhost:3000`.
3. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: describe your change"
   git push
   ```

---

## 🛠️ Roadmap & Features Completed

- [x] Base 3-panel UI & design tokens (`index.html`, `tokens.css`)
- [x] UI component library (`components.html`)
- [x] Design guide & AI agent rules (`STYLEGUIDE.md`, `AGENTS.md`)
- [x] Official Google Sign-In with real Google Identity Services & Account Menu
- [x] Google Gemini API integration with Grounded Research Agent & Interactive Citations
- [x] In-chat quick model switcher (`3.5 Lite`, `3.5 Flash`, `3.8 Flash`)
- [x] Smart quota limit (429) & high-demand (503) auto-detection with instant fallback routing
- [x] Google Gemini 3.8 Live API real-time bidirectional voice & audio streaming (`gemini-3.8-live`)
- [x] Spoken "Audio Overview" deep-dive generator (NotebookLM podcast style)
- [x] Real-time audio waveform visualizer and live transcription
- [x] Secure local server with `.env` secret auto-sync & zero npm dependencies
- [x] Real-time live news stream, auto-categorizer, and dynamic auto-sort system
- [x] Dynamic source ingestion (file uploads, notes, active source toggles)
- [x] Live search, category filtering, and notes auto-saving
- [x] 1-Click Windows launcher (`start.bat`)
- [ ] Connect Google Drive API for direct cloud sync & file storage
