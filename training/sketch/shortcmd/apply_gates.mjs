// apply_gates.mjs: the four gates of the demo applied to the records of combine/collect_pair.mjs and confidence3/collect_rules3.mjs
// (VSSBERT_SHORT_COMMANDS_PLAN.md sections 2, 4, 5, 6). It calls the same docs/js modules the page imports (combined-confidence.js,
// vote-confidence.js, vss-confidence.js, neural-confidence.js) with the files' own thresholds (CC.threshold, VT.thresholdOf: no threshold is typed here).
//   node training/sketch/shortcmd/apply_gates.mjs --set NAME --rec DIR --data DIR[,DIR...] [--parts all|sha3] [--view rows|start-diagram]
//        [--compare-failures FILE] [--parity-fixture FILE] [--variants] --out FILE
//   --rec     a records folder: sop_own, vss_own, vss_bert, sop_vss, units, rules_own, rules_bert, rules_vss (.jsonl)
//   --data    the data folders the records were collected on (msg_* / batch_* / s_* .jsonl; --data may be repeated)
//   --parts   all (default): every row is part "all"; sha3: part cal / test by sha256(id) % 3 == 0 (calibration), and `summary` covers the test part only
//   --view    rows (default): the engine view of a set row is {all: row.names, no groups, no panels}; start-diagram: the page's opening drawing
//             (docs/js/start-diagram.js run in the Rules engine, ui.js engineView applied to it), for the probes
//   --compare-failures FILE   the output of combine/failures_vss_bert.mjs (DEP=names) on the same records: VSS-BERT at `cost` must have the same kind
//             for every gold request and every extra (exit 3 naming the id otherwise)
//   --parity-fixture FILE     confidence3/vote3_parity.json: the column confidences of this script's own column wrapper against the file's `expect`
//             (canon agreement, the file's own: max difference must be < 1e-9, else exit 3; engine agreement reported beside it)
//   --variants   add the numbers without the name rule and with the file's canon agreement (the published numbers of 5.2(c) were made so)
// Readers (each at the levels `all` = execute every request it read, and `cost` = the gate at its default level):
//   VSS-BERT: CC.combine(combined.json, {text, cut: "bert", sop: sop_own, vss: vss_bert}) as failures_vss_bert.mjs (demoF: VSS's own confidence on the
//             VSS cutter's edge signals), then the name rule;
//   VSS:      VT.columnVss(vote3.json, {vss_own, sop_vss, rules_vss}, level, {agreement: "engine"}) as ui.js GATES.vss; the wires of one request (same unit
//             span) execute together, only when every one of them clears its threshold (ui.js columnGate), then the name rule;
//   SOP-BERT: VT.columnSop(vote3.json, {sop_own, vss_bert, rules_bert}, level, {agreement: "engine"}) as ui.js GATES.neural: a request without signals
//             or without the cut head's output is held (ui.js:608), then the name rule;
//   Rules:    rules_own, every request executed.
// Name rule: a copy of failures_vss_bert.mjs holdNamed (the original is ui.js holdNamed): it reads canonical values and lacks ui.js's hold of a request that
// refers to a held request. Not reproduced (counted, `omitted`): ui.js's references rule, and the destructive policy's rule (b) (logic.js holdDestructive:
// a delete / disconnect / forget / clear / ungroup whose target is a description). Rule (a) changes nothing at `cost` (the same threshold).
// Output JSON (no time or machine data: the same inputs give the same bytes): manifest (sha256 of every input and of the code, git HEAD), rows, summary,
// summary_by, omitted, and, when asked, compare_failures, parity_fixture, variants. Exit 0 ok, 2 usage, 3 a refused input (a duplicate id, record files
// out of order, a record without a data row or the reverse, a gold span not in its text unless span_lost, a gold wire without type or args, a malformed
// JSON line, --compare-failures or --parity-fixture differences).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const REPO = new URL("../../../", import.meta.url).pathname;
const SELF = new URL(import.meta.url).pathname;
const CC = await import(REPO + "docs/js/combined-confidence.js");
const VT = await import(REPO + "docs/js/vote-confidence.js");
const VC = await import(REPO + "docs/js/vss-confidence.js");
const NC = await import(REPO + "docs/js/neural-confidence.js");
const { canonWant } = await import(REPO + "docs/js/bench-canon.js");
const { pairValue } = await import("../layer_common.mjs");

const readJ = (f) => JSON.parse(readFileSync(f, "utf8"));
export const FILES = { combined: "docs/model/confidence/combined.json", vote3: "docs/model/confidence/vote3.json", vss: "docs/model/confidence/vss.json", sop: "docs/model/confidence/sop-bert.json" };
export const MODELS = { COMB: readJ(REPO + FILES.combined), VOTE: readJ(REPO + FILES.vote3), VSSJ: readJ(REPO + FILES.vss), SOPJ: readJ(REPO + FILES.sop) };
export const READERS = ["VSS-BERT", "VSS", "SOP-BERT", "Rules"], LEVELS = ["all", "cost"];
export const COST_WEIGHT = 10;   // the cost score of AGENTS.md: one confident mistake costs as much as 10 right answers
const GOLD_KINDS = ["done_right", "executed_wrong", "held_right", "held_wrong", "missed"], EXTRA_KINDS = ["extra_executed", "extra_held"];
const fail = (msg, code = 3) => { const e = new Error(msg); e.exitCode = code; return e; };

// ---------------------------------------------------------------- small statistics
/** the 95% Wilson interval of k out of n; null for n = 0 */
export function wilson(k, n) {
  if (!n) return null;
  const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
/** (right - 10 x (executed wrong + extras executed)) per 100 requested; null when nothing was requested */
export const costScore = (right, bad, requested) => (requested ? ((right - COST_WEIGHT * bad) / requested) * 100 : null);
/** area under the ROC curve (ties count half); null when a class is empty */
export function auroc(pos, neg) {
  if (!pos.length || !neg.length) return null;
  const all = pos.map((x) => [x, 1]).concat(neg.map((x) => [x, 0])).sort((a, b) => a[0] - b[0]);
  let rank = 0, sumPos = 0;
  for (let i = 0; i < all.length;) {
    let j = i; while (j < all.length && all[j][0] === all[i][0]) j++;
    const avg = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) if (all[k][1]) sumPos += avg;
    rank += j - i; i = j;
  }
  return (sumPos - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length);
}
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);

/** the counts of one group of rows of one reader at one level */
export function summarize(rows) {
  const n = (k) => rows.filter((r) => r.kind === k).length;
  const requested = rows.filter((r) => GOLD_KINDS.includes(r.kind)).length;
  const right = n("done_right"), wrong = n("executed_wrong"), extras = n("extra_executed"), executed = right + wrong + extras;
  const pos = [], neg = [];
  for (const r of rows) { if (num(r.conf) === null || r.kind === "missed") continue; (r.kind === "done_right" || r.kind === "held_right" ? pos : neg).push(r.conf); }
  return { requested, right, wrong, held_right: n("held_right"), held_wrong: n("held_wrong"), missed: n("missed"), extras_executed: extras, extras_held: n("extra_held"), executed,
    cw_share: executed ? (wrong + extras) / executed : null, cw_wilson95: wilson(wrong + extras, executed), right_share: requested ? right / requested : null,
    cost_score: costScore(right, wrong + extras, requested), auroc: auroc(pos, neg) };
}
const keyOf = (v) => (v === null || v === undefined ? "null" : String(v));
function summaryOf(rows) {
  const out = {};
  for (const reader of READERS) { out[reader] = {}; for (const level of LEVELS) out[reader][level] = summarize(rows.filter((r) => r.reader === reader && r.level === level)); }
  return out;
}
function summaryBy(rows) {
  const out = {};
  for (const dim of ["form", "narration", "seen_text", "seen_trigger"]) {
    out[dim] = {};
    for (const v of [...new Set(rows.map((r) => keyOf(r[dim])))].sort()) out[dim][v] = summaryOf(rows.filter((r) => keyOf(r[dim]) === v));
  }
  return out;
}

// ---------------------------------------------------------------- input
const isCal = (id) => BigInt("0x" + createHash("sha256").update(id).digest("hex")) % 3n === 0n;
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
function readJsonl(file) {
  const rows = [];
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    try { rows.push(JSON.parse(line)); } catch (e) { throw fail(`${file}:${i + 1}: not JSON (${e.message})`); }
  });
  return rows;
}
const dataFiles = (d) => readdirSync(d).filter((f) => f.endsWith(".jsonl") && /^(msg|batch|s)[_.]/.test(f)).sort().map((f) => path.join(d, f));
export const RECORD_FILES = ["sop_own", "vss_own", "vss_bert", "sop_vss", "units", "rules_own", "rules_bert", "rules_vss"];

/** the data rows of the folders in order; a duplicate id is refused */
export function loadData(dirs) {
  const rows = [], seen = new Map(), files = [];
  for (const d of dirs) {
    const fs = dataFiles(d);
    if (!fs.length) throw fail(`${d}: no msg_* / batch_* / s_* .jsonl file`);
    for (const f of fs) {
      files.push(f);
      for (const r of readJsonl(f)) {
        if (!Array.isArray(r.wires)) continue;
        if (seen.has(r.id)) throw fail(`duplicate id ${r.id} (${seen.get(r.id)} and ${f})`);
        seen.set(r.id, f); rows.push(r);
      }
    }
  }
  return { rows, files };
}
/** the records of a folder, checked to hold the same ids in the same order in every file -> {recs: {file: [rec]}, ids} */
export function loadRecords(recDir) {
  const recs = {}, files = [];
  for (const k of RECORD_FILES) { const f = path.join(recDir, `${k}.jsonl`); files.push(f); try { recs[k] = readJsonl(f); } catch (e) { if (e.exitCode) throw e; throw fail(`${f}: ${e.message}`); } }
  const ids = recs.sop_own.map((r) => r.id);
  for (const k of RECORD_FILES) {
    const got = recs[k].map((r) => r.id);
    if (got.length !== ids.length || got.some((x, i) => x !== ids[i])) { const i = got.findIndex((x, j) => x !== ids[j]); throw fail(`record files out of order: ${k}.jsonl differs from sop_own.jsonl at line ${i + 1} (${got[i]} against ${ids[i]})`); }
  }
  if (new Set(ids).size !== ids.length) throw fail("a record id occurs twice in " + recDir);
  return { recs, ids, files };
}

// ---------------------------------------------------------------- the demo's drawing views (ui.js engineView)
/** ui.js engineView for a set row: the names of the row are every shape; no groups, no panels */
export const rowView = (row) => ({ all: (row.names || []).slice(), groups: new Map(), panels: new Set() });
/** the page's opening drawing run in the Rules engine, then ui.js engineView on its state (the probes' view) */
export function startDiagramView() {
  const K = require(REPO + "docs/js/logic.js"), SD = require(REPO + "docs/js/start-diagram.js");
  const S = K.createSystem(), r = S.engine.run(K.parse(SD.SOP));
  if (!r.ok) throw fail("the start drawing did not run: " + ((r.errors[0] || { error: {} }).error.message));
  const st = S.world.state, f = st.frame || { x: 0, y: 0 }, lc = (n) => String(n).toLowerCase(), isPanel = (s) => s.layer === "background" || s.layer === "zone";
  return { all: st.shapes.filter((s) => !isPanel(s) && ((c) => c.x === f.x && c.y === f.y)(K.cellOf(s.x, s.y))).map((s) => s.name),
    groups: new Map((st.groups || []).map((g) => [lc(g.name), g.members.map(lc)])), panels: new Set(st.shapes.filter(isPanel).map((s) => lc(s.name))) };
}

// ---------------------------------------------------------------- gold and pairing
const alnum = /[A-Za-z0-9]/;
const ov = (text, a0, a1, b0, b1) => { let k = 0; for (let i = Math.max(a0, b0); i < Math.min(a1, b1); i++) if (alnum.test(text[i])) k++; return k; };
const actOf = (type, a) => `${type}:${a.action || a.ask || ""}`;
/** the gold of a row (failures_vss_bert.mjs goldOf, combined_report.mjs: the n-th occurrence of a span for the n-th wire) */
export function goldOf(row) {
  const used = new Set();
  return row.wires.map((w) => {
    let s0 = -1;
    if (w.span) { let from = 0; for (;;) { const k = row.text.indexOf(w.span, from); if (k < 0) break; if (!used.has(k)) { s0 = k; break; } from = k + 1; } if (s0 < 0) s0 = row.text.indexOf(w.span); used.add(s0); }
    return { s: s0, e: s0 < 0 ? -1 : s0 + w.span.length, act: actOf(w.type, w.args), want: canonWant(w.type, w.args), args: w.args, span: w.span, trigger: w.trigger };
  });
}

// ---------------------------------------------------------------- the name rule (failures_vss_bert.mjs holdNamed, over requests that can hold several wires)
const NAME_ROLES = ["target", "from", "to", "anchor"];
const namesOf = (v) => (v == null || v === "∅" || /^mention\(|\$/.test(String(v)) ? [] : String(v).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean));
/** units: [{execute, wires: [{got}]}] (a request and the wires it made; got = canonical values); drawing: the names on the canvas. While a request that
 *  creates is held, an executed request that names (target, from, to, anchor) a shape that is not in the drawing and that no executed create of the message
 *  makes (nor its own create) is held too; repeated until nothing changes. Changes unit.execute. -> the Set of unit indexes it held */
export function holdNamed(units, drawing) {
  const have = new Set((drawing || []).map((x) => String(x).toLowerCase())), held = new Set(), isCreate = (w) => w.got.action === "create";
  for (let changed = true; changed;) {
    changed = false;
    const creates = units.map((u, i) => i).filter((i) => units[i].wires.some(isCreate));
    if (!creates.some((i) => !units[i].execute)) break;
    const made = new Set(creates.filter((i) => units[i].execute).flatMap((i) => units[i].wires.filter(isCreate).flatMap((w) => namesOf(w.got.name))));
    units.forEach((u, i) => {
      if (!u.execute) return;
      const own = u.wires.filter(isCreate).flatMap((w) => namesOf(w.got.name));
      if (!u.wires.some((w) => NAME_ROLES.some((k) => namesOf(w.got[k]).some((n) => !have.has(n) && !made.has(n) && !own.includes(n))))) return;
      u.execute = false; held.add(i); changed = true;
    });
  }
  return held;
}

// ---------------------------------------------------------------- the gates (one message)
const demoF = (f) => (f.cut_start_vss !== undefined ? { ...f, cut_start: f.cut_start_vss, cut_end: f.cut_end_vss } : f);
const STUB_DETAIL = { low: {}, stray: [], unkW: [], splitW: [], ctx: [], src: "", noCut: false };   // the head details the records do not carry: only .group of a reason is kept
const unitKey = (x) => `${x.span[0]},${x.span[1]}`;
const firstGroup = (fn) => { try { const r = fn(); return r && r[0] ? r[0].group : null; } catch (e) { return "error: " + e.message; } };
// the typical percentile of a 'sop' feature of combined.json and the pulls (failures_vss_bert.mjs sopPulls, copied)
const typ = (tab) => { if (!tab.binary) return 0.5; const ones = tab.values.reduce((a, y, i) => a + ((tab.sign > 0 ? y > 0 : y > -0.5) ? (i + 1 < tab.values.length ? tab.below[i + 1] : tab.n) - tab.below[i] : 0), 0); return tab.n ? ones / tab.n : 0.5; };
function sopPulls(f, model = MODELS.COMB) {
  const C = model.cuts.bert;
  return C.sop.features.map((s) => { const p = CC.percentile(C.sop.tables[s.name], f[s.name]); return { name: s.name, p: +p.toFixed(3), pull: +(s.weight * (typ(C.sop.tables[s.name]) - p)).toFixed(3) }; })
    .filter((x) => x.pull > 0.05).sort((a, b) => b.pull - a.pull).slice(0, 2);
}

/** the votes' column wrapper: the inputs of VT.columnVss / VT.columnSop as ui.js votesOf / voteMsg make them. kind: "vss" | "sop"; m: {text, names, own,
 *  sop|vss (the other learned reader), rules, rulesMsg}; engine: engineTargets of each list and the page's agreement ("engine"), else the file's canon agreement.
 *  -> the items of the column (conf, threshold, execute, partners) */
export function voteColumn(kind, m, level, engine, view, model = MODELS.VOTE) {
  const f = engine ? (l) => (l || []).map((x) => VT.engineTargets(x, view)) : (l) => l || [];
  const opts = { agreement: engine ? "engine" : "canon" };
  if (kind === "vss") return VT.columnVss(model, { text: m.text, names: engine ? view.all : m.names, vss: f(m.own), sop: f(m.other), rules: f(m.rules), rulesMsg: m.rulesMsg }, level, opts);
  return VT.columnSop(model, { text: m.text, names: engine ? view.all : m.names, sop: f(m.own), vss: f(m.other), rules: f(m.rules), rulesMsg: m.rulesMsg }, level, opts);
}

/** every reader's requests on one message, at both levels -> {reader: {level: [wire request]}} where a wire request is
 *  {pa, got, span, conf, threshold, execute, held_by_name, situation, reasons_group, own_group, top_pulls, unit} (conf / threshold null when not defined) */
export function readMessage(row, R, view, variant = { nameRule: true, engine: true }) {
  const text = row.text, drawing = row.names || [], out = {};
  const { COMB, VOTE, VSSJ, SOPJ } = MODELS;
  // ---- VSS-BERT
  const S = R.sop_own.sop.map((x) => ({ f: x.f, act: x.act, pa: x.pa, got: x.got, span: x.span, args0: x.args0 }));
  const V = R.vss_bert.vss.map((x) => ({ f: demoF(x.f), world: x.w, pa: x.a, got: x.got, span: x.span, args0: x.args0, conf: VC.confidence(VSSJ, demoF(x.f), x.w), bert_edges: { cut_start: x.f.cut_start, cut_end: x.f.cut_end } }));
  const msg = { text, cut: "bert", sop: S, vss: V }, T = CC.threshold(COMB, "bert", "cost"), vssCost = VC.threshold(VSSJ, "cost"), sopCost = NC.threshold(SOPJ, "cost");
  out["VSS-BERT"] = {};
  for (const level of LEVELS) {
    const res = CC.combine(COMB, msg, level), prods = res.items.map((it) => (it.from === "sop" ? S[it.j] : V[it.j]));
    const units = res.items.map((it, i) => ({ execute: it.execute, wires: [{ got: prods[i].got }] }));
    const byName = level === "cost" && variant.nameRule ? holdNamed(units, drawing) : new Set();
    out["VSS-BERT"][level] = res.items.map((it, i) => {
      const p = prods[i], belowT = !(it.conf >= res.threshold);
      let reasons_group = null, own_group = null;
      if (level === "cost" && !units[i].execute) {
        reasons_group = byName.has(i) ? "depends" : firstGroup(() => CC.reasons(msg, it, { sop: "SOP-BERT", vss: "VSS" }));
        if (belowT && it.from === "sop") { const c = NC.confidence(SOPJ, p.f, p.act); if (c < sopCost) own_group = firstGroup(() => NC.reasons(SOPJ, { f: p.f, act: p.act, detail: STUB_DETAIL })); }
        if (belowT && it.from === "vss" && p.conf < vssCost) own_group = firstGroup(() => VC.reasons(VSSJ, { signals: p.f, world: p.world }));
      }
      return { pa: p.pa, got: p.got, span: p.span, conf: num(it.conf), threshold: num(res.threshold), execute: units[i].execute, held_by_name: byName.has(i),
        situation: it.from === "vss" ? "vss_only" : it.partner < 0 ? "sop_only" : it.agree ? "agree" : "disagree", reasons_group, own_group,
        top_pulls: it.from === "sop" ? sopPulls(Object.assign({}, p.f, { agree: it.agree, agree_share: it.agree_share, other_conf: it.other_conf })) : null, unit: i };
    });
  }
  // ---- the two tabs (ui.js GATES.vss / GATES.neural)
  const shape = (l) => l.map((x) => ({ f: x.f, act: x.act, world: x.w, pa: x.a || x.pa, got: x.got, span: x.span, args0: x.args0, notes: x.notes }));
  const rulesOf = (rec) => rec.rules.map((x) => ({ pa: x.pa, got: x.got, span: x.span, args0: x.args0, notes: x.notes }));
  const tab = (name, kind, own, other, rules, rulesRec) => {
    out[name] = {};
    for (const level of LEVELS) {
      const items = voteColumn(kind, { text, names: drawing, own, other, rules, rulesMsg: { msgNotes: rulesRec.msgNotes, unread: rulesRec.unread } }, level, variant.engine, view);
      // a request = the wires of one unit (the same span); it executes only when every wire clears its threshold (ui.js columnGate)
      const keys = [...new Set(own.map(unitKey))], groups = keys.map((k) => own.map((x, j) => j).filter((j) => unitKey(own[j]) === k)), unitOfWire = new Map();
      groups.forEach((g, ui) => g.forEach((j) => unitOfWire.set(j, ui)));
      const noSignals = (j) => level !== "all" && kind === "sop" && (!own[j].f || !Object.keys(own[j].f).length || own[j].f.cut_end == null);
      const units = groups.map((g) => ({ execute: g.every((j) => !noSignals(j) && items[j].execute), wires: g.map((j) => ({ got: own[j].got })) }));
      const byName = level === "cost" && variant.nameRule ? holdNamed(units, drawing) : new Set();
      out[name][level] = own.map((x, j) => {
        const it = items[j], ui = unitOfWire.get(j), g = groups[ui], u = units[ui];
        const conf = Math.min(...g.map((k) => (noSignals(k) ? NaN : items[k].conf))), threshold = Math.max(...g.map((k) => items[k].threshold));
        let own_group = null;
        if (level === "cost" && !u.execute && !noSignals(j)) {
          const t = VT.thresholdOf(VOTE.columns[kind].levels, "cost", it.pa);
          if (it.conf < t) own_group = kind === "vss" ? firstGroup(() => VC.reasons(VT.ownSpec(VOTE.columns.vss.model), { signals: x.f, world: x.world })) : firstGroup(() => NC.reasons(VT.ownSpec(VOTE.columns.sop.model), { f: x.f, act: x.act, detail: STUB_DETAIL }));
        }
        const agreeing = kind === "vss" ? [it.agree_sop && "sop", it.agree_rules && "rules"] : [it.agree_vss && "vss", it.agree_rules && "rules"];
        return { pa: x.pa, got: x.got, span: x.span, conf: num(conf), threshold: num(threshold), execute: u.execute, held_by_name: byName.has(ui),
          situation: agreeing.filter(Boolean).join("+") || "none", reasons_group: level === "cost" && !u.execute ? (byName.has(ui) ? "depends" : "threshold") : null, own_group, top_pulls: null, unit: ui };
      });
    }
  };
  const rv = R.rules_vss, rb = R.rules_bert;
  tab("VSS", "vss", shape(R.vss_own.vss), shape(R.sop_vss.sop), rulesOf(rv), rv);
  tab("SOP-BERT", "sop", shape(R.sop_own.sop), shape(R.vss_bert.vss), rulesOf(rb), rb);
  // ---- the Rules: everything they read is executed
  out.Rules = {};
  for (const level of LEVELS) out.Rules[level] = R.rules_own.rules.map((x, i) => ({ pa: x.pa, got: x.got, span: x.span, conf: null, threshold: null, execute: true, held_by_name: false, situation: null, reasons_group: null, own_group: null, top_pulls: null, unit: i }));
  return out;
}

/** a reader's requests paired with the gold (layer_common.mjs pairValue) -> the rows of one reader and level */
export function rowsOf(row, G, reqs, base) {
  const text = row.text;
  const pairs = pairValue({ text, gold: G, units: reqs.map((p) => ({ c0: p.span[0], c1: p.span[1] })), prods: reqs.map((p, i) => ({ act: p.pa, u: i, rawC: p.got })) });
  const goldOfProd = new Map(pairs), prodOfGold = new Map(pairs.map(([i, j]) => [j, i])), out = [];
  const diff = (want, got) => Object.entries(want).filter(([k, v]) => (got[k] ?? "∅") !== v).map(([k, v]) => ({ key: k, got: got[k] ?? "∅", gold: v }));
  G.forEach((g, j) => {
    const i = prodOfGold.get(j), seenTrigger = base.trigger_known === false ? null : base.seen_trigger(g.trigger);
    const common = { ...base.common, seen_trigger: seenTrigger, gold_index: j, act: g.act, gold: g.want, gold_span: g.span };
    if (i === undefined) { out.push({ ...common, kind: "missed", conf: null, threshold: null, situation: null, reasons_group: null, own_group: null, top_pulls: null, prod_index: null, pa: null, got: null, differ: null, held_by_name: false, span: null, unit_text: null }); return; }
    const p = reqs[i], d = diff(g.want, p.got), ok = !d.length, kind = p.execute ? (ok ? "done_right" : "executed_wrong") : ok ? "held_right" : "held_wrong";
    out.push({ ...common, kind, conf: p.conf, threshold: p.threshold, situation: p.situation, reasons_group: p.reasons_group, own_group: p.own_group, top_pulls: p.top_pulls, prod_index: i, pa: p.pa, got: p.got, differ: d, held_by_name: p.held_by_name,
      span: p.span, unit_text: text.slice(p.span[0], p.span[1]).trim() });
  });
  reqs.forEach((p, i) => {
    if (goldOfProd.has(i)) return;
    out.push({ ...base.common, seen_trigger: null, gold_index: null, act: null, gold: null, gold_span: null, kind: p.execute ? "extra_executed" : "extra_held", conf: p.conf, threshold: p.threshold, situation: p.situation,
      reasons_group: p.reasons_group, own_group: p.own_group, top_pulls: p.top_pulls, prod_index: i, pa: p.pa, got: p.got, differ: null, held_by_name: p.held_by_name,
      span: p.span, unit_text: text.slice(p.span[0], p.span[1]).trim() });
  });
  return out;
}

// ---------------------------------------------------------------- the 23 training folders ("seen")
const TRAIN_DIRS = ["llm_train/sonnet_msg", "llm_train/haiku_msg", "llm_train/sonnet_msg2", "llm_train/haiku_msg2", "llm_train/sonnet_long",   // training/neural/make_data.py DIRS
  "llm_bench/fresh1/sonnet", "llm_bench/fresh1/haiku", "llm_train/sonnet_short", "llm_train/haiku_short", "llm_bench/sonnet_spans", "llm_bench/haiku_spans"];   // + SAMPLE_DIRS
/** the same text, as the Python side of the plan counted it: lower case, runs of whitespace collapsed (norm1); and with punctuation removed (gen_rules_cover.py norm) */
export const norm1 = (t) => String(t).toLowerCase().split(/\s+/).filter(Boolean).join(" ");
export const norm2 = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}_\s']/gu, " ").replace(/\s+/g, " ").trim();
/** the messages of the folders arm ALL trained SOP-BERT on: make_data.py DIRS and SAMPLE_DIRS, and registry.json EXTRA_DIRS (read from the file) */
export function trainingIndex(repo = REPO) {
  const extra = readJ(repo + "docs/model/micro/registry.json").EXTRA_DIRS.split(/\s+/).filter(Boolean), dirs = TRAIN_DIRS.concat(extra);
  const t1 = new Set(), t2 = new Set(), trig = new Set(); let messages = 0;
  for (const d of dirs) {
    const base = repo + "training/sketch/" + d, files = readdirSync(base).filter((f) => /^(msg|batch)_.*\.jsonl$/.test(f)).sort();
    if (!files.length) throw fail(`training folder ${d}: no msg_* / batch_* file`);
    for (const f of files) for (const r of readJsonl(path.join(base, f))) {
      if (!Array.isArray(r.wires)) continue;
      messages++; t1.add(norm1(r.text)); t2.add(norm2(r.text));
      for (const w of r.wires) if (w.trigger) trig.add(String(w.trigger).toLowerCase());
    }
  }
  return { folders: dirs.length, messages, seenText: (t) => t1.has(norm1(t)) || t2.has(norm2(t)), seenTrigger: (t) => (t ? trig.has(String(t).toLowerCase()) : null), triggers: trig.size };
}

// ---------------------------------------------------------------- the whole step
const moduleFiles = ["docs/js/combined-confidence.js", "docs/js/vote-confidence.js", "docs/js/vss-confidence.js", "docs/js/neural-confidence.js", "docs/js/bench-canon.js", "docs/js/spell.js", "docs/js/logic.js", "docs/js/start-diagram.js",
  "docs/model/versions.json", ...Object.values(FILES)];
function manifest(inputFiles) {
  let head = null; try { head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch (e) { head = null; }
  const m = { git_head: head, files: {} };
  for (const f of inputFiles) m.files[f] = sha(f);
  for (const f of moduleFiles) m.files[REPO + f] = sha(REPO + f);
  m.files[SELF] = sha(SELF); m.files[path.join(path.dirname(SELF), "../layer_common.mjs")] = sha(path.join(path.dirname(SELF), "../layer_common.mjs"));
  return m;
}

/** the rows of all readers, both levels, for the messages (variant: see readMessage) */
function evaluateRows(data, recs, ids, opts, variant) {
  const by = new Map(data.map((r) => [r.id, r])), idx = new Map(ids.map((id, i) => [id, i])), rows = [], omitted = {}, startView = opts.view === "start-diagram" ? startDiagramView() : null;
  for (const reader of READERS) omitted[reader] = { multi_request_messages: 0, multi_requests: 0, destructive_described: 0, destructive_described_in_single: 0 };
  for (const id of ids) {
    const row = by.get(id), i = idx.get(id), R = {};
    for (const k of RECORD_FILES) R[k] = recs[k][i];
    const G = goldOf(row), view = startView || rowView(row), res = readMessage(row, R, view, variant), part = opts.parts === "sha3" ? (isCal(id) ? "cal" : "test") : "all";
    const trig = (t) => (opts.seen ? opts.seen.seenTrigger(t) : null);
    const base = { trigger_known: row.meta && row.meta.trigger_known === false ? false : true, seen_trigger: trig,
      common: { id, part, text: row.text, typed: row.typed ?? null, form: row.meta && row.meta.form !== undefined ? row.meta.form : null, narration: row.meta && row.meta.narration !== undefined ? row.meta.narration : null,
        seen_text: opts.seen ? opts.seen.seenText(row.typed ?? row.text) || opts.seen.seenText(row.text) : null, spell_changed: !!row.spell_changed, span_lost: !!row.span_lost, n_produced: null } };
    for (const reader of READERS) {
      for (const level of LEVELS) {
        const reqs = res[reader][level];
        rows.push(...rowsOf(row, G, reqs, { ...base, common: { ...base.common, reader, level, n_produced: reqs.length } }));
      }
      if (opts.parts === "sha3" && part === "cal") continue;   // the counts belong to the judged part
      const reqs = res[reader].cost, o = omitted[reader], destr = (p) => /^command:(delete|disconnect|forget|clear|ungroup)$/.test(p.pa) && ["target", "from", "to"].some((k) => String(p.got[k] ?? "").includes("mention("));
      if (reader !== "Rules" && reqs.length >= 2) { o.multi_request_messages++; o.multi_requests += reqs.length; }
      const dd = reqs.filter((p) => p.execute && destr(p)).length;
      o.destructive_described += dd;
      if (reqs.length < 2 || reader === "Rules") o.destructive_described_in_single += dd;   // the Rules have no references rule: a destructive request counts alone
    }
  }
  return { rows, omitted };
}

/** the whole step -> the output object (the caller writes it); throws an Error with exitCode for a refused input */
export function evaluate(opts) {
  const dirs = opts.data, { rows: data, files: dataFilesList } = loadData(dirs), { recs, ids, files: recFiles } = loadRecords(opts.rec);
  const dataIds = new Set(data.map((r) => r.id)), recIds = new Set(ids);
  for (const id of ids) if (!dataIds.has(id)) throw fail(`record ${id} has no data row`);
  for (const r of data) if (!recIds.has(r.id)) throw fail(`data row ${r.id} has no record`);
  for (const r of data) for (const w of r.wires) {
    if (!w.type || !w.args) throw fail(`${r.id}: a gold wire without type or args (a pending wire?)`);
    if (w.span && !r.text.includes(w.span) && !r.span_lost) throw fail(`${r.id}: the gold span "${w.span}" is not in the text`);
  }
  const main = evaluateRows(data, recs, ids, opts, { nameRule: true, engine: true });
  const judged = (rows) => (opts.parts === "sha3" ? rows.filter((r) => r.part === "test") : rows);
  const out = { set: opts.set, view: opts.view || "rows", parts: opts.parts || "all", messages: ids.length, manifest: manifest(recFiles.concat(dataFilesList)),
    seen_index: opts.seen ? { folders: opts.seen.folders, messages: opts.seen.messages } : null,
    thresholds: { "VSS-BERT": CC.threshold(MODELS.COMB, "bert", "cost"), VSS: VT.thresholdOf(MODELS.VOTE.columns.vss.levels, "cost", "command:"), "SOP-BERT": VT.thresholdOf(MODELS.VOTE.columns.sop.levels, "cost", "command:") },
    note: "level all = every request the reader read is executed (a counterfactual); a threshold or confidence that is not defined is null", rows: main.rows,
    summary: summaryOf(judged(main.rows)), summary_by: summaryBy(judged(main.rows)), omitted: main.omitted };
  // the share of a deciding set's requests and the >2% flag are computed by outcomes.mjs on the deciding views (omittedRules), not here on the whole set
  if (opts.parts === "sha3") out.summary_cal = summaryOf(main.rows.filter((r) => r.part === "cal"));
  if (opts.variants) {
    out.variants = {};
    for (const [name, v] of [["no_name_rule", { nameRule: false, engine: true }], ["canon_agreement", { nameRule: true, engine: false }], ["no_name_rule_canon_agreement", { nameRule: false, engine: false }]])
      out.variants[name] = summaryOf(judged(evaluateRows(data, recs, ids, opts, v).rows));
  }
  if (opts.compareFailures) out.compare_failures = compareFailures(main.rows, readJ(opts.compareFailures));
  if (opts.parityFixture) out.parity_fixture = parityFixture(readJ(opts.parityFixture));
  return out;
}

/** the kinds of VSS-BERT at cost against failures_vss_bert.mjs rows (same records): per message, the gold requests in order, then the extras in order */
export function compareFailures(rows, failures) {
  const mine = new Map(), theirs = new Map();
  for (const r of rows) if (r.reader === "VSS-BERT" && r.level === "cost") { const m = mine.get(r.id) || mine.set(r.id, { gold: [], extra: [] }).get(r.id); (r.gold_index === null ? m.extra : m.gold).push(r.kind); }
  for (const r of failures) { const m = theirs.get(r.id) || theirs.set(r.id, { gold: [], extra: [] }).get(r.id); (r.kind === "extra_executed" || r.kind === "extra_held" ? m.extra : m.gold).push(r.kind); }
  const differences = [];
  for (const id of new Set([...mine.keys(), ...theirs.keys()])) {
    const a = mine.get(id), b = theirs.get(id);
    if (!a || !b || JSON.stringify(a) !== JSON.stringify(b)) differences.push({ id, harness: a || null, failures: b || null });
  }
  let compared = 0; for (const id of mine.keys()) if (theirs.has(id)) compared++;
  return { messages_compared: compared, gold_rows_compared: [...theirs.values()].reduce((s, x) => s + x.gold.length, 0), extra_rows_compared: [...theirs.values()].reduce((s, x) => s + x.extra.length, 0), differences };
}

/** 5.2(b): the column confidences of this script's own wrapper on the 60 messages of vote3_parity.json (the file's inputs and the script's expected confidences) */
export function parityFixture(fx) {
  const res = { messages: fx.messages.length };
  for (const [mode, engine] of [["canon", false], ["engine", true]]) {
    const r = { requests: 0, max_abs_diff: 0, same_requests: 0, decisions_differ_from_file: 0 };
    for (const m of fx.messages) {
      const view = { all: m.names || [], groups: new Map(), panels: new Set() };
      for (const [col, kind] of [["vss", "vss"], ["sop", "sop"]]) {
        const inp = kind === "vss" ? { text: m.text, names: m.names, own: m.vss.vss, other: m.vss.sop, rules: m.vss.rules, rulesMsg: m.vss.rulesMsg } : { text: m.text, names: m.names, own: m.bert.sop, other: m.bert.vss, rules: m.bert.rules, rulesMsg: m.bert.rulesMsg };
        const got = voteColumn(kind, inp, "cost", engine, view), exp = m.expect[col], G = new Map(got.map((x) => [`${x.from}:${x.j}`, x]));
        if (got.length === exp.length && exp.every((e) => G.has(`${e.from}:${e.j}`))) r.same_requests++;
        for (const e of exp) {
          const x = G.get(`${e.from}:${e.j}`); r.requests++;
          if (!x) continue;
          r.max_abs_diff = Math.max(r.max_abs_diff, Math.abs(x.conf - e.conf));
          const t = x.threshold; if ((x.conf >= t) !== (e.conf >= t)) r.decisions_differ_from_file++;
        }
      }
    }
    r.messages_same_requests = `${r.same_requests} of ${fx.messages.length * 2} (message, column) pairs`;
    res[mode] = r;
  }
  res.ok = res.canon.max_abs_diff < 1e-9 && res.canon.same_requests === fx.messages.length * 2 && res.canon.requests >= 60;
  res.note = "the fixture is already in the shape of a message (not the records'): it checks the column wrapper and the module calls, not the shaping of records into messages (the probes do)";
  return res;
}

// ---------------------------------------------------------------- command line
export function parseArgs(argv) {
  const o = { data: [], parts: "all", view: "rows" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw fail(`${a}: a value is missing`, 2); return argv[++i]; };
    if (a === "--set") o.set = next(); else if (a === "--rec") o.rec = next(); else if (a === "--data") o.data.push(...next().split(",").filter(Boolean));
    else if (a === "--parts") o.parts = next(); else if (a === "--view") o.view = next(); else if (a === "--compare-failures") o.compareFailures = next();
    else if (a === "--parity-fixture") o.parityFixture = next(); else if (a === "--variants") o.variants = true; else if (a === "--out") o.out = next();
    else throw fail(`unknown argument ${a}`, 2);
  }
  if (!o.set || !o.rec || !o.data.length || !o.out) throw fail("usage: apply_gates.mjs --set NAME --rec DIR --data DIR[,DIR...] [--parts all|sha3] [--view rows|start-diagram] [--compare-failures FILE] [--parity-fixture FILE] [--variants] --out FILE", 2);
  if (!["all", "sha3"].includes(o.parts)) throw fail("--parts is all or sha3", 2);
  if (!["rows", "start-diagram"].includes(o.view)) throw fail("--view is rows or start-diagram", 2);
  return o;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let code = 0;
  try {
    const o = parseArgs(process.argv.slice(2));
    o.seen = trainingIndex();
    const out = evaluate(o);
    writeFileSync(o.out, JSON.stringify(out) + "\n");
    const bad = [];
    if (out.compare_failures && out.compare_failures.differences.length) bad.push(`--compare-failures: ${out.compare_failures.differences.length} message(s) differ, first ${out.compare_failures.differences[0].id}`);
    if (out.parity_fixture && !out.parity_fixture.ok) bad.push(`--parity-fixture: canon max difference ${out.parity_fixture.canon.max_abs_diff}`);
    if (bad.length) throw fail(bad.join("; "));
    console.error(`apply_gates: ${out.messages} messages, ${out.rows.length} rows -> ${o.out}`);
  } catch (e) { console.error(`apply_gates: ${e.message}`); code = e.exitCode || 1; }
  process.exit(code);
}
