// compare_fits.mjs: two confidence fits of ONE model's readings, paired on the same messages, and the pass / miss of the bars of
// training/neural/MODERNBERT_RECAL_PLAN.md section 5 (fixed before any result). A thin wrapper over compare_arms.mjs: compareSidecars and
// pairedInterval do the pairing and the interval; this file adds what a fit-against-fit comparison needs and what the bars need.
//   node compare_fits.mjs F_SHORT.score.json F_CTRL.score.json OUT.json
// A = F_short, B = F_ctrl: asserted from each score file's `calibrated_on` (A's has short_synth, B's does not, and the rest is the same). It skips
// ONLY compare_arms.mjs assertSameFit (that check exists to refuse two fits on other calibration parts, which is the point here), and refuses two
// score files that do not hold the same reader, model artifacts, record files, sets and messages.
// What is added to compare_arms.mjs:
//  - on synth_short_t1 the resampled unit is the request's span (lower case, spaces collapsed): the wordings of one command, with and without words
//    around it, count as one unit (every message of that set must hold exactly one request, and none has a session);
//  - the P3 subset: the messages of synth_short_t1 whose meta.form is "create" (read from the set's own files), in every per-message array of both
//    sidecars, compared by the same code;
//  - the six bars, each looked up by its explicit set, part, view and variant. A missing set, comparison, variant, field or a null value is a MISS,
//    never a skip, and the verdict is "all of exactly these six" (never "every bar that happened to be computed").
// Every comparison in the bars is written with Number.isFinite on both sides: in JavaScript null >= -5, null >= 0 and null <= 0.1 are all true.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compareSidecars, SEED, RESAMPLES } from './compare_arms.mjs';
import { loadSet, BENCH } from './sets.mjs';

const writeAtomic = (p, text) => { const t = p + '.tmp-' + process.pid; writeFileSync(t, text); renameSync(t, p); };   // a reader of the file never sees half of it
export const FRESH = 'synth_short_t1', FRESH_KEY = FRESH + '/all', CREATE_KEY = FRESH_KEY + '#form=create';
export const GUARD_PER_100 = 1.0;   // G bars: at most this many more confident mistakes per 100 requested actions than F_ctrl
export const MAX_POINT_LOSS = 5;    // G bars: the point estimate of the cost difference may not be below -5
const fin = x => typeof x === 'number' && Number.isFinite(x);   // a null, an undefined, a NaN or a string is never a number here
const norm = t => String(t).toLowerCase().split(/\s+/).filter(Boolean).join(' ');   // lower case, spaces collapsed (collect_set.mjs norm)

// ---------------------------------------------------------------- the two fits must be one comparison
/** A must be the fit with short_synth, B the control; the same model readings underneath. Throws on anything else (this replaces assertSameFit). */
export function assertFitPair(A, B) {
  for (const [n, S] of [['A', A], ['B', B]]) {
    if (!S || typeof S !== 'object' || !S.sets || !Array.isArray(S.calibrated_on) || !fin(S.threshold_cost10)) throw new Error(`${n}: not the score file of a confidence fit (no sets, calibrated_on or finite cost-10 threshold)`);
  }
  if (!A.calibrated_on.includes('short_synth')) throw new Error(`A must be F_short: its calibrated_on (${A.calibrated_on}) has no short_synth`);
  if (B.calibrated_on.includes('short_synth')) throw new Error(`B must be F_ctrl: its calibrated_on (${B.calibrated_on}) has short_synth`);
  const rest = A.calibrated_on.filter(s => s !== 'short_synth').sort();
  if (JSON.stringify(rest) !== JSON.stringify([...B.calibrated_on].sort())) throw new Error(`the fits differ in more than short_synth: A on ${A.calibrated_on}, B on ${B.calibrated_on}`);
  if (A.reader !== B.reader) throw new Error(`other readers: ${A.reader} against ${B.reader}`);
  if (A.artifact !== B.artifact) throw new Error('the score files hold other model artifacts: not one model\'s readings');
  const files = S => JSON.stringify([...(S.record_files || [])].sort());
  if (!(A.record_files || []).length || files(A) !== files(B)) throw new Error('the score files were made over other record files');
}

/** the per-message sidecar a score file names, checked against its hash (as compare_arms.mjs) */
export function readSidecar(score) {
  const f = score.per_message?.file;
  if (!f) throw new Error('The score file names no per-message file');
  const text = readFileSync(f, 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== score.per_message.sha256) throw new Error(f + ' changed since the scores were made');
  return JSON.parse(text);
}

// ---------------------------------------------------------------- the per-message arrays
const ARRAYS = ['ids', 'session', 'group', 'overlap'];
/** a sidecar entry with the messages `idx` kept in EVERY per-message array (ids, session, group, overlap and each variant's right, bad, G).
 *  An entry with any other field is refused: a new array nobody filters would silently disagree with the ids. */
export function subsetSidecar(sc, idx) {
  const n = sc.ids.length, out = { tallies: {} };
  for (const k of Object.keys(sc)) {
    if (k === 'tallies') continue;
    if (!ARRAYS.includes(k)) throw new Error(`subsetSidecar: unknown field ${k} (no rule for it)`);
    if (!Array.isArray(sc[k]) || sc[k].length !== n) throw new Error(`subsetSidecar: ${k} does not hold one value per message`);
    out[k] = idx.map(i => sc[k][i]);
  }
  for (const [v, t] of Object.entries(sc.tallies || {})) {
    out.tallies[v] = {};
    for (const f of Object.keys(t)) {
      if (!['right', 'bad', 'G'].includes(f)) throw new Error(`subsetSidecar: ${v}: unknown field ${f}`);
      if (!Array.isArray(t[f]) || t[f].length !== n) throw new Error(`subsetSidecar: ${v}.${f} does not hold one value per message`);
      out.tallies[v][f] = idx.map(i => t[f][i]);
    }
  }
  return out;
}
/** the same sidecar with another `group` array: the resampled unit of a message without a session is its group */
const withGroups = (sc, groups) => ({ ...sc, group: groups.slice() });

/** the set's messages -> {spans: id -> the request's span (lower case, spaces collapsed), forms: id -> meta.form}. Every message must hold exactly one request. */
export function freshInfo(items, rawRows) {
  const spans = new Map(), forms = new Map(), raw = new Map(rawRows.map(r => [r.id, r]));
  if (raw.size !== rawRows.length || raw.size !== items.length) throw new Error(`${FRESH}: ${items.length} messages and ${rawRows.length} rows in its files`);
  for (const it of items) {
    if (!Array.isArray(it.wires) || it.wires.length !== 1) throw new Error(`${FRESH}: ${it.id} holds ${it.wires?.length} requests, not one: the span unit is not defined`);
    const r = raw.get(it.id);
    if (!r) throw new Error(`${FRESH}: ${it.id} is not in the set's files`);
    if (typeof r.meta?.form !== 'string' || !r.meta.form) throw new Error(`${FRESH}: ${it.id} has no meta.form`);
    spans.set(it.id, norm(it.wires[0].span)); forms.set(it.id, r.meta.form);
  }
  return { spans, forms };
}

// ---------------------------------------------------------------- the bars
/** the cost difference of one comparison variant -> {difference, ci95} as numbers or null; `missing` says what is absent */
function variantOf(comparisons, key, variant) {
  const c = comparisons[key];
  if (!c) return { missing: `no comparison for ${key}` };
  const v = c.variants?.[variant];
  if (!v) return { missing: `${key} has no variant ${variant}` };
  return { difference: fin(v.difference) ? v.difference : null, ci95: Array.isArray(v.ci95) && v.ci95.length === 2 ? v.ci95.map(x => (fin(x) ? x : null)) : null, messages: c.messages, resampled_units: c.resampled_units, unit: c.unit };
}
/** the at-threshold block of a score file at set / part / view (today scoring), or null when any step is missing */
const blockOf = (S, set, part, view) => S?.sets?.[set]?.[part]?.views?.[view]?.today?.at_threshold ?? null;

/** the six bars of section 5 -> [{id, measure, ..., pass, reason}] and the verdict. comparisons: compareSidecars output (and the create subset under
 *  CREATE_KEY). Pure: the tests drive it with hand-made objects. */
export function evaluateBars(A, B, comparisons) {
  const bars = [];
  const mk = (id, measure, set, view, fields, ok, reason) => bars.push({ id, measure, set, view, ...fields, pass: ok === true, reason: ok === true ? 'ok' : reason });
  // P1, P3: the lower end of the interval is above 0
  for (const [id, key, measure] of [['P1', FRESH_KEY, 'cost difference, paired, synth_short_t1/all'], ['P3', CREATE_KEY, 'cost difference, paired, synth_short_t1/all, messages of form create']]) {
    const v = variantOf(comparisons, key, 'gold.today.gate');
    if (v.missing) { mk(id, measure, key, 'gold', {}, false, v.missing); continue; }
    const lo = v.ci95 ? v.ci95[0] : null, ok = fin(lo) && lo > 0;
    mk(id, measure, key, 'gold', { difference: v.difference, ci95: v.ci95, messages: v.messages, resampled_units: v.resampled_units, unit: v.unit, rule: 'ci95[0] > 0' }, ok, !v.ci95 || !fin(lo) ? 'ci95 is null' : `ci95[0] = ${lo} is not above 0`);
  }
  // P2: confidently wrong share at each fit's own threshold, point values
  {
    const a = blockOf(A, FRESH, 'all', 'gold'), b = blockOf(B, FRESH, 'all', 'gold'), sa = a?.wrong_execution_share, sb = b?.wrong_execution_share;
    const ok = fin(sa) && fin(sb) && sa <= sb;
    mk('P2', 'confidently wrong share (wrong_execution_share), synth_short_t1/all', FRESH_KEY, 'gold', { a_share: fin(sa) ? sa : null, b_share: fin(sb) ? sb : null, a_executed: a?.executed ?? null, b_executed: b?.executed ?? null,
      a_mistakes: a ? a.wrong + a.extras : null, b_mistakes: b ? b.wrong + b.extras : null, rule: 'F_short share <= F_ctrl share (fractions)' }, ok,
      !a || !b ? 'no at-threshold block' : !fin(sa) || !fin(sb) ? `a share is null (executed: F_short ${a.executed}, F_ctrl ${b.executed}): a fit that executes nothing has no share` : `F_short ${sa} is above F_ctrl ${sb}`);
  }
  // G1-G3: no detectable loss, a point loss of at most 5, at most 1.0 more confident mistake per 100 requested actions
  for (const [id, set, part, view] of [['G1', 'short3', 'test', 'gold'], ['G2', 'fresh2', 'test', 'gold'], ['G3', 'nl_a', 'development', 'opus']]) {
    const key = `${set}/${part}`, v = variantOf(comparisons, key, `${view}.today.gate`), a = blockOf(A, set, part, view), b = blockOf(B, set, part, view);
    const rule = `ci95[1] >= 0; difference >= -${MAX_POINT_LOSS}; F_short wrong+extras <= F_ctrl wrong+extras + requested/100 (${GUARD_PER_100} per 100 requested)`;
    const f = { rule };
    if (v.missing) { mk(id, `guard, ${key}, view ${view}`, key, view, f, false, v.missing); continue; }
    const hi = v.ci95 ? v.ci95[1] : null, d = v.difference;
    const am = a && fin(a.wrong) && fin(a.extras) ? a.wrong + a.extras : null, bm = b && fin(b.wrong) && fin(b.extras) ? b.wrong + b.extras : null;
    const req = a && b && fin(a.requested) && a.requested === b.requested ? a.requested : null;
    // integers only: A's mistakes * 100 <= B's mistakes * 100 + requested * GUARD (per 100 requested)
    const limit = bm != null && req != null ? bm + req * GUARD_PER_100 / 100 : null;
    const okCi = fin(hi) && hi >= 0, okDiff = fin(d) && d >= -MAX_POINT_LOSS, okMis = am != null && limit != null && am * 100 <= bm * 100 + req * GUARD_PER_100;
    const why = [];
    if (!okCi) why.push(!fin(hi) ? 'ci95 is null' : `ci95[1] = ${hi} is below 0`);
    if (!okDiff) why.push(!fin(d) ? 'difference is null' : `difference ${d} is below -${MAX_POINT_LOSS}`);
    if (!okMis) why.push(am == null || bm == null ? 'no at-threshold block' : req == null ? 'the two fits count other requested actions' : `F_short has ${am} confident mistakes, the limit is ${limit}`);
    Object.assign(f, { difference: fin(d) ? d : null, ci95: v.ci95, messages: v.messages, resampled_units: v.resampled_units, unit: v.unit, requested: req,
      a_mistakes: am, b_mistakes: bm, a_mistakes_per_100: am != null && req ? am / req * 100 : null, b_mistakes_per_100: bm != null && req ? bm / req * 100 : null,
      mistake_limit: limit, mistake_limit_floor: limit != null ? Math.floor(limit + 1e-9) : null, a_executed: a?.executed ?? null, b_executed: b?.executed ?? null });
    mk(id, `guard, ${key}, view ${view}`, key, view, f, okCi && okDiff && okMis, why.join('; '));
  }
  const ids = ['P1', 'P2', 'P3', 'G1', 'G2', 'G3'];
  bars.sort((x, y) => ids.indexOf(x.id) - ids.indexOf(y.id));
  if (JSON.stringify(bars.map(b => b.id)) !== JSON.stringify(ids)) throw new Error('internal: the bars are not exactly ' + ids);
  const verdict = bars.length === 6 && bars.every(b => b.pass === true) ? 'PASS' : 'MISS';
  return { bars, verdict, misses: bars.filter(b => !b.pass).map(b => b.id) };
}

// ---------------------------------------------------------------- the whole comparison
/** parsed inputs -> {comparisons, bars, verdict, ...}. sa, sb: the sidecars; fresh: freshInfo() of synth_short_t1. */
export function compareFitsData(A, B, sa, sb, fresh) {
  assertFitPair(A, B);
  const ka = Object.keys(sa).sort(), kb = Object.keys(sb).sort();
  if (JSON.stringify(ka) !== JSON.stringify(kb)) throw new Error(`the two score files hold other sets and parts (${ka} against ${kb})`);
  if (!(FRESH_KEY in sa)) throw new Error(`${FRESH_KEY} is not in the score files: P1-P3 cannot be decided`);
  const prep = sc => {
    const out = { ...sc };
    const f = sc[FRESH_KEY];
    if (f.session.some(s => s != null)) throw new Error(`${FRESH}: a message has a session; the span unit is not defined`);
    const groups = f.ids.map(id => { const g = fresh.spans.get(id); if (g == null) throw new Error(`${FRESH}: ${id} is not a message of the set`); return g; });
    if (fresh.spans.size !== f.ids.length) throw new Error(`${FRESH}: the sidecar holds ${f.ids.length} messages, the set ${fresh.spans.size}`);
    out[FRESH_KEY] = withGroups(f, groups);
    return out;
  };
  const pa = prep(sa), pb = prep(sb);
  if (JSON.stringify(pa[FRESH_KEY].ids) !== JSON.stringify(pb[FRESH_KEY].ids)) throw new Error(`${FRESH}: the two arms hold different messages`);
  const comparisons = compareSidecars(pa, pb, A, B);
  // the create subset: the same comparison on the messages of form create, in every per-message array of both sidecars
  const idx = pa[FRESH_KEY].ids.map((id, i) => (fresh.forms.get(id) === 'create' ? i : -1)).filter(i => i >= 0);
  if (!idx.length) throw new Error(`${FRESH}: no message of form create`);
  const sub = compareSidecars({ [FRESH_KEY]: subsetSidecar(pa[FRESH_KEY], idx) }, { [FRESH_KEY]: subsetSidecar(pb[FRESH_KEY], idx) }, A, B);
  comparisons[CREATE_KEY] = sub[FRESH_KEY];
  for (const k of [FRESH_KEY, CREATE_KEY]) if (comparisons[k]) comparisons[k].unit = 'request span (lower case, spaces collapsed)';   // compare_arms.mjs calls a group's unit "paraphrase group"
  const forms = {}; for (const f of fresh.forms.values()) forms[f] = (forms[f] || 0) + 1;
  return { ...evaluateBars(A, B, comparisons), comparisons, fresh: { messages: pa[FRESH_KEY].ids.length, create_messages: idx.length, per_form: forms, distinct_spans: new Set(fresh.spans.values()).size } };
}

/** the files -> the comparison (reads the score files, their sidecars and the set's own files) */
export function compareFitsFiles(pa, pb) {
  const A = JSON.parse(readFileSync(pa, 'utf8')), B = JSON.parse(readFileSync(pb, 'utf8'));
  assertFitPair(A, B);   // before anything else is read
  const set = loadSet(FRESH), rows = set.files.flatMap(f => readFileSync(resolve(BENCH, f), 'utf8').split('\n').filter(x => x.trim()).map(l => JSON.parse(l)));
  const fresh = freshInfo(set.items, rows), res = compareFitsData(A, B, readSidecar(A), readSidecar(B), fresh);
  const arm = (f, S) => ({ file: f, reader: S.reader, artifact: S.artifact, calibrated_on: S.calibrated_on, threshold_cost10: S.threshold_cost10, record_files: S.record_files });
  return { a: arm(pa, A), b: arm(pb, B), seed: SEED, resamples: RESAMPLES,
    note: 'A = F_short, B = F_ctrl. difference = cost score of A minus B on the same messages, each at its own cost-10 threshold (the gate variants); ci95 resamples the session, else the paraphrase group, else the message; on synth_short_t1 the group of a message is its request\'s span (lower case, spaces collapsed). The bars are those of MODERNBERT_RECAL_PLAN.md section 5; a missing or null value is a miss.',
    guard: { max_point_loss: MAX_POINT_LOSS, confident_mistakes_per_100_requested_over_ctrl: GUARD_PER_100 }, ...res };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pa, pb, out] = process.argv.slice(2);
  if (!pa || !pb || !out) throw new Error('usage: compare_fits.mjs F_SHORT.score.json F_CTRL.score.json OUT.json');
  const r = compareFitsFiles(pa, pb);
  writeAtomic(out, JSON.stringify(r, null, 1) + '\n');
  for (const b of r.bars) console.log(`${b.id} ${b.pass ? 'pass' : 'MISS'}: ${b.measure}` + (b.difference !== undefined ? `; difference ${b.difference} ci95 ${JSON.stringify(b.ci95)}` : '')
    + (b.a_share !== undefined ? `; share F_short ${b.a_share} F_ctrl ${b.b_share}` : '') + (b.mistake_limit !== undefined ? `; confident mistakes F_short ${b.a_mistakes} F_ctrl ${b.b_mistakes} limit ${b.mistake_limit}` : '') + (b.pass ? '' : ` (${b.reason})`));
  console.log('verdict: ' + r.verdict + (r.misses.length ? ' (miss: ' + r.misses.join(', ') + ')' : ''));
}
