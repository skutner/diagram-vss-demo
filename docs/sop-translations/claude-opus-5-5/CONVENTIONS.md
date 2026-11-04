# How the built-in examples are written as SOP Lang (Claude Opus 5.5)

These are the rules every `.sop` file of this folder follows. They were written before the translations, and every program was written
by hand by the generation model from the example's own words and its earlier messages, following them. Nothing here was produced by the
Rules, VSS, SOP-BERT, ModernBERT or Qwen3 readers or copied from an annotation.

## The dialect

The application's own SOP Lang, one wire per line, as `docs/js/logic.js` `parse()` reads it and the toolbar and the direct-SOP quick
example write it:

    @c1 command action=create shape=circle size=large color=red name=Stop position=top

Not the multiline representation of `docs/js/vss/soplang.js` or `training/vss/tool/sop/soplang.py`. Lines starting with `#` are comments
(`parse()` skips them). Wire types: `command`, `question`, `fact`, `rule`, `mention`. Keys and values are the legend's (`createSystem()
.engine.legend`); `position2`, `anchor2` and `region` are not legend questions and are not used.

Wire ids, per message: `m1, m2 …` mentions, `c1 …` commands, `q1 …` questions, `f1 …` facts, `r1 …` rules. A wire may refer only to an
earlier wire of the same message (`target=$m1`); wire values do not survive a message.

## The file format

One file per example: `quick.sop` (the 13 quick examples, one block each), `scenarios/<id>.sop`, `scenes/<id>.sop` (ids of
`docs/js/scenarios.js` and `docs/js/scenes-extra.js`). One block per message, in order, 1-based:

    ## turn 3
    # input: Connect Stop to Wait with a plain line. Connect Wait to Go with a plain line.
    @c1 command action=connect from=Stop to=Wait arrow=none
    @c2 command action=connect from=Wait to=Go arrow=none

`# input:` repeats the message exactly (checked against the source). Then optional directives, then the wires. Directives (`#!`):

| directive | meaning |
|---|---|
| `#! noop: <reason>` | the message asks for nothing the editor does (thanks, a comment, a story); no wires |
| `#! unsupported: "<words>": <why>` | a request (or part of one) that SOP Lang cannot express; nothing is written for it. With no wires the turn is *unsupported*; with wires it is *partly* translated |
| `#! approx: "<words>" -> <value>: <why>` | a word mapped to the nearest legend value (e.g. "dark green" -> `color=green`) |
| `#! scope: <what>` | the wire answers or acts on the whole canvas (every area), where the message means this drawing; SOP Lang has no "this area" filter |
| `#! resolved: "<words>" -> <names>: <why>` | a reference ("them", "the copy", "all squares") written with the names or a mention that earlier messages of the example set |
| `#! direct: <provenance>` | the example is already SOP Lang; it is played as written, not generated |
| `#! repair: <validation or review>: <what changed and why>` | a change made after the first pass (the frozen copy is in `first-pass/`) |

A turn with no wires must have `noop` or `unsupported`. Every turn whose program differs from its frozen first pass has a `repair` line,
and only those.

## Reading rules

- Every request of a message is written, in the message's order. A self-correction ("at 2 o'clock... no, just put it right of Hen")
  keeps only the final wish. Text that is not a request (a reason, a joke, "so it covers part of the sun") is left out silently when the
  request is complete without it; a request that cannot be written is `unsupported`.
- Names are written as the message writes them (`name=Stop`, `target=Stop`). A shape the message does not name is not given a name: the
  engine names it (`circle1`, …). Auto names are never predicted (the engine's counters survive a clear).
- References:
  - a shape named earlier: its name;
  - "it", "that", "the copy", "the new one": the shape the previous message made or changed, by name when it has one, else by a mention
    of what it is with `recency=newest` (the shape made last among those that match);
  - "the title", "the text that says …": a mention with `shape=text label="…"`;
  - a description ("the green circle", "the stars"): a `mention` with what it says; "all"/"every"/plural: `quantifier=all`;
  - "them" / "all squares" in an example that drew them itself: the names it gave them, when it gave names (`#! resolved:`), so that shapes
    in other areas of the canvas are not touched; otherwise a mention.
- "everything", "the whole diagram" for a layout operation: no `target` (the engine then takes every shape of the current area). For a
  question (`count`, `describe`, `extreme`, `list`) there is no such filter: the wire covers the canvas (`#! scope:`).
- "shape" in a question ("which shape", "how many shapes") is `shape=any` (it leaves the background and zone panels out).
- Positions: "in the center / at the top / top right / on the left" -> `position=center|top|topRight|left`; "right of / left of / above /
  below / next to / between / inside / on (top of)" -> `position=rightOf|leftOf|above|below|near|between|inside|onTop` + `anchor=`;
  "N px above X" -> `distance=N`; "at x, y" -> `at=x,y` (relative to the current area); "move X up by 30" -> `direction=up distance=30`.
- Sizes: the five words tiny / small / medium / large / huge (big = large, giant = huge). Relative: "bigger" -> `action=resize` (the engine's
  ×1.5); "a bit / slightly / a little bigger" -> `scale=1.25`; "much bigger / twice as big" -> `scale=2`; "smaller" -> `scale=0.67`;
  "a bit smaller" -> `scale=0.8`.
- Colours: the 18 legend colours; "grey" = gray, "light/pale X" -> `color=X fill=light` for a panel or zone, else `color=X` with an
  `approx` note; "dark X" -> the nearest legend colour (dark blue = navy) with an `approx` note.
- Lines: "line", "plain line" -> `arrow=none`; "arrow" -> `arrow=forward` (the default, not written); "two-way arrow" -> `arrow=both`;
  "dashed", "dotted" -> `style=`. "in a chain" -> `pairing=chain`.
- A statement of how the drawing is ("Printer is gray", "Check is above Process") is a `fact`; "from now on X are Y" is a `rule`.
- Questions are written as questions; the engine computes the answer from the drawing when the turn is played.
- "Clear the canvas" -> `@m1 mention quantifier=all` + `@c1 command action=delete target=$m1` (the toolbar's own wires).
- "undo" / "redo" -> `action=undo|redo` (with `count=` when a number is said).

## Added after the first pass of the scenes

The rules above were written before any translation. The scenes raised the cases below; the translators wrote them as follows, and the
coordinator made the corpus consistent with them (the turns changed for it carry a `#! repair: review:` line).

- "move X a bit / a little <direction>" -> `direction=… distance=20` with an `approx` note (the engine's own step is 80 px).
- "shrink X" -> `action=resize scale=0.67`.
- "the same size as Y" -> `action=equalize property=size anchor=Y` (or `size=` Y's size word, with a `resolved` note).
- "right above X, no gap" -> `position=onTop` (`above` keeps a gap for the name tag), with a note.
- "on top of everything", "in front of X" -> `action=toFront`.
- A heading word used later as a name ("Library: a purple square …", "Dock: …") -> `name=` that word, with a note.
- A name the engine gave and the message writes ("rename rectangle1 to R1", "square3", "hexagon2") -> a mention of the shape when one
  mention picks it whatever its name (`recency=oldest|newest`, `label=`, a unique description), with a `resolved` note; otherwise the name
  as written, with a note. Such a name exists only when the engine's counters are where they were when the example was written (a fresh
  page): on a second play, or after another example drew shapes of that kind, it names no shape, in every tab (README.md, Limitations).
- A request that compares two counts ("are there more stars than circles?") is `unsupported`; the counts themselves are written.
- A target list may mix names and a mention (`target=Hull,Mast,$m1`).
