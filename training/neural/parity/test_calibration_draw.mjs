// test_calibration_draw.mjs: the second read's signals in the confidence fit (calibrate_modernbert.mjs DRAW_NAMES, namesOf; arm M4).
//   CAL_BASE=<the calibrate_modernbert.mjs before the patch, a copy in training/neural/> [CAL_PATCHED=<module>] [M1_EVAL=<dir>] node training/neural/parity/test_calibration_draw.mjs
// 1. M1's records (fresh2, short3, nl_a calibration parts): every fit of the recipe (each L2 value, each of the five folds, and the final fit) and every
//    out-of-fold confidence are byte-identical with the patched and the base module: records without draw_* signals fit exactly as before.
// 2. Synthetic records that all carry draw_* signals, the outcome following draw_tag_p_min: the patched fit reads the five draw_* signals and puts a
//    positive weight on draw_tag_p_min; one row without them and the fit reads NAMES alone.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { confidence } from '../../../docs/js/neural-confidence.js';
import { loadRecords, itemsOf } from './arm_lib.mjs';

const HERE = new URL('.', import.meta.url).pathname;
if (!process.env.CAL_BASE) throw new Error('CAL_BASE is required: a copy of calibrate_modernbert.mjs from before the patch, in training/neural/ (its imports are relative)');
const P = await import(pathToFileURL(resolve(process.env.CAL_PATCHED || HERE + '../calibrate_modernbert.mjs')).href);
const B = await import(pathToFileURL(resolve(process.env.CAL_BASE)).href);
assert.ok(P.DRAW_NAMES && P.namesOf, 'CAL_PATCHED has no DRAW_NAMES / namesOf: not the patched module');
let n = 0; const ok = async (name, f) => { await f(); n++; console.log('ok', name); };

await ok("M1's records: every fit and out-of-fold confidence byte-identical with and without the patch", () => {
  const dir = process.env.M1_EVAL || homedir() + '/.cache/diagram-vss-modernbert/arms/M1-s0/eval';
  const { records } = loadRecords([dir + '/rec_fs.jsonl', dir + '/rec_nl.jsonl']);
  const cal = records.filter(r => ['fresh2', 'short3', 'nl_a'].includes(r.set) && r.part === 'calibration');
  const train = itemsOf(cal, 'primary', 'today').items.filter(x => !x.truncated && x.f && x.act);
  assert.ok(train.length > 500, `${train.length} calibration requests`);
  assert.ok(train.every(x => !Object.keys(x.f).some(k => k.startsWith('draw_'))), 'M1 records carry no draw_* signal');
  let fits = 0;
  for (const lam of [.01, .1, 1, 10]) for (let fold = 0; fold <= 5; fold++) {   // fold 5: the final fit on every row
    const rows = fold < 5 ? train.filter(x => x.mi % 5 !== fold) : train, a = P.fitModel(rows, lam), b = B.fitModel(rows, lam);
    assert.equal(JSON.stringify(a), JSON.stringify(b), `lam ${lam} fold ${fold}`);
    for (const x of train) assert.equal(confidence(a, x.f, x.act), confidence(b, x.f, x.act));
    fits++;
  }
  assert.equal(fits, 24);
  console.log(`   ${train.length} calibration requests, ${fits} fits`);
});

await ok('synthetic records with draw_* signals: the fit reads them; one row without them and it reads NAMES alone', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const base = Object.fromEntries(P.NAMES.filter(([k]) => k !== 'act_prior').map(([k]) => [k, 0.5]));
  const rows = Array.from({ length: 400 }, (_, i) => {
    const p = rnd(), right = rnd() < p;
    return { act: 'delete', o: right ? 'right' : 'wrong', mi: i, f: { ...base, tag_p_min: rnd(), draw_tag_p_min: p, draw_tag_margin_min: p * rnd(), draw_roles: 1, draw_roles_asked: 1, draw_lines_cut: 0 } };
  });
  const fit = P.fitModel(rows, 0.1), names = fit.features.map(x => x.name);
  for (const [k] of P.DRAW_NAMES) assert.ok(names.includes(k), k);
  assert.equal(names.length, P.NAMES.length + P.DRAW_NAMES.length);
  const w = Object.fromEntries(fit.features.map(x => [x.name, x.weight]));
  assert.ok(w.draw_tag_p_min > 0.5, `weight on draw_tag_p_min ${w.draw_tag_p_min}`);
  assert.ok(Math.abs(w.draw_tag_p_min) > Math.abs(w.tag_p_min), 'the signal that carries the outcome gets the larger weight');
  const hi = { ...rows[0].f, draw_tag_p_min: 0.95 }, lo = { ...rows[0].f, draw_tag_p_min: 0.05 };
  assert.ok(confidence(fit, hi, 'delete') > confidence(fit, lo, 'delete'));
  const mixed = rows.map((x, i) => (i ? x : { ...x, f: Object.fromEntries(Object.entries(x.f).filter(([k]) => !k.startsWith('draw_'))) }));
  assert.deepEqual(P.fitModel(mixed, 0.1).features.map(x => x.name), P.NAMES.map(([k]) => k));
  assert.equal(JSON.stringify(P.fitModel(mixed, 0.1)), JSON.stringify(B.fitModel(mixed, 0.1)), 'without every row carrying them: the base fit exactly');
});
console.log(`${n} checks passed`);
