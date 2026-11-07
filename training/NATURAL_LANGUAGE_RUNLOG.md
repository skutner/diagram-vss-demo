# Natural language after the small readers: run log

Append-only. Plan: `training/NATURAL_LANGUAGE_NEXT_PLAN.md` (commit ca8c17e). Each step: what was declared before the run, then the result, with the time. Written by the
implementing agent (Claude Sonnet 5.5 high, `code-implementer-high`); the coordinator reviews and commits.

## 2026-11-07 17:27 Scope: only A1

**Owner's words, as relayed by the coordinator (final):** "go with your suggestion". Only A1 stays (plan section 4.A, section 7 "A1's tool"). Dropped: B1, A2, C1, C2, C3, Step 0
(0a, 0b, 0c), the answer-key tools, the scorer changes, `agree_gate`, `check_sample`, `wrong_values_span`, and every change to `adjudicate.py`, `sets.mjs`, `arm_lib.mjs`,
`score_arm.mjs`. No model was downloaded and no `codex exec` was run. An earlier relayed scope ("implement the entire plan") was superseded before any run that depended on it;
the tools built for it were reverted and deleted (`git diff` shows no edit to an existing file of the plan's tools).

## 2026-11-07 17:28 A1: what is declared before anything is computed

**The reader.** The demo's default reader: the chat shows the VSS-BERT tab (`CHAT_DEFAULT = ['combined']`, `docs/js/ui.js:1090`), the combined reader of VSS and SOP-BERT.
**No records of it exist** for `nl_a` or `collected_1` (VSS-BERT is not a reader of `collect_set.mjs`; `training/sketch/combine/collect_pair.mjs` was never run on these sets), and the
records that do exist (SOP-BERT, ModernBERT C100, Rules) hold neither the held-request text nor what the demo shows. So A1 does not read records: it captures, from the demo itself
(`docs/index.html` and `docs/js` as in the working tree at commit 60b5f7c (docs/ has no uncommitted change), headless Chromium, CPU, transformers.js 3.8.1 from `training/laptop/node_modules` in place of the CDN,
exactly as `training/sketch/clarify_probe_ui.py` and `test_combined_ui.py` load it), the reply of the VSS-BERT tab to each message. This is the plan's wording ("captured from the
demo's own code path"); it departs from "with the existing records" only in that those records are of other readers.

**The messages.** `nl_a` development (the part of `sets.mjs`: 300 messages, 392 requested actions) and `collected_1` (52 messages). Each message is read on a fresh page. `nl_a`:
the canvas is cleared with the demo's "Clear the canvas" button, then the row's `setup` is sent as a typed SOP Lang message (a message starting with `@`, `ui.js:1188`), then the
message; the rows of a session are sent in order on one page (the demo then holds its own drawing, not the teachers' replay), the wordings of a paraphrase group each on their own
page. `collected_1`: the demo's start drawing (the names the rows hold are its names), no setup. Context kept by the demo between the setup and the message is the demo's own.

**What is measured.** Every held request: each `li` of `ul.held` in the VSS-BERT reply (`clarify.js heldView`, rendered by `ui.js heldHTML`): its `src` (the words of the message it
was cut from), its reasons (`.why .r`), its line (`.how`), and the two buttons. The question the person reads = the reasons plus the line.

**Definitions (fixed now).**
- *Words the question names*: the fragments between typographic quotes, `‘…’` or `“…”`, in the reasons (not the `src`, not the line: the line quotes the clearer command, which
  is written from the drawing's names, not from the request's words), each split into words (letters and digits, case ignored).
- *A word of the request it could not read*: a word of the held request's `src` (letters and digits, case ignored).
- *A question passes* when at least one word it names is a word of its own held request's `src`. It fails when it names no word, or only words that are not in the `src`.

**Pass rule (plan 4.A1, operationalised by the definitions above):** every held request's question passes, on `nl_a` development and on `collected_1`. Anything less is a bug list
(each failing question with the reason it shows, grouped by cause, with the code location in `docs/js`), and no fix is made in this task. Reported beside the pass: the share of
held requests that pass, per set; the share whose reasons name any word at all; and the legend forms the line offers (the clearer command and its `‹…›` placeholders), listed, not gating.

## 2026-11-07 17:50 A1: result

**Run.** `node training/neural/parity/a1_capture.mjs ~/.cache/diagram-vss-modernbert/a1/capture.jsonl --workers 3` (headless Chromium 1223 from `~/.cache/ms-playwright`, playwright-core 1.64.1 from the
npx cache, docs/ at commit 60b5f7c, no uncommitted change under docs/): 253 conversations, 352 messages, 18.3 min, 0 failed, 0 page errors. Then
`node training/neural/parity/a1_words.mjs .../capture.jsonl .../a1_report.json`. Evidence: `reports/evidence/natural-language-next/a1/` (`capture.jsonl` sha256
`c68099e1283e3bd707634b82d0a070d6ee010a1839f3cfb0f26b566ce1f30b26`, `a1_report.json`, `a1_report.txt`, `capture.log`). Tests: `node training/neural/parity/test_a1_words.mjs` (11 pass).

| set | messages | with a held request | held requests | pass | share | name any word | share |
|---|---:|---:|---:|---:|---:|---:|---:|
| `nl_a` development | 300 | 277 | 668 | 88 | 13.2% | 147 | 22.0% |
| `collected_1` | 52 | 48 | 77 | 7 | 9.1% | 14 | 18.2% |
| total | 352 | 325 | 745 | 95 | **12.8%** | 161 | 21.6% |

**The pass rule is missed** (every question names at least one word of its request: 95 of 745). 650 questions fail: 584 name no word, 66 name only words that are not in the request. By the plan's
rule this is a bug list, not a result to retry: no change to the demo and no second run was made. (The 668 held requests on `nl_a` are held requests of the demo, extras included, not the 392
requested actions.)

**Causes** (the reason sentences of the failing questions, by `a1_report.json` `bugs`; a question with two sentences counts twice; 1,229 sentences in all; code locations in the implementing agent's report):
the sentence names the two readings' action words, unquoted ("the words could mean two different things: X or Y") 319; "only one of the two readers found a request here" 217; "not sure where this request
starts / ends" 127; "NAMES was taken from the conversation" with no word quoted 124; "nothing / little was read from it besides the action" 125; "not sure what kind of request this is" 111; "the two readers
read V (A or B) differently", values unquoted 71; "requests read as X are often read wrong" 62; "not sure which shape the description means" and the other "not sure whether / which / about …" sentences 42;
"the reading was close to another reading" or "part of the request is unexplained" 21; "it needs X first" 3; "read in the X world, which is often wrong" 4; the generic fallback 3.

**Reported, not gating, and not part of the rule declared above:** 52 of the 124 questions that say a name "was taken from the conversation" have a pronoun in their `src` that could have been quoted;
63 of the 96 questions that show a "the two readers read … differently" sentence name, unquoted, a value that is a word of the request (some of them already pass by another sentence; a looser definition of "names" would count them).

## 2026-11-07 17:55 A1: the bug list, with the code location of each cause (the demo is not changed)

Checks on the capture, run after the result above (they change no number): every one of the 352 lines is the VSS-BERT line (`reader` = `combined`: 0 others); the "second reader has not read this
message" fallback sentence (`ui.js clarifyInput`, `g.fallback`) appears 0 times, so VSS-BERT always had both readers; no message has a `sub` line ("I didn’t understand …"), so the reply does not
say elsewhere what the questions leave out; a determinism check of 10 messages (nl-01-003, nl-01-014, nl-03-010, nl-06-046, nl-08-030, nl-10-016, nl-12-010, col-0001, col-0010, colc-0016) rerun
with one worker gave identical held requests and lines (not a retry: the 745 above stand as one run).

**Bug 1. Sentences that name no word of the request.** Of the 1,229 sentences of failing questions, these are fixed templates with no quoted word (the first three lines of each quote are
the code that writes them).

(a) the two readings' actions, written unquoted, and "only one of the two readers" (319 + 217 sentences):
`docs/js/clarify.js:257-259`
```js
  for (const d of h.dependsOn || []) out.push(`it needs ${quoteText(d)} first, and that was not done`);
  if (h.otherAct) out.push(`the words could mean two different things: ${actWord(h.reading)} or ${h.otherAct}`);
  else if (!h.other && h.type !== "fact" && h.type !== "rule") out.push("only one of the two readers found a request here");
```
(b) the readers' differing values, unquoted (71 failing sentences; 63 of the 96 questions that show one name a value that is a word of the request):
`docs/js/clarify.js:260-264`
```js
  const differ = (h.differ || []).filter((d) => d.key !== "action" && d.key !== "ask");
  if (differ.length) {
    const one = differ.slice(0, 2).map((d) => `${keyWord(d.key)} (${v(d.key, d.sop)} or ${v(d.key, d.vss)})`);
    out.push(`the two readers read ${listing(one)} differently`);
  }
```
(c) the generic fallback (3):
`docs/js/clarify.js:270-272`
```js
  if (!out.length) out.push("the reading is right most of the time, but not often enough to act without asking");
  return [...new Set(out)].slice(0, MAX_REASONS);
}
```
(d) SOP-BERT's own sentences: where it starts or ends (127), little or nothing read besides the action (125); the prior (62) is `neural-confidence.js:214`:
`docs/js/neural-confidence.js:237-243`
```js
    case "cut": {
      if (d.noCut) return "where this request starts and ends could not be checked (no cut head output)";
      const b = big("cut_start", "cut_end", "cut_inner_min", "n_units");
      if (b === "n_units") return `not sure where the requests of this long message begin and end (${sig.f.n_units} requests)`;
      return b === "cut_start" ? "not sure where this request starts" : b === "cut_end" ? "not sure where this request ends" : "not sure this is one request and not two";
    }
    case "words": return d.unkW.length ? `the word${d.unkW.length > 1 ? "s" : ""} ${quote(d.unkW)} ${d.unkW.length > 1 ? "are" : "is"} unknown to the model` : d.splitW.length ? `the model knows ${quote(d.splitW)} only in pieces` : "some words are unusual for the model";
```
`docs/js/neural-confidence.js:244-246`
```js
    case "size": {
      const b = big("n_roles", "n_words");
      if (b === "n_roles") return few("n_roles") ? (sig.f.n_roles ? `little was read from it besides the action (${sig.f.n_roles} part${sig.f.n_roles === 1 ? "" : "s"})` : "nothing was read from it besides the action") : `many parts were read from it (${sig.f.n_roles})`;
```
`docs/js/neural-confidence.js:213-214`
```js
    case "act": return d.act === "none" ? "not sure whether this is a request" : `not sure which action this is (${actWord(d.act)}, or ${actWord(d.second)})`;
    case "prior": { const r = spec.act_prior[d.act] ?? spec.act_prior_default; return `requests read as ${actWord(d.act)} are often read wrong (right about ${Math.round(r * 100)}% of the time on the calibration messages)`; }
```

**Bug 2. The context fill quotes the pronoun only when the other reader had it (124 sentences; 123 name no word, 1 quotes words not in the request).** With no `word`, the sentence is written without it,
though 52 of these 124 requests have a pronoun in their `src` and `neural-confidence.js` already has a `pronoun(src)` for exactly this sentence:
`docs/js/ui.js:1405-1409`
```js
  for (const f of fills) {
    const v = input.reading && input.reading[f.key]; if (!v || /^mention\(|\$/.test(String(v))) continue;
    const filled = listing(strNames(v).map(nm)), word = f.word ? String(f.word).replace(/^@/, '') : null;
    input.signals.push(word ? { group: 'context', key: f.key, word, filled } : { group: 'context', key: f.key, text: `${filled} was taken from the conversation; the name was not written` });
  }
```
`docs/js/neural-confidence.js:206-208`
```js
// the pronoun quoted in "not sure which shape 'it' means": the sentence only, never a decision
const PRON = /\b(it|its|them|they|this|that|these|those|her|him|his)\b/i;
const pronoun = (src) => { const m = String(src).match(PRON); return m ? q(m[1]) : null; };
```

**Bug 3. Every world sentence of VSS becomes "not sure what kind of request this is" (111 sentences), and a sentence with a digit outside quotes is dropped.**
`docs/js/ui.js:1365-1370`
```js
function plainReason(x) {
  let t = String(x.text || '');
  const cut = t.match(/^the cut of this request was uncertain \((where it (?:starts|ends))\)/); if (cut) return `not sure ${cut[1]}`;
  if (x.group === 'world' && /world/.test(t)) return 'not sure what kind of request this is';
  t = t.replace(/\s*\([^()]*\d[^()]*\)/g, '').replace(/\ba (?=[aeiou])/g, 'an ');
  return /\d/.test(t.replace(/‘[^’]*’|“[^”]*”/g, '')) ? null : t;
```

**Bug 4 (inference: a naming sentence may be cut before it is shown).** The reasons of a held request are the combined reader's sentences, then only the first sentence of the executing reader
(`[0]`), and at most `MAX_REASONS` (3) are kept; sentences that name words (`vss-confidence.js` "the word X was not understood" / "fit no part of the reading"; `neural-confidence.js` "the word X is unknown to
the model") can be the second sentence of their reader and never reach the chat. Not measured: the capture holds only what is shown.
`docs/js/ui.js:424-426`
```js
    // what the executing reader itself was unsure of (its own confidence below its own safety threshold); `own` keeps the sentence without
    // the reader's name for the chat (clarifyInput)
    if (u.from === 'sop' && nspec && u.item.req.sig) { const c = NC.confidence(nspec, u.item.req.sig.f, u.item.req.sig.act); if (c < NC.threshold(nspec, 'cost')) { const w = NC.reasons(nspec, u.item.req.sig)[0]; if (w) u.reasons.push({ group: w.group, own: w.text, text: `SOP-BERT alone is not sure: ${w.text}` }); } }
```
`docs/js/clarify.js:270-272`
```js
  if (!out.length) out.push("the reading is right most of the time, but not often enough to act without asking");
  return [...new Set(out)].slice(0, MAX_REASONS);
}
```

**Bug 5. A quoted "it needs “X” first" quotes another request's words (3 sentences).**
`docs/js/clarify.js:255-257`
```js
  const short = (t) => { const xs = String(t).split(/, | and /); return xs.length > 3 ? listing(xs.slice(0, 3).concat("others")) : t; };
  const v = (k, x) => (x == null || x === "∅" ? "nothing" : ["target", "from", "to", "anchor", "name"].includes(k) ? short(who(x, names, created)) : String(x));
  for (const d of h.dependsOn || []) out.push(`it needs ${quoteText(d)} first, and that was not done`);
```

**Bug 6. The spell checker rewrites the message before every reader reads it, so a held request can show words the person did not write: 116 of the 745 held requests (74 messages)
have a `src` that is not a substring of the typed message** (e.g. nl-01-003 "wireless" shown as "wire", nl-01-014 "instances" shown as "distance"). The questions' words are compared with that
shown `src`, as declared, so the share above stands; but "the words of the request" are partly the demo's rewrite.
`docs/js/ui.js:1190-1193`
```js
  const savedSource = meta && meta.saved ? Object.assign({}, meta.saved) : null;
  let sp = null;
  if (!raw && spellEnabled) { const sc = await spellP; if (sc) { sp = sc.check(text, { names: canvasNames(cur) }); text = sp.text; } }
  meBubble(typed, sp, meta);
```

**Reported with these, not gating:** the 13.2% / 9.1% pass shares are of a rule that counts only quoted words; 63 of the 96 value-difference questions would pass if their unquoted values counted.
