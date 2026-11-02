const fs = require('fs');

// 1. Update js/notes.js
let notesCode = fs.readFileSync('js/notes.js', 'utf8');

// Replace openAnim in notes.js
const oldNotesOpenAnim = `  // 8. Explicit 0.2s easeOut Scale + Opacity + Y Transition
  card.style.willChange = 'transform, opacity';
  const openAnim = card.animate([
    { opacity: 0, transform: 'scale(0.95) translateY(10px)' },
    { opacity: 1, transform: 'scale(1) translateY(0px)' }
  ], {
    duration: 200,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    fill: 'forwards'
  });

  const overlayOpenAnim = overlay.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], {
    duration: 200,
    easing: 'ease-out',
    fill: 'forwards'
  });

  openAnim.onfinish = () => {
    card.style.willChange = 'auto';
    textarea.focus();
  };`;

const newNotesOpenAnim = `  // 8. Aceternity Expandable Card FLIP Shared-Element Morph from Pen Bubble
  if (originRect && originRect.width > 0 && targetRect.width > 0) {
    const scaleX = Math.max(0.08, originRect.width / targetRect.width);
    const scaleY = Math.max(0.08, originRect.height / targetRect.height);
    const deltaX = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
    const deltaY = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);

    card.style.willChange = 'transform, opacity, border-radius';
    const openAnim = card.animate([
      {
        transform: \`translate3d(\${deltaX}px, \${deltaY}px, 0) scale(\${scaleX}, \${scaleY})\`,
        opacity: 0.6,
        borderRadius: '28px'
      },
      {
        transform: 'translate3d(0, 0, 0) scale(1, 1)',
        opacity: 1,
        borderRadius: '20px'
      }
    ], {
      duration: 280,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });

    overlay.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], {
      duration: 250,
      easing: 'ease-out'
    });

    openAnim.onfinish = () => {
      card.style.willChange = 'auto';
      card.style.transform = '';
      textarea.focus();
    };
  } else {
    card.style.willChange = 'transform, opacity';
    const openAnim = card.animate([
      { opacity: 0, transform: 'scale(0.95) translateY(10px)' },
      { opacity: 1, transform: 'scale(1) translateY(0px)' }
    ], {
      duration: 200,
      easing: 'cubic-bezier(0, 0, 0.2, 1)'
    });
    openAnim.onfinish = () => {
      card.style.willChange = 'auto';
      textarea.focus();
    };
  }`;

notesCode = notesCode.replace(oldNotesOpenAnim, newNotesOpenAnim);

// Replace closeNotes in notes.js
const oldNotesClose = `  // 12. Modal Dismissal (Explicit 0.2s Exit Animation)
  let isClosing = false;
  const closeNotes = () => {
    if (isClosing) return;
    isClosing = true;

    window.removeEventListener('keydown', onKeyDown);

    overlay.classList.add('is-closing');
    card.classList.add('is-closing');

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      activeNotesInstance = null;
      if (triggerEl) triggerEl.focus();
    };

    card.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 220); // Fallback
  };`;

const newNotesClose = `  // 12. Modal Dismissal (Aceternity Expandable Card Collapse back to Trigger)
  let isClosing = false;
  const closeNotes = () => {
    if (isClosing) return;
    isClosing = true;

    window.removeEventListener('keydown', onKeyDown);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.style.overflow = prevOverflow;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      activeNotesInstance = null;
      if (triggerEl) triggerEl.focus();
    };

    const curOrigin = triggerEl ? triggerEl.getBoundingClientRect() : originRect;
    const curTarget = card.getBoundingClientRect();

    if (curOrigin && curOrigin.width > 0 && curTarget.width > 0) {
      const closeScaleX = Math.max(0.08, curOrigin.width / curTarget.width);
      const closeScaleY = Math.max(0.08, curOrigin.height / curTarget.height);
      const closeDeltaX = (curOrigin.left + curOrigin.width / 2) - (curTarget.left + curTarget.width / 2);
      const closeDeltaY = (curOrigin.top + curOrigin.height / 2) - (curTarget.top + curTarget.height / 2);

      card.style.willChange = 'transform, opacity, border-radius';
      const closeAnim = card.animate([
        {
          transform: 'translate3d(0, 0, 0) scale(1, 1)',
          opacity: 1,
          borderRadius: '20px'
        },
        {
          transform: \`translate3d(\${closeDeltaX}px, \${closeDeltaY}px, 0) scale(\${closeScaleX}, \${closeScaleY})\`,
          opacity: 0,
          borderRadius: '28px'
        }
      ], {
        duration: 240,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });

      overlay.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 220,
        easing: 'ease-out'
      });

      closeAnim.onfinish = cleanup;
      setTimeout(cleanup, 280);
    } else {
      overlay.classList.add('is-closing');
      card.classList.add('is-closing');
      card.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, 220);
    }
  };`;

notesCode = notesCode.replace(oldNotesClose, newNotesClose);
fs.writeFileSync('js/notes.js', notesCode, 'utf8');
console.log('Successfully updated js/notes.js with Aceternity Expandable Card morphs');
