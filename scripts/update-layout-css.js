const fs = require('fs');
let css = fs.readFileSync('css/layout.css', 'utf8');

// Replace .pane-canvas margin-right and transition
css = css.replace(/(\.pane-canvas\s*\{[\s\S]*?)margin-right:\s*var\(--sidepanel-width\);\s*transition:\s*margin-right[^\r\n;]+;/g, '$1');

// Replace .pane-studio position: absolute with position: relative
css = css.replace(/(\.pane-studio\s*\{[\s\S]*?)position:\s*absolute;\s*top:\s*0;\s*right:\s*0;\s*bottom:\s*0;/g, '$1position: relative;');

// Remove transform/transition on .pane-studio default so it stays firmly in flex flow
css = css.replace(/will-change:\s*transform;\s*transform:\s*translate3d\(0,\s*0,\s*0\);\s*transition:\s*transform[^\r\n;]+;/g, '');

// Splitter right relative
css = css.replace(/(\.pane-splitter\s*\{[\s\S]*?)position:\s*absolute;\s*top:\s*0;\s*bottom:\s*0;\s*right:\s*var\(--sidepanel-width\);\s*z-index:\s*36;/g, '$1position: relative;\n  z-index: 20;');

fs.writeFileSync('css/layout.css', css, 'utf8');
console.log('Successfully updated css/layout.css');
