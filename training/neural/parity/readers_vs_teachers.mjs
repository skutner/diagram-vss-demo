// readers_vs_teachers.mjs: a reader on all 1,139 turns of the built-in examples, against the saved translations, by what the engine draws.
// Before each turn the canvas is the Opus drawing so far, so a reader's mistake is counted once. Every request the reader writes is executed: this
// is the capability against either teacher, NOT the project's main metric (right / wrong / not done / extras at a calibrated threshold).
//   node training/neural/parity/readers_vs_teachers.mjs nothing|rules|sop|modernbert out.jsonl
// "nothing" writes no wire at all: the floor of this measure, printed beside every number. Env: readers.mjs.
import fs from 'node:fs';
import { K, examples, teachers, fresh, run, copyWorld, renameNodes, renamesBtoA, diffs, same, multisetEq, answers, errorsOf, touched, cp, pct, roleOf, STRICT, LOOSE } from './parity_lib.mjs';
import { makeRead } from './readers.mjs';

const [readerName, outPath] = process.argv.slice(2);
if (!readerName || !outPath) throw new Error('usage: readers_vs_teachers.mjs nothing|rules|sop|modernbert out.jsonl');
const T0 = Date.now();
const read = await makeRead(readerName);

const Tc = await teachers();
fs.writeFileSync(outPath, '');
let done = 0;
for (const ex of examples()) {
  let O = fresh(ex), G = fresh(ex), last = [];
  for (let i = 0; i < ex.turns.length; i++) {
    const text = ex.turns[i];
    if (ex.kind === 'quick') { O = fresh(ex); G = fresh(ex); last = []; }
    const o = Tc.opus(ex, i), g = Tc.gpt(ex, i), gText = (g.nodes || []).map(K.serialize).join('\n');
    const ctx = { names: O.world.state.shapes.map(s => s.name).concat((O.world.state.groups || []).map(x => x.name)), last: last.slice() };
    let r, err = null;
    try { r = await read(text, ctx, O.world); } catch (e) { r = { nodes: [] }; err = String(e.message || e); }
    const S = copyWorld(O), rR = run(S, cp(r.nodes || []));
    const SG = copyWorld(O), rGtf = run(SG, renameNodes(K.parse(gText), renamesBtoA(O, G)).nodes), turn = { base: cp(O.world.state), text };
    const rO = run(O, K.parse(o.program || '')); run(G, K.parse(gText));
    last = touched(O, rO);
    const asO = tol => same(diffs(O.world.state, S.world.state, tol, turn)) && multisetEq(answers(rO), answers(rR));
    const asG = tol => same(diffs(SG.world.state, S.world.state, tol, turn)) && multisetEq(answers(rGtf), answers(rR));
    const mains = (r.nodes || []).filter(n => n.type !== 'mention');
    fs.appendFileSync(outPath, JSON.stringify({ id: `${ex.example}#${i + 1}`, example: ex.example, role: roleOf(ex.example), text, po: o.program, got: mains.map(n => K.serialize(n)), wires: (r.nodes || []).map(n => K.serialize(n)), n: mains.length, err,
      looseO: asO(LOOSE), looseG: asG(LOOSE), strictO: asO(STRICT), strictG: asG(STRICT), diffO: diffs(O.world.state, S.world.state, LOOSE, turn), errs: errorsOf(rR).map(e => e.slice(0, 90)) }) + '\n');
    if (++done % 200 === 0) console.error(done, Math.round((Date.now() - T0) / 1000) + ' s');
  }
}
const rows = fs.readFileSync(outPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const line = (name, R) => `${name}: ${R.length} turns; same as Opus or GPT: loose ${R.filter(x => x.looseO || x.looseG).length} = ${pct(R.filter(x => x.looseO || x.looseG).length, R.length)}, strict ${R.filter(x => x.strictO || x.strictG).length} = ${pct(R.filter(x => x.strictO || x.strictG).length, R.length)}; same as Opus: loose ${pct(R.filter(x => x.looseO).length, R.length)}`;
console.log(`reader ${readerName}, every request executed, teacher's drawing before each turn, ${Math.round((Date.now() - T0) / 1000)} s`);
console.log(line('all', rows));
console.log(line('held_out', rows.filter(x => x.role === 'held_out')));
console.log(line('training_scene', rows.filter(x => x.role === 'training_scene')));
