// root_causes_qwen.mjs: the root-cause analysis of a line-format Qwen arm (AGENTS.md "Root-cause analysis after every evaluation"; the
// classes of QWEN3_FINETUNE_PLAN.md section 8): every requested action that is not right, and every extra, gets its first cause, split by
// seen / unseen trigger, every request executed, against the set's gold (Opus on nl_a), today scoring.
// Causes, in order: output invalid as a whole (cut at the token limit, runtime error); wrong act (a produced request paired with it has
// another act); wrong value or reference (same act, other values; "reference" when the gold names a shape the message does not write);
// held by the validator (not done, and the output has a held line of the same act); unreadable line (not done, and the output has a line
// the parser cannot read); missing request (not done otherwise); extra request (produced, paired with no gold request).
//   node root_causes_qwen.mjs OUT.json RECORDS.jsonl [SET/PART ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { loadRecords, viewOutcomes } from '../../neural/parity/arm_lib.mjs';
const [out, file, ...keys] = process.argv.slice(2);
const { records } = loadRecords([file]);
const want = keys.length ? keys : [...new Set(records.map(r => r.set + '/' + r.part))];
const writes = (text, g) => { const names = JSON.stringify(g.want || '').match(/"([A-Za-z][\w-]*)"/g) || []; return names; };
const res = {};
for (const k of want) {
  const rs = records.filter(r => r.set + '/' + r.part === k), tally = { seen: {}, unseen: {}, unannotated: {} }, ex = {};
  const add = (grp, c, id) => { const t = tally[grp] || (tally[grp] = {}); t[c] = (t[c] || 0) + 1; (ex[c] ||= []).length < 4 && ex[c].push(id); };
  let right = 0;
  for (const r of rs) {
    const { o } = viewOutcomes(r, 'primary', 'today'), q = r.qwen || {}, reqs = q.requests || [];
    const invalid = r.error || q.ok === false;
    const paired = new Map(); r.produced.forEach((x, i) => { if (x.g >= 0) paired.set(x.g, { x, o: o[i] }); });
    r.goldSpans.forEach((g, gi) => {
      const p = paired.get(gi), grp = g.triggerGroup || 'unannotated';
      if (p && p.o === 'right') { right++; return; }
      let c;
      if (invalid) c = 'output invalid as a whole (' + (q.finish === 'length' ? 'cut at 256 tokens' : r.error ? 'runtime error' : 'invalid') + ')';
      else if (p) c = p.x.pa !== g.act ? 'wrong act' : /mention|\$/.test(JSON.stringify(g.want)) || !JSON.stringify(g.want).split('"').filter(s => /^[A-Z]/.test(s)).every(s => r.text.toLowerCase().includes(s.toLowerCase())) ? 'wrong value: reference' : 'wrong value';
      else if (reqs.some(R => R.blocked && R.act && g.act.endsWith(':' + R.act))) c = 'held by the validator';
      else if (reqs.some(R => R.blocked && (R.errors || []).some(e => /not a request line|bad key=value|bad quoted/.test(e)))) c = 'unreadable line';
      else c = 'missing request';
      add(grp, c, r.id);
    });
    r.produced.forEach((x, i) => { if (x.g < 0) add('unpaired extras', 'extra request', r.id); });
  }
  // the validator's held requests by their first error, over the part
  const held = {};
  for (const r of rs) for (const R of (r.qwen && r.qwen.requests) || []) if (R.blocked) { const e = String((R.errors || [])[0] || '').replace(/=\S+/g, '=…').replace(/\[[^\]]*\]/g, '[…]').slice(0, 70); held[e] = (held[e] || 0) + 1; }
  res[k] = { messages: rs.length, requested: rs.reduce((n, r) => n + r.goldSpans.length, 0), right, causes: tally, held_by_first_error: Object.fromEntries(Object.entries(held).sort((a, b) => b[1] - a[1])), examples: ex };
}
writeFileSync(out, JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res)) { console.log(`${k}: ${v.messages} messages, ${v.requested} requested, ${v.right} right`); for (const [g, t] of Object.entries(v.causes)) if (Object.keys(t).length) console.log('  ' + g.padEnd(16), JSON.stringify(t)); console.log('  held by', JSON.stringify(Object.entries(v.held_by_first_error).slice(0, 6))); }
