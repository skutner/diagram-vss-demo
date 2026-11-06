// m4_measure.mjs: M4.0's measurements on a natural-language set (MODERNBERT_PARITY_PLAN.md M4; drawing_input_size.mjs did them on the examples).
//   node training/neural/parity/m4_measure.mjs OUT.json [SET, default nl_a]      (LAPTOP_PKG as readers.mjs; SOP-BERT reads every message)
// For each annotated request (the set's opus labels; gpt's as well, for the need):
//   - need: it needs the drawing, by nl_needs.py's word check (canvas_lib.mjs needsDrawing, the same rule);
//   - cap: the second read's input (the request, then the drawing's lines before the message, drawing-lines.js, newest first, whole lines within 512
//     ModernBERT word pieces): is every shape the request means (a name it does not write, the shapes the engine selects for a description it does not
//     write) in the lines read, cut off by the cap, or not on the drawing at all;
//   - trigger: would a second read fire on it. SOP-BERT stands in for a retrained ModernBERT's heads (as drawing_input_size.mjs): a name-role whose
//     fill:<key> reads context or description, or that holds a written name neither on the drawing nor made earlier in the message (as
//     docs/js/neural.js); also reported with drawing_input_size.mjs's "made anywhere in the message". Per message and per request (a request is
//     caught when a request SOP-BERT cut overlapping it fires).
// The drawing: the row's setup and its session replayed (canvas_lib.mjs drawingsOf; session steps after an unreliable one are kept and counted).
import fs from 'node:fs';
import { loadSet, contextNames } from './sets.mjs';
import { DL, REF_KEYS, drawingsOf, targetsOf, needsDrawing, pieceCounter } from './canvas_lib.mjs';
import { loadNeural } from './readers.mjs';
import { K } from './parity_lib.mjs';

const [out, setName = 'nl_a'] = process.argv.slice(2);
if (!out) throw new Error('usage: node m4_measure.mjs OUT.json [SET]');
const CAP = 512, set = loadSet(setName), counts = { left_out_unreliable: 0, engine_errors: 0 };
const entries = drawingsOf(set.items, 'rows', counts, { keepUnreliable: true });
if (entries.length !== set.items.length) throw new Error('a message has no drawing');
const { count } = await pieceCounter(), { neural, nextContext } = await loadNeural('sop');
const lc = s => String(s).toLowerCase();
const overlap = (a, b) => a[0] < b[1] && b[0] < a[1];
const rows = [], t0 = Date.now();
for (const [ix, e] of entries.entries()) {
  const it = e.row, names = contextNames(it), canvas = new Set(names.map(lc));
  const lines = DL.lines(e.state, e.sources), targets = targetsOf(e.system, e.state, it);
  const R = await neural.formalize(it.text, { names: names.slice(), last: [] }, { update: nextContext, signals: true });
  const madeAll = new Set(R.nodes.filter(n => n.args.action === 'create' && n.args.name != null).map(n => lc(n.args.name)));
  const fires = R.analyses.filter(a => a.span).map(a => {
    let byFill = false, byName = false, byNameAnywhere = false;
    for (const k of REF_KEYS) {
      const r = a.keys && a.keys[k]; if (!r) continue;
      if (r.fill === 'context' || r.fill === 'description') byFill = true;
      for (const v of [].concat(r.value ?? [])) if (!K.isRef(v) && typeof v === 'string' && !canvas.has(lc(v))) { byName = true; if (!madeAll.has(lc(v))) byNameAnywhere = true; }
    }
    return { span: a.span, byFill, byName, byNameAnywhere };
  });
  const msg = { id: it.id, kind: it.kind, part: it.part, drawing: e.kind, shapes: e.state.shapes.length, lines: lines.length, fire: fires.some(f => f.byFill || f.byName), fireFill: fires.some(f => f.byFill), fireAnywhere: fires.some(f => f.byFill || f.byNameAnywhere),
    needOpus: it.wires.some(w => needsDrawing(it.text, w.args)), needGpt: (it.altWires || []).some(w => needsDrawing(it.text, w.args)), wires: [] };
  it.wires.forEach((w, i) => {
    const at = it.text.indexOf(w.span), span = at < 0 ? [0, 0] : [at, at + w.span.length], mine = fires.filter(f => overlap(f.span, span));
    const fitted = DL.fit(w.span, lines, count, CAP), full = count(DL.layout(w.span, lines).text);
    const kept = new Set(fitted.heads.map(h => lc(h.name))), all = new Set(lines.flatMap(l => l.heads.map(h => lc(h.name))));
    const want = Object.values(targets[i]).flat().filter(t => t.kind === 'name' || t.kind === 'desc-drawing');
    const names = want.flatMap(t => t.names), unresolved = want.some(t => t.kind === 'desc-drawing' && !t.names.length);
    const where = !want.length ? 'nothing to find on the drawing' : unresolved ? 'a description the engine did not resolve' : names.every(n => kept.has(lc(n))) ? 'within the cap'
      : names.some(n => !all.has(lc(n))) ? 'not on the drawing' : 'cut off by the cap';
    msg.wires.push({ need: needsDrawing(it.text, w.args), where, pieces: full, kept: fitted.kept, total: fitted.total, fire: mine.some(f => f.byFill || f.byName), fireFill: mine.some(f => f.byFill), fireAnywhere: mine.some(f => f.byFill || f.byNameAnywhere), read: mine.length > 0 });
  });
  rows.push(msg);
  if ((ix + 1) % 100 === 0) console.error(`${ix + 1} of ${entries.length} messages, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const pct = (a, b) => `${a} of ${b} = ${(100 * a / Math.max(b, 1)).toFixed(1)}%`, q = (a, p) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(p * (a.length - 1))] : null);
const W = rows.flatMap(r => r.wires), need = W.filter(w => w.need), M = rows, needM = M.filter(m => m.needOpus);
const by = (list, key) => Object.entries(list.reduce((o, w) => ((o[w[key]] = (o[w[key]] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
const lines = [
  `${setName}: ${M.length} messages, ${W.length} requests (opus labels); drawing: ${by(M, 'drawing')}; session steps after an unreliable one (kept): ${counts.left_out_unreliable}; engine errors in setups and replays: ${counts.engine_errors}`,
  `need the drawing (nl_needs.py rule): requests ${pct(need.length, W.length)}; messages ${pct(needM.length, M.length)} (gpt labels: ${pct(M.filter(m => m.needGpt).length, M.length)})`,
  `input pieces (request + lines, before the cap), every request: p50 ${q(W.map(w => w.pieces), .5)}, p90 ${q(W.map(w => w.pieces), .9)}, max ${Math.max(...W.map(w => w.pieces))}; over ${CAP}: ${pct(W.filter(w => w.pieces > CAP).length, W.length)}`,
  `   requests that need the drawing: p50 ${q(need.map(w => w.pieces), .5)}, p90 ${q(need.map(w => w.pieces), .9)}, max ${Math.max(...need.map(w => w.pieces))}; over ${CAP}: ${pct(need.filter(w => w.pieces > CAP).length, need.length)}`,
  `the shapes a request needing the drawing means, under the cap of ${CAP}: ${by(need, 'where')}`,
  `   cut off by the cap: ${pct(need.filter(w => w.where === 'cut off by the cap').length, need.length)} (these requests would be held)`,
  `trigger, per request (SOP-BERT's heads; a request SOP-BERT cut overlapping it):`,
  `   fill says context or description: fires on ${pct(W.filter(w => w.fireFill).length, W.length)}; catches ${pct(need.filter(w => w.fireFill).length, need.length)} of those that need the drawing`,
  `   also a written name neither on the drawing nor made earlier in the message (neural.js): fires on ${pct(W.filter(w => w.fire).length, W.length)}; catches ${pct(need.filter(w => w.fire).length, need.length)}`,
  `   the same with "made anywhere in the message" (drawing_input_size.mjs): fires on ${pct(W.filter(w => w.fireAnywhere).length, W.length)}; catches ${pct(need.filter(w => w.fireAnywhere).length, need.length)}`,
  `   requests that need the drawing with no overlapping request in SOP-BERT's cut: ${need.filter(w => !w.read).length}`,
  `trigger, per message: fill only fires on ${pct(M.filter(m => m.fireFill).length, M.length)}, catches ${pct(needM.filter(m => m.fireFill).length, needM.length)}; with names (earlier) fires on ${pct(M.filter(m => m.fire).length, M.length)}, catches ${pct(needM.filter(m => m.fire).length, needM.length)}; (anywhere) fires on ${pct(M.filter(m => m.fireAnywhere).length, M.length)}, catches ${pct(needM.filter(m => m.fireAnywhere).length, needM.length)}`,
  `by kind, requests that need the drawing caught (earlier rule): ${Object.entries(need.reduce((o, w, i) => o, {})).length ? '' : ''}${[...new Set(M.map(m => m.kind))].map(k => { const ws = M.filter(m => m.kind === k).flatMap(m => m.wires).filter(w => w.need); return `${k} ${ws.filter(w => w.fire).length}/${ws.length}`; }).join(', ')}`,
];
console.log(lines.join('\n'));
fs.writeFileSync(out, JSON.stringify({ set: setName, cap: CAP, format: DL.FORMAT, summary: lines, counts, rows }, null, 0) + '\n');
