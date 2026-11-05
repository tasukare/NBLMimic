/**
 * NBLMimic — Glass Folder Cards Module
 * Native ES6 Port of @kedhareswer/glass-folder-cards (21st.dev / shadcn)
 * Pure Canvas 2D liquid procedural art & CSS 3D frosted-glass folder cards.
 */

import { openModal, showToast, escapeHtml, showLiquidConfirm, showLiquidPrompt } from './ui.js';
import { state } from './state.js';

// Procedural Art Presets
export const ART_PRESETS = {
  aurora: {
    style: "streak",
    colors: ["#f4efe9", "#e9c2b8", "#c2433f", "#2a1e2a", "#22395e", "#6f97c2", "#e5edf4"],
    scale: 0.7,
    warp: 1.4,
    angle: -0.62,
    gloss: 0.18,
    veins: 0,
  },
  ember: {
    style: "marble",
    colors: ["#08080a", "#1b0a0a", "#8a1c14", "#d94b26", "#f0a85d", "#fff2db"],
    scale: 0.65,
    warp: 3.2,
    angle: 0.35,
    gloss: 0.55,
    veins: 0.35,
  },
  dusk: {
    style: "streak",
    colors: ["#0f172a", "#312e81", "#6366f1", "#ec4899", "#fbbf24", "#fef3c7"],
    scale: 0.75,
    warp: 2.1,
    angle: -0.4,
    gloss: 0.25,
  },
  glacier: {
    style: "marble",
    colors: ["#020b14", "#0a2540", "#0077b6", "#48cae4", "#ade8f4", "#f0f9ff"],
    scale: 0.68,
    warp: 2.8,
    angle: 0.8,
    gloss: 0.65,
    veins: 0.2,
  },
  verdant: {
    style: "streak",
    colors: ["#061a12", "#0f3824", "#1e6b45", "#52b788", "#b7e4c7", "#f2faf5"],
    scale: 0.7,
    warp: 1.8,
    angle: 0.2,
    gloss: 0.3,
  }
};

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, "$&$&");
  const v = parseInt(h.slice(0, 6), 16) || 0;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}


function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s ^ (s << 13)) >>> 0;
    s = (s ^ (s >>> 17)) >>> 0;
    s = (s ^ (s << 5)) >>> 0;
    return (s >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function makeFbm(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const grad = new Float32Array(512);
  const p = [];
  for (let i = 0; i < 256; i++) p.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) {
    const a = r() * Math.PI * 2;
    grad[i * 2] = Math.cos(a);
    grad[i * 2 + 1] = Math.sin(a);
  }

  const noise = (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const h00 = perm[X + perm[Y]] * 2;
    const h10 = perm[X + 1 + perm[Y]] * 2;
    const h01 = perm[X + perm[Y + 1]] * 2;
    const h11 = perm[X + 1 + perm[Y + 1]] * 2;
    const d00 = grad[h00] * xf + grad[h00 + 1] * yf;
    const d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf;
    const d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1);
    const d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    return d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00));
  };

  return (x, y, octaves) => {
    let sum = 0;
    let amp = 0.5;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x, y);
      const nx = 1.6 * x + 1.2 * y + 7.1;
      y = -1.2 * x + 1.6 * y + 3.3;
      x = nx;
      amp *= 0.5;
    }
    return sum;
  };
}

export function createArtJob(width, height, recipe, seed) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const colors = recipe.colors.length >= 2 ? recipe.colors : ["#111111", "#eeeeee"];
  const stops = colors.map((c, i) => ({ t: i / (colors.length - 1), c: hexToRgb(c) }));
  const scale = recipe.scale ?? 0.7;
  const warp = recipe.warp ?? 3;
  const gloss = recipe.gloss ?? 0.4;
  const veins = recipe.veins ?? 0;
  const streak = recipe.style === "streak";
  const fbm = makeFbm(seed * 977 + 13);
  const r = rng(seed + 1);
  const ox = r() * 50;
  const oy = r() * 50;
  const angle = (recipe.angle ?? 0) + (r() - 0.5) * 0.5;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const m = Math.min(w, h);

  const gw = Math.ceil(w / 2) + 3;
  const gh = Math.ceil(h / 2) + 3;
  const G = new Float32Array(gw * gh);
  const GQ = new Float32Array(gw * gh);
  const F = new Float32Array(w * h);
  const Q = new Float32Array(w * h);
  const pixels = new Uint8ClampedArray(w * h * 4);
  let row = 0;

  const field = (gy) => {
    for (let gx = 0; gx < gw; gx++) {
      const u = ((gx - 1) * 2 - w / 2) / m;
      const v = ((gy - 1) * 2 - h / 2) / m;
      let px = (u * ca - v * sa) * scale;
      let py = (u * sa + v * ca) * scale;
      if (streak) {
        px *= 0.14;
        py *= 2.2;
      }
      px += ox;
      py += oy;
      const qx = fbm(px, py, 3);
      const qy = fbm(px + 5.2, py + 1.3, 3);
      const rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2, 3);
      const ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8, 3);
      G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry, 4);
      GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy);
    }
  };

  const upsample = () => {
    const cr = (a, b, c, d) => (-a + 9 * b + 9 * c - d) / 16;
    const T = new Float32Array(w * gh);
    for (let gy = 0; gy < gh; gy++) {
      const r = gy * gw;
      for (let x = 0; x < w; x++) {
        const c = (x >> 1) + 1;
        T[gy * w + x] = x & 1 ? cr(G[r + c - 1], G[r + c], G[r + c + 1], G[r + c + 2]) : G[r + c];
      }
    }
    for (let y = 0; y < h; y++) {
      const c = (y >> 1) + 1;
      for (let x = 0; x < w; x++) {
        F[y * w + x] = y & 1 ? cr(T[(c - 1) * w + x], T[c * w + x], T[(c + 1) * w + x], T[(c + 2) * w + x]) : T[c * w + x];
        const gx = (x >> 1) + 1;
        const q0 = GQ[c * gw + gx];
        const qx = x & 1 ? (q0 + GQ[c * gw + gx + 1]) / 2 : q0;
        const q1 = y & 1 ? (x & 1 ? (GQ[(c + 1) * gw + gx] + GQ[(c + 1) * gw + gx + 1]) / 2 : GQ[(c + 1) * gw + gx]) : qx;
        Q[y * w + x] = (qx + q1) / 2;
      }
    }
  };

  const colorize = () => {
    const sample = [];
    const stride = Math.max(1, Math.floor(F.length / 4096));
    for (let i = 0; i < F.length; i += stride) sample.push(F[i]);
    sample.sort((a, b) => a - b);
    const lo = sample[Math.floor(sample.length * 0.02)] || 0;
    const hi = sample[Math.floor(sample.length * 0.98)] || 1;
    const k = 1 / (hi - lo || 1);
    const lx = -0.55;
    const ly = -0.65;
    const lz = 0.52;
    const slope = k * m * 0.012;

    for (let y = 0; y < h; y++) {
      const ym = Math.max(0, y - 1);
      const yp = Math.min(h - 1, y + 1);
      for (let x = 0; x < w; x++) {
        const xm = Math.max(0, x - 1);
        const xp = Math.min(w - 1, x + 1);
        const val = (F[y * w + x] - lo) * k;
        const t = Math.max(0, Math.min(1, val));
        let s = 0;
        while (s < stops.length - 2 && stops[s + 1].t < t) s++;
        const span = stops[s + 1].t - stops[s].t || 1;
        const f = (t - stops[s].t) / span;
        const c0 = stops[s].c;
        const c1 = stops[s + 1].c;
        let red = c0[0] + (c1[0] - c0[0]) * f;
        let grn = c0[1] + (c1[1] - c0[1]) * f;
        let blu = c0[2] + (c1[2] - c0[2]) * f;

        const dx = (F[y * w + xp] - F[y * w + xm]) * slope;
        const dy = (F[yp * w + x] - F[ym * w + x]) * slope;
        const len = Math.hypot(dx, dy, 1);
        const nx = -dx / len;
        const ny = -dy / len;
        const nz = 1 / len;
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const hx = lx;
        const hy = ly;
        const hz = lz + 1;
        const hlen = Math.hypot(hx, hy, hz);
        const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hlen), 24) * gloss;

        if (veins > 0) {
          const vMask = Math.pow(Math.max(0, Math.min(1, Q[y * w + x] * 0.9)), 2) * veins;
          red *= 1 - vMask * 0.6;
          grn *= 1 - vMask * 0.6;
          blu *= 1 - vMask * 0.6;
        }

        const lit = 0.55 + diff * 0.45;
        const idx = (y * w + x) * 4;
        pixels[idx] = Math.min(255, (red * lit + spec) * 255);
        pixels[idx + 1] = Math.min(255, (grn * lit + spec) * 255);
        pixels[idx + 2] = Math.min(255, (blu * lit + spec) * 255);
        pixels[idx + 3] = 255;
      }
    }
  };

  return {
    width: w,
    height: h,
    pixels,
    step(rows) {
      if (row < gh) {
        const next = Math.min(gh, row + rows);
        for (; row < next; row++) field(row);
        return false;
      }
      upsample();
      colorize();
      return true;
    }
  };
}

const artCanvasCache = new Map();

export async function getArtCanvas(recipe, seed, width, height) {
  const key = `${JSON.stringify(recipe)}_${seed}_${width}_${height}`;
  if (artCanvasCache.has(key)) {
    return artCanvasCache.get(key);
  }

  // Adaptive Resolution Scaling:
  // Render procedural liquid noise at half resolution on low-power or mobile devices,
  // or 0.65 scale on desktop. Bilinear canvas upscale produces a gorgeous soft liquid effect
  // while cutting CPU noise computation by 60% to 75%!
  const isLowTier = typeof navigator !== 'undefined' && (
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (typeof window !== 'undefined' && (window.innerWidth <= 1024 || window.matchMedia?.('(pointer: coarse)').matches))
  );
  const scale = isLowTier ? 0.5 : 0.65;
  const genW = Math.max(64, Math.round(width * scale));
  const genH = Math.max(64, Math.round(height * scale));

  const job = createArtJob(genW, genH, recipe, seed);
  while (!job.step(genH * 2)) {}

  const offscreen = document.createElement("canvas");
  offscreen.width = genW;
  offscreen.height = genH;
  const offCtx = offscreen.getContext("2d");
  const imgData = new ImageData(job.pixels, genW, genH);
  offCtx.putImageData(imgData, 0, 0);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, width, height);

  artCanvasCache.set(key, canvas);
  return canvas;
}

// Geometry constants for SVG clip-paths
const W = 340;
const H = 272;
const FRONT_TOP = 74;
const FRONT_H = H - FRONT_TOP;
const SHEET_W = 272;
const SHEET_H = 184;

const BACK_PATH =
  "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z";
const FRONT_PATH =
  "M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 " +
  (FRONT_H - 22) +
  "A22 22 0 0 1 318 " +
  FRONT_H +
  "L22 " +
  FRONT_H +
  "A22 22 0 0 1 0 " +
  (FRONT_H - 22) +
  "Z";

export function fanSlot(index, count) {
  if (count <= 1) return 0;
  return (index / (count - 1)) * 2 - 1;
}

/**
 * Aceternity UI — Expandable Liquid Glass Folder Card Pop-up
 * Pops up an expanded interactive modal with spring physics, fluid procedural art,
 * search filtering, and full-resolution document preview cards.
 */
export function openExpandableFolderCard({
  originEl = null,
  format = "",
  label = "My Files",
  kicker = "",
  meta = "",
  tone = "light",
  art = "aurora",
  seed = 3,
  files = [],
  onFileSelect = null,
  onAdd = null,
  onRename = null,
  onDelete = null,
  onChangeArt = null,
  onClose = null,
}) {
  // 1. Close any currently active expandable modal
  const existing = document.querySelector(".gf-expandable-overlay");
  if (existing && typeof existing.__closeExpandable === "function") {
    existing.__closeExpandable();
  }

  // 2. Lock body scroll
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  let currentArt = art;
  const isDriveAny = files.some(f => f.source === "Google Drive" || !!f.driveFileId);
  const totalCount = files.length;
  const countLabel = totalCount === 1 ? "1 document" : `${totalCount} documents`;
  const subtitle = kicker || (meta ? `${meta}` : `${countLabel} · Click to preview in reader`);

  // 3. Build Overlay Backdrop (z-index: 900)
  const overlay = document.createElement("div");
  overlay.className = "gf-expandable-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `${label} folder`);

  // 4. Build Modal as SIBLING (z-index: 910)
  const modal = document.createElement("div");
  modal.className = "gf-expandable-modal";
  modal.setAttribute("data-tone", tone);

  // Banner with Fluid Procedural Canvas
  const banner = document.createElement("div");
  banner.className = "gf-expandable-banner";

  const bannerCanvas = document.createElement("canvas");
  bannerCanvas.className = "gf-expandable-banner-canvas";
  bannerCanvas.width = 680;
  bannerCanvas.height = 180;

  const sheen = document.createElement("div");
  sheen.className = "gf-expandable-banner-sheen";

  const updateBannerArt = (artKey) => {
    const recipe = typeof artKey === "string" ? (ART_PRESETS[artKey] || ART_PRESETS.aurora) : artKey;
    getArtCanvas(recipe, seed, 680, 180).then((renderedCanvas) => {
      const ctx = bannerCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 680, 180);
        ctx.drawImage(renderedCanvas, 0, 0, 680, 180);
      }
    });
  };
  updateBannerArt(currentArt);

  const bannerTop = document.createElement("div");
  bannerTop.className = "gf-expandable-banner-top";

  const badgeWrap = document.createElement("div");
  badgeWrap.className = "gf-expandable-badge-wrap";

  const formatBadge = document.createElement("span");
  formatBadge.className = `gf-expandable-badge badge-${format || 'doc'}`;
  formatBadge.textContent = (format || 'Collection').toUpperCase();
  badgeWrap.appendChild(formatBadge);

  if (isDriveAny) {
    const driveBadge = document.createElement("span");
    driveBadge.className = "gf-expandable-drive-badge";
    driveBadge.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 87.3 78" style="vertical-align:middle; display:inline-block;"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/><path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z"/></svg>
      <span>Drive Synced</span>
    `;
    badgeWrap.appendChild(driveBadge);
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "gf-expandable-close";
  closeBtn.setAttribute("aria-label", "Close folder");
  closeBtn.title = "Close (Esc)";
  closeBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  bannerTop.appendChild(badgeWrap);
  bannerTop.appendChild(closeBtn);

  const bannerBottom = document.createElement("div");
  bannerBottom.className = "gf-expandable-banner-bottom";
  bannerBottom.innerHTML = `
    <h2 class="gf-expandable-title">${escapeHtml(label)}</h2>
    <div class="gf-expandable-kicker">
      <span>${escapeHtml(subtitle)}</span>
    </div>
  `;

  banner.appendChild(bannerCanvas);
  banner.appendChild(sheen);
  banner.appendChild(bannerTop);
  banner.appendChild(bannerBottom);
  modal.appendChild(banner);

  // 5. Interactive Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "gf-expandable-toolbar";

  const searchWrap = document.createElement("div");
  searchWrap.className = "gf-expandable-search-wrap";
  searchWrap.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    <input type="text" class="gf-expandable-search-input" placeholder="Search files in ${escapeHtml(label)}..." />
  `;

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "gf-expandable-actions";

  const themeSwatches = document.createElement("div");
  themeSwatches.className = "gf-expandable-action-btn btn-theme-swatches";
  themeSwatches.title = "Change Fluid Art Theme";
  themeSwatches.innerHTML = `
    <span style="font-size:10px; color:var(--text-tertiary); margin-right:2px;">Art:</span>
    <div class="gf-expandable-theme-swatches">
      <button type="button" class="gf-expandable-swatch swatch-aurora" data-art="aurora" title="Aurora (Teal/Pink)"></button>
      <button type="button" class="gf-expandable-swatch swatch-glacier" data-art="glacier" title="Glacier (Cyan)"></button>
      <button type="button" class="gf-expandable-swatch swatch-ember" data-art="ember" title="Ember (Gold)"></button>
      <button type="button" class="gf-expandable-swatch swatch-dusk" data-art="dusk" title="Dusk (Violet)"></button>
      <button type="button" class="gf-expandable-swatch swatch-verdant" data-art="verdant" title="Verdant (Emerald)"></button>
    </div>
  `;

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "gf-expandable-action-btn";
  addBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    <span>Add File</span>
  `;

  const renameBtn = document.createElement("button");
  renameBtn.type = "button";
  renameBtn.className = "gf-expandable-action-btn";
  renameBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
    <span>Rename</span>
  `;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "gf-expandable-action-btn btn-action-delete";
  deleteBtn.title = "Delete this folder";
  deleteBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    <span>Delete Folder</span>
  `;
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal(() => {
      if (typeof onDelete === "function") onDelete(label);
    });
  });

  actionsWrap.appendChild(themeSwatches);
  actionsWrap.appendChild(addBtn);
  actionsWrap.appendChild(renameBtn);
  actionsWrap.appendChild(deleteBtn);

  toolbar.appendChild(searchWrap);
  toolbar.appendChild(actionsWrap);
  modal.appendChild(toolbar);

  // 6. Documents Body
  const body = document.createElement("div");
  body.className = "gf-expandable-body";

  const renderFileList = (itemsToRender) => {
    body.innerHTML = "";
    if (!itemsToRender || itemsToRender.length === 0) {
      const empty = document.createElement("div");
      empty.className = "gf-expandable-empty";
      empty.innerHTML = `
        <p style="margin-bottom:12px;">No matching documents in this folder.</p>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-add-file">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span style="margin-left:4px;">Add Document</span>
        </button>
      `;
      empty.querySelector("#btn-empty-add-file")?.addEventListener("click", () => {
        closeModal(() => {
          if (typeof onAdd === "function") onAdd();
        });
      });
      body.appendChild(empty);
      return;
    }

    itemsToRender.forEach((file) => {
      const title = file.title || file.name || "Untitled Document";
      const sizeMeta = file.sizeFormatted || file.meta || "Document";
      const isDrive = file.source === "Google Drive" || !!file.driveFileId;
      const sourceLabel = isDrive ? "Google Drive" : (file.source || "NBLMimic");
      const date = file.date || "Recent";
      const formatType = classifyFileFormat(file);
      const tag = (file.badge || (
        formatType === "pdf" ? "PDF" :
        formatType === "doc" ? "DOCX" :
        formatType === "sheet" ? "SHEET" :
        formatType === "slide" ? "SLIDES" :
        formatType === "note" ? "NOTE" : "FILE"
      )).toUpperCase();

      const excerpt = file.excerpt ||
        (file.content && typeof file.content === "string" ? file.content.replace(/^#+\s+/gm, "").slice(0, 160) + "..." :
        `Synchronized ${tag} document ready for grounded multimodal research and AI synthesis.`);

      const itemCard = document.createElement("div");
      itemCard.className = "gf-expandable-item";
      itemCard.setAttribute("data-file-id", escapeHtml(String(file.id || "")));
      itemCard.innerHTML = `
        <div class="gf-expandable-item-header">
          <span class="gf-sheet-badge badge-${formatType}">${escapeHtml(tag)}</span>
          <span class="gf-sheet-meta">${escapeHtml(sizeMeta)} &middot; ${escapeHtml(date)}</span>
        </div>
        <div class="gf-expandable-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <div class="gf-expandable-item-byline">
          ${isDrive ? `<svg width="10" height="10" viewBox="0 0 87.3 78" style="vertical-align:middle; display:inline-block;"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/><path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z"/></svg>` : ''}
          <span>${escapeHtml(sourceLabel)}</span>
          <span>&middot;</span>
          <span>${escapeHtml(file.category || "Document")}</span>
        </div>
        <p class="gf-expandable-item-excerpt">${escapeHtml(excerpt)}</p>
        <div class="gf-expandable-item-footer">
          <span>Click to inspect full document</span>
          <span class="gf-expandable-item-action">Open in Reader &rarr;</span>
        </div>
      `;

      itemCard.addEventListener("click", (e) => {
        e.stopPropagation();
        closeModal(() => {
          if (typeof onFileSelect === "function") {
            onFileSelect(file, itemCard);
          }
        });
      });

      body.appendChild(itemCard);
    });
  };

  renderFileList(files);
  modal.appendChild(body);
  modal.addEventListener('click', (e) => { e.stopPropagation(); });

  // Mount modal inside full-screen flex overlay directly to document.body
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 7. Measure Coordinates for FLIP Shared-Element Expansion
  const originRect = originEl ? originEl.getBoundingClientRect() : null;
  const targetRect = modal.getBoundingClientRect();

  // 7. Aceternity Expandable Card FLIP Shared-Element Morph from Folder Origin
  if (originRect && originRect.width > 0 && targetRect.width > 0) {
    const scaleX = Math.max(0.15, originRect.width / targetRect.width);
    const scaleY = Math.max(0.15, originRect.height / targetRect.height);
    const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
    const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);

    modal.style.willChange = "transform, opacity, border-radius";
    const openAnim = modal.animate([
      {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        opacity: 0.75,
        borderRadius: "24px"
      },
      {
        transform: "translate3d(0, 0, 0) scale(1, 1)",
        opacity: 1,
        borderRadius: "20px"
      }
    ], {
      duration: 280,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)"
    });

    overlay.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], {
      duration: 250,
      easing: "ease-out"
    });

    openAnim.onfinish = () => {
      modal.style.willChange = "auto";
      modal.style.transform = "";
      const input = modal.querySelector(".gf-expandable-search-input");
      if (input) input.focus();
    };
  } else {
    modal.style.willChange = "transform, opacity";
    const openAnim = modal.animate([
      { opacity: 0, transform: "scale(0.95) translateY(10px)" },
      { opacity: 1, transform: "scale(1) translateY(0px)" }
    ], {
      duration: 200,
      easing: "cubic-bezier(0, 0, 0.2, 1)"
    });
    openAnim.onfinish = () => {
      modal.style.willChange = "auto";
      const input = modal.querySelector(".gf-expandable-search-input");
      if (input) input.focus();
    };
  }

  // 8. Event Handlers & Modal Dismissal (Aceternity Expandable Card Collapse back to Folder)
  let isClosed = false;
  const closeModal = (afterCloseCb) => {
    if (isClosed) return;
    isClosed = true;

    window.removeEventListener("keydown", onKeyDown);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onClose === "function") onClose();
      if (typeof afterCloseCb === "function") afterCloseCb();
    };

    const curOrigin = originEl ? originEl.getBoundingClientRect() : originRect;
    const curTarget = modal.getBoundingClientRect();

    if (curOrigin && curOrigin.width > 0 && curTarget.width > 0) {
      const closeScaleX = Math.max(0.15, curOrigin.width / curTarget.width);
      const closeScaleY = Math.max(0.15, curOrigin.height / curTarget.height);
      const closeDeltaX = (curOrigin.left + curOrigin.width / 2) - (curTarget.left + curTarget.width / 2);
      const closeDeltaY = (curOrigin.top + curOrigin.height / 2) - (curTarget.top + curTarget.height / 2);

      modal.style.willChange = "transform, opacity, border-radius";
      const closeAnim = modal.animate([
        {
          transform: "translate3d(0, 0, 0) scale(1, 1)",
          opacity: 1,
          borderRadius: "20px"
        },
        {
          transform: `translate3d(${closeDeltaX}px, ${closeDeltaY}px, 0) scale(${closeScaleX}, ${closeScaleY})`,
          opacity: 0,
          borderRadius: "24px"
        }
      ], {
        duration: 240,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)"
      });

      overlay.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 220,
        easing: "ease-out"
      });

      closeAnim.onfinish = cleanup;
      setTimeout(cleanup, 280);
    } else {
      overlay.classList.add("is-closing");
      modal.classList.add("is-closing");
      modal.addEventListener("animationend", cleanup, { once: true });
      setTimeout(cleanup, 220);
    }
  };

  overlay.__closeExpandable = closeModal;

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  };
  window.addEventListener("keydown", onKeyDown);

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal();
  });

  overlay.addEventListener("click", (e) => {
    closeModal();
  });

  // Real-time Search Filter Handler
  const searchInput = searchWrap.querySelector(".gf-expandable-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = (e.target.value || "").trim().toLowerCase();
      if (!q) {
        renderFileList(files);
        return;
      }
      const filtered = files.filter(f => {
        const title = (f.title || f.name || "").toLowerCase();
        const excerpt = (f.excerpt || f.content || "").toLowerCase();
        const source = (f.source || "").toLowerCase();
        const cat = (f.category || "").toLowerCase();
        return title.includes(q) || excerpt.includes(q) || source.includes(q) || cat.includes(q);
      });
      renderFileList(filtered);
    });
  }

  // Swatch Theme Switcher
  themeSwatches.querySelectorAll(".gf-expandable-swatch").forEach(dot => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      const newArt = dot.dataset.art;
      currentArt = newArt;
      updateBannerArt(newArt);
      if (typeof onChangeArt === "function") {
        onChangeArt(label, newArt);
      }
    });
  });

  // Action Buttons
  addBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal(() => {
      if (typeof onAdd === "function") onAdd();
    });
  });

  renameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal(() => {
      if (typeof onRename === "function") onRename(label);
    });
  });

  return overlay;
}

/**
 * Creates an interactive 3D Glassmorphism Folder Card DOM Element
 */
export function createGlassFolderCard({
  format = "",
  label = "My Files",
  kicker = "",
  meta = null,
  tone = "light",
  art = "aurora",
  seed = 3,
  files = [],
  action = "more",
  width = 300,
  onFileSelect = null,
  onAdd = null,
  onRename = null,
  onDelete = null,
  onChangeArt = null,
}) {
  const k = width / W;
  const uid = Math.random().toString(36).slice(2, 9);
  const count = files.length;
  const metaText = meta || (count === 1 ? "1 document" : `${count} documents`);

  const root = document.createElement("div");
  root.className = "gf-root";
  root.setAttribute("data-tone", tone);
  root.setAttribute("data-entered", "true");
  root.setAttribute("data-place", "bottom-left");
  root.style.width = `${width}px`;
  root.style.height = `${(H + 54) * k}px`;

  let isOpen = false;

  const stage = document.createElement("div");
  stage.className = "gf-stage";
  stage.style.transform = `translateY(${54 * k}px) scale(${k})`;

  const tilt = document.createElement("div");
  tilt.className = "gf-tilt";

  const shadow = document.createElement("div");
  shadow.className = "gf-shadow";

  // Back panel
  const back = document.createElement("div");
  back.className = "gf-back";
  back.style.clipPath = `path('${BACK_PATH}')`;

  const canvasArt = document.createElement("canvas");
  canvasArt.className = "gf-art";
  canvasArt.width = W + 24;
  canvasArt.height = H + 24;
  canvasArt.style.width = `${W + 24}px`;
  canvasArt.style.height = `${H + 24}px`;

  const recipe = typeof art === "string" ? (ART_PRESETS[art] || ART_PRESETS.aurora) : art;
  getArtCanvas(recipe, seed, W + 24, H + 24).then((renderedCanvas) => {
    const ctx = canvasArt.getContext("2d");
    ctx.drawImage(renderedCanvas, 0, 0);
    canvasArt.setAttribute("data-ready", "true");
  });

  const sheen = document.createElement("div");
  sheen.className = "gf-back-sheen";

  back.appendChild(canvasArt);
  back.appendChild(sheen);

  // Back rim
  const backRim = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  backRim.setAttribute("class", "gf-rim gf-back-rim");
  backRim.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const backPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  backPathEl.setAttribute("d", BACK_PATH);
  backRim.appendChild(backPathEl);

  // Front glass panel
  const front = document.createElement("div");
  front.className = "gf-front";
  front.style.clipPath = `path('${FRONT_PATH}')`;

  const tint = document.createElement("div");
  tint.className = "gf-tint";

  const spec = document.createElement("div");
  spec.className = "gf-spec";

  const frontRim = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  frontRim.setAttribute("class", "gf-rim gf-front-rim");
  frontRim.setAttribute("viewBox", `0 0 ${W} ${FRONT_H}`);

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  grad.setAttribute("id", `gf-rim-${uid}`);
  grad.setAttribute("x1", "0");
  grad.setAttribute("y1", "0");
  grad.setAttribute("x2", "0");
  grad.setAttribute("y2", "1");

  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0");
  stop1.setAttribute("stop-color", "#fff");
  stop1.setAttribute("stop-opacity", "0.95");

  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "0.35");
  stop2.setAttribute("stop-color", "#fff");
  stop2.setAttribute("stop-opacity", "0.35");

  const stop3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop3.setAttribute("offset", "1");
  stop3.setAttribute("stop-color", "#fff");
  stop3.setAttribute("stop-opacity", "0.12");

  grad.appendChild(stop1);
  grad.appendChild(stop2);
  grad.appendChild(stop3);
  defs.appendChild(grad);
  frontRim.appendChild(defs);

  const frontPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  frontPathEl.setAttribute("d", FRONT_PATH);
  frontPathEl.setAttribute("stroke", `url(#gf-rim-${uid})`);
  frontRim.appendChild(frontPathEl);

  const hitBtn = document.createElement("button");
  hitBtn.type = "button";
  hitBtn.className = "gf-hit";
  hitBtn.setAttribute("aria-expanded", "false");
  hitBtn.setAttribute("aria-label", `Open folder ${label}`);

  const labelEl = document.createElement("div");
  labelEl.className = "gf-label";
  labelEl.innerHTML = `
    <span class="gf-title">${label}</span>
    <span class="gf-meta">${metaText}</span>
  `;

  front.appendChild(tint);
  front.appendChild(spec);
  front.appendChild(frontRim);
  front.appendChild(hitBtn);
  front.appendChild(labelEl);

  // Files pocket
  const filesContainer = document.createElement("div");
  filesContainer.className = "gf-files";
  filesContainer.setAttribute("role", "list");

  const visibleFiles = files.slice(-5);
  visibleFiles.forEach((file, index) => {
    const slot = fanSlot(index, visibleFiles.length);
    const jx = (Math.random() - 0.5) * 8;
    const jr = (Math.random() - 0.5) * 3;

    const sheet = document.createElement("button");
    sheet.type = "button";
    sheet.className = "gf-sheet";
    sheet.style.setProperty("--gf-slot", slot.toFixed(3));
    sheet.style.setProperty("--gf-depth", (visibleFiles.length - 1 - index));
    sheet.style.setProperty("--gf-jx", `${jx.toFixed(2)}px`);
    sheet.style.setProperty("--gf-jr", `${jr.toFixed(2)}deg`);
    sheet.style.zIndex = index + 1;

    const title = file.title || file.name || "Untitled Document";
    const meta = file.sizeFormatted || file.meta || "Doc";
    const isDrive = file.source === "Google Drive" || !!file.driveFileId;
    const sourceLabel = isDrive ? "Google Drive" : (file.source || (file.category ? `${file.category} Archive` : "NBLMimic"));
    const date = file.date || "Recent";
    const formatType = classifyFileFormat(file);
    const tag = (file.badge || (
      formatType === 'pdf' ? 'PDF' :
      formatType === 'doc' ? 'DOCX' :
      formatType === 'sheet' ? 'SHEET' :
      formatType === 'slide' ? 'SLIDES' :
      formatType === 'note' ? 'NOTE' : 'FILE'
    )).toUpperCase();

    // Sanitize any corrupt binary strings
    if (file.content && (file.content.startsWith('%PDF-') || file.content.startsWith('PK\x03\x04') || file.content.includes('\u0000'))) {
      file.content = null;
    }

    const excerpt = file.excerpt || 
      (file.content && typeof file.content === 'string' ? file.content.replace(/^#+\s+/gm, '').slice(0, 140) + '...' : 
      `Verified cloud document "${title}" (${meta}) synchronized from Google Drive. Ready for full-text inspection and grounded AI synthesis.`);

    sheet.innerHTML = `
      <div class="gf-sheet-content">
        <div class="gf-sheet-header">
          <span class="gf-sheet-badge badge-${formatType}">${escapeHtml(tag)}</span>
          <span class="gf-sheet-meta">${escapeHtml(meta)}</span>
        </div>
        <div class="gf-sheet-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        <div class="gf-sheet-byline">
          ${isDrive ? `<svg width="10" height="10" viewBox="0 0 87.3 78" style="vertical-align:middle; margin-right:3px; display:inline-block;"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/><path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z"/></svg>` : ''}
          <span>${escapeHtml(sourceLabel)}</span>
          <span class="gf-sheet-sep">&middot;</span>
          <span>${escapeHtml(date)}</span>
        </div>
        <p class="gf-sheet-excerpt">${escapeHtml(excerpt)}</p>
        <div class="gf-sheet-footer">
          <span>${escapeHtml(file.category || "Paper")}</span>
          <span class="gf-sheet-action">Open Reader &rarr;</span>
        </div>
      </div>
    `;

    sheet.addEventListener("click", (e) => {
      e.stopPropagation();
      if (typeof onFileSelect === "function") {
        onFileSelect(file, sheet);
      }
    });

    filesContainer.appendChild(sheet);
  });

  // Action Key with Aceternity Options Popover (+ / Options Menu)
  let actionKey = null;
  let popoverMenu = null;

  if (action !== "none") {
    actionKey = document.createElement("button");
    actionKey.type = "button";
    actionKey.className = "gf-key gf-key--add";
    actionKey.setAttribute("aria-label", "Folder options");
    actionKey.title = "Folder Options (Add, Rename, Delete, Fluid Art)";

    actionKey.innerHTML = `
      <svg class="gf-glyph gf-glyph--plus" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4.5v15M4.5 12h15"></path>
      </svg>
    `;

    // Aceternity 3D Floating Popover Menu
    popoverMenu = document.createElement("div");
    popoverMenu.className = "gf-folder-popover-menu";
    popoverMenu.setAttribute("role", "menu");
    popoverMenu.innerHTML = `
      <div class="gf-popover-header">
        <span class="gf-popover-folder-name">${escapeHtml(label)}</span>
        <span class="gf-popover-badge">${escapeHtml(metaText)}</span>
      </div>
      <div class="gf-popover-divider"></div>
      <button type="button" class="gf-popover-item gf-popover-expand" role="menuitem">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        <span>Open Pop-up Card</span>
      </button>
      <button type="button" class="gf-popover-item gf-popover-add" role="menuitem">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add Documents</span>
      </button>
      <button type="button" class="gf-popover-item gf-popover-rename" role="menuitem">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        <span>Rename Folder</span>
      </button>
      <div class="gf-popover-theme-row">
        <span>Fluid Art</span>
        <div class="gf-popover-theme-swatches">
          <button type="button" class="gf-theme-dot swatch-aurora" data-art="aurora" title="Aurora (Teal/Pink)"></button>
          <button type="button" class="gf-theme-dot swatch-glacier" data-art="glacier" title="Glacier (Cyan)"></button>
          <button type="button" class="gf-theme-dot swatch-ember" data-art="ember" title="Ember (Gold)"></button>
          <button type="button" class="gf-theme-dot swatch-dusk" data-art="dusk" title="Dusk (Violet)"></button>
          <button type="button" class="gf-theme-dot swatch-verdant" data-art="verdant" title="Verdant (Emerald)"></button>
        </div>
      </div>
      <div class="gf-popover-divider"></div>
      <button type="button" class="gf-popover-item gf-popover-delete" role="menuitem">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>Delete Folder</span>
      </button>
    `;

    const closeMenu = () => {
      popoverMenu.classList.remove("is-open");
      actionKey.classList.remove("is-active");
    };

    actionKey.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".gf-folder-popover-menu.is-open").forEach(m => {
        if (m !== popoverMenu) m.classList.remove("is-open");
      });
      document.querySelectorAll(".gf-key.is-active").forEach(k => {
        if (k !== actionKey) k.classList.remove("is-active");
      });

      const isOpen = popoverMenu.classList.toggle("is-open");
      actionKey.classList.toggle("is-active", isOpen);
    });

    document.addEventListener("click", (e) => {
      if (!popoverMenu.contains(e.target) && !actionKey.contains(e.target)) {
        closeMenu();
      }
    });

    const expandBtn = popoverMenu.querySelector(".gf-popover-expand");
    if (expandBtn) {
      expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMenu();
        openFolderModal();
      });
    }

    popoverMenu.querySelector(".gf-popover-add").addEventListener("click", (e) => {
      e.stopPropagation();
      closeMenu();
      if (typeof onAdd === "function") onAdd();
    });

    popoverMenu.querySelector(".gf-popover-rename").addEventListener("click", (e) => {
      e.stopPropagation();
      closeMenu();
      if (typeof onRename === "function") {
        onRename(label);
      }
    });

    popoverMenu.querySelectorAll(".gf-theme-dot").forEach(dot => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMenu();
        const newArt = dot.dataset.art;
        if (typeof onChangeArt === "function") {
          onChangeArt(label, newArt);
        }
      });
    });

    popoverMenu.querySelector(".gf-popover-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      closeMenu();
      if (typeof onDelete === "function") {
        onDelete(label);
      }
    });
  }

  const openFolderModal = () => {
    if (format === 'news' && typeof window.switchCanvasMode === 'function') {
      window.switchCanvasMode('news');
      return;
    }
    isOpen = true;
    root.setAttribute("data-open", "true");
    hitBtn.setAttribute("aria-expanded", "true");

    openExpandableFolderCard({
      originEl: root,
      format,
      label,
      kicker,
      meta: metaText,
      tone,
      art,
      seed,
      files,
      onFileSelect: (file, targetEl) => {
        if (typeof onFileSelect === 'function') {
          onFileSelect(file, targetEl || hitBtn);
        }
      },
      onAdd: () => {
        if (typeof onAdd === 'function') onAdd();
      },
      onRename: (currentLabel) => {
        if (typeof onRename === 'function') onRename(currentLabel);
      },
      onDelete: (currentLabel) => {
        if (typeof onDelete === 'function') onDelete(currentLabel);
      },
      onChangeArt: (currentLabel, newArt) => {
        if (typeof onChangeArt === 'function') onChangeArt(currentLabel, newArt);
      },
      onClose: () => {
        isOpen = false;
        root.removeAttribute("data-open");
        hitBtn.setAttribute("aria-expanded", "false");
      }
    });
  };

  const closeFolderModal = () => {
    isOpen = false;
    root.removeAttribute("data-open");
    hitBtn.setAttribute("aria-expanded", "false");
    const activeOverlay = document.querySelector(".gf-expandable-overlay");
    if (activeOverlay && typeof activeOverlay.__closeExpandable === "function") {
      activeOverlay.__closeExpandable();
    }
  };

  const toggleOpen = () => {
    if (isOpen) {
      closeFolderModal();
    } else {
      openFolderModal();
    }
  };

  hitBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (format === 'news' && typeof window.switchCanvasMode === 'function') {
      window.switchCanvasMode('news');
      return;
    }
    toggleOpen();
  });

  // Clicking anywhere on the card toggles open/close (excluding interactive keys and sheets)
  root.addEventListener("click", (e) => {
    if (e.target.closest('.gf-sheet') || e.target.closest('.gf-key') || e.target.closest('.gf-hit') || e.target.closest('.gf-folder-popover-menu')) return;
    toggleOpen();
  });

  // Parallax Pointer Tracking
  let rafId = 0;
  root.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || document.documentElement.classList.contains("low-power-mode")) return;
    const rect = root.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        root.style.setProperty("--gf-px", px.toFixed(3));
        root.style.setProperty("--gf-py", py.toFixed(3));
      });
    }
  });

  root.addEventListener("pointerleave", () => {
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        root.style.setProperty("--gf-px", "0");
        root.style.setProperty("--gf-py", "0");
      });
    }
  });

  // Assemble Hierarchy (Mount actionKey directly to front pocket so it NEVER falls behind!)
  tilt.appendChild(shadow);
  tilt.appendChild(back);
  tilt.appendChild(backRim);
  tilt.appendChild(filesContainer);
  tilt.appendChild(front);
  if (actionKey) {
    front.appendChild(actionKey);
    front.appendChild(popoverMenu);
  }

  // Right-click contextmenu on folder card opens options menu immediately
  root.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (popoverMenu && actionKey) {
      document.querySelectorAll(".gf-folder-popover-menu.is-open").forEach(m => {
        if (m !== popoverMenu) m.classList.remove("is-open");
      });
      document.querySelectorAll(".gf-key.is-active").forEach(k => {
        if (k !== actionKey) k.classList.remove("is-active");
      });
      const isOpen = popoverMenu.classList.toggle("is-open");
      actionKey.classList.toggle("is-active", isOpen);
    }
  });

  stage.appendChild(tilt);
  root.appendChild(stage);

  return root;
}

/**
 * File Format Classification Engine
 * Auto-categorizes files by MIME type and extension into dedicated format collections.
 */
export function classifyFileFormat(file) {
  if (!file) return 'doc';
  const name = (file.title || file.name || '').toLowerCase();
  const mime = (file.mimeType || '').toLowerCase();
  const cat = (file.category || '').toLowerCase();

  // 0. Live World News & Dispatches
  if (cat === 'news' || file.type === 'news' || (file.id && String(file.id).startsWith('news-'))) {
    return 'news';
  }

  // 1. PDF Documents
  if (mime === 'application/pdf' || name.endsWith('.pdf') || cat === 'pdfs' || cat === 'pdf') {
    return 'pdf';
  }
  // 2. Spreadsheets & Tabular Data
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv') ||
    name.endsWith('.tsv') ||
    cat === 'sheets' ||
    cat === 'sheet'
  ) {
    return 'sheet';
  }
  // 3. Presentations & Slide Decks
  if (
    mime.includes('presentation') ||
    name.endsWith('.pptx') ||
    name.endsWith('.ppt') ||
    name.endsWith('.key') ||
    cat === 'slides' ||
    cat === 'slide'
  ) {
    return 'slide';
  }
  // 4. Notes & Markdown
  if (
    name.endsWith('.md') ||
    name.endsWith('.txt') ||
    name.endsWith('.markdown') ||
    cat === 'notes' ||
    cat === 'note' ||
    (mime.startsWith('text/') && !name.endsWith('.csv'))
  ) {
    return 'note';
  }
  // 5. Word & Google Docs
  if (
    mime.includes('document') ||
    mime.includes('word') ||
    name.endsWith('.docx') ||
    name.endsWith('.doc') ||
    cat === 'docs' ||
    cat === 'doc'
  ) {
    return 'doc';
  }

  return 'other';
}

/**
 * Standard Default Format Collections
 * Initialized with rich, grounded domain papers and auto-populated as Drive files sync.
 */
export const DEFAULT_FORMAT_FOLDERS = [
  {
    format: 'pdf',
    label: 'PDF Documents',
    kicker: 'PDF Whitepapers & Research',
    tone: 'light',
    art: 'aurora',
    seed: 3,
    badge: 'PDF',
    defaultFiles: [
      {
        id: 'starter-constitutional-ai',
        title: 'Constitutional AI: Harmlessness Specification.pdf',
        source: 'Anthropic Research',
        category: 'PDFs',
        topic: 'ai',
        sizeFormatted: '420 KB',
        date: 'Jan 15',
        excerpt: 'Self-critique and revision guided by explicit natural language constitutions to produce non-evasive, harmless model behavior without human feedback.'
      },
      {
        id: 'starter-attention-transformer',
        title: 'Attention Is All You Need.pdf',
        source: 'Google Brain / Research',
        category: 'PDFs',
        topic: 'ai',
        sizeFormatted: '560 KB',
        date: 'Dec 18',
        excerpt: 'The seminal Transformer architecture based entirely on self-attention mechanisms, dispensing with recurrence and convolutions entirely.'
      },
      {
        id: 'starter-crispr-cas9',
        title: 'CRISPR-Cas9 Gene Editing in Human Therapeutics.pdf',
        source: 'Biomedical Review',
        category: 'PDFs',
        topic: 'science',
        sizeFormatted: '1.2 MB',
        date: 'Nov 04',
        excerpt: 'Molecular mechanisms of RNA-guided endonuclease cleavage, double-strand break repair pathways, and clinical trial milestones.'
      },
      {
        id: 'starter-quantum-supremacy',
        title: 'Quantum Computational Supremacy on Sycamore.pdf',
        source: 'Quantum Systems Lab',
        category: 'PDFs',
        topic: 'science',
        sizeFormatted: '890 KB',
        date: 'Oct 28',
        excerpt: 'Experimental demonstration of quantum supremacy sampling pseudo-random quantum circuits in 200 seconds on a 53-qubit superconducting processor.'
      }
    ]
  },
  {
    format: 'doc',
    label: 'Docs & Manuscripts',
    kicker: 'Google Docs & Word Drafts',
    tone: 'light',
    art: 'glacier',
    seed: 7,
    badge: 'DOCX',
    defaultFiles: [
      {
        id: 'starter-gemini-spec',
        title: 'Gemini 1.5 Pro: Multimodal Architecture Spec.docx',
        source: 'NBLMimic · Specs',
        category: 'Docs',
        topic: 'ai',
        sizeFormatted: '1.4 MB',
        date: 'Synced',
        excerpt: 'Evaluation of 1M+ token context window, audio-video tensor comprehension, and needle-in-a-haystack retrieval performance.'
      },
      {
        id: 'starter-deepseek-report',
        title: 'DeepSeek-V3 Technical Architecture Evaluation.docx',
        source: 'Lab Papers · Review',
        category: 'Docs',
        topic: 'ai',
        sizeFormatted: '860 KB',
        date: 'Synced',
        excerpt: 'Multi-head latent attention (MLA) and DeepSeekMoE architecture benchmarks on standard reasoning datasets.'
      },
      {
        id: 'starter-agentic-protocol',
        title: 'Multi-Agent System Communication Protocol.docx',
        source: 'Systems Draft · Specs',
        category: 'Docs',
        topic: 'tech',
        sizeFormatted: '340 KB',
        date: 'Synced',
        excerpt: 'Zero-latency state dispatch between autonomous subagents with cryptographic consensus and message ordering.'
      }
    ]
  },
  {
    format: 'sheet',
    label: 'Data & Spreadsheets',
    kicker: 'Sheets, CSV & Datasets',
    tone: 'light',
    art: 'verdant',
    seed: 19,
    badge: 'SHEET',
    defaultFiles: [
      {
        id: 'starter-benchmark-metrics',
        title: 'Reasoning Benchmark Evaluation Matrix.csv',
        source: 'Lab Data · Analytics',
        category: 'Sheets',
        topic: 'ai',
        sizeFormatted: '48 KB',
        date: 'Today',
        excerpt: 'Accuracy, throughput (tokens/sec), first-token latency, and MMLU-Pro benchmark scores across cutting-edge frontier models.'
      },
      {
        id: 'starter-token-economics',
        title: 'Cluster Compute & Inference Economics.xlsx',
        source: 'Operations · Finance',
        category: 'Sheets',
        topic: 'tech',
        sizeFormatted: '112 KB',
        date: 'Yesterday',
        excerpt: 'Hardware amortization, energy overhead per million generated tokens, and speculative batching efficiency matrix.'
      }
    ]
  },
  {
    format: 'slide',
    label: 'Presentations & Decks',
    kicker: 'Google Slides & Keynotes',
    tone: 'dark',
    art: 'dusk',
    seed: 23,
    badge: 'SLIDES',
    defaultFiles: [
      {
        id: 'starter-multimodal-keynote',
        title: 'Autonomous Agents & Multimodal AI 2026.pptx',
        source: 'Keynote · Deck',
        category: 'Slides',
        topic: 'ai',
        sizeFormatted: '6.4 MB',
        date: 'Synced',
        excerpt: 'Executive presentation deck covering vision-language models, live bidirectional audio streams, and tool use.'
      },
      {
        id: 'starter-safety-briefing',
        title: 'Frontier AI Safety & Alignment Briefing.gslides',
        source: 'Executive Brief · Slides',
        category: 'Slides',
        topic: 'ai',
        sizeFormatted: '3.1 MB',
        date: 'This week',
        excerpt: 'Slide overview of red-teaming vectors, self-correcting alignment constitutions, and automated governance protocols.'
      }
    ]
  },
  {
    format: 'note',
    label: 'Lab Notes & Markdown',
    kicker: 'Markdown & Experiment Logs',
    tone: 'dark',
    art: 'ember',
    seed: 11,
    badge: 'NOTE',
    defaultFiles: [
      {
        id: 'starter-crypto-vault-notes',
        title: 'Client-Side Cryptographic Vaults Specification.md',
        source: 'Lab Notes · Architecture',
        category: 'Notes',
        topic: 'tech',
        sizeFormatted: '180 KB',
        date: 'Today',
        excerpt: 'AES-GCM-256 Web Crypto PBKDF2 implementation ensuring memory-only BYOK storage with zero disk or plaintext leakage.'
      },
      {
        id: 'starter-multimodal-experiment',
        title: 'Multimodal Gemini 3.8 Experiment Log.md',
        source: 'Lab Notes · Experiment',
        category: 'Notes',
        topic: 'tech',
        sizeFormatted: '5.1 KB',
        date: 'Yesterday',
        excerpt: 'Real-time bidirectional audio capture testing with 16kHz PCM input and speculative token streaming down to edge clients.'
      }
    ]
  },
  {
    format: 'news',
    label: 'World News · 72h Wire',
    kicker: 'Live Global Dispatches',
    tone: 'dark',
    art: 'glacier',
    seed: 77,
    badge: 'LIVE 72H',
    defaultFiles: [
      {
        id: 'news-global-briefing',
        title: 'Global 72-Hour News Wire & Grounding',
        source: 'Global Wire · Reuters, BBC, FT',
        category: 'News',
        topic: 'world',
        sizeFormatted: 'Live Feed',
        date: 'Updated Live',
        excerpt: 'Real-time aggregated global headlines across Geopolitics, AI, Science, and Markets published in the last 72 hours.'
      },
      {
        id: 'news-ai-tech-briefing',
        title: 'Frontier AI & Silicon Architecture Dispatches',
        source: 'AI Wire · TechCrunch, Ars Technica',
        category: 'News',
        topic: 'ai',
        sizeFormatted: 'Live Feed',
        date: 'Updated Live',
        excerpt: 'Sparse MoE models, inference compute economics, sovereign data center treaties, and model safety benchmarks.'
      }
    ]
  }
];

let activeFormatFilter = 'all';

/**
 * Custom Folder Storage & State Utilities
 */

export function getFolderOverrides() {
  try {
    const raw = localStorage.getItem('nbl_folder_overrides');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveFolderOverride(key, data) {
  const overrides = getFolderOverrides();
  overrides[key] = { ...(overrides[key] || {}), ...data };
  try {
    localStorage.setItem('nbl_folder_overrides', JSON.stringify(overrides));
  } catch (e) {}
  return overrides;
}

export function getHiddenFormatFolders() {
  try {
    const raw = localStorage.getItem('nbl_hidden_format_folders');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function hideFormatFolder(format) {
  const list = getHiddenFormatFolders();
  if (!list.includes(format)) {
    list.push(format);
    try {
      localStorage.setItem('nbl_hidden_format_folders', JSON.stringify(list));
    } catch (e) {}
  }
  return list;
}

export function restoreHiddenFormatFolders() {
  try {
    localStorage.removeItem('nbl_hidden_format_folders');
  } catch (e) {}
}

export function deleteCustomFolder(idOrLabel) {
  const folders = getStoredCustomFolders().filter(f => f.id !== idOrLabel && f.label !== idOrLabel);
  try {
    localStorage.setItem('nbl_custom_folders', JSON.stringify(folders));
  } catch (e) {}
  return folders;
}

export function renameCustomFolder(idOrLabel, newLabel) {
  const folders = getStoredCustomFolders();
  folders.forEach(f => {
    if (f.id === idOrLabel || f.label === idOrLabel) {
      f.label = newLabel;
    }
  });
  try {
    localStorage.setItem('nbl_custom_folders', JSON.stringify(folders));
  } catch (e) {}
  return folders;
}

export function updateCustomFolderArt(idOrLabel, newArt) {
  const folders = getStoredCustomFolders();
  folders.forEach(f => {
    if (f.id === idOrLabel || f.label === idOrLabel) {
      f.art = newArt;
    }
  });
  try {
    localStorage.setItem('nbl_custom_folders', JSON.stringify(folders));
  } catch (e) {}
  return folders;
}

export function getStoredCustomFolders() {
  try {
    const raw = localStorage.getItem('nbl_custom_folders');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCustomFolder(folderData) {
  const folders = getStoredCustomFolders();
  folders.push(folderData);
  try {
    localStorage.setItem('nbl_custom_folders', JSON.stringify(folders));
  } catch (e) {}
  return folders;
}

/**
 * Renders the Glass Folder Cards Gallery into the target container.
 * Auto-sorts all documents by format into dedicated collections.
 */
export function renderGlassFolderGallery(container, sources = [], onSelectDocument, onAddSource) {
  if (!container) return;
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "gf-gallery-container";

  // Check Drive connection status
  const isDriveConnected = state.get('isDriveConnected');
  const driveSources = sources.filter(s => s.source === "Google Drive" || !s.driveFileId);

  // Group all incoming sources by format
  const sourcesByFormat = {
    pdf: [],
    doc: [],
    sheet: [],
    slide: [],
    note: [],
    news: [],
    other: []
  };

  sources.forEach(s => {
    const fmt = classifyFileFormat(s);
    if (sourcesByFormat[fmt]) {
      sourcesByFormat[fmt].push(s);
    } else {
      sourcesByFormat.other.push(s);
    }
  });

  const overrides = getFolderOverrides();
  const hiddenFormats = getHiddenFormatFolders();

  const handleRefreshGallery = () => {
    renderGlassFolderGallery(container, sources, onSelectDocument, onAddSource);
  };

  const handleRename = async (key, currentLabel, isCustom = false) => {
    const newName = await showLiquidPrompt({
      title: 'Rename Folder',
      message: `Enter new name for "${currentLabel}":`,
      defaultValue: currentLabel,
      confirmText: 'Save Name'
    });
    if (!newName || !newName.trim() || newName.trim() === currentLabel) return;
    const clean = newName.trim();
    if (isCustom) {
      renameCustomFolder(key, clean);
    } else {
      saveFolderOverride(key, { label: clean });
    }
    showToast(`Folder renamed to "${clean}"`);
    handleRefreshGallery();
  };

  const handleChangeArt = (key, currentLabel, newArt, isCustom = false) => {
    if (isCustom) {
      updateCustomFolderArt(key, newArt);
    } else {
      saveFolderOverride(key, { art: newArt });
    }
    showToast(`Liquid art set to ${newArt.charAt(0).toUpperCase() + newArt.slice(1)}`);
    handleRefreshGallery();
  };

  const handleDelete = async (key, currentLabel, isCustom = false) => {
    const ok = await showLiquidConfirm({
      title: 'Delete Folder?',
      targetName: currentLabel,
      message: `Are you sure you want to delete "${currentLabel}"? Your files and documents will remain safe in your library.`,
      confirmText: 'Delete Folder',
      isDanger: true
    });
    if (!ok) return;
    if (isCustom) {
      deleteCustomFolder(key);
    } else {
      hideFormatFolder(key);
    }
    showToast(`Folder "${currentLabel}" deleted`);
    handleRefreshGallery();
  };

  // Calculate format counts
  const formatCounts = {
    all: 0,
    pdf: sourcesByFormat.pdf.length || (DEFAULT_FORMAT_FOLDERS.find(f => f.format === 'pdf')?.defaultFiles.length || 0),
    doc: sourcesByFormat.doc.length || (DEFAULT_FORMAT_FOLDERS.find(f => f.format === 'doc')?.defaultFiles.length || 0),
    sheet: sourcesByFormat.sheet.length || (DEFAULT_FORMAT_FOLDERS.find(f => f.format === 'sheet')?.defaultFiles.length || 0),
    slide: sourcesByFormat.slide.length || (DEFAULT_FORMAT_FOLDERS.find(f => f.format === 'slide')?.defaultFiles.length || 0),
    note: sourcesByFormat.note.length || (DEFAULT_FORMAT_FOLDERS.find(f => f.format === 'note')?.defaultFiles.length || 0),
    news: sourcesByFormat.news?.length || 43,
    other: sourcesByFormat.other.length
  };
  formatCounts.all = formatCounts.pdf + formatCounts.doc + formatCounts.sheet + formatCounts.slide + formatCounts.note + formatCounts.other;

  // Gallery Header
  const header = document.createElement("div");
  header.className = "gf-gallery-header";

  const restoreBtnHtml = hiddenFormats.length > 0 ? `
    <button class="btn btn-ghost btn-sm" id="btn-restore-default-folders" style="font-size:11px; display:inline-flex; align-items:center; gap:5px; color:var(--text-tertiary);" title="Restore deleted format folders">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
      <span>Restore Deleted Folders (${hiddenFormats.length})</span>
    </button>
  ` : '';

  header.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%; gap:var(--space-4); flex-wrap:wrap; text-align:left;">
      <div>
        <div class="gf-gallery-kicker">Auto-Sort Knowledge Library &middot; Format Collections</div>
        <h2 class="gf-gallery-title">Format-Organized Research Folders</h2>
        <p class="gf-gallery-desc">Files are automatically partitioned by format (.pdf, .docx, .xlsx, .pptx, .md). Click the + button on any folder to add files, rename, change fluid art, or delete.</p>
      </div>
      <div style="display:flex; align-items:center; gap:var(--space-2); flex-wrap:wrap;">
        ${restoreBtnHtml}
        <button class="btn btn-secondary btn-sm" id="btn-gallery-new-folder" style="display:inline-flex; align-items:center; gap:5px; font-weight:500;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>New Folder</span>
        </button>
      </div>
    </div>
    <div class="gf-gallery-filter-bar" id="gf-format-filter-bar">
      <button class="gf-filter-pill is-active" data-format="all">
        <span>All Documents</span>
        <span class="gf-filter-count">${formatCounts.all}</span>
      </button>
      <button class="gf-filter-pill" data-format="pdf">
        <span class="gf-dot gf-dot--pdf"></span>
        <span>PDFs</span>
        <span class="gf-filter-count">${formatCounts.pdf}</span>
      </button>
      <button class="gf-filter-pill" data-format="doc">
        <span class="gf-dot gf-dot--doc"></span>
        <span>Google Docs</span>
        <span class="gf-filter-count">${formatCounts.doc}</span>
      </button>
      <button class="gf-filter-pill" data-format="sheet">
        <span class="gf-dot gf-dot--sheet"></span>
        <span>Sheets</span>
        <span class="gf-filter-count">${formatCounts.sheet}</span>
      </button>
      <button class="gf-filter-pill" data-format="slide">
        <span class="gf-dot gf-dot--slide"></span>
        <span>Slides</span>
        <span class="gf-filter-count">${formatCounts.slide}</span>
      </button>
      <button class="gf-filter-pill" data-format="note">
        <span class="gf-dot gf-dot--note"></span>
        <span>Notes & MD</span>
        <span class="gf-filter-count">${formatCounts.note}</span>
      </button>
      <button class="gf-filter-pill" data-format="other">
        <span class="gf-dot gf-dot--other"></span>
        <span>Other</span>
        <span class="gf-filter-count">${formatCounts.other}</span>
      </button>
      <button class="gf-filter-pill gf-filter-pill--news" data-format="news" title="Live 72-Hour World News">
        <span class="live-dot-emerald" style="width:6px; height:6px; display:inline-block; border-radius:50%; background:#10b981; box-shadow:0 0 6px rgba(16,185,129,0.5);"></span>
        <span>World News</span>
        <span class="gf-filter-count">72h</span>
      </button>
    </div>
  `;
  wrapper.appendChild(header);

  // Restore button handler
  const restoreBtn = header.querySelector("#btn-restore-default-folders");
  if (restoreBtn) {
    restoreBtn.onclick = () => {
      restoreHiddenFormatFolders();
      showToast("Default format folders restored");
      handleRefreshGallery();
    };
  }

  // Bind New Folder button
  const newFolderBtn = header.querySelector("#btn-gallery-new-folder");
  if (newFolderBtn) {
    newFolderBtn.onclick = () => {
      openModal('add-folder-modal');
    };
  }

  // Interactive Filter Toolbar
  let activeFormatFilter = "all";
  const filterPills = header.querySelectorAll(".gf-filter-pill");
  filterPills.forEach(pill => {
    pill.onclick = () => {
      const targetFmt = pill.dataset.format || "all";
      if (targetFmt === 'news') {
        if (typeof window.switchCanvasMode === 'function') {
          window.switchCanvasMode('news');
          return;
        }
      }
      filterPills.forEach(p => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      activeFormatFilter = targetFmt;
      handleRefreshGallery();
    };
  });

  // Gallery Grid
  const grid = document.createElement("div");
  grid.className = "gf-gallery-grid";
  const cardW = (typeof window !== 'undefined' && window.innerWidth <= 640)
    ? Math.min(335, Math.max(280, window.innerWidth - 32))
    : 335;

  // Render Default Format Collections
  DEFAULT_FORMAT_FOLDERS.forEach((folderDef) => {
    if (activeFormatFilter !== 'all' && activeFormatFilter !== folderDef.format) {
      return;
    }
    // Skip if hidden by user
    if (hiddenFormats.includes(folderDef.format)) {
      return;
    }

    const matchingSources = sourcesByFormat[folderDef.format] || [];
    const filesToDisplay = matchingSources.length > 0 ? matchingSources : folderDef.defaultFiles;
    const driveCount = matchingSources.filter(s => s.source === "Google Drive" || !s.driveFileId).length;
    const totalCount = matchingSources.length > 0 ? matchingSources.length : folderDef.defaultFiles.length;

    let metaText = `${totalCount} ${totalCount === 1 ? 'document' : 'documents'}`;
    if (driveCount > 0) {
      metaText = `${totalCount} documents · ${driveCount} from Drive`;
    }

    const override = overrides[folderDef.format] || {};
    const finalLabel = override.label || folderDef.label;
    const finalArt = override.art || folderDef.art;

    const folderCard = createGlassFolderCard({
      format: folderDef.format,
      label: finalLabel,
      kicker: folderDef.kicker,
      meta: metaText,
      tone: folderDef.tone,
      art: finalArt,
      seed: folderDef.seed,
      files: filesToDisplay,
      action: "add",
      width: cardW,
      onFileSelect: onSelectDocument,
      onAdd: onAddSource,
      onRename: () => handleRename(folderDef.format, finalLabel, false),
      onChangeArt: (l, newArt) => handleChangeArt(folderDef.format, finalLabel, newArt, false),
      onDelete: () => handleDelete(folderDef.format, finalLabel, false),
    });

    grid.appendChild(folderCard);
  });

  // Render "Other Formats" if any exist and not hidden
  if ((activeFormatFilter === 'all' || activeFormatFilter === 'other') && sourcesByFormat.other.length > 0 && !hiddenFormats.includes('other')) {
    const otherDriveCount = sourcesByFormat.other.filter(s => s.source === "Google Drive" || !s.driveFileId).length;
    let otherMeta = `${sourcesByFormat.other.length} files`;
    if (otherDriveCount > 0) otherMeta += ` · ${otherDriveCount} from Drive`;

    const otherOverride = overrides['other'] || {};
    const otherLabel = otherOverride.label || "Other Formats & Media";
    const otherArt = otherOverride.art || "aurora";

    const otherFolder = createGlassFolderCard({
      label: otherLabel,
      kicker: "Media, Audio, Spreadsheets & Other Files",
      meta: otherMeta,
      tone: "light",
      art: otherArt,
      seed: 41,
      files: sourcesByFormat.other,
      action: "add",
      width: cardW,
      onFileSelect: onSelectDocument,
      onAdd: onAddSource,
      onRename: () => handleRename('other', otherLabel, false),
      onChangeArt: (l, newArt) => handleChangeArt('other', otherLabel, newArt, false),
      onDelete: () => handleDelete('other', otherLabel, false),
    });
    grid.appendChild(otherFolder);
  }

  // Render Custom User-Added Folders
  const customFolders = getStoredCustomFolders();
  customFolders.forEach((cf, idx) => {
    const customId = cf.id || cf.label;
    const customFiles = cf.files && cf.files.length ? cf.files : [
      {
        id: `custom-doc-${cf.id || idx}-1`,
        title: `${cf.label} Working Brief`,
        source: "NBLMimic · Custom",
        category: "Notes",
        topic: "ai",
        sizeFormatted: "1.8 KB",
        date: "Today",
        excerpt: `Active research papers and working hypotheses collected for ${cf.label}.`
      }
    ];

    const cFolder = createGlassFolderCard({
      label: cf.label || "Custom Collection",
      kicker: cf.kicker || `${cf.label} Research Collection`,
      meta: `${customFiles.length} documents`,
      tone: cf.tone || "light",
      art: cf.art || "dusk",
      seed: cf.seed || (15 + idx * 7),
      files: customFiles,
      action: "add",
      width: cardW,
      onFileSelect: onSelectDocument,
      onAdd: onAddSource,
      onRename: () => handleRename(customId, cf.label, true),
      onChangeArt: (l, newArt) => handleChangeArt(customId, cf.label, newArt, true),
      onDelete: () => handleDelete(customId, cf.label, true),
    });
    grid.appendChild(cFolder);
  });

  // + Add New Folder Interactive Card at end of Grid
  const addFolderCard = document.createElement("div");
  addFolderCard.className = "gf-add-folder-card";
  addFolderCard.id = "btn-grid-add-folder";
  addFolderCard.innerHTML = `
    <div class="gf-add-folder-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>
    <div class="gf-add-folder-title">Create New Folder</div>
    <div class="gf-add-folder-desc">Add a custom 3D glass collection with liquid procedural art</div>
  `;
  addFolderCard.onclick = () => {
    openModal('add-folder-modal');
  };
  grid.appendChild(addFolderCard);

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}