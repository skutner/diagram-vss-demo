// test_label_arms.mjs: the decode side of the label arms L1 and L2 (MODERNBERT_PARITY_PLAN.md), with a stand-in model through the real docs/js/neural.js
// (create / formalizeJoint / role) and docs/js/neural-confidence.js (signals). Each check fails on a defect:
//   - a reader with the head implied:scale and no tagged number decodes resize with the head's scale, and the engine then shrinks the shape;
//   - a tagged number wins over the head; a head that says none, or a reader without the head, gives no scale (the shipped decode);
//   - reader.number_words_from = "table" reads "forty five" as 45; a reader without it uses its learned map only;
//   - the confidence reads the implied head as a value head (val_p_min / none_p_min), and the tags when the number was tagged.
//   node training/neural/parity/test_label_arms.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../../../docs/js/logic.js');
globalThis.SOPKit = K;
const N = require('../../../docs/js/neural.js');
const NC = await import('../../../docs/js/neural-confidence.js');

let fails = 0;
const check = (name, ok, detail = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '  ' + detail)); if (!ok) fails++; };
const FILL = ['none', 'written', 'context', 'description'];
const TAGS = ['O', 'B-target', 'I-target', 'B-scale', 'I-scale', 'B-distance', 'I-distance'];
const readerOf = ({ implied = true, table = false, numberWords = {} } = {}) => ({
  acts: ['resize', 'move', 'create'], tags: TAGS, span_keys: ['distance', 'scale', 'target'], ref_keys: ['target'], desc_keys: [], desc2_keys: [],
  classes: [['direction', ['none', 'left', 'right']], ['fill:target', FILL], ...(implied ? [['implied:scale', ['none', '0.67', '0.8', '2']]] : [])],
  act_keys: { resize: ['scale', 'target'], move: ['direction', 'distance', 'target'] }, number_words: numberWords, ...(table ? { number_words_from: 'table' } : {}),
});
const HI = 9;
/** a read() result of the stand-in model: act, class values (key -> value or null), word tags; with the head logits the confidence reads */
function readOf(R, text, act, cls, tags) {
  const ws = N.wordsOf(text), nA = R.acts.length, seq = new Array(nA + R.classes.reduce((s, [, v]) => s + v.length, 0)).fill(0);
  seq[R.acts.indexOf(act)] = HI;
  let o = nA; const classes = {};
  for (const [k, vals] of R.classes) { const v = cls[k] ?? null, i = v == null ? 0 : vals.indexOf(v); if (i < 0) throw new Error('no class ' + v); seq[o + i] = HI; classes[k] = { value: i ? vals[i] : null, score: 0.99 }; o += vals.length; }
  const tg = ws.map((w, i) => tags[i] || 'O'), tok = tg.map(t => { const l = new Array(R.tags.length).fill(0); l[R.tags.indexOf(t)] = HI; return l; });
  const spans = {}; let cur = null;
  tg.forEach((t, i) => { if (t === 'O') { cur = null; return; } const k = t.slice(2), L = spans[k] || (spans[k] = []); if (t[0] === 'I' && cur === k) L[L.length - 1].j = i + 1; else { L.push({ i, j: i + 1 }); cur = k; } });
  for (const k of Object.keys(spans)) spans[k] = spans[k].map(s => ({ text: text.slice(ws[s.i].start, ws[s.j - 1].end), start: ws[s.i].start, end: ws[s.j - 1].end, score: 0.99 }));
  const res = { words: ws.map(w => w.w), acts: R.acts.map(label => ({ label, score: label === act ? 0.99 : 0.01 / (nA - 1) })).sort((a, b) => b.score - a.score), classes, tags: tg, spans };
  Object.defineProperty(res, 'logits', { value: { seq, tok, pieces: ws.map((w, i) => [100 + i]) }, enumerable: false });
  return res;
}
async function decode(R, text, act, cls, tags) {
  const r = readOf(R, text, act, cls, tags);
  const neural = N.create(K.createSystem().engine, () => { throw new Error('the Rules were called'); }, { activateCut: false });
  neural.setModels({ reader: R, unk: 0, read: async () => r, readMany: async ts => ts.map(() => r) });
  neural.setStrategy('finetuned');
  const out = await neural.formalize(text, { names: ['Box'], last: [] }, { units: [{ c0: 0, c1: text.length }] });
  return { out, node: out.nodes.find(n => n.type === 'command'), sig: NC.signals(out, 0) };
}
const T = (n, ...xs) => { const t = new Array(n).fill('O'); for (const [i, v] of xs) t[i] = v; return t; };

// 1. the implied head: "shrink Box" -> scale 0.67, and the engine makes Box smaller
let d = await decode(readerOf(), 'shrink Box', 'resize', { 'fill:target': 'written', 'implied:scale': '0.67' }, T(2, [1, 'B-target']));
check('implied head, no tagged number: resize decodes with the head\'s scale', d.node && d.node.args.scale === 0.67 && d.node.args.target === 'Box', JSON.stringify(d.node && d.node.args));
check('implied head: the read is marked implied, from the class head', d.out.analyses[0].keys.scale.implied === true && d.out.analyses[0].keys.scale.source === 'neural (implied)');
{
  const sys = K.createSystem(); sys.engine.run([{ id: 'c1', type: 'command', args: { action: 'create', shape: 'circle', name: 'Box' } }], {});
  const before = sys.world.state.shapes[0].size; sys.engine.run([d.node], {});
  const after = sys.world.state.shapes[0].size;
  check('implied head: the engine makes the shape smaller (was ' + before + ', now ' + after + ')', after < before);
  const sys2 = K.createSystem(); sys2.engine.run([{ id: 'c1', type: 'command', args: { action: 'create', shape: 'circle', name: 'Box' } }], {});
  sys2.engine.run([{ id: 'c1', type: 'command', args: { action: 'resize', target: 'Box' } }], {});
  check('without a scale the engine grows the shape (why L2 exists)', sys2.world.state.shapes[0].size > before);
}
check('implied head: the confidence reads it as a value head (val_p_min)', d.sig && d.sig.f.val_p_min > 0.99 && d.sig.f.none_p_min === null && d.sig.detail.low.val.key === 'scale' && d.sig.detail.low.val.value === '0.67', JSON.stringify(d.sig && d.sig.f));
check('implied head: no tag signal comes from the implied value', d.sig && d.sig.f.tag_p_min > 0.99, JSON.stringify(d.sig && d.sig.f));

// 2. a tagged number wins over the head
d = await decode(readerOf(), 'scale Box by 1.5', 'resize', { 'fill:target': 'written', 'implied:scale': '0.67' }, T(5, [1, 'B-target'], [3, 'B-scale'], [4, 'I-scale'], [5, 'I-scale']));
check('a tagged number wins over the implied head', d.node && d.node.args.scale === 1.5, JSON.stringify(d.node && d.node.args));
check('a tagged number is not marked implied', !d.out.analyses[0].keys.scale.implied);

// 3. the head says none, and a reader without the head (the shipped decode)
d = await decode(readerOf(), 'make Box bigger', 'resize', { 'fill:target': 'written' }, T(3, [1, 'B-target']));
check('implied head says none: no scale', d.node && !('scale' in d.node.args), JSON.stringify(d.node && d.node.args));
check('implied head says none: the confidence counts it as a value head (none_p_min)', d.sig && d.sig.f.none_p_min > 0.99 && d.sig.f.val_p_min === null, JSON.stringify(d.sig && d.sig.f));
d = await decode(readerOf({ implied: false }), 'shrink Box', 'resize', { 'fill:target': 'written' }, T(2, [1, 'B-target']));
check('a reader without the head: no scale, no value head in the confidence', d.node && !('scale' in d.node.args) && d.sig.f.val_p_min === null && d.sig.f.none_p_min === null, JSON.stringify(d.node && d.node.args) + JSON.stringify(d.sig && d.sig.f));

// 4. number words: the table only for a reader built with it
const fortyFive = [[2, 'B-distance'], [3, 'I-distance']];
d = await decode(readerOf({ table: true, numberWords: { forty: '40', five: '5' } }), 'move Box forty five px left', 'move', { 'fill:target': 'written', direction: 'left' }, T(6, [1, 'B-target'], ...fortyFive));
check('number_words_from table: "forty five" -> 45', d.node && d.node.args.distance === 45, JSON.stringify(d.node && d.node.args));
d = await decode(readerOf({ numberWords: { forty: '40', five: '5' } }), 'move Box forty five px left', 'move', { 'fill:target': 'written', direction: 'left' }, T(6, [1, 'B-target'], ...fortyFive));
check('without number_words_from: the learned map only ("forty five" is not in it: no distance)', d.node && !('distance' in d.node.args), JSON.stringify(d.node && d.node.args));
d = await decode(readerOf({ table: true, numberWords: { lights: '2' } }), 'move Box lights left', 'move', { 'fill:target': 'written', direction: 'left' }, T(4, [1, 'B-target'], [2, 'B-distance']));
check('table reader: a word the table does not read falls back to the map, as the branch decodes', d.node && d.node.args.distance === 2, JSON.stringify(d.node && d.node.args));
d = await decode(readerOf({ table: true }), 'move Box one px left', 'move', { 'fill:target': 'written', direction: 'left' }, T(5, [1, 'B-target'], [2, 'B-distance']));
check('table reader: "one" is not in the table', d.node && !('distance' in d.node.args), JSON.stringify(d.node && d.node.args));

console.log(fails ? `${fails} check(s) FAILED` : 'PASS');
process.exit(fails ? 1 : 0);
