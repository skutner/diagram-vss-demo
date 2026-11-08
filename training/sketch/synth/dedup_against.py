#!/usr/bin/env python3
"""dedup_against.py: drop from a file of generated messages every message whose text already occurs elsewhere, so a fresh test set cannot
contain a text a model trained on or a set was calibrated on (MODERNBERT_RECAL_PLAN.md section 3, step 2).
  python3 dedup_against.py IN.jsonl OUT.jsonl --against PATH [--against PATH ...] [--report REPORT.json]
PATH is a .jsonl file or a folder (every *.jsonl below it, recursively; *.manifest.json files are not read). A row needs `text`, and may have
`id`. Texts are compared lower case with runs of whitespace collapsed to one space (the same normalisation as collect_set.mjs `norm`, so the
overlap check of a later collection cannot disagree with this one). A message is dropped when its text equals a text of a PATH (the cause names
the first PATH, in the order given, that holds it) or equals the text of an earlier message of IN (duplicate within the file).
REFUSES (exit 2, OUT is not written) when an id of IN equals an id of any PATH, or when IN holds one id twice: ids must stay unique across the
sets that are loaded together (sets.mjs loadSets) and a training id is never an evaluation id (collect_set.mjs trainOverlap).
"""
import argparse, collections, json, os, sys


def norm(t):
    return " ".join(str(t).lower().split())


def jsonl_files(path):
    if os.path.isfile(path):
        return [path]
    if not os.path.isdir(path):
        raise SystemExit(f"dedup_against: --against {path}: not a file or a folder")
    out = []
    for root, _, names in os.walk(path):
        out += [os.path.join(root, n) for n in names if n.endswith(".jsonl")]
    return sorted(out)


def read_rows(path):
    with open(path, encoding="utf8") as f:
        for i, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except ValueError:
                raise SystemExit(f"dedup_against: {path}:{i}: not JSON")


def load_against(paths):
    """-> (texts: norm text -> first path that holds it, ids: id -> first path that holds it, rows read per path)"""
    texts, ids, counts = {}, {}, {}
    for p in paths:
        files = jsonl_files(p)
        if not files:
            raise SystemExit(f"dedup_against: --against {p}: no .jsonl file there (a wrong path would drop nothing)")
        n = 0
        for f in files:
            for r in read_rows(f):
                n += 1
                if isinstance(r.get("text"), str):
                    texts.setdefault(norm(r["text"]), p)
                if r.get("id") is not None:
                    ids.setdefault(str(r["id"]), p)
        counts[p] = n
    return texts, ids, counts


def dedup(rows, texts, ids):
    """-> (kept rows, causes Counter). Raises ValueError with the reason when an id collides."""
    seen_ids, clash_within, clash_against = set(), [], []
    for r in rows:
        i = str(r.get("id"))
        if i in seen_ids:
            clash_within.append(i)
        seen_ids.add(i)
        if i in ids:
            clash_against.append((i, ids[i]))
    if clash_within:
        raise ValueError(f"{len(clash_within)} ids occur twice in the input (e.g. {clash_within[:3]})")
    if clash_against:
        raise ValueError(f"{len(clash_against)} ids of the input are ids of an --against source (e.g. {clash_against[:3]}): not a fresh set")
    kept, causes, seen = [], collections.Counter(), set()
    for r in rows:
        n = norm(r["text"])
        if n in texts:
            causes[f"text of {texts[n]}"] += 1
        elif n in seen:
            causes["duplicate text within the file"] += 1
        else:
            seen.add(n)
            kept.append(r)
    return kept, causes


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("inp")
    ap.add_argument("out")
    ap.add_argument("--against", action="append", required=True)
    ap.add_argument("--report")
    a = ap.parse_args(argv)
    rows = list(read_rows(a.inp))
    for r in rows:
        if not isinstance(r.get("text"), str) or r.get("id") is None:
            print("dedup_against: every input row needs id and text", file=sys.stderr)
            return 2
    texts, ids, counts = load_against(a.against)
    try:
        kept, causes = dedup(rows, texts, ids)
    except ValueError as e:
        print("dedup_against: REFUSED: " + str(e), file=sys.stderr)
        return 2
    with open(a.out, "w", encoding="utf8") as f:
        for r in kept:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    rep = {"input": a.inp, "output": a.out, "messages": len(rows), "kept": len(kept), "dropped_by_cause": dict(causes.most_common()),
           "against_rows_read": counts, "against_distinct_texts": len(texts), "against_distinct_ids": len(ids)}
    if a.report:
        with open(a.report, "w", encoding="utf8") as f:
            json.dump(rep, f, indent=1)
    print(json.dumps(rep, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
