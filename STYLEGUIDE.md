# Research Lab — Design Style Guide

> A private, self-hosted research and knowledge management interface inspired by Google NotebookLM, Linear, and Readwise Reader. Privacy-first. Typography-driven. Built to last.

---

## 1. Design Philosophy & Anti-Slop Rules

| Principle | Implementation |
|-----------|---------------|
| **Zero Emojis in the UI** | Replace all emojis with crisp 1.5px stroke inline Lucide SVGs (`14px`–`16px`). |
| **No Badge Clutter** | Eliminate neon badges and redundant context pills; use subtle monochrome file icons and muted metadata. |
| **Information Density without Clutter** | Three-panel studio layout, 4px/8px spacing grid, purposeful whitespace, resizable splitters. |
| **Trust through Craftsmanship** | Hairline `1px solid` borders (`--border-subtle`, `--border-strong`), subtle surface elevation, zero neon drop shadows. |
| **Speed & Tactile Perception** | Fast micro-interactions (`120ms` cubic-bezier), skeleton loaders, optimistic UI updates. |
| **Editorial Reading Measure** | `65ch` optimal measure with classic serif prose (`Charter`, `Newsreader`, `Georgia`) at `17px` with `1.75` line height. |

---

## 2. Typography

### Font Stack

| Role | Font Family Stack | Size | Tracking | Line-Height |
|------|-------------------|------|----------|-------------|
| **UI & Controls** | `'Inter'`, `-apple-system`, `BlinkMacSystemFont`, `system-ui`, sans-serif | `13px` base | `-0.01em` | `1.45`–`1.5` |
| **Reader & Notes Prose** | `'Charter'`, `'Newsreader'`, `'Georgia'`, `'Iowan Old Style'`, serif | `17px` body | `0` | `1.75` |
| **Citations & Metadata** | `'JetBrains Mono'`, `'Fira Code'`, monospace | `11.5px` | `0` | `1.2`–`1.4` |

### Rules
- **Weights:** 400 (regular), 500 (medium), 600 (semibold) only. Never bold beyond 600.
- **Tabular Numbers:** Always apply `font-variant-numeric: tabular-nums` to dates, counts, and file sizes.
- **Reading Measure:** Body prose clamped to `65ch` (`--measure-prose`) for optimal ocular tracking.
- **Truncation:** Use `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` — never clip mid-glyph.

---

## 3. Unified Color Palette & Tokens

### Light Mode (Warm Stone & Natural Minerals)

| Token | Hex Value | Semantic Purpose |
|-------|-----------|------------------|
| `--bg-canvas` | `#FAFAF9` | Warm stone base canvas |
| `--bg-surface` | `#FFFFFF` | Surface elevation (cards, header, panels) |
| `--bg-subtle` | `#F5F5F4` | Input backgrounds, segmented track |
| `--bg-muted` | `#E7E5E4` | Skeleton bars, active tab highlights |
| `--border-subtle` | `#E7E5E4` | 1px hairline dividers |
| `--border-strong` | `#D6D3D1` | Input outlines, card boundaries |
| `--border-focus` | `#1C1917` | High-contrast focus state |
| `--text-primary` | `#1C1917` | Main readable text (warm charcoal) |
| `--text-secondary` | `#57534E` | Metadata, secondary labels |
| `--text-tertiary` | `#A8A29E` | Disabled text, subtle hints |
| `--accent` | `#1C1917` | Editorial primary action button |
| `--accent-contrast` | `#FFFFFF` | Text on primary button |
| `--success` | `#059669` | Muted emerald signal |
| `--warning` | `#D97706` | Muted amber alert |
| `--danger` | `#DC2626` | Destructive action |

### Dark Mode (Deep Charcoal & Graphite Zinc)

| Token | Hex Value | Semantic Purpose |
|-------|-----------|------------------|
| `--bg-canvas` | `#121214` | Deep neutral base canvas |
| `--bg-surface` | `#18181B` | Zinc 900 panel surfaces |
| `--bg-subtle` | `#202023` | Dark input backgrounds |
| `--bg-muted` | `#27272A` | Elevated surfaces |
| `--border-subtle` | `#27272A` | 1px dark hairline dividers |
| `--border-strong` | `#3F3F46` | Zinc 700 outlines |
| `--border-focus` | `#F4F4F5` | Pure light focus ring |
| `--text-primary` | `#F4F4F5` | High-contrast readable text |
| `--text-secondary` | `#A1A1AA` | Secondary labels |
| `--text-tertiary` | `#71717A` | Metadata |
| `--accent` | `#F4F4F5` | Crisp light primary action |
| `--accent-contrast` | `#18181B` | Text on dark mode primary button |

---

## 4. 3-Pane Studio Layout & Components

### Layout Dimensions

- **Command Header:** Fixed `48px` height with minimal breadcrumb, centered `⌘K` spotlight trigger, and compact right icon controls.
- **Left Pane (Source Library):** Resizable between `240px` and `440px` (default `280px`).
- **Center Pane (Document Canvas):** Flexible `1fr` with mode switcher (`Reader View` vs `Native Drive Preview` vs `Split View`) and metadata breadcrumb bar.
- **Right Pane (Synthesis Studio):** Resizable between `320px` and `600px` (default `380px`) with tabs for `Research Chat` and `Lab Notes`.

### Component Standards

1. **Source Rows:**
   - Custom 14px checkbox for grounding selection.
   - Monochrome SVG file type icon (`file-text` for docs, `file-pdf` for PDFs, `file-spreadsheet` for sheets, `file` for notes).
   - Minimal 1-line Drive storage meter in sidebar footer.
2. **Segmented Filter Bar:**
   - 5 compact segments (`All`, `Drive`, `Docs`, `PDFs`, `Notes`) plus a clean topic tag dropdown. Sprawling 16-tab horizontal carousels with arrow buttons are banned.
3. **Editorial Research Chat:**
   - User messages: subtle minimal right-aligned pill (`background: var(--bg-subtle)`).
   - AI messages: full-width structured research brief (no heavy bubble) with interactive superscript `[1]` citation chips linking to sources.
4. **Composer Dock:**
   - Raycast-style floating composer box anchored at the bottom with integrated compact model selector (`3.5 Flash-Lite`, `3.5 Flash`, `3.8 Flash`), inline voice dictation mic, and quick chips (`Audio Overview`, `Summarize All`).
5. **Gemini Live Voice Bar:**
   - Floating glassmorphic audio bar in the workspace featuring a real-time canvas waveform visualizer, mute/interrupt buttons, and collapsible transcript drawer.
