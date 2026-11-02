const fs = require('fs');

function updateAuxIcon(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const oldSvgPattern = /<svg class="icon-aux-pane"[\s\S]*?<\/svg>/;
  const newSvg = `<svg class="icon-aux-pane" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" stroke-width="1.3"/>
          <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" stroke-width="1.3"/>
          <path class="aux-pane-fill" d="M10 2.2 H12.5 A1.8 1.8 0 0 1 14.3 4 V12 A1.8 1.8 0 0 1 12.5 13.8 H10 Z" fill="currentColor"/>
        </svg>`;

  if (oldSvgPattern.test(content)) {
    content = content.replace(oldSvgPattern, newSvg);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated aux icon in:', filePath);
  } else {
    console.log('Pattern not found in:', filePath);
  }
}

updateAuxIcon('NBLMimic/index.html');
updateAuxIcon('index.html');
