// test_score_tools.mjs: the checks of the measuring tools (sets.mjs, collect_set.mjs, calibrate_arm.mjs, score_arm.mjs, compare_arms.mjs).
//   node training/neural/parity/test_score_tools.mjs
// 1. The reproduction, the main guard against a false pass: calibrate_arm and score_arm on the first run's records
//    (~/.cache/diagram-vss-modernbert/weight-only-records-baef6de.jsonl, --cal fresh2,short3) must give the frozen result of reports/modernbert.md.
//    A missing records file FAILS this test: it is not skipped.
// 2. Small fixtures that a defect would fail.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir, homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { fitCalibrationRecipe, isCalibration, stats } from '../calibrate_modernbert.mjs';
import { goldProgram } from './parity_lib.mjs';
import { loadSet, loadSets, assignParts, sha256Mod, NL_KINDS, contextNames, PARTS, CALIBRATION_SETS, SET_ORDER } from './sets.mjs';
import { buildRecord, loadRecords, itemsOf, resizeDirection, SHRINK_RE, seenFunction, ngramInventory } from './arm_lib.mjs';
import { calibrateArm } from './calibrate_arm.mjs';
import { scoreArm, scorePart, allStats, resizeSmaller } from './score_arm.mjs';
import { compareSidecars, pairedInterval, assertSameFit, signFlipP, MIN_UNITS } from './compare_arms.mjs';
import { startSystem } from './arm_lib.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url)), TMP = mkdtempSync(tmpdir() + '/test-score-tools-');
let n = 0;
const test = (name, fn) => { try { fn(); n++; console.log('ok   ' + name); } catch (e) { console.log('FAIL ' + name + '\n' + (e.stack || e)); process.exitCode = 1; } };

// ---------------------------------------------------------------- 1. the reproduction
const FROZEN = homedir() + '/.cache/diagram-vss-modernbert/weight-only-records-baef6de.jsonl';
test('reproduction: the first run, from its records, exactly', () => {
  assert.ok(existsSync(FROZEN), 'the first run\'s records are missing: ' + FROZEN);
  const conf = TMP + '/conf.json', rep = TMP + '/rep.json', sc = TMP + '/score.json';
  execFileSync('node', [HERE + 'calibrate_arm.mjs', '--cal', 'fresh2,short3', conf, rep, FROZEN]);
  execFileSync('node', [HERE + 'score_arm.mjs', conf, sc, FROZEN]);
  const spec = JSON.parse(readFileSync(conf, 'utf8')), score = JSON.parse(readFileSync(sc, 'utf8'));
  assert.equal(spec.levels_out_of_fold.cost.threshold, 0.9765597115495379);
  const t = score.sets['fresh2+short3'].test, v = t.views.gold.today;
  assert.equal(t.use, 'evaluation');
  assert.equal(t.messages, 745); assert.equal(t.requested, 1745);
  const g = v.at_threshold;
  assert.deepEqual([g.threshold, g.right, g.wrong, g.asked, g.unread, g.extras], [0.9765597115495379, 16, 0, 1625, 104, 0]);
  assert.equal(g.auroc, 0.888655); assert.equal(Math.round(g.cost_score * 1e4) / 1e4, 0.9169);
  assert.deepEqual([v.all_executed.right, v.all_executed.wrong, v.all_executed.extras], [693, 948, 237]);
  const tg = v.by_trigger;
  assert.deepEqual([tg.seen.at_threshold.requested, tg.seen.at_threshold.right, tg.seen.at_threshold.asked, tg.seen.at_threshold.unread], [1560, 15, 1467, 78]);
  assert.deepEqual([tg.unseen.at_threshold.requested, tg.unseen.at_threshold.right, tg.unseen.at_threshold.asked, tg.unseen.at_threshold.unread], [185, 1, 158, 26]);
  const cal = score.sets['fresh2+short3'].calibration;
  assert.equal(cal.use, 'fit'); assert.deepEqual([cal.messages, cal.requested], [368, 808]);
  // the fitted file is the recipe's and the frozen file
  const strip = s => { const c = JSON.parse(JSON.stringify(s)); delete c.calibration; delete c.artifacts; delete c.arm; return c; };
  const old = fitCalibrationRecipe(readFileSync(FROZEN, 'utf8').trim().split('\n').map(JSON.parse)).spec;
  assert.deepEqual(strip(spec), strip(old));
  const frozen = homedir() + '/.cache/diagram-vss-modernbert/modernbert-weightonly-confidence-baef6de.json';
  if (existsSync(frozen)) assert.deepEqual(strip(spec), strip(JSON.parse(readFileSync(frozen, 'utf8'))));
  // the direction of the first run's resizes is not in its records: unavailable, never "as scored today"
  assert.ok(v.direction === undefined || t.views.gold.direction.direction_unavailable);
});

// ---------------------------------------------------------------- 2. fixtures
const seenAll = () => true;
const mkItem = (o = {}) => ({ id: 'x1', set: 'fresh2', part: 'test', kind: 'short', writer: null, session: null, group: null, setup: null, names: ['Moon', 'Sun'], groups: {}, text: 'shrink the moon', wires: [], altWires: null, ...o });
const wire = (span, type, args) => ({ span, trigger: span.split(' ')[0], type, args });
const node = (id, type, args) => ({ id, type, args });
const main = (nd, span, f = null, extra = {}) => ({ node: nd, mentions: [], span, src: '', f, act: f ? 'resize' : null, truncated: false, wireId: nd.id, dependencies: [], ...extra });
const rec = (item, mains, reader = 'rules') => buildRecord(item, { reader, mains, allNodes: mains.map(m => m.node) }, { seen: seenAll, artifactsKey: 'a' });

test('direction: growing a shape on "shrink" is right as scored today and wrong with the direction compared', () => {
  const item = mkItem({ wires: [wire('shrink the moon', 'command', { action: 'resize', target: 'Moon' })] });
  const grow = rec(item, [main(node('n1', 'command', { action: 'resize', target: 'Moon' }), [0, 15])]);
  assert.equal(grow.goldSpans[0].dirWant, 'smaller'); assert.equal(grow.produced[0].dir, 'bigger');
  assert.equal(itemsOf([grow], 'primary', 'today').items[0].o, 'right');
  assert.equal(itemsOf([grow], 'primary', 'direction').items[0].o, 'wrong');
  const shrink = rec(item, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '0.5' }), [0, 15])]);
  assert.equal(itemsOf([shrink], 'primary', 'today').items[0].o, 'right');
  assert.equal(itemsOf([shrink], 'primary', 'direction').items[0].o, 'right');
  // the totals of the score carry it
  const s = scoreArm(null, [grow]).out.sets.fresh2.test.views.gold;
  assert.equal(s.today.all_executed.right, 1); assert.equal(s.direction.all_executed.right, 0); assert.equal(s.direction.all_executed.wrong, 1);
});
test('direction: the rules of resizeDirection', () => {
  const d = (a, span, gold) => resizeDirection({ action: 'resize', ...a }, span, gold);
  assert.equal(d({ scale: '0.67' }), 'smaller'); assert.equal(d({ scale: '1.5' }), 'bigger'); assert.equal(d({}), 'bigger');
  assert.equal(d({}, 'make it smaller', true), 'smaller'); assert.equal(d({}, 'make it smaller', false), 'bigger');
  assert.equal(d({ size: 'small' }, 'shrink it', true), 'none'); assert.equal(d({ scale: '1' }), 'none');
  assert.equal(resizeDirection({ action: 'move' }, 'shrink', true), null);
  // the shrink words are the ones of goldProgram
  for (const w of ['shrink', 'smaller', 'tinier', 'reduce', 'less big', 'enlarge', 'grow']) {
    const p = goldProgram([{ span: `${w} the moon`, type: 'command', args: { action: 'resize', target: 'Moon' } }]);
    assert.equal(SHRINK_RE.test(w), p.includes('scale=0.67'), w);
  }
});
test('either teacher: a request that matches only the second teacher is right; an extra only when it matches neither', () => {
  const item = mkItem({ id: 'x2', text: 'make a circle and delete Sun', wires: [wire('make a circle', 'command', { action: 'create', shape: 'circle' })],
    altWires: [wire('make a circle', 'command', { action: 'create', shape: 'square' }), wire('delete Sun', 'command', { action: 'delete', target: 'Sun' })] });
  const r = rec(item, [main(node('n1', 'command', { action: 'create', shape: 'square' }), [0, 13]), main(node('n2', 'command', { action: 'delete', target: 'Sun' }), [18, 28]), main(node('n3', 'command', { action: 'move', target: 'Moon' }), [0, 5])]);
  assert.deepEqual(r.produced.map(x => x.o), ['wrong', 'extra', 'extra']);   // against the first teacher alone
  const e = itemsOf([r], 'either', 'today').items.map(x => x.o);
  assert.deepEqual(e, ['right', 'right', 'extra']);                          // the second teacher's create and delete; the move matches neither
  assert.deepEqual(itemsOf([r], 'primary', 'today').items.map(x => x.o), ['wrong', 'extra', 'extra']);
  // the teachers' own agreement: gpt scored against opus
  assert.deepEqual(r.altPair, [0, -1]);   // gpt's create pairs with Opus's, its delete has no Opus request
  const sc = scorePart([r], null, null, { engine: false }).part;
  assert.equal(sc.views.either.today.all_executed.right, 2); assert.equal(sc.views.either.today.all_executed.requested, 2); assert.equal(sc.views.opus.today.all_executed.right, 0);
  assert.equal(sc.teachers_agreement.gpt_scored_against_opus.today.requested, 1);
});
test('either teacher with the direction: right by the second teacher needs that teacher\'s direction', () => {
  const item = mkItem({ id: 'x3', wires: [wire('shrink the moon', 'command', { action: 'resize', target: 'Moon', scale: '0.5' })],
    altWires: [wire('shrink the moon', 'command', { action: 'resize', target: 'Moon', scale: '2' })] });
  const r = rec(item, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '3' }), [0, 15])]);   // bigger: the second teacher's way
  assert.equal(itemsOf([r], 'primary', 'direction').items[0].o, 'wrong');
  assert.equal(itemsOf([r], 'either', 'direction').items[0].o, 'right');
});
test('a session or a group never crosses the calibration split', () => {
  const rows = [];
  for (let i = 0; i < 300; i++) { rows.push({ id: 'a' + i, session: 's' + (i % 40) }); rows.push({ id: 'b' + i, group: 'g' + (i % 50) }); rows.push({ id: 'c' + i }); }
  for (let i = 0; i < 60; i++) rows.push({ id: 'd' + i, session: 's' + (i % 40), group: 'g' + (i % 50) });   // rows that link sessions and groups
  const parts = assignParts('nl_a', rows), by = new Map();
  rows.forEach((r, i) => { for (const k of [r.session != null && 'S' + r.session, r.group != null && 'G' + r.group].filter(Boolean)) (by.get(k) || by.set(k, new Set()).get(k)).add(parts[i]); });
  for (const [k, s] of by) assert.equal(s.size, 1, k + ' crosses the split');
  assert.ok(parts.includes('calibration') && parts.includes('development'));
  // the rule itself, for rows with one key: SHA256(session or group or id) % 2 == 0
  const one = [{ id: 'z1', session: 'alpha' }, { id: 'z2', session: 'alpha' }, { id: 'z3', group: 'beta' }, { id: 'z4' }], p1 = assignParts('nl_a', one), want = k => (sha256Mod(k, 2) === 0 ? 'calibration' : 'development');
  assert.deepEqual(p1, [want('alpha'), want('alpha'), want('beta'), want('z4')]);
});
test('fresh2 and short3: the calibration part is SHA256(id) % 3 == 0 as calibrate_modernbert.mjs; counts of the frozen protocol', () => {
  const sets = loadSets(['fresh2', 'short3']), items = sets.flatMap(s => s.items);
  for (const it of items) assert.equal(it.part === 'calibration', isCalibration(it.id));
  const count = (p) => items.filter(i => i.part === p);
  assert.deepEqual([items.length, sets[1].excluded.length, count('calibration').length, count('test').length], [1113, 17, 368, 745]);
  assert.equal(count('test').reduce((s, i) => s + i.wires.length, 0), 1745);
  assert.equal(sets[0].items.filter(i => i.part === 'test').reduce((s, i) => s + i.wires.length, 0), 1313);
});
test('collected_1 and scenes_test: every message, no calibration part; the scenes are the sessions', () => {
  const c = loadSet('collected_1'), s = loadSet('scenes_test');
  assert.equal(c.items.length, 52); assert.ok(c.items.every(i => i.part === 'all'));
  assert.deepEqual([...new Set(c.items.map(i => i.kind))].sort(), ['as_sent', 'corrected']);
  assert.equal(c.items.filter(i => i.kind === 'as_sent').reduce((n, i) => n + i.wires.length, 0), 22);
  assert.equal(s.items.length, 166); assert.equal(new Set(s.items.map(i => i.session)).size, 4); assert.ok(s.items.every(i => i.part === 'all' && i.step != null));
});
test('a calibration part is never scored as test, and the fit never reads another part', () => {
  const mk = (id, set, part, right) => { const r = rec(mkItem({ id, set, wires: [wire('shrink the moon', 'command', { action: 'delete', target: 'Moon' })], text: 'shrink the moon' }), [main(node('n1', 'command', { action: 'delete', target: right ? 'Moon' : 'Sun' }), [0, 15], Object.fromEntries(['act_p', 'act_margin', 'act_negent', 'val_p_min', 'val_margin_min', 'none_p_min', 'fill_p_min', 'fill_margin_min', 'ctx_fill', 'tag_p_min', 'tag_margin_min', 'tag_all_min', 'tag_stray', 'desc_p_min', 'desc_margin_min', 'cut_start', 'cut_end', 'cut_inner_min', 'unk_share', 'split_share', 'n_words', 'n_roles', 'n_units'].map((k, i) => [k, right ? .9 - i * .001 : .2 + i * .001])), { })], 'sop'); r.part = part; r.set = set; r.artifacts_sha256 = 'a'; return r; };
  const ids = []; for (let i = 0; ; i++) { if (isCalibration('c' + i)) ids.push('c' + i); if (ids.length >= 60) break; }
  const calRecs = ids.map((id, i) => mk(id, 'fresh2', 'calibration', i % 3 !== 0));
  const testRecs = Array.from({ length: 40 }, (_, i) => mk('t' + i, 'fresh2', 'test', i % 2 === 0));
  const a = calibrateArm(calRecs, ['fresh2']), b = calibrateArm([...calRecs, ...testRecs], ['fresh2']);
  assert.deepEqual(a.spec.tables, b.spec.tables); assert.deepEqual(a.spec.levels_out_of_fold, b.spec.levels_out_of_fold);
  assert.equal(b.report.ignored_records['fresh2/test'], 40);
  assert.equal(a.spec.calibration.messages, 60);
  assert.throws(() => calibrateArm(calRecs, ['collected_1']), /no calibration part/);
  assert.throws(() => calibrateArm(calRecs, ['short3']), /no calibration message/);
  assert.throws(() => calibrateArm(calRecs, []), /--cal is required/);
  const sc = scoreArm(a.spec, [...calRecs, ...testRecs]).out.sets.fresh2;
  assert.equal(sc.calibration.use, 'fit'); assert.equal(sc.test.use, 'evaluation');
  // compare_arms leaves the fit part out
  const side = { 'fresh2/calibration': { ids: ['a'], session: [null], tallies: { 'gold.today.all': { right: [1], bad: [0], G: [1] } } } };
  assert.deepEqual(compareSidecars(side, side, { sets: { fresh2: { calibration: { use: 'fit' } } } }, { sets: { fresh2: { calibration: { use: 'fit' } } } }), {});
  // fail closed: a request with no confidence signals is never executed at a threshold
  const nof = mk('n1', 'fresh2', 'test', true); nof.produced[0].f = null;
  const g = scorePart([nof], a.spec, a.spec.levels_out_of_fold.cost.threshold, { engine: false }).part.views.gold.today;
  assert.equal(g.at_threshold.right, 0); assert.equal(g.at_threshold.asked, 1); assert.equal(g.at_threshold.without_confidence, 1);
});
test('a stored part that differs from the rule is refused', () => {
  const r = rec(mkItem({ id: 'fo-0001' }), []); r.part = isCalibration('fo-0001') ? 'test' : 'calibration'; r.set = 'fresh2';
  const f = TMP + '/badpart.jsonl'; writeFileSync(f, JSON.stringify(r) + '\n');
  assert.throws(() => loadRecords([f], { verify: false }), /stored part/);
  writeFileSync(f, JSON.stringify(r).slice(0, 40) + '\n');
  assert.throws(() => loadRecords([f], { verify: false }), /not JSON/);
});
test('the per-message tallies add up to the stats the first fit uses', () => {
  const { records } = loadRecords([FROZEN]);
  const { spec } = calibrateArm(records, ['fresh2', 'short3']), thr = spec.levels_out_of_fold.cost.threshold;
  const test = records.filter(r => r.part === 'test'), { part, sidecar } = scorePart(test, spec, thr, { engine: false });
  const t = sidecar.tallies['gold.today.gate'], g = part.views.gold.today.at_threshold;
  assert.equal(t.right.reduce((a, b) => a + b, 0), g.right); assert.equal(t.bad.reduce((a, b) => a + b, 0), g.wrong + g.extras);
  const all = sidecar.tallies['gold.today.all'], e = part.views.gold.today.all_executed;
  assert.equal(all.right.reduce((a, b) => a + b, 0), e.right); assert.equal(all.bad.reduce((a, b) => a + b, 0), e.wrong + e.extras);
});
test('paraphrase consistency, nothing to do and sessions, on small drawings', () => {
  const setup = '@a command action=create shape=circle name=A at=200,200';
  const mv = (id, group, args) => rec(mkItem({ id, group, kind: 'paraphrase', setup, names: ['A'], text: 'move A up', wires: [wire('move A up', 'command', { action: 'move', target: 'A', direction: 'up', distance: '60' })] }),
    args ? [main(node('n1', 'command', { action: 'move', target: 'A', ...args }), [0, 9])] : []);
  const rs = [mv('p1', 'g1', { direction: 'up', distance: 60 }), mv('p2', 'g1', { direction: 'up', distance: 60 }), mv('p3', 'g1', { direction: 'down', distance: 60 }), mv('p4', 'g1', null)];
  const pp = scorePart(rs, null, null).part.paraphrase.all_executed;
  assert.deepEqual([pp.groups, pp.wordings, pp.same_effect_share, pp.changed_nothing_share, pp.same_effect_as_gold_share], [1, 4, 0.5, 0.25, 0.5]);
  const nt = [rec(mkItem({ id: 'q1', kind: 'nothing_to_do', text: 'thanks', wires: [] }), [main(node('n1', 'command', { action: 'delete', target: 'A' }), [0, 3])]), rec(mkItem({ id: 'q2', kind: 'nothing_to_do', text: 'hello', wires: [] }), [])];
  assert.equal(scorePart(nt, null, null).part.nothing_to_do.all_executed.actions_executed_per_100_messages, 50);
  const step = (id, i, text, wires, args) => rec(mkItem({ id, session: 's1', step: i, setup: i ? null : setup, text, names: ['A'], wires }), args ? [main(node('n1', 'command', args), [0, text.length])] : []);
  const w1 = [wire('make B', 'command', { action: 'create', shape: 'square', name: 'B', at: '400,200' })];
  const good = [step('s1', 0, 'make B', w1, { action: 'create', shape: 'square', name: 'B', at: '400,200' })], bad = [step('s1', 0, 'make B', w1, null)];
  const g = scorePart(good, null, null).part.sessions.all_executed, b = scorePart(bad, null, null).part.sessions.all_executed;
  assert.equal(g.same_final_drawing, 1); assert.equal(g.mean_share_percent_of_what_the_session_changed.shapes, 100);
  assert.equal(b.same_final_drawing, 0); assert.ok(b.mean_share_percent_of_what_the_session_changed.shapes < 100);
});
test('collected_1: both teachers beside the gold; the teachers\' agreement; either teacher', () => {
  const c = loadSet('collected_1'); assert.ok(c.items.every(i => i.teachers && i.teachers.opus && i.teachers.gpt));
  const item = mkItem({ id: 'x9', text: 'make a circle and delete Sun', wires: [wire('make a circle', 'command', { action: 'create', shape: 'circle' })],
    teachers: { opus: [wire('make a circle', 'command', { action: 'create', shape: 'circle' }), wire('delete Sun', 'command', { action: 'delete', target: 'Sun' })], gpt: [wire('make a circle', 'command', { action: 'create', shape: 'square' })] } });
  const r = rec(item, [main(node('n1', 'command', { action: 'create', shape: 'square' }), [0, 13]), main(node('n2', 'command', { action: 'delete', target: 'Sun' }), [18, 28])]);
  const p = scorePart([r], null, null, { engine: false }).part;
  assert.equal(p.views.gold.today.all_executed.requested, 1); assert.equal(p.views.gold.today.all_executed.right, 0);   // against the existing gold: a wrong create and an extra
  assert.equal(p.views.teacher_opus.today.all_executed.requested, 2); assert.equal(p.views.teacher_opus.today.all_executed.right, 1);   // the delete is Opus's
  assert.equal(p.views.teacher_either.today.all_executed.right, 2);   // the square is gpt's
  assert.equal(p.teachers_agreement.gpt_scored_against_opus.today.requested, 2); assert.equal(p.teachers_agreement.gpt_scored_against_opus.today.right, 0);
  assert.equal(p.gold_agreement_with_teachers.gold_scored_against_opus.today.right, 1);
});
test('unreliable rows: their names are read, but they are left out of sessions and paraphrase consistency', () => {
  const setup = '@a command action=create shape=circle name=A at=200,200';
  const w1 = [wire('make B', 'command', { action: 'create', shape: 'square', name: 'B', at: '400,200' })], w2 = [wire('make C', 'command', { action: 'create', shape: 'square', name: 'C', at: '600,200' })];
  const step = (id, i, text, wires, unreliable) => rec(mkItem({ id, session: 's1', step: i, setup: i ? null : setup, text, names: ['A'], wires, unreliable }), [main(node('n1', 'command', wires[0].args), [0, text.length])]);
  const s = scorePart([step('u1', 0, 'make B', w1, false), step('u2', 1, 'make C', w2, true)], null, null).part.sessions.all_executed;
  assert.equal(s.steps_left_out_as_unreliable, 1); assert.equal(s.same_final_drawing, 1);
  assert.equal(scorePart([step('u1', 0, 'make B', w1, true)], null, null).part.sessions.all_executed.sessions, 0);
});
test('trigger inventory: exact list and the words of the training rows', () => {
  const exact = seenFunction({ exact: ['Make', 'wall first'] });
  assert.ok(exact('make') && exact('Wall First') && !exact('construct'));
  const w = seenFunction(ngramInventory([{ words: ['Please', 'Get', 'rid', 'of', 'it'] }]));
  assert.ok(w('get rid of') && w('Please') && !w('rid get') && !w('delete'));
});
test('new sets: both label folders, the kinds of NL_TEST_SPEC.md, the same ids and texts', () => {
  const root = TMP + '/bench'; mkdirSync(root + '/nl_a/opus', { recursive: true }); mkdirSync(root + '/nl_a/gpt', { recursive: true });
  const row = (id, extra = {}) => ({ id, domain: 'd', kind: 'short', names: ['A'], groups: { G: ['A'] }, text: 'move A up', wires: [wire('move A up', 'command', { action: 'move', target: 'A', direction: 'up' })], ...extra });
  const rows = [row('r1'), row('r2', { session: 'S', kind: 'session' }), row('r3', { session: 'S', kind: 'session' }), row('r4', { group: 'P', kind: 'paraphrase', setup: '@a command action=create shape=circle name=A' })];
  writeFileSync(root + '/nl_a/opus/batch_01.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(root + '/nl_a/gpt/batch_01.jsonl', rows.map(r => JSON.stringify({ ...r, wires: [wire('move A up', 'command', { action: 'move', target: 'A', direction: 'down' })] })).join('\n') + '\n');
  const s = loadSet('nl_a', { root });
  assert.equal(s.items.length, 4); assert.deepEqual(s.teachers, ['opus', 'gpt']); assert.equal(s.items[0].altWires[0].args.direction, 'down');
  assert.equal(s.items[1].part, s.items[2].part); assert.deepEqual(contextNames(s.items[0]), ['A', 'G']);
  assert.ok(s.items.every(i => ['calibration', 'development'].includes(i.part)));
  writeFileSync(root + '/nl_a/gpt/batch_01.jsonl', JSON.stringify(rows[0]) + '\n');
  assert.throws(() => loadSet('nl_a', { root }), /different ids/);
  writeFileSync(root + '/nl_a/gpt/batch_01.jsonl', rows.map(r => JSON.stringify({ ...r, text: 'move A up please' })).join('\n') + '\n');
  assert.throws(() => loadSet('nl_a', { root }), /different texts/);
  writeFileSync(root + '/nl_a/opus/batch_01.jsonl', JSON.stringify(row('r1', { kind: 'nothing' })) + '\n');
  assert.throws(() => loadSet('nl_a', { root }), /not one of/);
  assert.throws(() => loadSet('nl_b', { root }), /nl_b is not written yet/);   // the root given holds no nl_b: only a synthetic root is ever used here
  { const syn = mkdirSync(root + '/nl_b/opus', { recursive: true }); mkdirSync(root + '/nl_b/gpt', { recursive: true });
    const rowb = { id: 'nlb-01-001', domain: 'd', kind: 'short', names: ['A'], groups: {}, text: 'move A up', wires: [wire('move A up', 'command', { action: 'move', target: 'A', direction: 'up' })] };
    writeFileSync(root + '/nl_b/opus/batch_01.jsonl', JSON.stringify(rowb) + '\n'); writeFileSync(root + '/nl_b/gpt/batch_01.jsonl', JSON.stringify(rowb) + '\n');
    const b = loadSet('nl_b', { root }); assert.deepEqual(b.teachers, ['opus', 'gpt']); assert.equal(b.items[0].part, 'all'); assert.equal(b.items[0].writer, 'gpt-6.1-sol');
    assert.deepEqual(PARTS.nl_b, ['all']); assert.ok(!CALIBRATION_SETS.includes('nl_b'));
    assert.throws(() => calibrateArm([], ['nl_b']), /no calibration part/); }
  assert.ok(NL_KINDS.includes('nothing_to_do'));
  // a pending wire: left out of fresh2 and short3 only (and counted); never dropped quietly elsewhere
  writeFileSync(root + '/nl_a/opus/batch_01.jsonl', JSON.stringify(row('r1', { wires: [{ span: 'move A up', trigger: 'move', type: 'command', args: { action: 'move' }, pending: 'no form' }] })) + '\n');
  writeFileSync(root + '/nl_a/gpt/batch_01.jsonl', JSON.stringify(row('r1')) + '\n');
  assert.throws(() => loadSet('nl_a', { root }), /pending gold wire/);
  assert.equal(loadSet('short3').excluded.length, 17);
});
test('compare_arms: identical arms differ by 0; a seeded interval repeats; other messages are refused', () => {
  const n12 = Array.from({ length: 12 }, (_, i) => 'm' + i), t = { ids: n12, session: n12.map(() => null), tallies: { 'gold.today.all': { right: n12.map((_, i) => i % 3 ? 1 : 0), bad: n12.map((_, i) => i % 3 ? 0 : 1), G: n12.map(() => 1) } } };
  const sc = { sets: { fresh2: { test: { use: 'evaluation' } } } }, c = compareSidecars({ 'fresh2/test': t }, { 'fresh2/test': t }, sc, sc)['fresh2/test'].variants['gold.today.all'];
  assert.equal(c.difference, 0); assert.deepEqual(c.ci95, [0, 0]);
  const A = { right: [1, 1, 1, 1], bad: [0, 0, 0, 0] }, B = { right: [1, 0, 0, 1], bad: [0, 0, 1, 0] };
  const i1 = pairedInterval([[0], [1], [2], [3]], [1, 1, 1, 1], A, B), i2 = pairedInterval([[0], [1], [2], [3]], [1, 1, 1, 1], A, B);
  assert.deepEqual(i1, i2); assert.ok(i1[0] > 0 || i1[0] === 0);
  assert.throws(() => compareSidecars({ 'fresh2/test': t }, { 'fresh2/test': { ...t, ids: [...n12.slice(0, 11), 'x'] } }, sc, sc), /different messages/);
});
test('collect_set: a stopped Rules collection resumes to the same records; a changed configuration is refused', () => {
  const td = homedir() + '/.cache/diagram-vss-modernbert/arms/baseline/train-data';
  assert.ok(existsSync(td + '/trigger_inventory.json'), 'run trigger_inventory.mjs for the baseline data folder first');
  const env = { ...process.env, READER: 'rules' }, run = (out, sets) => execFileSync('node', [HERE + 'collect_set.mjs', '--train-data', td, '--allow-text-overlap', out, ...sets], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  const A = TMP + '/full.jsonl', B = TMP + '/cut.jsonl'; run(A, ['collected_1', 'scenes_test']);
  const lines = readFileSync(A, 'utf8').split('\n').filter(Boolean);
  writeFileSync(B, lines.slice(0, 70).join('\n') + '\n' + lines[70].slice(0, 500));   // a stop in the middle of a record
  const m = JSON.parse(readFileSync(A + '.manifest.json', 'utf8')); m.complete = false; m.records = null; writeFileSync(B + '.manifest.json', JSON.stringify(m));
  run(B, ['collected_1', 'scenes_test']);
  assert.equal(readFileSync(B, 'utf8'), readFileSync(A, 'utf8'));
  assert.equal(JSON.parse(readFileSync(B + '.manifest.json', 'utf8')).complete, true);
  assert.throws(() => run(B, ['collected_1']), /changed since|fresh path/);
  writeFileSync(TMP + '/orphan.jsonl', '{}\n');
  assert.throws(() => run(TMP + '/orphan.jsonl', ['collected_1']), /Command failed/);   // records without a manifest are not taken over
});
test('the context names of a row include its groups', () => {
  assert.deepEqual(contextNames({ names: ['A', 'B'], groups: { G: ['A'], B: ['A'] } }), ['A', 'B', 'G']);
});


// ---------------------------------------------------------------- the review's findings
const TD = homedir() + '/.cache/diagram-vss-modernbert/arms/baseline/train-data';
const collectRules = (out, sets, extra = [], td = TD) => execFileSync('node', [HERE + 'collect_set.mjs', '--train-data', td, ...extra, out, ...sets], { env: { ...process.env, READER: 'rules' }, stdio: ['ignore', 'pipe', 'pipe'] });
test('records: a truncated, unfinished, changed or out-of-date file is refused', () => {
  const A = TMP + '/ok.jsonl'; collectRules(A, ['collected_1'], ['--allow-text-overlap']);
  assert.equal(loadRecords([A]).records.length, 52);
  const lines = readFileSync(A, 'utf8').split('\n').filter(Boolean), man = JSON.parse(readFileSync(A + '.manifest.json', 'utf8'));
  const put = (f, ls, m) => { writeFileSync(f, ls.map(l => l + '\n').join('')); writeFileSync(f + '.manifest.json', JSON.stringify(m)); };
  // the first lines of a longer file, with its manifest: count and hash differ
  const cut = TMP + '/cut.jsonl'; writeFileSync(cut, lines.slice(0, 20).map(l => l + '\n').join('')); writeFileSync(cut + '.manifest.json', JSON.stringify(man));
  assert.throws(() => loadRecords([cut]), /not the complete collection/);
  // no manifest
  writeFileSync(TMP + '/nomanifest.jsonl', lines.join('\n') + '\n'); assert.throws(() => loadRecords([TMP + '/nomanifest.jsonl']), /no .*manifest/);
  // unfinished
  put(TMP + '/unfinished.jsonl', lines, { ...man, complete: false }); assert.throws(() => loadRecords([TMP + '/unfinished.jsonl']), /not the complete collection/);
  // a record from other input, with a manifest that fits the file
  const bad = lines.map((l, i) => (i === 3 ? JSON.stringify({ ...JSON.parse(l), input_sha256: 'x'.repeat(64) }) : l)), sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
  writeFileSync(TMP + '/bad.jsonl', bad.map(l => l + '\n').join('')); writeFileSync(TMP + '/bad.jsonl.manifest.json', JSON.stringify({ ...man, records: { count: 52, sha256: sha(TMP + '/bad.jsonl') } }));
  assert.throws(() => loadRecords([TMP + '/bad.jsonl']), /other input/);
  // a complete, hashed file that holds only part of the set
  const part = lines.slice(0, 30); writeFileSync(TMP + '/part.jsonl', part.map(l => l + '\n').join('')); writeFileSync(TMP + '/part.jsonl.manifest.json', JSON.stringify({ ...man, records: { count: 30, sha256: sha(TMP + '/part.jsonl') } }));
  assert.throws(() => loadRecords([TMP + '/part.jsonl']), /not complete for the set/);
});
test('either teacher is one to one: a teacher request fills one requested action once', () => {
  const item = mkItem({ id: 'o1', text: 'make a circle and make a square', wires: [wire('make a circle', 'command', { action: 'create', shape: 'circle' }), wire('make a square', 'command', { action: 'create', shape: 'square' })],
    altWires: [wire('make a circle', 'command', { action: 'create', shape: 'circle' }), wire('make a square', 'command', { action: 'create', shape: 'square' })] });
  const twice = rec(item, [0, 0, 1, 1].map(i => main(node('n' + i, 'command', { action: 'create', shape: i ? 'square' : 'circle' }), i ? [18, 31] : [0, 13])));
  const w = scorePart([twice], null, null, { engine: false }).part.views;
  assert.equal(w.opus.today.all_executed.right, 2); assert.equal(w.either.today.all_executed.right, 2); assert.equal(w.either.today.all_executed.extras, 2);
  assert.equal(w.either.today.all_executed.requested, 2);
  // gpt's requests played as a reader never score above 100%
  assert.ok(twice.altPair.length === 2 && twice.altPair.every(x => x >= 0));
  const sc = scorePart([twice], null, null, { engine: false }).part.teachers_agreement.gpt_scored_against_opus.today;
  assert.ok(sc.right <= sc.requested);
});
test('compare_arms: refuses other fits, one ci95 over sessions, groups or messages', () => {
  assert.throws(() => assertSameFit({ threshold_cost10: .9, calibrated_on: ['fresh2', 'short3'] }, { threshold_cost10: .8, calibrated_on: ['fresh2', 'short3', 'nl_a'] }), /not fitted on the same/);
  assertSameFit({ threshold_cost10: .9, calibrated_on: ['fresh2'] }, { threshold_cost10: .8, calibrated_on: ['fresh2'] });
  assertSameFit({ threshold_cost10: .9, calibrated_on: ['fresh2'] }, { threshold_cost10: null, calibrated_on: [] });   // the Rules have no fit
  const tl = { right: [1, 0, 1, 1, 0], bad: [0, 1, 0, 0, 0], G: [1, 1, 1, 1, 1] }, t = { ids: ['a', 'b', 'c', 'd', 'e'], session: ['s', 's', null, null, null], group: [null, null, 'g', 'g', null], tallies: { 'gold.today.all': tl } };
  const sc = { sets: { nl_a: { development: { use: 'evaluation' } } } }, c = compareSidecars({ 'nl_a/development': t }, { 'nl_a/development': t }, sc, sc)['nl_a/development'];
  assert.equal(c.resampled_units, 3); assert.match(c.unit, /session, else paraphrase group, else message/); assert.ok(!('ci95_messages' in c.variants['gold.today.all'])); assert.equal(c.variants['gold.today.all'].ci95, null);   // 3 units: no interval
});
test('collect_set refuses an evaluated message that is in the training rows', () => {
  const dir = TMP + '/trainA'; mkdirSync(dir, { recursive: true }); copyFileSync(TD + '/trigger_inventory.json', dir + '/trigger_inventory.json');
  writeFileSync(dir + '/train.jsonl', JSON.stringify({ id: 'col-0001', text: 'a fragment' }) + '\n');
  assert.throws(() => collectRules(TMP + '/ov1.jsonl', ['collected_1'], [], dir), /id of a training row/);
  writeFileSync(dir + '/train.jsonl', JSON.stringify({ id: 'zz-1', text: ' Make me   a YELLOW triangle ' }) + '\n');
  assert.throws(() => collectRules(TMP + '/ov2.jsonl', ['collected_1'], [], dir), /text of a training row/);
  collectRules(TMP + '/ov3.jsonl', ['collected_1'], ['--allow-text-overlap'], dir);
  const marked = readFileSync(TMP + '/ov3.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(r => r.train_text_overlap);
  assert.deepEqual(marked.map(r => r.id), ['col-0002', 'colc-0002'].filter(id => marked.some(r => r.id === id)));
  assert.ok(marked.length >= 1);
});
test('the setup is not undoable; "more small" and "smaler" are smaller; nl_a writers', () => {
  const S = startSystem('@a command action=create shape=circle name=A at=200,200'); assert.equal(S.s.world.undoStack.length, 0); assert.equal(S.s.world.redoStack.length, 0);
  for (const w of ['make it more small', 'Spinner smaler']) assert.equal(resizeDirection({ action: 'resize' }, w, true), 'smaller');
  const items = loadSet('nl_a').items;
  assert.equal(items.find(i => i.source.includes('batch_01')).writer, 'gpt-6.1-sol'); assert.equal(items.find(i => i.source.includes('batch_07')).writer, 'claude-opus-5-5'); assert.ok(items.every(i => i.writer));
});
test('validate_rows --write clears a stale unreliable flag', () => {
  const d = TMP + '/vr'; mkdirSync(d + '/texts', { recursive: true }); mkdirSync(d + '/labels', { recursive: true });
  const T = [{ id: 'w1', domain: 'd', kind: 'session', session: 's', setup: '@a command action=create shape=circle name=A at=200,200', text: 'move A up' }, { id: 'w2', domain: 'd', kind: 'session', session: 's', text: 'make B' }];
  const L = [{ ...T[0], names: ['A'], groups: {}, wires: [wire('move A up', 'command', { action: 'move', target: 'A', direction: 'up' })] }, { ...T[1], names: ['A'], groups: {}, unreliable: true, wires: [wire('make B', 'command', { action: 'create', shape: 'square', name: 'B' })] }];
  writeFileSync(d + '/texts/b.jsonl', T.map(r => JSON.stringify(r)).join('\n') + '\n'); writeFileSync(d + '/labels/b.jsonl', L.map(r => JSON.stringify(r)).join('\n') + '\n');
  execFileSync('node', [HERE + 'validate_rows.mjs', d + '/texts', d + '/labels', '--write'], { stdio: 'pipe' });
  const out = readFileSync(d + '/labels/b.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(!('unreliable' in out[1]), 'the flag of an earlier run is gone'); assert.deepEqual(out[1].names, ['A']);
});
test('sessions count only what the session changed; a reader that does nothing is the floor; questions compare answers', () => {
  const setup = '@a command action=create shape=circle name=A at=200,200\n@b command action=create shape=square name=Bb at=400,200';
  const w1 = [wire('make C', 'command', { action: 'create', shape: 'star', name: 'C', at: '300,100' })], w2 = [wire('how many circles', 'question', { ask: 'count', shape: 'circle' })];
  const step = (id, i, text, wires, args, type = 'command') => rec(mkItem({ id, session: 's1', step: i, setup: i ? null : setup, text, names: ['A', 'Bb'], wires }), args ? [main(node('n1', type, args), [0, text.length])] : []);
  const good = [step('s1', 0, 'make C', w1, { action: 'create', shape: 'star', name: 'C', at: '300,100' }), step('s2', 1, 'how many circles', w2, { ask: 'count', shape: 'circle' }, 'question')];
  const nothing = [step('s1', 0, 'make C', w1, null), step('s2', 1, 'how many circles', w2, null)];
  const g = scorePart(good, null, null).part, n = scorePart(nothing, null, null).part;
  assert.equal(g.sessions.all_executed.mean_share_percent_of_what_the_session_changed.shapes, 100);
  assert.equal(g.sessions.all_executed.questions_with_a_gold_answer, 1); assert.equal(g.sessions.all_executed.questions_same_answer, 1);
  assert.equal(n.sessions.all_executed.mean_share_percent_of_what_the_session_changed.shapes, 0);
  assert.ok(n.sessions.all_executed.mean_share_percent_whole_drawing.shapes > 0, 'the old whole-drawing share counts the setup');
  assert.equal(n.sessions.all_executed.questions_same_answer, 0);
  assert.equal(g.do_nothing_floor.sessions.mean_share_percent_of_what_the_session_changed.shapes, 0);
  // paraphrase: doing nothing is as consistent as can be, and the floor says so
  const pm = (id, args) => rec(mkItem({ id, group: 'g1', kind: 'paraphrase', setup: '@a command action=create shape=circle name=A at=200,200', names: ['A'], text: 'move A up', wires: [wire('move A up', 'command', { action: 'move', target: 'A', direction: 'up', distance: 60 })] }), args ? [main(node('n1', 'command', { action: 'move', target: 'A', ...args }), [0, 9])] : []);
  const pf = scorePart([pm('p1', { direction: 'up', distance: 60 }), pm('p2', null)], null, null).part;
  assert.equal(pf.do_nothing_floor.paraphrase.same_effect_share, 1); assert.equal(pf.do_nothing_floor.paraphrase.same_effect_as_gold_share, 0);
});


// ---------------------------------------------------------------- the second review
test('compare_arms: fewer than 10 units give no interval, with the reason and an exact sign-flip p-value', () => {
  const sc = { sets: { scenes_test: { all: { use: 'evaluation' } } } };
  const mk = (right) => ({ ids: ['a', 'b', 'c', 'd'], session: ['s1', 's1', 's2', 's3'], group: [null, null, null, null], tallies: { 'gold.today.all': { right, bad: [0, 0, 0, 0], G: [1, 1, 1, 1] } } });
  const c = compareSidecars({ 'scenes_test/all': mk([1, 1, 1, 1]) }, { 'scenes_test/all': mk([0, 0, 0, 0]) }, sc, sc)['scenes_test/all'], v = c.variants['gold.today.all'];
  assert.equal(c.resampled_units, 3); assert.equal(v.ci95, null); assert.equal(v.ci95_reason, 'too few units (3 session)');
  assert.equal(v.p_sign_flip, .25);   // 3 units all one way: 2 of 8 sign patterns are as extreme
  assert.equal(signFlipP([1, 2, 3, 4]), 0.125);
  assert.equal(MIN_UNITS, 10);
  // a null simulation: with 4 units the bootstrap lower end is above 0 far more often than 2.5%, and no interval is given
  const next = (() => { let a = 7; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
  let above = 0, runs = 400;
  for (let k = 0; k < runs; k++) { const d = [0, 1, 2, 3].map(() => (next() < .5 ? -1 : 1) * (1 + Math.floor(next() * 3))); const A = { right: d.map(x => (x > 0 ? x : 0)), bad: d.map(() => 0) }, B = { right: d.map(x => (x < 0 ? -x : 0)), bad: d.map(() => 0) };
    const ci = pairedInterval([[0], [1], [2], [3]], [10, 10, 10, 10], A, B, 200, 1 + k); if (ci && ci[0] > 0) above++; }
  assert.ok(above / runs > .05, 'the raw bootstrap on 4 units is too narrow: ' + above / runs);
});
test('L2: the requests that ask for smaller, by the registered words and by the scorer\'s', () => {
  const item = mkItem({ id: 'l1', text: 'shrink the Moon and make the Sun more small', wires: [wire('shrink the Moon', 'command', { action: 'resize', target: 'Moon' }), wire('make the Sun more small', 'command', { action: 'resize', target: 'Sun' }), wire('make Earth smaller', 'command', { action: 'resize', target: 'Earth', scale: '0.5' })] });
  const reads = (a, b, c) => rec(item, [main(node('n1', 'command', { action: 'resize', target: 'Moon', ...a }), [0, 15]), main(node('n2', 'command', { action: 'resize', target: 'Sun', ...b }), [20, 43]), main(node('n3', 'command', { action: 'resize', target: 'Earth', ...c }), [44, 60])]);
  const grow = reads({}, {}, { scale: '0.5' }), shrink = reads({ scale: '0.5' }, { scale: '0.67' }, { scale: '0.5' });
  assert.deepEqual(resizeSmaller([grow], null, null), { registered: { requested: 1, executed_smaller: 0, right_with_direction: 0, gate_smaller: null, unavailable: 0 }, scorer: { requested: 2, executed_smaller: 0, right_with_direction: 0, gate_smaller: null, unavailable: 0 } });
  const s = resizeSmaller([shrink], null, null);
  assert.deepEqual([s.registered.requested, s.registered.executed_smaller, s.registered.right_with_direction, s.scorer.requested, s.scorer.executed_smaller, s.scorer.right_with_direction], [1, 1, 1, 2, 2, 2]);
  // at a threshold: only the smaller ones that clear it
  const stub = { intercept: 5, features: [], tables: {}, act_prior: {}, act_prior_default: .5 }, held = rec(item, [main(node('n1', 'command', { action: 'resize', target: 'Moon', scale: '0.5' }), [0, 15], {}, {}), main(node('n2', 'command', { action: 'resize', target: 'Sun', scale: '0.5' }), [20, 43], null)]);
  held.produced[0].f = {}; held.produced[0].act = 'resize';
  const g = resizeSmaller([held], stub, 0.9);
  assert.equal(g.scorer.executed_smaller, 2); assert.equal(g.scorer.gate_smaller, 1);   // the second has no confidence signals: asked
  assert.equal(scorePart([grow], null, null, { engine: false }).part.resize_smaller.registered.requested, 1);
  // on the real data the plan's 17 and the scorer's 19, on fresh2+short3 test
  const { records } = loadRecords([homedir() + '/.cache/diagram-vss-modernbert/arms/baseline/rules.jsonl']), tp = records.filter(r => (r.set === 'fresh2' || r.set === 'short3') && r.part === 'test');
  const real = resizeSmaller(tp, null, null); assert.equal(real.registered.requested, 17); assert.equal(real.scorer.requested, 19);
});
test('records: stored labels, setup, session, group, kind, unreliable and the set digest are checked', () => {
  const A = TMP + '/lab.jsonl'; collectRules(A, ['collected_1'], ['--allow-text-overlap']);
  const lines = readFileSync(A, 'utf8').split('\n').filter(Boolean), man = JSON.parse(readFileSync(A + '.manifest.json', 'utf8')), sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
  const write = (f, ls, m) => { writeFileSync(f, ls.map(l => l + '\n').join('')); writeFileSync(f + '.manifest.json', JSON.stringify({ ...m, records: { count: ls.length, sha256: sha(f) } })); };
  const pick = lines.findIndex(l => { const r = JSON.parse(l); return r.teachers.gpt.length && r.goldSpans.length; });
  const edit = fn => lines.map((l, i) => (i === pick ? JSON.stringify(fn(JSON.parse(l))) : l));
  const cases = { 'teachers wires': r => { r.teachers.gpt[0].args = { ...r.teachers.gpt[0].args, shape: 'zz' }; return r; }, kind: r => ({ ...r, kind: 'long' }), group: r => ({ ...r, group: 'g' }), session: r => ({ ...r, session: 's' }), setup: r => ({ ...r, setup: '@a x' }), unreliable: r => ({ ...r, unreliable: true }),
    'gold wires': r => { r.goldSpans[0].args = { ...r.goldSpans[0].args, shape: 'zz' }; return r; } };
  for (const [name, fn] of Object.entries(cases)) { const f = TMP + '/lab_' + name.replace(/ /g, '_') + '.jsonl'; write(f, edit(fn), man); assert.throws(() => loadRecords([f]), new RegExp(name.split(' ')[0]), name); }
  // the manifest's digest of the set is stale (the set changed after the collection)
  const stale = TMP + '/stale.jsonl'; writeFileSync(stale, lines.map(l => l + '\n').join('')); const m2 = JSON.parse(JSON.stringify(man)); m2.config.sets[0].input_sha256 = '0'.repeat(64); writeFileSync(stale + '.manifest.json', JSON.stringify(m2));
  assert.throws(() => loadRecords([stale]), /digest of collected_1 differs/);
  assert.equal(loadRecords([A]).records.length, 52);
});
test('training-text overlap: the numbers without the marked messages, and the comparison without them', () => {
  const mkr = (id, over, right) => { const r = rec(mkItem({ id, text: 'delete Moon', wires: [wire('delete Moon', 'command', { action: 'delete', target: 'Moon' })] }), [main(node('n1', 'command', { action: 'delete', target: right ? 'Moon' : 'Sun' }), [0, 11])]); if (over) r.train_text_overlap = true; return r; };
  const recs = [mkr('a', true, true), mkr('b', false, false), mkr('c', false, true), mkr('d', true, true)];
  const p = scorePart(recs, null, null, { engine: false }).part;
  assert.equal(p.train_text_overlap_messages, 2); assert.equal(p.views.gold.today.all_executed.right, 3);
  assert.equal(p.excluding_train_text_overlap.messages, 2); assert.equal(p.excluding_train_text_overlap.views.gold.today.all_executed.right, 1);
  const { sidecar } = scorePart(recs, null, null, { engine: false });
  assert.deepEqual(sidecar.overlap, [true, false, false, true]);
  const ids = ['a', 'b', 'c', 'd'], sc = { sets: { fresh2: { test: { use: 'evaluation' } } } }, side = (ov, right) => ({ ids, session: [null, null, null, null], group: [null, null, null, null], overlap: ov, tallies: { 'gold.today.all': { right, bad: [0, 0, 0, 0], G: [1, 1, 1, 1] } } });
  const c = compareSidecars({ 'fresh2/test': side([true, false, false, false], [1, 1, 1, 1]) }, { 'fresh2/test': side([false, false, false, true], [0, 0, 0, 0]) }, sc, sc)['fresh2/test'];
  assert.equal(c.train_text_overlap_messages, 2);   // a message either arm trained on is left out of both
  assert.equal(c.without_train_text_overlap.messages, 2); assert.equal(c.without_train_text_overlap.variants['gold.today.all'].a, 100);
});
test('either view: a request is judged against its own span\'s slot, never another span\'s', () => {
  const text = 'add a red circle. also a blue square';
  const item = mkItem({ id: 'e1', text, wires: [wire('add a red circle', 'command', { action: 'create', shape: 'circle', color: 'red' })],
    altWires: [wire('add a red circle', 'command', { action: 'create', shape: 'circle', color: 'red' }), wire('a blue square', 'command', { action: 'create', shape: 'square', color: 'blue' })] });
  // the reader reads the first span as a blue square: wrong against Opus, and the gpt-only blue-square slot is another span's
  const wrong = rec(item, [main(node('n1', 'command', { action: 'create', shape: 'square', color: 'blue' }), [0, 16])]);
  assert.equal(itemsOf([wrong], 'primary', 'today').items[0].o, 'wrong');
  assert.equal(itemsOf([wrong], 'either', 'today').items[0].o, 'wrong');
  // read at its own span, the gpt-only slot is filled
  const right = rec(item, [main(node('n1', 'command', { action: 'create', shape: 'circle', color: 'red' }), [0, 16]), main(node('n2', 'command', { action: 'create', shape: 'square', color: 'blue' }), [23, 36])]);
  assert.deepEqual(itemsOf([right], 'either', 'today').items.map(x => x.o), ['right', 'right']);
  // and a request at the gpt-only span that is not what gpt wrote is an extra, not a wrong
  const extra = rec(item, [main(node('n1', 'command', { action: 'create', shape: 'circle', color: 'red' }), [0, 16]), main(node('n2', 'command', { action: 'create', shape: 'star' }), [23, 36])]);
  assert.deepEqual(itemsOf([extra], 'either', 'today').items.map(x => x.o), ['right', 'extra']);
});

// ---------------------------------------------------------------- MODERNBERT_RECAL_PLAN.md S2: the sets short_synth and synth_short_t1
test('short_synth and synth_short_t1: counts, parts, order; the counts of the existing sets do not move', () => {
  assert.deepEqual(SET_ORDER, ['fresh2', 'short3', 'collected_1', 'scenes_test', 'nl_a', 'nl_b', 'short_synth', 'synth_short_t1']);   // appended after every existing set
  assert.deepEqual(PARTS.short_synth, ['calibration', 'test']); assert.deepEqual(PARTS.synth_short_t1, ['all']);
  assert.deepEqual(CALIBRATION_SETS, ['fresh2', 'short3', 'nl_a', 'short_synth']);   // t1 and nl_b are never in a fit
  const ss = loadSet('short_synth'), t1 = loadSet('synth_short_t1'), count = (s, p) => s.items.filter(i => i.part === p).length;
  assert.equal(ss.items.length, 1997); assert.deepEqual([count(ss, 'calibration'), count(ss, 'test')], [679, 1318]);
  for (const it of ss.items) assert.equal(it.part === 'calibration', isCalibration(it.id));   // the rule of fresh2 and short3: SHA256(id) % 3 == 0
  assert.ok(ss.items.every(i => i.id.startsWith('sr2-') && i.kind === 'short' && i.session == null && i.group == null));
  assert.equal(t1.items.length, 1793); assert.ok(t1.items.every(i => i.part === 'all' && i.id.startsWith('st1-') && i.kind === 'short' && i.wires.length === 1));
  // the fresh set shares no id (loadSets throws) and no text, up to case and spacing, with the set the confidence is fitted on
  const norm = t => t.toLowerCase().split(/\s+/).filter(Boolean).join(' '), seen = new Set(ss.items.map(i => norm(i.text)));
  assert.deepEqual(t1.items.filter(i => seen.has(norm(i.text))).map(i => i.id), []);
  loadSets(['fresh2', 'short3', 'nl_a', 'short_synth', 'synth_short_t1']);
  // the existing sets: counts as before
  const old = loadSets(['fresh2', 'short3']).flatMap(s => s.items);
  assert.deepEqual([old.length, old.filter(i => i.part === 'calibration').length, old.filter(i => i.part === 'test').length], [1113, 368, 745]);
  // a folder without a msg_NN.jsonl is an error, not an empty set
  assert.throws(() => loadSet('synth_short_t1', { root: TMP + '/no-such-root' }), /holds no msg_NN\.jsonl/);
});
test('the calibration records of the existing sets keep their positions (and so their folds) when short_synth records are added', () => {
  // calibrate_arm.mjs: fold = index in the pooled calibration list (records in SET_ORDER, then file order) % 5. The first 678 must be the same list.
  const mk = (it, reader) => ({ id: it.id, set: it.set, session: it.session, group: it.group, reader, produced: [] });
  const base = loadSets(['fresh2', 'short3', 'nl_a']).flatMap(s => s.items).map(it => mk(it, 'x')), extra = loadSet('short_synth').items.map(it => mk(it, 'x'));
  const write = (f, rs) => { writeFileSync(f, rs.map(r => JSON.stringify(r) + '\n').join('')); return f; };
  const A = write(TMP + '/ord-base.jsonl', base), B = write(TMP + '/ord-ss.jsonl', extra);
  const cal = recs => recs.filter(r => CALIBRATION_SETS.includes(r.set) && r.part === 'calibration').map(r => r.set + '/' + r.id);
  const without = cal(loadRecords([A], { verify: false }).records);
  assert.equal(without.length, 678);   // 368 of fresh2 + short3, 310 of nl_a
  for (const order of [[A, B], [B, A]]) {   // the order of the files given does not matter: SET_ORDER does
    const withSS = cal(loadRecords(order, { verify: false }).records);
    assert.equal(withSS.length, 678 + 679);
    assert.deepEqual(withSS.slice(0, 678), without);
    assert.ok(withSS.slice(678).every(x => x.startsWith('short_synth/')));
  }
});

rmSync(TMP, { recursive: true, force: true });
console.log(`${n} checks passed${process.exitCode ? ', some FAILED' : ''}`);
