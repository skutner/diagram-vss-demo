// teachers_agree.mjs: how closely do Claude Opus 5.5 and gpt-6.1-sol agree on the built-in examples, by what the engine draws?
// Turn by turn: before each turn the GPT program is renamed onto the Opus drawing and played on a copy of it (undo stacks included), so an
// earlier difference is not counted again. "Own history" compares each teacher's own drawing after its own programs.
//   node training/neural/parity/teachers_agree.mjs [out.json]
import fs from 'node:fs';
import { K, examples, teachers, fresh, run, copyWorld, renameNodes, renamesBtoA, diffs, same, multisetEq, answers, errorsOf, cp, pct, roleOf, STRICT, POS40, LOOSE } from './parity_lib.mjs';

const T = await teachers(), rows = [], finals = {};
for (const ex of examples()) {
  let O = fresh(ex), G = fresh(ex), soFar = '';
  ex.turns.forEach((text, i) => {
    if (ex.kind === 'quick') { O = fresh(ex); G = fresh(ex); soFar = ''; }
    const o = T.opus(ex, i), g = T.gpt(ex, i);
    if (o.input !== text || g.input !== text) throw new Error('text mismatch ' + ex.example + '#' + (i + 1));
    const nO = K.parse(o.program || ''), gText = (g.nodes || []).map(K.serialize).join('\n'), nG = K.parse(gText);
    const tf = copyWorld(O), rTF = run(tf, renameNodes(cp(nG), renamesBtoA(O, G)).nodes), base = cp(O.world.state);
    const rO = run(O, nO), rG = run(G, nG);
    soFar += ' ' + text;
    const ansSame = multisetEq(answers(rO), answers(rTF)), turn = { base, text };
    const at = tol => same(diffs(O.world.state, tf.world.state, tol, turn)) && ansSame;
    const own = diffs(O.world.state, G.world.state, LOOSE, { text: soFar });
    rows.push({ id: `${ex.example}#${i + 1}`, example: ex.example, role: roleOf(ex.example), text, strict: at(STRICT), pos40: at(POS40), loose: at(LOOSE), own: same(own), diff: diffs(O.world.state, tf.world.state, LOOSE, turn), ansSame, statusO: o.status, statusG: g.status, po: o.program, pg: gText, errO: errorsOf(rO), errG: errorsOf(rTF) });
    if (ex.kind !== 'quick') finals[ex.example] = { own, kind: ex.kind };
  });
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(rows));
const n = f => rows.filter(f).length, N = rows.length;
console.log(`Opus 5.5 vs gpt-6.1-sol, ${N} turns, one turn at a time from the same drawing:`);
console.log(`  strict (exact positions and sizes): ${n(r => r.strict)} = ${pct(n(r => r.strict), N)}`);
console.log(`  positions within 40 px:             ${n(r => r.pos40)} = ${pct(n(r => r.pos40), N)}`);
console.log(`  loose (60 px, size ratio 1.30):     ${n(r => r.loose)} = ${pct(n(r => r.loose), N)}`);
const F = Object.values(finals), sameFinal = f => f.filter(x => same(x.own)).length;
console.log(`each on its own history, loose: ${n(r => r.own)} = ${pct(n(r => r.own), N)} of turns; final drawing the same in ${sameFinal(F)} of ${F.length} examples (scenes: ${sameFinal(F.filter(x => x.kind === 'scene'))} of ${F.filter(x => x.kind === 'scene').length})`);
for (const role of ['held_out', 'training_scene']) { const R = rows.filter(r => r.role === role); console.log(`  ${role}: ${R.length} turns, strict ${pct(R.filter(r => r.strict).length, R.length)}, loose ${pct(R.filter(r => r.loose).length, R.length)}`); }
