const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://ui.aceternity.com/registry/background-cubes-grid.json';

https.get(url, (res) => {
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(raw);
      console.log('Component name:', data.name);
      console.log('Title:', data.title);
      console.log('Dependencies:', data.dependencies);
      
      const file = data.files.find(f => f.path.includes('background-cubes-grid.tsx'));
      if (file) {
        const targetPath = path.join(__dirname, '..', 'components', 'ui', 'background-cubes-grid.tsx');
        fs.writeFileSync(targetPath, file.content, 'utf8');
        console.log('✓ Successfully wrote components/ui/background-cubes-grid.tsx (' + file.content.length + ' bytes)');
      } else {
        console.error('File not found in registry data');
      }
    } catch (e) {
      console.error('Error parsing registry data:', e);
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
