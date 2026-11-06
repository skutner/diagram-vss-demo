// parity_check.mjs: the native-against-browser parity gate of QWEN3_FINETUNE_PLAN.md Q0.2, from a native collection (collect_qwen.mjs with
// TOP2=1, so every record holds its tokens with the second-best log-probability) and a browser run of the same messages (wllama_bench.mjs,
// whose results hold [id, logprob] per generated token).
//   node parity_check.mjs NATIVE.jsonl BENCH.json OUT.json
// Gate (fixed in the plan before any run): >= 30 messages; >= 90% raw outputs byte-identical; on the shared token prefix the 99th percentile
// of |delta log-probability| <= 0.02; every divergence at a near tie (native top-1 minus top-2 < 0.1 nats). On identical outputs every token
// log-probability differs by <= 0.02, which bounds the difference of every request score (a mean of them). Prints each measure and PASS or FAIL with the reasons; exit 1 on FAIL.
import { readFileSync, writeFileSync } from 'node:fs';
const [nf, bf, out] = process.argv.slice(2);
const nat = new Map(readFileSync(nf, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => r.qwen && r.qwen.tokens).map(r => [r.id, r]));
const bench = JSON.parse(readFileSync(bf, 'utf8')).results.filter(x => x.variant === 'shipped' && x.lp);
const rows = [], deltas = [], identDeltas = [];
for (const b of bench) {
  const n = nat.get(b.id); if (!n) continue;
  const nt = n.qwen.tokens, bt = b.lp; let k = 0;
  while (k < nt.length && k < bt.length && nt[k][0] === bt[k][0]) { deltas.push(Math.abs(nt[k][1] - bt[k][1])); k++; }
  const identical = n.qwen.raw === b.content, diverged = k < Math.max(nt.length, bt.length);
  if (identical) for (let i = 0; i < Math.min(nt.length, bt.length); i++) identDeltas.push(Math.abs(nt[i][1] - bt[i][1]));
  const margin = diverged && k < nt.length && nt[k][2] != null ? nt[k][1] - nt[k][2] : null;
  rows.push({ id: b.id, identical, shared_tokens: k, native_tokens: nt.length, browser_tokens: bt.length, divergence_margin_nats: margin });
}
const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };
const div = rows.filter(r => !r.identical);
const res = { messages: rows.length, identical: rows.filter(r => r.identical).length, identical_share: rows.length ? rows.filter(r => r.identical).length / rows.length : null,
  shared_tokens: deltas.length, delta_lp_p99: q(deltas, 0.99), delta_lp_max: q(deltas, 1), identical_outputs_delta_lp_max: q(identDeltas, 1), divergences: div.length,
  divergences_not_near_tie: div.filter(r => r.divergence_margin_nats == null || r.divergence_margin_nats >= 0.1).length, rows };
const why = [];
if (res.messages < 30) why.push(`only ${res.messages} messages (need 30)`);
if (!(res.identical_share >= 0.9)) why.push(`identical outputs ${(100 * res.identical_share).toFixed(1)}% (need 90%)`);
if (!(res.delta_lp_p99 <= 0.02)) why.push(`p99 |delta logprob| ${res.delta_lp_p99} (need <= 0.02)`);
if (!(res.identical_outputs_delta_lp_max <= 0.02)) why.push(`on identical outputs a token log-probability differs by ${res.identical_outputs_delta_lp_max} (need <= 0.02, which bounds every request score)`);
if (res.divergences_not_near_tie) why.push(`${res.divergences_not_near_tie} divergences not at a near tie (or no margin recorded)`);
res.gate = why.length ? 'FAIL' : 'PASS'; res.reasons = why;
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ ...res, rows: undefined }, null, 1));
if (why.length) process.exitCode = 1;
