/* Saved model translations: artifact validation, literal-name binding and exact run continuity. No language formalizer. */
(function (root) {
'use strict';
const copy = x => JSON.parse(JSON.stringify(x));
const fail = s => { throw new Error(s); };
async function sha(text) {
  if (typeof module !== 'undefined') return require('node:crypto').createHash('sha256').update(text).digest('hex');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), x => x.toString(16).padStart(2, '0')).join('');
}
function sections(text) {
  const out = new Map(); let key = null, lines = [];
  const save = () => { if (key != null) { if (out.has(key)) fail(`Duplicate section ${key}`); out.set(key, lines.filter(l => l.trim() && !l.trim().startsWith('#')).join('\n')); } };
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^# (turn-\d+)\s*$/);
    if (m) { save(); key = m[1]; lines = []; } else if (key != null) lines.push(line);
  }
  save(); return out;
}
async function validate(manifest, catalog, readFile, K) {
  if (manifest.format !== 1 || manifest.model !== 'gpt-6.1-sol') fail('Unknown saved corpus format or model');
  const expected = new Map(catalog.map(e => [e.id, e])), seen = new Set(), ids = new Set(), files = new Map(), entries = new Map();
  for (const e of manifest.examples || []) {
    if (seen.has(e.id) || !expected.has(e.id)) fail(`Duplicate or unknown example ${e.id}`); seen.add(e.id);
    const source = expected.get(e.id);
    if (!['opening', 'empty'].includes(e.initialContext) || !Array.isArray(e.names) || e.names.some(n => typeof n !== 'string' || !n)) fail(`Invalid context/names ${e.id}`);
    if (new Set(e.names.map(n => n.toLowerCase())).size !== e.names.length) fail(`Duplicate names ${e.id}`);
    if (!Array.isArray(e.turns) || e.turns.length !== source.turns.length) fail(`Missing turns ${e.id}`);
    const turns = [];
    for (let i = 0; i < e.turns.length; i++) {
      const t = e.turns[i];
      if (t.id !== `${e.id}:${i}` || ids.has(t.id) || t.turn !== i) fail(`Duplicate or invalid occurrence ${t.id}`); ids.add(t.id);
      if (t.input !== source.turns[i] || await sha(t.input) !== t.inputSha256) fail(`Source drift/hash ${t.id}`);
      if (!/^[\w-]+\.sop$/.test(t.program) || t.section !== `turn-${i}`) fail(`Invalid target ${t.id}`);
      if (!files.has(t.program)) files.set(t.program, sections(await readFile(t.program)));
      const sec = files.get(t.program); if (!sec.has(t.section)) fail(`Missing target ${t.id}`);
      const program = sec.get(t.section);
      if (await sha(program) !== t.programSha256) fail(`Program hash ${t.id}`);
      if (!['supported', 'partial', 'noop', 'unsupported'].includes(t.status)) fail(`Invalid status ${t.id}`);
      if (t.status !== 'supported' && !t.reason) fail(`Missing reason ${t.id}`);
      if (['noop', 'unsupported'].includes(t.status) && program) fail(`Nonempty ${t.status} ${t.id}`);
      if (['supported', 'partial'].includes(t.status) && !program) fail(`Empty executable ${t.id}`);
      const p = t.provenance;
      if (!p || !['model-generated', 'pre-existing-sop'].includes(p.kind) || (p.kind === 'model-generated' && (p.model !== manifest.model || !p.sessionId || !p.date)) || !Array.isArray(t.repairs)) fail(`Missing provenance ${t.id}`);
      const nodes = K.parse(program);
      turns.push(Object.assign(copy(t), { programText: program, nodes }));
    }
    entries.set(e.id, Object.assign(copy(e), { turns }));
  }
  if (seen.size !== expected.size) fail('Missing examples: ' + [...expected.keys()].filter(id => !seen.has(id)).join(', '));
  return { manifest: copy(manifest), entries, counts: [...entries.values()].reduce((a, e) => { e.turns.forEach(t => a[t.status]++); return a; }, { supported: 0, partial: 0, noop: 0, unsupported: 0 }) };
}
const NAME_ROLES = new Set(['name', 'target', 'from', 'to', 'anchor', 'anchor2', 'members', 'items', 'items2', 'parents']);
function bindNodes(nodes, map) {
  const lookup = new Map(Object.entries(map || {}).map(([a, b]) => [a.toLowerCase(), b]));
  const bind = v => typeof v === 'string' ? (lookup.get(v.toLowerCase()) || v) : Array.isArray(v) ? v.map(bind) : v;
  return copy(nodes).map(n => { for (const k of Object.keys(n.args)) if (NAME_ROLES.has(k)) n.args[k] = bind(n.args[k]); return n; });
}
function bindText(text, map) {
  // Source identifiers keep their exact spelling. In particular a shape A does not rename the article "a" or label "A".
  const lookup = new Map(Object.entries(map || {}));
  return text.replace(/"(?:\\.|[^"\\])*"|(?<!\w)'(?:\\.|[^'\\])*'(?!\w)|[A-Za-z_][\w-]*/g, token => lookup.get(token) || token);
}
function families(entry) {
  return entry.turns.flatMap(t => t.nodes || []).filter(n => n.type === 'command' && ['create', 'duplicate'].includes(n.args.action) && Number.isInteger(n.args.count) && n.args.count > 1 && typeof n.args.name === 'string')
    .map(n => Array.from({ length: n.args.count }, (_, i) => n.args.name + (i ? i + 1 : '')));
}
function allocate(names, occupied, batches = []) {
  const used = new Set(occupied.map(n => n.toLowerCase())), reserved = new Set(names.map(n => n.toLowerCase())), map = {};
  for (const family of batches) {
    if (family.some(n => Object.hasOwn(map, n))) continue;
    let base = family[0], k = 2;
    const own = new Set(family.map(n => n.toLowerCase()));
    const members = b => family.map((_, i) => b + (i ? i + 1 : ''));
    const clash = b => members(b).some(n => used.has(n.toLowerCase()) || (reserved.has(n.toLowerCase()) && !own.has(n.toLowerCase())));
    while (clash(base)) base = family[0] + k++;
    members(base).forEach((n, i) => { map[family[i]] = n; used.add(n.toLowerCase()); });
  }
  for (const n of names) {
    if (Object.hasOwn(map, n)) continue;
    let v = n, k = 2;
    if (used.has(n.toLowerCase())) { do { v = n + k++; } while (used.has(v.toLowerCase()) || reserved.has(v.toLowerCase())); }
    map[n] = v; used.add(v.toLowerCase());
  }
  return map;
}
function capture(rd) {
  return JSON.stringify({ state: rd.world.snapshot(), undo: rd.world.undoStack, redo: rd.world.redoStack, last: rd.last, pending: rd.pending, held: rd.held, focus: rd.focusCell, plugins: rd.engine.plugins.map(p => [p.name, p.enabled]) });
}
function good(result) { return result && !(result.errors || []).length && !result.steps.some(s => s.error || s.skipped || (s.issues || []).some(i => i.level === 'error' || i.level === 'warn')); }
function create(opts) {
  const { K, rd } = opts; let loaded = null, loading = null, run = null, serial = 0, error = null;
  async function load() {
    if (loaded) return loaded;
    if (!loading) loading = (async () => {
      const manifest = await opts.readManifest();
      loaded = await validate(manifest, opts.catalog(), opts.readFile, K); return loaded;
    })().catch(e => { error = e.message; throw e; });
    return loading;
  }
  function invalidate(reason) { run = null; serial++; return reason; }
  async function begin(id, original, effective, map, token) {
    const data = await load(), e = data.entries.get(id);
    if (!e || JSON.stringify(original) !== JSON.stringify(e.turns.map(t => t.input)) || effective.length !== original.length) fail('Unknown or edited saved example');
    for (let i = 0; i < original.length; i++) {
      const bound = original[i].startsWith('@') ? bindNodes(e.turns[i].nodes, map).map(K.serialize).join('\n') : bindText(original[i], map);
      if (effective[i] !== bound) fail(`Effective input mismatch ${id}:${i}`);
    }
    run = { id, original: original.slice(), effective: effective.slice(), map: copy(map || {}), token, next: 0, state: capture(rd), serial: ++serial };
    return run.serial;
  }
  async function execute(meta, original, effective) {
    const unavailable = reason => ({ nodes: [], notes: [], saved: { status: 'unavailable', reason, originalInput: original, effectiveInput: effective }, unavailable: true });
    if (!meta) { invalidate('direct input'); return unavailable('Saved translations are available only from an unchanged built-in example.'); }
    const r = run;
    if (!r || r.id !== meta.exampleId || r.token !== meta.runToken || r.next !== meta.turn || original !== r.original[r.next] || effective !== r.effective[r.next]) return unavailable('Saved example occurrence or sequence is unavailable.');
    if (capture(rd) !== r.state) { invalidate(); return unavailable('The saved drawing or history changed outside this example; start the example again.'); }
    const t = loaded.entries.get(r.id).turns[r.next];
    if (await sha(original) !== t.inputSha256 || await sha(t.programText) !== t.programSha256 || run !== r || capture(rd) !== r.state) { invalidate(); return unavailable('Saved source, program or context changed.'); }
    const nodes = bindNodes(t.nodes, r.map), evidence = Object.assign(copy(t), { originalInput: original, effectiveInput: effective, originalSOP: t.programText, boundSOP: nodes.map(K.serialize).join('\n'), exampleId: r.id, runToken: r.token });
    delete evidence.nodes;
    const out = { nodes, notes: t.reason ? [t.reason] : [], saved: evidence };
    if (!nodes.length) { r.next++; r.state = capture(rd); return out; }
    const preview = K.previewRun(rd.engine, nodes);
    if (!good(preview)) { invalidate(); return unavailable('Stored program cannot execute completely in this context: ' + preview.steps.filter(s => s.error || s.skipped || (s.issues || []).length).map(s => s.error ? s.error.message : s.skipped || (s.issues || []).map(i => i.msg).join('; ')).join('; ')); }
    if (run !== r || capture(rd) !== r.state) return unavailable('Saved run was replaced.');
    const before = JSON.parse(r.state);
    try { out.result = rd.engine.run(nodes); }
    catch (e) { out.result = null; out.saved.reason = e.message; }
    if (!good(out.result)) {
      rd.world.restore(before.state); rd.world.undoStack = before.undo; rd.world.redoStack = before.redo;
      rd.last = before.last; rd.pending = before.pending; rd.held = before.held; rd.focusCell = before.focus;
      invalidate(); out.unavailable = true; out.saved.status = 'unavailable'; out.saved.reason = 'Unexpected engine error; this turn was restored and remaining saved context was invalidated.'; return out;
    }
    const touched = out.result.steps.flatMap(s => s.patches || []).flatMap(p => p.op === 'add' ? [p.shape.name] : p.op === 'set' ? [p.name] : p.op === 'rename' ? [p.to] : []);
    const alive = [...new Set(touched)].filter(n => rd.world.find(n)); if (alive.length) rd.last = alive;
    r.next++; r.state = capture(rd); return out;
  }
  return { load, begin, execute, invalidate, entry: id => loaded && loaded.entries.get(id), info: () => copy({ ready: !!loaded, error, counts: loaded && loaded.counts, run: run && { id: run.id, next: run.next, token: run.token } }) };
}
const api = { sha, sections, validate, bindNodes, bindText, families, allocate, capture, good, create };
if (typeof module !== 'undefined') module.exports = api; else root.SavedReaderKit = api;
})(typeof window !== 'undefined' ? window : this);
