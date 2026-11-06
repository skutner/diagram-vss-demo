// drawing_input_size.mjs: for arm M4 (the drawing in the input). How long would the drawing be in ModernBERT word pieces, on the Opus drawing before each turn, and how
// often would a second call fire? SOP-BERT stands in for a retrained ModernBERT's fill heads, so the trigger numbers are a proxy.
//   LAPTOP_PKG=... node training/neural/parity/drawing_input_size.mjs FLAGS.json     (FLAGS.json from what_programs_need.mjs)
import fs from 'node:fs';
import { K, examples, teachers, fresh, run, touched } from './parity_lib.mjs';
import { loadNeural } from './readers.mjs';

const flags = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), T = await teachers();
const { neural, nextContext, TF } = await loadNeural('sop');
const mbTok = await TF.AutoTokenizer.from_pretrained('modernbert', { local_files_only: true });
const WORD_RE = /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu, cache = new Map();
const pieces = t => { let n = 2, first = true; for (const m of String(t).matchAll(WORD_RE)) { const w = (first ? '' : ' ') + m[0]; first = false; if (!cache.has(w)) cache.set(w, mbTok.encode(w, { add_special_tokens: false }).length); n += cache.get(w); } return n; };
const SIZES = { tiny: 30, small: 44, medium: 62, large: 88, huge: 118 }, sizeName = px => Object.entries(SIZES).reduce((b, [k, v]) => Math.abs(v - px) < Math.abs(SIZES[b] - px) ? k : b, 'medium');
/** the drawing as lines: shapes of one kind made by one message share a line. words: how many words of that message each line carries (0, a number, or Infinity) */
function lines(state, source, words) {
  const groups = new Map();
  for (const s of state.shapes) { const key = [s.shape, s.color, s.size, s.label ?? '', source.get(s.name.toLowerCase()) ?? ''].join('|'); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(s); }
  const out = [];
  for (const g of groups.values()) {
    const s = g[0], src = source.get(s.name.toLowerCase()), said = words && src ? ` | "${src.split(/\s+/).slice(0, words).join(' ')}"` : '';
    out.push(`${g.map(x => x.name).join(' ')}: ${sizeName(s.size || 62)} ${s.color || ''} ${s.shape}${s.label ? ` "${s.label}"` : ''}${said}`);
  }
  for (const e of state.edges) out.push(`${e.from} ${e.arrow === 'none' ? '-' : '->'} ${e.to}${e.style && e.style !== 'solid' ? ' ' + e.style : ''}${e.label ? ` "${e.label}"` : ''}`);
  for (const g of state.groups || []) out.push(`${g.name}: ${g.members.join(' ')}`);
  return out.join('\n');
}
const NAME_KEYS = ['target', 'from', 'to', 'anchor', 'anchor2', 'members', 'linked'], rows = [];
for (const ex of examples()) {
  if (ex.kind === 'quick') continue;
  let O = fresh(ex), last = [];
  const source = new Map();
  for (let i = 0; i < ex.turns.length; i++) {
    const text = ex.turns[i], o = T.opus(ex, i), S = O.world.state, canvas = new Set(S.shapes.map(s => s.name.toLowerCase()).concat((S.groups || []).map(g => g.name.toLowerCase())));
    const ctx = { names: S.shapes.map(s => s.name).concat((S.groups || []).map(x => x.name)), last: last.slice() };
    const R = await neural.formalize(text, ctx, { update: nextContext, signals: true });
    let byFill = false, byName = false;
    for (const a of R.analyses) for (const k of Object.values(a.keys || {})) if (k.fill === 'context' || k.fill === 'description') byFill = true;
    const made = new Set(R.nodes.filter(n => n.args.action === 'create' && n.args.name != null).map(n => String(n.args.name).toLowerCase()));
    for (const n of R.nodes) for (const k of NAME_KEYS) for (const v of [].concat(n.args[k] ?? [])) if (!K.isRef(v) && !canvas.has(String(v).toLowerCase()) && !made.has(String(v).toLowerCase())) byName = true;
    const f = flags[o.id];
    rows.push({ need: f.name || f.desc, byFill, byName, shapes: S.shapes.length, p0: pieces(text + ' ' + lines(S, source, 0)), p10: pieces(text + ' ' + lines(S, source, 10)), pAll: pieces(text + ' ' + lines(S, source, Infinity)) });
    const before = new Set(S.shapes.map(s => s.name.toLowerCase()));
    last = touched(O, run(O, K.parse(o.program || '')));
    for (const s of O.world.state.shapes) { const n = s.name.toLowerCase(); if (!before.has(n)) source.set(n, text); }
  }
}
const q = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(p * (a.length - 1))];
const stat = (name, R) => { console.log(name, `(${R.length} turns):`); for (const [k, lab] of [['p0', 'no words of the message that made them'], ['p10', 'its first 10 words'], ['pAll', 'all its words']]) { const a = R.map(r => r[k]); console.log(`  ${lab}: pieces p50 ${q(a, .5)}, p90 ${q(a, .9)}, max ${Math.max(...a)}; over 128: ${a.filter(x => x > 128).length}, over 256: ${a.filter(x => x > 256).length}, over 512: ${a.filter(x => x > 512).length}`); } };
stat('every scenario and scene turn', rows);
stat('turns that need the drawing', rows.filter(r => r.need));
const N = rows.length, need = rows.filter(r => r.need), pct = (a, b) => (100 * a / b).toFixed(1) + '%';
console.log(`second call when fill says context or description: ${rows.filter(r => r.byFill).length} of ${N} turns = ${pct(rows.filter(r => r.byFill).length, N)}; catches ${need.filter(r => r.byFill).length} of ${need.length} that need the drawing`);
console.log(`also when a written name is neither on the canvas nor made in the message: ${rows.filter(r => r.byFill || r.byName).length} of ${N} = ${pct(rows.filter(r => r.byFill || r.byName).length, N)}; catches ${need.filter(r => r.byFill || r.byName).length} of ${need.length}`);
console.log(`shapes on the canvas: p50 ${q(rows.map(r => r.shapes), .5)}, p90 ${q(rows.map(r => r.shapes), .9)}, max ${Math.max(...rows.map(r => r.shapes))}`);
