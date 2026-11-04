// check_deployed.mjs: do the files GitHub Pages serves equal the files of a commit? For each path under docs/, fetches the live file (with a
// query string so no stale cache answers), hashes it, and compares with `git show <commit>:docs/<path>`. Also records the Hugging Face
// model URL's advertised size and SHA-256 (x-linked-size, x-linked-etag) without downloading it.
//   node training/qwen/check_deployed.mjs <commit> [--site https://skutner.github.io/diagram-vss-demo/] [--out <file>]
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const commit = process.argv[2];
const argOf = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const site = argOf('--site', 'https://skutner.github.io/diagram-vss-demo/');
const PATHS = ['index.html', 'js/ui.js', 'js/neural.js', 'js/logic.js', 'js/qwen-reader.js', 'js/qwen-contract.js', 'js/qwen-worker.js', 'js/qwen-sha256.js',
  'vendor/wllama-3.8.1/index.min.js', 'vendor/wllama-3.8.1/wllama.wasm', 'model/qwen3/reader.json', 'model/versions.json', 'model/confidence/modernbert.json', 'model/confidence/vote3.json'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const out = { checkedAt: new Date().toISOString(), commit, site, assets: {}, allEqual: true };
for (const p of PATHS) {
  const url = `${site}${p}?verification=${commit}`;
  let src = null; try { src = execFileSync('git', ['show', `${commit}:docs/${p}`], { maxBuffer: 64 << 20 }); } catch (e) { src = null; }
  const r = await fetch(url, { cache: 'no-store' }), b = Buffer.from(await r.arrayBuffer());
  // the page itself asks for the plain URL (no query): that answer, which a CDN may cache, must be the same file
  const r2 = await fetch(site + p, { cache: 'no-store' }), b2 = Buffer.from(await r2.arrayBuffer());
  const a = { url, status: r.status, bytes: b.length, live_sha256: sha(b), plain_url_status: r2.status, plain_url_sha256: sha(b2), source_sha256: src ? sha(src) : null, last_modified: r.headers.get('last-modified'), etag: r.headers.get('etag') };
  a.equal = r.status === 200 && r2.status === 200 && !!src && a.live_sha256 === a.source_sha256 && a.plain_url_sha256 === a.source_sha256; if (!a.equal) out.allEqual = false;
  out.assets['docs/' + p] = a;
}
const reader = JSON.parse(execFileSync('git', ['show', `${commit}:docs/model/qwen3/reader.json`]).toString());
const h = await fetch(reader.model.url, { method: 'HEAD', redirect: 'manual', headers: { Origin: site.replace(/\/[^/]*\/?$/, '').replace(/\/$/, '') } });
out.model = { url: reader.model.url, status: h.status, x_repo_commit: h.headers.get('x-repo-commit'), x_linked_size: h.headers.get('x-linked-size'), x_linked_etag: h.headers.get('x-linked-etag'), access_control_allow_origin: h.headers.get('access-control-allow-origin'),
  pinned_bytes: reader.model.bytes, pinned_sha256: reader.model.sha256 };
out.model.matchesPin = out.model.x_repo_commit === reader.model.revision && +out.model.x_linked_size === reader.model.bytes && String(out.model.x_linked_etag).replace(/"/g, '') === reader.model.sha256;
const text = JSON.stringify(out, null, 1);
if (argOf('--out')) fs.writeFileSync(argOf('--out'), text + '\n');
console.log(text);
process.exit(out.allEqual && out.model.matchesPin ? 0 : 1);
