const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const target = 'const finalArticles = deduped.length > 0 ? deduped : FALLBACK_WORLD_NEWS;';
const replacement = `if (deduped.length < 20) {
    for (const fb of FALLBACK_WORLD_NEWS) {
      const key = (fb.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 36);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push({ ...fb, timestamp: now - (deduped.length * 3600000) });
      }
    }
  }
  const finalArticles = deduped;`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.js', code, 'utf8');
  console.log('Supplemented news count in server.js');
} else {
  console.log('target string not found in server.js');
}
