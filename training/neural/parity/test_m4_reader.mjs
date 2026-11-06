// test_m4_reader.mjs: the second read of docs/js/neural.js (arm M4) and its confidence signals, with a scripted model (no ONNX), checks a defect would fail:
//   - a request that needs nothing from the drawing gets no second read; a model without reader.drawing never reads the drawing, and its output is
//     the same with and without ctx.drawing;
//   - a role read as a description is answered by the tags on the drawing's names; tags on the request's own words, or on a word that heads no
//     line, are not read;
//   - a role the second read cannot answer, when the cap left lines out, holds the request (gateReader);
//   - the confidence: every request of a reading with the drawing carries the draw_* keys (empty without a second read), a reading without it none.
//   node training/neural/parity/test_m4_reader.mjs      (M4_JS_DIR=folder: neural.js, neural-confidence.js and drawing-lines.js from that folder)
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { K } from './parity_lib.mjs';

const DIR = process.env.M4_JS_DIR || new URL('../../../docs/js/', import.meta.url).pathname;
globalThis.SOPKit = K;
const N = createRequire(import.meta.url)(DIR + '/neural.js'), DL = createRequire(import.meta.url)(DIR + '/drawing-lines.js');
const NC = await import(DIR + '/neural-confidence.js');
let n = 0; const ok = async (name, f) => { await f(); n++; console.log('ok', name); };

const FILL = ['none', 'written', 'context', 'description'], TAGS = ['O', 'B-target', 'I-target'];
const READER = { acts: ['delete', 'none'], tags: TAGS, classes: [['fill:target', FILL]], ref_keys: ['target'], desc_keys: [], act_keys: { delete: ['target'] }, cut: { max_length: 512 } };
const WRE = /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu, words = t => [...String(t).matchAll(WRE)].map(m => ({ w: m[0], start: m.index, end: m.index + m[0].length }));
/** a read result as makeReader's decodeOne gives it: tags on the words listed (word -> tag), the fill head's value */
function readOf(text, { fill = 'written', tagged = {} } = {}) {
  const ws = words(text), tags = ws.map(w => (typeof tagged === 'function' ? tagged(w, text) : tagged[w.w]) || 'O'), spans = {};
  ws.forEach((w, i) => { if (tags[i] !== 'O') (spans.target || (spans.target = [])).push({ text: w.w, start: w.start, end: w.end, score: 0.9 }); });
  const seq = [3, 0, ...FILL.map(v => (v === fill ? 3 : 0))], tok = tags.map(t => TAGS.map(x => (x === t ? 4 : 0)));
  const R = { words: ws.map(w => w.w), ids: [], acts: [{ label: 'delete', score: 0.9 }, { label: 'none', score: 0.1 }], classes: { 'fill:target': { value: fill === 'none' ? null : fill, score: 0.9 } }, tags, spans, truncated: false };
  Object.defineProperty(R, 'logits', { value: { seq, tok, pieces: ws.map(() => [1]) }, enumerable: false });
  return R;
}
/** a scripted model: first reads by request text, second reads by a function of the input text */
function model({ drawing = true, first, second = () => ({}), cap = 512 }) {
  const calls = { read: 0, drawing: 0 };
  const m = {
    reader: drawing ? { ...READER, drawing: { format: DL.FORMAT, max_length: 512 } } : READER,
    readMany: async ts => { calls.read++; return ts.map(t => readOf(t, first(t))); },
    read: async t => readOf(t, first(t)),
    cut: async t => [{ c0: 0, c1: t.length }],
    ...(drawing ? { readDrawing: async ts => { calls.drawing++; return ts.map(t => readOf(t, second(t))); }, pieceCount: t => words(t).length + 2, drawingCap: cap } : {}),
  };
  return { m, calls };
}
const reader = mm => { const r = N.create(K.createSystem().engine, () => { throw new Error('rules'); }, { activateCut: false, requireJoint: true }); r.setModels(mm); r.setStrategy('finetuned'); return r; };
const state = { shapes: [{ name: 'Sun', shape: 'circle', color: 'yellow', size: 88, order: 1 }, { name: 'Cloud', shape: 'ellipse', color: 'gray', size: 62, order: 2 }], edges: [], groups: [] };
const ctx = (extra = {}) => ({ names: ['Sun', 'Cloud'], last: [], drawing: { state, sources: new Map([['sun', 'a big yellow circle up in the corner']]) }, ...extra });
const target = res => res.nodes.find(x => x.type !== 'mention').args.target;

await ok('a request with its shape written gets no second read', async () => {
  const { m, calls } = model({ first: () => ({ fill: 'written', tagged: { Sun: 'B-target' } }) });
  const res = await reader(m).formalize('delete Sun', ctx(), {});
  assert.equal(calls.drawing, 0); assert.equal(target(res), 'Sun'); assert.equal(res.analyses[0].drawing, undefined);
  const f = NC.signals(res, 0).f;   // a reading with the drawing: every request carries the draw_* keys, empty without a second read
  assert.deepEqual([f.draw_tag_p_min, f.draw_tag_margin_min, f.draw_roles, f.draw_roles_asked, f.draw_lines_cut], [null, null, 0, 0, 0]);
});

await ok('a description is answered by the tag on a drawing name; request words and non-head words are not read', async () => {
  const { m, calls } = model({ first: () => ({ fill: 'description' }), second: () => ({ tagged: { thing: 'B-target', yellow: 'B-target', Sun: 'B-target' } }) });
  const res = await reader(m).formalize('delete the round yellow thing', ctx(), {});
  assert.equal(calls.drawing, 1);
  assert.equal(target(res), 'Sun', 'only the head of a drawing line counts');
  assert.equal(res.nodes.filter(x => x.type === 'mention').length, 0, 'the unused mention is dropped');
  assert.equal(res.analyses[0].keys.target.source, 'drawing (second read)');
  const f = NC.signals(res, 0).f;
  assert.equal(f.draw_roles, 1); assert.ok(f.draw_tag_p_min > 0.9 && f.draw_tag_p_min < 1); assert.equal(f.draw_lines_cut, 0);
});

await ok('a name tagged only inside an edge line, a member list or the quoted words is not taken (training tags only the head)', async () => {
  const st2 = { shapes: state.shapes, edges: [{ id: 'e1', from: 'Sun', to: 'Cloud', arrow: 'end' }], groups: [{ name: 'Sky', members: ['Sun', 'Cloud'] }] };
  const c2 = () => ({ names: ['Sun', 'Cloud'], last: [], drawing: { state: st2, sources: new Map([['sun', 'a big circle by the Cloud']]) } });
  // tag only the occurrence of Cloud that starts after the marker, never the head of the Cloud line
  const afterMarker = marker => (w, t) => (w.w === 'Cloud' && w.start > t.indexOf(marker) && t.indexOf(marker) >= 0 ? 'B-target' : null);
  for (const [what, marker] of [['edge line', 'Sun -> '], ['member list', 'group Sky: '], ['quoted words', 'a big circle by the ']]) {
    const { m } = model({ first: () => ({ fill: 'description' }), second: () => ({ tagged: afterMarker(marker) }) });
    let seen = null; const rd = m.readDrawing; m.readDrawing = async ts => { seen = ts[0]; return rd(ts); };
    const res = await reader(m).formalize('delete the gray thing', c2(), {});
    assert.ok(seen.includes(marker), what + ': the marker is in the second-read input: ' + JSON.stringify(seen));
    assert.notEqual(res.analyses[0].keys.target.source, 'drawing (second read)', what + ': a tag outside a head is not an answer');
    assert.equal(res.analyses[0].drawing.found.target, null, what);
  }
  // and the tag on the head itself is still taken
  const { m } = model({ first: () => ({ fill: 'description' }), second: () => ({ tagged: (w, t) => (w.w === 'Cloud' && t.indexOf('Cloud:') === w.start ? 'B-target' : null) }) });
  assert.equal(target(await reader(m).formalize('delete the gray thing', c2(), {})), 'Cloud');
});

await ok('no name tagged on the drawing: the first read stands', async () => {
  const { m } = model({ first: () => ({ fill: 'context' }), second: () => ({ tagged: { yellow: 'B-target' } }) });
  const res = await reader(m).formalize('delete it', ctx({ last: ['Cloud'] }), {});
  assert.equal(target(res), 'Cloud'); assert.equal(res.analyses[0].drawingCut, undefined);
  assert.equal(NC.signals(res, 0).f.draw_roles, 0);
});

await ok('a written name neither on the drawing nor made earlier triggers it', async () => {
  const { m, calls } = model({ first: () => ({ fill: 'written', tagged: { Sunny: 'B-target' } }), second: () => ({ tagged: { Sun: 'B-target' } }) });
  const res = await reader(m).formalize('delete Sunny', ctx(), {});
  assert.equal(calls.drawing, 1); assert.equal(target(res), 'Sun');
});

await ok('a model without reader.drawing never reads the drawing', async () => {
  const { m, calls } = model({ drawing: false, first: () => ({ fill: 'description' }) });
  const a = await reader(m).formalize('delete the round yellow thing', ctx(), {});
  const b = await reader(m).formalize('delete the round yellow thing', { names: ['Sun', 'Cloud'], last: [] }, {});
  assert.equal(calls.drawing, 0);
  assert.equal(JSON.stringify([a.nodes, a.notes, a.analyses]), JSON.stringify([b.nodes, b.notes, b.analyses]));
  assert.equal(a.joint.drawing, undefined);
  assert.equal(Object.keys(NC.signals(a, 0).f).filter(k => k.startsWith('draw_')).length, 0, 'no draw_* keys without the drawing');
});

await ok('lines left out by the cap and no name found: the request is held', async () => {
  const { m } = model({ first: () => ({ fill: 'description' }), second: () => ({}), cap: 12 });
  const res = await reader(m).formalize('delete the round yellow thing', ctx(), {});
  assert.equal(res.analyses[0].drawingCut, true);
  const g = N.gateReader(NC, null, res, 'all');
  const u = g.units.find(x => x.unit === res.analyses[0]);
  assert.equal(u.execute, false); assert.match(u.reasons[0].text, /drawing/);
  assert.equal(g.executed.length, 0);
});
console.log(`${n} checks passed`);
