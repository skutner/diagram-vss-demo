"""compare_rows.py: which training rows of a make_roles.py folder differ from another's (the plan counts the rows whose labels change before an arm runs).
Rows are paired by message id and their order in the message. Prints: rows only in one folder, rows whose gold, word tags or class labels differ (by key), examples,
and the reader.json differences (heads added or removed, number_words added, removed or changed, other fields).
  python3 training/neural/parity/compare_rows.py BASE_FOLDER ARM_FOLDER [--examples 5] [--json OUT.json]"""
import argparse, collections, json, os


def rows(d):
    out, seen = {}, collections.Counter()
    for l in open(os.path.join(d, "train.jsonl"), encoding="utf8"):
        r = json.loads(l); out[(r["id"], seen[r["id"]])] = r; seen[r["id"]] += 1
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("base"); ap.add_argument("arm"); ap.add_argument("--examples", type=int, default=5); ap.add_argument("--json")
    a = ap.parse_args()
    A, B = rows(a.base), rows(a.arm)
    both = [k for k in A if k in B]
    res = {"rows": {"base": len(A), "arm": len(B), "only base": sum(k not in B for k in A), "only arm": sum(k not in A for k in B), "in both": len(both)}}
    if any(A[k]["text"] != B[k]["text"] for k in both): raise SystemExit("paired rows hold different texts: not the same messages")
    what, keys, ex = collections.Counter(), collections.Counter(), collections.defaultdict(list)
    changed = 0
    for k in both:
        x, y = A[k], B[k]; d = []
        if x["gold"] != y["gold"]: d.append("gold")
        if x["tags"] != y["tags"]: d.append("tags")
        if x["classes"] != y["classes"]: d.append("classes")
        if not d: continue
        changed += 1; what[" + ".join(d)] += 1
        for t in {t[2:] for t in x["tags"] + y["tags"] if t != "O"}:
            if [z == t for z in (s[2:] for s in x["tags"])] != [z == t for z in (s[2:] for s in y["tags"])]: keys["tag " + t] += 1
        for c in set(x["classes"]) | set(y["classes"]):
            if x["classes"].get(c) != y["classes"].get(c): keys["class " + c] += 1
        for g in set(x["gold"]) | set(y["gold"]):
            if x["gold"].get(g) != y["gold"].get(g): keys["gold " + g] += 1
        for kk in [kk for kk in keys if len(ex[kk]) < a.examples]:
            if (kk.startswith("tag ") and kk[4:] in {t[2:] for t in x["tags"] + y["tags"]}) or (kk.startswith("class ") and x["classes"].get(kk[6:]) != y["classes"].get(kk[6:])) or (kk.startswith("gold ") and x["gold"].get(kk[5:]) != y["gold"].get(kk[5:])):
                if len(ex[kk]) < a.examples and not any(e["id"] == x["id"] for e in ex[kk]):
                    ex[kk].append({"id": x["id"], "text": x["text"], "base": {"tags": " ".join(f"{w}/{t}" for w, t in zip(x["words"], x["tags"]) if t != "O"), "classes": {c: x["classes"].get(c) for c in set(x["classes"]) ^ set(y["classes"]) | {c for c in x["classes"] if x["classes"].get(c) != y["classes"].get(c)}}},
                                      "arm": {"tags": " ".join(f"{w}/{t}" for w, t in zip(y["words"], y["tags"]) if t != "O"), "classes": {c: y["classes"].get(c) for c in set(x["classes"]) ^ set(y["classes"]) | {c for c in y["classes"] if x["classes"].get(c) != y["classes"].get(c)}}}})
    res["rows whose labels changed"] = changed; res["what changed"] = dict(what.most_common()); res["by key (rows)"] = dict(keys.most_common())
    RA, RB = (json.load(open(os.path.join(d, "reader.json"))) for d in (a.base, a.arm))
    ca, cb = dict(RA["classes"]), dict(RB["classes"])
    na, nb = RA.get("number_words", {}), RB.get("number_words", {})
    res["reader"] = {"heads added": {k: cb[k] for k in cb if k not in ca}, "heads removed": sorted(k for k in ca if k not in cb),
                     "heads with other values": {k: {"base": ca[k], "arm": cb[k]} for k in ca if k in cb and ca[k] != cb[k]},
                     "number_words removed": {w: na[w] for w in na if w not in nb}, "number_words added": {w: nb[w] for w in nb if w not in na},
                     "number_words changed": {w: [na[w], nb[w]] for w in na if w in nb and na[w] != nb[w]},
                     "act_keys changed": {k: {"base": RA["act_keys"].get(k), "arm": RB["act_keys"].get(k)} for k in set(RA["act_keys"]) | set(RB["act_keys"]) if RA["act_keys"].get(k) != RB["act_keys"].get(k)},
                     "other fields changed": sorted(k for k in set(RA) | set(RB) if k not in ("classes", "number_words", "act_keys") and RA.get(k) != RB.get(k))}
    print(json.dumps({k: v for k, v in res.items()}, indent=1, ensure_ascii=False))
    for k, e in ex.items():
        print(f"\n{k}:"); [print("  " + json.dumps(x, ensure_ascii=False)) for x in e]
    if a.json: json.dump(dict(res, examples=ex), open(a.json, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__": main()
