"""nl_share.py: the learning curve's shares of the natural-language training folders (MODERNBERT_RUNLOG.md, "Round 2 (nl_p2) and the learning curve").

  python3 training/neural/parity/nl_share.py [--copies K] OUT_DIR SHARE FOLDER...      (FOLDER: llm_train/nl_p1 ... ; SHARE 1-100)

A message is in the share s when sha256(session or group or id) mod 100 < s, so the shares are nested and sessions and paraphrase groups
stay whole. A row whose text equals a test text (any file under llm_bench), exactly or normalised as text_overlap.py normalises it, is
left out (the declared gate: no text shared with a test set; the saved folders are not changed). OUT_DIR gets texts/ and opus/ (the training labels, adjudicated) with one file per source file, named <folder>_<file>, the
rows in their source order. OUT_DIR must not exist and must be outside the repository. It is then reached by build_arm_data.sh as an
EXTRA_NL folder through a link llm_train/nl_pc<SHARE> (removed after the build).
--copies K (experiment W, MODERNBERT_RUNLOG.md "A candidate for after the curve"): every kept row K times. make_data.py keeps a folder once
and asserts unique message ids, so copy r >= 2 has its id, session and group suffixed "_r<r>", in files <name>_r<r>.jsonl.
"""
import glob, hashlib, json, os, re, sys

R = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
SK = os.path.join(R, "training", "sketch")


norm = lambda s: re.sub(r"[\W_]+", "", s.lower())


def test_texts():
    out = set()
    for p in glob.glob(os.path.join(SK, "llm_bench", "**", "*.jsonl"), recursive=True):
        for line in open(p, encoding="utf8"):
            if line.strip():
                t = json.loads(line).get("text")
                if isinstance(t, str): out.add(norm(t))
    return out


def unit(r):
    return r.get("session") or r.get("group") or r["id"]


def inside(r, share):
    return int(hashlib.sha256(unit(r).encode()).hexdigest(), 16) % 100 < share


def copy_of(r, k):
    if k == 1: return r
    r = dict(r); r["id"] = f"{r['id']}_r{k}"
    for f in ("session", "group"):
        if r.get(f): r[f] = f"{r[f]}_r{k}"
    return r


def main(out, share, folders, copies=1):
    out = os.path.abspath(out)
    if os.path.exists(out): raise SystemExit(f"{out} exists")
    if out == R or out.startswith(R + os.sep): raise SystemExit("OUT_DIR is inside the repository")
    if not 1 <= share <= 100: raise SystemExit("SHARE must be 1-100")
    os.makedirs(out + "/texts"); os.makedirs(out + "/opus")
    total = kept = 0; tests = test_texts(); dropped = []
    for d in folders:
        src = os.path.join(SK, d); tag = os.path.basename(os.path.normpath(d))
        tf, lf = sorted(glob.glob(src + "/texts/*.jsonl")), sorted(glob.glob(src + "/opus/*.jsonl"))
        if [os.path.basename(x) for x in tf] != [os.path.basename(x) for x in lf] or not tf: raise SystemExit(f"{d}: texts/ and opus/ hold other files")
        for t, l in zip(tf, lf):
            trows = [json.loads(x) for x in open(t, encoding="utf8") if x.strip()]
            lrows = [json.loads(x) for x in open(l, encoding="utf8") if x.strip()]
            if [r["id"] for r in trows] != [r["id"] for r in lrows]: raise SystemExit(f"{l}: ids differ from {t}")
            keep = [i for i, r in enumerate(trows) if inside(r, share)]
            dropped += [trows[i]["id"] for i in keep if norm(trows[i]["text"]) in tests]
            keep = [i for i in keep if norm(trows[i]["text"]) not in tests]
            name = f"batch_{tag}_{os.path.basename(t)[len('batch_'):]}" if os.path.basename(t).startswith("batch_") else f"batch_{tag}_{os.path.basename(t)}"
            for k in range(1, copies + 1):
                fname = name if k == 1 else name[:-len(".jsonl")] + f"_r{k}.jsonl"
                for sub, rs in (("texts", trows), ("opus", lrows)):
                    with open(os.path.join(out, sub, fname), "w", encoding="utf8") as f:
                        for i in keep: f.write(json.dumps(copy_of(rs[i], k), ensure_ascii=False, separators=(",", ":")) + "\n")
            total += len(trows); kept += len(keep)
    print(f"share {share}: {kept} of {total} messages{f' x {copies} copies' if copies > 1 else ''} -> {out} | left out as test texts: {len(dropped)} {dropped}")


if __name__ == "__main__":
    a = sys.argv[1:]; k = 1
    if a[:1] == ["--copies"]: k, a = int(a[1]), a[2:]
    if len(a) < 3 or k < 1: raise SystemExit(__doc__)
    main(a[0], int(a[1]), a[2:], k)
