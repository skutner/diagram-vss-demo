// parity_lib.mjs: shared code of the ModernBERT parity measurements (MODERNBERT_PARITY_PLAN.md).
// It plays the saved translations of the built-in examples and compares what the engine draws, whoever wrote the wires.
import fs from 'node:fs';
import { K, ROOT, examples, gptEntries, openingSystem } from '../../sop-translations/lib.mjs';
import { renameNodes } from '../../../docs/js/saved-sop.js';

export { K, ROOT, examples, openingSystem, renameNodes };

/** Tolerances for "the same drawing". Size words are 30, 44, 62, 88, 118 px (docs/js/logic.js SIZE_PX), so the closest neighbours differ by
 *  a ratio of 1.34: LOOSE (1.30) never accepts a neighbouring size word; it accepts "shrink" as 0.67 or 0.8 and "a bit bigger" as 1.2 or 1.25. */
export const STRICT = { pos: 0, ratio: 1.0001 }, POS40 = { pos: 40, ratio: 1.0001 }, LOOSE = { pos: 60, ratio: 1.30 };

/** The frozen split of the examples (SPLIT.json): which examples may ever be trained on. */
export const SPLIT = JSON.parse(fs.readFileSync(new URL('./SPLIT.json', import.meta.url), 'utf8'));
export const roleOf = example => SPLIT.held_out.includes(example) ? 'held_out' : SPLIT.training_scenes.includes(example) ? 'training_scene' : (() => { throw new Error('not in SPLIT.json: ' + example); })();

export const opusManifest = () => JSON.parse(fs.readFileSync(ROOT + '/docs/sop-translations/claude-opus-5-5/manifest.json', 'utf8'));
export const multisetEq = (a, b) => { const x = [...a].sort(), y = [...b].sort(); return x.length === y.length && x.every((v, i) => v === y[i]); };
export const cp = x => JSON.parse(JSON.stringify(x));
const dim = s => [s.w ?? s.size, s.h ?? s.size];

/** the teachers, per example turn: opus(ex, i) -> manifest entry; gpt(ex, i) -> validated turn */
export async function teachers() {
  const ents = await gptEntries(), byId = new Map(opusManifest().entries.map(e => [e.id, e]));
  const page = (ex, i) => ex.kind === 'quick' ? `quick:${i}` : `${ex.kind}:${ex.example}`;
  return {
    opus: (ex, i) => byId.get(`${ex.example}#${i + 1}`),
    gpt: (ex, i) => { const en = ents.get(page(ex, i)); return ex.kind === 'quick' ? en.turns[0] : en.turns[i]; },
  };
}

/** shapes of B mapped onto shapes of A: the same name first, then the same kind, colour, label and layer, nearest first */
export function mapBtoA(A, B) {
  const m = new Map(), used = new Set();
  for (const b of B) { const a = A.find(x => x.name.toLowerCase() === b.name.toLowerCase()); if (a) { m.set(b.name, a.name); used.add(a.name); } }
  const key = s => [s.shape, s.color, s.label ?? null, s.layer ?? null].join('|'), pairs = [];
  for (const b of B) if (!m.has(b.name)) for (const a of A) if (!used.has(a.name) && key(a) === key(b)) pairs.push([Math.hypot(a.x - b.x, a.y - b.y), a, b]);
  pairs.sort((p, q) => p[0] - q[0]);
  for (const [, a, b] of pairs) if (!m.has(b.name) && !used.has(a.name)) { m.set(b.name, a.name); used.add(a.name); }
  return m;
}

export const wordsOf = s => new Set(String(s).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || []);

/** what differs between drawing A (the reference) and drawing B -> {kind of difference: count}; {} = the same drawing.
 *  A name counts only when the message writes it: names the engine gave, and names a teacher made up, do not (gpt-6.1-sol names shapes the
 *  text leaves unnamed). turn = {base, text}: base = the drawing before this turn (a copy), text = the words the names must come from. With a base
 *  the shapes that were already there are also compared by what happened to them: z-order, moved or not and in which direction, resized or not
 *  and which way, so that a small move in the wrong direction, or no move at all, is not hidden by the tolerance on the final position. */
export function diffs(sa, sb, tol, turn = {}) {
  const m = mapBtoA(sa.shapes, sb.shapes), inv = new Map([...m].map(([b, a]) => [a, b])), d = {};
  const add = k => { d[k] = (d[k] || 0) + 1; }, r = (x, y) => Math.max(x, y) / Math.max(1e-6, Math.min(x, y)), lc = s => String(s).toLowerCase();
  const before = new Map((turn.base?.shapes || []).map(s => [lc(s.name), s]));
  if (turn.text != null) {
    const W = wordsOf(turn.text), inB = new Set(sb.shapes.map(s => lc(s.name))), groupsB = new Set((sb.groups || []).map(g => lc(g.name))), groupsBefore = new Set((turn.base?.groups || []).map(g => lc(g.name)));
    for (const a of sa.shapes) { const n = lc(a.name); if (!before.has(n) && W.has(n) && !inB.has(n)) add('name'); }
    for (const g of sa.groups || []) { const n = lc(g.name); if (!groupsBefore.has(n) && W.has(n) && !groupsB.has(n)) add('group name'); }
  }
  if (turn.base) {
    const amap = new Map(sa.shapes.map(s => [lc(s.name), s])), bmap = new Map(sb.shapes.map(s => [lc(s.name), s]));
    const seq = S => S.shapes.map(s => lc(s.name)).filter(n => before.has(n) && amap.has(n) && bmap.has(n)).join();
    if (seq(sa) !== seq(sb)) add('z-order');
    const growth = (s, p) => { const [w, h] = dim(s), [pw, ph] = dim(p); return Math.sign(Math.round(w - pw) || Math.round(h - ph)); };
    for (const [n, p] of before) {
      const a = amap.get(n), b = bmap.get(n);
      if (!a || !b) continue;
      const da = [a.x - p.x, a.y - p.y], db = [b.x - p.x, b.y - p.y], la = Math.hypot(...da), lb = Math.hypot(...db);
      if ((la > 1) !== (lb > 1)) add('moved or not'); else if (la > 1 && da[0] * db[0] + da[1] * db[1] <= 0) add('moved the other way');
      if (growth(a, p) !== growth(b, p)) add('resized differently');
    }
  }
  for (const a of sa.shapes) {
    const bn = inv.get(a.name);
    if (!bn) { add('missing'); continue; }
    const b = sb.shapes.find(x => x.name === bn);
    for (const k of ['shape', 'color', 'outline', 'label', 'fill', 'layer']) if ((a[k] ?? null) !== (b[k] ?? null)) add(k);
    const [aw, ah] = dim(a), [bw, bh] = dim(b);
    if (r(aw, bw) > tol.ratio || r(ah, bh) > tol.ratio) add('size');
    if (Math.hypot(a.x - b.x, a.y - b.y) > tol.pos) add('position');
  }
  for (const b of sb.shapes) if (!m.has(b.name)) add('extra');
  const eK = (e, f) => [f(e.from), f(e.to), e.style ?? null, e.arrow ?? null, e.label ?? null, e.color ?? null].join('|').toLowerCase();
  if (!multisetEq(sa.edges.map(e => eK(e, x => x)), sb.edges.map(e => eK(e, x => m.get(x) ?? x)))) add('edges');
  const gg = (gs, f) => gs.map(g => g.members.map(x => f(x).toLowerCase()).sort().join(','));
  if (!multisetEq(gg(sa.groups || [], x => x), gg(sb.groups || [], x => m.get(x) ?? x))) add('groups');
  const rr = rs => rs.map(x => [x.shape, x.color, x.size, x.outline].join('|'));
  if (!multisetEq(rr(sa.rules || []), rr(sb.rules || []))) add('rules');
  return d;
}

/** how much of drawing A is also in drawing B, per kind -> {shapes, arrows, groups}, each {same, total}; total = the larger of the two, so extras count against.
 *  An arrow is the same when its two ends (through the shape mapping), style, head, label and colour are; a group when its members are. */
export function finalShares(sa, sb, tol) {
  const m = mapBtoA(sa.shapes, sb.shapes), inv = new Map([...m].map(([b, a]) => [a, b])), r = (x, y) => Math.max(x, y) / Math.max(1e-6, Math.min(x, y));
  let n = 0;
  for (const a of sa.shapes) {
    const bn = inv.get(a.name); if (!bn) continue;
    const b = sb.shapes.find(x => x.name === bn), [aw, ah] = dim(a), [bw, bh] = dim(b);
    if (['shape', 'color', 'outline', 'label', 'fill', 'layer'].every(k => (a[k] ?? null) === (b[k] ?? null)) && r(aw, bw) <= tol.ratio && r(ah, bh) <= tol.ratio && Math.hypot(a.x - b.x, a.y - b.y) <= tol.pos) n++;
  }
  const common = (A, B) => { const left = [...B]; let k = 0; for (const x of A) { const i = left.indexOf(x); if (i >= 0) { left.splice(i, 1); k++; } } return k; };
  const eK = (e, f) => [f(e.from), f(e.to), e.style ?? null, e.arrow ?? null, e.label ?? null, e.color ?? null].join('|').toLowerCase();
  const ea = sa.edges.map(e => eK(e, x => x)), eb = sb.edges.map(e => eK(e, x => m.get(x) ?? x));
  const gg = (gs, f) => gs.map(g => g.members.map(x => f(x).toLowerCase()).sort().join(','));
  const ga = gg(sa.groups || [], x => x), gb = gg(sb.groups || [], x => m.get(x) ?? x);
  return {
    shapes: { same: n, total: Math.max(sa.shapes.length, sb.shapes.length) },
    arrows: { same: common(ea, eb), total: Math.max(ea.length, eb.length) },
    groups: { same: common(ga, gb), total: Math.max(ga.length, gb.length) },
  };
}
/** the mean over examples of each kind's share, over the examples that have any of that kind -> {shapes, arrows, groups}, in percent */
export function meanShares(list) {
  const out = {};
  for (const k of ['shapes', 'arrows', 'groups']) { const v = list.map(s => s[k]).filter(x => x.total > 0).map(x => x.same / x.total); out[k] = v.length ? 100 * v.reduce((a, b) => a + b, 0) / v.length : null; }
  return out;
}

export const same = d => !Object.keys(d).length;
export const fresh = ex => ex.kind === 'quick' ? openingSystem() : K.createSystem();
export const answers = r => (r?.steps || []).filter(s => s.node.type === 'question').map(s => (typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value ?? s.answer ?? '')).toLowerCase());
export const errorsOf = r => (r?.steps || []).filter(s => s.error).map(s => String(s.error.message || s.error));
export const run = (sys, nodes) => { try { return sys.engine.run(nodes, {}); } catch (e) { return { steps: [], thrown: String(e.message || e) }; } };
/** a copy of a system's drawing with its undo and redo stacks: a program played on it is played from exactly that state */
export function copyWorld(src) {
  const s = K.createSystem();
  s.world.restore(cp(src.world.snapshot()));
  s.world.undoStack = cp(src.world.undoStack); s.world.redoStack = cp(src.world.redoStack);
  return s;
}
/** the names a step touched, as training/sketch/scenes_r3/scene_readers.mjs touchedOf (what a reader gets as ctx.last) */
export function touched(S, result) {
  const t = [], hl = [];
  (result?.steps || []).forEach(st => {
    (st.patches || []).forEach(p => { if (p.op === 'add') t.push(p.shape.name); else if (p.op === 'set') t.push(p.name); else if (p.op === 'rename') t.push(p.to); });
    if (st.highlight) hl.push(...(st.highlight.shapes || []));
  });
  const alive = [...new Set(t)].filter(n => S.world.find(n));
  return alive.length ? alive : [...new Set(hl)].filter(n => S.world.find(n));
}
/** the renames that bring a program written against drawing B onto drawing A */
export function renamesBtoA(A, B) {
  const m = Object.fromEntries(mapBtoA(A.world.state.shapes, B.world.state.shapes));
  for (const k of Object.keys(m)) if (m[k] === k) delete m[k];
  return m;
}
export const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '-') + '%';

// annotated wires ("span", "trigger", "type", "args") -> SOP Lang program, as training/sketch/scenes_r3/scene_readers.mjs goldProgram
const parts = s => { const o = []; let d = 0, c = ''; for (const ch of String(s)) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; };
const fmt = (k, v) => {
  if (['items', 'items2', 'parents'].includes(k)) return String(v).split(',').map(x => /^[A-Za-z0-9_-]+$/.test(x.trim()) ? x.trim() : JSON.stringify(x.trim())).join(',');
  if (['label', 'title'].includes(k)) return JSON.stringify(String(v));
  if (/^-?\d+(\.\d+)?$/.test(String(v)) || /^[A-Za-z_][\w-]*$/.test(String(v)) || /^-?\d+,-?\d+$/.test(String(v))) return String(v);
  if (/^[A-Za-z0-9_$,-]+$/.test(String(v))) return String(v);
  return JSON.stringify(String(v));
};
export function goldProgram(wires) {
  const lines = []; let lastCreate = null, mm = 0;
  wires.forEach((w, i) => {
    const id = 'w' + (i + 1), a = Object.assign({}, w.args), args = [];
    if (a.action === 'resize' && a.scale == null && a.size == null && /\b(shrink|smaller|tinier|reduce|less big)/i.test(w.span || '')) a.scale = '0.67';
    for (const [k, v] of Object.entries(a)) {
      if (typeof v === 'string' && (v.includes('mention(') || v.includes('$new')) && ['target', 'from', 'to', 'anchor', 'anchor2', 'members'].includes(k)) {
        const vals = parts(v).map(p => {
          if (p === '$new') return '$' + lastCreate;
          const q = /^mention\((.*)\)$/.exec(p);
          if (q) {
            const mid = 'm' + (++mm);   // a value with a space ("label=order flow") is quoted, or parse() splits it
            lines.push(`@${mid} mention ` + q[1].split(',').map(kv => { const i = kv.indexOf('='), k = kv.slice(0, i).trim().replace(/^notcolor$/, 'notColor'), v = kv.slice(i + 1).trim(); return i < 0 ? kv : `${k}=${/\s/.test(v) ? JSON.stringify(v) : v}`; }).join(' '));
            return '$' + mid;
          }
          return p;
        });
        args.push(`${k}=${vals.join(',')}`);
      } else args.push(`${k}=${fmt(k, v)}`);
    }
    lines.push(`@${id} ${w.type} ${args.join(' ')}`);
    if (w.type === 'command' && ['create', 'duplicate'].includes(a.action)) lastCreate = id;
  });
  return lines.join('\n');
}
