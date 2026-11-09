#!/usr/bin/env python3
"""bare_view.py: the bare view of a set of short-command messages (VSSBERT_SHORT_COMMANDS_PLAN.md section 3.1).

For each row of the set folder (its msg_*.jsonl files, in file order) the text becomes the row's gold wire's span; gold (wires, names, groups)
and `meta.form` stay the same; `meta.narration` = false and `meta.from` = the source id; the id is <prefix>-<NNNNN>, NNNNN the digits after the
last "-" of the source id. Deduplicated by text (lower case, runs of whitespace collapsed to one space; the first in file order is kept).
--exclude-spans DIR drops every row whose text (same normalisation) occurs as a text of a row of DIR (the folders written by check_file.py, i.e.
t1's bare view, when the view of r2 is built). A row with more than one wire is not a command by itself: it is skipped and counted
(the t1 and r2 sets have none; the count is printed so a change cannot pass unseen).
Nothing here reads the Rules or a model: check_file.py (--mode rules) decides which bare texts stay.
  python3 bare_view.py <set folder> --id-prefix st1b --out OUT.jsonl [--exclude-spans DIR]
Output: OUT.jsonl (rows in the training format) and a one-line JSON summary on stdout. Deterministic: no timestamps; the same input gives the same bytes.
"""
import argparse, glob, json, os, re, sys


def norm(t):
    return " ".join(str(t).lower().split())


def read_rows(folder):
    """the rows of a folder's msg_*.jsonl files in name order; a malformed line stops with its file and line number"""
    files = sorted(glob.glob(os.path.join(folder, "msg_*.jsonl")))
    if not files:
        raise SystemExit(f"bare_view: {folder}: no msg_*.jsonl")
    for f in files:
        with open(f, encoding="utf8") as fh:
            for i, line in enumerate(fh, 1):
                if not line.strip():
                    continue
                try:
                    yield json.loads(line)
                except ValueError as e:
                    raise SystemExit(f"bare_view: {f}:{i}: not JSON ({e})")


def number_of(source_id):
    m = re.search(r"(\d+)$", str(source_id))
    if not m:
        raise SystemExit(f"bare_view: id {source_id!r} has no trailing digits")
    return m.group(1)


def make_view(rows, prefix, exclude=frozenset()):
    """-> (view rows, counts)"""
    out, seen, c = [], set(), {"input": 0, "skipped_multi_wire": 0, "duplicate_text": 0, "excluded": 0, "kept": 0}
    for r in rows:
        c["input"] += 1
        wires = r.get("wires")
        if not isinstance(wires, list) or len(wires) != 1:
            c["skipped_multi_wire"] += 1
            continue
        text = wires[0].get("span")
        if not text or text not in r["text"]:
            raise SystemExit(f"bare_view: {r.get('id')}: the gold span is not in the text")
        n = norm(text)
        if n in seen:
            c["duplicate_text"] += 1
            continue
        seen.add(n)
        if n in exclude:
            c["excluded"] += 1
            continue
        meta = dict(r.get("meta") or {})
        meta["narration"] = False
        meta["from"] = r["id"]
        v = dict(r)
        v["id"] = f"{prefix}-{number_of(r['id'])}"
        v["text"] = text
        v["meta"] = meta
        out.append(v)
        c["kept"] += 1
    ids = [v["id"] for v in out]
    if len(ids) != len(set(ids)):
        raise SystemExit("bare_view: two rows would get the same id (source ids with the same trailing digits)")
    return out, c


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--id-prefix", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--exclude-spans", default=None)
    a = ap.parse_args(argv)
    exclude = frozenset(norm(r["text"]) for r in read_rows(a.exclude_spans)) if a.exclude_spans else frozenset()
    view, counts = make_view(read_rows(a.folder), a.id_prefix, exclude)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf8") as f:
        for v in view:
            f.write(json.dumps(v, ensure_ascii=False) + "\n")
    print(json.dumps(counts, sort_keys=True))


if __name__ == "__main__":
    main()
