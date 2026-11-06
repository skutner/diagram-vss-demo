// calibrate_qwen.mjs: the confidence of a Qwen line-format arm (QWEN3_FINETUNE_PLAN.md section 7), by the protocol of
// training/neural/parity/calibrate_arm.mjs: five message folds (calibration messages in set order, index mod 5), fold-local percentile
// tables, the L2 grid {.01, .1, 1, 10} chosen by out-of-fold AUROC, the cost-level thresholds on the out-of-fold scores, fail closed
// (a request without its signals is never fitted on and never executed). Fitted on the calibration parts of --cal only.
// What differs from calibrate_arm.mjs: the features are the Qwen signals of line_scores.mjs SIGNALS (calibrate_modernbert.mjs fitModel
// reads its 24 encoder NAMES, which a Qwen record does not have: each would read as percentile 1, a constant). The logistic fit is a copy of
// calibrate_modernbert.mjs's (not exported there). The output is read by score_arm.mjs scoreArm and docs/js/neural-confidence.js
// confidence(), which take the feature list from the file.
//   node calibrate_qwen.mjs --cal fresh2,short3,nl_a CONFIDENCE.json REPORT.json RECORDS.jsonl...
import { writeFileSync, renameSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { confidence } from '../../../docs/js/neural-confidence.js';
import { ASK_ALL, auroc, costThreshold, stats, table } from '../../neural/calibrate_modernbert.mjs';
import { PARTS } from '../../neural/parity/sets.mjs';
import { loadRecords, oneArm, itemsOf, goldCount } from '../../neural/parity/arm_lib.mjs';
import { SIGNALS } from './line_scores.mjs';
import { percentile } from '../../../docs/js/neural-confidence.js';

export const L2_GRID = [.01, .1, 1, 10], COST_LEVELS = [1, 2, 5, 10, 20];
const writeAtomic = (p, text) => { const t = p + '.tmp-' + process.pid; writeFileSync(t, text); renameSync(t, p); };

function logistic(X, y, lam) {   // calibrate_modernbert.mjs logistic, the same code
  const d = X[0].length + 1, w = Array(d).fill(0);
  for (let iteration = 0; iteration < 200; iteration++) {
    const H = Array.from({ length: d }, () => Array(d).fill(0)), g = Array(d).fill(0);
    X.forEach((row, i) => {
      const x = [1, ...row], z = x.reduce((s, v, j) => s + v * w[j], 0), p = 1 / (1 + Math.exp(-z)), s = Math.max(p * (1 - p), 1e-6);
      for (let j = 0; j < d; j++) { g[j] += (p - y[i]) * x[j]; for (let k = 0; k < d; k++) H[j][k] += s * x[j] * x[k]; }
    });
    for (let j = 1; j < d; j++) { g[j] += lam * w[j]; H[j][j] += lam; }
    for (let i = 0; i < d; i++) {
      let p = i; for (let r = i + 1; r < d; r++) if (Math.abs(H[r][i]) > Math.abs(H[p][i])) p = r;
      [H[i], H[p]] = [H[p], H[i]]; [g[i], g[p]] = [g[p], g[i]];
      if (!Number.isFinite(H[i][i]) || Math.abs(H[i][i]) < 1e-15) throw new Error('Singular calibration Hessian');
      for (let r = i + 1; r < d; r++) { const q = H[r][i] / H[i][i]; for (let c = i; c < d; c++) H[r][c] -= q * H[i][c]; g[r] -= q * g[i]; }
    }
    const step = Array(d).fill(0);
    for (let i = d - 1; i >= 0; i--) { let s = g[i]; for (let j = i + 1; j < d; j++) s -= H[i][j] * step[j]; step[i] = s / H[i][i]; w[i] -= step[i]; }
    if (w.some(x => !Number.isFinite(x))) throw new Error('Non-finite calibration fit');
    if (Math.max(...step.map(Math.abs)) < 1e-7) break;
  }
  return w;
}
/** calibrate_modernbert.mjs fitModel with the Qwen signals (no act prior: not a signal of the plan's section 7) */
export function fitModel(rows, lam, names = SIGNALS) {
  if (!rows.length || !rows.some(x => x.o === 'right') || rows.every(x => x.o === 'right')) throw new Error('Calibration training fold needs both outcomes');
  const overall = rows.filter(x => x.o === 'right').length / rows.length;
  const tables = Object.fromEntries(names.map(([n, s]) => [n, table(rows.map(x => x.f[n]), s)]));
  const vec = x => names.map(([n]) => percentile(tables[n], x.f[n]));
  const w = logistic(rows.map(vec), rows.map(x => x.o === 'right' ? 1 : 0), lam);
  return { reader: 'qwen-lines', intercept: w[0], features: names.map(([name], i) => ({ name, weight: w[i + 1] })), tables, act_prior: {}, act_prior_default: overall };
}
export function fitRecipe(cal) {
  if (!cal.length) throw new Error('No calibration messages');
  const { items } = itemsOf(cal, 'primary', 'today');
  const missing = items.filter(x => !x.f || !x.act).length;
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
  const spec = best ? fitModel(train, best.lam) : { reader: 'qwen-lines', intercept: -40, features: SIGNALS.map(([name]) => ({ name, weight: 0 })), tables: Object.fromEntries(SIGNALS.map(([n, s]) => [n, table([], s)])), act_prior: {}, act_prior_default: 0 };
  if (!best) best = { lam: null, auc: null, oof: [] };
  spec.operating_level = 'cost'; spec.levels_out_of_fold = {};
  for (const cost of COST_LEVELS) spec.levels_out_of_fold[cost === 10 ? 'cost' : 'cost' + cost] = best.oof.length ? costThreshold(best.oof, G, cost) : { threshold: ASK_ALL, score: 0, executed: 0 };
  spec.fit_status = fitAvailable ? 'fitted' : 'asks everything: calibration folds lack both outcomes';
  return { spec, best, train, G, fitAvailable, missing };
}
export function calibrateQwen(records, calSets) {
  if (!calSets || !calSets.length) throw new Error('--cal is required');
  for (const s of calSets) { if (!PARTS[s]) throw new Error(`--cal: unknown set ${s}`); if (!PARTS[s].includes('calibration')) throw new Error(`--cal: ${s} has no calibration part`); }
  const arm = oneArm(records);
  const cal = records.filter(r => calSets.includes(r.set) && r.part === 'calibration'), ignored = {};
  for (const r of records) if (!(calSets.includes(r.set) && r.part === 'calibration')) { const k = `${r.set}/${r.part}`; ignored[k] = (ignored[k] || 0) + 1; }
  for (const s of calSets) if (!cal.some(r => r.set === s)) throw new Error(`--cal ${s}: the records hold no calibration message of ${s}`);
  const { spec, best, train, G, fitAvailable, missing } = fitRecipe(cal);
  spec.reader = arm.reader;
  const calibration = { sets: calSets, messages: cal.length, requested: G, produced: train.length + missing, fitted_on: train.length, l2: best.lam, oof_auroc: best.auc, without_confidence_signals: missing, failed_messages: cal.filter(r => r.error).length };
  const oofScore = best.oof.length ? stats(best.oof, G, spec.levels_out_of_fold.cost.threshold, 10) : null;
  const report = { recipe: 'calibrate_arm.mjs protocol with line_scores.mjs SIGNALS', signals: SIGNALS, reader: arm.reader, artifact: arm.artifact, calibration, fit_status: spec.fit_status, levels_out_of_fold: spec.levels_out_of_fold,
    out_of_fold_at_cost10: oofScore, ignored_records: ignored, labels: 'outcome against the gold of the set (Opus for nl_a), today scoring', record_files: [...new Set(records.map(r => r._file))] };
  spec.calibration = calibration; spec.artifacts = arm.artifact; spec.arm = { cal_sets: calSets };
  return { spec, report };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), pos = []; let cal = null;
  for (let i = 0; i < args.length; i++) { if (args[i] === '--cal') cal = args[++i]; else if (args[i].startsWith('--')) throw new Error('Unknown flag ' + args[i]); else pos.push(args[i]); }
  const [conf, out, ...recs] = pos;
  if (!conf || !out || !recs.length) throw new Error('usage: calibrate_qwen.mjs --cal fresh2,short3,nl_a CONFIDENCE.json REPORT.json RECORDS...');
  const { records } = loadRecords(recs);
  const { spec, report } = calibrateQwen(records, (cal || '').split(',').filter(Boolean));
  writeAtomic(conf, JSON.stringify(spec, null, 2) + '\n'); writeAtomic(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ calibration: report.calibration, cost_threshold: spec.levels_out_of_fold.cost, fit_status: spec.fit_status }));
}
