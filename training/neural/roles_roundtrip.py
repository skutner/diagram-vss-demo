"""roles_roundtrip.py: does SOP-BERT's training data turn the gold into labels the model can learn, and do those labels decode back into the
same gold in the browser? (The SOP-BERT counterpart of training/sketch/convert_check.py; ROLES_ROUNDTRIP.md has the result.)

1. The rows are built exactly as job 071 builds them: make_roles.py --all with the caller's EXTRA_DIRS (the training layout: acts, class heads,
   tags, act_keys, number words), plus --also for the folders that are not trained on (llm_bench/short3, llm_bench/fresh2/*), labelled with the
   same layout.
2. The GOLD labels of every row are taken as a perfect prediction: the act, the class target of every class head (finetune_roles.py
   Layout.class_targets, i.e. what the loss trains), the B / I / O tag of every word, and the cut tags of the whole message (make_roles.py
   cut_tags). roles_roundtrip.mjs turns them into one-hot logits of a stand-in model and runs the real decoding path of docs/js/neural.js
   (makeReader with the real tokenizer, then formalize / formalizeJoint with the shared context rule), and compares the wires with the gold in
   bench-canon form, paired as llm_score.mjs PAIR=value (as job 072 scores).
3. Every gold request that does not come back right gets the cause of its first wrong key (CAUSES below), and every row whose label states
   something other than the gold (a value trained as "none", a role trained untagged, a description trained without one of its keys, a number
   word mapped to another number, a key the layout does not learn) is counted as a SILENT wrong label: the model is trained to be confidently
   wrong there.
Per folder: the share of gold requests that round-trip, wrong, missing; the silent wrong-label share of the rows.
Under make_roles.py ROLE_TOO_RICH=context a role too rich for one description is trained as context, and counted here as the context-rule reference.
Under make_roles.py IMPLIED_SCALE=1 the rows are built with the same switches and `scale` is compared too, here and in roles_roundtrip.mjs (bench-canon.js skips it); LABEL_FIXES
applies to the gold of this comparison as it does to the rows.
--gate MIN_RT MAX_SILENT (job 071): exit 1 if a TRAINED folder's round trip is below MIN_RT % or its silent wrong-label share is above MAX_SILENT %.
Run: EXTRA_DIRS="..." python3 training/neural/roles_roundtrip.py [--work DIR] [--compare-rows ROWS_DIR] [--gate 95 1] [--md PREFIX: writes PREFIX.table]
"""
import argparse, collections, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import make_data as MD
import make_roles as MR

ALSO = ["llm_bench/short3", "llm_bench/fresh2/opus_a", "llm_bench/fresh2/opus_b", "llm_bench/fresh2/opus_c", "llm_bench/fresh2/opus_d"]
# ALSO_DIRS="<folder> ..." (relative to training/sketch; off by default): more folders checked, not trained on, labelled with the same layout
# (scenes_r3/ROOT_CAUSES.md: llm_bench/scenes_test, and llm_train/scenes_r3 when it is not in EXTRA_DIRS: the label ceiling of a layout
# trained without the scenes, the shipped model's)
ALSO = ALSO + [d for d in os.environ.get("ALSO_DIRS", "").split() if d not in ALSO]
# causes that are not in the labels: the reference the shared context rule fills (AGENTS.md: left to the reasoning layer, not a reader
# error), and the gold writing the name of a shape created earlier in the message where the decoder (as every reader) writes $new
NOT_LABEL = ("context:", "$new vs the created name")
# gold the layout cannot hold, where the decoded request is refused by the engine (asked, never executed wrong): label="" (removing a label:
# no word to tag; logic.js "What should the label say?") and the group name that is also a target ("Move Scene3 into Intake": target
# Scene3,Intake name Intake; one word takes one tag, so the target comes back as Scene3 alone and logic.js refuses a group of one shape)
ONE_WORD = "one word for two keys (the group name is also a target)"
ASKED = ('label=""', ONE_WORD)


_LAYOUT = []


def class_targets(row, classes):
    """finetune_roles.py Layout.class_targets (imported when torch is there, so a change there is what this measures; the import is tried once)"""
    if not _LAYOUT:
        try:
            from finetune_roles import Layout
            _LAYOUT.append(Layout)
        except ImportError: _LAYOUT.append(None)
    if _LAYOUT[0] is not None: return _LAYOUT[0]({"acts": [], "tags": [], "classes": classes}).class_targets(row)
    # no torch here: the same rule (a gold value spelled "none" is its own class, from index 1)
    return [vals.index(row["classes"][k], 1) if row["classes"].get(k) in vals[1:] else 0 for k, vals in classes]


def num(s):
    try: return float(s)
    except (TypeError, ValueError): return None


def mention_keys(s):
    m = re.match(r"^mention\((.*)\)$", s or "")
    return dict(kv.split("=", 1) for kv in MR.parts(m.group(1)) if "=" in kv) if m else None


def category(key, act, got, want, row, R, LEG):
    """the cause of one wrong key of a gold request (its row: the training label; R: the layout)"""
    ck = {k: v for k, v in R["classes"]}
    akeys = set(R["act_keys"].get(act, []))
    if key not in LEG: return "key not in the legend (not learned): " + key
    if key not in ck and key not in R["span_keys"]: return "key of a legend kind not learned: " + key
    if key not in akeys: return "key not read for this act (act_keys)"
    if key in MR.IMPLIED_KEYS and "implied:" + key in row["classes"]:
        return "implied value decoded differently" if row["classes"]["implied:" + key] in ck.get("implied:" + key, [])[1:] else "implied value with no class"
    if key in ck:
        g = str(row["gold"][key]) if key in row["gold"] else None
        if g is not None and g not in ck[key][1:]: return "value with no class"
        if g is not None and class_targets(row, R["classes"])[[k for k, _ in R["classes"]].index(key)] == 0: return "value 'none' trained as the absent class"
        return "class decoded differently"
    if key == "label" and want == "": return 'label=""'
    kind = LEG[key]["kind"]
    fill = row["classes"].get("fill:" + key)
    if kind == "names":
        if fill == "context" and MR.ROLE_TOO_RICH == "context" and MR.too_rich(want): return "context: a role too rich for one description (ROLE_TOO_RICH=context)"
        if fill == "context": return "context: the shared rule gives another shape" + (" (gold is a list)" if len(MR.parts(want)) > 1 else "")
        if fill == "description":
            ps = MR.parts(want); wm = [mention_keys(p) for p in ps]
            if any(x is None for x in wm): return "description mixed with names (names dropped)"
            gm = mention_keys(got)
            if gm is None: return "description decoded as no mention"
            w = wm[0]
            if len(ps) > 1: return "description: several mentions (one learned)"
            if not gm or set(gm) == {"quantifier"}: return "every shape (quantifier=all / no filter) where the gold filters"
            if set(gm) < set(w): return "description broader (a gold key dropped)"
            if set(gm) > set(w): return "description narrower (a key added)"
            return "description values differ"
        if act == "group" and key == "target" and str(row["gold"].get("name", "")).lower() in MR.parts(want) and str(row["gold"].get("name", "")).lower() not in MR.parts(got):
            return ONE_WORD
        if len(MR.parts(got)) != len(MR.parts(want)): return "list cut or merged (names)"
        if "$new" in MR.parts(got) and "$new" not in MR.parts(want) and len(MR.parts(got)) == len(MR.parts(want)): return "$new vs the created name"
        return "name tags misaligned"
    if kind == "texts": return "list cut or merged (items)" if len(MR.parts(got)) != len(MR.parts(want)) else "item texts differ"
    if kind == "number": return "number not read back"
    return "text span not read back"


GROUP = [   # the report's columns: cause -> group (first match)
    ("request dropped", lambda c, k, a: c.startswith("dropped")),
    ("act with no class", lambda c, k, a: c.startswith("act not in")),
    ("cut lost or merged the span", lambda c, k, a: c.startswith("missing")),
    ("label=\"\"", lambda c, k, a: c == 'label=""'),
    ("help topic/aspect/about", lambda c, k, a: a == "help" or k in ("topic", "aspect", "about")),
    ("template", lambda c, k, a: k in ("template", "items", "items2", "parents", "title")),
    ("count/at/outline/kind", lambda c, k, a: k in ("count", "at", "outline", "kind")),
    ("value 'none' = absent", lambda c, k, a: c.startswith("value 'none'")),
    ("value with no class", lambda c, k, a: c.startswith("value with no class")),
    ("every shape", lambda c, k, a: c.startswith("every shape")),
    ("description broader/narrower", lambda c, k, a: c.startswith("description")),
    ("one word, two keys (group)", lambda c, k, a: c == ONE_WORD),
    ("lists cut or merged", lambda c, k, a: c.startswith("list")),
    ("context rule", lambda c, k, a: c.startswith("context")),
    ("arrow from/to", lambda c, k, a: k in ("from", "to")),
    ("gold names a shape created earlier ($new)", lambda c, k, a: c.startswith("$new")),
    ("name tags", lambda c, k, a: k in ("target", "anchor", "linked", "name")),
    ("key not learned", lambda c, k, a: c.startswith("key")),
    ("other", lambda c, k, a: True),
]


def group_of(cause, key, act):
    return next(g for g, f in GROUP if f(cause, key, act))


def silent(row, R, LEG, number_words):
    """the ways this row's label states something other than its gold (a list of reasons; empty: the label is the gold)"""
    out = []; gold = row["gold"]; ck = {k: v for k, v in R["classes"]}
    tgt = dict(zip([k for k, _ in R["classes"]], class_targets(row, R["classes"])))   # what the loss trains
    for k, v in gold.items():
        if k in ("action", "ask"): continue
        if k not in ck and k not in R["span_keys"] and not (k == "scale" and not MR.IMPLIED_SCALE):
            out.append("key not learned: " + k); continue
        if k in MR.IMPLIED_KEYS and "implied:" + k in row["classes"]:   # a value the request does not write: its class head says it
            if num(row["classes"]["implied:" + k]) != num(v): out.append(f"{k}: implied value differs ({row['classes']['implied:' + k]}, gold {v})")
            elif row["classes"]["implied:" + k] not in ck.get("implied:" + k, [])[1:]: out.append(f"{k}: implied value with no class ({v})")
            elif tgt["implied:" + k] == 0: out.append(f"{k}: implied value trained as absent")
            elif spans_of(row["tags"]).get(k): out.append(f"{k}: both tagged and on the implied head")
            continue
        if k in ck:
            vals = ck[k]; s = str(v)
            if s not in vals[1:]: out.append(f"{k}: value with no class ({s})")
            elif tgt[k] == 0: out.append(f"{k}: value 'none' trained as absent")
            continue
        kind = LEG[k]["kind"]; ps = MR.parts(v)
        if not ps:
            if str(v) == "": out.append(f'{k}="" trained as absent')
            continue
        spans = [" ".join(row["words"][i:j]).lower() for i, j in spans_of(row["tags"]).get(k, [])]
        fill = row["classes"].get("fill:" + k)
        if kind == "names" and fill == "context": continue          # a reference the shared rule fills: the label is "context", which is right
        if kind == "names" and fill == "description":
            if any(not p.startswith("mention(") for p in ps): out.append(f"{k}: names beside a description dropped")
            if sum(1 for p in ps if p.startswith("mention(")) > 1: out.append(f"{k}: several descriptions in one role (one learned)")
            d = next(p for p in ps if p.startswith("mention("))
            described = [r for r in R["ref_keys"] if row["classes"].get("fill:" + r) == "description"]
            nth = described.index(k)
            pre = "desc:" if nth == 0 or not R.get("desc2_keys") else "desc2:" if nth == 1 else None
            if pre is None: out.append(f"{k}: a third described role (no heads for it)"); continue
            got = {kk[len(pre):]: vv for kk, vv in row["classes"].items() if kk.startswith(pre)}
            want = {MR_DKEY.get(a.lower(), a): b for a, b in mention_keys(d).items()}
            if got != want: out.append(f"{k}: description label differs ({want} -> {got})")
            continue
        low = " " + " ".join(row["words"]).lower() + " "
        if kind == "text": ps = [str(v)]
        for p in ps:
            if p == "$new" or p.startswith("mention("): continue
            pw = " ".join(w[0] for w in MR.words(p)).lower()
            if pw in spans: continue
            if kind == "number":
                def val(s):
                    m = re.search(r"\d+(?:\.\d+)?", s)
                    if m: return num(m.group(0))
                    tv = MR.table_value(s) if R.get("number_words_from") == "table" else None   # docs/js/neural.js decodes by the table first
                    return float(tv) if tv is not None else num(number_words.get(s, ""))
                if any(val(s) == num(p) is not None for s in spans): continue
                if spans: out.append(f"{k}: number word mapped to another number ({spans} -> {[val(s) for s in spans]}, gold {p})"); continue
                if k in MR.IMPLIED_KEYS: out.append(f"{k}: neither tagged nor on the implied head ({p})"); continue
                if not re.search(r"\b" + re.escape(p) + r"(?![\d.])", low): continue   # the number is not written: not learnable, not a label error
            elif " " + pw + " " not in low: continue   # the value is not written in the request: not learnable, not a label error
            if row["gold"].get("action") == "group" and k == "target" and p == str(row["gold"].get("name")): out.append(f"{k}: {ONE_WORD} ({p})"); continue
            out.append(f"{k}: value written but not tagged ({p})")
    if any(r.startswith(("target", "from", "to", "anchor", "linked")) for r in out) and sum(1 for k in R["ref_keys"] if row["classes"].get("fill:" + k) == "description") > (2 if R.get("desc2_keys") else 1):
        out.append("more described roles than description heads")
    return out


MR_DKEY = {}


def spans_of(tags):
    out, cur = collections.defaultdict(list), None
    for i, t in enumerate(tags):
        if t == "O": cur = None; continue
        p, k = t.split("-", 1)
        if p == "I" and cur == k and out[k] and out[k][-1][1] == i: out[k][-1][1] = i + 1
        else: out[k].append([i, i + 1]); cur = k
    return dict(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default=os.path.expanduser("~/vss-box/ft/roles_roundtrip"))
    ap.add_argument("--md", default=None, help="write the table to this Markdown file")
    ap.add_argument("--gate", nargs=2, type=float, default=None, metavar=("MIN_RT", "MAX_SILENT"))
    ap.add_argument("--compare-rows", default=None, help="a make_roles.py --all output (job 071's): its train.jsonl and reader.json must equal the ones built here")
    ap.add_argument("--examples", type=int, default=3)
    a = ap.parse_args()
    os.makedirs(a.work, exist_ok=True)
    rows_dir = os.path.join(a.work, "rows")
    fixes = MR.load_label_fixes(MR.LABEL_FIXES) if MR.LABEL_FIXES else None
    subprocess.run([sys.executable, os.path.join(HERE, "make_roles.py"), "--all", "--out", rows_dir, "--also", *ALSO], check=True, stdout=subprocess.DEVNULL)
    if a.compare_rows:
        for f in ("train.jsonl", "reader.json"):
            if open(os.path.join(rows_dir, f), "rb").read() != open(os.path.join(a.compare_rows, f), "rb").read():
                raise SystemExit(f"--compare-rows: {f} differs from {a.compare_rows}: the round trip did not see the rows that are trained on")
    R = json.load(open(os.path.join(rows_dir, "reader.json")))
    LEG = MR.legend(); MR_DKEY.update({k.lower(): k for k in LEG})
    ACTION, ASK = MD.acts_from_neural_js(); ACTS = ACTION + ASK + ["fact", "rule"]
    number_words = R["number_words"]

    def load_rows(path):
        by = collections.defaultdict(list)
        for l in open(path, encoding="utf8"):
            if l.strip(): r = json.loads(l); by[r["id"]].append(r)
        return by
    trained = load_rows(os.path.join(rows_dir, "train.jsonl"))
    folders = [(d, True) for d in MD.DIRS + MD.SAMPLE_DIRS] + [(d, False) for d in ALSO]
    msgs_out, meta = [], {}
    for d, is_train in folders:
        by = trained if is_train else load_rows(os.path.join(rows_dir, "also_" + d.replace("/", "__") + ".jsonl"))
        msgs = MD.messages([d]); MR.apply_label_fixes(msgs, fixes)
        for m in msgs:
            wires = [w for w in m.get("wires", []) if "pending" not in w]
            rows = by.get(m["id"], []); k = 0; mrows = []; dropped = {}
            for j, w in enumerate(wires):
                sp, args = w.get("span"), w.get("args", {}); ac = MD.act_of(w.get("type"), args)
                if not sp or sp not in m["text"]: dropped[j] = "dropped: span missing or not in the text"; continue
                if ac not in ACTS: dropped[j] = f"act not in the act set: {ac}"; continue
                r = rows[k]; k += 1
                assert r["text"] == sp, (m["id"], r["text"], sp)
                mrows.append(dict(r, wi=j, ct=class_targets(r, R["classes"])))
            assert k == len(rows), (m["id"], k, len(rows))
            ws, tg = MR.cut_tags(m["text"], [w["span"] for w in wires if w.get("span")])
            msgs_out.append({"id": m["id"], "text": m["text"], "names": m.get("names", []), "wires": wires, "cut": tg, "words": [w[0] for w in ws],
                             "rows": [{x: r[x] for x in ("text", "words", "tags", "act", "ct", "wi")} for r in mrows]})
            meta[m["id"]] = (d, is_train, wires, mrows, dropped)
    inp, outp = os.path.join(a.work, "messages.jsonl"), os.path.join(a.work, "decoded.jsonl")
    with open(inp, "w", encoding="utf8") as f:
        for x in msgs_out: f.write(json.dumps(x, ensure_ascii=False) + "\n")
    print(f"{len(msgs_out)} messages -> node (docs/js/neural.js decoding)", flush=True)
    subprocess.run(["node", os.path.join(HERE, "roles_roundtrip.mjs"), os.path.join(rows_dir, "reader.json"), inp, outp], check=True)

    T = collections.OrderedDict()
    causes = collections.Counter(); cause_ex = collections.defaultdict(list); key_causes = collections.Counter()
    sil_reasons = collections.Counter(); sil_ex = collections.defaultdict(list)
    for l in open(outp, encoding="utf8"):
        o = json.loads(l); d, is_train, wires, mrows, dropped = meta[o["id"]]
        t = T.setdefault(d, collections.Counter(train=is_train)); t["messages"] += 1
        byw = {r["wi"]: r for r in mrows}
        for j, (w, g) in enumerate(zip(wires, o["gold"])):
            t["gold"] += 1; t[g["o"]] += 1
            act = MD.act_of(w.get("type"), w.get("args", {}))
            if g["o"] == "right": continue
            row = byw.get(j)
            if row is None: c, k = dropped[j], ""
            elif g["o"] == "missing": c, k = "missing: the cut tags lost or merged the span", ""
            else:
                cs = [(category(kk, act, got, want, row, R, LEG), kk) for kk, got, want in g["miss"]]
                for cc, kk in cs: key_causes[(kk, cc)] += 1
                # the first cause that explains the request; a class read back differently next to another cause is its consequence
                # (position is dropped by formalizeJoint when its anchor is empty)
                c, k = next(((cc, kk) for cc, kk in cs if cc != "class decoded differently"), cs[0])
                if all(cc.startswith(NOT_LABEL) or (cc == "class decoded differently" and len(cs) > 1) for cc, _ in cs): t["right_or_ref"] += 1
                elif all(cc.startswith(NOT_LABEL + ASKED) or (cc == "class decoded differently" and len(cs) > 1) for cc, _ in cs): t["asked"] += 1
            grp = group_of(c, k, act); t["c:" + grp] += 1; causes[(grp, c)] += 1
            if len(cause_ex[(grp, c)]) < a.examples: cause_ex[(grp, c)].append(f'{o["id"]} "{w.get("span")}" {json.dumps(w.get("args"))} -> {g.get("miss") or g["o"]}')
        t["extra"] += len(o["extra"])
        for r in mrows:
            t["rows"] += 1; s = silent(r, R, LEG, number_words)
            # label="" (remove a label) has no word to tag: the row trains "no label", so the decoded label request has no text and the
            # engine asks for it (logic.js: "What should the label say?"); not done, never done wrong: counted apart from the silent labels
            asks = [x for x in s if x.endswith('="" trained as absent') or ONE_WORD in x]
            if asks: t["asks"] += 1
            if len(asks) < len(s):
                t["silent"] += 1
                for x in s:
                    key = re.sub(r" \(.*", "", x); sil_reasons[(d, key)] += 1
                    if len(sil_ex[key]) < a.examples: sil_ex[key].append(f'{r["id"]} "{r["text"]}" {json.dumps(r["gold"])}: {x}')
    groups = [g for g, _ in GROUP]
    used_groups = [g for g in groups if any(t["c:" + g] for t in T.values())]
    tot = collections.Counter(); totT = collections.Counter()
    for d, t in T.items():
        tot.update(t)
        if t["train"]: totT.update(t)
    pc = lambda x, n: f"{x / n * 100:.1f}%" if n else "-"
    lines = ["| folder | trained | requests | round trip right | right or reference only | asked (layout cannot hold) | wrong | missing | extra wires | rows | silent wrong labels | rows the layout cannot hold (refused) | " + " | ".join(used_groups) + " |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|" + "---|" * len(used_groups)]
    for d, t in list(T.items()) + [("ALL trained folders", totT), ("ALL", tot)]:
        lines.append(f"| {d} | {'yes' if t['train'] else 'no'} | {t['gold']} | {pc(t['right'], t['gold'])} | {pc(t['right'] + t['right_or_ref'], t['gold'])} | {pc(t['asked'], t['gold'])} | {pc(t['wrong'], t['gold'])} | {pc(t['missing'], t['gold'])} | {t['extra']} | {t['rows']} | {pc(t['silent'], t['rows'])} | {pc(t['asks'], t['rows'])} | "
                     + " | ".join(pc(t['c:' + g], t['gold']) for g in used_groups) + " |")
    table = "\n".join(lines)
    print(table)
    print("\ncauses of the requests that do not round-trip (all folders; first wrong key):")
    cl = []
    for (g, c), n in causes.most_common():
        cl.append(f"- {g} / {c}: {n}"); cl += [f"    - e.g. {e}" for e in cause_ex[(g, c)]]
    print("\n".join(cl))
    print("\nsilent wrong labels (rows; reason):")
    sl = []
    for (where, k), n in sorted(sil_reasons.items(), key=lambda x: -x[1]):
        sl.append(f"- {where}: {k}: {n}")
    for k, ex in sil_ex.items(): sl += [f"    - e.g. {e}" for e in ex[:2]]
    print("\n".join(sl))
    res = {"table": {d: dict(t) for d, t in T.items()}, "causes": {f"{g} / {c}": n for (g, c), n in causes.items()},
           "keys": {f"{k} / {c}": n for (k, c), n in key_causes.items()}, "silent": {f"{w} / {k}": n for (w, k), n in sil_reasons.items()}}
    json.dump(res, open(os.path.join(a.work, "roundtrip.json"), "w"), indent=1)
    if a.md:
        with open(a.md + ".table", "w", encoding="utf8") as f: f.write(table + "\n\n### Causes\n\n" + "\n".join(cl) + "\n\n### Silent wrong labels\n\n" + "\n".join(sl) + "\n")
    if a.gate:
        lo, hi = a.gate; bad = []
        for d, t in T.items():
            if not t["train"] or not t["gold"]: continue
            rt, sw = (t["right"] + t["right_or_ref"] + t["asked"]) / t["gold"] * 100, t["silent"] / max(t["rows"], 1) * 100
            if rt < lo: bad.append(f"{d}: round trip (right, reference only or asked) {rt:.1f}% < {lo}%")
            if sw > hi: bad.append(f"{d}: silent wrong labels {sw:.2f}% > {hi}%")
        if bad: print("GATE FAILED:\n  " + "\n  ".join(bad)); sys.exit(1)
        print(f"gate passed: every trained folder round-trips (right, reference only or asked) >= {lo}% with <= {hi}% silent wrong labels")


if __name__ == "__main__": main()
