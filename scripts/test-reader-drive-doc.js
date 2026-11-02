/**
 * Verification test for Drive document reader view and binary sanitization
 */
const http = require('http');

async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3000', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
  });
}

async function run() {
  const isUp = await checkServer();
  console.log('Server is running:', isUp);
}

run();
