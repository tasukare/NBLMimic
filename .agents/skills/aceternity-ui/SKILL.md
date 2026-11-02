---
name: aceternity-ui
description: >-
  Add, search, inspect, and integrate Aceternity UI components (https://ui.aceternity.com)
  using the `aceternity-ui` CLI and MCP tools. Use whenever the user asks to add or search
  Aceternity UI components, mentions visual motion effects (such as 3D cards, background beams,
  spotlight, sparkles, lamp, floating navbar, tracing beam, card hover effects), or types /aceternity-ui.
---

# Aceternity UI — Modern Motion & 3D Components

Aceternity UI provides animated UI components built with React, Tailwind CSS, and Framer Motion.
This skill allows agents and users to search, install, and adapt Aceternity UI components into the project.

---

## 1. CLI Commands

The `aceternity-ui` CLI is installed globally and can be invoked directly from the terminal or chat:

```bash
# Add a component to the project
aceternity-ui add <component-name>

# Add a component with full demo and example code
aceternity-ui add <component-name> --example

# Add multiple components at once
aceternity-ui add 3d-card spotlight background-beams

# Overwrite existing component files without prompt
aceternity-ui add <component-name> --overwrite -y

# Specify target installation directory
aceternity-ui add <component-name> --path components/ui
```

You can also run it via `npx`:
```bash
npx aceternity-ui@latest add <component-name>
```

---

## 2. Popular Aceternity Components

| Category | Component Names | Description |
| :--- | :--- | :--- |
| **Backgrounds** | `background-beams`, `background-gradient`, `sparkles`, `aurora-background`, `wavy-background`, `lamp` | Ambient procedural particle, glow, and wave backdrops. |
| **3D & Depth** | `3d-card`, `3d-pin`, `card-hover-effect`, `card-stack`, `glare-card`, `canvas-reveal-effect` | Perspective tilt, dynamic shadows, and interactive 3D matrices. |
| **Borders & Glow**| `spotlight`, `moving-border`, `tracing-beam`, `hover-border-gradient` | Cursor-tracking highlights and animated SVG border strokes. |
| **Typography** | `text-generate-effect`, `typewriter-effect`, `text-reveal-card`, `flip-words` | Staggered token reveals, typewriter loops, and interactive masks. |
| **Navigation** | `floating-navbar`, `bento-grid`, `timeline`, `navbar-menu` | Modern floating navigation docks and structured card grids. |

---

## 3. Workflow & Adaptation Rules

1. **Search & Discovery**:
   - Query component details using the `aceternity-ui-mcp-server` MCP tools (`search_components`, `get_component`, `list_components`) or the CLI.
2. **Framework Alignment**:
   - **React / Tailwind Projects**: Run `aceternity-ui add <name>`. Components and utility functions are placed in `components/ui/` and `lib/utils.ts`.
   - **Vanilla JS / CSS Projects** (like `NBLMimic`): 
     - Pull the component definition via CLI or MCP.
     - Port the underlying CSS 3D transforms, Canvas 2D render loop, or SVG filters into clean native CSS and ES6 modules (as done for the 3D Glass Folders).
3. **Accessibility & Performance**:
   - Respect `prefers-reduced-motion` for heavy GPU animations.
   - Optimize high-frequency canvas loops using `requestAnimationFrame` with proper cleanup when elements leave the viewport.
