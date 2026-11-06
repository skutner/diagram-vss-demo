# Writing a natural-language test set: what to write

You write realistic messages that people type or dictate into a chat-based diagram editor. They test how well a reader understands natural language it has never seen. Variety and realism matter more than anything else: these must read like many different people, not like a template.

Read no other file of this repository. Your brief is this file, plus the domain, persona and output path you are given.

You write **texts only, never labels**: no analysis of what a message means and no expected answer. Other people annotate your saved file, and it stays as you saved it.

## What the editor is

A chat box beside a canvas. A person asks in their own words and the editor draws: shapes in colours and sizes, names on them, text written on or beside them, arrows and lines between them, groups, layouts, ready-made diagram forms (a process, a timeline, a pyramid), undo. The person can also ask about the drawing: how many, which, where, what is connected to what. Write what people would actually say to such a thing, including what it cannot do. Do not limit yourself to what you think it can do, and do not try to guess which wordings it knows.

## Output

JSON Lines, one message per line, saved to the path you are given:

```json
{"id":"p-0001","domain":"bakery floor plan","kind":"short","setup":"@c1 command action=create shape=rectangle name=Oven color=gray size=large\n@c2 command action=create shape=circle name=Mixer color=white position=rightOf anchor=Oven","text":"..."}
```

| field | what |
|---|---|
| `id` | unique in the batch, with the prefix you are given |
| `domain` | what is being drawn |
| `kind` | one of the kinds below: the one that best describes this message |
| `session` | only on a step-by-step session: the same value on all its rows |
| `group` | only on a paraphrase group: the same value on all its rows |
| `setup` | the drawing the person is looking at, as below |
| `text` | the message, exactly as the person's words came out |

- Rows of one session are next to each other, in the order they were sent, and only the first has `setup`. Each later message is sent after the editor did the earlier ones.
- Rows of one paraphrase group share `group` and the same `setup`, and their `kind` is `paraphrase`.
- A row is in a session or in a group, never both.
- A row with no `setup` and no session means an empty canvas. People do start from nothing, but most messages are about something already there.

## Whole messages

Any natural length, from one word to 10-20 sentences: a person describing or reworking a whole diagram writes long, a person with a problem writes short. Simple and complex sentences mixed, requests mixed with text that is not a request. Mostly instructions, with questions where a person would check something. **No quotas: never pad a message or add a sentence to reach a length or a count. Never write a message to show off a feature.** If a kind below does not fit the person you are writing, leave it out. A batch need not hold them all.

## The kinds

Use the value in the first column as `kind`.

| kind | what |
|---|---|
| `long` | a long message around several wishes, with chatter: why they are drawing this, what the meeting is about, doubts, thanks, things that are not requests |
| `short` | a short literal command, as a person types when they want it done or when longer wording has failed |
| `session` | one step of someone drawing something over many messages, each building on what is already there, in the terse way people chat once they are under way |
| `self_correction` | the person changes their mind or fixes a slip while writing, and leaves the first attempt in the text |
| `complaint` | unhappy about what the editor just did or did not do, with what they want somewhere inside, stated or only implied |
| `indirect` | says what is wrong or what they would like, without an order: a problem, a wish, a question that is really a request, a hint |
| `typos` | typed fast or on a phone: typos, missing spaces, no capitals, or a non-native speaker's slips of grammar and word choice |
| `dictated` | spoken into a phone or a microphone: run-ons with no punctuation, fillers, restarts, words the recogniser misheard, homophones |
| `translated` | written in another language and passed through a machine translator: literal word order, words in the wrong sense, grammar that belongs to the other language |
| `fragment` | a piece of a message: a few words, a noun, an unfinished thought, sent by accident or as a continuation |
| `ambiguous` | a message that two people could fairly take two ways, as a real person would write without noticing |
| `nothing_to_do` | no request at all, or something outside what a diagram editor does: thanks, small talk, a question about the world, a request for an email or a calculation |
| `reference` | the message reaches something on the drawing without its name: by a pronoun, by a description in the person's own words, by the words written on it. The `setup` must hold what is meant |
| `paraphrase` | one intention on one drawing, worded the way several different people would. Each row is a different person, not a small edit of the row before: different words, order, length, register |

A session row may take another kind when that is what the message mostly is. Its `kind` is otherwise `session`.

## Variety (the point of the exercise)

- Many domains: flowcharts, org charts, network and cloud diagrams, state machines, mind maps, family trees, boards, school diagrams, wireframes made of shapes, pipelines, floor plans, game maps, recipes, sports plays, storyboards, pictures made of shapes, anything people draw.
- Many people: terse engineers, chatty students, children, tired managers, non-native speakers, people who have never used such a tool, people who know exactly what they want, polite and rude ones.
- Vary verbs, wording, sentence openings, word order, plural and singular, names and descriptions and pronouns, as widely as real people do. Use the words the person would use for their own subject, not diagram words, wherever a real person would.
- Refer to what the person can see. A person looking at a drawing rarely spells everything out, and uses what the drawing holds: where things are, what they look like, what is written on them.
- Do not reuse a sentence frame more than a few times in a batch. Write each message fresh. Do not write your messages as variations of a list of commands.

## `setup`: the drawing the person is looking at

A short program of SOP Lang, usually 2 to 15 lines, joined by `\n` in the JSON string. It should look like a real drawing in progress for that domain and that message: shapes, colours, sizes, names, some arrows, sometimes labels, sometimes shapes with no name. Everything a message refers to must be in it, unless the person is mistaken on purpose.

One wire per line: `@id type key=value key=value ...`. `id` is a letter followed by letters or digits, unique in the setup. No spaces around `=`. A value with spaces is in double quotes (`label="Cold room"`). A list is comma-joined with no space (`target=A,B`).

```
@c1 command action=create shape=rectangle color=blue fill=light layer=zone name=Yard width=500 height=260 at=300,250
@c2 command action=create shape=hexagon color=green size=large name=Gate label="North gate" position=topLeft
@c3 command action=create shape=star color=white size=tiny count=3
@c4 command action=create shape=circle name=Pump position=rightOf anchor=Gate
@c5 command action=create shape=text label="Site plan" name=Title position=top
@c6 command action=connect from=Gate to=Pump style=dashed
@c7 command action=connect from=Pump,Gate pairing=chain arrow=none
@c8 command action=group target=Gate,Pump name=Works
```

`create` keys, all optional:

| key | values |
|---|---|
| `shape` | circle, square, rectangle, triangle, diamond, ellipse, hexagon, star; `text` for a free text, which needs `label` |
| `color`, `outline` | red orange yellow gold lime green teal cyan blue navy indigo purple magenta pink brown gray black white |
| `size` | tiny small medium large huge |
| `name` | one word: letters, digits, `-`, `_`, starting with a letter; unique on the drawing |
| `label` | the text written on the shape |
| `count` | 2 to 12 copies; with no name they are named as below, with `name=X` they are X, X2, X3 |
| `position` | canvas places center top bottom left right topLeft topRight bottomLeft bottomRight; or leftOf rightOf above below near between inside onTop, with `anchor=` a name (`between` takes `anchor=A,B`) |
| `distance` | the gap in pixels to the anchor |
| `at` | exact place, `x,y` with no space; the canvas is 800 wide and 500 high |
| `width`, `height` | a box in pixels |
| `fill` | solid light faint none |
| `layer` | `background` or `zone`: a panel behind the items, usually with `fill=light`, `width`, `height` |

- A shape with no `name` is named by the editor: its kind and a number counted per kind from 1 (`star1`, `star2`, `rectangle1`, `text1`). The person sees these names on the canvas and may use them.
- `connect`: `from=`, `to=`, optional `style=dashed|dotted`, `arrow=none` (a plain line) or `arrow=both`, `color=`, `label=`. Several in a row: `from=A,B,C pairing=chain` with no `to`. Arrows do not attach to texts.
- `group`: `target=A,B` and `name=`, a name no shape has.
- An anchor, `from`, `to` or `target` must already exist on an earlier line. Use only these keys.

## Before you save

Save the file in one go. Every row is one line of valid JSON. Do not revise texts to make them cleaner: the slips are the point. Report the path and the number of rows.
