"""tables.py: the capability tables of MODERNBERT_PARITY_PLAN.md from the outputs of readers_vs_teachers.mjs, teachers_agree.mjs and what_programs_need.mjs.
  python3 training/neural/parity/tables.py AGREE.json NEEDS.json name=READER.jsonl ...
Every request executed, the teacher's drawing before each turn, loose = 60 px and size ratio 1.30, right = the same effect as Opus or GPT."""
import collections, json, sys

agree = {r['id']: r for r in json.load(open(sys.argv[1]))}
flags = json.load(open(sys.argv[2]))
readers = [a.split('=', 1) for a in sys.argv[3:]]
data = {n: {r['id']: r for r in map(json.loads, open(f))} for n, f in readers}


def cat(f):
    if f['none']: return 'no request'
    if f['name'] or f['desc']: return 'needs the drawing or earlier messages'
    if f['out']: return 'keys the shipped ModernBERT has no head for'
    if f['multi']: return 'several wires'
    return 'one wire, from the words'


def row(title, ids):
    cells = [f"{sum(1 for i in ids if agree[i]['loose']):4} {100 * sum(1 for i in ids if agree[i]['loose']) / max(len(ids), 1):5.1f}%"]
    for n, _ in readers:
        k = sum(1 for i in ids if data[n][i]['looseO'] or data[n][i]['looseG'])
        cells.append(f"{k:4} {100 * k / max(len(ids), 1):5.1f}%")
    print(f"{title:44} {len(ids):5}  " + '  '.join(cells))


print(f"{'':44} {'turns':>5}  " + '  '.join(f'{x:>11}' for x in ['Opus-GPT'] + [n for n, _ in readers]))
allids = list(agree)
for c in ['one wire, from the words', 'several wires', 'keys the shipped ModernBERT has no head for', 'needs the drawing or earlier messages', 'no request']:
    row(c, [i for i in allids if cat(flags[i]) == c])
row('ALL', allids)
print()
row('held out (never trained by any arm)', [i for i in allids if agree[i]['role'] == 'held_out'])
TEST = ('living', 'town', 'grancard', 'playground')
row('  of which the 4 test scenes', [i for i in allids if agree[i]['example'] in TEST])
row('  of which the 11 scenarios and 13 quick', [i for i in allids if agree[i]['role'] == 'held_out' and agree[i]['example'] not in TEST])
row('training scenes (unseen by the shipped models)', [i for i in allids if agree[i]['role'] == 'training_scene'])
ho = [i for i in allids if agree[i]['role'] == 'held_out']
print('\nheld out by category:')
for c in ['one wire, from the words', 'several wires', 'keys the shipped ModernBERT has no head for', 'needs the drawing or earlier messages', 'no request']:
    row(c, [i for i in ho if cat(flags[i]) == c])
for n, _ in readers:
    rows = list(data[n].values())
    print(f"{n}: turns with nothing read {sum(1 for r in rows if not r['n'])}, turns with an engine error {sum(1 for r in rows if r['errs'])}")
