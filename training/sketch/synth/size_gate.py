#!/usr/bin/env python3
"""size_gate.py: the size gate of MODERNBERT_RECAL_PLAN.md section 3, fixed before any fit: a folder of messages (msg_*.jsonl) must hold at
least --min-total messages and at least N of each --min-form FORM:N (meta.form). Prints the count per form; exits 1 when the gate is not met.
  python3 size_gate.py DIR --min-total 1500 --min-form create:120
"""
import argparse, collections, glob, json, os, sys


def counts(d):
    rows = []
    for f in sorted(glob.glob(os.path.join(d, "msg_*.jsonl"))):
        with open(f, encoding="utf8") as h:
            rows += [json.loads(l) for l in h if l.strip()]
    return len(rows), collections.Counter((r.get("meta") or {}).get("form") for r in rows)


def gate(total, forms, min_total, min_forms):
    """-> list of the reasons the gate is not met (empty when it is)"""
    out = []
    if total < min_total:
        out.append(f"{total} messages, at least {min_total} needed")
    for form, n in min_forms.items():
        if forms.get(form, 0) < n:
            out.append(f"{forms.get(form, 0)} messages of form {form}, at least {n} needed")
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--min-total", type=int, required=True)
    ap.add_argument("--min-form", action="append", default=[], help="FORM:N")
    a = ap.parse_args(argv)
    mf = {}
    for x in a.min_form:
        form, n = x.rsplit(":", 1)
        mf[form] = int(n)
    total, forms = counts(a.dir)
    why = gate(total, forms, a.min_total, mf)
    print(json.dumps({"dir": a.dir, "messages": total, "per_form": dict(forms.most_common()), "gate": {"min_total": a.min_total, "min_form": mf},
                      "met": not why, "reasons": why}, indent=1))
    return 1 if why else 0


if __name__ == "__main__":
    sys.exit(main())
