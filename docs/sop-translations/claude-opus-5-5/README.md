# Saved SOP Lang translations of the built-in examples, by Claude Opus 5.5

Every message of every built-in example of the page (the 13 quick examples, the 11 scenarios and the 24 scenes of the + menu) written once,
offline, as the page's own SOP Lang by **Claude Opus 5.5** (`claude-opus-5-5`), on 2026-11-04. The page's tab **Claude Opus 5.5**, after
Qwen3 and the gpt-6.1-sol tab (the saved translations of another model, added to the page first, at the same place), plays these programs through the same engine as every tab, into its own drawing. It is not a reader and not live inference:
nothing is downloaded or called when the page runs, and a message that is not a built-in example played from the menu is not played.

| | |
|---|---|
| Examples (recomputed from the source at `4eba686`) | 13 quick examples, 11 scenarios (139 messages), 24 scenes (987 messages): **1,139 messages** |
| Saved programs | **1,139 of 1,139**: 1,109 executable, 1 partly (a part SOP Lang cannot express), 28 no-op (no request), 0 unsupported, 1 already SOP Lang |
| Wires | 1,337 (523 creates, 120 mentions, 94 restyles, 88 connections, 63 groups, 50 checks, 42 deletes, 37 counts, 22 undos, …) |
| Notes the model wrote with them | 130 references resolved, 22 approximations, 11 whole-canvas scopes, 1 unsupported part, 32 other notes |
| Changed after the first pass | 9 turns, each with its reason (below); the first pass of every file is kept in `first-pass/` |

## The files

- `quick.sop`, `scenarios/<id>.sop`, `scenes/<id>.sop`: one file per example, one `## turn N` block per message, in order. Each block
  repeats the message (`# input:`, checked against the source), the model's notes (`#!` lines) and the wires. The format, the directives
  and the reading rules are in [CONVENTIONS.md](CONVENTIONS.md).
- `first-pass/`: each file as first written, frozen by `training/sop-translations/freeze_first_pass.mjs` before any validation ran on it.
- `generation.json`: the model, its identity evidence, the date, the source revision and who wrote each file.
- `manifest.json`: built from all of the above by `training/sop-translations/build_manifest.mjs` (never edited by hand). One entry per
  input occurrence, in the menu's order: a stable id (`<example>#<turn>`, e.g. `traffic#2`, `quick#13`), the turn, the exact message, the
  file and lines of its block, its status, the program, the notes, the model, the date, the source revision, the author, and for a turn
  changed after the first pass the first-pass program and the reason. The page loads only this file (`docs/js/saved-sop.js`).

## How they were generated

1. **Identity.** The session that wrote the files reported its model through the session service (`get_session`):
   `session_context.model = claude-opus-5-5`; the repository's `.claude/settings.json` sets the same model. The evidence, with the check
   made at the end of the work, is in `generation.json` and the manifest.
2. **Rules first.** CONVENTIONS.md was written before any program: the format, how each kind of request, reference, question and value is
   written, what is a no-op, what is unsupported. The cases the scenes raised later are listed in its last section, marked as added after
   the first pass; the turns changed to follow them carry a repair line.
3. **One model.** The coordinating agent of the session wrote the quick examples, the 11 scenarios and the scene Farm (the example given
   to the others). The other 23 scenes were written by six forked agents of the same session; a fork runs on the session's own model
   (claude-opus-5-5). Each fork was given CONVENTIONS.md and Farm, owned only its own files, and was forbidden the inputs below.
4. **Only the message and the interpreter.** Each program was written from the example's own text and its earlier messages, with the
   interpreter (`docs/js/logic.js`: the legend and the handlers), the help pages and the engine (to see what a wire does) as references. No
   reader of the page (Rules, VSS, SOP-BERT, ModernBERT, Qwen3) produced or checked a translation, and no annotation or gold file was
   opened (nothing under `training/sketch/llm_*`, the benches or the evaluation sets).
   *Disclosure:* while learning the dialect, before any program was written, the coordinator ran the Rules formalizer of `logic.js` once
   on 13 short strings: 12 example messages ("Clear the canvas", "Undo.", "Duplicate B.", "Swap A and B.", "Add a title "Sunny Meadow" at
   400, 48.", "From now on, rectangles are teal.", "Printer is gray.", "Make all squares a bit bigger.", "Move Router up by 30.",
   "Describe the diagram.", "Delete the pink stars.", "Arrange everything in a grid.") and a shortened form of cartoon#57 ("Group Bulb,
   RoboHead as Robot."). Its output was used only to see the shape of the wires; no program was copied from it, and no reader was run on
   any example text afterwards.
5. **First pass frozen, then validated.** Each file was frozen in `first-pass/` before `run_examples.mjs` or `build_manifest.mjs` ran on
   it. Every later change has a `#! repair: validation: …` (forced by a check) or `#! repair: review: …` (a mistake seen on reading the
   results) line; the build fails when a changed turn has no repair line or an unchanged one has one.
6. **Reviewed.** Every turn's result (what it drew, moved, connected, grouped and answered) was read by the agent that wrote it and by the
   coordinator, and by four independent read-only reviewers run on another model (the Sonnet model of the session's agent tool). They found no program that does the
   wrong thing; their doubtful points were the engine's placement (below) and one convention point (winter#22, repaired).

The 9 repairs: barchart#3 and #4 (a note added: the engine draws a 4 px axis 10 px thick), recycle#37 (only the four dashed arrows become
solid, not Bin's dotted one), winter#9 (`size=medium` for the third house, like the first two: without it the engine's common sense made
"House3" huge from its name), winter#22 (both counts written, as the convention says), and winter#32, pirate#22, factory#33, town#33
("a bit" is 20 px in every example).

## How the tab plays them

- A message gets its program only by **where it came from**: the quick example's button, or the turn of the scenario or scene played or
  stepped through from its card. The page passes `{example, turn, original text, renames}` with the message; nothing is looked up by its
  words (the same words occur in different examples, and a typed message with the words of an example is not played).
- The program runs only when the example's text in the page is the text that was translated; otherwise the reply says the translation is
  **stale** and nothing runs. A missing entry, a typed message, an **edited copy** of a scenario, your own script or a loaded file gets
  "Not played" with the reason. There is no fallback to any other reader.
- A played example's names are renamed when they clash with the drawing (the page allocates them from the gpt-6.1-sol tab's saved names,
  over the reading tabs' drawings, and every reading tab reads the renamed text: `renamedForCanvas`; this tab's drawing does not change that
  text). The same renames are applied to this tab's programs, on their **name-valued keys only** (`name`, `target`, `from`, `to`, `anchor`,
  `anchor2`, `members`, `linked`; matched without regard to case, as the engine finds shapes), plus a rename of any name this tab's
  programs create that only this tab's own drawing already has (it keeps shapes the reading tabs deleted with a typed message). Labels,
  texts and wire ids are never changed.
- When a saved program meets the engine's question ("Which green circle? Done or Go", e.g. quick #2 after Traffic light), the tab says
  it cannot choose and does not do that step. It takes no reply: a name typed or clicked afterwards is not played here.
- The manifest (850 KB) is fetched only for a built-in example (and while the + menu is open), never for a typed message.
- No confidence and no gate: a saved program runs as written, like a message typed as SOP Lang. So the cautious rule of the reading tabs
  for deleting requests (a request that would remove several described items asks first) does not apply here. It would have held three
  turns: story#12 ("Delete the pink stars."), farm#42 ("Actually delete the stars, too much.") and poster#33 ("delete the music notes").
- A no-op turn replies "Nothing to do" with the model's reason; a partly translated turn says what was not translated.
- SOP Lang typed by you and the toolbar (Undo, Redo, Clear) run in this tab as in every tab; the quick example that is SOP Lang itself
  (quick#13, hand-written in `docs/js/ui.js` since e69eef6, the repository's first commit) runs as SOP Lang and is marked as not generated.
- The tab has its own world, undo history and replies. It never receives another tab's drawing (it is not an Align target and starts from
  the opening drawing like every tab), and Align is hidden while it is open, so its drawing is never copied to the others.
- **details** under a reply shows the program, its file and lines, the translated text and the text sent, the renames and the notes; the
  tab's SOP Lang subtab shows the last program it played; its Settings show the model, the coverage and what was played.

## Limitations

- **Whole-canvas questions.** SOP Lang has no "this area" filter. A question about the drawing (`count`, `describe`, `extreme`, `cycle`)
  covers the whole canvas, so in a scenario played beside the opening drawing it counts that drawing's items too (zoo#3 answers 15 shapes:
  its 8 and the opening drawing's 7). The 11 turns concerned carry a `scope` note. Scenes start with "Clear the canvas", so for them the
  canvas is the scene. Layout requests on "everything" have no target and stay in the current area.
- **Names the engine gave.** Some scene messages name shapes by the engine's automatic names ("rename rectangle1 to R1", "square3",
  "hexagon2": circuit, floorplan, jungle, recycle), or by the name the engine gave a group's copy ("What's in Finn2?", "What's in Bot12?":
  reef, factory). They are written as the message writes them; such a name exists only when the engine's name counters and the group
  names are where they were on a fresh page ("Clear the canvas" does not reset the counters). Played a second time, or after another
  example drew shapes of that kind, those turns name no shape and fail, in every tab.
- **Two saved-translation tabs, two rules for an interrupted run.** The gpt-6.1-sol tab stops a run's later turns when its drawing or
  history changes outside the run (a typed SOP Lang line, the toolbar). This tab keeps playing each turn it is given, by its occurrence and
  text, into its own drawing as it is then: a toolbar Undo between two turns of a scenario is kept, and a later turn may then find a shape
  missing (the engine says so).
- **Placement is the engine's.** A wire says where; the engine's free-spot search moves a new shape when that spot is taken, and keeps
  shapes on the canvas. So some shapes land away from where the message meant: the diamonds "between" Block and Disc (bauhaus#11, #12),
  the band boxes "under the subtitle" (poster#23), "comes the morning" "just below" the first line (sunrise#10), Core "in the middle"
  (recycle#11), the hexagon "near MyBody" (grancard#25), Kid2 "near the sandbox" (playground#12), panels nudged inside the canvas
  (farm#2, harbour#2, #3, living#2). The programs are faithful; the drawings show the engine's choice.
- **Approximations** (22, each noted): the legend has no shades ("dark green" → green, "pale blue" → blue for an item), no "thick" (an
  arrow `size=large`), no "a bit" (20 px, ×1.25), no comparison of two counts (winter#22).
- **Coverage is of the examples only**, as they are in the source at `4eba686`. A changed example text is reported as stale, not played.

## Checks

    node training/sop-translations/build_manifest.mjs --check   # the manifest is built from the files; every input, parse, repair line
    node training/sop-translations/run_examples.mjs             # every example on an empty canvas, on the opening drawing and twice
    node training/sop-translations/test_saved_sop.mjs           # inventory, provenance, saved-sop.js, playback, what each example draws
    node training/sop-translations/test_saved_sop_ui.mjs        # the tab in a real browser (Playwright, Chromium)
