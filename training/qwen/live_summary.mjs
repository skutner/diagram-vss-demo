// live_summary.mjs: from a six-reader live record (training/sketch/diagram_e2e_live6.mjs), the evidence for grading:
//  - the five earlier readers against the five-reader live record: after-turn drawing SOP, the per-turn summary (done / partly / none) and
//    the reader's section of the details with its timings removed;
//  - Qwen3 per turn: its reply, the wires it read, the validation, the gate, its score and the runtime's tokens and timings.
//   node training/qwen/live_summary.mjs <record.json> [reference record.json] --out <file>
import fs from 'node:fs';
const args = process.argv.slice(2), outI = args.indexOf('--out'), out = outI >= 0 ? args[outI + 1] : null;
const [cur, ref = 'reports/evidence/diagram-five-101edd9/record.json'] = args.filter((a, i) => !a.startsWith('--') && i !== outI + 1);
const A = JSON.parse(fs.readFileSync(cur, 'utf8')), B = JSON.parse(fs.readFileSync(ref, 'utf8'));
const LEG = ['rules', 'vss', 'neural', 'combined', 'modernbert'], LABEL = { rules: 'Rules', vss: 'VSS', neural: 'SOP-BERT', combined: 'VSS-BERT', modernbert: 'ModernBERT' };
// the reader's section of the details, without times (they differ from run to run)
// the headings are upper case, followed by a space: 'VSS ' is not 'VSS-BERT '
const section = (item, id) => { const s = (item.details && item.details.sections || []).find(x => x.text.startsWith(LABEL[id].toUpperCase() + ' ')); return s ? s.text.replace(/\d+(\.\d+)? ?ms\b/g, '<t> ms').replace(/\d+(\.\d+)? ?s\b/g, '<t> s') : null; };
const res = { record: cur, reference: ref, legacy: { sop_equal: 0, steps_equal: 0, section_equal: 0, compared: 0, diffs: [] }, qwen: [] };
for (const c of B.cases) {
  const x = A.cases.find(y => y.id === c.id); if (!x) { res.legacy.diffs.push({ case: c.id, why: 'missing in record' }); continue; }
  for (const id of LEG) {
    res.legacy.compared++;
    const sopEq = x.after[id].sop === c.after[id].sop, stEq = JSON.stringify(x.steps.readers[id]) === JSON.stringify(c.steps.readers[id]), secA = section(x, id), secB = section(c, id), secEq = secA === secB;
    if (sopEq) res.legacy.sop_equal++; if (stEq) res.legacy.steps_equal++; if (secEq) res.legacy.section_equal++;
    if (!sopEq || !stEq || !secEq) res.legacy.diffs.push({ case: c.id, reader: id, sop: sopEq, steps: stEq, section: secEq, now: secEq ? undefined : secA, before: secEq ? undefined : secB });
  }
}
for (const x of A.cases) {
  const q = x.qwen || {}, ev = q.evidence || {};
  res.qwen.push({ case: x.id, text: x.text, gold: x.actions, mainReplyMs: x.elapsedMs, qwenMs: q.ms, end: q.end, reply: q.line, read: q.read, executed: q.executed,
    valid: ev.ok, errors: ev.errors, fenced: ev.fenced, raw: ev.raw, requests: (ev.requests || []).map(r => ({ id: r.id, do: r.do, src: r.src, span: r.span, blocked: r.blocked, errors: r.errors })),
    notUnderstood: ev.notUnderstood, scores: (ev.scores || []).map(s => ({ min: s.min, weakest: s.weakest, missing: s.missing, fields: s.fields })), gate: q.gate,
    usage: ev.usage, timings: ev.timings, finish: ev.finish, reasoning: ev.reasoning, renderedPromptTail: ev.renderedPromptTail, userContent: ev.userContent, qwenDrawingAfter: x.after.qwen ? x.after.qwen.sop : null });
}
const text = JSON.stringify(res, null, 1);
if (out) fs.writeFileSync(out, text + '\n');
console.log(`legacy: ${res.legacy.sop_equal}/${res.legacy.compared} drawings, ${res.legacy.steps_equal}/${res.legacy.compared} turn summaries, ${res.legacy.section_equal}/${res.legacy.compared} details sections equal to the five-reader record`);
for (const d of res.legacy.diffs) console.log('DIFF', JSON.stringify(d).slice(0, 600));
for (const q of res.qwen) console.log(`qwen ${q.case}: ${q.end} ${Math.round((q.qwenMs || 0) / 1000)} s valid=${q.valid} read=${JSON.stringify(q.read)} blocked=${q.requests.filter(r => r.blocked).length}`);
