"""Pure-stdlib campaign fixtures: never access model weights or production outputs."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import modernbert_request_weight as R


class JointLayout:
    classes = [("color", ["absent", "red"])] + [(f"head{i}", ["absent", "x"]) for i in range(51)]
    def class_targets(self, row): return row["targets"]


def population_fixture():
    rows, selections, requests = [], [], []
    for i in range(89):
        # Preserve the four repeated observations in the no-fill population.
        request = i if i < 85 else i - 4
        row = dict(id=f"id-{request}", text=f"request {request} Î", targets=[int(i < 57)] + [0] * 51,
                   act="create", tags=["O", "O", "O"])
        rows.append(row)
        selections.append(dict(ordinal=i, id=row["id"], request=request, targets=row["targets"], act=row["act"], tags=row["tags"]))
        if i < 85: requests.append(dict(text=row["text"]))
    return dict(selections=selections, requests=requests), dict(outline_create=list(range(89))), rows


class Campaign(unittest.TestCase):
    def test_independent_review_receipt_binds_both_scopes_and_exact_sources(self):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            sources = {str(root / "objective.py"): "a" * 64, str(root / "campaign.mjs"): "b" * 64}
            receipt = root / "source-review.json"
            scopes = {"objective-trainer": [str(root / "objective.py")], "campaign-fit": [str(root / "campaign.mjs")]}
            reviews = []
            for scope, paths in scopes.items():
                report = root / (scope + "_codex.md"); report.write_text("Independent fixture review only\n")
                reviews.append(dict(scope=scope, status="approved", independent=True, path=str(report), sha256=R.digest(report), covered_sources={p: sources[p] for p in paths}))
            value = dict(schema="modernbert-request-weight-source-review-v1", status="approved", sources=sources, reviews=reviews)
            protocol = dict(source_review=dict(path=str(receipt)), source_review_scopes=scopes)
            receipt.write_text(json.dumps(value))
            self.assertEqual(R.validate_source_review(protocol, sources)["sha256"], R.digest(receipt))
            for mutate in (lambda x: x.update(status="pending"), lambda x: x["reviews"].pop(),
                           lambda x: x["reviews"][0].update(independent=False),
                           lambda x: x["reviews"][0].update(covered_sources={}),
                           lambda x: x["sources"].update({str(root / "objective.py"): "c" * 64})):
                bad = copy.deepcopy(value); mutate(bad); receipt.write_text(json.dumps(bad))
                with self.assertRaises(ValueError): R.validate_source_review(protocol, sources)
            receipt.write_text(json.dumps(value)); Path(reviews[0]["path"]).write_text("changed")
            with self.assertRaisesRegex(ValueError, "report missing/changed"): R.validate_source_review(protocol, sources)

    def test_registered_single_seed_and_caps(self):
        p = R.read_json(R.STATIC)
        self.assertEqual(p["budget"]["trajectories"], ["J-s0"])
        self.assertEqual(p["budget"]["training_invocations_max"], 2)
        self.assertEqual(p["budget"]["training_aggregate_seconds_max"], 10800)
        self.assertEqual(p["budget"]["overfit"]["invocations_max"], 1)
        self.assertFalse(p["budget"]["confirmation"])
        self.assertNotIn("R4", p["acceptance"])
        self.assertEqual(p["objective"]["formula"], "request-max-positive-sqrt-v1")
        self.assertEqual(set(p["arms"]), {"J-s0", "F-s0", "W-s0", "B-s0", "C100-s0"})

    def test_joint_partition_preserves_duplicates_and_identity(self):
        training, populations, rows = population_fixture()
        groups, selected = R.joint_populations(training, populations, rows, JointLayout())
        self.assertEqual(groups, dict(fill_outline=list(range(57)), outline_without_fill=list(range(57, 89))))
        self.assertEqual(len(selected), 89)
        self.assertEqual(len({r["request"] for r in selected}), 85)
        self.assertEqual(selected[-1]["ordinal"], 88)
        self.assertEqual(selected[-1]["text_sha256"], hashlib.sha256(rows[-1]["text"].encode()).hexdigest())

    def test_joint_substitution_and_false_partition_refuse(self):
        mutations = [lambda t, p, r: p["outline_create"].__setitem__(88, 87),
                     lambda t, p, r: r[0].update(targets=[0] * 52),
                     lambda t, p, r: r[0].update(text="changed"),
                     lambda t, p, r: r[0].update(tags=["B"]),
                     lambda t, p, r: t["selections"][0].update(act="set")]
        for mutate in mutations:
            t, p, r = population_fixture(); mutate(t, p, r)
            with self.assertRaises(ValueError): R.joint_populations(t, p, r, JointLayout())

    def test_freeze_and_verify_refuse_foreign_paths_before_inputs(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaisesRegex(ValueError, "registered task-owned"):
                R.freeze(R.STATIC, Path(root) / "frozen")
            with self.assertRaisesRegex(ValueError, "registered frozen"):
                R.verify_frozen(Path(root) / "protocol.json")

    def test_output_ancestor_and_dangling_symlinks_refuse(self):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root); (root / "real").mkdir()
            (root / "alias").symlink_to(root / "real", target_is_directory=True)
            (root / "dangling").symlink_to(root / "missing")
            for path in (root / "alias/new", root / "dangling"):
                with self.assertRaisesRegex(ValueError, "Symlink"): R.safe_path(path)

    def test_registered_reference_arithmetic_refuses_drift(self):
        refs = R.read_json(R.STATIC)["objective"]["arithmetic_references"]
        obj = dict(raw_sum=refs["raw_sum"], mean_raw=refs["mean_raw"], heads=[dict(name="color")],
                   distribution=dict(mean=1., minimum=refs["min"], maximum=refs["max"], median=refs["p50"],
                                     p90=refs["p90"], p95=refs["p95"], p99=refs["p99"], all_absent=2900))
        protocol = R.read_json(R.STATIC)
        R.validate_references(protocol, obj, b'{"normalized": 4.4886137801464265}\n', [dict(ordinal=0, targets=[1])])
        for key in ("raw_sum", "mean_raw"):
            bad = copy.deepcopy(obj); bad[key] += .001
            with self.assertRaisesRegex(ValueError, "arithmetic"): R.validate_references(protocol, bad, b"", [])
        with self.assertRaisesRegex(ValueError, "row weight"):
            R.validate_references(protocol, obj, b'{"normalized": 1}\n', [dict(ordinal=0, targets=[1])])


if __name__ == "__main__": unittest.main()
