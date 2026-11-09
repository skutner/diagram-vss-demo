# F-s0 root causes (seed 0, truthful_v1): why F failed F1, F2, F3

Source: F-s0 and B-s0 records and score files (no new inference). "Ungated" = every produced request executed. "Gated" = executed at the arm's cost-10 threshold (B 0.9150, F 0.8758). Counts in `root_causes_seed0.json`; scratch scripts and per-request dumps in `work/` (`decisions.json`, `t3.json`, `t4.json`). One seed per arm: a difference between F-s0 and B-s0 cannot be split into "r2 data" and "seed/training order" with these runs.

## 1. outline_create (15/80) and description_size (15/64)

Action: right in every request of both populations (0 requests with a wrong action). The cause label of every miss is `heads` (the class heads), none from the cutter in F.

**outline_create, F ungated: 15 right, 65 wrong (B: 3 / 77).** Wrong requests by key:
- outline value = copy of the colour word ("a gold square with a black border" -> outline gold): 35, plus 1 (st1-01406 "cyan triangle with a navy border" gives color navy, outline navy: outline right, colour overwritten with the outline word, in the "colour wrong" form)
- other wrong outline value: 10 (+1 with colour wrong)
- outline missing: 16 (+2 with colour wrong)
B's misses were mostly "outline missing" (50 + 16 with colour also missing/wrong) and 11 wrong values; F now writes an outline key but fills it wrong in 47 of 65 (35 + 1 colour copies, 10 + 1 other values).
Examples (gold | F | B):
- st1-00100 "draw a gold square with a black border": outline black | outline gold | no outline (held, conf 0.457)
- st1-00082 "make a red star with a purple outline": outline purple | outline red | no outline
- st1-00009 "sorry, add a purple square with a cyan outline pls": outline cyan | no outline | no outline

Training rows that carry the gold form: F has 74 create rows with an outline value (57 from r2, 17 before; plus 15 rows "outline none"); B had 17. Values per colour 1-7 rows each (blue 2, purple 1, cyan 3, lime 3, orange 3, red 6, yellow 7, gold 7). No training row has outline = colour (0). Phrasing: "(make/add/draw) a COLOR SHAPE with a COLOR (outline|border)", create rows: border 50, outline 39; set rows: outline 54, border 43. The r2 phrasing is the same family as the test phrasing: after replacing colours/shapes by placeholders, 50 of the 80 test messages have a template that occurs in r2; of these 8 are right and 42 wrong (templates not in r2: 7 right, 23 wrong). Bare messages (no "sorry", "pls") 11/57 right; decorated 4/23. So phrasing coverage is not what separates right from wrong.
Held-out r2 messages show the same failure: the calibration records hold 580 reserved r2 messages (checked: none of the 580 ids is in F.ids); 22 are outline creates and F reads 3 right (19 wrong). Place of the cause: model class head (the `outline` class head reads one value for the sentence and returns the colour word that is there); data coverage of 57 rows is not enough for it, and phrasing is not the issue. This is inference from the counts above; I did not look inside the model.

**description_size, F ungated: 15 right, 49 wrong (B: 3 / 61).** By form:
- count questions with a size ("how many big circles are there"): F 14 of 14 right (B 3 of 14). Training: 14 count rows with a size class, 12 from r2.
- commands on a described group ("make the tiny hexagons teal", set 19, move 19, delete 12 = 50): F 1 of 50 right (a delete), B 0 of 50.
Wrong requests by key: size missing from the mention target 44 (target `mention(quantifier=all,shape=hexagon)` instead of `...,size=tiny`), wrong size value 5 (e.g. "move the big rectangles down" -> size=tiny). The action and the other keys are right.
Examples: st1-00025 "make the tiny hexagons teal": gold target ...size=tiny; F target without size (also B); st1-00276 "move the big rectangles down": gold size=large, F size=tiny, B no size.
Training rows: F has 59 rows with `desc:size` (35 from r2, 24 before); the 35 r2 rows are exactly this form ("make the big ellipses white", "move the small squares down", "erase the giant diamonds"; sizes tiny 11, huge 9, small 8, large 7). 30 of the 50 failing test messages are bare messages in the same wording as those rows ("make the tiny hexagons teal"): 0 of 30 right. So phrasing is represented, and the model still does not write the size. Place: model, the `desc:size` head (59 positive rows among 15,350 rows with a description); the count form, which uses an ordinary class head with 14 rows, was learned. Inference. The int8 export was not ruled out as a factor (not tested).

## 2. outline_set (67/80)

13 wrong, all with gold value green (0 of 4 right), orange (3 of 8) or pink (3 of 7); every other gold value is right (61 of 61). Wrong requests: 7 wrong outline value (F wrote for green: gray, red; for orange: brown; for pink: yellow), 6 outline missing. B: 26 right, 54 wrong (outline missing 38, wrong value 12, extra colour 4).
Examples: st1-02018 "give Locked a green border": gold green | F red | B no outline (held); st1-01028 "give Customs a orange border": orange | F brown | B cyan (held); st1-00736 "next, give Ingest a pink border": pink | F no outline.
Training rows with an outline value on set: F 97 (59 from r2): green 3 (r2 1), orange 4 (2), pink 2 (1). Those are three of the lowest counts; navy 3 rows (9 of 9 right) shows the count alone does not decide. Phrasing: with the target name replaced by NAME and colours by COL, 57 of 80 test messages have a template present in r2 (48 right, 9 wrong); 23 do not (19 right, 4 wrong): phrasing is covered and does not separate right from wrong. Place: model class head, outline values with few rows (data coverage by value). Inference, correlation only. The same `outline` head is right on set (one colour word in the message) and wrong on create (two colour words): 35 of create's 65 wrong copy the fill colour and no training row has outline = colour. Inference: the head cannot tell the two colours apart in one request; this is not a phrasing gap.

## 3. Lowercase regressions

Ungated per request, B -> F (pairing by gold request):
- lowercase_other_affected (825): right 612 -> 557 (my pairing gives 559; 2 requests unreconciled, B reconciles exactly). right->wrong 88, right->unread 6; wrong->right 34, unread->right 7.
- short3_lowercase (134): right 63 -> 41. right->wrong 25, right->unread 2; wrong->right 4, unread->right 1.
Same messages in original case (fresh2_test): B 746 right, F 749 of 825. The loss exists only in lower case.
First cause of the 94 + 27 requests right in B and not right in F:
- name key missing (the name was not read: target/from/to missing): 25 + 14
- name key wrong (other name, a shortened list, "$new"): 37 + 2; with missing and wrong: 3 + 4
- name key and other keys (mostly anchor and position both gone because the anchor name was not read): 19 + 5
- no name key differs: 4 + 0; no request produced: 6 + 2
So 109 of 121 involve a name role (target, from, to, anchor): 90%.

Which head (count of wrong or missing name keys in those requests, per key, so more than the request counts; lowercase_other_affected / short3_lowercase). The records do not hold the per-word tag and fill outputs, so the split is by what the output looks like:
- key missing: 47 / 31. Tag head (no B tag on the word) or fill head (fill = none) cannot be separated without running the model on these texts (I did not).
- fill head (name role read as `$new` 14 / 0, as `mention(...)` 4 / 1): 18 / 1. A written name was read as a reference or a description.
- name read from elsewhere in the message instead of the written one (context fill, e.g. fo-0012 "What colour is rds" -> alb; fo-0067 "make the wan in the center" -> router2; s3-0013 "connect start straight to check" -> process): 11 / 3. The fill head chose context over written.
- tag or cut head (list shortened, e.g. fo-0062 "users go to cloudfront and cloudfront goes to s3" -> cloudfront,s3: 11 / 0; another name inside the span, e.g. fo-0003 paused -> running: 4 / 1): 15 / 1.
- a key added where gold has none: 0 / 2.
So the lower-case loss is mostly names not read at all or read as a reference (fill head) and fewer wrong tags. Whether the cause is the name case in r2 is not shown by this split (see next paragraph). Cause label in the root-cause file: `heads` for most, cutter for the rest. Examples: s3-0329 "start tiny": gold target start | F no target | B right; s3-0123 "link check and start": from check, to start | F only action | B right; fo-0004 "add a small red diamond called Dlq below clean": anchor clean, position below | F neither | B right.
r2 text: all 1,220 name-role spans in r2 start with a capital letter, none is lower case; 572 r2 rows are fully lower case but none of them has a name span (they are create/undo/redo/count). Lower-case-initial name spans: B 1,078 of 58,021 (1.86%), F 1,078 of 59,241 (1.82%). So r2 added 1,220 capitalised names, in exactly the bare short-command shape ("connect Modal to Banner", "give Crab a blue border") that the lower-case test uses, and no lower-case ones; the overall share moved by 0.04 points. Whether this explains the loss I cannot say: a seed effect is not excluded (no second F seed). Inference: the capital letter is the only name cue in r2 short commands, which is consistent with the lower-case drop but does not prove it.

## 4. Confidently wrong on t1_clean

F executes 1130 with 29 wrong (2.57% of executed; B 825 with 5, 0.61%; the verdict's 0.019603 is the difference 0.0257 - 0.0061). All 29 of F's are in the three failing forms; none elsewhere.
Causes (F): outline create 17 (outline = colour word 13, other outline value 4; one of the 13, st1-01406, has the outline right and the colour overwritten by the outline word); outline set 7 (other value 6, missing 1); description size dropped 5 (all five also size-less in B).
Causes (B): all 5 are description size dropped ("erase the large triangles" etc.).
B on the same request (counted once each): same reading 6 (1 executed by B: st1-00192; 5 held by B: st1-00681, st1-01043, st1-01084, st1-01494, st1-00736); different reading 23 (5 where B read it right and held it: st1-01406, st1-01414, st1-01918, st1-01938, st1-02354; 18 where B read it wrong and held it, mostly with no outline key). So 28 of the 29 were held by B and 1 executed; the 23 'different' ones are readings B did not make.
Confidence: F's 29 sit at 0.882-0.982; B's 5 at 0.920-0.984. F's threshold 0.8758 vs B's 0.9150 (cost-10 out-of-fold). Of F's 29, 19 are at or above B's threshold and 10 are below it, i.e. 10 would be held at B's threshold (4 size, 2 outline other value in create, 4 colour-copy create). Both arms use the same 1,144 calibration messages; the thresholds differ because F's readings on them differ (out-of-fold at the threshold: F executed 698, 676 right, 13 wrong, 9 extras; B 536, 525, 6, 5). Inference: F's own confidence on the calibration set was not lowered enough for the new wrong outline and size readings. The calibration set includes 580 reserved r2 messages; for outline create F is wrong on 19 of 22 there and still gives 4 of the wrong ones a confidence above its threshold, so the same mistake is in the calibration and the confidence does not separate it (0.42-0.93). Place: model (wrong readings) and calibration (confidence for them not low enough); the cost gain is +3.03 against the bar of 5.


## Appendix: every confidently wrong execution on t1_clean (F: 29, B: 5)

Columns: id, text, gold (differing key), executed reading, confidence (threshold F 0.8758, B 0.9150), cause, other arm on the same request (state, confidence, reading).

| arm | id | text | gold | reading | conf | cause | other arm |
|---|---|---|---|---|---|---|---|
| F | st1-00100 | draw a gold square with a black border | outline=black | outline=gold | 0.9195 | create: outline = colour word | held wrong 0.4567 different reading: outline=- |
| F | st1-00192 | ok so now erase the large triangles | target=mention(q=all,shape=triangle,size=large) | target=mention(q=all,shape=triangle) | 0.9822 | description: size dropped | executed wrong 0.9684 same reading |
| F | st1-00322 | make a yellow triangle with a navy outline | outline=navy | outline=yellow | 0.936 | create: outline = colour word | held wrong 0.4561 different reading: outline=- |
| F | st1-00462 | draw a black triangle with a purple border | outline=purple | outline=black | 0.8882 | create: outline = colour word | held wrong 0.2608 different reading: outline=- |
| F | st1-00480 | add a black square with a green border | outline=green | outline=black | 0.956 | create: outline = colour word | held wrong 0.2154 different reading: outline=- |
| F | st1-00681 | next one: erase the tiny squares | target=mention(q=all,shape=square,size=tiny) | target=mention(q=all,shape=square) | 0.9105 | description: size dropped | held wrong 0.4552 same reading |
| F | st1-00723 | alright, add a brown square with a blue border pls | outline=blue | outline=brown | 0.9082 | create: outline = colour word | held wrong 0.3247 different reading: outline=- |
| F | st1-00736 | next, give Ingest a pink border | outline=pink | outline=- | 0.9198 | set: outline missing | held wrong 0.6894 same reading |
| F | st1-01028 | give Customs a orange border | outline=orange | outline=brown | 0.9622 | set: other outline value | held wrong 0.4411 different reading: outline=cyan |
| F | st1-01043 | hmm ok, make the large triangles purple | target=mention(q=all,shape=triangle,size=large) | target=mention(q=all,shape=triangle) | 0.8818 | description: size dropped | held wrong 0.6636 same reading |
| F | st1-01084 | erase the tiny squares | target=mention(q=all,shape=square,size=tiny) | target=mention(q=all,shape=square) | 0.9041 | description: size dropped | held wrong 0.5877 same reading |
| F | st1-01146 | make a yellow circle with a navy outline | outline=navy | outline=teal | 0.9041 | create: other outline value | held wrong 0.3424 different reading: outline=- |
| F | st1-01204 | ok so now add a gold triangle with a yellow outline | outline=yellow | outline=gold | 0.9265 | create: outline = colour word | held wrong 0.4068 different reading: outline=- |
| F | st1-01234 | make a gold rectangle with a white border | outline=white | outline=gold | 0.9629 | create: outline = colour word | held wrong 0.284 different reading: outline=- |
| F | st1-01264 | make a blue rectangle with a purple border | outline=purple | outline=yellow | 0.9449 | create: other outline value | held wrong 0.6102 different reading: outline=blue |
| F | st1-01370 | add a black hexagon with a lime border | outline=lime | outline=black | 0.8974 | create: outline = colour word | held wrong 0.1762 different reading: outline=- |
| F | st1-01406 | make a cyan triangle with a navy border | color=cyan | color=navy | 0.8886 | create: colour overwritten with outline word | held right 0.4 different reading: color=cyan |
| F | st1-01414 | give Support a orange border | outline=orange | outline=brown | 0.9651 | set: other outline value | held right 0.6323 different reading: outline=orange |
| F | st1-01494 | make the tiny hexagons green | target=mention(q=all,shape=hexagon,size=tiny) | target=mention(q=all,shape=hexagon) | 0.8875 | description: size dropped | held wrong 0.0542 same reading |
| F | st1-01610 | make a cyan circle with a brown outline | outline=brown | outline=cyan | 0.9347 | create: outline = colour word | held wrong 0.5036 different reading: outline=- |
| F | st1-01853 | make a black rectangle with a white border | outline=white | outline=black | 0.955 | create: outline = colour word | held wrong 0.1826 different reading: outline=- |
| F | st1-01918 | make Coil's border green | outline=green | outline=gray | 0.9658 | set: other outline value | held right 0.2923 different reading: outline=green |
| F | st1-01938 | make a cyan star with a white border | outline=white | outline=gold | 0.9211 | create: other outline value | held right 0.3665 different reading: outline=white |
| F | st1-01980 | make a black triangle with a brown outline | outline=brown | outline=black | 0.9321 | create: outline = colour word | held wrong 0.6932 different reading: outline=- |
| F | st1-02018 | give Locked a green border | outline=green | outline=red | 0.9538 | set: other outline value | held wrong 0.3599 different reading: outline=- |
| F | st1-02031 | hmm ok, draw a black diamond with a lime border | outline=lime | outline=black | 0.9311 | create: outline = colour word | held wrong 0.1785 different reading: outline=- |
| F | st1-02040 | give Grandpa a pink border | outline=pink | outline=yellow | 0.967 | set: other outline value | held wrong 0.576 different reading: outline=magenta |
| F | st1-02354 | make Team's border green if you can | outline=green | outline=gray | 0.9228 | set: other outline value | held right 0.1365 different reading: outline=green |
| F | st1-02360 | make a purple diamond with a green border | outline=green | outline=red | 0.8973 | create: other outline value | held wrong 0.2218 different reading: outline=- |
| B | st1-00192 | ok so now erase the large triangles | target=mention(q=all,shape=triangle,size=large) | target=mention(q=all,shape=triangle) | 0.9684 | description: size dropped | executed wrong 0.9822 same reading |
| B | st1-00308 | erase the giant squares | target=mention(q=all,shape=square,size=huge) | target=mention(q=all,shape=square) | 0.9204 | description: size dropped | held wrong 0.587 same reading |
| B | st1-01506 | ok and erase the giant triangles | target=mention(q=all,shape=triangle,size=huge) | target=mention(q=all,shape=triangle) | 0.9843 | description: size dropped | held right 0.7716 different reading: target=mention(q=all,shape=triangle,size=huge) |
| B | st1-01983 | erase the huge rectangles | target=mention(q=all,shape=rectangle,size=huge) | target=mention(q=all,shape=rectangle) | 0.9289 | description: size dropped | held wrong 0.5241 same reading |
| B | st1-02299 | hmm ok, erase the small ellipses | target=mention(q=all,shape=ellipse,size=small) | target=mention(q=all,shape=ellipse) | 0.9383 | description: size dropped | held wrong 0.254 same reading |
