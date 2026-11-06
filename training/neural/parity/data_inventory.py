"""data_inventory.py: which annotated data exists, how much of it holds the built-in examples' text, and what the first ModernBERT run trained on."""
import json, glob, os, re, collections, pathlib
REPO = str(pathlib.Path(__file__).resolve().parents[3])
S = REPO + '/training/sketch'
opus = json.load(open(REPO + '/docs/sop-translations/claude-opus-5-5/manifest.json'))
ex = {}
for e in opus['entries']:
    ex.setdefault(re.sub(r'\s+', ' ', e['input'].strip().lower()), []).append(e['id'])
print('example messages', len(opus['entries']), 'distinct', len(ex))
EXTRAS = "opus_train_a opus_train_b opus_train_c opus_train_d opus_gen_1 opus_gen_2 synth_rules synth_rules_ops synth_rules_ext ops_formulations opus_ext_1 synth_combo".split()
trained = ['llm_train/' + x for x in ['sonnet_msg', 'haiku_msg', 'sonnet_msg2', 'haiku_msg2', 'sonnet_long', 'sonnet_short', 'haiku_short'] + EXTRAS] + ['llm_bench/fresh1/sonnet', 'llm_bench/fresh1/haiku', 'llm_bench/sonnet_spans', 'llm_bench/haiku_spans']
rows = []
tot = collections.Counter()
allm = {}
for base in ['llm_train', 'llm_bench', 'llm_bench/fresh1', 'llm_bench/fresh2']:
    for d in sorted(os.listdir(os.path.join(S, base))):
        p = os.path.join(S, base, d)
        if not os.path.isdir(p) or d == 'texts': continue
        if base == 'llm_bench' and d in ('fresh1', 'fresh2'): continue
        fs = [f for f in glob.glob(p + '/*.jsonl')]
        n = w = ctx = hit = wordsum = 0
        scene = 0
        for f in fs:
            for line in open(f, encoding='utf8'):
                line = line.strip()
                if not line: continue
                try: m = json.loads(line)
                except Exception: continue
                if 'text' not in m: continue
                n += 1; ws = m.get('wires') or []; w += len(ws)
                wordsum += len(m['text'].split())
                if m.get('names'): ctx += 1
                k = re.sub(r'\s+', ' ', m['text'].strip().lower())
                if k in ex: hit += 1
                allm.setdefault(k, set()).add(base + '/' + d)
        if n:
            rows.append((base + '/' + d, n, w, round(wordsum / n, 1), ctx, hit, base + '/' + d in trained))
print(f"{'folder':38} {'msgs':>6} {'wires':>6} {'w/msg':>6} {'names':>6} {'in examples':>11} first_run")
for r in rows:
    print(f"{r[0]:38} {r[1]:6} {r[2]:6} {r[3]:6} {r[4]:6} {r[5]:11} {'yes' if r[6] else ''}")
print('total msgs', sum(r[1] for r in rows), 'wires', sum(r[2] for r in rows), ' trained msgs', sum(r[1] for r in rows if r[6]), 'wires', sum(r[2] for r in rows if r[6]))
inany = {k: allm[k] for k in ex if k in allm}
print('example messages with identical text in some data folder', len(inany), 'of', len(ex))
c = collections.Counter(tuple(sorted(v)) for v in inany.values())
print(c.most_common(12))
print('examples whose text occurs in the first run training folders', sum(1 for k, v in inany.items() if any(x in trained for x in v)))
# what arm M2's data holds of the keys the shipped layout lacks
held = collections.Counter(); rows = 0
for d in ['llm_train/scenes_r3', 'llm_train/scenes_r3b', 'llm_train/opus_r3_gaps']:
    for f in glob.glob(os.path.join(S, d, '*.jsonl')):
        for line in open(f, encoding='utf8'):
            if not line.strip(): continue
            for w in json.loads(line).get('wires', []):
                rows += 1; a = w.get('args', {})
                for k in ('width', 'height', 'distance', 'fill', 'layer'):
                    if k in a: held[k] += 1
                if a.get('shape') == 'any': held['shape=any'] += 1
                if a.get('position') in ('onTop', 'inside'): held['position=' + a['position']] += 1
                for v in a.values():
                    if isinstance(v, str) and 'mention(' in v:
                        for k in ('size=', 'label=', 'layer='):
                            if k in v: held['mention with ' + k[:-1]] += 1
print('arm M2 data,', rows, 'wires:', dict(held))
# scenes: how many distinct scene ids in the scene folders
for d in ['llm_train/scenes_r3', 'llm_train/scenes_r3b', 'llm_bench/scenes_test']:
    dom = collections.Counter()
    for f in glob.glob(os.path.join(S, d, '*.jsonl')):
        for line in open(f, encoding='utf8'):
            line = line.strip()
            if line:
                m = json.loads(line); dom[m.get('domain')] += 1
    print(d, len(dom), list(dom.items())[:24])
