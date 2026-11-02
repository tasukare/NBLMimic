const fs = require('fs');

let folderCode = fs.readFileSync('js/glass-folder-cards.js', 'utf8');

// Replace openAnim in glass-folder-cards.js
const oldFolderOpenAnim = `  // 7. Explicit 0.2s easeOut Scale + Opacity + Y Transitions (Zero Nested LayoutId Lag)
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
  };`;

const newFolderOpenAnim = `  // 7. Aceternity Expandable Card FLIP Shared-Element Morph from Folder Origin
  if (originRect && originRect.width > 0 && targetRect.width > 0) {
    const scaleX = Math.max(0.15, originRect.width / targetRect.width);
    const scaleY = Math.max(0.15, originRect.height / targetRect.height);
    const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
    const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);

    modal.style.willChange = "transform, opacity, border-radius";
    const openAnim = modal.animate([
      {
        transform: \`translate3d(\${deltaX}px, \${deltaY}px, 0) scale(\${scaleX}, \${scaleY})\`,
        opacity: 0.75,
        borderRadius: "24px"
      },
      {
        transform: "translate3d(0, 0, 0) scale(1, 1)",
        opacity: 1,
        borderRadius: "20px"
      }
    ], {
      duration: 280,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)"
    });

    overlay.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], {
      duration: 250,
      easing: "ease-out"
    });

    openAnim.onfinish = () => {
      modal.style.willChange = "auto";
      modal.style.transform = "";
      const input = modal.querySelector(".gf-expandable-search-input");
      if (input) input.focus();
    };
  } else {
    modal.style.willChange = "transform, opacity";
    const openAnim = modal.animate([
      { opacity: 0, transform: "scale(0.95) translateY(10px)" },
      { opacity: 1, transform: "scale(1) translateY(0px)" }
    ], {
      duration: 200,
      easing: "cubic-bezier(0, 0, 0.2, 1)"
    });
    openAnim.onfinish = () => {
      modal.style.willChange = "auto";
      const input = modal.querySelector(".gf-expandable-search-input");
      if (input) input.focus();
    };
  }`;

folderCode = folderCode.replace(oldFolderOpenAnim, newFolderOpenAnim);

// Replace closeModal in glass-folder-cards.js
const oldFolderClose = `  // 8. Event Handlers & Modal Dismissal (Explicit 0.2s Exit Animation)
  let isClosed = false;
  const closeModal = (afterCloseCb) => {
    if (isClosed) return;
    isClosed = true;

    window.removeEventListener("keydown", onKeyDown);

    overlay.classList.add("is-closing");
    modal.classList.add("is-closing");

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onClose === "function") onClose();
      if (typeof afterCloseCb === "function") afterCloseCb();
    };

    modal.addEventListener("animationend", cleanup, { once: true });
    setTimeout(cleanup, 220); // Fallback
  };`;

const newFolderClose = `  // 8. Event Handlers & Modal Dismissal (Aceternity Expandable Card Collapse back to Folder)
  let isClosed = false;
  const closeModal = (afterCloseCb) => {
    if (isClosed) return;
    isClosed = true;

    window.removeEventListener("keydown", onKeyDown);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onClose === "function") onClose();
      if (typeof afterCloseCb === "function") afterCloseCb();
    };

    const curOrigin = originEl ? originEl.getBoundingClientRect() : originRect;
    const curTarget = modal.getBoundingClientRect();

    if (curOrigin && curOrigin.width > 0 && curTarget.width > 0) {
      const closeScaleX = Math.max(0.15, curOrigin.width / curTarget.width);
      const closeScaleY = Math.max(0.15, curOrigin.height / curTarget.height);
      const closeDeltaX = (curOrigin.left + curOrigin.width / 2) - (curTarget.left + curTarget.width / 2);
      const closeDeltaY = (curOrigin.top + curOrigin.height / 2) - (curTarget.top + curTarget.height / 2);

      modal.style.willChange = "transform, opacity, border-radius";
      const closeAnim = modal.animate([
        {
          transform: "translate3d(0, 0, 0) scale(1, 1)",
          opacity: 1,
          borderRadius: "20px"
        },
        {
          transform: \`translate3d(\${closeDeltaX}px, \${closeDeltaY}px, 0) scale(\${closeScaleX}, \${closeScaleY})\`,
          opacity: 0,
          borderRadius: "24px"
        }
      ], {
        duration: 240,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)"
      });

      overlay.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 220,
        easing: "ease-out"
      });

      closeAnim.onfinish = cleanup;
      setTimeout(cleanup, 280);
    } else {
      overlay.classList.add("is-closing");
      modal.classList.add("is-closing");
      modal.addEventListener("animationend", cleanup, { once: true });
      setTimeout(cleanup, 220);
    }
  };`;

folderCode = folderCode.replace(oldFolderClose, newFolderClose);
fs.writeFileSync('js/glass-folder-cards.js', folderCode, 'utf8');
console.log('Successfully updated js/glass-folder-cards.js with Aceternity Expandable Card morphs');
