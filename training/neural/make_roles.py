"""make_roles.py: rows for the neural reader's joint model (training/neural/finetune_roles.py): one request span -> its act, the value of
each legend question that has values (one class per value, or none), and a B / I / O role tag per word for the questions whose answer is
written in the request (names, a new name, a label text, a number).

Same data and the same split as make_data.py (its split_messages: the span-annotated messages minus the fixed 1000-message sample, 10% of
the messages held out by message id, seed 0; the sample and the docs/bench sets are exported as eval sets, never trained on).

The legend (docs/js/logic.js, read with node) decides how each gold key is learned:
  - action / ask                    -> the act (as make_data.py; the act set of docs/js/neural.js)
  - a key whose legend question has values (color, shape, size, position, style, arrow, pairing, ...) -> a class head over
    "none" + the values that key takes in the training gold. No word alignment is needed: the head reads the whole request.
  - a key without values (kinds names, name, text, number: target, anchor, from, to, linked, name, label, count, distance) -> B-key /
    I-key tags on the words of the request that carry the gold value, found by aligning the value to the words:
      * a name, a label text, a number written in digits: the same word sequence in the request, first free occurrence (find_part: the
        parts of a list in their order, the gold's case before any case; a text such as a label is one value even with a comma in it;
        the keys whose values are numbers are aligned last, so a number word never takes a name; a number with a unit glued on, "50px");
      * "$new" (a shape created earlier in the same message): the name that create gave it, when the request writes that name;
      * a number written as a word ("three"): learned by co-occurrence on the training rows (below);
      * a mention (mention(...)) or a name the request does not write ("it", "them"): not tagged; the filler-kind and description heads
        below read them.
Who fills each name-role (SOP-BERT reads it itself; owner, 2026-11-02: no reference may come from the rules' reading). For every key of
legend kind "names" (target, from, to, anchor, linked ...: REF keys), a class head "fill:<key>" over
  none        the request has no such role;
  written     every value is a name written in the request (or "$new" whose created name is written): the B / I / O tags give it;
  context     a value the request does not write: a pronoun or a vague reference ("it", "them", "the new one", "$new" with no name
              written, "the cities" for names created earlier). The value is taken AFTER reading by the context rule all readers share
              (docs/js/vss-composer.js nextContext: the last shape created or named), not by the model;
  description a mention(...) value ("the red square", "all circles", "the newest one", "every square that is not blue").
and, for the description, one class head "desc:<key>" per key the gold mentions use (quantifier, color, notColor, shape, recency, ... as
found in the training gold, mapped to the legend's key case-insensitively): "none" or a value. The description heads read the request once,
not per role: in the data no request has two described roles (counted below: "requests with 2+ described roles"), so one description per
request loses nothing; if one appears, the first described role in REF key order is the one the heads learn and the count says so.
The fill and desc heads are extra entries of reader.json "classes" (names "fill:<key>", "desc:<key>"), so the model, the export and
docs/js/neural.js makeReader decode them as any class head; reader.json "ref_keys" and "desc_keys" list them.
Counts (printed, saved in coverage.json "fillers"): per REF key and set, the fillers of each kind; requests with 2+ described / context roles;
context fillers that are a list ("them" -> several names: the shared context rule gives one shape, so these cannot come out right); and
the share of context fillers the shared rule gives right when every earlier request of the message is read right (an upper bound).
Co-occurrence alignment (training rows only): for key k, value v and a word w of the request, J(k,v,w) = n(k=v, w) / (n(k=v) + n(w) -
n(k=v, w)) over request spans (Jaccard). In a request with k=v, the word with the highest J is aligned when v is also that word's best
value of k (both directions agree); otherwise the value counts as not aligned. It is used for number words (the learned word -> number map
is saved with the model) and, as evidence only, for the class keys: how many of their gold values a single word of the request expresses.

Cutting (the model cuts the message itself): per message, a B / I / O tag per word of the WHOLE message (B first word of a gold span, I inside,
O outside every span) -> cut_train.jsonl, cut_heldout.jsonl, cut_eval_sample1000.jsonl (same split); finetune_roles.py trains a separate token head on them.
Spans of every annotated request count, also those whose act is not in the act set. Only with --none-rows (comparison, not the default):
No request (act "none"): the text outside every annotated span is learned as the act "none", with no class and no role labels. The pieces are
cut the way the reader sees them at use time: the rules' segmenter (docs/js/logic.js createSystem().formalize(text, ctx).segments, the
units docs/js/neural.js reads) is run on every message of the set (train, held-out, sample), and a segment that overlaps no gold span (no
word of it aligned to a word inside a span) is a "none" row. The segments the gold spans cover are not duplicated: the gold span is the row.
The bench sets (one request per text, no spans) have no "none" rows. The counts are printed and saved in coverage.json.

Switches of the parity plan's label arms (MODERNBERT_PARITY_PLAN.md L1, L2; parity/build_arm_data.sh). Unset: every output is byte for byte as before.
  NUM_WORDS=table  (L1) a number written as words is aligned to a number key by a mechanical table (NUM_UNITS below: "forty", "forty five", "forty - five", "two hundred"), and
                   co-occurrence only reads what the table does not ("halve", "twice"). reader.json carries number_words_from = "table" and docs/js/neural.js decodes by the same table.
  LABEL_FIXES=path (L2) an overlay of the labels, {id, wire, scale, why} per line (wire: the index in the message's wires): the scale is added to that wire's args when rows are built;
                   the data folders are not edited. Every line is checked against the covered folders and any bad line stops the run. Needs IMPLIED_SCALE=1.
  ROLE_TOO_RICH=context  a name-role whose gold value holds a mention(...) beside another part (another mention, a name, "$new": "mention(quantifier=all,shape=square),
                   mention(color=red,shape=triangle)", "armoury,mention(label=Entrance Hall)") is learned as fill:<key> = context: no desc / desc2 value and no B / I tag from
                   it, so the reader leaves it to the context rule or asks, instead of learning the first description as if it were all of it (without the switch:
                   fill = description with the first mention, a silent wrong label in roles_roundtrip.py). Same rule for every name-role and folder.
  IMPLIED_SCALE=1  (L2) a class head "implied:scale" for the scale a request states without writing it ("shrink it"), built from the training rows like every other head. A scale counts
                   as written when digits, a number with a unit or the table find it: such a row keeps its tag and has no value on the head; co-occurrence does not tag a scale, since
                   "bit" cannot say both 0.8 and 1.25. docs/js/neural.js reads the head only when the model's reader has it and the request has no tagged number.

Words: the request split by WORD_RE (letters/digits runs, every other non-space character alone), the same split docs/js/neural.js
uses (WORD_RE there). Output (default ~/vss-box/ft/roles): train.jsonl, heldout.jsonl, eval_<set>.jsonl, reader.json (the head layout
the model folder's config.json carries: acts, tags, class keys and values, act_keys, number_words, word_re), coverage.json.
Run: python3 training/neural/make_roles.py [--out DIR] [--sample-ids FILE] [--seed 0]
"""
import argparse, collections, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import make_data as MD

REPO = MD.REPO
WORD_RE = r"[^\W_]+|[^\w\s]|_"          # docs/js/neural.js WORD_RE: /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu
WORD = re.compile(WORD_RE)
ACT_KEYS = {"action", "ask"}
FILL = ["none", "written", "context", "description"]


def is_list(v):
    return len(parts(v)) > 1


def mention_args(p):
    """"mention(color=red,shape=circle)" -> {"color": "red", "shape": "circle"}"""
    return dict(kv.split("=", 1) for kv in parts(p[len("mention("):-1]) if "=" in kv)


def filler_kind(ws, v, created):
    """the kind of one role's gold value: written / context / description (FILL)"""
    ps = parts(v); low = [w[0].lower() for w in ws]
    if any(p.startswith("mention(") for p in ps): return "description"
    def written(p):
        if p == "$new": return any(find_seq(ws, [w[0].lower() for w in words(n)], set()) is not None for n in created)
        return find_seq(ws, [w[0].lower() for w in words(p)], set()) is not None
    return "written" if all(written(p) for p in ps) else "context"
ROLE_TOO_RICH = os.environ.get("ROLE_TOO_RICH") or None
if ROLE_TOO_RICH not in (None, "context"): raise SystemExit("ROLE_TOO_RICH must be unset or 'context'")


def too_rich(v):
    """a role value one description cannot hold: a mention(...) beside another part (another mention, a name or $new)"""
    ps = parts(v)
    return len(ps) > 1 and any(p.startswith("mention(") for p in ps)


def rich_context(k, args, ref_keys):
    """ROLE_TOO_RICH=context and this name-role's gold value is too rich: learned as context"""
    return ROLE_TOO_RICH == "context" and k in ref_keys and k in args and too_rich(str(args[k]))
SPAN_KINDS = {"names", "name", "text", "number", "texts", "point"}   # texts: a list of texts (items, items2, parents of a template, LEGEND_EXT.md): one B-/I- span per item, joined with "," by docs/js/neural.js; point (at "x,y"): one span per coordinate


def legend():
    """{key: {kind, values}} from docs/js/logic.js (the legend is the only hand-written input)"""
    js = ("const K=require(process.argv[1]);const L=K.createSystem().engine.legend;const o={};"
          "for(const [k,q] of L.questions)o[k]={kind:q.kind,values:q.values?Object.keys(q.values):null};console.log(JSON.stringify(o))")
    r = subprocess.run(["node", "-e", js, os.path.join(REPO, "docs", "js", "logic.js")], capture_output=True, text=True, check=True)
    L = json.loads(r.stdout)
    for k, base in same_as().items():   # engine keys with the kind and values of a legend question (docs/js/neural.js SAME_AS)
        if k not in L and base in L: L[k] = dict(L[base])
    return L


def same_as():
    """docs/js/neural.js SAME_AS: {key: legend question it is read as} (position2, anchor2, region), read from that file so the two cannot drift"""
    src = open(os.path.join(REPO, "docs", "js", "neural.js"), encoding="utf8").read()
    m = re.search(r"const SAME_AS = \{([^}]*)\}", src)
    return dict(re.findall(r"(\w+): '(\w+)'", m.group(1))) if m else {}


def words(text):
    return [(m.group(0), m.start(), m.end()) for m in WORD.finditer(text)]


def parts(v):
    """split "a,b" at commas outside parentheses (bench-canon.js parts)"""
    out, d, cur = [], 0, ""
    for ch in str(v):
        if ch == "(": d += 1
        if ch == ")": d -= 1
        if ch == "," and d == 0: out.append(cur.strip()); cur = ""
        else: cur += ch
    out.append(cur.strip())
    return [p for p in out if p]


def find_seq(ws, seq, taken, start=0):
    """first start index >= start where the lower-cased word sequence seq occurs in ws with none of its words taken"""
    n = len(seq)
    if not n: return None
    low = [w[0].lower() for w in ws]
    for i in range(start, len(ws) - n + 1):
        if low[i:i + n] == seq and not any(j in taken for j in range(i, i + n)): return i
    return None


def find_part(ws, exact, taken, after):
    """where one part of a gold value is written (ROLES_ROUNDTRIP.md): the parts of a list are looked for in their order (from the end of
    the previous part of the same key, so "Hook Choose into End? No, Begin to Choose, and Choose to End" tags the corrected Choose, and the
    items "Training, Launch, Build" of "build a dawn of ..." do not take the verb), and the words as the gold writes them (case) before any
    case; then anywhere (case first, then any case). exact: the part's words as written in the gold"""
    seq = [w.lower() for w in exact]; n = len(seq)
    if not n: return None
    def exact_at(s):
        for i in range(s, len(ws) - n + 1):
            if [w[0] for w in ws[i:i + n]] == exact and not any(j in taken for j in range(i, i + n)): return i
        return None
    for i in (exact_at(after), find_seq(ws, seq, taken, after), exact_at(0), find_seq(ws, seq, taken, 0)):
        if i is not None: return i
    return None


def num(s):
    try: return float(s)
    except ValueError: return None


# NUM_WORDS=table: the mechanical number words (docs/js/neural.js NUM_UNITS_T, NUM_TENS_T, NUM_DIGIT_T hold the same; parity/test_label_arms.py checks it). "one" is not in the
# table: in the training spans it is the pronoun ("the red one"), not a number (wip/preprocess-fixes, training/sketch/front.py, counted 0 of 1841 spans).
NUM_TABLE = os.environ.get("NUM_WORDS") == "table"
NUM_UNITS = {"two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
             "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19}
NUM_TENS = {"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90}
NUM_DIGIT = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9}   # after a tens word only ("forty one")


def table_number(low, i):
    """the table at word i of the lower-cased words low -> (number, how many words), else None ("forty five" 2 words, "forty - five" 3, "two hundred" 2)"""
    w = low[i]
    n = NUM_UNITS.get(w, NUM_TENS.get(w, 100 if w == "hundred" else None))
    if n is None: return None
    if w in NUM_TENS:
        if i + 1 < len(low) and low[i + 1] in NUM_DIGIT: return n + NUM_DIGIT[low[i + 1]], 2
        if i + 2 < len(low) and low[i + 1] == "-" and low[i + 2] in NUM_DIGIT: return n + NUM_DIGIT[low[i + 2]], 3
    if n < 10 and i + 1 < len(low) and low[i + 1] == "hundred": return n * 100, 2
    return n, 1


def table_value(text):
    """the number a tagged span reads as by the table (docs/js/neural.js tableNumber), else None"""
    low = re.findall(r"[a-z]+", str(text).lower())
    return next((tn[0] for tn in (table_number(low, i) for i in range(len(low))) if tn), None)


def table_words():
    """the single words of the table (reader.json number_words when NUM_WORDS=table)"""
    return dict(**{w: str(v) for w, v in NUM_UNITS.items()}, **{w: str(v) for w, v in NUM_TENS.items()}, hundred="100")


# LABEL_FIXES, IMPLIED_SCALE: see the head of the file
LABEL_FIXES = os.environ.get("LABEL_FIXES") or None
IMPLIED_SCALE = os.environ.get("IMPLIED_SCALE") == "1"
IMPLIED_KEYS = ("scale",) if IMPLIED_SCALE else ()
# the folders the overlay may name: the first ModernBERT run's and those of arms M2s, M2n. Test sets are not here, so a line naming a test row is an unknown id
LABEL_FIX_DIRS = ["llm_train/sonnet_msg", "llm_train/haiku_msg", "llm_train/sonnet_msg2", "llm_train/haiku_msg2", "llm_train/sonnet_long", "llm_bench/fresh1/sonnet", "llm_bench/fresh1/haiku",
                  "llm_train/sonnet_short", "llm_train/haiku_short", "llm_bench/sonnet_spans", "llm_bench/haiku_spans"] + ["llm_train/" + d for d in (
                  "opus_train_a", "opus_train_b", "opus_train_c", "opus_train_d", "opus_gen_1", "opus_gen_2", "synth_rules", "synth_rules_ops", "synth_rules_ext", "ops_formulations", "opus_ext_1", "synth_combo",
                  "scenes_r3", "scenes_r3b", "opus_r3_gaps", "opus_tgt_1", "opus_tgt_2", "ops_groups", "ops_positions", "opus_short_r2")]


def load_label_fixes(path):
    """the overlay -> {message id: {wire index: scale as the data writes it ("0.67")}}. Stops on any line that does not fix a resize wire without a scale in a covered folder"""
    if not os.path.isfile(path): raise SystemExit(f"LABEL_FIXES: no such file: {path}")
    universe = {m["id"]: m for d in dict.fromkeys(LABEL_FIX_DIRS + MD.DIRS + MD.SAMPLE_DIRS) if MD.label_files(d) for m in MD.messages([d])}
    fixes, bad = {}, []
    for n, line in enumerate(open(path, encoding="utf8"), 1):
        if not line.strip(): continue
        try: r = json.loads(line)
        except ValueError as e: bad.append(f"line {n}: not JSON: {e}"); continue
        if not isinstance(r, dict) or set(r) != {"id", "wire", "scale", "why"}: bad.append(f"line {n}: the keys must be id, wire, scale, why: {line.strip()}"); continue
        m = universe.get(r["id"]); w = r["wire"]
        if m is None: bad.append(f"line {n}: unknown id {r['id']!r}"); continue
        if type(w) is not int or not 0 <= w < len(m.get("wires", [])): bad.append(f"line {n}: {r['id']}: no wire {w!r}"); continue
        wire = m["wires"][w]; args = wire.get("args", {})
        if "pending" in wire: bad.append(f"line {n}: {r['id']} wire {w} is pending"); continue
        if wire.get("type") != "command" or args.get("action") != "resize": bad.append(f"line {n}: {r['id']} wire {w} is not a resize: {wire.get('span')!r}"); continue
        if "scale" in args: bad.append(f"line {n}: {r['id']} wire {w} already has scale={args['scale']}"); continue
        if type(r["scale"]) not in (int, float) or not r["scale"] > 0: bad.append(f"line {n}: {r['id']} wire {w}: scale must be a positive number, not {r['scale']!r}"); continue
        if not isinstance(r["why"], str) or not r["why"].strip(): bad.append(f"line {n}: {r['id']} wire {w}: no why"); continue
        if w in fixes.get(r["id"], {}): bad.append(f"line {n}: {r['id']} wire {w} is fixed twice"); continue
        fixes.setdefault(r["id"], {})[w] = format(r["scale"], "g")
    if bad: raise SystemExit(f"LABEL_FIXES {path}: {len(bad)} bad line(s):\n  " + "\n  ".join(bad[:30]))
    return fixes


def apply_label_fixes(msgs, fixes):
    """the overlay on these messages, in memory (a message may be in two pools: applying twice changes nothing) -> how many wires it fixed"""
    n = 0
    for m in msgs:
        for w, scale in (fixes or {}).get(m["id"], {}).items():
            m["wires"][w]["args"]["scale"] = scale; n += 1
    return n


NUM_UNIT = re.compile(r"(\d+(?:\.\d+)?)[^\W\d_]*")   # a number with a unit glued to it ("50px"): docs/js/neural.js reads its first digit run


SEG_JS = ("const K=require(process.argv[1]);const fs=require('fs');const ms=JSON.parse(fs.readFileSync(0,'utf8'));const sys=K.createSystem();"
          "console.log(JSON.stringify(ms.map(t=>{try{return sys.formalize(t,{names:[],last:[],spans:null}).segments.map(s=>s.src)}catch(e){return []}})))")


def segments(texts):
    """the units the rules' segmenter cuts each text into (what neural.js reads at use time)"""
    r = subprocess.run(["node", "-e", SEG_JS, os.path.join(REPO, "docs", "js", "logic.js")], input=json.dumps(texts), capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def span_words(text, spans):
    """indices (in words(text)) of the words inside a gold span; each span is found at its first occurrence not overlapping an earlier span"""
    ws = words(text); inside = set(); used = []
    for sp in spans:
        i = -1
        while True:
            i = text.find(sp, i + 1)
            if i < 0 or not any(i < b and i + len(sp) > a for a, b in used): break
        if i < 0: continue
        used.append((i, i + len(sp)))
        inside |= {k for k, w in enumerate(ws) if w[1] >= i and w[2] <= i + len(sp)}
    return ws, inside


def cut_tags(text, spans):
    """(words, B / I / O per word of the whole message): each span at its first occurrence not overlapping an earlier span"""
    ws = words(text); tg = ["O"] * len(ws); used = []
    for sp in spans:
        i = -1
        while True:
            i = text.find(sp, i + 1)
            if i < 0 or not any(i < b and i + len(sp) > a for a, b in used): break
        if i < 0: continue
        idx = [k for k, w in enumerate(ws) if w[1] >= i and w[2] <= i + len(sp)]
        if not idx: continue
        used.append((i, i + len(sp)))
        for n, k in enumerate(idx): tg[k] = "B" if n == 0 else "I"
    return ws, tg


def none_rows(msgs):
    """(message id, segment, "none", {}, "none", []) per segment of the rules' segmenter that overlaps no gold span"""
    import difflib
    out = []; segs = segments([m["text"] for m in msgs])
    for m, ss in zip(msgs, segs):
        ws, inside = span_words(m["text"], [w["span"] for w in m.get("wires", []) if w.get("span")])
        low = [w[0].lower() for w in ws]
        for s in ss:
            sw = [w[0].lower() for w in words(s)]
            if not any(re.match(r"[^\W_]", w) for w in sw): continue
            hit = any(b.size and any(j in inside for j in range(b.a, b.a + b.size)) for b in
                      [type("B", (), {"a": b.a, "size": b.size}) for b in difflib.SequenceMatcher(None, low, sw, autojunk=False).get_matching_blocks()])
            if not hit: out.append((m["id"], s, "none", {}, "none", []))
    return out


def requests(msgs, ACTS, skipped):
    """(message id, span, type, args, act, names created earlier in the message) per annotated request"""
    out = []
    for m in msgs:
        created = []
        for w in m.get("wires", []):
            sp, args = w.get("span"), w.get("args", {}); a = MD.act_of(w.get("type"), args)
            if not sp or sp not in m["text"]: skipped["span missing or not in text"] += 1
            elif a not in ACTS: skipped[f"act not in neural.js set: {a}"] += 1
            else: out.append((m["id"], sp, w.get("type"), args, a, list(created)))
            if args.get("action") in ("create", "duplicate") and args.get("name"): created.append(str(args["name"]))
    return out


class Cooc:
    """span-level co-occurrence of (key, value) with the lower-cased words of the request (training rows only)"""
    def __init__(self):
        self.nv, self.nw, self.nvw = collections.Counter(), collections.Counter(), collections.Counter()

    def add(self, ws, kv):
        W = {w[0].lower() for w in ws if re.match(r"[^\W_]", w[0])}
        for w in W: self.nw[w] += 1
        for k, v in kv:
            self.nv[(k, v)] += 1
            for w in W: self.nvw[(k, v, w)] += 1

    def j(self, k, v, w):
        n = self.nvw[(k, v, w)]
        return n / (self.nv[(k, v)] + self.nw[w] - n) if n else 0.0

    def best_value(self, k, w, values):
        return max(values, key=lambda v: self.j(k, v, w)) if values else None

    def align(self, ws, k, v, values, taken):
        """index of the word expressing k=v in ws (both directions agree), else None"""
        cand = [(self.j(k, v, w[0].lower()), i) for i, w in enumerate(ws) if i not in taken and re.match(r"[^\W_]", w[0])]
        cand = [c for c in cand if c[0] > 0]
        if not cand: return None
        _, i = max(cand)
        return i if self.best_value(k, ws[i][0].lower(), values) == v else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.expanduser("~/vss-box/ft/roles"))
    ap.add_argument("--sample-ids", default=os.path.join(HERE, "sample1000_ids.txt"))
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--none-rows", action="store_true", help="comparison only: also the act \"none\" (segments of the rules' segmenter outside every span); the model cuts by itself now")
    ap.add_argument("--all", action="store_true", help="all data (ALL_DATA.md): no sample removed, no held-out (heldout.jsonl empty); eval_sample1000 is then a fit-on-train check")
    ap.add_argument("--also", nargs="*", default=[], help="roles_roundtrip.py: more folders (relative to training/sketch) labelled with the training layout as also_<folder>.jsonl; not training data")
    a = ap.parse_args()
    if LABEL_FIXES and not IMPLIED_SCALE: raise SystemExit("LABEL_FIXES needs IMPLIED_SCALE=1: the scales it adds are not written, and co-occurrence would tag other words for them")
    fixes = load_label_fixes(LABEL_FIXES) if LABEL_FIXES else None
    os.makedirs(a.out, exist_ok=True)
    LEG = legend()
    ACTION, ASK = MD.acts_from_neural_js(); ACTS = ACTION + ASK + ["fact", "rule"] + (["none"] if a.none_rows else [])
    skipped = collections.Counter()
    train_msgs, held, sample_msgs, missing = MD.split_messages(a.sample_ids, a.seed, a.all)
    fixed = apply_label_fixes(train_msgs, fixes); apply_label_fixes(sample_msgs, fixes)
    pools = {"train": [m for m in train_msgs if m["id"] not in held], "heldout": [m for m in train_msgs if m["id"] in held], "eval_sample1000": sample_msgs}
    sets = {n: requests(ms, ACTS, skipped) for n, ms in pools.items()}
    nreq = {n: len(r) for n, r in sets.items()}
    for n, ms in pools.items():
        if a.none_rows: sets[n] += none_rows(ms)
    for s in MD.EVAL:
        rows = []
        for i, r in enumerate(json.load(open(os.path.join(REPO, "docs", "bench", s + ".json"), encoding="utf8"))):
            if "wires" in r: skipped[f"bench {s}: multi-request message without spans"] += 1; continue
            ac = MD.act_of(r["type"], r["gold"]); ac = next((x for x in ACTS if x.lower() == str(ac).lower()), ac)
            if ac not in ACTS: skipped[f"bench {s}: act {ac}"] += 1; continue
            args = dict(r["gold"])
            if "action" in args: args["action"] = ac
            if "ask" in args: args["ask"] = ac
            rows.append((f"{s}-{i}", r["text"], r["type"], args, ac, []))
        sets["eval_" + s] = rows
    # --also (training/neural/roles_roundtrip.py): folders that are not trained on (short3, fresh2), labelled with the SAME layout as
    # also_<folder>.jsonl (not eval_*, so finetune_roles.py never reads them); the layout below is still built from the training rows only
    for d in a.also:
        also = MD.messages([d]); apply_label_fixes(also, fixes)
        sets["also_" + d.replace("/", "__")] = requests(also, ACTS, skipped)

    # which keys are learned how: from the legend kind, for the keys the training gold uses
    train = sets["train"]; used = collections.Counter(k for x in train for k in x[3])
    unknown = sorted(k for k in used if k not in LEG)
    if unknown: print("gold keys not in the legend (not learned):", unknown)
    class_keys = sorted(k for k in used if k in LEG and k not in ACT_KEYS and LEG[k]["values"])
    span_keys = sorted(k for k in used if k in LEG and k not in ACT_KEYS and not LEG[k]["values"] and LEG[k]["kind"] in SPAN_KINDS)
    other = sorted(k for k in used if k in LEG and k not in ACT_KEYS and k not in class_keys and k not in span_keys)
    if other: print("gold keys of another legend kind (not learned):", other)
    values = {k: sorted({str(x[3][k]) for x in train if k in x[3]}) for k in class_keys}
    act_keys = {ac: sorted({k for x in train if x[4] == ac for k in x[3] if k in class_keys or k in span_keys}) for ac in ACTS}
    tags = ["O"] + [f"{p}-{k}" for k in span_keys for p in ("B", "I")]
    # who fills each name-role (FILL) and the description's own keys (see the head of the file)
    ref_keys = [k for k in span_keys if LEG[k]["kind"] == "names"]
    DKEY = {k.lower(): k for k in LEG}
    dvals = collections.defaultdict(set); dunknown = collections.Counter()
    for x in train:
        for k in ref_keys:
            if rich_context(k, x[3], ref_keys): continue   # ROLE_TOO_RICH=context: no description heads from it
            for p in parts(x[3].get(k, "")) if k in x[3] else []:
                if not p.startswith("mention("): continue
                for dk, dv in mention_args(p).items():
                    if dk.lower() in DKEY: dvals[DKEY[dk.lower()]].add(dv)
                    else: dunknown[dk] += 1
    if dunknown: print("description keys not in the legend (not learned):", dict(dunknown))
    desc_keys = sorted(dvals)
    # the SECOND described role of a request (REF key order; "move the triangles right of the gray rect": anchor, then target) has heads of
    # its own, desc2:<key>; with one set of heads both roles were decoded with the first role's description (ROLES_ROUNDTRIP.md)
    dvals2 = collections.defaultdict(set)
    for x in train:
        ds = [next(p for p in parts(x[3][k]) if p.startswith("mention(")) for k in ref_keys if k in x[3] and any(p.startswith("mention(") for p in parts(x[3][k])) and not rich_context(k, x[3], ref_keys)]
        for dk, dv in (mention_args(ds[1]).items() if len(ds) > 1 else []):
            if dk.lower() in DKEY: dvals2[DKEY[dk.lower()]].add(dv)
    desc2_keys = sorted(dvals2)
    fill_classes = [["fill:" + k, FILL] for k in ref_keys] + [["desc:" + k, ["none"] + sorted(dvals[k])] for k in desc_keys] + [["desc2:" + k, ["none"] + sorted(dvals2[k])] for k in desc2_keys]

    # co-occurrence on the training rows: number words (count / distance written as a word) and, as evidence, every class key
    co = Cooc()
    for (_i, sp, _t, args, _a, _c) in train:
        kv = [(k, str(args[k])) for k in class_keys if k in args]
        kv += [(k, p) for k in span_keys if LEG[k]["kind"] == "number" and k in args for p in parts(args[k])]
        co.add(words(sp), kv)
    numvals = {k: sorted({p for x in train if k in x[3] for p in parts(x[3][k])}) for k in span_keys if LEG[k]["kind"] == "number"}

    implied_values = {k: collections.Counter() for k in IMPLIED_KEYS}   # the training rows' values of the head implied:<key> (filled in the label pass, train first)
    implied_tagged = collections.Counter()

    def label(row, cov, numword):
        rid, sp, typ, args, act, created = row
        ws = words(sp); tag = ["O"] * len(ws); taken = {}; implied = {}
        for k in sorted(span_keys, key=lambda k: LEG[k]["kind"] == "number"):   # numbers last: a number word found by co-occurrence never takes a name ("Slide Day to the left")
            if k not in args: continue
            if rich_context(k, args, ref_keys): cov[k]["values"] += len(parts(args[k])); cov[k]["too rich: learned as context (ROLE_TOO_RICH)"] += 1; continue
            after = 0   # the parts of a list are looked for in their order (find_part)
            # a text (a label, a title) is one value even when it holds a comma ("label Persona 'Maria, 34'"); every other kind is a list
            for p in ([str(args[k])] if str(args[k]) else []) if LEG[k]["kind"] == "text" else parts(args[k]):
                c = cov[k]; c["values"] += 1
                if p == "$new":
                    seqs = [[w[0] for w in words(n)] for n in reversed(created)]
                    hit = next((s for s in seqs if find_part(ws, s, taken, after) is not None), None)
                    if hit is None: c["reference $new (no name written)"] += 1; continue
                    exact, how = hit, "$new: name written"
                elif p.startswith("mention("): c["reference mention(...)"] += 1; continue
                else: exact, how = [w[0] for w in words(p)], "written"
                seq = [w.lower() for w in exact]
                i = find_part(ws, exact, taken, after)
                if i is None and LEG[k]["kind"] == "number" and NUM_TABLE:   # the mechanical table: the first free run of words that reads as p
                    low = [w[0].lower() for w in ws]
                    hit = next(((j, tn[1]) for j in range(len(ws)) for tn in [table_number(low, j)] if tn and float(tn[0]) == num(p) and not any(q in taken for q in range(j, j + tn[1]))), None)
                    if hit is not None: i = hit[0]; seq, how = [w[0].lower() for w in ws[i:i + hit[1]]], "number word (table)"
                if i is None and LEG[k]["kind"] == "number" and k not in IMPLIED_KEYS:   # with the table: only what the table does not read ("halve", "twice")
                    i = co.align(ws, k, p, numvals[k], taken)
                    if i is not None: seq, how = [ws[i][0].lower()], "number word (co-occurrence)"; numword[ws[i][0].lower()][p] += 1
                if i is None and LEG[k]["kind"] == "number":   # a number with its unit glued on ("50px"): the decoder reads its digits
                    i = next((j for j, w in enumerate(ws) if j not in taken and NUM_UNIT.fullmatch(w[0]) and num(NUM_UNIT.fullmatch(w[0]).group(1)) == num(p) is not None), None)
                    if i is not None: seq, how = [ws[i][0].lower()], "number with a unit"
                if i is None:
                    low = {w[0].lower() for w in ws}
                    c["already tagged for another key" if seq and all(s in low for s in seq) else "not written in the request"] += 1
                    if k in IMPLIED_KEYS: implied[k] = str(args[k])   # no word to tag: its class head says it
                    continue
                c["aligned: " + how] += 1
                for j in range(i, i + len(seq)): tag[j] = ("B-" if j == i else "I-") + k; taken[j] = k
                after = i + len(seq)
        classes ={k: str(args[k]) for k in class_keys if k in args}
        for k, v in implied.items(): classes["implied:" + k] = v
        for k in ref_keys:
            if k in args: classes["fill:" + k] = "context" if rich_context(k, args, ref_keys) else filler_kind(ws, str(args[k]), created)
        ds = [next(p for p in parts(args[k]) if p.startswith("mention(")) for k in ref_keys if k in args and any(p.startswith("mention(") for p in parts(args[k])) and not rich_context(k, args, ref_keys)]
        for pre, keys, d in zip(("desc:", "desc2:"), (desc_keys, desc2_keys), ds):   # the first described role -> desc:, the second -> desc2:
            for dk, dv in mention_args(d).items():
                if DKEY.get(dk.lower()) in keys: classes[pre + DKEY[dk.lower()]] = dv
        return {"id": rid, "text": sp, "words": [w[0] for w in ws], "tags": tag, "act": act, "classes": classes, "gold": args}

    def fillers(rows, out):
        """per REF key: the gold fillers of each kind; requests with 2+ described / context roles; context fillers that are a list; and the
        context fillers the shared context rule (nextContext, on the gold of the earlier requests of the message) gives right"""
        per = {k: collections.Counter() for k in ref_keys}; multi_d = multi_c = 0; ctx_list = collections.Counter(); rule = collections.Counter()
        last, prev = [], None
        for r, o in zip(rows, out):
            if r[0] != prev: last, prev = [], r[0]   # a new message: the context starts empty (as the scorer: ctx.last = [])
            args, kinds = r[3], {k: o["classes"].get("fill:" + k) for k in ref_keys if k in r[3]}
            for k, kd in kinds.items():
                per[k][kd] += 1
                if kd == "context":
                    if is_list(str(args[k])): ctx_list[k] += 1
                    rule[k + (" right" if len(last) == 1 and last[0].lower() == str(args[k]).lower() else " wrong")] += 1
            multi_d += sum(v == "description" for v in kinds.values()) > 1; multi_c += sum(v == "context" for v in kinds.values()) > 1
            if args.get("action") == "create": last = ["$new"]          # nextContext with the gold args of this request
            elif args.get("target") is not None and not is_list(str(args["target"])): last = [str(args["target"])]
            elif args.get("action") == "connect" and args.get("to") is not None and not is_list(str(args["to"])): last = [str(args["to"])]
        return {"per key": {k: dict(v) for k, v in per.items()}, "requests with 2+ described roles": multi_d, "requests with 2+ context roles": multi_c,
                "context fillers that are a list": dict(ctx_list), "context fillers the shared rule gives right (gold context)": dict(rule)}

    numword = collections.defaultdict(collections.Counter)
    coverage = {}
    for name, rows in sets.items():
        cov = collections.defaultdict(collections.Counter)
        out = [label(r, cov, numword if name == "train" else collections.defaultdict(collections.Counter)) for r in rows]
        if name == "train":
            for k in IMPLIED_KEYS:
                implied_values[k].update(o["classes"]["implied:" + k] for o in out if "implied:" + k in o["classes"])
                implied_tagged[k] += sum(1 for r, o in zip(rows, out) if k in r[3] and "implied:" + k not in o["classes"])
        with open(os.path.join(a.out, name + ".jsonl"), "w", encoding="utf8") as f:
            for r in out: f.write(json.dumps(r, ensure_ascii=False) + "\n")
        # evidence for the class keys: does one word of the request express the value?
        ccov = {}
        for k in class_keys:
            n = al = 0; pairs = collections.Counter()
            for r in rows:
                if k not in r[3]: continue
                n += 1; v = str(r[3][k]); ws = words(r[1]); i = co.align(ws, k, v, values[k], set())
                if i is not None: al += 1; pairs[(ws[i][0].lower(), v)] += 1
            ccov[k] = {"values": n, "one word expresses it (co-occurrence, both directions)": al, "top word->value": [f"{w}->{v} {c}" for (w, v), c in pairs.most_common(8)]}
        coverage[name] = {"span keys": {k: dict(v) for k, v in cov.items()}, "class keys": ccov, "rows": len(out), "fillers": fillers(rows, out)}
    number_words = {w: c.most_common(1)[0][0] for w, c in numword.items()}
    if NUM_TABLE: number_words = dict({w: v for w, v in number_words.items() if w not in table_words()}, **table_words())   # the table wins for its words
    implied_classes = [["implied:" + k, ["none"] + sorted(implied_values[k])] for k in IMPLIED_KEYS if implied_values[k]]
    reader = {"cut": {"tags": ["O", "B", "I"], "max_length": 512}, "acts": ACTS, "tags": tags, "span_keys": span_keys, "ref_keys": ref_keys, "desc_keys": desc_keys, "desc2_keys": desc2_keys,
              "classes": [[k, ["none"] + values[k]] for k in class_keys] + fill_classes + implied_classes,
              "act_keys": act_keys, "number_words": number_words, **({"number_words_from": "table"} if NUM_TABLE else {}), "word_re": "[\\p{L}\\p{N}]+|[^\\s\\p{L}\\p{N}]", "max_length": 128}
    json.dump(reader, open(os.path.join(a.out, "reader.json"), "w"), indent=1)
    cutn = {}
    for n, ms in pools.items():
        nsp = nw = 0
        with open(os.path.join(a.out, "cut_" + n.replace("eval_", "eval_") + ".jsonl"), "w", encoding="utf8") as f:
            for m in ms:
                ws, tg = cut_tags(m["text"], [w["span"] for w in m.get("wires", []) if w.get("span")])
                f.write(json.dumps({"id": m["id"], "text": m["text"], "words": [w[0] for w in ws], "tags": tg}, ensure_ascii=False) + "\n")
                nw += len(ws); nsp += tg.count("B")
        cutn[n] = {"messages": len(ms), "words": nw, "spans": nsp, "words outside every span": None}
    coverage["cut"] = cutn
    print("cut rows (whole messages, B/I/O per word): " + ", ".join(f"{n} {c['messages']} messages {c['spans']} spans" for n, c in cutn.items()))
    coverage["none"] = {n: {"requests": nreq[n], "none": len(sets[n]) - nreq[n], "none share": round((len(sets[n]) - nreq[n]) / max(len(sets[n]), 1), 4)} for n in nreq}
    coverage["skipped"] = dict(skipped); coverage["sample1000_missing"] = len(missing)
    if fixes is not None:
        coverage["label_fixes"] = {"file": os.path.basename(LABEL_FIXES), "lines": sum(len(v) for v in fixes.values()), "applied to this data": fixed}
        print(f"label fixes: {fixed} of {coverage['label_fixes']['lines']} lines are in this data list")
    if IMPLIED_KEYS:
        coverage["implied"] = {k: {"tagged (written)": implied_tagged[k], "on the head": dict(sorted(implied_values[k].items()))} for k in IMPLIED_KEYS}
        print("implied heads, training rows: " + json.dumps(coverage["implied"]))
    json.dump(coverage, open(os.path.join(a.out, "coverage.json"), "w"), indent=1)

    print(f"rows: " + ", ".join(f"{k} {coverage[k]['rows']}" for k in sets))
    print("none rows (segments of the rules' segmenter that overlap no gold span): " + ", ".join(f"{n} {c['none']}/{c['none'] + c['requests']} = {c['none share'] * 100:.1f}%" for n, c in coverage["none"].items()))
    print(f"class keys ({len(class_keys)}): " + ", ".join(f"{k}({len(values[k])})" for k in class_keys))
    print(f"span keys ({len(span_keys)}): {', '.join(span_keys)}; tags {len(tags)}; number words learned: {number_words}")
    print("\nspan keys, training rows: gold values aligned to words")
    for k, c in sorted(coverage["train"]["span keys"].items()):
        n = c["values"]; al = sum(v for kk, v in c.items() if kk.startswith("aligned"))
        print(f"  {k:9} {al:5}/{n:5} = {al / n * 100:5.1f}%  " + " · ".join(f"{kk} {v}" for kk, v in sorted(c.items()) if kk != "values"))
    print("\nclass keys, training rows (evidence only; the class head needs no alignment): one word expresses the value")
    for k, c in coverage["train"]["class keys"].items():
        n = c["values"]; al = c["one word expresses it (co-occurrence, both directions)"]
        print(f"  {k:11} {al:5}/{n:5} = {al / max(n, 1) * 100:5.1f}%   e.g. {', '.join(c['top word->value'][:5])}")
    print(f"\nwho fills the name-roles (REF keys {ref_keys}; desc keys {desc_keys}): written / context / description of the gold fillers")
    for n in ("train", "heldout", "eval_sample1000"):
        F = coverage[n]["fillers"]; print(f"  {n}:")
        for k, c in F["per key"].items():
            t = sum(c.values())
            if t: print(f"    {k:7} {t:6} fillers: " + " · ".join(f"{kd} {c.get(kd, 0)} ({c.get(kd, 0) / t * 100:.1f}%)" for kd in FILL[1:]))
        t = {kd: sum(c.get(kd, 0) for c in F["per key"].values()) for kd in FILL[1:]}; T = sum(t.values())
        print(f"    all     {T:6} fillers: " + " · ".join(f"{kd} {v} ({v / max(T, 1) * 100:.1f}%)" for kd, v in t.items()))
        print(f"    requests with 2+ described roles {F['requests with 2+ described roles']} · with 2+ context roles {F['requests with 2+ context roles']}"
              f" · context fillers that are a list (several names) {sum(F['context fillers that are a list'].values())} {F['context fillers that are a list']}")
        rr = F["context fillers the shared rule gives right (gold context)"]
        ok = sum(v for k, v in rr.items() if k.endswith(" right")); tot = sum(rr.values())
        print(f"    context fillers the shared rule (nextContext, gold earlier requests) gives right: {ok}/{tot} = {ok / max(tot, 1) * 100:.1f}%  {rr}")
    if skipped: print("skipped:", dict(skipped))


if __name__ == "__main__": main()
