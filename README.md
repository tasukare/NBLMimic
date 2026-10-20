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
- **🔒 Privacy-First:** Your documents stay in your own Google Drive.
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
- [x] Local Ollama AI fallback support
- [x] Dynamic source ingestion (file uploads, notes, active source toggles)
- [x] Live search, type filtering, and notes auto-saving
- [ ] Connect Google Drive API for cloud sync & storage
- [ ] Audio overview / synthesized notes generator
