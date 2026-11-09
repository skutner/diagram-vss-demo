"""Tests of modernbert_next_data.py: overlay preconditions, connected groups, reservation, leakage, text identity, and the CLI on the real protocol.
  python3 -B training/neural/parity/test_modernbert_next_data.py
Prints one line per check and the number of executed checks; exits 1 on a failed check or when no check ran. Outputs go to temporary folders outside the repository."""
import copy, hashlib, json, os, shutil, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import modernbert_next_data as D

REPO = D.REPO
fails = 0
executed = 0


def check(name, cond, detail=""):
    global fails, executed
    executed += 1
    print(("ok   " if cond else "FAIL ") + name + ("" if cond else f"  {detail}"))
    fails += 0 if cond else 1


def raises(fn, exc=D.Stop, contains=None):
    try:
        fn()
    except exc as e:
        return contains is None or all(c in str(e) for c in (contains if isinstance(contains, (list, tuple)) else [contains]))
    except SystemExit as e:
        return exc is SystemExit and (contains is None or contains in str(e))
    return False


def wire(span, **args):
    return {"span": span, "trigger": span.split()[0] if span.split() else "", "type": "command", "args": args}


def msg(id_, text, spans=(), source="s", session=None, group=None, origin=None, roles=(), names=(), meta=None, args=None, part=None):
    wires = [wire(sp, **(args or {"action": "move", "target": "X"})) for sp in spans]
    if not all(sp in text for sp in spans):
        text = text + " " + " ".join(spans)          # a real annotated span is a piece of its text
    return dict(id=id_, text=text, wires=wires, names=list(names), source=source, file="f.jsonl", line=1, kind=None, meta=meta or {}, session=session, group=group, origin=origin,
                has_wires_key=True, unreliable=False, roles=set(roles), part=part, pending=False)


def gk(msgs, G, id_):
    return G["gkey"][[m["id"] for m in msgs].index(id_)]


# ---------------------------------------------------------------- 1. overlay preconditions
tmp = tempfile.mkdtemp(prefix="mnd-test-")
LEG = {"action": {"kind": "enum", "values": ["move", "label", "create", "undo", "redo", "resize"]}, "direction": {"kind": "enum", "values": ["left", "right", "up", "down"]},
       "position": {"kind": "enum", "values": ["left", "leftOf", "top"]}, "target": {"kind": "names", "values": None}, "anchor": {"kind": "names", "values": None},
       "label": {"kind": "text", "values": None}, "count": {"kind": "number", "values": None}, "distance": {"kind": "number", "values": None}}
try:
    sk = os.path.join(tmp, "sk")
    os.makedirs(os.path.join(sk, "d"))
    rows = [
        {"id": "a1", "text": "move Fan3 left", "names": ["Fan3"], "wires": [{"span": "move Fan3 left", "trigger": "move", "type": "command", "args": {"action": "move", "target": "Fan3", "position": "left"}}]},
        {"id": "a2", "text": "undo twice", "wires": [{"span": "undo twice", "trigger": "undo", "type": "command", "args": {"action": "undo"}}, {"pending": True, "intent": "x", "span": "z"}]},
        {"id": "a3", "text": "remove the label of Fan3", "wires": [{"span": "remove the label of Fan3", "trigger": "remove", "type": "command", "args": {"action": "label", "target": "Fan3", "label": "old"}}]},
        {"id": "dup", "text": "t1", "wires": [{"span": "t1", "trigger": "t", "type": "command", "args": {"action": "undo"}}]},
        {"id": "dup", "text": "t2", "wires": [{"span": "t2", "trigger": "t", "type": "command", "args": {"action": "undo"}}]},
    ]
    path = os.path.join(sk, "d", "batch_01.jsonl")

    def write_rows(rs):
        with open(path, "w", encoding="utf8") as f:
            for r in rs:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    write_rows(rows)
    SRC = {"id": "d", "role": "c100", "family": "c100", "session_from_file": False, "files": [{"path": "d/batch_01.jsonl", "use": "rows"}]}
    sha0 = D.sha256_file(path)

    def fresh():
        ms, _alt = D.load_source(SRC, sk)
        return {"d/batch_01.jsonl": {"path": path, "sha256": sha0, "messages": ms}}, ms

    def line(**kw):
        r = {"source_file": "d/batch_01.jsonl", "source_sha256": sha0, "id": "a1", "wire_index": 0, "expected_span": "move Fan3 left",
             "expected_args": {"action": "move", "target": "Fan3", "position": "left"}, "replacement_args": {"action": "move", "target": "Fan3", "direction": "left"},
             "reason": "bare displacement"}
        r.update(kw)
        return r

    files, ms = fresh()
    ch = D.check_overlay([(1, line())], files, LEG)
    check("overlay: a valid line applies", len(ch) == 1 and ms[0]["wires"][0]["args"] == {"action": "move", "target": "Fan3", "direction": "left"})
    check("overlay: changed keys are recorded old -> new", ch[0]["changed_keys"] == {"direction": [None, "left"], "position": ["left", None]}, str(ch))
    check("overlay: the source wires are kept apart from the overlaid wires (identity checks compare the source)", ms[0]["wires_source"][0]["args"] == {"action": "move", "target": "Fan3", "position": "left"} and ms[0]["wires"][0]["args"] != ms[0]["wires_source"][0]["args"])
    check("overlay: the message text is untouched", ms[0]["text"] == "move Fan3 left" and ms[0]["wires"][0]["span"] == "move Fan3 left")
    files, ms = fresh()
    ch = D.check_overlay([(1, line(id="a3", expected_span="remove the label of Fan3", expected_args={"action": "label", "target": "Fan3", "label": "old"},
                                  replacement_args={"action": "label", "target": "Fan3", "label": ""}, reason="explicit removal"))], files, LEG)
    check("overlay: explicit text removal is a key present with the empty string", ms[2]["wires"][0]["args"].get("label") == "" and "label" in ms[2]["wires"][0]["args"] and ch[0]["changed_keys"] == {"label": ["old", ""]})
    files, ms = fresh()
    check("overlay: an empty overlay changes nothing", D.check_overlay([], files, LEG) == [])

    def bad(contains, *lines, ctx=None):
        files, ms = fresh()
        before = copy.deepcopy([m["wires"] for m in ms])
        ok = raises(lambda: D.check_overlay(list(lines), files, LEG), D.OverlayError, contains)
        return ok and before == [m["wires"] for m in ms]      # nothing is applied when a line fails

    check("overlay: a stale source_sha256 is refused", bad("not the current hash", (1, line(source_sha256="0" * 64))))
    check("overlay: a malformed source_sha256 is refused", bad("not a SHA-256", (1, line(source_sha256="abc"))))
    files, _ms = fresh()
    files["d/batch_01.jsonl"]["sha256"] = "1" * 64
    check("overlay: a source that differs from the protocol's hash is refused", raises(lambda: D.check_overlay([(1, line())], files, LEG), D.OverlayError, "changed since the protocol froze"))
    check("overlay: a unknown source file is refused", bad("not a rows file", (1, line(source_file="d/other.jsonl"))))
    check("overlay: an unknown id is refused", bad("unknown id", (1, line(id="nope"))))
    check("overlay: a duplicate id in the source is refused", bad("duplicate id", (1, line(id="dup", expected_span="t1", expected_args={"action": "undo"}, replacement_args={"action": "redo"}))))
    check("overlay: a wire index out of range is refused", bad("no wire", (1, line(wire_index=3))))
    check("overlay: a negative wire index is refused", bad("no wire", (1, line(wire_index=-1))))
    check("overlay: a boolean wire index is refused", bad("no wire", (1, line(wire_index=True))))
    check("overlay: a pending wire is refused", bad("pending", (1, line(id="a2", wire_index=1, expected_span="z", expected_args={}, replacement_args={"action": "undo"}))))
    check("overlay: a span that differs from expected_span is refused", bad("expected_span", (1, line(expected_span="move Fan3"))))
    check("overlay: args that differ from expected_args are refused", bad("expected_args", (1, line(expected_args={"action": "move", "target": "Fan3"}))))
    check("overlay: a number written as a string is not the number (canonical comparison)", bad("expected_args", (1, line(id="a2", expected_span="undo twice", expected_args={"action": "undo", "count": 2}, replacement_args={"action": "undo", "count": "2"}))))
    check("overlay: a no-op line is refused", bad("no-op", (1, line(replacement_args={"action": "move", "target": "Fan3", "position": "left"}))))
    check("overlay: an already-applied wire (source hash matches) is an inconsistent state", bad("already applied", (1, line(expected_args={"action": "move", "target": "Fan3"}, replacement_args={"action": "move", "target": "Fan3", "position": "left"}))))
    check("overlay: duplicate lines for one wire are refused", bad("duplicate of line 1", (1, line()), (2, line(reason="again"))))
    check("overlay: an invalid enum value is refused", bad("not a legend value", (1, line(replacement_args={"action": "move", "target": "Fan3", "direction": "sideways"}))))
    check("overlay: an unknown key is refused", bad("not in the legend", (1, line(replacement_args={"action": "move", "target": "Fan3", "colour": "left"}))))
    check("overlay: a non-number count is refused", bad("not a number", (1, line(id="a2", expected_span="undo twice", expected_args={"action": "undo"}, replacement_args={"action": "undo", "count": "twice"}))))
    check("overlay: a boolean value is refused", bad("not a string or number", (1, line(replacement_args={"action": "move", "target": "Fan3", "distance": True}))))
    check("overlay: a missing reason is refused", bad("no reason", (1, line(reason="  "))))
    extra = line()
    extra["note"] = "x"
    missing = line()
    del missing["reason"]
    check("overlay: extra keys are refused", bad("keys must be exactly", (1, extra)))
    check("overlay: missing keys are refused", bad("keys must be exactly", (1, missing)))
    check("overlay: one bad line among good lines applies nothing", bad("overlay problem", (1, line()), (2, line(id="nope"))))
    files, _ms = fresh()
    check("overlay: all problems are reported, not only the first", raises(lambda: D.check_overlay([(1, line(id="nope")), (2, line(wire_index=9))], files, LEG), D.OverlayError, "2 overlay problem"))
    # the file changing on disk after the protocol froze it
    files, ms = fresh()
    write_rows(rows + [{"id": "a9", "text": "new", "wires": []}])
    check("overlay: a source file changed on disk is refused", raises(lambda: D.check_overlay([(1, line())], files, LEG), D.OverlayError, "changed since the protocol froze"))
    write_rows(rows)
    # load_overlay
    ov = os.path.join(tmp, "ov.jsonl")
    open(ov, "w").write("")
    check("overlay: an empty file is no corrections", D.load_overlay(ov) == [])
    open(ov, "w").write(json.dumps(line()) + "\n\nnot json\n")
    check("overlay: a line that is not JSON stops with its number", raises(lambda: D.load_overlay(ov), D.OverlayError, "line 3"))
    check("overlay: a missing file stops", raises(lambda: D.load_overlay(os.path.join(tmp, "none.jsonl")), D.OverlayError, "no such file"))
    check("overlay: the repository's LABEL_FIXES_SHORT.jsonl exists and is valid", isinstance(D.load_overlay(os.path.join(HERE, "LABEL_FIXES_SHORT.jsonl")), list))

    # ---------------------------------------------------------------- 2. message text identity
    texts = ["  leading and  double  spaces ", "tab\there", "nbsp here", "Umlaut ü ☃ \U0001f600", "CRLF\r\nline", "trailing "]
    p2 = os.path.join(sk, "d", "batch_02.jsonl")
    with open(p2, "w", encoding="utf8") as f:
        for i, t in enumerate(texts):
            f.write(json.dumps({"id": f"t{i}", "text": t, "wires": []}, ensure_ascii=False) + "\n")
    src2 = dict(SRC, files=[{"path": "d/batch_02.jsonl", "use": "rows"}])
    ms2, _ = D.load_source(src2, sk)
    check("text: message texts are byte-identical to the source rows", all(m["text"].encode("utf8") == t.encode("utf8") for m, t in zip(ms2, texts)))
    G2 = D.build_groups(ms2)
    check("text: grouping never rewrites a message text", all(m["text"] == t for m, t in zip(ms2, texts)))
    check("text: the normalised text is lower case with collapsed whitespace and nothing else", D.norm_text("  Move   Fan3\tLEFT \n") == "move fan3 left")
finally:
    shutil.rmtree(tmp, ignore_errors=True)

# ---------------------------------------------------------------- 3. connected groups
M = [msg("m1", "move Keeper left", ["move Keeper left"], source="s1"),
     msg("m2", "ok MOVE   keeper LEFT now", ["MOVE  keeper   LEFT"], source="s2"),                        # case and spacing: same span as m1
     msg("m3", "something else", ["undo"], source="s3", session="sess"),
     msg("m4", "another", ["redo"], source="s3", session="sess"),                                          # same session as m3
     msg("m5", "third", ["delete A"], source="s4", group="par"),
     msg("m6", "fourth", ["delete B"], source="s4", group="par"),                                          # same paraphrase group
     msg("m7", "undo that", ["undo that"]),                                                                 # superstring of m3's span: NOT joined
     msg("m8", "left keeper move", ["left keeper move"]),                                                   # same bag of words: NOT joined
     msg("m9", "Identical   Whole TEXT", []),
     msg("m10", "identical whole text", []),                                                                # same whole text, no spans (zero-request)
     msg("m11", "origin copy", ["origin copy"], origin="m1"),                                               # a mechanical variant of m1
     msg("m12", "b1", ["shared span"]), msg("m13", "b2", ["shared span", "bridge"]), msg("m14", "b3", ["bridge"]),   # transitive by span
     msg("m15", "b4", ["other"], source="s3", session="sess2"), msg("m16", "b5", ["other"], source="s5", session="sess2"),  # same session string, same span anyway
     msg("m17", "ns1", ["alpha"], source="sx", session="same"), msg("m18", "ns2", ["beta"], source="sy", session="same"),  # same session string in two sources: NOT joined
     ]
G = D.build_groups(M)
g = lambda i: gk(M, G, i)
check("groups: spans equal after lower case and whitespace collapsing are one group", g("m1") == g("m2"))
check("groups: a shared session joins messages with different spans", g("m3") == g("m4"))
check("groups: a shared paraphrase group joins messages", g("m5") == g("m6"))
check("groups: no substring match (a superstring span is another group)", g("m7") != g("m3"))
check("groups: no bag-of-words match", g("m8") != g("m1"))
check("groups: identical normalised whole text joins messages without spans", g("m9") == g("m10"))
check("groups: a mechanical-variant origin joins the variant to its source message", g("m11") == g("m1"))
check("groups: transitive through a shared full span", g("m12") == g("m13") == g("m14"))
check("groups: transitive session -> span (m3 .. m4 and m15/m16 stay separate from each other's session)", g("m15") == g("m16") and g("m15") != g("m3"))
check("groups: equal session strings in two sources are not joined (namespaced)", g("m17") != g("m18"))
check("groups: the group key is the smallest message id", G["groups"][g("m12")] == sorted(G["groups"][g("m12")]) and g("m12") == "m12")
check("groups: deterministic (same input, same keys)", D.build_groups(copy.deepcopy(M))["gkey"] == G["gkey"])
check("groups: merges are labelled by reason", G["merges"]["span"] >= 3 and G["merges"]["session"] >= 1 and G["merges"]["group"] == 1 and G["merges"]["text"] == 1 and G["merges"]["origin"] >= 1, str(G["merges"]))
# transitive session + paraphrase + span chain across three sources
chain = [msg("c1", "c1", ["span one"], source="a", session="S"), msg("c2", "c2", ["span two"], source="a", session="S", group="P"),
         msg("c3", "c3", ["span three"], source="a", group="P"), msg("c4", "c4", ["span three"], source="b")]
Gc = D.build_groups(chain)
check("groups: session, paraphrase group and span chain into one group", len({gk(chain, Gc, x) for x in ("c1", "c2", "c3", "c4")}) == 1)
check("groups: duplicate message ids stop (one node per id)", raises(lambda: D.build_groups([msg("d", "x"), msg("d", "y")]), D.Stop, "not unique"))
# a pending wire's span still joins (the annotated request span exists)
pm = msg("p1", "pend", ["pending span"])
pm["wires"].append({"pending": True, "intent": "z", "span": "zz span"})
pm2 = msg("p2", "pend2", ["x"])
pm2["wires"][0]["span"] = "zz   SPAN"
Gp = D.build_groups([pm, pm2])
check("groups: a pending wire's annotated span joins as well", Gp["gkey"][0] == Gp["gkey"][1])

# ---------------------------------------------------------------- 4. reservation, calibration, leakage
def find_id(prefix, residue, mod=3, want=True):
    n = 0
    while True:
        cand = f"{prefix}{n:03d}"
        if (D.sha256_mod(cand, mod) == residue) == want:
            return cand
        n += 1


r2_res = find_id("a", 0)                  # an r2 group whose key has residue 0
r2_res_b = find_id("a9", 0)
r2_non = find_id("b", 0, want=False)
r2_guard = find_id("c", 0)
r2_train = find_id("d", 0)
U = [
    msg("zc1", "train text", ["undo"], roles=["train_c100"], source="c100"),
    msg("zrest", "restored text", ["restored span"], roles=["train_restored"], source="rest"),
    msg(r2_train, "r2 touching c100", ["undo"], roles=["r2"], source="r2"),
    msg(r2_res, "r2 reserved", ["make x red"], roles=["r2"], source="r2"),
    msg("zcal1", "cal joins reserved r2", ["make x red"], roles=["cal_cand"], source="fresh2"),
    msg("zcal2", "cal touching c100", ["undo"], roles=["cal_cand"], source="short3"),
    msg(r2_non, "r2 nonreserved", ["nonres span"], roles=["r2"], source="r2"),
    msg("zcal3", "cal touching nonreserved r2", ["nonres span"], roles=["cal_cand"], source="short3"),
    msg(r2_guard, "r2 touching guard eval", ["guard span"], roles=["r2"], source="r2"),
    msg("zg1", "guard text", ["guard span"], roles=["guard_eval"], source="fresh2"),
    msg("zcal4", "cal touching guard eval", ["guard span 2"], roles=["cal_cand"], source="fresh2"),
    msg("zg2", "guard 2", ["guard span 2"], roles=["guard_eval"], source="fresh2"),
    msg("zcal5", "cal clean zero request", [], roles=["cal_cand"], source="nl_a", session="ns1"),
    msg("zcal6", "cal clean with request", ["lonely request"], roles=["cal_cand"], source="nl_a", session="ns1"),
    msg("zcal7", "cal session-linked to c100", ["fresh one"], roles=["cal_cand"], source="nl_a", session="ns2"),
    msg("zcal8", "cal span-linked to c100", ["linked span"], roles=["cal_cand"], source="nl_a", session="ns2"),
    msg("zc2", "train text 2", ["linked span"], roles=["train_c100"], source="c100"),
    msg("zonly0", "only zero request cal", [], roles=["cal_cand"], source="nl_a"),
    msg(r2_res_b, "second reserved r2", ["reserved two"], roles=["r2"], source="r2"),
    msg("zt1a", "t1 touching r2 nonreserved", ["nonres span"], roles=["t1"], source="t1"),
    msg("zt1b", "t1 touching nothing", ["t1 alone"], roles=["t1"], source="t1"),
    msg("zt1c", "t1 touching calibration", ["lonely request"], roles=["t1"], source="t1"),
    msg("zt1d", "t1 touching restored", ["restored span"], roles=["t1"], source="t1"),
]
PARAMS = {"r2_reserve_modulus": 3, "r2_reserve_residue": 0, "t1_is_evaluation_for_calibration": False}
GU = D.build_groups(U)
RES = D.plan_reservation(U, GU, PARAMS)
ids_of = lambda ix: {U[i]["id"] for i in ix}
MEM = D.memberships(U, GU, RES)
check("reservation: an r2 group with residue 0 touching nothing is reserved", gk(U, GU, r2_res) in RES["reserved"] and r2_res in ids_of(MEM["r2_reserved"]))
check("reservation: a second reserved r2 group is reserved", r2_res_b in ids_of(MEM["r2_reserved"]))
check("reservation: an r2 group with residue != 0 is not reserved", r2_non not in ids_of(MEM["r2_reserved"]) and r2_non in ids_of(MEM["r2_nonreserved"]))
check("reservation: an r2 group with residue 0 touching C100 training is not reserved", r2_train not in ids_of(MEM["r2_reserved"]))
check("reservation: an r2 group with residue 0 touching a guard evaluation group is not reserved", r2_guard not in ids_of(MEM["r2_reserved"]))
cal = ids_of(MEM["calibration"])
check("calibration: a calibration message in a reserved r2 group is eligible and in the population", "zcal1" in cal and r2_res in cal)
check("calibration: a group touching a C100 message (shared span) is ineligible", "zcal2" not in cal and RES["status"][gk(U, GU, "zcal2")] == "touches_c100_or_restored")
check("calibration: a group touching a non-reserved r2 message is ineligible (arm S trains on it)", "zcal3" not in cal and RES["status"][gk(U, GU, "zcal3")] == "touches_nonreserved_r2")
check("calibration: a group crossing a guard evaluation message is removed whole", "zcal4" not in cal and RES["status"][gk(U, GU, "zcal4")] == "touches_guard_evaluation")
check("calibration: ineligibility is transitive (session link to a group that touches C100)", "zcal7" not in cal and "zcal8" not in cal)
check("calibration: a clean zero-request message stays in the population", "zcal5" in cal and "zcal6" in cal and "zonly0" in cal)
check("calibration: a r2 message is in the calibration population only when reserved", not (ids_of(MEM["r2_nonreserved"]) & cal))
check("memberships: B is the C100 messages, R adds the restored, S adds non-reserved r2", ids_of(MEM["B"]) == {"zc1", "zc2"} and ids_of(MEM["R"]) == {"zc1", "zc2", "zrest"} and ids_of(MEM["S"]) == ids_of(MEM["R"]) | ids_of(MEM["r2_nonreserved"]))
check("memberships: no reserved r2 message is in B, R or S", not (ids_of(MEM["r2_reserved"]) & (ids_of(MEM["B"]) | ids_of(MEM["R"]) | ids_of(MEM["S"]))))
check("memberships: no calibration message is in B, R or S", not (cal & (ids_of(MEM["B"]) | ids_of(MEM["R"]) | ids_of(MEM["S"]))))
T1C = D.t1_clean(U, GU, RES)
check("t1_clean: touching nothing is clean; touching r2, calibration or restored is not", ids_of(T1C) == {"zt1b"}, str(ids_of(T1C)))
LK = D.leakage_checks(U, GU, RES, MEM, T1C)
check("leakage: every check passes on a consistent freeze", all(ok for _n, ok, _d in LK) and len(LK) >= 20, str([n for n, ok, _d in LK if not ok]))
bad_mem = dict(MEM, S=sorted(MEM["S"] + MEM["r2_reserved"][:1]))
LK2 = D.leakage_checks(U, GU, RES, bad_mem, T1C)
check("leakage: a reserved message put into S is detected", any((not ok) and "reserved r2 message in S" in n for n, ok, _d in LK2))
bad_mem2 = dict(MEM, R=sorted(MEM["R"] + [i for i, m in enumerate(U) if m["id"] == "zcal6"]), S=sorted(MEM["S"] + [i for i, m in enumerate(U) if m["id"] == "zcal6"]))
LK3 = D.leakage_checks(U, GU, RES, bad_mem2, T1C)
check("leakage: a calibration message put into R is detected (id, group and span)", sum(1 for n, ok, _d in LK3 if not ok and "calibration" in n) >= 3)
# t1 as evaluation for calibration
RES_T = D.plan_reservation(U, GU, dict(PARAMS, t1_is_evaluation_for_calibration=True))
check("calibration: with t1 treated as evaluation, a calibration group holding a t1 message is removed", "zcal6" not in ids_of(D.memberships(U, GU, RES_T)["calibration"]) and RES_T["status"][gk(U, GU, "zcal6")] == "touches_t1")
# zero-produced-request messages
ACTS = {"move", "undo"}
zm = msg("zz", "no request", [])
pend = msg("zp", "pending", ["x"])
pend["wires"] = [{"pending": True, "intent": "i", "span": "x"}]
q = msg("zq", "span missing", ["not in text"])
q["text"] = "other text"
okm = msg("zok", "undo", ["undo"], args={"action": "undo"})
act_out = msg("zo", "frob", ["frob"], args={"action": "frobnicate"})
check("produced: zero wires, pending wires, a span outside the text and an unknown act produce no row; a valid request produces one",
      [len(D.produced_requests(m, ACTS)) for m in (zm, pend, q, okm, act_out)] == [0, 0, 0, 1, 0])
nreq = [sum(1 for w in m["wires"] if not D.is_pending(w)) for m in U]
prod = [len(D.produced_requests(m, {"move"})) for m in U]
PP = {"reservation": {"fold_count": 5}, "sources": [{"id": s, "family": "fam-" + s} for s in ("c100", "rest", "r2", "fresh2", "short3", "nl_a", "t1")]}
summ, with_req, fams = D.calibration_stats(PP, U, GU, MEM, nreq, prod)
zero_groups = [g for g in {GU["gkey"][i] for i in MEM["calibration"]} if g not in with_req]
check("calibration stats: zero-request messages stay in the population and in groups_total", summ["zero_request_messages"] >= 2 and summ["groups_total"] == len({GU["gkey"][i] for i in MEM["calibration"]}) and summ["messages"] == len(MEM["calibration"]))
check("calibration stats: a group of zero-request messages is not an independent fit group", gk(U, GU, "zonly0") in zero_groups and gk(U, GU, "zonly0") not in with_req and summ["groups_without_any_request"] == len(zero_groups))
check("calibration stats: a group with a request is counted with its families", gk(U, GU, "zcal6") in with_req and "synthetic-short" in fams)

# ---------------------------------------------------------------- 5. support predicates
check("predicate: an aligned capitalised existing name in a role counts", D.existing_name_requests(msg("p", "move Keeper left", ["move Keeper left"], names=["Keeper"], args={"action": "move", "target": "Keeper", "direction": "left"})) == [0])
check("predicate: a name not on the canvas or written in another case does not count", D.existing_name_requests(msg("p", "move keeper left", ["move keeper left"], names=["Keeper"], args={"action": "move", "target": "Keeper"})) == [] and D.existing_name_requests(msg("p", "move Fan left", ["move Fan left"], names=[], args={"action": "move", "target": "Fan"})) == [])
check("predicate: a mention and $new are not names", D.existing_name_requests(msg("p", "make the red squares blue", ["make the red squares blue"], names=["Keeper"], args={"action": "set", "target": "mention(color=red,shape=square)"})) == [])
check("predicate: a name inside a longer word does not count", D.existing_name_requests(msg("p", "move Keepers left", ["move Keepers left"], names=["Keeper"], args={"action": "move", "target": "Keeper"})) == [])
check("predicate: lower-case written canonical name (short3_lowercase candidate)", D.written_lowercase_name_requests(msg("p", "move keeper left", ["move keeper left"], args={"action": "move", "target": "Keeper"})) == [0] and D.written_lowercase_name_requests(msg("p", "move Keeper left", ["move Keeper left"], args={"action": "move", "target": "Keeper"})) == [])
check("cells: bare move, outline question, undo count, desc size huge", D.wire_cells(wire("move X left", action="move", target="X", direction="left")) == ["bare_move"]
      and D.wire_cells({"type": "question", "span": "s", "args": {"ask": "property", "property": "outline", "target": "X"}}) == ["outline_question"]
      and D.wire_cells(wire("undo twice", action="undo", count="2")) == ["undo_redo_count"]
      and "desc_size_huge_in_mention" in D.wire_cells(wire("s", action="set", target="mention(quantifier=all,shape=hexagon,size=huge)", color="teal")))
check("cells: a move with a distance is not bare", "bare_move" not in D.wire_cells(wire("move X left 10", action="move", target="X", direction="left", distance="10")))
check("parts/mention_args handle commas inside parentheses", D.parts("A,mention(color=red,shape=circle),B") == ["A", "mention(color=red,shape=circle)", "B"] and D.mention_args("mention(color=red,shape=circle)") == {"color": "red", "shape": "circle"})
check("sha256_mod is SHA256 % n", D.sha256_mod("abc", 3) == int(hashlib.sha256(b"abc").hexdigest(), 16) % 3)
check("calibration parts of sets.mjs are reproduced for nl_a keys (component takes the smallest key)", D.set_parts("llm_bench/nl_a", [msg("x1", "a", session="s2", group="g1"), msg("x2", "b", group="g1"), msg("x3", "c", session="s2")]) == (lambda k: ["calibration" if D.sha256_mod(k, 2) == 0 else "development"] * 3)("g1"))

# ---------------------------------------------------------------- 5b. an empty population never passes
check("support: ge fails closed on 0, None and below-threshold, passes at the threshold", D.ge(0, 0) == "FAIL" and D.ge(None, 1) == "FAIL" and D.ge(4, 5) == "FAIL" and D.ge(5, 5) == "PASS" and D.ge(0, 1) == "FAIL")
check("support: pop_ok fails an empty population even with zero minimums", D.pop_ok({"requests": 0, "groups": 0, "messages": 0}, 0, 0) == "FAIL")
check("support: pop_ok fails requests without groups, groups without requests, and below either minimum", D.pop_ok({"requests": 5, "groups": 0}, 0, 0) == "FAIL" and D.pop_ok({"requests": 0, "groups": 5}, 0, 0) == "FAIL"
      and D.pop_ok({"requests": 30, "groups": 5}, 20, 10) == "FAIL" and D.pop_ok({"requests": 10, "groups": 50}, 20, 10) == "FAIL")
check("support: pop_ok passes a population at both minimums", D.pop_ok({"requests": 20, "groups": 10}, 20, 10) == "PASS")
EMPTY = [msg("e1", "nothing", [], roles=["cal_cand"], source="short3")]
GE = D.build_groups(EMPTY)
RE_ = D.plan_reservation(EMPTY, GE, PARAMS)
ME = D.memberships(EMPTY, GE, RE_)
se, wr, fm = D.calibration_stats(PP, EMPTY, GE, ME, [0], [0])
check("support: a calibration population of zero-request messages has no independent fit group, so S1's rule fails", se["groups_with_requests"] == 0 and D.ge(se["groups_with_requests"], 100) == "FAIL" and D.ge(se["groups_with_requests"], 0) == "FAIL")
check("support: a population with no t1 messages gives an empty t1_clean count that fails", D.pop_ok(D.count_requests(EMPTY, GE, D.t1_clean(EMPTY, GE, RE_), lambda m, j, w: True), 1, 1) == "FAIL")

# ---------------------------------------------------------------- 5c. validate_args closes every key that has a value list
LEG2 = dict(LEG, ask={"kind": "text", "values": ["property", "count", "path"]}, kind={"kind": "text", "values": ["group", "shape", "edge"]}, about={"kind": "text", "values": None})
check("validate_args: a text-kind key with a value list is closed (ask=propery is refused)", D.validate_args({"ask": "propery", "target": "X"}, LEG2) != [] and D.validate_args({"ask": "property", "target": "X"}, LEG2) == [])
check("validate_args: kind=group/shape/edge is closed, free text keys stay open (including the empty string)", D.validate_args({"kind": "circle"}, LEG2) != [] and D.validate_args({"kind": "edge"}, LEG2) == [] and D.validate_args({"about": "anything at all"}, LEG2) == [] and D.validate_args({"label": ""}, LEG2) == [])
check("validate_args: an enum value outside its list is still refused and a number must be a number", D.validate_args({"action": "teleport"}, LEG2) != [] and D.validate_args({"count": "x"}, LEG2) != [] and D.validate_args({"count": "2"}, LEG2) == [])
LEGR = D.load_legend()
check("validate_args: with the real legend ask=not_a_question and ask=propery are refused, every real ask value is accepted", D.validate_args({"ask": "not_a_question", "target": "X"}, LEGR) != [] and D.validate_args({"ask": "propery"}, LEGR) != []
      and all(D.validate_args({"ask": v}, LEGR) == [] for v in LEGR["ask"]["values"]) and len(LEGR["ask"]["values"]) == 18)
check("validate_args: with the real legend kind and action values are closed", D.validate_args({"kind": "node"}, LEGR) != [] and D.validate_args({"kind": "edge"}, LEGR) == [] and D.validate_args({"action": "undoo"}, LEGR) != [])

# ---------------------------------------------------------------- 6. parity with the pipeline's own helpers
sys.path.insert(0, os.path.join(REPO, "training", "neural"))
saved = {k: os.environ.pop(k, None) for k in ("EXTRA_DIRS", "LABEL_FIXES", "IMPLIED_SCALE")}
try:
    import make_roles as MR
    import make_data as MD
finally:
    for k, v in saved.items():
        if v is not None:
            os.environ[k] = v
for s in ["a,b", "A,mention(color=red,shape=circle),B", "mention(a=(x,y),b=c),d", "", "x"]:
    if not (D.parts(s) == MR.parts(s)):
        check("parity: parts equals make_roles.parts for " + repr(s), False)
        break
else:
    check("parity: parts equals make_roles.parts", True)
check("parity: mention_args equals make_roles.mention_args", D.mention_args("mention(color=red,shape=circle,size=huge)") == MR.mention_args("mention(color=red,shape=circle,size=huge)"))
ACT, ASK = MD.acts_from_neural_js()
check("parity: acts equal make_data.acts_from_neural_js + fact + rule", D.acts_from_neural_js() == ACT + ASK + ["fact", "rule"])
check("parity: act_of equals make_data.act_of", all(D.act_of(t, a) == MD.act_of(t, a) for t, a in (("command", {"action": "move"}), ("question", {"ask": "path"}), ("fact", {}))))
check("parity: label_files equals make_data.label_files", all([os.path.join("training", "sketch", p) for p in D.label_files(d)] == [os.path.relpath(f, REPO) for f in MD.label_files(d)] for d in ("llm_train/nl_p1", "llm_train/opus_tgt_1")))
check("parity: the legend read here equals make_roles.legend()", D.load_legend() == MR.legend())

# ---------------------------------------------------------------- 7. the CLI on the real protocol
PROTO = os.path.join(HERE, "modernbert_next_protocol.json")
out_root = tempfile.mkdtemp(prefix="mnd-cli-")
try:
    rc = D.main(["audit", "--protocol", PROTO, "--out", os.path.join(out_root, "audit")])
    A = json.load(open(os.path.join(out_root, "audit", "audit.json")))
    st = {c["id"]: c["status"] for c in A["checks"]}
    check("cli audit: exit 0 with the real protocol", rc == 0, str([(k, v) for k, v in st.items() if v in ("FAIL", "UNAVAILABLE")]))
    check("cli audit: A2 reproduces 421 requests / 239 distinct spans / 134 of 166 creates", st["A2"] == "PASS" and A["a2"]["got"]["requests"] == 421 and A["a2"]["got"]["distinct_spans"] == 239 and A["a2"]["got"]["create_requests"] == 134)
    check("cli audit: C100 membership reproduces 26,913 messages and 57,135 requests with byte-identical texts", st["I4b"] == st["I4c"] == st["I4d"] == "PASS" and A["pools"]["B_C100"]["messages"] == 26913 and A["pools"]["B_C100"]["produced_rows"] == 57135)
    pos = lambda v: (isinstance(v, (int, float)) and v > 0) or (isinstance(v, dict) and any(isinstance(x, (int, float)) and not isinstance(x, bool) and x > 0 for x in v.values()))
    check("cli audit: every PASS support check carries a positive count in its value", all(c["status"] != "PASS" or c["id"][0] != "S" or pos(c["value"]) or (isinstance(c["value"], dict) and any(isinstance(x, dict) and pos(x) for x in c["value"].values())) for c in A["checks"]))
    check("cli audit: the audit is not silent about the giant group", A["giant_groups"]["largest"][0]["messages"] > 1000 and any(c["id"] == "G1" and c["status"] == "REPORT" for c in A["checks"]))
    check("cli: an existing output folder is refused (exit via SystemExit)", raises(lambda: D.main(["audit", "--protocol", PROTO, "--out", os.path.join(out_root, "audit")]), SystemExit, "exists"))
    check("cli: an output folder inside the repository is refused", raises(lambda: D.main(["audit", "--protocol", PROTO, "--out", os.path.join(REPO, "tmp-mnd-test")]), SystemExit, "inside the repository") and not os.path.exists(os.path.join(REPO, "tmp-mnd-test")))
    rc3 = D.main(["audit", "--protocol", PROTO, "--out", os.path.join(out_root, "audit2")])
    check("cli audit: deterministic (two runs, byte-identical audit.json and audit.md)", open(os.path.join(out_root, "audit", "audit.json"), "rb").read() == open(os.path.join(out_root, "audit2", "audit.json"), "rb").read()
          and open(os.path.join(out_root, "audit", "audit.md"), "rb").read() == open(os.path.join(out_root, "audit2", "audit.md"), "rb").read())
    rcf = D.main(["freeze", "--protocol", PROTO, "--out", os.path.join(out_root, "freeze")])
    fr = json.load(open(os.path.join(out_root, "freeze", "protocol.json")))
    check("cli freeze: exit 0 and a protocol.json with membership counts", rcf == 0 and fr["membership"]["B"]["count"] == 26913 and fr["membership"]["S"]["count"] == fr["membership"]["R"]["count"] + fr["membership"]["r2_nonreserved"]["count"])
    ids = lambda n: set(open(os.path.join(out_root, "freeze", "membership", n + ".ids"), encoding="utf8").read().split("\n")) - {""}
    check("cli freeze: no reserved r2 or calibration message is in the B, R or S files", not (ids("r2_reserved") & (ids("B") | ids("R") | ids("S"))) and not (ids("calibration") & (ids("B") | ids("R") | ids("S"))))
    check("cli freeze: no t1_clean or guard evaluation message is in a calibration file", not (ids("t1_clean") & ids("calibration")) and not ((ids("fresh2_test") | ids("short3_test") | ids("nl_a_development")) & ids("calibration")))
    check("cli freeze: the SHA256SUMS file covers the outputs", all(os.path.exists(os.path.join(out_root, "freeze", line.split("  ", 1)[1])) for line in open(os.path.join(out_root, "freeze", "SHA256SUMS")).read().split("\n") if line))
    # a refused freeze writes no usable protocol
    P = json.load(open(PROTO))
    P["support"]["calibration_groups_min"] = 10 ** 6
    pbad = os.path.join(out_root, "protocol_bad.json")
    json.dump(P, open(pbad, "w"))
    rcr = D.main(["freeze", "--protocol", pbad, "--out", os.path.join(out_root, "freeze_refused")])
    check("cli freeze: a FAIL check refuses the freeze (exit 1, freeze_refused.json, no protocol.json)", rcr == 1 and os.path.exists(os.path.join(out_root, "freeze_refused", "freeze_refused.json")) and not os.path.exists(os.path.join(out_root, "freeze_refused", "protocol.json")))
    # a changed source hash stops before anything is written
    P = json.load(open(PROTO))
    P["sources"][0]["files"][0]["sha256"] = "0" * 64
    pbad2 = os.path.join(out_root, "protocol_bad2.json")
    json.dump(P, open(pbad2, "w"))
    rc4 = D.main(["audit", "--protocol", pbad2, "--out", os.path.join(out_root, "audit_bad")])
    check("cli audit: a source whose hash differs from the protocol stops with exit 3 and writes nothing", rc4 == 3 and not os.path.exists(os.path.join(out_root, "audit_bad")))
    P = json.load(open(PROTO))
    P["c100"]["nl_dropped_ids"] = P["c100"]["nl_dropped_ids"][:-1]
    pbad3 = os.path.join(out_root, "protocol_bad3.json")
    json.dump(P, open(pbad3, "w"))
    rc5 = D.main(["audit", "--protocol", pbad3, "--out", os.path.join(out_root, "audit_bad3")])
    check("cli audit: a C100 membership that no longer reproduces cut_train.jsonl is a FAIL (exit 1)", rc5 == 1 and json.load(open(os.path.join(out_root, "audit_bad3", "audit.json")))["checks"][[c["id"] for c in json.load(open(os.path.join(out_root, "audit_bad3", "audit.json")))["checks"]].index("I4b")]["status"] == "FAIL")
    check("cli: build and verify stop on a protocol that is not frozen (exit 3)", D.main(["build", "--protocol", PROTO, "--arm", "B", "--out", os.path.join(out_root, "b")]) == 3 and D.main(["verify", "--protocol", PROTO, "--data", out_root]) == 3)
    check("cli: build and verify write nothing", not os.path.exists(os.path.join(out_root, "b")))
finally:
    shutil.rmtree(out_root, ignore_errors=True)


# ---------------------------------------------------------------- 8. build and verify on the frozen protocol-v2
import contextlib, io
PV = os.path.expanduser("~/.cache/diagram-vss-modernbert/next-2026-11-08/protocol-v2/protocol.json")
C100_DATA = os.path.expanduser("~/.cache/diagram-vss-modernbert/arms/data/C100")
check("build: the frozen protocol-v2 is present", os.path.isfile(PV))
check("build: key order of an overlaid args dict is kept (changed values in place, removed keys dropped, new keys appended)", list(D._overlaid_args({"action": "move", "target": "X", "position": "left"}, {"action": "move", "target": "X", "direction": "left"})) == ["action", "target", "direction"]
      and list(D._overlaid_args({"action": "undo"}, {"action": "undo", "count": "2"})) == ["action", "count"])
check("build: arm folder order is C100's, restored after the first list, r2 only in S", D.arm_dirs("B")[:2] == ["llm_train/sonnet_msg", "llm_train/haiku_msg"] and D.arm_dirs("B")[-2:] == D.C100_SAMPLE
      and D.arm_dirs("R")[len(D.C100_OLD) + len(D.C100_FIRST):][:len(D.RESTORED)] == D.RESTORED and D.R2_DIR not in D.arm_dirs("R") and D.arm_dirs("S").index(D.R2_DIR) == len(D.C100_OLD) + len(D.C100_FIRST) + len(D.RESTORED))
check("build: the recipe env is C100's (NUM_WORDS=table, IMPLIED_SCALE=1, LABEL_FIXES_L2); ROLE_TOO_RICH only in a legacy control", D.recipe_env(D.V2) == {"NUM_WORDS": "table", "IMPLIED_SCALE": "1", "LABEL_FIXES": D.L2_FIXES} and D.recipe_env("legacy")["ROLE_TOO_RICH"] == "context")
check("build: the child environment never inherits EXTRA_DIRS or ROLE_TOO_RICH", (lambda: (os.environ.update(EXTRA_DIRS="x", ROLE_TOO_RICH="context"), "EXTRA_DIRS" not in D.clean_env({}) and "ROLE_TOO_RICH" not in D.clean_env({}), os.environ.pop("EXTRA_DIRS"), os.environ.pop("ROLE_TOO_RICH"))[1])())
bt = tempfile.mkdtemp(prefix="mnd-build-")
try:
    def run(argv):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
            try:
                rc = D.main(argv)
            except SystemExit as e:
                rc = "SystemExit: " + str(e)
        return rc, buf.getvalue()
    B = os.path.join(bt, "B")
    rc, out = run(["build", "--protocol", PV, "--arm", "B", "--out", B])
    check("build B: exit 0, 26,913 messages, 57,135 rows, 15 data files", rc == 0 and "26913 messages, 57135 rows, 15 files" in out, out[-300:])
    M = json.load(open(B + ".manifest.json"))
    check("build B: the manifest carries the trainer's keys (messages, requests, files) and every data file hash", M["messages"] == 26913 and M["requests"] == 57135 and set(M["files"]) == {n for n in os.listdir(B) if ".json" in n} and len(M["files"]) == 15)
    check("build B: no manifest, messages or log file inside the data folder (the trainer hashes every *.json* file there)", not any(n.endswith(".manifest.json") or n.endswith(".messages.jsonl") for n in os.listdir(B)))
    check("build B: input hashes recorded (protocol, overlay, messages file, make_roles, make_data, LABEL_FIXES_L2) and the env", all(k in M["tools"] for k in ("make_roles.py", "make_data.py", "LABEL_FIXES_L2.jsonl")) and M["overlay"]["sha256"] and M["protocol"]["sha256"] and M["messages_file"]["sha256"] and M["env"]["IMPLIED_SCALE"] == "1")
    check("build B: the 16 overlay lines on B messages are applied to the messages file, the rest is untouched", len(M["overlay"]["applied_to_this_arm"]) == 16 and M["overlay"]["changes_total"] == 20)
    check("build B: the held-out files are empty", M["heldout_rows"] == 0 and os.path.getsize(os.path.join(B, "heldout.jsonl")) == 0 and os.path.getsize(os.path.join(B, "cut_heldout.jsonl")) == 0)
    check("build B: coverage lists undo count, label empty state and the v2 reader contract", M["coverage"]["output"]["total"]["undo with count in gold"] == 8 and M["coverage"]["output"]["total"]["text:label=empty"] == 146 and M["coverage"]["output"]["reader"]["output_contract"] == D.V2)
    # A4: the messages file's texts are the source texts, byte for byte; untouched lines are the raw source lines
    Fz, Pz, mem = D.load_frozen(PV)
    msgs0, per0, ov0 = D.load_universe(Pz, os.path.join(REPO, Pz["overlay"]), apply=False)
    src_text = {m["id"]: m["text"] for m in msgs0}
    mrows = [json.loads(l) for l in open(B + ".messages.jsonl", encoding="utf8") if l.strip()]
    check("build B: every message text in the messages file is byte-identical to its source text", len(mrows) == 26913 and all(r["text"].encode("utf8") == src_text[r["id"]].encode("utf8") for r in mrows))
    raw = {}
    for s_ in Pz["sources"]:
        for f in s_["files"]:
            if f["use"] == "rows":
                for l in open(os.path.join(D.SK, f["path"]), encoding="utf8", newline=""):
                    if l.strip():
                        raw[json.loads(l)["id"]] = l.rstrip("\n")
    lines_out = open(B + ".messages.jsonl", encoding="utf8", newline="").read().split("\n")[:-1]
    changed_ids = {x["id"] for x in M["overlay"]["applied_to_this_arm"]}
    check("build B: a message without an overlay change is its raw source line", all(l == raw[json.loads(l)["id"]] for l in lines_out if json.loads(l)["id"] not in changed_ids) and sum(1 for l in lines_out if json.loads(l)["id"] in changed_ids and l != raw[json.loads(l)["id"]]) == 16)
    rc, out = run(["verify", "--protocol", PV, "--data", B])
    check("verify B: exit 0", rc == 0 and out.startswith("verify ok"), out[-300:])
    check("build: an existing output path is refused", run(["build", "--protocol", PV, "--arm", "B", "--out", B])[0].startswith("SystemExit"))
    check("build: --no-overlay with the v2 contract is refused", run(["build", "--protocol", PV, "--arm", "B", "--no-overlay", "--out", os.path.join(bt, "x")])[0].startswith("SystemExit") and not os.path.exists(os.path.join(bt, "x")))
    check("build: an output path inside the repository is refused", run(["build", "--protocol", PV, "--arm", "B", "--out", os.path.join(REPO, "tmp-mnd-build")])[0].startswith("SystemExit"))
    rc, out = run(["build", "--protocol", PROTO, "--arm", "B", "--out", os.path.join(bt, "y")])
    check("build: a protocol that is not frozen stops (exit 3)", rc == 3 and not os.path.exists(os.path.join(bt, "y")), str(rc))

    def clone(name):
        d = os.path.join(bt, name)
        shutil.copytree(B, d)
        shutil.copy(B + ".manifest.json", d + ".manifest.json")
        shutil.copy(B + ".messages.jsonl", d + ".messages.jsonl")
        return d
    # a tampered output file
    T1 = clone("T1")
    with open(os.path.join(T1, "train.jsonl"), "ab") as f:
        f.write(b" ")
    rc, out = run(["verify", "--protocol", PV, "--data", T1])
    check("verify: a tampered output file fails (hash differs from the manifest)", rc == 1 and "data files differ from the manifest" in out and "train.jsonl" in out, out[-300:])
    # a tampered messages file
    T2 = clone("T2")
    with open(T2 + ".messages.jsonl", "ab") as f:
        f.write(b"\n")
    rc, out = run(["verify", "--protocol", PV, "--data", T2])
    check("verify: a tampered messages file fails", rc == 1 and "messages file" in out, out[-300:])
    # an extra file in the data folder
    T3 = clone("T3")
    open(os.path.join(T3, "extra.jsonl"), "w").write("")
    rc, out = run(["verify", "--protocol", PV, "--data", T3])
    check("verify: an extra json file in the data folder fails", rc == 1 and "extra.jsonl" in out, out[-300:])
    # a wrong overlay hash in the manifest
    T4 = clone("T4")
    mm = json.load(open(T4 + ".manifest.json")); mm["overlay"]["sha256"] = "0" * 64
    json.dump(mm, open(T4 + ".manifest.json", "w"))
    rc, out = run(["verify", "--protocol", PV, "--data", T4])
    check("verify: an overlay hash that differs from the manifest's fails", rc == 1 and "overlay file differs" in out, out[-300:])
    # a changed tool hash
    T5 = clone("T5")
    mm = json.load(open(T5 + ".manifest.json")); mm["tools"]["make_roles.py"] = "0" * 64
    json.dump(mm, open(T5 + ".manifest.json", "w"))
    rc, out = run(["verify", "--protocol", PV, "--data", T5])
    check("verify: a converter that changed since the build fails", rc == 1 and "tool changed" in out, out[-300:])
    # a deliberately leaked row, with the manifest repaired so that only the leak check can catch it
    T6 = clone("T6")
    leak_id = mem["calibration"][0]
    leak_msg = next(m for m in msgs0 if m["id"] == leak_id)
    leak_row = {"id": leak_id, "text": leak_msg["text"], "words": leak_msg["text"].split(), "tags": ["O"] * len(leak_msg["text"].split())}
    with open(os.path.join(T6, "cut_train.jsonl"), "a", encoding="utf8") as f:
        f.write(json.dumps(leak_row) + "\n")
    mm = json.load(open(T6 + ".manifest.json"))
    mm["files"] = D.data_files(T6)
    mm["messages"] += 1
    json.dump(mm, open(T6 + ".manifest.json", "w"))
    rc, out = run(["verify", "--protocol", PV, "--data", T6])
    check("verify: a calibration message put into a cut row is detected as a leak even with a consistent manifest", rc == 1 and "(leak)" in out and leak_id in out and "data files differ" not in out, out[-400:])
    T7 = clone("T7")
    rs_id = mem["r2_reserved"][0]
    rs_msg = next(m for m in msgs0 if m["id"] == rs_id)
    row = {"id": rs_id, "text": rs_msg["wires"][0]["span"], "words": [], "tags": [], "act": "move", "classes": {}, "gold": {}}
    with open(os.path.join(T7, "train.jsonl"), "a", encoding="utf8") as f:
        f.write(json.dumps(row) + "\n")
    mm = json.load(open(T7 + ".manifest.json"))
    mm["files"] = D.data_files(T7)
    mm["requests"] += 1
    json.dump(mm, open(T7 + ".manifest.json", "w"))
    rc, out = run(["verify", "--protocol", PV, "--data", T7])
    check("verify: a reserved r2 message put into a request row is detected as a leak", rc == 1 and "(leak)" in out and rs_id in out, out[-400:])
    # an altered frozen protocol: the overlay hash no longer matches the repository overlay
    PD = os.path.join(bt, "pv2")
    for root, _d, fs in os.walk(os.path.dirname(PV)):
        os.makedirs(os.path.join(PD, os.path.relpath(root, os.path.dirname(PV))), exist_ok=True)
        for fn in fs:
            shutil.copyfile(os.path.join(root, fn), os.path.join(PD, os.path.relpath(os.path.join(root, fn), os.path.dirname(PV))))
    Fx = json.load(open(os.path.join(PD, "protocol.json")))
    Fx["overlay"]["sha256"] = "1" * 64
    json.dump(Fx, open(os.path.join(PD, "protocol.json"), "w"))
    rc, out = run(["build", "--protocol", os.path.join(PD, "protocol.json"), "--arm", "B", "--out", os.path.join(bt, "z")])
    check("build: an overlay that changed since the freeze stops the build (exit 3, nothing written)", rc == 3 and "overlay" in out and not os.path.exists(os.path.join(bt, "z")) and not os.path.exists(os.path.join(bt, "z.messages.jsonl")), out[-300:])
    open(os.path.join(PD, "membership", "B.ids"), "a").write("extra\n")
    rc, out = run(["verify", "--protocol", os.path.join(PD, "protocol.json"), "--data", B])
    check("verify: a frozen membership file that changed stops (exit 3)", rc == 3 and "membership file changed" in out, out[-300:])
    # the control: C100's own recipe, legacy contract, no overlay, reproduces the cached C100 data
    if os.path.isdir(C100_DATA):
        CB = os.path.join(bt, "CB")
        rc, out = run(["build", "--protocol", PV, "--arm", "B", "--contract", "legacy", "--no-overlay", "--out", CB])
        same = [n for n in os.listdir(C100_DATA) if os.path.isfile(os.path.join(CB, n)) and D.sha256_file(os.path.join(C100_DATA, n)) == D.sha256_file(os.path.join(CB, n))]
        diff = sorted(set(os.listdir(C100_DATA)) - set(same))
        check("control: a legacy-contract, no-overlay build of the B ids equals C100's cached data in 13 files; only coverage.json and trigger_inventory.json differ", rc == 0 and len(same) == 13 and diff == ["coverage.json", "trigger_inventory.json"], str((rc, diff)))
        cov_a, cov_b = json.load(open(os.path.join(C100_DATA, "coverage.json"))), json.load(open(os.path.join(CB, "coverage.json")))
        ti_a, ti_b = json.load(open(os.path.join(C100_DATA, "trigger_inventory.json"))), json.load(open(os.path.join(CB, "trigger_inventory.json")))
        check("control: coverage.json differs only by messages_input; trigger_inventory differs only in source and extra_dirs", set(cov_b) - set(cov_a) == {"messages_input"} and {k: v for k, v in cov_b.items() if k != "messages_input"} == cov_a
              and [k for k in ti_a if ti_a[k] != ti_b[k]] == ["source", "extra_dirs"])
        check("control: verify accepts the legacy control build", run(["verify", "--protocol", PV, "--data", CB])[0] == 0)
    else:
        check("control: the cached C100 data is present", False)
finally:
    shutil.rmtree(bt, ignore_errors=True)

print(f"executed checks: {executed}")
if executed == 0:
    print("FAILED: no check ran")
    sys.exit(1)
print("FAILED (%d)" % fails if fails else "PASS")
sys.exit(1 if fails else 0)
