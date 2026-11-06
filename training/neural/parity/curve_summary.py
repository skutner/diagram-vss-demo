"""curve_summary.py: the learning curve's primary measure (MODERNBERT_RUNLOG.md, "Round 2 (nl_p2) and the learning curve").

  python3 training/neural/parity/curve_summary.py [--json OUT] POINT=ARM-s0,ARM-s1 POINT=... (in curve order, the first is the base)

For each point: nl_a, calibration and development parts together, Opus view, every request executed ("opus.today.all"), right per requested
action, the mean over the point's seeds. Nothing here needs a confidence fit. The per-message tallies come from each arm's
eval/cal-fresh2-short3-nl_a.score.per_message.json (score_arm.mjs). Differences between points: a paired bootstrap over units (the session,
else the paraphrase group, else the message, as compare_arms.mjs groups them), the seeds pooled (a unit's right count is the mean over the
point's seeds), 10,000 seeded resamples, 95%. Every arm must count the same requests per message, or it stops.
"""
import json, os, random, sys

ARMS = os.path.expanduser(os.environ.get("ARMS_DIR", "~/.cache/diagram-vss-modernbert/arms"))
PARTS = ("nl_a/calibration", "nl_a/development")
VIEW = "opus.today.all"
RESAMPLES, SEED = 10000, 20261106


def load(arm, arms_dir=ARMS):
    """ids, units, requested per message, right per message over the two parts of one arm"""
    p = os.path.join(arms_dir, arm, "eval", "cal-fresh2-short3-nl_a.score.per_message.json")
    s = json.load(open(p, encoding="utf8"))
    ids, units, g, right = [], [], [], []
    for part in PARTS:
        e = s[part]; t = e["tallies"][VIEW]
        for i, mid in enumerate(e["ids"]):
            sess = e["session"][i]; grp = (e.get("group") or [None] * len(e["ids"]))[i]
            ids.append(mid); units.append("S:" + sess if sess is not None else "G:" + grp if grp is not None else "M:" + mid)
            g.append(t["G"][i]); right.append(t["right"][i])
    return ids, units, g, right


def point(arms, arms_dir=ARMS):
    """one curve point: the mean right count per message over its seeds, with the shared ids, units and requests"""
    rows = [load(a, arms_dir) for a in arms]
    ids, units, g = rows[0][0], rows[0][1], rows[0][2]
    for a, r in zip(arms, rows):
        if r[0] != ids or r[2] != g: raise SystemExit(f"{a}: other messages or other requests than {arms[0]}")
    right = [sum(r[3][i] for r in rows) / len(rows) for i in range(len(ids))]
    return {"ids": ids, "units": units, "G": g, "right": right, "seeds": [sum(r[3]) / sum(g) for r in rows]}


def interval(a, b, resamples=RESAMPLES, seed=SEED):
    """95% bootstrap interval of right share(a) - right share(b), resampling units"""
    if a["ids"] != b["ids"] or a["G"] != b["G"]: raise SystemExit("the two points count other requests")
    by = {}
    for i, u in enumerate(a["units"]): by.setdefault(u, []).append(i)
    agg = [(sum(a["G"][i] for i in m), sum(a["right"][i] for i in m), sum(b["right"][i] for i in m)) for m in by.values()]
    rng = random.Random(seed); n = len(agg); out = []
    for _ in range(resamples):
        G = ra = rb = 0
        for _ in range(n):
            x = agg[rng.randrange(n)]; G += x[0]; ra += x[1]; rb += x[2]
        out.append((ra - rb) / G if G else 0.0)
    out.sort()
    return out[int(0.025 * resamples)], out[int(0.975 * resamples) - 1], len(agg)


def main(argv):
    out_path = None
    if argv[:1] == ["--json"]: out_path, argv = argv[1], argv[2:]
    if len(argv) < 2: raise SystemExit(__doc__)
    names, pts = [], {}
    for spec in argv:
        name, arms = spec.split("=", 1); names.append(name); pts[name] = point(arms.split(","))
    res = {"measure": "nl_a calibration + development, Opus view, every request executed: right per requested action", "points": {}, "differences": {}}
    for n in names:
        p = pts[n]; G = sum(p["G"]); share = sum(p["right"]) / G
        res["points"][n] = {"right_share": round(share, 4), "requested": G, "seeds": [round(x, 4) for x in p["seeds"]]}
        print(f"{n}: {100 * share:.1f}% of {G} (seeds {', '.join(f'{100 * x:.1f}%' for x in p['seeds'])})")
    pairs = [(names[i + 1], names[i]) for i in range(len(names) - 1)] + [(names[-1], names[0])]
    if len(names) > 2: pairs.append((names[-1], names[-2])) if (names[-1], names[-2]) not in pairs else None
    for hi, lo in dict.fromkeys(pairs):
        d = (sum(pts[hi]["right"]) - sum(pts[lo]["right"])) / sum(pts[hi]["G"]); lo95, hi95, units = interval(pts[hi], pts[lo])
        res["differences"][f"{hi} - {lo}"] = {"diff": round(d, 4), "ci95": [round(lo95, 4), round(hi95, 4)], "units": units}
        print(f"{hi} - {lo}: {100 * d:+.1f} points [{100 * lo95:+.1f}, {100 * hi95:+.1f}] over {units} units")
    if out_path: json.dump(res, open(out_path, "w"), indent=1)
    return res


if __name__ == "__main__":
    main(sys.argv[1:])
