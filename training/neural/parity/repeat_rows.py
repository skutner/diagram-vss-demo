"""repeat_rows.py: experiment W's data (MODERNBERT_RUNLOG.md, "Decision after the curve" and "W's data") from C100's built rows.

  python3 training/neural/parity/repeat_rows.py SRC_DATA_DIR OUT_DIR K PREFIX...      (e.g. arms/data/C100 arms/data/W 4 tr- p2-)

Every row of train.jsonl and cut_train.jsonl whose id starts with one of PREFIX is written K times: the row itself, then K-1 copies with
the id suffixed "_r2".."_rK", right after it. Every other file of SRC_DATA_DIR (reader.json, the eval and held-out files, coverage.json,
trigger_inventory.json) is copied byte for byte. Why not build_arm_data.sh on repeated folders: make_roles.py learns its number-word map
(reader.json "number_words") from co-occurrence counts, so repeated folders change that map and some tags (12 request rows), which would
mix a second change into an experiment that only repeats rows. OUT_DIR must not exist and must be outside the repository.
"""
import json, os, shutil, sys

R = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
REPEATED = ("train.jsonl", "cut_train.jsonl")


def main(src, out, k, prefixes):
    src, out = os.path.abspath(src), os.path.abspath(out)
    if os.path.exists(out): raise SystemExit(f"{out} exists")
    if out == R or out.startswith(R + os.sep): raise SystemExit("OUT_DIR is inside the repository")
    if k < 1 or not prefixes: raise SystemExit(__doc__)
    names = sorted(os.listdir(src))
    for n in REPEATED:
        if n not in names: raise SystemExit(f"{src} has no {n}")
    os.makedirs(out + ".building")
    for n in names:
        p = os.path.join(src, n)
        if not os.path.isfile(p): raise SystemExit(f"{p} is not a file")
        if n not in REPEATED: shutil.copyfile(p, os.path.join(out + ".building", n)); continue
        rows = hit = 0
        with open(p, encoding="utf8") as f, open(os.path.join(out + ".building", n), "w", encoding="utf8") as g:
            for line in f:
                if not line.strip(): continue
                r = json.loads(line); g.write(line if line.endswith("\n") else line + "\n"); rows += 1
                if str(r["id"]).startswith(tuple(prefixes)):
                    hit += 1
                    for c in range(2, k + 1):
                        r2 = dict(r); r2["id"] = f"{r['id']}_r{c}"
                        g.write(json.dumps(r2, ensure_ascii=False) + "\n")
        print(f"{n}: {rows} rows, {hit} repeated x {k} -> {rows + hit * (k - 1)} rows")
    os.rename(out + ".building", out)


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 4: raise SystemExit(__doc__)
    main(a[0], a[1], int(a[2]), a[3:])
