// spell_view.mjs: the corrected text of every row, as the demo reads it (VSSBERT_SHORT_COMMANDS_PLAN.md section 3.3).
// The demo corrects the text with docs/js/spell.js before every reader (ui.js run(): `sc.check(text, {names: canvasNames(cur)})`; the checker is
// `SpellKit.load` = create({params, words: vocab.words + legendWords(legend), keep}) with docs/model/spell/vocab.json). This script builds the
// checker exactly so (legend = the Rules system's engine.legend, as test_spell.mjs and short_bench.mjs do) and checks every row with
// names = row.names (a row's names are the canvas names the demo had).
//   node training/sketch/shortcmd/spell_view.mjs <in folder | in file.jsonl> <out folder>
// Reads the .jsonl files of a folder (msg_* / batch_* / s_*, name order; a malformed line stops with its file and line). Writes <out folder>/msg_NN.jsonl
// (NN = the position of the input file, so the data folders of collect_pair.mjs / collect_rules3.mjs read them) and <out folder>/spell_changed_ids.txt.
// A row keeps everything and gets: text = the corrected text, typed = the text as written, spell_fixes = the fixes ([{from, to, at, sim, second}]),
// spell_changed (true when the text differs), span_lost (true when a gold span is no longer a substring of the corrected text; the row is kept and
// flagged, the span is not rewritten). The output holds no time or machine data: the same input gives the same bytes.
// Exit 0 on success, 2 on usage, 1 on a malformed input line.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const REPO = new URL("../../../", import.meta.url).pathname;

/** the demo's spell checker (SpellKit.load's construction) */
export function makeSpeller(repo = REPO) {
  const SK = require(repo + "docs/js/spell.js"), K = require(repo + "docs/js/logic.js"), V = require(repo + "docs/model/spell/vocab.json");
  return SK.create({ params: V.params, words: V.words.concat(SK.legendWords(K.createSystem().engine.legend)), keep: V.keep || [] });
}

/** one row with the demo's correction applied -> the new row (the input is not changed) */
export function spellRow(row, speller) {
  const sp = speller.check(row.text, { names: row.names || [] });
  const out = { ...row, text: sp.text, typed: row.text, spell_fixes: sp.fixes, spell_changed: sp.text !== row.text };
  out.span_lost = (row.wires || []).some((w) => w.span && !sp.text.includes(w.span));
  return out;
}

export function readJsonl(file) {
  const rows = [];
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    try { rows.push(JSON.parse(line)); } catch (e) { const err = new Error(`${file}:${i + 1}: not JSON (${e.message})`); err.exitCode = 1; throw err; }
  });
  return rows;
}

/** the input files of a folder or one file, in order */
export function inputFiles(inp) {
  if (statSync(inp).isFile()) return [inp];
  return readdirSync(inp).filter((f) => f.endsWith(".jsonl") && /^(msg|batch|s)[_.]/.test(f)).sort().map((f) => path.join(inp, f));
}

/** the whole step -> {rows, changed, lost} */
export function run(inp, outDir, speller = makeSpeller()) {
  const files = inputFiles(inp);
  if (!files.length) { const e = new Error(`${inp}: no msg_* / batch_* / s_* .jsonl file`); e.exitCode = 2; throw e; }
  mkdirSync(outDir, { recursive: true });
  let n = 0; const changed = [], lost = [];
  files.forEach((f, k) => {
    const out = readJsonl(f).map((r) => {
      const v = spellRow(r, speller); n++;
      if (v.spell_changed) changed.push(v.id);
      if (v.span_lost) lost.push(v.id);
      return JSON.stringify(v);
    });
    writeFileSync(path.join(outDir, `msg_${String(k + 1).padStart(2, "0")}.jsonl`), out.length ? out.join("\n") + "\n" : "");
  });
  writeFileSync(path.join(outDir, "spell_changed_ids.txt"), changed.length ? changed.join("\n") + "\n" : "");
  return { rows: n, changed: changed.length, span_lost: lost.length, span_lost_ids: lost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [inp, out] = process.argv.slice(2);
  if (!inp || !out) { console.error("usage: spell_view.mjs <in folder | in file> <out folder>"); process.exit(2); }
  try { console.log(JSON.stringify(run(inp, out))); } catch (e) { console.error(`spell_view: ${e.message}`); process.exit(e.exitCode || 1); }
}
