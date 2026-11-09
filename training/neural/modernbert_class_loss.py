"""Frozen corpus weights for the opt-in rare-head experiment (no model imports)."""
import hashlib
import json
import math
from pathlib import Path

FORMULA = "sqrt-positive-absent-v1"
NORMALIZATION = "per-head-corpus-mean-one; minibatch-arithmetic-mean"


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""): h.update(block)
    return h.hexdigest()


def population_weights(positive, absent):
    if any(type(n) is not int or n < 0 for n in (positive, absent)) or positive + absent == 0:
        raise ValueError("Population counts must be nonnegative integers with a nonempty corpus")
    if not positive or not absent: return 1., 1.
    p, a, n = math.sqrt(positive), math.sqrt(absent), positive + absent
    return n / (a * (p + a)), n / (p * (p + a))  # absent, positive


def build_manifest(rows, layout, data_identity):
    """Count actual Layout targets, refusing values Layout would silently map to absence."""
    if not rows or not layout.classes: raise ValueError("A nonempty corpus and class layout are required")
    keys = [key for key, _ in layout.classes]
    if len(set(keys)) != len(keys): raise ValueError("Duplicate class heads")
    values = dict(layout.classes)
    positives = [0] * len(keys)
    for ordinal, row in enumerate(rows):
        for key, value in row["classes"].items():
            if value is not None and (key not in values or value not in values[key][1:]):
                raise ValueError(f"Unknown populated class value at row {ordinal}: {key}={value!r}")
        targets = layout.class_targets(row)
        if len(targets) != len(keys): raise ValueError("Layout target length differs")
        for i, target in enumerate(targets): positives[i] += int(target > 0)
    heads, n = [], len(rows)
    for (key, vals), positive in zip(layout.classes, positives):
        absent = n - positive
        w0, wp = population_weights(positive, absent)
        mean = (absent * w0 + positive * wp) / n
        if not all(math.isfinite(w) and w > 0 for w in (w0, wp)) or abs(mean - 1) > 1e-12:
            raise ValueError(f"Invalid normalization for {key}")
        heads.append(dict(name=key, values=vals, positive=positive, absent=absent,
                          weights=dict(absent=w0, positive=wp), corpus_mean=mean,
                          missing_population="positive" if not positive else "absent" if not absent else None))
    return dict(version="modernbert-class-loss-manifest-v1", formula=FORMULA, normalization=NORMALIZATION,
                data=data_identity, rows=n, heads=heads)


def validate_manifest(path, rows, layout, data_identity):
    """Recompute every field; canonical comparison also distinguishes booleans from integers."""
    path = Path(path)
    payload = path.read_bytes()
    want = build_manifest(rows, layout, data_identity)
    got = json.loads(payload)
    if canonical(got) != canonical(want): raise ValueError("Class loss manifest differs from recomputed corpus/layout/objective")
    weights = [(h["weights"]["absent"], h["weights"]["positive"]) for h in want["heads"]]
    return weights, dict(formula=FORMULA, sha256=hashlib.sha256(payload).hexdigest(), manifest=want)
