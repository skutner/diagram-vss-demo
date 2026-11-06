// test_compare_qwen.mjs: compare_qwen.mjs reproduces training/neural/parity/compare_arms.mjs exactly at weight 10 (the cost score), on real
// score files (default: F0-s0 against SOP-F0-s0, fitted on fresh2+short3+nl_a), and its right share is the cost-0 computation.
//   node test_compare_qwen.mjs [A_SCORES.json B_SCORES.json]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as orig from '../../neural/parity/compare_arms.mjs';
import * as mine from './compare_qwen.mjs';
const H = process.env.HOME + '/.cache/diagram-vss-modernbert/arms/';
const [pa, pb] = process.argv.slice(2).length ? process.argv.slice(2) : [H + 'F0-s0/eval/cal-fresh2-short3-nl_a.score.json', H + 'SOP-F0-s0/eval/cal-fresh2-short3-nl_a.score.json'];
const A = JSON.parse(readFileSync(pa, 'utf8')), B = JSON.parse(readFileSync(pb, 'utf8'));
const side = S => { const t = readFileSync(S.per_message.file, 'utf8'); if (createHash('sha256').update(t).digest('hex') !== S.per_message.sha256) throw new Error('sidecar changed'); return JSON.parse(t); };
const sa = side(A), sb = side(B);
let fails = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' ' + extra : '')); if (!ok) fails++; };
const o = orig.compareSidecars(sa, sb, A, B), m = mine.compareSidecars(sa, sb, A, B, 10);
check('weight 10 equals compare_arms.mjs byte for byte', JSON.stringify(o) === JSON.stringify(m), `(${Object.keys(o).length} parts)`);
const both = mine.compareBoth(sa, sb, A, B);
const strip = x => JSON.parse(JSON.stringify(x, (k, v) => k === 'right_share' ? undefined : v));
check('compareBoth without right_share equals compare_arms.mjs', JSON.stringify(strip(both)) === JSON.stringify(o));
// the right share by hand on one part and variant: (right_A - right_B) / G * 100 over all messages
const key = Object.keys(both)[0], v = Object.keys(both[key].variants).find(x => x.endsWith('today.all')), t = sa[key].tallies[v], u = sb[key].tallies[v];
const G = t.G.reduce((a, b) => a + b, 0), want = (t.right.reduce((a, b) => a + b, 0) - u.right.reduce((a, b) => a + b, 0)) / G * 100;
check(`right share difference by hand (${key} ${v})`, Math.abs(both[key].variants[v].right_share.difference - Math.round(want * 1e4) / 1e4) < 1e-9, `${both[key].variants[v].right_share.difference} vs ${want.toFixed(4)}`);
check('the weight is restored after a call', JSON.stringify(mine.compareSidecars(sa, sb, A, B)) === JSON.stringify(o));
process.exitCode = fails ? 1 : 0;
