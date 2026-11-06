// pilot_score.mjs: a blind labelling pilot on nl_a rows, scored against the two teachers' labels of nl_a (Opus 5.5 medium, gpt-6.1-sol high).
//   node pilot_score.mjs OUT.json NAME=FILE.jsonl ...
// Per annotator:
//   - per requested action (score_arm.mjs scorePart, every request executed): its wires read as a reader's requests, against Opus (primary)
//     and against either teacher; and the GPT labels read the same way, against Opus, for the same rows (the teachers' own agreement here);
//   - by engine effect, per message: its wires and each teacher's played on the row's setup (parity_lib run / diffs / same, loose
//     tolerance; answers compared): same drawing and answers as Opus, as GPT, as either; split by whether the row needs the drawing
//     (training/neural/parity/nl_needs.py's word check is not imported: a row needs it here when a teacher's wires hold a mention or a
//     name the message does not write);
//   - the Qwen line format: share of its wires that write and read back losslessly (lines_format.mjs), and share that the shipped JSON
//     contract can express (format_oracle.mjs rules are not imported; the count is of wires using a description key outside the contract's);
//   - form differences that leave the effect the same (same drawing and answers as Opus, but other canonical wires): what a model that
//     copies its labels would see as two answers to one message.
// Rows whose text differs from the saved text, or whose fields were changed, are reported and scored as given.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { K, goldProgram, run, diffs, same, answers, cp, LOOSE } from '../../neural/parity/parity_lib.mjs';
import { loadSets, contextNames } from '../../neural/parity/sets.mjs';
import { buildRecord, seenFunction, startSystem, refsOf } from '../../neural/parity/arm_lib.mjs';
import { scorePart } from '../../neural/parity/score_arm.mjs';
import { writeLines, parseLines } from './lines_format.mjs';

const seen = seenFunction({ exact: JSON.parse(readFileSync(process.env.HOME + '/.cache/diagram-vss-modernbert/arms/baseline/train-data/trigger_inventory.json', 'utf8')).triggers });
const [out, ...pairs] = process.argv.slice(2);
const items = new Map(loadSets(['nl_a'])[0].items.map(it => [it.id, it]));
const DESC = new Set(['quantifier', 'shape', 'color', 'notcolor', 'recency']);

function nodesOf(wires, text) {
  const located = wires.map(w => ({ span: text.includes(w.span) ? w.span : '', type: w.type, args: w.args }));
  try { return K.parse(goldProgram(located)); } catch (e) { return null; }
}
function runOf(nodes, wires, text) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const mains = nodes.filter(n => n.type !== 'mention').map(n => {
    const i = /^w(\d+)$/.exec(n.id), w = i ? wires[+i[1] - 1] : null, k = w && w.span ? text.indexOf(w.span) : -1;
    const refs = [...new Set(Object.values(n.args || {}).flatMap(refsOf))];
    return { node: n, mentions: refs.map(id => byId.get(id)).filter(x => x && x.type === 'mention'), span: k >= 0 ? [k, k + w.span.length] : [0, 0], src: k >= 0 ? w.span : '', f: null, act: null, truncated: false, wireId: n.id, dependencies: [] };
  });
  return { reader: 'pilot', cut: 'own', mains, allNodes: nodes, unread: [], cutInfo: null };
}
function effect(setup, wires) {
  const { s, errors } = startSystem(setup); const nodes = wires.length ? (() => { try { return K.parse(goldProgram(wires)); } catch { return null; } })() : [];
  if (nodes == null) return { state: null, ans: null, err: 1 };
  const r = run(s, nodes); return { state: s.world.state, ans: JSON.stringify(answers(r)), err: (r.errors || []).length };
}
const sameEffect = (a, b, it) => a.state && b.state && same(diffs(b.state, a.state, LOOSE, { base: cp(startSystem(it.setup).s.world.state), text: it.text })) && a.ans === b.ans;
const needsDrawing = (it, wires) => wires.some(w => Object.values(w.args).some(v => { const s = String(v); if (s.includes('mention(')) return true; return ['target', 'from', 'to', 'anchor'].some(k => w.args[k] === v) && s.split(',').some(p => p && p !== '$new' && !it.text.toLowerCase().includes(p.toLowerCase())); }));

const res = { annotators: {} };
let gptRecs = null;
for (const pair of pairs) {
  const [name, file] = pair.split('=');
  const rows = readFileSync(file, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  const recs = [], gRecs = [], eff = { rows: 0, as_opus: 0, as_gpt: 0, as_either: 0, need: { rows: 0, as_either: 0, as_opus: 0, as_gpt: 0 }, plain: { rows: 0, as_either: 0, as_opus: 0, as_gpt: 0 }, form_only_diff: 0, engine_errors: 0 };
  let wires = 0, lines_ok = 0, json_desc_out = 0, textChanged = 0;
  for (const r of rows) {
    const it = items.get(r.id); if (!it) continue;
    if (r.text !== it.text) textChanged++;
    const ws = Array.isArray(r.wires) ? r.wires : [];
    wires += ws.length;
    for (const w of ws) { const back = parseLines(writeLines([w])); if (!back.bad.length && back.wires.length === 1 && JSON.stringify(back.wires[0].args) === JSON.stringify(Object.fromEntries(Object.entries(w.args).map(([k, v]) => [k, String(v)])))) lines_ok++;
      if (Object.values(w.args).some(v => /mention\(/.test(String(v)) && String(v).match(/([a-z]+)=/g).some(kv => !DESC.has(kv.slice(0, -1))))) json_desc_out++; }
    const nodes = nodesOf(ws, it.text) || [];
    const rec = buildRecord({ ...it }, runOf(nodes, ws, it.text), { seen, artifactsKey: 'pilot:' + name }); rec.reader = 'pilot-' + name; recs.push(rec);
    if (!gptRecs) { const gn = nodesOf(it.altWires || [], it.text) || []; const g = buildRecord({ ...it }, runOf(gn, it.altWires || [], it.text), { seen, artifactsKey: 'pilot:gpt' }); g.reader = 'pilot-gpt'; gRecs.push(g); }
    if (it.unreliable) continue;
    const e = effect(it.setup, ws), eo = effect(it.setup, it.wires), eg = effect(it.setup, it.altWires || []);
    eff.rows++; eff.engine_errors += e.err ? 1 : 0;
    const so = sameEffect(e, eo, it), sg = sameEffect(e, eg, it); eff.as_opus += so; eff.as_gpt += sg; eff.as_either += so || sg;
    const nd = needsDrawing(it, it.wires) || needsDrawing(it, it.altWires || []); const b = nd ? eff.need : eff.plain; b.rows++; b.as_either += so || sg; b.as_opus += so; b.as_gpt += sg;
    if (so) { const a = nodes.filter(n => n.type !== 'mention').length, o = (nodesOf(it.wires, it.text) || []).filter(n => n.type !== 'mention').length; const canon = ws.map(w => JSON.stringify(w.type) + JSON.stringify(w.args)).sort().join('|') !== it.wires.map(w => JSON.stringify(w.type) + JSON.stringify(w.args)).sort().join('|'); if (canon) eff.form_only_diff++; }
  }
  if (!gptRecs) gptRecs = gRecs;
  const sc = scorePart(recs, null, null, { engine: false }).part;
  const pick = v => v && v.today && v.today.all_executed;
  res.annotators[name] = { rows: rows.length, text_changed: textChanged, wires, per_action: { opus: pick(sc.views.primary || sc.views.opus), either: pick(sc.views.either) }, effect: eff,
    lines_roundtrip_share: wires ? +(lines_ok / wires).toFixed(4) : null, json_contract_description_out: json_desc_out };
}
const g = scorePart(gptRecs, null, null, { engine: false }).part;
res.gpt_labels_against_opus_same_rows = g.views.primary ? g.views.primary.today.all_executed : (g.views.opus ? g.views.opus.today.all_executed : null);
writeFileSync(out, JSON.stringify(res, null, 1));
for (const [n, a] of Object.entries(res.annotators)) console.log(n.padEnd(16), `per action vs Opus ${a.per_action.opus ? (100 * a.per_action.opus.right_share).toFixed(1) + '% (' + a.per_action.opus.right + '/' + a.per_action.opus.requested + ', wrong ' + a.per_action.opus.wrong + ', extras ' + a.per_action.opus.extras + ')' : '-'}`,
  `| either ${a.per_action.either ? (100 * a.per_action.either.right_share).toFixed(1) + '%' : '-'}`, `| effect: as Opus ${a.effect.as_opus}/${a.effect.rows}, as GPT ${a.effect.as_gpt}, either ${a.effect.as_either}; needs drawing ${a.effect.need.as_either}/${a.effect.need.rows} (as Opus ${a.effect.need.as_opus}, as GPT ${a.effect.need.as_gpt}), plain ${a.effect.plain.as_either}/${a.effect.plain.rows}; same effect other form ${a.effect.form_only_diff}; engine errors ${a.effect.engine_errors}`,
  `| lines round-trip ${a.lines_roundtrip_share}, text changed ${a.text_changed}`);
console.log('gpt labels vs opus, same rows:', JSON.stringify(res.gpt_labels_against_opus_same_rows));
