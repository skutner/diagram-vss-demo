// build_canvas_rows.mjs: the second-read training rows of arm M4 (MODERNBERT_PARITY_PLAN.md M4; the trainer's --canvas-rows DIR).
//   node training/neural/parity/build_canvas_rows.mjs OUT_DIR [FOLDER ...]      (FOLDER relative to training/sketch; default: the M2s list plus llm_train/nl_p1)
// One row per annotated request with a name-role (reader ref_keys: target, from, to, anchor, anchor2, linked). Its input is the request, then the
// drawing before the message as docs/js/drawing-lines.js writes it, newest lines first, capped at 512 ModernBERT word pieces (whole lines).
// Its labels are B / I tags on the names of the drawing (the heads of the lines) that a role refers to; the request's own words are not labelled
// (null: the first read tags them):
//   - a name the request does not write: that name;
//   - a mention(...) with a filter the request does not write: the shapes the engine selects when the message's gold is played on the drawing;
//   - a name the request writes, "$new", a mention whose filters the request writes: no tag (the row teaches when the drawing is not needed).
// The drawing: replay of the gold in the engine for llm_train/scenes_r3* (one file = one session from an empty drawing) and the nl_p* folders
// (opus/ labels; sessions from their first step's setup, cut at the first unreliable step; a row with a setup alone), else the row's names and
// groups alone (one line of names). A request whose role needs the drawing but whose shapes cannot be tagged (not on the drawing, cut off by the
// cap, a description the engine could not resolve, or on a drawing known by names only) is not a row; each reason is counted.
// Writes OUT_DIR/canvas_train.jsonl and OUT_DIR/canvas_manifest.json (counts per source). Test sets are refused.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DL, REF_KEYS, drawingsOf, targetsOf, wordsOf, pieceCounter } from './canvas_lib.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url)), SK = ROOT + 'training/sketch/';
export const CAP = 512;
const FIRST = ['opus_train_a', 'opus_train_b', 'opus_train_c', 'opus_train_d', 'opus_gen_1', 'opus_gen_2', 'synth_rules', 'synth_rules_ops', 'synth_rules_ext', 'ops_formulations', 'opus_ext_1', 'synth_combo'].map(d => 'llm_train/' + d);
const M2S = ['scenes_r3', 'scenes_r3b', 'opus_r3_gaps'].map(d => 'llm_train/' + d);
export const DEFAULT_FOLDERS = [...FIRST, ...M2S, 'llm_train/nl_p1'];
const sha = b => createHash('sha256').update(b).digest('hex');
const readJsonl = p => readFileSync(p, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

/** the files of a folder, as make_data.py reads it: nl_p* from opus/, else its *.jsonl */
function filesOf(folder) {
  const d = SK + folder, sub = /(^|\/)nl_p[^/]*$/.test(folder) ? d + '/opus' : d;
  return readdirSync(sub).filter(f => f.endsWith('.jsonl')).sort().map(f => sub + '/' + f);
}
const howOf = folder => (/(^|\/)scenes_r3b?$/.test(folder) ? 'scenes' : 'rows');

/** the tags of one request's row on a fitted input: {tags, tagged, missing: [reason]} */
export function labelRow(fitted, all, targets) {
  const ws = wordsOf(fitted.text), tags = ws.map(w => (w.start < fitted.drawFrom ? null : 'O'));
  const kept = new Map(), anywhere = new Set(all.flatMap(l => l.heads.map(h => h.name.toLowerCase())));
  for (const h of fitted.heads) { const k = h.name.toLowerCase(); if (!kept.has(k)) kept.set(k, h); }
  const missing = [], used = new Map(); let tagged = 0;
  for (const k of REF_KEYS) for (let t of targets[k] || []) {
    // a role that needs the drawing is answered by the second read as a whole (docs/js/neural.js drawnRole takes the tagged names as the role's value),
    // so every part of it is tagged on the drawing, its written names too; a part the drawing cannot hold ($new, a written description) leaves the row out
    const needs = (targets[k] || []).some(x => x.kind === 'name' || x.kind === 'desc-drawing');
    if (!needs) continue;
    if (t.kind === 'new') { missing.push('a role that mixes $new with the drawing'); continue; }
    if (t.kind === 'desc-written') { missing.push('a role that mixes a written description with the drawing'); continue; }
    if (t.kind === 'written') t = { ...t, names: [t.part] };
    if (t.error) { missing.push(t.error === 'no drawing' ? 'description on a drawing known by names only' : 'description the engine did not resolve'); continue; }
    if (!t.names.length) { missing.push('description the engine did not resolve'); continue; }
    for (const n of t.names) {
      const h = kept.get(n.toLowerCase());
      if (!h) { missing.push(anywhere.has(n.toLowerCase()) ? 'shape cut off by the cap' : 'name not on the drawing'); continue; }
      if (used.has(h)) { if (used.get(h) !== k) missing.push('one shape in two roles'); continue; }
      used.set(h, k);
      let first = true;
      ws.forEach((w, i) => { if (w.start >= h.start && w.end <= h.end) { tags[i] = (first ? 'B-' : 'I-') + k; first = false; } });
      tagged++;
    }
  }
  return { words: ws.map(w => w.w), tags, tagged, missing };
}

async function main() {
  const [out, ...given] = process.argv.slice(2);
  if (!out) throw new Error('usage: node build_canvas_rows.mjs OUT_DIR [FOLDER ...]');
  const folders = given.length ? given : DEFAULT_FOLDERS;
  for (const f of folders) {
    const rel = relative(SK, resolve(SK, f));
    if (rel.startsWith('..') || /^llm_bench(\/|$)/.test(rel)) throw new Error(`${f}: not a training folder under training/sketch/llm_train (test sets are refused)`);
    if (!existsSync(SK + f) || !statSync(SK + f).isDirectory()) throw new Error(`no folder training/sketch/${f}`);
  }
  const OUT = resolve(out);
  if (!relative(ROOT, OUT).startsWith('..')) throw new Error('OUT_DIR is inside the repository: data stays outside git');
  mkdirSync(OUT, { recursive: true });
  if (existsSync(OUT + '/canvas_train.jsonl')) throw new Error(OUT + '/canvas_train.jsonl exists: remove it first');
  const { count } = await pieceCounter();
  const rows = [], perSource = {}, files = {};
  for (const folder of folders) {
    const c = perSource[folder] = { messages: 0, by_drawing: { replay: 0, setup: 0, names: 0 }, requests_with_a_role: 0, rows_positive: 0, rows_negative: 0, not_a_row: {}, tags: 0,
      rows_with_lines_cut_by_cap: 0, pieces: [], left_out_unreliable: 0, engine_errors: 0, names_mismatch: 0, span_missing: 0 };
    for (const file of filesOf(folder)) {
      files[relative(ROOT, file)] = sha(readFileSync(file));
      const counts = { left_out_unreliable: 0, engine_errors: 0 };
      const entries = drawingsOf(readJsonl(file), howOf(folder), counts);
      c.left_out_unreliable += counts.left_out_unreliable; c.engine_errors += counts.engine_errors;
      for (const e of entries) {
        c.messages++; c.by_drawing[e.kind]++; c.names_mismatch += e.namesMismatch ? 1 : 0;
        const lines = DL.lines(e.state, e.sources), targets = targetsOf(e.system, e.state, e.row);
        (e.row.wires || []).forEach((w, i) => {
          if (!REF_KEYS.some(k => w.args?.[k] != null)) return;
          if (!w.span || !e.row.text.includes(w.span)) { c.span_missing++; return; }
          c.requests_with_a_role++;
          const fitted = DL.fit(w.span, lines, count, CAP), lab = labelRow(fitted, lines, targets[i]);
          if (lab.missing.length) { for (const m of new Set(lab.missing)) c.not_a_row[m] = (c.not_a_row[m] || 0) + 1; return; }
          const pieces = count(fitted.text);
          if (pieces > CAP) { c.not_a_row['request alone over the cap'] = (c.not_a_row['request alone over the cap'] || 0) + 1; return; }
          c.pieces.push(pieces); if (fitted.dropped) c.rows_with_lines_cut_by_cap++;
          if (lab.tagged) { c.rows_positive++; c.tags += lab.tagged; } else c.rows_negative++;
          rows.push({ id: `${e.row.id}#${i}`, source: folder, drawing: e.kind, text: fitted.text, words: lab.words, tags: lab.tags, draw_from: fitted.drawFrom, positive: lab.tagged > 0,
            roles: Object.fromEntries(REF_KEYS.filter(k => targets[i][k]).map(k => [k, targets[i][k].map(t => t.kind)])), lines_kept: fitted.kept, lines_total: fitted.total, pieces });
        });
      }
    }
    const q = (a, p) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(p * (a.length - 1))] : null);
    c.pieces = { p50: q(c.pieces, .5), p90: q(c.pieces, .9), max: c.pieces.length ? Math.max(...c.pieces) : null };
    console.log(folder, JSON.stringify(c));
  }
  const body = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(OUT + '/canvas_train.jsonl.tmp', body); renameSync(OUT + '/canvas_train.jsonl.tmp', OUT + '/canvas_train.jsonl');
  const total = { rows: rows.length, positive: rows.filter(r => r.positive).length, negative: rows.filter(r => !r.positive).length, rows_with_lines_cut_by_cap: rows.filter(r => r.lines_kept < r.lines_total).length };
  const manifest = { format: DL.FORMAT, cap: CAP, folders, total, per_source: perSource, canvas_train_sha256: sha(body), files,
    code: Object.fromEntries(['docs/js/drawing-lines.js', 'training/neural/parity/canvas_lib.mjs', 'training/neural/parity/build_canvas_rows.mjs', 'docs/js/logic.js'].map(p => [p, sha(readFileSync(ROOT + p))])),
    tokenizer_sha256: sha(readFileSync(ROOT + 'docs/model/neural/modernbert/tokenizer.json')) };
  writeFileSync(OUT + '/canvas_manifest.json', JSON.stringify(manifest, null, 1) + '\n');
  console.log(JSON.stringify(total));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
