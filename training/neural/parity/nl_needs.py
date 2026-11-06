"""nl_needs.py: what the labels of a natural-language set need from a reader: the words of the message alone, or the drawing too? A word check, as what_programs_need.mjs.
  python3 training/neural/parity/nl_needs.py training/sketch/llm_bench/nl_a/opus [training/sketch/llm_bench/nl_a/gpt ...]
A wire needs the drawing when a name-valued key holds a name the message does not write, or a mention holds a colour, shape, size or label the message does not write."""
import collections, glob, json, re, sys
NAME_KEYS = ('target', 'from', 'to', 'anchor', 'anchor2', 'members', 'linked')
words = lambda s: set(re.findall(r'[^\W_]+', str(s).lower()))


def parts(v):
    out, d, cur = [], 0, ''
    for ch in str(v):
        if ch == '(': d += 1
        if ch == ')': d -= 1
        if ch == ',' and d == 0: out.append(cur.strip()); cur = ''
        else: cur += ch
    out.append(cur.strip())
    return [p for p in out if p]


for folder in sys.argv[1:]:
    c = collections.Counter(); by = collections.defaultdict(collections.Counter); keys = collections.Counter(); acts = collections.Counter()
    for f in sorted(glob.glob(folder + '/*.jsonl')):
        for line in open(f, encoding='utf8'):
            r = json.loads(line); W = words(r['text'])
            for w in r.get('wires', []):
                a = w['args']; need = False; acts[a.get('action') or a.get('ask') or w['type']] += 1
                for k, v in a.items():
                    keys[k] += 1
                    if k not in NAME_KEYS: continue
                    for p in parts(v):
                        if p == '$new': continue
                        if p.startswith('mention('):
                            for kv in parts(p[len('mention('):-1]):
                                mk, _, mv = kv.partition('=')
                                if mk.strip() in ('quantifier', 'recency'): continue
                                if not words(mv) <= W: need = True
                        elif not words(p) <= W: need = True
                c['wires'] += 1; by[r.get('kind')]['wires'] += 1
                if need: c['need the drawing'] += 1; by[r.get('kind')]['need'] += 1
            c['rows'] += 1
    print(f"{folder}: {c['rows']} rows, {c['wires']} wires; need the drawing {c['need the drawing']} = {100 * c['need the drawing'] / max(c['wires'], 1):.1f}%")
    print('   by kind:', ', '.join(f"{k} {v['need']}/{v['wires']}" for k, v in sorted(by.items(), key=lambda x: -x[1]['wires'])))
    print('   actions:', ' '.join(f'{k}:{v}' for k, v in acts.most_common(22)))
    print('   keys:', ' '.join(f'{k}:{v}' for k, v in keys.most_common(26)))
