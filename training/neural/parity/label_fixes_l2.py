"""label_fixes_l2.py: lists every `resize` wire of the folders arm L2 covers and writes LABEL_FIXES_L2.jsonl, the overlay make_roles.py LABEL_FIXES=path applies.
The data folders are not edited. Every row is either a plain case by its own span (RULES below) or a judgement written out by id and wire (JUDGED below); a span
that says "a bit" or "a little" with no direction fits neither and stops the script until someone reads it. A row with no line in the overlay keeps no scale: the
engine's resize then grows by x1.5 (docs/js/logic.js), which is what a plain "bigger" asks for.
Scales: docs/sop-translations/claude-opus-5-5/CONVENTIONS.md ("smaller" 0.67, "a bit smaller" 0.8, "a bit bigger" 1.25, "much bigger", "twice as big" 2, "bigger": none).
What those rules do not name is a judgement, with the reason in `why`:
  - "a lot / much smaller" 0.5, as the Rules read it (logic.js) and the mirror of 2; "half the size" 0.5;
  - "thinner" on an arrow 0.67: restyleEdges multiplies the width by the scale and by 1.5 with none, so "thinner" with no scale thickens the arrow. "thicker" keeps none;
  - "N times bigger" N, written or spelled; make_roles.py decides whether it can be tagged;
  - the request's words may sit outside its span, and a self-correction keeps only the final wish (CONVENTIONS.md): JUDGED.
  python3 training/neural/parity/label_fixes_l2.py [--check]     (--check: writes nothing; fails if the file is not what this script would write)"""
import collections, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
import make_data as MD
import make_roles as MR

OUT = os.path.join(HERE, "LABEL_FIXES_L2.jsonl")
SMALLER = r"small(?:er)?\b|smaler\b|shrink\w*|shrunk\b|sgrink\b|shink\b|shrnk\b|srink\b|tinier\b"
BIGGER = r"bigger\b|larger\b|big\b|large\b|enlarg\w*|grow\w*|fatten\b|stretch\b|blow\b|up\b"
BIT = r"(?:a )?(?:bit|little|litle bit|litle)\b|slightly\b"
LOT = r"a lot\b|much\b|way\b"


def rule(span, args):
    """a plain case -> (scale or None, why); None when the span is not plain"""
    s = span.lower()
    has = lambda *ps: all(re.search(r"\b(?:" + p + ")", s) for p in ps)
    edge = any(k in args for k in ("from", "to", "kind"))
    if edge:
        if has(r"thinner\b|less thick\b"): return 0.67, 'arrow "thinner": with no scale the engine thickens it'
        if has(r"thick\w*|bolder\b"): return None, 'arrow "thicker": plain'
    if has(r"half\b"): return 0.5, '"half the size"'
    if has(r"\d+ times\b") or has(r"(?:two|three|four|five|six|seven|eight|nine|ten) times\b"):
        n = re.search(r"\b(\d+|two|three|four|five|six|seven|eight|nine|ten) times\b", s).group(1)
        n = int(n) if n.isdigit() else MR.NUM_UNITS[n]
        return n, f'"{n} times bigger"'
    if has(r"twice\b") or has(r"double\b"): return 2, '"twice", "double"'
    if has(r"scale\b|sacle\b|sclae\b", r"down\b") or has(SMALLER) or has(r"less thick\b"):
        if has(LOT): return 0.5, '"a lot smaller": the mirror of 2, as the Rules read it'
        if has(BIT): return 0.8, '"a bit smaller"'
        return 0.67, '"smaller", "shrink"'
    if has(BIGGER):
        if has(LOT): return 2, '"much bigger"'
        if has(BIT): return 1.25, '"a bit bigger"'
        return None, 'plain "bigger"'
    if has(BIT): return "stop", ""   # a little, with no direction: someone must read the message
    return None, "no direction in the request"


# rows a span rule would get wrong or cannot decide, each read in its message
JUDGED = {
    ("sl-0239", 7): (0.67, 'self-correction, "bigger, no wait, smaller": the final wish'),
    ("or2-0015", 0): (0.67, 'self-correction, "bigger. hmm no, smaller": the final wish'),
    ("fs-0079", 0): (1.25, '"much larger. Wait, actualy just a bit larger": the final wish, outside the span'),
    ("hm2-0215", 2): (1.25, '"resize Depot2 a little, it looks lost": a bit bigger, by the reason after the span'),
    ("hm2-0490", 2): (0.8, '"Resize Sink5 a little, it blocks the aisle": a bit smaller, by the reason after the span'),
    ("h-0250", 1): (1.25, '"Resize Frame2 a bit, since the photo is bigger now": a bit bigger, by the reason after the span'),
    ("fh-0195", 7): (1.25, '"make Chart a bit bigger, resize it": the amount is before the span'),
    ("sl-0225", 11): (1.25, '"Make the Mid a bit bigger, enlarge him": the amount is before the span'),
    ("sl-0179", 7): (1.25, '"the Draft to be a bit larger than the Outline. Enlarge the Draft": the amount is before the span'),
    ("h-0375", 0): (1.25, '"Enlarge the blue squares a little": "a little" is after the span'),
    ("s-0035", 1): (0.5, '"shrink the Closet to nothing much": much smaller'),
    ("s-0413", 1): (0.5, '"Shrink Trial and shrink Paid even more": more than the 0.67 of Trial'),
}


def rows():
    for d in MR.LABEL_FIX_DIRS:
        for m in MD.messages([d]):
            for i, w in enumerate(m.get("wires", [])):
                a = w.get("args", {})
                if w.get("type") == "command" and a.get("action") == "resize": yield d, m, i, w, a


def main():
    lines, count, stop = [], collections.Counter(), []
    for d, m, i, w, a in rows():
        if "scale" in a: count["already has a scale, kept"] += 1; continue
        if "size" in a or "width" in a or "height" in a: count["has a size, width or height: no fix"] += 1; continue
        k = (m["id"], i)
        scale, why = JUDGED[k] if k in JUDGED else rule(w.get("span") or "", a)
        if scale == "stop": stop.append(f'{m["id"]}#{i}: {w.get("span")}'); continue
        count[("judged: " if k in JUDGED else "rule: ") + why] += 1
        if scale is not None: lines.append({"id": m["id"], "wire": i, "scale": scale, "why": why})
    if stop: raise SystemExit("not plain, not judged:\n  " + "\n  ".join(stop))
    used = {(x["id"], x["wire"]) for x in lines}
    for k in JUDGED:
        if k not in used and JUDGED[k][0] is not None: raise SystemExit(f"judged row is not a resize row of the covered folders: {k}")
    text = "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in lines)
    if "--check" in sys.argv:
        if open(OUT, encoding="utf8").read() != text: raise SystemExit(f"{OUT} is not what this script writes")
    else:
        with open(OUT, "w", encoding="utf8") as f: f.write(text)
    for k, v in sorted(count.items(), key=lambda x: -x[1]): print(f"{v:5} {k}")
    print(f"{len(lines)} fixes, {sum(count.values())} resize rows without a scale or size key read")


if __name__ == "__main__": main()
