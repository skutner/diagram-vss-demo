#!/usr/bin/env python3
"""test_bare_view.py: tests of bare_view.py (VSSBERT_SHORT_COMMANDS_PLAN.md section 11). Run: python3 training/sketch/shortcmd/test_bare_view.py
Never calls check_file.py (it writes into training/sketch/synth/)."""
import hashlib, json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bare_view as B

SCRIPT = os.path.join(HERE, "bare_view.py")


def row(i, text, span, names=("Start",), form="create", narration=True, trigger="add"):
    return {"id": f"st1-{i:05d}", "domain": "d", "names": list(names), "text": text,
            "wires": [{"span": span, "trigger": trigger, "type": "command", "args": {"action": "create", "shape": "circle"}}],
            "meta": {"form": form, "narration": narration}}


def write_folder(d, rows, name="msg_01.jsonl", raw=None):
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name), "w", encoding="utf8") as f:
        if raw is not None:
            f.write(raw)
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def run(args):
    return subprocess.run([sys.executable, SCRIPT] + args, capture_output=True, text=True)


class T(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def test_span_becomes_text_and_meta(self):
        view, c = B.make_view([row(1, "cool. now add a black circle", "add a black circle")], "st1b")
        self.assertEqual(len(view), 1)
        v = view[0]
        self.assertEqual(v["text"], "add a black circle")
        self.assertEqual(v["id"], "st1b-00001")
        self.assertEqual(v["meta"], {"form": "create", "narration": False, "from": "st1-00001"})
        self.assertEqual(v["wires"], row(1, "x add a black circle", "add a black circle")["wires"])
        self.assertEqual(v["names"], ["Start"])

    def test_span_equal_to_text_stays_one_row(self):
        view, c = B.make_view([row(2, "add a red square", "add a red square", narration=False)], "st1b")
        self.assertEqual([v["text"] for v in view], ["add a red square"])
        self.assertEqual(c["kept"], 1)

    def test_empty_names(self):
        view, _ = B.make_view([row(3, "hi add a dot", "add a dot", names=())], "st1b")
        self.assertEqual(view[0]["names"], [])

    def test_non_ascii_name_unchanged(self):
        r = row(4, "ok then connect Zoë to Start", "connect Zoë to Start", names=("Zoë", "Start"))
        view, _ = B.make_view([r], "st1b")
        self.assertEqual(view[0]["text"], "connect Zoë to Start")
        self.assertEqual(view[0]["names"], ["Zoë", "Start"])
        # written as UTF-8, not escaped
        p = os.path.join(self.d, "in"); write_folder(p, [r])
        out = os.path.join(self.d, "o.jsonl")
        self.assertEqual(run([p, "--id-prefix", "st1b", "--out", out]).returncode, 0)
        self.assertIn("Zoë", open(out, encoding="utf8").read())

    def test_long_narrated_text(self):
        pre = "well " * 60
        r = row(5, pre + "add a blue star", "add a blue star")
        self.assertGreaterEqual(len(r["text"]), 300)
        view, _ = B.make_view([r], "st1b")
        self.assertEqual(view[0]["text"], "add a blue star")

    def test_dedup_by_text_keeps_first(self):
        rows = [row(1, "a. add a green dot", "add a green dot"), row(2, "b. Add  a green dot", "Add  a green dot"), row(3, "add a pink dot", "add a pink dot")]
        view, c = B.make_view(rows, "st1b")
        self.assertEqual([v["id"] for v in view], ["st1b-00001", "st1b-00003"])
        self.assertEqual(c["duplicate_text"], 1)

    def test_exclude_spans(self):
        rows = [row(1, "x add a green dot", "add a green dot"), row(2, "add a pink dot", "add a pink dot")]
        view, c = B.make_view(rows, "sr2b", frozenset({B.norm("ADD a green  dot")}))
        self.assertEqual([v["text"] for v in view], ["add a pink dot"])
        self.assertEqual(c["excluded"], 1)

    def test_multi_wire_row_skipped_and_counted(self):
        r = row(1, "add a dot and a line", "add a dot")
        r["wires"].append(dict(r["wires"][0]))
        view, c = B.make_view([r], "st1b")
        self.assertEqual(view, [])
        self.assertEqual(c["skipped_multi_wire"], 1)

    def test_span_not_in_text_stops(self):
        with self.assertRaises(SystemExit):
            B.make_view([row(1, "add a dot", "add a line")], "st1b")

    def test_idempotent_bytes(self):
        p = os.path.join(self.d, "in"); write_folder(p, [row(i, f"w. add a dot {i}", f"add a dot {i}") for i in range(1, 30)])
        o1, o2 = os.path.join(self.d, "1.jsonl"), os.path.join(self.d, "2.jsonl")
        r1, r2 = run([p, "--id-prefix", "st1b", "--out", o1]), run([p, "--id-prefix", "st1b", "--out", o2])
        self.assertEqual((r1.returncode, r2.returncode), (0, 0))
        self.assertEqual(hashlib.sha256(open(o1, "rb").read()).hexdigest(), hashlib.sha256(open(o2, "rb").read()).hexdigest())
        self.assertEqual(r1.stdout, r2.stdout)

    def test_malformed_line_names_file_and_line(self):
        p = os.path.join(self.d, "in"); write_folder(p, [row(1, "add a dot", "add a dot")], raw="{not json}\n")
        # the bad line is line 1 of msg_01.jsonl
        r = run([p, "--id-prefix", "st1b", "--out", os.path.join(self.d, "o.jsonl")])
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("msg_01.jsonl:1", r.stderr)

    def test_exclude_folder_end_to_end(self):
        a, b = os.path.join(self.d, "a"), os.path.join(self.d, "b")
        write_folder(a, [row(1, "add a dot", "add a dot", narration=False)])   # a bare view folder: its texts are spans
        write_folder(b, [row(1, "z add a dot", "add a dot"), row(2, "z add a line", "add a line")])
        o = os.path.join(self.d, "o.jsonl")
        r = run([b, "--id-prefix", "sr2b", "--out", o, "--exclude-spans", a])
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([json.loads(l)["text"] for l in open(o, encoding="utf8")], ["add a line"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
