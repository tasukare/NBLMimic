const fs = require('fs');

let sr = fs.readFileSync('NBLMimic/js/sources-reader.js', 'utf8');
const isCRLF = sr.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

function norm(str) {
  return str.replace(/\r?\n/g, eol);
}

// Replace morphFileCardToReader and navigateBackToFolders with the rock-solid, fail-safe FLIP implementation
const targetMorphBlock = norm(`/**
 * Phase 3: Reverse "Snap Back into Folder" on Back Click (300ms)
 * Smoothly scales down Reader View and animates folder file stack settling back down.
 */
export async function navigateBackToFolders(animated = true) {
  const canvasMount = document.getElementById('canvas-content-mount');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (animated && !prefersReduced && canvasMount && state.get('viewMode') !== 'folders') {
    const originalPointerEvents = document.body.style.pointerEvents;
    document.body.style.pointerEvents = 'none';

    // 1. Scale down and fade out current canvas content
    try {
      await canvasMount.animate(
        [
          { opacity: 1, transform: 'scale(1) translateY(0)' },
          { opacity: 0, transform: 'scale(0.92) translateY(16px)' }
        ],
        {
          duration: 180,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
          fill: 'forwards'
        }
      ).finished;
    } catch (e) {}

    // 2. Perform state & view switch
    state.set('selectedDocId', null);
    try {
      sessionStorage.removeItem('nbl_selected_doc_id');
    } catch (e) {}
    state.set('viewMode', 'folders');
    document.querySelectorAll('.canvas-mode-btn').forEach(b => b.classList.remove('is-active'));
    const foldersTab = document.getElementById('tab-canvas-folders');
    if (foldersTab) foldersTab.classList.add('is-active');
    const headerNewsBtn = document.getElementById('btn-header-live-news');
    if (headerNewsBtn) headerNewsBtn.classList.remove('is-active');
    updateCanvasView();

    canvasMount.style.opacity = '';
    canvasMount.style.transform = '';

    // 3. Settle folders back down into glass pocket
    const folderGrid = canvasMount.querySelector('.gf-gallery-grid') || canvasMount;
    if (folderGrid) {
      try {
        await folderGrid.animate(
          [
            { transform: 'translateY(-28px)', opacity: 0.8 },
            { transform: 'translateY(0)', opacity: 1 }
          ],
          {
            duration: 240,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
          }
        ).finished;
      } catch (e) {}
    }

    document.body.style.pointerEvents = originalPointerEvents;
    return;
  }

  state.set('selectedDocId', null);
  try {
    sessionStorage.removeItem('nbl_selected_doc_id');
  } catch (e) {}
  state.set('viewMode', 'folders');
  document.querySelectorAll('.canvas-mode-btn').forEach(b => b.classList.remove('is-active'));
  const foldersTab = document.getElementById('tab-canvas-folders');
  if (foldersTab) foldersTab.classList.add('is-active');
  const headerNewsBtn = document.getElementById('btn-header-live-news');
  if (headerNewsBtn) headerNewsBtn.classList.remove('is-active');
  updateCanvasView();
}
window.navigateBackToFolders = navigateBackToFolders;

/**
 * Phase 1 & 2: Two-Stage Pop-Out & Rapid Full-Canvas Morph (Aceternity / macOS Quick Look style)
 * 60fps zero layout thrashing shared-element morph via native Web Animations API.
 */
export async function morphFileCardToReader(file, sheetEl) {
  const canvasMount = document.getElementById('canvas-content-mount');
  if (!canvasMount) {
    viewDocument(file.id);
    return;
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || !sheetEl) {
    canvasMount.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 60, easing: 'ease-out' })
      .onfinish = () => {
        viewDocument(file.id);
        canvasMount.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 60, easing: 'ease-in' });
      };
    return;
  }

  // Phase 1: Folder Ejection / "Pop Out" (0ms -> 150ms)
  const originalPointerEvents = document.body.style.pointerEvents;
  document.body.style.pointerEvents = 'none';

  sheetEl.classList.add('is-popping-out');
  sheetEl.style.zIndex = '500';

  sheetEl.animate(
    [
      {
        transform: 'translate3d(var(--gf-jx, 0px), 0, 0) rotate(var(--gf-jr, 0deg)) scale(1)'
      },
      {
        transform: 'translate3d(0, -44px, 30px) rotate(0deg) scale(1.06)',
        boxShadow: '0 24px 44px -8px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.25)'
      }
    ],
    {
      duration: 150,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    }
  );

  const gallery = canvasMount.querySelector('.gf-gallery-container');
  if (gallery) {
    gallery.animate(
      [
        { transform: 'scale(1)', opacity: 1, filter: 'blur(0px)' },
        { transform: 'scale(0.96)', opacity: 0.35, filter: 'blur(4px)' }
      ],
      {
        duration: 220,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      }
    );
  }

  await new Promise(r => setTimeout(r, 150));

  // Phase 2: Rapid Shared-Element Morph to Full Canvas (150ms -> 420ms)
  const firstRect = sheetEl.getBoundingClientRect();
  const lastRect = canvasMount.getBoundingClientRect();

  const deltaX = firstRect.left - lastRect.left;
  const deltaY = firstRect.top - lastRect.top;
  const scaleX = firstRect.width / lastRect.width;
  const scaleY = firstRect.height / lastRect.height;

  const portal = document.createElement('div');
  portal.className = 'file-morph-portal';
  portal.style.position = 'fixed';
  portal.style.top = \`\${lastRect.top}px\`;
  portal.style.left = \`\${lastRect.left}px\`;
  portal.style.width = \`\${lastRect.width}px\`;
  portal.style.height = \`\${lastRect.height}px\`;
  portal.style.zIndex = '9999';
  portal.style.pointerEvents = 'none';
  portal.style.overflow = 'hidden';
  portal.style.transformOrigin = '0 0';

  const formatType = classifyFileFormat(file);
  const badgeText = (file.badge || (
    formatType === 'pdf' ? 'PDF' :
    formatType === 'doc' ? 'DOCX' :
    formatType === 'sheet' ? 'SHEET' :
    formatType === 'slide' ? 'SLIDES' :
    formatType === 'note' ? 'NOTE' : 'FILE'
  )).toUpperCase();

  const title = file.title || 'Untitled Document';
  const meta = file.sizeFormatted || file.meta || 'Doc';
  const sourceLabel = file.source || 'NBLMimic';

  portal.innerHTML = \`
    <div class="file-morph-inner">
      <div class="file-morph-badge badge-\${formatType}">\${escapeHtml(badgeText)}</div>
      <h2 class="file-morph-title">\${escapeHtml(title)}</h2>
      <div class="file-morph-byline">\${escapeHtml(sourceLabel)} · \${escapeHtml(meta)}</div>
      <div class="file-morph-body-skeleton">
        <div class="file-morph-line"></div>
        <div class="file-morph-line w-90"></div>
        <div class="file-morph-line w-80"></div>
        <div class="file-morph-line w-60"></div>
      </div>
    </div>
  \`;

  document.body.appendChild(portal);
  sheetEl.style.opacity = '0';

  // Mount target Reader View underneath
  viewDocument(file.id);
  canvasMount.style.opacity = '0';
  canvasMount.style.transform = 'translateY(10px)';

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const targetBg = isDark ? '#09090b' : '#ffffff';
  const targetBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

  portal.animate(
    [
      {
        transform: \`translate3d(\${deltaX}px, \${deltaY}px, 0) scale3d(\${scaleX}, \${scaleY}, 1)\`,
        borderRadius: '14px',
        backgroundColor: '#ffffff',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
        opacity: 1,
        offset: 0
      },
      {
        backgroundColor: targetBg,
        borderColor: targetBorder,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        opacity: 1,
        offset: 0.65
      },
      {
        transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
        borderRadius: '0px',
        backgroundColor: targetBg,
        borderColor: targetBorder,
        boxShadow: 'none',
        opacity: 0,
        offset: 1
      }
    ],
    {
      duration: 270,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards'
    }
  );

  // During final 110ms of morph, cross-fade Reader View
  canvasMount.animate(
    [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    {
      duration: 160,
      delay: 110,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    }
  );

  await new Promise(r => setTimeout(r, 270));

  if (portal.parentNode) portal.parentNode.removeChild(portal);
  canvasMount.style.opacity = '';
  canvasMount.style.transform = '';
  document.body.style.pointerEvents = originalPointerEvents;
}
window.morphFileCardToReader = morphFileCardToReader;`);

const replaceMorphBlock = norm(`/**
 * Phase 3: Reverse "Snap Back into Folder" on Back Click (240ms)
 * Smoothly scales down Reader View and animates folder file stack settling back down.
 * 100% Fail-Safe: Always restores visibility and pointer events under any condition.
 */
export async function navigateBackToFolders(animated = true) {
  const canvasMount = document.getElementById('canvas-content-mount');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  try {
    if (animated && !prefersReduced && canvasMount && state.get('viewMode') !== 'folders') {
      try {
        await canvasMount.animate(
          [
            { opacity: 1, transform: 'scale(1) translateY(0)' },
            { opacity: 0.2, transform: 'scale(0.94) translateY(18px)' }
          ],
          {
            duration: 160,
            easing: 'cubic-bezier(0.4, 0, 1, 1)',
            fill: 'none'
          }
        ).finished;
      } catch (e) {}
    }
  } finally {
    // 2. Perform state & view switch
    state.set('selectedDocId', null);
    try {
      sessionStorage.removeItem('nbl_selected_doc_id');
    } catch (e) {}
    state.set('viewMode', 'folders');
    document.querySelectorAll('.canvas-mode-btn').forEach(b => b.classList.remove('is-active'));
    const foldersTab = document.getElementById('tab-canvas-folders');
    if (foldersTab) foldersTab.classList.add('is-active');
    const headerNewsBtn = document.getElementById('btn-header-live-news');
    if (headerNewsBtn) headerNewsBtn.classList.remove('is-active');
    
    // Ensure canvas mount styles are 100% clean
    if (canvasMount) {
      canvasMount.style.opacity = '1';
      canvasMount.style.transform = '';
      canvasMount.style.filter = '';
    }
    document.body.style.pointerEvents = '';
    
    updateCanvasView();

    // 3. Settle folders back down into glass pocket
    const folderGrid = canvasMount?.querySelector('.gf-gallery-grid');
    if (folderGrid && animated && !prefersReduced) {
      try {
        folderGrid.animate(
          [
            { transform: 'translateY(-20px)', opacity: 0.8 },
            { transform: 'translateY(0)', opacity: 1 }
          ],
          {
            duration: 220,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'none'
          }
        );
      } catch (e) {}
    }
  }
}
window.navigateBackToFolders = navigateBackToFolders;

/**
 * Aceternity / Framer Motion layoutId Morph Transition
 * Calculates FLIP delta from folder sheet position into full Reader View.
 * 100% Fail-Safe: Always restores visibility and pointer events under any condition.
 */
export async function morphFileCardToReader(file, sheetEl) {
  const canvasMount = document.getElementById('canvas-content-mount');
  if (!canvasMount || !file) {
    viewDocument(file?.id);
    return;
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Capture initial card rect before switching
  let firstRect = null;
  if (sheetEl && !prefersReduced) {
    try {
      firstRect = sheetEl.getBoundingClientRect();
    } catch (e) {}
  }

  try {
    // 2. Immediately mount the target Document / Reader View
    await viewDocument(file.id);

    // If reduced motion or no valid bounding rect, ensure normal display and return
    if (prefersReduced || !firstRect || firstRect.width === 0 || firstRect.height === 0) {
      canvasMount.style.opacity = '1';
      canvasMount.style.transform = '';
      return;
    }

    // 3. Capture final canvas rect
    const lastRect = canvasMount.getBoundingClientRect();
    if (lastRect.width === 0 || lastRect.height === 0) {
      canvasMount.style.opacity = '1';
      canvasMount.style.transform = '';
      return;
    }

    // 4. Calculate FLIP delta (Framer Motion layoutId calculation)
    const dx = firstRect.left - lastRect.left;
    const dy = firstRect.top - lastRect.top;
    const sx = Math.max(0.08, Math.min(1, firstRect.width / lastRect.width));
    const sy = Math.max(0.08, Math.min(1, firstRect.height / lastRect.height));

    canvasMount.style.transformOrigin = '0 0';

    // 5. High-velocity spring morph directly on Reader View
    const anim = canvasMount.animate(
      [
        {
          transform: \`translate3d(\${dx}px, \${dy}px, 0) scale3d(\${sx}, \${sy}, 1)\`,
          borderRadius: '16px',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)',
          opacity: 0.88
        },
        {
          transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
          borderRadius: '0px',
          boxShadow: 'none',
          opacity: 1
        }
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'none'
      }
    );

    await anim.finished;
  } catch (err) {
    console.warn('[Morph] Transition completed with fallback:', err);
  } finally {
    // Guaranteed cleanup: canvas is ALWAYS visible and unblocked
    if (canvasMount) {
      canvasMount.style.transformOrigin = '';
      canvasMount.style.transform = '';
      canvasMount.style.borderRadius = '';
      canvasMount.style.boxShadow = '';
      canvasMount.style.opacity = '1';
      canvasMount.style.filter = '';
    }
    if (sheetEl) {
      sheetEl.style.opacity = '1';
      sheetEl.classList.remove('is-popping-out');
    }
    document.body.style.pointerEvents = '';
  }
}
window.morphFileCardToReader = morphFileCardToReader;`);

if (sr.includes(targetMorphBlock)) {
  sr = sr.replace(targetMorphBlock, replaceMorphBlock);
  fs.writeFileSync('NBLMimic/js/sources-reader.js', sr, 'utf8');
  console.log('Successfully updated sources-reader.js with bulletproof FLIP morph!');
} else {
  console.error('Target morph block not found in sources-reader.js');
}
