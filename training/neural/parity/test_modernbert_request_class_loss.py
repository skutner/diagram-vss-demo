"""Pure arithmetic and frozen inventory tests; no model or tokenizer imports."""
import copy
from dataclasses import FrozenInstanceError
import hashlib
import json
import math
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import modernbert_request_class_loss as J


class LayoutFixture:
    classes = [["fill", ["none", "red"]], ["outline", ["none", "none", "blue"]],
               ["never", ["none", "yes"]], ["always", ["none", "yes"]]]

    def class_targets(self, row):
        return [v.index(row["classes"][k], 1) if row["classes"].get(k) is not None else 0 for k, v in self.classes]


class Manifest(unittest.TestCase):
    def setUp(self):
        self.layout = LayoutFixture()
        self.rows = [dict(id="duplicate", text="șAPE" + str(i), classes=dict(always="yes", **(
            {"fill": "red", "outline": "none"} if i == 0 else {"fill": "red"} if i < 3 else {}))) for i in range(9)]
        self.identity = {"files": {"train.jsonl": "a" * 64, "reader.json": "b" * 64}}
        self.manifest = J.build_manifest(self.rows, self.layout, self.identity)
        self.weights = J.RequestClassWeights(tuple(h["positive_coefficient"] for h in self.manifest["heads"]), self.manifest["mean_raw"])

    def test_formula_global_mean_max_and_population_edges(self):
        a = 9 / (math.sqrt(3) * (math.sqrt(3) + math.sqrt(6)))
        b = 9 / (1 + math.sqrt(8))
        raw = [b, max(1., a), max(1., a)] + [1.] * 6
        mean = math.fsum(raw) / 9
        self.assertEqual(self.weights.coefficients, (a, b, 1., 1.))
        self.assertEqual(self.weights.mean_raw, mean)
        self.assertEqual([self.weights.normalized(self.layout.class_targets(r)) for r in self.rows], [r / mean for r in raw])
        self.assertNotEqual(b, a + b)
        self.assertNotEqual(b, a * b)
        self.assertAlmostEqual(self.manifest["distribution"]["mean"], 1., delta=1e-12)
        self.assertEqual(self.weights.normalized([0, 0, 0, 0]), 1 / mean)
        for counts in ((0, 0), (-1, 2), (True, 1), (1., 2)):
            with self.assertRaises(ValueError): J.positive_coefficient(*counts)
        for counts in ((0, 2), (2, 0)): self.assertEqual(J.positive_coefficient(*counts), 1.)
        with self.assertRaises(FrozenInstanceError): self.weights.mean_raw = 3
        with self.assertRaises(ValueError): J.RequestClassWeights((float("nan"),), 1.)

    def test_order_duplicate_ids_and_identity_are_preserved(self):
        artifact = J.row_weight_artifact(self.rows, self.layout, self.weights)
        self.assertEqual([r["ordinal"] for r in artifact], list(range(9)))
        self.assertEqual([r["id"] for r in artifact], ["duplicate"] * 9)
        self.assertEqual(artifact[0]["maximizing_heads"], ["outline"])
        self.assertEqual(self.manifest["row_weights_sha256"], hashlib.sha256(J.artifact_bytes(artifact)).hexdigest())
        changed = list(reversed(self.rows))
        self.assertNotEqual(J.build_manifest(changed, self.layout, self.identity)["row_weights_sha256"], self.manifest["row_weights_sha256"])
        renamed = dict(self.rows[0], id="different")
        self.assertEqual(self.weights.normalized(self.layout.class_targets(renamed)), artifact[0]["normalized"])
        repeated = J.row_weight_artifact([renamed, self.rows[0], self.rows[0]], self.layout, self.weights)
        self.assertEqual([r["normalized"] for r in repeated], [artifact[0]["normalized"]] * 3)

    def test_manifest_canonical_refusals(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.json"
            path.write_text(json.dumps(self.manifest))
            weights, identity = J.validate_manifest(path, self.rows, self.layout, self.identity)
            self.assertEqual(weights, self.weights)
            self.assertEqual(identity["sha256"], hashlib.sha256(path.read_bytes()).hexdigest())
            mutations = [lambda m: m.update(mean_raw=1.), lambda m: m.update(formula="other"),
                         lambda m: m["heads"].reverse(), lambda m: m["heads"][0].update(positive=True),
                         lambda m: m["heads"][0].update(positive_coefficient=float("nan")),
                         lambda m: m.update(row_weights_sha256="0" * 64), lambda m: m["distribution"].update(mean=2),
                         lambda m: m.update(normalization="batch"), lambda m: m.update(rows=8)]
            for mutate in mutations:
                bad = copy.deepcopy(self.manifest); mutate(bad); path.write_text(json.dumps(bad))
                with self.assertRaises(ValueError): J.validate_manifest(path, self.rows, self.layout, self.identity)

    def test_empty_unknown_duplicate_heads_and_all_absent(self):
        for key, value in (("outline", "green"), ("unknown", "blue")):
            bad = copy.deepcopy(self.rows); bad[0]["classes"][key] = value
            with self.assertRaisesRegex(ValueError, "Unknown populated"): J.build_manifest(bad, self.layout, self.identity)
        with self.assertRaises(ValueError): J.build_manifest([], self.layout, self.identity)
        duplicate = LayoutFixture(); duplicate.classes = self.layout.classes * 2
        with self.assertRaisesRegex(ValueError, "Duplicate"): J.build_manifest(self.rows, duplicate, self.identity)
        empty = LayoutFixture(); empty.classes = []
        with self.assertRaises(ValueError): J.build_manifest(self.rows, empty, self.identity)
        absent = J.build_manifest([dict(classes={})], self.layout, {})
        self.assertEqual(absent["mean_raw"], 1.)
        self.assertEqual(absent["distribution"]["all_absent"], 1)


if __name__ == "__main__": unittest.main()
