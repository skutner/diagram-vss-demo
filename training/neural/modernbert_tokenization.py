"""Whitespace-normalized wordwise BPE shared with NeuralKit.makeReader.

Offsets use JavaScript UTF-16 code units. Only complete words fit within the cap;
the first omitted word and all its suffix are explicitly unread.
"""
import unicodedata

POLICY = "wordwise-bpe-prefix-space-v1"
# ECMAScript RegExp \s, as WORD_RE in neural.js. Python str.isspace differs
# for BOM, NEL and four ASCII information separators.
JS_SPACE = frozenset("\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff")


def words_of(text):
    out, current, start, offset = [], "", 0, 0
    for ch in str(text):
        size = len(ch.encode("utf-16-le")) // 2
        alnum = unicodedata.category(ch)[0] in "LN"
        if current and not alnum:
            out.append({"w": current, "start": start, "end": offset})
            current = ""
        if alnum:
            if not current: start = offset
            current += ch
        elif ch not in JS_SPACE:
            out.append({"w": ch, "start": offset, "end": offset + size})
        offset += size
    if current: out.append({"w": current, "start": start, "end": offset})
    return out


def prepare(tok, text, limit):
    if limit < 2: raise ValueError("The token cap must include BOS and EOS")
    specials = tok.encode("", add_special_tokens=True)
    if len(specials) != 2: raise ValueError("Expected exactly BOS and EOS")
    if tok.pad_token_id is None: raise ValueError("Tokenizer has no padding ID")
    ws, ids, first, pieces = words_of(text), [specials[0]], {}, []
    unread = None
    for i, w in enumerate(ws):
        p = tok.encode((" " if i else "") + w["w"], add_special_tokens=False)
        if not p: raise ValueError(f"Empty word encoding: {w['w']!r}")
        if len(ids) + len(p) + 1 > limit:
            unread = w["start"]
            break
        first[i] = len(ids)
        pieces.append(p)
        ids.extend(p)
    ids.append(specials[1])
    return {"text": str(text), "ws": ws, "ids": ids, "first": first,
            "pieces": pieces, "truncated": unread is not None, "unreadFrom": unread}


def batch(tok, texts, limit):
    ps = [prepare(tok, text, limit) for text in texts]
    n = max(len(p["ids"]) for p in ps)
    return ps, {"input_ids": [p["ids"] + [tok.pad_token_id] * (n - len(p["ids"])) for p in ps],
                "attention_mask": [[1] * len(p["ids"]) + [0] * (n - len(p["ids"])) for p in ps]}


def encode(tok, rows, layout, maxlen, device, tagmap=None):
    import torch
    ps, arrays = batch(tok, [r["text"] for r in rows], maxlen)
    n = len(arrays["input_ids"][0])
    labels = []
    for p, r in zip(ps, rows):
        if [w["w"] for w in p["ws"]] != r["words"]:
            raise ValueError("Dataset word splitter differs from the reader")
        lab = [-100] * n
        for w, t in p["first"].items(): lab[t] = (tagmap or layout.tag_id)[r["tags"][w]]
        labels.append(lab)
    return ({k: torch.tensor(v, dtype=torch.long, device=device) for k, v in arrays.items()},
            torch.tensor(labels, dtype=torch.long, device=device), ps)
