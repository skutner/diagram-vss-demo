// lines_oracle.mjs: Q0.4 of QWEN3_FINETUNE_PLAN.md. The gold of nl_a and of every training folder, written in the line format
// (lines_format.mjs writeLines), read back by the reader's own parser and validator (lines_reader.mjs readOutput, toNodes) as the page will
// run them. A gold request passes when it is not held by the validator and reads back to the same wires (type and every key=value, as
// strings). Losses are listed by cause (the first error of the request). Run with the number table off (D1's plain rule) and on.
// The keys per act and per description are learned from the gold of --keys (default: the F0 list, Q1's training data) and written to
// --keys-out. The plan's pass rule: >= 99.5% of the gold requests pass, on nl_a and on every training folder.
//   node lines_oracle.mjs OUT.json [--keys F0|ALL] [--keys-out FILE] [--folders F0|ALL]
// Also scored on nl_a (both parts), every request executed, by score_arm.mjs scorePart: the format's ceiling through this validator.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { K, touched } from '../../neural/parity/parity_lib.mjs';
import { loadSets, contextNames } from '../../neural/parity/sets.mjs';
import { buildRecord, seenFunction, startSystem, playGold } from '../../neural/parity/arm_lib.mjs';
import { scorePart } from '../../neural/parity/score_arm.mjs';
import { writeLines } from './lines_format.mjs';
import { learnKeys, lineSpec, readOutput, toNodes, readerContext } from './lines_reader.mjs';
import { F0, M2, NL, SK } from './lists.mjs';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const out = A[0], keysFrom = opt('keys', 'ALL'), keysOut = opt('keys-out', null), foldersOpt = opt('folders', 'ALL');
const sha = b => createHash('sha256').update(b).digest('hex');
const list = n => n === 'F0' ? F0 : n === 'ALL' ? [...F0, ...M2, ...NL] : n.split(',');
const filesOf = d => { const base = /nl_p[^/]*$/.test(d) ? resolve(SK, d, 'opus') : resolve(SK, d); const fs = readdirSync(base).filter(f => f.endsWith('.jsonl')), mb = fs.filter(f => /^(msg|batch)_/.test(f)); return (mb.length ? mb : fs).sort().map(f => resolve(base, f)); };
const rowsOf = d => filesOf(d).flatMap(f => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))).filter(r => Array.isArray(r.wires));
const hashes = {};
const folderRows = new Map();
for (const d of [...new Set([...list(keysFrom), ...list(foldersOpt)])]) { folderRows.set(d, rowsOf(d)); for (const f of filesOf(d)) hashes[f] = sha(readFileSync(f)); }

// the keys are learned from the gold the arms train on: with L2's overlay applied (a resize it names gets its scale), as make_examples.mjs
const fixes = new Map(); for (const l of readFileSync(resolve(ROOT, 'training/qwen/data/LABEL_FIXES_L2.jsonl'), 'utf8').split('\n').filter(Boolean)) { const f = JSON.parse(l); fixes.set(f.id + '#' + f.wire, f.scale); }
const withFixes = r => r.wires.map((w, i) => fixes.has(r.id + '#' + i) ? { ...w, args: { ...w.args, scale: String(fixes.get(r.id + '#' + i)) } } : w);
const learned = learnKeys(list(keysFrom).flatMap(d => folderRows.get(d).map(withFixes)));
if (keysOut) writeFileSync(keysOut, JSON.stringify({ from: list(keysFrom), ...learned }, null, 1) + '\n');
const S0 = K.createSystem(), spec = lineSpec(S0.engine, learned);

const argsKey = a => JSON.stringify(Object.entries(a).map(([k, v]) => [k, String(v)]));
function check(text, names, wires, numberWords, labels = []) {
  const raw = writeLines(wires), v = readOutput(spec, raw, 'stop', { text, names, labels }, { numberWords });
  const losses = [];
  wires.forEach((w, i) => {
    const R = v.requests[i];
    if (!R) return losses.push('the line is missing on read-back');
    if (R.blocked) return losses.push(R.errors[0].replace(/=\S+/g, '=…').replace(/\[[^\]]*\]/g, '[…]').replace(/^\S+ is neither/, '… is neither').slice(0, 90));
    if (R.type !== w.type || argsKey(R.args) !== argsKey(w.args)) return losses.push('reads back to other wires');
  });
  let nodes = null; try { nodes = toNodes(spec, v); } catch (e) { losses.push('toNodes: ' + e.message.slice(0, 80)); }
  return { v, losses, nodes };
}
const res = { tool: 'training/qwen/finetune/lines_oracle.mjs', keys_from: list(keysFrom), learned: { acts: Object.keys(learned.act_keys).length, desc_keys: learned.desc_keys, rows: learned.rows, wires: learned.wires },
  inputs_sha256: hashes, code: Object.fromEntries(['training/qwen/finetune/lines_oracle.mjs', 'training/qwen/finetune/lines_reader.mjs', 'training/qwen/finetune/lines_format.mjs', 'training/neural/parity/score_arm.mjs', 'training/neural/parity/arm_lib.mjs', 'training/neural/parity/parity_lib.mjs', 'docs/js/logic.js'].map(f => [f, sha(readFileSync(ROOT + '/' + f))])),
  rule: 'a gold request passes when the validator does not hold it and it reads back to the same type and key=value strings; gate >= 99.5% on nl_a and on every training folder', results: {} };
// rows marked unreliable (a session step after a failed replay) are never trained on (make_examples.mjs): reported apart, not in the gate
const tally = (name, numberWords, all) => { const items = all.filter(it => !it.unreliable), unrel = all.filter(it => it.unreliable); const r = tally0(name, numberWords, items); if (unrel.length) r.unreliable_rows_apart = tally0(name, numberWords, unrel); return r; };
const tally0 = (name, numberWords, items) => {
  let req = 0, pass = 0; const causes = {}, examples = {};
  for (const it of items) for (const l of (it._c = check(it.text, it.names, it.wires, numberWords, it.labels)).losses.concat([])) { causes[l] = (causes[l] || 0) + 1; (examples[l] ||= []).length < 3 && examples[l].push(it.id); }
  for (const it of items) { req += it.wires.length; pass += it.wires.length - it._c.losses.filter(x => !x.startsWith('toNodes')).length; }
  return { messages: items.length, requests: req, pass, pass_share: req ? +(pass / req).toFixed(5) : null, meets_995: req ? pass / req >= 0.995 : null, causes: Object.fromEntries(Object.entries(causes).sort((a, b) => b[1] - a[1])), examples };
};
// the drawing's labels of every row: its setup, or in a session the setup plus the gold of the earlier steps (rows in file order)
function withLabels(rows) {
  let session = null, G = null;
  return rows.map(r => {
    if (r.session != null) { if (r.session !== session) { session = r.session; G = startSystem(r.setup); } } else { session = null; G = null; }
    const st = G ? G.s : r.setup ? startSystem(r.setup).s : null, c = readerContext(r.text, r.names, r.groups, st ? st.world.state : null);
    if (G) playGold(G.s, r.wires);
    return { ...r, labels: c.labels, ctxNames: c.names };
  });
}
const nl = withLabels(loadSets(['nl_a'])[0].items).map(it => ({ ...it, names: it.ctxNames }));
for (const numberWords of [false, true]) {
  const tag = numberWords ? 'number_table' : 'plain';
  res.results[tag] = { nl_a: tally('nl_a', numberWords, nl) };
  for (const d of list(foldersOpt)) res.results[tag][d] = tally(d, numberWords, withLabels(folderRows.get(d)).map(r => ({ id: r.id, unreliable: !!r.unreliable, text: r.text, names: r.ctxNames, labels: r.labels, wires: r.wires })));
}
// the ceiling on nl_a through this validator, scored (plain rule)
const seen = seenFunction({ exact: JSON.parse(readFileSync(process.env.INVENTORY || (process.env.HOME + '/.cache/diagram-vss-modernbert/arms/data/F0/trigger_inventory.json'), 'utf8')).triggers });
const recs = [];
for (const it of nl) {
  const c = check(it.text, it.names, it.wires, false, it.labels), mains = (c.nodes ? c.nodes.mains : []).map(m => ({ node: m.node, mentions: m.mentions, span: m.req.span, src: it.text.slice(m.req.span[0], m.req.span[1]), f: null, act: null, truncated: false, wireId: m.node.id, dependencies: m.dependencies }));
  recs.push(buildRecord(it, { reader: 'qwen-lines-oracle', cut: 'own', mains, allNodes: c.nodes ? c.nodes.nodes : [], unread: [] }, { seen, artifactsKey: 'oracle' }));
}
res.scored_nl_a = {};
for (const part of ['development', 'calibration']) {
  const { part: p } = scorePart(recs.filter(r => r.part === part), null, null, { engine: false });
  res.scored_nl_a[part] = Object.fromEntries(Object.entries(p.views).map(([k, v]) => [k, { today: v.today.all_executed, direction: v.direction ? v.direction.all_executed : null }]));
}
writeFileSync(out, JSON.stringify(res, null, 1));
for (const [tag, r] of Object.entries(res.results)) for (const [k, t] of Object.entries(r)) console.log(tag.padEnd(13), k.padEnd(28), `${t.pass}/${t.requests} = ${(100 * t.pass_share).toFixed(2)}%`, t.meets_995 ? 'pass' : 'MISS', JSON.stringify(Object.entries(t.causes).slice(0, 3)));
for (const [part, v] of Object.entries(res.scored_nl_a)) for (const [view, s] of Object.entries(v)) console.log('nl_a', part, view, 'today', s.today.right + '/' + s.today.requested, 'wrong', s.today.wrong, 'extras', s.today.extras, '| direction', s.direction && (s.direction.right + '/' + s.direction.requested + ' wrong ' + s.direction.wrong));
