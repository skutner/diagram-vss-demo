"""arm_summary.py: the lines of an arm's evaluation that the run log needs. python3 arm_summary.py EVAL_DIR"""
import glob, json, os, sys
ev = sys.argv[1]
fmt = lambda x, k: '-' if x is None or x.get(k) is None else (f"{100 * x[k]:.1f}%" if isinstance(x[k], float) and k.endswith('share') else str(round(x[k], 1)) if isinstance(x[k], float) else str(x[k]))
for f in sorted(glob.glob(os.path.join(ev, 'cal-*.score.json'))):
    s = json.load(open(f)); print(f"== {os.path.basename(f)} (threshold {s.get('threshold_cost10')})")
    for name, parts in s['sets'].items():
        for part, x in parts.items():
            if not isinstance(x, dict) or 'views' not in x or x.get('use') != 'evaluation': continue   # 'fit' and 'calibration-part' are not results
            for view, v in x['views'].items():
                t = v.get('today', {}); a = t.get('all_executed', {}); g = t.get('at_threshold', {})
                d = v.get('direction', {}).get('at_threshold') or {}
                print(f"{name}/{part} [{view}] req {a.get('requested')}: all right {fmt(a, 'right_share')} wrong {a.get('wrong')} not done {a.get('not_done')} extras {a.get('extras')}"
                      f" | gate right {g.get('right')} wrong {g.get('wrong')} asked {g.get('asked')} unread {g.get('unread')} extras {g.get('extras')} cost {fmt(g, 'cost_score')} auroc {fmt(g, 'auroc')}"
                      f" | with direction: gate right {d.get('right')} wrong {d.get('wrong')}")
            ta = x.get('teachers_agreement')
            if ta and 'gpt_scored_against_opus' in ta: print(f"   teachers: gpt against opus {fmt(ta['gpt_scored_against_opus']['today'], 'right_share')}")
            for k in ('nothing_to_do', 'paraphrase'):
                if x.get(k): print(f"   {k}: {json.dumps(x[k])[:300]}")
for f in sorted(glob.glob(os.path.join(ev, 'minus_*.json'))):
    c = json.load(open(f)); print(f"== {os.path.basename(f)}: A {c['a']['reader']} minus B {c['b']['reader']} ({os.path.basename(c['b']['file'])})")
    for key, comp in c.get('comparisons', {}).items():
        for var, v in comp.get('variants', {}).items():
            if (var.endswith('today.gate') or var.endswith('today.all')) and var.split('.')[0] in ('gold', 'opus', 'teacher_opus'):
                ci = v.get('ci95') or v.get('ci95_messages')
                cis = f"[{ci[0]:+.1f}, {ci[1]:+.1f}]" if ci else f"[interval unusable: {v.get('ci95_reason', 'none')}]"
                print(f"   {key} {var}{' (headline)' if var.startswith(('opus.', 'gold.')) else ''}: A {v['a']:.1f} B {v['b']:.1f} difference {v['difference']:+.1f} {cis}" + (f" units {v['units']} {v.get('unit', '')}" if v.get('units') else ''))
