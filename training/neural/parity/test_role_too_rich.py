"""make_roles.py ROLE_TOO_RICH=context: a name-role whose gold value holds a mention(...) beside another part is learned as context (no description
heads, no B / I tags from it); without the switch it stays fill=description with the first mention (as before). One case of each form (two mentions;
mentions and $new; a name beside a mention; colour / shape mentions, since the base layout has no desc:label head), both ways,
and controls that the switch must not touch. Labels a fixture folder with --also (the layout comes from the training rows; about a minute per build).
Run: python3 training/neural/parity/test_role_too_rich.py      (M4_NEURAL_DIR=folder: the make_roles.py of that folder)"""
import json, os, subprocess, sys, tempfile, unittest
from pathlib import Path

NEURAL = Path(os.environ.get("M4_NEURAL_DIR") or Path(__file__).resolve().parents[1])
W = lambda span, args, trigger: {"span": span, "trigger": trigger, "type": "command", "args": args}
MSGS = [
    {"id": "rr-1", "names": [], "text": "delete all the squares and the red triangle", "wires": [W("delete all the squares and the red triangle", {"action": "delete", "target": "mention(quantifier=all,shape=square),mention(color=red,shape=triangle)"}, "delete")]},
    {"id": "rr-2", "names": [], "text": "add a barn called Barn, then run a fence from it to the blue circle and the green square and the barn",
     "wires": [W("add a barn called Barn", {"action": "create", "shape": "rectangle", "name": "Barn"}, "add"),
               W("run a fence from it to the blue circle and the green square and the barn", {"action": "connect", "from": "Gate", "to": "mention(color=blue,shape=circle),mention(color=green,shape=square),$new"}, "run")]},
    {"id": "rr-3", "names": ["armoury"], "text": "put a trap between the armoury and the red square", "wires": [W("put a trap between the armoury and the red square", {"action": "create", "shape": "triangle", "name": "Trap", "position": "below", "anchor": "armoury,mention(color=red,shape=square)"}, "put")]},
    {"id": "rr-4", "names": [], "text": "delete the red triangle", "wires": [W("delete the red triangle", {"action": "delete", "target": "mention(color=red,shape=triangle)"}, "delete")]},
    {"id": "rr-5", "names": ["Start", "Done"], "text": "connect Start to Done", "wires": [W("connect Start to Done", {"action": "connect", "from": "Start", "to": "Done"}, "connect")]},
]


def build(tmp, data, rich):
    out = Path(tmp) / ("rich" if rich else "plain")
    env = {k: v for k, v in os.environ.items() if k not in ("ROLE_TOO_RICH", "EXTRA_DIRS", "NUM_WORDS", "LABEL_FIXES", "IMPLIED_SCALE")}
    if rich: env["ROLE_TOO_RICH"] = "context"
    subprocess.run([sys.executable, "-B", str(NEURAL / "make_roles.py"), "--all", "--out", str(out), "--also", str(data)], check=True, env=env, stdout=subprocess.DEVNULL)
    rows = [json.loads(l) for l in open(out / ("also_" + str(data).replace("/", "__") + ".jsonl"))]
    return {(r["id"], r["text"]): r for r in rows}


class RoleTooRich(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(); data = Path(cls.tmp.name) / "data"; data.mkdir()
        (data / "msg_01.jsonl").write_text("".join(json.dumps(m) + "\n" for m in MSGS))
        cls.plain, cls.rich = build(cls.tmp.name, data, False), build(cls.tmp.name, data, True)

    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    def row(self, which, mid, i=0):
        rows = [r for (k, _), r in which.items() if k == mid]
        return rows[i]

    def check(self, mid, key, i=0, tagged_without=False):
        p, r = self.row(self.plain, mid, i), self.row(self.rich, mid, i)
        self.assertEqual(p["classes"]["fill:" + key], "description", "without the switch: as before")
        self.assertTrue(any(k.startswith(("desc:", "desc2:")) for k in p["classes"]), "without the switch: the first mention on the desc heads")
        if tagged_without: self.assertTrue(any(t.endswith("-" + key) for t in p["tags"]))
        self.assertEqual(r["classes"]["fill:" + key], "context")
        self.assertFalse(any(k.startswith(("desc:", "desc2:")) for k in r["classes"]), "under the switch: no description heads from it")
        self.assertFalse(any(t.endswith("-" + key) for t in r["tags"]), "under the switch: no B / I tag from it")
        for k in set(p["classes"]) | set(r["classes"]):
            if not k.startswith(("fill:" + key, "desc:", "desc2:")): self.assertEqual(p["classes"].get(k), r["classes"].get(k), k)

    def test_two_mentions(self): self.check("rr-1", "target")
    def test_mentions_and_new(self): self.check("rr-2", "to", i=1)
    def test_name_beside_a_mention(self): self.check("rr-3", "anchor", tagged_without=True)

    def test_controls_unchanged(self):
        for mid in ("rr-4", "rr-5"):
            self.assertEqual(self.row(self.plain, mid), self.row(self.rich, mid), mid)
        self.assertEqual(self.row(self.rich, "rr-2", 1)["classes"]["fill:from"], self.row(self.plain, "rr-2", 1)["classes"]["fill:from"])


if __name__ == "__main__":
    unittest.main()
