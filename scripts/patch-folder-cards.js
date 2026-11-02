const fs = require('fs');

const filePath = 'NBLMimic/js/glass-folder-cards.js';
let js = fs.readFileSync(filePath, 'utf8');

// 1. Add originEl = null to openExpandableFolderCard parameter list
js = js.replace(
  /export function openExpandableFolderCard\({\s*format = "",/m,
  `export function openExpandableFolderCard({\n  originEl = null,\n  format = "",`
);

// 2. Replace the mounting code around line 688
const oldMountSnippet = `  // 8. Mount to DOM
  document.body.appendChild(overlay);

  setTimeout(() => {
    const input = modal.querySelector(".gf-expandable-search-input");
    if (input) input.focus();
  }, 120);`;

const newMountSnippet = `  // 8. Mount to DOM with Aceternity FLIP Shared-Element Expansion
  document.body.appendChild(overlay);

  const originRect = originEl ? originEl.getBoundingClientRect() : null;
  const targetRect = modal.getBoundingClientRect();

  if (originRect && targetRect.width > 0 && targetRect.height > 0) {
    const scaleX = originRect.width / targetRect.width;
    const scaleY = originRect.height / targetRect.height;
    const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
    const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);

    modal.style.transformOrigin = "center center";
    modal.style.transform = \`translate3d(\${deltaX}px, \${deltaY}px, 0px) scale(\${scaleX}, \${scaleY})\`;
    modal.style.borderRadius = "20px";
    modal.style.opacity = "0.85";
    overlay.style.opacity = "0";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add("is-visible");
        overlay.style.opacity = "1";
        modal.classList.add("is-visible");
        modal.style.transition = "transform 460ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 460ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease";
        modal.style.transform = "translate3d(0px, 0px, 0px) scale(1, 1)";
        modal.style.borderRadius = "22px";
        modal.style.opacity = "1";

        setTimeout(() => {
          const input = modal.querySelector(".gf-expandable-search-input");
          if (input) input.focus();
        }, 250);
      });
    });
  } else {
    overlay.classList.add("is-visible");
    modal.classList.add("is-visible");
    setTimeout(() => {
      const input = modal.querySelector(".gf-expandable-search-input");
      if (input) input.focus();
    }, 120);
  }`;

if (js.includes(oldMountSnippet)) {
  js = js.replace(oldMountSnippet, newMountSnippet);
  console.log('Successfully updated mount snippet with FLIP shared element transition.');
} else {
  console.warn('Could not find oldMountSnippet');
}

// 3. Update closeModal in openExpandableFolderCard
const oldCloseSnippet = `    window.removeEventListener("keydown", onKeyDown);
    overlay.classList.add("is-closing");
    modal.classList.add("is-closing");

    setTimeout(() => {
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      if (typeof onClose === "function") {
        onClose();
      }
      if (typeof afterCloseCb === "function") {
        afterCloseCb();
      }
    }, 200);`;

const newCloseSnippet = `    window.removeEventListener("keydown", onKeyDown);

    const currentOriginRect = originEl ? originEl.getBoundingClientRect() : null;
    const currentTargetRect = modal.getBoundingClientRect();

    if (currentOriginRect && currentTargetRect.width > 0) {
      const closeScaleX = currentOriginRect.width / currentTargetRect.width;
      const closeScaleY = currentOriginRect.height / currentTargetRect.height;
      const closeDeltaX = (currentOriginRect.left + currentOriginRect.width / 2) - (currentTargetRect.left + currentTargetRect.width / 2);
      const closeDeltaY = (currentOriginRect.top + currentOriginRect.height / 2) - (currentTargetRect.top + currentTargetRect.height / 2);

      overlay.classList.add("is-closing");
      overlay.style.opacity = "0";
      modal.style.transition = "transform 380ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 380ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease";
      modal.style.transform = \`translate3d(\${closeDeltaX}px, \${closeDeltaY}px, 0px) scale(\${closeScaleX}, \${closeScaleY})\`;
      modal.style.borderRadius = "20px";
      modal.style.opacity = "0";

      setTimeout(() => {
        document.body.style.overflow = prevOverflow;
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (typeof onClose === "function") {
          onClose();
        }
        if (typeof afterCloseCb === "function") {
          afterCloseCb();
        }
      }, 380);
    } else {
      overlay.classList.add("is-closing");
      modal.classList.add("is-closing");

      setTimeout(() => {
        document.body.style.overflow = prevOverflow;
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (typeof onClose === "function") {
          onClose();
        }
        if (typeof afterCloseCb === "function") {
          afterCloseCb();
        }
      }, 200);
    }`;

if (js.includes(oldCloseSnippet)) {
  js = js.replace(oldCloseSnippet, newCloseSnippet);
  console.log('Successfully updated closeModal with FLIP reverse animation.');
} else {
  console.warn('Could not find oldCloseSnippet');
}

// 4. Pass originEl: root when calling openExpandableFolderCard in openFolderModal
const oldCallSnippet = `    openExpandableFolderCard({
      format,
      label,`;

const newCallSnippet = `    openExpandableFolderCard({
      originEl: root,
      format,
      label,`;

if (js.includes(oldCallSnippet)) {
  js = js.replace(oldCallSnippet, newCallSnippet);
  console.log('Successfully passed originEl: root to openExpandableFolderCard.');
} else {
  console.warn('Could not find oldCallSnippet');
}

fs.writeFileSync(filePath, js, 'utf8');
