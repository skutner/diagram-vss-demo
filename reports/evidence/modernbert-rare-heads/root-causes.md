# Root causes (truthful_v1): modernbert (c7b1c8182cb4)

Score: `/home/skutner/.cache/diagram-vss-modernbert/rare-heads-2026-11-09/W-s0/bundle/eval/score.truthful.json`; training data: `/home/skutner/.cache/diagram-vss-modernbert/forms-2026-11-08/data-v2/F`; oracle: none.

Each request that is not right and each extra gets the first cause that explains it (as root_causes.mjs); the causes are then grouped in the plan's categories. truthful_v1 compares the resize direction and explicit scale and the text keys (presence and exact value) beside the pairing; a written description is not called an unwritten reference (needsKeysV1).

## fresh2_test / test (405 messages, 1313 requested: right 1110, wrong 171, not done 32, extras 82; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 93 |
| actions | 38 |
| values/roles | 154 |
| calibration | 575 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1313); ok (ungated: right + would-be right of structural holds = right of every request executed: 1110); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 171); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 82); ok (ungated: unread = requested - paired: 32); ok (ungated right equals the score file: 1108); ok (ungated wrong equals the score file: 166); ok (ungated extras equals the score file: 75); ok (ungated unread equals the score file: 32); ok (ungated structural holds equal the score file: 14); ok (every produced request is executed, structurally held or (gated) confidence-held: 1363); ok (gated: executed wrong equals the score file: 3); ok (gated: executed extras equals the score file: 4); ok (gated: structural holds equal the score file: 14); ok (gated: confidence holds equal the score file: 802); ok (gated: right executed equals the score file: 540); ok (gated: unread equals the score file: 32); ok (gated: held right + held wrong or extra = confidence holds: 802)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 24 | 5 | 0 | 27 | 56 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 37 | 37 |
| 4 wrong act | model (act head) | 24 | 14 | 0 | 0 | 38 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 105 | 7 | 0 | 0 | 112 |
| 6 wrong or missing class value | model (class head) | 19 | 0 | 0 | 0 | 19 |
| 7 wrong words tagged for a name / text key | model (token head) | 22 | 1 | 0 | 0 | 23 |

**fresh2_test / test, trigger seen** (194)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 24 | fo-0023: "Sw1 is connecting to R1" gold: action=connect from=sw1 to=r1 arrow=none; read: not done (merged into a unit with another request)<br>fo-0032: "All rectangles should be orange. Actually only Eks and Ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(quantifier=all,shape=rectangle) (the unit covers 41% of the span)<br>fo-0066: "NewService reads from Db, connect those too" gold: action=connect from=newservice to=db; read: action=connect from=newservice to=newservice (the unit covers 40% of the span) |
| 4 wrong act | model (act head) | 24 | fo-0090: "If yes please disconnect" gold: action=disconnect from=authsvc to=db; read: not done (read as command:delete)<br>fo-0090: "please disconnect" gold: requested: If yes please disconnect; read: extra command:delete action=delete (read as command:delete where command:disconnect is requested)<br>fo-0125: "MinBtn, MaxBtn and CloseBtn go at the top right" gold: action=move target=minbtn,maxbtn,closebtn position=topright; read: not done (read as command:arrange) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 105 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof (a name written in another request or by a pronoun)<br>fo-0010: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo (a name written in another request or by a pronoun)<br>fo-0010: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 19 | fo-0025: "arange Raw, Staged, Curated and Mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart<br>fo-0087: "I want Wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake<br>fo-0189: "Make every circle that isn't green blue" gold: action=set target=mention(notcolor=green,quantifier=all,shape=circle) color=blue; read: action=set color=green target=mention(notcolor=green,quantifier=all,shape=circle) |
| 7 wrong words tagged for a name / text key | model (token head) | 22 | fo-0012: "hook the copies up to Alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0034: "line Svc1 Svc2 and Svc3 up verticaly" gold: action=align target=svc1,svc2,svc3 axis=vertical; read: action=align axis=vertical target=svc1,svc3 |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 7 | fo-0032: "All rectangles should be orange. Actually only Eks and Ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(quantifier=all,shape=rectangle)<br>fo-0125: "gray" gold: action=set target=statusbar color=gray; read: not done<br>fo-0191: "please recolour her" gold: action=set target=aunt color=purple; read: not done |
| cut | (command:connect) | 4 | fo-0023: "Sw1 is connecting to R1" gold: action=connect from=sw1 to=r1 arrow=none; read: not done<br>fo-0066: "NewService reads from Db, connect those too" gold: action=connect from=newservice to=db; read: action=connect from=newservice to=newservice<br>fo-0147: "Connected go to Ended and Ended return to Idle" gold: action=connect from=connected,ended,idle; read: action=connect from=connected to=ended |
| cut | (question:property) | 2 | fo-0221: "where Saturn is on this thing" gold: ask=property target=saturn property=position; read: not done<br>fo-0524: "How big is it" gold: ask=property target=sunflower property=size; read: ask=property property=size |
| cut | (command:create) | 2 | fo-0237: "put 5 tiny gray sqaures between Mars and... hmm there's nothing after Mars yet. ok just put them to the right…" gold: action=create shape=square size=tiny color=gray count=5 position=rightof anchor=$new; read: action=create anchor=$new color=gray count=5 position=between shape=circle size=tiny<br>fo-0524: "Can you put three small yellow stars underneath it? Those are the kids' plants. hmm actually I meant five, no…" gold: action=create shape=star color=yellow size=small count=5 position=below anchor=sunflower; read: action=create color=yellow count=3 shape=star size=small |
| cut | (command:resize) | 2 | fo-0271: "can u make Fish a lil bigger" gold: action=resize target=fish; read: not done<br>fo-0328: "The Kitchen is too big, shrink it" gold: action=resize target=kitchen; read: action=resize target=bed2 |
| cut | (question:degree) | 1 | fo-0104: "Is Rds connected to anything" gold: ask=degree target=rds; read: not done |
| cut | (command:swap) | 1 | fo-0105: "Charging and Discharging are the wrong way round, flip them" gold: action=swap target=charging,discharging; read: not done |
| cut | (fact:) | 1 | fo-0185: "Sis is pink" gold: target=sis color=pink; read: not done |
| act | fact: read as command:set | 6 | fo-0275: "Fog is an ellipse" gold: target=fog shape=ellipse; read: not done<br>fo-0275: "Fog is an ellipse, not a circle" gold: requested: Fog is an ellipse; read: extra command:set action=set shape=ellipse target=fog<br>fo-0500: "it's actually navy" gold: target=yarn color=navy; read: not done |
| act | command:disconnect read as command:delete | 2 | fo-0090: "If yes please disconnect" gold: action=disconnect from=authsvc to=db; read: not done<br>fo-0090: "please disconnect" gold: requested: If yes please disconnect; read: extra command:delete action=delete |
| act | command:move read as command:create | 2 | fo-0125: "StatusBar at the bottom" gold: action=move target=statusbar position=bottom; read: not done<br>fo-0125: "StatusBar at the bottom, gray" gold: requested: StatusBar at the bottom; read: extra command:create action=create color=gray position=bottom |
| act | command:set read as fact: | 2 | fo-0147: "Color for Connected is green" gold: action=set target=connected color=green; read: not done<br>fo-0147: "Color for Connected is green" gold: requested: Color for Connected is green; read: extra fact: color=green target=connected |
| act | rule: read as command:set | 2 | fo-0214: "I want all circles to be small by default, from now on" gold: shape=circle size=small; read: not done<br>fo-0214: "I want all circles to be small" gold: requested: I want all circles to be small by default, from now on; read: extra command:set action=set size=small target=mention(quantifier=all,shape=circle) |
| act | fact: read as command:create | 2 | fo-0415: "The big rectangle in the corner is Bed1, it's blue" gold: target=bed1 shape=rectangle color=blue; read: not done<br>fo-0415: "The big rectangle in the corner is Bed1, it's blue" gold: requested: The big rectangle in the corner is Bed1, it's blue; read: extra command:create action=create color=blue name=bed1 |
| act | command:arrange read as command:align | 2 | fo-0459: "Then line up all four boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done<br>fo-0459: "line up all four boxes in a row" gold: requested: Then line up all four boxes in a row; read: extra command:align action=align axis=horizontal target=mention(quantifier=all) |
| act | question:degree read as question:neighbors | 2 | fo-0460: "Is Closing linked to anything yet" gold: ask=degree target=closing; read: not done<br>fo-0460: "Is Closing linked to anything" gold: requested: Is Closing linked to anything yet; read: extra question:neighbors ask=neighbors target=closing |
| ref | target | 76 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof<br>fo-0010: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo<br>fo-0010: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo |
| ref | from | 11 | fo-0025: "conect them each to the next" gold: action=connect from=raw,staged,curated,mart; read: action=connect pairing=next<br>fo-0035: "disconnect it from Spine1 and Spine2" gold: action=disconnect from=leaf4 to=spine1,spine2; read: action=disconnect from=mention(quantifier=all,shape=square) to=spine1,spine2<br>fo-0076: "All three consumers -> Aggregator" gold: action=connect from=consumer1,consumer2,consumer3 to=aggregator; read: action=connect to=aggregator |
| ref | to | 10 | fo-0020: "disconnect them" gold: action=disconnect from=audit to=load; read: action=disconnect from=audit to=audit<br>fo-0035: "Same for Spine2" gold: action=connect from=spine2 to=leaf1,leaf2,leaf3,leaf4; read: action=connect<br>fo-0055: "Connect CoreSw to each of them" gold: action=connect from=coresw to=vlan10,vlan20,vlan30; read: action=connect from=coresw |
| ref | anchor | 10 | fo-0168: "put Grandma above both of them" gold: action=move target=grandma position=above anchor=mom,uncle; read: action=move anchor=mom position=above target=grandma<br>fo-0190: "move it there" gold: action=move target=frog position=rightof anchor=grasshopper; read: action=move anchor=$new position=between target=$new<br>fo-0192: "what's farthest from it" gold: ask=nearest anchor=earth superlative=farthest; read: ask=nearest superlative=farthest |
| class | color | 8 | fo-0189: "Make every circle that isn't green blue" gold: action=set target=mention(notcolor=green,quantifier=all,shape=circle) color=blue; read: action=set color=green target=mention(notcolor=green,quantifier=all,shape=circle)<br>fo-0223: "please add a red rectangle named Mum to the left of Dad. actualy make it pink" gold: action=create shape=rectangle color=pink name=mum position=leftof anchor=dad; read: action=create anchor=dad color=red name=mum position=leftof shape=rectangle<br>fo-0223: "make every rectangle that's not gray white" gold: action=set target=mention(notcolor=gray,quantifier=all,shape=rectangle) color=white; read: action=set color=gray target=mention(notcolor=gray,quantifier=all,shape=rectangle) |
| class | target | 5 | fo-0315: "the little square near the hall, can you send it to the back" gold: action=toback target=mention(shape=square); read: action=toback<br>fo-0317: "Lose red" gold: action=set target=lose color=red; read: action=set color=red target=mention()<br>fo-0342: "move them all to the right side" gold: action=move target=mention(color=pink,quantifier=all) position=right; read: action=move direction=right position=right target=mention(quantifier=all) |
| class | shape | 4 | fo-0087: "I want Wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake<br>fo-0329: "If not, add one near Customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=customs position=near<br>fo-0414: "make one below Done and call it Release" gold: action=create shape=square color=green name=release position=below anchor=done; read: action=create anchor=done name=release position=below |
| class | position | 3 | fo-0204: "can you add a blue triangle named Drop under the cloud. wait no not triangle, a diamond" gold: action=create shape=diamond color=blue name=drop position=below anchor=cloud; read: action=create color=blue name=drop shape=diamond<br>fo-0342: "and shove the newest square there too" gold: action=move target=mention(recency=newest,shape=square) position=right; read: action=move target=mention(recency=newest,shape=square)<br>fo-0539: "what is Bass next to" gold: ask=list position=near anchor=bass; read: ask=list |
| class | layout | 1 | fo-0025: "arange Raw, Staged, Curated and Mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart |
| name | to | 9 | fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0052: "Connect Scheduler to Worker and the copies" gold: action=connect from=scheduler to=worker,$new; read: action=connect from=scheduler to=worker<br>fo-0081: "Closing back to Closed" gold: action=connect from=closing to=closed; read: action=connect from=closing |
| name | from | 8 | fo-0012: "hook the copies up to Alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: action=connect from=laptop to=nas |
| name | target | 6 | fo-0034: "line Svc1 Svc2 and Svc3 up verticaly" gold: action=align target=svc1,svc2,svc3 axis=vertical; read: action=align axis=vertical target=svc1,svc3<br>fo-0052: "arrange Worker and the copies in a column to the right of Scheduler" gold: action=arrange target=worker,$new layout=column; read: action=arrange layout=column<br>fo-0222: "what about Zooplankton and Tuna" gold: ask=connected target=tuna anchor=zooplankton; read: ask=connected target=tuna,zooplankton |
| name | anchor | 2 | fo-0222: "what about Zooplankton and Tuna" gold: ask=connected target=tuna anchor=zooplankton; read: ask=connected target=tuna,zooplankton<br>fo-0318: "Add a new rectangle called Blocked under Doing, no wait, to the right of Done" gold: action=create shape=rectangle name=blocked position=rightof anchor=done; read: action=create anchor=doing,done name=blocked position=rightof shape=rectangle |
| name | name | 1 | fo-0049: "Add a white square named Pc1 next to Router. Wait, call it Laptop, not Pc1" gold: action=create shape=square color=white name=laptop position=near anchor=router; read: action=create anchor=router color=white name=pc1 position=near shape=square |
| name | count | 1 | fo-0333: "Add six small pink circles around Floor... no, make it eight" gold: action=create shape=circle size=small color=pink count=8 position=near anchor=$new; read: action=create anchor=$new color=pink count=6 position=near shape=circle size=small |
| cut | (4 more keys; all in the JSON) | | |
| act | (3 more keys; all in the JSON) | | |

**fresh2_test / test, trigger unseen** (27)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 5 | fo-0104: "did I make Igw a circle" gold: ask=check target=igw shape=circle; read: not done (lost: no unit on the span)<br>fo-0116: "below Dataflow" gold: action=move target=gcs position=below anchor=dataflow; read: not done (merged into a unit with another request)<br>fo-0497: "Milk to Foam, and Foam into Cup too" gold: action=connect from=milk,foam,cup; read: action=connect from=foam to=cup (the unit covers 49% of the span) |
| 4 wrong act | model (act head) | 14 | fo-0184: "Plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done (read as command:create)<br>fo-0184: "Plants belwo it" gold: requested: Plants belwo it; read: extra command:create action=create (read as command:create where command:move is requested)<br>fo-0210: "Coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done (read as command:connect) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 7 | fo-0076: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers (a name written in another request or by a pronoun)<br>fo-0113: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple (a name written in another request or by a pronoun)<br>fo-0144: "I want Broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2 (a name written in another request or by a pronoun) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | fo-0107: "Thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:move) | 2 | fo-0116: "below Dataflow" gold: action=move target=gcs position=below anchor=dataflow; read: not done<br>fo-0534: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move position=right |
| cut | (command:connect) | 2 | fo-0497: "Milk to Foam, and Foam into Cup too" gold: action=connect from=milk,foam,cup; read: action=connect from=foam to=cup<br>fo-0577: "Pump into Filter. Filter into Uv. Uv into Waterfall. Waterfall into Pond" gold: action=connect from=pump,filter,uv,waterfall,pond; read: action=connect from=waterfall to=pond |
| cut | (question:check) | 1 | fo-0104: "did I make Igw a circle" gold: ask=check target=igw shape=circle; read: not done |
| act | question:degree read as question:count | 4 | fo-0335: "How many shapes are connected to Score" gold: ask=degree target=score; read: not done<br>fo-0335: "How many shapes are connected to Score" gold: requested: How many shapes are connected to Score; read: extra question:count ask=count linked=score<br>fo-0462: "How many shapes are connected to Coding" gold: ask=degree target=coding; read: not done |
| act | question:extreme read as question:check | 4 | fo-0554: "Is Teardown the last one on the right" gold: ask=extreme superlative=rightmost; read: not done<br>fo-0554: "Is Teardown the last one on the right" gold: requested: Is Teardown the last one on the right; read: extra question:check ask=check position=right target=mention()<br>fo-0594: "Is Scene4 the last one at the bottom" gold: ask=extreme superlative=bottommost; read: not done |
| act | command:move read as command:create | 2 | fo-0184: "Plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done<br>fo-0184: "Plants belwo it" gold: requested: Plants belwo it; read: extra command:create action=create |
| act | command:rename read as command:connect | 2 | fo-0210: "Coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done<br>fo-0210: "Coach2 to Seniors" gold: requested: Coach2 to Seniors; read: extra command:connect action=connect from=coach2 to=seniors |
| act | question:rules read as question:count | 2 | fo-0595: "how many rules do I have now" gold: ask=rules; read: not done<br>fo-0595: "how many rules do I have now" gold: requested: how many rules do I have now; read: extra question:count ask=count |
| ref | anchor | 4 | fo-0144: "I want Broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2<br>fo-0184: "Genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: action=move anchor=cells position=rightof target=genes<br>fo-0184: "Body to the left of it" gold: action=move target=body position=leftof anchor=brain; read: action=move anchor=$new position=leftof target=body |
| ref | target | 3 | fo-0076: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers<br>fo-0113: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple<br>fo-0441: "And red. No, black" gold: action=set target=end color=black; read: action=set color=black |
| name | target | 1 | fo-0107: "Thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |

**fresh2_test / test, trigger no request** (64)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 27 | fo-0049: "call it Laptop, not Pc1" gold: -; read: extra command:rename action=rename name=laptop target=$new (partial overlap with a requested action: 31% of it)<br>fo-0066: "from Db" gold: -; read: extra question:path ask=path from=db to=newservice (partial overlap with a requested action: 16% of it)<br>fo-0105: "flip them" gold: -; read: extra command:flip action=flip axis=horizontal target=mention(quantifier=all) (partial overlap with a requested action: 15% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 37 | fo-0093: "order" gold: -; read: extra command:arrange action=arrange (no requested action on this text)<br>fo-0111: "just" gold: -; read: extra command:create action=create (no requested action on this text)<br>fo-0118: "Undo that if it looks bad" gold: -; read: extra command:undo action=undo (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 9 | fo-0168: "Can" gold: -; read: extra command:create action=create<br>fo-0195: "Could" gold: -; read: extra command:create action=create<br>fo-0303: "Then" gold: -; read: extra command:create action=create |
| cut | command:connect | 6 | fo-0147: "Ended return to Idle" gold: -; read: extra command:connect action=connect from=ended to=idle<br>fo-0497: "Milk to Foam," gold: -; read: extra command:connect action=connect from=milk to=foam<br>fo-0523: "Loop back to Junction" gold: -; read: extra command:connect action=connect from=loop to=junction |
| cut | command:set | 2 | fo-0158: "so" gold: -; read: extra command:set action=set target=ocean<br>fo-0223: "actualy make it pink" gold: -; read: extra command:set action=set color=pink target=$new |
| cut | question:help | 2 | fo-0165: "can" gold: -; read: extra question:help ask=help aspect=can<br>fo-0411: "can" gold: -; read: extra question:help ask=help aspect=can |
| cut | command:rename | 1 | fo-0049: "call it Laptop, not Pc1" gold: -; read: extra command:rename action=rename name=laptop target=$new |
| cut | question:path | 1 | fo-0066: "from Db" gold: -; read: extra question:path ask=path from=db to=newservice |
| cut | command:flip | 1 | fo-0105: "flip them" gold: -; read: extra command:flip action=flip axis=horizontal target=mention(quantifier=all) |
| cut | command:arrange | 1 | fo-0118: "Arrange everything in a row" gold: -; read: extra command:arrange action=arrange layout=row |
| spurious | command:create | 10 | fo-0111: "just" gold: -; read: extra command:create action=create<br>fo-0161: "Dad" gold: -; read: extra command:create action=create name=dad<br>fo-0161: "the" gold: -; read: extra command:create action=create |
| spurious | command:set | 6 | fo-0139: "So" gold: -; read: extra command:set action=set target=core<br>fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body<br>fo-0217: "Music should be a star actually" gold: -; read: extra command:set action=set shape=star target=$new |
| spurious | command:move | 4 | fo-0168: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance<br>fo-0333: "Bar should be on the right" gold: -; read: extra command:move action=move position=right target=bar |
| spurious | command:connect | 4 | fo-0190: "Grass then Grasshopper" gold: -; read: extra command:connect action=connect from=grass<br>fo-0279: "match Mum to her" gold: -; read: extra command:connect action=connect<br>fo-0433: "Factory to Dc to" gold: -; read: extra command:connect action=connect from=factory,dc |
| spurious | question:cycle | 2 | fo-0147: "cycle" gold: -; read: extra question:cycle ask=cycle<br>fo-0572: "Sleep cycles should loop" gold: -; read: extra question:cycle ask=cycle |
| spurious | question:check | 2 | fo-0147: "not red" gold: -; read: extra question:check ask=check target=ended<br>fo-0557: "Is the map symmetric" gold: -; read: extra question:check ask=check |
| spurious | fact: | 2 | fo-0243: "Business is in the centre" gold: -; read: extra fact: position=center target=business<br>fo-0264: "Weather is in the middle" gold: -; read: extra fact: position=center target=weather |
| spurious | command:disconnect | 2 | fo-0246: "the arrow from Cow to Human," gold: -; read: extra command:disconnect action=disconnect from=cow to=human<br>fo-0355: "drop the Truck route entirely" gold: -; read: extra command:disconnect action=disconnect from=plant to=plant |
| cut | (4 more keys; all in the JSON) | | |
| spurious | (5 more keys; all in the JSON) | | |

### fresh2_test / test at the cost-10 threshold (0.9320)

Executed: right 540, wrong 3, extras 4. Structural holds 14 ({"blocked":8,"dependency":6}; 2 of them would have been right). Confidence holds 802: right 568, wrong or extra 234. Unread 32.

**Executed wrong, by first cause** (7)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 3 | fo-0497: "Milk to Foam," gold: -; read: extra command:connect action=connect from=milk to=foam (confidence 0.946; extra)<br>fo-0523: "Connect Station to Loop" gold: action=connect from=station,loop,junction; read: command:connect action=connect from=station to=loop (confidence 0.970; wrong)<br>fo-0577: "Waterfall into Pond" gold: action=connect from=pump,filter,uv,waterfall,pond; read: command:connect action=connect from=waterfall to=pond (confidence 0.937; wrong) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 2 | fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body (confidence 0.958; extra)<br>fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance (confidence 0.937; extra) |
| 4 wrong act | model (act head) | 1 | fo-0210: "Coach2 to Seniors" gold: -; read: extra command:connect action=connect from=coach2 to=seniors (confidence 0.968; extra) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: command:connect action=connect from=laptop to=nas (confidence 0.987; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 2 | fo-0523: "Connect Station to Loop" gold: action=connect from=station,loop,junction; read: command:connect action=connect from=station to=loop<br>fo-0577: "Waterfall into Pond" gold: action=connect from=pump,filter,uv,waterfall,pond; read: command:connect action=connect from=waterfall to=pond |
| cut | command:connect | 1 | fo-0497: "Milk to Foam," gold: -; read: extra command:connect action=connect from=milk to=foam |
| spurious | command:set | 1 | fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body |
| spurious | command:move | 1 | fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance |
| act | command:rename read as command:connect | 1 | fo-0210: "Coach2 to Seniors" gold: -; read: extra command:connect action=connect from=coach2 to=seniors |
| name | from | 1 | fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: command:connect action=connect from=laptop to=nas |

**Right but held by confidence** (568)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:connect | 152 | fo-0003: "arrow from Idle to Running" gold: action=connect from=idle to=running; read: command:connect action=connect from=idle to=running<br>fo-0003: "Paused should go back to Running" gold: action=connect from=paused to=running; read: command:connect action=connect from=paused to=running<br>fo-0004: "connect Ingest Parse Clean and Load one after the other" gold: action=connect from=ingest,parse,clean,load; read: command:connect action=connect from=ingest,parse,clean,load |
| held | command:set | 73 | fo-0004: "make it a navy ellipse" gold: action=set target=warehouse color=navy shape=ellipse; read: command:set action=set color=navy shape=ellipse target=warehouse<br>fo-0010: "Footer: gray" gold: action=set target=footer color=gray; read: command:set action=set color=gray target=footer<br>fo-0013: "Make Rejected a red octagon... ok no octagons, a red hexagon then" gold: action=set target=rejected color=red shape=hexagon; read: command:set action=set color=red shape=hexagon target=rejected |
| held | command:create | 61 | fo-0004: "add a small red diamond called Dlq below Clean" gold: action=create shape=diamond color=red size=small name=dlq position=below anchor=clean; read: command:create action=create anchor=clean color=red name=dlq position=below shape=diamond size=small<br>fo-0006: "create one small orange square with name Bastion near of SubnetA" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: command:create action=create anchor=subneta color=orange name=bastion position=near shape=square size=small<br>fo-0018: "add uh three small yellow circles under Lambda" gold: action=create shape=circle color=yellow size=small count=3 position=below anchor=lambda; read: command:create action=create anchor=lambda color=yellow count=3 position=below shape=circle size=small |
| held | command:move | 36 | fo-0010: "Logo goes to the top left" gold: action=move target=logo position=topleft; read: command:move action=move position=topleft target=logo<br>fo-0020: "in the bottom right" gold: action=move target=audit position=bottomright; read: command:move action=move position=bottomright target=audit<br>fo-0035: "Spine1 and Spine2 go to the top" gold: action=move target=spine1,spine2 position=top; read: command:move action=move position=top target=spine1,spine2 |
| held | question:count | 35 | fo-0004: "how many rectangles are there right now" gold: ask=count shape=rectangle; read: question:count ask=count shape=rectangle<br>fo-0035: "How many connections in total now" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>fo-0047: "How many circles we have" gold: ask=count shape=circle; read: question:count ask=count shape=circle |
| held | command:arrange | 28 | fo-0004: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all,shape=rectangle)<br>fo-0010: "Card1, Card2 and Card3 should sit in a row" gold: action=arrange target=card1,card2,card3 layout=row; read: command:arrange action=arrange layout=row target=card1,card2,card3<br>fo-0031: "put them in a row" gold: action=arrange target=$new layout=row; read: command:arrange action=arrange layout=row target=$new |
| held | fact: | 21 | fo-0040: "Redis is red" gold: target=redis color=red; read: fact: color=red target=redis<br>fo-0074: "Primary is green" gold: target=primary color=green; read: fact: color=green target=primary<br>fo-0074: "Replica is yellow" gold: target=replica color=yellow; read: fact: color=yellow target=replica |
| held | command:resize | 16 | fo-0032: "shrink Ecr a bit" gold: action=resize target=ecr; read: command:resize action=resize target=ecr<br>fo-0033: "I want the Done more big" gold: action=resize target=done; read: command:resize action=resize target=done<br>fo-0043: "make it larger" gold: action=resize target=price; read: command:resize action=resize target=price |
| held | (27 more keys; all in the JSON) | | |

**Structural holds** (14)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 8 | fo-0013: "Published goes to Archived later on" gold: action=connect from=published to=archived; read: command:connect action=connect from=published to=archived<br>fo-0161: "Dad" gold: -; read: command:create action=create name=dad<br>fo-0161: "the" gold: -; read: command:create action=create |

## short3_test / test (340 messages, 432 requested: right 281, wrong 111, not done 40, extras 34; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 17 |
| actions | 58 |
| values/roles | 110 |
| calibration | 192 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 432); ok (ungated: right + would-be right of structural holds = right of every request executed: 281); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 111); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 34); ok (ungated: unread = requested - paired: 40); ok (ungated right equals the score file: 280); ok (ungated wrong equals the score file: 103); ok (ungated extras equals the score file: 31); ok (ungated unread equals the score file: 40); ok (ungated structural holds equal the score file: 12); ok (every produced request is executed, structurally held or (gated) confidence-held: 426); ok (gated: executed wrong equals the score file: 6); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 12); ok (gated: confidence holds equal the score file: 314); ok (gated: right executed equals the score file: 94); ok (gated: unread equals the score file: 40); ok (gated: held right + held wrong or extra = confidence holds: 314)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 12 | 0 | 0 | 5 | 17 |
| 4 wrong act | model (act head) | 42 | 16 | 0 | 0 | 58 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 9 | 0 | 0 | 0 | 9 |
| 6 wrong or missing class value | model (class head) | 35 | 8 | 0 | 0 | 43 |
| 7 wrong words tagged for a name / text key | model (token head) | 47 | 11 | 0 | 0 | 58 |

**short3_test / test, trigger seen** (145)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 12 | s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: not done (merged into a unit with another request)<br>s3-0131: "done on top" gold: action=tofront target=done; read: not done (lost: no unit on the span)<br>s3-0137: "undo" gold: action=undo; read: not done (merged into a unit with another request) |
| 4 wrong act | model (act head) | 42 | s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: not done (read as command:create)<br>s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done (read as command:create)<br>s3-0035: "put done under check" gold: requested: put done under check; read: extra command:create action=create (read as command:create where command:move is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 9 | s3-0193: "also bigger" gold: action=resize target=check; read: action=resize (a name written in another request or by a pronoun)<br>s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done (a name written in another request or by a pronoun)<br>s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 35 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue fill=light outline=blue shape=rectangle<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 layout=row |
| 7 wrong words tagged for a name / text key | model (token head) | 47 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0005: "dotted line process to done" gold: action=connect from=process to=done style=dotted arrow=none; read: action=connect arrow=none from=process style=dotted<br>s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=check |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 3 | s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: not done<br>s3-0264: "start gold" gold: action=set target=start color=gold; read: not done<br>s3-0439: "end red" gold: action=set target=end color=red; read: not done |
| cut | (command:create) | 3 | s3-0146: "create Api" gold: action=create shape=square name=api; read: not done<br>s3-0146: "Db squares" gold: action=create shape=square name=db; read: not done<br>s3-0252: "add Sub1" gold: action=create name=sub1 position=below anchor=process; read: not done |
| cut | (command:toFront) | 1 | s3-0131: "done on top" gold: action=tofront target=done; read: not done |
| cut | (command:undo) | 1 | s3-0137: "undo" gold: action=undo; read: not done |
| cut | (command:rename) | 1 | s3-0305: "named Gate" gold: action=rename target=check name=gate; read: not done |
| cut | (command:arrange) | 1 | s3-0318: "tree layout, root Start, growing down" gold: action=arrange layout=tree anchor=start direction=down; read: action=arrange layout=tree |
| cut | (question:property) | 1 | s3-0333: "where is it" gold: ask=property target=intake property=position; read: not done |
| cut | (command:group) | 1 | s3-0472: "group check & done" gold: action=group target=check,done; read: not done |
| act | command:move read as command:create | 4 | s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: not done<br>s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done<br>s3-0035: "put done under check" gold: requested: put done under check; read: extra command:create action=create |
| act | command:arrange read as command:create | 3 | s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: not done<br>s3-0093: "make a timeline with Start Process Check Done" gold: requested: make a timeline with Start Process Check Done; read: extra command:create action=create items=start,process check,done template=timeline<br>s3-0318: "root Start, growing down" gold: requested: tree layout, root Start, growing down; read: extra command:create action=create |
| act | command:rename read as command:label | 2 | s3-0087: "Begin instead of Start" gold: action=rename target=start name=begin; read: not done<br>s3-0087: "Begin instead of Start" gold: requested: Begin instead of Start; read: extra command:label action=label target=begin,start |
| act | command:ungroup read as command:delete | 2 | s3-0095: "take Start out of the group" gold: action=ungroup target=start; read: not done<br>s3-0095: "take Start out of the group" gold: requested: take Start out of the group; read: extra command:delete action=delete target=start |
| act | command:group read as question:help | 2 | s3-0103: "group check and done" gold: action=group target=check,done; read: not done<br>s3-0103: "group check" gold: requested: group check and done; read: extra question:help ask=help |
| act | command:delete read as command:create | 2 | s3-0113: "bin done" gold: action=delete target=done; read: not done<br>s3-0113: "done" gold: requested: bin done; read: extra command:create action=create |
| act | command:arrange read as command:set | 2 | s3-0140: "make the existing flow into process steps with chevrons" gold: action=arrange template=process; read: not done<br>s3-0140: "make the existing flow into process steps with chevrons" gold: requested: make the existing flow into process steps with chevrons; read: extra command:set action=set |
| act | command:set read as question:check | 2 | s3-0156: "check purple" gold: action=set target=check color=purple; read: not done<br>s3-0156: "check purple" gold: requested: check purple; read: extra question:check ask=check color=purple target=process |
| ref | target | 4 | s3-0193: "also bigger" gold: action=resize target=check; read: action=resize<br>s3-0266: "make it a star" gold: action=set target=end shape=star; read: action=set shape=star target=done<br>s3-0303: "align all three" gold: action=align target=start,check,done; read: action=align target=check |
| ref | from | 4 | s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done<br>s3-0253: "conect procss w/ done" gold: action=connect from=process to=done; read: action=connect<br>s3-0377: "blue" gold: action=set from=start to=process color=blue; read: action=set color=blue |
| ref | to | 2 | s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check<br>s3-0377: "blue" gold: action=set from=start to=process color=blue; read: action=set color=blue |
| class | target | 10 | s3-0044: "the diagram looks messy can you fix it" gold: action=improve target=mention(quantifier=all); read: action=improve target=mention()<br>s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0126: "align them vertically" gold: action=align target=mention(quantifier=all) axis=vertical; read: action=align axis=vertical target=mention(quantifier=all,shape=circle) |
| class | template | 7 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 layout=row<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: action=create color=blue<br>s3-0240: "pyramid with 3 levels" gold: action=create template=pyramid count=3; read: action=create count=3 |
| class | shape | 5 | s3-0093: "add a title Roadmap" gold: action=create shape=text label=roadmap; read: action=create<br>s3-0270: "make the green circle a rectangle" gold: action=set target=mention(color=green,shape=circle) shape=rectangle; read: action=set shape=circle target=mention(color=green,shape=circle)<br>s3-0272: "convert all rectangles to ellipses" gold: action=set target=mention(quantifier=all,shape=rectangle) shape=ellipse; read: action=set shape=rectangle target=mention(quantifier=all,shape=rectangle) |
| class | layout | 5 | s3-0168: "draw 4 green circles in a line along the top" gold: action=create count=4 shape=circle color=green layout=row position=top; read: action=create color=green count=4 position=top shape=circle<br>s3-0221: "make the flow go left to right" gold: action=arrange layout=layers direction=right; read: action=arrange direction=right<br>s3-0264: "radial around start" gold: action=arrange layout=radial anchor=start; read: action=arrange anchor=start |
| class | position | 4 | s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 layout=row<br>s3-0406: "add 3 squares in a row under check" gold: action=create count=3 shape=square layout=row position=below anchor=check; read: action=create count=3 layout=row shape=square |
| class | arrow | 2 | s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: action=connect color=gray from=process to=done<br>s3-0434: "link Done to Check, dotted, both directions" gold: action=connect from=done to=check style=dotted arrow=both; read: action=connect from=done style=dotted to=check |
| class | layer | 1 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue fill=light outline=blue shape=rectangle |
| class | anchor | 1 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 layout=row |
| name | target | 26 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0057: "red for check" gold: action=set target=check color=red; read: action=set color=red<br>s3-0076: "recolor start to navy" gold: action=set target=start color=navy; read: action=set color=navy |
| name | to | 9 | s3-0005: "dotted line process to done" gold: action=connect from=process to=done style=dotted arrow=none; read: action=connect arrow=none from=process style=dotted<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0252: "connect Process to both" gold: action=connect from=process to=$new,$new; read: action=connect from=process |
| name | from | 8 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=check<br>s3-0033: "reverse direction on check→done" gold: action=reverse from=check to=done; read: action=reverse to=done<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db |
| name | name | 3 | s3-0109: "circle Y at 700,100" gold: action=create shape=circle name=y at=700,100; read: action=create at=700,100 shape=circle<br>s3-0194: "can you call Done "Finish" instead" gold: action=rename target=done name=finish; read: action=rename target=done<br>s3-0261: "add Fail below Check in red" gold: action=create name=fail position=below anchor=check color=red; read: action=create anchor=check color=red position=below |
| name | about | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: ask=help aspect=can topic=create<br>s3-0236: "what does SOP Lang mean" gold: ask=help about=sop lang; read: ask=help topic=text |
| name | scale | 1 | s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |
| name | count | 1 | s3-0166: "add a 3 by 3 grid of small squares" gold: action=create count=9 shape=square size=small layout=grid; read: action=create layout=grid shape=square size=small |
| name | items | 1 | s3-0263: "draw a venn with two circles A and B" gold: action=create template=venn items=a,b; read: action=create count=2 linked=a name=b shape=circle template=venn |
| act | (12 more keys; all in the JSON) | | |
| class | (3 more keys; all in the JSON) | | |
| name | (1 more keys; all in the JSON) | | |

**short3_test / test, trigger unseen** (35)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 16 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done (read as command:create)<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:create action=create (read as command:create where question:check is requested)<br>s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done (read as command:create) |
| 6 wrong or missing class value | model (class head) | 8 | s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: action=create count=4<br>s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create<br>s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black |
| 7 wrong words tagged for a name / text key | model (token head) | 11 | s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create anchor=core count=6 position=rightof template=hub<br>s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0083: "process no label" gold: action=label target=process label=; read: action=label target=process |

| cause | key | n | examples |
|---|---|---:|---|
| act | question:check read as command:create | 2 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:create action=create |
| act | command:set read as command:create | 2 | s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done<br>s3-0112: "red outline around process" gold: requested: red outline around process; read: extra command:create action=create |
| act | command:set read as command:label | 2 | s3-0181: "no border on start" gold: action=set target=start outline=none; read: not done<br>s3-0181: "no border on start" gold: requested: no border on start; read: extra command:label action=label target=start |
| act | command:set read as question:check | 2 | s3-0193: "check pink" gold: action=set target=check color=pink; read: not done<br>s3-0193: "check pink" gold: requested: check pink; read: extra question:check ask=check color=pink |
| act | command:set read as command:delete | 2 | s3-0322: "take the border off process" gold: action=set target=process outline=none; read: not done<br>s3-0322: "take the border off process" gold: requested: take the border off process; read: extra command:delete action=delete |
| act | command:resize read as command:set | 2 | s3-0365: "double check's size" gold: action=resize target=check; read: not done<br>s3-0365: "double check's size" gold: requested: double check's size; read: extra command:set action=set size=large |
| act | question:groupOf read as question:neighbors | 2 | s3-0493: "start belongs to which group" gold: ask=groupof target=start; read: not done<br>s3-0493: "start belongs to which group" gold: requested: start belongs to which group; read: extra question:neighbors ask=neighbors target=start |
| act | fact: read as question:list | 2 | s3-0517: "check lives in the top right" gold: target=check position=topright; read: not done<br>s3-0517: "check lives in the top right" gold: requested: check lives in the top right; read: extra question:list ask=list position=topright |
| class | template | 2 | s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: action=create count=4<br>s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create |
| class | outline | 2 | s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black<br>s3-0170: "outline done black" gold: action=set target=done outline=black; read: action=set color=black target=outline,done |
| class | target | 1 | s3-0239: "put everything in a single column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column |
| class | shape | 1 | s3-0265: "process → diamond" gold: action=set target=process shape=diamond; read: action=set target=process |
| class | color | 1 | s3-0395: "default for new shapes: small, purple" gold: size=small color=purple; read: size=small |
| class | direction | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange axis=vertical layout=layers |
| name | target | 6 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label<br>s3-0203: "put start process and check on one line" gold: action=align target=start,process,check; read: action=align axis=horizontal |
| name | label | 3 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label target=process<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | title | 1 | s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create anchor=core count=6 position=rightof template=hub |
| name | from | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | to | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | count | 1 | s3-0396: "twelve circles in a circle" gold: action=create count=12 shape=circle layout=circle; read: action=create layout=circle shape=circle |
| name | linked | 1 | s3-0422: "Done and Start are connected" gold: target=done linked=start; read: target=done |

**short3_test / test, trigger no request** (5)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 5 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (partial overlap with a requested action: 40% of it)<br>s3-0160: "Could you" gold: -; read: extra command:create action=create (partial overlap with a requested action: 16% of it)<br>s3-0311: "Code" gold: -; read: extra command:label action=label (partial overlap with a requested action: 12% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:set | 2 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db<br>s3-0395: "purple" gold: -; read: extra command:set action=set color=purple |
| cut | command:create | 2 | s3-0160: "Could you" gold: -; read: extra command:create action=create<br>s3-0311: "Data" gold: -; read: extra command:create action=create name=data |
| cut | command:label | 1 | s3-0311: "Code" gold: -; read: extra command:label action=label |

### short3_test / test at the cost-10 threshold (0.9320)

Executed: right 94, wrong 6, extras 0. Structural holds 12 ({"blocked":10,"dependency":2}; 1 of them would have been right). Confidence holds 314: right 186, wrong or extra 128. Unread 40.

**Executed wrong, by first cause** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 3 | s3-0272: "convert all rectangles to ellipses" gold: action=set target=mention(quantifier=all,shape=rectangle) shape=ellipse; read: command:set action=set shape=rectangle target=mention(quantifier=all,shape=rectangle) (confidence 0.981; wrong)<br>s3-0300: "give me a white hexagon with a red border" gold: action=create shape=hexagon color=white outline=red; read: command:create action=create color=red outline=red shape=hexagon (confidence 0.935; wrong)<br>s3-0434: "link Done to Check, dotted, both directions" gold: action=connect from=done to=check style=dotted arrow=both; read: command:connect action=connect from=done style=dotted to=check (confidence 0.953; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 3 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can topic=create (confidence 0.984; wrong)<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db (confidence 0.993; wrong)<br>s3-0261: "connect Check to Fail with label "no"" gold: action=connect from=check to=$new label=no; read: command:connect action=connect from=check label=no to=fail (confidence 0.936; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | shape | 1 | s3-0272: "convert all rectangles to ellipses" gold: action=set target=mention(quantifier=all,shape=rectangle) shape=ellipse; read: command:set action=set shape=rectangle target=mention(quantifier=all,shape=rectangle) |
| class | color | 1 | s3-0300: "give me a white hexagon with a red border" gold: action=create shape=hexagon color=white outline=red; read: command:create action=create color=red outline=red shape=hexagon |
| class | arrow | 1 | s3-0434: "link Done to Check, dotted, both directions" gold: action=connect from=done to=check style=dotted arrow=both; read: command:connect action=connect from=done style=dotted to=check |
| name | to | 2 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db<br>s3-0261: "connect Check to Fail with label "no"" gold: action=connect from=check to=$new label=no; read: command:connect action=connect from=check label=no to=fail |
| name | about | 1 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can topic=create |
| name | from | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |

**Right but held by confidence** (186)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 27 | s3-0006: "add 8 tiny dots in a ring around the center" gold: action=create count=8 shape=circle size=tiny layout=circle position=center; read: command:create action=create count=8 layout=circle position=center shape=circle size=tiny<br>s3-0018: "process steps: Plan, Build, Test, Ship" gold: action=create template=process items=plan,build,test,ship; read: command:create action=create items=plan,build,test,ship template=process<br>s3-0022: "square top left" gold: action=create shape=square position=topleft; read: command:create action=create position=topleft shape=square |
| held | command:connect | 16 | s3-0025: "connect Hub to Start Process Check Done" gold: action=connect from=$new to=start,process,check,done; read: command:connect action=connect from=$new to=start,process,check,done<br>s3-0037: "link Warn to Done dashed" gold: action=connect from=$new to=done style=dashed; read: command:connect action=connect from=$new style=dashed to=done<br>s3-0116: "connect Done back to Start with a blue dashed arrow" gold: action=connect from=done to=start color=blue style=dashed; read: command:connect action=connect color=blue from=done style=dashed to=start |
| held | command:move | 14 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: command:move action=move position=center target=check<br>s3-0056: "shift Process right a bit" gold: action=move target=process direction=right; read: command:move action=move direction=right target=process<br>s3-0082: "move it right" gold: action=move target=check direction=right; read: command:move action=move direction=right target=check |
| held | command:set | 14 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: command:set action=set color=white outline=white shape=circle target=mention(quantifier=all,shape=circle)<br>s3-0078: "turn the diamond pink" gold: action=set target=mention(shape=diamond) color=pink; read: command:set action=set color=pink target=mention(shape=diamond)<br>s3-0126: "make every shape small" gold: action=set target=mention(quantifier=all) size=small; read: command:set action=set size=small target=mention(quantifier=all) |
| held | command:resize | 13 | s3-0082: "make check smaller" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0257: "Process smaller" gold: action=resize target=process; read: command:resize action=resize target=process<br>s3-0297: "smaller" gold: action=resize; read: command:resize action=resize target=mention(recency=newest) |
| held | question:help | 12 | s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: question:help ask=help aspect=can topic=text<br>s3-0145: "can I group shapes" gold: ask=help topic=group aspect=can; read: question:help ask=help aspect=can topic=group<br>s3-0155: "which colors can i use" gold: ask=help topic=color aspect=values; read: question:help ask=help aspect=values topic=color |
| held | command:arrange | 10 | s3-0017: "arrange it like an org chart" gold: action=arrange layout=tree; read: command:arrange action=arrange layout=tree<br>s3-0040: "radial layout around Check" gold: action=arrange layout=radial anchor=check; read: command:arrange action=arrange anchor=check layout=radial<br>s3-0136: "put all shapes in a row" gold: action=arrange target=mention(quantifier=all) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all) |
| held | command:label | 8 | s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: command:label action=label from=check label=approved to=done<br>s3-0053: "clear the text in Done" gold: action=label target=done label=; read: command:label action=label label= target=done<br>s3-0167: "change the heading to "Signup Flow"" gold: action=label label=signup flow; read: command:label action=label label=signup flow target=heading |
| held | (28 more keys; all in the JSON) | | |

**Structural holds** (12)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 9 | s3-0083: "process no label" gold: action=label target=process label=; read: command:label action=label target=process<br>s3-0093: "add a title Roadmap" gold: action=create shape=text label=roadmap; read: command:create action=create<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: command:create action=create color=blue |
| blocked | unresolved-reference | 1 | s3-0340: "group start and process, call it Intake" gold: action=group target=start,process name=intake; read: command:group action=group name=intake |

## nl_a_development / development (300 messages, 392 requested: right 41, wrong 231, not done 120, extras 186; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 207 |
| actions | 146 |
| values/roles | 184 |
| calibration | 32 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 392); ok (ungated: right + would-be right of structural holds = right of every request executed: 41); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 231); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 186); ok (ungated: unread = requested - paired: 120); ok (ungated right equals the score file: 41); ok (ungated wrong equals the score file: 188); ok (ungated extras equals the score file: 154); ok (ungated unread equals the score file: 120); ok (ungated structural holds equal the score file: 75); ok (every produced request is executed, structurally held or (gated) confidence-held: 458); ok (gated: executed wrong equals the score file: 0); ok (gated: executed extras equals the score file: 1); ok (gated: structural holds equal the score file: 75); ok (gated: confidence holds equal the score file: 372); ok (gated: right executed equals the score file: 10); ok (gated: unread equals the score file: 120); ok (gated: held right + held wrong or extra = confidence holds: 372)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 37 | 60 | 0 | 40 | 137 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 70 | 70 |
| 4 wrong act | model (act head) | 75 | 71 | 0 | 0 | 146 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 66 | 25 | 0 | 0 | 91 |
| 6 wrong or missing class value | model (class head) | 33 | 21 | 0 | 0 | 54 |
| 7 wrong words tagged for a name / text key | model (token head) | 24 | 15 | 0 | 0 | 39 |

**nl_a_development / development, trigger seen** (235)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 37 | nl-01-014: "Each app can reach the same database. The database should be lower down, visibly inside data" gold: action=create name=database position=inside anchor=data; read: action=create (the unit covers 21% of the span)<br>nl-01-020: "that direct route to deployment gone" gold: action=disconnect from=build to=deploy; read: not done (only a part of the span is a unit)<br>nl-01-027: "on pause" gold: action=label from=running to=paused label=pause; read: not done (merged into a unit with another request) |
| 4 wrong act | model (act head) | 75 | nl-01-020: "Put the box back between Build and Deploy" gold: action=create name=tests position=between anchor=build,deploy; read: not done (read as command:move)<br>nl-01-020: "Put the box back between Build and Deploy" gold: requested: Put the box back between Build and Deploy; read: extra command:move action=move anchor=build,deploy position=between target=mention(shape=rectangle) (read as command:move where command:create is requested)<br>nl-01-026: "Start with Idle" gold: action=create name=idle; read: not done (read as command:connect) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 66 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move (a name or description the message does not write)<br>nl-01-005: "conect it" gold: action=connect from=$new to=switch; read: action=connect from=$new to=$new (a name written in another request or by a pronoun)<br>nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: action=create anchor=commit position=near shape=circle (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 33 | nl-01-019: "After the checks we need a decision: approved for customers?" gold: action=create label=approved for customers? position=rightof anchor=tests; read: action=create anchor=tests label=approved for customers position=between<br>nl-01-019: "no goes back to Commit" gold: action=connect from=$new to=commit label=no; read: action=connect from=mention(shape=diamond) label=no to=commit<br>nl-01-034: "need a small 'Forgot password?' link beside the password field" gold: action=create label=forgot password? size=small position=near anchor=password; read: action=create label=forgot password? size=small |
| 7 wrong words tagged for a name / text key | model (token head) | 24 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: action=create anchor=switch position=leftof<br>nl-01-014: "then go to two identical app instances" gold: action=create label=app instances count=2; read: action=create count=2<br>nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect from=yes to=deploy |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 14 | nl-01-014: "Each app can reach the same database. The database should be lower down, visibly inside data" gold: action=create name=database position=inside anchor=data; read: action=create<br>nl-01-030: "We start Disconnected" gold: action=create name=disconnected; read: action=create<br>nl-01-038: "make that one card across" gold: action=create label=product card position=below anchor=$new; read: not done |
| cut | (command:connect) | 7 | nl-02-009: "have both lines meet at the bed request" gold: action=connect from=$new to=bedrequest label=planned admissions; read: action=connect label=planned admissions<br>nl-02-047: "after the manager" gold: action=connect from=manager to=$new; read: not done<br>nl-04-047: "The path should go through that box" gold: action=connect from=bake,$new,ice; read: action=connect from=$new to=ice |
| cut | (command:label) | 5 | nl-01-027: "on pause" gold: action=label from=running to=paused label=pause; read: not done<br>nl-03-024: "say forty minutes" gold: action=label target=roast label=forty minutes; read: action=label label=forty minutes<br>nl-08-038: "Tuesday nobody yet. Can it say that" gold: action=label target=tue label=nobody yet; read: action=label to=rectangle1,rectangle2 |
| cut | (command:move) | 3 | nl-03-033: "Put it with Mars" gold: action=move target=saturn position=near anchor=mars; read: action=move target=saturn<br>nl-05-007: "left of it" gold: action=move target=mention(label=water butt) position=leftof anchor=vent; read: action=move<br>nl-12-025: "put the guards around the gate with the torches" gold: action=move target=guard,guard2,guard3,guard4,torch,torch2 position=near anchor=gate; read: not done |
| cut | (command:set) | 2 | nl-06-006: "put waiting in orange" gold: action=set target=$new color=orange; read: not done<br>nl-11-027: "dotted is good" gold: action=set from=mention(label=mill road) to=schools style=dotted; read: not done |
| cut | (command:group) | 2 | nl-10-047: "those three on the left are all things we'd actually do there so i want them to belong together, call it acti…" gold: action=group target=beach,hike,museum name=activities; read: action=group name=activities<br>nl-10-050: "all the fun stuff in a group so we can see it apart from the money side. So everything except Budget, and not…" gold: action=group target=beach,hike,museum name=activities; read: not done |
| cut | (command:disconnect) | 1 | nl-01-020: "that direct route to deployment gone" gold: action=disconnect from=build to=deploy; read: not done |
| cut | (question:count) | 1 | nl-05-017: "how many seats" gold: ask=count label=chairs; read: ask=count |
| act | command:create read as command:move | 25 | nl-01-020: "Put the box back between Build and Deploy" gold: action=create name=tests position=between anchor=build,deploy; read: not done<br>nl-01-020: "Put the box back between Build and Deploy" gold: requested: Put the box back between Build and Deploy; read: extra command:move action=move anchor=build,deploy position=between target=mention(shape=rectangle)<br>nl-01-038: "put the basket up top by the logo" gold: action=create name=basket position=near anchor=logo; read: not done |
| act | command:create read as command:connect | 9 | nl-01-026: "Start with Idle" gold: action=create name=idle; read: not done<br>nl-01-026: "Start with Idle and Running" gold: requested: Start with Idle; read: extra command:connect action=connect to=idle,running<br>nl-02-005: "The handover goes after the bed is confirmed, before transfer" gold: action=create shape=rectangle name=handover position=between anchor=mention(label=wait for confirmation),transfer; read: not done |
| act | command:move read as command:create | 5 | nl-03-033: "Put it with Mars" gold: requested: Put it with Mars; read: extra command:create action=create<br>nl-04-027: "Our welcome desk and its Start here sign belong down in the lower left corner. Please take them there together" gold: action=move target=checkin position=bottomleft; read: not done<br>nl-04-027: "its Start here sign belong down in the lower left corner. Please take them there together" gold: requested: Our welcome desk and its Start here sign belong down in the…; read: extra command:create action=create label=start here sign position=bottomleft |
| act | question:count read as question:degree | 4 | nl-02-036: "How many documents link directly to the allegation" gold: ask=count shape=rectangle linked=allegation; read: not done<br>nl-02-036: "How many documents link directly to the allegation in the middle" gold: requested: How many documents link directly to the allegation; read: extra question:degree ask=degree<br>nl-03-034: "How many things have I got off Planets" gold: ask=count shape=any linked=planets; read: not done |
| act | command:connect read as command:create | 3 | nl-02-049: "Show the request going upwards, stopping at the committee" gold: action=connect from=student,supervisor,mention(label=school committee); read: not done<br>nl-12-031: "11 on the left back" gold: action=connect from=p11 to=rlb; read: not done<br>nl-12-031: "11 on the left back" gold: requested: 11 on the left back; read: extra command:create action=create anchor=$new label=11 position=left |
| act | command:set read as command:delete | 2 | nl-01-037: "Lose the border" gold: action=set target=forgot outline=none; read: not done<br>nl-01-037: "Lose the border" gold: requested: Lose the border; read: extra command:delete action=delete |
| act | command:disconnect read as command:label | 2 | nl-02-044: "take it out only on the travel branch" gold: action=disconnect from=ceo to=travel; read: not done<br>nl-02-044: "take it out only on the travel branch" gold: requested: take it out only on the travel branch; read: extra command:label action=label |
| act | question:connected read as command:connect | 2 | nl-03-029: "Those two at the top both go into the bowl" gold: ask=connected target=eggs,flour anchor=bowl; read: not done<br>nl-03-029: "Those two at the top both go into the bowl, right" gold: requested: Those two at the top both go into the bowl; read: extra command:connect action=connect |
| ref | target | 36 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move<br>nl-01-029: "both active states to be orange" gold: action=set target=running,paused color=orange; read: action=set color=orange target=paused<br>nl-01-034: "line up its left edge with theirs" gold: action=align target=email,password,save direction=left; read: action=align direction=left target=mention(quantifier=all) |
| ref | anchor | 14 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move<br>nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: action=create anchor=commit position=near shape=circle<br>nl-01-034: "move Save changes under the fields" gold: action=move target=save position=below anchor=email,password; read: action=move |
| ref | from | 14 | nl-01-030: "a successful retry goes to Ready again" gold: action=connect from=retrying to=ready label=successful retry; read: action=connect from=retry to=ready<br>nl-01-030: "After three failures we give up and go to Disconnected. Put the three-failure condition on the arrow" gold: action=connect from=retrying to=disconnected label=three failures; read: action=connect from=ready to=disconnected<br>nl-02-004: "Colour that urgent route red. Actually orange" gold: action=set from=triage to=assessment color=orange; read: action=set color=orange from=text1 |
| ref | to | 11 | nl-01-005: "conect it" gold: action=connect from=$new to=switch; read: action=connect from=$new to=$new<br>nl-02-004: "Colour that urgent route red. Actually orange" gold: action=set from=triage to=assessment color=orange; read: action=set color=orange from=text1<br>nl-02-031: "Connect each document to the claim with a plain line" gold: action=connect from=mention(label=1998 transfer),survey,mention(label=email chain) to=mention(label=disputed boundary) …; read: action=connect arrow=none from=$new to=$new |
| ref | linked | 1 | nl-03-032: "Another for Saturn" gold: action=create name=saturn size=small linked=planets; read: action=create name=saturn shape=circle |
| class | position | 18 | nl-01-019: "After the checks we need a decision: approved for customers?" gold: action=create label=approved for customers? position=rightof anchor=tests; read: action=create anchor=tests label=approved for customers position=between<br>nl-01-034: "need a small 'Forgot password?' link beside the password field" gold: action=create label=forgot password? size=small position=near anchor=password; read: action=create label=forgot password? size=small<br>nl-01-038: "underneath uh a search bar full width" gold: action=create label=search bar position=below anchor=$new; read: action=create label=search bar |
| class | target | 4 | nl-01-048: "Put the backup under the primary" gold: action=move target=backup position=below anchor=primary; read: action=move anchor=primary position=below target=mention()<br>nl-11-012: "call the orange thing Flame" gold: action=rename target=mention(color=orange,shape=diamond) name=flame; read: action=rename name=flame target=mention(color=orange)<br>nl-11-014: "smaller than the name though" gold: action=resize target=mention(recency=newest); read: action=resize |
| class | shape | 4 | nl-02-003: "Add a note by assessment that registration can be completed later" gold: action=create shape=text label=registration can be completed later position=near anchor=assessment; read: action=create<br>nl-09-050: "how many houses it has together" gold: ask=count shape=square; read: ask=count<br>nl-11-006: "under the circle write Hearth & Bean" gold: action=create shape=text label=hearth & bean position=below anchor=mention(shape=circle); read: action=create anchor=mention(shape=circle) label=hearth & bean position=below shape=circle |
| class | object | 3 | nl-08-049: "draw one on the left side, a small gray box" gold: action=create shape=rectangle object=door size=small color=gray position=left; read: action=create color=gray position=left shape=rectangle size=small<br>nl-09-002: "we need the sea at the bottom, nice and big and blue" gold: action=create object=sea size=large color=blue position=bottom; read: action=create color=blue position=bottom size=large<br>nl-09-050: "the park needs on him still a small lake" gold: action=create object=lake size=small position=ontop anchor=park; read: action=create object=house size=small |
| class | from | 2 | nl-01-019: "no goes back to Commit" gold: action=connect from=$new to=commit label=no; read: action=connect from=mention(shape=diamond) label=no to=commit<br>nl-05-033: "hook the guard room up to the street exit" gold: action=connect from=mention(label=guard room) to=exit; read: action=connect from=start,crown to=start,crown |
| class | color | 1 | nl-02-046: "count them" gold: ask=count color=orange; read: ask=count |
| class | size | 1 | nl-06-043: "put a little note by the ceremony saying the doors close five minutes before" gold: action=create shape=text size=small label=the doors close five minutes before position=near anchor=ceremony; read: action=create anchor=$new label=the doors close five minutes before position=near shape=text |
| class | direction | 1 | nl-07-009: "cells run top to bottom" gold: action=arrange direction=down; read: action=arrange |
| name | label | 9 | nl-01-014: "then go to two identical app instances" gold: action=create label=app instances count=2; read: action=create count=2<br>nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect from=yes to=deploy<br>nl-01-034: "Under Email address, add a note saying we'll send a verification message if they change it" gold: action=create shape=text label=we'll send a verification message if they change it position=below anchor=email; read: action=create anchor=email label=we'll send a verification message if they change position=below shape=text |
| name | target | 9 | nl-02-005: "the handover box to say 'Nurse-to-nurse handover'" gold: action=label target=$new label=nurse-to-nurse handover; read: action=label label=nurse-to-nurse handover<br>nl-03-010: "Label the bulb Lamp" gold: action=label target=bulb label=lamp; read: action=label label=lamp<br>nl-03-015: "The box that says Dad should say Martin" gold: action=label target=dad label=martin; read: action=label label=martin |
| name | from | 4 | nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect from=yes to=deploy<br>nl-02-027: "have it join the samples at the instrument" gold: action=connect from=$new to=instrument; read: action=connect from=samples<br>nl-03-038: "Join food and games together" gold: action=connect from=food to=games; read: action=connect from=food,games |
| name | name | 3 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: action=create anchor=switch position=leftof<br>nl-09-012: "make a shark" gold: action=create name=shark; read: action=create<br>nl-09-030: "wants a dragon who lives in the middle" gold: action=create name=dragon position=center; read: action=create position=center |
| name | to | 3 | nl-02-027: "have it join the samples at the instrument" gold: action=connect from=$new to=instrument; read: action=connect from=samples<br>nl-03-038: "Join food and games together" gold: action=connect from=food to=games; read: action=connect from=food,games<br>nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: action=label label=7 min target=market |
| name | linked | 2 | nl-04-050: "After Bake please make Cool" gold: action=create name=cool linked=bake; read: action=create anchor=bake name=cool position=rightof<br>nl-06-049: "put signing after the questions um from eight fifteen till nine" gold: action=create label=signing from eight fifteen till nine linked=questions; read: action=create name=signing |
| name | anchor | 1 | nl-05-016: "put “keep clear” beside the hatch" gold: action=create shape=text label=keep clear position=near anchor=hatch; read: action=create anchor=rectangle1 label=keep clear position=near shape=text |
| cut | (2 more keys; all in the JSON) | | |
| act | (12 more keys; all in the JSON) | | |
| class | (1 more keys; all in the JSON) | | |

**nl_a_development / development, trigger unseen** (192)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 60 | nl-01-006: "There's nowhere on this drawing for the phones. We have six of them on the same switch" gold: action=create name=phones count=6 linked=switch; read: not done (lost: no unit on the span)<br>nl-01-014: "Three plain areas is enough: public entry" gold: action=create layer=zone label=public entry; read: not done (lost: no unit on the span)<br>nl-01-014: "application" gold: action=create layer=zone name=application; read: not done (lost: no unit on the span) |
| 4 wrong act | model (act head) | 71 | nl-01-014: "Requests come in at the top" gold: action=create name=requests position=top; read: not done (read as command:move)<br>nl-01-014: "Requests come in at the top" gold: requested: Requests come in at the top; read: extra command:move action=move position=top target=requests (read as command:move where command:create is requested)<br>nl-01-017: "enclose each in his own fence" gold: requested: enclose each in his own fence; read: extra command:connect action=connect from=$new to=$new (read as command:connect where command:create is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 25 | nl-01-004: "Give them some space" gold: action=respace target=guestwifi,staffwifi comparison=bigger; read: action=respace comparison=bigger target=mention(quantifier=all) (a name or description the message does not write)<br>nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: action=create (a name written in another request or by a pronoun)<br>nl-01-023: "rollback shoud go back to last good relase" gold: action=connect from=rollback to=lastgood; read: action=connect (a name or description the message does not write) |
| 6 wrong or missing class value | model (class head) | 21 | nl-02-031: "the email chain" gold: action=create label=email chain position=right; read: action=create<br>nl-02-049: "A title saying 'Student grant requests — discussion draft'" gold: action=create shape=text label=student grant requests — discussion draft; read: action=create label=student grant requests — discussion draft<br>nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=mention() position=inside |
| 7 wrong words tagged for a name / text key | model (token head) | 15 | nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect from=start,idle to=running<br>nl-02-049: "the school committee above that" gold: action=create label=school committee position=above anchor=$new; read: action=create anchor=student label=school committee position=above shape=text<br>nl-03-027: "squeze a let it cool bit in btween oven and icing" gold: action=create label=let it cool position=between anchor=oven,icing; read: action=create anchor=oven,icing label=cool bit position=between |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 26 | nl-01-006: "There's nowhere on this drawing for the phones. We have six of them on the same switch" gold: action=create name=phones count=6 linked=switch; read: not done<br>nl-01-014: "Three plain areas is enough: public entry" gold: action=create layer=zone label=public entry; read: not done<br>nl-01-014: "application" gold: action=create layer=zone name=application; read: not done |
| cut | (command:connect) | 15 | nl-01-027: "resume goes back" gold: action=connect from=paused to=running label=resume; read: action=connect from=running to=paused<br>nl-01-030: "If the handshake times out, we go back to Disconnected" gold: action=connect from=connecting to=disconnected label=handshake times out; read: action=connect to=connecting<br>nl-02-005: "check again later" gold: action=connect from=$new to=mention(label=wait for confirmation); read: action=connect from=$new |
| cut | (command:move) | 5 | nl-08-003: "desk is by the door not middle, door is at bottom" gold: action=move target=desk position=bottom; read: not done<br>nl-09-049: "it should be on the other side of the road, down below" gold: action=move target=church position=below anchor=highstreet; read: action=move anchor=church position=below target=$new<br>nl-12-010: "there's an empty desk right there" gold: action=move target=tom position=ontop anchor=desk2; read: not done |
| cut | (command:disconnect) | 3 | nl-01-017: "The arrow between them gives a wrong idea, there is no circulation of data from testing into production" gold: action=disconnect from=prod to=test; read: not done<br>nl-01-023: "not all way to commit" gold: action=disconnect from=commit to=rollback; read: not done<br>nl-04-049: "replacing that direct arrow" gold: action=disconnect from=bake to=ice; read: not done |
| cut | (command:label) | 2 | nl-06-037: "At the second picture the grandmother is with back to us. We must not see her eyes until the third picture. P…" gold: action=label target=grandma2 label=with back to us; read: not done<br>nl-10-042: "Whoever the pass is going to, that's our striker, so say so on him" gold: action=label target=p9 label=striker; read: action=label |
| cut | (command:delete) | 2 | nl-06-049: "rather than another box at the end" gold: action=delete target=drinks; read: not done<br>nl-08-049: "There should only be four chairs now" gold: action=delete target=chair5,chair6; read: not done |
| cut | (command:duplicate) | 1 | nl-01-034: "a second version alongside this" gold: action=duplicate target=mention(quantifier=all); read: not done |
| cut | (command:swap) | 1 | nl-02-025: "controls run BEFORE samples can u change order" gold: action=swap target=controls,samples; read: not done |
| act | command:create read as command:connect | 12 | nl-01-017: "enclose each in his own fence" gold: requested: enclose each in his own fence; read: extra command:connect action=connect from=$new to=$new<br>nl-01-027: "Running can go to Paused" gold: action=create name=paused linked=running; read: not done<br>nl-01-030: "A connect request takes us to Connecting" gold: action=create name=connecting linked=disconnected; read: not done |
| act | command:create read as command:move | 11 | nl-01-014: "Requests come in at the top" gold: action=create name=requests position=top; read: not done<br>nl-01-014: "Requests come in at the top" gold: requested: Requests come in at the top; read: extra command:move action=move position=top target=requests<br>nl-02-049: "their supervisor above" gold: requested: their supervisor above; read: extra command:move action=move anchor=student position=above target=student |
| act | command:duplicate read as command:create | 6 | nl-04-042: "Make another one just like him on the right" gold: action=duplicate target=alien position=rightof anchor=alien; read: not done<br>nl-04-042: "Make another one just like him on the right, eyes" gold: requested: Make another one just like him on the right; read: extra command:create action=create<br>nl-04-044: "i want two of him the new one on the right" gold: action=duplicate target=alien position=rightof anchor=alien; read: not done |
| act | command:label read as command:create | 3 | nl-01-021: "The step immediately before the green one needs an owner: Release captain" gold: action=label target=signoff label=release captain; read: not done<br>nl-01-021: "The step immediately before the green one needs an owner: Release captain" gold: requested: The step immediately before the green one needs an owner: R…; read: extra command:create action=create label=release captain<br>nl-02-005: "After the admission decision, somebody has to request a bed" gold: action=label target=bed label=request a bed; read: not done |
| act | command:disconnect read as command:connect | 3 | nl-04-047: "rather than straight from Bake to Ice" gold: action=disconnect from=bake to=ice; read: not done<br>nl-04-050: "The present road that jumps from Bake directly to Ice should no longer exist" gold: action=disconnect from=bake to=ice; read: not done<br>nl-04-050: "road that jumps from Bake directly to Ice" gold: requested: The present road that jumps from Bake directly to Ice shoul…; read: extra command:connect action=connect from=bake to=ice |
| act | command:resize read as command:set | 2 | nl-01-034: "make it shallower" gold: action=resize target=header; read: not done<br>nl-01-034: "make it shallower" gold: requested: make it shallower; read: extra command:set action=set |
| act | command:set read as command:create | 2 | nl-01-037: "make it look like a line of text under Password" gold: action=set target=forgot shape=text; read: not done<br>nl-01-037: "make it look like a line of text under Password" gold: requested: make it look like a line of text under Password; read: extra command:create action=create anchor=password position=below |
| act | command:resize read as command:label | 2 | nl-03-016: "Nana's name is disappearing off the edge of her little box" gold: action=resize target=nana; read: not done<br>nl-03-016: "Nana's name is disappearing off the edge of her little box" gold: requested: Nana's name is disappearing off the edge of her little box; read: extra command:label action=label label=nana |
| ref | target | 10 | nl-01-004: "Give them some space" gold: action=respace target=guestwifi,staffwifi comparison=bigger; read: action=respace comparison=bigger target=mention(quantifier=all)<br>nl-02-018: "Those three narrow grey rectangles can be one group called Cold storage" gold: action=group target=chillera,chillerb,chillerc; read: action=group<br>nl-04-029: "the grouped desk and sign that need relocating to the bottom-left corner" gold: action=move target=checkin position=bottomleft; read: action=move position=bottomleft |
| ref | from | 7 | nl-01-028: "stop from either active state returns to Idle" gold: action=connect from=running,paused to=idle label=stop; read: action=connect from=paused to=idle<br>nl-01-033: "Can you get from the one at the bottom back to Idle" gold: ask=path from=recovering to=idle; read: ask=path to=idle<br>nl-03-023: "That last arrow is the wrong way round" gold: action=reverse from=cake to=oven; read: action=reverse target=mention(quantifier=all) |
| ref | anchor | 7 | nl-02-020: "The scale must be nearer of the bottom wall" gold: action=move target=scale position=near anchor=bottomwall; read: action=move anchor=mention() position=below<br>nl-06-049: "a long bar underneath saying drinks" gold: action=create label=drinks position=below anchor=questions; read: action=create anchor=$new label=drinks position=below shape=text<br>nl-08-010: "a new box of reimbursement which is staying under him" gold: action=create shape=rectangle name=reimbursement position=below anchor=coverage; read: action=create anchor=refusal name=reimbursement position=below shape=rectangle |
| ref | to | 4 | nl-01-023: "rollback shoud go back to last good relase" gold: action=connect from=rollback to=lastgood; read: action=connect<br>nl-03-023: "That last arrow is the wrong way round" gold: action=reverse from=cake to=oven; read: action=reverse target=mention(quantifier=all)<br>nl-05-008: "hose from the butt to both beds, dotted" gold: action=connect style=dotted from=mention(label=water butt) to=herbs,tomatoes; read: action=connect arrow=none style=dotted to=circle3 |
| ref | linked | 1 | nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: action=create |
| class | position | 7 | nl-02-031: "the email chain" gold: action=create label=email chain position=right; read: action=create<br>nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=mention() position=inside<br>nl-05-024: "key in the hall, tiny gold diamond" gold: action=create shape=diamond size=tiny color=gold name=key position=inside anchor=hall; read: action=create color=gold label=key shape=diamond size=tiny |
| class | shape | 6 | nl-02-049: "A title saying 'Student grant requests — discussion draft'" gold: action=create shape=text label=student grant requests — discussion draft; read: action=create label=student grant requests — discussion draft<br>nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=mention() position=inside<br>nl-08-035: "under Wed the same" gold: action=create shape=rectangle label=dr barbu position=below anchor=wed; read: action=create anchor=$new position=below |
| class | target | 5 | nl-05-011: "table smaller" gold: action=resize target=table; read: action=resize target=mention()<br>nl-08-037: "Dr Barbu's boxes green" gold: action=set target=mention(label=dr barbu,quantifier=all,shape=rectangle) color=green; read: action=set color=green shape=rectangle target=fri<br>nl-09-011: "who eats the mouse" gold: ask=neighbors target=mouse; read: ask=neighbors target=mention() |
| class | anchor | 3 | nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=mention() position=inside<br>nl-11-002: "smaller one inside it. cream" gold: action=create shape=circle size=small position=inside anchor=mention(color=brown,shape=circle); read: action=create anchor=mention() label=cream position=near size=small<br>nl-11-004: "orange diamond on top of the white, not too big" gold: action=create shape=diamond color=orange position=ontop anchor=mention(color=white,shape=circle); read: action=create anchor=mention(color=orange,shape=diamond) color=orange position=above shape=diamond |
| class | size | 1 | nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=mention() position=inside |
| class | layout | 1 | nl-05-012: "3 chairs round it" gold: action=create label=chairs count=3 position=near anchor=table layout=circle; read: action=create anchor=table count=3 position=near |
| class | color | 1 | nl-05-029: "vault dark blue" gold: action=set target=vault color=navy; read: action=set color=blue target=vault |
| class | from | 1 | nl-09-012: "the shark eats the big fish and the big fish eats the litle fish" gold: action=connect from=shark,mention(label=fish,size=large),mention(label=fish,size=small); read: action=connect from=$new to=$new |
| name | label | 7 | nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect from=start,idle to=running<br>nl-03-027: "squeze a let it cool bit in btween oven and icing" gold: action=create label=let it cool position=between anchor=oven,icing; read: action=create anchor=oven,icing label=cool bit position=between<br>nl-07-027: "on DPO the name of Ms Keller" gold: action=label target=dpo label=ms keller; read: action=label label=keller |
| name | target | 4 | nl-07-020: "the welding station stand out in red" gold: action=set target=welding color=red; read: action=set color=red<br>nl-07-027: "on DPO the name of Ms Keller" gold: action=label target=dpo label=ms keller; read: action=label label=keller<br>nl-08-008: "the large stacks you have drawn at the upper right should be named the Local History Collection" gold: action=label target=stacks label=local history collection; read: action=label label=local history collection |
| name | from | 3 | nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect from=start,idle to=running<br>nl-04-050: "from Cool continue to Ice" gold: action=connect from=cool to=ice; read: action=connect from=$new to=ice<br>nl-11-042: "shipped to refund, label returns" gold: action=connect from=shipped to=refund label=returns; read: action=connect from=refund label=returns to=refund |
| name | name | 2 | nl-09-002: "some mountains over to the right" gold: action=create name=mountains position=right; read: action=create position=right<br>nl-11-041: "Refund box under Payment" gold: action=create shape=rectangle name=refund position=below anchor=payment; read: action=create anchor=payment position=below shape=rectangle |
| name | anchor | 1 | nl-02-049: "the school committee above that" gold: action=create label=school committee position=above anchor=$new; read: action=create anchor=student label=school committee position=above shape=text |
| cut | (5 more keys; all in the JSON) | | |
| act | (16 more keys; all in the JSON) | | |
| class | (3 more keys; all in the JSON) | | |

**nl_a_development / development, trigger no request** (110)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 40 | nl-01-014: "The database should be lower down" gold: -; read: extra command:move action=move target=database (partial overlap with a requested action: 36% of it)<br>nl-01-017: "of data from" gold: -; read: extra question:reachable ask=reachable from=$new (partial overlap with a requested action: 12% of it)<br>nl-01-020: "to" gold: -; read: extra command:connect action=connect from=mention(shape=rectangle) to=mention(shape=rectangle) (partial overlap with a requested action: 6% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 70 | nl-01-005: "name is FrontDesk" gold: -; read: extra command:rename action=rename name=frontdesk target=$new (no requested action on this text)<br>nl-01-017: "The" gold: -; read: extra command:label action=label label=the (no requested action on this text)<br>nl-01-023: "u fix arrow only" gold: -; read: extra command:set action=set (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 16 | nl-04-027: "Our welcome desk" gold: -; read: extra command:create action=create label=welcome<br>nl-04-048: "bake" gold: -; read: extra command:create action=create<br>nl-06-006: "then" gold: -; read: extra command:create action=create anchor=$new position=rightof |
| cut | command:connect | 5 | nl-01-020: "to" gold: -; read: extra command:connect action=connect from=mention(shape=rectangle) to=mention(shape=rectangle)<br>nl-06-047: "between dinner and the bidding" gold: -; read: extra command:connect action=connect<br>nl-08-040: ", so can those have arrows" gold: -; read: extra command:connect action=connect |
| cut | command:label | 5 | nl-01-030: "Put the three-failure condition on the arrow" gold: -; read: extra command:label action=label from=disconnected label=three to=disconnected<br>nl-04-050: "The" gold: -; read: extra command:label action=label label=the target=ice<br>nl-09-053: "It's a vape shop now. Call it that" gold: -; read: extra command:label action=label label=vape shop target=post |
| cut | command:move | 3 | nl-01-014: "The database should be lower down" gold: -; read: extra command:move action=move target=database<br>nl-01-038: "underneath uh" gold: -; read: extra command:move action=move anchor=basket position=below<br>nl-09-053: "The post office goes next to the bakery" gold: -; read: extra command:move action=move anchor=bakery position=near target=post |
| cut | command:set | 3 | nl-03-006: "give it the writing river" gold: -; read: extra command:set action=set<br>nl-12-024: "hex" gold: -; read: extra command:set action=set shape=hexagon<br>nl-12-033: "want that one solid" gold: -; read: extra command:set action=set from=$new to=$new |
| cut | command:arrange | 2 | nl-02-047: "legal to look at the contract as" gold: -; read: extra command:arrange action=arrange<br>nl-06-043: "give her a separate row" gold: -; read: extra command:arrange action=arrange layout=row |
| cut | question:reachable | 1 | nl-01-017: "of data from" gold: -; read: extra question:reachable ask=reachable from=$new |
| cut | command:undo | 1 | nl-01-030: "we go back" gold: -; read: extra command:undo action=undo |
| spurious | command:create | 19 | nl-02-008: "Bring the family in before admission" gold: -; read: extra command:create action=create name=family<br>nl-02-046: "put" gold: -; read: extra command:create action=create<br>nl-02-046: "total" gold: -; read: extra command:create action=create |
| spurious | command:connect | 10 | nl-01-046: "way from 'page incident lead' to the actual phone number" gold: -; read: extra command:connect action=connect from=$new label=page incident lead to=$new<br>nl-03-015: "both the lines coming down to me from Jo and Martin" gold: -; read: extra command:connect action=connect arrow=none from=jo,martin to=$new<br>nl-05-005: "facing the beds" gold: -; read: extra command:connect action=connect from=bench |
| spurious | command:set | 8 | nl-01-023: "u fix arrow only" gold: -; read: extra command:set action=set<br>nl-02-040: "except the unsigned one" gold: -; read: extra command:set action=set<br>nl-08-037: "what colour is Dr Enache on the other sheet... purple. So green is fine" gold: -; read: extra command:set action=set color=green target=fri |
| spurious | command:label | 7 | nl-01-017: "The" gold: -; read: extra command:label action=label label=the<br>nl-02-003: "The other route can say routine" gold: -; read: extra command:label action=label label=routine target=assessment<br>nl-02-050: "'s 17" gold: -; read: extra command:label action=label label=17 |
| spurious | command:move | 3 | nl-01-038: "below that two product cards next to each other" gold: -; read: extra command:move action=move anchor=$new position=below target=$new<br>nl-02-018: "the blue square below them" gold: -; read: extra command:move action=move target=mention(color=blue,shape=square)<br>nl-06-038: "a close up of the" gold: -; read: extra command:move action=move |
| spurious | command:resize | 2 | nl-01-025: "Make staging like production" gold: -; read: extra command:resize action=resize target=staging<br>nl-01-037: "Why is 'Forgot password?' a giant" gold: -; read: extra command:resize action=resize size=huge |
| spurious | question:nearest | 2 | nl-05-013: "nearest" gold: -; read: extra question:nearest ask=nearest anchor=circle4,circle5,circle6 superlative=closest<br>nl-09-029: "furthest from the top table" gold: -; read: extra question:nearest ask=nearest superlative=farthest |
| spurious | question:help | 2 | nl-06-047: "find" gold: -; read: extra question:help ask=help<br>nl-12-052: "Is there some way of showing that" gold: -; read: extra question:help ask=help aspect=can |
| cut | (4 more keys; all in the JSON) | | |
| spurious | (14 more keys; all in the JSON) | | |

### nl_a_development / development at the cost-10 threshold (0.9320)

Executed: right 10, wrong 0, extras 1. Structural holds 75 ({"blocked":61,"dependency":14}; 0 of them would have been right). Confidence holds 372: right 31, wrong or extra 341. Unread 120.

**Executed wrong, by first cause** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 1 | nl-11-008: "forget it" gold: -; read: extra command:forget action=forget (confidence 0.958; extra) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:forget | 1 | nl-11-008: "forget it" gold: -; read: extra command:forget action=forget |

**Right but held by confidence** (31)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 11 | nl-01-014: "Add object storage off to one side for uploads" gold: action=create label=object storage; read: command:create action=create label=object storage<br>nl-02-027: "start a separate path for the blank sorry the reagent blank not an empty box have it" gold: action=create label=reagent blank; read: command:create action=create label=reagent blank<br>nl-02-031: "Add a note at the bottom saying 'Working map — disputed facts'" gold: action=create shape=text label=working map — disputed facts position=bottom; read: command:create action=create label=working map — disputed facts position=bottom shape=text |
| held | command:connect | 6 | nl-05-021: "hall to archive too" gold: action=connect from=hall to=archive; read: command:connect action=connect from=hall to=archive<br>nl-05-031: "secret way from vault back to hall, dashed" gold: action=connect style=dashed from=vault to=hall; read: command:connect action=connect from=vault style=dashed to=hall<br>nl-07-007: "conveyor2 to packing, dashed" gold: action=connect from=conveyor2 to=packing style=dashed; read: command:connect action=connect from=conveyor2 style=dashed to=packing |
| held | command:resize | 3 | nl-05-020: "bigger than that room" gold: action=resize target=archive; read: command:resize action=resize target=archive<br>nl-08-003: "kids section shld be way bigger" gold: action=resize target=kids; read: command:resize action=resize target=kids<br>nl-11-023: "bigger too" gold: action=resize target=hospital; read: command:resize action=resize target=hospital |
| held | command:set | 3 | nl-09-012: "make the shark gray" gold: action=set target=shark color=gray; read: command:set action=set color=gray target=shark<br>nl-11-015: "Flame a touch more red" gold: action=set target=flame color=red; read: command:set action=set color=red target=flame<br>nl-12-031: "I'd like the arrows yellow" gold: action=set kind=edge color=yellow target=mention(quantifier=all); read: command:set action=set color=yellow kind=edge target=mention(quantifier=all) |
| held | command:label | 2 | nl-01-019: "Call Build 'Package the release'" gold: action=label target=build label=package the release; read: command:label action=label label=package the release target=build<br>nl-01-019: "Tests 'Check it works'" gold: action=label target=tests label=check it works; read: command:label action=label label=check it works target=tests |
| held | command:group | 2 | nl-10-046: "Group Beach, Hike and Museum as Activities" gold: action=group target=beach,hike,museum name=activities; read: command:group action=group name=activities target=beach,hike,museum<br>nl-11-016: "group the lot as Logo" gold: action=group target=mention(quantifier=all) name=logo; read: command:group action=group name=logo target=mention(quantifier=all) |
| held | question:path | 1 | nl-05-032: "can you get from start to the crown" gold: ask=path from=start to=crown; read: question:path ask=path from=start to=crown |
| held | command:move | 1 | nl-06-022: "Put the camp below the pass and the cave" gold: action=move target=camp position=below anchor=pass,cave; read: command:move action=move anchor=pass,cave position=below target=camp |
| held | (2 more keys; all in the JSON) | | |

**Structural holds** (75)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 60 | nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: command:create action=create<br>nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: command:create action=create anchor=commit position=near shape=circle<br>nl-01-045: "add call DBA before that restart box" gold: action=create label=call dba position=above anchor=restart; read: command:create action=create anchor=restart name=dba position=rightof |
| blocked | unresolved-reference | 1 | nl-08-006: "between the budget and submit there needs to be letters of support no letters like letters from people the su…" gold: action=create label=supporting letters position=between anchor=budget,submit; read: command:create action=create label=of support |

## t1_all / all (1793 messages, 1793 requested: right 1731, wrong 62, not done 0, extras 1; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 1 |
| actions | 0 |
| values/roles | 62 |
| calibration | 332 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1793); ok (ungated: right + would-be right of structural holds = right of every request executed: 1731); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 62); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 1); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 1731); ok (ungated wrong equals the score file: 62); ok (ungated extras equals the score file: 1); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 1794); ok (gated: executed wrong equals the score file: 18); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 359); ok (gated: right executed equals the score file: 1417); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 359)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 0 | 0 | 0 | 1 | 1 |
| 6 wrong or missing class value | model (class head) | 61 | 0 | 0 | 0 | 61 |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | 0 | 0 | 0 | 1 |

**t1_all / all, trigger seen** (62)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 61 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon,size=tiny)<br>st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue outline=blue shape=rectangle<br>st1-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=purple outline=purple shape=star |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | st1-00472: "connect Auth to Ingress" gold: action=connect from=auth to=ingress; read: action=connect to=ingress |

| cause | key | n | examples |
|---|---|---:|---|
| class | color | 54 | st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue outline=blue shape=rectangle<br>st1-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=purple outline=purple shape=star<br>st1-00208: "draw a gray star with a blue border" gold: action=create shape=star color=gray outline=blue; read: action=create color=blue outline=blue shape=star |
| class | outline | 12 | st1-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: action=create color=black outline=black shape=hexagon<br>st1-00332: "add a gray hexagon with a pink border" gold: action=create shape=hexagon color=gray outline=pink; read: action=create color=gray outline=gray shape=hexagon<br>st1-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: action=create color=navy outline=orange shape=hexagon |
| class | target | 5 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon,size=tiny)<br>st1-01132: "make the huge rectangles pink" gold: action=set target=mention(quantifier=all,shape=rectangle,size=huge) color=pink; read: action=set target=mention(quantifier=all,shape=rectangle,size=large)<br>st1-01827: "make the giant squares yellow" gold: action=set target=mention(quantifier=all,shape=square,size=huge) color=yellow; read: action=set color=yellow target=mention(quantifier=all,shape=square) |
| class | kind | 1 | st1-01856: "make the arrows dotted" gold: action=set kind=edge style=dotted target=mention(quantifier=all); read: action=set from=$new style=dotted to=$new |
| name | from | 1 | st1-00472: "connect Auth to Ingress" gold: action=connect from=auth to=ingress; read: action=connect to=ingress |

**t1_all / all, trigger no request** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 1 | st1-01856: "make" gold: -; read: extra command:create action=create (partial overlap with a requested action: 18% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 1 | st1-01856: "make" gold: -; read: extra command:create action=create |

### t1_all / all at the cost-10 threshold (0.9320)

Executed: right 1417, wrong 18, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 359: right 314, wrong or extra 45. Unread 0.

**Executed wrong, by first cause** (18)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 18 | st1-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: command:create action=create color=black outline=black shape=hexagon (confidence 0.934; wrong)<br>st1-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: command:create action=create color=pink outline=pink shape=diamond (confidence 0.941; wrong)<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=navy outline=navy shape=triangle (confidence 0.937; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | color | 15 | st1-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: command:create action=create color=pink outline=pink shape=diamond<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=navy outline=navy shape=triangle<br>st1-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: command:create action=create color=navy outline=orange shape=hexagon |
| class | outline | 6 | st1-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: command:create action=create color=black outline=black shape=hexagon<br>st1-00332: "add a gray hexagon with a pink border" gold: action=create shape=hexagon color=gray outline=pink; read: command:create action=create color=gray outline=gray shape=hexagon<br>st1-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: command:create action=create color=navy outline=orange shape=hexagon |

**Right but held by confidence** (314)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:set | 117 | st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: command:set action=set outline=navy target=sales<br>st1-00058: "make the arrow from M to Y orange" gold: action=set from=m to=y color=orange; read: command:set action=set color=orange from=m to=y<br>st1-00086: "make Nucleus's border blue" gold: action=set target=nucleus outline=blue; read: command:set action=set outline=blue target=nucleus |
| held | command:create | 97 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: command:create action=create color=purple outline=cyan shape=square<br>st1-00054: "add a teal circle" gold: action=create shape=circle color=teal; read: command:create action=create color=teal shape=circle<br>st1-00088: "create a list with Bedroom, Bathroom and Pantry" gold: action=create template=list items=bedroom,bathroom,pantry; read: command:create action=create items=bedroom,bathroom,pantry template=list |
| held | command:move | 46 | st1-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: command:move action=move direction=up target=mention(quantifier=all,shape=diamond,size=small)<br>st1-00141: "move Tackle up" gold: action=move target=tackle direction=up; read: command:move action=move direction=up target=tackle<br>st1-00187: "move Auth left" gold: action=move target=auth direction=left; read: command:move action=move direction=left target=auth |
| held | question:count | 12 | st1-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small<br>st1-00250: "how many small circles are there" gold: ask=count shape=circle size=small; read: question:count ask=count shape=circle size=small<br>st1-00364: "how many arrows do I have" gold: ask=count kind=edge; read: question:count ask=count kind=edge |
| held | command:delete | 12 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle,size=large)<br>st1-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square,size=huge)<br>st1-00410: "erase the little circles" gold: action=delete target=mention(quantifier=all,shape=circle,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=circle,size=small) |
| held | command:snap | 4 | st1-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01598: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:sort | 4 | st1-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all)<br>st1-01489: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | command:groupBy | 4 | st1-00446: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01757: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01804: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all) |
| held | (8 more keys; all in the JSON) | | |

**Structural holds** (0)

none

## lowercase_other / all (351 messages, 1102 requested: right 732, wrong 313, not done 57, extras 102; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 102 |
| actions | 73 |
| values/roles | 297 |
| calibration | 583 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1102); ok (ungated: right + would-be right of structural holds = right of every request executed: 732); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 313); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 102); ok (ungated: unread = requested - paired: 57); ok (ungated right equals the score file: 724); ok (ungated wrong equals the score file: 298); ok (ungated extras equals the score file: 92); ok (ungated unread equals the score file: 57); ok (ungated structural holds equal the score file: 33); ok (every produced request is executed, structurally held or (gated) confidence-held: 1147); ok (gated: executed wrong equals the score file: 0); ok (gated: executed extras equals the score file: 3); ok (gated: structural holds equal the score file: 33); ok (gated: confidence holds equal the score file: 967); ok (gated: right executed equals the score file: 144); ok (gated: unread equals the score file: 57); ok (gated: held right + held wrong or extra = confidence holds: 967)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 33 | 3 | 0 | 35 | 71 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 31 | 31 |
| 4 wrong act | model (act head) | 51 | 22 | 0 | 0 | 73 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 92 | 4 | 0 | 0 | 96 |
| 6 wrong or missing class value | model (class head) | 49 | 0 | 0 | 0 | 49 |
| 7 wrong words tagged for a name / text key | model (token head) | 135 | 17 | 0 | 0 | 152 |

**lowercase_other / all, trigger seen** (360)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 33 | fo-0032#lc: "All rectangles should be orange. Actually only eks and ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(quantifier=all,shape=rectangle) (the unit covers 41% of the span)<br>fo-0042#lc: "worker1 and worker2 both feed results" gold: action=connect from=worker1,worker2 to=results; read: not done (lost: no unit on the span)<br>fo-0042#lc: "What's the label on results" gold: ask=property target=results property=label; read: not done (only a part of the span is a unit) |
| 4 wrong act | model (act head) | 51 | fo-0011#lc: "how many links dose core have" gold: ask=degree target=core; read: not done (read as question:count)<br>fo-0011#lc: "how many links dose core have" gold: requested: how many links dose core have; read: extra question:count ask=count (read as question:count where question:degree is requested)<br>fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: not done (read as command:create) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 92 | fo-0002#lc: "Move it to the right of api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof (a name written in another request or by a pronoun)<br>fo-0010#lc: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo (a name written in another request or by a pronoun)<br>fo-0010#lc: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 49 | fo-0006#lc: "Please create one small orange square with name Bastion near of subneta" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: action=create color=orange name=bastion shape=square size=small<br>fo-0010#lc: "Add a tiny black circle named Avatar right of search" gold: action=create shape=circle color=black size=tiny name=avatar position=rightof anchor=search; read: action=create color=black name=avatar shape=circle size=tiny<br>fo-0013#lc: "another one from review to rejected, dashed" gold: action=connect from=review to=rejected style=dashed; read: action=connect from=mention() style=dashed to=rejected |
| 7 wrong words tagged for a name / text key | model (token head) | 135 | fo-0003#lc: "arrow from idle to running" gold: action=connect from=idle to=running; read: action=connect to=running<br>fo-0004#lc: "connect ingest parse clean and load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect pairing=chain<br>fo-0004#lc: "connect clean to Dlq with a dotted line" gold: action=connect from=clean to=$new style=dotted arrow=none; read: action=connect arrow=none style=dotted to=$new |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 7 | fo-0032#lc: "All rectangles should be orange. Actually only eks and ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(quantifier=all,shape=rectangle)<br>fo-0125#lc: "gray" gold: action=set target=statusbar color=gray; read: not done<br>fo-0191#lc: "please recolour her" gold: action=set target=aunt color=purple; read: not done |
| cut | (command:connect) | 5 | fo-0042#lc: "worker1 and worker2 both feed results" gold: action=connect from=worker1,worker2 to=results; read: not done<br>fo-0066#lc: "newservice reads from db, connect those too" gold: action=connect from=newservice to=db; read: action=connect from=newservice to=newservice<br>fo-0097#lc: "router connects to tv console laptop and phone" gold: action=connect from=router to=tv,console,laptop,phone; read: action=connect from=$new to=$new |
| cut | (command:move) | 5 | fo-0250#lc: "secretary and treasurer go below president" gold: action=move target=secretary,treasurer position=below anchor=president; read: action=move anchor=president position=below<br>fo-0271#lc: "sun at the top" gold: action=move target=sun position=top; read: not done<br>fo-0328#lc: "entry should go below living" gold: action=move target=entry position=below anchor=living; read: not done |
| cut | (question:property) | 3 | fo-0042#lc: "What's the label on results" gold: ask=property target=results property=label; read: not done<br>fo-0221#lc: "where saturn is on this thing" gold: ask=property target=saturn property=position; read: not done<br>fo-0524#lc: "How big is it" gold: ask=property target=sunflower property=size; read: ask=property property=size |
| cut | (command:arrange) | 2 | fo-0125#lc: "in a row" gold: action=arrange target=minbtn,maxbtn,closebtn layout=row; read: action=arrange layout=row target=titlebar<br>fo-0543#lc: "Put the three days in a column" gold: action=arrange target=day1,day2,day3 layout=column; read: not done |
| cut | (command:create) | 2 | fo-0237#lc: "put 5 tiny gray sqaures between Mars and... hmm there's nothing after Mars yet. ok just put them to the right…" gold: action=create shape=square size=tiny color=gray count=5 position=rightof anchor=$new; read: action=create anchor=$new color=gray count=5 position=between shape=circle size=tiny<br>fo-0524#lc: "Can you put three small yellow stars underneath it? Those are the kids' plants. hmm actually I meant five, no…" gold: action=create shape=star color=yellow size=small count=5 position=below anchor=sunflower; read: action=create color=yellow count=3 shape=star size=small |
| cut | (command:resize) | 2 | fo-0271#lc: "can u make fish a lil bigger" gold: action=resize target=fish; read: not done<br>fo-0328#lc: "The kitchen is too big, shrink it" gold: action=resize target=kitchen; read: action=resize target=bed2 |
| cut | (command:delete) | 2 | fo-0285#lc: "satellite isn't needed, delete it" gold: action=delete target=satellite; read: action=delete target=$new<br>fo-0467#lc: "the bar can go" gold: action=delete target=bar; read: not done |
| act | command:move read as command:create | 15 | fo-0027#lc: "put error below booting" gold: action=move target=error position=below anchor=booting; read: not done<br>fo-0027#lc: "put error below booting" gold: requested: put error below booting; read: extra command:create action=create anchor=booting position=below<br>fo-0062#lc: "put apigw under cloudfront" gold: action=move target=apigw position=below anchor=cloudfront; read: not done |
| act | command:set read as command:create | 4 | fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: not done<br>fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: requested: Make extract, transform and load the same, medium blue rect…; read: extra command:create action=create color=blue shape=rectangle size=medium<br>fo-0076#lc: "alert: red star" gold: action=set target=alert color=red shape=star; read: not done |
| act | question:degree read as question:count | 2 | fo-0011#lc: "how many links dose core have" gold: ask=degree target=core; read: not done<br>fo-0011#lc: "how many links dose core have" gold: requested: how many links dose core have; read: extra question:count ask=count |
| act | command:set read as command:arrange | 2 | fo-0047#lc: "dashboard I want as star shape" gold: action=set target=dashboard shape=star; read: not done<br>fo-0047#lc: "dashboard I want as star shape" gold: requested: dashboard I want as star shape; read: extra command:arrange action=arrange target=dashboard |
| act | question:connected read as question:neighbors | 2 | fo-0062#lc: "is users connected to apigw" gold: ask=connected target=apigw anchor=users; read: not done<br>fo-0062#lc: "is users connected to apigw" gold: requested: is users connected to apigw; read: extra question:neighbors ask=neighbors target=$new |
| act | question:path read as command:connect | 2 | fo-0076#lc: "Path from topic to alert" gold: ask=path from=topic to=alert; read: not done<br>fo-0076#lc: "Path from topic to alert" gold: requested: Path from topic to alert; read: extra command:connect action=connect from=mention(label=kitchen tent) to=alert |
| act | command:disconnect read as command:delete | 2 | fo-0090#lc: "If yes please disconnect" gold: action=disconnect from=authsvc to=db; read: not done<br>fo-0090#lc: "please disconnect" gold: requested: If yes please disconnect; read: extra command:delete action=delete |
| act | command:set read as fact: | 2 | fo-0147#lc: "Color for connected is green" gold: action=set target=connected color=green; read: not done<br>fo-0147#lc: "Color for connected is green" gold: requested: Color for connected is green; read: extra fact: color=green target=ended |
| ref | target | 65 | fo-0002#lc: "Move it to the right of api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof<br>fo-0010#lc: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo<br>fo-0010#lc: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo |
| ref | to | 10 | fo-0020#lc: "disconnect them" gold: action=disconnect from=audit to=load; read: action=disconnect from=audit to=audit<br>fo-0035#lc: "Same for spine2" gold: action=connect from=spine2 to=leaf1,leaf2,leaf3,leaf4; read: action=connect<br>fo-0055#lc: "Connect coresw to each of them" gold: action=connect from=coresw to=vlan10,vlan20,vlan30; read: action=connect |
| ref | from | 10 | fo-0025#lc: "conect them each to the next" gold: action=connect from=raw,staged,curated,mart; read: action=connect pairing=next<br>fo-0035#lc: "disconnect it from spine1 and spine2" gold: action=disconnect from=leaf4 to=spine1,spine2; read: action=disconnect from=mention(quantifier=all,shape=square) to=spine1,spine2<br>fo-0076#lc: "All three consumers -> aggregator" gold: action=connect from=consumer1,consumer2,consumer3 to=aggregator; read: action=connect to=aggregator |
| ref | anchor | 9 | fo-0168#lc: "put grandma above both of them" gold: action=move target=grandma position=above anchor=mom,uncle; read: action=move anchor=mom position=above target=grandma<br>fo-0190#lc: "move it there" gold: action=move target=frog position=rightof anchor=grasshopper; read: action=move anchor=frog position=between target=frog<br>fo-0192#lc: "what's farthest from it" gold: ask=nearest anchor=earth superlative=farthest; read: ask=nearest superlative=farthest |
| class | position | 21 | fo-0006#lc: "Please create one small orange square with name Bastion near of subneta" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: action=create color=orange name=bastion shape=square size=small<br>fo-0010#lc: "Add a tiny black circle named Avatar right of search" gold: action=create shape=circle color=black size=tiny name=avatar position=rightof anchor=search; read: action=create color=black name=avatar shape=circle size=tiny<br>fo-0039#lc: "Add a diamond called Escalated right of rejected" gold: action=create shape=diamond name=escalated position=rightof anchor=rejected; read: action=create name=escalated shape=diamond |
| class | target | 16 | fo-0043#lc: "label card "Product"" gold: action=label target=card label=product; read: action=label label=product target=mention()<br>fo-0055#lc: "bring coresw to the front" gold: action=tofront target=coresw; read: action=tofront target=mention()<br>fo-0058#lc: "make gold gold" gold: action=set target=gold color=gold; read: action=set color=gold target=mention(color=gold) |
| class | color | 5 | fo-0189#lc: "Make every circle that isn't green blue" gold: action=set target=mention(notcolor=green,quantifier=all,shape=circle) color=blue; read: action=set color=green target=mention(notcolor=green,quantifier=all,shape=circle)<br>fo-0223#lc: "please add a red rectangle named Mum to the left of dad. actualy make it pink" gold: action=create shape=rectangle color=pink name=mum position=leftof anchor=dad; read: action=create anchor=dad color=red name=mum position=leftof shape=rectangle<br>fo-0223#lc: "make every rectangle that's not gray white" gold: action=set target=mention(notcolor=gray,quantifier=all,shape=rectangle) color=white; read: action=set color=gray target=mention(notcolor=gray,quantifier=all,shape=rectangle) |
| class | from | 3 | fo-0013#lc: "another one from review to rejected, dashed" gold: action=connect from=review to=rejected style=dashed; read: action=connect from=mention() style=dashed to=rejected<br>fo-0139#lc: "isp1 connects to edgerouter" gold: action=connect from=isp1 to=edgerouter; read: action=connect from=mention()<br>fo-0320#lc: "Which shapes can email reach" gold: ask=reachable from=email; read: ask=reachable from=mention() |
| class | anchor | 3 | fo-0065#lc: "Move palette left of canvas" gold: action=move target=palette position=leftof anchor=canvas; read: action=move anchor=mention() position=leftof target=mention()<br>fo-0271#lc: "put a brown ellipse named Seal right of fish" gold: action=create shape=ellipse color=brown name=seal position=rightof anchor=fish; read: action=create anchor=mention() color=brown name=seal position=rightof shape=ellipse<br>fo-0476#lc: "how many hexagons are left of desert" gold: ask=count shape=hexagon position=leftof anchor=desert; read: ask=count anchor=mention() position=leftof shape=hexagon |
| class | shape | 3 | fo-0087#lc: "I want wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake<br>fo-0329#lc: "If not, add one near customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=customs position=near<br>fo-0518#lc: "how many of them are green" gold: ask=count shape=circle color=green; read: ask=count color=green |
| class | to | 1 | fo-0114#lc: "dotted two-way link db to replica" gold: action=connect from=db to=replica style=dotted arrow=both; read: action=connect arrow=both from=db style=dotted to=mention() |
| name | target | 54 | fo-0012#lc: "What colour is rds" gold: ask=property target=rds property=color; read: ask=property property=color target=alb<br>fo-0034#lc: "line svc1 svc2 and svc3 up verticaly" gold: action=align target=svc1,svc2,svc3 axis=vertical; read: action=align axis=vertical<br>fo-0042#lc: "relabel it "results v2"" gold: action=label target=results label=results v2; read: action=label label=results v2 target=$new |
| name | from | 52 | fo-0003#lc: "arrow from idle to running" gold: action=connect from=idle to=running; read: action=connect to=running<br>fo-0004#lc: "connect ingest parse clean and load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect pairing=chain<br>fo-0004#lc: "connect clean to Dlq with a dotted line" gold: action=connect from=clean to=$new style=dotted arrow=none; read: action=connect arrow=none style=dotted to=$new |
| name | to | 28 | fo-0027#lc: "shutdown back to off" gold: action=connect from=shutdown to=off; read: action=connect<br>fo-0027#lc: "check whether ready can reach off" gold: ask=path from=ready to=off; read: ask=path to=ready<br>fo-0045#lc: "halfopen back to closed" gold: action=connect from=halfopen to=closed; read: action=connect |
| name | anchor | 13 | fo-0055#lc: "edgefw sits between internet and coresw in reality, please move it there" gold: action=move target=edgefw position=between anchor=internet,coresw; read: action=move anchor=internet position=between<br>fo-0108#lc: "Add a queue between producer and consumer, a teal ellipse called Mq. Sorry, make that a teal rectangle" gold: action=create shape=rectangle color=teal name=mq position=between anchor=producer,consumer; read: action=create anchor=producer color=teal name=mq position=between shape=rectangle<br>fo-0125#lc: "Which shape is nearest to closebtn" gold: ask=nearest anchor=closebtn superlative=closest; read: ask=nearest anchor=window superlative=closest |
| name | name | 1 | fo-0049#lc: "Add a white square named Pc1 next to router. Wait, call it Laptop, not Pc1" gold: action=create shape=square color=white name=laptop position=near anchor=router; read: action=create anchor=router color=white name=pc1 position=near shape=square |
| name | count | 1 | fo-0333#lc: "Add six small pink circles around Floor... no, make it eight" gold: action=create shape=circle size=small color=pink count=8 position=near anchor=$new; read: action=create anchor=$new color=pink count=6 position=near shape=circle size=small |
| cut | (5 more keys; all in the JSON) | | |
| act | (11 more keys; all in the JSON) | | |

**lowercase_other / all, trigger unseen** (46)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 3 | fo-0104#lc: "did I make igw a circle" gold: ask=check target=igw shape=circle; read: not done (lost: no unit on the span)<br>fo-0144#lc: "I want broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: not done (lost: no unit on the span)<br>fo-0534#lc: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move position=right (the unit covers 0% of the span) |
| 4 wrong act | model (act head) | 22 | fo-0076#lc: "aggregator: diamond" gold: action=set target=aggregator shape=diamond; read: not done (read as command:create)<br>fo-0076#lc: "aggregator: diamond" gold: requested: aggregator: diamond; read: extra command:create action=create shape=diamond (read as command:create where command:set is requested)<br>fo-0184#lc: "genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: not done (read as command:create) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 4 | fo-0076#lc: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers (a name written in another request or by a pronoun)<br>fo-0113#lc: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple (a name written in another request or by a pronoun)<br>fo-0184#lc: "body to the left of it" gold: action=move target=body position=leftof anchor=brain; read: action=move anchor=$new position=leftof target=$new (a name written in another request or by a pronoun) |
| 7 wrong words tagged for a name / text key | model (token head) | 17 | fo-0010#lc: "footer: gray" gold: action=set target=footer color=gray; read: action=set color=gray<br>fo-0089#lc: "input1 input2 input3 evnly spaced vertically" gold: action=distribute target=input1,input2,input3 axis=vertical; read: action=distribute axis=vertical target=$new<br>fo-0092#lc: "redis teal, no, cyan" gold: action=set target=redis color=cyan; read: action=set color=cyan |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:move) | 2 | fo-0144#lc: "I want broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: not done<br>fo-0534#lc: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move position=right |
| cut | (question:check) | 1 | fo-0104#lc: "did I make igw a circle" gold: ask=check target=igw shape=circle; read: not done |
| act | question:degree read as question:count | 6 | fo-0335#lc: "How many shapes are connected to score" gold: ask=degree target=score; read: not done<br>fo-0335#lc: "How many shapes are connected to score" gold: requested: How many shapes are connected to score; read: extra question:count ask=count linked=score<br>fo-0462#lc: "How many shapes are connected to coding" gold: ask=degree target=coding; read: not done |
| act | command:set read as command:create | 4 | fo-0076#lc: "aggregator: diamond" gold: action=set target=aggregator shape=diamond; read: not done<br>fo-0076#lc: "aggregator: diamond" gold: requested: aggregator: diamond; read: extra command:create action=create shape=diamond<br>fo-0397#lc: "pay a diamond" gold: action=set target=pay shape=diamond; read: not done |
| act | command:move read as command:create | 4 | fo-0184#lc: "genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: not done<br>fo-0184#lc: "plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done<br>fo-0184#lc: "genes to the right of it" gold: requested: genes to the right of it; read: extra command:create action=create name=genes |
| act | question:extreme read as question:check | 4 | fo-0554#lc: "Is Teardown the last one on the right" gold: ask=extreme superlative=rightmost; read: not done<br>fo-0554#lc: "Is Teardown the last one on the right" gold: requested: Is Teardown the last one on the right; read: extra question:check ask=check position=right target=mention()<br>fo-0594#lc: "Is Scene4 the last one at the bottom" gold: ask=extreme superlative=bottommost; read: not done |
| act | command:rename read as command:connect | 2 | fo-0210#lc: "coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done<br>fo-0210#lc: "coach2 to Seniors" gold: requested: coach2 to Seniors; read: extra command:connect action=connect from=coach1 to=seniors |
| act | question:property read as question:help | 2 | fo-0504#lc: "Can I ask what the shape of gate is" gold: ask=property target=gate property=shape; read: not done<br>fo-0504#lc: "Can I ask what the shape of gate is" gold: requested: Can I ask what the shape of gate is; read: extra question:help ask=help aspect=can topic=shape |
| ref | target | 2 | fo-0076#lc: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers<br>fo-0113#lc: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple |
| ref | anchor | 2 | fo-0184#lc: "body to the left of it" gold: action=move target=body position=leftof anchor=brain; read: action=move anchor=$new position=leftof target=$new<br>fo-0217#lc: "an orange one named Music above it" gold: action=create shape=star color=orange name=music position=above anchor=party; read: action=create anchor=$new color=orange name=music position=above shape=circle |
| name | target | 15 | fo-0010#lc: "footer: gray" gold: action=set target=footer color=gray; read: action=set color=gray<br>fo-0089#lc: "input1 input2 input3 evnly spaced vertically" gold: action=distribute target=input1,input2,input3 axis=vertical; read: action=distribute axis=vertical target=$new<br>fo-0092#lc: "redis teal, no, cyan" gold: action=set target=redis color=cyan; read: action=set color=cyan |
| name | anchor | 1 | fo-0124#lc: "map and reduce, are they linked" gold: ask=connected target=map anchor=reduce; read: ask=connected target=map |
| name | from | 1 | fo-0554#lc: "Make setup, doors, show and teardown go one after the other with arrows" gold: action=connect from=setup,doors,show,teardown; read: action=connect from=setup,show,teardown |

**lowercase_other / all, trigger no request** (66)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 35 | fo-0042#lc: "'s the" gold: -; read: extra question:check ask=check target=buffer (partial overlap with a requested action: 22% of it)<br>fo-0042#lc: "on" gold: -; read: extra command:create action=create (partial overlap with a requested action: 7% of it)<br>fo-0049#lc: "Wait" gold: -; read: extra command:create action=create (partial overlap with a requested action: 5% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 31 | fo-0027#lc: "Booting can also go to Error" gold: -; read: extra command:connect action=connect from=booting to=error (no requested action on this text)<br>fo-0027#lc: "you" gold: -; read: extra command:create action=create (no requested action on this text)<br>fo-0118#lc: "Undo that" gold: -; read: extra command:undo action=undo (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 18 | fo-0042#lc: "on" gold: -; read: extra command:create action=create<br>fo-0049#lc: "Wait" gold: -; read: extra command:create action=create<br>fo-0089#lc: "input1" gold: -; read: extra command:create action=create name=input1 |
| cut | command:set | 3 | fo-0158#lc: "so" gold: -; read: extra command:set action=set<br>fo-0223#lc: "actualy make it pink" gold: -; read: extra command:set action=set color=pink target=$new<br>fo-0579#lc: "lime" gold: -; read: extra command:set action=set color=lime target=lettuce |
| cut | command:arrange | 2 | fo-0118#lc: "Arrange everything in a row" gold: -; read: extra command:arrange action=arrange layout=row<br>fo-0118#lc: "row" gold: -; read: extra command:arrange action=arrange layout=row |
| cut | question:help | 2 | fo-0165#lc: "can" gold: -; read: extra question:help ask=help aspect=can<br>fo-0237#lc: "can" gold: -; read: extra question:help ask=help aspect=can |
| cut | command:connect | 2 | fo-0271#lc: "fish to shark" gold: -; read: extra command:connect action=connect to=shark<br>fo-0430#lc: "factory feeds" gold: -; read: extra command:connect action=connect from=warehouse to=warehouse |
| cut | question:check | 1 | fo-0042#lc: "'s the" gold: -; read: extra question:check ask=check target=buffer |
| cut | command:rename | 1 | fo-0049#lc: "call it Laptop, not Pc1" gold: -; read: extra command:rename action=rename name=laptop target=$new |
| cut | command:flip | 1 | fo-0105#lc: "flip them" gold: -; read: extra command:flip action=flip axis=horizontal target=mention(quantifier=all) |
| spurious | command:connect | 8 | fo-0027#lc: "Booting can also go to Error" gold: -; read: extra command:connect action=connect from=booting to=error<br>fo-0161#lc: "the same" gold: -; read: extra command:connect action=connect from=dad to=dad<br>fo-0165#lc: "arrow" gold: -; read: extra command:connect action=connect from=$new to=$new |
| spurious | command:create | 5 | fo-0027#lc: "you" gold: -; read: extra command:create action=create<br>fo-0136#lc: "Please" gold: -; read: extra command:create action=create<br>fo-0180#lc: "Mom," gold: -; read: extra command:create action=create name=mom |
| spurious | command:set | 4 | fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body<br>fo-0217#lc: "Music should be a star actually" gold: -; read: extra command:set action=set shape=star target=$new<br>fo-0277#lc: "Wolf just turned into a star" gold: -; read: extra command:set action=set shape=star target=wolf |
| spurious | fact: | 4 | fo-0243#lc: "Business is in the centre" gold: -; read: extra fact: position=center target=business<br>fo-0264#lc: "Weather is in the middle" gold: -; read: extra fact: position=center target=weather<br>fo-0350#lc: "the Warehouse is optional" gold: -; read: extra fact: target=warehouse |
| spurious | command:move | 3 | fo-0168#lc: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0288#lc: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance<br>fo-0424#lc: "Users hit the Paywall right after Trial" gold: -; read: extra command:move action=move anchor=trial position=rightof target=paywall |
| spurious | question:check | 2 | fo-0147#lc: "not red" gold: -; read: extra question:check ask=check target=ended<br>fo-0557#lc: "Is the map symmetric" gold: -; read: extra question:check ask=check |
| spurious | command:disconnect | 2 | fo-0246#lc: "the arrow from Cow to Human," gold: -; read: extra command:disconnect action=disconnect from=cow to=human<br>fo-0355#lc: "drop the Truck route entirely" gold: -; read: extra command:disconnect action=disconnect from=plant to=plant |
| spurious | command:undo | 1 | fo-0118#lc: "Undo that" gold: -; read: extra command:undo action=undo |
| cut | (5 more keys; all in the JSON) | | |
| spurious | (2 more keys; all in the JSON) | | |

### lowercase_other / all at the cost-10 threshold (0.9320)

Executed: right 144, wrong 0, extras 3. Structural holds 33 ({"blocked":14,"dependency":19}; 8 of them would have been right). Confidence holds 967: right 580, wrong or extra 387. Unread 57.

**Executed wrong, by first cause** (3)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 3 | fo-0118#lc: "Undo that" gold: -; read: extra command:undo action=undo (confidence 0.975; extra)<br>fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body (confidence 0.957; extra)<br>fo-0288#lc: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance (confidence 0.933; extra) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:undo | 1 | fo-0118#lc: "Undo that" gold: -; read: extra command:undo action=undo |
| spurious | command:set | 1 | fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body |
| spurious | command:move | 1 | fo-0288#lc: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance |

**Right but held by confidence** (580)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:connect | 111 | fo-0002#lc: "draw a dashed arrow from api to cache" gold: action=connect from=api to=cache style=dashed; read: command:connect action=connect from=api style=dashed to=cache<br>fo-0003#lc: "paused should go back to running" gold: action=connect from=paused to=running; read: command:connect action=connect from=paused to=running<br>fo-0004#lc: "hook load up to warehouse with a normal arrow" gold: action=connect from=load to=warehouse; read: command:connect action=connect arrow=none from=load to=warehouse |
| held | command:set | 78 | fo-0004#lc: "make it a navy ellipse" gold: action=set target=warehouse color=navy shape=ellipse; read: command:set action=set color=navy shape=ellipse target=warehouse<br>fo-0008#lc: "Make alarm red. No wait, orange" gold: action=set target=alarm color=orange; read: command:set action=set color=orange target=alarm<br>fo-0013#lc: "Make rejected a red octagon... ok no octagons, a red hexagon then" gold: action=set target=rejected color=red shape=hexagon; read: command:set action=set color=red shape=hexagon target=rejected |
| held | command:move | 58 | fo-0010#lc: "logo goes to the top left" gold: action=move target=logo position=topleft; read: command:move action=move position=topleft target=logo<br>fo-0013#lc: "Put archived to the right of published" gold: action=move target=archived position=rightof anchor=published; read: command:move action=move anchor=published position=rightof target=archived<br>fo-0020#lc: "move transform between extract and load" gold: action=move target=transform position=between anchor=extract,load; read: command:move action=move anchor=extract,load position=between target=transform |
| held | command:create | 51 | fo-0001#lc: "put a gray hexagon called Switch between fw1 and lan" gold: action=create shape=hexagon color=gray name=switch position=between anchor=fw1,lan; read: command:create action=create anchor=fw1,lan color=gray name=switch position=between shape=hexagon<br>fo-0004#lc: "add a small red diamond called Dlq below clean" gold: action=create shape=diamond color=red size=small name=dlq position=below anchor=clean; read: command:create action=create anchor=clean color=red name=dlq position=below shape=diamond size=small<br>fo-0018#lc: "add uh three small yellow circles under lambda" gold: action=create shape=circle color=yellow size=small count=3 position=below anchor=lambda; read: command:create action=create anchor=lambda color=yellow count=3 position=below shape=circle size=small |
| held | question:check | 38 | fo-0030#lc: "is broker between producer and consumer" gold: ask=check target=broker position=between anchor=consumer,producer; read: question:check ask=check anchor=consumer,producer position=between target=broker<br>fo-0032#lc: "Is ecr smaller than eks" gold: ask=check target=ecr comparison=smaller anchor=eks; read: question:check ask=check anchor=eks comparison=smaller target=ecr<br>fo-0052#lc: "is metrics above db" gold: ask=check target=metrics position=above anchor=db; read: question:check ask=check anchor=db position=above target=metrics |
| held | question:count | 29 | fo-0004#lc: "how many rectangles are there right now" gold: ask=count shape=rectangle; read: question:count ask=count shape=rectangle<br>fo-0035#lc: "How many connections in total now" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>fo-0047#lc: "How many circles we have" gold: ask=count shape=circle; read: question:count ask=count shape=circle |
| held | command:arrange | 23 | fo-0004#lc: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all,shape=rectangle)<br>fo-0010#lc: "card1, card2 and card3 should sit in a row" gold: action=arrange target=card1,card2,card3 layout=row; read: command:arrange action=arrange layout=row target=card1,card2,card3<br>fo-0025#lc: "arange raw, staged, curated and mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: command:arrange action=arrange layout=column target=raw,staged,curated,mart template=pillars |
| held | question:property | 19 | fo-0037#lc: "whats the colour of store" gold: ask=property target=store property=color; read: question:property ask=property property=color target=store<br>fo-0149#lc: "can you tell me what color sidebar is" gold: ask=property target=sidebar property=color; read: question:property ask=property property=color target=sidebar<br>fo-0191#lc: "what colour is aunt" gold: ask=property target=aunt property=color; read: question:property ask=property property=color target=aunt |
| held | (27 more keys; all in the JSON) | | |

**Structural holds** (33)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 12 | fo-0013#lc: "published goes to archived later on" gold: action=connect from=published to=archived; read: command:connect action=connect from=rejected to=archived<br>fo-0042#lc: "on" gold: -; read: command:create action=create<br>fo-0089#lc: "input1" gold: -; read: command:create action=create name=input1 |
| blocked | unresolved-reference | 2 | fo-0052#lc: "arrange worker and the copies in a column to the right of Scheduler" gold: action=arrange target=worker,$new layout=column; read: command:arrange action=arrange layout=column<br>fo-0513#lc: "connect cold kitchen and phone in a chain" gold: action=connect from=cold,kitchen,phone; read: command:connect action=connect pairing=chain |

## t1s / all (1791 messages, 1791 requested: right 1729, wrong 62, not done 0, extras 1; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 1 |
| actions | 0 |
| values/roles | 62 |
| calibration | 331 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1791); ok (ungated: right + would-be right of structural holds = right of every request executed: 1729); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 62); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 1); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 1729); ok (ungated wrong equals the score file: 62); ok (ungated extras equals the score file: 1); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 1792); ok (gated: executed wrong equals the score file: 18); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 358); ok (gated: right executed equals the score file: 1416); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 358)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 0 | 0 | 0 | 1 | 1 |
| 6 wrong or missing class value | model (class head) | 61 | 0 | 0 | 0 | 61 |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | 0 | 0 | 0 | 1 |

**t1s / all, trigger seen** (62)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 61 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon,size=tiny)<br>st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue outline=blue shape=rectangle<br>st1-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=purple outline=purple shape=star |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | st1-00472: "connect Auth to Ingress" gold: action=connect from=auth to=ingress; read: action=connect to=ingress |

| cause | key | n | examples |
|---|---|---:|---|
| class | color | 54 | st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue outline=blue shape=rectangle<br>st1-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=purple outline=purple shape=star<br>st1-00208: "draw a gray star with a blue border" gold: action=create shape=star color=gray outline=blue; read: action=create color=blue outline=blue shape=star |
| class | outline | 12 | st1-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: action=create color=black outline=black shape=hexagon<br>st1-00332: "add a gray hexagon with a pink border" gold: action=create shape=hexagon color=gray outline=pink; read: action=create color=gray outline=gray shape=hexagon<br>st1-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: action=create color=navy outline=orange shape=hexagon |
| class | target | 5 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon,size=tiny)<br>st1-01132: "make the huge rectangles pink" gold: action=set target=mention(quantifier=all,shape=rectangle,size=huge) color=pink; read: action=set target=mention(quantifier=all,shape=rectangle,size=large)<br>st1-01827: "make the giant squares yellow" gold: action=set target=mention(quantifier=all,shape=square,size=huge) color=yellow; read: action=set color=yellow target=mention(quantifier=all,shape=square) |
| class | kind | 1 | st1-01856: "make the arrows dotted" gold: action=set kind=edge style=dotted target=mention(quantifier=all); read: action=set from=$new style=dotted to=$new |
| name | from | 1 | st1-00472: "connect Auth to Ingress" gold: action=connect from=auth to=ingress; read: action=connect to=ingress |

**t1s / all, trigger no request** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 1 | st1-01856: "make" gold: -; read: extra command:create action=create (partial overlap with a requested action: 18% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 1 | st1-01856: "make" gold: -; read: extra command:create action=create |

### t1s / all at the cost-10 threshold (0.9320)

Executed: right 1416, wrong 18, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 358: right 313, wrong or extra 45. Unread 0.

**Executed wrong, by first cause** (18)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 18 | st1-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: command:create action=create color=black outline=black shape=hexagon (confidence 0.934; wrong)<br>st1-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: command:create action=create color=pink outline=pink shape=diamond (confidence 0.941; wrong)<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=navy outline=navy shape=triangle (confidence 0.937; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | color | 15 | st1-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: command:create action=create color=pink outline=pink shape=diamond<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=navy outline=navy shape=triangle<br>st1-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: command:create action=create color=navy outline=orange shape=hexagon |
| class | outline | 6 | st1-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: command:create action=create color=black outline=black shape=hexagon<br>st1-00332: "add a gray hexagon with a pink border" gold: action=create shape=hexagon color=gray outline=pink; read: command:create action=create color=gray outline=gray shape=hexagon<br>st1-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: command:create action=create color=navy outline=orange shape=hexagon |

**Right but held by confidence** (313)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:set | 117 | st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: command:set action=set outline=navy target=sales<br>st1-00058: "make the arrow from M to Y orange" gold: action=set from=m to=y color=orange; read: command:set action=set color=orange from=m to=y<br>st1-00086: "make Nucleus's border blue" gold: action=set target=nucleus outline=blue; read: command:set action=set outline=blue target=nucleus |
| held | command:create | 96 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: command:create action=create color=purple outline=cyan shape=square<br>st1-00054: "add a teal circle" gold: action=create shape=circle color=teal; read: command:create action=create color=teal shape=circle<br>st1-00088: "create a list with Bedroom, Bathroom and Pantry" gold: action=create template=list items=bedroom,bathroom,pantry; read: command:create action=create items=bedroom,bathroom,pantry template=list |
| held | command:move | 46 | st1-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: command:move action=move direction=up target=mention(quantifier=all,shape=diamond,size=small)<br>st1-00141: "move Tackle up" gold: action=move target=tackle direction=up; read: command:move action=move direction=up target=tackle<br>st1-00187: "move Auth left" gold: action=move target=auth direction=left; read: command:move action=move direction=left target=auth |
| held | question:count | 12 | st1-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small<br>st1-00250: "how many small circles are there" gold: ask=count shape=circle size=small; read: question:count ask=count shape=circle size=small<br>st1-00364: "how many arrows do I have" gold: ask=count kind=edge; read: question:count ask=count kind=edge |
| held | command:delete | 12 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle,size=large)<br>st1-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square,size=huge)<br>st1-00410: "erase the little circles" gold: action=delete target=mention(quantifier=all,shape=circle,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=circle,size=small) |
| held | command:snap | 4 | st1-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01598: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:sort | 4 | st1-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all)<br>st1-01489: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | command:groupBy | 4 | st1-00446: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01757: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01804: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all) |
| held | (8 more keys; all in the JSON) | | |

**Structural holds** (0)

none

## t1raw / all (70 messages, 70 requested: right 69, wrong 1, not done 0, extras 0; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 0 |
| values/roles | 1 |
| calibration | 15 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 70); ok (ungated: right + would-be right of structural holds = right of every request executed: 69); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 1); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 0); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 69); ok (ungated wrong equals the score file: 1); ok (ungated extras equals the score file: 0); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 70); ok (gated: executed wrong equals the score file: 0); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 16); ok (gated: right executed equals the score file: 54); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 16)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 6 wrong or missing class value | model (class head) | 1 | 0 | 0 | 0 | 1 |

**t1raw / all, trigger seen** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 1 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=blue outline=brown shape=square |

| cause | key | n | examples |
|---|---|---:|---|
| class | color | 1 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=blue outline=brown shape=square |
| class | outline | 1 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=blue outline=brown shape=square |

### t1raw / all at the cost-10 threshold (0.9320)

Executed: right 54, wrong 0, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 16: right 15, wrong or extra 1. Unread 0.

**Executed wrong, by first cause** (0)

none

**Right but held by confidence** (15)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 9 | st1-00265: "add an orange triangle" gold: action=create shape=triangle color=orange; read: command:create action=create color=orange shape=triangle<br>st1-00325: "add a blue star" gold: action=create shape=star color=blue; read: command:create action=create color=blue shape=star<br>st1-00541: "add a green circle" gold: action=create shape=circle color=green; read: command:create action=create color=green shape=circle |
| held | command:move | 3 | st1-01055: "move H left" gold: action=move target=h direction=left; read: command:move action=move direction=left target=h<br>st1-01174: "move the small stars right" gold: action=move target=mention(quantifier=all,shape=star,size=small) direction=right; read: command:move action=move direction=right target=mention(quantifier=all,shape=star,size=small)<br>st1-02155: "move the big ellipses right" gold: action=move target=mention(quantifier=all,shape=ellipse,size=large) direction=right; read: command:move action=move direction=right target=mention(quantifier=all,shape=ellipse,size=large) |
| held | command:set | 2 | st1-01736: "make all the lines dashed" gold: action=set kind=edge style=dashed target=mention(quantifier=all); read: command:set action=set kind=edge style=dashed target=mention(quantifier=all)<br>st1-01772: "make the tiny squares gold" gold: action=set target=mention(quantifier=all,shape=square,size=tiny) color=gold; read: command:set action=set color=gold target=mention(quantifier=all,shape=square,size=tiny) |
| held | command:fit | 1 | st1-01699: "fit the diagram to the screen" gold: action=fit target=mention(quantifier=all); read: command:fit action=fit target=mention(quantifier=all) |

**Structural holds** (0)

none

## t1bs / all (1528 messages, 1528 requested: right 1468, wrong 60, not done 0, extras 0; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 0 |
| values/roles | 60 |
| calibration | 225 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1528); ok (ungated: right + would-be right of structural holds = right of every request executed: 1468); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 60); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 0); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 1468); ok (ungated wrong equals the score file: 60); ok (ungated extras equals the score file: 0); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 1528); ok (gated: executed wrong equals the score file: 19); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 247); ok (gated: right executed equals the score file: 1262); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 247)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 6 wrong or missing class value | model (class head) | 59 | 0 | 0 | 0 | 59 |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | 0 | 0 | 0 | 1 |

**t1bs / all, trigger seen** (60)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 59 | st1b-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon,size=tiny)<br>st1b-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue outline=blue shape=rectangle<br>st1b-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=purple outline=purple shape=star |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | st1b-00472: "connect Auth to Ingress" gold: action=connect from=auth to=ingress; read: action=connect to=ingress |

| cause | key | n | examples |
|---|---|---:|---|
| class | color | 53 | st1b-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create color=blue outline=blue shape=rectangle<br>st1b-00082: "make a red star with a purple outline" gold: action=create shape=star color=red outline=purple; read: action=create color=purple outline=purple shape=star<br>st1b-00208: "draw a gray star with a blue border" gold: action=create shape=star color=gray outline=blue; read: action=create color=blue outline=blue shape=star |
| class | outline | 12 | st1b-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: action=create color=black outline=black shape=hexagon<br>st1b-00332: "add a gray hexagon with a pink border" gold: action=create shape=hexagon color=gray outline=pink; read: action=create color=gray outline=gray shape=hexagon<br>st1b-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: action=create color=navy outline=orange shape=hexagon |
| class | target | 4 | st1b-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon,size=tiny)<br>st1b-01132: "make the huge rectangles pink" gold: action=set target=mention(quantifier=all,shape=rectangle,size=huge) color=pink; read: action=set target=mention(quantifier=all,shape=rectangle,size=large)<br>st1b-01827: "make the giant squares yellow" gold: action=set target=mention(quantifier=all,shape=square,size=huge) color=yellow; read: action=set color=yellow target=mention(quantifier=all,shape=square) |
| name | from | 1 | st1b-00472: "connect Auth to Ingress" gold: action=connect from=auth to=ingress; read: action=connect to=ingress |

### t1bs / all at the cost-10 threshold (0.9320)

Executed: right 1262, wrong 19, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 247: right 206, wrong or extra 41. Unread 0.

**Executed wrong, by first cause** (19)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 19 | st1b-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: command:create action=create color=black outline=black shape=hexagon (confidence 0.966; wrong)<br>st1b-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: command:create action=create color=pink outline=pink shape=diamond (confidence 0.941; wrong)<br>st1b-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=navy outline=navy shape=triangle (confidence 0.937; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | color | 16 | st1b-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: command:create action=create color=pink outline=pink shape=diamond<br>st1b-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: command:create action=create color=navy outline=navy shape=triangle<br>st1b-00462: "draw a black triangle with a purple border" gold: action=create shape=triangle color=black outline=purple; read: command:create action=create color=purple outline=black shape=triangle |
| class | outline | 5 | st1b-00169: "add a black hexagon with a purple border" gold: action=create shape=hexagon color=black outline=purple; read: command:create action=create color=black outline=black shape=hexagon<br>st1b-00332: "add a gray hexagon with a pink border" gold: action=create shape=hexagon color=gray outline=pink; read: command:create action=create color=gray outline=gray shape=hexagon<br>st1b-00462: "draw a black triangle with a purple border" gold: action=create shape=triangle color=black outline=purple; read: command:create action=create color=purple outline=black shape=triangle |

**Right but held by confidence** (206)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:set | 102 | st1b-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: command:set action=set outline=navy target=sales<br>st1b-00086: "make Nucleus's border blue" gold: action=set target=nucleus outline=blue; read: command:set action=set outline=blue target=nucleus<br>st1b-00117: "make Ops's outline navy" gold: action=set target=ops outline=navy; read: command:set action=set outline=navy target=ops |
| held | command:create | 44 | st1b-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: command:create action=create color=purple outline=cyan shape=square<br>st1b-00054: "add a teal circle" gold: action=create shape=circle color=teal; read: command:create action=create color=teal shape=circle<br>st1b-00088: "create a list with Bedroom, Bathroom and Pantry" gold: action=create template=list items=bedroom,bathroom,pantry; read: command:create action=create items=bedroom,bathroom,pantry template=list |
| held | command:move | 27 | st1b-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: command:move action=move direction=up target=mention(quantifier=all,shape=diamond,size=small)<br>st1b-00141: "move Tackle up" gold: action=move target=tackle direction=up; read: command:move action=move direction=up target=tackle<br>st1b-00187: "move Auth left" gold: action=move target=auth direction=left; read: command:move action=move direction=left target=auth |
| held | command:delete | 10 | st1b-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle,size=large)<br>st1b-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square,size=huge)<br>st1b-00410: "erase the little circles" gold: action=delete target=mention(quantifier=all,shape=circle,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=circle,size=small) |
| held | question:count | 9 | st1b-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small<br>st1b-00250: "how many small circles are there" gold: ask=count shape=circle size=small; read: question:count ask=count shape=circle size=small<br>st1b-00802: "how many big circles are there" gold: ask=count shape=circle size=large; read: question:count ask=count shape=circle size=large |
| held | command:snap | 2 | st1b-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1b-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:equalize | 2 | st1b-00248: "make all the shapes the same color" gold: action=equalize target=mention(quantifier=all) property=color; read: command:equalize action=equalize property=color target=mention(quantifier=all)<br>st1b-01500: "make all the shapes the same size" gold: action=equalize target=mention(quantifier=all) property=size; read: command:equalize action=equalize property=size target=mention(quantifier=all) |
| held | command:sort | 2 | st1b-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1b-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | (6 more keys; all in the JSON) | | |

**Structural holds** (0)

none

## short3s / all (333 messages, 424 requested: right 276, wrong 109, not done 39, extras 33; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 17 |
| actions | 56 |
| values/roles | 108 |
| calibration | 188 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 424); ok (ungated: right + would-be right of structural holds = right of every request executed: 276); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 109); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 33); ok (ungated: unread = requested - paired: 39); ok (ungated right equals the score file: 275); ok (ungated wrong equals the score file: 101); ok (ungated extras equals the score file: 30); ok (ungated unread equals the score file: 39); ok (ungated structural holds equal the score file: 12); ok (every produced request is executed, structurally held or (gated) confidence-held: 418); ok (gated: executed wrong equals the score file: 6); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 12); ok (gated: confidence holds equal the score file: 307); ok (gated: right executed equals the score file: 93); ok (gated: unread equals the score file: 39); ok (gated: held right + held wrong or extra = confidence holds: 307)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 12 | 0 | 0 | 5 | 17 |
| 4 wrong act | model (act head) | 40 | 16 | 0 | 0 | 56 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 7 | 0 | 0 | 0 | 7 |
| 6 wrong or missing class value | model (class head) | 35 | 8 | 0 | 0 | 43 |
| 7 wrong words tagged for a name / text key | model (token head) | 47 | 11 | 0 | 0 | 58 |

**short3s / all, trigger seen** (141)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 12 | s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: not done (merged into a unit with another request)<br>s3-0131: "done on top" gold: action=tofront target=done; read: not done (lost: no unit on the span)<br>s3-0137: "undo" gold: action=undo; read: not done (merged into a unit with another request) |
| 4 wrong act | model (act head) | 40 | s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: not done (read as command:create)<br>s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done (read as command:create)<br>s3-0035: "put done under check" gold: requested: put done under check; read: extra command:create action=create (read as command:create where command:move is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 7 | s3-0193: "also bigger" gold: action=resize target=check; read: action=resize (a name written in another request or by a pronoun)<br>s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done (a name written in another request or by a pronoun)<br>s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 35 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue fill=light outline=blue shape=rectangle<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 layout=row |
| 7 wrong words tagged for a name / text key | model (token head) | 47 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0005: "dotted line process to done" gold: action=connect from=process to=done style=dotted arrow=none; read: action=connect arrow=none from=process style=dotted<br>s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=check |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 3 | s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: not done<br>s3-0264: "start gold" gold: action=set target=start color=gold; read: not done<br>s3-0439: "end red" gold: action=set target=end color=red; read: not done |
| cut | (command:create) | 3 | s3-0146: "create Api" gold: action=create shape=square name=api; read: not done<br>s3-0146: "Db squares" gold: action=create shape=square name=db; read: not done<br>s3-0252: "add Sub1" gold: action=create name=sub1 position=below anchor=process; read: not done |
| cut | (command:toFront) | 1 | s3-0131: "done on top" gold: action=tofront target=done; read: not done |
| cut | (command:undo) | 1 | s3-0137: "undo" gold: action=undo; read: not done |
| cut | (command:rename) | 1 | s3-0305: "named Gate" gold: action=rename target=check name=gate; read: not done |
| cut | (command:arrange) | 1 | s3-0318: "tree layout, root Start, growing down" gold: action=arrange layout=tree anchor=start direction=down; read: action=arrange layout=tree |
| cut | (question:property) | 1 | s3-0333: "where is it" gold: ask=property target=intake property=position; read: not done |
| cut | (command:group) | 1 | s3-0472: "group check & done" gold: action=group target=check,done; read: not done |
| act | command:move read as command:create | 4 | s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: not done<br>s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done<br>s3-0035: "put done under check" gold: requested: put done under check; read: extra command:create action=create |
| act | command:arrange read as command:create | 3 | s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: not done<br>s3-0093: "make a timeline with Start Process Check Done" gold: requested: make a timeline with Start Process Check Done; read: extra command:create action=create items=start,process check,done template=timeline<br>s3-0318: "root Start, growing down" gold: requested: tree layout, root Start, growing down; read: extra command:create action=create |
| act | command:rename read as command:label | 2 | s3-0087: "Begin instead of Start" gold: action=rename target=start name=begin; read: not done<br>s3-0087: "Begin instead of Start" gold: requested: Begin instead of Start; read: extra command:label action=label target=begin,start |
| act | command:ungroup read as command:delete | 2 | s3-0095: "take Start out of the group" gold: action=ungroup target=start; read: not done<br>s3-0095: "take Start out of the group" gold: requested: take Start out of the group; read: extra command:delete action=delete target=start |
| act | command:group read as question:help | 2 | s3-0103: "group check and done" gold: action=group target=check,done; read: not done<br>s3-0103: "group check" gold: requested: group check and done; read: extra question:help ask=help |
| act | command:delete read as command:create | 2 | s3-0113: "bin done" gold: action=delete target=done; read: not done<br>s3-0113: "done" gold: requested: bin done; read: extra command:create action=create |
| act | command:set read as question:check | 2 | s3-0156: "check purple" gold: action=set target=check color=purple; read: not done<br>s3-0156: "check purple" gold: requested: check purple; read: extra question:check ask=check color=purple target=process |
| act | command:create read as command:move | 2 | s3-0252: "Sub2 below Process" gold: action=create name=sub2 position=below anchor=process; read: not done<br>s3-0252: "add Sub1 and Sub2 below Process" gold: requested: Sub2 below Process; read: extra command:move action=move anchor=process position=below target=sub1,sub2 |
| ref | target | 4 | s3-0193: "also bigger" gold: action=resize target=check; read: action=resize<br>s3-0266: "make it a star" gold: action=set target=end shape=star; read: action=set shape=star target=done<br>s3-0303: "align all three" gold: action=align target=start,check,done; read: action=align target=check |
| ref | from | 2 | s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label from=check label=skip to=check |
| ref | to | 1 | s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check |
| class | target | 10 | s3-0044: "the diagram looks messy can you fix it" gold: action=improve target=mention(quantifier=all); read: action=improve target=mention()<br>s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0126: "align them vertically" gold: action=align target=mention(quantifier=all) axis=vertical; read: action=align axis=vertical target=mention(quantifier=all,shape=circle) |
| class | template | 7 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 layout=row<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: action=create color=blue<br>s3-0240: "pyramid with 3 levels" gold: action=create template=pyramid count=3; read: action=create count=3 |
| class | shape | 5 | s3-0093: "add a title Roadmap" gold: action=create shape=text label=roadmap; read: action=create<br>s3-0270: "make the green circle a rectangle" gold: action=set target=mention(color=green,shape=circle) shape=rectangle; read: action=set shape=circle target=mention(color=green,shape=circle)<br>s3-0272: "convert all rectangles to ellipses" gold: action=set target=mention(quantifier=all,shape=rectangle) shape=ellipse; read: action=set shape=rectangle target=mention(quantifier=all,shape=rectangle) |
| class | layout | 5 | s3-0168: "draw 4 green circles in a line along the top" gold: action=create count=4 shape=circle color=green layout=row position=top; read: action=create color=green count=4 position=top shape=circle<br>s3-0221: "make the flow go left to right" gold: action=arrange layout=layers direction=right; read: action=arrange direction=right<br>s3-0264: "radial around start" gold: action=arrange layout=radial anchor=start; read: action=arrange anchor=start |
| class | position | 4 | s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 layout=row<br>s3-0406: "add 3 squares in a row under check" gold: action=create count=3 shape=square layout=row position=below anchor=check; read: action=create count=3 layout=row shape=square |
| class | arrow | 2 | s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: action=connect color=gray from=process to=done<br>s3-0434: "link Done to Check, dotted, both directions" gold: action=connect from=done to=check style=dotted arrow=both; read: action=connect from=done style=dotted to=check |
| class | layer | 1 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue fill=light outline=blue shape=rectangle |
| class | anchor | 1 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 layout=row |
| name | target | 26 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0057: "red for check" gold: action=set target=check color=red; read: action=set color=red<br>s3-0076: "recolor start to navy" gold: action=set target=start color=navy; read: action=set color=navy |
| name | to | 9 | s3-0005: "dotted line process to done" gold: action=connect from=process to=done style=dotted arrow=none; read: action=connect arrow=none from=process style=dotted<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0252: "connect Process to both" gold: action=connect from=process to=$new,$new; read: action=connect from=process |
| name | from | 8 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: action=connect from=process to=check<br>s3-0033: "reverse direction on check→done" gold: action=reverse from=check to=done; read: action=reverse to=done<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db |
| name | name | 3 | s3-0109: "circle Y at 700,100" gold: action=create shape=circle name=y at=700,100; read: action=create at=700,100 shape=circle<br>s3-0194: "can you call Done "Finish" instead" gold: action=rename target=done name=finish; read: action=rename target=done<br>s3-0261: "add Fail below Check in red" gold: action=create name=fail position=below anchor=check color=red; read: action=create anchor=check color=red position=below |
| name | about | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: ask=help aspect=can topic=create<br>s3-0236: "what does SOP Lang mean" gold: ask=help about=sop lang; read: ask=help topic=text |
| name | scale | 1 | s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |
| name | count | 1 | s3-0166: "add a 3 by 3 grid of small squares" gold: action=create count=9 shape=square size=small layout=grid; read: action=create layout=grid shape=square size=small |
| name | items | 1 | s3-0263: "draw a venn with two circles A and B" gold: action=create template=venn items=a,b; read: action=create count=2 linked=a name=b shape=circle template=venn |
| act | (11 more keys; all in the JSON) | | |
| class | (3 more keys; all in the JSON) | | |
| name | (1 more keys; all in the JSON) | | |

**short3s / all, trigger unseen** (35)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 16 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done (read as command:create)<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:create action=create (read as command:create where question:check is requested)<br>s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done (read as command:create) |
| 6 wrong or missing class value | model (class head) | 8 | s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: action=create count=4<br>s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create<br>s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black |
| 7 wrong words tagged for a name / text key | model (token head) | 11 | s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create anchor=core count=6 position=rightof template=hub<br>s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0083: "process no label" gold: action=label target=process label=; read: action=label target=process |

| cause | key | n | examples |
|---|---|---:|---|
| act | question:check read as command:create | 2 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:create action=create |
| act | command:set read as command:create | 2 | s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done<br>s3-0112: "red outline around process" gold: requested: red outline around process; read: extra command:create action=create |
| act | command:set read as command:label | 2 | s3-0181: "no border on start" gold: action=set target=start outline=none; read: not done<br>s3-0181: "no border on start" gold: requested: no border on start; read: extra command:label action=label target=start |
| act | command:set read as question:check | 2 | s3-0193: "check pink" gold: action=set target=check color=pink; read: not done<br>s3-0193: "check pink" gold: requested: check pink; read: extra question:check ask=check color=pink |
| act | command:set read as command:delete | 2 | s3-0322: "take the border off process" gold: action=set target=process outline=none; read: not done<br>s3-0322: "take the border off process" gold: requested: take the border off process; read: extra command:delete action=delete |
| act | command:resize read as command:set | 2 | s3-0365: "double check's size" gold: action=resize target=check; read: not done<br>s3-0365: "double check's size" gold: requested: double check's size; read: extra command:set action=set size=large |
| act | question:groupOf read as question:neighbors | 2 | s3-0493: "start belongs to which group" gold: ask=groupof target=start; read: not done<br>s3-0493: "start belongs to which group" gold: requested: start belongs to which group; read: extra question:neighbors ask=neighbors target=start |
| act | fact: read as question:list | 2 | s3-0517: "check lives in the top right" gold: target=check position=topright; read: not done<br>s3-0517: "check lives in the top right" gold: requested: check lives in the top right; read: extra question:list ask=list position=topright |
| class | template | 2 | s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: action=create count=4<br>s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create |
| class | outline | 2 | s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black<br>s3-0170: "outline done black" gold: action=set target=done outline=black; read: action=set color=black target=outline,done |
| class | target | 1 | s3-0239: "put everything in a single column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column |
| class | shape | 1 | s3-0265: "process → diamond" gold: action=set target=process shape=diamond; read: action=set target=process |
| class | color | 1 | s3-0395: "default for new shapes: small, purple" gold: size=small color=purple; read: size=small |
| class | direction | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange axis=vertical layout=layers |
| name | target | 6 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label<br>s3-0203: "put start process and check on one line" gold: action=align target=start,process,check; read: action=align axis=horizontal |
| name | label | 3 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label target=process<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | title | 1 | s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create anchor=core count=6 position=rightof template=hub |
| name | from | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | to | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check done |
| name | count | 1 | s3-0396: "twelve circles in a circle" gold: action=create count=12 shape=circle layout=circle; read: action=create layout=circle shape=circle |
| name | linked | 1 | s3-0422: "Done and Start are connected" gold: target=done linked=start; read: target=done |

**short3s / all, trigger no request** (5)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 5 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (partial overlap with a requested action: 40% of it)<br>s3-0160: "Could you" gold: -; read: extra command:create action=create (partial overlap with a requested action: 16% of it)<br>s3-0311: "Code" gold: -; read: extra command:label action=label (partial overlap with a requested action: 12% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:set | 2 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db<br>s3-0395: "purple" gold: -; read: extra command:set action=set color=purple |
| cut | command:create | 2 | s3-0160: "Could you" gold: -; read: extra command:create action=create<br>s3-0311: "Data" gold: -; read: extra command:create action=create name=data |
| cut | command:label | 1 | s3-0311: "Code" gold: -; read: extra command:label action=label |

### short3s / all at the cost-10 threshold (0.9320)

Executed: right 93, wrong 6, extras 0. Structural holds 12 ({"blocked":10,"dependency":2}; 1 of them would have been right). Confidence holds 307: right 182, wrong or extra 125. Unread 39.

**Executed wrong, by first cause** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 3 | s3-0272: "convert all rectangles to ellipses" gold: action=set target=mention(quantifier=all,shape=rectangle) shape=ellipse; read: command:set action=set shape=rectangle target=mention(quantifier=all,shape=rectangle) (confidence 0.981; wrong)<br>s3-0300: "give me a white hexagon with a red border" gold: action=create shape=hexagon color=white outline=red; read: command:create action=create color=red outline=red shape=hexagon (confidence 0.935; wrong)<br>s3-0434: "link Done to Check, dotted, both directions" gold: action=connect from=done to=check style=dotted arrow=both; read: command:connect action=connect from=done style=dotted to=check (confidence 0.953; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 3 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can topic=create (confidence 0.984; wrong)<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db (confidence 0.993; wrong)<br>s3-0261: "connect Check to Fail with label "no"" gold: action=connect from=check to=$new label=no; read: command:connect action=connect from=check label=no to=fail (confidence 0.936; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | shape | 1 | s3-0272: "convert all rectangles to ellipses" gold: action=set target=mention(quantifier=all,shape=rectangle) shape=ellipse; read: command:set action=set shape=rectangle target=mention(quantifier=all,shape=rectangle) |
| class | color | 1 | s3-0300: "give me a white hexagon with a red border" gold: action=create shape=hexagon color=white outline=red; read: command:create action=create color=red outline=red shape=hexagon |
| class | arrow | 1 | s3-0434: "link Done to Check, dotted, both directions" gold: action=connect from=done to=check style=dotted arrow=both; read: command:connect action=connect from=done style=dotted to=check |
| name | to | 2 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db<br>s3-0261: "connect Check to Fail with label "no"" gold: action=connect from=check to=$new label=no; read: command:connect action=connect from=check label=no to=fail |
| name | about | 1 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can topic=create |
| name | from | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |

**Right but held by confidence** (182)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 27 | s3-0006: "add 8 tiny dots in a ring around the center" gold: action=create count=8 shape=circle size=tiny layout=circle position=center; read: command:create action=create count=8 layout=circle position=center shape=circle size=tiny<br>s3-0018: "process steps: Plan, Build, Test, Ship" gold: action=create template=process items=plan,build,test,ship; read: command:create action=create items=plan,build,test,ship template=process<br>s3-0022: "square top left" gold: action=create shape=square position=topleft; read: command:create action=create position=topleft shape=square |
| held | command:connect | 16 | s3-0025: "connect Hub to Start Process Check Done" gold: action=connect from=$new to=start,process,check,done; read: command:connect action=connect from=$new to=start,process,check,done<br>s3-0037: "link Warn to Done dashed" gold: action=connect from=$new to=done style=dashed; read: command:connect action=connect from=$new style=dashed to=done<br>s3-0116: "connect Done back to Start with a blue dashed arrow" gold: action=connect from=done to=start color=blue style=dashed; read: command:connect action=connect color=blue from=done style=dashed to=start |
| held | command:move | 14 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: command:move action=move position=center target=check<br>s3-0056: "shift Process right a bit" gold: action=move target=process direction=right; read: command:move action=move direction=right target=process<br>s3-0082: "move it right" gold: action=move target=check direction=right; read: command:move action=move direction=right target=check |
| held | command:set | 14 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: command:set action=set color=white outline=white shape=circle target=mention(quantifier=all,shape=circle)<br>s3-0078: "turn the diamond pink" gold: action=set target=mention(shape=diamond) color=pink; read: command:set action=set color=pink target=mention(shape=diamond)<br>s3-0126: "make every shape small" gold: action=set target=mention(quantifier=all) size=small; read: command:set action=set size=small target=mention(quantifier=all) |
| held | command:resize | 12 | s3-0082: "make check smaller" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0257: "Process smaller" gold: action=resize target=process; read: command:resize action=resize target=process<br>s3-0297: "smaller" gold: action=resize; read: command:resize action=resize target=mention(recency=newest) |
| held | question:help | 10 | s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: question:help ask=help aspect=can topic=text<br>s3-0145: "can I group shapes" gold: ask=help topic=group aspect=can; read: question:help ask=help aspect=can topic=group<br>s3-0155: "which colors can i use" gold: ask=help topic=color aspect=values; read: question:help ask=help aspect=values topic=color |
| held | command:arrange | 9 | s3-0017: "arrange it like an org chart" gold: action=arrange layout=tree; read: command:arrange action=arrange layout=tree<br>s3-0040: "radial layout around Check" gold: action=arrange layout=radial anchor=check; read: command:arrange action=arrange anchor=check layout=radial<br>s3-0136: "put all shapes in a row" gold: action=arrange target=mention(quantifier=all) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all) |
| held | command:label | 8 | s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: command:label action=label from=check label=approved to=done<br>s3-0053: "clear the text in Done" gold: action=label target=done label=; read: command:label action=label label= target=done<br>s3-0167: "change the heading to "Signup Flow"" gold: action=label label=signup flow; read: command:label action=label label=signup flow target=heading |
| held | (28 more keys; all in the JSON) | | |

**Structural holds** (12)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 9 | s3-0083: "process no label" gold: action=label target=process label=; read: command:label action=label target=process<br>s3-0093: "add a title Roadmap" gold: action=create shape=text label=roadmap; read: command:create action=create<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: command:create action=create color=blue |
| blocked | unresolved-reference | 1 | s3-0340: "group start and process, call it Intake" gold: action=group target=start,process name=intake; read: command:group action=group name=intake |

## Notes

- no oracle (round trip) given or found beside the training data: cause 1 is only assigned for keys the layout does not read; "not measured" is not "0"
- views: every view of the campaign is read against one teacher's labels; the oracle (cause 1) is not measured for these views except through the keys the layout does not read
