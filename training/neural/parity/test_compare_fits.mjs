// test_compare_fits.mjs: the checks of compare_fits.mjs (MODERNBERT_RECAL_PLAN.md S3). The bars decide whether a confidence is published, so each rule is
// checked at its boundary and with a null on each side: in JavaScript null >= -5, null >= 0 and null <= 0.1 are all true.
//   node training/neural/parity/test_compare_fits.mjs
import assert from 'node:assert/strict';
import { compareSidecars, assertSameFit } from './compare_arms.mjs';
import { compareFitsData, evaluateBars, assertFitPair, subsetSidecar, freshInfo, FRESH_KEY, CREATE_KEY } from './compare_fits.mjs';

let n = 0;
const test = (name, fn) => { try { fn(); n++; console.log('ok   ' + name); } catch (e) { console.log('FAIL ' + name + '\n' + (e.stack || e)); process.exitCode = 1; } };
const clone = x => JSON.parse(JSON.stringify(x));

// ---------------------------------------------------------------- fixtures: two score files and their sidecars
const KEYS = [['synth_short_t1', 'all', 'gold'], ['short3', 'test', 'gold'], ['fresh2', 'test', 'gold'], ['nl_a', 'development', 'opus']];
const block = (requested, wrong, extras, executed) => ({ requested, wrong, extras, executed, wrong_execution_share: executed ? (wrong + extras) / executed : null });
function score(calibrated_on, blocks = {}) {
  const sets = {};
  for (const [set, part, view] of KEYS) (sets[set] ||= {})[part] = { use: 'evaluation', views: { [view]: { today: { at_threshold: blocks[`${set}/${part}`] ?? block(100, 1, 0, 50) } } } };
  return { reader: 'modernbert', artifact: 'art1', calibrated_on, threshold_cost10: 0.9, record_files: ['rec_a.jsonl', 'rec_b.jsonl'], sets };
}
const SHORT = ['fresh2', 'short3', 'nl_a', 'short_synth'], CTRL = ['fresh2', 'short3', 'nl_a'];
/** a sidecar of n messages: right / bad per message under `view.today.gate` (and .all), one requested action each */
function side(ids, right, bad, view, group = null) {
  const t = { right, bad, G: ids.map(() => 1) };
  return { ids, session: ids.map(() => null), group: ids.map((_, i) => (group ? group[i] : null)), overlap: ids.map(() => false), tallies: { [`${view}.today.gate`]: t, [`${view}.today.all`]: clone(t) } };
}
// synth_short_t1: 100 messages, 50 of form create and 50 of form set; two wordings per command (the same span), so 50 spans
const T1 = Array.from({ length: 100 }, (_, i) => `st1-${String(i).padStart(3, '0')}`);
const spanOf = i => `span ${Math.floor(i / 2)}`, formOf = i => (i < 50 ? 'create' : 'set');
const fresh = { spans: new Map(T1.map((id, i) => [id, spanOf(i)])), forms: new Map(T1.map((id, i) => [id, formOf(i)])) };
const mkSides = (mod = () => {}) => {
  const mk = (ids, view) => side(ids, ids.map((_, i) => (i % 2 ? 1 : 0)), ids.map(() => 0), view);
  const sa = { [FRESH_KEY]: mk(T1, 'gold') }, S3 = Array.from({ length: 40 }, (_, i) => `s3-${i}`), F2 = Array.from({ length: 40 }, (_, i) => `f2-${i}`), NA = Array.from({ length: 40 }, (_, i) => `na-${i}`);
  sa['short3/test'] = mk(S3, 'gold'); sa['fresh2/test'] = mk(F2, 'gold'); sa['nl_a/development'] = mk(NA, 'opus');
  const sb = clone(sa); mod(sa, sb); return [sa, sb];
};
const run = (mod, a = score(SHORT), b = score(CTRL)) => { const [sa, sb] = mkSides(mod); return compareFitsData(a, b, sa, sb, fresh); };

// ---------------------------------------------------------------- the pairing
test('a fit against itself: difference 0 with an interval of [0, 0]', () => {
  const r = run(() => {});
  for (const k of [FRESH_KEY, CREATE_KEY]) { const v = r.comparisons[k].variants['gold.today.gate']; assert.equal(v.difference, 0); assert.deepEqual(v.ci95, [0, 0]); }
  assert.equal(r.bars.find(b => b.id === 'P1').pass, false);   // [0, 0]: the lower end is not above 0
  assert.equal(r.bars.find(b => b.id === 'P3').pass, false);
});
test('one more right request is +1 per 100; one more wrong request costs 10 per 100', () => {
  // t1 has 100 requested actions: one message more right in A
  let r = run((sa) => { sa[FRESH_KEY].tallies['gold.today.gate'].right[0] = 1; });
  assert.equal(r.comparisons[FRESH_KEY].variants['gold.today.gate'].difference, 1);
  r = run((sa) => { sa[FRESH_KEY].tallies['gold.today.gate'].bad[0] = 1; });
  assert.equal(r.comparisons[FRESH_KEY].variants['gold.today.gate'].difference, -10);
  // a wrong request in A that B did right: -11 (loses its +1 and pays 10)
  r = run((sa, sb) => { sb[FRESH_KEY].tallies['gold.today.gate'].right[0] = 1; sa[FRESH_KEY].tallies['gold.today.gate'].bad[0] = 1; });
  assert.equal(r.comparisons[FRESH_KEY].variants['gold.today.gate'].difference, -11);
});
test('the span is the resampled unit on synth_short_t1: two wordings of one command are one unit', () => {
  const r = run(() => {});
  assert.equal(r.comparisons[FRESH_KEY].messages, 100); assert.equal(r.comparisons[FRESH_KEY].resampled_units, 50);
  assert.equal(r.comparisons[CREATE_KEY].messages, 50); assert.equal(r.comparisons[CREATE_KEY].resampled_units, 25);
  assert.equal(r.comparisons['short3/test'].resampled_units, 40);   // the other sets keep compare_arms.mjs's unit (the message)
  assert.match(r.comparisons[FRESH_KEY].unit, /request span/);
  // without the override the same sidecar would count 100 units
  const [sa, sb] = mkSides();
  assert.equal(compareSidecars({ [FRESH_KEY]: sa[FRESH_KEY] }, { [FRESH_KEY]: sb[FRESH_KEY] }, score(SHORT), score(CTRL))[FRESH_KEY].resampled_units, 100);
});
test('a message with more than one request, or none with a form, is refused for the span unit', () => {
  const items = [{ id: 'a', wires: [{ span: 'x' }, { span: 'y' }] }];
  assert.throws(() => freshInfo(items, [{ id: 'a', meta: { form: 'create' } }]), /not one/);
  assert.throws(() => freshInfo([{ id: 'a', wires: [{ span: 'x' }] }], [{ id: 'a', meta: {} }]), /no meta.form/);
  assert.throws(() => freshInfo([{ id: 'a', wires: [{ span: 'x' }] }], [{ id: 'b', meta: { form: 'create' } }]), /not in the set's files/);
  const f = freshInfo([{ id: 'a', wires: [{ span: ' Add  A\tRed circle ' }] }], [{ id: 'a', meta: { form: 'create' } }]);
  assert.equal(f.spans.get('a'), 'add a red circle'); assert.equal(f.forms.get('a'), 'create');
});
test('the create subset equals compareSidecars on a hand-filtered sidecar (every per-message array)', () => {
  const [sa, sb] = mkSides((a, b) => {   // make A and B differ on both forms, with two sessions-free groups
    for (const i of [3, 10, 27, 60, 77]) a[FRESH_KEY].tallies['gold.today.gate'].right[i] = 1;
    for (const i of [5, 31]) a[FRESH_KEY].tallies['gold.today.gate'].bad[i] = 1;
    a[FRESH_KEY].overlap[4] = true;   // an overlap flag in the subset (and one outside it below)
    b[FRESH_KEY].overlap[70] = true;
  });
  const r = compareFitsData(score(SHORT), score(CTRL), sa, sb, fresh);
  // by hand: the first 50 messages (form create), their span groups
  const hand = sc => { const take = x => x.slice(0, 50), out = { ids: take(sc.ids), session: take(sc.session), group: take(sc.ids.map((_, i) => spanOf(i))), overlap: take(sc.overlap), tallies: {} };
    for (const [v, t] of Object.entries(sc.tallies)) out.tallies[v] = { right: take(t.right), bad: take(t.bad), G: take(t.G) }; return out; };
  const want = compareSidecars({ [FRESH_KEY]: hand(sa[FRESH_KEY]) }, { [FRESH_KEY]: hand(sb[FRESH_KEY]) }, score(SHORT), score(CTRL))[FRESH_KEY];
  const got = clone(r.comparisons[CREATE_KEY]); want.unit = got.unit;   // only the label of the unit is renamed
  assert.deepEqual(got, clone(want));
  assert.equal(got.messages, 50);
  // an array nobody filters is refused, as is one of the wrong length
  assert.throws(() => subsetSidecar({ ...sa[FRESH_KEY], extra: [1] }, [0]), /unknown field extra/);
  assert.throws(() => subsetSidecar({ ...sa[FRESH_KEY], overlap: [false] }, [0]), /one value per message/);
  const t = clone(sa[FRESH_KEY]); t.tallies['gold.today.gate'].bad = [0]; assert.throws(() => subsetSidecar(t, [0]), /one value per message/);
});
test('two fits that are not one comparison are refused: swapped, other readings, other sets, other messages, other fit', () => {
  const [sa, sb] = mkSides();
  assert.throws(() => compareFitsData(score(CTRL), score(SHORT), sb, sa, fresh), /must be F_short/);   // swapped arguments
  assert.throws(() => compareFitsData(score(SHORT), score(SHORT), sa, sb, fresh), /must be F_ctrl/);
  assert.throws(() => compareFitsData(score(CTRL), score(CTRL), sa, sb, fresh), /must be F_short/);
  assert.throws(() => compareFitsData(score(SHORT), score(['fresh2', 'short3']), sa, sb, fresh), /more than short_synth/);
  assert.throws(() => compareFitsData(score([...CTRL, 'collected_1', 'short_synth']), score(CTRL), sa, sb, fresh), /more than short_synth/);
  assert.throws(() => compareFitsData({ ...score(SHORT), artifact: 'art2' }, score(CTRL), sa, sb, fresh), /other model artifacts/);
  assert.throws(() => compareFitsData({ ...score(SHORT), reader: 'sop' }, score(CTRL), sa, sb, fresh), /other readers/);
  assert.throws(() => compareFitsData({ ...score(SHORT), record_files: ['rec_a.jsonl'] }, score(CTRL), sa, sb, fresh), /other record files/);
  assert.throws(() => compareFitsData({ ...score(SHORT), record_files: [] }, { ...score(CTRL), record_files: [] }, sa, sb, fresh), /other record files/);
  assert.throws(() => compareFitsData({ ...score(SHORT), threshold_cost10: null }, score(CTRL), sa, sb, fresh), /not the score file/);
  const fewer = clone(sb); delete fewer['nl_a/development'];
  assert.throws(() => compareFitsData(score(SHORT), score(CTRL), sa, fewer, fresh), /other sets and parts/);
  const other = clone(sb); other['short3/test'].ids[0] = 'zzz';
  assert.throws(() => compareFitsData(score(SHORT), score(CTRL), sa, other, fresh), /different messages/);
  const other1 = clone(sb); other1[FRESH_KEY].ids[0] = 'zzz';
  assert.throws(() => compareFitsData(score(SHORT), score(CTRL), sa, other1, fresh), /different messages|not a message of the set/);
  const sess = clone(sa); sess[FRESH_KEY].session[0] = 's'; assert.throws(() => compareFitsData(score(SHORT), score(CTRL), sess, sb, fresh), /has a session/);
  assertSameFit(score(SHORT), score(SHORT));   // compare_arms.mjs's own check is the one this file replaces: it refuses these two fits
  assert.throws(() => assertSameFit(score(SHORT), score(CTRL)), /not fitted on the same/);
  assertFitPair(score(SHORT), score(CTRL));
});

// ---------------------------------------------------------------- the bars
// a comparisons object in which every bar passes, then one thing broken at a time
const v = (difference, ci95) => ({ difference, ci95 });
const comps = (o = {}) => {
  const c = (variant, x, extra = {}) => ({ messages: 10, resampled_units: 10, unit: 'message', variants: { [variant]: x }, ...extra });
  return { [FRESH_KEY]: c('gold.today.gate', o.p1 ?? v(30, [10, 50])), [CREATE_KEY]: c('gold.today.gate', o.p3 ?? v(30, [10, 50])),
    'short3/test': c('gold.today.gate', o.g1 ?? v(-1, [-3, 1])), 'fresh2/test': c('gold.today.gate', o.g2 ?? v(0, [-2, 2])), 'nl_a/development': c('opus.today.gate', o.g3 ?? v(0, [-1, 1])) };
};
const scores = (o = {}) => {
  const b = { 'short3/test': block(432, 5, 0, 58), 'fresh2/test': block(1313, 5, 3, 690), 'nl_a/development': block(392, 0, 1, 8), 'synth_short_t1/all': block(1793, 4, 0, 400) };
  const a = { 'short3/test': block(432, 9, 0, 80), 'fresh2/test': block(1313, 21, 0, 800), 'nl_a/development': block(392, 4, 0, 20), 'synth_short_t1/all': block(1793, 4, 0, 800) };   // each at the limit: 9, 21, 4
  return [score(SHORT, { ...a, ...(o.a || {}) }), score(CTRL, { ...b, ...(o.b || {}) })];
};
const bar = (r, id) => r.bars.find(b => b.id === id);
const eval_ = (co = {}, so = {}) => evaluateBars(...scores(so), comps(co));

test('every bar passes at its limits: the verdict is PASS and lists exactly six bars', () => {
  const r = eval_();
  assert.deepEqual(r.bars.map(b => b.id), ['P1', 'P2', 'P3', 'G1', 'G2', 'G3']);
  assert.deepEqual(r.bars.map(b => b.pass), [true, true, true, true, true, true], JSON.stringify(r.bars.filter(b => !b.pass)));
  assert.equal(r.verdict, 'PASS'); assert.deepEqual(r.misses, []);
  assert.deepEqual([bar(r, 'G1'), bar(r, 'G2'), bar(r, 'G3')].map(b => b.mistake_limit_floor), [9, 21, 4]);   // the plan's limits, computed from the score files
  assert.deepEqual([bar(r, 'G1'), bar(r, 'G2'), bar(r, 'G3')].map(b => [b.a_mistakes, b.b_mistakes]), [[9, 5], [21, 8], [4, 1]]);
});
test('P1 and P3: the lower end of ci95 must be above 0 (0 is a miss); null is a miss', () => {
  for (const [id, key] of [['P1', 'p1'], ['P3', 'p3']]) {
    assert.equal(bar(eval_({ [key]: v(1, [0.0001, 3]) }), id).pass, true);
    assert.equal(bar(eval_({ [key]: v(1, [0, 3]) }), id).pass, false);      // exactly 0
    assert.equal(bar(eval_({ [key]: v(-1, [-3, -1]) }), id).pass, false);
    assert.equal(bar(eval_({ [key]: v(1, null) }), id).pass, false);        // too few units
    assert.equal(bar(eval_({ [key]: v(1, [null, 3]) }), id).pass, false);   // null > 0 is false, but null >= 0 would be true: stay strict
    assert.equal(bar(eval_({ [key]: v(1, [undefined, 3]) }), id).pass, false);
    assert.equal(bar(eval_({ [key]: v(1, ['5', 7]) }), id).pass, false);    // a string is not a number
    assert.equal(bar(eval_({ [key]: v(null, [1, 3]) }), id).pass, true);    // the bar is on the interval; the difference is reported
  }
  // a missing comparison, or a comparison without the variant, is a miss, not a skip
  for (const [id, key] of [['P1', FRESH_KEY], ['P3', CREATE_KEY]]) {
    const c = comps(); delete c[key]; const r = evaluateBars(...scores(), c); assert.equal(bar(r, id).pass, false); assert.match(bar(r, id).reason, /no comparison/); assert.equal(r.verdict, 'MISS');
    const d = comps(); d[key].variants = { 'gold.today.all': v(1, [1, 2]) }; assert.equal(bar(evaluateBars(...scores(), d), id).pass, false);
  }
});
test('P2: F_short\'s confidently wrong share <= F_ctrl\'s, fractions as they are; a null share is a miss', () => {
  const share = (aw, ae, ax, bw, be, bx) => bar(eval_({}, { a: { 'synth_short_t1/all': block(1793, aw, ae, ax) }, b: { 'synth_short_t1/all': block(1793, bw, be, bx) } }), 'P2');
  assert.equal(share(4, 0, 800, 4, 0, 800).pass, true);      // equal passes
  assert.equal(share(4, 0, 800, 3, 0, 400).pass, true);      // 0.005 against 0.0075
  assert.equal(share(4, 0, 799, 3, 0, 800).pass, false);     // 0.005006 against 0.00375
  assert.equal(share(4, 0, 400, 4, 0, 800).pass, false);     // 0.01 against 0.005
  assert.equal(share(0, 0, 10, 4, 0, 800).pass, true);
  assert.equal(share(0, 0, 0, 4, 0, 800).pass, false);       // F_short executes nothing: null share (null <= 0.005 is true in JavaScript)
  assert.equal(share(0, 0, 10, 0, 0, 0).pass, false);        // F_ctrl executes nothing: null on the B side
  assert.equal(share(0, 0, 0, 0, 0, 0).pass, false);         // both
  const nul = eval_({}, { a: { 'synth_short_t1/all': { ...block(1793, 4, 0, 800), wrong_execution_share: null } } }); assert.equal(bar(nul, 'P2').pass, false);
  const nulb = eval_({}, { b: { 'synth_short_t1/all': { ...block(1793, 4, 0, 800), wrong_execution_share: null } } }); assert.equal(bar(nulb, 'P2').pass, false);
  const str = eval_({}, { a: { 'synth_short_t1/all': { ...block(1793, 4, 0, 800), wrong_execution_share: '0.001' } } }); assert.equal(bar(str, 'P2').pass, false);
  const gone = scores(); delete gone[0].sets.synth_short_t1; assert.equal(bar(evaluateBars(gone[0], gone[1], comps()), 'P2').pass, false);
});
test('G1-G3: ci95[1] >= 0, difference >= -5, and confident mistakes within the limit; each rule alone decides', () => {
  for (const [id, key, set, req, ctrl] of [['G1', 'g1', 'short3/test', 432, [5, 0]], ['G2', 'g2', 'fresh2/test', 1313, [5, 3]], ['G3', 'g3', 'nl_a/development', 392, [0, 1]]]) {
    const ctrlM = ctrl[0] + ctrl[1], limit = Math.floor(ctrlM + req / 100);
    // the interval's upper end: 0 passes, below 0 misses
    assert.equal(bar(eval_({ [key]: v(-1, [-3, 0]) }), id).pass, true);
    assert.equal(bar(eval_({ [key]: v(-1, [-3, -0.0001]) }), id).pass, false);
    assert.equal(bar(eval_({ [key]: v(-1, [-3, null]) }), id).pass, false);   // null >= 0 is true in JavaScript
    assert.equal(bar(eval_({ [key]: v(-1, null) }), id).pass, false);
    // the point loss: -5 passes, below -5 misses, null misses
    assert.equal(bar(eval_({ [key]: v(-5, [-7, 3]) }), id).pass, true);
    assert.equal(bar(eval_({ [key]: v(-5.0001, [-7, 3]) }), id).pass, false);
    assert.equal(bar(eval_({ [key]: v(null, [-7, 3]) }), id).pass, false);    // null >= -5 is true in JavaScript
    assert.equal(bar(eval_({ [key]: v(undefined, [-7, 3]) }), id).pass, false);
    // the mistakes: the limit passes, one more misses
    const A = (wrong) => ({ a: { [set]: block(req, wrong, 0, 100) } }), B = (o) => ({ b: { [set]: o } });
    assert.equal(bar(eval_({}, A(limit)), id).pass, true, id + ' at the limit ' + limit);
    assert.equal(bar(eval_({}, A(limit + 1)), id).pass, false, id + ' over the limit');
    assert.equal(bar(eval_({}, { a: { [set]: block(req, limit - 1, 1, 100) } }), id).pass, true);    // extras count like wrong
    assert.equal(bar(eval_({}, { a: { [set]: block(req, limit, 1, 100) } }), id).pass, false);
    assert.equal(bar(eval_({}, { a: { [set]: { ...block(req, 0, 0, 100), wrong: null } } }), id).pass, false);   // null on the A side (null + 0 is 0 in JavaScript)
    assert.equal(bar(eval_({}, { a: { [set]: { ...block(req, 0, 0, 100), extras: null } } }), id).pass, false);
    assert.equal(bar(eval_({}, B({ ...block(req, ctrl[0], ctrl[1], 100), wrong: null })), id).pass, false);        // null on the B side
    assert.equal(bar(eval_({}, B({ ...block(req, ctrl[0], ctrl[1], 100), extras: undefined })), id).pass, false);
    // a different count of requested actions in the two fits: refused as a miss, not compared
    assert.equal(bar(eval_({}, { a: { [set]: block(req + 1, 0, 0, 100) } }), id).pass, false);
    assert.equal(bar(eval_({}, { a: { [set]: { ...block(req, 0, 0, 100), requested: null } } }), id).pass, false);
    // a missing block or a missing comparison is a miss
    const gone = scores(); delete gone[0].sets[set.split('/')[0]]; assert.equal(bar(evaluateBars(gone[0], gone[1], comps()), id).pass, false);
    const c = comps(); delete c[set]; assert.equal(bar(evaluateBars(...scores(), c), id).pass, false);
  }
  // the limit is ctrl + requested / 100 per 100 requested: 9.32 -> 9, 21.13 -> 21, 4.92 -> 4
  const r = eval_(); assert.deepEqual(['G1', 'G2', 'G3'].map(id => bar(r, id).mistake_limit), [5 + 4.32, 8 + 13.13, 1 + 3.92]);
});
test('the verdict is all of exactly six: one miss is a MISS, and nothing computed elsewhere can make up for a missing bar', () => {
  assert.equal(eval_({ p1: v(1, [0, 2]) }).verdict, 'MISS'); assert.deepEqual(eval_({ p1: v(1, [0, 2]) }).misses, ['P1']);
  assert.equal(eval_({ g3: v(0, [-5, -1]) }).verdict, 'MISS');
  const c = comps(); c['extra/test'] = { messages: 1, variants: { 'gold.today.gate': v(99, [98, 100]) } };   // a further comparison changes nothing
  assert.equal(evaluateBars(...scores(), c).verdict, 'PASS');
  const d = comps(); delete d['nl_a/development']; const r = evaluateBars(...scores(), d);   // the rest pass; one comparison is absent
  assert.equal(r.verdict, 'MISS'); assert.deepEqual(r.misses, ['G3']);
  const none = evaluateBars(...scores(), {});   // no comparison at all: P2 (score files only) can still pass, the other five are misses
  assert.equal(none.verdict, 'MISS'); assert.deepEqual(none.misses, ['P1', 'P3', 'G1', 'G2', 'G3']); assert.equal(none.bars.length, 6);
});

console.log(`${n} checks passed${process.exitCode ? ', some FAILED' : ''}`);
