# Root causes (truthful_v1): modernbert (c6d554be58a8)

Score: `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/F-s0/bundle/eval/score.truthful.json`; training data: `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/data-v2/F`; oracle: none.

Each request that is not right and each extra gets the first cause that explains it (as root_causes.mjs); the causes are then grouped in the plan's categories. truthful_v1 compares the resize direction and explicit scale and the text keys (presence and exact value) beside the pairing; a written description is not called an unwritten reference (needsKeysV1).

## fresh2_test / test (405 messages, 1313 requested: right 1097, wrong 184, not done 32, extras 81; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 96 |
| actions | 33 |
| values/roles | 168 |
| calibration | 427 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1313); ok (ungated: right + would-be right of structural holds = right of every request executed: 1097); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 184); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 81); ok (ungated: unread = requested - paired: 32); ok (ungated right equals the score file: 1095); ok (ungated wrong equals the score file: 179); ok (ungated extras equals the score file: 74); ok (ungated unread equals the score file: 32); ok (ungated structural holds equal the score file: 14); ok (every produced request is executed, structurally held or (gated) confidence-held: 1362); ok (gated: executed wrong equals the score file: 4); ok (gated: executed extras equals the score file: 4); ok (gated: structural holds equal the score file: 14); ok (gated: confidence holds equal the score file: 664); ok (gated: right executed equals the score file: 676); ok (gated: unread equals the score file: 32); ok (gated: held right + held wrong or extra = confidence holds: 664)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 26 | 5 | 0 | 28 | 59 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 37 | 37 |
| 4 wrong act | model (act head) | 19 | 14 | 0 | 0 | 33 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 108 | 6 | 0 | 0 | 114 |
| 6 wrong or missing class value | model (class head) | 20 | 2 | 0 | 0 | 22 |
| 7 wrong words tagged for a name / text key | model (token head) | 31 | 1 | 0 | 0 | 32 |

**fresh2_test / test, trigger seen** (204)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 26 | fo-0023: "Sw1 is connecting to R1" gold: action=connect from=sw1 to=r1 arrow=none; read: not done (merged into a unit with another request)<br>fo-0032: "Is Ecr smaller than Eks" gold: ask=check target=ecr comparison=smaller anchor=eks; read: not done (only a part of the span is a unit)<br>fo-0032: "All rectangles should be orange. Actually only Eks and Ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(shape=rectangle) (the unit covers 41% of the span) |
| 4 wrong act | model (act head) | 19 | fo-0116: "Gcs should be an ellipse" gold: action=set target=gcs shape=ellipse; read: not done (read as command:move)<br>fo-0125: "StatusBar at the bottom" gold: action=move target=statusbar position=bottom; read: not done (read as command:create)<br>fo-0125: "StatusBar at the bottom, gray" gold: requested: StatusBar at the bottom; read: extra command:create action=create color=gray name=statusbar position=bottom (read as command:create where command:move is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 108 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof (a name written in another request or by a pronoun)<br>fo-0010: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo (a name written in another request or by a pronoun)<br>fo-0010: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 20 | fo-0025: "arange Raw, Staged, Curated and Mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart template=matrix<br>fo-0059: "Stack NameField, EmailField and SubmitBtn vertically" gold: action=arrange target=namefield,emailfield,submitbtn layout=column; read: action=arrange target=namefield,emailfield,submitbtn<br>fo-0087: "I want Wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake |
| 7 wrong words tagged for a name / text key | model (token head) | 31 | fo-0012: "hook the copies up to Alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0027: "Off goes to Booting and Booting goes to Ready, Ready goes to Shutdown" gold: action=connect from=off,booting,ready,shutdown; read: action=connect from=off,booting,ready |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 6 | fo-0023: "Sw1 is connecting to R1" gold: action=connect from=sw1 to=r1 arrow=none; read: not done<br>fo-0090: "Only ProfileSvc is using the Db, so connect them" gold: action=connect from=profilesvc to=db; read: action=connect from=gateway to=gateway<br>fo-0116: "Pubsub feeds Dataflow" gold: action=connect from=pubsub to=dataflow; read: not done |
| cut | (command:set) | 6 | fo-0032: "All rectangles should be orange. Actually only Eks and Ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(shape=rectangle)<br>fo-0125: "gray" gold: action=set target=statusbar color=gray; read: not done<br>fo-0441: "End should be a circle not a box, make it a circle" gold: action=set target=end shape=circle; read: action=set color=red shape=circle |
| cut | (command:move) | 2 | fo-0043: "put the Price uh under Image" gold: action=move target=price position=below anchor=image; read: action=move anchor=image position=below target=$new<br>fo-0333: "Bar left of Entrance" gold: action=move target=bar position=leftof anchor=entrance; read: action=move target=bar |
| cut | (command:resize) | 2 | fo-0043: "make it bold, I mean make it larger" gold: action=resize target=price; read: action=resize target=$new<br>fo-0328: "The Kitchen is too big, shrink it" gold: action=resize target=kitchen; read: action=resize target=bed2 |
| cut | (question:property) | 2 | fo-0221: "where Saturn is on this thing" gold: ask=property target=saturn property=position; read: not done<br>fo-0524: "How big is it" gold: ask=property target=sunflower property=size; read: not done |
| cut | (fact:) | 2 | fo-0400: "Start is already a circle" gold: target=start shape=circle; read: not done<br>fo-0415: "The big rectangle in the corner is Bed1, it's blue" gold: target=bed1 shape=rectangle color=blue; read: color=blue target=$new |
| cut | (question:check) | 1 | fo-0032: "Is Ecr smaller than Eks" gold: ask=check target=ecr comparison=smaller anchor=eks; read: not done |
| cut | (question:degree) | 1 | fo-0104: "Is Rds connected to anything" gold: ask=degree target=rds; read: not done |
| act | command:move read as command:create | 2 | fo-0125: "StatusBar at the bottom" gold: action=move target=statusbar position=bottom; read: not done<br>fo-0125: "StatusBar at the bottom, gray" gold: requested: StatusBar at the bottom; read: extra command:create action=create color=gray name=statusbar position=bottom |
| act | command:set read as fact: | 2 | fo-0147: "Color for Connected is green" gold: action=set target=connected color=green; read: not done<br>fo-0147: "Color for Connected is green" gold: requested: Color for Connected is green; read: extra fact: color=green target=connected |
| act | rule: read as command:set | 2 | fo-0214: "I want all circles to be small by default, from now on" gold: shape=circle size=small; read: not done<br>fo-0214: "I want all circles to be small" gold: requested: I want all circles to be small by default, from now on; read: extra command:set action=set shape=circle size=small target=mention(quantifier=all,shape=circle) |
| act | command:toBack read as command:move | 2 | fo-0315: "the little square near the hall, can you send it to the back" gold: action=toback target=mention(shape=square); read: not done<br>fo-0315: "the little square near the hall, can you send it to the back" gold: requested: the little square near the hall, can you send it to the back; read: extra command:move action=move |
| act | command:arrange read as command:align | 2 | fo-0459: "Then line up all four boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done<br>fo-0459: "line up all four boxes in a row" gold: requested: Then line up all four boxes in a row; read: extra command:align action=align axis=horizontal |
| act | question:degree read as question:neighbors | 2 | fo-0460: "Is Closing linked to anything yet" gold: ask=degree target=closing; read: not done<br>fo-0460: "Is Closing linked to anything yet" gold: requested: Is Closing linked to anything yet; read: extra question:neighbors ask=neighbors target=closing |
| act | command:create read as command:duplicate | 2 | fo-0495: "And a second one near Inn, same color" gold: action=create shape=star color=purple position=near anchor=inn; read: not done<br>fo-0495: "a second one near Inn, same color" gold: requested: And a second one near Inn, same color; read: extra command:duplicate action=duplicate anchor=inn position=near |
| act | fact: read as command:set | 2 | fo-0500: "it's actually navy" gold: target=yarn color=navy; read: not done<br>fo-0500: "it's actually navy" gold: requested: it's actually navy; read: extra command:set action=set color=navy |
| ref | target | 78 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof<br>fo-0010: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo<br>fo-0010: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo |
| ref | anchor | 11 | fo-0168: "put Grandma above both of them" gold: action=move target=grandma position=above anchor=mom,uncle; read: action=move anchor=mom position=above target=grandma<br>fo-0190: "move it there" gold: action=move target=frog position=rightof anchor=grasshopper; read: action=move anchor=frog position=between target=frog<br>fo-0192: "what's farthest from it" gold: ask=nearest anchor=earth superlative=farthest; read: ask=nearest superlative=farthest |
| ref | to | 10 | fo-0020: "disconnect them" gold: action=disconnect from=audit to=load; read: action=disconnect from=audit to=audit<br>fo-0035: "Same for Spine2" gold: action=connect from=spine2 to=leaf1,leaf2,leaf3,leaf4; read: action=connect from=spine2<br>fo-0055: "Connect CoreSw to each of them" gold: action=connect from=coresw to=vlan10,vlan20,vlan30; read: action=connect from=coresw |
| ref | from | 10 | fo-0025: "conect them each to the next" gold: action=connect from=raw,staged,curated,mart; read: action=connect pairing=next<br>fo-0035: "disconnect it from Spine1 and Spine2" gold: action=disconnect from=leaf4 to=spine1,spine2; read: action=disconnect to=spine1,spine2<br>fo-0076: "All three consumers -> Aggregator" gold: action=connect from=consumer1,consumer2,consumer3 to=aggregator; read: action=connect to=aggregator |
| class | target | 6 | fo-0332: "All the circles that aren't green, make them blue" gold: action=set target=mention(notcolor=green,quantifier=all,shape=circle) color=blue; read: action=set color=blue target=mention(notcolor=blue,quantifier=all,shape=circle)<br>fo-0342: "move them all to the right side" gold: action=move target=mention(color=pink,quantifier=all) position=right; read: action=move direction=right position=right target=mention(quantifier=all)<br>fo-0346: "Make everything that isn't red gray" gold: action=set target=mention(notcolor=red,quantifier=all) color=gray; read: action=set color=gray target=mention(notcolor=gray,quantifier=all) |
| class | shape | 5 | fo-0087: "I want Wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake<br>fo-0237: "put 5 tiny gray sqaures between Mars and... hmm there's nothing after Mars yet. ok just put them to the right…" gold: action=create shape=square size=tiny color=gray count=5 position=rightof anchor=$new; read: action=create color=gray count=5 shape=rectangle size=tiny<br>fo-0329: "If not, add one near Customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=customs position=near shape=circle |
| class | color | 5 | fo-0223: "please add a red rectangle named Mum to the left of Dad. actualy make it pink" gold: action=create shape=rectangle color=pink name=mum position=leftof anchor=dad; read: action=create anchor=dad color=red name=mum position=leftof shape=rectangle<br>fo-0259: "add 8 tiny whte stars at the top" gold: action=create shape=star size=tiny color=white count=8 position=top; read: action=create count=8 position=top shape=star size=tiny<br>fo-0329: "If not, add one near Customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=customs position=near shape=circle |
| class | position | 4 | fo-0237: "put 5 tiny gray sqaures between Mars and... hmm there's nothing after Mars yet. ok just put them to the right…" gold: action=create shape=square size=tiny color=gray count=5 position=rightof anchor=$new; read: action=create color=gray count=5 shape=rectangle size=tiny<br>fo-0342: "and shove the newest square there too" gold: action=move target=mention(recency=newest,shape=square) position=right; read: action=move target=mention(recency=newest,shape=square)<br>fo-0539: "what is Bass next to" gold: ask=list position=near anchor=bass; read: ask=list |
| class | layout | 2 | fo-0025: "arange Raw, Staged, Curated and Mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart template=matrix<br>fo-0059: "Stack NameField, EmailField and SubmitBtn vertically" gold: action=arrange target=namefield,emailfield,submitbtn layout=column; read: action=arrange target=namefield,emailfield,submitbtn |
| class | scale (direction) | 1 | fo-0119: "Spinner smaler" gold: action=resize target=spinner; read: action=resize target=spinner |
| name | from | 13 | fo-0012: "hook the copies up to Alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0027: "Off goes to Booting and Booting goes to Ready, Ready goes to Shutdown" gold: action=connect from=off,booting,ready,shutdown; read: action=connect from=off,booting,ready |
| name | to | 11 | fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0032: "Iam gets a dotted line to Eks" gold: action=connect from=iam to=eks style=dotted arrow=none; read: action=connect arrow=none from=iam style=dotted to=$new<br>fo-0052: "Connect Scheduler to Worker and the copies" gold: action=connect from=scheduler to=worker,$new; read: action=connect from=scheduler to=worker |
| name | target | 8 | fo-0032: "shrink Ecr a bit" gold: action=resize target=ecr; read: action=resize target=$new<br>fo-0052: "arrange Worker and the copies in a column to the right of Scheduler" gold: action=arrange target=worker,$new layout=column; read: action=arrange layout=column<br>fo-0111: "What about Validate, what does it connect to" gold: ask=neighbors target=validate; read: ask=neighbors target=refund |
| name | anchor | 3 | fo-0032: "move Alb left of Eks" gold: action=move target=alb position=leftof anchor=eks; read: action=move anchor=$new position=leftof target=alb<br>fo-0222: "what about Zooplankton and Tuna" gold: ask=connected target=tuna anchor=zooplankton; read: ask=connected target=zooplankton<br>fo-0318: "Add a new rectangle called Blocked under Doing, no wait, to the right of Done" gold: action=create shape=rectangle name=blocked position=rightof anchor=done; read: action=create anchor=doing,done name=blocked position=rightof shape=rectangle |
| name | name | 1 | fo-0049: "Add a white square named Pc1 next to Router. Wait, call it Laptop, not Pc1" gold: action=create shape=square color=white name=laptop position=near anchor=router; read: action=create anchor=router color=white name=pc1 position=near shape=square |
| name | count | 1 | fo-0333: "Add six small pink circles around Floor... no, make it eight" gold: action=create shape=circle size=small color=pink count=8 position=near anchor=$new; read: action=create anchor=$new color=pink position=near shape=circle size=small |
| cut | (4 more keys; all in the JSON) | | |
| act | (3 more keys; all in the JSON) | | |

**fresh2_test / test, trigger unseen** (28)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 5 | fo-0104: "did I make Igw a circle" gold: ask=check target=igw shape=circle; read: not done (lost: no unit on the span)<br>fo-0441: "And red. No, black" gold: action=set target=end color=black; read: not done (merged into a unit with another request)<br>fo-0520: "Oven into Pizza" gold: action=connect from=oven to=pizza; read: not done (merged into a unit with another request) |
| 4 wrong act | model (act head) | 14 | fo-0184: "Plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done (read as command:connect)<br>fo-0184: "Plants belwo it" gold: requested: Plants belwo it; read: extra command:connect action=connect (read as command:connect where command:move is requested)<br>fo-0210: "Coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done (read as command:connect) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 6 | fo-0076: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers (a name written in another request or by a pronoun)<br>fo-0113: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple (a name written in another request or by a pronoun)<br>fo-0144: "I want Broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2 (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 2 | fo-0113: "I want the Grid1, Grid2, Grid3 and Grid4 to be in grid" gold: action=arrange target=grid1,grid2,grid3,grid4 layout=grid; read: action=arrange target=grid1,grid2,grid3,grid4<br>fo-0290: "then a red diamond named Sport below Me, no wait, make it orange" gold: action=create shape=diamond color=orange name=sport position=below anchor=me; read: action=create anchor=me color=red name=sport position=below shape=diamond |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | fo-0107: "Thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 2 | fo-0520: "Oven into Pizza" gold: action=connect from=oven to=pizza; read: not done<br>fo-0577: "Pump into Filter. Filter into Uv. Uv into Waterfall. Waterfall into Pond" gold: action=connect from=pump,filter,uv,waterfall,pond; read: action=connect from=pump,filter,uv |
| cut | (question:check) | 1 | fo-0104: "did I make Igw a circle" gold: ask=check target=igw shape=circle; read: not done |
| cut | (command:set) | 1 | fo-0441: "And red. No, black" gold: action=set target=end color=black; read: not done |
| cut | (command:move) | 1 | fo-0534: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move |
| act | question:degree read as question:count | 4 | fo-0335: "How many shapes are connected to Score" gold: ask=degree target=score; read: not done<br>fo-0335: "How many shapes are connected to Score" gold: requested: How many shapes are connected to Score; read: extra question:count ask=count linked=score<br>fo-0462: "How many shapes are connected to Coding" gold: ask=degree target=coding; read: not done |
| act | question:extreme read as question:check | 4 | fo-0554: "Is Teardown the last one on the right" gold: ask=extreme superlative=rightmost; read: not done<br>fo-0554: "Is Teardown the last one on the right" gold: requested: Is Teardown the last one on the right; read: extra question:check ask=check position=right<br>fo-0594: "Is Scene4 the last one at the bottom" gold: ask=extreme superlative=bottommost; read: not done |
| act | command:move read as command:connect | 2 | fo-0184: "Plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done<br>fo-0184: "Plants belwo it" gold: requested: Plants belwo it; read: extra command:connect action=connect |
| act | command:rename read as command:connect | 2 | fo-0210: "Coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done<br>fo-0210: "Coach2 to Seniors" gold: requested: Coach2 to Seniors; read: extra command:connect action=connect from=coach2 to=seniors |
| act | rule: read as command:create | 2 | fo-0446: "And new circles gray" gold: shape=circle color=gray; read: not done<br>fo-0446: "new circles gray" gold: requested: And new circles gray; read: extra command:create action=create color=gray shape=circle |
| ref | anchor | 4 | fo-0144: "I want Broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2<br>fo-0184: "Genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: action=move anchor=cells position=rightof target=genes<br>fo-0184: "Body to the left of it" gold: action=move target=body position=leftof anchor=brain; read: action=move anchor=genes position=leftof target=body |
| ref | target | 2 | fo-0076: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers<br>fo-0113: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple |
| class | layout | 1 | fo-0113: "I want the Grid1, Grid2, Grid3 and Grid4 to be in grid" gold: action=arrange target=grid1,grid2,grid3,grid4 layout=grid; read: action=arrange target=grid1,grid2,grid3,grid4 |
| class | color | 1 | fo-0290: "then a red diamond named Sport below Me, no wait, make it orange" gold: action=create shape=diamond color=orange name=sport position=below anchor=me; read: action=create anchor=me color=red name=sport position=below shape=diamond |
| name | target | 1 | fo-0107: "Thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |

**fresh2_test / test, trigger no request** (65)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 28 | fo-0027: "Ready goes to Shutdown" gold: -; read: extra command:connect action=connect from=ready to=shutdown (partial overlap with a requested action: 32% of it)<br>fo-0032: "Ecr" gold: -; read: extra command:create action=create name=ecr (partial overlap with a requested action: 13% of it)<br>fo-0032: "Eks" gold: -; read: extra command:create action=create name=eks (partial overlap with a requested action: 13% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 37 | fo-0002: "all" gold: -; read: extra command:disconnect action=disconnect (no requested action on this text)<br>fo-0013: "moment" gold: -; read: extra command:create action=create name=moment (no requested action on this text)<br>fo-0031: "Can you" gold: -; read: extra question:help ask=help aspect=can (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 16 | fo-0032: "Ecr" gold: -; read: extra command:create action=create name=ecr<br>fo-0032: "Eks" gold: -; read: extra command:create action=create name=eks<br>fo-0043: "put the Price" gold: -; read: extra command:create action=create |
| cut | command:connect | 5 | fo-0027: "Ready goes to Shutdown" gold: -; read: extra command:connect action=connect from=ready to=shutdown<br>fo-0147: "Ended return to Idle" gold: -; read: extra command:connect action=connect from=ended to=idle<br>fo-0467: "connect Entrance to Stage and Entrance to Bar" gold: -; read: extra command:connect action=connect from=entrance to=stage,bar |
| cut | command:disconnect | 2 | fo-0049: "not" gold: -; read: extra command:disconnect action=disconnect from=$new to=$new<br>fo-0277: "the arrows:" gold: -; read: extra command:disconnect action=disconnect from=wolf |
| cut | command:arrange | 1 | fo-0118: "Arrange everything in a row" gold: -; read: extra command:arrange action=arrange layout=row |
| cut | question:check | 1 | fo-0147: "is" gold: -; read: extra question:check ask=check target=connected |
| cut | question:help | 1 | fo-0161: "can" gold: -; read: extra question:help ask=help aspect=can |
| cut | rule: | 1 | fo-0264: "From now on," gold: -; read: extra rule:  |
| cut | command:rename | 1 | fo-0524: "There's only Sunflower on the page right now. How big is it? I'd like it large" gold: -; read: extra command:rename action=rename target=sunflower |
| spurious | command:create | 10 | fo-0013: "moment" gold: -; read: extra command:create action=create name=moment<br>fo-0093: "Amber" gold: -; read: extra command:create action=create name=amber<br>fo-0096: "rectangles" gold: -; read: extra command:create action=create shape=rectangle |
| spurious | command:set | 9 | fo-0093: "Red" gold: -; read: extra command:set action=set color=red target=$new<br>fo-0096: "blue" gold: -; read: extra command:set action=set color=blue target=$new<br>fo-0135: "Error should be the only one" gold: -; read: extra command:set action=set target=error |
| spurious | command:disconnect | 4 | fo-0002: "all" gold: -; read: extra command:disconnect action=disconnect<br>fo-0203: "not" gold: -; read: extra command:disconnect action=disconnect<br>fo-0246: "the arrow from Cow to Human," gold: -; read: extra command:disconnect action=disconnect from=cow to=human |
| spurious | command:move | 4 | fo-0168: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance<br>fo-0424: "the Paywall right after Trial" gold: -; read: extra command:move action=move anchor=trial position=rightof target=paywall |
| spurious | question:help | 2 | fo-0031: "Can you" gold: -; read: extra question:help ask=help aspect=can<br>fo-0495: "how do I add stuff" gold: -; read: extra question:help ask=help aspect=how |
| spurious | command:label | 2 | fo-0322: "a" gold: -; read: extra command:label action=label target=legal<br>fo-0470: "encodes Protein" gold: -; read: extra command:label action=label target=protein |
| spurious | fact: | 1 | fo-0093: "The order is Green" gold: -; read: extra fact: target=order |
| spurious | command:undo | 1 | fo-0118: "Undo that" gold: -; read: extra command:undo action=undo |
| spurious | (4 more keys; all in the JSON) | | |

### fresh2_test / test at the cost-10 threshold (0.8758)

Executed: right 676, wrong 4, extras 4. Structural holds 14 ({"blocked":10,"dependency":4}; 2 of them would have been right). Confidence holds 664: right 419, wrong or extra 245. Unread 32.

**Executed wrong, by first cause** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 1 | fo-0147: "Connected go to Ended" gold: action=connect from=connected,ended,idle; read: command:connect action=connect from=connected to=ended (confidence 0.893; wrong) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 3 | fo-0118: "Undo that" gold: -; read: extra command:undo action=undo (confidence 0.967; extra)<br>fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body (confidence 0.969; extra)<br>fo-0277: "Wolf just turned into a star" gold: -; read: extra command:set action=set shape=star target=wolf (confidence 0.928; extra) |
| 4 wrong act | model (act head) | 1 | fo-0210: "Coach2 to Seniors" gold: -; read: extra command:connect action=connect from=coach2 to=seniors (confidence 0.968; extra) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 1 | fo-0066: "put it near NewService" gold: action=move target=flags position=near anchor=newservice; read: command:move action=move anchor=newservice position=near target=newservice (confidence 0.894; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 2 | fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: command:connect action=connect from=laptop to=nas (confidence 0.945; wrong)<br>fo-0487: "Draw dashed arrows from Output and Input to Loss" gold: action=connect from=output,input to=loss style=dashed; read: command:connect action=connect from=output style=dashed to=loss (confidence 0.889; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 1 | fo-0147: "Connected go to Ended" gold: action=connect from=connected,ended,idle; read: command:connect action=connect from=connected to=ended |
| spurious | command:set | 2 | fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body<br>fo-0277: "Wolf just turned into a star" gold: -; read: extra command:set action=set shape=star target=wolf |
| spurious | command:undo | 1 | fo-0118: "Undo that" gold: -; read: extra command:undo action=undo |
| act | command:rename read as command:connect | 1 | fo-0210: "Coach2 to Seniors" gold: -; read: extra command:connect action=connect from=coach2 to=seniors |
| ref | target | 1 | fo-0066: "put it near NewService" gold: action=move target=flags position=near anchor=newservice; read: command:move action=move anchor=newservice position=near target=newservice |
| name | from | 2 | fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: command:connect action=connect from=laptop to=nas<br>fo-0487: "Draw dashed arrows from Output and Input to Loss" gold: action=connect from=output,input to=loss style=dashed; read: command:connect action=connect from=output style=dashed to=loss |

**Right but held by confidence** (419)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:connect | 125 | fo-0003: "Paused should go back to Running" gold: action=connect from=paused to=running; read: command:connect action=connect from=paused to=running<br>fo-0004: "connect Ingest Parse Clean and Load one after the other" gold: action=connect from=ingest,parse,clean,load; read: command:connect action=connect from=ingest,parse,clean,load<br>fo-0004: "hook Load up to Warehouse with a normal arrow" gold: action=connect from=load to=warehouse; read: command:connect action=connect from=load to=warehouse |
| held | command:create | 61 | fo-0004: "add a small red diamond called Dlq below Clean" gold: action=create shape=diamond color=red size=small name=dlq position=below anchor=clean; read: command:create action=create anchor=clean color=red name=dlq position=below shape=diamond size=small<br>fo-0006: "create one small orange square with name Bastion near of SubnetA" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: command:create action=create anchor=subneta color=orange name=bastion position=near shape=square size=small<br>fo-0018: "add uh three small yellow circles under Lambda" gold: action=create shape=circle color=yellow size=small count=3 position=below anchor=lambda; read: command:create action=create anchor=lambda color=yellow count=3 position=below shape=circle size=small |
| held | command:set | 50 | fo-0004: "make it a navy ellipse" gold: action=set target=warehouse color=navy shape=ellipse; read: command:set action=set color=navy shape=ellipse target=warehouse<br>fo-0010: "Footer: gray" gold: action=set target=footer color=gray; read: command:set action=set color=gray target=footer<br>fo-0020: "Make Extract, Transform and Load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: command:set action=set color=blue shape=rectangle size=medium target=extract,transform,load |
| held | command:arrange | 25 | fo-0004: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all,shape=rectangle)<br>fo-0010: "Card1, Card2 and Card3 should sit in a row" gold: action=arrange target=card1,card2,card3 layout=row; read: command:arrange action=arrange layout=row target=card1,card2,card3<br>fo-0031: "put them in a row" gold: action=arrange target=$new layout=row; read: command:arrange action=arrange layout=row target=$new |
| held | question:count | 23 | fo-0035: "How many connections in total now" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>fo-0097: "how many shapes are blue now" gold: ask=count color=blue; read: question:count ask=count color=blue<br>fo-0104: "How many rectangles are there" gold: ask=count shape=rectangle; read: question:count ask=count shape=rectangle |
| held | command:move | 22 | fo-0010: "Logo goes to the top left" gold: action=move target=logo position=topleft; read: command:move action=move position=topleft target=logo<br>fo-0020: "in the bottom right" gold: action=move target=audit position=bottomright; read: command:move action=move position=bottomright target=audit<br>fo-0048: "Menu to the left edge" gold: action=move target=menu position=left; read: command:move action=move position=left target=menu |
| held | fact: | 15 | fo-0040: "Redis is red" gold: target=redis color=red; read: fact: color=red target=redis<br>fo-0104: "Ec2 and Rds sit below PrivateSubnet" gold: target=ec2,rds position=below anchor=privatesubnet; read: fact: anchor=privatesubnet position=below target=ec2,rds<br>fo-0125: "Body is huge" gold: target=body size=huge; read: fact: size=huge target=body |
| held | command:resize | 13 | fo-0005: "shrink Sidebar a bit" gold: action=resize target=sidebar; read: command:resize action=resize target=sidebar<br>fo-0033: "I want the Done more big" gold: action=resize target=done; read: command:resize action=resize target=done<br>fo-0074: "Make Replica smaller" gold: action=resize target=replica; read: command:resize action=resize target=replica |
| held | (23 more keys; all in the JSON) | | |

**Structural holds** (14)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 9 | fo-0013: "Published goes to Archived later on" gold: action=connect from=published to=archived; read: command:connect action=connect from=published to=archived<br>fo-0161: "can" gold: -; read: question:help ask=help aspect=can<br>fo-0165: "make an arrow from Sea to Cloud and label it... hmm no, just the arrow" gold: action=connect from=sea to=cloud; read: command:connect action=connect from=sea to=cloud |
| blocked | unresolved-reference | 1 | fo-0052: "arrange Worker and the copies in a column to the right of Scheduler" gold: action=arrange target=worker,$new layout=column; read: command:arrange action=arrange layout=column |

## short3_test / test (340 messages, 432 requested: right 252, wrong 132, not done 48, extras 43; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 23 |
| actions | 70 |
| values/roles | 130 |
| calibration | 146 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 432); ok (ungated: right + would-be right of structural holds = right of every request executed: 252); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 132); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 43); ok (ungated: unread = requested - paired: 48); ok (ungated right equals the score file: 252); ok (ungated wrong equals the score file: 126); ok (ungated extras equals the score file: 42); ok (ungated unread equals the score file: 48); ok (ungated structural holds equal the score file: 7); ok (every produced request is executed, structurally held or (gated) confidence-held: 427); ok (gated: executed wrong equals the score file: 6); ok (gated: executed extras equals the score file: 2); ok (gated: structural holds equal the score file: 7); ok (gated: confidence holds equal the score file: 298); ok (gated: right executed equals the score file: 114); ok (gated: unread equals the score file: 48); ok (gated: held right + held wrong or extra = confidence holds: 298)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 15 | 0 | 0 | 8 | 23 |
| 4 wrong act | model (act head) | 48 | 22 | 0 | 0 | 70 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 9 | 0 | 0 | 0 | 9 |
| 6 wrong or missing class value | model (class head) | 46 | 9 | 0 | 0 | 55 |
| 7 wrong words tagged for a name / text key | model (token head) | 54 | 12 | 0 | 0 | 66 |

**short3_test / test, trigger seen** (172)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 15 | s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done (only a part of the span is a unit)<br>s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: action=set color=gray (merged: the unit holds 2 requests)<br>s3-0122: "except Done which is red" gold: action=set target=done color=red; read: not done (merged or split: a unit of the same act on the span was paired to another request) |
| 4 wrong act | model (act head) | 48 | s3-0087: "Begin instead of Start" gold: action=rename target=start name=begin; read: not done (read as command:reverse)<br>s3-0087: "Begin instead of Start" gold: requested: Begin instead of Start; read: extra command:reverse action=reverse target=begin,start (read as command:reverse where command:rename is requested)<br>s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: not done (read as command:create) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 9 | s3-0193: "also bigger" gold: action=resize target=check; read: action=resize (a name written in another request or by a pronoun)<br>s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done (a name written in another request or by a pronoun)<br>s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 46 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move<br>s3-0005: "dotted line process to done" gold: action=connect from=process to=done style=dotted arrow=none; read: action=connect arrow=none from=mention() style=dotted |
| 7 wrong words tagged for a name / text key | model (token head) | 54 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=process<br>s3-0033: "reverse direction on check→done" gold: action=reverse from=check to=done; read: action=reverse target=mention(quantifier=all) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 4 | s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: action=set color=gray<br>s3-0122: "except Done which is red" gold: action=set target=done color=red; read: not done<br>s3-0264: "start gold" gold: action=set target=start color=gold; read: not done |
| cut | (command:create) | 3 | s3-0146: "create Api" gold: action=create shape=square name=api; read: not done<br>s3-0146: "Db squares" gold: action=create shape=square name=db; read: not done<br>s3-0252: "add Sub1" gold: action=create name=sub1 position=below anchor=process; read: not done |
| cut | (command:straighten) | 1 | s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done |
| cut | (command:toFront) | 1 | s3-0131: "done on top" gold: action=tofront target=done; read: not done |
| cut | (command:undo) | 1 | s3-0137: "undo" gold: action=undo; read: not done |
| cut | (command:connect) | 1 | s3-0200: "connect check to start" gold: action=connect from=check to=start; read: not done |
| cut | (command:rename) | 1 | s3-0305: "named Gate" gold: action=rename target=check name=gate; read: not done |
| cut | (question:property) | 1 | s3-0333: "where is it" gold: ask=property target=intake property=position; read: not done |
| act | command:arrange read as command:create | 6 | s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: not done<br>s3-0093: "make a timeline with Start Process Check Done" gold: requested: make a timeline with Start Process Check Done; read: extra command:create action=create items=start process check,done template=timeline<br>s3-0140: "make the existing flow into process steps with chevrons" gold: action=arrange template=process; read: not done |
| act | command:rename read as command:reverse | 2 | s3-0087: "Begin instead of Start" gold: action=rename target=start name=begin; read: not done<br>s3-0087: "Begin instead of Start" gold: requested: Begin instead of Start; read: extra command:reverse action=reverse target=begin,start |
| act | command:ungroup read as command:delete | 2 | s3-0095: "take Start out of the group" gold: action=ungroup target=start; read: not done<br>s3-0095: "take Start out of the group" gold: requested: take Start out of the group; read: extra command:delete action=delete target=start |
| act | command:group read as command:create | 2 | s3-0103: "group check and done" gold: action=group target=check,done; read: not done<br>s3-0103: "group check" gold: requested: group check and done; read: extra command:create action=create |
| act | command:delete read as command:create | 2 | s3-0113: "bin done" gold: action=delete target=done; read: not done<br>s3-0113: "bin done" gold: requested: bin done; read: extra command:create action=create label=done name=bin |
| act | command:resize read as command:create | 2 | s3-0131: "check smaller" gold: action=resize target=check; read: not done<br>s3-0131: "done on top, check smaller" gold: requested: check smaller; read: extra command:create action=create |
| act | command:set read as question:check | 2 | s3-0156: "check purple" gold: action=set target=check color=purple; read: not done<br>s3-0156: "check purple" gold: requested: check purple; read: extra question:check ask=check color=purple |
| act | command:arrange read as question:help | 2 | s3-0215: "show the four shapes as a timeline" gold: action=arrange template=timeline target=mention(quantifier=all); read: not done<br>s3-0215: "show the four shapes as a timeline" gold: requested: show the four shapes as a timeline; read: extra question:help ask=help |
| ref | target | 4 | s3-0193: "also bigger" gold: action=resize target=check; read: action=resize<br>s3-0266: "make it a star" gold: action=set target=end shape=star; read: action=set shape=star target=done<br>s3-0303: "align all three" gold: action=align target=start,check,done; read: action=align |
| ref | from | 4 | s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done<br>s3-0253: "conect procss w/ done" gold: action=connect from=process to=done; read: action=connect<br>s3-0377: "blue" gold: action=set from=start to=process color=blue; read: action=set color=blue |
| ref | to | 3 | s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check<br>s3-0377: "blue" gold: action=set from=start to=process color=blue; read: action=set color=blue<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip |
| class | layout | 10 | s3-0098: "four squares stacked on the left" gold: action=create count=4 shape=square layout=column position=left; read: action=create count=4 layout=row position=left shape=square<br>s3-0166: "add a 3 by 3 grid of small squares" gold: action=create count=9 shape=square size=small layout=grid; read: action=create shape=square<br>s3-0168: "draw 4 green circles in a line along the top" gold: action=create count=4 shape=circle color=green layout=row position=top; read: action=create color=green count=4 position=top shape=circle |
| class | target | 8 | s3-0044: "the diagram looks messy can you fix it" gold: action=improve target=mention(quantifier=all); read: action=improve target=mention()<br>s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0159: "kill the circle I just made" gold: action=delete target=mention(recency=newest,shape=circle); read: action=delete target=mention(shape=circle) |
| class | template | 7 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: action=create color=blue<br>s3-0240: "pyramid with 3 levels" gold: action=create template=pyramid count=3; read: action=create count=3 layout=row |
| class | position | 6 | s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5<br>s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: action=move target=done |
| class | shape | 4 | s3-0022: "square top left" gold: action=create shape=square position=topleft; read: action=create position=topleft<br>s3-0163: "Draw 6 small stars in a circle." gold: action=create count=6 shape=star size=small layout=circle; read: action=create count=6 layout=circle shape=circle size=small<br>s3-0169: "add a gold triangel at 200 300" gold: action=create shape=triangle color=gold at=200,300; read: action=create at=200,300 color=gold shape=diamond |
| class | direction | 3 | s3-0179: "check up 40px pls" gold: action=move target=check direction=up distance=40; read: action=move distance=40<br>s3-0357: "Start right by 50" gold: action=move target=start direction=right distance=50; read: action=move distance=50 target=start<br>s3-0409: "move the title to the left" gold: action=move direction=left; read: action=move position=left target=title |
| class | arrow | 2 | s3-0330: "connect done to start, two-way, red" gold: action=connect from=done to=start arrow=both color=red; read: action=connect color=red<br>s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: action=connect color=gray from=process to=done |
| class | topic | 2 | s3-0466: "can shapes have outlines" gold: ask=help topic=outline aspect=can; read: ask=help aspect=can<br>s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: ask=help aspect=how topic=text |
| name | target | 24 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0057: "red for check" gold: action=set target=check color=red; read: action=set color=red<br>s3-0076: "recolor start to navy" gold: action=set target=start color=navy; read: action=set color=navy |
| name | from | 18 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=process<br>s3-0033: "reverse direction on check→done" gold: action=reverse from=check to=done; read: action=reverse target=mention(quantifier=all)<br>s3-0123: "link check and start" gold: action=connect from=check to=start; read: action=connect |
| name | to | 16 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=process<br>s3-0033: "reverse direction on check→done" gold: action=reverse from=check to=done; read: action=reverse target=mention(quantifier=all)<br>s3-0123: "link check and start" gold: action=connect from=check to=start; read: action=connect |
| name | name | 4 | s3-0109: "add circle X at 100,100" gold: action=create shape=circle name=x at=100,100; read: action=create at=100,100 shape=circle<br>s3-0109: "circle Y at 700,100" gold: action=create shape=circle name=y at=700,100; read: action=create at=700,100 shape=circle<br>s3-0194: "can you call Done "Finish" instead" gold: action=rename target=done name=finish; read: action=rename target=done |
| name | about | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: ask=help aspect=can topic=text<br>s3-0236: "what does SOP Lang mean" gold: ask=help about=sop lang; read: ask=help |
| name | scale | 1 | s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |
| name | count | 1 | s3-0188: "undo the last 2 changes" gold: action=undo count=2; read: action=undo |
| name | items | 1 | s3-0263: "draw a venn with two circles A and B" gold: action=create template=venn items=a,b; read: action=create count=2 name=a shape=circle template=venn |
| cut | (2 more keys; all in the JSON) | | |
| act | (14 more keys; all in the JSON) | | |
| class | (8 more keys; all in the JSON) | | |
| name | (1 more keys; all in the JSON) | | |

**short3_test / test, trigger unseen** (43)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 22 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done (read as command:move)<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:move action=move (read as command:move where question:check is requested)<br>s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: not done (read as command:create) |
| 6 wrong or missing class value | model (class head) | 9 | s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create<br>s3-0155: "which colors can i use" gold: ask=help topic=color aspect=values; read: ask=help aspect=values topic=size<br>s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black target=outline |
| 7 wrong words tagged for a name / text key | model (token head) | 12 | s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 items=core template=hub<br>s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=process<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label label=end |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:set read as command:create | 4 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: not done<br>s3-0079: "hexagon for start" gold: requested: hexagon for start; read: extra command:create action=create<br>s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done |
| act | command:set read as command:label | 4 | s3-0181: "no border on start" gold: action=set target=start outline=none; read: not done<br>s3-0181: "no border on start" gold: requested: no border on start; read: extra command:label action=label label= target=start<br>s3-0322: "take the border off process" gold: action=set target=process outline=none; read: not done |
| act | question:check read as command:move | 2 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:move action=move |
| act | command:set read as question:cycle | 2 | s3-0193: "check pink" gold: action=set target=check color=pink; read: not done<br>s3-0193: "check" gold: requested: check pink; read: extra question:cycle ask=cycle |
| act | command:align read as command:arrange | 2 | s3-0203: "put start process and check on one line" gold: action=align target=start,process,check; read: not done<br>s3-0203: "put start process and check on one line" gold: requested: put start process and check on one line; read: extra command:arrange action=arrange target=process,check |
| act | command:resize read as question:property | 2 | s3-0365: "double check's size" gold: action=resize target=check; read: not done<br>s3-0365: "double check's size" gold: requested: double check's size; read: extra question:property ask=property property=size |
| act | question:groupOf read as question:neighbors | 2 | s3-0493: "start belongs to which group" gold: ask=groupof target=start; read: not done<br>s3-0493: "start belongs to which group" gold: requested: start belongs to which group; read: extra question:neighbors ask=neighbors target=start |
| act | command:move read as command:toFront | 2 | s3-0516: "start should be on top" gold: action=move target=start position=top; read: not done<br>s3-0516: "start should be on top" gold: requested: start should be on top; read: extra command:toFront action=tofront target=start |
| class | topic | 3 | s3-0155: "which colors can i use" gold: ask=help topic=color aspect=values; read: ask=help aspect=values topic=size<br>s3-0216: "whats the difference between label and name" gold: ask=help topic=label; read: ask=help<br>s3-0294: "what can you do with arrows?" gold: ask=help topic=connections; read: ask=help |
| class | outline | 3 | s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black target=outline<br>s3-0170: "outline done black" gold: action=set target=done outline=black; read: action=set color=black target=outline<br>s3-0354: "make the outline of check orange" gold: action=set target=check outline=orange; read: action=set color=orange target=check |
| class | template | 1 | s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create |
| class | position | 1 | s3-0494: "all circles over to the left" gold: action=move target=mention(quantifier=all,shape=circle) position=left; read: action=move direction=left target=mention(quantifier=all,shape=circle) |
| class | layout | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange |
| class | direction | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange |
| name | target | 7 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=process<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label label=end<br>s3-0204: "process medium" gold: action=set target=process size=medium; read: action=set size=medium |
| name | label | 2 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=process<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | from | 2 | s3-0348: "check -> done should be labeled yes" gold: action=label from=check to=done label=yes; read: action=label label=yes to=done<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | title | 1 | s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 items=core template=hub |
| name | to | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | count | 1 | s3-0396: "twelve circles in a circle" gold: action=create count=12 shape=circle layout=circle; read: action=create layout=circle shape=circle |
| name | linked | 1 | s3-0422: "Done and Start are connected" gold: target=done linked=start; read: target=done |
| act | (1 more keys; all in the JSON) | | |

**short3_test / test, trigger no request** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 8 | s3-0119: "tidy the arrows" gold: -; read: extra command:arrange action=arrange (partial overlap with a requested action: 43% of it)<br>s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (partial overlap with a requested action: 40% of it)<br>s3-0160: "Could you" gold: -; read: extra command:create action=create (partial overlap with a requested action: 16% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 4 | s3-0160: "Could you" gold: -; read: extra command:create action=create<br>s3-0311: "Code" gold: -; read: extra command:create action=create name=code<br>s3-0311: "Data" gold: -; read: extra command:create action=create name=data |
| cut | command:arrange | 2 | s3-0119: "tidy the arrows" gold: -; read: extra command:arrange action=arrange<br>s3-0423: "done horizontally" gold: -; read: extra command:arrange action=arrange axis=horizontal |
| cut | command:set | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db |
| cut | command:respace | 1 | s3-0339: "make the spacing" gold: -; read: extra command:respace action=respace comparison=bigger target=mention(quantifier=all) |

### short3_test / test at the cost-10 threshold (0.8758)

Executed: right 114, wrong 6, extras 2. Structural holds 7 ({"blocked":6,"dependency":1}; 0 of them would have been right). Confidence holds 298: right 138, wrong or extra 160. Unread 48.

**Executed wrong, by first cause** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (confidence 0.892; extra) |
| 4 wrong act | model (act head) | 1 | s3-0095: "take Start out of the group" gold: -; read: extra command:delete action=delete target=start (confidence 0.911; extra) |
| 6 wrong or missing class value | model (class head) | 2 | s3-0169: "add a gold triangel at 200 300" gold: action=create shape=triangle color=gold at=200,300; read: command:create action=create at=200,300 color=gold shape=diamond (confidence 0.956; wrong)<br>s3-0268: "add a row of 5 orange rectangles along the bottom edge" gold: action=create count=5 shape=rectangle color=orange layout=row position=bottom; read: command:create action=create color=orange count=5 position=bottom shape=rectangle (confidence 0.956; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 4 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can topic=text (confidence 0.994; wrong)<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db (confidence 0.972; wrong)<br>s3-0188: "undo the last 2 changes" gold: action=undo count=2; read: command:undo action=undo (confidence 0.886; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:set | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db |
| act | command:ungroup read as command:delete | 1 | s3-0095: "take Start out of the group" gold: -; read: extra command:delete action=delete target=start |
| class | shape | 1 | s3-0169: "add a gold triangel at 200 300" gold: action=create shape=triangle color=gold at=200,300; read: command:create action=create at=200,300 color=gold shape=diamond |
| class | layout | 1 | s3-0268: "add a row of 5 orange rectangles along the bottom edge" gold: action=create count=5 shape=rectangle color=orange layout=row position=bottom; read: command:create action=create color=orange count=5 position=bottom shape=rectangle |
| name | to | 2 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db<br>s3-0261: "connect Check to Fail with label "no"" gold: action=connect from=check to=$new label=no; read: command:connect action=connect from=check label=no to=fail |
| name | about | 1 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can topic=text |
| name | from | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |
| name | count | 1 | s3-0188: "undo the last 2 changes" gold: action=undo count=2; read: command:undo action=undo |

**Right but held by confidence** (138)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 19 | s3-0018: "process steps: Plan, Build, Test, Ship" gold: action=create template=process items=plan,build,test,ship; read: command:create action=create items=plan,build,test,ship template=process<br>s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: command:create action=create count=4 template=steps<br>s3-0025: "draw circle Hub center" gold: action=create shape=circle name=hub position=center; read: command:create action=create name=hub position=center shape=circle |
| held | command:set | 12 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: command:set action=set outline=white target=mention(quantifier=all,shape=circle)<br>s3-0225: "make all shapes tiny" gold: action=set target=mention(quantifier=all) size=tiny; read: command:set action=set size=tiny target=mention(quantifier=all)<br>s3-0265: "start → hexagon" gold: action=set target=start shape=hexagon; read: command:set action=set shape=hexagon target=start |
| held | command:resize | 11 | s3-0082: "make check smaller" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0257: "Process smaller" gold: action=resize target=process; read: command:resize action=resize target=process<br>s3-0297: "smaller" gold: action=resize; read: command:resize action=resize |
| held | command:move | 10 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: command:move action=move position=center target=check<br>s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: command:move action=move anchor=process position=below target=check<br>s3-0082: "move it right" gold: action=move target=check direction=right; read: command:move action=move direction=right target=check |
| held | command:arrange | 10 | s3-0017: "arrange it like an org chart" gold: action=arrange layout=tree; read: command:arrange action=arrange layout=tree<br>s3-0040: "radial layout around Check" gold: action=arrange layout=radial anchor=check; read: command:arrange action=arrange anchor=check layout=radial<br>s3-0136: "put all shapes in a row" gold: action=arrange target=mention(quantifier=all) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all) |
| held | command:connect | 8 | s3-0025: "connect Hub to Start Process Check Done" gold: action=connect from=$new to=start,process,check,done; read: command:connect action=connect from=$new to=start,process,check,done<br>s3-0037: "link Warn to Done dashed" gold: action=connect from=$new to=done style=dashed; read: command:connect action=connect from=$new style=dashed to=done<br>s3-0109: "join them" gold: action=connect from=$new to=$new; read: command:connect action=connect from=$new to=$new |
| held | command:delete | 7 | s3-0013: "remove process" gold: action=delete target=process; read: command:delete action=delete target=process<br>s3-0086: "get rid of the yellow diamond" gold: action=delete target=mention(color=yellow,shape=diamond); read: command:delete action=delete target=mention(color=yellow,shape=diamond)<br>s3-0241: "delte start" gold: action=delete target=start; read: command:delete action=delete target=start |
| held | command:label | 6 | s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: command:label action=label from=check label=approved to=done<br>s3-0348: "check -> process should be labeled no" gold: action=label from=check to=process label=no; read: command:label action=label from=check label=no to=process<br>s3-0371: "label the yellow diamond "decision"" gold: action=label target=mention(color=yellow,shape=diamond) label=decision; read: command:label action=label label=decision target=mention(color=yellow,shape=diamond) |
| held | (23 more keys; all in the JSON) | | |

**Structural holds** (7)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 4 | s3-0063: "swot matrix" gold: action=create template=matrix; read: command:create action=create<br>s3-0262: "text on the check to done arrow" gold: -; read: command:connect action=connect<br>s3-0263: "draw a venn with two circles A and B" gold: action=create template=venn items=a,b; read: command:create action=create count=2 name=a shape=circle template=venn |
| blocked | unresolved-reference | 2 | s3-0340: "group start and process, call it Intake," gold: action=group target=start,process name=intake; read: command:group action=group name=intake<br>s3-0350: "trade places start, done" gold: action=swap target=done,start; read: command:swap action=swap |

## nl_a_development / development (300 messages, 392 requested: right 47, wrong 231, not done 114, extras 207; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 230 |
| actions | 134 |
| values/roles | 188 |
| calibration | 37 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 392); ok (ungated: right + would-be right of structural holds = right of every request executed: 47); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 231); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 207); ok (ungated: unread = requested - paired: 114); ok (ungated right equals the score file: 46); ok (ungated wrong equals the score file: 188); ok (ungated extras equals the score file: 185); ok (ungated unread equals the score file: 114); ok (ungated structural holds equal the score file: 66); ok (every produced request is executed, structurally held or (gated) confidence-held: 485); ok (gated: executed wrong equals the score file: 2); ok (gated: executed extras equals the score file: 2); ok (gated: structural holds equal the score file: 66); ok (gated: confidence holds equal the score file: 402); ok (gated: right executed equals the score file: 13); ok (gated: unread equals the score file: 114); ok (gated: held right + held wrong or extra = confidence holds: 402)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 42 | 54 | 0 | 51 | 147 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 83 | 83 |
| 4 wrong act | model (act head) | 71 | 63 | 0 | 0 | 134 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 65 | 34 | 0 | 0 | 99 |
| 6 wrong or missing class value | model (class head) | 29 | 21 | 0 | 0 | 50 |
| 7 wrong words tagged for a name / text key | model (token head) | 25 | 14 | 0 | 0 | 39 |

**nl_a_development / development, trigger seen** (232)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 42 | nl-01-005: "conect it" gold: action=connect from=$new to=switch; read: not done (merged into a unit with another request)<br>nl-01-014: "Each app can reach the same database. The database should be lower down, visibly inside data" gold: action=create name=database position=inside anchor=data; read: action=create anchor=$new position=below (the unit covers 21% of the span)<br>nl-01-019: "After the checks we need a decision: approved for customers?" gold: action=create label=approved for customers? position=rightof anchor=tests; read: action=create label=approved (the unit covers 37% of the span) |
| 4 wrong act | model (act head) | 71 | nl-01-020: "Put the box back between Build and Deploy" gold: requested: Put the box back between Build and Deploy; read: extra command:move action=move anchor=build,deploy position=between target=mention(shape=rectangle) (read as command:move where command:create is requested)<br>nl-01-026: "Start with Idle" gold: action=create name=idle; read: not done (read as command:connect)<br>nl-01-026: "Start with Idle and Running" gold: requested: Start with Idle; read: extra command:connect action=connect (read as command:connect where command:create is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 65 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move (a name or description the message does not write)<br>nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: action=create anchor=commit position=near (a name written in another request or by a pronoun)<br>nl-01-029: "both active states to be orange" gold: action=set target=running,paused color=orange; read: action=set color=orange target=$new (a name or description the message does not write) |
| 6 wrong or missing class value | model (class head) | 29 | nl-01-038: "underneath uh a search bar full width" gold: action=create label=search bar position=below anchor=$new; read: action=create label=search bar<br>nl-01-045: "add call DBA before that restart box" gold: action=create label=call dba position=above anchor=restart; read: action=create name=dba shape=rectangle<br>nl-02-006: "put interpreter needed? before consent" gold: action=create label=interpreter needed? position=leftof anchor=consent; read: action=create label=interpreter needed? |
| 7 wrong words tagged for a name / text key | model (token head) | 25 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: action=create anchor=switch label=reception pc position=leftof<br>nl-01-014: "then go to two identical app instances" gold: action=create label=app instances count=2; read: action=create count=2<br>nl-01-014: "Add object storage off to one side" gold: action=create label=object storage; read: action=create label=storage |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 17 | nl-01-014: "Each app can reach the same database. The database should be lower down, visibly inside data" gold: action=create name=database position=inside anchor=data; read: action=create anchor=$new position=below<br>nl-01-019: "After the checks we need a decision: approved for customers?" gold: action=create label=approved for customers? position=rightof anchor=tests; read: action=create label=approved<br>nl-01-020: "Put the box back between Build and Deploy" gold: action=create name=tests position=between anchor=build,deploy; read: action=create shape=rectangle |
| cut | (command:connect) | 7 | nl-01-005: "conect it" gold: action=connect from=$new to=switch; read: not done<br>nl-01-030: "After three failures we give up and go to Disconnected. Put the three-failure condition on the arrow" gold: action=connect from=retrying to=disconnected label=three failures; read: action=connect from=ready to=disconnected<br>nl-02-047: "after the manager" gold: action=connect from=manager to=$new; read: not done |
| cut | (command:set) | 6 | nl-05-030: "a star is fine for the crown" gold: action=set target=crown shape=star; read: not done<br>nl-06-006: "put waiting in orange" gold: action=set target=$new color=orange; read: not done<br>nl-07-021: "Change for me the colour of middle station, I want it in red" gold: action=set target=welding color=red; read: action=set color=red |
| cut | (command:label) | 3 | nl-01-027: "on pause" gold: action=label from=running to=paused label=pause; read: not done<br>nl-03-024: "say forty minutes" gold: action=label target=roast label=forty minutes; read: action=label label=forty minutes target=$new<br>nl-08-006: "on the submit one write first of March" gold: action=label target=submit label=first of march; read: not done |
| cut | (command:move) | 3 | nl-05-007: "left of it" gold: action=move target=mention(label=water butt) position=leftof anchor=vent; read: action=move anchor=circle3 position=below target=circle3<br>nl-11-017: "shove it left a bit" gold: action=move target=logo direction=left distance=20; read: not done<br>nl-12-025: "put the guards around the gate with the torches" gold: action=move target=guard,guard2,guard3,guard4,torch,torch2 position=near anchor=gate; read: not done |
| cut | (command:group) | 2 | nl-10-047: "those three on the left are all things we'd actually do there so i want them to belong together, call it acti…" gold: action=group target=beach,hike,museum name=activities; read: action=group name=activities target=$new<br>nl-10-050: "all the fun stuff in a group so we can see it apart from the money side. So everything except Budget, and not…" gold: action=group target=beach,hike,museum name=activities; read: not done |
| cut | (command:disconnect) | 1 | nl-01-020: "that direct route to deployment gone" gold: action=disconnect from=build to=deploy; read: not done |
| cut | (question:count) | 1 | nl-05-017: "how many seats" gold: ask=count label=chairs; read: ask=count |
| act | command:create read as command:move | 18 | nl-01-020: "Put the box back between Build and Deploy" gold: requested: Put the box back between Build and Deploy; read: extra command:move action=move anchor=build,deploy position=between target=mention(shape=rectangle)<br>nl-01-038: "put the basket up top by the logo" gold: requested: put the basket up top by the logo; read: extra command:move action=move position=top<br>nl-02-001: "We missed triage. Put it before registration" gold: action=create name=triage position=above anchor=registration; read: not done |
| act | command:create read as command:connect | 9 | nl-01-026: "Start with Idle" gold: action=create name=idle; read: not done<br>nl-01-026: "Start with Idle and Running" gold: requested: Start with Idle; read: extra command:connect action=connect<br>nl-01-030: "We start Disconnected" gold: action=create name=disconnected; read: not done |
| act | command:create read as command:label | 4 | nl-03-030: "Write serves six at the top. Four" gold: action=create shape=text label=serves four position=top; read: not done<br>nl-03-030: "Write serves six at the top." gold: requested: Write serves six at the top. Four; read: extra command:label action=label<br>nl-03-031: "Give Planets a little one off it for Mars" gold: action=create name=mars size=small linked=planets; read: not done |
| act | command:label read as command:move | 4 | nl-06-044: "Put it at 12:30" gold: action=label target=lunch label=12:30 lunch; read: not done<br>nl-06-044: "shift the workshop to 1:30" gold: action=label target=workshop label=1:30 workshop; read: not done<br>nl-06-044: "Put it at 12:30" gold: requested: Put it at 12:30; read: extra command:move action=move |
| act | command:connect read as command:create | 4 | nl-08-004: "Algorithms also needs the maths one before it" gold: action=connect from=ma102 to=cs301; read: not done<br>nl-08-004: "Algorithms also needs the maths one before it." gold: requested: Algorithms also needs the maths one before it; read: extra command:create action=create<br>nl-12-031: "11 on the left back" gold: action=connect from=p11 to=rlb; read: not done |
| act | command:label read as command:create | 4 | nl-08-010: "Over the arrows write the yes and the not" gold: action=label from=coverage to=refusal label=not; read: not done<br>nl-08-010: "Over the arrows write the yes" gold: requested: Over the arrows write the yes and the not; read: extra command:create action=create label=yes<br>nl-10-045: "say striker on the red player up by the top corner, the one nearest their keeper" gold: action=label target=p9 label=striker; read: not done |
| act | command:connect read as command:move | 3 | nl-02-049: "Show the request going upwards, stopping at the committee" gold: action=connect from=student,supervisor,mention(label=school committee); read: not done<br>nl-02-049: "Show the request going upwards" gold: requested: Show the request going upwards, stopping at the committee; read: extra command:move action=move<br>nl-12-031: "goes straight at the centre" gold: requested: our 9 goes straight at the centre back; read: extra command:move action=move position=center |
| act | command:create read as command:set | 3 | nl-05-015: "shade the sitting bit pale yellow" gold: action=create layer=zone color=yellow fill=light position=near anchor=bench; read: not done<br>nl-05-015: "shade the sitting bit pale yellow" gold: requested: shade the sitting bit pale yellow; read: extra command:set action=set color=yellow<br>nl-06-040: "make it a thought bubble" gold: requested: make it a thought bubble; read: extra command:set action=set |
| ref | target | 36 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move<br>nl-01-029: "both active states to be orange" gold: action=set target=running,paused color=orange; read: action=set color=orange target=$new<br>nl-01-034: "line up its left edge with theirs" gold: action=align target=email,password,save direction=left; read: action=align |
| ref | anchor | 14 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move<br>nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: action=create anchor=commit position=near<br>nl-01-034: "move Save changes under the fields" gold: action=move target=save position=below anchor=email,password; read: action=move |
| ref | from | 13 | nl-01-030: "a successful retry goes to Ready again" gold: action=connect from=retrying to=ready label=successful retry; read: action=connect to=ready<br>nl-02-004: "Colour that urgent route red. Actually orange" gold: action=set from=triage to=assessment color=orange; read: action=set color=orange from=text1 to=text1<br>nl-02-031: "Connect each document to the claim with a plain line" gold: action=connect from=mention(label=1998 transfer),survey,mention(label=email chain) to=mention(label=disputed boundary) …; read: action=connect arrow=none from=$new to=$new |
| ref | to | 10 | nl-02-004: "Colour that urgent route red. Actually orange" gold: action=set from=triage to=assessment color=orange; read: action=set color=orange from=text1 to=text1<br>nl-02-009: "have both lines meet at the bed request" gold: action=connect from=$new to=bedrequest label=planned admissions; read: action=connect from=$new to=$new<br>nl-02-031: "Connect each document to the claim with a plain line" gold: action=connect from=mention(label=1998 transfer),survey,mention(label=email chain) to=mention(label=disputed boundary) …; read: action=connect arrow=none from=$new to=$new |
| ref | linked | 1 | nl-03-032: "Another for Saturn" gold: action=create name=saturn size=small linked=planets; read: action=create name=saturn |
| class | position | 11 | nl-01-038: "underneath uh a search bar full width" gold: action=create label=search bar position=below anchor=$new; read: action=create label=search bar<br>nl-01-045: "add call DBA before that restart box" gold: action=create label=call dba position=above anchor=restart; read: action=create name=dba shape=rectangle<br>nl-02-006: "put interpreter needed? before consent" gold: action=create label=interpreter needed? position=leftof anchor=consent; read: action=create label=interpreter needed? |
| class | shape | 6 | nl-02-036: "How many documents link directly to the allegation" gold: ask=count shape=rectangle linked=allegation; read: ask=count<br>nl-03-034: "How many things have I got off Planets" gold: ask=count shape=any linked=planets; read: ask=count linked=planets<br>nl-09-046: "on the top must be written with large letters the Map of Pirates" gold: action=create shape=text label=map of pirates size=large position=top; read: action=create label=map of pirates position=top size=large |
| class | target | 4 | nl-11-012: "call the orange thing Flame" gold: action=rename target=mention(color=orange,shape=diamond) name=flame; read: action=rename name=flame target=mention(color=orange)<br>nl-11-014: "smaller than the name though" gold: action=resize target=mention(recency=newest); read: action=resize<br>nl-11-016: "group the lot as Logo" gold: action=group target=mention(quantifier=all) name=logo; read: action=group name=logo target=mention() |
| class | anchor | 2 | nl-05-020: "archive above the guard room" gold: action=create name=archive position=above anchor=mention(label=guard room); read: action=create anchor=mention() label=archive position=above<br>nl-08-008: "put a little table beside the globe, a square would do nicely" gold: action=create shape=square size=small name=table position=near anchor=globe; read: action=create anchor=mention() position=near shape=square size=small |
| class | object | 2 | nl-08-049: "draw one on the left side, a small gray box" gold: action=create shape=rectangle object=door size=small color=gray position=left; read: action=create color=gray position=left shape=rectangle size=small<br>nl-09-002: "we need the sea at the bottom, nice and big and blue" gold: action=create object=sea size=large color=blue position=bottom; read: action=create color=blue position=bottom size=large |
| class | color | 1 | nl-02-046: "count them" gold: ask=count color=orange; read: ask=count |
| class | from | 1 | nl-05-033: "hook the guard room up to the street exit" gold: action=connect from=mention(label=guard room) to=exit; read: action=connect to=start,crown |
| class | template | 1 | nl-08-033: "timeline for the grant" gold: action=create template=timeline; read: action=create |
| name | label | 12 | nl-01-014: "then go to two identical app instances" gold: action=create label=app instances count=2; read: action=create count=2<br>nl-01-014: "Add object storage off to one side" gold: action=create label=object storage; read: action=create label=storage<br>nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect to=deploy |
| name | target | 6 | nl-01-048: "Put the backup under the primary" gold: action=move target=backup position=below anchor=primary; read: action=move anchor=primary position=below<br>nl-02-005: "the handover box to say 'Nurse-to-nurse handover'" gold: action=label target=$new label=nurse-to-nurse handover; read: action=label label=nurse-to-nurse handover<br>nl-03-015: "The box that says Dad should say Martin" gold: action=label target=dad label=martin; read: action=label label=martin |
| name | name | 4 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: action=create anchor=switch label=reception pc position=leftof<br>nl-02-049: "At the top is the dean" gold: action=create name=dean position=top; read: action=create position=top<br>nl-09-012: "make a shark" gold: action=create name=shark; read: action=create |
| name | from | 3 | nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect to=deploy<br>nl-02-027: "have it join the samples at the instrument" gold: action=connect from=$new to=instrument; read: action=connect from=samples to=instrument<br>nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: action=label label=7 min target=depot,market |
| name | anchor | 3 | nl-01-034: "Under Email address, add a note saying we'll send a verification message if they change it" gold: action=create shape=text label=we'll send a verification message if they change it position=below anchor=email; read: action=create anchor=$new position=below shape=text<br>nl-05-016: "put “keep clear” beside the hatch" gold: action=create shape=text label=keep clear position=near anchor=hatch; read: action=create anchor=rectangle1 label=keep clear position=near shape=text<br>nl-08-006: "between the budget and submit there needs to be letters of support no letters like letters from people the su…" gold: action=create label=supporting letters position=between anchor=budget,submit; read: action=create anchor=budget label=support position=between |
| name | linked | 2 | nl-04-050: "After Bake please make Cool" gold: action=create name=cool linked=bake; read: action=create anchor=bake name=cool position=between<br>nl-06-006: "after raise P O um there should be a wait for finance" gold: action=create label=wait for finance linked=raise; read: action=create label=finance |
| name | scale | 1 | nl-08-003: "kids section shld be way bigger" gold: action=resize target=kids; read: action=resize target=kids |
| name | to | 1 | nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: action=label label=7 min target=depot,market |
| cut | (2 more keys; all in the JSON) | | |
| act | (12 more keys; all in the JSON) | | |
| class | (1 more keys; all in the JSON) | | |

**nl_a_development / development, trigger unseen** (186)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 54 | nl-01-006: "There's nowhere on this drawing for the phones. We have six of them on the same switch" gold: action=create name=phones count=6 linked=switch; read: not done (lost: no unit on the span)<br>nl-01-017: "The arrow between them gives a wrong idea, there is no circulation of data from testing into production" gold: action=disconnect from=prod to=test; read: not done (only a part of the span is a unit)<br>nl-01-023: "not all way to commit" gold: action=disconnect from=commit to=rollback; read: not done (merged into a unit with another request) |
| 4 wrong act | model (act head) | 63 | nl-01-014: "Requests come in at the top" gold: action=create name=requests position=top; read: not done (read as command:move)<br>nl-01-014: "Requests come in at the top" gold: requested: Requests come in at the top; read: extra command:move action=move position=top target=requests (read as command:move where command:create is requested)<br>nl-01-017: "enclose each in his own fence" gold: action=create layer=zone count=2 anchor=test,prod; read: not done (read as command:connect) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 34 | nl-01-004: "Give them some space" gold: action=respace target=guestwifi,staffwifi comparison=bigger; read: action=respace comparison=bigger target=mention(quantifier=all) (a name or description the message does not write)<br>nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: action=create (a name written in another request or by a pronoun)<br>nl-01-023: "rollback shoud go back to last good relase" gold: action=connect from=rollback to=lastgood; read: action=connect (a name or description the message does not write) |
| 6 wrong or missing class value | model (class head) | 21 | nl-01-014: "Three plain areas is enough: public entry" gold: action=create layer=zone label=public entry; read: action=create label=public entry<br>nl-01-014: "application" gold: action=create layer=zone name=application; read: action=create name=application<br>nl-01-014: "data" gold: action=create layer=zone name=data; read: action=create name=data |
| 7 wrong words tagged for a name / text key | model (token head) | 14 | nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect from=start,idle to=running<br>nl-03-027: "squeze a let it cool bit in btween oven and icing" gold: action=create label=let it cool position=between anchor=oven,icing; read: action=create anchor=oven,icing position=between<br>nl-04-050: "from Cool continue to Ice" gold: action=connect from=cool to=ice; read: action=connect from=$new to=ice |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 16 | nl-01-006: "There's nowhere on this drawing for the phones. We have six of them on the same switch" gold: action=create name=phones count=6 linked=switch; read: not done<br>nl-01-026: "Running" gold: action=create name=running; read: not done<br>nl-02-005: "If there isn't a bed, we stay in the holding area" gold: action=create label=holding area position=right; read: action=create |
| cut | (command:connect) | 15 | nl-01-027: "resume goes back" gold: action=connect from=paused to=running label=resume; read: action=connect from=running to=paused<br>nl-01-030: "If the handshake times out, we go back to Disconnected" gold: action=connect from=connecting to=disconnected label=handshake times out; read: action=connect from=ready to=disconnected<br>nl-02-005: "check again later" gold: action=connect from=$new to=mention(label=wait for confirmation); read: not done |
| cut | (command:label) | 4 | nl-02-005: "After the admission decision, somebody has to request a bed" gold: action=label target=bed label=request a bed; read: not done<br>nl-06-037: "At the second picture the grandmother is with back to us. We must not see her eyes until the third picture. P…" gold: action=label target=grandma2 label=with back to us; read: not done<br>nl-08-010: "the yes is to the reimbursement" gold: action=label from=coverage to=reimbursement label=yes; read: not done |
| cut | (command:move) | 4 | nl-08-003: "desk is by the door not middle, door is at bottom" gold: action=move target=desk position=bottom; read: not done<br>nl-12-010: "there's an empty desk right there" gold: action=move target=tom position=ontop anchor=desk2; read: action=move target=moved,tom<br>nl-12-021: "the dragon is not supposed to be IN the tavern lmao. learn to read. cave" gold: action=move target=dragon position=near anchor=cave; read: not done |
| cut | (command:disconnect) | 3 | nl-01-017: "The arrow between them gives a wrong idea, there is no circulation of data from testing into production" gold: action=disconnect from=prod to=test; read: not done<br>nl-01-023: "not all way to commit" gold: action=disconnect from=commit to=rollback; read: not done<br>nl-04-049: "replacing that direct arrow" gold: action=disconnect from=bake to=ice; read: not done |
| cut | (command:set) | 2 | nl-02-026: "The dashed line looks like an optional step" gold: action=set from=remove to=log style=solid; read: not done<br>nl-08-037: "Dr Barbu's boxes green" gold: action=set target=mention(label=dr barbu,quantifier=all,shape=rectangle) color=green; read: action=set color=purple |
| cut | (command:duplicate) | 2 | nl-04-044: "i want two of him the new one on the right" gold: action=duplicate target=alien position=rightof anchor=alien; read: not done<br>nl-06-040: "a little picture of the broken vase" gold: action=duplicate target=vase position=inside anchor=$new; read: not done |
| cut | (command:delete) | 2 | nl-06-049: "rather than another box at the end" gold: action=delete target=drinks; read: not done<br>nl-08-049: "There should only be four chairs now" gold: action=delete target=chair5,chair6; read: not done |
| act | command:create read as command:move | 13 | nl-01-014: "Requests come in at the top" gold: action=create name=requests position=top; read: not done<br>nl-01-014: "Requests come in at the top" gold: requested: Requests come in at the top; read: extra command:move action=move position=top target=requests<br>nl-01-030: "Leave that as a note beside Connecting" gold: action=create shape=text label=cancellation path position=near anchor=connecting; read: not done |
| act | command:create read as command:connect | 13 | nl-01-017: "enclose each in his own fence" gold: action=create layer=zone count=2 anchor=test,prod; read: not done<br>nl-01-017: "enclose each in his own fence" gold: requested: enclose each in his own fence; read: extra command:connect action=connect<br>nl-01-027: "Running can go to Paused" gold: action=create name=paused linked=running; read: not done |
| act | command:connect read as command:create | 4 | nl-05-028: "thin corridor between them" gold: action=connect from=vault to=archive; read: not done<br>nl-05-028: "thin corridor between them" gold: requested: thin corridor between them; read: extra command:create action=create<br>nl-12-031: "7 on the right back" gold: action=connect from=p7 to=rrb; read: not done |
| act | command:label read as command:create | 2 | nl-01-021: "The step immediately before the green one needs an owner: Release captain" gold: action=label target=signoff label=release captain; read: not done<br>nl-01-021: "The step immediately before the green one needs an owner: Release captain" gold: requested: The step immediately before the green one needs an owner: R…; read: extra command:create action=create label=release captain |
| act | command:resize read as command:respace | 2 | nl-01-034: "make it shallower" gold: action=resize target=header; read: not done<br>nl-01-034: "make it shallower" gold: requested: make it shallower; read: extra command:respace action=respace target=mention(quantifier=all) |
| act | command:set read as command:create | 2 | nl-01-037: "make it look like a line of text under Password" gold: action=set target=forgot shape=text; read: not done<br>nl-01-037: "make it look like a line of text under Password" gold: requested: make it look like a line of text under Password; read: extra command:create action=create |
| act | command:resize read as command:create | 2 | nl-03-016: "Nana's name is disappearing off the edge of her little box" gold: action=resize target=nana; read: not done<br>nl-03-016: "off the edge of her little box" gold: requested: Nana's name is disappearing off the edge of her little box; read: extra command:create action=create |
| act | command:duplicate read as command:arrange | 2 | nl-04-045: "reproduce this complete alien at his right side" gold: action=duplicate target=alien position=rightof anchor=alien; read: not done<br>nl-04-045: "reproduce this complete alien at his right side" gold: requested: reproduce this complete alien at his right side; read: extra command:arrange action=arrange target=mention() |
| ref | anchor | 15 | nl-01-034: "the error message actually below that field" gold: action=create shape=text label=error message position=below anchor=mention(label=email address,recency=newest); read: action=create anchor=$new label=message position=below<br>nl-02-005: "then we wait for confirmation" gold: action=create shape=rectangle label=wait for confirmation position=below anchor=bed; read: action=create<br>nl-02-020: "The scale must be nearer of the bottom wall" gold: action=move target=scale position=near anchor=bottomwall; read: action=move |
| ref | target | 12 | nl-01-004: "Give them some space" gold: action=respace target=guestwifi,staffwifi comparison=bigger; read: action=respace comparison=bigger target=mention(quantifier=all)<br>nl-02-018: "Those three narrow grey rectangles can be one group called Cold storage" gold: action=group target=chillera,chillerb,chillerc; read: action=group name=cold<br>nl-04-029: "the grouped desk and sign that need relocating to the bottom-left corner" gold: action=move target=checkin position=bottomleft; read: action=move position=bottomleft |
| ref | from | 8 | nl-01-028: "stop from either active state returns to Idle" gold: action=connect from=running,paused to=idle label=stop; read: action=connect to=idle<br>nl-01-033: "Can you get from the one at the bottom back to Idle" gold: ask=path from=recovering to=idle; read: ask=path to=idle<br>nl-03-023: "That last arrow is the wrong way round" gold: action=reverse from=cake to=oven; read: action=reverse target=mention(quantifier=all) |
| ref | to | 4 | nl-01-023: "rollback shoud go back to last good relase" gold: action=connect from=rollback to=lastgood; read: action=connect<br>nl-03-023: "That last arrow is the wrong way round" gold: action=reverse from=cake to=oven; read: action=reverse target=mention(quantifier=all)<br>nl-05-008: "hose from the butt to both beds, dotted" gold: action=connect style=dotted from=mention(label=water butt) to=herbs,tomatoes; read: action=connect from=butt style=dotted to=circle3 |
| ref | linked | 1 | nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: action=create |
| class | position | 8 | nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=bench position=inside size=small<br>nl-05-012: "3 chairs round it" gold: action=create label=chairs count=3 position=near anchor=table layout=circle; read: action=create anchor=table count=3 position=below<br>nl-05-024: "key in the hall, tiny gold diamond" gold: action=create shape=diamond size=tiny color=gold name=key position=inside anchor=hall; read: action=create color=gold size=small |
| class | layer | 4 | nl-01-014: "Three plain areas is enough: public entry" gold: action=create layer=zone label=public entry; read: action=create label=public entry<br>nl-01-014: "application" gold: action=create layer=zone name=application; read: action=create name=application<br>nl-01-014: "data" gold: action=create layer=zone name=data; read: action=create name=data |
| class | target | 4 | nl-01-034: "a second version alongside this" gold: action=duplicate target=mention(quantifier=all); read: action=duplicate anchor=$new position=below<br>nl-09-011: "who eats the mouse" gold: ask=neighbors target=mouse; read: ask=neighbors target=mention()<br>nl-11-003: "white then" gold: action=set target=mention(recency=newest) color=white; read: action=set color=white target=circle2 |
| class | shape | 4 | nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=bench position=inside size=small<br>nl-05-024: "key in the hall, tiny gold diamond" gold: action=create shape=diamond size=tiny color=gold name=key position=inside anchor=hall; read: action=create color=gold size=small<br>nl-09-024: "long table across the top" gold: action=create shape=rectangle name=table position=top; read: action=create position=top |
| class | layout | 1 | nl-05-012: "3 chairs round it" gold: action=create label=chairs count=3 position=near anchor=table layout=circle; read: action=create anchor=table count=3 position=below |
| class | size | 1 | nl-05-024: "key in the hall, tiny gold diamond" gold: action=create shape=diamond size=tiny color=gold name=key position=inside anchor=hall; read: action=create color=gold size=small |
| class | color | 1 | nl-05-029: "vault dark blue" gold: action=set target=vault color=navy; read: action=set color=blue target=vault |
| class | object | 1 | nl-09-002: "a sun up in one corner" gold: action=create object=sun; read: action=create position=center |
| name | label | 8 | nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect from=start,idle to=running<br>nl-03-027: "squeze a let it cool bit in btween oven and icing" gold: action=create label=let it cool position=between anchor=oven,icing; read: action=create anchor=oven,icing position=between<br>nl-05-001: "veg beds along the sunny edge first. two long ones" gold: action=create label=veg beds count=2; read: action=create count=2 |
| name | from | 6 | nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect from=start,idle to=running<br>nl-04-050: "from Cool continue to Ice" gold: action=connect from=cool to=ice; read: action=connect from=$new to=ice<br>nl-05-021: "hall to archive" gold: action=connect from=hall to=archive; read: action=connect from=archive to=archive |
| name | target | 2 | nl-07-020: "the welding station stand out in red" gold: action=set target=welding color=red; read: action=set color=red<br>nl-11-040: "shipped green" gold: action=set target=shipped color=green; read: action=set color=green target=packing,shipped |
| cut | (6 more keys; all in the JSON) | | |
| act | (13 more keys; all in the JSON) | | |
| class | (3 more keys; all in the JSON) | | |

**nl_a_development / development, trigger no request** (134)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 51 | nl-01-014: "Each app can reach the same database" gold: -; read: extra command:connect action=connect from=$new to=$new (partial overlap with a requested action: 39% of it)<br>nl-01-014: "The database should be lower down" gold: -; read: extra command:move action=move target=database (partial overlap with a requested action: 36% of it)<br>nl-01-017: "circulation of data from testing into production" gold: -; read: extra command:connect action=connect from=testing (partial overlap with a requested action: 47% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 83 | nl-01-005: "name is FrontDesk" gold: -; read: extra command:rename action=rename name=frontdesk target=$new (no requested action on this text)<br>nl-01-023: "fix arrow only" gold: -; read: extra command:connect action=connect (no requested action on this text)<br>nl-01-029: "Paused is still blue" gold: -; read: extra fact: color=blue target=paused (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 24 | nl-01-046: "have" gold: -; read: extra command:create action=create<br>nl-02-005: "After" gold: -; read: extra command:create action=create name=after<br>nl-02-005: "before transfer" gold: -; read: extra command:create action=create |
| cut | command:connect | 5 | nl-01-014: "Each app can reach the same database" gold: -; read: extra command:connect action=connect from=$new to=$new<br>nl-01-017: "circulation of data from testing into production" gold: -; read: extra command:connect action=connect from=testing<br>nl-01-020: "route to" gold: -; read: extra command:connect action=connect from=mention(shape=rectangle) to=mention(shape=rectangle) |
| cut | command:label | 5 | nl-01-030: "Put the three-failure condition on the arrow" gold: -; read: extra command:label action=label from=disconnected to=disconnected<br>nl-02-047: "need legal to look at the contract as" gold: -; read: extra command:label action=label label=legal<br>nl-03-006: "give it the writing river" gold: -; read: extra command:label action=label label=river |
| cut | command:set | 4 | nl-09-030: "The youngest wants a dragon" gold: -; read: extra command:set action=set<br>nl-10-042: "on" gold: -; read: extra command:set action=set<br>nl-11-004: "big" gold: -; read: extra command:set action=set size=large target=$new |
| cut | command:move | 3 | nl-01-014: "The database should be lower down" gold: -; read: extra command:move action=move target=database<br>nl-09-053: "The post office goes next to the bakery" gold: -; read: extra command:move action=move anchor=bakery position=near<br>nl-11-009: "up" gold: -; read: extra command:move action=move |
| cut | command:delete | 3 | nl-01-020: "that" gold: -; read: extra command:delete action=delete<br>nl-08-027: "dont have a" gold: -; read: extra command:delete action=delete<br>nl-11-043: "comes off" gold: -; read: extra command:delete action=delete |
| cut | command:rename | 2 | nl-09-053: "Call it that" gold: -; read: extra command:rename action=rename target=$new<br>nl-12-020: "Just call it Old Mine" gold: -; read: extra command:rename action=rename target=$new |
| cut | command:sort | 1 | nl-02-003: "by assessment" gold: -; read: extra command:sort action=sort target=mention(quantifier=all) |
| spurious | command:create | 24 | nl-01-029: "I" gold: -; read: extra command:create action=create<br>nl-02-008: "Bring the family in before admission" gold: -; read: extra command:create action=create<br>nl-04-047: "Can" gold: -; read: extra command:create action=create |
| spurious | command:set | 10 | nl-02-005: "Could those be two separate boxes" gold: -; read: extra command:set action=set shape=rectangle target=$new<br>nl-02-040: "the unsigned one" gold: -; read: extra command:set action=set<br>nl-05-009: "it round" gold: -; read: extra command:set action=set shape=circle |
| spurious | command:connect | 9 | nl-01-023: "fix arrow only" gold: -; read: extra command:connect action=connect<br>nl-03-015: "the lines coming down to me from Jo and Martin" gold: -; read: extra command:connect action=connect arrow=none from=jo,martin to=sam<br>nl-05-005: "facing the beds" gold: -; read: extra command:connect action=connect from=bench |
| spurious | command:label | 8 | nl-01-037: "Why is 'Forgot password?' a giant box" gold: -; read: extra command:label action=label label=forgot password?<br>nl-02-003: "The other route can say routine" gold: -; read: extra command:label action=label label=routine target=assessment<br>nl-02-049: "the words more room than the" gold: -; read: extra command:label action=label |
| spurious | command:move | 7 | nl-02-018: "the blue square below" gold: -; read: extra command:move action=move target=mention(shape=square)<br>nl-02-046: "put the total up in the corner" gold: -; read: extra command:move action=move position=center<br>nl-04-027: "with the sign still above the desk" gold: -; read: extra command:move action=move |
| spurious | fact: | 3 | nl-01-029: "Paused is still blue" gold: -; read: extra fact: color=blue target=paused<br>nl-08-036: "Fri is half day" gold: -; read: extra fact: target=fri<br>nl-11-050: "Email are" gold: -; read: extra fact: target=email |
| spurious | question:count | 3 | nl-07-012: "how many sensors unwired" gold: -; read: extra question:count ask=count kind=edge<br>nl-09-026: "number them" gold: -; read: extra question:count ask=count<br>nl-12-047: "how many times do i have to say this" gold: -; read: extra question:count ask=count |
| spurious | question:nearest | 2 | nl-05-013: "the one nearest the" gold: -; read: extra question:nearest ask=nearest anchor=circle4,circle5,circle6 superlative=closest<br>nl-09-029: "furthest from the top table" gold: -; read: extra question:nearest ask=nearest superlative=farthest |
| cut | (4 more keys; all in the JSON) | | |
| spurious | (15 more keys; all in the JSON) | | |

### nl_a_development / development at the cost-10 threshold (0.8758)

Executed: right 13, wrong 2, extras 2. Structural holds 66 ({"blocked":49,"dependency":17}; 1 of them would have been right). Confidence holds 402: right 33, wrong or extra 369. Unread 114.

**Executed wrong, by first cause** (4)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 2 | nl-03-015: "Could you put Sam beside Martin" gold: -; read: extra command:move action=move anchor=martin position=near target=sam (confidence 0.894; extra)<br>nl-11-025: "Library goes between market and station" gold: -; read: extra command:move action=move anchor=market,station position=between target=library (confidence 0.986; extra) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 1 | nl-10-016: "Make the tasks in Done green" gold: action=set target=task1,task2 color=green; read: command:set action=set color=green target=done (confidence 0.927; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: command:label action=label label=7 min target=depot,market (confidence 0.883; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:create read as command:move | 2 | nl-03-015: "Could you put Sam beside Martin" gold: -; read: extra command:move action=move anchor=martin position=near target=sam<br>nl-11-025: "Library goes between market and station" gold: -; read: extra command:move action=move anchor=market,station position=between target=library |
| ref | target | 1 | nl-10-016: "Make the tasks in Done green" gold: action=set target=task1,task2 color=green; read: command:set action=set color=green target=done |
| name | from | 1 | nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: command:label action=label label=7 min target=depot,market |
| name | to | 1 | nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: command:label action=label label=7 min target=depot,market |

**Right but held by confidence** (33)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 16 | nl-01-034: "We need a small 'Forgot password?' link beside the password field" gold: action=create label=forgot password? size=small position=near anchor=password; read: command:create action=create anchor=password label=forgot password? position=near size=small<br>nl-02-031: "Add a note at the bottom saying 'Working map — disputed facts'" gold: action=create shape=text label=working map — disputed facts position=bottom; read: command:create action=create label=working map — disputed facts position=bottom shape=text<br>nl-02-049: "the school committee above that" gold: action=create label=school committee position=above anchor=$new; read: command:create action=create anchor=$new label=school committee position=above |
| held | command:connect | 4 | nl-03-038: "Join food and games together" gold: action=connect from=food to=games; read: command:connect action=connect from=food to=games<br>nl-08-040: "Anatomy leads to Physiology and Physiology leads to Surgery" gold: action=connect from=anatomy,physiology,surgery; read: command:connect action=connect from=anatomy,physiology,surgery<br>nl-11-045: "Notify off Shipped, dotted" gold: action=connect from=shipped to=notify style=dotted; read: command:connect action=connect from=shipped style=dotted to=notify |
| held | command:resize | 3 | nl-05-011: "table smaller" gold: action=resize target=table; read: command:resize action=resize target=table<br>nl-08-036: "make that one smaller" gold: action=resize target=fri; read: command:resize action=resize target=fri<br>nl-11-023: "bigger too" gold: action=resize target=hospital; read: command:resize action=resize target=hospital |
| held | command:label | 2 | nl-01-019: "Tests 'Check it works'" gold: action=label target=tests label=check it works; read: command:label action=label label=check it works target=tests<br>nl-03-010: "Label the bulb Lamp" gold: action=label target=bulb label=lamp; read: command:label action=label label=lamp target=bulb |
| held | command:swap | 2 | nl-06-032: "swap the people labelled Anna and Bev" gold: action=swap target=anna,bev; read: command:swap action=swap target=anna,bev<br>nl-09-013: "Swap the fox and the owl" gold: action=swap target=fox,owl; read: command:swap action=swap target=fox,owl |
| held | command:set | 2 | nl-09-012: "make the shark gray" gold: action=set target=shark color=gray; read: command:set action=set color=gray target=shark<br>nl-12-031: "I'd like the arrows yellow" gold: action=set kind=edge color=yellow target=mention(quantifier=all); read: command:set action=set color=yellow kind=edge target=mention(quantifier=all) |
| held | question:path | 1 | nl-05-032: "can you get from start to the crown without" gold: ask=path from=start to=crown; read: question:path ask=path from=start to=crown |
| held | command:move | 1 | nl-06-022: "Put the camp below the pass and the cave" gold: action=move target=camp position=below anchor=pass,cave; read: command:move action=move anchor=pass,cave position=below target=camp |
| held | (2 more keys; all in the JSON) | | |

**Structural holds** (66)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 49 | nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: command:connect action=connect to=deploy<br>nl-01-029: "I" gold: -; read: command:create action=create<br>nl-01-030: "Put the three-failure condition on the arrow" gold: -; read: command:label action=label from=disconnected to=disconnected |

## t1_all / all (1793 messages, 1793 requested: right 1665, wrong 128, not done 0, extras 0; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 0 |
| values/roles | 128 |
| calibration | 262 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1793); ok (ungated: right + would-be right of structural holds = right of every request executed: 1665); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 128); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 0); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 1665); ok (ungated wrong equals the score file: 128); ok (ungated extras equals the score file: 0); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 1793); ok (gated: executed wrong equals the score file: 29); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 332); ok (gated: right executed equals the score file: 1432); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 332)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 6 wrong or missing class value | model (class head) | 128 | 0 | 0 | 0 | 128 |

**t1_all / all, trigger seen** (128)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 128 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle |

| cause | key | n | examples |
|---|---|---:|---|
| class | outline | 77 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle<br>st1-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=red outline=red shape=star |
| class | target | 50 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown target=mention(quantifier=all,shape=hexagon) |
| class | color | 4 | st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle<br>st1-01406: "make a cyan triangle with a navy border" gold: action=create shape=triangle color=cyan outline=navy; read: action=create color=navy outline=navy shape=triangle<br>st1-01446: "draw a cyan ellipse with a black outline" gold: action=create shape=ellipse color=cyan outline=black; read: action=create color=black shape=ellipse |

### t1_all / all at the cost-10 threshold (0.8758)

Executed: right 1432, wrong 29, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 332: right 233, wrong or extra 99. Unread 0.

**Executed wrong, by first cause** (29)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 29 | st1-00100: "draw a gold square with a black border" gold: action=create shape=square color=gold outline=black; read: command:create action=create color=gold outline=gold shape=square (confidence 0.920; wrong)<br>st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.982; wrong)<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=yellow outline=yellow shape=triangle (confidence 0.936; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | outline | 23 | st1-00100: "draw a gold square with a black border" gold: action=create shape=square color=gold outline=black; read: command:create action=create color=gold outline=gold shape=square<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=yellow outline=yellow shape=triangle<br>st1-00462: "draw a black triangle with a purple border" gold: action=create shape=triangle color=black outline=purple; read: command:create action=create color=black outline=black shape=triangle |
| class | target | 5 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1-00681: "erase the tiny squares" gold: action=delete target=mention(quantifier=all,shape=square,size=tiny); read: command:delete action=delete target=mention(quantifier=all,shape=square)<br>st1-01043: "make the large triangles purple" gold: action=set target=mention(quantifier=all,shape=triangle,size=large) color=purple; read: command:set action=set color=purple target=mention(quantifier=all,shape=triangle) |
| class | color | 1 | st1-01406: "make a cyan triangle with a navy border" gold: action=create shape=triangle color=cyan outline=navy; read: command:create action=create color=navy outline=navy shape=triangle |

**Right but held by confidence** (233)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 132 | st1-00000: "make a funnel of Clean, Source, Enrich, Archive and Loader" gold: action=create template=funnel items=clean,source,enrich,archive,loader; read: command:create action=create items=clean,source,enrich,archive,loader template=funnel<br>st1-00001: "add a black circle" gold: action=create shape=circle color=black; read: command:create action=create color=black shape=circle<br>st1-00054: "add a teal circle" gold: action=create shape=circle color=teal; read: command:create action=create color=teal shape=circle |
| held | command:set | 49 | st1-00036: "give Kitchen a red border" gold: action=set target=kitchen outline=red; read: command:set action=set outline=red target=kitchen<br>st1-00058: "make the arrow from M to Y orange" gold: action=set from=m to=y color=orange; read: command:set action=set color=orange from=m to=y<br>st1-00114: "make the arrow from Backlog to Todo teal" gold: action=set from=backlog to=todo color=teal; read: command:set action=set color=teal from=backlog to=todo |
| held | question:count | 20 | st1-00076: "how many arrows are there" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small<br>st1-00250: "how many small circles are there" gold: ask=count shape=circle size=small; read: question:count ask=count shape=circle size=small |
| held | command:snap | 4 | st1-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01598: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:sort | 4 | st1-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all)<br>st1-01489: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | command:groupBy | 4 | st1-00446: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01757: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01804: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all) |
| held | command:flip | 4 | st1-00760: "flip the diagram horizontally" gold: action=flip target=mention(quantifier=all) axis=horizontal; read: command:flip action=flip axis=horizontal target=mention(quantifier=all)<br>st1-00922: "flip the diagram vertically" gold: action=flip target=mention(quantifier=all) axis=vertical; read: command:flip action=flip axis=vertical target=mention(quantifier=all)<br>st1-01372: "flip the diagram vertically" gold: action=flip target=mention(quantifier=all) axis=vertical; read: command:flip action=flip axis=vertical target=mention(quantifier=all) |
| held | command:distribute | 3 | st1-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all)<br>st1-00809: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all)<br>st1-01144: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all) |
| held | (8 more keys; all in the JSON) | | |

**Structural holds** (0)

none

## lowercase_other / all (351 messages, 1102 requested: right 735, wrong 323, not done 44, extras 77; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 82 |
| actions | 52 |
| values/roles | 310 |
| calibration | 471 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1102); ok (ungated: right + would-be right of structural holds = right of every request executed: 735); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 323); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 77); ok (ungated: unread = requested - paired: 44); ok (ungated right equals the score file: 733); ok (ungated wrong equals the score file: 316); ok (ungated extras equals the score file: 68); ok (ungated unread equals the score file: 44); ok (ungated structural holds equal the score file: 18); ok (every produced request is executed, structurally held or (gated) confidence-held: 1135); ok (gated: executed wrong equals the score file: 2); ok (gated: executed extras equals the score file: 4); ok (gated: structural holds equal the score file: 18); ok (gated: confidence holds equal the score file: 843); ok (gated: right executed equals the score file: 268); ok (gated: unread equals the score file: 44); ok (gated: held right + held wrong or extra = confidence holds: 843)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 29 | 2 | 0 | 25 | 56 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 26 | 26 |
| 4 wrong act | model (act head) | 34 | 18 | 0 | 0 | 52 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 93 | 6 | 0 | 0 | 99 |
| 6 wrong or missing class value | model (class head) | 52 | 2 | 0 | 0 | 54 |
| 7 wrong words tagged for a name / text key | model (token head) | 143 | 14 | 0 | 0 | 157 |

**lowercase_other / all, trigger seen** (351)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 29 | fo-0032#lc: "All rectangles should be orange. Actually only eks and ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(shape=rectangle) (the unit covers 41% of the span)<br>fo-0042#lc: "worker1 and worker2 both feed results" gold: action=connect from=worker1,worker2 to=results; read: not done (lost: no unit on the span)<br>fo-0042#lc: "What's the label on results" gold: ask=property target=results property=label; read: not done (only a part of the span is a unit) |
| 4 wrong act | model (act head) | 34 | fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: not done (read as command:create)<br>fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: requested: Make extract, transform and load the same, medium blue rect…; read: extra command:create action=create color=blue shape=rectangle size=medium (read as command:create where command:set is requested)<br>fo-0076#lc: "alert: red star" gold: action=set target=alert color=red shape=star; read: not done (read as command:create) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 93 | fo-0002#lc: "Move it to the right of api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof (a name written in another request or by a pronoun)<br>fo-0010#lc: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle (a name written in another request or by a pronoun)<br>fo-0010#lc: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=mention(quantifier=all) (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 52 | fo-0004#lc: "add a small red diamond called Dlq below clean" gold: action=create shape=diamond color=red size=small name=dlq position=below anchor=clean; read: action=create color=red name=dlq shape=diamond size=small<br>fo-0006#lc: "Please create one small orange square with name Bastion near of subneta" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: action=create color=orange name=bastion shape=square size=small<br>fo-0010#lc: "Add a tiny black circle named Avatar right of search" gold: action=create shape=circle color=black size=tiny name=avatar position=rightof anchor=search; read: action=create color=black name=avatar shape=circle size=tiny |
| 7 wrong words tagged for a name / text key | model (token head) | 143 | fo-0004#lc: "connect ingest parse clean and load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect pairing=chain<br>fo-0010#lc: "logo goes to the top left" gold: action=move target=logo position=topleft; read: action=move position=topleft<br>fo-0012#lc: "hook the copies up to alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 7 | fo-0042#lc: "worker1 and worker2 both feed results" gold: action=connect from=worker1,worker2 to=results; read: not done<br>fo-0066#lc: "newservice reads from db, connect those too" gold: action=connect from=newservice to=db; read: action=connect<br>fo-0097#lc: "router connects to tv console laptop and phone" gold: action=connect from=router to=tv,console,laptop,phone; read: action=connect from=router to=tv |
| cut | (command:set) | 6 | fo-0032#lc: "All rectangles should be orange. Actually only eks and ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(shape=rectangle)<br>fo-0125#lc: "gray" gold: action=set target=statusbar color=gray; read: not done<br>fo-0147#lc: "for ended is red. Sorry, ended must be gray" gold: action=set target=ended color=gray; read: action=set color=gray |
| cut | (fact:) | 5 | fo-0206#lc: "brother is to the right of me" gold: target=brother position=rightof anchor=me; read: not done<br>fo-0245#lc: "the moon is above earth" gold: target=moon position=above anchor=earth; read: not done<br>fo-0283#lc: "the tree is already green" gold: target=tree color=green; read: not done |
| cut | (question:property) | 3 | fo-0042#lc: "What's the label on results" gold: ask=property target=results property=label; read: not done<br>fo-0221#lc: "where saturn is on this thing" gold: ask=property target=saturn property=position; read: not done<br>fo-0524#lc: "How big is it" gold: ask=property target=sunflower property=size; read: not done |
| cut | (command:move) | 2 | fo-0076#lc: "top right" gold: action=move target=alert position=topright; read: not done<br>fo-0271#lc: "sun at the top" gold: action=move target=sun position=top; read: not done |
| cut | (question:degree) | 1 | fo-0104#lc: "Is rds connected to anything" gold: ask=degree target=rds; read: not done |
| cut | (command:undo) | 1 | fo-0246#lc: "can you undo" gold: action=undo; read: not done |
| cut | (command:delete) | 1 | fo-0285#lc: "satellite isn't needed, delete it" gold: action=delete target=satellite; read: action=delete target=$new |
| act | command:move read as command:create | 8 | fo-0125#lc: "statusbar at the bottom" gold: action=move target=statusbar position=bottom; read: not done<br>fo-0125#lc: "statusbar at the bottom, gray" gold: requested: statusbar at the bottom; read: extra command:create action=create color=gray position=bottom<br>fo-0206#lc: "Put dad above both of us" gold: action=move target=dad position=above anchor=me,brother; read: not done |
| act | command:set read as command:create | 4 | fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: not done<br>fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: requested: Make extract, transform and load the same, medium blue rect…; read: extra command:create action=create color=blue shape=rectangle size=medium<br>fo-0076#lc: "alert: red star" gold: action=set target=alert color=red shape=star; read: not done |
| act | fact: read as command:set | 4 | fo-0500#lc: "it's actually navy" gold: target=yarn color=navy; read: not done<br>fo-0500#lc: "it's actually navy" gold: requested: it's actually navy; read: extra command:set action=set color=navy<br>fo-0579#lc: "lettuce is actually green, not lime" gold: target=lettuce color=green; read: not done |
| act | question:path read as command:connect | 2 | fo-0076#lc: "Path from topic to alert" gold: ask=path from=topic to=alert; read: not done<br>fo-0076#lc: "Path from topic to alert" gold: requested: Path from topic to alert; read: extra command:connect action=connect from=topic |
| act | command:set read as fact: | 2 | fo-0147#lc: "Color for connected is green" gold: action=set target=connected color=green; read: not done<br>fo-0147#lc: "Color for connected is green" gold: requested: Color for connected is green; read: extra fact: color=green |
| act | rule: read as command:set | 2 | fo-0214#lc: "I want all circles to be small by default, from now on" gold: shape=circle size=small; read: not done<br>fo-0214#lc: "I want all circles to be small" gold: requested: I want all circles to be small by default, from now on; read: extra command:set action=set shape=circle size=small target=mention(quantifier=all,shape=circle) |
| act | question:connected read as question:help | 2 | fo-0222#lc: "what about zooplankton and tuna" gold: ask=connected target=tuna anchor=zooplankton; read: not done<br>fo-0222#lc: "what about zooplankton and tuna" gold: requested: what about zooplankton and tuna; read: extra question:help ask=help |
| act | command:arrange read as command:align | 2 | fo-0459#lc: "Then line up all four boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done<br>fo-0459#lc: "line up all four boxes in a row" gold: requested: Then line up all four boxes in a row; read: extra command:align action=align axis=horizontal target=chase |
| ref | target | 65 | fo-0002#lc: "Move it to the right of api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof<br>fo-0010#lc: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle<br>fo-0010#lc: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=mention(quantifier=all) |
| ref | to | 11 | fo-0020#lc: "disconnect them" gold: action=disconnect from=audit to=load; read: action=disconnect from=audit to=audit<br>fo-0035#lc: "Same for spine2" gold: action=connect from=spine2 to=leaf1,leaf2,leaf3,leaf4; read: action=connect<br>fo-0055#lc: "Connect coresw to each of them" gold: action=connect from=coresw to=vlan10,vlan20,vlan30; read: action=connect |
| ref | from | 11 | fo-0025#lc: "conect them each to the next" gold: action=connect from=raw,staged,curated,mart; read: action=connect pairing=next<br>fo-0035#lc: "disconnect it from spine1 and spine2" gold: action=disconnect from=leaf4 to=spine1,spine2; read: action=disconnect to=spine1,spine2<br>fo-0076#lc: "All three consumers -> aggregator" gold: action=connect from=consumer1,consumer2,consumer3 to=aggregator; read: action=connect to=aggregator |
| ref | anchor | 9 | fo-0168#lc: "put grandma above both of them" gold: action=move target=grandma position=above anchor=mom,uncle; read: action=move anchor=mom position=above target=grandma<br>fo-0190#lc: "move it there" gold: action=move target=frog position=rightof anchor=grasshopper; read: action=move anchor=frog position=between target=frog<br>fo-0192#lc: "what's farthest from it" gold: ask=nearest anchor=earth superlative=farthest; read: ask=nearest superlative=farthest |
| class | position | 27 | fo-0004#lc: "add a small red diamond called Dlq below clean" gold: action=create shape=diamond color=red size=small name=dlq position=below anchor=clean; read: action=create color=red name=dlq shape=diamond size=small<br>fo-0006#lc: "Please create one small orange square with name Bastion near of subneta" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: action=create color=orange name=bastion shape=square size=small<br>fo-0010#lc: "Add a tiny black circle named Avatar right of search" gold: action=create shape=circle color=black size=tiny name=avatar position=rightof anchor=search; read: action=create color=black name=avatar shape=circle size=tiny |
| class | target | 13 | fo-0043#lc: "label card "Product"" gold: action=label target=card label=product; read: action=label label=product target=mention()<br>fo-0058#lc: "make gold gold" gold: action=set target=gold color=gold; read: action=set color=gold target=mention()<br>fo-0058#lc: "silver gray" gold: action=set target=silver color=gray; read: action=set color=gray target=mention() |
| class | from | 5 | fo-0032#lc: "arrow from eks to ecr" gold: action=connect from=eks to=ecr; read: action=connect from=mention() to=ecr<br>fo-0081#lc: "closing back to closed" gold: action=connect from=closing to=closed; read: action=connect from=mention()<br>fo-0139#lc: "edgerouter to core" gold: action=connect from=edgerouter to=core; read: action=connect from=mention() to=core |
| class | shape | 4 | fo-0087#lc: "I want wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake<br>fo-0237#lc: "put 5 tiny gray sqaures between Mars and... hmm there's nothing after Mars yet. ok just put them to the right…" gold: action=create shape=square size=tiny color=gray count=5 position=rightof anchor=$new; read: action=create color=gray count=5 shape=rectangle size=tiny<br>fo-0329#lc: "If not, add one near customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=customs position=near shape=circle |
| class | color | 4 | fo-0223#lc: "please add a red rectangle named Mum to the left of dad. actualy make it pink" gold: action=create shape=rectangle color=pink name=mum position=leftof anchor=dad; read: action=create anchor=dad color=red name=mum position=leftof shape=rectangle<br>fo-0329#lc: "If not, add one near customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=customs position=near shape=circle<br>fo-0403#lc: "Make it gray. No, orange. Fine, gray" gold: action=set target=$new color=gray; read: action=set color=orange target=$new |
| class | layout | 2 | fo-0025#lc: "arange raw, staged, curated and mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart template=pillars<br>fo-0059#lc: "Stack namefield, emailfield and submitbtn vertically" gold: action=arrange target=namefield,emailfield,submitbtn layout=column; read: action=arrange target=namefield,emailfield,submitbtn |
| name | from | 58 | fo-0004#lc: "connect ingest parse clean and load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect pairing=chain<br>fo-0012#lc: "hook the copies up to alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0013#lc: "published goes to archived" gold: action=connect from=published to=archived; read: action=connect from=rejected to=rejected |
| name | target | 58 | fo-0010#lc: "logo goes to the top left" gold: action=move target=logo position=topleft; read: action=move position=topleft<br>fo-0012#lc: "What colour is rds" gold: ask=property target=rds property=color; read: ask=property property=color target=alb<br>fo-0013#lc: "archived should be gray and small" gold: action=set target=archived color=gray size=small; read: action=set color=gray size=small |
| name | to | 34 | fo-0013#lc: "Add one from review to published" gold: action=connect from=review to=published; read: action=connect from=review<br>fo-0013#lc: "published goes to archived" gold: action=connect from=published to=archived; read: action=connect from=rejected to=rejected<br>fo-0027#lc: "shutdown back to off" gold: action=connect from=shutdown to=off; read: action=connect from=shutdown to=shutdown |
| name | anchor | 11 | fo-0047#lc: "place dashboard on the right side of lake" gold: action=move target=dashboard position=rightof anchor=lake; read: action=move anchor=$new position=rightof target=dashboard<br>fo-0055#lc: "edgefw sits between internet and coresw in reality, please move it there" gold: action=move target=edgefw position=between anchor=internet,coresw; read: action=move anchor=internet position=between<br>fo-0062#lc: "is users connected to apigw" gold: ask=connected target=apigw anchor=users; read: ask=connected anchor=dynamo target=dynamo |
| name | name | 1 | fo-0049#lc: "Add a white square named Pc1 next to router. Wait, call it Laptop, not Pc1" gold: action=create shape=square color=white name=laptop position=near anchor=router; read: action=create anchor=router color=white name=pc1 position=near shape=square |
| name | count | 1 | fo-0333#lc: "Add six small pink circles around Floor... no, make it eight" gold: action=create shape=circle size=small color=pink count=8 position=near anchor=$new; read: action=create anchor=$new color=pink position=near shape=circle size=small |
| cut | (3 more keys; all in the JSON) | | |
| act | (5 more keys; all in the JSON) | | |

**lowercase_other / all, trigger unseen** (42)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 2 | fo-0104#lc: "did I make igw a circle" gold: ask=check target=igw shape=circle; read: not done (lost: no unit on the span)<br>fo-0534#lc: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move (the unit covers 0% of the span) |
| 4 wrong act | model (act head) | 18 | fo-0010#lc: "footer: gray" gold: action=set target=footer color=gray; read: not done (read as command:create)<br>fo-0010#lc: "footer: gray" gold: requested: footer: gray; read: extra command:create action=create color=gray name=footer (read as command:create where command:set is requested)<br>fo-0184#lc: "plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done (read as command:connect) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 6 | fo-0076#lc: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers (a name written in another request or by a pronoun)<br>fo-0113#lc: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple (a name written in another request or by a pronoun)<br>fo-0144#lc: "I want broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 2 | fo-0113#lc: "I want the grid1, grid2, grid3 and grid4 to be in grid" gold: action=arrange target=grid1,grid2,grid3,grid4 layout=grid; read: action=arrange target=grid1,grid2,grid3,grid4<br>fo-0115#lc: "ips down 30" gold: action=move target=ips direction=down distance=30; read: action=move distance=30 target=mention() |
| 7 wrong words tagged for a name / text key | model (token head) | 14 | fo-0003#lc: "paused should go back to running" gold: action=connect from=paused to=running; read: action=connect from=running to=running<br>fo-0083#lc: "header and footer can both be gray" gold: action=set target=header,footer color=gray; read: action=set color=gray<br>fo-0104#lc: "privatesubnet blue" gold: action=set target=privatesubnet color=blue; read: action=set color=blue target=publicsubnet |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (question:check) | 1 | fo-0104#lc: "did I make igw a circle" gold: ask=check target=igw shape=circle; read: not done |
| cut | (command:move) | 1 | fo-0534#lc: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move |
| act | question:degree read as question:count | 6 | fo-0335#lc: "How many shapes are connected to score" gold: ask=degree target=score; read: not done<br>fo-0335#lc: "How many shapes are connected to score" gold: requested: How many shapes are connected to score; read: extra question:count ask=count linked=score<br>fo-0462#lc: "How many shapes are connected to coding" gold: ask=degree target=coding; read: not done |
| act | command:set read as command:create | 4 | fo-0010#lc: "footer: gray" gold: action=set target=footer color=gray; read: not done<br>fo-0010#lc: "footer: gray" gold: requested: footer: gray; read: extra command:create action=create color=gray name=footer<br>fo-0397#lc: "pay a diamond" gold: action=set target=pay shape=diamond; read: not done |
| act | question:extreme read as question:check | 4 | fo-0554#lc: "Is Teardown the last one on the right" gold: ask=extreme superlative=rightmost; read: not done<br>fo-0554#lc: "Is Teardown the last one on the right" gold: requested: Is Teardown the last one on the right; read: extra question:check ask=check position=right<br>fo-0594#lc: "Is Scene4 the last one at the bottom" gold: ask=extreme superlative=bottommost; read: not done |
| act | command:move read as command:connect | 2 | fo-0184#lc: "plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done<br>fo-0184#lc: "plants belwo it" gold: requested: plants belwo it; read: extra command:connect action=connect from=genes to=genes |
| act | command:rename read as command:connect | 2 | fo-0210#lc: "coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done<br>fo-0210#lc: "coach2 to Seniors" gold: requested: coach2 to Seniors; read: extra command:connect action=connect to=seniors |
| ref | anchor | 4 | fo-0144#lc: "I want broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move<br>fo-0184#lc: "genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: action=move anchor=mention() position=rightof target=genes<br>fo-0184#lc: "body to the left of it" gold: action=move target=body position=leftof anchor=brain; read: action=move anchor=$new position=leftof target=$new |
| ref | target | 2 | fo-0076#lc: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers<br>fo-0113#lc: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple |
| class | layout | 1 | fo-0113#lc: "I want the grid1, grid2, grid3 and grid4 to be in grid" gold: action=arrange target=grid1,grid2,grid3,grid4 layout=grid; read: action=arrange target=grid1,grid2,grid3,grid4 |
| class | target | 1 | fo-0115#lc: "ips down 30" gold: action=move target=ips direction=down distance=30; read: action=move distance=30 target=mention() |
| class | direction | 1 | fo-0115#lc: "ips down 30" gold: action=move target=ips direction=down distance=30; read: action=move distance=30 target=mention() |
| name | target | 11 | fo-0083#lc: "header and footer can both be gray" gold: action=set target=header,footer color=gray; read: action=set color=gray<br>fo-0104#lc: "privatesubnet blue" gold: action=set target=privatesubnet color=blue; read: action=set color=blue target=publicsubnet<br>fo-0107#lc: "thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |
| name | from | 2 | fo-0003#lc: "paused should go back to running" gold: action=connect from=paused to=running; read: action=connect from=running to=running<br>fo-0230#lc: "add a separate arrow from river back to sea" gold: action=connect from=river to=sea; read: action=connect to=sea |
| name | anchor | 1 | fo-0124#lc: "map and reduce, are they linked" gold: ask=connected target=map anchor=reduce; read: ask=connected |
| name | to | 1 | fo-0193#lc: "a dashed arrow from river to sea" gold: action=connect from=river to=sea style=dashed; read: action=connect from=river style=dashed |

**lowercase_other / all, trigger no request** (51)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 25 | fo-0027#lc: "ready goes to shutdown" gold: -; read: extra command:connect action=connect from=ready to=shutdown (partial overlap with a requested action: 32% of it)<br>fo-0042#lc: "'s the" gold: -; read: extra command:create action=create (partial overlap with a requested action: 22% of it)<br>fo-0049#lc: "not" gold: -; read: extra command:disconnect action=disconnect from=$new to=$new (partial overlap with a requested action: 4% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 26 | fo-0027#lc: "Booting can also go to Error" gold: -; read: extra command:connect action=connect from=booting to=error (no requested action on this text)<br>fo-0031#lc: "the pagination" gold: -; read: extra command:create action=create (no requested action on this text)<br>fo-0047#lc: "Then" gold: -; read: extra command:create action=create (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 13 | fo-0042#lc: "'s the" gold: -; read: extra command:create action=create<br>fo-0090#lc: "Only" gold: -; read: extra command:create action=create<br>fo-0191#lc: "please" gold: -; read: extra command:create action=create |
| cut | command:connect | 2 | fo-0027#lc: "ready goes to shutdown" gold: -; read: extra command:connect action=connect from=ready to=shutdown<br>fo-0104#lc: "Connect igw to publicsubnet" gold: -; read: extra command:connect action=connect from=igw to=publicsubnet |
| cut | question:help | 2 | fo-0161#lc: "can" gold: -; read: extra question:help ask=help aspect=can<br>fo-0254#lc: "could you" gold: -; read: extra question:help ask=help |
| cut | command:disconnect | 1 | fo-0049#lc: "not" gold: -; read: extra command:disconnect action=disconnect from=$new to=$new |
| cut | command:arrange | 1 | fo-0118#lc: "everything in a row" gold: -; read: extra command:arrange action=arrange layout=row |
| cut | fact: | 1 | fo-0147#lc: "for ended is red" gold: -; read: extra fact: color=red |
| cut | question:path | 1 | fo-0246#lc: "the arrow from Cow to Human, can you undo" gold: -; read: extra question:path ask=path from=cow to=human |
| cut | rule: | 1 | fo-0264#lc: "From now on," gold: -; read: extra rule:  |
| spurious | command:set | 7 | fo-0096#lc: "rectangles should be blue" gold: -; read: extra command:set action=set color=blue<br>fo-0174#lc: "the Sun has to be huge" gold: -; read: extra command:set action=set size=huge target=sun<br>fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body |
| spurious | command:create | 4 | fo-0031#lc: "the pagination" gold: -; read: extra command:create action=create<br>fo-0047#lc: "Then" gold: -; read: extra command:create action=create<br>fo-0407#lc: "There's a tiny magenta circle somewhere" gold: -; read: extra command:create action=create color=magenta shape=circle size=tiny |
| spurious | command:connect | 3 | fo-0027#lc: "Booting can also go to Error" gold: -; read: extra command:connect action=connect from=booting to=error<br>fo-0279#lc: "match Mum to her" gold: -; read: extra command:connect action=connect from=mum to=$new<br>fo-0470#lc: "Gene encodes Protein" gold: -; read: extra command:connect action=connect from=gene to=protein |
| spurious | command:move | 3 | fo-0168#lc: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0288#lc: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance<br>fo-0424#lc: "Users hit the Paywall right after Trial" gold: -; read: extra command:move action=move anchor=trial position=rightof target=paywall |
| spurious | question:help | 2 | fo-0279#lc: "I want to" gold: -; read: extra question:help ask=help<br>fo-0495#lc: "how do I add stuff" gold: -; read: extra question:help ask=help aspect=how |
| spurious | command:arrange | 2 | fo-0470#lc: "the protein acts in the pathway" gold: -; read: extra command:arrange action=arrange target=protein<br>fo-0534#lc: "Fern and Ivy" gold: -; read: extra command:arrange action=arrange target=fern,ivy |
| spurious | command:undo | 1 | fo-0118#lc: "Undo that" gold: -; read: extra command:undo action=undo |
| spurious | command:disconnect | 1 | fo-0355#lc: "drop the Truck route entirely" gold: -; read: extra command:disconnect action=disconnect from=truck |
| cut | (3 more keys; all in the JSON) | | |
| spurious | (3 more keys; all in the JSON) | | |

### lowercase_other / all at the cost-10 threshold (0.8758)

Executed: right 268, wrong 2, extras 4. Structural holds 18 ({"blocked":11,"dependency":7}; 2 of them would have been right). Confidence holds 843: right 465, wrong or extra 378. Unread 44.

**Executed wrong, by first cause** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 4 | fo-0118#lc: "Undo that" gold: -; read: extra command:undo action=undo (confidence 0.968; extra)<br>fo-0174#lc: "the Sun has to be huge" gold: -; read: extra command:set action=set size=huge target=sun (confidence 0.934; extra)<br>fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body (confidence 0.969; extra) |
| 6 wrong or missing class value | model (class head) | 1 | fo-0115#lc: "Move ids up by 30 pixels" gold: action=move target=ids direction=up distance=30; read: command:move action=move direction=up distance=30 target=mention() (confidence 0.919; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | fo-0463#lc: "wire the mine to the forge with a dashed line" gold: action=connect from=mine to=forge style=dashed arrow=none; read: command:connect action=connect arrow=none style=dashed to=forge (confidence 0.877; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:set | 3 | fo-0174#lc: "the Sun has to be huge" gold: -; read: extra command:set action=set size=huge target=sun<br>fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body<br>fo-0277#lc: "Wolf just turned into a star" gold: -; read: extra command:set action=set shape=star target=wolf |
| spurious | command:undo | 1 | fo-0118#lc: "Undo that" gold: -; read: extra command:undo action=undo |
| class | target | 1 | fo-0115#lc: "Move ids up by 30 pixels" gold: action=move target=ids direction=up distance=30; read: command:move action=move direction=up distance=30 target=mention() |
| name | from | 1 | fo-0463#lc: "wire the mine to the forge with a dashed line" gold: action=connect from=mine to=forge style=dashed arrow=none; read: command:connect action=connect arrow=none style=dashed to=forge |

**Right but held by confidence** (465)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:connect | 90 | fo-0003#lc: "arrow from idle to running" gold: action=connect from=idle to=running; read: command:connect action=connect from=idle to=running<br>fo-0004#lc: "hook load up to warehouse with a normal arrow" gold: action=connect from=load to=warehouse; read: command:connect action=connect arrow=none from=load to=warehouse<br>fo-0004#lc: "connect clean to Dlq with a dotted line" gold: action=connect from=clean to=$new style=dotted arrow=none; read: command:connect action=connect arrow=none from=clean style=dotted to=$new |
| held | command:set | 69 | fo-0004#lc: "make it a navy ellipse" gold: action=set target=warehouse color=navy shape=ellipse; read: command:set action=set color=navy shape=ellipse target=warehouse<br>fo-0008#lc: "Make alarm red. No wait, orange" gold: action=set target=alarm color=orange; read: command:set action=set color=orange target=alarm<br>fo-0013#lc: "Make rejected a red octagon... ok no octagons, a red hexagon then" gold: action=set target=rejected color=red shape=hexagon; read: command:set action=set color=red shape=hexagon target=rejected |
| held | command:create | 58 | fo-0001#lc: "put a gray hexagon called Switch between fw1 and lan" gold: action=create shape=hexagon color=gray name=switch position=between anchor=fw1,lan; read: command:create action=create anchor=fw1,lan color=gray name=switch position=between shape=hexagon<br>fo-0018#lc: "add uh three small yellow circles under lambda" gold: action=create shape=circle color=yellow size=small count=3 position=below anchor=lambda; read: command:create action=create anchor=lambda color=yellow count=3 position=below shape=circle size=small<br>fo-0031#lc: "Can you add 4 small rectangles below results" gold: action=create shape=rectangle size=small count=4 position=below anchor=results; read: command:create action=create anchor=results count=4 position=below shape=rectangle size=small |
| held | command:move | 41 | fo-0013#lc: "Put archived to the right of published" gold: action=move target=archived position=rightof anchor=published; read: command:move action=move anchor=published position=rightof target=archived<br>fo-0020#lc: "move transform between extract and load" gold: action=move target=transform position=between anchor=extract,load; read: command:move action=move anchor=extract,load position=between target=transform<br>fo-0020#lc: "in the bottom right" gold: action=move target=audit position=bottomright; read: command:move action=move position=bottomright target=audit |
| held | question:check | 26 | fo-0030#lc: "is broker between producer and consumer" gold: ask=check target=broker position=between anchor=consumer,producer; read: question:check ask=check anchor=consumer,producer position=between target=broker<br>fo-0032#lc: "Is ecr smaller than eks" gold: ask=check target=ecr comparison=smaller anchor=eks; read: question:check ask=check anchor=eks comparison=smaller target=ecr<br>fo-0083#lc: "Is cta bigger than heroimg now" gold: ask=check target=cta comparison=bigger anchor=heroimg; read: question:check ask=check anchor=heroimg comparison=bigger target=cta |
| held | command:arrange | 23 | fo-0004#lc: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all,shape=rectangle)<br>fo-0010#lc: "card1, card2 and card3 should sit in a row" gold: action=arrange target=card1,card2,card3 layout=row; read: command:arrange action=arrange layout=row target=card1,card2,card3<br>fo-0031#lc: "put them in a row" gold: action=arrange target=$new layout=row; read: command:arrange action=arrange layout=row target=$new |
| held | question:count | 20 | fo-0035#lc: "How many connections in total now" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>fo-0097#lc: "how many shapes are blue now" gold: ask=count color=blue; read: question:count ask=count color=blue<br>fo-0104#lc: "How many rectangles are there" gold: ask=count shape=rectangle; read: question:count ask=count shape=rectangle |
| held | command:resize | 18 | fo-0005#lc: "shrink sidebar a bit" gold: action=resize target=sidebar; read: command:resize action=resize target=sidebar<br>fo-0032#lc: "shrink ecr a bit" gold: action=resize target=ecr; read: command:resize action=resize target=ecr<br>fo-0043#lc: "make it larger" gold: action=resize target=price; read: command:resize action=resize target=price |
| held | (25 more keys; all in the JSON) | | |

**Structural holds** (18)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 11 | fo-0013#lc: "published goes to archived later on" gold: action=connect from=published to=archived; read: command:connect action=connect from=rejected to=rejected<br>fo-0161#lc: "can" gold: -; read: question:help ask=help aspect=can<br>fo-0165#lc: "make an arrow from sea to cloud and label it... hmm no, just the arrow" gold: action=connect from=sea to=cloud; read: command:connect action=connect from=sea to=cloud |

## t1s / all (1791 messages, 1791 requested: right 1663, wrong 128, not done 0, extras 0; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 0 |
| values/roles | 128 |
| calibration | 260 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1791); ok (ungated: right + would-be right of structural holds = right of every request executed: 1663); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 128); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 0); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 1663); ok (ungated wrong equals the score file: 128); ok (ungated extras equals the score file: 0); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 1791); ok (gated: executed wrong equals the score file: 29); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 330); ok (gated: right executed equals the score file: 1432); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 330)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 6 wrong or missing class value | model (class head) | 128 | 0 | 0 | 0 | 128 |

**t1s / all, trigger seen** (128)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 128 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle |

| cause | key | n | examples |
|---|---|---:|---|
| class | outline | 77 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle<br>st1-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=red outline=red shape=star |
| class | target | 50 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown target=mention(quantifier=all,shape=hexagon) |
| class | color | 4 | st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle<br>st1-01406: "make a cyan triangle with a navy border" gold: action=create shape=triangle color=cyan outline=navy; read: action=create color=navy outline=navy shape=triangle<br>st1-01446: "draw a cyan ellipse with a black outline" gold: action=create shape=ellipse color=cyan outline=black; read: action=create color=black shape=ellipse |

### t1s / all at the cost-10 threshold (0.8758)

Executed: right 1432, wrong 29, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 330: right 231, wrong or extra 99. Unread 0.

**Executed wrong, by first cause** (29)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 29 | st1-00100: "draw a gold square with a black border" gold: action=create shape=square color=gold outline=black; read: command:create action=create color=gold outline=gold shape=square (confidence 0.920; wrong)<br>st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.982; wrong)<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=yellow outline=yellow shape=triangle (confidence 0.936; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | outline | 23 | st1-00100: "draw a gold square with a black border" gold: action=create shape=square color=gold outline=black; read: command:create action=create color=gold outline=gold shape=square<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=yellow outline=yellow shape=triangle<br>st1-00462: "draw a black triangle with a purple border" gold: action=create shape=triangle color=black outline=purple; read: command:create action=create color=black outline=black shape=triangle |
| class | target | 5 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1-00681: "erase the tiny squares" gold: action=delete target=mention(quantifier=all,shape=square,size=tiny); read: command:delete action=delete target=mention(quantifier=all,shape=square)<br>st1-01043: "make the large triangles purple" gold: action=set target=mention(quantifier=all,shape=triangle,size=large) color=purple; read: command:set action=set color=purple target=mention(quantifier=all,shape=triangle) |
| class | color | 1 | st1-01406: "make a cyan triangle with a navy border" gold: action=create shape=triangle color=cyan outline=navy; read: command:create action=create color=navy outline=navy shape=triangle |

**Right but held by confidence** (231)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 130 | st1-00000: "make a funnel of Clean, Source, Enrich, Archive and Loader" gold: action=create template=funnel items=clean,source,enrich,archive,loader; read: command:create action=create items=clean,source,enrich,archive,loader template=funnel<br>st1-00001: "add a black circle" gold: action=create shape=circle color=black; read: command:create action=create color=black shape=circle<br>st1-00054: "add a teal circle" gold: action=create shape=circle color=teal; read: command:create action=create color=teal shape=circle |
| held | command:set | 49 | st1-00036: "give Kitchen a red border" gold: action=set target=kitchen outline=red; read: command:set action=set outline=red target=kitchen<br>st1-00058: "make the arrow from M to Y orange" gold: action=set from=m to=y color=orange; read: command:set action=set color=orange from=m to=y<br>st1-00114: "make the arrow from Backlog to Todo teal" gold: action=set from=backlog to=todo color=teal; read: command:set action=set color=teal from=backlog to=todo |
| held | question:count | 20 | st1-00076: "how many arrows are there" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small<br>st1-00250: "how many small circles are there" gold: ask=count shape=circle size=small; read: question:count ask=count shape=circle size=small |
| held | command:snap | 4 | st1-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01598: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:sort | 4 | st1-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all)<br>st1-01489: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | command:groupBy | 4 | st1-00446: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01757: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01804: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all) |
| held | command:flip | 4 | st1-00760: "flip the diagram horizontally" gold: action=flip target=mention(quantifier=all) axis=horizontal; read: command:flip action=flip axis=horizontal target=mention(quantifier=all)<br>st1-00922: "flip the diagram vertically" gold: action=flip target=mention(quantifier=all) axis=vertical; read: command:flip action=flip axis=vertical target=mention(quantifier=all)<br>st1-01372: "flip the diagram vertically" gold: action=flip target=mention(quantifier=all) axis=vertical; read: command:flip action=flip axis=vertical target=mention(quantifier=all) |
| held | command:distribute | 3 | st1-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all)<br>st1-00809: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all)<br>st1-01144: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all) |
| held | (8 more keys; all in the JSON) | | |

**Structural holds** (0)

none

## t1raw / all (70 messages, 70 requested: right 66, wrong 4, not done 0, extras 0; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 0 |
| values/roles | 4 |
| calibration | 14 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 70); ok (ungated: right + would-be right of structural holds = right of every request executed: 66); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 4); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 0); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 66); ok (ungated wrong equals the score file: 4); ok (ungated extras equals the score file: 0); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 70); ok (gated: executed wrong equals the score file: 1); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 16); ok (gated: right executed equals the score file: 53); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 16)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 6 wrong or missing class value | model (class head) | 4 | 0 | 0 | 0 | 4 |

**t1raw / all, trigger seen** (4)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 4 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=brown outline=brown shape=square<br>st1-01174: "move the small stars right" gold: action=move target=mention(quantifier=all,shape=star,size=small) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=star)<br>st1-01772: "make the tiny squares gold" gold: action=set target=mention(quantifier=all,shape=square,size=tiny) color=gold; read: action=set color=gold target=mention(quantifier=all,shape=square) |

| cause | key | n | examples |
|---|---|---:|---|
| class | target | 3 | st1-01174: "move the small stars right" gold: action=move target=mention(quantifier=all,shape=star,size=small) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=star)<br>st1-01772: "make the tiny squares gold" gold: action=set target=mention(quantifier=all,shape=square,size=tiny) color=gold; read: action=set color=gold target=mention(quantifier=all,shape=square)<br>st1-02155: "move the big ellipses right" gold: action=move target=mention(quantifier=all,shape=ellipse,size=large) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=ellipse,size=tiny) |
| class | outline | 1 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=brown outline=brown shape=square |

### t1raw / all at the cost-10 threshold (0.8758)

Executed: right 53, wrong 1, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 16: right 13, wrong or extra 3. Unread 0.

**Executed wrong, by first cause** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 1 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: command:create action=create color=brown outline=brown shape=square (confidence 0.908; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | outline | 1 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: command:create action=create color=brown outline=brown shape=square |

**Right but held by confidence** (13)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 11 | st1-00423: "add a teal triangle" gold: action=create shape=triangle color=teal; read: command:create action=create color=teal shape=triangle<br>st1-00541: "add a green circle" gold: action=create shape=circle color=green; read: command:create action=create color=green shape=circle<br>st1-00729: "add a green star" gold: action=create shape=star color=green; read: command:create action=create color=green shape=star |
| held | command:fit | 1 | st1-01699: "fit the diagram to the screen" gold: action=fit target=mention(quantifier=all); read: command:fit action=fit target=mention(quantifier=all) |
| held | command:set | 1 | st1-01736: "make all the lines dashed" gold: action=set kind=edge style=dashed target=mention(quantifier=all); read: command:set action=set kind=edge style=dashed target=mention(quantifier=all) |

**Structural holds** (0)

none

## t1bs / all (1528 messages, 1528 requested: right 1404, wrong 124, not done 0, extras 0; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 0 |
| values/roles | 124 |
| calibration | 179 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1528); ok (ungated: right + would-be right of structural holds = right of every request executed: 1404); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 124); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 0); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 1404); ok (ungated wrong equals the score file: 124); ok (ungated extras equals the score file: 0); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 1528); ok (gated: executed wrong equals the score file: 33); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 237); ok (gated: right executed equals the score file: 1258); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 237)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 6 wrong or missing class value | model (class head) | 124 | 0 | 0 | 0 | 124 |

**t1bs / all, trigger seen** (124)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 124 | st1b-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1b-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1b-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle |

| cause | key | n | examples |
|---|---|---:|---|
| class | outline | 77 | st1b-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1b-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle<br>st1b-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=red outline=red shape=star |
| class | target | 46 | st1b-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1b-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1b-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown target=mention(quantifier=all,shape=hexagon) |
| class | color | 4 | st1b-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue shape=rectangle<br>st1b-01406: "make a cyan triangle with a navy border" gold: action=create shape=triangle color=cyan outline=navy; read: action=create color=navy outline=navy shape=triangle<br>st1b-01446: "draw a cyan ellipse with a black outline" gold: action=create shape=ellipse color=cyan outline=black; read: action=create color=black shape=ellipse |

### t1bs / all at the cost-10 threshold (0.8758)

Executed: right 1258, wrong 33, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 237: right 146, wrong or extra 91. Unread 0.

**Executed wrong, by first cause** (33)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 33 | st1b-00100: "draw a gold square with a black border" gold: action=create shape=square color=gold outline=black; read: command:create action=create color=gold outline=gold shape=square (confidence 0.920; wrong)<br>st1b-00164: "make Customs's border pink" gold: action=set target=customs outline=pink; read: command:set action=set target=customs (confidence 0.895; wrong)<br>st1b-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: command:create action=create color=black outline=black shape=hexagon (confidence 0.899; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | outline | 28 | st1b-00100: "draw a gold square with a black border" gold: action=create shape=square color=gold outline=black; read: command:create action=create color=gold outline=gold shape=square<br>st1b-00164: "make Customs's border pink" gold: action=set target=customs outline=pink; read: command:set action=set target=customs<br>st1b-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: command:create action=create color=black outline=black shape=hexagon |
| class | target | 4 | st1b-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1b-00681: "erase the tiny squares" gold: action=delete target=mention(quantifier=all,shape=square,size=tiny); read: command:delete action=delete target=mention(quantifier=all,shape=square)<br>st1b-01043: "make the large triangles purple" gold: action=set target=mention(quantifier=all,shape=triangle,size=large) color=purple; read: command:set action=set color=purple target=mention(quantifier=all,shape=triangle) |
| class | color | 1 | st1b-01406: "make a cyan triangle with a navy border" gold: action=create shape=triangle color=cyan outline=navy; read: command:create action=create color=navy outline=navy shape=triangle |

**Right but held by confidence** (146)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 90 | st1b-00000: "make a funnel of Clean, Source, Enrich, Archive and Loader" gold: action=create template=funnel items=clean,source,enrich,archive,loader; read: command:create action=create items=clean,source,enrich,archive,loader template=funnel<br>st1b-00001: "add a black circle" gold: action=create shape=circle color=black; read: command:create action=create color=black shape=circle<br>st1b-00054: "add a teal circle" gold: action=create shape=circle color=teal; read: command:create action=create color=teal shape=circle |
| held | command:set | 33 | st1b-00114: "make the arrow from Backlog to Todo teal" gold: action=set from=backlog to=todo color=teal; read: command:set action=set color=teal from=backlog to=todo<br>st1b-00117: "make Ops's outline navy" gold: action=set target=ops outline=navy; read: command:set action=set outline=navy target=ops<br>st1b-00130: "give Ticket9 a cyan border" gold: action=set target=ticket9 outline=cyan; read: command:set action=set outline=cyan target=ticket9 |
| held | question:count | 8 | st1b-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small<br>st1b-00250: "how many small circles are there" gold: ask=count shape=circle size=small; read: question:count ask=count shape=circle size=small<br>st1b-00614: "how many giant triangles are there" gold: ask=count shape=triangle size=huge; read: question:count ask=count shape=triangle size=huge |
| held | command:snap | 2 | st1b-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1b-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:equalize | 2 | st1b-00248: "make all the shapes the same color" gold: action=equalize target=mention(quantifier=all) property=color; read: command:equalize action=equalize property=color target=mention(quantifier=all)<br>st1b-01500: "make all the shapes the same size" gold: action=equalize target=mention(quantifier=all) property=size; read: command:equalize action=equalize property=size target=mention(quantifier=all) |
| held | command:sort | 2 | st1b-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1b-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | command:groupBy | 2 | st1b-00446: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1b-02110: "group the shapes by color" gold: action=groupby target=mention(quantifier=all) property=color; read: command:groupBy action=groupby property=color target=mention(quantifier=all) |
| held | command:flip | 2 | st1b-00760: "flip the diagram horizontally" gold: action=flip target=mention(quantifier=all) axis=horizontal; read: command:flip action=flip axis=horizontal target=mention(quantifier=all)<br>st1b-00922: "flip the diagram vertically" gold: action=flip target=mention(quantifier=all) axis=vertical; read: command:flip action=flip axis=vertical target=mention(quantifier=all) |
| held | (5 more keys; all in the JSON) | | |

**Structural holds** (0)

none

## short3s / all (333 messages, 424 requested: right 250, wrong 127, not done 47, extras 42; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 23 |
| actions | 68 |
| values/roles | 125 |
| calibration | 144 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 424); ok (ungated: right + would-be right of structural holds = right of every request executed: 250); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 127); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 42); ok (ungated: unread = requested - paired: 47); ok (ungated right equals the score file: 250); ok (ungated wrong equals the score file: 121); ok (ungated extras equals the score file: 41); ok (ungated unread equals the score file: 47); ok (ungated structural holds equal the score file: 7); ok (every produced request is executed, structurally held or (gated) confidence-held: 419); ok (gated: executed wrong equals the score file: 6); ok (gated: executed extras equals the score file: 2); ok (gated: structural holds equal the score file: 7); ok (gated: confidence holds equal the score file: 290); ok (gated: right executed equals the score file: 114); ok (gated: unread equals the score file: 47); ok (gated: held right + held wrong or extra = confidence holds: 290)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 15 | 0 | 0 | 8 | 23 |
| 4 wrong act | model (act head) | 46 | 22 | 0 | 0 | 68 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 7 | 0 | 0 | 0 | 7 |
| 6 wrong or missing class value | model (class head) | 44 | 8 | 0 | 0 | 52 |
| 7 wrong words tagged for a name / text key | model (token head) | 54 | 12 | 0 | 0 | 66 |

**short3s / all, trigger seen** (166)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 15 | s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done (only a part of the span is a unit)<br>s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: action=set color=gray (merged: the unit holds 2 requests)<br>s3-0122: "except Done which is red" gold: action=set target=done color=red; read: not done (merged or split: a unit of the same act on the span was paired to another request) |
| 4 wrong act | model (act head) | 46 | s3-0087: "Begin instead of Start" gold: action=rename target=start name=begin; read: not done (read as command:reverse)<br>s3-0087: "Begin instead of Start" gold: requested: Begin instead of Start; read: extra command:reverse action=reverse target=begin,start (read as command:reverse where command:rename is requested)<br>s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: not done (read as command:create) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 7 | s3-0193: "also bigger" gold: action=resize target=check; read: action=resize (a name written in another request or by a pronoun)<br>s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done (a name written in another request or by a pronoun)<br>s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 44 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move<br>s3-0005: "dotted line process to done" gold: action=connect from=process to=done style=dotted arrow=none; read: action=connect arrow=none from=mention() style=dotted |
| 7 wrong words tagged for a name / text key | model (token head) | 54 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=process<br>s3-0033: "reverse direction on check→done" gold: action=reverse from=check to=done; read: action=reverse target=mention(quantifier=all) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 4 | s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: action=set color=gray<br>s3-0122: "except Done which is red" gold: action=set target=done color=red; read: not done<br>s3-0264: "start gold" gold: action=set target=start color=gold; read: not done |
| cut | (command:create) | 3 | s3-0146: "create Api" gold: action=create shape=square name=api; read: not done<br>s3-0146: "Db squares" gold: action=create shape=square name=db; read: not done<br>s3-0252: "add Sub1" gold: action=create name=sub1 position=below anchor=process; read: not done |
| cut | (command:straighten) | 1 | s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done |
| cut | (command:toFront) | 1 | s3-0131: "done on top" gold: action=tofront target=done; read: not done |
| cut | (command:undo) | 1 | s3-0137: "undo" gold: action=undo; read: not done |
| cut | (command:connect) | 1 | s3-0200: "connect check to start" gold: action=connect from=check to=start; read: not done |
| cut | (command:rename) | 1 | s3-0305: "named Gate" gold: action=rename target=check name=gate; read: not done |
| cut | (question:property) | 1 | s3-0333: "where is it" gold: ask=property target=intake property=position; read: not done |
| act | command:arrange read as command:create | 4 | s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: not done<br>s3-0093: "make a timeline with Start Process Check Done" gold: requested: make a timeline with Start Process Check Done; read: extra command:create action=create items=start process check,done template=timeline<br>s3-0264: "radial around start" gold: action=arrange layout=radial anchor=start; read: not done |
| act | command:rename read as command:reverse | 2 | s3-0087: "Begin instead of Start" gold: action=rename target=start name=begin; read: not done<br>s3-0087: "Begin instead of Start" gold: requested: Begin instead of Start; read: extra command:reverse action=reverse target=begin,start |
| act | command:ungroup read as command:delete | 2 | s3-0095: "take Start out of the group" gold: action=ungroup target=start; read: not done<br>s3-0095: "take Start out of the group" gold: requested: take Start out of the group; read: extra command:delete action=delete target=start |
| act | command:group read as command:create | 2 | s3-0103: "group check and done" gold: action=group target=check,done; read: not done<br>s3-0103: "group check" gold: requested: group check and done; read: extra command:create action=create |
| act | command:delete read as command:create | 2 | s3-0113: "bin done" gold: action=delete target=done; read: not done<br>s3-0113: "bin done" gold: requested: bin done; read: extra command:create action=create label=done name=bin |
| act | command:resize read as command:create | 2 | s3-0131: "check smaller" gold: action=resize target=check; read: not done<br>s3-0131: "done on top, check smaller" gold: requested: check smaller; read: extra command:create action=create |
| act | command:set read as question:check | 2 | s3-0156: "check purple" gold: action=set target=check color=purple; read: not done<br>s3-0156: "check purple" gold: requested: check purple; read: extra question:check ask=check color=purple |
| act | command:arrange read as question:help | 2 | s3-0215: "show the four shapes as a timeline" gold: action=arrange template=timeline target=mention(quantifier=all); read: not done<br>s3-0215: "show the four shapes as a timeline" gold: requested: show the four shapes as a timeline; read: extra question:help ask=help |
| ref | target | 4 | s3-0193: "also bigger" gold: action=resize target=check; read: action=resize<br>s3-0266: "make it a star" gold: action=set target=end shape=star; read: action=set shape=star target=done<br>s3-0303: "align all three" gold: action=align target=start,check,done; read: action=align |
| ref | from | 2 | s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip |
| ref | to | 2 | s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip |
| class | layout | 10 | s3-0098: "four squares stacked on the left" gold: action=create count=4 shape=square layout=column position=left; read: action=create count=4 layout=row position=left shape=square<br>s3-0166: "add a 3 by 3 grid of small squares" gold: action=create count=9 shape=square size=small layout=grid; read: action=create shape=square<br>s3-0168: "draw 4 green circles in a line along the top" gold: action=create count=4 shape=circle color=green layout=row position=top; read: action=create color=green count=4 position=top shape=circle |
| class | target | 8 | s3-0044: "the diagram looks messy can you fix it" gold: action=improve target=mention(quantifier=all); read: action=improve target=mention()<br>s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0159: "kill the circle I just made" gold: action=delete target=mention(recency=newest,shape=circle); read: action=delete target=mention(shape=circle) |
| class | template | 7 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: action=create color=blue<br>s3-0240: "pyramid with 3 levels" gold: action=create template=pyramid count=3; read: action=create count=3 layout=row |
| class | position | 6 | s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5<br>s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: action=move target=done |
| class | shape | 4 | s3-0022: "square top left" gold: action=create shape=square position=topleft; read: action=create position=topleft<br>s3-0163: "Draw 6 small stars in a circle." gold: action=create count=6 shape=star size=small layout=circle; read: action=create count=6 layout=circle shape=circle size=small<br>s3-0169: "add a gold triangel at 200 300" gold: action=create shape=triangle color=gold at=200,300; read: action=create at=200,300 color=gold shape=diamond |
| class | direction | 2 | s3-0179: "check up 40px pls" gold: action=move target=check direction=up distance=40; read: action=move distance=40<br>s3-0357: "Start right by 50" gold: action=move target=start direction=right distance=50; read: action=move distance=50 target=start |
| class | arrow | 2 | s3-0330: "connect done to start, two-way, red" gold: action=connect from=done to=start arrow=both color=red; read: action=connect color=red<br>s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: action=connect color=gray from=process to=done |
| class | fill | 1 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle |
| name | target | 24 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0057: "red for check" gold: action=set target=check color=red; read: action=set color=red<br>s3-0076: "recolor start to navy" gold: action=set target=start color=navy; read: action=set color=navy |
| name | from | 18 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=process<br>s3-0033: "reverse direction on check→done" gold: action=reverse from=check to=done; read: action=reverse target=mention(quantifier=all)<br>s3-0123: "link check and start" gold: action=connect from=check to=start; read: action=connect |
| name | to | 16 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=process<br>s3-0033: "reverse direction on check→done" gold: action=reverse from=check to=done; read: action=reverse target=mention(quantifier=all)<br>s3-0123: "link check and start" gold: action=connect from=check to=start; read: action=connect |
| name | name | 4 | s3-0109: "add circle X at 100,100" gold: action=create shape=circle name=x at=100,100; read: action=create at=100,100 shape=circle<br>s3-0109: "circle Y at 700,100" gold: action=create shape=circle name=y at=700,100; read: action=create at=700,100 shape=circle<br>s3-0194: "can you call Done "Finish" instead" gold: action=rename target=done name=finish; read: action=rename target=done |
| name | about | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: ask=help aspect=can topic=text<br>s3-0236: "what does SOP Lang mean" gold: ask=help about=sop lang; read: ask=help |
| name | scale | 1 | s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |
| name | count | 1 | s3-0188: "undo the last 2 changes" gold: action=undo count=2; read: action=undo |
| name | items | 1 | s3-0263: "draw a venn with two circles A and B" gold: action=create template=venn items=a,b; read: action=create count=2 name=a shape=circle template=venn |
| cut | (2 more keys; all in the JSON) | | |
| act | (14 more keys; all in the JSON) | | |
| class | (8 more keys; all in the JSON) | | |
| name | (1 more keys; all in the JSON) | | |

**short3s / all, trigger unseen** (42)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 22 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done (read as command:move)<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:move action=move (read as command:move where question:check is requested)<br>s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: not done (read as command:create) |
| 6 wrong or missing class value | model (class head) | 8 | s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create<br>s3-0155: "which colors can i use" gold: ask=help topic=color aspect=values; read: ask=help aspect=values topic=size<br>s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black target=outline |
| 7 wrong words tagged for a name / text key | model (token head) | 12 | s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 items=core template=hub<br>s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=process<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label label=end |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:set read as command:create | 4 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: not done<br>s3-0079: "hexagon for start" gold: requested: hexagon for start; read: extra command:create action=create<br>s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done |
| act | command:set read as command:label | 4 | s3-0181: "no border on start" gold: action=set target=start outline=none; read: not done<br>s3-0181: "no border on start" gold: requested: no border on start; read: extra command:label action=label label= target=start<br>s3-0322: "take the border off process" gold: action=set target=process outline=none; read: not done |
| act | question:check read as command:move | 2 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:move action=move |
| act | command:set read as question:cycle | 2 | s3-0193: "check pink" gold: action=set target=check color=pink; read: not done<br>s3-0193: "check" gold: requested: check pink; read: extra question:cycle ask=cycle |
| act | command:align read as command:arrange | 2 | s3-0203: "put start process and check on one line" gold: action=align target=start,process,check; read: not done<br>s3-0203: "put start process and check on one line" gold: requested: put start process and check on one line; read: extra command:arrange action=arrange target=process,check |
| act | command:resize read as question:property | 2 | s3-0365: "double check's size" gold: action=resize target=check; read: not done<br>s3-0365: "double check's size" gold: requested: double check's size; read: extra question:property ask=property property=size |
| act | question:groupOf read as question:neighbors | 2 | s3-0493: "start belongs to which group" gold: ask=groupof target=start; read: not done<br>s3-0493: "start belongs to which group" gold: requested: start belongs to which group; read: extra question:neighbors ask=neighbors target=start |
| act | command:move read as command:toFront | 2 | s3-0516: "start should be on top" gold: action=move target=start position=top; read: not done<br>s3-0516: "start should be on top" gold: requested: start should be on top; read: extra command:toFront action=tofront target=start |
| class | outline | 3 | s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black target=outline<br>s3-0170: "outline done black" gold: action=set target=done outline=black; read: action=set color=black target=outline<br>s3-0354: "make the outline of check orange" gold: action=set target=check outline=orange; read: action=set color=orange target=check |
| class | topic | 2 | s3-0155: "which colors can i use" gold: ask=help topic=color aspect=values; read: ask=help aspect=values topic=size<br>s3-0294: "what can you do with arrows?" gold: ask=help topic=connections; read: ask=help |
| class | template | 1 | s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create |
| class | position | 1 | s3-0494: "all circles over to the left" gold: action=move target=mention(quantifier=all,shape=circle) position=left; read: action=move direction=left target=mention(quantifier=all,shape=circle) |
| class | layout | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange |
| class | direction | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange |
| name | target | 7 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=process<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label label=end<br>s3-0204: "process medium" gold: action=set target=process size=medium; read: action=set size=medium |
| name | label | 2 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=process<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | from | 2 | s3-0348: "check -> done should be labeled yes" gold: action=label from=check to=done label=yes; read: action=label label=yes to=done<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | title | 1 | s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 items=core template=hub |
| name | to | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | count | 1 | s3-0396: "twelve circles in a circle" gold: action=create count=12 shape=circle layout=circle; read: action=create layout=circle shape=circle |
| name | linked | 1 | s3-0422: "Done and Start are connected" gold: target=done linked=start; read: target=done |
| act | (1 more keys; all in the JSON) | | |

**short3s / all, trigger no request** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 8 | s3-0119: "tidy the arrows" gold: -; read: extra command:arrange action=arrange (partial overlap with a requested action: 43% of it)<br>s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (partial overlap with a requested action: 40% of it)<br>s3-0160: "Could you" gold: -; read: extra command:create action=create (partial overlap with a requested action: 16% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 4 | s3-0160: "Could you" gold: -; read: extra command:create action=create<br>s3-0311: "Code" gold: -; read: extra command:create action=create name=code<br>s3-0311: "Data" gold: -; read: extra command:create action=create name=data |
| cut | command:arrange | 2 | s3-0119: "tidy the arrows" gold: -; read: extra command:arrange action=arrange<br>s3-0423: "done horizontally" gold: -; read: extra command:arrange action=arrange axis=horizontal |
| cut | command:set | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db |
| cut | command:respace | 1 | s3-0339: "make the spacing" gold: -; read: extra command:respace action=respace comparison=bigger target=mention(quantifier=all) |

### short3s / all at the cost-10 threshold (0.8758)

Executed: right 114, wrong 6, extras 2. Structural holds 7 ({"blocked":6,"dependency":1}; 0 of them would have been right). Confidence holds 290: right 136, wrong or extra 154. Unread 47.

**Executed wrong, by first cause** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (confidence 0.892; extra) |
| 4 wrong act | model (act head) | 1 | s3-0095: "take Start out of the group" gold: -; read: extra command:delete action=delete target=start (confidence 0.911; extra) |
| 6 wrong or missing class value | model (class head) | 2 | s3-0169: "add a gold triangel at 200 300" gold: action=create shape=triangle color=gold at=200,300; read: command:create action=create at=200,300 color=gold shape=diamond (confidence 0.956; wrong)<br>s3-0268: "add a row of 5 orange rectangles along the bottom edge" gold: action=create count=5 shape=rectangle color=orange layout=row position=bottom; read: command:create action=create color=orange count=5 position=bottom shape=rectangle (confidence 0.956; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 4 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can topic=text (confidence 0.994; wrong)<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db (confidence 0.972; wrong)<br>s3-0188: "undo the last 2 changes" gold: action=undo count=2; read: command:undo action=undo (confidence 0.886; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:set | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db |
| act | command:ungroup read as command:delete | 1 | s3-0095: "take Start out of the group" gold: -; read: extra command:delete action=delete target=start |
| class | shape | 1 | s3-0169: "add a gold triangel at 200 300" gold: action=create shape=triangle color=gold at=200,300; read: command:create action=create at=200,300 color=gold shape=diamond |
| class | layout | 1 | s3-0268: "add a row of 5 orange rectangles along the bottom edge" gold: action=create count=5 shape=rectangle color=orange layout=row position=bottom; read: command:create action=create color=orange count=5 position=bottom shape=rectangle |
| name | to | 2 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db<br>s3-0261: "connect Check to Fail with label "no"" gold: action=connect from=check to=$new label=no; read: command:connect action=connect from=check label=no to=fail |
| name | about | 1 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can topic=text |
| name | from | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |
| name | count | 1 | s3-0188: "undo the last 2 changes" gold: action=undo count=2; read: command:undo action=undo |

**Right but held by confidence** (136)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 19 | s3-0018: "process steps: Plan, Build, Test, Ship" gold: action=create template=process items=plan,build,test,ship; read: command:create action=create items=plan,build,test,ship template=process<br>s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: command:create action=create count=4 template=steps<br>s3-0025: "draw circle Hub center" gold: action=create shape=circle name=hub position=center; read: command:create action=create name=hub position=center shape=circle |
| held | command:set | 12 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: command:set action=set outline=white target=mention(quantifier=all,shape=circle)<br>s3-0225: "make all shapes tiny" gold: action=set target=mention(quantifier=all) size=tiny; read: command:set action=set size=tiny target=mention(quantifier=all)<br>s3-0265: "start → hexagon" gold: action=set target=start shape=hexagon; read: command:set action=set shape=hexagon target=start |
| held | command:move | 11 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: command:move action=move position=center target=check<br>s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: command:move action=move anchor=process position=below target=check<br>s3-0082: "move it right" gold: action=move target=check direction=right; read: command:move action=move direction=right target=check |
| held | command:resize | 10 | s3-0082: "make check smaller" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0257: "Process smaller" gold: action=resize target=process; read: command:resize action=resize target=process<br>s3-0297: "smaller" gold: action=resize; read: command:resize action=resize |
| held | command:arrange | 9 | s3-0017: "arrange it like an org chart" gold: action=arrange layout=tree; read: command:arrange action=arrange layout=tree<br>s3-0040: "radial layout around Check" gold: action=arrange layout=radial anchor=check; read: command:arrange action=arrange anchor=check layout=radial<br>s3-0136: "put all shapes in a row" gold: action=arrange target=mention(quantifier=all) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all) |
| held | command:connect | 8 | s3-0025: "connect Hub to Start Process Check Done" gold: action=connect from=$new to=start,process,check,done; read: command:connect action=connect from=$new to=start,process,check,done<br>s3-0037: "link Warn to Done dashed" gold: action=connect from=$new to=done style=dashed; read: command:connect action=connect from=$new style=dashed to=done<br>s3-0109: "join them" gold: action=connect from=$new to=$new; read: command:connect action=connect from=$new to=$new |
| held | command:label | 6 | s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: command:label action=label from=check label=approved to=done<br>s3-0348: "check -> process should be labeled no" gold: action=label from=check to=process label=no; read: command:label action=label from=check label=no to=process<br>s3-0371: "label the yellow diamond "decision"" gold: action=label target=mention(color=yellow,shape=diamond) label=decision; read: command:label action=label label=decision target=mention(color=yellow,shape=diamond) |
| held | command:delete | 6 | s3-0013: "remove process" gold: action=delete target=process; read: command:delete action=delete target=process<br>s3-0086: "get rid of the yellow diamond" gold: action=delete target=mention(color=yellow,shape=diamond); read: command:delete action=delete target=mention(color=yellow,shape=diamond)<br>s3-0263: "clear the canvas" gold: action=delete target=mention(quantifier=all); read: command:delete action=delete target=mention(quantifier=all) |
| held | (23 more keys; all in the JSON) | | |

**Structural holds** (7)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 4 | s3-0063: "swot matrix" gold: action=create template=matrix; read: command:create action=create<br>s3-0262: "text on the check to done arrow" gold: -; read: command:connect action=connect<br>s3-0263: "draw a venn with two circles A and B" gold: action=create template=venn items=a,b; read: command:create action=create count=2 name=a shape=circle template=venn |
| blocked | unresolved-reference | 2 | s3-0340: "group start and process, call it Intake," gold: action=group target=start,process name=intake; read: command:group action=group name=intake<br>s3-0350: "trade places start, done" gold: action=swap target=done,start; read: command:swap action=swap |

## Notes

- no oracle (round trip) given or found beside the training data: cause 1 is only assigned for keys the layout does not read; "not measured" is not "0"
- views: every view of the campaign is read against one teacher's labels; the oracle (cause 1) is not measured for these views except through the keys the layout does not read
