// collect_lines.mjs: a Qwen reader in the line format (lines_reader.mjs, D1) on the named sets of training/neural/parity/sets.mjs, through a
// native llama-server. One record per message in arm_lib.mjs buildRecord's format (score_arm.mjs and calibrate_qwen.mjs read them as any
// reader's), plus `qwen`: the raw output, validation, per-request signals (line_scores.mjs), the tokens with top-2 log-probabilities, the
// rendered prompt, timings.
//   SERVER=http://127.0.0.1:8090 GGUF=model.gguf (hashed; a native server must report it, by its absolute path, in /props) [LIMIT=n] [PART=…] [EVERY=k] [INPUT=names|drawing] [GRAMMAR=file] [NUMBER_WORDS=1] [VARIANT=name]
//     node collect_lines.mjs --keys ACT_KEYS.json --train-data DIR (--examples EX.jsonl | --untrained) [--allow-text-overlap] OUT.jsonl SET...
// The prompt is the fine-tuned reader's (make_examples.mjs SYSTEM and userTurn): INPUT=names (default) gives the names on the canvas, as
// training rows with no drawing; INPUT=drawing gives K.worldSOP of the row's setup, or in a session of the setup plus the gold of the earlier
// steps. Context for validation: the names (contextNames). Request: temperature 0, seed 0, max_tokens 256, logprobs, top_logprobs 2,
// cache_prompt, thinking off. --train-data DIR: DIR/trigger_inventory.json (seen / unseen triggers). Overlap with --examples refused or marked
// as collect_qwen.mjs. Resumable. A failed request gets a record with `error`.
// BACKEND=wllama GGUF=file (instead of SERVER): the browser runtime itself, wllama 3.8.1 (docs/vendor) in headless Chromium, one thread,
// the reader's load settings with n_ctx 1,024 (plan section 6.2); SHARD=i/k keeps the i-th of k slices of the messages (whole sessions
// stay together) so that k one-thread instances run in parallel, each into its own OUT file.
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { K, touched } from '../../neural/parity/parity_lib.mjs';
import { loadSets, contextNames } from '../../neural/parity/sets.mjs';
import { buildRecord, seenFunction, startSystem, playGold } from '../../neural/parity/arm_lib.mjs';
import { lineSpec, readOutput, toNodes, readerContext } from './lines_reader.mjs';
import { tokensOfLines, scoreLines, signalsOf } from './line_scores.mjs';
import { SYSTEM, userTurn } from './make_examples.mjs';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const sha = s => createHash('sha256').update(s).digest('hex');
const args = process.argv.slice(2), pos = []; let dataDir = null, exFile = null, allowText = false, keysFile = null;
for (let i = 0; i < args.length; i++) { if (args[i] === '--train-data') dataDir = args[++i]; else if (args[i] === '--examples') exFile = args[++i]; else if (args[i] === '--keys') keysFile = args[++i]; else if (args[i] === '--allow-text-overlap') allowText = true; else if (args[i] === '--untrained') {} else pos.push(args[i]); }
const [out, ...setNames] = pos, BACKEND = process.env.BACKEND || 'native', server = BACKEND === 'native' ? process.env.SERVER : 'wllama';
if (!exFile && !args.includes('--untrained')) throw new Error('--examples EX.jsonl (the arm\'s training examples, for the overlap check) is required; --untrained for the shipped or an untrained model');
if (!out || !setNames.length || !dataDir || !server || !keysFile) throw new Error('SERVER=url node collect_lines.mjs --keys ACT_KEYS.json --train-data DIR OUT.jsonl SET...');
const inv = JSON.parse(readFileSync(resolve(dataDir, 'trigger_inventory.json'), 'utf8')), seen = seenFunction({ exact: inv.triggers });
const learned = JSON.parse(readFileSync(keysFile, 'utf8')), spec = lineSpec(K.createSystem().engine, learned);
const INPUT = process.env.INPUT || 'names', grammar = process.env.GRAMMAR ? readFileSync(process.env.GRAMMAR, 'utf8') : null, numberWords = !!process.env.NUMBER_WORDS;
const variant = process.env.VARIANT || `lines-${INPUT}${grammar ? '-grammar' : ''}`;
const MAX_TOKENS = 256;
const request = { temperature: 0, seed: 0, max_tokens: MAX_TOKENS, logprobs: true, top_logprobs: 2, post_sampling_probs: false, cache_prompt: true, chat_template_kwargs: { enable_thinking: false }, verbose: true, return_tokens: true, stream: false };

const sets = loadSets(setNames);
let items = sets.flatMap(s => s.items);
const every = +(process.env.EVERY || 1), part = process.env.PART || null;
const keep = new Set(sets.flatMap(s => s.items.filter((it, i) => i % every === 0 && (!part || it.part === part)).map(it => it.id)));
const sessKeep = new Set(items.filter(it => it.session != null && keep.has(it.id)).map(it => it.set + '\0' + it.session));
items = items.filter(it => it.session != null ? sessKeep.has(it.set + '\0' + it.session) && (!part || it.part === part) : keep.has(it.id));
if (process.env.LIMIT) items = items.slice(0, +process.env.LIMIT);
if (process.env.SHARD) {
  const [si, sk] = process.env.SHARD.split('/').map(Number), unit = it => it.session != null ? it.set + '\0' + it.session : it.set + '\0' + it.id;
  const units = [...new Set(items.map(unit))], mine = new Set(units.filter((u, i) => i % sk === si));
  items = items.filter(it => mine.has(unit(it)));
}

// the message length in the GGUF's tokens (a signal), counted once with the base's tokenizer.json (equal to the GGUF's, plan section 2)
const PY = process.env.PY || '/home/skutner/.cache/diagram-vss-modernbert/venv/bin/python', TOK = process.env.TOKENIZER || '/home/skutner/.cache/diagram-vss-qwen/base/tokenizer.json';
const cnt = spawnSync(PY, ['-I', '-c', 'import sys,json\nfrom tokenizers import Tokenizer\nt=Tokenizer.from_file(sys.argv[1])\nprint(json.dumps([len(t.encode(x,add_special_tokens=False).ids) for x in json.load(sys.stdin)]))', TOK], { input: JSON.stringify(items.map(it => it.text)), encoding: 'utf8', maxBuffer: 1 << 26 });
if (cnt.status !== 0) throw new Error('token count failed: ' + cnt.stderr);
const msgTokens = new Map(JSON.parse(cnt.stdout).map((n, i) => [items[i].id + '\0' + items[i].set, n]));

// the model file is hashed here (GGUF=path, both backends); GGUF_SHA256 when given must equal it; the native server must serve that file
if (!process.env.GGUF) throw new Error('GGUF=path of the model file is required (it is hashed into the records\' artifact key)');
const ggufSha = createHash('sha256').update(readFileSync(process.env.GGUF)).digest('hex');
if (process.env.GGUF_SHA256 && process.env.GGUF_SHA256 !== ggufSha) throw new Error('GGUF_SHA256 differs from the file GGUF');
process.env.GGUF_SHA256 = ggufSha;
if (BACKEND === 'native') { const pr = await (await fetch(server + '/props')).json(); const mp = pr.model_path || (pr.default_generation_settings || {}).model; if (!mp || !mp.startsWith('/') || mp !== resolve(process.env.GGUF)) throw new Error(`the server serves ${mp}, not ${process.env.GGUF}`); }
const artifacts = sha(JSON.stringify({ backend: BACKEND === 'native' ? 'llama-server' : 'wllama-3.8.1', gguf: ggufSha, system: sha(SYSTEM), request, variant, keys: sha(readFileSync(keysFile)), grammar: grammar ? sha(grammar) : null, numberWords }));
const doneIds = new Set(existsSync(out) ? readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
const norm = t => String(t).toLowerCase().replace(/\s+/g, ' ').trim();
const exIds = new Set(), exTexts = new Set();
if (exFile) for (const l of readFileSync(exFile, 'utf8').split('\n').filter(Boolean)) { const e = JSON.parse(l); exIds.add(e.id); const k = e.user.lastIndexOf('Message:\n'); exTexts.add(norm(k >= 0 ? e.user.slice(k + 9) : e.user)); }
const byId = items.filter(it => exIds.has(it.id)), byText = items.filter(it => exTexts.has(norm(it.text)));
if (byId.length) throw new Error(`${byId.length} evaluated messages have the id of a training example (${byId.slice(0, 3).map(x => x.id).join(', ')})`);
if (byText.length && !allowText) throw new Error(`${byText.length} evaluated messages have the text of a training example (${byText.slice(0, 3).map(x => x.id).join(', ')}); pass --allow-text-overlap to mark them`);
const overlapText = new Set(byText.map(x => x.id));
const code = Object.fromEntries(['training/qwen/finetune/collect_lines.mjs', 'training/qwen/finetune/lines_reader.mjs', 'training/qwen/finetune/line_scores.mjs', 'training/qwen/finetune/make_examples.mjs', 'training/qwen/finetune/lines_format.mjs', 'docs/js/logic.js', 'training/neural/parity/arm_lib.mjs', 'training/neural/parity/sets.mjs', 'training/neural/parity/parity_lib.mjs', 'training/neural/parity/score_arm.mjs', 'training/sketch/layer_common.mjs'].map(f => [f, sha(readFileSync(ROOT + '/' + f))]));
const manifest = { tool: 'training/qwen/finetune/collect_lines.mjs', backend: BACKEND === 'native' ? 'llama-server' : 'wllama-3.8.1', shard: process.env.SHARD || null, server, variant, input: INPUT, number_words: numberWords, gguf_sha256: process.env.GGUF_SHA256 || null, system: SYSTEM, request, keys_file: resolve(keysFile),
  grammar_sha256: grammar ? sha(grammar) : null, sets: setNames, every, part, limit: process.env.LIMIT || null, messages: items.length, train_data: { dir: resolve(dataDir), inventory_sha256: sha(JSON.stringify(inv.triggers)) },
  artifacts_sha256: artifacts, overlap: { examples: exFile ? resolve(exFile) : null, examples_sha256: exFile ? sha(readFileSync(exFile)) : null, same_text: byText.map(x => x.id) }, code, started: new Date().toISOString() };
writeFileSync(out + '.manifest.json', JSON.stringify(manifest, null, 1));

let page = null;
if (BACKEND === 'wllama') page = await startWllama(process.env.GGUF);
async function startWllama(gguf) {
  const { createServer } = await import('node:http'), { statSync, createReadStream } = await import('node:fs'), { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || '/home/skutner/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const html = `<!doctype html><meta charset="utf-8"><title>collect</title><script type="module">
let w = null;
window.load = async (load) => { const mod = await import('/wllama/index.min.js'); w = new mod.Wllama({ default: '/wllama/wllama.wasm' }, { suppressNativeLog: true }); w.setCompat(null);
  const blob = await (await fetch('/model.gguf')).blob(); await w.loadModel([new File([blob], 'model.gguf')], load);
  return { threads: w.getNumThreads(), multithread: w.isMultithread(), libllama: mod.Wllama.getLibllamaVersion ? mod.Wllama.getLibllamaVersion() : null, ua: navigator.userAgent }; };
window.complete = async (b) => { try { return { res: await w.createChatCompletion(b) }; } catch (e) { return { err: String(e && e.message || e) }; } };
</script>`;
  const files = { '/wllama/index.min.js': [ROOT + '/docs/vendor/wllama-3.8.1/index.min.js', 'text/javascript'], '/wllama/wllama.wasm': [ROOT + '/docs/vendor/wllama-3.8.1/wllama.wasm', 'application/wasm'], '/model.gguf': [gguf, 'application/octet-stream'] };
  const srv = createServer((rq, rs) => { const p = rq.url.split('?')[0]; if (p === '/' || p === '/c.html') { rs.writeHead(200, { 'content-type': 'text/html' }); return rs.end(html); } const f = files[p]; if (!f) { rs.writeHead(404); return rs.end(); } rs.writeHead(200, { 'content-type': f[1], 'content-length': statSync(f[0]).size }); createReadStream(f[0]).pipe(rs); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || '/home/skutner/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell' });
  const pg = await (await browser.newContext()).newPage(); pg.setDefaultTimeout(0);
  await pg.goto(`http://127.0.0.1:${srv.address().port}/c.html`);
  const reader = JSON.parse(readFileSync(ROOT + '/docs/model/qwen3/reader.json', 'utf8'));
  const info = await pg.evaluate(l => window.load(l), Object.assign({}, reader.load, { n_threads: 1, n_ctx: 1024 }));
  manifest.runtime = info; writeFileSync(out + '.manifest.json', JSON.stringify(manifest, null, 1));
  return { pg, close: async () => { await browser.close(); srv.close(); } };
}
async function complete(user) {
  const b = Object.assign({ messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }, request, grammar ? { grammar } : {});
  if (page) { const t0 = Date.now(), r = await page.pg.evaluate(x => window.complete(x), b); if (r.err) throw new Error('wllama: ' + r.err); return { res: r.res, ms: Date.now() - t0 }; }
  const t0 = Date.now(), r = await fetch(server + '/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const j = await r.json(); if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return { res: j, ms: Date.now() - t0 };
}
export function readResponse(res, it, vctx) {
  const ch = res.choices && res.choices[0], msg = (ch && ch.message) || {}, vb = res.__verbose || {};
  const content = ch && ch.logprobs ? ch.logprobs.content : null, tk = tokensOfLines(content);
  const raw = !tk.error ? tk.text : typeof msg.content === 'string' ? msg.content : '';
  const v = readOutput(spec, raw, ch ? ch.finish_reason : null, vctx, { numberWords });
  if (msg.reasoning_content && String(msg.reasoning_content).trim()) { v.ok = false; v.errors.push('the model wrote hidden reasoning, although thinking is switched off'); for (const R of v.requests) R.blocked = true; }
  const scores = scoreLines(v, tk, raw), nodes = toNodes(spec, v), mt = msgTokens.get(it.id + '\0' + it.set);
  const byReq = new Map(nodes.mains.map(m => [m.req.index, m]));
  const mains = nodes.mains.map(m => {
    const sc = scores[m.req.index], f = signalsOf(sc, mt);
    return { node: m.node, mentions: m.mentions, span: m.req.span, src: it.text.slice(m.req.span[0], m.req.span[1]), f, act: f ? m.node.type + ':' + (m.node.args.action || m.node.args.ask || m.node.type) : null,
      truncated: false, wireId: m.node.id, dependencies: m.dependencies };
  });
  return { v, tk, raw, scores, mains, nodes, finish: ch ? ch.finish_reason : null, vb, byReq };
}

let session = null, G = null, n = 0; const t0 = Date.now();
for (const it of items) {
  if (it.session != null) { if (it.session !== session) { session = it.session; G = startSystem(it.setup); } } else { session = null; G = null; }
  const names = contextNames(it);
  if (!doneIds.has(it.id)) {
    let run, q = null;
    try {
      const sys = G ? G.s : it.setup ? startSystem(it.setup).s : null;
      const drawing = INPUT === 'drawing' && sys && sys.world.state.shapes.length ? K.worldSOP(sys.world.state) : '';
      const user = userTurn(drawing, drawing ? null : names, it.text);
      const { res, ms } = await complete(user), rd = readResponse(res, it, readerContext(it.text, it.names, it.groups, sys ? sys.world.state : null));
      run = { reader: 'qwen-lines', cut: 'own', mains: rd.mains, allNodes: rd.nodes.nodes, unread: [], cutInfo: null };
      q = { ok: rd.v.ok, errors: rd.v.errors, raw: rd.raw, finish: rd.finish, requests: rd.v.requests.map(R => ({ index: R.index, trigger: R.trigger, act: R.act, blocked: R.blocked, errors: R.errors })),
        scores: rd.scores.map(s => ({ score_min: s.score_min, weakest: s.weakest, missing: s.missing, fields: (s.fields || []).map(f => [f.name, f.mean, f.n]) })), msg_tokens: msgTokens.get(it.id + '\0' + it.set),
        ms, usage: res.usage || null, timings: res.timings || null, prompt: typeof rd.vb.prompt === 'string' ? rd.vb.prompt : null, input: INPUT, drawing_chars: drawing.length,
        tokens: rd.tk.error ? null : rd.tk.tokens.map(t => [t.id, t.lp, t.lp2]), eos: rd.tk.eos, token_error: rd.tk.error || null };
    } catch (e) { run = { reader: 'qwen-lines', cut: 'own', mains: [], allNodes: [], unread: [], cutInfo: null, error: String(e && e.message || e) }; console.error(`FAILED ${it.id}: ${run.error}`); }
    const rec = buildRecord(it, run, { seen, artifactsKey: artifacts });
    rec.artifacts_sha256 = artifacts; rec.qwen = q; rec.variant = variant; rec.in_training = overlapText.has(it.id) ? 'text' : null; rec.overlap_checked = !!exFile; if (overlapText.has(it.id)) rec.train_text_overlap = true;
    appendFileSync(out, JSON.stringify(rec) + '\n');
  }
  if (G) playGold(G.s, it.wires);
  if (++n % 25 === 0) console.error(`${n} of ${items.length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
if (page) await page.close();
manifest.finished = new Date().toISOString();
const recLines = readFileSync(out, 'utf8').split('\n').filter(l => l.trim());
manifest.complete = recLines.length === items.length; manifest.records = { count: recLines.length, sha256: sha(readFileSync(out)) };
writeFileSync(out + '.manifest.json', JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ out, messages: items.length }));
