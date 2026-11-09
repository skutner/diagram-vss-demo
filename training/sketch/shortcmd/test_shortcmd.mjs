// test_shortcmd.mjs: tests of spell_view.mjs, bench_rows.mjs, apply_gates.mjs, outcomes.mjs, root_causes.mjs and parity.mjs
// (VSSBERT_SHORT_COMMANDS_PLAN.md section 11). Hand-made records and rows live in a temporary folder (TMPDIR, or the OS default) that is removed at the end;
// nothing here reads the measurement's records (~/.cache/diagram-vss-shortcmd). The real-data checks: the 23 training folders (24,698 messages), vote3_parity.json,
// the start drawing's view, check_rules.mjs on the probes file.
//   node training/sketch/shortcmd/test_shortcmd.mjs        exit code 0 when every check passes
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname), REPO = path.resolve(HERE, "../../..") + "/";
const G = await import("./apply_gates.mjs"), SV = await import("./spell_view.mjs"), BR = await import("./bench_rows.mjs"), OC = await import("./outcomes.mjs"),
  RC = await import("./root_causes.mjs"), PA = await import("./parity.mjs");
const { canonWant } = await import(REPO + "docs/js/bench-canon.js");

let fails = 0, n = 0;
const check = (name, ok, detail = "") => { n++; console.log((ok ? "ok   " : "FAIL ") + name + (ok || !detail ? "" : "\n     " + detail)); if (!ok) fails++; };
const TMP = mkdtempSync(path.join(process.env.TMPDIR || tmpdir(), "test_shortcmd-"));
process.on("exit", () => { try { rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* ignore */ } });
let seq = 0;
const tmp = (name) => { const d = path.join(TMP, `${seq++}-${name}`); mkdirSync(d, { recursive: true }); return d; };
const jl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
const run = (script, args) => spawnSync("node", [path.join(HERE, script), ...args], { encoding: "utf8" });
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

// ---------------------------------------------------------------- hand-made rows and records
const row = (id, text, span, args, extra = {}) => ({ id, domain: "t", names: ["Start", "Process"], text, wires: [{ span, trigger: span.split(" ")[0], type: "command", args }], meta: { form: "create", narration: false }, ...extra });
const actOf = (w) => `${w.type}:${w.args.action || w.args.ask || ""}`;
/** the records of a collector for rows, each reader reading exactly the gold (one request per wire) */
function writeRecords(dir, rows) {
  mkdirSync(dir, { recursive: true });
  const reqs = (r) => r.wires.map((w) => { const k = Math.max(0, r.text.indexOf(w.span)); return { pa: actOf(w), got: canonWant(w.type, w.args), span: [k, k + w.span.length], args0: { action: w.args.action ?? null, name: null, count: null } }; });
  const files = {
    sop_own: (r) => ({ id: r.id, sop: reqs(r).map((q) => ({ ...q, o: "right", c: 0.9, act: q.pa.split(":")[1], g: 0, f: { cut_end: 0.9 } })) }),
    vss_own: (r) => ({ id: r.id, vss: reqs(r).map((q) => ({ ...q, o: "right", w: "shapes", f: {}, a: q.pa, g: 0 })) }),
    vss_bert: (r) => ({ id: r.id, vss: reqs(r).map((q) => ({ ...q, o: "right", w: "shapes", f: { cut_start: 0.9, cut_end: 0.9 }, a: q.pa, g: 0 })) }),
    sop_vss: (r) => ({ id: r.id, sop: reqs(r).map((q) => ({ ...q, o: "right", c: 0.9, act: q.pa.split(":")[1], g: 0, f: { cut_end: 0.9 } })) }),
    units: (r) => ({ id: r.id, bert: [], vss: [] }),
    rules_own: (r) => ({ id: r.id, msgNotes: 0, unread: 0, rules: reqs(r).map((q) => ({ ...q, o: "right", g: 0, notes: 0 })) }),
    rules_bert: (r) => ({ id: r.id, msgNotes: 0, unread: 0, rules: reqs(r).map((q) => ({ ...q, o: "right", g: 0, notes: 0 })) }),
    rules_vss: (r) => ({ id: r.id, msgNotes: 0, unread: 0, rules: reqs(r).map((q) => ({ ...q, o: "right", g: 0, notes: 0 })) })
  };
  for (const [k, f] of Object.entries(files)) writeFileSync(path.join(dir, `${k}.jsonl`), jl(rows.map(f)));
}
const ROWS = [row("x-001", "make Start red", "make Start red", { action: "set", target: "Start", color: "red" }), row("x-002", "ok then add a blue circle", "add a blue circle", { action: "create", shape: "circle", color: "blue" }),
  row("x-003", "delete Process", "delete Process", { action: "delete", target: "Process" })];
const setup = (rows = ROWS) => { const d = tmp("data"), r = tmp("rec"); writeFileSync(path.join(d, "msg_01.jsonl"), jl(rows)); writeRecords(r, rows); return { d, r }; };
const STUB_SEEN = { folders: 0, messages: 0, seenText: () => false, seenTrigger: () => false };
const gates = (o) => G.evaluate({ set: "t", parts: "all", view: "rows", seen: STUB_SEEN, ...o });

// ---------------------------------------------------------------- small statistics
check("the cost score of 10 right and 1 wrong over 20 requested is 0.0", G.costScore(10, 1, 20) === 0);
check("the cost score of nothing requested is null", G.costScore(0, 0, 0) === null);
{ const w = G.wilson(1, 100); check("Wilson of 1/100 is about [0.0018, 0.0545]", near(w[0], 0.0018, 2e-4) && near(w[1], 0.0545, 2e-4), JSON.stringify(w)); }
check("Wilson of 0/0 is null", G.wilson(0, 0) === null);
check("AUROC: a perfect ranking is 1, a tie is 0.5, an empty class is null", G.auroc([0.9, 0.8], [0.1]) === 1 && G.auroc([0.5], [0.5]) === 0.5 && G.auroc([], [0.5]) === null);
{ const s = G.summarize([]); check("a reader that executes nothing: cw_share null, interval null, score null", s.executed === 0 && s.cw_share === null && s.cw_wilson95 === null && s.cost_score === null); }

// ---------------------------------------------------------------- the gates on hand-made inputs
{
  const stub = (kind, intercept, T, weight = 0) => ({ columns: { [kind]: { agreement: "canon", levels: { cost: { command: T, question: T } }, model: { kind, intercept, features: weight ? [{ name: "x", weight }] : [], tables: weight ? { x: { binary: true, sign: 1 } } : {}, prior: {}, prior_default: 0 } } } });
  const sop = (f) => [{ f, act: "set", pa: "command:set", got: { action: "set", target: "start", color: "red" }, span: [0, 14], args0: {} }];
  const m = (own) => ({ text: "make Start red", names: [], own, other: [], rules: [], rulesMsg: { msgNotes: 0, unread: 0 } });
  const z = 0.3, conf = 1 / (1 + Math.exp(-z));
  const at = G.voteColumn("sop", m(sop({})), "cost", false, { all: [] }, stub("sop", z, conf));
  const below = G.voteColumn("sop", m(sop({})), "cost", false, { all: [] }, stub("sop", z, conf + 1e-9));
  check("one SOP-BERT request at exactly the threshold executes (>=)", at.length === 1 && at[0].conf === conf && at[0].execute === true);
  check("one SOP-BERT request 1e-9 below the threshold is held", below[0].execute === false);
  check("level all executes whatever the confidence", G.voteColumn("sop", m(sop({})), "all", false, { all: [] }, stub("sop", -50, conf))[0].execute === true);
}
{   // readMessage with a stub vote file: a VSS request with two wires of one unit, one under its threshold, is held whole; a SOP-BERT request without signals is held
  const r0 = row("g-001", "make Start red and blue", "make Start red and blue", { action: "set", target: "Start", color: "red" });
  const rec = (id, o) => ({ id, ...o });
  const two = [{ w: "shapes", f: { x: 1 }, a: "command:set", got: { action: "set", target: "start", color: "red" }, span: [0, 23], args0: {} }, { w: "shapes", f: { x: 0 }, a: "command:set", got: { action: "set", target: "start", color: "blue" }, span: [0, 23], args0: {} }];
  const sopRec = (f) => ({ sop: [{ f, act: "set", pa: "command:set", got: { action: "set", target: "start", color: "red" }, span: [0, 23], args0: {} }] });
  const R = { sop_own: sopRec({}), vss_own: { vss: two }, vss_bert: { vss: [] }, sop_vss: { sop: [] }, rules_own: { rules: [] }, rules_bert: { rules: [], msgNotes: 0, unread: 0 }, rules_vss: { rules: [], msgNotes: 0, unread: 0 }, units: {} };
  const saved = G.MODELS.VOTE, w = 2, i0 = -0.2, c1 = 1 / (1 + Math.exp(-(i0 + w))), c0 = 1 / (1 + Math.exp(-i0));
  try {
    G.MODELS.VOTE = { columns: { vss: { agreement: "canon", levels: { cost: { command: (c0 + c1) / 2, question: 0.5 } }, model: { kind: "vss", intercept: i0, features: [{ name: "x", weight: w }], tables: { x: { binary: true, sign: 1 } }, prior: {}, prior_default: 0 } },
      sop: { agreement: "canon", levels: { cost: { command: 0.5, question: 0.5 } }, model: { kind: "sop", intercept: 5, features: [], tables: {}, prior: {}, prior_default: 0 } } } };
    const res = G.readMessage(r0, R, G.rowView(r0), { nameRule: true, engine: true });
    check("a VSS request with two wires, one under its threshold, is held whole", res.VSS.cost.length === 2 && res.VSS.cost.every((q) => q.execute === false) && res.VSS.all.every((q) => q.execute === true), JSON.stringify(res.VSS.cost.map((q) => [q.conf, q.execute])));
    check("the held request carries the lowest confidence of its wires", near(res.VSS.cost[0].conf, c0) && near(res.VSS.cost[1].conf, c0));
    check("a SOP-BERT request with no cut head output (cut_end null) is held at cost, executed at all", res["SOP-BERT"].cost[0].execute === false && res["SOP-BERT"].all[0].execute === true && res["SOP-BERT"].cost[0].conf === null);
    R.sop_own = sopRec({ cut_end: 0.9 });
    check("the same request with signals executes (its confidence is above 0.5 in the stub)", G.readMessage(r0, R, G.rowView(r0), { nameRule: true, engine: true })["SOP-BERT"].cost[0].execute === true);
    R.sop_own = { sop: [{ f: null, act: "set", pa: "command:set", got: { action: "set", target: "start", color: "red" }, span: [0, 23], args0: {} }] };
    check("a SOP-BERT request without signals (f null) is held", G.readMessage(r0, R, G.rowView(r0), { nameRule: true, engine: true })["SOP-BERT"].cost[0].execute === false);
  } finally { G.MODELS.VOTE = saved; }
}
{   // the name rule
  const create = { action: "create", shape: "hexagon", name: "fail" }, connect = { action: "connect", from: "check", to: "fail" };
  const mk = (ex1, ex2, got2 = connect) => [{ execute: ex1, wires: [{ got: create }] }, { execute: ex2, wires: [{ got: got2 }] }];
  let u = mk(false, true), held = G.holdNamed(u, ["Check"]);
  check("the name rule holds an executed connect that names the shape of a held create", u[1].execute === false && held.has(1));
  u = mk(true, true); G.holdNamed(u, ["Check"]); check("... but not when the create executes", u[1].execute === true);
  u = mk(false, true); G.holdNamed(u, ["Check", "Fail"]); check("... nor when the name is in the drawing", u[1].execute === true);
  u = mk(false, true, { action: "connect", from: "check", to: "start" }); G.holdNamed(u, ["Check"]); check("... a shape that is in neither the drawing nor an executed create is held while a create is held (start is not in the drawing here)", u[1].execute === false);
  u = [{ execute: false, wires: [{ got: create }] }, { execute: true, wires: [{ got: { action: "create", shape: "circle", name: "other" } }] }, { execute: true, wires: [{ got: { action: "move", target: "other", position: "left" } }] }];
  G.holdNamed(u, ["Check"]); check("a request that names the shape of an executed create stays executed; the create itself too", u[1].execute === true && u[2].execute === true);
  u = [{ execute: true, wires: [{ got: create }, { got: connect }] }]; check("a unit that creates the shape it names holds nothing (nothing held)", G.holdNamed(u, []).size === 0);
}

// ---------------------------------------------------------------- apply_gates on hand-made records
{
  const { d, r } = setup(), out1 = path.join(TMP, "o1.json"), out2 = path.join(TMP, "o2.json");
  const a = run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", d, "--out", out1]), b = run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", d, "--out", out2]);
  check("apply_gates runs on hand-made records (exit 0)", a.status === 0 && b.status === 0, a.stderr + b.stderr);
  check("apply_gates twice on the same inputs gives byte-identical output", sha(out1) === sha(out2));
  const o = JSON.parse(readFileSync(out1, "utf8"));
  check("one row per gold request, per reader and level (3 x 4 x 2)", o.rows.length === 24 && o.rows.every((x) => ["done_right", "held_right", "executed_wrong", "held_wrong", "missed", "extra_executed", "extra_held"].includes(x.kind)));
  check("the Rules read exactly the gold: done_right at both levels", o.rows.filter((x) => x.reader === "Rules").every((x) => x.kind === "done_right"));
  check("level all executes every request of a learned reader", o.rows.filter((x) => x.level === "all" && x.reader !== "Rules").every((x) => x.kind === "done_right"));
  check("the thresholds come from the files", o.thresholds["VSS-BERT"] === G.MODELS.COMB.cuts.bert.levels.cost.threshold && o.thresholds.VSS === G.MODELS.VOTE.columns.vss.levels.cost.command && o.thresholds["SOP-BERT"] === G.MODELS.VOTE.columns.sop.levels.cost.command);
  check("the manifest names the code and the inputs", Object.keys(o.manifest.files).some((f) => f.endsWith("apply_gates.mjs")) && Object.keys(o.manifest.files).some((f) => f.endsWith("sop_own.jsonl")) && "git_head" in o.manifest);
  check("summary: requested = right + wrong + held + missed on every reader and level", G.READERS.every((rd) => G.LEVELS.every((lv) => { const s = o.summary[rd][lv]; return s.requested === 3 && s.requested === s.right + s.wrong + s.held_right + s.held_wrong + s.missed; })));
  const r1 = JSON.parse(readFileSync(out1, "utf8")).rows.find((x) => x.id === "x-002" && x.reader === "Rules");
  check("a narrated row keeps its gold span and its place in the text", r1.gold_span === "add a blue circle" && r1.text === "ok then add a blue circle");
}
{   // orphans
  const { d, r } = setup(), out = path.join(TMP, "orph.json");
  writeFileSync(path.join(d, "msg_01.jsonl"), jl(ROWS.slice(0, 2)));
  const a = run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", d, "--out", out]);
  check("a record id without a data row: exit 3 naming it", a.status === 3 && /x-003/.test(a.stderr) && /no data row/.test(a.stderr), a.stderr);
  const s2 = setup(ROWS.slice(0, 2)); writeFileSync(path.join(s2.d, "msg_01.jsonl"), jl(ROWS));
  const b = run("apply_gates.mjs", ["--set", "t", "--rec", s2.r, "--data", s2.d, "--out", out]);
  check("a data row without a record: exit 3 naming it", b.status === 3 && /x-003/.test(b.stderr) && /no record/.test(b.stderr), b.stderr);
}
{   // errors
  const { d, r } = setup(), out = path.join(TMP, "err.json");
  const bad = tmp("bad"); writeFileSync(path.join(bad, "msg_01.jsonl"), jl(ROWS.slice(0, 1)) + "{not json}\n");
  const a = run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", bad, "--out", out]);
  check("a malformed JSON line: exit 3 with file and line", a.status === 3 && /msg_01\.jsonl:2/.test(a.stderr), a.stderr);
  const d2 = tmp("dup"); writeFileSync(path.join(d2, "msg_01.jsonl"), jl(ROWS.slice(0, 1)));
  const b = run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", `${d},${d2}`, "--out", out]);
  check("a duplicate id across the data folders: exit 3 naming it", b.status === 3 && /duplicate id x-001/.test(b.stderr), b.stderr);
  const rr = tmp("rec2"); writeRecords(rr, ROWS); writeFileSync(path.join(rr, "vss_bert.jsonl"), jl(ROWS.slice().reverse().map((x) => ({ id: x.id, vss: [] }))));
  const c = run("apply_gates.mjs", ["--set", "t", "--rec", rr, "--data", d, "--out", out]);
  check("record files out of order: exit 3 naming the file", c.status === 3 && /out of order: vss_bert\.jsonl/.test(c.stderr), c.stderr);
  const d3 = tmp("span"); writeFileSync(path.join(d3, "msg_01.jsonl"), jl([{ ...ROWS[0], text: "something else" }]));
  const rs = tmp("rec3"); writeRecords(rs, [ROWS[0]]);
  const e = run("apply_gates.mjs", ["--set", "t", "--rec", rs, "--data", d3, "--out", out]);
  check("a gold span that is not in its text: exit 3", e.status === 3 && /not in the text/.test(e.stderr), e.stderr);
  const d4 = tmp("lost"); writeFileSync(path.join(d4, "msg_01.jsonl"), jl([{ ...ROWS[0], text: "something else", span_lost: true }]));
  const f = run("apply_gates.mjs", ["--set", "t", "--rec", rs, "--data", d4, "--out", out]);
  check("... unless the row is flagged span_lost (it is read, with no gold position)", f.status === 0, f.stderr);
  check("usage error: exit 2", run("apply_gates.mjs", ["--set", "t"]).status === 2);
  const g = tmp("pend"); writeFileSync(path.join(g, "msg_01.jsonl"), jl([{ id: "x-001", names: [], text: "background black", wires: [{ span: "background black", pending: "background" }] }]));
  check("a pending gold wire (no type or args): exit 3", run("apply_gates.mjs", ["--set", "t", "--rec", rs, "--data", g, "--out", out]).status === 3);
}
{   // --compare-failures
  const { d, r } = setup(), out = path.join(TMP, "cf.json"), base = JSON.parse((run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", d, "--out", out]), readFileSync(out, "utf8")));
  const failures = base.rows.filter((x) => x.reader === "VSS-BERT" && x.level === "cost").map((x) => ({ id: x.id, kind: x.kind }));
  const ff = path.join(TMP, "failures_ok.json"); writeFileSync(ff, JSON.stringify(failures));
  const ok = run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", d, "--compare-failures", ff, "--out", out]);
  check("--compare-failures with equal kinds: exit 0, 0 differences", ok.status === 0 && JSON.parse(readFileSync(out, "utf8")).compare_failures.differences.length === 0, ok.stderr);
  const changed = failures.map((x, i) => (i === 1 ? { ...x, kind: x.kind === "done_right" ? "held_right" : "done_right" } : x)), fc = path.join(TMP, "failures_bad.json"); writeFileSync(fc, JSON.stringify(changed));
  const bad = run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", d, "--compare-failures", fc, "--out", out]);
  check("--compare-failures with one changed kind: exit 3 naming the id", bad.status === 3 && bad.stderr.includes(failures[1].id), bad.stderr);
}
{   // parts and the omitted rules
  const { d, r } = setup(), out = path.join(TMP, "p.json");
  run("apply_gates.mjs", ["--set", "t", "--rec", r, "--data", d, "--parts", "sha3", "--out", out]);
  const o = JSON.parse(readFileSync(out, "utf8")), isCal = (id) => BigInt("0x" + createHash("sha256").update(id).digest("hex")) % 3n === 0n;
  check("--parts sha3: cal / test by sha256(id) % 3, and the summary is the test part", o.rows.every((x) => x.part === (isCal(x.id) ? "cal" : "test")) && o.summary.Rules.all.requested === ROWS.filter((x) => !isCal(x.id)).length);
  check("the omitted rules are counted per reader", G.READERS.every((rd) => rd in o.omitted && "multi_request_messages" in o.omitted[rd]));
}
{   // the real parity fixture (5.2b), the start drawing, the 23 folders
  const fx = G.parityFixture(JSON.parse(readFileSync(REPO + "training/sketch/confidence3/vote3_parity.json", "utf8")));
  check("5.2(b): the column wrapper reproduces vote3_parity.json (canon, within 1e-9, 60 messages)", fx.ok && fx.messages === 60 && fx.canon.max_abs_diff < 1e-9 && fx.canon.requests >= 60, JSON.stringify(fx.canon));
  const v = G.startDiagramView();
  check("the start drawing's view: the shapes that are not panels, the two groups, the three panels", ["Start", "Process", "Check", "Done"].every((x) => v.all.includes(x)) && !v.all.includes("Backdrop") && v.groups.has("intake") && v.groups.has("review") && v.panels.has("backdrop") && v.panels.has("intakezone") && v.panels.has("reviewzone"), JSON.stringify([v.all, [...v.groups.keys()], [...v.panels]]));
  const t = G.trainingIndex();
  check("the training index: 23 folders, 24,698 messages (the SOP-BERT README's 24698)", t.folders === 23 && t.messages === 24698, `${t.folders} folders, ${t.messages} messages`);
  const spans = new Map(); for (const f of ["msg_01.jsonl", "msg_02.jsonl"]) for (const l of readFileSync(REPO + "training/sketch/llm_bench/synth_short_t1/" + f, "utf8").split("\n")) if (l.trim()) { const x = JSON.parse(l); spans.set(G.norm1(x.wires[0].span), x.wires[0].span); }
  const seen = [...spans.values()].filter((s) => t.seenText(s)).length;
  check("t1's 1,539 distinct bare spans: 14 are seen texts (9 exact, 14 with punctuation removed; the plan's count)", spans.size === 1539 && seen === 14, `${spans.size} spans, ${seen} seen`);
  check("normalisations: whitespace and case; punctuation (Unicode letters kept)", G.norm1("  Add   A Dot ") === "add a dot" && G.norm2("Add, a Zoë!") === "add a zoë");
}

// ---------------------------------------------------------------- spell_view
{
  const speller = SV.makeSpeller();
  const mk = (id, text, span, names) => row(id, text, span, { action: "set", target: "Start", color: "red" }, { names });
  const rows = [mk("s-001", "alright, make Start red", "alright, make Start red", ["Start"]), mk("s-002", "make Start red", "make Start red", ["Start"]), mk("s-003", "alright make Start red", "make Start red", ["Start"]),
    mk("s-004", "connect Zoë to Start", "connect Zoë to Start", ["Zoë", "Start"]), mk("s-005", "make Start red", "make Start red", []),
    mk("s-006", "ok " + "well so ".repeat(40) + "make Start red", "make Start red", ["Start"])];
  rows[3].wires[0].args = { action: "connect", from: "Zoë", to: "Start" };
  const sp = rows.map((r) => SV.spellRow(r, speller));
  check("spell_view: a row whose gold span the checker changes is kept and gets span_lost", sp[0].spell_changed && sp[0].span_lost && sp[0].text.startsWith("right,") && sp[0].typed.startsWith("alright,"), JSON.stringify([sp[0].text, sp[0].span_lost]));
  check("spell_view: a row whose text is changed outside the span keeps its span (not lost)", sp[2].spell_changed && !sp[2].span_lost && sp[2].text.startsWith("right "));
  check("spell_view: an unchanged row is unchanged and has no fixes", !sp[1].spell_changed && sp[1].text === rows[1].text && sp[1].spell_fixes.length === 0 && !sp[1].span_lost);
  check("spell_view: a name with a non-ASCII letter (Zoë) passes through unchanged", !sp[3].spell_changed && sp[3].text === "connect Zoë to Start" && sp[3].names.includes("Zoë"));
  check("spell_view: an empty names list works", !sp[4].spell_changed);
  check("spell_view: a 300-character narrated text is read (and unchanged)", rows[5].text.length >= 300 && !sp[5].spell_changed);
  const inp = tmp("sv_in"), out1 = tmp("sv_out1"), out2 = tmp("sv_out2"); writeFileSync(path.join(inp, "msg_01.jsonl"), jl(rows));
  const a = run("spell_view.mjs", [inp, out1]), b = run("spell_view.mjs", [inp, out2]);
  check("spell_view CLI: exit 0, spell_changed_ids.txt lists the changed ids, same bytes twice", a.status === 0 && b.status === 0 && readFileSync(path.join(out1, "spell_changed_ids.txt"), "utf8") === "s-001\ns-003\n" && sha(path.join(out1, "msg_01.jsonl")) === sha(path.join(out2, "msg_01.jsonl")) && /"changed":2/.test(a.stdout), a.stdout + a.stderr);
  const badIn = tmp("sv_bad"); writeFileSync(path.join(badIn, "msg_01.jsonl"), jl(rows.slice(0, 1)) + "oops\n");
  const c = run("spell_view.mjs", [badIn, tmp("sv_o")]);
  check("spell_view: a malformed JSON line stops with file and line (exit 1)", c.status === 1 && /msg_01\.jsonl:2/.test(c.stderr), c.stderr);
  check("spell_view: usage error is exit 2", run("spell_view.mjs", [inp]).status === 2);
}

// ---------------------------------------------------------------- bench_rows
{
  const items = [{ cat: "create: plain", text: "Draw a circle", names: ["Start"], type: "command", gold: { action: "create", shape: "circle" } }, { cat: "multi", text: "Draw a dot and delete it", names: [], wires: [{}, {}] },
    { cat: "question", text: "how many shapes are there", names: ["Start"], type: "question", gold: { ask: "count" } }];
  const { rows, skipped } = BR.toRows(items);
  check("bench_rows: one-wire items become rows with an empty trigger, trigger_known false and span = text; a multi-wire item is skipped and counted", rows.length === 2 && skipped.length === 1 && rows[0].wires[0].trigger === "" && rows[0].wires[0].span === "Draw a circle" && rows[0].meta.trigger_known === false && rows[0].id === "broad-0001" && skipped[0] === "broad-0002");
  const ok = BR.rulesOk(rows);
  check("bench_rows: check_rules.mjs keeps the rows the Rules read exactly", ok.has("broad-0001"), JSON.stringify([...ok]));
  const inp = path.join(TMP, "broad.json"), outd = path.join(TMP, "broad_rows"); writeFileSync(inp, JSON.stringify(items));
  const a = run("bench_rows.mjs", [inp, outd]);
  check("bench_rows CLI: exit 0 and a summary line", a.status === 0 && JSON.parse(a.stdout).skipped_not_one_wire === 1, a.stdout + a.stderr);
  writeFileSync(inp, "not json"); check("bench_rows CLI: an unreadable input is exit 3", run("bench_rows.mjs", [inp, outd]).status === 3);
}
{   // the probes file (S1): the Rules read all 10 exactly
  const out = path.join(TMP, "probes_check.jsonl"), r = spawnSyncCheck();
  function spawnSyncCheck() { return spawnSync("node", [REPO + "training/sketch/synth/check_rules.mjs", HERE + "/probes/msg_01.jsonl", out], { encoding: "utf8" }); }
  const v = readFileSync(out, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  check("probes/msg_01.jsonl: 10 probes, check_rules.mjs says ok for all 10", r.status === 0 && v.length === 10 && v.every((x) => x.ok), JSON.stringify(v.filter((x) => !x.ok)));
}

// ---------------------------------------------------------------- outcomes and root causes on hand-made rows
/** rows of a set: spec(i) -> {form, part, seen_text, span_lost, spell_changed, kinds: {reader: {all, cost}}} (one gold request per message) */
function makeSet(name, count, spec) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const s = { form: "create", part: "all", seen_text: false, span_lost: false, spell_changed: false, ...spec(i) };
    for (const reader of G.READERS) for (const level of G.LEVELS) {
      const kind = s.kinds[reader][level];
      rows.push({ id: `${name}-${String(i).padStart(4, "0")}`, part: s.part, text: "add a dot", typed: null, form: s.form, narration: false, seen_text: s.seen_text, seen_trigger: false, spell_changed: s.spell_changed, span_lost: s.span_lost, n_produced: 1, reader, level, kind,
        gold_index: kind.startsWith("extra") ? null : 0, gold_span: "add a dot", gold: { action: "create" }, act: "command:create", conf: reader === "Rules" ? null : 0.9, threshold: null, situation: reader === "VSS-BERT" ? "agree" : "none", reasons_group: kind.startsWith("held") ? "agree" : null,
        own_group: null, top_pulls: null, prod_index: kind === "missed" ? null : 0, pa: "command:create", got: { action: "create" }, differ: kind === "executed_wrong" ? [{ key: "color", got: "red", gold: "blue" }] : kind === "held_wrong" ? [{ key: "color", got: "red", gold: "blue" }] : [], held_by_name: false, span: [0, 9], unit_text: "add a dot" });
    }
  }
  return rows;
}
const same = (k) => Object.fromEntries(G.READERS.map((rd) => [rd, { all: k, cost: k }]));
const file = (set, rows, parts = "all") => ({ set, parts, rows, manifest: {}, summary: Object.fromEntries(G.READERS.map((rd) => [rd, Object.fromEntries(G.LEVELS.map((lv) => [lv, G.summarize((parts === "sha3" ? rows.filter((r) => r.part === "test") : rows).filter((r) => r.reader === rd && r.level === lv))]))])) });
{
  // scenario "gate holds what it reads right" (A): all right at `all`; at `cost` 30% held right
  const A = (i) => ({ kinds: { ...same("done_right"), "VSS-BERT": { all: "done_right", cost: i % 10 < 3 ? "held_right" : "done_right" } } });
  const sets = { t1bs: makeSet("t1b", 100, A), t1s: makeSet("t1s", 100, A), short3s: makeSet("s3", 100, (i) => ({ ...A(i), part: "test" })), r2bs: makeSet("r2b", 100, A) };
  const o = OC.computeOutcomes(sets), o2 = o.omitted_rules;
  check("outcomes A: all four conditions hold -> triggered, with its interval above 0", o.outcomes.A.triggered === true && o.outcomes.A.values.cost_score_all_minus_cost_V.ci95[0] > 0 && near(o.outcomes.A.values.held_right_share_V, 0.3), JSON.stringify(o.outcomes.A.values.cost_score_all_minus_cost_V));
  check("outcomes: in that scenario B and C do not trigger (nothing wrong executed), D does (the tabs execute what the gate of VSS-BERT held)", !o.outcomes.B.triggered && !o.outcomes.C.triggered && o.outcomes.D.triggered);
  // B: 80% right at all
  const Bset = makeSet("t1b", 100, (i) => ({ kinds: { ...same("done_right"), "VSS-BERT": { all: i < 80 ? "done_right" : "held_wrong", cost: i < 80 ? "held_right" : "held_wrong" } } }));
  const ob = OC.computeOutcomes({ ...sets, t1bs: Bset });
  check("outcomes B: right on 80% of V at `all` -> triggered; A (which needs 95%) does not", ob.outcomes.B.triggered === true && ob.outcomes.A.triggered === false);
  // C: 10 wrong of 100 executed
  const Cset = (name) => makeSet(name, 100, (i) => ({ kinds: { ...same("done_right"), "VSS-BERT": { all: "done_right", cost: i < 10 ? "executed_wrong" : "done_right" } } }));
  const oc = OC.computeOutcomes({ ...sets, t1bs: Cset("t1b") });
  check("outcomes C: 10 confidently wrong of 100 executed (interval above 1.58%) -> triggered", oc.outcomes.C.triggered === true && oc.outcomes.C.values[0].cw_wilson95[0] > OC.BARS.C_cw_share);
  const one = makeSet("t1b", 1000, (i) => ({ kinds: { ...same("done_right"), "VSS-BERT": { all: "done_right", cost: i < 1 ? "executed_wrong" : "done_right" } } }));
  check("outcomes C: 1 wrong of 1000 (interval not above the bar) -> not triggered", OC.computeOutcomes({ ...sets, t1bs: one }).outcomes.C.triggered === false);
  // precedence: A's other conditions hold and B holds
  const BA = makeSet("t1b", 100, (i) => ({ kinds: { ...same("done_right"), "VSS-BERT": { all: i < 80 ? "done_right" : "held_wrong", cost: i < 70 ? "held_right" : i < 80 ? "done_right" : "held_wrong" } } }));
  const obA = OC.computeOutcomes({ ...sets, t1bs: BA });
  check("outcomes: B holds and A's other conditions hold -> the precedence line (B first) is set, A itself is not triggered", obA.outcomes.B.triggered && !obA.outcomes.A.triggered && /B comes first/.test(obA.precedence || ""), String(obA.precedence));
  check("outcomes: no precedence line when B does not hold", o.precedence === null);
  // empty deciding views and short3s without --parts sha3 are refused, never a silent "not triggered"
  const seenAll = makeSet("t1b", 100, (i) => ({ seen_text: true, kinds: A(i).kinds }));
  let e1 = null; try { OC.computeOutcomes({ ...sets, t1bs: seenAll }); } catch (e) { e1 = e; }
  check("outcomes: an empty deciding view (V: every row seen_text) is exit 3 naming it", e1 && e1.exitCode === 3 && /empty deciding view: V/.test(e1.message), String(e1));
  const wrong30 = (part) => makeSet("s3", 100, (i) => ({ part, kinds: { ...same("done_right"), "VSS-BERT": { all: "done_right", cost: i < 30 ? "executed_wrong" : "done_right" } } }));
  const okC = OC.computeOutcomes({ ...sets, short3s: wrong30("test") });
  check("outcomes: VSS-BERT 30% wrong on short3s test (part test) -> C and D triggered", okC.outcomes.C.triggered && okC.outcomes.D.triggered);
  let e2 = null; try { OC.computeOutcomes({ ...sets, short3s: wrong30("all") }); } catch (e) { e2 = e; }
  check("outcomes: short3s rows with part \"all\" (no --parts sha3): exit 3, not a silent false", e2 && e2.exitCode === 3 && /part \"test\"/.test(e2.message), String(e2));
  let e3 = null; try { OC.computeOutcomes({ ...sets, short3s: wrong30("test") }, { short3s: { parts: "all" } }); } catch (e) { e3 = e; }
  check("outcomes: a short3s file whose `parts` is not sha3 is refused (exit 3) even with test rows", e3 && e3.exitCode === 3 && /--parts sha3/.test(e3.message), String(e3));
  { const d2 = tmp("oc2"), ps = {}; for (const k of ["t1bs", "t1s", "short3s", "r2bs"]) { ps[k] = path.join(d2, `${k}.json`); writeFileSync(ps[k], JSON.stringify(file(k, k === "short3s" ? wrong30("test") : sets[k], k === "short3s" ? "all" : "all"))); }
    const cl = run("outcomes.mjs", Object.values(ps));
    check("outcomes CLI: a short3s rows file written with parts \"all\" exits 3 and writes nothing", cl.status === 3 && cl.stdout === "" && /--parts sha3/.test(cl.stderr), cl.stderr); }
  // the omitted ui.js rules, on a deciding view
  { const pr = (id, idx, n, pa, got, kind, reader = "VSS-BERT") => ({ id, reader, level: "cost", kind, gold_index: idx, prod_index: idx, n_produced: n, pa, got });
    const rows = [pr("m1", 0, 2, "command:set", {}, "done_right"), pr("m1", 1, 2, "command:set", {}, "done_right"), pr("m2", 0, 1, "command:delete", { target: "mention(shape=circle)" }, "done_right"),
      pr("m3", 0, 1, "command:delete", { target: "mention(shape=circle)" }, "held_right"), ...Array.from({ length: 96 }, (_, i) => pr(`k${i}`, 0, 1, "command:set", {}, "done_right"))];
    const o = OC.omittedRules(rows)["VSS-BERT"];
    check("omittedRules: 2 requests of a two-request message + 1 executed destructive described request, of 100 requested = 3%, over the 2% bar", o.requested === 100 && o.multi_request_messages === 1 && o.multi_requests === 2 && o.destructive_described_in_single === 1 && near(o.omitted_share, 0.03) && o.omitted_over_2pct === true, JSON.stringify(o));
    const few = OC.omittedRules(rows.slice(2))["VSS-BERT"];
    check("omittedRules: 1 executed destructive of 99 requested is about 1%: not over the bar", few.omitted_over_2pct === false && few.destructive_described_in_single === 1);
    check("omittedRules: a view with no request gives a null share, not a flag", OC.omittedRules([])["Rules"].omitted_share === null && OC.omittedRules([])["Rules"].omitted_over_2pct === false);
    check("outcomes: the output carries omitted_rules per deciding view and reader", ["V", "t1s", "short3s_test", "r2b"].every((v) => ["VSS-BERT", "VSS", "SOP-BERT", "Rules"].every((rd) => typeof o2[v][rd].omitted_over_2pct === "boolean")) , "");
  }
  // nothing executed
  const none = makeSet("t1b", 40, () => ({ kinds: { ...same("done_right"), "VSS-BERT": { all: "done_right", cost: "held_right" } } }));
  const on = OC.computeOutcomes({ ...sets, t1bs: none, t1s: none.map((r) => ({ ...r })), short3s: none.map((r) => ({ ...r, part: "test" })) });
  check("a reader that executes nothing: cw_share null, C not triggered, the report says it executes nothing", on.outcomes.C.triggered === false && on.outcomes.C.values.every((v) => v.cw_share === null && /executes nothing/.test(v.note)));
  // D: the VSS tab does better than VSS-BERT on short3s test
  const D = makeSet("s3", 60, (i) => ({ part: "test", kinds: { ...same("done_right"), "VSS-BERT": { all: "done_right", cost: i % 2 ? "held_right" : "done_right" } } }));
  const od = OC.computeOutcomes({ ...sets, short3s: D });
  check("outcomes D: the VSS tab does more right than VSS-BERT on short3s test -> triggered; held rows of calibration are left out", od.outcomes.D.triggered === true && od.outcomes.D.values.short3s_test.VSS_minus_VSS_BERT.ci95[0] > 0);
  const filt = makeSet("t1b", 100, (i) => ({ seen_text: i < 50, kinds: A(i).kinds }));
  check("seen_text rows never decide (a view of 50 of 100 leaves 50 messages)", OC.computeOutcomes({ ...sets, t1bs: filt }).sizes.V === 50);
  let thrown = null; try { OC.computeOutcomes({ t1bs: sets.t1bs }); } catch (e) { thrown = e; }
  check("a missing input is exit 3 (an error with exitCode 3 naming the sets)", thrown && thrown.exitCode === 3 && /t1s, short3s, r2bs/.test(thrown.message), String(thrown));
  const dir = tmp("oc"), f1 = path.join(dir, "t1bs.json"); writeFileSync(f1, JSON.stringify(file("t1bs", sets.t1bs)));
  const cli = run("outcomes.mjs", [f1]);
  check("outcomes CLI: a missing input exits 3 and writes nothing", cli.status === 3 && cli.stdout === "" && /missing input/.test(cli.stderr), cli.stderr);
  const fs = ["t1bs", "t1s", "short3s", "r2bs"].map((k) => { const p = path.join(dir, `${k}.json`); writeFileSync(p, JSON.stringify(file(k, sets[k], k === "short3s" ? "sha3" : "all"))); return p; });
  const ig = path.join(dir, "failures.json"); writeFileSync(ig, "[]");
  const ok = run("outcomes.mjs", [...fs, ig]);
  check("outcomes CLI: all four sets -> exit 0, JSON with A-D, each with triggered; a non-rows file is listed as ignored", ok.status === 0 && ["A", "B", "C", "D"].every((k) => typeof JSON.parse(ok.stdout).outcomes[k].triggered === "boolean") && JSON.parse(ok.stdout).ignored_files.length === 1, ok.stderr);
  check("outcomes: the paired interval is reproducible (seeded): two runs give the same output", ok.stdout === run("outcomes.mjs", [...fs, ig]).stdout);

  // root causes
  const held = makeSet("t1b", 30, (i) => ({ kinds: { ...same("done_right"), "VSS-BERT": { all: "done_right", cost: i % 3 === 0 ? "held_right" : i % 3 === 1 ? "executed_wrong" : "done_right" } } }));
  const md = RC.render([file("t1bs", held)]);
  check("root_causes: renders the held-but-right and executed-wrong sections with counts", /### V, VSS-BERT: all held-but-right requests: 10/.test(md) && /### V, VSS-BERT: 10 \(10 wrong, 0 extra\)/.test(md), md.slice(0, 400));
  const broken = file("t1bs", held); broken.summary["VSS-BERT"].cost.held_right += 1;
  let t2 = null; try { RC.render([broken]); } catch (e) { t2 = e; }
  check("root_causes: counts that do not add up to apply_gates's summary are exit 3", t2 && t2.exitCode === 3 && /held_right/.test(t2.message), String(t2));
  const bd = RC.breakdown([{ a: 1 }, { a: 1 }, { a: 2 }], (r) => r.a, (r) => String(r.a));
  check("root_causes: a breakdown adds up to its total, with 3 examples at most", bd.total === 3 && bd.groups.reduce((s, g) => s + g.n, 0) === 3 && bd.groups.every((g) => g.examples.length <= 3));
  check("root_causes: where the cause sits (spell checker, agree + size pull, disagree, one reader only)", RC.whereSits({ spell_changed: true }).startsWith("our code") && /calibration.*size, cut or word/.test(RC.whereSits({ situation: "agree", top_pulls: [{ name: "n_words" }] })) && /model or the data/.test(RC.whereSits({ situation: "disagree" })) && /the cut/.test(RC.whereSits({ situation: "sop_only" })));
  check("root_causes: classes of an executed wrong request / extra", /name or reference/.test(RC.wrongClass({ kind: "executed_wrong", differ: [{ key: "target" }] }, [])) && /value \(color\)/.test(RC.wrongClass({ kind: "executed_wrong", differ: [{ key: "color" }] }, [])) && /outside/.test(RC.wrongClass({ kind: "extra_executed", span: [0, 3], text: "abc def" }, [[4, 7]])) && /overlaps/.test(RC.wrongClass({ kind: "extra_executed", span: [0, 5], text: "abc def" }, [[4, 7]])));
  const cliRc = run("root_causes.mjs", [ig]);
  check("root_causes CLI: no rows file among the inputs is exit 3", cliRc.status === 3, cliRc.stderr);
}

// ---------------------------------------------------------------- parity
{
  const rows = [];
  const mk = (id, reader, conf, kind, got, text = "draw a circle", unit = "draw a circle") => rows.push({ id, reader, level: "cost", kind, conf, text, unit_text: unit, span: [0, unit.length], prod_index: 0, pa: "command:create", got, gold_index: 0 });
  const IDS = PA.requiredProbeIds();
  check("parity: the required probe ids come from probes/msg_01.jsonl (10)", IDS.length === 10 && IDS[0] === "probe-01" && IDS[9] === "probe-10");
  for (const id of IDS) for (const rd of PA.READERS) mk(id, rd, rd === "Rules" ? null : 0.938, rd === "Rules" ? "done_right" : "held_right", { action: "create", shape: "circle" });
  const cap = (over = {}) => { const c = { format: "browser_probes/1", probes: {} };
    for (const id of IDS) { c.probes[id] = { corrected: "draw a circle", readers: {} };
      for (const rd of PA.READERS) c.probes[id].readers[rd] = { requests: [{ unit: rd === "Rules" ? null : "draw a circle", wires: ["@w1 command action=create shape=circle"], confidence: rd === "Rules" ? null : 0.938, executed: rd === "Rules" }] }; }
    return over.fn ? (over.fn(c), c) : c; };
  const parity = async (c) => (await PA.runParity({ rows }, c)).differences;
  check("parity: identical readings hold", (await parity(cap())).length === 0);
  check("parity: a confidence 0.0019 away passes", (await parity(cap({ fn: (c) => { c.probes["probe-01"].readers["VSS-BERT"].requests[0].confidence = 0.9399; } }))).length === 0);
  check("parity: a confidence 0.0021 away fails", (await parity(cap({ fn: (c) => { c.probes["probe-01"].readers["VSS-BERT"].requests[0].confidence = 0.9401; } }))).some((x) => /confidence differs/.test(x)));
  check("parity: 0.002 apart in floats still passes (0.951 - 0.949 > 0.002 in floating point)", (await PA.runParity({ rows: rows.map((r) => (r.reader === "VSS" && r.id === "probe-01" ? { ...r, conf: 0.949 } : r)) }, cap({ fn: (c) => { c.probes["probe-01"].readers.VSS.requests[0].confidence = 0.951; } }))).differences.filter((x) => /probe-01\/VSS:/.test(x) && /confidence/.test(x)).length === 0);
  check("parity: an equal confidence with a different decision fails", (await parity(cap({ fn: (c) => { c.probes["probe-01"].readers["VSS-BERT"].requests[0].executed = true; } }))).some((x) => /decision differs/.test(x)));
  check("parity: a different wire fails", (await parity(cap({ fn: (c) => { c.probes["probe-01"].readers.VSS.requests[0].wires = ["@w1 command action=create shape=square"]; } }))).some((x) => /reading differs/.test(x)));
  check("parity: a different corrected text fails", (await parity(cap({ fn: (c) => { c.probes["probe-01"].corrected = "draw a circl"; } }))).some((x) => /corrected text/.test(x)));
  check("parity: a different unit text fails (not for the Rules' null unit)", (await parity(cap({ fn: (c) => { c.probes["probe-01"].readers["SOP-BERT"].requests[0].unit = "draw"; } }))).some((x) => /unit differs/.test(x)) && (await parity(cap())).length === 0);
  check("parity: one request fewer in the browser fails", (await parity(cap({ fn: (c) => { c.probes["probe-01"].readers.Rules.requests = []; } }))).some((x) => /request\(s\) in the harness/.test(x)));
  check("parity: a confidence null on one side only fails", (await parity(cap({ fn: (c) => { c.probes["probe-01"].readers["VSS-BERT"].requests[0].confidence = null; } }))).some((x) => /confidence/.test(x)));
  const errOf = async (c) => { try { await parity(c); return null; } catch (e) { return e; } };
  const m1 = await errOf(cap({ fn: (c) => { delete c.probes["probe-01"]; } }));
  check("parity: a missing probe is a tool failure (exit code 4), never a parity result", m1 && m1.exitCode === 4 && /missing probe probe-01/.test(m1.message), String(m1));
  const m2 = await errOf(cap({ fn: (c) => { delete c.probes["probe-01"].readers.VSS; } }));
  check("parity: a missing reader is exit code 4", m2 && m2.exitCode === 4 && /missing reader VSS/.test(m2.message), String(m2));
  const m3 = await errOf(cap({ fn: (c) => { delete c.probes["probe-01"].readers.Rules.requests[0].executed; } }));
  check("parity: a request without `executed` is exit code 4", m3 && m3.exitCode === 4);
  const m4 = await errOf(cap({ fn: (c) => { c.probes["probe-99"] = c.probes["probe-01"]; } }));
  check("parity: a probe the rows do not have is exit code 4", m4 && m4.exitCode === 4);
  { const noRow = rows.filter((r) => r.id !== "probe-10"); let e5 = null;
    try { await PA.runParity({ rows: noRow }, cap({ fn: (c) => { delete c.probes["probe-10"]; } })); } catch (e) { e5 = e; }
    check("parity: a probe missing from both the rows and the capture is exit code 4 (the ids come from the probes file)", e5 && e5.exitCode === 4 && /probe-10/.test(e5.message), String(e5)); }
  const dir = tmp("par"), pr = path.join(dir, "rows.json"), pc = path.join(dir, "cap.json"); writeFileSync(pr, JSON.stringify({ rows }));
  writeFileSync(pc, JSON.stringify(cap()));
  const p0 = run("parity.mjs", [pr, pc]);
  check("parity CLI: holds -> exit 0 and PARITY HOLDS", p0.status === 0 && /PARITY HOLDS/.test(p0.stdout), p0.stdout + p0.stderr);
  writeFileSync(pc, JSON.stringify(cap({ fn: (c) => { c.probes["probe-01"].readers.VSS.requests[0].confidence = 0.5; } })));
  const p1 = run("parity.mjs", [pr, pc]);
  check("parity CLI: a difference -> exit 1, printed", p1.status === 1 && /PARITY DIFFERS/.test(p1.stdout));
  writeFileSync(pc, JSON.stringify(cap({ fn: (c) => { delete c.probes["probe-01"].readers.VSS; } })));
  check("parity CLI: a missing reader -> exit 4", run("parity.mjs", [pr, pc]).status === 4);
  writeFileSync(pc, "{oops");
  check("parity CLI: unreadable capture -> exit 4; usage -> exit 2", run("parity.mjs", [pr, pc]).status === 4 && run("parity.mjs", [pr]).status === 2);
}

console.log(fails ? `\n${fails} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(fails ? 1 : 0);
