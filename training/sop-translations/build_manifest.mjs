// build_manifest.mjs: builds docs/sop-translations/<model>/manifest.json from the readable .sop files of that folder, its generation.json
// and the frozen first pass (first-pass/), and checks them against the examples in the page's source. One entry per input occurrence of the
// built-in examples (lib.mjs inventory: QUICK, the scenarios, the scenes), in the menu's order.
//   node training/sop-translations/build_manifest.mjs [model]            writes manifest.json, prints the coverage and every problem
//   node training/sop-translations/build_manifest.mjs [model] --check    writes nothing; exit 1 when manifest.json is not what it would build
//   node training/sop-translations/build_manifest.mjs [model] --dry      writes nothing; the checks and the coverage only
// Problems (exit 1): a turn missing or extra, an "# input:" line that is not the example's text, a wire SOP Lang cannot parse, a turn with no
// wires and no reason, a turn changed since its first pass without a "#! repair:" line (or a repair line on an unchanged turn), an unknown
// directive. A missing file is reported as missing coverage (exit 1 too).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, K, examples, parseSopFile, statusOf } from './lib.mjs';

const args = process.argv.slice(2), check = args.includes('--check'), dry = args.includes('--dry'), model = args.find(a => !a.startsWith('--')) || 'claude-opus-5-5';
const DIR = path.join(ROOT, 'docs/sop-translations', model), rel = p => path.relative(ROOT, p);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const gen = JSON.parse(fs.readFileSync(path.join(DIR, 'generation.json'), 'utf8'));
const problems = [], entries = [], perExample = [];
const authorOf = file => gen.authors[file] || gen.authors[file.replace(/[^/]+$/, '')] || null;

function build() {
  for (const ex of examples()) {
    const f = path.join(DIR, ex.file), ff = path.join(DIR, 'first-pass', ex.file);
    if (!fs.existsSync(f)) { problems.push(`${ex.example}: ${rel(f)} is missing (${ex.turns.length} turns not translated)`); perExample.push({ example: ex.example, kind: ex.kind, title: ex.title, file: ex.file, turns: ex.turns.length, translated: 0 }); continue; }
    const P = parseSopFile(fs.readFileSync(f, 'utf8'));
    for (const e of P.errors) problems.push(`${ex.file}: ${e}`);
    const F = fs.existsSync(ff) ? parseSopFile(fs.readFileSync(ff, 'utf8')) : null;
    if (!F) problems.push(`${ex.file}: no frozen first pass (${rel(ff)}); run freeze_first_pass.mjs before validating`);
    if (!authorOf(ex.file)) problems.push(`${ex.file}: generation.json names no author for it`);
    if (P.turns.length !== ex.turns.length) problems.push(`${ex.file}: ${P.turns.length} turns, the example has ${ex.turns.length}`);
    perExample.push({ example: ex.example, kind: ex.kind, title: ex.title, file: ex.file, turns: ex.turns.length, translated: Math.min(P.turns.length, ex.turns.length) });
    ex.turns.forEach((input, i) => {
      const t = P.turns[i], id = `${ex.example}#${i + 1}`;
      if (!t) return;
      if (t.input !== input) problems.push(`${id}: "# input:" is not the example's text\n    source: ${JSON.stringify(input)}\n    file:   ${JSON.stringify(t.input)}`);
      let wires = 0;
      try { wires = K.parse(t.program).length; } catch (e) { problems.push(`${id}: SOP Lang does not parse: ${e.message}`); }
      const status = statusOf(t);
      if (status === 'empty') problems.push(`${id}: no wires and no "#! noop:" or "#! unsupported:" reason`);
      if (t.directives.noop && t.wires.length) problems.push(`${id}: "#! noop:" with wires`);
      if (t.directives.direct && (ex.kind !== 'quick' || t.program !== input)) problems.push(`${id}: "#! direct:" only for an example that is already SOP Lang, played as written`);
      const f0 = F && F.turns[i], first = f0 ? f0.program : null, firstBody = f0 ? f0.body.filter(l => !l.startsWith('#! repair:')).join('\n') : null;
      const bodyNow = t.body.filter(l => !l.startsWith('#! repair:')).join('\n');
      const changed = f0 ? (first !== t.program || firstBody !== bodyNow) : false, repairs = t.directives.repair || [];
      if (F && !f0) problems.push(`${id}: not in the frozen first pass`);
      if (changed && !repairs.length) problems.push(`${id}: changed since the first pass without a "#! repair:" line`);
      if (!changed && repairs.length) problems.push(`${id}: a "#! repair:" line, but the turn is as in the first pass`);
      if (f0 && f0.input !== t.input) problems.push(`${id}: the "# input:" line changed since the first pass`);
      const notes = {}; for (const k of ['noop', 'unsupported', 'approx', 'scope', 'resolved', 'direct', 'note']) if (t.directives[k]) notes[k] = t.directives[k];
      entries.push({ id, example: ex.example, kind: ex.kind, turn: i + 1, input, file: ex.file, lines: [t.line, t.end], status, wires, program: t.program, notes,
        repaired: changed, repairs, firstPass: changed ? { program: first, lines: [f0.line, f0.end] } : null,
        generated: status === 'direct' ? null : gen.generated, author: status === 'direct' ? null : authorOf(ex.file), source_revision: gen.source_revision });
    });
  }
  const inv = examples(), count = k => inv.filter(e => e.kind === k), turns = k => count(k).reduce((a, e) => a + e.turns.length, 0);
  const total = inv.reduce((a, e) => a + e.turns.length, 0), by = s => entries.filter(e => e.status === s).length;
  const ui = fs.readFileSync(path.join(ROOT, 'docs/js/ui.js'), 'utf8'), sc = fs.readFileSync(path.join(ROOT, 'docs/js/scenarios.js'), 'utf8'), se = fs.readFileSync(path.join(ROOT, 'docs/js/scenes-extra.js'), 'utf8');
  return {
    format: 'sop-translations/1',
    about: 'Saved SOP Lang translations of the built-in examples, played by the page\'s tab of the generation model (docs/js/saved-sop.js). Built by training/sop-translations/build_manifest.mjs from the .sop files of this folder; do not edit by hand. README.md: how they were generated, how they are played, their limits.',
    model: Object.assign({}, gen.model), generated: gen.generated, method: gen.method, authors: gen.authors,
    source: { revision: gen.source_revision, files: ['docs/js/ui.js QUICK at the source revision (since moved, unchanged, to docs/js/examples.js)', 'docs/js/scenarios.js', 'docs/js/scenes-extra.js'],
      text_sha256: sha(JSON.stringify(inv.map(e => [e.example, e.turns]))) },
    inventory: { quick: turns('quick'), scenarios: count('scenario').length, scenario_turns: turns('scenario'), scenes: count('scene').length, scene_turns: turns('scene'), occurrences: total },
    coverage: { entries: entries.length, executable: by('executable'), partly: by('partly'), noop: by('noop'), unsupported: by('unsupported'), direct: by('direct'), repaired: entries.filter(e => e.repaired).length },
    examples: perExample,
    entries
  };
}

const M = build(), out = JSON.stringify(M, null, 1) + '\n', target = path.join(DIR, 'manifest.json');
const C = M.coverage, I = M.inventory;
console.log(`inventory: ${I.quick} quick examples, ${I.scenarios} scenarios (${I.scenario_turns} messages), ${I.scenes} scenes (${I.scene_turns} messages): ${I.occurrences} input occurrences`);
console.log(`translated: ${C.entries} of ${I.occurrences} — executable ${C.executable}, partly ${C.partly}, no-op ${C.noop}, unsupported ${C.unsupported}, already SOP Lang ${C.direct}; repaired since the first pass ${C.repaired}`);
for (const p of problems) console.log('PROBLEM ' + p);
if (check) {
  const now = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (now !== out) { console.log(`PROBLEM ${rel(target)} is not what build_manifest.mjs builds from the .sop files (run it without --check)`); process.exitCode = 1; }
  else console.log(`${rel(target)} is up to date`);
} else if (dry) console.log('dry run: nothing written'); else { fs.writeFileSync(target, out); console.log(`wrote ${rel(target)} (${(out.length / 1024).toFixed(0)} KB)`); }
if (problems.length) process.exitCode = 1;
