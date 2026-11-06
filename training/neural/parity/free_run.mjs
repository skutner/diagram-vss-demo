// free_run.mjs: what the owner sees. Each reader plays every example on its own drawing, one mistake carrying into the next turn, against each teacher's own history.
//   node training/neural/parity/free_run.mjs teachers|nothing|rules|sop|modernbert [out.json]
//   GATE=cost: execute only what the reader's own confidence lets through.
// Right = the same drawing as Opus or GPT (loose; written names count). "Final shapes, arrows, groups" = per example, the share of each kind in the teacher's final drawing that is also in the
// reader's, with nothing different (extras count against), for the teacher the reader is closer to, averaged over the scenes that have any of that kind.
import fs from 'node:fs';
import { K, examples, teachers, fresh, run, diffs, same, finalShares, meanShares, touched, cp, pct, LOOSE } from './parity_lib.mjs';
import { makeRead } from './readers.mjs';

const [name, out] = process.argv.slice(2), Tc = await teachers(), isTeachers = name === 'teachers';
const read = isTeachers ? null : await makeRead(name, { gate: process.env.GATE || null });
const rows = [], finals = {};
const sum = s => ['shapes', 'arrows', 'groups'].reduce((a, k) => a + (s[k].total ? s[k].same / s[k].total : 0), 0);
for (const ex of examples()) {
  let O = fresh(ex), G = fresh(ex), S = fresh(ex), last = [], soFar = '';
  for (let i = 0; i < ex.turns.length; i++) {
    if (ex.kind === 'quick') { O = fresh(ex); G = fresh(ex); S = fresh(ex); last = []; soFar = ''; }
    const text = ex.turns[i], o = Tc.opus(ex, i), g = Tc.gpt(ex, i), gText = (g.nodes || []).map(K.serialize).join('\n');
    soFar += ' ' + text;
    run(O, K.parse(o.program || ''));
    run(G, K.parse(gText));
    if (!isTeachers) {
      const ctx = { names: S.world.state.shapes.map(s => s.name).concat((S.world.state.groups || []).map(x => x.name)), last: last.slice() };
      let r; try { r = await read(text, ctx, S.world); } catch { r = { nodes: [] }; }
      last = touched(S, run(S, cp(r.nodes || [])));
    }
    const R = isTeachers ? G : S;
    const asO = same(diffs(O.world.state, R.world.state, LOOSE, { text: soFar })), asG = isTeachers ? asO : same(diffs(G.world.state, S.world.state, LOOSE, { text: soFar }));
    rows.push({ id: `${ex.example}#${i + 1}`, kind: ex.kind, right: asO || asG });
    if (ex.kind !== 'quick') {
      const a = finalShares(O.world.state, R.world.state, LOOSE), b = isTeachers ? a : finalShares(G.world.state, S.world.state, LOOSE);
      finals[ex.example] = { kind: ex.kind, same: asO || asG, shares: sum(a) >= sum(b) ? a : b };
    }
  }
}
if (out) fs.writeFileSync(out, JSON.stringify({ rows, finals }));
const all = Object.values(finals), scene = all.filter(f => f.kind === 'scene'), sr = rows.filter(r => r.kind === 'scene'), m = meanShares(scene.map(f => f.shares)), p = x => x == null ? '-' : x.toFixed(1) + '%';
console.log(`${name}${process.env.GATE ? ' at gate ' + process.env.GATE : ''}, each on its own drawing, loose: same drawing as a teacher on ${rows.filter(r => r.right).length} of ${rows.length} turns = ${pct(rows.filter(r => r.right).length, rows.length)}; final drawing the same in ${all.filter(f => f.same).length} of ${all.length} examples`);
console.log(`  the 24 scenes: same drawing on ${pct(sr.filter(r => r.right).length, sr.length)} of ${sr.length} turns; final drawing the same in ${scene.filter(f => f.same).length} of ${scene.length}; in the final drawing the same, mean over the scenes: shapes ${p(m.shapes)}, arrows ${p(m.arrows)}, groups ${p(m.groups)}`);
