const fs = require('fs');

let folderJs = fs.readFileSync('NBLMimic/js/glass-folder-cards.js', 'utf8');

const targetStr = `  let openAnim = null;
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
  };`;

const replacementStr = `  // 7. Explicit 0.2s easeOut Scale + Opacity + Y Transitions (Zero Nested LayoutId Lag)
  modal.style.willChange = "transform, opacity";
  const openAnim = modal.animate([
    { opacity: 0, transform: "scale(0.95) translateY(10px)" },
    { opacity: 1, transform: "scale(1) translateY(0px)" }
  ], {
    duration: 200,
    easing: "cubic-bezier(0, 0, 0.2, 1)",
    fill: "forwards"
  });

  const overlayOpenAnim = overlay.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], {
    duration: 200,
    easing: "ease-out",
    fill: "forwards"
  });

  openAnim.onfinish = () => {
    modal.style.willChange = "auto";
    const input = modal.querySelector(".gf-expandable-search-input");
    if (input) input.focus();
  };

  // 8. Event Handlers & Modal Dismissal (Explicit 0.2s Exit Animation)
  let isClosed = false;
  const closeModal = (afterCloseCb) => {
    if (isClosed) return;
    isClosed = true;

    window.removeEventListener("keydown", onKeyDown);
    if (openAnim) openAnim.cancel();
    if (overlayOpenAnim) overlayOpenAnim.cancel();

    modal.style.willChange = "transform, opacity";
    const closeAnim = modal.animate([
      { opacity: 1, transform: "scale(1) translateY(0px)" },
      { opacity: 0, transform: "scale(0.95) translateY(10px)" }
    ], {
      duration: 200,
      easing: "cubic-bezier(0, 0, 0.2, 1)",
      fill: "forwards"
    });

    const overlayCloseAnim = overlay.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: 200,
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
  };`;

// Normalize CRLF to LF for comparison
const normTarget = targetStr.replace(/\r\n/g, '\n');
const normFolder = folderJs.replace(/\r\n/g, '\n');

if (normFolder.includes(normTarget)) {
  const updated = normFolder.replace(normTarget, replacementStr);
  fs.writeFileSync('NBLMimic/js/glass-folder-cards.js', updated, 'utf8');
  console.log('SUCCESS: Replaced open/close animations in glass-folder-cards.js');
} else {
  console.error('FAILED to find target block in glass-folder-cards.js');
}
