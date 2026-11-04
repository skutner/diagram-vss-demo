// serve_docs.mjs: a static server for docs/ (native Node, Range requests, the MIME types the demo needs), for local browser checks of
// the Qwen3 reader. Usage: node training/qwen/serve_docs.mjs [port] [root]   (default 8766, docs/). Not used by the site.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const port = +process.argv[2] || 8766, root = path.resolve(process.argv[3] || 'docs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.jinja': 'text/plain; charset=utf-8' };
/** extra: {'/url/path': '/absolute/file'} served besides the root (a local copy of the model for browser checks) */
export function serve(p = port, r = root, extra = {}) {
  return http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let f = extra[u.pathname] || path.join(r, decodeURIComponent(u.pathname));
    if (!extra[u.pathname] && !f.startsWith(r)) { res.writeHead(403).end(); return; }
    fs.stat(f, (e, st) => {
      if (!e && st.isDirectory()) { f = path.join(f, 'index.html'); try { st = fs.statSync(f); } catch (x) { e = x; } }
      if (e) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
      const h = { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (m) { const s = m[1] ? +m[1] : st.size - +m[2], end = m[1] && m[2] ? +m[2] : st.size - 1; res.writeHead(206, Object.assign(h, { 'Content-Range': `bytes ${s}-${end}/${st.size}`, 'Content-Length': end - s + 1 })); if (req.method === 'HEAD') return res.end(); fs.createReadStream(f, { start: s, end }).pipe(res); return; }
      res.writeHead(200, Object.assign(h, { 'Content-Length': st.size })); if (req.method === 'HEAD') return res.end(); fs.createReadStream(f).pipe(res);
    });
  }).listen(p, '127.0.0.1');
}
if (import.meta.url === `file://${process.argv[1]}`) { serve(); console.log(`serving ${root} on http://127.0.0.1:${port}/`); }
