// modernbert_forms_measure.mjs: the diagnostic, evaluation and verdict adapter of the ModernBERT "forms" campaign
// (reports/modernbert-forms-plan-2026-11-08_codex.md: "Calibration and measurement", "Cheap diagnostics", "Proposed command interfaces", F1-F4, P3, P4, Guard G).
// It consumes the exported primitives of modernbert_next_measure.mjs (evaluateArm, pairwise, guardG, seedAveragedInterval, labelErrors, loadBundle ...) and adds no scoring rule:
// the judge, the denominators and the intervals are the parent's. It adds new campaign identities and new criterion names (F1, F2, F3, F4, P3, G); the old C15-C23 are not read.
//
//   node modernbert_forms_measure.mjs diagnose     --protocol P --out DIR
//   node modernbert_forms_measure.mjs evaluate     --protocol P --arm B|F|C100 --seed 0|1 --model DIR --train-data DIR --out DIR [--no-external] [--legacy-records A,B,C   (C100 only)]
//   node modernbert_forms_measure.mjs applicability --protocol P --name B-s0|C100-s0 --eval-dir DIR --out FILE      (reuse of an old bundle of the parent campaign)
//   node modernbert_forms_measure.mjs verdict      --protocol P --stage seed0|control1|confirmation --bundle NAME=DIR ... --out DIR
//                  [--evidence NAME=FILE ...] [--training NAME=DIR ...] [--applicability NAME=FILE ...] [--seed0-pass FILE] [--control1-pass FILE]
//   bundle names: F-s0 B-s0 C100-s0 F-s1 B-s1 C100-s1. A forms bundle is the --out folder of `evaluate`; a reused parent bundle (B-s0, C100-s0) is the parent's eval folder
//   plus its applicability record. Commands exit nonzero on failure; verdict exits nonzero unless the stage passes. Nothing is written to the parent campaign's folders.
//
// Rules of this file (the parent's, kept): a missing or nonfinite metric, interval, population, record, executions=0, null risk or unsupported population is never a pass;
// an output folder that exists is refused unless it holds the identical identity (resume); a changed identity refuses.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync, openSync, closeSync, constants as FS } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { hashFile, digest } from '../calibrate_modernbert.mjs';
import { confidence } from '../../../docs/js/neural-confidence.js';
import { loadViewDir, loadPopulations, loadRecords, truthfulItemsOf, rawArgsOf, setItems } from './arm_lib.mjs';
import { decideTruthful, truthfulPopulation, scoredItems } from './score_arm.mjs';
import { filesOf } from './collect_set.mjs';
import { RESAMPLES, SEED, MIN_UNITS } from './compare_arms.mjs';
import * as N from './modernbert_next_measure.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), REPO = resolve(HERE, '../../..');
export const CACHE = homedir() + '/.cache/diagram-vss-modernbert';
export const OLD = CACHE + '/next-2026-11-08';                // the parent campaign: READ ONLY
export const TASK = CACHE + '/forms-2026-11-08';
export const PLAN_FILE = resolve(REPO, 'reports/modernbert-forms-plan-2026-11-08_codex.md');
export const PARENT = {
  protocol: OLD + '/protocol-v2/protocol.json', protocol_sha256: '3999991890f1a92b811fbe0cde86ccdf35ca38e71606b45d0ec14ea5dc872e78',
  views: OLD + '/views', views_manifest_sha256: 'df4abeeeec0e1948e3b8220d6c670d259cebe938e4765921d0f161ff0506cf5a',
  addendum: OLD + '/frozen-lists/decision-rules-addendum.json', addendum_sha256: '304a1be5fb5a27f944ce588a24e16e39676b497a860f4fd3a153b955dcdc1b19',
};
export const ARMS = { 'F-s0': ['F', 0], 'F-s1': ['F', 1], 'B-s0': ['B', 0], 'B-s1': ['B', 1], 'C100-s0': ['C100', 0], 'C100-s1': ['C100', 1] };
/** the (arm, seed) pairs `evaluate` accepts: F s0/s1, B s1 (B s0 is the parent's, reused through `applicability`), C100 s1 (C100 s0 likewise) */
export const EVALUABLE = ['F-s0', 'F-s1', 'B-s1', 'C100-s1'];
export const fin = N.fin;
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const r4 = x => (x == null || !fin(x) ? null : Math.round(x * 1e6) / 1e6);
const writeAtomic = (p, text) => { const t = p + '.tmp-' + process.pid; writeFileSync(t, text); renameSync(t, p); };
const stable = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v));
const same = (a, b) => stable(a) === stable(b);

// ---------------------------------------------------------------- the forms protocol and the fixed numbers
/** The numbers of the plan, verbatim (plan: Guard G; F1; F2; F3; F4). Each is also required to EQUAL the parent's frozen constant of the same quantity (assertRulesMatch):
 *  the plan keeps "the existing ... numerical form/safety bars", so a parent protocol that differs refuses the run instead of silently deciding. */
export const FORMS_RULES = Object.freeze({
  guard: { cost_diff_min: -5, wrong_extras_per_100_max_increase: 1 },
  f1_t1_clean_cost_min_gain: 5,
  form_bars: { outline_question: 0.9, outline_create: 0.9, outline_set: 0.9, label_removal: 0.9, description_size: 0.8, bare_move: 0.95 },
  undo_redo_count_min: 0.9,
  label_setting_max_drop_points: 2, label_gated_empty_on_nonempty_max: 0,
  lowercase_max_drop_points: 2, lowercase_max_confident_mistakes_per_100_increase: 1,
});
/** the parent's rules (protocol-v2 decision_rules + addendum, merged) must hold the same numbers; -> FORMS_RULES */
export function assertRulesMatch(parentRules, rules = FORMS_RULES) {
  const want = [
    ['guard.cost_diff_min', rules.guard.cost_diff_min], ['guard.wrong_extras_per_100_max_increase', rules.guard.wrong_extras_per_100_max_increase], ['S_vs_R.t1_clean_cost_min_gain', rules.f1_t1_clean_cost_min_gain],
    ...Object.entries(rules.form_bars).map(([k, v]) => ['form_bars.' + k, v]), ['undo_redo_count_min', rules.undo_redo_count_min], ['label_setting_max_drop_points', rules.label_setting_max_drop_points],
    ['label_setting_gated_wrong_empty_on_nonempty_max', rules.label_gated_empty_on_nonempty_max], ['lowercase_max_drop_points', rules.lowercase_max_drop_points],
    ['R_vs_B.lowercase_population_max_confident_mistakes_per_100_increase', rules.lowercase_max_confident_mistakes_per_100_increase],
  ];
  for (const [path, v] of want) {
    const got = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), parentRules);
    if (got !== v) throw new Error(`the parent's frozen decision rule ${path} is ${JSON.stringify(got)}, the forms plan keeps ${JSON.stringify(v)}: refusing to decide between them`);
  }
  return rules;
}
const pick = (o, paths) => { for (const p of paths) { const v = p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o); if (v !== undefined && v !== null) return v; } return undefined; };
function checkSums(dir, file) {
  const sums = resolve(dir, 'SHA256SUMS');
  if (!existsSync(sums)) throw new Error(`${dir}: no SHA256SUMS: not a frozen protocol folder`);
  const listed = new Set();
  for (const l of readFileSync(sums, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    const m = /^([0-9a-f]{64})  (.+)$/.exec(l);
    if (!m) throw new Error(`${sums}: bad line ${JSON.stringify(l)}`);
    const p = resolve(dir, m[2]);
    if (!existsSync(p)) throw new Error(`${dir}: ${m[2]} is listed in SHA256SUMS and missing`);
    if (hashFile(p) !== m[1]) throw new Error(`${dir}: ${m[2]} differs from SHA256SUMS`);
    listed.add(m[2]);
  }
  if (!listed.has(basename(file))) throw new Error(`${sums} does not list ${basename(file)}`);
}
/** The forms protocol (frozen folder with SHA256SUMS). Keys read (the first present of each list; the loader names what is missing):
 *    campaign id        protocol.campaign.id | campaign.id | campaign_id | protocol.campaign_id | protocol.campaign (string) | campaign (string)
 *    F membership hash  membership.F.sha256 | protocol.membership.F.sha256 | f_membership_sha256 | protocol.f_membership_sha256
 *  Optional cross-checks, refused when present and different: plan sha256 (plan.sha256 | plan_sha256 | protocol.plan_sha256) against the plan file's hash; parent protocol sha256
 *  (parent.protocol.sha256 | parent.protocol_sha256 | protocol.parent_protocol_sha256) against PARENT. The parent files themselves are hashed against PARENT here. */
export function loadFormsProtocol(file, { parent = PARENT, planFile = PLAN_FILE } = {}) {
  const path = resolve(file), dir = dirname(path);
  if (!existsSync(path)) throw new Error(`${path}: no forms protocol`);
  checkSums(dir, path);
  const P = J(path);
  const campaign = pick(P, ['protocol.campaign.id', 'campaign.id', 'campaign_id', 'protocol.campaign_id', 'protocol.campaign', 'campaign']);
  if (typeof campaign !== 'string' || !campaign) throw new Error(`${path}: no campaign id (campaign.id | campaign_id | protocol.campaign...)`);
  const membership = pick(P, ['membership.F.sha256', 'protocol.membership.F.sha256', 'f_membership_sha256', 'protocol.f_membership_sha256']);
  if (!/^[0-9a-f]{64}$/.test(membership ?? '')) throw new Error(`${path}: no F membership sha256 (membership.F.sha256 | f_membership_sha256)`);
  if (!existsSync(planFile)) throw new Error(`${planFile}: the plan file is missing`);
  const plan = { file: planFile, sha256: hashFile(planFile) }, statedPlan = pick(P, ['plan.sha256', 'plan_sha256', 'protocol.plan_sha256', 'protocol.plan.sha256']);
  if (statedPlan !== undefined && statedPlan !== plan.sha256) throw new Error(`${path}: it names plan ${String(statedPlan).slice(0, 12)}, the plan file is ${plan.sha256.slice(0, 12)}`);
  const statedParent = pick(P, ['parent.protocol.sha256', 'parent.protocol_sha256', 'protocol.parent_protocol_sha256', 'parent_protocol_sha256']);
  if (statedParent !== undefined && statedParent !== parent.protocol_sha256) throw new Error(`${path}: it names parent protocol ${String(statedParent).slice(0, 12)}, the campaign's is ${parent.protocol_sha256.slice(0, 12)}`);
  for (const [what, f, sha] of [['parent protocol', parent.protocol, parent.protocol_sha256], ['parent views manifest', parent.views + '/manifest.json', parent.views_manifest_sha256], ['parent addendum', parent.addendum, parent.addendum_sha256]]) {
    if (!existsSync(f)) throw new Error(`${what} ${f} is missing`);
    if (hashFile(f) !== sha) throw new Error(`${what} ${f} differs from the campaign's frozen hash ${sha.slice(0, 12)}`);
  }
  return { file: path, dir, sha256: hashFile(path), P, campaign, plan, membership_sha256: membership, parent };
}
/** the parent's merged protocol (protocol-v2 + addendum) with the forms numbers checked against it */
export function parentProtocol(FP) {
  const PR = N.withAddendum(N.loadProtocol(FP.parent.protocol), FP.parent.addendum);
  assertRulesMatch(PR.rules);
  return PR;
}

// ---------------------------------------------------------------- diagnose: cached B / R / C100 records only, no inference
const DIAG_ARMS = [['C100', OLD + '/baseline/C100-s0-v2'], ['B', OLD + '/B-s0/eval'], ['R', OLD + '/R-s0/eval']];
const DIAG_VIEWS = ['fresh2_test', 'lowercase_other', 'short3_test', 'nl_a_development'];
const GOLD_KEY = (id, j) => id + '#' + j;
/** the per-message decisions of one arm: ungated and at the arm's own cost-10 threshold, from the arm's own confidence file (the scorer's code path) */
export function armIndex(records, spec) {
  const thr = spec?.levels_out_of_fold?.cost?.threshold;
  if (!fin(thr)) throw new Error('the arm has no finite cost-10 threshold');
  const { items } = truthfulItemsOf(records), scored = scoredItems(items, spec), un = decideTruthful(scored, null), ga = decideTruthful(scored, thr), byId = new Map();
  records.forEach(r => byId.set(r.id, { rec: r, ungated: [], gated: [] }));
  un.forEach(x => byId.get(x.id).ungated.push(x)); ga.forEach(x => byId.get(x.id).gated.push(x));
  return { thr, byId, records };
}
/** the state of gold request j of an indexed message: right | wrong (executed) | held-structural | held-confidence | unread (no produced request is paired with it) */
export function stateOf(entry, j, level) {
  const list = entry[level].filter(x => x.g === j);
  if (!list.length) return 'unread';
  const x = list.find(y => y.o === 'right') ?? list[0];
  return x.execute ? x.o : x.hold === 'structural' ? 'held-structural' : 'held-confidence';
}
const matrix = (pairs) => { const m = {}; for (const [a, b] of pairs) { const k = a + ' -> ' + b; m[k] = (m[k] || 0) + 1; } return Object.fromEntries(Object.keys(m).sort().map(k => [k, m[k]])); };
const popStats = (idx, records, pop) => { const { tallies, ...s } = truthfulPopulation(records.filter(r => pop.requests.has(r.id)), idx.spec, idx.thr, pop); return s; };
const pct = (n, d) => (d ? Math.round(1000 * n / d) / 10 : null);
const spanKey = x => x.span.join('-');
const readingKey = x => stable(x.got ?? null);
/** the identity of a produced request across arms: message, span, raw formalization */
export const joinKey = x => `${x.id}|${spanKey(x)}|${readingKey(x)}`;

/** (1) original case against lowercase on the same frozen affected request indices; (2) short3_lowercase per arm (no original-case twin exists); (3) nl_a wrong/extra proposals joined across arms */
export function diagnoseData({ arms, pops, replacements, items }) {
  // arms: [{name, spec, score, idx: armIndex(...) per view}]  pops: Map(name -> {requests})  items(view): view items
  const out = { reconciliation: [], case_gap: {}, short3_lowercase: {}, nl_a: {} };
  const lcPop = pops.get('lowercase_other_affected'), origPop = pops.get('lowercase_other_affected_original_case'), s3Pop = pops.get('short3_lowercase');
  if (!lcPop || !origPop || !s3Pop) throw new Error('the views folder lacks lowercase_other_affected, its original-case twin or short3_lowercase');
  // alignment of the two populations: the lowercase message's origin, group and wire indices equal the original's; the replaced names come from the replacement list
  const lcItems = new Map(items('lowercase_other').map(i => [i.id, i])), f2Items = new Map(items('fresh2_test').map(i => [i.id, i]));
  const rep = new Map();
  for (const r of replacements) { const k = GOLD_KEY(r.id, r.wire_index); (rep.get(k) || rep.set(k, []).get(k)).push(r); }
  const rows = [];
  if (lcPop.requests.size !== origPop.requests.size) throw new Error(`the original-case population has ${origPop.requests.size} messages, the lowercase one ${lcPop.requests.size}`);
  for (const [id, idxSet] of lcPop.requests) {
    const li = lcItems.get(id);
    if (!li) throw new Error(`lowercase population: unknown message ${id}`);
    const origin = li.origin_id, oi = f2Items.get(origin), os = origPop.requests.get(origin);
    if (!origin || !oi || !os) throw new Error(`${id}: origin ${origin} is not a message of the original-case population`);
    if (oi.group_key !== li.group_key) throw new Error(`${id}: its group ${li.group_key} differs from its origin's ${oi.group_key}`);
    if (!same([...idxSet].sort(), [...os].sort())) throw new Error(`${id}: the affected request indices differ between the lowercase and the original-case population`);
    for (const j of idxSet) {
      if (!li.wires[j] || !oi.wires[j]) throw new Error(`${id}: wire index ${j} is outside the message`);
      if (!same(li.wires[j].args, oi.wires[j].args)) throw new Error(`${id} wire ${j}: the gold arguments differ between the original and the lowercase message`);
      const names = (rep.get(GOLD_KEY(id, j)) || []).map(r => r.name);
      if (!names.length) throw new Error(`${id} wire ${j}: no recorded replacement for an affected request`);
      for (const r of rep.get(GOLD_KEY(id, j))) if (r.origin_id !== origin) throw new Error(`${id}: a replacement names origin ${r.origin_id}, the message's is ${origin}`);
      rows.push({ id, origin_id: origin, group_key: li.group_key, wire_index: j, action: li.wires[j].args?.action ?? null, replaced_names: names });
    }
  }
  const reqCount = [...lcPop.requests.values()].reduce((n, s) => n + s.size, 0);
  if (rows.length !== reqCount) throw new Error('the request rows do not equal the population size');
  for (const a of arms) {
    const lcI = a.idx.lowercase_other, oI = a.idx.fresh2_test;
    for (const row of rows) {
      const lc = lcI.byId.get(row.id), o = oI.byId.get(row.origin_id);
      if (!lc || !o) throw new Error(`${a.name}: no record for ${row.id} or ${row.origin_id}`);
      row[a.name] = { orig_ungated: stateOf(o, row.wire_index, 'ungated'), lc_ungated: stateOf(lc, row.wire_index, 'ungated'), orig_gated: stateOf(o, row.wire_index, 'gated'), lc_gated: stateOf(lc, row.wire_index, 'gated') };
    }
  }
  // reconciliation against each arm's recorded score numbers (a mismatch is a join bug, never a footnote)
  const reconcile = (arm, name, got, want) => out.reconciliation.push({ arm, population: name, ok: same({ u: got.ungated, g: got.gated }, { u: want?.ungated, g: want?.gated }), ungated_requested: got.ungated?.requested, right_ungated: got.ungated?.right });
  for (const a of arms) {
    reconcile(a.name, 'lowercase_other_affected', a.stats.lc, a.score.populations.lowercase_other_affected);
    reconcile(a.name, 'lowercase_other_affected_original_case', a.stats.orig, a.score.populations.lowercase_other_affected_original_case);
    reconcile(a.name, 'short3_lowercase', a.stats.s3, a.score.populations.short3_lowercase);
    reconcile(a.name, 'nl_a_development (part)', a.stats.nl, a.score.sets.nl_a_development.development);
  }
  out.reconciliation_ok = out.reconciliation.every(x => x.ok);
  // case gap per arm and transitions
  const names = arms.map(a => a.name);
  for (const a of arms) {
    const n = rows.length, share = k => pct(rows.filter(r => r[a.name][k] === 'right').length, n);
    out.case_gap[a.name] = {
      requests: n, ungated_right_share_original_pct: share('orig_ungated'), ungated_right_share_lowercase_pct: share('lc_ungated'), gated_right_share_original_pct: share('orig_gated'), gated_right_share_lowercase_pct: share('lc_gated'),
      ungated_gap_points: r4(share('orig_ungated') - share('lc_ungated')), gated_gap_points: r4(share('orig_gated') - share('lc_gated')),
      ungated_transitions_original_to_lowercase: matrix(rows.map(r => [r[a.name].orig_ungated, r[a.name].lc_ungated])), gated_transitions_original_to_lowercase: matrix(rows.map(r => [r[a.name].orig_gated, r[a.name].lc_gated])),
      gated_confident_mistakes_per_100_requested: { original: a.stats.orig.gated?.wrong_plus_extras_per_100_requested ?? null, lowercase: a.stats.lc.gated?.wrong_plus_extras_per_100_requested ?? null },
      names_right_in_original_wrong_in_lowercase: (() => { const c = {}; for (const r of rows) if (r[a.name].orig_ungated === 'right' && r[a.name].lc_ungated !== 'right') for (const nm of r.replaced_names) c[nm] = (c[nm] || 0) + 1; return Object.fromEntries(Object.entries(c).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 25)); })(),
    };
  }
  out.case_gap.cross_arm = {};
  for (const [x, y] of [['C100', 'B'], ['B', 'R']].filter(([x, y]) => names.includes(x) && names.includes(y))) {
    const t = (cond) => matrix(rows.map(r => [r[x][cond], r[y][cond]]));
    out.case_gap.cross_arm[`${x} -> ${y}`] = { ungated_original: t('orig_ungated'), ungated_lowercase: t('lc_ungated'), gated_original: t('orig_gated'), gated_lowercase: t('lc_gated') };
  }
  out.case_gap.requests = rows;
  // short3_lowercase
  const s3Rows = [];
  for (const [id, set] of s3Pop.requests) for (const j of set) {
    const row = { id, wire_index: j };
    for (const a of arms) { const e = a.idx.short3_test.byId.get(id); if (!e || j >= e.rec.goldSpans.length) throw new Error(`${a.name}: no gold request ${id}#${j} in short3_test`); row[a.name] = { ungated: stateOf(e, j, 'ungated'), gated: stateOf(e, j, 'gated') }; }
    s3Rows.push(row);
  }
  out.short3_lowercase = { note: 'these short3 messages are written in lower case in the realistic data: there is no original-case twin, so no case gap is computed here (a synthetic twin was deliberately not built)', requests: s3Rows.length,
    per_arm: Object.fromEntries(arms.map(a => [a.name, { ungated_right_share_pct: pct(s3Rows.filter(r => r[a.name].ungated === 'right').length, s3Rows.length), gated_right_share_pct: pct(s3Rows.filter(r => r[a.name].gated === 'right').length, s3Rows.length), ungated_states: matrix(s3Rows.map(r => [r[a.name].ungated, 'x'])), gated_wrong_plus_extras_per_100_requested: a.stats.s3.gated?.wrong_plus_extras_per_100_requested ?? null }])),
    cross_arm: Object.fromEntries([['C100', 'B'], ['B', 'R']].filter(([x, y]) => names.includes(x) && names.includes(y)).map(([x, y]) => [`${x} -> ${y}`, { ungated: matrix(s3Rows.map(r => [r[x].ungated, r[y].ungated])), gated: matrix(s3Rows.map(r => [r[x].gated, r[y].gated])) }])) };
  // nl_a: wrong and extra proposals executed at an arm's gate, joined to the other arms by message, span and raw formalization
  const nl = {};
  for (const a of arms) {
    const idx = a.idx.nl_a_development, mist = [];
    for (const e of idx.byId.values()) for (const x of e.gated) if (x.execute && x.o !== 'right') mist.push(x);
    nl[a.name] = { thr: idx.thr, executed_wrong: mist.filter(x => x.o === 'wrong').length, executed_extras: mist.filter(x => x.o === 'extra').length, mistakes: mist };
  }
  const findIn = (idx, x) => {
    const e = idx.byId.get(x.id);
    if (!e) return { state: 'message not in the arm records' };
    const key = joinKey(x), same1 = e.gated.find(y => joinKey(y) === key);
    if (same1) return { state: same1.execute ? 'executed (same reading)' : same1.hold === 'structural' ? `held structurally: ${same1.structural} (same reading)` : 'held by confidence (same reading)', same_reading: true, held: !same1.execute, confidence: r4(same1.c), threshold: r4(idx.thr), outcome: same1.o };
    const ov = e.gated.filter(y => Math.min(y.span[1], x.span[1]) > Math.max(y.span[0], x.span[0]));
    if (ov.length) return { state: 'a different reading of an overlapping span', same_reading: false, readings: ov.map(y => ({ span: y.span, reading: y.got, execute: y.execute, outcome: y.o, confidence: r4(y.c) })) };
    return { state: 'nothing produced there', same_reading: false };
  };
  out.nl_a = { executed_mistakes: Object.fromEntries(arms.map(a => [a.name, { threshold: r4(nl[a.name].thr), wrong: nl[a.name].executed_wrong, extras: nl[a.name].executed_extras, wrong_plus_extras: nl[a.name].mistakes.length }])), joins: {} };
  for (const a of arms) {
    const others = arms.filter(b => b.name !== a.name);
    out.nl_a.joins[a.name] = nl[a.name].mistakes.map(x => ({ id: x.id, span: x.span, src: x.src, reading: x.got, outcome: x.o, reasons: x.reasons, own_confidence: r4(x.c), own_threshold: r4(nl[a.name].thr), own_decision: 'executed',
      others: Object.fromEntries(others.map(b => [b.name, findIn(b.idx.nl_a_development, x)])) }));
  }
  const rs = out.nl_a.joins.R ?? [];
  const claim = { text: "five of R's nine executed mistakes were identical wrong readings B held", R_executed_mistakes: rs.length, B_same_reading_held: rs.filter(x => x.others.B?.same_reading && x.others.B.held).length,
    B_same_reading_held_by_confidence: rs.filter(x => x.others.B?.state === 'held by confidence (same reading)').length, B_same_reading_held_structurally: rs.filter(x => x.others.B?.state?.startsWith('held structurally')).length,
    B_same_reading_executed: rs.filter(x => x.others.B?.state === 'executed (same reading)').length, B_different_reading_same_span: rs.filter(x => x.others.B?.state === 'a different reading of an overlapping span').length, B_nothing_produced: rs.filter(x => x.others.B?.state === 'nothing produced there').length };
  claim.claim_checks_out = claim.R_executed_mistakes === 9 && claim.B_same_reading_held === 5;
  out.nl_a.parent_claim = claim;
  return out;
}

/** reads the cached records of B, R and C100-s0-v2 (no inference) -> the diagnostic data */
export function runDiagnose(FP, { arms = DIAG_ARMS, viewsDir = FP.parent.views } = {}) {
  loadViewDir(viewsDir);
  const popsList = loadPopulations(viewsDir), pops = new Map(popsList.map(p => [p.name, p]));
  const replacements = J(resolve(viewsDir, 'lowercase_other.replacements.json'));
  const loaded = arms.map(([name, dir]) => {
    const spec = J(resolve(dir, 'confidence.json')), score = J(resolve(dir, 'score.truthful.json'));
    if (score.threshold_cost10 !== spec.levels_out_of_fold?.cost?.threshold) throw new Error(`${name}: the score's threshold differs from the confidence file's`);
    if (score.views_manifest_sha256 !== PARENT.views_manifest_sha256 && viewsDir === PARENT.views) throw new Error(`${name}: its score was made on another views manifest`);
    const idx = {};
    for (const v of DIAG_VIEWS) {
      const { records } = loadRecords([resolve(dir, 'records', v + '.jsonl')]);
      idx[v] = { ...armIndex(records, spec), spec };
    }
    const stats = {
      lc: popStats(idx.lowercase_other, idx.lowercase_other.records, pops.get('lowercase_other_affected')), orig: popStats(idx.fresh2_test, idx.fresh2_test.records, pops.get('lowercase_other_affected_original_case')),
      s3: popStats(idx.short3_test, idx.short3_test.records, pops.get('short3_lowercase')),
      nl: (() => { const { tallies, ...s } = truthfulPopulation(idx.nl_a_development.records, idx.nl_a_development.spec, idx.nl_a_development.thr, null); return s; })(),
    };
    return { name, dir, spec, score, idx, stats };
  });
  return { loaded, pops, replacements, manifestSha: hashFile(resolve(viewsDir, 'manifest.json')) };
}

function renderDiagnoseMd(d, meta) {
  const L = [`# ModernBERT forms: cheap diagnostics (cached B / R / C100-s0-v2 records, no inference)`, '', `Protocol ${meta.protocol_sha256.slice(0, 12)}, parent views manifest ${meta.views_manifest_sha256.slice(0, 12)}. Diagnostics have no acceptance threshold and authorize no case-training or calibration branch.`, '',
    `Reconciliation with each arm's recorded score file: **${d.reconciliation_ok ? 'all ' + d.reconciliation.length + ' checks equal' : 'MISMATCH'}**`, ''];
  L.push('## 1. Original case against lowercase on the same affected requests (fresh2 test, other drawings)', '', '| arm | requests | ungated right % original | lowercase | gap (points) | gated right % original | lowercase | gated gap | confident mistakes /100 original | lowercase |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const [a, g] of Object.entries(d.case_gap).filter(([k]) => !['cross_arm', 'requests'].includes(k))) L.push(`| ${a} | ${g.requests} | ${g.ungated_right_share_original_pct} | ${g.ungated_right_share_lowercase_pct} | ${g.ungated_gap_points} | ${g.gated_right_share_original_pct} | ${g.gated_right_share_lowercase_pct} | ${g.gated_gap_points} | ${g.gated_confident_mistakes_per_100_requested.original} | ${g.gated_confident_mistakes_per_100_requested.lowercase} |`);
  L.push('', 'Ungated error transitions, original case -> lowercase (per arm):', '');
  for (const [a, g] of Object.entries(d.case_gap).filter(([k]) => !['cross_arm', 'requests'].includes(k))) L.push(`- ${a}: ` + Object.entries(g.ungated_transitions_original_to_lowercase).map(([k, v]) => `${k} ${v}`).join('; '));
  L.push('', 'Across arms (ungated, lowercase message):', '');
  for (const [k, v] of Object.entries(d.case_gap.cross_arm)) L.push(`- ${k}: ` + Object.entries(v.ungated_lowercase).map(([s, n]) => `${s} ${n}`).join('; '));
  L.push('', '## 2. short3_lowercase', '', d.short3_lowercase.note, '', '| arm | ungated right % | gated right % | gated confident mistakes /100 |', '|---|---:|---:|---:|');
  for (const [a, g] of Object.entries(d.short3_lowercase.per_arm)) L.push(`| ${a} | ${g.ungated_right_share_pct} | ${g.gated_right_share_pct} | ${g.gated_wrong_plus_extras_per_100_requested} |`);
  const c = d.nl_a.parent_claim;
  L.push('', '## 3. nl_a development: wrong and extra proposals executed at each arm\'s gate', '', '| arm | threshold | executed wrong | executed extras | wrong + extras |', '|---|---:|---:|---:|---:|');
  for (const [a, g] of Object.entries(d.nl_a.executed_mistakes)) L.push(`| ${a} | ${g.threshold} | ${g.wrong} | ${g.extras} | ${g.wrong_plus_extras} |`);
  L.push('', `Parent claim: "${c.text}". Independent count: R executed **${c.R_executed_mistakes}** mistakes; B produced the **same reading** (message, span, raw formalization) and **held** it for **${c.B_same_reading_held}** (by confidence ${c.B_same_reading_held_by_confidence}, structurally ${c.B_same_reading_held_structurally}); B executed the same reading ${c.B_same_reading_executed}; a different reading of an overlapping span ${c.B_different_reading_same_span}; nothing produced ${c.B_nothing_produced}. Claim ${c.claim_checks_out ? 'holds' : 'does NOT hold as stated'}.`, '');
  for (const [a, list] of Object.entries(d.nl_a.joins)) {
    L.push(`### ${a} executed mistakes (${list.length})`, '', '| message | outcome | own conf | thr | ' + Object.keys(list[0]?.others ?? {}).map(o => o + ' (same reading?)').join(' | ') + ' |', '|---|---|---:|---:|' + Object.keys(list[0]?.others ?? {}).map(() => '---|').join(''));
    for (const x of list) L.push(`| ${x.id} "${String(x.src).slice(0, 50).replace(/\|/g, '/')}" | ${x.outcome} | ${x.own_confidence} | ${x.own_threshold} | ` + Object.values(x.others).map(o => o.state + (o.confidence != null ? ` c=${o.confidence}` : '')).join(' | ') + ' |');
    L.push('');
  }
  return L.join('\n');
}

export function diagnoseCommand(protocolFile, out) {
  const FP = loadFormsProtocol(protocolFile);
  if (existsSync(out)) throw new Error(`${out} exists: refusing to overwrite`);
  const run = runDiagnose(FP);
  const viewsDir = FP.parent.views;
  const itemsOf = v => setItems(v);
  const arms = run.loaded.map(l => ({ name: l.name, spec: l.spec, score: l.score, idx: l.idx, stats: l.stats }));
  const d = diagnoseData({ arms, pops: run.pops, replacements: run.replacements, items: itemsOf });
  const meta = { tool: 'modernbert_forms_measure diagnose', campaign: FP.campaign, protocol_sha256: FP.sha256, plan_sha256: FP.plan.sha256, views_manifest_sha256: run.manifestSha, arms: run.loaded.map(l => ({ name: l.name, dir: l.dir, confidence_sha256: hashFile(resolve(l.dir, 'confidence.json')), score_sha256: hashFile(resolve(l.dir, 'score.truthful.json')) })), views_dir: viewsDir };
  mkdirSync(out, { recursive: true });
  const { requests, ...caseGap } = d.case_gap;
  writeFileSync(resolve(out, 'diagnostics.json'), JSON.stringify({ ...meta, reconciliation: d.reconciliation, reconciliation_ok: d.reconciliation_ok, case_gap: caseGap, short3_lowercase: { ...d.short3_lowercase }, nl_a: d.nl_a }, null, 1) + '\n');
  writeFileSync(resolve(out, 'case_gap.requests.jsonl'), requests.map(r => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(resolve(out, 'diagnostics.md'), renderDiagnoseMd(d, meta) + '\n');
  return { out, d };
}

//@@MORE@@
// ---------------------------------------------------------------- the model artifact check, the tool identity, the campaign-bound bundle
/** the old (parent) measurement files the evaluation depends on; `modernbert_forms_measure.mjs` itself is added. Same list as modernbert_next_measure.mjs CODE. */
export const MEASURE_CODE = ['training/neural/parity/modernbert_next_measure.mjs', 'training/neural/parity/arm_lib.mjs', 'training/neural/parity/collect_set.mjs', 'training/neural/parity/calibrate_arm.mjs', 'training/neural/parity/score_arm.mjs',
  'training/neural/parity/root_causes.mjs', 'training/neural/parity/compare_arms.mjs', 'training/neural/parity/sets.mjs', 'training/neural/calibrate_modernbert.mjs', 'docs/js/neural.js', 'docs/js/neural-confidence.js', 'docs/js/bench-canon.js'];
/** the other files every collection records (collect_set.mjs config.code): bound too, so a changed helper changes the identity */
export const COLLECTION_CODE = ['training/neural/parity/parity_lib.mjs', 'docs/js/drawing-lines.js', 'training/neural/parity/canvas_lib.mjs', 'docs/js/logic.js', 'docs/js/vss-composer.js', 'training/sketch/layer_common.mjs'];
export const FORMS_CODE = ['training/neural/parity/modernbert_forms_measure.mjs', ...MEASURE_CODE, ...COLLECTION_CODE];
export const codeHashesOf = (list, root = REPO) => Object.fromEntries(list.map(p => [p, hashFile(resolve(root, p))]));
/** node and the runtime packages the collection uses (collect_set.mjs loadNeural): versions of the packages, not a model load */
export function currentRuntime() {
  const require = createRequire(new URL('../../laptop/package.json', import.meta.url));
  const version = pkg => { try { return JSON.parse(readFileSync(require.resolve(pkg + '/package.json'), 'utf8')).version; } catch { try { return JSON.parse(readFileSync(resolve(dirname(require.resolve(pkg)), '../package.json'), 'utf8')).version; } catch { return null; } } };
  return { node: process.version, transformers_js: version('@huggingface/transformers'), onnxruntime_node: version('onnxruntime-node') };
}
const MODEL_REQUIRED = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'arm_receipt.json', 'onnx/model_quantized.onnx'];
/** the exported model folder: every required file, every shard named by the receipt, every receipt hash. -> artifact identity (weights, config, tokenizer and the receipt as the sidecar) */
export function validateModel(dirIn) {
  const dir = resolve(dirIn);
  if (!existsSync(dir)) throw new Error(`model ${dir} does not exist`);
  for (const f of MODEL_REQUIRED) if (!existsSync(resolve(dir, f))) throw new Error(`model ${dir}: ${f} is missing`);
  const receipt = J(resolve(dir, 'arm_receipt.json'));
  if (!Array.isArray(receipt.shards) || !receipt.shards.length) throw new Error(`model ${dir}: arm_receipt.json names no weight shards`);
  const shards = {};
  for (const s of receipt.shards) { const p = resolve(dir, 'onnx', s); if (!existsSync(p)) throw new Error(`model ${dir}: weight shard onnx/${s} is missing`); shards['onnx/' + s] = hashFile(p); }
  for (const f of readdirSync(resolve(dir, 'onnx'))) if (/onnx_data/.test(f) && !(('onnx/' + f) in shards)) throw new Error(`model ${dir}: onnx/${f} is not a shard the receipt names`);
  if (!receipt.files || typeof receipt.files !== 'object' || !Object.keys(receipt.files).length) throw new Error(`model ${dir}: arm_receipt.json holds no file hashes`);
  for (const [f, e] of Object.entries(receipt.files)) {
    const p = resolve(dir, f);
    if (!existsSync(p)) throw new Error(`model ${dir}: ${f} named by the receipt is missing`);
    if (hashFile(p) !== e.sha256) throw new Error(`model ${dir}: ${f} differs from the receipt`);
  }
  for (const f of ['onnx/model_quantized.onnx', 'config.json', 'tokenizer.json']) if (!(f in receipt.files)) throw new Error(`model ${dir}: the receipt does not hash ${f}`);
  const files = filesOf(dir);
  return { dir, artifacts_sha256: digest(JSON.stringify(files)), weights: { 'onnx/model_quantized.onnx': files['onnx/model_quantized.onnx'], ...shards }, config_sha256: files['config.json'], tokenizer_sha256: files['tokenizer.json'], sidecar: { 'arm_receipt.json': files['arm_receipt.json'] }, receipt };
}
/** the training data folder and its manifest (the sibling DIR.manifest.json the task runner passes to the trainer); C100 is the one arm whose data folder has none */
export function trainDataIdentity(dirIn, arm) {
  const dir = resolve(dirIn), train = resolve(dir, 'train.jsonl');
  if (!existsSync(train)) throw new Error(`--train-data ${dir}: train.jsonl is missing`);
  const man = dir + '.manifest.json';
  if (!existsSync(man)) { if (arm !== 'C100') throw new Error(`--train-data ${dir}: ${basename(man)} is missing (the training data manifest)`); return { dir, train_sha256: hashFile(train), manifest_file: null, manifest_sha256: null, inventory_sha256: existsSync(resolve(dir, 'trigger_inventory.json')) ? hashFile(resolve(dir, 'trigger_inventory.json')) : null }; }
  // the seen/unseen split reads trigger_inventory.json (collect_set trainData), never the manifest's extra_dirs; F and B need the registered inventory, not the fallback n-gram definition
  if (arm !== 'C100' && !existsSync(resolve(dir, 'trigger_inventory.json'))) throw new Error(`--train-data ${dir}: trigger_inventory.json is missing (the registered seen/unseen trigger definition)`);
  return { dir, train_sha256: hashFile(train), manifest_file: man, manifest_sha256: hashFile(man), inventory_sha256: existsSync(resolve(dir, 'trigger_inventory.json')) ? hashFile(resolve(dir, 'trigger_inventory.json')) : null };
}
/** the outer identity of one bundle */
export function bundleIdentity(FP, { arm, seed, model, trainData, includeExternal, legacyRecords }) {
  const name = `${arm}-s${seed}`;
  if (!EVALUABLE.includes(name)) throw new Error(`${name}: not an evaluable arm/seed of this campaign (F s0/s1, B s1, C100 s1; B s0 and C100 s0 are the parent's, reused through \`applicability\`)`);
  if (legacyRecords && arm !== 'C100') throw new Error('--legacy-records is for the C100 comparator only');
  return { schema: 'modernbert-forms-bundle-identity-v1', campaign: FP.campaign, plan_sha256: FP.plan.sha256, forms_protocol_sha256: FP.sha256, arm, seed, membership_sha256: FP.membership_sha256,
    parent: { protocol_sha256: FP.parent.protocol_sha256, views_manifest_sha256: FP.parent.views_manifest_sha256, addendum_sha256: FP.parent.addendum_sha256 },
    model, train_data: trainData, external_views: !!includeExternal, threads: '2', legacy_records: legacyRecords ? legacyRecords.map(f => ({ file: f, sha256: hashFile(f) })) : null,
    tool: { code: codeHashesOf(FORMS_CODE), runtime: currentRuntime() } };
}
/** claim the outer folder: new, or an identical identity (resume); a changed identity refuses naming the keys; a foreign folder refuses */
export function claimBundle(out, identity) {
  const idFile = resolve(out, 'campaign_identity.json');
  if (!existsSync(out)) { mkdirSync(out, { recursive: true }); writeFileSync(idFile, JSON.stringify(identity, null, 1) + '\n', { flag: 'wx' }); return { resumed: false }; }
  if (!existsSync(idFile)) throw new Error(`${out} exists and is not a forms bundle (no campaign_identity.json): refusing to write into it`);
  const old = J(idFile);
  if (!same(old, identity)) {
    const keys = [...new Set([...Object.keys(old), ...Object.keys(identity)])].filter(k => !same(old[k], identity[k]));
    const detail = k => (old[k] && identity[k] && typeof old[k] === 'object' ? [...new Set([...Object.keys(old[k]), ...Object.keys(identity[k])])].filter(x => !same(old[k][x], identity[k][x])).map(x => k + '.' + x) : [k]);
    throw new Error(`${out}: the campaign identity changed since this bundle was started (${keys.flatMap(detail).join(', ')}); use a fresh folder: the old records are not a result of this configuration`);
  }
  return { resumed: true };
}
const sealFile = out => resolve(out, 'bundle_seal.json');
/** the seal of a finished bundle: hashes of the files the verdict reads, bound to the outer identity */
function writeSeal(out, identity) {
  const ev = resolve(out, 'eval'), seal = { schema: 'modernbert-forms-bundle-seal-v1', identity_sha256: sha256(stable(identity)), score_truthful_sha256: hashFile(resolve(ev, 'score.truthful.json')), per_message_sha256: hashFile(resolve(ev, 'score.truthful.per_message.json')),
    confidence_sha256: hashFile(resolve(ev, 'confidence.json')), calibration_sha256: hashFile(resolve(ev, 'calibration.json')), inner_identity_sha256: hashFile(resolve(ev, 'identity.json')),
    records: Object.fromEntries(readdirSync(resolve(ev, 'records')).filter(f => f.endsWith('.manifest.json')).sort().map(f => [f, hashFile(resolve(ev, 'records', f))])), completed: new Date().toISOString() };
  writeFileSync(sealFile(out), JSON.stringify(seal, null, 1) + '\n', { flag: 'wx' });
  return seal;
}
// ---------------------------------------------------------------- registered runs: a model, data folder and run are bound to ONE arm and seed (no relabelling of another arm's artifacts)
export const B_MANIFEST_SHA256 = '2b102ef3f901eb25e3e38e49b6daa664ac740c5376b1b11a8aba806bd6bfa7e6';
export const C100_TRAIN_SHA256 = 'e43be4a8ee2d2233c869d4049e4ab5658ca55a102d9a0ff164f7d3b7578c595d';
/** the registered training folder of every arm/seed, the registered data folder of every arm and the pins of the data of B and C100 */
export const registry = (task = TASK) => ({
  train: { 'F-s0': task + '/F-s0', 'F-s1': task + '/F-s1', 'B-s1': task + '/B-s1', 'B-s0': OLD + '/B-s0', 'C100-s0': CACHE + '/arms/C100-s0', 'C100-s1': CACHE + '/arms/C100-s1' },
  data: { F: task + '/data-v2/F', B: OLD + '/data/B', C100: CACHE + '/arms/data/C100' }, b_manifest_sha256: B_MANIFEST_SHA256, c100_train_sha256: C100_TRAIN_SHA256 });
/** the identity of an arm's artifacts against the registry: model folder = TRAIN/export/modernbert-NAME; data folder registered; F data manifest of this campaign and F membership; B data manifest pinned in full;
 *  C100 data hash pinned; run/complete.json complete, full schedule, this seed, this data; the export receipt's weights hash = the hash of the run's weights file. -> [{check, ok, got, want}]
 *  td: {dir, train_sha256, manifest_file, manifest_sha256}; trainingDir: given when a verdict supplies one (must be the registered folder). */
export function bindingChecks(FP, name, { modelDir, td, trainingDir }, reg = registry()) {
  const [arm, seed] = ARMS[name], cs = [], T = reg.train[name];
  const add = (check, got, want, ok = same(got, want)) => cs.push({ check, ok: ok === true, got: got ?? null, want: want ?? null });
  if (!T) { add('registered training folder', null, 'a registered arm', false); return cs; }
  if (trainingDir !== undefined) add('training folder is the registered one', trainingDir ? resolve(trainingDir) : null, resolve(T));
  add(`model folder is ${name}'s registered export`, modelDir ? resolve(modelDir) : null, resolve(T, 'export', 'modernbert-' + name));
  add(`training data folder is ${arm}'s registered one`, td?.dir ? resolve(td.dir) : null, resolve(reg.data[arm]));
  const manifest = td?.manifest_file && existsSync(td.manifest_file) ? J(td.manifest_file) : null;
  if (arm === 'F') {
    add('F data manifest exists and is of arm F', manifest?.arm, 'F'); add('F data manifest is of this campaign', manifest?.campaign, FP.campaign);
    add('F data manifest binds this protocol\'s F membership sha256', manifest?.protocol?.membership_sha256, FP.membership_sha256); add('F data manifest binds this forms protocol file', manifest?.protocol?.sha256, FP.sha256);
  } else if (arm === 'B') { add('B data manifest is of arm B', manifest?.arm, 'B'); add('B data manifest sha256 is the pinned one', td?.manifest_sha256, reg.b_manifest_sha256); }
  else add('C100 training data train.jsonl sha256 is the pinned one', td?.train_sha256, reg.c100_train_sha256);
  const cf = resolve(T, 'run/complete.json'), c = existsSync(cf) ? J(cf) : null;
  add('run/complete.json exists', c ? true : null, true);
  if (c) {
    add('run is complete with the full schedule', [c.complete, c.full_schedule], [true, true]); add(`run seed is ${seed}`, c.metadata?.settings?.seed, seed);
    add('run trained on this data (train.jsonl sha256)', c.metadata?.data?.files?.['train.jsonl'], td?.train_sha256);
  }
  const rf = modelDir ? resolve(modelDir, 'arm_receipt.json') : null, r = rf && existsSync(rf) ? J(rf) : null, src = r?.weights?.source_file;
  if (r && typeof src === 'string' && !/[\\/]/.test(src) && existsSync(resolve(T, 'run', src))) add('export receipt weights sha256 equals the sha256 of the run\'s weights file', r.weights.sha256, hashFile(resolve(T, 'run', src)));
  else add('export receipt weights sha256 equals the sha256 of the run\'s weights file', null, 'the hash of the run\'s weights file', false);
  return cs;
}

/** evaluate one arm into OUT = {campaign_identity.json, eval/ (the parent's evaluateArm folder), bundle_seal.json}. Never overwrites; resumes only an identical identity. */
export async function evaluateCommand(o, { evaluate = N.evaluateArm, reg = registry() } = {}) {
  const FP = loadFormsProtocol(o.protocol), arm = o.arm, seed = +o.seed, name = `${arm}-s${seed}`;
  if (!['B', 'F', 'C100'].includes(arm) || !Number.isInteger(seed) || ![0, 1].includes(seed)) throw new Error('--arm is B, F or C100; --seed 0 or 1');
  if (!EVALUABLE.includes(name)) throw new Error(`${name} is not a registered evaluation of this campaign (F-s0, F-s1, B-s1, C100-s1)`);
  parentProtocol(FP);
  const td = trainDataIdentity(o.trainData, arm), bad = bindingChecks(FP, name, { modelDir: o.model, td }, reg).filter(c => !c.ok);
  if (bad.length) throw new Error(`${name}: the model / data / run are not this arm's registered artifacts: ` + bad.map(c => `${c.check} (got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)})`).join('; '));
  const model = validateModel(o.model);
  const legacy = o.legacyRecords ? o.legacyRecords.split(',').map(f => resolve(f)) : null;
  const identity = bundleIdentity(FP, { arm, seed, model: { dir: model.dir, artifacts_sha256: model.artifacts_sha256, weights: model.weights, config_sha256: model.config_sha256, tokenizer_sha256: model.tokenizer_sha256, sidecar: model.sidecar }, trainData: td, includeExternal: !o.noExternal, legacyRecords: legacy });
  const out = resolve(o.out), { resumed } = claimBundle(out, identity);
  if (existsSync(sealFile(out))) return { out, name, resumed: true, sealed: true, identity };   // finished before: the records are preserved, nothing runs again
  const r = await evaluate({ protocol: FP.parent.protocol, addendum: FP.parent.addendum, views: FP.parent.views, model: model.dir, trainData: td.dir, out: resolve(out, 'eval'), arm, seed, includeExternal: !o.noExternal, threads: '2', legacyRecords: legacy });
  writeSeal(out, identity);
  return { out, name, resumed, sealed: true, identity, result: r };
}
/** load a forms bundle: the seal and the outer identity bind the parent's folder; refuses a changed file, a changed model, a foreign identity. -> {name, kind: 'forms', bundle (N.loadBundle), identity, seal} */
export function loadFormsBundle(name, dirIn, FP, { checkModel = true } = {}) {
  const dir = resolve(dirIn), idf = resolve(dir, 'campaign_identity.json');
  if (!ARMS[name]) throw new Error(`bundle name ${name}: one of ${Object.keys(ARMS).join(', ')}`);
  if (!existsSync(idf)) throw new Error(`bundle ${name}: ${dir} has no campaign_identity.json (not a forms bundle)`);
  if (!existsSync(sealFile(dir))) throw new Error(`bundle ${name}: ${dir} has no bundle_seal.json (the evaluation did not finish)`);
  const id = J(idf), seal = J(sealFile(dir)), [arm, seed] = ARMS[name];
  if (id.schema !== 'modernbert-forms-bundle-identity-v1') throw new Error(`bundle ${name}: unknown identity schema ${id.schema}`);
  if (id.arm !== arm || id.seed !== seed) throw new Error(`bundle ${name}: the identity is of ${id.arm}-s${id.seed}`);
  if (id.campaign !== FP.campaign) throw new Error(`bundle ${name}: made for campaign ${id.campaign}, not ${FP.campaign}`);
  if (id.plan_sha256 !== FP.plan.sha256) throw new Error(`bundle ${name}: made under plan ${String(id.plan_sha256).slice(0, 12)}, not ${FP.plan.sha256.slice(0, 12)}`);
  if (id.forms_protocol_sha256 !== FP.sha256) throw new Error(`bundle ${name}: made under another forms protocol`);
  if (id.membership_sha256 !== FP.membership_sha256) throw new Error(`bundle ${name}: made with another F membership`);
  if (!same(id.parent, { protocol_sha256: FP.parent.protocol_sha256, views_manifest_sha256: FP.parent.views_manifest_sha256, addendum_sha256: FP.parent.addendum_sha256 })) throw new Error(`bundle ${name}: made on another parent protocol / views / addendum`);
  if (seal.identity_sha256 !== sha256(stable(id))) throw new Error(`bundle ${name}: the seal is not of this identity`);
  const ev = resolve(dir, 'eval');
  for (const [k, f] of [['score_truthful_sha256', 'score.truthful.json'], ['per_message_sha256', 'score.truthful.per_message.json'], ['confidence_sha256', 'confidence.json'], ['calibration_sha256', 'calibration.json'], ['inner_identity_sha256', 'identity.json']])
    if (!existsSync(resolve(ev, f)) || hashFile(resolve(ev, f)) !== seal[k]) throw new Error(`bundle ${name}: eval/${f} is missing or differs from the seal`);
  for (const [f, h] of Object.entries(seal.records)) if (!existsSync(resolve(ev, 'records', f)) || hashFile(resolve(ev, 'records', f)) !== h) throw new Error(`bundle ${name}: records/${f} is missing or differs from the seal`);
  const inner = J(resolve(ev, 'identity.json'));
  if (inner.arm !== arm || inner.seed !== seed || inner.model?.artifacts_sha256 !== id.model.artifacts_sha256 || inner.train_data?.train_sha256 !== id.train_data.train_sha256
    || inner.protocol_sha256 !== FP.parent.protocol_sha256 || inner.views_manifest_sha256 !== FP.parent.views_manifest_sha256 || inner.addendum_sha256 !== FP.parent.addendum_sha256) throw new Error(`bundle ${name}: the evaluation folder was not made for this identity`);
  if (checkModel) { const m = validateModel(id.model.dir); if (m.artifacts_sha256 !== id.model.artifacts_sha256) throw new Error(`bundle ${name}: the model folder ${id.model.dir} changed since the evaluation`); }
  if (checkModel && id.train_data.train_sha256 !== hashFile(resolve(id.train_data.dir, 'train.jsonl'))) throw new Error(`bundle ${name}: the training data changed since the evaluation`);
  const bundle = N.loadBundle(name, ev);
  return { name, kind: 'forms', dir, bundle, identity: id, seal, identity_sha256: seal.identity_sha256, score_sha256: seal.score_truthful_sha256, artifacts_sha256: id.model.artifacts_sha256, train_sha256: id.train_data.train_sha256 };
}

// ---------------------------------------------------------------- applicability: reusing the parent's B-s0 and C100-s0-v2 bundles
export const REUSABLE = { 'B-s0': { dir: OLD + '/B-s0/eval', arm: 'B', seed: 0 }, 'C100-s0': { dir: OLD + '/baseline/C100-s0-v2', arm: 'C100', seed: 0 } };
/** the parent bundle's recorded identities (identity.json, record manifests, scores) compared field by field with the CURRENT files: protocol, addendum, views, model artifacts,
 *  training data, all twelve measurement files, every record manifest's own code list, runtime of every collected view. (The parent's assertSameBasis ignores code hashes; this does not.)
 *  -> the record: status 'applicable' | 'refused' with every check, the notes and the unverifiable items. Nothing passes on a missing field. */
export function applicabilityRecord(FP, name, bundleDirIn, { runtime = currentRuntime(), expected = REUSABLE[name], root = REPO } = {}) {
  if (!expected) throw new Error(`${name}: not a reusable parent bundle (${Object.keys(REUSABLE).join(', ')})`);
  const dir = resolve(bundleDirIn), checks = [], notes = [], unverified = [];
  const chk = (check, recorded, current) => checks.push({ check, ok: recorded !== undefined && recorded !== null && same(recorded, current), recorded: recorded ?? null, current: current ?? null });
  const idFile = resolve(dir, 'identity.json'), scoreFile = resolve(dir, 'score.truthful.json');
  if (!existsSync(idFile) || !existsSync(scoreFile)) throw new Error(`${dir}: no identity.json / score.truthful.json: not a parent evaluation folder`);
  const id = J(idFile), score = J(scoreFile);
  chk('tool', id.tool, 'modernbert_next_measure evaluate');
  chk('arm', id.arm, expected.arm); chk('seed', id.seed, expected.seed);
  chk('protocol-v2 sha256', id.protocol_sha256, hashFile(FP.parent.protocol));
  chk('addendum sha256', id.addendum_sha256, hashFile(FP.parent.addendum));
  chk('views manifest sha256', id.views_manifest_sha256, hashFile(FP.parent.views + '/manifest.json'));
  chk('score views manifest sha256', score.views_manifest_sha256, hashFile(FP.parent.views + '/manifest.json'));
  chk('threads', id.threads, '2');
  // model artifacts: recompute from the folder as it is now
  const mdir = id.model?.dir;
  if (!mdir || !existsSync(mdir)) checks.push({ check: 'model folder exists', ok: false, recorded: mdir ?? null, current: null });
  else { const m = validateModel(mdir); chk('model artifacts sha256 (all files of the export folder)', id.model.artifacts_sha256, m.artifacts_sha256); chk('score artifact equals the model artifacts', score.artifact, m.artifacts_sha256); }
  // training data
  const tdir = id.train_data?.dir;
  if (!tdir || !existsSync(resolve(tdir, 'train.jsonl'))) checks.push({ check: 'training data exists', ok: false, recorded: tdir ?? null, current: null });
  else chk('training data train.jsonl sha256', id.train_data.train_sha256, hashFile(resolve(tdir, 'train.jsonl')));
  // the twelve measurement files, and exactly those
  chk('measurement file list', Object.keys(id.code ?? {}).sort(), [...MEASURE_CODE].sort());
  for (const [p, h] of Object.entries(id.code ?? {})) chk('code ' + p, h, existsSync(resolve(root, p)) ? hashFile(resolve(root, p)) : null);
  // records: every manifest complete; the code each collection recorded; the runtime of every collected view
  const rdir = resolve(dir, 'records');
  const mans = existsSync(rdir) ? readdirSync(rdir).filter(f => f.endsWith('.manifest.json')).sort() : [];
  if (!mans.length) checks.push({ check: 'record manifests exist', ok: false, recorded: 0, current: null });
  const projected = [];
  for (const f of mans) {
    const m = J(resolve(rdir, f)), v = f.replace('.jsonl.manifest.json', '');
    chk(`records ${v}: complete`, m.complete === true ? true : null, true);
    chk(`records ${v}: artifacts sha256`, m.config?.artifacts_sha256, id.model?.artifacts_sha256);
    if (m.runtime?.projected === true) {
      projected.push(v);
      for (const p of m.config?.projected_from ?? []) {
        chk(`records ${v}: projected-from file ${basename(p.file)}`, p.sha256, existsSync(p.file) ? hashFile(p.file) : null);
        const lm = p.file + '.manifest.json', legacyRt = existsSync(lm) ? J(lm).runtime : null;
        if (!legacyRt) unverified.push(`records ${v}: the legacy source ${basename(p.file)} has no runtime record`);
        else { chk(`records ${v}: legacy ${basename(p.file)} node`, legacyRt.node, runtime.node); chk(`records ${v}: legacy ${basename(p.file)} transformers_js`, legacyRt.transformers_js, runtime.transformers_js); chk(`records ${v}: legacy ${basename(p.file)} onnxruntime`, legacyRt.onnxruntime, runtime.onnxruntime_node); if (legacyRt.session_options?.intraOpNumThreads !== 2) notes.push(`${v}: projected from ${basename(p.file)} collected with THREADS=${legacyRt.session_options?.intraOpNumThreads} (the parent's accepted baseline; not a difference of model, data, tool or runtime version)`); }
      }
      continue;
    }
    if (!m.runtime || !m.runtime.node) { unverified.push(`records ${v}: no runtime recorded`); continue; }
    chk(`records ${v}: node`, m.runtime.node, runtime.node);
    chk(`records ${v}: transformers_js`, m.runtime.transformers_js, runtime.transformers_js);
    chk(`records ${v}: onnxruntime`, m.runtime.onnxruntime, runtime.onnxruntime_node);
    for (const [p, h] of Object.entries(m.config?.code ?? {})) chk(`records ${v}: code ${p}`, h, existsSync(resolve(root, p)) ? hashFile(resolve(root, p)) : null);
    if (!m.config?.code) unverified.push(`records ${v}: no code hashes recorded`);
  }
  if (projected.length) notes.push(`projected views (runtime recorded through their legacy sources): ${projected.join(', ')}`);
  const status = checks.some(c => !c.ok) ? 'refused' : unverified.length ? 'unverifiable' : 'applicable';
  return { schema: 'modernbert-forms-applicability-v1', name, status, campaign: FP.campaign, plan_sha256: FP.plan.sha256, forms_protocol_sha256: FP.sha256, bundle_dir: dir,
    bound: { identity_sha256: hashFile(idFile), score_truthful_sha256: hashFile(scoreFile), per_message_sha256: score.per_message?.sha256 ?? null, confidence_sha256: existsSync(resolve(dir, 'confidence.json')) ? hashFile(resolve(dir, 'confidence.json')) : null, artifacts_sha256: id.model?.artifacts_sha256 ?? null, train_sha256: id.train_data?.train_sha256 ?? null },
    runtime, checks, failed: checks.filter(c => !c.ok).map(c => c.check), notes, unverified };
}
/** a reused parent bundle: its applicability record is read again and must still describe the files (hashes) and be `applicable` */
export function loadReusedBundle(name, dirIn, recordFile, FP) {
  const dir = resolve(dirIn);
  if (!recordFile) throw new Error(`bundle ${name}: a reused parent bundle needs --applicability ${name}=FILE`);
  const rec = J(resolve(recordFile));
  if (rec.schema !== 'modernbert-forms-applicability-v1' || rec.name !== name) throw new Error(`bundle ${name}: ${recordFile} is not the applicability record of ${name}`);
  if (rec.status !== 'applicable') throw new Error(`bundle ${name}: its applicability record says ${rec.status}${rec.failed?.length ? ' (' + rec.failed.slice(0, 3).join('; ') + ')' : ''}${rec.unverified?.length ? ' (' + rec.unverified.slice(0, 3).join('; ') + ')' : ''}`);
  if (rec.campaign !== FP.campaign || rec.plan_sha256 !== FP.plan.sha256 || rec.forms_protocol_sha256 !== FP.sha256) throw new Error(`bundle ${name}: its applicability record was made for another campaign, plan or forms protocol`);
  if (resolve(rec.bundle_dir) !== dir) throw new Error(`bundle ${name}: its applicability record is of ${rec.bundle_dir}, not ${dir}`);
  const b = N.loadBundle(name, dir);
  if (hashFile(resolve(dir, 'identity.json')) !== rec.bound.identity_sha256 || hashFile(resolve(dir, 'score.truthful.json')) !== rec.bound.score_truthful_sha256 || b.score.per_message?.sha256 !== rec.bound.per_message_sha256) throw new Error(`bundle ${name}: the bundle changed since its applicability record`);
  if (rec.bound.confidence_sha256 && hashFile(resolve(dir, 'confidence.json')) !== rec.bound.confidence_sha256) throw new Error(`bundle ${name}: confidence.json changed since its applicability record`);
  return { name, kind: 'reused', dir, bundle: b, identity: b.identity, identity_sha256: rec.bound.identity_sha256, score_sha256: rec.bound.score_truthful_sha256, artifacts_sha256: rec.bound.artifacts_sha256, train_sha256: rec.bound.train_sha256, applicability: rec };
}

//@@MORE2@@
// ---------------------------------------------------------------- the verdict: rows F1, F2, F3, F4, P3, P4 and Guard G (new names; the parent's C15-C23 are not read)
const STATUS_ORDER = ['fail', 'unavailable', 'pending', 'pass'];
const worst = list => STATUS_ORDER.find(s => list.includes(s)) ?? 'pass';
/** a check: the value must be a finite number (else `unavailable`: a null, NaN, string or missing interval is never a pass), then test(value) decides */
export const chk = (name, value, test, extra = {}) => (fin(value) ? { name, value, ok: !!test(value), status: test(value) ? 'pass' : 'fail', ...extra } : { name, value: value ?? null, ok: false, status: 'unavailable', ...extra });
export const chkBool = (name, value, extra = {}) => ({ name, value, ok: value === true, status: value === true ? 'pass' : value === false ? 'fail' : 'unavailable', ...extra });
export const row = (id, title, checks, extra = {}) => { const status = checks.length ? worst(checks.map(c => c.status)) : 'unavailable'; return { id, title, status, pass: status === 'pass', checks, ...extra }; };
const prefix = (checks, p) => checks.map(c => ({ ...c, name: p + c.name }));
const popOk = (B, name) => { const p = B.score.populations?.[name]; return p && p.available !== false ? p : null; };
/** the paired comparison of a population, only when BOTH arms have it with an available truthful measure */
export const pairedPop = (A, B, key, popName, mode = 'gate') => (popOk(A, popName) && popOk(B, popName) ? N.pairwise(A, B, key, mode) : { missing: `population ${popName} is absent or has an unavailable measure in ${!popOk(A, popName) ? A.name : B.name}` });
/** the manifest's support rule of a population, in each bundle: unsupported (false) fails, a missing flag (null/undefined while the rule exists) is unavailable; no rule, no check */
export const supportChecks = (name, ...bundles) => bundles.flatMap(b => { const sup = b.score?.population_support?.[name]; return sup ? [chkBool(`${name} is a supported population (${b.name})`, sup.supported === true ? true : sup.supported === false ? false : null, { support: sup })] : []; });
const noRuleSupport = (name, ...bundles) => bundles.flatMap(b => (b.score?.population_support?.[name] ? [] : [{ name: `${name} has a support rule in the views manifest (${b.name})`, value: null, ok: false, status: 'unavailable' }]));

/** Guard G of the plan, on full fresh2 test, short3 test and nl_a development: candidate minus comparator */
export function guardRows(rules, cand, comp, label = '') {
  const G = N.guardG({ guard: rules.guard }, cand, comp);
  return { checks: prefix(G.checks, label || `G ${cand.name} vs ${comp.name}: `), rows: G.rows };
}
/** F1: F versus B on t1_clean (gated cost gain, paired interval, confidently-wrong share with executions in both) and on the clean create subset */
export function rowF1(rules, F, B) {
  const key = 't1_all/all#t1_clean', cmp = pairedPop(F, B, key, 't1_clean'), create = pairedPop(F, B, 't1_all/all#t1_clean_create', 't1_clean_create'), pf = popOk(F, 't1_clean'), pb = popOk(B, 't1_clean');
  const t = rules.f1_t1_clean_cost_min_gain, gf = pf?.gated, gb = pb?.gated;
  const checks = [
    chk(`t1_clean gated cost difference F-B >= ${t}`, cmp.difference, d => d >= t, { a: cmp.a ?? null, b: cmp.b ?? null, reason: cmp.missing || cmp.error }),
    chk('t1_clean paired interval lower end > 0', Array.isArray(cmp.ci95) ? cmp.ci95[0] : null, lo => lo > 0, { ci95: cmp.ci95 ?? null, ci95_reason: cmp.ci95_reason ?? cmp.missing ?? cmp.error ?? null, resampled_units: cmp.resampled_units ?? null }),
    chk(`${F.name} executes something at its gate on t1_clean`, gf?.executed ?? null, n => n > 0, { executed: gf?.executed ?? null }),
    chk(`${B.name} executes something at its gate on t1_clean`, gb?.executed ?? null, n => n > 0, { executed: gb?.executed ?? null }),
    chk('confidently wrong share does not increase (F <= B)', gf && gb && fin(gf.risk) && fin(gb.risk) ? gf.risk - gb.risk : null, d => d <= 1e-12, { candidate: gf?.risk ?? null, comparator: gb?.risk ?? null, candidate_wilson95: gf?.risk_wilson95 ?? null, comparator_wilson95: gb?.risk_wilson95 ?? null, executed: [gf?.executed ?? null, gb?.executed ?? null] }),
    ...supportChecks('t1_clean', F, B), ...supportChecks('t1_clean_create', F, B), ...noRuleSupport('t1_clean', F, B), ...noRuleSupport('t1_clean_create', F, B),
    chk('clean create subset gated cost: paired interval lower end > 0', Array.isArray(create.ci95) ? create.ci95[0] : null, lo => lo > 0, { difference: create.difference ?? null, ci95: create.ci95 ?? null, ci95_reason: create.ci95_reason ?? create.missing ?? create.error ?? null }),
  ];
  return row('F1', `${F.name} versus ${B.name} on t1_clean and the clean create subset`, checks);
}
/** F2 (one arm): ungated right over ALL frozen gold requests of each supported clean form population; undo/redo counts with exposure shown. The undo/redo oracle evidence is a separate row input. */
export function rowF2(rules, F, oracle) {
  const checks = [];
  for (const [form, bar] of Object.entries(rules.form_bars)) {
    const name = `t1_clean_${form}`, p = popOk(F, name), sup = F.score.population_support?.[name];
    checks.push(chk(`${form} ungated right share >= ${bar}`, p && sup?.supported === true ? p.ungated?.right_share : null, x => x >= bar, { requested: p?.requested ?? null, right: p?.ungated?.right ?? null, structural_holds: p?.ungated?.structural_holds?.total ?? null, unread: p?.ungated?.unread ?? null, supported: sup?.supported ?? null, exposure: F.score.exposure?.[name] ?? null, denominator: 'all frozen gold requested actions of the clean population' }));
  }
  const u = popOk(F, 't1_all_undo_redo_count');
  checks.push(chk(`undo/redo count ungated right share >= ${rules.undo_redo_count_min}`, u ? u.ungated?.right_share : null, x => x >= rules.undo_redo_count_min, { requested: u?.requested ?? null, right: u?.ungated?.right ?? null, exposure: F.score.exposure?.t1_all_undo_redo_count ?? null, note: 'regression evidence of a finite grammar, not a generalisation test' }));
  if (oracle) checks.push(oracle);
  return row('F2', `${F.name}: fixed form capability (ungated right / all gold)`, checks);
}
/** F3 (one F arm): Guard G against B and against C100; label setting; empty-label safety; each lower-case population against B */
export function rowF3(rules, F, B, C) {
  const gB = guardRows(rules, F, B, `G ${F.name} vs ${B.name}: `), gC = guardRows(rules, F, C, `G ${F.name} vs ${C.name}: `), checks = [...gB.checks, ...gC.checks];
  const ps = popOk(F, 't1_clean_label_setting'), pb = popOk(B, 't1_clean_label_setting');
  const drop = ps?.ungated && pb?.ungated && fin(ps.ungated.right_share) && fin(pb.ungated.right_share) ? (pb.ungated.right_share - ps.ungated.right_share) * 100 : null;
  checks.push(chk(`label-setting ungated right share falls by at most ${rules.label_setting_max_drop_points} points versus ${B.name}`, drop, d => d <= rules.label_setting_max_drop_points + 1e-9, { candidate: ps?.ungated?.right_share ?? null, comparator: pb?.ungated?.right_share ?? null }));
  const le = F.score.label_errors;
  checks.push(chk(`gated empty-label outputs against nonempty gold across the evaluated views <= ${rules.label_gated_empty_on_nonempty_max}`, le?.gated_empty_label_on_nonempty_gold ?? null, n => n <= rules.label_gated_empty_on_nonempty_max, { all_label_errors: le ?? null }));
  checks.push(chk('every executed request has its raw arguments (label errors are complete)', le && fin(le.executed_without_raw_arguments) ? le.executed_without_raw_arguments : null, n => n === 0));
  for (const name of ['lowercase_other_affected', 'short3_lowercase']) {
    // lowercase_other_affected has a support rule in the views manifest (a population without one cannot pass as supported); short3_lowercase has none: it is
    // supported when it is available in both arms with requests (the frozen list is 134 requests / 105 groups)
    checks.push(...supportChecks(name, F, B), ...(name === 'lowercase_other_affected' ? noRuleSupport(name, F, B) : [F, B].map(x => chk(`${name} is an available population with requests (${x.name})`, popOk(x, name)?.requested ?? null, n => n > 0))));
    const pf = popOk(F, name), pbb = popOk(B, name);
    const dr = pf?.ungated && pbb?.ungated && fin(pf.ungated.right_share) && fin(pbb.ungated.right_share) ? (pbb.ungated.right_share - pf.ungated.right_share) * 100 : null;
    checks.push(chk(`${name}: ungated right share loss <= ${rules.lowercase_max_drop_points} points versus ${B.name}`, dr, d => d <= rules.lowercase_max_drop_points + 1e-9, { candidate: pf?.ungated?.right_share ?? null, comparator: pbb?.ungated?.right_share ?? null, requested: pf?.requested ?? null }));
    const inc = pf?.gated && pbb?.gated && fin(pf.gated.wrong_plus_extras_per_100_requested) && fin(pbb.gated.wrong_plus_extras_per_100_requested) ? pf.gated.wrong_plus_extras_per_100_requested - pbb.gated.wrong_plus_extras_per_100_requested : null;
    checks.push(chk(`${name}: adds at most ${rules.lowercase_max_confident_mistakes_per_100_increase} confident mistake per 100 requests versus ${B.name}`, inc, d => d <= rules.lowercase_max_confident_mistakes_per_100_increase + 1e-9, { candidate: pf?.gated?.wrong_plus_extras_per_100_requested ?? null, comparator: pbb?.gated?.wrong_plus_extras_per_100_requested ?? null }));
  }
  return row('F3', `${F.name}: safety and retained capability (Guard G against ${B.name} and ${C.name}; label setting; lower case)`, checks, { guard: { [`vs ${B.name}`]: gB.rows, [`vs ${C.name}`]: gC.rows } });
}
/** P3 (one control arm): Guard G against C100 and the output-contract conditions (bound evidence) */
export function rowP3(rules, Bc, C, contract) { const g = guardRows(rules, Bc, C); return row('P3', `${Bc.name} passes Guard G against ${C.name} and the output-contract conditions`, [...g.checks, contract], { guard: { [`vs ${C.name}`]: g.rows } }); }
/** the tallies of the 4 bundles on t1_clean -> the seed-averaged interval, after the sidecars are checked to hold the same messages, groups and denominators */
export function seedAveraged(F0, B0, F1, B1, rules = FORMS_RULES, { resamples = RESAMPLES, seed = SEED } = {}) {
  const key = 't1_all/all#t1_clean', V = 'gold.truthful_v1.gate', arms = [F0, B0, F1, B1], sc = arms.map(b => b.sidecar?.[key]);
  if (sc.some(s => !s)) return { error: 'a bundle has no per-message data for t1_clean' };
  const ref = sc[0];
  if (sc.some(s => !same(s.ids, ref.ids))) return { error: 'the bundles hold other messages' };
  if (sc.some(s => !same(s.group, ref.group))) return { error: 'the bundles hold other frozen groups' };
  const t = sc.map(s => s.tallies?.[V]);
  if (t.some(x => !x || !Array.isArray(x.right) || !Array.isArray(x.bad) || !Array.isArray(x.G) || x.right.length !== ref.ids.length)) return { error: 'a bundle has no gated tallies for t1_clean' };
  if (t.some(x => !same(x.G, t[0].G))) return { error: 'the bundles count other requested actions' };
  const by = new Map(); ref.ids.forEach((_, i) => { const k = ref.group[i]; (by.get(k) || by.set(k, []).get(k)).push(i); });
  const units = [...by.values()];
  if (units.length < MIN_UNITS) return { error: `fewer than ${MIN_UNITS} groups (${units.length})`, groups: units.length };
  const ci = N.seedAveragedInterval(units, t[0].G, [{ A: t[0], B: t[1] }, { A: t[2], B: t[3] }], resamples, seed);
  const G = t[0].G.reduce((a, b) => a + b, 0), cost = (r, b) => (G ? (r - 10 * b) / G * 100 : null), sum = a => a.reduce((x, y) => x + y, 0);
  const d = [[t[0], t[1]], [t[2], t[3]]].map(([A, Bt]) => cost(sum(A.right), sum(A.bad)) - cost(sum(Bt.right), sum(Bt.bad)));
  return { ci95: ci, groups: units.length, per_seed_difference: d.map(x => r4(x)), mean_difference: r4((d[0] + d[1]) / 2), resamples, seed };
}
/** F4 (confirmation): the cost rule per seed and the seed-averaged interval */
export function rowF4(rules, F0, B0, F1, B1) {
  const key = 't1_all/all#t1_clean', c0 = pairedPop(F0, B0, key, 't1_clean'), c1 = pairedPop(F1, B1, key, 't1_clean'), avg = seedAveraged(F0, B0, F1, B1, rules);
  return row('F4', 'two fixed seeds: F-B t1_clean gated cost positive in each seed and the seed-averaged interval above zero', [
    chk('seed 0: F-B t1_clean gated cost difference > 0', c0.difference, d => d > 0, { ci95: c0.ci95 ?? null, reason: c0.missing || c0.error }),
    chk('seed 1: F-B t1_clean gated cost difference > 0', c1.difference, d => d > 0, { ci95: c1.ci95 ?? null, reason: c1.missing || c1.error }),
    chk(`seed-averaged paired interval (the two seeds averaged inside each resampled group; ${RESAMPLES} resamples, seed ${SEED}) lower end > 0`, Array.isArray(avg.ci95) ? avg.ci95[0] : null, lo => lo > 0, { ci95: avg.ci95 ?? null, ci95_reason: avg.error ?? null, groups: avg.groups ?? null, per_seed_difference: avg.per_seed_difference ?? null, mean_difference: avg.mean_difference ?? null, note: 'describes group variation conditional on two seeds, not the full seed distribution' }),
  ]);
}

// ---- bound evidence: the new schema names arm, seed and the model artifacts (the parent's evidence ids are bound to the parent's arms and do not apply)
export const EVIDENCE_SCHEMA = 'modernbert-forms-evidence-v1';
/** { schema, subject: {arm, seed, artifacts_sha256}, results: { "9".."14": output contract (acceptance B9-B14), "19": the absent/count oracle (F2) -> {status, command, evidence, sha256} } } */
export function evidenceRow(name, loaded, ev, ids, title) {
  if (!ev) return { name: title, value: null, ok: false, status: 'unavailable', reason: `no evidence file given for ${loaded.name}` };
  if (ev.schema !== EVIDENCE_SCHEMA) return { name: title, value: null, ok: false, status: 'unavailable', reason: `evidence schema ${ev.schema} is not ${EVIDENCE_SCHEMA} (evidence of the parent campaign is bound to the parent's arms)` };
  const [arm, seed] = ARMS[loaded.name], s = ev.subject;
  if (!s || s.arm !== arm || s.seed !== seed || s.artifacts_sha256 !== loaded.artifacts_sha256) return { name: title, value: null, ok: false, status: 'fail', reason: `the evidence subject ${JSON.stringify(s ?? null)} is not ${loaded.name} with model artifacts ${String(loaded.artifacts_sha256).slice(0, 12)}` };
  const es = ids.map(i => N.evidenceEntry(ev, i)), st = worst(es.map(e => e.status));
  return { name: title, value: es.map(e => `${e.id}:${e.status}`), ok: st === 'pass', status: st, entries: es };
}
export const contractRow = (loaded, ev) => evidenceRow('contract', loaded, ev, ['9', '10', '11', '12', '13', '14'], `${loaded.name}: output contract (acceptance 9-14), evidence bound to this arm`);
export const oracleRow = (loaded, ev) => evidenceRow('oracle', loaded, ev, ['19'], `${loaded.name}: absent/count oracle for undo/redo counts, evidence bound to this arm`);

// ---- P4: a training run is accepted only when its records agree with the evaluated bundle
export const REFERENCE_RECIPE_FILE = OLD + '/B-s0/run/complete.json';
export const recipeOf = complete => { const s = { ...(complete.metadata?.settings ?? {}) }; delete s.seed; return s; };
/** P4 for one arm: complete.json (complete, full schedule, seed, recipe equal to the reference's, data, updates) and the export receipt. trainingDir = the arm's work dir (run/complete.json); returns checks */
export function trainingChecks(loaded, trainingDirIn, { reference = REFERENCE_RECIPE_FILE, parentProtocolSha = PARENT.protocol_sha256, FP = null, reg = null } = {}) {
  const name = loaded.name, [arm, seed] = ARMS[name], cs = [], dir = resolve(trainingDirIn);
  const add = (check, value, ok) => cs.push({ name: `${name} training: ${check}`, value: value ?? null, ok: ok === true, status: ok === true ? 'pass' : value == null ? 'unavailable' : 'fail' });
  if (reg) {
    const t = loaded.identity?.train_data ?? {}, mf = t.manifest_file ?? (t.dir && existsSync(t.dir + '.manifest.json') ? t.dir + '.manifest.json' : null);
    for (const c of bindingChecks(FP, name, { modelDir: loaded.identity?.model?.dir, td: { dir: t.dir, train_sha256: t.train_sha256, manifest_file: mf, manifest_sha256: t.manifest_sha256 ?? (mf ? hashFile(mf) : null) }, trainingDir: trainingDirIn }, reg)) cs.push({ name: `${name} binding: ${c.check}`, value: c.got, ok: c.ok, status: c.ok ? 'pass' : c.got == null ? 'unavailable' : 'fail', want: c.want });
  }
  const cf = resolve(dir, 'run/complete.json');
  if (!existsSync(cf)) return [...cs, { name: `${name} training: run/complete.json exists`, value: null, ok: false, status: 'unavailable', reason: `${cf} is missing` }];
  const c = J(cf), ref = J(reference);
  add('complete === true', c.complete, c.complete === true); add('full_schedule === true', c.full_schedule, c.full_schedule === true); add('max_updates === 0', c.max_updates, c.max_updates === 0);
  add('seed equals the bundle\'s', c.metadata?.settings?.seed, c.metadata?.settings?.seed === seed);
  add('recipe (settings without the seed) equals the reference recipe', recipeOf(c), same(recipeOf(c), recipeOf(ref)) && Object.keys(recipeOf(c)).length > 0);
  const st = c.state ?? {};
  add('update === total > 0 and epoch === epochs', [st.update, st.total, st.epoch], fin(st.update) && st.update === st.total && st.total > 0 && st.epoch === c.metadata?.settings?.epochs);
  add('training data train.jsonl sha256 equals the bundle\'s', c.metadata?.data?.files?.['train.jsonl'], c.metadata?.data?.files?.['train.jsonl'] === loaded.train_sha256);
  const tdir = loaded.identity?.train_data?.dir ?? loaded.identity?.train_data?.dir;
  if (tdir && existsSync(resolve(tdir, 'train.jsonl'))) {
    const rows = readFileSync(resolve(tdir, 'train.jsonl'), 'utf8').split('\n').filter(x => x.trim()).length;
    add('data requests equal the rows of train.jsonl', [c.metadata?.data?.requests, rows], c.metadata?.data?.requests === rows);
  }
  const man = loaded.identity?.train_data?.manifest_file;
  if (man && existsSync(man)) { const m = J(man); add('data messages / requests equal the data manifest', [c.metadata?.data?.messages, c.metadata?.data?.requests, m.messages, m.requests], c.metadata?.data?.messages === m.messages && c.metadata?.data?.requests === m.requests); }
  const rf = resolve(loaded.identity?.model?.dir ?? loaded.bundle?.identity?.model?.dir ?? '', 'arm_receipt.json');
  if (!existsSync(rf)) add('export receipt exists', null, false);
  else {
    const r = J(rf), w = r.weights ?? {};
    add('export receipt: weights full_schedule === true', w.full_schedule, w.full_schedule === true);
    add('export receipt: weights update/total equal the run\'s', [w.update, w.total, w.epoch], w.update === st.update && w.total === st.total && w.epoch === st.epoch);
    add('export receipt: no source change since training', r.source_changes_since_training, Array.isArray(r.source_changes_since_training) && r.source_changes_since_training.length === 0 && Array.isArray(w.source_changes_since_training) && w.source_changes_since_training.length === 0);
    if (arm !== 'C100') add('export receipt: output contract bound to the parent protocol', r.contract?.protocol?.sha256, r.contract?.output_contract === 'diagram-reader-v2' && r.contract?.protocol?.sha256 === parentProtocolSha);
    cs.push({ name: `${name} export record (reported, not a parity claim): receipt passed=${r.passed}`, value: r.passed ?? null, ok: true, status: 'pass', note: 'passed=false with exit 2 records float/quantized decode differences on near ties (plan P4); quality decisions use this exact quantized artifact' });
  }
  return cs;
}

// ---- the stages
const STAGE_BUNDLES = { seed0: ['F-s0', 'B-s0', 'C100-s0'], control1: ['B-s1', 'C100-s1'], confirmation: ['F-s0', 'B-s0', 'C100-s0', 'F-s1', 'B-s1', 'C100-s1'] };
const EVIDENCE_NEEDED = { seed0: ['F-s0', 'B-s0'], control1: ['B-s1'], confirmation: ['F-s0', 'B-s0', 'F-s1', 'B-s1'] };
const TRAINING_NEEDED = { seed0: ['F-s0', 'B-s0'], control1: ['B-s1'], confirmation: ['F-s0', 'B-s0', 'F-s1', 'B-s1'] };
/** every row of a stage from loaded bundles {name: loaded}, evidence {name: parsed}, trainings {name: dir}. Pure given its inputs (no file is written). */
export function stageRows(stage, L, ev, tr, rules = FORMS_RULES, opts = {}) {
  const b = n => L[n].bundle, rows = [], P4 = names => row('P4', 'honest completion and export of every accepted training run', names.flatMap(n => (tr[n] ? trainingChecks(L[n], tr[n], opts) : [{ name: `${n} training record given`, value: null, ok: false, status: 'unavailable' }])));
  const seed0 = () => {
    rows.push(rowP3(rules, b('B-s0'), b('C100-s0'), contractRow(L['B-s0'], ev['B-s0'])));
    rows.push(rowF1(rules, b('F-s0'), b('B-s0')));
    rows.push(rowF2(rules, b('F-s0'), oracleRow(L['F-s0'], ev['F-s0'])));
    rows.push(row('contract:F-s0', 'F-s0: output-contract conditions (bound evidence)', [contractRow(L['F-s0'], ev['F-s0'])]));
    rows.push(rowF3(rules, b('F-s0'), b('B-s0'), b('C100-s0')));
  };
  const seed1 = () => {
    rows.push(rowP3(rules, b('B-s1'), b('C100-s1'), contractRow(L['B-s1'], ev['B-s1'])));
  };
  if (stage === 'seed0') { seed0(); rows.push(P4(['F-s0', 'B-s0'])); }
  else if (stage === 'control1') { seed1(); rows.push(P4(['B-s1'])); }
  else if (stage === 'confirmation') {
    seed0(); seed1();
    rows.push(rowF4(rules, b('F-s0'), b('B-s0'), b('F-s1'), b('B-s1')));
    rows.push(rowF2(rules, b('F-s1'), oracleRow(L['F-s1'], ev['F-s1'])));
    rows.push(row('contract:F-s1', 'F-s1: output-contract conditions (bound evidence)', [contractRow(L['F-s1'], ev['F-s1'])]));
    rows.push(rowF3(rules, b('F-s1'), b('B-s1'), b('C100-s1')));
    rows.push(P4(['F-s0', 'B-s0', 'F-s1', 'B-s1']));
  } else throw new Error(`--stage is seed0, control1 or confirmation`);
  return rows.filter(Boolean);
}


// ---------------------------------------------------------------- group exposure (display only, no bar): population messages / groups that share a frozen group with an arm's training membership
/** populations: [{name, items: [{id, group_key}]}]; trainGroups: {arm: Set(group_key)} -> {name: {messages, groups, arm: {messages_sharing_group, groups_sharing_group}}} */
export function groupExposure(populations, trainGroups) {
  const out = {};
  for (const p of populations) {
    const groups = new Set(p.items.map(i => i.group_key));
    if (p.items.some(i => i.group_key == null)) throw new Error(`population ${p.name}: a message has no frozen group`);
    out[p.name] = { messages: p.items.length, groups: groups.size };
    for (const [arm, tg] of Object.entries(trainGroups)) out[p.name][arm] = { messages_sharing_group: p.items.filter(i => tg.has(i.group_key)).length, groups_sharing_group: [...groups].filter(g => tg.has(g)).length };
  }
  return out;
}
const idsOf = file => readFileSync(file, 'utf8').split('\n').filter(Boolean);
/** the training groups of B, F and C100 from the parent's groups.jsonl and the arms' membership ids (an id missing from groups.jsonl throws) */
export function trainingGroups(FP) {
  const PR = N.loadProtocol(FP.parent.protocol), G = N.loadGroups(PR), fe = FP.P.membership?.F;
  if (!fe?.file) throw new Error('the forms protocol names no membership.F.file: group exposure cannot be computed');
  const ff = resolve(FP.dir, fe.file);
  if (hashFile(ff) !== FP.membership_sha256) throw new Error(`${ff} differs from the protocol's F membership hash`);
  const toGroups = (ids, what) => new Set(ids.map(id => { const r = G.byId.get(id); if (!r) throw new Error(`${what}: ${id} is not in the parent's groups.jsonl`); return r.group_key; }));
  const c100 = [...G.byId.values()].filter(r => r.roles.includes('train_c100')).map(r => r.id);
  return { B: toGroups(N.membership(PR, 'B'), 'B'), F: toGroups(idsOf(ff), 'F'), C100: toGroups(c100, 'C100') };
}
const GUARD_VIEWS = ['fresh2_test', 'short3_test', 'nl_a_development'];
/** every population of F2 / F3 (named populations and the full guard views) with its exposure to each arm's training groups */
export function loadGroupExposure(FP, trainGroups = trainingGroups(FP)) {
  loadViewDir(FP.parent.views);
  const pops = loadPopulations(FP.parent.views), want = [...Object.keys(FORMS_RULES.form_bars).map(f => 't1_clean_' + f), 't1_all_undo_redo_count', 't1_clean_label_setting', 'lowercase_other_affected', 'short3_lowercase'];
  const list = want.map(name => { const pop = pops.find(x => x.name === name); if (!pop) throw new Error(`the views folder has no population ${name}`); const items = new Map(setItems(pop.view).map(i => [i.id, i])); return { name, items: [...pop.requests.keys()].map(id => { const it = items.get(id); if (!it) throw new Error(`population ${name}: ${id} is not a message of ${pop.view}`); return { id, group_key: it.group_key }; }) }; });
  for (const v of GUARD_VIEWS) list.push({ name: v + ' (full guard view)', items: setItems(v).map(i => ({ id: i.id, group_key: i.group_key })) });
  return groupExposure(list, trainGroups);
}
const F2_POPS = [...Object.keys(FORMS_RULES.form_bars).map(f => 't1_clean_' + f), 't1_all_undo_redo_count'], F3_POPS = ['t1_clean_label_setting', 'lowercase_other_affected', 'short3_lowercase', ...GUARD_VIEWS.map(v => v + ' (full guard view)')];
/** attach the display-only exposure to the F2 / F3 rows */
export function attachExposure(rows, exposure) {
  if (!exposure) return rows;
  for (const r of rows) { const names = r.id === 'F2' ? F2_POPS : r.id === 'F3' ? F3_POPS : null; if (names) r.group_exposure = Object.fromEntries(names.filter(n => exposure[n]).map(n => [n, exposure[n]])); }
  return rows;
}

const VERDICT_SCHEMA = 'modernbert-forms-verdict-v1';
const nameEq = (list, what) => { const m = new Map(); for (const x of list ?? []) { const i = x.indexOf('='); if (i < 1) throw new Error(`${what} ${x}: expected NAME=PATH`); const n = x.slice(0, i); if (!ARMS[n]) throw new Error(`${what} ${n}: one of ${Object.keys(ARMS).join(', ')}`); if (m.has(n)) throw new Error(`${what} ${n} given twice`); m.set(n, x.slice(i + 1)); } return m; };
/** a pass record of an earlier stage (verdict.json): this tool's, of that stage, pass === true with every row passing, for this campaign / plan / forms protocol */
export function checkPassRecord(file, stage, FP, L = null, { reload = false } = {}) {
  if (!file || !existsSync(file)) throw new Error(`the ${stage} pass record ${file ?? '(not given)'} is missing`);
  const r = J(file), why = [];
  if (r.schema !== VERDICT_SCHEMA) why.push(`schema ${r.schema}`);
  if (r.stage !== stage) why.push(`stage ${r.stage} is not ${stage}`);
  if (r.pass !== true) why.push('pass is not true');
  if (!Array.isArray(r.rows) || !r.rows.length || !r.rows.every(x => x.pass === true && x.status === 'pass')) why.push('a row does not pass');
  if (r.campaign !== FP.campaign || r.plan_sha256 !== FP.plan.sha256 || r.forms_protocol_sha256 !== FP.sha256) why.push('another campaign, plan or forms protocol');
  // a record without every bundle of the stage (identity and score hashes) cannot pass: a hand-written verdict never unlocks a later stage
  for (const n of STAGE_BUNDLES[stage] ?? []) { const x = r.bundles?.[n]; if (!x || !/^[0-9a-f]{64}$/.test(x.identity_sha256 ?? '') || !/^[0-9a-f]{64}$/.test(x.score_sha256 ?? '')) why.push(`bundle ${n} is missing from the ${stage} verdict (identity and score hashes)`); }
  if (r.bundles) for (const n of Object.keys(r.bundles)) if (!(STAGE_BUNDLES[stage] ?? []).includes(n)) why.push(`bundle ${n} is not a bundle of the ${stage} stage`);
  // every stage bundle names where it lives: dir and kind (and the applicability file of a reused parent bundle); a record without them cannot be reloaded, so it cannot pass
  for (const n of STAGE_BUNDLES[stage] ?? []) {
    const x = r.bundles?.[n]; if (!x) continue;
    if (typeof x.dir !== 'string' || !x.dir) why.push(`bundle ${n} names no dir`);
    if (!['forms', 'reused'].includes(x.kind)) why.push(`bundle ${n} names no kind (forms | reused)`);
    if (x.kind === 'reused' && (typeof x.applicability_file !== 'string' || !x.applicability_file)) why.push(`bundle ${n} is a reused bundle without its applicability_file`);
  }
  const sources = [];   // [label, {name: loaded}]: every stage bundle must be present in, and equal to, each source that is used
  if (L) sources.push(['the given bundles', L]);
  if (reload) {
    const cur = {};
    for (const n of STAGE_BUNDLES[stage] ?? []) {
      const x = r.bundles?.[n]; if (!x || typeof x.dir !== 'string' || !x.dir) continue;
      try { cur[n] = x.kind === 'reused' ? loadReusedBundle(n, x.dir, x.applicability_file, FP) : loadFormsBundle(n, x.dir, FP); } catch (e) { why.push(`bundle ${n} cannot be loaded again: ${String(e.message || e).slice(0, 160)}`); }
    }
    sources.push(['the reloaded bundles', cur]);
  }
  for (const [label, S] of sources) for (const n of STAGE_BUNDLES[stage] ?? []) {
    const x = r.bundles?.[n]; if (!x) continue;
    if (!S[n]) { if (!why.some(w => w.startsWith(`bundle ${n} cannot be loaded`))) why.push(`bundle ${n} is not among ${label}`); continue; }
    if (S[n].identity_sha256 !== x.identity_sha256 || S[n].score_sha256 !== x.score_sha256) why.push(`bundle ${n} differs from the one that passed (${label})`);
  }
  return { file: resolve(file), sha256: hashFile(file), stage, ok: why.length === 0, why };
}
/** loads and validates every input of a stage; throws on a missing, extra, incompatible or unbound input */
export function loadStageInputs(FP, stage, o, { reusable = REUSABLE } = {}) {
  const names = STAGE_BUNDLES[stage];
  if (!names) throw new Error('--stage is seed0, control1 or confirmation');
  const dirs = nameEq(o.bundle, '--bundle'), appl = nameEq(o.applicability, '--applicability'), evf = nameEq(o.evidence, '--evidence'), trn = nameEq(o.training, '--training');
  for (const n of dirs.keys()) if (!names.includes(n)) throw new Error(`--bundle ${n}: the ${stage} stage takes ${names.join(', ')}`);
  for (const n of names) if (!dirs.has(n)) throw new Error(`the ${stage} stage needs --bundle ${n}=DIR: a missing bundle cannot yield success`);
  for (const n of evf.keys()) if (!EVIDENCE_NEEDED[stage].includes(n)) throw new Error(`--evidence ${n}: the ${stage} stage takes ${EVIDENCE_NEEDED[stage].join(', ')}`);
  for (const n of EVIDENCE_NEEDED[stage]) if (!evf.has(n)) throw new Error(`the ${stage} stage needs --evidence ${n}=FILE (schema ${EVIDENCE_SCHEMA}, bound to ${n}'s model artifacts)`);
  for (const n of trn.keys()) if (!TRAINING_NEEDED[stage].includes(n)) throw new Error(`--training ${n}: the ${stage} stage takes ${TRAINING_NEEDED[stage].join(', ')}`);
  for (const n of TRAINING_NEEDED[stage]) if (!trn.has(n)) throw new Error(`the ${stage} stage needs --training ${n}=DIR (the arm's work folder holding run/complete.json)`);
  for (const n of appl.keys()) if (!reusable[n] || !names.includes(n)) throw new Error(`--applicability ${n}: not a reused bundle of the ${stage} stage`);
  const L = {};
  for (const n of names) {
    if (reusable[n]) { if (resolve(dirs.get(n)) !== resolve(reusable[n].dir)) throw new Error(`--bundle ${n}: the reused parent bundle is ${reusable[n].dir}`); L[n] = loadReusedBundle(n, dirs.get(n), appl.get(n), FP); L[n].applicability_file = resolve(appl.get(n)); }
    else L[n] = loadFormsBundle(n, dirs.get(n), FP);
  }
  const ev = {}; for (const [n, f] of evf) { if (!existsSync(f)) throw new Error(`--evidence ${n}: ${f} is missing`); ev[n] = J(f); ev[n].__file = { path: resolve(f), sha256: hashFile(f) }; }
  const tr = Object.fromEntries(trn);
  const passes = {};
  if (stage === 'confirmation') { passes.seed0 = checkPassRecord(o.seed0Pass, 'seed0', FP, L, { reload: true }); passes.control1 = checkPassRecord(o.control1Pass, 'control1', FP, L, { reload: true }); }
  return { L, ev, tr, passes };
}
/** the stage decision: rows + the pass records of earlier stages. -> the verdict document */
export function decide(FP, stage, inputs, rules = FORMS_RULES, opts = {}) {
  const rows = attachExposure(stageRows(stage, inputs.L, inputs.ev, inputs.tr, rules, opts), inputs.groupExposure);
  for (const [k, p] of Object.entries(inputs.passes ?? {})) rows.push(row(`pass-record:${k}`, `the ${k} stage passed for these bundles (${p.file})`, [chkBool(`${k} pass record is valid and bound to these bundles`, p.ok, { why: p.why })]));
  const pass = rows.length > 0 && rows.every(r => r.pass === true);
  return { schema: VERDICT_SCHEMA, tool: 'modernbert_forms_measure verdict', stage, pass, status: worst(rows.map(r => r.status)), campaign: FP.campaign, plan_sha256: FP.plan.sha256, forms_protocol_sha256: FP.sha256, membership_sha256: FP.membership_sha256,
    parent: { protocol_sha256: FP.parent.protocol_sha256, views_manifest_sha256: FP.parent.views_manifest_sha256, addendum_sha256: FP.parent.addendum_sha256 }, rules,
    bundles: Object.fromEntries(Object.entries(inputs.L).map(([n, l]) => [n, { kind: l.kind, dir: l.dir, identity_sha256: l.identity_sha256, score_sha256: l.score_sha256, artifacts_sha256: l.artifacts_sha256, train_sha256: l.train_sha256, ...(l.applicability_file ? { applicability_file: l.applicability_file } : {}) }])),
    evidence: Object.fromEntries(Object.entries(inputs.ev).map(([n, e]) => [n, e.__file])), training: inputs.tr, passes: inputs.passes ?? {}, rows,
    group_exposure_note: 'display only, no bar: population messages / groups that share a frozen group with the arm\'s training membership (B, F, C100 = train_c100 role)', group_exposure: inputs.groupExposure ?? null,
    code: codeHashesOf(FORMS_CODE), runtime: currentRuntime() };
}
export function verdictCommand(o) {
  const FP = loadFormsProtocol(o.protocol), stage = o.stage;
  const PR = parentProtocol(FP);
  const inputs = loadStageInputs(FP, stage, o);
  inputs.groupExposure = loadGroupExposure(FP);
  const v = decide(FP, stage, inputs, FORMS_RULES, { FP, reg: registry() });
  v.parent_rules_checked = true; void PR;
  if (existsSync(o.out)) throw new Error(`${o.out} exists: refusing to overwrite`);
  mkdirSync(resolve(o.out), { recursive: true });
  writeFileSync(resolve(o.out, 'verdict.json'), JSON.stringify(v, null, 1) + '\n', { flag: 'wx' });
  writeFileSync(resolve(o.out, 'verdict.md'), renderVerdictMd(v) + '\n', { flag: 'wx' });
  return v;
}
export function renderVerdictMd(v) {
  const L = [`# ModernBERT forms: ${v.stage} verdict: **${v.pass ? 'PASS' : 'DID NOT PASS'}**`, '', `Campaign ${v.campaign}; plan ${v.plan_sha256.slice(0, 12)}; forms protocol ${v.forms_protocol_sha256.slice(0, 12)}. Only a row with status pass passes.`, ''];
  for (const r of v.rows) { L.push(`## ${r.id} ${r.status.toUpperCase()}: ${r.title}`, ''); for (const [nm, e] of Object.entries(r.group_exposure ?? {})) L.push(`- exposure (display only) ${nm}: ${e.messages} messages / ${e.groups} groups; sharing a group with training: ` + Object.entries(e).filter(([k]) => typeof e[k] === 'object').map(([arm, x]) => `${arm} ${x.messages_sharing_group} msgs / ${x.groups_sharing_group} groups`).join('; '));
    for (const [cmp, rows] of Object.entries(r.guard ?? {})) for (const g of rows) L.push(`- Guard G ${cmp}, ${g.view}: candidate cost ${g.candidate_cost}, comparator cost ${g.comparator_cost}; clean subset reported: ` + JSON.stringify(g.clean_population_reported));
    for (const c of r.checks) L.push(`- ${c.status === 'pass' ? 'pass' : c.status.toUpperCase()}: ${c.name}${c.value !== undefined && c.value !== null && typeof c.value !== 'object' ? ` (${c.value})` : ''}${c.reason ? ` [${c.reason}]` : ''}`); L.push(''); }
  return L.join('\n');
}

// ---------------------------------------------------------------- the command line
function parseArgs(argv) {
  const o = { _: [] }, multi = ['bundle', 'evidence', 'training', 'applicability'], flags = ['noExternal'];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (flags.includes(k)) { o[k] = true; continue; }
    const v = argv[++i];
    if (v === undefined) throw new Error(`--${a.slice(2)} needs a value`);
    if (multi.includes(k)) (o[k] ||= []).push(v); else o[k] = v;
  }
  return o;
}
async function main(argv) {
  const [cmd, ...rest] = argv, o = parseArgs(rest), need = (...ks) => { for (const k of ks) if (!o[k]) throw new Error(`--${k} is required`); };
  if (cmd === 'diagnose') {
    need('protocol', 'out');
    const { out, d } = diagnoseCommand(o.protocol, resolve(o.out));
    console.log(`diagnostics written to ${out}; reconciliation ${d.reconciliation_ok ? 'ok (' + d.reconciliation.length + ' checks)' : 'MISMATCH'}`);
    if (!d.reconciliation_ok) process.exitCode = 1;
  } else if (cmd === 'evaluate') {
    need('protocol', 'arm', 'seed', 'model', 'trainData', 'out');
    const r = await evaluateCommand(o);
    console.log(`${r.name}: bundle ${r.out} ${r.resumed ? '(identical identity: resumed / preserved)' : '(new)'}${r.sealed ? ', sealed' : ''}`);
  } else if (cmd === 'applicability') {
    need('protocol', 'name', 'evalDir', 'out');
    const FP = loadFormsProtocol(o.protocol);
    if (existsSync(o.out)) throw new Error(`${o.out} exists: refusing to overwrite`);
    const rec = applicabilityRecord(FP, o.name, o.evalDir);
    mkdirSync(dirname(resolve(o.out)), { recursive: true });
    writeFileSync(resolve(o.out), JSON.stringify(rec, null, 1) + '\n', { flag: 'wx' });
    console.log(`${o.name}: ${rec.status} (${rec.checks.length} checks, ${rec.failed.length} failed, ${rec.unverified.length} unverifiable)`);
    for (const f of rec.failed) console.log('  DIFFERS ' + f);
    for (const u of rec.unverified) console.log('  UNVERIFIABLE ' + u);
    for (const n of rec.notes) console.log('  note ' + n);
    if (rec.status !== 'applicable') process.exitCode = 1;
  } else if (cmd === 'verdict') {
    need('protocol', 'stage', 'out');
    const v = verdictCommand(o);
    for (const r of v.rows) console.log(`${r.id} ${r.status}: ${r.title}`);
    console.log(`stage ${v.stage} pass ${v.pass}`);
    if (!v.pass) process.exitCode = 1;
  } else if (cmd === 'check-pass') {
    need('protocol', 'stage', 'verdict');
    const FP = loadFormsProtocol(o.protocol), p = checkPassRecord(o.verdict, o.stage, FP, null, { reload: true });
    console.log(`${o.stage} pass record ${p.file}: ${p.ok ? 'valid and passing' : 'NOT passing: ' + p.why.join('; ')}`);
    if (!p.ok) process.exitCode = 1;
//@@CMDS@@
  } else throw new Error('usage: modernbert_forms_measure.mjs diagnose|evaluate|applicability|verdict|check-pass ...');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(process.argv.slice(2)); } catch (e) { console.error(String(e.message || e)); process.exitCode = process.exitCode || 2; }
}
