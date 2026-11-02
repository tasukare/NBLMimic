const fs = require('fs');
const path = require('path');

async function downloadComponent() {
  const apiKey = '21st_sk_4ed3df1facbc0dfc7eef451076af9d2e8904c291860cc4abc72e2c8c2ff42fc7';
  const url = 'https://21st.dev/r/kedhareswer/glass-folder-cards';

  console.log('Fetching from', url);
  const res = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  });

  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('Data keys:', Object.keys(data));

  if (!data.files || !data.files.length) {
    console.error('No files found:', data);
    process.exit(1);
  }

  const file = data.files[0];
  const paths = [
    path.resolve(__dirname, 'components', 'ui', 'glass-folder-cards.tsx'),
    path.resolve(__dirname, 'NBLMimic', 'components', 'ui', 'glass-folder-cards.tsx')
  ];

  for (const p of paths) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, file.content, 'utf8');
    console.log(`Saved ${file.content.length} bytes to ${p}`);
  }

  // Also update .21st/design.json
  const designJsonPath = path.resolve(__dirname, '.21st', 'design.json');
  if (fs.existsSync(designJsonPath)) {
    const design = JSON.parse(fs.readFileSync(designJsonPath, 'utf8'));
    if (!design.components.installed.includes('glass-folder-cards')) {
      design.components.installed.push('glass-folder-cards');
      fs.writeFileSync(designJsonPath, JSON.stringify(design, null, 2), 'utf8');
      console.log('Updated .21st/design.json');
    }
  }

  console.log('Installation successful!');
}

downloadComponent().catch(err => {
  console.error('Download error:', err);
  process.exit(1);
});
