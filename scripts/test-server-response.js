const http = require('http');

http.get('http://127.0.0.1:3000/js/app.js', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Cache-Control:', res.headers['cache-control']);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Contains folders startup:', data.includes("state.set('viewMode', 'folders')"));
  });
});
