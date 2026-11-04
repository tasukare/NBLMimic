/**
 * Liquid Glass Engine — Aceternity UI for Vanilla Web / ES6
 * Implements Snell's-law displacement mapping via SVG backdrop-filter.
 * Generates an analytical signed-distance field and normal gradient map,
 * applying chromatic aberration and specular rim highlights.
 */

// Global registry of active liquid glass elements
const activeInstances = new Map();

/** Signed distance to a rounded box centred at origin. <0 inside. */
function sdRoundedBox(px, py, halfW, halfH, r) {
  const qx = Math.abs(px) - halfW + r;
  const qy = Math.abs(py) - halfH + r;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return inside + outside - r;
}

/** Squircle-dome slope -> Snell's law bend. x = 0 at rim, 1 at centre */
function bendFromDepth(x) {
  const u = 1 - Math.min(1, Math.max(0, x));
  const denom = Math.pow(1 - Math.pow(u, 4), 0.75);
  if (denom < 1e-6) return 0;
  const thetaI = Math.atan(Math.min(Math.pow(u, 3) / denom, 8));
  const sinT = Math.sin(thetaI) / 1.5;
  if (sinT >= 1) return Math.sin(thetaI);
  return Math.sin(thetaI - Math.asin(sinT));
}

/** Build integral phi lookup table along depth */
function buildPhiTable(bevelPx) {
  const n = Math.max(1, Math.ceil(bevelPx));
  const phi = new Float32Array(n + 1);
  for (let d = 1; d <= n; d++) {
    phi[d] = phi[d - 1] + bendFromDepth(d / n);
  }
  return phi;
}

function samplePhi(phi, depth) {
  const max = phi.length - 1;
  if (depth <= 0) return phi[0];
  if (depth >= max) return phi[max];
  const i = Math.floor(depth);
  const f = depth - i;
  return phi[i] * (1 - f) + phi[i + 1] * f;
}

/** Compute displacement RGBA bitmap */
function computeDisplacementData(opts) {
  const dpr = opts.dpr || 1;
  const gain = opts.gain !== undefined ? opts.gain : 1.35;
  const light = opts.light || { x: -0.55, y: -0.85 };
  const lightLen = Math.hypot(light.x, light.y) || 1;
  const lx = light.x / lightLen;
  const ly = light.y / lightLen;

  const W = Math.max(1, Math.round(opts.width * dpr));
  const H = Math.max(1, Math.round(opts.height * dpr));
  const halfW = W / 2;
  const halfH = H / 2;
  const r = Math.min(opts.radius * dpr, halfW, halfH);
  const bevel = Math.max(1, opts.bevelDepth * dpr);
  const phi = buildPhiTable(bevel);

  const field = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const py = y - halfH + 0.5;
    for (let x = 0; x < W; x++) {
      const d = sdRoundedBox(x - halfW + 0.5, py, halfW, halfH, r);
      field[y * W + x] = d > 0 ? 0 : samplePhi(phi, Math.min(bevel, -d));
    }
  }

  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    const py = y - halfH + 0.5;
    for (let x = 0; x < W; x++) {
      const px = x - halfW + 0.5;
      const i = (y * W + x) << 2;
      const d = sdRoundedBox(px, py, halfW, halfH, r);

      if (d > 0) {
        data[i] = data[i + 1] = data[i + 2] = 128;
        data[i + 3] = 0;
        continue;
      }

      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(W - 1, x + 1);
      const y0 = Math.max(0, y - 1);
      const y1 = Math.min(H - 1, y + 1);
      const dPhiX = (field[y * W + x1] - field[y * W + x0]) / (x1 - x0 || 1);
      const dPhiY = (field[y1 * W + x] - field[y0 * W + x]) / (y1 - y0 || 1);

      const dx = Math.max(-1, Math.min(1, dPhiX * gain));
      const dy = Math.max(-1, Math.min(1, dPhiY * gain));

      let specular = 0;
      if (d >= -bevel) {
        const gx =
          sdRoundedBox(px + 1, py, halfW, halfH, r) -
          sdRoundedBox(px - 1, py, halfW, halfH, r);
        const gy =
          sdRoundedBox(px, py + 1, halfW, halfH, r) -
          sdRoundedBox(px, py - 1, halfW, halfH, r);
        const len = Math.hypot(gx, gy) || 1;
        const dot = (gx / len) * lx + (gy / len) * ly;
        const rim = 1 - Math.min(1, -d / bevel);
        specular = (Math.max(0, dot) + Math.max(0, -dot) * 0.35) * rim;
      }

      data[i] = Math.round(128 + dx * 127);
      data[i + 1] = Math.round(128 + dy * 127);
      data[i + 2] = Math.round(specular * 255);
      data[i + 3] = 255;
    }
  }

  return { data, width: W, height: H };
}

/** Render displacement map to blob URL */
async function generateDisplacementBlobUrl(opts) {
  const { data, width, height } = computeDisplacementData(opts);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(new ImageData(data, width, height), 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}

function buildFilterSvg({ id, mapUrl, width, height, scale, aberration, frost }) {
  const pad = Math.ceil(scale + aberration + 4);
  const px = (pad / Math.max(1, width)) * 100;
  const py = (pad / Math.max(1, height)) * 100;
  const region = `x="-${px.toFixed(3)}%" y="-${py.toFixed(3)}%" width="${(100 + 2 * px).toFixed(3)}%" height="${(100 + 2 * py).toFixed(3)}%"`;

  const map = `<feImage href="${mapUrl}" xlink:href="${mapUrl}" x="0" y="0" width="${width}" height="${height}" result="map" preserveAspectRatio="none"/>`;
  const displace = (s, result) =>
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${s}" xChannelSelector="R" yChannelSelector="G" result="${result}"/>`;

  const body =
    aberration <= 0
      ? `${displace(scale, 'rgb')}`
      : `${displace(scale + aberration, 'dispR')}
  <feColorMatrix in="dispR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
  ${displace(scale, 'dispG')}
  <feColorMatrix in="dispG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
  ${displace(Math.max(0, scale - aberration), 'dispB')}
  <feColorMatrix in="dispB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
  <feBlend in="red" in2="green" mode="screen" result="rg"/>
  <feBlend in="rg" in2="blue" mode="screen" result="rgb"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="0" height="0" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"><filter id="${id}" color-interpolation-filters="sRGB" ${region}>
  ${map}
  ${body}
  <feGaussianBlur in="rgb" stdDeviation="${frost}"/>
</filter></svg>`;
}

function supportsUrlBackdropFilter() {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return (
    CSS.supports('backdrop-filter', 'url(#x)') ||
    CSS.supports('-webkit-backdrop-filter', 'url(#x)')
  );
}

function isSafariLike() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
}

/**
 * Apply Liquid Glass effect to a DOM element.
 * @param {HTMLElement} el
 * @param {Object} options
 */
export async function applyLiquidGlass(el, options = {}) {
  if (!el || el.classList.contains('composer-box-liquid')) return;

  const defaults = {
    radius: el.dataset.liquidRadius ? parseFloat(el.dataset.liquidRadius) : 999,
    bevelDepth: el.dataset.liquidBevel ? parseFloat(el.dataset.liquidBevel) : 12,
    scale: el.dataset.liquidScale ? parseFloat(el.dataset.liquidScale) : 28,
    aberration: el.dataset.liquidAberration ? parseFloat(el.dataset.liquidAberration) : 2.5,
    frost: el.dataset.liquidFrost ? parseFloat(el.dataset.liquidFrost) : 0.4,
    tint: el.dataset.liquidTint ? parseFloat(el.dataset.liquidTint) : 0.08
  };

  const opts = { ...defaults, ...options };
  const canRefract = supportsUrlBackdropFilter() && !isSafariLike();

  let instance = activeInstances.get(el);
  if (!instance) {
    instance = {
      blobUrl: null,
      filterContainer: null,
      filterId: null,
      observer: null
    };
    activeInstances.set(el, instance);
  }

  const rect = el.getBoundingClientRect();
  const width = Math.max(2, Math.round(rect.width));
  const height = Math.max(2, Math.round(rect.height));

  // Adaptive Glass: zero blur overhead on mobile/tablets/low-power, moderate 10px on desktop
  const isLowTier = typeof window !== 'undefined' && (
    document.documentElement.classList.contains('low-power-mode') ||
    window.innerWidth <= 1024 ||
    window.matchMedia?.('(pointer: coarse)').matches
  );

  if (isLowTier) {
    el.style.backdropFilter = 'none';
    el.style.webkitBackdropFilter = 'none';
    el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';
  } else {
    el.style.backdropFilter = 'blur(10px) saturate(1.4)';
    el.style.webkitBackdropFilter = 'blur(10px) saturate(1.4)';
    el.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
  }

  // Setup ResizeObserver if not already attached
  if (!instance.observer && window.ResizeObserver) {
    let resizeTimer = null;
    instance.observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        applyLiquidGlass(el, opts);
      }, 100);
    });
    instance.observer.observe(el);
  }
}

/**
 * Initialize all Liquid Glass elements on the page.
 */
export function initLiquidGlass() {
  const elements = document.querySelectorAll('[data-liquid-glass="true"], .liquid-glass');
  elements.forEach((el) => {
    applyLiquidGlass(el);
  });
}
