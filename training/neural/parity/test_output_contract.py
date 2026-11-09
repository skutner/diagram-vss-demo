"""test_output_contract.py: the row side of output contract diagram-reader-v2 (reports/modernbert-next-plan-2026-11-08_codex.md "Interfaces / contracts" 3,
acceptance B9-B14), with perfect labels through the REAL converter (make_roles.py --messages --output-contract diagram-reader-v2) and the REAL decoder
(roles_roundtrip.py -> roles_roundtrip.mjs -> docs/js/neural.js makeReader / formalizeJoint / gateReader, with the pinned ModernBERT preparation of
docs/model/neural/modernbert-c100). Engine effects, contradictory heads and Execute all are checked in test_output_contract.mjs. Each check fails on a defect:
  - rows: label "" -> text:label = empty and no tag; a written label -> written and its tags; an absent label -> no text class; a whitespace label ->
    written with no tag (the decoder holds it); undo / redo with a count -> act_keys undo / redo read count and "twice", "three", "3" are tagged;
    outline gold, property outline and desc:size huge are layout values; names beside a description, several descriptions, written names beside an
    unwritten reference, a third described role -> fill = unresolved, no tag and no desc value from that role; reader.json output_contract,
    text_state_keys and the text:<key> heads after every legacy head; ROLE_TOO_RICH with v2, --messages without --all or with EXTRA_DIRS: refused;
  - decoded with the ModernBERT preparation, every newly claimed representable fixture comes back EXACT (a reference or an ask does not count);
    every unrepresentable one comes back held, with its kind; the legacy contract on the same messages does not get label "" exact;
  - words: make_roles.py WORD_RE, modernbert_tokenization.words_of (the trainer's) and docs/js/neural.js wordsOf agree on realistic Unicode
    (accents, decomposed accents, CJK, emoji, digits of other scripts); over every code point of planes 0 and 1 (no surrogates) words_of equals
    JS except on code points unassigned in Python's Unicode tables (newer Unicode in node's ICU), and make_roles.py differs from JS only on those and
    on the six characters Python and JavaScript disagree are spaces (counts printed);
  - word pieces: modernbert_tokenization.prepare and makeReader's prepare give the same ids, first pieces, truncation and unreadFrom for texts
    just below, at and above 128 and 512 pieces, with multi-piece and Unicode words across the cap;
  - arm_export.contract_binding: legacy recorded, v2 needs --protocol and its heads, an unknown contract refused.
Needs the ModernBERT venv (transformers): when this Python lacks it, the script re-runs itself with $MODERNBERT_PY or
~/.cache/diagram-vss-modernbert/venv/bin/python; without either it fails (never skips).
  python3 -B training/neural/parity/test_output_contract.py"""
import json, os, subprocess, sys, tempfile, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__)); NEURAL = os.path.dirname(HERE); REPO = os.path.dirname(os.path.dirname(NEURAL))
try:
    import transformers  # noqa: F401
except ImportError:
    py = os.environ.get("MODERNBERT_PY") or os.path.expanduser("~/.cache/diagram-vss-modernbert/venv/bin/python")
    if os.path.realpath(py) == os.path.realpath(sys.executable) or not os.path.isfile(py):
        print("FAIL this test needs transformers (the ModernBERT venv); none found"); sys.exit(1)
    os.execv(py, [py, "-B", os.path.abspath(__file__)] + sys.argv[1:])
sys.path.insert(0, NEURAL); sys.path.insert(0, HERE)
import make_roles as MR
import modernbert_tokenization as MT

fails = n = 0


def check(name, ok, detail=""):
    global fails, n
    n += 1; print(("ok   " if ok else "FAIL ") + name + ("" if ok else "  " + str(detail)[:900])); fails += not ok


def W(span, args, typ="command"): return {"span": span, "trigger": span.split()[0], "type": typ, "args": args}


NAMES = ["Box", "Ball", "Goal", "Logo"]
M = lambda i, text, *wires: {"id": "ox-" + i, "text": text, "names": NAMES, "wires": list(wires)}
MSGS = [
    M("label-empty", "Remove the label from Box.", W("Remove the label from Box", {"action": "label", "target": "Box", "label": ""})),
    M("label-arrow-empty", "Remove the label of the arrow from Box to Ball.", W("Remove the label of the arrow from Box to Ball", {"action": "label", "from": "Box", "to": "Ball", "label": ""})),
    M("label-written", 'Label Box "hello big world".', W('Label Box "hello big world"', {"action": "label", "target": "Box", "label": "hello big world"})),
    M("label-none", "Label Ball none", W("Label Ball none", {"action": "label", "target": "Ball", "label": "none"})),
    M("label-emptyword", "Label Goal empty", W("Label Goal empty", {"action": "label", "target": "Goal", "label": "empty"})),
    M("label-unicode", 'Label Box "Café Über 東京 ñandú"', W('Label Box "Café Über 東京 ñandú"', {"action": "label", "target": "Box", "label": "Café Über 東京 ñandú"})),
    M("label-comma", "Label Ball 'Maria, 34'", W("Label Ball 'Maria, 34'", {"action": "label", "target": "Ball", "label": "Maria, 34"})),
    M("label-absent", "Label Box please", W("Label Box", {"action": "label", "target": "Box"})),
    M("label-space", 'Label Box "   "', W('Label Box "   "', {"action": "label", "target": "Box", "label": "   "})),
    M("undo-twice", "undo twice", W("undo twice", {"action": "undo", "count": 2})),
    M("undo-three", "undo three times", W("undo three times", {"action": "undo", "count": 3})),
    M("undo-3", "undo 3 times", W("undo 3 times", {"action": "undo", "count": 3})),
    M("undo", "undo", W("undo", {"action": "undo"})),
    M("redo-twice", "redo twice", W("redo twice", {"action": "redo", "count": 2})),
    M("outline-q", "what is the outline of Box?", W("what is the outline of Box", {"ask": "property", "target": "Box", "property": "outline"}, "question")),
    M("outline-set", "make Box's outline gold", W("make Box's outline gold", {"action": "set", "target": "Box", "outline": "gold"})),
    M("outline-create", "add a purple square with a cyan outline", W("add a purple square with a cyan outline", {"action": "create", "shape": "square", "color": "purple", "outline": "cyan"})),
    M("desc-huge", "delete the huge circles", W("delete the huge circles", {"action": "delete", "target": "mention(quantifier=all,size=huge,shape=circle)"})),
    M("move-left", "move Box left", W("move Box left", {"action": "move", "target": "Box", "direction": "left"})),
    M("move-farleft", "move Box to the far left", W("move Box to the far left", {"action": "move", "target": "Box", "position": "left"})),
    M("move-leftof", "move Box to the left of Goal", W("move Box to the left of Goal", {"action": "move", "target": "Box", "position": "leftOf", "anchor": "Goal"})),
    M("verbless", "Box left", W("Box left", {"action": "move", "target": "Box", "position": "left"})),
    M("move-dist", "move Box 40 px to the left", W("move Box 40 px to the left", {"action": "move", "target": "Box", "direction": "left", "distance": 40})),
    M("two-described", "Move the red circles below the blue square", W("Move the red circles below the blue square",
      {"action": "move", "target": "mention(color=red,shape=circle)", "position": "below", "anchor": "mention(color=blue,shape=square)"})),
    # unrepresentable: held, never substituted (a create first, so the context is not empty)
    M("mixed", "Add a circle named Hub. Delete the red square and Box.", W("Add a circle named Hub", {"action": "create", "shape": "circle", "name": "Hub"}),
      W("Delete the red square and Box", {"action": "delete", "target": "mention(color=red,shape=square),Box"})),
    M("multi", "Delete all the squares and the red triangle", W("Delete all the squares and the red triangle", {"action": "delete", "target": "mention(quantifier=all,shape=square),mention(color=red,shape=triangle)"})),
    M("partial", "Add a circle named Hub, then align it with Logo.", W("Add a circle named Hub", {"action": "create", "shape": "circle", "name": "Hub"}),
      W("align it with Logo", {"action": "align", "target": "$new,Logo"})),
    M("third-described", "Move the red circle below the blue square and right of the green triangle", W("Move the red circle below the blue square and right of the green triangle",
      {"action": "move", "target": "mention(color=red,shape=circle)", "position": "below", "anchor": "mention(color=blue,shape=square)", "position2": "rightOf", "anchor2": "mention(color=green,shape=triangle)"})),
    M("barrier", "Delete the red square and Box, then make it red, then make Ball gold.", W("Delete the red square and Box", {"action": "delete", "target": "mention(color=red,shape=square),Box"}),
      W("make it red", {"action": "set", "target": "Box", "color": "red"}), W("make Ball gold", {"action": "set", "target": "Ball", "color": "gold"})),
]
EXACT = {"label-empty": [0], "label-arrow-empty": [0], "label-written": [0], "label-none": [0], "label-emptyword": [0], "label-unicode": [0], "label-comma": [0], "label-absent": [0],
         "undo-twice": [0], "undo-three": [0], "undo-3": [0], "undo": [0], "redo-twice": [0], "outline-q": [0], "outline-set": [0], "outline-create": [0], "desc-huge": [0],
         "move-left": [0], "move-farleft": [0], "move-leftof": [0], "verbless": [0], "move-dist": [0], "two-described": [0], "mixed": [0], "partial": [0], "barrier": [2]}
HELD = {"label-space": {0: "text-state"}, "mixed": {1: "unresolved-reference"}, "multi": {0: "unresolved-reference"}, "partial": {1: "unresolved-reference"},
        "third-described": {0: "unresolved-reference"}, "barrier": {0: "unresolved-reference", 1: "depends"}}

tmp = tempfile.mkdtemp(prefix="output-contract-")
fx = os.path.join(tmp, "messages.jsonl")
with open(fx, "w", encoding="utf8") as f: f.write("".join(json.dumps(m, ensure_ascii=False) + "\n" for m in MSGS))
open(os.path.join(tmp, "empty_ids.txt"), "w").close()
BASE_ENV = {k: v for k, v in os.environ.items() if k not in ("NUM_WORDS", "LABEL_FIXES", "IMPLIED_SCALE", "EXTRA_DIRS", "ROLE_TOO_RICH", "ALSO_DIRS")}


def make_roles(out, *extra, env=None):
    e = dict(BASE_ENV, NUM_WORDS="table", **(env or {}))
    return subprocess.run([sys.executable, "-B", os.path.join(NEURAL, "make_roles.py"), "--out", out, "--sample-ids", os.path.join(tmp, "empty_ids.txt"), *extra], env=e, capture_output=True, text=True)


# ---------------------------------------------------------------- 1. the converter
r = make_roles(os.path.join(tmp, "v2"), "--all", "--messages", fx, "--output-contract", MR.V2)
check("v2 build from --messages runs", r.returncode == 0, r.stderr[-2000:])
rows = {}
for l in open(os.path.join(tmp, "v2", "train.jsonl"), encoding="utf8"): x = json.loads(l); rows.setdefault(x["id"], []).append(x)
R = json.load(open(os.path.join(tmp, "v2", "reader.json")))
row = lambda i, k=0: rows["ox-" + i][k]
tagged = lambda x, key: [w for w, t in zip(x["words"], x["tags"]) if t.endswith("-" + key)]
cls = dict((k, v) for k, v in R["classes"])
check("reader.json: output_contract and text_state_keys (the span keys of legend kind text in the rows)", R.get("output_contract") == MR.V2 and R.get("text_state_keys") == ["label"], {k: R.get(k) for k in ("output_contract", "text_state_keys")})
check("reader.json: text:label over absent / empty / written, after every legacy head", R["classes"][-1] == ["text:label", ["absent", "empty", "written"]], R["classes"][-2:])
check("reader.json: every fill head ends with unresolved", all(v == MR.FILL_V2 for k, v in R["classes"] if k.startswith("fill:")) and any(k.startswith("fill:") for k in cls), [x for x in R["classes"] if x[0].startswith("fill:")])
x = row("label-empty")
check('label "" -> text:label = empty, no tag', x["classes"].get("text:label") == "empty" and not tagged(x, "label"), x)
x = row("label-arrow-empty")
check('arrow label "" -> empty, from / to tagged', x["classes"].get("text:label") == "empty" and not tagged(x, "label") and tagged(x, "from") == ["Box"] and tagged(x, "to") == ["Ball"], x)
for i, words in (("label-written", ["hello", "big", "world"]), ("label-none", ["none"]), ("label-emptyword", ["empty"]), ("label-unicode", ["Café", "Über", "東京", "ñandú"]), ("label-comma", ["Maria", ",", "34"])):
    x = row(i); check(f"{i}: written, its words tagged", x["classes"].get("text:label") == "written" and tagged(x, "label") == words, x)
x = row("label-absent")
check("absent label: no text:label class (index 0)", "text:label" not in x["classes"] and not tagged(x, "label"), x)
x = row("label-space")
check("whitespace label: written with no tag (never empty)", x["classes"].get("text:label") == "written" and not tagged(x, "label"), x)
check("undo / redo read count (act_keys from the rows)", "count" in R["act_keys"].get("undo", []) and "count" in R["act_keys"].get("redo", []), {k: R["act_keys"].get(k) for k in ("undo", "redo")})
for i, w in (("undo-twice", ["twice"]), ("undo-three", ["three"]), ("undo-3", ["3"]), ("redo-twice", ["twice"])):
    check(f"{i}: the count's word is tagged", tagged(row(i), "count") == w, row(i))
check("layout values: outline gold and cyan, property outline, desc:size huge", {"gold", "cyan"} <= set(cls.get("outline", [])) and "outline" in cls.get("property", []) and "huge" in cls.get("desc:size", []),
      {k: cls.get(k) for k in ("outline", "property", "desc:size")})
x = row("two-described")
check("two described roles: desc: for anchor, desc2: for target", x["classes"].get("fill:anchor") == "description" and x["classes"].get("fill:target") == "description" and x["classes"].get("desc:color") == "blue" and x["classes"].get("desc2:color") == "red", x["classes"])
for i, k, key in (("mixed", 1, "target"), ("multi", 0, "target"), ("partial", 1, "target"), ("barrier", 0, "target"), ("third-described", 0, "target")):
    x = row(i, k)
    check(f"{i}: fill:{key} = unresolved, no tag and no description value from it", x["classes"].get("fill:" + key) == "unresolved" and not tagged(x, key)
          and (i == "third-described" or not any(c.startswith(("desc:", "desc2:")) for c in x["classes"])), x)
x = row("third-described")
check("third described role: anchor on desc:, anchor2 on desc2:, the third (target, REF key order) unresolved", x["classes"].get("desc:color") == "blue" and x["classes"].get("desc2:color") == "green" and x["classes"].get("fill:anchor2") == "description", x["classes"])
cov = json.load(open(os.path.join(tmp, "v2", "coverage.json")))
check("coverage: the input's hash, the text states and the unresolved roles", cov.get("messages_input", {}).get("messages") == len(MSGS) and cov["train"]["output contract"]["text states"].get("label=empty") == 2
      and sum(cov["train"]["output contract"]["unresolved roles"].values()) == 5, {k: cov.get(k) for k in ("messages_input", "output_contract")} | {"train": cov["train"].get("output contract")})
r = make_roles(os.path.join(tmp, "bad1"), "--all", "--messages", fx, "--output-contract", MR.V2, env={"ROLE_TOO_RICH": "context"})
check("v2 with ROLE_TOO_RICH: refused", r.returncode != 0 and "unset ROLE_TOO_RICH" in r.stderr, r.stderr[-300:])
r = make_roles(os.path.join(tmp, "bad2"), "--messages", fx)
check("--messages without --all: refused", r.returncode != 0 and "needs --all" in r.stderr, r.stderr[-300:])
r = make_roles(os.path.join(tmp, "bad3"), "--all", "--messages", fx, env={"EXTRA_DIRS": "llm_train/opus_train_a"})
check("--messages with EXTRA_DIRS: refused", r.returncode != 0 and "unset EXTRA_DIRS" in r.stderr, r.stderr[-300:])
r = make_roles(os.path.join(tmp, "legacy"), "--all", "--messages", fx)
RL = json.load(open(os.path.join(tmp, "legacy", "reader.json")))
check("legacy contract on the same messages: no output_contract, no text head, legacy fill vocabulary", r.returncode == 0 and "output_contract" not in RL and not any(k.startswith("text:") for k, _ in RL["classes"])
      and all(v == MR.FILL for k, v in RL["classes"] if k.startswith("fill:")), r.stderr[-500:])


# ---------------------------------------------------------------- 2. converter -> decoder with the pinned ModernBERT preparation
def roundtrip(work, *extra):
    r = subprocess.run([sys.executable, "-B", os.path.join(NEURAL, "roles_roundtrip.py"), "--work", work, "--messages", fx, *extra], env=dict(BASE_ENV, NUM_WORDS="table"), capture_output=True, text=True)
    out = {}
    if r.returncode == 0:
        for l in open(os.path.join(work, "decoded.jsonl"), encoding="utf8"): o = json.loads(l); out[o["id"]] = o
    return r, out


r, dec = roundtrip(os.path.join(tmp, "rt_v2"), "--output-contract", MR.V2, "--prep", "modernbert")
check("roles_roundtrip.py --messages --output-contract v2 --prep modernbert runs", r.returncode == 0, r.stderr[-2000:])
meta = json.load(open(os.path.join(tmp, "rt_v2", "decoded.jsonl.meta.json"))) if r.returncode == 0 else {}
check("the decoder used the pinned ModernBERT preparation (modernbert-c100 tokenizer, 128 / 512)", meta.get("prep") == "modernbert" and meta.get("tokenization") == "wordwise-bpe-prefix-space-v1"
      and meta.get("max_length") == 128 and meta.get("cut_max_length") == 512 and meta.get("tokenizer", "").endswith("modernbert-c100"), meta)
for i, js in EXACT.items():
    for j in js:
        g = dec.get("ox-" + i, {}).get("gold", [{}] * (j + 1))[j]
        check(f"exact: {i} wire {j}", g.get("o") == "right", g)
for i, hs in HELD.items():
    for j, kind in hs.items():
        g = dec.get("ox-" + i, {}).get("gold", [{}] * (j + 1))[j]
        check(f"held: {i} wire {j} ({kind}), not decoded into a running wire", g.get("o") == "held" and kind in g.get("held", []), g)
check("no extra wire runs", all(not o["extra"] or all(e.get("held") for e in o["extra"]) for o in dec.values()), [o["extra"] for o in dec.values() if o["extra"]][:3])
rtj = json.load(open(os.path.join(tmp, "rt_v2", "roundtrip.json"))) if r.returncode == 0 else {}
check("roundtrip.json records the preparation, the contract and the exact-only share", rtj.get("oracle", {}).get("output_contract") == MR.V2 and "exact_only" in rtj, {k: rtj.get(k) for k in ("oracle", "exact_only")})
r, dl = roundtrip(os.path.join(tmp, "rt_legacy"))
check("legacy contract, same messages: label \"\" is not exact (the gap v2 closes), and the mixed role is not held", r.returncode == 0 and dl["ox-label-empty"]["gold"][0]["o"] != "right" and dl["ox-mixed"]["gold"][1]["o"] != "held",
      r.stderr[-500:] if r.returncode else [dl["ox-label-empty"]["gold"][0], dl["ox-mixed"]["gold"][1]])

# ---------------------------------------------------------------- 3. words: Python and JavaScript
NODE_WORDS = """const N=require(process.argv[1]);const ts=JSON.parse(require('fs').readFileSync(0,'utf8'));
console.log(JSON.stringify(ts.map(t=>N.wordsOf(t).map(w=>[w.w,w.start,w.end]))));"""


def js_words(texts):
    r = subprocess.run(["node", "-e", "globalThis.SOPKit=require(process.argv[2]);" + NODE_WORDS, os.path.join(REPO, "docs/js/neural.js"), os.path.join(REPO, "docs/js/logic.js")],
                       input=json.dumps(texts), capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


REAL = ["Label Box \"Café Über 東京 ñandú\"", "Café au lait", "add 🙂 and 👍🏽 to Zoë's board", "naïve façade—déjà vu", "Ünïcödé ÀÉÎÕÜ", "١٢٣ ٤ and ½ and ²", "東京タワーへ移動",
        "move Ελλάδα left", "Добавь круг", "tab\there", "nbsp here", "a_b c-d e.f", "x²+y³", "Ｆｕｌｌｗｉｄｔｈ ＡＢＣ", "​zero​width"]
jw = js_words(REAL)
check("realistic Unicode: make_roles.py words = docs/js/neural.js wordsOf", all([w[0] for w in MR.words(t)] == [w[0] for w in j] for t, j in zip(REAL, jw)),
      [(t, [w[0] for w in MR.words(t)], [w[0] for w in j]) for t, j in zip(REAL, jw) if [w[0] for w in MR.words(t)] != [w[0] for w in j]][:3])
check("realistic Unicode: modernbert_tokenization.words_of = wordsOf (words and UTF-16 offsets)", all([[w["w"], w["start"], w["end"]] for w in MT.words_of(t)] == j for t, j in zip(REAL, jw)))
cps = [c for c in range(0x20000) if not 0xD800 <= c <= 0xDFFF]
texts = ["a" + chr(c) + "b" for c in cps]
jw = js_words(texts)
mt_bad = [hex(c) for c, t, j in zip(cps, texts, jw) if [[w["w"], w["start"], w["end"]] for w in MT.words_of(t)] != j]
mr_bad = [c for c, t, j in zip(cps, texts, jw) if [w[0] for w in MR.words(t)] != [w[0] for w in j]]
SPACES = {0x1C, 0x1D, 0x1E, 0x1F, 0x85, 0xFEFF}
unassigned = [c for c in mr_bad if c not in SPACES and unicodedata.category(chr(c)) == "Cn"]
other = [hex(c) for c in mr_bad if c not in SPACES and unicodedata.category(chr(c)) != "Cn"]
mt_other = [c for c in mt_bad if unicodedata.category(chr(int(c, 16))) != "Cn"]
check(f"planes 0-1 ({len(cps)} code points): modernbert_tokenization.words_of = wordsOf except on code points unassigned in Python's Unicode tables ({len(mt_bad)} such)", not mt_other, mt_other[:20])
check("planes 0-1: make_roles.py WORD_RE differs from wordsOf only on the six disputed spaces and on code points unassigned in Python "
      f"(unicodedata {unicodedata.unidata_version}); found: spaces {sorted(hex(c) for c in SPACES & set(mr_bad))}, unassigned {len(unassigned)}", not other, other[:20])
print(f"     note: make_roles.py WORD_RE vs wordsOf on planes 0-1: the disputed spaces {sorted(hex(c) for c in SPACES & set(mr_bad))}; {len(unassigned)} code points unassigned in Python's "
      f"Unicode {unicodedata.unidata_version} but letters/digits for node (e.g. {[hex(c) for c in unassigned[:6]]}); modernbert_tokenization.words_of differs from node on {len(mt_bad)} of them "
      "(the trainer and the browser would split such a text differently)")

# ---------------------------------------------------------------- 4. word pieces at 128 / 512 with the pinned ModernBERT preparation
from transformers import AutoTokenizer
TOK = os.path.join(REPO, "docs/model/neural/modernbert-c100")
tok = AutoTokenizer.from_pretrained(TOK, local_files_only=True)
NODE_PREP = """const T=require(process.argv[2]);globalThis.SOPKit=require(process.argv[4]);const N=require(process.argv[3]);const path=require('path');
(async()=>{T.env.allowRemoteModels=false;T.env.allowLocalModels=true;T.env.localModelPath=path.dirname(process.argv[5])+'/';
const tk=await T.AutoTokenizer.from_pretrained(path.basename(process.argv[5]),{local_files_only:true});
const model=()=>{};model.config={reader:{tokenization:'wordwise-bpe-prefix-space-v1',acts:['create'],tags:['O'],classes:[],max_length:128,cut:{max_length:512}}};
const r=N.makeReader(T,tk,model);const jobs=JSON.parse(require('fs').readFileSync(0,'utf8'));
console.log(JSON.stringify(jobs.map(([t,l])=>{const p=r.prepare(t,l);return {ids:p.ids,first:[...p.first.entries()],truncated:p.truncated,unreadFrom:p.unreadFrom};})));})();"""
unit = [len(tok.encode(" " + w, add_special_tokens=False)) for w in ("alpha", "Café", "東京", "ñandú")]
jobs = []
for limit in (128, 512):
    for extra in range(-3, 4):   # whole messages of n words around the cap; each "alpha" is one piece with its prefix space
        nw = limit - 2 + extra
        jobs.append((" ".join(["alpha"] * nw), limit))
        jobs.append((" ".join(["alpha"] * (nw - 3) + ["Café", "東京", "ñandú"]), limit))   # multi-piece Unicode words across the cap
        jobs.append((" ".join(["alpha"] * (nw - 2) + ["déjà-vu", "🙂"]), limit))
pr = subprocess.run(["node", "-e", NODE_PREP, "x", os.path.join(REPO, "training/laptop/node_modules/@huggingface/transformers"), os.path.join(REPO, "docs/js/neural.js"), os.path.join(REPO, "docs/js/logic.js"), TOK],
                    input=json.dumps(jobs), capture_output=True, text=True)
check("node makeReader prepare runs on the ModernBERT tokenizer", pr.returncode == 0, pr.stderr[-1500:])
if pr.returncode == 0:
    js = json.loads(pr.stdout); bad = []; seen = {128: set(), 512: set()}
    for (t, limit), j in zip(jobs, js):
        p = MT.prepare(tok, t, limit)
        py = {"ids": p["ids"], "first": [[k, v] for k, v in p["first"].items()], "truncated": p["truncated"], "unreadFrom": p["unreadFrom"]}
        if py != j: bad.append((len(t), limit, len(p["ids"]), len(j["ids"]), p["truncated"], j["truncated"]))
        seen[limit].add((len(p["ids"]) == limit, p["truncated"]))
    check(f"word pieces: Python prepare = makeReader prepare on {len(jobs)} texts around 128 and 512 (ids, first pieces, truncation, unreadFrom)", not bad, bad[:5])
    check("the boundary texts reach the cap exactly, stay under it, and truncate (both caps)", all({(True, False), (False, True)} <= seen[l] and any(not tr and not full for full, tr in seen[l]) for l in seen), seen)
    print(f"     note: pieces with the prefix space: alpha {unit[0]}, Café {unit[1]}, 東京 {unit[2]}, ñandú {unit[3]}")

# ---------------------------------------------------------------- 5. arm_export.contract_binding
import arm_export as AE
legacy_b = AE.contract_binding(RL)
check("arm_export: a legacy reader records contract legacy and a layout hash", legacy_b["output_contract"] == "legacy" and len(legacy_b["contract_sha256"]) == 64 and "protocol" not in legacy_b, legacy_b)
def refused(f):
    try: f(); return False
    except SystemExit: return True
check("arm_export: a v2 reader without --protocol is refused", refused(lambda: AE.contract_binding(R)))
b = AE.contract_binding(R, fx)
import hashlib
check("arm_export: a v2 reader binds its contract, text_state_keys, layout hash and the protocol's SHA-256", b["output_contract"] == MR.V2 and b["text_state_keys"] == ["label"]
      and b["protocol"]["sha256"] == hashlib.sha256(open(fx, "rb").read()).hexdigest(), b)
check("arm_export: the layout hash moves with the heads", AE.contract_binding(dict(R, classes=R["classes"][:-1] + [["text:label", ["absent", "empty", "written"]], ["x", ["none"]]]), fx)["contract_sha256"] != b["contract_sha256"])
check("arm_export: an unknown contract is refused", refused(lambda: AE.contract_binding(dict(R, output_contract="diagram-reader-v9"), fx)))
check("arm_export: v2 without its text heads is refused", refused(lambda: AE.contract_binding(dict(R, classes=[c for c in R["classes"] if not c[0].startswith("text:")]), fx)))
check("arm_export: v2 with a fill head lacking unresolved is refused", refused(lambda: AE.contract_binding(dict(R, classes=[[k, MR.FILL if k.startswith("fill:") else v] for k, v in R["classes"]]), fx)))

print(f"{fails} of {n} check(s) FAILED" if fails else f"PASS ({n} checks)")
sys.exit(1 if fails else 0)
