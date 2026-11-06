// shrink_check.mjs: on the example turns where a message says a shape should get smaller and the Opus program shrinks one, what do a reader's wires do, by what the engine draws?
// A resize with no scale grows the shape by 1.5 (docs/js/logic.js). The reader's wires come from the output of readers_vs_teachers.mjs; each is played on the Opus drawing before that turn.
//   node training/neural/parity/shrink_check.mjs name=out.jsonl ...
import fs from 'node:fs';
import { K, examples, teachers, fresh, run, copyWorld, errorsOf, cp } from './parity_lib.mjs';

const SMALL = /\b(shrink|smaller|tinier|reduce|less big|scale down|downsize)/i, T = await teachers(), turns = [];
const sizes = S => new Map(S.shapes.map(s => [s.name, Math.max(s.w ?? s.size, s.h ?? s.size)]));
const changes = (before, after) => { const b = sizes(before), a = sizes(after), up = [], down = []; for (const [n, v] of b) { const w = a.get(n); if (w == null) continue; if (w > v + .5) up.push(n); else if (w < v - .5) down.push(n); } return { up, down }; };
for (const ex of examples()) {
  let O = fresh(ex);
  ex.turns.forEach((text, i) => {
    if (ex.kind === 'quick') O = fresh(ex);
    const before = copyWorld(O), base = cp(O.world.state), o = T.opus(ex, i);
    run(O, K.parse(o.program || ''));
    const c = changes(base, O.world.state);
    if (SMALL.test(text) && c.down.length) turns.push({ id: o.id, text, before, base, down: c.down });
  });
}
for (const arg of process.argv.slice(2)) {
  const [name, f] = arg.split('='), rows = new Map(fs.readFileSync(f, 'utf8').trim().split('\n').map(l => { const r = JSON.parse(l); return [r.id, r]; }));
  const c = { right: 0, grew: 0, shrankOther: 0, none: 0 }, lines = [];
  for (const t of turns) {
    const r = rows.get(t.id), S = copyWorld(t.before), res = run(S, K.parse((r.wires || []).join('\n'))), ch = changes(t.base, S.world.state);
    const right = t.down.every(n => ch.down.includes(n)) && !ch.up.length && ch.down.length === t.down.length;
    const kind = right ? 'right' : ch.up.length ? 'grew' : ch.down.length ? 'shrankOther' : 'none';
    c[kind]++;
    lines.push(`   ${t.id} | ${t.text.slice(0, 44)} | ${(r.got || []).join(' ;; ').slice(0, 60)} | ${kind === 'right' ? 'shrinks what Opus shrinks' : kind === 'grew' ? 'grows ' + ch.up.slice(0, 3).join(',') : kind === 'shrankOther' ? 'shrinks others: ' + ch.down.slice(0, 3).join(',') : 'no size change: ' + (errorsOf(res)[0] || 'no wire').slice(0, 50)}`);
  }
  console.log(`${name}, ${turns.length} turns where Opus shrinks a shape: shrinks what Opus shrinks ${c.right}; grows a shape ${c.grew}; shrinks other shapes ${c.shrankOther}; changes no size ${c.none}`);
  console.log(lines.join('\n'));
}
