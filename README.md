# 🔬 NBLMimic (Research Lab)

> A private, distraction-free knowledge management and research notebook inspired by Google NotebookLM — featuring real-time AI reasoning, Gemini 3.8 Live Voice, 3D Glass Research Folders, Aceternity UI Liquid Glass, and native Google Account authentication.

---

## 🌐 Live Repository & Instant Demo

- **GitHub Repository**: [https://github.com/tasukare/NBLMimic](https://github.com/tasukare/NBLMimic)
- **Live Branch**: `main` and `My-workspace`
- **Instant Deploy / Test Options**:
  - **Live Web Tunnel**: `https://eighty-baths-fix.loca.lt` (Enter IP `175.100.53.217` on first visit)
  - **GitHub Pages**: Branch `gh-pages` is pushed and ready to serve at `https://tasukare.github.io/NBLMimic/`
  - **Local 1-Click Launch**: Double-click `start.bat` to launch at `http://localhost:3000`

---

## 🎯 What Are We Building?

**NBLMimic** is our project to recreate the power of Google NotebookLM while keeping it self-hosted, lightweight, and 100% private. 

Instead of relying on black-box cloud databases, NBLMimic stores your documents, notes, and research sources directly in your browser's local storage with client-side AES-GCM-256 encryption, and syncs seamlessly with Google Drive and Gemini.

---

### ✨ Key Features

- **💎 Aceternity UI Liquid Glass Aesthetic:**
  - Real-time Snell's law optical refraction powered by procedural SVG displacement mapping (`feDisplacementMap`).
  - Specular rim highlighting with `GLASS_SHADOW` (`shadow-[0_10px_40px_rgb(0_0_0/0.35),inset_0_1px_0_rgb(255_255_255/0.35)]`).
  - Ambient indigo and amber background glow orbs that refract through the glass.
  - Floating command header with emerald status pulse and Aceternity prompt composer dock with sparkles icon and circular send pill.
- **📁 3D Interactive Glass Research Folders:**
  - Procedural liquid art canvases with 5 customizable presets (`Aurora`, `Glacier`, `Ember`, `Dusk`, `Verdant`).
  - Automated format separation & sorting: PDFs, Google Docs, Manuscripts, Code, Spreadsheets into dedicated category cards.
  - Custom folder creation modal with instant color tone selection.
- **📖 Clean Distraction-Free Reader:**
  - Native PDF FlateDecode stream parser (renders binary compressed PDFs with full formatting, fonts, and clean readability).
  - Proper paragraph spacing and typography for Google Docs manuscripts.
  - Citations click-through highlighting connected directly to research answers.
- **🔐 Official Google Account & Drive Integration:**
  - Real Google Identity Services (GSI) integration with one-click sign-in.
  - Direct Google Drive Cloud Vault integration with encrypted local caching and document streaming.
  - Displays your official Google profile avatar, name, and email in the top navigation bar.
- **📰 Real-Time Live News Stream & Auto-Categorization:** 
  - Automatically aggregates top stories from Hacker News, Ars Technica, and ScienceDaily with sub-5ms cached responsiveness.
  - Intelligent keyword categorizer dynamically tags articles: `🤖 AI & ML`, `💻 Tech & Dev`, `🔬 Science`, `📈 Business`, `🌐 World & Policy`, or `📝 Notes & Uploads`.
  - Filter pills with live article counters and instant multi-criteria sorting (Recency, Alphabetical, Category, Source, Active Status).
- **⚡ In-Chat Quick Model Switcher:** Switch models on the fly with one click directly inside the chat interface:
  - `🚀 3.5 Lite` (Default — sub-second <1s response, maximum free-tier quota, zero demand spikes)
  - `⚡ 3.5 Flash` (Standard model — 1M context window)
  - `✨ 3.8 Flash` (Next-generation multimodal reasoning preview)
- **🎙️ Gemini 3.8 Live Real-Time Voice:** Interactive spoken audio conversations over WebSockets (`wss://...BidiGenerateContent`) with ultra-low latency, natural voice personas (Aoede, Puck, Charon, Kore, Fenrir), real-time waveform visualizer, and dual-channel live transcription.
- **🎧 Audio Overview (NotebookLM Podcast):** One-click spoken deep dive synthesis analyzing all active research sources with natural conversation flow.
- **🧠 Grounded AI Research Partner:** Grounded research answering with strict source citation pills (`[1]`, `[2]`) that jump directly to matching reference documents.
- **🛡️ Smart Auto-Acceleration & High-Demand Recovery:** Automatically detects model rate limits (HTTP 429), server traffic spikes (HTTP 503), or server delays (>7s), instantly auto-routing your query through `gemini-3.5-flash-lite` so research answers are never blocked.
- **🔒 Zero-Leak Privacy & Automatic `.env` Sync:**
  - Put your Gemini API key in `.env` once; the local server automatically syncs it with the browser upon startup.
  - Strict `.gitignore` prevents secrets from ever being committed to git.
  - Runs with standard Node.js built-in modules (`http`, `https`, `fs`, `path`, `url`).

---

## 📂 Project Structure

| File / Folder | What it is |
|---|---|
| [`index.html`](file:///D:/NBLMimic%20project/NBLMimic/index.html) | The primary single-page web app and research interface |
| [`server.js`](file:///D:/NBLMimic%20project/NBLMimic/server.js) | Built-in zero-dependency Node.js HTTP server + secure API & live news proxy |
| [`js/liquid-glass.js`](file:///D:/NBLMimic%20project/NBLMimic/js/liquid-glass.js) | Aceternity UI Snell's law optical displacement engine |
| [`css/liquid-glass.css`](file:///D:/NBLMimic%20project/NBLMimic/css/liquid-glass.css) | Liquid glass surface geometry and ambient glow styles |
| [`js/glass-folder-cards.js`](file:///D:/NBLMimic%20project/NBLMimic/js/glass-folder-cards.js) | 3D glass folders and procedural liquid fluid canvases |
| [`css/glass-folder-cards.css`](file:///D:/NBLMimic%20project/NBLMimic/css/glass-folder-cards.css) | 3D folder perspective transforms and card styling |
| [`js/sources-reader.js`](file:///D:/NBLMimic%20project/NBLMimic/js/sources-reader.js) | PDF FlateDecode parser, Google Docs reader, and file auto-sort |
| [`start.bat`](file:///D:/NBLMimic%20project/start.bat) | 1-Click Windows launcher (starts the server and opens `http://localhost:3000`) |
| [`.env.example`](file:///D:/NBLMimic%20project/NBLMimic/.env.example) | Template for environment variables (`GEMINI_API_KEY`, `PORT`, `GOOGLE_CLIENT_ID`) |
| [`.gitignore`](file:///D:/NBLMimic%20project/NBLMimic/.gitignore) | Git exclusion rules preventing `.env` and secrets from being committed |

---

## 🚀 How to Run Locally

### Option 1: 1-Click Launch with `start.bat` (Windows)
Double-click `start.bat` in the project root. It launches the local server and opens your browser directly to `http://localhost:3000`.

### Option 2: Terminal / Command Line
1. Navigate to the project directory:
   ```bash
   cd NBLMimic
   ```
2. Ensure your `.env` contains your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔒 Security & Privacy

- **Protected Secrets:** `.env` and credentials files are permanently ignored by `.gitignore`.
- **Zero Third-Party Trackers:** No telemetry, tracking, or ads.
- **Client-Side Cryptography:** Documents stored in local vaults are encrypted with AES-GCM-256.

---

## 🛠️ Roadmap & Features Completed

- [x] Base 3-panel UI & design tokens (`index.html`, `tokens.css`)
- [x] Aceternity UI Liquid Glass component with Snell's law refraction & chromatic aberration
- [x] Interactive 3D glass research folders with procedural fluid art presets (Aurora, Glacier, Ember, Dusk, Verdant)
- [x] Automated format sorting (PDFs, Google Docs, Manuscripts, Code, Spreadsheets)
- [x] Google Drive Cloud Vault integration with encrypted local caching and document streaming
- [x] Distraction-free reader with native PDF FlateDecode parsing & Google Docs formatted typography
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


---

## 📄 License

This project is open-source and licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)** — see the [`LICENSE`](LICENSE) file for details.

- **Non-Commercial:** Anyone can inspect, fork, customize, and add features to the code, but they are strictly prohibited from selling the software, paid distribution on app stores (e.g. Google Play Store), or monetizing derivatives.
- **ShareAlike:** Any modified versions or forks must remain free under the exact same license terms.
- **Attribution:** Original credit to `Hanzo023 & tasukare` must be preserved.
