// All fixtures and lock probes are confined to a fresh measure-dev child.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, symlinkSync, existsSync, closeSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import * as Base from './modernbert_request_weight_measure.mjs';
import {tmpdir} from 'node:os';
import * as F from './modernbert_forms_measure.mjs';

const ROOT = mkdtempSync(resolve(tmpdir(), 'request-weight-fixtures-'));
const MODULE = resolve(ROOT, 'modernbert_request_weight_measure.mjs');
copyMeasure(MODULE, ROOT);
const M = await import(pathToFileURL(MODULE).href);
const put = (p, obj) => writeFileSync(p, JSON.stringify(obj));
function copyMeasure(target, root) {
  let source = readFileSync(resolve(Base.HERE, 'modernbert_request_weight_measure.mjs'), 'utf8');
  source = source.replace(/from '([^']+)'/g, (all, p) => p.startsWith('.') ? `from '${pathToFileURL(resolve(Base.HERE, p)).href}'` : all).replace(/^export const TASK = .*;$/m, `export const TASK = ${JSON.stringify(root)};`).replace("REPO = resolve(HERE, '../../..')", `REPO = ${JSON.stringify(Base.REPO)}`);
  writeFileSync(target, source);
}
const fixture = (code, suffix) => {
  const source = resolve(ROOT, suffix + '.mjs'); writeFileSync(source, code);
  return M.execute({ argv: [process.execPath, source], cwd: ROOT, inputs: [source], sources: [source], out: resolve(ROOT, suffix), scope: 'perfect-label-fixture', timeout: 5000 });
};
test('actual fixture execution counts checks and preserves complete process evidence', () => {
  const r = fixture("console.log('ok   assertion');console.log('PASS (1 checks)');", 'one');
  assert.equal(M.countFixture(r), 1); assert.equal(r.exit_status, 0); assert.equal(r.signal, null);
  assert.ok(r.argv.length > 1 && r.cwd === ROOT && r.started && r.ended && r.before && r.after);
  assert.equal(M.countFixture({ ...r, scope: 'actual-model-training-fit' }), 0);
});
test('PASS then FAIL/exit one, zero checks and forged learned scope never pass', () => {
  for (const [name, code] of [
    ['fail', "console.log('ok   first');console.log('PASS (1 checks)');console.log('FAIL later');process.exit(1);"],
    ['zero', "console.log('PASS (0 checks)');"],
    ['stamp', "console.log('PASS (17 checks)');"],
    ['post', "console.log('ok   first');console.log('PASS (1 checks)');console.log('FAIL later');"]
  ]) assert.equal(M.countFixture(fixture(code, name)), 0);
  const r = fixture("console.log('ok   first');console.log('PASS (1 checks)');", 'scope');
  assert.equal(M.countFixture({ ...r, scope: 'actual-model-training-fit' }), 0);
  writeFileSync(Object.keys(r.outputs)[0], 'ok   replaced\nPASS (1 checks)\n');
  assert.throws(() => M.countFixture(r), /changed/);
});
test('changed sources during command and finite deadlines are enforced', () => {
  const source = resolve(ROOT, 'self-change.mjs');
  writeFileSync(source, "import fs from 'node:fs';fs.appendFileSync(import.meta.filename,'\\n');console.log('ok   false');console.log('PASS (1 checks)');");
  const r = M.execute({ argv: [process.execPath, source], cwd: ROOT, inputs: [source], sources: [source], out: resolve(ROOT, 'changed'), scope: 'perfect-label-fixture', timeout: 5000 });
  assert.equal(r.unchanged, false); assert.equal(M.countFixture(r), 0);
  assert.throws(() => M.execute({ argv: ['node', 'x'], timeout: Infinity }), /finite/);
  assert.throws(() => M.deadline(''), /explicit/); assert.throws(() => M.deadline('2020-01-01 00:00'), /deadline/);
});

const side = (right, bad = 0) => ({ ids: Array.from({ length: 30 }, (_, i) => 'm' + i), group: Array.from({ length: 30 }, (_, i) => 'g' + i), session: Array(30).fill(null), overlap: Array(30).fill(false), tallies: Object.fromEntries(['gold.truthful_v1.gate', 'gold.truthful_v1.all'].map(k => [k, { right: Array(30).fill(right), bad: Array(30).fill(bad), G: Array(30).fill(2) }])) });
const pop = (share = .96, risk = .01) => ({ available: true, requested: 60, groups: 30, ungated: { right_share: share, right: Math.round(60 * share), structural_holds: { total: 0 }, unread: 0 }, gated: { executed: 50, risk, wrong_plus_extras_per_100_requested: 0 } });
function bundle(name, opts = {}) {
  const populations = {}, support = {}, sidecar = {}, sets = {};
  for (const n of ['t1_clean', 't1_clean_create', ...Object.keys(F.FORMS_RULES.form_bars).map(x => 't1_clean_' + x), 't1_clean_label_setting', 't1_all_undo_redo_count', 'lowercase_other_affected', 'short3_lowercase']) { populations[n] = pop(opts.share ?? .96, opts.risk ?? .01); support[n] = { supported: true }; }
  sidecar['t1_all/all#t1_clean'] = side(opts.right ?? 1); sidecar['t1_all/all#t1_clean_create'] = side(opts.right ?? 1);
  for (const [v, p] of [['fresh2_test', 'test'], ['short3_test', 'test'], ['nl_a_development', 'development']]) {
    sidecar[v + '/' + p] = side(1); sets[v] = { [p]: { available: true, requested: 60, use: 'evaluation', gated: { executed: 40, requested: 60, cost_score: 0, wrong_plus_extras_per_100_requested: 0 } } };
  }
  return { name, sidecar, score: { sets, populations, population_support: support, exposure: { t1_all_undo_redo_count: { requests: 60 } }, label_errors: { gated_empty_label_on_nonempty_gold: 0, executed_without_raw_arguments: 0 } } };
}
const good = () => Object.fromEntries(['J-s0', 'F-s0', 'B-s0', 'C100-s0'].map(n => [n, { bundle: bundle(n, { right: n === 'J-s0' ? 2 : 1 }) }]));
const oracle = F.chkBool('separate oracle fixture', true);
test('seed0 compares J to F and B with all three full-view Guard G comparators', () => {
  const L = good(), rows = M.numericalRows('seed0', L, oracle);
  assert.ok(rows.length > 0 && rows.every(r => r.pass), JSON.stringify(rows.flatMap(r => r.checks.filter(c => !c.ok))));
  assert.deepEqual(rows.filter(r => r.id.startsWith('R1')).map(r => r.id), ['R1:J-s0:F-s0', 'R1:J-s0:B-s0']);
  const names = rows.filter(r => r.id.startsWith('R3')).flatMap(r => r.checks.map(c => c.name)).join('\n');
  for (const c of ['F-s0', 'B-s0', 'C100-s0']) assert.ok(names.includes('vs ' + c));
});

// These handcrafted records exercise the validator only. They are never passed to
// a public command, stored below TASK, or reported as actual model evidence.
function ledgerFixture() {
  const root = mkdtempSync(resolve(ROOT, 'ledger-fixture-'));
  const input = resolve(root, 'input'), source = resolve(root, 'source'); writeFileSync(input, 'input'); writeFileSync(source, 'source');
  const P = {task_root: root, sha256: 'registered', file: resolve(root, 'frozen/protocol.json'), sources: {[source]: M.hash(source)}, inputs: {[input]: M.hash(input)}, loss_manifest: {path: resolve(root, 'objective.json'), sha256: 'b'.repeat(64), formula: 'request-max-positive-sqrt-v1'}, FP: {parent: {protocol: resolve(root, 'parent.json')}}, arms: {'J-s0': {arm: 'J', seed: 0, training: resolve(root, 'J-s0/run'), model: resolve(root, 'J-s0/model'), bundle: resolve(root, 'J-s0/bundle'), train_data: resolve(root, 'data')}}};
  const {ledger} = M.reserveTrajectory(P, 'J-s0'); return {P, ledger};
}
function gateRecord(P) {
  return {passed: true, stopped_by: null, rows: 200, request_class_loss: {formula: P.loss_manifest.formula, sha256: P.loss_manifest.sha256},
    log: [{update: 400, elapsed: 299, act: .99, word_tags: .99, keys: Object.fromEntries(Array.from({length: 52}, (_, i) => ['h' + i, {val_n: 100, val_ok: 99, none_n: 100, none_ok: 99}]))}]};
}
function syntheticFinish(P, ledger, a, {success = true, elapsed = 20, recovery = false, full = false} = {}) {
  mkdirSync(a.out, {recursive: true});
  const resources = M.resourceLimits('actual-model-' + a.label);
  const spec = {schema: 'request-weight-resource-context-v1', argv: a.argv, cwd: M.REPO, scope: 'actual-model-' + a.label, resources, timeout: a.timeout_ms, task_root: P.task_root, out: a.out, started_ms: a.started_ms, deadline_ms: a.deadline_ms};
  const guard = {...resources, exit_status: success ? 0 : 3, signal: success ? null : 'SIGTERM', reason: success ? null : 'signal', rss_peak_bytes: 0};
  put(resolve(a.out, 'invocation.json'), spec); put(resolve(a.out, 'resource-result.json'), guard);
  writeFileSync(resolve(a.out, 'stdout.log'), 'SYNTHETIC VALIDATOR FIXTURE\n'); writeFileSync(resolve(a.out, 'stderr.log'), '');
  const files = ['invocation.json', 'resource-result.json', 'stdout.log', 'stderr.log'].map(n => resolve(a.out, n));
  if (a.label === 'overfit' && success) {const gate = resolve(P.task_root, 'J-s0/gate/overfit_gate.json'); mkdirSync(resolve(gate, '..'), {recursive: true}); put(gate, gateRecord(P)); files.push(gate);}
  if (a.label === 'training' && full) {const path = resolve(P.arms['J-s0'].training, 'complete.json'); mkdirSync(resolve(path, '..'), {recursive: true}); put(path, {complete: true, full_schedule: true, max_updates: 0, state: {epoch: 8, update: 14640, total: 14640}}); files.push(path);}
  let checkpoint = null;
  if (recovery) {
    const path = resolve(P.arms['J-s0'].training, 'checkpoint.pt'); mkdirSync(resolve(path, '..'), {recursive: true}); writeFileSync(path, 'synthetic checkpoint bytes ' + a.index);
    checkpoint = {path, sha256: M.hash(path), stopped: {checkpoint: true, update: a.index, reason: 'signal SIGTERM'}};
  }
  const receipt = {schema: 'modernbert-request-weight-execution-v1', scope: spec.scope, argv: a.argv, cwd: M.REPO, before: {inputs: P.inputs, sources: P.sources}, after: {inputs: P.inputs, sources: P.sources}, unchanged: true,
    environment: {CUDA_VISIBLE_DEVICES: ['overfit', 'training'].includes(a.label) ? 'GPU-905b8484-3b1e-30f6-defd-05d44f00f692' : '', OMP_NUM_THREADS: '2', MKL_NUM_THREADS: '2', OPENBLAS_NUM_THREADS: '2', HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1', TOKENIZERS_PARALLELISM: 'false'},
    outputs: Object.fromEntries(files.map(p => [p, M.hash(p)])), resource_guard: guard, timeout_ms: a.timeout_ms, elapsed_ms: elapsed, started: new Date(a.started_ms).toISOString(), ended: new Date(a.started_ms + elapsed).toISOString(), exit_status: guard.exit_status, signal: guard.signal, error: guard.reason, recovery_checkpoint: checkpoint};
  put(a.receipt, receipt); M.finishAttempt(P, ledger, a, receipt, {full_schedule: full, recovery_checkpoint: checkpoint}); return a;
}
const attemptOptions = (timeout_ms = 1000) => ({stop_at: '2030-01-01 12:00', timeout_ms});
function successfulGate(P, ledger) {return syntheticFinish(P, ledger, M.reserveAttempt(P, ledger, 'overfit', attemptOptions()));}

test('one J trajectory and one overfit reservation survive coordinator restart', () => {
  const {P, ledger} = ledgerFixture();
  assert.throws(() => M.reserveTrajectory(P, 'J-s1'), /only J-s0/);
  const a = M.reserveAttempt(P, ledger, 'overfit', attemptOptions());
  const persisted = JSON.parse(readFileSync(resolve(P.task_root, 'budget.json')));
  assert.equal(persisted.trajectories['J-s0'].attempts[0].state, 'reserved');
  assert.equal(existsSync(a.out), false);
  assert.throws(() => M.reserveTrajectory(P, 'J-s0'), /uncertain/);
  assert.throws(() => M.reserveAttempt(P, ledger, 'overfit', attemptOptions()), /uncertain/);
  syntheticFinish(P, ledger, a, {success: false});
  assert.throws(() => M.reserveAttempt(P, ledger, 'overfit', attemptOptions()), /budget/);
  assert.throws(() => M.reserveAttempt(P, ledger, 'training', attemptOptions()), /successful original overfit/);
});
test('overfit action/tag and class .99 boundaries are independently mandatory', () => {
  const {P} = ledgerFixture(); assert.equal(M.overfitPassed(P, gateRecord(P)), true);
  for (const mutate of [g => {g.log[0].act = .989;}, g => {g.log[0].word_tags = .989;}, g => {g.log[0].keys.h0.none_ok = 98;}, g => {g.log[0].update = 401;}, g => {g.log[0].elapsed = 301;}, g => {g.class_loss = {};}, g => {g.request_class_loss.sha256 = 'changed';}]) {
    const g = gateRecord(P); mutate(g); assert.equal(M.overfitPassed(P, g), false);
  }
});
test('only one exact durable checkpoint resume; third invocation and changed checkpoints refuse', () => {
  const {P, ledger} = ledgerFixture(); successfulGate(P, ledger);
  const first = syntheticFinish(P, ledger, M.reserveAttempt(P, ledger, 'training', attemptOptions()), {success: false, recovery: true, elapsed: 500});
  assert.equal(M.validateAttemptLedger(P, ledger).training_elapsed_ms, 500);
  assert.throws(() => M.reserveAttempt(P, ledger, 'training', attemptOptions()), /durable checkpoint/);
  const cp = first.recovery_checkpoint; writeFileSync(cp.path, 'changed');
  assert.throws(() => M.reserveAttempt(P, ledger, 'training', {...attemptOptions(), resume_checkpoint: cp}), /resume checkpoint/);
  writeFileSync(cp.path, 'synthetic checkpoint bytes ' + first.index);
  const second = M.reserveAttempt(P, ledger, 'training', {...attemptOptions(), resume_checkpoint: cp});
  assert.equal(second.argv.at(-1), '--resume');
  syntheticFinish(P, ledger, second, {success: false, recovery: true, elapsed: 400});
  assert.equal(M.validateAttemptLedger(P, ledger).training_elapsed_ms, 900);
  assert.throws(() => M.reserveAttempt(P, ledger, 'training', {...attemptOptions(), resume_checkpoint: second.recovery_checkpoint}), /budget/);
});
test('all failed/interrupted training time counts and uncertain accounting refuses', () => {
  const {P, ledger} = ledgerFixture(); successfulGate(P, ledger);
  const first = syntheticFinish(P, ledger, M.reserveAttempt(P, ledger, 'training', attemptOptions(M.CAPS.training)), {success: false, recovery: true, elapsed: M.CAPS.training});
  assert.throws(() => M.reserveAttempt(P, ledger, 'training', {...attemptOptions(1), resume_checkpoint: first.recovery_checkpoint}), /aggregate/);
  ledger.trajectories['J-s0'].training_elapsed_ms = 0;
  assert.throws(() => M.validateAttemptLedger(P, ledger), /counter/);
});
test('verdict validates every attempt, including earlier failed receipt and identity forgery', () => {
  const {P, ledger} = ledgerFixture(); successfulGate(P, ledger);
  const first = syntheticFinish(P, ledger, M.reserveAttempt(P, ledger, 'training', attemptOptions()), {success: false, recovery: true});
  syntheticFinish(P, ledger, M.reserveAttempt(P, ledger, 'training', {...attemptOptions(), resume_checkpoint: first.recovery_checkpoint}), {full: true});
  syntheticFinish(P, ledger, M.reserveAttempt(P, ledger, 'export', {timeout_ms: 1000}));
  ledger.trajectories['J-s0'].state = 'complete';
  assert.equal(M.validateAttemptLedger(P, ledger, {requireComplete: true}).pass, true);
  const old = readFileSync(first.receipt, 'utf8'), forged = JSON.parse(old); forged.scope = 'source-harness-fixture'; put(first.receipt, forged); first.sha256 = M.hash(first.receipt);
  assert.throws(() => M.validateAttemptLedger(P, ledger, {requireComplete: true}), /fixture/);
  writeFileSync(first.receipt, old); first.sha256 = M.hash(first.receipt);
  const before = first.argv; first.argv = ['echo', 'fake'];
  assert.throws(() => M.validateAttemptLedger(P, ledger, {requireComplete: true}), /argv/); first.argv = before;
  const cp = first.recovery_checkpoint; delete first.recovery_checkpoint;
  assert.throws(() => M.validateAttemptLedger(P, ledger, {requireComplete: true}), /checkpoint/); first.recovery_checkpoint = cp;
  const contradicted = JSON.parse(old); contradicted.exit_status = 0; contradicted.signal = null; contradicted.error = null; put(first.receipt, contradicted); first.sha256 = M.hash(first.receipt);
  assert.throws(() => M.validateAttemptLedger(P, ledger, {requireComplete: true}), /supervisor status/);
  writeFileSync(first.receipt, old); first.sha256 = M.hash(first.receipt);
  assert.throws(() => M.validateAttemptLedger({...P, sha256: 'changed'}, ledger), /identity/);
});
test('historical training provenance is preserved but every current inference source remains required', () => {
  const root = mkdtempSync(resolve(ROOT, 'sources-')), file = resolve(root, 'inference.mjs'); writeFileSync(file, 'original inference');
  const recorded = {'inference.mjs': M.hash(file)};
  assert.ok(M.inferenceSourceChecks(recorded, ['inference.mjs'], root).every(c => c.ok));
  assert.ok(M.inferenceSourceChecks(recorded, ['inference.mjs', 'missing.mjs'], root).some(c => !c.ok));
  writeFileSync(file, 'changed inference'); assert.ok(M.inferenceSourceChecks(recorded, ['inference.mjs'], root).some(c => !c.ok));
  assert.ok(M.inferenceSourceChecks({}, ['inference.mjs'], root).some(c => !c.ok));
});
test('historical checkpoint/export provenance survives trainer edits and rejects changed historical bytes', () => {
  const root = mkdtempSync(resolve(ROOT, 'historical-')), run = resolve(root, 'run'), model = resolve(root, 'model'); mkdirSync(run); mkdirSync(model);
  const checkpoint = resolve(run, 'checkpoint.pt'); writeFileSync(checkpoint, 'synthetic historical weights');
  const metadata = {base:'pinned', revision:'original', settings:{seed:0}, tokenization:'original', sources:{'trainer.py':'old-source-hash'}};
  const complete = resolve(run, 'complete.json'), config = resolve(model, 'config.json'), receipt = resolve(model, 'arm_receipt.json');
  put(complete, {metadata, state:{update:100,total:100}}); put(config, {reader:{training_provenance:metadata}});
  put(receipt, {source_changes_since_training:[], weights:{source_file:'checkpoint.pt',sha256:M.hash(checkpoint),update:100,total:100,full_schedule:true,source_changes_since_training:[]}});
  const compatibility = resolve(root, 'compatibility.json'); put(compatibility, {historical_training:{'F-s0':{metadata,complete_sha256:M.hash(complete),config_sha256:M.hash(config),export_receipt_sha256:M.hash(receipt)}}});
  const P = {arms:{'F-s0':{training:run,model}},compatibility:{path:compatibility},inputs:Object.fromEntries([complete,config,receipt,checkpoint].map(p=>[p,M.hash(p)])),sources:{'trainer.py':'new-source-hash'}};
  assert.deepEqual(M.historicalProvenance(P,'F-s0').sources, {'trainer.py':'old-source-hash'});
  writeFileSync(checkpoint, 'changed historical weights'); assert.throws(()=>M.historicalProvenance(P,'F-s0'), /checkpoint\/export/);
});
test('unavailable cached inference applicability refuses before trajectory reservation or model work', () => {
  const root = mkdtempSync(resolve(ROOT, 'unavailable-control-'));
  const P = {task_root: root}; let seen = [];
  assert.throws(() => M.prepareTrajectory(P, 'J-s0', {cached: (_, name) => {seen.push(name); return {pass: name !== 'C100-s0'};}}), /C100-s0.*no budget\/model work/);
  assert.deepEqual(seen, ['F-s0', 'W-s0', 'B-s0', 'C100-s0']);
  assert.deepEqual(readdirSync(root), []);
});
test('missing independent source review refuses before trajectory reservation even when controls pass', () => {
  const root = mkdtempSync(resolve(ROOT, 'missing-review-'));
  assert.throws(() => M.prepareTrajectory({task_root: root}, 'J-s0', {cached: () => ({pass: true}), fixtures: () => ({ok: true})}), /independent source review/);
  assert.deepEqual(readdirSync(root), []);
});
test('joint J0 rejects wrong fill, spurious absent class, wrong action/tag and substituted/duplicate observation', () => {
  const root = mkdtempSync(resolve(ROOT, 'joint-')), names = ['color', 'outline', ...Array.from({length: 50}, (_, i) => 'h' + i)], layout = {classes: names.map(n => [n, ['absent', 'red']])};
  const selected = Array.from({length: 89}, (_, i) => ({observation: i, request: i, ordinal: i, id: 'id' + i, text: 'text' + i, targets: [+(i < 57), 1, ...Array(50).fill(0)], act: 'create', tags: ['O']}));
  const groups = {fill_outline: Array.from({length: 57}, (_, i) => i), outline_without_fill: Array.from({length: 32}, (_, i) => i + 57)};
  const s = resolve(root, 'selected.json'), p = resolve(root, 'populations.json'); put(s, selected); put(p, groups);
  const P = {joint_selections: {path: s, sha256: M.hash(s)}, joint_populations: {path: p, sha256: M.hash(p)}};
  const rows = () => selected.map(g => ({...g, python: {classes: Object.fromEntries(names.map((n, i) => [n, g.targets[i]])), act: g.act, tags: [...g.tags]}}));
  assert.ok(M.jointChecks(P, rows(), 'python', layout).every(c => c.ok));
  for (const mutate of [r => {r[0].python.classes.color = 0;}, r => {r[0].python.classes.h0 = 1;}, r => {r[0].python.act = 'set';}, r => {r[0].python.tags = ['B'];}, r => {r[57].python.tags = ['B'];}, r => {r[0].ordinal = 1;}, r => {r[0].text = 'replacement';}]) {
    const r = rows(); mutate(r); assert.ok(M.jointChecks(P, r, 'python', layout).some(c => !c.ok));
  }
  const duplicate = rows(); duplicate[88] = duplicate[87]; assert.throws(() => M.jointChecks(P, duplicate, 'python', layout), /duplicate/);
});
test('80-request fill/outline diagnostic preserves denominator and never substitutes for complete commands', () => {
  const records = Array.from({length: 80}, (_, i) => ({id: 'r' + i, goldSpans: [{want: {action: 'create', color: 'red', outline: 'blue'}}], produced: [{g: 0, got: {action: 'create', color: 'red', outline: 'blue', shape: 'wrong-shape'}}]}));
  const population = records.map(r => ({id: r.id, wires: [0]}));
  assert.deepEqual(M.outlineCounts(records, population), {requested: 80, fill: 80, outline: 80, joint: 80});
  records[0].produced[0].got.color = 'blue'; records[1].produced = [];
  assert.deepEqual(M.outlineCounts(records, population), {requested: 80, fill: 78, outline: 79, joint: 78});
  assert.throws(() => M.outlineCounts(records, population.slice(1)), /80-request/);
  assert.throws(() => M.outlineCounts(records, [...population.slice(0,79), population[0]]), /duplicate/);
});
test('confirmation and alternate seeds remain unregistered even with perfect numerical fixtures', () => {
  for (const stage of ['confirmation', 'control1', 'seed1']) assert.throws(() => M.numericalRows(stage, good(), oracle), /only seed0/);
  for (const args of [['J','1'], ['W','0'], ['F','1']]) assert.notEqual(spawnSync('bash', [resolve(Base.HERE, 'modernbert_request_weight_train.sh'), ...args]).status, 0);
});
test('preserving F lower case but losing >2 points against fixed B fails', () => {
  const L = good(); for (const n of ['J-s0', 'F-s0']) L[n].bundle.score.populations.lowercase_other_affected.ungated.right_share = .8;
  const rows = M.numericalRows('seed0', L, oracle);
  assert.equal(rows.find(r => r.id === 'R3:J-s0:F-s0').pass, true);
  assert.equal(rows.find(r => r.id === 'R3:J-s0:B-s0').pass, false);
});
test('preserving F risk but exceeding fixed B risk fails independently', () => {
  const L = good(); for (const n of ['J-s0', 'F-s0']) L[n].bundle.score.populations.t1_clean.gated.risk = .03;
  const rows = M.numericalRows('seed0', L, oracle);
  assert.equal(rows.find(r => r.id === 'R3:J-s0:F-s0').pass, true); assert.equal(rows.find(r => r.id === 'R3:J-s0:B-s0').pass, false);
});
test('zero executions, unsupported population, missing interval and empty-label false passes fail', () => {
  for (const alter of [
    L => { L['J-s0'].bundle.score.populations.t1_clean.gated.executed = 0; },
    L => { L['J-s0'].bundle.score.population_support.t1_clean_outline_set.supported = false; },
    L => { delete L['J-s0'].bundle.sidecar['t1_all/all#t1_clean']; },
    L => { L['J-s0'].bundle.score.label_errors.gated_empty_label_on_nonempty_gold = 1; },
    L => { L['J-s0'].bundle.score.populations.t1_clean_outline_set.ungated.right_share = .1; }
  ]) { const L = good(); alter(L); assert.equal(M.numericalRows('seed0', L, oracle).every(r => r.pass), false); }
});
test('handwritten and dir-less pass files cannot unlock a stage', () => {
  const file = resolve(ROOT, 'pass.json'); put(file, { pass: true, stage: 'seed0' });
  assert.throws(() => M.checkPass({ sha256: 'x' }, 'seed0', file), /handwritten/);
});
test('runner rejects unregistered invocation and has explicit finite deadline', () => {
  const script = resolve(Base.HERE, 'modernbert_request_weight_train.sh');
  assert.notEqual(spawnSync('bash', [script, 'J', '2'], { encoding: 'utf8' }).status, 0);
  const r = spawnSync('bash', [script, 'J', '0'], { env: { ...process.env, STOP_AT: '' }, encoding: 'utf8' }); assert.notEqual(r.status, 0); assert.match(r.stderr, /STOP_AT/);
});
test('occupied synthetic budget/run/GPU locks refuse contenders without killing holder', async () => {
  for (const name of ['budget', 'run', 'GPU-test']) {
    const file = resolve(ROOT, name + '.lock'), holder = spawn('flock', ['-n', file, 'node', '-e', "console.log('locked');setTimeout(()=>{},300)"], { stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((ok, fail) => { holder.stdout.once('data', ok); holder.once('error', fail); });
    const contender = spawnSync('flock', ['-n', file, 'true']); assert.notEqual(contender.status, 0); assert.equal(M.lockAvailable(file), false); assert.equal(holder.exitCode, null);
    await new Promise(ok => holder.once('exit', ok));
    assert.equal(M.lockAvailable(file), true);
  }
  assert.throws(() => M.requireRunnerLocks(ROOT, 'J-s0'));
});
test('runner verifies inherited exclusive locks, rather than an environment stamp', () => {
  const r = spawnSync('bash', ['-c', 'mkdir -p "$1/J-s0"; exec 8>"$1/budget.lock"; flock -n 8; exec 9>"$1/J-s0/.trajectory.lock"; flock -n 9; exec node --input-type=module -e \'const m=await import(process.argv[2]);m.requireRunnerLocks(process.argv[3],"J-s0");\' lock-check "$2" "$1"', 'lock-test', ROOT, resolve(M.HERE, 'modernbert_request_weight_measure.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
test('fixture receipts relabeled as learned fit cannot supply R0 observations', () => {
  const root = resolve(ROOT, 'fake-fit'), dir = resolve(root, 'J-s0/fit-float'); mkdirSync(dir, { recursive: true });
  put(resolve(dir, 'receipt.json'), { schema: 'modernbert-request-weight-fit-v1', scope: 'perfect-label-fixture', name: 'J-s0', runtime: 'float' }); put(resolve(dir, 'summary.json'), { passed: true });
  assert.throws(() => M.fitRows({ task_root: root }, 'J-s0'), /fit evidence:|ENOENT|undefined/);
});
test('resource timeout has a non-success status and preserved signal/reason', () => {
  const source = resolve(ROOT, 'timeout.mjs'); writeFileSync(source, 'setTimeout(()=>{},10000)');
  const r = M.execute({ argv: [process.execPath, source], cwd: ROOT, inputs: [source], sources: [source], out: resolve(ROOT, 'timed-out'), scope: 'perfect-label-fixture', timeout: 250 });
  assert.ok(r.exit_status !== 0 || r.signal); assert.match(r.error, /deadline/); assert.equal(M.countFixture(r), 0);
});

const runnerRoot = name => { const root = resolve(ROOT, name); mkdirSync(resolve(root, 'frozen'), { recursive: true }); writeFileSync(resolve(root, 'task-owner.txt'), 'test-owned\n'); put(resolve(root, 'frozen/protocol.json'), {}); return root; };
test('output and ledger paths reject ancestor, final-directory and dangling symlinks', () => {
  const root = runnerRoot('owned-paths'), outside = resolve(ROOT, 'outside-paths'); mkdirSync(outside);
  for (const name of ['ancestor', 'final']) symlinkSync(outside, resolve(root, name), 'dir');
  symlinkSync(resolve(outside, 'missing'), resolve(root, 'dangling'));
  for (const path of [resolve(root, 'ancestor/new'), resolve(root, 'final'), resolve(root, 'dangling')]) {
    assert.throws(() => M.claim({ task_root: root }, path, { id: 1 }), /symlink/);
    assert.throws(() => M.execute({ argv: ['echo', 'no'], inputs: [], sources: [], out: path, scope: 'perfect-label-fixture', timeout: 1000 }), /symlink/);
  }
  const sentinel = resolve(outside, 'sentinel'); writeFileSync(sentinel, 'preserve'); symlinkSync(sentinel, resolve(root, 'budget.json'));
  assert.throws(() => M.reserveTrajectory({ task_root: root, arms: { 'J-s0': {arm:'J',seed:0} } }, 'J-s0'), /symlink/);
  assert.equal(readFileSync(sentinel, 'utf8'), 'preserve'); assert.deepEqual(readdirSync(outside), ['sentinel']);
});
test('runner rejects linked root/work/lock files before mkdir and never truncates ordinary locks', () => {
  const outside = resolve(ROOT, 'runner-outside'); mkdirSync(outside); const sentinel = resolve(outside, 'sentinel'); writeFileSync(sentinel, 'unchanged');
  const cases = [
    ['root-link', root => { const alias = resolve(ROOT, 'root-alias'); symlinkSync(root, alias, 'dir'); return alias; }],
    ['work-link', root => { symlinkSync(outside, resolve(root, 'J-s0'), 'dir'); return root; }],
    ['budget-link', root => { symlinkSync(sentinel, resolve(root, 'budget.lock')); return root; }],
    ['cpu-link', root => { symlinkSync(sentinel, resolve(root, 'cpu.lock')); return root; }],
    ['run-lock-link', root => { mkdirSync(resolve(root, 'J-s0')); symlinkSync(sentinel, resolve(root, 'J-s0/.trajectory.lock')); return root; }]
  ];
  for (const [name, mutate] of cases) { const root = runnerRoot(name), selected = mutate(root); assert.throws(() => M.prepareRunner(selected, 'J-s0'), /symlink/); assert.equal(readFileSync(sentinel, 'utf8'), 'unchanged'); }
  const root = runnerRoot('ordinary-locks'); writeFileSync(resolve(root, 'budget.lock'), 'budget-content'); mkdirSync(resolve(root, 'J-s0')); writeFileSync(resolve(root, 'J-s0/.trajectory.lock'), 'trajectory-content');
  const fds = M.prepareRunner(root, 'J-s0'); closeSync(fds.budget); closeSync(fds.trajectory);
  assert.equal(readFileSync(resolve(root, 'budget.lock'), 'utf8'), 'budget-content'); assert.equal(readFileSync(resolve(root, 'J-s0/.trajectory.lock'), 'utf8'), 'trajectory-content');
  assert.deepEqual(readdirSync(outside), ['sentinel']);
});
test('actual shell wrapper preserves sentinels with explicit copied task paths', () => {
  const stop = new Date(Date.now() + 3600000), pad = n => String(n).padStart(2, '0'), stopAt = `${stop.getFullYear()}-${pad(stop.getMonth() + 1)}-${pad(stop.getDate())} ${pad(stop.getHours())}:${pad(stop.getMinutes())}`;
  for (const kind of ['budget', 'work', 'cpu']) {
    const root = runnerRoot('shell-' + kind), outside = resolve(ROOT, 'shell-outside-' + kind), copy = resolve(ROOT, 'shell-source-' + kind); mkdirSync(outside); mkdirSync(copy);
    const sentinel = resolve(outside, 'sentinel'); writeFileSync(sentinel, 'shell-sentinel');
    if (kind === 'work') symlinkSync(outside, resolve(root, 'J-s0'), 'dir'); else symlinkSync(sentinel, resolve(root, kind + '.lock'));
    copyMeasure(resolve(copy, 'modernbert_request_weight_measure.mjs'), root); writeFileSync(resolve(copy, 'modernbert_request_weight_train.sh'), readFileSync(resolve(Base.HERE, 'modernbert_request_weight_train.sh')));
    const result = spawnSync('bash', [resolve(copy, 'modernbert_request_weight_train.sh'), 'J', '0'], { env: { ...process.env, STOP_AT: stopAt }, encoding: 'utf8', timeout: 10000 });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /symlink/); assert.equal(readFileSync(sentinel, 'utf8'), 'shell-sentinel'); assert.deepEqual(readdirSync(outside), ['sentinel']);
  }
});
test('post-command stdout-log symlink is refused before outside sentinel writes', () => {
  const source = resolve(ROOT, 'redirect-log.mjs'), out = resolve(ROOT, 'redirected-execution'), sentinel = resolve(ROOT, 'log-sentinel'); writeFileSync(sentinel, 'keep-log');
  writeFileSync(source, `import fs from 'node:fs';fs.symlinkSync(${JSON.stringify(sentinel)},${JSON.stringify(resolve(out, 'stdout.log'))});console.log('forged');`);
  assert.throws(() => M.execute({ argv: [process.execPath, source], cwd: ROOT, inputs: [source], sources: [source], out, scope: 'perfect-label-fixture', timeout: 5000 }), /symlink/);
  assert.equal(readFileSync(sentinel, 'utf8'), 'keep-log');
});
test('direct internal CPU/evaluation/resource workers refuse before protocol or output work', () => {
  for (const command of ['cpu-evidence', 'cpu-evaluate', 'cpu-verdict', 'evaluate-worker', 'verdict-worker', 'resource-worker']) {
    const result = spawnSync(process.execPath, [resolve(M.HERE, 'modernbert_request_weight_measure.mjs'), command, '--protocol', resolve(ROOT, 'nonexistent-protocol.json')], { encoding: 'utf8', timeout: 10000 });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /CPU lock|fd\/6|resource context|EBADF|ENOENT/); assert.ok(!result.stderr.includes('nonexistent-protocol.json'));
  }
  assert.throws(() => M.requireCpuLock(ROOT), /CPU lock/); assert.throws(() => M.requireResourceContext());
});
test('resource guards use frozen 8/2 GPU and 12/4 CPU limits', () => {
  for (const scope of ['actual-model-training', 'actual-model-overfit']) assert.deepEqual(M.resourceLimits(scope), { phase: 'gpu-training', rss_limit_bytes: 8 * 1024 ** 3, available_floor_bytes: 2 * 1024 ** 3 });
  for (const scope of ['actual-model-evaluation', 'actual-model-export', 'actual-model-root-causes', 'source-harness-fixture']) assert.deepEqual(M.resourceLimits(scope), { phase: 'cpu', rss_limit_bytes: 12 * 1024 ** 3, available_floor_bytes: 4 * 1024 ** 3 });
});
test('normal CPU and resource descriptors reach a supervised child; CPU ownership alone cannot unlock evaluation', () => {
  const root = runnerRoot('supervised-context'), module = resolve(root, 'measure.mjs'), child = resolve(root, 'guarded-child.mjs'), parent = resolve(root, 'guarded-parent.mjs'); copyMeasure(module, root);
  writeFileSync(child, `import * as m from ${JSON.stringify(pathToFileURL(module).href)};m.requireCpuLock();m.requireResourceContext();console.log('supervised');`);
  writeFileSync(parent, `import assert from 'node:assert/strict';import * as m from ${JSON.stringify(pathToFileURL(module).href)};m.requireCpuLock();const r=m.execute({argv:[process.execPath,${JSON.stringify(child)}],cwd:${JSON.stringify(root)},inputs:[${JSON.stringify(child)}],sources:[${JSON.stringify(module)}],out:${JSON.stringify(resolve(root, 'execution'))},scope:'actual-model-evaluation',timeout:5000});assert.equal(r.exit_status,0,JSON.stringify(r));assert.equal(r.error,null);assert.equal(r.resource_guard.available_floor_bytes,4*1024**3);`);
  const good = spawnSync('bash', ['-c', 'exec 7<>"$1/cpu.lock"; flock -n 7 || exit 75; exec node "$2"', 'context-test', root, parent], { encoding: 'utf8', timeout: 10000 }); assert.equal(good.status, 0, good.stderr);
  const direct = spawnSync('bash', ['-c', 'exec 7<>"$1/cpu.lock"; flock -n 7 || exit 75; exec node "$2" evaluate-worker --protocol "$1/frozen/protocol.json"', 'context-test', root, module], { encoding: 'utf8', timeout: 10000 });
  assert.notEqual(direct.status, 0); assert.match(direct.stderr, /fd\/6|resource context|exclusive budget|ENOENT/); assert.ok(!direct.stderr.includes('a frozen rare-head protocol'));
});
test('echo receipt with 1699 perfect-label observations and one synthetic batch cannot pass learned fit', () => {
  const root = runnerRoot('echo-fit'), data = resolve(root, 'data'); mkdirSync(data); put(resolve(data, 'reader.json'), { classes: [['h', ['none', 'yes']]], tags: ['O'], acts: ['create'] });
  const selections = Array.from({ length: 1699 }, (_, ordinal) => ({ arm: 'F', ordinal, head: 'h', targets: [1] }));
  put(resolve(root, 'selections.json'), { selections }); const populations = Object.fromEntries(Object.entries({ outline_create: 89, outline_coloured_create: 74, outline_set: 97, desc_r2: 35, desc_r2_canonical: 21, count_size: 14, absent_controls: 1440 }).map(([name, n]) => [name, Array.from({ length: n }, (_, i) => i)])); put(resolve(root, 'populations.json'), populations);
  writeFileSync(resolve(root, 'input'), 'input'); writeFileSync(resolve(root, 'source'), 'source'); const protocol = resolve(root, 'frozen/protocol.json'), inputs = { [resolve(root, 'input')]: M.hash(resolve(root, 'input')) }, sources = { [resolve(root, 'source')]: M.hash(resolve(root, 'source')) }, identities = { ...inputs, ...sources, [protocol]: M.hash(protocol) };
  const read = { truncated: false, unreadFrom: null, head_index: 1, target_index: 1, classes: { h: 1 }, act: 'create', tags: ['O'] }, rows = selections.map((s, observation) => ({ ...s, observation, python: read, node: read }));
  const raw = { seq_logits: { dims: [1, 3], data: [0, 0, 0] }, token_logits: { dims: [1, 2, 1], data: [0, 0] }, cut_logits: { dims: [1, 2, 3], data: [0, 0, 0, 0, 0, 0] } };
  for (const runtime of ['float', 'ort']) {
    const dir = resolve(root, 'J-s0/fit-' + runtime); mkdirSync(dir, { recursive: true }); writeFileSync(resolve(dir, 'rows.jsonl'), rows.map(JSON.stringify).join('\n') + '\n');
    put(resolve(dir, 'summary.json'), { populations: Object.fromEntries(Object.entries(populations).map(([name, ids]) => [name, { rows: ids.length, correct: ids.length }])) }); writeFileSync(resolve(dir, 'batches.jsonl'), JSON.stringify({ python: raw, node: raw, input: { arrays: { input_ids: [[1, 0]], attention_mask: [[1, 0]] } } }) + '\n');
    const outputs = Object.fromEntries(['rows.jsonl', 'summary.json', 'batches.jsonl'].map(p => [p, M.hash(resolve(dir, p))]));
    put(resolve(dir, 'receipt.json'), { version: 'modernbert-request-weight-fit-v1', scope: 'actual-model-training-fit', name: 'J-s0', runtime, protocol: { path: protocol, sha256: M.hash(protocol) }, identities_before: identities, identities_after: identities, execution: { argv: ['echo', 'perfect-label-fixture'], cwd: root, exit_code: 0, timeout_seconds: 1, started: 1, ended: 1 }, outputs });
  }
  const P = { task_root: root, file: protocol, sha256: M.hash(protocol), inputs, sources, selections: { path: resolve(root, 'selections.json'), populations: { path: resolve(root, 'populations.json') } }, arms: { 'J-s0': { arm: 'W', seed: 0, train_data: data, model: resolve(root, 'missing-model'), training: resolve(root, 'missing-run') } } };
  assert.equal(existsSync(P.arms['J-s0'].model), false); assert.equal(existsSync(P.arms['J-s0'].training), false); assert.throws(() => M.fitRows(P, 'J-s0'), /fit evidence:|ENOENT/);
});
