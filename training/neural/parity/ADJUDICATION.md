# Adjudication: what to write

Two annotators labelled each message in `in/adj.jsonl` independently, following `ANNOTATION_SPEC.md`. Their labels differ, or one of them failed when it was replayed in the editor's engine. Your job is to write, for each message, the label that `ANNOTATION_SPEC.md` asks for.

Read `ANNOTATION_SPEC.md` in full first. It is the only authority. Read nothing outside this folder, and run no engine, reader or labelling program.

## Each input row

| field | what |
|---|---|
| `id`, `kind`, `domain` | the message's id, the kind of message the writer meant, the domain |
| `setup` | the program for the drawing the person is looking at when the session or message starts |
| `earlier_messages` | for a session row: the messages sent before this one, in order. The editor did each of them before this one |
| `names` | the shapes on the canvas just before this message, from replaying one annotator's labels. It may be off after an earlier failed step |
| `text` | the message. Never change it |
| `label_A`, `label_B` | the two annotators' wires, in a random order. Neither one is more trusted |
| `engine_A`, `engine_B` | errors from replaying each label in the engine, if any |

## What to write

`out/adj.jsonl`, one line per input row, in the same order: `{"id": ..., "wires": [...], "chose": "A" | "B" | "same" | "own", "why": "..."}`

- `wires`: the final label, in the spec's form. Spans and triggers must be substrings of the text, in the order the message states them.
- `chose`: "A" or "B" when that label is the spec's; "same" when both do the same thing and differ only in form (write either); "own" when neither follows the spec, and you then write your own.
- `why`: one short sentence naming the spec rule that decides it.
- An engine error usually means that label is wrong, but not always: a person may refer to a shape that is not there. Then the spec's rule for that case decides.
- Never write a label to suit a reader, a model or a pipeline. Write only what the spec asks for. If the spec does not settle a case, choose the label that does least of what the person did not ask for, and say so in `why`.

Save the file in one go. You may use a short script only to check that every output line is valid JSON with the input's id, in the input's order. Never use a script to decide a label.
