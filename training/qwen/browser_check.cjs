// browser_check.cjs: the Qwen3 reader module on its own (docs/js/qwen-reader.js), in a real Chromium, with the real model and runtime:
// load (download or cache, SHA-256, start, first check), readings of development messages (not the live fixture), unload, a reload from
// the private file system cache, and the cache info. It prints one JSON record. Nothing of the site is changed.
//   node training/qwen/browser_check.cjs [--gguf <local copy>] [--profile <dir>] [--msgs <json file: [{text, names}]>] [--out <file>]
// --gguf serves the pinned Hugging Face URL from a local copy of the same file (the reader still checks its SHA-256); without it the
// file is downloaded from the Hub. A fresh --profile (a new directory) is a fresh browser profile.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
(async () => {
  const root = path.resolve(__dirname, '../../docs'), { serve } = await import(path.resolve(__dirname, 'serve_docs.mjs'));
  const gguf = arg('--gguf'), port = 8700 + Math.floor(Math.random() * 200), srv = serve(port, root, gguf ? { '/__local_model.gguf': path.resolve(gguf) } : {}), base = `http://127.0.0.1:${port}/`;
  const profile = arg('--profile') || fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-profile-'));
  const ctx = await chromium.launchPersistentContext(profile, { headless: true });
  const reader = JSON.parse(fs.readFileSync(path.join(root, 'model/qwen3/reader.json'), 'utf8'));
  // --gguf: only the download URL of reader.json is changed, to the same file served locally; size and SHA-256 are still checked
  const served = { model: 0 };
  if (gguf) await ctx.route(base + 'model/qwen3/reader.json*', route => { served.model++; route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign({}, reader, { model: Object.assign({}, reader.model, { url: base + '__local_model.gguf' }) })) }); });
  // the classic scripts of docs/index.html up to neural.js, in its order: the legend is then the one the demo builds
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
  const upto = scripts.slice(0, scripts.indexOf('js/neural.js') + 1).map(s => `<script src="${s}"></script>`).join('');
  await ctx.route(base + '__qwen_check.html', route => route.fulfill({ status: 200, contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><title>qwen check</title>${upto}` }));
  const page = await ctx.newPage(), consoleLines = [];
  page.on('console', m => consoleLines.push(`${m.type()}: ${m.text().slice(0, 300)}`));
  await page.goto(base + '__qwen_check.html');
  const msgs = arg('--msgs') ? JSON.parse(fs.readFileSync(arg('--msgs'), 'utf8')) : [
    { text: 'Add a green square named Hub, then connect Start to it.', names: ['Start', 'Process', 'Check', 'Done'] },
    { text: 'How many circles are there?', names: ['Start', 'Process'] }];
  const rec = await page.evaluate(async ({ msgs, noReload }) => {
    const out = { steps: [] }, T = () => performance.now();
    const M = await import('./js/qwen-reader.js'), S = SOPKit.createSystem();
    const r = M.createQwenReader({ engine: S.engine, serialize: SOPKit.serialize, base: document.baseURI, next: NeuralKit.NEXT_CONTEXT, onChange: () => {} });
    const snap = () => JSON.parse(JSON.stringify({ state: r.S.state, error: r.S.error && r.S.error.message, info: r.S.info && Object.assign({}, r.S.info, { chatTemplate: r.S.info.chatTemplate ? r.S.info.chatTemplate.length + ' chars' : null }), check: r.S.check, loadMs: r.S.loadMs, promptSha: r.S.promptSha }));
    let t = T(); await r.load(); out.load1 = Object.assign(snap(), { ms: T() - t });
    if (r.S.state !== 'ready') return out;
    for (const m of msgs) {
      t = T(); const x = await r.formalize(m.text, { names: m.names, last: m.last || [] });
      const g = M.qwenGate(x, m.text);
      out.steps.push({ text: m.text, ms: T() - t, qwen: x.qwen, nodes: x.nodes.map(n => SOPKit.serialize(n)), analyses: x.analyses.map(a => ({ id: a.id, do: a.do, src: a.src, span: a.span, blocked: a.blocked, errors: a.errors, score: a.score, weakest: a.weakest })), notes: x.notes,
        gate: g.units.map(u => ({ index: u.index, src: u.src, execute: u.execute, blocked: u.blocked, conf: u.conf, reasons: u.reasons.map(z => z.text) })) });
    }
    t = T(); await r.unload(); out.unload = { state: r.S.state, ms: T() - t };
    if (!noReload) { t = T(); await r.load(); out.load2 = Object.assign(snap(), { ms: T() - t }); }
    out.cache = await r.cacheInfo().catch(e => ({ error: e.message }));
    await r.unload();
    out.ua = navigator.userAgent; out.hc = navigator.hardwareConcurrency; out.coi = self.crossOriginIsolated;
    return out;
  }, { msgs, noReload: process.argv.includes('--no-reload') });
  rec.modelUrlReplacedByLocalCopy = served.model; rec.console = consoleLines.slice(-60); rec.profile = profile;
  const text = JSON.stringify(rec, null, 1);
  if (arg('--out')) fs.writeFileSync(arg('--out'), text); else console.log(text);
  await ctx.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
