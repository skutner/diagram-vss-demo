// lib.mjs: the shared code of the saved SOP Lang translations of the built-in examples (docs/sop-translations/<model>/):
//  - inventory(): every input occurrence of the built-in examples, recomputed from the source (docs/js/examples.js QUICK, docs/js/scenarios.js
//    SCENARIOS with the scenes of docs/js/scenes-extra.js appended), in the menu's order;
//  - parseSopFile(): one .sop file -> its turns ("## turn N" blocks: the "# input:" line, the "#!" directives, the wires);
//  - the UI's own renamedForCanvas and trRenames (docs/js/ui.js), taken from its source, so the checks rename exactly as a played example
//    does: the effective names of the text (the gpt-6.1-sol tab's allocation, docs/js/saved-reader.js, over the reading tabs' drawings) and the
//    Claude Opus 5.5 tab's own clashes.
// Node only (the page reads manifest.json through docs/js/saved-sop.js).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(import.meta.url);
export const K = req(path.join(ROOT, 'docs/js/logic.js'));
export const StartDiagram = req(path.join(ROOT, 'docs/js/start-diagram.js'));

/** the QUICK examples of the + menu (docs/js/examples.js, which ui.js reads) */
export function quickExamples() {
  delete req.cache[req.resolve(path.join(ROOT, 'docs/js/examples.js'))];
  return req(path.join(ROOT, 'docs/js/examples.js')).QUICK.slice();
}
export const SavedReaderKit = req(path.join(ROOT, 'docs/js/saved-reader.js'));
const OPUS_STUB = { id: 'claude-opus-5-5' };
const uiFunction = name => { const src = fs.readFileSync(path.join(ROOT, 'docs/js/ui.js'), 'utf8'), m = src.match(new RegExp(`\\nfunction ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n`)); if (!m) throw new Error(`docs/js/ui.js: function ${name} not found`); return m[0]; };
/** ui.js's renamedForCanvas, bound to a list of worlds (the reading tabs' worlds: a name is taken when any of them has it) -> (turns, entry) */
export function renamedForCanvasOf(worlds) {
  const READERS = worlds.map(world => ({ id: 'reader', world }));
  return new Function('READERS', 'OPUS', 'SavedReaderKit', 'K', uiFunction('renamedForCanvas') + '\nreturn renamedForCanvas;')(READERS, OPUS_STUB, SavedReaderKit, K);
}
/** ui.js's renamedForCanvas over the given tabs [{id, world}] (READERS as the page has them) -> (turns, entry) */
export function renamedForCanvasWith(readers) {
  return new Function('READERS', 'OPUS', 'SavedReaderKit', 'K', uiFunction('renamedForCanvas') + '\nreturn renamedForCanvas;')(readers, OPUS_STUB, SavedReaderKit, K);
}
/** ui.js's trRenames, bound to the Claude Opus 5.5 tab's world -> (exampleKey, textMap, manifest) */
export function trRenamesOf(world) {
  const RD = { [OPUS_STUB.id]: { world } };
  return new Function('RD', 'OPUS', 'K', uiFunction('trRenames') + '\nreturn trRenames;')(RD, OPUS_STUB, K);
}
/** the gpt-6.1-sol tab's validated entries (docs/examples/gpt-6.1-sol, as the page loads them): their names decide the effective text */
export async function gptEntries() {
  const dir = path.join(ROOT, 'docs/examples/gpt-6.1-sol'), manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  delete req.cache[req.resolve(path.join(ROOT, 'docs/js/examples.js'))];
  const data = await SavedReaderKit.validate(manifest, req(path.join(ROOT, 'docs/js/examples.js')).catalog(), async f => fs.readFileSync(path.join(dir, f), 'utf8'), K);
  return data.entries;
}
/** the example id the page uses for the + menu's buttons and cards (docs/js/examples.js catalog): quick:<i>, scenario:<id>, scene:<id> */
export const pageExampleId = (ex, turnIndex) => ex.kind === 'quick' ? `quick:${turnIndex}` : `${ex.kind}:${ex.example}`;
/** every scenario and scene, from the source (a fresh require: scenarios.js appends the scenes to its array) */
export function scenarios() {
  for (const f of ['docs/js/scenarios.js', 'docs/js/scenes-extra.js']) delete req.cache[req.resolve(path.join(ROOT, f))];
  return req(path.join(ROOT, 'docs/js/scenarios.js'));
}
/** the examples: [{example, kind: quick | scenario | scene, title, file (relative to the model folder), turns: [text]}] */
export function examples() {
  const out = [{ example: 'quick', kind: 'quick', title: 'Send one sentence (quick examples)', file: 'quick.sop', turns: quickExamples() }];
  for (const s of scenarios()) out.push({ example: s.id, kind: s.kind === 'scene' ? 'scene' : 'scenario', title: s.title, file: `${s.kind === 'scene' ? 'scenes' : 'scenarios'}/${s.id}.sop`, turns: s.turns.slice(), names: s.names !== false });
  return out;
}
/** every input occurrence: [{id: "<example>#<turn>", example, kind, title, turn (1-based), input, file}] */
export function inventory() {
  return examples().flatMap(e => e.turns.map((t, i) => ({ id: `${e.example}#${i + 1}`, example: e.example, kind: e.kind, title: e.title, turn: i + 1, input: t, file: e.file })));
}

export const DIRECTIVES = ['noop', 'unsupported', 'approx', 'scope', 'resolved', 'direct', 'repair', 'note'];
/** one .sop file -> {header: [lines], turns: [{turn, input, line (1-based line of "## turn"), end (last line), directives: {key: [text]},
 *  wires: [line text], program (the wires, joined by \n), body (every line of the block after "# input:", as written)}], errors: [text]} */
export function parseSopFile(text) {
  const lines = text.split('\n'), turns = [], header = [], errors = [];
  let cur = null;
  lines.forEach((raw, i) => {
    const l = raw.replace(/\s+$/, ''), no = i + 1;
    const h = l.match(/^## turn (\d+)$/);
    if (h) { cur = { turn: +h[1], input: null, line: no, end: no, directives: {}, wires: [], body: [] }; turns.push(cur); return; }
    if (!cur) { header.push(l); if (l && !l.startsWith('#')) errors.push(`line ${no}: text before the first "## turn"`); return; }
    if (l === '') return;
    cur.end = no;
    if (cur.input === null) { if (raw.startsWith('# input: ')) { cur.input = raw.slice('# input: '.length); return; } errors.push(`line ${no}: turn ${cur.turn} must start with "# input: "`); cur.input = ''; }
    cur.body.push(l);
    const d = l.match(/^#! ([a-z]+): (.+)$/);
    if (d) { if (!DIRECTIVES.includes(d[1])) errors.push(`line ${no}: unknown directive "${d[1]}"`); (cur.directives[d[1]] || (cur.directives[d[1]] = [])).push(d[2]); return; }
    if (l.startsWith('#!')) { errors.push(`line ${no}: a directive is "#! <name>: <text>"`); return; }
    if (l.startsWith('#')) return;
    cur.wires.push(l.trim());
  });
  for (const t of turns) t.program = t.wires.join('\n');
  turns.forEach((t, i) => { if (t.turn !== i + 1) errors.push(`turn ${t.turn} at position ${i + 1}: the turns must be numbered 1, 2, 3 …`); });
  return { header, turns, errors };
}
/** a turn's status from its wires and directives */
export function statusOf(t) {
  if (t.directives.direct) return 'direct';
  if (t.wires.length) return t.directives.unsupported ? 'partly' : 'executable';
  if (t.directives.noop) return 'noop';
  if (t.directives.unsupported) return 'unsupported';
  return 'empty';   // not allowed: a turn with no wires says why
}
/** a fresh system with the opening drawing (as the page: every tab runs StartDiagram.SOP) */
export function openingSystem() { const s = K.createSystem(); s.engine.run(K.parse(StartDiagram.SOP)); s.world.undoStack = []; return s; }
/** what startScript does to a tab's world before a scenario: a new area (newFrame) when the drawing is not empty */
export function newArea(world, title) {
  if (world.state.shapes.length) { const before = world.snapshot(); world.newFrame(title); world.commit(before); }
  else { world.state.frame = { x: 0, y: 0 }; world.state.frames = [{ x: 0, y: 0, title }]; }
}
/** the renames a played example gets in the page, before its new area: {text: the effective names every reading tab reads (renamedForCanvas
 *  with the gpt-6.1-sol entry), map: the Claude Opus 5.5 tab's renames (trRenames: the text's, plus its own clashes)}. world: the drawing
 *  (one world stands for every tab), entries: gptEntries(), M: this folder's manifest (or null) */
export function pageRenames(world, ex, entries, M, quickTurn) {
  const id = pageExampleId(ex, 0), entry = entries ? entries.get(id) : null;
  const fixed = renamedForCanvasOf([world])(ex.turns, entry || undefined);
  return { text: fixed.map, turns: fixed.turns, map: trRenamesOf(world)(ex.example, fixed.map, M, quickTurn) };
}
