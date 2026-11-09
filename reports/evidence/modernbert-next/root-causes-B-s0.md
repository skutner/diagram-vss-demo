# Root causes (truthful_v1): modernbert (d0106c17b922)

Score: `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/B-s0/eval/score.truthful.json`; training data: `/home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/data/B`; oracle: none.

Each request that is not right and each extra gets the first cause that explains it (as root_causes.mjs); the causes are then grouped in the plan's categories. truthful_v1 compares the resize direction and explicit scale and the text keys (presence and exact value) beside the pairing; a written description is not called an unwritten reference (needsKeysV1).

## fresh2_test / test (405 messages, 1313 requested: right 1097, wrong 189, not done 27, extras 69; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 76 |
| actions | 34 |
| values/roles | 175 |
| calibration | 484 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1313); ok (ungated: right + would-be right of structural holds = right of every request executed: 1097); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 189); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 69); ok (ungated: unread = requested - paired: 27); ok (ungated right equals the score file: 1097); ok (ungated wrong equals the score file: 187); ok (ungated extras equals the score file: 64); ok (ungated unread equals the score file: 27); ok (ungated structural holds equal the score file: 7); ok (every produced request is executed, structurally held or (gated) confidence-held: 1355); ok (gated: executed wrong equals the score file: 5); ok (gated: executed extras equals the score file: 3); ok (gated: structural holds equal the score file: 7); ok (gated: confidence holds equal the score file: 719); ok (gated: right executed equals the score file: 621); ok (gated: unread equals the score file: 27); ok (gated: held right + held wrong or extra = confidence holds: 719)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 21 | 2 | 0 | 18 | 41 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 35 | 35 |
| 4 wrong act | model (act head) | 20 | 14 | 0 | 0 | 34 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 107 | 8 | 0 | 0 | 115 |
| 6 wrong or missing class value | model (class head) | 30 | 1 | 0 | 0 | 31 |
| 7 wrong words tagged for a name / text key | model (token head) | 25 | 4 | 0 | 0 | 29 |

**fresh2_test / test, trigger seen** (203)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 21 | fo-0004: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done (lost: no unit on the span)<br>fo-0045: "HalfOpen back to Closed" gold: action=connect from=halfopen to=closed; read: not done (merged into a unit with another request)<br>fo-0090: "Only ProfileSvc is using the Db, so connect them" gold: action=connect from=profilesvc to=db; read: action=connect from=gateway to=gateway (the unit covers 25% of the span) |
| 4 wrong act | model (act head) | 20 | fo-0023: "Sw1 is connecting to R1" gold: action=connect from=sw1 to=r1 arrow=none; read: not done (read as fact:)<br>fo-0023: "Sw1 is connecting to R1" gold: requested: Sw1 is connecting to R1; read: extra fact:  (read as fact: where command:connect is requested)<br>fo-0116: "Gcs should be an ellipse" gold: action=set target=gcs shape=ellipse; read: not done (read as command:move) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 107 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof (a name written in another request or by a pronoun)<br>fo-0010: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo (a name written in another request or by a pronoun)<br>fo-0010: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 30 | fo-0025: "arange Raw, Staged, Curated and Mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart<br>fo-0032: "All rectangles should be orange. Actually only Eks and Ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention()<br>fo-0087: "I want Wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake |
| 7 wrong words tagged for a name / text key | model (token head) | 25 | fo-0004: "connect Ingest Parse Clean and Load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect from=ingest,clean,load<br>fo-0012: "hook the copies up to Alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0027: "Off goes to Booting and Booting goes to Ready, Ready goes to Shutdown" gold: action=connect from=off,booting,ready,shutdown; read: action=connect from=off,booting,ready |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:connect) | 6 | fo-0045: "HalfOpen back to Closed" gold: action=connect from=halfopen to=closed; read: not done<br>fo-0090: "Only ProfileSvc is using the Db, so connect them" gold: action=connect from=profilesvc to=db; read: action=connect from=gateway to=gateway<br>fo-0116: "Pubsub feeds Dataflow" gold: action=connect from=pubsub to=dataflow; read: not done |
| cut | (command:set) | 4 | fo-0328: "Then make both bedrooms blue, no, light... okay just make them indigo" gold: action=set target=bed1,bed2 color=indigo; read: action=set color=indigo target=bed2<br>fo-0441: "End should be a circle not a box, make it a circle" gold: action=set target=end shape=circle; read: action=set shape=circle<br>fo-0534: "Ivy can be a dark navy since it's a climber on the wall, but no, teal reads better" gold: action=set target=ivy color=teal; read: action=set color=navy target=ivy |
| cut | (command:arrange) | 3 | fo-0004: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done<br>fo-0136: "the tasks I want in a column" gold: action=arrange target=taska,taskb,taskc layout=column; read: action=arrange layout=column<br>fo-0543: "Put the three days in a column" gold: action=arrange target=day1,day2,day3 layout=column; read: not done |
| cut | (command:create) | 2 | fo-0237: "put 5 tiny gray sqaures between Mars and... hmm there's nothing after Mars yet. ok just put them to the right…" gold: action=create shape=square size=tiny color=gray count=5 position=rightof anchor=$new; read: action=create anchor=$new color=gray count=5 position=between shape=ellipse size=tiny<br>fo-0524: "Can you put three small yellow stars underneath it? Those are the kids' plants. hmm actually I meant five, no…" gold: action=create shape=star color=yellow size=small count=5 position=below anchor=sunflower; read: action=create color=yellow count=3 shape=star size=small |
| cut | (command:resize) | 2 | fo-0271: "can u make Fish a lil bigger" gold: action=resize target=fish; read: not done<br>fo-0328: "The Kitchen is too big, shrink it" gold: action=resize target=kitchen; read: action=resize target=bed2 |
| cut | (command:swap) | 1 | fo-0105: "Charging and Discharging are the wrong way round, flip them" gold: action=swap target=charging,discharging; read: not done |
| cut | (question:property) | 1 | fo-0221: "where Saturn is on this thing" gold: ask=property target=saturn property=position; read: not done |
| cut | (command:delete) | 1 | fo-0285: "Satellite isn't needed, delete it" gold: action=delete target=satellite; read: action=delete target=$new |
| act | fact: read as command:set | 3 | fo-0415: "The big rectangle in the corner is Bed1, it's blue" gold: target=bed1 shape=rectangle color=blue; read: not done<br>fo-0415: "The big rectangle in the corner is Bed1, it's blue" gold: requested: The big rectangle in the corner is Bed1, it's blue; read: extra command:set action=set color=blue shape=rectangle<br>fo-0500: "it's actually navy" gold: requested: it's actually navy; read: extra command:set action=set color=navy target=yarn |
| act | command:connect read as fact: | 2 | fo-0023: "Sw1 is connecting to R1" gold: action=connect from=sw1 to=r1 arrow=none; read: not done<br>fo-0023: "Sw1 is connecting to R1" gold: requested: Sw1 is connecting to R1; read: extra fact:  |
| act | command:set read as fact: | 2 | fo-0147: "Color for Connected is green" gold: action=set target=connected color=green; read: not done<br>fo-0147: "Color for Connected is green" gold: requested: Color for Connected is green; read: extra fact: color=green target=connected |
| act | command:redo read as question:help | 2 | fo-0188: "Can you redo" gold: action=redo; read: not done<br>fo-0188: "Can you redo" gold: requested: Can you redo; read: extra question:help ask=help |
| act | command:arrange read as command:align | 2 | fo-0459: "Then line up all four boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done<br>fo-0459: "line up all four boxes in a row" gold: requested: Then line up all four boxes in a row; read: extra command:align action=align axis=horizontal target=mention(quantifier=all) |
| act | question:degree read as question:neighbors | 2 | fo-0460: "Is Closing linked to anything yet" gold: ask=degree target=closing; read: not done<br>fo-0460: "Is Closing linked to anything" gold: requested: Is Closing linked to anything yet; read: extra question:neighbors ask=neighbors target=closing |
| act | question:connected read as command:connect | 2 | fo-0557: "Do both bases connect to Mid" gold: ask=connected target=bluebase,redbase anchor=mid; read: not done<br>fo-0557: "Do both bases connect to Mid" gold: requested: Do both bases connect to Mid; read: extra command:connect action=connect from=flag2 to=mid |
| act | fact: read as question:check | 2 | fo-0579: "Lettuce is actually green, not lime" gold: target=lettuce color=green; read: not done<br>fo-0579: "Lettuce is actually green, not lime" gold: requested: Lettuce is actually green, not lime; read: extra question:check ask=check color=green target=lettuce |
| ref | target | 77 | fo-0002: "Move it to the right of Api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof<br>fo-0010: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle target=logo<br>fo-0010: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=logo |
| ref | to | 10 | fo-0020: "disconnect them" gold: action=disconnect from=audit to=load; read: action=disconnect from=audit to=audit<br>fo-0035: "Same for Spine2" gold: action=connect from=spine2 to=leaf1,leaf2,leaf3,leaf4; read: action=connect from=spine2<br>fo-0055: "Connect CoreSw to each of them" gold: action=connect from=coresw to=vlan10,vlan20,vlan30; read: action=connect from=coresw |
| ref | from | 10 | fo-0025: "conect them each to the next" gold: action=connect from=raw,staged,curated,mart; read: action=connect pairing=next<br>fo-0035: "disconnect it from Spine1 and Spine2" gold: action=disconnect from=leaf4 to=spine1,spine2; read: action=disconnect to=spine1,spine2<br>fo-0076: "All three consumers -> Aggregator" gold: action=connect from=consumer1,consumer2,consumer3 to=aggregator; read: action=connect to=aggregator |
| ref | anchor | 10 | fo-0168: "put Grandma above both of them" gold: action=move target=grandma position=above anchor=mom,uncle; read: action=move anchor=mom position=above target=grandma<br>fo-0190: "move it there" gold: action=move target=frog position=rightof anchor=grasshopper; read: action=move anchor=frog position=between target=frog<br>fo-0192: "what's farthest from it" gold: ask=nearest anchor=earth superlative=farthest; read: ask=nearest superlative=farthest |
| class | target | 9 | fo-0032: "All rectangles should be orange. Actually only Eks and Ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention()<br>fo-0189: "Make every circle that isn't green blue" gold: action=set target=mention(notcolor=green,quantifier=all,shape=circle) color=blue; read: action=set color=blue target=mention(notcolor=blue,quantifier=all,shape=circle)<br>fo-0315: "the little square near the hall, can you send it to the back" gold: action=toback target=mention(shape=square); read: action=toback |
| class | shape | 9 | fo-0087: "I want Wake to be one as well" gold: action=set target=wake shape=circle; read: action=set target=wake<br>fo-0108: "Add a queue between Producer and Consumer, a teal ellipse called Mq. Sorry, make that a teal rectangle" gold: action=create shape=rectangle color=teal name=mq position=between anchor=producer,consumer; read: action=create anchor=producer,consumer color=teal name=mq position=between shape=ellipse<br>fo-0204: "can you add a blue triangle named Drop under the cloud. wait no not triangle, a diamond" gold: action=create shape=diamond color=blue name=drop position=below anchor=cloud; read: action=create anchor=cloud color=blue name=drop position=below shape=triangle |
| class | color | 8 | fo-0191: "please recolour her" gold: action=set target=aunt color=purple; read: action=set color=gold target=aunt<br>fo-0223: "please add a red rectangle named Mum to the left of Dad. actualy make it pink" gold: action=create shape=rectangle color=pink name=mum position=leftof anchor=dad; read: action=create anchor=dad color=red name=mum position=leftof shape=rectangle<br>fo-0250: "please add two small lime circles below Secretary. Hmm, actually make them squares" gold: action=create shape=square size=small color=lime count=2 position=below anchor=secretary; read: action=create anchor=secretary count=2 position=below shape=square size=small |
| class | position | 3 | fo-0342: "and shove the newest square there too" gold: action=move target=mention(recency=newest,shape=square) position=right; read: action=move target=mention(recency=newest,shape=square)<br>fo-0404: "put Stairs neer Hall" gold: action=move target=stairs position=near anchor=hall; read: action=move target=stairs<br>fo-0539: "what is Bass next to" gold: ask=list position=near anchor=bass; read: ask=list |
| class | layout | 1 | fo-0025: "arange Raw, Staged, Curated and Mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=raw,staged,curated,mart |
| class | scale (direction) | 1 | fo-0119: "Spinner smaler" gold: action=resize target=spinner; read: action=resize target=spinner |
| class | axis | 1 | fo-0433: "Then I'd like Supplier, Factory, Dc and Retail distributed horizontally" gold: action=distribute target=dc,factory,retail,supplier axis=horizontal; read: action=distribute target=dc,factory,retail,supplier |
| class | superlative | 1 | fo-0572: "the stage with the fewest connections, which one is it" gold: ask=extreme superlative=leastconnected; read: ask=extreme |
| name | from | 11 | fo-0004: "connect Ingest Parse Clean and Load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect from=ingest,clean,load<br>fo-0012: "hook the copies up to Alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0027: "Off goes to Booting and Booting goes to Ready, Ready goes to Shutdown" gold: action=connect from=off,booting,ready,shutdown; read: action=connect from=off,booting,ready |
| name | target | 8 | fo-0052: "arrange Worker and the copies in a column to the right of Scheduler" gold: action=arrange target=worker,$new layout=column; read: action=arrange layout=column<br>fo-0172: "Friends can be pink" gold: action=set target=friends color=pink; read: action=set color=pink<br>fo-0222: "what about Zooplankton and Tuna" gold: ask=connected target=tuna anchor=zooplankton; read: ask=connected target=tuna,zooplankton |
| name | to | 6 | fo-0052: "Connect Scheduler to Worker and the copies" gold: action=connect from=scheduler to=worker,$new; read: action=connect from=scheduler to=worker<br>fo-0066: "NewService reads from Db, connect those too" gold: action=connect from=newservice to=db; read: action=connect from=db to=newservice<br>fo-0116: "Dataflow writes to Bigquery and Gcs" gold: action=connect from=dataflow to=bigquery,gcs; read: action=connect from=pubsub,dataflow,bigquery,gcs |
| name | name | 2 | fo-0049: "Add a white square named Pc1 next to Router. Wait, call it Laptop, not Pc1" gold: action=create shape=square color=white name=laptop position=near anchor=router; read: action=create anchor=router color=white name=pc1 position=near shape=square<br>fo-0160: "Venus, a small orange circle, right of Mercury" gold: action=create shape=circle size=small color=orange name=venus position=rightof anchor=$new; read: action=create anchor=$new color=orange position=rightof shape=circle size=small |
| name | anchor | 2 | fo-0222: "what about Zooplankton and Tuna" gold: ask=connected target=tuna anchor=zooplankton; read: ask=connected target=tuna,zooplankton<br>fo-0318: "Add a new rectangle called Blocked under Doing, no wait, to the right of Done" gold: action=create shape=rectangle name=blocked position=rightof anchor=done; read: action=create anchor=doing,done name=blocked position=rightof shape=rectangle |
| cut | (1 more keys; all in the JSON) | | |
| act | (3 more keys; all in the JSON) | | |

**fresh2_test / test, trigger unseen** (29)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 2 | fo-0104: "did I make Igw a circle" gold: ask=check target=igw shape=circle; read: not done (lost: no unit on the span)<br>fo-0534: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move (the unit covers 0% of the span) |
| 4 wrong act | model (act head) | 14 | fo-0107: "Thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: not done (read as command:connect)<br>fo-0107: "3 more just like it" gold: requested: Thumbnail: 3 more just like it; read: extra command:connect action=connect from=$new to=$new (read as command:connect where command:duplicate is requested)<br>fo-0210: "Coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done (read as command:connect) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 8 | fo-0076: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers (a name written in another request or by a pronoun)<br>fo-0113: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple (a name written in another request or by a pronoun)<br>fo-0144: "I want Broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2 (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 1 | fo-0113: "I want the Grid1, Grid2, Grid3 and Grid4 to be in grid" gold: action=arrange target=grid1,grid2,grid3,grid4 layout=grid; read: action=arrange target=grid1,grid2,grid3,grid4 |
| 7 wrong words tagged for a name / text key | model (token head) | 4 | fo-0092: "Redis teal, no, cyan" gold: action=set target=redis color=cyan; read: action=set color=cyan<br>fo-0160: "Earth comes next, a small blue circle called Earth to the right of Venus" gold: action=create shape=circle size=small color=blue name=earth position=rightof anchor=$new; read: action=create anchor=venus color=blue name=earth position=rightof shape=circle size=small<br>fo-0400: "Archive connects from Publish with a dotted arrow" gold: action=connect from=publish to=archive style=dotted; read: action=connect from=archive,publish style=dotted |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (question:check) | 1 | fo-0104: "did I make Igw a circle" gold: ask=check target=igw shape=circle; read: not done |
| cut | (command:move) | 1 | fo-0534: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move |
| act | question:degree read as question:count | 4 | fo-0335: "How many shapes are connected to Score" gold: ask=degree target=score; read: not done<br>fo-0335: "How many shapes are connected to Score" gold: requested: How many shapes are connected to Score; read: extra question:count ask=count<br>fo-0462: "How many shapes are connected to Coding" gold: ask=degree target=coding; read: not done |
| act | question:extreme read as question:check | 4 | fo-0554: "Is Teardown the last one on the right" gold: ask=extreme superlative=rightmost; read: not done<br>fo-0554: "Is Teardown the last one on the right" gold: requested: Is Teardown the last one on the right; read: extra question:check ask=check position=right target=teardown<br>fo-0594: "Is Scene4 the last one at the bottom" gold: ask=extreme superlative=bottommost; read: not done |
| act | command:duplicate read as command:connect | 2 | fo-0107: "Thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: not done<br>fo-0107: "3 more just like it" gold: requested: Thumbnail: 3 more just like it; read: extra command:connect action=connect from=$new to=$new |
| act | command:rename read as command:connect | 2 | fo-0210: "Coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done<br>fo-0210: "Coach2 to Seniors" gold: requested: Coach2 to Seniors; read: extra command:connect action=connect from=coach2 to=seniors |
| act | question:extreme read as question:list | 2 | fo-0271: "what's the bottomost thing" gold: ask=extreme superlative=bottommost; read: not done<br>fo-0271: "what's the bottomost thing now" gold: requested: what's the bottomost thing; read: extra question:list ask=list |
| ref | anchor | 5 | fo-0144: "I want Broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2<br>fo-0184: "Genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: action=move anchor=cells position=rightof target=genes<br>fo-0184: "Plants belwo it" gold: action=move target=plants position=below anchor=brain; read: action=move target=plants |
| ref | target | 3 | fo-0076: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers<br>fo-0113: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple<br>fo-0441: "And red. No, black" gold: action=set target=end color=black; read: action=set color=black |
| class | layout | 1 | fo-0113: "I want the Grid1, Grid2, Grid3 and Grid4 to be in grid" gold: action=arrange target=grid1,grid2,grid3,grid4 layout=grid; read: action=arrange target=grid1,grid2,grid3,grid4 |
| name | from | 2 | fo-0400: "Archive connects from Publish with a dotted arrow" gold: action=connect from=publish to=archive style=dotted; read: action=connect from=archive,publish style=dotted<br>fo-0577: "Pump into Filter. Filter into Uv. Uv into Waterfall. Waterfall into Pond" gold: action=connect from=pump,filter,uv,waterfall,pond; read: action=connect from=pump,filter,uv,waterfall |
| name | target | 1 | fo-0092: "Redis teal, no, cyan" gold: action=set target=redis color=cyan; read: action=set color=cyan |
| name | anchor | 1 | fo-0160: "Earth comes next, a small blue circle called Earth to the right of Venus" gold: action=create shape=circle size=small color=blue name=earth position=rightof anchor=$new; read: action=create anchor=venus color=blue name=earth position=rightof shape=circle size=small |
| name | to | 1 | fo-0400: "Archive connects from Publish with a dotted arrow" gold: action=connect from=publish to=archive style=dotted; read: action=connect from=archive,publish style=dotted |

**fresh2_test / test, trigger no request** (53)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 18 | fo-0027: "Ready goes to Shutdown" gold: -; read: extra command:connect action=connect from=ready to=shutdown (partial overlap with a requested action: 32% of it)<br>fo-0049: "call it Laptop, not Pc1" gold: -; read: extra command:rename action=rename name=laptop target=$new (partial overlap with a requested action: 31% of it)<br>fo-0052: "the right of Scheduler" gold: -; read: extra command:move action=move anchor=scheduler position=rightof target=$new (partial overlap with a requested action: 33% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 35 | fo-0023: "Then" gold: -; read: extra command:create action=create (no requested action on this text)<br>fo-0031: "pagination" gold: -; read: extra command:arrange action=arrange layout=row (no requested action on this text)<br>fo-0118: "Undo that if it looks bad" gold: -; read: extra command:undo action=undo (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 5 | fo-0107: "Thumbnail" gold: -; read: extra command:create action=create<br>fo-0237: "." gold: -; read: extra command:create action=create<br>fo-0534: "a" gold: -; read: extra command:create action=create |
| cut | command:connect | 3 | fo-0027: "Ready goes to Shutdown" gold: -; read: extra command:connect action=connect from=ready to=shutdown<br>fo-0147: "Ended return to Idle" gold: -; read: extra command:connect action=connect from=ended to=idle<br>fo-0577: "Waterfall into Pond" gold: -; read: extra command:connect action=connect from=waterfall to=pond |
| cut | command:move | 2 | fo-0052: "the right of Scheduler" gold: -; read: extra command:move action=move anchor=scheduler position=rightof target=$new<br>fo-0237: "just put them to the right of Mars" gold: -; read: extra command:move action=move anchor=$new position=rightof target=$new |
| cut | question:help | 2 | fo-0165: "can" gold: -; read: extra question:help ask=help aspect=can<br>fo-0452: "can" gold: -; read: extra question:help ask=help aspect=can |
| cut | command:set | 2 | fo-0223: "actualy make it pink" gold: -; read: extra command:set action=set color=pink target=$new<br>fo-0534: "but no, teal reads better. Teal" gold: -; read: extra command:set action=set color=teal target=$new |
| cut | command:rename | 1 | fo-0049: "call it Laptop, not Pc1" gold: -; read: extra command:rename action=rename name=laptop target=$new |
| cut | command:flip | 1 | fo-0105: "flip them" gold: -; read: extra command:flip action=flip target=mention() |
| cut | fact: | 1 | fo-0147: "for Ended is red" gold: -; read: extra fact: color=red target=ended |
| spurious | command:set | 7 | fo-0136: "Please" gold: -; read: extra command:set action=set<br>fo-0139: "So" gold: -; read: extra command:set action=set target=core<br>fo-0184: "Body red" gold: -; read: extra command:set action=set color=red target=body |
| spurious | command:connect | 7 | fo-0190: "In a food chain it goes left to right, Grass then Grasshopper then Frog" gold: -; read: extra command:connect action=connect from=grass,grasshopper,frog<br>fo-0246: "the arrow from Cow to Human" gold: -; read: extra command:connect action=connect from=cow to=human<br>fo-0279: "I want to" gold: -; read: extra command:connect action=connect from=gran to=gran |
| spurious | command:create | 5 | fo-0023: "Then" gold: -; read: extra command:create action=create<br>fo-0243: "Then" gold: -; read: extra command:create action=create<br>fo-0407: "There's a tiny magenta circle somewhere" gold: -; read: extra command:create action=create color=magenta shape=circle size=tiny |
| spurious | command:move | 4 | fo-0168: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance<br>fo-0424: "hit the Paywall right after Trial" gold: -; read: extra command:move action=move anchor=trial position=rightof target=paywall |
| spurious | fact: | 2 | fo-0240: "'s blue" gold: -; read: extra fact: color=blue target=dad<br>fo-0375: "Packer and Shipper are hexagons" gold: -; read: extra fact: shape=hexagon target=packer,shipper |
| spurious | command:disconnect | 2 | fo-0355: "drop the Truck route entirely" gold: -; read: extra command:disconnect action=disconnect from=plant to=truck<br>fo-0385: "that" gold: -; read: extra command:disconnect action=disconnect from=spoke2 to=spoke2 |
| spurious | command:arrange | 1 | fo-0031: "pagination" gold: -; read: extra command:arrange action=arrange layout=row |
| spurious | command:undo | 1 | fo-0118: "Undo that if it looks bad" gold: -; read: extra command:undo action=undo |
| cut | (1 more keys; all in the JSON) | | |
| spurious | (6 more keys; all in the JSON) | | |

### fresh2_test / test at the cost-10 threshold (0.9150)

Executed: right 621, wrong 5, extras 3. Structural holds 7 ({"blocked":3,"dependency":4}; 0 of them would have been right). Confidence holds 719: right 476, wrong or extra 243. Unread 27.

**Executed wrong, by first cause** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 2 | fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance (confidence 0.932; extra)<br>fo-0424: "hit the Paywall right after Trial" gold: -; read: extra command:move action=move anchor=trial position=rightof target=paywall (confidence 0.967; extra) |
| 4 wrong act | model (act head) | 1 | fo-0210: "Coach2 to Seniors" gold: -; read: extra command:connect action=connect from=coach2 to=seniors (confidence 0.990; extra) |
| 6 wrong or missing class value | model (class head) | 2 | fo-0259: "add 8 tiny whte stars at the top" gold: action=create shape=star size=tiny color=white count=8 position=top; read: command:create action=create count=8 position=top shape=star size=tiny (confidence 0.923; wrong)<br>fo-0414: "make one below Done and call it Release" gold: action=create shape=square color=green name=release position=below anchor=done; read: command:create action=create anchor=done name=release position=below (confidence 0.930; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 3 | fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: command:connect action=connect from=laptop to=nas (confidence 0.975; wrong)<br>fo-0052: "Connect Scheduler to Worker and the copies" gold: action=connect from=scheduler to=worker,$new; read: command:connect action=connect from=scheduler to=worker (confidence 0.917; wrong)<br>fo-0318: "Add a new rectangle called Blocked under Doing, no wait, to the right of Done" gold: action=create shape=rectangle name=blocked position=rightof anchor=done; read: command:create action=create anchor=doing,done name=blocked position=rightof shape=rectangle (confidence 0.920; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:move | 2 | fo-0288: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance<br>fo-0424: "hit the Paywall right after Trial" gold: -; read: extra command:move action=move anchor=trial position=rightof target=paywall |
| act | command:rename read as command:connect | 1 | fo-0210: "Coach2 to Seniors" gold: -; read: extra command:connect action=connect from=coach2 to=seniors |
| class | color | 2 | fo-0259: "add 8 tiny whte stars at the top" gold: action=create shape=star size=tiny color=white count=8 position=top; read: command:create action=create count=8 position=top shape=star size=tiny<br>fo-0414: "make one below Done and call it Release" gold: action=create shape=square color=green name=release position=below anchor=done; read: command:create action=create anchor=done name=release position=below |
| class | shape | 1 | fo-0414: "make one below Done and call it Release" gold: action=create shape=square color=green name=release position=below anchor=done; read: command:create action=create anchor=done name=release position=below |
| name | from | 1 | fo-0049: "connect Laptop to Nas" gold: action=connect from=$new to=nas; read: command:connect action=connect from=laptop to=nas |
| name | to | 1 | fo-0052: "Connect Scheduler to Worker and the copies" gold: action=connect from=scheduler to=worker,$new; read: command:connect action=connect from=scheduler to=worker |
| name | anchor | 1 | fo-0318: "Add a new rectangle called Blocked under Doing, no wait, to the right of Done" gold: action=create shape=rectangle name=blocked position=rightof anchor=done; read: command:create action=create anchor=doing,done name=blocked position=rightof shape=rectangle |

**Right but held by confidence** (476)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:connect | 108 | fo-0004: "hook Load up to Warehouse with a normal arrow" gold: action=connect from=load to=warehouse; read: command:connect action=connect from=load to=warehouse<br>fo-0004: "connect Clean to Dlq with a dotted line" gold: action=connect from=clean to=$new style=dotted arrow=none; read: command:connect action=connect arrow=none from=clean style=dotted to=$new<br>fo-0006: "connect Bastion to Nat with arrow" gold: action=connect from=$new to=nat; read: command:connect action=connect from=$new to=nat |
| held | command:set | 69 | fo-0004: "make it a navy ellipse" gold: action=set target=warehouse color=navy shape=ellipse; read: command:set action=set color=navy shape=ellipse target=warehouse<br>fo-0015: "LoginBtn blue" gold: action=set target=loginbtn color=blue; read: command:set action=set color=blue target=loginbtn<br>fo-0020: "Make Extract, Transform and Load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: command:set action=set color=blue shape=rectangle size=medium target=extract,transform,load |
| held | command:create | 45 | fo-0001: "put a gray hexagon called Switch between Fw1 and Lan" gold: action=create shape=hexagon color=gray name=switch position=between anchor=fw1,lan; read: command:create action=create anchor=fw1,lan color=gray name=switch position=between shape=hexagon<br>fo-0004: "add a small red diamond called Dlq below Clean" gold: action=create shape=diamond color=red size=small name=dlq position=below anchor=clean; read: command:create action=create anchor=clean color=red name=dlq position=below shape=diamond size=small<br>fo-0006: "create one small orange square with name Bastion near of SubnetA" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: command:create action=create anchor=subneta color=orange name=bastion position=near shape=square size=small |
| held | question:count | 40 | fo-0004: "how many rectangles are there right now" gold: ask=count shape=rectangle; read: question:count ask=count shape=rectangle<br>fo-0035: "How many connections in total now" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>fo-0047: "How many circles we have" gold: ask=count shape=circle; read: question:count ask=count shape=circle |
| held | command:arrange | 25 | fo-0010: "Card1, Card2 and Card3 should sit in a row" gold: action=arrange target=card1,card2,card3 layout=row; read: command:arrange action=arrange layout=row target=card1,card2,card3<br>fo-0031: "put them in a row" gold: action=arrange target=$new layout=row; read: command:arrange action=arrange layout=row target=$new<br>fo-0035: "Arrange Leaf1, Leaf2, Leaf3 and Leaf4 in a row" gold: action=arrange target=leaf1,leaf2,leaf3,leaf4 layout=row; read: command:arrange action=arrange layout=row target=leaf1,leaf2,leaf3,leaf4 |
| held | command:resize | 18 | fo-0005: "shrink Sidebar a bit" gold: action=resize target=sidebar; read: command:resize action=resize target=sidebar<br>fo-0032: "shrink Ecr a bit" gold: action=resize target=ecr; read: command:resize action=resize target=ecr<br>fo-0033: "I want the Done more big" gold: action=resize target=done; read: command:resize action=resize target=done |
| held | command:move | 18 | fo-0010: "Logo goes to the top left" gold: action=move target=logo position=topleft; read: command:move action=move position=topleft target=logo<br>fo-0020: "in the bottom right" gold: action=move target=audit position=bottomright; read: command:move action=move position=bottomright target=audit<br>fo-0048: "Menu to the left edge" gold: action=move target=menu position=left; read: command:move action=move position=left target=menu |
| held | question:property | 17 | fo-0042: "What's the label on Results" gold: ask=property target=results property=label; read: question:property ask=property property=label target=results<br>fo-0078: "what's the label on Cache" gold: ask=property target=cache property=label; read: question:property ask=property property=label target=cache<br>fo-0149: "can you tell me what color Sidebar is" gold: ask=property target=sidebar property=color; read: question:property ask=property property=color target=sidebar |
| held | (27 more keys; all in the JSON) | | |

**Structural holds** (7)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 2 | fo-0107: "Thumbnail" gold: -; read: command:create action=create<br>fo-0534: "wall" gold: -; read: command:create action=create |
| blocked | unresolved-reference | 1 | fo-0052: "arrange Worker and the copies in a column" gold: action=arrange target=worker,$new layout=column; read: command:arrange action=arrange layout=column |

## short3_test / test (340 messages, 432 requested: right 281, wrong 116, not done 35, extras 30; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 21 |
| actions | 48 |
| values/roles | 112 |
| calibration | 189 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 432); ok (ungated: right + would-be right of structural holds = right of every request executed: 281); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 116); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 30); ok (ungated: unread = requested - paired: 35); ok (ungated right equals the score file: 281); ok (ungated wrong equals the score file: 111); ok (ungated extras equals the score file: 27); ok (ungated unread equals the score file: 35); ok (ungated structural holds equal the score file: 8); ok (every produced request is executed, structurally held or (gated) confidence-held: 427); ok (gated: executed wrong equals the score file: 5); ok (gated: executed extras equals the score file: 1); ok (gated: structural holds equal the score file: 8); ok (gated: confidence holds equal the score file: 315); ok (gated: right executed equals the score file: 98); ok (gated: unread equals the score file: 35); ok (gated: held right + held wrong or extra = confidence holds: 315)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 16 | 0 | 0 | 5 | 21 |
| 4 wrong act | model (act head) | 30 | 18 | 0 | 0 | 48 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 10 | 0 | 0 | 0 | 10 |
| 6 wrong or missing class value | model (class head) | 41 | 11 | 0 | 0 | 52 |
| 7 wrong words tagged for a name / text key | model (token head) | 41 | 9 | 0 | 0 | 50 |

**short3_test / test, trigger seen** (138)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 16 | s3-0057: "red for check" gold: action=set target=check color=red; read: action=set color=red (the unit covers 23% of the span)<br>s3-0113: "bin done" gold: action=delete target=done; read: not done (lost: no unit on the span)<br>s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done (only a part of the span is a unit) |
| 4 wrong act | model (act head) | 30 | s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done (read as command:create)<br>s3-0035: "check under process" gold: requested: check under process; read: extra command:create action=create anchor=done position=below (read as command:create where command:move is requested)<br>s3-0057: "for check" gold: requested: red for check; read: extra command:create action=create (read as command:create where command:set is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 10 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: action=move position=center (a name written in another request or by a pronoun)<br>s3-0193: "also bigger" gold: action=resize target=check; read: action=resize (a name written in another request or by a pronoun)<br>s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 41 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle<br>s3-0005: "dotted line process to done" gold: action=connect from=process to=done style=dotted arrow=none; read: action=connect arrow=none to=done<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 |
| 7 wrong words tagged for a name / text key | model (token head) | 41 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move anchor=done position=below<br>s3-0016: "where is check?" gold: ask=property target=check property=position; read: ask=property property=position |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 4 | s3-0057: "red for check" gold: action=set target=check color=red; read: action=set color=red<br>s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: action=set color=gray<br>s3-0122: "except Done which is red" gold: action=set target=done color=red; read: not done |
| cut | (command:create) | 3 | s3-0146: "create Api" gold: action=create shape=square name=api; read: action=create shape=square<br>s3-0146: "Db squares" gold: action=create shape=square name=db; read: not done<br>s3-0252: "add Sub1" gold: action=create name=sub1 position=below anchor=process; read: not done |
| cut | (command:delete) | 1 | s3-0113: "bin done" gold: action=delete target=done; read: not done |
| cut | (command:straighten) | 1 | s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done |
| cut | (command:toFront) | 1 | s3-0131: "done on top" gold: action=tofront target=done; read: not done |
| cut | (command:undo) | 1 | s3-0137: "undo" gold: action=undo; read: not done |
| cut | (command:rename) | 1 | s3-0305: "named Gate" gold: action=rename target=check name=gate; read: not done |
| cut | (question:property) | 1 | s3-0333: "where is it" gold: ask=property target=intake property=position; read: not done |
| act | command:move read as command:create | 4 | s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done<br>s3-0035: "check under process" gold: requested: check under process; read: extra command:create action=create anchor=done position=below<br>s3-0303: "put check between start and done" gold: action=move target=check position=between anchor=start,done; read: not done |
| act | command:arrange read as command:create | 4 | s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: not done<br>s3-0093: "make a timeline with Start Process Check Done" gold: requested: make a timeline with Start Process Check Done; read: extra command:create action=create items=start process check,done template=timeline<br>s3-0264: "radial around start" gold: action=arrange layout=radial anchor=start; read: not done |
| act | command:set read as command:create | 3 | s3-0057: "for check" gold: requested: red for check; read: extra command:create action=create<br>s3-0363: "add a thick green edge around Done" gold: action=set target=done outline=green; read: not done<br>s3-0363: "add a thick green edge around Done" gold: requested: add a thick green edge around Done; read: extra command:create action=create anchor=done color=green position=near |
| act | command:rename read as command:label | 2 | s3-0087: "Begin instead of Start" gold: action=rename target=start name=begin; read: not done<br>s3-0087: "Begin instead of Start" gold: requested: Begin instead of Start; read: extra command:label action=label from=begin |
| act | command:arrange read as command:set | 2 | s3-0140: "make the existing flow into process steps with chevrons" gold: action=arrange template=process; read: not done<br>s3-0140: "make the existing flow into process steps with chevrons" gold: requested: make the existing flow into process steps with chevrons; read: extra command:set action=set |
| act | command:label read as command:connect | 2 | s3-0247: "arrow check→done: "yes"" gold: action=label from=check to=done label=yes; read: not done<br>s3-0247: "arrow check→done: "yes"" gold: requested: arrow check→done: "yes"; read: extra command:connect action=connect from=check label=yes to=done |
| act | command:create read as command:move | 2 | s3-0252: "Sub2 below Process" gold: action=create name=sub2 position=below anchor=process; read: not done<br>s3-0252: "add Sub1 and Sub2 below Process" gold: requested: Sub2 below Process; read: extra command:move action=move anchor=process position=below target=sub1,sub2 |
| act | question:property read as command:label | 2 | s3-0262: "text on the check to done arrow?" gold: ask=property property=label from=check to=done; read: not done<br>s3-0262: "text on the check to done arrow" gold: requested: text on the check to done arrow?; read: extra command:label action=label |
| ref | target | 5 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: action=move position=center<br>s3-0193: "also bigger" gold: action=resize target=check; read: action=resize<br>s3-0266: "make it a star" gold: action=set target=end shape=star; read: action=set shape=star target=done |
| ref | from | 4 | s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done<br>s3-0253: "conect procss w/ done" gold: action=connect from=process to=done; read: action=connect<br>s3-0377: "blue" gold: action=set from=start to=process color=blue; read: action=set color=blue |
| ref | to | 3 | s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check<br>s3-0377: "blue" gold: action=set from=start to=process color=blue; read: action=set color=blue<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip target=check |
| class | target | 12 | s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0076: "recolor start to navy" gold: action=set target=start color=navy; read: action=set color=navy target=mention()<br>s3-0152: "improve the layout pls" gold: action=improve target=mention(quantifier=all); read: action=improve target=mention() |
| class | template | 10 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: action=create color=blue<br>s3-0215: "show the four shapes as a timeline" gold: action=arrange template=timeline target=mention(quantifier=all); read: action=arrange |
| class | layout | 6 | s3-0098: "four squares stacked on the left" gold: action=create count=4 shape=square layout=column position=left; read: action=create count=4 layout=row position=left shape=square<br>s3-0168: "draw 4 green circles in a line along the top" gold: action=create count=4 shape=circle color=green layout=row position=top; read: action=create color=green count=4 position=bottom shape=circle<br>s3-0221: "make the flow go left to right" gold: action=arrange layout=layers direction=right; read: action=arrange direction=right layout=row |
| class | topic | 5 | s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: ask=help aspect=can topic=label<br>s3-0326: "how to delete everything" gold: ask=help topic=delete aspect=how; read: ask=help aspect=how<br>s3-0412: "what sizes can shapes be" gold: ask=help topic=size aspect=values; read: ask=help aspect=values |
| class | shape | 3 | s3-0111: "add a note under Done: needs review" gold: action=create shape=text label=needs review position=below anchor=done; read: action=create anchor=done label=needs review position=below<br>s3-0270: "make the green circle a rectangle" gold: action=set target=mention(color=green,shape=circle) shape=rectangle; read: action=set shape=circle target=mention(color=green,shape=circle)<br>s3-0379: "make check diamond yellow big" gold: action=set target=check shape=diamond color=yellow size=large; read: action=set color=yellow size=large target=check |
| class | position | 2 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5<br>s3-0168: "draw 4 green circles in a line along the top" gold: action=create count=4 shape=circle color=green layout=row position=top; read: action=create color=green count=4 position=bottom shape=circle |
| class | arrow | 2 | s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: action=connect color=gray from=process to=done<br>s3-0434: "link Done to Check, dotted, both directions" gold: action=connect from=done to=check style=dotted arrow=both; read: action=connect arrow=none from=done style=dotted to=check |
| class | fill | 1 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle |
| name | target | 24 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move anchor=done position=below<br>s3-0016: "where is check?" gold: ask=property target=check property=position; read: ask=property property=position |
| name | from | 6 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0200: "connect check to start" gold: action=connect from=check to=start; read: action=connect to=start<br>s3-0229: "redraw them as a chain Start Process Check Done" gold: action=connect from=start,process,check,done; read: action=connect |
| name | to | 5 | s3-0025: "connect Hub to Start Process Check Done" gold: action=connect from=$new to=start,process,check,done; read: action=connect from=$new to=start<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0252: "connect Process to both" gold: action=connect from=process to=$new,$new; read: action=connect from=process |
| name | about | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: ask=help about=export aspect=can<br>s3-0236: "what does SOP Lang mean" gold: ask=help about=sop lang; read: ask=help |
| name | anchor | 2 | s3-0318: "tree layout, root Start, growing down" gold: action=arrange layout=tree anchor=start direction=down; read: action=arrange direction=down layout=tree<br>s3-0336: "lay it out as layers, start at the left" gold: action=arrange layout=layers direction=right anchor=start; read: action=arrange direction=right layout=layers |
| name | scale | 1 | s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |
| name | name | 1 | s3-0109: "circle Y at 700,100" gold: action=create shape=circle name=y at=700,100; read: action=create at=700,100 shape=circle |
| name | count | 1 | s3-0166: "add a 3 by 3 grid of small squares" gold: action=create count=9 shape=square size=small layout=grid; read: action=create layout=grid shape=square size=small |
| cut | (3 more keys; all in the JSON) | | |
| act | (5 more keys; all in the JSON) | | |
| class | (6 more keys; all in the JSON) | | |
| name | (1 more keys; all in the JSON) | | |

**short3_test / test, trigger unseen** (38)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 18 | s3-0008: "can you add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: not done (read as command:create)<br>s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: requested: can you add the word "approved" next to the arrow going fro…; read: extra command:create action=create label=approved (read as command:create where command:label is requested)<br>s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done (read as command:create) |
| 6 wrong or missing class value | model (class head) | 11 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: action=set color=white shape=circle target=mention(quantifier=all,shape=circle)<br>s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create<br>s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: ask=check anchor=done comparison=bigger target=check |
| 7 wrong words tagged for a name / text key | model (token head) | 9 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label label=end |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:set read as command:create | 4 | s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done<br>s3-0112: "red outline around process" gold: requested: red outline around process; read: extra command:create action=create color=red<br>s3-0322: "take the border off process" gold: action=set target=process outline=none; read: not done |
| act | command:label read as command:create | 2 | s3-0008: "can you add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: not done<br>s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: requested: can you add the word "approved" next to the arrow going fro…; read: extra command:create action=create label=approved |
| act | command:set read as command:disconnect | 2 | s3-0181: "no border on start" gold: action=set target=start outline=none; read: not done<br>s3-0181: "no border on start" gold: requested: no border on start; read: extra command:disconnect action=disconnect |
| act | command:set read as question:check | 2 | s3-0193: "check pink" gold: action=set target=check color=pink; read: not done<br>s3-0193: "check pink" gold: requested: check pink; read: extra question:check ask=check color=pink |
| act | command:disconnect read as command:untangle | 2 | s3-0310: "no more arrows on done" gold: action=disconnect target=done; read: not done<br>s3-0310: "no more arrows on done" gold: requested: no more arrows on done; read: extra command:untangle action=untangle target=mention(quantifier=all) |
| act | command:resize read as question:count | 2 | s3-0365: "double check's size" gold: action=resize target=check; read: not done<br>s3-0365: "double check's size" gold: requested: double check's size; read: extra question:count ask=count |
| act | command:move read as command:toFront | 2 | s3-0516: "start should be on top" gold: action=move target=start position=top; read: not done<br>s3-0516: "start should be on top" gold: requested: start should be on top; read: extra command:toFront action=tofront target=start |
| act | fact: read as command:create | 2 | s3-0517: "check lives in the top right" gold: target=check position=topright; read: not done<br>s3-0517: "check lives in the top right" gold: requested: check lives in the top right; read: extra command:create action=create position=topright |
| class | outline | 4 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: action=set color=white shape=circle target=mention(quantifier=all,shape=circle)<br>s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black target=outline<br>s3-0170: "outline done black" gold: action=set target=done outline=black; read: action=set color=black target=outline |
| class | template | 2 | s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create<br>s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 position=center |
| class | topic | 2 | s3-0155: "which colors can i use" gold: ask=help topic=color aspect=values; read: ask=help aspect=values topic=size<br>s3-0216: "whats the difference between label and name" gold: ask=help topic=label; read: ask=help topic=text |
| class | position | 1 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: ask=check anchor=done comparison=bigger target=check |
| class | property | 1 | s3-0358: "what is the outline color of process" gold: ask=property target=process property=outline; read: ask=property property=color target=process |
| class | layout | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange layout=organic |
| class | direction | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange layout=organic |
| name | target | 5 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label label=end |
| name | to | 2 | s3-0348: "check -> done should be labeled yes" gold: action=label from=check to=done label=yes; read: action=label from=check label=yes<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check |
| name | from | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check |
| name | label | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check |
| name | count | 1 | s3-0396: "twelve circles in a circle" gold: action=create count=12 shape=circle layout=circle; read: action=create layout=circle shape=circle |
| name | linked | 1 | s3-0422: "Done and Start are connected" gold: target=done linked=start; read: target=done |

**short3_test / test, trigger no request** (5)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 5 | s3-0074: "hub and spoke" gold: -; read: extra command:create action=create (partial overlap with a requested action: 28% of it)<br>s3-0119: "tidy the arrows" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) (partial overlap with a requested action: 43% of it)<br>s3-0311: "Code" gold: -; read: extra command:create action=create name=code (partial overlap with a requested action: 12% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 4 | s3-0074: "hub and spoke" gold: -; read: extra command:create action=create<br>s3-0311: "Code" gold: -; read: extra command:create action=create name=code<br>s3-0311: "Data" gold: -; read: extra command:create action=create anchor=$new name=data position=rightof |
| cut | command:improve | 1 | s3-0119: "tidy the arrows" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) |

### short3_test / test at the cost-10 threshold (0.9150)

Executed: right 98, wrong 5, extras 1. Structural holds 8 ({"blocked":7,"dependency":1}; 0 of them would have been right). Confidence holds 315: right 183, wrong or extra 132. Unread 35.

**Executed wrong, by first cause** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 1 | s3-0252: "add Sub1 and Sub2 below Process" gold: -; read: extra command:move action=move anchor=process position=below target=sub1,sub2 (confidence 0.965; extra) |
| 6 wrong or missing class value | model (class head) | 3 | s3-0293: "trash the small squares" gold: action=delete target=mention(quantifier=all,shape=square,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=square) (confidence 0.921; wrong)<br>s3-0379: "make check diamond yellow big" gold: action=set target=check shape=diamond color=yellow size=large; read: command:set action=set color=yellow size=large target=check (confidence 0.951; wrong)<br>s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: question:help ask=help aspect=how topic=text (confidence 0.925; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help about=export aspect=can (confidence 0.940; wrong)<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db (confidence 0.990; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:create read as command:move | 1 | s3-0252: "add Sub1 and Sub2 below Process" gold: -; read: extra command:move action=move anchor=process position=below target=sub1,sub2 |
| class | target | 1 | s3-0293: "trash the small squares" gold: action=delete target=mention(quantifier=all,shape=square,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=square) |
| class | shape | 1 | s3-0379: "make check diamond yellow big" gold: action=set target=check shape=diamond color=yellow size=large; read: command:set action=set color=yellow size=large target=check |
| class | topic | 1 | s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: question:help ask=help aspect=how topic=text |
| name | about | 1 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help about=export aspect=can |
| name | from | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |
| name | to | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |

**Right but held by confidence** (183)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:set | 21 | s3-0049: "everything black" gold: action=set target=mention(quantifier=all) color=black; read: command:set action=set color=black target=mention(quantifier=all)<br>s3-0078: "turn the diamond pink" gold: action=set target=mention(shape=diamond) color=pink; read: command:set action=set color=pink target=mention(shape=diamond)<br>s3-0124: "set process color to magenta" gold: action=set target=process color=magenta; read: command:set action=set color=magenta target=process |
| held | command:create | 20 | s3-0018: "process steps: Plan, Build, Test, Ship" gold: action=create template=process items=plan,build,test,ship; read: command:create action=create items=plan,build,test,ship template=process<br>s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: command:create action=create count=4 template=steps<br>s3-0022: "square top left" gold: action=create shape=square position=topleft; read: command:create action=create position=topleft shape=square |
| held | command:connect | 13 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: command:connect action=connect from=start to=check<br>s3-0109: "join them" gold: action=connect from=$new to=$new; read: command:connect action=connect from=$new to=$new<br>s3-0116: "Can you connect Done back to Start with a blue dashed arrow" gold: action=connect from=done to=start color=blue style=dashed; read: command:connect action=connect color=blue from=done style=dashed to=start |
| held | command:move | 13 | s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: command:move action=move anchor=check position=below target=done<br>s3-0056: "shift Process right a bit" gold: action=move target=process direction=right; read: command:move action=move direction=right target=process<br>s3-0082: "move it right" gold: action=move target=check direction=right; read: command:move action=move direction=right target=check |
| held | command:resize | 12 | s3-0082: "make check smaller" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0257: "Process smaller" gold: action=resize target=process; read: command:resize action=resize target=process<br>s3-0281: "make Done bigger" gold: action=resize target=done; read: command:resize action=resize target=done |
| held | command:arrange | 10 | s3-0017: "arrange it like an org chart" gold: action=arrange layout=tree; read: command:arrange action=arrange layout=tree<br>s3-0040: "radial layout around Check" gold: action=arrange layout=radial anchor=check; read: command:arrange action=arrange anchor=check layout=radial<br>s3-0136: "put all shapes in a row" gold: action=arrange target=mention(quantifier=all) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all) |
| held | command:disconnect | 8 | s3-0125: "delete all arrows" gold: action=disconnect quantifier=all; read: command:disconnect action=disconnect quantifier=all<br>s3-0148: "remove the arrow between check and done" gold: action=disconnect from=check to=done; read: command:disconnect action=disconnect from=check to=done<br>s3-0171: "remove all links" gold: action=disconnect quantifier=all; read: command:disconnect action=disconnect quantifier=all |
| held | question:help | 8 | s3-0133: "how do you move something to a corner" gold: ask=help topic=move aspect=how; read: question:help ask=help aspect=how topic=move<br>s3-0145: "can I group shapes" gold: ask=help topic=group aspect=can; read: question:help ask=help aspect=can topic=group<br>s3-0158: "what layouts are there" gold: ask=help topic=layout aspect=values; read: question:help ask=help aspect=values topic=layout |
| held | (31 more keys; all in the JSON) | | |

**Structural holds** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 7 | s3-0025: "connect Hub to Start Process Check Done" gold: action=connect from=$new to=start,process,check,done; read: command:connect action=connect from=$new to=start<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: command:create action=create count=5<br>s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: question:help ask=help aspect=can topic=label |
| blocked | unresolved-reference | 1 | s3-0303: "put check between start and done" gold: -; read: command:create action=create |

## nl_a_development / development (300 messages, 392 requested: right 46, wrong 219, not done 127, extras 195; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 216 |
| actions | 157 |
| values/roles | 168 |
| calibration | 39 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 392); ok (ungated: right + would-be right of structural holds = right of every request executed: 46); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 219); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 195); ok (ungated: unread = requested - paired: 127); ok (ungated right equals the score file: 44); ok (ungated wrong equals the score file: 170); ok (ungated extras equals the score file: 173); ok (ungated unread equals the score file: 127); ok (ungated structural holds equal the score file: 73); ok (every produced request is executed, structurally held or (gated) confidence-held: 460); ok (gated: executed wrong equals the score file: 1); ok (gated: executed extras equals the score file: 3); ok (gated: structural holds equal the score file: 73); ok (gated: confidence holds equal the score file: 374); ok (gated: right executed equals the score file: 9); ok (gated: unread equals the score file: 127); ok (gated: held right + held wrong or extra = confidence holds: 374)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 45 | 60 | 0 | 35 | 140 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 76 | 76 |
| 4 wrong act | model (act head) | 78 | 79 | 0 | 0 | 157 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 56 | 26 | 0 | 0 | 82 |
| 6 wrong or missing class value | model (class head) | 27 | 22 | 0 | 0 | 49 |
| 7 wrong words tagged for a name / text key | model (token head) | 29 | 8 | 0 | 0 | 37 |

**nl_a_development / development, trigger seen** (235)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 45 | nl-01-005: "conect it" gold: action=connect from=$new to=switch; read: action=connect from=$new (the unit covers 32% of the span)<br>nl-01-014: "Each app can reach the same database. The database should be lower down, visibly inside data" gold: action=create name=database position=inside anchor=data; read: not done (only a part of the span is a unit)<br>nl-01-020: "that direct route to deployment gone" gold: action=disconnect from=build to=deploy; read: action=disconnect (the unit covers 0% of the span) |
| 4 wrong act | model (act head) | 78 | nl-01-014: "then go to two identical app instances" gold: action=create label=app instances count=2; read: not done (read as command:connect)<br>nl-01-014: "then go to two identical app instances" gold: requested: then go to two identical app instances; read: extra command:connect action=connect (read as command:connect where command:create is requested)<br>nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: not done (read as command:move) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 56 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move (a name or description the message does not write)<br>nl-01-029: "both active states to be orange" gold: action=set target=running,paused color=orange; read: action=set color=orange target=$new (a name or description the message does not write)<br>nl-01-030: "After three failures we give up and go to Disconnected. Put the three-failure condition on the arrow" gold: action=connect from=retrying to=disconnected label=three failures; read: action=connect from=ready to=disconnected (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 27 | nl-01-019: "After the checks we need a decision: approved for customers?" gold: action=create label=approved for customers? position=rightof anchor=tests; read: action=create anchor=tests label=approved for customers? position=between<br>nl-01-034: "need a small 'Forgot password?' link beside the password field" gold: action=create label=forgot password? size=small position=near anchor=password; read: action=create label=forgot password? size=small<br>nl-01-045: "add call DBA before that restart box" gold: action=create label=call dba position=above anchor=restart; read: action=create anchor=db name=dba position=rightof shape=rectangle |
| 7 wrong words tagged for a name / text key | model (token head) | 29 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: action=create anchor=switch position=leftof<br>nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect to=deploy<br>nl-01-019: "no goes back to Commit" gold: action=connect from=$new to=commit label=no; read: action=connect from=$new to=commit |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 20 | nl-01-014: "Each app can reach the same database. The database should be lower down, visibly inside data" gold: action=create name=database position=inside anchor=data; read: not done<br>nl-01-030: "We start Disconnected" gold: action=create name=disconnected; read: not done<br>nl-01-034: "Under Email address, add a note saying we'll send a verification message if they change it" gold: action=create shape=text label=we'll send a verification message if they change it position=below anchor=email; read: action=create anchor=email position=below shape=text |
| cut | (command:connect) | 6 | nl-01-005: "conect it" gold: action=connect from=$new to=switch; read: action=connect from=$new<br>nl-02-047: "after the manager" gold: action=connect from=manager to=$new; read: not done<br>nl-04-047: "The path should go through that box" gold: action=connect from=bake,$new,ice; read: action=connect from=bake to=ice |
| cut | (command:label) | 6 | nl-01-027: "on pause" gold: action=label from=running to=paused label=pause; read: not done<br>nl-03-024: "say forty minutes" gold: action=label target=roast label=forty minutes; read: action=label target=roast<br>nl-08-038: "Tuesday nobody yet. Can it say that" gold: action=label target=tue label=nobody yet; read: action=label label=tuesday |
| cut | (command:set) | 3 | nl-03-045: "Make his eyes green like mine. No blue" gold: action=set target=eyel,eyer color=blue; read: action=set color=blue target=no<br>nl-07-021: "Change for me the colour of middle station, I want it in red" gold: action=set target=welding color=red; read: action=set color=red<br>nl-11-027: "dotted is good" gold: action=set from=mention(label=mill road) to=schools style=dotted; read: action=set style=dotted |
| cut | (command:move) | 2 | nl-04-027: "Our welcome desk and its Start here sign belong down in the lower left corner. Please take them there together" gold: action=move target=checkin position=bottomleft; read: action=move target=sign<br>nl-12-025: "put the guards around the gate with the torches" gold: action=move target=guard,guard2,guard3,guard4,torch,torch2 position=near anchor=gate; read: not done |
| cut | (command:group) | 2 | nl-10-047: "those three on the left are all things we'd actually do there so i want them to belong together, call it acti…" gold: action=group target=beach,hike,museum name=activities; read: action=group name=activities<br>nl-10-050: "all the fun stuff in a group so we can see it apart from the money side. So everything except Budget, and not…" gold: action=group target=beach,hike,museum name=activities; read: not done |
| cut | (command:disconnect) | 1 | nl-01-020: "that direct route to deployment gone" gold: action=disconnect from=build to=deploy; read: action=disconnect |
| cut | command:set | 1 | nl-03-045: "Make his eyes green like" gold: requested: Make his eyes green like mine. No blue; read: extra command:set action=set color=green |
| act | command:create read as command:move | 23 | nl-01-019: "Put it beside them with a question mark" gold: action=create label=security scan? position=near anchor=tests; read: not done<br>nl-01-019: "Put it beside them with a question mark" gold: requested: Put it beside them with a question mark; read: extra command:move action=move anchor=$new position=near target=$new<br>nl-01-020: "Put the box back between Build and Deploy" gold: action=create name=tests position=between anchor=build,deploy; read: not done |
| act | command:create read as command:connect | 8 | nl-01-014: "then go to two identical app instances" gold: action=create label=app instances count=2; read: not done<br>nl-01-014: "then go to two identical app instances" gold: requested: then go to two identical app instances; read: extra command:connect action=connect<br>nl-01-026: "Start with Idle" gold: action=create name=idle; read: not done |
| act | command:move read as command:create | 6 | nl-01-034: "move Save changes under the fields" gold: action=move target=save position=below anchor=email,password; read: not done<br>nl-01-034: "move Save changes under the fields" gold: requested: move Save changes under the fields; read: extra command:create action=create anchor=fields position=below<br>nl-04-028: "put the check in stuff bottom left" gold: action=move target=checkin position=bottomleft; read: not done |
| act | command:create read as command:set | 5 | nl-03-031: "Give Planets a little one off it for Mars" gold: action=create name=mars size=small linked=planets; read: not done<br>nl-03-031: "Give Planets a little one off it for Mars" gold: requested: Give Planets a little one off it for Mars; read: extra command:set action=set to=mars<br>nl-05-015: "shade the sitting bit pale yellow" gold: action=create layer=zone color=yellow fill=light position=near anchor=bench; read: not done |
| act | command:set read as command:disconnect | 4 | nl-01-037: "Lose the border" gold: action=set target=forgot outline=none; read: not done<br>nl-01-037: "Lose the border" gold: requested: Lose the border; read: extra command:disconnect action=disconnect from=mention() to=mention()<br>nl-06-020: "Fix the arrow" gold: action=set arrow=forward from=balcony to=pit; read: not done |
| act | command:label read as command:move | 4 | nl-06-044: "Put it at 12:30" gold: action=label target=lunch label=12:30 lunch; read: not done<br>nl-06-044: "shift the workshop to 1:30" gold: action=label target=workshop label=1:30 workshop; read: not done<br>nl-06-044: "Put it at 12:30" gold: requested: Put it at 12:30; read: extra command:move action=move |
| act | command:disconnect read as command:label | 2 | nl-02-044: "take it out only on the travel branch" gold: action=disconnect from=ceo to=travel; read: not done<br>nl-02-044: "take it out only on the travel" gold: requested: take it out only on the travel branch; read: extra command:label action=label |
| act | command:connect read as command:move | 2 | nl-02-049: "Show the request going upwards, stopping at the committee" gold: action=connect from=student,supervisor,mention(label=school committee); read: not done<br>nl-02-049: "Show the request going upwards," gold: requested: Show the request going upwards, stopping at the committee; read: extra command:move action=move position=top |
| ref | target | 32 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move<br>nl-01-029: "both active states to be orange" gold: action=set target=running,paused color=orange; read: action=set color=orange target=$new<br>nl-01-034: "line up its left edge with theirs" gold: action=align target=email,password,save direction=left; read: action=align target=$new |
| ref | from | 14 | nl-01-030: "After three failures we give up and go to Disconnected. Put the three-failure condition on the arrow" gold: action=connect from=retrying to=disconnected label=three failures; read: action=connect from=ready to=disconnected<br>nl-02-004: "Colour that urgent route red. Actually orange" gold: action=set from=triage to=assessment color=orange; read: action=set color=orange target=text1<br>nl-02-031: "Connect each document to the claim with a plain line" gold: action=connect from=mention(label=1998 transfer),survey,mention(label=email chain) to=mention(label=disputed boundary) …; read: action=connect arrow=none from=$new to=claim |
| ref | to | 11 | nl-02-004: "Colour that urgent route red. Actually orange" gold: action=set from=triage to=assessment color=orange; read: action=set color=orange target=text1<br>nl-02-009: "have both lines meet at the bed request" gold: action=connect from=$new to=bedrequest label=planned admissions; read: action=connect from=$new to=$new<br>nl-02-031: "Connect each document to the claim with a plain line" gold: action=connect from=mention(label=1998 transfer),survey,mention(label=email chain) to=mention(label=disputed boundary) …; read: action=connect arrow=none from=$new to=claim |
| ref | anchor | 8 | nl-01-003: "The red one needs to sit between the two wireless boxes" gold: action=move target=firewall position=between anchor=staffwifi,guestwifi; read: action=move<br>nl-02-031: "Below the claim put a separate issue, access to the lane" gold: action=create label=access to the lane position=below anchor=mention(label=disputed boundary); read: action=create anchor=claim label=access to the lane position=below<br>nl-03-024: "underneath it put check with a fork" gold: action=create shape=text label=check with a fork position=below anchor=roast; read: action=create anchor=$new label=fork position=below |
| ref | linked | 1 | nl-03-032: "Another for Saturn" gold: action=create name=saturn size=small linked=planets; read: action=create |
| class | position | 12 | nl-01-019: "After the checks we need a decision: approved for customers?" gold: action=create label=approved for customers? position=rightof anchor=tests; read: action=create anchor=tests label=approved for customers? position=between<br>nl-01-034: "need a small 'Forgot password?' link beside the password field" gold: action=create label=forgot password? size=small position=near anchor=password; read: action=create label=forgot password? size=small<br>nl-01-045: "add call DBA before that restart box" gold: action=create label=call dba position=above anchor=restart; read: action=create anchor=db name=dba position=rightof shape=rectangle |
| class | shape | 8 | nl-02-036: "How many documents link directly to the allegation" gold: ask=count shape=rectangle linked=allegation; read: ask=count<br>nl-03-030: "Write serves six at the top. Four" gold: action=create shape=text label=serves four position=top; read: action=create position=top<br>nl-03-034: "How many things have I got off Planets" gold: ask=count shape=any linked=planets; read: ask=count |
| class | target | 3 | nl-11-012: "call the orange thing Flame" gold: action=rename target=mention(color=orange,shape=diamond) name=flame; read: action=rename name=flame target=mention(color=orange)<br>nl-11-014: "smaller than the name though" gold: action=resize target=mention(recency=newest); read: action=resize<br>nl-11-033: "write Zone 2 on it" gold: action=label target=mention(color=yellow,layer=zone) label=zone 2; read: action=label label=zone 2 target=rectangle1 |
| class | anchor | 2 | nl-05-020: "archive above the guard room" gold: action=create name=archive position=above anchor=mention(label=guard room); read: action=create<br>nl-08-008: "put a little table beside the globe, a square would do nicely" gold: action=create shape=square size=small name=table position=near anchor=globe; read: action=create anchor=mention() position=near size=small |
| class | color | 1 | nl-02-046: "count them" gold: ask=count color=orange; read: ask=count |
| class | from | 1 | nl-05-033: "hook the guard room up to the street exit" gold: action=connect from=mention(label=guard room) to=exit; read: action=connect from=start,crown |
| class | topic | 1 | nl-08-040: "what does fill even mean" gold: ask=help topic=fill; read: ask=help |
| class | object | 1 | nl-08-049: "draw one on the left side, a small gray box" gold: action=create shape=rectangle object=door size=small color=gray position=left; read: action=create color=gray position=left shape=rectangle size=small |
| name | label | 9 | nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect to=deploy<br>nl-01-019: "no goes back to Commit" gold: action=connect from=$new to=commit label=no; read: action=connect from=$new to=commit<br>nl-01-030: "a successful retry goes to Ready again" gold: action=connect from=retrying to=ready label=successful retry; read: action=connect from=retrying to=ready |
| name | target | 9 | nl-01-048: "Put the backup under the primary" gold: action=move target=backup position=below anchor=primary; read: action=move anchor=primary position=below<br>nl-03-010: "Label the bulb Lamp" gold: action=label target=bulb label=lamp; read: action=label label=lamp<br>nl-03-015: "The box that says Dad should say Martin" gold: action=label target=dad label=martin; read: action=label label=martin |
| name | name | 4 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: action=create anchor=switch position=leftof<br>nl-09-012: "make a shark" gold: action=create name=shark; read: action=create<br>nl-09-027: "bar bottom right" gold: action=create name=bar position=bottomright; read: action=create position=bottomright |
| name | from | 4 | nl-01-019: "Yes goes to Deploy" gold: action=connect from=$new to=deploy label=yes; read: action=connect to=deploy<br>nl-03-038: "Join food and games together" gold: action=connect from=food to=games; read: action=connect from=food,games<br>nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: action=label label=7 min target=depot,market |
| name | anchor | 3 | nl-01-038: "underneath uh a search bar full width" gold: action=create label=search bar position=below anchor=$new; read: action=create anchor=basket label=search bar position=below<br>nl-05-016: "put “keep clear” beside the hatch" gold: action=create shape=text label=keep clear position=near anchor=hatch; read: action=create anchor=rectangle1 label=keep clear position=near shape=text<br>nl-11-020: "then Schools" gold: action=create name=schools position=rightof anchor=$new; read: action=create anchor=hospital name=schools position=rightof |
| name | to | 2 | nl-03-038: "Join food and games together" gold: action=connect from=food to=games; read: action=connect from=food,games<br>nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: action=label label=7 min target=depot,market |
| name | linked | 2 | nl-04-050: "After Bake please make Cool" gold: action=create name=cool linked=bake; read: action=create anchor=bake name=cool position=rightof<br>nl-06-006: "after raise P O um there should be a wait for finance" gold: action=create label=wait for finance linked=raise; read: action=create label=wait for finance |
| cut | (4 more keys; all in the JSON) | | |
| act | (13 more keys; all in the JSON) | | |

**nl_a_development / development, trigger unseen** (195)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 60 | nl-01-004: "Give them some space" gold: action=respace target=guestwifi,staffwifi comparison=bigger; read: not done (lost: no unit on the span)<br>nl-01-006: "There's nowhere on this drawing for the phones. We have six of them on the same switch" gold: action=create name=phones count=6 linked=switch; read: not done (lost: no unit on the span)<br>nl-01-014: "data" gold: action=create layer=zone name=data; read: action=create (merged: the unit holds 2 requests) |
| 4 wrong act | model (act head) | 79 | nl-01-014: "Requests come in at the top" gold: action=create name=requests position=top; read: not done (read as command:move)<br>nl-01-014: "Requests come in at the top" gold: requested: Requests come in at the top; read: extra command:move action=move position=top target=requests (read as command:move where command:create is requested)<br>nl-01-017: "enclose each in his own fence" gold: requested: enclose each in his own fence; read: extra command:connect action=connect (read as command:connect where command:create is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 26 | nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: action=create label=load balancer (a name written in another request or by a pronoun)<br>nl-01-021: "The step immediately before the green one needs an owner: Release captain" gold: action=label target=signoff label=release captain; read: action=label label=release captain (a name or description the message does not write)<br>nl-01-028: "stop from either active state returns to Idle" gold: action=connect from=running,paused to=idle label=stop; read: action=connect from=mention() to=idle (a name or description the message does not write) |
| 6 wrong or missing class value | model (class head) | 22 | nl-01-014: "Three plain areas is enough: public entry" gold: action=create layer=zone label=public entry; read: action=create count=3<br>nl-01-014: "application" gold: action=create layer=zone name=application; read: action=create name=application<br>nl-02-031: "the survey" gold: action=create name=survey position=right; read: action=create |
| 7 wrong words tagged for a name / text key | model (token head) | 8 | nl-02-049: "the school committee above that" gold: action=create label=school committee position=above anchor=$new; read: action=create anchor=supervisor label=school committee position=above<br>nl-04-050: "from Cool continue to Ice" gold: action=connect from=cool to=ice; read: action=connect from=$new to=ice<br>nl-07-020: "the welding station stand out in red" gold: action=set target=welding color=red; read: action=set color=red |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:create) | 22 | nl-01-006: "There's nowhere on this drawing for the phones. We have six of them on the same switch" gold: action=create name=phones count=6 linked=switch; read: not done<br>nl-01-014: "data" gold: action=create layer=zone name=data; read: action=create<br>nl-01-017: "enclose each in his own fence" gold: action=create layer=zone count=2 anchor=test,prod; read: action=create name=production |
| cut | (command:connect) | 14 | nl-01-023: "rollback shoud go back to last good relase" gold: action=connect from=rollback to=lastgood; read: action=connect<br>nl-01-026: "start takes Idle to Running" gold: action=connect from=idle to=running label=start; read: action=connect to=running<br>nl-01-027: "resume goes back" gold: action=connect from=paused to=running label=resume; read: action=connect from=running to=paused |
| cut | (command:move) | 5 | nl-08-003: "desk is by the door not middle, door is at bottom" gold: action=move target=desk position=bottom; read: not done<br>nl-09-050: "The street shall run under the houses through" gold: action=move target=road position=below anchor=house,house2,house3,house4; read: not done<br>nl-12-010: "there's an empty desk right there" gold: action=move target=tom position=ontop anchor=desk2; read: action=move target=tom |
| cut | (command:disconnect) | 3 | nl-01-017: "The arrow between them gives a wrong idea, there is no circulation of data from testing into production" gold: action=disconnect from=prod to=test; read: not done<br>nl-01-023: "not all way to commit" gold: action=disconnect from=commit to=rollback; read: not done<br>nl-04-049: "replacing that direct arrow" gold: action=disconnect from=bake to=ice; read: not done |
| cut | (command:respace) | 2 | nl-01-004: "Give them some space" gold: action=respace target=guestwifi,staffwifi comparison=bigger; read: not done<br>nl-11-009: "theyre all bunched up" gold: action=respace target=mention(quantifier=all,shape=star) comparison=bigger; read: not done |
| cut | (command:set) | 2 | nl-02-026: "The dashed line looks like an optional step" gold: action=set from=remove to=log style=solid; read: not done<br>nl-08-037: "Dr Barbu's boxes green" gold: action=set target=mention(label=dr barbu,quantifier=all,shape=rectangle) color=green; read: action=set color=green target=fri |
| cut | (command:duplicate) | 2 | nl-04-044: "i want two of him the new one on the right" gold: action=duplicate target=alien position=rightof anchor=alien; read: not done<br>nl-06-040: "a little picture of the broken vase" gold: action=duplicate target=vase position=inside anchor=$new; read: not done |
| cut | (command:label) | 2 | nl-06-037: "At the second picture the grandmother is with back to us. We must not see her eyes until the third picture. P…" gold: action=label target=grandma2 label=with back to us; read: not done<br>nl-08-010: "the yes is to the reimbursement" gold: action=label from=coverage to=reimbursement label=yes; read: not done |
| act | command:create read as command:connect | 14 | nl-01-017: "enclose each in his own fence" gold: requested: enclose each in his own fence; read: extra command:connect action=connect<br>nl-01-027: "Running can go to Paused" gold: action=create name=paused linked=running; read: not done<br>nl-01-030: "A connect request takes us to Connecting" gold: action=create name=connecting linked=disconnected; read: not done |
| act | command:create read as command:move | 12 | nl-01-014: "Requests come in at the top" gold: action=create name=requests position=top; read: not done<br>nl-01-014: "Requests come in at the top" gold: requested: Requests come in at the top; read: extra command:move action=move position=top target=requests<br>nl-02-049: "their supervisor above" gold: requested: their supervisor above; read: extra command:move action=move target=supervisor |
| act | command:connect read as command:create | 6 | nl-05-028: "thin corridor between them" gold: action=connect from=vault to=archive; read: not done<br>nl-05-028: "thin corridor between them" gold: requested: thin corridor between them; read: extra command:create action=create<br>nl-11-043: "refund comes off that" gold: action=connect from=returned to=refund; read: not done |
| act | command:resize read as command:set | 4 | nl-01-034: "make it shallower" gold: action=resize target=header; read: not done<br>nl-01-034: "make it shallower" gold: requested: make it shallower; read: extra command:set action=set<br>nl-09-039: "the watter one bigr" gold: action=resize target=water; read: not done |
| act | command:move read as command:create | 4 | nl-07-044: "the one that says leakage check goes before the split" gold: action=move target=cell3 position=above anchor=cell2; read: not done<br>nl-07-044: "leakage check goes before the split" gold: requested: the one that says leakage check goes before the split; read: extra command:create action=create<br>nl-08-047: "middle box up over the first one" gold: action=move target=budget position=above anchor=summary; read: not done |
| act | question:path read as command:connect | 2 | nl-01-033: "Can you get from the one at the bottom back to Idle" gold: ask=path from=recovering to=idle; read: not done<br>nl-01-033: "Can you get from the one at the bottom back to Idle without passing through Error" gold: requested: Can you get from the one at the bottom back to Idle; read: extra command:connect action=connect from=mention() to=idle |
| act | command:duplicate read as command:create | 2 | nl-01-034: "a second version alongside this" gold: action=duplicate target=mention(quantifier=all); read: not done<br>nl-01-034: "a second version alongside this showing an invalid email" gold: requested: a second version alongside this; read: extra command:create action=create anchor=$new label=invalid position=near |
| act | command:set read as command:create | 2 | nl-01-037: "make it look like a line of text under Password" gold: action=set target=forgot shape=text; read: not done<br>nl-01-037: "make it look like a line of text under Password" gold: requested: make it look like a line of text under Password; read: extra command:create action=create anchor=password position=below |
| ref | anchor | 10 | nl-01-034: "the error message actually below that field" gold: action=create shape=text label=error message position=below anchor=mention(label=email address,recency=newest); read: action=create anchor=$new position=below<br>nl-02-005: "then we wait for confirmation" gold: action=create shape=rectangle label=wait for confirmation position=below anchor=bed; read: action=create<br>nl-02-020: "The scale must be nearer of the bottom wall" gold: action=move target=scale position=near anchor=bottomwall; read: action=move |
| ref | target | 9 | nl-01-021: "The step immediately before the green one needs an owner: Release captain" gold: action=label target=signoff label=release captain; read: action=label label=release captain<br>nl-02-018: "Those three narrow grey rectangles can be one group called Cold storage" gold: action=group target=chillera,chillerb,chillerc; read: action=group<br>nl-04-029: "the grouped desk and sign that need relocating to the bottom-left corner" gold: action=move target=checkin position=bottomleft; read: action=move position=bottomleft target=mention() |
| ref | from | 6 | nl-01-028: "stop from either active state returns to Idle" gold: action=connect from=running,paused to=idle label=stop; read: action=connect from=mention() to=idle<br>nl-03-023: "That last arrow is the wrong way round" gold: action=reverse from=cake to=oven; read: action=reverse target=mention(quantifier=all)<br>nl-05-008: "hose from the butt to both beds, dotted" gold: action=connect style=dotted from=mention(label=water butt) to=herbs,tomatoes; read: action=connect from=butt style=dotted to=circle3 |
| ref | to | 4 | nl-02-047: "both have to finish before we get to the purchase order" gold: action=connect from=$new to=po; read: action=connect<br>nl-03-023: "That last arrow is the wrong way round" gold: action=reverse from=cake to=oven; read: action=reverse target=mention(quantifier=all)<br>nl-05-008: "hose from the butt to both beds, dotted" gold: action=connect style=dotted from=mention(label=water butt) to=herbs,tomatoes; read: action=connect from=butt style=dotted to=circle3 |
| ref | linked | 1 | nl-01-014: "hit a load balancer" gold: action=create label=load balancer linked=requests; read: action=create label=load balancer |
| class | position | 7 | nl-02-031: "the survey" gold: action=create name=survey position=right; read: action=create<br>nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=bench position=rightof shape=square size=small<br>nl-05-024: "key in the hall, tiny gold diamond" gold: action=create shape=diamond size=tiny color=gold name=key position=inside anchor=hall; read: action=create color=gold name=key shape=diamond size=tiny |
| class | shape | 4 | nl-05-010: "little round table in front of the bench" gold: action=create shape=circle size=small name=table position=near anchor=bench; read: action=create anchor=bench position=rightof shape=square size=small<br>nl-08-008: "a heading across the top would finish it off: Our Library, A Plan for Volunteers" gold: action=create shape=text label=our library, a plan for volunteers position=top; read: action=create items=library items2=plan,volunteers position=top<br>nl-08-035: "under Wed the same" gold: action=create shape=rectangle label=dr barbu position=below anchor=wed; read: action=create anchor=wed position=below |
| class | layer | 3 | nl-01-014: "Three plain areas is enough: public entry" gold: action=create layer=zone label=public entry; read: action=create count=3<br>nl-01-014: "application" gold: action=create layer=zone name=application; read: action=create name=application<br>nl-11-032: "pale yellow box behind the last three" gold: action=create shape=rectangle color=yellow fill=light layer=zone; read: action=create color=yellow shape=rectangle |
| class | target | 3 | nl-08-008: "the large stacks you have drawn at the upper right should be named the Local History Collection" gold: action=label target=stacks label=local history collection; read: action=label label=local history collection target=mention()<br>nl-11-003: "white then" gold: action=set target=mention(recency=newest) color=white; read: action=set color=white target=circle2<br>nl-11-005: "bit bigger" gold: action=resize target=mention(recency=newest); read: action=resize target=diamond1 |
| class | from | 2 | nl-05-021: "hall to archive" gold: action=connect from=hall to=archive; read: action=connect from=mention() to=archive<br>nl-09-012: "the shark eats the big fish and the big fish eats the litle fish" gold: action=connect from=shark,mention(label=fish,size=large),mention(label=fish,size=small); read: action=connect from=$new to=$new |
| class | layout | 1 | nl-05-012: "3 chairs round it" gold: action=create label=chairs count=3 position=near anchor=table layout=circle; read: action=create anchor=table count=3 position=near |
| class | color | 1 | nl-05-029: "vault dark blue" gold: action=set target=vault color=navy; read: action=set color=blue target=vault |
| class | object | 1 | nl-09-002: "a sun up in one corner" gold: action=create object=sun; read: action=create position=center |
| name | target | 3 | nl-07-020: "the welding station stand out in red" gold: action=set target=welding color=red; read: action=set color=red<br>nl-09-011: "who eats the mouse" gold: ask=neighbors target=mouse; read: ask=neighbors<br>nl-11-040: "shipped green" gold: action=set target=shipped color=green; read: action=set color=green target=packing,shipped |
| name | label | 2 | nl-08-011: "Equipment 28%" gold: action=label target=equipment label=28%; read: action=label label=28 target=equipment<br>nl-09-012: "a litle fish" gold: action=create size=small label=fish; read: action=create shape=rectangle size=small |
| name | anchor | 1 | nl-02-049: "the school committee above that" gold: action=create label=school committee position=above anchor=$new; read: action=create anchor=supervisor label=school committee position=above |
| name | from | 1 | nl-04-050: "from Cool continue to Ice" gold: action=connect from=cool to=ice; read: action=connect from=$new to=ice |
| name | name | 1 | nl-11-041: "Refund box under Payment" gold: action=create shape=rectangle name=refund position=below anchor=payment; read: action=create anchor=payment position=below shape=rectangle |
| cut | (8 more keys; all in the JSON) | | |
| act | (19 more keys; all in the JSON) | | |
| class | (2 more keys; all in the JSON) | | |

**nl_a_development / development, trigger no request** (111)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 35 | nl-01-014: "Each app can reach the same database" gold: -; read: extra command:connect action=connect to=$new (partial overlap with a requested action: 39% of it)<br>nl-01-014: "The database should be lower down" gold: -; read: extra command:move action=move position=bottom target=database (partial overlap with a requested action: 36% of it)<br>nl-01-017: "circulation of data from testing" gold: -; read: extra command:duplicate action=duplicate (partial overlap with a requested action: 31% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 76 | nl-01-025: "Make staging like production" gold: -; read: extra command:set action=set target=staging (no requested action on this text)<br>nl-01-029: "Paused is still blue" gold: -; read: extra fact: color=blue target=paused (no requested action on this text)<br>nl-01-029: "I" gold: -; read: extra command:create action=create (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 9 | nl-02-003: "registration" gold: -; read: extra command:create action=create name=registration<br>nl-02-005: "bed is confirmed" gold: -; read: extra command:create action=create<br>nl-04-027: "Our" gold: -; read: extra command:create action=create label=our |
| cut | command:label | 6 | nl-01-030: "Put the three-failure condition on the arrow" gold: -; read: extra command:label action=label from=disconnected label=three to=disconnected<br>nl-03-006: "give it the writing river" gold: -; read: extra command:label action=label target=sea<br>nl-04-044: "the new one on" gold: -; read: extra command:label action=label |
| cut | command:connect | 5 | nl-01-014: "Each app can reach the same database" gold: -; read: extra command:connect action=connect to=$new<br>nl-06-049: "from eight fifteen till nine" gold: -; read: extra command:connect action=connect from=$new to=$new<br>nl-08-040: "put it in for now" gold: -; read: extra command:connect action=connect from=$new |
| cut | command:set | 5 | nl-02-047: "legal to look at the contract" gold: -; read: extra command:set action=set<br>nl-03-016: "little" gold: -; read: extra command:set action=set size=small<br>nl-04-048: "cool" gold: -; read: extra command:set action=set target=$new |
| cut | command:move | 2 | nl-01-014: "The database should be lower down" gold: -; read: extra command:move action=move position=bottom target=database<br>nl-09-053: "The post office goes next to the bakery" gold: -; read: extra command:move action=move anchor=bakery position=near target=post,office |
| cut | command:arrange | 2 | nl-02-047: "finance looking at the spend so can those be side by side after the manager" gold: -; read: extra command:arrange action=arrange<br>nl-10-050: "all the fun stuff in a group" gold: -; read: extra command:arrange action=arrange target=mention(quantifier=all) |
| cut | command:duplicate | 1 | nl-01-017: "circulation of data from testing" gold: -; read: extra command:duplicate action=duplicate |
| cut | command:improve | 1 | nl-02-025: "change order" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) |
| spurious | command:create | 23 | nl-01-029: "I" gold: -; read: extra command:create action=create<br>nl-04-042: "eyes" gold: -; read: extra command:create action=create<br>nl-05-013: "way" gold: -; read: extra command:create action=create |
| spurious | command:set | 8 | nl-01-025: "Make staging like production" gold: -; read: extra command:set action=set target=staging<br>nl-02-005: "those be two separate boxes" gold: -; read: extra command:set action=set shape=rectangle target=$new<br>nl-02-040: "unsigned" gold: -; read: extra command:set action=set |
| spurious | command:label | 7 | nl-01-037: "Why is 'Forgot password?' a giant box" gold: -; read: extra command:label action=label label=? target=mention()<br>nl-02-003: "The other route can say routine" gold: -; read: extra command:label action=label label=routine to=assessment<br>nl-06-004: "the desk bit is Facilities" gold: -; read: extra command:label action=label label=facilities target=it |
| spurious | command:connect | 5 | nl-03-015: "I still want both the lines coming down to me from Jo and Martin" gold: -; read: extra command:connect action=connect arrow=none from=jo to=martin<br>nl-06-004: "The account bit belongs to IT" gold: -; read: extra command:connect action=connect to=it<br>nl-06-007: "Both should end up" gold: -; read: extra command:connect action=connect |
| spurious | question:path | 3 | nl-01-030: "cancellation path" gold: -; read: extra question:path ask=path to=disconnected<br>nl-12-005: "is 6% from trial to paid any good for B2B" gold: -; read: extra question:path ask=path from=trial to=b2b<br>nl-12-026: "can you get from Mill to Keep without going through the Swamp" gold: -; read: extra question:path ask=path from=mill to=keep |
| spurious | question:check | 3 | nl-01-045: "if db red" gold: -; read: extra question:check ask=check color=red target=db<br>nl-08-036: "is half day" gold: -; read: extra question:check ask=check target=rectangle1,rectangle2<br>nl-08-042: "is 1840" gold: -; read: extra question:check ask=check |
| spurious | question:help | 3 | nl-02-050: "What's 17.5% of 48,600" gold: -; read: extra question:help ask=help<br>nl-07-006: "whats the interchange fee" gold: -; read: extra question:help ask=help<br>nl-12-052: "there some way of showing that" gold: -; read: extra question:help ask=help aspect=example |
| spurious | question:count | 3 | nl-07-012: "how many sensors unwired" gold: -; read: extra question:count ask=count<br>nl-09-026: "number them" gold: -; read: extra question:count ask=count<br>nl-12-047: "how many times do i have to say this" gold: -; read: extra question:count ask=count |
| cut | (4 more keys; all in the JSON) | | |
| spurious | (14 more keys; all in the JSON) | | |

### nl_a_development / development at the cost-10 threshold (0.9150)

Executed: right 9, wrong 1, extras 3. Structural holds 73 ({"blocked":56,"dependency":17}; 2 of them would have been right). Confidence holds 374: right 35, wrong or extra 339. Unread 127.

**Executed wrong, by first cause** (4)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 1 | nl-12-026: "can you get from Mill to Keep without going through the Swamp" gold: -; read: extra question:path ask=path from=mill to=keep (confidence 0.932; extra) |
| 4 wrong act | model (act head) | 2 | nl-05-027: "vault left of archive" gold: -; read: extra command:move action=move anchor=archive position=leftof target=vault (confidence 0.928; extra)<br>nl-11-025: "Library goes between market and station" gold: -; read: extra command:move action=move anchor=market,station position=between target=library (confidence 0.951; extra) |
| 7 wrong words tagged for a name / text key | model (token head) | 1 | nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: command:label action=label label=7 min target=depot,market (confidence 0.920; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | question:path | 1 | nl-12-026: "can you get from Mill to Keep without going through the Swamp" gold: -; read: extra question:path ask=path from=mill to=keep |
| act | command:create read as command:move | 2 | nl-05-027: "vault left of archive" gold: -; read: extra command:move action=move anchor=archive position=leftof target=vault<br>nl-11-025: "Library goes between market and station" gold: -; read: extra command:move action=move anchor=market,station position=between target=library |
| name | from | 1 | nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: command:label action=label label=7 min target=depot,market |
| name | to | 1 | nl-11-028: "put 7 min on depot-market" gold: action=label from=depot to=market label=7 min; read: command:label action=label label=7 min target=depot,market |

**Right but held by confidence** (35)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 13 | nl-01-014: "Add object storage off to one side for uploads" gold: action=create label=object storage; read: command:create action=create label=object storage<br>nl-02-027: "write processed with every batch underneath it" gold: action=create shape=text label=processed with every batch position=below anchor=instrument; read: command:create action=create anchor=instrument label=processed with every batch position=below shape=text<br>nl-02-031: "Add a note at the bottom saying 'Working map — disputed facts'" gold: action=create shape=text label=working map — disputed facts position=bottom; read: command:create action=create label=working map — disputed facts position=bottom shape=text |
| held | command:set | 5 | nl-05-026: "statue can just be a grey circle" gold: action=set target=statue shape=circle color=gray; read: command:set action=set color=gray shape=circle target=statue<br>nl-07-019: "welding red" gold: action=set target=welding color=red; read: command:set action=set color=red target=welding<br>nl-08-006: "make it read red I mean the colour red" gold: action=set target=submit color=red; read: command:set action=set color=red target=submit |
| held | command:label | 4 | nl-01-019: "Call Build 'Package the release'" gold: action=label target=build label=package the release; read: command:label action=label label=package the release target=build<br>nl-07-027: "on DPO the name of Ms Keller" gold: action=label target=dpo label=ms keller; read: command:label action=label label=ms keller target=dpo<br>nl-08-006: "on the submit one write first of March" gold: action=label target=submit label=first of march; read: command:label action=label label=first of march target=submit |
| held | command:connect | 3 | nl-05-031: "secret way from vault back to hall, dashed" gold: action=connect style=dashed from=vault to=hall; read: command:connect action=connect from=vault style=dashed to=hall<br>nl-07-007: "conveyor2 to packing, dashed" gold: action=connect from=conveyor2 to=packing style=dashed; read: command:connect action=connect from=conveyor2 style=dashed to=packing<br>nl-08-040: "Anatomy leads to Physiology and Physiology leads to Surgery" gold: action=connect from=anatomy,physiology,surgery; read: command:connect action=connect from=anatomy,physiology,surgery |
| held | command:resize | 2 | nl-05-011: "table smaller" gold: action=resize target=table; read: command:resize action=resize target=table<br>nl-11-023: "bigger too" gold: action=resize target=hospital; read: command:resize action=resize target=hospital |
| held | command:swap | 2 | nl-06-032: "swap the people labelled Anna and Bev" gold: action=swap target=anna,bev; read: command:swap action=swap target=anna,bev<br>nl-09-013: "Swap the fox and the owl" gold: action=swap target=fox,owl; read: command:swap action=swap target=fox,owl |
| held | command:group | 2 | nl-10-046: "Group Beach, Hike and Museum as Activities" gold: action=group target=beach,hike,museum name=activities; read: command:group action=group name=activities target=beach,hike,museum<br>nl-11-016: "group the lot as Logo" gold: action=group target=mention(quantifier=all) name=logo; read: command:group action=group name=logo target=mention(quantifier=all) |
| held | command:disconnect | 1 | nl-04-050: "The present road that jumps from Bake directly to Ice should no longer exist" gold: action=disconnect from=bake to=ice; read: command:disconnect action=disconnect from=bake to=ice |
| held | (3 more keys; all in the JSON) | | |

**Structural holds** (73)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 56 | nl-01-005: "add the reception pc on left of switch" gold: action=create name=frontdesk position=leftof anchor=switch; read: command:create action=create anchor=switch position=leftof<br>nl-01-014: "Three plain areas is enough" gold: action=create layer=zone label=public entry; read: command:create action=create count=3<br>nl-01-014: "public entry" gold: action=create layer=zone name=data; read: command:create action=create |
| blocked | unresolved-reference | 2 | nl-06-047: "be a quiet ten minutes between dinner and the bidding" gold: action=create label=quiet ten minutes position=between anchor=dinner,auction; read: command:create action=create<br>nl-08-006: "between the budget and submit there needs to be letters of support no letters like letters from people the su…" gold: action=create label=supporting letters position=between anchor=budget,submit; read: command:create action=create |

## t1_all / all (1793 messages, 1793 requested: right 1495, wrong 279, not done 19, extras 48; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 29 |
| actions | 38 |
| values/roles | 279 |
| calibration | 484 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1793); ok (ungated: right + would-be right of structural holds = right of every request executed: 1495); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 279); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 48); ok (ungated: unread = requested - paired: 19); ok (ungated right equals the score file: 1495); ok (ungated wrong equals the score file: 276); ok (ungated extras equals the score file: 48); ok (ungated unread equals the score file: 19); ok (ungated structural holds equal the score file: 3); ok (every produced request is executed, structurally held or (gated) confidence-held: 1822); ok (gated: executed wrong equals the score file: 5); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 3); ok (gated: confidence holds equal the score file: 798); ok (gated: right executed equals the score file: 1016); ok (gated: unread equals the score file: 19); ok (gated: held right + held wrong or extra = confidence holds: 798)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 29 | 29 |
| 4 wrong act | model (act head) | 38 | 0 | 0 | 0 | 38 |
| 6 wrong or missing class value | model (class head) | 259 | 0 | 0 | 0 | 259 |
| 7 wrong words tagged for a name / text key | model (token head) | 20 | 0 | 0 | 0 | 20 |

**t1_all / all, trigger seen** (317)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 38 | st1-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: not done (read as command:respace)<br>st1-00156: "spread everything out" gold: requested: spread everything out; read: extra command:respace action=respace target=mention(quantifier=all) (read as command:respace where command:distribute is requested)<br>st1-00161: "what is the border of Clean" gold: ask=property property=outline target=clean; read: not done (read as question:neighbors) |
| 6 wrong or missing class value | model (class head) | 259 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set color=navy target=sales<br>st1-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused |
| 7 wrong words tagged for a name / text key | model (token head) | 20 | st1-00062: "redo it 4 times" gold: action=redo count=4; read: action=redo<br>st1-00184: "redo that twice" gold: action=redo count=2; read: action=redo<br>st1-00326: "redo it 5 times" gold: action=redo count=5; read: action=redo |

| cause | key | n | examples |
|---|---|---:|---|
| act | question:property read as question:degree | 24 | st1-00253: "what is the border of Store" gold: ask=property property=outline target=store; read: not done<br>st1-00253: "what is the border of Store" gold: requested: what is the border of Store; read: extra question:degree ask=degree target=store<br>st1-00539: "what is the border of Ap2" gold: ask=property property=outline target=ap2; read: not done |
| act | question:property read as question:neighbors | 8 | st1-00161: "what is the border of Clean" gold: ask=property property=outline target=clean; read: not done<br>st1-00161: "what is the border of Clean" gold: requested: what is the border of Clean; read: extra question:neighbors ask=neighbors target=clean<br>st1-01486: "what is the border of Mercury" gold: ask=property property=outline target=mercury; read: not done |
| act | command:distribute read as command:respace | 4 | st1-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: not done<br>st1-00156: "spread everything out" gold: requested: spread everything out; read: extra command:respace action=respace target=mention(quantifier=all)<br>st1-01144: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: not done |
| act | command:create read as command:label | 2 | st1-00611: "add a caption "Flow v2"" gold: action=create shape=text label=flow v2; read: not done<br>st1-00611: "add a caption "Flow v2" for" gold: requested: add a caption "Flow v2"; read: extra command:label action=label label=flow v2 |
| class | outline | 131 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set color=navy target=sales<br>st1-00036: "give Kitchen a red border" gold: action=set target=kitchen outline=red; read: action=set target=kitchen |
| class | property | 56 | st1-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused<br>st1-00068: "what is the border of Error" gold: ask=property property=outline target=error; read: ask=property target=error<br>st1-00118: "what's the border color of Waiting" gold: ask=property property=outline target=waiting; read: ask=property property=color target=waiting |
| class | target | 52 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown target=mention(quantifier=all,shape=hexagon) |
| class | color | 16 | st1-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: action=create shape=diamond<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: action=create color=navy shape=triangle<br>st1-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: action=create color=navy shape=hexagon |
| class | size | 13 | st1-00050: "how many huge ellipses are there" gold: ask=count shape=ellipse size=huge; read: ask=count shape=ellipse<br>st1-00496: "how many huge rectangles are there" gold: ask=count shape=rectangle size=huge; read: ask=count shape=rectangle<br>st1-00614: "how many giant triangles are there" gold: ask=count shape=triangle size=huge; read: ask=count shape=triangle |
| class | direction | 6 | st1-00093: "move Battery right" gold: action=move target=battery direction=right; read: action=move target=battery<br>st1-00209: "move Atom up" gold: action=move target=atom direction=up; read: action=move target=atom<br>st1-00333: "move Check up" gold: action=move target=check direction=up; read: action=move target=check |
| class | style | 1 | st1-01012: "make the arrow from Worker to Kafka solid" gold: action=set from=worker to=kafka style=solid; read: action=set from=worker to=kafka |
| class | kind | 1 | st1-02236: "make the arrows navy" gold: action=set kind=edge color=navy target=mention(quantifier=all); read: action=set color=navy |
| name | count | 18 | st1-00062: "redo it 4 times" gold: action=redo count=4; read: action=redo<br>st1-00184: "redo that twice" gold: action=redo count=2; read: action=redo<br>st1-00326: "redo it 5 times" gold: action=redo count=5; read: action=redo |
| name | label | 2 | st1-00822: "label the link between Milk and Oven "writes"" gold: action=label label=writes from=milk to=oven; read: action=label from=milk to=oven<br>st1-02315: "label the link between Camp and Volcano "writes"" gold: action=label label=writes from=camp to=volcano; read: action=label from=camp to=volcano |

**t1_all / all, trigger no request** (29)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 29 | st1-00153: "me" gold: -; read: extra command:create action=create (no requested action on this text)<br>st1-00247: "me" gold: -; read: extra command:create action=create (no requested action on this text)<br>st1-00259: "me" gold: -; read: extra command:create action=create (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:create | 24 | st1-00153: "me" gold: -; read: extra command:create action=create<br>st1-00247: "me" gold: -; read: extra command:create action=create<br>st1-00259: "me" gold: -; read: extra command:create action=create |
| spurious | question:help | 4 | st1-00338: "you can" gold: -; read: extra question:help ask=help aspect=can<br>st1-00412: "can" gold: -; read: extra question:help ask=help aspect=can<br>st1-01312: "can" gold: -; read: extra question:help ask=help aspect=can |
| spurious | command:disconnect | 1 | st1-02237: "you" gold: -; read: extra command:disconnect action=disconnect |

### t1_all / all at the cost-10 threshold (0.9150)

Executed: right 1016, wrong 5, extras 0. Structural holds 3 ({"blocked":3}; 0 of them would have been right). Confidence holds 798: right 479, wrong or extra 319. Unread 19.

**Executed wrong, by first cause** (5)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 5 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.968; wrong)<br>st1-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square) (confidence 0.920; wrong)<br>st1-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.984; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | target | 5 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square)<br>st1-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) |

**Right but held by confidence** (479)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 217 | st1-00000: "make a funnel of Clean, Source, Enrich, Archive and Loader" gold: action=create template=funnel items=clean,source,enrich,archive,loader; read: command:create action=create items=clean,source,enrich,archive,loader template=funnel<br>st1-00001: "add a black circle" gold: action=create shape=circle color=black; read: command:create action=create color=black shape=circle<br>st1-00019: "add a cyan triangle" gold: action=create shape=triangle color=cyan; read: command:create action=create color=cyan shape=triangle |
| held | command:set | 97 | st1-00058: "make the arrow from M to Y orange" gold: action=set from=m to=y color=orange; read: command:set action=set color=orange from=m to=y<br>st1-00077: "make Ingest teal" gold: action=set target=ingest color=teal; read: command:set action=set color=teal target=ingest<br>st1-00085: "make the arrow from Todo to Task7 solid" gold: action=set from=todo to=task7 style=solid; read: command:set action=set from=todo style=solid to=task7 |
| held | command:move | 54 | st1-00035: "move Keeper left" gold: action=move target=keeper direction=left; read: command:move action=move direction=left target=keeper<br>st1-00057: "move Budget left" gold: action=move target=budget direction=left; read: command:move action=move direction=left target=budget<br>st1-00155: "move Resistor right" gold: action=move target=resistor direction=right; read: command:move action=move direction=right target=resistor |
| held | command:redo | 37 | st1-00010: "redo that quickly" gold: action=redo; read: command:redo action=redo<br>st1-00017: "redo for me" gold: action=redo; read: command:redo action=redo<br>st1-00124: "redo for me" gold: action=redo; read: command:redo action=redo |
| held | question:count | 23 | st1-00076: "how many arrows are there for me" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00140: "count the connections" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small |
| held | command:label | 16 | st1-00030: "label the arrow from Sprint1 to Task7 "writes"" gold: action=label label=writes from=sprint1 to=task7; read: command:label action=label from=sprint1 label=writes to=task7<br>st1-00103: "label the link between Export and Sink "reads"" gold: action=label label=reads from=export to=sink; read: command:label action=label from=export label=reads to=sink<br>st1-00412: "label the line from Qb to Wr1 "sync" if" gold: action=label label=sync from=qb to=wr1; read: command:label action=label from=qb label=sync to=wr1 |
| held | command:delete | 7 | st1-00371: "remove Etl if you can" gold: action=delete target=etl; read: command:delete action=delete target=etl<br>st1-00807: "remove Intern quickly" gold: action=delete target=intern; read: command:delete action=delete target=intern<br>st1-00863: "remove Begin quickly" gold: action=delete target=begin; read: command:delete action=delete target=begin |
| held | command:undo | 4 | st1-00067: "undo quickly" gold: action=undo; read: command:undo action=undo<br>st1-00089: "undo that quickly" gold: action=undo; read: command:undo action=undo<br>st1-00465: "undo that quickly" gold: action=undo; read: command:undo action=undo |
| held | (10 more keys; all in the JSON) | | |

**Structural holds** (3)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 3 | st1-00599: "make a pyramid with 5 levels quickly" gold: action=create template=pyramid count=5; read: command:create action=create template=pyramid<br>st1-00822: "label the link between Milk and Oven "writes"" gold: action=label label=writes from=milk to=oven; read: command:label action=label from=milk to=oven<br>st1-02315: "label the link between Camp and Volcano "writes"" gold: action=label label=writes from=camp to=volcano; read: command:label action=label from=camp to=volcano |

## lowercase_other / all (351 messages, 1102 requested: right 787, wrong 273, not done 42, extras 80; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 101 |
| actions | 37 |
| values/roles | 257 |
| calibration | 581 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1102); ok (ungated: right + would-be right of structural holds = right of every request executed: 787); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 273); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 80); ok (ungated: unread = requested - paired: 42); ok (ungated right equals the score file: 787); ok (ungated wrong equals the score file: 270); ok (ungated extras equals the score file: 74); ok (ungated unread equals the score file: 42); ok (ungated structural holds equal the score file: 9); ok (every produced request is executed, structurally held or (gated) confidence-held: 1140); ok (gated: executed wrong equals the score file: 0); ok (gated: executed extras equals the score file: 1); ok (gated: structural holds equal the score file: 9); ok (gated: confidence holds equal the score file: 923); ok (gated: right executed equals the score file: 207); ok (gated: unread equals the score file: 42); ok (gated: held right + held wrong or extra = confidence holds: 923)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 38 | 2 | 0 | 26 | 66 |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 35 | 35 |
| 4 wrong act | model (act head) | 17 | 20 | 0 | 0 | 37 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 94 | 5 | 0 | 0 | 99 |
| 6 wrong or missing class value | model (class head) | 39 | 3 | 0 | 0 | 42 |
| 7 wrong words tagged for a name / text key | model (token head) | 99 | 17 | 0 | 0 | 116 |

**lowercase_other / all, trigger seen** (287)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 38 | fo-0004#lc: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done (lost: no unit on the span)<br>fo-0013#lc: "Add one from review to published" gold: action=connect from=review to=published; read: not done (merged into a unit with another request)<br>fo-0032#lc: "All rectangles should be orange. Actually only eks and ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(quantifier=all,shape=rectangle) (the unit covers 41% of the span) |
| 4 wrong act | model (act head) | 17 | fo-0076#lc: "Path from topic to alert" gold: ask=path from=topic to=alert; read: not done (read as command:connect)<br>fo-0076#lc: "Path from topic to alert" gold: requested: Path from topic to alert; read: extra command:connect action=connect from=topic to=alert (read as command:connect where question:path is requested)<br>fo-0136#lc: "do the arrows from scheduler to taska, taskb and taskc" gold: action=connect from=scheduler to=taska,taskb,taskc; read: not done (read as command:arrange) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 94 | fo-0002#lc: "Move it to the right of api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof (a name written in another request or by a pronoun)<br>fo-0010#lc: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle (a name written in another request or by a pronoun)<br>fo-0010#lc: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=mention(quantifier=all) (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 39 | fo-0006#lc: "Please create one small orange square with name Bastion near of subneta" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: action=create color=orange name=bastion shape=square size=small<br>fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: action=set color=blue shape=rectangle size=medium target=mention()<br>fo-0025#lc: "arange raw, staged, curated and mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=staged,mart template=funnel |
| 7 wrong words tagged for a name / text key | model (token head) | 99 | fo-0004#lc: "connect ingest parse clean and load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect from=ingest,load<br>fo-0006#lc: "Is igw bigger than nat" gold: ask=check target=igw comparison=bigger anchor=nat; read: ask=check anchor=nat comparison=bigger<br>fo-0010#lc: "logo goes to the top left" gold: action=move target=logo position=topleft; read: action=move position=topleft |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 8 | fo-0032#lc: "All rectangles should be orange. Actually only eks and ecr, not all of them" gold: action=set target=eks,ecr color=orange; read: action=set color=orange target=mention(quantifier=all,shape=rectangle)<br>fo-0147#lc: "Color for connected is green" gold: action=set target=connected color=green; read: not done<br>fo-0147#lc: "for ended is red. Sorry, ended must be gray" gold: action=set target=ended color=gray; read: action=set color=gray target=idle |
| cut | (command:connect) | 7 | fo-0013#lc: "Add one from review to published" gold: action=connect from=review to=published; read: not done<br>fo-0042#lc: "worker1 and worker2 both feed results" gold: action=connect from=worker1,worker2 to=results; read: not done<br>fo-0045#lc: "halfopen back to closed" gold: action=connect from=halfopen to=closed; read: not done |
| cut | (fact:) | 6 | fo-0197#lc: "mars is already red" gold: target=mars color=red; read: not done<br>fo-0206#lc: "brother is to the right of me" gold: target=brother position=rightof anchor=me; read: not done<br>fo-0245#lc: "the moon is above earth" gold: target=moon position=above anchor=earth; read: not done |
| cut | (command:move) | 4 | fo-0271#lc: "sun at the top" gold: action=move target=sun position=top; read: not done<br>fo-0328#lc: "entry should go below living" gold: action=move target=entry position=below anchor=living; read: not done<br>fo-0333#lc: "bar left of entrance" gold: action=move target=bar position=leftof anchor=entrance; read: action=move anchor=entrance position=near target=bar |
| cut | (command:arrange) | 3 | fo-0004#lc: "put all the boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done<br>fo-0136#lc: "the tasks I want in a column" gold: action=arrange target=taska,taskb,taskc layout=column; read: action=arrange layout=column<br>fo-0543#lc: "Put the three days in a column" gold: action=arrange target=day1,day2,day3 layout=column; read: not done |
| cut | (command:create) | 2 | fo-0237#lc: "put 5 tiny gray sqaures between Mars and... hmm there's nothing after Mars yet. ok just put them to the right…" gold: action=create shape=square size=tiny color=gray count=5 position=rightof anchor=$new; read: action=create anchor=$new color=gray count=5 position=between shape=ellipse size=tiny<br>fo-0524#lc: "Can you put three small yellow stars underneath it? Those are the kids' plants. hmm actually I meant five, no…" gold: action=create shape=star color=yellow size=small count=5 position=below anchor=sunflower; read: action=create color=yellow count=3 shape=star size=small |
| cut | (command:resize) | 2 | fo-0271#lc: "can u make fish a lil bigger" gold: action=resize target=fish; read: not done<br>fo-0328#lc: "The kitchen is too big, shrink it" gold: action=resize target=kitchen; read: action=resize target=bed2 |
| cut | (command:delete) | 2 | fo-0285#lc: "satellite isn't needed, delete it" gold: action=delete target=satellite; read: action=delete target=mention()<br>fo-0467#lc: "the bar can go" gold: action=delete target=bar; read: not done |
| act | command:move read as command:create | 3 | fo-0333#lc: "actually bar left of entrance" gold: requested: bar left of entrance; read: extra command:create action=create anchor=entrance label=bar position=leftof<br>fo-0450#lc: "put doing rigth of todo" gold: action=move target=doing position=rightof anchor=todo; read: not done<br>fo-0450#lc: "put doing rigth of todo" gold: requested: put doing rigth of todo; read: extra command:create action=create anchor=todo label=doing position=rightof |
| act | fact: read as command:set | 3 | fo-0415#lc: "The big rectangle in the corner is bed1, it's blue" gold: target=bed1 shape=rectangle color=blue; read: not done<br>fo-0415#lc: "The big rectangle in the corner is bed1, it's blue" gold: requested: The big rectangle in the corner is bed1, it's blue; read: extra command:set action=set color=blue shape=rectangle<br>fo-0500#lc: "it's actually navy" gold: requested: it's actually navy; read: extra command:set action=set color=navy target=yarn |
| act | question:path read as command:connect | 2 | fo-0076#lc: "Path from topic to alert" gold: ask=path from=topic to=alert; read: not done<br>fo-0076#lc: "Path from topic to alert" gold: requested: Path from topic to alert; read: extra command:connect action=connect from=topic to=alert |
| act | question:connected read as question:help | 2 | fo-0222#lc: "what about zooplankton and tuna" gold: ask=connected target=tuna anchor=zooplankton; read: not done<br>fo-0222#lc: "what about zooplankton and tuna" gold: requested: what about zooplankton and tuna; read: extra question:help ask=help |
| act | command:arrange read as command:align | 2 | fo-0459#lc: "Then line up all four boxes in a row" gold: action=arrange target=mention(quantifier=all,shape=rectangle) layout=row; read: not done<br>fo-0459#lc: "line up all four boxes in a row" gold: requested: Then line up all four boxes in a row; read: extra command:align action=align axis=horizontal target=mention(quantifier=all) |
| act | question:degree read as question:neighbors | 2 | fo-0460#lc: "Is closing linked to anything yet" gold: ask=degree target=closing; read: not done<br>fo-0460#lc: "Is closing linked to anything" gold: requested: Is closing linked to anything yet; read: extra question:neighbors ask=neighbors target=closing |
| act | question:connected read as command:connect | 2 | fo-0557#lc: "Do both bases connect to mid" gold: ask=connected target=bluebase,redbase anchor=mid; read: not done<br>fo-0557#lc: "Do both bases connect to mid" gold: requested: Do both bases connect to mid; read: extra command:connect action=connect from=flag2 to=flag2 |
| act | command:connect read as command:arrange | 1 | fo-0136#lc: "do the arrows from scheduler to taska, taskb and taskc" gold: action=connect from=scheduler to=taska,taskb,taskc; read: not done |
| ref | target | 65 | fo-0002#lc: "Move it to the right of api" gold: action=move target=cache position=rightof anchor=api; read: action=move anchor=api position=rightof<br>fo-0010#lc: "make it a white rectangle" gold: action=set target=search color=white shape=rectangle; read: action=set color=white shape=rectangle<br>fo-0010#lc: "distribute them horizontally" gold: action=distribute target=card1,card2,card3 axis=horizontal; read: action=distribute axis=horizontal target=mention(quantifier=all) |
| ref | to | 11 | fo-0020#lc: "disconnect them" gold: action=disconnect from=audit to=load; read: action=disconnect from=audit to=audit<br>fo-0035#lc: "Same for spine2" gold: action=connect from=spine2 to=leaf1,leaf2,leaf3,leaf4; read: action=connect from=spine2<br>fo-0055#lc: "Connect coresw to each of them" gold: action=connect from=coresw to=vlan10,vlan20,vlan30; read: action=connect |
| ref | from | 10 | fo-0025#lc: "conect them each to the next" gold: action=connect from=raw,staged,curated,mart; read: action=connect pairing=next<br>fo-0035#lc: "disconnect it from spine1 and spine2" gold: action=disconnect from=leaf4 to=spine1,spine2; read: action=disconnect from=mention(quantifier=all,shape=square) to=spine1,spine2<br>fo-0076#lc: "All three consumers -> aggregator" gold: action=connect from=consumer1,consumer2,consumer3 to=aggregator; read: action=connect to=aggregator |
| ref | anchor | 9 | fo-0168#lc: "put grandma above both of them" gold: action=move target=grandma position=above anchor=mom,uncle; read: action=move anchor=mom position=above target=grandma<br>fo-0190#lc: "move it there" gold: action=move target=frog position=rightof anchor=grasshopper; read: action=move anchor=frog position=between target=frog<br>fo-0192#lc: "what's farthest from it" gold: ask=nearest anchor=earth superlative=farthest; read: ask=nearest superlative=farthest |
| class | target | 12 | fo-0020#lc: "Make extract, transform and load the same, medium blue rectangles" gold: action=set target=extract,transform,load size=medium color=blue shape=rectangle; read: action=set color=blue shape=rectangle size=medium target=mention()<br>fo-0043#lc: "label card "Product"" gold: action=label target=card label=product; read: action=label label=product target=mention()<br>fo-0058#lc: "make gold gold" gold: action=set target=gold color=gold; read: action=set color=gold target=mention(color=gold) |
| class | position | 10 | fo-0006#lc: "Please create one small orange square with name Bastion near of subneta" gold: action=create shape=square color=orange size=small name=bastion position=near anchor=subneta; read: action=create color=orange name=bastion shape=square size=small<br>fo-0043#lc: "put the price uh under image" gold: action=move target=price position=below anchor=image; read: action=move target=price<br>fo-0094#lc: "is dedupe left of sort" gold: ask=check target=dedupe position=leftof anchor=sort; read: ask=check |
| class | color | 7 | fo-0096#lc: "Is cache teal" gold: ask=check target=cache color=teal; read: ask=check target=cache<br>fo-0191#lc: "please recolour her" gold: action=set target=aunt color=purple; read: action=set color=gold target=aunt<br>fo-0223#lc: "please add a red rectangle named Mum to the left of dad. actualy make it pink" gold: action=create shape=rectangle color=pink name=mum position=leftof anchor=dad; read: action=create anchor=dad color=red name=mum position=leftof shape=rectangle |
| class | shape | 6 | fo-0108#lc: "Add a queue between producer and consumer, a teal ellipse called Mq. Sorry, make that a teal rectangle" gold: action=create shape=rectangle color=teal name=mq position=between anchor=producer,consumer; read: action=create color=teal name=mq shape=ellipse<br>fo-0129#lc: "add a yelow triangle called Jammed betwen locked and unlocked" gold: action=create shape=triangle color=yellow name=jammed position=between anchor=locked,unlocked; read: action=create anchor=locked,unlocked color=yellow name=jammed position=between<br>fo-0204#lc: "can you add a blue triangle named Drop under the cloud. wait no not triangle, a diamond" gold: action=create shape=diamond color=blue name=drop position=below anchor=cloud; read: action=create anchor=cloud color=blue name=drop position=below shape=triangle |
| class | to | 2 | fo-0139#lc: "isp1 connects to edgerouter" gold: action=connect from=isp1 to=edgerouter; read: action=connect from=isp1 to=mention()<br>fo-0525#lc: "arrow from dog to ball" gold: action=connect from=dog to=ball; read: action=connect from=dog to=mention(shape=circle) |
| class | from | 2 | fo-0139#lc: "edgerouter to core" gold: action=connect from=edgerouter to=core; read: action=connect from=mention() to=core<br>fo-0191#lc: "connect aunt to Cousin" gold: action=connect from=aunt to=$new; read: action=connect from=mention() to=$new |
| class | layout | 1 | fo-0025#lc: "arange raw, staged, curated and mart in a colum" gold: action=arrange target=raw,staged,curated,mart layout=column; read: action=arrange target=staged,mart template=funnel |
| class | property | 1 | fo-0552#lc: "what shape is cool right now" gold: ask=property target=cool property=shape; read: ask=property |
| name | target | 46 | fo-0006#lc: "Is igw bigger than nat" gold: ask=check target=igw comparison=bigger anchor=nat; read: ask=check anchor=nat comparison=bigger<br>fo-0010#lc: "logo goes to the top left" gold: action=move target=logo position=topleft; read: action=move position=topleft<br>fo-0034#lc: "line svc1 svc2 and svc3 up verticaly" gold: action=align target=svc1,svc2,svc3 axis=vertical; read: action=align axis=vertical target=svc3 |
| name | from | 30 | fo-0004#lc: "connect ingest parse clean and load one after the other" gold: action=connect from=ingest,parse,clean,load; read: action=connect from=ingest,load<br>fo-0012#lc: "hook the copies up to alb" gold: action=connect from=$new to=alb; read: action=connect from=web1 to=alb<br>fo-0013#lc: "published goes to archived" gold: action=connect from=published to=archived; read: action=connect to=archived |
| name | to | 21 | fo-0013#lc: "another one from review to rejected, dashed" gold: action=connect from=review to=rejected style=dashed; read: action=connect from=review style=dashed to=published,rejected<br>fo-0027#lc: "shutdown back to off" gold: action=connect from=shutdown to=off; read: action=connect from=shutdown<br>fo-0027#lc: "check whether ready can reach off" gold: ask=path from=ready to=off; read: ask=path from=ready |
| name | anchor | 6 | fo-0125#lc: "Which shape is nearest to closebtn" gold: ask=nearest anchor=closebtn superlative=closest; read: ask=nearest anchor=window superlative=closest<br>fo-0173#lc: "is me connected to dad" gold: ask=connected target=dad anchor=me; read: ask=connected anchor=dad<br>fo-0192#lc: "what's closest to earth" gold: ask=nearest anchor=earth superlative=closest; read: ask=nearest superlative=closest |
| name | label | 1 | fo-0031#lc: "add 4 small rectangles below results" gold: action=create shape=rectangle size=small count=4 position=below anchor=results; read: action=create anchor=results count=4 label=pagination position=below shape=rectangle size=small |
| name | name | 1 | fo-0160#lc: "Venus, a small orange circle, right of Mercury" gold: action=create shape=circle size=small color=orange name=venus position=rightof anchor=$new; read: action=create anchor=$new color=orange position=rightof shape=circle size=small |
| cut | (4 more keys; all in the JSON) | | |
| class | (1 more keys; all in the JSON) | | |

**lowercase_other / all, trigger unseen** (47)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 2 | fo-0104#lc: "did I make igw a circle" gold: ask=check target=igw shape=circle; read: not done (lost: no unit on the span)<br>fo-0534#lc: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move (the unit covers 0% of the span) |
| 4 wrong act | model (act head) | 20 | fo-0107#lc: "thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: not done (read as command:connect)<br>fo-0107#lc: "3 more just like it" gold: requested: thumbnail: 3 more just like it; read: extra command:connect action=connect (read as command:connect where command:duplicate is requested)<br>fo-0184#lc: "genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: not done (read as command:create) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 5 | fo-0076#lc: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers (a name written in another request or by a pronoun)<br>fo-0113#lc: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple (a name written in another request or by a pronoun)<br>fo-0144#lc: "I want broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2 (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 3 | fo-0089#lc: "input1 input2 input3 evnly spaced vertically" gold: action=distribute target=input1,input2,input3 axis=vertical; read: action=distribute axis=vertical target=mention(quantifier=all)<br>fo-0125#lc: "closebtn red" gold: action=set target=closebtn color=red; read: action=set color=red target=mention()<br>fo-0139#lc: "core blue" gold: action=set target=core color=blue; read: action=set color=blue target=mention() |
| 7 wrong words tagged for a name / text key | model (token head) | 17 | fo-0092#lc: "redis teal, no, cyan" gold: action=set target=redis color=cyan; read: action=set color=cyan<br>fo-0104#lc: "publicsubnet green" gold: action=set target=publicsubnet color=green; read: action=set color=green<br>fo-0104#lc: "privatesubnet blue" gold: action=set target=privatesubnet color=blue; read: action=set color=blue |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (question:check) | 1 | fo-0104#lc: "did I make igw a circle" gold: ask=check target=igw shape=circle; read: not done |
| cut | (command:move) | 1 | fo-0534#lc: "It should sit under it" gold: action=move target=moss position=below anchor=fern; read: action=move |
| act | question:degree read as question:count | 6 | fo-0335#lc: "How many shapes are connected to score" gold: ask=degree target=score; read: not done<br>fo-0335#lc: "How many shapes are connected to score" gold: requested: How many shapes are connected to score; read: extra question:count ask=count linked=score<br>fo-0462#lc: "How many shapes are connected to coding" gold: ask=degree target=coding; read: not done |
| act | question:extreme read as question:check | 4 | fo-0554#lc: "Is Teardown the last one on the right" gold: ask=extreme superlative=rightmost; read: not done<br>fo-0554#lc: "Is Teardown the last one on the right" gold: requested: Is Teardown the last one on the right; read: extra question:check ask=check position=right target=teardown<br>fo-0594#lc: "Is Scene4 the last one at the bottom" gold: ask=extreme superlative=bottommost; read: not done |
| act | command:duplicate read as command:connect | 2 | fo-0107#lc: "thumbnail: 3 more just like it" gold: action=duplicate target=thumbnail count=3; read: not done<br>fo-0107#lc: "3 more just like it" gold: requested: thumbnail: 3 more just like it; read: extra command:connect action=connect |
| act | command:move read as command:create | 2 | fo-0184#lc: "genes to the right of it" gold: action=move target=genes position=rightof anchor=brain; read: not done<br>fo-0184#lc: "genes to the right of it" gold: requested: genes to the right of it; read: extra command:create action=create |
| act | command:move read as command:connect | 2 | fo-0184#lc: "plants belwo it" gold: action=move target=plants position=below anchor=brain; read: not done<br>fo-0184#lc: "plants belwo it" gold: requested: plants belwo it; read: extra command:connect action=connect from=$new to=$new |
| act | command:rename read as command:connect | 2 | fo-0210#lc: "coach2 to Seniors" gold: action=rename target=coach2 name=seniors; read: not done<br>fo-0210#lc: "coach2 to Seniors" gold: requested: coach2 to Seniors; read: extra command:connect action=connect from=coach2 to=seniors |
| act | question:extreme read as question:list | 2 | fo-0271#lc: "what's the bottomost thing" gold: ask=extreme superlative=bottommost; read: not done<br>fo-0271#lc: "what's the bottomost thing now" gold: requested: what's the bottomost thing; read: extra question:list ask=list |
| ref | anchor | 3 | fo-0144#lc: "I want broker2 right next to it" gold: action=move target=broker2 position=near anchor=kafka; read: action=move target=broker2<br>fo-0184#lc: "body to the left of it" gold: action=move target=body position=leftof anchor=brain; read: action=move anchor=$new position=leftof target=body<br>fo-0217#lc: "an orange one named Music above it" gold: action=create shape=star color=orange name=music position=above anchor=party; read: action=create anchor=$new color=orange name=music position=above shape=triangle |
| ref | target | 2 | fo-0076#lc: "Consumers small and teal" gold: action=set target=consumer1,consumer2,consumer3 size=small color=teal; read: action=set color=teal size=small target=consumers<br>fo-0113#lc: "all same color, purple" gold: action=set target=grid1,grid2,grid3,grid4 color=purple; read: action=set color=purple |
| class | target | 3 | fo-0089#lc: "input1 input2 input3 evnly spaced vertically" gold: action=distribute target=input1,input2,input3 axis=vertical; read: action=distribute axis=vertical target=mention(quantifier=all)<br>fo-0125#lc: "closebtn red" gold: action=set target=closebtn color=red; read: action=set color=red target=mention()<br>fo-0139#lc: "core blue" gold: action=set target=core color=blue; read: action=set color=blue target=mention() |
| name | target | 14 | fo-0092#lc: "redis teal, no, cyan" gold: action=set target=redis color=cyan; read: action=set color=cyan<br>fo-0104#lc: "publicsubnet green" gold: action=set target=publicsubnet color=green; read: action=set color=green<br>fo-0104#lc: "privatesubnet blue" gold: action=set target=privatesubnet color=blue; read: action=set color=blue |
| name | anchor | 1 | fo-0160#lc: "Earth comes next, a small blue circle called Earth to the right of Venus" gold: action=create shape=circle size=small color=blue name=earth position=rightof anchor=$new; read: action=create anchor=venus color=blue name=earth position=rightof shape=circle size=small |
| name | from | 1 | fo-0230#lc: "add a separate arrow from river back to sea" gold: action=connect from=river to=sea; read: action=connect to=sea |
| name | to | 1 | fo-0552#lc: "is there any way from yeast to cool" gold: ask=path from=yeast to=cool; read: ask=path from=yeast |

**lowercase_other / all, trigger no request** (61)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 26 | fo-0027#lc: "ready goes to shutdown" gold: -; read: extra command:connect action=connect from=mention() to=shutdown (partial overlap with a requested action: 32% of it)<br>fo-0032#lc: "only eks and ecr" gold: -; read: extra command:create action=create (partial overlap with a requested action: 21% of it)<br>fo-0052#lc: "the right of Scheduler" gold: -; read: extra command:move action=move anchor=scheduler position=rightof target=worker (partial overlap with a requested action: 33% of it) |
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 35 | fo-0027#lc: "can also" gold: -; read: extra command:set action=set (no requested action on this text)<br>fo-0118#lc: "Undo that if it looks bad" gold: -; read: extra command:undo action=undo (no requested action on this text)<br>fo-0136#lc: "Please" gold: -; read: extra command:set action=set (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 11 | fo-0032#lc: "only eks and ecr" gold: -; read: extra command:create action=create<br>fo-0237#lc: "." gold: -; read: extra command:create action=create<br>fo-0243#lc: "could you" gold: -; read: extra command:create action=create |
| cut | command:connect | 3 | fo-0027#lc: "ready goes to shutdown" gold: -; read: extra command:connect action=connect from=mention() to=shutdown<br>fo-0147#lc: "ended return to idle" gold: -; read: extra command:connect action=connect from=ended to=idle<br>fo-0328#lc: "should go" gold: -; read: extra command:connect action=connect from=living |
| cut | command:set | 3 | fo-0184#lc: "colour them" gold: -; read: extra command:set action=set color=green target=body<br>fo-0214#lc: "Please" gold: -; read: extra command:set action=set<br>fo-0223#lc: "actualy make it pink" gold: -; read: extra command:set action=set color=pink target=$new |
| cut | command:move | 2 | fo-0052#lc: "the right of Scheduler" gold: -; read: extra command:move action=move anchor=scheduler position=rightof target=worker<br>fo-0237#lc: "just put them to the right of Mars" gold: -; read: extra command:move action=move anchor=$new position=rightof target=$new |
| cut | command:resize | 1 | fo-0090#lc: "please" gold: -; read: extra command:resize action=resize |
| cut | command:flip | 1 | fo-0105#lc: "flip them" gold: -; read: extra command:flip action=flip target=mention() |
| cut | question:neighbors | 1 | fo-0197#lc: "already" gold: -; read: extra question:neighbors ask=neighbors |
| cut | question:check | 1 | fo-0296#lc: "is" gold: -; read: extra question:check ask=check |
| spurious | command:create | 10 | fo-0197#lc: "Could" gold: -; read: extra command:create action=create<br>fo-0240#lc: "'" gold: -; read: extra command:create action=create<br>fo-0407#lc: "There's a tiny magenta circle somewhere" gold: -; read: extra command:create action=create color=magenta shape=circle size=tiny |
| spurious | command:connect | 7 | fo-0190#lc: "In a food chain it goes left to right, Grass then Grasshopper then Frog" gold: -; read: extra command:connect action=connect from=grass,grasshopper,frog<br>fo-0246#lc: "the arrow from Cow to Human" gold: -; read: extra command:connect action=connect from=cow to=human<br>fo-0279#lc: "I want to" gold: -; read: extra command:connect action=connect from=gran to=gran |
| spurious | command:set | 6 | fo-0027#lc: "can also" gold: -; read: extra command:set action=set<br>fo-0136#lc: "Please" gold: -; read: extra command:set action=set<br>fo-0217#lc: "Music should be a star actually" gold: -; read: extra command:set action=set shape=star target=$new |
| spurious | command:move | 3 | fo-0168#lc: "Mom should be on the left" gold: -; read: extra command:move action=move position=left target=mom<br>fo-0288#lc: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance<br>fo-0424#lc: "Users hit the Paywall right after Trial" gold: -; read: extra command:move action=move anchor=trial position=rightof target=paywall |
| spurious | command:disconnect | 2 | fo-0355#lc: "drop the Truck route entirely" gold: -; read: extra command:disconnect action=disconnect from=plant to=truck<br>fo-0385#lc: "that" gold: -; read: extra command:disconnect action=disconnect from=spoke2 to=spoke2 |
| spurious | question:count | 2 | fo-0386#lc: "finds" gold: -; read: extra question:count ask=count<br>fo-0513#lc: "how many scenes don't have any arrows" gold: -; read: extra question:count ask=count |
| spurious | command:undo | 1 | fo-0118#lc: "Undo that if it looks bad" gold: -; read: extra command:undo action=undo |
| spurious | question:cycle | 1 | fo-0147#lc: "make a cycle" gold: -; read: extra question:cycle ask=cycle |
| cut | (3 more keys; all in the JSON) | | |
| spurious | (3 more keys; all in the JSON) | | |

### lowercase_other / all at the cost-10 threshold (0.9150)

Executed: right 207, wrong 0, extras 1. Structural holds 9 ({"blocked":6,"dependency":3}; 0 of them would have been right). Confidence holds 923: right 580, wrong or extra 343. Unread 42.

**Executed wrong, by first cause** (1)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 1 | fo-0288#lc: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance (confidence 0.931; extra) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:move | 1 | fo-0288#lc: "Finance should be on the right" gold: -; read: extra command:move action=move position=right target=finance |

**Right but held by confidence** (580)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:connect | 109 | fo-0003#lc: "arrow from idle to running" gold: action=connect from=idle to=running; read: command:connect action=connect from=idle to=running<br>fo-0003#lc: "paused should go back to running too" gold: action=connect from=paused to=running; read: command:connect action=connect from=paused to=running<br>fo-0004#lc: "hook load up to warehouse with a normal arrow" gold: action=connect from=load to=warehouse; read: command:connect action=connect from=load to=warehouse |
| held | command:set | 100 | fo-0004#lc: "make it a navy ellipse" gold: action=set target=warehouse color=navy shape=ellipse; read: command:set action=set color=navy shape=ellipse target=warehouse<br>fo-0008#lc: "Make alarm red. No wait, orange" gold: action=set target=alarm color=orange; read: command:set action=set color=orange target=alarm<br>fo-0010#lc: "footer: gray" gold: action=set target=footer color=gray; read: command:set action=set color=gray target=footer |
| held | command:create | 56 | fo-0001#lc: "put a gray hexagon called Switch between fw1 and lan" gold: action=create shape=hexagon color=gray name=switch position=between anchor=fw1,lan; read: command:create action=create anchor=fw1,lan color=gray name=switch position=between shape=hexagon<br>fo-0004#lc: "add a small red diamond called Dlq below clean" gold: action=create shape=diamond color=red size=small name=dlq position=below anchor=clean; read: command:create action=create anchor=clean color=red name=dlq position=below shape=diamond size=small<br>fo-0018#lc: "add uh three small yellow circles under lambda" gold: action=create shape=circle color=yellow size=small count=3 position=below anchor=lambda; read: command:create action=create anchor=lambda color=yellow count=3 position=below shape=circle size=small |
| held | command:move | 48 | fo-0020#lc: "move transform between extract and load like" gold: action=move target=transform position=between anchor=extract,load; read: command:move action=move anchor=extract,load position=between target=transform<br>fo-0020#lc: "in the bottom right" gold: action=move target=audit position=bottomright; read: command:move action=move position=bottomright target=audit<br>fo-0027#lc: "put error below booting" gold: action=move target=error position=below anchor=booting; read: command:move action=move anchor=booting position=below target=error |
| held | question:count | 33 | fo-0004#lc: "how many rectangles are there right now" gold: ask=count shape=rectangle; read: question:count ask=count shape=rectangle<br>fo-0035#lc: "How many connections in total now" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>fo-0047#lc: "How many circles we have" gold: ask=count shape=circle; read: question:count ask=count shape=circle |
| held | question:property | 27 | fo-0012#lc: "What colour is rds" gold: ask=property target=rds property=color; read: question:property ask=property property=color target=rds<br>fo-0037#lc: "whats the colour of store" gold: ask=property target=store property=color; read: question:property ask=property property=color target=store<br>fo-0042#lc: "What's the label on results" gold: ask=property target=results property=label; read: question:property ask=property property=label target=results |
| held | command:arrange | 23 | fo-0010#lc: "card1, card2 and card3 should sit in a row" gold: action=arrange target=card1,card2,card3 layout=row; read: command:arrange action=arrange layout=row target=card1,card2,card3<br>fo-0031#lc: "put them in a row" gold: action=arrange target=$new layout=row; read: command:arrange action=arrange layout=row target=$new<br>fo-0035#lc: "Arrange leaf1, leaf2, leaf3 and leaf4 in a row" gold: action=arrange target=leaf1,leaf2,leaf3,leaf4 layout=row; read: command:arrange action=arrange layout=row target=leaf1,leaf2,leaf3,leaf4 |
| held | question:check | 19 | fo-0032#lc: "Is ecr smaller than eks" gold: ask=check target=ecr comparison=smaller anchor=eks; read: question:check ask=check anchor=eks comparison=smaller target=ecr<br>fo-0160#lc: "Is the sun bigger than Jupiter" gold: ask=check target=sun comparison=bigger anchor=$new; read: question:check ask=check anchor=$new comparison=bigger target=sun<br>fo-0204#lc: "is Drop below cloud now" gold: ask=check target=$new position=below anchor=cloud; read: question:check ask=check anchor=cloud position=below target=$new |
| held | (27 more keys; all in the JSON) | | |

**Structural holds** (9)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 6 | fo-0184#lc: "genes to the right of it" gold: -; read: command:create action=create<br>fo-0222#lc: "what about zooplankton and tuna" gold: -; read: question:help ask=help<br>fo-0296#lc: "child1" gold: -; read: command:create action=create |

## t1s / all (1791 messages, 1791 requested: right 1492, wrong 280, not done 19, extras 53; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 34 |
| actions | 38 |
| values/roles | 280 |
| calibration | 487 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1791); ok (ungated: right + would-be right of structural holds = right of every request executed: 1492); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 280); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 53); ok (ungated: unread = requested - paired: 19); ok (ungated right equals the score file: 1492); ok (ungated wrong equals the score file: 277); ok (ungated extras equals the score file: 52); ok (ungated unread equals the score file: 19); ok (ungated structural holds equal the score file: 4); ok (every produced request is executed, structurally held or (gated) confidence-held: 1825); ok (gated: executed wrong equals the score file: 5); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 4); ok (gated: confidence holds equal the score file: 806); ok (gated: right executed equals the score file: 1010); ok (gated: unread equals the score file: 19); ok (gated: held right + held wrong or extra = confidence holds: 806)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 0 | 0 | 0 | 34 | 34 |
| 4 wrong act | model (act head) | 38 | 0 | 0 | 0 | 38 |
| 6 wrong or missing class value | model (class head) | 260 | 0 | 0 | 0 | 260 |
| 7 wrong words tagged for a name / text key | model (token head) | 20 | 0 | 0 | 0 | 20 |

**t1s / all, trigger seen** (318)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 38 | st1-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: not done (read as command:respace)<br>st1-00156: "spread everything out" gold: requested: spread everything out; read: extra command:respace action=respace target=mention(quantifier=all) (read as command:respace where command:distribute is requested)<br>st1-00161: "what is the border of Clean" gold: ask=property property=outline target=clean; read: not done (read as question:neighbors) |
| 6 wrong or missing class value | model (class head) | 260 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set color=navy target=sales<br>st1-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused |
| 7 wrong words tagged for a name / text key | model (token head) | 20 | st1-00062: "redo it 4 times" gold: action=redo count=4; read: action=redo<br>st1-00184: "redo that twice" gold: action=redo count=2; read: action=redo<br>st1-00326: "redo it 5 times" gold: action=redo count=5; read: action=redo |

| cause | key | n | examples |
|---|---|---:|---|
| act | question:property read as question:degree | 24 | st1-00253: "what is the border of Store" gold: ask=property property=outline target=store; read: not done<br>st1-00253: "what is the border of Store" gold: requested: what is the border of Store; read: extra question:degree ask=degree target=store<br>st1-00539: "what is the border of Ap2" gold: ask=property property=outline target=ap2; read: not done |
| act | question:property read as question:neighbors | 8 | st1-00161: "what is the border of Clean" gold: ask=property property=outline target=clean; read: not done<br>st1-00161: "what is the border of Clean" gold: requested: what is the border of Clean; read: extra question:neighbors ask=neighbors target=clean<br>st1-01486: "what is the border of Mercury" gold: ask=property property=outline target=mercury; read: not done |
| act | command:distribute read as command:respace | 4 | st1-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: not done<br>st1-00156: "spread everything out" gold: requested: spread everything out; read: extra command:respace action=respace target=mention(quantifier=all)<br>st1-01144: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: not done |
| act | command:create read as command:label | 2 | st1-00611: "add a caption "Flow v2"" gold: action=create shape=text label=flow v2; read: not done<br>st1-00611: "add a caption "Flow v2" for" gold: requested: add a caption "Flow v2"; read: extra command:label action=label label=flow v2 |
| class | outline | 131 | st1-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set color=navy target=sales<br>st1-00036: "give Kitchen a red border" gold: action=set target=kitchen outline=red; read: action=set target=kitchen |
| class | property | 56 | st1-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused<br>st1-00068: "what is the border of Error" gold: ask=property property=outline target=error; read: ask=property target=error<br>st1-00118: "what's the border color of Waiting" gold: ask=property property=outline target=waiting; read: ask=property property=color target=waiting |
| class | target | 52 | st1-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown target=mention(quantifier=all,shape=hexagon) |
| class | color | 16 | st1-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: action=create shape=diamond<br>st1-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: action=create color=navy shape=triangle<br>st1-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: action=create color=navy shape=hexagon |
| class | size | 13 | st1-00050: "how many huge ellipses are there" gold: ask=count shape=ellipse size=huge; read: ask=count shape=ellipse<br>st1-00496: "how many huge rectangles are there" gold: ask=count shape=rectangle size=huge; read: ask=count shape=rectangle<br>st1-00614: "how many giant triangles are there" gold: ask=count shape=triangle size=huge; read: ask=count shape=triangle |
| class | direction | 6 | st1-00093: "move Battery right" gold: action=move target=battery direction=right; read: action=move target=battery<br>st1-00209: "move Atom up" gold: action=move target=atom direction=up; read: action=move target=atom<br>st1-00333: "move Check up" gold: action=move target=check direction=up; read: action=move target=check |
| class | style | 2 | st1-01012: "make the arrow from Worker to Kafka solid" gold: action=set from=worker to=kafka style=solid; read: action=set from=worker to=kafka<br>st1-01736: "make all the lines dashed" gold: action=set kind=edge style=dashed target=mention(quantifier=all); read: action=set kind=edge target=mention(quantifier=all) |
| class | kind | 1 | st1-02236: "make the arrows navy" gold: action=set kind=edge color=navy target=mention(quantifier=all); read: action=set color=navy |
| name | count | 18 | st1-00062: "redo it 4 times" gold: action=redo count=4; read: action=redo<br>st1-00184: "redo that twice" gold: action=redo count=2; read: action=redo<br>st1-00326: "redo it 5 times" gold: action=redo count=5; read: action=redo |
| name | label | 2 | st1-00822: "label the link between Milk and Oven "writes"" gold: action=label label=writes from=milk to=oven; read: action=label from=milk to=oven<br>st1-02315: "label the link between Camp and Volcano "writes"" gold: action=label label=writes from=camp to=volcano; read: action=label from=camp to=volcano |

**t1s / all, trigger no request** (34)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3* extra on text with no requested action | model (cut head or act head; the records cannot tell) | 34 | st1-00153: "me" gold: -; read: extra command:create action=create (no requested action on this text)<br>st1-00175: "me" gold: -; read: extra command:create action=create (no requested action on this text)<br>st1-00247: "me" gold: -; read: extra command:create action=create (no requested action on this text) |

| cause | key | n | examples |
|---|---|---:|---|
| spurious | command:create | 28 | st1-00153: "me" gold: -; read: extra command:create action=create<br>st1-00175: "me" gold: -; read: extra command:create action=create<br>st1-00247: "me" gold: -; read: extra command:create action=create |
| spurious | question:help | 5 | st1-00338: "you can" gold: -; read: extra question:help ask=help aspect=can<br>st1-00412: "can" gold: -; read: extra question:help ask=help aspect=can<br>st1-01261: "can" gold: -; read: extra question:help ask=help aspect=can |
| spurious | command:disconnect | 1 | st1-02237: "you" gold: -; read: extra command:disconnect action=disconnect |

### t1s / all at the cost-10 threshold (0.9150)

Executed: right 1010, wrong 5, extras 0. Structural holds 4 ({"blocked":4}; 0 of them would have been right). Confidence holds 806: right 482, wrong or extra 324. Unread 19.

**Executed wrong, by first cause** (5)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 5 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.968; wrong)<br>st1-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square) (confidence 0.920; wrong)<br>st1-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.984; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | target | 5 | st1-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square)<br>st1-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) |

**Right but held by confidence** (482)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 219 | st1-00000: "make a funnel of Clean, Source, Enrich, Archive and Loader" gold: action=create template=funnel items=clean,source,enrich,archive,loader; read: command:create action=create items=clean,source,enrich,archive,loader template=funnel<br>st1-00001: "add a black circle" gold: action=create shape=circle color=black; read: command:create action=create color=black shape=circle<br>st1-00019: "add a cyan triangle" gold: action=create shape=triangle color=cyan; read: command:create action=create color=cyan shape=triangle |
| held | command:set | 97 | st1-00011: "make the links red" gold: action=set kind=edge color=red target=mention(quantifier=all); read: command:set action=set color=red kind=edge target=mention(quantifier=all)<br>st1-00058: "make the arrow from M to Y orange" gold: action=set from=m to=y color=orange; read: command:set action=set color=orange from=m to=y<br>st1-00077: "make Ingest teal" gold: action=set target=ingest color=teal; read: command:set action=set color=teal target=ingest |
| held | command:move | 55 | st1-00035: "move Keeper left" gold: action=move target=keeper direction=left; read: command:move action=move direction=left target=keeper<br>st1-00057: "move Budget left" gold: action=move target=budget direction=left; read: command:move action=move direction=left target=budget<br>st1-00155: "move Resistor right" gold: action=move target=resistor direction=right; read: command:move action=move direction=right target=resistor |
| held | command:redo | 37 | st1-00010: "redo that quickly" gold: action=redo; read: command:redo action=redo<br>st1-00017: "redo for me" gold: action=redo; read: command:redo action=redo<br>st1-00124: "redo for me" gold: action=redo; read: command:redo action=redo |
| held | question:count | 23 | st1-00076: "how many arrows are there for me" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00140: "count the connections" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small |
| held | command:label | 16 | st1-00030: "label the arrow from Sprint1 to Task7 "writes"" gold: action=label label=writes from=sprint1 to=task7; read: command:label action=label from=sprint1 label=writes to=task7<br>st1-00103: "label the link between Export and Sink "reads"" gold: action=label label=reads from=export to=sink; read: command:label action=label from=export label=reads to=sink<br>st1-00412: "label the line from Qb to Wr1 "sync" if" gold: action=label label=sync from=qb to=wr1; read: command:label action=label from=qb label=sync to=wr1 |
| held | command:delete | 7 | st1-00371: "remove Etl if you can" gold: action=delete target=etl; read: command:delete action=delete target=etl<br>st1-00807: "remove Intern quickly" gold: action=delete target=intern; read: command:delete action=delete target=intern<br>st1-00863: "remove Begin quickly" gold: action=delete target=begin; read: command:delete action=delete target=begin |
| held | command:undo | 4 | st1-00067: "undo quickly" gold: action=undo; read: command:undo action=undo<br>st1-00089: "undo that quickly" gold: action=undo; read: command:undo action=undo<br>st1-00465: "undo that quickly" gold: action=undo; read: command:undo action=undo |
| held | (10 more keys; all in the JSON) | | |

**Structural holds** (4)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 4 | st1-00423: "right" gold: -; read: command:create action=create color=red position=right<br>st1-00599: "make a pyramid with 5 levels quickly" gold: action=create template=pyramid count=5; read: command:create action=create template=pyramid<br>st1-00822: "label the link between Milk and Oven "writes"" gold: action=label label=writes from=milk to=oven; read: command:label action=label from=milk to=oven |

## t1raw / all (70 messages, 70 requested: right 66, wrong 4, not done 0, extras 0; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 0 |
| values/roles | 4 |
| calibration | 22 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 70); ok (ungated: right + would-be right of structural holds = right of every request executed: 66); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 4); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 0); ok (ungated: unread = requested - paired: 0); ok (ungated right equals the score file: 66); ok (ungated wrong equals the score file: 4); ok (ungated extras equals the score file: 0); ok (ungated unread equals the score file: 0); ok (ungated structural holds equal the score file: 0); ok (every produced request is executed, structurally held or (gated) confidence-held: 70); ok (gated: executed wrong equals the score file: 0); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 0); ok (gated: confidence holds equal the score file: 26); ok (gated: right executed equals the score file: 44); ok (gated: unread equals the score file: 0); ok (gated: held right + held wrong or extra = confidence holds: 26)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 6 wrong or missing class value | model (class head) | 4 | 0 | 0 | 0 | 4 |

**t1raw / all, trigger seen** (4)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 4 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=brown shape=square<br>st1-01174: "move the small stars right" gold: action=move target=mention(quantifier=all,shape=star,size=small) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=star)<br>st1-01772: "make the tiny squares gold" gold: action=set target=mention(quantifier=all,shape=square,size=tiny) color=gold; read: action=set color=gold target=mention(quantifier=all,shape=square) |

| cause | key | n | examples |
|---|---|---:|---|
| class | target | 3 | st1-01174: "move the small stars right" gold: action=move target=mention(quantifier=all,shape=star,size=small) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=star)<br>st1-01772: "make the tiny squares gold" gold: action=set target=mention(quantifier=all,shape=square,size=tiny) color=gold; read: action=set color=gold target=mention(quantifier=all,shape=square)<br>st1-02155: "move the big ellipses right" gold: action=move target=mention(quantifier=all,shape=ellipse,size=large) direction=right; read: action=move direction=right target=mention(quantifier=all,shape=ellipse) |
| class | outline | 1 | st1-00723: "add a brown square with a blue border" gold: action=create shape=square color=brown outline=blue; read: action=create color=brown shape=square |

### t1raw / all at the cost-10 threshold (0.9150)

Executed: right 44, wrong 0, extras 0. Structural holds 0 ({}; 0 of them would have been right). Confidence holds 26: right 22, wrong or extra 4. Unread 0.

**Executed wrong, by first cause** (0)

none

**Right but held by confidence** (22)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 16 | st1-00102: "add a yellow ellipse if you can" gold: action=create shape=ellipse color=yellow; read: command:create action=create color=yellow shape=ellipse<br>st1-00236: "add a caption "Home lab"" gold: action=create shape=text label=home lab; read: command:create action=create label=home lab shape=text<br>st1-00265: "add an orange triangle" gold: action=create shape=triangle color=orange; read: command:create action=create color=orange shape=triangle |
| held | command:move | 2 | st1-00035: "move Keeper left" gold: action=move target=keeper direction=left; read: command:move action=move direction=left target=keeper<br>st1-00613: "move Garage left" gold: action=move target=garage direction=left; read: command:move action=move direction=left target=garage |
| held | command:redo | 1 | st1-00668: "redo" gold: action=redo; read: command:redo action=redo |
| held | command:label | 1 | st1-01635: "label the arrow from Lambda to Cache "writes" for me" gold: action=label label=writes from=lambda to=cache; read: command:label action=label from=lambda label=writes to=cache |
| held | command:fit | 1 | st1-01699: "fit the diagram to the screen" gold: action=fit target=mention(quantifier=all); read: command:fit action=fit target=mention(quantifier=all) |
| held | command:set | 1 | st1-01736: "make all the lines dashed" gold: action=set kind=edge style=dashed target=mention(quantifier=all); read: command:set action=set kind=edge style=dashed target=mention(quantifier=all) |

**Structural holds** (0)

none

## t1bs / all (1528 messages, 1528 requested: right 1257, wrong 254, not done 17, extras 17; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 0 |
| actions | 34 |
| values/roles | 254 |
| calibration | 271 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 1528); ok (ungated: right + would-be right of structural holds = right of every request executed: 1257); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 254); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 17); ok (ungated: unread = requested - paired: 17); ok (ungated right equals the score file: 1257); ok (ungated wrong equals the score file: 252); ok (ungated extras equals the score file: 17); ok (ungated unread equals the score file: 17); ok (ungated structural holds equal the score file: 2); ok (every produced request is executed, structurally held or (gated) confidence-held: 1528); ok (gated: executed wrong equals the score file: 5); ok (gated: executed extras equals the score file: 0); ok (gated: structural holds equal the score file: 2); ok (gated: confidence holds equal the score file: 530); ok (gated: right executed equals the score file: 991); ok (gated: unread equals the score file: 17); ok (gated: held right + held wrong or extra = confidence holds: 530)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 4 wrong act | model (act head) | 34 | 0 | 0 | 0 | 34 |
| 6 wrong or missing class value | model (class head) | 243 | 0 | 0 | 0 | 243 |
| 7 wrong words tagged for a name / text key | model (token head) | 11 | 0 | 0 | 0 | 11 |

**t1bs / all, trigger seen** (288)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 34 | st1b-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: not done (read as command:respace)<br>st1b-00156: "spread everything out" gold: requested: spread everything out; read: extra command:respace action=respace target=mention(quantifier=all) (read as command:respace where command:distribute is requested)<br>st1b-00161: "what is the border of Clean" gold: ask=property property=outline target=clean; read: not done (read as question:neighbors) |
| 6 wrong or missing class value | model (class head) | 243 | st1b-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1b-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set color=navy target=sales<br>st1b-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused |
| 7 wrong words tagged for a name / text key | model (token head) | 11 | st1b-00062: "redo it 4 times" gold: action=redo count=4; read: action=redo<br>st1b-00184: "redo that twice" gold: action=redo count=2; read: action=redo<br>st1b-00326: "redo it 5 times" gold: action=redo count=5; read: action=redo |

| cause | key | n | examples |
|---|---|---:|---|
| act | question:property read as question:degree | 24 | st1b-00253: "what is the border of Store" gold: ask=property property=outline target=store; read: not done<br>st1b-00253: "what is the border of Store" gold: requested: what is the border of Store; read: extra question:degree ask=degree target=store<br>st1b-00539: "what is the border of Ap2" gold: ask=property property=outline target=ap2; read: not done |
| act | question:property read as question:neighbors | 8 | st1b-00161: "what is the border of Clean" gold: ask=property property=outline target=clean; read: not done<br>st1b-00161: "what is the border of Clean" gold: requested: what is the border of Clean; read: extra question:neighbors ask=neighbors target=clean<br>st1b-01486: "what is the border of Mercury" gold: ask=property property=outline target=mercury; read: not done |
| act | command:distribute read as command:respace | 2 | st1b-00156: "spread everything out" gold: action=distribute target=mention(quantifier=all); read: not done<br>st1b-00156: "spread everything out" gold: requested: spread everything out; read: extra command:respace action=respace target=mention(quantifier=all) |
| class | outline | 130 | st1b-00009: "add a purple square with a cyan outline" gold: action=create shape=square color=purple outline=cyan; read: action=create color=purple shape=square<br>st1b-00014: "give Sales a navy outline" gold: action=set target=sales outline=navy; read: action=set color=navy target=sales<br>st1b-00036: "give Kitchen a red border" gold: action=set target=kitchen outline=red; read: action=set target=kitchen |
| class | property | 53 | st1b-00018: "what is the outline of Paused" gold: ask=property property=outline target=paused; read: ask=property property=shape target=paused<br>st1b-00068: "what is the border of Error" gold: ask=property property=outline target=error; read: ask=property target=error<br>st1b-00118: "what's the border color of Waiting" gold: ask=property property=outline target=waiting; read: ask=property property=color target=waiting |
| class | target | 48 | st1b-00025: "make the tiny hexagons teal" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=teal; read: action=set color=teal target=mention(color=teal,quantifier=all,shape=hexagon)<br>st1b-00060: "move the little diamonds up" gold: action=move target=mention(quantifier=all,shape=diamond,size=small) direction=up; read: action=move direction=up target=mention(quantifier=all,shape=diamond)<br>st1b-00133: "make the tiny hexagons brown" gold: action=set target=mention(quantifier=all,shape=hexagon,size=tiny) color=brown; read: action=set color=brown target=mention(quantifier=all,shape=hexagon) |
| class | color | 16 | st1b-00294: "add a blue diamond with a pink border" gold: action=create shape=diamond color=blue outline=pink; read: action=create shape=diamond<br>st1b-00322: "make a yellow triangle with a navy outline" gold: action=create shape=triangle color=yellow outline=navy; read: action=create color=navy shape=triangle<br>st1b-00428: "add an orange hexagon with a navy outline" gold: action=create shape=hexagon color=orange outline=navy; read: action=create color=navy shape=hexagon |
| class | size | 11 | st1b-00050: "how many huge ellipses are there" gold: ask=count shape=ellipse size=huge; read: ask=count shape=ellipse<br>st1b-00496: "how many huge rectangles are there" gold: ask=count shape=rectangle size=huge; read: ask=count shape=rectangle<br>st1b-00614: "how many giant triangles are there" gold: ask=count shape=triangle size=huge; read: ask=count shape=triangle |
| class | direction | 1 | st1b-00093: "move Battery right" gold: action=move target=battery direction=right; read: action=move target=battery |
| class | kind | 1 | st1b-02236: "make the arrows navy" gold: action=set kind=edge color=navy target=mention(quantifier=all); read: action=set color=navy |
| name | count | 9 | st1b-00062: "redo it 4 times" gold: action=redo count=4; read: action=redo<br>st1b-00184: "redo that twice" gold: action=redo count=2; read: action=redo<br>st1b-00326: "redo it 5 times" gold: action=redo count=5; read: action=redo |
| name | label | 2 | st1b-00822: "label the link between Milk and Oven "writes"" gold: action=label label=writes from=milk to=oven; read: action=label from=milk to=oven<br>st1b-02315: "label the link between Camp and Volcano "writes"" gold: action=label label=writes from=camp to=volcano; read: action=label from=camp to=volcano |

### t1bs / all at the cost-10 threshold (0.9150)

Executed: right 991, wrong 5, extras 0. Structural holds 2 ({"blocked":2}; 0 of them would have been right). Confidence holds 530: right 266, wrong or extra 264. Unread 17.

**Executed wrong, by first cause** (5)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 6 wrong or missing class value | model (class head) | 5 | st1b-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.969; wrong)<br>st1b-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square) (confidence 0.920; wrong)<br>st1b-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) (confidence 0.984; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| class | target | 5 | st1b-00192: "erase the large triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=large); read: command:delete action=delete target=mention(quantifier=all,shape=triangle)<br>st1b-00308: "erase the giant squares" gold: action=delete target=mention(quantifier=all,shape=square,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=square)<br>st1b-01506: "erase the giant triangles" gold: action=delete target=mention(quantifier=all,shape=triangle,size=huge); read: command:delete action=delete target=mention(quantifier=all,shape=triangle) |

**Right but held by confidence** (266)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:create | 138 | st1b-00000: "make a funnel of Clean, Source, Enrich, Archive and Loader" gold: action=create template=funnel items=clean,source,enrich,archive,loader; read: command:create action=create items=clean,source,enrich,archive,loader template=funnel<br>st1b-00001: "add a black circle" gold: action=create shape=circle color=black; read: command:create action=create color=black shape=circle<br>st1b-00033: "add a cyan diamond" gold: action=create shape=diamond color=cyan; read: command:create action=create color=cyan shape=diamond |
| held | command:set | 75 | st1b-00085: "make the arrow from Todo to Task7 solid" gold: action=set from=todo to=task7 style=solid; read: command:set action=set from=todo style=solid to=task7<br>st1b-00120: "make the arrow from Winger to Safety two-way" gold: action=set from=winger to=safety arrow=both; read: command:set action=set arrow=both from=winger to=safety<br>st1b-00130: "give Ticket9 a cyan border" gold: action=set target=ticket9 outline=cyan; read: command:set action=set outline=cyan target=ticket9 |
| held | command:move | 23 | st1b-00035: "move Keeper left" gold: action=move target=keeper direction=left; read: command:move action=move direction=left target=keeper<br>st1b-00109: "move Port left" gold: action=move target=port direction=left; read: command:move action=move direction=left target=port<br>st1b-00155: "move Resistor right" gold: action=move target=resistor direction=right; read: command:move action=move direction=right target=resistor |
| held | command:label | 11 | st1b-00030: "label the arrow from Sprint1 to Task7 "writes"" gold: action=label label=writes from=sprint1 to=task7; read: command:label action=label from=sprint1 label=writes to=task7<br>st1b-00103: "label the link between Export and Sink "reads"" gold: action=label label=reads from=export to=sink; read: command:label action=label from=export label=reads to=sink<br>st1b-00860: "label the arrow from Mom to Bob "reads"" gold: action=label label=reads from=mom to=bob; read: command:label action=label from=mom label=reads to=bob |
| held | question:count | 8 | st1b-00140: "count the connections" gold: ask=count kind=edge; read: question:count ask=count kind=edge<br>st1b-00150: "how many small diamonds are there" gold: ask=count shape=diamond size=small; read: question:count ask=count shape=diamond size=small<br>st1b-00250: "how many small circles are there" gold: ask=count shape=circle size=small; read: question:count ask=count shape=circle size=small |
| held | command:snap | 2 | st1b-00207: "snap all shapes to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all)<br>st1b-01283: "snap everything to the grid" gold: action=snap target=mention(quantifier=all); read: command:snap action=snap target=mention(quantifier=all) |
| held | command:equalize | 2 | st1b-00248: "make all the shapes the same color" gold: action=equalize target=mention(quantifier=all) property=color; read: command:equalize action=equalize property=color target=mention(quantifier=all)<br>st1b-01500: "make all the shapes the same size" gold: action=equalize target=mention(quantifier=all) property=size; read: command:equalize action=equalize property=size target=mention(quantifier=all) |
| held | command:sort | 2 | st1b-00374: "sort the shapes by name" gold: action=sort target=mention(quantifier=all) property=name; read: command:sort action=sort property=name target=mention(quantifier=all)<br>st1b-00704: "sort everything by color" gold: action=sort target=mention(quantifier=all) property=color; read: command:sort action=sort property=color target=mention(quantifier=all) |
| held | (4 more keys; all in the JSON) | | |

**Structural holds** (2)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 2 | st1b-00822: "label the link between Milk and Oven "writes"" gold: action=label label=writes from=milk to=oven; read: command:label action=label from=milk to=oven<br>st1b-02315: "label the link between Camp and Volcano "writes"" gold: action=label label=writes from=camp to=volcano; read: command:label action=label from=camp to=volcano |

## short3s / all (333 messages, 424 requested: right 278, wrong 112, not done 34, extras 29; every request executed, structural holds included)

| plan category | misses and extras |
|---|---:|
| data | 0 |
| labels | not measured |
| output limitations | 0 |
| cuts | 21 |
| actions | 46 |
| values/roles | 108 |
| calibration | 187 |
| preprocessing | 0 |
| unexplained | 0 |

Reconciliation with the score file: ok (requested: 424); ok (ungated: right + would-be right of structural holds = right of every request executed: 278); ok (ungated: wrong + would-be wrong of structural holds = wrong of every request executed: 112); ok (ungated: extras + would-be extras of structural holds = extras of every request executed: 29); ok (ungated: unread = requested - paired: 34); ok (ungated right equals the score file: 278); ok (ungated wrong equals the score file: 107); ok (ungated extras equals the score file: 26); ok (ungated unread equals the score file: 34); ok (ungated structural holds equal the score file: 8); ok (every produced request is executed, structurally held or (gated) confidence-held: 419); ok (gated: executed wrong equals the score file: 5); ok (gated: executed extras equals the score file: 1); ok (gated: structural holds equal the score file: 8); ok (gated: confidence holds equal the score file: 308); ok (gated: right executed equals the score file: 97); ok (gated: unread equals the score file: 34); ok (gated: held right + held wrong or extra = confidence holds: 308)

| first cause | place | seen | unseen | unannotated | no request | all |
|---|---|---:|---:|---:|---:|---:|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 16 | 0 | 0 | 5 | 21 |
| 4 wrong act | model (act head) | 28 | 18 | 0 | 0 | 46 |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 8 | 0 | 0 | 0 | 8 |
| 6 wrong or missing class value | model (class head) | 40 | 10 | 0 | 0 | 50 |
| 7 wrong words tagged for a name / text key | model (token head) | 41 | 9 | 0 | 0 | 50 |

**short3s / all, trigger seen** (133)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 16 | s3-0057: "red for check" gold: action=set target=check color=red; read: action=set color=red (the unit covers 23% of the span)<br>s3-0113: "bin done" gold: action=delete target=done; read: not done (lost: no unit on the span)<br>s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done (only a part of the span is a unit) |
| 4 wrong act | model (act head) | 28 | s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done (read as command:create)<br>s3-0035: "check under process" gold: requested: check under process; read: extra command:create action=create anchor=done position=below (read as command:create where command:move is requested)<br>s3-0057: "for check" gold: requested: red for check; read: extra command:create action=create (read as command:create where command:set is requested) |
| 5 a reference the request does not write (needs the drawing) | front end (the drawing is not in the input) | 8 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: action=move position=center (a name written in another request or by a pronoun)<br>s3-0193: "also bigger" gold: action=resize target=check; read: action=resize (a name written in another request or by a pronoun)<br>s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done (a name written in another request or by a pronoun) |
| 6 wrong or missing class value | model (class head) | 40 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle<br>s3-0005: "dotted line process to done" gold: action=connect from=process to=done style=dotted arrow=none; read: action=connect arrow=none to=done<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5 |
| 7 wrong words tagged for a name / text key | model (token head) | 41 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move anchor=done position=below<br>s3-0016: "where is check?" gold: ask=property target=check property=position; read: ask=property property=position |

| cause | key | n | examples |
|---|---|---:|---|
| cut | (command:set) | 4 | s3-0057: "red for check" gold: action=set target=check color=red; read: action=set color=red<br>s3-0122: "everything gray" gold: action=set target=mention(quantifier=all) color=gray; read: action=set color=gray<br>s3-0122: "except Done which is red" gold: action=set target=done color=red; read: not done |
| cut | (command:create) | 3 | s3-0146: "create Api" gold: action=create shape=square name=api; read: action=create shape=square<br>s3-0146: "Db squares" gold: action=create shape=square name=db; read: not done<br>s3-0252: "add Sub1" gold: action=create name=sub1 position=below anchor=process; read: not done |
| cut | (command:delete) | 1 | s3-0113: "bin done" gold: action=delete target=done; read: not done |
| cut | (command:straighten) | 1 | s3-0119: "tidy the arrows so they're straight" gold: action=straighten target=mention(quantifier=all); read: not done |
| cut | (command:toFront) | 1 | s3-0131: "done on top" gold: action=tofront target=done; read: not done |
| cut | (command:undo) | 1 | s3-0137: "undo" gold: action=undo; read: not done |
| cut | (command:rename) | 1 | s3-0305: "named Gate" gold: action=rename target=check name=gate; read: not done |
| cut | (question:property) | 1 | s3-0333: "where is it" gold: ask=property target=intake property=position; read: not done |
| act | command:move read as command:create | 4 | s3-0035: "check under process" gold: action=move target=check position=below anchor=process; read: not done<br>s3-0035: "check under process" gold: requested: check under process; read: extra command:create action=create anchor=done position=below<br>s3-0303: "put check between start and done" gold: action=move target=check position=between anchor=start,done; read: not done |
| act | command:arrange read as command:create | 4 | s3-0093: "make a timeline with Start Process Check Done" gold: action=arrange template=timeline target=start,process,check,done; read: not done<br>s3-0093: "make a timeline with Start Process Check Done" gold: requested: make a timeline with Start Process Check Done; read: extra command:create action=create items=start process check,done template=timeline<br>s3-0264: "radial around start" gold: action=arrange layout=radial anchor=start; read: not done |
| act | command:set read as command:create | 3 | s3-0057: "for check" gold: requested: red for check; read: extra command:create action=create<br>s3-0363: "add a thick green edge around Done" gold: action=set target=done outline=green; read: not done<br>s3-0363: "add a thick green edge around Done" gold: requested: add a thick green edge around Done; read: extra command:create action=create anchor=done color=green position=near |
| act | command:rename read as command:label | 2 | s3-0087: "Begin instead of Start" gold: action=rename target=start name=begin; read: not done<br>s3-0087: "Begin instead of Start" gold: requested: Begin instead of Start; read: extra command:label action=label from=begin |
| act | command:label read as command:connect | 2 | s3-0247: "arrow check→done: "yes"" gold: action=label from=check to=done label=yes; read: not done<br>s3-0247: "arrow check→done: "yes"" gold: requested: arrow check→done: "yes"; read: extra command:connect action=connect from=check label=yes to=done |
| act | command:create read as command:move | 2 | s3-0252: "Sub2 below Process" gold: action=create name=sub2 position=below anchor=process; read: not done<br>s3-0252: "add Sub1 and Sub2 below Process" gold: requested: Sub2 below Process; read: extra command:move action=move anchor=process position=below target=sub1,sub2 |
| act | question:property read as command:label | 2 | s3-0262: "text on the check to done arrow?" gold: ask=property property=label from=check to=done; read: not done<br>s3-0262: "text on the check to done arrow" gold: requested: text on the check to done arrow?; read: extra command:label action=label |
| act | command:rename read as command:connect | 2 | s3-0290: "check to Test" gold: action=rename target=check name=test; read: not done<br>s3-0290: "check to Test" gold: requested: check to Test; read: extra command:connect action=connect from=process to=test |
| ref | target | 5 | s3-0016: "move it to the center" gold: action=move target=check position=center; read: action=move position=center<br>s3-0193: "also bigger" gold: action=resize target=check; read: action=resize<br>s3-0266: "make it a star" gold: action=set target=end shape=star; read: action=set shape=star target=done |
| ref | from | 2 | s3-0197: "label that arrow "fast path"" gold: action=label from=start to=done label=fast path; read: action=label from=done label=fast path to=done<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip target=check |
| ref | to | 2 | s3-0208: "if not connect them" gold: action=connect from=check to=done; read: action=connect from=check to=check<br>s3-0398: "label it "skip"" gold: action=label from=start to=check label=skip; read: action=label label=skip target=check |
| class | target | 12 | s3-0067: "stack everything in a column" gold: action=arrange target=mention(quantifier=all) layout=column; read: action=arrange layout=column<br>s3-0076: "recolor start to navy" gold: action=set target=start color=navy; read: action=set color=navy target=mention()<br>s3-0152: "improve the layout pls" gold: action=improve target=mention(quantifier=all); read: action=improve target=mention() |
| class | template | 10 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5<br>s3-0107: "cycle of 6 with labels 1 to 6, all blue" gold: action=create template=cycle items=1,2,3,4,5,6 color=blue; read: action=create color=blue<br>s3-0215: "show the four shapes as a timeline" gold: action=arrange template=timeline target=mention(quantifier=all); read: action=arrange |
| class | layout | 6 | s3-0098: "four squares stacked on the left" gold: action=create count=4 shape=square layout=column position=left; read: action=create count=4 layout=row position=left shape=square<br>s3-0168: "draw 4 green circles in a line along the top" gold: action=create count=4 shape=circle color=green layout=row position=top; read: action=create color=green count=4 position=bottom shape=circle<br>s3-0221: "make the flow go left to right" gold: action=arrange layout=layers direction=right; read: action=arrange direction=right layout=row |
| class | topic | 4 | s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: ask=help aspect=can topic=label<br>s3-0326: "how to delete everything" gold: ask=help topic=delete aspect=how; read: ask=help aspect=how<br>s3-0412: "what sizes can shapes be" gold: ask=help topic=size aspect=values; read: ask=help aspect=values |
| class | shape | 3 | s3-0111: "add a note under Done: needs review" gold: action=create shape=text label=needs review position=below anchor=done; read: action=create anchor=done label=needs review position=below<br>s3-0270: "make the green circle a rectangle" gold: action=set target=mention(color=green,shape=circle) shape=rectangle; read: action=set shape=circle target=mention(color=green,shape=circle)<br>s3-0379: "make check diamond yellow big" gold: action=set target=check shape=diamond color=yellow size=large; read: action=set color=yellow size=large target=check |
| class | position | 2 | s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: action=create count=5<br>s3-0168: "draw 4 green circles in a line along the top" gold: action=create count=4 shape=circle color=green layout=row position=top; read: action=create color=green count=4 position=bottom shape=circle |
| class | arrow | 2 | s3-0431: "connect process to done, no arrow, gray" gold: action=connect from=process to=done arrow=none color=gray; read: action=connect color=gray from=process to=done<br>s3-0434: "link Done to Check, dotted, both directions" gold: action=connect from=done to=check style=dotted arrow=both; read: action=connect arrow=none from=done style=dotted to=check |
| class | fill | 1 | s3-0002: "put a pale blue rectangle behind everything as a background panel" gold: action=create shape=rectangle color=blue fill=light layer=background; read: action=create color=blue shape=rectangle |
| name | target | 24 | s3-0003: "copy check" gold: action=duplicate target=check; read: action=duplicate<br>s3-0003: "put the copy below done" gold: action=move target=$new position=below anchor=done; read: action=move anchor=done position=below<br>s3-0016: "where is check?" gold: ask=property target=check property=position; read: ask=property property=position |
| name | from | 6 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0200: "connect check to start" gold: action=connect from=check to=start; read: action=connect to=start<br>s3-0229: "redraw them as a chain Start Process Check Done" gold: action=connect from=start,process,check,done; read: action=connect |
| name | to | 5 | s3-0025: "connect Hub to Start Process Check Done" gold: action=connect from=$new to=start,process,check,done; read: action=connect from=$new to=start<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: action=connect from=api to=db<br>s3-0252: "connect Process to both" gold: action=connect from=process to=$new,$new; read: action=connect from=process |
| name | about | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: ask=help about=export aspect=can<br>s3-0236: "what does SOP Lang mean" gold: ask=help about=sop lang; read: ask=help |
| name | anchor | 2 | s3-0318: "tree layout, root Start, growing down" gold: action=arrange layout=tree anchor=start direction=down; read: action=arrange direction=down layout=tree<br>s3-0336: "lay it out as layers, start at the left" gold: action=arrange layout=layers direction=right anchor=start; read: action=arrange direction=right layout=layers |
| name | scale | 1 | s3-0081: "scale process by 1.5" gold: action=resize target=process; read: action=resize target=process |
| name | name | 1 | s3-0109: "circle Y at 700,100" gold: action=create shape=circle name=y at=700,100; read: action=create at=700,100 shape=circle |
| name | count | 1 | s3-0166: "add a 3 by 3 grid of small squares" gold: action=create count=9 shape=square size=small layout=grid; read: action=create layout=grid shape=square size=small |
| cut | (3 more keys; all in the JSON) | | |
| act | (4 more keys; all in the JSON) | | |
| class | (6 more keys; all in the JSON) | | |
| name | (1 more keys; all in the JSON) | | |

**short3s / all, trigger unseen** (37)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 18 | s3-0008: "can you add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: not done (read as command:create)<br>s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: requested: can you add the word "approved" next to the arrow going fro…; read: extra command:create action=create label=approved (read as command:create where command:label is requested)<br>s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done (read as command:create) |
| 6 wrong or missing class value | model (class head) | 10 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: action=set color=white shape=circle target=mention(quantifier=all,shape=circle)<br>s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create<br>s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: ask=check anchor=done comparison=bigger target=check |
| 7 wrong words tagged for a name / text key | model (token head) | 9 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label label=end |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:set read as command:create | 4 | s3-0112: "red outline around process" gold: action=set target=process outline=red; read: not done<br>s3-0112: "red outline around process" gold: requested: red outline around process; read: extra command:create action=create color=red<br>s3-0322: "take the border off process" gold: action=set target=process outline=none; read: not done |
| act | command:label read as command:create | 2 | s3-0008: "can you add the word "approved" next to the arrow going from Check to Done" gold: action=label from=check to=done label=approved; read: not done<br>s3-0008: "add the word "approved" next to the arrow going from Check to Done" gold: requested: can you add the word "approved" next to the arrow going fro…; read: extra command:create action=create label=approved |
| act | command:set read as command:disconnect | 2 | s3-0181: "no border on start" gold: action=set target=start outline=none; read: not done<br>s3-0181: "no border on start" gold: requested: no border on start; read: extra command:disconnect action=disconnect |
| act | command:set read as question:check | 2 | s3-0193: "check pink" gold: action=set target=check color=pink; read: not done<br>s3-0193: "check pink" gold: requested: check pink; read: extra question:check ask=check color=pink |
| act | command:disconnect read as command:untangle | 2 | s3-0310: "no more arrows on done" gold: action=disconnect target=done; read: not done<br>s3-0310: "no more arrows on done" gold: requested: no more arrows on done; read: extra command:untangle action=untangle target=mention(quantifier=all) |
| act | command:resize read as question:count | 2 | s3-0365: "double check's size" gold: action=resize target=check; read: not done<br>s3-0365: "double check's size" gold: requested: double check's size; read: extra question:count ask=count |
| act | command:move read as command:toFront | 2 | s3-0516: "start should be on top" gold: action=move target=start position=top; read: not done<br>s3-0516: "start should be on top" gold: requested: start should be on top; read: extra command:toFront action=tofront target=start |
| act | fact: read as command:create | 2 | s3-0517: "check lives in the top right" gold: target=check position=topright; read: not done<br>s3-0517: "check lives in the top right" gold: requested: check lives in the top right; read: extra command:create action=create position=topright |
| class | outline | 4 | s3-0034: "all circles with a white outline" gold: action=set target=mention(quantifier=all,shape=circle) outline=white; read: action=set color=white shape=circle target=mention(quantifier=all,shape=circle)<br>s3-0170: "outline start black" gold: action=set target=start outline=black; read: action=set color=black target=outline<br>s3-0170: "outline done black" gold: action=set target=done outline=black; read: action=set color=black target=outline |
| class | template | 2 | s3-0063: "swot matrix" gold: action=create template=matrix; read: action=create<br>s3-0074: "hub and spoke, Core in the middle with 6 spokes" gold: action=create template=hub title=core count=6; read: action=create count=6 position=center |
| class | position | 1 | s3-0071: "check higher than done?" gold: ask=check target=check position=above anchor=done; read: ask=check anchor=done comparison=bigger target=check |
| class | topic | 1 | s3-0155: "which colors can i use" gold: ask=help topic=color aspect=values; read: ask=help aspect=values topic=size |
| class | property | 1 | s3-0358: "what is the outline color of process" gold: ask=property target=process property=outline; read: ask=property property=color target=process |
| class | layout | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange layout=organic |
| class | direction | 1 | s3-0496: "flow chart style, vertical" gold: action=arrange layout=layers direction=down; read: action=arrange layout=organic |
| name | target | 5 | s3-0079: "hexagon for start" gold: action=set target=start shape=hexagon; read: action=set shape=hexagon<br>s3-0083: "process no label" gold: action=label target=process label=; read: action=label label=<br>s3-0135: "done "end"" gold: action=label target=done label=end; read: action=label label=end |
| name | to | 2 | s3-0348: "check -> done should be labeled yes" gold: action=label from=check to=done label=yes; read: action=label from=check label=yes<br>s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check |
| name | from | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check |
| name | label | 1 | s3-0372: "clear arrow label check done" gold: action=label from=check to=done label=; read: action=label label=check |
| name | count | 1 | s3-0396: "twelve circles in a circle" gold: action=create count=12 shape=circle layout=circle; read: action=create layout=circle shape=circle |
| name | linked | 1 | s3-0422: "Done and Start are connected" gold: target=done linked=start; read: target=done |

**short3s / all, trigger no request** (5)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 3 the cut lost or merged the span (or split it) | model (cut head) | 5 | s3-0074: "hub and spoke" gold: -; read: extra command:create action=create (partial overlap with a requested action: 28% of it)<br>s3-0119: "tidy the arrows" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) (partial overlap with a requested action: 43% of it)<br>s3-0311: "Code" gold: -; read: extra command:create action=create name=code (partial overlap with a requested action: 12% of it) |

| cause | key | n | examples |
|---|---|---:|---|
| cut | command:create | 4 | s3-0074: "hub and spoke" gold: -; read: extra command:create action=create<br>s3-0311: "Code" gold: -; read: extra command:create action=create name=code<br>s3-0311: "Data" gold: -; read: extra command:create action=create anchor=$new name=data position=rightof |
| cut | command:improve | 1 | s3-0119: "tidy the arrows" gold: -; read: extra command:improve action=improve target=mention(quantifier=all) |

### short3s / all at the cost-10 threshold (0.9150)

Executed: right 97, wrong 5, extras 1. Structural holds 8 ({"blocked":7,"dependency":1}; 0 of them would have been right). Confidence holds 308: right 181, wrong or extra 127. Unread 34.

**Executed wrong, by first cause** (6)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|
| 4 wrong act | model (act head) | 1 | s3-0252: "add Sub1 and Sub2 below Process" gold: -; read: extra command:move action=move anchor=process position=below target=sub1,sub2 (confidence 0.965; extra) |
| 6 wrong or missing class value | model (class head) | 3 | s3-0293: "trash the small squares" gold: action=delete target=mention(quantifier=all,shape=square,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=square) (confidence 0.921; wrong)<br>s3-0379: "make check diamond yellow big" gold: action=set target=check shape=diamond color=yellow size=large; read: command:set action=set color=yellow size=large target=check (confidence 0.951; wrong)<br>s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: question:help ask=help aspect=how topic=text (confidence 0.925; wrong) |
| 7 wrong words tagged for a name / text key | model (token head) | 2 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help about=export aspect=can (confidence 0.940; wrong)<br>s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db (confidence 0.990; wrong) |

| cause | key | n | examples |
|---|---|---:|---|
| act | command:create read as command:move | 1 | s3-0252: "add Sub1 and Sub2 below Process" gold: -; read: extra command:move action=move anchor=process position=below target=sub1,sub2 |
| class | target | 1 | s3-0293: "trash the small squares" gold: action=delete target=mention(quantifier=all,shape=square,size=small); read: command:delete action=delete target=mention(quantifier=all,shape=square) |
| class | shape | 1 | s3-0379: "make check diamond yellow big" gold: action=set target=check shape=diamond color=yellow size=large; read: command:set action=set color=yellow size=large target=check |
| class | topic | 1 | s3-0495: "how do i put text inside a shape" gold: ask=help topic=label aspect=how; read: question:help ask=help aspect=how topic=text |
| name | about | 1 | s3-0138: "is it possible to export as png" gold: ask=help aspect=can about=export as png; read: question:help ask=help about=export aspect=can |
| name | from | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |
| name | to | 1 | s3-0146: "connect Api to Db" gold: action=connect from=$new to=$new; read: command:connect action=connect from=api to=db |

**Right but held by confidence** (181)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| held | command:set | 21 | s3-0049: "everything black" gold: action=set target=mention(quantifier=all) color=black; read: command:set action=set color=black target=mention(quantifier=all)<br>s3-0078: "turn the diamond pink" gold: action=set target=mention(shape=diamond) color=pink; read: command:set action=set color=pink target=mention(shape=diamond)<br>s3-0124: "set process color to magenta" gold: action=set target=process color=magenta; read: command:set action=set color=magenta target=process |
| held | command:create | 20 | s3-0018: "process steps: Plan, Build, Test, Ship" gold: action=create template=process items=plan,build,test,ship; read: command:create action=create items=plan,build,test,ship template=process<br>s3-0019: "a staircase of 4 steps going up" gold: action=create template=steps count=4; read: command:create action=create count=4 template=steps<br>s3-0022: "square top left" gold: action=create shape=square position=topleft; read: command:create action=create position=topleft shape=square |
| held | command:connect | 13 | s3-0013: "connect start straight to check" gold: action=connect from=start to=check; read: command:connect action=connect from=start to=check<br>s3-0109: "join them" gold: action=connect from=$new to=$new; read: command:connect action=connect from=$new to=$new<br>s3-0116: "Can you connect Done back to Start with a blue dashed arrow" gold: action=connect from=done to=start color=blue style=dashed; read: command:connect action=connect color=blue from=done style=dashed to=start |
| held | command:move | 13 | s3-0035: "put done under check" gold: action=move target=done position=below anchor=check; read: command:move action=move anchor=check position=below target=done<br>s3-0056: "shift Process right a bit" gold: action=move target=process direction=right; read: command:move action=move direction=right target=process<br>s3-0082: "move it right" gold: action=move target=check direction=right; read: command:move action=move direction=right target=check |
| held | command:resize | 11 | s3-0082: "make check smaller" gold: action=resize target=check; read: command:resize action=resize target=check<br>s3-0257: "Process smaller" gold: action=resize target=process; read: command:resize action=resize target=process<br>s3-0281: "make Done bigger" gold: action=resize target=done; read: command:resize action=resize target=done |
| held | command:arrange | 9 | s3-0017: "arrange it like an org chart" gold: action=arrange layout=tree; read: command:arrange action=arrange layout=tree<br>s3-0040: "radial layout around Check" gold: action=arrange layout=radial anchor=check; read: command:arrange action=arrange anchor=check layout=radial<br>s3-0136: "put all shapes in a row" gold: action=arrange target=mention(quantifier=all) layout=row; read: command:arrange action=arrange layout=row target=mention(quantifier=all) |
| held | command:disconnect | 8 | s3-0125: "delete all arrows" gold: action=disconnect quantifier=all; read: command:disconnect action=disconnect quantifier=all<br>s3-0148: "remove the arrow between check and done" gold: action=disconnect from=check to=done; read: command:disconnect action=disconnect from=check to=done<br>s3-0171: "remove all links" gold: action=disconnect quantifier=all; read: command:disconnect action=disconnect quantifier=all |
| held | question:help | 8 | s3-0133: "how do you move something to a corner" gold: ask=help topic=move aspect=how; read: question:help ask=help aspect=how topic=move<br>s3-0145: "can I group shapes" gold: ask=help topic=group aspect=can; read: question:help ask=help aspect=can topic=group<br>s3-0158: "what layouts are there" gold: ask=help topic=layout aspect=values; read: question:help ask=help aspect=values topic=layout |
| held | (31 more keys; all in the JSON) | | |

**Structural holds** (8)

| cause | place | n | examples: id, text, gold, read |
|---|---|---:|---|

| cause | key | n | examples |
|---|---|---:|---|
| blocked | text-state | 7 | s3-0025: "connect Hub to Start Process Check Done" gold: action=connect from=$new to=start,process,check,done; read: command:connect action=connect from=$new to=start<br>s3-0027: "add 5 milestones as a timeline under the flow" gold: action=create template=timeline count=5 position=below anchor=mention(quantifier=all); read: command:create action=create count=5<br>s3-0075: "can I write text without a shape" gold: ask=help topic=text aspect=can; read: question:help ask=help aspect=can topic=label |
| blocked | unresolved-reference | 1 | s3-0303: "put check between start and done" gold: -; read: command:create action=create |

## Notes

- oracle: /home/skutner/.cache/diagram-vss-modernbert/next-2026-11-08/roundtrip/B: it holds the ids of fresh2 and short3 only, so for every other set cause 1 is not measured (the oracle verdict row of each part says absent); it is the round trip of the layout whose training data it was made for, a proxy when the arm read has another layout
- views: every view of the campaign is read against one teacher's labels; the oracle (cause 1) is not measured for these views except through the keys the layout does not read
