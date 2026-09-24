/** Sert uniquement la page de relecture sur la machine locale. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'], '/donnees.js': ['donnees.js', 'text/javascript'] };
http.createServer((request, response) => {
  const file = files[new URL(request.url, 'http://127.0.0.1').pathname];
  if (!file || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-store' });
  response.end(request.method === 'HEAD' ? undefined : fs.readFileSync(path.join(__dirname, file[0])));
}).listen(4178, '127.0.0.1', () => console.log('Relecture : http://127.0.0.1:4178'));
