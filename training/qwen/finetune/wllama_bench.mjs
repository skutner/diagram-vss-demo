// wllama_bench.mjs: the shipped runtime (docs/vendor/wllama-3.8.1, one WASM thread, the reader's load settings) in headless Chromium on
// this machine, on the same requests as a native collect_qwen.mjs run: (1) parity: the raw output, the generated token ids and their
// log-probabilities against the native records; (2) time per message as the browser reader would spend it. A second variant measures the
// prompt a fine-tuned reader could use: a one-line system prompt, the drawing and the message, generation without the JSON grammar
// (the speed of decoding depends on the context length and the number of tokens, not on what is written).
//   node wllama_bench.mjs --gguf FILE --native RECORDS.jsonl --out OUT.json [--n 8] [--from 0] [--short 6] [--threads 1]
// --from k: start at the k-th native record (to split one parity run over parallel one-thread instances; --short 0 for those)
// Serves the two wllama files, the GGUF and a blank page from 127.0.0.1; nothing else. PLAYWRIGHT: path of a playwright package.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, statSync, createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { cpus, loadavg } from 'node:os';
import { buildSpec, buildSchema, buildPrompt, userContent } from '../../../docs/js/qwen-contract.js';
import { K } from '../../neural/parity/parity_lib.mjs';
import { loadSets, contextNames } from '../../neural/parity/sets.mjs';
import { startSystem } from '../../neural/parity/arm_lib.mjs';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const A = process.argv.slice(2), opt = k => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : null; };
const gguf = opt('gguf'), nativeFile = opt('native'), outFile = opt('out'), N = +(opt('n') || 8), FROM = +(opt('from') || 0), NS = +(opt('short') || 6), threads = +(opt('threads') || 1);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || '/home/skutner/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const reader = JSON.parse(readFileSync(ROOT + '/docs/model/qwen3/reader.json', 'utf8'));
const S0 = K.createSystem(), spec = buildSpec(S0.engine.legend, reader, K.serialize);
const wireDocs = Object.fromEntries([...S0.engine.wireTypes].map(([t, w]) => [t, w.doc]));
const prompt = buildPrompt(spec, reader, wireDocs), schema = buildSchema(spec);
const SHORT_SYSTEM = 'Write the diagram editor requests in this message, one per line.';

const native = readFileSync(nativeFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => r.qwen && !r.error).slice(FROM, FROM + N);
const items = new Map(loadSets([...new Set(native.map(r => r.set))]).flatMap(s => s.items).map(it => [it.id, it]));
const shipped = native.map(r => { const it = items.get(r.id); return { id: r.id, body: Object.assign({ messages: [{ role: 'system', content: prompt }, { role: 'user', content: userContent(contextNames(it), it.text) }],
  response_format: { type: 'json_schema', json_schema: { name: 'diagram_requests', schema, strict: true } } }, reader.request) }; });
const nlA = loadSets(['nl_a'])[0].items.filter(it => it.setup && !it.session).slice(0, NS);
const short = nlA.map(it => ({ id: it.id, body: { messages: [{ role: 'system', content: SHORT_SYSTEM }, { role: 'user', content: K.worldSOP(startSystem(it.setup).s.world.state) + '\n\n' + it.text }],
  temperature: 0, seed: 0, max_tokens: 40, ignore_eos: true, chat_template_kwargs: { enable_thinking: false }, cache_prompt: true, logprobs: true, top_logprobs: 1, post_sampling_probs: false } }));

const page = `<!doctype html><meta charset="utf-8"><title>bench</title><script type="module">
window.run = async (load, jobs) => {
  const mod = await import('/wllama/index.min.js');
  const w = new mod.Wllama({ default: '/wllama/wllama.wasm' }, { suppressNativeLog: true });
  w.setCompat(null);
  const t0 = performance.now(); const blob = await (await fetch('/model.gguf')).blob(); const tf = performance.now();
  await w.loadModel([new File([blob], 'model.gguf')], load); const tl = performance.now();
  const out = { fetchMs: tf - t0, loadMs: tl - tf, threads: w.getNumThreads(), multithread: w.isMultithread(), libllama: mod.Wllama.getLibllamaVersion ? mod.Wllama.getLibllamaVersion() : null, ua: navigator.userAgent, hc: navigator.hardwareConcurrency, coi: self.crossOriginIsolated, results: [] };
  for (const j of jobs) {
    const a = performance.now(); let res = null, err = null;
    try { res = await w.createChatCompletion(Object.assign({}, j.body, { stream: false })); } catch (e) { err = String(e && e.message || e); }
    const ch = res && res.choices && res.choices[0];
    out.results.push({ id: j.id, variant: j.variant, ms: performance.now() - a, err, content: ch && ch.message ? ch.message.content : null, finish: ch ? ch.finish_reason : null,
      usage: res ? res.usage : null, timings: res ? res.timings : null, tokens: res && res.__verbose ? res.__verbose.tokens : null,
      lp: ch && ch.logprobs && ch.logprobs.content ? ch.logprobs.content.map(t => [t.id, t.logprob]) : null });
  }
  await w.exit(); return out;
};
</script>`;
const files = { '/wllama/index.min.js': [ROOT + '/docs/vendor/wllama-3.8.1/index.min.js', 'text/javascript'], '/wllama/wllama.wasm': [ROOT + '/docs/vendor/wllama-3.8.1/wllama.wasm', 'application/wasm'], '/model.gguf': [gguf, 'application/octet-stream'] };
const srv = createServer((req, res) => {
  const p = req.url.split('?')[0];
  if (p === '/' || p === '/bench.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page); }
  const f = files[p]; if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': f[1], 'content-length': statSync(f[0]).size }); createReadStream(f[0]).pipe(res);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port, browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || '/home/skutner/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell' });
const ctx = await browser.newContext(), pg = await ctx.newPage();
pg.setDefaultTimeout(0);
await pg.goto(`http://127.0.0.1:${port}/bench.html`);
const load = Object.assign({}, reader.load, { n_threads: threads });
const t0 = Date.now(), la0 = loadavg();
const res = await pg.evaluate(([load, jobs]) => window.run(load, jobs), [load, [...shipped.map(j => ({ ...j, variant: 'shipped' })), ...short.map(j => ({ ...j, variant: 'short' }))]]);
await browser.close(); srv.close();
// parity with the native records
const nat = new Map(native.map(r => [r.id, r]));
for (const r of res.results.filter(x => x.variant === 'shipped')) {
  const n = nat.get(r.id); r.native_raw_equal = n ? n.qwen.raw === r.content : null;
}
const sh = res.results.filter(x => x.variant === 'shipped' && x.timings), so = res.results.filter(x => x.variant === 'short' && x.timings);
const rate = (xs, k, m) => xs.length ? +(xs.reduce((a, x) => a + x.timings[m], 0) / xs.reduce((a, x) => a + x.timings[k], 0)).toFixed(1) : null;
const summary = { machine: { cpu: cpus()[0].model, logical_cpus: cpus().length, loadavg_before: la0, loadavg_after: loadavg() }, browser: res.ua, threads: res.threads, multithread: res.multithread, libllama: res.libllama,
  load_ms: Math.round(res.loadMs), shipped: { n: sh.length, raw_equal_native: sh.filter(x => x.native_raw_equal).length,
    first_call: sh[0] ? { ms: Math.round(sh[0].ms), prompt_n: sh[0].timings.prompt_n, prompt_ms: Math.round(sh[0].timings.prompt_ms), predicted_n: sh[0].timings.predicted_n, predicted_ms: Math.round(sh[0].timings.predicted_ms) } : null,
    later_calls_ms: sh.slice(1).map(x => Math.round(x.ms)), later_ms_per_prompt_token: rate(sh.slice(1), 'prompt_n', 'prompt_ms'), ms_per_generated_token: rate(sh.slice(1), 'predicted_n', 'predicted_ms'),
    generated_tokens: sh.map(x => x.timings.predicted_n) },
  short: { n: so.length, prompt_tokens: so.map(x => x.timings.prompt_n + (x.timings.cache_n || 0)), ms: so.map(x => Math.round(x.ms)), ms_per_prompt_token: rate(so, 'prompt_n', 'prompt_ms'), ms_per_generated_token: rate(so, 'predicted_n', 'predicted_ms') },
  wall_s: Math.round((Date.now() - t0) / 1000) };
writeFileSync(outFile, JSON.stringify({ summary, results: res.results }, null, 1));
console.log(JSON.stringify(summary, null, 1));
