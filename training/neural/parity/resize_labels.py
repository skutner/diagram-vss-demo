"""resize_labels.py: annotated resize requests with a word for smaller and no scale. The engine's resize without a scale grows the shape, so a reader trained on these rows
reads "make it smaller" as bigger. The scene harness and gold_vs_opus.mjs add scale=0.67 to the labels for this reason; a reader's decode has no such rule.
  python3 training/neural/parity/resize_labels.py [ROLES_FOLDER]    (default ~/.cache/diagram-vss-modernbert/roles: the first run's rows)"""
import collections, json, os, re, sys
d = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/.cache/diagram-vss-modernbert/roles')
SMALL = re.compile(r'\b(shrink|smaller|tinier|reduce|less big|scale down|downsize)', re.I)
c = collections.Counter(); ex = []
for line in open(os.path.join(d, 'train.jsonl'), encoding='utf8'):
    r = json.loads(line)
    if r['act'] != 'resize': continue
    c['resize rows'] += 1
    g = r['gold']; sm = bool(SMALL.search(r['text']))
    k = ('a word for smaller' if sm else 'no such word') + (', with scale' if 'scale' in g else ', size word' if 'size' in g else ', no scale')
    c[k] += 1
    if sm and 'scale' not in g and 'size' not in g and len(ex) < 6: ex.append((r['text'][:60], g))
for k, v in c.most_common(): print(f'{k}: {v}')
for e in ex: print('  e.g.', e)
