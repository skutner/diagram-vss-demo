"""Stdlib manifest/protocol refusal tests; actual Layout integration is in trainer tests."""
import copy
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import modernbert_class_loss as C
import modernbert_rare_heads as R


class LayoutFixture:
    """Tiny Layout-compatible double. Production freeze imports the real Layout."""
    classes = [["outline", ["none", "red", "none"]], ["text-state", ["none", "empty"]], ["shape", ["none", "circle"]]]
    def class_targets(self, row):
        return [vs.index(row["classes"][k], 1) if row["classes"].get(k) is not None and row["classes"][k] in vs[1:] else 0 for k, vs in self.classes]


class Manifest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "objective.json"
        self.rows = [{"classes": {"outline": "none", "shape": "circle"}}, {"classes": {"shape": "circle"}}, {"classes": {"shape": "circle"}}, {"classes": {"shape": "circle"}}]
        self.layout, self.identity = LayoutFixture(), {"files": {"reader.json": "a" * 64, "train.jsonl": "b" * 64}, "requests": 4, "messages": 3}
        self.manifest = C.build_manifest(self.rows, self.layout, self.identity)
        self.path.write_text(json.dumps(self.manifest))

    def tearDown(self): self.temp.cleanup()

    def test_formula_none_text_state_and_degenerate_counts(self):
        heads = self.manifest["heads"]
        self.assertEqual([(h["positive"], h["absent"]) for h in heads], [(1, 3), (0, 4), (4, 0)])
        self.assertEqual(heads[1]["missing_population"], "positive")
        self.assertEqual(heads[2]["missing_population"], "absent")
        self.assertEqual(heads[0]["weights"]["positive"], 4 / (1 + math.sqrt(3)))
        self.assertEqual(heads[0]["weights"]["absent"], 4 / (math.sqrt(3) * (1 + math.sqrt(3))))
        for h in heads: self.assertAlmostEqual(h["corpus_mean"], 1, delta=1e-12)
        for weight in C.population_weights(2, 2): self.assertAlmostEqual(weight, 1, delta=1e-12)
        self.assertEqual(C.population_weights(1, 0), (1, 1))
        self.assertEqual(C.population_weights(0, 1), (1, 1))
        self.assertAlmostEqual(C.population_weights(1, 58551)[1], 240.9813704, places=6)
        weights, identity = C.validate_manifest(self.path, self.rows, self.layout, self.identity)
        self.assertEqual(identity["sha256"], C.digest(self.path))
        self.assertEqual(weights[1:], [(1, 1), (1, 1)])

    def test_mutated_manifest_fields_all_refuse(self):
        mutations = [lambda m: m.update(formula="inverse"), lambda m: m["heads"].reverse(),
                     lambda m: m["heads"][0].update(positive=True), lambda m: m["heads"][0].update(absent=4),
                     lambda m: m["heads"][0]["values"].append("blue"), lambda m: m["heads"][0]["weights"].update(positive=float("nan")),
                     lambda m: m["heads"][0]["weights"].update(absent=-1), lambda m: m["data"]["files"].update(**{"train.jsonl": "c" * 64}),
                     lambda m: m.update(normalization="batch-weight-sum"), lambda m: m.update(extra="unregistered")]
        for mutation in mutations:
            value = copy.deepcopy(self.manifest); mutation(value); self.path.write_text(json.dumps(value))
            with self.assertRaises(ValueError): C.validate_manifest(self.path, self.rows, self.layout, self.identity)

    def test_unknown_populated_values_and_layout_order(self):
        for key, value in (("outline", "unknown"), ("text-state", "none"), ("unknown-head", "red"), ("outline", 3)):
            rows = copy.deepcopy(self.rows); rows[0]["classes"][key] = value
            with self.assertRaisesRegex(ValueError, "Unknown populated"):
                C.build_manifest(rows, self.layout, self.identity)
        changed = LayoutFixture(); changed.classes = list(reversed(self.layout.classes))
        with self.assertRaises(ValueError): C.validate_manifest(self.path, self.rows, changed, self.identity)
        with self.assertRaises(ValueError): C.build_manifest([], self.layout, self.identity)
        for counts in ((0, 0), (-1, 2), (True, 2), (1.2, 2)):
            with self.assertRaises(ValueError): C.population_weights(*counts)


def selection_fixture():
    layout = LayoutFixture()
    layout.classes = [["outline", ["none", "red", "none"]], ["desc:size", ["none", "small"]], ["size", ["none", "small"]]]
    training, audit, rows = dict(selections=[], requests=[], counts={}), dict(F_description_rows=[]), []
    def add(family, head, value, **extra):
        ordinal = len(rows)
        row = dict(id="duplicate-id", text=f"draw șape {ordinal}", act="create", tags=["O"], classes={head: value} if value is not None else {})
        rows.append(row); training["requests"].append(dict(arm="F", text=row["text"], cap=128))
        selection = dict(arm="F", ordinal=ordinal, id=row["id"], family=family, head=head, gold=value,
                         request=ordinal, targets=layout.class_targets(row), act="create", tags=["O"], absent_control=value is None)
        training["selections"].append(selection)
        if family.startswith("description_size:"):
            audit["F_description_rows"].append(dict(ordinal=ordinal, id=row["id"], family=family, gold=value, request=ordinal, text=row["text"], **extra))
    for i in range(89): add("outline_create", "outline", "red" if i < 74 else "none")
    for _ in range(97): add("outline_set", "outline", "red")
    for i in range(59): add("description_size:target", "desc:size", "small", subset="r2_nonreserved" if i < 35 else "B/source", literal_canonical_size_word=i < 21)
    for _ in range(14): add("count_size", "size", "small")
    for _ in range(1440): add("outline_set", "outline", None)
    return training, audit, rows, layout


class Selections(unittest.TestCase):
    def test_duplicate_ids_unicode_ordinals_and_populations(self):
        training, audit, rows, layout = selection_fixture()
        populations = R.frozen_populations(training, audit, rows, layout)
        self.assertEqual(len(populations["outline_create"]), 89)
        self.assertEqual(len(populations["desc_r2_canonical"]), 21)
        self.assertEqual(len(populations["desc_old"]), 24)
        self.assertEqual(len(populations["absent_controls"]), 1440)
        self.assertEqual(populations["outline_create"], list(range(89)))

    def test_reordered_changed_truncated_and_unknown_selections_refuse(self):
        for mutation in (lambda t: t["selections"][0].update(ordinal=99999),
                         lambda t: t["selections"][0].update(id="wrong"),
                         lambda t: t["selections"][0].update(targets=[0, 0, 0]),
                         lambda t: t["requests"][0].update(text="changed"),
                         lambda t: t["selections"].pop()):
            training, audit, rows, layout = selection_fixture(); mutation(training)
            with self.assertRaises((ValueError, IndexError)): R.frozen_populations(training, audit, rows, layout)


class Protocol(unittest.TestCase):
    def test_export_dependencies_and_fixture_mutations_refuse_after_freeze(self):
        registered = R.read_json(R.STATIC)
        helpers = ["training/neural/export_modernbert.py", "training/neural/modernbert_weight_only.py", "training/neural/modernbert_parity.mjs",
                   "training/neural/parity/test_output_contract.py", "training/neural/parity/test_output_contract.mjs",
                   "docs/js/bench-canon.js", "training/sketch/layer_common.mjs", "docs/js/vss-composer.js",
                   "docs/js/front.js", "docs/js/vss-adapter.js", "docs/js/vss-context.js", "docs/js/vss.js",
                   "docs/js/vss/reader.js", "docs/js/vss/soplang.js", "docs/js/vss/routebook.js", "docs/js/vss/loader.js", "docs/js/vss/stars.js",
                   "training/neural/parity/modernbert_rare_heads_fit_evidence.mjs", "training/neural/parity/test_modernbert_rare_heads_fit_evidence.mjs"]
        for path in helpers: self.assertIn(path, registered["source_paths"])
        self.assertEqual(registered["inputs"]["alignment_fixture"]["path"], "training/neural/fixtures/modernbert_alignment.json")
        tokenizer_assets = registered["inputs"]["roundtrip_tokenizer_assets"]
        self.assertEqual(set(tokenizer_assets), {"config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json"})
        for name, ref in tokenizer_assets.items():
            self.assertEqual(ref["base"], "repo")
            self.assertEqual(ref["path"], "docs/model/neural/modernbert-c100/" + name)
        # Exercise the real freeze, hash inventory, output storage and verification.
        # Corpus/objective work is stubbed here: these probes test only dependency
        # binding, using isolated files rather than writing historical inputs.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); repo, task = root / "repo", root / "task"
            repo.mkdir(); task.mkdir()
            for path in helpers:
                target = repo / path; target.parent.mkdir(parents=True, exist_ok=True); target.write_text("original helper\n")
            fixture_rel = registered["inputs"]["alignment_fixture"]["path"]
            fixture = repo / fixture_rel; fixture.parent.mkdir(parents=True, exist_ok=True); fixture.write_text('[{"id":"fixture"}]\n')
            asset_files = {}
            for name, ref in tokenizer_assets.items():
                asset = repo / ref["path"]; asset.parent.mkdir(parents=True, exist_ok=True); asset.write_text('{"fixture":"tokenizer"}\n')
                asset_files[name] = asset
            data = root / "data"; data.mkdir(); (data / "reader.json").write_text("{}")
            run = root / "run"; run.mkdir(); (run / "complete.json").write_text('{"metadata":{"sources":{}}}')
            forms, selections, audit, plan = [root / name for name in ("forms.json", "selections.json", "audit.json", "plan.md")]
            forms.write_text('{"protocol":{},"source_files":{},"checks":[]}')
            selections.write_text('{"selections":[],"requests":[]}')
            audit.write_text('{"conflicting_selected_target_groups":[]}'); plan.write_text("fixture plan")
            def ref(path): return dict(path=str(path), sha256=R.digest(path))
            protocol = dict(campaign="isolated-dependency-probe", inputs=dict(forms_protocol=ref(forms), training_selections=ref(selections),
                            label_membership=ref(audit), alignment_fixture=ref(fixture),
                            roundtrip_tokenizer_assets={name: ref(path) for name, path in asset_files.items()}), plan=ref(plan), plan_review=ref(plan),
                            data=dict(path=str(data)), inventory_roots=[], source_paths=helpers,
                            arms={"F-s0": dict(training=dict(path=str(run)))}, roundtrip={})
            static = repo / "protocol.json"; static.write_text(json.dumps(protocol))
            out = task / "frozen"
            # Dimensions retain the fixed production boundary without allocating
            # corpus rows or importing/loading any model in this storage test.
            dimensions = (range(58552), SimpleNamespace(classes=[None] * 52), dict(messages=28330))
            with patch.object(R, "REPO", repo), patch.object(R, "T", task), patch.object(R, "STATIC", static), \
                    patch.object(R, "data_inputs", return_value=dimensions), patch.object(R, "build_manifest", return_value={"formula": C.FORMULA}), \
                    patch.object(R, "frozen_populations", return_value={}), patch.object(R, "validate_manifest"), patch.object(R, "versions", return_value={"fixture": "v1"}):
                frozen = R.freeze(static, out)
                self.assertEqual(R.verify_frozen(out / "protocol.json"), frozen)
                for path in helpers:
                    target = repo / path; original = target.read_bytes()
                    self.assertEqual(frozen["sources"][str(target)], R.digest(target))
                    target.write_bytes(original + b"changed\n")
                    with self.assertRaisesRegex(ValueError, "Source/dependency identity changed"):
                        R.verify_frozen(out / "protocol.json")
                    target.write_bytes(original)
                self.assertEqual(frozen["inputs"][str(fixture)], R.digest(fixture))
                original = fixture.read_bytes(); fixture.write_bytes(original + b" ")
                with self.assertRaisesRegex(ValueError, "Input/source identity changed"):
                    R.verify_frozen(out / "protocol.json")
                fixture.write_bytes(original)
                for asset in asset_files.values():
                    original = asset.read_bytes()
                    self.assertEqual(frozen["inputs"][str(asset)], R.digest(asset))
                    asset.write_bytes(original + b" ")
                    with self.assertRaisesRegex(ValueError, "Input/source identity changed"):
                        R.verify_frozen(out / "protocol.json")
                    asset.write_bytes(original)
                self.assertEqual(R.verify_frozen(out / "protocol.json"), frozen)

    def test_fit_dispatch_receipt_means_exit_zero_and_failure_stays_nonzero(self):
        argv = ["fit", "--protocol", "fixture.json", "--name", "W-s0", "--runtime", "ort", "--out", "fixture-out"]
        helper = SimpleNamespace(run_fit=lambda *args: {"passed": True})
        with patch.dict(sys.modules, modernbert_rare_heads_fit=helper):
            self.assertEqual(R.main(argv), 0)
        def fail(*args): raise ValueError("fixture failure")
        with patch.dict(sys.modules, modernbert_rare_heads_fit=SimpleNamespace(run_fit=fail)):
            self.assertEqual(R.main(argv), 1)

    def test_pins_recipe_budget_registered_outputs_and_comparators(self):
        p = R.read_json(R.STATIC)
        self.assertEqual(p["plan"]["sha256"], "b11e15ef42c0ed19f93bfdf7583779993b63cbbc35a2f5d24a6963fb9d116be5")
        self.assertEqual(p["plan_review"]["sha256"], "d1a6b835a93e4ec2f08819123a17217f90243ed7e5cfd965ce2595bce721e16c")
        self.assertEqual(p["budget"]["trajectories"], ["W-s0", "F-s1", "W-s1"])
        self.assertEqual(p["recipe"]["expected_updates"], math.ceil(58552 / 32) * 8)
        self.assertEqual(p["recipe"]["final_batch_rows"], 58552 % 32)
        self.assertEqual(p["comparators"]["W-s0"]["safety"], ["B-s0", "C100-s0"])
        self.assertEqual(p["comparators"]["W-s1"]["labels_case"], ["F-s1", "B-s0"])
        self.assertEqual(R.registered_arms(p)["W-s0"]["training"], str(R.T / "W-s0/run"))
        self.assertEqual(R.digest(R.ref_path(p["plan"])), p["plan"]["sha256"])

    def test_cli_foreign_protocol_refuses_without_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            p, out = Path(tmp) / "protocol.json", Path(tmp) / "output"
            p.write_text('{"version":"handwritten", "status":"PASS"}')
            for command in ("freeze", "verify"):
                argv = [sys.executable, "-B", str(HERE / "modernbert_rare_heads.py"), command, "--protocol", str(p)]
                if command == "freeze": argv += ["--out", str(out)]
                result = subprocess.run(argv, capture_output=True, text=True)
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertFalse(out.exists())

    def test_hash_check_missing_and_mutation_refuse(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "input"; p.write_text("before")
            identities = {str(p): R.digest(p)}; R.check_hashes(identities)
            p.write_text("after")
            with self.assertRaises(ValueError): R.check_hashes(identities)
            p.unlink()
            with self.assertRaises(ValueError): R.check_hashes(identities)


if __name__ == "__main__": unittest.main()
