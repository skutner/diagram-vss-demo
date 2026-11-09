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
import { CALIBRATION_SETS, PARTS, sha256Mod } from './sets.mjs';
import { loadRecords, oneArm, itemsOf, goldCount, truthfulItemsOf, loadViewDir, TRUTHFUL_V1 } from './arm_lib.mjs';
import { structuralHolds, decideTruthful, truthfulStats } from './score_arm.mjs';

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

// ---------------------------------------------------------------- the grouped protocol of the ModernBERT-next campaign (the plan's section 5)
// Same recipe as fitRecipe (the 24 signals, fold-local priors and percentile tables, the L2 grid, OOF AUROC choice of the L2 with the first of equals,
// thresholds of the cost levels on the out-of-fold scores with ask-everything available and ties to the higher threshold) with five changes:
//  - the folds are the frozen groups: fold = SHA256(group_key) % 5, a group is never split (the folds stored in the records are checked against it);
//  - the outcome of a request is its truthful_v1 outcome (arm_lib.mjs);
//  - the fit unit is an ELIGIBLE produced request: with confidence signals, not truncated, not blocked, depending on nothing that is. A blocked request,
//    a truncated one, one that depends on one, and one with no confidence signals are left out of the fit and stay in the denominators (requested,
//    not done) and in the out-of-fold statistics as holds; a request with no confidence is never executed at a threshold (fail closed);
//  - a message with no produced request stays in the denominator (its gold requests are requested and not done);
//  - the selection is called what it is: the AUROC that chose the L2 is a SELECTION out-of-fold value, not an unbiased post-selection estimate.
export const FOLDS = 5;
export const foldOf = groupKey => sha256Mod(groupKey, FOLDS);
/** records of the calibration view: every one has a group_key and the stored fold is the rule's; a group never has two folds. Throws otherwise. */
export function assertGroupedFolds(cal) {
  const byGroup = new Map();
  for (const r of cal) {
    if (r.group_key == null) throw new Error(`record ${r.id}: no group_key: the grouped protocol needs the frozen groups`);
    const f = foldOf(r.group_key);
    if (r.fold != null && r.fold !== f) throw new Error(`record ${r.id}: stored fold ${r.fold}, SHA256(${r.group_key}) % ${FOLDS} is ${f}`);
    if (byGroup.has(r.group_key) && byGroup.get(r.group_key) !== f) throw new Error(`group ${r.group_key} is split across folds`);
    byGroup.set(r.group_key, f);
  }
  return byGroup;
}
/** the fit of the grouped recipe on records of the calibration view -> {spec, best, G, fitAvailable, counts, oofLevels}. Pure: no files, no sets. */
export function fitRecipeGrouped(cal) {
  if (!cal.length) throw new Error('No calibration messages');
  const byGroup = assertGroupedFolds(cal);
  const { items, unavailable } = truthfulItemsOf(cal);
  if (unavailable) throw new Error(`${unavailable} calibration requests have no truthful_v1 outcome (the records hold no raw arguments or direction): the fit would be on an unavailable measure`);
  const G = goldCount(cal), holds = structuralHolds(items);
  const withConf = x => x.f && x.act && Object.values(x.f).every(v => v == null || Number.isFinite(v));
  const counts = { produced: items.length, structural_holds: 0, no_confidence_signals: 0, fit_units: 0 };
  const train = [];
  for (const x of items) {
    if (holds.get(x)) { counts.structural_holds++; continue; }
    if (!withConf(x)) { counts.no_confidence_signals++; continue; }
    train.push({ ...x, fold: foldOf(cal[x.mi].group_key) });
  }
  counts.fit_units = train.length;
  const both = xs => xs.some(x => x.o === 'right') && xs.some(x => x.o !== 'right');
  const folds = [...new Set(train.map(x => x.fold))].sort((a, b) => a - b);
  const fitAvailable = both(train) && folds.length === FOLDS && folds.every(k => both(train.filter(x => x.fold !== k)));
  let best = null; const tried = [];
  for (const lam of fitAvailable ? L2_GRID : []) {
    const oof = Array(train.length);
    for (const k of folds) {
      const fit = fitModel(train.filter(x => x.fold !== k), lam);
      train.forEach((x, i) => { if (x.fold === k) oof[i] = { ...x, c: confidence(fit, x.f, x.act) }; });
    }
    const auc = auroc(oof);
    if (auc == null) throw new Error('OOF AUROC needs both outcomes');
    tried.push({ l2: lam, selection_oof_auroc: auc });
    if (!best || auc > best.auc + 1e-9) best = { lam, auc, oof };
  }
  const spec = best ? fitModel(train, best.lam) : { reader: 'modernbert', intercept: -40, features: NAMES.map(([name]) => ({ name, weight: 0 })),
    tables: Object.fromEntries(NAMES.map(([n, s]) => [n, table([], s)])), act_prior: {}, act_prior_default: 0 };
  if (!best) best = { lam: null, auc: null, oof: [] };
  spec.operating_level = 'cost'; spec.levels_out_of_fold = {};
  for (const cost of COST_LEVELS) spec.levels_out_of_fold[cost === 10 ? 'cost' : 'cost' + cost] = costThreshold(best.oof, G, cost);
  spec.fit_status = fitAvailable ? 'fitted' : 'asks everything: calibration folds lack both outcomes';
  // the complete out-of-fold statistics of every level: ALL calibration requests, the held ones (structural, no confidence) as holds, the rest at their out-of-fold confidence
  const oofC = new Map(best.oof.map(x => [x.mi + ':' + x.pi, x.c]));
  const all = items.map(x => ({ ...x, c: oofC.has(x.mi + ':' + x.pi) ? oofC.get(x.mi + ':' + x.pi) : NaN }));
  const oofLevels = {};
  for (const cost of COST_LEVELS) { const name = cost === 10 ? 'cost' : 'cost' + cost, thr = spec.levels_out_of_fold[name].threshold; oofLevels[name] = { cost_weight: cost, threshold: thr, ...truthfulStats(decideTruthful(all, thr), G, cost) }; }
  return { spec, best, tried, G, fitAvailable, counts, oofLevels, groups: byGroup.size, folds: Object.fromEntries(folds.map(k => [k, [...byGroup].filter(([, f]) => f === k).length])) };
}

/** records + the calibration view -> {spec, report}; the records of other views or parts are counted and ignored, never fitted on */
export function calibrateGrouped(records, calView) {
  if (!calView) throw new Error('--cal is required: the view whose calibration part the confidence is fitted on (e.g. calibration)');
  if (!PARTS[calView] || !PARTS[calView].includes('calibration')) throw new Error(`--cal ${calView}: not a set or view with a calibration part (load the views folder first)`);
  const arm = oneArm(records);
  if (arm.reader === 'rules') throw new Error('The Rules have no confidence: nothing to calibrate');
  const cal = records.filter(r => r.set === calView && r.part === 'calibration'), ignored = {};
  for (const r of records) if (!(r.set === calView && r.part === 'calibration')) { const k = `${r.set}/${r.part}`; ignored[k] = (ignored[k] || 0) + 1; }
  if (!cal.length) throw new Error(`--cal ${calView}: the records hold no calibration message of ${calView}`);
  const overlap = cal.filter(r => r.train_text_overlap).map(r => r.id);
  if (overlap.length) throw new Error(`${overlap.length} calibration records carry train_text_overlap (${overlap.slice(0, 3).join(', ')}...): the calibration is not model-unseen data`);
  const fit = fitRecipeGrouped(cal), { spec } = fit;
  spec.reader = arm.reader;
  const calibration = { sets: [calView], messages: cal.length, groups: fit.groups, groups_per_fold: fit.folds, requested: fit.G, produced: fit.counts.produced, fit_units: fit.counts.fit_units, l2: fit.best.lam, oof_auroc: fit.best.auc,
    selection_oof: 'the AUROC that chose the L2 is a selection out-of-fold value, not an unbiased post-selection estimate', excluded_from_fit: { structural_holds: fit.counts.structural_holds, no_confidence_signals: fit.counts.no_confidence_signals },
    failed_messages: cal.filter(r => r.error).length };
  const report = { recipe: `grouped protocol: ${FOLDS} folds by SHA256(group_key) % ${FOLDS} of the frozen groups; fold-local priors and percentiles; L2 grid ${L2_GRID.join(', ')} chosen by selection OOF AUROC (first of equals); thresholds of the cost levels on out-of-fold scores (ask-everything available, ties to the higher threshold); fit unit = eligible produced request; outcome = ${TRUTHFUL_V1}`,
    reader: arm.reader, artifact: arm.artifact, calibration, fit_status: spec.fit_status, fit_available: fit.fitAvailable, selection_oof_auroc_by_l2: fit.tried, levels_out_of_fold: fit.oofLevels,
    ignored_records: ignored, record_files: [...new Set(records.map(r => r._file))] };
  spec.calibration = calibration; spec.artifacts = arm.artifact; spec.arm = { cal_sets: [calView], protocol: 'grouped-v1' };
  return { spec, report };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), pos = []; let cal = null, grouped = false, views = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cal') cal = args[++i]; else if (args[i].startsWith('--cal=')) cal = args[i].slice(6);
    else if (args[i] === '--grouped') grouped = true; else if (args[i].startsWith('--views=')) views = args[i].slice(8);
    else if (args[i].startsWith('--')) throw new Error('Unknown flag ' + args[i]); else pos.push(args[i]);
  }
  const [conf, out, ...recs] = pos;
  if (!conf || !out || !recs.length) throw new Error('usage: calibrate_arm.mjs --cal fresh2,short3[,nl_a] CONFIDENCE.json REPORT.json RECORDS...   |   --grouped --views=DIR --cal VIEW CONFIDENCE.json REPORT.json RECORDS...');
  if (grouped !== !!views) throw new Error('--grouped and --views=DIR go together (the frozen groups come from the views folder)');
  if (views) loadViewDir(views);
  const { records } = loadRecords(recs);
  const { spec, report } = grouped ? calibrateGrouped(records, cal) : calibrateArm(records, (cal || '').split(',').filter(Boolean));
  writeAtomic(conf, JSON.stringify(spec, null, 2) + '\n'); writeAtomic(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ calibration: report.calibration, cost_threshold: spec.levels_out_of_fold.cost, fit_status: spec.fit_status }));
}
