// a1_words.mjs: A1 of NATURAL_LANGUAGE_NEXT_PLAN.md, the tool: for every request the demo's default reader (VSS-BERT) holds back, the words its question names and the legend
// forms it offers, from the capture of a1_capture.mjs, and the pass rule declared in training/NATURAL_LANGUAGE_RUNLOG.md ("A1: what is declared before anything is computed").
//   node a1_words.mjs CAPTURE.jsonl [OUT.json]
// Definitions (fixed in the run log before this ran):
//   words the question names = the words of the fragments between ‘…’ or “…” in the held request's reasons (not its `src`, not its line)
//   words of the request     = the words of its `src` (letters and digits, case ignored)
//   a question passes        = it names at least one word that is a word of its own request's `src`
// The legend forms it offers: the quoted clearer command(s) of the line and its ‹…› placeholders; listed, not gating.
// Also: a table by reason (the reasons with the quoted fragments replaced by X): how many held requests, how many pass. A failing question goes in the bug list.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const WORD = /[\p{L}\p{N}]+/gu;
export const wordsOf = s => [...String(s ?? '').toLowerCase().matchAll(WORD)].map(m => m[0]);
const QUOTED = /‘([^’]*)’|“([^”]*)”/g;
/** the fragments between typographic quotes of a text */
export const quoted = s => [...String(s ?? '').matchAll(QUOTED)].map(m => m[1] ?? m[2]);
/** a reason with its quoted fragments replaced by X (its kind) */
export const reasonKind = r => String(r).replace(QUOTED, 'X').replace(/^(.+?) (was|were) taken from the conversation/, 'NAMES $2 taken from the conversation').replace(/(two different things): .*$/, '$1: ACT or ACT')
  .replace(/^(the two readers read the [\w ]+?) \(.*\) differently$/, '$1 (V or V) differently').replace(/\b\d+(\.\d+)?\b/g, 'N');

/** one held request of a capture line -> the verdict */
export function judge(h) {
  const reasons = h.reasons || [], fragments = reasons.flatMap(quoted), named = [...new Set(fragments.flatMap(wordsOf))], src = new Set(wordsOf(h.src));
  const inSrc = named.filter(w => src.has(w));
  return { src: h.src, reasons, named_fragments: fragments, named_words: named, named_words_in_request: inSrc, pass: inSrc.length > 0,
    failure: inSrc.length ? null : !named.length ? 'names no word' : 'names only words that are not in the request',
    forms: { clearer: quoted(h.how), placeholders: [...String(h.how ?? '').matchAll(/‹([^›]*)›/g)].map(m => m[1]), runs: h.runs ?? null } };
}
const share = (a, b) => (b ? Math.round(a / b * 1e4) / 1e4 : null);

/** capture lines -> the report */
export function analyse(lines) {
  const ok = lines.filter(l => l.ok), report = { sets: {}, capture: { lines: lines.length, ok: ok.length, failed: lines.filter(l => !l.ok).map(l => ({ id: l.id, error: l.error })) } };
  const bugs = new Map();
  for (const set of [...new Set(ok.map(l => l.set))]) {
    const ms = ok.filter(l => l.set === set), held = ms.flatMap(m => (m.held || []).map(h => ({ id: m.id, ...judge(h) })));
    const byKind = {};
    for (const h of held) for (const r of h.reasons.length ? h.reasons : ['(no reason shown)']) { const k = reasonKind(r), e = (byKind[k] ||= { held_requests_showing_it: 0, passing: 0, example: { id: h.id, src: h.src, reason: r } }); e.held_requests_showing_it++; if (h.pass) e.passing++; }
    const fails = held.filter(h => !h.pass);
    for (const f of fails) for (const r of f.reasons.length ? f.reasons : ['(no reason shown)']) { const k = f.failure + ' | ' + reasonKind(r); (bugs.get(k) || bugs.set(k, []).get(k)).push({ set, id: f.id, src: f.src, reasons: f.reasons }); }
    report.sets[set] = { messages: ms.length, messages_with_a_held_request: ms.filter(m => (m.held || []).length).length, held_requests: held.length, passing: held.length - fails.length,
      pass_share: share(held.length - fails.length, held.length), names_any_word: held.filter(h => h.named_words.length).length, names_any_word_share: share(held.filter(h => h.named_words.length).length, held.length),
      failing_by_kind: Object.fromEntries(['names no word', 'names only words that are not in the request'].map(k => [k, fails.filter(f => f.failure === k).length])),
      all_pass: fails.length === 0 && held.length > 0, reasons: byKind, held };
  }
  const tot = Object.values(report.sets), H = tot.reduce((n, s) => n + s.held_requests, 0), P = tot.reduce((n, s) => n + s.passing, 0);
  report.total = { held_requests: H, passing: P, pass_share: share(P, H), rule_met: H > 0 && P === H && !report.capture.failed.length };
  report.bugs = [...bugs].map(([cause, items]) => ({ cause, count: items.length, examples: items.slice(0, 5) })).sort((a, b) => b.count - a.count);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cap, outPath] = process.argv.slice(2);
  if (!cap) throw new Error('usage: a1_words.mjs CAPTURE.jsonl [OUT.json]');
  const lines = readFileSync(cap, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)), rep = analyse(lines);
  if (outPath) writeFileSync(outPath, JSON.stringify(rep, null, 1) + '\n');
  console.log(`capture: ${rep.capture.ok} of ${rep.capture.lines} messages ok; failed: ${rep.capture.failed.length}`);
  for (const [s, v] of Object.entries(rep.sets)) console.log(`${s}: ${v.messages} messages, ${v.messages_with_a_held_request} with a held request, ${v.held_requests} held requests: ${v.passing} pass (${(v.pass_share * 100).toFixed(1)}%); name any word ${v.names_any_word} (${(v.names_any_word_share * 100).toFixed(1)}%); fail: ${JSON.stringify(v.failing_by_kind)}`);
  console.log(`total: ${rep.total.passing} of ${rep.total.held_requests} pass (${(rep.total.pass_share * 100).toFixed(1)}%); rule met (every question passes, capture complete): ${rep.total.rule_met}`);
  console.log('bug causes (failing questions by what they show):'); for (const b of rep.bugs) console.log(`  ${b.count}\t${b.cause}`);
}
