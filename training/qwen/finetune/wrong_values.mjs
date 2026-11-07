// wrong_values.mjs: approximate diagnosis by word match (2026-11-07). Usage: node wrong_values.mjs RECORDS.jsonl > OUT.json
// wrong-value diagnosis: for each paired-but-wrong request on nl_a development, which keys differ, and is the gold value written in the message?
import { loadRecords, viewOutcomes } from '../../neural/parity/arm_lib.mjs';
const { records } = loadRecords([process.argv[2]]);
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = s => norm(s).split(' ').filter(Boolean);
const perReq = {}, keyT = {}, kind = {}, ex = {}; let pairs = 0, wrong = 0;
const inc = (t, k) => t[k] = (t[k] || 0) + 1;
for (const r of records.filter(r => r.set === 'nl_a' && r.part === 'development')) {
  const { o } = viewOutcomes(r, 'primary', 'today'), msg = ' ' + norm(r.text) + ' ';
  const names = new Set([...String(r.setup || "").matchAll(/name=("[^"]*"|\S+)/g)].map(m => norm(m[1])));
  r.produced.forEach((x, i) => {
    if (x.g < 0) return; pairs++;
    if (o[i] === 'right') return; wrong++;
    const g = x.want || {}, p = x.got || {}; const cls = [];
    for (const k of new Set([...Object.keys(g), ...Object.keys(p)])) {
      if (JSON.stringify(g[k]) === JSON.stringify(p[k])) continue;
      const act = x.act; inc(keyT, act + ' ' + k);
      let c;
      if (g[k] === undefined) c = 'extra key the gold does not have';
      else {
        const parts = String(g[k]).split(',');
        const written = parts.every(v => { const w = words(v); return w.length && w.every(t => msg.includes(' ' + t + ' ') || msg.includes(' ' + t)); });
        const isName = parts.some(v => names.has(norm(v)));
        c = (p[k] === undefined ? 'key left out; ' : 'wrong value; ') + (written ? 'gold written in the message' : isName ? 'gold a shape name not written (needs the drawing)' : String(g[k]).startsWith('$') ? 'gold a reference ($new/$...)' : 'gold not written (legend value or paraphrase)');
      }
      inc(kind, c); cls.push(c); (ex[c] ||= []).length < 9 && ex[c].push(`${r.id} ${k}: want ${JSON.stringify(g[k])} got ${JSON.stringify(p[k])} | ${r.text.slice(0, 90)}`);
    }
    const pick = cls.find(c => /needs the drawing/.test(c)) ? 'needs the drawing' : cls.find(c => /not written/.test(c)) ? 'needs a legend value or paraphrase' : cls.find(c => /reference/.test(c)) ? 'a reference ($new)' : cls.find(c => /written in the message/.test(c)) ? 'only values written in the message' : cls.length ? 'only extra keys' : 'same args (outcome by another rule)';
    inc(perReq, pick);
  });
}
console.log(JSON.stringify({ pairs, wrong, per_request: perReq, by_kind: kind, by_act_key: Object.fromEntries(Object.entries(keyT).sort((a, b) => b[1] - a[1]).slice(0, 15)), examples: ex }, null, 1));
