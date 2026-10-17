# AGENTS.md — AI Developer & Agent Guidelines

Welcome, AI coding assistant! This repository contains **NBLMimic** (Research Lab), a private, self-hosted research and knowledge management interface mimicking NotebookLM, using Google Drive as a personal database and storage layer.

Please read and adhere strictly to the conventions and rules described in this file.

---

## 1. Project Overview & Philosophy

- **Goal:** Create a privacy-first, distraction-free knowledge notebook and research interface inspired by Google NotebookLM.
- **Storage & Database:** Privacy-first design using Google Drive API and local storage for user notes, sources, and knowledge graphs.
- **Tech Stack:** 
  - Standard, dependency-light web technologies (HTML5, Modern CSS, Vanilla ES6+ JavaScript).
  - Fast, responsive, accessible, and self-contained with minimal external build requirements.
- **Design Core:** Typography-driven, clean stone/neutral palette, 8px grid system, and high information density without clutter.

---

## 2. Key Repository Files

| File | Purpose |
|------|---------|
| `index.html` | The main interactive application shell and single-page interface |
| `components.html` | The component showcase and UI pattern library |
| `tokens.css` | Global CSS design tokens (colors, typography, spacing, shadows, radii) |
| `STYLEGUIDE.md` | Comprehensive design and styling specification — **mandatory reading before UI changes** |
| `README.md` | Human-facing project description and setup instructions |
| `AGENTS.md` | AI agent instruction manual and coding standards (this file) |

---

## 3. Strict Development Rules for Agents

### Design & Styling
1. **Always Consult `STYLEGUIDE.md` First:**
   - Use the CSS custom properties defined in `tokens.css` (e.g. `var(--bg-primary)`, `var(--text-primary)`, `var(--accent)`).
   - Do **NOT** hardcode arbitrary hex colors or random pixel margins.
   - Respect the 8px spacing grid (`8px`, `16px`, `24px`, etc.).
   - Follow the font hierarchy:
     - UI: `'Inter'`, system font stack
     - Prose/Reading: `'Charter'`, `'Georgia'`, serif
     - Code: `'JetBrains Mono'`, `'Fira Code'`, monospace
2. **Theme Support:** Ensure any newly introduced UI works seamlessly in both Light and Dark modes.
3. **Animations & Performance:** Keep transitions fast (150ms–200ms) and use skeleton loaders rather than generic blocking spinners.

### Architecture & Code Quality
1. **Keep It Lightweight:** Avoid introducing heavy npm dependencies or complex build steps unless explicitly requested by the maintainer.
2. **Modular & Maintainable:** Structure JavaScript functions logically by domain (e.g., UI rendering, Google Drive sync, state management, search/indexing).
3. **Privacy First:** Never send user notes, API keys, or uploaded source documents to unauthenticated third-party services.
4. **Git Etiquette:** Write concise, conventional commit messages when committing changes (e.g. `feat: add document citation view`, `fix: dark mode contrast in sidebar`).

---

## 4. Useful Development Commands

To preview the app locally:
```bash
# Python 3 built-in HTTP server:
python3 -m http.server 8000

# Or using Node:
npx serve .
```

To sync changes with GitHub:
```bash
git pull
git add .
git commit -m "Your descriptive message"
git push
```
