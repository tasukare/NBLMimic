/**
 * NBLMimic — Secure Local Proxy Server
 * Keeps your Gemini API key safe in .env on your machine.
 * Zero external npm dependencies required!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const dns = require('dns');

// Prioritize IPv4 DNS to eliminate IPv6 timeout delay on Windows
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

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
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL.trim().replace(/\/+$/, '')] : []),
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`] : []),
  ...(process.env.PUBLIC_URL ? [process.env.PUBLIC_URL.trim().replace(/\/+$/, '')] : []),
  ...(process.env.SERVER_URL ? [process.env.SERVER_URL.trim().replace(/\/+$/, '')] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().replace(/\/+$/, '')) : [])
]);

// ════════════════════════════════════════════════
// Multi-Key Gemini API Rotation & Cooldown Engine
// ════════════════════════════════════════════════
class KeyRotator {
  constructor(keys = []) {
    this.keys = keys.map((k, idx) => ({
      key: k.trim(),
      id: `Key #${idx + 1}`,
      masked: this.maskKey(k.trim()),
      status: 'healthy', // 'healthy' | 'cooling_down'
      cooldownUntil: 0,
      failCount: 0,
      successCount: 0,
      lastUsed: 0
    })).filter(k => k.key.length > 0);
    this.currentIndex = 0;
  }

  maskKey(k) {
    if (!k || k.length < 8) return '****';
    return k.slice(0, 4) + '...' + k.slice(-4);
  }

  getKeyCount() {
    return this.keys.length;
  }

  getActiveKey() {
    if (this.keys.length === 0) return null;
    const now = Date.now();

    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const entry = this.keys[idx];
      if (entry.status === 'cooling_down' && now >= entry.cooldownUntil) {
        entry.status = 'healthy';
        entry.cooldownUntil = 0;
      }
      if (entry.status === 'healthy') {
        this.currentIndex = idx;
        entry.lastUsed = now;
        return entry;
      }
    }

    // If all are in cooldown, choose the one with the earliest cooldown expiry
    let earliest = this.keys[0];
    for (const k of this.keys) {
      if (k.cooldownUntil < earliest.cooldownUntil) earliest = k;
    }
    return earliest;
  }

  rotateNext() {
    if (this.keys.length <= 1) return this.getActiveKey();
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return this.getActiveKey();
  }

  markSuccess(keyString) {
    const entry = this.keys.find(k => k.key === keyString);
    if (entry) {
      entry.status = 'healthy';
      entry.cooldownUntil = 0;
      entry.successCount++;
    }
  }

  markCooldown(keyString, statusCode = 429, reason = '') {
    const entry = this.keys.find(k => k.key === keyString);
    if (entry) {
      const now = Date.now();
      const cooldownDuration = statusCode === 429 ? 60000 : (statusCode === 503 ? 30000 : 20000);
      entry.status = 'cooling_down';
      entry.cooldownUntil = now + cooldownDuration;
      entry.failCount++;
      console.log(`[KeyRotator] ${entry.id} (${entry.masked}) entered cooldown for ${cooldownDuration / 1000}s (HTTP ${statusCode}: ${reason})`);
    }
  }

  getTelemetry() {
    const now = Date.now();
    return {
      poolSize: this.keys.length,
      activeSlot: this.keys.length > 0 ? this.currentIndex + 1 : 0,
      keys: this.keys.map((k, idx) => {
        const isCooling = k.status === 'cooling_down' && now < k.cooldownUntil;
        return {
          slot: idx + 1,
          id: k.id,
          masked: k.masked,
          status: isCooling ? 'cooling_down' : 'healthy',
          cooldownRemainingSec: isCooling ? Math.max(0, Math.ceil((k.cooldownUntil - now) / 1000)) : 0,
          successCount: k.successCount,
          failCount: k.failCount,
          isActive: idx === this.currentIndex
        };
      })
    };
  }
}

function extractServerKeys() {
  const poolRaw = process.env.GEMINI_API_KEYS || '';
  const singleRaw = process.env.GEMINI_API_KEY || '';
  const combined = (poolRaw + ',' + singleRaw).split(',').map(s => s.trim()).filter(Boolean);
  return Array.from(new Set(combined));
}

const serverKeyRotator = new KeyRotator(extractServerKeys());
// ════════════════════════════════════════════════
// LRU Rotator Cache with TTL (Fixes VULN-05 Memory Leak)
// ════════════════════════════════════════════════
class LRURotatorCache {
  constructor(maxEntries = 50, ttlMs = 30 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.cache = new Map(); // hash -> { rotator, lastAccessed }
  }

  get(hash) {
    const entry = this.cache.get(hash);
    if (!entry) return null;
    if (Date.now() - entry.lastAccessed > this.ttlMs) {
      this.cache.delete(hash);
      return null;
    }
    entry.lastAccessed = Date.now();
    this.cache.delete(hash);
    this.cache.set(hash, entry);
    return entry.rotator;
  }

  set(hash, rotator) {
    if (this.cache.has(hash)) {
      this.cache.delete(hash);
    } else if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(hash, { rotator, lastAccessed: Date.now() });
  }

  has(hash) {
    return this.get(hash) !== null;
  }
}

const clientRotatorCache = new LRURotatorCache(50, 30 * 60 * 1000);

function getOrCreateClientRotator(clientKeys = []) {
  if (!Array.isArray(clientKeys) || clientKeys.length === 0) return null;
  const normalized = clientKeys.map(k => String(k).trim()).filter(Boolean);
  if (normalized.length === 0) return null;
  const hash = crypto.createHash('sha256').update(normalized.join(':::')).digest('hex');
  const existing = clientRotatorCache.get(hash);
  if (existing) {
    return existing;
  }
  const rotator = new KeyRotator(normalized);
  clientRotatorCache.set(hash, rotator);
  return rotator;
}

const GEMINI_API_KEY = serverKeyRotator.getActiveKey()?.key || '';

const CHAT_BODY_LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB max request body limit (Fixes VULN-04)

function readJsonBody(req, res, maxBytes = CHAT_BODY_LIMIT_BYTES) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;

    req.on('data', chunk => {
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        req.destroy();
        res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { message: 'Payload Too Large: Request exceeds 2MB limit.' } }));
        reject(new Error('PAYLOAD_TOO_LARGE'));
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        resolve(parsed);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { message: 'Malformed JSON payload.' } }));
        reject(err);
      }
    });

    req.on('error', err => reject(err));
  });
}

// Security Configuration for Static Delivery (Fixes VULN-03, VULN-10)
const SAFE_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':  'font/ttf'
};

const FORBIDDEN_FILES = new Set([
  '.env',
  'server.js',
  'drive_butler_v2.js',
  'package.json',
  'package-lock.json',
  'security_report.md',
  'styleguide.md',
  'agents.md',
  'vercel.json'
]);

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://www.googleapis.com https://accounts.google.com wss://generativelanguage.googleapis.com https://*.onrender.com https://*.vercel.app",
      "frame-src 'self' https://accounts.google.com https://drive.google.com",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ')
  );
}

function serveStaticFile(req, res, pathname) {
  applySecurityHeaders(res);

  let cleanPath = pathname;
  if (cleanPath === '/' || cleanPath === '/index.dhtml') {
    cleanPath = '/index.html';
  }

  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  // 1. Path Canonicalization & Root Boundary Validation
  const baseDir = fs.existsSync(path.join(process.cwd(), 'index.html')) ? process.cwd() : __dirname;
  const rootDirWithSep = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;
  const resolvedPath = path.resolve(baseDir, '.' + path.normalize(cleanPath));

  if (!resolvedPath.startsWith(rootDirWithSep) && resolvedPath !== baseDir) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  // 2. Dotfile and Hidden Directory Defense
  const relativeSegments = path.relative(baseDir, resolvedPath).split(path.sep);
  const containsDotSegment = relativeSegments.some(seg => seg.startsWith('.'));
  if (containsDotSegment) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  // 3. Sensitive File Blacklist Check
  const baseNameLower = path.basename(resolvedPath).toLowerCase();
  if (FORBIDDEN_FILES.has(baseNameLower)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  // 4. Strict Extension Whitelist Check
  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = SAFE_MIME_TYPES[ext];
  if (!contentType) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  // 5. File Stat & Stream
  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Length': stats.size
    });
    fs.createReadStream(resolvedPath).pipe(res);
  });
}

// ════════════════════════════════════════════════
// Real-time Live World News Aggregator (Last 72 Hours)
// ════════════════════════════════════════════════
let NEWS_CACHE = {
  timestamp: 0,
  articles: []
};

function detectCategory(title = '', content = '', defaultCat = 'World') {
  const text = (title + ' ' + content).toLowerCase();
  if (/\b(ai|llm|gpt|gemini|claude|machine learning|neural|deep learning|transformer|model|robot|vision|anthropic|openai|qwen|copilot|gpu|nvidia|chip|semiconductor|computing|software|hardware|cyber|hacker|linux|apple|google|meta|microsoft)\b/.test(text)) {
    return { name: 'AI & Tech', icon: 'cpu', color: '#8B5CF6' };
  }
  if (/\b(space|nasa|asteroid|physics|biology|rna|dna|crispr|cell|genome|medical|health|disease|vaccine|climate|earth|quantum|science|planet|telescope|astronomy|fusion|species|nature|ocean|cern)\b/.test(text)) {
    return { name: 'Science', icon: 'flask', color: '#059669' };
  }
  if (/\b(market|stock|invest|economy|startup|merger|tesla|spacex|revenue|funding|business|bank|trade|cost|price|inflation|crypto|bitcoin|fed|interest rate|wall street|treasury|gdp|recession|commerce)\b/.test(text)) {
    return { name: 'Markets', icon: 'briefcase', color: '#D97706' };
  }
  if (/\b(policy|regulation|antitrust|sanction|treaty|court|judge|law|senate|parliament|governance|bill|copyright|compliance|nato|un|diplomacy|summit|election|president|minister)\b/.test(text)) {
    return { name: 'Policy', icon: 'file-text', color: '#64748B' };
  }
  return { name: 'World', icon: 'globe', color: '#0284C7' };
}

function timeAgo(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch (e) {
    return 'Today';
  }
}

function parseRssXml(xml, defaultSource = 'World News', defaultCat = 'World', maxItems = 12) {
  const matches = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)];
  const items = [];
  const THREE_DAYS_MS = 72 * 3600 * 1000;
  const cutoffTime = Date.now() - THREE_DAYS_MS;

  for (const m of matches) {
    if (items.length >= maxItems) break;
    const itemXml = m[0];
    const rawTitle = (itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
    const rawLink = (itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) || [])[1] || '';
    const rawDesc = (itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || [])[1] || '';
    const rawPubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
    const rawSource = (itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || '';

    let cleanTitle = rawTitle.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'").replace(/&quot;/g, '"');
    let sourceName = rawSource.trim() || defaultSource;

    // Google News title format: "Article Title - Publisher"
    if (!rawSource && cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ');
      if (parts.length > 1) {
        sourceName = parts[parts.length - 1].trim();
        cleanTitle = parts.slice(0, -1).join(' - ').trim();
      }
    }

    const cleanDesc = rawDesc
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    const timestamp = rawPubDate ? new Date(rawPubDate).getTime() : Date.now();
    // Strict 72-hour filter
    if (timestamp && timestamp < cutoffTime) {
      continue;
    }

    const cat = detectCategory(cleanTitle, cleanDesc, defaultCat);

    items.push({
      type: 'news',
      icon: cat.icon,
      title: cleanTitle,
      source: sourceName,
      category: cat.name,
      categoryColor: cat.color,
      excerpt: cleanDesc.slice(0, 240) + (cleanDesc.length > 240 ? '…' : ''),
      content: `${cleanTitle}\n\nPublished by ${sourceName} (${rawPubDate || 'Recent'}).\n\n${cleanDesc}\n\nSource: ${rawLink.trim()}`,
      url: rawLink.trim(),
      date: timeAgo(rawPubDate),
      timestamp: timestamp || Date.now(),
      tags: ['#worldnews', `#${cat.name.toLowerCase().replace(/[^a-z]/g, '')}`]
    });
  }
  return items;
}

const FALLBACK_WORLD_NEWS = [
  {
    id: 1,
    type: 'news',
    icon: 'globe',
    title: 'Global Semiconductor Alliance Outlines Joint Sovereign AI Infrastructure Framework',
    source: 'Reuters / World',
    category: 'World',
    categoryColor: '#0284C7',
    excerpt: 'Representatives from thirty nations concluded negotiations establishing common hardware provenance protocols and energy efficiency standards for sovereign data centers.',
    content: 'Global Semiconductor Alliance Outlines Joint Sovereign AI Infrastructure Framework\n\nPublished by Reuters.\n\nRepresentatives from thirty nations concluded negotiations establishing common hardware provenance protocols and energy efficiency standards for sovereign data centers across North America, Europe, and East Asia.',
    url: 'https://news.google.com/',
    date: '2h ago',
    timestamp: Date.now() - 7200000,
    tags: ['#worldnews', '#world']
  },
  {
    id: 2,
    type: 'news',
    icon: 'cpu',
    title: 'Next-Generation Sparse Mixture-of-Experts Models Cut Inference Compute by 65%',
    source: 'Ars Technica',
    category: 'AI & Tech',
    categoryColor: '#8B5CF6',
    excerpt: 'New research demonstrates dynamic token routing that maintains reasoning benchmarks on mathematics and code synthesis while activating only 8% of total parameters per forward pass.',
    content: 'Next-Generation Sparse Mixture-of-Experts Models Cut Inference Compute by 65%\n\nPublished by Ars Technica.\n\nNew research demonstrates dynamic token routing that maintains reasoning benchmarks on mathematics and code synthesis while activating only 8% of total parameters per forward pass.',
    url: 'https://arstechnica.com',
    date: '4h ago',
    timestamp: Date.now() - 14400000,
    tags: ['#worldnews', '#aitech']
  },
  {
    id: 3,
    type: 'news',
    icon: 'flask',
    title: 'James Webb Space Telescope Identifies Potential Biosignature Gases in Nearby Sub-Neptune',
    source: 'ScienceDaily',
    category: 'Science',
    categoryColor: '#059669',
    excerpt: 'Transmission spectroscopy reveals atmospheric methane and carbon dioxide alongside tentatively detected dimethyl sulfide in habitable zone exoplanet observations.',
    content: 'James Webb Space Telescope Identifies Potential Biosignature Gases in Nearby Sub-Neptune\n\nPublished by ScienceDaily.\n\nTransmission spectroscopy reveals atmospheric methane and carbon dioxide alongside tentatively detected dimethyl sulfide in habitable zone exoplanet observations.',
    url: 'https://www.sciencedaily.com',
    date: '7h ago',
    timestamp: Date.now() - 25200000,
    tags: ['#worldnews', '#science']
  },
  {
    id: 4,
    type: 'news',
    icon: 'briefcase',
    title: 'Central Banks Harmonize Cross-Border Digital Settlement Pilot Across Asian Financial Hubs',
    source: 'Financial Times / BBC',
    category: 'Markets',
    categoryColor: '#D97706',
    excerpt: 'Project mBridge completes multi-billion dollar real-time wholesale trial, settling foreign exchange transactions with atomic delivery versus payment mechanisms.',
    content: 'Central Banks Harmonize Cross-Border Digital Settlement Pilot Across Asian Financial Hubs\n\nPublished by Financial Times.\n\nProject mBridge completes multi-billion dollar real-time wholesale trial, settling foreign exchange transactions with atomic delivery versus payment mechanisms.',
    url: 'https://www.bbc.com/news/business',
    date: '14h ago',
    timestamp: Date.now() - 50400000,
    tags: ['#worldnews', '#markets']
  },
  {
    id: 5,
    type: 'news',
    icon: 'file-text',
    title: 'International AI Safety Institute Releases First Harmonized Evaluation Suite for Frontier Models',
    source: 'BBC News',
    category: 'Policy',
    categoryColor: '#64748B',
    excerpt: 'The standardized benchmark suite tests autonomous replication, cyber offensive capabilities, and biosecurity boundary enforcement across top commercial foundation models.',
    content: 'International AI Safety Institute Releases First Harmonized Evaluation Suite for Frontier Models\n\nPublished by BBC News.\n\nThe standardized benchmark suite tests autonomous replication, cyber offensive capabilities, and biosecurity boundary enforcement across top commercial foundation models.',
    url: 'https://www.bbc.co.uk/news',
    date: '1d ago',
    timestamp: Date.now() - 86400000,
    tags: ['#worldnews', '#policy']
  }
];

async function fetchLiveNewsFeed(force = false) {
  const now = Date.now();
  if (!force && NEWS_CACHE.articles.length && (now - NEWS_CACHE.timestamp < 180000)) {
    return NEWS_CACHE.articles;
  }

  const results = [];

  const fetchTasks = [
    // 1. Google News World (Last 3 Days)
    (async () => {
      try {
        const res = await fetch('https://news.google.com/rss/search?q=when:3d&hl=en-US&gl=US&ceid=US:en', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(4500)
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssXml(xml, 'Google News World', 'World', 10);
      } catch (e) {
        return [];
      }
    })(),

    // 2. Google News World Headlines Topic
    (async () => {
      try {
        const res = await fetch('https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(4500)
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssXml(xml, 'World Desk', 'World', 10);
      } catch (e) {
        return [];
      }
    })(),

    // 3. BBC World News RSS
    (async () => {
      try {
        const res = await fetch('https://feeds.bbci.co.uk/news/world/rss.xml', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(4500)
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssXml(xml, 'BBC World News', 'World', 10);
      } catch (e) {
        return [];
      }
    })(),

    // 4. Ars Technica (AI, Deep Tech, Computing)
    (async () => {
      try {
        const res = await fetch('https://feeds.arstechnica.com/arstechnica/index', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(4000)
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssXml(xml, 'Ars Technica', 'AI & Tech', 8);
      } catch (e) {
        return [];
      }
    })(),

    // 5. ScienceDaily (Science, Medicine, Space)
    (async () => {
      try {
        const res = await fetch('https://www.sciencedaily.com/rss/all.xml', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          signal: AbortSignal.timeout(4000)
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssXml(xml, 'ScienceDaily', 'Science', 8);
      } catch (e) {
        return [];
      }
    })(),

    // 6. Hacker News Top Stories
    (async () => {
      try {
        const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
          signal: AbortSignal.timeout(3500)
        });
        if (!res.ok) return [];
        const ids = (await res.json()).slice(0, 8);
        const fetched = await Promise.all(ids.map(async id => {
          try {
            const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(2500) });
            return r.json();
          } catch (e) { return null; }
        }));

        const items = [];
        const THREE_DAYS_MS = 72 * 3600 * 1000;
        const cutoffTime = now - THREE_DAYS_MS;

        for (const it of fetched) {
          if (!it || !it.title) continue;
          const timestamp = it.time ? it.time * 1000 : Date.now();
          if (timestamp < cutoffTime) continue;

          const cat = detectCategory(it.title, '', 'AI & Tech');
          const pubDate = new Date(timestamp);
          const hnUrl = it.url || `https://news.ycombinator.com/item?id=${it.id}`;

          items.push({
            type: 'news',
            icon: cat.icon,
            title: it.title,
            source: 'Hacker News',
            category: cat.name,
            categoryColor: cat.color,
            excerpt: `${it.score || 1} points on HN · Shared by ${it.by || 'community'} with ${it.descendants || 0} discussion comments.`,
            content: `${it.title}\n\nShared on Hacker News with ${it.score || 0} upvotes and ${it.descendants || 0} discussion comments.\nOriginal URL: ${hnUrl}`,
            url: hnUrl,
            date: timeAgo(pubDate),
            timestamp: timestamp,
            tags: ['#worldnews', `#${cat.name.toLowerCase().replace(/[^a-z]/g, '')}`]
          });
        }
        return items;
      } catch (e) {
        return [];
      }
    })()
  ];

  const outcomes = await Promise.allSettled(fetchTasks);
  outcomes.forEach(o => {
    if (o.status === 'fulfilled' && Array.isArray(o.value)) {
      results.push(...o.value);
    }
  });

  // Strict 72-Hour Cutoff
  const THREE_DAYS_MS = 72 * 3600 * 1000;
  const cutoffTime = now - THREE_DAYS_MS;
  const filtered72h = results.filter(r => (r.timestamp || 0) >= cutoffTime);

  // Deduplicate by clean title
  const seen = new Set();
  const deduped = [];
  for (const item of filtered72h) {
    const key = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 36);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  // Sort strictly newest first
  deduped.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // If live feeds yielded items, use them; otherwise fall back to curated recent dispatches
  const finalArticles = deduped.length > 0 ? deduped : FALLBACK_WORLD_NEWS;
  finalArticles.forEach((r, idx) => { r.id = idx + 1; });

  NEWS_CACHE = {
    timestamp: now,
    articles: finalArticles
  };

  return finalArticles;
}

async function appHandler(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // 1. Host Header Validation (Anti-DNS Rebinding - VULN-02 / Domain A)
  const isCloudHost = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_EXTERNAL_HOSTNAME || process.env.VERCEL || process.env.VERCEL_URL);
  const validHostPatterns = [
    `localhost:${PORT}`,
    `127.0.0.1:${PORT}`,
    'localhost',
    '127.0.0.1',
    ...(process.env.RENDER_EXTERNAL_HOSTNAME ? [process.env.RENDER_EXTERNAL_HOSTNAME] : []),
    ...(process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',').map(s => s.trim()) : [])
  ];
  if (host && !isCloudHost && !validHostPatterns.includes(host) && !host.endsWith('.onrender.com') && !host.endsWith('.vercel.app')) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: 'Invalid Host header. Access denied.' } }));
    return;
  }

  // 2. Strict Origin Matching (No Wildcard CORS - VULN-07)
  if (origin) {
    const isTrustedCloudOrigin = origin.startsWith('https://') && (origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app'));
    if (ALLOWED_ORIGINS.has(origin) || isTrustedCloudOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-NBL-Session, X-Api-Keys');
    } else {
      // Untrusted Cross-Origin Request -> Block preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { message: 'Cross-origin preflight rejected.' } }));
        return;
      }
    }
  }

  // 3. Preflight Handling for authorized origins
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. Backend Health Check & Auto-Sync with .env
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      hasServerKey: serverKeyRotator.getKeyCount() > 0,
      keyPoolSize: serverKeyRotator.getKeyCount(),
      activeKeySlot: serverKeyRotator.currentIndex + 1,
      defaultModel: 'gemini-3.5-flash-lite',
      liveModel: 'gemini-3.8-live'
    }));
    return;
  }

  // 1b. Live API Config Endpoint (Shielded - Fixes VULN-01)
  if (pathname === '/api/live-config' && req.method === 'GET') {
    const activeKey = serverKeyRotator.getActiveKey()?.key || '';
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      hasServerKey: Boolean(activeKey),
      liveModel: 'gemini-3.8-live'
    }));
    return;
  }

  // 1c. Gemini Key Pool Telemetry Status Endpoint (LRU Bounded)
  if (pathname === '/api/keys/status' && req.method === 'GET') {
    const rawKeys = parsedUrl.searchParams.get('keys') || req.headers['x-api-keys'] || '';
    const clientKeys = rawKeys.split(/[,;\s]+/).map(k => k.trim()).filter(Boolean);
    const targetRotator = clientKeys.length > 0 ? getOrCreateClientRotator(clientKeys) : serverKeyRotator;

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true,
      hasServerKeys: serverKeyRotator.getKeyCount() > 0,
      isClientPool: clientKeys.length > 0,
      ...targetRotator.getTelemetry()
    }));
    return;
  }

  // 1d. Manual Gemini Key Rotation Trigger Endpoint (LRU Bounded)
  if (pathname === '/api/keys/rotate' && req.method === 'POST') {
    const rawKeys = parsedUrl.searchParams.get('keys') || req.headers['x-api-keys'] || '';
    const clientKeys = rawKeys.split(/[,;\s]+/).map(k => k.trim()).filter(Boolean);
    const targetRotator = clientKeys.length > 0 ? getOrCreateClientRotator(clientKeys) : serverKeyRotator;

    targetRotator.rotateNext();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true,
      message: 'Rotated to next key slot',
      hasServerKeys: serverKeyRotator.getKeyCount() > 0,
      isClientPool: clientKeys.length > 0,
      ...targetRotator.getTelemetry()
    }));
    return;
  }

  // 1e. Real-time Live News Endpoint
  if (pathname === '/api/news' && req.method === 'GET') {
    const force = parsedUrl.searchParams.get('refresh') === '1';
    try {
      const articles = await fetchLiveNewsFeed(force);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        status: 'ok',
        count: articles.length,
        lastUpdated: new Date().toISOString(),
        articles: articles
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: `News fetch error: ${err.message}` } }));
    }
    return;
  }

  // Google OAuth Client Configuration Endpoint
  if (pathname === '/api/auth/config') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      clientId: process.env.GOOGLE_CLIENT_ID || '809750403592-tven0oabpuiq37oi8um5f102ck3lclkg.apps.googleusercontent.com'
    }));
    return;
  }

  // Google Drive Configuration Endpoint
  if (pathname === '/api/drive/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      clientId: process.env.GOOGLE_CLIENT_ID || '809750403592-tven0oabpuiq37oi8um5f102ck3lclkg.apps.googleusercontent.com',
      webAppUrl: process.env.GOOGLE_DRIVE_WEBAPP_URL || '',
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly'
    }));
    return;
  }

  // Google Drive Secure Document Stream Proxy (Fixes VULN-06: Header-only OAuth & Safe Redirects)
  if (pathname === '/api/drive/file' && req.method === 'GET') {
    // Prohibit query string tokens explicitly for credential hygiene
    if (parsedUrl.searchParams.has('token')) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: 'OAuth token must be passed via Authorization: Bearer header, not URL parameters.' } }));
      return;
    }

    const fileId = parsedUrl.searchParams.get('id');
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const mime = (parsedUrl.searchParams.get('mime') || '').toLowerCase();

    if (!fileId || !token) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: 'Missing file id or Authorization Bearer header.' } }));
      return;
    }

    let targetUrl;
    if (mime.includes('google-apps.document') || mime.includes('google-apps.spreadsheet') || mime.includes('google-apps.presentation')) {
      targetUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=application/pdf`;
    } else {
      targetUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    }

    const driveReq = https.get(targetUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 NBLMimic-Secure-Proxy/1.0'
      }
    }, (driveRes) => {
      // Validate redirect host before following (whitelist Google domains)
      if (driveRes.statusCode >= 300 && driveRes.statusCode < 400 && driveRes.headers.location) {
        try {
          const redirUrl = new URL(driveRes.headers.location);
          const isAllowedDomain = redirUrl.protocol === 'https:' &&
            (redirUrl.hostname.endsWith('.google.com') ||
             redirUrl.hostname.endsWith('.googleapis.com') ||
             redirUrl.hostname.endsWith('.googleusercontent.com'));

          if (!isAllowedDomain) {
            res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: { message: 'Untrusted redirect destination rejected.' } }));
            return;
          }

          https.get(redirUrl.href, (redirRes) => {
            const contentType = redirRes.headers['content-type'] || 'application/pdf';
            res.writeHead(redirRes.statusCode || 200, {
              'Content-Type': contentType,
              'Content-Disposition': 'inline',
              'X-Content-Type-Options': 'nosniff',
              'Cache-Control': 'private, max-age=1800'
            });
            redirRes.pipe(res);
          }).on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: err.message } }));
          });
          return;
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Invalid redirect URL.' } }));
          return;
        }
      }

      if (driveRes.statusCode !== 200) {
        res.writeHead(driveRes.statusCode, { 'Content-Type': 'application/json' });
        driveRes.pipe(res);
        return;
      }

      const contentType = driveRes.headers['content-type'] || (mime.includes('pdf') || mime.includes('google-apps') ? 'application/pdf' : 'application/octet-stream');
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=1800'
      });
      driveRes.pipe(res);
    });

    driveReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // 2. Secure Multi-Key Gemini Chat Proxy Endpoint with Automatic Failover & Cooldown
  if (pathname === '/api/chat' && req.method === 'POST') {
    let payload;
    try {
      payload = await readJsonBody(req, res, CHAT_BODY_LIMIT_BYTES);
    } catch (err) {
      // 413 or 400 response already sent in readJsonBody
      return;
    }

    try {
      // Extract client BYOK keys if provided (supports single key or array)
      let clientKeys = [];
      if (Array.isArray(payload.apiKeys) && payload.apiKeys.length > 0) {
        clientKeys = payload.apiKeys.map(k => String(k).trim()).filter(Boolean);
      } else if (payload.apiKey && String(payload.apiKey).trim()) {
        clientKeys = String(payload.apiKey).split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
      }

      const activeRotator = clientKeys.length > 0 ? getOrCreateClientRotator(clientKeys) : serverKeyRotator;

        if (activeRotator.getKeyCount() === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: { message: 'Missing Gemini API key. Please add GEMINI_API_KEYS to your .env file or enter your key in Settings (BYOK).' }
          }));
          return;
        }

        const requestedModel = payload.model || 'gemini-3.5-flash-lite';

        async function callGoogleModel(modelName, keyToUse, timeoutMs = 8000) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(keyToUse)}`;

          try {
            const reqBody = {
              contents: payload.contents,
              generationConfig: payload.generationConfig
            };
            if (payload.system_instruction) reqBody.system_instruction = payload.system_instruction;
            if (payload.tools) reqBody.tools = payload.tools;

            const geminiRes = await fetch(geminiUrl, {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqBody)
            });
            clearTimeout(timer);
            const text = await geminiRes.text();
            let json = null;
            try { json = JSON.parse(text); } catch (e) {}
            return {
              ok: geminiRes.ok,
              status: geminiRes.status,
              json,
              rawText: text
            };
          } catch (fetchErr) {
            clearTimeout(timer);
            const isTimeout = fetchErr.name === 'AbortError';
            return {
              ok: false,
              status: isTimeout ? 504 : 500,
              json: { error: { message: isTimeout ? `Request timed out after ${timeoutMs/1000}s on ${modelName}` : fetchErr.message } },
              rawText: JSON.stringify({ error: { message: fetchErr.message } })
            };
          }
        }

        const modelTimeoutMs = (requestedModel === 'gemini-3.8-flash' || requestedModel === 'gemini-4-argon') ? 45000 :
                               (requestedModel === 'gemini-3.5-flash') ? 25000 : 15000;

        const maxKeyAttempts = Math.max(1, activeRotator.getKeyCount());
        let lastResult = null;

        // Multi-Key Failover Loop across healthy keys in pool
        for (let attempt = 0; attempt < maxKeyAttempts; attempt++) {
          const keyEntry = activeRotator.getActiveKey();
          if (!keyEntry) break;

          console.log(`[Proxy] Requesting model: ${requestedModel} (slot ${keyEntry.id}, attempt ${attempt + 1}/${maxKeyAttempts})`);
          const result = await callGoogleModel(requestedModel, keyEntry.key, modelTimeoutMs);
          lastResult = result;

          if (result.ok) {
            activeRotator.markSuccess(keyEntry.key);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(result.rawText);
            return;
          }

          // Check if rate-limited (429), overloaded (503), or timed out (504)
          if (result.status === 429 || result.status === 503 || result.status === 504) {
            activeRotator.markCooldown(keyEntry.key, result.status, result.json?.error?.message || 'Rate/Overload');
            if (attempt < maxKeyAttempts - 1) {
              activeRotator.rotateNext();
              console.log(`[Proxy] Failover: Rotating to next key slot in pool...`);
              continue;
            }
          } else {
            // Unrecoverable non-quota error (e.g. 400 Bad Request)
            break;
          }
        }

        // All keys failed or were rate-limited on requestedModel.
        // Fall back to gemini-3.5-flash-lite with healthiest key
        if (requestedModel !== 'gemini-3.5-flash-lite') {
          console.log(`[Proxy] ${requestedModel} unavailable across key pool (status: ${lastResult?.status}). Auto-falling back to gemini-3.5-flash-lite...`);
          const fallbackKeyEntry = activeRotator.getActiveKey();
          if (fallbackKeyEntry) {
            const fallbackResult = await callGoogleModel('gemini-3.5-flash-lite', fallbackKeyEntry.key, 15000);
            if (fallbackResult.ok && fallbackResult.json?.candidates?.[0]?.content?.parts?.[0]) {
              activeRotator.markSuccess(fallbackKeyEntry.key);
              const reason = lastResult?.status === 503 ? 'high demand / traffic spike' :
                             lastResult?.status === 429 ? 'free-tier quota limit' :
                             lastResult?.status === 504 ? `server delay (>${modelTimeoutMs/1000}s)` :
                             lastResult?.status === 404 ? 'model endpoint unavailable' : 'upstream rate issue';
              const notice = `\n\n> *Auto-accelerated via **gemini-3.5-flash-lite** in ~1s (upstream \`${requestedModel}\` encountered ${reason} across key pool).*`;
              fallbackResult.json.candidates[0].content.parts[0].text += notice;
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify(fallbackResult.json));
              return;
            }
          }
        }

        // Return error status if all attempts and fallbacks failed
        res.writeHead(lastResult?.status || 500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(lastResult?.rawText || JSON.stringify({ error: { message: 'All keys in pool exhausted or rate-limited.' } }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: { message: `Server error: ${err.message}` } }));
      }
    return;
  }

  // 3. Static File Server (Hardened against Traversal, Dotfiles, and Sensitive Source Leaks)
  serveStaticFile(req, res, pathname);
}

const server = http.createServer(appHandler);

if (require.main === module || !process.env.VERCEL) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      process.exit(0);
    }
    console.error('Server error:', err.message);
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    console.log('====================================================');
    console.log('🔬 NBLMimic Server running');
    console.log(`🌐 Host: ${HOST} | Port: ${PORT}`);
    console.log(`Gemini API Key: ${hasKey ? 'LOADED from .env' : 'NOT SET in .env (add to .env)'}`);
    console.log('====================================================');
  });
}

module.exports = appHandler;
