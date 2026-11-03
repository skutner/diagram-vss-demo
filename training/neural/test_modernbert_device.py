"""Offline device guards; --require-cuda runs the mandatory native CUDA probe.

The native probe is deliberately an explicit nonzero failure on a non-CUDA host.
It does not fetch pretrained weights or run the full training model.
"""
import argparse
from contextlib import ExitStack
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

import torch
import finetune_modernbert as trainer


UUID = "GPU-00000000-0000-0000-0000-000000000001"


class DeviceTests(unittest.TestCase):
    def test_cuda_allocator_exact_fraction_and_no_mps_configuration(self):
        backend = trainer.Backend("cuda", {"gpu_uuid": UUID})
        props = mock.Mock(uuid=UUID, total_memory=6*trainer.GIB)
        with mock.patch.object(torch, "mps", None), mock.patch.object(sys, "version_info", (3, 12)), \
             mock.patch.object(torch, "__version__", "2.15.0+cu132"), \
             mock.patch.object(torch.cuda, "is_available", return_value=True), \
             mock.patch.object(torch.cuda, "device_count", return_value=1), \
             mock.patch.object(torch.cuda, "get_device_properties", return_value=props), \
             mock.patch.object(torch.cuda, "get_device_capability", return_value=(8, 6)), \
             mock.patch.object(torch.cuda, "set_per_process_memory_fraction") as fraction:
            for actual in (UUID, UUID.removeprefix("GPU-")):
                with self.subTest(actual=actual):
                    props.uuid = actual; fraction.reset_mock()
                    self.assertEqual(backend.configure()["cuda_allocator_limit"], 4*trainer.GIB)
                    self.assertEqual(backend.identity["gpu_uuid"], UUID)
                    fraction.assert_called_once_with(4/6, 0)
            for actual in (UUID[:-1] + "2", UUID[4:-1] + "2", "not-a-uuid", "GPU-not-a-uuid"):
                with self.subTest(rejected=actual):
                    props.uuid = actual; fraction.reset_mock()
                    with self.assertRaisesRegex(RuntimeError, "physical UUID"): backend.configure()
                    fraction.assert_not_called()

    def test_cuda_dispatch_never_uses_mps(self):
        b = trainer.Backend("cuda", {"gpu_uuid": UUID})
        with mock.patch.object(torch, "mps", None), mock.patch.object(torch.cuda, "synchronize") as sync, \
             mock.patch.object(torch.cuda, "get_rng_state", return_value=torch.tensor([1], dtype=torch.uint8)), \
             mock.patch.object(torch.cuda, "set_rng_state") as restore, \
             mock.patch.object(torch.cuda, "mem_get_info", return_value=(1, 2)), \
             mock.patch.object(torch.cuda, "memory_allocated", return_value=3), \
             mock.patch.object(torch.cuda, "memory_reserved", return_value=4), \
             mock.patch.object(torch.cuda, "max_memory_allocated", return_value=5), \
             mock.patch.object(torch.cuda, "max_memory_reserved", return_value=6):
            b.synchronize(); state = trainer.rng_state(b); trainer.restore_rng(state, b)
            self.assertEqual(b.memory(), dict(cuda_free=1, cuda_total=2, cuda_allocated=3, cuda_reserved=4,
                                             cuda_peak_allocated=5, cuda_peak_reserved=6))
            sync.assert_called_once_with(0); restore.assert_called_once()
        with self.assertRaisesRegex(RuntimeError, "RNG backend/UUID"):
            trainer.restore_rng(state, trainer.Backend("cuda", {"gpu_uuid": UUID + "2"}))

    def test_exact_resource_boundaries(self):
        for rss, available, allowed in [(8*trainer.GIB-1, 2*trainer.GIB, True),
                                        (8*trainer.GIB, 2*trainer.GIB, True),
                                        (8*trainer.GIB+1, 2*trainer.GIB, False),
                                        (8*trainer.GIB, 2*trainer.GIB-1, False),
                                        (8*trainer.GIB, 2*trainer.GIB+1, True)]:
            with self.subTest(rss=rss, available=available), mock.patch.object(trainer, "memory", return_value=dict(rss=rss, available=available)):
                if allowed: trainer.check_resources(1799.999, True)
                else:
                    with self.assertRaisesRegex(RuntimeError, "Resource stop"): trainer.check_resources(0, True)
        with mock.patch.object(trainer, "memory", return_value=dict(rss=0, available=2*trainer.GIB)):
            for seconds, pilot in [(1800, True), (14400, False)]:
                with self.assertRaisesRegex(RuntimeError, "wall-time"): trainer.check_resources(seconds, pilot)
            trainer.check_resources(14399.999, False)

    def test_uuid_selection_before_initialization(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(torch.cuda, "is_initialized", return_value=False):
            self.assertEqual(trainer.cuda_selection(UUID), UUID)
            for value in ("0", UUID + "," + UUID, "", "GPU-../../bad"):
                with mock.patch.dict(os.environ, {"CUDA_VISIBLE_DEVICES": value}):
                    with self.assertRaises(RuntimeError): trainer.cuda_selection(UUID)
        with mock.patch.dict(os.environ, {"CUDA_VISIBLE_DEVICES": UUID}), mock.patch.object(torch.cuda, "is_initialized", return_value=True):
            with self.assertRaisesRegex(RuntimeError, "initialized"): trainer.cuda_selection(UUID)

    def test_two_process_lock_contention_and_release(self):
        with tempfile.TemporaryDirectory() as d:
            lock = Path(d) / "device.lock"
            script = "from pathlib import Path; from finetune_modernbert import RunLock; import sys\ntry:\n with RunLock(Path(sys.argv[1])): pass\nexcept RuntimeError: sys.exit(19)\n"
            env = dict(os.environ, PYTHONPATH=str(Path(trainer.__file__).parent))
            with trainer.RunLock(lock):
                denied = subprocess.run([sys.executable, "-c", script, str(lock)], env=env, capture_output=True, text=True)
                self.assertEqual(denied.returncode, 19, denied.stderr)
            allowed = subprocess.run([sys.executable, "-c", script, str(lock)], env=env, capture_output=True, text=True)
            self.assertEqual(allowed.returncode, 0, allowed.stderr)
            self.assertTrue(lock.exists())

    def test_health_fails_closed_before_allocation(self):
        def xml(recovery="None", processes=""):
            return f"<nvidia_smi_log><driver_version>test</driver_version><gpu><uuid>{UUID}</uuid><product_name>NVIDIA GeForce RTX 3060 Laptop GPU</product_name><gpu_recovery_action>{recovery}</gpu_recovery_action><processes>{processes}</processes></gpu></nvidia_smi_log>"
        for recovery, processes, valid in [("None", "", True), ("Reset", "", False),
                                            ("None", "<process_info><type>C</type></process_info>", False)]:
            with mock.patch.object(trainer.subprocess, "run", return_value=mock.Mock(stdout=xml(recovery, processes))):
                if valid: self.assertEqual(trainer.cuda_health(UUID)["gpu_uuid"], UUID)
                else:
                    with self.assertRaises(RuntimeError): trainer.cuda_health(UUID)

    def test_resume_rejection_preserves_metadata_before_build(self):
        with tempfile.TemporaryDirectory() as d:
            work, data = Path(d) / "run", Path(d) / "data"
            work.mkdir(); data.mkdir()
            (data / "reader.json").write_text(json.dumps(dict(acts=["a"], tags=["O"], classes=[])))
            environment = work / "environment.json"; environment.write_bytes(b"original metadata\n")
            checkpoint = work / "checkpoint.pt"
            torch.save({"metadata": {"device": "mps"}}, checkpoint)
            original = checkpoint.read_bytes()
            args = argparse.Namespace(work=work, data=data, resume=True, prepare_data=False)
            backend = trainer.Backend("cuda", {"gpu_uuid": UUID})
            with mock.patch.object(backend, "configure", return_value=backend.identity), \
                 mock.patch.object(trainer, "data_manifest", return_value=([], [], {})), \
                 mock.patch.object(trainer, "build", side_effect=AssertionError("must not allocate model")):
                with self.assertRaisesRegex(RuntimeError, "Resume contract changed"):
                    trainer.run(args, backend)
            self.assertEqual(environment.read_bytes(), b"original metadata\n")
            self.assertEqual(checkpoint.read_bytes(), original)
        current = {k: "same" for k in trainer.IDENTITY_KEYS}
        for key in ("device", "gpu_uuid", "versions", "torch_build", "numerics", "sources"):
            previous = dict(current, **{key: "changed"})
            with self.assertRaisesRegex(RuntimeError, key): trainer.validate_resume(current, previous)

    def test_mock_cuda_rng_error_keeps_durable_checkpoint(self):
        model = torch.nn.Linear(2, 2)
        opt = torch.optim.AdamW(model.parameters(), foreach=False)
        sch = torch.optim.lr_scheduler.LambdaLR(opt, lambda _: 1)
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "checkpoint.pt"; path.write_bytes(b"durable")
            with mock.patch.object(torch.cuda, "get_rng_state", side_effect=RuntimeError("CUDA fault")):
                with self.assertRaisesRegex(RuntimeError, "CUDA fault"):
                    trainer.save_checkpoint(path, model, opt, sch, {}, {}, trainer.Backend("cuda"))
            self.assertEqual(path.read_bytes(), b"durable")


def native_cuda_probe(uuid):
    """Native kernels, masking, FP32, allocator and dropout continuation; no skips."""
    uuid = trainer.cuda_selection(uuid)
    with trainer.RunLock(Path.home() / ".cache/diagram-vss-modernbert/locks" / (uuid + ".lock")):
        backend = trainer.Backend("cuda", trainer.cuda_health(uuid))
        with ExitStack() as forbidden:
            for name in ("get_rng_state", "set_rng_state", "synchronize", "manual_seed", "current_allocated_memory", "driver_allocated_memory"):
                forbidden.enter_context(mock.patch.object(torch.mps, name, side_effect=AssertionError("CUDA probe accessed MPS: " + name)))
            identity = backend.configure(); backend.seed(0)
            from transformers import ModernBertConfig, ModernBertModel
            def model():
                config = ModernBertConfig(vocab_size=32, hidden_size=16, intermediate_size=24,
                    num_hidden_layers=2, num_attention_heads=2, max_position_embeddings=512,
                    local_attention=16, global_attn_every_n_layers=2, pad_token_id=0,
                    bos_token_id=1, eos_token_id=2, reference_compile=False, attn_implementation="eager")
                encoder = ModernBertModel(config); encoder.gradient_checkpointing_enable()
                return trainer.ModernReader(encoder, 3, [2, 3], 5).to("cuda").float()
            a = model().eval()
            ids = torch.tensor([[1, 4, 2, 0, 0], [1, 5, 6, 7, 2]], device="cuda")
            mask = ids.ne(0).long(); changed = ids.clone(); changed[0, 3:] = 9
            with torch.no_grad():
                want, got = a(ids, mask), a(changed, mask)
            for x, y in zip(want, got):
                assert x.dtype == torch.float32
                torch.testing.assert_close(x[0, :3] if x.ndim == 3 else x[0], y[0, :3] if y.ndim == 3 else y[0], atol=1e-6, rtol=1e-6)
            a.train()
            opt = torch.optim.AdamW(a.parameters(), lr=3e-5, foreach=False)
            sch = torch.optim.lr_scheduler.LambdaLR(opt, lambda _: 1)
            sum(x.square().mean() for x in a(ids, mask)).backward()
            trainer.gradients(a)
            with tempfile.TemporaryDirectory() as d:
                path = Path(d) / "checkpoint.pt"
                trainer.save_checkpoint(path, a, opt, sch, {"accumulated": 1}, identity, backend)
                checkpoint = torch.load(path, map_location="cpu", weights_only=False)
            b = model().train(); b.load_state_dict(checkpoint["model"])
            bo = torch.optim.AdamW(b.parameters(), lr=3e-5, foreach=False); bo.load_state_dict(checkpoint["optimizer"])
            for name, p in b.named_parameters(): p.grad = checkpoint["gradients"][name].to("cuda")
            for current, optimizer in ((a, opt), (b, bo)):
                trainer.restore_rng(checkpoint["rng"], backend)
                sum(x.square().mean() for x in current(ids, mask)).backward(); optimizer.step()
            for x, y in zip(a.parameters(), b.parameters()): torch.testing.assert_close(x, y, atol=0, rtol=0)
            backend.synchronize()
            fraction = torch.cuda.get_per_process_memory_fraction(0)
            assert abs(fraction - 4*trainer.GIB/identity["cuda_total"]) < 1e-7
            assert torch.get_float32_matmul_precision() == "highest"
            assert not torch.backends.cuda.matmul.allow_tf32 and not torch.backends.cudnn.allow_tf32
            print(json.dumps({"native_cuda_probe": "passed", "identity": identity, "memory": backend.memory()}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--require-cuda", action="store_true")
    parser.add_argument("--gpu-uuid")
    args, remaining = parser.parse_known_args()
    if args.require_cuda: native_cuda_probe(args.gpu_uuid)
    else: unittest.main(argv=[sys.argv[0], *remaining])
