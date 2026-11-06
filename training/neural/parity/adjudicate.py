"""adjudicate.py: adjudication of a natural-language training folder (llm_train/nl_p*), as nl_p1's was (MODERNBERT_RUNLOG.md, "M3's data gates").

  python3 training/neural/parity/adjudicate.py build FOLDER WORK N AGREEMENT.json VALIDATE_OPUS.txt VALIDATE_GPT.txt
  python3 training/neural/parity/adjudicate.py merge FOLDER WORK [--write]

build: the rows where the two teachers disagree (folder_agreement.mjs's "disagreements") or whose Opus label fails in the engine (the hard
failures of validate_rows.mjs's report), in N batches WORK/j1..jN, a session's rows kept in one batch. Each batch folder holds only
ANNOTATION_SPEC.md, ADJUDICATION.md (WORK/ADJUDICATION.md, copied) and in/adj.jsonl. The labels are shown as A and B in an order fixed by
sha256(id); the key stays in WORK/key.json, never in a batch folder.
merge: reads WORK/j*/out/adj.jsonl. Without --write it reports only. With --write: FOLDER/opus is copied once, byte for byte, to
FOLDER/opus_first (the first labels); FOLDER/opus gets the adjudicated wires, each such row with "adjudicated": {chose, why}.
"""
import glob, hashlib, json, os, re, shutil, sys

R = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
SPEC = os.path.join(R, "training", "sketch", "llm_train", "ANNOTATION_SPEC.md")


def rows(folder, sub):
    out = {}
    for f in sorted(glob.glob(f"{folder}/{sub}/*.jsonl")):
        for line in open(f, encoding="utf8"):
            if line.strip():
                r = json.loads(line); out[r["id"]] = r
    return out


def failures(path, ids):
    """hard failures per id from a validate_rows.mjs report (only ids of this folder)"""
    out, hard = {}, False
    for line in open(path, encoding="utf8"):
        if line.startswith("HARD FAILURES"): hard = True; continue
        if line.strip() and not line.startswith(" "): hard = False
        m = re.match(r"\s+(\S+) \[(\w+)\] (.*)", line)
        if m and hard and m.group(1) in ids: out.setdefault(m.group(1), []).append(f"[{m.group(2)}] {m.group(3).strip()}")
    return out


def build(folder, work, n, agree, vo, vg):
    texts, opus, gpt = rows(folder, "texts"), rows(folder, "opus"), rows(folder, "gpt")
    if not (set(texts) == set(opus) == set(gpt)): raise SystemExit("id sets of texts, opus and gpt differ")
    fo, fg = failures(vo, set(texts)), failures(vg, set(texts))
    dis = {d["id"]: d for d in json.load(open(agree))["disagreements"]}
    if not set(dis) <= set(texts): raise SystemExit("the agreement file holds ids of another folder")
    order = {k: i for i, k in enumerate(texts)}
    by_session = {}
    for k, r in texts.items():
        if r.get("session"): by_session.setdefault(r["session"], []).append(k)
    key, items = {}, []
    for k in sorted(set(dis) | set(fo), key=order.get):
        t = texts[k]
        flip = int(hashlib.sha256(k.encode()).hexdigest(), 16) % 2 == 1
        a, b = (gpt[k], opus[k]) if flip else (opus[k], gpt[k])
        key[k] = {"A": "gpt" if flip else "opus", "B": "opus" if flip else "gpt"}
        item = {"id": k, "kind": t.get("kind"), "domain": t.get("domain")}
        if t.get("session"):
            s = by_session[t["session"]]
            item["session"] = t["session"]; item["setup"] = texts[s[0]].get("setup", "")
            item["earlier_messages"] = [texts[x]["text"] for x in s[: s.index(k)]]
        else:
            item["setup"] = t.get("setup", "")
        if t.get("group"): item["group"] = t["group"]
        item["names"] = opus[k].get("names", [])
        item["text"] = t["text"]
        item["label_A"], item["label_B"] = a.get("wires", []), b.get("wires", [])
        fa, fb = (fg, fo) if flip else (fo, fg)
        item["engine_A"], item["engine_B"] = fa.get(k, []), fb.get(k, [])
        items.append(item)
    size = -(-len(items) // n); batches, cur = [], []
    for it in items:
        if len(cur) >= size and not (it.get("session") and cur and cur[-1].get("session") == it.get("session")):
            batches.append(cur); cur = []
        cur.append(it)
    if cur: batches.append(cur)
    for i, b in enumerate(batches, 1):
        d = f"{work}/j{i}"; shutil.rmtree(d, ignore_errors=True); os.makedirs(d + "/in"); os.makedirs(d + "/out")
        shutil.copy(SPEC, d); shutil.copy(work + "/ADJUDICATION.md", d)
        with open(d + "/in/adj.jsonl", "w", encoding="utf8") as f:
            for it in b: f.write(json.dumps(it, ensure_ascii=False) + "\n")
        print(d, len(b))
    json.dump(key, open(work + "/key.json", "w"), indent=0)
    print("to adjudicate", len(items), "| disagreements", len(dis), "| opus engine failures", len(fo), "| both", len(set(dis) & set(fo)), "| batches", len(batches))


def norm(wires):
    """the data's form: every arg value a string (an adjudicator may write 18 or 1.25 as JSON numbers)"""
    out = json.loads(json.dumps(wires))
    for w in out:
        for k, v in list((w.get("args") or {}).items()):
            if isinstance(v, bool): w["args"][k] = str(v).lower()
            elif isinstance(v, int): w["args"][k] = str(v)
            elif isinstance(v, float): w["args"][k] = str(int(v)) if v.is_integer() else repr(v)
    return out


def merge(folder, work, write):
    key = json.load(open(work + "/key.json"))
    gpt = rows(folder, "gpt")
    opus = rows(folder, "opus_first" if os.path.isdir(folder + "/opus_first") else "opus")
    same_form = lambda a, b: json.dumps(norm(a), sort_keys=True) == json.dumps(norm(b), sort_keys=True)
    adj, problems = {}, []
    for j in sorted(glob.glob(work + "/j*"), key=lambda p: int(p.rsplit("j", 1)[1])):
        inp = [json.loads(l)["id"] for l in open(j + "/in/adj.jsonl", encoding="utf8") if l.strip()]
        p = j + "/out/adj.jsonl"
        if not os.path.exists(p): problems.append(f"{os.path.basename(j)}: no output"); continue
        out = [json.loads(l) for l in open(p, encoding="utf8") if l.strip()]
        if [o["id"] for o in out] != inp: problems.append(f"{os.path.basename(j)}: ids or order differ from the input ({len(out)} of {len(inp)})"); continue
        for o in out: adj[o["id"]] = o
    counts, mism = {}, []
    for k, o in adj.items():
        ch = o.get("chose"); who = {"A": key[k]["A"], "B": key[k]["B"]}.get(ch, ch)
        if who not in ("opus", "gpt", "same", "own"): problems.append(f"{k}: chose {ch!r}")
        counts[who] = counts.get(who, 0) + 1
        if ch in ("A", "B"):
            ref = (opus if who == "opus" else gpt)[k].get("wires", [])
            if same_form(ref, o.get("wires", [])): o["wires"] = ref
            else: mism.append(k); o["wires"] = norm(o.get("wires", []))
        elif ch == "same": o["wires"] = opus[k].get("wires", [])
        else: o["wires"] = norm(o.get("wires", []))
        o["_who"] = who
    print("adjudicated", len(adj), "of", len(key), "| chosen:", counts, "| chose A/B but wrote other wires:", len(mism), mism[:8])
    if set(adj) != set(key): problems.append(f"{len(set(key) - set(adj))} rows of the key have no adjudication")
    for p in problems: print("PROBLEM", p)
    changed = sum(1 for k, o in adj.items() if json.dumps(opus[k].get("wires", []), sort_keys=True) != json.dumps(o["wires"], sort_keys=True))
    print("rows whose training label changes:", changed)
    if not write: return 1 if problems else 0
    if problems: raise SystemExit("not written: " + "; ".join(problems))
    if not os.path.isdir(folder + "/opus_first"): shutil.copytree(folder + "/opus", folder + "/opus_first")
    for f in sorted(glob.glob(folder + "/opus_first/*.jsonl")):
        lines = []
        for l in open(f, encoding="utf8"):
            if not l.strip(): continue
            r = json.loads(l); o = adj.get(r["id"])
            if o: r["wires"] = o["wires"]; r["adjudicated"] = {"chose": o["_who"], "why": o.get("why", "")}
            lines.append(json.dumps(r, ensure_ascii=False, separators=(",", ":")))
        tmp = folder + "/opus/" + os.path.basename(f) + ".tmp"
        open(tmp, "w", encoding="utf8").write("\n".join(lines) + "\n"); os.replace(tmp, folder + "/opus/" + os.path.basename(f))
    print(f"written: {folder}/opus (adjudicated), {folder}/opus_first (first labels)")
    return 0


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["build"] and len(a) == 7: build(a[1], a[2], int(a[3]), a[4], a[5], a[6])
    elif a[:1] == ["merge"] and len(a) in (3, 4): sys.exit(merge(a[1], a[2], a[3:] == ["--write"]))
    else: raise SystemExit(__doc__)
