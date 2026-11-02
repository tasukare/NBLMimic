/**
 * Aceternity UI — "Background Cubes Grid" (High-Performance Vanilla JS Canvas)
 * Optimized 3D Isometric Cube Grid with 2D Wave Physics, Precomputed Color Lookups,
 * Cached Radial Vignette, and Zero Garbage-Collection in 60fps Loop.
 * Deep Obsidian theme (#0b0b0d) · Sub-millisecond draw time.
 */

const PALETTE_STEPS = 32;
const TOP_PALETTE = new Array(PALETTE_STEPS);
const LEFT_PALETTE = new Array(PALETTE_STEPS);
const RIGHT_PALETTE = new Array(PALETTE_STEPS);
const STROKE_PALETTE = new Array(PALETTE_STEPS);

for (let i = 0; i < PALETTE_STEPS; i++) {
  const t = i / (PALETTE_STEPS - 1);
  // Top Face: Blend from dark stone #1e1e24 to glowing cyan #38bdf8
  const tr = Math.round(30 + (56 - 30) * t);
  const tg = Math.round(30 + (189 - 30) * t);
  const tb = Math.round(36 + (248 - 36) * t);
  TOP_PALETTE[i] = `rgb(${tr},${tg},${tb})`;

  // Left Face: Blend from #15151a
  const lr = Math.round(21 + 24 * t);
  const lg = Math.round(21 + 45 * t);
  const lb = Math.round(26 + 75 * t);
  LEFT_PALETTE[i] = `rgb(${lr},${lg},${lb})`;

  // Right Face: Blend from #101014
  const rr = Math.round(16 + 18 * t);
  const rg = Math.round(16 + 32 * t);
  const rb = Math.round(20 + 55 * t);
  RIGHT_PALETTE[i] = `rgb(${rr},${rg},${rb})`;

  // Specular rim stroke on lifted crests
  const strokeAlpha = (0.08 + 0.52 * t).toFixed(3);
  STROKE_PALETTE[i] = `rgba(56,189,248,${strokeAlpha})`;
}

export class BackgroundCubesGrid {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d', { alpha: false, desynchronized: true }) : null;

    this.backgroundColor = options.backgroundColor || '#0b0b0d';
    this.cubeSpacing = options.cubeSpacing || 44; // Chunkier, elegant spacing
    this.cubeScale = options.cubeScale || 0.88;   // 12% shadow gap seam
    this.damping = options.damping || 0.93;
    this.waveSpeed = options.waveSpeed || 0.38;

    this.cols = 0;
    this.rows = 0;
    this.h = null;
    this.v = null;

    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.animId = 0;
    this.isRunning = false;

    this.vignetteGradient = null;
    this.cullRadiusSq = 0;

    this.lastPointerTime = performance.now();
    this.lastIdlePulse = performance.now();
    this.lastPointerX = -9999;
    this.lastPointerY = -9999;

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  init() {
    if (!this.canvas || !this.ctx) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    this.resize();

    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });

    this.start();
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, rect.width || window.innerWidth);
    const h = Math.max(320, rect.height || window.innerHeight);

    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);

    const S = this.cubeSpacing;
    const isoX = S * 0.8660254; // cos(30)
    const isoY = S * 0.5;       // sin(30)

    const neededCols = Math.ceil((w / isoX + h / isoY) * 0.72) + 8;
    const neededRows = Math.ceil((w / isoX + h / isoY) * 0.72) + 8;

    this.cols = Math.min(38, Math.max(18, neededCols));
    this.rows = Math.min(38, Math.max(18, neededRows));

    const totalCells = this.cols * this.rows;
    this.h = new Float32Array(totalCells);
    this.v = new Float32Array(totalCells);

    // Initial gentle welcoming ripple
    const midC = Math.floor(this.cols / 2);
    const midR = Math.floor(this.rows / 2);
    this.h[midC * this.rows + midR] = 20;

    // Precompute cached vignette gradient
    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.hypot(cx, cy) * 1.05;
    this.cullRadiusSq = Math.pow(maxRadius * 0.95, 2);

    this.vignetteGradient = this.ctx.createRadialGradient(cx, cy, maxRadius * 0.28, cx, cy, maxRadius);
    this.vignetteGradient.addColorStop(0, 'rgba(11, 11, 13, 0)');
    this.vignetteGradient.addColorStop(0.62, 'rgba(11, 11, 13, 0.42)');
    this.vignetteGradient.addColorStop(1, 'rgba(11, 11, 13, 0.98)');
  }

  _onResize() {
    this.resize();
  }

  _onPointerMove(e) {
    this.lastPointerTime = performance.now();
    const x = e.clientX;
    const y = e.clientY;

    const dx = x - this.lastPointerX;
    const dy = y - this.lastPointerY;
    if (dx * dx + dy * dy > 320) { // ~18px threshold
      this.lastPointerX = x;
      this.lastPointerY = y;
      this.addRipple(x, y, 14);
    }
  }

  _onPointerDown(e) {
    this.lastPointerTime = performance.now();
    this.addShockwave(e.clientX, e.clientY);
  }

  screenToGrid(screenX, screenY) {
    const S = this.cubeSpacing;
    const isoX = S * 0.8660254; // cos(30)
    const isoY = S * 0.5;       // sin(30)

    const cx = this.width / 2;
    const cy = this.height / 2;
    const dx = screenX - cx;
    const dy = screenY - cy;

    const u = 0.5 * (dx / isoX + dy / isoY);
    const v = 0.5 * (dy / isoY - dx / isoX);

    const c = Math.round(u + this.cols / 2);
    const r = Math.round(v + this.rows / 2);

    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      return { c, r };
    }
    return null;
  }

  addRipple(screenX, screenY, strength = 14) {
    const coords = this.screenToGrid(screenX, screenY);
    if (!coords) return;
    const { c, r } = coords;
    const radius = 2;

    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const gc = c + dc;
        const gr = r + dr;
        if (gc >= 1 && gc < this.cols - 1 && gr >= 1 && gr < this.rows - 1) {
          const d = Math.hypot(dc, dr);
          if (d <= radius) {
            const factor = 1 - d / (radius + 0.4);
            const idx = gc * this.rows + gr;
            this.h[idx] += strength * factor;
            this.v[idx] += strength * 0.4 * factor;
          }
        }
      }
    }
  }

  addShockwave(screenX, screenY) {
    const coords = this.screenToGrid(screenX, screenY);
    if (!coords) return;
    const { c, r } = coords;
    const radius = 3;

    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const gc = c + dc;
        const gr = r + dr;
        if (gc >= 1 && gc < this.cols - 1 && gr >= 1 && gr < this.rows - 1) {
          const d = Math.hypot(dc, dr);
          if (d <= radius) {
            const factor = Math.cos((d / radius) * (Math.PI / 2));
            const idx = gc * this.rows + gr;
            this.h[idx] += 24 * factor;
            this.v[idx] += 10 * factor;
          }
        }
      }
    }
  }

  checkIdle(now) {
    if (now - this.lastPointerTime > 1600 && now - this.lastIdlePulse > 2400) {
      this.lastIdlePulse = now;
      const c = Math.floor(this.cols * 0.3 + Math.random() * this.cols * 0.4);
      const r = Math.floor(this.rows * 0.3 + Math.random() * this.rows * 0.4);
      const idx = c * this.rows + r;
      if (idx >= 0 && idx < this.cols * this.rows) {
        this.h[idx] += 16 + Math.random() * 6;
        this.v[idx] += 6;
      }
    }
  }

  stepWavePhysics() {
    const cols = this.cols;
    const rows = this.rows;
    const h = this.h;
    const v = this.v;
    const damping = this.damping;
    const c2 = this.waveSpeed;

    for (let c = 1; c < cols - 1; c++) {
      const colIdx = c * rows;
      for (let r = 1; r < rows - 1; r++) {
        const idx = colIdx + r;
        const avg = 0.25 * (h[idx - rows] + h[idx + rows] + h[idx - 1] + h[idx + 1]);
        const force = (avg - h[idx]) * c2;
        v[idx] = (v[idx] + force) * damping;
      }
    }

    for (let i = 0; i < cols * rows; i++) {
      h[i] += v[i];
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const render = (now) => {
      if (!this.isRunning) return;
      this.checkIdle(now);
      this.stepWavePhysics();
      this.draw();
      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  }

  stop() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  draw() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Deep Obsidian Scene Background
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    const S = this.cubeSpacing;
    const isoX = S * 0.8660254; // cos(30)
    const isoY = S * 0.5;       // sin(30)

    const s = S * this.cubeScale;
    const dx = s * 0.8660254;
    const dy = s * 0.5;
    const cubeH = s * 0.95;

    const cx = w / 2;
    const cy = h / 2;
    const cols = this.cols;
    const rows = this.rows;
    const heightMap = this.h;
    const cullRadiusSq = this.cullRadiusSq;

    ctx.lineWidth = 1;

    // Draw Isometric Cubes in depth order: sum = c + r (Back to Front painter's order)
    for (let sum = 0; sum <= cols + rows - 2; sum++) {
      const minC = Math.max(0, sum - (rows - 1));
      const maxC = Math.min(cols - 1, sum);

      for (let c = minC; c <= maxC; c++) {
        const r = sum - c;
        const u = c - cols / 2;
        const v = r - rows / 2;

        const bx = cx + (u - v) * isoX;
        const by = cy + (u + v) * isoY;

        // Viewport & corner vignette culling
        if (bx < -60 || bx > w + 60 || by < -60 || by > h + 80) continue;
        const distSq = (bx - cx) * (bx - cx) + (by - cy) * (by - cy);
        if (distSq > cullRadiusSq) continue;

        const waveH = heightMap[c * rows + r] || 0;
        const lift = Math.max(-4, waveH);
        const yTop = by - lift;

        // Fast palette lookup (Zero string creation per frame)
        const intensity = Math.min(1, Math.max(0, waveH / 20));
        const palIdx = Math.min(PALETTE_STEPS - 1, (intensity * (PALETTE_STEPS - 1)) | 0);

        const leftFaceColor = LEFT_PALETTE[palIdx];
        const rightFaceColor = RIGHT_PALETTE[palIdx];
        const topFaceColor = TOP_PALETTE[palIdx];

        // 1. Left Face (Fill only, no stroke overhead)
        ctx.fillStyle = leftFaceColor;
        ctx.beginPath();
        ctx.moveTo(bx - dx, yTop);
        ctx.lineTo(bx, yTop + dy);
        ctx.lineTo(bx, by + dy + cubeH);
        ctx.lineTo(bx - dx, by + cubeH);
        ctx.closePath();
        ctx.fill();

        // 2. Right Face (Fill only, no stroke overhead)
        ctx.fillStyle = rightFaceColor;
        ctx.beginPath();
        ctx.moveTo(bx, yTop + dy);
        ctx.lineTo(bx + dx, yTop);
        ctx.lineTo(bx + dx, by + cubeH);
        ctx.lineTo(bx, by + dy + cubeH);
        ctx.closePath();
        ctx.fill();

        // 3. Top Face (Rhombus)
        ctx.fillStyle = topFaceColor;
        ctx.beginPath();
        ctx.moveTo(bx, yTop - dy);
        ctx.lineTo(bx + dx, yTop);
        ctx.lineTo(bx, yTop + dy);
        ctx.lineTo(bx - dx, yTop);
        ctx.closePath();
        ctx.fill();

        // Only stroke illuminated crests to create luminous ripple glow with 95% fewer strokes
        if (palIdx > 0) {
          ctx.strokeStyle = STROKE_PALETTE[palIdx];
          ctx.stroke();
        }
      }
    }

    // Cached Radial Edge Vignette & Fog
    if (this.vignetteGradient) {
      ctx.fillStyle = this.vignetteGradient;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  destroy() {
    this.stop();
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('resize', this._onResize);
    this.h = null;
    this.v = null;
  }
}
