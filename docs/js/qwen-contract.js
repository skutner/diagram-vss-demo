// The Qwen3 reader's contract (training/qwen/QWEN3_PLAN.md B4-B7): the prompt and the JSON schema built from the legend, a strict
// JSON parser that keeps offsets, the validation of a whole output, the mapping of a validated output to SOP Lang wires, and the
// score from the runtime's token probabilities. Pure functions: the browser (docs/js/qwen-reader.js) and the Node tests
// (training/qwen/test_qwen_contract.mjs) use the same code. Nothing here executes model output; it only reads it as data.

/** keys the contract leaves out: not legend questions, or (topic) a 248-value help list the prompt would have to spell out */
export const EXCLUDED_KEYS = ['position2', 'anchor2', 'region', 'topic'];
/** shape-valued legend keys (kind "names") take a list of shape items */
const ITEM_KINDS = ['name', 'ref', 'context', 'like'];
export const LIMITS = { requests: 16, notUnderstood: 8, items: 8, texts: 16, count: 12 };
/** a relative position needs an anchor; an anchor needs a position except for these acts (the same combinations neural.js joint decoding drops) */
const RELATIVE = ['leftOf', 'rightOf', 'above', 'below', 'inside', 'onTop', 'near', 'between'], ANCHOR_ALONE = ['nearest', 'connected', 'check', 'arrange', 'equalize'];
const BAD_TEXT = /[\u0000-\u001f\u007f]|<\||\|>/;
const ID_RE = /^r[1-9][0-9]?$/;

/** the contract's vocabulary from the legend and the reader file (docs/model/qwen3/reader.json):
 *  {acts: [{do, type, keys}], keys: Map key -> {kind, values|null, ask}, order: [key], descKeys}.
 *  serialize: the engine's SOP Lang serializer (logic.js serialize). The keys are put in its canonical order: the runtime's grammar keeps
 *  the order of a schema's properties, so a key listed before the one the model writes first could never be written (found during
 *  development: with the legend's own order, `count` and `name` came before `shape` and were never written). */
export function buildSpec(legend, reader, serialize) {
  const actVals = new Set(Object.keys((legend.get('action') || {}).values || {})), askVals = new Set(Object.keys((legend.get('ask') || {}).values || {}));
  let order = [...legend.questions.keys()].filter(k => !EXCLUDED_KEYS.includes(k) && k !== 'action' && k !== 'ask');
  if (!serialize) throw new Error('qwen contract: the SOP Lang serializer is needed for the key order');
  const seq = serialize({ id: 'x', type: 'command', args: Object.fromEntries(order.map(k => [k, 1])) }).split(' ').slice(2).map(t => t.slice(0, t.indexOf('=')));
  order = seq.filter(k => order.includes(k));
  const keys = new Map();
  for (const k of order) {
    const q = legend.get(k), values = q.values ? Object.keys(q.values) : null;
    const kind = values && (q.kind === 'enum' || q.kind === 'text') ? 'enum' : q.kind;
    keys.set(k, { kind, values, ask: q.ask || null });
  }
  const acts = [];
  for (const [act, list] of Object.entries(reader.act_keys)) {
    const type = actVals.has(act) ? 'command' : askVals.has(act) ? 'question' : act === 'fact' || act === 'rule' ? act : null;
    if (!type) continue;
    acts.push({ do: act, type, keys: order.filter(k => list.includes(k)) });
  }
  const descKeys = order.filter(k => (reader.desc_keys || []).includes(k) && keys.get(k).kind === 'enum');
  const used = new Set(acts.flatMap(a => a.keys));
  return { acts, keys, order: order.filter(k => used.has(k)), descKeys, byDo: new Map(acts.map(a => [a.do, a])) };
}

/* ---------------------------------------------------------------- the JSON schema (given to the runtime as response_format) */
function valueSchema(spec, k) {
  const q = spec.keys.get(k);
  if (q.kind === 'enum') return { enum: q.values };
  if (q.kind === 'number') return k === 'count' ? { type: 'integer', minimum: 1 } : { type: 'number' };
  if (q.kind === 'name' || q.kind === 'text') return { type: 'string' };
  if (q.kind === 'texts') return { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: LIMITS.texts };
  if (q.kind === 'point') return { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 };
  if (q.kind === 'names') return { type: 'array', minItems: 1, maxItems: LIMITS.items, items: { oneOf: itemSchemas(spec) } };
  throw new Error(`qwen contract: no schema for legend kind ${q.kind} (${k})`);
}
function itemSchemas(spec) {
  const one = (k, s) => ({ type: 'object', additionalProperties: false, required: [k], properties: { [k]: s } });
  const desc = { type: 'object', additionalProperties: false, minProperties: 1, properties: Object.fromEntries(spec.descKeys.map(k => [k, { enum: spec.keys.get(k).values }])) };
  return [one('name', { type: 'string' }), one('ref', { type: 'string', pattern: '^r[1-9][0-9]?$' }), one('context', { type: 'string' }), one('like', desc)];
}
export function buildSchema(spec) {
  const args = { type: 'object', additionalProperties: false, properties: Object.fromEntries(spec.order.map(k => [k, valueSchema(spec, k)])) };
  return {
    type: 'object', additionalProperties: false, required: ['requests', 'not_understood'],
    properties: {
      requests: { type: 'array', maxItems: LIMITS.requests, items: { type: 'object', additionalProperties: false, required: ['id', 'text', 'do', 'args'],
        properties: { id: { type: 'string', pattern: '^r[1-9][0-9]?$' }, text: { type: 'string' }, do: { enum: spec.acts.map(a => a.do) }, args } } },
      not_understood: { type: 'array', maxItems: LIMITS.notUnderstood, items: { type: 'string' } }
    }
  };
}

/* ---------------------------------------------------------------- the prompt */
const TYPE_DOC = { command: 'Something the user wants done', question: 'Something the user wants to know', fact: 'A statement that should hold in the world', rule: 'A default that applies to future facts' };
/** the user turn: the names on the reader's drawing and the message */
export const userContent = (names, text) => `Names on the canvas: ${names.length ? names.join(', ') : '(none)'}\nMessage: ${text}`;
/** the system prompt (static: the runtime caches it between messages). wireDocs: the engine's own wire-type descriptions */
export function buildPrompt(spec, reader, wireDocs) {
  const doc = t => (wireDocs && wireDocs[t]) || TYPE_DOC[t];
  const L = [];
  L.push('You turn one message to a diagram editor into editor requests, written as JSON. Use only the acts, keys and values listed here.');
  L.push('');
  L.push('Write {"requests": [...], "not_understood": [...]}.');
  L.push('A request is {"id": "r1", "text": "...", "do": "...", "args": {...}}:');
  L.push('- id: r1, r2, r3 ... in order.');
  L.push('- text: the words of the message that make this request, copied exactly.');
  L.push('- do: one act from the lists below.');
  L.push('- args: only keys listed for that act, in the order listed, and only values the message states. Leave a key out when the message does not give it.');
  L.push('not_understood: words of the message that ask for something these acts cannot do, copied exactly. Words that are not a request (remarks, reasons, greetings) go nowhere.');
  L.push('');
  L.push(`A shape key (${spec.order.filter(k => spec.keys.get(k).kind === 'names').join(', ')}) takes a list of shapes, each one of:`);
  L.push('{"name": "..."}: a shape by its name;');
  L.push('{"ref": "r1"}: the shape that request r1 of this message creates;');
  L.push('{"context": "..."}: a shape the conversation mentioned before, referred to by these words of the message;');
  L.push(`{"like": {...}}: the shapes that fit a description, with the keys ${spec.descKeys.join(', ')}.`);
  L.push('');
  for (const type of ['command', 'question', 'fact', 'rule']) {
    const acts = spec.acts.filter(a => a.type === type); if (!acts.length) continue;
    L.push(`${type === 'command' ? 'Commands' : type === 'question' ? 'Questions' : type === 'fact' ? 'Fact' : 'Rule'} (${doc(type).toLowerCase()}); act: keys`);
    for (const a of acts) L.push(`${a.do}: ${a.keys.join(' ') || '(no keys)'}`);
    L.push('');
  }
  L.push('Keys:');
  for (const k of spec.order) {
    const q = spec.keys.get(k), what = q.ask ? ` (${q.ask})` : '';
    if (q.kind === 'enum') L.push(`${k}${what}: ${q.values.join(' | ')}`);
    else if (q.kind === 'names') L.push(`${k}${what}: a list of shapes`);
    else if (q.kind === 'number') L.push(`${k}${what}: a number`);
    else if (q.kind === 'point') L.push(`${k}${what}: [x, y]`);
    else if (q.kind === 'texts') L.push(`${k}${what}: a list of texts`);
    else L.push(`${k}${what}: a text`);
  }
  for (const ex of reader.examples || []) {
    L.push('');
    L.push(`Example. ${userContent(ex.names, ex.text)}`);
    L.push(JSON.stringify(ex.output));
  }
  return L.join('\n');
}

/* ---------------------------------------------------------------- a strict JSON parser that keeps offsets (UTF-16, half-open) */
/** -> {ok, value, node, error}; node: {t: 'obj'|'arr'|'str'|'num'|'bool'|'null', s, e, v?, members?: [{key, ks, ke, node}], items?: [node]}.
 *  Strict JSON (RFC 8259): one value, optional whitespace around it, no comments, no trailing commas, no duplicate keys. */
export function parseJSON(text) {
  let i = 0; const n = text.length;
  const fail = msg => { const e = new Error(`${msg} at character ${i}`); e.at = i; throw e; };
  const ws = () => { while (i < n && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')) i++; };
  function str() {
    const s = i; if (text[i] !== '"') fail('expected a string'); i++; let out = '';
    for (;;) {
      if (i >= n) fail('unterminated string');
      const c = text[i];
      if (c === '"') { i++; break; }
      if (c === '\\') {
        const d = text[i + 1], map = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
        if (d in map) { out += map[d]; i += 2; continue; }
        if (d === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) { out += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16)); i += 6; continue; }
        fail('bad escape');
      }
      if (c < ' ') fail('control character in a string');
      out += c; i++;
    }
    return { t: 'str', s, e: i, v: out };
  }
  function value() {
    ws(); const s = i, c = text[i];
    if (c === '{') {
      i++; const members = [], seen = new Set(); ws();
      if (text[i] === '}') { i++; return { t: 'obj', s, e: i, members }; }
      for (;;) {
        ws(); const k = str(); if (seen.has(k.v)) fail(`duplicate key "${k.v}"`); seen.add(k.v);
        ws(); if (text[i] !== ':') fail('expected :'); i++;
        const node = value(); members.push({ key: k.v, ks: k.s, ke: k.e, node }); ws();
        if (text[i] === ',') { i++; continue; } if (text[i] === '}') { i++; return { t: 'obj', s, e: i, members }; }
        fail('expected , or }');
      }
    }
    if (c === '[') {
      i++; const items = []; ws();
      if (text[i] === ']') { i++; return { t: 'arr', s, e: i, items }; }
      for (;;) { items.push(value()); ws(); if (text[i] === ',') { i++; continue; } if (text[i] === ']') { i++; return { t: 'arr', s, e: i, items }; } fail('expected , or ]'); }
    }
    if (c === '"') return str();
    const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (m && m[0]) { i += m[0].length; return { t: 'num', s, e: i, v: Number(m[0]) }; }
    for (const [w, v] of [['true', true], ['false', false], ['null', null]]) if (text.startsWith(w, i)) { i += w.length; return { t: v === null ? 'null' : 'bool', s, e: i, v }; }
    fail('expected a value');
  }
  const plain = node => node.t === 'obj' ? Object.fromEntries(node.members.map(m => [m.key, plain(m.node)])) : node.t === 'arr' ? node.items.map(plain) : node.v;
  try { const node = value(); ws(); if (i !== n) fail('text after the JSON value'); return { ok: true, node, value: plain(node), error: null }; }
  catch (e) { return { ok: false, node: null, value: null, error: e.message }; }
}

/* ---------------------------------------------------------------- validation of a whole output */
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const q = s => `“${String(s).length > 60 ? String(s).slice(0, 57) + '…' : s}”`;
/** the first occurrence of `words` in `text` at or after `from` that overlaps none of `used` ([c0, c1) pairs) -> [c0, c1] | null */
function locate(text, words, used, from = 0) {
  if (!words) return null;
  for (let at = text.indexOf(words, from); at >= 0; at = text.indexOf(words, at + 1)) {
    const c1 = at + words.length;
    if (!used.some(([a, b]) => at < b && c1 > a)) return [at, c1];
  }
  return from > 0 ? locate(text, words, used, 0) : null;
}
/** check one value of `key` against the legend -> error text | null (a shape list is checked item by item).
 *  R: {src (the request's quoted words), made (names created by earlier requests of this output, lower case)}; ctx: {text, names} */
function valueError(spec, key, v, ctx, R) {
  const k = spec.keys.get(key), lc = x => String(x).toLowerCase();
  const inQuote = x => lc(R.src).includes(lc(x).trim());
  const known = x => (ctx.names || []).some(nm => lc(nm) === lc(x).trim()) || R.made.has(lc(x).trim());
  if (k.kind === 'enum') return typeof v === 'string' && k.values.includes(v) ? null : `${key}=${JSON.stringify(v)} is not a legend value of ${key}`;
  if (k.kind === 'number') {
    if (typeof v !== 'number' || !Number.isFinite(v)) return `${key} must be a number`;
    if (key === 'count' && (!Number.isInteger(v) || v < 1 || v > LIMITS.count)) return `count must be a whole number from 1 to ${LIMITS.count}`;
    return null;
  }
  if (k.kind === 'name' || k.kind === 'text') {
    if (!(typeof v === 'string' && v.trim())) return `${key} must be a non-empty text`;
    if (BAD_TEXT.test(v) || (k.kind === 'name' && v.includes(','))) return `${key} ${q(v)} has characters a ${k.kind} cannot have`;
    return inQuote(v) ? null : `${key} ${q(v)} is not in the words of the request`;
  }
  if (k.kind === 'texts') {
    if (!(Array.isArray(v) && v.length && v.length <= LIMITS.texts && v.every(x => typeof x === 'string' && x.trim()))) return `${key} must be a list of non-empty texts`;
    const bad = v.find(x => BAD_TEXT.test(x) || x.includes(',') || !inQuote(x));
    return bad == null ? null : `${key}: ${q(bad)} is not in the words of the request, or has characters a text item cannot have`;
  }
  if (k.kind === 'point') return Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'number' && Number.isFinite(x)) ? null : `${key} must be two numbers [x, y]`;
  if (k.kind === 'names') {
    if (!Array.isArray(v) || !v.length || v.length > LIMITS.items) return `${key} must be a list of 1 to ${LIMITS.items} shapes`;
    for (const it of v) {
      if (!isObj(it) || Object.keys(it).length !== 1 || !ITEM_KINDS.includes(Object.keys(it)[0])) return `${key}: a shape must be exactly one of ${ITEM_KINDS.join(', ')}`;
      const [kind] = Object.keys(it), x = it[kind];
      if (kind === 'name') {
        if (!(typeof x === 'string' && x.trim())) return `${key}: an empty name`;
        if (BAD_TEXT.test(x) || x.includes(',')) return `${key}: the name ${q(x)} has characters a name cannot have`;
        if (!known(x) && !inQuote(x)) return `${key}: ${q(x)} is neither a name on the drawing nor in the words of the request`;
      }
      if (kind === 'ref' && !(typeof x === 'string' && ID_RE.test(x))) return `${key}: a reference must be r<number>`;
      if (kind === 'context' && !(typeof x === 'string' && x.trim())) return `${key}: a context reference needs its words`;
      if (kind === 'context' && !inQuote(x)) return `${key}: the words ${q(x)} are not in the words of the request`;
      if (kind === 'like') {
        if (!isObj(x) || !Object.keys(x).length) return `${key}: an empty description`;
        for (const [dk, dv] of Object.entries(x)) {
          if (!spec.descKeys.includes(dk)) return `${key}: a description cannot use the key ${dk}`;
          const e = valueError(spec, dk, dv, ctx, R); if (e) return `${key}: ${e}`;
        }
        if (x.color && x.notColor && x.color === x.notColor) return `${key}: a description with the same color and notColor`;
      }
    }
    return null;
  }
  return `${key}: unsupported kind ${k.kind}`;
}
/** the refs a request's args use (ids of earlier requests) */
const refsOfArgs = args => Object.values(args || {}).flatMap(v => Array.isArray(v) ? v.filter(it => isObj(it) && typeof it.ref === 'string').map(it => it.ref) : []);
const usesContext = args => Object.values(args || {}).some(v => Array.isArray(v) && v.some(it => isObj(it) && own(it, 'context')));

/** the whole output, before anything can execute.
 *  out: {content (the raw generated text), finish (finish_reason), reasoning (reasoning text, '' if none), error (runtime failure)}
 *  ctx: {text (the message read), names, last}
 *  -> {ok, errors (whole-output: nothing may run), parsed, requests: [{index, id, src, span, do, type, args, errors, blocked}], notUnderstood: [{src, span, error}]} */
export function validate(spec, out, ctx) {
  const res = { ok: false, errors: [], parsed: null, requests: [], notUnderstood: [] };
  if (out.error) { res.errors.push(`the model run failed: ${out.error}`); return res; }
  if (out.finish !== 'stop') res.errors.push(out.finish === 'length' ? 'the output was cut off at the token limit' : `the output did not finish normally (${out.finish || 'no finish reason'})`);
  if (out.reasoning && String(out.reasoning).trim()) res.errors.push('the model wrote hidden reasoning, although thinking is switched off');
  // the runtime's grammar for a JSON-schema response (llama.cpp common/chat-auto-parser-generator.cpp at the pinned commit) allows the JSON
  // alone or inside one ```json ... ``` fence: exactly that wrapper is blanked to spaces of the same length (offsets stay those of the output)
  let content = String(out.content || '');
  const fm = /^(\s*)```json([\s\S]*?)```(\s*)$/.exec(content);
  if (fm) { content = fm[1] + ' '.repeat(7) + fm[2] + ' '.repeat(3) + fm[3]; res.fenced = true; }
  const p = parseJSON(content); res.parsed = p;
  if (!p.ok) { res.errors.push(`the output is not valid JSON (${p.error})`); return res; }
  const top = p.value;
  if (!isObj(top)) { res.errors.push('the output is not a JSON object'); return res; }
  for (const k of Object.keys(top)) if (k !== 'requests' && k !== 'not_understood') res.errors.push(`the output has a field the contract does not have: ${k}`);
  if (!Array.isArray(top.requests)) res.errors.push('requests is missing or not a list');
  if (!Array.isArray(top.not_understood)) res.errors.push('not_understood is missing or not a list');
  if (res.errors.length) return res;
  // at the schema's limit the runtime stops the list: what followed may be missing, so nothing of the output is used
  if (top.requests.length >= LIMITS.requests) res.errors.push(`the output reached the limit of ${LIMITS.requests} requests, so requests after it may be missing`);
  if (top.not_understood.length >= LIMITS.notUnderstood) res.errors.push(`the output reached the limit of ${LIMITS.notUnderstood} not-understood parts`);
  const ids = new Set();
  top.requests.forEach((r, i) => {
    if (!isObj(r)) { res.errors.push(`request ${i + 1} is not an object`); return; }
    for (const k of Object.keys(r)) if (!['id', 'text', 'do', 'args'].includes(k)) res.errors.push(`request ${i + 1} has a field the contract does not have: ${k}`);
    if (typeof r.id !== 'string' || !ID_RE.test(r.id)) res.errors.push(`request ${i + 1} has an id that is not r<number>`);
    else if (ids.has(r.id)) res.errors.push(`two requests have the id ${r.id}`);
    else ids.add(r.id);
  });
  if (res.errors.length) return res;
  // per request: a failure blocks this request (and what refers to it), never the others
  const used = [], before = new Map(), made = new Set();   // before: id -> the request, for refs to earlier creates; made: names they create
  let blockedSoFar = false;
  top.requests.forEach((r, index) => {
    const R = { index, id: r.id, src: typeof r.text === 'string' ? r.text.trim() : '', span: null, do: r.do, type: null, args: isObj(r.args) ? r.args : {}, errors: [], blocked: false, raw: r };
    const act = spec.byDo.get(r.do);
    if (!act) R.errors.push(`${JSON.stringify(r.do)} is not an act of the legend`); else R.type = act.type;
    if (typeof r.text !== 'string' || !R.src) R.errors.push('the request has no quoted words');
    else { R.span = locate(ctx.text, R.src, used, used.length ? used[used.length - 1][1] : 0); if (!R.span) R.errors.push(`its words ${q(R.src)} are not in the message`); else used.push(R.span); }
    if (!isObj(r.args)) R.errors.push('args is not an object');
    else if (act) {
      for (const [k, v] of Object.entries(r.args)) {
        if (!spec.keys.has(k)) { R.errors.push(`it uses ${k}, which is not a key of the contract`); continue; }
        if (!act.keys.includes(k)) { R.errors.push(`it uses ${k}, which ${r.do} does not take`); continue; }
        const e = valueError(spec, k, v, ctx, { src: R.src, made }); if (e) R.errors.push(e);
      }
      // combinations the engine would read otherwise than the legend says (the same ones neural.js joint decoding drops): asked, not changed
      const A = r.args;
      if (A.color && A.notColor && A.color === A.notColor) R.errors.push('it has the same color and notColor');
      if (RELATIVE.includes(A.position) && A.anchor == null) R.errors.push(`position ${A.position} needs an anchor (relative to which shape?)`);
      if (A.anchor != null && A.position == null && !ANCHOR_ALONE.includes(r.do)) R.errors.push('it has an anchor without a position');
      for (const id of refsOfArgs(r.args)) {
        const t = before.get(id);
        if (!t) R.errors.push(`it refers to ${id}, which is not an earlier request of this message`);
        else if (t.do !== 'create') R.errors.push(`it refers to ${id}, which does not create a shape`);
        else if (t.blocked) R.errors.push(`it uses what ${q(t.src || t.id)} would make, which could not be read`);
      }
      if (blockedSoFar && usesContext(r.args)) R.errors.push('it refers to an earlier shape (“' + Object.values(r.args).flat().filter(it => isObj(it) && it.context).map(it => it.context)[0] + '”), but an earlier request of this message could not be read, so which shape is meant is not known');
    }
    R.blocked = R.errors.length > 0; if (R.blocked) blockedSoFar = true;
    if (!R.blocked && r.do === 'create' && typeof r.args.name === 'string') made.add(r.args.name.trim().toLowerCase());
    res.requests.push(R); before.set(r.id, R);
  });
  for (const t of top.not_understood) {
    const src = typeof t === 'string' ? t.trim() : '', span = src ? locate(ctx.text, src, [], 0) : null;
    res.notUnderstood.push({ src, span, error: !src ? 'an empty not-understood part' : span ? null : `the words ${q(src)} are not in the message` });
  }
  res.ok = true;
  return res;
}

/* ---------------------------------------------------------------- mapping to SOP Lang wires */
/** a validated output -> {nodes, analyses}: per request one analysis (the gate's unit) and its wires (mentions first); nodes carry the
 *  non-enumerable `unit` and `span`, as the other readers' wires. ctx: {names, last}; next: the shared context rule (NeuralKit.NEXT_CONTEXT).
 *  A blocked request has an analysis and no wires. */
export function toNodes(spec, v, ctx, next) {
  const c = { names: (ctx.names || []).slice(), last: (ctx.last || []).slice(), refs: new Map() }, nodes = [], analyses = [];
  let m = 0;
  const hide = (o, k, val) => Object.defineProperty(o, k, { value: val, enumerable: false, configurable: true });
  for (const R of v.requests) {
    const a = { id: R.id, src: R.src, index: R.index, do: R.do, type: R.type, errors: R.errors.slice(), blocked: R.blocked, proposal: R.raw };
    hide(a, 'span', R.span); analyses.push(a);
    if (R.blocked) continue;
    const act = spec.byDo.get(R.do), args = {}, mentions = [];
    if (R.type === 'command') args.action = R.do; else if (R.type === 'question') args.ask = R.do;
    for (const k of act.keys) {
      if (!own(R.args, k)) continue;
      const val = R.args[k], kind = spec.keys.get(k).kind;
      if (kind !== 'names') { args[k] = val; continue; }
      const out = [];
      for (const it of val) {
        if (own(it, 'name')) { const hit = c.refs.get(String(it.name).toLowerCase()); out.push(hit || it.name); }
        else if (own(it, 'ref')) out.push({ ref: it.ref });
        else if (own(it, 'like')) { const mid = 'm' + (++m), mn = { id: mid, type: 'mention', args: Object.assign({}, it.like) }; mentions.push(mn); out.push({ ref: mid }); }
        else if (own(it, 'context')) {
          if (!c.last.length) { a.errors.push(`it refers to an earlier shape (${q(it.context)}), but no shape was mentioned before`); break; }
          out.push(...c.last);
        }
      }
      if (a.errors.length) break;
      args[k] = out.length === 1 ? out[0] : out;
    }
    if (a.errors.length) { a.blocked = true; continue; }
    const node = { id: R.id, type: R.type, args };
    hide(node, 'span', R.span); hide(node, 'src', R.src);
    for (const x of mentions.concat([node])) { hide(x, 'unit', a); if (x !== node) hide(x, 'span', R.span); }
    nodes.push(...mentions, node);
    if (next) next(c, node);
  }
  // a request that uses a wire of a request blocked here (its create was blocked during the mapping) is blocked too
  const made = new Set(nodes.map(x => x.id));
  const refs = v2 => v2 && typeof v2 === 'object' && !Array.isArray(v2) && typeof v2.ref === 'string' ? [v2.ref] : Array.isArray(v2) ? v2.flatMap(refs) : [];
  for (let changed = true; changed;) {
    changed = false;
    for (const x of nodes.slice()) {
      if (x.type === 'mention' || x.unit.blocked) continue;
      const miss = Object.values(x.args).flatMap(refs).find(r => !made.has(r));
      if (miss) { x.unit.blocked = true; x.unit.errors.push(`it uses ${miss}, which could not be read`); for (const y of nodes.filter(y => y.unit === x.unit)) made.delete(y.id); changed = true; }
    }
  }
  return { nodes: nodes.filter(x => !x.unit.blocked), analyses };
}

/* ---------------------------------------------------------------- the score from the runtime's token probabilities (B7) */
/** UTF-8 byte offset of every UTF-16 index of `s` (length s.length + 1) */
function byteOffsets(s) {
  const off = new Array(s.length + 1); let b = 0;
  for (let i = 0; i < s.length; i++) {
    off[i] = b; const c = s.charCodeAt(i);
    if (c < 0x80) b += 1; else if (c < 0x800) b += 2; else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) { off[i + 1] = b; b += 4; i++; } else b += 3;
  }
  off[s.length] = b; return off;
}
/** the generated tokens of a response (logprobs.content: [{id, token, logprob, bytes, top_logprobs}]) -> {text, tokens: [{b0, b1, logprob}]}
 *  | {error}. ids: the generated token ids (the response's `tokens`). The runtime stores a token's probability only once the text ends in a
 *  whole UTF-8 character, so a token that leaves a character unfinished has no entry and the next one carries the whole character with
 *  only its own probability: such an entry gets no probability (NaN), so the fields it touches have no score. An entry without its
 *  top_logprobs (as a speculative draft token would be) gets none either. */
export function tokensOf(logprobs, ids) {
  if (!logprobs || !Array.isArray(logprobs.content) || !logprobs.content.length) return { error: 'the runtime returned no token probabilities' };
  const C = logprobs.content, tokens = [], bytes = []; let b = 0, i = 0;
  for (const t of C) {
    const by = Array.isArray(t.bytes) ? t.bytes : null;
    if (!by) return { error: 'a token without its bytes' };
    let lp = typeof t.logprob === 'number' && Number.isFinite(t.logprob) && Array.isArray(t.top_logprobs) && t.top_logprobs.length ? t.logprob : NaN;
    if (Array.isArray(ids)) {
      let skipped = 0; while (i < ids.length && ids[i] !== t.id) { i++; skipped++; }
      if (i >= ids.length) return { error: 'the token probabilities do not match the generated tokens' };
      if (skipped) lp = NaN;
      i++;
    }
    tokens.push({ b0: b, b1: b + by.length, logprob: lp });
    bytes.push(...by); b += by.length;
  }
  let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); } catch (e) { return { error: 'the tokens do not decode as UTF-8' }; }
  return { text, tokens };
}
/** per request of a validated output, its semantic fields and their mean token log-probability; the request's score is the minimum.
 *  v: validate() result (v.parsed.node: the offsets of the raw text); tk: tokensOf() of the same raw text.
 *  -> [{fields: [{name, mean, n}], min, weakest, missing}] by request index */
export function scoreRequests(v, tk, raw) {
  if (!v.parsed || !v.parsed.ok) return [];
  if (tk.error || tk.text !== raw) return v.requests.map(() => ({ fields: [], min: NaN, weakest: null, missing: tk.error || 'the token text differs from the output text' }));
  const off = byteOffsets(raw);
  const inner = n => n.t === 'str' ? [n.s + 1, n.e - 1 > n.s + 1 ? n.e - 1 : n.s + 1] : [n.s, n.e];
  const reqs = v.parsed.node.members.find(x => x.key === 'requests').node.items;
  return reqs.map(rn => {
    // a field's tokens: every generated token whose bytes overlap one of its character ranges (key name, value); a token is counted once
    const fields = [], add = (name, ranges) => {
      const b = ranges.filter(([s, e]) => e > s).map(([s, e]) => [off[s], off[e]]);
      const hit = tk.tokens.filter(t => b.some(([b0, b1]) => t.b0 < b1 && t.b1 > b0));
      fields.push({ name, mean: hit.length ? hit.reduce((x, t) => x + t.logprob, 0) / hit.length : NaN, n: hit.length });
    };
    const get = k => rn.members.find(x => x.key === k);
    const d = get('do'); if (d) add('do', [inner(d.node)]);
    const args = get('args');
    if (args && args.node.t === 'obj') for (const am of args.node.members) {
      const keyR = [am.ks + 1, am.ke - 1];
      if (am.node.t === 'arr' && am.node.items.some(it => it.t === 'obj')) {
        am.node.items.forEach((it, j) => {
          for (const im of it.members || []) {
            if (im.node.t === 'obj') for (const dm of im.node.members) add(`${am.key}[${j}].${im.key}.${dm.key}`, [keyR, [im.ks + 1, im.ke - 1], [dm.ks + 1, dm.ke - 1], inner(dm.node)]);
            else add(`${am.key}[${j}].${im.key}`, [keyR, [im.ks + 1, im.ke - 1], inner(im.node)]);
          }
        });
      } else if (am.node.t === 'arr') add(am.key, [keyR, ...am.node.items.map(inner)]);
      else add(am.key, [keyR, inner(am.node)]);
    }
    // the decision to stop: the brace that closes args (no further argument) and the separator after the request (another request or
    // the end of the list), so a left-out argument or request lowers the score too
    if (args) { let k = rn.e; while (k < raw.length && /\s/.test(raw[k])) k++; add('end', [[args.node.e - 1, args.node.e], [k, Math.min(raw.length, k + 1)]]); }
    const missing = fields.some(f => !Number.isFinite(f.mean)) ? 'a field has no token probability' : null;
    const finite = fields.filter(f => Number.isFinite(f.mean));
    const w = finite.length ? finite.reduce((a, b) => b.mean < a.mean ? b : a) : null;
    return { fields, min: missing || !w ? NaN : w.mean, weakest: w ? w.name : null, missing };
  });
}
