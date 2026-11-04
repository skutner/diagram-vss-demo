// qwen-reader.js: the experimental Qwen3-0.6B reader on the page side (training/qwen/QWEN3_PLAN.md). It owns one module Worker
// (docs/js/qwen-worker.js) and turns a message into SOP Lang wires through the contract of docs/js/qwen-contract.js: the prompt and
// the JSON schema from the legend, one completion, the whole output validated, then the wires and their gate. Nothing it reads runs by
// itself: the reader has no calibrated confidence threshold, so its gate holds every request (Do it anyway runs one validated reading).
import { buildSpec, buildSchema, buildPrompt, userContent, validate, toNodes, tokensOf, scoreRequests } from './qwen-contract.js';

const THINK_OFF_SUFFIX = '<|im_start|>assistant\n<think>\n\n</think>\n\n';
const hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

/** opts: {engine (for the legend and the wire docs), serialize (SOPKit.serialize: the key order), base (the site's base URL), next (NeuralKit.NEXT_CONTEXT), onChange()} */
export function createQwenReader(opts) {
  const base = opts.base, S = { state: 'idle', error: null, stage: null, progress: { done: 0, total: 0 }, info: null, check: null, reader: null, spec: null, prompt: null, schema: null, promptSha: null, loadMs: 0, token: 0, busy: false, readings: 0 };
  let worker = null, seq = 0; const pending = new Map();
  const changed = () => { try { opts.onChange && opts.onChange(S); } catch (e) { console.error(e); } };
  function call(op, payload, transfer) {
    if (!worker) return Promise.reject(new Error('the Qwen3 worker is not running'));
    const id = ++seq;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject, op }); worker.postMessage(Object.assign({ op, id }, payload), transfer || []); });
  }
  function startWorker() {
    worker = new Worker(new URL('js/qwen-worker.js', base), { type: 'module' });
    worker.onmessage = ev => {
      const m = ev.data || {};
      if (m.op === 'progress') { S.stage = m.stage; S.progress = { done: m.done, total: m.total, source: m.source || null }; changed(); return; }
      const p = pending.get(m.id); if (!p) return; pending.delete(m.id);
      if (m.ok) p.resolve(m.value); else p.reject(Object.assign(new Error(m.error.message), { kind: m.error.kind, type: m.error.type, logs: m.error.logs }));
    };
    worker.onerror = ev => { ev.preventDefault && ev.preventDefault(); kill(new Error(`the Qwen3 worker stopped: ${ev.message || 'unknown error'}`)); };
    worker.onmessageerror = () => kill(new Error('a message from the Qwen3 worker could not be read'));
  }
  /** end the worker at once (stop, time limit, crash): every open call fails with `why`; the reader is no longer ready */
  function kill(why, nextState = 'failed') {
    const e = why || Object.assign(new Error('Qwen3 was unloaded'), { kind: 'unloaded' });
    if (worker) { try { worker.terminate(); } catch (x) { } worker = null; }
    for (const p of pending.values()) p.reject(e); pending.clear();
    S.token++; S.busy = false;
    if (nextState) { S.state = nextState; S.error = nextState === 'failed' ? e : null; }
    changed();
  }
  async function readerFile() {
    const r = await fetch(new URL('model/qwen3/reader.json', base), { cache: 'no-cache' });
    if (!r.ok) throw new Error(`model/qwen3/reader.json: HTTP ${r.status}`);
    return r.json();
  }
  /** the fixed inputs: reader.json, the prompt and schema from the live legend, both checked against the hashes in reader.json */
  async function prepare() {
    const reader = await readerFile(), spec = buildSpec(opts.engine.legend, reader, opts.serialize);
    const wireDocs = Object.fromEntries([...opts.engine.wireTypes].map(([t, w]) => [t, w.doc]));
    const prompt = buildPrompt(spec, reader, wireDocs), schema = buildSchema(spec);
    const [ps, ss] = [await hex(prompt), await hex(JSON.stringify(schema))];
    if (ps !== reader.prompt_sha256) throw new Error(`the prompt built from this page's legend (SHA-256 ${ps.slice(0, 12)}…) differs from the fixed one (${reader.prompt_sha256.slice(0, 12)}…): the legend changed since docs/model/qwen3/reader.json was written`);
    if (ss !== reader.schema_sha256) throw new Error(`the output schema built from this page's legend differs from the fixed one (${ss.slice(0, 12)}… instead of ${reader.schema_sha256.slice(0, 12)}…)`);
    Object.assign(S, { reader, spec, prompt, schema, promptSha: ps });
  }
  function body(text, names) {
    const R = S.reader;
    return Object.assign({ messages: [{ role: 'system', content: S.prompt }, { role: 'user', content: userContent(names, text) }],
      response_format: { type: 'json_schema', json_schema: { name: 'diagram_requests', schema: S.schema, strict: true } } }, R.request);
  }
  /** one completion with the time limit: past it, the worker is terminated (a running generation cannot be interrupted otherwise) */
  async function complete(b) {
    const token = S.token;
    let timer = null;
    const limit = new Promise((_, reject) => { timer = setTimeout(() => { const e = new Error(`stopped after the time limit of ${Math.round(S.reader.time_limit_ms / 60000)} minutes`); e.kind = 'timeout'; kill(e); reject(e); }, S.reader.time_limit_ms); });
    try { const out = await Promise.race([call('complete', { body: b }), limit]); if (token !== S.token) throw Object.assign(new Error('the reader was stopped or reloaded meanwhile'), { kind: 'stale' }); return out; }
    finally { clearTimeout(timer); }
  }
  /** a response -> the reading (the same shape as the other readers' formalize results, plus `qwen`, the evidence for the details) */
  function reading(text, ctx, out, err, ms) {
    const res = out && out.res, ch = res && res.choices && res.choices[0], msg = (ch && ch.message) || {}, vb = (res && res.__verbose) || {};
    const tk = ch ? tokensOf(ch.logprobs, vb.tokens) : { error: 'no response' };
    const raw = !tk.error ? tk.text : typeof vb.content === 'string' ? vb.content : typeof msg.content === 'string' ? msg.content : '';
    const errors = [];
    if (!err && typeof vb.prompt === 'string' && !vb.prompt.endsWith(THINK_OFF_SUFFIX)) errors.push('the rendered prompt does not end with the empty thinking block, so thinking was not switched off');
    if (!err && typeof vb.prompt !== 'string') errors.push('the runtime did not return the rendered prompt, so the thinking switch could not be checked');
    if (!err && typeof vb.content === 'string' && !tk.error && vb.content !== raw) errors.push('the generated text and its tokens differ');
    const v = validate(S.spec, { content: raw, finish: ch ? ch.finish_reason : null, reasoning: msg.reasoning_content || '', error: err ? err.message : null }, { text, names: ctx.names || [], last: ctx.last || [] });
    if (errors.length) { v.errors.push(...errors); v.ok = false; }
    const scores = v.ok ? scoreRequests(v, tk, raw) : [];
    const mapped = v.ok ? toNodes(S.spec, v, { names: ctx.names || [], last: ctx.last || [] }, opts.next) : { nodes: [], analyses: [] };
    mapped.analyses.forEach(a => { const sc = scores[a.index]; a.score = sc ? sc.min : NaN; a.scoreFields = sc ? sc.fields : []; a.weakest = sc ? sc.weakest : null; a.scoreMissing = sc ? sc.missing : (tk.error || 'no score'); });
    const notes = [], nu = v.notUnderstood || [];
    const ok = nu.filter(x => !x.error), bad = nu.filter(x => x.error);
    if (ok.length) notes.push('Ignored (not understood): ' + ok.map(x => `“${x.src}”`).join(', '));
    for (const x of bad) notes.push(`A not-understood part was dropped from the reading: ${x.error}.`);
    if (!v.ok) notes.push('Nothing of this reading can run: ' + v.errors.join('; ') + '.');
    const usage = res && res.usage, timings = res && res.timings;
    const qwen = { ok: v.ok, errors: v.errors, fenced: !!v.fenced, raw, rawShown: raw || (typeof msg.content === 'string' ? msg.content : ''), finish: ch ? ch.finish_reason : null, reasoning: msg.reasoning_content || '', error: err ? { message: err.message, kind: err.kind || null } : null,
      requests: v.requests, notUnderstood: nu, scores, promptSha: S.promptSha, userContent: userContent(ctx.names || [], text), renderedPromptTail: typeof vb.prompt === 'string' ? vb.prompt.slice(-200) : null, renderedPromptChars: typeof vb.prompt === 'string' ? vb.prompt.length : null,
      tokens: vb.tokens || null, usage: usage || null, timings: timings || null, settings: vb.generation_settings ? pick(vb.generation_settings, ['seed', 'temperature', 'top_k', 'top_p', 'min_p', 'samplers', 'n_probs', 'post_sampling_probs', 'n_predict', 'chat_format', 'reasoning_format', 'backend_sampling']) : null, ms, logs: out && out.logs || [] };
    return { nodes: mapped.nodes, analyses: mapped.analyses, notes, unread: [], qwen, ms, calls: 1, cutBy: 'qwen' };
  }
  const pick = (o, ks) => Object.fromEntries(ks.filter(k => k in o).map(k => [k, o[k]]));

  const api = {
    S,
    isReady: () => S.state === 'ready' && !!worker,
    /** download (or take from the cache), verify, start, first check; resolves when ready (or failed) */
    async load() {
      if (S.state === 'loading' || S.state === 'ready') return;
      const token = ++S.token, t0 = performance.now();
      Object.assign(S, { state: 'loading', error: null, stage: 'prepare', progress: { done: 0, total: 0 }, info: null, check: null }); changed();
      try {
        await prepare(); if (token !== S.token) return;
        startWorker();
        const R = S.reader;
        const cfg = { url: R.model.url, bytes: R.model.bytes, sha256: R.model.sha256, load: R.load,
          wllamaUrl: new URL('vendor/wllama-3.8.1/index.min.js', base).href, wasmUrl: new URL('vendor/wllama-3.8.1/wllama.wasm', base).href,
          runtimeSha256: { js: R.runtime.files['vendor/wllama-3.8.1/index.min.js'], wasm: R.runtime.files['vendor/wllama-3.8.1/wllama.wasm'] } };
        const info = await call('load', { cfg }); if (token !== S.token) return;
        S.info = info;
        // the file's own metadata must be the pinned model's, and the runtime must be on one CPU thread
        const E = R.model.expect, bad = [];
        if (info.sha256 !== R.model.sha256) bad.push('the model SHA-256 differs from the pin');
        if (info.meta.architecture !== E.architecture || info.meta.name !== E.name || String(info.meta.file_type) !== E.file_type) bad.push(`the model metadata is not the pinned one (${info.meta.architecture}, ${info.meta.name}, file type ${info.meta.file_type})`);
        if (info.ctx.n_vocab !== E.n_vocab || info.ctx.n_layer !== E.n_layer || info.ctx.token_eos !== E.eos) bad.push('the vocabulary, layers or end token differ from the pinned model');
        if (E.chat_template_sha256 && await hex(info.chatTemplate || '') !== E.chat_template_sha256) bad.push('the embedded chat template differs from the pinned one');
        if (info.multithread || info.threads !== 1) bad.push(`the runtime uses ${info.threads} threads`);
        if (bad.length) throw new Error(bad.join('; '));
        // the first check: one fixed sentence end to end (nothing is executed); it also fills the runtime's cache of the shared prompt
        S.stage = 'check'; changed();
        const c0 = performance.now(), ck = await api.formalize(R.check_sentence, { names: [], last: [] }, true); if (token !== S.token) return;
        const q = ck.qwen, cbad = [];
        if (!q.ok) cbad.push(q.errors.join('; '));
        if (q.reasoning) cbad.push('hidden reasoning was written');
        if (ck.analyses.some(a => a.scoreMissing)) cbad.push('token probabilities were missing: ' + ck.analyses.map(a => a.scoreMissing).filter(Boolean)[0]);
        S.check = { sentence: R.check_sentence, ms: performance.now() - c0, ok: !cbad.length, problems: cbad, raw: q.raw, usage: q.usage, timings: q.timings, tail: q.renderedPromptTail, settings: q.settings, requests: ck.analyses.map(a => ({ do: a.do, blocked: a.blocked, errors: a.errors, score: a.score })) };
        if (cbad.length) throw new Error('the first check failed: ' + cbad.join('; '));
        S.loadMs = performance.now() - t0; S.state = 'ready'; S.stage = null; changed();
      } catch (e) {
        if (token !== S.token) return;
        console.error(e); kill(e, 'failed');
      }
    },
    /** stop at once and free the memory (the drawing stays) */
    async unload() {
      if (worker) { try { await Promise.race([call('unload', {}), new Promise(r => setTimeout(r, 5000))]); } catch (e) { console.error(e); } }
      kill(null, 'idle');
    },
    stop(why) { kill(Object.assign(new Error(why || 'stopped'), { kind: 'stopped' }), 'failed'); },
    /** the cached model file (a worker is started for this when none runs) */
    async cacheInfo() {
      const tmp = !worker; if (tmp) startWorker();
      try { return await call('cache', { cfg: S.reader ? { sha256: S.reader.model.sha256 } : null }); } finally { if (tmp) { worker.terminate(); worker = null; } }
    },
    async clearCache() {
      await api.unload(); startWorker();
      try { return await call('clear', {}); } finally { if (worker) { worker.terminate(); worker = null; } changed(); }
    },
    /** one message -> a reading; ctx: {names, last}. A runtime failure is a reading too: every request held, with the reason */
    async formalize(text, ctx, check) {
      if (!check && !api.isReady()) throw new Error('Qwen3 is not loaded');
      const t0 = performance.now(); S.busy = true; changed();
      let out = null, err = null;
      // the chat template's control tokens are written <|...|>: a message or a name with these characters is not given to the model
      const names = (ctx && ctx.names) || [];
      if (/<\||\|>/.test(String(text)) || names.some(n => /<\||\|>/.test(String(n)))) err = Object.assign(new Error('the message or a name on the drawing contains the characters <| or |>, which the model’s chat template reserves'), { kind: 'refused' });
      else try { out = await complete(body(String(text), names)); }
      catch (e) { err = e; }
      finally { S.busy = false; }
      const r = reading(String(text), ctx || {}, out, err, performance.now() - t0);
      if (!check) S.readings++;
      changed();
      return r;
    }
  };
  return api;
}

/** the gate (QWEN3_PLAN.md B7): no calibrated threshold exists, so no request executes by itself; a request that did not pass the
 *  validation cannot run at all (no Do it anyway); a request that uses a held or blocked request is held with it.
 *  -> the gate object of docs/js/neural-confidence.js gate() (units, executed, held) */
export function qwenGate(result, text) {
  const units = [], owner = new Map();
  const nodesOf = a => result.nodes.filter(n => n.unit === a);
  if (!result.qwen.ok) {
    units.push({ index: 0, unit: null, src: String(text).trim(), conf: NaN, execute: false, sure: false, blocked: true, nodes: [], dependsOn: [],
      reasons: result.qwen.errors.slice(0, 3).map(t => ({ group: 'invalid', text: t })) });
  } else {
    result.analyses.forEach(a => {
      const nodes = nodesOf(a), u = { index: a.index, unit: a, src: a.src, act: a.do, conf: NaN, score: a.score, execute: false, sure: false, blocked: !!a.blocked, nodes, dependsOn: [], reasons: [] };
      if (a.blocked) u.reasons = a.errors.slice(0, 3).map(t => ({ group: 'invalid', text: t }));
      else {
        u.reasons.push({ group: 'calibration', text: 'this reader has no calibrated confidence threshold yet, so it does not act on its own' });   // no digits: the chat drops a reason with a number (ui.js plainReason), and the name Qwen3 has one
        if (a.scoreMissing) u.reasons.push({ group: 'signals', text: 'its token probabilities are missing, so its confidence is not known' });
      }
      for (const n of nodes) owner.set(n.id, u);
      units.push(u);
    });
    const refsOf = v => v && typeof v === 'object' && !Array.isArray(v) && typeof v.ref === 'string' ? [v.ref] : Array.isArray(v) ? v.flatMap(refsOf) : [];
    for (const u of units) for (const n of u.nodes) for (const r of Object.values(n.args || {}).flatMap(refsOf)) { const o = owner.get(r); if (o && o !== u && !u.dependsOn.includes(o)) u.dependsOn.push(o); }
    for (const u of units) if (!u.blocked && u.dependsOn.some(d => d.blocked)) { u.blocked = true; u.reasons = [{ group: 'depends', text: 'it uses a request that could not be read' }]; }
  }
  return { level: 'none', effective: 'none', label: 'no calibrated threshold: every request is held', threshold: NaN, safe: NaN, units, executed: [], held: units.slice() };
}
