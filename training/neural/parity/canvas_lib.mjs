// canvas_lib.mjs: arm M4 (the drawing as a second read; MODERNBERT_PARITY_PLAN.md M4): the drawing before each annotated message, by replay in
// the engine, and which shapes of that drawing each name-role of a request refers to. Shared by build_canvas_rows.mjs (training rows) and
// m4_measure.mjs (M4.0's measurements), so that both read the same drawing and the same targets.
//  - drawingsOf(rows, how): the drawing before each message: `session` folders (nl_p*: a session starts from its first step's setup, the gold of each
//    step is played after it, a session ends at its first unreliable step, as session_lib.mjs reliableSteps), `scenes` folders (one file = one
//    session from an empty drawing), a row with a `setup` alone, else the row's `names` and `groups` (a drawing known by its names only).
//    The source text of a shape is the message that made it (drawing-lines.js noteMessage); setup shapes have none.
//  - targetsOf(system, state, row): the message's gold played on a copy of the drawing; per wire and name-role: written in the request, a shape
//    the request does not write (by name), a description the request writes, or one it does not write (the shapes the engine selected for it).
import { createRequire } from 'node:module';
import { K, cp, goldProgram } from './parity_lib.mjs';
import { startSystem, playGold } from './arm_lib.mjs';

export const DL = createRequire(import.meta.url)('../../../docs/js/drawing-lines.js');
/** the name-roles the reader tags (reader.json ref_keys of the first run) */
export const REF_KEYS = ['target', 'from', 'to', 'anchor', 'anchor2', 'linked'];
/** nl_needs.py NAME_KEYS: the keys whose names a word check reads */
export const NEED_KEYS = ['target', 'from', 'to', 'anchor', 'anchor2', 'members', 'linked'];
const MENTION_KEYS = ['target', 'from', 'to', 'anchor', 'anchor2', 'members'];   // parity_lib.mjs goldProgram: the keys whose mention(...) parts become mention wires
const WORD_RE = /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu;
export const wordsOf = t => [...String(t).matchAll(WORD_RE)].map(m => ({ w: m[0], start: m.index, end: m.index + m[0].length }));
const lc = s => String(s).toLowerCase();
/** nl_needs.py words(): the set of lower-cased letter / digit runs */
export const wordSet = s => new Set(lc(s).match(/[\p{L}\p{N}]+/gu) || []);
const subset = (a, b) => [...a].every(x => b.has(x));
/** bench-canon.js / make_roles.py parts: "a,b" split at commas outside parentheses */
export function parts(v) {
  const out = []; let d = 0, cur = '';
  for (const ch of String(v)) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  out.push(cur.trim());
  return out.filter(Boolean);
}
const mentionFilters = p => parts(p.slice('mention('.length, -1)).map(kv => { const i = kv.indexOf('='); return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()]; });

/** nl_needs.py, the same rule: a wire needs the drawing when a name key holds a name the message does not write, or a mention holds a value
 *  (other than quantifier and recency) the message does not write */
export function needsDrawing(text, args) {
  const W = wordSet(text);
  for (const k of NEED_KEYS) {
    if (args[k] == null) continue;
    for (const p of parts(args[k])) {
      if (p === '$new') continue;
      if (p.startsWith('mention(')) { for (const [mk, mv] of mentionFilters(p)) if (mk !== 'quantifier' && mk !== 'recency' && !subset(wordSet(mv), W)) return true; }
      else if (!subset(wordSet(p), W)) return true;
    }
  }
  return false;
}
/** make_roles.py find_seq: the lower-cased words of a name occur one after the other in the request */
export function written(span, name) {
  const ws = wordsOf(span).map(x => lc(x.w)), seq = wordsOf(name).map(x => lc(x.w));
  if (!seq.length) return false;
  for (let i = 0; i + seq.length <= ws.length; i++) if (seq.every((w, j) => ws[i + j] === w)) return true;
  return false;
}

/** the state a names-only row describes */
export const namesState = row => ({ shapes: (row.names || []).map(name => ({ name })), edges: [], groups: Object.entries(row.groups || {}).map(([name, members]) => ({ name, members: [].concat(members) })) });

/** the drawing before each message of one file's rows -> [{row, kind: 'replay' | 'setup' | 'names', system (null for names), state, sources, namesMismatch}]
 *  how: 'scenes' (the file is one session from an empty drawing) | 'rows' (sessions by `session`, else setup, else names).
 *  counts: {left_out_unreliable, engine_errors} are added to (keepUnreliable: the steps from the first unreliable one on are kept, and counted). Each entry's state and sources are copies; the system is the live one (do not run on it). */
export function drawingsOf(rows, how, counts, { keepUnreliable = false } = {}) {
  const out = [];
  let G = null, session = null, src = null, dead = false;
  const play = (r) => { const before = G.s.world.state.shapes.map(s => s.name), res = playGold(G.s, r.wires || []); counts.engine_errors += (res.errors || []).length; DL.noteMessage(src, before, G.s.world.state, r.text, res.steps); };
  const entry = (r, kind) => {
    const st = G ? G.s.world.state : namesState(r), eng = G ? st.shapes.map(s => s.name).concat((st.groups || []).map(g => g.name)) : null;
    const given = [...new Set([...(r.names || []), ...Object.keys(r.groups || {})])];
    return { row: r, kind, system: G ? G.s : null, state: cp(st), sources: new Map(src || []), namesMismatch: !!eng && r.names != null && [...eng].map(lc).sort().join('\0') !== given.map(lc).sort().join('\0') };
  };
  if (how === 'scenes') {
    G = startSystem(null); src = new Map();
    for (const r of rows) { out.push(entry(r, 'replay')); play(r); }
    return out;
  }
  for (const r of rows) {
    if (r.session != null) {
      if (r.session !== session) { session = r.session; G = startSystem(r.setup || null); counts.engine_errors += G.errors.length; src = new Map(); dead = false; }
      if (dead || r.unreliable) { dead = true; counts.left_out_unreliable++; if (!keepUnreliable) continue; }   // a failed step makes the gold drawing after it only a best replay (kept, and counted, when measuring a test set)
      out.push(entry(r, 'replay')); play(r);
    } else {
      session = null;
      if (r.setup) { G = startSystem(r.setup); counts.engine_errors += G.errors.length; src = new Map(); out.push(entry(r, 'setup')); }
      else { G = null; src = null; out.push(entry(r, 'names')); }
      G = null; src = null;
    }
  }
  return out;
}

/** the mention wire ids goldProgram gives the mention(...) parts of a message's wires: [wire][key] -> [id per part, null for other parts] (the same walk as goldProgram) */
function mentionIds(wires) {
  let mm = 0;
  return wires.map(w => {
    const ids = {};
    for (const [k, v] of Object.entries(w.args || {})) if (typeof v === 'string' && (v.includes('mention(') || v.includes('$new')) && MENTION_KEYS.includes(k)) ids[k] = parts(v).map(p => (/^mention\((.*)\)$/.test(p) ? 'm' + (++mm) : null));
    return ids;
  });
}

/** per wire, per name-role of REF_KEYS: [{part, kind, names}] where kind is
 *    new          "$new": a shape made earlier in the message (not on the drawing)
 *    written      a name the request writes (the first read tags it)
 *    name         a name the request does not write (names: [it])
 *    desc-written a mention whose filters the request writes (the first read's description heads read it)
 *    desc-drawing a mention with a filter the request does not write (names: the shapes the engine selected; [] and error when it selected none)
 *  The gold is played on a copy of the drawing (system null: a names-only drawing, mentions are not resolved: error 'no drawing'). */
export function targetsOf(system, state, row) {
  const wires = row.wires || [];
  let steps = null, progErr = null;
  if (system && wires.some(w => REF_KEYS.some(k => typeof w.args?.[k] === 'string' && w.args[k].includes('mention(')))) {
    const S = K.createSystem(); S.world.state = cp(state); S.world.undoStack = []; S.world.redoStack = [];
    const prog = goldProgram(wires.map(w => ({ span: w.span, type: w.type, args: w.args })));
    try { steps = new Map(S.engine.run(K.parse(prog), {}).steps.map(st => [st.node.id, st])); } catch (e) { progErr = String(e.message || e); }
  }
  const ids = mentionIds(wires);
  return wires.map((w, i) => {
    const out = {}, span = w.span || '';
    for (const k of REF_KEYS) {
      if (w.args?.[k] == null) continue;
      out[k] = parts(w.args[k]).map((p, j) => {
        if (p === '$new') return { part: p, kind: 'new', names: [] };
        if (!p.startsWith('mention(')) return written(span, p) ? { part: p, kind: 'written', names: [] } : { part: p, kind: 'name', names: [p] };
        const W = wordSet(span);
        if (mentionFilters(p).every(([mk, mv]) => mk === 'quantifier' || mk === 'recency' || subset(wordSet(mv), W))) return { part: p, kind: 'desc-written', names: [] };
        if (!system) return { part: p, kind: 'desc-drawing', names: [], error: 'no drawing' };
        const id = ids[i][k]?.[j], st = id && steps ? steps.get(id) : null;
        if (!st) return { part: p, kind: 'desc-drawing', names: [], error: progErr || (id ? 'not run' : 'not a mention wire of goldProgram (key ' + k + ')') };
        if (st.error || st.skipped) return { part: p, kind: 'desc-drawing', names: [], error: String(st.error?.message || st.error || 'skipped') };
        return { part: p, kind: 'desc-drawing', names: [].concat(st.value || []).map(String) };
      });
    }
    return out;
  });
}

/** the ModernBERT word-piece count of a text as docs/js/neural.js makeReader prep reads it: [CLS], each word (with a leading space after the
 *  first), [SEP]. folder: a model folder with the tokenizer files (default docs/model/neural/modernbert). -> {count(text), tokenizer} */
export async function pieceCounter(folder = new URL('../../../docs/model/neural/modernbert', import.meta.url).pathname) {
  const require = createRequire(process.env.LAPTOP_PKG || new URL('../../laptop/package.json', import.meta.url));
  const TF = require('@huggingface/transformers');
  TF.env.allowRemoteModels = false; TF.env.allowLocalModels = true; TF.env.localModelPath = folder.replace(/[^/]+\/?$/, ''); TF.env.useBrowserCache = false;
  const tokenizer = await TF.AutoTokenizer.from_pretrained(folder.replace(/\/$/, '').split('/').pop(), { local_files_only: true });
  const cache = new Map();
  const count = text => { let n = 2; wordsOf(text).forEach((x, i) => { const w = (i ? ' ' : '') + x.w; if (!cache.has(w)) cache.set(w, tokenizer.encode(w, { add_special_tokens: false }).length); n += cache.get(w); }); return n; };
  return { count, tokenizer };
}
