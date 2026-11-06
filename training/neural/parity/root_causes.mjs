// root_causes.mjs: the root-cause analysis that follows the evaluation of an arm (MODERNBERT_PARITY_PLAN.md section 5, AGENTS.md "Root-cause analysis
// after every evaluation"): each requested action that is not right and each extra, with every request executed and the Opus view, gets the FIRST
// cause that explains it (a fixed order) and the place the cause sits. Reported separately for requests whose trigger was seen in training and not.
//   node root_causes.mjs SCORE.json TRAIN_DATA_DIR OUT.md [OUT.json] [--scoring=direction|today] [--oracle=DIR] [--confidence=FILE]
// SCORE.json: a score_arm.mjs output; its `record_files` are read as score_arm reads them (loadRecords, manifest checked), and its parts
// (use: evaluation) are the parts analysed: the score's own definition, never a new split. TRAIN_DATA_DIR: the arm's training data
// (trigger_inventory.json: the seen / unseen definition, compared with the split the records were made with; reader.json, when it is there: the
// keys the layout reads, so a gold key the layout does not read is a layout cause).
// The outcomes (right / wrong / extra, the either-teacher view, the direction of a resize) come from arm_lib.mjs viewOutcomes, the counts are
// asserted equal to the score file's all_executed and at_threshold numbers: a classification that does not add up to the score is an error.
//
// The causes, in this order (first that explains the request; the taxonomy of the task with two additions marked *):
//   1 oracle   gold the layout cannot hold: perfect head outputs through the decode (roles_roundtrip.py) miss it, or the layout does not read a key  -> our code / layout
//   2 teachers ambiguity: the reader's request equals gpt's (the either view counts it right) where the teachers disagree; a reader wrong against both falls through; the disagreement is counted apart -> data / ambiguity
//   2*input    the span was not read: the reader failed, the input was cut short, the span is in unread text                                         -> front end
//   3 cut      the cut lost or merged the request's span (no unit with half its span; the unit holds other requests); an extra that splits one       -> model (cut head)
//   3*spurious an extra on text that holds no requested action                                                                                       -> model (cut head or act head: the records cannot tell)
//   4 act      the span was cut but read as another act (a not-done request and an extra on the same span)                                           -> model (act head)
//   5 ref      a key holds a name the request does not write (a description, a pronoun, a name written elsewhere or not at all)                     -> front end (no drawing in the input)
//   6 class    a wrong or missing value of a class key (colour, shape, position, ..., the direction of a resize), or a description / fill class      -> model (class head)
//   7 name     wrong words tagged for a name or text key (target, anchor, from, to, label, name, ...)                                              -> model (token head)
//   8 other    anything else, listed with examples
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { loadRecords, viewOutcomes, itemsOf, teacherRecord, asReader, sameDirection, seenFunction } from './arm_lib.mjs';
import { scoredItems } from './score_arm.mjs';
import { decisions } from '../calibrate_modernbert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const CAUSES = [
  { id: 'oracle', label: '1 gold outside the layout (the oracle misses it)', place: 'our code / layout' },
  { id: 'teachers', label: '2 ambiguity: the reader equals the other teacher (gpt)', place: 'data / ambiguity' },
  { id: 'input', label: '2* span not read (reader failed, input cut short, unread text)', place: 'front end' },
  { id: 'cut', label: '3 the cut lost or merged the span (or split it)', place: 'model (cut head)' },
  { id: 'spurious', label: '3* extra on text with no requested action', place: 'model (cut head or act head; the records cannot tell)' },
  { id: 'act', label: '4 wrong act', place: 'model (act head)' },
  { id: 'ref', label: '5 a reference the request does not write (needs the drawing)', place: 'front end (the drawing is not in the input)' },
  { id: 'class', label: '6 wrong or missing class value', place: 'model (class head)' },
  { id: 'name', label: '7 wrong words tagged for a name / text key', place: 'model (token head)' },
  { id: 'other', label: '8 other', place: 'unexplained (listed with examples)' },
];
const CAUSE_IDS = CAUSES.map(c => c.id);

// ---------------------------------------------------------------- the word check of nl_needs.py (ported: it is Python, and no scorer file holds it)
// nl_needs.py: "A wire needs the drawing when a name-valued key holds a name the message does not write, or a mention holds a colour, shape, size or
// label the message does not write." Same rule here, per key (the key that needs the drawing is what a cause is attributed to).
export const NAME_KEYS = ['target', 'from', 'to', 'anchor', 'anchor2', 'members', 'linked'];
const wordSet = s => new Set(String(s).toLowerCase().match(/[\p{L}\p{N}\p{M}]+/gu) || []);
const subset = (a, b) => [...a].every(x => b.has(x));
export function partsOf(v) {
  const out = []; let d = 0, cur = '';
  for (const ch of String(v)) {
    if (ch === '(') d++;
    if (ch === ')') d--;
    if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim());
  return out.filter(p => p);
}
/** the name-valued keys of a wire's args that need the drawing: {msg: keys with a name or mention word the MESSAGE does not write (nl_needs.py's rule),
 *  span: keys with a name the request's own SPAN does not write (a pronoun, or a name written in another request)} */
export function needsKeys(args, text, span) {
  const W = wordSet(text), S = wordSet(span ?? text), msg = [], sp = [];
  for (const [k, v] of Object.entries(args || {})) {
    if (!NAME_KEYS.includes(k)) continue;
    let m = false, s = false;
    for (const p of partsOf(v)) {
      if (p === '$new') continue;
      if (p.startsWith('mention(')) {
        for (const kv of partsOf(p.slice('mention('.length, -1))) {
          const i = kv.indexOf('='), mk = (i < 0 ? kv : kv.slice(0, i)).trim(), mv = i < 0 ? '' : kv.slice(i + 1);
          if (mk === 'quantifier' || mk === 'recency') continue;
          if (!subset(wordSet(mv), W)) m = true;
          if (!subset(wordSet(mv), S)) s = true;
        }
      } else { if (!subset(wordSet(p), W)) m = true; if (!subset(wordSet(p), S)) s = true; }
    }
    if (m) msg.push(k);
    if (s || m) sp.push(k);
  }
  return { msg, span: sp };
}

// ---------------------------------------------------------------- the layout: which keys a class head and which the token head reads
// reader.json of an arm's training data (R.classes: [[key, values]], R.span_keys); the default is the layout of M2n at the time of writing
// (reader.json of the round-trip rows), used when TRAIN_DATA_DIR has none (SOP-BERT: its own layout is not described by such a file).
export const DEFAULT_LAYOUT = {
  known: false,
  classKeys: ['arrow', 'aspect', 'axis', 'color', 'comparison', 'direction', 'fill', 'kind', 'layer', 'layout', 'notColor', 'outline', 'pairing', 'position', 'position2', 'property', 'quantifier', 'region', 'scheme', 'shape', 'size', 'style', 'superlative', 'template', 'topic'],
  tokenKeys: ['about', 'anchor', 'anchor2', 'at', 'count', 'distance', 'from', 'height', 'items', 'items2', 'label', 'linked', 'name', 'parents', 'scale', 'target', 'title', 'to', 'width'],
};
export function layoutOf(dir) {
  const f = resolve(dir, 'reader.json');
  if (!existsSync(f)) return DEFAULT_LAYOUT;
  const R = JSON.parse(readFileSync(f, 'utf8'));
  return { known: true, classKeys: R.classes.map(([k]) => k).filter(k => !k.includes(':')), tokenKeys: R.span_keys, file: f };
}

// ---------------------------------------------------------------- the oracle (roles_roundtrip.py: perfect head outputs through the decode)
const sortedJSON = o => JSON.stringify(o, Object.keys(o || {}).sort());
/** DIR (a round-trip work folder): decoded.jsonl (per message, per gold request: right / wrong / missing and the keys that differ) and
 *  rows/also_*.jsonl (the training row of each wire: its fill class, "context" = the reference the shared context rule fills) */
export function loadOracle(dir) {
  const decoded = new Map(), rows = new Map();
  for (const l of readFileSync(resolve(dir, 'decoded.jsonl'), 'utf8').split('\n')) if (l.trim()) { const o = JSON.parse(l); decoded.set(o.id, o.gold); }
  for (const f of readdirSync(resolve(dir, 'rows')).filter(x => x.startsWith('also_'))) for (const l of readFileSync(resolve(dir, 'rows', f), 'utf8').split('\n')) if (l.trim()) { const r = JSON.parse(l); if (!rows.has(r.id)) rows.set(r.id, []); rows.get(r.id).push(r); }
  return { dir, decoded, rows };
}
/** the oracle's verdict on gold request gi of a record: {status: 'right' | 'layout' | 'reference' | 'absent' | 'unaligned' | 'unmatched', keys} */
export function oracleVerdict(oracle, r, gi) {
  if (!oracle) return { status: 'absent', keys: [] };
  const og = oracle.decoded.get(r.id);
  if (!og) return { status: 'absent', keys: [] };
  if (og.length !== r.goldSpans.length) return { status: 'unaligned', keys: [] };
  const o = og[gi];
  if (o.o === 'right') return { status: 'right', keys: [] };
  if (o.o === 'missing') return { status: 'layout', keys: ['(cut tags lost the span in the round trip)'] };
  const want = sortedJSON(r.goldSpans[gi].args), row = (oracle.rows.get(r.id) || []).find(x => sortedJSON(x.gold) === want);
  const keys = []; let explained = 0;
  for (const [k, got, w] of o.miss) {
    // not a label problem (roles_roundtrip.py NOT_LABEL): the reference the shared context rule fills, and a created shape written by name where the decode writes $new
    const ctx = row && row.classes && row.classes['fill:' + k] === 'context', newName = partsOf(got).includes('$new') && !partsOf(w).includes('$new') && partsOf(got).length === partsOf(w).length;
    if (ctx || newName) explained++; else keys.push(k);
  }
  if (!keys.length) return { status: row ? 'reference' : 'unmatched', keys: o.miss.map(m => m[0]) };
  return { status: row ? 'layout' : 'unmatched', keys };
}

// ---------------------------------------------------------------- spans
const inter = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
const iou = (a, b) => { const i = inter(a, b); return i / ((a[1] - a[0]) + (b[1] - b[0]) - i || 1); };
const compact = o => o == null ? '-' : Object.entries(o).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' ');
const cut = (s, n = 110) => { s = String(s).replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/** the keys of a request that differ from what is wanted, as equalWant of arm_lib.mjs (only the keys of `want`; a key the reader did not write reads as ∅);
 *  under `direction` a resize that has the right value but the wrong direction: ['scale (direction)'] */
export function wrongKeys(x, want, dirWant, scoring) {
  const keys = Object.entries(want || {}).filter(([k, v]) => (x.got?.[k] ?? '∅') !== v).map(([k]) => k);
  if (!keys.length && scoring === 'direction' && x.pa === 'command:resize' && x.dir !== undefined && !sameDirection(x.dir, dirWant)) keys.push('scale (direction)');
  return keys;
}

// ---------------------------------------------------------------- one record
const NO_VARIANT = {};
/** the cause of every not-right requested action and every extra of one record.
 *  ctx: {scoring, layout, oracle, variant}; variant (tests only): {noActOverlap, swapClassName, classBeforeRef, teachersFirst, eitherSlot} injects a defect to prove a test would catch it.
 *  -> {golds: [{gi, status: right|wrong|notdone, ...}], extras: [{pi, ...}], byProduced: Map(pi -> cause)} */
export function classifyRecord(r, ctx) {
  const { scoring, layout, oracle, variant = NO_VARIANT } = ctx;
  const view = viewOutcomes(r, 'primary', scoring), either = r.goldAlt ? viewOutcomes(r, 'either', scoring) : null;
  const dual = !!r.goldAlt, alt = dual ? asReader(r.text, r.goldAlt, r.goldSpans) : null;
  const golds = [], extras = [], byProduced = new Map();
  const unreadFrom = r.cutInfo?.unreadFrom ?? null;
  const spans = r.produced.map(x => x.span);
  const pairedProd = gi => r.produced.findIndex(x => x.g === gi);
  r.goldSpans.forEach((g, gi) => {
    const pi = pairedProd(gi), p = pi < 0 ? null : r.produced[pi];
    const o = p ? view.o[pi] : 'notdone';
    const item = { id: r.id, gi, pi, group: g.triggerGroup, act: g.act, span: g.span, want: g.want, got: p ? p.got : null, readAct: p ? p.pa : null, status: o === 'right' ? 'right' : o === 'notdone' ? 'notdone' : 'wrong' };
    golds.push(item);
    if (o === 'right') return;
    const keys = p ? wrongKeys(p, g.want, g.dirWant, scoring) : [];
    const verdict = oracleVerdict(oracle, r, gi);
    const set = (cause, ks, detail) => { item.cause = cause; item.keys = ks && ks.length ? ks : ['(' + (p ? g.act : g.act) + ')']; item.detail = detail || null; item.oracle = verdict.status; };
    // 1: the oracle (the layout cannot hold it), or a key the layout does not read
    const unreadKeys = layout.known ? Object.keys(g.want).filter(k => k !== 'action' && k !== 'ask' && !layout.classKeys.includes(k) && !layout.tokenKeys.includes(k)) : [];
    if (verdict.status === 'layout') return set('oracle', verdict.keys, 'the round trip with perfect heads misses it');
    if (p && keys.some(k => unreadKeys.includes(k))) return set('oracle', keys.filter(k => unreadKeys.includes(k)), 'a key the layout does not read');
    // 2: ambiguity explains the miss only when the reader's request is the other teacher's (the either view counts it right). A disagreement of the
    // teachers on this request is counted apart (item.disagree) and does not take the request when the reader is wrong against both.
    if (dual) {
      const k = r.altPair.indexOf(gi);
      let differs = k < 0;
      if (k >= 0) { const a = alt[k]; differs = a.o !== 'right' || (scoring === 'direction' && a.pa === 'command:resize' && !sameDirection(a.dir, g.dirWant)); }
      item.disagree = differs;
      // the reader's request equals the gpt label of THIS request (its own slot), checked here: the either view may re-pair a wrong request into another span's slot
      const a2 = k >= 0 ? r.goldAlt[k] : null;
      const own = !!(p && a2 && p.pa === a2.act && Object.entries(a2.want).every(([key, v]) => (p.got?.[key] ?? '∅') === v) && (scoring !== 'direction' || p.pa !== 'command:resize' || p.dir === undefined || sameDirection(p.dir, a2.dirWant)));
      item.readerEqualsGpt = variant.eitherSlot ? !!(p && either.o[pi] === 'right') : differs && own;
      if (item.readerEqualsGpt || (variant.teachersFirst && differs)) return set('teachers', keys, (k < 0 ? 'gpt wrote no request here' : 'gpt\'s label differs from Opus\'s') + '; the reader equals gpt\'s');
    }
    // 2*: not read
    if (r.error || (r.unread && r.unread.length) || (unreadFrom != null && g.s >= unreadFrom) || (p && p.truncated)) return set('input', null, r.error ? 'the reader failed on the message' : 'truncated / unread input');
    // 3 / 4: the cut, then the act
    const gs = [g.s, g.e];
    if (p) {
      const i = iou(p.span, gs);
      if (i < 0.5) {
        const others = r.goldSpans.filter((h, hi) => hi !== gi && inter(p.span, [h.s, h.e]) > 0).length;
        return set('cut', null, others ? 'merged: the unit holds ' + (others + 1) + ' requests' : 'the unit covers ' + Math.round(i * 100) + '% of the span');
      }
    } else {
      const best = spans.map((s, i) => [iou(s, gs), i]).sort((a, b) => b[0] - a[0])[0];
      if (!best || best[0] < 0.5 || variant.noActOverlap) {
        const over = spans.filter(s => inter(s, gs) > 0 && r.goldSpans.some((h, hi) => hi !== gi && inter(s, [h.s, h.e]) > 0)).length;
        return set('cut', null, !best || !inter(spans[best[1]], gs) ? 'lost: no unit on the span' : over ? 'merged into a unit with another request' : 'only a part of the span is a unit');
      }
      const u = r.produced[best[1]];
      if (u.pa === g.act) return set('cut', null, 'merged or split: a unit of the same act on the span was paired to another request');
      return set('act', [g.act + ' read as ' + u.pa], 'read as ' + u.pa);
    }
    // 5: a reference the request does not write
    const need = needsKeys(g.args, r.text, g.span), refKeys = keys.filter(k => need.span.includes(k));
    // 6 / 7: the value, per key, by the head that reads it
    const mention = k => String(p.got?.[k] ?? '').includes('mention(') || String(g.want[k] ?? '').includes('mention(');
    const classOf = k => layout.classKeys.includes(k) || k === 'scale (direction)' || mention(k);
    const tokenOf = k => !mention(k) && layout.tokenKeys.includes(k);
    const classKeys = keys.filter(variant.swapClassName ? tokenOf : classOf), tokenKeys = keys.filter(variant.swapClassName ? classOf : tokenOf);
    const rest = keys.filter(k => !classOf(k) && !tokenOf(k));
    const chain = variant.classBeforeRef ? ['class', 'ref', 'name'] : ['ref', 'class', 'name'];
    for (const c of chain) {
      if (c === 'ref' && refKeys.length) return set('ref', refKeys, need.msg.some(k => refKeys.includes(k)) ? 'a name or description the message does not write' : 'a name written in another request or by a pronoun');
      if (c === 'class' && classKeys.length) return set('class', classKeys, null);
      if (c === 'name' && tokenKeys.length) return set('name', tokenKeys, null);
    }
    return set('other', rest.length ? rest : null, keys.length ? 'keys the layout lists under no head' : 'no differing key: the pairing says wrong, the values are equal');
  });
  // the extras (a produced request with no gold request paired)
  r.produced.forEach((x, pi) => {
    if (view.o[pi] !== 'extra') return;
    const xs = x.span;
    const ov = r.goldSpans.map((h, gi) => [iou(xs, [h.s, h.e]), gi, inter(xs, [h.s, h.e])]).filter(a => a[2] > 0).sort((a, b) => b[0] - a[0]);
    const near = ov[0] && ov[0][0] >= 0.5 ? r.goldSpans[ov[0][1]] : null;
    const e = { id: r.id, pi, act: x.pa, span: x.src, got: x.got, group: near ? near.triggerGroup : 'no request', gold: near ? near.span : null };
    extras.push(e);
    const set = (cause, detail) => { e.cause = cause; e.detail = detail || null; e.keys = [cause === 'act' && near ? near.act + ' read as ' + x.pa : x.pa]; byProduced.set(pi, cause); };
    if (either && either.o[pi] === 'right') return set('teachers', 'the reader\'s request is gpt\'s (right by the either-teacher view)');
    if (r.error || x.truncated) return set('input', 'the reader failed / truncated input');
    if (ov.length && !near) return set('cut', 'partial overlap with a requested action: ' + Math.round(ov[0][0] * 100) + '% of it');
    if (near) return near.act === x.pa || variant.noActOverlap ? set('cut', 'splits a request: a unit of the same act on a span that is paired already') : set('act', 'read as ' + x.pa + ' where ' + near.act + ' is requested');
    return set('spurious', r.kind === 'nothing_to_do' ? 'a message with no request' : 'no requested action on this text');
  });
  golds.forEach(g => { if (g.pi >= 0 && g.status === 'wrong') byProduced.set(g.pi, g.cause); });
  return { golds, extras, byProduced, view, either };
}

// ---------------------------------------------------------------- a part
const GROUPS = ['seen', 'unseen', 'unannotated', 'no request'];
function emptyTable() { return { counts: {}, keys: {}, examples: {}, keyExamples: {}, total: 0 }; }
function add(table, cause, keys, example) {
  table.total++;
  table.counts[cause] = (table.counts[cause] || 0) + 1;
  (table.examples[cause] ||= []).length < 3 && table.examples[cause].push(example);
  for (const k of new Set(keys)) {
    const kk = `${cause}|${k}`; table.keys[kk] = (table.keys[kk] || 0) + 1;
    (table.keyExamples[kk] ||= []).length < 3 && table.keyExamples[kk].push(example);
  }
}
const exampleOf = x => ({ id: x.id, text: cut(x.span), gold: cut(compact(x.want), 120), read: x.status === 'notdone' ? 'not done' : cut(compact(x.got), 120), detail: x.detail });

/** analyse one part: records (already under the view: Opus), scoring, the confidence spec and threshold (or null). The counts are asserted against `expect`
 *  (the score file's all_executed / at_threshold of this view and scoring) when it is given. */
export function analyzePart(records, { scoring, layout, oracle, spec, threshold, expect, expectGate, seenCheck, variant }) {
  const out = { groups: Object.fromEntries(GROUPS.map(g => [g, emptyTable()])), gate: null, oracle: { right: 0, layout: 0, reference: 0, absent: 0, unaligned: 0, unmatched: 0 }, notes: [], seenMismatch: 0, requested: 0, sub: { teachersDisagree: 0, teachersDisagreeWrongAgainstBoth: 0, teachersReaderEqualsGpt: 0, refNeedsDrawing: 0, refElsewhere: 0 } };
  const cls = records.map(r => classifyRecord(r, { scoring, layout, oracle, variant }));
  let right = 0, wrong = 0, notDone = 0, extraN = 0;
  records.forEach((r, mi) => {
    const c = cls[mi];
    for (const g of c.golds) {
      if (g.status === 'right') { right++; continue; }
      if (g.status === 'wrong') wrong++; else notDone++;
      out.oracle[g.oracle]++;
      if (g.readerEqualsGpt) out.sub.teachersReaderEqualsGpt++;
      if (g.disagree) { out.sub.teachersDisagree++; if (!g.readerEqualsGpt) out.sub.teachersDisagreeWrongAgainstBoth++; }
      if (g.cause === 'ref') { if ((g.detail || '').startsWith('a name or description the message')) out.sub.refNeedsDrawing++; else out.sub.refElsewhere++; }
      if (seenCheck) { const was = g.group, now = r.goldSpans[g.gi].trigger == null ? 'unannotated' : seenCheck(r.goldSpans[g.gi].trigger) ? 'seen' : 'unseen'; if (was !== now) out.seenMismatch++; }
      add(out.groups[g.group], g.cause, g.keys, exampleOf(g));
    }
    for (const e of c.extras) { extraN++; add(out.groups[e.group], e.cause, e.keys, { id: e.id, text: cut(e.span), gold: e.gold == null ? '-' : 'requested: ' + cut(e.gold, 60), read: 'extra ' + e.act + ' ' + cut(compact(e.got), 100), detail: e.detail }); }
  });
  out.requested = right + wrong + notDone;
  out.all = { requested: out.requested, right, wrong, not_done: notDone, extras: extraN };
  const caused = Object.values(out.groups).reduce((n, t) => n + t.total, 0);
  if (caused !== wrong + notDone + extraN) throw new Error(`the causes add up to ${caused}, the outcomes to ${wrong + notDone + extraN}`);
  if (expect) for (const k of ['requested', 'right', 'wrong', 'not_done', 'extras']) if (expect[k] !== out.all[k]) throw new Error(`${k}: the analysis counts ${out.all[k]}, the score file ${expect[k]}`);
  // the threshold: right but held (asked), executed wrong
  if (spec && Number.isFinite(threshold)) {
    const { items } = itemsOf(records, 'primary', scoring), dec = decisions(scoredItems(items, spec), threshold);
    const gate = { threshold, right_executed: 0, wrong_executed: 0, extras_executed: 0, asked: 0, held_right: emptyTable(), executed_wrong: emptyTable(), held_wrong_or_extra: 0 };
    for (const x of dec) {
      const r = records[x.mi], c = cls[x.mi], p = r.produced[x.pi];
      if (x.execute) {
        if (x.o === 'right') gate.right_executed++;
        else {
          if (x.o === 'wrong') gate.wrong_executed++; else gate.extras_executed++;
          const cause = c.byProduced.get(x.pi) ?? 'other', gold = x.o === 'wrong' ? c.golds[p.g] : null, ex = x.o === 'extra' ? c.extras.find(e => e.pi === x.pi) : null;
          add(gate.executed_wrong, cause, (gold ? gold.keys : ex ? ex.keys : ['?']), { id: x.id, text: cut(p.src), gold: gold ? cut(compact(gold.want), 120) : '-', read: (x.o === 'extra' ? 'extra ' : '') + p.pa + ' ' + cut(compact(p.got), 100), detail: `confidence ${Number(x.c).toFixed(3)}; ${x.o}` });
        }
      } else if (x.o !== 'extra') {
        gate.asked++;
        if (x.o === 'right') add(gate.held_right, 'held', [p.pa], { id: x.id, text: cut(p.src), gold: cut(compact(p.want), 120), read: p.pa + ' ' + cut(compact(p.got), 100), detail: `confidence ${Number(x.c).toFixed(3)}; the group is ${x.triggerGroup}` });
        else gate.held_wrong_or_extra++;
      } else gate.held_wrong_or_extra++;
    }
    gate.held_right_by_group = {}; gate.executed_wrong_by_group = {};
    for (const g of GROUPS) { gate.held_right_by_group[g] = 0; gate.executed_wrong_by_group[g] = 0; }
    for (const x of dec) {
      const r = records[x.mi], c = cls[x.mi];
      if (!x.execute && x.o === 'right') gate.held_right_by_group[x.triggerGroup === 'unpaired extras' ? 'no request' : x.triggerGroup]++;
      if (x.execute && x.o !== 'right') {
        const g = x.o === 'wrong' ? c.golds[r.produced[x.pi].g].group : (c.extras.find(e => e.pi === x.pi) || {}).group;
        gate.executed_wrong_by_group[g]++;
      }
    }
    if (expectGate) {
      for (const [a, b] of [['right', gate.right_executed], ['wrong', gate.wrong_executed], ['extras', gate.extras_executed], ['asked', gate.asked]]) if (expectGate[a] !== b) throw new Error(`at the threshold ${a}: the analysis counts ${b}, the score file ${expectGate[a]}`);
    }
    out.gate = gate;
  }
  return out;
}

// ---------------------------------------------------------------- the report
const KEYS_SHOWN = 8;   // keys listed per cause in the markdown (the JSON has all)
const pct = (n, d) => d ? (100 * n / d).toFixed(1) + '%' : '-';
const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/`/g, "'");
function causeTable(title, t, place = true) {
  const L = [`**${title}** (${t.total})`, ''];
  if (!t.total) return L.concat(['none', '']);
  L.push('| cause | place | n | examples: id, text, gold, read |', '|---|---|---:|---|');
  for (const c of CAUSES) if (t.counts[c.id]) L.push(`| ${c.label} | ${c.place} | ${t.counts[c.id]} | ${t.examples[c.id].map(e => `${esc(e.id)}: "${esc(e.text)}" gold: ${esc(e.gold)}; read: ${esc(e.read)}${e.detail ? ' (' + esc(e.detail) + ')' : ''}`).join('<br>')} |`);
  const ks = Object.entries(t.keys).sort((a, b) => CAUSE_IDS.indexOf(a[0].split('|')[0]) - CAUSE_IDS.indexOf(b[0].split('|')[0]) || b[1] - a[1]);
  L.push('', '| cause | key | n | examples |', '|---|---|---:|---|');
  const shown = {};
  for (const [kk, n] of ks) { const [c, k] = kk.split('|'); shown[c] = (shown[c] || 0) + 1; if (shown[c] > KEYS_SHOWN) continue; L.push(`| ${c} | ${esc(k)} | ${n} | ${t.keyExamples[kk].map(e => `${esc(e.id)}: "${esc(e.text)}" gold: ${esc(e.gold)}; read: ${esc(e.read)}`).join('<br>')} |`); }
  for (const [c, n] of Object.entries(shown)) if (n > KEYS_SHOWN) L.push(`| ${c} | (${n - KEYS_SHOWN} more keys; all in the JSON) | | |`);
  return L.concat(['']);
}
export function reportMarkdown(meta, parts) {
  const L = [`# Root causes: ${meta.reader} (${meta.artifactShort}), view ${meta.view}, scoring \`${meta.scoring}\`, every request executed`, '',
    `Score: \`${meta.score}\`; training data: \`${meta.trainData}\` (trigger inventory: ${meta.inventory}); layout keys: ${meta.layout}; oracle: ${meta.oracle}.`, '',
    'The first cause that explains a request, in the order of the table; the place it sits is in the second column. Requests are the requested actions of the Opus view that are not right (wrong, or not done) and the extras. Seen / unseen is the trigger of the request in the training inventory; an extra that sits on a requested action (a wrong act, a split) counts with that action (a wrong act is therefore two lines: the request not done and the extra); an extra on text with no requested action has no trigger (`no request`).', ''];
  for (const { key, part, res, n } of parts) {
    const a = res.all;
    L.push(`## ${key} / ${part} (${n} messages, ${a.requested} requested: right ${a.right}, wrong ${a.wrong}, not done ${a.not_done}, extras ${a.extras})`, '');
    L.push(`Oracle verdict on the not-right requests: ${Object.entries(res.oracle).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}${meta.oracleSets ? '' : ''}. Requests where the teachers disagree: ${res.sub.teachersDisagree} = ${res.sub.teachersReaderEqualsGpt} where the reader's request equals gpt's own label of it (cause 2) + ${res.sub.teachersDisagreeWrongAgainstBoth} where it does not (wrong against both, or not read; they fall through to the later causes). Not-done requests have no reader request to equal gpt's. Reference causes: ${res.sub.refNeedsDrawing} name or description the message does not write, ${res.sub.refElsewhere} a name written in another request or by a pronoun.`);
    if (res.seenMismatch) L.push('', `**${res.seenMismatch} requests have a trigger group other than the one the training inventory gives.**`);
    L.push('');
    const tot = emptyTable();
    for (const g of GROUPS) for (const c of CAUSE_IDS) tot.counts[c] = (tot.counts[c] || 0) + (res.groups[g].counts[c] || 0);
    L.push('| cause | place | ' + GROUPS.join(' | ') + ' | all |', '|---|---|' + GROUPS.map(() => '---:').join('|') + '|---:|');
    for (const c of CAUSES) if (tot.counts[c.id]) L.push(`| ${c.label} | ${c.place} | ${GROUPS.map(g => res.groups[g].counts[c.id] || 0).join(' | ')} | ${tot.counts[c.id]} |`);
    L.push(`| total | | ${GROUPS.map(g => res.groups[g].total).join(' | ')} | ${GROUPS.reduce((n, g) => n + res.groups[g].total, 0)} |`, '');
    for (const g of GROUPS) if (res.groups[g].total) L.push(...causeTable(`${key} / ${part}, trigger ${g}`, res.groups[g]));
    if (res.gate) {
      const g = res.gate;
      L.push(`### ${key} / ${part} at the cost-10 threshold (${g.threshold.toFixed(4)})`, '', `Executed: right ${g.right_executed}, wrong ${g.wrong_executed}, extras ${g.extras_executed}; asked (held, matched to a requested action) ${g.asked}; held and wrong or extra: ${g.held_wrong_or_extra} (what the threshold caught).`, '',
        '| row | ' + GROUPS.join(' | ') + ' |', '|---|' + GROUPS.map(() => '---:').join('|') + '|',
        `| right but held (asked) | ${GROUPS.map(x => g.held_right_by_group[x]).join(' | ')} |`, `| executed wrong (wrong or extra; the confidence must catch these) | ${GROUPS.map(x => g.executed_wrong_by_group[x]).join(' | ')} |`, '');
      L.push(...causeTable('Right but held (asked)', g.held_right), ...causeTable('Executed wrong, by first cause', g.executed_wrong));
    } else L.push('At the threshold: not analysed (no confidence file).', '');
  }
  L.push('## Notes', '', ...meta.notes.map(x => '- ' + x), '');
  return L.join('\n');
}

// ---------------------------------------------------------------- main
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
function main(argv) {
  const opts = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
  const [scorePath, trainDir, outMd, outJson] = argv.filter(a => !a.startsWith('--'));
  if (!scorePath || !trainDir || !outMd) throw new Error('usage: root_causes.mjs SCORE.json TRAIN_DATA_DIR OUT.md [OUT.json] [--scoring=direction|today] [--oracle=DIR] [--confidence=FILE]');
  const score = JSON.parse(readFileSync(scorePath, 'utf8')), scoring = opts.scoring || 'direction';
  if (!['today', 'direction'].includes(scoring)) throw new Error('--scoring is today or direction');
  const { records } = loadRecords(score.record_files);
  const invFile = resolve(trainDir, 'trigger_inventory.json');
  const inv = existsSync(invFile) ? JSON.parse(readFileSync(invFile, 'utf8')) : null;
  const seenCheck = inv && Array.isArray(inv.triggers) ? seenFunction({ exact: inv.triggers }) : null;
  const layout = layoutOf(trainDir);
  const oracleDir = opts.oracle || (existsSync(resolve(trainDir + '.work', 'roundtrip', 'decoded.jsonl')) ? resolve(trainDir + '.work', 'roundtrip') : null);
  const oracle = oracleDir ? loadOracle(oracleDir) : null;
  const confFile = opts.confidence || score.confidence_file;
  const spec = confFile && existsSync(confFile) ? JSON.parse(readFileSync(confFile, 'utf8')) : null;
  const threshold = score.threshold_cost10;
  const notes = [];
  if (confFile && !spec) notes.push(`the confidence file ${confFile} does not exist: the threshold rows are not analysed`);
  if (!oracle) notes.push('no oracle (round trip) given or found beside the training data: cause 1 is only assigned for keys the layout does not read' + (layout.known ? '' : ' (there is no reader.json either: not even that)') + '; "not measured" is not "0"');
  else notes.push(`oracle: ${oracleDir}: it holds the ids of fresh2 and short3 only, so for every other set cause 1 is not measured (the oracle verdict row of each part says absent); it is the round trip of the layout whose training data it was made for, a proxy when the arm read has another layout`);
  if (!layout.known) notes.push('no reader.json in the training data: the class / token split of the keys is the default of the M2n layout (DEFAULT_LAYOUT), not this arm\'s own');
  const keys = Object.entries(score.sets).filter(([k]) => !((k === 'fresh2' || k === 'short3') && score.sets['fresh2+short3']));
  const parts = [];
  for (const [key, ps] of keys) for (const [part, sp] of Object.entries(ps)) {
    if (sp.use !== 'evaluation' && !opts['all-parts']) continue;
    const sets = key.split('+');
    let recs = records.filter(r => sets.includes(r.set) && r.part === part);
    if (recs.length !== sp.messages) throw new Error(`${key}/${part}: ${recs.length} records, the score file ${sp.messages} messages`);
    // the view: the Opus view of the score (opus; collected_1: teacher_opus; a set with one teacher: gold)
    let viewName = recs.every(r => r.goldAlt) ? 'opus' : recs.every(r => r.teachers) ? 'teacher_opus' : 'gold';
    if (viewName === 'teacher_opus') recs = recs.map(teacherRecord);
    const v = sp.views[viewName];
    let sc = scoring;
    if (itemsOf(recs, 'primary', scoring).unavailable) { sc = 'today'; notes.push(`${key}/${part}: the records hold no produced scale for some resizes: scored as today`); }
    const exp = v[sc].all_executed, gate = v[sc].at_threshold;
    const res = analyzePart(recs, { scoring: sc, layout, oracle: oracle && ['fresh2', 'short3'].some(s => sets.includes(s)) ? oracle : null, spec, threshold, expect: exp, expectGate: gate, seenCheck });
    res.view = viewName; res.scoring = sc;
    parts.push({ key, part, res, n: recs.length, view: viewName, scoring: sc });
  }
  notes.push('Views: ' + parts.map(p => `${p.key}/${p.part} ${p.view} (${p.scoring})`).join('; ') + '. fresh2 / short3 have one teacher (cause 2 is not measured there). collected_1 is read as its teacher_opus view.');
  const imports = ['arm_lib.mjs', 'score_arm.mjs', 'sets.mjs', 'parity_lib.mjs', '../calibrate_modernbert.mjs', '../../../docs/js/bench-canon.js', '../../sketch/layer_common.mjs'].map(f => [f, sha(resolve(HERE, f))]);
  const meta = { reader: score.reader, artifactShort: String(score.artifact).slice(0, 12), view: 'opus', scoring, score: scorePath, trainData: trainDir, inventory: inv ? `${inv.triggers.length} triggers, ${invFile}` : 'none (the split of the records is used as it is)', layout: layout.known ? layout.file : 'default (M2n)', oracle: oracleDir || 'none', notes };
  writeFileSync(outMd, reportMarkdown(meta, parts));
  if (outJson) writeFileSync(outJson, JSON.stringify({ schema: 'root-causes-v1', ...meta, imported_files_sha256: Object.fromEntries(imports), record_files: score.record_files, parts: parts.map(p => ({ key: p.key, part: p.part, view: p.view, scoring: p.scoring, messages: p.n, ...p.res })) }, null, 1) + '\n');
  for (const p of parts) console.log(`${p.key}/${p.part} [${p.view}, ${p.scoring}] requested ${p.res.all.requested}: right ${p.res.all.right} wrong ${p.res.all.wrong} not done ${p.res.all.not_done} extras ${p.res.all.extras}; causes: ` + CAUSE_IDS.map(c => `${c} ${GROUPS.reduce((n, g) => n + (p.res.groups[g].counts[c] || 0), 0)}`).join(', '));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
