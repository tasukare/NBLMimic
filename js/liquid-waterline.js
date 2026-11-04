/**
 * Nimbus UI · Liquid Waterline — Vanilla ES6 Engine
 * Fluid water pill navigation, WebGL water shader layer, and meniscus waves
 * Zero external dependencies · High GPU performance · Zero Emojis
 */

const PAD = 14; // Canvas bleed around the pill for fluid ripples and shadows

/* ── WebGL Shaders ── */
const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform vec4 uPill;
uniform vec4 uBlob[6];
uniform float uSy[6];
uniform vec4 uRip[6];
uniform vec3 uMouse;
uniform float uDark;
uniform float uAmb;

float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}

float dropD(vec2 p){
  float d=1e4;
  for(int i=0;i<6;i++){
    if(uBlob[i].w>.5){
      d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);
    }
  }
  return d;
}

float pillD(vec2 p){
  vec2 h=uPill.zw*.5;
  return sdRB(p-uPill.xy-h,h,h.y);
}

float lens(float d,float w){
  float t=clamp(-d/w,0.,1.);
  return sqrt(1.-(1.-t)*(1.-t));
}

float waves(vec2 p){
  float w=0.;
  for(int i=0;i<6;i++){
    vec4 R=uRip[i];
    if(R.w>0.){
      float x=length(p-R.xy)-R.z*240.;
      w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);
    }
  }
  vec2 m=p-uMouse.xy;
  w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);
  w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);
  return w;
}

float H(vec2 p){
  float dp=pillD(p);
  return lens(dp,uPill.w*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);
}

float caus(vec2 p,float t){
  vec2 q=p;
  float c=0.;
  for(int i=0;i<3;i++){
    q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;
    c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));
  }
  return c/3.;
}

void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
  float dp=pillD(p);
  float dd=dropD(p);
  float h0=H(p);
  vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
  vec3 V=vec3(0.,0.,1.);
  float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);
  float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;
  float fres=clamp((1.-n.z)*4.,0.,1.);
  vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035));
  float pm=smoothstep(1.,-1.,dp);
  float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);
  float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*(.11+.07*uDark);
  vec3 c=vec3(0.,.14,.36)*sh;
  float a=sh;
  float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);
  c=mix(vec3(1.),irid,.5*fres)*pa+c*(1.-pa);
  a=pa+a*(1.-pa);
  float th=lens(dd,11.);
  float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);
  vec3 tint=mix(vec3(.80,.95,1.),vec3(.55,.82,1.),uDark);
  float rim=dm*(1.-smoothstep(0.,8.,-dd));
  float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);
  float body=.5+.5*clamp(-n.y*3.,-1.,1.);
  float da=dm*(.26+.14*body)*(1.-.35*uDark);
  vec3 dc=mix(tint,vec3(1.),body*.6);
  float la=rim*.22;
  vec3 lc=mix(vec3(0.,.42,.78),vec3(.1,.55,.95),uDark);
  dc=lc*la+dc*da*(1.-la);
  da=la+da*(1.-la);
  la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);
  dc=vec3(1.)*la+dc*(1.-la);
  da=la+da*(1.-la);
  la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);
  dc=vec3(1.)*la+dc*(1.-la);
  da=la+da*(1.-la);
  la=dm*smoothstep(-2.,0.,dd)*.4;
  dc=mix(vec3(1.),irid,.35)*la+dc*(1.-la);
  da=la+da*(1.-la);
  c=dc+c*(1.-da);
  a=da+a*(1.-da);
  gl_FragColor=vec4(c,a);
}`;

/* ── WebGL Context Initializer ── */
function initGL(canvas) {
  try {
    const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 1024;
    const isLowPower = typeof navigator !== 'undefined' && (
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4)
    );
    if (isTouch || isSmallScreen || isLowPower) {
      return null;
    }
    const gl = canvas.getContext('webgl', {
      premultipliedAlpha: true,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power'
    });
    if (!gl) return null;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {};
    for (const name of ['uRes', 'uDpr', 'uTime', 'uPill', 'uBlob', 'uSy', 'uRip', 'uMouse', 'uDark', 'uAmb']) {
      u[name] = gl.getUniformLocation(program, name);
    }
    return { gl, u };
  } catch (e) {
    return null;
  }
}

/** Check if SVG backdrop filter is supported */
function supportsRefraction() {
  if (typeof window === 'undefined' || typeof CSS === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua) && !!CSS.supports?.('backdrop-filter', 'url(#a)');
}

/** Web Audio Soft Synthesized Water "Plip" (Zero external assets) */
let sharedAudioCtx = null;
function playPlipSound() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AC();
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    const t = sharedAudioCtx.currentTime;
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420 + Math.random() * 80, t);
    osc.frequency.exponentialRampToValueAtTime(1450, t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(sharedAudioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  } catch (e) {}
}

/**
 * Initialize Liquid Waterline Pill Navigation on a Container
 * @param {HTMLElement} container
 * @param {Object} options
 * @returns {Object} API controller
 */
export function initLiquidWaterline(container, options = {}) {
  if (!container) return null;

  const itemSelector = options.itemSelector || '.nimbus-item, .canvas-mode-btn';
  const soundEnabled = options.sound !== false;
  const onSelect = options.onSelect;

  // Ensure necessary sub-elements exist in DOM
  container.classList.add('nimbus-nav');
  if (supportsRefraction()) {
    container.setAttribute('data-refract', 'on');
  }

  // Refraction SVG filter container (in document body if not already present)
  if (!document.getElementById('nimbus-refract-svg')) {
    const svgWrap = document.createElement('div');
    svgWrap.id = 'nimbus-refract-svg';
    svgWrap.className = 'nimbus-filters';
    svgWrap.innerHTML = `
      <svg width="0" height="0" style="position:absolute;" aria-hidden="true">
        <filter id="nimbus-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="50" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    `;
    document.body.appendChild(svgWrap);
  }

  // Glass backdrop
  let glassEl = container.querySelector('.nimbus-glass');
  if (!glassEl) {
    glassEl = document.createElement('span');
    glassEl.className = 'nimbus-glass';
    glassEl.setAttribute('aria-hidden', 'true');
    container.insertBefore(glassEl, container.firstChild);
  }

  // Water canvas
  let canvasEl = container.querySelector('.nimbus-water');
  if (!canvasEl) {
    canvasEl = document.createElement('canvas');
    canvasEl.className = 'nimbus-water';
    canvasEl.setAttribute('aria-hidden', 'true');
    container.insertBefore(canvasEl, glassEl.nextSibling);
  }

  // CSS Fallback Drop
  let dropEl = container.querySelector('.nimbus-drop');
  if (!dropEl) {
    dropEl = document.createElement('span');
    dropEl.className = 'nimbus-drop';
    dropEl.setAttribute('aria-hidden', 'true');
    container.insertBefore(dropEl, canvasEl.nextSibling);
  }

  // State object
  const s = {
    a: { x: 0, v: 0 },
    b: { x: 0, v: 0 },
    sy: { s: 1, v: 0 },
    lead: 0,
    lagFrom: 0,
    sats: [],
    rips: [],
    t: { x: 0, cy: 0, q: 0, r: 14 },
    q: 0,
    mouse: { x: 0, y: 0, s: 0, on: false },
    moving: false,
    split: false,
    ready: false,
    w: 0,
    h: 0,
    visible: true,
    reduce: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    raf: 0,
    last: 0,
    time: 0,
    glc: null,
    currentIndex: 0
  };

  s.glc = initGL(canvasEl);
  if (!s.glc) {
    container.setAttribute('data-gl', 'off');
  } else {
    container.setAttribute('data-gl', 'on');
  }

  const getItems = () => Array.from(container.querySelectorAll(itemSelector));

  const local = (clientX, clientY) => {
    const r = container.getBoundingClientRect();
    return { x: clientX - r.left + PAD, y: clientY - r.top + PAD };
  };

  const ripple = (x, y, amp) => {
    if (s.reduce) return;
    s.rips.push({ x, y, age: 0, amp });
    loop();
  };

  const draw = () => {
    const T = s.t;
    const sep = Math.abs(s.a.x - s.b.x);
    const thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1);
    const r = T.r * (1 - 0.3 * thin);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light' ? 1 : 0;

    if (s.glc) {
      const { gl: g, u } = s.glc;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
      g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2);
      g.uniform1f(u.uDpr, dpr);
      g.uniform1f(u.uTime, s.time);
      g.uniform4f(u.uPill, PAD, PAD, s.w, s.h);

      const blobs = new Float32Array(24);
      const sy = new Float32Array(6).fill(1);
      const head = s.lead === 0 ? s.a : s.b;
      const tail = s.lead === 0 ? s.b : s.a;

      blobs.set([
        head.x, T.cy, s.q * (1 - 0.25 * thin), T.r * (1 - 0.12 * thin),
        tail.x, T.cy, s.q * (1 - 0.8 * thin), T.r * (1 - 0.5 * thin)
      ], 0);

      sy[0] = sy[1] = s.sy.s;
      s.sats.slice(0, 4).forEach((d, i) => blobs.set([d.x, d.y, 0, d.r], 8 + i * 4));

      g.uniform4fv(u.uBlob, blobs);
      g.uniform1fv(u.uSy, sy);

      const rips = new Float32Array(24);
      s.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4));
      g.uniform4fv(u.uRip, rips);

      g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s);
      g.uniform1f(u.uDark, isDark);
      g.uniform1f(u.uAmb, s.reduce ? 0 : 1);

      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.TRIANGLES, 0, 3);
    } else if (dropEl) {
      const left = Math.min(s.a.x, s.b.x) - s.q - r - PAD;
      const width = sep + 2 * (s.q + r);
      dropEl.style.width = `${Math.max(width, 24)}px`;
      dropEl.style.transform = `translateX(${left}px) scaleY(${s.sy.s})`;
    }
  };

  const step = (dt, now) => {
    const T = s.t;
    s.time += dt;
    s.q += (T.q - s.q) * Math.min(1, dt * 12);
    const bodies = [s.a, s.b];
    let still = true;

    if (s.reduce) {
      s.a.x = s.b.x = T.x;
      s.a.v = s.b.v = 0;
      s.sy.s = 1;
      s.sats = [];
    } else {
      bodies.forEach((B, i) => {
        const lead = i === s.lead;
        const k = lead ? 220 : 75;
        const c = lead ? 25 : 13;
        const f = !lead && now < s.lagFrom ? 0.08 : 1;
        B.v += (k * (T.x - B.x) - c * B.v) * dt * f;
        B.x += B.v * dt;

        const lo = PAD + 4 + s.q + T.r - 2;
        const hi = PAD + s.w - 4 - s.q - T.r + 2;
        if (B.x < lo || B.x > hi) {
          s.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016;
          B.x = Math.max(lo, Math.min(hi, B.x));
          B.v *= -0.25;
        }
        if (Math.abs(T.x - B.x) > 0.3 || Math.abs(B.v) > 3) still = false;
      });

      const L = bodies[s.lead];
      const syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1);
      s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt;
      s.sy.s += s.sy.v * dt;
      if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false;

      // Break neck: spawn droplets between head and tail
      const sep = Math.abs(s.a.x - s.b.x);
      const r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1));
      if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -4) {
        s.split = true;
        const lo = bodies[1 - s.lead];
        const hi = bodies[s.lead];
        [0.32, 0.52, 0.72].forEach((t, j) => {
          s.sats.push({
            x: lo.x + (hi.x - lo.x) * t + (Math.random() - 0.5) * 6,
            y: T.cy + (Math.random() - 0.5) * 8,
            vx: (lo.v + hi.v) * 0.45,
            vy: (Math.random() - 0.5) * 50,
            r: 4 + Math.random() * 2.5 - j * 0.4,
            k: 70 + Math.random() * 90
          });
        });
      }

      s.sats = s.sats.filter((d) => {
        d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt;
        d.vy += (90 * (T.cy - d.y) - 7 * d.vy) * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.x = Math.max(PAD + 6 + d.r, Math.min(PAD + s.w - 6 - d.r, d.x));
        d.y = Math.max(T.cy - T.r + d.r, Math.min(T.cy + T.r - d.r, d.y));
        if (Math.abs(T.x - d.x) < T.q + T.r * 0.5) d.r -= dt * 24;
        return d.r > 0.6;
      });
      if (s.sats.length) still = false;
    }

    if (s.moving && still) {
      s.moving = false;
      if (s.split || !s.reduce) s.rips.push({ x: T.x, y: T.cy, age: 0, amp: s.split ? 1.1 : 0.6 });
    }

    s.rips.forEach((p) => (p.age += dt));
    s.rips = s.rips.filter((p) => p.age < 2.4);

    const target = s.mouse.on ? 1 : 0;
    s.mouse.s += (target - s.mouse.s) * Math.min(1, dt * 7);
  };

  const loop = () => {
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      step(dt, now);
      draw();
      const busy = s.moving || s.rips.length || s.sats.length || s.mouse.s > 0.01;
      if (s.visible && busy && !s.reduce && !document.hidden) {
        s.raf = requestAnimationFrame(tick);
      } else {
        s.raf = 0;
      }
    };
    s.raf = requestAnimationFrame(tick);
  };

  const measure = () => {
    const items = getItems();
    if (!items.length) return;
    const activeEl = items[s.currentIndex] || items.find(el => el.classList.contains('is-active')) || items[0];
    if (!activeEl) return;

    s.w = container.offsetWidth;
    s.h = container.offsetHeight;

    const T = s.t;
    T.r = activeEl.offsetHeight / 2;
    T.q = Math.max(0, activeEl.offsetWidth / 2 - T.r);
    T.cy = PAD + activeEl.offsetTop + activeEl.offsetHeight / 2;
    const nx = PAD + activeEl.offsetLeft + activeEl.offsetWidth / 2;

    if (!s.ready) {
      s.a.x = s.b.x = nx;
      s.q = T.q;
      s.ready = true;
    } else if (Math.abs(nx - T.x) > 0.5) {
      s.lead = Math.abs(nx - s.a.x) <= Math.abs(nx - s.b.x) ? 0 : 1;
      s.lagFrom = performance.now() + 65;
      s.moving = true;
      s.split = false;
    }
    T.x = nx;

    if (canvasEl) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = s.w + PAD * 2;
      const Hh = s.h + PAD * 2;
      if (canvasEl.width !== Math.round(W * dpr) || canvasEl.height !== Math.round(Hh * dpr)) {
        canvasEl.width = Math.round(W * dpr);
        canvasEl.height = Math.round(Hh * dpr);
        canvasEl.style.width = `${W}px`;
        canvasEl.style.height = `${Hh}px`;
      }
    }
    loop();
  };

  const select = (index, triggerCallback = true) => {
    const items = getItems();
    if (index < 0 || index >= items.length) return;
    const el = items[index];

    // Trigger icon micro-animation if specified
    const fxType = el.getAttribute('data-fx');
    const ico = el.querySelector('.nv-ico');
    if (ico && fxType) {
      ico.removeAttribute('data-fx');
      void ico.offsetWidth; // re-flow
      ico.setAttribute('data-fx', fxType);
    }

    if (soundEnabled) playPlipSound();

    // Trigger subtle ripple from item center
    const r = el.getBoundingClientRect();
    const c = local(r.left + r.width / 2, r.top + r.height / 2);
    if (fxType === 'drop') {
      setTimeout(() => ripple(c.x, s.t.cy, 1.3), 380);
    } else {
      ripple(c.x, c.y, 0.6);
    }

    items.forEach((it, i) => {
      if (i === index) {
        it.classList.add('is-active');
        it.setAttribute('aria-current', 'page');
      } else {
        it.classList.remove('is-active');
        it.removeAttribute('aria-current');
      }
    });

    s.currentIndex = index;
    measure();

    if (triggerCallback && onSelect) {
      onSelect(index, el, el.dataset.mode);
    }
  };

  // Attach Pointer Events
  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = local(e.clientX, e.clientY);
    s.mouse.x = p.x;
    s.mouse.y = p.y;
    s.mouse.on = true;
    loop();
  };

  const onPointerLeave = () => {
    s.mouse.on = false;
    loop();
  };

  const onPointerDown = (e) => {
    const p = local(e.clientX, e.clientY);
    ripple(p.x, p.y, 0.75);
  };

  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerleave', onPointerLeave);
  container.addEventListener('pointerdown', onPointerDown);

  // Wire Click Handlers on Buttons
  const bindItemClicks = () => {
    const items = getItems();
    items.forEach((btn, i) => {
      btn.onclick = (e) => {
        select(i, true);
      };
    });
  };
  bindItemClicks();

  // Keyboard navigation
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const items = getItems();
    const n = (s.currentIndex + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    select(n, true);
    items[n]?.focus();
  });

  // Observers
  const ro = new ResizeObserver(() => {
    measure();
  });
  ro.observe(container);

  const io = new IntersectionObserver(([entry]) => {
    s.visible = entry.isIntersecting;
    if (s.visible) loop();
  });
  io.observe(container);

  const onVisChange = () => {
    s.visible = document.visibilityState === 'visible';
    if (s.visible) {
      loop();
    } else if (s.raf) {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    }
  };
  document.addEventListener('visibilitychange', onVisChange);

  // Initial measure
  const items = getItems();
  const initActive = items.findIndex(it => it.classList.contains('is-active'));
  s.currentIndex = initActive >= 0 ? initActive : 0;
  requestAnimationFrame(() => measure());
  setTimeout(() => measure(), 100);

  // Return Controller
  return {
    setActiveMode: (mode) => {
      const items = getItems();
      const idx = items.findIndex(it => it.getAttribute('data-mode') === mode);
      if (idx >= 0) {
        select(idx, false);
      }
    },
    setActiveIndex: (index) => {
      select(index, false);
    },
    triggerRipple: (x, y, amp) => {
      ripple(x, y, amp);
    },
    resize: () => {
      measure();
    },
    destroy: () => {
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisChange);
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(s.raf);
    }
  };
}

/**
 * Initialize Liquid Meniscus & Wave Effect on Search Bar
 * @param {HTMLElement} searchElement
 * @param {Object} options
 */
export function initLiquidSearchBar(searchElement, options = {}) {
  if (!searchElement) return null;

  searchElement.classList.add('nimbus-search');

  // Insert Water Canvas
  let canvas = searchElement.querySelector('.nimbus-water');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'nimbus-water';
    canvas.setAttribute('aria-hidden', 'true');
    searchElement.insertBefore(canvas, searchElement.firstChild);
  }

  const s = {
    w: 0,
    h: 0,
    rips: [],
    mouse: { x: 0, y: 0, s: 0, on: false },
    time: 0,
    glc: null,
    raf: 0,
    last: 0,
    visible: true,
    reduce: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  };

  s.glc = initGL(canvas);
  if (!s.glc) {
    searchElement.setAttribute('data-gl', 'off');
    return null;
  }

  const local = (clientX, clientY) => {
    const r = searchElement.getBoundingClientRect();
    return { x: clientX - r.left + PAD, y: clientY - r.top + PAD };
  };

  const ripple = (x, y, amp) => {
    if (s.reduce) return;
    s.rips.push({ x, y, age: 0, amp });
    loop();
  };

  const draw = () => {
    if (!s.glc) return;
    const { gl: g, u } = s.glc;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light' ? 1 : 0;

    g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
    g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2);
    g.uniform1f(u.uDpr, dpr);
    g.uniform1f(u.uTime, s.time);
    g.uniform4f(u.uPill, PAD, PAD, s.w, s.h);

    const blobs = new Float32Array(24);
    const sy = new Float32Array(6).fill(1);
    g.uniform4fv(u.uBlob, blobs);
    g.uniform1fv(u.uSy, sy);

    const rips = new Float32Array(24);
    s.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4));
    g.uniform4fv(u.uRip, rips);

    g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s);
    g.uniform1f(u.uDark, isDark);
    g.uniform1f(u.uAmb, s.reduce ? 0 : 0.85);

    g.clearColor(0, 0, 0, 0);
    g.clear(g.COLOR_BUFFER_BIT);
    g.drawArrays(g.TRIANGLES, 0, 3);
  };

  const step = (dt) => {
    s.time += dt;
    s.rips.forEach(p => p.age += dt);
    s.rips = s.rips.filter(p => p.age < 2.2);
    const target = s.mouse.on ? 1 : 0;
    s.mouse.s += (target - s.mouse.s) * Math.min(1, dt * 7);
  };

  const loop = () => {
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      step(dt);
      draw();
      const busy = s.rips.length || s.mouse.s > 0.01;
      if (s.visible && busy && !s.reduce && !document.hidden) {
        s.raf = requestAnimationFrame(tick);
      } else {
        s.raf = 0;
      }
    };
    s.raf = requestAnimationFrame(tick);
  };

  const measure = () => {
    s.w = searchElement.offsetWidth;
    s.h = searchElement.offsetHeight;
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = s.w + PAD * 2;
      const Hh = s.h + PAD * 2;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(Hh * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(Hh * dpr);
        canvas.style.width = `${W}px`;
        canvas.style.height = `${Hh}px`;
      }
    }
    loop();
  };

  searchElement.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = local(e.clientX, e.clientY);
    s.mouse.x = p.x;
    s.mouse.y = p.y;
    s.mouse.on = true;
    loop();
  });

  searchElement.addEventListener('pointerleave', () => {
    s.mouse.on = false;
    loop();
  });

  searchElement.addEventListener('pointerdown', (e) => {
    const p = local(e.clientX, e.clientY);
    ripple(p.x, p.y, 0.7);
  });

  const inputEl = searchElement.querySelector('input');
  if (inputEl) {
    inputEl.addEventListener('focus', () => {
      const r = searchElement.getBoundingClientRect();
      ripple(r.width / 2 + PAD, r.height / 2 + PAD, 0.9);
    });
    inputEl.addEventListener('input', () => {
      const r = searchElement.getBoundingClientRect();
      ripple(Math.random() * r.width + PAD, r.height / 2 + PAD, 0.4);
    });
  }

  const ro = new ResizeObserver(() => measure());
  ro.observe(searchElement);

  const io = new IntersectionObserver(([entry]) => {
    s.visible = entry.isIntersecting;
    if (s.visible) loop();
  });
  io.observe(searchElement);

  const onSearchVisChange = () => {
    s.visible = document.visibilityState === 'visible';
    if (s.visible) {
      loop();
    } else if (s.raf) {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    }
  };
  document.addEventListener('visibilitychange', onSearchVisChange);

  requestAnimationFrame(() => measure());
  setTimeout(() => measure(), 120);

  return {
    ripple: (x, y, amp) => ripple(x, y, amp),
    resize: () => measure()
  };
}
