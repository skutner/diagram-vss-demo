// All fixtures and lock probes are confined to a fresh measure-dev child.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, symlinkSync, existsSync, closeSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import * as M from './modernbert_rare_heads_measure.mjs';
import * as F from './modernbert_forms_measure.mjs';

const ROOT = mkdtempSync(resolve(M.TASK, 'measure-dev/test-'));
const put = (p, obj) => writeFileSync(p, JSON.stringify(obj));
function copyMeasure(target, root) {
  let source = readFileSync(resolve(M.HERE, 'modernbert_rare_heads_measure.mjs'), 'utf8');
  source = source.replace(/from '([^']+)'/g, (all, p) => p.startsWith('.') ? `from '${pathToFileURL(resolve(M.HERE, p)).href}'` : all).replace(/^export const TASK = .*;$/m, `export const TASK = ${JSON.stringify(root)};`).replace("REPO = resolve(HERE, '../../..')", `REPO = ${JSON.stringify(M.REPO)}`);
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
const good = () => Object.fromEntries(['W-s0', 'F-s0', 'B-s0', 'C100-s0'].map(n => [n, { bundle: bundle(n, { right: n === 'W-s0' ? 2 : 1 }) }]));
const oracle = F.chkBool('separate oracle fixture', true);
test('seed0 compares W to F and B with all three full-view Guard G comparators', () => {
  const L = good(), rows = M.numericalRows('seed0', L, oracle);
  assert.ok(rows.length > 0 && rows.every(r => r.pass), JSON.stringify(rows.flatMap(r => r.checks.filter(c => !c.ok))));
  assert.deepEqual(rows.filter(r => r.id.startsWith('R1')).map(r => r.id), ['R1:W-s0:F-s0', 'R1:W-s0:B-s0']);
  const names = rows.filter(r => r.id.startsWith('R3')).flatMap(r => r.checks.map(c => c.name)).join('\n');
  for (const c of ['F-s0', 'B-s0', 'C100-s0']) assert.ok(names.includes('vs ' + c));
});
test('preserving F lower case but losing >2 points against fixed B fails', () => {
  const L = good(); for (const n of ['W-s0', 'F-s0']) L[n].bundle.score.populations.lowercase_other_affected.ungated.right_share = .8;
  const rows = M.numericalRows('seed0', L, oracle);
  assert.equal(rows.find(r => r.id === 'R3:W-s0:F-s0').pass, true);
  assert.equal(rows.find(r => r.id === 'R3:W-s0:B-s0').pass, false);
});
test('preserving F risk but exceeding fixed B risk fails independently', () => {
  const L = good(); for (const n of ['W-s0', 'F-s0']) L[n].bundle.score.populations.t1_clean.gated.risk = .03;
  const rows = M.numericalRows('seed0', L, oracle);
  assert.equal(rows.find(r => r.id === 'R3:W-s0:F-s0').pass, true); assert.equal(rows.find(r => r.id === 'R3:W-s0:B-s0').pass, false);
});
test('zero executions, unsupported population, missing interval and empty-label false passes fail', () => {
  for (const alter of [
    L => { L['W-s0'].bundle.score.populations.t1_clean.gated.executed = 0; },
    L => { L['W-s0'].bundle.score.population_support.t1_clean_outline_set.supported = false; },
    L => { delete L['W-s0'].bundle.sidecar['t1_all/all#t1_clean']; },
    L => { L['W-s0'].bundle.score.label_errors.gated_empty_label_on_nonempty_gold = 1; },
    L => { L['W-s0'].bundle.score.populations.t1_clean_outline_set.ungated.right_share = .1; }
  ]) { const L = good(); alter(L); assert.equal(M.numericalRows('seed0', L, oracle).every(r => r.pass), false); }
});
test('budget accepts exactly registered trajectories and only identical recovery', () => {
  const root = resolve(ROOT, 'ledger'); mkdirSync(root);
  const P = { task_root: root, sha256: 'frozen', arms: Object.fromEntries(M.NEW.map(name => [name, { arm: name[0], seed: Number(name.at(-1)) }])), sources: { source: 'x' }, inputs: { data: 'y' }, loss_manifest: { sha256: 'z' } };
  for (const name of M.NEW) M.reserveTrajectory(P, name);
  assert.equal(Object.keys(JSON.parse(readFileSync(resolve(root, 'budget.json'))).trajectories).length, 3);
  M.reserveTrajectory(P, 'W-s0'); assert.throws(() => M.reserveTrajectory(P, 'W-s2'), /only/);
  assert.throws(() => M.reserveTrajectory({ ...P, sha256: 'changed' }, 'W-s0'), /identity/);
  const ledger = JSON.parse(readFileSync(resolve(root, 'budget.json'))); ledger.trajectories['W-s0'].state = 'quality-failed'; put(resolve(root, 'budget.json'), ledger);
  assert.throws(() => M.reserveTrajectory(P, 'W-s0'), /quality failure/);
});
test('handwritten and dir-less pass files cannot unlock a stage', () => {
  const file = resolve(ROOT, 'pass.json'); put(file, { pass: true, stage: 'seed0' });
  assert.throws(() => M.checkPass({ sha256: 'x' }, 'seed0', file), /handwritten/);
});
test('runner rejects unregistered invocation and has explicit finite deadline', () => {
  const script = resolve(M.HERE, 'modernbert_rare_heads_train.sh');
  assert.notEqual(spawnSync('bash', [script, 'W', '2'], { encoding: 'utf8' }).status, 0);
  const r = spawnSync('bash', [script, 'W', '0'], { env: { ...process.env, STOP_AT: '' }, encoding: 'utf8' }); assert.notEqual(r.status, 0); assert.match(r.stderr, /STOP_AT/);
});
test('occupied synthetic budget/run/GPU locks refuse contenders without killing holder', async () => {
  for (const name of ['budget', 'run', 'GPU-test']) {
    const file = resolve(ROOT, name + '.lock'), holder = spawn('flock', ['-n', file, 'node', '-e', "console.log('locked');setTimeout(()=>{},300)"], { stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((ok, fail) => { holder.stdout.once('data', ok); holder.once('error', fail); });
    const contender = spawnSync('flock', ['-n', file, 'true']); assert.notEqual(contender.status, 0); assert.equal(M.lockAvailable(file), false); assert.equal(holder.exitCode, null);
    await new Promise(ok => holder.once('exit', ok));
    assert.equal(M.lockAvailable(file), true);
  }
  assert.throws(() => M.requireRunnerLocks(ROOT, 'W-s0'));
});
test('runner verifies inherited exclusive locks, rather than an environment stamp', () => {
  const r = spawnSync('bash', ['-c', 'mkdir -p "$1/W-s0"; exec 8>"$1/budget.lock"; flock -n 8; exec 9>"$1/W-s0/.trajectory.lock"; flock -n 9; exec node --input-type=module -e \'const m=await import(process.argv[2]);m.requireRunnerLocks(process.argv[3],"W-s0");\' lock-check "$2" "$1"', 'lock-test', ROOT, resolve(M.HERE, 'modernbert_rare_heads_measure.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
test('fixture receipts relabeled as learned fit cannot supply R0 observations', () => {
  const root = resolve(ROOT, 'fake-fit'), dir = resolve(root, 'W-s0/fit-float'); mkdirSync(dir, { recursive: true });
  put(resolve(dir, 'receipt.json'), { schema: 'modernbert-rare-heads-fit-v1', scope: 'perfect-label-fixture', name: 'W-s0', runtime: 'float' }); put(resolve(dir, 'summary.json'), { passed: true });
  assert.throws(() => M.fitRows({ task_root: root }, 'W-s0'), /fit evidence:|ENOENT|undefined/);
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
  assert.throws(() => M.reserveTrajectory({ task_root: root, arms: { 'W-s0': {} } }, 'W-s0'), /symlink/);
  assert.equal(readFileSync(sentinel, 'utf8'), 'preserve'); assert.deepEqual(readdirSync(outside), ['sentinel']);
});
test('runner rejects linked root/work/lock files before mkdir and never truncates ordinary locks', () => {
  const outside = resolve(ROOT, 'runner-outside'); mkdirSync(outside); const sentinel = resolve(outside, 'sentinel'); writeFileSync(sentinel, 'unchanged');
  const cases = [
    ['root-link', root => { const alias = resolve(ROOT, 'root-alias'); symlinkSync(root, alias, 'dir'); return alias; }],
    ['work-link', root => { symlinkSync(outside, resolve(root, 'W-s0'), 'dir'); return root; }],
    ['budget-link', root => { symlinkSync(sentinel, resolve(root, 'budget.lock')); return root; }],
    ['cpu-link', root => { symlinkSync(sentinel, resolve(root, 'cpu.lock')); return root; }],
    ['run-lock-link', root => { mkdirSync(resolve(root, 'W-s0')); symlinkSync(sentinel, resolve(root, 'W-s0/.trajectory.lock')); return root; }]
  ];
  for (const [name, mutate] of cases) { const root = runnerRoot(name), selected = mutate(root); assert.throws(() => M.prepareRunner(selected, 'W-s0'), /symlink/); assert.equal(readFileSync(sentinel, 'utf8'), 'unchanged'); }
  const root = runnerRoot('ordinary-locks'); writeFileSync(resolve(root, 'budget.lock'), 'budget-content'); mkdirSync(resolve(root, 'W-s0')); writeFileSync(resolve(root, 'W-s0/.trajectory.lock'), 'trajectory-content');
  const fds = M.prepareRunner(root, 'W-s0'); closeSync(fds.budget); closeSync(fds.trajectory);
  assert.equal(readFileSync(resolve(root, 'budget.lock'), 'utf8'), 'budget-content'); assert.equal(readFileSync(resolve(root, 'W-s0/.trajectory.lock'), 'utf8'), 'trajectory-content');
  assert.deepEqual(readdirSync(outside), ['sentinel']);
});
test('actual shell wrapper preserves sentinels with explicit copied task paths', () => {
  const stop = new Date(Date.now() + 3600000), pad = n => String(n).padStart(2, '0'), stopAt = `${stop.getFullYear()}-${pad(stop.getMonth() + 1)}-${pad(stop.getDate())} ${pad(stop.getHours())}:${pad(stop.getMinutes())}`;
  for (const kind of ['budget', 'work', 'cpu']) {
    const root = runnerRoot('shell-' + kind), outside = resolve(ROOT, 'shell-outside-' + kind), copy = resolve(ROOT, 'shell-source-' + kind); mkdirSync(outside); mkdirSync(copy);
    const sentinel = resolve(outside, 'sentinel'); writeFileSync(sentinel, 'shell-sentinel');
    if (kind === 'work') symlinkSync(outside, resolve(root, 'W-s0'), 'dir'); else symlinkSync(sentinel, resolve(root, kind + '.lock'));
    copyMeasure(resolve(copy, 'modernbert_rare_heads_measure.mjs'), root); writeFileSync(resolve(copy, 'modernbert_rare_heads_train.sh'), readFileSync(resolve(M.HERE, 'modernbert_rare_heads_train.sh')));
    const result = spawnSync('bash', [resolve(copy, 'modernbert_rare_heads_train.sh'), 'W', '0'], { env: { ...process.env, STOP_AT: stopAt }, encoding: 'utf8', timeout: 10000 });
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
  for (const command of ['cpu-evidence', 'cpu-evaluate', 'evaluate-worker', 'resource-worker']) {
    const result = spawnSync(process.execPath, [resolve(M.HERE, 'modernbert_rare_heads_measure.mjs'), command, '--protocol', resolve(ROOT, 'nonexistent-protocol.json')], { encoding: 'utf8', timeout: 10000 });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /CPU lock|fd\/6|resource context|EBADF|ENOENT/); assert.ok(!result.stderr.includes('nonexistent-protocol.json'));
  }
  assert.throws(() => M.requireCpuLock(ROOT), /CPU lock/); assert.throws(() => M.requireResourceContext());
});
test('F-s1 cannot reserve budget without a valid sealed C100-s1 evaluation after seed0', () => {
  for (const reason of ['missing', 'invalid']) {
    const root = runnerRoot('prerequisite-' + reason), P = { task_root: root, arms: { 'F-s1': {} } }; let calls = [];
    assert.throws(() => M.prepareTrajectory(P, 'F-s1', { stageDecision: (_, stage) => { calls.push(stage); return { pass: true }; }, registered: (_, name) => { calls.push(name); throw Error(reason + ' C100-s1'); } }), new RegExp(reason));
    assert.deepEqual(calls, ['seed0', 'C100-s1']); assert.equal(existsSync(resolve(root, 'budget.json')), false);
  }
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
  assert.notEqual(direct.status, 0); assert.match(direct.stderr, /fd\/6|resource context|ENOENT/); assert.ok(!direct.stderr.includes('a frozen rare-head protocol'));
});
test('echo receipt with 1699 perfect-label observations and one synthetic batch cannot pass learned fit', () => {
  const root = runnerRoot('echo-fit'), data = resolve(root, 'data'); mkdirSync(data); put(resolve(data, 'reader.json'), { classes: [['h', ['none', 'yes']]], tags: ['O'], acts: ['create'] });
  const selections = Array.from({ length: 1699 }, (_, ordinal) => ({ arm: 'F', ordinal, head: 'h', targets: [1] }));
  put(resolve(root, 'selections.json'), { selections }); const populations = Object.fromEntries(Object.entries({ outline_create: 89, outline_coloured_create: 74, outline_set: 97, desc_r2: 35, desc_r2_canonical: 21, count_size: 14, absent_controls: 1440 }).map(([name, n]) => [name, Array.from({ length: n }, (_, i) => i)])); put(resolve(root, 'populations.json'), populations);
  writeFileSync(resolve(root, 'input'), 'input'); writeFileSync(resolve(root, 'source'), 'source'); const protocol = resolve(root, 'frozen/protocol.json'), inputs = { [resolve(root, 'input')]: M.hash(resolve(root, 'input')) }, sources = { [resolve(root, 'source')]: M.hash(resolve(root, 'source')) }, identities = { ...inputs, ...sources, [protocol]: M.hash(protocol) };
  const read = { truncated: false, unreadFrom: null, head_index: 1, target_index: 1, classes: { h: 1 }, act: 'create', tags: ['O'] }, rows = selections.map((s, observation) => ({ ...s, observation, python: read, node: read }));
  const raw = { seq_logits: { dims: [1, 3], data: [0, 0, 0] }, token_logits: { dims: [1, 2, 1], data: [0, 0] }, cut_logits: { dims: [1, 2, 3], data: [0, 0, 0, 0, 0, 0] } };
  for (const runtime of ['float', 'ort']) {
    const dir = resolve(root, 'W-s0/fit-' + runtime); mkdirSync(dir, { recursive: true }); writeFileSync(resolve(dir, 'rows.jsonl'), rows.map(JSON.stringify).join('\n') + '\n');
    put(resolve(dir, 'summary.json'), { populations: Object.fromEntries(Object.entries(populations).map(([name, ids]) => [name, { rows: ids.length, correct: ids.length }])) }); writeFileSync(resolve(dir, 'batches.jsonl'), JSON.stringify({ python: raw, node: raw, input: { arrays: { input_ids: [[1, 0]], attention_mask: [[1, 0]] } } }) + '\n');
    const outputs = Object.fromEntries(['rows.jsonl', 'summary.json', 'batches.jsonl'].map(p => [p, M.hash(resolve(dir, p))]));
    put(resolve(dir, 'receipt.json'), { version: 'modernbert-rare-heads-fit-v1', scope: 'actual-model-training-fit', name: 'W-s0', runtime, protocol: { path: protocol, sha256: M.hash(protocol) }, identities_before: identities, identities_after: identities, execution: { argv: ['echo', 'perfect-label-fixture'], cwd: root, exit_code: 0, timeout_seconds: 1, started: 1, ended: 1 }, outputs });
  }
  const P = { task_root: root, file: protocol, sha256: M.hash(protocol), inputs, sources, selections: { path: resolve(root, 'selections.json'), populations: { path: resolve(root, 'populations.json') } }, arms: { 'W-s0': { arm: 'W', seed: 0, train_data: data, model: resolve(root, 'missing-model'), training: resolve(root, 'missing-run') } } };
  assert.equal(existsSync(P.arms['W-s0'].model), false); assert.equal(existsSync(P.arms['W-s0'].training), false); assert.throws(() => M.fitRows(P, 'W-s0'), /fit evidence:|ENOENT/);
});
