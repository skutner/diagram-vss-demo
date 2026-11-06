"""Tests of curve_summary.py on synthetic per-message files.  python3 training/neural/parity/test_curve_summary.py"""
import json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import curve_summary as cs

def arm(d, name, right, G, session=None):
    n = len(right); half = n // 2
    def part(lo, hi):
        t = {"right": right[lo:hi], "bad": [0] * (hi - lo), "G": G[lo:hi]}
        return {"ids": [f"m{i}" for i in range(lo, hi)], "session": (session or [None] * n)[lo:hi], "group": [None] * (hi - lo),
                "overlap": [False] * (hi - lo), "tallies": {cs.VIEW: t}}
    os.makedirs(os.path.join(d, name, "eval"))
    json.dump({"nl_a/calibration": part(0, half), "nl_a/development": part(half, n)},
              open(os.path.join(d, name, "eval", "cal-fresh2-short3-nl_a.score.per_message.json"), "w"))

fails = 0
def check(name, cond):
    global fails
    print(("ok   " if cond else "FAIL ") + name); fails += 0 if cond else 1

with tempfile.TemporaryDirectory() as d:
    G = [2] * 100
    arm(d, "A-s0", [0] * 100, G); arm(d, "A-s1", [1] * 100, G)
    arm(d, "B-s0", [2] * 100, G); arm(d, "B-s1", [2] * 100, G)
    arm(d, "C-s0", [1] * 99 + [0], [2] * 99 + [3])          # other requests: must stop
    a, b = cs.point(["A-s0", "A-s1"], d), cs.point(["B-s0", "B-s1"], d)
    check("seeds are averaged per message", a["right"][0] == 0.5 and abs(sum(a["right"]) / sum(a["G"]) - 0.25) < 1e-9)
    check("both parts are read", len(a["ids"]) == 100)
    lo, hi, n = cs.interval(b, a)
    check("a sure difference has its interval at the difference", abs(lo - 0.75) < 1e-9 and abs(hi - 0.75) < 1e-9 and n == 100)
    try: cs.point(["A-s0", "C-s0"], d); check("other requests stop", False)
    except SystemExit: check("other requests stop", True)
    # units: a session's messages move together; with one session holding all the gain, the interval is wide
    sess = ["s1"] * 10 + [None] * 90
    arm(d, "D-s0", [2] * 10 + [0] * 90, G, sess); arm(d, "E-s0", [0] * 100, G, sess)
    dd, ee = cs.point(["D-s0"], d), cs.point(["E-s0"], d)
    lo, hi, n = cs.interval(dd, ee)
    check("a session is one unit", n == 91)
    check("one unit holding the gain gives a wide interval", lo == 0.0 and hi > 0.1)
print("FAILED (%d)" % fails if fails else "PASS"); sys.exit(1 if fails else 0)
