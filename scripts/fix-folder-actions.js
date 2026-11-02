const fs = require('fs');

// 1. Update js/glass-folder-cards.js
let jsCode = fs.readFileSync('js/glass-folder-cards.js', 'utf8');

// In openExpandableFolderCard, add Delete button to actionsWrap
const oldActionsAppend = `  actionsWrap.appendChild(themeSwatches);
  actionsWrap.appendChild(addBtn);
  actionsWrap.appendChild(renameBtn);

  toolbar.appendChild(searchWrap);`;

const newActionsAppend = `  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "gf-expandable-action-btn btn-action-delete";
  deleteBtn.title = "Delete this folder";
  deleteBtn.innerHTML = \`
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    <span>Delete Folder</span>
  \`;
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal(() => {
      if (typeof onDelete === "function") onDelete(label);
    });
  });

  actionsWrap.appendChild(themeSwatches);
  actionsWrap.appendChild(addBtn);
  actionsWrap.appendChild(renameBtn);
  actionsWrap.appendChild(deleteBtn);

  toolbar.appendChild(searchWrap);`;

jsCode = jsCode.replace(oldActionsAppend, newActionsAppend);

// In createGlassFolderCard, append actionKey and popoverMenu to front instead of tilt
const oldHierarchy = `  // Assemble Hierarchy
  tilt.appendChild(shadow);
  tilt.appendChild(back);
  tilt.appendChild(backRim);
  tilt.appendChild(filesContainer);
  tilt.appendChild(front);
  if (actionKey) {
    tilt.appendChild(actionKey);
    tilt.appendChild(popoverMenu);
  }`;

const newHierarchy = `  // Assemble Hierarchy (Mount actionKey directly to front pocket so it NEVER falls behind!)
  tilt.appendChild(shadow);
  tilt.appendChild(back);
  tilt.appendChild(backRim);
  tilt.appendChild(filesContainer);
  tilt.appendChild(front);
  if (actionKey) {
    front.appendChild(actionKey);
    front.appendChild(popoverMenu);
  }

  // Right-click contextmenu on folder card opens options menu immediately
  root.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (popoverMenu && actionKey) {
      document.querySelectorAll(".gf-folder-popover-menu.is-open").forEach(m => {
        if (m !== popoverMenu) m.classList.remove("is-open");
      });
      document.querySelectorAll(".gf-key.is-active").forEach(k => {
        if (k !== actionKey) k.classList.remove("is-active");
      });
      const isOpen = popoverMenu.classList.toggle("is-open");
      actionKey.classList.toggle("is-active", isOpen);
    }
  });`;

jsCode = jsCode.replace(oldHierarchy, newHierarchy);

fs.writeFileSync('js/glass-folder-cards.js', jsCode, 'utf8');
console.log('Successfully updated js/glass-folder-cards.js');

// 2. Update css/glass-folder-cards.css
let cssCode = fs.readFileSync('css/glass-folder-cards.css', 'utf8');

// Update .gf-key to have z-index: 50, pointer-events: auto, transform: translateZ(30px)
const oldKeyCss = `.gf-key {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  right: 22px;
  bottom: 22px;
  z-index: 12;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform .35s var(--gf-spring), box-shadow .35s var(--gf-ease), background .35s var(--gf-ease);
}`;

const newKeyCss = `.gf-key {
  all: unset;
  box-sizing: border-box;
  position: absolute;
  right: 22px;
  bottom: 22px;
  z-index: 50 !important;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  cursor: pointer;
  pointer-events: auto !important;
  transform: translateZ(30px);
  transition: transform .35s var(--gf-spring), box-shadow .35s var(--gf-ease), background .35s var(--gf-ease);
}`;

cssCode = cssCode.replace(oldKeyCss, newKeyCss);

// Update .gf-key:hover
cssCode = cssCode.replace(/\.gf-key:hover\s*\{\s*transform:\s*translateY\(-2px\);\s*\}/, `.gf-key:hover {
  transform: translateY(-2px) translateZ(35px);
}`);

// Update .gf-key.is-active
cssCode = cssCode.replace(/\.gf-key\.is-active\s*\{[\s\S]*?\}/, `.gf-key.is-active {
  transform: rotate(45deg) translateZ(40px) !important;
  background: #f43f5e !important;
  color: #fff !important;
  box-shadow: 0 0 20px rgba(244, 63, 94, 0.5) !important;
}`);

// Update .gf-folder-popover-menu
const oldPopoverCss = `.gf-folder-popover-menu {
  position: absolute;
  right: 18px;
  bottom: 84px;
  z-index: 100;
  width: 220px;
  background: rgba(18, 18, 24, 0.94);
  backdrop-filter: blur(20px) saturate(1.85);
  -webkit-backdrop-filter: blur(20px) saturate(1.85);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 42px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  border-radius: 18px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px) scale(0.95);
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}`;

const newPopoverCss = `.gf-folder-popover-menu {
  position: absolute;
  right: 18px;
  bottom: 84px;
  z-index: 100 !important;
  width: 220px;
  background: rgba(18, 18, 24, 0.94);
  backdrop-filter: blur(20px) saturate(1.85);
  -webkit-backdrop-filter: blur(20px) saturate(1.85);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 42px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  border-radius: 18px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px) scale(0.95) translateZ(60px);
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.gf-folder-popover-menu.is-open {
  opacity: 1 !important;
  pointer-events: auto !important;
  transform: translateY(0) scale(1) translateZ(60px) !important;
}`;

cssCode = cssCode.replace(oldPopoverCss, newPopoverCss);

// Add styling for .btn-action-delete
const deleteBtnStyle = `
/* Delete Folder Action Button in Expandable Modal */
.gf-expandable-action-btn.btn-action-delete {
  color: #fb7185;
  border-color: rgba(244, 63, 94, 0.25);
  background: rgba(244, 63, 94, 0.08);
}

.gf-expandable-action-btn.btn-action-delete:hover {
  background: rgba(244, 63, 94, 0.18);
  border-color: rgba(244, 63, 94, 0.45);
  color: #fda4af;
}

[data-theme="light"] .gf-expandable-action-btn.btn-action-delete {
  color: #e11d48;
  border-color: rgba(225, 29, 72, 0.25);
  background: rgba(225, 29, 72, 0.06);
}

[data-theme="light"] .gf-expandable-action-btn.btn-action-delete:hover {
  background: rgba(225, 29, 72, 0.14);
  border-color: rgba(225, 29, 72, 0.4);
  color: #be123c;
}
`;

if (!cssCode.includes('btn-action-delete')) {
  cssCode += deleteBtnStyle;
}

fs.writeFileSync('css/glass-folder-cards.css', cssCode, 'utf8');
console.log('Successfully updated css/glass-folder-cards.css');
