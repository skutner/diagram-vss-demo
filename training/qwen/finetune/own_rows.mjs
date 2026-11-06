// own_rows.mjs: Q1 (a) of QWEN3_FINETUNE_PLAN.md: does the arm fit its own training rows? A seeded sample of the arm's examples
// (make_examples.mjs output) is read by the arm's model through a native llama-server, exactly as collect_lines.mjs reads a set (the same
// prompt from the example's own user turn, request, validator and wires), and scored per requested action by score_arm.mjs scorePart
// (every request executed, today and direction) against the row's own target (the labels it was trained on, L2's overlay included).
//   SERVER=url node own_rows.mjs --keys ACT_KEYS.json --examples EX.jsonl --out OUT.json [--n 1000] [--seed 0]
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { K } from '../../neural/parity/parity_lib.mjs';
import { buildRecord, startSystem, playGold } from '../../neural/parity/arm_lib.mjs';
import { scorePart } from '../../neural/parity/score_arm.mjs';
import { lineSpec, readOutput, toNodes, readerContext } from './lines_reader.mjs';
import { parseLines } from './lines_format.mjs';
import { SYSTEM } from './make_examples.mjs';

const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const server = process.env.SERVER, N = +opt('n', 1000), seed = +opt('seed', 0);
const spec = lineSpec(K.createSystem().engine, JSON.parse(readFileSync(opt('keys'), 'utf8')));
const ex = readFileSync(opt('examples'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
// a seeded sample of rows (mulberry32, as compare_arms.mjs)
let a = seed >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const idx = ex.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
const pick = idx.slice(0, N).sort((x, y) => x - y).map(i => ex[i]);
// the source rows (text, names, setup) by file and id
const src = new Map();
for (const f of new Set(pick.map(e => e.file))) for (const l of readFileSync(f, 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); src.set(f + '\0' + r.id, r); }
const request = { temperature: 0, seed: 0, max_tokens: 256, logprobs: true, top_logprobs: 2, post_sampling_probs: false, cache_prompt: true, chat_template_kwargs: { enable_thinking: false }, verbose: true, stream: false };
const recs = []; let failed = 0, cut = 0, t0 = Date.now();
for (const e of pick) {
  const r = src.get(e.file + '\0' + e.id), wires = parseLines(e.target).wires.map(w => ({ ...w, span: w.trigger }));
  // the gold: the target the row trained on; its spans are the source wires' spans (same order, same count)
  wires.forEach((w, i) => { const s = r.wires.filter(x => x.span && r.text.includes(x.span))[i]; if (s) w.span = s.span; });
  const item = { id: e.id, set: 'own_rows', part: 'train', kind: e.kind, text: r.text, names: r.names || [], groups: r.groups, wires, setup: r.setup || null, session: null, group: null };
  const st = r.setup && !r.session ? startSystem(r.setup).s : null, vctx = readerContext(r.text, r.names, r.groups, st ? st.world.state : null);   // names only rows (Q1): no session replay
  let run;
  try {
    const res = await (await fetch(server + '/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: e.user }], ...request }) })).json();
    const ch = res.choices[0], raw = ch.message.content || '';
    if (ch.finish_reason !== 'stop') cut++;
    const v = readOutput(spec, raw, ch.finish_reason, vctx), nodes = toNodes(spec, v);
    run = { reader: 'qwen-lines', mains: nodes.mains.map(m => ({ node: m.node, mentions: m.mentions, span: m.req.span, src: r.text.slice(...m.req.span), f: null, act: null, truncated: false, wireId: m.node.id, dependencies: m.dependencies })), allNodes: nodes.nodes, unread: [] };
    var rawOut = raw;
  } catch (err) { failed++; run = { reader: 'qwen-lines', mains: [], allNodes: [], unread: [], error: String(err.message || err) }; }
  const rec = buildRecord(item, run, { seen: () => true, artifactsKey: 'own-rows' }); rec.raw = rawOut; rec.target = e.target; recs.push(rec);
}
const { part } = scorePart(recs, null, null, { engine: false });
const v = part.views.gold, res = { tool: 'training/qwen/finetune/own_rows.mjs', server, examples: opt('examples'), examples_sha256: createHash('sha256').update(readFileSync(opt('examples'))).digest('hex'), n: pick.length, seed,
  failed, cut, exact_text: recs.filter(r => r.raw === r.target).length, today: v.today.all_executed, direction: v.direction ? v.direction.all_executed : null, threshold_95: 'right_share >= 0.95', seconds: Math.round((Date.now() - t0) / 1000),
  misses: recs.filter(r => r.raw !== r.target).slice(0, 40).map(r => ({ id: r.id, target: r.target, raw: r.raw })) };
writeFileSync(opt('out'), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ n: res.n, failed, cut, exact_text: res.exact_text, today: res.today, direction: res.direction }));
