const fs = require('fs');

const filePath = 'NBLMimic/js/glass-folder-cards.js';
let js = fs.readFileSync(filePath, 'utf8');

// Replace closeModal in openExpandableFolderCard
const oldCloseModalRegex = /let isClosed = false;\s*const closeModal = \(afterCloseCb\) => \{[\s\S]*?overlay\.__closeExpandable = closeModal;/m;

const newCloseModal = `let isClosed = false;
  const closeModal = (afterCloseCb) => {
    if (isClosed) return;
    isClosed = true;

    window.removeEventListener("keydown", onKeyDown);

    // Fast-fade inner body & toolbar (90ms) so text/items don't squish during shrink
    body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: "forwards" });
    if (toolbar) toolbar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: "forwards" });

    const currentOriginRect = originEl ? originEl.getBoundingClientRect() : null;
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
        duration: 320,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards"
      });

      overlay.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 300,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards"
      });

      closeAnim.onfinish = () => {
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
      };
    } else {
      overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).onfinish = () => {
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
      };
    }
  };

  overlay.__closeExpandable = closeModal;`;

if (oldCloseModalRegex.test(js)) {
  js = js.replace(oldCloseModalRegex, newCloseModal);
  console.log('Successfully updated closeModal in glass-folder-cards.js');
} else {
  console.warn('Could not match oldCloseModalRegex');
}

// Replace mounting section
const oldMountRegex = /\/\/ 8\. Mount to DOM[\s\S]*?return overlay;/m;

const newMount = `// 8. Mount to DOM with Aceternity FLIP Shared-Element Expansion (WAAPI 60 FPS)
  document.body.appendChild(overlay);

  const originRect = originEl ? originEl.getBoundingClientRect() : null;
  const targetRect = modal.getBoundingClientRect();

  if (originRect && targetRect.width > 0 && targetRect.height > 0) {
    const scaleX = originRect.width / targetRect.width;
    const scaleY = originRect.height / targetRect.height;
    const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
    const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);
    const originRadius = originEl ? window.getComputedStyle(originEl).borderRadius : "20px";

    modal.style.willChange = "transform, opacity";
    const openAnim = modal.animate([
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

  return overlay;`;

if (oldMountRegex.test(js)) {
  js = js.replace(oldMountRegex, newMount);
  console.log('Successfully updated mount animation in glass-folder-cards.js');
} else {
  console.warn('Could not match oldMountRegex');
}

fs.writeFileSync(filePath, js, 'utf8');
