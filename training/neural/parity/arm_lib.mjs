// arm_lib.mjs: what collect_set, calibrate_arm, score_arm and compare_arms share (MODERNBERT_PARITY_PLAN.md M0.5).
//  - the direction of a resize as a value (bench-canon.js skips `scale`, so growing a shape on "shrink" scores as right there);
//  - one record per message (the format of collect_modernbert.mjs: the produced requests with their confidence features, right / wrong /
//    extra against the gold, the gold spans, trigger seen / unseen), plus set, part, kind, writer, session, group, the second teacher's
//    gold and the produced requests' wires; buildRecord makes it from what a reader gave;
//  - reading records back (the first ModernBERT's records too) and the outcome of a produced request under a teacher view and a scoring.
import { readFileSync, existsSync } from 'node:fs';
import { canon, canonWant } from '../../../docs/js/bench-canon.js';
import { goldSpans, pairValue, actOf } from '../../sketch/layer_common.mjs';
import { inputHash, digest, hashFile } from '../calibrate_modernbert.mjs';
import { loadSets, assignParts, SET_ORDER, PARTS } from './sets.mjs';
import { K, run, goldProgram } from './parity_lib.mjs';

export const RECORD_SCHEMA = 'arm-records-v1';

// ---------------------------------------------------------------- the direction of a resize
/** the shrink words parity_lib.mjs goldProgram (and docs/js/logic.js) read as scale 0.67 on a gold resize with no scale, and two more that the gold
 *  rows of fresh2 hold and that rule misses: "more small" (fo-0090) and the typo "smaler" (fo-0119). goldProgram itself does not know them. */
export const SHRINK_RE = /\b(shrink|smaller|smaler|tinier|reduce|less big|more small)/i;
/** smaller / bigger / none for a resize, null for anything else. The engine (logic.js, resize with no scale: x1.5) makes a shape bigger when
 *  no scale is given; a size word (or a width or height) sets the size, so there is no direction. A gold row with no scale and a shrink
 *  word in its span means smaller (isGold, as goldProgram). A scale of exactly 1 is none; one that is not a number is `unknown` and never
 *  equals anything. */
export function resizeDirection(args, span, isGold = false) {
  if (!args || args.action !== 'resize') return null;
  if (args.size || args.width != null || args.height != null) return 'none';
  if (args.scale == null) return isGold && SHRINK_RE.test(span || '') ? 'smaller' : 'bigger';
  const v = Number(args.scale);
  if (!Number.isFinite(v)) return 'unknown';
  return v < 1 ? 'smaller' : v > 1 ? 'bigger' : 'none';
}
/** the shrink words parity_lib.mjs goldProgram has today: the plan's L2 count (17 on fresh2+short3 test) is by this rule */
export const REGISTERED_SHRINK_RE = /\b(shrink|smaller|tinier|reduce|less big)/i;
export const sameDirection = (got, want) => got === want && got !== 'unknown';

// ---------------------------------------------------------------- trigger inventory
const WORD_RE = /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu;
export const wordsOf = s => [...String(s).toLowerCase().matchAll(WORD_RE)].map(m => m[0]);
/** a trigger inventory -> (trigger string) => boolean. {exact: [triggers]}: the lower-cased annotation triggers of the training messages (what
 *  calibrate_modernbert.mjs trainingInventory returns, the registered definition). {ngrams: Set}: the trigger's words occur in a row of the
 *  training requests, one after the other (a fallback when only train.jsonl is there: its rows hold no trigger). */
export function seenFunction(inv) {
  if (inv.exact) { const s = new Set(inv.exact.map(x => String(x).toLowerCase())); return t => s.has(String(t).toLowerCase()); }
  return t => { const w = wordsOf(t); return w.length > 0 && inv.ngrams.has(w.join(' ')); };
}
export function ngramInventory(rows, maxN = 8) {
  const ngrams = new Set();
  for (const r of rows) {
    const w = (r.words || wordsOf(r.text || '')).map(x => String(x).toLowerCase());
    for (let i = 0; i < w.length; i++) for (let n = 1; n <= maxN && i + n <= w.length; n++) ngrams.add(w.slice(i, i + n).join(' '));
  }
  return { ngrams };
}

// ---------------------------------------------------------------- a record
const equalWant = (rawC, want) => Object.entries(want).every(([k, v]) => (rawC[k] ?? '∅') === v);
function goldOf(text, wires, seen) {
  const gold = goldSpans({ text, wires });
  gold.forEach((g, i) => {
    g.trigger = wires[i].trigger || null;
    g.triggerGroup = g.trigger == null ? 'unannotated' : seen(g.trigger) ? 'seen' : 'unseen';
    g.dirWant = resizeDirection(g.args, g.span, true);
  });
  return gold;
}
/** one teacher's requests played as a reader's, paired against the other's: the ceiling of agreement */
export function asReader(text, from, against) {
  const prods = from.map((g, u) => ({ u, act: g.act, rawC: g.want })), units = from.map(g => ({ c0: g.s, c1: g.e }));
  const pair = new Map(pairValue({ text, gold: against, units, prods }));
  return from.map((g, i) => { const j = pair.get(i) ?? -1; return { o: j < 0 ? 'extra' : equalWant(g.want, against[j].want) ? 'right' : 'wrong', g: j, pa: g.act, dir: g.dirWant }; });
}
const refsOf = v => (v && typeof v === 'object' && !Array.isArray(v) && typeof v.ref === 'string' ? [v.ref] : Array.isArray(v) ? v.flatMap(refsOf) : []);
export const stripNodes = nodes => nodes.map(n => ({ id: n.id, type: n.type, args: JSON.parse(JSON.stringify(n.args || {})) }));

/** the pairing of produced requests (prods: {u, act, rawC}; units: {c0, c1}) with a gold list -> [{g, o}] (o: right / wrong / extra against the
 *  paired gold, as collect_modernbert.mjs) */
function outcomesAgainst(text, prods, units, gold) {
  const pair = new Map(pairValue({ text, gold, units, prods }));
  return prods.map((p, i) => { const g = pair.get(i) ?? -1; return { g, o: g < 0 ? 'extra' : equalWant(p.rawC, gold[g].want) ? 'right' : 'wrong' }; });
}
/** a record read against the two teachers' labels of `teachers` (collected_1: Opus is the first, gpt the second) instead of its gold: the produced
 *  requests are paired again by their stored span, act and canonical value. Same fields as the record, so the scores take it as any record. */
export function teacherRecord(r) {
  if (r._tv) return r._tv;
  const gold = r.teachers.opus, alt = r.teachers.gpt;
  const prods = r.produced.map((x, u) => ({ u, act: x.pa, rawC: x.got })), units = r.produced.map(x => ({ c0: x.span[0], c1: x.span[1] }));
  const oc = outcomesAgainst(r.text, prods, units, gold);
  const produced = r.produced.map((x, i) => { const { g, o } = oc[i];
    return { ...x, o, g, want: g < 0 ? null : gold[g].want, triggerGroup: g < 0 ? 'unpaired extras' : gold[g].triggerGroup }; });
  return (r._tv = { ...r, goldSpans: gold, goldAlt: alt, altPair: asReader(r.text, alt, gold).map(x => x.g), gold: gold.length, goldActs: gold.map(g => g.act), produced });
}
/** the digest of the inputs of a set's messages, as collect_set.mjs writes it into the manifest (config.sets[].input_sha256): the texts, names, both
 *  teachers' wires, setup, session, group, kind, part, the unreliable flag */
export const setDigest = items => digest(items.map(it => inputHash({ id: it.id, text: it.text, names: it.names, wires: it.wires }) + (it.altWires ? inputHash({ id: it.id, text: it.text, names: it.names, wires: it.altWires }) : '')
  + (it.teachers ? JSON.stringify(it.teachers) : '') + (it.unreliable ? 'U' : '') + (it.setup ?? '') + (it.session ?? '') + (it.group ?? '') + it.kind + it.part).join('\n'));
const wiresKey = list => JSON.stringify((list || []).map(g => [g.span, g.type, g.args]));
/** the stored labels and fields of a record against the set as it is now -> the first difference, or null */
function recordDiffers(r, it) {
  if (r.legacy_set) return null;   // the first run's records hold none of these fields
  for (const k of ['kind', 'session', 'group', 'setup']) if ((r[k] ?? null) !== (it[k] ?? null)) return k;
  if (!!r.unreliable !== !!it.unreliable) return 'unreliable';
  if (wiresKey(r.goldSpans) !== wiresKey(it.wires)) return 'gold wires';
  if (wiresKey(r.goldAlt) !== wiresKey(it.altWires)) return 'second teacher wires';
  if (r.input_sha256_alt != null && r.input_sha256_alt !== inputHash({ id: it.id, text: it.text, names: it.names, wires: it.altWires })) return 'input_sha256_alt';
  if (!!r.teachers !== !!it.teachers || (it.teachers && (wiresKey(r.teachers.opus) !== wiresKey(it.teachers.opus) || wiresKey(r.teachers.gpt) !== wiresKey(it.teachers.gpt)))) return 'teachers wires';
  return null;
}
/** the record of one message. run: {reader, cut, mains: [{node, mentions, span, src, f, act, truncated, wireId, dependencies}], allNodes,
 *  unread, cutInfo, error}. node / mentions: the request's own wire and the mention wires it uses. f and act: the confidence signals
 *  (null when the reader has none, or they could not be made: such a request is never executed at a threshold). */
export function buildRecord(item, run, { seen, artifactsKey = null }) {
  const gold = goldOf(item.text, item.wires, seen), alt = item.altWires ? goldOf(item.text, item.altWires, seen) : null;
  const mains = run.mains || [], allNodes = run.allNodes || [];
  const prods = mains.map((m, i) => ({ u: i, act: actOf(m.node.type, m.node.args), rawC: canon(m.node, allNodes) }));
  const units = mains.map(m => ({ c0: m.span[0], c1: m.span[1] }));
  const oc = outcomesAgainst(item.text, prods, units, gold);
  const produced = mains.map((m, i) => {
    const { g, o } = oc[i], want = g < 0 ? null : gold[g].want;
    const exactCut = gold.some(w => m.span[0] === w.s && m.span[1] === w.e);
    return { o, g, triggerGroup: g < 0 ? 'unpaired extras' : gold[g].triggerGroup, act: m.act ?? null, pa: prods[i].act, f: m.f ?? null, src: m.src, span: m.span,
      got: prods[i].rawC, want, truncated: !!m.truncated, cause: o === 'right' ? null : !exactCut ? 'cutter' : 'heads', dependencies: m.dependencies || [], wireId: m.wireId,
      dir: resizeDirection(m.node.args, null, false), nodes: stripNodes([...(m.mentions || []), m.node]) };
  });
  const rec = { schema: RECORD_SCHEMA, id: item.id, set: item.set, part: item.part, kind: item.kind, writer: item.writer, session: item.session, step: item.step ?? null, group: item.group,
    setup: item.setup, reader: run.reader, input_sha256: inputHash({ id: item.id, text: item.text, names: item.names, wires: item.wires }), gold: gold.length, goldActs: gold.map(g => g.act),
    unreliable: !!item.unreliable, text: item.text, goldSpans: gold, goldAlt: alt, altPair: alt ? asReader(item.text, alt, gold).map(x => x.g) : null, teachers: item.teachers ? { opus: goldOf(item.text, item.teachers.opus, seen), gpt: goldOf(item.text, item.teachers.gpt, seen) } : null, produced, cut: run.cut ?? 'own', cutInfo: run.cutInfo ?? null, unread: run.unread || [], artifacts_sha256: artifactsKey };
  if (alt) rec.input_sha256_alt = inputHash({ id: item.id, text: item.text, names: item.names, wires: item.altWires });
  if (run.error) rec.error = String(run.error);
  return rec;
}
export { refsOf };

// ---------------------------------------------------------------- reading records
/** the records of files -> {records (canonical order: set order, then file order), legacy}. Each file must have the manifest of its collection
 *  (FILE.manifest.json, complete, with the record count and the hash of the file): a truncated or changed file is refused, as is a record
 *  made from other input than the set holds now, and a set that is not complete. The first ModernBERT's records (set fresh2+short3, produced
 *  requests under `modernbert`) are read as they are: their set is found by the id. A stored part that differs from the rule is an error.
 *  verify: false skips the manifest and input checks (for the unit tests of the rest only; no tool passes it). */
export function loadRecords(paths, { verify = true } = {}) {
  const out = [], manifests = new Map();
  let legacy = false;
  for (const p of paths) {
    const lines = readFileSync(p, 'utf8').split('\n');
    if (verify) {
      const mp = p + '.manifest.json';
      if (!existsSync(mp)) throw new Error(`${p}: no ${mp}: records are only read with the manifest of their collection`);
      const m = JSON.parse(readFileSync(mp, 'utf8')), n = lines.filter(l => l.trim()).length; manifests.set(p, m);
      if (m.complete !== true || !m.records || m.records.count !== n || m.records.sha256 !== hashFile(p))
        throw new Error(`${p}: not the complete collection its manifest describes (${n} records in the file; manifest: complete ${m.complete}, ${m.records ? m.records.count : 'no'} records, hash ${m.records && m.records.sha256 === hashFile(p) ? 'equal' : 'differs'}). A truncated, changed or unfinished file is not scored`);
    }
    lines.forEach((l, i) => {
      if (!l.trim()) return;
      let r; try { r = JSON.parse(l); } catch { throw new Error(`${p}:${i + 1}: not JSON (a partial record? collect_set.mjs resumes and repairs its own file)`); }
      if (!Array.isArray(r.produced)) {
        if (!Array.isArray(r.modernbert)) throw new Error(`${p}:${i + 1}: record ${r.id}: no produced requests`);
        r.produced = r.modernbert; delete r.modernbert; r.reader ??= 'modernbert'; legacy = true;
      }
      r._file = p; out.push(r);
    });
  }
  const need = out.filter(r => r.set === 'fresh2+short3');
  if (need.length) {
    const owner = new Map(loadSets(['fresh2', 'short3']).flatMap(s => s.items.map(it => [it.id, s.name])));
    for (const r of need) { const s = owner.get(r.id); if (!s) throw new Error(`record ${r.id} (set fresh2+short3) is in neither fresh2 nor short3`); r.legacy_set = r.set; r.set = s; }
  }
  const seen = new Set();
  for (const r of out) {
    if (!PARTS[r.set]) throw new Error(`record ${r.id}: unknown set ${r.set}`);
    const k = r.set + '\0' + r.id; if (seen.has(k)) throw new Error(`duplicate record ${r.set}/${r.id}`); seen.add(k);
  }
  if (verify) {
    for (const set of SET_ORDER) {
      const rs = out.filter(r => r.set === set);
      if (!rs.length) continue;
      const items = new Map(loadSets([set])[0].items.map(it => [it.id, it]));
      for (const r of rs) {
        const it = items.get(r.id);
        if (!it) throw new Error(`record ${r.id} is not a message of ${set}`);
        if (r.text !== it.text || r.input_sha256 !== inputHash({ id: it.id, text: it.text, names: it.names, wires: it.wires })) throw new Error(`record ${r.id} was made from other input than ${set} holds now (out-of-date records)`);
        const d = recordDiffers(r, it);
        if (d) throw new Error(`record ${r.id}: its stored ${d} differs from ${set} as it is now (out-of-date or changed records)`);
      }
      // the manifest's digest of the whole set (every label, setup, session, group, kind, part) against the set now
      for (const f of [...new Set(rs.map(r => r._file))]) {
        const m = manifests.get(f), entry = m && m.config && (m.config.sets || []).find(x => x.name === set);
        if (entry && entry.input_sha256 !== setDigest([...items.values()])) throw new Error(`${f}: the manifest's digest of ${set} differs from ${set} as it is now: out-of-date records`);
      }
      if (rs.length !== items.size) throw new Error(`${set}: ${rs.length} records for ${items.size} messages: the records are not complete for the set`);
    }
  }
  for (const set of SET_ORDER) {
    const rs = out.filter(r => r.set === set);
    if (!rs.length) continue;
    const parts = assignParts(set, rs);
    rs.forEach((r, i) => { if (r.part != null && r.part !== parts[i]) throw new Error(`record ${r.id}: stored part ${r.part} differs from the rule of ${set} (${parts[i]})`); r.part = parts[i]; });
  }
  const records = out.map((r, i) => [r, i]).sort((a, b) => SET_ORDER.indexOf(a[0].set) - SET_ORDER.indexOf(b[0].set) || a[1] - b[1]).map(x => x[0]);
  return { records, legacy };
}
/** the one reader and artifact set of a list of records */
export function oneArm(records) {
  const readers = new Set(records.map(r => r.reader)), arts = new Set(records.map(r => r.artifacts ? JSON.stringify(r.artifacts) : r.artifacts_sha256 ?? 'none'));
  if (readers.size !== 1) throw new Error('Records of several readers: ' + [...readers].join(', '));
  if (arts.size !== 1) throw new Error('Records of several model artifacts');
  return { reader: [...readers][0], artifact: [...arts][0] };
}

// ---------------------------------------------------------------- outcomes
export const TEACHERS = ['primary', 'either'];
const wantDir = g => g.dirWant ?? resizeDirection(g.args, g.span, true);
/** the requested actions of a record under a teacher view: primary = its gold requests (Opus in nl_*); either = the union of the two teachers'
 *  requests, one slot per action: a gpt request that pairs (the same act, the best overlap: the pairing the ceiling uses) with an Opus request
 *  shares its slot, any other gpt request is a slot of its own. A slot is done once: one produced request fills it. */
export function slotsOf(r, view) {
  if (view !== 'either' || !r.goldAlt) return r.goldSpans.map((g, i) => ({ labels: [g], group: g.triggerGroup, gold: i }));
  const pair = r.altPair || asReader(r.text, r.goldAlt, r.goldSpans).map(x => x.g), slots = r.goldSpans.map((g, i) => ({ labels: [g], group: g.triggerGroup, gold: i }));
  r.goldAlt.forEach((g, k) => { if (pair[k] >= 0) slots[pair[k]].labels.push(g); else slots.push({ labels: [g], group: g.triggerGroup, gold: -1 }); });
  return slots;
}
const fits = (x, label, scoring) => x.pa === label.act && equalWant(x.got, label.want) && (scoring !== 'direction' || x.pa !== 'command:resize' || x.dir === undefined || sameDirection(x.dir, wantDir(label)));
/** the outcome of every produced request of a record: {o: [right | wrong | extra], group: [trigger group], unavailable}.
 *  primary: its paired gold request (the pairing of collect_modernbert.mjs). either: a produced request is judged against ONE slot, never
 *  another span's: the slot its Opus pairing chose (which holds the Opus request and the gpt request that pairs with it), or, when it has no
 *  Opus request, the gpt-only slot pairValue pairs it with (same act, best span overlap). It is right when it equals a label of that slot
 *  (and, with the direction, goes that label's way); wrong when paired and not equal; an extra when it has no slot or matches none. Each
 *  slot is the pairing's one-to-one, so no teacher request fills two actions.
 *  scoring 'direction': a resize must also go the direction of the label it fills; `unavailable` counts resizes that fit by value and whose
 *  produced scale the records do not hold (the first run's): they are scored as today. */
export function viewOutcomes(r, view, scoring) {
  const o = r.produced.map(x => x.o), group = r.produced.map(x => x.triggerGroup);
  let unavailable = 0;
  if (view !== 'either' || !r.goldAlt) {
    if (scoring === 'direction') r.produced.forEach((x, i) => { if (x.o === 'right' && x.pa === 'command:resize') { if (x.dir === undefined) unavailable++; else if (!sameDirection(x.dir, wantDir(r.goldSpans[x.g]))) o[i] = 'wrong'; } });
    return { o, group, unavailable };
  }
  const slots = slotsOf(r, 'either'), nGold = r.goldSpans.length, slotOf = r.produced.map(x => (x.g >= 0 ? x.g : -1)), gptOnly = slots.slice(nGold).map(s => s.labels[0]);
  const free = slotOf.map((s, i) => i).filter(i => slotOf[i] < 0);
  if (gptOnly.length && free.length) {
    const pair = pairValue({ text: r.text, gold: gptOnly, units: free.map(i => ({ c0: r.produced[i].span[0], c1: r.produced[i].span[1] })), prods: free.map((i, u) => ({ u, act: r.produced[i].pa, rawC: r.produced[i].got })) });
    for (const [u, j] of pair) slotOf[free[u]] = nGold + j;
  }
  r.produced.forEach((x, i) => {
    const s = slotOf[i];
    if (s >= 0 && slots[s].labels.some(l => fits(x, l, scoring))) { o[i] = 'right'; group[i] = slots[s].group; if (scoring === 'direction' && x.pa === 'command:resize' && x.dir === undefined) unavailable++; }
    else o[i] = x.g >= 0 ? 'wrong' : 'extra';
  });
  return { o, group, unavailable };
}
/** the items of a list of records for the shared fit and stats: {...produced, id, wireId, mi, pi, o, triggerGroup}. view: primary | either;
 *  scoring: 'today' (bench-canon.js: the scale is not compared) or 'direction'. -> {items, unavailable} */
export function itemsOf(records, view, scoring) {
  const items = []; let unavailable = 0;
  records.forEach((r, mi) => {
    const v = viewOutcomes(r, view, scoring); unavailable += v.unavailable;
    r.produced.forEach((x, pi) => items.push({ ...x, id: r.id, mi, pi, o: v.o[pi], triggerGroup: v.group[pi] }));
  });
  return { items, unavailable };
}
/** the requested actions of a list of records under a view */
export const goldCount = (records, view = 'primary') => records.reduce((s, r) => s + (view === 'either' && r.goldAlt ? slotsOf(r, 'either').length : r.gold), 0);
export const goldGroups = (r, view = 'primary') => slotsOf(r, view).map(s => s.group);
export const hasSecondTeacher = records => records.length > 0 && records.every(r => r.goldAlt);
export { digest };

// ---------------------------------------------------------------- the engine
/** a system with the drawing of a setup program (a short SOP Lang program), or an empty one, with empty undo and redo stacks -> {s, errors} */
export function startSystem(setup) {
  const s = K.createSystem(), errors = [];
  if (setup) { try { const r = s.engine.run(K.parse(setup), {}); for (const e of r.errors || []) errors.push(String((e.error && e.error.message) || e)); } catch (e) { errors.push(String(e.message || e)); } }
  s.world.undoStack = []; s.world.redoStack = [];   // the setup is the drawing before the message, not something a gold "undo" can take back (validate_rows.mjs does the same)
  return { s, errors };
}
/** a gold (goldSpans entries or wires) played on a system, as parity_lib goldProgram / scene_readers.mjs: the engine's result */
export function playGold(sys, gold) {
  try { return run(sys, K.parse(goldProgram(gold.map(g => ({ span: g.span, type: g.type, args: g.args }))))); } catch (e) { return { errors: [{ error: e }], steps: [] }; }
}
