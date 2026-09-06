import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

export function startFixtureServer({ host = '127.0.0.1', port = 8790 } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url || '/', `http://${host}:${port}`).pathname;
      const relative = pathname === '/' ? 'bbc-like.html' : pathname.replace(/^\/+/, '');
      const file = path.resolve(root, relative);
      if (!file.startsWith(`${root}${path.sep}`) && file !== path.join(root, 'bbc-like.html')) {
        res.writeHead(403).end('Forbidden'); return;
      }
      const body = await fs.readFile(file);
      const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream';
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      resolve({ server, url: `http://${host}:${actualPort}/bbc-like.html`, port: actualPort });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await startFixtureServer();
  console.log(`VizLens fixtures: ${url}`);
}
