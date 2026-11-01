/**
 * NBLMimic — Liquid Glass Startup Screen Controller
 * Orchestrates WebGL2 glass reveal animation with live backend health & system verification.
 */

const MARK_NBLMIMIC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#1E40AF"/><path d="M22 34 Q28 31 32 34 T42 34 L47.2 44.2 C48.3 46.4 46.8 49 44.5 49 L19.5 49 C17.2 49 15.7 46.4 16.8 44.2 Z" fill="#67E8F9"/><circle cx="26" cy="42" r="2.2" fill="#FFFFFF"/><circle cx="36" cy="38" r="1.8" fill="#FFFFFF"/><circle cx="32" cy="45" r="1.4" fill="#FFFFFF"/><path d="M25 14 H39 M28 14 V23 L16.2 44.3 C14.9 46.6 16.5 49.5 19.2 49.5 H44.8 C47.5 49.5 49.1 46.6 47.8 44.3 L36 23 V14" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M47 11 C47 15.5 49 17.5 53.5 17.5 C49 17.5 47 19.5 47 24 C47 19.5 45 17.5 40.5 17.5 C45 17.5 47 15.5 47 11 Z" fill="#FDE047"/></svg>`;

const NBL_SETTINGS = {
  tileSize: 260,
  logoScale: 0.68,
  finalScale: 0.88,
  logoOffset: [0, 0],
  iconPlate: true,
  keepPlate: true,
  originalColors: false,
  opticalDepth: 0.9,
  dispersion: 1.35,
  colorBleed: 0.85,
  doubleBevel: 1,
  bevelWidth: 0.18,
  corner: 5.2,
  cornerPull: 1.6,
  cornerWidth: 1.8,
  cornerFocus: 0.48,
  edgeSmear: 1.85,
  stretch: 0,
  tilt: 0.25,
  bulge: 1,
  specular: 1,
  halo: 1,
  shadow: 0.4,
  ripple: 0.8,
  bounce: 0,
  response: 0.42,
  startSize: 0.2,
  startZoom: 2.1,
  glide: 2.3,
  present: 2.4,
  drift: 0.08,
  swell: 0.5,
  focus: 1,
  sheen: 1,
  lightTurn: 0.9,
  hold: 1.2,
  background: "#09090b",
  plateColor: "#111827",
  logoColor: "#38bdf8"
};

const TEX = 512;
const BOX = 0.75;

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, "$&$&");
  const v = parseInt(h.slice(0, 6), 16) || 0;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function spring(t, response, damping) {
  if (t <= 0) return 0;
  const w = (2 * Math.PI) / response;
  if (damping >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
}

function frameAt(T, P) {
  const tx = P.present;
  const grow = spring(T + 0.01, P.response, 1);
  const morph = spring(T - 0.35, 0.4, 1);
  const zoomIn = 0.25 * spring(T, 0.7, 1) + 0.75 * Math.min(1, T / P.glide);
  const release = spring(T - tx - 0.05, 0.65, 1);
  const view = (1 + (P.startZoom - 1) * (1 - zoomIn));
  const plateScale = (P.startSize + (1 - P.startSize) * grow);
  return {
    uPlateScale: plateScale,
    uShapeN: 2 + (P.corner - 2) * morph,
    uCornerN: P.corner,
    uOptics: 1 - Math.min(1, release * 1.5),
    uPlateAlpha: 1 - Math.min(1, release * 1.2),
    uLogoHalf: P.logoScale * view,
    uLogoOff: [0, 0],
    uKeep: 1,
    uSheen: 1,
    uSweep: 0,
    uLightAng: 0.5,
    uBold: 0,
    uBlur: 0.02 * (1 - grow),
    uFrost: 0.1 * (1 - grow),
    uPinch: 0,
    uTilt: P.tilt,
    uDome: 0.15 * (1 - grow),
    uDrop: 1 - morph,
    uRim: 1.5,
    uHalo: P.halo,
    uShadow: P.shadow,
    uGhost: 0,
    uRipR: 1,
    uRipA: 0,
    uBare: release,
    uReach: P.bevelWidth * plateScale,
    uCornerPull: P.cornerPull,
    uStreak: P.edgeSmear,
    uWiden: P.cornerWidth,
    uSlab: 0.3 * P.opticalDepth,
    uEtaSpread: 0.06,
    uFocus: P.cornerFocus,
    uFocusK: 1.0,
    uFocusSplit: 0.05,
    uRimLine: 0.09,
    uCornerOn: morph,
    uGlow: 0.02,
    uFaceDisp: 0.012,
    uVivid: 0.85,
    uDissolve: release,
    uDisp: P.dispersion,
    uDouble: P.doubleBevel,
    uBevelW: P.bevelWidth,
    uSpec: P.specular,
    uIconPlate: 1,
    uUseColor: 0,
    uLightScene: 0,
    uLightGlass: 0,
    uBg: hexToRgb(P.background),
    uPlateCol: hexToRgb(P.plateColor),
    uLogoCol: hexToRgb(P.logoColor)
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

function svgToUrl(text) {
  const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
  let w = parseFloat(svg.getAttribute("width") || "");
  let h = parseFloat(svg.getAttribute("height") || "");
  const vb = (svg.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) [w, h] = [vb[2], vb[3]];
  if (!(w > 0 && h > 0)) w = h = 100;
  const s = TEX / Math.max(w, h);
  svg.setAttribute("width", String(Math.round(w * s)));
  svg.setAttribute("height", String(Math.round(h * s)));
  const out = new XMLSerializer().serializeToString(svg).replace(/currentColor/g, "#ffffff");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(out);
}

function fitToTexture(source, sw, sh) {
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = TEX;
  const tc = tmp.getContext("2d", { willReadFrequently: true });
  const s0 = Math.min(TEX / sw, TEX / sh);
  const dx0 = (TEX - sw * s0) / 2;
  const dy0 = (TEX - sh * s0) / 2;
  tc.drawImage(source, dx0, dy0, sw * s0, sh * s0);
  const d = tc.getImageData(0, 0, TEX, TEX).data;

  let opaque = true;
  for (let i = 3; i < d.length; i += 4 * 97) {
    if (d[i] < 250) { opaque = false; break; }
  }
  const key = [d[0], d[1], d[2]];
  const keyAlpha = (r, g, b) =>
    Math.min(1, Math.max(0, (Math.hypot(r - key[0], g - key[1], b - key[2]) / 441 - 0.08) / 0.2));

  let x0 = TEX, y0 = TEX, x1 = -1, y1 = -1;
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const i = (y * TEX + x) * 4;
      const a = opaque ? keyAlpha(d[i], d[i + 1], d[i + 2]) * 255 : d[i + 3];
      if (a > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("Empty mark");
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const s = (TEX * BOX) / Math.max(bw, bh);

  const out = document.createElement("canvas");
  out.width = out.height = TEX;
  const oc = out.getContext("2d", { willReadFrequently: true });
  oc.imageSmoothingQuality = "high";
  oc.drawImage(source, TEX / 2 - (x0 + bw / 2 - dx0) * s, TEX / 2 - (y0 + bh / 2 - dy0) * s, sw * s0 * s, sh * s0 * s);
  return out;
}

function edt1d(grid, offset, stride, f, v, z, INF) {
  v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < TEX; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < TEX; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

function edt(grid, f, v, z, INF) {
  for (let x = 0; x < TEX; x++) edt1d(grid, x, TEX, f, v, z, INF);
  for (let y = 0; y < TEX; y++) edt1d(grid, y * TEX, 1, f, v, z, INF);
}

function buildSdf(canvas) {
  const n = TEX * TEX;
  const alpha = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, TEX, TEX).data;
  const INF = 1e20;
  const outer = new Float64Array(n);
  const inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = alpha[i * 4 + 3] / 255;
    if (a >= 1) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0) { outer[i] = INF; inner[i] = 0; }
    else {
      const dd = 0.5 - a;
      outer[i] = dd > 0 ? dd * dd : 0;
      inner[i] = dd < 0 ? dd * dd : 0;
    }
  }
  const f = new Float64Array(TEX);
  const z = new Float64Array(TEX + 1);
  const v = new Uint16Array(TEX);
  edt(outer, f, v, z, INF);
  edt(inner, f, v, z, INF);
  const sdf = new Float32Array(n);
  for (let i = 0; i < n; i++) sdf[i] = (Math.sqrt(outer[i]) - Math.sqrt(inner[i])) / TEX;
  return sdf;
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uCenter; uniform float uTile; uniform sampler2D uSdf; uniform sampler2D uCol;
uniform float uTexSize; uniform float uBoxFrac; uniform float uPlateScale; uniform float uShapeN;
uniform float uCornerN; uniform float uOptics; uniform float uPlateAlpha; uniform float uLogoHalf;
uniform vec2 uLogoOff; uniform float uBold; uniform float uBlur; uniform float uFrost;
uniform float uDome; uniform float uDrop; uniform float uPinch; uniform float uTilt;
uniform float uRim; uniform float uHalo; uniform float uShadow; uniform float uGhost;
uniform float uRipR; uniform float uRipA; uniform float uBare; uniform float uReach;
uniform float uCornerPull; uniform float uStreak; uniform float uWiden; uniform float uSlab;
uniform float uEtaSpread; uniform float uFocus; uniform float uFocusK; uniform float uFocusSplit;
uniform float uRimLine; uniform float uCornerOn; uniform float uDissolve; uniform float uGlow;
uniform float uFaceDisp; uniform float uVivid; uniform float uDisp; uniform float uDouble;
uniform float uBevelW; uniform float uSpec; uniform float uIconPlate; uniform float uUseColor;
uniform float uLightScene; uniform float uLightGlass; uniform float uKeep; uniform float uSheen;
uniform float uSweep; uniform float uLightAng; uniform vec3 uBg; uniform vec3 uPlateCol; uniform vec3 uLogoCol;

float px;
vec4 logoAt(vec2 q, float blur, float aa) {
  float L = uLogoHalf; float k = 0.5 * uBoxFrac / L;
  vec2 uv = vec2(0.5 + (q.x - uLogoOff.x) * k, 0.5 - (q.y - uLogoOff.y) * k);
  float d = texture(uSdf, uv).r / k;
  float w = 0.75 * aa + blur;
  float a = 1.0 - smoothstep(-w, w, d - uBold * L);
  return vec4(uLogoCol, a);
}

float shape(vec2 p, float scale, float n, out vec2 nOut, out float g, out vec2 dg) {
  vec2 pp = p / scale; vec2 a = max(abs(pp), vec2(1e-6));
  g = pow(pow(a.x, n) + pow(a.y, n), 1.0 / n);
  dg = sign(pp) * pow(a, vec2(n - 1.0)) * pow(max(g, 1e-6), 1.0 - n);
  float dgl = max(length(dg), 1e-6); nOut = dg / dgl;
  return (g - 1.0) / dgl * scale;
}

float contourRadius(vec2 p, float scale, float n) {
  vec2 a = max(abs(p / scale), vec2(1e-4));
  vec2 a1 = pow(a, vec2(n - 1.0)); vec2 a2 = pow(a, vec2(n - 2.0));
  float k = (n - 1.0) * (a2.x * a1.y * a1.y + a2.y * a1.x * a1.x) / pow(max(dot(a1, a1), 1e-30), 1.5);
  return scale / max(k, 1e-3);
}

vec2 refractSample(float x, float bwF, float eta, float R, vec2 dirOut, vec2 p, float dome, float offMul) {
  float u = clamp(1.0 - x, 0.0, 0.995); float th = asin(u), thr = asin(u / eta);
  float z = uSlab + bwF * sqrt(1.0 - u * u);
  float off = offMul * z * tan(th - thr); off = off / (1.0 + off / (6.0 * R));
  return p - (dirOut * off + p * dome) * uOptics;
}

float bump(float x, float c, float w) { float d = (x - c) / w; return exp(-0.5 * d * d); }
vec3 spectrum(float x) {
  return vec3(bump(x, 0.34, 0.2) + 0.08 * bump(x, 0.93, 0.05), bump(x, 0.58, 0.1), bump(x, 0.8, 0.11));
}

void main() {
  px = 2.0 / uTile;
  vec2 p = (gl_FragCoord.xy - uCenter) * px;
  vec4 lg = logoAt(p, uBlur, px);
  vec3 plain = mix(uBg, lg.rgb, lg.a * uBare);
  vec2 nOut, dg; float g;
  float sd = shape(p, uPlateScale, uShapeN, nOut, g, dg);
  float s = -sd;
  float bw = max(uBevelW, 0.004) * uPlateScale;
  float x = clamp(s / bw, 0.0, 1.0);
  float R = contourRadius(p, uPlateScale, uShapeN);
  vec2 pq = p * p;
  float diag = 4.0 * pq.x * pq.y / max((pq.x + pq.y) * (pq.x + pq.y), 1e-6);
  float tilt = mix(1.0 - uTilt, 1.0, smoothstep(-0.02, 0.02, p.x * p.y));
  float pinchPart = uPinch * min(g * g, 1.0) * diag * diag * tilt;
  float dome = uDome * (1.0 - min(g * g, 1.0)) + pinchPart;
  vec2 dirOut = normalize(mix(nOut, p / max(length(p), 1e-4), 0.2));
  float cornerness = max(smoothstep(0.1, 0.9, 4.0 * nOut.x * nOut.x * nOut.y * nOut.y), smoothstep(0.15, 0.75, diag));
  float offMul = 1.0 + 0.4 * max(uCornerPull - 1.0, 0.0) * tilt * cornerness * uCornerOn;
  float bwF = max(uReach, 0.004) * (1.0 + uWiden * tilt * cornerness * uCornerOn);
  float xf = clamp(s / bwF, 0.0, 1.0);
  vec2 qc = refractSample(xf, bwF, 1.5, R, dirOut, p, dome, offMul);
  float foot = max(max(length(dFdx(qc)), length(dFdy(qc))), 0.25 * px);

  vec3 bg = uBg;
  vec3 haloCol = vec3(0.22, 0.74, 0.97);
  bg = mix(bg, haloCol, clamp(uHalo * (0.35 * exp(-max(sd, 0.0) / (0.025 * uPlateScale))), 0.0, 1.0) * step(0.0, sd));

  vec3 col = bg;
  float soft = px + uBlur * 0.8 + 0.06 * uDissolve * (1.0 - uKeep) * uPlateScale;
  if (sd < soft) {
    float y1 = 1.0 - x;
    const float K = 2.6;
    float base1 = max(1.0 - pow(y1, K), 1e-4);
    float db = min(pow(y1, K - 1.0) * pow(base1, 1.0 / K - 1.0), 25.0);
    vec2 grad = -db * nOut;
    vec3 back = mix(uBg, uPlateCol, uIconPlate);
    vec3 acc = vec3(0.0), wsum = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      float lam = (float(i) + 0.5) / 16.0;
      float c = uDisp * (1.0 - 2.0 * lam);
      vec2 sp = refractSample(xf, bwF, 1.5 + uEtaSpread * c, R, dirOut, p, dome, offMul);
      vec4 l = logoAt(sp, uBlur, foot);
      vec3 w = spectrum(lam);
      acc += mix(back, l.rgb, l.a) * w;
      wsum += w;
    }
    vec3 trans = acc / wsum;
    vec3 Nl = normalize(vec3(-grad, 1.0));
    float edge = 1.0 - Nl.z;
    vec3 darkGlass = trans * (1.0 - 0.25 * edge) + vec3(pow(edge, 2.0)) * 0.5;
    col = mix(bg, darkGlass, clamp(0.5 - sd / soft, 0.0, 1.0));
  }
  vec3 outc = mix(plain, col, uPlateAlpha);
  outColor = vec4(outc, 1.0);
}`;

function createRenderer(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: false });
  if (!gl) return null;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(prog, i);
    U[info.name] = gl.getUniformLocation(prog, info.name);
  }

  const sdfTex = gl.createTexture();
  const colTex = gl.createTexture();
  gl.uniform1i(U.uSdf, 0);
  gl.uniform1i(U.uCol, 1);
  let hasLogo = false;

  const params = (filter) => {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  return {
    setLogo(logo) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sdfTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, TEX, TEX, 0, gl.RED, gl.FLOAT, logo.sdf);
      params(gl.LINEAR);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, colTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, logo.canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      params(gl.LINEAR_MIPMAP_LINEAR);
      hasLogo = true;
    },
    render(fr, w, h, tilePx) {
      if (!hasLogo) return;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uCenter, w / 2, h / 2);
      gl.uniform1f(U.uTile, tilePx);
      gl.uniform1f(U.uTexSize, TEX);
      gl.uniform1f(U.uBoxFrac, BOX);
      for (const k in fr) {
        const v = fr[k];
        if (typeof v === "number" && U[k]) gl.uniform1f(U[k], v);
      }
      gl.uniform3fv(U.uBg, fr.uBg);
      gl.uniform3fv(U.uPlateCol, fr.uPlateCol);
      gl.uniform3fv(U.uLogoCol, fr.uLogoCol);
      gl.uniform2fv(U.uLogoOff, fr.uLogoOff);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      try {
        gl.deleteTexture(sdfTex);
        gl.deleteTexture(colTex);
        gl.deleteProgram(prog);
      } catch (e) {}
    }
  };
}

class StartupScreenController {
  constructor() {
    this.screenEl = document.getElementById('startup-screen');
    this.canvas = document.getElementById('startup-canvas');
    this.statusDot = document.getElementById('startup-status-dot');
    this.statusText = document.getElementById('startup-status-text');
    this.actionsContainer = document.getElementById('startup-actions');
    this.btnRetry = document.getElementById('btn-startup-retry');
    this.btnSkip = document.getElementById('btn-startup-skip');
    this.hintEl = document.getElementById('startup-skip-hint');

    this.renderer = null;
    this.logoData = null;
    this.startTime = performance.now();
    this.animId = null;
    this.isDismissed = false;
    this.readyToDismiss = false;
    this.minDurationMs = 2100; // Let the glass reveal bloom organically
    this.onRetryCallback = null;
  }

  init(onRetry) {
    if (!this.screenEl || !this.canvas) return;
    this.onRetryCallback = onRetry;
    this.startTime = performance.now();
    this._bindControls();

    // Initialize WebGL in parallel without blocking app initialization
    this._initWebGL().catch(err => {
      console.warn('[Startup] WebGL init fallback:', err);
    });
  }

  async _initWebGL() {
    this.renderer = createRenderer(this.canvas);
    if (!this.renderer) return;

    try {
      const url = svgToUrl(MARK_NBLMIMIC);
      const img = await loadImage(url);
      const canvas = fitToTexture(img, img.naturalWidth || TEX, img.naturalHeight || TEX);
      this.logoData = { canvas, sdf: buildSdf(canvas) };
      this.renderer.setLogo(this.logoData);
      this._startRenderLoop();
    } catch (err) {
      console.warn('[Startup] WebGL2 SDF prep skipped, using fallback:', err);
    }
  }

  _startRenderLoop() {
    const loop = (now) => {
      if (this.isDismissed) return;
      this.animId = requestAnimationFrame(loop);
      if (!this.renderer || !this.logoData) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(this.canvas.clientWidth * dpr);
      const h = Math.round(this.canvas.clientHeight * dpr);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }

      const elapsedSec = (now - this.startTime) / 1000;
      // Loop duration matches reveal animation
      const loopDuration = NBL_SETTINGS.present + 1.8;
      const currentT = elapsedSec % loopDuration;

      const fr = frameAt(currentT, NBL_SETTINGS);
      this.renderer.render(fr, w, h, NBL_SETTINGS.tileSize * dpr);
    };
    this.animId = requestAnimationFrame(loop);
  }

  _bindControls() {
    // Click on startup screen or spacebar dismisses immediately if checks are completed
    const handleQuickDismiss = (e) => {
      if (this.readyToDismiss && !this.isDismissed) {
        this.dismiss();
      }
    };

    if (this.screenEl) {
      this.screenEl.addEventListener('click', (e) => {
        // Don't trigger if clicking explicit buttons
        if (e.target.closest('.startup-btn')) return;
        handleQuickDismiss(e);
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') {
        if (this.readyToDismiss && !this.isDismissed) {
          e.preventDefault();
          this.dismiss();
        }
      }
    });

    if (this.btnRetry) {
      this.btnRetry.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof this.onRetryCallback === 'function') {
          this.onRetryCallback();
        }
      });
    }

    if (this.btnSkip) {
      this.btnSkip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss();
      });
    }
  }

  setStatus(text, type = 'loading') {
    if (this.statusText) {
      this.statusText.textContent = text;
    }
    if (this.statusDot) {
      this.statusDot.className = `startup-status-dot ${type}`;
    }
  }

  showErrorActions(errorMsg) {
    this.setStatus(errorMsg || 'Backend check issue encountered', 'warning');
    if (this.actionsContainer) {
      this.actionsContainer.style.display = 'flex';
    }
    if (this.hintEl) {
      this.hintEl.textContent = 'Press Continue to enter workspace offline';
    }
    this.readyToDismiss = true;
  }

  hideErrorActions() {
    if (this.actionsContainer) {
      this.actionsContainer.style.display = 'none';
    }
  }

  async markReadyAndDismiss(statusMessage = 'Workspace ready · Entering...') {
    this.setStatus(statusMessage, 'success');
    this.readyToDismiss = true;

    // Ensure user has seen the liquid glass reveal bloom (minimum duration)
    const elapsed = performance.now() - this.startTime;
    const remaining = Math.max(0, this.minDurationMs - elapsed);

    if (remaining > 0) {
      await new Promise(r => setTimeout(r, remaining));
    }

    // Dismiss smoothly
    this.dismiss();
  }

  dismiss() {
    if (this.isDismissed) return;
    this.isDismissed = true;

    if (this.screenEl) {
      this.screenEl.classList.add('loaded');
      setTimeout(() => {
        if (this.animId) cancelAnimationFrame(this.animId);
        if (this.renderer) this.renderer.destroy();
        this.screenEl.style.display = 'none';
      }, 600);
    }
  }
}

export const startupScreen = new StartupScreenController();
