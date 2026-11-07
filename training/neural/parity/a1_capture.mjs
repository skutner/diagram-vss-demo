// a1_capture.mjs: A1 of NATURAL_LANGUAGE_NEXT_PLAN.md, the capture. What the demo's default reader (the VSS-BERT tab, `CHAT_DEFAULT = ['combined']`, docs/js/ui.js:1090)
// shows the person for every request it holds back, taken from the demo itself (docs/index.html + docs/js in a headless Chromium on the CPU: the page, the models
// and every reader as in training/sketch/clarify_probe_ui.py; transformers.js 3.8.1 from training/laptop/node_modules in place of the CDN; nothing else leaves the machine).
//   node a1_capture.mjs OUT.jsonl [--sets nl_a,collected_1] [--workers 3] [--limit N] [--ids FILE]
// One page per conversation, fresh: a session of nl_a (its rows, in order), every other message alone. nl_a (part `development` only): the demo's "Clear the canvas"
// button, then the row's `setup` typed as a message (a message that starts with `@` is SOP Lang: ui.js:1188), then the message. collected_1: the demo's start drawing
// (the names its rows hold), no setup. One line per message: {id, set, text, setup, step, ok, line, sub, held: [{src, reasons, how, runs, edit, anyway}], error}.
// Resumable: ids already in OUT are skipped (a session only when all its rows are). Needs a playwright-core (PLAYWRIGHT_CORE=dir; default: the first in ~/.npm/_npx/*) and a
// Chromium (CHROME=path; default: the newest in ~/.cache/ms-playwright). Neither is installed or downloaded here.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { loadSet } from './sets.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url)), DOCS = ROOT + 'docs', TJS = ROOT + 'training/laptop/node_modules/@huggingface/transformers/dist';
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

const args = process.argv.slice(2), out = args[0];
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
if (!out || out.startsWith('--')) throw new Error('usage: a1_capture.mjs OUT.jsonl [--sets nl_a,collected_1] [--workers N] [--limit N] [--ids FILE]');
const SETS = opt('--sets', 'nl_a,collected_1').split(','), WORKERS = +opt('--workers', 3), LIMIT = opt('--limit') ? +opt('--limit') : Infinity;
const IDS = opt('--ids') ? new Set(fs.readFileSync(opt('--ids'), 'utf8').split(/\s+/).filter(Boolean)) : null;

// ---------------------------------------------------------------- the conversations
/** the messages to capture, grouped: [{key, set, setup, rows: [item]}] (a session in order; any other message alone) */
export function conversations(sets) {
  const out = [];
  for (const name of sets) {
    const items = loadSet(name).items.filter(it => name !== 'nl_a' || it.part === 'development');
    const seen = new Set();
    for (const it of items) {
      if (it.session != null) {
        if (seen.has(it.session)) continue; seen.add(it.session);
        const rows = items.filter(x => x.session === it.session);
        out.push({ key: it.session, set: name, setup: rows[0].setup ?? '', rows });
      } else out.push({ key: it.id, set: name, setup: it.setup ?? '', rows: [it] });
    }
  }
  return out;
}

// ---------------------------------------------------------------- the browser
const pwDir = process.env.PLAYWRIGHT_CORE || fs.readdirSync(os.homedir() + '/.npm/_npx').map(d => `${os.homedir()}/.npm/_npx/${d}/node_modules/playwright-core`).find(d => fs.existsSync(d + '/package.json'));
const chromeDir = os.homedir() + '/.cache/ms-playwright', chrome = process.env.CHROME || (fs.existsSync(chromeDir) ? fs.readdirSync(chromeDir).filter(d => /^chromium-\d+$/.test(d)).sort().reverse().map(d => `${chromeDir}/${d}/chrome-linux64/chrome`).find(p => fs.existsSync(p)) : null);
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.wasm': 'application/wasm', '.css': 'text/css', '.svg': 'image/svg+xml' };

/** what the last bot bubble of the page shows for the VSS-BERT tab (docs/js/ui.js heldHTML renders the held requests) */
const READ = () => {
  const bs = [...document.querySelectorAll('#msgs .b.bot')], b = bs[bs.length - 1]; if (!b) return null;
  const rl = b.querySelector('.rl[data-reader=combined]') || b.querySelector('.rl'), tx = e => (e ? e.textContent : '');
  return { reader: rl ? rl.getAttribute('data-reader') : null, line: tx(rl && rl.querySelector('.t')), sub: tx(rl && rl.querySelector('.sub')), bubble: b.textContent.slice(0, 3000),
    held: rl ? [...rl.querySelectorAll('ul.held li')].map(li => ({ src: tx(li.querySelector('.src')).replace(/^“|”$/g, ''), reasons: [...li.querySelectorAll('.why .r')].map(x => x.textContent),
      how: tx(li.querySelector('.how')) || null, runs: tx(li.querySelector('.runs')) || null, edit: (li.querySelector('button.edit') || {}).dataset?.text ?? null,
      anyway: !!li.querySelector('button.anyway') })) : [] };
};
const botCount = () => document.querySelectorAll('#msgs .b.bot').length;

async function openPage(browser, base) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 860 } }), errors = [];
  pg.on('pageerror', e => errors.push(String(e)));
  await pg.addInitScript("try { localStorage.clear(); } catch (e) {}");   // clean storage: the default tab (VSS-BERT) and the default level
  await pg.route(LIB + '**', route => {
    const url = route.request().url().split('?')[0], rel = url.replace(/\/$/, '') === LIB ? 'transformers.min.js' : url.slice(LIB.length).replace(/^\//, '').replace(/^dist\//, ''), p = path.join(TJS, rel);
    if (!fs.existsSync(p)) return route.abort();
    route.fulfill({ status: 200, body: fs.readFileSync(p), headers: { 'content-type': p.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', 'access-control-allow-origin': '*' } });
  });
  await pg.route('https://huggingface.co/**', r => r.abort());
  await pg.goto(base, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => ['combined', 'vss', 'neural'].every(id => { const t = document.querySelector(`[data-rtab=${id}]`); return t && !t.classList.contains('off'); }), null, { timeout: 900000 });
  await pg.waitForFunction(() => document.querySelectorAll('#msgs .b.bot').length >= 1 + (window.StartDiagram ? StartDiagram.MESSAGES.length : 3) && !document.querySelector('#msgs .typing'), null, { timeout: 240000 });
  return { pg, errors };
}
async function send(pg, text) {
  const n = await pg.evaluate(botCount);
  await pg.fill('#say', text); await pg.click('#send-btn');
  await pg.waitForFunction(n => document.querySelectorAll('#msgs .b.bot').length > n && !document.querySelector('#msgs .typing'), n, { timeout: 240000 });
  await pg.waitForTimeout(300);
  return pg.evaluate(READ);
}
async function clearCanvas(pg) {
  const n = await pg.evaluate(botCount);
  await pg.click('button[data-say="Clear the canvas"]');
  await pg.waitForFunction(n => document.querySelectorAll('#msgs .b.bot').length > n && !document.querySelector('#msgs .typing'), n, { timeout: 240000 });
}

async function capture(browser, base, conv) {
  const lines = [], { pg, errors } = await openPage(browser, base);
  try {
    if (conv.set === 'nl_a') { await clearCanvas(pg); if (conv.setup) await send(pg, conv.setup); }
    for (const it of conv.rows) {
      const base0 = { id: it.id, set: conv.set, session: it.session, step: it.step ?? null, text: it.text, setup: it.setup };
      try { const r = await send(pg, it.text); lines.push({ ...base0, ok: true, ...r }); }
      catch (e) { lines.push({ ...base0, ok: false, error: String(e.message || e).slice(0, 300) }); break; }
    }
  } finally { await pg.close(); }
  if (errors.length) lines.forEach(l => { l.page_errors = errors; });
  return lines;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  if (!pwDir) throw new Error('no playwright-core found: set PLAYWRIGHT_CORE'); if (!chrome) throw new Error('no Chromium found: set CHROME');
  const { chromium } = createRequire(import.meta.url)(pwDir);
  const done = new Set(fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(l => l.ok).map(l => l.id) : []);
  let todo = conversations(SETS).filter(c => !c.rows.every(r => done.has(r.id)) && (!IDS || c.rows.some(r => IDS.has(r.id)))).slice(0, LIMIT);
  console.log(`${todo.length} conversations (${todo.reduce((n, c) => n + c.rows.length, 0)} messages) to capture; ${done.size} messages already in ${out}`);
  const srv = http.createServer((q, r) => { const p = path.join(DOCS, decodeURIComponent(q.url.split('?')[0])), f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? p + '/index.html' : p;
    if (!f.startsWith(DOCS) || !fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1');
  await new Promise(r => srv.on('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}/`, browser = await chromium.launch({ executablePath: chrome, args: ['--js-flags=--max-old-space-size=1536'] });
  let next = 0, n = 0; const t0 = Date.now();
  const worker = async () => {
    while (next < todo.length) {
      const conv = todo[next++]; let lines;
      try { lines = await capture(browser, base, conv); } catch (e) { lines = conv.rows.map(it => ({ id: it.id, set: conv.set, session: it.session, ok: false, error: 'conversation failed: ' + String(e.message || e).slice(0, 300) })); }
      fs.appendFileSync(out, lines.map(l => JSON.stringify(l)).join('\n') + '\n'); n += lines.length;
      console.log(`${((Date.now() - t0) / 60000).toFixed(1)} min: ${n} messages captured, ${lines.filter(l => !l.ok).length ? 'FAILED ' + conv.key : conv.key + ' ok'}`);
    }
  };
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close(); srv.close();
}
