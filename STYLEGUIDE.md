# Research Lab — Style Guide

> A private, self-hosted research and knowledge management interface. Privacy-first. Typography-driven. Built to last.

---

## Design Philosophy

| Principle | Implementation |
|-----------|---------------|
| **Information density without clutter** | Three-panel layout, 8px spacing grid, purposeful whitespace |
| **Trust through craftsmanship** | No gradients on components, consistent use of color meaning, precise alignment |
| **Speed perception** | Skeleton loaders (not spinners), 150ms transitions, optimistic UI |
| **Timeless, not trendy** | System font stack, stone/neutral palette, no trend-dependent effects |

---

## Typography

### Font Stack

| Role | Stack |
|------|-------|
| **UI** | `'Inter'`, `'SF Pro Display'`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `system-ui`, `sans-serif` |
| **Prose** | `'Charter'`, `'Georgia'`, `'Iowan Old Style'`, `'Times New Roman'`, `serif` |
| **Code** | `'JetBrains Mono'`, `'Fira Code'`, `'Consolas'`, `'Monaco'`, `monospace` |

> **Offline note:** Inter is loaded via Google Fonts (optional). In production, bundle the variable font locally or fall back gracefully to `system-ui`.

### Type Scale

| Token | Size | Weight | Tracking | Line-height | Usage |
|-------|------|--------|----------|-------------|-------|
| `--text-h1` | 32px | 600 | −0.02em | 1.3 | Page titles |
| `--text-h2` | 24px | 600 | −0.01em | 1.3 | Section headers |
| `--text-h3` | 18px | 600 | 0 | 1.3 | Subsections |
| `--text-body` | 15px | 400 | 0 | 1.6 | Main text |
| `--text-small` | 13px | 400 | 0 | 1.5 | Metadata, labels |
| `--text-tiny` | 11px | 500 | +0.06em | — | Uppercase badges, section labels |

### Rules

- **Weights:** 400, 500, 600 only — never below 400, never above 600 for UI text
- **Measure:** 65–75 characters for reading comfort in document views
- **Tabular numbers:** Always use `font-variant-numeric: tabular-nums` for dates, counts, file sizes
- **Truncation:** Always truncate with `text-overflow: ellipsis` — never clip mid-character

---

## Color Palette

### Light Mode (Default)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FAFAF9` | Main background — warm white, not pure |
| `--bg-secondary` | `#F5F5F4` | Sidebar, panels, input backgrounds |
| `--bg-tertiary` | `#E7E5E4` | Hover states, skeleton loaders |
| `--text-primary` | `#1C1917` | Main readable text |
| `--text-secondary` | `#57534E` | Metadata, secondary labels |
| `--text-tertiary` | `#A8A29E` | Disabled states, hints, placeholders |
| `--border` | `#E7E5E4` | Subtle dividers |
| `--border-strong` | `#D6D3D1` | Emphasized dividers, focus states |
| `--accent` | `#2563EB` | Primary actions only |
| `--accent-hover` | `#1D4ED8` | Accent hover state |
| `--success` | `#059669` | Confirmations |
| `--warning` | `#D97706` | Alerts |
| `--danger` | `#DC2626` | Destructive actions |

### Dark Mode

| Token | Value |
|-------|-------|
| `--bg-primary` | `#1C1917` |
| `--bg-secondary` | `#292524` |
| `--bg-tertiary` | `#3F3F46` |
| `--text-primary` | `#FAFAF9` |
| `--text-secondary` | `#D6D3D1` |
| `--text-tertiary` | `#78716C` |
| `--border` | `#3F3F46` |
| `--border-strong` | `#52525B` |

> Accent, success, warning, and danger colors remain identical in dark mode for semantic consistency.

### Color Usage Rules

- **Accent = action only.** Never use accent color for decoration.
- **One semantic, one meaning.** Red = danger/destructive. Green = success/confirmed. Yellow = caution.
- **No gradients** on interactive components. One subtle gradient is permitted for logo/brand marks only.

---

## Layout

### Three-Panel Grid

```
┌─────────────────────────────────────────────────────┐
│ Header (56px, full-width)                           │
├────────────┬──────────────────────┬─────────────────┤
│ Sidebar    │ Main Content         │ Side Panel      │
│ 240px      │ flexible (1fr)       │ 320px           │
│ (fixed)    │                      │ (collapsible)   │
└────────────┴──────────────────────┴─────────────────┘
```

- **Collapse behavior:** Side panel collapses to `0px` via CSS grid `grid-template-columns` transition
- **Mobile (≤768px):** Sidebar = bottom-anchored drawer, Side panel = right slide-in, main content fills full width

### Spacing Scale (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Compact: badges, tight icon gaps |
| `--space-2` | 8px | Default gap between related elements |
| `--space-3` | 12px | Between component groups |
| `--space-4` | 16px | Between sections, card padding |
| `--space-6` | 24px | Between major blocks, chat messages |
| `--space-8` | 32px | Page padding, modal inner spacing |
| `--space-10` | 40px | Input height |
| `--space-12` | 48px | Large section spacing |

---

## Components

### Document Card

```
┌──────────────────────────────────────┐  ← 8px radius, 1px border
│ [Icon 36×36] Title (2 lines max)     │  ← 16px padding
│              Source URL              │
│                                      │
│ Excerpt text (2 lines max)           │
│                                      │
│ [tag] [tag]                  Jan 15  │
└──────────────────────────────────────┘
    ↑ On hover: shadow-sm lifts card, action buttons fade in at top-right
```

- Border: `1px solid var(--border)`
- Hover: `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`
- Transition: `150ms ease-out`
- Animation on load: `translateY(4px)` → `translateY(0)`, 200ms, staggered by 30ms

### Chat Bubbles

| Property | User | AI |
|----------|------|----|
| Alignment | Right | Left |
| Background | `var(--accent)` | `var(--bg-secondary)` |
| Text color | `#fff` | `var(--text-primary)` |
| Corner radius | 12px, 2px bottom-right | 12px, 2px bottom-left |
| Max-width | 680px | 680px |
| Padding | 12px 16px | 12px 16px |
| Border | none | `1px solid var(--border)` |

### Input Fields

- Height: `40px`
- Border: `1.5px solid var(--border)`
- Focus: border → `var(--accent)`, `box-shadow: 0 0 0 3px rgba(37,99,235,0.08)`
- Radius: `6px`
- Padding: `0 12px` (search: `0 12px 0 34px`)
- Placeholder: `var(--text-tertiary)`

### Buttons

| Variant | Background | Color | Border | Height | Padding |
|---------|-----------|-------|--------|--------|---------|
| Primary | `var(--accent)` | `#fff` | none | 36px | `0 16px` |
| Secondary | transparent | `var(--text-primary)` | `1.5px solid var(--border)` | 36px | `0 14px` |
| Ghost | transparent | `var(--text-secondary)` | none | 36px | `0 12px` |
| Danger | `var(--danger-light)` | `var(--danger)` | none | 36px | `0 14px` |
| Icon | transparent | `var(--text-secondary)` | none | 32px | square |

Size modifier `.btn-sm`: height 28px, font-size `11px`.

### Sidebar Navigation Items

- Default: 13px, 400 weight, `var(--text-secondary)`
- Hover: `background: var(--bg-tertiary)`
- Active: `border-left: 3px solid var(--accent)`, `background: var(--accent-subtle)`, `color: var(--accent)`, 500 weight
- Icons: 16×16px, 8px gap to label
- Section headers: 11px, 500, uppercase, 0.06em tracking, `var(--text-tertiary)`

---

## Interaction Patterns

### Loading States

| Situation | Pattern |
|-----------|---------|
| Document grid loading | Skeleton cards (pulsing gray blocks, 1.6s ease-in-out) |
| AI response generating | Typing indicator (3 animated dots, scale pulse) |
| File uploading | Progress bar fills with `width` transition |
| Button submitting | Do not add spinner; rely on skeleton/progress elsewhere |

> **Never** use a full-page spinner. Use skeleton screens that reflect the shape of real content.

### Micro-interactions

| Element | Behavior | Duration |
|---------|----------|---------|
| Card hover | Lift with `shadow-sm`, no transform | 150ms |
| Button click | `scale(0.96)` on `:active` | 100ms |
| Send button hover | `scale(1.05)` | 100ms |
| Modal open | Scale `0.96 → 1.0` + backdrop fade | 200ms |
| Source pill hover | Border → accent, text → accent | 100ms |
| Toast in | `translateY(8px) → 0`, fade in | 200ms |
| Theme transition | `background`, `color` smooth | 200ms |

### Empty States

```
      [64×64 icon, bg-secondary, border]
         No documents yet
    Upload your first source to get started
         [Primary Button: Import Source]
```

Never: overwhelming wizard, confetti, marketing copy.

---

## Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | All interactive elements have `:focus-visible` outline: `2px solid var(--accent)`, `2px offset` |
| Screen readers | `aria-label` on icon-only buttons, `role="dialog"` + `aria-modal` on modals, `role="tab"` + `aria-selected` on tabs |
| Color contrast | All text combinations meet 4.5:1 minimum (WCAG AA) |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` sets all durations to 0.01ms |
| Touch targets | Min 44×44px on mobile (achieved via padding expansion) |
| Live regions | `aria-live="polite"` on toast stack |
| Custom checkboxes | `role="checkbox"`, `aria-checked`, keyboard: Space/Enter to toggle |

---

## What Makes This Not Look Generic

1. **Stone/warm neutral palette** — Not blue-gray (Tailwind default), not pure black/white
2. **Inter at precise weights** — 400/500/600 only, optical letter-spacing on headings
3. **Serif for document excerpts** — Charter/Georgia for long-form content, not sans-serif everywhere
4. **Asymmetric border-radius on chat bubbles** — 12px except the "tail" corner (2px), like real messaging apps
5. **Skeleton loaders shaped like real content** — Icon + two lines, not a generic rectangle
6. **3px left-border accent on active nav** — Subtle but distinctive active indicator
7. **Real content** — Actual document titles, real academic authors, proper citation format
8. **Tabular numbers everywhere** — Dates, counts, file sizes use `font-variant-numeric: tabular-nums`
9. **Warm dark mode** — `#1C1917` base (not `#000` or `#1F2937`), matching the light mode's stone family
10. **Shadow discipline** — Only two shadow uses: hover lift on cards, modal elevation. No box shadows on buttons.

---

## File Structure

```
research-lab/
├── index.html          ← Complete self-contained interface
├── tokens.css          ← Design tokens (CSS custom properties)
└── STYLEGUIDE.md       ← This document
```

The `index.html` is fully self-contained with inline CSS and JavaScript — no build step, no dependencies, works offline immediately.
