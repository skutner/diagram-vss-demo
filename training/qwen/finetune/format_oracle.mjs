// format_oracle.mjs: the ceiling of each candidate output format for a Qwen reader, and a test of the scoring path for a reader that writes
// text. For every message of a set, the gold (the first teacher's wires) is written in the format, read back by that format's real parser,
// turned into wires and scored by training/neural/parity/score_arm.mjs scorePart (every request executed, per requested action, either
// teacher on nl_a). A format that loses nothing scores as the gold does against itself; each loss is counted by cause.
//   node format_oracle.mjs OUT.json [SET...]          (default nl_a)
// Formats:
//   json     the shipped JSON contract, read by docs/js/qwen-contract.js validate() and toNodes() (the reader's own path). A wire it cannot
//            write (a description key outside the contract's description keys, a value outside an enum, ...) is left out, with the requests
//            that use it.
//   lines_t  one line per request, `[trigger] type key=value ...` in the annotation's own form (mention(...) and $new inline), read by a
//            small line parser, then parity_lib goldProgram -> K.parse (the engine's parser). The trigger is located in the message for the
//            span. A line that does not parse is left out.
// Floors and broken readers, scored the same way: `nothing` (no request), `lines_t_wrong_action` (every action replaced by another one of
// the same type), `lines_t_shuffled` (each message gets the requests of the next message).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSpec, validate, toNodes } from '../../../docs/js/qwen-contract.js';
import { K, goldProgram, touched } from '../../neural/parity/parity_lib.mjs';
import { loadSets, contextNames } from '../../neural/parity/sets.mjs';
import { buildRecord, seenFunction, startSystem, playGold, refsOf } from '../../neural/parity/arm_lib.mjs';
import { scorePart } from '../../neural/parity/score_arm.mjs';
import { writeLines, parseLines } from './lines_format.mjs';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
globalThis.SOPKit = K;
const NK = (0, eval)(readFileSync(ROOT + '/docs/js/neural.js', 'utf8').replace('/*NEURAL-START*/', '') + '\nNeuralKit');
const reader = JSON.parse(readFileSync(ROOT + '/docs/model/qwen3/reader.json', 'utf8'));
const spec = buildSpec(K.createSystem().engine.legend, reader, K.serialize);
const seen = seenFunction({ exact: JSON.parse(readFileSync(process.env.INVENTORY || (process.env.HOME + '/.cache/diagram-vss-modernbert/arms/baseline/train-data/trigger_inventory.json'), 'utf8')).triggers });

const splitTop = v => { const out = []; let d = 0, cur = ''; for (const ch of String(v)) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out.map(s => s.trim()).filter(Boolean); };

// ---------------------------------------------------------------- json: gold -> the contract's JSON (as make_reader.mjs convert, plus $new and descriptions)
function toContract(wires) {
  const requests = [], lost = []; let lastCreate = null; const idOf = new Map();
  wires.forEach((w, i) => {
    const act = w.type === 'command' ? w.args.action : w.type === 'question' ? w.args.ask : w.type, a = spec.byDo.get(act);
    const fail = why => lost.push({ wire: i, why });
    if (!a) return fail('act not in the contract: ' + act);
    const args = {};
    for (const [k, v] of Object.entries(w.args)) {
      if (k === 'action' || k === 'ask') continue;
      const key = spec.keys.get(k);
      if (!a.keys.includes(k) || !key) return fail(`key ${k} not in the contract for ${act}`);
      if (key.kind === 'names') {
        const items = [];
        for (const p of splitTop(v)) {
          if (p === '$new') { if (!lastCreate) return fail('$new with no earlier create'); items.push({ ref: lastCreate }); continue; }
          const m = /^mention\((.*)\)$/.exec(p);
          if (m) { const like = {}; for (const kv of splitTop(m[1])) { const j = kv.indexOf('='); let kk = kv.slice(0, j).trim(); const vv = kv.slice(j + 1).trim(); if (kk === 'notcolor') kk = 'notColor'; if (!spec.descKeys.includes(kk)) return fail(`description key ${kk}`); like[kk] = vv; } items.push({ like }); continue; }
          items.push({ name: p });
        }
        args[k] = items;
      } else if (key.kind === 'number') { const n = Number(v); if (!Number.isFinite(n)) return fail(`number ${k}=${v}`); args[k] = n; }
      else if (key.kind === 'enum') { if (!key.values.includes(String(v))) return fail(`value ${k}=${v}`); args[k] = String(v); }
      else if (key.kind === 'point') { const p = String(v).split(',').map(Number); if (p.length !== 2 || p.some(x => !Number.isFinite(x))) return fail(`point ${k}`); args[k] = p; }
      else if (key.kind === 'texts') args[k] = String(v).split(',').map(x => x.trim()).filter(Boolean);
      else args[k] = String(v);
    }
    const id = 'r' + (requests.length + 1);
    requests.push({ id, text: w.span, do: act, args }); idOf.set(i, id);
    if (w.type === 'command' && ['create', 'duplicate'].includes(w.args.action)) lastCreate = id;
  });
  return { content: JSON.stringify({ requests, not_understood: [] }), lost };
}
function readJSON(it, ctx) {
  const { content, lost } = toContract(it.wires);
  const v = validate(spec, { content, finish: 'stop', reasoning: '', error: null }, { text: it.text, names: ctx.names, last: ctx.last });
  if (!v.ok) return { nodes: [], lost: [...lost, { wire: -1, why: 'whole output invalid: ' + v.errors.join('; ') }] };
  const mapped = toNodes(spec, v, { names: ctx.names, last: ctx.last }, NK.NEXT_CONTEXT);
  const blocked = mapped.analyses.filter(a => a.blocked).map(a => ({ wire: a.index, why: 'blocked: ' + a.errors.join('; ') }));
  return { nodes: mapped.nodes, lost: [...lost, ...blocked], spanOf: n => n.span };
}

// ---------------------------------------------------------------- lines_t: the annotation's own form (lines_format.mjs)
function readLines(it, ctx, text) {
  const { wires, bad } = parseLines(text);
  let nodes = [];
  const located = wires.map(w => { const k = w.trigger ? it.text.indexOf(w.trigger) : -1; return { ...w, span: k >= 0 ? it.text.slice(k, k + w.trigger.length) : '', s: k }; });
  try { nodes = K.parse(goldProgram(located.map(w => ({ span: w.span, type: w.type, args: w.args })))); } catch (e) { return { nodes: [], lost: [{ wire: -1, why: 'K.parse: ' + e.message }] }; }
  // spans: the trigger's place (goldProgram ids are w1.. in wire order)
  const spanOf = n => { const i = /^w(\d+)$/.exec(n.id); if (!i) return [0, 0]; const w = located[+i[1] - 1]; return w && w.s >= 0 ? [w.s, w.s + w.trigger.length] : [0, 0]; };
  return { nodes, lost: bad.map(b => ({ wire: b.line, why: b.why })), spanOf };
}

// ---------------------------------------------------------------- records
function runOf(nodes, spanOf, text) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const mains = nodes.filter(n => n.type !== 'mention').map(n => {
    const refs = [...new Set(Object.values(n.args || {}).flatMap(refsOf))];
    const sp = spanOf ? spanOf(n) : null;
    return { node: n, mentions: refs.map(id => byId.get(id)).filter(x => x && x.type === 'mention'), span: sp ? [sp[0], sp[1]] : [0, 0], src: sp ? text.slice(sp[0], sp[1]) : '', f: null, act: null, truncated: false, wireId: n.id, dependencies: [] };
  });
  return { reader: 'qwen-oracle', cut: 'own', mains, allNodes: nodes, unread: [], cutInfo: null };
}
const ACT_SWAP = { create: 'delete', delete: 'create', move: 'resize', resize: 'move', set: 'label', label: 'set', connect: 'disconnect', disconnect: 'connect', rename: 'duplicate', duplicate: 'rename', count: 'list', list: 'count', exists: 'count' };
const wrongAction = wires => wires.map(w => { const a = { ...w.args }; if (a.action) a.action = ACT_SWAP[a.action] || 'undo'; if (a.ask) a.ask = ACT_SWAP[a.ask] || 'describe'; return { ...w, args: a }; });

const out = process.argv[2], setNames = process.argv.slice(3).length ? process.argv.slice(3) : ['nl_a'];
const items = loadSets(setNames).flatMap(s => s.items);
const arms = { json: [], lines_t: [], nothing: [], lines_t_wrong_action: [], lines_t_shuffled: [] }, losses = { json: {}, lines_t: {} };
let session = null, G = null, last = [];
items.forEach((it, idx) => {
  if (it.session != null) { if (it.session !== session) { session = it.session; G = startSystem(it.setup); last = []; } } else { session = null; G = null; last = []; }
  const ctx = { names: contextNames(it), last: last.slice() };
  const add = (arm, r) => { const rec = buildRecord(it, r, { seen, artifactsKey: 'oracle:' + arm }); rec.reader = 'qwen-oracle-' + arm; arms[arm].push(rec); };
  const j = readJSON(it, ctx); add('json', runOf(j.nodes, j.spanOf, it.text));
  for (const l of j.lost) { const k = l.why.replace(/[A-Za-z0-9_]+=\S+/g, 'k=v').slice(0, 60); losses.json[k] = (losses.json[k] || 0) + 1; }
  const lt = readLines(it, ctx, writeLines(it.wires)); add('lines_t', runOf(lt.nodes, lt.spanOf, it.text));
  for (const l of lt.lost) { losses.lines_t[l.why] = (losses.lines_t[l.why] || 0) + 1; }
  add('nothing', runOf([], null, it.text));
  const wa = readLines(it, ctx, writeLines(wrongAction(it.wires))); add('lines_t_wrong_action', runOf(wa.nodes, wa.spanOf, it.text));
  const nx = items[(idx + 1) % items.length], sh = readLines(it, ctx, writeLines(nx.wires)); add('lines_t_shuffled', runOf(sh.nodes, sh.spanOf, it.text));
  if (G) { const res = playGold(G.s, it.wires); last = touched(G.s, res); }
});
const res = { sets: setNames, messages: items.length, losses, arms: {} };
for (const [arm, recs] of Object.entries(arms)) {
  res.arms[arm] = {};
  for (const set of setNames) for (const part of [...new Set(recs.filter(r => r.set === set).map(r => r.part))]) {
    const rs = recs.filter(r => r.set === set && r.part === part), { part: p } = scorePart(rs, null, null, { engine: false });
    const pick = v => v && v.today && v.today.all_executed ? v.today.all_executed : null;
    res.arms[arm][`${set}/${part}`] = Object.fromEntries(Object.entries(p.views || {}).map(([view, v]) => [view, pick(v)]));
    if (p.teachers_agreement) res.arms[arm][`${set}/${part}`].teachers_agreement = p.teachers_agreement;
  }
}
writeFileSync(out, JSON.stringify(res, null, 1));
for (const [arm, r] of Object.entries(res.arms)) for (const [k, v] of Object.entries(r)) console.log(arm.padEnd(22), k.padEnd(24), Object.entries(v).filter(([view]) => view !== 'teachers_agreement').map(([view, s]) => s ? `${view}: right ${s.right}/${s.requested} = ${(100 * s.right_share).toFixed(1)}%, wrong ${s.wrong}, extras ${s.extras}, cost ${s.cost_score}` : view).join(' | '));
console.log('losses', JSON.stringify(losses));
