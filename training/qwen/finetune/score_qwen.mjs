// score_qwen.mjs: Qwen records (collect_qwen.mjs) scored by training/neural/parity/score_arm.mjs scorePart, every validated request executed
// (no confidence yet: score_arm.mjs scoreArm accepts "none" only for the Rules), per set and part, both teacher views, with the floor of a
// reader that writes nothing beside it, and Qwen's own counts: invalid outputs by cause, blocked requests, outputs past 512 tokens, time.
//   node score_qwen.mjs [--partial] OUT.json RECORDS.jsonl...
// --partial reads a collection that is still running (no complete manifest): the output says "partial" and is never a result of an arm.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadRecords } from '../../neural/parity/arm_lib.mjs';
import { scorePart } from '../../neural/parity/score_arm.mjs';

const args = process.argv.slice(2), partial = args.includes('--partial'), [out, ...files] = args.filter(a => a !== '--partial');
const { records } = loadRecords(files, { verify: !partial });
const ROOT = new URL('../../..', import.meta.url).pathname;
const code = Object.fromEntries(['training/qwen/finetune/score_qwen.mjs', 'training/neural/parity/score_arm.mjs', 'training/neural/parity/arm_lib.mjs', 'training/neural/parity/sets.mjs', 'training/neural/parity/parity_lib.mjs', 'training/neural/calibrate_modernbert.mjs', 'docs/js/bench-canon.js', 'docs/js/neural-confidence.js', 'training/sketch/layer_common.mjs'].map(f => [f, createHash('sha256').update(readFileSync(ROOT + f)).digest('hex')]));
const res = { partial, files, code, sets: {} };
const pick = v => (v && v.today ? v.today.all_executed : null);
for (const key of [...new Set(records.map(r => r.set + '/' + r.part))]) {
  const rs = records.filter(r => r.set + '/' + r.part === key), { part } = scorePart(rs, null, null, { engine: false });
  const nothing = scorePart(rs.map(r => { const { _tv, ...rest } = r; return { ...rest, produced: [] }; }), null, null, { engine: false }).part;
  for (const [view, v] of Object.entries(nothing.views)) { const a = pick(v); if (a && (a.right || a.wrong || a.extras)) throw new Error(`the writes-nothing floor of ${key} (${view}) is not empty: a scorer defect`); }
  const q = rs.map(r => r.qwen).filter(Boolean), causes = {};
  for (const x of q) for (const e of x.errors || []) { const k = e.replace(/[“"][^”"]*[”"]/g, '…').slice(0, 70); causes[k] = (causes[k] || 0) + 1; }
  const ms = q.map(x => x.ms).sort((a, b) => a - b);
  res.sets[key] = { messages: rs.length, views: Object.fromEntries(Object.entries(part.views).map(([k, v]) => [k, pick(v)])), views_direction: Object.fromEntries(Object.entries(part.views).map(([k, v]) => [k, v && v.direction ? v.direction.all_executed || null : null])), nothing: Object.fromEntries(Object.entries(nothing.views).map(([k, v]) => [k, pick(v)])),
    teachers_agreement: part.teachers_agreement ? Object.fromEntries(Object.entries(part.teachers_agreement).map(([k, v]) => [k, v.today])) : null,
    qwen: { invalid_outputs: q.filter(x => !x.ok).length, invalid_causes: causes, blocked_requests: q.reduce((n, x) => n + (x.blocked || []).length, 0),
      outputs_over_512_tokens: q.filter(x => (x.timings?.predicted_n || 0) > 512).length, ms_p50: ms[Math.floor(ms.length / 2)] ?? null, ms_p90: ms[Math.floor(ms.length * 0.9)] ?? null, ms_mean: ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : null } };
}
writeFileSync(out, JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res.sets)) {
  console.log(`${partial ? '[partial] ' : ''}${k} (${v.messages} messages)`);
  for (const [view, s] of Object.entries(v.views)) if (s) { const d = v.views_direction[view]; console.log(`  ${view.padEnd(16)} right ${s.right}/${s.requested} = ${(100 * s.right_share).toFixed(1)}%, wrong ${s.wrong}, not done ${s.not_done}, extras ${s.extras}, cost ${s.cost_score}` + (d ? ` | direction: right ${d.right}, wrong ${d.wrong}` : '')); }
  console.log(`  invalid outputs ${v.qwen.invalid_outputs}, blocked requests ${v.qwen.blocked_requests}, outputs over 512 tokens ${v.qwen.outputs_over_512_tokens}, ms p50 ${v.qwen.ms_p50}, p90 ${v.qwen.ms_p90}, mean ${v.qwen.ms_mean}`);
}
