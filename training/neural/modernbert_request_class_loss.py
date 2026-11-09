"""Frozen whole-request class weights. No model imports or row-ID lookup."""
from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path

FORMULA = "request-max-positive-sqrt-v1"
NORMALIZATION = "full-corpus-raw-mean-one; minibatch-arithmetic-mean; all-heads-equal"


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def positive_coefficient(positive, absent):
    if any(type(n) is not int or n < 0 for n in (positive, absent)) or positive + absent == 0:
        raise ValueError("Population counts must be nonnegative integers with a nonempty corpus")
    if not positive or not absent: return 1.
    return (positive + absent) / (math.sqrt(positive) * (math.sqrt(positive) + math.sqrt(absent)))


@dataclass(frozen=True)
class RequestClassWeights:
    coefficients: tuple
    mean_raw: float

    def __post_init__(self):
        if not isinstance(self.coefficients, tuple) or not self.coefficients:
            raise ValueError("Immutable nonempty coefficients are required")
        if not all(math.isfinite(v) and v > 0 for v in (*self.coefficients, self.mean_raw)):
            raise ValueError("Request class weights must be finite and positive")

    def raw(self, targets):
        if len(targets) != len(self.coefficients): raise ValueError("Layout target length differs")
        return max([1.] + [a for a, t in zip(self.coefficients, targets) if t > 0])

    def normalized(self, targets):
        return self.raw(targets) / self.mean_raw


def corpus_targets(rows, layout):
    if not rows or not layout.classes: raise ValueError("A nonempty corpus and class layout are required")
    keys = [key for key, _ in layout.classes]
    if len(set(keys)) != len(keys): raise ValueError("Duplicate class heads")
    values = dict(layout.classes)
    out = []
    for ordinal, row in enumerate(rows):
        for key, value in row["classes"].items():
            if value is not None and (key not in values or value not in values[key][1:]):
                raise ValueError(f"Unknown populated class value at row {ordinal}: {key}={value!r}")
        targets = layout.class_targets(row)
        if len(targets) != len(keys) or any(type(t) is not int or not 0 <= t < len(v) for t, (_, v) in zip(targets, layout.classes)):
            raise ValueError("Invalid Layout targets")
        out.append(targets)
    return out


def row_weight_artifact(rows, layout, weights):
    """Ordered inventory; full row hashes bind duplicates, text, labels and identity."""
    result = []
    for ordinal, (row, targets) in enumerate(zip(rows, corpus_targets(rows, layout))):
        raw = weights.raw(targets)
        result.append(dict(ordinal=ordinal, id=row.get("id"), row_sha256=hashlib.sha256(canonical(row).encode()).hexdigest(),
                           raw=raw, normalized=raw / weights.mean_raw,
                           maximizing_heads=[key for (key, _), a, t in zip(layout.classes, weights.coefficients, targets) if t > 0 and a == raw]))
    return result


def artifact_bytes(artifact):
    return "".join(canonical(row) + "\n" for row in artifact).encode("utf-8")


def build_manifest(rows, layout, data_identity):
    targets = corpus_targets(rows, layout)
    n = len(rows)
    positives = [sum(t[h] > 0 for t in targets) for h in range(len(layout.classes))]
    coefficients = tuple(positive_coefficient(p, n - p) for p in positives)
    unnormalized = RequestClassWeights(coefficients, 1.)
    raw_sum = math.fsum(unnormalized.raw(t) for t in targets)
    weights = RequestClassWeights(coefficients, raw_sum / n)
    artifact = row_weight_artifact(rows, layout, weights)
    qs = sorted(r["normalized"] for r in artifact)
    distribution = dict(mean=math.fsum(qs) / n, minimum=qs[0], maximum=qs[-1],
                        all_absent=sum(not any(t) for t in targets))
    distribution.update({name: qs[math.ceil(p * n) - 1] for name, p in (("median", .5), ("p90", .9), ("p95", .95), ("p99", .99))})
    if abs(distribution["mean"] - 1.) > 1e-12: raise ValueError("Invalid corpus normalization")
    heads = [dict(name=k, values=v, positive=p, absent=n-p, positive_coefficient=a) for (k, v), p, a in zip(layout.classes, positives, coefficients)]
    return dict(version="modernbert-request-class-loss-manifest-v1", formula=FORMULA, normalization=NORMALIZATION,
                arithmetic="binary64; math.fsum corpus raw sum; q converted to float32 loss dtype after binary64 division",
                data=data_identity, rows=n, heads=heads, raw_sum=raw_sum, mean_raw=weights.mean_raw,
                row_weights_sha256=hashlib.sha256(artifact_bytes(artifact)).hexdigest(), distribution=distribution)


def validate_manifest(path, rows, layout, data_identity):
    payload = Path(path).read_bytes()
    want = build_manifest(rows, layout, data_identity)
    if canonical(json.loads(payload)) != canonical(want):
        raise ValueError("Request class loss manifest differs from recomputed corpus/layout/objective")
    weights = RequestClassWeights(tuple(h["positive_coefficient"] for h in want["heads"]), want["mean_raw"])
    return weights, dict(formula=FORMULA, sha256=hashlib.sha256(payload).hexdigest(), manifest=want)
