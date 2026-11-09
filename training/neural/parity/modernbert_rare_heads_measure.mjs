// Registered rare-head campaign adapter. Historical folders are always read-only.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, readlinkSync, openSync, readSync, closeSync, lstatSync, realpathSync, fstatSync, constants as FS } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import * as N from './modernbert_next_measure.mjs';
import * as F from './modernbert_forms_measure.mjs';
import { compareRaw } from './modernbert_rare_heads_fit.mjs';
import { validateFitEvidence } from './modernbert_rare_heads_fit_evidence.mjs';

export const HERE = dirname(fileURLToPath(import.meta.url)), REPO = resolve(HERE, '../../..');
export const TASK = homedir() + '/.cache/diagram-vss-modernbert/rare-heads-2026-11-09';
const PY = homedir() + '/.cache/diagram-vss-modernbert/venv/bin/python';
const UUID = 'GPU-905b8484-3b1e-30f6-defd-05d44f00f692';
const SELF = fileURLToPath(import.meta.url);
export const NEW = ['W-s0', 'F-s1', 'W-s1'];
export const COMPARATORS = { 'W-s0': ['F-s0', 'B-s0', 'C100-s0'], 'W-s1': ['F-s1', 'B-s0', 'C100-s1'] };
export const STAGES = { seed0: ['W-s0', 'F-s0', 'B-s0', 'C100-s0'], control1: ['F-s1', 'C100-s1'], confirmation: ['W-s0', 'F-s0', 'B-s0', 'C100-s0', 'W-s1', 'F-s1', 'C100-s1'] };
const J = p => JSON.parse(readFileSync(p, 'utf8'));
export const hash = p => { const h = createHash('sha256'), fd = openSync(p, 'r'), buf = Buffer.alloc(4 * 1024 * 1024); try { for (;;) { const n = readSync(fd, buf, 0, buf.length, null); if (!n) break; h.update(buf.subarray(0, n)); } } finally { closeSync(fd); } return h.digest('hex'); };
const stable = o => JSON.stringify(o, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const same = (a, b) => stable(a) === stable(b);
const digest = o => createHash('sha256').update(stable(o)).digest('hex');
const atomic = (p, o) => { assertNoSymlinks(p); const t = p + '.tmp-' + process.pid + '-' + createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 12); const fd = openSync(t, FS.O_WRONLY | FS.O_CREAT | FS.O_EXCL | FS.O_NOFOLLOW, 0o600); try { writeFileSync(fd, JSON.stringify(o, null, 1) + '\n'); } finally { closeSync(fd); } assertNoSymlinks(p); renameSync(t, p); };
const must = (condition, message) => { if (!condition) throw new Error(message); };
const hashes = paths => Object.fromEntries(paths.map(p => [resolve(p), hash(p)]));
const offline = { ...process.env, CUDA_VISIBLE_DEVICES: '', OMP_NUM_THREADS: '2', MKL_NUM_THREADS: '2', OPENBLAS_NUM_THREADS: '2', HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1', TOKENIZERS_PARALLELISM: 'false' };
export function verifyHashes(map, label) {
  must(map && Object.keys(map).length > 0, `${label}: empty hashes`);
  for (const [p, h] of Object.entries(map)) must(existsSync(p) && hash(p) === h, `${label}: changed/missing ${p}`);
}
export function loadProtocol(file) {
  const path = assertNoSymlinks(file), P = J(path);
  must(P.version === 'modernbert-rare-heads-frozen-v1', 'a frozen rare-head protocol is required');
  must(resolve(P.task_root) === TASK, 'foreign task root');
  verifyHashes(P.inputs, 'frozen inputs'); verifyHashes(P.sources, 'frozen sources');
  const verified = spawnSync(PY, ['-B', resolve(HERE, 'modernbert_rare_heads.py'), 'verify', '--protocol', path], { cwd: REPO, env: offline, encoding: 'utf8', timeout: 300000, maxBuffer: 1024 * 1024 });
  must(verified.status === 0 && verified.signal === null, `frozen objective/registration verification failed: ${verified.stderr ?? verified.error ?? ''}`);
  for (const k of ['forms_protocol', 'loss_manifest', 'selections', 'compatibility']) must(P[k]?.path && hash(P[k].path) === P[k].sha256, `${k}: missing/changed`);
  must(hash(P.selections.populations.path) === P.selections.populations.sha256, 'populations changed');
  for (const name of [...NEW, 'F-s0', 'B-s0', 'C100-s0', 'C100-s1']) must(P.arms?.[name]?.bundle && P.arms[name].model && P.arms[name].training && P.arms[name].train_data, `${name}: incomplete registration`);
  const FP = F.loadFormsProtocol(P.forms_protocol.path); F.parentProtocol(FP);
  return { ...P, file: path, sha256: hash(path), FP };
}
export function assertNoSymlinks(path) {
  const p = resolve(path), parts = p.split('/').filter(Boolean); let current = '/';
  for (let i = 0; i < parts.length; i++) {
    current = resolve(current, parts[i]); let st;
    try { st = lstatSync(current); } catch (e) { if (e.code === 'ENOENT') break; throw e; }
    must(!st.isSymbolicLink(), `symlink component refused: ${current}`);
    must(realpathSync(current) === current, `resolved path escape: ${current}`);
    if (i < parts.length - 1) must(st.isDirectory(), `non-directory ancestor: ${current}`);
  }
  return p;
}
export function safeMkdir(path) { assertNoSymlinks(path); mkdirSync(path, { recursive: true }); assertNoSymlinks(path); }
function assertTreeNoSymlinks(dir) {
  assertNoSymlinks(dir); if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, entry.name); must(!entry.isSymbolicLink(), `symlink component refused: ${p}`);
    if (entry.isDirectory()) assertTreeNoSymlinks(p); else must(entry.isFile(), `unsupported output file: ${p}`);
  }
}
function writeFresh(path, data) { assertNoSymlinks(path); const fd = openSync(path, FS.O_WRONLY | FS.O_CREAT | FS.O_EXCL | FS.O_NOFOLLOW, 0o600); try { writeFileSync(fd, data); } finally { closeSync(fd); } }
export function openLock(path) {
  assertNoSymlinks(path); const fd = openSync(path, FS.O_RDWR | FS.O_CREAT | FS.O_NOFOLLOW, 0o600), st = fstatSync(fd), at = lstatSync(path);
  if (!st.isFile() || st.nlink !== 1 || st.dev !== at.dev || st.ino !== at.ino) { closeSync(fd); throw new Error(`foreign/nonregular lock: ${path}`); }
  return fd;
}
export function owned(P, path) {
  assertNoSymlinks(P.task_root);
  const p = resolve(path), r = relative(P.task_root, p);
  must(r && !r.startsWith('..') && !r.startsWith('/'), `output outside task ownership: ${p}`);
  must(!r.startsWith('start/') && r !== 'start', 'frozen start is read-only');
  return assertNoSymlinks(p);
}
export function claim(P, out, identity) {
  out = owned(P, out); const idf = resolve(out, 'rare_identity.json');
  if (existsSync(out)) { assertTreeNoSymlinks(out); must(existsSync(idf) && same(J(idf), identity), `${out}: foreign or changed identity`); }
  else { safeMkdir(out); atomic(idf, identity); }
  return out;
}
function tree(dir) {
  assertNoSymlinks(dir);
  const files = [];
  const visit = d => { for (const n of readdirSync(d, { withFileTypes: true })) { const p = resolve(d, n.name); if (n.isDirectory()) visit(p); else if (n.isFile()) files.push(p); else throw new Error(`unsupported file ${p}`); } };
  visit(dir); return hashes(files.sort());
}
const identity = (P, name) => ({ schema: 'modernbert-rare-heads-bundle-v1', protocol_sha256: P.sha256, name, registration: P.arms[name], sources: P.sources, runtime: F.currentRuntime() });
export function recipe(complete) { const s = { ...complete.metadata?.settings }; delete s.seed; delete s.class_loss; return s; }
export function completionChecks(P, name, model = null) {
  if (NEW.includes(name)) { owned(P, P.arms[name].model); owned(P, P.arms[name].training); }
  model ??= F.validateModel(P.arms[name].model);
  const a = P.arms[name], c = J(resolve(a.training, 'complete.json')), ref = J(resolve(P.arms['F-s0'].training, 'complete.json'));
  const checks = [], add = (n, v) => checks.push(F.chkBool(`${name}: ${n}`, v));
  add('full completed schedule', c.complete === true && c.full_schedule === true && c.max_updates === 0 && c.state?.epoch === 8 && c.state?.update === 14640 && c.state?.total === 14640);
  add('registered seed', c.metadata?.settings?.seed === a.seed);
  add('unchanged recipe excluding seed and declared objective', Object.keys(recipe(c)).length > 0 && same(recipe(c), recipe(ref)));
  add('same F data', c.metadata?.data?.files?.['train.jsonl'] === hash(resolve(a.train_data, 'train.jsonl')) && c.metadata?.data?.requests === 58552 && c.metadata?.data?.messages === 28330);
  const obj = c.metadata?.settings?.class_loss;
  add('explicit objective', a.arm === 'W' ? obj?.sha256 === P.loss_manifest.sha256 && obj.formula === P.loss_manifest.formula && same(obj.manifest, J(P.loss_manifest.path)) : obj === undefined);
  const sources = c.metadata?.sources;
  add('original training source provenance present', !!sources && Object.keys(sources).length > 0);
  if (NEW.includes(name)) for (const [n, h] of Object.entries(sources ?? {})) add('current training source ' + n, hash(resolve(HERE, '..', n)) === h);
  else add('historical completion is frozen verbatim', P.inputs[resolve(a.training, 'complete.json')] === hash(resolve(a.training, 'complete.json')));
  const r = model.receipt;
  add('export weights bind completed run', r.weights?.sha256 === hash(resolve(a.training, r.weights?.source_file ?? 'checkpoint.pt')) && r.weights?.update === c.state?.update && r.weights?.total === c.state?.total && r.weights?.full_schedule === true);
  add('export source consistency at original training/export', Array.isArray(r.source_changes_since_training) && r.source_changes_since_training.length === 0 && Array.isArray(r.weights?.source_changes_since_training) && r.weights.source_changes_since_training.length === 0);
  add('output contract', r.contract?.output_contract === 'diagram-reader-v2' && r.contract?.protocol?.sha256 === P.FP.parent.protocol_sha256);
  if (NEW.includes(name)) {
    const ledger = J(resolve(P.task_root, 'budget.json')), entry = ledger.trajectories?.[name];
    add('registered completed trajectory', entry?.state === 'complete' && same(entry?.identity, trajectoryIdentity(P, name)));
    for (const label of ['overfit', 'training', 'export']) {
      const attempt = entry?.attempts?.filter(x => x.label === label).at(-1);
      if (!attempt) { add('actual ' + label + ' execution receipt', false); continue; }
      add(label + ' receipt identity', hash(attempt.receipt) === attempt.sha256);
      const e = J(attempt.receipt); verifyHashes(e.before.inputs, label + ' inputs'); verifyHashes(e.before.sources, label + ' sources'); verifyHashes(e.outputs, label + ' outputs');
      add('actual ' + label + ' completed execution', e.scope === 'actual-model-' + label && e.cwd === REPO && e.signal === null && !e.error && e.unchanged === true && same(e.before.sources, P.sources) && same(e.before, e.after) && (label === 'export' ? [0, 2].includes(e.exit_status) : e.exit_status === 0));
    }
  }
  return checks;
}
export function applicability(P, name) {
  must(['F-s0', 'B-s0', 'C100-s0'].includes(name), 'not a reusable cached arm');
  const a = P.arms[name], dir = name === 'F-s0' ? resolve(a.bundle, 'eval') : a.bundle;
  const outer = name === 'F-s0' ? F.loadFormsBundle(name, a.bundle, P.FP) : null;
  const rec = F.applicabilityRecord(P.FP, name, dir, { expected: { arm: a.arm, seed: a.seed } });
  const checks = [...rec.checks.map(c => F.chkBool(c.check, c.ok))];
  if (name === 'F-s0') checks.push(...completionChecks(P, name));
  // Trainer sources are frozen historical provenance, separately from unchanged inference sources above.
  const cf = resolve(a.training, 'complete.json');
  checks.push(F.chkBool('original completion identity frozen', P.inputs[cf] === hash(cf)));
  const id = J(resolve(dir, 'identity.json'));
  checks.push(F.chkBool('registered cached model and data', resolve(id.model.dir) === resolve(a.model) && resolve(id.train_data.dir) === resolve(a.train_data)));
  return { schema: 'modernbert-rare-heads-applicability-v1', name, protocol_sha256: P.sha256, scope: 'cached-inference-applicability', original_training_sources: J(cf).metadata?.sources, checks, historical_padding_note: name === 'B-s0' ? 'Historical padding-logit failure retained; categorical results do not establish numerical/confidence parity.' : null, underlying: rec, outer_identity: outer?.identity_sha256 ?? null, pass: checks.length > 0 && checks.every(c => c.ok) && rec.status === 'applicable' };
}
export function loadRegistered(P, name) {
  const a = P.arms[name]; must(a, `unregistered ${name}`);
  if (['F-s0', 'B-s0', 'C100-s0'].includes(name)) {
    const ap = applicability(P, name); must(ap.pass, `${name}: cached applicability failed: ${ap.checks.filter(c => !c.ok).map(c => c.name)}`);
    return { name, bundle: N.loadBundle(name, name === 'F-s0' ? resolve(a.bundle, 'eval') : a.bundle), applicability: ap };
  }
  const dir = owned(P, a.bundle); assertTreeNoSymlinks(dir); must(same(J(resolve(dir, 'rare_identity.json')), identity(P, name)), `${name}: bundle identity changed`);
  const seal = J(resolve(dir, 'rare_seal.json')); verifyHashes(seal.outputs, `${name} bundle`);
  must(seal.identity_sha256 === hash(resolve(dir, 'rare_identity.json')), 'seal identity changed');
  const root = J(seal.root_cause_receipt); verifyHashes(root.outputs, 'root-cause execution outputs');
  must(root.scope === 'actual-model-root-causes' && root.exit_status === 0 && !root.signal && !root.error && root.check_count > 0 && same(root.before.sources, P.sources), 'root-cause execution incomplete');
  const model = F.validateModel(a.model); must(model.artifacts_sha256 === seal.artifacts_sha256, `${name} model changed`);
  const bundle = N.loadBundle(name, resolve(dir, 'eval'));
  const i = bundle.identity;
  must(i.arm === a.arm && i.seed === a.seed && i.model.artifacts_sha256 === model.artifacts_sha256 && resolve(i.train_data.dir) === resolve(a.train_data), `${name}: inner identity mismatch`);
  must(i.protocol_sha256 === P.FP.parent.protocol_sha256 && i.views_manifest_sha256 === P.FP.parent.views_manifest_sha256 && i.addendum_sha256 === P.FP.parent.addendum_sha256, 'changed inference basis');
  return { name, bundle, model, seal };
}
export async function evaluate(P, name, opts) {
  requireCpuLock(P.task_root); requireResourceContext();
  const a = P.arms[name]; must(a && [...NEW, 'C100-s1'].includes(name), 'unregistered evaluation');
  for (const [k, v] of [['model', a.model], ['training', a.training], ['out', a.bundle]]) must(resolve(opts[k]) === resolve(v), `unregistered ${k}`);
  if (name === 'C100-s1') must(decide(P, 'seed0').pass, 'seed0 must pass before C100-s1 evaluation');
  if (name === 'F-s1') must(decide(P, 'seed0').pass, 'seed0 must pass before F-s1 evaluation');
  if (name === 'W-s1') must(decide(P, 'control1').pass, 'control1 must pass before W-s1 evaluation');
  const model = F.validateModel(a.model);
  if (NEW.includes(name)) must(completionChecks(P, name, model).every(c => c.ok), 'completion/source/objective/export failed');
  const out = claim(P, a.bundle, identity(P, name));
  if (existsSync(resolve(out, 'rare_seal.json'))) return loadRegistered(P, name);
  await N.evaluateArm({ protocol: P.FP.parent.protocol, addendum: P.FP.parent.addendum, views: P.FP.parent.views, arm: a.arm, seed: a.seed, model: a.model, trainData: a.train_data, out: resolve(out, 'eval'), threads: '2', includeExternal: true });
  const rootDir = resolve(out, 'root-cause-attempts', String(Date.now())), rootJson = resolve(rootDir, 'root-causes.json'), rootMd = resolve(rootDir, 'root-causes.md');
  const root = execute({ argv: [process.execPath, resolve(HERE, 'root_causes.mjs'), resolve(out, 'eval/score.truthful.json'), a.train_data, rootMd, rootJson, '--views=' + P.FP.parent.views, '--confidence=' + resolve(out, 'eval/confidence.json')], cwd: REPO, inputs: Object.keys(tree(resolve(out, 'eval'))), sources: Object.keys(P.sources), out: rootDir, scope: 'actual-model-root-causes', timeout: 3600000, produced: [rootMd, rootJson] });
  must(root.exit_status === 0 && root.signal === null && !root.error, 'root-cause analysis failed');
  const analysis = J(rootJson); must(analysis.parts?.length > 0 && analysis.parts.every(p => p.reconciliation?.length > 0 && p.reconciliation.every(c => c.ok)), 'root-cause reconciliation missing');
  root.check_count = analysis.parts.reduce((n, p) => n + p.reconciliation.length, 0); root.check_scope = 'root-cause-scorer-reconciliation'; atomic(resolve(rootDir, 'receipt.json'), root);
  atomic(resolve(out, 'rare_seal.json'), { identity_sha256: hash(resolve(out, 'rare_identity.json')), artifacts_sha256: model.artifacts_sha256, root_cause_receipt: resolve(rootDir, 'receipt.json'), outputs: { ...tree(resolve(out, 'eval')), ...tree(rootDir) } });
  return loadRegistered(P, name);
}
export function resourceLimits(scope) {
  const policy = J(resolve(REPO, 'training/neural/parity/modernbert_rare_heads_protocol.json')).resources;
  const gpu = ['actual-model-training', 'actual-model-overfit'].includes(scope);
  const rss = gpu ? policy.host_rss_gib : policy.cpu_inference_rss_gib, floor = gpu ? policy.available_floor_gib : policy.cpu_available_floor_gib;
  must(Number.isFinite(rss) && rss > 0 && Number.isFinite(floor) && floor > 0, 'invalid frozen resource policy');
  return { phase: gpu ? 'gpu-training' : 'cpu', rss_limit_bytes: rss * 1024 ** 3, available_floor_bytes: floor * 1024 ** 3 };
}

// Receipts describe the command that ran; fixture receipts never acquire a model subject.
export function execute({ argv, cwd, inputs, sources, out, scope, timeout, env = offline, produced = [], takeCpuLock = false }) {
  must(Array.isArray(argv) && argv.length > 1 && Number.isFinite(timeout) && timeout > 0 && timeout <= 86400000, 'finite invocation required');
  out = owned({ task_root: TASK }, out); for (const p of produced) { owned({ task_root: TASK }, p); if (existsSync(p) && lstatSync(p).isDirectory()) assertTreeNoSymlinks(p); }
  must(!existsSync(out), `execution receipt output already exists: ${out}`); safeMkdir(out);
  const before = { inputs: hashes(inputs), sources: hashes(sources) }, start = new Date().toISOString(), t = Date.now();
  const cpuGuard = true; // One finite process-group deadline, including trainers that handle SIGTERM themselves.
  const spec = resolve(out, 'invocation.json'), started_ms = Date.now(); atomic(spec, { schema: 'rare-heads-resource-context-v1', argv, cwd: resolve(cwd), scope, takeCpuLock, resources: resourceLimits(scope), timeout, task_root: TASK, out, started_ms, deadline_ms: started_ms + timeout });
  const guardFile = resolve(out, 'resource-result.json');
  const actual = cpuGuard ? [process.execPath, SELF, 'resource-worker', spec, guardFile] : argv;
  const specFd = openSync(spec, FS.O_RDONLY | FS.O_NOFOLLOW), inheritedCpu = heldCpuFd(TASK), ownCpu = takeCpuLock && inheritedCpu === null ? openLock(owned({ task_root: TASK }, resolve(TASK, 'cpu.lock'))) : null, cpuFd = inheritedCpu ?? ownCpu;
  let r; try { r = spawnSync(actual[0], actual.slice(1), { cwd, env, encoding: 'utf8', timeout: timeout + (cpuGuard ? 10000 : 0), killSignal: 'SIGTERM', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe', 'ignore', 'ignore', 'ignore', specFd, cpuFd ?? 'ignore'] }); } finally { closeSync(specFd); if (ownCpu !== null) closeSync(ownCpu); }
  assertTreeNoSymlinks(out);
  for (const p of ['stdout.log', 'stderr.log']) assertNoSymlinks(resolve(out, p));
  writeFresh(resolve(out, 'stdout.log'), r.stdout ?? ''); writeFresh(resolve(out, 'stderr.log'), r.stderr ?? '');
  const after = { inputs: hashes(inputs), sources: hashes(sources) };
  const resource = cpuGuard && existsSync(guardFile) ? J(guardFile) : null;
  const rec = { schema: 'modernbert-rare-heads-execution-v1', scope, argv, cwd: resolve(cwd), environment: Object.fromEntries(['CUDA_VISIBLE_DEVICES', 'OMP_NUM_THREADS', 'MKL_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'HF_HUB_OFFLINE', 'TRANSFORMERS_OFFLINE', 'TOKENIZERS_PARALLELISM', 'NUM_WORDS', 'LABEL_FIXES', 'IMPLIED_SCALE', 'ROLE_TOO_RICH', 'EXTRA_DIRS'].map(k => [k, env[k] ?? null])), started: start, ended: new Date().toISOString(), elapsed_ms: Date.now() - t, timeout_ms: timeout, exit_status: resource?.exit_status ?? r.status, signal: resource?.signal ?? r.signal, error: resource?.reason ?? r.error?.message ?? null, resource_guard: resource, before, after, unchanged: same(before, after), outputs: { ...hashes([resolve(out, 'stdout.log'), resolve(out, 'stderr.log'), spec, ...(existsSync(guardFile) ? [guardFile] : [])]), ...Object.assign({}, ...produced.filter(existsSync).map(p => readdirOrFile(p))) } };
  atomic(resolve(out, 'receipt.json'), rec); return rec;
}
function readdirOrFile(p) { assertNoSymlinks(p); try { readdirSync(p); return tree(p); } catch (e) { if (e.code === 'ENOTDIR') return hashes([p]); throw e; } }
export async function resourceWorker(specFile, resultFile) {
  const spec = inheritedResourceSpec(specFile); must(spec.timeout > 0 && spec.timeout <= 86400000, 'finite resource deadline required');
  must(resultFile === resolve(spec.out, 'resource-result.json'), 'foreign resource result path'); owned({ task_root: TASK }, resultFile);
  if (spec.takeCpuLock && heldCpuFd(TASK) === null) {
    const path = owned({ task_root: TASK }, resolve(TASK, 'cpu.lock')); must(readlinkSync('/proc/self/fd/7') === path, 'CPU lock descriptor missing');
    const lock = spawnSync('flock', ['-E', '75', '-n', '7'], { stdio: ['ignore', 'inherit', 'inherit', 'ignore', 'ignore', 'ignore', 'ignore', 7], timeout: 5000 });
    if (lock.status === 75) { atomic(resultFile, { exit_status: 75, signal: null, reason: 'cpu-lock-occupied', ...spec.resources }); return false; }
    must(lock.status === 0 && !lock.signal, 'CPU lock acquisition failed');
  }
  if (spec.takeCpuLock) requireCpuLock(TASK);
  let reason = null, peak = 0, killTimer;
  const child = spawn(spec.argv[0], spec.argv.slice(1), { cwd: spec.cwd, detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ignore', 'ignore', 'ignore', 6, heldCpuFd(TASK) ?? 'ignore'] });
  const stop = why => {
    if (reason) return; reason = why;
    try { process.kill(-child.pid, 'SIGTERM'); } catch {}
    killTimer = setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 2000);
  };
  const monitor = () => {
    try {
      const mem = /^MemAvailable:\s+(\d+) kB$/m.exec(readFileSync('/proc/meminfo', 'utf8'));
      must(mem, 'host memory reading failed');
      const ps = spawnSync('ps', ['-eo', 'pgid=,rss='], { encoding: 'utf8', timeout: 1000 });
      must(ps.status === 0, 'process memory reading failed');
      const rss = ps.stdout.trim().split('\n').reduce((sum, line) => { const [pgid, kb] = line.trim().split(/\s+/).map(Number); return sum + (pgid === child.pid ? kb * 1024 : 0); }, 0);
      peak = Math.max(peak, rss);
      if (rss > spec.resources.rss_limit_bytes || Number(mem[1]) * 1024 < spec.resources.available_floor_bytes) stop('host memory guard');
    } catch (e) { stop(String(e)); }
  };
  const term = () => stop('resource worker signal'); process.on('SIGTERM', term); process.on('SIGINT', term);
  const timer = setTimeout(() => stop('finite invocation deadline'), Math.max(1, spec.deadline_ms - Date.now())), watcher = setInterval(monitor, 1000);
  monitor();
  const status = await new Promise(ok => { child.once('error', e => ok({ exit_status: null, signal: null, reason: String(e) })); child.once('exit', (code, signal) => ok({ exit_status: code, signal })); });
  clearTimeout(timer); clearInterval(watcher); if (killTimer) clearTimeout(killTimer);
  // A terminated command may have descendants; terminate only its private process group.
  if (reason) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
  process.off('SIGTERM', term); process.off('SIGINT', term);
  atomic(resultFile, { ...status, reason: reason ?? status.reason ?? null, rss_peak_bytes: peak, ...spec.resources });
  return !reason && status.exit_status === 0 && !status.signal;
}
export function countFixture(receipt) {
  verifyHashes(receipt.outputs, 'fixture logs');
  const out = readFileSync(Object.keys(receipt.outputs).find(p => p.endsWith('stdout.log')), 'utf8');
  const lines = out.trim().split('\n'), checks = lines.filter(l => l.startsWith('ok   '));
  const terminal = /^PASS \(([1-9][0-9]*) checks\)$/.exec(lines.at(-1) ?? '');
  return receipt.schema === 'modernbert-rare-heads-execution-v1' && receipt.scope === 'perfect-label-fixture' && receipt.exit_status === 0 && receipt.signal === null && !receipt.error && receipt.unchanged === true && same(receipt.before, receipt.after) && !!terminal && Number(terminal[1]) === checks.length && !lines.some(l => l.startsWith('FAIL ')) ? checks.length : 0;
}
const UNIT_RUNNER = 'import sys,unittest,json;sys.path.insert(0,sys.argv[1]);s=unittest.defaultTestLoader.discover(sys.argv[1],pattern=sys.argv[2]);r=unittest.TextTestRunner(verbosity=2).run(s);print(json.dumps(dict(kind="unittest-execution",tests=r.testsRun,failures=len(r.failures),errors=len(r.errors),skipped=len(r.skipped))));sys.exit(0 if r.wasSuccessful() and r.testsRun>0 and not r.skipped else 1)';
const fixtureSpecs = P => [
  { name: 'node-output-contract', argv: [process.execPath, resolve(HERE, 'test_output_contract.mjs')], format: 'checks', scope: 'perfect-label-fixture' },
  { name: 'python-output-contract', argv: [PY, '-B', resolve(HERE, 'test_output_contract.py')], format: 'checks', scope: 'perfect-label-fixture' },
  ...['test_batched_trainer.py', 'test_modernbert_rare_heads.py', 'test_modernbert_rare_heads_fit.py'].map(name => ({ name, argv: [PY, '-B', '-c', UNIT_RUNNER, HERE, name], format: 'unittest', scope: 'source-harness-fixture' })),
  { name: 'measurement-source', argv: [process.execPath, '--test', '--test-reporter=tap', resolve(HERE, 'test_modernbert_rare_heads_measure.mjs')], format: 'tap', scope: 'source-harness-fixture' },
  ...['test_modernbert_rare_heads_fit.mjs', 'test_modernbert_rare_heads_fit_evidence.mjs'].map(name => ({ name, argv: [process.execPath, '--test', '--test-reporter=tap', resolve(HERE, name)], format: 'tap', scope: 'source-harness-fixture' })),
  (() => {
    const out = resolve(P.task_root, 'evidence/corpus-roundtrip'), work = resolve(out, 'representation'), data = P.arms['F-s0'].train_data;
    const env = { ...offline, NUM_WORDS: 'table', LABEL_FIXES: resolve(HERE, 'LABEL_FIXES_L2.jsonl'), IMPLIED_SCALE: '1' }; delete env.ROLE_TOO_RICH; delete env.EXTRA_DIRS;
    return { name: 'corpus-roundtrip', argv: [PY, '-B', resolve(HERE, '../roles_roundtrip.py'), '--work', work, '--messages', data + '.messages.jsonl', '--output-contract', 'diagram-reader-v2', '--prep', 'modernbert', '--compare-rows', data, '--gate', '95', '1', '--md', work], env, produced: [work, work + '.table'], format: 'roundtrip', scope: 'perfect-label-corpus', result: resolve(work, 'roundtrip.json'), timeout: 3600000 };
  })()
];
export function countSuite(r, spec) {
  verifyHashes(r.outputs, 'suite outputs');
  if (spec.format === 'checks') return countFixture(r);
  if (r.exit_status !== 0 || r.signal !== null || r.error || !r.unchanged || !same(r.before, r.after) || r.scope !== spec.scope) return 0;
  const output = readFileSync(Object.keys(r.outputs).find(p => p.endsWith('stdout.log')), 'utf8').trim();
  if (spec.format === 'unittest') {
    try { const n = JSON.parse(output.split('\n').at(-1)); return n.kind === 'unittest-execution' && Number.isInteger(n.tests) && n.tests > 0 && n.failures === 0 && n.errors === 0 && n.skipped === 0 ? n.tests : 0; } catch { return 0; }
  }
  if (spec.format === 'roundtrip') {
    const s = J(spec.result), rows = Object.values(s.table ?? {}).filter(x => x.train === true), total = rows.reduce((n, x) => n + (x.gold ?? 0), 0);
    const correct = rows.reduce((n, x) => n + (x.right ?? 0), 0), exact = total > 0 ? correct / total : null;
    const oracle = s.oracle;
    return total === 58552 && rows.length > 0 && rows.every(x => x.gold > 0 && 100 * ((x.right ?? 0) + (x.right_or_ref ?? 0) + (x.asked ?? 0) + (x.held ?? 0)) / x.gold >= 95 && 100 * (x.silent ?? 0) / Math.max(x.rows ?? 0, 1) <= 1) && oracle?.prep === 'modernbert' && oracle.output_contract === 'diagram-reader-v2' && oracle.max_length === 128 && oracle.cut_max_length === 512 && exact === s.exact_only?.['ALL trained folders'] ? total : 0;
  }
  const lines = output.split('\n'), get = key => { const l = lines.filter(x => x.startsWith('# ' + key + ' ')); return l.length === 1 ? Number(l[0].slice(key.length + 3)) : NaN; };
  const n = get('tests'); return Number.isInteger(n) && n > 0 && get('pass') === n && ['fail', 'cancelled', 'skipped', 'todo'].every(k => get(k) === 0) && !lines.some(x => /^not ok\b/.test(x)) ? n : 0;
}
export function fixtureEvidence(P, out) {
  requireCpuLock(P.task_root);
  must(resolve(out) === resolve(P.task_root, 'evidence'), 'registered evidence output required');
  out = claim(P, out, { schema: 'rare-heads-fixtures-v1', protocol_sha256: P.sha256, sources: P.sources, scope: 'source-and-perfect-label-fixtures' });
  const specs = fixtureSpecs(P);
  const results = [];
  for (const spec of specs) {
    const { name, argv } = spec;
    const dir = resolve(out, name), file = resolve(dir, 'receipt.json');
    const r = existsSync(file) ? J(file) : execute({ argv, cwd: REPO, inputs: Object.keys(P.inputs), sources: Object.keys(P.sources), out: dir, scope: spec.scope, timeout: spec.timeout ?? 1800000, env: spec.env ?? offline, produced: spec.produced ?? [] });
    must(same(r.argv, argv) && r.cwd === REPO && same(r.before.sources, P.sources), 'foreign fixture invocation');
    const count = countSuite(r, spec); must(count > 0, `${name}: failed or zero fixture checks`);
    r.check_count = count; r.check_scope = spec.scope; atomic(file, r);
    results.push({ name, receipt: file, sha256: hash(file), count, scope: r.scope, ...(spec.format === 'roundtrip' ? { exact_only: J(spec.result).exact_only['ALL trained folders'], note: 'fresh perfect-label representation evidence; not learned-model accuracy' } : {}) });
  }
  const e = { schema: 'modernbert-rare-heads-fixture-evidence-v1', protocol_sha256: P.sha256, scope: 'source-and-perfect-label-fixtures', results };
  atomic(resolve(out, 'evidence.json'), e); return e;
}
export function loadFixtureEvidence(P) {
  const dir = resolve(P.task_root, 'evidence'), ev = J(resolve(dir, 'evidence.json'));
  must(ev.schema === 'modernbert-rare-heads-fixture-evidence-v1' && ev.scope === 'source-and-perfect-label-fixtures' && ev.protocol_sha256 === P.sha256, 'invalid fixture scope/protocol');
  const specs = fixtureSpecs(P); must(ev.results?.length === specs.length, 'all registered fixture suites required');
  for (const [i, e] of ev.results.entries()) {
    must(hash(e.receipt) === e.sha256, 'fixture receipt changed'); const r = J(e.receipt);
    must(e.name === specs[i].name && same(r.argv, specs[i].argv) && r.cwd === REPO && same(r.before.sources, P.sources) && same(r.before.inputs, P.inputs) && countSuite(r, specs[i]) === e.count && e.count > 0, 'fixture checks invalid');
    verifyHashes(r.before.inputs, 'fixture inputs'); verifyHashes(r.before.sources, 'fixture sources');
  }
  return F.chkBool('separate perfect-label absent/count and output-contract fixtures (not learned-model evidence)', true, { results: ev.results });
}
const R0_BARS = { outline_create: [85, 89], outline_coloured_create: [71, 74], outline_set: [93, 97], desc_r2: [34, 35], desc_r2_canonical: [20, 21], count_size: [14, 14], absent_controls: [1440, 1440] };
export function fitRows(P, name) {
  const checks = [];
  for (const runtime of ['float', 'ort']) {
    const dir = resolve(P.task_root, name, 'fit-' + runtime), { summary: s, rows, batches, context } = validateFitEvidence(P, name, runtime, dir);
    const populations = context.populations;
    const key = runtime === 'ort' ? 'node' : 'python';
    const byIndex = new Map(rows.map(row => [row.observation, row[key].head_index === row[key].target_index]));
    for (const [pop, [bar, total]] of Object.entries(R0_BARS)) {
      const selected = populations[pop], correct = selected.filter(i => byIndex.get(i) === true).length;
      checks.push(F.chkBool(`${name}/${runtime}/${pop}: all frozen observations present`, selected.length === total && new Set(selected).size === total && selected.every(i => byIndex.has(i)) && s.populations?.[pop]?.rows === total && s.populations?.[pop]?.correct === correct));
      checks.push(F.chk(`${name}/${runtime}/${pop}: correct >= ${bar}/${total}`, correct, n => n >= bar, { requested: selected.length }));
    }
    if (runtime === 'ort') {
      const layout = context.layout;
      const numeric = batches.map(b => compareRaw(b.python, b.node, b.input.arrays, layout));
      const categorical = rows.every(x => x.python.act === x.node.act && same(x.python.classes, x.node.classes) && same(x.python.tags, x.node.tags));
      checks.push(F.chkBool(`${name}: strict Python/Node q8 including padding and production decode`, batches.length > 0 && numeric.every(n => n.passed && n.includes_padding && n.atol === 1e-3 && n.rtol === 1e-3) && numeric.some(n => Object.values(n.checks).some(x => x.padding_values > 0)) && categorical));
    }
  }
  return F.row('R0:' + name, 'fixed explicit-positive and absent fit in float and production Node q8', checks);
}
export function safetyRows(W, control, B, C) {
  const rows = [];
  for (const comp of [control, B]) {
    const original = F.rowF3(F.FORMS_RULES, W, comp, C);
    const w = W.score.populations?.t1_clean?.gated, b = comp.score.populations?.t1_clean?.gated;
    rows.push(F.row('R3:' + W.name + ':' + comp.name, original.title, [...original.checks,
      F.chk('t1_clean candidate executes', w?.executed, n => n > 0), F.chk('t1_clean comparator executes', b?.executed, n => n > 0),
      F.chk('t1_clean risk does not exceed ' + comp.name, N.fin(w?.risk) && N.fin(b?.risk) ? w.risk - b.risk : null, n => n <= 1e-12)
    ], { guard: original.guard, original_case_controls: W.score.populations?.lowercase_other_affected_original_case ?? null }));
  }
  return rows;
}
export function numericalRows(stage, L, fixture) {
  const b = n => L[n].bundle, rows = [];
  const seed0 = () => {
    for (const n of ['F-s0', 'B-s0']) { const r = F.rowF1(F.FORMS_RULES, b('W-s0'), b(n)); rows.push({ ...r, id: 'R1:W-s0:' + n }); }
    rows.push({ ...F.rowF2(F.FORMS_RULES, b('W-s0'), fixture), id: 'R2:W-s0' });
    rows.push(...safetyRows(b('W-s0'), b('F-s0'), b('B-s0'), b('C100-s0')));
  };
  if (stage !== 'control1') seed0();
  if (stage === 'control1' || stage === 'confirmation') {
    const g = F.guardRows(F.FORMS_RULES, b('F-s1'), b('C100-s1'));
    rows.push(F.row('control1:G', 'F-s1 valid control: Guard G versus C100-s1', [...g.checks, fixture], { guard: g.rows }));
  }
  if (stage === 'confirmation') {
    rows.push({ ...F.rowF2(F.FORMS_RULES, b('W-s1'), fixture), id: 'R2:W-s1' });
    rows.push(...safetyRows(b('W-s1'), b('F-s1'), b('B-s0'), b('C100-s1')));
    rows.push({ ...F.rowF4(F.FORMS_RULES, b('W-s0'), b('F-s0'), b('W-s1'), b('F-s1')), id: 'R4' });
  }
  return rows;
}
export function decide(P, stage) {
  must(STAGES[stage], 'unknown stage');
  if (stage !== 'seed0') must(decide(P, 'seed0').pass, 'seed0 prerequisites do not pass');
  if (stage === 'confirmation') must(decide(P, 'control1').pass, 'control1 prerequisites do not pass');
  const L = Object.fromEntries(STAGES[stage].map(n => [n, loadRegistered(P, n)])), fixture = loadFixtureEvidence(P);
  const rows = numericalRows(stage, L, fixture);
  for (const n of STAGES[stage].filter(n => NEW.includes(n))) rows.push(F.row('P3:' + n, 'honest completion, objective, source and export binding', completionChecks(P, n)));
  for (const n of STAGES[stage].filter(n => n.startsWith('W-'))) rows.push(fitRows(P, n));
  const v = { schema: 'modernbert-rare-heads-verdict-v1', stage, protocol_sha256: P.sha256, comparator_matrix: COMPARATORS, rows, bundles: Object.fromEntries(Object.entries(L).map(([n, l]) => [n, { dir: P.arms[n].bundle, score_sha256: hash(resolve(P.arms[n].bundle, ['F-s0'].includes(n) || NEW.includes(n) || n === 'C100-s1' ? 'eval/score.truthful.json' : 'score.truthful.json')) }])), pass: rows.length > 0 && rows.every(r => r.pass) };
  return v;
}
export function checkPass(P, stage, file) {
  const old = J(file); must(old.schema === 'modernbert-rare-heads-verdict-v1' && old.stage === stage && old.protocol_sha256 === P.sha256 && old.bundles && Object.values(old.bundles).every(x => typeof x.dir === 'string'), 'handwritten/dir-less/foreign prerequisite');
  const current = decide(P, stage); must(current.pass && same(current, old), 'prerequisite no longer passes or differs from underlying evidence'); return current;
}

export function requireRunnerLocks(root, name) {
  for (const [fd, path] of [[8, resolve(root, 'budget.lock')], [9, resolve(root, name, '.trajectory.lock')]]) {
    must(ownsLock(fd, path), 'runner must retain exclusive budget and trajectory locks');
  }
}
function ownsLock(fd, path) {
  try {
    assertNoSymlinks(path); const st = fstatSync(fd), at = lstatSync(path);
    return st.isFile() && st.nlink === 1 && st.dev === at.dev && st.ino === at.ino && readlinkSync(`/proc/self/fd/${fd}`) === path && /lock:\s+\d+: FLOCK\s+ADVISORY\s+WRITE/.test(readFileSync(`/proc/self/fdinfo/${fd}`, 'utf8'));
  } catch { return false; }
}
function heldCpuFd(root) { return ownsLock(7, resolve(root, 'cpu.lock')) ? 7 : null; }
export function requireCpuLock(root = TASK) { must(heldCpuFd(root) === 7, 'exclusive inherited CPU lock fd7 required'); }
function inheritedResourceSpec(file = null) {
  const actual = readlinkSync('/proc/self/fd/6'); must(actual.startsWith('/') && fstatSync(6).isFile(), 'resource context fd6 must name a regular file'); if (file) must(actual === resolve(file), 'resource context fd6 mismatch');
  owned({ task_root: TASK }, actual); const st = fstatSync(6), at = lstatSync(actual);
  must(st.isFile() && st.dev === at.dev && st.ino === at.ino, 'resource context identity changed');
  must(st.size > 0 && st.size <= 1024 * 1024, 'invalid resource context size'); const buffer = Buffer.alloc(st.size); must(readSync(6, buffer, 0, buffer.length, 0) === buffer.length, 'truncated resource context');
  const spec = JSON.parse(buffer.toString('utf8'));
  must(spec.schema === 'rare-heads-resource-context-v1' && spec.task_root === TASK && spec.timeout > 0 && spec.timeout <= 86400000 && spec.started_ms <= Date.now() && spec.deadline_ms > Date.now() && spec.deadline_ms - spec.started_ms <= spec.timeout, 'finite inherited resource context required');
  must(same(spec.resources, resourceLimits(spec.scope)), 'resource policy differs from frozen phase limits');
  must(actual === resolve(spec.out, 'invocation.json'), 'resource context output mismatch'); owned({ task_root: TASK }, spec.out);
  return spec;
}
export function requireResourceContext() {
  const spec = inheritedResourceSpec();
  must(same(spec.argv, [process.execPath, ...process.argv.slice(1)]), 'resource context argv mismatch');
  const parent = readFileSync(`/proc/${process.ppid}/cmdline`).toString().split('\0').filter(Boolean);
  must(same(parent.slice(1), [SELF, 'resource-worker', resolve(spec.out, 'invocation.json'), resolve(spec.out, 'resource-result.json')]) && readlinkSync(`/proc/${process.ppid}/fd/6`) === resolve(spec.out, 'invocation.json'), 'evaluation requires a live resource supervisor');
  return spec;
}
export function prepareRunner(root, name) {
  must(NEW.includes(name), 'unregistered trajectory'); assertNoSymlinks(root);
  for (const p of [resolve(root, 'task-owner.txt'), resolve(root, 'frozen/protocol.json')]) { assertNoSymlinks(p); must(lstatSync(p).isFile(), 'owned frozen task required'); }
  const work = owned({ task_root: root }, resolve(root, name));
  // Validate all paths before the first mkdir/open, including dangling lock links.
  for (const p of [resolve(root, 'budget.lock'), resolve(work, '.trajectory.lock'), resolve(root, 'budget.json'), resolve(root, 'cpu.lock')]) owned({ task_root: root }, p);
  assertTreeNoSymlinks(work);
  safeMkdir(work); const budget = openLock(resolve(root, 'budget.lock')); let trajectory;
  try { trajectory = openLock(resolve(work, '.trajectory.lock')); } catch (e) { closeSync(budget); throw e; }
  return { budget, trajectory };
}
function launchRunner(name, stopAt) {
  deadline(stopAt); const { budget, trajectory } = prepareRunner(TASK, name);
  try {
    const r = spawnSync('bash', ['-c', 'flock -n 8 || exit 75; flock -n 9 || exit 75; exec "$@"', 'rare-heads-runner', process.execPath, SELF, 'train', '--protocol', resolve(TASK, 'frozen/protocol.json'), '--name', name, '--stop-at', stopAt], { env: { ...offline, CUDA_VISIBLE_DEVICES: UUID }, stdio: ['inherit', 'inherit', 'inherit', 'ignore', 'ignore', 'ignore', 'ignore', 'ignore', budget, trajectory], timeout: Math.max(1, deadline(stopAt) - Date.now()) + 60000 });
    return r.status === 0 && !r.signal && !r.error;
  } finally { closeSync(trajectory); closeSync(budget); }
}
export function deadline(text, now = Date.now()) {
  must(/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(text ?? ''), 'STOP_AT must be explicit local YYYY-MM-DD HH:MM');
  const t = new Date(text.replace(' ', 'T') + ':00').getTime(), left = t - now;
  must(Number.isFinite(left) && left > 300000 && left <= 24 * 3600000, 'deadline must leave >300 seconds and be within 24 hours'); return t;
}
export function lockAvailable(path) {
  assertNoSymlinks(path);
  if (!existsSync(dirname(path))) return true;
  const r = spawnSync('flock', ['-E', '75', '-n', path, 'true'], { timeout: 5000 });
  must(!r.signal && !r.error && [0, 75].includes(r.status), 'lock probe failed'); return r.status === 0;
}
export function trajectoryIdentity(P, name) {
  must(NEW.includes(name), 'only W-s0/F-s1/W-s1 trajectories');
  return { schema: 'rare-heads-trajectory-v1', name, arm: P.arms[name], protocol_sha256: P.sha256, objective: name.startsWith('W-') ? P.loss_manifest : { formula: 'ordinary-ce' }, sources: P.sources, inputs: P.inputs };
}
export function reserveTrajectory(P, name) {
  const id = trajectoryIdentity(P, name), file = owned(P, resolve(P.task_root, 'budget.json')); owned(P, resolve(P.task_root, name));
  const ledger = existsSync(file) ? J(file) : { schema: 'rare-heads-budget-v1', maximum: 3, trajectories: {} };
  must(ledger.schema === 'rare-heads-budget-v1' && ledger.maximum === 3 && Object.keys(ledger.trajectories).every(n => NEW.includes(n)) && Object.keys(ledger.trajectories).length <= 3, 'invalid trajectory ledger');
  if (ledger.trajectories[name]) must(same(ledger.trajectories[name].identity, id) && ledger.trajectories[name].state !== 'quality-failed', 'identity changed or completed quality failure: no restart');
  else {
    must(Object.keys(ledger.trajectories).length < 3, 'trajectory budget exhausted');
    const work = resolve(P.task_root, name); must(!existsSync(work) || readdirSync(work).every(n => n === '.trajectory.lock'), 'foreign trajectory/export folder: refusing before training');
    ledger.trajectories[name] = { identity: id, state: 'reserved', attempts: [] };
  }
  atomic(file, ledger); return { ledger, file, entry: ledger.trajectories[name] };
}
export function prepareTrajectory(P, name, { stageDecision = decide, registered = loadRegistered } = {}) {
  if (name !== 'W-s0') must(stageDecision(P, 'seed0').pass, 'complete seed0 pass required');
  if (name === 'F-s1') registered(P, 'C100-s1');
  if (name === 'W-s1') must(stageDecision(P, 'control1').pass, 'complete F-s1 control pass required');
  return reserveTrajectory(P, name);
}
export function runTrajectory(P, name, stopAt) {
  requireRunnerLocks(P.task_root, name); const stop = deadline(stopAt), a = P.arms[name]; must(a, 'unknown trajectory');
  const gpuLock = resolve(homedir(), '.cache/diagram-vss-modernbert/locks', UUID + '.lock');
  must(lockAvailable(gpuLock), 'shared GPU lock occupied: no trajectory started');
  must(!existsSync(resolve(a.training, '.run.lock')) || lockAvailable(resolve(a.training, '.run.lock')), 'trainer work lock occupied: no trajectory started');
  const { ledger, file, entry } = prepareTrajectory(P, name), work = dirname(a.training);
  must(resolve(a.training) === resolve(P.task_root, name, 'run'), 'unregistered training folder');
  const save = () => atomic(file, ledger), remaining = cap => Math.min(cap, stop - Date.now());
  must(remaining(86400000) > 300000, 'deadline reached');
  const common = ['--data', a.train_data, '--seed', String(a.seed), '--gpu-uuid', UUID, '--stop-at', stopAt, '--epochs', '8', '--lr', '0.00006', '--head-lr', '0.00006', '--batch', '32', '--cut-batch', '8', '--gpu-limit-gib', '5', '--expect-manifest', a.train_data + '.manifest.json'];
  if (a.arm === 'W') common.push('--class-loss-manifest', P.loss_manifest.path);
  const env = { ...offline, CUDA_VISIBLE_DEVICES: UUID, PYTHONUNBUFFERED: '1' }, sources = Object.keys(P.sources), inputs = Object.keys(P.inputs);
  const invoke = (label, argv, cap, extraEnv = env, products = null) => {
    const index = entry.attempts.length, out = resolve(work, 'executions', String(index) + '-' + label);
    products ??= label === 'training' ? [resolve(work, 'run/complete.json')] : [a.model];
    const r = execute({ argv, cwd: REPO, inputs, sources, out, scope: 'actual-model-' + label, timeout: remaining(cap), env: extraEnv, produced: products, takeCpuLock: label === 'export' });
    entry.attempts.push({ label, receipt: resolve(out, 'receipt.json'), sha256: hash(resolve(out, 'receipt.json')) }); save(); return { r, out };
  };
  if (entry.gate?.completed) { verifyHashes(entry.gate.outputs, 'completed gate'); must(entry.gate.passed === true && J(entry.gate.file).passed === true, 'completed overfit quality failure: no retry'); }
  else {
    const previous = entry.attempts.filter(x => x.label === 'overfit').length;
    must(previous === 0 || entry.state === 'gate-resource-interrupted', 'gate may recover only from recorded resource interruption');
    const gateWork = resolve(work, previous === 0 ? 'gate' : 'gate-recovery-' + previous), gate = resolve(gateWork, 'overfit_gate.json');
    must(!existsSync(gateWork), 'unrecorded/completed gate: refuse rerun');
    entry.state = 'gate-running'; save();
    const { r } = invoke('overfit', [PY, '-B', resolve(HERE, '../finetune_modernbert_batched.py'), '--overfit-gate', '--work', gateWork, ...common], 300000, env, [gate]);
    const g = existsSync(gate) ? J(gate) : null;
    const resource = (!!g?.stopped_by && /stop-at|temperature|slowdown|memory|signal|gpu-unreadable|recovery/i.test(String(g.stopped_by))) || (!g && !lockAvailable(gpuLock));
    entry.gate = { file: gate, completed: !resource, passed: g?.passed === true && r.exit_status === 0 && r.signal === null && r.unchanged && !r.error, outputs: g ? hashes([gate]) : {} };
    if (!entry.gate.passed) { entry.state = resource ? 'gate-resource-interrupted' : 'quality-failed'; save(); throw new Error(`overfit gate incomplete/failed (${entry.state}); preserved`); }
    entry.state = 'gate-complete'; save();
  }
  const complete = resolve(work, 'run/complete.json'), checkpoint = resolve(work, 'run/checkpoint.pt');
  if (!existsSync(complete)) {
    must(entry.state !== 'training-running' || existsSync(checkpoint), 'uncheckpointed trajectory cannot restart');
    entry.state = 'training-running'; save();
    const { r } = invoke('training', [PY, '-B', resolve(HERE, '../finetune_modernbert_batched.py'), '--work', resolve(work, 'run'), ...common, ...(existsSync(checkpoint) ? ['--resume'] : [])], 86400000);
    if (r.exit_status !== 0 || r.signal || r.error || !r.unchanged) {
      const stopped = resolve(work, 'run/stopped.json'), reason = existsSync(stopped) ? J(stopped).reason : '';
      const recoverable = (existsSync(checkpoint) && /stop-at|temperature|slowdown|memory|signal|gpu-unreadable|recovery/i.test(String(reason))) || (!existsSync(checkpoint) && !lockAvailable(gpuLock));
      entry.state = recoverable ? 'resource-interrupted' : 'quality-failed'; save(); throw new Error(`training incomplete (${entry.state}): ${reason}`);
    }
    must(existsSync(complete), 'missing completion');
  }
  if (entry.state !== 'export-resource-interrupted') entry.state = 'trained'; save();
  if (entry.state === 'export-resource-interrupted' && existsSync(a.model)) {
    const last = entry.attempts.filter(x => x.label === 'export').at(-1), old = J(last.receipt);
    must(hash(last.receipt) === last.sha256 && old.error && /memory|deadline|signal/i.test(old.error) && same(old.before.sources, P.sources), 'export recovery identity mismatch');
    const archived = resolve(dirname(last.receipt), 'partial-export'); must(!existsSync(archived), 'export archive exists'); renameSync(a.model, archived);
    entry.archived_exports ??= []; entry.archived_exports.push({ dir: archived, files: tree(archived), original_receipt: last.receipt }); save();
  }
  if (!existsSync(a.model)) {
    const { r } = invoke('export', [PY, '-B', resolve(HERE, 'arm_export.py'), '--work', resolve(work, 'run'), '--data', a.train_data, '--out', a.model, '--protocol', P.FP.parent.protocol], 1800000, offline);
    if (![0, 2].includes(r.exit_status) || r.signal !== null || r.error || !r.unchanged) {
      entry.state = (r.error && /memory|deadline|signal/i.test(r.error)) || (r.exit_status === 75 && !existsSync(a.model)) ? 'export-resource-interrupted' : 'quality-failed'; save(); throw new Error(`export incomplete (${entry.state}); preserved`);
    }
  }
  entry.state = 'complete'; save();
  must(completionChecks(P, name).every(c => c.ok), 'completion/export mismatch');
  return entry;
}
function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) { const k = argv[i]; if (!k.startsWith('--')) o._.push(k); else { must(i + 1 < argv.length && !argv[i + 1].startsWith('--'), `missing value ${k}`); o[k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i]; } }
  return o;
}
async function main(argv) {
  if (argv[0] === 'resource-worker') return resourceWorker(argv[1], argv[2]);
  if (argv[0] === 'launch-train') { const o = args(argv); return launchRunner(o.name, o.stopAt); }
  if (['evidence', 'evaluate'].includes(argv[0])) {
    assertNoSymlinks(TASK); assertNoSymlinks(resolve(TASK, 'task-owner.txt')); must(lstatSync(resolve(TASK, 'task-owner.txt')).isFile(), 'owned task required');
    const fd = openLock(owned({ task_root: TASK }, resolve(TASK, 'cpu.lock')));
    try {
      const r = spawnSync('bash', ['-c', 'flock -n 7 || exit 75; exec "$@"', 'rare-heads-cpu', process.execPath, SELF, 'cpu-' + argv[0], ...argv.slice(1)], { env: offline, stdio: ['inherit', 'inherit', 'inherit', 'ignore', 'ignore', 'ignore', 'ignore', fd], timeout: 6 * 3600000, killSignal: 'SIGTERM' });
      return r.status === 0 && !r.signal && !r.error;
    } finally { closeSync(fd); }
  }
  if (['cpu-evidence', 'cpu-evaluate', 'evaluate-worker'].includes(argv[0])) requireCpuLock(TASK);
  if (argv[0] === 'evaluate-worker') requireResourceContext();
  if (argv[0] === 'train') requireRunnerLocks(TASK, args(argv).name);
  const o = args(argv), command = o._[0]; must(o.protocol, '--protocol required'); const P = loadProtocol(o.protocol);
  if (command === 'applicability') { const r = applicability(P, o.name), out = claim(P, o.out, { schema: 'rare-applicability-output-v1', name: o.name, protocol_sha256: P.sha256 }); atomic(resolve(out, 'applicability.json'), r); return r.pass; }
  if (command === 'cpu-evidence') { fixtureEvidence(P, o.out); return true; }
  if (command === 'cpu-evaluate') {
    const timeout = Number(o.timeoutSeconds ?? 7200) * 1000; must(timeout > 0 && timeout <= 86400000, 'finite evaluation deadline');
    const name = o.name, a = P.arms[name]; must(a, 'registered name required');
    const out = owned(P, resolve(P.task_root, name, 'evaluation-executions', String(Date.now())));
    const r = execute({ argv: [process.execPath, SELF, 'evaluate-worker', ...argv.slice(1)], cwd: REPO, inputs: [...Object.keys(P.inputs), ...Object.keys(tree(a.model))], sources: Object.keys(P.sources), out, scope: 'actual-model-evaluation', timeout, produced: [a.bundle] });
    return r.exit_status === 0 && r.signal === null && !r.error && r.unchanged;
  }
  if (command === 'evaluate-worker') { await evaluate(P, o.name, o); return true; }
  if (command === 'verdict') { const v = decide(P, o.stage), out = claim(P, o.out, { schema: 'rare-verdict-output-v1', stage: o.stage, protocol_sha256: P.sha256 }); atomic(resolve(out, 'verdict.json'), v); return v.pass; }
  if (command === 'check-pass') { checkPass(P, o.stage, o.verdict); return true; }
  if (command === 'train') { runTrajectory(P, o.name, o.stopAt); return true; }
  throw new Error('command: applicability|evaluate|evidence|verdict|check-pass|train');
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main(process.argv.slice(2)).then(ok => { process.exitCode = ok ? 0 : 1; }).catch(e => { console.error(e.stack); process.exitCode = 1; });
