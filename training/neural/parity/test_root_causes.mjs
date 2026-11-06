// test_root_causes.mjs: hand-built records, one for each cause of root_causes.mjs, must land in their cause; classifiers broken on purpose must fail it.
//   node training/neural/parity/test_root_causes.mjs                         the classifier must pass; each broken variant must fail (exit 0 only then)
//   ROOT_CAUSES_VARIANT=noActOverlap node training/neural/parity/test_root_causes.mjs    that one variant alone: its failures are listed, the exit is 1
// The records are made by arm_lib.mjs buildRecord (not written by hand: the pairing, the outcomes and the canonical values are the scorer's own), so a
// fixture cannot hold something the scorer never produces.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { buildRecord, loadRecords, viewOutcomes } from './arm_lib.mjs';
import { canon } from '../../../docs/js/bench-canon.js';
import { classifyRecord, analyzePart, needsKeys, wrongKeys, DEFAULT_LAYOUT } from './root_causes.mjs';

const seen = () => true;
const T0 = 'paint Cart red';
/** a record: wires = the gold [{span, args}]; alt = gpt's; mains = the produced [{args, span (a substring of the text), type?}] */
function mk(id, text, wires, mains, { alt = null, kind = 'long' } = {}) {
  const W = ws => ws.map(w => ({ span: w.span, trigger: w.span.split(' ')[0], type: w.type || 'command', args: w.args }));
  const nodes = mains.map((m, i) => ({ id: 'n' + (i + 1), type: m.type || 'command', args: m.args }));
  const run = { reader: 'test', cut: 'own', mains: mains.map((m, i) => { const s = text.indexOf(m.span); return { node: nodes[i], mentions: [], span: [s, s + m.span.length], src: m.span, f: null, act: null, truncated: false, wireId: nodes[i].id, dependencies: [] }; }), allNodes: nodes };
  return buildRecord({ id, text, names: [], wires: W(wires), altWires: alt ? W(alt) : null, set: 'nl_a', part: 'development', kind, writer: null, session: null, group: null, setup: '', teachers: null }, run, { seen });
}
const set = (target, color, extra = {}) => ({ action: 'set', target, color, ...extra });
const g = (span, args) => ({ span, args });

const oracleFor = (id, args, miss) => ({ decoded: new Map([[id, [{ o: 'wrong', miss, got: {}, extraKeys: [] }]]]), rows: new Map([[id, [{ id, gold: args, classes: {} }]]]) });
const OR1 = oracleFor('f1', set('Cart', 'red'), [['color', '∅', 'red']]);

const FIXTURES = [
  // [name, record, oracle, check(result) -> [what, got, want] or null]
  ['1 oracle: the round trip with perfect heads misses it', mk('f1', T0, [g(T0, set('Cart', 'red'))], [{ span: T0, args: set('Cart', 'blue') }]), OR1, r => ['gold', r.golds[0].cause, 'oracle']],
  ['2 ambiguity: the teachers disagree and the reader equals gpt', mk('f2', T0, [g(T0, set('Cart', 'red'))], [{ span: T0, args: set('Cart', 'blue') }], { alt: [g(T0, set('Cart', 'blue'))] }), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].disagree, 'teachers true']],
  ['teachers disagree but the reader is wrong against both: a later cause (class), counted as a disagreement', mk('f2a', T0, [g(T0, set('Cart', 'red'))], [{ span: T0, args: set('Cart', 'green') }], { alt: [g(T0, set('Cart', 'blue'))] }), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].disagree, 'class true']],
  ['teachers disagree (gpt wrote no request), nothing read: not cause 2 (the cut lost it)', mk('f2b', T0, [g(T0, set('Cart', 'red'))], [], { alt: [] }), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].disagree, 'cut true']],
  ['teachers agree here; the either view could re-pair the wrong read into gpt\'s other request: not cause 2', mk('f2d', 'add a red circle and a blue square', [g('add a red circle', { action: 'create', shape: 'circle', color: 'red' })], [{ span: 'add a red circle', args: { action: 'create', shape: 'square', color: 'blue' } }], { alt: [g('add a red circle', { action: 'create', shape: 'circle', color: 'red' }), g('a blue square', { action: 'create', shape: 'square', color: 'blue' })] }), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].disagree, 'class false']],
  ['2 teachers: an extra that is gpt\'s request', mk('f2c', T0, [], [{ span: T0, args: set('Cart', 'red') }], { alt: [g(T0, set('Cart', 'red'))] }), null, r => ['extra', r.extras[0].cause, 'teachers']],
  ['3 cut: one unit holds two requests (merged)', mk('f3', 'delete Box then make Pay blue', [g('delete Box', { action: 'delete', target: 'Box' }), g('make Pay blue', set('Pay', 'blue'))], [{ span: 'delete Box then make Pay blue', args: set('Pay', 'red') }]), null,
    r => ['golds', r.golds.map(x => x.cause).join(), 'cut,cut']],
  ['3 cut: no unit on the span (lost)', mk('f3b', 'move Pay left', [g('move Pay left', { action: 'move', target: 'Pay', direction: 'left' })], []), null, r => ['gold', r.golds[0].cause + ': ' + r.golds[0].detail, 'cut: lost: no unit on the span']],
  ['3 cut: an extra splits a request', mk('f3c', 'make Cart red please', [g('make Cart red', set('Cart', 'red'))], [{ span: 'make Cart red', args: set('Cart', 'red') }, { span: 'make Cart', args: set('Cart', 'red') }]), null, r => ['extra', r.extras[0].cause, 'cut']],
  ['3* an extra on text with no requested action', mk('f3d', 'hello there', [], [{ span: 'hello there', args: set('Cart', 'red') }], { kind: 'nothing_to_do' }), null, r => ['extra', r.extras[0].cause, 'spurious']],
  ['4 wrong act: the span is cut and read as a delete (not done and extra)', mk('f4', T0, [g(T0, set('Cart', 'red'))], [{ span: T0, args: { action: 'delete', target: 'Cart' } }]), null,
    r => ['gold, extra', r.golds[0].cause + ',' + r.extras[0].cause, 'act,act']],
  ['5 ref: a name written in another request (pronoun)', mk('f5', 'Cart is here. make it red', [g('make it red', set('Cart', 'red'))], [{ span: 'make it red', args: { action: 'set', color: 'red' } }]), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].keys, 'ref target']],
  ['5 ref: a description whose words the message does not write', mk('f5b', 'make the circle red', [g('make the circle red', { action: 'set', target: 'mention(color=blue,shape=circle)', color: 'red' })], [{ span: 'make the circle red', args: { action: 'set', target: 'mention(shape=circle)', color: 'red' } }]), null,
    r => ['gold', r.golds[0].cause, 'ref']],
  ['6 class: a wrong colour', mk('f6', T0, [g(T0, set('Cart', 'red'))], [{ span: T0, args: set('Cart', 'blue') }]), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].keys, 'class color']],
  ['6 class: a resize in the wrong direction (equal values, direction counted)', mk('f6b', 'shrink Cart', [g('shrink Cart', { action: 'resize', target: 'Cart' })], [{ span: 'shrink Cart', args: { action: 'resize', target: 'Cart', scale: 1.5 } }]), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].keys, 'class scale (direction)']],
  ['7 name: the wrong word tagged for the target', mk('f7', T0, [g(T0, set('Cart', 'red'))], [{ span: T0, args: set('Box', 'red') }]), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].keys, 'name target']],
  ['8 other: a key no head reads', mk('f8', T0, [g(T0, { action: 'set', target: 'Cart', object: 'thing' })], [{ span: T0, args: { action: 'set', target: 'Cart', object: 'other' } }]), null, r => ['gold', r.golds[0].cause + ' ' + r.golds[0].keys, 'other object']],
  ['a right request has no cause', mk('f9', T0, [g(T0, set('Cart', 'red'))], [{ span: T0, args: set('Cart', 'red') }]), null, r => ['gold, extras', r.golds[0].status + ',' + r.extras.length, 'right,0']],
];

export function runChecks(variant) {
  const bad = [];
  for (const [name, rec, oracle, check] of FIXTURES) {
    let res;
    try { res = classifyRecord(rec, { scoring: 'direction', layout: DEFAULT_LAYOUT, oracle, variant }); } catch (e) { bad.push(`${name}: threw ${e.message}`); continue; }
    const [what, got, want] = check(res);
    if (got !== want) bad.push(`${name}: ${what} is "${got}", expected "${want}"`);
    // every part of an analysis adds up to the outcomes (analyzePart throws when it does not)
    try { analyzePart([rec], { scoring: 'direction', layout: DEFAULT_LAYOUT, oracle, variant }); } catch (e) { bad.push(`${name}: analyzePart ${e.message}`); }
  }
  // the either view (arm_lib.mjs) and root_causes' own comparison with gpt's label must agree: a regression in either place shows here
  for (const [id, expectEquals] of [['f2d', false], ['f2', true]]) {
    const rec = FIXTURES.find(f => f[1].id === id)[1], either = viewOutcomes(rec, 'either', 'direction').o[0] === 'right';
    const own = classifyRecord(rec, { scoring: 'direction', layout: DEFAULT_LAYOUT, oracle: null, variant: {} }).golds[0].readerEqualsGpt === true;
    if (either !== expectEquals || own !== expectEquals) bad.push(`either view / own gpt comparison on ${id}: either says right = ${either}, root_causes says equals gpt = ${own}, both expected ${expectEquals}`);
  }
  // the key diff is the scorer's equalWant: only the keys of `want`, an unwritten key is ∅
  const w = wrongKeys({ got: { action: 'set', color: 'blue', zzz: '1' }, pa: 'command:set' }, { action: 'set', color: 'red', target: 'cart' }, null, 'direction').join();
  if (w !== 'color,target') bad.push(`wrongKeys: ${w}, expected color,target`);
  // the word check of nl_needs.py: a name the message does not write, a mention word it does not write; $new, quantifier and recency never
  const n = needsKeys({ target: 'Cart', anchor: 'mention(color=blue,quantifier=all)', from: '$new' }, 'make cart bigger', 'make cart bigger');
  if (n.msg.join() !== 'anchor' || n.span.join() !== 'anchor') bad.push(`needsKeys: ${JSON.stringify(n)}, expected anchor`);
  return bad;
}

export function sopNeedsCheck() {   // the port of nl_needs.py must give its published counts (reports/evidence/modernbert-parity-baseline/nl_a/needs.txt)
  const f = homedir() + '/.cache/diagram-vss-modernbert/arms/baseline/sop.jsonl';
  if (!existsSync(f)) return null;
  const nl = loadRecords([f]).records.filter(r => r.set === 'nl_a'); let a = 0, wa = 0, b = 0, wb = 0;
  for (const r of nl) { for (const x of r.goldSpans) { wa++; if (needsKeys(x.args, r.text, x.span).msg.length) a++; } for (const x of r.goldAlt) { wb++; if (needsKeys(x.args, r.text, x.span).msg.length) b++; } }
  return { opus: `${a}/${wa}`, gpt: `${b}/${wb}`, ok: a === 269 && wa === 800 && b === 265 && wb === 788 };
}

const VARIANTS = { teachersFirst: 'cause 2 takes every disagreement of the teachers, also when the reader is wrong against both (the earlier rule)', noActOverlap: 'the act check does not look at the units that overlap a not-done request', swapClassName: 'class and token keys swapped', classBeforeRef: 'the class head is asked before the reference' };
const only = process.env.ROOT_CAUSES_VARIANT;
if (only) {
  if (!VARIANTS[only]) throw new Error('unknown variant ' + only + ': ' + Object.keys(VARIANTS).join(', '));
  const bad = runChecks({ [only]: true });
  console.log(`variant ${only} (${VARIANTS[only]}): ${bad.length} failing checks`); bad.forEach(x => console.log('  FAIL ' + x));
  process.exit(bad.length ? 1 : 0);
}
let failed = 0;
const base = runChecks({});
console.log(`classifier: ${FIXTURES.length} fixtures, ${base.length} failing`); base.forEach(x => console.log('  FAIL ' + x)); failed += base.length;
for (const [v, why] of Object.entries(VARIANTS)) {
  const bad = runChecks({ [v]: true });
  console.log(`broken variant ${v} (${why}): ${bad.length} failing checks${bad.length ? ' (required: it must fail)' : ' -> NOT CAUGHT'}`); bad.forEach(x => console.log('  fails: ' + x));
  if (!bad.length) failed++;
}
const nc = sopNeedsCheck();
console.log(nc ? `nl_needs port on the SOP-BERT nl_a records: Opus ${nc.opus} (needs.txt: 269/800), gpt ${nc.gpt} (265/788) ${nc.ok ? 'ok' : 'DIFFERENT'}` : 'nl_needs port: SOP-BERT records not in the cache, count check skipped');
if (nc && !nc.ok) failed++;
console.log(failed ? `FAILED (${failed})` : 'ok');
process.exit(failed ? 1 : 0);
