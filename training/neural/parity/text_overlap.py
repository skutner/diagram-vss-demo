"""text_overlap.py: no training text may equal a test text (MODERNBERT_PARITY_PLAN.md section 6 gate; MODERNBERT_RUNLOG.md "Round 2").

  python3 training/neural/parity/text_overlap.py TRAIN_TEXTS_DIR [MIN_CHARS]

Compares every text of TRAIN_TEXTS_DIR/*.jsonl with every text under training/sketch/llm_bench (all test sets), exactly and normalised
(lower case, punctuation and spaces removed). Normalised texts shorter than MIN_CHARS (default 12) are listed apart and do not fail: a short
command ("undo", "make it red") is expected to recur. Exit 1 on any exact match, or on a normalised match of MIN_CHARS or more.
"""
import glob, json, os, re, sys

R = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
BENCH = os.path.join(R, "training", "sketch", "llm_bench")
norm = lambda s: re.sub(r"[\W_]+", "", s.lower())


def texts(paths):
    out = {}
    for p in paths:
        for line in open(p, encoding="utf8"):
            if line.strip():
                r = json.loads(line)
                if isinstance(r.get("text"), str): out.setdefault(r["text"], []).append((os.path.relpath(p, R), r.get("id")))
    return out


def main(train_dir, min_chars=12):
    train = texts(sorted(glob.glob(os.path.join(train_dir, "*.jsonl"))))
    test = texts(sorted(glob.glob(os.path.join(BENCH, "**", "*.jsonl"), recursive=True)))
    tnorm = {}
    for t, where in test.items(): tnorm.setdefault(norm(t), []).extend(where)
    exact = [(t, train[t], test[t]) for t in train if t in test]
    normed = [(t, train[t], tnorm[norm(t)]) for t in train if t not in test and norm(t) in tnorm]
    long_n = [x for x in normed if len(norm(x[0])) >= min_chars]
    short_n = [x for x in normed if len(norm(x[0])) < min_chars]
    print(f"{len(train)} training texts, {len(test)} test texts | exact matches {len(exact)} | normalised matches >= {min_chars} chars {len(long_n)} | short ones (allowed) {len(short_n)}")
    for t, a, b in exact + long_n: print(f"  MATCH {t!r}: {a[0]} = {b[0]}")
    for t, a, b in short_n: print(f"  short {t!r}: {a[0][1]} ~ {b[0][1]}")
    return 1 if exact or long_n else 0


if __name__ == "__main__":
    if len(sys.argv) < 2: raise SystemExit(__doc__)
    sys.exit(main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 12))
