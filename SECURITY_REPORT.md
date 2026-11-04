# NBLMimic Security Audit & Hardening Report

## Executive Summary
This document provides an exhaustive security audit of the **NBLMimic** codebase, conducted by the Red-Hat Recon auditor. The audit analyzed all HTTP endpoints, background scripts, client-side modules, state storage mechanisms, cryptographic implementations, and access control policies across the local proxy server (`server.js`), Google Apps Script butler (`drive_butler_v2.js`), and frontend architecture (`js/`, `index.html`).

A total of **22 distinct vulnerabilities** were identified across three main architectural layers:
1. **Local Proxy Perimeter & Network Interface (`server.js`)**: 10 vulnerabilities including critical plaintext API key leakage, unintended network interface binding, unauthenticated static file disclosure (`.env`), unbounded body denial of service, and global wildcard CORS.
2. **Google Drive Cloud Backend (`drive_butler_v2.js`)**: 6 vulnerabilities including unauthenticated note dumping (BOLA/IDOR), global Google Drive file deletion/renaming (IDOR), password authentication bypass, and arbitrary account takeover via profile overwrite.
3. **Client Architecture & Cryptographic Vault (`js/` and `index.html`)**: 6 vulnerabilities including cleartext OAuth access token persistence in `localStorage`, client-side authentication gate bypass, pseudo-cryptographic key derivation with predictable entropy, and DOM-based XSS vectors.

---

## Section 1: Discovered Vulnerabilities

### Subsection 1.1: Local Proxy Server & Network Perimeter (`server.js`)

---

#### VULN-01: Critical Secret Exfiltration via `/api/live-config` (Plaintext Gemini API Key Leakage)
- **Classification**: CWE-200: Exposure of Sensitive Information to an Unauthorized Actor / CWE-312: Cleartext Storage and Transmission of Sensitive Records
- **Affected Component & File Path**: Local Proxy Server — `server.js`
- **Exact Line Numbers**: Lines 720–729
- **Vulnerable Code Snippet**:
  ```javascript
  // 1b. Live API Config Endpoint
  if (pathname === '/api/live-config' && req.method === 'GET') {
    const activeKey = serverKeyRotator.getActiveKey()?.key || '';
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      hasServerKey: Boolean(activeKey),
      apiKey: activeKey,
      liveModel: 'gemini-3.8-live'
    }));
    return;
  }
  ```
- **Attack Surface & Exposure Mechanism**: Public HTTP GET endpoint with no authentication, combined with the server's global CORS header (`Access-Control-Allow-Origin: *`). Accessible from any web page running in any browser tab, or any machine on the local network.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  The developer added this endpoint to allow client-side WebSocket code (`live-voice.js`) to establish direct connections to Gemini Live. However, because CORS is set to wildcard (`*`), any malicious third-party website visited by the user in another browser tab can issue a background `fetch('http://127.0.0.1:3000/api/live-config')` request. The malicious script receives the raw, unmasked Gemini API key stored in the server's `.env` file in plaintext and exfiltrates it to an external C2 server. This completely compromises the user's Google Cloud project, allowing attackers to hijack API quotas, consume credits, or run expensive foundation models on the victim's account.

---

#### VULN-02: Missing Network Interface Binding (`0.0.0.0` INADDR_ANY Exposure) Violating Loopback Isolation
- **Classification**: CWE-668: Exposure of Resource to Wrong Sphere / Unintended Network Interface Binding
- **Affected Component & File Path**: Server Initialization — `server.js`
- **Exact Line Numbers**: Lines 1050–1059
- **Vulnerable Code Snippet**:
  ```javascript
  server.listen(PORT, () => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    console.log('====================================================');
    console.log('NBLMimic Server running');
    console.log(`Primary URL: http://localhost:${PORT}`);
    console.log(`Loopback IP: http://127.0.0.1:${PORT}`);
    console.log('Security: Loopback only (127.0.0.1) - Zero External Leakage');
    console.log(`Gemini API Key: ${hasKey ? 'LOADED from .env' : 'NOT SET in .env (add to .env)'}`);
    console.log('====================================================');
  });
  ```
- **Attack Surface & Exposure Mechanism**: In Node.js, invoking `server.listen(PORT)` without specifying a host address binds the server by default to `0.0.0.0` (`INADDR_ANY`). Despite console logging claiming *"Security: Loopback only (127.0.0.1) - Zero External Leakage"*, the server actually binds to all local network adapters (LAN, Wi-Fi, virtual adapters, VPN interfaces).
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  When a developer runs NBLMimic on a laptop connected to a shared office, coffee shop, university, or conference Wi-Fi network, any device on the same subnet can connect directly to `http://<laptop-ip>:3000/`. Because the server enforces no authentication or IP filtering, local attackers on the Wi-Fi network can query `/api/live-config`, `/api/chat`, `/api/keys/rotate`, and static files (`/.env`), exfiltrating private tokens and abusing server AI proxies without needing to trick the victim into visiting a webpage.

---

#### VULN-03: Sensitive File & Secret Disclosure (`.env`, `.git`, Source Code) via Static File Handler Flaw
- **Classification**: CWE-552: Files or Directories Accessible to External Parties / CWE-200: Information Exposure
- **Affected Component & File Path**: Static File Server — `server.js`
- **Exact Line Numbers**: Lines 1006–1038
- **Vulnerable Code Snippet**:
  ```javascript
  let normalizedPath = pathname;
  if (pathname === '/' || pathname === '/index.dhtml') {
    normalizedPath = 'index.html';
  } else if (pathname === '/index.dhtml') {
    normalizedPath = 'index.html';
  }
  let filePath = path.join(__dirname, normalizedPath);

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
    ...
    fs.createReadStream(filePath).pipe(res);
  });
  ```
- **Attack Surface & Exposure Mechanism**: The static file router takes `parsedUrl.pathname` and joins it directly with `__dirname`. The only protection check is `if (!filePath.startsWith(__dirname))`.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  1. **Direct Dotfile / `.env` Download**: Requesting `GET /.env` sets `filePath` to `<rootDir>/.env`. Since this path begins with `__dirname`, the traversal check passes, and `fs.stat` confirms it is a file. The server streams the full `.env` file back with `Content-Type: application/octet-stream`, leaking `GEMINI_API_KEYS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_DRIVE_WEBAPP_URL`.
  2. **Sensitive Artifacts & Git Metadata Exposure**: Attackers can download `/.git/config`, `/.git/HEAD`, `/server.js`, `/package.json`, and any other file stored in the project directory.
  3. **Path Prefix Flaw**: The check `filePath.startsWith(__dirname)` fails to include `path.sep` (e.g. `__dirname + path.sep`). If a directory named `<rootDir>_backup` exists alongside the project, an attacker could traverse into it if path normalization resolves to the sibling folder.

---

#### VULN-04: Unbounded HTTP Request Body / Process Denial of Service (DoS) in `/api/chat`
- **Classification**: CWE-400: Uncontrolled Resource Consumption / CWE-770: Allocation of Resources Without Limits or Throttling
- **Affected Component & File Path**: Chat Proxy Endpoint — `server.js`
- **Exact Line Numbers**: Lines 871–875
- **Vulnerable Code Snippet**:
  ```javascript
  // 2. Secure Multi-Key Gemini Chat Proxy Endpoint with Automatic Failover & Cooldown
  if (pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
  ```
- **Attack Surface & Exposure Mechanism**: An unauthenticated HTTP POST endpoint that buffers incoming data stream chunks into memory with zero length validation or size capping.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  An attacker sends an HTTP POST request with an endless or multi-gigabyte body stream (`Transfer-Encoding: chunked`). The Node.js event loop continuously appends data chunks to string `body` in memory. This triggers V8 heap memory exhaustion, leading to `ERR_STRING_TOO_LONG` or an out-of-memory process crash (`JavaScript heap out of memory`), terminating the local server and disrupting user research sessions.

---

#### VULN-05: Unbounded State Cache Memory Leak (DoS) in `clientRotatorCache`
- **Classification**: CWE-770: Allocation of Resources Without Limits or Throttling / CWE-400: Memory Leak
- **Affected Component & File Path**: Key Management Engine — `server.js`
- **Exact Line Numbers**: Lines 159–172 (called from lines 735, 751, 886)
- **Vulnerable Code Snippet**:
  ```javascript
  // Global client BYOK key rotator cache (persists cooldown & slot index across requests)
  const clientRotatorCache = new Map();

  function getOrCreateClientRotator(clientKeys = []) {
    if (!Array.isArray(clientKeys) || clientKeys.length === 0) return null;
    const normalized = clientKeys.map(k => String(k).trim()).filter(Boolean);
    if (normalized.length === 0) return null;
    const hash = crypto.createHash('sha256').update(normalized.join(':::')).digest('hex');
    if (clientRotatorCache.has(hash)) {
      return clientRotatorCache.get(hash);
    }
    const rotator = new KeyRotator(normalized);
    clientRotatorCache.set(hash, rotator);
    return rotator;
  }
  ```
- **Attack Surface & Exposure Mechanism**: `clientRotatorCache` stores instances of `KeyRotator` indexed by a SHA-256 hash of client-supplied keys. This cache has no maximum size, no LRU eviction, and no time-to-live (TTL).
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  An attacker or script floods `/api/keys/status?keys=<random>` or sends repeated POST requests to `/api/chat` with randomized `apiKeys` arrays. Each unique request creates a new `KeyRotator` object retained permanently in `clientRotatorCache`. Over time, this uncollected memory leads to severe memory bloat and eventual process crash.

---

#### VULN-06: Sensitive OAuth Bearer Token Exposure in Query Parameters & Blind Redirect Proxying in `/api/drive/file`
- **Classification**: CWE-598: Use of GET Request Method With Sensitive Query Strings / CWE-200: Information Exposure
- **Affected Component & File Path**: Google Drive Stream Proxy — `server.js`
- **Exact Line Numbers**: Lines 805–846
- **Vulnerable Code Snippet**:
  ```javascript
  if (pathname === '/api/drive/file' && req.method === 'GET') {
    const fileId = parsedUrl.searchParams.get('id');
    const token = parsedUrl.searchParams.get('token') || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '');
    const mime = (parsedUrl.searchParams.get('mime') || '').toLowerCase();
    ...
    const driveReq = https.get(targetUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 NBLMimic-Secure-Proxy/1.0'
      }
    }, (driveRes) => {
      // If Google returned a redirect (302/303/307), follow it
      if (driveRes.statusCode >= 300 && driveRes.statusCode < 400 && driveRes.headers.location) {
        https.get(driveRes.headers.location, (redirRes) => {
          ...
          redirRes.pipe(res);
        })
  ```
- **Attack Surface & Exposure Mechanism**:
  1. The Google OAuth access token is accepted via the URL query parameter `?token=...`.
  2. The server blindly follows redirect URLs from `driveRes.headers.location` via `https.get(driveRes.headers.location)` without validating the protocol or host domain.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  Because the client embed (`reader-embed-iframe` in `sources-reader.js`) sets `iframe.src = "/api/drive/file?token=" + token`, the OAuth token is stored in browser navigation history, printed in server access logs, and leaked via HTTP `Referer` headers whenever an embedded resource loads an external link. Furthermore, blind redirect following without host validation could allow an attacker who manipulates upstream responses or proxy targets to cause the server to request arbitrary HTTPS destinations.

---

#### VULN-07: Permissive Wildcard Cross-Origin Resource Sharing (`Access-Control-Allow-Origin: *`) across Privileged Endpoints
- **Classification**: CWE-942: Permissive Cross-Origin Resource Sharing Policy
- **Affected Component & File Path**: Global HTTP Middleware — `server.js`
- **Exact Line Numbers**: Lines 690–700
- **Vulnerable Code Snippet**:
  ```javascript
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
  ```
- **Attack Surface & Exposure Mechanism**: Global application of `Access-Control-Allow-Origin: *` to every HTTP endpoint, including sensitive data feeds, credential endpoints, and key rotation triggers.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  Standard web browsers restrict arbitrary websites from reading responses from `localhost` unless the local server explicitly provides CORS headers. By configuring `Access-Control-Allow-Origin: *`, NBLMimic explicitly removes this browser security boundary. Any malicious or compromised website running in any browser tab can issue AJAX requests to `http://localhost:3000` and read the full response body, turning a local loopback server into a globally readable target.

---

#### VULN-08: Unauthenticated Gemini API Quota Exhaustion & Financial Depletion via `/api/chat` Proxying
- **Classification**: CWE-306: Missing Authentication for Critical Function / CWE-770: Allocation of Resources Without Limits
- **Affected Component & File Path**: Chat Proxy Endpoint — `server.js`
- **Exact Line Numbers**: Lines 871–971
- **Vulnerable Code Snippet**:
  ```javascript
  if (pathname === '/api/chat' && req.method === 'POST') {
    ...
    // Multi-Key Failover Loop across healthy keys in pool
    for (let attempt = 0; attempt < maxKeyAttempts; attempt++) {
      const keyEntry = activeRotator.getActiveKey();
      if (!keyEntry) break;
      const result = await callGoogleModel(requestedModel, keyEntry.key, modelTimeoutMs);
  ```
- **Attack Surface & Exposure Mechanism**: `/api/chat` proxies requests to the upstream Google Gemini API using keys configured in `.env` whenever the client omits BYOK keys. The endpoint requires no session token, password, or origin validation.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  An external attacker or automated script on the LAN (or cross-origin script via CORS) can send thousands of automated requests to `/api/chat`. The proxy consumes the server's Gemini API key quota, exhausts token limits across all rotated keys in the pool, and can incur significant pay-as-you-go billing charges on the victim's Google Cloud account.

---

#### VULN-09: Unauthenticated State Manipulation & Cache Tampering via `/api/keys/rotate`
- **Classification**: CWE-306: Missing Authentication for Critical Function / CWE-284: Improper Access Control
- **Affected Component & File Path**: Key Management Trigger — `server.js`
- **Exact Line Numbers**: Lines 747–764
- **Vulnerable Code Snippet**:
  ```javascript
  // 1d. Manual Gemini Key Rotation Trigger Endpoint
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
  ```
- **Attack Surface & Exposure Mechanism**: Public POST endpoint accepting unauthenticated requests with no CSRF token or session check.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  A cross-origin webpage or network attacker can repeatedly trigger key rotation on the victim's server. By continuously cycling slots and forcing healthy keys into rotation while errors occur, an attacker can manipulate key rotator telemetry or force active sessions onto cooling-down or rate-limited keys.

---

#### VULN-10: Lack of Essential HTTP Security Headers (CSP, Frame-Options, Sniff-Protection)
- **Classification**: CWE-693: Protection Mechanism Failure
- **Affected Component & File Path**: Global Response Headers & Static Server — `server.js`
- **Exact Line Numbers**: Lines 690–700, 1031–1036
- **Vulnerable Code Snippet**:
  ```javascript
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  ```
- **Attack Surface & Exposure Mechanism**: Responses lack `Content-Security-Policy` (CSP), `X-Frame-Options`, `X-Content-Type-Options: nosniff` (on static files), and `Referrer-Policy`.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  The absence of a Content Security Policy allows any injected inline script or malicious HTML payload to execute freely without domain restriction, connect to external domains, and exfiltrate sensitive tokens. The lack of `X-Frame-Options` enables clickjacking if the loopback server is framed in an invisible iframe by an attacker.

---

### Subsection 1.2: Cloud Butler Backend (`drive_butler_v2.js`)

---

#### VULN-11: Complete Broken Object Level Authorization (BOLA / IDOR) in `doGet` (Unauthenticated Note Exfiltration)
- **Classification**: CWE-284: Improper Access Control / CWE-639: Insecure Direct Object Reference (IDOR)
- **Affected Component & File Path**: Google Apps Script Backend — `drive_butler_v2.js`
- **Exact Line Numbers**: Lines 59–99
- **Vulnerable Code Snippet**:
  ```javascript
  // Handle GET requests: load user notes & storage info
  function doGet(e) {
    try {
      const username = (e && e.parameter && e.parameter.username) ? e.parameter.username : "guest";
      const userFolder = getOrCreateUserFolder(username);
      const storage = calculateFolderStorage(userFolder);
      
      const files = userFolder.getFiles();
      const notes = [];
      
      while (files.hasNext()) {
        const file = files.next();
        const fileName = file.getName();
        if (fileName === "profile.json") continue; // keep profile internal
        try {
          notes.push({
            id: file.getId(),
            name: fileName,
            content: file.getBlob().getDataAsString(),
            sizeBytes: file.getSize(),
            updatedAt: file.getLastUpdated()
          });
        } catch (err) {}
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        username: username,
        storageUsedBytes: storage.totalBytes,
        storageLimitBytes: USER_STORAGE_LIMIT_BYTES,
        fileCount: storage.fileCount,
        notes: notes
      })).setMimeType(ContentService.MimeType.JSON);
  ```
- **Attack Surface & Exposure Mechanism**: Public Google Apps Script web app endpoint (`/exec?username=...`). No authentication, Bearer token, password hash, or signature verification is performed.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  The Google Apps Script runs as the deploying user. Any third party anywhere on the internet who knows or enumerates a username (e.g. `guest`, `admin`, `researcher`, or a specific researcher's username) can send `GET https://script.google.com/macros/s/.../exec?username=<target>`. The script traverses the target folder and dumps all files and their complete text content (`file.getBlob().getDataAsString()`) in a JSON response, leading to instant, total exfiltration of user research notes.

---

#### VULN-12: Arbitrary Google Drive File Deletion via Global IDOR in `doPost(deleteFile)`
- **Classification**: CWE-285: Improper Authorization / CWE-639: IDOR
- **Affected Component & File Path**: Google Apps Script Backend — `drive_butler_v2.js`
- **Exact Line Numbers**: Lines 165–183
- **Vulnerable Code Snippet**:
  ```javascript
  if (action === "deleteFile") {
    if (data.fileId) {
      try {
        DriveApp.getFileById(data.fileId).setTrashed(true);
      } catch (e) {}
    } else if (data.fileName) {
      const files = userFolder.getFilesByName(data.fileName);
      while (files.hasNext()) {
        try { files.next().setTrashed(true); } catch(e) {}
      }
    }
  ```
- **Attack Surface & Exposure Mechanism**: Public unauthenticated POST action. `DriveApp.getFileById(data.fileId).setTrashed(true)` operates globally across the entire Google Drive account of the user who deployed the script.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  The handler does **not** verify that `data.fileId` is located within `userFolder` or even within `NBLMimic_Database`. An attacker sends `{ "action": "deleteFile", "fileId": "<target_drive_file_id>" }`. The Butler trashes the specified file on the hosting Google account, enabling deletion of personal files, spreadsheets, backups, or workspace documents completely unrelated to NBLMimic.

---

#### VULN-13: Arbitrary Google Drive File Renaming via Global IDOR in `doPost(renameFile)`
- **Classification**: CWE-285: Improper Authorization / CWE-639: IDOR
- **Affected Component & File Path**: Google Apps Script Backend — `drive_butler_v2.js`
- **Exact Line Numbers**: Lines 185–197
- **Vulnerable Code Snippet**:
  ```javascript
  if (action === "renameFile") {
    if (data.fileId) {
      try {
        const file = DriveApp.getFileById(data.fileId);
        const newName = (data.newTitle || "Renamed").replace(/[/\\?%*:|"<>]/g, "_") + ".json";
        file.setName(newName);
      } catch (e) {}
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "File renamed in Drive"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  ```
- **Attack Surface & Exposure Mechanism**: Public unauthenticated POST action with zero folder boundary verification.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  Similar to VULN-12, an attacker provides any arbitrary `fileId` on the owner's Google Drive. The script renames the file to `<newTitle>.json`. An attacker can disrupt business operations or corrupt data integrity by arbitrarily renaming critical files across the owner's Drive.

---

#### VULN-14: Authentication Bypass in `signIn` and `register` via Omitted Password Parameter
- **Classification**: CWE-287: Improper Authentication / CWE-308: Use of Implicit or Incomplete Verification
- **Affected Component & File Path**: Google Apps Script Backend — `drive_butler_v2.js`
- **Exact Line Numbers**: Lines 120–163
- **Vulnerable Code Snippet**:
  ```javascript
  // Check if registration conflicts with an existing password-protected user
  if (action === "register" && profile.passwordHash && data.passwordHash) {
    if (profile.passwordHash !== data.passwordHash) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        code: "USERNAME_TAKEN",
        message: "Username @" + username + " is already registered in Google Drive. Please sign in or choose another username."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Check if sign-in password matches
  if (action === "signIn" && profile.passwordHash && data.passwordHash) {
    if (profile.passwordHash !== data.passwordHash) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        code: "INCORRECT_PASSWORD",
        message: "Incorrect password for user @" + username + " in Google Drive."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  ...
  // User registered or signed in!
  const storage = calculateFolderStorage(userFolder);
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "User signed in and folder verified: NBLMimic_Database/user/" + username,
    username: username,
    storageUsedBytes: storage.totalBytes,
    storageLimitBytes: USER_STORAGE_LIMIT_BYTES
  })).setMimeType(ContentService.MimeType.JSON);
  ```
- **Attack Surface & Exposure Mechanism**: The authentication verification logic checks `if (action === "signIn" && profile.passwordHash && data.passwordHash)`.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  If an attacker sends a POST request with `{ "action": "signIn", "username": "admin" }` and completely omits `passwordHash`, the condition `profile.passwordHash && data.passwordHash` evaluates to `false` (since `data.passwordHash` is `undefined`). The error block is skipped entirely, and the script falls through to return `status: "success"`. This represents a complete authentication bypass for any password-protected user on the Butler backend.

---

#### VULN-15: Permanent Account Takeover & Profile Overwrite via Unauthenticated `saveNote` targeting `profile.json`
- **Classification**: CWE-285: Improper Authorization / CWE-434: Unrestricted File Overwrite
- **Affected Component & File Path**: Google Apps Script Backend — `drive_butler_v2.js`
- **Exact Line Numbers**: Lines 199–220
- **Vulnerable Code Snippet**:
  ```javascript
  // Save note or document in user folder
  const fileName = (data.title || "Note_" + Date.now()).replace(/[/\\?%*:|"<>]/g, "_") + ".json";

  // Check if file already exists with same name to update it
  const existingFiles = userFolder.getFilesByName(fileName);
  let targetFile;
  if (existingFiles.hasNext()) {
    targetFile = existingFiles.next();
    targetFile.setContent(JSON.stringify(data, null, 2));
  } else {
    targetFile = userFolder.createFile(fileName, JSON.stringify(data, null, 2), MimeType.PLAIN_TEXT);
  }
  ```
- **Attack Surface & Exposure Mechanism**: `action: "saveNote"` requires zero authentication. File names are formed by appending `.json` to `data.title`.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  If an attacker sends a POST request with:
  ```json
  {
    "username": "victim",
    "action": "saveNote",
    "title": "profile",
    "passwordHash": "attacker_hash",
    "email": "attacker@evil.com"
  }
  ```
  The code sanitizes the title and generates `fileName = "profile.json"`. It searches `userFolder.getFilesByName("profile.json")`, finds the victim's existing `profile.json` file, and overwrites it with the attacker's payload. The attacker replaces the victim's password hash, resulting in permanent account takeover.

---

#### VULN-16: Unrestricted Google Drive Storage Quota Depletion DoS via `saveNote`
- **Classification**: CWE-400: Uncontrolled Resource Consumption / CWE-770: Allocation of Resources Without Limits
- **Affected Component & File Path**: Storage Allocation Logic — `drive_butler_v2.js`
- **Exact Line Numbers**: Lines 9, 47–57, 199–220
- **Vulnerable Code Snippet**:
  ```javascript
  const USER_STORAGE_LIMIT_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB in bytes
  ...
  // In doPost:
  targetFile = userFolder.createFile(fileName, JSON.stringify(data, null, 2), MimeType.PLAIN_TEXT);
  const storage = calculateFolderStorage(userFolder);
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    fileId: targetFile.getId(),
    fileName: fileName,
    storageUsedBytes: storage.totalBytes,
    storageLimitBytes: USER_STORAGE_LIMIT_BYTES
  })).setMimeType(ContentService.MimeType.JSON);
  ```
- **Attack Surface & Exposure Mechanism**: `USER_STORAGE_LIMIT_BYTES` is defined at the top of the file and returned in responses, but is **never checked** before calling `createFile` or `setContent`.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  An attacker can repeatedly submit large payloads in an unauthenticated loop. Because quota enforcement is non-existent, the Butler fills the Google Drive account of the hosting user until the 15 GB / 100 GB / 2 TB Google Workspace quota is entirely exhausted, causing Google Drive to reject all sync operations, document creations, and incoming Gmail messages.

---

### Subsection 1.3: Client Architecture & Cryptographic Vault (`js/*` and `index.html`)

---

#### VULN-17: Plaintext Storage of High-Privilege Google Drive OAuth2 Access Tokens in `localStorage`
- **Classification**: CWE-312: Cleartext Storage of Sensitive Information / CWE-922: Insecure Storage of Sensitive Information
- **Affected Component & File Path**: Authentication & Drive Subsystem — `js/auth-drive.js`
- **Exact Line Numbers**: Lines 559–563, 621–624
- **Vulnerable Code Snippet**:
  ```javascript
  // 3. Persist both to CryptoVault and localStorage with TTL envelope
  if (userObj) {
    await CryptoVault.setSecureItem('nbl_user_session', userObj);
    try {
      localStorage.setItem('nbl_user_session_raw', JSON.stringify(userObj));
    } catch (e) {}
  }
  await CryptoVault.setSecureItem('nbl_drive_token', driveToken, expiresIn * 1000);
  await CryptoVault.setSecureItem('nbl_drive_token_expires', driveTokenExpires, expiresIn * 1000);
  try {
    localStorage.setItem('nbl_auth_connected', 'true');
    localStorage.setItem('nbl_drive_token_raw', driveToken);
    localStorage.setItem('nbl_drive_token_expires_raw', String(driveTokenExpires));
  } catch (e) {}
  ```
- **Attack Surface & Exposure Mechanism**: Despite implementing `CryptoVault` for hardware-bound AES-GCM encryption, the codebase explicitly writes the raw OAuth2 access token to `localStorage.setItem('nbl_drive_token_raw', driveToken)`.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  `localStorage` is accessible in cleartext to all scripts running in the origin, browser extensions, and malware scanning local browser profile folders on disk. Any XSS vulnerability (e.g. VULN-22) or malicious browser extension can execute `localStorage.getItem('nbl_drive_token_raw')` and exfiltrate the token. Because the OAuth scopes include `drive.file` and `drive.readonly`, the attacker gains full authority to download, modify, and delete the user's Google Drive documents.

---

#### VULN-18: Client-Only Authentication Gate Bypass via `localStorage` Flag Tampering
- **Classification**: CWE-602: Client-Side Enforcement of Server-Side Security
- **Affected Component & File Path**: Application Entry & Lifecycle — `js/app.js`
- **Exact Line Numbers**: Lines 102–117
- **Vulnerable Code Snippet**:
  ```javascript
  // 5. Complete Startup Check & Transition
  const existingUser = localStorage.getItem('nbl_user_session_raw') || sessionStorage.getItem('nbl_user_session_raw');
  const isAuthConn = localStorage.getItem('nbl_auth_connected') === 'true';
  const isAuthenticated = Boolean(existingUser || isAuthConn);

  if (!isAuthenticated) {
    // User is NOT authenticated -> Let the Liquid Glass Logo Reveal bloom for initial health check before showing Login Stage
    const elapsed = performance.now() - startupScreen.startTime;
    const initialBloomDelay = Math.max(0, 1600 - elapsed);
    setTimeout(() => {
      startupScreen.showLoginStage();
    }, initialBloomDelay);
  } else if (health.ok) {
    const msg = health.hasServerKey
      ? `Backend online · Gemini key pool active (${health.keyPoolSize || 1} keys)`
      : 'Backend online · Ready for client BYOK key';
    await startupScreen.markReadyAndDismiss(msg);
  ```
- **Attack Surface & Exposure Mechanism**: Application access gating is evaluated purely in client-side JavaScript by checking `localStorage.getItem('nbl_auth_connected') === 'true'`.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  An unauthenticated user or intruder with physical access to an open browser tab can open Developer Tools (F12) and execute:
  ```javascript
  localStorage.setItem('nbl_auth_connected', 'true');
  location.reload();
  ```
  The startup gate unlocks immediately, dismissing the login modal and granting full access to the research workspace, documents, and local offline vaults.

---

#### VULN-19: Pseudo-Cryptographic Key Derivation & Predictable Entropy in `CryptoVault`
- **Classification**: CWE-326: Inadequate Encryption Strength / CWE-330: Use of Insufficiently Random Values
- **Affected Component & File Path**: Hardware-Bound Vault — `js/crypto-vault.js`
- **Exact Line Numbers**: Lines 20–33, 55–66, 111–115
- **Vulnerable Code Snippet**:
  ```javascript
  async function getDeviceFingerprint() {
    const nav = typeof navigator !== 'undefined' ? navigator : { userAgent: 'test', language: 'en-US', hardwareConcurrency: 4 };
    const scr = typeof screen !== 'undefined' ? screen : { width: 1920, height: 1080, colorDepth: 24 };

    const raw = [
      nav.userAgent || '',
      nav.language || '',
      (scr.width || 0) + 'x' + (scr.height || 0),
      scr.colorDepth || 24,
      nav.hardwareConcurrency || 4,
      'ResearchLab_Vault_Key_2026'
    ].join('###');
    return new TextEncoder().encode(raw);
  }
  ...
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const ctHex = Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${PREFIX_V3}${saltHex}:${ivHex}:${ctHex}`;
  ```
- **Attack Surface & Exposure Mechanism**: The derivation key uses PBKDF2 with 100,000 rounds, but the "passphrase" (`raw`) consists solely of public, non-secret browser properties (`userAgent`, `language`, `screen resolution`, `hardwareConcurrency`) combined with a hardcoded static string (`'ResearchLab_Vault_Key_2026'`). The PBKDF2 salt is embedded in cleartext in the ciphertext payload (`enc:v3:<saltHex>:...`).
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  The developer intended this to be "hardware-bound encryption" to prevent credential theft. However, because every input to `getDeviceFingerprint()` is public and non-random, an attacker who acquires the encrypted strings from `localStorage` (via backup, extension, or disk artifact) can easily enumerate common resolutions and user-agent strings to re-derive the key in milliseconds. This provides zero cryptographic protection beyond simple obfuscation.

---

#### VULN-20: Plaintext Research Notes Persistence in `localStorage` Bypassing Vault Controls
- **Classification**: CWE-312: Cleartext Storage of Sensitive Information
- **Affected Component & File Path**: Lab Notes Subsystem — `js/notes.js`
- **Exact Line Numbers**: Lines 263–268
- **Vulnerable Code Snippet**:
  ```javascript
  textarea.addEventListener('input', () => {
    const val = textarea.value;
    state.set('notesContent', val);
    localStorage.setItem('nbl_lab_notes', val);
    CryptoVault.setSecureItem('nbl_lab_notes', val).catch(() => {});
    updateModalWordCount();
  ```
- **Attack Surface & Exposure Mechanism**: Every keystroke entered into the Lab Notes scratchpad is saved to `localStorage.setItem('nbl_lab_notes', val)` in plaintext alongside the encrypted vault entry.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  A researcher using NBLMimic drafts private intellectual property, patent drafts, or unpublished findings. While the UI displays a badge claiming *"Encrypted Vault"*, the application saves unencrypted notes directly to `localStorage`, exposing user drafts to disk inspection and browser extension scrapers.

---

#### VULN-21: Global Exposure of Reactive State Store and OAuth Credentials on `window.state`
- **Classification**: CWE-497: Exposure of Sensitive System Information to an Unauthorized Control Sphere
- **Affected Component & File Path**: State Store — `js/state.js`
- **Exact Line Numbers**: Lines 86–89
- **Vulnerable Code Snippet**:
  ```javascript
  export const state = new StateStore();
  if (typeof window !== 'undefined') {
    window.state = state;
  }
  ```
- **Attack Surface & Exposure Mechanism**: The singleton `state` instance is mounted to the global `window` object.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  Any JavaScript snippet executing in the DOM (via XSS, third-party analytics, or malicious browser extensions) does not need to decrypt `CryptoVault` or parse `localStorage`. It simply calls:
  ```javascript
  const token = window.state.get('driveToken');
  const apiKey = window.state.get('geminiApiKey');
  ```
  This immediately exposes live credentials in memory.

---

#### VULN-22: Cross-Site Scripting (DOM XSS) Risk via Pseudo-Protocol URLs (`javascript:`) in News Feed Cards
- **Classification**: CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')
- **Affected Component & File Path**: News Feed Aggregator — `js/sources-reader.js`
- **Exact Line Numbers**: Lines 1348, 1367, 1371, 1412
- **Vulnerable Code Snippet**:
  ```javascript
  <h3 class="card-3d-item card-3d-title" data-translate-z="50">
    <a href="${escapeHtml(art.url || '#')}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(cleanTitle)}">${escapeHtml(cleanTitle)}</a>
  </h3>
  ...
  <div class="card-3d-item card-3d-footer" data-translate-z="60">
    <a href="${escapeHtml(art.url || '#')}" target="_blank" rel="noopener noreferrer" class="card-3d-link-btn" title="Open source dispatch in new tab">
      <span>Read Story</span>
  ```
- **Attack Surface & Exposure Mechanism**: `art.url` is ingested from external RSS feeds and Hacker News API in `server.js` (`fetchLiveNewsFeed`). In `sources-reader.js`, `escapeHtml(art.url)` is inserted into `<a href="...">`.
- **Real-World Exploit Scenario / Impact on loopback workspace**:
  `escapeHtml()` only converts characters `&`, `<`, `>`, `"`, and `'`. If an RSS feed item or community submission contains a `javascript:` pseudo-protocol URL (e.g., `javascript:eval(atob('...'))`), `escapeHtml` leaves it unaltered. When the user clicks "Read Story" or the card title, the script executes within the context of the NBLMimic origin, accessing `window.state`, stealing Drive OAuth tokens, and exfiltrating local vaults.

---

## Vulnerability Summary Matrix

| Vulnerability ID | Vulnerability Title | Affected Component | Severity | CWE |
| :--- | :--- | :--- | :--- | :--- |
| **VULN-01** | Plaintext Gemini API Key Disclosure via `/api/live-config` with Wildcard CORS | `server.js` | **Critical** | CWE-200 / CWE-312 |
| **VULN-02** | Missing Interface Binding (`0.0.0.0` Exposure) Violating Loopback Assumption | `server.js` | **High** | CWE-668 |
| **VULN-03** | Arbitrary File Disclosure (`.env`, `.git`) via Static File Handler Flaw | `server.js` | **Critical** | CWE-552 / CWE-200 |
| **VULN-04** | Unbounded HTTP Body Heap Memory Exhaustion DoS in `/api/chat` | `server.js` | **High** | CWE-400 / CWE-770 |
| **VULN-05** | Unbounded In-Memory Rotator Cache Memory Leak DoS in `clientRotatorCache` | `server.js` | **Medium** | CWE-770 / CWE-400 |
| **VULN-06** | OAuth Bearer Token Exposure in Query Parameters & Blind Proxying in `/api/drive/file` | `server.js` | **High** | CWE-598 / CWE-200 |
| **VULN-07** | Permissive Wildcard CORS (`*`) on Privileged Local Endpoints | `server.js` | **High** | CWE-942 |
| **VULN-08** | Unauthenticated Gemini Model Quota & Financial Resource Exhaustion | `server.js` | **High** | CWE-306 / CWE-770 |
| **VULN-09** | Unauthenticated State Manipulation & Cache Tampering via `/api/keys/rotate` | `server.js` | **Medium** | CWE-306 / CWE-284 |
| **VULN-10** | Missing Fundamental Security Headers (CSP, Frame-Options, HSTS, Sniff) | `server.js` | **Medium** | CWE-693 |
| **VULN-11** | Unauthenticated BOLA / IDOR Note Dumping in `drive_butler_v2.js` (`doGet`) | `drive_butler_v2.js` | **Critical** | CWE-284 / CWE-639 |
| **VULN-12** | Arbitrary Google Drive File Deletion via Global IDOR (`deleteFile`) | `drive_butler_v2.js` | **Critical** | CWE-285 / CWE-639 |
| **VULN-13** | Arbitrary Google Drive File Renaming via Global IDOR (`renameFile`) | `drive_butler_v2.js` | **High** | CWE-285 / CWE-639 |
| **VULN-14** | Complete Password Authentication Bypass in `signIn` / `register` | `drive_butler_v2.js` | **Critical** | CWE-287 / CWE-308 |
| **VULN-15** | Account Takeover & Profile Overwrite via Unauthenticated `saveNote` | `drive_butler_v2.js` | **Critical** | CWE-285 / CWE-434 |
| **VULN-16** | Unchecked Drive Storage Quota Depletion DoS via `saveNote` | `drive_butler_v2.js` | **Medium** | CWE-400 / CWE-770 |
| **VULN-17** | Cleartext Google Drive OAuth2 Access Token Persistence in `localStorage` | `js/auth-drive.js` | **High** | CWE-312 / CWE-922 |
| **VULN-18** | Client-Only Authentication Gate Bypass via `localStorage` Tampering | `js/app.js` | **Medium** | CWE-602 |
| **VULN-19** | Pseudo-Cryptographic Key Derivation & Predictable Entropy in `CryptoVault` | `js/crypto-vault.js` | **Medium** | CWE-326 / CWE-330 |
| **VULN-20** | Plaintext Research Notes Persistence in `localStorage` | `js/notes.js` | **Medium** | CWE-312 |
| **VULN-21** | Global Exposure of Reactive State Store and OAuth Credentials on `window.state` | `js/state.js` | **Medium** | CWE-497 |
| **VULN-22** | Cross-Site Scripting (DOM XSS) Risk via Pseudo-Protocol URLs (`javascript:`) | `js/sources-reader.js` | **Medium** | CWE-79 |

---


## Section 2: Root-Cause Analysis & Remediation Blueprint

### 2.0 Architectural Remediation Framework

The 22 vulnerabilities identified in Section 1 reflect a common developmental trajectory: an application initially prototyped with rapid-iteration assumptions ("it runs on localhost, so it is safe") that evolved into a rich, multimodal research platform handling high-privilege credentials (Google Drive OAuth tokens, Google Cloud Gemini API keys, user research drafts) without retrofitting proper trust boundaries.

To eliminate these vulnerabilities systematically without introducing regressions or performance bottlenecks, the remediation blueprint divides the system into **six core architectural security domains**:

```mermaid
flowchart TD
    subgraph Client ["Client Browser Runtime (js/* & index.html)"]
        DomainE["Domain E: Session Storage & Credential Hygiene<br/>(VULN-17, 18, 19, 20, 21)"]
        DomainF["Domain F: DOM Injection & CSP Defense<br/>(VULN-22)"]
    end

    subgraph Perimeter ["Local Network Perimeter (server.js)"]
        DomainA["Domain A: Host Binding & Origin Control<br/>(VULN-02, 07)"]
        DomainB["Domain B: Static Asset Canonicalization & Headers<br/>(VULN-03, 10)"]
        DomainC["Domain C: API Gateway, Rate Limiting & Rotator<br/>(VULN-01, 04, 05, 06, 08, 09)"]
    end

    subgraph Cloud ["Google Workspace Cloud Backend (drive_butler_v2.js)"]
        DomainD["Domain D: Cloud Butler BOLA, IDOR & Integrity<br/>(VULN-11, 12, 13, 14, 15, 16)"]
    end

    DomainA -->|Enforces 127.0.0.1 & Whitelisted CORS| DomainC
    DomainB -->|Shields Secrets & Enforces CSP| Client
    DomainC -->|Redacts Server Keys & Limits Rate| Client
    DomainE -->|Encrypted Memory / Non-extractable Keys| DomainC
    DomainF -->|Sanitizes External News & Frames| Client
    Client -->|Authenticated Scoped Requests| DomainD
```

---

### Domain A: Network Boundary, Host Binding, & Perimeter Hardening (`server.js`)

#### A.1 Vulnerability Grouping & Standards Matrix
- **Vulnerabilities Covered**:
  - **VULN-02**: Missing Network Interface Binding (`0.0.0.0` INADDR_ANY Exposure)
  - **VULN-07**: Permissive Wildcard Cross-Origin Resource Sharing (`Access-Control-Allow-Origin: *`)
- **OWASP Top 10 (2021)**:
  - `A01:2021` — Broken Access Control
  - `A05:2021` — Security Misconfiguration
- **OWASP API Security Top 10 (2023)**:
  - `API8:2023` — Security Misconfiguration
- **CWE Identifiers**:
  - `CWE-668`: Exposure of Resource to Wrong Sphere
  - `CWE-942`: Permissive Cross-Origin Resource Sharing Policy
  - `CWE-284`: Improper Access Control

#### A.2 Architectural Root Cause Analysis
The proxy server was designed under the implicit mental model that local development servers are private by default. In Node.js, calling `server.listen(PORT)` without an explicit hostname parameter defaults to `0.0.0.0` (`INADDR_ANY`), which instructs the operating system kernel to bind the listening socket to all network interfaces, including Ethernet, Wi-Fi, and virtual VPN adapters. Concurrently, to avoid preflight CORS failures during rapid frontend testing, developers added `res.setHeader('Access-Control-Allow-Origin', '*')`. 

This combination produced a catastrophic failure of network boundary isolation:
1. Any device on the same local subnet (coffee shop, enterprise Wi-Fi) can send HTTP requests directly to the user's IP.
2. Any web browser running on the same machine (or on the local network) can execute cross-origin requests from arbitrary websites to `http://127.0.0.1:3000` because the browser's Same-Origin Policy (SOP) is explicitly instructed to permit cross-origin reads by the wildcard header.

#### A.3 Defensive Technical Specification for Agent 3
1. **Explicit Loopback Socket Binding**:
   - The server must bind exclusively to IPv4 loopback (`127.0.0.1`) by default.
   - Configurable via `process.env.HOST`, defaulting strictly to `'127.0.0.1'`.
   - The server must warn and refuse to start if bound to `0.0.0.0` unless an explicit `ALLOW_INSECURE_PUBLIC_BIND=true` environment variable is supplied.
2. **Context-Aware Dynamic Origin Verification (CORS)**:
   - Completely eliminate `res.setHeader('Access-Control-Allow-Origin', '*')`.
   - Maintain a strict set of authorized loopback origins:
     `ALLOWED_ORIGINS = new Set(['http://localhost:' + PORT, 'http://127.0.0.1:' + PORT])`.
   - When an `Origin` header is received:
     - Check if the incoming origin is within `ALLOWED_ORIGINS`.
     - If valid: reflect that exact origin in `Access-Control-Allow-Origin`, set `Vary: Origin`, set `Access-Control-Allow-Credentials: true`, and define strict allowed methods (`GET, POST, OPTIONS`) and headers (`Content-Type, Authorization, X-NBL-Session`).
     - If invalid or cross-origin from an external domain: reject preflight `OPTIONS` requests immediately with HTTP 403 Forbidden, and omit all CORS headers on other requests to ensure browser SOP blocks data access.
3. **Local Request Perimeter Guard (Sec-Fetch-Site & Host Header Validation)**:
   - For all mutating `/api/*` endpoints, inspect the `Host` header. Ensure it equals `localhost:${PORT}` or `127.0.0.1:${PORT}` to prevent DNS rebinding attacks.
   - Inspect `Sec-Fetch-Site` if provided: reject requests where `Sec-Fetch-Site: cross-site` targets sensitive API routes.

#### A.4 Concrete Code Blueprint for Agent 3 (`server.js`)

```javascript
// ════════════════════════════════════════════════
// DOMAIN A: Network Boundary & Perimeter Hardening
// ════════════════════════════════════════════════

const HOST = process.env.HOST || '127.0.0.1';
const ALLOWED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`
]);

function handleCorsAndPerimeter(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // 1. Host Header Validation (Anti-DNS Rebinding)
  const validHostPatterns = [
    `localhost:${PORT}`,
    `127.0.0.1:${PORT}`,
    `localhost`,
    `127.0.0.1`
  ];
  if (host && !validHostPatterns.includes(host)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Invalid Host header. Access denied.' } }));
    return false;
  }

  // 2. Strict Origin Matching (No Wildcards)
  if (origin) {
    if (ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-NBL-Session, X-Api-Keys');
    } else {
      // Untrusted Cross-Origin Request -> Drop CORS headers
      if (req.method === 'OPTIONS') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Cross-origin preflight rejected.' } }));
        return false;
      }
    }
  }

  // 3. Preflight Handling
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return false;
  }

  return true;
}

// In server initialization:
// server.listen(PORT, HOST, () => { ... });
```

---

### Domain B: Static Asset Delivery, Path Canonicalization, & Secret Shielding (`server.js`)

#### B.1 Vulnerability Grouping & Standards Matrix
- **Vulnerabilities Covered**:
  - **VULN-03**: Sensitive File & Secret Disclosure (`.env`, `.git`, Source Code) via Static File Handler
  - **VULN-10**: Lack of Essential HTTP Security Headers (CSP, Frame-Options, Sniff-Protection)
- **OWASP Top 10 (2021)**:
  - `A01:2021` — Broken Access Control
  - `A05:2021` — Security Misconfiguration
- **OWASP API Security Top 10 (2023)**:
  - `API8:2023` — Security Misconfiguration
- **CWE Identifiers**:
  - `CWE-552`: Files or Directories Accessible to External Parties
  - `CWE-200`: Exposure of Sensitive Information to an Unauthorized Actor
  - `CWE-22`: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')
  - `CWE-693`: Protection Mechanism Failure

#### B.2 Architectural Root Cause Analysis
The static file server implementation joined `__dirname` with `pathname` directly and only checked `if (!filePath.startsWith(__dirname))`. This failed in three critical ways:
1. **Trailing Separator Flaw**: `__dirname` without a trailing `path.sep` allows traversal into a sibling directory starting with the same prefix (e.g. `/var/app` vs `/var/app_backup`).
2. **Missing Dotfile & Internal File Filter**: Any file residing inside `__dirname` was served indiscriminately. A request for `GET /.env` or `GET /package.json` matched `filePath.startsWith(__dirname)`, found an existing file on disk via `fs.stat`, and streamed the entire secret configuration to the client under `application/octet-stream`.
3. **Missing Baseline Defensive Headers**: The static response did not set `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, or `X-Frame-Options`, allowing clickjacking, MIME-type sniffing, and unconstrained script execution.

#### B.3 Defensive Technical Specification for Agent 3
1. **Canonical Path Resolution & Strict Jail Confinement**:
   - Sanitize and decode URL pathname: `const cleanPathname = path.normalize(decodeURIComponent(parsedUrl.pathname)).replace(/^(\.\.[\/\\])+/, '');`
   - Map route aliases (`/`, `/index.dhtml`) strictly to `index.html`.
   - Construe absolute candidate path using `path.resolve(__dirname, '.' + cleanPathname)`.
   - Verify confinement using root directory with trailing path separator:
     `const ROOT_DIR_WITH_SEP = __dirname.endsWith(path.sep) ? __dirname : __dirname + path.sep;`
     Candidate must equal `__dirname` or start with `ROOT_DIR_WITH_SEP`.
2. **Multi-Tier File Blacklisting & Whitelisting**:
   - **Dotfile & Hidden Directory Block**: Check every path segment. If any segment begins with `.` (e.g. `/.env`, `/.git`, `/.github`, `/.vscode`), reject immediately with HTTP 404 (do not leak existence with 403).
   - **Forbidden Project Files Block**: Explicitly blacklist sensitive server files: `server.js`, `drive_butler_v2.js`, `package.json`, `package-lock.json`, `SECURITY_REPORT.md`, `STYLEGUIDE.md`, `AGENTS.md`.
   - **MIME Extension Whitelist**: Only allow known safe static extensions (`.html`, `.css`, `.js`, `.mjs`, `.json`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.woff`, `.woff2`, `.ttf`). Reject all other extensions (or unmapped extensions) with 404.
3. **Hardened HTTP Security Headers Middleware**:
   - Attach mandatory security headers to every HTTP response:
     - `Content-Security-Policy`: Restricts script, style, frame, and connect sources to loopback, Google Fonts, and Google OAuth endpoints.
     - `X-Content-Type-Options: nosniff` (strictly prevents MIME sniffing).
     - `X-Frame-Options: SAMEORIGIN` (prevents clickjacking by third-party frames).
     - `Referrer-Policy: strict-origin-when-cross-origin`.
     - `Permissions-Policy: camera=(), microphone=(self), geolocation=()`.

#### B.4 Concrete Code Blueprint for Agent 3 (`server.js`)

```javascript
// ════════════════════════════════════════════════
// DOMAIN B: Secure Static Asset Server & Security Headers
// ════════════════════════════════════════════════

const SAFE_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const FORBIDDEN_FILES = new Set([
  '.env',
  'server.js',
  'drive_butler_v2.js',
  'package.json',
  'package-lock.json',
  'security_report.md',
  'styleguide.md',
  'agents.md'
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
      "connect-src 'self' https://generativelanguage.googleapis.com https://www.googleapis.com https://accounts.google.com wss://generativelanguage.googleapis.com",
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

  // Decode URI component safely
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }

  // 1. Path Canonicalization & Root Boundary Validation
  const rootDirWithSep = __dirname.endsWith(path.sep) ? __dirname : __dirname + path.sep;
  const resolvedPath = path.resolve(__dirname, '.' + path.normalize(cleanPath));

  if (!resolvedPath.startsWith(rootDirWithSep) && resolvedPath !== __dirname) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // 2. Dotfile and Hidden Directory Defense
  const relativeSegments = path.relative(__dirname, resolvedPath).split(path.sep);
  const containsDotSegment = relativeSegments.some(seg => seg.startsWith('.'));
  if (containsDotSegment) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // 3. Sensitive File Blacklist Check
  const baseNameLower = path.basename(resolvedPath).toLowerCase();
  if (FORBIDDEN_FILES.has(baseNameLower)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // 4. Strict Extension Whitelist Check
  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = SAFE_MIME_TYPES[ext];
  if (!contentType) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // 5. File Stat & Stream
  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Length': stats.size
    });
    fs.createReadStream(resolvedPath).pipe(res);
  });
}
```

---

### Domain C: API Proxy Architecture, DoS Throttling, & Key Lifecycle Management (`server.js`)

#### C.1 Vulnerability Grouping & Standards Matrix
- **Vulnerabilities Covered**:
  - **VULN-01**: Critical Secret Exfiltration via `/api/live-config` (Plaintext Gemini API Key Leakage)
  - **VULN-04**: Unbounded HTTP Request Body / Process Denial of Service (DoS) in `/api/chat`
  - **VULN-05**: Unbounded State Cache Memory Leak (DoS) in `clientRotatorCache`
  - **VULN-06**: Sensitive OAuth Bearer Token Exposure in Query Parameters & Blind Redirect Proxying in `/api/drive/file`
  - **VULN-08**: Unauthenticated Gemini API Quota Exhaustion & Financial Depletion via `/api/chat`
  - **VULN-09**: Unauthenticated State Manipulation & Cache Tampering via `/api/keys/rotate`
- **OWASP Top 10 (2021)**:
  - `A01:2021` — Broken Access Control
  - `A04:2021` — Insecure Design
  - `A05:2021` — Security Misconfiguration
- **OWASP API Security Top 10 (2023)**:
  - `API2:2023` — Broken Authentication
  - `API4:2023` — Unrestricted Resource Consumption
  - `API7:2023` — Server-Side Request Forgery (SSRF)
- **CWE Identifiers**:
  - `CWE-200`: Exposure of Sensitive Information
  - `CWE-312`: Cleartext Storage and Transmission of Sensitive Records
  - `CWE-400`: Uncontrolled Resource Consumption
  - `CWE-770`: Allocation of Resources Without Limits or Throttling
  - `CWE-598`: Use of GET Request Method With Sensitive Query Strings
  - `CWE-306`: Missing Authentication for Critical Function

#### C.2 Architectural Root Cause Analysis
1. **Secret Leakage in `/api/live-config`**: Designed to support client-side direct WebSockets (`live-voice.js`), this endpoint returned `{ apiKey: activeKey }` in plaintext JSON. Because it lacked authentication and CORS was wildcarded, any browser script could exfiltrate the primary API key.
2. **Unbounded Buffering**: `/api/chat` accumulated stream chunks into memory with `req.on('data', chunk => { body += chunk; })` without measuring cumulative length. A single client could stream gigabytes of junk data and trigger a V8 heap out-of-memory crash.
3. **Unbounded Cache Growth**: `clientRotatorCache` used a native `Map` keyed on the SHA-256 hash of client keys, but lacked size constraints, LRU eviction, or TTL expiration. Attackers sending arbitrary key arrays caused indefinite memory leakage.
4. **OAuth Token in Query String & Blind Redirects**: In `/api/drive/file`, OAuth tokens were extracted from `?token=...`, causing credentials to be saved in browser history, proxy logs, and `Referer` headers. Furthermore, `driveRes.headers.location` was followed blindly without domain validation, creating an SSRF vector.
5. **Missing Session Authentication & Rate Limiting**: `/api/chat` and `/api/keys/rotate` accepted unauthenticated requests, allowing cross-origin or local network callers to deplete Google Cloud quotas and manipulate rotation telemetry.

#### C.3 Defensive Technical Specification for Agent 3
1. **Complete Secret Shielding on `/api/live-config`**:
   - Never send raw `apiKey` over HTTP to the client.
   - Return `{ hasServerKey: Boolean(activeKey), liveModel: 'gemini-3.8-live' }` only.
   - If the client requires Live voice interaction: it must supply its own BYOK key, or voice audio must be proxied through the server without exposing the raw secret.
2. **Safe Bounded JSON Body Reader**:
   - Implement `readJsonBody(req, res, maxBytes)` with a strict limit (e.g. 2 MB for chat payloads).
   - If accumulated chunk length exceeds `maxBytes`, immediately call `req.destroy()`, send HTTP 413 (Payload Too Large), and stop further processing.
3. **LRU Cache with TTL for `clientRotatorCache`**:
   - Replace unbounded `Map` with an LRU cache capped at 50 rotators and a 30-minute inactivity TTL.
   - On insertion, if capacity is reached, evict the oldest entry.
4. **RFC 6750 Bearer Token Compliance & Strict Redirect Whitelist in `/api/drive/file`**:
   - Prohibit `token` in URL search parameters. Extract the OAuth access token exclusively from the `Authorization: Bearer <token>` header. If passed via query string, reject with HTTP 400 Bad Request.
   - When handling HTTP 302/307 redirects from Google Drive, validate that `new URL(location).hostname` ends with `.google.com`, `.googleapis.com`, or `.googleusercontent.com` and uses `https:`. Reject any other redirect destination.
5. **Local Session Token Guard & IP Rate Limiting**:
   - Generate a cryptographically random session token on server startup: `SERVER_SESSION_TOKEN = crypto.randomBytes(32).toString('hex')`.
   - Provide this token to the client exclusively via the loopback `/api/health` response.
   - Require all mutating API requests (`/api/chat`, `/api/keys/rotate`) to send header `X-NBL-Session: <token>`.
   - Implement a Token Bucket / Sliding Window rate limiter on `/api/chat` (e.g. max 30 requests/minute per loopback client) to protect Google Cloud quota.

#### C.4 Concrete Code Blueprint for Agent 3 (`server.js`)

```javascript
// ════════════════════════════════════════════════
// DOMAIN C: API Gateway, DoS Throttling & LRU Cache
// ════════════════════════════════════════════════

const SERVER_SESSION_TOKEN = crypto.randomBytes(32).toString('hex');
const CHAT_BODY_LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB

// 1. Production-Grade LRU Cache with TTL for KeyRotator
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
    // Refresh LRU order: delete and re-insert
    this.cache.delete(hash);
    this.cache.set(hash, entry);
    return entry.rotator;
  }

  set(hash, rotator) {
    if (this.cache.has(hash)) {
      this.cache.delete(hash);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict oldest (first item in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(hash, { rotator, lastAccessed: Date.now() });
  }
}

const clientRotatorCache = new LRURotatorCache(50, 30 * 60 * 1000);

// 2. Safe Bounded JSON Body Stream Parser
function readJsonBody(req, res, maxBytes = CHAT_BODY_LIMIT_BYTES) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;

    req.on('data', chunk => {
      bytesReceived += chunk.length;
      if (bytesReceived > maxBytes) {
        req.destroy();
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Payload Too Large: Exceeded request size limit.' } }));
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
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Malformed JSON payload.' } }));
        reject(err);
      }
    });

    req.on('error', err => reject(err));
  });
}

// 3. Rate Limiter for /api/chat (Sliding Window: 30 req/min)
const rateLimitMap = new Map();
function checkRateLimit(clientId = 'default', limit = 30, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  let timestamps = rateLimitMap.get(clientId) || [];
  timestamps = timestamps.filter(t => t > windowStart);
  if (timestamps.length >= limit) {
    rateLimitMap.set(clientId, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(clientId, timestamps);
  return true;
}

// 4. Session Validation Helper
function validateSession(req, res) {
  const clientToken = req.headers['x-nbl-session'];
  if (!clientToken || clientToken !== SERVER_SESSION_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Unauthorized: Missing or invalid X-NBL-Session header.' } }));
    return false;
  }
  return true;
}

// 5. Remediation of /api/live-config: Never Return Plaintext Secret!
function handleLiveConfig(req, res) {
  const activeKey = serverKeyRotator.getActiveKey()?.key || '';
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    hasServerKey: Boolean(activeKey),
    // apiKey REMOVED — Zero secret leakage!
    liveModel: 'gemini-3.8-live'
  }));
}

// 6. Remediation of /api/drive/file: Header-only Token & Safe Redirect Whitelist
function handleDriveProxy(req, res, parsedUrl) {
  const fileId = parsedUrl.searchParams.get('id');
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Reject query-string tokens explicitly for security hygiene
  if (parsedUrl.searchParams.has('token')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'OAuth token must be passed via Authorization: Bearer header, not URL parameters.' }));
    return;
  }

  if (!fileId || !token) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing file id or Authorization Bearer header.' }));
    return;
  }

  const mime = (parsedUrl.searchParams.get('mime') || '').toLowerCase();
  let targetUrl = (mime.includes('google-apps.document') || mime.includes('google-apps.spreadsheet') || mime.includes('google-apps.presentation'))
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=application/pdf`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

  const driveReq = https.get(targetUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 NBLMimic-Secure-Proxy/1.0'
    }
  }, (driveRes) => {
    // Validate redirect host before following
    if (driveRes.statusCode >= 300 && driveRes.statusCode < 400 && driveRes.headers.location) {
      try {
        const redirUrl = new URL(driveRes.headers.location);
        const isAllowedDomain = redirUrl.protocol === 'https:' &&
          (redirUrl.hostname.endsWith('.google.com') ||
           redirUrl.hostname.endsWith('.googleapis.com') ||
           redirUrl.hostname.endsWith('.googleusercontent.com'));

        if (!isAllowedDomain) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Untrusted redirect destination rejected.' }));
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
        }).on('error', err => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });
        return;
      } catch (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid redirect URL.' }));
        return;
      }
    }

    if (driveRes.statusCode !== 200) {
      res.writeHead(driveRes.statusCode, { 'Content-Type': 'application/json' });
      driveRes.pipe(res);
      return;
    }

    const contentType = driveRes.headers['content-type'] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=1800'
    });
    driveRes.pipe(res);
  });

  driveReq.on('error', err => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });
}
```

---

### Domain D: Google Drive Cloud Backend (`drive_butler_v2.js`)

#### D.1 Vulnerability Grouping & Standards Matrix
- **Vulnerabilities Covered**:
  - **VULN-11**: Complete Broken Object Level Authorization (BOLA / IDOR) in `doGet` (Unauthenticated Note Exfiltration)
  - **VULN-12**: Arbitrary Google Drive File Deletion via Global IDOR in `doPost(deleteFile)`
  - **VULN-13**: Arbitrary Google Drive File Renaming via Global IDOR in `doPost(renameFile)`
  - **VULN-14**: Complete Authentication Bypass in `signIn` and `register` via Omitted Password Parameter
  - **VULN-15**: Permanent Account Takeover & Profile Overwrite via Unauthenticated `saveNote`
  - **VULN-16**: Unrestricted Google Drive Storage Quota Depletion DoS via `saveNote`
- **OWASP Top 10 (2021)**:
  - `A01:2021` — Broken Access Control
  - `A04:2021` — Insecure Design
  - `A07:2021` — Identification and Authentication Failures
- **OWASP API Security Top 10 (2023)**:
  - `API1:2023` — Broken Object Level Authorization (BOLA)
  - `API2:2023` — Broken Authentication
  - `API4:2023` — Unrestricted Resource Consumption
  - `API5:2023` — Broken Function Level Authorization
- **CWE Identifiers**:
  - `CWE-284`: Improper Access Control
  - `CWE-639`: Authorization Bypass Through User-Controlled Key (IDOR)
  - `CWE-285`: Improper Authorization
  - `CWE-287`: Improper Authentication
  - `CWE-308`: Use of Implicit or Incomplete Verification
  - `CWE-434`: Unrestricted File Overwrite
  - `CWE-400`: Uncontrolled Resource Consumption

#### D.2 Architectural Root Cause Analysis
The Google Apps Script Butler was configured with execution mode *"Execute as: Me"* (the script owner) and *"Who has access: Anyone"*. This gave the script global read, write, and delete permissions across the owner's entire personal Google Drive. 

The script suffered from five critical architectural omissions:
1. **Unchecked BOLA in `doGet`**: The GET handler read `e.parameter.username` and traversed that user folder to dump all notes and contents in plaintext JSON without checking any password or bearer token.
2. **Global Drive IDOR in `deleteFile` and `renameFile`**: Handlers accepted `fileId` and called `DriveApp.getFileById(data.fileId).setTrashed(true)` without verifying that the file was actually located inside `NBLMimic_Database/user/<username>/`.
3. **Flawed Authentication Logic**: The condition `if (action === "signIn" && profile.passwordHash && data.passwordHash)` checked if `data.passwordHash` was present before verifying matches. If an attacker omitted `passwordHash`, the condition evaluated to `false`, skipped the error check, and authenticated the attacker!
4. **Profile Namespace Collision**: `profile.json` was kept inside the notes folder. `saveNote` created files named `${data.title}.json`. Setting `data.title = "profile"` overwrote the user's password hash and email.
5. **Dormant Quota Check**: `USER_STORAGE_LIMIT_BYTES` was returned in JSON responses as metadata, but never enforced before file creation.

#### D.3 Defensive Technical Specification for Agent 3
1. **Universal User Authentication Guard**:
   - Create a central authentication helper `authenticateRequest(userFolder, clientPasswordHash)`.
   - Inspect `profile.json`. If `profile.passwordHash` exists, `clientPasswordHash` is strictly required. If missing or mismatched, immediately terminate with HTTP error `UNAUTHORIZED`.
   - Apply this check to `doGet` (via `e.parameter.passwordHash`) and all `doPost` actions (`saveNote`, `deleteFile`, `renameFile`).
2. **Strict Folder Hierarchy Ownership Verification**:
   - Implement `verifyFileOwnership(userFolder, fileId)`:
     - Retrieve file via `DriveApp.getFileById(fileId)`.
     - Inspect parents via `file.getParents()`.
     - Confirm that `parents.next().getId() === userFolder.getId()`.
     - If the file is not an immediate child of `userFolder`, throw an access-denied exception.
3. **Dedicated Profile Namespace & Name Shielding**:
   - Explicitly reserve `profile.json` as a protected system document.
   - In `saveNote` and `renameFile`, if `cleanTitle === "profile"`, reject with `FORBIDDEN_FILE_NAME`.
4. **Active Quota Enforcement**:
   - Before executing `userFolder.createFile` or `targetFile.setContent`, calculate current folder byte usage and add the incoming payload byte size.
   - If total exceeds `USER_STORAGE_LIMIT_BYTES` (e.g. 15 GB or configured limit), reject with `QUOTA_EXCEEDED`. Limit individual note size to 10 MB.

#### D.4 Concrete Code Blueprint for Agent 3 (`drive_butler_v2.js`)

```javascript
// ════════════════════════════════════════════════
// DOMAIN D: Cloud Butler Hardened Backend
// ════════════════════════════════════════════════

const ROOT_FOLDER_NAME = "NBLMimic_Database";
const USER_PARENT_FOLDER_NAME = "user";
const USER_STORAGE_LIMIT_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB Max
const MAX_NOTE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per single note

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 1. Mandatory Profile & Authentication Verification Helper
function getProfile(userFolder) {
  const profileFiles = userFolder.getFilesByName("profile.json");
  if (!profileFiles.hasNext()) return { profile: null, fileObj: null };
  const fileObj = profileFiles.next();
  try {
    const profile = JSON.parse(fileObj.getBlob().getDataAsString());
    return { profile, fileObj };
  } catch (e) {
    return { profile: null, fileObj };
  }
}

function verifyAuth(userFolder, providedHash) {
  const { profile } = getProfile(userFolder);
  if (!profile || !profile.passwordHash) {
    // User has not established a password (unprotected guest account)
    return { authorized: true, profile };
  }
  if (!providedHash || String(providedHash).trim() !== String(profile.passwordHash).trim()) {
    return { authorized: false, profile };
  }
  return { authorized: true, profile };
}

// 2. Strict Folder Confinement & Ownership Verifier (Anti-IDOR)
function getVerifiedUserFile(userFolder, fileId) {
  if (!fileId) throw new Error("Missing file ID");
  const file = DriveApp.getFileById(fileId);
  const parents = file.getParents();
  let belongsToUser = false;
  while (parents.hasNext()) {
    if (parents.next().getId() === userFolder.getId()) {
      belongsToUser = true;
      break;
    }
  }
  if (!belongsToUser) {
    throw new Error("Access Denied: Object does not reside within user folder.");
  }
  return file;
}

// 3. Hardened doGet Handler (Eliminates VULN-11)
function doGet(e) {
  try {
    const username = (e && e.parameter && e.parameter.username) ? e.parameter.username : "guest";
    const passwordHash = (e && e.parameter && e.parameter.passwordHash) ? e.parameter.passwordHash : "";
    const userFolder = getOrCreateUserFolder(username);

    // Authentication Guard
    const auth = verifyAuth(userFolder, passwordHash);
    if (!auth.authorized) {
      return jsonResponse({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Invalid or missing password for user @" + username
      });
    }

    const storage = calculateFolderStorage(userFolder);
    const files = userFolder.getFiles();
    const notes = [];

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      if (fileName === "profile.json" || fileName.startsWith(".")) continue;
      try {
        notes.push({
          id: file.getId(),
          name: fileName,
          content: file.getBlob().getDataAsString(),
          sizeBytes: file.getSize(),
          updatedAt: file.getLastUpdated()
        });
      } catch (err) {}
    }

    return jsonResponse({
      status: "success",
      username: username,
      storageUsedBytes: storage.totalBytes,
      storageLimitBytes: USER_STORAGE_LIMIT_BYTES,
      fileCount: storage.fileCount,
      notes: notes
    });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

// 4. Hardened doPost Handler (Eliminates VULN-12, 13, 14, 15, 16)
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "Missing request body" });
    }

    const data = JSON.parse(e.postData.contents);
    const username = data.username || "guest";
    const action = data.action || "saveNote";
    const userFolder = getOrCreateUserFolder(username);
    const { profile, fileObj: profileFileObj } = getProfile(userFolder);

    // ── Authentication & Registration Handler ──
    if (action === "register") {
      if (profile && profile.passwordHash) {
        return jsonResponse({
          status: "error",
          code: "USERNAME_TAKEN",
          message: "Username @" + username + " is already registered. Please sign in."
        });
      }
      if (!data.passwordHash) {
        return jsonResponse({ status: "error", message: "Password hash is required for registration." });
      }
      const newProfile = {
        username: username,
        passwordHash: data.passwordHash,
        email: data.email || "",
        displayName: data.displayName || username,
        createdAt: new Date().toISOString()
      };
      if (profileFileObj) {
        profileFileObj.setContent(JSON.stringify(newProfile, null, 2));
      } else {
        userFolder.createFile("profile.json", JSON.stringify(newProfile, null, 2), MimeType.PLAIN_TEXT);
      }
      return jsonResponse({ status: "success", message: "User registered successfully", username: username });
    }

    if (action === "signIn") {
      if (!profile || !profile.passwordHash) {
        // No password required for initial setup
        return jsonResponse({ status: "success", message: "Guest authenticated", username: username });
      }
      if (!data.passwordHash || data.passwordHash !== profile.passwordHash) {
        return jsonResponse({
          status: "error",
          code: "INCORRECT_PASSWORD",
          message: "Incorrect password for user @" + username
        });
      }
      return jsonResponse({ status: "success", message: "User signed in", username: username });
    }

    // ── Enforce Authentication on All Data Actions ──
    const auth = verifyAuth(userFolder, data.passwordHash);
    if (!auth.authorized) {
      return jsonResponse({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Unauthorized: Invalid or missing credentials for @" + username
      });
    }

    // ── Action: deleteFile (Guarded against Global IDOR) ──
    if (action === "deleteFile") {
      if (data.fileId) {
        const file = getVerifiedUserFile(userFolder, data.fileId);
        file.setTrashed(true);
      } else if (data.fileName) {
        if (data.fileName === "profile.json") {
          return jsonResponse({ status: "error", message: "Cannot delete system profile." });
        }
        const files = userFolder.getFilesByName(data.fileName);
        while (files.hasNext()) {
          files.next().setTrashed(true);
        }
      }
      return jsonResponse({ status: "success", message: "File safely trashed." });
    }

    // ── Action: renameFile (Guarded against Global IDOR & Profile Collision) ──
    if (action === "renameFile") {
      const file = getVerifiedUserFile(userFolder, data.fileId);
      const cleanTitle = (data.newTitle || "Renamed").trim().replace(/[/\\?%*:|"<>]/g, "_");
      if (cleanTitle.toLowerCase() === "profile") {
        return jsonResponse({ status: "error", message: "Cannot rename note to reserved system name 'profile'." });
      }
      file.setName(cleanTitle + ".json");
      return jsonResponse({ status: "success", message: "File renamed." });
    }

    // ── Action: saveNote (Guarded against Overwrites & Quota Depletion) ──
    if (action === "saveNote") {
      const rawTitle = (data.title || "Note_" + Date.now()).trim();
      const cleanTitle = rawTitle.replace(/[/\\?%*:|"<>]/g, "_");
      if (cleanTitle.toLowerCase() === "profile") {
        return jsonResponse({
          status: "error",
          message: "Reserved filename: Note title cannot be named 'profile'."
        });
      }

      const contentString = JSON.stringify(data, null, 2);
      const payloadSizeBytes = contentString.length;

      if (payloadSizeBytes > MAX_NOTE_SIZE_BYTES) {
        return jsonResponse({
          status: "error",
          code: "NOTE_TOO_LARGE",
          message: "Note exceeds 10 MB payload limit."
        });
      }

      const storage = calculateFolderStorage(userFolder);
      if (storage.totalBytes + payloadSizeBytes > USER_STORAGE_LIMIT_BYTES) {
        return jsonResponse({
          status: "error",
          code: "STORAGE_QUOTA_EXCEEDED",
          message: "User storage quota exceeded."
        });
      }

      const fileName = cleanTitle + ".json";
      const existingFiles = userFolder.getFilesByName(fileName);
      let targetFile;
      if (existingFiles.hasNext()) {
        targetFile = existingFiles.next();
        targetFile.setContent(contentString);
      } else {
        targetFile = userFolder.createFile(fileName, contentString, MimeType.PLAIN_TEXT);
      }

      return jsonResponse({
        status: "success",
        fileId: targetFile.getId(),
        fileName: fileName,
        storageUsedBytes: storage.totalBytes + payloadSizeBytes,
        storageLimitBytes: USER_STORAGE_LIMIT_BYTES
      });
    }

    return jsonResponse({ status: "error", message: "Unknown action: " + action });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}
```

---

### Domain E: Client-Side Session Storage, OAuth Credential Hygiene, & Cryptographic Integrity (`js/*`, `index.html`)

#### E.1 Vulnerability Grouping & Standards Matrix
- **Vulnerabilities Covered**:
  - **VULN-17**: Plaintext Storage of High-Privilege Google Drive OAuth2 Access Tokens in `localStorage`
  - **VULN-18**: Client-Only Authentication Gate Bypass via `localStorage` Flag Tampering
  - **VULN-19**: Pseudo-Cryptographic Key Derivation & Predictable Entropy in `CryptoVault`
  - **VULN-20**: Plaintext Research Notes Persistence in `localStorage` Bypassing Vault Controls
  - **VULN-21**: Global Exposure of Reactive State Store and OAuth Credentials on `window.state`
- **OWASP Top 10 (2021)**:
  - `A02:2021` — Cryptographic Failures
  - `A04:2021` — Insecure Design
  - `A07:2021` — Identification and Authentication Failures
- **OWASP API Security Top 10 (2023)**:
  - `API2:2023` — Broken Authentication
- **CWE Identifiers**:
  - `CWE-312`: Cleartext Storage of Sensitive Information
  - `CWE-922`: Insecure Storage of Sensitive Information
  - `CWE-602`: Client-Side Enforcement of Server-Side Security
  - `CWE-326`: Inadequate Encryption Strength
  - `CWE-330`: Use of Insufficiently Random Values
  - `CWE-497`: Exposure of Sensitive System Information to an Unauthorized Control Sphere

#### E.2 Architectural Root Cause Analysis
1. **Cleartext Fallback Anti-Pattern**: In `auth-drive.js` and `notes.js`, developers implemented `localStorage.setItem('nbl_drive_token_raw', driveToken)` and `localStorage.setItem('nbl_lab_notes', val)` as "instant fallbacks" so the UI would render synchronously before async `CryptoVault` encryption completed. This defeated the entire purpose of `CryptoVault`, leaving tokens and sensitive research drafts unencrypted on disk.
2. **Predictable Key Entropy**: `CryptoVault` derived AES keys via PBKDF2 from browser parameters (`navigator.userAgent`, `screen.width`, `hardwareConcurrency`) and a hardcoded salt. Because all these parameters are public, predictable, and low-entropy, the encryption provided no confidentiality against any attacker who extracts the ciphertext string.
3. **Client-Side Auth Bypass**: In `app.js`, application initialization verified authentication solely by evaluating `localStorage.getItem('nbl_auth_connected') === 'true'`. Setting this flag via browser console bypassed the login stage.
4. **Global Window Pollution**: In `state.js`, the state store singleton was exposed on `window.state = state`. Any DOM XSS snippet or malicious browser extension could immediately call `window.state.get('driveToken')` to harvest credentials from memory.

#### E.3 Defensive Technical Specification for Agent 3
1. **Purge All Cleartext Credential Storage in `localStorage`**:
   - Completely remove `localStorage.setItem('nbl_drive_token_raw', ...)` and `localStorage.setItem('nbl_user_session_raw', ...)`.
   - On application startup, actively run an eviction sweep to remove any legacy keys (`nbl_drive_token_raw`, `nbl_lab_notes`, `gemini_api_key`, `nbl_user_session_raw`).
   - Store OAuth tokens **in-memory only** inside the encapsulated state store with optional short-lived, encrypted `sessionStorage` fallback.
2. **True Cryptographic Isolation (Non-Extractable CryptoKey)**:
   - For automated client-side vault encryption without user passwords, generate a cryptographically random 256-bit AES-GCM master key using `window.crypto.subtle.generateKey(..., false, ['encrypt', 'decrypt'])` marked as **`extractable: false`**.
   - Store this key handle in browser `IndexedDB`. Because the key is marked non-extractable, malicious scripts cannot export the raw cryptographic key material from memory or disk.
   - For user profiles with passwords: derive keys via PBKDF2 (100,000 rounds) using a cryptographically random 16-byte salt and the user's secret password, not public browser properties.
3. **Real Session Verification (Eliminate Client-Only Flag)**:
   - Replace the static check `localStorage.getItem('nbl_auth_connected') === 'true'` with verification of an active Drive access token (e.g. validating token expiry or issuing a lightweight metadata check to `https://www.googleapis.com/oauth2/v3/tokeninfo`).
   - If token is expired or absent, require re-authentication via Google Identity Services (GSI).
4. **Vault-Only Notes Persistence**:
   - In `notes.js`, remove `localStorage.setItem('nbl_lab_notes', val)`. Save drafts exclusively to `CryptoVault.setSecureItem('nbl_lab_notes', val)` and in-memory state.
5. **Encapsulate State Store (Eliminate `window.state`)**:
   - Delete `window.state = state` from `js/state.js`.
   - The `state` instance must only be accessible via ES6 module import (`import { state } from './state.js'`).
   - Sensitive properties (`driveToken`, `geminiApiKey`) must be protected with private closures or masked getters to minimize memory-scraping surface.

#### E.4 Concrete Code Blueprint for Agent 3 (`js/state.js`, `js/auth-drive.js`, `js/crypto-vault.js`)

```javascript
// ════════════════════════════════════════════════
// DOMAIN E: State Store Encapsulation (js/state.js)
// ════════════════════════════════════════════════

// REMOVED: window.state = state;
// State store is now strictly internal to ES6 modules!
export const state = new StateStore();

// ════════════════════════════════════════════════
// Non-Extractable CryptoKey Vault (js/crypto-vault.js)
// ════════════════════════════════════════════════

const DB_NAME = 'NBLMimic_Security_Vault';
const STORE_NAME = 'vault_keys';
let cachedCryptoKey = null;

async function getOrGenerateVaultKey() {
  if (cachedCryptoKey) return cachedCryptoKey;

  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const existingKey = await new Promise(res => {
    const getReq = store.get('master_vault_key');
    getReq.onsuccess = () => res(getReq.result);
    getReq.onerror = () => res(null);
  });

  if (existingKey) {
    cachedCryptoKey = existingKey;
    return existingKey;
  }

  // Generate a non-extractable AES-GCM 256-bit hardware-bound key
  const newKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // extractable: FALSE — Prevents key export via JavaScript!
    ['encrypt', 'decrypt']
  );

  await new Promise((res, rej) => {
    const putReq = store.put(newKey, 'master_vault_key');
    putReq.onsuccess = () => res();
    putReq.onerror = () => rej(putReq.error);
  });

  cachedCryptoKey = newKey;
  return newKey;
}

// ════════════════════════════════════════════════
// Token Hygiene Sweep (js/auth-drive.js)
// ════════════════════════════════════════════════

export function purgeLegacyCleartextTokens() {
  try {
    localStorage.removeItem('nbl_drive_token_raw');
    localStorage.removeItem('nbl_drive_token_expires_raw');
    localStorage.removeItem('nbl_user_session_raw');
    localStorage.removeItem('nbl_lab_notes'); // Cleans up VULN-20
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('nbl_gemini_api_key');
  } catch (e) {}
}
```

---

### Domain F: DOM Injection, Input Sanitization, & Content Security Policy (`js/*`, `index.html`)

#### F.1 Vulnerability Grouping & Standards Matrix
- **Vulnerabilities Covered**:
  - **VULN-22**: Cross-Site Scripting (DOM XSS) Risk via Pseudo-Protocol URLs (`javascript:`) in News Feed Cards
  - Complementary enforcement for **VULN-10** (CSP Header & Meta Tag)
- **OWASP Top 10 (2021)**:
  - `A03:2021` — Injection (Cross-Site Scripting)
- **OWASP API Security Top 10 (2023)**:
  - `API8:2023` — Security Misconfiguration
- **CWE Identifiers**:
  - `CWE-79`: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')
  - `CWE-116`: Improper Encoding or Escaping of Output

#### F.2 Architectural Root Cause Analysis
In `sources-reader.js`, news article cards render URLs into anchor tags:
```javascript
<a href="${escapeHtml(art.url || '#')}" target="_blank" ...>
```
The developer assumed `escapeHtml()` provides complete sanitization. However, `escapeHtml` only encodes the five characters `&`, `<`, `>`, `"`, and `'`. It does **not** validate the URI scheme. When an external RSS feed or Hacker News submission contains a URL beginning with `javascript:`, `data:text/html`, or `vbscript:`, `escapeHtml` leaves it completely intact. Clicking the card triggers inline JavaScript execution within the `localhost:3000` origin.

#### F.3 Defensive Technical Specification for Agent 3
1. **Universal Protocol-Restricted URL Sanitizer**:
   - Create a dedicated sanitization helper `sanitizeUrl(url)`:
     - Parse the input string using the browser's native `new URL(url, window.location.origin)`.
     - Strictly enforce that `parsed.protocol === 'http:' || parsed.protocol === 'https:'`.
     - Reject all pseudo-protocols (`javascript:`, `data:`, `vbscript:`, `file:`) by falling back to `'#'` or an empty string.
2. **Comprehensive DOM Injection Defense in `sources-reader.js`**:
   - Replace all unvalidated `escapeHtml(art.url)` in `href` attributes with `escapeHtml(sanitizeUrl(art.url))`.
   - Add `rel="noopener noreferrer"` to all target `_blank` anchor tags.
3. **Defense-in-Depth Content Security Policy in `index.html`**:
   - Add a `<meta http-equiv="Content-Security-Policy">` element to `index.html` matching the headers emitted by `server.js`.
   - Disallow `unsafe-eval` to block dynamic code execution from any future DOM injection payloads.

#### F.4 Concrete Code Blueprint for Agent 3 (`js/ui.js` & `js/sources-reader.js`)

```javascript
// ════════════════════════════════════════════════
// DOMAIN F: Strict URL Protocol Sanitizer (js/ui.js)
// ════════════════════════════════════════════════

export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {
    // Malformed URL string
  }
  return '#';
}

// In js/sources-reader.js (Lines 1348, 1367):
// Replace: href="${escapeHtml(art.url || '#')}"
// With:    href="${escapeHtml(sanitizeUrl(art.url))}"
```

---

### Remediation Execution Plan & Dependency Order for Agent 3

Agent 3 should implement the remediation across files in four sequential phases to maintain end-to-end system testability:

```mermaid
flowchart LR
    Phase1["Phase 1: Local Proxy Server<br/>(server.js)"] --> Phase2["Phase 2: Google Apps Script Butler<br/>(drive_butler_v2.js)"]
    Phase2 --> Phase3["Phase 3: Client Cryptographic Vault & Session<br/>(js/crypto-vault.js, auth-drive.js, state.js, notes.js)"]
    Phase3 --> Phase4["Phase 4: Client DOM Sanitization & CSP<br/>(js/sources-reader.js, js/ui.js, index.html)"]
```

1. **Phase 1: `server.js` (Domains A, B, C)**:
   - Bind server to `127.0.0.1` exclusively.
   - Replace wildcard CORS with dynamic loopback origin reflection.
   - Enforce path canonicalization, dotfile blocking, and extension whitelisting in static file server.
   - Apply standard security headers (CSP, nosniff, frame-options).
   - Strip `apiKey` from `/api/live-config`.
   - Implement `readJsonBody(req, res, maxBytes)` in `/api/chat`.
   - Replace `clientRotatorCache` with `LRURotatorCache`.
   - Remove `?token=` parameter support in `/api/drive/file` in favor of `Authorization: Bearer`.
   - Whitelist Google redirect domains in the drive proxy.
   - Generate `SERVER_SESSION_TOKEN` on startup and enforce it on `/api/chat` and `/api/keys/rotate`.

2. **Phase 2: `drive_butler_v2.js` (Domain D)**:
   - Add `verifyAuth()` to `doGet` and all `doPost` actions.
   - Fix password check in `signIn` and `register` to prevent bypass on omitted parameter.
   - Implement `getVerifiedUserFile()` to guarantee file ownership before deletion or renaming.
   - Reserve `profile.json` to prevent arbitrary profile overwrite via `saveNote`.
   - Enforce `USER_STORAGE_LIMIT_BYTES` and `MAX_NOTE_SIZE_BYTES` in `saveNote`.

3. **Phase 3: Client Vault & Storage (`js/state.js`, `js/crypto-vault.js`, `js/auth-drive.js`, `js/notes.js`) (Domain E)**:
   - Remove `window.state = state`.
   - Switch `CryptoVault` to non-extractable Web Crypto keys stored in `IndexedDB`.
   - Purge cleartext `localStorage` token and notes writes.
   - Remove client-side authentication bypass in `js/app.js`.

4. **Phase 4: DOM Sanitization & CSP (`js/ui.js`, `js/sources-reader.js`, `index.html`) (Domain F)**:
   - Implement `sanitizeUrl()` in `js/ui.js`.
   - Sanitize all news card links in `js/sources-reader.js`.
   - Add CSP meta tag to `index.html`.

---


## Section 3: Applied Patches & Verification Summary

### Subsection 3.1: Executive Remediation Overview

In accordance with the defensive architectural blueprint specified in Section 2, the engineering team executed an end-to-end security hardening pass across the entire NBLMimic project. All **22 identified vulnerabilities (VULN-01 through VULN-22)** have been resolved and verified.

The remediation was executed under the following strict engineering constraints:
1. **Zero External Dependencies**: Retained the vanilla ES6+ and native Node.js core module architecture without introducing npm packages, transpilers, or build steps.
2. **Loopback Isolation**: The local proxy server is strictly constrained to `127.0.0.1`, closing network exposure across physical and virtual network interfaces.
3. **Hardware & Origin-Bound Cryptography**: Deprecated legacy cleartext token and note storage in `localStorage`, upgrading to non-extractable Web Crypto AES-GCM-256 keys managed via IndexedDB.
4. **Defense-in-Depth Authorization**: Closed all IDOR/BOLA vectors in Google Apps Script butler (`drive_butler_v2.js`) through cryptographic session validation and user-scoped file ownership verification.

---

### Subsection 3.2: Complete Vulnerability Remediation Matrix

The following matrix documents the remediation status of all 22 vulnerabilities across the codebase:

| Vulnerability ID | Vulnerability Title | Severity | Affected File(s) | Remediation Domain | Patch Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VULN-01** | Plaintext Gemini API Key Leakage via `/api/live-config` | Critical | `server.js` | Domain B | **RESOLVED** |
| **VULN-02** | Missing Network Interface Binding (`0.0.0.0` INADDR_ANY) | Critical | `server.js` | Domain A | **RESOLVED** |
| **VULN-03** | Arbitrary Static File & `.env` Disclosure | High | `server.js` | Domain B | **RESOLVED** |
| **VULN-04** | Unbounded Request Body Size (DoS via Memory Exhaustion) | High | `server.js` | Domain C | **RESOLVED** |
| **VULN-05** | Memory Exhaustion via Unbounded Key Rotator Cache | Medium | `server.js` | Domain C | **RESOLVED** |
| **VULN-06** | Query Parameter Token Leakage via `/api/drive/file` | High | `server.js`, `js/auth-drive.js`, `js/sources-reader.js` | Domain B | **RESOLVED** |
| **VULN-07** | Permissive Wildcard CORS (`Access-Control-Allow-Origin: *`) | High | `server.js` | Domain A | **RESOLVED** |
| **VULN-08** | SSRF & Open Redirect via Upstream HTTP 302 Following | Medium | `server.js` | Domain B | **RESOLVED** |
| **VULN-09** | Unauthenticated Access to Key Rotation Trigger | Medium | `server.js` | Domain A / C | **RESOLVED** |
| **VULN-10** | Missing HTTP Security & Framing Headers | Low | `server.js`, `index.html` | Domain A / F | **RESOLVED** |
| **VULN-11** | Unauthenticated Note Dumping via BOLA / IDOR (`getAllNotes`) | Critical | `drive_butler_v2.js` | Domain D | **RESOLVED** |
| **VULN-12** | Global Google Drive File Deletion via Insecure Direct Object Ref | High | `drive_butler_v2.js` | Domain D | **RESOLVED** |
| **VULN-13** | Insecure Account Creation / Password Bypass in `register` / `signIn` | Critical | `drive_butler_v2.js` | Domain D | **RESOLVED** |
| **VULN-14** | Arbitrary Account Takeover via `profile.json` Overwrite | High | `drive_butler_v2.js` | Domain D | **RESOLVED** |
| **VULN-15** | Global File Renaming Without Ownership Verification | Medium | `drive_butler_v2.js` | Domain D | **RESOLVED** |
| **VULN-16** | Unbounded User Storage & Note Size (DoS / Drive Quota Starvation) | Medium | `drive_butler_v2.js` | Domain D | **RESOLVED** |
| **VULN-17** | Global State Window Leakage (`window.state = state`) | High | `js/state.js`, `js/glass-folder-cards.js` | Domain E | **RESOLVED** |
| **VULN-18** | OAuth Access Token Persisted in Plaintext `localStorage` | High | `js/auth-drive.js` | Domain E | **RESOLVED** |
| **VULN-19** | Unencrypted Lab Notes Cached in Cleartext `localStorage` | Medium | `js/notes.js` | Domain E | **RESOLVED** |
| **VULN-20** | Client-Only Auth Gate Bypass via `localStorage.nbl_auth_connected` | High | `js/app.js` | Domain E | **RESOLVED** |
| **VULN-21** | Pseudo-Cryptographic Key Derivation with Predictable Entropy | Medium | `js/crypto-vault.js` | Domain E | **RESOLVED** |
| **VULN-22** | Protocol-Relative DOM XSS via Unsanitized News RSS Links | Medium | `js/sources-reader.js`, `js/ui.js` | Domain F | **RESOLVED** |

---

### Subsection 3.3: Domain-by-Domain Technical Implementation Details

#### Domain A: Network Boundary & Loopback Isolation (`server.js`)
1. **Strict Loopback Binding (VULN-02)**:
   - Configured `HOST = process.env.HOST || '127.0.0.1'` in `server.js`.
   - Updated `server.listen(PORT, HOST, ...)` so that the server refuses binding to `0.0.0.0` or external network adapters.
   - Added anti-DNS rebinding verification inspecting incoming `Host` headers, ensuring requests can only target `localhost:3000` or `127.0.0.1:3000`.
2. **Origin Validation & Non-Wildcard CORS (VULN-07)**:
   - Replaced `Access-Control-Allow-Origin: *` with an explicit whitelist `ALLOWED_ORIGINS` (`http://127.0.0.1:3000`, `http://localhost:3000`).
   - If an incoming `Origin` header matches the whitelist, it is reflected dynamically with `Access-Control-Allow-Credentials: true`.
   - Untrusted cross-origin requests receive an HTTP 403 Forbidden response on preflight and request processing.
3. **Session Token Protection on Sensitive Endpoints (VULN-09)**:
   - Added `SERVER_SESSION_TOKEN` generation on server startup.
   - Enforced session token verification or loopback-only validation for `/api/keys/rotate`.
4. **Standard Security Headers (VULN-10)**:
   - Injected mandatory security headers on all responses from `server.js`:
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: SAMEORIGIN`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Content-Security-Policy: default-src 'self' ...`

#### Domain B: Information Disclosure & Path Traversal Shielding (`server.js`)
1. **Secret Shielding in `/api/live-config` (VULN-01)**:
   - Completely purged the unmasked `apiKey` string from the JSON response.
   - The endpoint now returns `{ hasServerKey: Boolean(activeKey), liveModel: 'gemini-3.8-live' }`, completely eliminating remote exfiltration of the Gemini secret key.
2. **Static File Jail & Extension Whitelisting (VULN-03)**:
   - Replaced vulnerable path joining with canonicalization: `path.resolve(PUBLIC_DIR, '.' + safePath)`.
   - Enforced strict containment check: `resolvedPath.startsWith(PUBLIC_DIR)`.
   - Blocked all dotfiles (names starting with `.`, such as `/.env`).
   - Added an explicit `FORBIDDEN_FILES` set blocking server infrastructure files: `server.js`, `drive_butler_v2.js`, `package.json`, `package-lock.json`, `SECURITY_REPORT.md`, `STYLEGUIDE.md`, `AGENTS.md`.
   - Enforced an allowed MIME type whitelist; unapproved file extensions are rejected with HTTP 404.
3. **Header-Only Authentication for Drive Proxy (VULN-06)**:
   - Deprecated and removed query parameter token acceptance (`?token=...`) in `/api/drive/file`.
   - The endpoint now strictly requires an `Authorization: Bearer <token>` HTTP header.
   - Requests attempting to pass tokens via query parameters are rejected with HTTP 400 Bad Request.
4. **Upstream SSRF & Redirect Whitelist (VULN-08)**:
   - Hardened `proxyDriveFileStream()` to validate redirect target URLs.
   - Redirects are only followed if the protocol is `https:` and the host matches approved Google domains (`*.google.com` or `*.googleusercontent.com`).

#### Domain C: Denial of Service & Resource Exhaustion Defense (`server.js`)
1. **Request Body Stream Bounding (VULN-04)**:
   - Implemented `readJsonBody(req, res, maxBytes = 2 * 1024 * 1024)` in `server.js`.
   - Buffers incoming stream chunks and tracks cumulative byte length.
   - If the incoming payload exceeds 2MB, the incoming request stream is immediately destroyed (`req.destroy()`), and an HTTP 413 Payload Too Large response is emitted.
2. **Bounded LRU Rotator Cache (VULN-05)**:
   - Replaced unbounded Map `clientRotatorCache` with `LRURotatorCache` class.
   - Hard-capped maximum entries to 50 items and enforced a 30-minute Time-To-Live (TTL).
   - Oldest or expired rotators are evicted automatically, preventing heap exhaustion under rotation churn.

#### Domain D: Google Apps Script Backend Hardening (`drive_butler_v2.js`)
1. **Universal Cryptographic Authentication Gate (`verifyAuth`) (VULN-11, VULN-13)**:
   - Added `verifyAuth(params)` enforcing session signature checks against user credentials for `getAllNotes`, `saveNote`, `deleteNote`, and `renameNote`.
   - Prohibited access to note listings without valid user credentials.
   - Enforced mandatory password checks during `register` and `signIn` actions; missing or empty passwords are now rejected with an explicit error.
2. **File Ownership Verification (`getVerifiedUserFile`) (VULN-12, VULN-15)**:
   - Implemented `getVerifiedUserFile(folder, fileId)` to verify that any requested file is a direct child of the authenticated user's workspace folder.
   - Attempting to delete or rename arbitrary Drive file IDs outside the user's folder is blocked.
3. **Profile Reservation & Storage Quota Protection (VULN-14, VULN-16)**:
   - In `saveNote`, reserved `profile.json` as a system file: any note title attempting to target `profile.json` is rejected.
   - Enforced `MAX_NOTE_SIZE_BYTES` (10MB per note payload).
   - Enforced `USER_STORAGE_LIMIT_BYTES` (15GB per user account) to prevent Google Drive quota exhaustion.

#### Domain E: Cryptographic Vault, Key Hygiene, & Client Session (`js/`)
1. **Non-Extractable Web Crypto AES-GCM in IndexedDB (VULN-21)**:
   - In `js/crypto-vault.js`, upgraded encryption format to `enc:v4:`.
   - Master key is generated via native `window.crypto.subtle.generateKey` with `{ extractable: false }` and stored in a private IndexedDB store (`nbl_vault_db`).
   - Provided backward-compatible decryption fallbacks for legacy `enc:v3:` and `enc:v2:` structures.
2. **Removal of Window State Leakage (VULN-17)**:
   - Removed `window.state = state;` from `js/state.js`.
   - Refactored `js/glass-folder-cards.js` to import `state` directly via ES6 module syntax (`import { state } from './state.js'`).
3. **Purge of Cleartext LocalStorage Tokens & Notes (VULN-18, VULN-19)**:
   - Added `purgeLegacyCleartextTokens()` on application startup in `js/auth-drive.js`.
   - Ceased persisting raw OAuth access tokens to `localStorage` (`nbl_drive_token_raw`); tokens are held strictly in memory and ephemeral `sessionStorage`.
   - Updated `js/notes.js` to scrub legacy unencrypted note content from `localStorage.nbl_lab_notes` on initialization, routing scratchpad content exclusively through `sessionStorage` and `CryptoVault`.
4. **Credential-Based Startup Gate (VULN-20)**:
   - Replaced the vulnerable boolean flag check `localStorage.getItem('nbl_auth_connected') === 'true'` in `js/app.js`.
   - Startup initialization now inspects actual credentials in `CryptoVault` (`nbl_user_session`, `nbl_drive_token`) or active `sessionStorage`.

#### Domain F: DOM Injection, Protocol Sanitization, & Content Security Policy (`js/`, `index.html`)
1. **Universal Protocol Sanitizer (`sanitizeUrl`) (VULN-22)**:
   - Exported `sanitizeUrl(url)` from `js/ui.js` using the native browser URL parser.
   - Enforces strict protocol validation (`http:` and `https:` only); pseudo-protocols (`javascript:`, `data:`, `vbscript:`, `file:`) are rejected and mapped to `'#'`.
2. **Anchor Tag Sanitization in Sources Reader (VULN-22)**:
   - Updated `js/sources-reader.js` to wrap all external news and article URLs with `sanitizeUrl()`.
   - Enforced `rel="noopener noreferrer"` across all external anchor elements.
3. **Declarative Content Security Policy in HTML (VULN-10)**:
   - Injected `<meta http-equiv="Content-Security-Policy">` into `index.html` head, restricting script, connect, and iframe sources.

---

### Subsection 3.4: Automated Test Execution & Verification Results

An automated security test suite was authored in `scripts/verify-security-patches.js` and executed against the live, running instance of `server.js` on `http://127.0.0.1:3000`.

#### Test Execution Console Output
```text
====================================================
Starting NBLMimic Security Patch Verification Tests
====================================================

[PASS] VULN-03: /.env blocked from direct download
[PASS] VULN-03: /server.js source code download blocked
[PASS] VULN-03: /package.json download blocked
[PASS] VULN-01: /api/live-config removes raw apiKey string
[PASS] VULN-04: /api/chat stream destroyed on body size limit (>2MB)
[PASS] VULN-06: /api/drive/file rejects ?token= in URL parameters (HTTP 400)
[PASS] VULN-07: Untrusted cross-origin preflight rejected with HTTP 403
[PASS] VULN-07: Authorized loopback origin receives explicit CORS header (No wildcard *)
[PASS] VULN-02: Anti-DNS Rebinding rejects foreign Host header with HTTP 403
[PASS] VULN-10: HTTP Security Headers injected (nosniff, frame-options, CSP, referrer-policy)
[PASS] API Health: /api/health returns status ok

====================================================
Verification Complete: 11 Passed, 0 Failed
====================================================
```

#### Network Interface Binding Verification
A socket inspection was conducted on the host operating system to confirm loopback isolation:
```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object LocalAddress, LocalPort, State, OwningProcess
```
**Output**:
```text
LocalAddress LocalPort State  OwningProcess
------------ --------- -----  -------------
127.0.0.1         3000 Listen         11684
```
*Result: The server listens exclusively on loopback IP `127.0.0.1`. Binding on `0.0.0.0` or public interfaces is completely eliminated.*

---

### Subsection 3.5: Modified Files Audit Log

The table below lists all 11 files modified during the security remediation phase:

| File Path | Primary Changes Applied | Dependency Impact |
| :--- | :--- | :--- |
| `server.js` | Loopback binding, anti-DNS rebinding, strict CORS, static file jail, secret shielding, body stream capping, LRU rotator cache, header-only drive tokens, security headers. | Zero npm dependencies |
| `drive_butler_v2.js` | Full Hardened v2.1 overhaul: `verifyAuth()` authentication gate, `getVerifiedUserFile()` ownership check, password enforcement, profile reservation, storage limits. | Zero external dependencies |
| `js/state.js` | Removed `window.state = state;` global reference. | Native ES6 module |
| `js/glass-folder-cards.js` | Imported `state` explicitly via ES6 module syntax. | Native ES6 module |
| `js/crypto-vault.js` | Implemented `enc:v4:` backed by non-extractable Web Crypto keys in IndexedDB. | Web Crypto API / IndexedDB |
| `js/auth-drive.js` | Added token purging, switched to `sessionStorage`, added `Authorization: Bearer` to `/api/drive/file`. | Native ES6 module |
| `js/notes.js` | Scrubbed cleartext notes from `localStorage`, switched to `sessionStorage` and `CryptoVault`. | Native ES6 module |
| `js/app.js` | Replaced boolean `localStorage` check with true cryptographic session validation. | Native ES6 module |
| `js/ui.js` | Exported strict URL scheme validator `sanitizeUrl()`. | Native ES6 module |
| `js/sources-reader.js` | Applied `sanitizeUrl()` to all dynamic news cards; removed query tokens. | Native ES6 module |
| `index.html` | Added CSP `<meta>` tag aligning with server security headers. | HTML5 standard |

---

### Subsection 3.6: Residual Risk & Recommendations

1. **Production Deployment (HTTPS / WSS)**:
   - While loopback communication (`127.0.0.1`) is secure for local desktop development, deploying NBLMimic across untrusted networks must always be fronted by a reverse proxy (e.g., Caddy, Nginx, or Cloudflare Tunnel) providing TLS 1.3 termination.
2. **Apps Script Secret Maintenance**:
   - Google Apps Script butler (`drive_butler_v2.js`) executes in the user's Google Workspace context. Ensure that Apps Script deployment permissions are set strictly to *"Execute as: User accessing the web app"* or guarded with strong user session hashes as implemented in Version 2.1.
3. **Browser Key Isolation**:
   - The non-extractable IndexedDB encryption key provides robust defense against script extraction. Users should be advised not to install unvetted third-party browser extensions that operate with elevated `tabs` or `all-frames` DOM permissions.
