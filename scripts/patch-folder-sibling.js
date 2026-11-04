const fs = require('fs');

const filePath = 'NBLMimic/js/glass-folder-cards.js';
let js = fs.readFileSync(filePath, 'utf8');

// Replace openExpandableFolderCard mounting & closeModal with sibling architecture
const oldFuncRegex = /export function openExpandableFolderCard\({\s*originEl = null,[\s\S]*?return overlay;\s*}/m;

const newFunc = `export function openExpandableFolderCard({
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
  const countLabel = totalCount === 1 ? "1 document" : \`\${totalCount} documents\`;
  const subtitle = kicker || (meta ? \`\${meta}\` : \`\${countLabel} · Click to preview in reader\`);

  // 3. Build Overlay Backdrop (z-index: 900)
  const overlay = document.createElement("div");
  overlay.className = "gf-expandable-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", \`\${label} folder\`);

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
  formatBadge.className = \`gf-expandable-badge badge-\${format || 'doc'}\`;
  formatBadge.textContent = (format || 'Collection').toUpperCase();
  badgeWrap.appendChild(formatBadge);

  if (isDriveAny) {
    const driveBadge = document.createElement("span");
    driveBadge.className = "gf-expandable-drive-badge";
    driveBadge.innerHTML = \`
      <svg width="11" height="11" viewBox="0 0 87.3 78" style="vertical-align:middle; display:inline-block;"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/><path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z"/></svg>
      <span>Drive Synced</span>
    \`;
    badgeWrap.appendChild(driveBadge);
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "gf-expandable-close";
  closeBtn.setAttribute("aria-label", "Close folder");
  closeBtn.title = "Close (Esc)";
  closeBtn.innerHTML = \`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  \`;

  bannerTop.appendChild(badgeWrap);
  bannerTop.appendChild(closeBtn);

  const bannerBottom = document.createElement("div");
  bannerBottom.className = "gf-expandable-banner-bottom";
  bannerBottom.innerHTML = \`
    <h2 class="gf-expandable-title">\${escapeHtml(label)}</h2>
    <div class="gf-expandable-kicker">
      <span>\${escapeHtml(subtitle)}</span>
    </div>
  \`;

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
  searchWrap.innerHTML = \`
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    <input type="text" class="gf-expandable-search-input" placeholder="Search files in \${escapeHtml(label)}..." />
  \`;

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "gf-expandable-actions";

  const themeSwatches = document.createElement("div");
  themeSwatches.className = "gf-expandable-action-btn btn-theme-swatches";
  themeSwatches.title = "Change Fluid Art Theme";
  themeSwatches.innerHTML = \`
    <span style="font-size:10px; color:var(--text-tertiary); margin-right:2px;">Art:</span>
    <div class="gf-expandable-theme-swatches">
      <button type="button" class="gf-expandable-swatch swatch-aurora" data-art="aurora" title="Aurora (Teal/Pink)"></button>
      <button type="button" class="gf-expandable-swatch swatch-glacier" data-art="glacier" title="Glacier (Cyan)"></button>
      <button type="button" class="gf-expandable-swatch swatch-ember" data-art="ember" title="Ember (Gold)"></button>
      <button type="button" class="gf-expandable-swatch swatch-dusk" data-art="dusk" title="Dusk (Violet)"></button>
      <button type="button" class="gf-expandable-swatch swatch-verdant" data-art="verdant" title="Verdant (Emerald)"></button>
    </div>
  \`;

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "gf-expandable-action-btn";
  addBtn.innerHTML = \`
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    <span>Add File</span>
  \`;

  const renameBtn = document.createElement("button");
  renameBtn.type = "button";
  renameBtn.className = "gf-expandable-action-btn";
  renameBtn.innerHTML = \`
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
    <span>Rename</span>
  \`;

  actionsWrap.appendChild(themeSwatches);
  actionsWrap.appendChild(addBtn);
  actionsWrap.appendChild(renameBtn);

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
      empty.innerHTML = \`
        <p style="margin-bottom:12px;">No matching documents in this folder.</p>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-add-file">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span style="margin-left:4px;">Add Document</span>
        </button>
      \`;
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
        (file.content && typeof file.content === "string" ? file.content.replace(/^#+\\s+/gm, "").slice(0, 160) + "..." :
        \`Synchronized \${tag} document ready for grounded multimodal research and AI synthesis.\`);

      const itemCard = document.createElement("div");
      itemCard.className = "gf-expandable-item";
      itemCard.setAttribute("data-file-id", escapeHtml(String(file.id || "")));
      itemCard.innerHTML = \`
        <div class="gf-expandable-item-header">
          <span class="gf-sheet-badge badge-\${formatType}">\${escapeHtml(tag)}</span>
          <span class="gf-sheet-meta">\${escapeHtml(sizeMeta)} &middot; \${escapeHtml(date)}</span>
        </div>
        <div class="gf-expandable-item-title" title="\${escapeHtml(title)}">\${escapeHtml(title)}</div>
        <div class="gf-expandable-item-byline">
          \${isDrive ? \`<svg width="10" height="10" viewBox="0 0 87.3 78" style="vertical-align:middle; display:inline-block;"><path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/><path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z"/><path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z"/><path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z"/></svg>\` : ''}
          <span>\${escapeHtml(sourceLabel)}</span>
          <span>&middot;</span>
          <span>\${escapeHtml(file.category || "Document")}</span>
        </div>
        <p class="gf-expandable-item-excerpt">\${escapeHtml(excerpt)}</p>
        <div class="gf-expandable-item-footer">
          <span>Click to inspect full document</span>
          <span class="gf-expandable-item-action">Open in Reader &rarr;</span>
        </div>
      \`;

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

  // Mount SIBLINGS to document.body
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  // 7. Measure Coordinates for FLIP Shared-Element Expansion
  const originRect = originEl ? originEl.getBoundingClientRect() : null;
  const targetRect = modal.getBoundingClientRect();

  let openAnim = null;
  if (originRect && targetRect.width > 0 && targetRect.height > 0) {
    const scaleX = originRect.width / targetRect.width;
    const scaleY = originRect.height / targetRect.height;
    const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
    const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);
    const originRadius = originEl ? window.getComputedStyle(originEl).borderRadius : "20px";

    modal.style.willChange = "transform, opacity";
    openAnim = modal.animate([
      {
        transform: \`translate3d(\${deltaX}px, \${deltaY}px, 0px) scale(\${scaleX}, \${scaleY})\`,
        borderRadius: originRadius,
        opacity: 0.95
      },
      {
        transform: "translate3d(0px, 0px, 0px) scale(1, 1)",
        borderRadius: "22px",
        opacity: 1
      }
    ], {
      duration: 380,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards"
    });

    overlay.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], {
      duration: 280,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards"
    });

    openAnim.onfinish = () => {
      modal.style.willChange = "auto";
      const input = modal.querySelector(".gf-expandable-search-input");
      if (input) input.focus();
    };
  } else {
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "forwards" });
    modal.animate([
      { transform: "scale(0.9) translateY(20px)", opacity: 0 },
      { transform: "scale(1) translateY(0)", opacity: 1 }
    ], { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" });
    setTimeout(() => {
      const input = modal.querySelector(".gf-expandable-search-input");
      if (input) input.focus();
    }, 120);
  }

  // 8. Event Handlers & Modal Dismissal (Symmetrical Reverse FLIP)
  let isClosed = false;
  const closeModal = (afterCloseCb) => {
    if (isClosed) return;
    isClosed = true;

    window.removeEventListener("keydown", onKeyDown);

    // Cancel openAnim so fill: 'forwards' doesn't lock transform
    if (openAnim) openAnim.cancel();

    // Fast-fade inner body & toolbar (70ms) so text doesn't squish during shrink
    body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 70, fill: "forwards" });
    if (toolbar) toolbar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 70, fill: "forwards" });

    const currentOriginRect = originEl ? originEl.getBoundingClientRect() : originRect;
    const currentTargetRect = modal.getBoundingClientRect();

    if (currentOriginRect && currentTargetRect.width > 0) {
      const closeScaleX = currentOriginRect.width / currentTargetRect.width;
      const closeScaleY = currentOriginRect.height / currentTargetRect.height;
      const closeDeltaX = (currentOriginRect.left + currentOriginRect.width / 2) - (currentTargetRect.left + currentTargetRect.width / 2);
      const closeDeltaY = (currentOriginRect.top + currentOriginRect.height / 2) - (currentTargetRect.top + currentTargetRect.height / 2);
      const originRadius = originEl ? window.getComputedStyle(originEl).borderRadius : "20px";

      modal.style.willChange = "transform, opacity";

      const closeAnim = modal.animate([
        {
          transform: "translate3d(0px, 0px, 0px) scale(1, 1)",
          borderRadius: "22px",
          opacity: 1
        },
        {
          transform: \`translate3d(\${closeDeltaX}px, \${closeDeltaY}px, 0px) scale(\${closeScaleX}, \${closeScaleY})\`,
          borderRadius: originRadius,
          opacity: 0.85
        }
      ], {
        duration: 360,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards"
      });

      overlay.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 340,
        easing: "ease-out",
        fill: "forwards"
      });

      closeAnim.onfinish = () => {
        document.body.style.overflow = prevOverflow;
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof onClose === "function") onClose();
        if (typeof afterCloseCb === "function") afterCloseCb();
      };
    } else {
      overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
      modal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).onfinish = () => {
        document.body.style.overflow = prevOverflow;
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof onClose === "function") onClose();
        if (typeof afterCloseCb === "function") afterCloseCb();
      };
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
}`;

if (oldFuncRegex.test(js)) {
  js = js.replace(oldFuncRegex, newFunc);
  fs.writeFileSync(filePath, js, 'utf8');
  console.log('Successfully updated openExpandableFolderCard with sibling WAAPI architecture!');
} else {
  console.error('Could not match oldFuncRegex in glass-folder-cards.js');
}
