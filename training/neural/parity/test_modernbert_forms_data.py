"""Tests of modernbert_forms_data.py: the F membership rule, parent/overlay/source/tool identity, folds, reservation, the data-folder checks, and the
freeze/build/verify CLI on the real inherited campaign (read only).
  python3 -B training/neural/parity/test_modernbert_forms_data.py
Prints one line per check and the number of executed checks; exits 1 on a failed check or when no check ran. All outputs go to temporary folders outside the
repository and outside $OLD. The CLI sections need the old campaign's cache folder; without it they FAIL (a skipped check is never a pass)."""
import contextlib, copy, io, json, os, shutil, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import modernbert_forms_data as D

mnd = D.mnd
fails = 0
executed = 0


def check(name, cond, detail=""):
    global fails, executed
    executed += 1
    print(("ok   " if cond else "FAIL ") + name + ("" if cond else f"  {detail}"))
    fails += 0 if cond else 1


def cli(argv):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        rc = D.main(argv)
    return rc, out.getvalue() + err.getvalue()


def failing(checks):
    return {c["id"] for c in checks if c["status"] in ("FAIL", "UNAVAILABLE")}


def detail(checks, cid):
    return next(c["detail"] for c in checks if c["id"] == cid)


# ---------------------------------------------------------------- 1. the F rule on synthetic memberships and groups tables
NF = 5


def row(i, group, roles, fold=None, reserved=False, cal=False):
    return {"id": i, "group_key": group, "roles": roles, "fold": mnd.sha256_mod(group, NF) if fold is None else fold, "reserved_r2": reserved, "in_calibration": cal}


def fixture():
    om = {"B": ["b1", "b2", "b3"], "r2_nonreserved": ["n1", "n2"], "r2_reserved": ["r1", "r2"], "calibration": ["c1"], "fresh2_test": ["f1"], "short3_test": ["s1"], "nl_a_development": ["a1"],
          "t1_clean": ["t1"], "t1_all": ["t1", "t2"], "fresh2_test_other_drawings": ["f1"], "x1_placeholder": []}
    del om["x1_placeholder"]
    om["R"] = om["B"] + ["x1", "x2"]                     # x1, x2: restored-only
    om["S"] = om["R"] + om["r2_nonreserved"]
    g = {}
    for i in om["B"]:
        g[i] = row(i, "g_" + i, ["train_c100"])
    for i in om["r2_nonreserved"]:
        g[i] = row(i, "g_" + i, ["r2"])
    for i in ("x1", "x2"):
        g[i] = row(i, "g_" + i, ["train_restored"])
    for i in om["r2_reserved"]:
        g[i] = row(i, "g_" + i, ["r2"], reserved=True)
    g["c1"] = row("c1", "g_c1", ["cal_cand"], cal=True)
    for i in ("f1", "s1", "a1"):
        g[i] = row(i, "g_" + i, ["guard_eval"])
    for i in ("t1", "t2"):
        g[i] = row(i, "g_" + i, ["t1"])
    spec = {"expected_parts": {"B": 3, "r2_nonreserved": 2}, "expected_count": 5, "roles_allowed": ["train_c100", "r2"]}
    return spec, om, g


spec, om, gt = fixture()
ids, ch, rep = D.f_membership(spec, om, gt, NF)
check("F rule: the synthetic F is B union r2_nonreserved (5 ids), every hard check passes", ids == sorted(om["B"] + om["r2_nonreserved"]) and not failing(ch), failing(ch))
check("F rule: |F| = |B| + |r2_nonreserved| and zero restored-only members", len(ids) == 5 and not set(ids) & {"x1", "x2"})

s2, o2, g2 = fixture()
o2["r2_nonreserved"] = o2["r2_nonreserved"] + ["r1"]
s2["expected_parts"]["r2_nonreserved"], s2["expected_count"] = 3, 6
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: a reserved r2 message inserted into F fails (M6, M9b), before any training", {"M6", "M9b"} <= failing(c) and "r1" in detail(c, "M6"), failing(c))

s2, o2, g2 = fixture()
o2["r2_nonreserved"] = o2["r2_nonreserved"] + ["x1"]
s2["expected_parts"]["r2_nonreserved"], s2["expected_count"] = 3, 6
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: a restored-only message inserted into F fails (M4, M9a, M5)", {"M4", "M9a", "M5"} <= failing(c) and "x1" in detail(c, "M4"), failing(c))

s2, o2, g2 = fixture()
g2["x1"]["roles"] = ["r2"]
o2["r2_nonreserved"] = o2["r2_nonreserved"] + ["x1"]
s2["expected_parts"]["r2_nonreserved"], s2["expected_count"] = 3, 6
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: a restored-only id in F is caught by M4/M5 even when the groups table calls it r2", {"M4", "M5"} <= failing(c), failing(c))

s2, o2, g2 = fixture()
o2["r2_nonreserved"] = o2["r2_nonreserved"] + ["b1"]
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: duplicate membership (an id in both B and r2_nonreserved) fails (M2)", "M2" in failing(c) and "b1" in detail(c, "M2"), failing(c))

s2, o2, g2 = fixture()
o2["B"] = o2["B"] + ["b1"]
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: an id twice in one membership file fails (M0-B)", "M0-B" in failing(c), failing(c))

s2, o2, g2 = fixture()
o2["r2_nonreserved"] = o2["r2_nonreserved"] + ["zz-unknown"]
s2["expected_parts"]["r2_nonreserved"], s2["expected_count"] = 3, 6
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: an unknown id (no row in the groups table) fails (M1)", "M1" in failing(c) and "zz-unknown" in json.dumps(detail(c, "M1")), failing(c))

s2, o2, g2 = fixture()
g2["b1"]["fold"] = (g2["b1"]["fold"] + 1) % NF
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: a message whose fold differs from SHA256(group_key) % 5 fails (M10)", "M10" in failing(c), failing(c))

s2, o2, g2 = fixture()
g2["b2"]["group_key"] = "g_shared"
g2["b3"]["group_key"] = "g_shared"
g2["b3"]["fold"] = (mnd.sha256_mod("g_shared", NF) + 1) % NF
g2["b2"]["fold"] = mnd.sha256_mod("g_shared", NF)
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: a group moved between folds (two members, two folds) fails (M10: split group)", "M10" in failing(c) and detail(c, "M10")["split_groups"] == ["g_shared"], detail(c, "M10"))

s2, o2, g2 = fixture()
g2["n1"]["group_key"] = "g_c1"
g2["n1"]["fold"] = mnd.sha256_mod("g_c1", NF)
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: an F message sharing a group with a calibration message fails (L2)", "L2" in failing(c) and detail(c, "L2") == ["g_c1"], failing(c))

s2, o2, g2 = fixture()
g2["n1"]["group_key"] = "g_r1"
g2["n1"]["fold"] = mnd.sha256_mod("g_r1", NF)
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: an F message sharing a group with a reserved r2 message fails (L1)", "L1" in failing(c), failing(c))

s2, o2, g2 = fixture()
g2["n2"]["group_key"] = "g_t1"
g2["n2"]["fold"] = mnd.sha256_mod("g_t1", NF)
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: an F message sharing a group with t1_clean fails (L3)", "L3" in failing(c), failing(c))

s2, o2, g2 = fixture()
o2["r2_nonreserved"] = o2["r2_nonreserved"] + ["c1"]
s2["expected_parts"]["r2_nonreserved"], s2["expected_count"] = 3, 6
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: a calibration id inside F fails (M7)", "M7" in failing(c), failing(c))

s2, o2, g2 = fixture()
o2["B"] = o2["B"] + ["f1"]
s2["expected_parts"]["B"], s2["expected_count"] = 4, 6
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: a guard-evaluation id inside F fails (M8)", "M8" in failing(c), failing(c))

s2, o2, g2 = fixture()
o2["B"] = o2["B"][:-1]
_i, c, _r = D.f_membership(s2, o2, g2, NF)
check("probe: a wrong count (|B| and |F| differ from the declared) fails (M3a, M3b)", {"M3a", "M3b"} <= failing(c), failing(c))

s2, o2, g2 = fixture()
g2["n1"]["group_key"] = "g_f1"
g2["n1"]["fold"] = mnd.sha256_mod("g_f1", NF)
_i, c, rep = D.f_membership(s2, o2, g2, NF)
check("guard groups: a group shared with a guard-evaluation message is REPORTED (B baseline vs F), not a hard failure",
      not failing(c) and rep["F_guard_shared_groups"] == 1 and rep["B_guard_shared_groups"] == 0 and rep["r2_nonreserved_adds_guard_shared_groups"] == ["g_f1"], rep)

# ---------------------------------------------------------------- 2. the span-key leakage (synthetic messages)


def msg(i, text, spans=()):
    return {"id": i, "text": text, "wires": [{"span": s, "args": {}} for s in spans]}


byid = {m["id"]: m for m in (msg("b1", "Add a Box", ["Add a Box"]), msg("n1", "Hello  THERE", ["Hello there"]), msg("r1", "other", ["hello   there"]), msg("c1", "zzz", ["zzz"]))}
c = D.f_key_checks(byid, ["b1", "n1"], {"r2_reserved": ["r1"], "calibration": ["c1"], "B": ["b1"], "fresh2_test": [], "short3_test": [], "nl_a_development": []})
check("span keys: an F span equal (case and whitespace normalised) to a reserved r2 span fails (K1)", "K1" in failing(c) and "K2" not in failing(c), failing(c))

OM = {"r2_reserved": ["r1"], "calibration": ["c1"], "B": ["b1"], "fresh2_test": [], "short3_test": [], "nl_a_development": []}
for label, fmsg, rmsg, cid in (
        ("F whole text equals a reserved span", msg("n1", "Delete the Box", ["Delete"]), msg("r1", "zzz", ["delete the  box"]), "K1"),
        ("F span equals a reserved whole text", msg("n1", "other words", ["Delete the Box"]), msg("r1", "delete the box", ["q"]), "K1"),
        ("F whole text equals a calibration span", msg("n1", "Delete the Box", ["Delete"]), msg("c1", "zzz", ["DELETE THE BOX"]), "K2"),
        ("F span equals a calibration whole text", msg("n1", "other words", ["Delete the Box"]), msg("c1", "Delete  the box", ["q"]), "K2")):
    bm = {m["id"]: m for m in (msg("b1", "Add a Box", ["Add a Box"]), fmsg, rmsg, msg("r1" if cid == "K2" else "c1", "unrelated", ["unrelated"])) if m["id"] not in ("r1", "c1") or m is rmsg}
    bm.setdefault("r1", msg("r1", "unrelated r", ["unrelated r"]))
    bm.setdefault("c1", msg("c1", "unrelated c", ["unrelated c"]))
    c = D.f_key_checks(bm, ["b1", "n1"], OM)
    check(f"probe (cross direction): {label} fails ({cid})", cid in failing(c), failing(c))
guard = [msg("r1", "Make it Red", ["Make it Red"])]
check("verify keys: a trained span equal to a reserved whole text is a leak", D.rows_key_leak([{"text": "make   it red"}], [], [msg("r1", "Make it red", ["x"])]) == ["make it red"])
check("verify keys: a cut whole text equal to a reserved span is a leak", D.rows_key_leak([], [{"text": "Make it red"}], [msg("r1", "zzz", ["make it RED"])]) == ["make it red"])
check("verify keys: unrelated rows are not a leak", D.rows_key_leak([{"text": "move a"}], [{"text": "move a now"}], guard) == [])

# ---------------------------------------------------------------- 3. parents: a changed hash stops before anything is written
tmp = tempfile.mkdtemp(prefix="mfd-test-")
try:
    def mkfile(name, text):
        p = os.path.join(tmp, name)
        open(p, "w", encoding="utf8").write(text)
        return {"path": p, "sha256": D.sha256_file(p)}
    P = {"plan": mkfile("plan.md", "plan\n"), "plan_review": mkfile("review.md", "review\n"), "old_docs": [mkfile("old.md", "old\n")],
         "parents": {"protocol": mkfile("p.json", "{}"), "overlay": mkfile("ov.jsonl", ""), "membership": {"B": dict(mkfile("B.ids", "a\nb\n"), count=2)}},
         "tools": {"t.py": mkfile("t.py", "x=1\n")}}
    got = D.verify_parents(P)
    check("parents: every pinned file hashes as recorded", len(got) == 7)
    for label, mut in (("the plan", lambda: open(P["plan"]["path"], "a").write("edit\n")), ("an overlay", lambda: open(P["parents"]["overlay"]["path"], "a").write("{}\n")),
                       ("a source/tool file", lambda: open(P["tools"]["t.py"]["path"], "a").write("y=2\n")), ("a membership file", lambda: open(P["parents"]["membership"]["B"]["path"], "a").write("c\n"))):
        mut()
        try:
            D.verify_parents(P)
            ok = False
        except D.Stop as e:
            ok = "hash differs" in str(e) or "ids, the protocol says" in str(e)
        check(f"probe: an altered {label} hash stops with exit code 3", ok)
    P2 = copy.deepcopy(P)
    P2["plan"]["path"] = os.path.join(tmp, "gone.md")
    try:
        D.verify_parents(P2)
        ok = False
    except D.Stop as e:
        ok = "missing" in str(e) and e.code == 3
    check("parents: a missing pinned file stops", ok)

    # ------------------------------------------------------------ 4. the data-folder checks on tiny folders
    def tiny(root, rows=3):
        d = os.path.join(root, "data")
        os.makedirs(d)
        ids_ = [f"m{i}" for i in range(rows)]
        w = lambda n, rs: open(os.path.join(d, n), "w", encoding="utf8").write("".join(json.dumps(r) + "\n" for r in rs))
        w("train.jsonl", [{"id": i, "text": "t " + i} for i in ids_])
        w("cut_train.jsonl", [{"id": i, "text": "t " + i} for i in ids_])
        w("heldout.jsonl", [])
        w("cut_heldout.jsonl", [])
        w("eval_sample1000.jsonl", [{"id": ids_[0], "text": "t"}])
        w("eval_hand.jsonl", [{"id": "fh-1", "text": "x"}])
        json.dump({"output_contract": D.V2}, open(os.path.join(d, "reader.json"), "w"))
        man = D.trainer_manifest(d)
        return d, ids_, man

    def run_dir(mutate=None, rows=3):
        root = tempfile.mkdtemp(dir=tmp)
        d, ids_, man = tiny(root, rows)
        if mutate:
            mutate(d, ids_)
            man = dict(man, files=D.trainer_manifest(d)["files"])               # the manifest's file hashes are fixed up: only a content check can catch the mutation
        pr = []
        D.check_data_dir(d, man, ids_, {"sr2-1", "cal-1"}, {"sr2-1", "cal-1", "m0", "m1", "m2"}, pr)
        return pr
    check("data folder: a clean tiny folder passes", run_dir() == [], run_dir())

    def add_row(name, r):
        def f(d, _i):
            open(os.path.join(d, name), "a", encoding="utf8").write(json.dumps(r) + "\n")
        return f
    pr = run_dir(add_row("eval_hand.jsonl", {"id": "sr2-1", "text": "leak"}))
    check("probe: a reserved r2 id inside a data file fails verify's check, not just the file hash", any("reserved r2 or calibration ids" in p for p in pr) and not any("expect-manifest" in p for p in pr), pr)
    pr = run_dir(lambda d, i: open(os.path.join(d, "reader.json"), "w").write(json.dumps({"output_contract": D.V2, "note": ["x", {"y": "cal-1"}]})))
    check("probe: a calibration id anywhere in a non-row json file fails", any("reserved r2 or calibration ids" in p for p in pr), pr)

    def swap_cut(d, ids_):
        rs = [json.loads(l) for l in open(os.path.join(d, "cut_train.jsonl"))]
        rs[0]["id"] = "sr2-1"
        open(os.path.join(d, "cut_train.jsonl"), "w").write("".join(json.dumps(r) + "\n" for r in rs))
    pr = run_dir(swap_cut)
    check("probe: a reserved r2 message id in cut_train.jsonl fails (leak and outside F)", any("reserved r2 or calibration ids" in p for p in pr) and any("outside F" in p for p in pr), pr)
    pr = run_dir(add_row("train.jsonl", {"id": "x-not-f", "text": "y"}))
    check("probe: a trained row whose message id is not in F fails (outside F)", any("outside F" in p for p in pr), pr)
    pr = run_dir(add_row("heldout.jsonl", {"id": "m0", "text": "held"}))
    check("probe: a non-empty trainer held-out file fails", any("held-out" in p for p in pr), pr)
    pr = run_dir(add_row("eval_hand.jsonl", {"id": "cal-1", "text": "c"}))
    check("probe: a calibration id in an evaluation template file fails", any("reserved r2 or calibration ids" in p for p in pr), pr)
    pr = run_dir(lambda d, i: open(os.path.join(d, "notes.txt"), "w").write("x"))
    check("probe: an unexpected non-json file in the data folder fails", any("unexpected file" in p for p in pr), pr)
    # the manifest message count and the trainer's expect-manifest numbers
    root = tempfile.mkdtemp(dir=tmp)
    d, ids_, man = tiny(root)
    pr = []
    D.check_data_dir(d, dict(man, messages=man["messages"] + 1), ids_, set(), set(), pr)
    check("probe: a manifest whose message count differs from the folder fails the trainer's expect-manifest check", any("expect-manifest" in p and "messages" in p for p in pr), pr)
    pr = []
    D.check_data_dir(d, man, ids_ + ["m-extra"], set(), set(), pr)
    check("probe: the message count must equal |F|", any("!= |F|" in p for p in pr), pr)
    tm = D.trainer_manifest(d)
    check("trainer manifest: the three keys and *.json* file hashes of the folder (what --expect-manifest compares)", set(tm) == {"messages", "requests", "files"} and "reader.json" in tm["files"] and tm["messages"] == 3 and tm["requests"] == 3)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

# ---------------------------------------------------------------- 5. the CLI on the real inherited campaign (read only)
PROTO = os.path.join(HERE, "modernbert_forms_protocol.json")
have_old = os.path.isdir(D.OLD) and os.path.isfile(PROTO)
check("the old campaign folder and the static protocol are present (the CLI checks below need them)", have_old, D.OLD)
if have_old:
    T = tempfile.mkdtemp(prefix="mfd-cli-")
    try:
        P = json.load(open(PROTO, encoding="utf8"))
        out = os.path.join(T, "protocol")
        rc, text = cli(["freeze", "--protocol", PROTO, "--out", out])
        check("freeze: exit 0 on the real parents", rc == 0 and "F = 28330 messages" in text, text[-400:])
        F = D.read_ids(os.path.join(out, "membership", "F.ids"))
        mem = lambda n: set(D.read_ids(os.path.join(D.OLD, "protocol-v2", "membership", n + ".ids")))
        check("F union counts: 26,913 + 1,417 = 28,330 distinct ids, exactly B union r2_nonreserved", len(F) == len(set(F)) == 28330 and set(F) == mem("B") | mem("r2_nonreserved") and len(mem("B")) == 26913 and len(mem("r2_nonreserved")) == 1417)
        check("F: zero reserved r2 (580 excluded), zero restored-only (2,732 excluded), zero calibration members", not set(F) & mem("r2_reserved") and not set(F) & (mem("R") - mem("B")) and not set(F) & mem("calibration")
              and len(mem("r2_reserved")) == 580 and len(mem("R") - mem("B")) == 2732)
        frozen = json.load(open(os.path.join(out, "protocol.json"), encoding="utf8"))
        audit = json.load(open(os.path.join(out, "audit.json"), encoding="utf8"))
        check("freeze: no check failed; the guard-group and span-key comparisons are REPORT entries", not failing(audit["checks"]) and {"R1", "K3"} <= {c["id"] for c in audit["checks"] if c["status"] == "REPORT"})
        check("freeze: F pool 28,330 messages / 58,552 rows; desc:size huge reported THIN (9 requests / 9 groups)", frozen["pools"]["F"]["messages"] == 28330 and frozen["pools"]["F"]["produced_rows"] == 58552
              and audit["thin_cells"] == ["desc_size_huge_in_mention"] and audit["r2_required_cells"]["desc_size_huge_in_mention"]["requests"] == 9 and audit["r2_required_cells"]["desc_size_huge_in_mention"]["groups"] == 9)
        sup = {c["id"]: c["status"] for c in audit["checks"] if c["id"].startswith("old:S") or c["id"] == "S0"}
        check("support: calibration >= 100 groups, >= 10 per fold, three families, t1_clean, each form, clean create all PASS", len(sup) >= 15 and all(v in ("PASS", "REPORT") for v in sup.values()), sup)
        rc, text = cli(["freeze", "--protocol", PROTO, "--out", out])
        check("freeze: the same freeze into an existing identical output is accepted and writes nothing (exit 0)", rc == 0 and "already holds" in text, text[-300:])
        P2 = dict(P, budget=dict(P["budget"], max_trajectories=4))
        pp = os.path.join(T, "changed.json")
        json.dump(P2, open(pp, "w"))
        before = D.sha256_file(os.path.join(out, "protocol.json"))
        rc, text = cli(["freeze", "--protocol", pp, "--out", out])
        check("probe: an output directory whose identity changed (different protocol) is refused (exit 2), contents untouched", rc == 2 and "differs" in text and D.sha256_file(os.path.join(out, "protocol.json")) == before, text[-300:])
        for label, where in (("the old campaign folder", os.path.join(D.OLD, "forms-never-written")), ("the repository", os.path.join(D.REPO, "forms-never-written"))):
            rc, text = cli(["freeze", "--protocol", PROTO, "--out", where])
            check(f"never write: an output inside {label} is refused (exit 2) and nothing exists there", rc == 2 and not os.path.exists(where), text[-200:])
        for label, key_path in (("a parent plan hash", ("plan",)), ("the old protocol hash", ("parents", "protocol")), ("an overlay hash", ("parents", "overlay")),
                                ("a tool hash", ("tools", "make_roles.py")), ("the old groups table hash", ("parents", "groups")), ("a membership hash", ("parents", "membership", "B"))):
            Q = copy.deepcopy(P)
            e = Q
            for k in key_path:
                e = e[k]
            e["sha256"] = "0" * 64
            qp = os.path.join(T, "bad.json")
            json.dump(Q, open(qp, "w"))
            o2 = os.path.join(T, "o_" + label.replace(" ", "_"))
            rc, text = cli(["freeze", "--protocol", qp, "--out", o2])
            check(f"probe: an altered {label} stops the freeze before anything (exit 3, nothing written)", rc == 3 and not os.path.exists(o2) and not os.path.exists(o2 + ".building"), text[-250:])
        # an altered source data file: the old protocol (copied, one source hash changed, forms protocol re-pinned to the copy) no longer matches the files on disk
        cp = os.path.join(T, "oldcopy")
        shutil.copytree(os.path.join(D.OLD, "protocol-v2"), cp)
        OFc = json.load(open(os.path.join(cp, "protocol.json"), encoding="utf8"))
        OFc["protocol"]["sources"][0]["files"][0]["sha256"] = "1" * 64
        for r_, ds_, fs_ in os.walk(cp):                       # the old files are read-only; the copy is the test's own and must be removable
            os.chmod(r_, 0o755)
            for f_ in fs_:
                os.chmod(os.path.join(r_, f_), 0o644)
        json.dump(OFc, open(os.path.join(cp, "protocol.json"), "w"))
        Q = copy.deepcopy(P)
        Q["parents"]["protocol"] = {"path": os.path.join(cp, "protocol.json"), "sha256": D.sha256_file(os.path.join(cp, "protocol.json"))}
        qp = os.path.join(T, "srcalt.json")
        json.dump(Q, open(qp, "w"))
        o2 = os.path.join(T, "o_srcalt")
        rc, text = cli(["freeze", "--protocol", qp, "--out", o2])
        check("probe: a source data file whose hash differs from the old protocol's pin stops the freeze (exit 3, nothing written)", rc == 3 and not os.path.exists(o2) and not os.path.exists(o2 + ".building"), text[-300:])
        # a reserved r2 id inserted into the pinned r2_nonreserved membership (hash fixed up in the protocol): the old frozen protocol still pins the real file
        Q = copy.deepcopy(P)
        src = os.path.join(D.OLD, "protocol-v2", "membership", "r2_nonreserved.ids")
        bad_ids = os.path.join(T, "r2_nonreserved.ids")
        open(bad_ids, "w").write(open(src).read() + "sr2-00003\n")
        Q["parents"]["membership"]["r2_nonreserved"] = {"path": bad_ids, "sha256": D.sha256_file(bad_ids), "count": 1418}
        qp = os.path.join(T, "inject.json")
        json.dump(Q, open(qp, "w"))
        o2 = os.path.join(T, "o_inject")
        rc, text = cli(["freeze", "--protocol", qp, "--out", o2])
        check("probe: a reserved r2 message inserted into the membership (protocol hash fixed up) is refused before training (exit 3, nothing written)", rc == 3 and "differs" in text and not os.path.exists(o2), text[-250:])

        # build / verify
        data = os.path.join(T, "F")
        fz = os.path.join(out, "protocol.json")
        rc, text = cli(["build", "--protocol", fz, "--arm", "F", "--out", data])
        check("build: exit 0; 28,330 messages and 58,552 rows", rc == 0 and "28330 messages, 58552 rows" in text, text[-300:])
        h_before = {n: D.sha256_file(os.path.join(data, n)) for n in os.listdir(data)}
        h_before.update({sfx: D.sha256_file(data + sfx) for sfx in (".manifest.json", ".messages.jsonl", ".coverage.json")})
        rc, text = cli(["build", "--protocol", fz, "--arm", "F", "--out", data])
        h_after = {n: D.sha256_file(os.path.join(data, n)) for n in os.listdir(data)}
        h_after.update({sfx: D.sha256_file(data + sfx) for sfx in (".manifest.json", ".messages.jsonl", ".coverage.json")})
        check("build: an existing output is refused (exit 2) and every file keeps its hash", rc == 2 and "exists" in text and h_before == h_after, text[-200:])
        M = json.load(open(data + ".manifest.json", encoding="utf8"))
        check("build: manifest = trainer-compatible keys (messages 28,330, requests 58,552, files) and the F membership hash", M["messages"] == 28330 and M["requests"] == 58552 and "train.jsonl" in M["files"] and M["protocol"]["membership_sha256"] == frozen["membership"]["F"]["sha256"])
        gsrc = {json.loads(l)["id"]: json.loads(l)["source"] for l in open(os.path.join(D.OLD, "protocol-v2", "groups.jsonl"), encoding="utf8") if l.strip()}
        line_ids = [json.loads(l)["id"] for l in open(data + ".messages.jsonl", encoding="utf8") if l.strip()]
        rank = {d: i for i, d in enumerate(D.F_DIRS)}
        ranks = [rank[gsrc[i]] for i in line_ids]
        check("build: heldout files empty; the messages file has 28,330 lines in the declared folder order (first line in the first folder, the r2 folder after C100_FIRST and before the nl rounds, last line in the last folder)",
              M["heldout_rows"] == 0 and len(line_ids) == 28330 and ranks == sorted(ranks) and gsrc[line_ids[0]] == D.F_DIRS[0] and gsrc[line_ids[-1]] == D.F_DIRS[-1]
              and set(ranks) == set(range(len(D.F_DIRS))) and gsrc[line_ids[ranks.index(rank[mnd.R2_DIR])]] == mnd.R2_DIR, (gsrc[line_ids[0]], gsrc[line_ids[-1]]))
        covf = json.load(open(data + ".coverage.json", encoding="utf8"))
        check("coverage file: reserved r2, restored-only and calibration ids found in the data are measured (0) from every id of every row file", (covf["reserved_r2_ids_in_data"], covf["restored_only_ids_in_data"], covf["calibration_ids_in_data"]) == (0, 0, 0) and covf["ids_scanned"]["distinct_ids"] > 28330)
        cov = json.load(open(data + ".coverage.json", encoding="utf8"))["cells_F_vs_old"]
        check("coverage: undo with count 19, redo with count 20, outline question rows 52, gold label empty 202, desc:size huge 9", (cov["undo with count in gold"]["F"], cov["redo with count in gold"]["F"], cov["outline question rows (property=outline)"]["F"], cov["gold label empty"]["F"], cov["desc:size=huge"]["F"]) == (19, 20, 52, 202, 9), cov)
        rc, text = cli(["verify", "--protocol", fz, "--data", data])
        check("verify: accepts the real F build (exit 0)", rc == 0 and "verify ok" in text, text[-400:])

        def mutated(label, fn, expect, forbid=()):
            d2 = os.path.join(T, "m_" + label)
            shutil.copytree(data, d2)
            shutil.copy(data + ".messages.jsonl", d2 + ".messages.jsonl")
            Mm = json.load(open(data + ".manifest.json", encoding="utf8"))
            fn(d2, Mm)
            Mm["files"] = D.trainer_manifest(d2)["files"]                    # the file hashes are fixed up: only the content checks can catch the mutation
            json.dump(Mm, open(d2 + ".manifest.json", "w"))
            rc, text = cli(["verify", "--protocol", fz, "--data", d2])
            shutil.rmtree(d2, ignore_errors=True)
            return rc == 1 and all(x in text for x in expect) and not any(x in text for x in forbid), text[-400:]

        def inject_reserved(d2, _m):
            open(os.path.join(d2, "eval_hand.jsonl"), "a", encoding="utf8").write(json.dumps({"id": "sr2-00003", "text": "leaked"}) + "\n")
        ok, t = mutated("reserved", inject_reserved, ["reserved r2 or calibration ids in the data folder"], ["expect-manifest"])
        check("probe: a reserved r2 id inserted into a data file of the real build fails verify (hash fixed up; only the id check can catch it)", ok, t)

        def swap_row(d2, _m):
            rs = [json.loads(l) for l in open(os.path.join(d2, "cut_train.jsonl"), encoding="utf8")]
            rs[0]["id"] = "sr2-00003"
            open(os.path.join(d2, "cut_train.jsonl"), "w", encoding="utf8").write("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rs))
        ok, t = mutated("swaprow", swap_row, ["message ids outside F"])
        check("probe: a reserved r2 message id in a trained cut row fails verify", ok, t)

        def heldout(d2, _m):
            open(os.path.join(d2, "heldout.jsonl"), "a", encoding="utf8").write(json.dumps({"id": "fh-0001"}) + "\n")
        ok, t = mutated("heldout", heldout, ["held-out"])
        check("probe: a non-empty trainer held-out file fails verify", ok, t)

        def layout(d2, _m):
            rd = json.load(open(os.path.join(d2, "reader.json"), encoding="utf8"))
            rd["number_words_extra"] = {"leak": 9}
            json.dump(rd, open(os.path.join(d2, "reader.json"), "w"))
        ok, t = mutated("layout", layout, ["does not reproduce the data folder"])
        check("probe: a layout (reader.json) not derived from the saved F messages fails verify", ok, t)

        def reserialize(d2, Mm):
            pth = d2 + ".messages.jsonl"
            lines = open(pth, encoding="utf8").read().split("\n")
            for k, l in enumerate(lines):
                if l.strip():
                    alt = json.dumps(json.loads(l), ensure_ascii=True, separators=(",", ":"))
                    if alt != l:
                        lines[k] = alt
                        break
            else:
                raise AssertionError("no line to reserialize")
            open(pth, "w", encoding="utf8").write("\n".join(lines))
            Mm["messages_file"]["sha256"] = D.sha256_file(pth)
        ok, t = mutated("reserialize", reserialize, ["not byte-identical to their source line"], ["differ from source rows"])
        check("probe: a messages line re-serialized to equal JSON but different bytes fails verify's byte-identity check (hash fixed up)", ok, t)
        ex = json.load(open(os.path.join(out, "audit.json"), encoding="utf8"))["exposure"]
        ur, ta = ex["t1_all_undo_redo_count"], ex["t1_all"]
        check("exposure: undo/redo population: 28 messages, 3 in groups shared with B vs 13 with F; t1_all B 19 vs F 162 (reviewer's measured numbers); every _clean population 0 groups with F",
              (ur["messages"], ur["messages_in_groups_shared_with_B"], ur["messages_in_groups_shared_with_F"], ta["groups_shared_with_B"], ta["groups_shared_with_F"]) == (28, 3, 13, 19, 162)
              and all(v["groups_shared_with_F"] == 0 for n, v in ex.items() if n.endswith("_clean") or n.startswith("t1_clean")) and "X1" not in failing(audit["checks"]), (ur, ta))

        def text_edit(d2, _m):
            pth = d2 + ".messages.jsonl"
            s = open(pth, encoding="utf8").read()
            open(pth, "w", encoding="utf8").write(s.replace('"text": "', '"text": "x', 1) if '"text": "' in s else s.replace('"text":"', '"text":"x', 1))
        def text_edit_manifest(d2, Mm):
            text_edit(d2, Mm)
            Mm["messages_file"]["sha256"] = D.sha256_file(d2 + ".messages.jsonl")
        ok, t = mutated("textedit", text_edit_manifest, ["differ from source rows"])
        check("probe: a message text altered in the saved messages file fails verify (messages-file hash fixed up)", ok, t)
    finally:
        shutil.rmtree(T, ignore_errors=True)

check("the old campaign folder was never written by the tests (no forms-never-written entry)", not os.path.exists(os.path.join(D.OLD, "forms-never-written")))
print(f"executed checks: {executed}")
if executed == 0:
    print("FAILED: no check ran")
    sys.exit(1)
print("FAILED (%d)" % fails if fails else "PASS")
sys.exit(1 if fails else 0)
