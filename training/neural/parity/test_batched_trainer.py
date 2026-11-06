"""Tests of finetune_modernbert_batched.py on the CPU, with a tiny ModernBERT and the real tokenizer. No GPU, no download, the real lock is never touched.
Run with the task venv: python training/neural/parity/test_batched_trainer.py"""
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
import unittest

os.environ["CUDA_VISIBLE_DEVICES"] = ""
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import torch
from transformers import AutoTokenizer, ModernBertConfig, ModernBertModel

import finetune_modernbert_batched as F
from finetune_modernbert import Backend, ModernReader, RunLock
from finetune_roles import Layout
from modernbert_tokenization import encode, words_of

TOKENIZER = Path.home() / ".cache/diagram-vss-modernbert/cuda-run-0e25611/tokenizer"
TOK = AutoTokenizer.from_pretrained(TOKENIZER, local_files_only=True)
READER = {"acts": ["create", "delete", "connect"], "tags": ["O", "B-target", "I-target"], "cut": {"tags": ["O", "B", "I"], "max_length": 512},
          "classes": [["color", ["none", "red", "blue"]], ["shape", ["none", "circle", "square", "star"]]]}


def tiny_encoder(attn="sdpa", seed=0, local_attention=8):
    torch.manual_seed(seed)
    c = ModernBertConfig(vocab_size=50368, hidden_size=16, intermediate_size=24, num_hidden_layers=3, num_attention_heads=2, max_position_embeddings=8192,
                        local_attention=local_attention, global_attn_every_n_layers=3, pad_token_id=50283, bos_token_id=50281, eos_token_id=50282, sep_token_id=50282, cls_token_id=50281,
                        reference_compile=False, attn_implementation=attn)
    return ModernBertModel(c)


def tiny_build(layout, a):
    return TOK, ModernReader(tiny_encoder(seed=a.seed), len(layout.acts), layout.class_sizes, len(layout.tags))


def row(i):
    color, shape = ["red", "blue", None][i % 3], ["circle", "square", "star"][i % 4 % 3]
    text = f"please draw {color or 'one'} {shape} number {i} here" + (" and then keep going with a few more words" if i % 5 == 0 else "")
    words = [w["w"] for w in words_of(text)]
    return {"id": f"r{i}", "text": text, "words": words, "tags": ["O"] * 2 + ["B-target", "I-target"] + ["O"] * (len(words) - 4), "act": ["create", "delete", "connect"][i % 3],
            "classes": {"shape": shape, **({"color": color} if color else {})}}


def message(i):
    text = f"hello there, draw shape {i} now." + " this is a long tail of words" * (i % 4 * 3)
    words = [w["w"] for w in words_of(text)]
    return {"id": f"m{i}", "text": text, "words": words, "tags": ["O", "O", "O"] + ["B"] + ["I"] * (len(words) - 4)}


def make_data(folder, n=22, m=9):
    folder = Path(folder); folder.mkdir(parents=True, exist_ok=True)
    (folder / "train.jsonl").write_text("".join(json.dumps(row(i)) + "\n" for i in range(n)))
    (folder / "cut_train.jsonl").write_text("".join(json.dumps(message(i)) + "\n" for i in range(m)))
    (folder / "heldout.jsonl").write_text(""); (folder / "cut_heldout.jsonl").write_text("")
    (folder / "reader.json").write_text(json.dumps(READER))
    return folder


def args(work, data, **over):
    base = dict(data=Path(data), work=Path(work), seed=0, gpu_uuid=None, epochs=3, lr=1e-3, head_lr=1e-3, batch=4, cut_batch=2, resume=False, expect_manifest=None, overfit_gate=False,
                max_updates=0, gpu_limit_gib=4., checkpoint_minutes=1e6, cache=None, stop_at_ts=float("inf"))
    base.update(over)
    return SimpleNamespace(**base)


def hooks(**over):
    base = dict(build=tiny_build, configure=lambda backend: {}, host_memory=lambda: (GIB_1, 16 * GIB_1))
    base.update(over)
    return F.Hooks(**base)


GIB_1 = 1024 ** 3


def losses(work):
    return [(r["update"], r["request_loss"], r["cut_loss"], r["lr"]) for r in map(json.loads, (Path(work) / "train.jsonl").read_text().splitlines())]


class ClockAfter:
    """A clock that reaches the stop time at the n-th check: one check per step boundary."""
    def __init__(self, n): self.calls, self.n = 0, n

    def __call__(self):
        self.calls += 1
        return 100. if self.calls > self.n else 0.


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        torch.set_num_threads(1)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.dir = Path(self.temp.name)
        self.data = make_data(self.dir / "data"); self.backend = Backend("cpu")

    def tearDown(self): self.temp.cleanup()


class Schedule(Base):
    def test_learning_rate_schedule(self):
        work = self.dir / "w"
        self.assertEqual(F.run(args(work, self.data, epochs=4, head_lr=1e-2), self.backend, hooks()), 0)
        rows = [json.loads(x) for x in (work / "train.jsonl").read_text().splitlines()]
        total = math.ceil(22 / 4) * 4; warm = int(.06 * total)
        self.assertEqual(len(rows), total)
        self.assertEqual(warm, 1)
        for k, r in enumerate(rows):
            want = k / warm if k < warm else (total - k) / (total - warm)
            self.assertAlmostEqual(r["lr"], 1e-3 * want, places=12)
            self.assertAlmostEqual(r["head_lr"], 1e-2 * want, places=12)
        self.assertEqual(rows[0]["lr"], 0.)
        self.assertAlmostEqual(rows[1]["lr"], 1e-3)

    def test_warmup_is_six_percent_of_all_steps(self):
        work = self.dir / "w"
        F.run(args(work, self.data, epochs=20, batch=4, max_updates=12), self.backend, hooks())
        rows = [json.loads(x) for x in (work / "train.jsonl").read_text().splitlines()]
        total = 6 * 20; warm = int(.06 * total)
        self.assertEqual(warm, 7)
        for k, r in enumerate(rows):
            self.assertAlmostEqual(r["lr"], 1e-3 * (k / warm if k < warm else (total - k) / (total - warm)), places=12)
        self.assertLess(rows[-1]["lr"], 1e-3)   # a dry run keeps the full schedule; it does not shrink it to its own length


class Resume(Base):
    def test_resume_gives_the_same_next_losses(self):
        whole = self.dir / "whole"
        self.assertEqual(F.run(args(whole, self.data), self.backend, hooks()), 0)
        want = losses(whole)
        self.assertEqual(len(want), 18)
        for k in (4, 6, 11):   # inside the first epoch, right after an epoch's end, inside the second
            with self.subTest(stop_after=k):
                work = self.dir / f"part{k}"
                self.assertEqual(F.run(args(work, self.data, stop_at_ts=50.), self.backend, hooks(now=ClockAfter(k))), 0)
                self.assertEqual(len(losses(work)), k)
                self.assertFalse((work / "complete.json").exists())
                self.assertEqual(F.run(args(work, self.data, resume=True), self.backend, hooks()), 0)
                self.assertEqual(losses(work), want)
                for name in ("epoch_1.pt", "epoch_3.pt"):
                    a, b = (torch.load(d / name, map_location="cpu", weights_only=False)["model"] for d in (whole, work))
                    for key in a: torch.testing.assert_close(a[key], b[key], atol=0, rtol=0)
                fits = [json.loads(x) for x in (work / "fit.jsonl").read_text().splitlines()]
                self.assertEqual([f["epoch"] for f in fits], [1, 2, 3])

    def test_resume_refuses_changed_settings_and_data(self):
        work = self.dir / "w"
        F.run(args(work, self.data, stop_at_ts=50.), self.backend, hooks(now=ClockAfter(3)))
        with self.assertRaisesRegex(RuntimeError, "Resume contract changed: settings"):
            F.run(args(work, self.data, resume=True, lr=2e-3), self.backend, hooks())
        with open(self.data / "train.jsonl", "a") as f: f.write(json.dumps(row(99)) + "\n")
        with self.assertRaisesRegex(RuntimeError, "Resume contract changed: data"):
            F.run(args(work, self.data, resume=True), self.backend, hooks())

    def test_fresh_run_refuses_a_used_directory(self):
        work = self.dir / "w"
        F.run(args(work, self.data, stop_at_ts=50.), self.backend, hooks(now=ClockAfter(2)))
        with self.assertRaisesRegex(RuntimeError, "empty work directory"):
            F.run(args(work, self.data), self.backend, hooks())


class Stops(Base):
    def test_stop_at_saves_and_exits_cleanly(self):
        work = self.dir / "w"
        self.assertEqual(F.run(args(work, self.data, stop_at_ts=50.), self.backend, hooks(now=ClockAfter(3))), 0)
        stopped = json.loads((work / "stopped.json").read_text())
        self.assertEqual((stopped["reason"], stopped["update"], stopped["checkpoint"]), ("stop-at", 3, True))
        ck = torch.load(work / "checkpoint.pt", map_location="cpu", weights_only=False)
        self.assertEqual(ck["state"]["update"], 3)
        self.assertFalse((work / "complete.json").exists())

    def test_stop_at_parses_local_time(self):
        a = F.parse_args(["--data", "d", "--work", "w", "--seed", "0", "--gpu-uuid", "x", "--stop-at", "2026-11-06 06:50"])
        self.assertEqual(time.localtime(a.stop_at_ts)[:5], (2026, 11, 6, 6, 50))
        self.assertEqual(a.head_lr, a.lr)
        self.assertEqual((a.epochs, a.lr, a.batch, a.cut_batch), (8, 6e-5, 32, 8))

    def assert_failure_keeps_checkpoint(self, work, poison, message):
        def build(layout, a):
            tok, model = tiny_build(layout, a)
            poison(model)
            return tok, model
        with self.assertRaisesRegex(RuntimeError, message):
            F.run(args(work, self.data, epochs=2), self.backend, hooks(build=build))
        stopped = json.loads((work / "stopped.json").read_text())
        self.assertFalse(stopped["checkpoint"]); self.assertIn(message.split()[0], stopped["reason"])
        self.assertFalse((work / "complete.json").exists())
        ck = torch.load(work / "checkpoint.pt", map_location="cpu", weights_only=False)
        self.assertEqual(ck["state"]["update"], 0)   # the failure wrote nothing over the durable checkpoint
        for p in ck["model"].values(): self.assertTrue(torch.isfinite(p).all())
        return stopped

    def test_non_finite_request_loss_stops(self):
        def poison(model):
            forward, calls = model.forward, []

            def nan_forward(input_ids, attention_mask):
                calls.append(1); t, s, c = forward(input_ids, attention_mask)
                return t, (s * float("nan") if len(calls) == 5 else s), c
            model.forward = nan_forward
        self.assertEqual(self.assert_failure_keeps_checkpoint(self.dir / "w", poison, "Non-finite request loss")["update"], 1)   # calls: update 1 (2), the worst-case step (2), then update 2

    def test_non_finite_cut_loss_stops(self):
        def poison(model):
            forward, calls = model.forward, []

            def nan_forward(input_ids, attention_mask):
                calls.append(1); t, s, c = forward(input_ids, attention_mask)
                return t, s, (c * float("nan") if len(calls) == 6 else c)
            model.forward = nan_forward
        self.assert_failure_keeps_checkpoint(self.dir / "w", poison, "Non-finite cut loss")

    def test_non_finite_gradient_stops(self):
        def poison(model):
            calls = []

            def hook(grad):
                calls.append(1)
                return grad * float("nan") if len(calls) == 5 else grad
            model.cut.weight.register_hook(hook)
        self.assert_failure_keeps_checkpoint(self.dir / "w", poison, "non-finite")

    def test_hot_card_stops_cleanly(self):
        for answer, code in (("temperature 90 C", 3), ("hardware slowdown: x", 3)):
            work = self.dir / answer.split()[0]
            self.assertEqual(F.run(args(work, self.data), self.backend, hooks(monitor=lambda u: {"temperature": 90, "active": [], "recovery": "None", "stop": answer})), code)
            stopped = json.loads((work / "stopped.json").read_text())
            self.assertEqual((stopped["reason"], stopped["checkpoint"]), (answer, True))
            self.assertTrue((work / "checkpoint.pt").exists())

    def test_memory_limits_stop_cleanly(self):
        for name, reading in (("rss", (9 * GIB_1, 16 * GIB_1)), ("available", (GIB_1, GIB_1))):
            work = self.dir / name
            self.assertEqual(F.run(args(work, self.data), self.backend, hooks(host_memory=lambda: reading)), 3)
            self.assertIn("host memory", json.loads((work / "stopped.json").read_text())["reason"])

    def test_gpu_status_decides_on_hardware_reasons_only(self):
        def xml(temp="60 C", sw="Not Active", hw="Not Active", thermal="Not Active", brake="Not Active", recovery="None", reasons=True):
            body = f"""<clocks_event_reasons><clocks_event_reason_sw_power_cap>{sw}</clocks_event_reason_sw_power_cap>
                <clocks_event_reason_hw_slowdown>{hw}</clocks_event_reason_hw_slowdown><clocks_event_reason_hw_thermal_slowdown>{thermal}</clocks_event_reason_hw_thermal_slowdown>
                <clocks_event_reason_hw_power_brake_slowdown>{brake}</clocks_event_reason_hw_power_brake_slowdown></clocks_event_reasons>""" if reasons else ""
            return f"<nvidia_smi_log><gpu><gpu_recovery_action>{recovery}</gpu_recovery_action><temperature><gpu_temp>{temp}</gpu_temp></temperature>{body}</gpu></nvidia_smi_log>"
        self.assertIsNone(F.parse_gpu_status(xml())["stop"])
        self.assertEqual(F.parse_gpu_status(xml())["temperature"], 60)
        self.assertIsNone(F.parse_gpu_status(xml(temp="89 C"))["stop"])
        status = F.parse_gpu_status(xml(sw="Active"))
        self.assertIsNone(status["stop"]); self.assertEqual(status["active"], ["sw_power_cap"])   # logged, and no stop
        self.assertIn("temperature 90", F.parse_gpu_status(xml(temp="90 C"))["stop"])
        for over in (dict(hw="Active"), dict(thermal="Active"), dict(brake="Active")):
            self.assertIn("hardware slowdown", F.parse_gpu_status(xml(**over))["stop"])
        self.assertIn("unreadable", F.parse_gpu_status(xml(temp="N/A"))["stop"])
        self.assertIn("unreadable", F.parse_gpu_status(xml(reasons=False))["stop"])
        self.assertIn("recovery", F.parse_gpu_status(xml(recovery="Reset"))["stop"])


class Lock(Base):
    UUID = "GPU-00000000-0000-0000-0000-000000000000"

    def cli(self, work, locks):
        return subprocess.run([sys.executable, "-B", str(HERE.parent / "finetune_modernbert_batched.py"), "--data", str(self.data), "--work", str(work), "--seed", "0", "--gpu-uuid", self.UUID,
                               "--stop-at", "2099-01-01 00:00", "--lock-dir", str(locks)], capture_output=True, text=True, env={k: v for k, v in os.environ.items() if k != "CUDA_VISIBLE_DEVICES"})

    def test_lock_refuses_a_second_run(self):
        locks = self.dir / "locks"
        with RunLock(locks / (self.UUID + ".lock")):
            r = self.cli(self.dir / "second", locks)
        self.assertEqual(r.returncode, 1)
        self.assertIn("already owned", r.stderr); self.assertIn(self.UUID + ".lock", r.stderr)
        # Without the lock the same command gets past it and fails on the made-up GPU, which is what shows that the lock was the refusal above.
        r = self.cli(self.dir / "second", locks)
        self.assertNotIn("already owned", r.stderr); self.assertNotEqual(r.returncode, 0)

    def test_work_lock_refuses_a_second_run(self):
        work = self.dir / "shared"
        with RunLock(work / ".run.lock"):
            r = self.cli(work, self.dir / "locks")
        self.assertIn("already owned", r.stderr); self.assertIn(".run.lock", r.stderr)

    def test_repository_paths_are_refused(self):
        r = subprocess.run([sys.executable, "-B", str(HERE.parent / "finetune_modernbert_batched.py"), "--data", str(self.data), "--work", str(HERE / "scratch-never-created"), "--seed", "0",
                            "--gpu-uuid", self.UUID, "--stop-at", "2099-01-01 00:00", "--lock-dir", str(self.dir / "locks")], capture_output=True, text=True)
        self.assertIn("outside git", r.stderr); self.assertFalse((HERE / "scratch-never-created").exists())


class Manifest(Base):
    def test_expected_manifest(self):
        _, _, manifest = F.data_manifest(self.data)
        self.assertEqual((manifest["requests"], manifest["messages"]), (22, 9))
        good = self.dir / "good.json"; good.write_text(json.dumps(dict(manifest, extra_dirs=["a"])))
        self.assertEqual(F.data_manifest(self.data, good)[2]["extra_dirs"], ["a"])
        bad = json.loads(json.dumps(manifest)); bad["files"]["reader.json"] = "0" * 64
        path = self.dir / "bad.json"; path.write_text(json.dumps(bad))
        with self.assertRaisesRegex(ValueError, "reader.json"): F.data_manifest(self.data, path)
        (self.data / "extra.json").write_text("{}")
        with self.assertRaisesRegex(ValueError, "extra.json"): F.data_manifest(self.data, good)

    def test_held_out_rows_are_refused(self):
        (self.data / "heldout.jsonl").write_text(json.dumps(row(0)) + "\n")
        with self.assertRaisesRegex(ValueError, "held-out"): F.data_manifest(self.data)


class Padding(Base):
    def batch(self, local_attention=8):
        layout = Layout(READER)
        short, long = message(1), message(3)   # 7 words against about 70: most of the short row's padding is beyond every window
        x, _, ps = encode(TOK, [short, long], layout, 512, "cpu", {"O": 0, "B": 1, "I": 2})
        return x, ps

    def model(self, attn="sdpa", local_attention=8):
        layout = Layout(READER)
        return ModernReader(tiny_encoder(attn, local_attention=local_attention), len(layout.acts), layout.class_sizes, len(layout.tags)).eval()

    def test_padding_is_masked(self):
        x, ps = self.batch()
        n_short = len(ps[0]["ids"])
        self.assertGreater(x["input_ids"].shape[1] - n_short, 20)
        changed = x["input_ids"].clone(); changed[0, n_short:] = 1234
        for attn in ("sdpa", "eager"):
            m = self.model(attn)
            with torch.no_grad(): a, b = m(**x), m(changed, x["attention_mask"])
            torch.testing.assert_close(a[0][0, :n_short], b[0][0, :n_short], atol=0, rtol=0)
            torch.testing.assert_close(a[1], b[1], atol=0, rtol=0)
            torch.testing.assert_close(a[2][0, :n_short], b[2][0, :n_short], atol=0, rtol=0)
            # A check of the check: a changed real token does change the logits.
            real = x["input_ids"].clone(); real[0, 2] = 1234
            with torch.no_grad(): c = m(real, x["attention_mask"])
            self.assertFalse(torch.equal(a[1], c[1]))

    def test_padding_is_masked_under_bf16_and_stays_finite(self):
        x, ps = self.batch()
        n_short = len(ps[0]["ids"])
        changed = x["input_ids"].clone(); changed[0, n_short:] = 1234
        m = self.model()
        with torch.no_grad(), torch.autocast("cpu", dtype=torch.bfloat16): a, b = m(**x), m(changed, x["attention_mask"])
        for t in a: self.assertTrue(torch.isfinite(t.float()).all())
        torch.testing.assert_close(a[1].float(), b[1].float(), atol=0, rtol=0)
        torch.testing.assert_close(a[0][0, :n_short].float(), b[0][0, :n_short].float(), atol=0, rtol=0)

    def test_gradients_stay_finite_with_padding_beyond_every_window(self):
        x, _ = self.batch()
        m = self.model(); m.train()
        with torch.autocast("cpu", dtype=torch.bfloat16): t, s, c = m(**x)
        (t.float().sum() + s.float().sum() + c.float().sum()).backward()
        for name, p in m.named_parameters():
            if p.grad is not None: self.assertTrue(torch.isfinite(p.grad).all(), name)

    def test_sdpa_and_eager_agree(self):
        x, ps = self.batch()
        n_short = len(ps[0]["ids"])
        sdpa, eager = self.model("sdpa"), self.model("eager")
        eager.load_state_dict(sdpa.state_dict())
        with torch.no_grad(): a, b = sdpa(**x), eager(**x)
        torch.testing.assert_close(a[1], b[1], atol=1e-4, rtol=1e-4)
        torch.testing.assert_close(a[0][0, :n_short], b[0][0, :n_short], atol=1e-4, rtol=1e-4)
        torch.testing.assert_close(a[0][1], b[0][1], atol=1e-4, rtol=1e-4)
        torch.testing.assert_close(a[2][1], b[2][1], atol=1e-4, rtol=1e-4)


class Fit(Base):
    def test_epoch_files_and_fit_lines(self):
        work = self.dir / "w"
        self.assertEqual(F.run(args(work, self.data, epochs=2), self.backend, hooks()), 0)
        self.assertEqual(sorted(p.name for p in work.glob("epoch_*.pt")), ["epoch_1.pt", "epoch_2.pt"])
        ep = torch.load(work / "epoch_1.pt", map_location="cpu", weights_only=False)
        self.assertEqual(set(ep), {"model", "epoch", "update", "metadata"}); self.assertEqual((ep["epoch"], ep["update"]), (1, 6))
        ck = torch.load(work / "checkpoint.pt", map_location="cpu", weights_only=False)
        self.assertIn("model", ck); self.assertEqual(ck["state"]["update"], 12)
        for p in ("encoder_config/config.json", "tokenizer/tokenizer.json", "complete.json", "environment.json", "preflight.json"): self.assertTrue((work / p).exists(), p)
        complete = json.loads((work / "complete.json").read_text())
        self.assertTrue(complete["complete"]); self.assertTrue(complete["full_schedule"])
        fits = [json.loads(x) for x in (work / "fit.jsonl").read_text().splitlines()]
        self.assertEqual([f["epoch"] for f in fits], [1, 2])
        self.assertEqual(fits[0]["rows"], 22)
        d = fits[0]["keys"]["color"]
        self.assertEqual(d["val_n"] + d["none_n"], 22)
        self.assertGreater(d["val_n"], 0); self.assertGreater(d["none_n"], 0)
        for key in ("act", "word_tags"): self.assertTrue(0 <= fits[0][key] <= 1)

    def test_max_updates_is_marked_as_partial(self):
        work = self.dir / "w"
        self.assertEqual(F.run(args(work, self.data, max_updates=2), self.backend, hooks()), 0)
        complete = json.loads((work / "complete.json").read_text())
        self.assertFalse(complete["full_schedule"]); self.assertEqual(complete["max_updates"], 2)
        self.assertEqual(json.loads((work / "fit.jsonl").read_text().splitlines()[0])["partial"], True)

    def test_measure_counts_rows_with_and_without_a_value(self):
        layout = Layout(READER)
        tiny = ModernReader(tiny_encoder(), len(layout.acts), layout.class_sizes, len(layout.tags))
        # Every head says "none": it must be right on all the rows without a value and on none of those with one.
        with torch.no_grad():
            tiny.classes.weight.zero_(); tiny.classes.bias.fill_(0.)
            for s, c in zip(layout.offsets[:-1], layout.class_sizes): tiny.classes.bias[s - len(layout.acts)] = 5.
        rows = [row(i) for i in range(12)]
        fit = F.measure(tiny, TOK, rows, layout, self.backend)
        for key, value_rows in (("color", sum("color" in r["classes"] for r in rows)), ("shape", 12)):
            d = fit["keys"][key]
            self.assertEqual((d["val_n"], d["val_ok"], d["said_none_on_value"]), (value_rows, 0, value_rows))
            self.assertEqual((d["none_n"], d["none_ok"]), (12 - value_rows, 12 - value_rows))
        self.assertFalse(F.gate_verdict(fit)[0])


class Gate(Base):
    def test_verdict_rejects_a_head_that_says_none(self):
        good = dict(value_rows=10, keys={"color": dict(val_n=10, val_ok=10, none_n=190, none_ok=190), "shape": dict(val_n=0, val_ok=0, none_n=200, none_ok=200)})
        self.assertEqual(F.gate_verdict(good), (True, []))
        none = dict(value_rows=10, keys={"color": dict(val_n=10, val_ok=0, none_n=190, none_ok=190)})
        passed, failures = F.gate_verdict(none); self.assertFalse(passed); self.assertIn("color", failures[0])
        over = dict(value_rows=10, keys={"color": dict(val_n=10, val_ok=10, none_n=190, none_ok=150)})
        self.assertFalse(F.gate_verdict(over)[0])
        self.assertFalse(F.gate_verdict(dict(value_rows=0, keys={"color": dict(val_n=0, val_ok=0, none_n=200, none_ok=200)}))[0])
        self.assertFalse(F.gate_verdict(dict(value_rows=100, keys={"color": dict(val_n=100, val_ok=98, none_n=100, none_ok=100)}))[0])
        self.assertTrue(F.gate_verdict(dict(value_rows=100, keys={"color": dict(val_n=100, val_ok=99, none_n=100, none_ok=100)}))[0])

    def test_gate_exit_codes(self):
        work = self.dir / "w"
        code = F.run(args(work, self.data, overfit_gate=True, lr=3e-3, head_lr=3e-3), self.backend, hooks())
        report = json.loads((work / "overfit_gate.json").read_text())
        self.assertEqual(code, 0 if report["passed"] else 1)
        self.assertEqual(report["rows"], 22)
        # Cannot learn at lr 0: the same gate fails, with exit 1. A gate that always passed would fail here.
        work = self.dir / "w0"
        self.assertEqual(F.run(args(work, self.data, overfit_gate=True, lr=0., head_lr=0.), self.backend, hooks()), 1)
        self.assertFalse(json.loads((work / "overfit_gate.json").read_text())["passed"])
        # A gate before a run may share its work directory.
        F.run(args(work, self.data, max_updates=1), self.backend, hooks())


class Export(Base):
    """The whole export on a tiny run, with a layout the published model does not have: it takes any head layout."""
    def test_export_reads_through_node_with_another_head_layout(self):
        R = json.loads(json.dumps(READER)); R["classes"].append(["scale", ["none", "smaller", "bigger"]]); R["tags"] += ["B-to", "I-to"]
        (self.data / "reader.json").write_text(json.dumps(R))
        work = self.dir / "w"
        self.assertEqual(F.run(args(work, self.data, epochs=2, max_updates=7), self.backend, hooks()), 0)
        script = [sys.executable, "-B", str(HERE / "arm_export.py"), "--work", str(work), "--data", str(self.data)]
        refused = subprocess.run(script + ["--out", str(self.dir / "refused")], capture_output=True, text=True)
        self.assertNotEqual(refused.returncode, 0); self.assertIn("dry run", refused.stderr); self.assertFalse((self.dir / "refused").exists())
        out = self.dir / "arm"
        done = subprocess.run(script + ["--out", str(out), "--allow-partial"], capture_output=True, text=True)
        self.assertIn(done.returncode, (0, 2), done.stderr[-3000:])   # an untrained tiny model has near ties; 2 lists them
        receipt = json.loads((out / "arm_receipt.json").read_text())
        self.assertEqual(receipt["python_ort_vs_node"]["fixtures"], 19 + 2 * 11)   # the 19 of the published model, and 11 more texts at both caps
        self.assertGreaterEqual(receipt["torch_vs_node"]["texts"], 12)   # the data here has few distinct lengths
        self.assertEqual(receipt["torch_vs_node"]["counts"]["pieces"]["agree"], receipt["torch_vs_node"]["texts"])
        self.assertEqual(receipt["passed"], done.returncode == 0)
        self.assertEqual(receipt["passed"], not receipt["torch_vs_node"]["differences"])
        config = json.loads((out / "config.json").read_text())
        self.assertEqual(config["reader"]["classes"], R["classes"]); self.assertEqual(config["reader"]["tags"], R["tags"])
        self.assertEqual(config["reader"]["tokenization"], "wordwise-bpe-prefix-space-v1")
        self.assertEqual(config["reader"]["cut"]["max_length"], 512); self.assertEqual(config["reader"]["max_length"], 128)
        self.assertFalse(config["reader"]["training_provenance"]["completed"]["full_schedule"])
        self.assertEqual(config["transformers.js_config"]["use_external_data_format"], len(receipt["shards"]))
        for p in out.rglob("*"):
            if p.is_file() and p.name.startswith("model_quantized"): self.assertLess(p.stat().st_size, 90 * 1024 ** 2 + 1)
        conversion = json.loads((out / "conversion.json").read_text())
        self.assertEqual(conversion["forbidden_operators"], {})
        import onnx
        graph = onnx.load(out / "onnx/model_quantized.onnx", load_external_data=False)
        self.assertFalse({n.op_type for n in graph.graph.node} & {"DynamicQuantizeLinear", "MatMulInteger", "QLinearMatMul", "QuantizeLinear"})
        again = subprocess.run(script + ["--out", str(out), "--allow-partial"], capture_output=True, text=True)
        self.assertIn("new output", again.stderr)


if __name__ == "__main__": unittest.main()
