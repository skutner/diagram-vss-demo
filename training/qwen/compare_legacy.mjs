// compare_legacy.mjs: do the five earlier readers draw exactly what they drew in the five-reader live record? Compares, per fixture
// message and reader, the drawing's SOP Lang text after the turn (and the initial one) of a new record with a reference record.
//   node training/qwen/compare_legacy.mjs <new record.json> [reference record.json] [--json <out file>]
// Default reference: reports/evidence/diagram-five-101edd9/record.json (deployed 101edd9, 2026-11-04). Exit 1 when one differs.
import fs from 'node:fs';
const [cur, ref = 'reports/evidence/diagram-five-101edd9/record.json'] = process.argv.slice(2).filter(a => !a.startsWith('--') && !a.endsWith('.out.json'));
const jsonOut = (() => { const i = process.argv.indexOf('--json'); return i > 0 ? process.argv[i + 1] : null; })();
const A = JSON.parse(fs.readFileSync(cur, 'utf8')), B = JSON.parse(fs.readFileSync(ref, 'utf8'));
const READERS = ['rules', 'vss', 'neural', 'combined', 'modernbert'];
const rows = []; let same = 0, n = 0;
const cmp = (label, a, b) => { for (const id of READERS) { if (!a || !b || !a[id] || !b[id]) { rows.push({ label, id, equal: false, why: 'missing' }); n++; continue; } n++; const eq = a[id].sop === b[id].sop; if (eq) same++; rows.push({ label, id, equal: eq }); } };
cmp('initial', A.initial, B.initial);
for (const c of B.cases) { const x = (A.cases || []).find(y => y.id === c.id); cmp(c.id, x && x.after, c.after); }
const diffs = rows.filter(r => !r.equal);
const res = { reference: ref, record: cur, compared: n, equal: same, after_turn_compared: n - READERS.length, after_turn_equal: rows.filter(r => r.label !== 'initial' && r.equal).length, diffs };
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(res, null, 1) + '\n');
console.log(`${same}/${n} drawing SOP texts equal (${res.after_turn_equal}/${res.after_turn_compared} after-turn, plus the initial ones)`);
for (const d of diffs) console.log(`DIFFERS ${d.label} ${d.id}${d.why ? ' (' + d.why + ')' : ''}`);
process.exit(diffs.length ? 1 : 0);
