# Annotating messages for the diagram editor

You get messages a person sent to a chat diagram editor, with the drawing before each, and write what each asks for as wires in the editor's legend. Read no other file; do not run the engine; do not change a text, even a typo.

## Input and output

Input row: `{id, domain, kind, session?, group?, setup?, text}`.
- `setup`: the drawing before the message, one wire per line (`@c1 command action=create shape=circle name=A`). None, and no earlier step: an empty canvas.
- `session`: one person's messages in order. Only the first has a `setup`; a later row's drawing is that `setup` plus what the earlier rows did.
- `group`: wordings of one intention on one drawing. Annotate each on its own.

Output: JSON Lines, one line per input row, same order: every input field copied byte for byte, plus `wires`. No `names` or `groups`: a script fills them.

```json
{"id":"x-1","domain":"kitchen plan","kind":"long","setup":"@c1 command action=create shape=rectangle name=Sink","text":"nice. Could you pop a small blue circle right of Sink and join it to Sink with a dashed line? How many shapes is that?","wires":[
 {"span":"pop a small blue circle right of Sink","trigger":"pop","type":"command","args":{"action":"create","shape":"circle","size":"small","color":"blue","position":"rightOf","anchor":"Sink"}},
 {"span":"join it to Sink with a dashed line","trigger":"join","type":"command","args":{"action":"connect","from":"$new","to":"Sink","style":"dashed","arrow":"none"}},
 {"span":"How many shapes","trigger":"How many","type":"question","args":{"ask":"count","shape":"any"}}]}
```

- `wires`: one per request, in the order the text states them; `[]` when there is no request.
- `span`: exact substring of `text`, holding this request without the chatter. Never shared by two wires: verb ellipsis ("Paint A red, B gold") gives each its own ("B gold").
- `trigger`: exact words inside `span` that say which action or question it is ("pop", "get rid of", "How many"). Verbless: the span's leading words (a move: its place or direction words; extreme, nearest: the superlative).
- `type`: `command`, `question`, `fact` ("Db is green"), `rule` (a default for later shapes: "from now on circles are orange").
- `args`: only keys the message expresses, none invented. Numbers as digits. Texts as written, without their quotes.

## The legend

Commands (`[ ]` optional):

| action | keys |
|---|---|
| create | shape, color, outline, size, fill, layer, name, label, count (2 or more), position, anchor, distance, at, width, height, layout (several new shapes in a pattern), object, linked (names it is joined from) |
| create (free text) | shape=text, label, [size, color, name, position, anchor, at]: text on nothing, or beside a shape ("write X above A"). "write X on A" is `label` |
| create (template) | template, [items (comma-joined texts), items2, parents, title, scheme, color, size, name, position, axis, count]: "a 5-step process" is count=5, no items |
| delete | target. `clear` (no keys) is in the legend too; clearing the canvas is written `delete target=mention(quantifier=all)` |
| move | target, then position + anchor [distance], or direction [distance], or at |
| set | target + any of color, shape, size, outline, fill, layer, width, height. An arrow: from, to (or kind=edge [quantifier=all]) + style, color, arrow, size (thick = large, thin = small) |
| resize | target [scale, width, height]; thicker or thinner arrows as in set |
| rename | target, name (a shape or a group) |
| label | target, label; an arrow: from, to, label; every arrow: kind=edge, quantifier=all. `label=""` removes it, never a delete |
| duplicate | target [count, name, color, position, anchor]; swap: target=A,B |
| group, ungroup | group: target [name]. ungroup: target (a group dissolves, a shape leaves it). A group name works as a target or anchor |
| connect | from, to [style, arrow, color, label, pairing] |
| disconnect | from, to; or target; or quantifier=all |
| align | target, axis; or target, direction (left edges, tops: left, right, up, down) |
| arrange | [target] and layout, axis or direction, [anchor = root]; on a form: template, target |
| distribute | [target, axis]; toFront, toBack: target |
| undo, redo | [count]; forget (the default rules): nothing |
| improve | [target]: tidy, clean up |
| respace | [target] comparison=bigger or smaller [scale, distance]: more or less space |
| snap, flip, straighten, untangle, fit | [target]; snap [distance]; flip [axis]; fit [position=center] |
| reverse | from, to; or target; or quantifier=all ("reverse that" is an undo) |
| sort, groupBy | sort [target, property, superlative, layout]; groupBy [target, property] (moves them; a named group is `group`) |
| equalize | [target] property [anchor = the model]: "the same size as Y" |

Questions:

| ask | keys |
|---|---|
| count, exists, list | filters: shape, color, notColor, size, outline, label, layer, linked, position + anchor; kind=edge for connections, kind=group for groups |
| property | target, property; an arrow: from, to, property=label |
| check | target and color, shape, size, outline, notColor, or position + anchor, or comparison + anchor |
| describe | [target]; neighbors, degree: target; connected: target, anchor |
| path | from, to; reachable: from; cycle, rules: nothing |
| extreme | superlative [shape, color, target]; nearest: anchor, superlative=closest or farthest [shape, color] |
| members | [target = the group]; groupOf: target |
| help | [topic, aspect, about]: about the editor itself. topic = the most specific legend word named, or general; aspect = overview how can values example; about = words the legend does not know |

Facts: target + color, shape, size, or position + anchor. Rules: [shape] + color, size, outline.

Values:
- shape: circle, square, rectangle, triangle, diamond, ellipse, hexagon, star, text, any. color (notColor): red orange yellow gold lime green teal cyan blue navy indigo purple magenta pink brown gray black white. outline: a colour or none. size: tiny small medium large huge (big = large, giant = huge). fill: solid light faint none. layer: background, zone, item.
- position: leftOf rightOf above below near between (anchor=A,B) inside onTop; canvas places center top bottom left right topLeft topRight bottomLeft bottomRight. direction: left right up down. distance, width, height: pixels. at: `x,y` with no space. scale: a factor.
- style: solid dashed dotted. arrow: forward both none. pairing: chain next all. axis: horizontal vertical. layout: row column grid circle tree layers radial organic.
- property: color size shape label position outline name. comparison: bigger smaller. superlative: biggest smallest leftmost rightmost topmost bottommost closest farthest mostConnected leastConnected.
- template: process cycle hierarchy pyramid funnel timeline list matrix target venn hub heart burst steps bridge mountain spiral wave tree road balance hourglass sunrise pillars. scheme: classic warm cool ocean forest earth sunset love calm mono rainbow bold.
- object (a new shape that is that noun, "draw a sun"): sun moon cloud sky ground grass water sea lake river pond tree trunk leaf roof house wall walls door window head face eye nose mouth flower fire snow apple. Stated shape, colour, size, place beside it.

## Reading rules

- **Shapes in a question:** "which shape", "how many shapes" -> `shape=any` (it leaves panels out).
- **Colours:** grey = gray. "pale X", "light X": `color=X fill=light` only for a panel or zone, else `color=X`. "dark X": the nearest legend colour (dark blue = navy).
- **On top:** "on top of X", "right above X with no gap", "on X", "onto X" on a create -> `position=onTop`, `anchor=X`. A stated gap ("30 px above X") -> `position=above distance=30`. Plain "above X" -> `above`. "on top of everything", "in front of X" -> `toFront`.
- **Inside:** "in X", "inside X" on a create; on a move only "inside", "within".
- **Size words:** "make X huge" -> `set size=huge`. Relative -> `resize`: "bigger", "enlarge" no scale; "a bit, slightly, a little bigger" 1.25; "much bigger", "twice" 2; "smaller", "shrink" 0.67; "a bit smaller" 0.8; a stated factor as stated. No scale grows the shape, so a word for smaller needs one.
- **Moves:** "a bit", "a little" -> `distance=20`. No amount, no distance.
- **Lines:** "line", "plain line" -> `arrow=none`. "arrow" -> no arrow key. "two-way" -> `arrow=both`. A new one ("a dotted line from A to B") is `connect`; a change to one that exists is `set`.
- **Connect:** "A to B" from A, to B. One to several: from=Hub, to=A,B,C. Several to one: from=A,B, to=C. "connect A and B": from A, to B. "A to B and B to C", "in a chain": from=A,B,C, pairing=chain, no `to`. "each to the next": pairing=next. "all to each other": pairing=all. A loop: the chain, then a connect from the last to the first. "connect A to B, label it x": one connect.
- **Everything:** arrange, distribute, improve, respace, snap, flip, sort, groupBy, equalize, straighten, untangle, fit, or a question: no `target`. `align` and every other command: `mention(quantifier=all)`.
- **Questions:** "next to X", "beside X" -> position=near; `neighbors` only when it asks about links. "what can be reached from X" -> reachable. "can I get from X to Y" -> path. "are A and B directly linked" -> connected. "more X than Y?": the two counts. "is X red?" is a check.
- **Layout:** "the same size as Y" -> equalize property=size anchor=Y. "tidy" is improve. A link layout word (tree, flow, org chart) on existing shapes -> arrange layout=; on new texts -> a template.
- **Names:** one word of letters, digits, `-`, `_`, as written. A heading word ("Pantry: a green box") -> name=Pantry. Several words cannot be a name: they are the `label`.

## References

`target`, `from`, `to`, `anchor`, `members` hold one reference or several comma-joined (`Hull,Mast,$new`). `linked`: names only.

- **A name** on the drawing, or made earlier in the message, spelled as there. A name dictated as words is that name, if the drawing has it.
- **`$new`**: the shape(s) of the latest `create` or `duplicate` wire of this message (also "the copies"; `Sensor,$new` with the original). It does not cross messages: a later session step uses the name or a mention. A new shape that is not the latest: its name, else a mention.
- **`mention(k=v,...)`**: a description. Keys in alphabetical order, lower case: `color, label, layer, notcolor, quantifier, recency, shape, size`, and when the message says them `anchor, position, linked, outline`.
  - "the red circle" `mention(color=red,shape=circle)`; "the small squares", "every small square" `mention(quantifier=all,shape=square,size=small)`; "the boxes that are not blue" `mention(notcolor=blue,quantifier=all,shape=rectangle)`.
  - "the new diamond" `mention(recency=newest,shape=diamond)`; "the first star" `recency=oldest`. Never quantifier=all with recency.
  - Reached by its words: `mention(label=weekly plan)`, plus `shape=text` for a title or text. No quotes; drop a comma in the words.
  - Panels: a description by kind leaves them out. "the zones" `mention(layer=zone,quantifier=all)`; the background: `layer=background`.
  - One word fitting several shapes stays plain (`mention(shape=star)`): the editor asks which. Do not pick.
- **The message's own words for something drawn** ("the snowflakes", "the title"): write what it actually is on the drawing given. One named shape: the name. Several: their names, or a mention that picks exactly them (`mention(color=white,quantifier=all,shape=star,size=tiny)`).
- **Pronouns** ("it", "them", "the copy"): what they refer to, written as above. No earlier words to go by: the shape last made or changed, by name, else `mention(recency=newest)`. "them all" after shapes named in the message: those shapes.
- **Auto names:** no `name=` gives `<kind><n>`, counted per kind from 1 (`count=3`: star1, star2, star3; `name=X count=3`: X, X2, X3). Use one only when the drawing given shows it. A template's shape, or one from an unnamed create in a session step: a mention.

## What gets no wire

- Chatter: greetings, reasons, comments, thanks, a question about something outside the drawing.
- A request taken back.
- A fragment with no clear wish; two equally fair readings the drawing does not settle. If one is clearly more natural, write that.
- A request the legend cannot express. The rest of the message still gets its wires.
- A reference to something neither on the drawing nor made in the message.

A self-correction: the final wish only ("make it blue, no wait, teal" -> teal). A complaint: the wish inside ("I didn't say X, I meant Y" is Y).
