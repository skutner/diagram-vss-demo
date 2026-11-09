// test_modernbert_forms_measure.mjs: the checks of modernbert_forms_measure.mjs (the forms campaign's diagnose / evaluate / applicability / verdict) and of the task runner's refusals.
//   node training/neural/parity/test_modernbert_forms_measure.mjs
// The false-pass probes of the plan come first in spirit: 1 right + 9 held = 10%; zero executions, null risk, a missing interval, an unsupported form cannot pass; an unknown message,
// a missing shard or sidecar, a wrong arm or seed is rejected; identical resume preserves, a changed identity refuses, nothing is overwritten; a whole-message extra costs;
// an executed empty label fails F3; a missing confirmation bundle cannot succeed; the seed-averaged interval is checked on a fixture. A missing cached file FAILS a test.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync, readdirSync, cpSync, statSync, rmSync, lstatSync } from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir, homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from './modernbert_forms_measure.mjs';
import * as N from './modernbert_next_measure.mjs';
import { pairedInterval, SEED, RESAMPLES, rng } from './compare_arms.mjs';
import { buildRecord, truthfulOutcomes } from './arm_lib.mjs';
import { truthfulPopulation, truthfulSidecar } from './score_arm.mjs';
import { foldOf } from './calibrate_arm.mjs';
import { table, NAMES } from '../calibrate_modernbert.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url)), REPO = resolve(HERE, '../../..'), TMP = mkdtempSync(tmpdir() + '/test-forms-measure-');
const CACHE = homedir() + '/.cache/diagram-vss-modernbert', OLD = CACHE + '/next-2026-11-08', RUNNER = CACHE + '/forms-2026-11-08/bin/train_arm.sh', MEASURE = HERE + 'modernbert_forms_measure.mjs';
process.on('exit', () => { try { if (TMP.startsWith(tmpdir() + '/test-forms-measure-')) rmSync(TMP, { recursive: true, force: true }); } catch {} });   // only the folder this run created
let n = 0;
const test = (name, fn) => { try { fn(); n++; console.log('ok   ' + name); } catch (e) { console.log('FAIL ' + name + '\n' + (e.stack || e)); process.exitCode = 1; } };
const atest = async (name, fn) => { try { await fn(); n++; console.log('ok   ' + name); } catch (e) { console.log('FAIL ' + name + '\n' + (e.stack || e)); process.exitCode = 1; } };
const sha256Of = b => createHash('sha256').update(b).digest('hex');
const hashF = p => sha256Of(readFileSync(p));
// every file these tests write is inside this run's temp folder: anything else throws (a registered path of the real campaign must never be written)
const inTmp = p => { const r = resolve(p); if (!r.startsWith(TMP + '/')) throw new Error(`test bug: refusing to write outside the temp folder: ${r}`); return r; };
const wj = (p, o) => { inTmp(p); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 1) + '\n'); };
const J = p => JSON.parse(readFileSync(p, 'utf8'));

// ---------------------------------------------------------------- a synthetic forms protocol folder (with SHA256SUMS), and the real parent
let pk = 0;
const mkProtocol = (over = {}) => {
  const dir = TMP + '/proto' + ++pk; mkdirSync(dir, { recursive: true });
  const P = { campaign: { id: 'forms-test' }, membership: { F: { sha256: sha256Of('F-members') } }, ...over };
  wj(dir + '/protocol.json', P);
  writeFileSync(dir + '/SHA256SUMS', `${hashF(dir + '/protocol.json')}  protocol.json\n`);
  return dir + '/protocol.json';
};
const FP = M.loadFormsProtocol(mkProtocol());

// ---------------------------------------------------------------- the fixed numbers and the protocol
test('rules: the plan numbers equal the parent\'s frozen constants (protocol-v2 + addendum); a changed parent number refuses', () => {
  const PR = M.parentProtocol(FP);
  assert.equal(PR.rules.guard.cost_diff_min, -5); assert.equal(PR.rules.form_bars.description_size, 0.8);
  for (const [path, v] of [['guard.cost_diff_min', -4], ['form_bars.bare_move', 0.9], ['undo_redo_count_min', 0.8], ['label_setting_max_drop_points', 3], ['S_vs_R.t1_clean_cost_min_gain', 4]]) {
    const rules = JSON.parse(JSON.stringify(PR.rules)); const ks = path.split('.'); let o = rules; for (const k of ks.slice(0, -1)) o = o[k]; o[ks.at(-1)] = v;
    assert.throws(() => M.assertRulesMatch(rules), new RegExp(path.replace('.', '\\.')));
  }
  const missing = JSON.parse(JSON.stringify(PR.rules)); delete missing.label_setting_max_drop_points;
  assert.throws(() => M.assertRulesMatch(missing), /label_setting_max_drop_points/);
});
test('forms protocol: needs SHA256SUMS, a campaign id and an F membership hash; refuses a changed file, a foreign plan or parent hash and a changed parent file', () => {
  assert.equal(FP.campaign, 'forms-test'); assert.equal(FP.plan.sha256, hashF(M.PLAN_FILE));
  const p1 = mkProtocol(); writeFileSync(p1, readFileSync(p1, 'utf8') + ' '); assert.throws(() => M.loadFormsProtocol(p1), /differs from SHA256SUMS/);
  const p2 = mkProtocol(); writeFileSync(dirname(p2) + '/SHA256SUMS', ''); assert.throws(() => M.loadFormsProtocol(p2), /does not list protocol.json/);
  const p3 = mkProtocol(); assert.throws(() => M.loadFormsProtocol(p3.replace('protocol.json', 'nope.json')), /no forms protocol/);
  assert.throws(() => M.loadFormsProtocol(mkProtocol({ campaign: undefined })), /no campaign id/);
  assert.throws(() => M.loadFormsProtocol(mkProtocol({ membership: {} })), /no F membership/);
  assert.throws(() => M.loadFormsProtocol(mkProtocol({ plan: { sha256: 'a'.repeat(64) } })), /names plan/);
  assert.throws(() => M.loadFormsProtocol(mkProtocol({ parent: { protocol: { sha256: 'b'.repeat(64) } } })), /names parent protocol/);
  const bad = { ...M.PARENT, protocol_sha256: 'c'.repeat(64) };
  assert.throws(() => M.loadFormsProtocol(mkProtocol(), { parent: bad }), /differs from the campaign's frozen hash/);
  assert.equal(M.loadFormsProtocol(mkProtocol({ plan: { sha256: hashF(M.PLAN_FILE) } })).campaign, 'forms-test');
});

// ---------------------------------------------------------------- fixtures: records scored by the parent's scorer (the denominators)
const wire = (span, type, args) => ({ span, trigger: span.split(' ')[0], type, args });
const node = (id, type, args) => ({ id, type, args });
let gk = 0;
const mkItem = (o = {}) => { const id = o.id ?? 'x' + ++gk; return { id, set: 'viewx', part: 'test', kind: 'short', writer: null, session: null, group: null, setup: null, names: ['Moon', 'Sun'], groups: {}, text: 'x', wires: [], altWires: null, unreliable: false, source: 't', group_key: 'G' + id, fold: foldOf('G' + id), roles: [], meta: null, origin_id: null, ...o }; };
const main = (nd, span, f = null, extra = {}) => ({ node: nd, mentions: [], span, src: '', f, act: f ? 'create' : null, truncated: false, wireId: nd.id, dependencies: [], ...extra });
const rec = (item, mains) => { const r = buildRecord(item, { reader: 'modernbert', mains, allNodes: mains.map(m => m.node) }, { seen: () => true, artifactsKey: 'a' }); r.artifacts_sha256 = 'a'; return r; };
const F = (v, i = 0) => Object.fromEntries(NAMES.map(([k], j) => [k, v - (i + j) * 1e-4]));
const SPEC = { reader: 'modernbert', intercept: 0, features: [{ name: 'act_p', weight: 6 }], tables: { act_p: table([0.05, 0.9], 1) }, act_prior: {}, act_prior_default: .5, levels_out_of_fold: { cost: { threshold: 0.9, score: 0, executed: 0 } }, arm: { cal_sets: ['calibration'] }, artifacts: 'a' };
const THR = 0.9, fHi = () => ({ ...F(.95), act_p: 0.9 }), fLo = () => ({ ...F(.2), act_p: 0.05 });
const gold = (span, args) => wire(span, 'command', args);
const del = (id, span, tgt, f, extra = {}) => main(node(id, 'command', { action: 'delete', target: tgt }), span, f, extra);
const tenGold = () => Array.from({ length: 10 }, (_, i) => gold(`delete ${'ABCDEFGHIJ'[i]}1`, { action: 'delete', target: 'ABCDEFGHIJ'[i] + '1' }));
const onePlusNine = () => {
  const ws = tenGold(), text = ws.map(w => w.span).join('. '), spans = []; let at = 0;
  for (const w of ws) { const s = text.indexOf(w.span, at); spans.push([s, s + w.span.length]); at = s + w.span.length; }
  return rec(mkItem({ text, names: ws.map(w => w.args.target), wires: ws }), ws.map((w, i) => del('n' + i, spans[i], w.args.target, fHi(), i === 0 ? {} : { blocked: true, block_reasons: [{ kind: 'text-state', key: 'label', source_span: w.span }] })));
};

// ---------------------------------------------------------------- synthetic bundles: 30 messages, one frozen group each, every population and sidecar the verdict reads
const NMSG = 30, FORM_NAMES = Object.keys(M.FORMS_RULES.form_bars);
const GUARD = [['fresh2_test', 'test'], ['short3_test', 'test'], ['nl_a_development', 'development']];
const side = (right, bad, G = 2) => { const g = Array(NMSG).fill(G), r = Array(NMSG).fill(right), b = Array(NMSG).fill(bad); return { ids: Array.from({ length: NMSG }, (_, i) => 'm' + i), session: Array(NMSG).fill(null), group: Array.from({ length: NMSG }, (_, i) => 'g' + i), overlap: Array(NMSG).fill(false), tallies: { 'gold.truthful_v1.gate': { right: r, bad: b, G: g }, 'gold.truthful_v1.all': { right: r, bad: b, G: g } } }; };
const popStat = ({ share = 0.95, executed = 50, risk = 0.01, per100 = 0.5, requested = 100 } = {}) => ({ available: true, requested, groups: 40, ungated: { right_share: share, right: Math.round(share * requested), structural_holds: { total: 0 }, unread: 0 }, gated: { executed, risk, risk_wilson95: [0, 0.1], wrong_plus_extras_per_100_requested: per100 } });
/** o: {t1: [right, bad] per message on t1_clean / create; guard: [right, bad]; share: form right share; ...overrides of the score object} */
const mkBundle = (name, o = {}) => {
  const t1 = o.t1 ?? [1, 0], guard = o.guard ?? [1, 0], sidecar = {}, populations = {}, sets = {}, support = {};
  for (const [v, p] of GUARD) { sidecar[`${v}/${p}`] = side(...guard); sets[v] = { [p]: { use: 'evaluation', available: true, requested: 60, gated: { executed: 40, cost_score: 0, requested: 60, wrong_plus_extras_per_100_requested: o.guardPer100 ?? 1 } } }; }
  sidecar['t1_all/all#t1_clean'] = side(...t1); sidecar['t1_all/all#t1_clean_create'] = side(...(o.create ?? t1));
  populations.t1_clean = popStat({ executed: 80, risk: o.risk ?? 0.02, ...(o.t1pop ?? {}) }); populations.t1_clean_create = popStat();
  for (const f of FORM_NAMES) populations['t1_clean_' + f] = popStat({ share: o.share ?? 0.97 });
  populations.t1_clean_label_setting = popStat({ share: o.labelShare ?? 0.9 }); populations.t1_all_undo_redo_count = popStat({ share: o.undo ?? 0.95 });
  populations.lowercase_other_affected = popStat({ share: o.lcShare ?? 0.8, per100: o.lcPer100 ?? 1 }); populations.short3_lowercase = popStat({ share: o.s3Share ?? 0.6, per100: o.s3Per100 ?? 1 });
  for (const k of ['t1_clean', 't1_clean_create', ...FORM_NAMES.map(f => 't1_clean_' + f), 'lowercase_other_affected']) support[k] = { requests_min: 20, groups_min: 10, supported: true };
  const score = { sets, populations, population_support: support, exposure: { t1_all_undo_redo_count: { requests: 28, span_equals_a_training_request: 3 } }, label_errors: { gated_empty_label_on_nonempty_gold: 0, ungated_empty_label_on_nonempty_gold: 0, gated_by_reason: {}, ungated_by_reason: {}, executed_without_raw_arguments: 0 }, ...(o.score ?? {}) };
  return { name, score, sidecar, identity: null };
};
const GOOD = () => ({ B: mkBundle('B-s0'), C: mkBundle('C100-s0'), Fb: mkBundle('F-s0', { t1: [2, 0], create: [2, 0], risk: 0.01 }) });
const RULES = M.FORMS_RULES;
const statusOf = (row, includes) => row.checks.find(c => c.name.includes(includes));

// ---------------------------------------------------------------- false-pass probes of the rows
test('F2 boundary: 1 right + 9 held (blocked) gold requests score 10% and fail the 90% bar; the denominator is all gold', () => {
  const r = onePlusNine(), p = truthfulPopulation([r], SPEC, THR, null);
  assert.equal(p.ungated.requested, 10); assert.equal(p.ungated.right, 1); assert.equal(p.ungated.right_share, 0.1); assert.equal(p.ungated.structural_holds.total, 9);
  const { tallies, ...stats } = truthfulPopulation([r], SPEC, THR, { name: 'p', view: 'viewx', part: null, requests: new Map([[r.id, new Set(r.goldSpans.map((_, i) => i))]]) });
  const g = GOOD(); g.Fb.score.populations.t1_clean_outline_set = { ...stats, available: true };
  const row = M.rowF2(RULES, g.Fb, null), c = statusOf(row, 'outline_set');
  assert.equal(c.value, 0.1); assert.equal(c.status, 'fail'); assert.equal(row.pass, false);
  const ok = M.rowF2(RULES, GOOD().Fb, null); assert.equal(ok.checks.find(x => x.name.includes('outline_set')).status, 'pass'); assert.equal(ok.pass, true);
  // the frozen bars are the plan's: 90/90/90/90/80/95 and undo/redo 90
  const bars = Object.fromEntries(M.rowF2(RULES, GOOD().Fb, null).checks.filter(c => /ungated right share >=/.test(c.name) && !c.name.startsWith('undo')).map(c => [c.name.split(' ')[0], +c.name.split('>= ')[1]]));
  assert.deepEqual(bars, { outline_question: 0.9, outline_create: 0.9, outline_set: 0.9, label_removal: 0.9, description_size: 0.8, bare_move: 0.95 });
  const g2 = GOOD(); g2.Fb.score.populations.t1_clean_description_size = popStat({ share: 0.79 }); assert.equal(M.rowF2(RULES, g2.Fb, null).pass, false);
  const g3 = GOOD(); g3.Fb.score.populations.t1_clean_bare_move = popStat({ share: 0.94 }); assert.equal(M.rowF2(RULES, g3.Fb, null).pass, false);
  const g4 = GOOD(); g4.Fb.score.populations.t1_all_undo_redo_count = popStat({ share: 0.89 }); assert.equal(M.rowF2(RULES, g4.Fb, null).pass, false);
});
test('F1 passes only with a >= 5 point gain, a positive interval, executions in both arms, no more confidently wrong share, supported populations and a create interval above zero', () => {
  const g = GOOD(), row = M.rowF1(RULES, g.Fb, g.B);
  assert.equal(row.pass, true, JSON.stringify(row.checks.filter(c => !c.ok)));
  assert.ok(statusOf(row, 'gated cost difference').value >= 5);
  const small = GOOD(); small.Fb = mkBundle('F-s0', { t1: [1, 0] });                                        // no gain at all
  assert.equal(M.rowF1(RULES, small.Fb, small.B).pass, false);
  const four = GOOD(); four.B = mkBundle('B-s0', { t1: [1.9, 0] }); four.Fb = mkBundle('F-s0', { t1: [2, 0] });   // +5 exactly = 100*(0.1)/2 -> 5.0: passes the >= 5 bar
  assert.equal(statusOf(M.rowF1(RULES, four.Fb, four.B), 'gated cost difference').value, 5);
  const less = GOOD(); less.B = mkBundle('B-s0', { t1: [1.92, 0] }); assert.equal(statusOf(M.rowF1(RULES, less.Fb, less.B), 'gated cost difference').value, 4); assert.equal(statusOf(M.rowF1(RULES, less.Fb, less.B), 'gated cost difference').status, 'fail');   // +4 points < 5
  const under = GOOD(); under.B = mkBundle('B-s0', { t1: [1.92, 0] }); under.Fb = mkBundle('F-s0', { t1: [1.96, 0] });   // +2 points
  assert.equal(statusOf(M.rowF1(RULES, under.Fb, under.B), 'gated cost difference').status, 'fail');
  const risk = GOOD(); risk.Fb.score.populations.t1_clean.gated.risk = 0.03; assert.equal(statusOf(M.rowF1(RULES, risk.Fb, risk.B), 'confidently wrong share').status, 'fail');
  const zero = GOOD(); zero.Fb.score.populations.t1_clean.gated.executed = 0; assert.equal(M.rowF1(RULES, zero.Fb, zero.B).pass, false); assert.equal(statusOf(M.rowF1(RULES, zero.Fb, zero.B), 'F-s0 executes something').status, 'fail');
  const zeroB = GOOD(); zeroB.B.score.populations.t1_clean.gated.executed = 0; assert.equal(M.rowF1(RULES, zeroB.Fb, zeroB.B).pass, false);
  const nullRisk = GOOD(); nullRisk.Fb.score.populations.t1_clean.gated.risk = null; const rn = M.rowF1(RULES, nullRisk.Fb, nullRisk.B); assert.equal(statusOf(rn, 'confidently wrong share').status, 'unavailable'); assert.equal(rn.pass, false);
  const unsup = GOOD(); unsup.Fb.score.population_support.t1_clean = { supported: false }; assert.equal(M.rowF1(RULES, unsup.Fb, unsup.B).pass, false);
  const nosup = GOOD(); delete nosup.Fb.score.population_support.t1_clean; assert.equal(M.rowF1(RULES, nosup.Fb, nosup.B).pass, false);
  const unavail = GOOD(); unavail.Fb.score.populations.t1_clean.available = false; const ru = M.rowF1(RULES, unavail.Fb, unavail.B); assert.equal(ru.pass, false); assert.equal(statusOf(ru, 'paired interval').value, null);
  const createFail = GOOD(); createFail.Fb = mkBundle('F-s0', { t1: [2, 0], create: [1, 0] }); const rc = M.rowF1(RULES, createFail.Fb, createFail.B); assert.equal(rc.pass, false); assert.equal(statusOf(rc, 'clean create').status, 'fail');
});
test('F1 interval and F2 support: a gain >= 5 whose paired interval reaches zero fails; an unsupported or rule-less form population fails F2; a lowercase population without a manifest rule fails F3', () => {
  const g = GOOD(), noisy = (name, f) => { const b = mkBundle(name); const sc = b.sidecar['t1_all/all#t1_clean']; const r = Array.from({ length: NMSG }, (_, i) => f(i)); sc.tallies['gold.truthful_v1.gate'] = { ...sc.tallies['gold.truthful_v1.gate'], right: r }; sc.tallies['gold.truthful_v1.all'] = sc.tallies['gold.truthful_v1.gate']; return b; };
  const F = noisy('F-s0', i => (i % 2 ? 2 : 0.2)), B = noisy('B-s0', i => 1); F.sidecar['t1_all/all#t1_clean_create'] = side(2, 0); B.sidecar['t1_all/all#t1_clean_create'] = side(1, 0);
  const row = M.rowF1(RULES, F, B);   // mean gain 5 points, huge spread
  assert.ok(statusOf(row, 'gated cost difference').status === 'pass' && statusOf(row, 'paired interval').value <= 0, JSON.stringify(statusOf(row, 'paired interval'))); assert.equal(row.checks.filter(c => c.status !== 'pass').map(c => c.name).join(), 't1_clean paired interval lower end > 0'); assert.equal(row.pass, false);
  const u = GOOD(); u.Fb.score.population_support.t1_clean_outline_set = { supported: false }; assert.equal(M.rowF2(RULES, u.Fb, null).pass, false);
  const d = GOOD(); delete d.Fb.score.population_support.t1_clean_outline_set; assert.equal(M.rowF2(RULES, d.Fb, null).pass, false);
  const lc = GOOD(); delete lc.Fb.score.population_support.lowercase_other_affected; assert.equal(M.rowF3(RULES, lc.Fb, lc.B, lc.C).pass, false);
  void g;
});
test('a missing interval (fewer than 10 frozen groups) cannot pass; a missing sidecar is unavailable, never a pass', () => {
  const g = GOOD(); for (const b of [g.Fb, g.B]) { const s = b.sidecar['t1_all/all#t1_clean']; for (const k of ['ids', 'session', 'group', 'overlap']) s[k] = s[k].slice(0, 5); for (const t of Object.values(s.tallies)) for (const k of ['right', 'bad', 'G']) t[k] = t[k].slice(0, 5); }
  const row = M.rowF1(RULES, g.Fb, g.B), c = statusOf(row, 'paired interval');
  assert.equal(c.value, null); assert.equal(c.status, 'unavailable'); assert.equal(row.pass, false); assert.match(c.ci95_reason, /too few units/);
  const g2 = GOOD(); delete g2.Fb.sidecar['t1_all/all#t1_clean']; const r2 = M.rowF1(RULES, g2.Fb, g2.B); assert.equal(r2.pass, false); assert.notEqual(statusOf(r2, 'gated cost difference').status, 'pass');
});
test('F3: Guard G against B AND C100, label setting, empty-label safety and each lowercase population', () => {
  const g = GOOD(), row = M.rowF3(RULES, g.Fb, g.B, g.C);
  assert.equal(row.pass, true, JSON.stringify(row.checks.filter(c => !c.ok)));
  assert.equal(row.checks.filter(c => c.name.startsWith('G F-s0 vs B-s0')).length, 9); assert.equal(row.checks.filter(c => c.name.startsWith('G F-s0 vs C100-s0')).length, 9);
  const vsB = GOOD(); vsB.Fb = mkBundle('F-s0', { guard: [1, 0], guardPer100: 3 }); assert.equal(M.rowF3(RULES, vsB.Fb, vsB.B, vsB.C).pass, false);       // +2 wrong/extras per 100
  const cost = GOOD(); cost.Fb = mkBundle('F-s0', { guard: [0.8, 0] }); assert.equal(M.rowF3(RULES, cost.Fb, cost.B, cost.C).pass, false);               // -10 points
  const label = GOOD(); label.Fb.score.populations.t1_clean_label_setting = popStat({ share: 0.87 }); assert.equal(statusOf(M.rowF3(RULES, label.Fb, label.B, label.C), 'label-setting').status, 'fail');   // 3 points
  const label2 = GOOD(); label2.Fb.score.populations.t1_clean_label_setting = popStat({ share: 0.88 }); assert.equal(statusOf(M.rowF3(RULES, label2.Fb, label2.B, label2.C), 'label-setting').status, 'pass');
  const lc = GOOD(); lc.Fb.score.populations.lowercase_other_affected = popStat({ share: 0.77 }); assert.equal(M.rowF3(RULES, lc.Fb, lc.B, lc.C).pass, false);
  const lc2 = GOOD(); lc2.Fb.score.populations.short3_lowercase = popStat({ share: 0.6, per100: 2.5 }); assert.equal(M.rowF3(RULES, lc2.Fb, lc2.B, lc2.C).pass, false);    // +1.5 confident mistakes /100
  const lcOk = GOOD(); lcOk.Fb.score.populations.lowercase_other_affected = popStat({ share: 0.78, per100: 2 }); assert.equal(M.rowF3(RULES, lcOk.Fb, lcOk.B, lcOk.C).pass, true);
  const lcUnsup = GOOD(); lcUnsup.Fb.score.population_support.lowercase_other_affected = { supported: false }; assert.equal(M.rowF3(RULES, lcUnsup.Fb, lcUnsup.B, lcUnsup.C).pass, false);
  const s3gone = GOOD(); delete s3gone.Fb.score.populations.short3_lowercase; assert.equal(M.rowF3(RULES, s3gone.Fb, s3gone.B, s3gone.C).pass, false);
  const noraw = GOOD(); noraw.Fb.score.label_errors.executed_without_raw_arguments = 2; assert.equal(M.rowF3(RULES, noraw.Fb, noraw.B, noraw.C).pass, false);
  const nolabel = GOOD(); delete nolabel.Fb.score.label_errors; assert.equal(M.rowF3(RULES, nolabel.Fb, nolabel.B, nolabel.C).pass, false);
});
test('F3: one executed empty label against a nonempty gold label (from the raw arguments) fails label safety even though the pairing gives no reason', () => {
  const g = gold('label Moon Foo', { action: 'label', target: 'Moon', label: 'Foo' });
  const empty = rec(mkItem({ text: 'label Moon Foo', wires: [g] }), [main(node('n1', 'command', { action: 'label', target: 'Moon', label: '' }), [0, 14], fHi())]);
  assert.equal(empty.produced[0].o, 'wrong'); assert.deepEqual(truthfulOutcomes(empty)[0].reasons, []);
  const le = N.labelErrors([empty], SPEC); assert.equal(le.gated_empty_label_on_nonempty_gold, 1);
  const bad = GOOD(); bad.Fb.score.label_errors = le;
  const row = M.rowF3(RULES, bad.Fb, bad.B, bad.C); assert.equal(row.pass, false); assert.equal(statusOf(row, 'empty-label').status, 'fail'); assert.equal(statusOf(row, 'empty-label').value, 1);
  const right = rec(mkItem({ text: 'label Moon Foo', wires: [g] }), [main(node('n1', 'command', { action: 'label', target: 'Moon', label: 'Foo' }), [0, 14], fHi())]);
  const ok = GOOD(); ok.Fb.score.label_errors = N.labelErrors([right], SPEC); assert.equal(M.rowF3(RULES, ok.Fb, ok.B, ok.C).pass, true);
});
const wholeFixture = extraAt => {
  const recs = [];
  for (let i = 0; i < 12; i++) {
    const w = gold(`delete T${i}`, { action: 'delete', target: 'T' + i }), mains = [del('n' + i, [0, w.span.length], 'T' + i, fHi())];
    if (i === extraAt) mains.push(main(node('x' + i, 'command', { action: 'move', target: 'T' + i }), [20, 30], fHi()));
    recs.push(rec(mkItem({ id: 'w' + i, text: `delete T${i} and also if you can`, names: ['T' + i], wires: [w] }), mains));
  }
  return recs;
};
test('an unrelated extra in a whole-message population changes the cost and the risk (parent scorer) and the F1 comparison reads it', () => {
  const pop = recs => ({ name: 't1_clean', view: 'viewx', part: 'test', requests: new Map(recs.map(r => [r.id, new Set(r.goldSpans.map((_, i) => i))])) });
  const mk = (name, recs) => { const { tallies, ...stats } = truthfulPopulation(recs, SPEC, THR, pop(recs)); const b = mkBundle(name, { t1: [1, 0] }); b.score.populations.t1_clean = { ...stats, available: true }; b.sidecar['t1_all/all#t1_clean'] = truthfulSidecar(recs, tallies); b.sidecar['t1_all/all#t1_clean_create'] = b.sidecar['t1_all/all#t1_clean']; b.score.populations.t1_clean_create = b.score.populations.t1_clean; return { b, stats }; };
  const A = mk('F-s0', wholeFixture(-1)), B = mk('B-s0', wholeFixture(3));
  assert.equal(A.stats.gated.cost_score, 100); assert.equal(B.stats.gated.extras, 1); assert.equal(B.stats.gated.cost_score, Math.round(100 * (12 - 10) / 12 * 1e6) / 1e6); assert.equal(B.stats.gated.risk, Math.round(1 / 13 * 1e6) / 1e6);
  const base = GOOD(), cmp = M.pairedPop(A.b, B.b, 't1_all/all#t1_clean', 't1_clean'); assert.ok(cmp.difference > 80);
  const row = M.rowF1(RULES, A.b, B.b); assert.ok(statusOf(row, 'gated cost difference').value > 80); assert.equal(statusOf(row, 'confidently wrong share').status, 'pass'); void base;
});
test('evidence: the parent\'s schema, another subject, a changed evidence file and a missing entry are never a pass', () => {
  const ef = (id, over = {}) => { const f = TMP + `/ev-${id}-${Math.random()}.txt`; writeFileSync(f, 'evidence ' + id); return { status: 'pass', command: 'node x', evidence: f, sha256: hashF(f), ...over }; };
  const L = { name: 'F-s0', artifacts_sha256: 'A'.repeat(64) };
  const good = { schema: M.EVIDENCE_SCHEMA, subject: { arm: 'F', seed: 0, artifacts_sha256: 'A'.repeat(64) }, results: Object.fromEntries(['9', '10', '11', '12', '13', '14', '19'].map(i => [i, ef(i)])) };
  assert.equal(M.contractRow(L, good).status, 'pass'); assert.equal(M.oracleRow(L, good).status, 'pass');
  assert.equal(M.contractRow(L, null).status, 'unavailable');
  assert.equal(M.contractRow(L, { ...good, schema: 'modernbert-next-evidence-v1' }).status, 'unavailable');
  assert.equal(M.contractRow(L, { ...good, subject: { ...good.subject, seed: 1 } }).status, 'fail');
  assert.equal(M.contractRow(L, { ...good, subject: { ...good.subject, artifacts_sha256: 'B'.repeat(64) } }).status, 'fail');
  assert.equal(M.contractRow(L, { ...good, subject: { ...good.subject, arm: 'B' } }).status, 'fail');
  const missing = { ...good, results: { ...good.results } }; delete missing.results['12']; assert.notEqual(M.contractRow(L, missing).status, 'pass');
  const failing = { ...good, results: { ...good.results, 13: ef('13', { status: 'fail' }) } }; assert.equal(M.contractRow(L, failing).status, 'fail');
  const changed = { ...good, results: { ...good.results, 9: { ...good.results['9'], sha256: '0'.repeat(64) } } }; assert.equal(M.contractRow(L, changed).status, 'fail');
  const noOracle = { ...good, results: { ...good.results } }; delete noOracle.results['19']; assert.notEqual(M.oracleRow(L, noOracle).status, 'pass');
  // the parent's own evidence file (ids bound to the parent arms, schema modernbert-next-evidence-v1) never satisfies a forms arm
  assert.notEqual(M.oracleRow(L, J(OLD + '/contract-evidence/contract-evidence.json')).status, 'pass');
});

// ---------------------------------------------------------------- the seed-averaged interval
test('seed-averaged interval: equals the single-seed paired interval when the seeds are identical, refuses other messages / groups / denominators / too few groups, and moves with the data', () => {
  // per-message variation so the interval has width: right varies by message
  const vary = (base, f) => { const s = side(0, 0); s.tallies['gold.truthful_v1.gate'].right = Array.from({ length: NMSG }, (_, i) => f(i)); s.tallies['gold.truthful_v1.all'] = s.tallies['gold.truthful_v1.gate']; return s; };
  const Fm = i => (i % 4 === 0 ? 2 : 1), Bm = i => (i % 3 === 0 ? 1 : 0.5);
  const mkb = (f, name) => ({ name, sidecar: { 't1_all/all#t1_clean': vary(0, f) } });
  const F0 = mkb(Fm, 'F0'), B0 = mkb(Bm, 'B0'), F1 = mkb(Fm, 'F1'), B1 = mkb(Bm, 'B1');
  const r = M.seedAveraged(F0, B0, F1, B1);
  const t = b => b.sidecar['t1_all/all#t1_clean'].tallies['gold.truthful_v1.gate'];
  const units = F0.sidecar['t1_all/all#t1_clean'].ids.map((_, i) => [i]), single = pairedInterval(units, t(F0).G, t(F0), t(B0), RESAMPLES, SEED);
  assert.ok(Math.abs(r.ci95[0] - single[0]) < 1e-9 && Math.abs(r.ci95[1] - single[1]) < 1e-9, JSON.stringify([r.ci95, single])); assert.equal(r.groups, NMSG); assert.ok(r.ci95[0] > 0 && r.ci95[1] > r.ci95[0]);
  // different seeds averaged inside each resample: the mean of the two single-seed resampled differences
  const Fb = mkb(() => 2, 'F1b'), B1b = mkb(() => 0, 'B1b'), r2 = M.seedAveraged(F0, B0, Fb, B1b);
  const expected = [], next = rng(SEED), cost = (rr, G) => 100 * rr / G, rv = [F0, B0, Fb, B1b].map(b => t(b).right);
  for (let k = 0; k < RESAMPLES; k++) { let G = 0; const acc = [0, 0, 0, 0]; for (let i = 0; i < NMSG; i++) { const u = Math.floor(next() * NMSG); G += 2; rv.forEach((v, j) => { acc[j] += v[u]; }); } expected.push(((cost(acc[0], G) - cost(acc[1], G)) + (cost(acc[2], G) - cost(acc[3], G))) / 2); }
  expected.sort((x, y) => x - y);
  const want = [expected[Math.floor(.025 * RESAMPLES)], expected[Math.ceil(.975 * RESAMPLES) - 1]];
  assert.ok(Math.abs(r2.ci95[0] - want[0]) < 1e-9 && Math.abs(r2.ci95[1] - want[1]) < 1e-9, JSON.stringify([r2.ci95, want]));   // an independent resampling; float summation order may differ in the last digit
  assert.equal(r2.resamples, RESAMPLES); assert.equal(r2.seed, 20261105);
  // refusals
  const other = mkb(Fm, 'o'); other.sidecar['t1_all/all#t1_clean'].ids[3] = 'zzz'; assert.match(M.seedAveraged(F0, B0, other, B1).error, /other messages/);
  const grp = mkb(Fm, 'g'); grp.sidecar['t1_all/all#t1_clean'].group[3] = 'zzz'; assert.match(M.seedAveraged(F0, B0, grp, B1).error, /other frozen groups/);
  const gg = mkb(Fm, 'G'); gg.sidecar['t1_all/all#t1_clean'].tallies['gold.truthful_v1.gate'].G[0] = 3; assert.match(M.seedAveraged(F0, B0, gg, B1).error, /other requested/);
  const few = b => { const s = b.sidecar['t1_all/all#t1_clean']; const cut = x => x.slice(0, 5); const c = { ...s, ids: cut(s.ids), group: cut(s.group), tallies: Object.fromEntries(Object.entries(s.tallies).map(([k, v]) => [k, { right: cut(v.right), bad: cut(v.bad), G: cut(v.G) }])) }; return { name: b.name, sidecar: { 't1_all/all#t1_clean': c } }; };
  assert.match(M.seedAveraged(few(F0), few(B0), few(F1), few(B1)).error, /fewer than 10 groups/);
  assert.match(M.seedAveraged({ name: 'n', sidecar: {} }, B0, F1, B1).error, /no per-message data/);
  const nogate = mkb(Fm, 'ng'); delete nogate.sidecar['t1_all/all#t1_clean'].tallies['gold.truthful_v1.gate']; assert.match(M.seedAveraged(nogate, B0, F1, B1).error, /no gated tallies/);
});
test('F4: positive in each seed and a seed-averaged interval above zero; a negative second seed, a zero second seed or an interval through zero fails', () => {
  const g = GOOD(), s1 = { B1: mkBundle('B-s1'), F1: mkBundle('F-s1', { t1: [2, 0] }) };
  assert.equal(M.rowF4(RULES, g.Fb, g.B, s1.F1, s1.B1).pass, true);
  const neg = { B1: mkBundle('B-s1'), F1: mkBundle('F-s1', { t1: [0.5, 0] }) }; const rn = M.rowF4(RULES, g.Fb, g.B, neg.F1, neg.B1); assert.equal(rn.pass, false); assert.equal(statusOf(rn, 'seed 1').status, 'fail');
  const zero = { B1: mkBundle('B-s1'), F1: mkBundle('F-s1', { t1: [1, 0] }) }; assert.equal(M.rowF4(RULES, g.Fb, g.B, zero.F1, zero.B1).pass, false);
  // seed 0 positive, seed 1 slightly positive but noisy: per-message variation makes the averaged interval cross zero
  const noisy = (name, f) => { const b = mkBundle(name); const s = b.sidecar['t1_all/all#t1_clean']; const r = Array.from({ length: NMSG }, (_, i) => f(i)); s.tallies['gold.truthful_v1.gate'] = { ...s.tallies['gold.truthful_v1.gate'], right: r }; s.tallies['gold.truthful_v1.all'] = s.tallies['gold.truthful_v1.gate']; return b; };
  const wide = M.rowF4(RULES, noisy('F-s0', i => (i % 2 ? 2 : 0)), noisy('B-s0', i => 1), noisy('F-s1', i => (i % 2 ? 2 : 0.9)), noisy('B-s1', i => 1));
  assert.equal(statusOf(wide, 'seed-averaged').status, 'fail'); assert.equal(wide.pass, false);
});

// ---------------------------------------------------------------- training records (P4) and the reference recipe
let tk = 0;
/** a training folder + export receipt like a finished arm: copy of the reference complete.json with the seed and the data hash of the fixture */
const mkTraining = (name, over = {}) => {
  const [arm, seed] = M.ARMS[name], root = TMP + '/train' + ++tk, ref = J(M.REFERENCE_RECIPE_FILE), data = root + '/data', model = root + '/model';
  mkdirSync(data, { recursive: true }); mkdirSync(model, { recursive: true });
  const rows = 12; writeFileSync(data + '/train.jsonl', Array.from({ length: rows }, (_, i) => JSON.stringify({ i })).join('\n') + '\n');
  const c = JSON.parse(JSON.stringify(ref)); c.metadata.settings.seed = seed; c.metadata.data.files['train.jsonl'] = hashF(data + '/train.jsonl'); c.metadata.data.requests = rows; c.metadata.data.messages = 5;
  for (const [k, v] of Object.entries(over.complete ?? {})) c[k] = v;
  if (over.settings) Object.assign(c.metadata.settings, over.settings);
  wj(root + '/run/complete.json', c);
  const receipt = { passed: false, weights: { sha256: 'w', epoch: c.state.epoch, update: c.state.update, total: c.state.total, full_schedule: true, max_updates: 0, source_changes_since_training: [] }, source_changes_since_training: [], contract: { output_contract: 'diagram-reader-v2', protocol: { sha256: M.PARENT.protocol_sha256 } }, ...(over.receipt ?? {}) };
  wj(model + '/arm_receipt.json', receipt);
  return { dir: root, loaded: { name, identity: { model: { dir: model }, train_data: { dir: data } }, train_sha256: hashF(data + '/train.jsonl') } };
};
test('P4: complete, full schedule, seed, recipe equal to the reference (minus seed), data hash, requests, updates and export receipt are all checked; any miss fails', () => {
  const ok = mkTraining('F-s0'), cs = M.trainingChecks(ok.loaded, ok.dir);
  assert.ok(cs.length >= 12); assert.deepEqual(cs.filter(c => c.status !== 'pass'), []);
  const fails = (over, what) => { const t = mkTraining('F-s0', over), r = M.trainingChecks(t.loaded, t.dir); assert.ok(r.some(c => c.status !== 'pass' && c.name.includes(what)), what + ': ' + JSON.stringify(r.filter(c => c.status !== 'pass'))); };
  fails({ complete: { complete: false } }, 'complete === true'); fails({ complete: { full_schedule: false } }, 'full_schedule');
  fails({ settings: { lr: 1e-4 } }, 'recipe'); fails({ settings: { epochs: 9 } }, 'recipe'); fails({ complete: { state: { epoch: 8, update: 100, total: 14288, elapsed: 1 } } }, 'update === total');
  fails({ receipt: { weights: { sha256: 'w', epoch: 8, update: 1, total: 14288, full_schedule: true, source_changes_since_training: [] } } }, 'update/total');
  fails({ receipt: { source_changes_since_training: ['x'] } }, 'no source change'); fails({ receipt: { contract: { output_contract: 'diagram-reader-v2', protocol: { sha256: 'd'.repeat(64) } } } }, 'output contract');
  fails({ receipt: { weights: { update: 14288, total: 14288, epoch: 8, full_schedule: false, source_changes_since_training: [] } } }, 'full_schedule');
  const seedWrong = mkTraining('F-s1'); seedWrong.loaded.name = 'F-s0'; assert.ok(M.trainingChecks(seedWrong.loaded, seedWrong.dir).some(c => c.status !== 'pass' && c.name.includes('seed')));
  const wrongData = mkTraining('F-s0'); wrongData.loaded.train_sha256 = 'e'.repeat(64); assert.ok(M.trainingChecks(wrongData.loaded, wrongData.dir).some(c => c.status !== 'pass' && c.name.includes('train.jsonl sha256')));
  assert.equal(M.trainingChecks(ok.loaded, TMP + '/no-such-run')[0].status, 'unavailable');
  // export record: passed=false is reported, never a failure
  assert.ok(cs.find(c => c.name.includes('receipt passed=false')).ok);
  // the real B-s0 run passes against its own reference
  const b = N.loadBundle('B-s0', OLD + '/B-s0/eval'), real = M.trainingChecks({ name: 'B-s0', identity: b.identity, train_sha256: b.identity.train_data.train_sha256 }, OLD + '/B-s0');
  assert.deepEqual(real.filter(c => c.status !== 'pass'), []);
});

// ---------------------------------------------------------------- stages: the whole verdict from loaded fixtures
const evOf = (name, artifacts, over = {}) => { const [arm, seed] = M.ARMS[name], mk = id => { const f = TMP + `/evf-${name}-${id}-${++tk}.txt`; writeFileSync(f, `evidence ${name} ${id}`); return { status: 'pass', command: 'node x', evidence: f, sha256: hashF(f) }; }; return { schema: M.EVIDENCE_SCHEMA, subject: { arm, seed, artifacts_sha256: artifacts }, results: Object.fromEntries(['9', '10', '11', '12', '13', '14', '19'].map(i => [i, mk(i)])), ...over }; };
const loadedOf = (b, name, extra = {}) => ({ name, bundle: b, kind: 'forms', identity: null, identity_sha256: sha256Of('id-' + name), score_sha256: sha256Of('sc-' + name), artifacts_sha256: sha256Of('art-' + name), train_sha256: null, ...extra });
const stageFixture = (stage, over = {}) => {
  const bs = { 'B-s0': mkBundle('B-s0'), 'C100-s0': mkBundle('C100-s0'), 'F-s0': mkBundle('F-s0', { t1: [2, 0], create: [2, 0], risk: 0.01 }), 'B-s1': mkBundle('B-s1'), 'C100-s1': mkBundle('C100-s1'), 'F-s1': mkBundle('F-s1', { t1: [2, 0], create: [2, 0], risk: 0.01 }), ...(over.bundles ?? {}) };
  const names = { seed0: ['F-s0', 'B-s0', 'C100-s0'], control1: ['B-s1', 'C100-s1'], confirmation: Object.keys(bs) }[stage], L = {}, ev = {}, tr = {};
  for (const nm of names) {
    const t = mkTraining(nm); L[nm] = loadedOf(bs[nm], nm, { identity: t.loaded.identity, train_sha256: t.loaded.train_sha256 }); tr[nm] = t.dir;
    if (nm.startsWith('F') || nm.startsWith('B')) ev[nm] = evOf(nm, L[nm].artifacts_sha256);
  }
  return { L, ev, tr };
};
test('stage seed0 passes on a good fixture and each probe fails it: no F2 form, no oracle evidence, wrong-subject evidence, missing training record, failing P3', () => {
  const f = stageFixture('seed0'), rows = M.stageRows('seed0', f.L, f.ev, f.tr, RULES);
  assert.deepEqual(rows.map(r => r.id), ['P3', 'F1', 'F2', 'contract:F-s0', 'F3', 'P4']); assert.deepEqual(rows.filter(r => !r.pass).map(r => [r.id, r.checks.filter(c => !c.ok).map(c => c.name)]), []);
  const dec = M.decide(M.loadFormsProtocol(mkProtocol()), 'seed0', { ...f, passes: {} }, RULES); assert.equal(dec.pass, true); assert.equal(dec.stage, 'seed0'); assert.equal(dec.rows.length, 6);
  const probe = (mutate, id) => { const g = stageFixture('seed0'); mutate(g); const r = M.stageRows('seed0', g.L, g.ev, g.tr, RULES); assert.equal(r.find(x => x.id === id).pass, false, id); assert.equal(r.every(x => x.pass), false); };
  probe(g => { g.L['F-s0'].bundle.score.populations.t1_clean_outline_question = popStat({ share: 0.5 }); }, 'F2');
  probe(g => { delete g.ev['F-s0'].results['19']; }, 'F2');
  probe(g => { g.ev['F-s0'].subject.artifacts_sha256 = 'f'.repeat(64); }, 'F2');
  probe(g => { delete g.tr['F-s0']; }, 'P4');
  probe(g => { g.L['B-s0'].bundle.score.sets.nl_a_development.development.gated.wrong_plus_extras_per_100_requested = 0; g.L['C100-s0'].bundle.score.sets.nl_a_development.development.gated.wrong_plus_extras_per_100_requested = 5; g.L['B-s0'].bundle.sidecar['nl_a_development/development'] = side(0, 1); }, 'P3');
  probe(g => { g.ev['B-s0'] = evOf('B-s0', 'x'.repeat(64)); }, 'P3');
  probe(g => { g.L['F-s0'].bundle.score.populations.t1_clean.gated.executed = 0; }, 'F1');
  probe(g => { g.L['F-s0'].bundle.score.label_errors.gated_empty_label_on_nonempty_gold = 1; }, 'F3');
});
test('stage control1: B-s1 must pass Guard G against C100-s1 and the contract evidence, bound to B-s1', () => {
  const f = stageFixture('control1'), rows = M.stageRows('control1', f.L, f.ev, f.tr, RULES);
  assert.deepEqual(rows.map(r => r.id), ['P3', 'P4']); assert.ok(rows.every(r => r.pass));
  const g = stageFixture('control1'); g.L['B-s1'].bundle.sidecar['fresh2_test/test'] = side(0, 1); assert.equal(M.stageRows('control1', g.L, g.ev, g.tr, RULES).find(r => r.id === 'P3').pass, false);
  const h = stageFixture('control1'); delete h.ev['B-s1'].results['11']; assert.equal(M.stageRows('control1', h.L, h.ev, h.tr, RULES).find(r => r.id === 'P3').pass, false);
});
test('stage confirmation: seed0 and control1 rows are recomputed, F4 and F2/F3 apply to BOTH F seeds; a miss in seed 1 fails; the pass records of the earlier stages are checked', () => {
  const f = stageFixture('confirmation'), rows = M.stageRows('confirmation', f.L, f.ev, f.tr, RULES), ids = rows.map(r => r.id);
  for (const id of ['P3', 'F1', 'F2', 'F3', 'F4', 'contract:F-s0', 'contract:F-s1', 'P4']) assert.ok(ids.includes(id), id);
  assert.equal(ids.filter(i => i === 'F2').length, 2); assert.equal(ids.filter(i => i === 'F3').length, 2);
  assert.deepEqual(rows.filter(r => !r.pass).map(r => r.id), []);
  const g1 = stageFixture('confirmation'); g1.L['F-s1'].bundle.score.populations.t1_clean_outline_create = popStat({ share: 0.2 }); assert.equal(M.stageRows('confirmation', g1.L, g1.ev, g1.tr, RULES).every(r => r.pass), false);
  const g2 = stageFixture('confirmation'); g2.L['F-s1'].bundle.score.label_errors.gated_empty_label_on_nonempty_gold = 1; assert.equal(M.stageRows('confirmation', g2.L, g2.ev, g2.tr, RULES).every(r => r.pass), false);
  const g3 = stageFixture('confirmation'); g3.L['F-s1'].bundle.sidecar['nl_a_development/development'] = side(0, 1); assert.equal(M.stageRows('confirmation', g3.L, g3.ev, g3.tr, RULES).every(r => r.pass), false);
  const g4 = stageFixture('confirmation'); delete g4.ev['F-s1']; assert.equal(M.stageRows('confirmation', g4.L, g4.ev, g4.tr, RULES).every(r => r.pass), false);   // no oracle / contract evidence for F-s1: never a pass (the loader refuses earlier)
  const g5 = stageFixture('confirmation'); g5.L['F-s1'].bundle = mkBundle('F-s1', { t1: [1, 0] }); assert.equal(M.stageRows('confirmation', g5.L, g5.ev, g5.tr, RULES).find(r => r.id === 'F4').pass, false);
  assert.throws(() => M.stageRows('nonsense', f.L, f.ev, f.tr, RULES), /--stage/);
});

// ---------------------------------------------------------------- group exposure (display only)
test('group exposure: population messages / groups sharing a frozen group with each arm\'s training are counted and shown on every F2 / F3 row; no bar changes', () => {
  const items = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, group_key: i < 2 ? 'g1' : 'g' + i }));
  const e = M.groupExposure([{ name: 'p', items }], { B: new Set(['g1']), F: new Set(['g1', 'g2', 'g3']), C100: new Set() });
  assert.deepEqual(e.p, { messages: 4, groups: 3, B: { messages_sharing_group: 2, groups_sharing_group: 1 }, F: { messages_sharing_group: 4, groups_sharing_group: 3 }, C100: { messages_sharing_group: 0, groups_sharing_group: 0 } });
  assert.throws(() => M.groupExposure([{ name: 'q', items: [{ id: 'x', group_key: null }] }], { B: new Set() }), /no frozen group/);
  const f = stageFixture('seed0'), exposure = Object.fromEntries([...Object.keys(RULES.form_bars).map(x => 't1_clean_' + x), 't1_all_undo_redo_count', 't1_clean_label_setting', 'lowercase_other_affected', 'short3_lowercase', 'fresh2_test (full guard view)', 'short3_test (full guard view)', 'nl_a_development (full guard view)'].map(n => [n, e.p]));
  const FP2 = M.loadFormsProtocol(mkProtocol()), plain = M.decide(FP2, 'seed0', { ...f, passes: {} }, RULES), shown = M.decide(FP2, 'seed0', { ...f, passes: {}, groupExposure: exposure }, RULES);
  assert.equal(shown.pass, plain.pass); assert.deepEqual(shown.rows.map(r => r.status), plain.rows.map(r => r.status));
  assert.equal(Object.keys(shown.rows.find(r => r.id === 'F2').group_exposure).length, 7); assert.equal(Object.keys(shown.rows.find(r => r.id === 'F3').group_exposure).length, 6);
  const md = M.renderVerdictMd(shown); assert.match(md, /exposure \(display only\) t1_all_undo_redo_count: 4 messages \/ 3 groups; sharing a group with training: B 2 msgs \/ 1 groups; F 4 msgs \/ 3 groups; C100 0 msgs \/ 0 groups/);
  assert.ok(!('group_exposure' in shown.rows.find(r => r.id === 'F1'))); assert.deepEqual(shown.group_exposure.t1_all_undo_redo_count, e.p);
  // the real frozen basis: undo/redo exposure to B and F groups is computed from groups.jsonl and the membership files, and F shares more than B
  const dev = CACHE + '/forms-2026-11-08/data-dev/protocol/protocol.json';
  if (existsSync(dev)) { const real = M.loadGroupExposure(M.loadFormsProtocol(dev)), u = real.t1_all_undo_redo_count; assert.equal(u.messages, 28); assert.ok(u.F.messages_sharing_group > u.B.messages_sharing_group); assert.equal(u.B.messages_sharing_group, 3); assert.equal(u.F.messages_sharing_group, 13); }
});

// ---------------------------------------------------------------- pass records and stage inputs
const verdictDoc = (FP2, stage, over = {}) => ({ schema: 'modernbert-forms-verdict-v1', tool: 'x', stage, pass: true, campaign: FP2.campaign, plan_sha256: FP2.plan.sha256, forms_protocol_sha256: FP2.sha256, rows: [{ id: 'F1', status: 'pass', pass: true }], bundles: Object.fromEntries({ seed0: ['F-s0', 'B-s0', 'C100-s0'], control1: ['B-s1', 'C100-s1'] }[stage].map(x => [x, { kind: 'forms', dir: '/x', identity_sha256: sha256Of('i' + x), score_sha256: sha256Of('s' + x) }])), ...over });
test('pass records: a passing record of the right stage and campaign is accepted; a failing, foreign, wrong-stage or rebound one is not', () => {
  const FP2 = M.loadFormsProtocol(mkProtocol()), put = d => { const f = TMP + `/verdict-${++tk}.json`; wj(f, d); return f; };
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0')), 'seed0', FP2).ok, true);
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0', { pass: false })), 'seed0', FP2).ok, false);
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0', { rows: [{ id: 'F1', status: 'fail', pass: false }] })), 'seed0', FP2).ok, false);
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0', { rows: [] })), 'seed0', FP2).ok, false);
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'control1')), 'seed0', FP2).ok, false);
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0', { campaign: 'other' })), 'seed0', FP2).ok, false);
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0', { plan_sha256: 'a'.repeat(64) })), 'seed0', FP2).ok, false);
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0', { schema: 'x' })), 'seed0', FP2).ok, false);
  assert.throws(() => M.checkPassRecord(TMP + '/none.json', 'seed0', FP2), /missing/); assert.throws(() => M.checkPassRecord(undefined, 'seed0', FP2), /not given/);
  // bundles: every bundle of the stage with identity and score hashes is required; a record without or with partial bundles never passes
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0', { bundles: {} })), 'seed0', FP2).ok, false);
  assert.equal(M.checkPassRecord(put(verdictDoc(FP2, 'seed0', { bundles: undefined })), 'seed0', FP2).ok, false);
  const part = verdictDoc(FP2, 'seed0'); delete part.bundles['B-s0']; assert.equal(M.checkPassRecord(put(part), 'seed0', FP2).ok, false);
  const nohash = verdictDoc(FP2, 'seed0'); nohash.bundles['F-s0'].score_sha256 = 'x'; assert.equal(M.checkPassRecord(put(nohash), 'seed0', FP2).ok, false);
  const extra = verdictDoc(FP2, 'seed0'); extra.bundles['F-s1'] = extra.bundles['F-s0']; assert.equal(M.checkPassRecord(put(extra), 'seed0', FP2).ok, false);
  const good = verdictDoc(FP2, 'seed0'), L = Object.fromEntries(Object.entries(good.bundles).map(([k, v]) => [k, { identity_sha256: v.identity_sha256, score_sha256: v.score_sha256 }]));
  assert.equal(M.checkPassRecord(put(good), 'seed0', FP2, L).ok, true);
  assert.equal(M.checkPassRecord(put(good), 'seed0', FP2, { ...L, 'F-s0': { identity_sha256: 'X', score_sha256: L['F-s0'].score_sha256 } }).ok, false);
  // with reload (what check-pass and the runner do) the listed folders are loaded again: a hand-written record pointing at nothing fails
  assert.equal(M.checkPassRecord(put(good), 'seed0', FP2, null, { reload: true }).ok, false);
});
test('stage inputs: a missing bundle (the confirmation needs all six), an extra bundle, a missing evidence or training input, and a missing pass record are refused before anything is written', () => {
  const FP2 = M.loadFormsProtocol(mkProtocol());
  assert.throws(() => M.loadStageInputs(FP2, 'confirmation', { bundle: ['F-s0=/x', 'B-s0=/x'] }), /needs --bundle/);
  assert.throws(() => M.loadStageInputs(FP2, 'seed0', { bundle: ['F-s0=/x', 'B-s0=/x', 'C100-s0=/x', 'F-s1=/x'] }), /takes F-s0, B-s0, C100-s0/);
  assert.throws(() => M.loadStageInputs(FP2, 'seed0', { bundle: ['R-s0=/x'] }), /one of/);
  assert.throws(() => M.loadStageInputs(FP2, 'seed0', { bundle: ['F-s0=/x', 'F-s0=/y'] }), /twice/);
  assert.throws(() => M.loadStageInputs(FP2, 'seed0', { bundle: ['F-s0'] }), /NAME=PATH/);
  assert.throws(() => M.loadStageInputs(FP2, 'nope', {}), /--stage/);
  assert.throws(() => M.loadStageInputs(FP2, 'seed0', { bundle: ['F-s0=/x', 'B-s0=' + OLD + '/B-s0/eval', 'C100-s0=' + OLD + '/baseline/C100-s0-v2'] }), /./);
  // the reused parent bundle must be the parent's folder and needs its applicability record
  const reusable = { 'B-s0': { dir: OLD + '/B-s0/eval', arm: 'B', seed: 0 } };
  assert.throws(() => M.loadReusedBundle('B-s0', OLD + '/B-s0/eval', undefined, FP2), /needs --applicability/);
});
test('verdict CLI: a missing bundle exits nonzero and writes nothing; a confirmation without bundles cannot succeed', () => {
  const out = TMP + '/verdict-cli-out', pf = mkProtocol();
  const r = spawnSync('node', [MEASURE, 'verdict', '--protocol', pf, '--stage', 'confirmation', '--out', out], { encoding: 'utf8' });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /needs --bundle/); assert.ok(!existsSync(out));
  const r2 = spawnSync('node', [MEASURE, 'verdict', '--protocol', pf, '--stage', 'seed0', '--out', out, '--bundle', 'F-s0=' + TMP + '/nope'], { encoding: 'utf8' });
  assert.notEqual(r2.status, 0); assert.ok(!existsSync(out));
  const r3 = spawnSync('node', [MEASURE, 'check-pass', '--protocol', pf, '--stage', 'seed0', '--verdict', TMP + '/nope.json'], { encoding: 'utf8' }); assert.notEqual(r3.status, 0);
  const r4 = spawnSync('node', [MEASURE, 'bogus'], { encoding: 'utf8' }); assert.notEqual(r4.status, 0);
});

// ---------------------------------------------------------------- evaluate: registered arms, bound artifacts, identity, resume, no overwrite
let mk2 = 0;
const clone = o => JSON.parse(JSON.stringify(o));
const putF = (p, text) => { inTmp(p); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
/** a model folder like an export (config, tokenizer, onnx weights + 2 shards, receipt hashing them), receipt weights bound to `weights` */
const mkModelAt = (dir, weights, extraReceipt = {}) => {
  for (const [f, t] of [['config.json', '{"reader":{}}'], ['tokenizer.json', 'tok'], ['tokenizer_config.json', 'tokc'], ['special_tokens_map.json', 'sp'], ['onnx/model_quantized.onnx', 'onnx'], ['onnx/model_quantized.onnx_data', 'shard0'], ['onnx/model_quantized.onnx_data_1', 'shard1']]) putF(dir + '/' + f, t);
  const files = Object.fromEntries(['config.json', 'tokenizer.json', 'onnx/model_quantized.onnx', 'onnx/model_quantized.onnx_data', 'onnx/model_quantized.onnx_data_1'].map(f => [f, { sha256: hashF(dir + '/' + f) }]));
  wj(dir + '/arm_receipt.json', { passed: false, shards: ['model_quantized.onnx_data', 'model_quantized.onnx_data_1'], files, weights, source_changes_since_training: [], contract: { output_contract: 'diagram-reader-v2', protocol: { sha256: M.PARENT.protocol_sha256 } }, ...extraReceipt });
  return dir;
};
/** re-hash a model folder's receipt after the test changed one of its files */
const rehash = dir => { const r = J(dir + '/arm_receipt.json'); for (const f of Object.keys(r.files)) r.files[f].sha256 = hashF(dir + '/' + f); wj(dir + '/arm_receipt.json', r); };
/** a task root with the registered data folders (F manifest bound to this forms protocol, B manifest pinned, C100 hash pinned) and a finished run + export per arm on request */
const mkWorld = (FPo, root = TMP + '/world' + ++mk2) => {
  const reg = M.registry(root);
  reg.data = { F: root + '/data-v2/F', B: root + '/data-b/B', C100: root + '/data-c100/C100' }; reg.train['C100-s1'] = root + '/C100-s1';   // everything the world writes is under its own root
  const dataDir = (arm, dir) => { putF(dir + '/train.jsonl', 'row ' + arm + '\n'); if (arm !== 'C100') wj(dir + '/trigger_inventory.json', { triggers: ['x'], extra_dirs: ['llm_train/synth_short_r2'] }); };
  dataDir('F', reg.data.F); wj(reg.data.F + '.manifest.json', { arm: 'F', campaign: FPo.campaign, messages: 1, requests: 1, protocol: { membership_sha256: FPo.membership_sha256, sha256: FPo.sha256 } });
  dataDir('B', reg.data.B); wj(reg.data.B + '.manifest.json', { arm: 'B', messages: 1, requests: 1 }); reg.b_manifest_sha256 = hashF(reg.data.B + '.manifest.json');
  dataDir('C100', reg.data.C100); reg.c100_train_sha256 = hashF(reg.data.C100 + '/train.jsonl');
  const run = (name, over = {}) => {
    const [arm, seed] = M.ARMS[name], T = reg.train[name], data = reg.data[arm], c = clone(J(M.REFERENCE_RECIPE_FILE));
    c.metadata.settings.seed = over.seed ?? seed; c.metadata.data.files['train.jsonl'] = hashF(data + '/train.jsonl'); c.metadata.data.requests = 1; c.metadata.data.messages = 1;
    wj(T + '/run/complete.json', c); putF(T + '/run/checkpoint.pt', 'weights of ' + name);
    const model = mkModelAt(T + '/export/modernbert-' + name, { sha256: over.weightsSha ?? hashF(T + '/run/checkpoint.pt'), epoch: c.state.epoch, update: c.state.update, total: c.state.total, full_schedule: true, max_updates: 0, source_file: 'checkpoint.pt', source_changes_since_training: [] });
    return { model, data, train: T };
  };
  return { root, reg, run };
};
/** a stand-in for evaluateArm that writes the files the seal reads (the real one needs the heavy collection) */
const fakeEval = calls => async opts => {
  calls.push(opts);
  const out = opts.out; mkdirSync(out + '/records', { recursive: true });
  wj(out + '/identity.json', { arm: opts.arm, seed: opts.seed, protocol_sha256: M.PARENT.protocol_sha256, views_manifest_sha256: M.PARENT.views_manifest_sha256, addendum_sha256: M.PARENT.addendum_sha256, model: { artifacts_sha256: digest(JSON.stringify(filesOf(opts.model))) }, train_data: { train_sha256: hashF(opts.trainData + '/train.jsonl') } });
  const sc = JSON.stringify({}); writeFileSync(out + '/score.truthful.per_message.json', sc);
  wj(out + '/score.truthful.json', { per_message: { file: out + '/score.truthful.per_message.json', sha256: sha256Of(sc) }, sets: {}, populations: {} });
  wj(out + '/confidence.json', { c: 1 }); wj(out + '/calibration.json', { c: 2 }); wj(out + '/records/calibration.jsonl.manifest.json', { complete: true });
  return { out };
};
import { filesOf } from './collect_set.mjs';
import { digest } from '../calibrate_modernbert.mjs';
/** evaluateCommand of one registered arm in a world, with the stand-in evaluation */
const sealedIn = (W, pf, name, out, calls = [], more = {}) => { const [arm, seed] = M.ARMS[name], r = W.run(name); return M.evaluateCommand({ protocol: pf, arm, seed, model: r.model, trainData: r.data, out, ...more }, { evaluate: fakeEval(calls), reg: W.reg }); };
const protoOf = root => { mkdirSync(root + '/protocol-v2', { recursive: true }); wj(root + '/protocol-v2/protocol.json', { campaign: { id: 'forms-test' }, membership: { F: { sha256: sha256Of('F-members') } } }); writeFileSync(root + '/protocol-v2/SHA256SUMS', `${hashF(root + '/protocol-v2/protocol.json')}  protocol.json\n`); return root + '/protocol-v2/protocol.json'; };
await atest('evaluate: only F s0/s1, B s1 and C100 s1 are registered; B s0, C100 s0, R, S, seed 2 and a legacy-records flag on a non-C100 arm are rejected before anything is written', async () => {
  const pf = mkProtocol(), calls = [], W = mkWorld(FP), r = W.run('F-s0');
  for (const [arm, seed] of [['B', 0], ['C100', 0], ['R', 0], ['S', 0], ['F', 2], ['B', 2], ['X', 1], ['F', 'a']]) {
    const out = TMP + `/rej-${arm}-${seed}`;
    await assert.rejects(() => M.evaluateCommand({ protocol: pf, arm, seed, model: r.model, trainData: r.data, out }, { evaluate: fakeEval(calls), reg: W.reg }), /--arm is|not a registered|not an evaluable/);
    assert.ok(!existsSync(out));
  }
  await assert.rejects(() => M.evaluateCommand({ protocol: pf, arm: 'F', seed: 0, model: r.model, trainData: r.data, out: TMP + '/rej-legacy', legacyRecords: '/x/a.jsonl' }, { evaluate: fakeEval(calls), reg: W.reg }), /C100 comparator only/);
  assert.equal(calls.length, 0);
});
await atest('evaluate: a model or data folder, run, seed or weights of ANOTHER arm cannot be relabelled (the parent\'s R export + data as F-s0, B-s0 as B-s1, C100-s0 as C100-s1, a wrong seed or manifest or weights hash)', async () => {
  const pf = mkProtocol(), calls = [], fx = o => M.evaluateCommand(o, { evaluate: fakeEval(calls) });          // the REAL registry
  const run = (arm, seed, model, trainData) => fx({ protocol: pf, arm, seed, model, trainData, out: TMP + '/relabel-' + ++mk2 });
  await assert.rejects(() => run('F', 0, OLD + '/R-s0/export/modernbert-R-s0', OLD + '/data/R'), /not this arm's registered artifacts.*model folder is F-s0's registered export/);
  await assert.rejects(() => run('F', 0, OLD + '/R-s0/export/modernbert-R-s0', OLD + '/data/S'), /registered/);
  await assert.rejects(() => run('B', 1, OLD + '/B-s0/export/modernbert-B-s0', OLD + '/data/B'), /model folder is B-s1's registered export/);
  await assert.rejects(() => run('C100', 1, CACHE + '/arms/C100-s0/export/modernbert-C100-s0', CACHE + '/arms/data/C100'), /model folder is C100-s1's registered export/);
  assert.equal(calls.length, 0);
  // the real registered C100-s1 run + export + data pass the binding (its seed is read from run/complete.json)
  const td = M.trainDataIdentity(CACHE + '/arms/data/C100', 'C100'), good = M.bindingChecks(FP, 'C100-s1', { modelDir: CACHE + '/arms/C100-s1/export/modernbert-C100-s1', td });
  assert.deepEqual(good.filter(c => !c.ok), []); assert.ok(good.length >= 8);
  // the parent's own B-s0 run + data pass as B-s0 (a pure data check; the B manifest is the pinned one) and fail as B-s1
  const tb = { dir: OLD + '/data/B', train_sha256: J(OLD + '/B-s0/eval/identity.json').train_data.train_sha256, manifest_file: OLD + '/data/B.manifest.json', manifest_sha256: M.B_MANIFEST_SHA256 };
  assert.deepEqual(M.bindingChecks(FP, 'B-s0', { modelDir: OLD + '/B-s0/export/modernbert-B-s0', td: tb }).filter(c => !c.ok), []);
  assert.ok(M.bindingChecks(FP, 'B-s1', { modelDir: OLD + '/B-s0/export/modernbert-B-s0', td: tb }).some(c => !c.ok));
  // synthetic world: each single relabelling is caught by its own check
  const W = mkWorld(FP), okR = W.run('F-s0'), tdF = M.trainDataIdentity(okR.data, 'F');
  const fails = (name, args, reg, what) => { const r = M.bindingChecks(FP, name, args, reg); assert.ok(r.some(c => !c.ok && c.check.includes(what)), what + ' ' + JSON.stringify(r.filter(c => !c.ok).map(c => c.check))); };
  assert.deepEqual(M.bindingChecks(FP, 'F-s0', { modelDir: okR.model, td: tdF }, W.reg).filter(c => !c.ok), []);
  W.run('F-s0', { seed: 1 }); fails('F-s0', { modelDir: okR.model, td: tdF }, W.reg, 'run seed is 0');
  W.run('F-s0', { weightsSha: 'f'.repeat(64) }); fails('F-s0', { modelDir: okR.model, td: tdF }, W.reg, 'weights sha256');
  { const cf = W.reg.train['F-s0'] + '/run/complete.json', c = J(cf); c.metadata.data.files['train.jsonl'] = 'd'.repeat(64); wj(cf, c); fails('F-s0', { modelDir: okR.model, td: tdF }, W.reg, 'run trained on this data'); }
  W.run('F-s0');
  const mf = W.reg.data.F + '.manifest.json', m0 = J(mf);
  for (const [k, v, what] of [['arm', 'B', 'of arm F'], ['campaign', 'other', 'this campaign'], ['protocol', { ...m0.protocol, membership_sha256: 'a'.repeat(64) }, 'F membership'], ['protocol', { ...m0.protocol, sha256: 'b'.repeat(64) }, 'forms protocol file']]) { wj(mf, { ...m0, [k]: v }); fails('F-s0', { modelDir: okR.model, td: M.trainDataIdentity(okR.data, 'F') }, W.reg, what); }
  wj(mf, m0);
  const okB = W.run('B-s1'), tdB = M.trainDataIdentity(okB.data, 'B'); assert.deepEqual(M.bindingChecks(FP, 'B-s1', { modelDir: okB.model, td: tdB }, W.reg).filter(c => !c.ok), []);
  wj(W.reg.data.B + '.manifest.json', { arm: 'B', messages: 2 }); fails('B-s1', { modelDir: okB.model, td: M.trainDataIdentity(okB.data, 'B') }, W.reg, 'pinned');
  const okC = W.run('C100-s1'), tdC = M.trainDataIdentity(okC.data, 'C100'); assert.deepEqual(M.bindingChecks(FP, 'C100-s1', { modelDir: okC.model, td: tdC }, W.reg).filter(c => !c.ok), []);
  writeFileSync(W.reg.data.C100 + '/train.jsonl', 'another\n'); fails('C100-s1', { modelDir: okC.model, td: M.trainDataIdentity(okC.data, 'C100') }, W.reg, 'pinned');
  // a run folder that is not there, a model in the wrong place
  fails('F-s0', { modelDir: okB.model, td: tdF }, W.reg, "registered export");
  const W2 = mkWorld(FP); fails('F-s1', { modelDir: W2.reg.train['F-s1'] + '/export/modernbert-F-s1', td: M.trainDataIdentity(W2.reg.data.F, 'F') }, W2.reg, 'run/complete.json exists');
});
await atest('evaluate: a missing model shard, a missing sidecar (receipt), a missing config/tokenizer/weights file, a changed file and a foreign shard are rejected; the training data needs its manifest and inventory', async () => {
  const pf = mkProtocol(), calls = [], fs = await import('node:fs');
  const trial = async (mutate, re) => { const W = mkWorld(FP), r = W.run('F-s0'); mutate(r, W); await assert.rejects(() => M.evaluateCommand({ protocol: pf, arm: 'F', seed: 0, model: r.model, trainData: r.data, out: TMP + '/rej-model-' + ++mk2 }, { evaluate: fakeEval(calls), reg: W.reg }), re); };
  await trial(r => fs.rmSync(r.model + '/onnx/model_quantized.onnx_data_1'), /weight shard onnx\/model_quantized.onnx_data_1 is missing/);
  await trial(r => fs.rmSync(r.model + '/arm_receipt.json'), /arm_receipt.json is missing|registered artifacts/);
  for (const f of ['config.json', 'tokenizer.json', 'onnx/model_quantized.onnx']) await trial(r => fs.rmSync(r.model + '/' + f), /is missing/);
  await trial(r => writeFileSync(r.model + '/tokenizer.json', 'changed'), /differs from the receipt/);
  await trial(r => writeFileSync(r.model + '/onnx/model_quantized.onnx_data_2', 'x'), /not a shard the receipt names/);
  await trial(r => { const x = J(r.model + '/arm_receipt.json'); x.shards = []; wj(r.model + '/arm_receipt.json', x); }, /names no weight shards/);
  await trial((r, W) => fs.rmSync(W.reg.data.F + '.manifest.json'), /manifest.json is missing/);
  await trial((r, W) => fs.rmSync(W.reg.data.F + '/trigger_inventory.json'), /trigger_inventory.json is missing/);
  await trial((r, W) => fs.rmSync(W.reg.data.F + '/train.jsonl'), /train.jsonl is missing/);
  assert.equal(calls.length, 0);
  const real = M.validateModel(OLD + '/B-s0/export/modernbert-B-s0'); assert.equal(real.artifacts_sha256, J(OLD + '/B-s0/eval/identity.json').model.artifacts_sha256); assert.equal(Object.keys(real.weights).length, 3);
  const c1 = M.validateModel(CACHE + '/arms/C100-s1/export/modernbert-C100-s1'); assert.equal(c1.dir, CACHE + '/arms/C100-s1/export/modernbert-C100-s1');
});
await atest('evaluate: a new bundle is sealed; an identical resume preserves the finished records and runs nothing; a changed model/data/flag refuses; a foreign folder is never written into; the seal, outer identity and the eval folder\'s own identity are all cross-checked', async () => {
  const pf = mkProtocol(), calls = [], W = mkWorld(FP), out = TMP + '/bundle-ok', fs = await import('node:fs');
  const r1 = await sealedIn(W, pf, 'F-s0', out, calls);
  assert.equal(r1.sealed, true); assert.equal(calls.length, 1); assert.equal(calls[0].threads, '2'); assert.equal(calls[0].protocol, M.PARENT.protocol); assert.equal(calls[0].addendum, M.PARENT.addendum); assert.equal(calls[0].views, M.PARENT.views); assert.equal(calls[0].includeExternal, true);
  const id = J(out + '/campaign_identity.json');
  for (const k of ['campaign', 'plan_sha256', 'forms_protocol_sha256', 'arm', 'seed', 'membership_sha256', 'model', 'train_data', 'tool', 'parent']) assert.ok(id[k] !== undefined, k);
  assert.equal(id.model.sidecar['arm_receipt.json'].length, 64); assert.equal(Object.keys(id.model.weights).length, 3); assert.equal(id.train_data.manifest_sha256.length, 64); assert.ok(id.tool.code['training/neural/parity/modernbert_forms_measure.mjs']); assert.ok(id.tool.runtime.node);
  const before = hashF(out + '/eval/score.truthful.json'), sealBefore = hashF(out + '/bundle_seal.json'), o = { protocol: pf, arm: 'F', seed: 0, model: W.reg.train['F-s0'] + '/export/modernbert-F-s0', trainData: W.reg.data.F, out };
  const same2 = await M.evaluateCommand(o, { evaluate: fakeEval(calls), reg: W.reg });
  assert.equal(same2.resumed, true); assert.equal(calls.length, 1); assert.equal(hashF(out + '/eval/score.truthful.json'), before); assert.equal(hashF(out + '/bundle_seal.json'), sealBefore);
  await assert.rejects(() => M.evaluateCommand({ ...o, noExternal: true }, { evaluate: fakeEval(calls), reg: W.reg }), /identity changed.*external_views/);
  writeFileSync(W.reg.data.F + '/trigger_inventory.json', JSON.stringify({ triggers: ['x', 'y'] })); await assert.rejects(() => M.evaluateCommand(o, { evaluate: fakeEval(calls), reg: W.reg }), /identity changed.*train_data/);
  wj(W.reg.data.F + '/trigger_inventory.json', { triggers: ['x'], extra_dirs: ['llm_train/synth_short_r2'] });
  const tok = W.reg.train['F-s0'] + '/export/modernbert-F-s0'; writeFileSync(tok + '/tokenizer.json', 'tok2'); rehash(tok); await assert.rejects(() => M.evaluateCommand(o, { evaluate: fakeEval(calls), reg: W.reg }), /identity changed.*model/);
  writeFileSync(tok + '/tokenizer.json', 'tok'); rehash(tok);
  assert.equal(calls.length, 1);
  const foreign = TMP + '/foreign'; mkdirSync(foreign); writeFileSync(foreign + '/x', '1');
  await assert.rejects(() => M.evaluateCommand({ ...o, out: foreign }, { evaluate: fakeEval(calls), reg: W.reg }), /not a forms bundle/); assert.equal(readdirSync(foreign).join(), 'x');
  const out3 = TMP + '/bundle-interrupted', failing = async opts => { await fakeEval([])(opts); throw new Error('interrupted'); };
  await assert.rejects(() => M.evaluateCommand({ ...o, out: out3 }, { evaluate: failing, reg: W.reg }), /interrupted/); assert.ok(existsSync(out3 + '/campaign_identity.json')); assert.ok(!existsSync(out3 + '/bundle_seal.json'));
  const r3 = await M.evaluateCommand({ ...o, out: out3 }, { evaluate: fakeEval(calls), reg: W.reg }); assert.equal(r3.resumed, true); assert.ok(existsSync(out3 + '/bundle_seal.json'));
  const FP2 = M.loadFormsProtocol(pf), L = M.loadFormsBundle('F-s0', out, FP2); assert.equal(L.kind, 'forms'); assert.equal(L.artifacts_sha256, id.model.artifacts_sha256);
  assert.throws(() => M.loadFormsBundle('F-s1', out, FP2), /identity is of F-s0/); assert.throws(() => M.loadFormsBundle('R-s0', out, FP2), /one of/);
  assert.throws(() => M.loadFormsBundle('F-s0', out, M.loadFormsProtocol(mkProtocol({ campaign: { id: 'another' } }))), /made for campaign/);
  assert.throws(() => M.loadFormsBundle('F-s0', out, M.loadFormsProtocol(mkProtocol({ membership: { F: { sha256: 'a'.repeat(64) } } }))), /another forms protocol|another F membership/);
  assert.throws(() => M.loadFormsBundle('F-s0', TMP + '/none', FP2), /no campaign_identity/);
  const cp = name => { const d = TMP + '/bundle-' + name; cpSync(out, d, { recursive: true }); return d; };
  const o7 = cp('seal'), i7 = J(o7 + '/campaign_identity.json'); i7.tool.runtime.node = 'v0.0.1'; wj(o7 + '/campaign_identity.json', i7); assert.throws(() => M.loadFormsBundle('F-s0', o7, FP2), /the seal is not of this identity/);
  const o4 = cp('tamper'); writeFileSync(o4 + '/eval/confidence.json', '{"c":99}'); assert.throws(() => M.loadFormsBundle('F-s0', o4, FP2), /confidence.json is missing or differs from the seal/);
  const o5 = cp('nolrec'); writeFileSync(o5 + '/eval/records/calibration.jsonl.manifest.json', '{"complete":false}'); assert.throws(() => M.loadFormsBundle('F-s0', o5, FP2), /records\/calibration.jsonl.manifest.json/);
  const o6 = cp('noseal'); fs.rmSync(o6 + '/bundle_seal.json'); assert.throws(() => M.loadFormsBundle('F-s0', o6, FP2), /did not finish/);
  // the eval folder's own identity.json is cross-checked even when the seal is made to agree with a doctored one (mutation M15): another arm, seed, model, data, protocol, views or addendum refuses
  const reseal = d => { const s = J(d + '/bundle_seal.json'); s.inner_identity_sha256 = hashF(d + '/eval/identity.json'); wj(d + '/bundle_seal.json', s); };
  for (const [what, mut] of [['arm', i => { i.arm = 'R'; }], ['seed', i => { i.seed = 1; }], ['model', i => { i.model.artifacts_sha256 = 'a'.repeat(64); }], ['train data', i => { i.train_data.train_sha256 = 'b'.repeat(64); }], ['protocol', i => { i.protocol_sha256 = 'c'.repeat(64); }], ['views', i => { i.views_manifest_sha256 = 'd'.repeat(64); }], ['addendum', i => { i.addendum_sha256 = 'e'.repeat(64); }]]) {
    const d = cp('inner-' + what.replace(' ', '')), i = J(d + '/eval/identity.json'); mut(i); wj(d + '/eval/identity.json', i); reseal(d);
    assert.throws(() => M.loadFormsBundle('F-s0', d, FP2), /the evaluation folder was not made for this identity/, what);
  }
  // the outer identity's membership, plan and protocol bindings are checked on their own (mutation M8): doctored identity + matching seal still refuse
  const resealOuter = d => { const s = J(d + '/bundle_seal.json'); s.identity_sha256 = sha256Of(JSON.stringify(J(d + '/campaign_identity.json'), (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v))); wj(d + '/bundle_seal.json', s); };
  for (const [key, val, re] of [['membership_sha256', 'a'.repeat(64), /another F membership/], ['plan_sha256', 'b'.repeat(64), /made under plan/], ['forms_protocol_sha256', 'c'.repeat(64), /another forms protocol/], ['campaign', 'x', /made for campaign/]]) {
    const d = cp('outer-' + key), i = J(d + '/campaign_identity.json'); i[key] = val; wj(d + '/campaign_identity.json', i); resealOuter(d); assert.throws(() => M.loadFormsBundle('F-s0', d, FP2), re, key);
  }
  const dp = cp('outer-parent'), ip = J(dp + '/campaign_identity.json'); ip.parent.addendum_sha256 = 'f'.repeat(64); wj(dp + '/campaign_identity.json', ip); resealOuter(dp); assert.throws(() => M.loadFormsBundle('F-s0', dp, FP2), /another parent protocol/);
  writeFileSync(tok + '/onnx/model_quantized.onnx_data', 'tampered after the evaluation'); assert.throws(() => M.loadFormsBundle('F-s0', out, FP2), /differs from the receipt|changed since the evaluation/);
});
test('claimBundle: new, identical resume, changed key refuses with the key named, foreign folder refuses', () => {
  const dir = TMP + '/claim', id = { a: 1, model: { x: 1 }, tool: { code: { f: 'h' } } };
  assert.equal(M.claimBundle(dir, id).resumed, false); assert.equal(M.claimBundle(dir, JSON.parse(JSON.stringify(id))).resumed, true);
  assert.throws(() => M.claimBundle(dir, { ...id, model: { x: 2 } }), /changed.*model\.x/); assert.throws(() => M.claimBundle(dir, { ...id, tool: { code: { f: 'g' } } }), /changed.*tool/);
  mkdirSync(TMP + '/fx'); assert.throws(() => M.claimBundle(TMP + '/fx', id), /not a forms bundle/);
});

// ---------------------------------------------------------------- applicability of the parent's B-s0 and C100-s0-v2 bundles (real files)
test('applicability: the parent B-s0 and C100-s0-v2 bundles are applicable to the current files; any changed code file, runtime, model or wrong name refuses', () => {
  const rec = M.applicabilityRecord(FP, 'B-s0', OLD + '/B-s0/eval');
  assert.equal(rec.status, 'applicable', JSON.stringify(rec.failed)); assert.ok(rec.checks.length > 150); assert.deepEqual(rec.failed, []); assert.equal(rec.bound.artifacts_sha256, J(OLD + '/B-s0/eval/identity.json').model.artifacts_sha256);
  const c = M.applicabilityRecord(FP, 'C100-s0', OLD + '/baseline/C100-s0-v2'); assert.equal(c.status, 'applicable', JSON.stringify(c.failed)); assert.ok(c.notes.some(x => /THREADS=5/.test(x)));
  // a changed measurement file in the root it is compared with
  const root = TMP + '/root-mutated', copyReal = p => { const dst = root + '/' + p; mkdirSync(dirname(dst), { recursive: true }); writeFileSync(dst, readFileSync(REPO + '/' + p)); };   // copies are regular files (the source may be a symlink, the copy never is)
  for (const p of Object.keys(J(OLD + '/B-s0/eval/identity.json').code)) copyReal(p);
  for (const p of M.MEASURE_CODE.concat(['docs/js/drawing-lines.js', 'training/neural/parity/canvas_lib.mjs', 'docs/js/logic.js', 'docs/js/vss-composer.js', 'training/sketch/layer_common.mjs', 'training/neural/parity/parity_lib.mjs'])) copyReal(p);
  assert.equal(M.applicabilityRecord(FP, 'B-s0', OLD + '/B-s0/eval', { root }).status, 'applicable');
  const victim = root + '/training/neural/parity/score_arm.mjs'; assert.ok(!lstatSync(victim).isSymbolicLink() && victim.startsWith(TMP + '/'), 'the file written is a regular file inside the temp folder, never a link into the repo');
  const repoBefore = hashF(REPO + '/training/neural/parity/score_arm.mjs');
  writeFileSync(victim, readFileSync(victim, 'utf8') + '\n// changed'); assert.equal(hashF(REPO + '/training/neural/parity/score_arm.mjs'), repoBefore);
  const bad = M.applicabilityRecord(FP, 'B-s0', OLD + '/B-s0/eval', { root }); assert.equal(bad.status, 'refused'); assert.ok(bad.failed.some(f => f.includes('score_arm.mjs')));
  const rt = M.applicabilityRecord(FP, 'B-s0', OLD + '/B-s0/eval', { runtime: { ...M.currentRuntime(), node: 'v1.0.0' } }); assert.equal(rt.status, 'refused'); assert.ok(rt.failed.some(f => f.includes('node')));
  const rt2 = M.applicabilityRecord(FP, 'B-s0', OLD + '/B-s0/eval', { runtime: { ...M.currentRuntime(), onnxruntime_node: '9.9.9' } }); assert.equal(rt2.status, 'refused');
  assert.throws(() => M.applicabilityRecord(FP, 'B-s1', OLD + '/B-s0/eval'), /not a reusable parent bundle/);
  assert.equal(M.applicabilityRecord(FP, 'C100-s0', OLD + '/B-s0/eval', { expected: M.REUSABLE['C100-s0'] }).status, 'refused');   // the B bundle is not the C100 one
  assert.throws(() => M.applicabilityRecord(FP, 'B-s0', TMP), /not a parent evaluation folder/);
  // a copy of the bundle with a changed model path / identity field refuses
  const cp = TMP + '/b-copy'; mkdirSync(cp + '/records', { recursive: true }); for (const f of ['identity.json', 'score.truthful.json']) cpSync(OLD + '/B-s0/eval/' + f, cp + '/' + f);
  for (const f of readdirSync(OLD + '/B-s0/eval/records').filter(x => x.endsWith('.manifest.json'))) cpSync(OLD + '/B-s0/eval/records/' + f, cp + '/records/' + f);
  assert.equal(M.applicabilityRecord(FP, 'B-s0', cp).status, 'applicable');
  const id = J(cp + '/identity.json'); id.addendum_sha256 = 'a'.repeat(64); wj(cp + '/identity.json', id); assert.equal(M.applicabilityRecord(FP, 'B-s0', cp).status, 'refused');
  id.addendum_sha256 = J(OLD + '/B-s0/eval/identity.json').addendum_sha256; id.code['docs/js/neural.js'] = '0'.repeat(64); wj(cp + '/identity.json', id); const r5 = M.applicabilityRecord(FP, 'B-s0', cp); assert.equal(r5.status, 'refused'); assert.ok(r5.failed.some(f => f.includes('docs/js/neural.js')));
  // a record manifest without a runtime is unverifiable, never applicable
  cpSync(OLD + '/B-s0/eval/identity.json', cp + '/identity.json'); const mf = cp + '/records/fresh2_test.jsonl.manifest.json', m = J(mf); delete m.runtime; wj(mf, m);
  const un = M.applicabilityRecord(FP, 'B-s0', cp); assert.equal(un.status, 'unverifiable'); assert.ok(un.unverified.length >= 1);
});
test('reused bundles load only with their own applicability record, still bound to the files; a refused or changed record fails', () => {
  const rec = M.applicabilityRecord(FP, 'B-s0', OLD + '/B-s0/eval'), f = TMP + '/appl-b.json'; wj(f, rec);
  const L = M.loadReusedBundle('B-s0', OLD + '/B-s0/eval', f, FP); assert.equal(L.kind, 'reused'); assert.equal(L.bundle.name, 'B-s0'); assert.equal(L.identity_sha256, rec.bound.identity_sha256);
  assert.throws(() => M.loadReusedBundle('C100-s0', OLD + '/B-s0/eval', f, FP), /not the applicability record of C100-s0/);
  const refused = { ...rec, status: 'refused', failed: ['code x'] }; wj(f + '2', refused); assert.throws(() => M.loadReusedBundle('B-s0', OLD + '/B-s0/eval', f + '2', FP), /says refused/);
  const unv = { ...rec, status: 'unverifiable', unverified: ['no runtime'] }; wj(f + '3', unv); assert.throws(() => M.loadReusedBundle('B-s0', OLD + '/B-s0/eval', f + '3', FP), /unverifiable/);
  const wrongDir = { ...rec, bundle_dir: TMP }; wj(f + '4', wrongDir); assert.throws(() => M.loadReusedBundle('B-s0', OLD + '/B-s0/eval', f + '4', FP), /not/);
  const tampered = { ...rec, bound: { ...rec.bound, score_truthful_sha256: '0'.repeat(64) } }; wj(f + '5', tampered); assert.throws(() => M.loadReusedBundle('B-s0', OLD + '/B-s0/eval', f + '5', FP), /changed since its applicability record/);
  const otherCampaign = { ...rec, campaign: 'x' }; wj(f + '6', otherCampaign); assert.throws(() => M.loadReusedBundle('B-s0', OLD + '/B-s0/eval', f + '6', FP), /another campaign/);
});

// ---------------------------------------------------------------- diagnose (cached B / R / C100-s0-v2 records): reconciles with the recorded scores
import { setItems } from './arm_lib.mjs';
test('diagnose: reconciliation with the recorded scores, 825 affected requests, the recorded right shares and the nl_a counts', () => {
  const run = M.runDiagnose(FP), arms = run.loaded.map(l => ({ name: l.name, spec: l.spec, score: l.score, idx: l.idx, stats: l.stats }));
  const d = M.diagnoseData({ arms, pops: run.pops, replacements: run.replacements, items: setItems });
  assert.equal(d.reconciliation_ok, true); assert.equal(d.reconciliation.length, 12);
  assert.equal(d.case_gap.B.requests, 825);
  assert.deepEqual([d.case_gap.C100.ungated_right_share_original_pct, d.case_gap.C100.ungated_right_share_lowercase_pct, d.case_gap.B.ungated_right_share_original_pct, d.case_gap.B.ungated_right_share_lowercase_pct, d.case_gap.R.ungated_right_share_original_pct, d.case_gap.R.ungated_right_share_lowercase_pct], [91.4, 73.1, 90.4, 74.2, 92.8, 76.2]);
  assert.deepEqual(Object.fromEntries(Object.entries(d.nl_a.executed_mistakes).map(([k, v]) => [k, v.wrong_plus_extras])), { C100: 6, B: 4, R: 9 });
  assert.equal(d.nl_a.parent_claim.R_executed_mistakes, 9); assert.equal(d.nl_a.parent_claim.B_same_reading_held, 5); assert.equal(d.nl_a.parent_claim.claim_checks_out, true);
  assert.equal(d.short3_lowercase.requests, 134); assert.match(d.short3_lowercase.note, /no original-case twin/);
  // every request row keeps origin id, group and the replaced names
  assert.ok(d.case_gap.requests.every(r => r.origin_id && r.group_key && r.replaced_names.length && r.B.orig_ungated && r.R.lc_gated));
  // the reconciliation really compares: a tampered recorded score is a mismatch, never silently equal
  const tampered = arms.map(a => (a.name === 'B' ? { ...a, score: { ...a.score, populations: { ...a.score.populations, lowercase_other_affected: { ...a.score.populations.lowercase_other_affected, ungated: { ...a.score.populations.lowercase_other_affected.ungated, right: 1 } } } } } : a));
  assert.equal(M.diagnoseData({ arms: tampered, pops: run.pops, replacements: run.replacements, items: setItems }).reconciliation_ok, false);
  // orphans: an unknown message or wire index in a population, a missing replacement, a changed gold, are rejected
  const pops = new Map(run.pops); const lc = pops.get('lowercase_other_affected');
  const withUnknown = { ...lc, requests: new Map([...lc.requests, ['nope#lc', new Set([0])]]) }; pops.set('lowercase_other_affected', withUnknown);
  assert.throws(() => M.diagnoseData({ arms, pops, replacements: run.replacements, items: setItems }), /unknown message|same|population has/);
  const pops2 = new Map(run.pops), first = [...lc.requests][0]; pops2.set('lowercase_other_affected', { ...lc, requests: new Map([[first[0], new Set([99])], ...[...lc.requests].slice(1)]) });
  assert.throws(() => M.diagnoseData({ arms, pops: pops2, replacements: run.replacements, items: setItems }), /indices differ|outside the message/);
  assert.throws(() => M.diagnoseData({ arms, pops: run.pops, replacements: run.replacements.filter(r => r.id !== [...run.pops.get('lowercase_other_affected').requests.keys()][0]), items: setItems }), /no recorded replacement/);
  assert.throws(() => M.diagnoseData({ arms, pops: new Map(), replacements: run.replacements, items: setItems }), /lacks lowercase_other_affected/);
  // a different state vocabulary: unread / held / wrong are distinguished
  const states = new Set(d.case_gap.requests.flatMap(r => [r.B.orig_ungated, r.B.lc_gated])); assert.ok(states.has('right') && states.has('wrong') && states.has('held-confidence'));
});
test('diagnose CLI: writes json, md and the per-request table into a fresh folder, refuses an existing one, exits nonzero without a protocol', () => {
  const out = TMP + '/diag-out', pf = mkProtocol();
  const r = spawnSync('node', [MEASURE, 'diagnose', '--protocol', pf, '--out', out], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /reconciliation ok \(12 checks\)/);
  const j = J(out + '/diagnostics.json'); assert.equal(j.reconciliation_ok, true); assert.equal(j.campaign, 'forms-test'); assert.ok(j.nl_a.parent_claim); assert.equal(readFileSync(out + '/case_gap.requests.jsonl', 'utf8').trim().split('\n').length, 825);
  assert.match(readFileSync(out + '/diagnostics.md', 'utf8'), /Parent claim/);
  const r2 = spawnSync('node', [MEASURE, 'diagnose', '--protocol', pf, '--out', out], { encoding: 'utf8' }); assert.notEqual(r2.status, 0); assert.match(r2.stderr, /exists/);
  assert.notEqual(spawnSync('node', [MEASURE, 'diagnose', '--out', TMP + '/d2'], { encoding: 'utf8' }).status, 0);
});

// ---------------------------------------------------------------- bound pass records: check-pass reloads the listed bundles (a hand-written verdict never unlocks a later stage)
const applCache = new Map();
const applOf = (FPo, name) => { const k = FPo.sha256 + name; if (!applCache.has(k)) { const f = TMP + '/appl-' + ++mk2 + '.json'; wj(f, M.applicabilityRecord(FPo, name, M.REUSABLE[name].dir)); applCache.set(k, f); } return applCache.get(k); };
/** the bundles of a stage under a world: forms bundles sealed by the stand-in evaluation, reused parent bundles with real applicability records -> {name: loaded} */
const stageBundles = async (W, pf, FPo, stage) => {
  const L = {};
  const forms = { seed0: ['F-s0'], control1: ['B-s1', 'C100-s1'] }[stage], reused = { seed0: ['B-s0', 'C100-s0'], control1: [] }[stage];
  for (const nm of forms) { const out = W.root + '/bundles/' + nm; if (!existsSync(out)) await sealedIn(W, pf, nm, out); L[nm] = M.loadFormsBundle(nm, out, FPo); }
  for (const nm of reused) { L[nm] = M.loadReusedBundle(nm, M.REUSABLE[nm].dir, applOf(FPo, nm), FPo); L[nm].applicability_file = applOf(FPo, nm); }
  return L;
};
const docOf = (FPo, stage, L, over = {}) => verdictDoc(FPo, stage, { bundles: Object.fromEntries(Object.entries(L).map(([k, l]) => [k, { kind: l.kind, dir: l.dir, identity_sha256: l.identity_sha256, score_sha256: l.score_sha256, ...(l.applicability_file ? { applicability_file: l.applicability_file } : {}) }])), ...over });
await atest('check-pass reloads the bundles: a valid record passes; no bundles, partial bundles, a bundle of another arm or a changed hash cannot unlock a later stage', async () => {
  const root = TMP + '/cp-world' + ++mk2, pf = protoOf(root), FPo = M.loadFormsProtocol(pf), W = mkWorld(FPo, root), L = await stageBundles(W, pf, FPo, 'seed0');
  const put = d => { const f = TMP + `/cpv-${++mk2}.json`; wj(f, d); return f; };
  assert.deepEqual(M.checkPassRecord(put(docOf(FPo, 'seed0', L)), 'seed0', FPo, null, { reload: true }).why, []);
  const cli = (f, stage = 'seed0') => spawnSync('node', [MEASURE, 'check-pass', '--protocol', pf, '--stage', stage, '--verdict', f], { encoding: 'utf8' });
  assert.equal(cli(put(docOf(FPo, 'seed0', L))).status, 0);
  const noB = put(docOf(FPo, 'seed0', L, { bundles: {} })); assert.equal(cli(noB).status, 1); assert.match(cli(noB).stdout, /missing from the seed0 verdict/);
  assert.equal(cli(put(docOf(FPo, 'seed0', L, { bundles: undefined }))).status, 1);
  const part = docOf(FPo, 'seed0', L); delete part.bundles['C100-s0']; assert.equal(cli(put(part)).status, 1);
  const forged = docOf(FPo, 'seed0', L); forged.bundles['F-s0'].identity_sha256 = 'a'.repeat(64); assert.equal(cli(put(forged)).status, 1); assert.match(cli(put(forged)).stdout, /differs from the one that passed/);
  const scoreForged = docOf(FPo, 'seed0', L); scoreForged.bundles['F-s0'].score_sha256 = 'a'.repeat(64); assert.equal(cli(put(scoreForged)).status, 1);
  // a hand-written record whose bundles omit dir / kind / applicability_file is refused (it would skip the reload and the comparison): aaaa-vs-bbbb hashes never pass
  for (const [what, mut] of [['dir', b => { delete b['F-s0'].dir; }], ['kind', b => { delete b['F-s0'].kind; }], ['unknown kind', b => { b['F-s0'].kind = 'x'; }], ['applicability_file of a reused bundle', b => { delete b['B-s0'].applicability_file; }], ['every dir', b => { for (const x of Object.values(b)) delete x.dir; }]]) {
    const d = docOf(FPo, 'seed0', L); mut(d.bundles); const f = put(d);
    assert.equal(cli(f).status, 1, what); assert.equal(M.checkPassRecord(f, 'seed0', FPo, L, { reload: true }).ok, false, what); assert.equal(M.checkPassRecord(f, 'seed0', FPo, L).ok, false, what);
  }
  const forgedNoDir = docOf(FPo, 'seed0', L); for (const [k, x] of Object.entries(forgedNoDir.bundles)) { delete x.dir; delete x.kind; delete x.applicability_file; x.identity_sha256 = 'a'.repeat(64); x.score_sha256 = 'b'.repeat(64); void k; }
  const fnd = put(forgedNoDir); assert.equal(cli(fnd).status, 1); assert.equal(M.checkPassRecord(fnd, 'seed0', FPo, L, { reload: true }).ok, false); assert.equal(M.checkPassRecord(fnd, 'seed0', FPo, L).ok, false);
  // with reload AND the given bundles: both are compared; a wrong hash is caught even with the right dir
  const wrongHash = docOf(FPo, 'seed0', L); wrongHash.bundles['F-s0'].identity_sha256 = 'a'.repeat(64); assert.ok(M.checkPassRecord(put(wrongHash), 'seed0', FPo, L, { reload: true }).why.filter(w => /differs/.test(w)).length >= 2);
  assert.equal(M.checkPassRecord(put(docOf(FPo, 'seed0', L)), 'seed0', FPo, L, { reload: true }).ok, true);
  assert.equal(M.checkPassRecord(put(docOf(FPo, 'seed0', L)), 'seed0', FPo, { 'F-s0': L['F-s0'] }, { reload: true }).ok, false);   // a bundle missing from the given set is not skipped
  const nowhere = docOf(FPo, 'seed0', L); nowhere.bundles['F-s0'].dir = TMP + '/nowhere'; assert.equal(cli(put(nowhere)).status, 1);
  const swapped = docOf(FPo, 'seed0', L); swapped.bundles['B-s0'].dir = M.REUSABLE['C100-s0'].dir; assert.equal(cli(put(swapped)).status, 1);
  const noAppl = docOf(FPo, 'seed0', L); delete noAppl.bundles['B-s0'].applicability_file; assert.equal(cli(put(noAppl)).status, 1);
  // a forms bundle whose files change after the verdict no longer reloads
  const tampered = docOf(FPo, 'seed0', L), f = tampered.bundles['F-s0'].dir + '/eval/confidence.json', keep = readFileSync(f); writeFileSync(f, '{"x":1}'); assert.equal(cli(put(tampered)).status, 1); writeFileSync(f, keep); assert.equal(cli(put(tampered)).status, 0);
  assert.equal(cli(put(docOf(FPo, 'seed0', L)), 'control1').status, 1);
});
test('F3 and P3 rows carry the Guard G rows with the clean subsets reported alongside, in verdict.json and in the md', () => {
  const g = GOOD(), f3 = M.rowF3(RULES, g.Fb, g.B, g.C), p3 = M.rowP3(RULES, g.B, g.C, { name: 'c', value: null, ok: true, status: 'pass' });
  assert.deepEqual(Object.keys(f3.guard), ['vs B-s0', 'vs C100-s0']); assert.deepEqual(Object.keys(p3.guard), ['vs C100-s0']);
  for (const rows of [...Object.values(f3.guard), ...Object.values(p3.guard)]) { assert.equal(rows.length, 3); for (const r of rows) assert.ok('clean_population_reported' in r && 'candidate_cost' in r && r.view); }
  const f = stageFixture('seed0'), FP2 = M.loadFormsProtocol(mkProtocol()), v = M.decide(FP2, 'seed0', { ...f, passes: {} }, RULES), md = M.renderVerdictMd(v);
  assert.ok(v.rows.find(r => r.id === 'F3').guard['vs C100-s0'] && v.rows.find(r => r.id === 'P3').guard['vs C100-s0']);
  assert.match(md, /Guard G vs B-s0, fresh2_test: candidate cost .*clean subset reported:/); assert.match(md, /Guard G vs C100-s0, nl_a_development/);
});
await atest('P4 binds the training folder, export and data to the arm: a run, receipt, seed or weights of another arm fails even when its own numbers are fine', async () => {
  const root = TMP + '/p4-world' + ++mk2, pf = protoOf(root), FPo = M.loadFormsProtocol(pf), W = mkWorld(FPo, root);
  await sealedIn(W, pf, 'F-s0', root + '/b/F-s0'); const Lf = M.loadFormsBundle('F-s0', root + '/b/F-s0', FPo), opts = { FP: FPo, reg: W.reg };
  assert.deepEqual(M.trainingChecks(Lf, W.reg.train['F-s0'], opts).filter(c => c.status !== 'pass'), []);
  const bad = (dir, what, o = opts) => assert.ok(M.trainingChecks(Lf, dir, o).some(c => c.status !== 'pass' && c.name.includes(what)), what);
  const other = W.run('F-s1'); bad(other.train, 'training folder is the registered one');
  bad(OLD + '/B-s0', 'training folder is the registered one');
  const seedOff = M.trainingChecks({ ...Lf, name: 'F-s1' }, W.reg.train['F-s1'], opts); assert.ok(seedOff.some(c => c.status !== 'pass'));
  W.run('F-s0', { seed: 1 }); bad(W.reg.train['F-s0'], 'run seed is 0'); W.run('F-s0', { weightsSha: 'f'.repeat(64) }); bad(W.reg.train['F-s0'], 'weights sha256');
  W.run('F-s0'); assert.deepEqual(M.trainingChecks(Lf, W.reg.train['F-s0'], opts).filter(c => c.status !== 'pass'), []);
  const wrongModel = { ...Lf, identity: { ...Lf.identity, model: { ...Lf.identity.model, dir: OLD + '/R-s0/export/modernbert-R-s0' } } }; assert.ok(M.trainingChecks(wrongModel, W.reg.train['F-s0'], opts).some(c => c.status !== 'pass' && c.name.includes('registered export')));
  const wrongData = { ...Lf, identity: { ...Lf.identity, train_data: { ...Lf.identity.train_data, dir: OLD + '/data/R' } } }; assert.ok(M.trainingChecks(wrongData, W.reg.train['F-s0'], opts).some(c => c.status !== 'pass' && c.name.includes('registered one')));
  // the real parent B-s0 run is bound as B-s0 (real registry)
  const b = N.loadBundle('B-s0', OLD + '/B-s0/eval'), real = M.trainingChecks({ name: 'B-s0', identity: b.identity, train_sha256: b.identity.train_data.train_sha256 }, OLD + '/B-s0', { FP, reg: M.registry() });
  assert.deepEqual(real.filter(c => c.status !== 'pass'), []); assert.ok(real.some(c => c.name.includes('binding')));
  assert.ok(M.trainingChecks({ name: 'B-s0', identity: b.identity, train_sha256: b.identity.train_data.train_sha256 }, OLD + '/B-s0', { FP, reg: M.registry() }).length > 20);
  const asS1 = M.trainingChecks({ name: 'B-s1', identity: b.identity, train_sha256: b.identity.train_data.train_sha256 }, OLD + '/B-s0', { FP, reg: M.registry() }); assert.ok(asS1.some(c => c.status !== 'pass'));
});

// ---------------------------------------------------------------- the task runner: refusals in test mode (never spawns a trainer, never takes the real GPU lock)
const runner = (args, env = {}) => spawnSync('bash', [RUNNER, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME, STOP_AT: '2099-01-01 00:00', ...env } });
/** a synthetic TASK: forms protocol-v2 (+SHA256SUMS), data-v2/F + manifest (the registered ones of a world), an optional ledger and verdicts that are bound to real bundles */
const mkRoot = async (ledgerLines = [], verdicts = {}) => {
  const root = TMP + '/taskroot' + ++mk2, pf = protoOf(root), FPo = M.loadFormsProtocol(pf), W = mkWorld(FPo, root);
  if (ledgerLines.length) { mkdirSync(root + '/budget'); writeFileSync(root + '/budget/trajectories.tsv', ledgerLines.join('\n') + '\n'); }
  for (const [stage, over] of Object.entries(verdicts)) wj(`${root}/verdicts/${stage}/verdict.json`, docOf(FPo, stage, over.__noBundles ? {} : await stageBundles(W, pf, FPo, stage), over.__noBundles ? { ...over, bundles: undefined } : over));
  return { root, pf, FPo, W, pins: { TRAIN_ARM_PIN_FPROTO: hashF(pf), TRAIN_ARM_PIN_FMAN: hashF(root + '/data-v2/F.manifest.json') } };
};
const FMAN = R => R.pins.TRAIN_ARM_PIN_FMAN, RECIPE = 'epochs=8 lr=6e-5 head_lr=6e-5 batch=32 cut_batch=8 gpu_limit_gib=5 overfit_gate=300s';
const dryEnv = (R, lock, extra = {}) => ({ TRAIN_ARM_DRY: '1', TRAIN_ARM_TEST_ROOT: R.root, TRAIN_ARM_LOCK: lock, TRAIN_ARM_LOCK_WAIT: '2', ...R.pins, ...extra });
await atest('runner: only F 0, B 1 and F 1 are allowed; the test-mode variables are refused outside test mode; a missing deadline or a near deadline refuses', async () => {
  assert.ok(existsSync(RUNNER), 'the runner exists');
  const R = await mkRoot(), lock = TMP + '/lock-a'; writeFileSync(lock, '');
  for (const a of [['B', '0'], ['F', '2'], ['R', '0'], ['C100', '1'], ['S', '0'], ['F', ''], []]) { const r = runner(a, dryEnv(R, lock)); assert.equal(r.status, 9, a.join(' ') + r.stdout + r.stderr); assert.match(r.stdout, /not one of the declared/); }
  const r1 = runner(['F', '0'], { TRAIN_ARM_TEST_ROOT: R.root }); assert.equal(r1.status, 9); assert.match(r1.stdout, /refused without TRAIN_ARM_DRY=1/);
  assert.equal(runner(['F', '0'], { TRAIN_ARM_LOCK: lock }).status, 9);
  assert.equal(runner(['F', '0'], { TRAIN_ARM_PIN_FPROTO: R.pins.TRAIN_ARM_PIN_FPROTO }).status, 9); assert.equal(runner(['F', '0'], { TRAIN_ARM_PIN_FMAN: 'x' }).status, 9);
  const r3 = runner(['F', '0'], { TRAIN_ARM_DRY: '1' }); assert.equal(r3.status, 9); assert.match(r3.stdout, /needs TRAIN_ARM_TEST_ROOT and TRAIN_ARM_LOCK/);
  assert.notEqual(runner(['F', '0'], { ...dryEnv(R, lock), STOP_AT: '' }).status, 0);
  const r5 = runner(['F', '0'], dryEnv(R, lock, { STOP_AT: '2000-01-01 00:00' })); assert.equal(r5.status, 9); assert.match(r5.stdout, /too close to the deadline/);
  assert.notEqual(spawnSync('bash', [RUNNER, 'F', '0'], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME } }).status, 0);
  assert.ok(!existsSync(R.root + '/F-s0') && !existsSync(R.root + '/budget/.lock'));
});
await atest('runner: the forms protocol-v2 and the F manifest are the pinned ones (the superseded v1 folders and any other hash are refused)', async () => {
  const R = await mkRoot(), lock = TMP + '/lock-pin'; writeFileSync(lock, '');
  assert.equal(runner(['F', '0'], dryEnv(R, lock)).status, 0);
  let r = runner(['F', '0'], dryEnv(R, lock, { TRAIN_ARM_PIN_FPROTO: 'a'.repeat(64) })); assert.equal(r.status, 9); assert.match(r.stdout, /is not the pinned/);
  r = runner(['F', '0'], dryEnv(R, lock, { TRAIN_ARM_PIN_FMAN: 'b'.repeat(64) })); assert.equal(r.status, 9); assert.match(r.stdout, /is not the pinned/);
  const v1 = TMP + '/taskroot-v1' + ++mk2; mkdirSync(v1 + '/protocol', { recursive: true }); mkdirSync(v1 + '/data', { recursive: true }); wj(v1 + '/data/F.manifest.json', { arm: 'F' }); wj(v1 + '/protocol/protocol.json', {});
  r = runner(['F', '0'], { ...dryEnv({ root: v1, pins: R.pins }, lock) }); assert.equal(r.status, 9); assert.match(r.stdout, /forms protocol missing: .*protocol-v2/);
  assert.equal(runner(['B', '1'], dryEnv({ root: v1, pins: R.pins }, lock)).status, 9);
  const s = readFileSync(RUNNER, 'utf8'); assert.ok(s.includes('61524cc13da0f20a0212def83b7f0855e6bad557fdfd99b3ceb3e36b857d2f39') && s.includes('d6250c7082e3eccd3788ed55c894f131c4d557f9fa60b327f635dc500e21d7c3') && s.includes('$TASK/protocol-v2/protocol.json') && s.includes('$TASK/data-v2/F'));
  assert.equal(hashF(CACHE + '/forms-2026-11-08/protocol-v2/protocol.json'), '61524cc13da0f20a0212def83b7f0855e6bad557fdfd99b3ceb3e36b857d2f39'); assert.equal(hashF(CACHE + '/forms-2026-11-08/data-v2/F.manifest.json'), 'd6250c7082e3eccd3788ed55c894f131c4d557f9fa60b327f635dc500e21d7c3');
  // evaluate and verdict accept the forms protocol-v2 (the real frozen one)
  const real = M.loadFormsProtocol(CACHE + '/forms-2026-11-08/protocol-v2/protocol.json'); assert.equal(real.sha256, '61524cc13da0f20a0212def83b7f0855e6bad557fdfd99b3ceb3e36b857d2f39'); assert.equal(real.membership_sha256.slice(0, 8), '57a5242c');
});
await atest('runner: B 1 needs a passing seed0 verdict bound to real bundles, F 1 needs passing seed0 and control1 verdicts; a failing, foreign, bundle-less or forged verdict refuses before any trainer could start', async () => {
  const lock = TMP + '/lock-b'; writeFileSync(lock, '');
  const b1 = R => runner(['B', '1'], dryEnv(R, lock)), f1 = R => runner(['F', '1'], dryEnv(R, lock));
  let r = b1(await mkRoot()); assert.equal(r.status, 9); assert.match(r.stdout, /prerequisite missing: passing seed0 verdict/);
  r = b1(await mkRoot([], { seed0: { pass: false } })); assert.equal(r.status, 9); assert.match(r.stdout, /prerequisite not met/);
  r = b1(await mkRoot([], { seed0: { campaign: 'other' } })); assert.equal(r.status, 9);
  r = b1(await mkRoot([], { seed0: { stage: 'control1' } })); assert.equal(r.status, 9);
  r = b1(await mkRoot([], { seed0: { rows: [{ id: 'F1', status: 'fail', pass: false }] } })); assert.equal(r.status, 9);
  r = b1(await mkRoot([], { seed0: { __noBundles: true } })); assert.equal(r.status, 9); assert.match(r.stdout, /prerequisite not met/);                 // a hand-written verdict without bundles
  const forged = await mkRoot([], { seed0: {} }); const vf = forged.root + '/verdicts/seed0/verdict.json', d = J(vf); d.bundles['F-s0'].identity_sha256 = 'a'.repeat(64); wj(vf, d); assert.equal(b1(forged).status, 9);
  r = f1(await mkRoot([], { seed0: {} })); assert.equal(r.status, 9); assert.match(r.stdout, /passing control1 verdict/);
  r = f1(await mkRoot([], { control1: {} })); assert.equal(r.status, 9); assert.match(r.stdout, /passing seed0 verdict/);
  r = f1(await mkRoot([], { seed0: {}, control1: { pass: false } })); assert.equal(r.status, 9);
  r = b1(await mkRoot([], { seed0: {} })); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /DRY: would verify data/);       // B's real data manifest is the pinned one
  r = f1(await mkRoot([], { seed0: {}, control1: {} })); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /DRY: would verify data/);
});
await atest('runner: the budget ledger refuses a 4th trajectory, allows the identical trajectory to resume, refuses a changed one, and test mode never writes it', async () => {
  const lock = TMP + '/lock-c'; writeFileSync(lock, '');
  const three = [`X-s0\t${'a'.repeat(64)}\t${RECIPE}\tt`, `Y-s1\t${'b'.repeat(64)}\t${RECIPE}\tt`, `Z-s1\t${'c'.repeat(64)}\t${RECIPE}\tt`];
  let R = await mkRoot(three); let r = runner(['F', '0'], dryEnv(R, lock)); assert.equal(r.status, 9); assert.match(r.stdout, /budget exhausted: 3 trajectories/);
  R = await mkRoot(); mkdirSync(R.root + '/budget'); writeFileSync(R.root + '/budget/trajectories.tsv', [`F-s0\t${FMAN(R)}\t${RECIPE}\tt`, three[1], three[2]].join('\n') + '\n');
  r = runner(['F', '0'], dryEnv(R, lock)); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /identical trajectory: resume allowed/);
  const changed = await mkRoot([`F-s0\t${'0'.repeat(64)}\t${RECIPE}\tt`]); r = runner(['F', '0'], dryEnv(changed, lock)); assert.equal(r.status, 9); assert.match(r.stdout, /other data or recipe/);
  const otherRecipe = await mkRoot(); mkdirSync(otherRecipe.root + '/budget'); writeFileSync(otherRecipe.root + '/budget/trajectories.tsv', `F-s0\t${FMAN(otherRecipe)}\tepochs=9\tt\n`); assert.equal(runner(['F', '0'], dryEnv(otherRecipe, lock)).status, 9);
  const fresh = await mkRoot(); r = runner(['F', '0'], dryEnv(fresh, lock)); assert.equal(r.status, 0, r.stdout + r.stderr); assert.ok(!existsSync(fresh.root + '/budget') && !existsSync(fresh.root + '/F-s0'));
  const ex = await mkRoot(); mkdirSync(ex.root + '/F-s0/export', { recursive: true }); r = runner(['F', '0'], dryEnv(ex, lock)); assert.equal(r.status, 9); assert.match(r.stdout, /export exists/);
  const noman = await mkRoot(); rmSync(noman.root + '/data-v2/F.manifest.json'); r = runner(['F', '0'], dryEnv(noman, lock)); assert.equal(r.status, 9); assert.match(r.stdout, /data manifest missing/);
});
await atest('runner: an occupied GPU lock is respected (the runner waits, then gives up without killing the holder)', async () => {
  const lock = TMP + '/lock-held'; writeFileSync(lock, '');
  const holder = spawn('flock', [lock, 'sleep', '30'], { stdio: 'ignore', detached: true });
  await new Promise(res => setTimeout(res, 500));
  const R = await mkRoot(), t0 = Date.now(), r = runner(['F', '0'], dryEnv(R, lock, { TRAIN_ARM_LOCK_WAIT: '2' }));
  assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stdout, /GPU lock not free within 2s \(holder left alone\)/); assert.ok(Date.now() - t0 >= 1900, 'it waited');
  assert.equal(holder.exitCode, null); assert.equal(holder.signalCode, null); assert.doesNotThrow(() => process.kill(holder.pid, 0));
  assert.notEqual(spawnSync('flock', ['-n', lock, 'true']).status, 0);
  process.kill(-holder.pid, 'SIGTERM'); await new Promise(res => holder.on('exit', res)); await new Promise(res => setTimeout(res, 300));   // this synthetic holder is the test's own (never a real lock holder)
  assert.equal(runner(['F', '0'], dryEnv(await mkRoot(), lock)).status, 0);
});
test('runner: the real script keeps the parent\'s recipe flags, deadline, overfit gate, shared lock and export refusal, pins the B manifest in full, and exports with the parent protocol', () => {
  const s = readFileSync(RUNNER, 'utf8'), old = readFileSync(OLD + '/bin/train_arm.sh', 'utf8');
  for (const piece of ['--epochs 8 --lr 6e-5 --head-lr 6e-5 --batch 32 --cut-batch 8 --gpu-limit-gib 5', '--overfit-gate', 'timeout 300', 'flock -w "$LEFT" "$LOCK" true', 'too close to the deadline', 'export exists: refusing', '--expect-manifest "$MAN"', 'GPU-905b8484-3b1e-30f6-defd-05d44f00f692']) { assert.ok(old.includes(piece), 'parent runner has ' + piece); assert.ok(s.includes(piece), piece); }
  assert.ok(s.includes('2b102ef3f901eb25e3e38e49b6daa664ac740c5376b1b11a8aba806bd6bfa7e6')); assert.ok(s.includes('arm_export.py --work "$W/run" --data "$DATA" --protocol "$PROTO"') && s.includes('PROTO=$OLD/protocol-v2/protocol.json'));
  assert.ok(s.includes('modernbert_forms_data.py verify --protocol "$FPROTO" --data "$DATA"') && s.includes('modernbert_next_data.py verify --protocol "$PROTO" --data "$DATA"'));
  assert.ok(!/\brm\b|kill|pkill/.test(s.replace(/#.*$/gm, '').replace(/never kill/g, '')), 'the runner never deletes or kills');
  assert.equal(hashF(OLD + '/data/B.manifest.json'), '2b102ef3f901eb25e3e38e49b6daa664ac740c5376b1b11a8aba806bd6bfa7e6');
});

console.log(`\n${n} checks passed${process.exitCode ? ' (with failures above)' : ''}`);
