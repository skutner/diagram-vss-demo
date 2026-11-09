#!/usr/bin/env python3
"""modernbert_next_data.py: sources, connected groups, reservation, audit and freeze of the ModernBERT-next campaign
(reports/modernbert-next-plan-2026-11-08_codex.md, "Interfaces / contracts" 2 and 4, build step 1).

  python3 -B training/neural/parity/modernbert_next_data.py audit  --protocol FILE --out DIR
  python3 -B training/neural/parity/modernbert_next_data.py freeze --protocol FILE --out DIR
  python3 -B training/neural/parity/modernbert_next_data.py build  --protocol FROZEN.json --arm B|R|S --out DIR [--contract legacy --no-overlay: the control]
  python3 -B training/neural/parity/modernbert_next_data.py verify --protocol FROZEN.json --data DIR
  python3 -B training/neural/parity/modernbert_next_data.py discover --out FILE      (writes a protocol's source list with SHA-256; a helper)

Exit codes: 0 every check PASS; 1 an audit/freeze check is FAIL or UNAVAILABLE (the outputs are written, a freeze writes no protocol.json);
2 usage, not implemented or an output dir that exists / lies in the repository; 3 source identity or overlay precondition failure (nothing written).
Outputs are deterministic: no timestamps, no absolute paths; the same inputs give the same bytes. OUT must not exist and must be outside the repository.

Provenance grouping (plan section 4). One graph node per message id. Two messages are in one connected group when they share any of:
  session (S)        a `session` field (nl_* sources); scenes_r3, scenes_r3b, scenes_test have no field: the file is the scene (the precedent of
                     parity/sets.mjs for scenes_test), flagged `session_from_file` in the protocol
  paraphrase (G)     a `group` field (nl_* sources)
  origin (O)         `origin`, `meta.origin` or `meta.from` (the source id of a mechanical variant; none of the raw source files carries one,
                     the derived bare views do); the message whose id equals the origin joins the group as well
  whole text (T)     the whole message text, lower case with whitespace runs collapsed to one space
  request span (P)   the complete annotated span of any wire, same normalisation. No substring, bag-of-words or delexicalised match.
Session and group values are namespaced by source (equal strings in two sources do not join them; the audit lists such collisions).
The group key is the smallest message id of the group (string order), after a global uniqueness check of ids.

Reservation (plan section 4, steps 1-7), see `plan_reservation`. Overlay (plan section 2), see `check_overlay`.
Stdlib only. Reads node (parity/sets.mjs, docs/js/logic.js) for a cross-check and the legend; node missing makes those checks UNAVAILABLE.
"""
import argparse, collections, glob, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
SK = os.path.join(REPO, "training", "sketch")
CACHE = os.path.expanduser("~/.cache/diagram-vss-modernbert")
PROTOCOL_VERSION = "modernbert-next-protocol-v1"
PASS, FAIL, UNAVAILABLE, REPORT = "PASS", "FAIL", "UNAVAILABLE", "REPORT"


class Stop(Exception):
    """a stop: source identity or a precondition failed (exit 3)"""
    code = 3


class OverlayError(Stop):
    pass


# ---------------------------------------------------------------- small helpers

def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_mod(s, n):
    """SHA256(s) % n, as parity/sets.mjs sha256Mod and calibrate_modernbert.mjs isCalibration"""
    return int(hashlib.sha256(str(s).encode("utf8")).hexdigest(), 16) % n


def norm_text(s):
    """lower case + whitespace runs collapsed to one space (plan section 4; shortcmd/bare_view.py norm). Provenance grouping only, never model input"""
    return " ".join(str(s).lower().split())


def canon(o):
    return json.dumps(o, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def dumps(o):
    return json.dumps(o, sort_keys=True, ensure_ascii=False, indent=1) + "\n"


def parts(v):
    """split "a,b" at commas outside parentheses (make_roles.parts, bench-canon.js parts)"""
    out, d, cur = [], 0, ""
    for ch in str(v):
        if ch == "(":
            d += 1
        if ch == ")":
            d -= 1
        if ch == "," and d == 0:
            out.append(cur.strip())
            cur = ""
        else:
            cur += ch
    out.append(cur.strip())
    return [p for p in out if p]


def mention_args(p):
    """"mention(color=red,shape=circle)" -> {"color": "red", "shape": "circle"} (make_roles.mention_args)"""
    return dict(kv.split("=", 1) for kv in parts(p[len("mention("):-1]) if "=" in kv)


def act_of(type_, args):
    """make_data.act_of"""
    if type_ == "command":
        return args.get("action")
    if type_ == "question":
        return args.get("ask")
    return type_


def acts_from_neural_js():
    """docs/js/neural.js ACTION + ASK + fact + rule, as make_data.acts_from_neural_js"""
    src = open(os.path.join(REPO, "docs", "js", "neural.js"), encoding="utf8").read()

    def keys(name):
        i = src.index(f"const {name} = {{")
        j = src.index("\n};", i)
        return re.findall(r"^  (\w+): \[", src[i:j], re.M)
    return keys("ACTION") + keys("ASK") + ["fact", "rule"]


def is_pending(w):
    return bool(w.get("pending"))


def produced_requests(m, acts):
    """the wires make_roles.requests turns into a training row: a span that is in the text and an act of the act set (pending wires have neither)"""
    out = []
    for i, w in enumerate(m["wires"]):
        if is_pending(w):
            continue
        sp, args = w.get("span"), w.get("args", {})
        if not sp or sp not in m["text"]:
            continue
        if act_of(w.get("type"), args) in acts:
            out.append(i)
    return out


# ---------------------------------------------------------------- source discovery and loading

def label_files(d):
    """make_data.label_files: msg_*.jsonl and batch_*.jsonl of a folder; a folder nl_p*: its opus/ (relative paths, sorted)"""
    base = os.path.join(SK, d, "opus") if re.fullmatch(r"nl_p[^/]*", os.path.basename(os.path.normpath(d))) else os.path.join(SK, d)
    fs = sorted(glob.glob(os.path.join(base, "msg_*.jsonl")) + glob.glob(os.path.join(base, "batch_*.jsonl")))
    return [os.path.relpath(f, SK) for f in fs]


def msg_files(d):
    return [os.path.relpath(f, SK) for f in sorted(glob.glob(os.path.join(SK, d, "msg_*.jsonl")))]


def jsonl_files(d):
    return [os.path.relpath(f, SK) for f in sorted(glob.glob(os.path.join(SK, d, "*.jsonl")))]


# the folders, written out (not read from build_arm_data.sh / make_data.py at run time: EXTRA_DIRS would mutate make_data.DIRS)
# build_arm_data.sh FIRST, M2S, M2N; make_data.py DIRS and SAMPLE_DIRS (--all trains on them as well)
C100_OLD = ["llm_train/sonnet_msg", "llm_train/haiku_msg", "llm_train/sonnet_msg2", "llm_train/haiku_msg2", "llm_train/sonnet_long",
            "llm_bench/fresh1/sonnet", "llm_bench/fresh1/haiku", "llm_train/sonnet_short", "llm_train/haiku_short"]
C100_FIRST = ["llm_train/" + d for d in ("opus_train_a", "opus_train_b", "opus_train_c", "opus_train_d", "opus_gen_1", "opus_gen_2", "synth_rules",
                                         "synth_rules_ops", "synth_rules_ext", "ops_formulations", "opus_ext_1", "synth_combo")]
C100_SAMPLE = ["llm_bench/sonnet_spans", "llm_bench/haiku_spans"]
C100_NL = ["llm_train/nl_p1", "llm_train/nl_p2"]
RESTORED = ["llm_train/" + d for d in ("scenes_r3", "scenes_r3b", "opus_r3_gaps", "opus_tgt_1", "opus_tgt_2", "ops_groups", "ops_positions", "opus_short_r2")]
SESSION_FROM_FILE = {"llm_train/scenes_r3", "llm_train/scenes_r3b", "llm_bench/scenes_test"}
R2_DIR, T1_DIR = "llm_train/synth_short_r2", "llm_bench/synth_short_t1"
FRESH2_FILES = [f"llm_bench/fresh2/opus_{x}/batch_01.jsonl" for x in "abcd"]


def source_id(d):
    return d


def discover_sources():
    """-> list of source dicts (without hashes): id, role, family, rule, session_from_file, files [{path, use}]"""
    S = []

    def add(d, role, family, files, uses=None, **kw):
        S.append(dict(id=source_id(d), dir=d, role=role, family=family, session_from_file=d in SESSION_FROM_FILE,
                      files=[{"path": f, "use": (uses or {}).get(f, "rows")} for f in files], **kw))
    for d in C100_OLD + C100_FIRST + C100_SAMPLE:
        add(d, "c100", "c100", label_files(d), rule="label_files")
    for d in C100_NL:
        add(d, "c100_nl", "c100", label_files(d), rule="label_files")
    for d in RESTORED:
        add(d, "restored", "restored", label_files(d), rule="label_files")
    add(R2_DIR, "r2", "synthetic-short", msg_files(R2_DIR), rule="msg_files")
    add("llm_bench/fresh2", "set:fresh2", "older-long", FRESH2_FILES, rule="sets.mjs fresh2")
    add("llm_bench/short3", "set:short3", "realistic-short", ["llm_bench/short3/batch_01.jsonl"], rule="sets.mjs short3")
    for name in ("nl_a", "nl_b"):
        d = f"llm_bench/{name}"
        op, gp = jsonl_files(d + "/opus"), jsonl_files(d + "/gpt")
        add(d, "set:" + name, "natural-language" if name == "nl_a" else "eval-only", op + gp, uses={f: "alt" for f in gp}, rule="sets.mjs dual")
    add(T1_DIR, "t1", "synthetic-short-eval", msg_files(T1_DIR), rule="msg_files")
    add("llm_bench/collected_1", "other_eval", "eval-only", ["llm_bench/collected_1/batch_01.jsonl", "llm_bench/collected_1/batch_02.jsonl"], rule="sets.mjs collected_1")
    add("llm_bench/scenes_test", "other_eval", "eval-only", [f"llm_bench/scenes_test/batch_0{i}.jsonl" for i in (1, 2, 3, 4)], rule="sets.mjs scenes_test")
    return S


def read_jsonl(path):
    rows = []
    with open(path, encoding="utf8") as f:
        for n, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except ValueError as e:
                raise Stop(f"{path}:{n}: not JSON ({e})")
    return rows


def origin_of(row):
    meta = row.get("meta") if isinstance(row.get("meta"), dict) else {}
    for v in (row.get("origin"), meta.get("origin"), meta.get("from")):
        if v is not None and v != "":
            return str(v)
    return None


def load_source(src, sk=None):
    """the message dicts of one protocol source, rows files only (the `alt` files of a dual set are checked, not nodes)"""
    sk = sk or SK
    out, alt = [], []
    for f in src["files"]:
        rows = read_jsonl(os.path.join(sk, f["path"]))
        if f["use"] == "alt":
            alt += [(f["path"], r) for r in rows]
            continue
        for i, r in enumerate(rows):
            if not isinstance(r.get("id"), str) or not r["id"] or not isinstance(r.get("text"), str):
                raise Stop(f"{f['path']}:{i + 1}: a row needs a string id and text")
            wires = r.get("wires")
            if wires is None:
                wires = []
            if not isinstance(wires, list):
                raise Stop(f"{f['path']}:{i + 1}: {r['id']}: wires is not a list")
            m = dict(id=r["id"], text=r["text"], wires=json.loads(json.dumps(wires)), wires_source=json.loads(json.dumps(wires)), names=list(r.get("names") or []),
                     source=src["id"], file=f["path"], line=i + 1, kind=r.get("kind"), meta=r.get("meta") if isinstance(r.get("meta"), dict) else {},
                     session=r.get("session"), group=r.get("group"), origin=origin_of(r), has_wires_key="wires" in r,
                     unreliable=bool(r.get("unreliable")), roles=set(), part=None)
            if src.get("session_from_file") and m["session"] is None:
                m["session"] = "file:" + os.path.basename(f["path"])
                m["session_from_file"] = True
            m["pending"] = any(is_pending(w) for w in m["wires"])
            out.append(m)
    return out, alt


def set_parts(src_id, msgs):
    """the part of each message of a calibration-capable set, as parity/sets.mjs assignParts: -> list of parts"""
    if src_id in ("llm_bench/fresh2", "llm_bench/short3"):
        return ["calibration" if sha256_mod(m["id"], 3) == 0 else "test" for m in msgs]
    if src_id == "llm_bench/nl_a":
        parent = {}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def labels(m):
            if m["session"] is None and m["group"] is None:
                return ["I:" + m["id"]]
            return [l for l in ("S:" + str(m["session"]) if m["session"] is not None else None, "G:" + str(m["group"]) if m["group"] is not None else None) if l]
        for m in msgs:
            for l in labels(m):
                parent.setdefault(l, l)
        for m in msgs:
            ls = labels(m)
            for i in range(1, len(ls)):
                parent[find(ls[i])] = find(ls[0])
        key = {}
        for m in msgs:
            root = find(labels(m)[0])
            k = str(m["session"] if m["session"] is not None else m["group"] if m["group"] is not None else m["id"])
            if root not in key or k < key[root]:
                key[root] = k
        return ["calibration" if sha256_mod(key[find(labels(m)[0])], 2) == 0 else "development" for m in msgs]
    return ["all"] * len(msgs)


def assign_roles(sources, per_source, protocol):
    """roles of every message. -> flat list of messages. role names: train_c100, train_restored, excluded_test_overlap, r2, cal_cand, guard_eval,
    excluded_pending, t1, other_eval. A message of fresh2/short3 with a pending gold wire is left out of scoring (sets.mjs) but stays a graph node."""
    dropped = set(protocol["c100"]["nl_dropped_ids"])
    allm = []
    for src in sources:
        msgs = per_source[src["id"]]
        role = src["role"]
        if role == "c100":
            for m in msgs:
                m["roles"].add("train_c100")
        elif role == "c100_nl":
            for m in msgs:
                m["roles"].add("excluded_test_overlap" if m["id"] in dropped else "train_c100")
        elif role == "restored":
            for m in msgs:
                m["roles"].add("train_restored")
        elif role == "r2":
            for m in msgs:
                m["roles"].add("r2")
        elif role in ("set:fresh2", "set:short3", "set:nl_a"):
            ps = set_parts(src["id"], [m for m in msgs if not m["pending"]] if role != "set:nl_a" else msgs)
            it = iter(ps)
            for m in msgs:
                if role != "set:nl_a" and m["pending"]:
                    m["roles"].add("excluded_pending")
                    continue
                m["part"] = next(it)
                m["roles"].add("cal_cand" if m["part"] == "calibration" else "guard_eval")
        elif role == "set:nl_b":
            for m in msgs:
                m["roles"].add("other_eval")
        elif role == "t1":
            for m in msgs:
                m["roles"].add("t1")
        elif role == "other_eval":
            for m in msgs:
                m["roles"].add("other_eval")
        else:
            raise Stop(f"source {src['id']}: unknown role {role}")
        allm += msgs
    return allm


# ---------------------------------------------------------------- connected groups

class UF:
    def __init__(self, n):
        self.p = list(range(n))

    def find(self, x):
        p = self.p
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        self.p[max(ra, rb)] = min(ra, rb)
        return True


REASONS = ("session", "group", "origin", "text", "span")


def message_keys(m):
    """-> list of (reason, key) of one message. Namespaced session/group; text and spans normalised"""
    ks = []
    if m.get("session") is not None:
        ks.append(("session", f"{m['source']}|{m['session']}"))
    if m.get("group") is not None:
        ks.append(("group", f"{m['source']}|{m['group']}"))
    if m.get("origin"):
        ks.append(("origin", m["origin"]))
    ks.append(("text", norm_text(m["text"])))
    for w in m["wires"]:
        sp = w.get("span")
        if isinstance(sp, str) and sp.strip():
            ks.append(("span", norm_text(sp)))
    return ks


def build_groups(msgs):
    """connected groups over one node per message id -> dict(gkey_of: [group key per message], groups: {key: [indices]}, merges: {reason: n},
    shared: {reason: n keys shared by >= 2 messages}, edges: {(reason, key): [indices]}). Group key = smallest message id of the component."""
    ids = [m["id"] for m in msgs]
    if len(set(ids)) != len(ids):
        dup = sorted(i for i, c in collections.Counter(ids).items() if c > 1)
        raise Stop(f"message ids are not unique across the universe ({len(dup)} duplicates: {dup[:5]})")
    index = {m["id"]: i for i, m in enumerate(msgs)}
    edges = collections.defaultdict(list)
    for i, m in enumerate(msgs):
        seen = set()
        for r, k in message_keys(m):
            if (r, k) not in seen:
                seen.add((r, k))
                edges[(r, k)].append(i)
        o = m.get("origin")
        if o and o in index and index[o] != i:
            edges[("origin", o)].append(index[o])
    uf = UF(len(msgs))
    merges = {r: 0 for r in REASONS}
    shared = {r: 0 for r in REASONS}
    for r in REASONS:
        for (rr, k), mem in sorted((e for e in edges.items() if e[0][0] == r), key=lambda e: e[0][1]):
            mem = sorted(set(mem))
            if len(mem) < 2:
                continue
            shared[r] += 1
            for j in mem[1:]:
                if uf.union(mem[0], j):
                    merges[r] += 1
    comp = collections.defaultdict(list)
    for i in range(len(msgs)):
        comp[uf.find(i)].append(i)
    groups, gkey = {}, [None] * len(msgs)
    for root, mem in comp.items():
        key = min(ids[i] for i in mem)
        groups[key] = sorted(mem)
        for i in mem:
            gkey[i] = key
    return dict(gkey=gkey, groups=groups, merges=merges, shared=shared, edges=edges)


def group_reasons(G, msgs):
    """the reasons of the keys that join >= 2 messages, per group key"""
    out = collections.defaultdict(collections.Counter)
    for (r, k), mem in G["edges"].items():
        mem = sorted(set(mem))
        if len(mem) >= 2:
            out[G["gkey"][mem[0]]][r] += 1
    return out


# ---------------------------------------------------------------- reservation

TRAIN_ROLES = ("train_c100", "train_restored")


def group_flags(msgs, G):
    """per group key: the set of roles of its messages and counts"""
    fl = {}
    for key, mem in G["groups"].items():
        roles = collections.Counter()
        for i in mem:
            for r in msgs[i]["roles"]:
                roles[r] += 1
        fl[key] = roles
    return fl


def plan_reservation(msgs, G, params):
    """The plan's section 4 reservation, steps 1-7 (step 6 and 7 belong to `build`).
    1. maximum training universe: roles train_c100, train_restored, r2.
    2. start with the calibration portions of fresh2, short3, nl_a (role cal_cand).
    3. a calibration group touching a C100/restored training message (the group holds one, or shares a whole text / span with one) is ineligible.
       Also ineligible (A3: zero train/calibration intersections for EVERY arm): a calibration group that holds an r2 message that is not reserved,
       since arm S trains on it.
    4. r2 groups with SHA256(group_key) % 3 == 0 are reserved only if they touch neither C100/restored training nor a guard evaluation group
       (fresh2 test, short3 test, nl_a development). All their messages stay out of every arm.
    5. a calibration group that holds a guard evaluation message is removed whole (calibration and evaluation never cross). With
       params['t1_is_evaluation_for_calibration'] a group holding a t1 message is removed as well (the plan's t1_clean is built to touch no
       calibration, so the default is False).
    -> dict(reserved: set of group keys, population: set of group keys, status: {group key: reason | 'eligible'}, n_by_reason)"""
    fl = group_flags(msgs, G)
    mod = params["r2_reserve_modulus"]
    reserved = set()
    for key, c in fl.items():
        if c["r2"] and sha256_mod(key, mod) == params["r2_reserve_residue"] and not c["train_c100"] and not c["train_restored"] and not c["guard_eval"]:
            reserved.add(key)
    status = {}
    for key, c in fl.items():
        if not (c["cal_cand"] or key in reserved):
            continue
        if c["train_c100"] or c["train_restored"]:
            status[key] = "touches_c100_or_restored"
        elif c["r2"] and key not in reserved:
            status[key] = "touches_nonreserved_r2"
        elif c["guard_eval"]:
            status[key] = "touches_guard_evaluation"
        elif params.get("t1_is_evaluation_for_calibration") and c["t1"]:
            status[key] = "touches_t1"
        else:
            status[key] = "eligible"
    population = {k for k, v in status.items() if v == "eligible"}
    return dict(reserved=reserved, population=population, status=status, flags=fl,
                n_by_reason=dict(collections.Counter(status.values())))


def memberships(msgs, G, res):
    """-> dict of message-index lists: B, R, S, reserved_r2, nonreserved_r2, calibration, t1_clean ..."""
    b = [i for i, m in enumerate(msgs) if "train_c100" in m["roles"]]
    r = b + [i for i, m in enumerate(msgs) if "train_restored" in m["roles"]]
    r2 = [i for i, m in enumerate(msgs) if "r2" in m["roles"]]
    r2_res = [i for i in r2 if G["gkey"][i] in res["reserved"]]
    r2_non = [i for i in r2 if G["gkey"][i] not in res["reserved"]]
    cal = [i for i, m in enumerate(msgs) if ("cal_cand" in m["roles"] or "r2" in m["roles"]) and G["gkey"][i] in res["population"]
           and ("cal_cand" in m["roles"] or G["gkey"][i] in res["reserved"])]
    return dict(B=sorted(b), R=sorted(r), S=sorted(r + r2_non), r2_reserved=sorted(r2_res), r2_nonreserved=sorted(r2_non), calibration=sorted(cal))


def t1_clean(msgs, G, res, strict=False):
    """t1 messages whose group touches neither the maximum training universe (C100, restored, any r2) nor calibration.
    strict: also no calibration candidate of the historical portions"""
    out = []
    for i, m in enumerate(msgs):
        if "t1" not in m["roles"]:
            continue
        c = res["flags"][G["gkey"][i]]
        if c["train_c100"] or c["train_restored"] or c["r2"] or G["gkey"][i] in res["population"]:
            continue
        if strict and c["cal_cand"]:
            continue
        out.append(i)
    return out


def leakage_checks(msgs, G, res, mem, t1c):
    """direct checks on the frozen membership (not by construction only): ids, groups, whole texts and spans.
    -> list of (name, ok, detail)"""
    def ids(ix):
        return {msgs[i]["id"] for i in ix}

    def gk(ix):
        return {G["gkey"][i] for i in ix}

    def keys(ix):
        s = set()
        for i in ix:
            s.add(("text", norm_text(msgs[i]["text"])))
            for w in msgs[i]["wires"]:
                if isinstance(w.get("span"), str) and w["span"].strip():
                    s.add(("span", norm_text(w["span"])))
        return s
    cal, res_r2 = mem["calibration"], mem["r2_reserved"]
    guard = [i for i, m in enumerate(msgs) if "guard_eval" in m["roles"]]
    out = []
    for arm in ("B", "R", "S"):
        out.append((f"reserved r2 message in {arm}", not (ids(res_r2) & ids(mem[arm])), sorted(ids(res_r2) & ids(mem[arm]))[:5]))
        out.append((f"calibration message in {arm}", not (ids(cal) & ids(mem[arm])), sorted(ids(cal) & ids(mem[arm]))[:5]))
        out.append((f"calibration/{arm} shared group", not (gk(cal) & gk(mem[arm])), sorted(gk(cal) & gk(mem[arm]))[:5]))
        out.append((f"calibration/{arm} shared text or span", not (keys(cal) & keys(mem[arm])), len(keys(cal) & keys(mem[arm]))))
        out.append((f"reserved r2/{arm} shared text or span", not (keys(res_r2) & keys(mem[arm])), len(keys(res_r2) & keys(mem[arm]))))
    out.append(("calibration/guard-evaluation shared group", not (gk(cal) & gk(guard)), sorted(gk(cal) & gk(guard))[:5]))
    out.append(("calibration/guard-evaluation shared text or span", not (keys(cal) & keys(guard)), len(keys(cal) & keys(guard))))
    out.append(("calibration/t1_clean shared group", not (gk(cal) & gk(t1c)), sorted(gk(cal) & gk(t1c))[:5]))
    for arm in ("B", "R", "S"):
        out.append((f"t1_clean/{arm} shared group", not (gk(t1c) & gk(mem[arm])), sorted(gk(t1c) & gk(mem[arm]))[:5]))
    out.append(("B within R within S", set(mem["B"]) <= set(mem["R"]) <= set(mem["S"]), None))
    out.append(("S = R + nonreserved r2, exactly", set(mem["S"]) == set(mem["R"]) | set(mem["r2_nonreserved"]) and not set(mem["R"]) & set(mem["r2_nonreserved"]), None))
    return out


# ---------------------------------------------------------------- overlay (plan section 2)

OVERLAY_KEYS = {"source_file", "source_sha256", "id", "wire_index", "expected_span", "expected_args", "replacement_args", "reason"}
NAMES_KINDS = {"names", "name", "text", "texts", "point"}


def load_legend():
    """{key: {kind, values}} from docs/js/logic.js read with node (make_roles.legend). Raises Stop when node is not usable"""
    js = ("const K=require(process.argv[1]);const L=K.createSystem().engine.legend;const o={};"
          "for(const [k,q] of L.questions)o[k]={kind:q.kind,values:q.values?Object.keys(q.values):null};console.log(JSON.stringify(o))")
    try:
        r = subprocess.run(["node", "-e", js, os.path.join(REPO, "docs", "js", "logic.js")], capture_output=True, text=True, check=True)
    except (OSError, subprocess.CalledProcessError) as e:
        raise Stop(f"cannot read the legend with node: {e}")
    L = json.loads(r.stdout)
    src = open(os.path.join(REPO, "docs", "js", "neural.js"), encoding="utf8").read()
    m = re.search(r"const SAME_AS = \{([^}]*)\}", src)
    for k, base in (dict(re.findall(r"(\w+): '(\w+)'", m.group(1))) if m else {}).items():
        if k not in L and base in L:
            L[k] = dict(L[base])
    return L


def validate_args(args, legend):
    """-> list of problems of an args dict against the legend: every key a legend question; an enum value one of its values; a number a finite number;
    text kinds a string (the empty string is a valid text: explicit removal, distinct from an absent key)"""
    bad = []
    if not isinstance(args, dict):
        return ["args is not an object"]
    for k, v in args.items():
        q = legend.get(k)
        if q is None:
            bad.append(f"key {k!r} is not in the legend")
            continue
        if isinstance(v, bool) or v is None or isinstance(v, (list, dict)):
            bad.append(f"{k}: value {v!r} is not a string or number")
            continue
        if q["values"] is not None:
            # a key with a value list is closed whatever its kind (enum, or text such as `ask` and `kind`): make_roles learns it as a class head
            if v not in q["values"]:
                bad.append(f"{k}: {v!r} is not a legend value ({', '.join(q['values'][:6])}...)")
        elif q["kind"] == "number":
            try:
                x = float(v)
                if x != x or x in (float("inf"), float("-inf")):
                    raise ValueError
            except (TypeError, ValueError):
                bad.append(f"{k}: {v!r} is not a number")
        elif q["kind"] in NAMES_KINDS or q["kind"] == "text":
            if not isinstance(v, str):
                bad.append(f"{k}: {v!r} is not a string")
    return bad


def load_overlay(path):
    """the overlay lines (empty file: no corrections). A line that is not a JSON object stops with its number"""
    if not os.path.isfile(path):
        raise OverlayError(f"overlay: no such file: {path}")
    out = []
    with open(path, encoding="utf8") as f:
        for n, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                r = json.loads(line)
            except ValueError as e:
                raise OverlayError(f"overlay line {n}: not JSON: {e}")
            out.append((n, r))
    return out


def check_overlay(lines, files, legend):
    """Check every precondition of every line, then apply the lines in memory. Nothing is applied when any line fails; all problems are reported.
    files: {source_file: {"path": absolute path, "sha256": the protocol's hash of the file, "messages": [message dicts of this file]}}
    A line {source_file, source_sha256, id, wire_index, expected_span, expected_args, replacement_args, reason} is applied only when:
      the keys are exactly these; source_file is a protocol rows file; its current SHA-256 equals both source_sha256 and the protocol's;
      the id is in that file exactly once; wire_index is an int, in range and not a pending wire; the wire's span equals expected_span and its
      args equal expected_args exactly (canonical JSON: 2 and "2" differ); expected_args != replacement_args; replacement_args are valid
      legend values (explicit text removal is label = ""); no other line names the same (file, id, wire_index).
    A wire whose args already equal replacement_args is an inconsistent already-applied state (the source hash matches, so the expected annotation
    must be there): a stop, never a silent skip. Idempotence is by line: re-checking the same lines on an unmodified universe applies each once.
    -> list of change records {source_file, id, wire_index, line, changed_keys: {key: [old, new]}, roles: [...]}"""
    problems, plan, seen = [], [], {}
    cur_hash = {}
    index = {}
    for f, info in files.items():
        idx = collections.defaultdict(list)
        for m in info["messages"]:
            idx[m["id"]].append(m)
        index[f] = idx
    for n, r in lines:
        where = f"overlay line {n}"
        if not isinstance(r, dict) or set(r) != OVERLAY_KEYS:
            problems.append(f"{where}: the keys must be exactly {sorted(OVERLAY_KEYS)}")
            continue
        f = r["source_file"]
        if not isinstance(f, str) or f not in files:
            problems.append(f"{where}: source_file {f!r} is not a rows file of the protocol")
            continue
        if f not in cur_hash:
            cur_hash[f] = sha256_file(files[f]["path"]) if os.path.isfile(files[f]["path"]) else None
        if cur_hash[f] is None:
            problems.append(f"{where}: {f} is missing")
            continue
        if not isinstance(r["source_sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", r["source_sha256"]):
            problems.append(f"{where}: source_sha256 is not a SHA-256")
            continue
        if cur_hash[f] != files[f]["sha256"]:
            problems.append(f"{where}: {f} changed since the protocol froze it ({cur_hash[f][:12]} != {files[f]['sha256'][:12]})")
            continue
        if r["source_sha256"] != cur_hash[f]:
            problems.append(f"{where}: source_sha256 {r['source_sha256'][:12]} is not the current hash of {f} ({cur_hash[f][:12]})")
            continue
        ms = index[f].get(r["id"], [])
        if len(ms) == 0:
            problems.append(f"{where}: unknown id {r['id']!r} in {f}")
            continue
        if len(ms) > 1:
            problems.append(f"{where}: duplicate id {r['id']!r} in {f} ({len(ms)} rows)")
            continue
        m = ms[0]
        w = r["wire_index"]
        if type(w) is not int or not 0 <= w < len(m["wires"]):
            problems.append(f"{where}: {r['id']}: no wire {w!r} (the message has {len(m['wires'])})")
            continue
        wire = m["wires"][w]
        if is_pending(wire):
            problems.append(f"{where}: {r['id']} wire {w} is pending")
            continue
        if not isinstance(r["reason"], str) or not r["reason"].strip():
            problems.append(f"{where}: {r['id']} wire {w}: no reason")
            continue
        if wire.get("span") != r["expected_span"]:
            problems.append(f"{where}: {r['id']} wire {w}: span {wire.get('span')!r} != expected_span {r['expected_span']!r}")
            continue
        if not isinstance(r["expected_args"], dict) or not isinstance(r["replacement_args"], dict):
            problems.append(f"{where}: expected_args and replacement_args must be objects")
            continue
        if canon(r["expected_args"]) == canon(r["replacement_args"]):
            problems.append(f"{where}: {r['id']} wire {w}: replacement_args equal expected_args (a no-op line)")
            continue
        have = wire.get("args", {})
        if canon(have) == canon(r["replacement_args"]):
            problems.append(f"{where}: {r['id']} wire {w}: already applied in a source whose hash matches the line (inconsistent already-applied state)")
            continue
        if canon(have) != canon(r["expected_args"]):
            problems.append(f"{where}: {r['id']} wire {w}: args {canon(have)} != expected_args {canon(r['expected_args'])}")
            continue
        bad = validate_args(r["replacement_args"], legend)
        if bad:
            problems.append(f"{where}: {r['id']} wire {w}: invalid replacement_args: " + "; ".join(bad))
            continue
        k = (f, r["id"], w)
        if k in seen:
            problems.append(f"{where}: duplicate of line {seen[k]} (same file, id and wire_index)")
            continue
        seen[k] = n
        plan.append((n, r, m, wire))
    if problems:
        raise OverlayError(f"{len(problems)} overlay problem(s):\n  " + "\n  ".join(problems[:50]))
    changes = []
    for n, r, m, wire in plan:
        old, new = wire.get("args", {}), r["replacement_args"]
        changed = {k: [old.get(k, None), new.get(k, None)] for k in sorted(set(old) | set(new)) if (k in old) != (k in new) or canon(old.get(k)) != canon(new.get(k))}
        wire["args"] = json.loads(json.dumps(new))
        changes.append(dict(source_file=r["source_file"], id=r["id"], wire_index=r["wire_index"], line=n, changed_keys=changed, roles=sorted(m["roles"]), reason=r["reason"]))
    return changes


# ---------------------------------------------------------------- populations and support predicates

DEFAULT_DRAWING = ("Start", "Process", "Check", "Done")
ROLE_NAME_KEYS = ("target", "from", "to", "anchor", "linked", "members")


def name_occurs(span, name):
    """name occurs in span as a whole word sequence, case-sensitively (aligned occurrence)"""
    return re.search(r"(?<![^\W_])" + re.escape(name) + r"(?![^\W_])", span) is not None


def existing_name_requests(m):
    """wire indices of a message with an aligned annotated existing-name role occurrence: a plain part of a names-role arg that is one of the message's
    `names` (the drawing before the message) and occurs in the span as written and has a capital letter (lowering it changes it)"""
    out = []
    names = set(m["names"])
    for i, w in enumerate(m["wires"]):
        if is_pending(w) or not isinstance(w.get("span"), str):
            continue
        args = w.get("args", {})
        hit = False
        for k in ROLE_NAME_KEYS:
            if k not in args:
                continue
            for p in parts(args[k]):
                if p.startswith("mention(") or p == "$new" or p not in names:
                    continue
                if (p != p.lower()) and name_occurs(w["span"], p):
                    hit = True
        if hit:
            out.append(i)
    return out


def written_lowercase_name_requests(m):
    """short3_lowercase candidates: wires with a plain names-role part (a canonical name that has a capital letter) whose span writes it in lower case
    (the span holds the part's lower-case form as a whole word and not the canonical spelling). Annotation-based; the plan's frozen list is a later step,
    this only counts the candidates"""
    out = []
    for i, w in enumerate(m["wires"]):
        if is_pending(w) or not isinstance(w.get("span"), str):
            continue
        args = w.get("args", {})
        hit = False
        for k in ROLE_NAME_KEYS:
            for p in (parts(args[k]) if k in args else []):
                if p.startswith("mention(") or p == "$new" or p == p.lower():
                    continue
                if name_occurs(w["span"], p.lower()) and not name_occurs(w["span"], p):
                    hit = True
        if hit:
            out.append(i)
    return out


def wire_cells(w):
    """the r2 coverage cells one wire is in (annotation predicates, no word lists)"""
    a = w.get("args", {})
    cells = []
    if w.get("type") == "question" and a.get("ask") == "property" and a.get("property") == "outline":
        cells.append("outline_question")
    if w.get("type") == "command" and "color" in a and "outline" in a:
        cells.append("fill_and_outline_colours")
    if "outline" in a:
        cells.append("outline_gold")
    desc_huge = any(p.startswith("mention(") and mention_args(p).get("size") == "huge" for k in ROLE_NAME_KEYS if k in a for p in parts(a[k]))
    if desc_huge:
        cells.append("desc_size_huge_in_mention")
    if a.get("size") == "huge":
        cells.append("size_huge_top_level")
    if a.get("action") in ("undo", "redo") and "count" in a:
        cells.append("undo_redo_count")
    if a.get("action") == "move" and "direction" in a and not any(k in a for k in ("position", "anchor", "at", "distance")):
        cells.append("bare_move")
    return cells


CELLS = ("outline_question", "fill_and_outline_colours", "outline_gold", "desc_size_huge_in_mention", "undo_redo_count", "bare_move")
CELL_DOC = {"outline_question": "type question, ask=property, property=outline", "fill_and_outline_colours": "command with both color and outline",
            "outline_gold": "any wire with an outline key", "desc_size_huge_in_mention": "a names-role arg holds mention(...size=huge...) (what the desc:size head learns)",
            "undo_redo_count": "action undo/redo with a count", "bare_move": "action move with direction and none of position/anchor/at/distance",
            "size_huge_top_level": "top-level size=huge (reported only)"}
FORMS = (("outline_question", "outline_q"), ("outline_create", "outline_create"), ("outline_set", "outline_set"), ("label_removal", "arrow_unlabel"),
         ("description_size", "size_desc"), ("bare_move", "move"))


def count_requests(msgs, G, ix, pred, acts=None):
    """-> (requests, groups, messages) over message indices ix for wires with pred(m, i, w)"""
    n, gs, ms = 0, set(), set()
    for i in ix:
        m = msgs[i]
        c = sum(1 for j, w in enumerate(m["wires"]) if not is_pending(w) and pred(m, j, w))
        if c:
            n += c
            gs.add(G["gkey"][i])
            ms.add(i)
    return dict(requests=n, groups=len(gs), messages=len(ms))


# ---------------------------------------------------------------- the protocol file

OVERLAY_PATH = "training/neural/parity/LABEL_FIXES_SHORT.jsonl"
INPUT_MANIFEST = "reports/evidence/modernbert-next/input-manifest.json"


def cache_path(rel):
    return os.path.join(CACHE, rel)


def file_entry(path_abs, rel):
    return {"path": rel, "sha256": sha256_file(path_abs)}


def build_protocol():
    """discover the sources, hash them, and fix the declared parameters -> the protocol dict (written to modernbert_next_protocol.json by `discover`)"""
    sources = discover_sources()
    for s in sources:
        for f in s["files"]:
            f["sha256"] = sha256_file(os.path.join(SK, f["path"]))
    ct = cache_path("arms/data/C100/cut_train.jsonl")
    cj = cache_path("arms/C100-s0/run/complete.json")
    if not (os.path.isfile(ct) and os.path.isfile(cj)):
        raise Stop("C100 cut_train.jsonl / complete.json are not in the cache: the membership oracle is missing")
    done = json.load(open(cj, encoding="utf8"))
    ids_c100 = {r["id"] for r in read_jsonl(ct)}
    nl_ids = []
    for s in sources:
        if s["role"] == "c100_nl":
            for f in s["files"]:
                nl_ids += [r["id"] for r in read_jsonl(os.path.join(SK, f["path"]))]
    dropped = sorted(i for i in nl_ids if i not in ids_c100)
    m2n = cache_path("arms/data/M2n/cut_train.jsonl")
    nlshare = sorted(glob.glob(cache_path("arms/nlshare/c100/opus/*.jsonl")))
    P = {
        "version": PROTOCOL_VERSION,
        "about": "ModernBERT-next campaign, step 1: the frozen sources, grouping rules, reservation, support thresholds, arms and decision constants "
                 "(reports/modernbert-next-plan-2026-11-08_codex.md). Paths of sources are relative to training/sketch; cache paths relative to ~/.cache/diagram-vss-modernbert.",
        "repo_head": "0ab687cc142e884ed16332925c6d7cd558e1b8fb",
        "inputs": {
            "input_manifest": file_entry(os.path.join(REPO, INPUT_MANIFEST), INPUT_MANIFEST),
            "sets_mjs": file_entry(os.path.join(HERE, "sets.mjs"), "training/neural/parity/sets.mjs"),
            "plan": file_entry(os.path.join(REPO, "reports/modernbert-next-plan-2026-11-08_codex.md"), "reports/modernbert-next-plan-2026-11-08_codex.md"),
            "vssbert_inputs_sha256": file_entry(os.path.join(REPO, "reports/evidence/vssbert-short-commands/inputs.sha256"), "reports/evidence/vssbert-short-commands/inputs.sha256"),
        },
        "sources": sources,
        "acts": acts_from_neural_js(),
        "c100": {
            "about": "C100 training membership = the 23 label folders: make_data.py DIRS (9 older) + build_arm_data.sh FIRST (12) + SAMPLE_DIRS (2, trained with --all) + nl_p1/nl_p2 opus rows "
                     "(nl_share.py SHARE=100) minus the rows whose normalised text equals a test text (nl_dropped_ids). The oracle is the C100 cut_train.jsonl "
                     "(whole messages) whose hash complete.json records.",
            "cut_train": file_entry(ct, "arms/data/C100/cut_train.jsonl"),
            "complete_json": file_entry(cj, "arms/C100-s0/run/complete.json"),
            "complete_json_cut_train_sha256": done["metadata"]["data"]["files"]["cut_train.jsonl"],
            "messages": done["metadata"]["data"]["messages"],
            "requests": done["metadata"]["data"]["requests"],
            "nl_dropped_ids": dropped,
            "nlshare_copy": [file_entry(f, os.path.relpath(f, CACHE)) for f in nlshare],
            "expected_data_manifest": file_entry(cache_path("expected-data-manifest.json"), "expected-data-manifest.json") if os.path.isfile(cache_path("expected-data-manifest.json")) else None,
        },
        "m2n": {"about": "arm M2n (build_arm_data.sh M2n, WITH_M2S=1): C100's list + the eight restored folders; its cut_train ids must equal R",
                "cut_train": file_entry(m2n, "arms/data/M2n/cut_train.jsonl") if os.path.isfile(m2n) else None, "messages": 27430},
        "restored_folders": RESTORED,
        "grouping": {"reasons": list(REASONS), "normalisation": "lower case + whitespace runs collapsed to one space",
                     "session_from_file": sorted(SESSION_FROM_FILE), "group_key": "smallest message id of the group (string order)",
                     "namespaced_session_and_group": True},
        "reservation": {"r2_reserve_modulus": 3, "r2_reserve_residue": 0, "fold_count": 5, "fold_rule": "SHA256(group_key) % 5",
                        "t1_is_evaluation_for_calibration": False,
                        "guard_evaluation": ["fresh2 test", "short3 test", "nl_a development"],
                        "families": {"older-long": "fresh2 calibration", "realistic-short": "short3 calibration", "synthetic-short": "reserved r2",
                                     "natural-language": "nl_a calibration (reported, not one of the three required)"}},
        "support": {"calibration_groups_min": 100, "calibration_groups_per_fold_min": 10, "family_min_groups": 1,
                    "t1_clean_requests_min": 500, "t1_clean_groups_min": 100,
                    "lowercase_other_requests_min": 40, "lowercase_other_groups_min": 10,
                    "clean_create_groups_min": 10,
                    "form_requests_min": 20, "form_groups_min": 10,
                    "r2_cell_min_requests": 1, "r2_cell_thin_requests": 20,
                    "default_drawing_names": list(DEFAULT_DRAWING)},
        "a2": {"t1_requests_sharing_r2_span": 421, "distinct_spans": 239, "create_requests_sharing": 134, "create_requests_total": 166,
               "predicate": "a t1 wire whose lower-cased, whitespace-collapsed span equals that of any wire of synth_short_r2"},
        "scoring_version": "truthful_v1",
        "arms": {"B": "repaired output/annotation contract on C100 source membership", "R": "B plus the eight restored folders",
                 "S": "R plus non-reserved r2 whole messages"},
        "seeds": {"S0": [0], "confirmation": [1]},
        "recipe_base_revision": "8949b909ec900327062f0ebf497f51aef5e6f0c8",
        "decision_rules": {"guard": {"cost_diff_min": -5, "wrong_extras_per_100_max_increase": 1.0, "cost_threshold": 10},
                           "R_vs_B": {"lowercase_other_right_share_min_gain_points": 10, "short3_lowercase_right_share_min_gain_points": 20},
                           "S_vs_R": {"t1_clean_cost_min_gain": 5},
                           "form_bars": {"outline_question": 0.90, "outline_create": 0.90, "outline_set": 0.90, "label_removal": 0.90, "description_size": 0.80, "bare_move": 0.95},
                           "undo_redo_count_min": 0.90},
        "overlay": OVERLAY_PATH,
    }
    return P


def load_protocol(path):
    P = json.load(open(path, encoding="utf8"))
    if P.get("version") != PROTOCOL_VERSION:
        raise Stop(f"{path}: protocol version {P.get('version')!r} != {PROTOCOL_VERSION}")
    return P


def verify_sources(P):
    """every protocol file hashes as recorded; the folder listings are what the rules discover now. -> dict of counts; Stop on any mismatch"""
    bad = []
    n = 0
    for s in P["sources"]:
        for f in s["files"]:
            p = os.path.join(SK, f["path"])
            n += 1
            if not os.path.isfile(p):
                bad.append(f"missing: {f['path']}")
            elif sha256_file(p) != f["sha256"]:
                bad.append(f"hash differs: {f['path']}")
    now = {s["id"]: [(f["path"], f["use"]) for f in s["files"]] for s in discover_sources()}
    for s in P["sources"]:
        have = [(f["path"], f["use"]) for f in s["files"]]
        if now.get(s["id"]) != have:
            bad.append(f"file list of {s['id']} differs from what its rule finds now: added {sorted(set(now.get(s['id'], [])) - set(have))[:3]}, removed {sorted(set(have) - set(now.get(s['id'], [])))[:3]}")
    for k, e in P["inputs"].items():
        p = os.path.join(REPO, e["path"])
        if not os.path.isfile(p):
            bad.append(f"missing input: {e['path']}")
        elif sha256_file(p) != e["sha256"]:
            bad.append(f"input hash differs: {e['path']}")
    if bad:
        raise Stop(f"source identity: {len(bad)} mismatch(es):\n  " + "\n  ".join(bad[:40]))
    return {"files_hashed": n, "inputs_hashed": len(P["inputs"])}


# ---------------------------------------------------------------- the analysis

def check(cid, name, status, value=None, expected=None, predicate=None):
    return {"id": cid, "name": name, "status": status, "value": value, "expected": expected, "predicate": predicate}


def ge(v, thr):
    """PASS only when the number is at least thr and nothing is empty (an empty population never passes)"""
    return PASS if (v is not None and v >= thr and v > 0) else FAIL


def pop_ok(c, requests_min, groups_min):
    """PASS only when a population {requests, groups} reaches both minimums and is not empty (an empty population never passes)"""
    return PASS if (c["requests"] >= requests_min and c["groups"] >= groups_min and c["requests"] > 0 and c["groups"] > 0) else FAIL


def cache_ids(path):
    rows = read_jsonl(path)
    return {r["id"]: r for r in rows}, rows


def node_sets_dump():
    """{set: {id: part}, excluded} as parity/sets.mjs computes them (fresh2, short3, nl_a), or None when node is unusable"""
    js = ("import { loadSet } from process.argv[1];"
          "const o={};for(const n of ['fresh2','short3','nl_a']){const s=loadSet(n);o[n]={parts:Object.fromEntries(s.items.map(i=>[i.id,i.part])),excluded:s.excluded.map(e=>e.id).sort()};}"
          "console.log(JSON.stringify(o));")
    url = "file://" + os.path.join(HERE, "sets.mjs")
    js = js.replace("from process.argv[1]", f"from '{url}'")
    try:
        r = subprocess.run(["node", "--input-type=module", "-e", js], capture_output=True, text=True, check=True, timeout=300)
        return json.loads(r.stdout)
    except (OSError, subprocess.SubprocessError, ValueError):
        return None


def analyze(P, with_overlay=True):
    """the whole analysis of the protocol -> dict R (JSON part under R['audit'], objects under R['obj'])"""
    src_counts = verify_sources(P)
    sup = P["support"]
    acts = acts_from_neural_js()
    checks = []
    checks.append(check("I1", "every protocol source file and input hashes as recorded; folder listings unchanged", PASS, src_counts, None))
    checks.append(check("I2", "acts of docs/js/neural.js equal the protocol's act list", PASS if acts == P["acts"] else FAIL, len(acts), len(P["acts"])))
    # load
    per_source, alt_rows = {}, {}
    for s in P["sources"]:
        msgs, alt = load_source(s)
        per_source[s["id"]] = msgs
        alt_rows[s["id"]] = alt
    msgs = assign_roles(P["sources"], per_source, P)
    # dual sets: the second teacher labels the same texts
    alt_problem = []
    for sid in ("llm_bench/nl_a", "llm_bench/nl_b"):
        byid = {r["id"]: r for _f, r in alt_rows[sid]}
        for m in per_source[sid]:
            a = byid.get(m["id"])
            if a is None or a.get("text") != m["text"]:
                alt_problem.append(m["id"])
        if len(byid) != len(per_source[sid]):
            alt_problem.append(f"{sid}: {len(byid)} gpt rows for {len(per_source[sid])}")
    checks.append(check("I3", "nl_a / nl_b: the two teachers' folders hold the same ids and texts (one node per id)", PASS if not alt_problem else FAIL, len(alt_problem), 0))
    # overlay
    overlay_info = {"file": P["overlay"], "lines": 0, "sha256": None, "changes": []}
    ofile = os.path.join(REPO, P["overlay"])
    if with_overlay:
        lines = load_overlay(ofile)
        overlay_info["lines"] = len(lines)
        overlay_info["sha256"] = sha256_file(ofile)
        if lines:
            files = {}
            for s in P["sources"]:
                for f in s["files"]:
                    if f["use"] == "rows":
                        files[f["path"]] = {"path": os.path.join(SK, f["path"]), "sha256": f["sha256"], "messages": [m for m in per_source[s["id"]] if m["file"] == f["path"]]}
            overlay_info["changes"] = check_overlay(lines, files, load_legend())
    # groups, reservation
    G = build_groups(msgs)
    res = plan_reservation(msgs, G, P["reservation"])
    mem = memberships(msgs, G, res)
    t1c = t1_clean(msgs, G, res)
    t1c_strict = t1_clean(msgs, G, res, strict=True)
    produced = [len(produced_requests(m, set(acts))) for m in msgs]
    nreq = [sum(1 for w in m["wires"] if not is_pending(w)) for m in msgs]
    for i, m in enumerate(msgs):
        m["n_produced"], m["n_requests"] = produced[i], nreq[i]

    # ---- identity against the cache
    avail = True
    c100 = P["c100"]
    ct_path, cj_path = cache_path(c100["cut_train"]["path"]), cache_path(c100["complete_json"]["path"])
    if not (os.path.isfile(ct_path) and os.path.isfile(cj_path)):
        avail = False
        checks.append(check("I4", "C100 membership reproduces the cached cut_train.jsonl and complete.json", UNAVAILABLE, "cache files missing"))
    else:
        h_ct = sha256_file(ct_path)
        done = json.load(open(cj_path, encoding="utf8"))
        ok_hash = h_ct == c100["cut_train"]["sha256"] == done["metadata"]["data"]["files"]["cut_train.jsonl"] and sha256_file(cj_path) == c100["complete_json"]["sha256"]
        checks.append(check("I4a", "C100 cut_train.jsonl hash = protocol = complete.json's record; complete.json hash = protocol", PASS if ok_hash else FAIL, h_ct[:16]))
        by, rows = cache_ids(ct_path)
        b_ids = [msgs[i]["id"] for i in mem["B"]]
        ids_eq = set(by) == set(b_ids) and len(by) == len(rows) == len(b_ids)
        text_idx = {m["id"]: m["text"] for m in msgs}
        bad_text = [i for i in b_ids if i in by and by[i]["text"] != text_idx[i]]
        checks.append(check("I4b", "B (C100) message ids = cut_train.jsonl ids; message count = complete.json", PASS if ids_eq and len(b_ids) == done["metadata"]["data"]["messages"] else FAIL,
                            {"B": len(b_ids), "cut_train": len(by), "complete_json": done["metadata"]["data"]["messages"], "only_in_B": len(set(b_ids) - set(by)), "only_in_cut_train": len(set(by) - set(b_ids))}))
        checks.append(check("I4c", "message text byte-identity: source text = cut_train text for every C100 message", PASS if not bad_text and ids_eq else FAIL, len(bad_text), 0))
        req = sum(produced[i] for i in mem["B"])
        checks.append(check("I4d", "produced requests of B = complete.json requests (train.jsonl rows)", PASS if req == done["metadata"]["data"]["requests"] else FAIL, req, done["metadata"]["data"]["requests"]))
        # nlshare copy
        nlc = {}
        for f in c100["nlshare_copy"]:
            p = cache_path(f["path"])
            if not os.path.isfile(p) or sha256_file(p) != f["sha256"]:
                nlc = None
                break
            for r in read_jsonl(p):
                nlc[r["id"]] = r
        if nlc is None:
            checks.append(check("I5", "nlshare/c100 copy rows equal the nl_p* opus rows", UNAVAILABLE, "copy missing or hash differs"))
        else:
            src_nl = {m["id"]: m for m in msgs if m["source"] in C100_NL}
            diff = [i for i, r in nlc.items() if i not in src_nl or src_nl[i]["text"] != r.get("text") or canon(src_nl[i]["wires_source"]) != canon(r.get("wires", []))]
            member = {m["id"] for m in src_nl.values() if "train_c100" in m["roles"]}
            checks.append(check("I5", "nlshare/c100 copy rows (the real C100 training copy) equal the nl_p* opus rows (id, text, wires); dropped ids = the rest",
                                PASS if not diff and set(nlc) == member else FAIL,
                                {"copy": len(nlc), "differ": len(diff), "dropped_test_overlap": sorted(set(src_nl) - member)}, {"dropped": len(c100["nl_dropped_ids"])}))
    m2 = P["m2n"]["cut_train"]
    if m2 is None or not os.path.isfile(cache_path(m2["path"])):
        checks.append(check("I6", "R (B + the eight restored folders) = M2n cut_train.jsonl ids", UNAVAILABLE, "M2n cut_train missing"))
    else:
        by2, rows2 = cache_ids(cache_path(m2["path"]))
        nl_members = {m["id"] for m in msgs if m["source"] in C100_NL and "train_c100" in m["roles"]}
        r_ids = {msgs[i]["id"] for i in mem["R"]} - nl_members
        text_idx = {m["id"]: m["text"] for m in msgs}
        bad2 = [i for i in r_ids if i in by2 and by2[i]["text"] != text_idx[i]]
        ok2 = sha256_file(cache_path(m2["path"])) == m2["sha256"] and set(by2) == r_ids and len(rows2) == len(r_ids) == P["m2n"]["messages"] and not bad2
        checks.append(check("I6", "the eight restored folders: M2n (the first folders list + restored, built before the nl rounds) cut_train.jsonl ids = (R - the nl_p* rows of C100); hash, ids, count, texts",
                            PASS if ok2 else FAIL,
                            {"R_without_nl": len(r_ids), "M2n": len(by2), "only_in_R": len(r_ids - set(by2)), "only_in_M2n": len(set(by2) - r_ids), "text_differs": len(bad2)}, P["m2n"]["messages"]))
    # vssbert inputs.sha256 for t1/r2
    vs = {}
    for line in open(os.path.join(REPO, P["inputs"]["vssbert_inputs_sha256"]["path"]), encoding="utf8"):
        if line.strip():
            h, p = line.split(None, 1)
            vs[p.strip()] = h
    vbad = []
    for s in P["sources"]:
        if s["role"] in ("t1", "r2"):
            for f in s["files"]:
                want = vs.get("training/sketch/" + f["path"])
                if want != f["sha256"]:
                    vbad.append(f["path"])
    checks.append(check("I7", "t1 and r2 files hash as in reports/evidence/vssbert-short-commands/inputs.sha256", PASS if not vbad else FAIL, vbad, []))
    dump = node_sets_dump()
    if dump is None:
        checks.append(check("I8", "calibration parts of fresh2, short3, nl_a equal parity/sets.mjs (node)", UNAVAILABLE, "node could not run sets.mjs"))
    else:
        mism = []
        for sid, key in (("llm_bench/fresh2", "fresh2"), ("llm_bench/short3", "short3"), ("llm_bench/nl_a", "nl_a")):
            mine = {m["id"]: m["part"] for m in per_source[sid] if m["part"] is not None}
            if mine != dump[key]["parts"]:
                mism.append(key)
            if sorted(m["id"] for m in per_source[sid] if "excluded_pending" in m["roles"]) != dump[key]["excluded"]:
                mism.append(key + ":excluded")
        checks.append(check("I8", "calibration/test parts and pending exclusions of fresh2, short3, nl_a equal parity/sets.mjs (node loadSet)", PASS if not mism else FAIL, mism, []))

    # ---- A2
    r2spans = {norm_text(w["span"]) for m in msgs if "r2" in m["roles"] for w in m["wires"] if isinstance(w.get("span"), str)}
    a2 = {"requests": 0, "spans": set(), "create_requests": 0, "create_total": 0, "t1_requests": 0}
    for m in msgs:
        if "t1" not in m["roles"]:
            continue
        for w in m["wires"]:
            a2["t1_requests"] += 1
            is_create = m["meta"].get("form") == "create"
            a2["create_total"] += is_create
            if norm_text(w["span"]) in r2spans:
                a2["requests"] += 1
                a2["spans"].add(norm_text(w["span"]))
                a2["create_requests"] += is_create
    exp = P["a2"]
    got = {"requests": a2["requests"], "distinct_spans": len(a2["spans"]), "create_requests": a2["create_requests"], "create_total": a2["create_total"], "t1_requests": a2["t1_requests"]}
    ok = got["requests"] == exp["t1_requests_sharing_r2_span"] and got["distinct_spans"] == exp["distinct_spans"] and got["create_requests"] == exp["create_requests_sharing"] and got["create_total"] == exp["create_requests_total"]
    checks.append(check("A2", "t1/r2 overlap reproduces 421 requests / 239 distinct spans (134 of 166 creates)", PASS if ok else FAIL, got,
                        {"requests": exp["t1_requests_sharing_r2_span"], "distinct_spans": exp["distinct_spans"], "create_requests": exp["create_requests_sharing"], "create_total": exp["create_requests_total"]},
                        exp["predicate"]))

    # ---- support: calibration
    cal = mem["calibration"]
    nf = P["reservation"]["fold_count"]
    cal_summary, with_req, fams = calibration_stats(P, msgs, G, mem, nreq, produced)
    fold_cnt = collections.Counter(sha256_mod(g, nf) for g in with_req)
    checks.append(check("S1", "calibration: independent groups (with >= 1 produced request) >= 100", ge(len(with_req), sup["calibration_groups_min"]), len(with_req), sup["calibration_groups_min"],
                        "groups of the eligible calibration population (plan_reservation) holding a message with a produced request row"))
    ok_folds = all(fold_cnt.get(k, 0) >= sup["calibration_groups_per_fold_min"] for k in range(nf)) and bool(with_req)
    checks.append(check("S2", "calibration: >= 10 groups in each of 5 hash folds (SHA256(group_key) % 5)", PASS if ok_folds else FAIL, cal_summary["folds"], sup["calibration_groups_per_fold_min"]))
    for fam in ("older-long", "realistic-short", "synthetic-short"):
        checks.append(check("S3-" + fam, f"calibration: family {fam} present (>= {sup['family_min_groups']} group)", ge(fams.get(fam, 0), sup["family_min_groups"]), fams.get(fam, 0), sup["family_min_groups"]))
    # sensitivity: t1 is evaluation for calibration
    sens_params = dict(P["reservation"], t1_is_evaluation_for_calibration=True)
    res_s = plan_reservation(msgs, G, sens_params)
    mem_s = memberships(msgs, G, res_s)
    gs_s = {G["gkey"][i] for i in mem_s["calibration"] if produced[i] > 0}
    sensitivity = {"t1_is_evaluation_for_calibration=true": {"groups_with_requests": len(gs_s), "folds": dict(collections.Counter(sha256_mod(g, nf) for g in gs_s)),
                                                              "reserved_r2_groups": len(res_s["reserved"]), "n_by_reason": res_s["n_by_reason"]}}

    # ---- support: t1_clean and forms
    def t1_counts(ix):
        return count_requests(msgs, G, ix, lambda m, j, w: True)
    t1c_cnt = t1_counts(t1c)
    t1_all = [i for i, m in enumerate(msgs) if "t1" in m["roles"]]
    checks.append(check("S4", "t1_clean: >= 500 requests and >= 100 independent groups", pop_ok(t1c_cnt, sup["t1_clean_requests_min"], sup["t1_clean_groups_min"]),
                        t1c_cnt, {"requests": sup["t1_clean_requests_min"], "groups": sup["t1_clean_groups_min"]},
                        "t1 messages whose group holds no C100/restored/r2 message and is not in the final calibration population"))
    forms = {}
    for name, form in FORMS:
        def pred(m, j, w, form=form, name=name):
            if m["meta"].get("form") != form:
                return False
            return "bare_move" in wire_cells(w) if name == "bare_move" else True
        c = count_requests(msgs, G, t1c, pred)
        c_all = count_requests(msgs, G, t1_all, pred)
        forms[name] = dict(clean=c, t1_full=c_all, meta_form=form)
        checks.append(check("S7-" + name, f"t1_clean form {name} (meta.form = {form}{', bare displacement args' if name == 'bare_move' else ''}): >= 20 requests and >= 10 groups",
                            pop_ok(c, sup["form_requests_min"], sup["form_groups_min"]), c,
                            {"requests": sup["form_requests_min"], "groups": sup["form_groups_min"]}, "population: t1_clean (the plan's clean per-form population, acceptance 18)"))
    creates = count_requests(msgs, G, t1c, lambda m, j, w: m["meta"].get("form") == "create")
    checks.append(check("S6", "t1_clean clean create subset (meta.form = create): >= 10 groups", ge(creates["groups"], sup["clean_create_groups_min"]), creates, {"groups": sup["clean_create_groups_min"]}))
    label_rm = count_requests(msgs, G, t1c, lambda m, j, w: w.get("args", {}).get("label") == "")
    # ---- lowercase_other
    f2test = [i for i, m in enumerate(msgs) if m["source"] == "llm_bench/fresh2" and "guard_eval" in m["roles"]]
    default = set(sup["default_drawing_names"])

    def lc_stats(ix):
        reqs, gs, mset = 0, set(), 0
        for i in ix:
            hit = existing_name_requests(msgs[i])
            if hit:
                reqs += len(hit)
                gs.add(G["gkey"][i])
                mset += 1
        return dict(requests=reqs, groups=len(gs), messages=mset)

    def clean_of(i):
        c = res["flags"][G["gkey"][i]]
        return not (c["train_c100"] or c["train_restored"] or c["r2"] or G["gkey"][i] in res["population"])
    lc_primary = [i for i in f2test if not (set(msgs[i]["names"]) & default)]
    lc_exact = [i for i in f2test if set(msgs[i]["names"]) != default]
    lc = {"primary_no_default_name_in_message_names": lc_stats(lc_primary), "exact_set_reading_all_fresh2_test": lc_stats(lc_exact),
          "primary_clean": lc_stats([i for i in lc_primary if clean_of(i)]), "fresh2_test_messages": len(f2test), "messages_with_default_name": len(f2test) - len(lc_primary),
          "messages_with_exactly_default_set": len(f2test) - len(lc_exact)}
    p = lc["primary_no_default_name_in_message_names"]
    checks.append(check("S5", "lowercase_other: >= 40 affected requests and >= 10 groups (fresh2 test messages whose names hold none of Start/Process/Check/Done; requests with an aligned, capitalised existing-name role occurrence)",
                        pop_ok(p, sup["lowercase_other_requests_min"], sup["lowercase_other_groups_min"]), p,
                        {"requests": sup["lowercase_other_requests_min"], "groups": sup["lowercase_other_groups_min"]},
                        "wire with a plain part of target/from/to/anchor/linked/members that is in the message's names, has a capital letter, and occurs in the span as a whole word"))
    s3test = [i for i, m in enumerate(msgs) if m["source"] == "llm_bench/short3" and "guard_eval" in m["roles"]]
    s3lc = count_requests(msgs, G, s3test, lambda m, j, w: j in written_lowercase_name_requests(m))
    checks.append(check("S5b", "short3_lowercase candidates: short3 test requests with a capitalised canonical names-role part that the span writes in lower case (counts only; the plan's frozen list is a later step)",
                        REPORT, s3lc, None))
    # ---- r2 coverage cells
    cell_counts = {}
    pools = {"r2_all": [i for i, m in enumerate(msgs) if "r2" in m["roles"]], "r2_reserved": mem["r2_reserved"], "r2_nonreserved": mem["r2_nonreserved"],
             "C100": mem["B"], "restored": [i for i in mem["R"] if "train_restored" in msgs[i]["roles"]], "t1_all": t1_all, "t1_clean": t1c}
    for cell in CELLS + ("size_huge_top_level",):
        cell_counts[cell] = {pn: count_requests(msgs, G, ix, lambda m, j, w, cell=cell: cell in wire_cells(w)) for pn, ix in pools.items()}
    for cell in CELLS:
        v = cell_counts[cell]["r2_nonreserved"]["requests"]
        thin = v < sup["r2_cell_thin_requests"]
        checks.append(check("S8-" + cell, f"r2 coverage cell {cell}: present (>= {sup['r2_cell_min_requests']} request) in non-reserved r2, what arm S trains on" + ("; THIN: fewer than %d requests" % sup["r2_cell_thin_requests"] if thin else ""),
                            ge(v, sup["r2_cell_min_requests"]), dict(cell_counts[cell], thin=thin), sup["r2_cell_min_requests"],
                            "predicate on the annotation (wire_cells): " + CELL_DOC[cell]))
    # ---- giant groups
    sizes = sorted(((len(mem_), k) for k, mem_ in G["groups"].items()), reverse=True)
    reasons = group_reasons(G, msgs)
    top = []
    for n, k in sizes[:10]:
        comp = collections.Counter()
        for i in G["groups"][k]:
            for r in msgs[i]["roles"]:
                comp[r] += 1
        top.append(dict(group_key=k, messages=n, roles=dict(comp), reasons=dict(reasons[k]), sources=dict(collections.Counter(msgs[i]["source"] for i in G["groups"][k]))))
    bridges = sorted(((len(set(v)), r, k) for (r, k), v in G["edges"].items() if len(set(v)) >= 2), reverse=True)[:12]
    bridge_rows = []
    for n, r, k in bridges:
        mem_ = sorted(set(G["edges"][(r, k)]))
        bridge_rows.append(dict(reason=r, key=k if len(k) <= 90 else k[:87] + "...", messages=n, roles=dict(collections.Counter(x for i in mem_ for x in msgs[i]["roles"]))))
    n_all = len(msgs)
    giant = dict(messages=n_all, groups=len(G["groups"]), multi_message_groups=sum(1 for _n, _k in sizes if _n > 1), largest=top, bridging_keys=bridge_rows,
                 largest_in_calibration=cal_summary["largest_group_messages"],
                 largest_in_t1_clean=max(collections.Counter(G["gkey"][i] for i in t1c).values(), default=0),
                 largest_in_S_training=max(collections.Counter(G["gkey"][i] for i in mem["S"]).values(), default=0),
                 merges_by_reason=G["merges"], keys_shared_by_reason=G["shared"],
                 size_histogram=dict(sorted(collections.Counter(min(n, 100) if n < 10 else (10 if n < 20 else 20 if n < 50 else 50 if n < 100 else 100) for n, _k in sizes).items())))
    checks.append(check("G1", "giant-group detection: largest groups reported; the plan declares no size threshold, so the coordinator decides (never split a group)", REPORT,
                        {"largest_overall": sizes[0][0] if sizes else 0, "largest_in_calibration": giant["largest_in_calibration"], "largest_in_t1_clean": giant["largest_in_t1_clean"],
                         "largest_in_S_training": giant["largest_in_S_training"], "messages": n_all}))
    # ---- counts per pool, per source
    def pool_counts(ix):
        return dict(messages=len(ix), requests=sum(nreq[i] for i in ix), produced_rows=sum(produced[i] for i in ix), groups=len({G["gkey"][i] for i in ix}), zero_request_messages=sum(1 for i in ix if nreq[i] == 0))
    pool_summary = {n: pool_counts(ix) for n, ix in (("B_C100", mem["B"]), ("R_B_plus_restored", mem["R"]), ("S_R_plus_nonreserved_r2", mem["S"]), ("restored_only", [i for i in mem["R"] if "train_restored" in msgs[i]["roles"]]),
                                                       ("r2_all", pools["r2_all"]), ("r2_reserved", mem["r2_reserved"]), ("r2_nonreserved", mem["r2_nonreserved"]), ("calibration_final", cal),
                                                       ("t1_all", t1_all), ("t1_clean", t1c), ("t1_clean_strict_no_calibration_candidate", t1c_strict),
                                                       ("fresh2_test", f2test), ("short3_test", s3test),
                                                       ("nl_a_development", [i for i, m in enumerate(msgs) if m["source"] == "llm_bench/nl_a" and "guard_eval" in m["roles"]]),
                                                       ("excluded_test_overlap_nl_rows", [i for i, m in enumerate(msgs) if "excluded_test_overlap" in m["roles"]]),
                                                       ("excluded_pending_fresh2_short3", [i for i, m in enumerate(msgs) if "excluded_pending" in m["roles"]]))}
    src_summary = {}
    for s in P["sources"]:
        ms = per_source[s["id"]]
        src_summary[s["id"]] = dict(role=s["role"], files=len(s["files"]), messages=len(ms), requests=sum(m["n_requests"] for m in ms), produced_rows=sum(m["n_produced"] for m in ms),
                                    messages_without_wires_key=sum(1 for m in ms if not m["has_wires_key"]), zero_request_messages=sum(1 for m in ms if m["n_requests"] == 0),
                                    fields={k: sum(1 for m in ms if m[k] is not None) for k in ("session", "group", "origin")},
                                    session_from_file=sum(1 for m in ms if m.get("session_from_file")), meta_form=sum(1 for m in ms if m["meta"].get("form")))
    # session/group value collisions across sources (raw values)
    vals = collections.defaultdict(set)
    for m in msgs:
        for f in ("session", "group"):
            if m.get(f) is not None and not m.get("session_from_file"):
                vals[(f, str(m[f]))].add(m["source"])
    collisions = sorted([f"{k[0]}:{k[1]}: {sorted(v)}" for k, v in vals.items() if len(v) > 1])
    reservation = dict(
        r2_groups=len({G["gkey"][i] for i in pools["r2_all"]}), r2_groups_hash_residue=sum(1 for k, c in res["flags"].items() if c["r2"] and sha256_mod(k, P["reservation"]["r2_reserve_modulus"]) == P["reservation"]["r2_reserve_residue"]),
        r2_groups_reserved=len(res["reserved"]), r2_groups_hash_residue_but_touching_training=sum(1 for k, c in res["flags"].items() if c["r2"] and sha256_mod(k, 3) == 0 and (c["train_c100"] or c["train_restored"])),
        r2_groups_hash_residue_but_touching_guard_eval=sum(1 for k, c in res["flags"].items() if c["r2"] and sha256_mod(k, 3) == 0 and c["guard_eval"] and not (c["train_c100"] or c["train_restored"])),
        calibration_candidate_groups_by_status=res["n_by_reason"],
        calibration_candidate_messages_by_status=dict(collections.Counter(res["status"][G["gkey"][i]] for i, m in enumerate(msgs) if "cal_cand" in m["roles"] and G["gkey"][i] in res["status"])))
    audit = dict(version=PROTOCOL_VERSION, checks=checks, pools=pool_summary, sources=src_summary, calibration=cal_summary, reservation=reservation, sensitivity=sensitivity,
                 t1_clean=dict(requests_by_form=forms, label_removal_by_annotation=label_rm, clean_create=creates), lowercase_other=lc, short3_lowercase_candidates=s3lc,
                 r2_coverage_cells=cell_counts, giant_groups=giant, session_group_value_collisions=collisions, overlay=overlay_info,
                 a2=dict(got=got, expected=exp), fields_note="session/group exist only in nl_a, nl_b, nl_p1, nl_p2; scenes_* have no field (the file is the session); origin: none in any raw source file; "
                                                          "t1/r2 carry meta.form and meta.narration only")
    return dict(audit=audit, obj=dict(msgs=msgs, G=G, res=res, mem=mem, t1c=t1c, per_source=per_source, produced=produced, f2test=f2test, lc_primary=lc_primary, s3test=s3test))


def calibration_stats(P, msgs, G, mem, nreq, produced):
    """the calibration population by group: -> (summary dict, {group: stats} of groups with >= 1 produced request, family -> number of such groups).
    A group made only of zero-request messages stays in groups_total (its messages are kept: they produce extras) but is not an independent fit group"""
    nf = P["reservation"]["fold_count"]
    cal = mem["calibration"]
    groups = {}
    for i in cal:
        e = groups.setdefault(G["gkey"][i], dict(messages=0, requests=0, produced=0, families=set()))
        e["messages"] += 1
        e["requests"] += nreq[i]
        e["produced"] += produced[i]
        e["families"].add(P_family(P, msgs[i], None))
    with_req = {g: e for g, e in groups.items() if e["produced"] > 0}
    fold_cnt = collections.Counter(sha256_mod(g, nf) for g in with_req)
    fams = collections.Counter(f for e in with_req.values() for f in e["families"])
    touching = collections.Counter()
    for g in groups:
        for r in ("t1", "other_eval", "excluded_pending", "excluded_test_overlap"):
            if any(r in msgs[i]["roles"] for i in G["groups"][g]):
                touching[r] += 1
    summary = dict(messages=len(cal), groups_total=len(groups), groups_with_requests=len(with_req), requests=sum(nreq[i] for i in cal), produced_rows=sum(produced[i] for i in cal),
                   zero_request_messages=sum(1 for i in cal if produced[i] == 0), groups_without_any_request=len(groups) - len(with_req),
                   folds={k: fold_cnt.get(k, 0) for k in range(nf)}, families=dict(fams), groups_touching_other_roles=dict(touching),
                   largest_group_messages=max((e["messages"] for e in groups.values()), default=0))
    return summary, with_req, fams


def P_family(P, m, res):
    if "r2" in m["roles"]:
        return "synthetic-short"
    for s in P["sources"]:
        if s["id"] == m["source"]:
            return s["family"]
    return "?"


# ---------------------------------------------------------------- outputs

def overall(checks):
    bad = [c for c in checks if c["status"] in (FAIL, UNAVAILABLE)]
    return bad


def render_md(A):
    a = A["audit"]
    L = ["# ModernBERT-next data audit", "", "Deterministic output of `modernbert_next_data.py audit`. Status: PASS, FAIL, UNAVAILABLE, or REPORT (a number with no declared threshold).", ""]
    bad = overall(a["checks"])
    L.append(f"**Checks: {len(a['checks'])}; FAIL {sum(c['status'] == FAIL for c in a['checks'])}, UNAVAILABLE {sum(c['status'] == UNAVAILABLE for c in a['checks'])}, "
             f"PASS {sum(c['status'] == PASS for c in a['checks'])}, REPORT {sum(c['status'] == REPORT for c in a['checks'])}.**")
    L += ["", "| id | status | check | value | expected |", "|---|---|---|---|---|"]
    for c in a["checks"]:
        v = json.dumps(c["value"], ensure_ascii=False, sort_keys=True)
        e = json.dumps(c["expected"], ensure_ascii=False, sort_keys=True) if c["expected"] is not None else ""
        L.append(f"| {c['id']} | {c['status']} | {c['name']} | `{v[:260]}` | `{e[:120]}` |")
    L += ["", "## Pools (messages / requests / produced rows / groups / zero-request messages)", "", "| pool | messages | requests | produced rows | groups | zero-request |", "|---|---|---|---|---|---|"]
    for n, c in a["pools"].items():
        L.append(f"| {n} | {c['messages']} | {c['requests']} | {c['produced_rows']} | {c['groups']} | {c['zero_request_messages']} |")
    c = a["calibration"]
    L += ["", "## Calibration population", "", f"messages {c['messages']}, groups {c['groups_total']} (with a produced request: {c['groups_with_requests']}), requests {c['requests']}, produced rows {c['produced_rows']}, "
          f"zero-request messages {c['zero_request_messages']}; folds {c['folds']}; families {c['families']}; largest group {c['largest_group_messages']} messages.", ""]
    r = a["reservation"]
    L += ["## Reservation", "", f"```\n{json.dumps(r, indent=1, sort_keys=True)}\n```", "", f"Sensitivity (t1 treated as evaluation for calibration): `{json.dumps(a['sensitivity'], sort_keys=True)}`", ""]
    g = a["giant_groups"]
    L += ["## Largest groups", "", f"{g['messages']} messages, {g['groups']} groups, {g['multi_message_groups']} with more than one message. Merges by reason: {g['merges_by_reason']}; keys shared by >= 2 messages: {g['keys_shared_by_reason']}.", ""]
    L += ["| group key | messages | reasons | sources |", "|---|---|---|---|"]
    for t in g["largest"]:
        L.append(f"| {t['group_key']} | {t['messages']} | {t['reasons']} | {t['sources']} |")
    L += ["", "Top bridging keys:", "", "| reason | key | messages | roles |", "|---|---|---|---|"]
    for t in g["bridging_keys"]:
        L.append(f"| {t['reason']} | `{t['key']}` | {t['messages']} | {t['roles']} |")
    L += ["", "## Fields per source", "", "| source | role | messages | requests | produced | session | group | origin | session from file |", "|---|---|---|---|---|---|---|---|---|"]
    for sid, s in a["sources"].items():
        L.append(f"| {sid} | {s['role']} | {s['messages']} | {s['requests']} | {s['produced_rows']} | {s['fields']['session']} | {s['fields']['group']} | {s['fields']['origin']} | {s['session_from_file']} |")
    L += ["", f"Session/group values that occur in more than one source (not joined, namespaced): {len(a['session_group_value_collisions'])} {a['session_group_value_collisions'][:5]}", "", a["fields_note"], ""]
    L += ["## Not passing", ""] + ([f"- {c['id']} {c['status']}: {c['name']}" for c in bad] or ["- none"]) + [""]
    return "\n".join(L)


def prepare_out(out):
    out = os.path.abspath(out)
    if out == REPO or out.startswith(REPO + os.sep):
        raise SystemExit(f"modernbert_next_data: {out} is inside the repository: outputs stay outside git")
    if os.path.exists(out):
        raise SystemExit(f"modernbert_next_data: {out} exists: outputs go to a new directory")
    if not os.path.isdir(os.path.dirname(out)):
        raise SystemExit(f"modernbert_next_data: the parent of {out} does not exist")
    os.mkdir(out)
    return out


def write(path, text):
    with open(path, "w", encoding="utf8", newline="\n") as f:
        f.write(text)


def cmd_audit(a):
    P = load_protocol(a.protocol)
    out = os.path.abspath(a.out)
    pre_check_out(out)
    A = analyze(P)
    out = prepare_out(a.out)
    write(os.path.join(out, "audit.json"), dumps(A["audit"]))
    write(os.path.join(out, "audit.md"), render_md(A))
    bad = overall(A["audit"]["checks"])
    print(f"audit: {len(A['audit']['checks'])} checks; not passing: {[(c['id'], c['status']) for c in bad]}; wrote {out}")
    return 1 if bad else 0


def pre_check_out(out):
    if out == REPO or out.startswith(REPO + os.sep):
        raise SystemExit(f"modernbert_next_data: {out} is inside the repository: outputs stay outside git")
    if os.path.exists(out):
        raise SystemExit(f"modernbert_next_data: {out} exists: outputs go to a new directory")


def membership_files(A, P):
    o = A["obj"]
    msgs, mem = o["msgs"], o["mem"]
    ids = lambda ix: sorted(msgs[i]["id"] for i in ix)
    sel = lambda pred: [i for i, m in enumerate(msgs) if pred(m)]
    M = {"B": ids(mem["B"]), "R": ids(mem["R"]), "S": ids(mem["S"]), "calibration": ids(mem["calibration"]), "r2_reserved": ids(mem["r2_reserved"]), "r2_nonreserved": ids(mem["r2_nonreserved"]),
         "t1_clean": ids(o["t1c"]), "t1_all": ids(sel(lambda m: "t1" in m["roles"])),
         "fresh2_test": ids(o["f2test"]), "short3_test": ids(o["s3test"]),
         "nl_a_development": ids(sel(lambda m: m["source"] == "llm_bench/nl_a" and "guard_eval" in m["roles"])),
         "fresh2_test_other_drawings": ids(o["lc_primary"])}
    return M


def cmd_freeze(a):
    P = load_protocol(a.protocol)
    pre_check_out(os.path.abspath(a.out))
    A = analyze(P)
    bad = overall(A["audit"]["checks"])
    o = A["obj"]
    msgs, G, res, mem = o["msgs"], o["G"], o["res"], o["mem"]
    leaks = leakage_checks(msgs, G, res, mem, o["t1c"])
    leak_bad = [(n, d) for n, ok, d in leaks if not ok]
    out = prepare_out(a.out)
    write(os.path.join(out, "audit.json"), dumps(A["audit"]))
    if bad or leak_bad:
        write(os.path.join(out, "freeze_refused.json"), dumps({"failed_or_unavailable_checks": [{"id": c["id"], "status": c["status"], "name": c["name"]} for c in bad],
                                                              "leakage_failures": [{"check": n, "detail": d} for n, d in leak_bad]}))
        print(f"freeze REFUSED: {[(c['id'], c['status']) for c in bad]} leakage {leak_bad}; no protocol.json written ({out})")
        return 1
    os.mkdir(os.path.join(out, "membership"))
    M = membership_files(A, P)
    mfiles = {}
    for name, ids in M.items():
        text = "".join(i + "\n" for i in ids)
        write(os.path.join(out, "membership", name + ".ids"), text)
        mfiles[name] = {"count": len(ids), "sha256": sha256_bytes(text.encode("utf8")), "file": f"membership/{name}.ids"}
    rows = []
    reasons = group_reasons(G, msgs)
    nf = P["reservation"]["fold_count"]
    for i, m in sorted(enumerate(msgs), key=lambda t: t[1]["id"]):
        g = G["gkey"][i]
        rows.append(dict(id=m["id"], source=m["source"], file=m["file"], line=m["line"], roles=sorted(m["roles"]), part=m["part"], group_key=g, fold=sha256_mod(g, nf),
                         reserved_r2=g in res["reserved"] and "r2" in m["roles"], in_calibration=None,
                         text_sha256=sha256_bytes(m["text"].encode("utf8")), n_wires=len(m["wires"]), n_requests=m["n_requests"], n_produced=m["n_produced"]))
    cal_set = set(mem["calibration"])
    idx = {m["id"]: i for i, m in enumerate(msgs)}
    for r in rows:
        r["in_calibration"] = idx[r["id"]] in cal_set
    gtext = "".join(canon(r) + "\n" for r in rows)
    write(os.path.join(out, "groups.jsonl"), gtext)
    gsum = []
    for k, mem_ in sorted(G["groups"].items()):
        if len(mem_) > 1:
            gsum.append(dict(group_key=k, messages=len(mem_), reasons=dict(reasons[k]), roles=dict(collections.Counter(x for i in mem_ for x in msgs[i]["roles"])), calibration_status=res["status"].get(k)))
    stext = "".join(canon(r) + "\n" for r in gsum)
    write(os.path.join(out, "groups_multi.jsonl"), stext)
    write(os.path.join(out, "overlay_changes.json"), dumps(A["audit"]["overlay"]))
    frozen = dict(version=PROTOCOL_VERSION, kind="frozen", source_protocol_sha256=sha256_file(a.protocol), protocol=P, membership=mfiles,
                  groups={"file": "groups.jsonl", "sha256": sha256_bytes(gtext.encode("utf8")), "messages": len(rows), "groups": len(G["groups"])},
                  groups_multi={"file": "groups_multi.jsonl", "sha256": sha256_bytes(stext.encode("utf8")), "groups": len(gsum)},
                  overlay={"file": P["overlay"], "sha256": A["audit"]["overlay"]["sha256"], "lines": A["audit"]["overlay"]["lines"], "changes": len(A["audit"]["overlay"]["changes"])},
                  audit_sha256=sha256_file(os.path.join(out, "audit.json")),
                  leakage_checks=[{"check": n, "ok": ok} for n, ok, _d in leaks], pools=A["audit"]["pools"], calibration=A["audit"]["calibration"])
    write(os.path.join(out, "protocol.json"), dumps(frozen))
    sums = []
    for root, _d, fs in os.walk(out):
        for f in sorted(fs):
            p = os.path.join(root, f)
            sums.append(f"{sha256_file(p)}  {os.path.relpath(p, out)}")
    write(os.path.join(out, "SHA256SUMS"), "\n".join(sorted(sums, key=lambda s: s.split("  ", 1)[1])) + "\n")
    print(f"freeze: ok; {len(leaks)} leakage checks passed; wrote {out}")
    return 0


def cmd_discover(a):
    out = os.path.abspath(a.out)
    if out != os.path.join(HERE, "modernbert_next_protocol.json"):      # the protocol file itself is the one output that belongs in the repository
        pre_check_out(out)
    elif os.path.exists(out):
        raise SystemExit(f"modernbert_next_data: {out} exists: not overwritten")
    P = build_protocol()
    write(out, dumps(P))
    print(f"discover: {len(P['sources'])} sources, {sum(len(s['files']) for s in P['sources'])} files -> {out}")
    return 0


# ---------------------------------------------------------------- build and verify (A1, A3 at row level, A4)

V2 = "diagram-reader-v2"
MAKE_ROLES = os.path.join(REPO, "training", "neural", "make_roles.py")
MAKE_DATA = os.path.join(REPO, "training", "neural", "make_data.py")
L2_FIXES = os.path.join(HERE, "LABEL_FIXES_L2.jsonl")
SAMPLE_IDS = os.path.join(REPO, "training", "neural", "sample1000_ids.txt")
BUILD_VERSION = "modernbert-next-build-v1"
# C100's recipe (build_arm_data.sh L2 with WITH_L1: NUM_WORDS=table LABEL_FIXES=LABEL_FIXES_L2.jsonl IMPLIED_SCALE=1, and build_curve.sh ROLE_TOO_RICH=context). The
# v2 contract encodes the roles ROLE_TOO_RICH set aside as fill = unresolved, so ROLE_TOO_RICH is unset there; a legacy control sets it as C100 did.
RECIPE_ENV = {"NUM_WORDS": "table", "IMPLIED_SCALE": "1"}


def load_frozen(path):
    """a frozen protocol.json (freeze output) -> (frozen dict, inner protocol, {membership name: [ids]}). Every membership file must hash as recorded"""
    F = json.load(open(path, encoding="utf8"))
    if F.get("kind") != "frozen" or F.get("version") != PROTOCOL_VERSION:
        raise Stop(f"{path}: not a frozen protocol of {PROTOCOL_VERSION} (use the protocol.json a freeze wrote)")
    base = os.path.dirname(os.path.abspath(path))
    mem = {}
    for name, e in F["membership"].items():
        p = os.path.join(base, e["file"])
        if not os.path.isfile(p):
            raise Stop(f"frozen membership file missing: {p}")
        data = open(p, "rb").read()
        if sha256_bytes(data) != e["sha256"]:
            raise Stop(f"frozen membership file changed: {e['file']}")
        ids = data.decode("utf8").split("\n")
        mem[name] = [i for i in ids if i]
        if len(mem[name]) != e["count"]:
            raise Stop(f"frozen membership file {e['file']}: {len(mem[name])} ids, the protocol says {e['count']}")
    return F, F["protocol"], mem


def arm_dirs(arm):
    """the source folders of an arm in the order make_data.split_messages --all reads them (C100's order: older folders, the first list, the restored
    folders (build_arm_data.sh M2S then M2N), r2, the natural-language rounds, the sample folders)"""
    return C100_OLD + C100_FIRST + (RESTORED if arm in ("R", "S") else []) + ([R2_DIR] if arm == "S" else []) + C100_NL + C100_SAMPLE


def load_universe(P, overlay_path, apply=True):
    """every message of the protocol's sources with roles, and the overlay checked against all of them and applied in memory -> (msgs, per_source, overlay_info)"""
    per = {}
    for s in P["sources"]:
        per[s["id"]] = load_source(s)[0]
    msgs = assign_roles(P["sources"], per, P)
    info = {"file": os.path.relpath(overlay_path, REPO) if overlay_path else None, "lines": 0, "sha256": None, "changes": []}
    if overlay_path and apply:
        lines = load_overlay(overlay_path)
        info["lines"], info["sha256"] = len(lines), sha256_file(overlay_path)
        if lines:
            files = {}
            for s in P["sources"]:
                for f in s["files"]:
                    if f["use"] == "rows":
                        files[f["path"]] = {"path": os.path.join(SK, f["path"]), "sha256": f["sha256"], "messages": [m for m in per[s["id"]] if m["file"] == f["path"]]}
            info["changes"] = check_overlay(lines, files, load_legend())
    return msgs, per, info


def _overlaid_args(old, new):
    """the new args with the old key order kept: changed values in place, removed keys dropped, new keys appended"""
    out = {k: new[k] for k in old if k in new}
    for k in new:
        if k not in out:
            out[k] = new[k]
    return out


def messages_file_text(P, arm, ids, msgs):
    """the arm's whole messages, one JSON object per line: the raw source line when the message has no overlay change, else the source row with the
    changed args (old key order kept). Order = arm_dirs, then each folder's files and lines. -> (text, [ids in order], {source id: [ids]})"""
    want = set(ids)
    byid = {m["id"]: m for m in msgs}
    changed = {}
    srcs = {s["id"]: s for s in P["sources"]}
    out, order, by_src, seen = [], [], collections.defaultdict(list), set()
    for d in arm_dirs(arm):
        for f in srcs[d]["files"]:
            if f["use"] != "rows":
                continue
            with open(os.path.join(SK, f["path"]), encoding="utf8", newline="") as fh:
                for n, line in enumerate(fh, 1):
                    if not line.strip():
                        continue
                    row = json.loads(line)
                    mid = row["id"]
                    if mid not in want:
                        continue
                    if mid in seen:
                        raise Stop(f"message id {mid} twice in the arm's sources")
                    seen.add(mid)
                    m = byid[mid]
                    ws = row.get("wires") or []
                    diff = [j for j, w in enumerate(ws) if not is_pending(w) and canon(w.get("args", {})) != canon(m["wires"][j].get("args", {}))]
                    if diff:
                        for j in diff:
                            ws[j]["args"] = _overlaid_args(ws[j].get("args", {}), m["wires"][j]["args"])
                        text = json.dumps(row, ensure_ascii=False)
                        changed[mid] = diff
                    else:
                        text = line.rstrip("\n").rstrip("\r")
                    out.append(text)
                    order.append(mid)
                    by_src[d].append(mid)
    if set(order) != want or len(order) != len(want):
        raise Stop(f"the arm's sources give {len(order)} of the {len(want)} membership ids: missing {sorted(want - set(order))[:5]}")
    return "".join(t + "\n" for t in out), order, by_src, changed


def annotation_cells(w):
    """the coverage cells of one wire (annotation predicates)"""
    a = w.get("args", {})
    c = []
    if a.get("action") in ("undo", "redo"):
        c.append("undo_redo")
        if "count" in a:
            c.append("undo_redo_count")
    if w.get("type") == "question" and a.get("ask") == "property" and a.get("property") == "outline":
        c.append("outline_question")
    if a.get("action") == "create" and "outline" in a:
        c.append("outline_create")
    if a.get("action") == "set" and "outline" in a:
        c.append("outline_set")
    if a.get("label") == "":
        c.append("label_removal_empty")
    if any(x in wire_cells(w) for x in ("desc_size_huge_in_mention", "size_huge_top_level", "bare_move")):
        c += [x for x in wire_cells(w) if x in ("desc_size_huge_in_mention", "size_huge_top_level", "bare_move")]
    return c


def output_cells(rows, reader, src_of):
    """coverage of what the rows and the reader.json actually supervise -> {total: {...}, per_source: {...}}"""
    def fresh():
        return collections.Counter()
    tot, per = fresh(), collections.defaultdict(fresh)
    for r in rows:
        s = src_of.get(r["id"], "?")
        cl, g, act = r.get("classes", {}), r.get("gold", {}), r.get("act")
        keys = []
        keys.append(f"rows")
        if act in ("undo", "redo"):
            keys.append(f"rows {act}")
            if "count" in g:
                keys.append(f"{act} with count in gold")
                if any(t.endswith("-count") for t in r.get("tags", [])):
                    keys.append(f"{act} count tagged")
        if act == "property" and g.get("property") == "outline":
            keys.append("outline question rows (property=outline)")
        if "outline" in cl:
            keys.append(f"outline class value on a {r.get('gold', {}).get('action') or act} row")
        for k, v in cl.items():
            if k.startswith("text:"):
                keys.append(f"{k}={v}")
            if k == "desc:size":
                keys.append(f"desc:size={v}")
            if k.startswith("fill:") and v == "unresolved":
                keys.append(f"{k}=unresolved")
        if g.get("label") == "" and "label" in g:
            keys.append("gold label empty")
        for k in keys:
            tot[k] += 1
            per[s][k] += 1
    ak = reader.get("act_keys", {})
    reader_cells = {"act_keys undo": ak.get("undo"), "act_keys redo": ak.get("redo"), "act_keys create has outline": "outline" in (ak.get("create") or []), "act_keys set has outline": "outline" in (ak.get("set") or []),
                    "text_state_keys": reader.get("text_state_keys"), "output_contract": reader.get("output_contract"),
                    "desc:size values": next((c[1] for c in reader.get("classes", []) if c[0] == "desc:size"), None),
                    "property values": next((c[1] for c in reader.get("classes", []) if c[0] == "property"), None),
                    "fill vocabulary": next((c[1] for c in reader.get("classes", []) if c[0].startswith("fill:")), None)}
    return {"total": dict(sorted(tot.items())), "per_source": {s: dict(sorted(c.items())) for s, c in sorted(per.items())}, "reader": reader_cells}


def read_rows(path):
    return [json.loads(l) for l in open(path, encoding="utf8") if l.strip()]


def data_files(data):
    """every *.json* file of the data folder (what the trainer's manifest hashes), name -> sha256"""
    return {n: sha256_file(os.path.join(data, n)) for n in sorted(os.listdir(data)) if re.search(r"\.json", n)}


def tool_hashes():
    return {"make_roles.py": sha256_file(MAKE_ROLES), "make_data.py": sha256_file(MAKE_DATA), "neural.js": sha256_file(os.path.join(REPO, "docs", "js", "neural.js")),
            "logic.js": sha256_file(os.path.join(REPO, "docs", "js", "logic.js")), "LABEL_FIXES_L2.jsonl": sha256_file(L2_FIXES), "sample1000_ids.txt": sha256_file(SAMPLE_IDS)}


def recipe_env(contract):
    env = dict(RECIPE_ENV, LABEL_FIXES=L2_FIXES)
    if contract != V2:
        env["ROLE_TOO_RICH"] = "context"          # C100's own setting (v2 refuses it: it encodes those roles as unresolved)
    return env


def make_roles_cmd(messages, out, contract):
    return [sys.executable, "-B", MAKE_ROLES, "--all", "--messages", messages, "--out", out] + (["--output-contract", V2] if contract == V2 else [])


def clean_env(extra):
    env = {k: v for k, v in os.environ.items() if k not in ("EXTRA_DIRS", "ROLE_TOO_RICH", "NUM_WORDS", "LABEL_FIXES", "IMPLIED_SCALE", "ALSO_DIRS", "PYTHONHASHSEED")}
    env.update(extra)
    return env


def trigger_inventory(msgs_in_arm, acts, extra_dirs):
    """the lower-cased annotation triggers of the arm's messages (parity/trigger_inventory.mjs definition: a wire with a span in its text and an act of the act set)"""
    ws = [w for m in msgs_in_arm for w in m["wires"] if not is_pending(w) and w.get("span") and w["span"] in m["text"] and act_of(w.get("type"), w.get("args", {})) in acts]
    return {"source": "modernbert_next_data.py build: annotation triggers of the arm's messages (same definition as parity/trigger_inventory.mjs)", "extra_dirs": extra_dirs,
            "messages": len(msgs_in_arm), "requests": len(ws), "triggers": sorted({str(w["trigger"]).lower() for w in ws if w.get("trigger")})}


def beside(out):
    """the files that sit beside a data folder (outside it: the trainer hashes every *.json* file inside)"""
    return {"manifest": out + ".manifest.json", "messages": out + ".messages.jsonl", "log": out + ".build.log"}


def cmd_build(a):
    F, P, mem = load_frozen(a.protocol)
    contract = a.contract
    if a.no_overlay and contract == V2:
        raise SystemExit("modernbert_next_data build: --no-overlay is for the legacy control only")
    out = os.path.abspath(a.out)
    for p in [out, out + ".building"] + list(beside(out).values()):
        if os.path.exists(p):
            raise SystemExit(f"modernbert_next_data: {p} exists: outputs go to a new path")
    if out == REPO or out.startswith(REPO + os.sep):
        raise SystemExit(f"modernbert_next_data: {out} is inside the repository: data stays outside git")
    if not os.path.isdir(os.path.dirname(out)):
        raise SystemExit(f"modernbert_next_data: the parent of {out} does not exist")
    verify_sources(P)
    overlay_path = os.path.join(REPO, P["overlay"])
    if not a.no_overlay and sha256_file(overlay_path) != F["overlay"]["sha256"]:
        raise Stop(f"the overlay {P['overlay']} changed since the protocol froze it ({sha256_file(overlay_path)[:12]} != {F['overlay']['sha256'][:12]})")
    msgs, per, ov = load_universe(P, overlay_path, apply=not a.no_overlay)
    ids = mem[a.arm]
    mtext, order, by_src, changed = messages_file_text(P, a.arm, ids, msgs)
    b = beside(out)
    with open(b["messages"], "w", encoding="utf8", newline="\n") as f:
        f.write(mtext)
    env = recipe_env(contract)
    cmd = make_roles_cmd(b["messages"], out + ".building", contract)
    r = subprocess.run(cmd, env=clean_env(env), capture_output=True, text=True)
    write(b["log"], r.stdout + ("\n--- stderr ---\n" + r.stderr if r.stderr else ""))
    if r.returncode != 0:
        if os.path.isdir(out + ".building"):
            os.rename(out + ".building", out + ".failed")
        raise Stop(f"make_roles.py failed (exit {r.returncode}); see {b['log']}; {r.stderr.strip().splitlines()[-1] if r.stderr.strip() else ''}")
    acts = set(acts_from_neural_js())
    in_arm = [m for m in msgs if m["id"] in set(ids)]
    srcs = {s["id"]: s for s in P["sources"]}
    extra_dirs = [d for d in arm_dirs(a.arm) if d not in C100_OLD and d not in C100_SAMPLE]
    ti = trigger_inventory(in_arm, acts, extra_dirs)
    write(os.path.join(out + ".building", "trigger_inventory.json"), json.dumps(ti, indent=1, ensure_ascii=False) + "\n")
    os.rename(out + ".building", out)
    src_of = {m["id"]: m["source"] for m in in_arm}
    rows = read_rows(os.path.join(out, "train.jsonl"))
    cuts = read_rows(os.path.join(out, "cut_train.jsonl"))
    reader = json.load(open(os.path.join(out, "reader.json"), encoding="utf8"))
    produced = {m["id"]: len(produced_requests(m, acts)) for m in in_arm}
    ann = {}
    for d in arm_dirs(a.arm):
        c = collections.Counter()
        ms = [m for m in in_arm if m["source"] == d]
        c["messages"], c["requests"] = len(ms), sum(sum(1 for w in m["wires"] if not is_pending(w)) for m in ms)
        c["produced_rows"] = sum(produced[m["id"]] for m in ms)
        for m in ms:
            for w in m["wires"]:
                if not is_pending(w):
                    for cell in annotation_cells(w):
                        c[cell] += 1
        ann[d] = dict(sorted(c.items()))
    cov = json.load(open(os.path.join(out, "coverage.json"), encoding="utf8"))
    manifest = {
        "version": BUILD_VERSION, "arm": a.arm, "contract": contract, "no_overlay": bool(a.no_overlay),
        "protocol": {"file": os.path.basename(a.protocol), "sha256": sha256_file(a.protocol), "source_protocol_sha256": F["source_protocol_sha256"], "membership_sha256": F["membership"][a.arm]["sha256"]},
        "overlay": {"file": P["overlay"], "sha256": ov["sha256"], "lines": ov["lines"], "changes_total": len(ov["changes"]),
                    "applied_to_this_arm": [{"id": i, "wires": w} for i, w in sorted(changed.items())]},
        "messages_file": {"name": os.path.basename(b["messages"]), "sha256": sha256_file(b["messages"]), "messages": len(order), "order": "arm_dirs, then each folder's files and lines (make_data.split_messages --all order)"},
        "tools": tool_hashes(), "env": env,
        "command": ["python3", "-B", "training/neural/make_roles.py", "--all", "--messages", os.path.basename(b["messages"])] + (["--output-contract", V2] if contract == V2 else []) + ["--out", os.path.basename(out)],
        "python": sys.version.split()[0],
        "messages": len(cuts), "requests": len(rows), "produced_rows": sum(produced.values()),
        "extra_dirs": extra_dirs,
        "files": data_files(out),
        "heldout_rows": len(read_rows(os.path.join(out, "heldout.jsonl"))) + len(read_rows(os.path.join(out, "cut_heldout.jsonl"))),
        "coverage": {"annotation_by_folder": ann, "output": output_cells(rows, reader, src_of),
                     "make_roles_output_contract": cov.get("output_contract"), "make_roles_train_output_contract": cov.get("train", {}).get("output contract"),
                     "make_roles_implied": cov.get("implied"), "make_roles_label_fixes": cov.get("label_fixes"), "make_roles_messages_input": cov.get("messages_input")},
    }
    write(b["manifest"], dumps(manifest))
    print(f"build {a.arm} ({contract}): {len(cuts)} messages, {len(rows)} rows, {len(manifest['files'])} files -> {out} (+ .manifest.json, .messages.jsonl, .build.log)")
    return 0


def cmd_verify(a):
    F, P, mem = load_frozen(a.protocol)
    data = os.path.abspath(a.data)
    b = beside(data)
    problems = []

    def bad(msg):
        problems.append(msg)
    if not os.path.isdir(data) or not os.path.isfile(b["manifest"]) or not os.path.isfile(b["messages"]):
        raise Stop(f"{data}: the data folder, {b['manifest']} or {b['messages']} is missing")
    M = json.load(open(b["manifest"], encoding="utf8"))
    if M.get("version") != BUILD_VERSION:
        raise Stop(f"manifest version {M.get('version')!r} != {BUILD_VERSION}")
    arm, contract = M["arm"], M["contract"]
    verify_sources(P)
    # protocol, overlay, tools
    if M["protocol"]["sha256"] != sha256_file(a.protocol):
        bad("protocol hash differs from the manifest's")
    if M["protocol"]["membership_sha256"] != F["membership"][arm]["sha256"]:
        bad("membership hash differs from the manifest's")
    overlay_path = os.path.join(REPO, P["overlay"])
    if not M["no_overlay"] and (sha256_file(overlay_path) != M["overlay"]["sha256"] or M["overlay"]["sha256"] != F["overlay"]["sha256"]):
        bad("overlay file differs from the manifest's or from the frozen protocol's")
    cur = tool_hashes()
    for k, v in M["tools"].items():
        if cur.get(k) != v:
            bad(f"tool changed since the build: {k}")
    # messages file: re-derived from sources + overlay, byte for byte
    msgs, per, ov = load_universe(P, overlay_path, apply=not M["no_overlay"])
    ids = mem[arm]
    mtext, order, by_src, changed = messages_file_text(P, arm, ids, msgs)
    have = open(b["messages"], "rb").read()
    if have != mtext.encode("utf8"):
        bad("the saved messages file differs from the one re-derived from the sources and the overlay")
    if sha256_bytes(have) != M["messages_file"]["sha256"]:
        bad("the saved messages file hash differs from the manifest's")
    # data folder: files, hashes, no extra file
    files = data_files(data)
    if files != M["files"]:
        bad("data files differ from the manifest: " + str(sorted(k for k in set(files) | set(M["files"]) if files.get(k) != M["files"].get(k))))
    extra = [n for n in os.listdir(data) if n not in files and not re.search(r"\.json", n)]
    if extra:
        bad(f"unexpected files in the data folder: {extra}")
    rows = read_rows(os.path.join(data, "train.jsonl"))
    cuts = read_rows(os.path.join(data, "cut_train.jsonl"))
    if read_rows(os.path.join(data, "heldout.jsonl")) or read_rows(os.path.join(data, "cut_heldout.jsonl")):
        bad("the trainer's held-out files are not empty")
    acts = set(acts_from_neural_js())
    byid = {m["id"]: m for m in msgs}
    # A4: texts byte-identical to the sources (cut rows hold the whole text)
    text_bad = [c["id"] for c in cuts if c["id"] not in byid or c["text"] != byid[c["id"]]["text"]]
    if text_bad:
        bad(f"cut_train texts differ from the source texts: {text_bad[:5]}")
    # membership: the rows hold exactly the arm's messages
    cut_ids = [c["id"] for c in cuts]
    if set(cut_ids) != set(ids) or len(cut_ids) != len(ids):
        bad(f"cut_train ids differ from the {arm} membership: {len(set(cut_ids) - set(ids))} extra, {len(set(ids) - set(cut_ids))} missing")
    row_ids = {r["id"] for r in rows}
    if not row_ids <= set(ids):
        bad(f"train.jsonl holds ids outside the {arm} membership: {sorted(row_ids - set(ids))[:5]}")
    want_rows = sum(len(produced_requests(byid[i], acts)) for i in ids if i in byid)
    if len(rows) != want_rows:
        bad(f"train.jsonl rows {len(rows)} != produced requests of the messages {want_rows}")
    if (M["messages"], M["requests"], M["produced_rows"]) != (len(cuts), len(rows), want_rows):
        bad("counts differ from the manifest's")
    # A3 at row level: no reserved, calibration or evaluation message in any request or cut row; no reserved/calibration text or span either
    forbidden = set(mem["calibration"]) | set(mem["r2_reserved"]) | {m["id"] for m in msgs if m["roles"] & {"cal_cand", "guard_eval", "t1", "other_eval", "excluded_pending"}}
    forbidden -= set(ids)
    leaked = {}
    for name in ("train.jsonl", "cut_train.jsonl", "eval_sample1000.jsonl", "cut_eval_sample1000.jsonl"):
        p = os.path.join(data, name)
        if os.path.isfile(p):
            hit = sorted({r["id"] for r in read_rows(p)} & (forbidden | (set(mem["calibration"]) | set(mem["r2_reserved"]))))
            if hit:
                leaked[name] = hit[:10]
    if leaked:
        bad(f"reserved, calibration or evaluation message ids in the rows (leak): {leaked}")
    guard = [m for m in msgs if m["id"] in set(mem["calibration"]) or m["id"] in set(mem["r2_reserved"])]
    gspans = {norm_text(w["span"]) for m in guard for w in m["wires"] if isinstance(w.get("span"), str) and w["span"].strip()}
    gtexts = {norm_text(m["text"]) for m in guard}
    span_hit = sorted({norm_text(r["text"]) for r in rows} & gspans)[:5]
    text_hit = sorted({norm_text(c["text"]) for c in cuts} & gtexts)[:5]
    if span_hit or text_hit:
        bad(f"a request span or whole text of the rows equals a calibration or reserved message's (leak): {span_hit} {text_hit}")
    # contract
    reader = json.load(open(os.path.join(data, "reader.json"), encoding="utf8"))
    if (reader.get("output_contract") == V2) != (contract == V2):
        bad("reader.json output_contract differs from the manifest's contract")
    if problems:
        print("verify FAILED:\n  " + "\n  ".join(problems))
        return 1
    print(f"verify ok: arm {arm} ({contract}); {len(cuts)} messages, {len(rows)} rows; {len(files)} data files, messages file, overlay, protocol and tool hashes match; no reserved, calibration or evaluation id in any row")
    return 0


def cmd_not_implemented(a):
    print(f"modernbert_next_data {a.cmd}: not implemented in this slice (audit, freeze and discover are); exit 2", file=sys.stderr)
    return 2


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    for n in ("audit", "freeze"):
        p = sub.add_parser(n)
        p.add_argument("--protocol", required=True)
        p.add_argument("--out", required=True)
    p = sub.add_parser("build")
    p.add_argument("--protocol", required=True)
    p.add_argument("--arm", required=True, choices=["B", "R", "S"])
    p.add_argument("--out", required=True)
    p.add_argument("--contract", default=V2, choices=["legacy", V2], help="legacy is the control: C100's own recipe (ROLE_TOO_RICH=context)")
    p.add_argument("--no-overlay", action="store_true", help="control only (legacy): the sources as they are, no LABEL_FIXES_SHORT lines")
    p = sub.add_parser("verify")
    p.add_argument("--protocol", required=True)
    p.add_argument("--data", required=True)
    p = sub.add_parser("discover")
    p.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    try:
        return {"audit": cmd_audit, "freeze": cmd_freeze, "build": cmd_build, "verify": cmd_verify, "discover": cmd_discover}[a.cmd](a)
    except Stop as e:
        print(f"modernbert_next_data: STOP: {e}", file=sys.stderr)
        return e.code


if __name__ == "__main__":
    sys.exit(main())
