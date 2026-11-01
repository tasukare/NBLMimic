/**
 * Aceternity UI 3D Card Hover Tilt Engine (Vanilla ES6 Module)
 * Implements mouse-tracking 3D perspective rotation on CardContainer,
 * and independent Z-axis depth elevation on CardItem layers.
 */

/**
 * Attach 3D Card tilt interactions to a single card container.
 * @param {HTMLElement} containerEl
 */
export function attach3DCardTilt(containerEl) {
  if (!containerEl || containerEl.dataset.has3dTilt === 'true') return;
  containerEl.dataset.has3dTilt = 'true';

  const bodyEl = containerEl.querySelector('.card-3d-body') || containerEl;
  const items = containerEl.querySelectorAll('[data-translate-z]');

  let rect = null;
  let isHovered = false;

  const handleMouseEnter = () => {
    isHovered = true;
    rect = containerEl.getBoundingClientRect();
    bodyEl.style.transition = 'transform 120ms ease-out';

    items.forEach((item) => {
      const z = item.dataset.translateZ || '30';
      item.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
      item.style.transform = `translateZ(${z}px)`;
    });
  };

  const handleMouseMove = (e) => {
    if (!isHovered) return;
    if (!rect) rect = containerEl.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    // Calculate rotation (-15deg to +15deg based on normalized cursor position)
    const x = (e.clientX - rect.left - width / 2) / 18;
    const y = -(e.clientY - rect.top - height / 2) / 18;

    bodyEl.style.transform = `rotateY(${x.toFixed(2)}deg) rotateX(${y.toFixed(2)}deg)`;
  };

  const handleMouseLeave = () => {
    isHovered = false;
    rect = null;
    bodyEl.style.transition = 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)';
    bodyEl.style.transform = 'rotateY(0deg) rotateX(0deg)';

    items.forEach((item) => {
      item.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      item.style.transform = 'translateZ(0px)';
    });
  };

  containerEl.addEventListener('mouseenter', handleMouseEnter);
  containerEl.addEventListener('mousemove', handleMouseMove);
  containerEl.addEventListener('mouseleave', handleMouseLeave);
}

/**
 * Initialize all 3D Card containers within a root element or the entire document.
 * @param {HTMLElement|Document} root
 */
export function initAll3DCards(root = document) {
  const cards = root.querySelectorAll('.card-3d-container');
  cards.forEach((card) => {
    attach3DCardTilt(card);
  });
}
