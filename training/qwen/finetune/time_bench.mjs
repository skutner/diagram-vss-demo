// time_bench.mjs: Q0.7 of QWEN3_FINETUNE_PLAN.md (QWEN3_FINETUNE_RUNLOG.md has the declaration). The time per message of a fine-tuned
// Qwen reader on the reference machine: wllama 3.8.1 (docs/vendor), headless Chromium, the shipped GGUF, the reader's load settings with
// n_ctx 1,024, the 30-token system prompt and make_examples.mjs userTurn. The untrained model's own output says nothing about a trained
// one's length, so generation is forced (ignore_eos) to the gold's length in the line format (lines_format.mjs writeLines of the Opus
// wires, counted in the GGUF's tokens by wllama's own tokenizer, plus <|im_end|>).
//   node time_bench.mjs --gguf FILE --out OUT.json [--variant names|drawing|session] [--n 40] [--threads 1] [--gpu-layers 0] [--grammar FILE] [--natural]
// --natural: the model stops by itself (max_tokens 256) instead of being forced to the gold's length (for a model that writes the format)
// names / drawing: the first n non-session nl_a calibration messages whose Opus gold has 1 or 2 requests, one after another in one loaded
// model (cache_prompt on, so each message reuses only what its prompt shares with the previous one: the system prompt). session: the
// calibration-part sessions of nl_a, step by step, the drawing after the gold of the earlier steps (what the prompt cache keeps).
// Per message: wall ms of createChatCompletion, prompt tokens read and cached, prefill / decode ms, the load average before and after.
// Serves the two wllama files, the GGUF and a blank page from 127.0.0.1 only.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, statSync, createReadStream, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { cpus, loadavg } from 'node:os';
import { spawnSync } from 'node:child_process';
import { K } from '../../neural/parity/parity_lib.mjs';
import { loadSets, contextNames } from '../../neural/parity/sets.mjs';
import { startSystem, playGold } from '../../neural/parity/arm_lib.mjs';
import { writeLines } from './lines_format.mjs';
import { SYSTEM, userTurn } from './make_examples.mjs';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const gguf = opt('gguf'), outFile = opt('out'), variant = opt('variant', 'names'), N = +opt('n', 40), threads = +opt('threads', 1), gpuLayers = +opt('gpu-layers', 0);
const natural = A.includes('--natural'), grammarFile = opt('grammar', null), grammar = grammarFile ? readFileSync(grammarFile, 'utf8') : null;
if (!gguf || !outFile) throw new Error('node time_bench.mjs --gguf FILE --out OUT.json [--variant names|drawing|session]');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || '/home/skutner/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sha = b => createHash('sha256').update(b).digest('hex');

const reader = JSON.parse(readFileSync(ROOT + '/docs/model/qwen3/reader.json', 'utf8'));
const nl = loadSets(['nl_a'])[0].items;
let jobs = [];
const req = target => ({ temperature: 0, seed: 0, chat_template_kwargs: { enable_thinking: false }, cache_prompt: true, logprobs: true, top_logprobs: 2,
  post_sampling_probs: false, ...(natural ? {} : { ignore_eos: true }), target }, grammar ? { grammar } : {});
if (variant === 'names' || variant === 'drawing') {
  const pick = nl.filter(it => it.part === 'calibration' && it.session == null && it.wires.length >= 1 && it.wires.length <= 2).slice(0, N);
  for (const it of pick) {
    const st = it.setup ? startSystem(it.setup) : null;
    const drawing = variant === 'drawing' && st && !st.errors.length && st.s.world.state.shapes.length ? K.worldSOP(st.s.world.state) : '';
    jobs.push({ id: it.id, requests: it.wires.length, has_drawing: !!drawing, user: userTurn(drawing, variant === 'names' || !drawing ? contextNames(it) : null, it.text), target: writeLines(it.wires) });
  }
} else if (variant === 'session') {
  const sess = [...new Set(nl.filter(it => it.part === 'calibration' && it.session != null).map(it => it.session))].slice(0, +opt('sessions', 2));
  for (const s of sess) {
    const steps = nl.filter(it => it.session === s), G = startSystem(steps[0].setup);
    for (const it of steps) {
      const drawing = G.s.world.state.shapes.length ? K.worldSOP(G.s.world.state) : '';
      jobs.push({ id: it.id, session: s, requests: it.wires.length, has_drawing: !!drawing, user: userTurn(drawing, contextNames(it), it.text), target: writeLines(it.wires) });
      playGold(G.s, it.wires);
    }
  }
} else throw new Error('variant: names, drawing or session');

// forced output length: the gold lines plus <|im_end|>, in the GGUF's tokens (tokenizer.json of the base; equal to the GGUF's own on the
// overfit rows, plan section 2), counted before the browser starts so that nothing else runs while the time is measured
const PY = process.env.PY || '/home/skutner/.cache/diagram-vss-modernbert/venv/bin/python';
const tokjson = process.env.TOKENIZER || '/home/skutner/.cache/diagram-vss-qwen/base/tokenizer.json';
const cnt = spawnSync(PY, ['-I', '-c', 'import sys,json\nfrom tokenizers import Tokenizer\nt=Tokenizer.from_file(sys.argv[1])\nprint(json.dumps([len(t.encode(x,add_special_tokens=False).ids) for x in json.load(sys.stdin)]))', tokjson], { input: JSON.stringify(jobs.map(j => j.target + '<|im_end|>')), encoding: 'utf8' });
if (cnt.status !== 0) throw new Error('token count failed: ' + cnt.stderr);
JSON.parse(cnt.stdout).forEach((n, i) => { jobs[i].forced = n; });
const page = `<!doctype html><meta charset="utf-8"><title>time</title><script type="module">
let w = null;
window.load = async (load) => {
  const out = { gpu: { navigator_gpu: !!navigator.gpu, adapter: null } };
  if (navigator.gpu) { try { const a = await navigator.gpu.requestAdapter(); out.gpu.adapter = a ? (a.info ? { vendor: a.info.vendor, architecture: a.info.architecture, description: a.info.description } : 'yes') : null; } catch (e) { out.gpu.error = String(e); } }
  const mod = await import('/wllama/index.min.js');
  w = new mod.Wllama({ default: '/wllama/wllama.wasm' }, { suppressNativeLog: true });
  w.setCompat(null);
  const t0 = performance.now(); const blob = await (await fetch('/model.gguf')).blob(); const tf = performance.now();
  await w.loadModel([new File([blob], 'model.gguf')], load); const tl = performance.now();
  return Object.assign(out, { fetchMs: tf - t0, loadMs: tl - tf, threads: w.getNumThreads(), multithread: w.isMultithread(), libllama: mod.Wllama.getLibllamaVersion ? mod.Wllama.getLibllamaVersion() : null, ua: navigator.userAgent, hc: navigator.hardwareConcurrency });
};
window.job = async (system, user, body, n) => {
  const b = Object.assign({}, body, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: body.ignore_eos ? n : 256, stream: false }); delete b.target;
  const a = performance.now(); let res = null, err = null;
  try { res = await w.createChatCompletion(b); } catch (e) { err = String(e && e.message || e); }
  const ch = res && res.choices && res.choices[0];
  return { ms: performance.now() - a, forced_tokens: body.ignore_eos ? n : null, content: ch && ch.message ? ch.message.content : null, err, finish: ch ? ch.finish_reason : null, usage: res ? res.usage : null, timings: res ? res.timings : null };
};
window.bye = async () => { await w.exit(); };
</script>`;
const files = { '/wllama/index.min.js': [ROOT + '/docs/vendor/wllama-3.8.1/index.min.js', 'text/javascript'], '/wllama/wllama.wasm': [ROOT + '/docs/vendor/wllama-3.8.1/wllama.wasm', 'application/wasm'], '/model.gguf': [gguf, 'application/octet-stream'] };
const srv = createServer((rq, rs) => {
  const p = rq.url.split('?')[0];
  if (p === '/' || p === '/time.html') { rs.writeHead(200, { 'content-type': 'text/html' }); return rs.end(page); }
  const f = files[p]; if (!f) { rs.writeHead(404); return rs.end(); }
  rs.writeHead(200, { 'content-type': f[1], 'content-length': statSync(f[0]).size }); createReadStream(f[0]).pipe(rs);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const launchArgs = gpuLayers > 0 ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=vulkan'] : [];
const browser = await chromium.launch({ headless: true, args: launchArgs, executablePath: process.env.CHROME || '/home/skutner/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell' });
const pg = await (await browser.newContext()).newPage(); pg.setDefaultTimeout(0);
await pg.goto(`http://127.0.0.1:${srv.address().port}/time.html`);
const power = (() => { try { return readFileSync('/sys/class/power_supply/ADP0/online', 'utf8').trim(); } catch { return null; } })();
const governor = (() => { try { return readFileSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor', 'utf8').trim(); } catch { return null; } })();
const profile = (() => { try { return readFileSync('/sys/firmware/acpi/platform_profile', 'utf8').trim(); } catch { return null; } })();
const load = Object.assign({}, reader.load, { n_threads: threads, n_ctx: 1024, n_gpu_layers: gpuLayers });
const la0 = loadavg(), t0 = Date.now();
const info = await pg.evaluate(l => window.load(l), load);
console.error(JSON.stringify({ loaded: info.loadMs, threads: info.threads, gpu: info.gpu }));
const results = [];
for (const j of jobs) {
  const before = loadavg()[0];
  const r = await pg.evaluate(([s, u, b, n]) => window.job(s, u, b, n), [SYSTEM, j.user, req(j.target), j.forced]);
  results.push({ id: j.id, session: j.session ?? null, requests: j.requests, has_drawing: j.has_drawing, load1_before: before, load1_after: loadavg()[0], ...r,
    prompt_n: r.timings?.prompt_n ?? null, cache_n: r.timings?.cache_n ?? null, prompt_ms: r.timings?.prompt_ms ?? null, predicted_n: r.timings?.predicted_n ?? null, predicted_ms: r.timings?.predicted_ms ?? null });
  const x = results.at(-1); console.error(`${x.id} ${Math.round(x.ms)} ms, prompt ${x.prompt_n} new + ${x.cache_n} cached, ${x.predicted_n} generated, load ${before.toFixed(2)}${x.err ? ' ERR ' + x.err : ''}`);
}
await pg.evaluate(() => window.bye()); await browser.close(); srv.close();
const ok = results.filter(r => !r.err && r.timings), ms = ok.map(r => r.ms).sort((a, b) => a - b);
const q = p => ms.length ? ms[Math.min(ms.length - 1, Math.ceil(p * ms.length) - 1)] : null;   // nearest-rank percentile
const sum = (k) => ok.reduce((a, r) => a + (r[k] || 0), 0);
const summary = { variant, n: results.length, errors: results.length - ok.length, threads: info.threads, multithread: info.multithread, libllama: info.libllama, gpu_layers: gpuLayers, gpu: info.gpu,
  load_ms: Math.round(info.loadMs), machine: { cpu: cpus()[0].model, logical_cpus: cpus().length, loadavg_before: la0, loadavg_after: loadavg(), ac_online: power, governor, platform_profile: profile },
  ms_p50: q(0.5) && Math.round(q(0.5)), ms_p95: q(0.95) && Math.round(q(0.95)), ms_max: ms.length ? Math.round(ms.at(-1)) : null,
  bar_ms_p95: 10000, meets_bar: q(0.95) != null ? q(0.95) <= 10000 : null,
  prefill_ms_per_token: sum('prompt_n') ? +(sum('prompt_ms') / sum('prompt_n')).toFixed(1) : null, decode_ms_per_token: sum('predicted_n') ? +(sum('predicted_ms') / sum('predicted_n')).toFixed(1) : null,
  prompt_new_tokens: ok.map(r => r.prompt_n), cached_tokens: ok.map(r => r.cache_n), generated: ok.map(r => r.predicted_n), max_load1_during: Math.max(...results.map(r => Math.max(r.load1_before, r.load1_after))),
  grammar: grammarFile ? { file: grammarFile, sha256: sha(grammar) } : null, natural, wall_s: Math.round((Date.now() - t0) / 1000) };
const code = Object.fromEntries(['training/qwen/finetune/time_bench.mjs', 'training/qwen/finetune/make_examples.mjs', 'training/qwen/finetune/lines_format.mjs', 'docs/vendor/wllama-3.8.1/index.min.js', 'docs/vendor/wllama-3.8.1/wllama.wasm'].map(f => [f, sha(readFileSync(ROOT + '/' + f))]));
writeFileSync(outFile, JSON.stringify({ summary, command: process.argv.slice(1).join(' '), gguf, code, browser: info.ua, results }, null, 1));
console.log(JSON.stringify(summary, null, 1));
