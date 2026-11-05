/**
 * Memory Corridor Scroll Mini-Game & Aceternity Vortex Portal Transition
 * Transforms startup preloader into an interactive 3D knowledge tunnel.
 * Zero external dependencies · High GPU performance · Zero Emojis
 */

import { playPlipSound } from './liquid-navbar.js';
import { state } from './state.js';

export function startPortalMiniGame(options = {}) {
  const onComplete = options.onComplete || (() => {});

  // Immediately hide startup-screen so it never overlaps or blurs over the 3D corridor
  const startupEl = document.getElementById('startup-screen');
  if (startupEl) {
    startupEl.style.display = 'none';
    startupEl.style.opacity = '0';
    startupEl.style.pointerEvents = 'none';
    startupEl.classList.add('dismissed', 'loaded');
  }

  // 1. Gather Knowledge Nodes (Notes, Sources, Folders, News)
  const nodes = [];

  // Local Notes
  try {
    const rawNotes = localStorage.getItem('nbl_notes_scratchpad') || '';
    if (rawNotes.trim()) {
      nodes.push({
        id: 'user-notes',
        type: 'Note',
        badge: 'Lab Notes',
        title: 'User Synthesis Scratchpad',
        snippet: rawNotes.slice(0, 160) + (rawNotes.length > 160 ? '…' : ''),
        time: 'Local Vault'
      });
    }
  } catch (e) {}

  // Active Sources
  const sources = state.get('sources') || [];
  sources.forEach((s) => {
    nodes.push({
      id: s.id || `src-${Math.random()}`,
      type: s.type || 'Source',
      badge: s.type ? s.type.toUpperCase() : 'DOCUMENT',
      title: s.title || 'Untitled Document',
      snippet: s.excerpt || s.content?.slice(0, 140) || 'Grounded research source node.',
      time: s.date || 'Active'
    });
  });

  // Recent World News or Fallback Scientific Discoveries
  const fallbackNodes = [
    {
      id: 'fn-1',
      type: 'Quantum',
      badge: 'QUANTUM COMPUTE',
      title: 'Post-Quantum Cryptographic Key Encapsulation with Zero Latency Penalty',
      snippet: 'Lattice-based hardware accelerators provide microsecond cryptographic operations for sovereign data clusters.',
      time: '2h ago'
    },
    {
      id: 'fn-2',
      type: 'AI',
      badge: 'FRONTIER AI',
      title: 'Sparse Mixture-of-Experts Token Routing Decreases Compute Footprint by 65%',
      snippet: 'Dynamic path selection maintains benchmark reasoning accuracy while activating only 8% of weights.',
      time: '4h ago'
    },
    {
      id: 'fn-3',
      type: 'Biotech',
      badge: 'EPIGENETICS',
      title: 'CRISPR Histone Methylation Silences Target Genes Without DNA Breaks',
      snippet: 'Direct epigenetic editing preserves chromosomal integrity and long-term repression across primate models.',
      time: '12h ago'
    },
    {
      id: 'fn-4',
      type: 'Semiconductors',
      badge: 'HARDWARE',
      title: 'Advanced 2.5D Packaging Yields Next-Generation High-Bandwidth Memory Arrays',
      snippet: 'Silicon interposers break throughput barriers for multi-terabyte parameter weights.',
      time: '18h ago'
    }
  ];

  fallbackNodes.forEach(fn => {
    if (nodes.length < 8) nodes.push(fn);
  });

  // 2. Build DOM Structure
  const overlay = document.createElement('div');
  overlay.className = 'portal-corridor-overlay';
  overlay.id = 'portal-corridor-overlay';

  // Canvas for background stars & vortex convergence
  const canvas = document.createElement('canvas');
  canvas.className = 'portal-vortex-canvas';
  overlay.appendChild(canvas);

  // 3D Scene
  const scene = document.createElement('div');
  scene.className = 'corridor-3d-scene';
  const track = document.createElement('div');
  track.className = 'corridor-track';
  scene.appendChild(track);
  overlay.appendChild(scene);

  // Shockwave overlay for Stage C
  const shockwave = document.createElement('div');
  shockwave.className = 'portal-lens-shockwave';
  overlay.appendChild(shockwave);

  // HUD
  const hud = document.createElement('div');
  hud.className = 'portal-hud-pill';
  hud.innerHTML = `
    <div class="portal-hud-progress-wrap">
      <div class="portal-hud-track">
        <div class="portal-hud-bar" id="portal-hud-bar"></div>
      </div>
      <span class="portal-hud-counter" id="portal-hud-counter">Synced 0 / ${nodes.length} Nodes</span>
    </div>
    <button class="portal-hud-skip-btn" id="btn-portal-skip" type="button">Skip to Lab (Space)</button>
  `;
  overlay.appendChild(hud);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-active'));

  // 3. Render 3D Cards along Z axis
  const cardElements = [];
  const TOTAL_DEPTH = 3200;
  const stepZ = TOTAL_DEPTH / (nodes.length + 1);

  nodes.forEach((node, i) => {
    const card = document.createElement('div');
    card.className = 'corridor-card';
    card.setAttribute('data-index', String(i));

    const side = (i % 2 === 0) ? -1 : 1;
    const xPos = side * (140 + (i % 3) * 35);
    const yPos = ((i % 4) - 1.5) * 60;
    const zPos = -400 - (i * stepZ);
    const rotY = side * -6;

    card.style.transform = `translate3d(${xPos}px, ${yPos}px, ${zPos}px) rotateY(${rotY}deg)`;

    card.innerHTML = `
      <div class="corridor-card-header">
        <span class="corridor-card-badge">${node.badge}</span>
        <span class="corridor-card-time">${node.time}</span>
      </div>
      <div class="corridor-card-title">${node.title}</div>
      <div class="corridor-card-snippet">${node.snippet}</div>
    `;

    track.appendChild(card);
    cardElements.push({ el: card, z: zPos, pinged: false });
  });

  // User Profile Data for Monolith
  let userName = 'Researcher';
  let userAvatar = '';
  try {
    const raw = localStorage.getItem('nbl_user_session_raw') || sessionStorage.getItem('nbl_user_session_raw');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.name) userName = parsed.name;
      if (parsed.picture) userAvatar = parsed.picture;
    }
  } catch (e) {}

  // 4. Monolith Core Gate at end
  const monolith = document.createElement('div');
  monolith.className = 'corridor-monolith';
  const monolithZ = -TOTAL_DEPTH - 200;
  monolith.style.transform = `translate3d(0, 0, ${monolithZ}px)`;

  const avatarMarkup = userAvatar
    ? `<div class="corridor-monolith-avatar"><img src="${userAvatar}" alt="${userName}" /></div>`
    : `<div class="corridor-monolith-avatar">
         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
           <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
         </svg>
       </div>`;

  monolith.innerHTML = `
    ${avatarMarkup}
    <div class="corridor-monolith-title">Welcome to NBLMimic, ${userName}</div>
    <div class="corridor-monolith-desc">Multimodal Knowledge Vault Synced & Grounded · Ready for Exploration</div>
    <button class="portal-enter-btn" id="btn-corridor-enter" type="button">
      <span>Enter the Portal</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </button>
  `;
  track.appendChild(monolith);

  // 5. Canvas Starfield & Particle Vortex
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const particles = Array.from({ length: 140 }, () => ({
    x: (Math.random() - 0.5) * width * 1.5,
    y: (Math.random() - 0.5) * height * 1.5,
    z: Math.random() * TOTAL_DEPTH,
    size: Math.random() * 2 + 0.8,
    color: Math.random() > 0.4 ? '#38bdf8' : (Math.random() > 0.5 ? '#818cf8' : '#34d399')
  }));

  // Resize handler
  const onResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  // 6. Smooth Scroll Physics
  let currentZ = 0;
  let targetZ = 0;
  let isTransitioning = false;
  let pingCount = 0;

  const updateHud = () => {
    const progress = Math.min(1, Math.max(0, targetZ / TOTAL_DEPTH));
    const progressBar = document.getElementById('portal-hud-bar');
    const counter = document.getElementById('portal-hud-counter');
    if (progressBar) progressBar.style.width = `${progress * 100}%`;
    if (counter) counter.textContent = `Synced ${pingCount} / ${nodes.length} Nodes`;
  };

  const pingNode = (item) => {
    if (item.pinged) return;
    item.pinged = true;
    item.el.classList.add('is-pinged');
    playPlipSound();
    pingCount++;
    updateHud();
  };

  // Card interactions
  cardElements.forEach(item => {
    item.el.addEventListener('mouseenter', () => pingNode(item));
    item.el.addEventListener('click', () => pingNode(item));
  });

  // Scroll / Wheel navigation
  const onWheel = (e) => {
    if (isTransitioning) return;
    e.preventDefault();
    targetZ += e.deltaY * 1.4;
    targetZ = Math.max(0, Math.min(TOTAL_DEPTH + 100, targetZ));
  };
  window.addEventListener('wheel', onWheel, { passive: false });

  // Touch / Drag navigation
  let startY = 0;
  const onTouchStart = (e) => {
    if (e.touches.length > 0) startY = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (isTransitioning || e.touches.length === 0) return;
    const dy = startY - e.touches[0].clientY;
    startY = e.touches[0].clientY;
    targetZ += dy * 2.8;
    targetZ = Math.max(0, Math.min(TOTAL_DEPTH + 100, targetZ));
  };
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });

  // Keyboard navigation
  const onKeyDown = (e) => {
    if (isTransitioning) return;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      triggerPortalTransition();
    } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      targetZ = Math.min(TOTAL_DEPTH + 100, targetZ + 350);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      targetZ = Math.max(0, targetZ - 350);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  // Skip button click
  const skipBtn = document.getElementById('btn-portal-skip');
  if (skipBtn) skipBtn.onclick = () => triggerPortalTransition();

  // Enter button click on Monolith
  const enterBtn = document.getElementById('btn-corridor-enter');
  if (enterBtn) enterBtn.onclick = () => triggerPortalTransition();

  // 7. Render Loop
  let rafId = 0;
  let vortexPhase = 0;

  const render = () => {
    // Smooth automatic forward glide toward the portal gate
    if (!isTransitioning) {
      targetZ += 32;
      targetZ = Math.min(TOTAL_DEPTH + 100, targetZ);
    }

    // Spring ease to targetZ
    currentZ += (targetZ - currentZ) * 0.12;

    // Move corridor
    track.style.transform = `translate3d(0, 0, ${currentZ}px)`;

    // Check proximity to ping nodes automatically
    cardElements.forEach(item => {
      const dist = Math.abs(currentZ + item.z);
      if (dist < 280 && !item.pinged) {
        pingNode(item);
      }
    });

    // Draw Particles on Canvas
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;

    particles.forEach(p => {
      if (isTransitioning) {
        // Stage C: Converge violently towards central event horizon
        p.x += (0 - p.x) * 0.08;
        p.y += (0 - p.y) * 0.08;
        p.z -= 45;
      } else {
        p.z -= 1.5;
        if (p.z < 0) p.z += TOTAL_DEPTH;
      }

      const fov = 400;
      const factor = fov / (fov + Math.max(1, p.z));
      const px = cx + p.x * factor;
      const py = cy + p.y * factor;
      const pr = Math.max(0.5, p.size * factor * 1.8);

      if (px >= 0 && px <= width && py >= 0 && py <= height) {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, factor * 1.2);
        ctx.fill();
      }
    });

    if (isTransitioning) {
      vortexPhase += 0.08;
      // Draw central radiant event horizon
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 280);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
      grad.addColorStop(0.7, 'rgba(99, 102, 241, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = Math.min(1, vortexPhase * 0.8);
      ctx.beginPath();
      ctx.arc(cx, cy, 280, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Auto-trigger if scrolled past 98%
    if (!isTransitioning && currentZ >= TOTAL_DEPTH) {
      triggerPortalTransition();
    }

    rafId = requestAnimationFrame(render);
  };
  rafId = requestAnimationFrame(render);

  // 8. Stage C: Aceternity Vortex & Liquid Lens Shockwave Portal Transition
  function triggerPortalTransition() {
    if (isTransitioning) return;
    isTransitioning = true;

    // Play final water arrival chime
    playPlipSound();
    setTimeout(() => playPlipSound(), 80);
    setTimeout(() => playPlipSound(), 160);

    // Hide HUD smoothly
    hud.style.transition = 'opacity 250ms ease, transform 250ms ease';
    hud.style.opacity = '0';
    hud.style.transform = 'translateX(-50%) translateY(20px)';

    // Position app-shell underneath for reveal
    const appShell = document.getElementById('app-shell');
    if (appShell) {
      appShell.classList.remove('app-shell-preauth');
      appShell.classList.add('portal-reveal-init');
      appShell.style.display = 'flex';
    }

    // Expand circular refraction shockwave ring
    const startTime = performance.now();
    const duration = 650; // ms

    const animateShockwave = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Fast ease-out curve
      const ease = 1 - Math.pow(1 - progress, 3);
      const radius = ease * 160; // %

      shockwave.style.clipPath = `circle(${radius}% at 50% 50%)`;

      if (progress < 1) {
        requestAnimationFrame(animateShockwave);
      } else {
        completeTransition();
      }
    };
    requestAnimationFrame(animateShockwave);

    // Trigger app-shell reveal halfway through shockwave
    setTimeout(() => {
      if (appShell) {
        appShell.classList.remove('portal-reveal-init');
        appShell.classList.add('portal-reveal-active');
      }
    }, 150);

    function completeTransition() {
      // Fade out corridor overlay
      overlay.style.transition = 'opacity 350ms ease-out';
      overlay.style.opacity = '0';

      // Clean up startup screen
      const startup = document.getElementById('startup-screen');
      if (startup) {
        startup.style.transition = 'opacity 350ms ease-out';
        startup.style.opacity = '0';
        setTimeout(() => {
          startup.style.display = 'none';
          startup.style.opacity = '0';
          startup.style.pointerEvents = 'none';
          import('./startup-screen.js').then(({ startupScreen }) => {
            startupScreen.dismiss(true);
          }).catch(() => {});
        }, 360);
      }

      setTimeout(() => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', onResize);
        overlay.remove();
        if (appShell) {
          appShell.classList.remove('portal-reveal-active', 'app-shell-preauth');
          appShell.style.opacity = '1';
          appShell.style.pointerEvents = 'auto';
        }
        onComplete();
      }, 400);
    }
  }

  return {
    skip: () => triggerPortalTransition()
  };
}
