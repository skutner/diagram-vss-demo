// score_arm.mjs: any arm's records, per set and part, by the main metric of AGENTS.md ("What counts as an error").
//   node score_arm.mjs CONFIDENCE.json OUT.json RECORDS.jsonl...        (CONFIDENCE.json = "none" for the Rules: every request executed only)
// Per set and part (and the pool fresh2+short3):
//   - every request executed: right / wrong / not done / extras per requested action;
//   - at the cost-10 threshold of the confidence file: right, wrong, asked, unread, extras, execution precision, cost score, AUROC;
//   - each by trigger seen / unseen, by kind, by writer (where the folder gives one).
// Every number twice: `today` (docs/js/bench-canon.js: the scale of a resize is not compared) and `direction` (a resize must also go the same
// way as a gold request it matches: smaller if scale < 1, bigger for no scale or scale > 1, none when a size word is set; for a gold row with
// no scale the shrink-word rule of parity_lib.mjs goldProgram). Records of the first run hold no produced scale: `direction` is null there.
// Sets with two teachers: view `opus` (the paired Opus request) and view `either` (right also when equal to any gpt request of the message;
// an extra only when it matches neither); the teachers' agreement (one folder scored against the other: the ceiling).
// collected_1 also has both teachers' labels (teachers/{opus,gpt}): views `gold` (its existing gold), `teacher_opus` and `teacher_either`
// (the requests are paired again against the teachers' labels), their agreement with each other and with the gold. Rows flagged `unreliable`
// (a session row after a failed step) are read normally but left out of the measures by engine effect (sessions, paraphrase consistency).
// Also: actions executed per 100 `nothing_to_do` messages; paraphrase consistency (rows with a `group`, run on their `setup`); sessions (each
// reader's executed requests, read in the gold context of each step, played on its own drawing: finalShares of free_run.mjs).
// A calibration part is scored too but is marked use: "fit" (or "calibration-part"): it never counts as a result and compare_arms skips it.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { confidence } from '../../../docs/js/neural-confidence.js';
import { auroc, decisions, stats } from '../calibrate_modernbert.mjs';
import { run, cp, diffs, same, LOOSE } from './parity_lib.mjs';
import { SET_ORDER, PARTS, sessionsOf } from './sets.mjs';
import { loadRecords, oneArm, itemsOf, goldCount, goldGroups, sameDirection, startSystem, playGold, asReader, teacherRecord, viewOutcomes, SHRINK_RE, REGISTERED_SHRINK_RE, truthfulItemsOf, TRUTHFUL_V1, loadViewDir, loadPopulations } from './arm_lib.mjs';
import { compareFinal, questionStep, aggregateSessions, reliableSteps } from './session_lib.mjs';

const writeAtomic = (p, text) => { const t = p + '.tmp-' + process.pid; writeFileSync(t, text); renameSync(t, p); };   // a reader of the file never sees half of it
const r4 = x => (x == null ? null : Math.round(x * 1e6) / 1e6);
const trigGroups = ['seen', 'unseen', 'unannotated', 'unpaired extras'];

/** every request executed: right / wrong / not done / extras */
export function allStats(items, G, cost = 10) {
  let right = 0, wrong = 0, extras = 0;
  for (const x of items) { if (x.o === 'right') right++; else if (x.o === 'wrong') wrong++; else extras++; }
  const executed = right + wrong + extras;
  return { requested: G, right, wrong, not_done: G - right - wrong, extras, executed, execution_precision: r4(executed ? right / executed : null), right_share: r4(G ? right / G : null),
    cost_score: r4(G ? (right - cost * (wrong + extras)) / G * 100 : null) };
}
const gateStats = (decided, G) => { const s = stats(decided.map(x => ({ ...x, c: x.execute ? 1 : 0, dependencies: [] })), G, .5); return roundStats(s); };
const roundStats = s => ({ ...s, execution_precision: r4(s.execution_precision), wrong_execution_share: r4(s.wrong_execution_share), right_share: r4(s.right_share), cost_score: r4(s.cost_score) });

/** items of records -> confidence (NaN, so never executed, when the signals or the confidence file are missing: fail closed) */
export function scoredItems(items, spec) {
  return items.map(x => ({ ...x, c: spec && x.f && x.act ? confidence(spec, x.f, x.act) : NaN }));
}

function viewResult(records, view, scoring, spec, threshold) {
  const { items, unavailable } = itemsOf(records, view, scoring);
  if (scoring === 'direction' && unavailable) return { direction_unavailable: `${unavailable} resize requests with a right outcome have no produced scale in the records` };
  const scored = scoredItems(items, spec), G = goldCount(records, view), out = { all_executed: allStats(scored, G) };
  const decidedAll = spec ? decisions(scored, threshold) : null;
  if (spec) {
    const finite = scored.filter(x => Number.isFinite(x.c));
    out.at_threshold = { threshold, ...roundStats(stats(scored, G, threshold, 10)), auroc: r4(auroc(finite)), without_confidence: scored.length - finite.length };
  }
  const sub = (name, pick, Gsub, key) => {
    const rs = pick, xs = scored.filter(x => rs(x)), d = decidedAll ? decidedAll.filter(x => rs(x)) : null;
    out[name][key] = { all_executed: allStats(xs, Gsub), ...(d ? { at_threshold: gateStats(d, Gsub) } : {}) };
  };
  out.by_trigger = {}; out.by_kind = {}; out.by_writer = {};
  for (const g of trigGroups) sub('by_trigger', x => x.triggerGroup === g, records.reduce((n, r) => n + goldGroups(r, view).filter(x => x === g).length, 0), g);
  const byRec = (name, field) => {
    for (const v of [...new Set(records.map(r => r[field]).filter(x => x != null))]) { const ms = new Set(records.map((r, i) => [r, i]).filter(([r]) => r[field] === v).map(([, i]) => i)); sub(name, x => ms.has(x.mi), goldCount(records.filter(r => r[field] === v), view), v); }
  };
  byRec('by_kind', 'kind'); byRec('by_writer', 'writer');
  return out;
}

/** a list of records -> the per-message tallies a paired comparison resamples: {right[], bad[]} executed at the threshold ('gate') or all */
function tallies(records, view, scoring, spec, threshold) {
  const { items, unavailable } = itemsOf(records, view, scoring);
  if (scoring === 'direction' && unavailable) return null;
  const scored = scoredItems(items, spec), out = {};
  for (const mode of ['all', 'gate']) {
    // an arm with no confidence (the Rules) executes everything at any threshold: its gate tally is the all tally
    const dec = mode === 'gate' && spec ? decisions(scored, threshold) : scored.map(x => ({ ...x, execute: true })), right = records.map(() => 0), bad = records.map(() => 0);
    for (const x of dec) if (x.execute) { if (x.o === 'right') right[x.mi]++; else bad[x.mi]++; }
    out[mode] = { right, bad, G: records.map(r => goldCount([r], view)) };
  }
  return out;
}

// ---------------------------------------------------------------- teachers' agreement
/** one labeller's requests scored as a reader's against another's (the ceiling of agreement): per requested action of `against` */
function labelScores(records, fromOf, againstOf) {
  const res = {};
  for (const scoring of ['today', 'direction']) {
    let right = 0, wrong = 0, extras = 0, G = 0;
    for (const r of records) {
      const against = againstOf(r);
      G += against.length;
      for (const x of asReader(r.text, fromOf(r), against)) {
        let o = x.o;
        if (o === 'right' && scoring === 'direction' && x.pa === 'command:resize' && !sameDirection(x.dir, against[x.g].dirWant)) o = 'wrong';
        if (o === 'right') right++; else if (o === 'wrong') wrong++; else extras++;
      }
    }
    res[scoring] = { requested: G, right, wrong, not_done: G - right - wrong, extras, right_share: r4(G ? right / G : null), cost_score: r4(G ? (right - 10 * (wrong + extras)) / G * 100 : null) };
  }
  return res;
}
const agreement = records => ({ gpt_scored_against_opus: labelScores(records, r => r.goldAlt, r => r.goldSpans), opus_scored_against_gpt: labelScores(records, r => r.goldSpans, r => r.goldAlt) });
export { labelScores, agreement };   // the teachers' agreement by the scorer's own rule (a worker measures a training folder with it)
const goldAgreement = records => ({ gold_scored_against_opus: labelScores(records, r => r.goldSpans, r => r.teachers.opus), opus_scored_against_gold: labelScores(records, r => r.teachers.opus, r => r.goldSpans),
  gold_scored_against_gpt: labelScores(records, r => r.goldSpans, r => r.teachers.gpt), gpt_scored_against_gold: labelScores(records, r => r.teachers.gpt, r => r.goldSpans) });

// ---------------------------------------------------------------- engine: sessions and paraphrases
const errCount = res => (res.errors || []).length + (res.thrown ? 1 : 0);
const nodesOf = (r, exec) => r.produced.flatMap((x, pi) => {
  if (!x.nodes) throw new Error(`record ${r.id}: the produced requests hold no wires (records of the first run cannot be replayed)`);
  return exec(r, pi) ? cp(x.nodes) : [];
});

function sessionScores(records, exec) {
  const list = []; let left = 0;
  for (const { session, items } of sessionsOf(records)) {
    const { steps, leftOut } = reliableSteps(items);
    left += leftOut;
    if (!steps.length) continue;
    const first = steps[0], dual = steps.every(r => r.goldAlt);
    const G = startSystem(first.setup), Gx = dual ? startSystem(first.setup) : null, R = startSystem(first.setup), setup = cp(G.s.world.state);
    let soFar = '', engineErrors = 0, goldErrors = G.errors.length; const questions = [];
    for (const r of steps) {
      soFar += ' ' + r.text;
      const gres = playGold(G.s, r.goldSpans); goldErrors += errCount(gres);
      if (Gx) playGold(Gx.s, r.goldAlt);
      const rres = run(R.s, nodesOf(r, exec)); engineErrors += errCount(rres);
      questions.push(questionStep(gres, rres));
    }
    list.push({ session, steps: steps.length, ...compareFinal(G.s.world.state, Gx && Gx.s.world.state, R.s.world.state, setup, soFar), questions, engine_errors: engineErrors, gold_errors: goldErrors });
  }
  return aggregateSessions(list, left);
}

function paraphraseScores(records, exec) {
  const by = new Map();
  for (const r of records) if (r.group != null && !r.unreliable) { if (!by.has(r.group)) by.set(r.group, []); by.get(r.group).push(r); }
  let groups = 0, wordings = 0, consistent = 0, nothing = 0, goldSame = 0, eitherSame = 0, setupErrors = 0;
  for (const [, rs] of by) {
    if (rs.length < 2) continue;
    groups++; wordings += rs.length;
    const D = rs.map(r => {
      const S = startSystem(r.setup); setupErrors += S.errors.length;
      const base = cp(S.s.world.state); run(S.s, nodesOf(r, exec));
      const g = startSystem(r.setup); playGold(g.s, r.goldSpans);
      let x = null; if (r.goldAlt) { x = startSystem(r.setup); playGold(x.s, r.goldAlt); }
      return { base, got: S.s.world.state, gold: g.s.world.state, alt: x && x.s.world.state };
    });
    let best = 0;
    D.forEach((a, i) => { let n = 0; D.forEach((b, j) => { if (i === j || same(diffs(a.got, b.got, LOOSE, { base: a.base }))) n++; }); best = Math.max(best, n); });
    consistent += best;
    D.forEach(d => {
      if (same(diffs(d.base, d.got, LOOSE, { base: d.base }))) nothing++;
      const g = same(diffs(d.gold, d.got, LOOSE, { base: d.base })), x = d.alt ? same(diffs(d.alt, d.got, LOOSE, { base: d.base })) : false;
      if (g) goldSame++; if (g || x) eitherSame++;
    });
  }
  if (!groups) return null;
  const sh = n => r4(wordings ? n / wordings : null);
  return { groups, wordings, same_effect_share: sh(consistent), changed_nothing_share: sh(nothing), same_effect_as_gold_share: sh(goldSame), ...(records.every(r => r.goldAlt) ? { same_effect_as_either_teacher_share: sh(eitherSame) } : {}), setup_errors: setupErrors };
}

function nothingToDo(records, exec) {
  const rs = records.map((r, i) => [r, i]).filter(([r]) => r.kind === 'nothing_to_do');
  if (!rs.length) return null;
  let executed = 0, extras = 0;
  for (const [r] of rs) r.produced.forEach((x, pi) => { if (exec(r, pi)) { executed++; if (x.o === 'extra') extras++; } });
  return { messages: rs.length, requested_in_these: rs.reduce((n, [r]) => n + r.gold, 0), actions_executed: executed, actions_executed_per_100_messages: r4(executed / rs.length * 100) };
}

// ---------------------------------------------------------------- L2: the requests that ask for smaller
/** the gold resizes with no scale and no size whose span holds a word for smaller, counted by two rules: `registered` (goldProgram's words today: the
 *  plan's L2 count, 17 on fresh2+short3 test) and `scorer` (SHRINK_RE, which also reads "more small" and "smaler": 19). For each: how many have a
 *  paired request that is a resize making the shape smaller (every request executed), how many are right with the direction compared, and how many
 *  of those smaller ones the threshold lets through (null for an arm with no confidence). unavailable: resizes with no produced scale in the records. */
export function resizeSmaller(records, spec, threshold) {
  const gate = spec ? gateExec(records, spec, threshold) : null, out = {};
  for (const [name, re] of [['registered', REGISTERED_SHRINK_RE], ['scorer', SHRINK_RE]]) {
    const c = { requested: 0, executed_smaller: 0, right_with_direction: 0, gate_smaller: gate ? 0 : null, unavailable: 0 };
    for (const r of records) {
      const dirO = viewOutcomes(r, 'primary', 'direction').o;
      r.goldSpans.forEach((g, gi) => {
        if (g.args.action !== 'resize' || g.args.scale != null || g.args.size != null || !re.test(g.span || '')) return;
        c.requested++;
        const pi = r.produced.findIndex(x => x.g === gi);
        if (pi < 0 || r.produced[pi].pa !== 'command:resize') return;
        const x = r.produced[pi];
        if (x.dir === undefined) { c.unavailable++; return; }
        if (x.dir === 'smaller') { c.executed_smaller++; if (gate && gate(r, pi)) c.gate_smaller++; }
        if (dirO[pi] === 'right') c.right_with_direction++;
      });
    }
    out[name] = c;
  }
  return out;
}

// ---------------------------------------------------------------- one part
export function scorePart(records, spec, threshold, { engine = true, nested = false } = {}) {
  const dual = records.every(r => r.goldAlt), views = dual ? { opus: 'primary', either: 'either' } : { gold: 'primary' };
  const part = { messages: records.length, requested: goldCount(records), produced: records.reduce((n, r) => n + r.produced.length, 0), failed_messages: records.filter(r => r.error).length, views: {} };
  const sidecar = { ids: records.map(r => r.id), session: records.map(r => r.session), group: records.map(r => r.group), overlap: records.map(r => !!r.train_text_overlap), tallies: {} };
  const specs = Object.entries(views).map(([name, view]) => ({ name, view, recs: records }));
  const tv = records.length && records.every(r => r.teachers) ? records.map(teacherRecord) : null;
  if (tv) specs.push({ name: 'teacher_opus', view: 'primary', recs: tv }, { name: 'teacher_either', view: 'either', recs: tv });
  for (const { name, view, recs } of specs) {
    part.views[name] = {};
    for (const scoring of ['today', 'direction']) {
      part.views[name][scoring] = viewResult(recs, view, scoring, spec, threshold);
      const t = tallies(recs, view, scoring, spec, threshold);
      if (t) for (const [mode, v] of Object.entries(t)) sidecar.tallies[`${name}.${scoring}.${mode}`] = v;
    }
  }
  part.resize_smaller = resizeSmaller(records, spec, threshold);
  const overlapped = records.filter(r => r.train_text_overlap).length;
  part.train_text_overlap_messages = overlapped;
  if (overlapped && !nested) {
    const kept = scorePart(records.filter(r => !r.train_text_overlap), spec, threshold, { engine: false, nested: true }).part;
    part.excluding_train_text_overlap = { messages: kept.messages, requested: kept.requested, note: 'the same numbers on the messages the arm\'s training rows do not hold (records marked train_text_overlap left out)',
      views: Object.fromEntries(Object.entries(kept.views).map(([n, v]) => [n, Object.fromEntries(Object.entries(v).map(([sc, x]) => [sc, x.direction_unavailable ? x : { all_executed: x.all_executed, ...(x.at_threshold ? { at_threshold: x.at_threshold } : {}) }]))])) };
  }
  if (dual) {
    part.teachers_agreement = agreement(records);
    part.reading = { headline_view: 'opus', ceiling: 'teachers_agreement.gpt_scored_against_opus: gpt\'s requests scored against Opus\'s by the same pairing and value rule as the headline view', either_view: 'an upper reading, not the headline: the requested actions are the union of the two teachers\' requests (a gpt request that pairs with an Opus request shares its slot), each filled by one produced request at most' };
  }
  if (tv) { part.teachers_agreement = agreement(tv); part.gold_agreement_with_teachers = goldAgreement(records); }
  if (engine) {
    const execs = { all_executed: () => true };
    if (spec) execs.at_threshold = gateExec(records, spec, threshold);
    for (const [mode, exec] of Object.entries(execs)) {
      const nt = nothingToDo(records, exec), pp = paraphraseScores(records, exec), ss = records.some(r => r.session != null) ? sessionScores(records.filter(r => r.session != null), exec) : null;
      if (nt) (part.nothing_to_do ||= {})[mode] = nt;
      if (pp) (part.paraphrase ||= {})[mode] = pp;
      if (ss) (part.sessions ||= {})[mode] = ss;
    }
    // the floor: a reader that executes nothing, on the same groups and sessions (it is as consistent as can be, and shares the unchanged setup)
    const none = () => false, fp = paraphraseScores(records, none), fs = records.some(r => r.session != null) ? sessionScores(records.filter(r => r.session != null), none) : null;
    if (fp || fs) part.do_nothing_floor = { ...(fp ? { paraphrase: fp } : {}), ...(fs ? { sessions: { ...fs, per_session: undefined } } : {}) };
  }
  return { part, sidecar };
}
/** the execution decision of every produced request at the threshold: exec(record, index of the produced request) */
function gateExec(records, spec, threshold) {
  const { items } = itemsOf(records, 'primary', 'today'), dec = decisions(scoredItems(items, spec), threshold), map = new Map();
  for (const x of dec) map.set(x.mi + ':' + x.pi, x.execute);
  const idx = new Map(records.map((r, i) => [r, i]));
  return (r, pi) => !!map.get(idx.get(r) + ':' + pi);
}

// ---------------------------------------------------------------- truthful_v1: the new versioned view (the plan's sections 3 and 5)
// Never written into the legacy score blocks above (a legacy score file keeps its bytes); scoreArmTruthful writes a score file of its own.
//  - outcome of a produced request: arm_lib.mjs truthfulItemsOf (resize direction and explicit scale, text-key presence and exact value);
//  - eligibility: a request is STRUCTURALLY HELD when a v2 reader marked it `blocked`, when it is truncated (the existing limit hold), or when it depends
//    on a request that is (a dependency missing from the record counts too); that holds at every level, also with no threshold ("ungated");
//  - a request that is not structurally held is an ELIGIBLE UNGATED PROPOSAL; at the cost-10 threshold it is executed when its confidence is finite and at
//    or above the threshold and everything it depends on is executed, else it is a CONFIDENCE HOLD (a missing confidence is a hold: fail closed);
//  - every share has ALL the frozen gold requested actions as its denominator, structural holds and unread requests included: eligibility restricts
//    what is executed, never the denominator. Cost = 100 * (right - 10 * (wrong + extras)) / requested; risk = (wrong + extras) / executed, with a Wilson
//    interval; zero executions give a null risk, and a null is never a pass (verdicts use fin()).
export const WILSON_Z = 1.959964;
/** the Wilson score interval of k out of n (95%), or null for n = 0 */
export function wilson(k, n) {
  if (!(n > 0)) return null;
  const p = k / n, z2 = WILSON_Z * WILSON_Z, d = 1 + z2 / n, c = p + z2 / (2 * n), h = WILSON_Z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n));
  return [r4(Math.max(0, (c - h) / d)), r4(Math.min(1, (c + h) / d))];
}
const finite = x => typeof x === 'number' && Number.isFinite(x);
/** the structural hold of every item: item -> null | 'blocked' | 'limit' | 'dependency'. Items: {id, wireId, dependencies, blocked, truncated}. */
export function structuralHolds(items) {
  const keys = new Map(items.map(x => [x.id + '\0' + x.wireId, x])), memo = new Map(), active = new Set();
  const hold = x => {
    if (memo.has(x)) return memo.get(x);
    if (active.has(x)) return 'dependency';   // a cycle never executes
    active.add(x);
    let h = x.blocked ? 'blocked' : x.truncated ? 'limit' : null;
    if (!h) for (const id of x.dependencies || []) { const d = keys.get(x.id + '\0' + id); if (!d || hold(d)) { h = 'dependency'; break; } }
    active.delete(x); memo.set(x, h);
    return h;
  };
  return new Map(items.map(x => [x, hold(x)]));
}
/** items (with `c`, NaN when there is no confidence) -> the same items with {structural: null | kind, execute, hold: null | 'structural' | 'confidence'}.
 *  threshold null: ungated (executed unless structurally held); a number: executed when also c >= threshold and every dependency is executed. */
export function decideTruthful(items, threshold) {
  const holds = structuralHolds(items), keys = new Map(items.map(x => [x.id + '\0' + x.wireId, x])), memo = new Map(), active = new Set();
  const run = x => {
    if (memo.has(x)) return memo.get(x);
    if (active.has(x)) return false;
    active.add(x);
    const yes = !holds.get(x) && (threshold == null || (finite(x.c) && x.c >= threshold)) && (x.dependencies || []).every(id => { const d = keys.get(x.id + '\0' + id); return d && run(d); });
    active.delete(x); memo.set(x, yes);
    return yes;
  };
  return items.map(x => { const execute = run(x), structural = holds.get(x); return { ...x, structural, execute, hold: execute ? null : structural ? 'structural' : 'confidence' }; });
}
const zeroWould = () => ({ right: 0, wrong: 0, extra: 0 });
/** the counts of decided items (decideTruthful) against G requested actions -> the numbers of one level */
export function truthfulStats(decided, G, cost = 10) {
  let right = 0, wrong = 0, extras = 0, paired = 0;
  const structural = { total: 0, by_kind: {}, would_be: zeroWould() }, confidenceHolds = { total: 0, would_be: zeroWould() };
  for (const x of decided) {
    if (x.g >= 0) paired++;
    if (x.execute) { if (x.o === 'right') right++; else if (x.o === 'wrong') wrong++; else extras++; continue; }
    const t = x.hold === 'structural' ? structural : confidenceHolds;
    t.total++; t.would_be[x.o]++;
    if (x.hold === 'structural') structural.by_kind[x.structural] = (structural.by_kind[x.structural] || 0) + 1;
  }
  const executed = right + wrong + extras, bad = wrong + extras;
  return { requested: G, produced: decided.length, executed, right, wrong, extras, structural_holds: structural, confidence_holds: confidenceHolds, unread: G - paired,
    right_share: r4(G ? right / G : null), cost_score: r4(G ? 100 * (right - cost * bad) / G : null), execution_precision: r4(executed ? right / executed : null),
    risk: r4(executed ? bad / executed : null), risk_wilson95: wilson(bad, executed), wrong_plus_extras_per_100_requested: r4(G ? bad / G * 100 : null) };
}
/** the bookkeeping identity of one level: what was produced is executed, structurally held or confidence-held; what was requested is paired or unread */
export const levelReconciles = st => st.executed + st.structural_holds.total + st.confidence_holds.total === st.produced && st.right + st.wrong <= st.requested && st.unread >= 0 && st.unread <= st.requested;

/** the index of the gold request of a record an unpaired produced request overlaps most (by characters), or -1 */
function overlapGold(r, x) {
  let best = -1, bi = 0;
  r.goldSpans.forEach((g, gi) => { const o = Math.max(0, Math.min(g.e, x.span[1]) - Math.max(g.s, x.span[0])); if (o > bi) { bi = o; best = gi; } });
  return best;
}
/** a population = {requests: Map(message id -> Set(gold index))} or null (every request of the records). Returns, for records, spec and threshold:
 *  {ungated, gated, tallies: {all, gate}, extras_unattributed, ...}. A produced request belongs to a population by the gold request it is paired with; an
 *  extra by the gold request it overlaps most (an extra that overlaps none belongs to no request population and is counted in extras_unattributed). */
export function truthfulPopulation(records, spec, threshold, pop = null) {
  const { items, unavailable, directionOnly, caseOnly } = truthfulItemsOf(records), scored = scoredItems(items, spec);
  // A message whose every gold request is in the population is a WHOLE message: everything produced from it belongs to the population, an extra that overlaps no gold
  // request included (it is a confident mistake made while reading that message). Only a message with some of its requests in the population attributes by pairing / overlap.
  const inPop = (x, r) => { if (!pop) return true; const set = pop.requests.get(r.id); if (!set) return false; if (set.size === r.gold) return true; const gi = x.g >= 0 ? x.g : overlapGold(r, x); return gi >= 0 && set.has(gi); };
  const Gof = r => (pop ? (pop.requests.get(r.id) ? pop.requests.get(r.id).size : 0) : r.gold);
  const G = records.reduce((n, r) => n + Gof(r), 0), gateOn = !!spec && finite(threshold);
  const levels = { ungated: decideTruthful(scored, null), gated: gateOn ? decideTruthful(scored, threshold) : null };
  const pick = d => d.filter(x => inPop(x, records[x.mi]));
  const out = { requested: G, messages: pop ? records.filter(r => Gof(r) > 0).length : records.length, messages_with_requests: records.filter(r => Gof(r) > 0).length, groups: new Set(records.filter(r => Gof(r) > 0).map(r => r.group_key ?? r.id)).size, available: unavailable === 0, unavailable_requests: unavailable, direction_only_scored: directionOnly, text_case_only_mismatches: caseOnly,
    extras_unattributed: pop ? scored.filter(x => x.o === 'extra' && pop.requests.has(records[x.mi].id) && !inPop(x, records[x.mi])).length : 0 };   // extras of the population's own messages that no request of it claims
  const tallies = {};
  for (const [name, d] of Object.entries(levels)) {
    if (!d) { out[name] = null; continue; }
    const xs = pick(d);
    out[name] = truthfulStats(xs, G);
    if (name === 'gated') { const fin = xs.filter(x => !x.structural && finite(x.c)); out.auroc = r4(auroc(fin)); out.without_confidence = xs.filter(x => !x.structural && !finite(x.c)).length; }
    const right = records.map(() => 0), bad = records.map(() => 0);
    for (const x of xs) if (x.execute) { if (x.o === 'right') right[x.mi]++; else bad[x.mi]++; }
    tallies[name === 'gated' ? 'gate' : 'all'] = { right, bad, G: records.map(Gof) };
  }
  if (!tallies.gate) tallies.gate = tallies.all;   // an arm with no confidence executes every eligible request at any threshold (as tallies() above)
  out.tallies = tallies;
  return out;
}
/** a part's truthful_v1 block: the whole records, by trigger group, by meta.form (where the records carry it) */
export function truthfulPart(records, spec, threshold) {
  const base = truthfulPopulation(records, spec, threshold, null), { tallies, ...part } = base;
  const { items } = truthfulItemsOf(records), scored = scoredItems(items, spec);
  const levels = { ungated: decideTruthful(scored, null), gated: spec && finite(threshold) ? decideTruthful(scored, threshold) : null };
  const strata = (keyOfItem, keyOfGold) => {
    const Gs = {}; for (const r of records) r.goldSpans.forEach(g => { const k = keyOfGold(r, g); if (k != null) Gs[k] = (Gs[k] || 0) + 1; });
    const out = {};
    for (const k of Object.keys(Gs)) { out[k] = {}; for (const [name, d] of Object.entries(levels)) if (d) out[k][name] = truthfulStats(d.filter(x => keyOfItem(x, records[x.mi]) === k), Gs[k]); }
    return out;
  };
  part.by_trigger = strata((x, r) => (x.g >= 0 ? r.goldSpans[x.g].triggerGroup : null), (r, g) => g.triggerGroup);
  if (records.every(r => r.meta && r.meta.form != null)) part.by_meta_form = strata((x, r) => (x.g >= 0 ? r.meta.form : null), (r) => r.meta.form);
  return { part, tallies };
}
/** the sidecar of paired comparisons: the frozen group (never the session) is the resampled unit, so `session` is null for every message */
export function truthfulSidecar(records, tallies) {
  return { ids: records.map(r => r.id), session: records.map(() => null), group: records.map(r => r.group_key ?? r.id), overlap: records.map(r => !!r.train_text_overlap),
    tallies: Object.fromEntries(Object.entries(tallies).map(([k, v]) => [`gold.${TRUTHFUL_V1}.${k}`, v])) };
}
/** the whole arm under truthful_v1 -> {out, sidecar}: per set (view) and part, plus the named populations ({name: {view, part, requests: Map}}) */
export function scoreArmTruthful(spec, records, { populations = [] } = {}) {
  const arm = oneArm(records), threshold = spec ? spec.levels_out_of_fold?.cost?.threshold : null;
  if (spec && (spec.arm?.cal_sets == null || !finite(threshold))) throw new Error('The confidence file has no finite cost threshold (or was not made by calibrate_arm.mjs)');
  if (spec && artifactOf(spec) !== arm.artifact) throw new Error('The confidence file was fitted for other model artifacts than the records hold');
  if (!spec && arm.reader !== 'rules') throw new Error(`The reader ${arm.reader} has a confidence: pass its CONFIDENCE.json (not "none")`);
  const calSets = spec ? spec.arm.cal_sets : [];
  const out = { schema: 'arm-score-truthful-v1', scoring: TRUTHFUL_V1, reader: arm.reader, artifact: arm.artifact, threshold_cost10: spec ? threshold : null, calibrated_on: calSets, sets: {}, populations: {}, notes: [] };
  const sidecar = {};
  for (const set of SET_ORDER) for (const part of PARTS[set]) {
    const rs = records.filter(r => r.set === set && r.part === part);
    if (!rs.length) continue;
    const { part: p, tallies } = truthfulPart(rs, spec, threshold);
    p.use = part === 'calibration' ? (calSets.includes(set) ? 'fit' : 'calibration-part') : 'evaluation';
    (out.sets[set] ||= {})[part] = p; sidecar[`${set}/${part}`] = truthfulSidecar(rs, tallies);
  }
  for (const pop of populations) {
    const rs = records.filter(r => r.set === pop.view && (pop.part == null || r.part === pop.part));
    if (!rs.length) { out.populations[pop.name] = { view: pop.view, available: false, reason: 'no record of the view' }; continue; }
    const have = new Set(rs.map(r => r.id)), absent = [...pop.requests.keys()].filter(id => !have.has(id));
    if (absent.length) { out.populations[pop.name] = { view: pop.view, available: false, reason: `${absent.length} messages of the population have no record (${absent.slice(0, 3).join(', ')}...)` }; continue; }
    const { tallies, ...stats } = truthfulPopulation(rs, spec, threshold, pop);
    out.populations[pop.name] = { view: pop.view, part: pop.part ?? null, ...stats, use: rs.every(r => r.part === 'calibration') ? 'fit' : 'evaluation' };
    sidecar[`${pop.view}/${pop.part ?? 'all'}#${pop.name}`] = truthfulSidecar(rs, tallies);
  }
  out.notes.push('truthful_v1: resize direction and explicit numeric scale (abs tol 1e-6), text-key presence and exact value (empty included), structural and dependency eligibility. Every share is over ALL frozen gold requested actions of the population, structural holds and unread requests included.');
  return { out, sidecar };
}

// ---------------------------------------------------------------- the whole arm
export function artifactOf(spec) { return typeof spec.artifacts === 'string' ? spec.artifacts : JSON.stringify(spec.artifacts); }
export function scoreArm(spec, records, { engine = true } = {}) {
  const arm = oneArm(records), threshold = spec ? spec.levels_out_of_fold?.cost?.threshold : null;
  if (spec && (spec.arm?.cal_sets == null || !Number.isFinite(threshold))) throw new Error('The confidence file has no finite cost threshold (or was not made by calibrate_arm.mjs)');
  if (spec && artifactOf(spec) !== arm.artifact) throw new Error('The confidence file was fitted for other model artifacts than the records hold');
  if (!spec && arm.reader !== 'rules') throw new Error(`The reader ${arm.reader} has a confidence: pass its CONFIDENCE.json (not "none")`);
  if (spec && arm.reader === 'rules') throw new Error('The Rules have no confidence: pass "none"');
  const calSets = spec ? spec.arm.cal_sets : [], out = { schema: 'arm-score-v1', reader: arm.reader, artifact: arm.artifact, threshold_cost10: spec ? threshold : null, calibrated_on: calSets, sets: {}, notes: [] };
  const sidecar = {}, groups = [];
  const push = (key, set, part, rs) => groups.push({ key, set, part, rs });
  for (const set of SET_ORDER) for (const part of PARTS[set]) { const rs = records.filter(r => r.set === set && r.part === part); if (rs.length) push(set, set, part, rs); }
  for (const part of ['calibration', 'test']) { const rs = records.filter(r => (r.set === 'fresh2' || r.set === 'short3') && r.part === part); if (rs.length && new Set(rs.map(r => r.set)).size === 2) push('fresh2+short3', 'fresh2+short3', part, rs); }
  for (const { key, set, part, rs } of groups) {
    const { part: p, sidecar: sc } = scorePart(rs, spec, threshold, { engine });
    p.use = part === 'calibration' ? (set === 'fresh2+short3' ? (calSets.includes('fresh2') && calSets.includes('short3') ? 'fit' : 'calibration-part') : calSets.includes(set) ? 'fit' : 'calibration-part') : 'evaluation';
    (out.sets[key] ||= {})[part] = p; sidecar[`${key}/${part}`] = sc;
  }
  if (spec) out.notes.push('Thresholds are the cost-10 level of the confidence file; calibration parts are fit data (use: fit) and never a result.');
  out.notes.push('Sessions here: each reader\'s executed requests, read in the gold context of every step (names from the row, last = what the gold of the previous step touched), are played on the reader\'s own drawing. Shares count only what the session changed beyond its setup; questions: the answers of the gold\'s question steps. The reader reading its own drawing is free_run_set.mjs.');
  out.notes.push('Paraphrase: same_effect_share = largest set of wordings of a group whose drawings on the row\'s setup are the same (parity_lib diffs, loose), over all wordings; changed_nothing_share and same_effect_as_gold_share are beside it because a reader that does nothing is consistent.');
  if (records.some(r => r.error)) out.notes.push(`${records.filter(r => r.error).length} messages failed in the reader; they count as unread.`);
  return { out, sidecar };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const flags = {}, pos = [];
  for (const a of process.argv.slice(2)) { if (a === '--truthful') flags.truthful = true; else if (a.startsWith('--views=')) flags.views = a.slice(8); else if (a.startsWith('--')) throw new Error('Unknown flag ' + a); else pos.push(a); }
  const [conf, outPath, ...recs] = pos;
  if (!conf || !outPath || !recs.length) throw new Error('usage: score_arm.mjs [--truthful] [--views=DIR] CONFIDENCE.json|none OUT.json RECORDS.jsonl...');
  if (flags.views) loadViewDir(flags.views);
  const spec = conf === 'none' ? null : JSON.parse(readFileSync(conf, 'utf8')), { records } = loadRecords(recs);
  const { out, sidecar } = flags.truthful ? scoreArmTruthful(spec, records, { populations: flags.views ? loadPopulations(flags.views) : [] }) : scoreArm(spec, records);
  const side = JSON.stringify(sidecar), sideFile = outPath.replace(/\.json$/, '') + '.per_message.json';
  writeAtomic(sideFile, side);
  out.per_message = { file: sideFile, sha256: createHash('sha256').update(side).digest('hex') };
  out.confidence_file = conf === 'none' ? null : conf; out.record_files = [...new Set(records.map(r => r._file))];
  writeAtomic(outPath, JSON.stringify(out, null, 1) + '\n');
  if (flags.truthful) {
    for (const [key, parts] of Object.entries(out.sets)) for (const [part, p] of Object.entries(parts)) { const u = p.ungated, g = p.gated; console.log(`${key}/${part} [${p.use}] truthful_v1 ${p.messages} msgs ${p.requested} req: ungated right ${u.right} wrong ${u.wrong} extras ${u.extras} structural ${u.structural_holds.total} cost ${u.cost_score}` + (g ? `; gate right ${g.right} wrong ${g.wrong} extras ${g.extras} structural ${g.structural_holds.total} confidence holds ${g.confidence_holds.total} unread ${g.unread} auroc ${p.auroc} cost ${g.cost_score} risk ${g.risk}` : '') + (p.available ? '' : ` UNAVAILABLE for ${p.unavailable_requests} requests`)); }
    process.exit(0);
  }
  for (const [key, parts] of Object.entries(out.sets)) for (const [part, p] of Object.entries(parts)) {
    const v = Object.values(p.views)[0].today, a = v.at_threshold, e = v.all_executed;
    console.log(`${key}/${part} [${p.use}] ${p.messages} msgs ${p.requested} req: all executed right ${e.right} wrong ${e.wrong} extras ${e.extras} cost ${e.cost_score}` + (a ? `; gate right ${a.right} wrong ${a.wrong} asked ${a.asked} unread ${a.unread} extras ${a.extras} auroc ${a.auroc} cost ${a.cost_score}` : ''));
  }
}
