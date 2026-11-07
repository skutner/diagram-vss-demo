// root_causes_qwen.mjs: the root-cause analysis of a line-format Qwen arm (AGENTS.md "Root-cause analysis after every evaluation"; the
// classes of QWEN3_FINETUNE_PLAN.md section 8): every requested action that is not right, and every extra, gets its first cause, split by
// seen / unseen trigger, every request executed, against the set's gold (Opus on nl_a), today scoring.
// Causes, in order (after the scoped review: by the place of the words, one-to-one): output invalid as a whole; wrong value (paired, same
// act: the scorer pairs by act first), or a name the message does not write; wrong act (an extra of another act on the request's words);
// held by the validator (a held line on its words, same act or another act); unreadable line in the output; missing request (nothing on
// its words). Extras: produced requests paired with no gold request (an extra that explains a wrong act is still counted as an extra).
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
    // a request that is not right gets its first cause by the place of its words (one-to-one: an extra or a held line explains one
    // gold request at most, the first whose span it overlaps): the scorer pairs by act first, so another act shows as an extra
    const ov = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
    const extras = r.produced.map((x, i) => ({ x, i })).filter(({ x }) => x.g < 0), usedX = new Set();
    let from = 0; const heldLines = reqs.filter(R => R.blocked).map(R => { let at = R.trigger ? r.text.indexOf(R.trigger, from) : -1; if (at < 0 && R.trigger) at = r.text.indexOf(R.trigger); if (at >= 0) from = at + R.trigger.length; return { R, s: at, e: at < 0 ? -1 : at + R.trigger.length }; }), usedH = new Set();
    const nameNotWritten = g => JSON.stringify(g.want || '').split('"').filter(s => /^[A-Z][\w-]*$/.test(s)).some(s => !r.text.toLowerCase().includes(s.toLowerCase()));
    r.goldSpans.forEach((g, gi) => {
      const p = paired.get(gi), grp = g.triggerGroup || 'unannotated';
      if (p && p.o === 'right') { right++; return; }
      let c;
      if (invalid) c = 'output invalid as a whole (' + (q.finish === 'length' ? 'cut at 256 tokens' : r.error ? 'runtime error' : 'invalid') + ')';
      else if (p) c = nameNotWritten(g) ? 'wrong value: a name the message does not write' : 'wrong value';
      else {
        const x = extras.find(({ x, i }) => !usedX.has(i) && ov(x.span[0], x.span[1], g.s, g.e));
        const h = x ? null : heldLines.find((h, k) => !usedH.has(k) && h.s >= 0 && ov(h.s, h.e, g.s, g.e) && (usedH.add(k), true));
        if (x) { usedX.add(x.i); c = 'wrong act (an extra of another act on its words)'; }
        else if (h) c = h.R.act && g.act.endsWith(':' + h.R.act) ? 'held by the validator (same act)' : 'held by the validator (another act)';
        else if (reqs.some(R => R.blocked && (R.errors || []).some(e => /not a request line|bad key=value|bad quoted/.test(e)))) c = 'unreadable line in the output';
        else c = 'missing request (nothing on its words)';
      }
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
