// test_modernbert_next_measure.mjs: the checks of the ModernBERT-next measuring tools (modernbert_next_measure.mjs, and the truthful_v1 view, the grouped
// calibration, the frozen views and the view-aware collection of arm_lib.mjs, score_arm.mjs, calibrate_arm.mjs, collect_set.mjs).
//   node training/neural/parity/test_modernbert_next_measure.mjs
// The false-pass checks come first in spirit: a defect in the scorer or the verdict tables must make one of these fail. A missing cached file or protocol FAILS a test, it is not skipped.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, existsSync, readdirSync, chmodSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir, homedir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { sha256Mod } from './sets.mjs';
import { loadRecords, buildRecord, truthfulJudge, truthfulOutcomes, truthfulItemsOf, numericScale, textKeys, SCALE_TOLERANCE, loadViewDir, loadPopulations, setItems } from './arm_lib.mjs';
import { decideTruthful, truthfulStats, truthfulPopulation, truthfulPart, truthfulSidecar, scoreArmTruthful, structuralHolds, wilson, levelReconciles } from './score_arm.mjs';
import { fitRecipeGrouped, assertGroupedFolds, foldOf, calibrateGrouped } from './calibrate_arm.mjs';
import { table } from '../calibrate_modernbert.mjs';
import { NAMES } from '../calibrate_modernbert.mjs';
import * as M from './modernbert_next_measure.mjs';
import { SEED, RESAMPLES, MIN_UNITS } from './compare_arms.mjs';
import { runOfNeural, blockOf } from './collect_set.mjs';
import { nextContext } from '../../../docs/js/vss-composer.js';
import { analyzePartTruthful, needsKeys, needsKeysV1, DEFAULT_LAYOUT, PLAN_CATEGORIES, classifyRecord } from './root_causes.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url)), TMP = mkdtempSync(tmpdir() + '/test-next-measure-');
const CACHE = homedir() + '/.cache/diagram-vss-modernbert', PROTOCOL = CACHE + '/next-2026-11-08/protocol-v2/protocol.json';
let n = 0;
const test = (name, fn) => { try { fn(); n++; console.log('ok   ' + name); } catch (e) { console.log('FAIL ' + name + '\n' + (e.stack || e)); process.exitCode = 1; } };

// ---------------------------------------------------------------- fixtures
const wire = (span, type, args, trigger) => ({ span, trigger: trigger ?? span.split(' ')[0], type, args });
const node = (id, type, args) => ({ id, type, args });
const r4 = x => Math.round(x * 1e6) / 1e6;
const evidenceFile = (id, over = {}) => { const f = TMP + `/ev-${id}.txt`; writeFileSync(f, 'evidence ' + id); return { status: 'pass', command: 'node x', evidence: f, sha256: sha256Of(readFileSync(f)), ...over }; };
const sha256Of = b => createHash('sha256').update(b).digest('hex');
let gk = 0;
const mkItem = (o = {}) => { const id = o.id ?? 'x' + ++gk; return { id, set: 'viewx', part: 'test', kind: 'short', writer: null, session: null, group: null, setup: null, names: ['Moon', 'Sun'], groups: {}, text: 'shrink the moon', wires: [], altWires: null, unreliable: false, source: 't', group_key: 'G' + id, fold: foldOf('G' + id), roles: [], meta: null, origin_id: null, ...o }; };
const main = (nd, span, f = null, extra = {}) => ({ node: nd, mentions: [], span, src: '', f, act: f ? 'create' : null, truncated: false, wireId: nd.id, dependencies: [], ...extra });
const rec = (item, mains) => buildRecord(item, { reader: 'modernbert', mains, allNodes: mains.map(m => m.node) }, { seen: () => true, artifactsKey: 'a' });
const F = (v, i = 0) => Object.fromEntries(NAMES.map(([k], j) => [k, v - (i + j) * 1e-4]));   // the 24 signals, high v = confident
/** a spec whose confidence is a function of act_p only: a high act_p is confident, 0.05 is not; threshold in between */
const SPEC = { reader: 'modernbert', intercept: 0, features: [{ name: 'act_p', weight: 6 }], tables: { act_p: table([0.05, 0.9], 1) }, act_prior: {}, act_prior_default: .5, levels_out_of_fold: { cost: { threshold: 0.9, score: 0, executed: 0 } }, arm: { cal_sets: ['calibration'] }, artifacts: 'a' };
const THR = 0.9;   // c(act_p 0.9) = 0.989, c(act_p 0.05) = 0.818
const fHi = () => ({ ...F(.95), act_p: 0.9 }), fLo = () => ({ ...F(.2), act_p: 0.05 });
const gold = (span, args, type = 'command') => wire(span, type, args);
const one = (text, w, mains, extra = {}) => rec(mkItem({ text, wires: [w], ...extra }), mains);

// ---------------------------------------------------------------- truthful_v1: the scale
test('truthful_v1: a wrong explicit scale with the right direction is wrong (today and direction call it right)', () => {
  const g = gold('shrink the moon', { action: 'resize', target: 'Moon', scale: '0.5' });
  const r = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '0.8' }), [0, 15])]);
  assert.equal(r.produced[0].o, 'right');                              // the pairing (scale is skipped by bench-canon)
  const t = truthfulOutcomes(r)[0];
  assert.equal(t.o, 'wrong'); assert.deepEqual(t.reasons, ['scale']);
  const ok = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: 0.5 }), [0, 15])]);
  assert.equal(truthfulOutcomes(ok)[0].o, 'right');                    // a number equal to the gold string
  const within = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: String(0.5 + SCALE_TOLERANCE / 2) }), [0, 15])]);
  assert.equal(truthfulOutcomes(within)[0].o, 'right');
  const beyond = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: String(0.5 + 2 * SCALE_TOLERANCE) }), [0, 15])]);
  assert.equal(truthfulOutcomes(beyond)[0].o, 'wrong');
  const missing = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon' }), [0, 15])]);   // no scale written: bigger, and no scale
  assert.equal(truthfulOutcomes(missing)[0].o, 'wrong');
  const junk = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: 'x0.5' }), [0, 15])]);
  assert.equal(truthfulOutcomes(junk)[0].o, 'wrong');
  assert.ok(Number.isNaN(numericScale('')) && Number.isNaN(numericScale(null)) && numericScale(['2']) === 2 && Number.isNaN(numericScale(['2', '3'])));
});
test('truthful_v1: a gold with no scale is read by direction only, and that is reported', () => {
  const g = gold('shrink the moon', { action: 'resize', target: 'Moon' });
  const grow = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon' }), [0, 15])]);
  assert.equal(truthfulOutcomes(grow)[0].o, 'wrong'); assert.deepEqual(truthfulOutcomes(grow)[0].reasons, ['direction']);
  const small = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '0.3' }), [0, 15])]);
  const t = truthfulOutcomes(small)[0]; assert.equal(t.o, 'right'); assert.equal(t.directionOnly, true);
  assert.equal(truthfulItemsOf([small]).directionOnly, 1);
  const growth = one('enlarge the moon', gold('enlarge the moon', { action: 'resize', target: 'Moon' }), [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '0.5' }), [0, 16])]);
  assert.equal(truthfulOutcomes(growth)[0].o, 'wrong');                 // shrank where growth was asked
});
test('truthful_v1: what cannot be compared is unavailable, counted wrong, and the part says so', () => {
  const g = gold('shrink the moon', { action: 'resize', target: 'Moon', scale: '0.5' });
  const r = one('shrink the moon', g, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '0.5' }), [0, 15], fHi())]);
  assert.equal(truthfulOutcomes(r)[0].o, 'right');
  const legacy = JSON.parse(JSON.stringify(r)); delete legacy.produced[0].nodes;              // a record of the first run: no raw arguments
  const t = truthfulOutcomes(legacy)[0]; assert.equal(t.o, 'wrong'); assert.equal(t.unavailable, true);
  const p = truthfulPopulation([legacy], SPEC, THR, null);
  assert.equal(p.available, false); assert.equal(p.unavailable_requests, 1); assert.equal(p.ungated.right, 0);
  const nodir = JSON.parse(JSON.stringify(one('shrink the moon', gold('shrink the moon', { action: 'resize', target: 'Moon' }), [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '0.5' }), [0, 15])]))); delete nodir.produced[0].dir;
  assert.equal(truthfulOutcomes(nodir)[0].unavailable, true);
  const gs = one('shrink the moon', gold('shrink the moon', { action: 'resize', target: 'Moon', scale: 'half' }), [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '0.5' }), [0, 15])]);
  assert.equal(truthfulOutcomes(gs)[0].unavailable, true);              // the gold scale is not a number: never correct
});

// ---------------------------------------------------------------- truthful_v1: the text keys
test('truthful_v1: the text keys are the legend\'s, read from it', () => { assert.deepEqual(textKeys(), ['about', 'label', 'title']); });
test('truthful_v1: an omitted empty text is wrong; an empty text where the gold writes none is wrong too (both directions); exact value, case included', () => {
  const rm = gold('remove the label from Moon', { action: 'label', target: 'Moon', label: '' });
  const omitted = one('remove the label from Moon', rm, [main(node('n1', 'command', { action: 'label', target: 'Moon' }), [0, 26])]);
  assert.equal(omitted.produced[0].o, 'wrong');                         // equalWant reads the gold's key: label '' against ∅
  const empty = one('remove the label from Moon', rm, [main(node('n1', 'command', { action: 'label', target: 'Moon', label: '' }), [0, 26])]);
  assert.equal(empty.produced[0].o, 'right'); assert.equal(truthfulOutcomes(empty)[0].o, 'right');
  const nolabel = gold('delete Moon', { action: 'delete', target: 'Moon' });
  const unwanted = one('delete Moon', nolabel, [main(node('n1', 'command', { action: 'delete', target: 'Moon', label: '' }), [0, 11])]);
  assert.equal(unwanted.produced[0].o, 'right');                        // the pairing ignores a key the gold does not have
  assert.equal(truthfulOutcomes(unwanted)[0].o, 'wrong'); assert.deepEqual(truthfulOutcomes(unwanted)[0].reasons, ['text:label unwanted']);
  const lab = gold('label Moon Yes', { action: 'label', target: 'Moon', label: 'Yes' });
  const exact = one('label Moon Yes', lab, [main(node('n1', 'command', { action: 'label', target: 'Moon', label: 'Yes' }), [0, 14])]);
  assert.equal(truthfulOutcomes(exact)[0].o, 'right');
  const lower = one('label Moon Yes', lab, [main(node('n1', 'command', { action: 'label', target: 'Moon', label: 'yes' }), [0, 14])]);
  assert.equal(lower.produced[0].o, 'right'); assert.equal(truthfulOutcomes(lower)[0].o, 'wrong'); assert.deepEqual(truthfulOutcomes(lower)[0].caseOnly, ['label']);
  assert.equal(truthfulItemsOf([lower]).caseOnly, 1);
  const ws = one('label Moon Yes', lab, [main(node('n1', 'command', { action: 'label', target: 'Moon', label: ' Yes' }), [0, 14])]);
  assert.equal(truthfulOutcomes(ws)[0].o, 'wrong');                     // whitespace is not silently trimmed
  const none = one('label Moon none', gold('label Moon none', { action: 'label', target: 'Moon', label: 'none' }), [main(node('n1', 'command', { action: 'label', target: 'Moon', label: '' }), [0, 15])]);
  assert.equal(truthfulOutcomes(none)[0].o, 'wrong');                   // the literal "none" is text; empty is another state
});
test('truthful_v1: a wrong stays wrong and an extra stays an extra (only a right request is judged again)', () => {
  const r = rec(mkItem({ text: 'delete Moon', wires: [gold('delete Moon', { action: 'delete', target: 'Moon' })] }), [main(node('n1', 'command', { action: 'delete', target: 'Sun' }), [0, 11]), main(node('n2', 'command', { action: 'move', target: 'Moon' }), [0, 5])]);
  assert.deepEqual(truthfulOutcomes(r).map(x => x.o), ['wrong', 'extra']);
});

// ---------------------------------------------------------------- structural holds, denominators, populations
const del = (id, span, tgt, f, extra = {}) => main(node(id, 'command', { action: 'delete', target: tgt }), span, f, extra);
const tenGold = () => Array.from({ length: 10 }, (_, i) => gold(`delete ${'ABCDEFGHIJ'[i]}1`, { action: 'delete', target: 'ABCDEFGHIJ'[i] + '1' }));
const tenText = tenGold().map(w => w.span).join('. ');
const onePlusNine = () => {
  const ws = tenGold(), item = mkItem({ text: tenText, names: ws.map(w => w.args.target), wires: ws }), spans = [];
  let at = 0; for (const w of ws) { const s = tenText.indexOf(w.span, at); spans.push([s, s + w.span.length]); at = s + w.span.length; }
  const mains = ws.map((w, i) => del('n' + i, spans[i], w.args.target, fHi(), i === 0 ? {} : { blocked: true, block_reasons: [{ kind: 'text-state', key: 'label', source_span: w.span }] }));
  return rec(item, mains);
};
test('structural holds count in the denominators: 1 correct + 9 held scores 10% and fails a 90% bar', () => {
  const r = onePlusNine();
  assert.equal(r.produced.filter(x => x.blocked).length, 9); assert.equal(r.produced[1].o, 'right');
  for (const level of ['ungated', 'gated']) {
    const p = truthfulPopulation([r], SPEC, THR, null)[level];
    assert.equal(p.requested, 10); assert.equal(p.right, 1); assert.equal(p.right_share, 0.1);
    assert.equal(p.structural_holds.total, 9); assert.equal(p.structural_holds.would_be.right, 9); assert.equal(p.structural_holds.by_kind.blocked, 9);
    assert.equal(p.unread, 0); assert.equal(p.executed, 1); assert.equal(p.wrong + p.extras, 0); assert.ok(levelReconciles(p));
    assert.equal(p.cost_score, 10);
  }
  // a form population over the same requests: the verdict row fails the 90% bar, whatever the held requests would have been
  const pops = [{ name: 't1_clean_outline_set', view: 'viewx', part: null, requests: new Map([[r.id, new Set(r.goldSpans.map((_, i) => i))]]) }];
  const { out } = scoreArmTruthful(SPEC, [r], { populations: pops });
  const S = { name: 'S', score: { ...out, population_support: { t1_clean_outline_set: { supported: true } } }, sidecar: {} };
  const c18 = M.criterion18({ form_bars: { outline_set: 0.9 } }, S);
  assert.equal(c18.status, 'fail'); assert.equal(c18.checks[0].value, 0.1);
  const fixtureAtBar = M.criterion18({ form_bars: { outline_set: 0.1 } }, S);
  assert.equal(fixtureAtBar.status, 'pass');                             // the same fixture passes a bar it meets: the check is the number, not a constant
});
test('structural holds: a request that depends on a blocked one is held; an independent explicit request still executes; the same at every level', () => {
  const ws = [gold('make a circle', { action: 'create', shape: 'circle' }), gold('make it red', { action: 'set', target: 'it', color: 'red' }), gold('delete Sun', { action: 'delete', target: 'Sun' })];
  const text = 'make a circle. make it red. delete Sun', item = mkItem({ text, wires: ws });
  const m0 = main(node('n0', 'command', { action: 'create', shape: 'circle' }), [0, 13], fHi(), { blocked: true, block_reasons: [{ kind: 'unresolved-reference', key: 'target', source_span: 'make a circle' }] });
  const m1 = main(node('n1', 'command', { action: 'set', target: 'it', color: 'red' }), [15, 27], fHi(), { dependencies: ['n0'] });
  const m2 = main(node('n2', 'command', { action: 'delete', target: 'Sun' }), [29, 38], fHi());
  const r = rec(item, [m0, m1, m2]);
  const items = truthfulItemsOf([r]).items.map(x => ({ ...x, c: .99 }));
  for (const thr of [null, 0, THR]) {
    const d = decideTruthful(items, thr);
    assert.deepEqual(d.map(x => x.execute), [false, false, true], 'threshold ' + thr);
    assert.deepEqual(d.map(x => x.structural), ['blocked', 'dependency', null]);
    assert.equal(d[1].hold, 'structural');
  }
  // a dependency missing from the record is a hold, not a pass; a cycle never executes
  const lone = [{ id: 'm', wireId: 'a', dependencies: ['zz'], c: 1, o: 'right', g: 0 }];
  assert.equal(structuralHolds(lone).get(lone[0]), 'dependency');
  const cyc = [{ id: 'm', wireId: 'a', dependencies: ['b'], c: 1, o: 'right', g: 0 }, { id: 'm', wireId: 'b', dependencies: ['a'], c: 1, o: 'right', g: 1 }];
  assert.deepEqual(decideTruthful(cyc, 0).map(x => x.execute), [false, false]);
  // a truncated request is the existing limit hold
  assert.equal(structuralHolds([{ id: 'm', wireId: 'a', dependencies: [], truncated: true }]).values().next().value, 'limit');
});
test('extras: they count against risk and cost, are attributed to a request population by overlap, and unread requests stay in the denominator', () => {
  const item = mkItem({ text: 'delete Moon and delete Sun', wires: [gold('delete Moon', { action: 'delete', target: 'Moon' }), gold('delete Sun', { action: 'delete', target: 'Sun' })] });
  const r = rec(item, [del('n1', [0, 11], 'Moon', fHi()), main(node('n2', 'command', { action: 'move', target: 'Moon' }), [0, 5], fHi()), main(node('n3', 'command', { action: 'move', target: 'Sun' }), [16, 26], fHi())]);
  assert.deepEqual(r.produced.map(x => x.o), ['right', 'extra', 'extra']);
  const all = truthfulPopulation([r], SPEC, THR, null);
  assert.equal(all.gated.right, 1); assert.equal(all.gated.extras, 2); assert.equal(all.gated.unread, 1);   // delete Sun is unread
  assert.equal(all.gated.cost_score, 100 * (1 - 10 * 2) / 2); assert.equal(all.gated.risk, r4(2 / 3));
  const sunOnly = { name: 'p', view: 'viewx', part: null, requests: new Map([[r.id, new Set([1])]]) };
  const p = truthfulPopulation([r], SPEC, THR, sunOnly);
  assert.equal(p.requested, 1); assert.equal(p.gated.right, 0); assert.equal(p.gated.extras, 1); assert.equal(p.gated.unread, 1);   // the move overlaps "delete Sun"; the first extra overlaps "delete Moon"
  assert.equal(p.extras_unattributed, 1);
});
test('ask-all and null precision: nothing executed gives a null risk and a null interval, and a null is never a pass', () => {
  const g = gold('delete Moon', { action: 'delete', target: 'Moon' });
  const r = one('delete Moon', g, [del('n1', [0, 11], 'Moon', fLo())]);
  const p = truthfulPopulation([r], SPEC, THR, null);
  assert.equal(p.gated.executed, 0); assert.equal(p.gated.risk, null); assert.equal(p.gated.risk_wilson95, null); assert.equal(p.gated.execution_precision, null);
  assert.equal(p.gated.right_share, 0); assert.equal(p.gated.confidence_holds.total, 1); assert.equal(p.ungated.right_share, 1);
  assert.equal(wilson(0, 0), null); assert.deepEqual(wilson(0, 10).map(x => Math.round(x * 100) / 100), [0, 0.28]);
  assert.ok(!M.fin(null) && !M.fin(NaN) && !M.fin(undefined) && !M.fin('1') && M.fin(0));
  // a missing confidence fails closed: no signals, never executed at any threshold, still a hold
  const nof = one('delete Moon', g, [del('n1', [0, 11], 'Moon', null)]);
  const q = truthfulPopulation([nof], SPEC, -1e9, null);
  assert.equal(q.gated.executed, 0); assert.equal(q.gated.confidence_holds.total, 1); assert.equal(q.without_confidence, 1);
  // zero executions cannot pass a share criterion: criterion 17's risk check is unavailable, not a pass
  const mk = (bundleP) => ({ name: 'x', score: { populations: { t1_clean: bundleP }, sets: {} }, sidecar: {} });
  const row = M.criterion17({ S_vs_R: { t1_clean_cost_min_gain: 5 } }, mk({ available: true, gated: { risk: null, executed: 0 } }), mk({ available: true, gated: { risk: 0.01, executed: 5 } }));
  assert.notEqual(row.status, 'pass'); assert.equal(row.checks.find(c => c.name.startsWith('confidently wrong')).status, 'unavailable');
});
test('ungated is not gated: a confidence hold is not a structural hold, and the three kinds are told apart', () => {
  const ws = [gold('delete A1', { action: 'delete', target: 'A1' }), gold('delete B1', { action: 'delete', target: 'B1' }), gold('delete C1', { action: 'delete', target: 'C1' })];
  const text = 'delete A1. delete B1. delete C1', item = mkItem({ text, names: ['A1', 'B1', 'C1'], wires: ws });
  const r = rec(item, [del('a', [0, 9], 'A1', fHi()), del('b', [11, 20], 'B1', fLo()), del('c', [22, 31], 'C1', fHi(), { blocked: true, block_reasons: [] })]);
  const p = truthfulPopulation([r], SPEC, THR, null);
  assert.deepEqual([p.ungated.executed, p.ungated.structural_holds.total, p.ungated.confidence_holds.total], [2, 1, 0]);
  assert.deepEqual([p.gated.executed, p.gated.structural_holds.total, p.gated.confidence_holds.total], [1, 1, 1]);
  assert.equal(p.gated.confidence_holds.would_be.right, 1);
  assert.ok(levelReconciles(p.gated) && levelReconciles(p.ungated));
});
test('a legacy record (no blocked field) is never blocked; a message that produced nothing stays in the denominator', () => {
  const r = one('delete Moon', gold('delete Moon', { action: 'delete', target: 'Moon' }), [del('n1', [0, 11], 'Moon', fHi())]);
  assert.equal(r.produced[0].blocked, undefined);
  const e = rec(mkItem({ text: 'delete Moon', wires: [gold('delete Moon', { action: 'delete', target: 'Moon' })] }), []);
  const p = truthfulPopulation([r, e], SPEC, THR, null);
  assert.equal(p.requested, 2); assert.equal(p.gated.unread, 1); assert.equal(p.gated.right_share, 0.5);
});

// ---------------------------------------------------------------- the grouped calibration
const grouped = (nGroups = 60) => {
  const recs = [];
  for (let i = 0; i < nGroups; i++) {
    const right = i % 3 !== 0, id = 'c' + i, w = gold(`delete T${i}`, { action: 'delete', target: 'T' + i });
    const item = mkItem({ id, set: 'calibration', part: 'calibration', text: `delete T${i}`, names: ['T' + i], wires: [w], group_key: 'G' + (i >> 1), fold: foldOf('G' + (i >> 1)) });   // two messages per group
    recs.push(rec(item, [del('n' + i, [0, w.span.length], right ? 'T' + i : 'Other', { ...F(right ? .9 : .3, i % 7) })]));
  }
  return recs;
};
test('grouped folds: SHA256(group_key) % 5, a group is never split, a stored fold that disagrees is refused', () => {
  const cal = grouped();
  const by = assertGroupedFolds(cal);
  assert.equal(by.size, 30);
  for (const r of cal) assert.equal(by.get(r.group_key), sha256Mod(r.group_key, 5));
  const bad = JSON.parse(JSON.stringify(cal)); bad[0].fold = (bad[0].fold + 1) % 5;
  assert.throws(() => assertGroupedFolds(bad), /stored fold/);
  const nokey = JSON.parse(JSON.stringify(cal)); delete nokey[3].group_key;
  assert.throws(() => assertGroupedFolds(nokey), /no group_key/);
  const fit = fitRecipeGrouped(cal);
  assert.deepEqual(Object.keys(fit.folds).sort(), ['0', '1', '2', '3', '4']);
  assert.equal(Object.values(fit.folds).reduce((a, b) => a + b, 0), 30);
});
test('grouped folds hold on the frozen protocol: every group has one fold and it is SHA256(group_key) % 5', () => {
  const PR = M.loadProtocol(PROTOCOL), by = new Map();
  for (const r of readFileSync(resolve(PR.dir, 'groups.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)) {
    assert.equal(r.fold, sha256Mod(r.group_key, 5));
    if (by.has(r.group_key)) assert.equal(by.get(r.group_key), r.fold); else by.set(r.group_key, r.fold);
  }
  assert.ok(by.size > 20000);
});
test('grouped fit: the fit unit is the eligible produced request: blocked, dependent-on-blocked and signal-less requests are left out and stay in the denominators', () => {
  const cal = grouped();
  // a blocked request, one that depends on it, one without signals, and a message with no produced request
  const mod = (i, f) => { f(cal[i].produced[0]); };
  mod(1, x => { x.blocked = true; x.block_reasons = [{ kind: 'text-state' }]; });
  cal[2].produced[0].dependencies = ['zz'];                     // a dependency missing from the record: structural
  mod(4, x => { x.f = null; x.act = null; });
  cal[5].produced = [];
  const fit = fitRecipeGrouped(cal);
  assert.equal(fit.counts.produced, 59); assert.equal(fit.counts.structural_holds, 2); assert.equal(fit.counts.no_confidence_signals, 1); assert.equal(fit.counts.fit_units, 56);
  assert.equal(fit.G, 60);                                       // every gold request is requested, whatever was produced
  const L = fit.oofLevels.cost; assert.equal(L.requested, 60); assert.ok(L.structural_holds.total === 2 && levelReconciles(L));
  assert.ok(L.confidence_holds.total >= 1);                      // the signal-less one is a hold (fail closed), never executed
  assert.ok(fit.spec.levels_out_of_fold.cost.threshold <= 1.0000001);
});
test('grouped fit: the threshold is the OOF cost argmax with ask-all available; an arm that is wrong everywhere asks everything', () => {
  const cal = grouped(), allWrong = cal.map(r => { const c = JSON.parse(JSON.stringify(r)); c.produced[0].o = 'wrong'; return c; });
  const fit = fitRecipeGrouped(allWrong);
  assert.equal(fit.fitAvailable, false); assert.equal(fit.spec.levels_out_of_fold.cost.threshold, 1.0000001); assert.equal(fit.spec.fit_status.startsWith('asks everything'), true);
  const good = fitRecipeGrouped(cal);
  assert.equal(good.fitAvailable, true); assert.ok(good.best.lam != null && [.01, .1, 1, 10].includes(good.best.lam));
  assert.equal(good.tried.length, 4); assert.equal(good.tried.map(x => x.l2).join(), '0.01,0.1,1,10');
  for (const k of ['cost1', 'cost2', 'cost5', 'cost', 'cost20']) assert.ok(k in good.spec.levels_out_of_fold && k in good.oofLevels);
  // deterministic: the same records give the same bytes
  assert.equal(JSON.stringify(fitRecipeGrouped(cal).spec), JSON.stringify(good.spec));
});
test('grouped calibration refuses unavailable outcomes, text overlaps and a view with no calibration part', () => {
  const cal = grouped(), noRaw = JSON.parse(JSON.stringify(cal)); delete noRaw[1].produced[0].nodes;   // message 1 is a right request: only a request that is right under the pairing is judged again
  assert.throws(() => fitRecipeGrouped(noRaw), /no truthful_v1 outcome/);
  const withOverlap = JSON.parse(JSON.stringify(cal)); withOverlap[0].train_text_overlap = true; withOverlap.forEach(r => { r.artifacts_sha256 = 'a'; r.set = 'calibration'; });
  assert.throws(() => calibrateGrouped(withOverlap, 'calibration'), /train_text_overlap|not a set or view/);
  assert.throws(() => calibrateGrouped(cal, 'nl_a'), /no calibration|not a set/);
});

// ---------------------------------------------------------------- the legacy invocation is untouched
test('legacy calibrate_arm and score_arm: the 2026-11-06 C100 fit is byte for byte and the score file equal (reproduce, the same check)', () => {
  const C = CACHE + '/arms/C100-s0', recs = ['rec_fs', 'rec_nl', 'rec_cs'].map(f => `${C}/eval/${f}.jsonl`), conf = TMP + '/legacy.conf.json';
  for (const f of recs) assert.ok(existsSync(f), f + ' is missing');
  execFileSync('node', [HERE + 'calibrate_arm.mjs', '--cal', 'fresh2,short3,nl_a', conf, TMP + '/legacy.rep.json', ...recs]);
  assert.ok(readFileSync(conf).equals(readFileSync(`${C}/eval/cal-fresh2-short3-nl_a.confidence.json`)));
  execFileSync('node', [HERE + 'score_arm.mjs', conf, TMP + '/legacy.score.json', ...recs]);
  assert.deepEqual(M.deepDiff(JSON.parse(readFileSync(TMP + '/legacy.score.json', 'utf8')), JSON.parse(readFileSync(`${C}/eval/cal-fresh2-short3-nl_a.score.json`, 'utf8'))), []);
});
test('arm_lib: a record carries blocked / block_reasons only when the run did, and the frozen group only when the item has one (legacy records keep their bytes)', () => {
  const legacy = buildRecord({ id: 'q', set: 'fresh2', part: 'test', kind: 'short', writer: null, session: null, group: null, setup: null, names: [], text: 'delete Moon', wires: [gold('delete Moon', { action: 'delete', target: 'Moon' })], altWires: null }, { reader: 'sop', mains: [del('n', [0, 11], 'Moon')], allNodes: [] }, { seen: () => true, artifactsKey: 'a' });
  assert.ok(!('blocked' in legacy.produced[0]) && !('group_key' in legacy) && !('fold' in legacy));
  const r = rec(mkItem({ text: 'delete Moon', wires: [gold('delete Moon', { action: 'delete', target: 'Moon' })] }), [del('n', [0, 11], 'Moon', fHi(), { blocked: false })]);
  assert.equal(r.produced[0].blocked, false); assert.deepEqual(r.produced[0].block_reasons, []); assert.ok(r.group_key.startsWith('G'));
});

// ---------------------------------------------------------------- the verdict tables: false-pass checks
/** a bundle of fixture records: n messages in n groups, each one delete request; `right` of them right and confident, `bad` confident and wrong */
const bundleOf = (name, spec, spec2, { right, bad, held = 0, view = 'fresh2_test', part = 'test', extraSets = [] }) => {
  const recs = [];
  const mk = (i, kind) => { const id = `${view}-${i}`, w = gold(`delete T${i}`, { action: 'delete', target: 'T' + i }), item = mkItem({ id, set: view, part, text: `delete T${i}`, names: ['T' + i], wires: [w], group_key: 'g' + i });
    return rec(item, [del('n', [0, w.span.length], kind === 'bad' ? 'Other' : 'T' + i, kind === 'held' ? fLo() : fHi())]); };
  for (let i = 0; i < right; i++) recs.push(mk(i, 'right'));
  for (let i = 0; i < bad; i++) recs.push(mk(right + i, 'bad'));
  for (let i = 0; i < held; i++) recs.push(mk(right + bad + i, 'held'));
  recs.forEach(r => { r.artifacts_sha256 = 'a'; });
  const { part: pr, tallies } = truthfulPart(recs, spec, spec ? spec.levels_out_of_fold.cost.threshold : null);   // the view is not registered in a fixture: the part is built directly
  pr.use = 'evaluation';
  return { name, score: { sets: { [view]: { [part]: pr } }, populations: {}, population_support: {} }, sidecar: { [`${view}/${part}`]: truthfulSidecar(recs, tallies) } };
};
const ADDENDUM = { R_vs_B: { lowercase_population_max_confident_mistakes_per_100_increase: 1 }, label_setting_max_drop_points: 2, label_setting_gated_wrong_empty_on_nonempty_max: 0, lowercase_max_drop_points: 2, word_names_interval_requests_min: 40, word_names_interval_groups_min: 10 };
const RULES = { guard: { cost_diff_min: -5, cost_threshold: 10, wrong_extras_per_100_max_increase: 1 }, R_vs_B: { lowercase_other_right_share_min_gain_points: 10, short3_lowercase_right_share_min_gain_points: 20 }, S_vs_R: { t1_clean_cost_min_gain: 5 }, form_bars: { outline_question: .9 }, undo_redo_count_min: .9 };
const fullBundle = (name, o) => {
  const parts = [['fresh2_test', 'test'], ['short3_test', 'test'], ['nl_a_development', 'development']].map(([view, part]) => bundleOf(name, SPEC, null, { ...o, view, part }));
  return { name, score: { sets: Object.assign({}, ...parts.map(p => p.score.sets)), populations: {}, population_support: {} }, sidecar: Object.assign({}, ...parts.map(p => p.sidecar)) };
};
test('Guard G: passes on equal arms, fails on a point loss below -5, on a negative interval upper end, and on more confident mistakes per 100', () => {
  const same = M.guardG(RULES, fullBundle('A', { right: 40, bad: 0 }), fullBundle('B', { right: 40, bad: 0 }));
  assert.equal(same.status, 'pass'); assert.equal(same.rows.length, 3);
  const loss = M.guardG(RULES, fullBundle('A', { right: 30, bad: 0, held: 10 }), fullBundle('B', { right: 40, bad: 0 }));   // -25 points: also a negative upper end? the interval is wide, the point rule decides
  assert.equal(loss.status, 'fail'); assert.ok(loss.checks.some(c => c.name.includes('cost difference') && c.status === 'fail'));
  const worse = M.guardG(RULES, fullBundle('A', { right: 39, bad: 1 }), fullBundle('B', { right: 40, bad: 0 }));           // the same 40 messages: one more confident mistake in 40 (2.5 per 100 > 1)
  assert.ok(worse.checks.some(c => c.name.includes('per 100') && c.status === 'fail')); assert.notEqual(worse.status, 'pass');
  assert.ok(loss.checks.some(c => c.name.includes('interval') && c.status === 'fail' && c.value < 0));                    // the paired interval's upper end is below 0
  assert.ok(same.checks.some(c => c.name.includes('interval') && c.value === 0));                                           // equal arms: [0, 0], upper end 0 >= 0 passes
  const other = M.guardG(RULES, fullBundle('A', { right: 40, bad: 0 }), fullBundle('B', { right: 41, bad: 0 }));           // other messages: no pairing, never a pass
  assert.notEqual(other.status, 'pass'); assert.ok(other.checks.some(c => c.status === 'unavailable'));
});
test('Guard G: a missing interval, a missing view or fewer than ten groups is not a pass', () => {
  const A = fullBundle('A', { right: 40, bad: 0 }), few = fullBundle('B', { right: 5, bad: 0 }), fewA = fullBundle('A', { right: 5, bad: 0 });
  const g = M.guardG(RULES, fewA, few);
  assert.notEqual(g.status, 'pass'); assert.ok(g.checks.some(c => c.name.includes('interval') && c.status === 'unavailable'));   // 5 groups: no interval
  const missing = M.guardG(RULES, { name: 'A', score: { sets: {} }, sidecar: {} }, A);
  assert.notEqual(missing.status, 'pass');
  assert.ok(missing.checks.every(c => c.status !== 'pass'));
  const noRule = M.guardG({ guard: { cost_diff_min: -5, wrong_extras_per_100_max_increase: 1 } }, A, A);
  assert.equal(noRule.status, 'pass');   // the cost-threshold key is informational (the level is the fit's own cost-10), the bars are read from the protocol
  assert.throws(() => M.guardG({}, A, A));   // no guard rule at all is an error, never a default
});
test('verdict rows: a threshold the protocol does not hold is unavailable, a missing arm is pending, and only pass passes', () => {
  const S = { name: 'S', score: { populations: { t1_clean_label_setting: { available: true, ungated: { right_share: .9 } } }, label_errors: { gated_empty_label_on_nonempty_gold: 0 } }, sidecar: {} };
  const R = { name: 'R', score: { populations: { t1_clean_label_setting: { available: true, ungated: { right_share: .95 } } } }, sidecar: {} };
  const c20 = M.criterion20(RULES, S, R);
  assert.equal(c20.status, 'unavailable'); assert.equal(c20.checks[0].status, 'unavailable'); assert.match(c20.checks[0].reason, /not in the protocol/);
  const full = (o = {}) => M.mergeRules({ ...RULES, R_vs_B: { ...RULES.R_vs_B } }, { ...ADDENDUM, ...o, R_vs_B: ADDENDUM.R_vs_B });
  assert.equal(M.criterion20({ ...RULES, label_setting_max_drop_points: 2 }, S, R).status, 'fail');                        // a 5 point fall against 2: fail dominates the missing second threshold
  assert.equal(M.criterion20({ ...RULES, label_setting_max_drop_points: 10 }, S, R).status, 'unavailable');                 // the empty-label limit is not in the protocol either
  assert.equal(M.criterion20(full({ label_setting_max_drop_points: 10 }), S, R).status, 'pass');
  const noCount = { ...S, score: { ...S.score, label_errors: { gated_empty_label_on_nonempty_gold: 1 } } };
  assert.equal(M.criterion20(full({ label_setting_max_drop_points: 10 }), noCount, R).status, 'fail');
  assert.equal(M.criterion20(full({ label_setting_max_drop_points: 10, label_setting_gated_wrong_empty_on_nonempty_max: 1 }), noCount, R).status, 'pass');   // the limit is read from the rules
  const t = M.verdictTable(RULES, {}, {});
  assert.equal(t.all_pass, false); assert.ok(Object.values(t.statuses).every(s => s === 'pending'));
  assert.equal(M.criterion23(RULES, null).status, 'pending');
  const ev23 = (o = {}) => ({ schema: M.EVIDENCE_SCHEMA, results: { 23: evidenceFile('23', o) } });
  assert.equal(M.criterion23(RULES, ev23()).status, 'pass'); assert.equal(M.criterion23(RULES, ev23({ status: 'fail' })).status, 'fail');
  assert.equal(M.criterion23(RULES, { guard_pass: true, t1_clean_cost_ci95: [0.1, 3] }).status, 'unavailable');           // unbound input (the old free-form fields) is no evidence
  assert.equal(M.criterion23(RULES, ev23({ sha256: '0'.repeat(64) })).status, 'fail');
  assert.equal(M.criterion22(RULES, { S0: S }).status, 'pending');
  assert.equal(M.criterion19(RULES, S, null).status, 'unavailable');   // no population: the share is unavailable and the oracle's evidence pending: never a pass
});
const contract = (over = {}) => ({ schema: M.EVIDENCE_SCHEMA, results: Object.fromEntries(['9', '10', '11', '12', '13', '14'].map(i => [i, evidenceFile(i, over[i])])) });
test('criterion 15 needs the output-contract evidence (schema, command, evidence file, sha256): without it pending, with a failing or altered entry never a pass', () => {
  const B = fullBundle('B', { right: 40, bad: 0 }), C = fullBundle('C', { right: 40, bad: 0 });
  assert.equal(M.criterion15(RULES, B, C, null).status, 'pending');
  assert.equal(M.criterion15(RULES, B, C, contract()).status, 'pass');
  assert.equal(M.criterion15(RULES, B, C, contract({ 10: { status: 'fail' } })).status, 'fail');
  const partial = contract(); delete partial.results['12']; assert.equal(M.criterion15(RULES, B, C, partial).status, 'unavailable');
  assert.equal(M.criterion15(RULES, B, C, { results: contract().results }).status, 'unavailable');                        // no schema
  const noCmd = contract({ 9: { command: '' } }); assert.equal(M.criterion15(RULES, B, C, noCmd).status, 'unavailable');
  const bad = contract({ 11: { sha256: '0'.repeat(64) } }); assert.equal(M.criterion15(RULES, B, C, bad).status, 'fail');   // the file differs from the hash named
  const gone = contract({ 13: { evidence: TMP + '/nonexistent' } }); assert.equal(M.criterion15(RULES, B, C, gone).status, 'fail');
  assert.equal(M.criterion15(RULES, fullBundle('B', { right: 30, bad: 0, held: 10 }), C, contract()).status, 'fail');   // Guard G fails: the evidence cannot make it pass
});
test('the decision-rules addendum: its protocol must be the one in use, it adds and never overrides, and every threshold it freezes is read from it', () => {
  const PR = M.loadProtocol(PROTOCOL), file = CACHE + '/next-2026-11-08/frozen-lists/decision-rules-addendum.json';
  const merged = M.withAddendum(PR, file);
  assert.equal(merged.addendum.sha256.slice(0, 8), '304a1be5');
  assert.equal(merged.rules.R_vs_B.lowercase_population_max_confident_mistakes_per_100_increase, 1);
  assert.equal(merged.rules.R_vs_B.lowercase_other_right_share_min_gain_points, 10);                        // the protocol's own keys survive the deep merge
  assert.equal(merged.rules.label_setting_max_drop_points, 2); assert.equal(merged.rules.label_setting_gated_wrong_empty_on_nonempty_max, 0); assert.equal(merged.rules.lowercase_max_drop_points, 2);
  assert.deepEqual([merged.rules.word_names_interval_requests_min, merged.rules.word_names_interval_groups_min], [40, 10]);
  assert.equal(PR.rules.label_setting_max_drop_points, undefined);                                           // the protocol object is not mutated
  assert.throws(() => M.withAddendum(PR, undefined), /--addendum FILE is required/);
  const other = TMP + '/addendum-other.json', A = JSON.parse(readFileSync(file, 'utf8')); A.protocol_sha256 = '0'.repeat(64); writeFileSync(other, JSON.stringify(A));
  assert.throws(() => M.withAddendum(PR, other), /not the protocol in use/);
  const clash = TMP + '/addendum-clash.json', C = JSON.parse(readFileSync(file, 'utf8')); C.decision_rules.guard = { cost_diff_min: -1 }; writeFileSync(clash, JSON.stringify(C));
  assert.throws(() => M.withAddendum(PR, clash), /in the protocol already/);
  const clash2 = TMP + '/addendum-clash2.json', D = JSON.parse(readFileSync(file, 'utf8')); D.decision_rules.R_vs_B.lowercase_other_right_share_min_gain_points = 1; writeFileSync(clash2, JSON.stringify(D));
  assert.throws(() => M.withAddendum(PR, clash2), /R_vs_B.lowercase_other_right_share_min_gain_points/);
});
test('criterion 16 reads the lower-case mistakes limit from the addendum key (not the guard key); criterion 21 and the word-names rule read theirs too', () => {
  const mk = (right, bad) => ({ name: 'x', score: { populations: { lowercase_other_affected: { available: true, requested: 100, ungated: { right_share: right }, gated: { wrong_plus_extras_per_100_requested: bad } }, short3_lowercase: { available: true, requested: 100, ungated: { right_share: right }, gated: { wrong_plus_extras_per_100_requested: bad } } }, sets: {} }, sidecar: {} });
  const R = mk(.9, 5), B = mk(.5, 0), find = (row, text) => row.checks.filter(c => c.name.includes(text));
  const without = M.criterion16(RULES, R, B), withKey = M.criterion16({ ...RULES, R_vs_B: { ...RULES.R_vs_B, lowercase_population_max_confident_mistakes_per_100_increase: 10 } }, R, B), strict = M.criterion16({ ...RULES, R_vs_B: { ...RULES.R_vs_B, lowercase_population_max_confident_mistakes_per_100_increase: 1 } }, R, B);
  assert.ok(find(without, 'adds at most').every(c => c.status === 'unavailable' && /lowercase_population_max_confident_mistakes_per_100_increase/.test(c.reason)));
  assert.ok(find(withKey, 'confident mistake per 100').every(c => c.status === 'pass'));
  assert.ok(find(strict, 'confident mistake per 100').every(c => c.status === 'fail'));                       // +5 per 100 against the limit 1; the guard key (1) is not what decides
  assert.notEqual(without.status, 'pass');
  assert.equal(M.criterion21({ ...RULES }, fullBundle('S', { right: 40, bad: 0 }), fullBundle('R', { right: 40, bad: 0 }), fullBundle('C', { right: 40, bad: 0 })).checks.filter(c => c.name.includes('at most N points')).every(c => c.status === 'unavailable'), true);
  const wn = M.wordNames(RULES, { name: 'A', score: { populations: { data_attested_word_names: { available: true, requested: 100, groups: 50, ungated: { right: 70, right_share: .7 } } } }, sidecar: {} }, { name: 'B', score: { populations: {} }, sidecar: {} });
  assert.match(wn.interval, /not in the protocol/);                                                          // no fallback to a plan number
  const wn2 = M.wordNames({ ...RULES, ...ADDENDUM }, { name: 'A', score: { populations: { data_attested_word_names: { available: true, requested: 30, groups: 50, ungated: { right: 7, right_share: .7 } } } }, sidecar: {} }, { name: 'B', score: { populations: {} }, sidecar: {} });
  assert.match(wn2.interval, /insufficient support/); assert.equal(wn2.diagnostic_only, true);
});
test('seed-averaged interval: deterministic, none below ten groups, averages the seeds inside a resample', () => {
  const units = Array.from({ length: 12 }, (_, i) => [i]), G = Array(12).fill(1), A = { right: Array(12).fill(1), bad: Array(12).fill(0) }, B = { right: Array(12).fill(0), bad: Array(12).fill(0) };
  const ci = M.seedAveragedInterval(units, G, [{ A, B }, { A, B }]);
  assert.deepEqual(ci, [100, 100]); assert.deepEqual(M.seedAveragedInterval(units, G, [{ A, B }, { A, B }]), ci);
  assert.equal(M.seedAveragedInterval(units.slice(0, 9), G.slice(0, 9), [{ A, B }]), null);
  const C = { right: Array(12).fill(0), bad: Array(12).fill(0) };
  const mixed = M.seedAveragedInterval(units, G, [{ A, B }, { A: B, B: A }]);   // +100 and -100 average to 0 in every resample
  assert.deepEqual(mixed, [0, 0]); void C;
});
test('compare_arms constants of the plan: 1,000 resamples, seed 20261105, no interval below ten groups', () => { assert.deepEqual([SEED, RESAMPLES, MIN_UNITS], [20261105, 1000, 10]); });

// ---------------------------------------------------------------- the frozen views
test('the overlay is applied only with its strict preconditions: a changed annotation or a changed span is refused', () => {
  const it = { id: 's', wires: [wire('move it left', 'command', { action: 'move', position: 'left', target: 'Fan3' })] }, key = new Map([['f.jsonl\0s', it]]);
  const line = { source_file: 'f.jsonl', id: 's', wire_index: 0, expected_span: 'move it left', expected_args: { action: 'move', position: 'left', target: 'Fan3' }, replacement_args: { action: 'move', direction: 'left', target: 'Fan3' }, reason: 'r' };
  assert.throws(() => M.applyOverlay([{ ...line, expected_args: { action: 'move', position: 'right', target: 'Fan3' } }], key), /no longer holds/);
  assert.throws(() => M.applyOverlay([{ ...line, expected_span: 'move it right' }], key), /no longer holds/);
  assert.equal(M.applyOverlay([{ ...line, id: 'unknown' }], key).length, 0);                     // a training-only line: skipped
  const applied = M.applyOverlay([line], key); assert.equal(applied.length, 1); assert.equal(it.wires[0].args.direction, 'left'); assert.equal(it.wires[0].args.position, undefined);
  assert.throws(() => M.applyOverlay([line], key), /no longer holds/);                            // never applied twice
});
test('lowercase view: only the aligned annotated existing-name occurrences, labels / verbs / quoted prose / structure kept, every replacement with its offset', () => {
  const ws = [wire('connect Fan1 to Fan2', 'command', { action: 'connect', from: 'Fan1', to: 'Fan2' }), wire('label Fan1 Fan1', 'command', { action: 'label', target: 'Fan1', label: 'Fan1' }), wire('move Fan2 left', 'command', { action: 'move', target: 'Fan2', direction: 'left' })];
  const it = mkItem({ text: 'connect Fan1 to Fan2, then label Fan1 Fan1; move Fan2 left', names: ['Fan1', 'Fan2'], wires: ws });
  const r = M.lowercaseMessage(it);
  assert.ok(r.omitted && /text-valued/.test(r.omitted));                                      // label equal to the name: ambiguous, omitted with its reason
  const ok = M.lowercaseMessage(mkItem({ text: 'connect Fan1 to Fan2 and move Fan2 left', names: ['Fan1', 'Fan2'], wires: [ws[0], ws[2]].map(w => ({ ...w })) , }));
  assert.equal(ok.item.text, 'connect fan1 to fan2 and move fan2 left');
  assert.deepEqual(ok.affected, [0, 1]); assert.equal(ok.item.wires[0].span, 'connect fan1 to fan2'); assert.deepEqual(ok.item.wires[0].args, { action: 'connect', from: 'Fan1', to: 'Fan2' });   // canonical names stay in the gold
  assert.deepEqual(ok.replacements.map(x => [x.wire_index, x.name, x.text_offset, x.span_offset]), [[0, 'Fan1', 8, 8], [0, 'Fan2', 16, 16], [1, 'Fan2', 30, 5]]);
  assert.equal(ok.item.text.length, 'connect Fan1 to Fan2 and move Fan2 left'.length);
  const q = M.lowercaseMessage(mkItem({ text: 'say "Fan1 is on" then delete Fan1', names: ['Fan1'], wires: [wire('delete Fan1', 'command', { action: 'delete', target: 'Fan1' })] }));
  assert.equal(q.item.text, 'say "Fan1 is on" then delete fan1');                              // quoted prose kept
  const verb = M.lowercaseMessage(mkItem({ text: 'Move Move left', names: ['Move'], wires: [wire('Move Move left', 'command', { action: 'move', target: 'Move', direction: 'left' }, 'Move')] }));
  assert.ok(verb.omitted && /action trigger/.test(verb.omitted));                              // a name that is also the verb: ambiguous, omitted
  const bare = M.lowercaseMessage(mkItem({ text: 'Footer: gray', names: ['Footer'], wires: [wire('Footer: gray', 'command', { action: 'set', target: 'Footer', color: 'gray' }, 'Footer')] }));
  assert.equal(bare.item.text, 'footer: gray'); assert.equal(bare.item.wires[0].trigger, 'footer');  // a verbless request whose trigger is the name
  assert.equal(M.lowercaseMessage(mkItem({ text: 'delete the moon', names: ['Moon'], wires: [wire('delete the moon', 'command', { action: 'delete', target: 'Moon' })] })), null);   // already lower case
  assert.equal(M.lowercaseMessage(mkItem({ text: 'delete Sun', names: ['Moon'], wires: [wire('delete Sun', 'command', { action: 'delete', target: 'Sun' })] })), null);       // not an existing name of the message
});

// the real views, built once from the frozen protocol
let VIEWS = null, MANIFEST = null;
const views = () => {
  if (!VIEWS) { VIEWS = TMP + '/views'; MANIFEST = M.buildViews(M.loadProtocol(PROTOCOL), VIEWS); }
  return MANIFEST;
};
test('views: built from protocol-v2 with the overlay applied, every cross-check against the audit passing, and written once', () => {
  const m = views();
  assert.equal(m.failed_checks, 0, JSON.stringify(m.cross_checks.filter(c => !c.ok)));
  assert.deepEqual(m.overlay.applied_to_views.map(x => x.id), ['s3-0409']);
  assert.equal(m.overlay.sha256.slice(0, 8), 'f1a95f7d'); assert.equal(m.overlay.lines, 20);
  assert.throws(() => M.buildViews(M.loadProtocol(PROTOCOL), VIEWS), /exists/);                 // a views folder is written once
  const by = Object.fromEntries(m.populations.map(p => [p.name, p]));
  assert.deepEqual([by.t1_clean.requests, by.t1_clean.groups], [1354, 1285]);
  assert.deepEqual([by.short3_lowercase.requests, by.short3_lowercase.groups, by.short3_lowercase.messages], [134, 105, 109]);
  assert.equal(m.short3_lowercase_list.sha256.slice(0, 8), '6494b07c');
  assert.deepEqual([by.t1_clean_create.requests, by.t1_clean_create.groups], [29, 20]);
  assert.ok(by.lowercase_other_affected.support.supported && by.t1_clean_bare_move.support.supported);
});
test('views: the overlaid gold of short3 test s3-0409 is direction=left, the other short3 messages keep their gold', () => {
  views(); loadViewDir(VIEWS);
  const it = setItems('short3_test').find(i => i.id === 's3-0409');
  assert.equal(it.wires[0].args.direction, 'left'); assert.equal(it.wires[0].args.position, undefined);
});
test('views: calibration is disjoint from every evaluation view, clean means no pool role, t1_clean is the membership, groups are frozen ids', () => {
  views(); loadViewDir(VIEWS);
  const cal = new Set(setItems('calibration').map(i => i.id));
  for (const v of ['fresh2_test', 'short3_test', 'nl_a_development', 't1_all']) assert.equal(setItems(v).filter(i => cal.has(i.id)).length, 0, v);
  assert.equal(setItems('calibration').length, 1144);
  for (const it of setItems('fresh2_test')) { assert.equal(it.clean, !it.roles.some(r => M.POOL_ROLES.includes(r))); assert.equal(it.fold, sha256Mod(it.group_key, 5)); }
  const pops = loadPopulations(VIEWS), t1c = pops.find(p => p.name === 't1_clean');
  assert.equal(t1c.requests.size, 1354);
  assert.ok(setItems('t1_all').filter(i => i.clean).length === 1354);
  assert.ok(setItems('lowercase_other').every(i => i.id.endsWith('#lc') && i.origin_id && i.text !== setItems('fresh2_test').find(o => o.id === i.origin_id).text));
});
test('views: the lower-case view keeps the gold, names and structure of its originals; every replacement is recorded and re-applies to the text', () => {
  const m = views(); loadViewDir(VIEWS);
  const orig = new Map(setItems('fresh2_test').map(i => [i.id, i])), reps = JSON.parse(readFileSync(VIEWS + '/lowercase_other.replacements.json', 'utf8'));
  assert.equal(reps.length, m.lowercase_other.replacements);
  for (const it of setItems('lowercase_other')) {
    const o = orig.get(it.origin_id);
    assert.equal(it.text.length, o.text.length); assert.deepEqual(it.names, o.names);
    assert.deepEqual(it.wires.map(w => w.args), o.wires.map(w => w.args)); assert.deepEqual(it.wires.map(w => w.type), o.wires.map(w => w.type));
    for (const w of it.wires) if (!w.pending) assert.ok(it.text.includes(w.span));
  }
  for (const r of reps.slice(0, 400)) { const it = setItems('lowercase_other').find(i => i.id === r.id); assert.equal(it.text.slice(r.text_offset, r.text_offset + r.old.length), r.new); assert.equal(orig.get(r.origin_id).text.slice(r.text_offset, r.text_offset + r.old.length), r.old); }
  const omitted = JSON.parse(readFileSync(VIEWS + '/lowercase_other.omitted.json', 'utf8'));
  assert.ok(omitted.every(x => x.reason.startsWith('ambiguous') || x.reason.length > 5));
});
test('views: the external VSS-BERT views are reused by hash, never copied, and a changed file refuses', () => {
  const m = views(), ext = m.views.filter(v => v.kind === 'external');
  assert.deepEqual(ext.map(v => v.name), ['t1s', 't1raw', 't1bs', 'short3s']);
  for (const v of ext) { assert.ok(v.external.files.length >= 1 && v.external.files.every(f => /^[0-9a-f]{64}$/.test(f.sha256))); assert.equal(readdirSync(VIEWS).filter(f => f.startsWith(v.name + '.')).join(), v.name + '.index.jsonl'); }
  const copy = TMP + '/views-bad'; cpSync(VIEWS, copy, { recursive: true });
  const mf = JSON.parse(readFileSync(copy + '/manifest.json', 'utf8')); mf.views.find(v => v.name === 't1raw').external.files[0].sha256 = '0'.repeat(64);
  writeFileSync(copy + '/manifest.json', JSON.stringify(mf));
  assert.throws(() => loadViewDir(copy), /differs from the hash|already|registered/);
});

// ---------------------------------------------------------------- collection and resume
test('collect_set on a view: Rules collection, identical resume accepts the records, a changed view manifest refuses', () => {
  views();
  const out = TMP + '/rules_t1raw.jsonl', env = { ...process.env, READER: 'rules' }, data = CACHE + '/arms/data/C100';
  const run = (views, o) => spawnSync('node', [HERE + 'collect_set.mjs', '--train-data', data, '--allow-text-overlap', `--views=${views}`, o, 't1raw'], { env, encoding: 'utf8' });
  const a = run(VIEWS, out); assert.equal(a.status, 0, a.stderr);
  assert.equal(readFileSync(out, 'utf8').split('\n').filter(Boolean).length, 70);
  const first = readFileSync(out, 'utf8'), b = run(VIEWS, out);
  assert.equal(b.status, 0, b.stderr); assert.equal(readFileSync(out, 'utf8'), first);           // identical resume: the completed records are kept
  const copy = TMP + '/views-changed'; cpSync(VIEWS, copy, { recursive: true });
  const mf = JSON.parse(readFileSync(copy + '/manifest.json', 'utf8')); mf.notes.push('changed'); writeFileSync(copy + '/manifest.json', JSON.stringify(mf, null, 1) + '\n');
  const c = run(copy, out); assert.notEqual(c.status, 0); assert.match(c.stderr, /changed since this file was started/);
  assert.equal(readFileSync(out, 'utf8'), first);                                                // and the records are untouched
  // the Rules records of the view score under truthful_v1, with no unavailable measure (the records hold raw arguments)
  const { records } = loadRecords([out]);
  const { out: sc } = scoreArmTruthful(null, records, { populations: [] });
  assert.equal(sc.sets.t1raw.all.available, true); assert.equal(sc.sets.t1raw.all.requested, 70); assert.equal(sc.sets.t1raw.all.ungated.right, 70);
});
test('output folders: a folder that exists is refused, an identical identity resumes, a changed identity refuses', () => {
  const dir = TMP + '/claim', id = { tool: 't', arm: 'B', seed: 0, code: { a: '1' } };
  assert.equal(M.claimOut(dir, id).resumed, false);
  assert.equal(M.claimOut(dir, JSON.parse(JSON.stringify(id))).resumed, true);
  assert.throws(() => M.claimOut(dir, { ...id, seed: 1 }), /identity changed.*seed/);
  assert.throws(() => M.claimOut(dir, { ...id, code: { a: '2' } }), /identity changed.*code/);
  mkdirSync(TMP + '/foreign'); writeFileSync(TMP + '/foreign/x', '1');
  assert.throws(() => M.claimOut(TMP + '/foreign', id), /not an output of this tool/);
  const rep = TMP + '/repro-exists'; mkdirSync(rep);
  assert.throws(() => M.reproduce(M.loadProtocol(PROTOCOL), rep), /exists/);
});
test('protocol: a changed SHA256SUMS entry is refused', () => {
  const dir = TMP + '/proto'; cpSync(CACHE + '/next-2026-11-08/protocol-v2', dir, { recursive: true }); for (const f of ['protocol.json']) chmodSync(dir + '/' + f, 0o644);
  assert.ok(M.loadProtocol(dir + '/protocol.json').rules.guard);
  const p = JSON.parse(readFileSync(dir + '/protocol.json', 'utf8')); p.decision_rules = 1; writeFileSync(dir + '/protocol.json', JSON.stringify(p));
  assert.throws(() => M.loadProtocol(dir + '/protocol.json'), /differs from SHA256SUMS/);
});
test('the projection of legacy records: the rebuild equals the copy, an overlaid gold pairs again, other model artifacts refuse', () => {
  const g = gold('delete Moon', { action: 'delete', target: 'Moon' }), item = mkItem({ id: 'p1', set: 'viewp', text: 'delete Moon', wires: [g], group_key: 'Gp1' });
  const legacyRec = { ...rec({ ...item, set: 'fresh2', part: 'test' }, [del('n1', [0, 11], 'Moon', fHi())]), artifacts_sha256: 'A', _file: 'x' };
  delete legacyRec.group_key; delete legacyRec.fold; delete legacyRec.roles; delete legacyRec.meta; delete legacyRec.origin_id;
  const legacy = new Map([['p1', legacyRec]]);
  const p = M.projectView([item], legacy, { seen: () => true, artifacts: 'A' });
  assert.equal(p.projected, 1); assert.equal(p.reconstruction_mismatches, 0); assert.equal(p.records[0].set, 'viewp'); assert.equal(p.records[0].group_key, 'Gp1');
  const changed = { ...item, wires: [gold('delete Moon', { action: 'delete', target: 'Sun' })] };
  const q = M.projectView([changed], legacy, { seen: () => true, artifacts: 'A' });
  assert.equal(q.rebuilt, 1); assert.equal(q.records[0].produced[0].o, 'wrong');                // the overlaid gold changes the outcome
  assert.throws(() => M.projectView([item], legacy, { seen: () => true, artifacts: 'B' }), /other model artifacts/);
  assert.deepEqual(M.projectView([{ ...item, id: 'nope' }], legacy, { seen: () => true, artifacts: 'A' }).missing, ['nope']);
});

// ---------------------------------------------------------------- review fixes F1, F2 and the cheap ones, through real records
test('F1: a produced empty label against a nonempty gold label is counted by labelErrors from the raw arguments (the pairing calls it wrong with no reason) and C20 fails', () => {
  const g = gold('label Moon Foo', { action: 'label', target: 'Moon', label: 'Foo' });
  const empty = one('label Moon Foo', g, [main(node('n1', 'command', { action: 'label', target: 'Moon', label: '' }), [0, 14], fHi())]);
  assert.equal(empty.produced[0].o, 'wrong'); assert.deepEqual(truthfulOutcomes(empty)[0].reasons, []);    // the pairing's wrong carries no reason: the old counter saw nothing
  const le = M.labelErrors([empty], SPEC);
  assert.equal(le.gated_empty_label_on_nonempty_gold, 1); assert.equal(le.ungated_empty_label_on_nonempty_gold, 1);
  assert.deepEqual(le.gated_by_reason, { 'text:label value': 1 }); assert.deepEqual(le.ungated_by_reason, { 'text:label value': 1 });
  const rules = { ...RULES, ...ADDENDUM };
  const bundle = (le2, share) => ({ name: 'S', score: { populations: { t1_clean_label_setting: { available: true, ungated: { right_share: share } } }, label_errors: le2 }, sidecar: {} });
  const R = { name: 'R', score: { populations: { t1_clean_label_setting: { available: true, ungated: { right_share: 1 } } } }, sidecar: {} };
  const row = M.criterion20(rules, bundle(le, 1), R);
  assert.equal(row.status, 'fail'); assert.equal(row.checks.find(c => c.name.includes('empty-label')).value, 1);
  // controls: the right label, a missing label, an unwanted label, a held request (not executed) and an extra
  const right = one('label Moon Foo', g, [main(node('n1', 'command', { action: 'label', target: 'Moon', label: 'Foo' }), [0, 14], fHi())]);
  assert.equal(M.labelErrors([right], SPEC).gated_empty_label_on_nonempty_gold, 0); assert.deepEqual(M.labelErrors([right], SPEC).gated_by_reason, {});
  const missing = one('label Moon Foo', g, [main(node('n1', 'command', { action: 'label', target: 'Moon' }), [0, 14], fHi())]);
  assert.deepEqual(M.labelErrors([missing], SPEC).gated_by_reason, { 'text:label missing': 1 }); assert.equal(M.labelErrors([missing], SPEC).gated_empty_label_on_nonempty_gold, 0);
  const held = one('label Moon Foo', g, [main(node('n1', 'command', { action: 'label', target: 'Moon', label: '' }), [0, 14], fLo())]);
  const lh = M.labelErrors([held], SPEC); assert.equal(lh.gated_empty_label_on_nonempty_gold, 0); assert.equal(lh.ungated_empty_label_on_nonempty_gold, 1);   // held at the threshold, executed ungated
  const unwanted = one('delete Moon', gold('delete Moon', { action: 'delete', target: 'Moon' }), [main(node('n1', 'command', { action: 'delete', target: 'Moon', label: 'x' }), [0, 11], fHi())]);
  assert.deepEqual(M.labelErrors([unwanted], SPEC).gated_by_reason, { 'text:label unwanted': 1 });
  assert.equal(M.criterion20(rules, bundle(M.labelErrors([right], SPEC), 1), R).status, 'pass');
  const calOnly = JSON.parse(JSON.stringify(empty)); calOnly.part = 'calibration';
  assert.equal(M.labelErrors([calOnly], SPEC).gated_empty_label_on_nonempty_gold, 0);                      // calibration records are not an evaluation
});
const wholeMessageFixture = (extraAt) => {
  const recs = [];
  for (let i = 0; i < 12; i++) {
    const text = `delete T${i} and also if you can`, w = gold(`delete T${i}`, { action: 'delete', target: 'T' + i }), len = w.span.length;
    const mains = [del('n' + i, [0, len], 'T' + i, fHi())];
    if (i === extraAt) mains.push(main(node('x' + i, 'command', { action: 'move', target: 'T' + i }), [20, 30], fHi()));
    recs.push(rec(mkItem({ id: 'w' + i, set: 'viewx', part: 'test', text, names: ['T' + i], wires: [w] }), mains));
  }
  recs.forEach(r => { r.artifacts_sha256 = 'a'; });
  return recs;
};
const popBundle = (name, recs, popName = 'whole') => {
  const pop = { name: popName, view: 'viewx', part: 'test', requests: new Map(recs.map(r => [r.id, new Set(r.goldSpans.map((_, i) => i))])) };
  const { tallies, ...stats } = truthfulPopulation(recs, SPEC, THR, pop);
  return { name, stats, score: { populations: { [popName]: stats }, population_support: {}, sets: {} }, sidecar: { [`viewx/test#${popName}`]: truthfulSidecar(recs, tallies) } };
};
test('F2: an extra that overlaps no gold request belongs to a whole-message population: it is charged in the cost, the risk, the tallies and the paired comparison', () => {
  const clean = wholeMessageFixture(-1), withExtra = wholeMessageFixture(3);
  assert.equal(withExtra[3].produced[1].o, 'extra'); assert.equal(withExtra[3].produced[1].span[0] >= withExtra[3].goldSpans[0].e, true);   // no overlap with the gold span
  const A = popBundle('A', clean), B = popBundle('B', withExtra);
  assert.equal(A.stats.gated.cost_score, 100); assert.equal(B.stats.gated.extras, 1); assert.equal(B.stats.gated.right, 12);
  assert.equal(B.stats.gated.cost_score, r4(100 * (12 - 10) / 12)); assert.equal(B.stats.gated.risk, r4(1 / 13)); assert.equal(B.stats.extras_unattributed, 0);
  assert.deepEqual(B.sidecar['viewx/test#whole'].tallies['gold.truthful_v1.gate'].bad.slice(0, 5), [0, 0, 0, 1, 0]);   // the sidecar the paired comparison reads
  const cmp = M.pairwise(A, B, 'viewx/test#whole');
  assert.equal(cmp.difference, Math.round((100 - 100 * 2 / 12) * 1e4) / 1e4); assert.ok(cmp.difference > 80);                  // 83.3: under the old attribution this was 0
  // a request population of a message with some of its requests only attributes by overlap, as before
  const multi = rec(mkItem({ id: 'mm', text: 'delete A1. delete B1. and also if you can', names: ['A1', 'B1'], wires: [gold('delete A1', { action: 'delete', target: 'A1' }), gold('delete B1', { action: 'delete', target: 'B1' })] }),
    [del('a', [0, 9], 'A1', fHi()), del('b', [11, 20], 'B1', fHi()), main(node('x', 'command', { action: 'move', target: 'A1' }), [22, 40], fHi())]);
  const part1 = truthfulPopulation([multi], SPEC, THR, { name: 'p', view: 'viewx', part: null, requests: new Map([['mm', new Set([0])]]) });
  assert.equal(part1.gated.extras, 0); assert.equal(part1.extras_unattributed, 1);
  const whole = truthfulPopulation([multi], SPEC, THR, { name: 'p', view: 'viewx', part: null, requests: new Map([['mm', new Set([0, 1])]]) });
  assert.equal(whole.gated.extras, 1); assert.equal(whole.extras_unattributed, 0);
});
test('C17 reads the paired comparison only when both arms have the population with an available measure; unsupported populations cannot decide (C16, C17, C21)', () => {
  const A = popBundle('A', wholeMessageFixture(-1), 't1_clean'), B = popBundle('B', wholeMessageFixture(3), 't1_clean');
  const rules = { ...RULES, ...ADDENDUM, S_vs_R: { t1_clean_cost_min_gain: 5 } };
  const key = 'viewx/test#t1_clean';
  const sc = (b, extra = {}) => ({ ...b, score: { ...b.score, ...extra }, sidecar: { 't1_all/all#t1_clean': b.sidecar[key], 't1_all/all#t1_clean_create': b.sidecar[key] } });
  const ok = M.criterion17(rules, sc(A), sc(B));
  assert.ok(ok.checks.find(c => c.name.includes('interval lower end')).value != null);
  const unavail = (b) => ({ ...sc(b), score: { ...b.score, populations: { t1_clean: { ...b.stats, available: false } } } });
  const r1 = M.criterion17(rules, unavail(A), sc(B)), r2 = M.criterion17(rules, sc(A), unavail(B));
  for (const r of [r1, r2]) { assert.notEqual(r.status, 'pass'); assert.ok(r.checks.filter(c => c.name.includes('t1_clean')).some(c => c.status === 'unavailable')); assert.equal(r.checks.find(c => c.name.includes('t1_clean paired interval')).value, null); }
  // the support flag of a population with a rule
  const unsup = (b) => ({ ...sc(b), score: { ...b.score, population_support: { t1_clean: { supported: false }, t1_clean_create: { supported: true } } } });
  const r3 = M.criterion17(rules, unsup(A), sc(B));
  assert.equal(r3.checks.find(c => c.name.includes('t1_clean is a supported population')).status, 'fail'); assert.notEqual(r3.status, 'pass');
  const lc = (sup) => ({ name: 'x', score: { populations: { lowercase_other_affected: { available: true, requested: 100, ungated: { right_share: .9 }, gated: { wrong_plus_extras_per_100_requested: 0 } }, short3_lowercase: { available: true, requested: 100, ungated: { right_share: .9 }, gated: { wrong_plus_extras_per_100_requested: 0 } } }, population_support: sup, sets: {} }, sidecar: {} });
  const c16 = M.criterion16(rules, lc({ lowercase_other_affected: { supported: false } }), lc({ lowercase_other_affected: { supported: true } }));
  assert.equal(c16.checks.find(c => c.name.includes('supported population (x)')).status, 'fail');
  const c21 = M.criterion21(rules, lc({ lowercase_other_affected: { supported: null } }), lc({}), lc({}));
  assert.equal(c21.checks.find(c => c.name.includes('supported population')).status, 'unavailable'); assert.notEqual(c21.status, 'pass');
  assert.equal(M.criterion16(rules, lc({}), lc({})).checks.filter(c => c.name.includes('supported population')).length, 0);   // no rule for the population: no check
});
test('verdict and compare refuse bundles of another protocol, another addendum or another views manifest (and bundles with no identity)', () => {
  const PR = { sha256: 'P'.repeat(64), addendum: { sha256: 'A'.repeat(64) } };
  const b = (name, id) => ({ name, identity: id === null ? null : { protocol_sha256: 'P'.repeat(64), addendum_sha256: 'A'.repeat(64), views_manifest_sha256: 'V'.repeat(64), ...id } });
  assert.equal(M.assertSameBasis(PR, [b('a', {}), b('b', {})]), true);
  assert.throws(() => M.assertSameBasis(PR, [b('a', {}), b('b', { protocol_sha256: 'Q'.repeat(64) })]), /under protocol/);
  assert.throws(() => M.assertSameBasis(PR, [b('a', {}), b('b', { addendum_sha256: undefined })]), /under addendum/);
  assert.throws(() => M.assertSameBasis(PR, [b('a', {}), b('b', { views_manifest_sha256: 'W'.repeat(64) })]), /different views manifests/);
  assert.throws(() => M.assertSameBasis(PR, [b('a', {}), b('b', null)]), /no identity/);
  assert.throws(() => M.assertSameBasis({ sha256: 'P'.repeat(64) }, [b('a', {})]), /under addendum/);
  // loadBundle reads identity.json from a real folder
  const dir = TMP + '/bundle'; mkdirSync(dir);
  const side = JSON.stringify({}); writeFileSync(dir + '/score.truthful.per_message.json', side);
  writeFileSync(dir + '/score.truthful.json', JSON.stringify({ per_message: { file: dir + '/score.truthful.per_message.json', sha256: sha256Of(Buffer.from(side)) }, sets: {} }));
  assert.equal(M.loadBundle('x', dir).identity, null);
  writeFileSync(dir + '/identity.json', JSON.stringify({ protocol_sha256: 'P'.repeat(64) }));
  assert.equal(M.loadBundle('x', dir).identity.protocol_sha256, 'P'.repeat(64));
});

// ---------------------------------------------------------------- root causes under truthful_v1
const mixed = () => {
  // five requests: right and confident; wrong scale (confident); omitted empty label (confident); right but held by confidence; blocked
  const ws = [gold('delete A1', { action: 'delete', target: 'A1' }), gold('shrink B1', { action: 'resize', target: 'B1', scale: '0.5' }), gold('remove the label of C1', { action: 'label', target: 'C1', label: '' }),
    gold('delete D1', { action: 'delete', target: 'D1' }), gold('delete E1', { action: 'delete', target: 'E1' })];
  const text = ws.map(w => w.span).join('. '), spans = []; let at = 0;
  for (const w of ws) { const k = text.indexOf(w.span, at); spans.push([k, k + w.span.length]); at = k + w.span.length; }
  const item = mkItem({ text, names: ['A1', 'B1', 'C1', 'D1', 'E1'], wires: ws });
  return rec(item, [del('a', spans[0], 'A1', fHi()), main(node('b', 'command', { action: 'resize', target: 'B1', scale: '0.8' }), spans[1], fHi()), main(node('c', 'command', { action: 'label', target: 'C1' }), spans[2], fHi()),
    del('d', spans[3], 'D1', fLo()), del('e', spans[4], 'E1', fHi(), { blocked: true, block_reasons: [{ kind: 'text-state', key: 'label', source_span: 'delete E1' }] })]);
};
test('root causes (truthful_v1): the totals equal the scorer\'s: every request executed, the threshold, structural holds, confidence holds, unread', () => {
  const r = mixed(), expect = truthfulPopulation([r], SPEC, THR, null);
  assert.deepEqual([expect.ungated.right, expect.ungated.wrong, expect.ungated.structural_holds.total], [2, 2, 1]);   // today would have called the scale right and the empty label ... : the scale is wrong here
  const res = analyzePartTruthful([r], { layout: DEFAULT_LAYOUT, oracle: null, spec: SPEC, threshold: THR, expect, seenCheck: null });
  assert.ok(res.reconciliation.length >= 12 && res.reconciliation.every(x => x.ok));
  assert.equal(res.all.right, 3); assert.equal(res.all.wrong, 2);                      // every request executed: the blocked one would have been right
  assert.equal(res.gate_rows.executed_wrong, 2); assert.equal(res.gate_rows.structural_holds, 1); assert.equal(res.gate_rows.held_right_by_confidence, 1);
  assert.equal(res.categories.calibration, 3);                                          // the threshold's own category: 2 executed wrong + 1 right held
  assert.equal(res.categories.labels, null);                                            // not measured, never 0
  assert.deepEqual(Object.keys(res.categories), PLAN_CATEGORIES);
  const wrongs = res.groups.seen.keys; const keyNames = Object.keys(wrongs).join();
  assert.match(keyNames, /scale/); assert.match(keyNames, /label/);
  const tampered = JSON.parse(JSON.stringify(expect)); tampered.gated.wrong += 1;
  assert.throws(() => analyzePartTruthful([r], { layout: DEFAULT_LAYOUT, oracle: null, spec: SPEC, threshold: THR, expect: tampered, seenCheck: null }), /the analysis counts/);
  const tampered2 = JSON.parse(JSON.stringify(expect)); tampered2.ungated.structural_holds.total = 0;
  assert.throws(() => analyzePartTruthful([r], { layout: DEFAULT_LAYOUT, oracle: null, spec: SPEC, threshold: THR, expect: tampered2, seenCheck: null }), /structural holds/);
});
test('root causes: a written description value is not an unwritten reference (a size synonym is a value error), a name the request does not write still is', () => {
  const span = 'make the very big one red', text = span;
  // the description's value (size=huge) is a paraphrase of what is written, and the reader itself read a description
  assert.deepEqual(needsKeys({ action: 'set', target: 'mention(size=huge)', color: 'red' }, text, span).span, ['target']);                   // the old rule: an unwritten reference
  assert.deepEqual(needsKeysV1({ action: 'set', target: 'mention(size=huge)', color: 'red' }, text, span, { target: 'mention(size=small)' }).span, []);   // the reader read a description: a value error
  assert.deepEqual(needsKeysV1({ action: 'set', target: 'mention(color=red,shape=square)' }, 'make the red one blue', 'make the red one blue', {}).span, []);   // a written value: written
  assert.deepEqual(needsKeysV1({ action: 'set', target: 'mention(shape=square)' }, 'make it blue', 'make it blue', { target: 'Moon' }).span, ['target']);   // nothing of it written, no description read
  assert.deepEqual(needsKeysV1({ action: 'set', target: 'mention(label=Hello,color=red)' }, 'make the red one blue', 'make the red one blue', { target: 'mention(color=red)' }).span, ['target']);   // a free-text label that is not written
  assert.deepEqual(needsKeysV1({ action: 'delete', target: 'Moon' }, 'delete it', 'delete it', {}).span, ['target']);                           // a name not written
  // through the classifier: a size synonym read as another size is class, not "a reference the request does not write"
  const g = gold(span, { action: 'set', target: 'mention(size=huge)', color: 'red' }), r = one(text, g, [main(node('n', 'command', { action: 'set', target: { ref: 'm' }, color: 'blue' }), [0, span.length], fHi())]);
  const ctx = { scoring: TRUTHFUL_V1, layout: DEFAULT_LAYOUT, oracle: null }, c = classifyRecord(r, ctx);
  assert.equal(c.golds[0].status, 'wrong'); assert.notEqual(c.golds[0].cause, undefined);
});
import { TRUTHFUL_V1 } from './arm_lib.mjs';

// ---------------------------------------------------------------- a real v2 decoder through collect_set's record path
// A scripted v2 reader (the pattern of test_output_contract.mjs: perfect head logits through the REAL docs/js/neural.js formalize) is read exactly as collect_set.mjs reads
// a model's output: runOfNeural (signals, blockOf, dependencies) -> buildRecord -> the truthful_v1 scorer. The hold that neural.js sets on the analysis (`a.blocked`,
// `a.block_reasons` = [{kind, key, source_span}], formalizeJoint) must reach the record, and the request that depends on it must be a structural hold.
const require2 = createRequire(import.meta.url), K2 = require2('../../../docs/js/logic.js');
globalThis.SOPKit = K2;
const N2 = require2('../../../docs/js/neural.js');
const FILL = ['none', 'written', 'context', 'description'], FILL_V2 = FILL.concat(['unresolved']), STATES = ['absent', 'empty', 'written'], SPAN = ['anchor', 'count', 'distance', 'from', 'label', 'target', 'to'];
const readerOf2 = (v2 = true) => {
  const R = { acts: ['create', 'delete', 'move', 'set', 'label', 'undo', 'redo', 'connect', 'property'], tags: ['O', ...SPAN.flatMap(k => ['B-' + k, 'I-' + k])], span_keys: SPAN, ref_keys: ['anchor', 'from', 'target', 'to'],
    desc_keys: ['color', 'quantifier', 'shape', 'size'], desc2_keys: [],
    classes: [['color', ['none', 'red', 'blue', 'gold']], ['direction', ['none', 'left']], ['outline', ['none', 'cyan', 'gold']], ['position', ['none', 'left', 'leftOf', 'below']], ['property', ['none', 'color', 'outline']], ['shape', ['none', 'circle', 'square']],
      ...['anchor', 'from', 'target', 'to'].map(k => ['fill:' + k, v2 ? FILL_V2 : FILL]), ['desc:color', ['none', 'red']], ['desc:quantifier', ['none', 'all']], ['desc:shape', ['none', 'circle', 'square', 'triangle']], ['desc:size', ['none', 'huge']], ...(v2 ? [['text:label', STATES]] : [])],
    act_keys: { create: ['color', 'label', 'shape'], delete: ['target'], move: ['anchor', 'direction', 'distance', 'position', 'target'], set: ['color', 'outline', 'target'], label: ['from', 'label', 'target', 'to'], undo: ['count'], redo: ['count'], connect: ['from', 'to'], property: ['property', 'target'] },
    number_words: { twice: '2' }, number_words_from: 'table' };
  if (v2) Object.assign(R, { output_contract: 'diagram-reader-v2', text_state_keys: ['label'] });
  return R;
};
function readOf2(R, text, act, cls = {}, tagged = []) {
  const ws = N2.wordsOf(text), nA = R.acts.length, seq = new Array(nA + R.classes.reduce((a, [, v]) => a + v.length, 0)).fill(0);
  seq[R.acts.indexOf(act)] = 9;
  let o = nA; const classes = {};
  for (const [k, vals] of R.classes) { const v = cls[k] ?? null, i = v == null ? 0 : vals.indexOf(v); seq[o + i] = 9; classes[k] = { value: i ? vals[i] : null, score: 0.99 }; o += vals.length; }
  const tg = ws.map(() => 'O');
  for (const [sub, key] of tagged) { const c0 = text.indexOf(sub); ws.forEach((w, i) => { if (w.start >= c0 && w.end <= c0 + sub.length) tg[i] = (w.start === c0 ? 'B-' : 'I-') + key; }); }
  const tok = tg.map(t => { const l = new Array(R.tags.length).fill(0); l[R.tags.indexOf(t)] = 9; return l; });
  const spans = {}; let cur = null;
  tg.forEach((t, i) => { if (t === 'O') { cur = null; return; } const k = t.slice(2), L = spans[k] || (spans[k] = []); if (t[0] === 'I' && cur === k) L[L.length - 1].j = i + 1; else { L.push({ i, j: i + 1 }); cur = k; } });
  for (const k of Object.keys(spans)) spans[k] = spans[k].map(x => ({ text: text.slice(ws[x.i].start, ws[x.j - 1].end), start: ws[x.i].start, end: ws[x.j - 1].end, score: 0.99 }));
  const res = { words: ws.map(w => w.w), acts: R.acts.map(label => ({ label, score: label === act ? 0.99 : 0.01 / (nA - 1) })).sort((a, b) => b.score - a.score), classes, tags: tg, spans };
  Object.defineProperty(res, 'logits', { value: { seq, tok, pieces: ws.map((w, i) => [100 + i]) }, enumerable: false });
  return res;
}
/** what collect_set.mjs does with one message: formalize with signals (as it does), runOfNeural, buildRecord */
async function recordOfScripted(R, units, wires, { names = ['Box', 'Ball', 'Goal', 'Other'] } = {}) {
  let text = '', offs = [];
  for (const u of units) { if (text) text += '. '; offs.push({ c0: text.length, c1: text.length + u.src.length }); text += u.src; }
  const reads = units.map(u => readOf2(R, u.src, u.act, u.cls, u.tags));
  const cutP = N2.wordsOf(text).map(w => { const st = offs.some(o => o.c0 === w.start), inside = offs.some(o => w.start >= o.c0 && w.end <= o.c1); return { start: w.start, end: w.end, pO: inside ? 0 : 1, pB: st ? 1 : 0, pI: inside && !st ? 1 : 0 }; });
  const neural = N2.create(K2.createSystem().engine, () => { throw new Error('the Rules were called'); }, { activateCut: false, requireJoint: true });
  neural.setModels({ reader: R, unk: 0, read: async () => reads[0], readMany: async ts => ts.map((t, i) => reads[i]), cut: async () => null, cutProbs: () => cutP });
  neural.setStrategy('finetuned');
  const result = await neural.formalize(text, { names, last: [] }, { units: offs, update: nextContext, signals: true });
  const run = { reader: 'modernbert', cut: 'own', ...runOfNeural(result, { cutInfo: () => null }, text) };
  const item = mkItem({ text, names, wires: wires.map((w, i) => ({ ...w, span: units[i].src })) });
  return { result, run, rec: buildRecord(item, run, { seen: () => true, artifactsKey: 'a' }) };
}
const v2units = [{ src: 'delete the red square and Box', act: 'delete', cls: { 'fill:target': 'unresolved' } }, { src: 'make it red', act: 'set', cls: { 'fill:target': 'context', color: 'red' } },
  { src: 'make Ball gold', act: 'set', cls: { 'fill:target': 'written', color: 'gold' }, tags: [['Ball', 'target']] }];
const v2wires = [gold('x', { action: 'delete', target: 'Box' }), gold('x', { action: 'set', target: 'Box', color: 'red' }), gold('x', { action: 'set', target: 'Ball', color: 'gold' })];
await (async () => {
  const name = 'a scripted v2 reader through collect_set\'s record path: blocked / block_reasons reach the record, the dependent of a blocked request is a structural hold, an independent request is not, a legacy reader writes no field';
  try {
    const { result, rec: r } = await recordOfScripted(readerOf2(true), v2units, v2wires);
    // the decoder's own words: the analysis holds the hold (formalizeJoint), and blockOf reads it from where neural.js put it
    assert.equal(result.analyses[0].blocked, true); assert.equal(result.analyses[0].block_reasons[0].kind, 'unresolved-reference');
    const main0 = result.nodes.find(x => x.type !== 'mention' && x.unit === result.analyses[0]);
    assert.deepEqual(blockOf(result, main0, 0), { blocked: true, block_reasons: result.analyses[0].block_reasons });
    assert.equal(blockOf(result, result.nodes.find(x => x.type !== 'mention' && x.unit === result.analyses[2]), 2), null);   // a request that was not held carries no field
    // the record
    assert.equal(r.produced.length, 3);
    assert.equal(r.produced[0].blocked, true);
    assert.deepEqual(r.produced[0].block_reasons.map(b => [b.kind, b.key, b.source_span]), [['unresolved-reference', 'target', 'delete the red square and Box']]);
    assert.ok(!('blocked' in r.produced[1]) && !('blocked' in r.produced[2]));
    assert.ok(r.produced[1].dependencies.includes(r.produced[0].wireId), 'the contextual "make it red" depends on the held request');
    assert.deepEqual(r.produced[2].dependencies, []);
    // scored as structural holds, at every level; the explicit independent request executes
    const items = truthfulItemsOf([r]).items.map(x => ({ ...x, c: .99 }));
    for (const thr of [null, 0, 0.5]) { const d = decideTruthful(items, thr); assert.deepEqual(d.map(x => x.execute), [false, false, true], 'threshold ' + thr); assert.deepEqual(d.map(x => x.structural), ['blocked', 'dependency', null]); }
    const p = truthfulPopulation([r], { ...SPEC, levels_out_of_fold: { cost: { threshold: 0 } } }, 0, null);
    assert.equal(p.ungated.structural_holds.total, 2); assert.deepEqual(p.ungated.structural_holds.by_kind, { blocked: 1, dependency: 1 }); assert.equal(p.ungated.requested, 3);
    assert.ok(p.ungated.right <= 1);
    // a legacy reader: the same request reads as a legacy output; no field anywhere
    const leg = await recordOfScripted(readerOf2(false), [v2units[1]], [v2wires[1]]);
    assert.ok(leg.rec.produced.every(x => !('blocked' in x) && !('block_reasons' in x)));
    assert.equal(leg.result.analyses[0].blocked, undefined);
    n++; console.log('ok   ' + name);
  } catch (e) { console.log('FAIL ' + name + '\n' + (e.stack || e)); process.exitCode = 1; }
})();
test('flip risk: the requests within a window of the threshold are counted per view, structural holds and missing confidences are not', () => {
  const mkr = (id, actp, extra = {}) => rec(mkItem({ id, set: 'fv', text: 'delete Moon', wires: [gold('delete Moon', { action: 'delete', target: 'Moon' })] }), [del('n', [0, 11], 'Moon', { ...F(.9), act_p: actp }, extra)]);
  // a request exactly at the threshold, one just inside 1e-5, one far, one blocked at the threshold
  const specAt = { ...SPEC, levels_out_of_fold: { cost: { threshold: 0.9890130573694068 } } };     // = confidence(act_p 0.9) of SPEC
  const records = [mkr('a', 0.9), mkr('b', 0.05), mkr('c', 0.9, { blocked: true, block_reasons: [] })];
  records.forEach(r => { r.artifacts_sha256 = 'a'; });
  const fr = M.flipRisk(records, specAt, { fv: 'collected here, THREADS=2' });
  assert.equal(fr.by_view.fv.requests_with_confidence, 2); assert.equal(fr.by_view.fv['within_0.00001'], 1); assert.equal(fr.by_view.fv['above_threshold_within_0.00001'], 1);
  assert.equal(fr.by_view.fv.source, 'collected here, THREADS=2'); assert.equal(fr.total['within_0.0001'], 1);
  assert.equal(M.flipRisk(records, { ...SPEC, levels_out_of_fold: { cost: { threshold: 1.0000001 } } }, {}).total['within_0.00001'], 0);
  assert.equal(M.flipRisk(records, { ...SPEC, levels_out_of_fold: {} }, {}).threshold, null);
});
await (async () => {
  const name = 'evaluate refuses a THREADS other than 2 and a missing or foreign addendum before it reads anything';
  try {
    const base = { protocol: PROTOCOL, model: TMP, out: TMP + '/never', views: TMP, arm: 'B', seed: 0, trainData: TMP };
    await assert.rejects(() => M.evaluateArm({ ...base, addendum: CACHE + '/next-2026-11-08/frozen-lists/decision-rules-addendum.json', threads: 5 }), /THREADS=2/);
    await assert.rejects(() => M.evaluateArm({ ...base, addendum: undefined }), /--addendum FILE is required/);
    assert.ok(!existsSync(TMP + '/never'));
    n++; console.log('ok   ' + name);
  } catch (e) { console.log('FAIL ' + name + '\n' + (e.stack || e)); process.exitCode = 1; }
})();

console.log(`${n} checks passed`);
