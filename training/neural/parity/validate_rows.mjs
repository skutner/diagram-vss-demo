// validate_rows.mjs: checks saved texts and their annotated rows in the engine (MODERNBERT_PARITY_PLAN.md section 6; briefs: training/sketch/llm_bench/NL_TEST_SPEC.md,
// training/sketch/llm_train/ANNOTATION_SPEC.md).
//   node training/neural/parity/validate_rows.mjs TEXTS_DIR LABELS_DIR [--write]
// Every *.jsonl directly in each folder is read; rows are matched by id, whichever file holds them.
// Hard failures (exit 1): a setup that does not parse or run in full; a text row that is not texts only; id, text, kind, session, group or setup not identical to the saved texts; a
//   saved text with no annotated row or an annotated row with no saved text; a span not in the text or out of the text's order; a trigger not in its span; wires that do not convert or
//   parse; a key the legend does not hold (the engine only warns and ignores it); an engine error. Reported but not hard: a Clarify (the engine asks "which one?", a fair outcome of an
//   ambiguous message), "nothing to undo / redo", and the warnings listed at the end.
// Replay: a fresh system per row, or per session. The setup is one engine run, each message one run. The setup is the drawing the person is looking at, not something they did, so the
//   undo and redo stacks are emptied after it: "undo" on a first message has nothing to step over and does not erase the drawing.
// --write fills `names` (the shapes before this message, in the engine's order) and `groups` ({group name: members}, before this message) of each row whose drawing could be replayed
// cleanly: not after a failed step of its session, whose drawing would be wrong. Rerun after fixing that step.
// parity_lib.mjs goldProgram cannot pass a mention value with a space (the data's form, mention(label=order flow), gives `@m1 mention label=order flow`, which parse() rejects), so such a
// value is quoted here first, on a copy; the rows keep their form.
import fs from 'node:fs';
import path from 'node:path';
import { K, goldProgram, run } from './parity_lib.mjs';

const KINDS = new Set(['long', 'short', 'session', 'self_correction', 'complaint', 'indirect', 'typos', 'dictated', 'translated', 'fragment', 'ambiguous', 'nothing_to_do', 'reference', 'paraphrase']);
const IDENTITY = ['id', 'text', 'kind', 'session', 'group', 'setup'];
const TEXT_KEYS = new Set(['id', 'domain', 'kind', 'session', 'group', 'setup', 'text']);
const REF_KEYS = new Set(['target', 'from', 'to', 'anchor', 'anchor2', 'members']);   // the keys goldProgram expands mentions and $new in
const WIRE_TYPES = new Set(['command', 'question', 'fact', 'rule']);

const argv = process.argv.slice(2), WRITE = argv.includes('--write'), dirs = argv.filter(a => a !== '--write');
if (dirs.length !== 2 || dirs.some(a => a.startsWith('--'))) { console.error('usage: node validate_rows.mjs TEXTS_DIR LABELS_DIR [--write]'); process.exit(2); }
const [TEXTS, LABELS] = dirs;

const hard = [], soft = [], warn = [];
const fail = (id, what, msg) => hard.push({ id, what, msg }), ask = (id, what, msg) => soft.push({ id, what, msg }), note = (id, what, msg) => warn.push({ id, what, msg });
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const field = (o, k) => (has(o, k) ? o[k] : undefined);

/** the *.jsonl files of a folder, in name order -> [{file, lines: [{raw, row}]}] */
function readDir(dir, role) {
  let names;
  try { names = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort(); } catch (e) { fail('-', role, `cannot read the folder ${dir}: ${e.message}`); return []; }
  if (!names.length) fail('-', role, `no .jsonl file in ${dir}`);
  return names.map(f => {
    const file = path.join(dir, f), raw = fs.readFileSync(file, 'utf8');
    const lines = raw.split('\n').map((l, i) => {
      if (!l.trim()) return { raw: l };
      try { const row = JSON.parse(l); if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new Error('not an object'); return { raw: l, row }; }
      catch (e) { fail(`${f}:${i + 1}`, role, `bad JSON: ${e.message}`); return { raw: l }; }
    });
    return { file, lines };
  });
}

// ---- the saved texts
const textFiles = readDir(TEXTS, 'texts'), texts = [], textById = new Map();
for (const { lines } of textFiles) for (const { row } of lines) {
  if (!row) continue;
  const id = row.id;
  if (typeof id !== 'string' || !id) { fail(String(id), 'texts', 'id is not a non-empty string'); continue; }
  if (textById.has(id)) { fail(id, 'texts', 'id appears twice in the saved texts'); continue; }
  for (const k of ['domain', 'kind', 'text']) if (typeof field(row, k) !== 'string' || !row[k]) fail(id, 'texts', `${k} is not a non-empty string`);
  for (const k of ['session', 'group', 'setup']) if (has(row, k) && (typeof row[k] !== 'string' || !row[k])) fail(id, 'texts', `${k}, when present, must be a non-empty string`);
  for (const k of Object.keys(row)) if (!TEXT_KEYS.has(k)) { if (['wires', 'names', 'groups'].includes(k)) fail(id, 'texts', `a text row holds no labels: it has ${k}`); else note(id, 'texts', `unknown key ${k}`); }
  if (typeof row.kind === 'string' && !KINDS.has(row.kind)) note(id, 'kind', `"${row.kind}" is not one of the kinds of NL_TEST_SPEC.md`);
  textById.set(id, row); texts.push(row);
}

// ---- sessions and paraphrase groups, by the saved texts
const sessions = new Map(), groups = new Map();
texts.forEach((t, i) => {
  if (typeof t.session === 'string') { if (!sessions.has(t.session)) sessions.set(t.session, []); sessions.get(t.session).push({ t, i }); }
  if (typeof t.group === 'string') { if (!groups.has(t.group)) groups.set(t.group, []); groups.get(t.group).push(t); }
  if (t.kind === 'paraphrase' && !has(t, 'group')) fail(t.id, 'group', 'kind paraphrase needs a group');
  if (has(t, 'group') && t.kind !== 'paraphrase') fail(t.id, 'group', `a row of a paraphrase group has kind "${t.kind}", not paraphrase`);
  if (has(t, 'group') && has(t, 'session')) fail(t.id, 'group', 'a row is in a paraphrase group or in a session, not in both');
});
for (const [s, rows] of sessions) {
  rows.forEach(({ t }, k) => { if (k > 0 && has(t, 'setup')) fail(t.id, 'session', `only the first row of session ${s} has a setup`); });
  if (rows.some(({ i }, k) => k > 0 && i !== rows[k - 1].i + 1)) note(rows[0].t.id, 'session', `the rows of session ${s} are not next to each other in the saved texts; they are replayed in that order`);
}
for (const [g, rows] of groups) {
  if (rows.length < 2) note(rows[0].id, 'group', `group ${g} has one row`);
  if (rows.some(t => field(t, 'setup') !== field(rows[0], 'setup'))) fail(rows[0].id, 'group', `the rows of group ${g} do not share one setup`);
}

// ---- the annotated rows
const labelFiles = readDir(LABELS, 'labels'), labelById = new Map();
for (const { lines } of labelFiles) for (const line of lines) {
  const { row } = line;
  if (!row) continue;
  const id = row.id;
  if (typeof id !== 'string' || !id) { fail(String(id), 'labels', 'id is not a non-empty string'); continue; }
  if (labelById.has(id)) { fail(id, 'labels', 'id appears twice in the annotated rows'); continue; }
  labelById.set(id, row);
  line.id = id;
}
for (const id of labelById.keys()) if (!textById.has(id)) fail(id, 'identity', 'annotated row with no saved text');
const mismatched = new Set();
for (const t of texts) {
  const l = labelById.get(t.id);
  if (!l) { fail(t.id, 'identity', 'saved text with no annotated row'); continue; }
  for (const k of IDENTITY) if (field(t, k) !== field(l, k)) { mismatched.add(t.id); fail(t.id, 'identity', `${k} differs from the saved text: saved ${JSON.stringify(field(t, k))}, annotated ${JSON.stringify(field(l, k))}`); }
  if (field(t, 'domain') !== field(l, 'domain')) note(t.id, 'identity', 'domain differs from the saved text');
}

/** the spans and triggers of one annotated row, and the shape of its wires -> usable (false when the row cannot be converted) */
function checkWires(l) {
  const id = l.id;
  if (!Array.isArray(l.wires)) { fail(id, 'wires', 'wires is not a list ([] for no request)'); return false; }
  let ok = true, cursor = 0;
  const seen = new Set(), text = typeof l.text === 'string' ? l.text : '';
  l.wires.forEach((w, i) => {
    const at = `wire ${i + 1}`;
    if (!w || typeof w !== 'object' || Array.isArray(w)) { fail(id, 'wires', `${at} is not an object`); ok = false; return; }
    if (typeof w.span !== 'string' || !w.span) fail(id, 'span', `${at}: span is not a non-empty string`);
    else {
      const here = text.indexOf(w.span, cursor);
      if (here >= 0) cursor = here;
      else fail(id, 'span', text.includes(w.span) ? `${at}: span comes before the wire above it, not in the order stated: ${JSON.stringify(w.span)}` : `${at}: span is not a substring of the text: ${JSON.stringify(w.span)}`);
      if (seen.has(w.span)) note(id, 'span', `${at}: two wires share the span ${JSON.stringify(w.span)}`);
      seen.add(w.span);
    }
    if (typeof w.trigger !== 'string' || !w.trigger) fail(id, 'trigger', `${at}: trigger is not a non-empty string`);
    else if (typeof w.span === 'string' && !w.span.includes(w.trigger)) fail(id, 'trigger', `${at}: trigger ${JSON.stringify(w.trigger)} is not inside the span ${JSON.stringify(w.span)}`);
    if (!WIRE_TYPES.has(w.type)) { fail(id, 'wires', `${at}: type ${JSON.stringify(w.type)} is not command, question, fact or rule`); ok = false; }
    if (!w.args || typeof w.args !== 'object' || Array.isArray(w.args)) { fail(id, 'wires', `${at}: args is not an object`); ok = false; return; }
    for (const [k, v] of Object.entries(w.args)) {
      if (typeof v !== 'string' && typeof v !== 'number') { fail(id, 'wires', `${at}: ${k} is neither a string nor a number`); ok = false; continue; }
      const s = String(v);
      if (!REF_KEYS.has(k) && (s.includes('mention(') || /(^|,)\$new(,|$)/.test(s))) { fail(id, 'convert', `${at}: ${k} takes names only, not ${s}`); ok = false; }
    }
    if (w.args.action === 'resize' && w.args.scale == null && w.args.size == null && w.args.width == null && w.args.height == null && !has(w.args, 'kind') && /\b(shrink|smaller|tinier|reduce|less big)/i.test(w.span || '')) note(id, 'scale', `${at}: a resize that says smaller has no scale (the program gets 0.67 from goldProgram, the label does not)`);
  });
  // $new is the latest create or duplicate wire of this message
  let made = false;
  l.wires.forEach((w, i) => {
    if (!w || !w.args || typeof w.args !== 'object') return;
    for (const k of REF_KEYS) if (typeof w.args[k] === 'string' && /(^|,)\s*\$new\s*(,|$)/.test(w.args[k]) && !made) { fail(id, 'convert', `wire ${i + 1}: $new with no create or duplicate before it in this message`); ok = false; }
    if (w.type === 'command' && ['create', 'duplicate'].includes(w.args.action)) made = true;
  });
  return ok;
}

/** a copy of the wires whose mention values goldProgram can write: a value with a space or another character outside a plain word is quoted */
function quotable(id, wires) {
  let ok = true;
  const out = wires.map((w, i) => {
    const args = {};
    for (const [k, v] of Object.entries(w.args)) {
      args[k] = !REF_KEYS.has(k) || typeof v !== 'string' ? v : v.replace(/mention\(([^()]*)\)/g, (m, body) => {
        const kvs = body.split(',');
        if (!body.trim()) { fail(id, 'convert', `wire ${i + 1}: an empty mention`); ok = false; return m; }
        if (kvs.some(kv => kv.indexOf('=') < 1)) { fail(id, 'convert', `wire ${i + 1}: every part of ${m} must be key=value (a comma cannot stand inside a mention value)`); ok = false; return m; }
        const ks = kvs.map(kv => kv.slice(0, kv.indexOf('=')).trim());
        if (ks.some((x, j) => j && ks[j - 1] > x)) note(id, 'mention', `wire ${i + 1}: keys of ${m} are not in alphabetical order`);
        return 'mention(' + kvs.map(kv => { const e = kv.indexOf('='), val = kv.slice(e + 1).trim(); return kv.slice(0, e).trim() + '=' + (/^[\w.-]+$/.test(val) || val.startsWith('"') ? val : JSON.stringify(val)); }).join(',') + ')';
      });
    }
    return Object.assign({}, w, { args });
  });
  return ok ? out : null;
}

const describeNode = n => (n.id.startsWith('w') ? `wire ${n.id.slice(1)}` : `mention ${n.id}`);
/** one message's wires on a system: conversion, parse, legend issues, engine errors */
function playRow(S, l, usable, after) {
  const id = l.id, tag = after ? ` (after an earlier failure in this session)` : '';
  if (!usable) return false;
  const wires = quotable(id, l.wires);
  if (!wires) return false;
  let nodes;
  try { nodes = K.parse(goldProgram(wires)); } catch (e) { fail(id, 'convert', `the wires do not convert: ${e.message}`); return false; }
  if (!nodes.length) return true;
  const r = run(S, nodes);
  if (r.thrown) { fail(id, 'engine', `the engine threw: ${r.thrown}${tag}`); return false; }
  let ok = true;
  for (const st of r.steps) {
    for (const iss of st.issues || []) if (iss.level !== 'error') { fail(id, 'legend', `${describeNode(st.node)}: ${iss.msg}`); ok = false; }
    if (!st.error) continue;
    const msg = String(st.error.message || st.error);
    if (st.error instanceof K.Clarify) ask(id, 'clarify', `${describeNode(st.node)}: ${msg}${tag}`);
    else if (/^There is nothing to (undo|redo)/.test(msg)) ask(id, 'history', `${describeNode(st.node)}: ${msg}`);
    else { fail(id, 'engine', `${describeNode(st.node)}: ${msg}${tag}`); ok = false; }
  }
  return ok;
}

/** a system with the setup played; null when the setup is not clean. An empty canvas when there is no setup. */
function drawing(id, setup) {
  const S = K.createSystem();
  if (setup === undefined) return S;
  let nodes;
  try { nodes = K.parse(setup); } catch (e) { fail(id, 'setup', `does not parse: ${e.message}`); return null; }
  if (!nodes.length) { fail(id, 'setup', 'holds no wire'); return null; }
  const r = run(S, nodes);
  if (r.thrown) { fail(id, 'setup', `the engine threw: ${r.thrown}`); return null; }
  let ok = true;
  for (const st of r.steps) {
    for (const iss of st.issues || []) { fail(id, 'setup', `@${st.node.id}: ${iss.msg}`); ok = false; }
    if (st.error && !(st.issues || []).some(i => i.level === 'error')) { fail(id, 'setup', `@${st.node.id}: ${st.error.message || st.error}`); ok = false; }
    else if (st.skipped) ok = false;
  }
  if (!ok) return null;
  S.world.undoStack = []; S.world.redoStack = [];
  return S;
}

const before = S => ({ names: S.world.state.shapes.map(s => s.name), groups: Object.fromEntries((S.world.state.groups || []).map(g => [g.name, g.members.slice()])) });

// ---- replay
const computed = new Map();   // id -> {names, groups}: only rows whose drawing could be replayed
const usableOf = new Map();
for (const l of labelById.values()) if (textById.has(l.id)) usableOf.set(l.id, checkWires(l));
const played = new Set();
let notReplayed = 0;
const notWritable = [];   // replayed, but its identity differs or an earlier step of its session failed: its drawing is not one to save
function replayOne(t, S, after) {
  const l = labelById.get(t.id);
  if (!l) return null;
  // after a failed step of its session the drawing is only the best replay: still what a reader gets as names, but marked, and left out of measures by engine effect
  if (!mismatched.has(t.id)) computed.set(t.id, after ? Object.assign(before(S), { unreliable: true }) : before(S));
  if (mismatched.has(t.id) || after) notWritable.push(t.id);
  played.add(t.id);
  return playRow(S, l, usableOf.get(t.id), after);
}
for (const t of texts) {
  if (has(t, 'session')) continue;
  const S = typeof field(t, 'setup') === 'string' || !has(t, 'setup') ? drawing(t.id, field(t, 'setup')) : null;
  if (!S) { notReplayed++; continue; }
  replayOne(t, S, false);
}
for (const [s, rows] of sessions) {
  const first = rows[0].t, S = typeof field(first, 'setup') === 'string' || !has(first, 'setup') ? drawing(first.id, field(first, 'setup')) : null;
  if (!S) { notReplayed += rows.length; continue; }
  let after = false, gap = null;
  for (const { t } of rows) {
    if (gap) { fail(t.id, 'session', `not replayed: session ${s} has no annotated row for ${gap}`); notReplayed++; continue; }
    const ok = replayOne(t, S, after);
    if (ok === null) { gap = t.id; notReplayed++; continue; }
    if (!ok || mismatched.has(t.id)) after = true;
  }
}

for (const [id, c] of computed) {
  const l = labelById.get(id);
  if (!WRITE && (has(l, 'names') || has(l, 'groups')) && (JSON.stringify(l.names) !== JSON.stringify(c.names) || JSON.stringify(l.groups) !== JSON.stringify(c.groups))) note(id, 'names', 'names or groups differ from the replay (--write fills them)');
}

// ---- --write: names and groups, every other field and the order of the rows kept
let written = 0, filesWritten = 0;
if (WRITE) for (const { file, lines } of labelFiles) {
  let changed = false;
  const out = lines.map(line => {
    const c = line.id && computed.get(line.id);
    if (!c || labelById.get(line.id) !== line.row) return line.raw;
    const r = line.row;
    if (JSON.stringify(r.names) === JSON.stringify(c.names) && JSON.stringify(r.groups) === JSON.stringify(c.groups) && r.unreliable === c.unreliable) return line.raw;
    const o = {};
    if (has(r, 'names') && has(r, 'groups')) Object.assign(o, r, c);
    else {
      for (const [k, v] of Object.entries(r)) { if (k === 'names' || k === 'groups') continue; if (k === 'text') Object.assign(o, c); o[k] = v; }
      if (!has(o, 'names')) Object.assign(o, c);
    }
    if (!c.unreliable) delete o.unreliable;   // a flag from an earlier run must not outlive the replay that set it
    changed = true; written++;
    return JSON.stringify(o);
  });
  if (!changed) continue;
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, out.join('\n'));
  fs.renameSync(tmp, file);
  filesWritten++;
}

// ---- report
const list = (title, items) => { if (!items.length) return; console.log(`\n${title} (${items.length}):`); for (const x of items) console.log(`  ${x.id} [${x.what}] ${x.msg}`); };
list('HARD FAILURES', hard);
list('The engine asks (not a failure)', soft);
list('Warnings', warn);
const labelled = [...labelById.values()].filter(l => textById.has(l.id)), nWires = labelled.reduce((a, l) => a + (Array.isArray(l.wires) ? l.wires.length : 0), 0);
const byKind = {}; for (const t of texts) byKind[t.kind] = (byKind[t.kind] || 0) + 1;
const byWhat = {}; for (const x of hard) byWhat[x.what] = (byWhat[x.what] || 0) + 1;
console.log(`\nSummary: ${texts.length} saved texts in ${textFiles.length} file(s), ${labelById.size} annotated rows in ${labelFiles.length} file(s), ${nWires} wires, ${labelled.filter(l => Array.isArray(l.wires) && !l.wires.length).length} rows with no wire`);
console.log(`  sessions ${sessions.size}, paraphrase groups ${groups.size}, rows replayed ${played.size}, not replayed ${notReplayed}`);
console.log(`  by kind: ${JSON.stringify(byKind)}`);
console.log(`  hard failures ${hard.length} ${JSON.stringify(byWhat)}, the engine asks ${soft.length}, warnings ${warn.length}`);
if (WRITE)   console.log(`  --write: names and groups changed on ${written} row(s) in ${filesWritten} file(s); marked unreliable or left alone: ${notWritable.length + notReplayed}`);
const zero = !texts.length || !labelById.size;
if (zero) console.log('  nothing to validate: this is a failure, not a pass');
console.log(hard.length || zero ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(hard.length || zero ? 1 : 0);
