# Root causes (truthful_v1): modernbert (a12dff5b1e95)

Score: `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/R-s0/eval/score.truthful.json`; training data: `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/data/R`; oracle: none.

Each request that is not right and each extra gets the first cause that explains it (as root_causes.mjs); the causes are then grouped in the plan's categories. truthful_v1 compares the resize direction and explicit scale and the text keys (presence and exact value) beside the pairing; a written description is not called an unwritten reference (needsKeysV1).

## fresh2_test / test (405 messages, 1313 requested: right 1126, wrong 159, not done 28, extras 74; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 82 |
| actions | 31 |
| values/roles | 148 |
| calibration | 420 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1313); ok (ungated: right + would-be right of structural holds = right of every request executed: 1126); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 159); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 74); ok (ungated: unread = requested - paired: 28); ok (ungated right equals the score file: 1126); ok (ungated wrong equals the score file: 154); ok (ungated extras equals the score file: 70); ok (ungated unread equals the score file: 28); ok (ungated structural holds equal the score file: 9); ok (every produced request is executed, structurally held or (gated) confidence-held: 1359); ok (gated: executed wrong equals the score file: 10); ok (gated: executed extras equals the score file: 6); ok (gated: structural holds equal the score file: 9); ok (gated: confidence holds equal the score file: 612); ok (gated: right executed equals the score file: 722); ok (gated: unread equals the score file: 28); ok (gated: held right + held wrong or extra = confidence holds: 612)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 18 | 4 | 0 | 22 | 44 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 38 | 38 |
| 4 wrong act | model (act head) | 19 | 12 | 0 | 0 | 31 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 102 | 6 | 0 | 0 | 108 |
| 6 wrong or missing class value | model (class head) | 21 | 0 | 0 | 0 | 21 |
| 7 wrong words tagged for a name / text key | model (token head) | 18 | 1 | 0 | 0 | 19 |

**fresh2_test / test, trigger seen** (178)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 18 | fo-0023: "Sw1 is connecting to R1" gold: action=connect from=sw1 to=r1 arrow=none; read: not done (merged into a unit with another request)<br>fo-0066: "NewService reads from Db, connect those too" gold: action=connect from=newservice to=db; read: action=connect from=newservice to=newservice (the unit covers 40% of the span)<br>fo-0090: "Only ProfileSvc is using the Db, so connect them" gold: action=connect from=profilesvc to=db; read: action=connect from=gateway to=gateway (the unit covers 25% of the span) |
| 4 wrong act | model (act head) | 19 | fo-0116: "Gcs should be an ellipse" gold: action=set target=gcs shape=ellipse; read: not done (read as command:create)<br>fo-0116: "Gcs should be an ellipse below Dataflow" gold: requested: Gcs should be an ellipse; read: extra command:create action=create anchor=dataflow position=below shape=ellipse (read as command:create where command:set is requested)<br>fo-0125: "MinBtn, MaxBtn and CloseBtn go at the top right" gold: action=move target=minbtn,maxbtn,closebtn position=topright; read: not done (read as command:arrange) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 102 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof (a name written in another request or by a pronoun)<br>fo-0010: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo (a name written in another request or by a pronoun)<br>fo-0010: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 21 | fo-0025: "arange Raw, Staged, Curated and Mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart<br>fo-0059: "Stack NameField, EmailField and SubmitBtn vertically" gold: action=arrange target=namefield,emailfield,submitbtn layout=column; read: action=arrange target=namefield,emailfield,submitbtn<br>fo-0087: "I want Wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake |
| 7 wrong words tagged for a name / text key | model (token head) | 18 | fo-0012: "hook the copies up to Alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0049: "Add a white square named Pc1 next to Router. Wait, call it Laptop, not Pc1" gold: action=create shape=square color=white name=laptop position=near anchor=router; read: action=create anchor=router color=white name=pc1 position=near shape=square |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 6 | fo-0023: "Sw1 is connecting to R1" gold: action=connect from=sw1 to=r1 arrow=none; read: not done<br>fo-0066: "NewService reads from Db, connect those too" gold: action=connect from=newservice to=db; read: action=connect from=newservice to=newservice<br>fo-0090: "Only ProfileSvc is using the Db, so connect them" gold: action=connect from=profilesvc to=db; read: action=connect from=gateway to=gateway |
| cut | (command:set) | 5 | fo-0125: "gray" gold: action=set target=statusbar color=gray; read: not done<br>fo-0191: "please recolour her" gold: action=set target=aunt color=purple; read: not done<br>fo-0441: "End should be a circle not a box, make it a circle" gold: action=set target=end shape=circle; read: action=set shape=circle |
| cut | (command:arrange) | 2 | fo-0136: "the tasks I want in a column" gold: action=arrange target=taska,taskb,taskc layout=column; read: action=arrange layout=column<br>fo-0543: "Put the three days in a column" gold: action=arrange target=day1,day2,day3 layout=column; read: not done |
| cut | (question:property) | 1 | fo-0221: "where Saturn is on this thing" gold: ask=property target=saturn property=position; read: not done |
| cut | (command:delete) | 1 | fo-0285: "Satellite isn't needed, delete it" gold: action=delete target=satellite; read: action=delete target=$new |
| cut | (fact:) | 1 | fo-0296: "Child2 is under Child1" gold: target=child2 position=below anchor=child1; read: not done |
| cut | (command:resize) | 1 | fo-0328: "The Kitchen is too big, shrink it" gold: action=resize target=kitchen; read: action=resize target=bed2 |
| cut | (command:create) | 1 | fo-0524: "Can you put three small yellow stars underneath it? Those are the kids' plants. hmm actually I meant five, no…" gold: action=create shape=star color=yellow size=small count=5 position=below anchor=sunflower; read: action=create anchor=$new color=yellow count=3 position=below shape=star size=small |
| act | fact: read as question:check | 4 | fo-0275: "Fog is an ellipse" gold: target=fog shape=ellipse; read: not done<br>fo-0275: "Fog is an ellipse, not a circle" gold: requested: Fog is an ellipse; read: extra question:check ask=check shape=ellipse target=fog<br>fo-0400: "Start is already a circle" gold: target=start shape=circle; read: not done |
| act | command:set read as command:create | 2 | fo-0116: "Gcs should be an ellipse" gold: action=set target=gcs shape=ellipse; read: not done<br>fo-0116: "Gcs should be an ellipse below Dataflow" gold: requested: Gcs should be an ellipse; read: extra command:create action=create anchor=dataflow position=below shape=ellipse |
| act | command:set read as fact: | 2 | fo-0147: "Color for Connected is green" gold: action=set target=connected color=green; read: not done<br>fo-0147: "Color for Connected is green" gold: requested: Color for Connected is green; read: extra fact: color=green target=connected |
| act | command:arrange read as command:align | 2 | fo-0459: "Then line up all four boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done<br>fo-0459: "line up all four boxes in a row" gold: requested: Then line up all four boxes in a row; read: extra command:align action=align axis=horizontal |
| act | question:degree read as question:neighbors | 2 | fo-0460: "Is Closing linked to anything yet" gold: ask=degree target=closing; read: not done<br>fo-0460: "Is Closing linked to anything yet" gold: requested: Is Closing linked to anything yet; read: extra question:neighbors ask=neighbors target=closing |
| act | command:connect read as command:group | 2 | fo-0475: "Send Eggs, Flour and Sugar into Mix" gold: action=connect from=eggs,flour,sugar to=mix; read: not done<br>fo-0475: "Send Eggs, Flour and Sugar into Mix" gold: requested: Send Eggs, Flour and Sugar into Mix; read: extra command:group action=group name=mix target=eggs,flour,sugar |
| act | question:extreme read as question:property | 2 | fo-0572: "the stage with the fewest connections, which one is it" gold: ask=extreme superlative=leastconnected; read: not done<br>fo-0572: "connections, which one is it" gold: requested: the stage with the fewest connections, which one is it; read: extra question:property ask=property |
| act | command:move read as command:arrange | 1 | fo-0125: "MinBtn, MaxBtn and CloseBtn go at the top right" gold: action=move target=minbtn,maxbtn,closebtn position=topright; read: not done |
| ref | target | 72 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof<br>fo-0010: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo<br>fo-0010: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo |
| ref | anchor | 11 | fo-0168: "put Grandma above both of them" gold: action=move target=grandma position=above anchor=mom,uncle; read: action=move anchor=mom position=above target=grandma<br>fo-0190: "move it there" gold: action=move target=frog position=rightof anchor=grasshopper; read: action=move anchor=frog position=below target=frog<br>fo-0192: "what's farthest from it" gold: ask=nearest anchor=earth superlative=farthest; read: ask=nearest superlative=farthest |
| ref | to | 10 | fo-0020: "disconnect them" gold: action=disconnect from=audit to=load; read: action=disconnect from=audit to=audit<br>fo-0035: "Same for Spine2" gold: action=connect from=spine2 to=leaf1,leaf2,leaf3,leaf4; read: action=connect from=spine2<br>fo-0055: "Connect CoreSw to each of them" gold: action=connect from=coresw to=vlan10,vlan20,vlan30; read: action=connect from=coresw |
| ref | from | 10 | fo-0025: "conect them each to the next" gold: action=connect from=raw,staged,curated,mart; read: action=connect pairing=next<br>fo-0035: "disconnect it from Spine1 and Spine2" gold: action=disconnect from=leaf4 to=spine1,spine2; read: action=disconnect to=spine1,spine2<br>fo-0076: "All three consumers -> Aggregator" gold: action=connect from=consumer1,consumer2,consumer3 to=aggregator; read: action=connect to=aggregator |
| class | shape | 7 | fo-0087: "I want Wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake<br>fo-0214: "I want all circles to be small by default, from now on" gold: shape=circle size=small; read: size=small<br>fo-0329: "If not, add one near Customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=customs position=near shape=circle |
| class | target | 7 | fo-0315: "the little square near the hall, can you send it to the back" gold: action=toback target=mention(shape=square); read: action=toback<br>fo-0342: "move them all to the right side" gold: action=move target=mention(color=pink,quantifier=all) position=right; read: action=move position=right target=mention(quantifier=all)<br>fo-0346: "Make everything that isn't red gray" gold: action=set target=mention(notcolor=red,quantifier=all) color=gray; read: action=set color=gray target=mention(notcolor=gray,quantifier=all) |
| class | color | 5 | fo-0259: "add 8 tiny whte stars at the top" gold: action=create shape=star size=tiny color=white count=8 position=top; read: action=create count=8 position=top shape=star size=tiny<br>fo-0329: "If not, add one near Customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=customs position=near shape=circle<br>fo-0403: "Make it gray. No, orange. Fine, gray" gold: action=set target=$new color=gray; read: action=set color=orange target=$new |
| class | position | 3 | fo-0237: "put 5 tiny gray sqaures between Mars and... hmm there's nothing after Mars yet. ok just put them to the right…" gold: action=create shape=square size=tiny color=gray count=5 position=rightof anchor=$new; read: action=create anchor=$new color=gray count=5 position=between shape=square size=tiny<br>fo-0342: "and shove the newest square there too" gold: action=move target=mention(recency=newest,shape=square) position=right; read: action=move target=mention(recency=newest,shape=square)<br>fo-0539: "what is Bass next to" gold: ask=list position=near anchor=bass; read: ask=list |
| class | layout | 2 | fo-0025: "arange Raw, Staged, Curated and Mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart<br>fo-0059: "Stack NameField, EmailField and SubmitBtn vertically" gold: action=arrange target=namefield,emailfield,submitbtn layout=column; read: action=arrange target=namefield,emailfield,submitbtn |
| class | style | 1 | fo-0446: "connect Doing straight to Done too, as a dashed arrow" gold: action=connect from=doing to=done style=dashed; read: action=connect from=doing to=done |
| name | from | 7 | fo-0012: "hook the copies up to Alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: action=connect from=laptop to=nas |
| name | to | 7 | fo-0023: "Sw2 is connecting to R3, with plain lines please" gold: action=connect from=sw2 to=r3 arrow=none; read: action=connect arrow=none from=sw1,sw2 to=r1,r3<br>fo-0052: "Connect Scheduler to Worker and the copies" gold: action=connect from=scheduler to=worker,$new; read: action=connect from=scheduler to=worker<br>fo-0081: "Closing back to Closed" gold: action=connect from=closing to=closed; read: action=connect from=closing |
| name | target | 5 | fo-0052: "arrange Worker and the copies in a column to the right of Scheduler" gold: action=arrange target=worker,$new layout=column; read: action=arrange layout=column target=worker<br>fo-0222: "what about Zooplankton and Tuna" gold: ask=connected target=tuna anchor=zooplankton; read: ask=connected target=tuna,zooplankton<br>fo-0264: "Make all three small, actually make them medium" gold: action=set target=$new,$new,$new size=medium; read: action=set size=medium target=$new |
| name | name | 1 | fo-0049: "Add a white square named Pc1 next to Router. Wait, call it Laptop, not Pc1" gold: action=create shape=square color=white name=laptop position=near anchor=router; read: action=create anchor=router color=white name=pc1 position=near shape=square |
| name | anchor | 1 | fo-0222: "what about Zooplankton and Tuna" gold: ask=connected target=tuna anchor=zooplankton; read: ask=connected target=tuna,zooplankton |
| name | count | 1 | fo-0467: "Add two small yellow circles called... no, just two small yellow circles near Parking" gold: action=create shape=circle color=yellow size=small count=2 position=near anchor=parking; read: action=create anchor=parking color=yellow position=near shape=circle size=small |
| act | (2 more keys; all in the JSON) | | |

**fresh2_test / test, trigger unseen** (23)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 4 | fo-0104: "did I make Igw a circle" gold: ask=check target=igw shape=circle; read: not done (lost: no unit on the span)<br>fo-0116: "below Dataflow" gold: action=move target=gcs position=below anchor=dataflow; read: not done (merged into a unit with another request)<br>fo-0534: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: not done (lost: no unit on the span) |
| 4 wrong act | model (act head) | 12 | fo-0184: "Plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done (read as command:create)<br>fo-0184: "Plants belwo it" gold: requested: Plants belwo it; read: extra command:create action=create anchor=genes position=below (read as command:create where command:move is requested)<br>fo-0335: "How many shapes are connected to Score" gold: ask=degree target=score; read: not done (read as question:count) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 6 | fo-0076: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers (a name written in another request or by a pronoun)<br>fo-0113: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple (a name written in another request or by a pronoun)<br>fo-0144: "I want Broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2 (a name written in another request or by a pronoun) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | fo-0107: "Thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:move) | 2 | fo-0116: "below Dataflow" gold: action=move target=gcs position=below anchor=dataflow; read: not done<br>fo-0534: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: not done |
| cut | (question:check) | 1 | fo-0104: "did I make Igw a circle" gold: ask=check target=igw shape=circle; read: not done |
| cut | (command:connect) | 1 | fo-0577: "Pump into Filter. Filter into Uv. Uv into Waterfall. Waterfall into Pond" gold: action=connect from=pump,filter,uv,waterfall,pond; read: action=connect from=pump,filter,uv |
| act | question:degree read as question:count | 4 | fo-0335: "How many shapes are connected to Score" gold: ask=degree target=score; read: not done<br>fo-0335: "How many shapes are connected to Score" gold: requested: How many shapes are connected to Score; read: extra question:count ask=count linked=score<br>fo-0462: "How many shapes are connected to Coding" gold: ask=degree target=coding; read: not done |
| act | question:extreme read as question:check | 4 | fo-0554: "Is Teardown the last one on the right" gold: ask=extreme superlative=rightmost; read: not done<br>fo-0554: "Is Teardown the last one on the right" gold: requested: Is Teardown the last one on the right; read: extra question:check ask=check position=right<br>fo-0594: "Is Scene4 the last one at the bottom" gold: ask=extreme superlative=bottommost; read: not done |
| act | command:move read as command:create | 2 | fo-0184: "Plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done<br>fo-0184: "Plants belwo it" gold: requested: Plants belwo it; read: extra command:create action=create anchor=genes position=below |
| act | command:connect read as command:group | 2 | fo-0475: "then Mix into Oven" gold: action=connect from=mix to=oven; read: not done<br>fo-0475: "then Mix into Oven" gold: requested: then Mix into Oven; read: extra command:group action=group name=oven target=mix |
| ref | anchor | 4 | fo-0144: "I want Broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2<br>fo-0184: "Genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: action=move anchor=cells position=rightof target=genes<br>fo-0184: "Body to the left of it" gold: action=move target=body position=leftof anchor=brain; read: action=move anchor=$new position=leftof target=body |
| ref | target | 2 | fo-0076: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers<br>fo-0113: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple |
| name | target | 1 | fo-0107: "Thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |

**fresh2_test / test, trigger no request** (60)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 22 | fo-0147: "Ended is red" gold: -; read: extra fact: color=red target=ended (partial overlap with a requested action: 28% of it)<br>fo-0160: "Earth comes" gold: -; read: extra command:connect action=connect (partial overlap with a requested action: 15% of it)<br>fo-0191: "her" gold: -; read: extra command:create action=create (partial overlap with a requested action: 16% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 38 | fo-0047: "Please" gold: -; read: extra command:create action=create (no requested action on this text)<br>fo-0067: "Please" gold: -; read: extra command:create action=create (no requested action on this text)<br>fo-0093: "The order" gold: -; read: extra command:create action=create (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 10 | fo-0191: "her" gold: -; read: extra command:create action=create<br>fo-0214: "Please" gold: -; read: extra command:create action=create<br>fo-0264: "Could" gold: -; read: extra command:create action=create |
| cut | command:connect | 6 | fo-0160: "Earth comes" gold: -; read: extra command:connect action=connect<br>fo-0277: "arrows:" gold: -; read: extra command:connect action=connect<br>fo-0467: "connect Entrance to Stage and Entrance to Bar" gold: -; read: extra command:connect action=connect from=entrance to=stage,bar |
| cut | question:help | 2 | fo-0204: "can you" gold: -; read: extra question:help ask=help<br>fo-0237: "can" gold: -; read: extra question:help ask=help aspect=can |
| cut | fact: | 1 | fo-0147: "Ended is red" gold: -; read: extra fact: color=red target=ended |
| cut | command:undo | 1 | fo-0467: "'s gone" gold: -; read: extra command:undo action=undo |
| cut | command:disconnect | 1 | fo-0504: "it isn't one" gold: -; read: extra command:disconnect action=disconnect from=gate to=gate |
| cut | command:set | 1 | fo-0589: "all" gold: -; read: extra command:set action=set |
| spurious | command:create | 13 | fo-0047: "Please" gold: -; read: extra command:create action=create<br>fo-0067: "Please" gold: -; read: extra command:create action=create<br>fo-0093: "The order" gold: -; read: extra command:create action=create |
| spurious | command:set | 7 | fo-0093: "Red" gold: -; read: extra command:set action=set color=red target=$new<br>fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body<br>fo-0185: "not red" gold: -; read: extra command:set action=set |
| spurious | fact: | 4 | fo-0116: "Bigquery is" gold: -; read: extra fact: target=bigquery<br>fo-0210: "Director is the top box" gold: -; read: extra fact: position=top target=director<br>fo-0264: "Weather is in the middle" gold: -; read: extra fact: position=center target=weather |
| spurious | command:connect | 3 | fo-0156: "Both should be arrows pointing down" gold: -; read: extra command:connect action=connect from=$new<br>fo-0279: "I want to match Mum to her" gold: -; read: extra command:connect action=connect from=mum to=gran<br>fo-0433: "Factory to Dc to Retail to Returns" gold: -; read: extra command:connect action=connect from=factory,dc,retail,returns |
| spurious | command:move | 2 | fo-0168: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance |
| spurious | question:help | 2 | fo-0495: "how do I add stuff" gold: -; read: extra question:help ask=help aspect=how topic=create<br>fo-0557: "Is the map symmetric" gold: -; read: extra question:help ask=help |
| spurious | command:undo | 1 | fo-0118: "Undo that if it looks bad" gold: -; read: extra command:undo action=undo |
| spurious | command:label | 1 | fo-0246: "Cow" gold: -; read: extra command:label action=label target=cow |
| spurious | (5 more keys; all in the JSON) | | |

### fresh2_test / test at the cost-10 threshold (0.8588)

Executed: right 722, wrong 10, extras 6. Structural holds 9 ({"blocked":5,"dependency":4}; 0 of them would have been right). Confidence holds 612: right 404, wrong or extra 208. Unread 28.

**Executed wrong, by first cause** (16)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 2 | fo-0116: "Pubsub feeds Dataflow and Dataflow writes to Bigquery and Gcs. Can you draw those arrows" gold: action=connect from=dataflow to=bigquery,gcs; read: command:connect action=connect from=pubsub,dataflow,bigquery,gcs (confidence 0.878; wrong)<br>fo-0577: "Waterfall into Pond" gold: -; read: extra command:connect action=connect from=waterfall to=pond (confidence 0.870; extra) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 4 | fo-0168: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom (confidence 0.892; extra)<br>fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body (confidence 0.953; extra)<br>fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance (confidence 0.923; extra) |
| 4 wrong act | model (act head) | 1 | fo-0475: "Send Eggs, Flour and Sugar into Mix" gold: -; read: extra command:group action=group name=mix target=eggs,flour,sugar (confidence 0.879; extra) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 4 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: command:move action=move anchor=api position=rightof (confidence 0.927; wrong)<br>fo-0066: "put it near NewService" gold: action=move target=flags position=near anchor=newservice; read: command:move action=move anchor=newservice position=near target=newservice (confidence 0.919; wrong)<br>fo-0116: "make it gray and tiny" gold: action=set target=gke color=gray size=tiny; read: command:set action=set color=gray size=tiny (confidence 0.862; wrong) |
| 6 wrong or missing class value | model (class head) | 3 | fo-0259: "add 8 tiny whte stars at the top" gold: action=create shape=star size=tiny color=white count=8 position=top; read: command:create action=create count=8 position=top shape=star size=tiny (confidence 0.883; wrong)<br>fo-0414: "make one below Done and call it Release" gold: action=create shape=square color=green name=release position=below anchor=done; read: command:create action=create anchor=done name=release position=below shape=rectangle (confidence 0.899; wrong)<br>fo-0435: "Label the diamond "invalid input"" gold: action=label target=$new label=invalid input; read: command:label action=label label=invalid input target=mention(shape=diamond) (confidence 0.959; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 2 | fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: command:connect action=connect from=laptop to=nas (confidence 0.952; wrong)<br>fo-0523: "Connect Station to Loop and" gold: action=connect from=station,loop,junction; read: command:connect action=connect from=station to=loop (confidence 0.942; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 1 | fo-0116: "Pubsub feeds Dataflow and Dataflow writes to Bigquery and Gcs. Can you draw those arrows" gold: action=connect from=dataflow to=bigquery,gcs; read: command:connect action=connect from=pubsub,dataflow,bigquery,gcs |
| cut | command:connect | 1 | fo-0577: "Waterfall into Pond" gold: -; read: extra command:connect action=connect from=waterfall to=pond |
| spurious | command:move | 2 | fo-0168: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance |
| spurious | command:set | 2 | fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body<br>fo-0400: "Start should be a green circle" gold: -; read: extra command:set action=set color=green shape=circle target=start |
| act | command:connect read as command:group | 1 | fo-0475: "Send Eggs, Flour and Sugar into Mix" gold: -; read: extra command:group action=group name=mix target=eggs,flour,sugar |
| ref | target | 3 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: command:move action=move anchor=api position=rightof<br>fo-0066: "put it near NewService" gold: action=move target=flags position=near anchor=newservice; read: command:move action=move anchor=newservice position=near target=newservice<br>fo-0116: "make it gray and tiny" gold: action=set target=gke color=gray size=tiny; read: command:set action=set color=gray size=tiny |
| ref | anchor | 1 | fo-0372: "put it there" gold: action=move target=doing position=between anchor=todo,done; read: command:move action=move anchor=doing position=between target=doing |
| class | color | 2 | fo-0259: "add 8 tiny whte stars at the top" gold: action=create shape=star size=tiny color=white count=8 position=top; read: command:create action=create count=8 position=top shape=star size=tiny<br>fo-0414: "make one below Done and call it Release" gold: action=create shape=square color=green name=release position=below anchor=done; read: command:create action=create anchor=done name=release position=below shape=rectangle |
| class | shape | 1 | fo-0414: "make one below Done and call it Release" gold: action=create shape=square color=green name=release position=below anchor=done; read: command:create action=create anchor=done name=release position=below shape=rectangle |
| class | target | 1 | fo-0435: "Label the diamond "invalid input"" gold: action=label target=$new label=invalid input; read: command:label action=label label=invalid input target=mention(shape=diamond) |
| name | from | 2 | fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: command:connect action=connect from=laptop to=nas<br>fo-0523: "Connect Station to Loop and" gold: action=connect from=station,loop,junction; read: command:connect action=connect from=station to=loop |

**Right but held by confidence** (404)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:connect | 105 | fo-0003: "Paused should go back to Running" gold: action=connect from=paused to=running; read: command:connect action=connect from=paused to=running<br>fo-0004: "connect Ingest Parse Clean and Load one after the other" gold: action=connect from=ingest,parse,clean,load; read: command:connect action=connect from=ingest,parse,clean,load<br>fo-0013: "Add one from Review to Published" gold: action=connect from=review to=published; read: command:connect action=connect from=review to=published |
| held | command:set | 58 | fo-0004: "make it a navy ellipse" gold: action=set target=warehouse color=navy shape=ellipse; read: command:set action=set color=navy shape=ellipse target=warehouse<br>fo-0020: "Make Extract, Transform and Load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: command:set action=set color=blue shape=rectangle size=medium target=extract,transform,load<br>fo-0023: "Change it to hexagon like the others" gold: action=set target=r2 shape=hexagon; read: command:set action=set shape=hexagon target=r2 |
| held | command:create | 42 | fo-0031: "add 4 small rectangles below Results" gold: action=create shape=rectangle size=small count=4 position=below anchor=results; read: command:create action=create anchor=results count=4 position=below shape=rectangle size=small<br>fo-0100: "add a small red diamond caled Reject below Parser" gold: action=create shape=diamond color=red size=small name=reject position=below anchor=parser; read: command:create action=create anchor=parser color=red name=reject position=below shape=diamond size=small<br>fo-0108: "Add a queue between Producer and Consumer, a teal ellipse called Mq. Sorry, make that a teal rectangle" gold: action=create shape=rectangle color=teal name=mq position=between anchor=producer,consumer; read: command:create action=create anchor=producer,consumer color=teal name=mq position=between shape=rectangle |
| held | question:count | 35 | fo-0004: "how many rectangles are there right now" gold: ask=count shape=rectangle; read: question:count ask=count shape=rectangle<br>fo-0035: "How many connections in total now" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>fo-0097: "how many shapes are blue now" gold: ask=count color=blue; read: question:count ask=count color=blue |
| held | command:arrange | 27 | fo-0004: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all,shape=rectangle)<br>fo-0010: "Card1, Card2 and Card3 should sit in a row" gold: action=arrange target=card1,card2,card3 layout=row; read: command:arrange action=arrange layout=row target=card1,card2,card3<br>fo-0031: "put them in a row" gold: action=arrange target=$new layout=row; read: command:arrange action=arrange layout=row target=$new |
| held | command:move | 25 | fo-0010: "Logo goes to the top left" gold: action=move target=logo position=topleft; read: command:move action=move position=topleft target=logo<br>fo-0020: "in the bottom right" gold: action=move target=audit position=bottomright; read: command:move action=move position=bottomright target=audit<br>fo-0035: "Spine1 and Spine2 go to the top" gold: action=move target=spine1,spine2 position=top; read: command:move action=move position=top target=spine1,spine2 |
| held | question:property | 15 | fo-0012: "What colour is Rds right" gold: ask=property target=rds property=color; read: question:property ask=property property=color target=rds<br>fo-0023: "what shape has R2" gold: ask=property target=r2 property=shape; read: question:property ask=property property=shape target=r2<br>fo-0037: "whats the colour of Store now" gold: ask=property target=store property=color; read: question:property ask=property property=color target=store |
| held | command:resize | 15 | fo-0032: "shrink Ecr a bit" gold: action=resize target=ecr; read: command:resize action=resize target=ecr<br>fo-0033: "I want the Done more big" gold: action=resize target=done; read: command:resize action=resize target=done<br>fo-0043: "make it larger" gold: action=resize target=price; read: command:resize action=resize target=price |
| held | (23 more keys; all in the JSON) | | |

**Structural holds** (9)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 4 | fo-0161: "Kid" gold: -; read: command:create action=create<br>fo-0161: "be" gold: -; read: command:create action=create<br>fo-0184: "Plants belwo it" gold: -; read: command:create action=create anchor=genes position=below |
| blocked | unresolved-reference | 1 | fo-0422: "Arrange Q1 to Q4 in a circle" gold: action=arrange target=q1,q2,q3,q4 layout=circle; read: command:arrange action=arrange layout=circle |

## short3_test / test (340 messages, 432 requested: right 329, wrong 71, not done 32, extras 26; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 16 |
| actions | 47 |
| values/roles | 66 |
| calibration | 147 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 432); ok (ungated: right + would-be right of structural holds = right of every request executed: 329); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 71); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 26); ok (ungated: unread = requested - paired: 32); ok (ungated right equals the score file: 329); ok (ungated wrong equals the score file: 66); ok (ungated extras equals the score file: 24); ok (ungated unread equals the score file: 32); ok (ungated structural holds equal the score file: 7); ok (every produced request is executed, structurally held or (gated) confidence-held: 426); ok (gated: executed wrong equals the score file: 4); ok (gated: executed extras equals the score file: 2); ok (gated: structural holds equal the score file: 7); ok (gated: confidence holds equal the score file: 225); ok (gated: right executed equals the score file: 188); ok (gated: unread equals the score file: 32); ok (gated: held right + held wrong or extra = confidence holds: 225)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 13 | 0 | 0 | 3 | 16 |
| 4 wrong act | model (act head) | 33 | 14 | 0 | 0 | 47 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 9 | 0 | 0 | 0 | 9 |
| 6 wrong or missing class value | model (class head) | 32 | 5 | 0 | 0 | 37 |
| 7 wrong words tagged for a name / text key | model (token head) | 15 | 5 | 0 | 0 | 20 |

**short3_test / test, trigger seen** (102)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 13 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle (the unit covers 38% of the span)<br>s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon (the unit covers 41% of the span)<br>s3-0082: "move it right" gold: action=move target=check direction=right; read: not done (lost: no unit on the span) |
| 4 wrong act | model (act head) | 33 | s3-0002: "behind everything as a background panel" gold: requested: put a pale blue rectangle behind everything as a background…; read: extra command:toBack action=toback target=mention(quantifier=all) (read as command:toBack where command:create is requested)<br>s3-0022: "square top left" gold: action=create shape=square position=topleft; read: not done (read as command:move)<br>s3-0022: "square top left" gold: requested: square top left; read: extra command:move action=move position=topleft (read as command:move where command:create is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 9 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: action=set (a name or description the message does not write)<br>s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done (a name written in another request or by a pronoun)<br>s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 32 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create anchor=flow label=5 milestones position=below<br>s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: ask=help aspect=can |
| 7 wrong words tagged for a name / text key | model (token head) | 15 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move anchor=done position=below<br>s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 4 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle<br>s3-0146: "create Api" gold: action=create shape=square name=api; read: not done<br>s3-0146: "Db squares" gold: action=create shape=square name=db; read: not done |
| cut | (command:set) | 4 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: not done<br>s3-0264: "start gold" gold: action=set target=start color=gold; read: action=set color=gold |
| cut | (command:move) | 1 | s3-0082: "move it right" gold: action=move target=check direction=right; read: not done |
| cut | (command:straighten) | 1 | s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done |
| cut | (command:undo) | 1 | s3-0137: "undo" gold: action=undo; read: not done |
| cut | (command:rename) | 1 | s3-0305: "named Gate" gold: action=rename target=check name=gate; read: not done |
| cut | (command:ungroup) | 1 | s3-0472: "ungroup intake" gold: action=ungroup target=intake; read: action=ungroup target=check,done,intake |
| act | command:create read as command:move | 4 | s3-0022: "square top left" gold: action=create shape=square position=topleft; read: not done<br>s3-0022: "square top left" gold: requested: square top left; read: extra command:move action=move position=topleft<br>s3-0252: "Sub2 below Process" gold: action=create name=sub2 position=below anchor=process; read: not done |
| act | command:move read as command:create | 4 | s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: not done<br>s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done<br>s3-0035: "put done under check" gold: requested: put done under check; read: extra command:create action=create |
| act | command:create read as command:arrange | 4 | s3-0316: "timeline Q1 Q2 Q3 Q4" gold: action=create template=timeline items=q1,q2,q3,q4; read: not done<br>s3-0316: "timeline Q1 Q2 Q3 Q4" gold: requested: timeline Q1 Q2 Q3 Q4; read: extra command:arrange action=arrange target=q1,q2,q3,q4<br>s3-0509: "timeline with 5 milestones" gold: action=create template=timeline count=5; read: not done |
| act | command:toFront read as command:move | 2 | s3-0131: "done on top" gold: action=tofront target=done; read: not done<br>s3-0131: "done on top" gold: requested: done on top; read: extra command:move action=move position=top target=done |
| act | command:arrange read as command:create | 2 | s3-0140: "make the existing flow into process steps with chevrons" gold: action=arrange template=process; read: not done<br>s3-0140: "make the existing flow into process steps with chevrons" gold: requested: make the existing flow into process steps with chevrons; read: extra command:create action=create |
| act | command:rename read as command:label | 2 | s3-0194: "can you call Done "Finish" instead" gold: action=rename target=done name=finish; read: not done<br>s3-0194: "call Done "Finish"" gold: requested: can you call Done "Finish" instead; read: extra command:label action=label label=finish target=done |
| act | question:property read as command:label | 2 | s3-0262: "text on the check to done arrow?" gold: ask=property property=label from=check to=done; read: not done<br>s3-0262: "text on the check to done arrow" gold: requested: text on the check to done arrow?; read: extra command:label action=label from=check to=done |
| act | command:rename read as command:connect | 2 | s3-0290: "check to Test" gold: action=rename target=check name=test; read: not done<br>s3-0290: "check to Test" gold: requested: check to Test; read: extra command:connect action=connect from=check to=test |
| ref | target | 4 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: action=set<br>s3-0266: "make it a star" gold: action=set target=end shape=star; read: action=set shape=star target=done<br>s3-0303: "align all three" gold: action=align target=start,check,done; read: action=align axis=horizontal target=check |
| ref | from | 4 | s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done<br>s3-0253: "conect procss w/ done" gold: action=connect from=process to=done; read: action=connect from=procss<br>s3-0377: "blue" gold: action=set from=start to=process color=blue; read: action=set color=blue |
| ref | to | 3 | s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check<br>s3-0377: "blue" gold: action=set from=start to=process color=blue; read: action=set color=blue<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip target=check |
| class | target | 11 | s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0136: "put all shapes in a row" gold: action=arrange target=mention(quantifier=all) layout=row; read: action=arrange layout=row<br>s3-0159: "kill the circle I just made" gold: action=delete target=mention(recency=newest,shape=circle); read: action=delete target=mention(shape=circle) |
| class | template | 8 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create anchor=flow label=5 milestones position=below<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: action=create color=blue<br>s3-0215: "show the four shapes as a timeline" gold: action=arrange template=timeline target=mention(quantifier=all); read: action=arrange |
| class | topic | 5 | s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: ask=help aspect=can<br>s3-0158: "what layouts are there" gold: ask=help topic=layout aspect=values; read: ask=help aspect=values<br>s3-0441: "explain layouts" gold: ask=help topic=layout; read: ask=help |
| class | shape | 3 | s3-0093: "add a title Roadmap" gold: action=create shape=text label=roadmap; read: action=create label=roadmap<br>s3-0163: "Draw 6 small stars in a circle." gold: action=create count=6 shape=star size=small layout=circle; read: action=create count=6 shape=circle size=small<br>s3-0379: "make check diamond yellow big" gold: action=set target=check shape=diamond color=yellow size=large; read: action=set color=yellow size=large target=mention(shape=diamond) |
| class | layout | 3 | s3-0163: "Draw 6 small stars in a circle." gold: action=create count=6 shape=star size=small layout=circle; read: action=create count=6 shape=circle size=small<br>s3-0268: "add a row of 5 orange rectangles along the bottom edge" gold: action=create count=5 shape=rectangle color=orange layout=row position=bottom; read: action=create color=orange count=5 position=bottom shape=rectangle<br>s3-0455: "make it a layered diagram" gold: action=arrange layout=layers; read: action=arrange |
| class | outline | 3 | s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black target=start<br>s3-0300: "give me a white hexagon with a red border" gold: action=create shape=hexagon color=white outline=red; read: action=create color=white shape=hexagon<br>s3-0363: "add a thick green edge around Done" gold: action=set target=done outline=green; read: action=set color=green target=done |
| class | anchor | 1 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create anchor=flow label=5 milestones position=below |
| class | position | 1 | s3-0098: "four squares stacked on the left" gold: action=create count=4 shape=square layout=column position=left; read: action=create count=4 layout=column shape=square |
| name | target | 5 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move anchor=done position=below<br>s3-0122: "except Done which is red" gold: action=set target=done color=red; read: action=set color=red |
| name | about | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: ask=help aspect=can<br>s3-0236: "what does SOP Lang mean" gold: ask=help about=sop lang; read: ask=help |
| name | from | 2 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0526: "make an arrow done to start" gold: action=connect from=done to=start; read: action=connect to=start |
| name | to | 2 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0252: "connect Process to both" gold: action=connect from=process to=$new,$new; read: action=connect from=process |
| name | anchor | 2 | s3-0318: "tree layout, root Start, growing down" gold: action=arrange layout=tree anchor=start direction=down; read: action=arrange direction=down layout=tree<br>s3-0336: "lay it out as layers, start at the left" gold: action=arrange layout=layers direction=right anchor=start; read: action=arrange direction=right layout=layers |
| name | scale | 1 | s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |
| name | count | 1 | s3-0166: "add a 3 by 3 grid of small squares" gold: action=create count=9 shape=square size=small layout=grid; read: action=create layout=grid shape=square size=small |
| name | label | 1 | s3-0529: "call the start to process link begin" gold: action=label from=start to=process label=begin; read: action=label from=start to=process |
| act | (7 more keys; all in the JSON) | | |
| class | (1 more keys; all in the JSON) | | |

**short3_test / test, trigger unseen** (24)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 14 | s3-0008: "can you add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: not done (read as command:create)<br>s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: requested: can you add the word "approved" next to the arrow going fro…; read: extra command:create action=create label=approved (read as command:create where command:label is requested)<br>s3-0063: "swot matrix" gold: action=create template=matrix; read: not done (read as command:label) |
| 6 wrong or missing class value | model (class head) | 5 | s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: action=create count=4<br>s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 name=core position=center template=matrix<br>s3-0354: "make the outline of check orange" gold: action=set target=check outline=orange; read: action=set color=orange target=check |
| 7 wrong words tagged for a name / text key | model (token head) | 5 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label target=process<br>s3-0310: "no more arrows on done" gold: action=disconnect target=done; read: action=disconnect from=done<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label= |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:label read as command:create | 2 | s3-0008: "can you add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: not done<br>s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: requested: can you add the word "approved" next to the arrow going fro…; read: extra command:create action=create label=approved |
| act | command:create read as command:label | 2 | s3-0063: "swot matrix" gold: action=create template=matrix; read: not done<br>s3-0063: "swot matrix" gold: requested: swot matrix; read: extra command:label action=label |
| act | question:check read as command:move | 2 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:move action=move target=check |
| act | command:align read as command:arrange | 2 | s3-0203: "put start process and check on one line" gold: action=align target=start,process,check; read: not done<br>s3-0203: "put start process and check on one line" gold: requested: put start process and check on one line; read: extra command:arrange action=arrange target=process,check |
| act | command:resize read as question:property | 2 | s3-0365: "double check's size" gold: action=resize target=check; read: not done<br>s3-0365: "double check's size" gold: requested: double check's size; read: extra question:property ask=property property=size |
| act | command:move read as question:list | 2 | s3-0494: "all circles over to the left" gold: action=move target=mention(quantifier=all,shape=circle) position=left; read: not done<br>s3-0494: "all circles over to the left" gold: requested: all circles over to the left; read: extra question:list ask=list position=left shape=circle |
| act | fact: read as command:create | 2 | s3-0517: "check lives in the top right" gold: target=check position=topright; read: not done<br>s3-0517: "check lives in the top right" gold: requested: check lives in the top right; read: extra command:create action=create position=topright |
| class | template | 2 | s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: action=create count=4<br>s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 name=core position=center template=matrix |
| class | outline | 1 | s3-0354: "make the outline of check orange" gold: action=set target=check outline=orange; read: action=set color=orange target=check |
| class | property | 1 | s3-0358: "what is the outline color of process" gold: ask=property target=process property=outline; read: ask=property property=color target=process |
| class | layout | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange layout=column |
| class | direction | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange layout=column |
| name | label | 1 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label target=process |
| name | target | 1 | s3-0310: "no more arrows on done" gold: action=disconnect target=done; read: action=disconnect from=done |
| name | from | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label= |
| name | to | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label= |
| name | count | 1 | s3-0396: "twelve circles in a circle" gold: action=create count=12 shape=circle layout=circle; read: action=create layout=circle shape=circle |
| name | linked | 1 | s3-0422: "Done and Start are connected" gold: target=done linked=start; read: target=done |

**short3_test / test, trigger no request** (3)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 3 | s3-0119: "tidy the arrows" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) (partial overlap with a requested action: 43% of it)<br>s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (partial overlap with a requested action: 40% of it)<br>s3-0311: "Data" gold: -; read: extra command:create action=create name=data (partial overlap with a requested action: 12% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:improve | 1 | s3-0119: "tidy the arrows" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) |
| cut | command:set | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db |
| cut | command:create | 1 | s3-0311: "Data" gold: -; read: extra command:create action=create name=data |

### short3_test / test at the cost-10 threshold (0.8588)

Executed: right 188, wrong 4, extras 2. Structural holds 7 ({"blocked":7}; 0 of them would have been right). Confidence holds 225: right 141, wrong or extra 84. Unread 32.

**Executed wrong, by first cause** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (confidence 0.978; extra) |
| 4 wrong act | model (act head) | 1 | s3-0252: "add Sub1 and Sub2 below Process" gold: -; read: extra command:move action=move anchor=process position=below target=sub1,sub2 (confidence 0.888; extra) |
| 6 wrong or missing class value | model (class head) | 3 | s3-0163: "Draw 6 small stars in a circle" gold: action=create count=6 shape=star size=small layout=circle; read: command:create action=create count=6 shape=circle size=small (confidence 0.921; wrong)<br>s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: command:connect action=connect color=gray from=process to=done (confidence 0.928; wrong)<br>s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: question:help ask=help aspect=how topic=text (confidence 0.973; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db (confidence 0.973; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:set | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db |
| act | command:create read as command:move | 1 | s3-0252: "add Sub1 and Sub2 below Process" gold: -; read: extra command:move action=move anchor=process position=below target=sub1,sub2 |
| class | shape | 1 | s3-0163: "Draw 6 small stars in a circle" gold: action=create count=6 shape=star size=small layout=circle; read: command:create action=create count=6 shape=circle size=small |
| class | layout | 1 | s3-0163: "Draw 6 small stars in a circle" gold: action=create count=6 shape=star size=small layout=circle; read: command:create action=create count=6 shape=circle size=small |
| class | arrow | 1 | s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: command:connect action=connect color=gray from=process to=done |
| class | topic | 1 | s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: question:help ask=help aspect=how topic=text |
| name | from | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |
| name | to | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |

**Right but held by confidence** (141)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:set | 15 | s3-0049: "everything black" gold: action=set target=mention(quantifier=all) color=black; read: command:set action=set color=black target=mention(quantifier=all)<br>s3-0057: "red for check" gold: action=set target=check color=red; read: command:set action=set color=red target=check<br>s3-0112: "red outline around process" gold: action=set target=process outline=red; read: command:set action=set outline=red target=process |
| held | command:move | 13 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: command:move action=move position=center target=check<br>s3-0179: "check up 40px" gold: action=move target=check direction=up distance=40; read: command:move action=move direction=up distance=40 target=check<br>s3-0209: "put the yellow diamond above Process" gold: action=move target=mention(color=yellow,shape=diamond) position=above anchor=process; read: command:move action=move anchor=process position=above target=mention(color=yellow,shape=diamond) |
| held | command:resize | 13 | s3-0082: "make check smaller" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0193: "also bigger" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0257: "Process smaller" gold: action=resize target=process; read: command:resize action=resize target=process |
| held | command:create | 12 | s3-0006: "add 8 tiny dots in a ring around the center" gold: action=create count=8 shape=circle size=tiny layout=circle position=center; read: command:create action=create count=8 layout=circle position=center shape=circle size=tiny<br>s3-0018: "process steps: Plan, Build, Test, Ship" gold: action=create template=process items=plan,build,test,ship; read: command:create action=create items=plan,build,test,ship template=process<br>s3-0160: "add a teal diamond between Process and Check" gold: action=create shape=diamond color=teal position=between anchor=process,check; read: command:create action=create anchor=process,check color=teal position=between shape=diamond |
| held | command:connect | 12 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: command:connect action=connect from=start to=check<br>s3-0109: "join them" gold: action=connect from=$new to=$new; read: command:connect action=connect from=$new to=$new<br>s3-0116: "Can you connect Done back to Start with a blue dashed arrow" gold: action=connect from=done to=start color=blue style=dashed; read: command:connect action=connect color=blue from=done style=dashed to=start |
| held | command:arrange | 11 | s3-0017: "arrange it like an org chart" gold: action=arrange layout=tree; read: command:arrange action=arrange layout=tree<br>s3-0040: "radial layout around Check" gold: action=arrange layout=radial anchor=check; read: command:arrange action=arrange anchor=check layout=radial<br>s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: command:arrange action=arrange target=start,process,check,done template=timeline |
| held | command:group | 6 | s3-0084: "group all as Flow" gold: action=group target=mention(quantifier=all) name=flow; read: command:group action=group name=flow target=mention(quantifier=all)<br>s3-0103: "group check and done" gold: action=group target=check,done; read: command:group action=group target=check,done<br>s3-0276: "make Done and Check one group named Tail" gold: action=group target=done,check name=tail; read: command:group action=group name=tail target=done,check |
| held | command:disconnect | 6 | s3-0125: "delete all arrows" gold: action=disconnect quantifier=all; read: command:disconnect action=disconnect quantifier=all<br>s3-0148: "remove the arrow between check and done" gold: action=disconnect from=check to=done; read: command:disconnect action=disconnect from=check to=done<br>s3-0171: "remove all links" gold: action=disconnect quantifier=all; read: command:disconnect action=disconnect quantifier=all |
| held | (24 more keys; all in the JSON) | | |

**Structural holds** (7)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 7 | s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: question:help ask=help aspect=can<br>s3-0083: "process no label" gold: action=label target=process label=; read: command:label action=label target=process<br>s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can |

## nl_a_development / development (300 messages, 392 requested: right 49, wrong 228, not done 115, extras 186; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 217 |
| actions | 131 |
| values/roles | 181 |
| calibration | 39 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 392); ok (ungated: right + would-be right of structural holds = right of every request executed: 49); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 228); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 186); ok (ungated: unread = requested - paired: 115); ok (ungated right equals the score file: 49); ok (ungated wrong equals the score file: 181); ok (ungated extras equals the score file: 167); ok (ungated unread equals the score file: 115); ok (ungated structural holds equal the score file: 66); ok (every produced request is executed, structurally held or (gated) confidence-held: 463); ok (gated: executed wrong equals the score file: 2); ok (gated: executed extras equals the score file: 7); ok (gated: structural holds equal the score file: 66); ok (gated: confidence holds equal the score file: 369); ok (gated: right executed equals the score file: 19); ok (gated: unread equals the score file: 115); ok (gated: held right + held wrong or extra = confidence holds: 369)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 41 | 61 | 0 | 40 | 142 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 75 | 75 |
| 4 wrong act | model (act head) | 66 | 65 | 0 | 0 | 131 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 69 | 26 | 0 | 0 | 95 |
| 6 wrong or missing class value | model (class head) | 29 | 17 | 0 | 0 | 46 |
| 7 wrong words tagged for a name / text key | model (token head) | 24 | 16 | 0 | 0 | 40 |

**nl_a_development / development, trigger seen** (229)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 41 | nl-01-005: "conect it" gold: action=connect from=$new to=switch; read: action=connect from=$new to=$new (the unit covers 32% of the span)<br>nl-01-014: "Each app can reach the same database. The database should be lower down, visibly inside data" gold: action=create name=database position=inside anchor=data; read: not done (only a part of the span is a unit)<br>nl-01-020: "that direct route to deployment gone" gold: action=disconnect from=build to=deploy; read: not done (lost: no unit on the span) |
| 4 wrong act | model (act head) | 66 | nl-01-020: "Put the box back between Build and Deploy" gold: action=create name=tests position=between anchor=build,deploy; read: not done (read as command:move)<br>nl-01-020: "Put the box back between Build and Deploy" gold: requested: Put the box back between Build and Deploy; read: extra command:move action=move anchor=build,deploy position=between target=mention(shape=rectangle) (read as command:move where command:create is requested)<br>nl-01-026: "Start with Idle" gold: action=create name=idle; read: not done (read as command:connect) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 69 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move (a name or description the message does not write)<br>nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: action=create anchor=commit position=near (a name written in another request or by a pronoun)<br>nl-01-029: "both active states to be orange" gold: action=set target=running,paused color=orange; read: action=set color=orange target=paused (a name or description the message does not write) |
| 6 wrong or missing class value | model (class head) | 29 | nl-01-034: "need a small 'Forgot password?' link beside the password field" gold: action=create label=forgot password? size=small position=near anchor=password; read: action=create anchor=$new label=forgot password? position=between shape=text size=small<br>nl-01-038: "underneath uh a search bar full width" gold: action=create label=search bar position=below anchor=$new; read: action=create<br>nl-01-045: "add call DBA before that restart box" gold: action=create label=call dba position=above anchor=restart; read: action=create anchor=$new label=dba name=restart position=rightof shape=rectangle |
| 7 wrong words tagged for a name / text key | model (token head) | 24 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: action=create anchor=switch label=reception pc position=leftof<br>nl-01-014: "then go to two identical app instances" gold: action=create label=app instances count=2; read: action=create count=2<br>nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect from=yes to=deploy |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 17 | nl-01-014: "Each app can reach the same database. The database should be lower down, visibly inside data" gold: action=create name=database position=inside anchor=data; read: not done<br>nl-01-030: "We start Disconnected" gold: action=create name=disconnected; read: action=create label=after<br>nl-01-034: "Under Email address, add a note saying we'll send a verification message if they change it" gold: action=create shape=text label=we'll send a verification message if they change it position=below anchor=email; read: action=create anchor=email position=below |
| cut | (command:connect) | 7 | nl-01-005: "conect it" gold: action=connect from=$new to=switch; read: action=connect from=$new to=$new<br>nl-02-027: "have it join the samples at the instrument" gold: action=connect from=$new to=instrument; read: not done<br>nl-02-047: "after the manager" gold: action=connect from=manager to=$new; read: not done |
| cut | (command:label) | 4 | nl-01-027: "on pause" gold: action=label from=running to=paused label=pause; read: not done<br>nl-03-024: "say forty minutes" gold: action=label target=roast label=forty minutes; read: action=label label=forty minutes<br>nl-12-024: "The hex with nothing written on it is the ruined keep" gold: action=label target=hexb label=ruined keep; read: not done |
| cut | (command:move) | 3 | nl-04-027: "Our welcome desk and its Start here sign belong down in the lower left corner. Please take them there together" gold: action=move target=checkin position=bottomleft; read: action=move target=start<br>nl-05-007: "left of it" gold: action=move target=mention(label=water butt) position=leftof anchor=vent; read: action=move target=circle3<br>nl-12-025: "put the guards around the gate with the torches" gold: action=move target=guard,guard2,guard3,guard4,torch,torch2 position=near anchor=gate; read: action=move target=$new |
| cut | (command:set) | 2 | nl-03-045: "Make his eyes green like mine. No blue" gold: action=set target=eyel,eyer color=blue; read: action=set color=blue<br>nl-05-030: "a star is fine for the crown" gold: action=set target=crown shape=star; read: not done |
| cut | (command:group) | 2 | nl-10-047: "those three on the left are all things we'd actually do there so i want them to belong together, call it acti…" gold: action=group target=beach,hike,museum name=activities; read: action=group name=activities<br>nl-10-050: "all the fun stuff in a group so we can see it apart from the money side. So everything except Budget, and not…" gold: action=group target=beach,hike,museum name=activities; read: not done |
| cut | (command:disconnect) | 1 | nl-01-020: "that direct route to deployment gone" gold: action=disconnect from=build to=deploy; read: not done |
| cut | command:set | 1 | nl-03-045: "Make his eyes green like mine" gold: requested: Make his eyes green like mine. No blue; read: extra command:set action=set color=green |
| act | command:create read as command:move | 21 | nl-01-020: "Put the box back between Build and Deploy" gold: action=create name=tests position=between anchor=build,deploy; read: not done<br>nl-01-020: "Put the box back between Build and Deploy" gold: requested: Put the box back between Build and Deploy; read: extra command:move action=move anchor=build,deploy position=between target=mention(shape=rectangle)<br>nl-01-038: "put the basket up top by the logo" gold: action=create name=basket position=near anchor=logo; read: not done |
| act | command:create read as command:connect | 5 | nl-01-026: "Start with Idle" gold: action=create name=idle; read: not done<br>nl-01-026: "Start with Idle and Running" gold: requested: Start with Idle; read: extra command:connect action=connect<br>nl-02-009: "make a second line for planned admissions coming in from the clinic" gold: action=create name=clinic; read: not done |
| act | command:move read as command:create | 4 | nl-01-034: "move Save changes under the fields" gold: action=move target=save position=below anchor=email,password; read: not done<br>nl-01-034: "move Save changes under the fields" gold: requested: move Save changes under the fields; read: extra command:create action=create<br>nl-06-021: "Blue spawn further from the middle" gold: action=move target=bluespawn direction=left; read: not done |
| act | command:label read as command:move | 4 | nl-06-044: "Put it at 12:30" gold: action=label target=lunch label=12:30 lunch; read: not done<br>nl-06-044: "shift the workshop to 1:30" gold: action=label target=workshop label=1:30 workshop; read: not done<br>nl-06-044: "Put it at 12:30" gold: requested: Put it at 12:30; read: extra command:move action=move |
| act | command:connect read as command:create | 4 | nl-08-004: "Algorithms also needs the maths one before it" gold: action=connect from=ma102 to=cs301; read: not done<br>nl-08-004: "Algorithms also needs the maths one before it" gold: requested: Algorithms also needs the maths one before it; read: extra command:create action=create name=algorithms<br>nl-12-031: "11 on the left back" gold: action=connect from=p11 to=rlb; read: not done |
| act | command:create read as command:arrange | 3 | nl-02-047: "we need legal to look at the contract as well as finance looking at the spend so can those be side by side af…" gold: requested: we need legal to look at the contract as well as finance lo…; read: extra command:arrange action=arrange target=legal,contract<br>nl-08-033: "timeline for the grant" gold: action=create template=timeline; read: not done<br>nl-08-033: "timeline for the grant" gold: requested: timeline for the grant; read: extra command:arrange action=arrange |
| act | command:create read as command:set | 3 | nl-05-015: "shade the sitting bit pale yellow" gold: action=create layer=zone color=yellow fill=light position=near anchor=bench; read: not done<br>nl-05-015: "shade the sitting bit pale yellow" gold: requested: shade the sitting bit pale yellow; read: extra command:set action=set color=yellow target=sitting<br>nl-09-002: "we need the sea at the bottom, nice and big and blue" gold: requested: we need the sea at the bottom, nice and big and blue; read: extra command:set action=set color=blue size=large |
| act | command:create read as command:label | 2 | nl-02-031: "On the left I need the two parties, Reed" gold: action=create name=reed position=left; read: not done<br>nl-02-031: "On the left I need the two parties, Reed and Northfield Estates, separately" gold: requested: On the left I need the two parties, Reed; read: extra command:label action=label label=northfield estates target=reed |
| ref | target | 39 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move<br>nl-01-029: "both active states to be orange" gold: action=set target=running,paused color=orange; read: action=set color=orange target=paused<br>nl-01-034: "line up its left edge with theirs" gold: action=align target=email,password,save direction=left; read: action=align target=$new |
| ref | from | 16 | nl-01-030: "After three failures we give up and go to Disconnected. Put the three-failure condition on the arrow" gold: action=connect from=retrying to=disconnected label=three failures; read: action=connect from=$new label=three to=disconnected<br>nl-02-004: "Colour that urgent route red. Actually orange" gold: action=set from=triage to=assessment color=orange; read: action=set color=orange to=text1<br>nl-02-031: "Connect each document to the claim with a plain line" gold: action=connect from=mention(label=1998 transfer),survey,mention(label=email chain) to=mention(label=disputed boundary) …; read: action=connect arrow=none from=$new to=$new |
| ref | anchor | 13 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move<br>nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: action=create anchor=commit position=near<br>nl-02-005: "The handover goes after the bed is confirmed, before transfer" gold: action=create shape=rectangle name=handover position=between anchor=mention(label=wait for confirmation),transfer; read: action=create anchor=$new position=between |
| ref | to | 11 | nl-02-004: "Colour that urgent route red. Actually orange" gold: action=set from=triage to=assessment color=orange; read: action=set color=orange to=text1<br>nl-02-009: "have both lines meet at the bed request" gold: action=connect from=$new to=bedrequest label=planned admissions; read: action=connect<br>nl-02-031: "Connect each document to the claim with a plain line" gold: action=connect from=mention(label=1998 transfer),survey,mention(label=email chain) to=mention(label=disputed boundary) …; read: action=connect arrow=none from=$new to=$new |
| ref | linked | 1 | nl-03-032: "Another for Saturn" gold: action=create name=saturn size=small linked=planets; read: action=create name=saturn |
| class | position | 14 | nl-01-034: "need a small 'Forgot password?' link beside the password field" gold: action=create label=forgot password? size=small position=near anchor=password; read: action=create anchor=$new label=forgot password? position=between shape=text size=small<br>nl-01-038: "underneath uh a search bar full width" gold: action=create label=search bar position=below anchor=$new; read: action=create<br>nl-01-045: "add call DBA before that restart box" gold: action=create label=call dba position=above anchor=restart; read: action=create anchor=$new label=dba name=restart position=rightof shape=rectangle |
| class | target | 6 | nl-11-003: "white then" gold: action=set target=mention(recency=newest) color=white; read: action=set color=white target=circle2<br>nl-11-012: "call the orange thing Flame" gold: action=rename target=mention(color=orange,shape=diamond) name=flame; read: action=rename name=flame target=mention(color=orange)<br>nl-11-014: "smaller than the name though" gold: action=resize target=mention(recency=newest); read: action=resize |
| class | shape | 3 | nl-02-036: "How many documents link directly to the allegation" gold: ask=count shape=rectangle linked=allegation; read: ask=count<br>nl-09-050: "how many houses it has together" gold: ask=count shape=square; read: ask=count<br>nl-11-024: "how many stops have we got now" gold: ask=count shape=any; read: ask=count |
| class | anchor | 3 | nl-05-020: "archive above the guard room" gold: action=create name=archive position=above anchor=mention(label=guard room); read: action=create anchor=guard label=archive position=above<br>nl-08-008: "put a little table beside the globe, a square would do nicely" gold: action=create shape=square size=small name=table position=near anchor=globe; read: action=create anchor=mention(shape=square) position=near shape=square size=small<br>nl-11-006: "under the circle write Hearth & Bean" gold: action=create shape=text label=hearth & bean position=below anchor=mention(shape=circle); read: action=create anchor=diamond1 label=hearth & bean position=below shape=text |
| class | color | 1 | nl-02-046: "count them" gold: ask=count color=orange; read: ask=count |
| class | size | 1 | nl-03-031: "Give Planets a little one off it for Mars" gold: action=create name=mars size=small linked=planets; read: action=create name=mars |
| class | from | 1 | nl-05-033: "hook the guard room up to the street exit" gold: action=connect from=mention(label=guard room) to=exit; read: action=connect from=start,crown to=start,crown |
| class | object | 1 | nl-09-050: "the park needs on him still a small lake" gold: action=create object=lake size=small position=ontop anchor=park; read: action=create size=small |
| name | label | 10 | nl-01-014: "then go to two identical app instances" gold: action=create label=app instances count=2; read: action=create count=2<br>nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect from=yes to=deploy<br>nl-01-019: "no goes back to Commit" gold: action=connect from=$new to=commit label=no; read: action=connect from=deploy to=commit |
| name | target | 7 | nl-01-048: "Put the backup under the primary" gold: action=move target=backup position=below anchor=primary; read: action=move anchor=primary position=below<br>nl-02-005: "the handover box to say 'Nurse-to-nurse handover'" gold: action=label target=$new label=nurse-to-nurse handover; read: action=label label=nurse-to-nurse handover target=handover<br>nl-03-015: "The box that says Dad should say Martin" gold: action=label target=dad label=martin; read: action=label label=martin |
| name | name | 4 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: action=create anchor=switch label=reception pc position=leftof<br>nl-09-012: "make a shark" gold: action=create name=shark; read: action=create<br>nl-11-020: "then Schools" gold: action=create name=schools position=rightof anchor=$new; read: action=create anchor=$new label=schools position=rightof |
| name | from | 3 | nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect from=yes to=deploy<br>nl-01-019: "no goes back to Commit" gold: action=connect from=$new to=commit label=no; read: action=connect from=deploy to=commit<br>nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: action=label label=7 min |
| name | linked | 3 | nl-04-050: "After Bake please make Cool" gold: action=create name=cool linked=bake; read: action=create name=cool<br>nl-06-006: "after raise P O um there should be a wait for finance" gold: action=create label=wait for finance linked=raise; read: action=create name=finance<br>nl-06-049: "put signing after the questions um from eight fifteen till nine" gold: action=create label=signing from eight fifteen till nine linked=questions; read: action=create label=signing |
| name | to | 2 | nl-03-038: "Join food and games together" gold: action=connect from=food to=games; read: action=connect from=food<br>nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: action=label label=7 min |
| cut | (4 more keys; all in the JSON) | | |
| act | (10 more keys; all in the JSON) | | |
| class | (1 more keys; all in the JSON) | | |

**nl_a_development / development, trigger unseen** (185)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 61 | nl-01-006: "There's nowhere on this drawing for the phones. We have six of them on the same switch" gold: action=create name=phones count=6 linked=switch; read: not done (lost: no unit on the span)<br>nl-01-014: "Three plain areas is enough: public entry" gold: action=create layer=zone label=public entry; read: not done (lost: no unit on the span)<br>nl-01-014: "application" gold: action=create layer=zone name=application; read: not done (lost: no unit on the span) |
| 4 wrong act | model (act head) | 65 | nl-01-014: "Requests come in at the top" gold: action=create name=requests position=top; read: not done (read as command:move)<br>nl-01-014: "Requests come in at the top" gold: requested: Requests come in at the top; read: extra command:move action=move position=top target=requests (read as command:move where command:create is requested)<br>nl-01-017: "enclose each in his own fence" gold: requested: enclose each in his own fence; read: extra command:connect action=connect (read as command:connect where command:create is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 26 | nl-01-004: "Give them some space" gold: action=respace target=guestwifi,staffwifi comparison=bigger; read: action=respace comparison=bigger target=mention(quantifier=all) (a name or description the message does not write)<br>nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: action=create (a name written in another request or by a pronoun)<br>nl-01-023: "rollback shoud go back to last good relase" gold: action=connect from=rollback to=lastgood; read: action=connect (a name or description the message does not write) |
| 6 wrong or missing class value | model (class head) | 17 | nl-01-034: "a second version alongside this" gold: action=duplicate target=mention(quantifier=all); read: action=duplicate anchor=$new position=near<br>nl-02-031: "the email chain" gold: action=create label=email chain position=right; read: action=create<br>nl-04-048: "bake then cool then ice. missing the cool box" gold: action=create shape=rectangle name=cool position=between anchor=bake,ice; read: action=create label=ice name=bake |
| 7 wrong words tagged for a name / text key | model (token head) | 16 | nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect from=idle to=running<br>nl-02-049: "the school committee above that" gold: action=create label=school committee position=above anchor=$new; read: action=create anchor=student label=school committee position=above<br>nl-03-027: "squeze a let it cool bit in btween oven and icing" gold: action=create label=let it cool position=between anchor=oven,icing; read: action=create anchor=oven,icing position=between |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 25 | nl-01-006: "There's nowhere on this drawing for the phones. We have six of them on the same switch" gold: action=create name=phones count=6 linked=switch; read: not done<br>nl-01-014: "Three plain areas is enough: public entry" gold: action=create layer=zone label=public entry; read: not done<br>nl-01-014: "application" gold: action=create layer=zone name=application; read: not done |
| cut | (command:connect) | 14 | nl-01-027: "resume goes back" gold: action=connect from=paused to=running label=resume; read: action=connect from=running to=paused<br>nl-01-030: "If the handshake times out, we go back to Disconnected" gold: action=connect from=connecting to=disconnected label=handshake times out; read: action=connect from=ready to=disconnected<br>nl-02-005: "check again later" gold: action=connect from=$new to=mention(label=wait for confirmation); read: not done |
| cut | (command:move) | 4 | nl-07-044: "the one that says leakage check goes before the split" gold: action=move target=cell3 position=above anchor=cell2; read: not done<br>nl-08-003: "desk is by the door not middle, door is at bottom" gold: action=move target=desk position=bottom; read: not done<br>nl-12-021: "the dragon is not supposed to be IN the tavern lmao. learn to read. cave" gold: action=move target=dragon position=near anchor=cave; read: not done |
| cut | (command:disconnect) | 3 | nl-01-017: "The arrow between them gives a wrong idea, there is no circulation of data from testing into production" gold: action=disconnect from=prod to=test; read: not done<br>nl-01-023: "not all way to commit" gold: action=disconnect from=commit to=rollback; read: not done<br>nl-04-047: "rather than straight from Bake to Ice" gold: action=disconnect from=bake to=ice; read: not done |
| cut | (command:label) | 3 | nl-06-037: "At the second picture the grandmother is with back to us. We must not see her eyes until the third picture. P…" gold: action=label target=grandma2 label=with back to us; read: not done<br>nl-08-010: "the yes is to the reimbursement" gold: action=label from=coverage to=reimbursement label=yes; read: not done<br>nl-10-042: "Whoever the pass is going to, that's our striker, so say so on him" gold: action=label target=p9 label=striker; read: action=label label=so |
| cut | (command:set) | 2 | nl-02-026: "The dashed line looks like an optional step" gold: action=set from=remove to=log style=solid; read: not done<br>nl-08-037: "Dr Barbu's boxes green" gold: action=set target=mention(label=dr barbu,quantifier=all,shape=rectangle) color=green; read: action=set color=green |
| cut | (command:delete) | 2 | nl-06-049: "rather than another box at the end" gold: action=delete target=drinks; read: not done<br>nl-08-049: "There should only be four chairs now" gold: action=delete target=chair5,chair6; read: not done |
| cut | (command:swap) | 1 | nl-02-025: "controls run BEFORE samples can u change order" gold: action=swap target=controls,samples; read: not done |
| act | command:create read as command:connect | 11 | nl-01-017: "enclose each in his own fence" gold: requested: enclose each in his own fence; read: extra command:connect action=connect<br>nl-01-027: "Running can go to Paused" gold: action=create name=paused linked=running; read: not done<br>nl-01-030: "a successful handshake takes us to Ready" gold: action=create name=ready linked=connecting; read: not done |
| act | command:create read as command:move | 10 | nl-01-014: "Requests come in at the top" gold: action=create name=requests position=top; read: not done<br>nl-01-014: "Requests come in at the top" gold: requested: Requests come in at the top; read: extra command:move action=move position=top target=requests<br>nl-01-030: "that as a note beside Connecting" gold: requested: Leave that as a note beside Connecting; read: extra command:move action=move anchor=connecting position=near |
| act | command:move read as command:create | 6 | nl-08-047: "middle box up over the first one" gold: action=move target=budget position=above anchor=summary; read: not done<br>nl-08-047: "middle box up over the first one" gold: requested: middle box up over the first one; read: extra command:create action=create anchor=mention(shape=rectangle) position=above<br>nl-09-050: "The street shall run under the houses through" gold: action=move target=road position=below anchor=house,house2,house3,house4; read: not done |
| act | command:duplicate read as command:create | 4 | nl-04-042: "Make another one just like him on the right" gold: action=duplicate target=alien position=rightof anchor=alien; read: not done<br>nl-04-042: "Make another one just like him on the right, eyes and everything" gold: requested: Make another one just like him on the right; read: extra command:create action=create name=eyes<br>nl-04-044: "i want two of him the new one on the right" gold: action=duplicate target=alien position=rightof anchor=alien; read: not done |
| act | command:label read as command:create | 3 | nl-01-021: "The step immediately before the green one needs an owner: Release captain" gold: action=label target=signoff label=release captain; read: not done<br>nl-01-021: "The step immediately before the green one needs an owner: Release captain" gold: requested: The step immediately before the green one needs an owner: R…; read: extra command:create action=create label=release captain<br>nl-02-005: "After the admission decision, somebody has to request a bed" gold: action=label target=bed label=request a bed; read: not done |
| act | command:disconnect read as command:connect | 3 | nl-04-049: "replacing that direct arrow" gold: action=disconnect from=bake to=ice; read: not done<br>nl-04-050: "The present road that jumps from Bake directly to Ice should no longer exist" gold: action=disconnect from=bake to=ice; read: not done<br>nl-04-050: "road that jumps from Bake directly to Ice" gold: requested: The present road that jumps from Bake directly to Ice shoul…; read: extra command:connect action=connect from=bake to=ice |
| act | question:path read as command:connect | 2 | nl-01-033: "Can you get from the one at the bottom back to Idle" gold: ask=path from=recovering to=idle; read: not done<br>nl-01-033: "Can you get from the one at the bottom back to Idle without passing through Error" gold: requested: Can you get from the one at the bottom back to Idle; read: extra command:connect action=connect from=mention() to=idle |
| act | command:set read as command:create | 2 | nl-01-037: "make it look like a line of text under Password" gold: action=set target=forgot shape=text; read: not done<br>nl-01-037: "make it look like a line of text under Password" gold: requested: make it look like a line of text under Password; read: extra command:create action=create anchor=password position=below |
| ref | anchor | 9 | nl-01-034: "the error message actually below that field" gold: action=create shape=text label=error message position=below anchor=mention(label=email address,recency=newest); read: action=create anchor=$new position=below<br>nl-02-020: "The scale must be nearer of the bottom wall" gold: action=move target=scale position=near anchor=bottomwall; read: action=move<br>nl-06-047: "there'd be a quiet ten minutes between dinner and the bidding" gold: action=create label=quiet ten minutes position=between anchor=dinner,auction; read: action=create |
| ref | target | 8 | nl-01-004: "Give them some space" gold: action=respace target=guestwifi,staffwifi comparison=bigger; read: action=respace comparison=bigger target=mention(quantifier=all)<br>nl-01-034: "make it shallower" gold: action=resize target=header; read: action=resize from=$new to=$new<br>nl-04-029: "the grouped desk and sign that need relocating to the bottom-left corner" gold: action=move target=checkin position=bottomleft; read: action=move position=bottomleft |
| ref | from | 6 | nl-01-028: "stop from either active state returns to Idle" gold: action=connect from=running,paused to=idle label=stop; read: action=connect from=paused to=idle<br>nl-03-023: "That last arrow is the wrong way round" gold: action=reverse from=cake to=oven; read: action=reverse target=mention(quantifier=all)<br>nl-05-008: "hose from the butt to both beds, dotted" gold: action=connect style=dotted from=mention(label=water butt) to=herbs,tomatoes; read: action=connect from=circle3 style=dotted to=circle3 |
| ref | to | 5 | nl-01-023: "rollback shoud go back to last good relase" gold: action=connect from=rollback to=lastgood; read: action=connect<br>nl-03-023: "That last arrow is the wrong way round" gold: action=reverse from=cake to=oven; read: action=reverse target=mention(quantifier=all)<br>nl-05-008: "hose from the butt to both beds, dotted" gold: action=connect style=dotted from=mention(label=water butt) to=herbs,tomatoes; read: action=connect from=circle3 style=dotted to=circle3 |
| ref | linked | 1 | nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: action=create |
| class | position | 7 | nl-02-031: "the email chain" gold: action=create label=email chain position=right; read: action=create<br>nl-04-048: "bake then cool then ice. missing the cool box" gold: action=create shape=rectangle name=cool position=between anchor=bake,ice; read: action=create label=ice name=bake<br>nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=mention() position=inside size=small |
| class | shape | 5 | nl-04-048: "bake then cool then ice. missing the cool box" gold: action=create shape=rectangle name=cool position=between anchor=bake,ice; read: action=create label=ice name=bake<br>nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=mention() position=inside size=small<br>nl-08-035: "under Wed the same" gold: action=create shape=rectangle label=dr barbu position=below anchor=wed; read: action=create anchor=wed position=below |
| class | target | 2 | nl-01-034: "a second version alongside this" gold: action=duplicate target=mention(quantifier=all); read: action=duplicate anchor=$new position=near<br>nl-11-005: "bit bigger" gold: action=resize target=mention(recency=newest); read: action=resize target=diamond1 |
| class | anchor | 2 | nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=mention() position=inside size=small<br>nl-11-004: "orange diamond on top of the white, not too big" gold: action=create shape=diamond color=orange position=ontop anchor=mention(color=white,shape=circle); read: action=create anchor=mention(shape=diamond) color=orange position=above shape=diamond |
| class | layout | 1 | nl-05-012: "3 chairs round it" gold: action=create label=chairs count=3 position=near anchor=table layout=circle; read: action=create anchor=table count=3 position=near |
| class | color | 1 | nl-05-029: "vault dark blue" gold: action=set target=vault color=navy; read: action=set color=blue target=vault |
| class | object | 1 | nl-09-002: "a sun up in one corner" gold: action=create object=sun; read: action=create |
| class | from | 1 | nl-09-012: "the shark eats the big fish and the big fish eats the litle fish" gold: action=connect from=shark,mention(label=fish,size=large),mention(label=fish,size=small); read: action=connect from=$new to=$new |
| name | label | 7 | nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect from=idle to=running<br>nl-03-027: "squeze a let it cool bit in btween oven and icing" gold: action=create label=let it cool position=between anchor=oven,icing; read: action=create anchor=oven,icing position=between<br>nl-07-027: "on DPO the name of Ms Keller" gold: action=label target=dpo label=ms keller; read: action=label label=keller target=dpo |
| name | target | 5 | nl-07-019: "welding red" gold: action=set target=welding color=red; read: action=set color=red<br>nl-07-020: "the welding station stand out in red" gold: action=set target=welding color=red; read: action=set color=red<br>nl-08-008: "the large stacks you have drawn at the upper right should be named the Local History Collection" gold: action=label target=stacks label=local history collection; read: action=label label=local history collection |
| name | from | 3 | nl-04-050: "from Cool continue to Ice" gold: action=connect from=cool to=ice; read: action=connect from=$new to=ice<br>nl-05-021: "hall to archive" gold: action=connect from=hall to=archive; read: action=connect from=archive to=archive<br>nl-11-042: "shipped to refund, label returns" gold: action=connect from=shipped to=refund label=returns; read: action=connect from=refund label=returns to=refund |
| name | anchor | 1 | nl-02-049: "the school committee above that" gold: action=create label=school committee position=above anchor=$new; read: action=create anchor=student label=school committee position=above |
| cut | (7 more keys; all in the JSON) | | |
| act | (13 more keys; all in the JSON) | | |
| class | (1 more keys; all in the JSON) | | |

**nl_a_development / development, trigger no request** (115)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 40 | nl-01-014: "Each app can reach the same database" gold: -; read: extra command:connect action=connect from=$new (partial overlap with a requested action: 39% of it)<br>nl-01-014: "The database should be lower down" gold: -; read: extra command:move action=move position=bottom target=database (partial overlap with a requested action: 36% of it)<br>nl-01-023: "commit" gold: -; read: extra command:create action=create name=commit (partial overlap with a requested action: 29% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 75 | nl-01-003: "the grey one still above it" gold: -; read: extra command:create action=create (no requested action on this text)<br>nl-01-023: "arrow only" gold: -; read: extra command:connect action=connect from=$new (no requested action on this text)<br>nl-01-025: "Make staging like production" gold: -; read: extra command:rename action=rename target=staging (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 15 | nl-01-023: "commit" gold: -; read: extra command:create action=create name=commit<br>nl-04-050: "The" gold: -; read: extra command:create action=create<br>nl-05-002: "tomatoes" gold: -; read: extra command:create action=create |
| cut | command:move | 6 | nl-01-014: "The database should be lower down" gold: -; read: extra command:move action=move position=bottom target=database<br>nl-01-038: "underneath" gold: -; read: extra command:move action=move anchor=basket position=below target=basket<br>nl-04-027: "down" gold: -; read: extra command:move action=move direction=down |
| cut | command:connect | 5 | nl-01-014: "Each app can reach the same database" gold: -; read: extra command:connect action=connect from=$new<br>nl-04-047: "from Bake to" gold: -; read: extra command:connect action=connect from=bake to=$new<br>nl-06-043: "to" gold: -; read: extra command:connect action=connect from=food to=food |
| cut | command:label | 5 | nl-03-006: "give it the writing river" gold: -; read: extra command:label action=label label=river target=sea<br>nl-03-016: "'s" gold: -; read: extra command:label action=label<br>nl-04-030: "the start here bit" gold: -; read: extra command:label action=label |
| cut | command:undo | 2 | nl-06-043: "that" gold: -; read: extra command:undo action=undo<br>nl-07-044: "that" gold: -; read: extra command:undo action=undo |
| cut | command:rename | 2 | nl-09-053: "Call it that" gold: -; read: extra command:rename action=rename target=post<br>nl-12-020: "Just call it Old Mine" gold: -; read: extra command:rename action=rename target=$new |
| cut | command:set | 1 | nl-02-047: "both" gold: -; read: extra command:set action=set target=$new |
| cut | command:sort | 1 | nl-02-047: "order" gold: -; read: extra command:sort action=sort property=name target=mention(quantifier=all) |
| spurious | command:create | 23 | nl-01-003: "the grey one still above it" gold: -; read: extra command:create action=create<br>nl-01-037: "box" gold: -; read: extra command:create action=create shape=rectangle<br>nl-01-045: "db" gold: -; read: extra command:create action=create name=db |
| spurious | command:move | 10 | nl-01-038: "below that two product cards" gold: -; read: extra command:move action=move anchor=$new position=below target=$new<br>nl-06-028: "Right the receiver on the far left" gold: -; read: extra command:move action=move position=left<br>nl-06-028: "he goes ten yards" gold: -; read: extra command:move action=move direction=down distance=10 |
| spurious | command:connect | 9 | nl-01-023: "arrow only" gold: -; read: extra command:connect action=connect from=$new<br>nl-03-015: "I still want both the lines coming down to me from Jo and Martin" gold: -; read: extra command:connect action=connect arrow=none from=jo to=sam<br>nl-05-005: "facing the beds" gold: -; read: extra command:connect action=connect from=bench to=bench |
| spurious | command:set | 9 | nl-01-034: "blue" gold: -; read: extra command:set action=set color=blue target=$new<br>nl-02-018: "square" gold: -; read: extra command:set action=set shape=square<br>nl-04-043: "colours" gold: -; read: extra command:set action=set color=blue |
| spurious | command:label | 5 | nl-01-037: "Forgot password?" gold: -; read: extra command:label action=label label=forgot<br>nl-02-003: "The other route can say routine" gold: -; read: extra command:label action=label label=routine target=assessment<br>nl-06-004: "the desk bit is Facilities" gold: -; read: extra command:label action=label label=facilities target=it |
| spurious | question:count | 3 | nl-07-012: "how many sensors unwired" gold: -; read: extra question:count ask=count<br>nl-09-026: "number them" gold: -; read: extra question:count ask=count<br>nl-12-047: "many" gold: -; read: extra question:count ask=count |
| spurious | question:help | 2 | nl-02-006: "can u" gold: -; read: extra question:help ask=help<br>nl-10-045: "can" gold: -; read: extra question:help ask=help aspect=can |
| spurious | question:rules | 2 | nl-09-030: "what the rules are" gold: -; read: extra question:rules ask=rules<br>nl-09-038: "rules" gold: -; read: extra question:rules ask=rules |
| cut | (3 more keys; all in the JSON) | | |
| spurious | (12 more keys; all in the JSON) | | |

### nl_a_development / development at the cost-10 threshold (0.8588)

Executed: right 19, wrong 2, extras 7. Structural holds 66 ({"blocked":50,"dependency":16}; 0 of them would have been right). Confidence holds 369: right 30, wrong or extra 339. Unread 115.

**Executed wrong, by first cause** (9)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 4 | nl-01-029: "Paused is still blue" gold: -; read: extra fact: color=blue target=paused (confidence 0.887; extra)<br>nl-09-030: "Some should be red" gold: -; read: extra command:set action=set color=red target=some (confidence 0.861; extra)<br>nl-09-030: "what the rules are" gold: -; read: extra question:rules ask=rules (confidence 0.895; extra) |
| 4 wrong act | model (act head) | 3 | nl-03-015: "Could you put Sam beside Martin" gold: -; read: extra command:move action=move anchor=martin position=near target=sam (confidence 0.880; extra)<br>nl-05-027: "vault left of archive" gold: -; read: extra command:move action=move anchor=archive position=leftof target=vault (confidence 0.889; extra)<br>nl-11-025: "Library goes between market and station" gold: -; read: extra command:move action=move anchor=market,station position=between target=library (confidence 0.987; extra) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 1 | nl-10-016: "Make the tasks in Done green" gold: action=set target=task1,task2 color=green; read: command:set action=set color=green target=done (confidence 0.964; wrong) |
| 6 wrong or missing class value | model (class head) | 1 | nl-11-033: "write Zone 2 on it" gold: action=label target=mention(color=yellow,layer=zone) label=zone 2; read: command:label action=label label=zone 2 target=rectangle1 (confidence 0.933; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | fact: | 1 | nl-01-029: "Paused is still blue" gold: -; read: extra fact: color=blue target=paused |
| spurious | command:set | 1 | nl-09-030: "Some should be red" gold: -; read: extra command:set action=set color=red target=some |
| spurious | question:rules | 1 | nl-09-030: "what the rules are" gold: -; read: extra question:rules ask=rules |
| spurious | question:path | 1 | nl-12-026: "can you get from Mill to Keep without going through the Swamp" gold: -; read: extra question:path ask=path from=mill to=keep |
| act | command:create read as command:move | 3 | nl-03-015: "Could you put Sam beside Martin" gold: -; read: extra command:move action=move anchor=martin position=near target=sam<br>nl-05-027: "vault left of archive" gold: -; read: extra command:move action=move anchor=archive position=leftof target=vault<br>nl-11-025: "Library goes between market and station" gold: -; read: extra command:move action=move anchor=market,station position=between target=library |
| ref | target | 1 | nl-10-016: "Make the tasks in Done green" gold: action=set target=task1,task2 color=green; read: command:set action=set color=green target=done |
| class | target | 1 | nl-11-033: "write Zone 2 on it" gold: action=label target=mention(color=yellow,layer=zone) label=zone 2; read: command:label action=label label=zone 2 target=rectangle1 |

**Right but held by confidence** (30)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 16 | nl-01-014: "Add object storage off to one side" gold: action=create label=object storage; read: command:create action=create label=object storage<br>nl-01-019: "After the checks we need a decision: approved for customers?" gold: action=create label=approved for customers? position=rightof anchor=tests; read: command:create action=create anchor=tests label=approved for customers? position=rightof<br>nl-02-031: "Put the claim in the centre: disputed boundary" gold: action=create label=disputed boundary position=center; read: command:create action=create label=disputed boundary position=center |
| held | command:label | 3 | nl-01-019: "Call Build 'Package the release'" gold: action=label target=build label=package the release; read: command:label action=label label=package the release target=build<br>nl-01-019: "Tests 'Check it works'" gold: action=label target=tests label=check it works; read: command:label action=label label=check it works target=tests<br>nl-07-027: "write on the breach item that notification must be in 72 hours" gold: action=label target=breach label=notification must be in 72 hours; read: command:label action=label label=notification must be in 72 hours target=breach |
| held | command:resize | 3 | nl-05-011: "table smaller" gold: action=resize target=table; read: command:resize action=resize target=table<br>nl-08-003: "kids section shld be way bigger" gold: action=resize target=kids; read: command:resize action=resize target=kids<br>nl-11-023: "bigger too" gold: action=resize target=hospital; read: command:resize action=resize target=hospital |
| held | command:connect | 3 | nl-05-031: "secret way from vault back to hall, dashed" gold: action=connect style=dashed from=vault to=hall; read: command:connect action=connect arrow=none from=vault style=dashed to=hall<br>nl-08-040: "Anatomy leads to Physiology and Physiology leads to Surgery" gold: action=connect from=anatomy,physiology,surgery; read: command:connect action=connect from=anatomy,physiology,surgery<br>nl-12-027: "there should be one, Ford to Keep" gold: action=connect from=ford to=keep; read: command:connect action=connect from=ford to=keep |
| held | command:swap | 2 | nl-06-032: "swap the people labelled Anna and Bev" gold: action=swap target=anna,bev; read: command:swap action=swap target=anna,bev<br>nl-09-013: "Swap the fox and the owl" gold: action=swap target=fox,owl; read: command:swap action=swap target=fox,owl |
| held | question:path | 1 | nl-05-032: "can you get from start to the crown without using the secret way" gold: ask=path from=start to=crown; read: question:path ask=path from=start to=crown |
| held | question:help | 1 | nl-08-040: "what does fill even mean" gold: ask=help topic=fill; read: question:help ask=help topic=fill |
| held | command:rename | 1 | nl-11-046: "rename notfy to Email" gold: action=rename target=notify name=email; read: command:rename action=rename name=email target=notify |

**Structural holds** (66)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 49 | nl-01-030: "Once Ready" gold: action=create shape=text label=cancellation path position=near anchor=connecting; read: command:create action=create anchor=disconnected position=near shape=square<br>nl-01-030: "a successful retry goes to Ready again" gold: action=connect from=retrying to=ready label=successful retry; read: command:connect action=connect from=retrying to=ready<br>nl-01-030: "cancellation path" gold: action=create name=connecting linked=disconnected; read: command:create action=create |
| blocked | unresolved-reference | 1 | nl-08-006: "between the budget and submit there needs to be letters of support no letters like letters from people the su…" gold: action=create label=supporting letters position=between anchor=budget,submit; read: command:create action=create label=support |

## t1_all / all (1793 messages, 1793 requested: right 1527, wrong 258, not done 8, extras 14; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 6 |
| actions | 16 |
| values/roles | 258 |
| calibration | 215 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1793); ok (ungated: right + would-be right of structural holds = right of every request executed: 1527); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 258); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 14); ok (ungated: unread = requested - paired: 8); ok (ungated right equals the score file: 1527); ok (ungated wrong equals the score file: 257); ok (ungated extras equals the score file: 14); ok (ungated unread equals the score file: 8); ok (ungated structural holds equal the score file: 1); ok (every produced request is executed, structurally held or (gated) confidence-held: 1799); ok (gated: executed wrong equals the score file: 7); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 1); ok (gated: confidence holds equal the score file: 472); ok (gated: right executed equals the score file: 1319); ok (gated: unread equals the score file: 8); ok (gated: held right + held wrong or extra = confidence holds: 472)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 6 | 6 |
| 4 wrong act | model (act head) | 16 | 0 | 0 | 0 | 16 |
| 6 wrong or missing class value | model (class head) | 257 | 0 | 0 | 0 | 257 |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | 0 | 0 | 0 | 1 |

**t1_all / all, trigger seen** (274)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 16 | st1-00545: "create a timeline with 3 steps" gold: action=create template=timeline count=3; read: not done (read as command:arrange)<br>st1-00545: "create a timeline with 3 steps" gold: requested: create a timeline with 3 steps; read: extra command:arrange action=arrange template=timeline (read as command:arrange where command:create is requested)<br>st1-00784: "draw a timeline with 5 steps" gold: action=create template=timeline count=5; read: not done (read as command:arrange) |
| 6 wrong or missing class value | model (class head) | 257 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set outline=cyan target=sales<br>st1-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | st1-01635: "label the arrow from Lambda to Cache "writes"" gold: action=label label=writes from=lambda to=cache; read: action=label from=lambda to=cache |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:create read as command:arrange | 16 | st1-00545: "create a timeline with 3 steps" gold: action=create template=timeline count=3; read: not done<br>st1-00545: "create a timeline with 3 steps" gold: requested: create a timeline with 3 steps; read: extra command:arrange action=arrange template=timeline<br>st1-00784: "draw a timeline with 5 steps" gold: action=create template=timeline count=5; read: not done |
| class | outline | 124 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set outline=cyan target=sales<br>st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create outline=navy shape=rectangle |
| class | property | 69 | st1-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused<br>st1-00068: "what is the border of Error" gold: ask=property property=outline target=error; read: ask=property target=error<br>st1-00118: "what's the border color of Waiting" gold: ask=property property=outline target=waiting; read: ask=property property=color target=waiting |
| class | target | 51 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown size=tiny target=mention(quantifier=all,shape=hexagon) |
| class | color | 26 | st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create outline=navy shape=rectangle<br>st1-00138: "add a gold ellipse with a cyan outline" gold: action=create shape=ellipse color=gold outline=cyan; read: action=create shape=ellipse<br>st1-00228: "make a pink triangle with a lime outline" gold: action=create shape=triangle color=pink outline=lime; read: action=create shape=triangle |
| class | size | 9 | st1-00050: "how many huge ellipses are there" gold: ask=count shape=ellipse size=huge; read: ask=count shape=ellipse<br>st1-00496: "how many huge rectangles are there" gold: ask=count shape=rectangle size=huge; read: ask=count shape=rectangle<br>st1-00614: "how many giant triangles are there" gold: ask=count shape=triangle size=huge; read: ask=count shape=triangle |
| class | direction | 2 | st1-00731: "move Nas left" gold: action=move target=nas direction=left; read: action=move target=nas<br>st1-00915: "move Header right" gold: action=move target=header direction=right; read: action=move position=right target=header |
| class | style | 1 | st1-01012: "make the arrow from Worker to Kafka solid" gold: action=set from=worker to=kafka style=solid; read: action=set from=worker to=kafka |
| name | label | 1 | st1-01635: "label the arrow from Lambda to Cache "writes"" gold: action=label label=writes from=lambda to=cache; read: action=label from=lambda to=cache |

**t1_all / all, trigger no request** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 6 | st1-01069: "me" gold: -; read: extra command:create action=create (no requested action on this text)<br>st1-01096: "me" gold: -; read: extra command:create action=create (no requested action on this text)<br>st1-01357: "me" gold: -; read: extra command:create action=create (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:create | 4 | st1-01069: "me" gold: -; read: extra command:create action=create<br>st1-01096: "me" gold: -; read: extra command:create action=create<br>st1-01357: "me" gold: -; read: extra command:create action=create |
| spurious | question:help | 2 | st1-01825: "can" gold: -; read: extra question:help ask=help aspect=can<br>st1-02179: "can" gold: -; read: extra question:help ask=help aspect=can |

### t1_all / all at the cost-10 threshold (0.8588)

Executed: right 1319, wrong 7, extras 0. Structural holds 1 ({"blocked":1}; 0 of them would have been right). Confidence holds 472: right 208, wrong or extra 264. Unread 8.

**Executed wrong, by first cause** (7)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 7 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.880; wrong)<br>st1-00736: "give Ingest a pink border" gold: action=set target=ingest outline=pink; read: command:set action=set outline=indigo target=ingest (confidence 0.917; wrong)<br>st1-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.860; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | target | 3 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1-02299: "erase the small ellipses" gold: action=delete target=mention(quantifier=all,shape=ellipse,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=ellipse) |
| class | outline | 3 | st1-00736: "give Ingest a pink border" gold: action=set target=ingest outline=pink; read: command:set action=set outline=indigo target=ingest<br>st1-01642: "give Y a teal outline" gold: action=set target=y outline=teal; read: command:set action=set outline=cyan target=y<br>st1-02150: "give Krill a purple outline" gold: action=set target=krill outline=purple; read: command:set action=set outline=cyan target=krill |
| class | property | 1 | st1-02022: "what is the border of Ticket9" gold: ask=property property=outline target=ticket9; read: question:property ask=property property=color target=ticket9 |

**Right but held by confidence** (208)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 75 | st1-00026: "add a title "Org chart"" gold: action=create shape=text label=org chart; read: command:create action=create label=org chart shape=text<br>st1-00088: "create a list with Bedroom, Bathroom and Pantry" gold: action=create template=list items=bedroom,bathroom,pantry; read: command:create action=create items=bedroom,bathroom,pantry template=list<br>st1-00129: "make a funnel with 3 stages" gold: action=create template=funnel count=3; read: command:create action=create count=3 template=funnel |
| held | command:set | 57 | st1-00011: "make the links red" gold: action=set kind=edge color=red target=mention(quantifier=all); read: command:set action=set color=red kind=edge target=mention(quantifier=all)<br>st1-00036: "give Kitchen a red border" gold: action=set target=kitchen outline=red; read: command:set action=set outline=red target=kitchen<br>st1-00086: "make Nucleus's border blue" gold: action=set target=nucleus outline=blue; read: command:set action=set outline=blue target=nucleus |
| held | command:move | 33 | st1-00035: "move Keeper left" gold: action=move target=keeper direction=left; read: command:move action=move direction=left target=keeper<br>st1-00155: "move Resistor right quickly" gold: action=move target=resistor direction=right; read: command:move action=move direction=right target=resistor<br>st1-00187: "move Auth left" gold: action=move target=auth direction=left; read: command:move action=move direction=left target=auth |
| held | question:count | 19 | st1-00076: "how many arrows are there for me" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00312: "how many connections are there quickly" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00364: "how many arrows do I have" gold: ask=count kind=edge; read: question:count ask=count kind=edge |
| held | command:snap | 4 | st1-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01598: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:sort | 4 | st1-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all)<br>st1-01489: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | command:groupBy | 4 | st1-00446: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01757: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01804: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all) |
| held | command:distribute | 3 | st1-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all)<br>st1-00809: "spread everything out quickly" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all)<br>st1-01144: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all) |
| held | (5 more keys; all in the JSON) | | |

**Structural holds** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 1 | st1-01635: "label the arrow from Lambda to Cache "writes" for me" gold: action=label label=writes from=lambda to=cache; read: command:label action=label from=lambda to=cache |

## lowercase_other / all (351 messages, 1102 requested: right 810, wrong 252, not done 40, extras 82; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 85 |
| actions | 53 |
| values/roles | 236 |
| calibration | 447 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1102); ok (ungated: right + would-be right of structural holds = right of every request executed: 810); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 252); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 82); ok (ungated: unread = requested - paired: 40); ok (ungated right equals the score file: 808); ok (ungated wrong equals the score file: 244); ok (ungated extras equals the score file: 75); ok (ungated unread equals the score file: 40); ok (ungated structural holds equal the score file: 17); ok (every produced request is executed, structurally held or (gated) confidence-held: 1144); ok (gated: executed wrong equals the score file: 5); ok (gated: executed extras equals the score file: 3); ok (gated: structural holds equal the score file: 17); ok (gated: confidence holds equal the score file: 750); ok (gated: right executed equals the score file: 369); ok (gated: unread equals the score file: 40); ok (gated: held right + held wrong or extra = confidence holds: 750)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 26 | 2 | 0 | 17 | 45 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 40 | 40 |
| 4 wrong act | model (act head) | 37 | 16 | 0 | 0 | 53 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 92 | 5 | 0 | 0 | 97 |
| 6 wrong or missing class value | model (class head) | 26 | 0 | 0 | 0 | 26 |
| 7 wrong words tagged for a name / text key | model (token head) | 100 | 13 | 0 | 0 | 113 |

**lowercase_other / all, trigger seen** (281)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 26 | fo-0027#lc: "shutdown back to off" gold: action=connect from=shutdown to=off; read: action=connect from=error to=error (merged: the unit holds 2 requests)<br>fo-0042#lc: "worker1 and worker2 both feed results" gold: action=connect from=worker1,worker2 to=results; read: not done (lost: no unit on the span)<br>fo-0042#lc: "What's the label on results" gold: ask=property target=results property=label; read: not done (lost: no unit on the span) |
| 4 wrong act | model (act head) | 37 | fo-0027#lc: "check whether ready can reach off" gold: ask=path from=ready to=off; read: not done (read as command:connect)<br>fo-0047#lc: "dashboard I want as star shape" gold: action=set target=dashboard shape=star; read: not done (read as command:create)<br>fo-0047#lc: "dashboard I want as star shape" gold: requested: dashboard I want as star shape; read: extra command:create action=create shape=star (read as command:create where command:set is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 92 | fo-0002#lc: "Move it to the right of api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof (a name written in another request or by a pronoun)<br>fo-0010#lc: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo (a name written in another request or by a pronoun)<br>fo-0010#lc: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 26 | fo-0006#lc: "Please create one small orange square with name Bastion near of subneta" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: action=create color=orange name=bastion shape=square size=small<br>fo-0020#lc: "move transform between extract and load" gold: action=move target=transform position=between anchor=extract,load; read: action=move target=transform<br>fo-0025#lc: "arange raw, staged, curated and mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart template=spiral |
| 7 wrong words tagged for a name / text key | model (token head) | 100 | fo-0004#lc: "connect ingest parse clean and load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect from=parse,clean,load<br>fo-0006#lc: "Is igw bigger than nat" gold: ask=check target=igw comparison=bigger anchor=nat; read: ask=check anchor=nat comparison=bigger target=nat<br>fo-0012#lc: "hook the copies up to alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 6 | fo-0027#lc: "shutdown back to off" gold: action=connect from=shutdown to=off; read: action=connect from=error to=error<br>fo-0042#lc: "worker1 and worker2 both feed results" gold: action=connect from=worker1,worker2 to=results; read: not done<br>fo-0066#lc: "newservice reads from db, connect those too" gold: action=connect from=newservice to=db; read: action=connect from=newservice to=newservice |
| cut | (command:set) | 4 | fo-0125#lc: "gray" gold: action=set target=statusbar color=gray; read: not done<br>fo-0191#lc: "please recolour her" gold: action=set target=aunt color=purple; read: not done<br>fo-0534#lc: "ivy can be a dark navy since it's a climber on the wall, but no, teal reads better" gold: action=set target=ivy color=teal; read: not done |
| cut | (command:resize) | 3 | fo-0043#lc: "make it bold, I mean make it larger" gold: action=resize target=price; read: action=resize<br>fo-0271#lc: "can u make fish a lil bigger" gold: action=resize target=fish; read: action=resize target=algae<br>fo-0328#lc: "The kitchen is too big, shrink it" gold: action=resize target=kitchen; read: action=resize target=bed2 |
| cut | (command:move) | 3 | fo-0055#lc: "edgefw sits between internet and coresw in reality, please move it there" gold: action=move target=edgefw position=between anchor=internet,coresw; read: action=move target=edgefw<br>fo-0333#lc: "bar left of entrance" gold: action=move target=bar position=leftof anchor=entrance; read: action=move anchor=stage position=leftof target=bar<br>fo-0433#lc: "Put returns under dc" gold: action=move target=returns position=below anchor=dc; read: not done |
| cut | (fact:) | 3 | fo-0283#lc: "the tree is already green" gold: target=tree color=green; read: not done<br>fo-0288#lc: "cfo is left of cto" gold: target=cfo position=leftof anchor=cto; read: not done<br>fo-0296#lc: "child2 is under child1" gold: target=child2 position=below anchor=child1; read: not done |
| cut | (question:property) | 2 | fo-0042#lc: "What's the label on results" gold: ask=property target=results property=label; read: not done<br>fo-0221#lc: "where saturn is on this thing" gold: ask=property target=saturn property=position; read: not done |
| cut | (command:arrange) | 2 | fo-0136#lc: "the tasks I want in a column" gold: action=arrange target=taska,taskb,taskc layout=column; read: action=arrange<br>fo-0543#lc: "Put the three days in a column" gold: action=arrange target=day1,day2,day3 layout=column; read: action=arrange layout=column |
| cut | (command:delete) | 1 | fo-0285#lc: "satellite isn't needed, delete it" gold: action=delete target=satellite; read: action=delete target=$new |
| act | command:move read as command:create | 8 | fo-0125#lc: "statusbar at the bottom" gold: action=move target=statusbar position=bottom; read: not done<br>fo-0125#lc: "statusbar at the bottom, gray" gold: requested: statusbar at the bottom; read: extra command:create action=create color=gray name=statusbar position=bottom<br>fo-0272#lc: "mars to the left of earth" gold: action=move target=mars position=leftof anchor=earth; read: not done |
| act | question:degree read as question:neighbors | 4 | fo-0104#lc: "Is rds connected to anything" gold: ask=degree target=rds; read: not done<br>fo-0104#lc: "Is rds connected to anything" gold: requested: Is rds connected to anything; read: extra question:neighbors ask=neighbors target=rds<br>fo-0460#lc: "Is closing linked to anything yet" gold: ask=degree target=closing; read: not done |
| act | question:path read as command:connect | 3 | fo-0027#lc: "check whether ready can reach off" gold: ask=path from=ready to=off; read: not done<br>fo-0076#lc: "Path from topic to alert" gold: ask=path from=topic to=alert; read: not done<br>fo-0076#lc: "Path from topic to alert" gold: requested: Path from topic to alert; read: extra command:connect action=connect from=topic to=alert |
| act | command:set read as command:create | 2 | fo-0047#lc: "dashboard I want as star shape" gold: action=set target=dashboard shape=star; read: not done<br>fo-0047#lc: "dashboard I want as star shape" gold: requested: dashboard I want as star shape; read: extra command:create action=create shape=star |
| act | command:move read as command:toBack | 2 | fo-0062#lc: "put apigw under cloudfront" gold: action=move target=apigw position=below anchor=cloudfront; read: not done<br>fo-0062#lc: "put apigw under cloudfront" gold: requested: put apigw under cloudfront; read: extra command:toBack action=toback target=dynamo |
| act | command:set read as fact: | 2 | fo-0147#lc: "Color for connected is green" gold: action=set target=connected color=green; read: not done<br>fo-0147#lc: "Color for connected is green" gold: requested: Color for connected is green; read: extra fact: color=green target=connected |
| act | question:connected read as question:help | 2 | fo-0222#lc: "what about zooplankton and tuna" gold: ask=connected target=tuna anchor=zooplankton; read: not done<br>fo-0222#lc: "what about zooplankton and tuna" gold: requested: what about zooplankton and tuna; read: extra question:help ask=help |
| act | fact: read as command:set | 2 | fo-0275#lc: "fog is an ellipse" gold: target=fog shape=ellipse; read: not done<br>fo-0275#lc: "fog is an ellipse, not a circle" gold: requested: fog is an ellipse; read: extra command:set action=set shape=ellipse target=fog |
| ref | target | 62 | fo-0002#lc: "Move it to the right of api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof<br>fo-0010#lc: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo<br>fo-0010#lc: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo |
| ref | to | 11 | fo-0020#lc: "disconnect them" gold: action=disconnect from=audit to=load; read: action=disconnect from=audit to=audit<br>fo-0035#lc: "Same for spine2" gold: action=connect from=spine2 to=leaf1,leaf2,leaf3,leaf4; read: action=connect from=spine2<br>fo-0055#lc: "Connect coresw to each of them" gold: action=connect from=coresw to=vlan10,vlan20,vlan30; read: action=connect |
| ref | from | 11 | fo-0025#lc: "conect them each to the next" gold: action=connect from=raw,staged,curated,mart; read: action=connect pairing=next<br>fo-0035#lc: "disconnect it from spine1 and spine2" gold: action=disconnect from=leaf4 to=spine1,spine2; read: action=disconnect to=spine1,spine2<br>fo-0076#lc: "All three consumers -> aggregator" gold: action=connect from=consumer1,consumer2,consumer3 to=aggregator; read: action=connect |
| ref | anchor | 10 | fo-0168#lc: "put grandma above both of them" gold: action=move target=grandma position=above anchor=mom,uncle; read: action=move anchor=mom position=above target=mom<br>fo-0190#lc: "move it there" gold: action=move target=frog position=rightof anchor=grasshopper; read: action=move anchor=frog position=below target=frog<br>fo-0192#lc: "what's farthest from it" gold: ask=nearest anchor=earth superlative=farthest; read: ask=nearest superlative=farthest |
| class | position | 8 | fo-0006#lc: "Please create one small orange square with name Bastion near of subneta" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: action=create color=orange name=bastion shape=square size=small<br>fo-0020#lc: "move transform between extract and load" gold: action=move target=transform position=between anchor=extract,load; read: action=move target=transform<br>fo-0065#lc: "Move palette left of canvas" gold: action=move target=palette position=leftof anchor=canvas; read: action=move position=left target=palette |
| class | target | 6 | fo-0032#lc: "All rectangles should be orange. Actually only eks and ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange shape=rectangle target=mention(shape=rectangle)<br>fo-0184#lc: "move cells above brain" gold: action=move target=cells position=above anchor=brain; read: action=move anchor=brain position=above target=mention(quantifier=all)<br>fo-0346#lc: "Make everything that isn't red gray" gold: action=set target=mention(notcolor=red,quantifier=all) color=gray; read: action=set color=gray target=mention(notcolor=gray,quantifier=all) |
| class | shape | 6 | fo-0087#lc: "I want wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake<br>fo-0214#lc: "I want all circles to be small by default, from now on" gold: shape=circle size=small; read: size=small<br>fo-0329#lc: "If not, add one near customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=$new position=near |
| class | to | 3 | fo-0257#lc: "Is there a path from greatgrandma all the way down to me" gold: ask=path from=greatgrandma to=me; read: ask=path to=mention()<br>fo-0525#lc: "arrow from dog to ball" gold: action=connect from=dog to=ball; read: action=connect from=dog to=mention()<br>fo-0525#lc: "another from kid to ball" gold: action=connect from=kid to=ball; read: action=connect from=kid to=mention() |
| class | color | 3 | fo-0329#lc: "If not, add one near customs" gold: action=create shape=triangle color=red position=near anchor=customs; read: action=create anchor=$new position=near<br>fo-0403#lc: "Make it gray. No, orange. Fine, gray" gold: action=set target=$new color=gray; read: action=set color=orange target=$new<br>fo-0495#lc: "And a second one near inn, same color" gold: action=create shape=star color=purple position=near anchor=inn; read: action=create anchor=inn position=near |
| class | layout | 1 | fo-0025#lc: "arange raw, staged, curated and mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart template=spiral |
| class | from | 1 | fo-0045#lc: "halfopen back to closed" gold: action=connect from=halfopen to=closed; read: action=connect from=mention() to=closed |
| class | superlative | 1 | fo-0572#lc: "the stage with the fewest connections, which one is it" gold: ask=extreme superlative=leastconnected; read: ask=extreme superlative=smallest |
| name | target | 45 | fo-0006#lc: "Is igw bigger than nat" gold: ask=check target=igw comparison=bigger anchor=nat; read: ask=check anchor=nat comparison=bigger target=nat<br>fo-0013#lc: "archived should be gray and small" gold: action=set target=archived color=gray size=small; read: action=set color=gray size=small target=rejected<br>fo-0034#lc: "line svc1 svc2 and svc3 up verticaly" gold: action=align target=svc1,svc2,svc3 axis=vertical; read: action=align axis=vertical target=svc1,svc3 |
| name | from | 32 | fo-0004#lc: "connect ingest parse clean and load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect from=parse,clean,load<br>fo-0012#lc: "hook the copies up to alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0013#lc: "published goes to archived" gold: action=connect from=published to=archived; read: action=connect from=rejected to=archived |
| name | to | 21 | fo-0013#lc: "Add one from review to published" gold: action=connect from=review to=published; read: action=connect from=review<br>fo-0052#lc: "Connect scheduler to worker and the copies" gold: action=connect from=scheduler to=worker,$new; read: action=connect from=scheduler to=worker<br>fo-0062#lc: "connect users to apigw with a dashed arrow" gold: action=connect from=users to=apigw style=dashed; read: action=connect from=dynamo style=dashed to=dynamo |
| name | anchor | 9 | fo-0062#lc: "is users connected to apigw" gold: ask=connected target=apigw anchor=users; read: ask=connected anchor=dynamo target=dynamo<br>fo-0125#lc: "Which shape is nearest to closebtn" gold: ask=nearest anchor=closebtn superlative=closest; read: ask=nearest anchor=window superlative=closest<br>fo-0129#lc: "add a yelow triangle called Jammed betwen locked and unlocked" gold: action=create shape=triangle color=yellow name=jammed position=between anchor=locked,unlocked; read: action=create anchor=locked color=yellow name=jammed position=between shape=triangle |
| name | name | 1 | fo-0049#lc: "Add a white square named Pc1 next to router. Wait, call it Laptop, not Pc1" gold: action=create shape=square color=white name=laptop position=near anchor=router; read: action=create anchor=router color=white name=pc1 position=near shape=square |
| name | count | 1 | fo-0467#lc: "Add two small yellow circles called... no, just two small yellow circles near parking" gold: action=create shape=circle color=yellow size=small count=2 position=near anchor=parking; read: action=create anchor=parking color=yellow position=near shape=circle size=small |
| cut | (2 more keys; all in the JSON) | | |
| act | (7 more keys; all in the JSON) | | |

**lowercase_other / all, trigger unseen** (36)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 2 | fo-0104#lc: "did I make igw a circle" gold: ask=check target=igw shape=circle; read: not done (lost: no unit on the span)<br>fo-0534#lc: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: not done (lost: no unit on the span) |
| 4 wrong act | model (act head) | 16 | fo-0184#lc: "genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: not done (read as command:create)<br>fo-0184#lc: "plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done (read as command:label)<br>fo-0184#lc: "genes to the right of it" gold: requested: genes to the right of it; read: extra command:create action=create anchor=mention() name=genes position=rightof (read as command:create where command:move is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 5 | fo-0076#lc: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers (a name written in another request or by a pronoun)<br>fo-0113#lc: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple (a name written in another request or by a pronoun)<br>fo-0144#lc: "I want broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2 (a name written in another request or by a pronoun) |
| 7 wrong words tagged for a name / text key | model (token head) | 13 | fo-0092#lc: "redis teal, no, cyan" gold: action=set target=redis color=cyan; read: action=set color=cyan<br>fo-0104#lc: "privatesubnet blue" gold: action=set target=privatesubnet color=blue; read: action=set color=blue target=publicsubnet<br>fo-0107#lc: "thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (question:check) | 1 | fo-0104#lc: "did I make igw a circle" gold: ask=check target=igw shape=circle; read: not done |
| cut | (command:move) | 1 | fo-0534#lc: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: not done |
| act | question:degree read as question:count | 4 | fo-0335#lc: "How many shapes are connected to score" gold: ask=degree target=score; read: not done<br>fo-0335#lc: "How many shapes are connected to score" gold: requested: How many shapes are connected to score; read: extra question:count ask=count linked=score<br>fo-0462#lc: "How many shapes are connected to coding" gold: ask=degree target=coding; read: not done |
| act | question:extreme read as question:check | 4 | fo-0554#lc: "Is Teardown the last one on the right" gold: ask=extreme superlative=rightmost; read: not done<br>fo-0554#lc: "Is Teardown the last one on the right" gold: requested: Is Teardown the last one on the right; read: extra question:check ask=check position=right<br>fo-0594#lc: "Is Scene4 the last one at the bottom" gold: ask=extreme superlative=bottommost; read: not done |
| act | command:move read as command:create | 2 | fo-0184#lc: "genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: not done<br>fo-0184#lc: "genes to the right of it" gold: requested: genes to the right of it; read: extra command:create action=create anchor=mention() name=genes position=rightof |
| act | command:move read as command:label | 2 | fo-0184#lc: "plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done<br>fo-0184#lc: "plants belwo it" gold: requested: plants belwo it; read: extra command:label action=label target=$new |
| act | command:set read as command:create | 2 | fo-0397#lc: "pay a diamond" gold: action=set target=pay shape=diamond; read: not done<br>fo-0397#lc: "pay a diamond" gold: requested: pay a diamond; read: extra command:create action=create shape=diamond |
| act | question:degree read as command:connect | 2 | fo-0564#lc: "Does out have three arrows coming in" gold: ask=degree target=out; read: not done<br>fo-0564#lc: "Does out have three arrows coming in" gold: requested: Does out have three arrows coming in; read: extra command:connect action=connect |
| ref | anchor | 3 | fo-0144#lc: "I want broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2<br>fo-0184#lc: "body to the left of it" gold: action=move target=body position=leftof anchor=brain; read: action=move anchor=$new position=leftof target=body<br>fo-0217#lc: "an orange one named Music above it" gold: action=create shape=star color=orange name=music position=above anchor=party; read: action=create anchor=$new color=orange name=music position=above shape=ellipse |
| ref | target | 2 | fo-0076#lc: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers<br>fo-0113#lc: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple |
| name | target | 11 | fo-0092#lc: "redis teal, no, cyan" gold: action=set target=redis color=cyan; read: action=set color=cyan<br>fo-0104#lc: "privatesubnet blue" gold: action=set target=privatesubnet color=blue; read: action=set color=blue target=publicsubnet<br>fo-0107#lc: "thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: action=duplicate count=3 |
| name | from | 2 | fo-0502#lc: "Then price feeds back into policy and policy into climate" gold: action=connect from=price,policy,climate; read: action=connect from=$new pairing=chain<br>fo-0552#lc: "is there any way from yeast to cool" gold: ask=path from=yeast to=cool; read: ask=path |
| name | to | 1 | fo-0552#lc: "is there any way from yeast to cool" gold: ask=path from=yeast to=cool; read: ask=path |

**lowercase_other / all, trigger no request** (57)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 17 | fo-0055#lc: "edgefw sits between internet and" gold: -; read: extra fact: anchor=internet position=between target=edgefw (partial overlap with a requested action: 44% of it)<br>fo-0147#lc: "ended is red" gold: -; read: extra fact: color=red target=ended (partial overlap with a requested action: 28% of it)<br>fo-0160#lc: "Earth comes" gold: -; read: extra command:connect action=connect (partial overlap with a requested action: 15% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 40 | fo-0047#lc: "Please" gold: -; read: extra command:create action=create (no requested action on this text)<br>fo-0118#lc: "Undo that if it looks bad" gold: -; read: extra command:undo action=undo (no requested action on this text)<br>fo-0147#lc: "Also" gold: -; read: extra command:create action=create (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 8 | fo-0191#lc: "her" gold: -; read: extra command:create action=create<br>fo-0264#lc: "Could" gold: -; read: extra command:create action=create<br>fo-0305#lc: "now" gold: -; read: extra command:create action=create |
| cut | question:help | 3 | fo-0174#lc: "can" gold: -; read: extra question:help ask=help aspect=can<br>fo-0204#lc: "can you" gold: -; read: extra question:help ask=help<br>fo-0237#lc: "can" gold: -; read: extra question:help ask=help aspect=can |
| cut | fact: | 2 | fo-0055#lc: "edgefw sits between internet and" gold: -; read: extra fact: anchor=internet position=between target=edgefw<br>fo-0147#lc: "ended is red" gold: -; read: extra fact: color=red target=ended |
| cut | command:label | 2 | fo-0334#lc: "'" gold: -; read: extra command:label action=label<br>fo-0502#lc: "yield drives price" gold: -; read: extra command:label action=label to=price |
| cut | command:connect | 1 | fo-0160#lc: "Earth comes" gold: -; read: extra command:connect action=connect |
| cut | command:disconnect | 1 | fo-0504#lc: "it isn't one" gold: -; read: extra command:disconnect action=disconnect from=gate to=gate |
| spurious | command:create | 12 | fo-0047#lc: "Please" gold: -; read: extra command:create action=create<br>fo-0147#lc: "Also" gold: -; read: extra command:create action=create<br>fo-0250#lc: "Then" gold: -; read: extra command:create action=create |
| spurious | command:connect | 6 | fo-0156#lc: "pointing down" gold: -; read: extra command:connect action=connect<br>fo-0190#lc: "to" gold: -; read: extra command:connect action=connect from=frog to=frog<br>fo-0190#lc: "Grass then Grasshopper then Frog" gold: -; read: extra command:connect action=connect from=grass,grasshopper,frog |
| spurious | command:set | 5 | fo-0156#lc: "Both should be" gold: -; read: extra command:set action=set<br>fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body<br>fo-0217#lc: "Music should be a star" gold: -; read: extra command:set action=set shape=star target=$new |
| spurious | command:move | 5 | fo-0168#lc: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0264#lc: "Weather is in the middle already" gold: -; read: extra command:move action=move position=center target=weather<br>fo-0288#lc: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance |
| spurious | command:label | 3 | fo-0215#lc: "Bear and Wolf" gold: -; read: extra command:label action=label target=bear,wolf<br>fo-0246#lc: "Cow" gold: -; read: extra command:label action=label target=cow<br>fo-0375#lc: "'t" gold: -; read: extra command:label action=label from=auditor to=auditor |
| spurious | fact: | 2 | fo-0210#lc: "Director is the top box" gold: -; read: extra fact: position=top target=director<br>fo-0375#lc: "Packer and Shipper are hexagons" gold: -; read: extra fact: shape=hexagon target=packer,shipper |
| spurious | command:undo | 1 | fo-0118#lc: "Undo that if it looks bad" gold: -; read: extra command:undo action=undo |
| spurious | question:cycle | 1 | fo-0147#lc: "make a cycle" gold: -; read: extra question:cycle ask=cycle |
| spurious | (5 more keys; all in the JSON) | | |

### lowercase_other / all at the cost-10 threshold (0.8588)

Executed: right 369, wrong 5, extras 3. Structural holds 17 ({"blocked":10,"dependency":7}; 2 of them would have been right). Confidence holds 750: right 439, wrong or extra 311. Unread 40.

**Executed wrong, by first cause** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 2 | fo-0168#lc: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom (confidence 0.865; extra)<br>fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body (confidence 0.955; extra) |
| 4 wrong act | model (act head) | 1 | fo-0125#lc: "statusbar at the bottom, gray" gold: -; read: extra command:create action=create color=gray name=statusbar position=bottom (confidence 0.863; extra) |
| 6 wrong or missing class value | model (class head) | 2 | fo-0291#lc: "draw a blue square called Dog next to me" gold: action=create shape=square color=blue name=dog position=near anchor=me; read: command:create action=create color=blue name=dog shape=square (confidence 0.875; wrong)<br>fo-0435#lc: "Label the diamond "invalid input"" gold: action=label target=$new label=invalid input; read: command:label action=label label=invalid input target=mention(shape=diamond) (confidence 0.959; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 3 | fo-0032#lc: "iam gets a dotted line to eks" gold: action=connect from=iam to=eks style=dotted arrow=none; read: command:connect action=connect arrow=none style=dotted to=eks (confidence 0.892; wrong)<br>fo-0125#lc: "Is statusbar below body" gold: ask=check target=statusbar position=below anchor=body; read: question:check ask=check anchor=body position=below target=$new (confidence 0.994; wrong)<br>fo-0173#lc: "is me connected to dad" gold: ask=connected target=dad anchor=me; read: question:connected ask=connected anchor=dad (confidence 0.862; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:move | 1 | fo-0168#lc: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom |
| spurious | command:set | 1 | fo-0184#lc: "Body red" gold: -; read: extra command:set action=set color=red target=body |
| act | command:move read as command:create | 1 | fo-0125#lc: "statusbar at the bottom, gray" gold: -; read: extra command:create action=create color=gray name=statusbar position=bottom |
| class | position | 1 | fo-0291#lc: "draw a blue square called Dog next to me" gold: action=create shape=square color=blue name=dog position=near anchor=me; read: command:create action=create color=blue name=dog shape=square |
| class | target | 1 | fo-0435#lc: "Label the diamond "invalid input"" gold: action=label target=$new label=invalid input; read: command:label action=label label=invalid input target=mention(shape=diamond) |
| name | target | 2 | fo-0125#lc: "Is statusbar below body" gold: ask=check target=statusbar position=below anchor=body; read: question:check ask=check anchor=body position=below target=$new<br>fo-0173#lc: "is me connected to dad" gold: ask=connected target=dad anchor=me; read: question:connected ask=connected anchor=dad |
| name | from | 1 | fo-0032#lc: "iam gets a dotted line to eks" gold: action=connect from=iam to=eks style=dotted arrow=none; read: command:connect action=connect arrow=none style=dotted to=eks |
| name | anchor | 1 | fo-0173#lc: "is me connected to dad" gold: ask=connected target=dad anchor=me; read: question:connected ask=connected anchor=dad |

**Right but held by confidence** (439)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:connect | 106 | fo-0003#lc: "paused should go back to running too" gold: action=connect from=paused to=running; read: command:connect action=connect from=paused to=running<br>fo-0004#lc: "connect clean to Dlq with a dotted line" gold: action=connect from=clean to=$new style=dotted arrow=none; read: command:connect action=connect arrow=none from=clean style=dotted to=$new<br>fo-0006#lc: "connect Bastion to nat with arrow" gold: action=connect from=$new to=nat; read: command:connect action=connect from=$new to=nat |
| held | command:set | 62 | fo-0004#lc: "make it a navy ellipse" gold: action=set target=warehouse color=navy shape=ellipse; read: command:set action=set color=navy shape=ellipse target=warehouse<br>fo-0010#lc: "footer: gray" gold: action=set target=footer color=gray; read: command:set action=set color=gray target=footer<br>fo-0013#lc: "Make rejected a red octagon... ok no octagons, a red hexagon then" gold: action=set target=rejected color=red shape=hexagon; read: command:set action=set color=red shape=hexagon target=rejected |
| held | command:create | 45 | fo-0001#lc: "put a gray hexagon called Switch between fw1 and lan" gold: action=create shape=hexagon color=gray name=switch position=between anchor=fw1,lan; read: command:create action=create anchor=fw1,lan color=gray name=switch position=between shape=hexagon<br>fo-0004#lc: "add a small red diamond called Dlq below clean" gold: action=create shape=diamond color=red size=small name=dlq position=below anchor=clean; read: command:create action=create anchor=clean color=red name=dlq position=below shape=diamond size=small<br>fo-0031#lc: "add 4 small rectangles below results" gold: action=create shape=rectangle size=small count=4 position=below anchor=results; read: command:create action=create anchor=results count=4 position=below shape=rectangle size=small |
| held | command:move | 39 | fo-0020#lc: "in the bottom right" gold: action=move target=audit position=bottomright; read: command:move action=move position=bottomright target=audit<br>fo-0032#lc: "move alb left of eks" gold: action=move target=alb position=leftof anchor=eks; read: command:move action=move anchor=eks position=leftof target=alb<br>fo-0035#lc: "spine1 and spine2 go to the top" gold: action=move target=spine1,spine2 position=top; read: command:move action=move position=top target=spine1,spine2 |
| held | question:count | 30 | fo-0004#lc: "how many rectangles are there right now" gold: ask=count shape=rectangle; read: question:count ask=count shape=rectangle<br>fo-0035#lc: "How many connections in total now" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>fo-0047#lc: "How many circles we have" gold: ask=count shape=circle; read: question:count ask=count shape=circle |
| held | command:arrange | 25 | fo-0004#lc: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all,shape=rectangle)<br>fo-0010#lc: "card1, card2 and card3 should sit in a row" gold: action=arrange target=card1,card2,card3 layout=row; read: command:arrange action=arrange layout=row target=card1,card2,card3<br>fo-0031#lc: "put them in a row" gold: action=arrange target=$new layout=row; read: command:arrange action=arrange layout=row target=$new |
| held | question:property | 19 | fo-0012#lc: "What colour is rds right now" gold: ask=property target=rds property=color; read: question:property ask=property property=color target=rds<br>fo-0149#lc: "can you tell me what color sidebar is" gold: ask=property target=sidebar property=color; read: question:property ask=property property=color target=sidebar<br>fo-0191#lc: "what colour is aunt" gold: ask=property target=aunt property=color; read: question:property ask=property property=color target=aunt |
| held | question:check | 14 | fo-0032#lc: "Is ecr smaller than eks" gold: ask=check target=ecr comparison=smaller anchor=eks; read: question:check ask=check anchor=eks comparison=smaller target=ecr<br>fo-0083#lc: "Is cta bigger than heroimg" gold: ask=check target=cta comparison=bigger anchor=heroimg; read: question:check ask=check anchor=heroimg comparison=bigger target=cta<br>fo-0096#lc: "Is cache teal" gold: ask=check target=cache color=teal; read: question:check ask=check color=teal target=cache |
| held | (26 more keys; all in the JSON) | | |

**Structural holds** (17)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 9 | fo-0013#lc: "published goes to archived later on" gold: action=connect from=published to=archived; read: command:connect action=connect from=rejected to=archived<br>fo-0100#lc: "add a small red diamond caled Reject below parser" gold: action=create shape=diamond color=red size=small name=reject position=below anchor=parser; read: command:create action=create anchor=parser color=red name=reject position=below shape=diamond size=small<br>fo-0184#lc: "plants belwo it" gold: -; read: command:label action=label target=$new |
| blocked | unresolved-reference | 1 | fo-0062#lc: "apigw goes to lambda goes to dynamo" gold: action=connect from=apigw,lambda,dynamo; read: command:connect action=connect pairing=chain |

## t1s / all (1791 messages, 1791 requested: right 1525, wrong 258, not done 8, extras 14; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 6 |
| actions | 16 |
| values/roles | 258 |
| calibration | 218 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1791); ok (ungated: right + would-be right of structural holds = right of every request executed: 1525); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 258); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 14); ok (ungated: unread = requested - paired: 8); ok (ungated right equals the score file: 1525); ok (ungated wrong equals the score file: 257); ok (ungated extras equals the score file: 14); ok (ungated unread equals the score file: 8); ok (ungated structural holds equal the score file: 1); ok (every produced request is executed, structurally held or (gated) confidence-held: 1797); ok (gated: executed wrong equals the score file: 7); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 1); ok (gated: confidence holds equal the score file: 475); ok (gated: right executed equals the score file: 1314); ok (gated: unread equals the score file: 8); ok (gated: held right + held wrong or extra = confidence holds: 475)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 6 | 6 |
| 4 wrong act | model (act head) | 16 | 0 | 0 | 0 | 16 |
| 6 wrong or missing class value | model (class head) | 257 | 0 | 0 | 0 | 257 |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | 0 | 0 | 0 | 1 |

**t1s / all, trigger seen** (274)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 16 | st1-00545: "create a timeline with 3 steps" gold: action=create template=timeline count=3; read: not done (read as command:arrange)<br>st1-00545: "create a timeline with 3 steps" gold: requested: create a timeline with 3 steps; read: extra command:arrange action=arrange template=timeline (read as command:arrange where command:create is requested)<br>st1-00784: "draw a timeline with 5 steps" gold: action=create template=timeline count=5; read: not done (read as command:arrange) |
| 6 wrong or missing class value | model (class head) | 257 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set outline=cyan target=sales<br>st1-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | st1-01635: "label the arrow from Lambda to Cache "writes"" gold: action=label label=writes from=lambda to=cache; read: action=label from=lambda to=cache |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:create read as command:arrange | 16 | st1-00545: "create a timeline with 3 steps" gold: action=create template=timeline count=3; read: not done<br>st1-00545: "create a timeline with 3 steps" gold: requested: create a timeline with 3 steps; read: extra command:arrange action=arrange template=timeline<br>st1-00784: "draw a timeline with 5 steps" gold: action=create template=timeline count=5; read: not done |
| class | outline | 124 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set outline=cyan target=sales<br>st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create outline=navy shape=rectangle |
| class | property | 69 | st1-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused<br>st1-00068: "what is the border of Error" gold: ask=property property=outline target=error; read: ask=property target=error<br>st1-00118: "what's the border color of Waiting" gold: ask=property property=outline target=waiting; read: ask=property property=color target=waiting |
| class | target | 51 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown size=tiny target=mention(quantifier=all,shape=hexagon) |
| class | color | 26 | st1-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create outline=navy shape=rectangle<br>st1-00138: "add a gold ellipse with a cyan outline" gold: action=create shape=ellipse color=gold outline=cyan; read: action=create shape=ellipse<br>st1-00228: "make a pink triangle with a lime outline" gold: action=create shape=triangle color=pink outline=lime; read: action=create shape=triangle |
| class | size | 9 | st1-00050: "how many huge ellipses are there" gold: ask=count shape=ellipse size=huge; read: ask=count shape=ellipse<br>st1-00496: "how many huge rectangles are there" gold: ask=count shape=rectangle size=huge; read: ask=count shape=rectangle<br>st1-00614: "how many giant triangles are there" gold: ask=count shape=triangle size=huge; read: ask=count shape=triangle |
| class | direction | 2 | st1-00731: "move Nas left" gold: action=move target=nas direction=left; read: action=move target=nas<br>st1-00915: "move Header right" gold: action=move target=header direction=right; read: action=move position=right target=header |
| class | style | 1 | st1-01012: "make the arrow from Worker to Kafka solid" gold: action=set from=worker to=kafka style=solid; read: action=set from=worker to=kafka |
| name | label | 1 | st1-01635: "label the arrow from Lambda to Cache "writes"" gold: action=label label=writes from=lambda to=cache; read: action=label from=lambda to=cache |

**t1s / all, trigger no request** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 6 | st1-01069: "me" gold: -; read: extra command:create action=create (no requested action on this text)<br>st1-01096: "me" gold: -; read: extra command:create action=create (no requested action on this text)<br>st1-01357: "me" gold: -; read: extra command:create action=create (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:create | 4 | st1-01069: "me" gold: -; read: extra command:create action=create<br>st1-01096: "me" gold: -; read: extra command:create action=create<br>st1-01357: "me" gold: -; read: extra command:create action=create |
| spurious | question:help | 2 | st1-01825: "can" gold: -; read: extra question:help ask=help aspect=can<br>st1-02179: "can" gold: -; read: extra question:help ask=help aspect=can |

### t1s / all at the cost-10 threshold (0.8588)

Executed: right 1314, wrong 7, extras 0. Structural holds 1 ({"blocked":1}; 0 of them would have been right). Confidence holds 475: right 211, wrong or extra 264. Unread 8.

**Executed wrong, by first cause** (7)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 7 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.880; wrong)<br>st1-00736: "give Ingest a pink border" gold: action=set target=ingest outline=pink; read: command:set action=set outline=indigo target=ingest (confidence 0.917; wrong)<br>st1-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.860; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | target | 3 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1-02299: "erase the small ellipses" gold: action=delete target=mention(quantifier=all,shape=ellipse,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=ellipse) |
| class | outline | 3 | st1-00736: "give Ingest a pink border" gold: action=set target=ingest outline=pink; read: command:set action=set outline=indigo target=ingest<br>st1-01642: "give Y a teal outline" gold: action=set target=y outline=teal; read: command:set action=set outline=cyan target=y<br>st1-02150: "give Krill a purple outline" gold: action=set target=krill outline=purple; read: command:set action=set outline=cyan target=krill |
| class | property | 1 | st1-02022: "what is the border of Ticket9" gold: ask=property property=outline target=ticket9; read: question:property ask=property property=color target=ticket9 |

**Right but held by confidence** (211)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 76 | st1-00026: "add a title "Org chart"" gold: action=create shape=text label=org chart; read: command:create action=create label=org chart shape=text<br>st1-00071: "add a lime triangle" gold: action=create shape=triangle color=lime; read: command:create action=create color=lime shape=triangle<br>st1-00088: "create a list with Bedroom, Bathroom and Pantry" gold: action=create template=list items=bedroom,bathroom,pantry; read: command:create action=create items=bedroom,bathroom,pantry template=list |
| held | command:set | 57 | st1-00011: "make the links red" gold: action=set kind=edge color=red target=mention(quantifier=all); read: command:set action=set color=red kind=edge target=mention(quantifier=all)<br>st1-00036: "give Kitchen a red border" gold: action=set target=kitchen outline=red; read: command:set action=set outline=red target=kitchen<br>st1-00086: "make Nucleus's border blue" gold: action=set target=nucleus outline=blue; read: command:set action=set outline=blue target=nucleus |
| held | command:move | 35 | st1-00035: "move Keeper left" gold: action=move target=keeper direction=left; read: command:move action=move direction=left target=keeper<br>st1-00155: "move Resistor right quickly" gold: action=move target=resistor direction=right; read: command:move action=move direction=right target=resistor<br>st1-00187: "move Auth left" gold: action=move target=auth direction=left; read: command:move action=move direction=left target=auth |
| held | question:count | 19 | st1-00076: "how many arrows are there for me" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00312: "how many connections are there quickly" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00364: "how many arrows do I have" gold: ask=count kind=edge; read: question:count ask=count kind=edge |
| held | command:snap | 4 | st1-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1-01598: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:sort | 4 | st1-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all)<br>st1-01489: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | command:groupBy | 4 | st1-00446: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01757: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1-01804: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all) |
| held | command:distribute | 3 | st1-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all)<br>st1-00809: "spread everything out quickly" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all)<br>st1-01144: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: command:distribute action=distribute target=mention(quantifier=all) |
| held | (5 more keys; all in the JSON) | | |

**Structural holds** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 1 | st1-01635: "label the arrow from Lambda to Cache "writes" for me" gold: action=label label=writes from=lambda to=cache; read: command:label action=label from=lambda to=cache |

## t1raw / all (70 messages, 70 requested: right 65, wrong 5, not done 0, extras 0; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 0 |
| values/roles | 5 |
| calibration | 10 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 70); ok (ungated: right + would-be right of structural holds = right of every request executed: 65); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 5); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 0); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 65); ok (ungated wrong equals the score file: 4); ok (ungated extras equals the score file: 0); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 1); ok (every produced request is executed, structurally held or (gated) confidence-held: 70); ok (gated: executed wrong equals the score file: 0); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 1); ok (gated: confidence holds equal the score file: 14); ok (gated: right executed equals the score file: 55); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 14)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 6 wrong or missing class value | model (class head) | 4 | 0 | 0 | 0 | 4 |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | 0 | 0 | 0 | 1 |

**t1raw / all, trigger seen** (5)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 4 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=brown shape=square<br>st1-01174: "move the small stars right" gold: action=move target=mention(quantifier=all,shape=star,size=small) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=star)<br>st1-01772: "make the tiny squares gold" gold: action=set target=mention(quantifier=all,shape=square,size=tiny) color=gold; read: action=set color=gold target=mention(quantifier=all,shape=square) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | st1-01635: "label the arrow from Lambda to Cache "writes"" gold: action=label label=writes from=lambda to=cache; read: action=label from=lambda to=cache |

| cause | key | n | examples |
|---|---|---:|---|
| class | target | 3 | st1-01174: "move the small stars right" gold: action=move target=mention(quantifier=all,shape=star,size=small) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=star)<br>st1-01772: "make the tiny squares gold" gold: action=set target=mention(quantifier=all,shape=square,size=tiny) color=gold; read: action=set color=gold target=mention(quantifier=all,shape=square)<br>st1-02155: "move the big ellipses right" gold: action=move target=mention(quantifier=all,shape=ellipse,size=large) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=ellipse) |
| class | outline | 1 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=brown shape=square |
| name | label | 1 | st1-01635: "label the arrow from Lambda to Cache "writes"" gold: action=label label=writes from=lambda to=cache; read: action=label from=lambda to=cache |

### t1raw / all at the cost-10 threshold (0.8588)

Executed: right 55, wrong 0, extras 0. Structural holds 1 ({"blocked":1}; 0 of them would have been right). Confidence holds 14: right 10, wrong or extra 4. Unread 0.

**Executed wrong, by first cause** (0)

none

**Right but held by confidence** (10)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 4 | st1-00236: "add a caption "Home lab"" gold: action=create shape=text label=home lab; read: command:create action=create label=home lab shape=text<br>st1-00325: "add a blue star for me" gold: action=create shape=star color=blue; read: command:create action=create color=blue shape=star<br>st1-00772: "create a list of Epilogue, Hero, Villain, Scene2 and Climax" gold: action=create template=list items=epilogue,hero,villain,scene2,climax; read: command:create action=create items=epilogue,hero,villain,scene2,climax template=list |
| held | command:move | 3 | st1-00035: "move Keeper left" gold: action=move target=keeper direction=left; read: command:move action=move direction=left target=keeper<br>st1-00613: "alright, move Garage left" gold: action=move target=garage direction=left; read: command:move action=move direction=left target=garage<br>st1-01055: "move H left" gold: action=move target=h direction=left; read: command:move action=move direction=left target=h |
| held | command:set | 2 | st1-00011: "make the links red" gold: action=set kind=edge color=red target=mention(quantifier=all); read: command:set action=set color=red kind=edge target=mention(quantifier=all)<br>st1-01736: "make all the lines dashed" gold: action=set kind=edge style=dashed target=mention(quantifier=all); read: command:set action=set kind=edge style=dashed target=mention(quantifier=all) |
| held | command:fit | 1 | st1-01699: "fit the diagram to the screen" gold: action=fit target=mention(quantifier=all); read: command:fit action=fit target=mention(quantifier=all) |

**Structural holds** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 1 | st1-01635: "label the arrow from Lambda to Cache "writes" for me" gold: action=label label=writes from=lambda to=cache; read: command:label action=label from=lambda to=cache |

## t1bs / all (1528 messages, 1528 requested: right 1275, wrong 247, not done 6, extras 6; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 12 |
| values/roles | 247 |
| calibration | 125 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1528); ok (ungated: right + would-be right of structural holds = right of every request executed: 1275); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 247); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 6); ok (ungated: unread = requested - paired: 6); ok (ungated right equals the score file: 1275); ok (ungated wrong equals the score file: 247); ok (ungated extras equals the score file: 6); ok (ungated unread equals the score file: 6); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 1528); ok (gated: executed wrong equals the score file: 2); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 374); ok (gated: right executed equals the score file: 1152); ok (gated: unread equals the score file: 6); ok (gated: held right + held wrong or extra = confidence holds: 374)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 4 wrong act | model (act head) | 12 | 0 | 0 | 0 | 12 |
| 6 wrong or missing class value | model (class head) | 247 | 0 | 0 | 0 | 247 |

**t1bs / all, trigger seen** (259)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 12 | st1b-00545: "create a timeline with 3 steps" gold: action=create template=timeline count=3; read: not done (read as command:arrange)<br>st1b-00545: "create a timeline with 3 steps" gold: requested: create a timeline with 3 steps; read: extra command:arrange action=arrange template=timeline (read as command:arrange where command:create is requested)<br>st1b-00784: "draw a timeline with 5 steps" gold: action=create template=timeline count=5; read: not done (read as command:arrange) |
| 6 wrong or missing class value | model (class head) | 247 | st1b-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1b-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set outline=cyan target=sales<br>st1b-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:create read as command:arrange | 12 | st1b-00545: "create a timeline with 3 steps" gold: action=create template=timeline count=3; read: not done<br>st1b-00545: "create a timeline with 3 steps" gold: requested: create a timeline with 3 steps; read: extra command:arrange action=arrange template=timeline<br>st1b-00784: "draw a timeline with 5 steps" gold: action=create template=timeline count=5; read: not done |
| class | outline | 123 | st1b-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1b-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set outline=cyan target=sales<br>st1b-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create outline=navy shape=rectangle |
| class | property | 68 | st1b-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused<br>st1b-00068: "what is the border of Error" gold: ask=property property=outline target=error; read: ask=property target=error<br>st1b-00118: "what's the border color of Waiting" gold: ask=property property=outline target=waiting; read: ask=property property=color target=waiting |
| class | target | 47 | st1b-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1b-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1b-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown size=tiny target=mention(quantifier=all,shape=hexagon) |
| class | color | 26 | st1b-00044: "make a cyan rectangle with a blue border" gold: action=create shape=rectangle color=cyan outline=blue; read: action=create outline=navy shape=rectangle<br>st1b-00138: "add a gold ellipse with a cyan outline" gold: action=create shape=ellipse color=gold outline=cyan; read: action=create shape=ellipse<br>st1b-00228: "make a pink triangle with a lime outline" gold: action=create shape=triangle color=pink outline=lime; read: action=create shape=triangle |
| class | size | 7 | st1b-00050: "how many huge ellipses are there" gold: ask=count shape=ellipse size=huge; read: ask=count shape=ellipse<br>st1b-00496: "how many huge rectangles are there" gold: ask=count shape=rectangle size=huge; read: ask=count shape=rectangle<br>st1b-00614: "how many giant triangles are there" gold: ask=count shape=triangle size=huge; read: ask=count shape=triangle |
| class | style | 1 | st1b-01012: "make the arrow from Worker to Kafka solid" gold: action=set from=worker to=kafka style=solid; read: action=set from=worker to=kafka |

### t1bs / all at the cost-10 threshold (0.8588)

Executed: right 1152, wrong 2, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 374: right 123, wrong or extra 251. Unread 6.

**Executed wrong, by first cause** (2)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 2 | st1b-02022: "what is the border of Ticket9" gold: ask=property property=outline target=ticket9; read: question:property ask=property property=color target=ticket9 (confidence 0.878; wrong)<br>st1b-02150: "give Krill a purple outline" gold: action=set target=krill outline=purple; read: command:set action=set outline=cyan target=krill (confidence 0.864; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | property | 1 | st1b-02022: "what is the border of Ticket9" gold: ask=property property=outline target=ticket9; read: question:property ask=property property=color target=ticket9 |
| class | outline | 1 | st1b-02150: "give Krill a purple outline" gold: action=set target=krill outline=purple; read: command:set action=set outline=cyan target=krill |

**Right but held by confidence** (123)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 54 | st1b-00088: "create a list with Bedroom, Bathroom and Pantry" gold: action=create template=list items=bedroom,bathroom,pantry; read: command:create action=create items=bedroom,bathroom,pantry template=list<br>st1b-00129: "make a funnel with 3 stages" gold: action=create template=funnel count=3; read: command:create action=create count=3 template=funnel<br>st1b-00144: "draw a timeline of Lead, Cfo and Manager" gold: action=create template=timeline items=lead,cfo,manager; read: command:create action=create items=lead,cfo,manager template=timeline |
| held | command:set | 45 | st1b-00086: "make Nucleus's border blue" gold: action=set target=nucleus outline=blue; read: command:set action=set outline=blue target=nucleus<br>st1b-00120: "make the arrow from Winger to Safety two-way" gold: action=set from=winger to=safety arrow=both; read: command:set action=set arrow=both from=winger to=safety<br>st1b-00130: "give Ticket9 a cyan border" gold: action=set target=ticket9 outline=cyan; read: command:set action=set outline=cyan target=ticket9 |
| held | question:count | 8 | st1b-00140: "count the connections" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1b-00364: "how many arrows do I have" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1b-00402: "how many links are there" gold: ask=count kind=edge; read: question:count ask=count kind=edge |
| held | command:move | 4 | st1b-00835: "move Header left" gold: action=move target=header direction=left; read: command:move action=move direction=left target=header<br>st1b-01319: "move Orbit left" gold: action=move target=orbit direction=left; read: command:move action=move direction=left target=orbit<br>st1b-01589: "move Dhcp left" gold: action=move target=dhcp direction=left; read: command:move action=move direction=left target=dhcp |
| held | command:snap | 2 | st1b-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1b-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:equalize | 2 | st1b-00248: "make all the shapes the same color" gold: action=equalize target=mention(quantifier=all) property=color; read: command:equalize action=equalize property=color target=mention(quantifier=all)<br>st1b-01500: "make all the shapes the same size" gold: action=equalize target=mention(quantifier=all) property=size; read: command:equalize action=equalize property=size target=mention(quantifier=all) |
| held | command:sort | 2 | st1b-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1b-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | command:groupBy | 2 | st1b-00446: "group the shapes by shape" gold: action=groupby target=mention(quantifier=all) property=shape; read: command:groupBy action=groupby property=shape target=mention(quantifier=all)<br>st1b-02110: "group the shapes by color" gold: action=groupby target=mention(quantifier=all) property=color; read: command:groupBy action=groupby property=color target=mention(quantifier=all) |
| held | (4 more keys; all in the JSON) | | |

**Structural holds** (0)

none

## short3s / all (333 messages, 424 requested: right 324, wrong 69, not done 31, extras 25; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 16 |
| actions | 45 |
| values/roles | 64 |
| calibration | 143 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 424); ok (ungated: right + would-be right of structural holds = right of every request executed: 324); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 69); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 25); ok (ungated: unread = requested - paired: 31); ok (ungated right equals the score file: 324); ok (ungated wrong equals the score file: 64); ok (ungated extras equals the score file: 23); ok (ungated unread equals the score file: 31); ok (ungated structural holds equal the score file: 7); ok (every produced request is executed, structurally held or (gated) confidence-held: 418); ok (gated: executed wrong equals the score file: 4); ok (gated: executed extras equals the score file: 2); ok (gated: structural holds equal the score file: 7); ok (gated: confidence holds equal the score file: 218); ok (gated: right executed equals the score file: 187); ok (gated: unread equals the score file: 31); ok (gated: held right + held wrong or extra = confidence holds: 218)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 13 | 0 | 0 | 3 | 16 |
| 4 wrong act | model (act head) | 31 | 14 | 0 | 0 | 45 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 7 | 0 | 0 | 0 | 7 |
| 6 wrong or missing class value | model (class head) | 32 | 5 | 0 | 0 | 37 |
| 7 wrong words tagged for a name / text key | model (token head) | 15 | 5 | 0 | 0 | 20 |

**short3s / all, trigger seen** (98)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 13 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle (the unit covers 38% of the span)<br>s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon (the unit covers 41% of the span)<br>s3-0082: "move it right" gold: action=move target=check direction=right; read: not done (lost: no unit on the span) |
| 4 wrong act | model (act head) | 31 | s3-0002: "behind everything as a background panel" gold: requested: put a pale blue rectangle behind everything as a background…; read: extra command:toBack action=toback target=mention(quantifier=all) (read as command:toBack where command:create is requested)<br>s3-0022: "square top left" gold: action=create shape=square position=topleft; read: not done (read as command:move)<br>s3-0022: "square top left" gold: requested: square top left; read: extra command:move action=move position=topleft (read as command:move where command:create is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 7 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: action=set (a name or description the message does not write)<br>s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done (a name written in another request or by a pronoun)<br>s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 32 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create anchor=flow label=5 milestones position=below<br>s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: ask=help aspect=can |
| 7 wrong words tagged for a name / text key | model (token head) | 15 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move anchor=done position=below<br>s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 4 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle<br>s3-0146: "create Api" gold: action=create shape=square name=api; read: not done<br>s3-0146: "Db squares" gold: action=create shape=square name=db; read: not done |
| cut | (command:set) | 4 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: not done<br>s3-0264: "start gold" gold: action=set target=start color=gold; read: action=set color=gold |
| cut | (command:move) | 1 | s3-0082: "move it right" gold: action=move target=check direction=right; read: not done |
| cut | (command:straighten) | 1 | s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done |
| cut | (command:undo) | 1 | s3-0137: "undo" gold: action=undo; read: not done |
| cut | (command:rename) | 1 | s3-0305: "named Gate" gold: action=rename target=check name=gate; read: not done |
| cut | (command:ungroup) | 1 | s3-0472: "ungroup intake" gold: action=ungroup target=intake; read: action=ungroup target=check,done,intake |
| act | command:create read as command:move | 4 | s3-0022: "square top left" gold: action=create shape=square position=topleft; read: not done<br>s3-0022: "square top left" gold: requested: square top left; read: extra command:move action=move position=topleft<br>s3-0252: "Sub2 below Process" gold: action=create name=sub2 position=below anchor=process; read: not done |
| act | command:move read as command:create | 4 | s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: not done<br>s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done<br>s3-0035: "put done under check" gold: requested: put done under check; read: extra command:create action=create |
| act | command:create read as command:arrange | 4 | s3-0316: "timeline Q1 Q2 Q3 Q4" gold: action=create template=timeline items=q1,q2,q3,q4; read: not done<br>s3-0316: "timeline Q1 Q2 Q3 Q4" gold: requested: timeline Q1 Q2 Q3 Q4; read: extra command:arrange action=arrange target=q1,q2,q3,q4<br>s3-0509: "timeline with 5 milestones" gold: action=create template=timeline count=5; read: not done |
| act | command:toFront read as command:move | 2 | s3-0131: "done on top" gold: action=tofront target=done; read: not done<br>s3-0131: "done on top" gold: requested: done on top; read: extra command:move action=move position=top target=done |
| act | command:rename read as command:label | 2 | s3-0194: "can you call Done "Finish" instead" gold: action=rename target=done name=finish; read: not done<br>s3-0194: "call Done "Finish"" gold: requested: can you call Done "Finish" instead; read: extra command:label action=label label=finish target=done |
| act | question:property read as command:label | 2 | s3-0262: "text on the check to done arrow?" gold: ask=property property=label from=check to=done; read: not done<br>s3-0262: "text on the check to done arrow" gold: requested: text on the check to done arrow?; read: extra command:label action=label from=check to=done |
| act | command:rename read as command:connect | 2 | s3-0290: "check to Test" gold: action=rename target=check name=test; read: not done<br>s3-0290: "check to Test" gold: requested: check to Test; read: extra command:connect action=connect from=check to=test |
| act | command:distribute read as command:respace | 2 | s3-0347: "spread them out" gold: action=distribute target=mention(quantifier=all); read: not done<br>s3-0347: "spread them out" gold: requested: spread them out; read: extra command:respace action=respace comparison=bigger target=mention(quantifier=all) |
| ref | target | 4 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: action=set<br>s3-0266: "make it a star" gold: action=set target=end shape=star; read: action=set shape=star target=done<br>s3-0303: "align all three" gold: action=align target=start,check,done; read: action=align axis=horizontal target=check |
| ref | from | 2 | s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip target=check |
| ref | to | 2 | s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip target=check |
| class | target | 11 | s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0136: "put all shapes in a row" gold: action=arrange target=mention(quantifier=all) layout=row; read: action=arrange layout=row<br>s3-0159: "kill the circle I just made" gold: action=delete target=mention(recency=newest,shape=circle); read: action=delete target=mention(shape=circle) |
| class | template | 8 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create anchor=flow label=5 milestones position=below<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: action=create color=blue<br>s3-0215: "show the four shapes as a timeline" gold: action=arrange template=timeline target=mention(quantifier=all); read: action=arrange |
| class | topic | 4 | s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: ask=help aspect=can<br>s3-0158: "what layouts are there" gold: ask=help topic=layout aspect=values; read: ask=help aspect=values<br>s3-0441: "explain layouts" gold: ask=help topic=layout; read: ask=help |
| class | shape | 3 | s3-0093: "add a title Roadmap" gold: action=create shape=text label=roadmap; read: action=create label=roadmap<br>s3-0163: "Draw 6 small stars in a circle." gold: action=create count=6 shape=star size=small layout=circle; read: action=create count=6 shape=circle size=small<br>s3-0379: "make check diamond yellow big" gold: action=set target=check shape=diamond color=yellow size=large; read: action=set color=yellow size=large target=mention(shape=diamond) |
| class | layout | 3 | s3-0163: "Draw 6 small stars in a circle." gold: action=create count=6 shape=star size=small layout=circle; read: action=create count=6 shape=circle size=small<br>s3-0268: "add a row of 5 orange rectangles along the bottom edge" gold: action=create count=5 shape=rectangle color=orange layout=row position=bottom; read: action=create color=orange count=5 position=bottom shape=rectangle<br>s3-0455: "make it a layered diagram" gold: action=arrange layout=layers; read: action=arrange |
| class | outline | 3 | s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black target=start<br>s3-0300: "give me a white hexagon with a red border" gold: action=create shape=hexagon color=white outline=red; read: action=create color=white shape=hexagon<br>s3-0363: "add a thick green edge around Done" gold: action=set target=done outline=green; read: action=set color=green target=done |
| class | position | 2 | s3-0098: "four squares stacked on the left" gold: action=create count=4 shape=square layout=column position=left; read: action=create count=4 layout=column shape=square<br>s3-0409: "move the title to the left" gold: action=move position=left; read: action=move direction=left |
| class | anchor | 1 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create anchor=flow label=5 milestones position=below |
| name | target | 5 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move anchor=done position=below<br>s3-0122: "except Done which is red" gold: action=set target=done color=red; read: action=set color=red |
| name | about | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: ask=help aspect=can<br>s3-0236: "what does SOP Lang mean" gold: ask=help about=sop lang; read: ask=help |
| name | from | 2 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0526: "make an arrow done to start" gold: action=connect from=done to=start; read: action=connect to=start |
| name | to | 2 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0252: "connect Process to both" gold: action=connect from=process to=$new,$new; read: action=connect from=process |
| name | anchor | 2 | s3-0318: "tree layout, root Start, growing down" gold: action=arrange layout=tree anchor=start direction=down; read: action=arrange direction=down layout=tree<br>s3-0336: "lay it out as layers, start at the left" gold: action=arrange layout=layers direction=right anchor=start; read: action=arrange direction=right layout=layers |
| name | scale | 1 | s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |
| name | count | 1 | s3-0166: "add a 3 by 3 grid of small squares" gold: action=create count=9 shape=square size=small layout=grid; read: action=create layout=grid shape=square size=small |
| name | label | 1 | s3-0529: "call the start to process link begin" gold: action=label from=start to=process label=begin; read: action=label from=start to=process |
| act | (6 more keys; all in the JSON) | | |
| class | (1 more keys; all in the JSON) | | |

**short3s / all, trigger unseen** (24)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 14 | s3-0008: "can you add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: not done (read as command:create)<br>s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: requested: can you add the word "approved" next to the arrow going fro…; read: extra command:create action=create label=approved (read as command:create where command:label is requested)<br>s3-0063: "swot matrix" gold: action=create template=matrix; read: not done (read as command:label) |
| 6 wrong or missing class value | model (class head) | 5 | s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: action=create count=4<br>s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 name=core position=center template=matrix<br>s3-0354: "make the outline of check orange" gold: action=set target=check outline=orange; read: action=set color=orange target=check |
| 7 wrong words tagged for a name / text key | model (token head) | 5 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label target=process<br>s3-0310: "no more arrows on done" gold: action=disconnect target=done; read: action=disconnect from=done<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label= |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:label read as command:create | 2 | s3-0008: "can you add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: not done<br>s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: requested: can you add the word "approved" next to the arrow going fro…; read: extra command:create action=create label=approved |
| act | command:create read as command:label | 2 | s3-0063: "swot matrix" gold: action=create template=matrix; read: not done<br>s3-0063: "swot matrix" gold: requested: swot matrix; read: extra command:label action=label |
| act | question:check read as command:move | 2 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: not done<br>s3-0071: "check higher than done" gold: requested: check higher than done?; read: extra command:move action=move target=check |
| act | command:align read as command:arrange | 2 | s3-0203: "put start process and check on one line" gold: action=align target=start,process,check; read: not done<br>s3-0203: "put start process and check on one line" gold: requested: put start process and check on one line; read: extra command:arrange action=arrange target=process,check |
| act | command:resize read as question:property | 2 | s3-0365: "double check's size" gold: action=resize target=check; read: not done<br>s3-0365: "double check's size" gold: requested: double check's size; read: extra question:property ask=property property=size |
| act | command:move read as question:list | 2 | s3-0494: "all circles over to the left" gold: action=move target=mention(quantifier=all,shape=circle) position=left; read: not done<br>s3-0494: "all circles over to the left" gold: requested: all circles over to the left; read: extra question:list ask=list position=left shape=circle |
| act | fact: read as command:create | 2 | s3-0517: "check lives in the top right" gold: target=check position=topright; read: not done<br>s3-0517: "check lives in the top right" gold: requested: check lives in the top right; read: extra command:create action=create position=topright |
| class | template | 2 | s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: action=create count=4<br>s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 name=core position=center template=matrix |
| class | outline | 1 | s3-0354: "make the outline of check orange" gold: action=set target=check outline=orange; read: action=set color=orange target=check |
| class | property | 1 | s3-0358: "what is the outline color of process" gold: ask=property target=process property=outline; read: ask=property property=color target=process |
| class | layout | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange layout=column |
| class | direction | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange layout=column |
| name | label | 1 | s3-0083: "process no label" gold: action=label target=process label=; read: action=label target=process |
| name | target | 1 | s3-0310: "no more arrows on done" gold: action=disconnect target=done; read: action=disconnect from=done |
| name | from | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label= |
| name | to | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label= |
| name | count | 1 | s3-0396: "twelve circles in a circle" gold: action=create count=12 shape=circle layout=circle; read: action=create layout=circle shape=circle |
| name | linked | 1 | s3-0422: "Done and Start are connected" gold: target=done linked=start; read: target=done |

**short3s / all, trigger no request** (3)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 3 | s3-0119: "tidy the arrows" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) (partial overlap with a requested action: 43% of it)<br>s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (partial overlap with a requested action: 40% of it)<br>s3-0311: "Data" gold: -; read: extra command:create action=create name=data (partial overlap with a requested action: 12% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:improve | 1 | s3-0119: "tidy the arrows" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) |
| cut | command:set | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db |
| cut | command:create | 1 | s3-0311: "Data" gold: -; read: extra command:create action=create name=data |

### short3s / all at the cost-10 threshold (0.8588)

Executed: right 187, wrong 4, extras 2. Structural holds 7 ({"blocked":7}; 0 of them would have been right). Confidence holds 218: right 137, wrong or extra 81. Unread 31.

**Executed wrong, by first cause** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db (confidence 0.978; extra) |
| 4 wrong act | model (act head) | 1 | s3-0252: "add Sub1 and Sub2 below Process" gold: -; read: extra command:move action=move anchor=process position=below target=sub1,sub2 (confidence 0.888; extra) |
| 6 wrong or missing class value | model (class head) | 3 | s3-0163: "Draw 6 small stars in a circle" gold: action=create count=6 shape=star size=small layout=circle; read: command:create action=create count=6 shape=circle size=small (confidence 0.921; wrong)<br>s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: command:connect action=connect color=gray from=process to=done (confidence 0.928; wrong)<br>s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: question:help ask=help aspect=how topic=text (confidence 0.973; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db (confidence 0.973; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:set | 1 | s3-0146: "create Api and Db squares" gold: -; read: extra command:set action=set shape=square target=api,db |
| act | command:create read as command:move | 1 | s3-0252: "add Sub1 and Sub2 below Process" gold: -; read: extra command:move action=move anchor=process position=below target=sub1,sub2 |
| class | shape | 1 | s3-0163: "Draw 6 small stars in a circle" gold: action=create count=6 shape=star size=small layout=circle; read: command:create action=create count=6 shape=circle size=small |
| class | layout | 1 | s3-0163: "Draw 6 small stars in a circle" gold: action=create count=6 shape=star size=small layout=circle; read: command:create action=create count=6 shape=circle size=small |
| class | arrow | 1 | s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: command:connect action=connect color=gray from=process to=done |
| class | topic | 1 | s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: question:help ask=help aspect=how topic=text |
| name | from | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |
| name | to | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |

**Right but held by confidence** (137)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:set | 15 | s3-0049: "everything black" gold: action=set target=mention(quantifier=all) color=black; read: command:set action=set color=black target=mention(quantifier=all)<br>s3-0057: "red for check" gold: action=set target=check color=red; read: command:set action=set color=red target=check<br>s3-0112: "red outline around process" gold: action=set target=process outline=red; read: command:set action=set outline=red target=process |
| held | command:create | 12 | s3-0006: "add 8 tiny dots in a ring around the center" gold: action=create count=8 shape=circle size=tiny layout=circle position=center; read: command:create action=create count=8 layout=circle position=center shape=circle size=tiny<br>s3-0018: "process steps: Plan, Build, Test, Ship" gold: action=create template=process items=plan,build,test,ship; read: command:create action=create items=plan,build,test,ship template=process<br>s3-0160: "add a teal diamond between Process and Check" gold: action=create shape=diamond color=teal position=between anchor=process,check; read: command:create action=create anchor=process,check color=teal position=between shape=diamond |
| held | command:connect | 12 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: command:connect action=connect from=start to=check<br>s3-0109: "join them" gold: action=connect from=$new to=$new; read: command:connect action=connect from=$new to=$new<br>s3-0116: "Can you connect Done back to Start with a blue dashed arrow" gold: action=connect from=done to=start color=blue style=dashed; read: command:connect action=connect color=blue from=done style=dashed to=start |
| held | command:move | 12 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: command:move action=move position=center target=check<br>s3-0179: "check up 40px" gold: action=move target=check direction=up distance=40; read: command:move action=move direction=up distance=40 target=check<br>s3-0209: "put the yellow diamond above Process" gold: action=move target=mention(color=yellow,shape=diamond) position=above anchor=process; read: command:move action=move anchor=process position=above target=mention(color=yellow,shape=diamond) |
| held | command:resize | 12 | s3-0082: "make check smaller" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0193: "also bigger" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0257: "Process smaller" gold: action=resize target=process; read: command:resize action=resize target=process |
| held | command:arrange | 10 | s3-0017: "arrange it like an org chart" gold: action=arrange layout=tree; read: command:arrange action=arrange layout=tree<br>s3-0040: "radial layout around Check" gold: action=arrange layout=radial anchor=check; read: command:arrange action=arrange anchor=check layout=radial<br>s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: command:arrange action=arrange target=start,process,check,done template=timeline |
| held | command:group | 6 | s3-0084: "group all as Flow" gold: action=group target=mention(quantifier=all) name=flow; read: command:group action=group name=flow target=mention(quantifier=all)<br>s3-0103: "group check and done" gold: action=group target=check,done; read: command:group action=group target=check,done<br>s3-0276: "make Done and Check one group named Tail" gold: action=group target=done,check name=tail; read: command:group action=group name=tail target=done,check |
| held | command:disconnect | 6 | s3-0125: "delete all arrows" gold: action=disconnect quantifier=all; read: command:disconnect action=disconnect quantifier=all<br>s3-0148: "remove the arrow between check and done" gold: action=disconnect from=check to=done; read: command:disconnect action=disconnect from=check to=done<br>s3-0171: "remove all links" gold: action=disconnect quantifier=all; read: command:disconnect action=disconnect quantifier=all |
| held | (24 more keys; all in the JSON) | | |

**Structural holds** (7)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 7 | s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: question:help ask=help aspect=can<br>s3-0083: "process no label" gold: action=label target=process label=; read: command:label action=label target=process<br>s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help aspect=can |

## Notes

- oracle: /home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/roundtrip/R: it holds the ids of fresh2 and short3 only, so for every other set cause 1 is not measured (the oracle verdict row of each part says absent); it is the round trip of the layout whose training data it was made for, a proxy when the arm read has another layout
- views: every view of the campaign is read against one teacher's labels; the oracle (cause 1) is not measured for these views except through the keys the layout does not read
