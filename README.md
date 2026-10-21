# 🔬 NBLMimic (Research Lab)

> A private, distraction-free knowledge management and research notebook inspired by Google NotebookLM — using Google Drive as our personal database.

---

## 🎯 What Are We Building?

**NBLMimic** is our team's project to recreate the power of Google NotebookLM while keeping it self-hosted, lightweight, and 100% private. 

Instead of relying on proprietary cloud databases, NBLMimic stores your documents, notes, and research sources directly in your own **Google Drive** and local storage.

### ✨ Key Features
- **📚 3-Panel Research Workspace:** 
  - **Left:** Source Library (manage uploaded documents, research papers, notes).
  - **Center:** Distraction-Free Document & Citation Reader.
  - **Right:** Notes, synthesis, and research workspace.
- **📰 Real-Time Live News Stream & Auto-Categorization:** 
  - Automatically fetches and updates live top stories from Hacker News, Ars Technica, and ScienceDaily via zero-dependency native fetch & RSS engine.
  - Smart keyword categorizer dynamically tags articles into `🤖 AI & ML`, `💻 Tech & Dev`, `🔬 Science`, `📈 Business`, `🌐 World & Policy`, or `📝 Notes & Uploads`.
  - Filter pills display live article counters per category.
  - Interactive auto-sort dropdown: sort instantly by **Recency (Latest First)**, **Alphabetical (A–Z)**, **Category**, **Publication / Source**, or **Active Status**.
  - 1-click **Refresh News** with rotating live sync animation and sub-5ms cached responsiveness.
  - Permanently preserves user custom notes and file uploads across news refreshes.
- **⚡ In-Chat Quick Model Switcher:** Switch models on the fly with one click directly inside the research chat:
  - `🚀 3.5 Lite` (Default — sub-second &lt;1s response, maximum free-tier quota, zero demand spikes)
  - `⚡ 3.5 Flash` (Standard model — 1M context window)
  - `✨ 3.8 Flash` (Next-generation multimodal preview — may experience temporary demand spikes)
- **🎙️ Gemini 3.8 Live Real-Time Voice:** Interactive spoken audio conversations over WebSockets (`wss://...BidiGenerateContent`) with ultra-low latency, natural voice personas (Aoede, Puck, Charon, Kore, Fenrir), real-time waveform visualizer, and dual-channel live transcription.
- **🎧 Audio Overview (NotebookLM Podcast):** One-click spoken deep dive synthesis analyzing all active research sources with natural conversation flow.
- **🧠 Grounded AI Research Partner:** Grounded research answering with strict source citation pills (`[1]`, `[2]`) that jump directly to matching reference documents.
- **🛡️ Smart Auto-Acceleration & High-Demand Recovery:** Automatically detects model rate limits (HTTP 429), server traffic spikes (HTTP 503), or server delays (>7s), instantly auto-routing your query through `gemini-3.5-flash-lite` so research answers are never blocked.
- **🔒 Zero-Leak Privacy & Automatic `.env` Sync:**
  - Put your key in `.env` once; the local server automatically syncs it with the browser upon startup.
  - No repeated key prompts or annoying warnings on page reload.
  - Zero risk of leaking keys to git (strict `.gitignore` and zero npm dependencies).
  - Also supports client-side only mode if running completely serverless.
- **🎨 Beautiful Design System:** Built with an 8px grid, typography-first layout (Inter + Charter), distinct Settings gear icon, and full Light/Dark mode support.
- **⚡ Super Lightweight:** Pure HTML5, modern CSS, and vanilla JavaScript. No complicated build tools or heavy installations required!

---

## 📂 Project Structure

Here is a quick map of what each file does:

| File | What it is |
|------|------------|
| `index.html` | The main website & interactive application |
| `server.js` | Built-in zero-dependency Node.js HTTP server + secure API proxy |
| `.env.example` | Template for environment variables (`GEMINI_API_KEY`, `PORT`) |
| `.gitignore` | Git exclusion rules preventing `.env` and secrets from being committed |
| `components.html` | Component gallery showing all UI buttons, cards, and panels |
| `tokens.css` | All colors, fonts, spacing, and design variables |
| `STYLEGUIDE.md` | Our official design rules (colors, fonts, margins) |
| `AGENTS.md` | Guidelines for AI coding assistants working on the repo |
| `README.md` | This project overview guide |

---

## 🚀 How to Run the Website on Your PC

Because this project is built with clean web standards, running it is super simple:

### Option 1: Secure Server with `.env` (Recommended)
1. Copy `.env.example` to `.env` (or create `.env`) and add your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
   *(Note: `.env` is protected by `.gitignore` and is NEVER uploaded to GitHub)*
2. Start the local server:
   ```bash
   node server.js
   ```
3. Open **[http://localhost:3000](http://localhost:3000)** in your browser.
   - The app will automatically sync your key from `.env` — no manual copying or pasting required!
   - You can switch models directly in the chat or from the top bar.

### Option 2: Pure Static / Serverless Mode
If you don't want to run Node.js, simply double-click `index.html` or open it with any web server.
- Enter your Gemini API key under **Settings (⚙️)**.
- It is saved securely inside your browser's private `localStorage` and never leaves your machine.

---

## 🔒 Security & Privacy Guarantee

- **Never Commit Secrets:** `.env` and `.env.*` are strictly excluded in `.gitignore`.
- **Zero Third-Party Trackers:** No analytics, trackers, or external ads.
- **Zero NPM Vulnerabilities:** `server.js` uses standard Node.js built-in modules (`http`, `https`, `fs`, `path`, `url`), eliminating third-party supply-chain risks.

---

## 🤝 Team Workflow (How We Work Together)

To make sure we don't accidentally overwrite each other's work, always follow this simple 3-step routine:

### 1. Before you start working:
Always grab the latest changes from your teammates:
```bash
git pull
```

### 2. Make your edits & test:
Edit HTML, CSS, or JS files, and refresh your browser to see your changes.

### 3. Send your changes up to GitHub:
```bash
git add .
git commit -m "Describe what you added or fixed"
git push
```

---

## 🛠️ Roadmap & Features Completed
- [x] Base 3-panel UI & design tokens (`index.html`, `tokens.css`)
- [x] UI component library (`components.html`)
- [x] Design guide & AI agent rules (`STYLEGUIDE.md`, `AGENTS.md`)
- [x] Google Gemini API integration with Grounded Research Agent & Interactive Citations
- [x] In-chat quick model switcher (`3.5 Lite`, `3.5 Flash`, `3.8 Flash`)
- [x] Smart quota limit (429) & high-demand (503) auto-detection with 1-click fallback buttons
- [x] Google Gemini 3.8 Live API real-time bidirectional voice & audio streaming (`gemini-3.8-live`)
- [x] Spoken "Audio Overview" deep-dive generator (NotebookLM podcast style)
- [x] Real-time audio waveform visualizer and live transcription
- [x] Secure local server with `.env` secret auto-sync & zero npm dependencies
- [x] Local Ollama AI fallback support
- [x] Real-time live news stream, auto-categorizer, and dynamic auto-sort system
- [x] Dynamic source ingestion (file uploads, notes, active source toggles)
- [x] Live search, type filtering, and notes auto-saving
- [ ] Connect Google Drive API for cloud sync & storage
