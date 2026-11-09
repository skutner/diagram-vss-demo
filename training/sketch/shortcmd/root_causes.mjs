// root_causes.mjs: the counts and classes of VSSBERT_SHORT_COMMANDS_PLAN.md section 8, from the rows of apply_gates.mjs, as markdown.
//   node training/sketch/shortcmd/root_causes.mjs ROWS.json [ROWS.json ...] > root_causes.md
// A file that is not an apply_gates.mjs output is listed and skipped. The views are those of outcomes.mjs (V = t1bs core forms, t1s, short3s test, r2b), each
// from the sets given. Every count is checked: the rows of each file, summarised again (apply_gates.mjs summarize) over the judged part, must equal the file's
// own `summary`, and every classification must add up to its total, else exit 3 (nothing is written). Exit 2: usage.
// Sections:
//   1. Held but right (VSS-BERT, VSS, SOP-BERT, at `cost`), on each view and on the subset the Rules read right: counts by `situation` (VSS-BERT: agree, disagree,
//      sop_only, vss_only; the tabs: who agrees), by the demo's reason group (`reasons_group`), by the executing reader's own group (`own_group`), by the first
//      `top_pulls` feature (VSS-BERT), each with 3 examples; and, for VSS-BERT, where the cause sits by the plan's rule (calibration: agree with a size / cut / word
//      pull; model or data: disagree; the cut: sop_only / vss_only; our code: a row the spell checker changed or lost its span).
//   2. Executed wrong and extras executed, per reader (at `cost`): all listed when there are 60 or fewer, else classified by rules (spell checker, name or
//      reference, value of a key, an extra that overlaps a gold request (cut or action), an extra outside every gold request) and 20 read (the first 20 by
//      sha256 of the id: no choice of mine).
//   3. The tabs against each other: requests VSS-BERT held that the VSS or SOP-BERT tab executed right, and the reverse, by form.
//   4. The spell checker: t1raw against t1s on the rows the spell checker changed (when both sets are given).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { summarize } from "./apply_gates.mjs";
import { decidingViews } from "./outcomes.mjs";

const fail = (msg, code = 3) => { const e = new Error(msg); e.exitCode = code; return e; };
const READERS = ["VSS-BERT", "VSS", "SOP-BERT"], SIZE_CUT_WORD = new Set(["n_roles", "n_words", "unk_share", "split_share", "n_units"]);
const isCutOrWord = (n) => SIZE_CUT_WORD.has(n) || /^cut_/.test(n);
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const sel = (rows, reader, level = "cost") => rows.filter((r) => r.reader === reader && r.level === level);
const pct = (x, n) => (n ? `${((100 * x) / n).toFixed(1)}%` : "-");
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

/** a consistency check of one apply_gates output: the stored summary against the rows summarised again (judged part), -> [problems] */
export function checkTotals(j) {
  const judged = j.parts === "sha3" ? j.rows.filter((r) => r.part === "test") : j.rows, bad = [];
  for (const rd of Object.keys(j.summary)) for (const lv of Object.keys(j.summary[rd])) {
    const again = summarize(judged.filter((r) => r.reader === rd && r.level === lv)), stored = j.summary[rd][lv];
    for (const k of ["requested", "right", "wrong", "held_right", "held_wrong", "missed", "extras_executed", "extras_held", "executed"]) if (again[k] !== stored[k]) bad.push(`${j.set} ${rd}/${lv}: ${k} ${again[k]} (rows) against ${stored[k]} (summary)`);
  }
  return bad;
}

/** a partition of rows by key(row): counts, each with 3 examples; the counts add up to rows.length (checked) -> {total, groups: [{key, n, examples}]} */
export function breakdown(rows, key, example) {
  const m = new Map();
  for (const r of rows) { const k = String(key(r)); (m.get(k) || m.set(k, []).get(k)).push(r); }
  const groups = [...m.entries()].map(([k, rs]) => ({ key: k, n: rs.length, examples: rs.slice(0, 3).map(example) })).sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  if (groups.reduce((s, g) => s + g.n, 0) !== rows.length) throw fail(`a breakdown does not add up (${rows.length} rows)`);
  return { total: rows.length, groups };
}
const ex = (r) => `${r.id} “${r.unit_text || r.text}” (${r.conf === null ? "no conf" : r.conf.toFixed(3)})`;
const table = (b, title) => b.total ? `| ${title} | n | share | examples |\n|---|---|---|---|\n` + b.groups.map((g) => `| ${cell(g.key)} | ${g.n} | ${pct(g.n, b.total)} | ${cell(g.examples.join("; "))} |`).join("\n") + "\n" : "_none_\n";

/** where the cause of a held-but-right VSS-BERT request sits, by the plan's rule */
export function whereSits(r) {
  if (r.spell_changed || r.span_lost) return "our code (the spell checker changed the text)";
  if (r.situation === "agree") return r.top_pulls && r.top_pulls[0] && isCutOrWord(r.top_pulls[0].name) ? "calibration (both readers agree; the largest pull is a size, cut or word signal)" : "calibration (both readers agree; the largest pull is another signal)";
  if (r.situation === "disagree") return "the model or the data (the readers disagree on a value: see which key)";
  if (r.situation === "sop_only" || r.situation === "vss_only") return "the cut (only one reader found the request)";
  return "not classified";
}
/** the class of an executed-wrong request or an executed extra, by the plan's first-cause order */
export function wrongClass(r, goldSpans) {
  if (r.spell_changed || r.span_lost) return "the spell checker changed the text";
  if (r.kind === "extra_executed") {
    const [a, b] = r.span || [0, 0], al = /[A-Za-z0-9]/;
    const overlaps = (goldSpans || []).some(([c, d]) => { for (let i = Math.max(a, c); i < Math.min(b, d); i++) if (al.test((r.text || "")[i])) return true; return false; });
    return overlaps ? "extra that overlaps a gold request (cut or action)" : "extra outside every gold request";
  }
  const keys = (r.differ || []).map((d) => d.key), refs = new Set(["target", "from", "to", "anchor", "name", "label"]);
  if (keys.length && keys.every((k) => refs.has(k))) return `name or reference (${keys.join(",")})`;
  return `value (${keys.join(",") || "?"})`;
}
const goldSpansOf = (rows) => { const m = new Map(); for (const r of rows) if (r.gold_span && r.text) { const k = r.text.indexOf(r.gold_span); if (k >= 0) (m.get(r.id) || m.set(r.id, []).get(r.id)).push([k, k + r.gold_span.length]); } return m; };

export function render(files) {
  const sets = {}, out = [], problems = [];
  for (const j of files) { sets[j.set] = j.rows; problems.push(...checkTotals(j)); }
  if (problems.length) throw fail("the counts do not add up:\n  " + problems.join("\n  "));
  const views = decidingViews(sets);
  out.push("# Root causes (VSSBERT_SHORT_COMMANDS_PLAN.md section 8)\n", `Sets read: ${Object.keys(sets).sort().join(", ")}. Counts checked against the \`summary\` of each rows file (they add up). Level \`cost\`. A row is a gold request or an extra of a reader.\n`);
  // ---- 1. held but right
  out.push("## 1. Held but right\n");
  for (const [vn, rows] of Object.entries(views)) {
    const rulesRight = new Set(sel(rows, "Rules").filter((r) => r.kind === "done_right").map((r) => `${r.id}#${r.gold_index}`));
    for (const [sub, keep] of [["all held-but-right requests", () => true], ["the subset the Rules read right", (r) => rulesRight.has(`${r.id}#${r.gold_index}`)]]) {
      for (const rd of READERS) {
        const held = sel(rows, rd).filter((r) => r.kind === "held_right" && keep(r));
        out.push(`### ${vn}, ${rd}: ${sub}: ${held.length}\n`);
        if (!held.length) continue;
        out.push(table(breakdown(held, (r) => r.situation, ex), "situation"), table(breakdown(held, (r) => r.reasons_group ?? "none", ex), "reason group (the demo's)"),
          table(breakdown(held, (r) => r.own_group ?? "none (own confidence above its threshold)", ex), "the executing reader's own group"));
        if (rd === "VSS-BERT") out.push(table(breakdown(held, (r) => (r.top_pulls && r.top_pulls[0] ? r.top_pulls[0].name : "none (no pull above 0.05, or a VSS request)"), ex), "first top_pulls feature"),
          table(breakdown(held, whereSits, ex), "where the cause sits"));
      }
    }
  }
  // ---- 2. executed wrong and extras
  out.push("## 2. Executed wrong and extras executed\n");
  for (const [vn, rows] of Object.entries(views)) {
    const gs = goldSpansOf(rows);
    for (const rd of ["VSS-BERT", "VSS", "SOP-BERT", "Rules"]) {
      const bad = sel(rows, rd).filter((r) => r.kind === "executed_wrong" || r.kind === "extra_executed");
      out.push(`### ${vn}, ${rd}: ${bad.length} (${bad.filter((r) => r.kind === "executed_wrong").length} wrong, ${bad.filter((r) => r.kind === "extra_executed").length} extra)\n`);
      if (!bad.length) continue;
      const cls = breakdown(bad, (r) => wrongClass(r, gs.get(r.id)), ex);
      out.push(table(cls, "first cause (by rule)"));
      const picked = bad.length <= 60 ? bad : bad.slice().sort((a, b) => sha(a.id).localeCompare(sha(b.id))).slice(0, 20);
      out.push(`${bad.length <= 60 ? "All" : "20 read (first by sha256 of the id)"}:\n`, "| id | text | kind | gold | read | differ |\n|---|---|---|---|---|---|\n" +
        picked.map((r) => `| ${r.id} | ${cell(r.text)} | ${r.kind} | ${cell(r.gold ? JSON.stringify(r.gold) : "-")} | ${cell(JSON.stringify(r.got))} | ${cell((r.differ || []).map((d) => `${d.key}: ${d.got} / ${d.gold}`).join("; ") || "-")} |`).join("\n") + "\n");
    }
  }
  // ---- 3. the tabs against each other
  out.push("## 3. The tabs against each other (gold requests, `cost`)\n");
  for (const [vn, rows] of Object.entries(views)) {
    const by = (rd) => new Map(sel(rows, rd).filter((r) => r.gold_index !== null).map((r) => [`${r.id}#${r.gold_index}`, r]));
    const vb = by("VSS-BERT"), forms = new Map();
    for (const tab of ["VSS", "SOP-BERT"]) {
      const t = by(tab), cnt = new Map();
      for (const [k, b] of vb) { const x = t.get(k); if (!x) continue; const f = String(b.form), c = cnt.get(f) || cnt.set(f, { vbHeld_tabRight: 0, tabHeld_vbRight: 0 }).get(f);
        if ((b.kind === "held_right" || b.kind === "held_wrong") && x.kind === "done_right") c.vbHeld_tabRight++;
        if ((x.kind === "held_right" || x.kind === "held_wrong") && b.kind === "done_right") c.tabHeld_vbRight++; }
      forms.set(tab, cnt);
    }
    out.push(`### ${vn}\n`, "| form | tab | VSS-BERT held, tab executed right | tab held, VSS-BERT executed right |\n|---|---|---|---|");
    for (const [tab, cnt] of forms) for (const [f, c] of [...cnt.entries()].sort()) out.push(`| ${cell(f)} | ${tab} | ${c.vbHeld_tabRight} | ${c.tabHeld_vbRight} |`);
    out.push("");
  }
  // ---- 4. the spell checker
  if (sets.t1raw && sets.t1s) {
    out.push("## 4. The spell checker: t1raw (the 70 rows as written) against t1s (as the demo reads them)\n", "| reader | level | right (raw / spelled) | wrong (raw / spelled) | held right | missed |\n|---|---|---|---|---|---|");
    const ids = new Set(sets.t1raw.map((r) => r.id)), spelled = sets.t1s.filter((r) => ids.has(r.id));
    for (const rd of ["VSS-BERT", "VSS", "SOP-BERT", "Rules"]) for (const lv of ["all", "cost"]) {
      const a = summarize(sel(sets.t1raw, rd, lv)), b = summarize(sel(spelled, rd, lv));
      out.push(`| ${rd} | ${lv} | ${a.right} / ${b.right} | ${a.wrong + a.extras_executed} / ${b.wrong + b.extras_executed} | ${a.held_right} / ${b.held_right} | ${a.missed} / ${b.missed} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const names = process.argv.slice(2);
  if (!names.length) { console.error("usage: root_causes.mjs ROWS.json [ROWS.json ...] > root_causes.md"); process.exit(2); }
  let code = 0;
  try {
    const files = [], skipped = [];
    for (const f of names) {
      let j; try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { throw fail(`${f}: ${e.message}`); }
      if (!j || Array.isArray(j) || typeof j.set !== "string" || !Array.isArray(j.rows) || !j.summary) { skipped.push(f); continue; }
      files.push(j);
    }
    if (!files.length) throw fail("no apply_gates.mjs output among the inputs");
    process.stdout.write(render(files) + (skipped.length ? `\n_Skipped (not rows files): ${skipped.join(", ")}_\n` : "") + "\n");
  } catch (e) { console.error(`root_causes: ${e.message}`); code = e.exitCode || 1; }
  process.exit(code);
}
