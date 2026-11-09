// outcomes.mjs: outcomes A-D of VSSBERT_SHORT_COMMANDS_PLAN.md section 7, computed from the rows of apply_gates.mjs (nobody judges them by eye).
//   node training/sketch/shortcmd/outcomes.mjs ROWS.json [ROWS.json ...] > outcomes.json
// Reads the outputs of apply_gates.mjs (a file that is not one, e.g. failures_vss_bert.mjs rows, is listed under `ignored_files` and not used). The sets it
// needs are named by the `set` of each file: t1bs (the deciding view V), t1s, short3s (test part), r2bs. A needed set that is missing -> exit 3 (no output).
// A result, triggered or not, is exit 0. Exit 2: usage.
// The bars below are the plan's (section 7 / Q1, with the two corrections of the plan review: C 1.58%, D on short3s test), written here once, before any
// result. They are the plan's measure, not a confidence threshold (those are read from the model files by apply_gates.mjs).
// The deciding view V = t1bs, core forms (create, set, move, delete, connect), rows without seen_text, span_lost or a spelling change. Every deciding view
// leaves out seen_text and span_lost rows ("reported apart, never decide"); t1s keeps the rows the spell checker changed (as the demo reads them).
//   C  VSS-BERT's confidently-wrong share (executed wrong + extras executed, over executed, at `cost`) has its 95% Wilson interval entirely above 1.58% on
//      V, on t1s (all forms) or on short3s test. A reader that executes nothing has no share (null): not triggered, "executes nothing".
//   B  VSS-BERT at `all` is right on fewer than 95% of V's requests, or on fewer than 90% of a core form with at least 30 requests.
//   A  at `all` right on at least 95% of V; and held-but-right (at `cost`) at least 20% of V's requests; and the paired difference (cost score at `all`) minus
//      (cost score at `cost`) has its interval above 0 (V, one unit per message); and on r2bs the point values agree (held right >= 20%, `all` > `cost`).
//   D  on short3s test, (VSS tab or SOP-BERT tab) minus VSS-BERT, cost score at `cost`, paired interval above 0 (one unit per message). Reported only on the
//      other views. Part of it can be the Rules' vote in the tabs' gates: not a finding about confidence quality alone.
// Paired intervals: compare_arms.mjs pairedInterval (1,000 resamples, seed 20261105); none (and not triggered) for fewer than MIN_UNITS units.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { summarize, norm1 } from "./apply_gates.mjs";
import { pairedInterval, MIN_UNITS, SEED, RESAMPLES } from "../../neural/parity/compare_arms.mjs";

export const BARS = { C_cw_share: 0.0158, B_right_share: 0.95, B_form_right_share: 0.90, B_form_min_requests: 30, A_right_share: 0.95, A_held_right_share: 0.20 };
export const CORE_FORMS = ["create", "set", "move", "delete", "connect"];
const GOLD = ["done_right", "executed_wrong", "held_right", "held_wrong", "missed"];
const fail = (msg, code = 3) => { const e = new Error(msg); e.exitCode = code; return e; };

/** the deciding rows of a set: seen_text / span_lost / (V) spelling change left out; pick(row) adds the view's own conditions */
const clean = (rows, extra = () => true) => rows.filter((r) => r.seen_text !== true && r.span_lost !== true && extra(r));

const sel = (rows, reader, level) => rows.filter((r) => r.reader === reader && r.level === level);
const view = (rows) => Object.fromEntries(["VSS-BERT", "VSS", "SOP-BERT", "Rules"].map((rd) => [rd, Object.fromEntries(["all", "cost"].map((lv) => [lv, summarize(sel(rows, rd, lv))]))]));

/** per-message aggregates of one reader at one level over unit groups -> {units, G, right, bad} (arrays by message index, units = lists of message indexes) */
function perMessage(rows, reader, level, order, unitOf) {
  const idx = new Map(order.map((id, i) => [id, i])), G = order.map(() => 0), right = order.map(() => 0), bad = order.map(() => 0);
  for (const r of sel(rows, reader, level)) {
    const i = idx.get(r.id); if (i === undefined) continue;
    if (GOLD.includes(r.kind)) G[i]++;
    if (r.kind === "done_right") right[i]++;
    if (r.kind === "executed_wrong" || r.kind === "extra_executed") bad[i]++;
  }
  const groups = new Map();
  order.forEach((id, i) => { const k = unitOf(id); (groups.get(k) || groups.set(k, []).get(k)).push(i); });
  return { units: [...groups.values()], G, right, bad };
}
/** the paired interval of cost(A) - cost(B) over the messages of `rows`; a = {reader, level}, b = {reader, level} */
export function paired(rows, a, b, unitOf = (id) => id) {
  const order = [...new Set(rows.map((r) => r.id))], A = perMessage(rows, a.reader, a.level, order, unitOf), B = perMessage(rows, b.reader, b.level, order, unitOf);
  const G = A.G, cost = (x) => { const g = G.reduce((s, v) => s + v, 0), r = x.right.reduce((s, v) => s + v, 0), bd = x.bad.reduce((s, v) => s + v, 0); return g ? ((r - 10 * bd) / g) * 100 : null; };
  const ca = cost(A), cb = cost(B), units = A.units.length;
  const ci = units >= MIN_UNITS ? pairedInterval(A.units, G, A, B) : null;
  return { a: ca, b: cb, difference: ca === null || cb === null ? null : ca - cb, ci95: ci, units, ci_above_zero: ci ? ci[0] > 0 : false, ci_note: units < MIN_UNITS ? `fewer than ${MIN_UNITS} units: no interval` : null };
}

/** the deciding rows of each view, from the rows of the sets {t1bs, t1s, short3s, r2bs} (a set that is not given gives no view) */
export function decidingViews(sets) {
  const core = (r) => CORE_FORMS.includes(r.form) && r.spell_changed !== true, v = {};
  if (sets.t1bs) v.V = clean(sets.t1bs, core);
  if (sets.t1s) v.t1s = clean(sets.t1s);
  if (sets.short3s) v.short3s_test = clean(sets.short3s, (r) => r.part === "test");
  if (sets.r2bs) v.r2b = clean(sets.r2bs, core);
  return v;
}

/** the omitted ui.js rules (apply_gates.mjs header) counted on a DECIDING view, per reader at `cost`: requests of messages with two or more produced requests
 *  (the references rule could change them) plus executed destructive requests on a described target in the other messages (rule (b)), as a share of the
 *  view's requested actions; over_2pct: the parity claim is weaker for this view (plan section 4). The Rules have no references rule: only rule (b). */
export const OMITTED_BAR = 0.02;
const EXECUTED = ["done_right", "executed_wrong", "extra_executed"];
const destructiveDescribed = (r) => /^command:(delete|disconnect|forget|clear|ungroup)$/.test(r.pa) && ["target", "from", "to"].some((k) => String((r.got || {})[k] ?? "").includes("mention("));
export function omittedRules(rows) {
  const out = {};
  for (const reader of ["VSS-BERT", "VSS", "SOP-BERT", "Rules"]) {
    const rs = sel(rows, reader, "cost"), requested = rs.filter((r) => GOLD.includes(r.kind)).length, produced = rs.filter((r) => r.prod_index !== null && r.prod_index !== undefined), by = new Map();
    for (const r of produced) (by.get(r.id) || by.set(r.id, []).get(r.id)).push(r);
    let multiMessages = 0, multiRequests = 0, destructive = 0;
    for (const list of by.values()) {
      const multi = reader !== "Rules" && list.length >= 2;
      if (multi) { multiMessages++; multiRequests += list.length; }
      else destructive += list.filter((r) => EXECUTED.includes(r.kind) && destructiveDescribed(r)).length;
    }
    const share = requested ? (multiRequests + destructive) / requested : null;
    out[reader] = { requested, multi_request_messages: multiMessages, multi_requests: multiRequests, destructive_described_in_single: destructive, omitted_share: share, omitted_over_2pct: share !== null && share > OMITTED_BAR };
  }
  return out;
}

/** the outcomes from the rows of the sets {t1bs, t1s, short3s, r2bs} -> the object written */
export function computeOutcomes(sets, meta = {}) {
  const need = ["t1bs", "t1s", "short3s", "r2bs"], miss = need.filter((n) => !sets[n]);
  if (miss.length) throw fail(`missing input: no rows file for ${miss.join(", ")}`);
  // short3s is judged on its test part only: its rows must come from `apply_gates.mjs --parts sha3` (else every row is part "all" and the view is empty)
  if (meta.short3s && meta.short3s.parts !== undefined && meta.short3s.parts !== "sha3") throw fail(`short3s rows were made with --parts ${meta.short3s.parts}: they must be made with --parts sha3 (the test part decides C and D)`);
  if (!sets.short3s.some((r) => r.part === "test")) throw fail("short3s has no row of part \"test\": run apply_gates.mjs on it with --parts sha3");
  const dv = decidingViews(sets), empty = Object.entries(dv).filter(([, rows]) => !rows.length).map(([k]) => k);
  if (empty.length) throw fail(`empty deciding view: ${empty.join(", ")} (an empty view would make C and D silently not triggered)`);
  const { V, t1s: T1S, short3s_test: S3, r2b: R2 } = dv;
  const views = { V: view(V), t1s: view(T1S), short3s_test: view(S3), r2b: view(R2) };
  const cw = (name, rows) => { const s = summarize(sel(rows, "VSS-BERT", "cost")); return { view: name, executed: s.executed, cw_share: s.cw_share, cw_wilson95: s.cw_wilson95, lower_above_bar: s.cw_wilson95 ? s.cw_wilson95[0] > BARS.C_cw_share : false, note: s.executed ? null : "executes nothing: no share, never a trigger" }; };
  const C = [cw("V", V), cw("t1s", T1S), cw("short3s_test", S3)];
  // B
  const vAll = summarize(sel(V, "VSS-BERT", "all")), forms = {};
  for (const f of CORE_FORMS) { const s = summarize(sel(V.filter((r) => r.form === f), "VSS-BERT", "all")); forms[f] = { requested: s.requested, right_share: s.right_share, below_bar: s.requested >= BARS.B_form_min_requests && s.right_share !== null && s.right_share < BARS.B_form_right_share }; }
  const bOverall = vAll.right_share !== null && vAll.right_share < BARS.B_right_share, bForm = Object.values(forms).some((x) => x.below_bar);
  // A
  const vCost = summarize(sel(V, "VSS-BERT", "cost")), heldRight = vCost.requested ? vCost.held_right / vCost.requested : null;
  const pA = paired(V, { reader: "VSS-BERT", level: "all" }, { reader: "VSS-BERT", level: "cost" });
  const r2c = summarize(sel(R2, "VSS-BERT", "cost")), r2a = summarize(sel(R2, "VSS-BERT", "all")), r2Held = r2c.requested ? r2c.held_right / r2c.requested : null;
  const a1 = vAll.right_share !== null && vAll.right_share >= BARS.A_right_share, a2 = heldRight !== null && heldRight >= BARS.A_held_right_share, a3 = pA.ci_above_zero;
  const a4 = r2Held !== null && r2Held >= BARS.A_held_right_share && r2a.cost_score !== null && r2c.cost_score !== null && r2a.cost_score > r2c.cost_score;
  // D: the unit of short3s is the message
  const dV = paired(S3, { reader: "VSS", level: "cost" }, { reader: "VSS-BERT", level: "cost" }), dS = paired(S3, { reader: "SOP-BERT", level: "cost" }, { reader: "VSS-BERT", level: "cost" });
  const dReported = {
    V: { VSS: paired(V, { reader: "VSS", level: "cost" }, { reader: "VSS-BERT", level: "cost" }), "SOP-BERT": paired(V, { reader: "SOP-BERT", level: "cost" }, { reader: "VSS-BERT", level: "cost" }) },
    t1s_by_gold_span: (() => { const span = new Map(); for (const r of T1S) if (r.gold_span) span.set(r.id, norm1(r.gold_span)); const u = (id) => span.get(id) ?? id;
      return { VSS: paired(T1S, { reader: "VSS", level: "cost" }, { reader: "VSS-BERT", level: "cost" }, u), "SOP-BERT": paired(T1S, { reader: "SOP-BERT", level: "cost" }, { reader: "VSS-BERT", level: "cost" }, u) }; })() };
  const outcomes = {
    C: { triggered: C.some((x) => x.lower_above_bar), bar: BARS.C_cw_share, values: C, note: "VSS-BERT's confidently-wrong share, 95% Wilson interval entirely above the bar, on any of the three views" },
    B: { triggered: bOverall || bForm, values: { V_all: { requested: vAll.requested, right: vAll.right, right_share: vAll.right_share, bar: BARS.B_right_share, below: bOverall }, forms, form_bar: BARS.B_form_right_share, form_min_requests: BARS.B_form_min_requests } },
    A: { triggered: a1 && a2 && a3 && a4, values: { right_share_all_V: vAll.right_share, right_share_bar: BARS.A_right_share, condition_right_share: a1, held_right_share_V: heldRight, held_right_bar: BARS.A_held_right_share, condition_held_right: a2,
      cost_score_all_minus_cost_V: pA, condition_interval_above_zero: a3, r2b: { held_right_share: r2Held, cost_score_all: r2a.cost_score, cost_score_cost: r2c.cost_score, condition_points_agree: a4 } } },
    D: { triggered: dV.ci_above_zero || dS.ci_above_zero, values: { short3s_test: { VSS_minus_VSS_BERT: dV, SOP_BERT_minus_VSS_BERT: dS }, reported_only: dReported }, note: "decided on short3s test only; part of the tabs' advantage can be the Rules' vote in their gates (section 2)" }
  };
  const precedence = a2 && a3 && a4 && outcomes.B.triggered ? "A's other conditions hold (held-but-right, paired interval, r2b) and B holds: B comes first; A is reported as 'also holds what it reads right'" : null;
  return { plan: "VSSBERT_SHORT_COMMANDS_PLAN.md section 7", bars: BARS, paired_interval: { resamples: RESAMPLES, seed: SEED, min_units: MIN_UNITS },
    filters: { V: "t1bs; forms create set move delete connect; no seen_text, span_lost or spelling change", t1s: "no seen_text or span_lost (spelling-changed rows kept)", short3s_test: "part test; no seen_text or span_lost", r2b: "as V, for A's replication" },
    sizes: { V: new Set(V.map((r) => r.id)).size, t1s: new Set(T1S.map((r) => r.id)).size, short3s_test: new Set(S3.map((r) => r.id)).size, r2b: new Set(R2.map((r) => r.id)).size },
    outcomes, precedence, omitted_rules: Object.fromEntries(Object.entries({ V, t1s: T1S, short3s_test: S3, r2b: R2 }).map(([k, rows]) => [k, omittedRules(rows)])), views };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error("usage: outcomes.mjs ROWS.json [ROWS.json ...] > outcomes.json"); process.exit(2); }
  let code = 0;
  try {
    const sets = {}, meta = {}, ignored = [], inputs = {};
    for (const f of files) {
      let text; try { text = readFileSync(f); } catch (e) { throw fail(`${f}: ${e.message}`); }
      let j; try { j = JSON.parse(text); } catch (e) { throw fail(`${f}: not JSON (${e.message})`); }
      if (!j || Array.isArray(j) || typeof j.set !== "string" || !Array.isArray(j.rows) || !j.manifest) { ignored.push(f); continue; }
      if (sets[j.set]) throw fail(`two rows files for the set ${j.set}`);
      sets[j.set] = j.rows; meta[j.set] = { parts: j.parts }; inputs[f] = { set: j.set, sha256: createHash("sha256").update(text).digest("hex") };
    }
    const out = computeOutcomes(sets, meta);
    out.inputs = inputs; out.ignored_files = ignored;
    process.stdout.write(JSON.stringify(out, null, 1) + "\n");
  } catch (e) { console.error(`outcomes: ${e.message}`); code = e.exitCode || 1; }
  process.exit(code);
}
