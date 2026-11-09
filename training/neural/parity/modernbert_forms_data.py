#!/usr/bin/env python3
"""modernbert_forms_data.py: freeze, build and verify the data of the ModernBERT-forms campaign
(reports/modernbert-forms-plan-2026-11-08_codex.md, "Frozen data", "Proposed command interfaces", "Data flow").

  python3 -B training/neural/parity/modernbert_forms_data.py discover --out FILE      (writes the static protocol with every parent hash; a helper)
  python3 -B training/neural/parity/modernbert_forms_data.py freeze   --protocol FILE --out DIR
  python3 -B training/neural/parity/modernbert_forms_data.py build    --protocol DIR/protocol.json --arm F --out DIR
  python3 -B training/neural/parity/modernbert_forms_data.py verify   --protocol DIR/protocol.json --data DIR

F = the old campaign's membership/B.ids + membership/r2_nonreserved.ids (28,330 whole messages). The old groups, folds, calibration membership,
conservative clean populations and views are read from the old campaign ($OLD, read only) and never recomputed into a different split.
`freeze` takes the static protocol (modernbert_forms_protocol.json); `build` and `verify` take the frozen protocol.json a freeze wrote.

verify reads the data folder; it creates and removes one temporary sibling DATA.verify-tmp (make_roles re-run). freeze accepts an existing output only when it is
byte-identical to what it would write; build refuses any existing path.

Exit codes: 0 every check passed; 1 a freeze/verify check failed (nothing written by freeze); 2 usage, an output that exists, lies in the repository or in $OLD
(nothing written); 3 identity failure: a parent, source, tool or membership hash differs from the protocol (nothing written).
Outputs are deterministic (no timestamps, no absolute paths). Stdlib only; the old tool modernbert_next_data.py is imported, never edited.
"""
import argparse, collections, glob, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import modernbert_next_data as mnd                                     # noqa: E402  (read-only parent tool)

Stop = mnd.Stop


class Refuse(Stop):
    """usage or an unsafe/existing output path (exit 2, nothing written)"""
    code = 2


REPO, SK, CACHE = mnd.REPO, mnd.SK, mnd.CACHE
CAMPAIGN = "modernbert-forms-2026-11-08"
PROTOCOL_VERSION = "modernbert-forms-protocol-v1"
FROZEN_VERSION = "modernbert-forms-frozen-v1"
BUILD_VERSION = "modernbert-forms-build-v1"
OLD = os.path.join(CACHE, "next-2026-11-08")                           # read only, never written
V2 = mnd.V2
EXPECTED_F = 28330                                                      # 26,913 + 1,417
# the deterministic source order of F (plan "Frozen data"): C100_OLD + C100_FIRST + [R2_DIR] + C100_NL + C100_SAMPLE, existing constants
F_DIRS = mnd.C100_OLD + mnd.C100_FIRST + [mnd.R2_DIR] + mnd.C100_NL + mnd.C100_SAMPLE
OLD_MEMBERSHIPS = ("B", "R", "S", "calibration", "r2_reserved", "r2_nonreserved", "t1_clean", "t1_all", "fresh2_test", "short3_test", "nl_a_development", "fresh2_test_other_drawings")
GUARD_FILES = ("fresh2_test", "short3_test", "nl_a_development")
TOOL_FILES = ("training/neural/parity/modernbert_next_data.py", "training/neural/make_roles.py", "training/neural/make_data.py", "docs/js/neural.js", "docs/js/logic.js",
              "training/neural/parity/LABEL_FIXES_L2.jsonl", "training/neural/sample1000_ids.txt")
PLAN_FILES = {"plan": "reports/modernbert-forms-plan-2026-11-08_codex.md", "plan_review": "reports/modernbert-forms-plan-review-2026-11-08_codex.md"}
OLD_DOCS = ("reports/modernbert-next-plan-2026-11-08_codex.md", "reports/modernbert-next-plan-review-2026-11-08_codex.md",
            "reports/modernbert-next-grouping-amendment-2026-11-08_codex.md", "reports/modernbert-next-grouping-amendment-review-2026-11-08_codex.md")
PARENT_FILES = {"protocol": "protocol-v2/protocol.json", "groups": "protocol-v2/groups.jsonl", "groups_multi": "protocol-v2/groups_multi.jsonl", "audit": "protocol-v2/audit.json",
                "overlay_changes": "protocol-v2/overlay_changes.json", "sha256sums": "protocol-v2/SHA256SUMS", "addendum": "frozen-lists/decision-rules-addendum.json",
                "views_manifest": "views/manifest.json"}
CAMPAIGN_ENV_DROP = ("EXTRA_DIRS", "ROLE_TOO_RICH", "NUM_WORDS", "LABEL_FIXES", "IMPLIED_SCALE", "ALSO_DIRS", "PYTHONHASHSEED")


# ---------------------------------------------------------------- small helpers

def sha256_file(p):
    return mnd.sha256_file(p)


def sha256_bytes(b):
    return mnd.sha256_bytes(b)


def read_ids(path):
    return [i for i in open(path, encoding="utf8").read().split("\n") if i]


def ref_path(ref):
    """a reference {path, base?} -> absolute path. base 'repo' = the repository; default = the cache folder; an absolute path stays as it is (tests)"""
    return os.path.join(REPO if ref.get("base") == "repo" else CACHE, ref["path"])


def real_inside(path, root):
    p, r = os.path.realpath(path), os.path.realpath(root)
    return p == r or p.startswith(r + os.sep)


def guard_out(out, what="output"):
    """exit-2 conditions of an output path: inside the repository, inside $OLD, or existing"""
    for root, name in ((REPO, "the repository"), (OLD, "the old campaign folder ($OLD, read only)")):
        if real_inside(out, root):
            raise Refuse(f"modernbert_forms_data: {out} is inside {name}: {what} goes elsewhere")


def refuse_existing(paths):
    for p in paths:
        if os.path.exists(p):
            raise Refuse(f"modernbert_forms_data: {p} exists: outputs go to a new path (nothing written)")


# ---------------------------------------------------------------- the static protocol (a helper writes it; a freeze consumes it)

def build_static_protocol():
    def entry(rel, base=None, **kw):
        p = os.path.join(REPO if base == "repo" else CACHE, rel)
        e = {"path": rel, "sha256": sha256_file(p)}
        if base:
            e["base"] = base
        e.update(kw)
        return e
    old_rel = "next-2026-11-08/"
    OP = json.load(open(os.path.join(OLD, "protocol-v2", "protocol.json"), encoding="utf8"))["protocol"]
    mem = {}
    for n in OLD_MEMBERSHIPS:
        p = os.path.join(OLD, "protocol-v2", "membership", n + ".ids")
        mem[n] = entry(old_rel + f"protocol-v2/membership/{n}.ids", count=len(read_ids(p)))
    parents = {k: entry(old_rel + v) for k, v in PARENT_FILES.items()}
    parents["membership"] = mem
    parents["overlay"] = entry(OP["overlay"], "repo")
    return {
        "version": PROTOCOL_VERSION, "campaign": CAMPAIGN, "date": "2026-11-08",
        "about": "ModernBERT forms: F = B + nonreserved synth_short_r2 whole messages (plan section 'Frozen data'); the old campaign's split is consumed read-only",
        "plan": entry(PLAN_FILES["plan"], "repo"), "plan_review": entry(PLAN_FILES["plan_review"], "repo"),
        "old_docs": [entry(d, "repo") for d in OLD_DOCS],
        "old_root": "next-2026-11-08", "parents": parents,
        "tools": {os.path.basename(t): entry(t, "repo") for t in TOOL_FILES},
        "f_rule": {"name": "F", "union": ["B", "r2_nonreserved"], "disjoint": True, "expected_count": EXPECTED_F,
                   "expected_parts": {"B": len(read_ids(os.path.join(OLD, "protocol-v2", "membership", "B.ids"))),
                                      "r2_nonreserved": len(read_ids(os.path.join(OLD, "protocol-v2", "membership", "r2_nonreserved.ids")))},
                   "excluded": ["r2_reserved", "restored_only (R minus B)", "calibration", "t1_all", "guard evaluation (fresh2_test, short3_test, nl_a_development)"],
                   "source_order": F_DIRS, "roles_allowed": ["train_c100", "r2"], "contract": V2,
                   "note": "nothing is recomputed: groups, folds, calibration, views and conservative exclusions are the old campaign's"},
        "support": {k: OP["support"][k] for k in ("calibration_groups_min", "calibration_groups_per_fold_min", "family_min_groups", "t1_clean_requests_min", "t1_clean_groups_min",
                                                  "form_requests_min", "form_groups_min", "clean_create_groups_min", "r2_cell_min_requests", "r2_cell_thin_requests")},
        "required_r2_cells": list(mnd.CELLS),
        "budget": {"max_trajectories": 3, "trajectories": ["F-s0", "B-s1", "F-s1"], "restart_or_replacement": False},
        "comparisons": [{"id": "F1", "candidate": "F-s0", "comparator": "B-s0"}, {"id": "F3", "candidate": "F-s0", "comparator": "B-s0", "also": "C100 (common protocol)"},
                        {"id": "P3", "candidate": "B-s1", "comparator": "C100-s1", "guard": "G"}, {"id": "F4", "candidate": "F-s1", "comparator": "B-s1"}],
    }


# ---------------------------------------------------------------- parents and tools: hash everything before anything else

def parent_refs(P):
    """every {name: ref} the static protocol pins"""
    refs = {"plan": P["plan"], "plan_review": P["plan_review"]}
    for i, e in enumerate(P["old_docs"]):
        refs[f"old_doc[{i}]"] = e
    for k, e in P["parents"].items():
        if k == "membership":
            for n, m in e.items():
                refs[f"membership/{n}"] = m
        else:
            refs[k] = e
    for n, e in P["tools"].items():
        refs[f"tool/{n}"] = e
    return refs


def verify_parents(P):
    """hash every referenced parent file; Stop (exit 3) on any missing file or differing hash. Nothing is written. -> {name: sha256}"""
    bad, got = [], {}
    for name, ref in sorted(parent_refs(P).items()):
        p = ref_path(ref)
        if not os.path.isfile(p):
            bad.append(f"missing: {name} ({ref['path']})")
            continue
        h = sha256_file(p)
        got[name] = h
        if h != ref["sha256"]:
            bad.append(f"hash differs: {name} ({ref['path']}): {h[:12]} != {ref['sha256'][:12]}")
    for n, m in P["parents"]["membership"].items():
        p = ref_path(m)
        if os.path.isfile(p) and len(read_ids(p)) != m["count"]:
            bad.append(f"membership/{n}: {len(read_ids(p))} ids, the protocol says {m['count']}")
    if bad:
        raise Stop(f"parent identity: {len(bad)} mismatch(es):\n  " + "\n  ".join(bad[:40]))
    return got


def verify_views(P):
    """every file the old views manifest lists hashes as recorded (relative to the views folder)"""
    mp = ref_path(P["parents"]["views_manifest"])
    base = os.path.dirname(mp)
    M = json.load(open(mp, encoding="utf8"))
    bad, n = [], 0
    for v in M.get("views", []):
        if "file" in v and "sha256" in v:
            n += 1
            p = os.path.join(base, v["file"])
            if not os.path.isfile(p) or sha256_file(p) != v["sha256"]:
                bad.append(v["file"])
    if bad:
        raise Stop(f"old views changed or missing: {bad[:5]}")
    return n


def load_old(P):
    """the old frozen protocol (its membership files re-hashed by the old loader) -> (frozen, inner protocol, {name: ids})"""
    OF, OP, omem = mnd.load_frozen(ref_path(P["parents"]["protocol"]))
    for n in OLD_MEMBERSHIPS:
        if sorted(omem[n]) != sorted(read_ids(ref_path(P["parents"]["membership"][n]))):
            raise Stop(f"old frozen membership {n} differs from the file the forms protocol pins")
        if OF["membership"][n]["sha256"] != P["parents"]["membership"][n]["sha256"]:
            raise Stop(f"old frozen protocol's hash of membership {n} differs from the forms protocol's")
    return OF, OP, omem


def load_groups(path):
    rows = {}
    for n, line in enumerate(open(path, encoding="utf8"), 1):
        if not line.strip():
            continue
        r = json.loads(line)
        if r["id"] in rows:
            raise Stop(f"{path}:{n}: id {r['id']} twice in the groups table")
        rows[r["id"]] = r
    return rows


def tool_hashes_now(P):
    return {n: sha256_file(ref_path(e)) for n, e in P["tools"].items()}


# ---------------------------------------------------------------- F: pure membership checks

def chk(cid, name, ok, detail=None, status=None):
    return {"id": cid, "name": name, "status": status or ("PASS" if ok else "FAIL"), "detail": detail}


def f_membership(spec, omem, gtab, nfold):
    """F and every direct check on ids, folds and groups. Pure: inputs are the old membership lists and the old groups table.
    -> (sorted F ids, checks, report dict). A failing check is status FAIL; REPORT checks never fail."""
    checks = []
    for n, ids in sorted(omem.items()):
        checks.append(chk("M0-" + n, f"membership {n}: no duplicate id", len(ids) == len(set(ids)), len(ids) - len(set(ids))))
    known = {n: [i for i in ids if i not in gtab] for n, ids in omem.items()}
    unknown = {n: v[:5] for n, v in known.items() if v}
    checks.append(chk("M1", "every membership id has exactly one row in the old groups table (unknown ids fail)", not unknown, unknown))
    B, r2n = set(omem["B"]), set(omem["r2_nonreserved"])
    r2r, cal, R, S = set(omem["r2_reserved"]), set(omem["calibration"]), set(omem["R"]), set(omem["S"])
    guard = set().union(*(set(omem[g]) for g in GUARD_FILES))
    F = B | r2n
    restored_only = R - B
    checks.append(chk("M2", "B and r2_nonreserved are disjoint", not (B & r2n), sorted(B & r2n)[:5]))
    ep = spec["expected_parts"]
    checks.append(chk("M3a", f"|B| = {ep['B']} and |r2_nonreserved| = {ep['r2_nonreserved']}", (len(B), len(r2n)) == (ep["B"], ep["r2_nonreserved"]), (len(B), len(r2n))))
    checks.append(chk("M3b", f"|F| = {spec['expected_count']} distinct whole messages", len(F) == spec["expected_count"], len(F)))
    checks.append(chk("M4", "zero restored-only members (F and R minus B are disjoint)", not (F & restored_only), sorted(F & restored_only)[:5]))
    checks.append(chk("M5", "F = S minus (R minus B), exactly (independent identity from the old S)", F == S - restored_only, (len(F), len(S - restored_only))))
    checks.append(chk("M6", "F and r2_reserved are disjoint by id", not (F & r2r), sorted(F & r2r)[:5]))
    checks.append(chk("M7", "F and calibration are disjoint by id", not (F & cal), sorted(F & cal)[:5]))
    checks.append(chk("M8", "F and the guard-evaluation messages (fresh2 test, short3 test, nl_a development) are disjoint by id", not (F & guard), sorted(F & guard)[:5]))
    checks.append(chk("M8b", "F and t1_all are disjoint by id", not (F & set(omem["t1_all"])), sorted(F & set(omem["t1_all"]))[:5]))
    # per-id table rules (the table is the independent record of roles, reservation and calibration)
    bad_roles, bad_flags = [], []
    for i in sorted(F):
        r = gtab.get(i)
        if r is None:
            continue
        roles = set(r["roles"])
        if not (roles & set(spec["roles_allowed"])) or "train_restored" in roles or roles - set(spec["roles_allowed"]):
            bad_roles.append((i, sorted(roles)))
        if r.get("reserved_r2") or r.get("in_calibration"):
            bad_flags.append(i)
    checks.append(chk("M9a", "every F row of the groups table has roles within {train_c100, r2} (no restored, evaluation or excluded role)", not bad_roles, bad_roles[:5]))
    checks.append(chk("M9b", "no F row of the groups table is flagged reserved_r2 or in_calibration", not bad_flags, bad_flags[:5]))
    # the 'r2' role must be exactly r2_nonreserved, 'train_c100' exactly B
    by_role_b = {i for i in F if i in gtab and "train_c100" in gtab[i]["roles"]}
    by_role_r2 = {i for i in F if i in gtab and "r2" in gtab[i]["roles"]}
    checks.append(chk("M9c", "F members with role train_c100 = B and with role r2 = r2_nonreserved", by_role_b == B and by_role_r2 == r2n, (len(by_role_b), len(by_role_r2))))
    # folds: one fold per group, equal to SHA256(group_key) % nfold; a group moved between folds fails
    g_fold = collections.defaultdict(set)
    wrong = []
    for i, r in gtab.items():
        g_fold[r["group_key"]].add(r["fold"])
        if r["fold"] != mnd.sha256_mod(r["group_key"], nfold):
            wrong.append((i, r["fold"], mnd.sha256_mod(r["group_key"], nfold)))
    split = sorted(g for g, f in g_fold.items() if len(f) > 1)
    checks.append(chk("M10", f"folds: every message's fold = SHA256(group_key) % {nfold}, one fold per group (no group moved between folds)", not wrong and not split, {"wrong": wrong[:5], "split_groups": split[:5]}))
    # groups
    def g(ids):
        return {gtab[i]["group_key"] for i in ids if i in gtab}
    gF = g(F)
    checks.append(chk("L1", "F and r2_reserved share no group", not (gF & g(r2r)), sorted(gF & g(r2r))[:5]))
    checks.append(chk("L2", "F and calibration share no group", not (gF & g(cal)), sorted(gF & g(cal))[:5]))
    checks.append(chk("L3", "F and t1_clean share no group", not (gF & g(omem["t1_clean"])), sorted(gF & g(omem["t1_clean"]))[:5]))
    gg, gB = g(guard), g(B)
    delta = sorted((gF - gB) & gg)
    report = {"F_groups": len(gF), "F_messages": len(F), "guard_groups": len(gg), "B_guard_shared_groups": len(gB & gg), "F_guard_shared_groups": len(gF & gg),
              "r2_nonreserved_adds_guard_shared_groups": delta}
    checks.append(chk("R1", "REPORT: groups shared with a guard-evaluation message: B baseline vs F (the old freeze never required zero; reservation step 4 sends such r2 groups to nonreserved)",
                      True, report, status="REPORT"))
    return sorted(F), checks, report


# ---------------------------------------------------------------- F: text/span-key leakage (needs the message texts)

def span_keys(msgs):
    """every normalized whole text and complete annotated span as ONE untagged string set: a whole text equal to a span (or the reverse) is a match too"""
    s = set()
    for m in msgs:
        s.add(mnd.norm_text(m["text"]))
        for w in m["wires"]:
            if isinstance(w.get("span"), str) and w["span"].strip():
                s.add(mnd.norm_text(w["span"]))
    return s


def rows_key_leak(rows, cuts, guard_msgs):
    """the trained rows (request text = span) and cut texts of a data folder against the whole texts and spans of the guarded messages, untagged:
    span-vs-span, text-vs-text and both cross directions. -> sorted hits"""
    keys = span_keys(guard_msgs)
    return sorted(({mnd.norm_text(r["text"]) for r in rows} | {mnd.norm_text(c["text"]) for c in cuts}) & keys)


def f_key_checks(byid, F, omem):
    """normalized complete-span / whole-text keys of F against reserved r2 and calibration (hard, untagged: all four text/span directions) and the guard evaluation (report)"""
    out = []
    kF = span_keys([byid[i] for i in F])
    for cid, name in (("K1", "r2_reserved"), ("K2", "calibration")):
        k = span_keys([byid[i] for i in omem[name]])
        out.append(chk(cid, f"F and {name} share no normalized whole text or complete annotated span, in any direction (text/text, span/span, text/span, span/text)", not (kF & k), len(kF & k)))
    kg = span_keys([byid[i] for g in GUARD_FILES for i in omem[g]])
    kB = span_keys([byid[i] for i in omem["B"]])
    out.append(chk("K3", "REPORT: normalized texts/spans (untagged) shared with the guard evaluation: B baseline vs F (not required to be zero; inherited from C100)", True,
                   {"B": len(kB & kg), "F": len(kF & kg)}, status="REPORT"))
    return out


def exposure_report(P, omem, gtab):
    """REPORT rows (no membership change): group exposure of the frozen evaluation populations of the old views, B versus F, for the verdict to display.
    Every *_clean population must have zero F groups (hard). Population files are hashed against the old views manifest."""
    mp = ref_path(P["parents"]["views_manifest"])
    base = os.path.dirname(mp)
    M = json.load(open(mp, encoding="utf8"))
    g = lambda ids: {gtab[i]["group_key"] for i in ids if i in gtab}
    gB, gF = g(omem["B"]), g(set(omem["B"]) | set(omem["r2_nonreserved"]))
    pops = {}
    def add(name, ids):
        gs = g(ids)
        pops[name] = {"messages": len(ids), "unknown_ids": sum(1 for i in ids if i not in gtab), "groups": len(gs), "groups_shared_with_B": len(gs & gB), "groups_shared_with_F": len(gs & gF),
                      "messages_in_groups_shared_with_B": sum(1 for i in ids if i in gtab and gtab[i]["group_key"] in gB), "messages_in_groups_shared_with_F": sum(1 for i in ids if i in gtab and gtab[i]["group_key"] in gF)}
    bad = []
    for e in M.get("populations", []):
        p = os.path.join(base, e["file"])
        if not os.path.isfile(p) or sha256_file(p) != e["sha256"]:
            bad.append(e["file"])
            continue
        add(e["name"], sorted({json.loads(l)["id"] for l in open(p, encoding="utf8") if l.strip()}))
    if bad:
        raise Stop(f"old population files changed or missing: {bad[:5]}")
    add("t1_all", omem["t1_all"])
    clean_bad = {n: v["groups_shared_with_F"] for n, v in pops.items() if n.endswith("_clean") or n.startswith("t1_clean") and v["groups_shared_with_F"]}
    clean_bad = {n: c for n, c in clean_bad.items() if c}
    checks = [chk("X1", "every *_clean population (and every t1_clean_* population) shares no group with F", not clean_bad, clean_bad),
              chk("X2", "REPORT: group exposure of t1_all_undo_redo_count and t1_all, B baseline vs F (the verdict's F2 'exposure displayed'; no membership change)", True,
                  {n: pops[n] for n in ("t1_all_undo_redo_count", "t1_all") if n in pops}, status="REPORT")]
    return pops, checks


# ---------------------------------------------------------------- the pools of F (counts), taken from the analysis of the old protocol

def pool(msgs, ix, G, nreq, produced):
    return dict(messages=len(ix), requests=sum(nreq[i] for i in ix), produced_rows=sum(produced[i] for i in ix), groups=len({G["gkey"][i] for i in ix}),
                zero_request_messages=sum(1 for i in ix if nreq[i] == 0))


def support_checks(P, OP, A):
    """the intact support requirements of the plan, from the analysis of the (unchanged) old populations; thresholds must equal the declared ones"""
    out = []
    same = {k: OP["support"].get(k) for k in P["support"]} == P["support"]
    out.append(chk("S0", "the declared support thresholds equal the old protocol's", same, {k: (P["support"][k], OP["support"].get(k)) for k in P["support"] if OP["support"].get(k) != P["support"][k]}))
    for c in A["audit"]["checks"]:
        if re.match(r"^(S\d|G1|A2)", c["id"]):
            out.append(chk("old:" + c["id"], c["name"], c["status"] in ("PASS", "REPORT"), {"value": c.get("value"), "expected": c.get("expected")}, status=c["status"]))
    return out


def required_cells_report(P, A):
    """presence checks and the thin-coverage report of the required r2 cells in the nonreserved r2 messages that F trains on"""
    sup = P["support"]
    cells = A["audit"]["r2_coverage_cells"]
    rows, checks = {}, []
    for cell in P["required_r2_cells"]:
        c = cells[cell]["r2_nonreserved"]
        thin = c["requests"] < sup["r2_cell_thin_requests"]
        rows[cell] = dict(c, thin=thin, thin_below=sup["r2_cell_thin_requests"], C100=cells[cell]["C100"], r2_all=cells[cell]["r2_all"], r2_reserved=cells[cell]["r2_reserved"])
        checks.append(chk("C-" + cell, f"required r2 cell {cell}: present (>= {sup['r2_cell_min_requests']} request) in nonreserved r2" + ("; THIN (reported, not a failure)" if thin else ""),
                          c["requests"] >= sup["r2_cell_min_requests"], {"requests": c["requests"], "groups": c["groups"], "thin": thin}))
    return rows, checks


def analysis_consistency(A, omem, gtab):
    """the recomputation of the old analysis is a CHECK of the inherited files (never the split itself): it reproduces every membership list and every group key"""
    o = A["obj"]
    msgs = o["msgs"]
    ids = lambda ix: sorted(msgs[i]["id"] for i in ix)
    sel = lambda pred: ids([i for i, m in enumerate(msgs) if pred(m)])
    mem = o["mem"]
    recomputed = {"B": ids(mem["B"]), "R": ids(mem["R"]), "S": ids(mem["S"]), "calibration": ids(mem["calibration"]), "r2_reserved": ids(mem["r2_reserved"]),
                  "r2_nonreserved": ids(mem["r2_nonreserved"]), "t1_clean": ids(o["t1c"]), "t1_all": sel(lambda m: "t1" in m["roles"]), "fresh2_test": ids(o["f2test"]),
                  "short3_test": ids(o["s3test"]), "nl_a_development": sel(lambda m: m["source"] == "llm_bench/nl_a" and "guard_eval" in m["roles"]),
                  "fresh2_test_other_drawings": ids(o["lc_primary"])}
    diff = [n for n in OLD_MEMBERSHIPS if recomputed[n] != sorted(omem[n])]
    gk = {m["id"]: o["G"]["gkey"][i] for i, m in enumerate(msgs)}
    gdiff = [i for i, r in gtab.items() if gk.get(i) != r["group_key"]]
    return [chk("D1", "the old analysis, recomputed from the hashed sources, reproduces every inherited membership list (a check of the inheritance, not the split)", not diff, diff),
            chk("D2", "the recomputed group keys equal the inherited groups table, for every message", not gdiff and set(gk) == set(gtab), {"differ": gdiff[:5], "ids": (len(gk), len(gtab))})]


# ---------------------------------------------------------------- freeze

def static_protocol(path):
    P = json.load(open(path, encoding="utf8"))
    if P.get("version") != PROTOCOL_VERSION or P.get("campaign") != CAMPAIGN:
        raise Stop(f"{path}: not the {CAMPAIGN} static protocol ({PROTOCOL_VERSION})")
    return P


def freeze_outputs(P, proto_sha, ids, checks, sections, ctx):
    """every output file of a freeze as {relative name: text}: deterministic"""
    f_text = "".join(i + "\n" for i in ids)
    audit = {"version": FROZEN_VERSION, "campaign": CAMPAIGN, "checks": checks, **sections}
    audit_text = mnd.dumps(audit)
    frozen = dict(version=FROZEN_VERSION, kind="frozen", campaign=CAMPAIGN, static_protocol_sha256=proto_sha, protocol=P,
                  membership={"F": {"count": len(ids), "sha256": sha256_bytes(f_text.encode("utf8")), "file": "membership/F.ids"}},
                  parent_sha256=ctx["parents"], tool_sha256=ctx["tools"], source_files=ctx["source_files"], overlay=ctx["overlay"],
                  pools=sections["pools"], audit_sha256=sha256_bytes(audit_text.encode("utf8")),
                  checks=[{"id": c["id"], "status": c["status"]} for c in checks])
    files = {"membership/F.ids": f_text, "audit.json": audit_text, "protocol.json": mnd.dumps(frozen)}
    sums = "\n".join(f"{sha256_bytes(t.encode('utf8'))}  {n}" for n, t in sorted(files.items())) + "\n"
    files["SHA256SUMS"] = sums
    return files


def write_tree(out, files):
    tmp = out + ".building"
    os.mkdir(tmp)
    for n, t in files.items():
        p = os.path.join(tmp, n)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        mnd.write(p, t)
    os.rename(tmp, out)


def tree_equals(out, files):
    have = {}
    for root, _d, fs in os.walk(out):
        for f in fs:
            p = os.path.join(root, f)
            have[os.path.relpath(p, out)] = open(p, encoding="utf8").read()
    return have == files


def run_freeze_checks(P):
    """every parent hash first (Stop), then the F rule. -> (ids, checks, sections, ctx); checks may contain FAIL"""
    parents = verify_parents(P)
    n_views = verify_views(P)
    OF, OP, omem = load_old(P)
    srcs = mnd.verify_sources(OP)
    gtab = load_groups(ref_path(P["parents"]["groups"]))
    nfold = OP["reservation"]["fold_count"]
    ids, checks, rep = f_membership(P["f_rule"], omem, gtab, nfold)
    checks.append(chk("I1", "every parent, plan, old doc, membership file, tool and view hashes as the protocol pins them; old sources and inputs hash as the old protocol pins them (a mismatch stops with exit 3 before this row exists: reaching it is the pass)", True,
                      {"parents": len(parents), "views": n_views, "sources": srcs}))
    checks.append(chk("I2", "the declared source order equals C100_OLD + C100_FIRST + [R2_DIR] + C100_NL + C100_SAMPLE", P["f_rule"]["source_order"] == F_DIRS, len(F_DIRS)))
    overlay_path = ref_path(P["parents"]["overlay"])
    msgs, per, ov = mnd.load_universe(OP, overlay_path, apply=True)          # the overlay preconditions of the old tool, on every source message
    byid = {m["id"]: m for m in msgs}
    checks.append(chk("I3", "the frozen overlay applies with its existing preconditions (a failed precondition raises before this row; this row checks the overlay hash recorded)", ov["sha256"] == P["parents"]["overlay"]["sha256"], {"lines": ov["lines"], "changes": len(ov["changes"])}))
    checks.append(chk("I4", "every F id is a message of the sources", all(i in byid for i in ids), [i for i in ids if i not in byid][:5]))
    if all(i in byid for i in ids):
        checks += f_key_checks(byid, ids, omem)
    A = mnd.analyze(OP)
    bad_old = mnd.overall(A["audit"]["checks"])
    checks.append(chk("D0", "the old campaign's own audit checks (re-run on the unchanged sources) all pass", not bad_old, [(c["id"], c["status"]) for c in bad_old]))
    checks += analysis_consistency(A, omem, gtab)
    checks += support_checks(P, OP, A)
    exposure, exp_checks = exposure_report(P, omem, gtab)
    checks += exp_checks
    cells, cell_checks = required_cells_report(P, A)
    checks += cell_checks
    o = A["obj"]
    nreq = [sum(1 for w in m["wires"] if not mnd.is_pending(w)) for m in o["msgs"]]
    idx = {m["id"]: i for i, m in enumerate(o["msgs"])}
    fix = [idx[i] for i in ids if i in idx]
    Fpool = pool(o["msgs"], fix, o["G"], nreq, o["produced"])
    pools = {"F": Fpool,
             "B": pool(o["msgs"], [idx[i] for i in omem["B"]], o["G"], nreq, o["produced"]),
             "r2_nonreserved": pool(o["msgs"], [idx[i] for i in omem["r2_nonreserved"]], o["G"], nreq, o["produced"]),
             "restored_only_excluded": pool(o["msgs"], [idx[i] for i in sorted(set(omem["R"]) - set(omem["B"]))], o["G"], nreq, o["produced"]),
             "r2_reserved_excluded": pool(o["msgs"], [idx[i] for i in omem["r2_reserved"]], o["G"], nreq, o["produced"]),
             "calibration": A["audit"]["pools"]["calibration_final"], "t1_clean": A["audit"]["pools"]["t1_clean"]}
    sections = {"pools": pools, "guard_group_report": rep, "r2_required_cells": cells, "calibration": A["audit"]["calibration"],
                "t1_clean": A["audit"]["t1_clean"], "old_audit_sha256": parents.get("audit"), "exposure": exposure,
                "source_order": F_DIRS, "thin_cells": sorted(c for c, v in cells.items() if v["thin"])}
    files = sorted({f["path"] for s in OP["sources"] if s["id"] in F_DIRS for f in s["files"]})
    shas = {f["path"]: f["sha256"] for s in OP["sources"] if s["id"] in F_DIRS for f in s["files"]}
    ctx = {"parents": parents, "tools": tool_hashes_now(P), "source_files": {p: shas[p] for p in files},
           "overlay": {"file": P["parents"]["overlay"]["path"], "sha256": ov["sha256"], "lines": ov["lines"], "changes": len(ov["changes"])}}
    return ids, checks, sections, ctx


def cmd_freeze(a):
    P = static_protocol(a.protocol)
    out = os.path.abspath(a.out)
    guard_out(out, "a freeze")
    if not os.path.isdir(os.path.dirname(out)):
        raise Refuse(f"modernbert_forms_data: the parent of {out} does not exist")
    if os.path.exists(out + ".building"):
        raise Refuse(f"modernbert_forms_data: {out}.building exists (an interrupted freeze): not touched")
    ids, checks, sections, ctx = run_freeze_checks(P)
    bad = [c for c in checks if c["status"] in ("FAIL", "UNAVAILABLE")]
    if bad:
        print(f"freeze REFUSED: {[(c['id'], c['status'], c['detail']) for c in bad]}; nothing written", file=sys.stderr)
        return 1
    files = freeze_outputs(P, sha256_file(a.protocol), ids, checks, sections, ctx)
    if os.path.exists(out):
        if os.path.isdir(out) and tree_equals(out, files):
            print(f"freeze: {out} already holds this exact freeze; nothing written")
            return 0
        raise Refuse(f"modernbert_forms_data: {out} exists and differs from this freeze (changed protocol, parent or code): refused, nothing written")
    write_tree(out, files)
    n_report = sum(1 for c in checks if c["status"] == "REPORT")
    print(f"freeze: ok; F = {len(ids)} messages ({sections['pools']['F']['produced_rows']} rows); {len(checks)} checks, {n_report} report-only, thin cells {sections['thin_cells']}; wrote {out}")
    return 0


def cmd_discover(a):
    out = os.path.abspath(a.out)
    if out != os.path.join(HERE, "modernbert_forms_protocol.json"):      # the static protocol itself is the one output that belongs in the repository
        guard_out(out, "the protocol")
    if os.path.exists(out):
        raise Refuse(f"modernbert_forms_data: {out} exists: not overwritten")
    mnd.write(out, mnd.dumps(build_static_protocol()))
    print(f"discover: wrote {out}")
    return 0


# ---------------------------------------------------------------- the frozen protocol

def load_frozen_forms(path):
    """the frozen protocol.json of a freeze -> (frozen, static protocol, F ids). F.ids is re-hashed; every parent and tool hash is re-checked"""
    FZ = json.load(open(path, encoding="utf8"))
    if FZ.get("kind") != "frozen" or FZ.get("version") != FROZEN_VERSION or FZ.get("campaign") != CAMPAIGN:
        raise Stop(f"{path}: not a frozen protocol of {FROZEN_VERSION} (use the protocol.json a freeze wrote)")
    base = os.path.dirname(os.path.abspath(path))
    e = FZ["membership"]["F"]
    p = os.path.join(base, e["file"])
    if not os.path.isfile(p):
        raise Stop(f"frozen membership file missing: {p}")
    data = open(p, "rb").read()
    if sha256_bytes(data) != e["sha256"]:
        raise Stop("frozen membership file changed: " + e["file"])
    ids = [i for i in data.decode("utf8").split("\n") if i]
    if len(ids) != e["count"] or len(set(ids)) != len(ids):
        raise Stop(f"frozen membership file {e['file']}: {len(ids)} ids ({len(set(ids))} distinct), the protocol says {e['count']}")
    P = FZ["protocol"]
    parents = verify_parents(P)
    if parents != FZ["parent_sha256"]:
        raise Stop("a parent file differs from the frozen record")
    if tool_hashes_now(P) != FZ["tool_sha256"]:
        raise Stop("a tool file differs from the frozen record")
    if len(ids) != P["f_rule"]["expected_count"]:
        raise Stop(f"F has {len(ids)} ids, the protocol declares {P['f_rule']['expected_count']}")
    return FZ, P, ids


# ---------------------------------------------------------------- build

def messages_file_text(OP, F_ids, msgs, dirs):
    """F's whole messages, one JSON object per line, in the order `dirs`, then each folder's files and lines. The raw source line is kept when no overlay line
    touches the message, else the source row with the changed args (old key order kept). -> (text, ids in order, {folder: ids}, {id: changed wire indices})"""
    want = set(F_ids)
    byid = {m["id"]: m for m in msgs}
    changed = {}
    srcs = {s["id"]: s for s in OP["sources"]}
    out, order, by_src, seen = [], [], collections.defaultdict(list), set()
    for d in dirs:
        for f in srcs[d]["files"]:
            if f["use"] != "rows":
                continue
            with open(os.path.join(SK, f["path"]), encoding="utf8", newline="") as fh:
                for line in fh:
                    if not line.strip():
                        continue
                    row = json.loads(line)
                    mid = row["id"]
                    if mid not in want:
                        continue
                    if mid in seen:
                        raise Stop(f"message id {mid} twice in the sources of F")
                    seen.add(mid)
                    m = byid[mid]
                    ws = row.get("wires") or []
                    diff = [j for j, w in enumerate(ws) if not mnd.is_pending(w) and mnd.canon(w.get("args", {})) != mnd.canon(m["wires"][j].get("args", {}))]
                    if diff:
                        for j in diff:
                            ws[j]["args"] = mnd._overlaid_args(ws[j].get("args", {}), m["wires"][j]["args"])
                        text = json.dumps(row, ensure_ascii=False)
                        changed[mid] = diff
                    else:
                        text = line.rstrip("\n").rstrip("\r")
                    out.append(text)
                    order.append(mid)
                    by_src[d].append(mid)
    if set(order) != want or len(order) != len(want):
        raise Stop(f"the sources give {len(order)} of the {len(want)} F ids: missing {sorted(want - set(order))[:5]}")
    return "".join(t + "\n" for t in out), order, by_src, changed


def beside(out):
    return {"manifest": out + ".manifest.json", "messages": out + ".messages.jsonl", "log": out + ".build.log", "coverage": out + ".coverage.json"}


def make_roles_env():
    env = {k: v for k, v in os.environ.items() if k not in CAMPAIGN_ENV_DROP}
    env.update(mnd.recipe_env(V2))
    return env


def run_make_roles(messages, out_dir):
    cmd = mnd.make_roles_cmd(messages, out_dir, V2)
    return subprocess.run(cmd, env=make_roles_env(), capture_output=True, text=True)


def extra_dirs_of():
    return [d for d in F_DIRS if d not in mnd.C100_OLD and d not in mnd.C100_SAMPLE]


def old_total(name):
    """the output coverage totals of an old arm's manifest (read only), or None"""
    p = os.path.join(OLD, "data", name + ".manifest.json")
    if not os.path.isfile(p):
        return None
    M = json.load(open(p, encoding="utf8"))
    return {"manifest_sha256": sha256_file(p), "messages": M["messages"], "requests": M["requests"], "total": M["coverage"]["output"]["total"]}


COVERAGE_KEYS = ("rows", "rows undo", "rows redo", "undo with count in gold", "redo with count in gold", "undo count tagged", "outline question rows (property=outline)", "gold label empty",
                 "desc:size=huge", "desc:size=large", "desc:size=small", "desc:size=tiny", "fill:target=unresolved", "fill:from=unresolved", "fill:to=unresolved", "fill:anchor=unresolved",
                 "outline class value on a create row", "outline class value on a set row")


def cmd_build(a):
    FZ, P, ids = load_frozen_forms(a.protocol)
    out = os.path.abspath(a.out)
    guard_out(out, "data")
    b = beside(out)
    refuse_existing([out, out + ".building", out + ".failed"] + list(b.values()))
    if not os.path.isdir(os.path.dirname(out)):
        raise Refuse(f"modernbert_forms_data: the parent of {out} does not exist")
    OF, OP, omem = load_old(P)
    mnd.verify_sources(OP)
    overlay_path = ref_path(P["parents"]["overlay"])
    if sha256_file(overlay_path) != FZ["overlay"]["sha256"]:
        raise Stop("the overlay changed since the freeze")
    msgs, per, ov = mnd.load_universe(OP, overlay_path, apply=True)
    byid = {m["id"]: m for m in msgs}
    # preconditions before any file is written: every F message is a C100 or nonreserved r2 message; no reserved r2 / calibration / evaluation id
    reserved, cal = set(omem["r2_reserved"]), set(omem["calibration"])
    if set(ids) & (reserved | cal):
        raise Stop("F holds a reserved r2 or calibration id")
    if any(i not in byid or not (byid[i]["roles"] <= {"train_c100", "r2"}) for i in ids):
        raise Stop("F holds a message that is not a C100 or r2 message")
    mtext, order, by_src, changed = messages_file_text(OP, ids, msgs, F_DIRS)
    with open(b["messages"], "w", encoding="utf8", newline="\n") as f:
        f.write(mtext)
    r = run_make_roles(b["messages"], out + ".building")
    mnd.write(b["log"], r.stdout + ("\n--- stderr ---\n" + r.stderr if r.stderr else ""))
    if r.returncode != 0:
        if os.path.isdir(out + ".building"):
            os.rename(out + ".building", out + ".failed")
        raise Stop(f"make_roles.py failed (exit {r.returncode}); see {b['log']}; {r.stderr.strip().splitlines()[-1] if r.stderr.strip() else ''}")
    acts = set(mnd.acts_from_neural_js())
    in_arm = [byid[i] for i in order]
    ti = mnd.trigger_inventory(in_arm, acts, extra_dirs_of())
    mnd.write(os.path.join(out + ".building", "trigger_inventory.json"), json.dumps(ti, indent=1, ensure_ascii=False) + "\n")
    os.rename(out + ".building", out)
    src_of = {m["id"]: m["source"] for m in in_arm}
    rows = mnd.read_rows(os.path.join(out, "train.jsonl"))
    cuts = mnd.read_rows(os.path.join(out, "cut_train.jsonl"))
    reader = json.load(open(os.path.join(out, "reader.json"), encoding="utf8"))
    produced = {m["id"]: len(mnd.produced_requests(m, acts)) for m in in_arm}
    ann = {}
    for d in F_DIRS:
        c = collections.Counter()
        ms = [m for m in in_arm if m["source"] == d]
        c["messages"], c["requests"] = len(ms), sum(sum(1 for w in m["wires"] if not mnd.is_pending(w)) for m in ms)
        c["produced_rows"] = sum(produced[m["id"]] for m in ms)
        for m in ms:
            for w in m["wires"]:
                if not mnd.is_pending(w):
                    for cell in mnd.annotation_cells(w):
                        c[cell] += 1
        ann[d] = dict(sorted(c.items()))
    cov = json.load(open(os.path.join(out, "coverage.json"), encoding="utf8"))
    outcells = mnd.output_cells(rows, reader, src_of)
    # the coverage report: F against the old arms (read only), on the cells the campaign is about
    oldB, oldR, oldS = old_total("B"), old_total("R"), old_total("S")
    comp = {}
    for k in COVERAGE_KEYS:
        comp[k] = {"F": outcells["total"].get(k, 0), "B": (oldB or {}).get("total", {}).get(k), "R": (oldR or {}).get("total", {}).get(k), "S": (oldS or {}).get("total", {}).get(k)}
    data_ids, scanned = set(), []        # measured: every id of every row of every *.jsonl file of the data folder (a reserved or restored-only id would show here)
    for n in sorted(os.listdir(out)):
        if n.endswith(".jsonl"):
            scanned.append(n)
            data_ids |= {x["id"] for x in mnd.read_rows(os.path.join(out, n)) if isinstance(x, dict) and "id" in x}
    coverage = {"version": BUILD_VERSION, "arm": "F", "messages": len(cuts), "rows": len(rows),
                "old_arms": {n: ({k: v for k, v in o.items() if k != "total"} if o else None) for n, o in (("B", oldB), ("R", oldR), ("S", oldS))},
                "cells_F_vs_old": comp, "annotation_by_folder": ann, "output": outcells,
                "thin_cells_F": sorted(k for k in ("rows undo", "rows redo", "undo with count in gold", "redo with count in gold", "outline question rows (property=outline)", "desc:size=huge")
                                       if outcells["total"].get(k, 0) < P["support"]["r2_cell_thin_requests"]),
                "reserved_r2_ids_in_data": len(data_ids & set(omem["r2_reserved"])), "restored_only_ids_in_data": len(data_ids & (set(omem["R"]) - set(omem["B"]))),
                "calibration_ids_in_data": len(data_ids & set(omem["calibration"])), "ids_scanned": {"files": len(scanned), "distinct_ids": len(data_ids)}}
    mnd.write(b["coverage"], mnd.dumps(coverage))
    ti_dirs = extra_dirs_of()
    manifest = {
        "version": BUILD_VERSION, "campaign": CAMPAIGN, "arm": "F", "contract": V2,
        "protocol": {"file": os.path.basename(a.protocol), "sha256": sha256_file(a.protocol), "static_protocol_sha256": FZ["static_protocol_sha256"], "membership_sha256": FZ["membership"]["F"]["sha256"],
                     "membership_count": FZ["membership"]["F"]["count"]},
        "overlay": {"file": P["parents"]["overlay"]["path"], "sha256": ov["sha256"], "lines": ov["lines"], "changes_total": len(ov["changes"]),
                    "applied_to_this_arm": [{"id": i, "wires": w} for i, w in sorted(changed.items())]},
        "messages_file": {"name": os.path.basename(b["messages"]), "sha256": sha256_file(b["messages"]), "messages": len(order),
                          "order": "C100_OLD + C100_FIRST + [synth_short_r2] + C100_NL + C100_SAMPLE, then each folder's files and lines"},
        "tools": mnd.tool_hashes(), "env": mnd.recipe_env(V2),
        "command": ["python3", "-B", "training/neural/make_roles.py", "--all", "--messages", os.path.basename(b["messages"]), "--output-contract", V2, "--out", os.path.basename(out)],
        "python": sys.version.split()[0],
        "messages": len(cuts), "requests": len(rows), "produced_rows": sum(produced.values()),
        "extra_dirs": ti_dirs,
        "extra_dirs_note": "the folder llm_train/synth_short_r2 is listed whole (the manifest schema holds folders), but it also holds the 580 reserved r2 messages: the data holds only its 1,417 nonreserved ids; verify checks that no reserved id is in any file of the data folder",
        "files": mnd.data_files(out),
        "coverage_file": {"name": os.path.basename(b["coverage"]), "sha256": sha256_file(b["coverage"])},
        "heldout_rows": len(mnd.read_rows(os.path.join(out, "heldout.jsonl"))) + len(mnd.read_rows(os.path.join(out, "cut_heldout.jsonl"))),
        "coverage": {"annotation_by_folder": ann, "output": outcells,
                     "make_roles_output_contract": cov.get("output_contract"), "make_roles_train_output_contract": cov.get("train", {}).get("output contract"),
                     "make_roles_implied": cov.get("implied"), "make_roles_label_fixes": cov.get("label_fixes"), "make_roles_messages_input": cov.get("messages_input")},
    }
    mnd.write(b["manifest"], mnd.dumps(manifest))
    print(f"build F ({V2}): {len(cuts)} messages, {len(rows)} rows, {len(manifest['files'])} files -> {out} (+ .manifest.json, .messages.jsonl, .build.log, .coverage.json)")
    return 0


# ---------------------------------------------------------------- verify

def trainer_manifest(data):
    """the three keys finetune_modernbert_batched.data_manifest computes and compares with --expect-manifest: messages (cut_train), requests (train), files (sha of every *.json*)"""
    rows = [json.loads(l) for l in open(os.path.join(data, "train.jsonl"), encoding="utf8") if l.strip()]
    cuts = [json.loads(l) for l in open(os.path.join(data, "cut_train.jsonl"), encoding="utf8") if l.strip()]
    return {"messages": len(cuts), "requests": len(rows), "files": {os.path.basename(p): sha256_file(p) for p in sorted(glob.glob(os.path.join(data, "*.json*")))}}


def walk_strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for k, v in o.items():
            yield k
            yield from walk_strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk_strings(v)


ROW_FILES = ("train.jsonl", "cut_train.jsonl", "eval_sample1000.jsonl", "cut_eval_sample1000.jsonl", "heldout.jsonl", "cut_heldout.jsonl")


def check_data_dir(data, manifest, F_ids, forbidden_ids, known_ids, problems):
    """checks of a data folder that need no source: the trainer's expect-manifest numbers, held-out files empty, every trained-row message id within F, no
    reserved/calibration id anywhere (any string of any file), message count = |F|. forbidden_ids: reserved r2 + calibration; known_ids: every protocol message id"""
    F = set(F_ids)
    if not os.path.isdir(data):
        problems.append(f"{data} is not a folder")
        return
    need = ("train.jsonl", "cut_train.jsonl", "heldout.jsonl", "cut_heldout.jsonl", "reader.json")
    miss = [n for n in need if not os.path.isfile(os.path.join(data, n))]
    if miss:
        problems.append(f"missing data files: {miss}")
        return
    tm = trainer_manifest(data)
    for key in ("messages", "requests", "files"):
        if manifest.get(key) != tm[key]:
            ch = sorted(k for k in set(manifest.get("files", {})) | set(tm["files"]) if manifest.get("files", {}).get(k) != tm["files"].get(k)) if key == "files" else [manifest.get(key), tm[key]]
            problems.append(f"the trainer's --expect-manifest check would fail: {key}: {ch}")
    if tm["messages"] != len(F):
        problems.append(f"manifest message count {tm['messages']} != |F| {len(F)}")
    for n in ("heldout.jsonl", "cut_heldout.jsonl"):
        if any(l.strip() for l in open(os.path.join(data, n), encoding="utf8")):
            problems.append(f"the trainer's held-out file {n} is not empty")
    leak = {}
    outside = {}
    for n in sorted(os.listdir(data)):
        p = os.path.join(data, n)
        if not os.path.isfile(p):
            problems.append(f"unexpected folder in the data folder: {n}")
            continue
        if not re.search(r"\.json", n):
            problems.append(f"unexpected file in the data folder: {n}")
            continue
        try:
            objs = [json.loads(l) for l in open(p, encoding="utf8") if l.strip()] if n.endswith(".jsonl") else [json.load(open(p, encoding="utf8"))]
        except ValueError as e:
            problems.append(f"{n}: not JSON ({e})")
            continue
        hit = set()
        for o in objs:
            hit |= {s for s in walk_strings(o) if s in forbidden_ids}
        if hit:
            leak[n] = sorted(hit)[:5]
        if n.endswith(".jsonl"):
            rid = {o["id"] for o in objs if isinstance(o, dict) and "id" in o}
            if n in ROW_FILES and not rid <= F:
                outside[n] = sorted(rid - F)[:5]
            elif n not in ROW_FILES and (rid & known_ids) - F:
                outside[n] = sorted((rid & known_ids) - F)[:5]
    if leak:
        problems.append(f"reserved r2 or calibration ids in the data folder (leak): {leak}")
    if outside:
        problems.append(f"message ids outside F in the data folder: {outside}")


def rows_of(path):
    return [json.loads(l) for l in open(path, encoding="utf8") if l.strip()]


def expected_rows(OP, ids_order, gtab, overlay_lines):
    """the independent derivation of F's whole-message rows from the raw source lines (located by the old groups table's file and line, ordered by the
    declared folder/file/line order) with the overlay lines applied by their own text: -> [(id, expected row dict, raw line text, overlay applied?)]"""
    srcs = {s["id"]: s for s in OP["sources"]}
    frank = {}
    for r, d in enumerate(F_DIRS):
        for k, f in enumerate(srcs[d]["files"]):
            frank[f["path"]] = (r, k)
    cache, out = {}, []
    ov = {(l["source_file"], l["id"]): l for _n, l in overlay_lines}
    used = set()
    for i in sorted(ids_order, key=lambda i: (frank[gtab[i]["file"]], gtab[i]["line"])):
        g = gtab[i]
        lines = cache.setdefault(g["file"], [l for l in open(os.path.join(SK, g["file"]), encoding="utf8", newline="").read().split("\n") if l.strip()])
        raw = lines[g["line"] - 1].rstrip("\r")
        row = json.loads(raw)
        if row["id"] != i:
            raise Stop(f"{g['file']}:{g['line']} is {row['id']}, the groups table says {i}")
        o = ov.get((g["file"], i))
        if o:
            w = row["wires"][o["wire_index"]]
            if mnd.canon(w.get("args", {})) != mnd.canon(o["expected_args"]) or w.get("span") != o["expected_span"]:
                raise Stop(f"overlay line for {i}: the source wire is not the expected one")
            w["args"] = o["replacement_args"]
            used.add((g["file"], i))
        out.append((i, row, raw, bool(o)))
    return out


def cmd_verify(a):
    FZ, P, ids = load_frozen_forms(a.protocol)
    data = os.path.abspath(a.data)
    guard_out(data, "verify reads the data folder (it writes only a temporary sibling DATA.verify-tmp, removed afterwards): data")
    b = beside(data)
    problems = []
    if not os.path.isdir(data) or not os.path.isfile(b["manifest"]) or not os.path.isfile(b["messages"]):
        raise Stop(f"{data}: the data folder, {b['manifest']} or {b['messages']} is missing")
    M = json.load(open(b["manifest"], encoding="utf8"))
    if M.get("version") != BUILD_VERSION or M.get("campaign") != CAMPAIGN or M.get("arm") != "F":
        raise Stop(f"manifest {M.get('version')!r}/{M.get('arm')!r} is not an F build of {BUILD_VERSION}")
    OF, OP, omem = load_old(P)
    mnd.verify_sources(OP)
    gtab = load_groups(ref_path(P["parents"]["groups"]))
    bad = problems.append
    # protocol, membership, overlay, tools
    if M["protocol"]["sha256"] != sha256_file(a.protocol):
        bad("protocol hash differs from the manifest's")
    if M["protocol"]["membership_sha256"] != FZ["membership"]["F"]["sha256"] or M["protocol"]["membership_count"] != len(ids):
        bad("membership hash or count differs from the manifest's")
    overlay_path = ref_path(P["parents"]["overlay"])
    if sha256_file(overlay_path) != M["overlay"]["sha256"] or M["overlay"]["sha256"] != FZ["overlay"]["sha256"]:
        bad("overlay file differs from the manifest's or the frozen protocol's")
    cur = mnd.tool_hashes()
    for k, v in M["tools"].items():
        if cur.get(k) != v:
            bad(f"tool changed since the build: {k}")
    # the exact membership against the inherited files (a second derivation, from the files, not from the frozen F.ids)
    F_rule = set(omem["B"]) | set(omem["r2_nonreserved"])
    if F_rule != set(ids) or len(ids) != P["f_rule"]["expected_count"]:
        bad("the frozen F differs from B union r2_nonreserved of the inherited files")
    forbidden = set(omem["r2_reserved"]) | set(omem["calibration"])
    known = set(gtab)
    # data folder checks that need no source
    check_data_dir(data, M, ids, forbidden, known, problems)
    if problems:
        print("verify FAILED:\n  " + "\n  ".join(problems))
        return 1
    # the saved messages file: independently derived from the raw source lines and the overlay lines, line by line
    have_bytes = open(b["messages"], "rb").read()
    if sha256_bytes(have_bytes) != M["messages_file"]["sha256"]:
        bad("the saved messages file hash differs from the manifest's")
    have_lines = have_bytes.decode("utf8").split("\n")
    if have_lines and have_lines[-1] == "":
        have_lines.pop()
    exp = expected_rows(OP, ids, gtab, mnd.load_overlay(overlay_path))
    if len(have_lines) != len(exp):
        bad(f"the messages file has {len(have_lines)} lines, F has {len(exp)} messages")
    else:
        order_bad, row_bad, raw_bad = [], [], []
        for (mid, row, raw, overlaid), line in zip(exp, have_lines):
            got = json.loads(line)
            if got.get("id") != mid:
                order_bad.append((mid, got.get("id")))
            elif got != row:
                row_bad.append(mid)
            elif not overlaid and line != raw:
                raw_bad.append(mid)
        if order_bad:
            bad(f"the messages file is not in the declared source order: {order_bad[:3]}")
        if row_bad:
            bad(f"messages-file rows differ from source rows + overlay (text or annotations): {row_bad[:5]}")
        if raw_bad:
            bad(f"messages without an overlay line are not byte-identical to their source line: {raw_bad[:5]}")
    # trained-row ids, rows count, texts
    byraw = {mid: row for mid, row, _r, _o in exp}
    cuts = rows_of(os.path.join(data, "cut_train.jsonl"))
    rows = rows_of(os.path.join(data, "train.jsonl"))
    cut_ids = [c["id"] for c in cuts]
    if set(cut_ids) != set(ids) or len(cut_ids) != len(ids):
        bad(f"cut_train ids differ from F: {len(set(cut_ids) - set(ids))} extra, {len(set(ids) - set(cut_ids))} missing")
    text_bad = [c["id"] for c in cuts if c["id"] not in byraw or c["text"] != byraw[c["id"]]["text"]]
    if text_bad:
        bad(f"cut_train texts differ from the source texts: {text_bad[:5]}")
    if not {r["id"] for r in rows} <= set(ids):
        bad(f"train.jsonl holds ids outside F: {sorted({r['id'] for r in rows} - set(ids))[:5]}")
    acts = set(mnd.acts_from_neural_js())
    want_rows = sum(len(mnd.produced_requests(byraw[i], acts)) for i in ids)
    pool_rows = FZ["pools"]["F"]["produced_rows"]
    if len(rows) != want_rows or want_rows != pool_rows:
        bad(f"train.jsonl rows {len(rows)}; produced requests of the source rows {want_rows}; frozen F pool {pool_rows}")
    if (M["messages"], M["requests"], M["produced_rows"]) != (len(cuts), len(rows), want_rows):
        bad("counts differ from the manifest's")
    # span and whole-text keys of the rows against reserved r2 and calibration messages
    msgs_u, _per, _ov = mnd.load_universe(OP, overlay_path, apply=True)
    byid = {m["id"]: m for m in msgs_u}
    guard_msgs = [byid[i] for i in forbidden if i in byid]
    leak_hit = rows_key_leak(rows, cuts, guard_msgs)[:5]
    if leak_hit:
        bad(f"a request span or whole text of the rows equals a whole text or span of a reserved r2 or calibration message (any direction): {leak_hit}")
    reader = json.load(open(os.path.join(data, "reader.json"), encoding="utf8"))
    if reader.get("output_contract") != V2:
        bad("reader.json output_contract is not " + V2)
    # layout/vocabulary: make_roles run again on the saved messages file reproduces every file of the data folder byte for byte (the reader is built from the train rows
    # only, make_roles.py:478-503 and 614-618; the unpinned inputs are docs/bench/*.json, exported as eval_* files only, and the sample ids, F messages only)
    tmp = data + ".verify-tmp"
    if os.path.exists(tmp):
        raise Refuse(f"modernbert_forms_data: {tmp} exists (an interrupted verify): not touched")
    try:
        r = run_make_roles(b["messages"], tmp)
        if r.returncode != 0:
            bad(f"make_roles.py on the saved messages file failed (exit {r.returncode})")
        else:
            now = mnd.data_files(tmp)
            was = {k: v for k, v in M["files"].items() if k != "trigger_inventory.json"}
            if now != was:
                bad("make_roles on the saved messages file does not reproduce the data folder (the layout is not a function of the saved F messages and the pinned tools): " +
                    str(sorted(k for k in set(now) | set(was) if now.get(k) != was.get(k))))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    ti = json.load(open(os.path.join(data, "trigger_inventory.json"), encoding="utf8"))
    ti_now = mnd.trigger_inventory([byid[i] for i in ids], acts, extra_dirs_of())
    if ti != json.loads(json.dumps(ti_now)):
        bad("trigger_inventory.json differs from the annotation triggers of F's messages")
    if problems:
        print("verify FAILED:\n  " + "\n  ".join(problems))
        return 1
    print(f"verify ok: F; {len(cuts)} messages (= |F| and the trainer's expect-manifest numbers), {len(rows)} rows; {len(M['files'])} data files, messages file, overlay, protocol and tool hashes match; "
          f"no reserved r2 or calibration id in any file; make_roles on the saved messages file reproduces every file (the reader's classes, tags and number words come from the train rows only: make_roles.py:478-503, 614-618)")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("discover")
    p.add_argument("--out", required=True)
    p = sub.add_parser("freeze")
    p.add_argument("--protocol", required=True)
    p.add_argument("--out", required=True)
    p = sub.add_parser("build")
    p.add_argument("--protocol", required=True)
    p.add_argument("--arm", required=True, choices=["F"])
    p.add_argument("--out", required=True)
    p = sub.add_parser("verify")
    p.add_argument("--protocol", required=True)
    p.add_argument("--data", required=True)
    a = ap.parse_args(argv)
    try:
        return {"discover": cmd_discover, "freeze": cmd_freeze, "build": cmd_build, "verify": cmd_verify}[a.cmd](a)
    except Stop as e:
        print(f"modernbert_forms_data: STOP: {e}", file=sys.stderr)
        return e.code


if __name__ == "__main__":
    sys.exit(main())
