// sets.mjs: the named test sets of MODERNBERT_PARITY_PLAN.md section 4, their parts, and nothing else.
//   fresh2, short3   calibration = SHA256(id) % 3 == 0, the rest `test`; messages with a pending gold wire are left out (the protocol of
//                    calibrate_modernbert.mjs, TRAIN_PLAN_1103.md:154)
//   collected_1      batch_01 (kind as_sent) and batch_02 (kind corrected): every message, part `all`, no calibration part
//   scenes_test      every step of the 4 scenes, part `all`; the session of a step is its scene (the file)
//   nl_a             folder with opus/*.jsonl and gpt/*.jsonl (the same rows, each teacher's labels); calibration = SHA256(split key) % 2 == 0,
//                    the rest `development`. The split key is the row's session or group, else its id; a session or a group never crosses
//   nl_b             the same layout as nl_a, one part, `all` (pure test: no calibration part, never used in a fit); read once, at M5.
//                    LLM_BENCH_ROOT (a folder holding nl_b/{opus,gpt}) redirects ONLY this set, for testing the tools on a synthetic copy; the manifest of a
//                    collection then shows that root in its files
// Items carry: id, set, part, kind, writer, session, step, group, setup, domain, names, groups, text, wires (the primary teacher's: Opus for
// nl_*), altWires (the second teacher's, gpt, or null), source.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BENCH = fileURLToPath(new URL('../../sketch/llm_bench/', import.meta.url));
export const SET_ORDER = ['fresh2', 'short3', 'collected_1', 'scenes_test', 'nl_a', 'nl_b'];
/** the parts a set has; the part scored as the test is never the calibration part */
export const PARTS = { fresh2: ['calibration', 'test'], short3: ['calibration', 'test'], collected_1: ['all'], scenes_test: ['all'], nl_a: ['calibration', 'development'], nl_b: ['all'] };
export const CALIBRATION_SETS = SET_ORDER.filter(s => PARTS[s].includes('calibration'));

/** the kinds of the new sets, fixed by training/sketch/llm_bench/NL_TEST_SPEC.md */
export const NL_KINDS = ['long', 'short', 'session', 'self_correction', 'complaint', 'indirect', 'typos', 'dictated', 'translated', 'fragment', 'ambiguous', 'nothing_to_do', 'reference', 'paraphrase'];
const FRESH2 = ['opus_a', 'opus_b', 'opus_c', 'opus_d'].map(d => `fresh2/${d}/batch_01.jsonl`);
/** nl_a/README.md: batches 01-06 were written by gpt-6.1-sol, 07-12 by Claude Opus 5.5 */
const nlWriter = f => { const n = +/batch_(\d+)/.exec(f)?.[1]; return n >= 1 && n <= 6 ? 'gpt-6.1-sol' : n >= 7 && n <= 12 ? 'claude-opus-5-5' : null; };
/** MODERNBERT_RUNLOG.md: nl_b batches 01-06 were written by gpt-6.1-sol, 07-12 by gpt-6-astra */
const nlbWriter = f => { const n = +/batch_(\d+)/.exec(f)?.[1]; return n >= 1 && n <= 6 ? 'gpt-6.1-sol' : n >= 7 && n <= 12 ? 'gpt-6-astra' : null; };
const SPECS = {
  fresh2: { files: FRESH2, kind: 'long', writer: f => f.split('/')[1], exclude_pending: true },
  short3: { files: ['short3/batch_01.jsonl'], kind: 'short', exclude_pending: true },
  collected_1: { files: ['collected_1/batch_01.jsonl', 'collected_1/batch_02.jsonl'], kind: f => (f.endsWith('batch_01.jsonl') ? 'as_sent' : 'corrected'), teachers: 'collected_1/teachers' },
  scenes_test: { files: [1, 2, 3, 4].map(i => `scenes_test/batch_0${i}.jsonl`), kind: 'session', session: f => 'scenes_test/' + basename(f, '.jsonl') },
  nl_a: { dual: 'nl_a', writer: f => nlWriter(f) },
  nl_b: { dual: 'nl_b', writer: f => nlbWriter(f) },
};

/** SHA256(s) % n, as calibrate_modernbert.mjs isCalibration (n = 3) */
export const sha256Mod = (s, n) => Number(BigInt('0x' + createHash('sha256').update(String(s)).digest('hex')) % BigInt(n));
/** the split key of a row: its session or its group if it has one, else its id */
export const splitKey = row => row.session ?? row.group ?? row.id;

/** the parts of the rows of one set, by the rule of the set. Rows linked by a session or a group form one component and take one key (the
 *  smallest split key among them), so that not even a row with both a session and a group can bring a session or a group across the split. */
export function assignParts(setName, rows) {
  if (!PARTS[setName]) throw new Error('Unknown set ' + setName);
  if (setName === 'fresh2' || setName === 'short3') return rows.map(r => (sha256Mod(r.id, 3) === 0 ? 'calibration' : 'test'));
  if (setName === 'nl_a') {
    const parent = new Map(), find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    const labelsOf = r => (r.session == null && r.group == null ? ['I:' + r.id] : [r.session != null ? 'S:' + r.session : null, r.group != null ? 'G:' + r.group : null].filter(Boolean));
    for (const r of rows) for (const l of labelsOf(r)) if (!parent.has(l)) parent.set(l, l);
    for (const r of rows) { const ls = labelsOf(r); for (let i = 1; i < ls.length; i++) parent.set(find(ls[i]), find(ls[0])); }
    const key = new Map();
    for (const r of rows) { const root = find(labelsOf(r)[0]), k = String(splitKey(r)); if (!key.has(root) || k < key.get(root)) key.set(root, k); }
    return rows.map(r => (sha256Mod(key.get(find(labelsOf(r)[0])), 2) === 0 ? 'calibration' : 'development'));
  }
  return rows.map(() => 'all');
}

const readJsonl = path => readFileSync(path, 'utf8').split('\n').filter(x => x.trim()).map((l, i) => { try { return JSON.parse(l); } catch (e) { throw new Error(`${path}:${i + 1}: not JSON`); } });
export const hasPending = row => (row.wires || []).some(w => w.pending);

function checkRow(row, where) {
  if (typeof row.id !== 'string' || !row.id || typeof row.text !== 'string' || !Array.isArray(row.wires)) throw new Error(`${where}: a row needs id, text and wires`);
  for (const w of row.wires) {
    if (w.pending) continue;
    if (typeof w.type !== 'string' || !w.args || typeof w.args !== 'object') throw new Error(`${where}: ${row.id}: a wire needs type and args`);
    if (typeof w.span !== 'string' || !row.text.includes(w.span)) throw new Error(`${where}: ${row.id}: a wire span is not in the text`);
  }
}

function dualRows(dir, name) {
  const read = sub => { const d = dir + '/' + sub; return existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.jsonl')).sort().flatMap(f => readJsonl(d + '/' + f).map(r => ({ ...r, _file: sub + '/' + f }))) : []; };
  const opus = read('opus'), gpt = read('gpt');
  if (!opus.length) throw new Error(`${name} is not written yet: ${dir}/opus/*.jsonl has no rows`);
  for (const r of opus) { checkRow(r, name + '/opus'); if (!NL_KINDS.includes(r.kind)) throw new Error(`${name}/opus: ${r.id}: kind ${JSON.stringify(r.kind)} is not one of ${NL_KINDS.join(', ')} (NL_TEST_SPEC.md)`); }
  const ids = new Set(opus.map(r => r.id));
  if (ids.size !== opus.length) throw new Error(`${name}/opus: duplicate ids`);
  if (!gpt.length) return { opus, alt: null };
  gpt.forEach(r => checkRow(r, name + '/gpt'));
  const byId = new Map(gpt.map(r => [r.id, r]));
  if (byId.size !== gpt.length) throw new Error(`${name}/gpt: duplicate ids`);
  const missing = [...ids].filter(id => !byId.has(id)), extra = [...byId.keys()].filter(id => !ids.has(id));
  if (missing.length || extra.length) throw new Error(`${name}: the two label folders hold different ids (gpt lacks ${missing.length}, has ${extra.length} more)`);
  for (const r of opus) if (byId.get(r.id).text !== r.text) throw new Error(`${name}: ${r.id}: the two teachers label different texts`);
  return { opus, alt: byId };
}

/** one set -> {name, items, excluded, files, teachers}; root = the llm_bench folder (default: the repository's). Throws when a set is not there. */
export function loadSet(name, { root = name === 'nl_b' && process.env.LLM_BENCH_ROOT ? resolve(process.env.LLM_BENCH_ROOT) : BENCH } = {}) {
  const spec = SPECS[name];
  if (!spec) throw new Error('Unknown set ' + name + '; known: ' + SET_ORDER.join(', '));
  const rows = [], files = [];
  if (spec.dual) {
    const { opus, alt } = dualRows(resolve(root, spec.dual), name);
    for (const r of opus) rows.push({ row: r, alt: alt ? alt.get(r.id) : null, file: r._file });
    const shown = root === BENCH ? '' : root + '/';
    files.push(shown + spec.dual + '/opus', ...(alt ? [shown + spec.dual + '/gpt'] : []));
  } else {
    for (const f of spec.files) {
      const p = resolve(root, f);
      if (!existsSync(p)) throw new Error(`${name}: ${p} is missing`);
      files.push(f);
      for (const r of readJsonl(p)) { checkRow(r, f); rows.push({ row: r, alt: null, file: f }); }
    }
  }
  const excluded = [], kept = [];
  for (const x of rows) {
    if (hasPending(x.row) || (x.alt && hasPending(x.alt))) {
      // only fresh2 and short3 leave such messages out (the protocol of calibrate_modernbert.mjs); a message of another set is never dropped quietly
      if (!spec.exclude_pending) throw new Error(`${name}: ${x.row.id} has a pending gold wire, which this set does not leave out: decide it before scoring`);
      excluded.push({ id: x.row.id, reason: 'pending gold wire' });
    } else kept.push(x);
  }
  if (new Set(kept.map(x => x.row.id)).size !== kept.length) throw new Error(`${name}: duplicate ids`);
  const mk = x => {
    const r = x.row;
    return { id: r.id, set: name, kind: r.kind ?? (typeof spec.kind === 'function' ? spec.kind(x.file) : spec.kind), writer: r.writer ?? (spec.writer ? spec.writer(x.file) : null),
      session: r.session ?? (spec.session ? spec.session(x.file) : null), group: r.group ?? null, setup: r.setup ?? null, domain: r.domain ?? null,
      names: (r.names || []).slice(), groups: r.groups || {}, text: r.text, wires: r.wires, altWires: x.alt ? x.alt.wires : null, unreliable: !!r.unreliable, source: x.file };
  };
  const items = kept.map(mk);
  // collected_1: both teachers also read the real messages (teachers/{opus,gpt}/batch_01.jsonl): their labels beside the existing gold
  let teachers = spec.dual ? (kept.some(x => x.alt) ? ['opus', 'gpt'] : ['opus']) : ['gold'];
  if (spec.teachers && existsSync(resolve(root, spec.teachers))) {
    const by = {};
    for (const t of ['opus', 'gpt']) {
      const p = resolve(root, spec.teachers, t, 'batch_01.jsonl');
      if (!existsSync(p)) throw new Error(`${name}: ${p} is missing`);
      const rs = readJsonl(p); rs.forEach(r => checkRow(r, `${name}/teachers/${t}`));
      by[t] = new Map(rs.map(r => [r.id, r]));
      if (by[t].size !== rs.length) throw new Error(`${name}/teachers/${t}: duplicate ids`);
    }
    for (const it of items) for (const t of ['opus', 'gpt']) {
      const r = by[t].get(it.id);
      if (!r || r.text !== it.text) throw new Error(`${name}: ${it.id}: teacher ${t} has no row, or labels another text`);
    }
    for (const t of ['opus', 'gpt']) if (by[t].size !== items.length) throw new Error(`${name}/teachers/${t}: ${by[t].size} rows for ${items.length} messages`);
    items.forEach(it => { it.teachers = { opus: by.opus.get(it.id).wires, gpt: by.gpt.get(it.id).wires }; });
    teachers = ['gold', 'opus', 'gpt'];
  }
  const parts = assignParts(name, items);
  items.forEach((it, i) => { it.part = parts[i]; });
  // the step of a row inside its session, in file order
  const seen = new Map();
  for (const it of items) if (it.session != null) { const n = seen.get(it.session) || 0; it.step = n; seen.set(it.session, n + 1); }
  return { name, items, excluded, files, teachers };
}

/** several sets at once, in the canonical order; an id may be in one set only */
export function loadSets(names, opts) {
  const order = [...new Set(names)].sort((a, b) => SET_ORDER.indexOf(a) - SET_ORDER.indexOf(b)), sets = order.map(n => loadSet(n, opts)), owner = new Map();
  for (const s of sets) for (const it of s.items) { if (owner.has(it.id)) throw new Error(`id ${it.id} is in both ${owner.get(it.id)} and ${s.name}`); owner.set(it.id, s.name); }
  return sets;
}

/** the sessions of a list of items, each in file order: [{session, items}] */
export function sessionsOf(items) {
  const by = new Map();
  for (const it of items) if (it.session != null) { if (!by.has(it.session)) by.set(it.session, []); by.get(it.session).push(it); }
  return [...by].map(([session, list]) => ({ session, items: list }));
}
export const isDir = p => existsSync(p) && statSync(p).isDirectory();
/** the names a reader is given for a row: the shapes' names, then the groups' names (docs/js/ui.js; scene_readers.mjs). Rows of scenes_test
 *  and the new sets hold the groups apart in `groups`; the union equals the names of the engine's drawing on all 166 scenes_test steps. */
export const contextNames = item => [...new Set([...(item.names || []), ...Object.keys(item.groups || {})])];
