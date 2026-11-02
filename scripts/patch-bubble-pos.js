const fs = require('fs');
let css = fs.readFileSync('NBLMimic/css/liquid-glass.css', 'utf8');

const oldBubbleCss = /\.liquid-notes-bubble\s*\{[\s\S]*?transition:\s*transform[^;]+;/;
const newBubbleCss = `.liquid-notes-bubble {
  position: fixed !important;
  bottom: 28px;
  right: calc(var(--sidepanel-width, 360px) + 28px);
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(20px) saturate(1.8) brightness(1.08);
  -webkit-backdrop-filter: blur(20px) saturate(1.8) brightness(1.08);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow:
    0 12px 32px -4px rgba(0, 0, 0, 0.38),
    0 4px 12px rgba(0, 0, 0, 0.22),
    inset 0 1px 1px rgba(255, 255, 255, 0.6),
    inset 0 -1px 1px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 85;
  color: var(--text-primary);
  outline: none;
  user-select: none;
  transition: right 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease, border-color 0.28s ease;`;

css = css.replace(oldBubbleCss, newBubbleCss);

if (!css.includes('.sidepanel-collapsed .liquid-notes-bubble')) {
  css += '\n\n.sidepanel-collapsed .liquid-notes-bubble {\n  right: 28px !important;\n}\n';
}

fs.writeFileSync('NBLMimic/css/liquid-glass.css', css, 'utf8');
console.log('Successfully updated liquid-notes-bubble to fixed with dynamic sidepanel-aware right!');
