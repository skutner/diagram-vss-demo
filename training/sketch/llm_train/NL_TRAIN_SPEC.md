# Writing natural-language training data: what to write

Your brief is this file and `../llm_bench/NL_TEST_SPEC.md`, which gives the format, the kinds and the `setup` dialect: read both. Everything in `NL_TEST_SPEC.md` holds here (texts only, no labels, no quotas, no padding, the slips are the point), except that this is training data, and you are told what the reader is missing. Read no other file: nothing else under `training/sketch/llm_bench`, no `docs/js/scenarios.js`, no `docs/js/scenes-extra.js`.

## What the reader is missing

A small model learns to understand people from these messages. So far it has mostly read messages written by people who knew the editor's vocabulary. Real people do not. Write as people who have never seen a list of what the editor can do, about their own subject, in their own words. In particular, the way people really do these things, as often as they would really do them:

- **Things are called what they are in the person's subject, not by shape or by exact name**: "the oven", "the round yellow thing up there", "the one with the rain in it", "that box asking tired", "the other route", "last stop", "the bottom one". The `setup` holds what is meant.
- **What is written on a shape**: most things in real drawings carry words. "A box that says Waiting room", "put 12 on the next one", "it should say Won, not Closed", "delete Order Flow", a title reached by its words.
- **No verb, or only a noun**: "Refund box under Payment", "Tank: blue rectangle", "then Palletizer", "Orange sun.", "and from signoff to publish", "activities = beach + hike + museum".
- **Other ways of asking for a new thing**: "make me a yellow triangle", "I need a text item that says Hello", "we also have a loading dock", "give Planets a little one off it for Mars".
- **Other ways of arranging and joining**: "place all the elements in the form of a circle", "join A and B", "unite the boxes", "A goes to B", "A feeds B", "the pass goes to him", "a failed inspection goes back to washing", "same words same arrows".
- **A wish inside a complaint or a remark**: "I didn't say circle, I meant square", "you drew a circle, I needed a text", "this looks weird up in the corner", "the lads won't know who's who".
- **Dictated and machine-translated**: a name said as words ("Diamond One" for diamond1), homophones, no punctuation, literal word order, words in the wrong sense.
- **Continuing**: the next message of a session often has no subject, relies on the last thing done, and says only what changes.

Do not copy these phrases: they show the kind of thing. Write fresh messages in many different words. Do not write a message to show off a feature, and do not make every message hard: plain commands are real too.

## Output

JSON Lines as in `NL_TEST_SPEC.md`, saved to the path and with the id prefix you are given. Report the path and the number of rows.
