const fs = require('fs');

console.log('--- Updating liquid-glass.css ---');
let lgCss = fs.readFileSync('NBLMimic/css/liquid-glass.css', 'utf8');

// Update .notes-expandable-overlay
lgCss = lgCss.replace(
  /\.notes-expandable-overlay\s*\{[\s\S]*?padding:\s*var\(--space-4\);[\s\S]*?opacity:\s*0;[^}]*\}/m,
`.notes-expandable-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(8, 8, 12, 0.65);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  opacity: 0;
  pointer-events: auto;
}`
);

// Update .notes-expandable-card to be centered via fixed inset:0 margin:auto
lgCss = lgCss.replace(
  /\.notes-expandable-card\s*\{[\s\S]*?transform-origin:\s*center center;/m,
`.notes-expandable-card {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(740px, calc(100vw - 32px));
  height: min(84vh, 740px);
  z-index: 910;
  background: linear-gradient(180deg, rgba(24, 24, 28, 0.96) 0%, rgba(16, 16, 20, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px;
  box-shadow:
    0 28px 75px -12px rgba(0, 0, 0, 0.72),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: text;
  isolation: isolate;
  transform-origin: center center;`
);

fs.writeFileSync('NBLMimic/css/liquid-glass.css', lgCss, 'utf8');
console.log('liquid-glass.css updated');

console.log('--- Updating glass-folder-cards.css ---');
let gfcCss = fs.readFileSync('NBLMimic/css/glass-folder-cards.css', 'utf8');

// Update .gf-expandable-overlay
gfcCss = gfcCss.replace(
  /\.gf-expandable-overlay\s*\{[\s\S]*?opacity:\s*0;[^}]*\}/m,
`.gf-expandable-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(10, 10, 14, 0.65);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  opacity: 0;
  pointer-events: auto;
}`
);

// Update .gf-expandable-modal to be centered via fixed inset:0 margin:auto
gfcCss = gfcCss.replace(
  /\.gf-expandable-modal\s*\{[\s\S]*?transform-origin:\s*center center;/m,
`.gf-expandable-modal {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(660px, calc(100vw - 32px));
  max-height: min(88vh, 780px);
  z-index: 910;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(26, 26, 32, 0.96) 0%, rgba(18, 18, 22, 0.98) 100%);
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 28px 75px -12px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transform-origin: center center;`
);

fs.writeFileSync('NBLMimic/css/glass-folder-cards.css', gfcCss, 'utf8');
console.log('glass-folder-cards.css updated');
