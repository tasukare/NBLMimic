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
- **🎙️ Gemini 3.8 Live Real-Time Voice:** Interactive spoken audio conversations over WebSockets (`wss://...BidiGenerateContent`) with ultra-low latency, natural voice personas (Aoede, Puck, Charon, Kore, Fenrir), real-time waveform visualizer, and dual-channel live transcription.
- **🎧 Audio Overview (NotebookLM Podcast):** One-click spoken deep dive synthesis analyzing all active research sources with natural conversation flow.
- **🧠 Grounded AI Research Partner:** Powered by `gemini-3.5-flash` with strict source grounding, interactive [1], [2] citation pills, and an instant **in-chat model switcher** (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.8-flash`, `gemini-4-argon`, `gemini-3.1-pro-preview`).
- **🛡️ Smart Quota & High Demand Fallback:** Automatically detects model rate limits or temporary traffic spikes on Google's servers, informing you with one-click instant switches to alternative available models (`gemini-3.5-flash-lite`).
- **🔒 Privacy-First & Flexible:** Works directly in the browser via localStorage or via local `.env` protection with zero npm dependencies.
- **🎨 Beautiful Design System:** Built with an 8px grid, typography-first layout (Inter + Charter), and full Light/Dark mode support.
- **⚡ Super Lightweight:** Pure HTML5, modern CSS, and vanilla JavaScript. No complicated build tools or heavy installations required!

---

## 📂 Project Structure

Here is a quick map of what each file does:

| File | What it is |
|------|------------|
| `index.html` | The main website & interactive application |
| `components.html` | Component gallery showing all UI buttons, cards, and panels |
| `tokens.css` | All colors, fonts, spacing, and design variables |
| `STYLEGUIDE.md` | Our official design rules (colors, fonts, margins) |
| `AGENTS.md` | Guidelines for AI coding assistants working on the repo |
| `README.md` | This project overview guide |

---

## 🚀 How to Run the Website on Your PC

Because this project is built with clean web standards, running it is super simple:

### Option 1: Secure Server with .env (Recommended)
1. Copy `.env.example` to `.env` (or open `.env`) and add your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Note: `.env` is protected by `.gitignore` and is NEVER uploaded to GitHub)*
2. Start the local server:
   ```bash
   node server.js
   # or
   npm start
   ```
3. Open **[http://localhost:3000](http://localhost:3000)** in your browser. The server automatically uses your `.env` key securely!

### Option 2: Just Open in Browser (Static)
Double-click `index.html` to open it in your browser. You can enter your API key in Settings (stored only in your local browser profile).

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

## 🛠️ Roadmap & What's Next
- [x] Base 3-panel UI & design tokens (`index.html`, `tokens.css`)
- [x] UI component library (`components.html`)
- [x] Design guide & AI agent rules (`STYLEGUIDE.md`, `AGENTS.md`)
- [x] Google Gemini API integration (`gemini-3.8-flash`) with Grounded Research Agent & Interactive Citations
- [x] Google Gemini 3.8 Live API real-time bidirectional voice & audio streaming (`gemini-3.8-live`)
- [x] Spoken "Audio Overview" deep-dive generator (NotebookLM podcast style)
- [x] Real-time audio waveform visualizer and live transcription
- [x] Secure local proxy server with `.env` secret protection & zero npm dependencies
- [x] Local Ollama AI fallback support
- [x] Dynamic source ingestion (file uploads, notes, active source toggles)
- [x] Live search, type filtering, and notes auto-saving
- [ ] Connect Google Drive API for cloud sync & storage
