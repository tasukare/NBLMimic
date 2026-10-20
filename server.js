/**
 * NBLMimic — Secure Local Proxy Server
 * Keeps your Gemini API key safe in .env on your machine.
 * Zero external npm dependencies required!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // Enable CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Backend Health Check
  if (pathname === '/api/health' && req.method === 'GET') {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      hasServerKey: hasKey,
      defaultModel: 'gemini-3.8-flash'
    }));
    return;
  }

  // 1b. Live API Config Endpoint
  if (pathname === '/api/live-config' && req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY || '';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      apiKey: key,
      liveModel: 'gemini-3.8-live'
    }));
    return;
  }

  // 2. Secure Gemini Chat Proxy Endpoint
  if (pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const apiKey = process.env.GEMINI_API_KEY || payload.apiKey;

        if (!apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: { message: 'Missing Gemini API key. Please add GEMINI_API_KEY to your .env file or enter it in Settings.' }
          }));
          return;
        }

        const model = payload.model || 'gemini-3.8-flash';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Forward to Google Gemini API using native fetch
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: payload.system_instruction,
            contents: payload.contents,
            generationConfig: payload.generationConfig
          })
        });

        const geminiData = await geminiRes.text();
        res.writeHead(geminiRes.status, { 'Content-Type': 'application/json' });
        res.end(geminiData);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: `Server error: ${err.message}` } }));
      }
    });
    return;
  }

  // 3. Static File Server
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Security: Prevent directory traversal outside folder
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  console.log('====================================================');
  console.log(`🔬 NBLMimic (Research Lab) Server running!`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔒 Gemini API Key: ${hasKey ? 'LOADED from .env (Hidden & Secure ✅)' : 'NOT SET in .env (add to .env)'}`);
  console.log('====================================================');
});
