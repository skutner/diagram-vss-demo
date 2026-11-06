/*DRAWING-LINES-START*/
/* drawing-lines.js: the drawing as compact lines, for the second read of a learned reader (training/neural/MODERNBERT_PARITY_PLAN.md, arm M4).
   A mechanical step (training/sketch/VSS_READER_SPEC.md section 2): it writes what the engine state holds, in the legend's own value words
   (shape kinds, colour names, size words); it maps no word of a message to the legend. One file for the data builder
   (training/neural/parity/build_canvas_rows.mjs), the measurements, the reader (docs/js/neural.js) and the page (docs/js/ui.js): a classic
   script that defines the global DrawingLines in the browser and module.exports in Node, with no dependency, so both give the same text.

   The input of the second read is   <request> ||  <line> ;  <line> ;  ...   (FORMAT; a newline is no word piece, so the "||" and ";"
   delimiters are what the model sees between the request and the drawing and between two lines):
     shapes   the names that share one source message, kind, colour, size and label, then what they are and the first QUOTE_WORDS words of the
              message that made them:  star1 star2 star3: tiny white star | "eight tiny white stars for the snow, small ones"
              newest first (the newest shape of a line decides its place); names inside a line oldest first. A shape with a width or a height
              writes WxH instead of a size word. Shapes the session did not make (a setup, the drawing before the page kept sources) have no quote.
              A drawing known by its names only (training rows that give `names` alone) is one line of names, in the order given.
     arrows   from -> to (- no arrow head, <-> both), its style when not solid, its colour, its label; newest first
     groups   group Name: member member ...; newest first
   The cap (fit) keeps whole lines, newest first, while the input stays within the reader's limit of word pieces; the piece counter is given
   by the caller (the reader's tokenizer), so this file needs none. The heads of a line (the names a shape line starts with, the name of a
   group) are the words the reader's B / I / O tags may land on; layout() gives their character offsets in the input. */
const DrawingLines = (function () {
'use strict';
const FORMAT = 'drawing-lines-v1', SEP = ' ||\n', LSEP = ' ;\n', QUOTE_WORDS = 10;
const SIZE_PX = { tiny: 30, small: 44, medium: 62, large: 88, huge: 118 };   // docs/js/logic.js SIZE_PX
const lc = s => String(s).toLowerCase();
/** the size word nearest to a size in px: docs/js/logic.js sizeName, the same code (ties keep medium, or the earlier word) */
const sizeWord = px => Object.entries(SIZE_PX).reduce((b, [k, v]) => Math.abs(v - px) < Math.abs(SIZE_PX[b] - px) ? k : b, 'medium');
const srcOf = (sources, name) => { if (!sources) return null; const k = lc(name); const v = typeof sources.get === 'function' ? sources.get(k) : Object.prototype.hasOwnProperty.call(sources, k) ? sources[k] : null; return v == null ? null : String(v); };
/** the first QUOTE_WORDS words of a message, on one line, with its double quotes made single (the line's own quotes stay unambiguous) */
const quoteOf = text => String(text).replace(/"/g, "'").split(/\s+/).filter(Boolean).slice(0, QUOTE_WORDS).join(' ');
const labelOf = l => String(l).replace(/\s+/g, ' ').replace(/"/g, "'");
/** what a shape is, in the legend's value words: size (or WxH), fill, colour, outline, layer, kind */
function what(s) {
  if (s.shape == null) return '';   // known by its name only
  const size = s.w != null || s.h != null ? `${Math.round(s.w ?? s.size ?? 62)}x${Math.round(s.h ?? s.size ?? 62)}` : sizeWord(s.size ?? 62);
  return [size, s.fill, s.color, s.outline ? `${s.outline} outline` : null, s.layer && s.layer !== 'item' ? s.layer : null, s.shape].filter(Boolean).join(' ');
}

/** the lines of a drawing -> [{text, heads: [{name, at}], kind: 'shape' | 'edge' | 'group'}], newest first.
 *  state: an engine state ({shapes, edges, groups}) or {shapes: [{name}], groups} for a drawing known by its names only;
 *  sources: Map or object, lower-cased shape name -> the text of the message that made it (noteMessage keeps it). */
function lines(state, sources) {
  const shapes = (state && state.shapes) || [], byKey = new Map();
  shapes.forEach((s, i) => {
    const src = srcOf(sources, s.name), rank = s.order != null ? s.order : i;   // creation order; a names-only list is in creation order
    const key = JSON.stringify([src, what(s), s.label == null ? null : labelOf(s.label)]);
    if (!byKey.has(key)) byKey.set(key, { src, desc: what(s), label: s.label == null || s.label === '' ? null : labelOf(s.label), members: [] });
    byKey.get(key).members.push({ name: String(s.name), rank });
  });
  const out = [];
  const groups = [...byKey.values()].map(g => (g.members.sort((a, b) => a.rank - b.rank), Object.assign(g, { newest: g.members[g.members.length - 1].rank })));
  groups.sort((a, b) => b.newest - a.newest);
  for (const g of groups) {
    const names = g.members.map(m => m.name), head = names.join(' '), heads = [];
    let at = 0; for (const n of names) { heads.push({ name: n, at }); at += n.length + 1; }
    const tail = (g.desc ? ' ' + g.desc : '') + (g.label != null ? ` "${g.label}"` : '') + (g.src != null ? ` | "${quoteOf(g.src)}"` : '');
    out.push({ kind: 'shape', text: tail ? head + ':' + tail : head, heads });
  }
  const edges = ((state && state.edges) || []).map((e, i) => ({ e, rank: /^e(\d+)$/.test(String(e.id)) ? +String(e.id).slice(1) : i }));
  edges.sort((a, b) => b.rank - a.rank);
  for (const { e } of edges) {
    const arrow = e.arrow === 'none' ? '-' : e.arrow === 'both' ? '<->' : '->';
    out.push({ kind: 'edge', heads: [], text: [e.from, arrow, e.to, e.style && e.style !== 'solid' ? e.style : null, e.color || null].filter(Boolean).join(' ') + (e.label != null && e.label !== '' ? ` "${labelOf(e.label)}"` : '') });
  }
  const gs = (state && state.groups) || [];
  for (let i = gs.length - 1; i >= 0; i--) out.push({ kind: 'group', heads: [{ name: String(gs[i].name), at: 6 }], text: `group ${gs[i].name}: ${(gs[i].members || []).join(' ')}` });
  return out;
}

/** the input of the second read for a request and some lines -> {text, drawFrom, heads: [{name, start, end, line}]} (character offsets, UTF-16 as JS strings) */
function layout(request, ls) {
  const req = String(request);
  if (!ls.length) return { text: req, drawFrom: req.length, heads: [] };
  let text = req + SEP; const drawFrom = text.length, heads = [];
  ls.forEach((l, i) => {
    if (i) text += LSEP;
    for (const h of l.heads) heads.push({ name: h.name, start: text.length + h.at, end: text.length + h.at + h.name.length, line: i });
    text += l.text;
  });
  return { text, drawFrom, heads };
}

/** the cap: the most lines, newest first and whole, whose input count(text) <= limit (count: word pieces with the two special tokens)
 *  -> layout() of the kept lines plus {kept, dropped, total}. Lines are dropped from the oldest end only. */
function fit(request, ls, count, limit) {
  let lo = 0, hi = ls.length;   // the input grows with every line, so the largest k with count <= limit is found by bisection
  if (count(layout(request, ls).text) <= limit) lo = hi;
  else while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (count(layout(request, ls.slice(0, mid)).text) <= limit) lo = mid; else hi = mid - 1; }
  return Object.assign(layout(request, ls.slice(0, lo)), { kept: lo, dropped: ls.length - lo, total: ls.length });
}

/** after a message was run: the source text of the shapes it made (sources: Map, lower-cased name -> message text, changed in place).
 *  before / after: the shape names before and after the run (or states); steps: the engine's steps (their patches move a renamed shape's source). */
function noteMessage(sources, before, after, text, steps) {
  const namesOf = x => (Array.isArray(x) ? x : ((x && x.shapes) || []).map(s => s.name)).map(lc);
  const had = new Set(namesOf(before)), moved = new Set();
  for (const st of steps || []) for (const p of st.patches || []) if (p.op === 'rename' && p.from != null && p.to != null) {
    const v = sources.get(lc(p.from)); if (v != null) { sources.delete(lc(p.from)); sources.set(lc(p.to), v); } moved.add(lc(p.to));
  }
  for (const n of namesOf(after)) if (!had.has(n) && !moved.has(n)) sources.set(n, String(text));
  return sources;
}

return { FORMAT, SEP, LSEP, QUOTE_WORDS, sizeWord, quoteOf, lines, layout, fit, noteMessage };
})();
if (typeof module !== 'undefined') module.exports = DrawingLines;
/*DRAWING-LINES-END*/
