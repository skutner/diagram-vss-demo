// test_output_contract.mjs: the decode side of output contract diagram-reader-v2 (reports/modernbert-next-plan-2026-11-08_codex.md "Interfaces /
// contracts" 3, acceptance B9-B12; make_roles.py --output-contract), with perfect scripted heads through the REAL docs/js/neural.js (create /
// formalizeJoint / jointRole / gateReader), docs/js/neural-confidence.js (signals / gate) and docs/js/logic.js (the engine), and
// training/neural/calibrate_modernbert.mjs decisions(). Each check fails on a defect:
//   - text state: absent omits the argument, empty gives "" (and the engine removes the label), written gives the one tagged span exactly
//     (multiword, Unicode, the literal words "none" and "empty"); written without a span, empty or absent with a span, two spans, a missing
//     text:<key> head, an unknown state, an unknown contract, a v2 reader whose fill heads lack unresolved: a structural hold of the request;
//   - undo / redo counts (twice by the learned map, three by the table, 3 in digits, none omitted): the engine steps back that many turns;
//   - outline and description values (outline gold, property outline, desc:size huge) and the moves (direction left, position left, leftOf an
//     anchor, a distance) reach the engine as labelled;
//   - fill unresolved (names beside a description, several descriptions, a compound from / to / anchor) with an unrelated shape in the context:
//     held at the cost level AND at execute all (gate and gateReader), marked blocked (no "Do it anyway"), the canvas unchanged; a following
//     "make it red" is held (depends) and does not paint the context shape; a following explicit request executes;
//   - the confidence reads the text state head as a value head (val / none) and a written text's words as tags;
//   - calibrate_modernbert.mjs decisions(): a blocked record and its dependents never execute; records without the field as before;
//   - a legacy reader (no output_contract) decodes as before: no text head, label "" lost, no holds.
//   node training/neural/parity/test_output_contract.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../../../docs/js/logic.js');
globalThis.SOPKit = K;
const N = require('../../../docs/js/neural.js');
const NC = await import('../../../docs/js/neural-confidence.js');
const CAL = await import('../calibrate_modernbert.mjs');

let fails = 0, n = 0;
const check = (name, ok, detail = '') => { n++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '  ' + String(detail).slice(0, 700))); if (!ok) fails++; };
const FILL = ['none', 'written', 'context', 'description'], FILL_V2 = FILL.concat(['unresolved']), STATES = ['absent', 'empty', 'written'];
const SPAN = ['anchor', 'count', 'distance', 'from', 'label', 'target', 'to'];
/** a v2 head layout of the kind make_roles.py --output-contract diagram-reader-v2 writes (over: fields replaced) */
const readerOf = (over = {}) => Object.assign({
  acts: ['create', 'delete', 'move', 'set', 'label', 'undo', 'redo', 'connect', 'property'],
  tags: ['O', ...SPAN.flatMap(k => ['B-' + k, 'I-' + k])], span_keys: SPAN, ref_keys: ['anchor', 'from', 'target', 'to'],
  desc_keys: ['color', 'quantifier', 'shape', 'size'], desc2_keys: [],
  classes: [['color', ['none', 'red', 'blue', 'gold']], ['direction', ['none', 'left']], ['outline', ['none', 'cyan', 'gold']], ['position', ['none', 'left', 'leftOf', 'below']],
    ['property', ['none', 'color', 'outline']], ['shape', ['none', 'circle', 'square']],
    ...['anchor', 'from', 'target', 'to'].map(k => ['fill:' + k, FILL_V2]),
    ['desc:color', ['none', 'red']], ['desc:quantifier', ['none', 'all']], ['desc:shape', ['none', 'circle', 'square', 'triangle']], ['desc:size', ['none', 'huge']],
    ['text:label', STATES]],
  act_keys: { create: ['color', 'label', 'shape'], delete: ['target'], move: ['anchor', 'direction', 'distance', 'position', 'target'], set: ['color', 'outline', 'target'],
    label: ['from', 'label', 'target', 'to'], undo: ['count'], redo: ['count'], connect: ['from', 'to'], property: ['property', 'target'] },
  number_words: { twice: '2' }, number_words_from: 'table', output_contract: 'diagram-reader-v2', text_state_keys: ['label'],
}, over);
const legacyOf = () => { const R = readerOf(); delete R.output_contract; delete R.text_state_keys; R.classes = R.classes.filter(([k]) => !k.startsWith('text:')).map(([k, v]) => [k, k.startsWith('fill:') ? FILL : v]); return R; };
const HI = 9;
/** a read() result of a stand-in model with its head logits: the act, class values (key -> value; null / absent = index 0), tags as [substring, key] */
function readOf(R, text, act, cls = {}, tagged = []) {
  const ws = N.wordsOf(text), nA = R.acts.length, seq = new Array(nA + R.classes.reduce((s, [, v]) => s + v.length, 0)).fill(0);
  seq[R.acts.indexOf(act)] = HI;
  let o = nA; const classes = {};
  for (const [k, vals] of R.classes) { const v = cls[k] ?? null, i = v == null ? 0 : vals.indexOf(v); if (i < 0) throw new Error(`no class ${k}=${v}`); seq[o + i] = HI; classes[k] = { value: i ? vals[i] : null, score: 0.99 }; o += vals.length; }
  const tg = ws.map(() => 'O');
  for (const [sub, key] of tagged) {
    const c0 = text.indexOf(sub); if (c0 < 0) throw new Error(`no ${sub} in ${text}`);
    ws.forEach((w, i) => { if (w.start >= c0 && w.end <= c0 + sub.length) tg[i] = (w.start === c0 ? 'B-' : 'I-') + key; });
  }
  const tok = tg.map(t => { const l = new Array(R.tags.length).fill(0); l[R.tags.indexOf(t)] = HI; return l; });
  const spans = {}; let cur = null;
  tg.forEach((t, i) => { if (t === 'O') { cur = null; return; } const k = t.slice(2), L = spans[k] || (spans[k] = []); if (t[0] === 'I' && cur === k) L[L.length - 1].j = i + 1; else { L.push({ i, j: i + 1 }); cur = k; } });
  for (const k of Object.keys(spans)) spans[k] = spans[k].map(s => ({ text: text.slice(ws[s.i].start, ws[s.j - 1].end), start: ws[s.i].start, end: ws[s.j - 1].end, score: 0.99 }));
  const res = { words: ws.map(w => w.w), acts: R.acts.map(label => ({ label, score: label === act ? 0.99 : 0.01 / (nA - 1) })).sort((a, b) => b.score - a.score), classes, tags: tg, spans };
  Object.defineProperty(res, 'logits', { value: { seq, tok, pieces: ws.map((w, i) => [100 + i]) }, enumerable: false });
  return res;
}
/** formalize one message of several requests (units: [{src, act, cls, tags}]) with the scripted reads; last: the context's last shape(s) */
async function decode(R, units, { names = ['Box', 'Ball', 'Goal', 'Other'], last = [] } = {}) {
  let text = '', offs = [];
  for (const u of units) { if (text) text += '. '; offs.push({ c0: text.length, c1: text.length + u.src.length }); text += u.src; }
  const reads = units.map(u => readOf(R, u.src, u.act, u.cls, u.tags));
  const cutP = N.wordsOf(text).map(w => { const s = offs.some(o => o.c0 === w.start), inside = offs.some(o => w.start >= o.c0 && w.end <= o.c1); return { start: w.start, end: w.end, pO: inside ? 0 : 1, pB: s ? 1 : 0, pI: inside && !s ? 1 : 0 }; });
  const neural = N.create(K.createSystem().engine, () => { throw new Error('the Rules were called'); }, { activateCut: false });
  neural.setModels({ reader: R, unk: 0, read: async () => reads[0], readMany: async ts => ts.map((t, i) => reads[i]), cutProbs: () => cutP });
  neural.setStrategy('finetuned');
  return neural.formalize(text, { names, last }, { units: offs });
}
const SURE = { reader: 'test', intercept: 10, features: [], tables: {}, act_prior: {}, act_prior_default: 0, operating_level: 'cost', levels_out_of_fold: { cost: { threshold: 0.5 } } };
const SETUP = [{ shape: 'circle', name: 'Box', color: 'blue', label: 'old' }, { shape: 'square', name: 'Ball', color: 'blue' }, { shape: 'square', name: 'Goal' }, { shape: 'circle', name: 'Other', color: 'blue' },
  { shape: 'triangle', name: 'Tri', color: 'red' }, { shape: 'square', name: 'Sq', color: 'red' }];
function world(setup = SETUP) { const sys = K.createSystem(); for (const [i, s] of setup.entries()) sys.engine.run([{ id: 's' + i, type: 'command', args: Object.assign({ action: 'create' }, s) }], {}); return sys; }
const shapes = sys => sys.world.state.shapes.map(s => ({ name: s.name, x: s.x, y: s.y, color: s.color, outline: s.outline, label: s.label, size: s.size, shape: s.shape }));
const byName = (sys, nm) => sys.world.state.shapes.find(s => s.name === nm);
/** run what the gate executes in a fresh world -> {sys, before, after, g} */
function execute(out, level, viaReader = false, setup = SETUP) {
  const sys = world(setup), before = JSON.stringify(shapes(sys));
  const g = viaReader ? N.gateReader(NC, SURE, out, level) : NC.gate(SURE, out, level);
  if (g.executed.length) sys.engine.run(g.executed, {});
  return { sys, before, after: JSON.stringify(shapes(sys)), g };
}
const main = out => out.nodes.filter(x => x.type !== 'mention');
const R2 = readerOf();

// ---------------------------------------------------------------- 1. text state
{
  let out = await decode(R2, [{ src: 'label Box', act: 'label', cls: { 'fill:target': 'written' }, tags: [['Box', 'target']] }]);
  check('absent: no label argument, not held', !('label' in main(out)[0].args) && !out.analyses[0].blocked, JSON.stringify(main(out)[0].args));
  out = await decode(R2, [{ src: 'remove the label from Box', act: 'label', cls: { 'fill:target': 'written', 'text:label': 'empty' }, tags: [['Box', 'target']] }]);
  const nd = main(out)[0];
  check('empty: label is its own property ""', Object.prototype.hasOwnProperty.call(nd.args, 'label') && nd.args.label === '' && !out.analyses[0].blocked, JSON.stringify(nd.args));
  let e = execute(out, 'cost');
  check('empty: executed at the cost level and the engine removes Box\'s label', e.g.executed.length === 1 && !byName(e.sys, 'Box').label, JSON.stringify(byName(e.sys, 'Box')));
  for (const [what, src, sub] of [['multiword', 'label Box "hello big world"', 'hello big world'], ['literal none', 'label Box none', 'none'], ['literal empty', 'label Box empty', 'empty'],
    ['Unicode', 'label Box "Café Über 東京 ñandú"', 'Café Über 東京 ñandú'], ['comma inside', 'label Box "Maria, 34"', 'Maria, 34']]) {
    out = await decode(R2, [{ src, act: 'label', cls: { 'fill:target': 'written', 'text:label': 'written' }, tags: [['Box', 'target'], [sub, 'label']] }]);
    e = execute(out, 'cost');
    check(`written (${what}): label is the tagged text exactly and the engine writes it`, main(out)[0].args.label === sub && byName(e.sys, 'Box').label === sub, JSON.stringify(main(out)[0].args) + ' ' + JSON.stringify(byName(e.sys, 'Box')));
  }
  const holds = [
    ['written without a span (also: a whitespace-only label, which has no word to tag)', { 'fill:target': 'written', 'text:label': 'written' }, [['Box', 'target']], 'text-state'],
    ['empty with a span', { 'fill:target': 'written', 'text:label': 'empty' }, [['Box', 'target'], ['hello', 'label']], 'text-state'],
    ['absent with a span', { 'fill:target': 'written' }, [['Box', 'target'], ['hello', 'label']], 'text-state'],
    ['written in two places', { 'fill:target': 'written', 'text:label': 'written' }, [['Box', 'target'], ['hello', 'label'], ['world', 'label']], 'text-state'],
  ];
  for (const [what, cls, tags, kind] of holds) {
    out = await decode(R2, [{ src: 'label Box hello big world', act: 'label', cls, tags }]);
    const a = out.analyses[0], ec = execute(out, 'cost'), ea = execute(out, 'all', true);
    check(`${what}: structural hold (${kind} on label), never "" / omitted / default`, a.blocked === true && a.block_reasons.length === 1 && a.block_reasons[0].kind === kind && a.block_reasons[0].key === 'label'
      && a.block_reasons[0].source_span === 'label Box hello big world' && !('label' in main(out)[0].args), JSON.stringify(a.block_reasons) + JSON.stringify(main(out)[0].args));
    check(`${what}: held at cost and at execute all, blocked, canvas unchanged`, !ec.g.executed.length && !ea.g.executed.length && ec.g.units[0].blocked && ea.g.units[0].blocked && ec.before === ec.after && ea.before === ea.after,
      JSON.stringify(ea.g.units.map(u => [u.execute, u.blocked, u.reasons])));
  }
  const noHead = readerOf({ classes: readerOf().classes.filter(([k]) => k !== 'text:label') });
  out = await decode(noHead, [{ src: 'label Box "hi"', act: 'label', cls: { 'fill:target': 'written' }, tags: [['Box', 'target'], ['hi', 'label']] }]);
  check('missing text:label head under v2: held (malformed-output on label)', out.analyses[0].blocked && out.analyses[0].block_reasons[0].kind === 'malformed-output' && out.analyses[0].block_reasons[0].key === 'label', JSON.stringify(out.analyses[0].block_reasons));
  const odd = readerOf({ classes: readerOf().classes.map(([k, v]) => [k, k === 'text:label' ? ['absent', 'empty', 'written', 'maybe'] : v]) });
  out = await decode(odd, [{ src: 'label Box "hi"', act: 'label', cls: { 'fill:target': 'written', 'text:label': 'maybe' }, tags: [['Box', 'target'], ['hi', 'label']] }]);
  check('an unknown text state: held (malformed-output)', out.analyses[0].blocked && out.analyses[0].block_reasons[0].kind === 'malformed-output', JSON.stringify(out.analyses[0].block_reasons));
  out = await decode(readerOf({ output_contract: 'diagram-reader-v9' }), [{ src: 'make Box red', act: 'set', cls: { 'fill:target': 'written', color: 'red' }, tags: [['Box', 'target']] },
    { src: 'what color is Ball', act: 'property', cls: { 'fill:target': 'written', property: 'color' }, tags: [['Ball', 'target']] }]);
  e = execute(out, 'all', true);
  check('unknown output contract: every request held (malformed-output on output_contract), even at execute all', out.analyses.every(a => a.blocked && a.block_reasons[0].kind === 'malformed-output' && a.block_reasons[0].key === 'output_contract')
    && !e.g.executed.length && e.before === e.after, JSON.stringify(out.analyses.map(a => a.block_reasons)));
  out = await decode(readerOf({ classes: readerOf().classes.map(([k, v]) => [k, k.startsWith('fill:') ? FILL : v]) }), [{ src: 'make Box red', act: 'set', cls: { 'fill:target': 'written', color: 'red' }, tags: [['Box', 'target']] }]);
  check('v2 declared but the fill heads lack unresolved: held', out.analyses[0].blocked && out.analyses[0].block_reasons[0].key === 'output_contract', JSON.stringify(out.analyses[0].block_reasons));
  out = await decode(readerOf({ text_state_keys: undefined }), [{ src: 'make Box red', act: 'set', cls: { 'fill:target': 'written', color: 'red' }, tags: [['Box', 'target']] }]);
  check('v2 declared without text_state_keys: held', out.analyses[0].blocked && out.analyses[0].block_reasons[0].key === 'output_contract', JSON.stringify(out.analyses[0].block_reasons));
  // the confidence: the state head is a value head, a written text's words are tags
  out = await decode(R2, [{ src: 'label Box "hi there"', act: 'label', cls: { 'fill:target': 'written', 'text:label': 'written' }, tags: [['Box', 'target'], ['hi there', 'label']] }]);
  let sig = NC.signals(out, 0);
  check('confidence: written state on the value statistics (val_p_min, val_margin_min), its words on the tags', sig && sig.f.val_p_min > 0.99 && sig.f.val_margin_min > 0.99 && sig.detail.low.val.key === 'label' && sig.detail.low.val.value === 'written'
    && sig.f.tag_p_min > 0.99 && sig.f.none_p_min === null, JSON.stringify(sig && sig.f));
  out = await decode(R2, [{ src: 'label Box', act: 'label', cls: { 'fill:target': 'written' }, tags: [['Box', 'target']] }]);
  sig = NC.signals(out, 0);
  check('confidence: absent state on the none statistic (none_p_min)', sig && sig.f.none_p_min > 0.99 && sig.f.val_p_min === null && sig.detail.low.none.key === 'label', JSON.stringify(sig && sig.f));
  const LR = legacyOf();
  out = await decode(LR, [{ src: 'remove the label from Box', act: 'label', cls: { 'fill:target': 'written' }, tags: [['Box', 'target']] }]);
  sig = NC.signals(out, 0);
  check('legacy reader: no text head, label "" cannot come out (as before), no hold, no value head for the label', !('label' in main(out)[0].args) && !out.analyses[0].blocked && !('blocked' in out.analyses[0]) && sig.f.val_p_min === null && sig.f.none_p_min === null,
    JSON.stringify(main(out)[0].args) + JSON.stringify(sig.f));
}

// ---------------------------------------------------------------- 2. undo / redo counts
{
  const turns = () => { const sys = K.createSystem(); for (const nm of ['A1', 'A2', 'A3', 'A4']) sys.engine.run([{ id: 'c', type: 'command', args: { action: 'create', shape: 'circle', name: nm } }], {}); return sys; };
  for (const [src, sub, want] of [['undo twice', 'twice', 2], ['undo three times', 'three', 3], ['undo 3 times', '3', 3], ['undo', null, null]]) {
    const out = await decode(R2, [{ src, act: 'undo', cls: {}, tags: sub ? [[sub, 'count']] : [] }]), nd = main(out)[0];
    const sys = turns(); sys.engine.run(NC.gate(SURE, out, 'cost').executed, {});
    const left = sys.world.state.shapes.length;
    check(`"${src}": count ${want ?? 'omitted'}, the engine steps back ${want || 1} turn(s)`, (want == null ? !('count' in nd.args) : nd.args.count === want) && left === 4 - (want || 1), JSON.stringify(nd.args) + ' shapes left ' + left);
  }
  const out = await decode(R2, [{ src: 'redo twice', act: 'redo', cls: {}, tags: [['twice', 'count']] }]);
  const sys = turns(); sys.engine.run([{ id: 'u', type: 'command', args: { action: 'undo', count: 3 } }], {}); sys.engine.run(NC.gate(SURE, out, 'cost').executed, {});
  check('"redo twice": count 2, the engine re-applies two turns', main(out)[0].args.count === 2 && sys.world.state.shapes.length === 3, JSON.stringify(main(out)[0].args) + ' ' + sys.world.state.shapes.length);
}

// ---------------------------------------------------------------- 3. outline and description values, moves
{
  let out = await decode(R2, [{ src: "make Box's outline gold", act: 'set', cls: { 'fill:target': 'written', outline: 'gold' }, tags: [['Box', 'target']] }]);
  let e = execute(out, 'cost');
  check('outline gold reaches the engine', main(out)[0].args.outline === 'gold' && byName(e.sys, 'Box').outline === 'gold', JSON.stringify(byName(e.sys, 'Box')));
  out = await decode(R2, [{ src: 'what is the outline of Box', act: 'property', cls: { 'fill:target': 'written', property: 'outline' }, tags: [['Box', 'target']] }]);
  check('property outline (an outline question)', main(out)[0].type === 'question' && main(out)[0].args.property === 'outline' && main(out)[0].args.target === 'Box', JSON.stringify(main(out)[0]));
  const big = [{ shape: 'circle', name: 'H1', size: 'huge' }, { shape: 'circle', name: 'S1', size: 'small' }, { shape: 'square', name: 'H2', size: 'huge' }];
  out = await decode(R2, [{ src: 'delete the huge circles', act: 'delete', cls: { 'fill:target': 'description', 'desc:size': 'huge', 'desc:shape': 'circle', 'desc:quantifier': 'all' } }]);
  e = execute(out, 'cost', false, big);
  check('desc:size huge: only the huge circles are deleted', e.sys.world.state.shapes.map(s => s.name).join(',') === 'S1,H2', JSON.stringify(out.nodes) + ' ' + e.sys.world.state.shapes.map(s => s.name));
  const x0 = byName(world(), 'Box').x, gx = byName(world(), 'Goal').x;
  out = await decode(R2, [{ src: 'move Box left', act: 'move', cls: { 'fill:target': 'written', direction: 'left' }, tags: [['Box', 'target']] }]);
  e = execute(out, 'cost');
  check('bare left (direction=left): Box moves left of where it was', main(out)[0].args.direction === 'left' && byName(e.sys, 'Box').x < x0, `${x0} -> ${byName(e.sys, 'Box').x}`);
  out = await decode(R2, [{ src: 'move Goal 40 px to the left', act: 'move', cls: { 'fill:target': 'written', direction: 'left' }, tags: [['Goal', 'target'], ['40', 'distance']] }]);
  e = execute(out, 'cost');   // Goal, not Box: Box is 80 px from the canvas edge, where the engine stops a shape
  check('distance: direction left by 40', main(out)[0].args.distance === 40 && Math.abs(byName(e.sys, 'Goal').x - (gx - 40)) < 1e-9, `${gx} -> ${byName(e.sys, 'Goal').x}`);
  out = await decode(R2, [{ src: 'move Box to the far left', act: 'move', cls: { 'fill:target': 'written', position: 'left' }, tags: [['Box', 'target']] }]);
  e = execute(out, 'cost');
  const leftmost = Math.min(...e.sys.world.state.shapes.map(s => s.x));
  check('far left (position=left): Box goes to the left of the canvas', main(out)[0].args.position === 'left' && byName(e.sys, 'Box').x === leftmost, JSON.stringify(shapes(e.sys).map(s => [s.name, s.x])));
  out = await decode(R2, [{ src: 'Box left', act: 'move', cls: { 'fill:target': 'written', position: 'left' }, tags: [['Box', 'target']] }]);
  check('verbless "Box left" (position=left) decodes as labelled', main(out)[0].args.position === 'left' && main(out)[0].args.target === 'Box', JSON.stringify(main(out)[0].args));
  out = await decode(R2, [{ src: 'move Box to the left of Goal', act: 'move', cls: { 'fill:target': 'written', 'fill:anchor': 'written', position: 'leftOf' }, tags: [['Box', 'target'], ['Goal', 'anchor']] }]);
  e = execute(out, 'cost');
  check('left of Goal (position=leftOf, anchor=Goal): Box ends left of Goal', main(out)[0].args.anchor === 'Goal' && byName(e.sys, 'Box').x < byName(e.sys, 'Goal').x, `${byName(e.sys, 'Box').x} vs ${gx}`);
}

// ---------------------------------------------------------------- 4. unresolved references, holds and dependencies
{
  const ctx = { last: ['Other'] };   // an unrelated shape in the context: must never be used
  const compound = [
    ['names beside a description: "delete the red square and Box"', { src: 'delete the red square and Box', act: 'delete', cls: { 'fill:target': 'unresolved' } }, 'target'],
    ['several descriptions: "delete all the squares and the red triangle"', { src: 'delete all the squares and the red triangle', act: 'delete', cls: { 'fill:target': 'unresolved' } }, 'target'],
    ['compound from: "connect Ball and the red square to Goal"', { src: 'connect Ball and the red square to Goal', act: 'connect', cls: { 'fill:from': 'unresolved', 'fill:to': 'written' }, tags: [['Goal', 'to']] }, 'from'],
    ['compound anchor: "move Box below Goal and the red square"', { src: 'move Box below Goal and the red square', act: 'move', cls: { 'fill:target': 'written', 'fill:anchor': 'unresolved', position: 'below' }, tags: [['Box', 'target']] }, 'anchor'],
  ];
  for (const [what, u, key] of compound) {
    const out = await decode(R2, [u], ctx), a = out.analyses[0], nd = main(out)[0];
    check(`${what}: held (unresolved-reference on ${key}), no target substituted (not Other, not a first mention)`, a.blocked && a.block_reasons.some(b => b.kind === 'unresolved-reference' && b.key === key) && !(key in nd.args)
      && a.keys[key].value === null, JSON.stringify(a.block_reasons) + JSON.stringify(nd.args));
    for (const level of ['cost', 'all']) for (const via of [false, true]) {
      const e = execute(out, level, via);
      check(`${what}: ${via ? 'gateReader' : 'gate'} at ${level}: held, blocked, canvas unchanged`, !e.g.executed.length && e.g.held.length === 1 && e.g.units[0].blocked === true && e.before === e.after
        && e.g.units[0].reasons.some(r => r.group === 'unresolved-reference'), JSON.stringify(e.g.units.map(x => [x.execute, x.blocked, x.reasons])));
    }
  }
  // blocked, then "make it red" (context), then an explicit independent request
  const units = [compound[0][1], { src: 'make it red', act: 'set', cls: { 'fill:target': 'context', color: 'red' } }, { src: 'make Ball gold', act: 'set', cls: { 'fill:target': 'written', color: 'gold' }, tags: [['Ball', 'target']] }];
  const out = await decode(R2, units, ctx), ms = main(out);
  check('after a held request, "it" points to that request (a barrier), not to the context\'s Other', ms[1].args.target && ms[1].args.target.ref === ms[0].id, JSON.stringify(ms[1].args));
  for (const level of ['cost', 'all']) for (const via of [false, true]) {
    const e = execute(out, level, via), [u0, u1, u2] = e.g.units;
    check(`blocked, then "make it red", then "make Ball gold" (${via ? 'gateReader' : 'gate'}, ${level}): the first two held and blocked, the third executes`,
      !u0.execute && u0.blocked && !u1.execute && u1.blocked && u1.reasons.some(r => r.group === 'depends') && u2.execute && !u2.blocked
      && byName(e.sys, 'Other').color === 'blue' && byName(e.sys, 'Box') && byName(e.sys, 'Ball').color === 'gold', JSON.stringify(e.g.units.map(x => [x.src, x.execute, x.blocked, x.reasons.map(r => r.group)])) + JSON.stringify(shapes(e.sys)));
  }
  // a later request that writes its own names is independent of the held one
  const o2 = await decode(R2, [compound[1][1], { src: 'delete Goal', act: 'delete', cls: { 'fill:target': 'written' }, tags: [['Goal', 'target']] }], ctx), e2 = execute(o2, 'cost');
  check('a later explicit request ("delete Goal") executes after a held one', !e2.g.units[0].execute && e2.g.units[1].execute && !byName(e2.sys, 'Goal') && byName(e2.sys, 'Sq') && byName(e2.sys, 'Tri'),
    JSON.stringify(e2.g.units.map(x => [x.src, x.execute, x.blocked])));
  // a legacy reader never holds: the context rule fills a context role (as before)
  const o3 = await decode(legacyOf(), [{ src: 'make it red', act: 'set', cls: { 'fill:target': 'context', color: 'red' } }], ctx);
  check('legacy reader: context fills "it" with the context shape, no hold (unchanged)', main(o3)[0].args.target === 'Other' && !('blocked' in o3.analyses[0]) && execute(o3, 'cost').g.executed.length === 1, JSON.stringify(main(o3)[0].args));
}

// ---------------------------------------------------------------- 5. offline decisions (calibrate_modernbert.mjs)
{
  const base = [{ id: 'm', wireId: 'n1', c: 0.9, o: 'right' }, { id: 'm', wireId: 'n2', c: 0.9, o: 'right', dependencies: ['n1'] }, { id: 'm', wireId: 'n3', c: 0.9, o: 'right' }];
  const old = CAL.decisions(base, 0.5).map(x => x.execute);
  check('decisions: records without blocked execute as before', old.join() === 'true,true,true', old);
  const blocked = CAL.decisions([{ ...base[0], blocked: true, block_reasons: [{ kind: 'unresolved-reference', key: 'target', source_span: 'x' }] }, base[1], base[2]], 0.5).map(x => x.execute);
  check('decisions: a blocked record never executes, even at a threshold below its confidence; its dependent neither; an independent one does', blocked.join() === 'false,false,true', blocked);
  const st = CAL.stats([{ ...base[0], blocked: true }, base[1], base[2]], 10, -Infinity);
  check('stats at ask-all-off (threshold -inf): the blocked request and its dependent are asked, in the requested denominator', st.right === 1 && st.asked === 2 && st.requested === 10 && st.right_share === 0.1, JSON.stringify(st));
}

console.log(fails ? `${fails} of ${n} check(s) FAILED` : `PASS (${n} checks)`);
process.exit(fails ? 1 : 0);
