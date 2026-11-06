// make_examples.mjs: annotated rows -> chat examples for fine-tuning the Qwen reader in the line format (format_oracle.mjs writeLines:
// `[trigger] type key=value ...`, one line per request; nothing when the message has no request).
//   node make_examples.mjs OUT.jsonl DIR_OR_FILE...
// The user turn holds what the reader would hold in the page: the drawing as SOP Lang (K.worldSOP of the row's setup, or for a session step
// the setup plus the gold of the earlier steps), or, for rows with no setup, the names on the canvas only; then the message. Rows of
// sessions are kept in file order. The input files are hashed into OUT.jsonl.manifest.json (a snapshot of folders still being written).
// Rows with `unreliable: true`, a span that is not in the text, or lines that do not read back to the same wires are counted and left out
// (never silently: the manifest lists them).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { K } from '../../neural/parity/parity_lib.mjs';
import { startSystem, playGold } from '../../neural/parity/arm_lib.mjs';
import { writeLines, parseLines } from './lines_format.mjs';

export const SYSTEM = 'Write the diagram editor requests in this message, one per line.';
export function userTurn(drawing, names, text) {
  const d = drawing ? 'Drawing:\n' + drawing : names && names.length ? 'Names on the canvas: ' + names.join(', ') : 'Drawing: empty';
  return d + '\n\nMessage:\n' + text;
}
const sha = b => createHash('sha256').update(b).digest('hex');

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const [out, ...inputs] = process.argv.slice(2);
  const files = inputs.flatMap(p => statSync(p).isDirectory() ? readdirSync(p).filter(f => f.endsWith('.jsonl')).sort().map(f => resolve(p, f)) : [resolve(p)]);
  const rows = [], skipped = [], hashes = {}; let scaleAdded = 0, drawingFails = 0, Gerr = false, G0err = false;
  for (const f of files) {
    const buf = readFileSync(f); hashes[f] = sha(buf);
    let session = null, G = null;
    for (const l of buf.toString('utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(l);
      if (!Array.isArray(r.wires)) { skipped.push([r.id, 'no wires']); continue; }
      if (r.session != null) { if (r.session !== session) { session = r.session; const g = startSystem(r.setup); G = g; Gerr = g.errors.length > 0; } } else { session = null; G = null; }
      const st = G ? null : r.setup ? startSystem(r.setup) : null, sys = G ? G.s : st ? st.s : null;
      if (st && st.errors.length) G0err = true; else if (!G) G0err = false;
      const drawingFailed = G ? Gerr : G0err;
      const drawing = !drawingFailed && sys && sys.world.state.shapes.length ? K.worldSOP(sys.world.state) : '';
      if (drawingFailed) drawingFails++;
      // a resize whose span says smaller and has no scale or size: the engine would grow the shape (no scale = x1.5). The scale the
      // teachers' engine replay adds (parity_lib goldProgram: 0.67) is written into the target, and counted (until L2's label fixes exist)
      const wires = r.wires.map(w => w.args && w.args.action === 'resize' && w.args.scale == null && w.args.size == null && /\b(shrink|smaller|tinier|reduce|less big)/i.test(w.span || '') ? (scaleAdded++, { ...w, args: { ...w.args, scale: '0.67' } }) : w);
      const target = writeLines(wires), back = parseLines(target);
      const same = back.bad.length === 0 && back.wires.length === wires.length && back.wires.every((w, i) => w.type === wires[i].type && JSON.stringify(Object.entries(w.args).map(([k, v]) => [k, String(v)])) === JSON.stringify(Object.entries(wires[i].args).map(([k, v]) => [k, String(v)])));
      if (G) { const res = playGold(G.s, r.wires); if ((res.errors || []).length) Gerr = true; }
      if (r.unreliable) { skipped.push([r.id, 'unreliable']); continue; }
      if (r.wires.some(w => !r.text.includes(w.span) || (w.trigger && !w.span.includes(w.trigger)))) { skipped.push([r.id, 'span or trigger not in the text']); continue; }
      if (!same) { skipped.push([r.id, 'lines do not read back']); continue; }
      rows.push({ id: r.id, file: f, kind: r.kind || null, session: r.session ?? null, requests: r.wires.length, has_drawing: !!drawing, drawing_failed: drawingFailed, system: SYSTEM, user: userTurn(drawing, r.names, r.text), target });
    }
  }
  writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  const m = { tool: 'training/qwen/finetune/make_examples.mjs', inputs: hashes, rows: rows.length, with_drawing: rows.filter(r => r.has_drawing).length, requests: rows.reduce((a, r) => a + r.requests, 0), implied_shrink_scale_added: scaleAdded, drawing_replay_failed_names_used: drawingFails, skipped, out_sha256: sha(readFileSync(out)) };
  writeFileSync(out + '.manifest.json', JSON.stringify(m, null, 1));
  console.log(JSON.stringify({ rows: m.rows, with_drawing: m.with_drawing, requests: m.requests, scale_added: scaleAdded, drawing_failed: drawingFails, skipped: skipped.length, by_reason: skipped.reduce((a, [, w]) => (a[w] = (a[w] || 0) + 1, a), {}) }));
}
