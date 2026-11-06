// calibrate_arm.mjs: the confidence of any arm, by the fit of calibrate_modernbert.mjs: five message folds, fold-local priors and percentile
// tables, the fixed L2 grid, the thresholds of the cost levels chosen on the out-of-fold scores (ties to the higher threshold), a finite
// ask-everything threshold, fail closed on a missing confidence. Fitted on the calibration parts of the sets named by --cal, never on a
// development, test or all-messages part.
//   node calibrate_arm.mjs [--cal fresh2,short3[,nl_a]] CONFIDENCE.json REPORT.json RECORDS.jsonl...
// The label of a request is its outcome against the gold of its set (Opus's for nl_a): the headline view, the one the cost score is reported
// in. The scale is not compared, as the first fit. Folds:
// message index of the calibration messages, in the order of the sets (sets.mjs SET_ORDER), then of the records, modulo 5.
import { writeFileSync, renameSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { confidence } from '../../../docs/js/neural-confidence.js';
import { NAMES, ASK_ALL, auroc, fitModel, costThreshold, stats, table } from '../calibrate_modernbert.mjs';
import { CALIBRATION_SETS, PARTS } from './sets.mjs';
import { loadRecords, oneArm, itemsOf, goldCount } from './arm_lib.mjs';

const writeAtomic = (p, text) => { const t = p + '.tmp-' + process.pid; writeFileSync(t, text); renameSync(t, p); };   // a reader of the file never sees half of it
export const L2_GRID = [.01, .1, 1, 10], COST_LEVELS = [1, 2, 5, 10, 20];

/** the fit of the recipe on records of calibration parts -> {spec, best, train, G, fitAvailable}. Pure: no files, no sets. */
export function fitRecipe(cal) {
  if (!cal.length) throw new Error('No calibration messages');
  const { items } = itemsOf(cal, 'primary', 'today');
  const missing = items.filter(x => !x.f || !x.act).length;
  // a request without confidence signals cannot be fitted on and is never executed at a threshold (fail closed); the others as the first fit
  const train = items.filter(x => !x.truncated && x.f && x.act), G = goldCount(cal);
  const both = xs => xs.some(x => x.o === 'right') && xs.some(x => x.o !== 'right');
  const fitAvailable = both(train) && [0, 1, 2, 3, 4].every(fold => both(train.filter(x => x.mi % 5 !== fold)));
  let best = null;
  for (const lam of fitAvailable ? L2_GRID : []) {
    const oof = Array(train.length);
    for (let fold = 0; fold < 5; fold++) {
      const fit = fitModel(train.filter(x => x.mi % 5 !== fold), lam);
      train.forEach((x, i) => { if (x.mi % 5 === fold) oof[i] = { ...x, c: confidence(fit, x.f, x.act) }; });
    }
    const auc = auroc(oof);
    if (auc == null) throw new Error('OOF AUROC needs both outcomes');
    if (!best || auc > best.auc + 1e-9) best = { lam, auc, oof };
  }
  const spec = best ? fitModel(train, best.lam) : { reader: 'modernbert', intercept: -40, features: NAMES.map(([name]) => ({ name, weight: 0 })),
    tables: Object.fromEntries(NAMES.map(([n, s]) => [n, table([], s)])), act_prior: {}, act_prior_default: 0 };
  if (!best) best = { lam: null, auc: null, oof: [] };
  spec.operating_level = 'cost'; spec.levels_out_of_fold = {};
  for (const cost of COST_LEVELS) spec.levels_out_of_fold[cost === 10 ? 'cost' : 'cost' + cost] = costThreshold(best.oof, G, cost);
  spec.fit_status = fitAvailable ? 'fitted' : 'asks everything: calibration folds lack both outcomes';
  return { spec, best, train, G, fitAvailable, missing };
}

/** records + the sets to fit on -> {spec, report}. Records of other parts or sets are counted and ignored, never fitted on. */
export function calibrateArm(records, calSets) {
  if (!calSets || !calSets.length) throw new Error('--cal is required: the sets whose calibration parts the confidence is fitted on, e.g. --cal fresh2,short3');
  for (const s of calSets) {
    if (!PARTS[s]) throw new Error(`--cal: unknown set ${s}`);
    if (!PARTS[s].includes('calibration')) throw new Error(`--cal: ${s} has no calibration part (${PARTS[s].join(', ')})`);
  }
  const arm = oneArm(records);
  if (arm.reader === 'rules') throw new Error('The Rules have no confidence: nothing to calibrate');
  const cal = records.filter(r => calSets.includes(r.set) && r.part === 'calibration'), ignored = {};
  for (const r of records) if (!(calSets.includes(r.set) && r.part === 'calibration')) { const k = `${r.set}/${r.part}`; ignored[k] = (ignored[k] || 0) + 1; }
  for (const s of calSets) if (!cal.some(r => r.set === s)) throw new Error(`--cal ${s}: the records hold no calibration message of ${s}`);
  const { spec, best, train, G, fitAvailable, missing } = fitRecipe(cal);
  spec.reader = arm.reader;
  const bySet = {};
  for (const s of calSets) { const rs = cal.filter(r => r.set === s); bySet[s] = { messages: rs.length, requested: goldCount(rs), produced: rs.reduce((n, r) => n + r.produced.length, 0) }; }
  const calibration = { sets: calSets, messages: cal.length, requested: G, produced: train.length, l2: best.lam, oof_auroc: best.auc, by_set: bySet,
    without_confidence_signals: missing, truncated: cal.reduce((n, r) => n + r.produced.filter(x => x.truncated).length, 0), failed_messages: cal.filter(r => r.error).length };
  const levels = Object.fromEntries(Object.entries(spec.levels_out_of_fold).map(([k, v]) => [k, v]));
  // the out-of-fold cost-10 score at its own threshold, for the report only
  const oofScore = best.oof.length ? stats(best.oof, G, spec.levels_out_of_fold.cost.threshold, 10) : null;
  const report = { recipe: 'five message folds (index mod 5, in set order); fold-local priors and percentiles; L2 grid ' + L2_GRID.join(', ') + '; thresholds of the cost levels on out-of-fold scores',
    reader: arm.reader, artifact: arm.artifact, calibration, fit_status: spec.fit_status, fit_available: fitAvailable, levels_out_of_fold: levels, out_of_fold_at_cost10: oofScore,
    ignored_records: ignored, labels: 'calibration label = outcome against the gold of the set (Opus for nl_a), the headline view; scale not compared',
    record_files: [...new Set(records.map(r => r._file))] };
  spec.calibration = calibration; spec.artifacts = arm.artifact; spec.arm = { cal_sets: calSets };
  return { spec, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), pos = []; let cal = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cal') cal = args[++i]; else if (args[i].startsWith('--cal=')) cal = args[i].slice(6); else if (args[i].startsWith('--')) throw new Error('Unknown flag ' + args[i]); else pos.push(args[i]);
  }
  const [conf, out, ...recs] = pos;
  if (!conf || !out || !recs.length) throw new Error('usage: calibrate_arm.mjs --cal fresh2,short3[,nl_a] CONFIDENCE.json REPORT.json RECORDS...');
  const { records } = loadRecords(recs);
  const { spec, report } = calibrateArm(records, (cal || '').split(',').filter(Boolean));
  writeAtomic(conf, JSON.stringify(spec, null, 2) + '\n'); writeAtomic(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ calibration: report.calibration, cost_threshold: spec.levels_out_of_fold.cost, fit_status: spec.fit_status }));
}
