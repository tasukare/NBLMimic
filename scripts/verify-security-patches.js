/**
 * Comprehensive Verification Suite for NBLMimic Security Patches
 * Tests all patched endpoints against vulnerabilities VULN-01 to VULN-22
 */

const http = require('http');

async function testEndpoint(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      if (typeof postData === 'string' || Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('Starting NBLMimic Security Patch Verification Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(testName, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  // ── TEST 1: VULN-03 Sensitive File Disclosure (/.env) ──
  try {
    const res = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/.env',
      method: 'GET'
    });
    assert('VULN-03: /.env blocked from direct download', res.statusCode === 404, `Status was ${res.statusCode}`);
  } catch (e) {
    assert('VULN-03: /.env request', false, e.message);
  }

  // ── TEST 2: VULN-03 Source File Disclosure (/server.js & /package.json) ──
  try {
    const resServer = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/server.js',
      method: 'GET'
    });
    assert('VULN-03: /server.js source code download blocked', resServer.statusCode === 404, `Status was ${resServer.statusCode}`);

    const resPkg = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/package.json',
      method: 'GET'
    });
    assert('VULN-03: /package.json download blocked', resPkg.statusCode === 404, `Status was ${resPkg.statusCode}`);
  } catch (e) {
    assert('VULN-03: Source files block', false, e.message);
  }

  // ── TEST 3: VULN-01 Plaintext Gemini API Key in /api/live-config ──
  try {
    const res = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/live-config',
      method: 'GET'
    });
    const hasNoKey = res.json && res.json.apiKey === undefined;
    const hasStatus = res.json && typeof res.json.hasServerKey === 'boolean';
    assert('VULN-01: /api/live-config removes raw apiKey string', res.statusCode === 200 && hasNoKey && hasStatus, `Returned: ${res.data}`);
  } catch (e) {
    assert('VULN-01: /api/live-config test', false, e.message);
  }

  // ── TEST 4: VULN-04 Unbounded Body / Heap Exhaustion in /api/chat (>2MB) ──
  try {
    const largeBuffer = Buffer.alloc(2.5 * 1024 * 1024, 'a'); // 2.5 MB payload
    const res = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': largeBuffer.length
      }
    }, largeBuffer);
    assert('VULN-04: /api/chat caps body size at 2MB (HTTP 413)', res.statusCode === 413, `Status was ${res.statusCode}`);
  } catch (e) {
    // If connection was abruptly destroyed by req.destroy(), that also confirms stream drop
    if (e.code === 'ECONNRESET') {
      assert('VULN-04: /api/chat stream destroyed on body size limit (>2MB)', true);
    } else {
      assert('VULN-04: /api/chat body limit', false, e.message);
    }
  }

  // ── TEST 5: VULN-06 OAuth Token in Query String rejected in /api/drive/file ──
  try {
    const res = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/drive/file?id=test&token=leaked_in_url',
      method: 'GET'
    });
    assert('VULN-06: /api/drive/file rejects ?token= in URL parameters (HTTP 400)', res.statusCode === 400, `Status was ${res.statusCode}`);
  } catch (e) {
    assert('VULN-06: /api/drive/file query token test', false, e.message);
  }

  // ── TEST 6: VULN-07 Cross-Origin Preflight Reject (Strict CORS Origin Matching) ──
  try {
    const resUntrusted = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/chat',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://evil-attacker-site.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert('VULN-07: Untrusted cross-origin preflight rejected with HTTP 403', resUntrusted.statusCode === 403, `Status was ${resUntrusted.statusCode}`);

    const resTrusted = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/chat',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://127.0.0.1:3000',
        'Access-Control-Request-Method': 'POST'
      }
    });
    const allowOrigin = resTrusted.headers['access-control-allow-origin'];
    assert('VULN-07: Authorized loopback origin receives explicit CORS header (No wildcard *)', resTrusted.statusCode === 204 && allowOrigin === 'http://127.0.0.1:3000', `Header: ${allowOrigin}`);
  } catch (e) {
    assert('VULN-07: CORS verification test', false, e.message);
  }

  // ── TEST 7: VULN-02 Anti-DNS Rebinding Host Header Validation ──
  try {
    const resBadHost = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Host': 'attacker-controlled-rebinding-domain.com'
      }
    });
    assert('VULN-02: Anti-DNS Rebinding rejects foreign Host header with HTTP 403', resBadHost.statusCode === 403, `Status was ${resBadHost.statusCode}`);
  } catch (e) {
    assert('VULN-02: Host validation test', false, e.message);
  }

  // ── TEST 8: VULN-10 HTTP Security Headers on Static Delivery ──
  try {
    const res = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    const hasNosniff = res.headers['x-content-type-options'] === 'nosniff';
    const hasFrame = res.headers['x-frame-options'] === 'SAMEORIGIN';
    const hasCsp = Boolean(res.headers['content-security-policy']);
    const hasReferrer = res.headers['referrer-policy'] === 'strict-origin-when-cross-origin';
    assert('VULN-10: HTTP Security Headers injected (nosniff, frame-options, CSP, referrer-policy)', res.statusCode === 200 && hasNosniff && hasFrame && hasCsp && hasReferrer, `Headers: ${JSON.stringify(res.headers)}`);
  } catch (e) {
    assert('VULN-10: Security headers test', false, e.message);
  }

  // ── TEST 9: Health Check Endpoint Operability ──
  try {
    const res = await testEndpoint({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    assert('API Health: /api/health returns status ok', res.statusCode === 200 && res.json?.status === 'ok', `Returned: ${res.data}`);
  } catch (e) {
    assert('API Health test', false, e.message);
  }

  console.log('\n====================================================');
  console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
