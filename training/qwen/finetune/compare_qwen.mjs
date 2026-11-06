// compare_qwen.mjs: a copy of training/neural/parity/compare_arms.mjs (not edited there) with one extension, the plan's Q0.1: every
// variant is also reported as the right share (the same paired computation with a cost of 0 per bad execution: `right_share` beside the
// cost score). With weight 10 it is compare_arms.mjs's computation; test_compare_qwen.mjs checks it reproduces compare_arms.mjs exactly.
// --- compare_arms.mjs's head:
// compare_arms.mjs: the paired difference of the cost score of two arms, per set and part, with a 95% interval from 1000 resamples
// (seeded; none for fewer than 10 units, then an exact sign-flip p-value over the units is the guide). The unit resampled is the session (or scene) of a message, else its paraphrase group, else the message itself: steps of one scene
// and wordings of one group are not independent.
//   node compare_arms.mjs A_SCORES.json B_SCORES.json OUT.json
// A_SCORES / B_SCORES: score_arm.mjs outputs (each names its per-message file and its hash). The difference is A - B, on the same messages
// (the two arms must hold the same ids in the same set and part). Only parts of use "evaluation" are compared: a calibration part never is.
// Two arms that both have a confidence must be fitted on the same calibration parts (calibrated_on): otherwise the difference is partly the fit.
// The Rules have none; against them the other arm's fit is written and the Rules count as executing everything.
// Variant names: <view>.<today|direction>.<all|gate>; all = every request executed, gate = at the arm's own cost-10 threshold.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const writeAtomic = (p, text) => { const t = p + '.tmp-' + process.pid; writeFileSync(t, text); renameSync(t, p); };   // a reader of the file never sees half of it
export const SEED = 20261105, RESAMPLES = 1000;
/** mulberry32 */
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let BAD_WEIGHT = 10;
const cost = (right, bad, G) => (G ? (right - BAD_WEIGHT * bad) / G * 100 : null);

/** the 95% interval of mean(a - b) cost score over resampled units: units = lists of message indices (a message, or a whole session) */
export function pairedInterval(units, G, A, B, resamples = RESAMPLES, seed = SEED) {
  const next = rng(seed), diffs = [], sum = (idx, t) => idx.reduce((s, i) => s + t[i], 0);
  const agg = units.map(u => ({ G: sum(u, G), ar: sum(u, A.right), ab: sum(u, A.bad), br: sum(u, B.right), bb: sum(u, B.bad) }));
  for (let r = 0; r < resamples; r++) {
    let g = 0, ar = 0, ab = 0, br = 0, bb = 0;
    for (let k = 0; k < agg.length; k++) { const u = agg[Math.floor(next() * agg.length)]; g += u.G; ar += u.ar; ab += u.ab; br += u.br; bb += u.bb; }
    if (g) diffs.push(cost(ar, ab, g) - cost(br, bb, g));
  }
  diffs.sort((x, y) => x - y);
  const n = diffs.length;
  return n ? [diffs[Math.floor(.025 * n)], diffs[Math.min(n - 1, Math.ceil(.975 * n) - 1)]] : null;
}
const r4 = x => (x == null ? null : Math.round(x * 1e4) / 1e4);

/** fewer units than this and the interval is not given: with 4 scenes a bootstrap interval is too narrow (a null simulation put its lower end above 0 in 8% of trials) */
export const MIN_UNITS = 10;
/** exact two-sided sign-flip p-value of the sum of per-unit differences (the units are independent, so under "no difference" each difference has either
 *  sign): all 2^n sign patterns for up to 20 units, 20,000 seeded random ones beyond */
export function signFlipP(d, seed = SEED) {
  const n = d.length, obs = Math.abs(d.reduce((x, y) => x + y, 0)) - 1e-9;
  if (!n) return null;
  let hit = 0, total = 0;
  if (n <= 20) {
    for (let m = 0; m < 2 ** n; m++) { let t = 0; for (let i = 0; i < n; i++) t += (m >> i) & 1 ? -d[i] : d[i]; if (Math.abs(t) >= obs) hit++; total++; }
  } else {
    const next = rng(seed + 1);
    for (let r = 0; r < 20000; r++) { let t = 0; for (let i = 0; i < n; i++) t += next() < .5 ? -d[i] : d[i]; if (Math.abs(t) >= obs) hit++; total++; }
  }
  return r4(hit / total);
}
const UNIT_NAME = { S: 'session', G: 'paraphrase group', M: 'message' };

/** the variants of two sidecar entries over the messages in `keep` (indices) */
function variantsOf(a, b, keep) {
  const units = new Map();
  for (const i of keep) { const u = a.session[i] != null ? 'S:' + a.session[i] : a.group && a.group[i] != null ? 'G:' + a.group[i] : 'M:' + a.ids[i]; if (!units.has(u)) units.set(u, []); units.get(u).push(i); }
  const kinds = new Set([...units.keys()].map(u => u[0])), unit = kinds.size > 1 ? 'session, else paraphrase group, else message' : UNIT_NAME[[...kinds][0]] ?? 'message', variants = {};
  for (const v of Object.keys(a.tallies)) {
    if (!(v in b.tallies)) continue;
    const A = a.tallies[v], B = b.tallies[v], G = A.G;
    if (JSON.stringify(G) !== JSON.stringify(B.G)) throw new Error(`${v}: the two arms count other requests`);
    const tot = (t, f) => keep.reduce((x, i) => x + t[f][i], 0), g = keep.reduce((x, i) => x + G[i], 0);
    const ca = cost(tot(A, 'right'), tot(A, 'bad'), g), cb = cost(tot(B, 'right'), tot(B, 'bad'), g), list = [...units.values()];
    const num = u => u.reduce((x, i) => x + (A.right[i] - BAD_WEIGHT * A.bad[i]) - (B.right[i] - BAD_WEIGHT * B.bad[i]), 0);
    variants[v] = { a: r4(ca), b: r4(cb), difference: r4(ca == null ? null : ca - cb) };
    if (units.size < MIN_UNITS) { variants[v].ci95 = null; variants[v].ci95_reason = `too few units (${units.size} ${unit})`; }
    else variants[v].ci95 = pairedInterval(list, G, A, B)?.map(r4) ?? null;
    variants[v].p_sign_flip = signFlipP(list.map(num));
  }
  return { messages: keep.length, resampled_units: units.size, unit, variants };
}

/** the comparisons of two sidecars (score_arm.mjs) -> {key: {...}}; scores: the score JSONs (for `use`). Also without the messages either arm trained on
 *  (records marked train_text_overlap), when there are any. */
export function compareSidecars(sa, sb, scoreA, scoreB, weight = 10) {
  const prev = BAD_WEIGHT; BAD_WEIGHT = weight;
  try { return compareSidecars0(sa, sb, scoreA, scoreB); } finally { BAD_WEIGHT = prev; }
}
/** both: the cost score (weight 10) and the right share (weight 0) of every variant */
export function compareBoth(sa, sb, scoreA, scoreB) {
  const c = compareSidecars(sa, sb, scoreA, scoreB, 10), r = compareSidecars(sa, sb, scoreA, scoreB, 0);
  for (const [k, x] of Object.entries(c)) {
    for (const [v, y] of Object.entries(x.variants)) y.right_share = r[k].variants[v];
    if (x.without_train_text_overlap) for (const [v, y] of Object.entries(x.without_train_text_overlap.variants)) y.right_share = r[k].without_train_text_overlap.variants[v];
  }
  return c;
}
function compareSidecars0(sa, sb, scoreA, scoreB) {
  const out = {};
  for (const key of Object.keys(sa)) {
    if (!(key in sb)) continue;
    const [set, part] = key.split('/');
    if (scoreA.sets[set]?.[part]?.use !== 'evaluation' || scoreB.sets[set]?.[part]?.use !== 'evaluation') continue;
    const a = sa[key], b = sb[key];
    if (JSON.stringify(a.ids) !== JSON.stringify(b.ids)) throw new Error(`${key}: the two arms hold different messages`);
    const all = a.ids.map((_, i) => i), drop = new Set(all.filter(i => (a.overlap && a.overlap[i]) || (b.overlap && b.overlap[i])));
    try { out[key] = variantsOf(a, b, all); } catch (e) { throw new Error(`${key} ${e.message}`); }
    out[key].train_text_overlap_messages = drop.size;
    if (drop.size) out[key].without_train_text_overlap = variantsOf(a, b, all.filter(i => !drop.has(i)));
  }
  return out;
}

/** two arms that both have a confidence must be fitted on the same calibration parts */
export function assertSameFit(A, B) {
  if (A.threshold_cost10 != null && B.threshold_cost10 != null && JSON.stringify([...A.calibrated_on].sort()) !== JSON.stringify([...B.calibrated_on].sort()))
    throw new Error(`The two arms were not fitted on the same calibration parts (${A.calibrated_on} against ${B.calibrated_on}): the difference would be partly the fit`);
}
function sidecar(score) {
  const f = score.per_message?.file;
  if (!f) throw new Error('The score file names no per-message file');
  const text = readFileSync(f, 'utf8');
  if (createHash('sha256').update(text).digest('hex') !== score.per_message.sha256) throw new Error(f + ' changed since the scores were made');
  return JSON.parse(text);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pa, pb, out] = process.argv.slice(2);
  if (!pa || !pb || !out) throw new Error('usage: compare_qwen.mjs A_SCORES.json B_SCORES.json OUT.json');
  const A = JSON.parse(readFileSync(pa, 'utf8')), B = JSON.parse(readFileSync(pb, 'utf8'));
  assertSameFit(A, B);
  const comparisons = compareBoth(sidecar(A), sidecar(B), A, B);
  if (!Object.keys(comparisons).length) throw new Error('No evaluation part in common');
  const arm = (f, S) => ({ file: f, reader: S.reader, artifact: S.artifact, calibrated_on: S.calibrated_on, threshold_cost10: S.threshold_cost10 });
  writeAtomic(out, JSON.stringify({ a: arm(pa, A), b: arm(pb, B), seed: SEED, resamples: RESAMPLES,
    note: 'difference = cost score of A minus B on the same messages; ci95 resamples the session, else the paraphrase group, else the message; the gate variants use each arm\'s own cost-10 threshold', comparisons }, null, 1) + '\n');
  for (const [k, c] of Object.entries(comparisons)) for (const [v, x] of Object.entries(c.variants)) if (/\.(today|direction)\.(gate|all)$/.test(v)) console.log(`${k} ${v}: A ${x.a} B ${x.b} diff ${x.difference} ci95 ${x.ci95 ? JSON.stringify(x.ci95) : x.ci95_reason} p ${x.p_sign_flip} | right share: A ${x.right_share.a} B ${x.right_share.b} diff ${x.right_share.difference} ci95 ${x.right_share.ci95 ? JSON.stringify(x.right_share.ci95) : x.right_share.ci95_reason} (${c.unit})`);
}
