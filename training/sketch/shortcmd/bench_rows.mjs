// bench_rows.mjs: docs/bench/broad.json as rows of the training format (VSSBERT_SHORT_COMMANDS_PLAN.md section 3.4, owner decision Q2).
//   node training/sketch/shortcmd/bench_rows.mjs <broad.json> <out folder>
// Each item with ONE gold wire (`gold` + `type`) becomes a row: id broad-NNNN (NNNN = its 1-based position in the file), text = its text,
// names = its names, one wire {span: text, trigger: "", type, args: gold} (the bench items carry no trigger: the trigger is empty, so
// check_rules.mjs's "trigger in span" holds and `seen_trigger` is not computed for these rows: meta.trigger_known = false), meta {form: its
// `cat`, narration: false, set: "bench_broad"}. An item with several wires (`wires`) is skipped and counted. Then check_rules.mjs
// (the Rules' own reading against the gold, as every synthetic view here): only the rows it says ok for are kept. The set is written from the
// Rules' templates and favours the Rules (AGENTS.md "Fair comparison"); it is reported, never deciding.
// Writes <out folder>/msg_01.jsonl; prints one JSON line {items, skipped_not_one_wire, rules_not_ok, kept, not_ok_ids}. Exit 2 on usage, 3 on an unreadable input.
// Same bytes for the same input (the temporary files live in the OS temp folder and are removed).
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);

/** the items -> {rows, skipped} */
export function toRows(items) {
  const rows = [], skipped = [];
  items.forEach((it, i) => {
    const id = `broad-${String(i + 1).padStart(4, "0")}`;
    if (!it || typeof it.text !== "string" || !it.gold || typeof it.gold !== "object" || Array.isArray(it.gold) || !it.type) { skipped.push(id); return; }
    rows.push({ id, domain: "docs/bench/broad.json", names: (it.names || []).slice(), text: it.text,
      wires: [{ span: it.text, trigger: "", type: it.type, args: it.gold }], meta: { form: it.cat || "", narration: false, set: "bench_broad", trigger_known: false } });
  });
  return { rows, skipped };
}

/** check_rules.mjs on the rows -> the set of ids it says ok for */
export function rulesOk(rows) {
  const dir = mkdtempSync(path.join(tmpdir(), "bench_rows-")), inp = path.join(dir, "in.jsonl"), out = path.join(dir, "out.jsonl");
  try {
    writeFileSync(inp, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    const r = spawnSync("node", [path.join(HERE, "../synth/check_rules.mjs"), inp, out], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`check_rules.mjs failed: ${r.stderr}`);
    return new Set(readFileSync(out, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)).filter((v) => v.ok).map((v) => v.id));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [inp, outDir] = process.argv.slice(2);
  if (!inp || !outDir) { console.error("usage: bench_rows.mjs <broad.json> <out folder>"); process.exit(2); }
  let items;
  try { items = JSON.parse(readFileSync(inp, "utf8")); if (!Array.isArray(items)) throw new Error("not a list"); } catch (e) { console.error(`bench_rows: ${inp}: ${e.message}`); process.exit(3); }
  const { rows, skipped } = toRows(items), ok = rows.length ? rulesOk(rows) : new Set(), kept = rows.filter((r) => ok.has(r.id));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "msg_01.jsonl"), kept.length ? kept.map((r) => JSON.stringify(r)).join("\n") + "\n" : "");
  console.log(JSON.stringify({ items: items.length, skipped_not_one_wire: skipped.length, rules_not_ok: rows.length - kept.length, kept: kept.length, not_ok_ids: rows.filter((r) => !ok.has(r.id)).map((r) => r.id) }));
}
