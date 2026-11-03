"""Offline CPU checks; no pretrained model weights are fetched or trained."""
import json
from pathlib import Path
import tempfile
import unittest

import torch
from transformers import AutoTokenizer, ModernBertConfig, ModernBertModel

from finetune_modernbert import ModernReader, save_checkpoint
from modernbert_tokenization import prepare, batch, words_of

HERE = Path(__file__).resolve().parent
TOKENIZER = Path.home() / ".cache/diagram-vss-modernbert/tokenizer"


def tiny():
    c = ModernBertConfig(vocab_size=32, hidden_size=16, intermediate_size=24,
                        num_hidden_layers=2, num_attention_heads=2, max_position_embeddings=512,
                        local_attention=16, global_attn_every_n_layers=2,
                        pad_token_id=0, bos_token_id=1, eos_token_id=2, reference_compile=False,
                        attn_implementation="eager")
    return ModernReader(ModernBertModel(c), 3, [2, 3], 5)


class Contract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tok = AutoTokenizer.from_pretrained(TOKENIZER, local_files_only=True)

    def test_alignment_fixtures(self):
        f = json.loads((HERE / "fixtures/modernbert_alignment.json").read_text())
        self.assertEqual(self.tok.encode(""), f["specials"])
        self.assertEqual(self.tok.pad_token_id, f["pad_token_id"])
        for r in f["cases"]:
            p = prepare(self.tok, r["text"], r["limit"])
            p["first"] = [[k, v] for k, v in p["first"].items()]
            self.assertEqual(p, r["prepared"])
        _, arrays = batch(self.tok, f["batch"]["texts"], f["batch"]["limit"])
        self.assertEqual(arrays, f["batch"]["arrays"])

    def test_whole_word_truncation_utf16(self):
        p = prepare(self.tok, "😀 extraordinarilyLongCompound", 3)
        self.assertTrue(p["truncated"])
        self.assertEqual(len(p["ids"]), 2)
        self.assertEqual(p["unreadFrom"], 0)
        self.assertEqual(words_of("😀 Á")[1], {"w": "A", "start": 3, "end": 4})
        with self.assertRaises(ValueError): prepare(self.tok, "", 1)

    def test_padding_and_all_head_gradients(self):
        torch.manual_seed(0)
        m = tiny().eval()
        ids = torch.tensor([[1, 4, 2, 0, 0], [1, 5, 6, 7, 2]])
        mask = torch.tensor([[1, 1, 1, 0, 0], [1, 1, 1, 1, 1]])
        with torch.no_grad():
            a = m(ids, mask)
            changed = ids.clone(); changed[0, 3:] = 9
            b = m(changed, mask)
        self.assertEqual([list(x.shape) for x in a], [[2, 5, 5], [2, 8], [2, 5, 3]])
        for x, y in zip(a, b):
            torch.testing.assert_close(x[0, :3] if x.ndim == 3 else x[0],
                                       y[0, :3] if y.ndim == 3 else y[0], atol=1e-6, rtol=1e-6)
        m.train(); sum(x.square().mean() for x in m(ids, mask)).backward()
        from finetune_modernbert import gradients
        self.assertTrue(all(gradients(m).values()))

    def test_checkpoint_partial_accumulation(self):
        torch.manual_seed(0)
        a = tiny().eval()
        opt = torch.optim.AdamW(a.parameters(), lr=3e-5, foreach=False)
        sch = torch.optim.lr_scheduler.LambdaLR(opt, lambda _: 1)
        ids, mask = torch.tensor([[1, 4, 2]]), torch.ones((1, 3), dtype=torch.long)
        for _ in range(2): (sum(x.square().mean() for x in a(ids, mask)) / 3).backward()
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "checkpoint.pt"
            save_checkpoint(p, a, opt, sch, {"accumulated": 2, "request_pos": 2}, {})
            ck = torch.load(p, weights_only=False)
        b = tiny().eval(); b.load_state_dict(ck["model"])
        bo = torch.optim.AdamW(b.parameters(), lr=3e-5, foreach=False); bo.load_state_dict(ck["optimizer"])
        for n, p in b.named_parameters(): p.grad = ck["gradients"].get(n)
        self.assertEqual(ck["state"]["accumulated"], 2)
        for m, o in ((a, opt), (b, bo)):
            (sum(x.square().mean() for x in m(ids, mask)) / 3).backward(); o.step()
        for x, y in zip(a.parameters(), b.parameters()): torch.testing.assert_close(x, y, atol=0, rtol=0)

    def test_native_eager_onnx_and_whole_tensor_chunks(self):
        import numpy as np
        import onnxruntime as ort
        from export_modernbert import pack_external
        m = tiny().eval()
        ids = torch.tensor([[1, 4, 2, 0], [1, 5, 6, 2]])
        mask = ids.ne(0).long()
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); source = p / "raw.onnx"
            torch.onnx.export(m, (ids, mask), str(source), dynamo=False, opset_version=17,
                              input_names=["input_ids", "attention_mask"], output_names=["token_logits", "seq_logits", "cut_logits"],
                              dynamic_axes={"input_ids": {0: "batch", 1: "sequence"}, "attention_mask": {0: "batch", 1: "sequence"},
                                            "token_logits": {0: "batch", 1: "sequence"}, "seq_logits": {0: "batch"}, "cut_logits": {0: "batch", 1: "sequence"}})
            chunks = pack_external(source, p / "model_quantized.onnx", chunk_bytes=4096)
            self.assertGreater(len(chunks), 1)
            self.assertTrue(all((p / c).stat().st_size <= 4096 for c in chunks))
            session = ort.InferenceSession(str(p / "model_quantized.onnx"), providers=["CPUExecutionProvider"])
            for size in (3, 4, 9):
                x = torch.tensor([[1] + [4] * (size - 2) + [2]]); a = torch.ones_like(x)
                with torch.no_grad(): want = m(x, a)
                got = session.run(None, {"input_ids": x.numpy(), "attention_mask": a.numpy()})
                for g, w in zip(got, want): np.testing.assert_allclose(g, w.numpy(), atol=1e-3, rtol=1e-3)
            with self.assertRaisesRegex(ValueError, "exceeds 90 MiB"):
                pack_external(source, p / "too_small.onnx", chunk_bytes=1024)


if __name__ == "__main__": unittest.main()
