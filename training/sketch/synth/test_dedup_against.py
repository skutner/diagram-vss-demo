#!/usr/bin/env python3
"""Tests of MODERNBERT_RECAL_PLAN.md step S1: gen_short_r2.py --id-prefix, dedup_against.py, size_gate.py.
  python3 training/sketch/synth/test_dedup_against.py
"""
import glob, json, os, subprocess, sys, tempfile, unittest
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SR2 = os.path.join(REPO, "training", "sketch", "llm_train", "synth_short_r2")
C100 = os.path.expanduser("~/.cache/diagram-vss-modernbert/arms/data/C100")
sys.path.insert(0, HERE)
import dedup_against as D
import size_gate as SG


def py(*args):
    return subprocess.run([sys.executable, *args], capture_output=True, text=True)


def write(path, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")


def read(path):
    with open(path, encoding="utf8") as f:
        return [json.loads(l) for l in f if l.strip()]


def text_of(path):
    with open(path, encoding="utf8") as f:
        return f.read()


class GenPrefix(unittest.TestCase):
    def test_default_prefix_is_sr2_and_equals_explicit_sr2(self):
        with tempfile.TemporaryDirectory() as t:
            a, b, c = (os.path.join(t, x) for x in ("a.jsonl", "b.jsonl", "c.jsonl"))
            self.assertEqual(py(os.path.join(HERE, "gen_short_r2.py"), "--seed", "3", "--n", "300", "--out", a).returncode, 0)
            self.assertEqual(py(os.path.join(HERE, "gen_short_r2.py"), "--seed", "3", "--n", "300", "--id-prefix", "sr2", "--out", b).returncode, 0)
            self.assertEqual(py(os.path.join(HERE, "gen_short_r2.py"), "--seed", "3", "--n", "300", "--id-prefix", "st1", "--out", c).returncode, 0)
            self.assertEqual(text_of(a), text_of(b))
            ra, rc = read(a), read(c)
            self.assertTrue(all(r["id"].startswith("sr2-") for r in ra))
            self.assertTrue(all(r["id"].startswith("st1-") for r in rc))
            self.assertEqual([r["id"].split("-", 1)[1] for r in ra], [r["id"].split("-", 1)[1] for r in rc])
            self.assertEqual([{k: v for k, v in r.items() if k != "id"} for r in ra], [{k: v for k, v in r.items() if k != "id"} for r in rc])

    def test_seed0_still_reproduces_the_shipped_synth_short_r2(self):
        """every kept row of synth_short_r2 is a row of the seed-0 generation of today's code (same id, same everything)"""
        with tempfile.TemporaryDirectory() as t:
            a = os.path.join(t, "a.jsonl")
            self.assertEqual(py(os.path.join(HERE, "gen_short_r2.py"), "--seed", "0", "--n", "2400", "--out", a).returncode, 0)
            gen = {r["id"]: r for r in read(a)}
            kept = [r for f in sorted(glob.glob(os.path.join(SR2, "msg_*.jsonl"))) for r in read(f)]
            self.assertEqual(len(kept), 1997)
            self.assertEqual([r["id"] for r in kept if gen.get(r["id"]) != r], [])


class Dedup(unittest.TestCase):
    def fixture(self, t):
        """four sources, one text each of the kinds the plan names, and a candidate file with those four, a new one and a within-file duplicate"""
        write(os.path.join(t, "r2", "msg_01.jsonl"), [{"id": "sr2-1", "text": "add a red circle"}])
        write(os.path.join(t, "data", "train.jsonl"), [{"id": "fh-1", "text": "Make the Box   blue"}, {"id": "fh-1", "text": "a second request of the same message id"}])
        write(os.path.join(t, "data", "cut_train.jsonl"), [{"id": "fh-2", "text": "Move Router to the LEFT. Delete Lan"}])
        write(os.path.join(t, "nl_a", "opus", "batch_01.jsonl"), [{"id": "nl-1", "text": "please make the whole thing green"}])
        write(os.path.join(t, "nl_a", "gpt", "batch_01.jsonl"), [{"id": "nl-1", "text": "please make the whole thing green"}])
        cand = [{"id": "st1-0", "text": "Add a  RED circle"}, {"id": "st1-1", "text": "make the box blue"}, {"id": "st1-2", "text": "move router to the left. delete lan"},
                {"id": "st1-3", "text": "please make the whole thing green"}, {"id": "st1-4", "text": "add a purple star"}, {"id": "st1-5", "text": "ADD a purple   star"}]
        write(os.path.join(t, "cand.jsonl"), cand)
        return ["--against", os.path.join(t, "r2"), "--against", os.path.join(t, "data", "train.jsonl"), "--against", os.path.join(t, "data", "cut_train.jsonl"),
                "--against", os.path.join(t, "nl_a", "opus"), "--against", os.path.join(t, "nl_a", "gpt")]

    def test_drops_each_source_keeps_new_and_drops_within_file_duplicates(self):
        with tempfile.TemporaryDirectory() as t:
            ag = self.fixture(t); out = os.path.join(t, "out.jsonl")
            p = py(os.path.join(HERE, "dedup_against.py"), os.path.join(t, "cand.jsonl"), out, *ag)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertEqual([r["id"] for r in read(out)], ["st1-4"])
            rep = json.loads(p.stdout)
            self.assertEqual(rep["kept"], 1)
            self.assertEqual(rep["dropped_by_cause"], {f"text of {os.path.join(t, 'r2')}": 1, f"text of {os.path.join(t, 'data', 'train.jsonl')}": 1,
                                                       f"text of {os.path.join(t, 'data', 'cut_train.jsonl')}": 1, f"text of {os.path.join(t, 'nl_a', 'opus')}": 1,
                                                       "duplicate text within the file": 1})

    def test_refuses_an_id_that_is_a_training_or_set_id_and_writes_nothing(self):
        for source_id, where in (("sr2-1", "r2/msg_01.jsonl"), ("fh-2", "data/cut_train.jsonl"), ("nl-1", "nl_a/opus/batch_01.jsonl")):
            with tempfile.TemporaryDirectory() as t:
                ag = self.fixture(t); out = os.path.join(t, "out.jsonl")
                write(os.path.join(t, "cand.jsonl"), [{"id": source_id, "text": "a text nobody has"}, {"id": "st1-9", "text": "another new text"}])
                p = py(os.path.join(HERE, "dedup_against.py"), os.path.join(t, "cand.jsonl"), out, *ag)
                self.assertEqual(p.returncode, 2, where)
                self.assertIn("REFUSED", p.stderr)
                self.assertFalse(os.path.exists(out), "a refused run must not leave an output file")

    def test_refuses_duplicate_ids_in_the_input_and_a_source_with_no_files(self):
        with tempfile.TemporaryDirectory() as t:
            ag = self.fixture(t); out = os.path.join(t, "out.jsonl")
            write(os.path.join(t, "cand.jsonl"), [{"id": "st1-0", "text": "a"}, {"id": "st1-0", "text": "b"}])
            self.assertEqual(py(os.path.join(HERE, "dedup_against.py"), os.path.join(t, "cand.jsonl"), out, *ag).returncode, 2)
            os.makedirs(os.path.join(t, "empty"))
            p = py(os.path.join(HERE, "dedup_against.py"), os.path.join(t, "cand.jsonl"), out, "--against", os.path.join(t, "empty"))
            self.assertNotEqual(p.returncode, 0)

    def test_normalisation_is_that_of_collect_set(self):
        # collect_set.mjs: t.toLowerCase().split(/\s+/).filter(Boolean).join(' ')
        self.assertEqual(D.norm("  Make \t the\nBox  RED "), "make the box red")

    def test_real_sources_are_read(self):
        """the real synth_short_r2 and C100 training files are found and hold the counts the plan states"""
        texts, ids, counts = D.load_against([SR2, os.path.join(C100, "train.jsonl"), os.path.join(C100, "cut_train.jsonl")])
        self.assertEqual(counts[SR2], 1997)
        self.assertEqual(counts[os.path.join(C100, "train.jsonl")], 57135)
        self.assertEqual(counts[os.path.join(C100, "cut_train.jsonl")], 26913)
        self.assertIn("add a teal triangle quickly", texts)
        kept, causes = D.dedup([{"id": "zz-1", "text": "ADD a teal   triangle quickly"}, {"id": "zz-2", "text": "a text nobody wrote 7f3a"}], texts, ids)
        self.assertEqual([r["id"] for r in kept], ["zz-2"])


class SizeGate(unittest.TestCase):
    def folder(self, t, forms):
        rows = [{"id": f"x-{i}", "text": f"t{i}", "meta": {"form": f}} for i, f in enumerate(forms)]
        write(os.path.join(t, "msg_01.jsonl"), rows[:1000]); write(os.path.join(t, "msg_02.jsonl"), rows[1000:])

    def test_gate(self):
        with tempfile.TemporaryDirectory() as t:
            self.folder(t, ["create"] * 120 + ["set"] * 1380)
            args = [os.path.join(HERE, "size_gate.py"), t, "--min-total", "1500", "--min-form", "create:120"]
            p = py(*args); self.assertEqual(p.returncode, 0, p.stdout); self.assertTrue(json.loads(p.stdout)["met"])
            self.folder(t, ["create"] * 119 + ["set"] * 1381)   # one create short
            p = py(*args); self.assertEqual(p.returncode, 1); self.assertIn("form create", json.loads(p.stdout)["reasons"][0])
            self.folder(t, ["create"] * 120 + ["set"] * 1379)   # one message short
            p = py(*args); self.assertEqual(p.returncode, 1); self.assertIn("1499 messages", json.loads(p.stdout)["reasons"][0])
        with tempfile.TemporaryDirectory() as t:   # an empty folder fails
            self.assertEqual(py(os.path.join(HERE, "size_gate.py"), t, "--min-total", "1500", "--min-form", "create:120").returncode, 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
