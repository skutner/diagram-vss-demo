# Root causes (VSSBERT_SHORT_COMMANDS_PLAN.md section 8)

Sets read: bench_s, r2bs, short3s, t1bs, t1raw, t1s. Counts checked against the `summary` of each rows file (they add up). Level `cost`. A row is a gold request or an extra of a reader.

## 1. Held but right

### V, VSS-BERT: all held-but-right requests: 117

| situation | n | share | examples |
|---|---|---|---|
| agree | 113 | 96.6% | st1b-00001 “add a black circle” (0.929); st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933) |
| disagree | 4 | 3.4% | st1b-00187 “move Auth left” (0.565); st1b-00211 “move Ticket9 left” (0.727); st1b-01161 “move R1 right” (0.782) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| agree | 113 | 96.6% | st1b-00001 “add a black circle” (0.929); st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933) |
| disagree | 4 | 3.4% | st1b-00187 “move Auth left” (0.565); st1b-00211 “move Ticket9 left” (0.727); st1b-01161 “move R1 right” (0.782) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 86 | 73.5% | st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933); st1b-00057 “move Budget left” (0.921) |
| value | 20 | 17.1% | st1b-00001 “add a black circle” (0.929); st1b-00054 “add a teal circle” (0.926); st1b-00064 “add a pink hexagon” (0.936) |
| none (own confidence above its threshold) | 6 | 5.1% | st1b-00211 “move Ticket9 left” (0.727); st1b-00481 “add a white hexagon” (0.947); st1b-00551 “add a brown hexagon” (0.945) |
| fill | 3 | 2.6% | st1b-00541 “add a green circle” (0.949); st1b-01238 “add a pink circle” (0.911); st1b-02152 “move Auth down” (0.888) |
| act | 1 | 0.9% | st1b-01958 “add a teal hexagon” (0.937) |
| tags | 1 | 0.9% | st1b-00472 “connect Auth to Ingress” (0.928) |

| first top_pulls feature | n | share | examples |
|---|---|---|---|
| n_words | 93 | 79.5% | st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933); st1b-00054 “add a teal circle” (0.926) |
| none_p_min | 10 | 8.5% | st1b-00001 “add a black circle” (0.929); st1b-00064 “add a pink hexagon” (0.936); st1b-00303 “add a brown circle” (0.943) |
| agree | 4 | 3.4% | st1b-00187 “move Auth left” (0.565); st1b-00211 “move Ticket9 left” (0.727); st1b-01161 “move R1 right” (0.782) |
| cut_start | 4 | 3.4% | st1b-00477 “move Plankton left” (0.948); st1b-00660 “move Etl left” (0.942); st1b-00731 “move Nas left” (0.939) |
| n_roles | 4 | 3.4% | st1b-00463 “remove Scope” (0.946); st1b-00597 “remove Wan” (0.948); st1b-00917 “remove Redis” (0.934) |
| tag_all_min | 2 | 1.7% | st1b-00472 “connect Auth to Ingress” (0.928); st1b-02152 “move Auth down” (0.888) |

| where the cause sits | n | share | examples |
|---|---|---|---|
| calibration (both readers agree; the largest pull is a size, cut or word signal) | 101 | 86.3% | st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933); st1b-00054 “add a teal circle” (0.926) |
| calibration (both readers agree; the largest pull is another signal) | 12 | 10.3% | st1b-00001 “add a black circle” (0.929); st1b-00064 “add a pink hexagon” (0.936); st1b-00303 “add a brown circle” (0.943) |
| the model or the data (the readers disagree on a value: see which key) | 4 | 3.4% | st1b-00187 “move Auth left” (0.565); st1b-00211 “move Ticket9 left” (0.727); st1b-01161 “move R1 right” (0.782) |

### V, VSS: all held-but-right requests: 4

| situation | n | share | examples |
|---|---|---|---|
| rules | 4 | 100.0% | st1b-00187 “move Auth left” (0.631); st1b-00211 “move Ticket9 left” (0.631); st1b-01161 “move R1 right” (0.627) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 4 | 100.0% | st1b-00187 “move Auth left” (0.631); st1b-00211 “move Ticket9 left” (0.631); st1b-01161 “move R1 right” (0.627) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| none (own confidence above its threshold) | 4 | 100.0% | st1b-00187 “move Auth left” (0.631); st1b-00211 “move Ticket9 left” (0.631); st1b-01161 “move R1 right” (0.627) |

### V, SOP-BERT: all held-but-right requests: 215

| situation | n | share | examples |
|---|---|---|---|
| vss+rules | 211 | 98.1% | st1b-00006 “move Castle right” (0.924); st1b-00008 “delete Testing” (0.954); st1b-00015 “move Nucleus down” (0.933) |
| none | 4 | 1.9% | st1b-00187 “move Auth left” (0.483); st1b-00211 “move Ticket9 left” (0.542); st1b-01161 “move R1 right” (0.583) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 215 | 100.0% | st1b-00006 “move Castle right” (0.924); st1b-00008 “delete Testing” (0.954); st1b-00015 “move Nucleus down” (0.933) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 213 | 99.1% | st1b-00006 “move Castle right” (0.924); st1b-00008 “delete Testing” (0.954); st1b-00015 “move Nucleus down” (0.933) |
| value | 2 | 0.9% | st1b-01238 “add a pink circle” (0.943); st1b-01466 “add a lime circle” (0.949) |

### V, VSS-BERT: the subset the Rules read right: 117

| situation | n | share | examples |
|---|---|---|---|
| agree | 113 | 96.6% | st1b-00001 “add a black circle” (0.929); st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933) |
| disagree | 4 | 3.4% | st1b-00187 “move Auth left” (0.565); st1b-00211 “move Ticket9 left” (0.727); st1b-01161 “move R1 right” (0.782) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| agree | 113 | 96.6% | st1b-00001 “add a black circle” (0.929); st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933) |
| disagree | 4 | 3.4% | st1b-00187 “move Auth left” (0.565); st1b-00211 “move Ticket9 left” (0.727); st1b-01161 “move R1 right” (0.782) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 86 | 73.5% | st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933); st1b-00057 “move Budget left” (0.921) |
| value | 20 | 17.1% | st1b-00001 “add a black circle” (0.929); st1b-00054 “add a teal circle” (0.926); st1b-00064 “add a pink hexagon” (0.936) |
| none (own confidence above its threshold) | 6 | 5.1% | st1b-00211 “move Ticket9 left” (0.727); st1b-00481 “add a white hexagon” (0.947); st1b-00551 “add a brown hexagon” (0.945) |
| fill | 3 | 2.6% | st1b-00541 “add a green circle” (0.949); st1b-01238 “add a pink circle” (0.911); st1b-02152 “move Auth down” (0.888) |
| act | 1 | 0.9% | st1b-01958 “add a teal hexagon” (0.937) |
| tags | 1 | 0.9% | st1b-00472 “connect Auth to Ingress” (0.928) |

| first top_pulls feature | n | share | examples |
|---|---|---|---|
| n_words | 93 | 79.5% | st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933); st1b-00054 “add a teal circle” (0.926) |
| none_p_min | 10 | 8.5% | st1b-00001 “add a black circle” (0.929); st1b-00064 “add a pink hexagon” (0.936); st1b-00303 “add a brown circle” (0.943) |
| agree | 4 | 3.4% | st1b-00187 “move Auth left” (0.565); st1b-00211 “move Ticket9 left” (0.727); st1b-01161 “move R1 right” (0.782) |
| cut_start | 4 | 3.4% | st1b-00477 “move Plankton left” (0.948); st1b-00660 “move Etl left” (0.942); st1b-00731 “move Nas left” (0.939) |
| n_roles | 4 | 3.4% | st1b-00463 “remove Scope” (0.946); st1b-00597 “remove Wan” (0.948); st1b-00917 “remove Redis” (0.934) |
| tag_all_min | 2 | 1.7% | st1b-00472 “connect Auth to Ingress” (0.928); st1b-02152 “move Auth down” (0.888) |

| where the cause sits | n | share | examples |
|---|---|---|---|
| calibration (both readers agree; the largest pull is a size, cut or word signal) | 101 | 86.3% | st1b-00006 “move Castle right” (0.944); st1b-00035 “move Keeper left” (0.933); st1b-00054 “add a teal circle” (0.926) |
| calibration (both readers agree; the largest pull is another signal) | 12 | 10.3% | st1b-00001 “add a black circle” (0.929); st1b-00064 “add a pink hexagon” (0.936); st1b-00303 “add a brown circle” (0.943) |
| the model or the data (the readers disagree on a value: see which key) | 4 | 3.4% | st1b-00187 “move Auth left” (0.565); st1b-00211 “move Ticket9 left” (0.727); st1b-01161 “move R1 right” (0.782) |

### V, VSS: the subset the Rules read right: 4

| situation | n | share | examples |
|---|---|---|---|
| rules | 4 | 100.0% | st1b-00187 “move Auth left” (0.631); st1b-00211 “move Ticket9 left” (0.631); st1b-01161 “move R1 right” (0.627) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 4 | 100.0% | st1b-00187 “move Auth left” (0.631); st1b-00211 “move Ticket9 left” (0.631); st1b-01161 “move R1 right” (0.627) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| none (own confidence above its threshold) | 4 | 100.0% | st1b-00187 “move Auth left” (0.631); st1b-00211 “move Ticket9 left” (0.631); st1b-01161 “move R1 right” (0.627) |

### V, SOP-BERT: the subset the Rules read right: 215

| situation | n | share | examples |
|---|---|---|---|
| vss+rules | 211 | 98.1% | st1b-00006 “move Castle right” (0.924); st1b-00008 “delete Testing” (0.954); st1b-00015 “move Nucleus down” (0.933) |
| none | 4 | 1.9% | st1b-00187 “move Auth left” (0.483); st1b-00211 “move Ticket9 left” (0.542); st1b-01161 “move R1 right” (0.583) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 215 | 100.0% | st1b-00006 “move Castle right” (0.924); st1b-00008 “delete Testing” (0.954); st1b-00015 “move Nucleus down” (0.933) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 213 | 99.1% | st1b-00006 “move Castle right” (0.924); st1b-00008 “delete Testing” (0.954); st1b-00015 “move Nucleus down” (0.933) |
| value | 2 | 0.9% | st1b-01238 “add a pink circle” (0.943); st1b-01466 “add a lime circle” (0.949) |

### t1s, VSS-BERT: all held-but-right requests: 504

| situation | n | share | examples |
|---|---|---|---|
| agree | 199 | 39.5% | st1-00006 “move Castle right” (0.936); st1-00010 “redo that quickly” (0.933); st1-00015 “move Nucleus down thx” (0.916) |
| sop_only | 194 | 38.5% | st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00020 “make the arrow from Approve to Process red” (0.666); st1-00030 “label the arrow from Sprint1 to Task7 "writes"” (0.830) |
| disagree | 110 | 21.8% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00019 “add a cyan triangle thx” (0.749); st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.787) |
| vss_only | 1 | 0.2% | st1-00611 “add a caption "Flow v2" for me” (0.002) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| agree | 199 | 39.5% | st1-00006 “move Castle right” (0.936); st1-00010 “redo that quickly” (0.933); st1-00015 “move Nucleus down thx” (0.916) |
| action | 155 | 30.8% | st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00020 “make the arrow from Approve to Process red” (0.666); st1-00030 “label the arrow from Sprint1 to Task7 "writes"” (0.830) |
| disagree | 110 | 21.8% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00019 “add a cyan triangle thx” (0.749); st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.787) |
| alone | 40 | 7.9% | st1-00126 “make all arrows green” (0.439); st1-00140 “count the connections” (0.656); st1-00197 “make all the lines teal” (0.431) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 159 | 31.5% | st1-00006 “move Castle right” (0.936); st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00015 “move Nucleus down thx” (0.916) |
| value | 114 | 22.6% | st1-00020 “make the arrow from Approve to Process red” (0.666); st1-00054 “add a teal circle” (0.918); st1-00064 “add a pink hexagon” (0.943) |
| none (own confidence above its threshold) | 91 | 18.1% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00010 “redo that quickly” (0.933); st1-00017 “redo for me” (0.915) |
| tags | 82 | 16.3% | st1-00088 “create a list with Bedroom, Bathroom and Pantry” (0.793); st1-00182 “make the arrow from Loader to Ingest blue” (0.471); st1-00186 “make a cycle with Prologue, Twist, Scene3, Epilogue and Villain” (0.711) |
| fill | 44 | 8.7% | st1-00058 “make the arrow from M to Y orange for” (0.937); st1-00301 “make the links dotted” (0.271); st1-00303 “add a brown circle if you” (0.875) |
| size | 10 | 2.0% | st1-00207 “snap all shapes to the grid” (0.947); st1-00864 “untangle the arrows” (0.906); st1-01031 “count the connections if” (0.930) |
| act | 2 | 0.4% | st1-02003 “add a red diamond” (0.943); st1-02049 “add a teal hexagon” (0.927) |
| cut | 1 | 0.2% | st1-00391 “add a lime triangle if you” (0.841) |
| world | 1 | 0.2% | st1-00611 “add a caption "Flow v2" for me” (0.002) |

| first top_pulls feature | n | share | examples |
|---|---|---|---|
| agree | 304 | 60.3% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00019 “add a cyan triangle thx” (0.749) |
| n_roles | 72 | 14.3% | st1-00010 “redo that quickly” (0.933); st1-00017 “redo for me” (0.915); st1-00097 “remove Vision for me” (0.948) |
| tag_all_min | 40 | 7.9% | st1-00015 “move Nucleus down thx” (0.916); st1-00058 “make the arrow from M to Y orange for” (0.937); st1-00093 “move Battery right thx” (0.840) |
| n_words | 38 | 7.5% | st1-00006 “move Castle right” (0.936); st1-00035 “move Keeper left” (0.932); st1-00054 “add a teal circle” (0.918) |
| none_p_min | 20 | 4.0% | st1-00045 “make Sales navy for me” (0.937); st1-00064 “add a pink hexagon” (0.943); st1-00387 “move Lead left quickly” (0.947) |
| cut_start | 18 | 3.6% | st1-00175 “remove Village for me” (0.937); st1-00295 “move Coil right” (0.908); st1-00304 “make Idle teal” (0.928) |
| fill_p_min | 6 | 1.2% | st1-00374 “sort the shapes by name quickly” (0.888); st1-00704 “sort everything by color” (0.911); st1-01489 “sort everything by color” (0.876) |
| tag_margin_min | 2 | 0.4% | st1-00405 “move Courier up for me” (0.946); st1-02101 “add a white star quickly” (0.942) |
| cut_end | 1 | 0.2% | st1-02003 “add a red diamond” (0.943) |
| cut_inner_min | 1 | 0.2% | st1-00897 “add an orange hexagon if you can” (0.948) |
| none (no pull above 0.05, or a VSS request) | 1 | 0.2% | st1-00611 “add a caption "Flow v2" for me” (0.002) |
| tag_stray | 1 | 0.2% | st1-00871 “add a green rectangle thx” (0.884) |

| where the cause sits | n | share | examples |
|---|---|---|---|
| the cut (only one reader found the request) | 193 | 38.3% | st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00020 “make the arrow from Approve to Process red” (0.666); st1-00030 “label the arrow from Sprint1 to Task7 "writes"” (0.830) |
| calibration (both readers agree; the largest pull is a size, cut or word signal) | 113 | 22.4% | st1-00006 “move Castle right” (0.936); st1-00010 “redo that quickly” (0.933); st1-00017 “redo for me” (0.915) |
| the model or the data (the readers disagree on a value: see which key) | 107 | 21.2% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00019 “add a cyan triangle thx” (0.749); st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.787) |
| calibration (both readers agree; the largest pull is another signal) | 65 | 12.9% | st1-00015 “move Nucleus down thx” (0.916); st1-00045 “make Sales navy for me” (0.937); st1-00058 “make the arrow from M to Y orange for” (0.937) |
| our code (the spell checker changed the text) | 26 | 5.2% | st1-00035 “move Keeper left” (0.932); st1-00175 “remove Village for me” (0.937); st1-00265 “add an orange triangle quickly” (0.940) |

### t1s, VSS: all held-but-right requests: 451

| situation | n | share | examples |
|---|---|---|---|
| sop+rules | 232 | 51.4% | st1-00003 “connect Fuse to Coil” (0.904); st1-00010 “redo that quickly” (0.898); st1-00017 “redo for me” (0.889) |
| rules | 153 | 33.9% | st1-00019 “add a cyan triangle thx” (0.494); st1-00028 “remove the label of the arrow from Depot to Supplier” (0.616); st1-00038 “remove the label from the arrow from Eggs to Icing quickly” (0.545) |
| none | 66 | 14.6% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.304); st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.290); st1-00088 “create a list with Bedroom, Bathroom and Pantry” (0.281) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 451 | 100.0% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.304); st1-00003 “connect Fuse to Coil” (0.904); st1-00010 “redo that quickly” (0.898) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| words | 170 | 37.7% | st1-00010 “redo that quickly” (0.898); st1-00017 “redo for me” (0.889); st1-00019 “add a cyan triangle thx” (0.494) |
| cut | 122 | 27.1% | st1-00003 “connect Fuse to Coil” (0.904); st1-00024 “undo” (0.892); st1-00039 “delete Pod1” (0.898) |
| world | 71 | 15.7% | st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.290); st1-00095 “add a brown rectangle” (0.907); st1-00102 “add a yellow ellipse” (0.905) |
| unplaced | 62 | 13.7% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.304); st1-00038 “remove the label from the arrow from Eggs to Icing quickly” (0.545); st1-00098 “draw a pyramid of Closed, Open2, Armed and Running” (0.313) |
| reading | 18 | 4.0% | st1-00203 “remove the label from the arrow from Villain to Scene1” (0.596); st1-00283 “put an ellipse at 200,220” (0.898); st1-00557 “remove the label from the arrow from Motor to Vcc” (0.583) |
| context | 6 | 1.3% | st1-00510 “remove the label from the arrow from Neptune to Jupiter” (0.530); st1-00724 “remove the label from the arrow from Store to Warehouse” (0.529); st1-01088 “remove the label from the arrow from Check to Verify” (0.529) |
| none (own confidence above its threshold) | 2 | 0.4% | st1-00187 “move Auth left” (0.608); st1-00211 “move Ticket9 left” (0.590) |

### t1s, SOP-BERT: all held-but-right requests: 535

| situation | n | share | examples |
|---|---|---|---|
| rules | 277 | 51.8% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.926); st1-00013 “label the line from Queue to Auth "fail"” (0.853); st1-00020 “make the arrow from Approve to Process red” (0.827) |
| vss+rules | 236 | 44.1% | st1-00006 “move Castle right” (0.923); st1-00008 “delete Testing” (0.954); st1-00015 “move Nucleus down thx” (0.907) |
| none | 22 | 4.1% | st1-00019 “add a cyan triangle thx” (0.753); st1-00187 “move Auth left” (0.582); st1-00190 “add a white ellipse thx” (0.784) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 535 | 100.0% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.926); st1-00006 “move Castle right” (0.923); st1-00008 “delete Testing” (0.954) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 400 | 74.8% | st1-00006 “move Castle right” (0.923); st1-00008 “delete Testing” (0.954); st1-00013 “label the line from Queue to Auth "fail"” (0.853) |
| value | 71 | 13.3% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.926); st1-00085 “make the arrow from Todo to Task7 solid” (0.838); st1-00098 “draw a pyramid of Closed, Open2, Armed and Running” (0.889) |
| cut | 24 | 4.5% | st1-00019 “add a cyan triangle thx” (0.753); st1-00303 “add a brown circle if you” (0.899); st1-00391 “add a lime triangle if you” (0.890) |
| act | 22 | 4.1% | st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.941); st1-00088 “create a list with Bedroom, Bathroom and Pantry” (0.934); st1-00186 “make a cycle with Prologue, Twist, Scene3, Epilogue and Villain” (0.921) |
| fill | 10 | 1.9% | st1-00058 “make the arrow from M to Y orange for” (0.951); st1-00301 “make the links dotted” (0.450); st1-00449 “make all arrows teal” (0.558) |
| tags | 7 | 1.3% | st1-00325 “add a blue star for me” (0.942); st1-00871 “add a green rectangle thx” (0.950); st1-01063 “add a gold hexagon for me” (0.938) |
| size | 1 | 0.2% | st1-02156 “fit the diagram to the screen” (0.953) |

### t1s, VSS-BERT: the subset the Rules read right: 504

| situation | n | share | examples |
|---|---|---|---|
| agree | 199 | 39.5% | st1-00006 “move Castle right” (0.936); st1-00010 “redo that quickly” (0.933); st1-00015 “move Nucleus down thx” (0.916) |
| sop_only | 194 | 38.5% | st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00020 “make the arrow from Approve to Process red” (0.666); st1-00030 “label the arrow from Sprint1 to Task7 "writes"” (0.830) |
| disagree | 110 | 21.8% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00019 “add a cyan triangle thx” (0.749); st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.787) |
| vss_only | 1 | 0.2% | st1-00611 “add a caption "Flow v2" for me” (0.002) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| agree | 199 | 39.5% | st1-00006 “move Castle right” (0.936); st1-00010 “redo that quickly” (0.933); st1-00015 “move Nucleus down thx” (0.916) |
| action | 155 | 30.8% | st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00020 “make the arrow from Approve to Process red” (0.666); st1-00030 “label the arrow from Sprint1 to Task7 "writes"” (0.830) |
| disagree | 110 | 21.8% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00019 “add a cyan triangle thx” (0.749); st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.787) |
| alone | 40 | 7.9% | st1-00126 “make all arrows green” (0.439); st1-00140 “count the connections” (0.656); st1-00197 “make all the lines teal” (0.431) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 159 | 31.5% | st1-00006 “move Castle right” (0.936); st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00015 “move Nucleus down thx” (0.916) |
| value | 114 | 22.6% | st1-00020 “make the arrow from Approve to Process red” (0.666); st1-00054 “add a teal circle” (0.918); st1-00064 “add a pink hexagon” (0.943) |
| none (own confidence above its threshold) | 91 | 18.1% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00010 “redo that quickly” (0.933); st1-00017 “redo for me” (0.915) |
| tags | 82 | 16.3% | st1-00088 “create a list with Bedroom, Bathroom and Pantry” (0.793); st1-00182 “make the arrow from Loader to Ingest blue” (0.471); st1-00186 “make a cycle with Prologue, Twist, Scene3, Epilogue and Villain” (0.711) |
| fill | 44 | 8.7% | st1-00058 “make the arrow from M to Y orange for” (0.937); st1-00301 “make the links dotted” (0.271); st1-00303 “add a brown circle if you” (0.875) |
| size | 10 | 2.0% | st1-00207 “snap all shapes to the grid” (0.947); st1-00864 “untangle the arrows” (0.906); st1-01031 “count the connections if” (0.930) |
| act | 2 | 0.4% | st1-02003 “add a red diamond” (0.943); st1-02049 “add a teal hexagon” (0.927) |
| cut | 1 | 0.2% | st1-00391 “add a lime triangle if you” (0.841) |
| world | 1 | 0.2% | st1-00611 “add a caption "Flow v2" for me” (0.002) |

| first top_pulls feature | n | share | examples |
|---|---|---|---|
| agree | 304 | 60.3% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00019 “add a cyan triangle thx” (0.749) |
| n_roles | 72 | 14.3% | st1-00010 “redo that quickly” (0.933); st1-00017 “redo for me” (0.915); st1-00097 “remove Vision for me” (0.948) |
| tag_all_min | 40 | 7.9% | st1-00015 “move Nucleus down thx” (0.916); st1-00058 “make the arrow from M to Y orange for” (0.937); st1-00093 “move Battery right thx” (0.840) |
| n_words | 38 | 7.5% | st1-00006 “move Castle right” (0.936); st1-00035 “move Keeper left” (0.932); st1-00054 “add a teal circle” (0.918) |
| none_p_min | 20 | 4.0% | st1-00045 “make Sales navy for me” (0.937); st1-00064 “add a pink hexagon” (0.943); st1-00387 “move Lead left quickly” (0.947) |
| cut_start | 18 | 3.6% | st1-00175 “remove Village for me” (0.937); st1-00295 “move Coil right” (0.908); st1-00304 “make Idle teal” (0.928) |
| fill_p_min | 6 | 1.2% | st1-00374 “sort the shapes by name quickly” (0.888); st1-00704 “sort everything by color” (0.911); st1-01489 “sort everything by color” (0.876) |
| tag_margin_min | 2 | 0.4% | st1-00405 “move Courier up for me” (0.946); st1-02101 “add a white star quickly” (0.942) |
| cut_end | 1 | 0.2% | st1-02003 “add a red diamond” (0.943) |
| cut_inner_min | 1 | 0.2% | st1-00897 “add an orange hexagon if you can” (0.948) |
| none (no pull above 0.05, or a VSS request) | 1 | 0.2% | st1-00611 “add a caption "Flow v2" for me” (0.002) |
| tag_stray | 1 | 0.2% | st1-00871 “add a green rectangle thx” (0.884) |

| where the cause sits | n | share | examples |
|---|---|---|---|
| the cut (only one reader found the request) | 193 | 38.3% | st1-00013 “label the line from Queue to Auth "fail"” (0.731); st1-00020 “make the arrow from Approve to Process red” (0.666); st1-00030 “label the arrow from Sprint1 to Task7 "writes"” (0.830) |
| calibration (both readers agree; the largest pull is a size, cut or word signal) | 113 | 22.4% | st1-00006 “move Castle right” (0.936); st1-00010 “redo that quickly” (0.933); st1-00017 “redo for me” (0.915) |
| the model or the data (the readers disagree on a value: see which key) | 107 | 21.2% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.780); st1-00019 “add a cyan triangle thx” (0.749); st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.787) |
| calibration (both readers agree; the largest pull is another signal) | 65 | 12.9% | st1-00015 “move Nucleus down thx” (0.916); st1-00045 “make Sales navy for me” (0.937); st1-00058 “make the arrow from M to Y orange for” (0.937) |
| our code (the spell checker changed the text) | 26 | 5.2% | st1-00035 “move Keeper left” (0.932); st1-00175 “remove Village for me” (0.937); st1-00265 “add an orange triangle quickly” (0.940) |

### t1s, VSS: the subset the Rules read right: 451

| situation | n | share | examples |
|---|---|---|---|
| sop+rules | 232 | 51.4% | st1-00003 “connect Fuse to Coil” (0.904); st1-00010 “redo that quickly” (0.898); st1-00017 “redo for me” (0.889) |
| rules | 153 | 33.9% | st1-00019 “add a cyan triangle thx” (0.494); st1-00028 “remove the label of the arrow from Depot to Supplier” (0.616); st1-00038 “remove the label from the arrow from Eggs to Icing quickly” (0.545) |
| none | 66 | 14.6% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.304); st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.290); st1-00088 “create a list with Bedroom, Bathroom and Pantry” (0.281) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 451 | 100.0% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.304); st1-00003 “connect Fuse to Coil” (0.904); st1-00010 “redo that quickly” (0.898) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| words | 170 | 37.7% | st1-00010 “redo that quickly” (0.898); st1-00017 “redo for me” (0.889); st1-00019 “add a cyan triangle thx” (0.494) |
| cut | 122 | 27.1% | st1-00003 “connect Fuse to Coil” (0.904); st1-00024 “undo” (0.892); st1-00039 “delete Pod1” (0.898) |
| world | 71 | 15.7% | st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.290); st1-00095 “add a brown rectangle” (0.907); st1-00102 “add a yellow ellipse” (0.905) |
| unplaced | 62 | 13.7% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.304); st1-00038 “remove the label from the arrow from Eggs to Icing quickly” (0.545); st1-00098 “draw a pyramid of Closed, Open2, Armed and Running” (0.313) |
| reading | 18 | 4.0% | st1-00203 “remove the label from the arrow from Villain to Scene1” (0.596); st1-00283 “put an ellipse at 200,220” (0.898); st1-00557 “remove the label from the arrow from Motor to Vcc” (0.583) |
| context | 6 | 1.3% | st1-00510 “remove the label from the arrow from Neptune to Jupiter” (0.530); st1-00724 “remove the label from the arrow from Store to Warehouse” (0.529); st1-01088 “remove the label from the arrow from Check to Verify” (0.529) |
| none (own confidence above its threshold) | 2 | 0.4% | st1-00187 “move Auth left” (0.608); st1-00211 “move Ticket9 left” (0.590) |

### t1s, SOP-BERT: the subset the Rules read right: 535

| situation | n | share | examples |
|---|---|---|---|
| rules | 277 | 51.8% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.926); st1-00013 “label the line from Queue to Auth "fail"” (0.853); st1-00020 “make the arrow from Approve to Process red” (0.827) |
| vss+rules | 236 | 44.1% | st1-00006 “move Castle right” (0.923); st1-00008 “delete Testing” (0.954); st1-00015 “move Nucleus down thx” (0.907) |
| none | 22 | 4.1% | st1-00019 “add a cyan triangle thx” (0.753); st1-00187 “move Auth left” (0.582); st1-00190 “add a white ellipse thx” (0.784) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 535 | 100.0% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.926); st1-00006 “move Castle right” (0.923); st1-00008 “delete Testing” (0.954) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 400 | 74.8% | st1-00006 “move Castle right” (0.923); st1-00008 “delete Testing” (0.954); st1-00013 “label the line from Queue to Auth "fail"” (0.853) |
| value | 71 | 13.3% | st1-00000 “make a funnel of Clean, Source, Enrich, Archive and Loader” (0.926); st1-00085 “make the arrow from Todo to Task7 solid” (0.838); st1-00098 “draw a pyramid of Closed, Open2, Armed and Running” (0.889) |
| cut | 24 | 4.5% | st1-00019 “add a cyan triangle thx” (0.753); st1-00303 “add a brown circle if you” (0.899); st1-00391 “add a lime triangle if you” (0.890) |
| act | 22 | 4.1% | st1-00042 “draw a cycle with Validate, Deploy, Archive and Sink” (0.941); st1-00088 “create a list with Bedroom, Bathroom and Pantry” (0.934); st1-00186 “make a cycle with Prologue, Twist, Scene3, Epilogue and Villain” (0.921) |
| fill | 10 | 1.9% | st1-00058 “make the arrow from M to Y orange for” (0.951); st1-00301 “make the links dotted” (0.450); st1-00449 “make all arrows teal” (0.558) |
| tags | 7 | 1.3% | st1-00325 “add a blue star for me” (0.942); st1-00871 “add a green rectangle thx” (0.950); st1-01063 “add a gold hexagon for me” (0.938) |
| size | 1 | 0.2% | st1-02156 “fit the diagram to the screen” (0.953) |

### short3s_test, VSS-BERT: all held-but-right requests: 173

| situation | n | share | examples |
|---|---|---|---|
| sop_only | 65 | 37.6% | s3-0017 “arrange it like an org chart” (0.401); s3-0018 “process steps: Plan, Build, Test, Ship” (0.526); s3-0043 “add label "v2" to done” (0.841) |
| agree | 64 | 37.0% | s3-0003 “copy check” (0.918); s3-0005 “dotted line process to done” (0.924); s3-0009 “list the green ones” (0.908) |
| disagree | 36 | 20.8% | s3-0019 “a staircase of 4 steps going up” (0.396); s3-0020 “put a big heading at the top saying Onboarding v2” (0.744); s3-0032 “distribute horizontally” (0.489) |
| vss_only | 8 | 4.6% | s3-0063 “swot matrix” (0.818); s3-0082 “make check smaller, move it right” (0.005); s3-0266 “rename Done to End and make it a star” (0.001) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| agree | 63 | 36.4% | s3-0003 “copy check” (0.918); s3-0005 “dotted line process to done” (0.924); s3-0009 “list the green ones” (0.908) |
| action | 48 | 27.7% | s3-0018 “process steps: Plan, Build, Test, Ship” (0.526); s3-0043 “add label "v2" to done” (0.841); s3-0049 “everything black” (0.314) |
| disagree | 36 | 20.8% | s3-0019 “a staircase of 4 steps going up” (0.396); s3-0020 “put a big heading at the top saying Onboarding v2” (0.744); s3-0032 “distribute horizontally” (0.489) |
| alone | 25 | 14.5% | s3-0017 “arrange it like an org chart” (0.401); s3-0044 “fix” (0.149); s3-0045 “center it” (0.215) |
| depends | 1 | 0.6% | s3-0088 “connect Done to Plan” (0.968) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 53 | 30.6% | s3-0013 “remove process” (0.942); s3-0017 “arrange it like an org chart” (0.401); s3-0032 “distribute horizontally” (0.489) |
| size | 38 | 22.0% | s3-0003 “copy check” (0.918); s3-0009 “list the green ones” (0.908); s3-0021 “straighten the lines” (0.814) |
| none (own confidence above its threshold) | 31 | 17.9% | s3-0020 “put a big heading at the top saying Onboarding v2” (0.744); s3-0043 “add label "v2" to done” (0.841); s3-0061 “any rules on right now” (0.757) |
| fill | 16 | 9.2% | s3-0016 “move it to the center” (0.865); s3-0031 “send it to the back” (0.861); s3-0049 “everything black” (0.314) |
| tags | 13 | 7.5% | s3-0005 “dotted line process to done” (0.924); s3-0018 “process steps: Plan, Build, Test, Ship” (0.526); s3-0033 “reverse direction on check→done” (0.590) |
| value | 10 | 5.8% | s3-0019 “a staircase of 4 steps going up” (0.396); s3-0050 “orange for all new circles from here on” (0.589); s3-0078 “turn the diamond pink” (0.905) |
| cut | 4 | 2.3% | s3-0160 “Could you add a teal diamond between Process and Check” (0.888); s3-0204 “start big” (0.454); s3-0204 “process medium” (0.908) |
| world | 4 | 2.3% | s3-0063 “swot matrix” (0.818); s3-0376 “group everything as Main” (0.043); s3-0488 “start larger than done or not” (0.000) |
| words | 3 | 1.7% | s3-0082 “make check smaller, move it right” (0.005); s3-0266 “rename Done to End and make it a star” (0.001); s3-0333 “what is in group Intake and where is it” (0.035) |
| act | 1 | 0.6% | s3-0394 “start is blue” (0.945) |

| first top_pulls feature | n | share | examples |
|---|---|---|---|
| agree | 101 | 58.4% | s3-0017 “arrange it like an org chart” (0.401); s3-0018 “process steps: Plan, Build, Test, Ship” (0.526); s3-0019 “a staircase of 4 steps going up” (0.396) |
| n_roles | 26 | 15.0% | s3-0003 “copy check” (0.918); s3-0009 “list the green ones” (0.908); s3-0013 “remove process” (0.942) |
| cut_start | 16 | 9.2% | s3-0005 “dotted line process to done” (0.924); s3-0035 “check under process” (0.942); s3-0057 “red for check” (0.786) |
| none (no pull above 0.05, or a VSS request) | 8 | 4.6% | s3-0063 “swot matrix” (0.818); s3-0082 “make check smaller, move it right” (0.005); s3-0266 “rename Done to End and make it a star” (0.001) |
| n_words | 7 | 4.0% | s3-0078 “turn the diamond pink” (0.905); s3-0156 “check purple” (0.933); s3-0190 “center the whole diagram” (0.944) |
| ctx_fill | 6 | 3.5% | s3-0016 “move it to the center” (0.865); s3-0031 “send it to the back” (0.861); s3-0361 “make it orange” (0.826) |
| tag_all_min | 5 | 2.9% | s3-0084 “group all as Flow” (0.870); s3-0176 “arrange as a hierarchy with Start at the top” (0.901); s3-0283 “more space between the shapes” (0.786) |
| fill_p_min | 3 | 1.7% | s3-0040 “radial layout around Check” (0.881); s3-0371 “label the yellow diamond "decision"” (0.946); s3-0512 “connect all of them in a chain: Done, Check, Process” (0.940) |
| none_p_min | 1 | 0.6% | s3-0270 “make the green circle a rectangle” (0.886) |

| where the cause sits | n | share | examples |
|---|---|---|---|
| the cut (only one reader found the request) | 73 | 42.2% | s3-0017 “arrange it like an org chart” (0.401); s3-0018 “process steps: Plan, Build, Test, Ship” (0.526); s3-0043 “add label "v2" to done” (0.841) |
| calibration (both readers agree; the largest pull is a size, cut or word signal) | 49 | 28.3% | s3-0003 “copy check” (0.918); s3-0005 “dotted line process to done” (0.924); s3-0009 “list the green ones” (0.908) |
| the model or the data (the readers disagree on a value: see which key) | 36 | 20.8% | s3-0019 “a staircase of 4 steps going up” (0.396); s3-0020 “put a big heading at the top saying Onboarding v2” (0.744); s3-0032 “distribute horizontally” (0.489) |
| calibration (both readers agree; the largest pull is another signal) | 15 | 8.7% | s3-0016 “move it to the center” (0.865); s3-0031 “send it to the back” (0.861); s3-0040 “radial layout around Check” (0.881) |

### short3s_test, VSS: all held-but-right requests: 99

| situation | n | share | examples |
|---|---|---|---|
| sop+rules | 36 | 36.4% | s3-0003 “copy check” (0.903); s3-0007 “Make Done and Check orange” (0.904); s3-0013 “remove process” (0.908) |
| sop | 33 | 33.3% | s3-0004 “Done red” (0.869); s3-0037 “add an orange triangle Warn above Done” (0.824); s3-0037 “link Warn to Done dashed” (0.838) |
| none | 15 | 15.2% | s3-0025 “draw circle Hub center” (0.255); s3-0063 “swot matrix” (0.259); s3-0088 “add a cycle Plan, Do, Review” (0.262) |
| rules | 15 | 15.2% | s3-0053 “clear the text in Done” (0.618); s3-0082 “make check smaller, move it right” (0.405); s3-0086 “get rid of the yellow diamond” (0.537) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 99 | 100.0% | s3-0003 “copy check” (0.903); s3-0004 “Done red” (0.869); s3-0007 “Make Done and Check orange” (0.904) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| world | 33 | 33.3% | s3-0023 “Start to Done, arrow” (0.904); s3-0063 “swot matrix” (0.259); s3-0084 “group all as Flow” (0.859) |
| words | 28 | 28.3% | s3-0013 “connect start straight to check” (0.889); s3-0045 “less space between shapes and center it” (0.860); s3-0081 “scale process by 1.5” (0.769) |
| cut | 20 | 20.2% | s3-0003 “copy check” (0.903); s3-0007 “Make Done and Check orange” (0.904); s3-0013 “remove process” (0.908) |
| reading | 11 | 11.1% | s3-0037 “add an orange triangle Warn above Done” (0.824); s3-0053 “clear the text in Done” (0.618); s3-0088 “connect Done to Plan” (0.844) |
| none (own confidence above its threshold) | 6 | 6.1% | s3-0004 “Done red” (0.869); s3-0037 “link Warn to Done dashed” (0.838); s3-0204 “done small” (0.829) |
| unplaced | 1 | 1.0% | s3-0088 “add a cycle Plan, Do, Review” (0.262) |

### short3s_test, SOP-BERT: all held-but-right requests: 160

| situation | n | share | examples |
|---|---|---|---|
| none | 49 | 30.6% | s3-0018 “process steps: Plan, Build, Test, Ship” (0.407); s3-0019 “a staircase of 4 steps going up” (0.406); s3-0020 “put a big heading at the top saying Onboarding v2” (0.633) |
| rules | 45 | 28.1% | s3-0017 “arrange it like an org chart” (0.258); s3-0033 “reverse direction on check→done” (0.865); s3-0043 “add label "v2" to done” (0.887) |
| vss+rules | 37 | 23.1% | s3-0013 “remove process” (0.928); s3-0016 “move it to the center” (0.878); s3-0021 “straighten the lines” (0.794) |
| vss | 29 | 18.1% | s3-0004 “Done red” (0.828); s3-0005 “dotted line process to done” (0.914); s3-0037 “add an orange triangle Warn above Done” (0.924) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 160 | 100.0% | s3-0004 “Done red” (0.828); s3-0005 “dotted line process to done” (0.914); s3-0013 “remove process” (0.928) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 86 | 53.8% | s3-0013 “remove process” (0.928); s3-0017 “arrange it like an org chart” (0.258); s3-0021 “straighten the lines” (0.794) |
| size | 25 | 15.6% | s3-0045 “less space between shapes” (0.944); s3-0045 “center it” (0.592); s3-0095 “take Start out of the group” (0.678) |
| cut | 17 | 10.6% | s3-0004 “Done red” (0.828); s3-0005 “dotted line process to done” (0.914); s3-0018 “process steps: Plan, Build, Test, Ship” (0.407) |
| value | 17 | 10.6% | s3-0019 “a staircase of 4 steps going up” (0.406); s3-0020 “put a big heading at the top saying Onboarding v2” (0.633); s3-0033 “reverse direction on check→done” (0.865) |
| fill | 14 | 8.8% | s3-0016 “move it to the center” (0.878); s3-0031 “send it to the back” (0.943); s3-0052 “is it a circle” (0.391) |
| act | 1 | 0.6% | s3-0519 “make a cycle with 4 steps” (0.886) |

### short3s_test, VSS-BERT: the subset the Rules read right: 104

| situation | n | share | examples |
|---|---|---|---|
| agree | 48 | 46.2% | s3-0003 “copy check” (0.918); s3-0009 “list the green ones” (0.908); s3-0013 “remove process” (0.942) |
| sop_only | 29 | 27.9% | s3-0017 “arrange it like an org chart” (0.401); s3-0043 “add label "v2" to done” (0.841); s3-0061 “any rules on right now” (0.757) |
| disagree | 22 | 21.2% | s3-0019 “a staircase of 4 steps going up” (0.396); s3-0032 “distribute horizontally” (0.489); s3-0033 “reverse direction on check→done” (0.590) |
| vss_only | 5 | 4.8% | s3-0082 “make check smaller, move it right” (0.005); s3-0266 “rename Done to End and make it a star” (0.001); s3-0376 “group everything as Main” (0.043) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| agree | 48 | 46.2% | s3-0003 “copy check” (0.918); s3-0009 “list the green ones” (0.908); s3-0013 “remove process” (0.942) |
| action | 22 | 21.2% | s3-0043 “add label "v2" to done” (0.841); s3-0061 “any rules on right now” (0.757); s3-0082 “make check smaller, move it right” (0.005) |
| disagree | 22 | 21.2% | s3-0019 “a staircase of 4 steps going up” (0.396); s3-0032 “distribute horizontally” (0.489); s3-0033 “reverse direction on check→done” (0.590) |
| alone | 12 | 11.5% | s3-0017 “arrange it like an org chart” (0.401); s3-0151 “too spread out, tighten it” (0.128); s3-0164 “clean this up” (0.355) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 32 | 30.8% | s3-0013 “remove process” (0.942); s3-0017 “arrange it like an org chart” (0.401); s3-0032 “distribute horizontally” (0.489) |
| size | 22 | 21.2% | s3-0003 “copy check” (0.918); s3-0009 “list the green ones” (0.908); s3-0021 “straighten the lines” (0.814) |
| none (own confidence above its threshold) | 20 | 19.2% | s3-0043 “add label "v2" to done” (0.841); s3-0061 “any rules on right now” (0.757); s3-0133 “how do you move something to a corner” (0.853) |
| fill | 12 | 11.5% | s3-0016 “move it to the center” (0.865); s3-0031 “send it to the back” (0.861); s3-0283 “more space between the shapes” (0.786) |
| value | 6 | 5.8% | s3-0019 “a staircase of 4 steps going up” (0.396); s3-0078 “turn the diamond pink” (0.905); s3-0116 “Can you connect Done back to Start with a blue dashed arrow” (0.640) |
| tags | 5 | 4.8% | s3-0033 “reverse direction on check→done” (0.590); s3-0351 “add 4 circles in a ring” (0.942); s3-0423 “line up start process and done horizontally” (0.606) |
| cut | 2 | 1.9% | s3-0160 “Could you add a teal diamond between Process and Check” (0.888); s3-0426 “make Process grey” (0.933) |
| words | 2 | 1.9% | s3-0082 “make check smaller, move it right” (0.005); s3-0266 “rename Done to End and make it a star” (0.001) |
| world | 2 | 1.9% | s3-0376 “group everything as Main” (0.043); s3-0516 “start should be on top” (0.000) |
| act | 1 | 1.0% | s3-0394 “start is blue” (0.945) |

| first top_pulls feature | n | share | examples |
|---|---|---|---|
| agree | 51 | 49.0% | s3-0017 “arrange it like an org chart” (0.401); s3-0019 “a staircase of 4 steps going up” (0.396); s3-0032 “distribute horizontally” (0.489) |
| n_roles | 21 | 20.2% | s3-0003 “copy check” (0.918); s3-0009 “list the green ones” (0.908); s3-0013 “remove process” (0.942) |
| cut_start | 8 | 7.7% | s3-0035 “check under process” (0.942); s3-0085 “any stars here” (0.853); s3-0160 “Could you add a teal diamond between Process and Check” (0.888) |
| ctx_fill | 6 | 5.8% | s3-0016 “move it to the center” (0.865); s3-0031 “send it to the back” (0.861); s3-0361 “make it orange” (0.826) |
| n_words | 5 | 4.8% | s3-0078 “turn the diamond pink” (0.905); s3-0156 “check purple” (0.933); s3-0190 “center the whole diagram” (0.944) |
| none (no pull above 0.05, or a VSS request) | 5 | 4.8% | s3-0082 “make check smaller, move it right” (0.005); s3-0266 “rename Done to End and make it a star” (0.001); s3-0376 “group everything as Main” (0.043) |
| tag_all_min | 4 | 3.8% | s3-0084 “group all as Flow” (0.870); s3-0176 “arrange as a hierarchy with Start at the top” (0.901); s3-0283 “more space between the shapes” (0.786) |
| fill_p_min | 3 | 2.9% | s3-0040 “radial layout around Check” (0.881); s3-0371 “label the yellow diamond "decision"” (0.946); s3-0512 “connect all of them in a chain: Done, Check, Process” (0.940) |
| none_p_min | 1 | 1.0% | s3-0270 “make the green circle a rectangle” (0.886) |

| where the cause sits | n | share | examples |
|---|---|---|---|
| calibration (both readers agree; the largest pull is a size, cut or word signal) | 34 | 32.7% | s3-0003 “copy check” (0.918); s3-0009 “list the green ones” (0.908); s3-0013 “remove process” (0.942) |
| the cut (only one reader found the request) | 34 | 32.7% | s3-0017 “arrange it like an org chart” (0.401); s3-0043 “add label "v2" to done” (0.841); s3-0061 “any rules on right now” (0.757) |
| the model or the data (the readers disagree on a value: see which key) | 22 | 21.2% | s3-0019 “a staircase of 4 steps going up” (0.396); s3-0032 “distribute horizontally” (0.489); s3-0033 “reverse direction on check→done” (0.590) |
| calibration (both readers agree; the largest pull is another signal) | 14 | 13.5% | s3-0016 “move it to the center” (0.865); s3-0031 “send it to the back” (0.861); s3-0040 “radial layout around Check” (0.881) |

### short3s_test, VSS: the subset the Rules read right: 57

| situation | n | share | examples |
|---|---|---|---|
| sop+rules | 36 | 63.2% | s3-0003 “copy check” (0.903); s3-0007 “Make Done and Check orange” (0.904); s3-0013 “remove process” (0.908) |
| rules | 13 | 22.8% | s3-0053 “clear the text in Done” (0.618); s3-0082 “make check smaller, move it right” (0.405); s3-0086 “get rid of the yellow diamond” (0.537) |
| sop | 5 | 8.8% | s3-0081 “scale process by 1.5” (0.769); s3-0197 “link Start to Done” (0.809); s3-0305 “make Check a hexagon named Gate” (0.780) |
| none | 3 | 5.3% | s3-0328 “make the title bigger” (0.336); s3-0439 “rename done End, end red” (0.317); s3-0453 “move start to 50,50 and done to 750,450” (0.296) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 57 | 100.0% | s3-0003 “copy check” (0.903); s3-0007 “Make Done and Check orange” (0.904); s3-0013 “remove process” (0.908) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| words | 23 | 40.4% | s3-0013 “connect start straight to check” (0.889); s3-0045 “less space between shapes and center it” (0.860); s3-0081 “scale process by 1.5” (0.769) |
| world | 14 | 24.6% | s3-0023 “Start to Done, arrow” (0.904); s3-0084 “group all as Flow” (0.859); s3-0086 “get rid of the yellow diamond” (0.537) |
| cut | 11 | 19.3% | s3-0003 “copy check” (0.903); s3-0007 “Make Done and Check orange” (0.904); s3-0013 “remove process” (0.908) |
| reading | 8 | 14.0% | s3-0053 “clear the text in Done” (0.618); s3-0197 “link Start to Done” (0.809); s3-0272 “convert all rectangles to ellipses” (0.558) |
| none (own confidence above its threshold) | 1 | 1.8% | s3-0328 “make the title bigger” (0.336) |

### short3s_test, SOP-BERT: the subset the Rules read right: 85

| situation | n | share | examples |
|---|---|---|---|
| rules | 39 | 45.9% | s3-0017 “arrange it like an org chart” (0.258); s3-0033 “reverse direction on check→done” (0.865); s3-0043 “add label "v2" to done” (0.887) |
| vss+rules | 37 | 43.5% | s3-0013 “remove process” (0.928); s3-0016 “move it to the center” (0.878); s3-0021 “straighten the lines” (0.794) |
| none | 7 | 8.2% | s3-0019 “a staircase of 4 steps going up” (0.406); s3-0082 “make check smaller, move it right” (0.206); s3-0264 “radial around start, start gold” (0.264) |
| vss | 2 | 2.4% | s3-0305 “make Check a hexagon named Gate” (0.939); s3-0345 “move check a little down” (0.850) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 85 | 100.0% | s3-0013 “remove process” (0.928); s3-0016 “move it to the center” (0.878); s3-0017 “arrange it like an org chart” (0.258) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 54 | 63.5% | s3-0013 “remove process” (0.928); s3-0017 “arrange it like an org chart” (0.258); s3-0021 “straighten the lines” (0.794) |
| fill | 11 | 12.9% | s3-0016 “move it to the center” (0.878); s3-0031 “send it to the back” (0.943); s3-0163 “Draw 6 small stars in a circle” (0.829) |
| size | 9 | 10.6% | s3-0045 “less space between shapes” (0.944); s3-0172 “add a circle” (0.913); s3-0251 “align all” (0.927) |
| cut | 5 | 5.9% | s3-0151 “too spread out, tighten it” (0.483); s3-0393 “make Process twice as big” (0.946); s3-0423 “line up start process and done horizontally” (0.872) |
| value | 5 | 5.9% | s3-0019 “a staircase of 4 steps going up” (0.406); s3-0033 “reverse direction on check→done” (0.865); s3-0116 “Can you connect Done back to Start with a blue dashed arrow” (0.910) |
| act | 1 | 1.2% | s3-0519 “make a cycle with 4 steps” (0.886) |

### r2b, VSS-BERT: all held-but-right requests: 83

| situation | n | share | examples |
|---|---|---|---|
| agree | 82 | 98.8% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| disagree | 1 | 1.2% | sr2b-02062 “move Sprint1 left” (0.715) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| agree | 82 | 98.8% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| disagree | 1 | 1.2% | sr2b-02062 “move Sprint1 left” (0.715) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 72 | 86.7% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| value | 5 | 6.0% | sr2b-00137 “add a navy square” (0.935); sr2b-00765 “add a navy circle” (0.935); sr2b-00883 “add a green hexagon” (0.945) |
| fill | 2 | 2.4% | sr2b-01359 “add a teal star” (0.901); sr2b-02337 “add a gold circle” (0.941) |
| none (own confidence above its threshold) | 2 | 2.4% | sr2b-00345 “add a teal square” (0.948); sr2b-02062 “move Sprint1 left” (0.715) |
| tags | 2 | 2.4% | sr2b-01543 “make Auth blue” (0.945); sr2b-01939 “connect Auth to Worker” (0.924) |

| first top_pulls feature | n | share | examples |
|---|---|---|---|
| n_words | 73 | 88.0% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| tag_all_min | 3 | 3.6% | sr2b-00253 “move Auth up” (0.904); sr2b-01543 “make Auth blue” (0.945); sr2b-01939 “connect Auth to Worker” (0.924) |
| n_roles | 2 | 2.4% | sr2b-00221 “remove Cto” (0.943); sr2b-01561 “remove Process” (0.948) |
| none_p_min | 2 | 2.4% | sr2b-00137 “add a navy square” (0.935); sr2b-00765 “add a navy circle” (0.935) |
| agree | 1 | 1.2% | sr2b-02062 “move Sprint1 left” (0.715) |
| cut_start | 1 | 1.2% | sr2b-00146 “move Kelp left” (0.939) |
| fill_p_min | 1 | 1.2% | sr2b-02337 “add a gold circle” (0.941) |

| where the cause sits | n | share | examples |
|---|---|---|---|
| calibration (both readers agree; the largest pull is a size, cut or word signal) | 76 | 91.6% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| calibration (both readers agree; the largest pull is another signal) | 6 | 7.2% | sr2b-00137 “add a navy square” (0.935); sr2b-00253 “move Auth up” (0.904); sr2b-00765 “add a navy circle” (0.935) |
| the model or the data (the readers disagree on a value: see which key) | 1 | 1.2% | sr2b-02062 “move Sprint1 left” (0.715) |

### r2b, VSS: all held-but-right requests: 2

| situation | n | share | examples |
|---|---|---|---|
| rules | 2 | 100.0% | sr2b-01812 “move Rack3 left” (0.631); sr2b-02062 “move Sprint1 left” (0.632) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 2 | 100.0% | sr2b-01812 “move Rack3 left” (0.631); sr2b-02062 “move Sprint1 left” (0.632) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| none (own confidence above its threshold) | 2 | 100.0% | sr2b-01812 “move Rack3 left” (0.631); sr2b-02062 “move Sprint1 left” (0.632) |

### r2b, SOP-BERT: all held-but-right requests: 172

| situation | n | share | examples |
|---|---|---|---|
| vss+rules | 171 | 99.4% | sr2b-00003 “move Plant down” (0.936); sr2b-00017 “move Epilogue up” (0.950); sr2b-00048 “remove Factory” (0.945) |
| none | 1 | 0.6% | sr2b-02062 “move Sprint1 left” (0.519) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 172 | 100.0% | sr2b-00003 “move Plant down” (0.936); sr2b-00017 “move Epilogue up” (0.950); sr2b-00048 “remove Factory” (0.945) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 172 | 100.0% | sr2b-00003 “move Plant down” (0.936); sr2b-00017 “move Epilogue up” (0.950); sr2b-00048 “remove Factory” (0.945) |

### r2b, VSS-BERT: the subset the Rules read right: 83

| situation | n | share | examples |
|---|---|---|---|
| agree | 82 | 98.8% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| disagree | 1 | 1.2% | sr2b-02062 “move Sprint1 left” (0.715) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| agree | 82 | 98.8% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| disagree | 1 | 1.2% | sr2b-02062 “move Sprint1 left” (0.715) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 72 | 86.7% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| value | 5 | 6.0% | sr2b-00137 “add a navy square” (0.935); sr2b-00765 “add a navy circle” (0.935); sr2b-00883 “add a green hexagon” (0.945) |
| fill | 2 | 2.4% | sr2b-01359 “add a teal star” (0.901); sr2b-02337 “add a gold circle” (0.941) |
| none (own confidence above its threshold) | 2 | 2.4% | sr2b-00345 “add a teal square” (0.948); sr2b-02062 “move Sprint1 left” (0.715) |
| tags | 2 | 2.4% | sr2b-01543 “make Auth blue” (0.945); sr2b-01939 “connect Auth to Worker” (0.924) |

| first top_pulls feature | n | share | examples |
|---|---|---|---|
| n_words | 73 | 88.0% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| tag_all_min | 3 | 3.6% | sr2b-00253 “move Auth up” (0.904); sr2b-01543 “make Auth blue” (0.945); sr2b-01939 “connect Auth to Worker” (0.924) |
| n_roles | 2 | 2.4% | sr2b-00221 “remove Cto” (0.943); sr2b-01561 “remove Process” (0.948) |
| none_p_min | 2 | 2.4% | sr2b-00137 “add a navy square” (0.935); sr2b-00765 “add a navy circle” (0.935) |
| agree | 1 | 1.2% | sr2b-02062 “move Sprint1 left” (0.715) |
| cut_start | 1 | 1.2% | sr2b-00146 “move Kelp left” (0.939) |
| fill_p_min | 1 | 1.2% | sr2b-02337 “add a gold circle” (0.941) |

| where the cause sits | n | share | examples |
|---|---|---|---|
| calibration (both readers agree; the largest pull is a size, cut or word signal) | 76 | 91.6% | sr2b-00053 “move Grandma right” (0.934); sr2b-00059 “move Battery left” (0.926); sr2b-00070 “move Idle right” (0.934) |
| calibration (both readers agree; the largest pull is another signal) | 6 | 7.2% | sr2b-00137 “add a navy square” (0.935); sr2b-00253 “move Auth up” (0.904); sr2b-00765 “add a navy circle” (0.935) |
| the model or the data (the readers disagree on a value: see which key) | 1 | 1.2% | sr2b-02062 “move Sprint1 left” (0.715) |

### r2b, VSS: the subset the Rules read right: 2

| situation | n | share | examples |
|---|---|---|---|
| rules | 2 | 100.0% | sr2b-01812 “move Rack3 left” (0.631); sr2b-02062 “move Sprint1 left” (0.632) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 2 | 100.0% | sr2b-01812 “move Rack3 left” (0.631); sr2b-02062 “move Sprint1 left” (0.632) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| none (own confidence above its threshold) | 2 | 100.0% | sr2b-01812 “move Rack3 left” (0.631); sr2b-02062 “move Sprint1 left” (0.632) |

### r2b, SOP-BERT: the subset the Rules read right: 172

| situation | n | share | examples |
|---|---|---|---|
| vss+rules | 171 | 99.4% | sr2b-00003 “move Plant down” (0.936); sr2b-00017 “move Epilogue up” (0.950); sr2b-00048 “remove Factory” (0.945) |
| none | 1 | 0.6% | sr2b-02062 “move Sprint1 left” (0.519) |

| reason group (the demo's) | n | share | examples |
|---|---|---|---|
| threshold | 172 | 100.0% | sr2b-00003 “move Plant down” (0.936); sr2b-00017 “move Epilogue up” (0.950); sr2b-00048 “remove Factory” (0.945) |

| the executing reader's own group | n | share | examples |
|---|---|---|---|
| prior | 172 | 100.0% | sr2b-00003 “move Plant down” (0.936); sr2b-00017 “move Epilogue up” (0.950); sr2b-00048 “remove Factory” (0.945) |

## 2. Executed wrong and extras executed

### V, VSS-BERT: 0 (0 wrong, 0 extra)

### V, VSS: 0 (0 wrong, 0 extra)

### V, SOP-BERT: 0 (0 wrong, 0 extra)

### V, Rules: 0 (0 wrong, 0 extra)

### t1s, VSS-BERT: 48 (48 wrong, 0 extra)

| first cause (by rule) | n | share | examples |
|---|---|---|---|
| value (property) | 30 | 62.5% | st1-00118 “what's the border color of Waiting” (0.970); st1-00204 “what's the border color of Budget” (0.970); st1-00226 “what is the outline colour of Temple” (0.978) |
| value (count) | 9 | 18.8% | st1-00184 “redo that twice” (0.949); st1-00441 “undo that twice” (0.968); st1-00738 “undo 5 times” (0.976) |
| name or reference (target) | 7 | 14.6% | st1-00308 “erase the giant squares” (0.969); st1-00410 “erase the little circles” (0.964); st1-00526 “erase the little squares” (0.962) |
| value (size) | 2 | 4.2% | st1-01166 “how many big diamonds are there” (0.964); st1-02180 “how many little ellipses are there” (0.956) |

All:

| id | text | kind | gold | read | differ |
|---|---|---|---|---|---|
| st1-00118 | what's the border color of Waiting | executed_wrong | {"ask":"property","property":"outline","target":"waiting"} | {"ask":"property","property":"color","target":"waiting"} | property: color / outline |
| st1-00184 | redo that twice thanks | executed_wrong | {"action":"redo","count":"2"} | {"action":"redo"} | count: ∅ / 2 |
| st1-00204 | what's the border color of Budget | executed_wrong | {"ask":"property","property":"outline","target":"budget"} | {"ask":"property","property":"color","target":"budget"} | property: color / outline |
| st1-00226 | what is the outline colour of Temple | executed_wrong | {"ask":"property","property":"outline","target":"temple"} | {"ask":"property","property":"color","target":"temple"} | property: color / outline |
| st1-00308 | erase the giant squares | executed_wrong | {"action":"delete","target":"mention(quantifier=all,shape=square,size=huge)"} | {"action":"delete","target":"mention(quantifier=all,shape=square)"} | target: mention(quantifier=all,shape=square) / mention(quantifier=all,shape=square,size=huge) |
| st1-00324 | what's the border color of Led | executed_wrong | {"ask":"property","property":"outline","target":"led"} | {"ask":"property","property":"color","target":"led"} | property: color / outline |
| st1-00344 | what is the outline colour of Submit | executed_wrong | {"ask":"property","property":"outline","target":"submit"} | {"ask":"property","property":"color","target":"submit"} | property: color / outline |
| st1-00367 | what is the outline colour of Stop2 | executed_wrong | {"ask":"property","property":"outline","target":"stop2"} | {"ask":"property","property":"color","target":"stop2"} | property: color / outline |
| st1-00410 | erase the little circles | executed_wrong | {"action":"delete","target":"mention(quantifier=all,shape=circle,size=small)"} | {"action":"delete","target":"mention(quantifier=all,shape=circle)"} | target: mention(quantifier=all,shape=circle) / mention(quantifier=all,shape=circle,size=small) |
| st1-00418 | what's the border color of Plankton | executed_wrong | {"ask":"property","property":"outline","target":"plankton"} | {"ask":"property","property":"color","target":"plankton"} | property: color / outline |
| st1-00441 | now undo that twice pls | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| st1-00526 | erase the little squares | executed_wrong | {"action":"delete","target":"mention(quantifier=all,shape=square,size=small)"} | {"action":"delete","target":"mention(quantifier=all,shape=square)"} | target: mention(quantifier=all,shape=square) / mention(quantifier=all,shape=square,size=small) |
| st1-00592 | what's the border color of Logo pls | executed_wrong | {"ask":"property","property":"outline","target":"logo"} | {"ask":"property","property":"color","target":"logo"} | property: color / outline |
| st1-00626 | what's the border color of Neptune | executed_wrong | {"ask":"property","property":"outline","target":"neptune"} | {"ask":"property","property":"color","target":"neptune"} | property: color / outline |
| st1-00669 | now what is the outline colour of Village | executed_wrong | {"ask":"property","property":"outline","target":"village"} | {"ask":"property","property":"color","target":"village"} | property: color / outline |
| st1-00738 | ok so now undo 5 times please | executed_wrong | {"action":"undo","count":"5"} | {"action":"undo"} | count: ∅ / 5 |
| st1-00782 | what is the outline colour of Sales thx | executed_wrong | {"ask":"property","property":"outline","target":"sales"} | {"ask":"property","property":"color","target":"sales"} | property: color / outline |
| st1-00828 | what's the border color of Grandma | executed_wrong | {"ask":"property","property":"outline","target":"grandma"} | {"ask":"property","property":"color","target":"grandma"} | property: color / outline |
| st1-00874 | oh and undo that twice | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| st1-00932 | what's the border color of Epic | executed_wrong | {"ask":"property","property":"outline","target":"epic"} | {"ask":"property","property":"color","target":"epic"} | property: color / outline |
| st1-00984 | what's the border color of Booting | executed_wrong | {"ask":"property","property":"outline","target":"booting"} | {"ask":"property","property":"color","target":"booting"} | property: color / outline |
| st1-01006 | what is the outline colour of Noah | executed_wrong | {"ask":"property","property":"outline","target":"noah"} | {"ask":"property","property":"color","target":"noah"} | property: color / outline |
| st1-01072 | ok now move the little diamonds right | executed_wrong | {"action":"move","target":"mention(quantifier=all,shape=diamond,size=small)","direction":"right"} | {"action":"move","direction":"right","target":"mention(quantifier=all,shape=diamond)"} | target: mention(quantifier=all,shape=diamond) / mention(quantifier=all,shape=diamond,size=small) |
| st1-01096 | what's the border color of Jupiter for me | executed_wrong | {"ask":"property","property":"outline","target":"jupiter"} | {"ask":"property","property":"color","target":"jupiter"} | property: color / outline |
| st1-01139 | what is the outline colour of Draft pls | executed_wrong | {"ask":"property","property":"outline","target":"draft"} | {"ask":"property","property":"color","target":"draft"} | property: color / outline |
| st1-01166 | how many big diamonds are there | executed_wrong | {"ask":"count","shape":"diamond","size":"large"} | {"ask":"count","shape":"diamond"} | size: ∅ / large |
| st1-01252 | erase the little diamonds | executed_wrong | {"action":"delete","target":"mention(quantifier=all,shape=diamond,size=small)"} | {"action":"delete","target":"mention(quantifier=all,shape=diamond)"} | target: mention(quantifier=all,shape=diamond) / mention(quantifier=all,shape=diamond,size=small) |
| st1-01268 | undo that twice quickly | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| st1-01320 | what is the outline colour of Prologue thanks | executed_wrong | {"ask":"property","property":"outline","target":"prologue"} | {"ask":"property","property":"color","target":"prologue"} | property: color / outline |
| st1-01346 | undo 3 times pls | executed_wrong | {"action":"undo","count":"3"} | {"action":"undo"} | count: ∅ / 3 |
| st1-01388 | hmm ok, undo it 5 times please and thanks | executed_wrong | {"action":"undo","count":"5"} | {"action":"undo"} | count: ∅ / 5 |
| st1-01467 | what is the outline colour of Climax | executed_wrong | {"ask":"property","property":"outline","target":"climax"} | {"ask":"property","property":"color","target":"climax"} | property: color / outline |
| st1-01506 | ok and erase the giant triangles | executed_wrong | {"action":"delete","target":"mention(quantifier=all,shape=triangle,size=huge)"} | {"action":"delete","target":"mention(quantifier=all,shape=triangle)"} | target: mention(quantifier=all,shape=triangle) / mention(quantifier=all,shape=triangle,size=huge) |
| st1-01529 | what's the border color of Wr1 | executed_wrong | {"ask":"property","property":"outline","target":"wr1"} | {"ask":"property","property":"color","target":"wr1"} | property: color / outline |
| st1-01602 | what is the outline colour of Enrich | executed_wrong | {"ask":"property","property":"outline","target":"enrich"} | {"ask":"property","property":"color","target":"enrich"} | property: color / outline |
| st1-01702 | ok now erase the little squares for me | executed_wrong | {"action":"delete","target":"mention(quantifier=all,shape=square,size=small)"} | {"action":"delete","target":"mention(quantifier=all,shape=square)"} | target: mention(quantifier=all,shape=square) / mention(quantifier=all,shape=square,size=small) |
| st1-01732 | what's the border color of Ending | executed_wrong | {"ask":"property","property":"outline","target":"ending"} | {"ask":"property","property":"color","target":"ending"} | property: color / outline |
| st1-01754 | what is the outline colour of Warehouse | executed_wrong | {"ask":"property","property":"outline","target":"warehouse"} | {"ask":"property","property":"color","target":"warehouse"} | property: color / outline |
| st1-01897 | now what's the border color of Store | executed_wrong | {"ask":"property","property":"outline","target":"store"} | {"ask":"property","property":"color","target":"store"} | property: color / outline |
| st1-01941 | what is the outline colour of Camp | executed_wrong | {"ask":"property","property":"outline","target":"camp"} | {"ask":"property","property":"color","target":"camp"} | property: color / outline |
| st1-01965 | next, what's the border color of Mercury | executed_wrong | {"ask":"property","property":"outline","target":"mercury"} | {"ask":"property","property":"color","target":"mercury"} | property: color / outline |
| st1-02084 | what's the border color of Idle | executed_wrong | {"ask":"property","property":"outline","target":"idle"} | {"ask":"property","property":"color","target":"idle"} | property: color / outline |
| st1-02134 | what is the outline colour of Algae | executed_wrong | {"ask":"property","property":"outline","target":"algae"} | {"ask":"property","property":"color","target":"algae"} | property: color / outline |
| st1-02168 | what's the border color of Ingress quickly | executed_wrong | {"ask":"property","property":"outline","target":"ingress"} | {"ask":"property","property":"color","target":"ingress"} | property: color / outline |
| st1-02180 | ok now how many little ellipses are there please and thanks | executed_wrong | {"ask":"count","shape":"ellipse","size":"small"} | {"ask":"count","shape":"ellipse"} | size: ∅ / small |
| st1-02312 | ok now undo that twice please | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| st1-02356 | undo 3 times please | executed_wrong | {"action":"undo","count":"3"} | {"action":"undo"} | count: ∅ / 3 |
| st1-02365 | what's the border color of Logo | executed_wrong | {"ask":"property","property":"outline","target":"logo"} | {"ask":"property","property":"color","target":"logo"} | property: color / outline |

### t1s, VSS: 37 (37 wrong, 0 extra)

| first cause (by rule) | n | share | examples |
|---|---|---|---|
| value (property) | 31 | 83.8% | st1-00118 “what's the border color of Waiting” (0.771); st1-00204 “what's the border color of Budget” (0.771); st1-00226 “what is the outline colour of Temple” (0.814) |
| value (size) | 6 | 16.2% | st1-00614 “how many giant triangles are there” (0.757); st1-00802 “how many big circles are there” (0.793); st1-01166 “how many big diamonds are there” (0.793) |

All:

| id | text | kind | gold | read | differ |
|---|---|---|---|---|---|
| st1-00118 | what's the border color of Waiting | executed_wrong | {"ask":"property","property":"outline","target":"waiting"} | {"ask":"property","target":"waiting","property":"color"} | property: color / outline |
| st1-00204 | what's the border color of Budget | executed_wrong | {"ask":"property","property":"outline","target":"budget"} | {"ask":"property","target":"budget","property":"color"} | property: color / outline |
| st1-00226 | what is the outline colour of Temple | executed_wrong | {"ask":"property","property":"outline","target":"temple"} | {"ask":"property","target":"temple","property":"color"} | property: color / outline |
| st1-00324 | what's the border color of Led | executed_wrong | {"ask":"property","property":"outline","target":"led"} | {"ask":"property","target":"led","property":"color"} | property: color / outline |
| st1-00344 | what is the outline colour of Submit | executed_wrong | {"ask":"property","property":"outline","target":"submit"} | {"ask":"property","target":"submit","property":"color"} | property: color / outline |
| st1-00367 | what is the outline colour of Stop2 | executed_wrong | {"ask":"property","property":"outline","target":"stop2"} | {"ask":"property","target":"stop2","property":"color"} | property: color / outline |
| st1-00418 | what's the border color of Plankton | executed_wrong | {"ask":"property","property":"outline","target":"plankton"} | {"ask":"property","target":"plankton","property":"color"} | property: color / outline |
| st1-00592 | what's the border color of Logo pls | executed_wrong | {"ask":"property","property":"outline","target":"logo"} | {"ask":"property","target":"logo","property":"color"} | property: color / outline |
| st1-00614 | how many giant triangles are there | executed_wrong | {"ask":"count","shape":"triangle","size":"huge"} | {"ask":"count","shape":"triangle"} | size: ∅ / huge |
| st1-00626 | what's the border color of Neptune | executed_wrong | {"ask":"property","property":"outline","target":"neptune"} | {"ask":"property","target":"neptune","property":"color"} | property: color / outline |
| st1-00669 | now what is the outline colour of Village | executed_wrong | {"ask":"property","property":"outline","target":"village"} | {"ask":"property","target":"village","property":"color"} | property: color / outline |
| st1-00782 | what is the outline colour of Sales thx | executed_wrong | {"ask":"property","property":"outline","target":"sales"} | {"ask":"property","target":"sales","property":"color"} | property: color / outline |
| st1-00802 | how many big circles are there | executed_wrong | {"ask":"count","shape":"circle","size":"large"} | {"ask":"count","shape":"circle"} | size: ∅ / large |
| st1-00828 | what's the border color of Grandma | executed_wrong | {"ask":"property","property":"outline","target":"grandma"} | {"ask":"property","target":"grandma","property":"color"} | property: color / outline |
| st1-00932 | what's the border color of Epic | executed_wrong | {"ask":"property","property":"outline","target":"epic"} | {"ask":"property","target":"epic","property":"color"} | property: color / outline |
| st1-00984 | what's the border color of Booting | executed_wrong | {"ask":"property","property":"outline","target":"booting"} | {"ask":"property","target":"booting","property":"color"} | property: color / outline |
| st1-01006 | what is the outline colour of Noah | executed_wrong | {"ask":"property","property":"outline","target":"noah"} | {"ask":"property","target":"noah","property":"color"} | property: color / outline |
| st1-01096 | what's the border color of Jupiter for me | executed_wrong | {"ask":"property","property":"outline","target":"jupiter"} | {"ask":"property","target":"jupiter","property":"color"} | property: color / outline |
| st1-01139 | what is the outline colour of Draft pls | executed_wrong | {"ask":"property","property":"outline","target":"draft"} | {"ask":"property","target":"draft","property":"color"} | property: color / outline |
| st1-01166 | how many big diamonds are there | executed_wrong | {"ask":"count","shape":"diamond","size":"large"} | {"ask":"count","shape":"diamond"} | size: ∅ / large |
| st1-01250 | now what's the border color of Volcano thx | executed_wrong | {"ask":"property","property":"outline","target":"volcano"} | {"ask":"property","target":"volcano","property":"color"} | property: color / outline |
| st1-01320 | what is the outline colour of Prologue thanks | executed_wrong | {"ask":"property","property":"outline","target":"prologue"} | {"ask":"property","target":"prologue","property":"color"} | property: color / outline |
| st1-01467 | what is the outline colour of Climax | executed_wrong | {"ask":"property","property":"outline","target":"climax"} | {"ask":"property","target":"climax","property":"color"} | property: color / outline |
| st1-01529 | what's the border color of Wr1 | executed_wrong | {"ask":"property","property":"outline","target":"wr1"} | {"ask":"property","target":"wr1","property":"color"} | property: color / outline |
| st1-01602 | what is the outline colour of Enrich | executed_wrong | {"ask":"property","property":"outline","target":"enrich"} | {"ask":"property","target":"enrich","property":"color"} | property: color / outline |
| st1-01732 | what's the border color of Ending | executed_wrong | {"ask":"property","property":"outline","target":"ending"} | {"ask":"property","target":"ending","property":"color"} | property: color / outline |
| st1-01754 | what is the outline colour of Warehouse | executed_wrong | {"ask":"property","property":"outline","target":"warehouse"} | {"ask":"property","target":"warehouse","property":"color"} | property: color / outline |
| st1-01897 | now what's the border color of Store | executed_wrong | {"ask":"property","property":"outline","target":"store"} | {"ask":"property","target":"store","property":"color"} | property: color / outline |
| st1-01941 | what is the outline colour of Camp | executed_wrong | {"ask":"property","property":"outline","target":"camp"} | {"ask":"property","target":"camp","property":"color"} | property: color / outline |
| st1-01965 | next, what's the border color of Mercury | executed_wrong | {"ask":"property","property":"outline","target":"mercury"} | {"ask":"property","target":"mercury","property":"color"} | property: color / outline |
| st1-02084 | what's the border color of Idle | executed_wrong | {"ask":"property","property":"outline","target":"idle"} | {"ask":"property","target":"idle","property":"color"} | property: color / outline |
| st1-02121 | how many little diamonds are there | executed_wrong | {"ask":"count","shape":"diamond","size":"small"} | {"ask":"count","shape":"diamond"} | size: ∅ / small |
| st1-02134 | what is the outline colour of Algae | executed_wrong | {"ask":"property","property":"outline","target":"algae"} | {"ask":"property","target":"algae","property":"color"} | property: color / outline |
| st1-02168 | what's the border color of Ingress quickly | executed_wrong | {"ask":"property","property":"outline","target":"ingress"} | {"ask":"property","target":"ingress","property":"color"} | property: color / outline |
| st1-02180 | ok now how many little ellipses are there please and thanks | executed_wrong | {"ask":"count","shape":"ellipse","size":"small"} | {"ask":"count","shape":"ellipse"} | size: ∅ / small |
| st1-02324 | how many big rectangles are there | executed_wrong | {"ask":"count","shape":"rectangle","size":"large"} | {"ask":"count","shape":"rectangle"} | size: ∅ / large |
| st1-02365 | what's the border color of Logo | executed_wrong | {"ask":"property","property":"outline","target":"logo"} | {"ask":"property","target":"logo","property":"color"} | property: color / outline |

### t1s, SOP-BERT: 56 (56 wrong, 0 extra)

| first cause (by rule) | n | share | examples |
|---|---|---|---|
| value (property) | 44 | 78.6% | st1-00118 “what's the border color of Waiting” (0.985); st1-00204 “what's the border color of Budget” (0.986); st1-00226 “what is the outline colour of Temple” (0.989) |
| value (count) | 6 | 10.7% | st1-00184 “redo that twice” (0.962); st1-00998 “redo twice” (0.962); st1-01066 “redo four times” (0.955) |
| value (size) | 6 | 10.7% | st1-00614 “how many giant triangles are there” (0.954); st1-00802 “how many big circles are there” (0.963); st1-01166 “how many big diamonds are there” (0.973) |

All:

| id | text | kind | gold | read | differ |
|---|---|---|---|---|---|
| st1-00118 | what's the border color of Waiting | executed_wrong | {"ask":"property","property":"outline","target":"waiting"} | {"ask":"property","property":"color","target":"waiting"} | property: color / outline |
| st1-00184 | redo that twice thanks | executed_wrong | {"action":"redo","count":"2"} | {"action":"redo"} | count: ∅ / 2 |
| st1-00204 | what's the border color of Budget | executed_wrong | {"ask":"property","property":"outline","target":"budget"} | {"ask":"property","property":"color","target":"budget"} | property: color / outline |
| st1-00226 | what is the outline colour of Temple | executed_wrong | {"ask":"property","property":"outline","target":"temple"} | {"ask":"property","property":"color","target":"temple"} | property: color / outline |
| st1-00272 | what is the outline of Waiting | executed_wrong | {"ask":"property","property":"outline","target":"waiting"} | {"ask":"property","property":"shape","target":"waiting"} | property: shape / outline |
| st1-00324 | what's the border color of Led | executed_wrong | {"ask":"property","property":"outline","target":"led"} | {"ask":"property","property":"color","target":"led"} | property: color / outline |
| st1-00344 | what is the outline colour of Submit | executed_wrong | {"ask":"property","property":"outline","target":"submit"} | {"ask":"property","property":"color","target":"submit"} | property: color / outline |
| st1-00367 | what is the outline colour of Stop2 | executed_wrong | {"ask":"property","property":"outline","target":"stop2"} | {"ask":"property","property":"color","target":"stop2"} | property: color / outline |
| st1-00418 | what's the border color of Plankton | executed_wrong | {"ask":"property","property":"outline","target":"plankton"} | {"ask":"property","property":"color","target":"plankton"} | property: color / outline |
| st1-00592 | what's the border color of Logo pls | executed_wrong | {"ask":"property","property":"outline","target":"logo"} | {"ask":"property","property":"color","target":"logo"} | property: color / outline |
| st1-00614 | how many giant triangles are there | executed_wrong | {"ask":"count","shape":"triangle","size":"huge"} | {"ask":"count","shape":"triangle"} | size: ∅ / huge |
| st1-00626 | what's the border color of Neptune | executed_wrong | {"ask":"property","property":"outline","target":"neptune"} | {"ask":"property","property":"color","target":"neptune"} | property: color / outline |
| st1-00669 | now what is the outline colour of Village | executed_wrong | {"ask":"property","property":"outline","target":"village"} | {"ask":"property","property":"color","target":"village"} | property: color / outline |
| st1-00782 | what is the outline colour of Sales thx | executed_wrong | {"ask":"property","property":"outline","target":"sales"} | {"ask":"property","property":"color","target":"sales"} | property: color / outline |
| st1-00802 | how many big circles are there | executed_wrong | {"ask":"count","shape":"circle","size":"large"} | {"ask":"count","shape":"circle"} | size: ∅ / large |
| st1-00828 | what's the border color of Grandma | executed_wrong | {"ask":"property","property":"outline","target":"grandma"} | {"ask":"property","property":"color","target":"grandma"} | property: color / outline |
| st1-00844 | what is the outline colour of Monitor | executed_wrong | {"ask":"property","property":"outline","target":"monitor"} | {"ask":"property","property":"shape","target":"monitor"} | property: shape / outline |
| st1-00926 | what is the outline of Port | executed_wrong | {"ask":"property","property":"outline","target":"port"} | {"ask":"property","property":"shape","target":"port"} | property: shape / outline |
| st1-00932 | what's the border color of Epic | executed_wrong | {"ask":"property","property":"outline","target":"epic"} | {"ask":"property","property":"color","target":"epic"} | property: color / outline |
| st1-00984 | what's the border color of Booting | executed_wrong | {"ask":"property","property":"outline","target":"booting"} | {"ask":"property","property":"color","target":"booting"} | property: color / outline |
| st1-00998 | redo twice please and thanks | executed_wrong | {"action":"redo","count":"2"} | {"action":"redo"} | count: ∅ / 2 |
| st1-01006 | what is the outline colour of Noah | executed_wrong | {"ask":"property","property":"outline","target":"noah"} | {"ask":"property","property":"color","target":"noah"} | property: color / outline |
| st1-01066 | redo four times | executed_wrong | {"action":"redo","count":"4"} | {"action":"redo"} | count: ∅ / 4 |
| st1-01096 | what's the border color of Jupiter for me | executed_wrong | {"ask":"property","property":"outline","target":"jupiter"} | {"ask":"property","property":"color","target":"jupiter"} | property: color / outline |
| st1-01139 | what is the outline colour of Draft pls | executed_wrong | {"ask":"property","property":"outline","target":"draft"} | {"ask":"property","property":"color","target":"draft"} | property: color / outline |
| st1-01166 | how many big diamonds are there | executed_wrong | {"ask":"count","shape":"diamond","size":"large"} | {"ask":"count","shape":"diamond"} | size: ∅ / large |
| st1-01224 | ok now what is the outline colour of Header please and thanks | executed_wrong | {"ask":"property","property":"outline","target":"header"} | {"ask":"property","property":"shape","target":"header"} | property: shape / outline |
| st1-01250 | now what's the border color of Volcano thx | executed_wrong | {"ask":"property","property":"outline","target":"volcano"} | {"ask":"property","property":"color","target":"volcano"} | property: color / outline |
| st1-01274 | what is the outline of Stopped | executed_wrong | {"ask":"property","property":"outline","target":"stopped"} | {"ask":"property","property":"shape","target":"stopped"} | property: shape / outline |
| st1-01320 | what is the outline colour of Prologue thanks | executed_wrong | {"ask":"property","property":"outline","target":"prologue"} | {"ask":"property","property":"color","target":"prologue"} | property: color / outline |
| st1-01352 | what is the outline of Shark | executed_wrong | {"ask":"property","property":"outline","target":"shark"} | {"ask":"property","property":"shape","target":"shark"} | property: shape / outline |
| st1-01467 | what is the outline colour of Climax | executed_wrong | {"ask":"property","property":"outline","target":"climax"} | {"ask":"property","property":"color","target":"climax"} | property: color / outline |
| st1-01529 | what's the border color of Wr1 | executed_wrong | {"ask":"property","property":"outline","target":"wr1"} | {"ask":"property","property":"color","target":"wr1"} | property: color / outline |
| st1-01546 | what is the outline of Armed | executed_wrong | {"ask":"property","property":"outline","target":"armed"} | {"ask":"property","property":"shape","target":"armed"} | property: shape / outline |
| st1-01565 | what is the outline of Bridge | executed_wrong | {"ask":"property","property":"outline","target":"bridge"} | {"ask":"property","property":"shape","target":"bridge"} | property: shape / outline |
| st1-01574 | redo four times pls | executed_wrong | {"action":"redo","count":"4"} | {"action":"redo"} | count: ∅ / 4 |
| st1-01602 | what is the outline colour of Enrich | executed_wrong | {"ask":"property","property":"outline","target":"enrich"} | {"ask":"property","property":"color","target":"enrich"} | property: color / outline |
| st1-01732 | what's the border color of Ending | executed_wrong | {"ask":"property","property":"outline","target":"ending"} | {"ask":"property","property":"color","target":"ending"} | property: color / outline |
| st1-01754 | what is the outline colour of Warehouse | executed_wrong | {"ask":"property","property":"outline","target":"warehouse"} | {"ask":"property","property":"color","target":"warehouse"} | property: color / outline |
| st1-01783 | what is the outline of Modal | executed_wrong | {"ask":"property","property":"outline","target":"modal"} | {"ask":"property","property":"shape","target":"modal"} | property: shape / outline |
| st1-01846 | what is the outline of Dave | executed_wrong | {"ask":"property","property":"outline","target":"dave"} | {"ask":"property","property":"shape","target":"dave"} | property: shape / outline |
| st1-01897 | now what's the border color of Store | executed_wrong | {"ask":"property","property":"outline","target":"store"} | {"ask":"property","property":"color","target":"store"} | property: color / outline |
| st1-01941 | what is the outline colour of Camp | executed_wrong | {"ask":"property","property":"outline","target":"camp"} | {"ask":"property","property":"color","target":"camp"} | property: color / outline |
| st1-01965 | next, what's the border color of Mercury | executed_wrong | {"ask":"property","property":"outline","target":"mercury"} | {"ask":"property","property":"color","target":"mercury"} | property: color / outline |
| st1-02004 | next, what is the outline of Resistor | executed_wrong | {"ask":"property","property":"outline","target":"resistor"} | {"ask":"property","property":"shape","target":"resistor"} | property: shape / outline |
| st1-02043 | what is the outline of Scene1 | executed_wrong | {"ask":"property","property":"outline","target":"scene1"} | {"ask":"property","property":"shape","target":"scene1"} | property: shape / outline |
| st1-02082 | redo four times if you can | executed_wrong | {"action":"redo","count":"4"} | {"action":"redo"} | count: ∅ / 4 |
| st1-02084 | what's the border color of Idle | executed_wrong | {"ask":"property","property":"outline","target":"idle"} | {"ask":"property","property":"color","target":"idle"} | property: color / outline |
| st1-02121 | how many little diamonds are there | executed_wrong | {"ask":"count","shape":"diamond","size":"small"} | {"ask":"count","shape":"diamond"} | size: ∅ / small |
| st1-02134 | what is the outline colour of Algae | executed_wrong | {"ask":"property","property":"outline","target":"algae"} | {"ask":"property","property":"color","target":"algae"} | property: color / outline |
| st1-02148 | sorry, redo 2 times | executed_wrong | {"action":"redo","count":"2"} | {"action":"redo"} | count: ∅ / 2 |
| st1-02168 | what's the border color of Ingress quickly | executed_wrong | {"ask":"property","property":"outline","target":"ingress"} | {"ask":"property","property":"color","target":"ingress"} | property: color / outline |
| st1-02180 | ok now how many little ellipses are there please and thanks | executed_wrong | {"ask":"count","shape":"ellipse","size":"small"} | {"ask":"count","shape":"ellipse"} | size: ∅ / small |
| st1-02322 | what is the outline colour of Garage please | executed_wrong | {"ask":"property","property":"outline","target":"garage"} | {"ask":"property","property":"shape","target":"garage"} | property: shape / outline |
| st1-02324 | how many big rectangles are there | executed_wrong | {"ask":"count","shape":"rectangle","size":"large"} | {"ask":"count","shape":"rectangle"} | size: ∅ / large |
| st1-02365 | what's the border color of Logo | executed_wrong | {"ask":"property","property":"outline","target":"logo"} | {"ask":"property","property":"color","target":"logo"} | property: color / outline |

### t1s, Rules: 0 (0 wrong, 0 extra)

### short3s_test, VSS-BERT: 5 (5 wrong, 0 extra)

| first cause (by rule) | n | share | examples |
|---|---|---|---|
| value (count) | 2 | 40.0% | s3-0062 “undo twice” (0.977); s3-0188 “undo the last 2 changes” (0.969) |
| name or reference (target) | 1 | 20.0% | s3-0293 “trash the small squares” (0.960) |
| value (outline) | 1 | 20.0% | s3-0354 “make the outline of check orange” (0.981) |
| value (property) | 1 | 20.0% | s3-0358 “what is the outline color of process” (0.980) |

All:

| id | text | kind | gold | read | differ |
|---|---|---|---|---|---|
| s3-0062 | undo twice then make start blue | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| s3-0188 | undo the last 2 changes | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| s3-0293 | trash the small squares | executed_wrong | {"action":"delete","target":"mention(quantifier=all,shape=square,size=small)"} | {"action":"delete","target":"mention(quantifier=all,shape=square)"} | target: mention(quantifier=all,shape=square) / mention(quantifier=all,shape=square,size=small) |
| s3-0354 | make the outline of check orange | executed_wrong | {"action":"set","target":"check","outline":"orange"} | {"action":"set","color":"orange","target":"check"} | outline: ∅ / orange |
| s3-0358 | what is the outline color of process | executed_wrong | {"ask":"property","target":"process","property":"outline"} | {"ask":"property","property":"color","target":"process"} | property: color / outline |

### short3s_test, VSS: 7 (5 wrong, 2 extra)

| first cause (by rule) | n | share | examples |
|---|---|---|---|
| name or reference (target) | 3 | 42.9% | s3-0032 “distribute horizontally” (0.924); s3-0266 “make it a star” (0.914); s3-0498 “make it a grid” (0.910) |
| extra that overlaps a gold request (cut or action) | 2 | 28.6% | s3-0131 “done on top” (0.911); s3-0336 “start at the left” (0.917) |
| value (about) | 1 | 14.3% | s3-0236 “what does SOP Lang mean” (0.729) |
| value (property) | 1 | 14.3% | s3-0358 “what is the outline color of process” (0.814) |

All:

| id | text | kind | gold | read | differ |
|---|---|---|---|---|---|
| s3-0032 | distribute horizontally | executed_wrong | {"action":"distribute","axis":"horizontal","target":"mention(quantifier=all)"} | {"action":"distribute","axis":"horizontal","target":"check,done,process,start"} | target: check,done,process,start / mention(quantifier=all) |
| s3-0131 | done on top, check smaller | extra_executed | - | {"action":"move","target":"done","position":"top"} | - |
| s3-0236 | what does SOP Lang mean | executed_wrong | {"ask":"help","about":"sop lang"} | {"ask":"help"} | about: ∅ / sop lang |
| s3-0266 | rename Done to End and make it a star | executed_wrong | {"action":"set","target":"end","shape":"star"} | {"action":"set","target":"done","shape":"star"} | target: done / end |
| s3-0336 | lay it out as layers, start at the left | extra_executed | - | {"action":"move","target":"start","position":"left"} | - |
| s3-0358 | what is the outline color of process | executed_wrong | {"ask":"property","target":"process","property":"outline"} | {"ask":"property","target":"process","property":"color"} | property: color / outline |
| s3-0498 | show me what's in the diagram and then make it a grid | executed_wrong | {"action":"arrange","target":"mention(quantifier=all)","layout":"grid"} | {"action":"arrange","layout":"grid"} | target: ∅ / mention(quantifier=all) |

### short3s_test, SOP-BERT: 5 (5 wrong, 0 extra)

| first cause (by rule) | n | share | examples |
|---|---|---|---|
| value (count) | 2 | 40.0% | s3-0062 “undo twice” (0.957); s3-0188 “undo the last 2 changes” (0.986) |
| value (fill,layer) | 1 | 20.0% | s3-0002 “put a pale blue rectangle behind everything as a background panel” (0.975) |
| value (outline) | 1 | 20.0% | s3-0354 “make the outline of check orange” (0.985) |
| value (property) | 1 | 20.0% | s3-0358 “what is the outline color of process” (0.989) |

All:

| id | text | kind | gold | read | differ |
|---|---|---|---|---|---|
| s3-0002 | put a pale blue rectangle behind everything as a background panel | executed_wrong | {"action":"create","shape":"rectangle","color":"blue","fill":"light","layer":"background"} | {"action":"create","color":"blue","shape":"rectangle"} | fill: ∅ / light; layer: ∅ / background |
| s3-0062 | undo twice then make start blue | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| s3-0188 | undo the last 2 changes | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| s3-0354 | make the outline of check orange | executed_wrong | {"action":"set","target":"check","outline":"orange"} | {"action":"set","color":"orange","target":"check"} | outline: ∅ / orange |
| s3-0358 | what is the outline color of process | executed_wrong | {"ask":"property","target":"process","property":"outline"} | {"ask":"property","property":"color","target":"process"} | property: color / outline |

### short3s_test, Rules: 90 (50 wrong, 40 extra)

| first cause (by rule) | n | share | examples |
|---|---|---|---|
| extra that overlaps a gold request (cut or action) | 35 | 38.9% | s3-0003 “put the copy below done” (no conf); s3-0008 “can you add the word "approved" next to the arrow going from Check to Done” (no conf); s3-0071 “check higher than done” (no conf) |
| name or reference (name) | 9 | 10.0% | s3-0025 “draw circle Hub center” (no conf); s3-0037 “add an orange triangle Warn above Done” (no conf); s3-0109 “add circle X at 100,100 and circle Y at 700,100” (no conf) |
| name or reference (target) | 9 | 10.0% | s3-0135 “label start "begin" and done "end"” (no conf); s3-0159 “kill the circle I just made” (no conf); s3-0266 “make it a star” (no conf) |
| extra outside every gold request | 5 | 5.6% | s3-0073 “no wait, put it back like before” (no conf); s3-0156 “make start purple, process purple and check purple” (no conf); s3-0232 “i need one more rectangle, call it Report” (no conf) |
| value (shape,label) | 4 | 4.4% | s3-0020 “put a big heading at the top saying Onboarding v2” (no conf); s3-0093 “make a timeline with Start Process Check Done and add a title Roadmap” (no conf); s3-0111 “add a note under Done: needs review” (no conf) |
| name or reference (from,to) | 3 | 3.3% | s3-0025 “connect Hub to Start Process Check Done” (no conf); s3-0146 “connect Api to Db” (no conf); s3-0208 “if not connect them” (no conf) |
| name or reference (to) | 3 | 3.3% | s3-0109 “join them” (no conf); s3-0252 “connect Process to both” (no conf); s3-0261 “connect Check to Fail with label "no"” (no conf) |
| value (position) | 3 | 3.3% | s3-0246 “move done all the way to the right side” (no conf); s3-0409 “move the title to the left” (no conf); s3-0452 “move process and check to the right side” (no conf) |
| value (arrow) | 2 | 2.2% | s3-0431 “connect process to done, no arrow, gray” (no conf); s3-0434 “link Done to Check, dotted, both directions” (no conf) |
| value (items) | 2 | 2.2% | s3-0088 “add a cycle Plan, Do, Review and connect Done to Plan” (no conf); s3-0263 “draw a venn with two circles A and B” (no conf) |
| name or reference (from) | 1 | 1.1% | s3-0037 “link Warn to Done dashed” (no conf) |
| name or reference (label) | 1 | 1.1% | s3-0083 “process no label” (no conf) |
| name or reference (target,name) | 1 | 1.1% | s3-0446 “rename the copy Process2” (no conf) |
| value (about) | 1 | 1.1% | s3-0138 “is it possible to export as png” (no conf) |
| value (at) | 1 | 1.1% | s3-0169 “add a gold triangel at 200 300” (no conf) |
| value (count,layout) | 1 | 1.1% | s3-0166 “add a 3 by 3 grid of small squares” (no conf) |
| value (count) | 1 | 1.1% | s3-0188 “undo the last 2 changes” (no conf) |
| value (fill,layer) | 1 | 1.1% | s3-0002 “put a pale blue rectangle behind everything as a background panel” (no conf) |
| value (layout) | 1 | 1.1% | s3-0268 “add a row of 5 orange rectangles along the bottom edge” (no conf) |
| value (outline) | 1 | 1.1% | s3-0354 “make the outline of check orange” (no conf) |
| value (position,anchor) | 1 | 1.1% | s3-0027 “add 5 milestones as a timeline under the flow” (no conf) |
| value (quantifier) | 1 | 1.1% | s3-0229 “delete all arrows and redraw them as a chain Start Process Check Done” (no conf) |
| value (shape) | 1 | 1.1% | s3-0379 “make check diamond yellow big” (no conf) |
| value (template,items) | 1 | 1.1% | s3-0018 “process steps: Plan, Build, Test, Ship” (no conf) |
| value (topic) | 1 | 1.1% | s3-0495 “how do i put text inside a shape” (no conf) |

20 read (first by sha256 of the id):

| id | text | kind | gold | read | differ |
|---|---|---|---|---|---|
| s3-0337 | start → orange | executed_wrong | {"action":"set","target":"start","color":"orange"} | {"action":"set","from":"start","color":"orange"} | target: ∅ / start |
| s3-0434 | link Done to Check, dotted, both directions | executed_wrong | {"action":"connect","from":"done","to":"check","style":"dotted","arrow":"both"} | {"action":"connect","to":"check","from":"done","style":"dotted"} | arrow: ∅ / both |
| s3-0018 | process steps: Plan, Build, Test, Ship | executed_wrong | {"action":"create","template":"process","items":"plan,build,test,ship"} | {"action":"create","target":"process"} | template: ∅ / process; items: ∅ / plan,build,test,ship |
| s3-0266 | rename Done to End and make it a star | executed_wrong | {"action":"set","target":"end","shape":"star"} | {"action":"set","shape":"star","target":"done"} | target: done / end |
| s3-0151 | everything is too spread out, tighten it | extra_executed | - | {"action":"respace","comparison":"smaller","target":"mention(quantifier=all)"} | - |
| s3-0188 | undo the last 2 changes | executed_wrong | {"action":"undo","count":"2"} | {"action":"undo"} | count: ∅ / 2 |
| s3-0083 | process no label | executed_wrong | {"action":"label","target":"process","label":""} | {"action":"label","label":"no","target":"process"} | label: no /  |
| s3-0529 | call the start to process link begin | extra_executed | - | {"action":"rename","name":"process","target":"start"} | - |
| s3-0020 | put a big heading at the top saying Onboarding v2 | executed_wrong | {"action":"create","shape":"text","label":"onboarding v2","size":"large","position":"top"} | {"action":"create","position":"top","size":"large"} | shape: ∅ / text; label: ∅ / onboarding v2 |
| s3-0002 | put a pale blue rectangle behind everything as a background panel | executed_wrong | {"action":"create","shape":"rectangle","color":"blue","fill":"light","layer":"background"} | {"action":"create","shape":"rectangle","color":"blue"} | fill: ∅ / light; layer: ∅ / background |
| s3-0300 | give me a white hexagon with a red border | extra_executed | - | {"action":"set","outline":"red","shape":"hexagon","color":"white"} | - |
| s3-0452 | move process and check to the right side | executed_wrong | {"action":"move","target":"process,check","position":"right"} | {"action":"move","target":"process,check"} | position: ∅ / right |
| s3-0262 | text on the check to done arrow? | extra_executed | - | {"ask":"describe","target":"check,done"} | - |
| s3-0520 | could u make Start a little smaller | extra_executed | - | {"ask":"describe","size":"small","target":"start"} | - |
| s3-0323 | how do i add a title? add one saying Overview | executed_wrong | {"action":"create","shape":"text","label":"overview"} | {"action":"create"} | shape: ∅ / text; label: ∅ / overview |
| s3-0331 | process sits to the left of check | extra_executed | - | {"action":"move","position":"leftof","anchor":"check","target":"process"} | - |
| s3-0290 | rename process to Build and check to Test | executed_wrong | {"action":"rename","target":"check","name":"test"} | {"action":"rename","name":"test","target":"process,check"} | target: process,check / check |
| s3-0339 | make the spacing between all shapes even | extra_executed | - | {"action":"set","target":"mention(quantifier=all)"} | - |
| s3-0166 | add a 3 by 3 grid of small squares | executed_wrong | {"action":"create","count":"9","shape":"square","size":"small","layout":"grid"} | {"action":"create","distance":"3","count":"3","shape":"square","size":"small"} | count: 3 / 9; layout: ∅ / grid |
| s3-0109 | add circle X at 100,100 and circle Y at 700,100 then join them | executed_wrong | {"action":"create","shape":"circle","name":"x","at":"100,100"} | {"action":"create","at":"100,100","shape":"circle"} | name: ∅ / x |

### r2b, VSS-BERT: 0 (0 wrong, 0 extra)

### r2b, VSS: 0 (0 wrong, 0 extra)

### r2b, SOP-BERT: 0 (0 wrong, 0 extra)

### r2b, Rules: 0 (0 wrong, 0 extra)

## 3. The tabs against each other (gold requests, `cost`)

### V

| form | tab | VSS-BERT held, tab executed right | tab held, VSS-BERT executed right |
|---|---|---|---|
| connect | VSS | 1 | 0 |
| create | VSS | 23 | 0 |
| delete | VSS | 4 | 0 |
| move | VSS | 79 | 0 |
| set | VSS | 6 | 0 |
| connect | SOP-BERT | 1 | 0 |
| create | SOP-BERT | 21 | 0 |
| delete | SOP-BERT | 0 | 73 |
| move | SOP-BERT | 0 | 52 |
| set | SOP-BERT | 5 | 0 |

### t1s

| form | tab | VSS-BERT held, tab executed right | tab held, VSS-BERT executed right |
|---|---|---|---|
| arrow_label | VSS | 0 | 0 |
| arrow_style | VSS | 1 | 5 |
| arrow_unlabel | VSS | 0 | 0 |
| at_xy | VSS | 0 | 14 |
| connect | VSS | 1 | 24 |
| count_arrows | VSS | 1 | 0 |
| create | VSS | 26 | 18 |
| delete | VSS | 2 | 49 |
| every_arrow | VSS | 0 | 0 |
| free_text | VSS | 0 | 18 |
| layout_op | VSS | 6 | 0 |
| move | VSS | 63 | 1 |
| outline_create | VSS | 0 | 0 |
| outline_q | VSS | 0 | 0 |
| outline_set | VSS | 0 | 0 |
| redo | VSS | 9 | 4 |
| set | VSS | 14 | 1 |
| size_desc | VSS | 0 | 0 |
| tpl_count | VSS | 0 | 0 |
| tpl_items | VSS | 0 | 0 |
| undo | VSS | 0 | 24 |
| undo_count | VSS | 0 | 0 |
| arrow_label | SOP-BERT | 0 | 0 |
| arrow_style | SOP-BERT | 1 | 0 |
| arrow_unlabel | SOP-BERT | 0 | 0 |
| at_xy | SOP-BERT | 0 | 7 |
| connect | SOP-BERT | 1 | 0 |
| count_arrows | SOP-BERT | 7 | 0 |
| create | SOP-BERT | 20 | 0 |
| delete | SOP-BERT | 2 | 65 |
| every_arrow | SOP-BERT | 0 | 0 |
| free_text | SOP-BERT | 0 | 0 |
| layout_op | SOP-BERT | 12 | 0 |
| move | SOP-BERT | 3 | 49 |
| outline_create | SOP-BERT | 0 | 0 |
| outline_q | SOP-BERT | 0 | 0 |
| outline_set | SOP-BERT | 0 | 0 |
| redo | SOP-BERT | 32 | 0 |
| set | SOP-BERT | 9 | 0 |
| size_desc | SOP-BERT | 0 | 0 |
| tpl_count | SOP-BERT | 0 | 0 |
| tpl_items | SOP-BERT | 0 | 0 |
| undo | SOP-BERT | 2 | 0 |
| undo_count | SOP-BERT | 0 | 0 |

### short3s_test

| form | tab | VSS-BERT held, tab executed right | tab held, VSS-BERT executed right |
|---|---|---|---|
| null | VSS | 39 | 45 |
| null | SOP-BERT | 28 | 23 |

### r2b

| form | tab | VSS-BERT held, tab executed right | tab held, VSS-BERT executed right |
|---|---|---|---|
| connect | VSS | 1 | 0 |
| create | VSS | 7 | 0 |
| delete | VSS | 2 | 0 |
| move | VSS | 69 | 0 |
| set | VSS | 3 | 0 |
| connect | SOP-BERT | 1 | 0 |
| create | SOP-BERT | 7 | 0 |
| delete | SOP-BERT | 0 | 61 |
| move | SOP-BERT | 0 | 39 |
| set | SOP-BERT | 3 | 0 |

## 4. The spell checker: t1raw (the 70 rows as written) against t1s (as the demo reads them)

| reader | level | right (raw / spelled) | wrong (raw / spelled) | held right | missed |
|---|---|---|---|---|---|
| VSS-BERT | all | 63 / 61 | 8 / 11 | 0 / 0 | 0 / 0 |
| VSS-BERT | cost | 41 / 35 | 1 / 0 | 22 / 26 | 0 / 0 |
| VSS | all | 59 / 59 | 6 / 9 | 0 / 0 | 6 / 4 |
| VSS | cost | 43 / 43 | 0 / 0 | 16 / 16 | 6 / 4 |
| SOP-BERT | all | 63 / 61 | 7 / 9 | 0 / 0 | 0 / 0 |
| SOP-BERT | cost | 38 / 34 | 0 / 0 | 25 / 27 | 0 / 0 |
| Rules | all | 70 / 68 | 0 / 2 | 0 / 0 | 0 / 0 |
| Rules | cost | 70 / 68 | 0 / 2 | 0 / 0 | 0 / 0 |


---

# Reading (step S8's analysis; this is a reading of the tables and examples above by the implementing agent, NOT computation)

Sources: the sections above (all 48 / 37 / 56 executed-wrong requests of t1s and the 5 / 7 / 5 of short3s test were read in full, since each is 60 or fewer; the
Rules' 90 on short3s test are classified by rule and the first 20 listed), plus one extra count made for this reading: a scan of the 23 training folders
(same list as `apply_gates.mjs trainingIndex`) for the three forms below (command in the report; not part of the computed evidence).

## Held but right (VSS-BERT)
- **V (117 of 734, 15.9%)**: situation `agree` 113 (96.6%), `disagree` 4. Reason group (CC.reasons) the same split. The first `top_pulls` feature is `n_words` in 93 (79.5%),
  `none_p_min` 10, `agree` 4, `cut_start` 4, `n_roles` 4, `tag_all_min` 2. By the plan's rule 101 are "agree with a size / cut / word pull" and 12 "agree with another pull".
  The executing reader's own group is `prior` for 73.5% (the act's prior: `move` and `delete` are rarely right on the calibration data) and `value` for 17% (a colour or shape
  value of a create). By form (section 3): the VSS tab executes right 79 moves, 23 creates, 6 sets, 4 deletes that VSS-BERT held; the SOP-BERT tab holds more than VSS-BERT on delete (73) and move (52).
  The held requests are short (3-4 words: "move Castle right", "add a black circle"): the confidence loses on the word-count signal.
  **Where it sits: calibration** (the percentile tables of `combined.json` were fitted on messages of 5-30 words; the 4 `disagree` cases, "move Auth left" with a confidence of 0.57-0.78, are the model reading a name as another word).
- **Cause hypothesis of section 1: confirmed on V** (most frequent situation `agree`, 96.6%; most frequent first pull `n_words`, a word-count signal). **Not confirmed on t1s** (all forms, narrated):
  `agree` 39.5%, `sop_only` 38.5% (arrow label / restyle forms: "label the line from Queue to Auth", reason group `action`: SOP-BERT and VSS read different actions) and `disagree` 21.8%; the first pull is the `agree` input itself in 60.3%.
  On short3s test: `sop_only` 37.6%, `agree` 37.0%, `disagree` 20.8%, `vss_only` 4.6% (long and varied messages: the cut and the disagreement dominate).
  On r2b (replication of V): `agree` 98.8% (82 of 83), the same picture as V.
- The spell checker puts 26 of the 504 held-right requests of t1s into "our code" (the text changed before the readers read it).

## Executed wrong and extras (all read)
- **t1s, VSS-BERT, 48 wrong, 0 extras, all with confidence 0.949-0.988 (checked on the rows).** Three forms explain all 48 (the same forms, with the same confidence, appear in SOP-BERT's 56 and VSS's 37):
  1. **"what's the border colour / outline colour of X" read as `property=color` instead of `property=outline`**: 30 of 48 (VSS: 31 of 37; SOP-BERT: 44 of 56). Short3 test shows the same error on its own annotation gold: s3-0358 "what is the outline color of process" (VSS-BERT 0.980, wrong), s3-0354 "make the outline of check orange" read as a colour change (0.981).
  2. **undo / redo with a count dropped**: "undo that twice", "undo 5 times", "redo four times": 9 of 48 (SOP-BERT 6); short3 test: s3-0062 "undo twice", s3-0188 "undo the last 2 changes" (0.977, 0.969).
  3. **a size word in a description dropped**: "erase the little squares", "erase the giant triangles", "move the little diamonds right" (target without `size=small`), "how many big diamonds are there" (count without `size=large`): 9 of 48; short3 test: s3-0293 "trash the small squares" (0.960).
- **Where it sits: data.** The scan of the 23 training folders finds: 0 questions `ask=property property=outline` (361 `property=color`, 189 label, 180 size, 143 position, 109 shape); 0 `undo` or `redo` with a count (441 and 308 without); 0 `delete` whose target description carries a `size=` filter (835 delete descriptions without one). The Rules read all three forms (they are in the Rules' grammar, so t1's gold has them), the learned readers never saw them. The confidence cannot flag a form the model has no signal that it is missing: all three readers are confidently wrong on it. This is the plan's follow-up F-C (the cause is data; a fix is training data for these forms, not a gate change), and note 2 is a convention question as well: `gen_rules_cover.py` records that the conventions give undo no count while the Rules do, so the t1 gold (the Rules' reading) and the label conventions disagree there.
- **short3s test**: VSS-BERT 5 wrong (the forms above: 2 count, 1 size filter, 1 outline value, 1 outline property), none extra. VSS (tab) 5 wrong + 2 extra executed: s3-0032 "distribute horizontally" (target filled with every name instead of "all": an agreement-normalisation difference, the gold is the annotation's `mention(quantifier=all)`), s3-0266 "rename Done to End and make it a star" (target `done`, gold `end`: a reference to the renamed shape), s3-0498 (target missing), the outline property again, the help question s3-0236 (`about` dropped), and two extras (s3-0131 "done on top, check smaller", s3-0336 "start at the left": the cut). SOP-BERT 5 wrong.
- **r2b and V: 0 wrong, 0 extras for every reader.** The bare core commands (the Rules' grammar, the readers' training grammar) are read right 100% at `all`.
- **Rules on short3s test: 90 (50 wrong, 40 extra)**, classified: 35 extras overlapping a gold request (the Rules cut a request in two or read an extra), 9 + 9 + 3 name or reference, 5 extras outside every request, value (shape,label) 4 ... Reported as the Rules' behaviour on annotation gold; these are not VSS-BERT results.

## The tabs against each other
- On V and r2b the VSS tab (conf 0.909 threshold, with the Rules' vote as an input: 99.5% of V done right) executes what VSS-BERT holds; the SOP-BERT tab (0.955) holds more than VSS-BERT (it loses on delete and move). The Rules' vote makes this a statement about those tabs, not about confidence quality (plan section 2).
- On short3s test (no Rules-gold effect) the two directions are close: VSS tab executes right 39 that VSS-BERT held and VSS-BERT executes right 45 that the VSS tab held; SOP-BERT tab 28 and 23. The paired difference of the cost score is not above 0 (D not triggered).

## The spell checker (t1raw against t1s, 70 rows)
- It costs a little: Rules at `all` 70 -> 68 right (2 wrong: st1-00772 and st1-01420, tpl_items rows where the list item "Epilogue" was corrected to "Prologue", a canvas name; both `span_lost`), VSS-BERT at `all` 63 -> 61 right, wrong 8 -> 11; at `cost` held right 22 -> 26. The cause is our code (`spell.js` changes words the Rules and the readers read correctly; the two Rules errors are a typed name turned into a canvas name). Reported, not fixed (plan Q4).
