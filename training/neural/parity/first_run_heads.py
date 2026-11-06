"""first_run_heads.py: per-head errors of the first ModernBERT run on its frozen fresh2+short3 records (paired with gold spans)."""
import json, collections, os
P = os.path.expanduser('~/.cache/diagram-vss-modernbert/weight-only-records-baef6de.jsonl')
rows = [json.loads(l) for l in open(P)]
print('messages', len(rows), 'gold', sum(r['gold'] for r in rows))
out = collections.Counter(); keyerr = collections.Counter(); keyseen = collections.Counter(); ex = collections.defaultdict(list)
byact = collections.defaultdict(collections.Counter)
for r in rows:
    for p in r['modernbert']:
        out[p['o']] += 1
        byact[p['pa']][p['o']] += 1
        w = p.get('want')
        if not w: continue
        got = p['got']
        for k, v in w.items():
            keyseen[k] += 1
            if got.get(k, '∅') != v:
                keyerr[k] += 1
                if len(ex[k]) < 3: ex[k].append((p['src'][:70], 'got', got.get(k, '∅'), 'want', v))
print(out)
print('right/wrong/extra by proposed act (top 22):')
for a, c in sorted(byact.items(), key=lambda x: -sum(x[1].values()))[:22]:
    n = sum(c.values()); print(f'  {a:24} n={n:4} right {c["right"]:4} ({100*c["right"]/n:5.1f}%) wrong {c["wrong"]:4} extra {c["extra"]:4}')
print('per-key error among paired proposals (key: wrong/seen):')
for k, n in keyseen.most_common(30):
    print(f'  {k:12} {keyerr[k]:4}/{n:4} = {100*keyerr[k]/n:5.1f}%   e.g. {ex[k][:2]}'[:230])
