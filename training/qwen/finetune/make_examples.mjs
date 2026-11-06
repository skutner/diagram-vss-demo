// make_examples.mjs: annotated rows -> chat examples for fine-tuning the Qwen reader in the line format (format_oracle.mjs writeLines:
// `[trigger] type key=value ...`, one line per request; nothing when the message has no request).
//   node make_examples.mjs OUT.jsonl [--names-only] [--label-fixes FILE] [--acts ACT,ACT...] DIR_OR_FILE...
// --names-only: the user turn holds the names only, never the drawing (Q1, Q2: the encoders' input). --label-fixes FILE: L2's overlay
// (training/qwen/data/LABEL_FIXES_L2.jsonl, a copy of training/neural/parity/LABEL_FIXES_L2.jsonl: {id, wire, scale, why}) gives the
// scale of the resize wires it names, instead of the scale=0.67 shortcut below; a line that names a wire that is not a resize without a
// scale stops the run; lines for ids not in the inputs are counted. --acts: a wire whose act is not in the list is left out of its
// message (as training/neural/make_data.py rows_of does with neural.js's act set), and with it every wire whose span is not in the text
// (also as rows_of); both are counted. Without --acts a message with such a wire is left out whole (the earlier rule). A folder named
// nl_p* is read from its opus/ labels (as make_data.py label_files).
// The user turn holds what the reader would hold in the page: the drawing as SOP Lang (K.worldSOP of the row's setup, or for a session step
// the setup plus the gold of the earlier steps), or, for rows with no setup, the names on the canvas only; then the message. Rows of
// sessions are kept in file order. The input files are hashed into OUT.jsonl.manifest.json (a snapshot of folders still being written).
// The names: the row's names and its group names (sets.mjs contextNames, as the collectors). Rows with `unreliable: true`, a span that is not in the text, or lines that do not read back to the same wires are counted and left out
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
  const argv = process.argv.slice(2), flag = k => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
  const namesOnly = argv.includes('--names-only'); if (namesOnly) argv.splice(argv.indexOf('--names-only'), 1);
  const fixFile = flag('--label-fixes'), actList = flag('--acts'), ACTS = actList ? new Set(actList.split(',')) : null;
  const [out, ...inputs] = argv;
  const dirOf = p => /^nl_p[^/]*$/.test(p.replace(/\/+$/, '').split('/').pop()) ? resolve(p, 'opus') : p;
  // a folder's annotated files as make_data.py label_files: msg_*.jsonl and batch_*.jsonl, sorted; a folder with neither: every *.jsonl
  const labelFiles = p => { const fs = readdirSync(p).filter(f => f.endsWith('.jsonl')), mb = fs.filter(f => /^(msg|batch)_/.test(f)); return (mb.length ? mb : fs).sort().map(f => resolve(p, f)); };
  const files = inputs.flatMap(p0 => statSync(p0).isDirectory() ? labelFiles(dirOf(p0)) : [resolve(p0)]);
  const fixes = new Map(); let fixLines = 0;
  if (fixFile) for (const l of readFileSync(fixFile, 'utf8').split('\n').filter(Boolean)) { const f = JSON.parse(l); fixLines++; if (!fixes.has(f.id)) fixes.set(f.id, new Map()); fixes.get(f.id).set(f.wire, f.scale); }
  const fixUsed = new Set(), wireDrops = {};
  const rows = [], skipped = [], hashes = {}; let scaleAdded = 0, drawingFails = 0, Gerr = false, G0err = false, fixApplied = 0;
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
      const drawing = !namesOnly && !drawingFailed && sys && sys.world.state.shapes.length ? K.worldSOP(sys.world.state) : '';
      if (drawingFailed) drawingFails++;
      // a resize whose span says smaller and has no scale or size: the engine would grow the shape (no scale = x1.5). The scale the
      // teachers' engine replay adds (parity_lib goldProgram: 0.67) is written into the target, and counted (until L2's label fixes exist)
      let wires;
      if (fixFile) {
        const fx = fixes.get(r.id);
        wires = r.wires.map((w, i) => {
          if (!fx || !fx.has(i)) return w;
          if (!(w.type === 'command' && w.args && w.args.action === 'resize' && w.args.scale == null)) throw new Error(`label fix ${r.id} wire ${i}: not a resize without a scale`);
          fixUsed.add(r.id + '#' + i); fixApplied++; return { ...w, args: { ...w.args, scale: String(fx.get(i)) } };
        });
      } else wires = r.wires.map(w => w.args && w.args.action === 'resize' && w.args.scale == null && w.args.size == null && /\b(shrink|smaller|tinier|reduce|less big)/i.test(w.span || '') ? (scaleAdded++, { ...w, args: { ...w.args, scale: '0.67' } }) : w);
      if (ACTS) {
        const actOf = w => w.type === 'command' ? w.args.action : w.type === 'question' ? w.args.ask : w.type;
        wires = wires.filter(w => { const why = !w.span || !r.text.includes(w.span) ? 'span missing or not in text' : !ACTS.has(actOf(w)) ? 'act not in the list: ' + actOf(w) : null; if (why) wireDrops[why] = (wireDrops[why] || 0) + 1; return !why; });
      }
      const target = writeLines(wires), back = parseLines(target);
      const same = back.bad.length === 0 && back.wires.length === wires.length && back.wires.every((w, i) => w.type === wires[i].type && JSON.stringify(Object.entries(w.args).map(([k, v]) => [k, String(v)])) === JSON.stringify(Object.entries(wires[i].args).map(([k, v]) => [k, String(v)])));
      if (G) { const res = playGold(G.s, r.wires); if ((res.errors || []).length) Gerr = true; }
      if (r.unreliable) { skipped.push([r.id, 'unreliable']); continue; }
      if (wires.some(w => !r.text.includes(w.span) || (w.trigger && !w.span.includes(w.trigger)))) { skipped.push([r.id, 'span or trigger not in the text']); continue; }
      if (!same) { skipped.push([r.id, 'lines do not read back']); continue; }
      rows.push({ id: r.id, file: f, kind: r.kind || null, session: r.session ?? null, requests: wires.length, has_drawing: !!drawing, drawing_failed: drawingFailed, system: SYSTEM, user: userTurn(drawing, [...new Set([...(r.names || []), ...Object.keys(r.groups || {})])], r.text), target });
    }
  }
  writeFileSync(out, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  const m = { tool: 'training/qwen/finetune/make_examples.mjs', inputs: hashes, rows: rows.length, with_drawing: rows.filter(r => r.has_drawing).length, requests: rows.reduce((a, r) => a + r.requests, 0), implied_shrink_scale_added: scaleAdded, names_only: namesOnly, label_fixes: fixFile ? { file: resolve(fixFile), sha256: sha(readFileSync(fixFile)), lines: fixLines, applied: fixApplied, not_in_inputs: fixLines - fixUsed.size } : null, acts: actList ? [...ACTS] : null, wires_dropped: wireDrops, drawing_replay_failed_names_used: drawingFails, skipped, out_sha256: sha(readFileSync(out)) };
  writeFileSync(out + '.manifest.json', JSON.stringify(m, null, 1));
  console.log(JSON.stringify({ rows: m.rows, with_drawing: m.with_drawing, requests: m.requests, scale_added: scaleAdded, label_fixes: m.label_fixes, wires_dropped: wireDrops, drawing_failed: drawingFails, skipped: skipped.length, by_reason: skipped.reduce((a, [, w]) => (a[w] = (a[w] || 0) + 1, a), {}) }));
}
