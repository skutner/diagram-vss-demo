"""test_label_arms.py: the row side of the label arms L1 and L2 (MODERNBERT_PARITY_PLAN.md) on a fixture folder, through the real make_roles.py and roles_roundtrip.py.
Each check fails on a defect:
  - an overlay line fixes the named wire of the named message only (not the other wire of that message, not the same span in another message);
  - a scale the overlay adds is on the head implied:scale and not tagged; a written scale ("by 1.5") keeps its tag and has no value on the head; the head's values are
    the unwritten scales of the training rows only;
  - an unknown id, a wire that does not exist, a wire that is not a resize, one that has a scale already, a repeated line, LABEL_FIXES without IMPLIED_SCALE: the run stops;
  - NUM_WORDS=table tags "forty five" for 45 and the reader says number_words_from; the Python and JavaScript tables are equal;
  - roles_roundtrip.py silent(): an implied value that differs from the gold, or a scale both tagged and on the head, is a silent wrong label; the right one is not;
  - make_data.py reads a folder nl_p* from its opus/ labels only;
  - build_arm_data.sh refuses the test sets as training data.
  python3 training/neural/parity/test_label_arms.py"""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__)); NEURAL = os.path.dirname(HERE); REPO = os.path.dirname(os.path.dirname(NEURAL))
sys.path.insert(0, NEURAL)
fails = 0


def check(name, ok, detail=""):
    global fails
    print(("ok   " if ok else "FAIL ") + name + ("" if ok else "  " + str(detail)[:600]))
    fails += not ok


W = lambda span, args, typ="command": {"span": span, "trigger": span.split()[0], "type": typ, "args": args}
MSGS = [
    {"id": "fx-1", "text": "Shrink Box and make Ball bigger.", "names": ["Box", "Ball"], "wires": [W("Shrink Box", {"action": "resize", "target": "Box"}), W("make Ball bigger", {"action": "resize", "target": "Ball"})]},
    {"id": "fx-2", "text": "Shrink Box", "names": ["Box"], "wires": [W("Shrink Box", {"action": "resize", "target": "Box"})]},
    {"id": "fx-3", "text": "Scale Box by 1.5", "names": ["Box"], "wires": [W("Scale Box by 1.5", {"action": "resize", "target": "Box", "scale": "1.5"})]},
    {"id": "fx-4", "text": "make Ball twice as big", "names": ["Ball"], "wires": [W("make Ball twice as big", {"action": "resize", "target": "Ball"})]},
    {"id": "fx-5", "text": "Move Box forty five px left", "names": ["Box"], "wires": [W("Move Box forty five px left", {"action": "move", "target": "Box", "direction": "left", "distance": 45})]},
    {"id": "fx-6", "text": "Make Box red", "names": ["Box"], "wires": [W("Make Box red", {"action": "set", "target": "Box", "color": "red"})]},
]
FIX = [{"id": "fx-1", "wire": 0, "scale": 0.67, "why": "shrink"}, {"id": "fx-4", "wire": 0, "scale": 2, "why": "twice"}]
tmp = tempfile.mkdtemp(prefix="label-arms-")
fx = os.path.join(tmp, "fx"); os.makedirs(fx)
with open(os.path.join(fx, "msg_01.jsonl"), "w") as f: f.write("".join(json.dumps(m) + "\n" for m in MSGS))
open(os.path.join(tmp, "empty_ids.txt"), "w").close()
DRIVER = """import sys, os; sys.path.insert(0, sys.argv[1]); import make_data as MD, make_roles as MR
MD.DIRS[:] = [sys.argv[2]]; MD.SAMPLE_DIRS[:] = []; MR.LABEL_FIX_DIRS[:] = []
sys.argv = ["make_roles.py", "--all", "--out", sys.argv[3], "--sample-ids", sys.argv[4]]; MR.main()"""


def build(name, env, fixes=FIX):
    out = os.path.join(tmp, name); path = os.path.join(tmp, name + ".jsonl")
    with open(path, "w") as f: f.write("".join(json.dumps(x) + "\n" for x in fixes))
    e = {k: v for k, v in os.environ.items() if k not in ("NUM_WORDS", "LABEL_FIXES", "IMPLIED_SCALE", "EXTRA_DIRS")}
    e.update({k: (path if v == "FIXES" else v) for k, v in env.items()})
    r = subprocess.run([sys.executable, "-B", "-c", DRIVER, NEURAL, fx, out, os.path.join(tmp, "empty_ids.txt")], env=e, capture_output=True, text=True)
    rows = [json.loads(l) for l in open(os.path.join(out, "train.jsonl"))] if r.returncode == 0 else []
    R = json.load(open(os.path.join(out, "reader.json"))) if r.returncode == 0 else {}
    return r, rows, R


def row(rows, mid, span):
    return next(x for x in rows if x["id"] == mid and x["text"] == span)


# 1. the overlay and the implied head
r, rows, R = build("l2", {"LABEL_FIXES": "FIXES", "IMPLIED_SCALE": "1"})
check("L2 build runs", r.returncode == 0, r.stderr)
if r.returncode == 0:
    a, b, c = row(rows, "fx-1", "Shrink Box"), row(rows, "fx-1", "make Ball bigger"), row(rows, "fx-2", "Shrink Box")
    check("the fix lands on the named wire of the named row", a["gold"].get("scale") == "0.67" and a["classes"].get("implied:scale") == "0.67", a)
    check("the other wire of that message is untouched", "scale" not in b["gold"] and "implied:scale" not in b["classes"], b)
    check("the same span in another message is untouched", "scale" not in c["gold"] and "implied:scale" not in c["classes"], c)
    check("an added scale is not tagged", not any(t.endswith("-scale") for t in a["tags"]), a["tags"])
    w = row(rows, "fx-3", "Scale Box by 1.5")
    check("a written scale keeps its tag", [t for t in w["tags"] if t.endswith("-scale")][:1] == ["B-scale"], w["tags"])
    check("a written scale is not on the implied head", "implied:scale" not in w["classes"], w["classes"])
    t = row(rows, "fx-4", "make Ball twice as big")
    check('"twice" is not tagged as scale (co-occurrence does not tag a scale): on the head', t["classes"].get("implied:scale") == "2" and not any(x.endswith("-scale") for x in t["tags"]), t)
    head = dict(R["classes"]).get("implied:scale")
    check("the head's values are the unwritten scales of the training rows", head == ["none", "0.67", "2"], head)
    check("resize reads scale (act_keys)", "scale" in R["act_keys"]["resize"], R["act_keys"]["resize"])
    cov = json.load(open(os.path.join(tmp, "l2", "coverage.json")))
    check("coverage counts the overlay and the head", cov["label_fixes"]["applied to this data"] == 2 and cov["implied"]["scale"]["tagged (written)"] == 1, cov.get("label_fixes"))
    # roles_roundtrip.py silent() on these rows
    env = dict(os.environ, IMPLIED_SCALE="1"); env.pop("LABEL_FIXES", None); env.pop("NUM_WORDS", None)
    probe = """import json, sys; sys.path.insert(0, sys.argv[1]); import roles_roundtrip as RT, make_roles as MR
R = json.load(open(sys.argv[2])); rows = [json.loads(l) for l in open(sys.argv[3])]; LEG = MR.legend(); RT.MR_DKEY.update({k.lower(): k for k in LEG})
a = next(x for x in rows if x["id"] == "fx-1" and x["text"] == "Shrink Box"); w = next(x for x in rows if x["id"] == "fx-3")
bad = json.loads(json.dumps(a)); bad["classes"]["implied:scale"] = "2"
both = json.loads(json.dumps(w)); both["classes"]["implied:scale"] = "1.5"; R2 = json.loads(json.dumps(R)); dict(R2["classes"])["implied:scale"].append("1.5")
none = json.loads(json.dumps(a)); del none["classes"]["implied:scale"]
print(json.dumps([RT.silent(a, R, LEG, R["number_words"]), RT.silent(w, R, LEG, R["number_words"]), RT.silent(bad, R, LEG, R["number_words"]), RT.silent(both, R2, LEG, R["number_words"]), RT.silent(none, R, LEG, R["number_words"])]))"""
    p = subprocess.run([sys.executable, "-B", "-c", probe, NEURAL, os.path.join(tmp, "l2", "reader.json"), os.path.join(tmp, "l2", "train.jsonl")], env=env, capture_output=True, text=True)
    s = json.loads(p.stdout) if p.returncode == 0 else None
    check("silent(): the right implied and tagged rows are clean", s and s[0] == [] and s[1] == [], s or p.stderr)
    check("silent(): an implied value other than the gold is a silent wrong label", s and any("implied value differs" in x for x in s[2]), s)
    check("silent(): a scale both tagged and on the head is a silent wrong label", s and any("both tagged and on the implied head" in x for x in s[3]), s)
    check("silent(): an unwritten scale with no head value is a silent wrong label", s and any("neither tagged nor on the implied head" in x for x in s[4]), s)

    # roles_roundtrip.mjs compares scale under the switch: the decoded fx-1 against its gold, right as built, wrong when the head's target is another scale
    mk = """import json, sys; sys.path.insert(0, sys.argv[1]); import roles_roundtrip as RT, make_roles as MR
R = json.load(open(sys.argv[2])); rows = [json.loads(l) for l in open(sys.argv[3])]; m = json.loads(sys.argv[4]); flip = sys.argv[5] == "1"
mine = [x for x in rows if x["id"] == m["id"]]; out = []
for wi, r in enumerate(mine):
    ct = RT.class_targets(r, R["classes"])
    if flip and "implied:scale" in r["classes"]: ct[[k for k, _ in R["classes"]].index("implied:scale")] = dict(R["classes"])["implied:scale"].index("2")
    out.append({"text": r["text"], "words": r["words"], "tags": r["tags"], "act": r["act"], "ct": ct, "wi": wi})
ws, tg = MR.cut_tags(m["text"], [w["span"] for w in m["wires"]])
print(json.dumps({"id": m["id"], "text": m["text"], "names": m["names"], "wires": m["wires"], "cut": tg, "words": [w[0] for w in ws], "rows": out}))"""
    fx1 = json.loads(json.dumps(MSGS[0])); fx1["wires"][0]["args"]["scale"] = "0.67"
    def rt(flip, switch):
        msg = subprocess.run([sys.executable, "-B", "-c", mk, NEURAL, os.path.join(tmp, "l2", "reader.json"), os.path.join(tmp, "l2", "train.jsonl"), json.dumps(fx1), "1" if flip else "0"], env=env, capture_output=True, text=True)
        mi, mo = os.path.join(tmp, "rt_in.jsonl"), os.path.join(tmp, "rt_out.jsonl"); open(mi, "w").write(msg.stdout)
        e = dict(os.environ); e.pop("IMPLIED_SCALE", None)
        if switch: e["IMPLIED_SCALE"] = "1"
        q = subprocess.run(["node", os.path.join(NEURAL, "roles_roundtrip.mjs"), os.path.join(tmp, "l2", "reader.json"), mi, mo], env=e, capture_output=True, text=True)
        return json.loads(open(mo).read().splitlines()[0])["gold"] if q.returncode == 0 else q.stderr + msg.stderr
    g = rt(False, True)
    check("roles_roundtrip.mjs, IMPLIED_SCALE=1: the implied scale decodes back right", isinstance(g, list) and [x["o"] for x in g] == ["right", "right"], g)
    g = rt(True, True)
    check("roles_roundtrip.mjs, IMPLIED_SCALE=1: a head trained on another scale is wrong on scale", isinstance(g, list) and g[0]["o"] == "wrong" and g[0]["miss"] == [["scale", "2", "0.67"]], g)
    g = rt(True, False)
    check("roles_roundtrip.mjs without the switch does not compare scale (bench-canon.js skips it)", isinstance(g, list) and g[0]["o"] == "right", g)

# 2. bad overlays stop the run
for name, fixes, env, want in [
        ("unknown id", [{"id": "fx-404", "wire": 0, "scale": 0.67, "why": "x"}], {"LABEL_FIXES": "FIXES", "IMPLIED_SCALE": "1"}, "unknown id 'fx-404'"),
        ("no such wire", [{"id": "fx-1", "wire": 2, "scale": 0.67, "why": "x"}], {"LABEL_FIXES": "FIXES", "IMPLIED_SCALE": "1"}, "no wire 2"),
        ("not a resize", [{"id": "fx-6", "wire": 0, "scale": 0.67, "why": "x"}], {"LABEL_FIXES": "FIXES", "IMPLIED_SCALE": "1"}, "is not a resize"),
        ("already a scale", [{"id": "fx-3", "wire": 0, "scale": 0.67, "why": "x"}], {"LABEL_FIXES": "FIXES", "IMPLIED_SCALE": "1"}, "already has scale"),
        ("fixed twice", FIX + FIX[:1], {"LABEL_FIXES": "FIXES", "IMPLIED_SCALE": "1"}, "fixed twice"),
        ("a key missing", [{"id": "fx-1", "wire": 0, "scale": 0.67}], {"LABEL_FIXES": "FIXES", "IMPLIED_SCALE": "1"}, "the keys must be"),
        ("without IMPLIED_SCALE", FIX, {"LABEL_FIXES": "FIXES"}, "needs IMPLIED_SCALE=1")]:
    r, _, _ = build("bad", env, fixes)
    check(f"overlay {name}: the run stops and says so", r.returncode != 0 and want in r.stderr, (r.returncode, r.stderr[-300:]))

# 3. the switches off: no head, no fix; NUM_WORDS=table
r, rows, R = build("off", {})
check("switches off: no implied head, no scale added", r.returncode == 0 and not any(k.startswith("implied:") for k, _ in R["classes"]) and "scale" not in row(rows, "fx-1", "Shrink Box")["gold"], r.stderr)
check("switches off: no number_words_from", r.returncode == 0 and "number_words_from" not in R)
r, rows, R = build("l1", {"NUM_WORDS": "table"})
m = row(rows, "fx-5", "Move Box forty five px left") if r.returncode == 0 else {}
check('NUM_WORDS=table: "forty five" tagged for distance 45', m.get("tags", [])[2:4] == ["B-distance", "I-distance"], m.get("tags"))
check("NUM_WORDS=table: reader says number_words_from table and holds the table", R.get("number_words_from") == "table" and R.get("number_words", {}).get("forty") == "40" and "one" not in R.get("number_words", {}), R.get("number_words"))
import make_roles as MR
src = open(os.path.join(REPO, "docs", "js", "neural.js"), encoding="utf8").read()
js = lambda name: {k: int(v) for k, v in re.findall(r"(\w+): (\d+)", re.search(r"const " + name + r" = \{([^}]*)\}", src).group(1))}
check("the number table: make_roles.py == neural.js", js("NUM_UNITS_T") == MR.NUM_UNITS and js("NUM_TENS_T") == MR.NUM_TENS and js("NUM_DIGIT_T") == MR.NUM_DIGIT)
check("table_value: forty five 45, forty - five 45, two hundred 200, one None", [MR.table_value(x) for x in ("forty five", "forty - five", "two hundred", "one")] == [45, 45, 200, None])

# 4. make_data.py reads nl_p* from opus/ only
import make_data as MD
nl = os.path.join(tmp, "nl_p9_test"); os.makedirs(os.path.join(nl, "opus")); os.makedirs(os.path.join(nl, "gpt")); os.makedirs(os.path.join(nl, "texts"))
row_ = {"id": "nl-1", "domain": "x", "kind": "short", "setup": "@c1 command action=create shape=circle name=A", "text": "shrink A", "wires": [W("shrink A", {"action": "resize", "target": "A"})]}
for d in ("opus", "gpt"): open(os.path.join(nl, d, "batch_01.jsonl"), "w").write(json.dumps(dict(row_, id="nl-1" if d == "opus" else "nl-gpt")) + "\n")
open(os.path.join(nl, "texts", "batch_01.jsonl"), "w").write(json.dumps({k: v for k, v in row_.items() if k != "wires"}) + "\n")
got = MD.messages([nl])
check("make_data.py: an nl_p* folder is read from opus/ only", [m["id"] for m in got] == ["nl-1"] and got[0]["wires"], [m["id"] for m in got])
check("make_data.py: a folder named otherwise is read as before (no opus/)", MD.label_files(fx) and not MD.label_files(os.path.join(tmp, "nl_p_missing")))

# 5. the builder refuses test sets and bad switches before building anything
B = os.path.join(HERE, "build_arm_data.sh")
for name, args, env, want in [
        ("EXTRA_NL nl_a", ["M2s", os.path.join(tmp, "o1")], {"EXTRA_NL": "nl_a"}, "is not a folder name llm_train/nl_p*"),
        ("EXTRA_NL path to a test set", ["M2s", os.path.join(tmp, "o2")], {"EXTRA_NL": "nl_p1/../../llm_bench/nl_a"}, "is not a folder name"),
        ("EXTRA_DIRS preset", ["M2s", os.path.join(tmp, "o3")], {"EXTRA_DIRS": "llm_bench/short3"}, "EXTRA_DIRS is set"),
        ("M1 with a switch", ["M1", os.path.join(tmp, "o4")], {"WITH_L1": "1"}, "does not take WITH_L1"),
        ("L1 with L2", ["L1", os.path.join(tmp, "o5")], {"WITH_L2": "1"}, "does not take WITH_L2"),
        ("output inside the repository", ["L1", os.path.join(REPO, "tmp_arm")], {}, "inside the repository"),
        ("unknown arm", ["M9", os.path.join(tmp, "o6")], {}, "unknown arm")]:
    e = {k: v for k, v in os.environ.items() if k not in ("EXTRA_DIRS", "EXTRA_NL", "WITH_L1", "WITH_L2", "WITH_M2S")}; e.update(env)
    p = subprocess.run(["bash", B, *args], env=e, capture_output=True, text=True)
    check(f"builder refuses: {name}", p.returncode != 0 and want in p.stderr, (p.returncode, p.stderr[-300:]))
link = os.path.join(REPO, "training", "sketch", "llm_train", "nl_p_test_link_label_arms")
try:
    os.symlink(os.path.join(REPO, "training", "sketch", "llm_bench", "nl_a"), link)
    e = {k: v for k, v in os.environ.items() if k not in ("EXTRA_DIRS", "WITH_L1", "WITH_L2", "WITH_M2S")}; e["EXTRA_NL"] = os.path.basename(link)
    p = subprocess.run(["bash", B, "M2s", os.path.join(tmp, "o7")], env=e, capture_output=True, text=True)
    check("builder refuses: an nl_p* name that resolves to a test set", p.returncode != 0 and "is a test set" in p.stderr, (p.returncode, p.stderr[-300:]))
finally:
    if os.path.islink(link): os.unlink(link)
check("builder refusals built nothing", not any(os.path.exists(os.path.join(tmp, f"o{i}")) or os.path.exists(os.path.join(tmp, f"o{i}.work")) for i in range(1, 8)) and not os.path.exists(os.path.join(REPO, "tmp_arm")))

print(f"{fails} check(s) FAILED" if fails else "PASS")
sys.exit(1 if fails else 0)
