// Runtime ownership, tokenizer and fail-closed contracts; no downloaded model is needed for the stub checks.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
globalThis.SOPKit = require('../../docs/js/logic.js');
const N = require('../../docs/js/neural.js');
const NC = await import('../../docs/js/neural-confidence.js');
const policy = 'wordwise-bpe-prefix-space-v1';
const layout = { tokenization: policy, acts: ['create'], tags: ['O'], classes: [], act_keys: { create: [] }, max_length: 128, cut: { max_length: 512 } };
const calls = [];
const tokenizer = { pad_token_id: 50283, encode(text) { calls.push(text); return !text ? [50281, 50282] : text.includes('longword') ? [11, 12, 13] : [text.startsWith(' ') ? 22 : 21]; } };
const T = { Tensor: class { constructor(type, data, dims) { Object.assign(this, { type, data, dims }); } } };
function stub(reader = layout) {
  const inputs = [];
  const model = async input => {
    inputs.push(input); const [b, n] = input.input_ids.dims;
    return { seq_logits: { data: new Float32Array(b).fill(3), dims: [b, 1] }, token_logits: { data: new Float32Array(b * n), dims: [b, n, 1] }, cut_logits: { data: Float32Array.from({ length: b * n * 3 }, (_, i) => i % 3 === 1 ? 10 : 0), dims: [b, n, 3] } };
  };
  model.config = { reader }; return { ...N.makeReader(T, tokenizer, model), inputs };
}
test('private reader models never replace or clear the legacy global cutter', async () => {
  const sys = SOPKit.createSystem(), old = N.create(sys.engine, sys.formalize), modern = N.create(sys.engine, sys.formalize, { activateCut: false, requireJoint: true });
  old.setModels({ cut: async () => [{ c0: 3, c1: 7 }] });
  modern.setModels({ cut: async () => [{ c0: 1, c1: 2 }] });
  assert.deepEqual(await modern.cut('text'), [{ c0: 1, c1: 2 }]);
  assert.deepEqual(await N.cut('text'), [{ c0: 3, c1: 7 }]);
  modern.setModels(null); assert.deepEqual(await N.cut('text'), [{ c0: 3, c1: 7 }]);
  modern.setModels({ act: async () => [] });
  await assert.rejects(modern.formalize('draw a circle'), /own trained joint model/);
});
test('prefix-space IDs, actual pad/mask, first indices and complete-word truncation', async () => {
  const m = stub(); calls.length = 0;
  const p = m.prepare('A  longword 😀', 5);
  assert.deepEqual(p.ids, [50281, 21, 50282]);
  assert.deepEqual([...p.first], [[0, 1]]); assert.equal(p.unreadFrom, 3); assert.equal(p.truncated, true);
  assert.deepEqual(calls, ['A', ' longword']);
  await m.readMany(['A B', 'A']);
  assert.deepEqual([...m.inputs[0].input_ids.data], [50281n, 21n, 22n, 50282n, 50281n, 21n, 50282n, 50283n]);
  assert.deepEqual([...m.inputs[0].attention_mask.data], [1n, 1n, 1n, 1n, 1n, 1n, 1n, 0n]);
  assert.equal((await m.read('A '.repeat(200))).truncated, true);
  const legacy = stub({ ...layout, tokenization: undefined });
  calls.length = 0; await legacy.readMany(['A B', 'A']);
  assert.deepEqual(calls, ['A', 'B', 'A']); assert.equal(legacy.inputs[0].input_ids.data.at(-1), 0n);
});
test('missing confidence and missing cost10 threshold hold at execute all; truncation cannot be forced', () => {
  const unit = { src: 'draw a circle' }, node = { id: 'n', type: 'command', args: { action: 'create' }, unit };
  const result = { nodes: [node], analyses: [unit] };
  for (const spec of [null, { levels_out_of_fold: {} }]) {
    const g = N.gateReader(NC, spec, result, 'all'); assert.equal(g.executed.length, 0); assert.equal(g.held.length, 1);
  }
  unit.truncated = true;
  const g = N.gateReader(NC, { levels_out_of_fold: { cost: { threshold: 0.9 } } }, result, 'all');
  assert.equal(g.executed.length, 0); assert.equal(g.held[0].blocked, true); assert.match(g.held[0].reasons[0].text, /token limit/);
});
test('message truncation removes the final possibly incomplete request and reports its original suffix', async () => {
  const m = stub({ ...layout, cut: { max_length: 5 } });
  const text = 'A B C D';
  const spans = await m.cut(text);
  assert.deepEqual(spans.map(u => [u.c0, u.c1]), [[0, 1], [2, 3]]);
  assert.deepEqual(m.cutInfo(text), { truncated: true, unreadFrom: 4 });
  const sys = SOPKit.createSystem(), modern = N.create(sys.engine, sys.formalize, { activateCut: false, requireJoint: true });
  modern.setModels(m);
  const result = await modern.formalize(text);
  assert.deepEqual(result.unread, ['C D']); assert.match(result.notes.join(' '), /token limit/);
});
const source = readFileSync(new URL('../../docs/js/neural.js', import.meta.url), 'utf8');
function browser(manifest, config = { model_type: 'modernbert', reader: layout, 'transformers.js_config': { use_external_data_format: 2 } }) {
  const fetched = [], entries = new Set();
  const context = { SOPKit, document: { currentScript: { src: 'https://example.test/js/neural.js' } }, URL, console,
    caches: { has: async () => true, open: async () => ({ match: async key => entries.has(key), keys: async () => [...entries].map(url => ({ url })), delete: async key => entries.delete(key) }) },
    fetch: async url => { fetched.push(url); return { ok: true, json: async () => url.endsWith('versions.json') ? manifest : config }; } };
  // Expose the private pruning entrypoint only in this isolated test context.
  vm.createContext(context); vm.runInContext(source.replace('return { NEXT_CONTEXT,', 'return { pruneStale, NEXT_CONTEXT,') + '\nglobalThis.kit = NeuralKit;', context);
  return { kit: context.kit, fetched, entries };
}
test('unpublished ModernBERT refuses loading without choosing legacy classifier or QA', async () => {
  const b = browser({ files: { 'neural/sop-bert': 'v1' }, sizes: {} });
  assert.deepEqual(Array.from(b.kit.modelsFor('modernbert')), ['ours/modernbert']);
  assert.equal((await b.kit.status('modernbert')).published, false);
  await assert.rejects(b.kit.load(null, 'modernbert'), /not published/);
  assert.equal(b.fetched.some(url => /act-distilbert|qa-distilbert|sop-bert\//.test(url)), false);
});
test('external chunks participate in status, URLs, bytes and cached checks', async () => {
  const sizes = { 'config.json': 10, 'tokenizer.json': 20, 'tokenizer_config.json': 30, 'onnx/model_quantized.onnx': 40, 'onnx/model_quantized.onnx_data': 50, 'onnx/model_quantized.onnx_data_1': 60 };
  const b = browser({ files: { 'neural/modernbert-c100': 'v2' }, sizes: { 'neural/modernbert-c100': sizes } });
  assert.equal((await b.kit.status('modernbert')).published, true);
  assert.equal(b.kit.bytesOf('ours/modernbert'), 210);
  const urls = b.kit.urlsFor('modernbert'); assert.equal(urls.length, 6);
  for (const url of urls.slice(0, -1)) b.entries.add(url);
  assert.equal(await b.kit.cached('modernbert'), false);
  b.entries.add(urls.at(-1)); assert.equal(await b.kit.cached('modernbert'), true);
  // the confidence file is the one fitted for the folder the tab reads; SOP-BERT keeps its own name
  assert.match(await b.kit.confidenceUrl('modernbert'), /\/model\/confidence\/modernbert-c100\.json\?v=/);
  assert.match(await b.kit.confidenceUrl('sop-bert'), /\/model\/confidence\/sop-bert\.json\?v=/);
  const bad = browser({ files: { 'neural/modernbert-c100': 'v2' }, sizes: { 'neural/modernbert-c100': { ...sizes, 'onnx/model_quantized.onnx_data_1': undefined } } });
  assert.equal((await bad.kit.status('modernbert')).published, false);
});
test('cache pruning retains the union of both readers and all chunks', async () => {
  const sizes = { 'config.json': 10, 'tokenizer.json': 20, 'tokenizer_config.json': 30, 'onnx/model_quantized.onnx': 40, 'onnx/model_quantized.onnx_data': 50, 'onnx/model_quantized.onnx_data_1': 60 };
  const b = browser({ files: { 'neural/modernbert-c100': 'm2', 'neural/sop-bert': 's1' }, sizes: { 'neural/modernbert-c100': sizes } });
  await b.kit.status('modernbert');
  const union = [...b.kit.urlsFor(), ...b.kit.urlsFor('modernbert')];
  for (const url of union) b.entries.add(url);
  // the first experiment's folder (docs/model/neural/modernbert/), no longer read: its cached chunk is stale
  b.entries.add('https://example.test/model/neural/modernbert/onnx/model_quantized.onnx_data?v=m1');
  b.entries.add('https://elsewhere.test/user-file');
  assert.equal(await b.kit.pruneStale(), 1);
  assert.ok(union.every(url => b.entries.has(url))); assert.ok(b.entries.has('https://elsewhere.test/user-file'));
});

test('ModernBERT card refreshes progress and terminal states after legacy loading is complete', () => {
  const ui = readFileSync(new URL('../../docs/js/ui.js', import.meta.url), 'utf8');
  const section = (start, end) => ui.slice(ui.indexOf(start), ui.indexOf(end, ui.indexOf(start)));
  const classes = new Set(), card = { hidden: true, innerHTML: '', classList: { remove: x => classes.delete(x), contains: x => classes.has(x) }, querySelector: () => null };
  const modern = { state: 'loading', progress: { L: 10, T: 100 }, status: null, error: null };
  const context = { modern, cur: { id: 'modernbert' }, sub: 'drawing', lo: { done: true, dismissed: false },
    $: selector => selector === '#loadov' ? card : null, isReady: () => modern.state === 'ready',
    updateTabs() {}, setStatus() {}, idleStatus: () => '',
    escH: String, mb: value => value + ' bytes', errHTML: e => '<p>' + e.message + '</p>' };
  vm.createContext(context);
  vm.runInContext([
    section('function loadProgress() {', '/** the first check:'),
    section('function renderCard() {', "document.addEventListener('click', ev => {"),
    section('function refreshReaders() {', 'function modernBoxHTML() {'),
    section('function modernBoxHTML() {', 'async function checkModern() {'),
    'globalThis.refresh = refreshReaders;',
  ].join('\n'), context);
  context.refresh(); assert.equal(card.hidden, false); assert.match(card.innerHTML, /10 bytes of 100 bytes/);
  modern.progress.L = 60; context.refresh(); assert.match(card.innerHTML, /60 bytes of 100 bytes/);
  modern.state = 'failed'; modern.error = new Error('missing graph'); context.refresh(); assert.match(card.innerHTML, /could not be loaded/); assert.match(card.innerHTML, /missing graph/);
  modern.state = 'unpublished'; context.refresh(); assert.match(card.innerHTML, /not published yet/);
  modern.state = 'ready'; context.refresh(); assert.equal(card.hidden, true); assert.equal(card.innerHTML, '');
});

const fixtureTokenizer = process.env.MODERNBERT_TOKENIZER;
test('real pinned tokenizer agrees exactly with Python fixtures, including Unicode and caps', { skip: !fixtureTokenizer && 'Set MODERNBERT_TOKENIZER to the pinned tokenizer folder; requires local Transformers.js' }, async () => {
  const laptopRequire = createRequire(new URL('../laptop/package.json', import.meta.url));
  const transformers = laptopRequire('@huggingface/transformers');
  transformers.env.allowRemoteModels = false; transformers.env.useBrowserCache = false;
  const tok = await transformers.AutoTokenizer.from_pretrained(fixtureTokenizer, { local_files_only: true });
  const fx = JSON.parse(readFileSync(new URL('fixtures/modernbert_alignment.json', import.meta.url), 'utf8'));
  const model = () => {}; model.config = { reader: layout };
  const m = N.makeReader(T, tok, model);
  for (const c of fx.cases) {
    const p = m.prepare(c.text, c.limit); assert.deepEqual({ ...p, first: [...p.first] }, c.prepared, c.text.slice(0, 60));
  }
  assert.equal(tok.pad_token_id, fx.pad_token_id);
});
