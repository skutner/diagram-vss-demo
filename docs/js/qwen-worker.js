// qwen-worker.js: the module Worker of the experimental Qwen3 reader (training/qwen/QWEN3_PLAN.md B1-B3). It alone owns the model
// file (download from the pinned Hugging Face URL, SHA-256 while writing it to this origin's private file system, SHA-256 again on
// every load), the wllama 3.8.1 runtime (self-hosted, compat/CDN mode off, CPU only: n_gpu_layers 0, one thread) and the completions.
// The page talks to it by messages only (docs/js/qwen-reader.js); terminating this worker ends wllama's own inner worker too.
// Messages in: {op: 'load', id, cfg} | {op: 'complete', id, body} | {op: 'abort', id} | {op: 'unload', id} | {op: 'cache', id} | {op: 'clear', id}
// Messages out: {id, ok: true, value} | {id, ok: false, error: {message, kind}} | {op: 'progress', stage, done, total}
import { sha256Blob, Sha256 } from './qwen-sha256.js';

const DIR = 'qwen3-reader', LOCK = 'qwen3-reader-cache';
let W = null, wllamaMod = null, aborts = new Map(), state = 'idle', logs = [], releaseShared = null;
/** the cache folder is shared by this site's tabs: writing, checking and deleting take the lock exclusively, a loaded model holds it shared */
const withLock = (mode, fn, opts) => self.navigator && navigator.locks ? navigator.locks.request(LOCK, Object.assign({ mode }, opts || {}), fn) : fn(true);
const post = m => self.postMessage(m);
let lastProgress = 0;
/** at most five progress messages a second (and always the last one of a stage) */
const progress = (stage, done, total, extra) => { const t = performance.now(); if (done < total && t - lastProgress < 200) return; lastProgress = t; post(Object.assign({ op: 'progress', stage, done, total }, extra || {})); };
const errOf = (e, kind) => ({ message: String(e && e.message || e), kind: kind || (e && e.name) || 'error', type: e && e.type || null });

async function opfsDir(create) {
  if (!self.navigator || !navigator.storage || !navigator.storage.getDirectory) throw new Error('this browser has no origin private file system');
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR, { create });
}
async function cacheInfo(cfg) {
  try {
    const d = await opfsDir(false), out = { files: [] };
    for await (const [name, h] of d.entries()) if (h.kind === 'file') { const f = await h.getFile(); out.files.push({ name, bytes: f.size }); }
    out.bytes = out.files.reduce((a, f) => a + f.bytes, 0);
    if (cfg) { const meta = out.files.find(f => f.name === cfg.sha256 + '.json'); out.verified = !!meta; }
    if (navigator.storage.estimate) out.estimate = await navigator.storage.estimate();
    if (navigator.storage.persisted) out.persisted = await navigator.storage.persisted();
    return out;
  } catch (e) { return { files: [], bytes: 0, error: String(e.message || e) }; }
}
/** the verified model file: from the cache when its size, its metadata and a fresh SHA-256 match the pin, else downloaded (and cached
 *  when the private file system works) -> {file: Blob, source: 'cache'|'network', cached, hashMs, downloadMs, note} */
async function modelFile(cfg) {
  const t0 = performance.now(), name = cfg.sha256 + '.gguf', metaName = cfg.sha256 + '.json';
  let dir = null, note = null;
  try { dir = await opfsDir(true); } catch (e) { note = `not cached: ${e.message || e}`; }
  if (dir) {
    try {
      const meta = JSON.parse(await (await (await dir.getFileHandle(metaName)).getFile()).text());
      const f = await (await dir.getFileHandle(name)).getFile();
      if (meta.sha256 === cfg.sha256 && f.size === cfg.bytes) {
        const h0 = performance.now();
        const got = await sha256Blob(f, (d, t) => progress('verify', d, t, { source: 'cache' }));
        if (got === cfg.sha256) return { file: f, source: 'cache', cached: true, hashMs: performance.now() - h0, downloadMs: 0, sha256: got, note: null };
        note = `the cached file failed its SHA-256 check (${got.slice(0, 12)}…), downloaded again`;
      } else note = 'the cached file did not match the pin, downloaded again';
      await dir.removeEntry(metaName).catch(() => {}); await dir.removeEntry(name).catch(() => {});
    } catch (e) { /* not cached yet */ }
  }
  const part = name + '.part';
  if (dir) await dir.removeEntry(part).catch(() => {});
  const res = await fetch(cfg.url, { cache: 'no-store' });
  if (!res.ok) throw Object.assign(new Error(`${cfg.url}: HTTP ${res.status}`), { name: 'download' });
  const total = +res.headers.get('content-length') || cfg.bytes, hasher = new Sha256(), reader = res.body.getReader();
  let writable = null, fh = null, chunks = null, done = 0;
  if (dir) { try { fh = await dir.getFileHandle(part, { create: true }); writable = await fh.createWritable(); } catch (e) { note = `not cached: ${e.message || e}`; writable = null; } }
  if (!writable) chunks = [];
  try {
    for (;;) {
      const { value, done: end } = await reader.read(); if (end) break;
      hasher.update(value); done += value.length;
      if (writable) await writable.write(value); else chunks.push(value);
      progress('download', done, total);
    }
    if (writable) await writable.close();
  } catch (e) {
    if (writable) { try { await writable.abort(); } catch (x) { } await dir.removeEntry(part).catch(() => {}); }
    if (/quota/i.test(String(e && e.name) + String(e && e.message))) throw Object.assign(new Error(`not enough browser storage for the ${Math.round(cfg.bytes / 1e6)} MB model (${e.message || e})`), { name: 'quota' });
    throw e;
  }
  const got = hasher.hex(), downloadMs = performance.now() - t0;
  if (done !== cfg.bytes || got !== cfg.sha256) {
    if (dir && writable) await dir.removeEntry(part).catch(() => {});
    throw Object.assign(new Error(`the downloaded model does not match its pin: ${done} bytes, SHA-256 ${got} (expected ${cfg.bytes} bytes, ${cfg.sha256})`), { name: 'checksum' });
  }
  if (dir && writable) {
    // only a verified file gets the model's name, and its metadata is written last
    if (typeof fh.move === 'function') await fh.move(name); else throw new Error('this browser cannot rename a file in its private file system');
    fh = await dir.getFileHandle(name);
    const mh = await dir.getFileHandle(metaName, { create: true }), mw = await mh.createWritable();
    await mw.write(JSON.stringify({ url: cfg.url, sha256: got, bytes: done, verifiedAt: new Date().toISOString() })); await mw.close();
    return { file: await fh.getFile(), source: 'network', cached: true, hashMs: 0, downloadMs, sha256: got, note };
  }
  return { file: new Blob(chunks), source: 'network', cached: false, hashMs: 0, downloadMs, sha256: got, note };
}

async function load(cfg) {
  if (W) throw new Error('the model is already loaded');
  state = 'loading'; logs = [];
  const t0 = performance.now();
  if (!WebAssembly.Suspending) throw Object.assign(new Error('this browser lacks WebAssembly JSPI, which the self-hosted wllama build needs (compat mode from a CDN is not used)'), { name: 'unsupported' });
  // the runtime files are checked against their pins (docs/model/qwen3/reader.json runtime.files) and run from the checked bytes
  const runtime = {};
  for (const [key, url] of [['js', cfg.wllamaUrl], ['wasm', cfg.wasmUrl]]) {
    const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw Object.assign(new Error(`${url}: HTTP ${r.status}`), { name: 'download' });
    const b = new Uint8Array(await r.arrayBuffer()), h = new Sha256().update(b).hex(), want = cfg.runtimeSha256[key];
    if (h !== want) throw Object.assign(new Error(`${url} does not match its pin (SHA-256 ${h}, expected ${want})`), { name: 'checksum' });
    runtime[key] = { url: URL.createObjectURL(new Blob([b], { type: key === 'js' ? 'text/javascript' : 'application/wasm' })), bytes: b.length, sha256: h };
  }
  const mf = await withLock('exclusive', () => modelFile(cfg));
  // held shared until unload: another tab's Clear cache cannot delete the file while this one reads it
  if (self.navigator && navigator.locks) navigator.locks.request(LOCK, { mode: 'shared' }, () => new Promise(r => { releaseShared = r; }));
  progress('start', 0, 1);
  if (!wllamaMod) wllamaMod = await import(runtime.js.url);
  const logger = { debug() { }, log: (...a) => logs.push(['log', a.join(' ').slice(0, 400)]), warn: (...a) => logs.push(['warn', a.join(' ').slice(0, 400)]), error: (...a) => logs.push(['error', a.join(' ').slice(0, 400)]) };
  const w = new wllamaMod.Wllama({ default: runtime.wasm.url }, { suppressNativeLog: false, logger });
  w.setCompat(null);   // never the compat build from the CDN
  const t1 = performance.now();
  try { await w.loadModel([mf.file], cfg.load); } catch (e) { try { await w.exit(); } catch (x) { } if (releaseShared) { releaseShared(); releaseShared = null; } throw e; }
  W = w; state = 'ready';
  const info = w.getLoadedContextInfo(), md = info.metadata || {};
  return { runtime: { js: { bytes: runtime.js.bytes, sha256: runtime.js.sha256 }, wasm: { bytes: runtime.wasm.bytes, sha256: runtime.wasm.sha256 } },
    source: mf.source, cached: mf.cached, note: mf.note, sha256: mf.sha256, bytes: mf.file.size, downloadMs: mf.downloadMs, hashMs: mf.hashMs, initMs: performance.now() - t1, totalMs: performance.now() - t0,
    multithread: w.isMultithread(), threads: w.getNumThreads(), libllama: wllamaMod.Wllama.getLibllamaVersion ? wllamaMod.Wllama.getLibllamaVersion() : null,
    ctx: { n_vocab: info.n_vocab, n_ctx: info.n_ctx, n_batch: info.n_batch, n_layer: info.n_layer, n_ctx_train: info.n_ctx_train, token_eos: info.token_eos, token_eot: info.token_eot, eog: info.list_tokens_eog, add_bos: info.add_bos_token },
    meta: { architecture: md['general.architecture'], name: md['general.name'], file_type: md['general.file_type'], tokenizer: md['tokenizer.ggml.model'], pre: md['tokenizer.ggml.pre'] },
    chatTemplate: w.getChatTemplate(), webgpu: typeof navigator !== 'undefined' && !!navigator.gpu, logs: logs.slice() };
}
async function complete(id, body) {
  if (!W) throw new Error('the model is not loaded');
  const ac = new AbortController(); aborts.set(id, ac);
  const t0 = performance.now(); logs = [];
  try {
    const res = await W.createChatCompletion(Object.assign({}, body, { stream: false, abortSignal: ac.signal }));
    return { res, ms: performance.now() - t0, logs: logs.slice() };
  } finally { aborts.delete(id); }
}
async function unload() {
  for (const ac of aborts.values()) ac.abort();
  if (W) { const w = W; W = null; await w.exit(); }
  if (releaseShared) { releaseShared(); releaseShared = null; }
  state = 'idle'; return { unloaded: true };
}
async function clear() {
  if (W) await unload();
  await withLock('exclusive', async lock => {
    if (!lock) throw new Error('another tab of this site is using the cached model; unload Qwen3 there first');
    try { const root = await navigator.storage.getDirectory(); await root.removeEntry(DIR, { recursive: true }); } catch (e) { if (!/NotFound/i.test(String(e && e.name))) throw e; }
  }, { ifAvailable: true });
  return cacheInfo(null);
}
self.onmessage = async ev => {
  const m = ev.data || {};
  if (m.op === 'abort') { const ac = aborts.get(m.target); if (ac) ac.abort(); post({ id: m.id, ok: true, value: { aborted: !!ac } }); return; }
  try {
    const value = m.op === 'load' ? await load(m.cfg) : m.op === 'complete' ? await complete(m.id, m.body) : m.op === 'unload' ? await unload() : m.op === 'cache' ? await cacheInfo(m.cfg) : m.op === 'clear' ? await clear() : (() => { throw new Error('unknown op ' + m.op); })();
    post({ id: m.id, ok: true, value });
  } catch (e) {
    if (m.op === 'load') { state = 'idle'; W = null; }
    post({ id: m.id, ok: false, error: Object.assign(errOf(e), { logs: logs.slice(-20) }) });
  }
};
