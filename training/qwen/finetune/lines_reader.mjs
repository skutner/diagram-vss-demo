// lines_reader.mjs: the reader side of the line format (QWEN3_FINETUNE_PLAN.md section 5, decision D1). One line per request,
// `[trigger words] type key=value ...` (lines_format.mjs writeLines). Pure functions, used by the format oracle, the collectors and the
// scorer the same way, so the page can run the same code later.
//
//   learnKeys(wiresList)            the keys each act takes and the keys a description takes, LEARNED from training gold (AGENTS.md: no
//                                   hand-written table); saved with an arm (act_keys.json) and read back by lineSpec
//   lineSpec(engine, learned)       the vocabulary: types, acts, key kinds and values from the legend, keys per act from the data
//   readOutput(spec, raw, finish, ctx, {numberWords})
//                                   parse + validate a whole output -> {ok, errors, requests: [{index, trigger, type, act, args, span,
//                                   line, fields, errors, blocked}]}. Character ranges are offsets in `raw`.
//   toNodes(spec, v)                the unblocked requests -> SOP Lang wires by the engine's own parser (K.parse of programOf), each
//                                   main wire with its mentions, the trigger's place in the message as its span
//   programOf(wires)                annotated wires -> SOP Lang lines. A copy of training/neural/parity/parity_lib.mjs goldProgram WITHOUT
//                                   its replay shortcut (a resize with "smaller" in its span and no scale gets scale 0.67): a reader's
//                                   output is executed as written; the shortcut would be a hand-written equivalence on the reader's side
//   grammar(spec)                   a GBNF grammar from the legend and the learned keys (llama.cpp / wllama `grammar`)
//
// Validation (whole output): a cut output (finish != stop) or a runtime error holds every request. Per request (a failure holds that
// request and every request that uses what it would create; never the others):
//   - the line parses; the type is one of the engine's wire types; a command's action / a question's ask is a legend value;
//   - every key is one its act takes in the training gold (learned); a description's keys are keys descriptions take in training gold;
//   - the legend's own check (legend.validate: enum values, numbers) on the request and on its descriptions; the engine has a handler;
//   - the trigger is not empty and is in the message;
//   - a description's text values (mention(label=…)): every word is in the message or in a label on the drawing (ctx.labels);
//   - a shape named by a reference key (legend kind `names`) is on the drawing (a name or a label), its words are words of the message, or it is
//     made by an earlier unheld request of this output (a name a held create/rename/duplicate would make, not on the drawing, is held); `$new`
//     is the latest create or duplicate line of this output (or an unreadable line after it), and is held when that line is held;
//   - text values (legend kind name, text and texts without values): every word of the value is a word of the message (case-insensitive;
//     "the words of a label are in the message", D1); an empty value passes (label="" removes a label); a value with no word characters
//     must be written in the message. With {numberWords: true} the message's number words also count as their digits,
//     by L1's table (a listed mechanical step: training/neural/make_roles.py NUM_UNITS / NUM_TENS / NUM_DIGIT, copied below), and the
//     result is reported with and without it.
import { K } from '../../neural/parity/parity_lib.mjs';

export const REF_KINDS = ['names'];
const WORD = /[\p{L}\p{N}]+/gu;
export const wordsOf = s => [...String(s).toLowerCase().matchAll(WORD)].map(m => m[0]);

// ---------------------------------------------------------------- L1's number table (training/neural/make_roles.py, the same values)
const NUM_UNITS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const NUM_TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const NUM_DIGIT = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/** make_roles.py table_number: the number at word i of the lower-cased letter words, or null */
export function tableNumber(low, i) {
  const w = low[i];
  const n = has(NUM_UNITS, w) ? NUM_UNITS[w] : has(NUM_TENS, w) ? NUM_TENS[w] : w === 'hundred' ? 100 : null;
  if (n == null) return null;
  if (has(NUM_TENS, w)) {
    if (i + 1 < low.length && has(NUM_DIGIT, low[i + 1])) return [n + NUM_DIGIT[low[i + 1]], 2];
    if (i + 2 < low.length && low[i + 1] === '-' && has(NUM_DIGIT, low[i + 2])) return [n + NUM_DIGIT[low[i + 2]], 3];
  }
  if (n < 10 && i + 1 < low.length && low[i + 1] === 'hundred') return [n * 100, 2];
  return [n, 1];
}
/** the message's words, plus (numberWords) the digits its number words stand for by the table */
export function messageWords(text, numberWords = false) {
  const ws = new Set(wordsOf(text));
  if (numberWords) {
    const low = [...String(text).toLowerCase().matchAll(/[a-z]+|-/g)].map(m => m[0]);
    for (let i = 0; i < low.length; i++) { const t = tableNumber(low, i); if (t) ws.add(String(t[0])); }
  }
  return ws;
}

// ---------------------------------------------------------------- the vocabulary
const splitTop = v => { const o = []; let d = 0, c = ''; for (const ch of String(v)) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(s => s.trim()).filter(s => s.length); };
const actOf = w => w.type === 'command' ? w.args.action : w.type === 'question' ? w.args.ask : w.type;
const descOf = p => { const m = /^mention\((.*)\)$/s.exec(p); return m ? splitTop(m[1]).map(kv => { const i = kv.indexOf('='); return i < 0 ? [kv, ''] : [kv.slice(0, i).trim(), kv.slice(i + 1).trim()]; }) : null; };

/** training gold -> {act_keys: {act: [key]}, desc_keys: [key], rows, wires} (sorted, so the same data gives the same bytes) */
export function learnKeys(wiresList) {
  const ak = new Map(), dk = new Set(); let rows = 0, wires = 0;
  for (const ws of wiresList) {
    rows++;
    for (const w of ws) {
      wires++;
      const a = actOf(w); if (!ak.has(a)) ak.set(a, new Set());
      for (const [k, v] of Object.entries(w.args || {})) {
        if (k === 'action' || k === 'ask') continue;
        ak.get(a).add(k);
        if (typeof v === 'string' && v.includes('mention(')) for (const p of splitTop(v)) { const d = descOf(p); if (d) for (const [kk] of d) dk.add(kk === 'notcolor' ? 'notColor' : kk); }
      }
    }
  }
  return { act_keys: Object.fromEntries([...ak].sort(([a], [b]) => a < b ? -1 : 1).map(([a, s]) => [a, [...s].sort()])), desc_keys: [...dk].sort(), rows, wires };
}

export function lineSpec(engine, learned) {
  const legend = engine.legend;
  const q = k => legend.get(k), vals = k => Object.keys((q(k) || {}).values || {});
  const actions = new Set(vals('action')), asks = new Set(vals('ask'));
  const kind = k => { const x = q(k); if (!x) return 'unknown'; return x.values && (x.kind === 'enum' || x.kind === 'text') ? 'enum' : x.kind; };
  return { legend, engine, actions, asks, types: ['command', 'question', 'fact', 'rule'], act_keys: learned.act_keys, desc_keys: new Set(learned.desc_keys), kind, values: vals, learned };
}

// ---------------------------------------------------------------- parsing with offsets
/** one line (without its newline) at offset `at` of the raw text -> {trigger, tr: [c0, c1], type, typeRange, kv: [{key, value, range, vrange}], error} */
function parseLine(line, at) {
  const m = /^\[([^\]\n]*)\] (command|question|fact|rule)(?= |$)/.exec(line);
  if (!m) return { error: 'not a request line' };
  const out = { trigger: m[1], tr: [at + 1, at + 1 + m[1].length], type: m[2], typeRange: [at + m[1].length + 3, at + m[1].length + 3 + m[2].length], kv: [] };
  let i = m[0].length;
  while (i < line.length) {
    if (line[i] === ' ') { i++; continue; }
    const km = /^([A-Za-z][A-Za-z0-9]*)=/.exec(line.slice(i));
    if (!km) return { ...out, error: 'bad key=value' };
    const k0 = i; i += km[0].length; const v0 = i; let value;
    if (line[i] === '"') {
      let j = i + 1; while (j < line.length && (line[j] !== '"' || line[j - 1] === '\\')) j++;
      try { value = JSON.parse(line.slice(i, j + 1)); } catch { return { ...out, error: 'bad quoted value' }; }
      i = j + 1;
    } else {
      let j = i, d = 0; while (j < line.length && (d > 0 || line[j] !== ' ')) { if (line[j] === '(') d++; if (line[j] === ')') d--; j++; }
      value = line.slice(i, j); i = j;
    }
    if (out.kv.some(x => x.key === km[1])) return { ...out, error: `the key ${km[1]} twice` };
    out.kv.push({ key: km[1], value, range: [at + k0, at + i], vrange: [at + v0, at + i] });
  }
  return out;
}

/** locate words in the message, after the previous request's place first (as qwen-contract.js locate), else anywhere */
function locate(text, words, from) {
  if (!words) return null;
  let at = text.indexOf(words, from); if (at < 0) at = text.indexOf(words);
  return at < 0 ? null : [at, at + words.length];
}

/** a whole output -> validation. ctx: {text (the message), names (on the drawing)}. raw: the generated text, without <|im_end|> */
export function readOutput(spec, raw, finish, ctx, { numberWords = false, error = null } = {}) {
  const res = { ok: false, errors: [], requests: [], raw: String(raw ?? '') };
  if (error) { res.errors.push('the model run failed: ' + error); return res; }
  if (finish !== 'stop') res.errors.push(finish === 'length' ? 'the output was cut off at the token limit' : `the output did not finish normally (${finish || 'no finish reason'})`);
  const text = String(ctx.text), lc = s => String(s).toLowerCase().trim(), msgLc = text.toLowerCase(), mw = messageWords(text, numberWords);
  // the drawing's texts: shape and edge labels (ctx.labels) name shapes too (the engine resolves a name by the text an item shows), and a
  // description's label words may come from the drawing rather than the message
  const known = new Set([...(ctx.names || []), ...(ctx.labels || [])].map(lc)), made = new Set();
  const dw = new Set((ctx.labels || []).flatMap(wordsOf));
  const creates = [];   // indices of earlier lines that create a shape ($new), held or not, and unreadable lines (which may have been one)
  const heldNames = new Set();   // names a held create, rename or duplicate would have made
  const heldLabels = new Set(), madeLabels = new Set();   // label texts lines of this output would set (held / not held)
  let at = 0, from = 0;
  for (const line of res.raw.split('\n')) {
    const start = at; at += line.length + 1;
    if (!line.trim()) continue;
    const p = parseLine(line, start), index = res.requests.length;
    const R = { index, line: [start, start + line.length], end: [start + line.length, Math.min(res.raw.length, start + line.length + 1)], trigger: p.trigger ?? null, type: p.type ?? null, act: null, args: {}, span: null, fields: [], errors: [], blocked: false, uses: [] };
    res.requests.push(R);
    if (p.error && !p.type) { R.errors.push(p.error); R.blocked = true; creates.push(index); continue; }
    if (p.error) R.errors.push(p.error);
    for (const kv of p.kv) R.args[kv.key] = kv.value;
    // fields for the score: the trigger, the act (type + action/ask), each other key=value, the end of the line
    R.fields.push({ name: 'trigger', ranges: [p.tr] });
    const actKv = p.kv.find(x => x.key === (p.type === 'command' ? 'action' : 'ask'));
    R.fields.push({ name: 'act', ranges: [p.typeRange, ...(actKv ? [actKv.range] : [])] });
    for (const kv of p.kv) if (kv !== actKv) R.fields.push({ name: kv.key, ranges: [kv.range] });
    // act
    const act = p.type === 'command' ? R.args.action : p.type === 'question' ? R.args.ask : p.type;
    R.act = act ?? null;
    if (p.type === 'command' && !spec.actions.has(String(R.args.action))) R.errors.push(`action=${R.args.action} is not a legend action`);
    if (p.type === 'question' && !spec.asks.has(String(R.args.ask))) R.errors.push(`ask=${R.args.ask} is not a legend question`);
    const keysOk = spec.act_keys[act];
    if (!keysOk) R.errors.push(`${act} is not an act of the training data`);
    for (const [k, v] of Object.entries(R.args)) {
      if (k === 'action' || k === 'ask') continue;
      if (keysOk && !keysOk.includes(k)) { R.errors.push(`${act} does not take ${k} (in the training data)`); continue; }
      const kind = spec.kind(k);
      if (kind === 'enum' && !spec.values(k).includes(String(v))) R.errors.push(`${k}=${v} is not a legend value of ${k}`);
      if (kind === 'number' && !/^-?\d+(\.\d+)?$/.test(String(v))) R.errors.push(`${k} must be a number`);
      if (kind === 'point' && !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(String(v))) R.errors.push(`${k} must be two numbers x,y`);
      if (REF_KINDS.includes(kind) || ['anchor2'].includes(k) && kind === 'unknown') {
        for (const part of splitTop(v)) {
          if (part === '$new') { if (!creates.length) R.errors.push('$new with no earlier create in this output'); else R.uses.push(creates[creates.length - 1]); continue; }
          const d = descOf(part);
          if (d) {
            for (const [dk, dv] of d) {
              const key = dk === 'notcolor' ? 'notColor' : dk;
              if (!spec.desc_keys.has(key)) { R.errors.push(`a description does not take ${key} (in the training data)`); continue; }
              const kk = spec.kind(key);
              if (kk === 'enum' && !spec.values(key).includes(dv)) R.errors.push(`${key}=${dv} is not a legend value of ${key}`);
              if ((kk === 'text' || kk === 'name') && !wordsOf(dv).every(x => mw.has(x) || dw.has(x))) R.errors.push(`the words of ${key}=${dv} are neither in the message nor on the drawing`);
              // a description by a label that only a held line of this output would set cannot be resolved as meant
              else if (key === 'label' && heldLabels.has(lc(dv)) && !madeLabels.has(lc(dv)) && !(ctx.labels || []).some(x => lc(x) === lc(dv))) R.errors.push(`the label ${dv} would be set by an earlier request that could not be read`);
            }
            continue;
          }
          // a name is on the drawing, made by an earlier unheld request of this output, or its words are words of the message
          const pw = wordsOf(part), inMsg = pw.length > 0 && pw.every(x => mw.has(x));
          if (heldNames.has(lc(part)) && !known.has(lc(part))) R.errors.push(`${part} would be made by an earlier request that could not be read`);
          else if (!(known.has(lc(part)) || made.has(lc(part)) || inMsg)) R.errors.push(`${part} is neither on the drawing, nor written in the message, nor created earlier`);
        }
      }
      if ((kind === 'name' || kind === 'text' || kind === 'texts') && !(spec.values(k) || []).length) {
        // an empty value writes nothing new (label="" removes a label); a value with no word characters must be in the message as written
        const ws = wordsOf(v);
        if (String(v).trim() && !ws.length && !msgLc.includes(lc(v))) R.errors.push(`${k}=${v} is not in the message`);
        else if (ws.length && !ws.every(x => mw.has(x))) R.errors.push(`the words of ${k}=${v} are not in the message`);
      }
    }
    // the legend's own check and the engine's handler, on the request as the engine would parse it
    if (!R.errors.length) {
      try {
        // checked alone: a `$new` (an earlier request of this output) stands as a placeholder name here; the real wiring is toNodes'
        const alone = Object.fromEntries(Object.entries(R.args).map(([k, v]) => [k, typeof v === 'string' ? splitTop(v).map(x => x === '$new' ? 'Earlier' : x).join(',') : v]));
        const nodes = K.parse(programOf([{ type: p.type, args: alone }]));
        for (const n of nodes) for (const i of spec.legend.validate(n)) if (i.level === 'error') R.errors.push('legend: ' + i.msg);
        const main = nodes[nodes.length - 1];
        try { spec.engine.match(main.type, main.args); } catch (e) { R.errors.push('engine: ' + e.message); }
      } catch (e) { R.errors.push('K.parse: ' + e.message); }
    }
    // the trigger
    if (!R.trigger || !R.trigger.trim()) R.errors.push('no trigger words');
    else { R.span = locate(text, R.trigger, from); if (!R.span) R.errors.push(`the trigger [${R.trigger}] is not in the message`); else from = R.span[1]; }
    for (const u of R.uses) if (res.requests[u].blocked) R.errors.push('it uses what an earlier request would create, which could not be read');
    R.blocked = R.errors.length > 0;
    // "this line may have made something": a create or duplicate, or a held command whose action is missing or not a legend action
    // (a misspelled create); unreadable lines are counted above. $new binds to the latest such line; the names such lines would make
    // follow the latest line that makes each name (made by an unheld one, held otherwise)
    const unknownAct = p.type === 'command' && R.blocked && !spec.actions.has(String(R.args.action));
    if (p.type === 'command' && (['create', 'duplicate'].includes(R.args.action) || unknownAct)) creates.push(index);
    if (p.type === 'command' && R.args.label != null && String(R.args.label).trim()) { const lb = lc(R.args.label); if (R.blocked) heldLabels.add(lb); else madeLabels.add(lb); }
    if (p.type === 'command' && R.args.name != null && (['create', 'rename', 'duplicate'].includes(R.args.action) || unknownAct)) {
      const nm = lc(R.args.name); if (R.blocked) { heldNames.add(nm); made.delete(nm); } else { made.add(nm); heldNames.delete(nm); }
    }
  }
  res.ok = res.errors.length === 0;
  if (!res.ok) for (const R of res.requests) { R.blocked = true; }
  return res;
}

/** the validator's context, one rule for the oracle, the collectors and the page: the message, the names (row names, group names and the
 *  names on the drawing as it is at this step) and the drawing's labels. state: the world state shown with the message (or null). */
export function readerContext(text, rowNames, groups, state) {
  const names = [...new Set([...(rowNames || []), ...Object.keys(groups || {}), ...(state ? (state.shapes || []).map(x => x.name) : [])])];
  return { text, names, labels: state ? drawingLabels(state) : [] };
}
/** the drawing's labels (shapes and edges) for ctx.labels */
export const drawingLabels = state => [...new Set([...(state.shapes || []), ...(state.edges || [])].map(x => x.label).filter(x => typeof x === 'string' && x.trim()))];

// ---------------------------------------------------------------- to wires
const fmt = (k, v) => {
  if (['items', 'items2', 'parents'].includes(k)) return String(v).split(',').map(x => /^[A-Za-z0-9_-]+$/.test(x.trim()) ? x.trim() : JSON.stringify(x.trim())).join(',');
  if (['label', 'title'].includes(k)) return JSON.stringify(String(v));
  if (/^-?\d+(\.\d+)?$/.test(String(v)) || /^[A-Za-z_][\w-]*$/.test(String(v)) || /^-?\d+,-?\d+$/.test(String(v))) return String(v);
  if (/^[A-Za-z0-9_$,-]+$/.test(String(v))) return String(v);
  return JSON.stringify(String(v));
};
const parts = s => { const o = []; let d = 0, c = ''; for (const ch of String(s)) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; };
/** parity_lib.mjs goldProgram, the same lines, without the resize shortcut (see the head of the file). ids w1.. in wire order */
export function programOf(wires) {
  const lines = []; let lastCreate = null, mm = 0;
  wires.forEach((w, i) => {
    const id = 'w' + (i + 1), a = Object.assign({}, w.args), args = [];
    for (const [k, v] of Object.entries(a)) {
      if (typeof v === 'string' && (v.includes('mention(') || v.includes('$new')) && ['target', 'from', 'to', 'anchor', 'anchor2', 'members'].includes(k)) {
        const vals = parts(v).map(p => {
          if (p === '$new') return '$' + lastCreate;
          const q = /^mention\((.*)\)$/.exec(p);
          if (q) {
            const mid = 'm' + (++mm);
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

/** the unblocked requests of a validation -> {nodes, mains: [{req, node, mentions}]}. Wire ids: w<k> for the k-th unblocked request */
export function toNodes(spec, v) {
  const keep = v.requests.filter(R => !R.blocked);
  if (!keep.length) return { nodes: [], mains: [] };
  const nodes = K.parse(programOf(keep.map(R => ({ type: R.type, args: R.args }))));
  const byId = new Map(nodes.map(n => [n.id, n])), mains = [];
  const refs = x => x && typeof x === 'object' && !Array.isArray(x) && typeof x.ref === 'string' ? [x.ref] : Array.isArray(x) ? x.flatMap(refs) : [];
  keep.forEach((R, k) => {
    const node = byId.get('w' + (k + 1)); if (!node) throw new Error('lines_reader: no wire for request ' + R.index);
    const ids = [...new Set(Object.values(node.args).flatMap(refs))];
    mains.push({ req: R, node, mentions: ids.map(id => byId.get(id)).filter(x => x && x.type === 'mention'), dependencies: ids.filter(id => /^w\d+$/.test(id)) });
  });
  return { nodes, mains };
}

// ---------------------------------------------------------------- the grammar
const gq = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
/** GBNF from the legend and the learned keys: one line per request, `[trigger] type act key=value ...`; free text only inside the
 *  brackets, quoted values and descriptions. Keys of an act may come in any order and each at most once is not expressible compactly,
 *  so the grammar bounds the vocabulary (types, acts, keys per act, enum values) and the validator checks the rest. */
export function grammar(spec) {
  const rules = [], keyRule = new Map();
  const valueRule = k => {
    const kind = spec.kind(k);
    if (kind === 'enum') return '(' + spec.values(k).map(gq).join(' | ') + ')';
    if (kind === 'number') return 'num';
    if (kind === 'point') return 'num "," num';
    return 'val';
  };
  for (const k of [...new Set(Object.values(spec.act_keys).flat())].sort()) { const r = 'k-' + k.replace(/[^A-Za-z0-9]/g, '-'); keyRule.set(k, r); rules.push(`${r} ::= ${gq(k + '=')} ${valueRule(k)}`); }
  const acts = [];
  for (const [act, keys] of Object.entries(spec.act_keys)) {
    const head = spec.actions.has(act) ? `"command action=${act}"` : spec.asks.has(act) ? `"question ask=${act}"` : ['fact', 'rule'].includes(act) ? gq(act) : null;
    if (!head) continue;
    const r = 'a-' + act.replace(/[^A-Za-z0-9]/g, '-');
    acts.push(r);
    rules.push(`${r} ::= ${head}` + (keys.length ? ` (" " (${keys.map(k => keyRule.get(k)).join(' | ')}))*` : ''));
  }
  return [
    'root ::= (line ("\\n" line)*)?',
    'line ::= "[" trig "] " act',
    'trig ::= [^\\]\\n]+',
    'act ::= ' + acts.join(' | '),
    'num ::= "-"? [0-9]+ ("." [0-9]+)?',
    'val ::= "\\"" ([^"\\\\\\n] | "\\\\" ["\\\\/bfnrtu])* "\\"" | bare',
    'bare ::= ([^ "\\n()] | "(" [^)\\n]* ")")*',
    ...rules,
  ].join('\n') + '\n';
}
