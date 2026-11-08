#!/usr/bin/env python3
"""gen_short_r2.py: synthetic short commands for round 2 (TRAIN_PLAN_R2.md section 5-6): the forms of 2026-11-02 that the training data
lacked or had few of (measured 2026-11-03 over 070's training folders: undo / redo with a count 0 requests, the outline question 0, a size in a
description 0, "how many arrows" as a short single command 12, outline on an existing shape 32), plus the same short commands and the core
ones wrapped in narration ("ok so now undo pls", "alright, make Router red please"). Generator style of gen_rules_cover.py: seeded, every cue
least-used first, gold written by the conventions (LABEL_CONVENTIONS.md last section, the majority of synth_rules_ext / synth_rules_ops), and
ONLY the messages the Rules read exactly as their gold are kept (check_file.py --mode rules, which also removes every text that overlaps a
test set: the six template sets, llm_short, fresh2, short3).
  python3 training/sketch/synth/gen_short_r2.py [--seed 0] [--n 2400] [--id-prefix sr2] --out <candidates.jsonl>
  python3 training/sketch/synth/check_file.py <candidates.jsonl> training/sketch/llm_train/synth_short_r2 --mode rules
"""
import argparse, collections, json, os, random, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.argv_saved = sys.argv; sys.argv = [sys.argv[0]]
sys.path.insert(0, HERE)
import gen_rules_cover as G   # DOMAINS (name pools), the legend's cue words (read from logic.js), mention()
sys.argv = sys.argv_saved


class Pick:
    """least-used-first choice per slot (gen_rules_cover's rule: rare cues are not starved), ties broken by the seeded stream"""
    def __init__(self, rng): self.rng, self.used = rng, collections.Counter()
    def __call__(self, slot, xs):
        xs = list(xs); m = min(self.used[(slot, str(x))] for x in xs)
        x = self.rng.choice([x for x in xs if self.used[(slot, str(x))] == m]); self.used[(slot, str(x))] += 1; return x


NUMW = {2: "two", 3: "three", 4: "four", 5: "five"}
SIZE_CUE = {"tiny": ["tiny"], "small": ["small", "little"], "large": ["large", "big"], "huge": ["huge", "giant"]}
STYLES = ["dashed", "dotted", "solid"]
PRE = ["ok so now", "ok now", "alright,", "next one:", "hmm ok,", "cool. now", "sorry,", "ok and", "next,", "now", "and now", "oh and"]
POST = ["pls", "please", "thanks", "for me", "if you can", "thx", "please and thanks", "quickly"]
LABELS = ["yes", "no", "retry", "ok", "uplink", "reads", "writes", "sync", "v2", "next", "fail", "approve", "loop", "async", "maybe"]
TITLES = ["Q3 plan", "Network", "Draft", "Overview", "Sprint 4", "Roadmap", "Home lab", "Org chart", "Flow v2", "Release", "Budget", "Notes"]
TPL_FORMS = [("timeline", "a timeline"), ("funnel", "a funnel"), ("cycle", "a cycle"), ("pyramid", "a pyramid"), ("list", "a list")]
COLORS = ["red", "orange", "yellow", "green", "teal", "blue", "navy", "purple", "pink", "brown", "gray", "black", "white", "gold", "cyan", "lime"]
SHAPES = [s for s in ("circle", "square", "rectangle", "triangle", "diamond", "ellipse", "hexagon", "star")]
PLURAL = {"circle": "circles", "square": "squares", "rectangle": "rectangles", "triangle": "triangles", "diamond": "diamonds", "ellipse": "ellipses",
          "hexagon": "hexagons", "star": "stars"}


def req(span, trigger, typ, **args):
    return {"span": span, "trigger": trigger, "type": typ, "args": {k: v for k, v in args.items() if v is not None}}


def build(p, rng, names):
    """-> (form, span text, wire) for one short request"""
    form = p("form", ["undo_count", "outline_set", "outline_create", "outline_q", "size_desc", "count_arrows", "arrow_label", "arrow_unlabel",
                      "arrow_style", "every_arrow", "tpl_items", "tpl_count", "free_text", "layout_op", "at_xy"])
    A, B = rng.sample(names, 2)
    if form == "undo_count":
        v = p("undo:verb", ["undo", "redo"]); k = p("undo:k", [2, 3, 4, 5])
        fr = p("undo:frame", ["{v} twice", "{v} that twice", "{v} {k} times", "{v} {kw} times", "please {v} twice", "{v} it {k} times"])
        if "twice" in fr: k = 2
        t = fr.format(v=v, k=k, kw=NUMW[k]); return form, t, req(t, v, "command", action=v, count=str(k))
    if form == "outline_set":
        c = p("col", COLORS); fr = p("outl:frame", ["give {A} a {c} border", "give {A} a {c} outline", "make {A}'s outline {c}", "make {A}'s border {c}"])
        t = fr.format(A=A, c=c); return form, t, req(t, t.split()[0], "command", action="set", target=A, outline=c)
    if form == "outline_create":
        c1, c2 = rng.sample(COLORS, 2); s = p("shape", SHAPES); w = p("outl:word", ["border", "outline"]); vb = p("create:verb", ["add", "draw", "make"])
        art = "an" if c1[0] in "aeiou" else "a"
        t = f"{vb} {art} {c1} {s} with a {c2} {w}"; return form, t, req(t, vb, "command", action="create", shape=s, color=c1, outline=c2)
    if form == "outline_q":
        fr = p("outlq:frame", ["what is the outline of {A}", "what's the border color of {A}", "what is the outline colour of {A}", "what is the border of {A}"])
        t = fr.format(A=A); return form, t, req(t, t.split(" the ")[0], "question", ask="property", property="outline", target=A)
    if form == "size_desc":
        sz = p("size", list(SIZE_CUE)); cue = p("size:" + sz, SIZE_CUE[sz]); s = p("shape", SHAPES); pl = PLURAL[s]
        m = G.mention(quantifier="all", shape=s, size=sz); op = p("size:op", ["delete", "set", "move", "count"])
        if op == "delete":
            vb = p("del:verb", ["delete", "remove", "erase"]); t = f"{vb} the {cue} {pl}"; return form, t, req(t, vb, "command", action="delete", target=m)
        if op == "set":
            c = p("col", COLORS); t = f"make the {cue} {pl} {c}"; return form, t, req(t, "make", "command", action="set", target=m, color=c)
        if op == "move":
            d = p("dir", ["up", "down", "left", "right"]); t = f"move the {cue} {pl} {d}"; return form, t, req(t, "move", "command", action="move", target=m, direction=d)
        t = f"how many {cue} {pl} are there"; return form, t, req(t, "how many", "question", ask="count", shape=s, size=sz)
    if form == "count_arrows":
        t = p("arrq:frame", ["how many arrows are there", "how many lines are there", "how many connections are there", "count the arrows", "how many arrows do I have",
                             "how many links are there", "count the connections"])
        return form, t, req(t, "count" if t.startswith("count") else "how many", "question", ask="count", kind="edge")
    if form == "arrow_label":
        lb = p("label", LABELS); fr = p("lab:frame", ['label the arrow from {A} to {B} "{l}"', 'label the link between {A} and {B} "{l}"', 'label the line from {A} to {B} "{l}"'])
        t = fr.format(A=A, B=B, l=lb); return form, t, req(t, "label", "command", action="label", label=lb, **{"from": A, "to": B})
    if form == "arrow_unlabel":
        t = p("unlab:frame", ["remove the label from the arrow from {A} to {B}", "remove the label of the arrow from {A} to {B}"]).format(A=A, B=B)
        return form, t, req(t, "remove the label", "command", action="label", label="", **{"from": A, "to": B})
    if form == "arrow_style":
        x = p("astyle", STYLES + ["two-way"] + COLORS[:6]); t = f"make the arrow from {A} to {B} {x}"
        kv = {"style": x} if x in STYLES else {"arrow": "both"} if x == "two-way" else {"color": x}
        return form, t, req(t, "make", "command", action="set", **{"from": A, "to": B}, **kv)
    if form == "every_arrow":
        x = p("estyle", STYLES + COLORS[:8]); obj = p("eobj", ["the arrows", "all arrows", "all the lines", "all the connections", "the links"])
        t = f"make {obj} {x}"; kv = {"style": x} if x in STYLES else {"color": x}
        return form, t, req(t, "make", "command", action="set", kind="edge", quantifier="all", **kv)
    if form == "tpl_items":
        tv, tw = p("tpl", TPL_FORMS); n = p("tpl:n", [3, 4, 5]); items = rng.sample(names, n) if len(names) >= n else names
        vb = p("tpl:verb", ["make", "create", "draw"]); pre = p("tpl:prep", ["of", "with"])
        t = f"{vb} {tw} {pre} " + ", ".join(items[:-1]) + " and " + items[-1]
        return form, t, req(t, vb, "command", action="create", template=tv, items=",".join(items))
    if form == "tpl_count":
        tv, tw = p("tplc", [("cycle", "a cycle"), ("pyramid", "a pyramid"), ("timeline", "a timeline"), ("funnel", "a funnel")]); n = p("tpl:k", [3, 4, 5, 6])
        unit = {"cycle": "steps", "pyramid": "levels", "timeline": "steps", "funnel": "stages"}[tv]; vb = p("tpl:verb", ["make", "create", "draw"])
        t = f"{vb} {tw} with {n} {unit}"; return form, t, req(t, vb, "command", action="create", template=tv, count=str(n))
    if form == "free_text":
        ti = p("title", TITLES); fr = p("text:frame", ['add a title "{x}"', 'add a heading "{x}"', 'add a caption "{x}"', 'put a heading "{x}" at the top', 'write "{x}" at the top',
                                                     'write "{x}" at the bottom'])
        t = fr.format(x=ti); pos = "top" if "the top" in t else "bottom" if "the bottom" in t else None
        return form, t, req(t, t.split()[0], "command", action="create", shape="text", label=ti, position=pos)
    if form == "layout_op":
        op = p("op", ["improve", "untangle", "straighten", "snap", "sort", "groupBy", "flip", "fit", "equalize", "distribute"])
        T = {"improve": [("tidy up the diagram", "tidy", {}), ("clean up the layout", "clean up", {})],
             "untangle": [("untangle the arrows", "untangle", {})], "straighten": [("straighten the arrows", "straighten", {}), ("straighten the lines", "straighten", {})],
             "snap": [("snap all shapes to the grid", "snap", {}), ("snap everything to the grid", "snap", {})],
             "sort": [("sort the shapes by size", "sort", {"property": "size"}), ("sort the shapes by name", "sort", {"property": "name"}), ("sort everything by color", "sort", {"property": "color"})],
             "groupBy": [("group the shapes by color", "group", {"property": "color"}), ("group the shapes by shape", "group", {"property": "shape"})],
             "flip": [("flip the diagram vertically", "flip", {"axis": "vertical"}), ("flip the diagram horizontally", "flip", {"axis": "horizontal"})],
             "fit": [("zoom to fit", "zoom to fit", {}), ("fit the diagram to the screen", "fit", {})],
             "equalize": [("make all the shapes the same size", "make", {"property": "size"}), ("make all the shapes the same color", "make", {"property": "color"})],
             "distribute": [("spread everything out", "spread", {})]}
        t, trg, kv = p("op:" + op, T[op]); return form, t, req(t, trg, "command", action=op, target=G.mention(quantifier="all"), **kv)
    x, y = p("xy:x", [40, 80, 120, 200, 300, 450, 600]), p("xy:y", [30, 60, 100, 150, 220, 340])
    if p("xy:op", ["create", "move"]) == "create":
        s = p("shape", SHAPES); vb = p("create:verb", ["add", "draw", "put"]); art = "an" if s[0] in "aeiou" else "a"
        t = f"{vb} {art} {s} at {x},{y}"; return form, t, req(t, vb, "command", action="create", shape=s, at=f"{x},{y}")
    t = f"move {A} to {x},{y}"; return form, t, req(t, "move", "command", action="move", target=A, at=f"{x},{y}")


def core(p, rng, names):
    """a few plain core commands to wrap in narration (the Rules read them; the conventions are synth_rules')"""
    A, B = rng.sample(names, 2); c = p("col", COLORS); k = p("core", ["set", "connect", "delete", "undo", "redo", "create", "move"])
    if k == "set": t = f"make {A} {c}"; return k, t, req(t, "make", "command", action="set", target=A, color=c)
    if k == "connect": t = f"connect {A} to {B}"; return k, t, req(t, "connect", "command", action="connect", **{"from": A, "to": B})
    if k == "delete": vb = p("del:verb", ["delete", "remove"]); t = f"{vb} {A}"; return k, t, req(t, vb, "command", action="delete", target=A)
    if k in ("undo", "redo"): t = p(k + ":f", [k, f"{k} that"]); return k, t, req(t, k, "command", action=k)
    if k == "create":
        s = p("shape", SHAPES); art = "an" if c[0] in "aeiou" else "a"; t = f"add {art} {c} {s}"; return k, t, req(t, "add", "command", action="create", shape=s, color=c)
    d = p("dir", ["up", "down", "left", "right"]); t = f"move {A} {d}"; return k, t, req(t, "move", "command", action="move", target=A, direction=d)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--seed", type=int, default=0); ap.add_argument("--n", type=int, default=2400)
    ap.add_argument("--id-prefix", default="sr2", help="ids are <prefix>-NNNNN; the default keeps seed 0's output (synth_short_r2) unchanged")
    ap.add_argument("--out", required=True)
    a = ap.parse_args(); rng = random.Random(a.seed + 23); p = Pick(rng); out = []
    doms = sorted(G.DOMAINS)
    for i in range(a.n):
        dom = p("domain", doms); pool = [x for x in G.DOMAINS[dom] if x[:1].isupper()]
        names = rng.sample(pool, min(len(pool), 6))
        kind = p("kind", ["new", "new", "new", "core_narr"])
        form, t, w = build(p, rng, names) if kind == "new" else core(p, rng, names)
        narr = kind == "core_narr" or rng.random() < 0.3
        text = t
        if narr:
            how = p("narr", ["pre", "post", "both"])
            pre = p("pre", PRE) if how in ("pre", "both") else ""; post = p("post", POST) if how in ("post", "both") else ""
            text = " ".join(x for x in (pre, t, post) if x)
        used = [n for n in names if n in text]
        canvas = used + [n for n in names if n not in used][:2]
        if form == "tpl_items": canvas = [n for n in names if n not in used][:2]   # template items are new shapes
        out.append({"id": f"{a.id_prefix}-{i:05d}", "domain": dom, "names": canvas, "text": text, "wires": [w], "meta": {"form": form, "narration": narr}})
    with open(a.out, "w") as f:
        for r in out: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"{len(out)} candidates -> {a.out}; forms: {dict(collections.Counter(r['meta']['form'] for r in out))}")


if __name__ == "__main__":
    main()
