// teachers_by_writer.mjs: the two teachers' agreement on nl_a per requested action, split by who wrote the texts and by kind (gpt-6.1-sol
// labels read as a reader's requests against the Opus labels, score_arm.mjs scorePart, every request executed). Which writer's texts are
// harder to read the same way is evidence for choosing training writers (texts have no right answer of their own).
//   node teachers_by_writer.mjs OUT.json
import { readFileSync, writeFileSync } from 'node:fs';
import { K, goldProgram } from '../../neural/parity/parity_lib.mjs';
import { loadSets } from '../../neural/parity/sets.mjs';
import { buildRecord, seenFunction, refsOf } from '../../neural/parity/arm_lib.mjs';
import { scorePart } from '../../neural/parity/score_arm.mjs';
const seen = seenFunction({ exact: JSON.parse(readFileSync(process.env.HOME + '/.cache/diagram-vss-modernbert/arms/baseline/train-data/trigger_inventory.json', 'utf8')).triggers });
const recs = [];
for (const it of loadSets(['nl_a'])[0].items) {
  const ws = it.altWires || []; let nodes = [];
  try { nodes = ws.length ? K.parse(goldProgram(ws.map(w => ({ span: w.span, type: w.type, args: w.args })))) : []; } catch { nodes = []; }
  const byId = new Map(nodes.map(n => [n.id, n]));
  const mains = nodes.filter(n => n.type !== 'mention').map(n => { const i = +n.id.slice(1) - 1, w = ws[i], k = w ? it.text.indexOf(w.span) : -1, refs = Object.values(n.args || {}).flatMap(refsOf);
    return { node: n, mentions: refs.map(id => byId.get(id)).filter(x => x && x.type === 'mention'), span: k >= 0 ? [k, k + w.span.length] : [0, 0], src: w ? w.span : '', f: null, act: null, truncated: false, wireId: n.id, dependencies: [] }; });
  const r = buildRecord(it, { reader: 'gpt-labels', cut: 'own', mains, allNodes: nodes, unread: [], cutInfo: null }, { seen, artifactsKey: 'gpt-labels' }); recs.push(r);
}
const out = {};
const sc = rs => { const p = scorePart(rs, null, null, { engine: false }).part; const v = p.views.opus || p.views.primary || p.views.gold, a = v.today.all_executed; return { messages: rs.length, requested: a.requested, right: a.right, wrong: a.wrong, extras: a.extras, right_share: a.right_share }; };
for (const w of [...new Set(recs.map(r => r.writer))]) out['writer:' + w] = sc(recs.filter(r => r.writer === w));
for (const k of [...new Set(recs.map(r => r.kind))].sort()) out['kind:' + k] = sc(recs.filter(r => r.kind === k));
out.all = sc(recs);
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(26), `${v.right}/${v.requested} = ${(100 * v.right_share).toFixed(1)}%  wrong ${v.wrong} extras ${v.extras}  (${v.messages} msgs)`);
