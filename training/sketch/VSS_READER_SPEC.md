# VSS reader of the world `real`: specification

Status: implemented 2026-10-30 (front.py / docs/js/front.js, msg_to_world.py, select_front.py, run_curve.sh). AGENTS.md has the rules.

## 1. Inputs written by people (or LLM agents)

| input | file |
|---|---|
| the legend: actions, question types, their keys and values | `docs/js/logic.js` (legend); the world's events, roles and value tokens follow from it |
| annotated training messages: text, gold wires, each wire with `span` and `trigger` | `llm_train/<model>_msg/msg_*.jsonl` (spec: `llm_train/TRAIN_MSG_SPEC.md`) |
| the model's architecture (vss-demo `sop train`, copied in `training/vss`) | `training/vss` |

Nothing else maps language to the legend. No word lists, no synonym tables, no sentence templates.

## 2. Mechanical steps (not learned; listed here so that they stay visible)

- Tokenization: words, digits, punctuation; quoted strings -> one TEXT token; "30px" -> 30 px.
- Names: a word is a NAME token when it is a shape on the canvas, or capitalised and not the first word of a sentence ("I" excepted;
  "A" only when a shape is called A); "Done's" -> Done when Done is a name.
- The world's schema: a legend value -> its token (`front.value_token`: rightOf -> right_of, both -> two_way ...), the kind of a value
  token = its legend question.
- Building the training frames (llm_to_world.convert): the head word of a description without a shape value is looked up among
  `shapes, shape, everything, it, them, this, that` (residual hand list, debt).
- Reasoning, after reading: "it" = the last shape referred to; a shape created earlier in the message = `$new`. Same for both readers.
- Number words. This applies to arm L1 of `training/neural/MODERNBERT_PARITY_PLAN.md`, and only to a learned reader whose config has `reader.number_words_from: "table"`. `make_roles.py NUM_WORDS=table` builds its training data the same way.
  - What it reads: a tagged number written in words, for any key whose values are numbers (count, distance, scale, angle and the like), is read by a fixed table:
    - "two" to "nineteen";
    - the tens "twenty" to "ninety", with an optional following "one" to "nine" ("forty five", "forty-five");
    - "hundred", and a unit below ten before "hundred" ("two hundred").
  - "one" alone is not in the table: in the training spans it is the pronoun.
  - Where it lives: `docs/js/neural.js` (`NUM_UNITS_T`, `NUM_TENS_T`, `NUM_DIGIT_T`, `tableNumber`). `make_roles.py` holds the same table, and `training/neural/parity/test_label_arms.py` checks that the two match.
  - What is lost without it (L1 against M1, `training/neural/MODERNBERT_RUNLOG.md`):
    - `scenes_r3b`'s spelled gaps round-trip at 94.7% without the table and 100% with it;
    - the number map learned by co-occurrence keeps noise words ("lights" -> 2) unless L2's labels also apply;
    - on fresh2 and short3 no loss is shown with the table: +1.4 [-5.0, +8.7] and -3.5 [-14.0, +8.7].
- The drawing as lines (`docs/js/drawing-lines.js`; arm M4 of `training/neural/MODERNBERT_PARITY_PLAN.md`, only for a learned reader whose
  config has `reader.drawing`): the engine state written as `names: size colour kind "label" | "first 10 words of the message that made
  them"`, then arrows and groups, newest first, whole lines within the reader's cap of 512 word pieces. It writes the legend's own value words
  and the text people wrote; it maps no word to the legend. The same file serves the data builder, the measurements, the reader and the page.
  What is lost without it is measured only once an M4 model is trained (that model with and without the second read).

## 3. Learned from the annotated training messages (front.py)

1. (NOT part of the pipeline since 2026-10-31, owner's decision; kept only as a labelled reference, FRONT_TAGGER=1) Segmenter: a greedy averaged-perceptron BIO tagger over the message's tokens (B = first token of a request, I = inside, O = chatter),
   trained on the spans. VSS reads one request at a time (its state is one D-dimensional vector: long inputs blur).
2. Values: word n-grams (1-3) -> legend value tokens, from the co-occurrence of a span's n-grams with its wire's gold values; kept by
   count and precision, shortest n-gram first; applied longest first.
3. Triggers: the annotated trigger phrase (values normalized, cut at the first name) with the neighbouring tokens -> the event's token;
   precision counts the phrase in chatter and in spans of other events; context backs off; value tokens in a phrase stay as fillers.
4. Kinds: value tokens -> their question's kind; event tokens -> VERB; tokens seen >= 8 times -> a kind of their own; others `unknown`.
5. The route book (the VSS model itself): `sop train`, lists of shapes as the set roles `members` / `targets`.

Thresholds (front_params.json) are chosen on held-out training messages (80% fit / 20% dev by a hash of the id; select_front.py,
llm_train/FRONT_SELECTION.md). The frequency cut-off for own kinds (8) is not selected yet (debt).

## 4. Reading

The message is cut by the VSS reader itself (vss-centers.js: one state per action word; the centre attention of research/attention/PROPOSAL.md is the planned replacement); each request is normalized and read; a request with no event token or with status
`unknown-event` / `no-sense` is not executed and reported as not understood; the other requests of the message are executed.

## 5. Adding words and constructions later

- A synonym of a known value or action: a learned table entry (one more annotated example). No retraining of the route book.
- A new construction: further training from the current model on the new examples mixed with old ones; all test sets re-run.

## 6. Evaluation

- Decisions (thresholds, how much data): on the 20% dev split of the training messages. Learning curve: shares 0.2 / 0.4 / 0.8 of
  the messages (nested subsets of the fit split), each with its own front end, scored on the dev split.
- Final: trained on all training messages, scored once on the test sets `llm_bench/sonnet` + `llm_bench/haiku` (1000 messages), never
  used for anything else. Per reader: correct / not done / done wrong, plus extra wires not asked for.
