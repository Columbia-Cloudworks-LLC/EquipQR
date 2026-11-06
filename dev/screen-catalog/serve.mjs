#!/usr/bin/env node
/**
 * Serve the screen catalog gallery on http://127.0.0.1:4178 so the browser
 * treats it as a real origin (copying images to the clipboard is blocked on file://).
 *
 *   node dev/screen-catalog/serve.mjs [catalogDir] [--port 4178]
 */
import fs from 'fs';
import http from 'http';
import path from 'path';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 4178;
const positional = args.filter((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--port');
const root = path.resolve(positional[0] || process.env.SCREEN_CATALOG_OUT || 'tmp/screen-catalog/pixel-7');

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`No gallery at ${root}/index.html. Run npm run screens:capture (or screens:gallery) first.`);
  process.exit(1);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const file = path.resolve(root, `.${urlPath === '/' ? '/index.html' : urlPath}`);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) {
        res.writeHead(404).end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      fs.createReadStream(file).pipe(res);
    });
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`Screen catalog: http://127.0.0.1:${port}/  (serving ${root})`);
  });
