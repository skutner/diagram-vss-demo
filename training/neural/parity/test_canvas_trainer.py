"""Tests of the canvas pass (arm M4, --canvas-rows) of finetune_modernbert_batched.py on the CPU, with the tiny ModernBERT of test_batched_trainer.py.
Run with the task venv: python training/neural/parity/test_canvas_trainer.py
M4_TRAINER_DIR=folder tests a trainer copy in that folder (it must hold the trainer's source files) instead of training/neural."""
import json
import os
from pathlib import Path
import random
import sys
import tempfile
import unittest

os.environ["CUDA_VISIBLE_DEVICES"] = ""
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
if os.environ.get("M4_TRAINER_DIR"): sys.path.insert(0, os.environ["M4_TRAINER_DIR"])
import finetune_modernbert_batched as F   # before the test module, so that the copy under test is the one it uses
import test_batched_trainer as T
T.F = F
import torch
from finetune_modernbert import Backend
from finetune_roles import Layout
from modernbert_tokenization import words_of

SEP = " ||\n"


def canvas_row(i, n_lines=3):
    """a request, then lines whose first name is the target on positive rows (i even)"""
    req = f"make the thing number {i} red"
    lines = [f"Shape{i}x{k}: medium white circle" for k in range(n_lines)]
    text = req + SEP + " ;\n".join(lines)
    ws = words_of(text); start = len(req + SEP)
    tags = [None if w["start"] < start else "O" for w in ws]
    if i % 2 == 0:
        j = next(k for k, w in enumerate(ws) if w["start"] >= start)
        tags[j] = "B-target"
    return {"id": f"c{i}", "text": text, "words": [w["w"] for w in ws], "tags": tags, "draw_from": start}


def make_canvas(folder, n=13, **kw):
    folder = Path(folder); folder.mkdir(parents=True, exist_ok=True)
    (folder / "canvas_train.jsonl").write_text("".join(json.dumps(canvas_row(i, **kw)) + "\n" for i in range(n)))
    (folder / "canvas_manifest.json").write_text("{}\n")
    return folder


def rows_of(work, name="train.jsonl"):
    return [json.loads(x) for x in (Path(work) / name).read_text().splitlines()]


class Canvas(T.Base):
    def setUp(self):
        super().setUp(); self.canvas = make_canvas(self.dir / "canvas")

    def run_arm(self, work, **over):
        a = T.args(work, self.data, **over)
        if "canvas_rows" in over: a.canvas_tokens = over.get("canvas_tokens", 120)
        return F.run(a, self.backend, T.hooks())

    def test_default_records_nothing_of_the_canvas(self):
        work = self.dir / "w"
        self.assertEqual(self.run_arm(work), 0)
        self.assertNotIn("canvas", json.loads((work / "environment.json").read_text())["settings"])
        for r in rows_of(work): self.assertFalse(any(k.startswith("canvas") for k in r))
        state = torch.load(work / "checkpoint.pt", weights_only=False)["state"]
        self.assertFalse(any(k.startswith("canvas") for k in state))

    def test_canvas_pass_runs_cycles_and_keeps_the_request_order(self):
        plain, arm = self.dir / "plain", self.dir / "arm"
        self.assertEqual(self.run_arm(plain), 0)
        self.assertEqual(self.run_arm(arm, canvas_rows=self.canvas, canvas_tokens=120), 0)
        rows = rows_of(arm)
        self.assertTrue(all("canvas_loss" in r and r["canvas_tokens"] <= 120 and r["canvas_rows"] >= 1 for r in rows))
        self.assertGreater(sum(r["canvas_rows"] for r in rows), 13, "the canvas pass cycles past the end of its rows")
        s0, s1 = (torch.load(w / "checkpoint.pt", weights_only=False)["state"] for w in (plain, arm))
        self.assertEqual(s0["order"], s1["order"]); self.assertEqual(s0["cut_order"], s1["cut_order"])   # its own generator: the other passes draw as before
        self.assertEqual([r["request_loss"] for r in rows_of(plain)][:1], [r["request_loss"] for r in rows][:1])   # the first forward is on the same weights
        env = json.loads((arm / "environment.json").read_text())
        self.assertEqual(env["settings"]["canvas"]["rows"], 13); self.assertEqual(env["settings"]["canvas"]["tokens"], 120)
        fit = rows_of(arm, "fit.jsonl")[-1]
        self.assertIn("canvas_tags", fit); self.assertGreater(fit["canvas_role_words_n"], 0)
        self.assertIn("canvas_tokens", json.loads((arm / "preflight.json").read_text()))

    def test_resume_gives_the_same_next_canvas_losses(self):
        whole, part = self.dir / "whole", self.dir / "part"
        self.assertEqual(self.run_arm(whole, canvas_rows=self.canvas), 0)
        want = [(r["request_loss"], r["cut_loss"], r["canvas_loss"]) for r in rows_of(whole)]
        a = T.args(part, self.data, canvas_rows=self.canvas); a.canvas_tokens = 120
        self.assertEqual(F.run(a, self.backend, T.hooks(now=T.ClockAfter(7))), 0)
        a = T.args(part, self.data, canvas_rows=self.canvas, resume=True); a.canvas_tokens = 120
        self.assertEqual(F.run(a, self.backend, T.hooks()), 0)
        got = [(r["request_loss"], r["cut_loss"], r["canvas_loss"]) for r in rows_of(part)]
        self.assertEqual(len(got), len(want))
        for g, w in zip(got, want):
            for x, y in zip(g, w): self.assertAlmostEqual(x, y, places=5)

    def test_resume_refuses_other_canvas_rows_or_no_flag(self):
        work = self.dir / "w"
        a = T.args(work, self.data, canvas_rows=self.canvas); a.canvas_tokens = 120
        self.assertEqual(F.run(a, self.backend, T.hooks(now=T.ClockAfter(3))), 0)
        other = make_canvas(self.dir / "other", n=11)
        for over in (dict(canvas_rows=other), {}):
            a = T.args(work, self.data, resume=True, **over); a.canvas_tokens = 120
            with self.assertRaisesRegex(RuntimeError, "settings"): F.run(a, self.backend, T.hooks())

    def test_batches_stay_within_the_budget(self):
        layout = Layout(T.READER)
        rows = F.canvas_prepare(T.TOK, [canvas_row(i, n_lines=1 + i % 7) for i in range(40)], layout)
        rng, order = random.Random(0), list(range(40)); rng.shuffle(order)
        for budget in (30, 100, 400, 4096):
            pos = 0
            while pos < 40:
                take = F.canvas_batch(rows, order, pos, budget)
                self.assertGreaterEqual(len(take), 1)
                if len(take) > 1: self.assertLessEqual(len(take) * max(len(rows[i]["ids"]) for i in take), budget)
                if pos + len(take) < 40: self.assertGreater((len(take) + 1) * max(len(rows[i]["ids"]) for i in take + [order[pos + len(take)]]), budget)   # the largest that fits
                pos += len(take)

    def test_labels_only_on_the_drawing(self):
        layout = Layout(T.READER); r = canvas_row(0)
        p = F.canvas_prepare(T.TOK, [r], layout)[0]
        labelled = [t for t, x in enumerate(p["labels"]) if x != -100]
        first_drawing = next(k for k, t in enumerate(r["tags"]) if t is not None)
        self.assertEqual(sum(t is not None for t in r["tags"]), len(labelled))
        self.assertIn(layout.tag_id["B-target"], p["labels"])
        self.assertEqual(min(labelled), first_drawing + 1, "the first labelled piece is the first word of the drawing (after [CLS], one piece per word here)")

    def test_rows_the_reader_would_cut_or_split_are_refused(self):
        layout = Layout(T.READER)
        long = canvas_row(0, n_lines=200)
        with self.assertRaisesRegex(ValueError, "over 512"): F.canvas_prepare(T.TOK, [long], layout)
        bad = canvas_row(1); bad["words"] = bad["words"][:-1]; bad["tags"] = bad["tags"][:-1]
        with self.assertRaisesRegex(ValueError, "splitter"): F.canvas_prepare(T.TOK, [bad], layout)
        unknown = canvas_row(2); unknown["tags"] = [t and t.replace("target", "nope") for t in unknown["tags"]]
        with self.assertRaisesRegex(ValueError, "not in reader.json"): F.canvas_prepare(T.TOK, [unknown], layout)


if __name__ == "__main__":
    unittest.main()
