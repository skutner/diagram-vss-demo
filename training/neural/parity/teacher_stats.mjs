// teacher_stats.mjs: the counts the plan cites about the two teachers' programs that no other script prints.
//   node training/neural/parity/teacher_stats.mjs
import { K, examples, teachers, fresh, run, touched, wordsOf, opusManifest } from './parity_lib.mjs';

const T = await teachers(), NAME_KEYS = ['target', 'from', 'to', 'anchor', 'anchor2', 'members', 'linked'];
const c = { turns: 0, gptInvented: 0, opusInvented: 0, gptMoreWires: 0, gptRepaired: 0, notWritten: 0, lastAll: 0, lastAny: 0 }, digits = {}, scales = {};
for (const ex of examples()) {
  let O = fresh(ex), last = [];
  ex.turns.forEach((text, i) => {
    if (ex.kind === 'quick') { O = fresh(ex); last = []; }
    const o = T.opus(ex, i), g = T.gpt(ex, i), W = wordsOf(text);
    const nO = K.parse(o.program || ''), mO = nO.filter(n => n.type !== 'mention'), mG = (g.nodes || []).filter(n => n.type !== 'mention');
    const invented = m => m.some(n => n.args.action === 'create' && n.args.name != null && !W.has(String(n.args.name).toLowerCase()));
    c.turns++;
    if (invented(mG)) c.gptInvented++;
    if (invented(mO)) c.opusInvented++;
    if (mG.length > mO.length) c.gptMoreWires++;
    if ((g.repairs || []).length) c.gptRepaired++;
    const unwritten = [];
    for (const n of mO) for (const k of NAME_KEYS) for (const v of [].concat(n.args[k] ?? [])) if (!K.isRef(v) && ![...wordsOf(v)].every(x => W.has(x))) unwritten.push(String(v).toLowerCase());
    if (unwritten.length) {
      const L = new Set(last.map(x => x.toLowerCase()));
      c.notWritten++;
      if (unwritten.every(x => L.has(x))) c.lastAll++;
      if (unwritten.some(x => L.has(x))) c.lastAny++;
    }
    for (const n of mO) for (const k of ['count', 'distance', 'scale', 'width', 'height']) if (n.args[k] != null && !W.has(String(n.args[k]))) {
      digits[k] = (digits[k] || 0) + 1;
      if (k === 'scale') scales[n.args[k]] = (scales[n.args[k]] || 0) + 1;
    }
    last = touched(O, run(O, nO));
  });
}
console.log(`turns ${c.turns}`);
console.log(`a created shape named with a word the message does not hold: gpt-6.1-sol ${c.gptInvented} turns, Opus 5.5 ${c.opusInvented} turns`);
console.log(`more non-mention wires than Opus: gpt-6.1-sol ${c.gptMoreWires} turns; repair records on gpt-6.1-sol turns: ${c.gptRepaired}; Opus changed after its first pass: ${opusManifest().coverage.repaired}`);
console.log(`Opus turns with a name the message does not write: ${c.notWritten}; the names the previous turn touched (ctx.last) hold all of them on ${c.lastAll}, at least one on ${c.lastAny}`);
console.log('Opus values not written in digits in the message:', JSON.stringify(digits), 'scale values:', JSON.stringify(scales));
