// modernbert_next_measure.mjs: the measuring side of the ModernBERT-next campaign (reports/modernbert-next-plan-2026-11-08_codex.md, sections 4, 5, 7 and
// the acceptance criteria 15-23). A manifest-driven adapter around collect_set.mjs, calibrate_arm.mjs, score_arm.mjs, compare_arms.mjs and
// root_causes.mjs; it adds no scoring rule of its own beyond the fixed verdict tables.
//
//   node modernbert_next_measure.mjs views     --protocol P/protocol.json --out VIEWS_DIR [--baseline-train DIR]
//   node modernbert_next_measure.mjs reproduce --protocol P/protocol.json --out DIR [--recollect]
//   node modernbert_next_measure.mjs evaluate  --protocol P/protocol.json --arm A --seed S --model DIR --out DIR [--views DIR] [--train-data DIR] [--include-external]
//   node modernbert_next_measure.mjs baseline  --protocol P/protocol.json --model DIR --out DIR [--views DIR] [--train-data DIR] [--include-external]   (C100-s0, reusing its cached records)
//   node modernbert_next_measure.mjs compare   --protocol P/protocol.json --out DIR --a EVAL_DIR --b EVAL_DIR --criterion guard|15|16|17|21|word_names [...]
//   node modernbert_next_measure.mjs verdict   --protocol P/protocol.json --addendum FILE --out DIR --bundle name=EVAL_DIR ... [--contract-evidence FILE] [--oracle-evidence FILE] [--product-evidence FILE]
//   node modernbert_next_measure.mjs flip-risk --eval EVAL_DIR --views VIEWS_DIR --out DIR     (requests within 1e-5 / 1e-4 of the threshold)
//   evaluate, baseline, compare and verdict need --addendum FILE (the frozen decision-rules addendum; its sha256 is in every identity and output)
//
// Rules of this file:
//  - every threshold comes from the frozen protocol file (decision_rules, support); a threshold the protocol does not hold makes its row `unavailable`, never a pass;
//  - a missing interval, population, metric, record or evidence is never a pass; every comparison goes through fin() (in JavaScript null >= -5 is true);
//  - an output folder that exists is refused, unless it holds this tool's identity file with an identical identity (a resume); a changed identity refuses;
//  - the evaluation gold is the OVERLAID annotation (LABEL_FIXES_SHORT.jsonl, applied with the strict preconditions of modernbert_next_data.py check_overlay);
//    `reproduce` uses the historical, un-overlaid sets of sets.mjs and so reproduces the old numbers.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { loadSet, sha256Mod, BENCH } from './sets.mjs';
import { goldSpans } from '../../sketch/layer_common.mjs';
import { hashFile, digest, inputHash } from '../calibrate_modernbert.mjs';
import { buildRecord, setDigest, loadViewDir, loadPopulations, loadRecords, setItems, TRUTHFUL_V1, truthfulItemsOf, RECORD_SCHEMA, rawArgsOf } from './arm_lib.mjs';
import { scoreArmTruthful, decideTruthful } from './score_arm.mjs';
import { calibrateGrouped } from './calibrate_arm.mjs';
import { confidence } from '../../../docs/js/neural-confidence.js';
import { compareSidecars, rng, SEED, RESAMPLES, MIN_UNITS } from './compare_arms.mjs';
import { filesOf, trainData } from './collect_set.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), REPO = resolve(HERE, '../../..'), SK = resolve(REPO, 'training/sketch');
export const CACHE = homedir() + '/.cache/diagram-vss-modernbert';
export const fin = x => typeof x === 'number' && Number.isFinite(x);   // a null, an undefined, a NaN or a string is never a number here
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const r4 = x => (x == null ? null : Math.round(x * 1e6) / 1e6);
const writeAtomic = (p, text) => { const t = p + '.tmp-' + process.pid; writeFileSync(t, text); renameSync(t, p); };
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const jsonl = p => readFileSync(p, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const stable = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v));

// ---------------------------------------------------------------- the frozen protocol
/** deep merge of the addendum's decision_rules into the protocol's: a key that the protocol already holds is an error (an addendum adds, never overrides) */
export function mergeRules(base, add, path = 'decision_rules') {
  const out = { ...base };
  for (const [k, v] of Object.entries(add)) {
    if (!(k in out)) { out[k] = v; continue; }
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = mergeRules(out[k], v, path + '.' + k);
    else throw new Error(`addendum: ${path}.${k} is in the protocol already (an addendum adds constants, it never overrides one)`);
  }
  return out;
}
/** the decision-rules addendum (constants of the plan that protocol-v2 does not hold, frozen before any arm result): its protocol_sha256 must be the protocol in use;
 *  its decision_rules are merged into the protocol's. -> the protocol with `rules` merged and `addendum: {file, sha256}` */
export function withAddendum(PR, file) {
  if (!file) throw new Error('--addendum FILE is required: the frozen decision-rules addendum (frozen-lists/decision-rules-addendum.json)');
  const path = resolve(file), A = J(path);
  if (A.protocol_sha256 !== PR.sha256) throw new Error(`${path}: its protocol_sha256 ${String(A.protocol_sha256).slice(0, 12)} is not the protocol in use (${PR.sha256.slice(0, 12)})`);
  if (!A.decision_rules || typeof A.decision_rules !== 'object') throw new Error(`${path}: no decision_rules`);
  return { ...PR, rules: mergeRules(PR.rules, A.decision_rules), addendum: { file: path, sha256: hashFile(path) } };
}
/** the protocol folder (protocol.json, groups.jsonl, membership/, audit.json, SHA256SUMS): every file checked against SHA256SUMS */
export function loadProtocol(file) {
  const path = resolve(file), dir = dirname(path), sums = resolve(dir, 'SHA256SUMS');
  if (!existsSync(sums)) throw new Error(`${dir}: no SHA256SUMS: not a frozen protocol folder`);
  const listed = new Set();
  for (const l of readFileSync(sums, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    const m = /^([0-9a-f]{64})  (.+)$/.exec(l);
    if (!m) throw new Error(`${sums}: bad line ${JSON.stringify(l)}`);
    const p = resolve(dir, m[2]);
    if (!existsSync(p)) throw new Error(`${dir}: ${m[2]} is listed in SHA256SUMS and missing`);
    if (hashFile(p) !== m[1]) throw new Error(`${dir}: ${m[2]} differs from SHA256SUMS`);
    listed.add(m[2]);
  }
  if (!listed.has(basename(path))) throw new Error(`${sums} does not list ${basename(path)}`);
  const P = J(path);
  if (P.kind !== 'frozen' || P.protocol?.version !== 'modernbert-next-protocol-v1') throw new Error(`${path}: not a frozen modernbert-next protocol`);
  if (P.protocol.scoring_version !== TRUTHFUL_V1) throw new Error(`${path}: scoring_version ${P.protocol.scoring_version}, this tool scores ${TRUTHFUL_V1}`);
  if (!P.protocol.decision_rules || !P.protocol.support) throw new Error(`${path}: no decision_rules / support`);
  return { dir, file: path, sha256: hashFile(path), P, rules: P.protocol.decision_rules, support: P.protocol.support };
}
/** the ids of a membership list of the protocol (the file's hash and count checked against protocol.json) */
export function membership(PR, name) {
  const e = PR.P.membership[name];
  if (!e) throw new Error(`protocol: no membership ${name}`);
  const p = resolve(PR.dir, e.file);
  if (hashFile(p) !== e.sha256) throw new Error(`${p} differs from protocol.json`);
  const ids = readFileSync(p, 'utf8').split('\n').filter(Boolean);
  if (ids.length !== e.count) throw new Error(`${p}: ${ids.length} ids, protocol.json says ${e.count}`);
  return ids;
}
/** groups.jsonl -> {byId: Map(id -> row), roles: Map(group_key -> Set(role))} */
export function loadGroups(PR) {
  const p = resolve(PR.dir, PR.P.groups.file);
  if (hashFile(p) !== PR.P.groups.sha256) throw new Error(`${p} differs from protocol.json`);
  const byId = new Map(), roles = new Map();
  for (const r of jsonl(p)) {
    byId.set(r.id, r);
    if (!roles.has(r.group_key)) roles.set(r.group_key, new Set());
    for (const x of r.roles) roles.get(r.group_key).add(x);
  }
  return { byId, roles };
}
/** the roles that make a group non-clean: it touches a campaign training pool (C100, the eight restored folders, r2) or the calibration candidates */
export const POOL_ROLES = ['train_c100', 'train_restored', 'r2', 'cal_cand'];
export const isClean = roleSet => !POOL_ROLES.some(r => roleSet.has(r));

// ---------------------------------------------------------------- the overlay (the strict code of modernbert_next_data.py, imported read-only through Python)
const PY_OVERLAY = `
import sys, os, json
sys.path.insert(0, sys.argv[1])
import modernbert_next_data as D
P = json.load(open(sys.argv[2], encoding="utf8"))["protocol"]
assert P.get("version") == D.PROTOCOL_VERSION
D.verify_sources(P)
ofile = os.path.join(D.REPO, P["overlay"])
lines = D.load_overlay(ofile)
files, per = {}, {}
for s in P["sources"]:
    msgs, _alt = D.load_source(s)
    for f in s["files"]:
        if f["use"] == "rows":
            files[f["path"]] = {"path": os.path.join(D.SK, f["path"]), "sha256": f["sha256"], "messages": [m for m in msgs if m["file"] == f["path"]]}
changes = D.check_overlay(lines, files, D.load_legend()) if lines else []
print(json.dumps({"file": P["overlay"], "sha256": D.sha256_file(ofile), "lines": [r for _n, r in lines], "changes": changes}, sort_keys=True))
`;
/** the overlay lines after modernbert_next_data.py check_overlay accepted every one of them (strict preconditions) */
export function overlayLines(protocolJson) {
  const r = spawnSync('python3', ['-B', '-c', PY_OVERLAY, HERE, protocolJson], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`the overlay preconditions failed (modernbert_next_data.py check_overlay):\n${r.stderr || r.stdout}`);
  return JSON.parse(r.stdout);
}
const canonJSON = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v));
/** apply the checked overlay lines to the items of a view universe: items are matched by (protocol rows file, id); the wire must still hold the expected span and
 *  arguments. Returns the applied changes. A line whose message is in no item is a training-only correction and is skipped (and counted). */
export function applyOverlay(lines, itemsByKey) {
  const applied = [];
  for (const r of lines) {
    const it = itemsByKey.get(r.source_file + '\0' + r.id);
    if (!it) continue;
    const w = it.wires[r.wire_index];
    if (!w || w.span !== r.expected_span || canonJSON(w.args) !== canonJSON(r.expected_args)) throw new Error(`overlay: ${r.id} wire ${r.wire_index} no longer holds the expected annotation`);
    w.args = JSON.parse(JSON.stringify(r.replacement_args));
    applied.push({ id: r.id, source_file: r.source_file, wire_index: r.wire_index, reason: r.reason });
  }
  return applied;
}

// ---------------------------------------------------------------- names, spans and the case view
const ROLE_NAME_KEYS = ['target', 'from', 'to', 'anchor', 'linked', 'members'];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** "a,b" split at commas outside parentheses (bench-canon.js parts) */
export function partsOf(v) {
  const s = Array.isArray(v) ? v.join(',') : String(v), out = []; let d = 0, cur = '';
  for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; }
  out.push(cur.trim());
  return out.filter(p => p);
}
const wordBoundaryRe = name => new RegExp('(?<![\\p{L}\\p{N}])' + esc(name) + '(?![\\p{L}\\p{N}])', 'gu');
export const nameOccurs = (span, name) => wordBoundaryRe(name).test(span);
/** the plain names of a wire's names-role arguments that are one of the message's names, have a capital letter and occur in the span as written */
export function existingNames(wire, names) {
  const out = new Set(), have = new Set(names), a = wire.args || {};
  for (const k of ROLE_NAME_KEYS) {
    if (!(k in a)) continue;
    for (const p of partsOf(a[k])) if (!p.startsWith('mention(') && p !== '$new' && have.has(p) && p !== p.toLowerCase() && nameOccurs(wire.span, p)) out.add(p);
  }
  return [...out];
}
const QUOTED = /"[^"]*"|“[^”]*”|‘[^’]*’|`[^`]*`|(?<![\p{L}\p{N}])'[^']*'(?![\p{L}\p{N}])/gu;
const TEXT_ARG_KEYS = ['label', 'title', 'about', 'name', 'items', 'items2', 'parents'];
/** the lower-case view of one message: only the aligned occurrences, inside the span of a wire, of a plain existing name that the wire's names-role argument annotates.
 *  Never lowered: an occurrence that is part of an action trigger (a verb; a trigger that IS the name is the name's role and is lowered), inside a quotation, or equal to a text-valued argument (label, title, name, items ...).
 *  A message with any such occurrence is AMBIGUOUS: it is omitted from the view with its reason (the original realistic message stays in its own view).
 *  -> {item, replacements, affected: [wire index]} | {omitted: reason} | null (no existing name to lower) */
export function lowercaseMessage(item) {
  const spans = goldSpans({ text: item.text, wires: item.wires }), quoted = [...item.text.matchAll(QUOTED)].map(m => [m.index, m.index + m[0].length]);
  const reps = new Map(), perWire = new Map(), skipped = [];
  item.wires.forEach((w, j) => {
    if (w.pending || typeof w.span !== 'string') return;
    for (const name of existingNames(w, item.names)) {
      const s = spans[j].s, trig = w.trigger ? w.span.toLowerCase().indexOf(String(w.trigger).toLowerCase()) : -1, textVals = TEXT_ARG_KEYS.map(k => w.args?.[k]).filter(v => v != null).flatMap(v => partsOf(v));
      const nOcc = [...w.span.matchAll(wordBoundaryRe(name))].length;   // a trigger that equals the name is the name's role only when the name is written once (verbless: "Footer: gray")
      for (const m of w.span.matchAll(wordBoundaryRe(name))) {
        const abs = s + m.index, why = trig >= 0 && (String(w.trigger).toLowerCase() !== name.toLowerCase() || nOcc > 1) && m.index < trig + String(w.trigger).length && m.index + name.length > trig ? 'part of an action trigger'
          : quoted.some(([a, b]) => abs >= a && abs + name.length <= b) ? 'inside a quotation' : textVals.includes(name) ? 'equal to a text-valued argument' : null;
        if (why) { skipped.push({ wire_index: j, name, reason: why, span_offset: m.index }); continue; }
        if (name.toLowerCase().length !== name.length) { skipped.push({ wire_index: j, name, reason: 'lower case changes the length', span_offset: m.index }); continue; }
        reps.set(abs, { abs, name, wire_index: j, span_offset: m.index });
        perWire.set(j, (perWire.get(j) || 0) + 1);
      }
    }
  });
  if (!reps.size && !skipped.length) return null;
  if (skipped.length) return { omitted: 'ambiguous: ' + skipped.map(x => `wire ${x.wire_index} "${x.name}" ${x.reason}`).join('; ') };
  let text = item.text;
  for (const r of [...reps.values()].sort((a, b) => b.abs - a.abs)) text = text.slice(0, r.abs) + r.name.toLowerCase() + text.slice(r.abs + r.name.length);
  if (text.length !== item.text.length) return { omitted: 'the lower-cased text changed length' };
  // a verbless request whose trigger IS the name ("Footer: gray") keeps the trigger in the new spelling
  const lowered = new Set([...reps.values()].map(r => r.name));
  const wires = item.wires.map((w, j) => (w.pending || typeof w.span !== 'string' ? w : { ...w, span: text.slice(spans[j].s, spans[j].e), ...(w.trigger && lowered.has(w.trigger) ? { trigger: String(w.trigger).toLowerCase() } : {}) }));
  const back = goldSpans({ text, wires });
  if (back.some((g, j) => g.s !== spans[j].s || g.e !== spans[j].e)) return { omitted: 'a span no longer aligns after lowering' };
  return { item: { ...item, text, wires }, replacements: [...reps.values()].sort((a, b) => a.abs - b.abs).map(r => ({ wire_index: r.wire_index, name: r.name, text_offset: r.abs, span_offset: r.span_offset, old: r.name, new: r.name.toLowerCase() })), affected: [...perWire.keys()].sort((a, b) => a - b) };
}

// ---------------------------------------------------------------- populations: frozen lists of messages and gold requests
export const bareMove = a => a.action === 'move' && 'direction' in a && !['position', 'anchor', 'at', 'distance'].some(k => k in a);
export const FORMS = [['outline_question', 'outline_q'], ['outline_create', 'outline_create'], ['outline_set', 'outline_set'], ['label_removal', 'arrow_unlabel'], ['description_size', 'size_desc'], ['bare_move', 'move']];
/** a population: {name, view, part, requests: Map(id -> sorted gold indices)} counted by the groups of its messages */
function popOf(name, view, part, items, wireIn) {
  const requests = new Map();
  for (const it of items) { const idx = it.wires.map((w, j) => (!w.pending && wireIn(it, w, j) ? j : -1)).filter(j => j >= 0); if (idx.length) requests.set(it.id, idx); }
  const groups = new Set(items.filter(it => requests.has(it.id)).map(it => it.group_key ?? it.id));
  return { name, view, part, requests, messages: requests.size, groups: groups.size, nRequests: [...requests.values()].reduce((s, v) => s + v.length, 0) };
}
const popLines = pop => [...pop.requests].map(([id, idx]) => JSON.stringify({ id, wires: idx })).join('\n') + '\n';

// ---------------------------------------------------------------- building the views
const VIEW_PARTS = { calibration: ['calibration'], fresh2_test: ['test'], short3_test: ['test'], nl_a_development: ['development'], t1_all: ['all'], lowercase_other: ['all'] };
const EXTERNAL = [['t1s', 'spelling-corrected t1 as the demo reads it'], ['t1raw', 't1 rows the spell checker changes, as written'], ['t1bs', 'bare view of t1'], ['short3s', 'short3 spelled (test part by the protocol membership)']];
const SHORTCMD = homedir() + '/.cache/diagram-vss-shortcmd/data';

/** every item of the loaders the protocol's sources use, keyed by id: {item, loader, file} (file = the protocol rows file the group list names) */
function universe(groups) {
  const out = new Map(), meta = new Map();
  for (const name of ['fresh2', 'short3', 'nl_a', 'short_synth', 'synth_short_t1']) {
    const set = loadSet(name);
    const dirOf = f => (f.startsWith('../') ? resolve(BENCH, f) : resolve(BENCH, f));
    for (const it of set.items) {
      const g = groups.byId.get(it.id);
      if (!g) continue;
      if (sha256(it.text) !== g.text_sha256) throw new Error(`${it.id}: its text differs from the frozen group list (source identity)`);
      out.set(it.id, { item: it, loader: name, file: g.file });
    }
    if (name === 'synth_short_t1' || name === 'short_synth') for (const f of set.files) for (const r of jsonl(dirOf(f))) meta.set(r.id, r.meta ?? null);
  }
  return { out, meta };
}
const copyItem = it => JSON.parse(JSON.stringify(it));
function viewItem(base, view, part, g, groups, extra = {}) {
  const roles = groups.roles.get(g.group_key);
  return { ...copyItem(base), set: view, part, altWires: null, teachers: undefined, group_key: g.group_key, fold: sha256Mod(g.group_key, 5), roles: [...roles].sort(), clean: isClean(roles), origin_id: null, meta: null, ...extra };
}

/** build every frozen view and population into OUT (must not exist) -> the manifest. Cross-checks against the protocol's audit; throws on any mismatch. */
export function buildViews(PR, out, { baselineTrain = CACHE + '/arms/data/C100', protocolJson = PR.file } = {}) {
  if (existsSync(out)) throw new Error(`${out} exists: a views folder is written once (a changed view is a new folder)`);
  const groups = loadGroups(PR), U = universe(groups), audit = J(resolve(PR.dir, 'audit.json'));
  const ov = overlayLines(protocolJson);
  if (ov.sha256 !== PR.P.overlay.sha256 || ov.lines.length !== PR.P.overlay.lines) throw new Error('the overlay file is not the one the protocol froze');
  const byKey = new Map([...U.out.values()].map(x => [x.file + '\0' + x.item.id, x.item]));
  const applied = applyOverlay(ov.lines, byKey);
  const checks = [], fail = (name, got, want) => { checks.push({ check: name, ok: false, got, want }); };
  const ok = (name, got, want) => { checks.push({ check: name, ok: JSON.stringify(got) === JSON.stringify(want), got, want }); };
  const pick = (idsName, loaders, view, part) => {
    const ids = membership(PR, idsName), want = new Set(ids), items = [];
    for (const l of loaders) for (const x of U.out.values()) if (x.loader === l && want.has(x.item.id)) items.push(viewItem(x.item, view, part, groups.byId.get(x.item.id), groups, { meta: U.meta.get(x.item.id) ?? null }));
    ok(`${view}: every membership id is loaded`, items.length, ids.length);
    return items;
  };
  const sessionsIntact = items => {
    const by = new Map(items.filter(i => i.session != null).map(i => [i.session, 0]));
    for (const it of items) if (it.session != null) by.set(it.session, by.get(it.session) + 1);
    const all = new Map(); for (const x of U.out.values()) if (x.item.session != null) all.set(x.item.session, (all.get(x.item.session) || 0) + 1);
    return [...by].every(([s, n]) => all.get(s) === n);
  };
  const views = {
    calibration: pick('calibration', ['fresh2', 'short3', 'nl_a', 'short_synth'], 'calibration', 'calibration'),
    fresh2_test: pick('fresh2_test', ['fresh2'], 'fresh2_test', 'test'),
    short3_test: pick('short3_test', ['short3'], 'short3_test', 'test'),
    nl_a_development: pick('nl_a_development', ['nl_a'], 'nl_a_development', 'development'),
    t1_all: pick('t1_all', ['synth_short_t1'], 't1_all', 'all'),
  };
  for (const [n, items] of Object.entries(views)) ok(`${n}: a session is in the view whole or not at all`, sessionsIntact(items), true);
  // calibration: disjoint from every evaluation view; never a text overlap flagged here (collect_set marks it per arm and calibrate_arm refuses it)
  const calIds = new Set(views.calibration.map(i => i.id));
  for (const n of ['fresh2_test', 'short3_test', 'nl_a_development', 't1_all']) ok(`calibration is disjoint from ${n}`, views[n].filter(i => calIds.has(i.id)).length, 0);
  // the lower-case view of fresh2 test on other drawings
  const other = new Set(membership(PR, 'fresh2_test_other_drawings')), lcItems = [], reps = [], omitted = [], candidates = { messages: 0, wires: 0, groups: new Set() };
  const f2 = new Map(views.fresh2_test.map(i => [i.id, i]));
  for (const id of other) if (!f2.has(id)) throw new Error(`${id} of fresh2_test_other_drawings is not in fresh2_test`);
  for (const it of views.fresh2_test) {
    if (!other.has(it.id)) continue;
    const cand = it.wires.map((w, j) => (!w.pending && typeof w.span === 'string' && existingNames(w, it.names).length ? j : -1)).filter(j => j >= 0);
    if (cand.length) { candidates.messages++; candidates.wires += cand.length; candidates.groups.add(it.group_key); }
    const r = lowercaseMessage(it);
    if (!r) continue;
    if (r.omitted) { omitted.push({ id: it.id, reason: r.omitted }); continue; }
    const id = it.id + '#lc';
    lcItems.push({ ...r.item, id, set: 'lowercase_other', part: 'all', origin_id: it.id, source: it.source + '#lowercase', affected_wires: r.affected });
    for (const x of r.replacements) reps.push({ id, origin_id: it.id, ...x });
  }
  views.lowercase_other = lcItems;
  const lcPrimary = audit.lowercase_other.primary_no_default_name_in_message_names;
  ok('lowercase_other: candidate requests / groups equal the audit (910 / 291 at freeze)', { requests: candidates.wires, groups: candidates.groups.size }, { requests: lcPrimary.requests, groups: lcPrimary.groups });
  // external views (the VSS-BERT data folders, reused by hash, never copied)
  const external = [];
  for (const [name, about] of EXTERNAL) {
    const dir = resolve(SHORTCMD, name);
    if (!existsSync(dir)) { fail(`external view ${name}: ${dir} is missing`, null, 'present'); continue; }
    const files = readdirSync(dir).filter(f => /^msg_\d+\.jsonl$/.test(f)).sort().map(f => ({ path: f, sha256: hashFile(resolve(dir, f)) })), index = [], spanLost = [];
    const test3 = name === 'short3s' ? new Set(membership(PR, 'short3_test')) : null;
    for (const f of files) for (const row of jsonl(resolve(dir, f.path))) {
      const origin = row.meta?.from ?? row.id, g = groups.byId.get(origin);
      if (!g || (test3 && !test3.has(row.id))) continue;
      if (row.span_lost) { spanLost.push(row.id); continue; }   // the spell checker changed a word of the span: the span is no longer in the text, the VSS-BERT views flag it the same way
      index.push({ id: row.id, group_key: g.group_key, fold: sha256Mod(g.group_key, 5), roles: [...groups.roles.get(g.group_key)].sort(), origin_id: origin });
    }
    external.push({ name, about, dir, files, index, spanLost });
  }
  // populations
  const pops = [], t1clean = new Set(membership(PR, 't1_clean'));
  const t1Items = views.t1_all, t1c = t1Items.filter(i => t1clean.has(i.id));
  ok('t1_clean (membership) is exactly the t1 messages whose group touches no pool', JSON.stringify(t1Items.filter(i => i.clean).map(i => i.id).sort()), JSON.stringify([...t1clean].sort()));
  for (const v of ['fresh2_test', 'short3_test', 'nl_a_development']) pops.push(popOf(`${v}_clean`, v, views[v][0].part, views[v].filter(i => i.clean), () => true));
  pops.push(popOf('t1_clean', 't1_all', 'all', t1c, () => true));
  for (const [name, form] of FORMS) pops.push(popOf(`t1_clean_${name}`, 't1_all', 'all', t1c, (it, w) => it.meta?.form === form && (name !== 'bare_move' || bareMove(w.args || {}))));
  pops.push(popOf('t1_clean_create', 't1_all', 'all', t1c, it => it.meta?.form === 'create'));
  pops.push(popOf('t1_clean_label_setting', 't1_all', 'all', t1c, (it, w) => typeof w.args?.label === 'string' && w.args.label !== ''));
  pops.push(popOf('t1_all_undo_redo_count', 't1_all', 'all', t1Items, (it, w) => ['undo', 'redo'].includes(w.args?.action) && w.args.count != null));
  pops.push(popOf('lowercase_other_affected', 'lowercase_other', 'all', lcItems, (it, w, j) => it.affected_wires.includes(j)));
  const lcOrig = new Map(lcItems.map(i => [i.origin_id, i]));
  pops.push(popOf('lowercase_other_affected_original_case', 'fresh2_test', 'test', views.fresh2_test.filter(i => lcOrig.has(i.id)), (it, w, j) => lcOrig.get(it.id).affected_wires.includes(j)));
  // data_attested_word_names: names whose lower-case spelling is a non-name token of the baseline training annotations (diagnostic only)
  const trainFile = resolve(baselineTrain, 'train.jsonl'), attested = new Set();
  for (const r of jsonl(trainFile)) r.words.forEach((w, i) => { if (r.tags[i] === 'O') attested.add(String(w)); });
  const repNames = new Map(); for (const r of reps) { const k = r.id + '|' + r.wire_index; (repNames.get(k) || repNames.set(k, new Set()).get(k)).add(r.name); }
  pops.push(popOf('data_attested_word_names', 'lowercase_other', 'all', lcItems, (it, w, j) => [...(repNames.get(it.id + '|' + j) || [])].some(n => attested.has(n.toLowerCase()))));
  // short3_lowercase: the frozen list, used as it is (the coordinator froze it before any candidate result)
  const flist = resolve(dirname(PR.dir), 'frozen-lists', 'short3_lowercase_candidates.jsonl');
  if (!existsSync(flist)) throw new Error(`${flist}: the frozen short3_lowercase list is missing`);
  const frozen = jsonl(flist), s3 = new Map(views.short3_test.map(i => [i.id, i])), s3src = hashFile(resolve(SK, 'llm_bench/short3/batch_01.jsonl'));
  for (const x of frozen) { const it = s3.get(x.id); if (!it || !it.wires[x.wire_index] || it.wires[x.wire_index].span !== x.span || x.source_sha256 !== s3src) throw new Error(`short3_lowercase list: ${x.id} wire ${x.wire_index} does not match short3_test`); }
  const s3idx = new Map(); for (const x of frozen) (s3idx.get(x.id) || s3idx.set(x.id, []).get(x.id)).push(x.wire_index);
  pops.push(popOf('short3_lowercase', 'short3_test', 'test', views.short3_test.filter(i => s3idx.has(i.id)), (it, w, j) => s3idx.get(it.id).includes(j)));
  const popBy = Object.fromEntries(pops.map(p => [p.name, p]));
  // cross-checks against the audit of the protocol
  const tc = audit.t1_clean;
  ok('t1_clean requests / groups equal the audit', { requests: popBy.t1_clean.nRequests, groups: popBy.t1_clean.groups }, { requests: 1354, groups: 1285 });
  for (const [name] of FORMS) ok(`form ${name}: requests / groups equal the audit`, { requests: popBy[`t1_clean_${name}`].nRequests, groups: popBy[`t1_clean_${name}`].groups }, { requests: tc.requests_by_form[name].clean.requests, groups: tc.requests_by_form[name].clean.groups });
  ok('clean create requests / groups equal the audit', { requests: popBy.t1_clean_create.nRequests, groups: popBy.t1_clean_create.groups }, { requests: tc.clean_create.requests, groups: tc.clean_create.groups });
  ok('short3_lowercase requests / groups / messages equal the audit (134 / 105 / 109)', { requests: popBy.short3_lowercase.nRequests, groups: popBy.short3_lowercase.groups, messages: popBy.short3_lowercase.messages }, { requests: audit.short3_lowercase_candidates.requests, groups: audit.short3_lowercase_candidates.groups, messages: audit.short3_lowercase_candidates.messages });
  checks.push({ check: 'lowercase_other_affected is a subset of the audit candidates (the omitted ambiguous messages are listed)', ok: popBy.lowercase_other_affected.nRequests <= candidates.wires, got: popBy.lowercase_other_affected.nRequests, want: `<= ${candidates.wires}`, omitted_messages: omitted.length });
  const S = PR.support, sup = (p, rq, gr) => ({ requests_min: rq, groups_min: gr, supported: fin(rq) && fin(gr) ? p.nRequests >= rq && p.groups >= gr : null });
  const support = {
    t1_clean: sup(popBy.t1_clean, S.t1_clean_requests_min, S.t1_clean_groups_min), lowercase_other_affected: sup(popBy.lowercase_other_affected, S.lowercase_other_requests_min, S.lowercase_other_groups_min),
    ...Object.fromEntries(FORMS.map(([n]) => [`t1_clean_${n}`, sup(popBy[`t1_clean_${n}`], S.form_requests_min, S.form_groups_min)])),
    t1_clean_create: { groups_min: S.clean_create_groups_min, supported: popBy.t1_clean_create.groups >= S.clean_create_groups_min },
  };
  mkdirSync(out, { recursive: true }); mkdirSync(resolve(out, 'populations'));
  const manifest = { schema: 'modernbert-next-views-v1', protocol: { file: PR.file, sha256: PR.sha256 }, overlay: { file: ov.file, sha256: ov.sha256, lines: ov.lines.length, applied_to_views: applied },
    code: Object.fromEntries(['modernbert_next_measure.mjs', 'arm_lib.mjs', 'sets.mjs', 'modernbert_next_data.py'].map(f => [f, hashFile(resolve(HERE, f))])), views: [], populations: [], support,
    short3_lowercase_list: { file: flist, sha256: hashFile(flist), requests: frozen.length }, baseline_train: { file: trainFile, sha256: hashFile(trainFile), attested_tokens: attested.size }, cross_checks: checks,
    notes: ['clean = the message group touches none of ' + POOL_ROLES.join(', '), 'lowercase_other: only aligned annotated existing-name role occurrences are lowered; ambiguous messages are omitted with a reason (lowercase_other.omitted.json); every replacement and offset is in lowercase_other.replacements.json'] };
  for (const [name, items] of Object.entries(views)) {
    const file = `${name}.jsonl`, text = items.map(i => JSON.stringify(i)).join('\n') + '\n';
    writeFileSync(resolve(out, file), text);
    manifest.views.push({ name, kind: 'frozen', file, sha256: sha256(text), messages: items.length, requests: items.reduce((n, i) => n + i.wires.filter(w => !w.pending).length, 0), groups: new Set(items.map(i => i.group_key)).size, parts: VIEW_PARTS[name], part: VIEW_PARTS[name][0] });
  }
  for (const e of external) {
    const file = `${e.name}.index.jsonl`, text = e.index.map(x => JSON.stringify(x)).join('\n') + '\n';
    writeFileSync(resolve(out, file), text);
    manifest.views.push({ name: e.name, kind: 'external', about: e.about, index: { file, sha256: sha256(text) }, external: { dir: e.dir, files: e.files }, messages: e.index.length, omitted_span_lost: e.spanLost, groups: new Set(e.index.map(x => x.group_key)).size, parts: ['all'], part: 'all' });
  }
  for (const p of pops) {
    const file = `populations/${p.name}.jsonl`, text = popLines(p);
    writeFileSync(resolve(out, file), text);
    manifest.populations.push({ name: p.name, view: p.view, part: p.part, file, sha256: sha256(text), messages: p.messages, requests: p.nRequests, groups: p.groups, support: support[p.name] ?? null });
  }
  writeFileSync(resolve(out, 'lowercase_other.replacements.json'), JSON.stringify(reps, null, 1) + '\n');
  writeFileSync(resolve(out, 'lowercase_other.omitted.json'), JSON.stringify(omitted, null, 1) + '\n');
  manifest.lowercase_other = { candidates: { messages: candidates.messages, requests: candidates.wires, groups: candidates.groups.size }, replaced_messages: lcItems.length, replacements: reps.length, omitted_messages: omitted.length,
    files: { replacements: hashFile(resolve(out, 'lowercase_other.replacements.json')), omitted: hashFile(resolve(out, 'lowercase_other.omitted.json')) } };
  manifest.failed_checks = checks.filter(c => !c.ok).length;
  writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  return manifest;
}

// ---------------------------------------------------------------- paired comparisons (frozen groups are the resampled unit; 1,000 resamples, seed 20261105, no interval below ten groups)
/** a bundle = one evaluated arm: {name, dir, score (score.truthful.json), sidecar (its per-message file, checked against its hash)} */
export function loadBundle(name, dir) {
  const sp = resolve(dir, 'score.truthful.json');
  if (!existsSync(sp)) throw new Error(`${dir}: no score.truthful.json`);
  const score = J(sp), f = score.per_message?.file ? resolve(dir, basename(score.per_message.file)) : null;
  if (!f || !existsSync(f) || sha256(readFileSync(f)) !== score.per_message.sha256) throw new Error(`${dir}: the per-message file is missing or changed since the scores were made`);
  const idf = resolve(dir, 'identity.json');
  return { name, dir, score, sidecar: J(f), identity: existsSync(idf) ? J(idf) : null };
}
/** the bundles of a verdict or a comparison must come from the same basis: the protocol in use, one views manifest, the addendum in use. A bundle without an identity
 *  (an evaluation made before the addendum existed) is refused: its constants are not the ones the verdict would read. */
export function assertSameBasis(PR, bundles) {
  const views = new Set();
  for (const b of bundles) {
    const id = b.identity;
    if (!id) throw new Error(`bundle ${b.name}: no identity.json: it cannot be tied to the protocol and addendum in use`);
    if (id.protocol_sha256 !== PR.sha256) throw new Error(`bundle ${b.name}: made under protocol ${String(id.protocol_sha256).slice(0, 12)}, not ${PR.sha256.slice(0, 12)}`);
    if (!PR.addendum || id.addendum_sha256 !== PR.addendum.sha256) throw new Error(`bundle ${b.name}: made under addendum ${String(id.addendum_sha256).slice(0, 12)}, not the one in use`);
    views.add(id.views_manifest_sha256);
  }
  if (views.size > 1) throw new Error(`the bundles were made on different views manifests (${[...views].map(v => String(v).slice(0, 12)).join(', ')})`);
  return true;
}
const VARIANT = { gate: `gold.${TRUTHFUL_V1}.gate`, all: `gold.${TRUTHFUL_V1}.all` };
/** the paired cost comparison A - B of one sidecar key -> {a, b, difference, ci95, ci95_reason, resampled_units, ...} | {missing} | {error} */
export function pairwise(A, B, key, mode = 'gate') {
  const sa = A.sidecar[key], sb = B.sidecar[key];
  if (!sa || !sb) return { missing: `no per-message data for ${key} in ${!sa ? A.name : B.name}` };
  const [set, ...rest] = key.split('/'), fake = { sets: { [set]: { [rest.join('/')]: { use: 'evaluation' } } } };
  try {
    const c = compareSidecars({ [key]: sa }, { [key]: sb }, fake, fake)[key], v = c.variants[VARIANT[mode]];
    if (!v) return { missing: `no variant ${VARIANT[mode]} for ${key}` };
    return { ...v, messages: c.messages, resampled_units: c.resampled_units, unit: c.unit };
  } catch (e) { return { error: String(e.message || e) }; }
}
/** the 95% interval of the mean over seeds of the paired cost difference, the seeds averaged INSIDE each resample of the groups (criterion 22). pairs: [{A, B}]
 *  tally objects {right[], bad[]} per seed over the same messages; G[]; units: lists of message indices (the frozen groups). null for fewer than MIN_UNITS groups. */
export function seedAveragedInterval(units, G, pairs, resamples = RESAMPLES, seed = SEED) {
  if (units.length < MIN_UNITS || !pairs.length) return null;
  const sum = (idx, t) => idx.reduce((s, i) => s + t[i], 0), agg = units.map(u => ({ G: sum(u, G), p: pairs.map(({ A, B }) => [sum(u, A.right), sum(u, A.bad), sum(u, B.right), sum(u, B.bad)]) }));
  const next = rng(seed), diffs = [], cost = (r, b, g) => (r - 10 * b) / g * 100;
  for (let k = 0; k < resamples; k++) {
    let g = 0; const acc = pairs.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < agg.length; i++) { const u = agg[Math.floor(next() * agg.length)]; g += u.G; u.p.forEach((q, j) => { for (let t = 0; t < 4; t++) acc[j][t] += q[t]; }); }
    if (g) diffs.push(acc.reduce((s, q) => s + cost(q[0], q[1], g) - cost(q[2], q[3], g), 0) / acc.length);
  }
  diffs.sort((x, y) => x - y);
  const n = diffs.length;
  return n ? [diffs[Math.floor(.025 * n)], diffs[Math.min(n - 1, Math.ceil(.975 * n) - 1)]] : null;
}
/** the units (lists of message indices) of a sidecar entry: the frozen group of each message */
const unitsOfSidecar = sc => { const by = new Map(); sc.ids.forEach((_, i) => { const k = sc.group[i]; (by.get(k) || by.set(k, []).get(k)).push(i); }); return [...by.values()]; };

// ---------------------------------------------------------------- the fixed verdict tables
// status: pass | fail | unavailable (a threshold, population, metric or interval is missing) | pending (an input from another step is not given). Only `pass` passes.
const STATUS_ORDER = ['fail', 'unavailable', 'pending', 'pass'];
const worst = list => STATUS_ORDER.find(s => list.includes(s)) ?? 'pass';
/** one check: value must be a finite number (else unavailable), then test(value) decides. Never lets a null through. */
const chk = (name, value, test, extra = {}) => (fin(value) ? { name, value, ok: !!test(value), status: test(value) ? 'pass' : 'fail', ...extra } : { name, value: value ?? null, ok: false, status: 'unavailable', ...extra });
const chkBool = (name, value, extra = {}) => ({ name, value, ok: value === true, status: value === true ? 'pass' : value === false ? 'fail' : 'unavailable', ...extra });
const row = (id, title, checks, extra = {}) => { const status = worst(checks.map(c => c.status)); return { id, title, status, pass: status === 'pass', checks, ...extra }; };
const rule = (rules, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), rules);
const thresholdCheck = (name, rules, path, f) => { const t = rule(rules, path); return fin(t) ? f(t) : { name, value: null, ok: false, status: 'unavailable', reason: `threshold not in the protocol: decision_rules.${path.join('.')}` }; };
const part = (B, view, p) => B.score.sets?.[view]?.[p] ?? null;
/** the paired comparison of a population, only when BOTH arms have it with an available truthful measure (else {missing}: the check built on it is unavailable, never a pass) */
const pairedPop = (A, B, key, popName, mode = 'gate') => (popOf2(A, popName) && popOf2(B, popName) ? pairwise(A, B, key, mode) : { missing: `population ${popName} is absent or has an unavailable measure in ${!popOf2(A, popName) ? A.name : B.name}` });
/** the support flag of a population (the manifest's rule for it) in each bundle: a population that has a rule and is not supported cannot decide; one with no rule adds no check */
const supportChecks = (name, ...bundles) => bundles.flatMap(b => { const sup = b.score?.population_support?.[name]; return sup ? [chkBool(`${name} is a supported population (${b.name})`, sup.supported === true ? true : sup.supported === false ? false : null, { support: sup })] : []; });
const popOf2 = (B, name) => { const p = B.score.populations?.[name]; return p && p.available !== false ? p : null; };

/** Guard G of the plan, separately on fresh2 test, short3 test, nl_a development (full canonical populations; the clean ones are reported):
 *  cost difference at each reader's cost-10 threshold >= guard.cost_diff_min; paired interval upper end >= 0; wrong+extras per 100 requested up by at most
 *  guard.wrong_extras_per_100_max_increase. A is the candidate, B the comparator. */
export function guardG(rules, A, B) {
  const g = rules.guard, rows = [];
  for (const [view, p] of [['fresh2_test', 'test'], ['short3_test', 'test'], ['nl_a_development', 'development']]) {
    const key = `${view}/${p}`, pa = part(A, view, p), pb = part(B, view, p), cmp = pairwise(A, B, key), ga = pa?.gated, gb = pb?.gated;
    const avail = pa && pb && pa.available && pb.available && ga && gb;
    const inc = avail && fin(ga.wrong_plus_extras_per_100_requested) && fin(gb.wrong_plus_extras_per_100_requested) ? ga.wrong_plus_extras_per_100_requested - gb.wrong_plus_extras_per_100_requested : null;
    const clean = pairwise(A, B, `${view}/${p}#${view}_clean`);
    rows.push({ view, key, candidate_cost: ga?.cost_score ?? null, comparator_cost: gb?.cost_score ?? null, measure_available: !!avail, requested: ga?.requested ?? null,
      checks: [
        chk(`${key} cost difference >= ${g.cost_diff_min}`, avail ? cmp.difference : null, d => d >= g.cost_diff_min, { reason: cmp.missing || cmp.error }),
        chk(`${key} paired interval upper end >= 0`, avail && Array.isArray(cmp.ci95) ? cmp.ci95[1] : null, hi => hi >= 0, { ci95: cmp.ci95 ?? null, ci95_reason: cmp.ci95_reason ?? null, resampled_units: cmp.resampled_units ?? null }),
        chk(`${key} wrong+extras per 100 requested up by at most ${g.wrong_extras_per_100_max_increase}`, inc, d => d <= g.wrong_extras_per_100_max_increase + 1e-9, { candidate: ga?.wrong_plus_extras_per_100_requested ?? null, comparator: gb?.wrong_plus_extras_per_100_requested ?? null }),
      ], clean_population_reported: clean.difference !== undefined ? { difference: clean.difference, ci95: clean.ci95 ?? null, ci95_reason: clean.ci95_reason ?? null } : { unavailable: clean.missing || clean.error } });
  }
  const checks = rows.flatMap(r => r.checks);
  return { rows, status: worst(checks.map(c => c.status)), checks };
}
/** The evidence file of another step (--contract-evidence, --oracle-evidence): schema `modernbert-next-evidence-v1`,
 *    { "schema": "modernbert-next-evidence-v1", "results": { "<id>": { "status": "pass" | "fail", "command": "<the command that produced it>", "evidence": "<path of a file>", "sha256": "<64 hex of that file>" }, ... } }
 *  ids: "9".."14" for the output contract (acceptance B9-B14, criterion 15), "19" for the oracle's absent/count distinction. An entry counts only when it has a status,
 *  a command, an evidence path that exists and whose sha256 is the one named; a missing entry is `unavailable`, a failing one `fail`, a file that differs `fail`. */
export const EVIDENCE_SCHEMA = 'modernbert-next-evidence-v1';
export function evidenceEntry(ev, id) {
  const e = ev?.results?.[id];
  if (e == null) return { id, status: 'unavailable', reason: 'no entry' };
  if (typeof e !== 'object' || !['pass', 'fail'].includes(e.status) || typeof e.command !== 'string' || !e.command.trim() || typeof e.evidence !== 'string' || !/^[0-9a-f]{64}$/.test(e.sha256 ?? '')) return { id, status: 'unavailable', reason: 'the entry lacks status pass|fail, command, evidence path or sha256' };
  if (!existsSync(e.evidence)) return { id, status: 'fail', reason: `the evidence file ${e.evidence} is missing` };
  if (hashFile(e.evidence) !== e.sha256) return { id, status: 'fail', reason: `the evidence file ${e.evidence} differs from the sha256 named` };
  return { id, status: e.status, command: e.command, evidence: e.evidence, sha256: e.sha256 };
}
const evidenceCheck = (name, ev, ids) => {
  if (!ev) return { name, value: null, ok: false, status: 'pending', reason: 'the evidence of another step was not given' };
  if (ev.schema !== EVIDENCE_SCHEMA) return { name, value: null, ok: false, status: 'unavailable', reason: `evidence schema ${ev.schema} is not ${EVIDENCE_SCHEMA}` };
  const es = ids.map(i => evidenceEntry(ev, i)), st = worst(es.map(e => e.status));
  return { name, value: es.map(e => `${e.id}:${e.status}`), ok: st === 'pass', status: st, entries: es };
};

/** criterion 15: B passes G against C100 under the common calibration, and the output-contract conditions (acceptance 9-14) hold (evidence of the contract step) */
export const criterion15 = (rules, B, C100, ev) => { const G = guardG(rules, B, C100); return row('15', 'B-s0 passes Guard G against C100-s0 (common grouped calibration) and the output-contract conditions', [...G.checks, evidenceCheck('output contract (acceptance 9-14)', ev, ['9', '10', '11', '12', '13', '14'])], { guard: G.rows }); };
/** criterion 16: R versus B */
export function criterion16(rules, R, B) {
  const r = rules.R_vs_B, G = guardG(rules, R, B), checks = [...G.checks], pops = {};
  for (const [name, minKey] of [['lowercase_other_affected', 'lowercase_other_right_share_min_gain_points'], ['short3_lowercase', 'short3_lowercase_right_share_min_gain_points']]) {
    const pr = popOf2(R, name), pb = popOf2(B, name), shareR = pr?.ungated?.right_share, shareB = pb?.ungated?.right_share;
    const gain = fin(shareR) && fin(shareB) && pr.available && pb.available ? (shareR - shareB) * 100 : null;
    checks.push(thresholdCheck(`${name} ungated right share up by >= ${r[minKey]} points`, rules, ['R_vs_B', minKey], t => chk(`${name} ungated right share up by >= ${t} points`, gain, x => x >= t, { candidate: shareR ?? null, comparator: shareB ?? null, denominator: 'all frozen gold requested actions of the population' })));
    const inc = pr?.gated && pb?.gated && fin(pr.gated.wrong_plus_extras_per_100_requested) && fin(pb.gated.wrong_plus_extras_per_100_requested) ? pr.gated.wrong_plus_extras_per_100_requested - pb.gated.wrong_plus_extras_per_100_requested : null;
    checks.push(thresholdCheck(`${name} adds at most N confident mistakes per 100 requests`, rules, ['R_vs_B', 'lowercase_population_max_confident_mistakes_per_100_increase'], t => chk(`${name} adds at most ${t} confident mistake per 100 requests`, inc, d => d <= t + 1e-9)));
    pops[name] = { requested: pr?.requested ?? null, candidate_share: shareR ?? null, comparator_share: shareB ?? null };
  }
  checks.push(...supportChecks('lowercase_other_affected', R, B), ...supportChecks('short3_lowercase', R, B));
  const cmp = pairedPop(R, B, 'lowercase_other/all#lowercase_other_affected', 'lowercase_other_affected'), cmpAll = pairedPop(R, B, 'lowercase_other/all#lowercase_other_affected', 'lowercase_other_affected', 'all');
  checks.push(chk('lowercase_other paired gated cost interval lower end > 0', Array.isArray(cmp.ci95) ? cmp.ci95[0] : null, lo => lo > 0, { difference: cmp.difference ?? null, ci95: cmp.ci95 ?? null, ci95_reason: cmp.ci95_reason ?? cmp.missing ?? cmp.error ?? null, ungated_variant: { difference: cmpAll.difference ?? null, ci95: cmpAll.ci95 ?? null }, note: 'the cost is at each reader\'s cost-10 threshold (gated); the ungated variant is beside it' }));
  return row('16', 'R-s0 versus B-s0: lower-case populations and Guard G', checks, { guard: G.rows, populations: pops, word_names: wordNames(rules, R, B) });
}
/** criterion 17: S versus R */
export function criterion17(rules, S, R) {
  const t = rules.S_vs_R, cmp = pairedPop(S, R, 't1_all/all#t1_clean', 't1_clean'), create = pairedPop(S, R, 't1_all/all#t1_clean_create', 't1_clean_create');
  const ps = popOf2(S, 't1_clean'), pr = popOf2(R, 't1_clean');
  const checks = [
    chk(`t1_clean gated cost difference >= ${t.t1_clean_cost_min_gain}`, cmp.difference, d => d >= t.t1_clean_cost_min_gain, { ci95: cmp.ci95 ?? null }),
    chk('t1_clean paired interval lower end > 0', Array.isArray(cmp.ci95) ? cmp.ci95[0] : null, lo => lo > 0, { ci95_reason: cmp.ci95_reason ?? cmp.missing ?? cmp.error ?? null, resampled_units: cmp.resampled_units ?? null }),
    chk('confidently wrong share does not increase (S <= R, both with executions)', ps?.gated && pr?.gated && fin(ps.gated.risk) && fin(pr.gated.risk) ? ps.gated.risk - pr.gated.risk : null, d => d <= 1e-12, { candidate: ps?.gated?.risk ?? null, comparator: pr?.gated?.risk ?? null, candidate_wilson95: ps?.gated?.risk_wilson95 ?? null, comparator_wilson95: pr?.gated?.risk_wilson95 ?? null, executed: [ps?.gated?.executed ?? null, pr?.gated?.executed ?? null] }),
    ...supportChecks('t1_clean', S, R), ...supportChecks('t1_clean_create', S, R),
    chk('clean create subset gated cost: paired interval lower end > 0', Array.isArray(create.ci95) ? create.ci95[0] : null, lo => lo > 0, { difference: create.difference ?? null, ci95: create.ci95 ?? null, ci95_reason: create.ci95_reason ?? create.missing ?? create.error ?? null }),
  ];
  return row('17', 'S-s0 versus R-s0 on t1_clean and the clean create subset', checks);
}
/** criterion 18 (one arm): per-form ungated right shares over ALL frozen gold requested actions of the form, on supported clean populations */
export function criterion18(rules, S) {
  const checks = [];
  for (const [form, bar] of Object.entries(rules.form_bars)) {
    const name = `t1_clean_${form}`, p = popOf2(S, name), sup = S.supportOf?.[name] ?? S.score.population_support?.[name];
    checks.push(chk(`${form} ungated right share >= ${bar}`, p && p.available && sup?.supported === true ? p.ungated?.right_share : null, x => x >= bar, { requested: p?.requested ?? null, right: p?.ungated?.right ?? null, structural_holds: p?.ungated?.structural_holds?.total ?? null, unread: p?.ungated?.unread ?? null, supported: sup?.supported ?? null, denominator: 'all frozen gold requested actions of the form' }));
  }
  return row('18', 'supported clean per-form ungated right shares', checks);
}
/** criterion 19 (one arm): undo/redo counts on the frozen finite-grammar regression population; the oracle's absent/count distinction is another step's evidence */
export function criterion19(rules, S, oracleEv) {
  const p = popOf2(S, 't1_all_undo_redo_count');
  return row('19', 'undo/redo counts on the frozen finite-grammar regression population (exposure displayed)', [
    chk(`undo/redo count ungated right share >= ${rules.undo_redo_count_min}`, p && p.available ? p.ungated?.right_share : null, x => x >= rules.undo_redo_count_min, { requested: p?.requested ?? null, exposure: S.score.exposure?.t1_all_undo_redo_count ?? null, note: 'regression evidence of a finite grammar, not a generalisation test' }),
    evidenceCheck('absent/count distinction (the oracle, independently)', oracleEv, ['19']),
  ]);
}
/** criterion 20: label setting (S versus R) */
export function criterion20(rules, S, R) {
  const ps = popOf2(S, 't1_clean_label_setting'), pr = popOf2(R, 't1_clean_label_setting');
  const drop = ps?.ungated && pr?.ungated && fin(ps.ungated.right_share) && fin(pr.ungated.right_share) ? (pr.ungated.right_share - ps.ungated.right_share) * 100 : null;
  return row('20', 'label setting does not fall and no gated wrong empty-label output', [
    thresholdCheck('label-setting right share falls by at most N points', rules, ['label_setting_max_drop_points'], t => chk(`label-setting right share falls by at most ${t} points`, drop, d => d <= t, { candidate: ps?.ungated?.right_share ?? null, comparator: pr?.ungated?.right_share ?? null })),
    thresholdCheck('gated wrong empty-label outputs on nonempty-label gold at most N', rules, ['label_setting_gated_wrong_empty_on_nonempty_max'], t => chk(`gated wrong empty-label outputs on nonempty-label gold <= ${t}`, S.score.label_errors?.gated_empty_label_on_nonempty_gold ?? null, n => n <= t, { all_label_errors: S.score.label_errors ?? null })),
  ]);
}
/** criterion 21: S against R and the common-protocol C100 */
export function criterion21(rules, S, R, C100) {
  const checks = [];
  checks.push(...guardG(rules, S, R).checks.map(c => ({ ...c, name: 'S vs R: ' + c.name })), ...guardG(rules, S, C100).checks.map(c => ({ ...c, name: 'S vs C100: ' + c.name })));
  for (const name of ['lowercase_other_affected', 'short3_lowercase']) {
    checks.push(...supportChecks(name, S, R));
    const ps = popOf2(S, name), pr = popOf2(R, name), drop = ps?.ungated && pr?.ungated && fin(ps.ungated.right_share) && fin(pr.ungated.right_share) ? (pr.ungated.right_share - ps.ungated.right_share) * 100 : null;
    checks.push(thresholdCheck(`${name}: S at most N points below R`, rules, ['lowercase_max_drop_points'], t => chk(`${name}: S at most ${t} points below R`, drop, d => d <= t, { candidate: ps?.ungated?.right_share ?? null, comparator: pr?.ungated?.right_share ?? null })));
  }
  return row('21', 'S passes G against R and C100; lower-case populations not more than N points below R', checks);
}
/** criterion 22: the two seeds. bundles: {R0, R1, S0, S1, C0, C1} */
export function criterion22(rules, b) {
  const need = ['R0', 'R1', 'S0', 'S1', 'C0', 'C1'], missing = need.filter(k => !b[k]);
  if (missing.length) return row('22', 'two-seed confirmation', [{ name: 'all six bundles', value: null, ok: false, status: 'pending', reason: `missing ${missing.join(', ')}` }]);
  const key = 't1_all/all#t1_clean', checks = [];
  const seeds = [[b.S0, b.R0], [b.S1, b.R1]];
  seeds.forEach(([S, R], i) => { const c = pairwise(S, R, key); checks.push(chk(`seed ${i}: S-R t1_clean gated cost difference > 0`, c.difference, d => d > 0, { ci95: c.ci95 ?? null })); });
  const tallies = seeds.map(([S, R]) => ({ A: S.sidecar[key]?.tallies?.[VARIANT.gate], B: R.sidecar[key]?.tallies?.[VARIANT.gate] }));
  const ref = b.S0.sidecar[key];
  let ci = null, why = null;
  if (tallies.some(t => !t.A || !t.B) || !ref) why = 'no per-message data';
  else if (seeds.some(([S, R]) => JSON.stringify(S.sidecar[key].ids) !== JSON.stringify(ref.ids) || JSON.stringify(R.sidecar[key].ids) !== JSON.stringify(ref.ids))) why = 'the bundles hold other messages';
  else { ci = seedAveragedInterval(unitsOfSidecar(ref), tallies[0].A.G, tallies); if (!ci) why = `fewer than ${MIN_UNITS} groups`; }
  checks.push(chk('S-R t1_clean gated cost, seeds averaged inside each resampled group: interval lower end > 0', ci ? ci[0] : null, lo => lo > 0, { ci95: ci, ci95_reason: why, note: 'describes group variation conditional on two seeds, not the full seed distribution' }));
  [[b.S0, b.C0], [b.S1, b.C1]].forEach(([S, C], i) => checks.push(...guardG(rules, S, C).checks.map(c => ({ ...c, name: `seed ${i} S vs C100: ${c.name}` }))));
  [b.S0, b.S1].forEach((S, i) => checks.push(...criterion18(rules, S).checks.map(c => ({ ...c, name: `seed ${i} S: ${c.name}` }))));
  return row('22', 'two-seed confirmation (R-s1 is the matched control of S-s1; without B-s1 no two-seed R-B case benefit is established)', checks);
}
/** criterion 23: the product path, evidence of its own step */
export function criterion23(rules, ev) {
  // bound evidence like criteria 15 and 19: entry "23" = {status, command, evidence path, sha256} of the step that ran Guard G and the paired gated t1_clean cost on the product path
  return row('23', 'product-path S-s0 versus shipped C100 (Guard G and a positive paired gated t1_clean cost, bound evidence of the product-path step)', [evidenceCheck('product-path evidence', ev, ['23'])]);
}
/** data_attested_word_names: a diagnostic, never a veto. Counts and right share for any nonempty population; the paired interval only with enough support, else unavailable. */
export function wordNames(rules, A, B) {
  const sup = { requests: rules.word_names_interval_requests_min, groups: rules.word_names_interval_groups_min, source: 'decision_rules (protocol + addendum)' }, name = 'data_attested_word_names', pa = popOf2(A, name), pb = popOf2(B, name);
  if (!pa || !pa.requested) return { diagnostic_only: true, population: 'empty or absent' };
  const cmp = pairwise(A, B, 'lowercase_other/all#' + name), enough = fin(sup.requests) && fin(sup.groups) && pa.requested >= sup.requests && fin(pa.groups) && pa.groups >= sup.groups;
  return { diagnostic_only: true, requested: pa.requested, candidate: { right: pa.ungated.right, right_share: pa.ungated.right_share, gated_right_share: pa.gated?.right_share ?? null }, comparator: pb ? { right_share: pb.ungated.right_share, gated_right_share: pb.gated?.right_share ?? null } : null,
    interval: enough && cmp.ci95 ? { difference: cmp.difference, ci95: cmp.ci95 } : 'unavailable: ' + (fin(sup.requests) ? 'insufficient support (needs ' + sup.requests + ' requested actions and ' + sup.groups + ' independent groups)' : 'the support rule is not in the protocol'), support_rule_source: sup.source };
}

/** the arm-level rows of one evaluated bundle (what needs no comparator): 18, 19, 20's empty-label count and the supports */
export function armRows(rules, B, oracleEv) { return [criterion18(rules, B), criterion19(rules, B, oracleEv)]; }

/** every criterion row that the given bundles allow; the rest are pending. bundles: {C100, B, R, S, R1, S1, C100_1} (names of the evaluated arms) */
export function verdictTable(rules, bundles, evidence = {}) {
  const pend = (id, why) => row(id, why, [{ name: 'bundles', value: null, ok: false, status: 'pending', reason: 'the evaluated arms this criterion compares were not given' }]);
  const { C100, B, R, S } = bundles, rows = [];
  rows.push(B && C100 ? criterion15(rules, B, C100, evidence.contract) : pend('15', 'B-s0 versus C100-s0'));
  rows.push(R && B ? criterion16(rules, R, B) : pend('16', 'R-s0 versus B-s0'));
  rows.push(S && R ? criterion17(rules, S, R) : pend('17', 'S-s0 versus R-s0'));
  rows.push(S ? criterion18(rules, S) : pend('18', 'per-form bars of S'));
  rows.push(S ? criterion19(rules, S, evidence.oracle) : pend('19', 'undo/redo counts of S'));
  rows.push(S && R ? criterion20(rules, S, R) : pend('20', 'label setting of S'));
  rows.push(S && R && C100 ? criterion21(rules, S, R, C100) : pend('21', 'S against R and C100'));
  rows.push(criterion22(rules, { R0: R, R1: bundles.R1, S0: S, S1: bundles.S1, C0: C100, C1: bundles.C100_1 }));
  rows.push(criterion23(rules, evidence.product));
  const all = rows.every(r => r.pass === true);
  return { rows, all_pass: all, statuses: Object.fromEntries(rows.map(r => [r.id, r.status])) };
}

// ---------------------------------------------------------------- evaluating an arm
export const DECISION_VIEWS = ['calibration', 'fresh2_test', 'short3_test', 'nl_a_development', 't1_all', 'lowercase_other'];
export const EXTERNAL_VIEWS = ['t1s', 't1raw', 't1bs', 'short3s'];
const CODE = ['training/neural/parity/modernbert_next_measure.mjs', 'training/neural/parity/arm_lib.mjs', 'training/neural/parity/collect_set.mjs', 'training/neural/parity/calibrate_arm.mjs', 'training/neural/parity/score_arm.mjs',
  'training/neural/parity/root_causes.mjs', 'training/neural/parity/compare_arms.mjs', 'training/neural/parity/sets.mjs', 'training/neural/calibrate_modernbert.mjs', 'docs/js/neural.js', 'docs/js/neural-confidence.js', 'docs/js/bench-canon.js'];
const codeHashes = () => Object.fromEntries(CODE.map(p => [p, hashFile(resolve(REPO, p))]));

/** claim an output folder: it must not exist, or hold this tool's identity file with an identical identity (a resume). -> {resumed} */
export function claimOut(out, identity) {
  const idFile = resolve(out, 'identity.json');
  if (!existsSync(out)) { mkdirSync(out, { recursive: true }); writeFileSync(idFile, JSON.stringify(identity, null, 1) + '\n'); return { resumed: false }; }
  if (!existsSync(idFile)) throw new Error(`${out} exists and is not an output of this tool (no identity.json): refusing to write into it`);
  const old = J(idFile);
  if (stable(old) !== stable(identity)) {
    const keys = [...new Set([...Object.keys(old), ...Object.keys(identity)])].filter(k => stable(old[k]) !== stable(identity[k]));
    throw new Error(`${out}: the identity changed since this folder was started (${keys.join(', ')}); use a fresh folder: the old records are not a result of this configuration`);
  }
  return { resumed: true };
}

/** the legacy records of a cached collection, as one index by id (each file verified by loadRecords) */
function legacyIndex(files) {
  const { records } = loadRecords(files), by = new Map();
  for (const r of records) { if (by.has(r.id)) throw new Error(`legacy records: ${r.id} twice`); by.set(r.id, r); }
  return by;
}
const wiresKeyOf = list => JSON.stringify((list || []).map(g => [g.span, g.type, g.args]));
/** a legacy record read again as a run: its produced requests as the reader gave them (mains), so buildRecord can pair them against the gold of a view */
export function runOfRecord(r) {
  const nodes = new Map();
  const mains = r.produced.map(x => { const ns = x.nodes, main = ns[ns.length - 1]; for (const n of ns) nodes.set(n.id, n);
    return { node: main, mentions: ns.slice(0, -1), span: x.span, src: x.src, f: x.f, act: x.act, truncated: x.truncated, wireId: x.wireId, dependencies: x.dependencies, ...(x.blocked !== undefined ? { blocked: x.blocked, block_reasons: x.block_reasons } : {}) }; });
  return { reader: r.reader, cut: r.cut, cutInfo: r.cutInfo, unread: r.unread, error: r.error, mains, allNodes: [...nodes.values()] };
}
/** the records of a view made from the legacy records of the same readings: a record whose gold is unchanged is copied (its set, part and frozen group set), one whose gold
 *  the overlay changed is paired again against the new gold from the same produced requests. Every record is also rebuilt and compared with its copy, so the
 *  reconstruction itself is checked: `reconstruction_mismatches` must be 0. -> {records, projected, rebuilt, reconstruction_mismatches, missing: [ids]} */
export function projectView(items, legacy, { seen, artifacts }) {
  const records = [], missing = []; let projected = 0, rebuilt = 0, mismatches = 0;
  for (const it of items) {
    const old = legacy.get(it.id);
    if (!old || old.text !== it.text || old.input_sha256 === undefined || old.error) { missing.push(it.id); continue; }
    if (old.artifacts_sha256 !== artifacts) throw new Error(`${it.id}: the legacy record was made by other model artifacts than ${artifacts.slice(0, 12)}`);
    const fresh = buildRecord(it, runOfRecord(old), { seen, artifactsKey: artifacts });
    if (old.train_text_overlap) fresh.train_text_overlap = true;
    if (wiresKeyOf(old.goldSpans) === wiresKeyOf(it.wires.map(w => ({ span: w.span, type: w.type, args: w.args })))) {
      const copy = { ...old }; delete copy._file; delete copy.legacy_set;
      copy.goldAlt = null; copy.altPair = null; delete copy.input_sha256_alt;   // a view is read against one teacher's labels (the primary); the second teacher's belongs to the legacy set
      Object.assign(copy, { set: it.set, part: it.part, group_key: it.group_key, fold: it.fold, roles: it.roles, meta: it.meta, origin_id: it.origin_id ?? null });
      if (stable(copy) !== stable(fresh)) mismatches++;
      records.push(copy); projected++;
    } else { records.push(fresh); rebuilt++; }
  }
  return { records, projected, rebuilt, reconstruction_mismatches: mismatches, missing };
}

const spawnNode = (args, env, label) => {
  const r = spawnSync('node', args, { env: { ...process.env, ...env }, stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error(`${label}: exit ${r.status}`);
};
const normText = t => String(t).toLowerCase().split(/\s+/).filter(Boolean).join(' ');

/** the whole evaluation of one arm into OUT: records per view, the grouped calibration, truthful_v1 scores, the arm-level verdict rows */
export async function evaluateArm(opts) {
  const PR = withAddendum(loadProtocol(opts.protocol), opts.addendum), viewsDir = resolve(opts.views || resolve(PR.dir, '..', 'views')), model = resolve(opts.model), out = resolve(opts.out);
  if (String(opts.threads ?? 2) !== '2') throw new Error('every collection of the campaign runs THREADS=2 (the confidence signals differ in the sixth decimal across thread counts)');
  const { manifest, views } = loadViewDir(viewsDir);
  if (manifest.failed_checks) throw new Error(`${viewsDir}: ${manifest.failed_checks} cross-checks failed when the views were built`);
  if (manifest.protocol.sha256 !== PR.sha256) throw new Error(`${viewsDir} was built from another protocol.json`);
  if (!existsSync(model + '/config.json')) throw new Error(`--model ${model}: no config.json`);
  const trainDir = resolve(opts.trainData), include = [...DECISION_VIEWS, ...(opts.includeExternal ? EXTERNAL_VIEWS : [])];
  for (const v of include) if (!views.includes(v)) throw new Error(`the views folder has no view ${v}`);
  const modelFiles = filesOf(model), artifacts = digest(JSON.stringify(modelFiles));
  const identity = { tool: 'modernbert_next_measure evaluate', protocol_sha256: PR.sha256, views_manifest_sha256: hashFile(resolve(viewsDir, 'manifest.json')), arm: opts.arm, seed: opts.seed, model: { dir: model, artifacts_sha256: artifacts },
    train_data: { dir: trainDir, train_sha256: hashFile(resolve(trainDir, 'train.jsonl')) }, views: include, threads: '2', addendum_sha256: PR.addendum.sha256, reuse_legacy_records: opts.legacyRecords ? opts.legacyRecords.map(f => ({ file: f, sha256: hashFile(f) })) : null, code: codeHashes() };
  const { resumed } = claimOut(out, identity);
  mkdirSync(resolve(out, 'records'), { recursive: true });
  const log = (...a) => console.error(`[evaluate ${opts.arm}-s${opts.seed}]`, ...a);
  const legacy = opts.legacyRecords ? legacyIndex(opts.legacyRecords) : null, td = trainData(trainDir);
  const files = [], provenance = {}, t0 = Date.now();
  for (const v of include) {
    const file = resolve(out, 'records', `${v}.jsonl`), mf = file + '.manifest.json', t1 = Date.now();
    files.push(file);
    if (existsSync(mf) && J(mf).complete === true) { log(`${v}: records complete already (resume)`); provenance[v] = { source: 'resumed' }; continue; }
    const items = viewItems(v);
    const proj = legacy && !EXTERNAL_VIEWS.includes(v) && v !== 'lowercase_other' ? projectView(items, legacy, { seen: td.seen, artifacts }) : null;
    if (proj && !proj.missing.length) {
      if (proj.reconstruction_mismatches) throw new Error(`${v}: ${proj.reconstruction_mismatches} projected records differ from their reconstruction`);
      writeFileSync(file, proj.records.map(r => JSON.stringify(r)).join('\n') + '\n');
      const man = { config: { schema: RECORD_SCHEMA, reader: 'modernbert', model: { folder: model }, artifacts_sha256: artifacts, sets: [{ name: v, messages: items.length, input_sha256: setDigest(items) }], projected_from: opts.legacyRecords.map(f => ({ file: f, sha256: hashFile(f) })),
        projection: { projected: proj.projected, rebuilt_against_new_gold: proj.rebuilt, reconstruction_mismatches: 0 } }, complete: true, records: { count: proj.records.length, sha256: hashFile(file) }, failed: [], runtime: { projected: true } };
      writeFileSync(mf, JSON.stringify(man, null, 1) + '\n');
      provenance[v] = { source: 'projected from the cached legacy records', projected: proj.projected, rebuilt: proj.rebuilt, seconds: (Date.now() - t1) / 1000 };
      log(`${v}: ${proj.records.length} records projected (${proj.rebuilt} paired again against the overlaid gold)`);
    } else {
      if (proj) log(`${v}: ${proj.missing.length} messages have no legacy record: collecting the whole view`);
      spawnNode([resolve(HERE, 'collect_set.mjs'), '--train-data', trainDir, '--allow-text-overlap', `--views=${viewsDir}`, file, v], { READER: 'modernbert', MODEL: model, THREADS: '2' }, `collect ${v}`);
      provenance[v] = { source: 'collected by collect_set.mjs', seconds: (Date.now() - t1) / 1000 };
    }
  }
  const { records } = loadRecords(files);
  const { spec, report } = calibrateGrouped(records, 'calibration');
  writeAtomic(resolve(out, 'confidence.json'), JSON.stringify(spec, null, 2) + '\n'); writeAtomic(resolve(out, 'calibration.json'), JSON.stringify(report, null, 2) + '\n');
  const populations = loadPopulations(viewsDir), { out: score, sidecar } = scoreArmTruthful(spec, records, { populations });
  const side = JSON.stringify(sidecar), sideFile = resolve(out, 'score.truthful.per_message.json');
  writeAtomic(sideFile, side);
  score.per_message = { file: sideFile, sha256: sha256(side) }; score.record_files = files; score.confidence_file = resolve(out, 'confidence.json');
  score.population_support = manifest.support; score.arm = { name: opts.arm, seed: opts.seed }; score.views_manifest_sha256 = identity.views_manifest_sha256;
  score.exposure = exposureOf(populations, td, trainDir); score.label_errors = labelErrors(records, spec);
  score.flip_risk = flipRisk(records, spec, Object.fromEntries(include.map(v => [v, provenance[v]?.source?.startsWith('projected') ? 'projected from the cached legacy records (their collection threads)' : 'collected here, THREADS=2'])));
  score.addendum = PR.addendum;
  writeAtomic(resolve(out, 'score.truthful.json'), JSON.stringify(score, null, 1) + '\n');
  const bundle = loadBundle(`${opts.arm}-s${opts.seed}`, out);
  const rules = PR.rules, rows = armRows(rules, bundle, null);
  writeAtomic(resolve(out, 'verdict_arm.json'), JSON.stringify({ arm: opts.arm, seed: opts.seed, rows, note: 'arm-level rows only; the comparisons (15-17, 20-23, Guard G) need the other arms: modernbert_next_measure.mjs verdict', provenance, resumed, wall_seconds: (Date.now() - t0) / 1000 }, null, 1) + '\n');
  return { score, rows, provenance, out };
}
const viewItems = v => setItems(v);   // the items of a registered view, in file order

/** how much of each population's spans the arm's training requests wrote (an exposure status; regression evidence, not generalisation) */
export function exposureOf(populations, td, trainDir) {
  const texts = new Set(); for (const r of jsonl(resolve(trainDir, 'train.jsonl'))) texts.add(normText(r.text));
  const out = {};
  for (const pop of populations) { const its = new Map(setItems(pop.view).map(i => [i.id, i])); let n = 0, exposed = 0; for (const [id, idx] of pop.requests) for (const j of idx) { n++; if (texts.has(normText(its.get(id).wires[j].span))) exposed++; } out[pop.name] = { requests: n, span_equals_a_training_request: exposed }; }
  return out;
}
/** every label error of the evaluation views, ungated and gated, from the RAW arguments of every executed request that is paired with a gold request, whatever the pairing called it
 *  (bench-canon lower-cases and so calls a produced "" against a gold "Foo" ... wrong with no reason; the raw comparison does not depend on that). Counted per kind:
 *  `text:label missing` (gold writes a label, the request none), `text:label unwanted` (the request writes one, the gold none), `text:label value` (both, different), and the one
 *  that must be zero: a produced label === '' against a nonempty gold label (`gated_empty_label_on_nonempty_gold`, and `ungated_...`). Extras have no gold and are not label errors. */
export function labelErrors(records, spec) {
  const ev = records.filter(r => r.part !== 'calibration'), { items } = truthfulItemsOf(ev), thr = spec?.levels_out_of_fold?.cost?.threshold;
  const scored = items.map(x => ({ ...x, c: spec && x.f && x.act ? confidence(spec, x.f, x.act) : NaN })), gated = decideTruthful(scored, fin(thr) ? thr : null), ungated = decideTruthful(scored, null);
  const out = { gated_empty_label_on_nonempty_gold: 0, ungated_empty_label_on_nonempty_gold: 0, gated_by_reason: {}, ungated_by_reason: {}, executed_without_raw_arguments: 0 };
  const count = (list, level) => {
    for (const x of list) {
      if (!x.execute || x.g < 0) continue;
      const raw = rawArgsOf(x);
      if (!raw) { if (level === 'gated') out.executed_without_raw_arguments++; continue; }
      const g = ev[x.mi].goldSpans[x.g].args, gHas = g.label != null, pHas = raw.label != null;
      const why = gHas && !pHas ? 'text:label missing' : !gHas && pHas ? 'text:label unwanted' : gHas && pHas && String(g.label) !== String(raw.label) ? 'text:label value' : null;
      if (!why) continue;
      out[level + '_by_reason'][why] = (out[level + '_by_reason'][why] || 0) + 1;
      if (pHas && raw.label === '' && gHas && String(g.label) !== '') out[level + '_empty_label_on_nonempty_gold']++;
    }
  };
  count(gated, 'gated'); count(ungated, 'ungated');
  return out;
}

/** how many requests have a confidence within `window` of the cost-10 threshold, per view: the ones a change of the last decimals of the signals (thread count, see reproduce) could flip
 *  between executed and held. Structurally held requests are not counted (they never execute). viewSource: {view: where its records come from}. */
export function flipRisk(records, spec, viewSource = {}, windows = [1e-5, 1e-4]) {
  const thr = spec?.levels_out_of_fold?.cost?.threshold;
  if (!fin(thr)) return { threshold: null, note: 'no finite threshold' };
  const { items } = truthfulItemsOf(records), scored = items.map(x => ({ ...x, c: x.f && x.act ? confidence(spec, x.f, x.act) : NaN })), dec = decideTruthful(scored, null);
  const byView = {};
  dec.forEach(x => {
    if (x.structural || !fin(x.c)) return;
    const v = records[x.mi].set, e = (byView[v] ||= { source: viewSource[v] ?? null, requests_with_confidence: 0, ...Object.fromEntries(windows.map(w => ['within_' + w, 0])), ...Object.fromEntries(windows.map(w => ['above_threshold_within_' + w, 0])) });
    e.requests_with_confidence++;
    for (const w of windows) if (Math.abs(x.c - thr) <= w) { e['within_' + w]++; if (x.c >= thr) e['above_threshold_within_' + w]++; }
  });
  const total = Object.fromEntries(windows.map(w => ['within_' + w, Object.values(byView).reduce((n, e) => n + e['within_' + w], 0)]));
  return { threshold: thr, windows, by_view: byView, total, note: 'an upper bound on the decisions a change of the last decimals of the signals could flip: a request counts when |confidence - threshold| <= the window' };
}

// ---------------------------------------------------------------- the historical reproduction
const IGNORED_PATHS = new Set(['.record_files', '.confidence_file', '.per_message.file']);
/** deep comparison of two JSON values, ignoring the path fields; -> the differences */
export function deepDiff(a, b, ignore = IGNORED_PATHS, path = '') {
  if (ignore.has(path)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => deepDiff(a[k], b[k], ignore, path + '.' + k));
  return a === b ? [] : [{ path, produced: a, expected: b }];
}
/** the historical C100-s0 numbers again, by the old invocations on the old records and the old (un-overlaid) sets: the confidence files byte for byte, the score files
 *  number for number. -> the report; `all_match` false on any difference. */
export function reproduce(PR, out, { recollect = false } = {}) {
  if (existsSync(out)) throw new Error(`${out} exists: refusing to overwrite`);
  mkdirSync(out, { recursive: true });
  const C = CACHE + '/arms/C100-s0', EV = REPO + '/reports/evidence/modernbert-c100-recal', node = HERE, steps = [], recs = ['rec_fs', 'rec_nl', 'rec_cs'].map(n => `${C}/eval/${n}.jsonl`), recSS = `${C}/recal/rec_ss.jsonl`;
  const run = (name, args, compares) => {
    const t = Date.now(), r = spawnSync('node', args, { encoding: 'utf8', maxBuffer: 1 << 28 }), matches = [];
    if (r.status === 0) for (const c of compares) matches.push(c());
    steps.push({ step: name, command: 'node ' + args.map(a => relative(REPO, a).startsWith('..') ? a : relative(REPO, a)).join(' '), exit: r.status, seconds: (Date.now() - t) / 1000, stdout: r.stdout, stderr: r.stderr.slice(0, 2000), matches });
    return r;
  };
  const bytes = (what, a, b) => () => ({ what, ok: existsSync(a) && existsSync(b) && readFileSync(a).equals(readFileSync(b)), produced: a, expected: b });
  const text = (what, a, b) => () => ({ what, ok: a === readFileSync(b, 'utf8'), expected: b });
  const jsonEq = (what, a, b) => () => { const d = deepDiff(J(a), J(b)); return { what, ok: d.length === 0, differences: d.length, first: d.slice(0, 5), expected: b }; };
  const sc = n => resolve(out, n);
  run('eval fit: calibrate_arm --cal fresh2,short3,nl_a', [`${node}/calibrate_arm.mjs`, '--cal', 'fresh2,short3,nl_a', sc('ctrl.confidence.json'), sc('ctrl.calibration.json'), ...recs], [
    bytes('confidence file equals the 2026-11-06 eval fit', sc('ctrl.confidence.json'), `${C}/eval/cal-fresh2-short3-nl_a.confidence.json`),
    bytes('confidence file equals the published docs/model/confidence/modernbert-c100.json', sc('ctrl.confidence.json'), REPO + '/docs/model/confidence/modernbert-c100.json'),
    bytes('calibration report equals the eval one', sc('ctrl.calibration.json'), `${C}/eval/cal-fresh2-short3-nl_a.calibration.json`)]);
  run('eval score: score_arm', [`${node}/score_arm.mjs`, sc('ctrl.confidence.json'), sc('ctrl.score.json'), ...recs], [
    jsonEq('score file equals the published eval score (every number, path fields aside)', sc('ctrl.score.json'), `${C}/eval/cal-fresh2-short3-nl_a.score.json`),
    bytes('per-message sidecar equals the eval one', sc('ctrl.score.per_message.json'), `${C}/eval/cal-fresh2-short3-nl_a.score.per_message.json`)]);
  steps[steps.length - 1].matches.push(text('score log lines equal the eval log', steps[steps.length - 1].stdout, `${C}/eval/cal-fresh2-short3-nl_a.score.log`)());
  run('recal control score: score_arm on the four record files', [`${node}/score_arm.mjs`, sc('ctrl.confidence.json'), sc('ctrl4.score.json'), ...recs, recSS], [jsonEq('score file equals recal/ctrl.score.json', sc('ctrl4.score.json'), `${C}/recal/ctrl.score.json`)]);
  run('recal short fit: calibrate_arm --cal fresh2,short3,nl_a,short_synth', [`${node}/calibrate_arm.mjs`, '--cal', 'fresh2,short3,nl_a,short_synth', sc('short.confidence.json'), sc('short.calibration.json'), ...recs, recSS], [
    bytes('confidence file equals reports/evidence/modernbert-c100-recal/short.confidence.json', sc('short.confidence.json'), `${EV}/short.confidence.json`)]);
  if (recollect) {
    const t = Date.now(), file = sc('recollect_collected_1.jsonl'), model = `${C}/export/modernbert-C100-s0`;
    const r = spawnSync('node', [`${node}/collect_set.mjs`, '--train-data', `${C}/../data/C100`, '--allow-text-overlap', file, 'collected_1'], { env: { ...process.env, READER: 'modernbert', MODEL: model, THREADS: '2' }, encoding: 'utf8' });
    const matches = [];
    if (r.status === 0) {
      const old = new Map(jsonl(`${C}/eval/rec_cs.jsonl`).filter(x => x.set === 'collected_1').map(x => [x.id, x]));
      let bitDifferent = 0, structural = 0, maxSignal = 0; const ids = [];
      for (const x of jsonl(file)) {
        const o = old.get(x.id);
        if (!o) { structural++; continue; }
        if (stable(x) === stable(o)) continue;
        bitDifferent++; ids.push(x.id);
        // a difference in the confidence signals f (float noise of the thread count: THREADS=2 here, 5 in the cached run) is measured; any other difference is structural
        const strip = r => ({ ...r, produced: r.produced.map(p => ({ ...p, f: undefined })) });
        if (stable(strip(x)) !== stable(strip(o))) structural++;
        x.produced.forEach((p, i) => { for (const k of Object.keys(p.f || {})) maxSignal = Math.max(maxSignal, Math.abs((p.f[k] ?? 0) - (o.produced[i]?.f?.[k] ?? 0))); });
      }
      matches.push({ what: `a fresh collection of collected_1 (${old.size} messages, THREADS=2) against the cached records (THREADS=5): no structural difference (cut, acts, values, pairing) and every confidence signal within 1e-5`, ok: structural === 0 && maxSignal <= 1e-5 && old.size > 0,
        bit_identical_records: old.size - bitDifferent, bit_different_records: bitDifferent, structural_differences: structural, max_abs_signal_difference: maxSignal, ids: ids.slice(0, 8), note: 'not bit-exact across thread counts: the signals differ in the sixth decimal' });
    }
    steps.push({ step: 'determinism spot check: collect_set collected_1', command: `READER=modernbert THREADS=2 MODEL=${model} node collect_set.mjs --train-data ${C}/../data/C100 --allow-text-overlap ${file} collected_1`, exit: r.status, seconds: (Date.now() - t) / 1000, stderr: (r.stderr || '').slice(-1000), matches });
  }
  const all = steps.every(s => s.exit === 0 && s.matches.length > 0 && s.matches.every(m => m.ok));
  const rep = { tool: 'modernbert_next_measure reproduce', protocol_sha256: PR.sha256, all_match: all, steps: steps.map(s => ({ ...s, stdout: undefined })), code: codeHashes() };
  writeFileSync(resolve(out, 'reproduction.json'), JSON.stringify(rep, null, 1) + '\n');
  writeFileSync(resolve(out, 'reproduction.md'), ['# Historical C100-s0 reproduction', '', `All match: **${all}**`, '', ...steps.flatMap(s => [`## ${s.step} (exit ${s.exit}, ${s.seconds} s)`, '', '`' + s.command + '`', '', ...s.matches.map(m => `- ${m.ok ? 'MATCH' : 'MISMATCH'}: ${m.what}${m.differences ? ` (${m.differences} differences)` : ''}`), ''])].join('\n'));
  return rep;
}

// ---------------------------------------------------------------- the command line
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (['recollect', 'includeExternal'].includes(k)) o[k] = true;
    else if (k === 'bundle') (o.bundles ||= []).push(argv[++i]);
    else o[k] = argv[++i];
    if (o[k] === undefined && k !== 'bundle' && !['recollect', 'includeExternal'].includes(k)) throw new Error(`--${a.slice(2)} needs a value`);
  }
  return o;
}
async function main(argv) {
  const [cmd, ...rest] = argv, o = parseArgs(rest), need = (...ks) => { for (const k of ks) if (!o[k]) throw new Error(`--${k} is required`); };
  if (cmd === 'views') {
    need('protocol', 'out');
    const PR = loadProtocol(o.protocol), m = buildViews(PR, resolve(o.out), o.baselineTrain ? { baselineTrain: o.baselineTrain } : {});
    console.log(JSON.stringify({ views: m.views.map(v => [v.name, v.messages]), populations: m.populations.map(p => [p.name, p.requests]), failed_checks: m.failed_checks, out: resolve(o.out) }));
    if (m.failed_checks) { console.error(m.cross_checks.filter(c => !c.ok)); process.exitCode = 1; }
  } else if (cmd === 'reproduce') {
    need('protocol', 'out');
    const rep = reproduce(loadProtocol(o.protocol), resolve(o.out), { recollect: !!o.recollect });
    for (const s of rep.steps) for (const m of s.matches) console.log(`${m.ok ? 'MATCH   ' : 'MISMATCH'} ${m.what}`);
    console.log('all_match ' + rep.all_match); if (!rep.all_match) process.exitCode = 1;
  } else if (cmd === 'evaluate' || cmd === 'baseline') {
    need('protocol', 'model', 'out', 'addendum');
    const base = cmd === 'baseline', arm = base ? 'C100' : o.arm, seed = base ? 0 : +o.seed;
    if (!base) need('arm', 'seed');
    if (!['B', 'R', 'S', 'C100'].includes(arm) || !Number.isInteger(seed)) throw new Error('--arm is B, R or S; --seed an integer');
    const trainData = o.trainData || (base ? CACHE + '/arms/data/C100' : null);
    if (!trainData) throw new Error('--train-data DIR (the arm\'s training data: train.jsonl and trigger_inventory.json) is required');
    const legacy = base ? ['eval/rec_fs', 'eval/rec_nl', 'recal/rec_ss'].map(n => `${CACHE}/arms/C100-s0/${n}.jsonl`) : null;
    const r = await evaluateArm({ protocol: o.protocol, addendum: o.addendum, model: o.model, out: o.out, views: o.views, arm, seed, trainData, includeExternal: !!o.includeExternal, threads: o.threads, legacyRecords: o.legacyRecords ? o.legacyRecords.split(',') : legacy });
    for (const row of r.rows) console.log(`${row.id} ${row.status}: ${row.title}`);
  } else if (cmd === 'verdict') {
    need('protocol', 'out', 'addendum');
    const PR = withAddendum(loadProtocol(o.protocol), o.addendum), bundles = {}, map = { C100: 'C100', B: 'B', R: 'R', S: 'S', R1: 'R1', S1: 'S1', C100_1: 'C100_1' };
    for (const b of o.bundles || []) { const [n, d] = b.split('='); if (!map[n]) throw new Error(`--bundle ${n}: one of ${Object.keys(map)}`); bundles[n] = loadBundle(n, resolve(d)); }
    assertSameBasis(PR, Object.values(bundles));
    const ev = {}; for (const [k, f] of [['contract', o.contractEvidence], ['oracle', o.oracleEvidence], ['product', o.productEvidence]]) if (f) ev[k] = J(f);
    const t = verdictTable(PR.rules, bundles, ev);
    if (existsSync(o.out)) throw new Error(`${o.out} exists: refusing to overwrite`);
    mkdirSync(resolve(o.out), { recursive: true });
    writeFileSync(resolve(o.out, 'verdict.json'), JSON.stringify({ protocol_sha256: PR.sha256, addendum: PR.addendum, evidence_schema: EVIDENCE_SCHEMA, ...t, thresholds: { decision_rules: PR.rules } }, null, 1) + '\n');
    for (const r of t.rows) console.log(`${r.id} ${r.status}: ${r.title}`);
    console.log('all_pass ' + t.all_pass);
  } else if (cmd === 'compare') {
    need('protocol', 'out', 'a', 'b', 'criterion', 'addendum');
    const PR = withAddendum(loadProtocol(o.protocol), o.addendum), A = loadBundle('A', resolve(o.a)), B = loadBundle('B', resolve(o.b));
    assertSameBasis(PR, [A, B]);
    const f = { guard: () => { const G = guardG(PR.rules, A, B); return { rows: G.rows, status: G.status }; }, 15: () => criterion15(PR.rules, A, B, null), 16: () => criterion16(PR.rules, A, B), 17: () => criterion17(PR.rules, A, B), word_names: () => wordNames(PR.rules, A, B) }[o.criterion];
    if (!f) throw new Error('--criterion is guard, 15, 16, 17 or word_names (the rest: verdict)');
    if (existsSync(o.out)) throw new Error(`${o.out} exists: refusing to overwrite`);
    mkdirSync(resolve(o.out), { recursive: true });
    writeFileSync(resolve(o.out, `compare_${o.criterion}.json`), JSON.stringify({ protocol_sha256: PR.sha256, addendum: PR.addendum, result: f() }, null, 1) + '\n');
  } else if (cmd === 'flip-risk') {
    need('eval', 'views', 'out');
    const dir = resolve(o.eval), spec = J(resolve(dir, 'confidence.json')), score = J(resolve(dir, 'score.truthful.json'));
    if (existsSync(o.out)) throw new Error(`${o.out} exists: refusing to overwrite`);
    loadViewDir(resolve(o.views));
    const { records } = loadRecords(score.record_files), src = {};
    for (const f of score.record_files) { const m = J(f + '.manifest.json'), v = basename(f).replace(/\.jsonl$/, ''); src[v] = m.config?.projected_from ? 'projected from the cached legacy records (THREADS=5 at their collection)' : `collected here, THREADS=${m.config?.threads ?? '?'}`; }
    const fr = flipRisk(records, spec, src);
    mkdirSync(resolve(o.out), { recursive: true });
    writeFileSync(resolve(o.out, 'flip_risk.json'), JSON.stringify({ eval_dir: dir, ...fr }, null, 1) + '\n');
    console.log(JSON.stringify({ threshold: fr.threshold, total: fr.total, by_view: Object.fromEntries(Object.entries(fr.by_view).map(([v, e]) => [v, [e.source, e.requests_with_confidence, e['within_0.00001'], e['within_0.0001']]])) }));
  } else throw new Error('usage: modernbert_next_measure.mjs views|reproduce|evaluate|baseline|compare|verdict|flip-risk ...');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2));
