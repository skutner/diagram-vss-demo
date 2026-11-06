// collect_qwen.mjs: the Qwen3 reader, as the page runs it (docs/js/qwen-contract.js: the fixed prompt, the JSON schema, validation, wires,
// score), on the named sets of training/neural/parity/sets.mjs, through a native llama-server instead of wllama. One record per message in
// the format of training/neural/parity/arm_lib.mjs buildRecord, so that score_arm.mjs's scorePart reads it as any reader's, plus `qwen`:
// the raw output, validation errors, per-request scores, token counts and timings.
//   SERVER=http://127.0.0.1:8090 [LIMIT=n] [PART=calibration|development|...] [EVERY=k] [DRAWING=setup] [VARIANT=name]
//     node collect_qwen.mjs --train-data DIR OUT.jsonl SET...
// --train-data DIR: as collect_set.mjs (DIR/trigger_inventory.json: the seen / unseen split). The context of a read is collect_set.mjs's:
// names = the row's names and group names; last = [] for a single message, in a session what the gold of the previous step touched.
// DRAWING=setup (a variant, not the reader as shipped): the user turn also gets the row's drawing as SOP Lang lines (the setup, or the gold
// replay of a session), after the names. EVERY=k: only every k-th message of each set (a sample; records say so). Resumable as collect_set.
// A message whose request fails gets a record with `error`. Nothing is written into the repository unless OUT is there.
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { buildSpec, buildSchema, buildPrompt, userContent, validate, toNodes, tokensOf, scoreRequests } from '../../../docs/js/qwen-contract.js';
import { K, touched } from '../../neural/parity/parity_lib.mjs';
import { loadSets, contextNames } from '../../neural/parity/sets.mjs';
import { buildRecord, seenFunction, startSystem, playGold, refsOf } from '../../neural/parity/arm_lib.mjs';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const sha = s => createHash('sha256').update(s).digest('hex');
globalThis.SOPKit = K;
const NK = (0, eval)(readFileSync(ROOT + '/docs/js/neural.js', 'utf8').replace('/*NEURAL-START*/', '') + '\nNeuralKit');
const THINK_OFF_SUFFIX = '<|im_start|>assistant\n<think>\n\n</think>\n\n';

const args = process.argv.slice(2), pos = []; let dataDir = null, exFile = null, allowText = false;
for (let i = 0; i < args.length; i++) { if (args[i] === '--train-data') dataDir = args[++i]; else if (args[i] === '--examples') exFile = args[++i]; else if (args[i] === '--allow-text-overlap') allowText = true; else pos.push(args[i]); }
const [out, ...setNames] = pos, server = process.env.SERVER;
if (!out || !setNames.length || !dataDir || !server) throw new Error('SERVER=url node collect_qwen.mjs --train-data DIR OUT.jsonl SET...');
const inv = JSON.parse(readFileSync(resolve(dataDir, 'trigger_inventory.json'), 'utf8'));
const seen = seenFunction({ exact: inv.triggers });

const reader = JSON.parse(readFileSync(ROOT + '/docs/model/qwen3/reader.json', 'utf8'));
const S0 = K.createSystem(), spec = buildSpec(S0.engine.legend, reader, K.serialize);
const wireDocs = Object.fromEntries([...S0.engine.wireTypes].map(([t, w]) => [t, w.doc]));
const prompt = process.env.PROMPT_FILE ? readFileSync(process.env.PROMPT_FILE, 'utf8') : buildPrompt(spec, reader, wireDocs), schema = buildSchema(spec);
if (!process.env.PROMPT_FILE && sha(prompt) !== reader.prompt_sha256) throw new Error('the prompt differs from the pinned one');
if (sha(JSON.stringify(schema)) !== reader.schema_sha256) throw new Error('the schema differs from the pinned one');
const variant = process.env.VARIANT || (process.env.DRAWING ? 'drawing-' + process.env.DRAWING : 'as-shipped');

const drawingLines = sys => {
  // the drawing as SOP Lang (K.worldSOP: one wire per shape, connection and group); a drawing that cannot be written stops the run
  const s = String(K.worldSOP(sys.world.state)).trim();
  if (sys.world.state.shapes.length && !s) throw new Error('the drawing has shapes but K.worldSOP wrote nothing');
  return s;
};
function body(text, names, drawing) {
  let user = userContent(names, text);
  if (drawing) user = user.replace(/\n?$/, '') + '\n\nThe drawing now:\n' + drawing;
  return Object.assign({ messages: [{ role: 'system', content: prompt }, { role: 'user', content: user }],
    response_format: { type: 'json_schema', json_schema: { name: 'diagram_requests', schema, strict: true } } }, reader.request, { stream: false },
    process.env.TOP2 ? { top_logprobs: 2 } : {});
}
async function complete(b) {
  const t0 = Date.now();
  const r = await fetch(server + '/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const j = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return { res: j, ms: Date.now() - t0 };
}

function reading(text, ctx, res) {
  const ch = res.choices && res.choices[0], msg = (ch && ch.message) || {}, vb = res.__verbose || {};
  const tk = ch ? tokensOf(ch.logprobs, vb.tokens) : { error: 'no response' };
  const raw = !tk.error ? tk.text : typeof vb.content === 'string' ? vb.content : typeof msg.content === 'string' ? msg.content : '';
  const errors = [];
  if (typeof vb.prompt === 'string' && !vb.prompt.endsWith(THINK_OFF_SUFFIX)) errors.push('the rendered prompt does not end with the empty thinking block');
  const v = validate(spec, { content: raw, finish: ch ? ch.finish_reason : null, reasoning: msg.reasoning_content || '', error: null }, { text, names: ctx.names, last: ctx.last });
  if (errors.length) { v.errors.push(...errors); v.ok = false; }
  const scores = v.ok ? scoreRequests(v, tk, raw) : [];
  const mapped = v.ok ? toNodes(spec, v, { names: ctx.names, last: ctx.last }, NK.NEXT_CONTEXT) : { nodes: [], analyses: [] };
  return { v, raw, tk, scores, mapped, finish: ch ? ch.finish_reason : null, vb };
}
/** a reading -> the run that buildRecord takes: one main per executed (not blocked) request, its mention wires, its quote's span */
function runOf(rd) {
  const nodes = rd.mapped.nodes, byId = new Map(nodes.map(n => [n.id, n])), owner = new Map(nodes.map(n => [n.id, n.unit?.id]));
  const mains = nodes.filter(n => n.type !== 'mention').map(n => {
    const a = n.unit, sc = rd.scores[a.index] || null, refs = [...new Set(Object.values(n.args || {}).flatMap(refsOf))];
    const f = sc && Number.isFinite(sc.min) ? { score_min: sc.min, weakest: sc.weakest, fields: sc.fields.map(x => [x.name, x.mean, x.n]) } : null;
    return { node: n, mentions: refs.map(id => byId.get(id)).filter(x => x && x.type === 'mention'), span: n.span ? [n.span[0], n.span[1]] : [0, 0], src: n.src || '',
      f, act: f ? n.type + ':' + (n.args.action || n.args.ask || n.type) : null, truncated: false, wireId: a.id,
      dependencies: [...new Set(refs.map(id => owner.get(id)).filter(id => id && id !== a.id))] };
  });
  return { reader: 'qwen', cut: 'own', mains, allNodes: nodes, unread: [], cutInfo: null };
}

const sets = loadSets(setNames);
let items = sets.flatMap(s => s.items);
const every = +(process.env.EVERY || 1), part = process.env.PART || null;
const keep = new Set(sets.flatMap(s => s.items.filter((it, i) => i % every === 0 && (!part || it.part === part)).map(it => it.id)));
// whole sessions are kept or dropped together (a step needs the earlier ones for its context)
const sessKeep = new Set(items.filter(it => it.session != null && keep.has(it.id)).map(it => it.set + '\0' + it.session));
items = items.filter(it => it.session != null ? sessKeep.has(it.set + '\0' + it.session) && (!part || it.part === part) : keep.has(it.id));
if (process.env.LIMIT) items = items.slice(0, +process.env.LIMIT);

const artifacts = sha(JSON.stringify({ gguf: process.env.GGUF_SHA256 || 'unstated', prompt: sha(prompt), schema: reader.schema_sha256, request: reader.request, variant }));
const doneIds = new Set(existsSync(out) ? readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
const manifest = { tool: 'training/qwen/finetune/collect_qwen.mjs', server, variant, gguf_sha256: process.env.GGUF_SHA256 || null, prompt_sha256: sha(prompt), schema_sha256: reader.schema_sha256,
  request: reader.request, sets: setNames, every, part, limit: process.env.LIMIT || null, messages: items.length, train_data: { dir: resolve(dataDir), inventory_sha256: sha(JSON.stringify(inv.triggers)) },
  artifacts_sha256: artifacts, started: new Date().toISOString() };
writeFileSync(out + '.manifest.json', JSON.stringify(manifest, null, 1));

// training/evaluation overlap (as collect_set.mjs): an evaluated message with the id or the text of one of the arm's training examples is
// refused, or with --allow-text-overlap marked (records carry in_training) and reported. --examples: the arm's make_examples.mjs output.
const norm = t => String(t).toLowerCase().replace(/\s+/g, ' ').trim();
const exIds = new Set(), exTexts = new Set();
if (exFile) for (const l of readFileSync(exFile, 'utf8').split('\n').filter(Boolean)) { const e = JSON.parse(l); exIds.add(e.id); const k = e.user.lastIndexOf('Message:\n'); exTexts.add(norm(k >= 0 ? e.user.slice(k + 9) : e.user)); }
const byId = items.filter(it => exIds.has(it.id)), byText = items.filter(it => exTexts.has(norm(it.text)));
if (byId.length) throw new Error(`${byId.length} evaluated messages have the id of a training example (${byId.slice(0, 3).map(x => x.id).join(', ')})`);
if (byText.length && !allowText) throw new Error(`${byText.length} evaluated messages have the text of a training example (${byText.slice(0, 3).map(x => x.id).join(', ')}); pass --allow-text-overlap to mark them`);
manifest.overlap = { examples: exFile ? resolve(exFile) : null, examples_sha256: exFile ? createHash('sha256').update(readFileSync(exFile)).digest('hex') : null, same_text: byText.map(x => x.id) };
manifest.code = Object.fromEntries(['training/qwen/finetune/collect_qwen.mjs', 'docs/js/qwen-contract.js', 'docs/js/logic.js', 'docs/js/neural.js', 'docs/js/bench-canon.js', 'training/neural/parity/arm_lib.mjs', 'training/neural/parity/sets.mjs', 'training/neural/parity/parity_lib.mjs', 'training/sketch/layer_common.mjs', 'docs/model/qwen3/reader.json'].map(f => [f, createHash('sha256').update(readFileSync(ROOT + '/' + f)).digest('hex')]));
writeFileSync(out + '.manifest.json', JSON.stringify(manifest, null, 1));
const overlapText = new Set(byText.map(x => x.id));
let session = null, G = null, last = [], n = 0; const t0 = Date.now();
for (const it of items) {
  if (it.session != null) { if (it.session !== session) { session = it.session; G = startSystem(it.setup); last = []; } }
  else { session = null; G = null; last = []; }
  const names = contextNames(it);
  if (!doneIds.has(it.id)) {
    let run, error = null, q = null;
    try {
      const drawing = process.env.DRAWING === 'setup' ? drawingLines(G ? G.s : startSystem(it.setup).s) : '';
      const { res, ms } = await complete(body(it.text, names.slice(), drawing));
      const rd = reading(it.text, { names: names.slice(), last: last.slice() }, res);
      run = runOf(rd);
      q = { ok: rd.v.ok, errors: rd.v.errors, blocked: rd.mapped.analyses.filter(a => a.blocked).map(a => ({ id: a.id, errors: a.errors })), raw: rd.raw, finish: rd.finish,
        scores: rd.scores.map(s => ({ min: s.min, weakest: s.weakest, missing: s.missing })), not_understood: rd.v.notUnderstood || [], ms, usage: res.usage || null,
        timings: res.timings || null, prompt: process.env.KEEP_PROMPT ? (typeof rd.vb.prompt === 'string' ? rd.vb.prompt : null) : undefined, prompt_tail_ok: typeof rd.vb.prompt === 'string' ? rd.vb.prompt.endsWith(THINK_OFF_SUFFIX) : null, drawing_chars: drawing.length,
        // per generated token: id, log-probability, and the second-best log-probability when top_logprobs >= 2 (the parity gate's margin)
        tokens: (res.choices?.[0]?.logprobs?.content || []).map(t => [t.id, t.logprob, t.top_logprobs?.[1]?.logprob ?? null]) };
    } catch (e) { error = String(e && e.message || e); run = { reader: 'qwen', cut: 'own', mains: [], allNodes: [], unread: [], cutInfo: null, error }; console.error(`FAILED ${it.id}: ${error}`); }
    const rec = buildRecord(it, run, { seen, artifactsKey: artifacts });
    rec.artifacts_sha256 = artifacts; rec.qwen = q; rec.variant = variant; rec.in_training = overlapText.has(it.id) ? 'text' : null;
    appendFileSync(out, JSON.stringify(rec) + '\n');
  }
  if (G) { const res = playGold(G.s, it.wires); last = touched(G.s, res); }
  if (++n % 25 === 0) console.error(`${n} of ${items.length}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
manifest.finished = new Date().toISOString();
// the manifest training/neural/parity/arm_lib.mjs loadRecords requires: complete, with the record count and the file's hash
const recLines = readFileSync(out, 'utf8').split('\n').filter(l => l.trim());
manifest.complete = recLines.length === items.length; manifest.records = { count: recLines.length, sha256: createHash('sha256').update(readFileSync(out)).digest('hex') };
writeFileSync(out + '.manifest.json', JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ out, messages: items.length }));
