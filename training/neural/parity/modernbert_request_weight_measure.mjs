// Registered whole-request class-weighting adapter. Historical folders are read-only.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, readlinkSync, openSync, readSync, closeSync, lstatSync, realpathSync, fstatSync, fsyncSync, constants as FS } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import * as N from './modernbert_next_measure.mjs';
import * as F from './modernbert_forms_measure.mjs';
import { compareRaw } from './modernbert_request_weight_fit.mjs';
import { validateFitEvidence } from './modernbert_request_weight_fit_evidence.mjs';

export const HERE = dirname(fileURLToPath(import.meta.url)), REPO = resolve(HERE, '../../..');
export const TASK = homedir() + '/.cache/diagram-vss-modernbert/request-weighting-2026-11-09';
const PY = homedir() + '/.cache/diagram-vss-modernbert/venv/bin/python';
const UUID = 'GPU-905b8484-3b1e-30f6-defd-05d44f00f692';
const SELF = fileURLToPath(import.meta.url);
export const NEW = ['J-s0'];
export const COMPARATORS = { 'J-s0': ['F-s0', 'B-s0', 'C100-s0'] };
export const STAGES = { seed0: ['J-s0', 'F-s0', 'B-s0', 'C100-s0', 'W-s0'] };
export const CAPS = Object.freeze({overfit: 300000, training: 10800000, export: 3600000, evaluation: 7200000, verdict: 900000});
const J = p => JSON.parse(readFileSync(p, 'utf8'));
export const hash = p => { const h = createHash('sha256'), fd = openSync(p, 'r'), buf = Buffer.alloc(4 * 1024 * 1024); try { for (;;) { const n = readSync(fd, buf, 0, buf.length, null); if (!n) break; h.update(buf.subarray(0, n)); } } finally { closeSync(fd); } return h.digest('hex'); };
const stable = o => JSON.stringify(o, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const same = (a, b) => stable(a) === stable(b);
const digest = o => createHash('sha256').update(stable(o)).digest('hex');
const atomic = (p, o) => { assertNoSymlinks(p); const t = p + '.tmp-' + process.pid + '-' + createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 12); const fd = openSync(t, FS.O_WRONLY | FS.O_CREAT | FS.O_EXCL | FS.O_NOFOLLOW, 0o600); try { writeFileSync(fd, JSON.stringify(o, null, 1) + '\n'); fsyncSync(fd); } finally { closeSync(fd); } assertNoSymlinks(p); renameSync(t, p); const dir = openSync(dirname(p), FS.O_RDONLY | FS.O_DIRECTORY); try { fsyncSync(dir); } finally { closeSync(dir); } };
const must = (condition, message) => { if (!condition) throw new Error(message); };
const hashes = paths => Object.fromEntries(paths.map(p => [resolve(p), hash(p)]));
const offline = { ...process.env, CUDA_VISIBLE_DEVICES: '', OMP_NUM_THREADS: '2', MKL_NUM_THREADS: '2', OPENBLAS_NUM_THREADS: '2', HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1', TOKENIZERS_PARALLELISM: 'false' };
export function verifyHashes(map, label) {
  must(map && Object.keys(map).length > 0, `${label}: empty hashes`);
  for (const [p, h] of Object.entries(map)) must(existsSync(p) && hash(p) === h, `${label}: changed/missing ${p}`);
}
export function loadProtocol(file) {
  const path = assertNoSymlinks(file), P = J(path);
  must(P.version === 'modernbert-request-weight-frozen-v1', 'a frozen request-weight protocol is required');
  must(resolve(P.task_root) === TASK, 'foreign task root');
  verifyHashes(P.inputs, 'frozen inputs'); verifyHashes(P.sources, 'frozen sources');
  const verified = spawnSync(PY, ['-B', resolve(HERE, 'modernbert_request_weight.py'), 'verify', '--protocol', path], { cwd: REPO, env: offline, encoding: 'utf8', timeout: 300000, maxBuffer: 1024 * 1024 });
  must(verified.status === 0 && verified.signal === null, `frozen objective/registration verification failed: ${verified.stderr ?? verified.error ?? ''}`);
  for (const k of ['forms_protocol', 'loss_manifest', 'selections', 'compatibility', 'joint_populations', 'joint_selections', 'row_weights', 'source_review']) must(P[k]?.path && hash(P[k].path) === P[k].sha256, `${k}: missing/changed`);
  must(hash(P.selections.populations.path) === P.selections.populations.sha256, 'populations changed');
  for (const name of [...NEW, 'F-s0', 'B-s0', 'C100-s0', 'W-s0']) must(P.arms?.[name]?.bundle && P.arms[name].model && P.arms[name].training && P.arms[name].train_data, `${name}: incomplete registration`);
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
  out = owned(P, out); const idf = resolve(out, 'request_identity.json');
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
const identity = (P, name) => ({ schema: 'modernbert-request-weight-bundle-v1', protocol_sha256: P.sha256, name, registration: P.arms[name], sources: P.sources, runtime: F.currentRuntime() });
export function recipe(complete) { const s = { ...complete.metadata?.settings }; delete s.seed; delete s.class_loss; delete s.request_class_loss; return s; }
export function completionChecks(P, name, model = null, pendingPhase = null) {
  if (NEW.includes(name)) { owned(P, P.arms[name].model); owned(P, P.arms[name].training); }
  model ??= F.validateModel(P.arms[name].model);
  const a = P.arms[name], c = J(resolve(a.training, 'complete.json')), ref = J(resolve(P.arms['F-s0'].training, 'complete.json'));
  const checks = [], add = (n, v) => checks.push(F.chkBool(`${name}: ${n}`, v));
  add('full completed schedule', c.complete === true && c.full_schedule === true && c.max_updates === 0 && c.state?.epoch === 8 && c.state?.update === 14640 && c.state?.total === 14640);
  add('registered seed', c.metadata?.settings?.seed === a.seed);
  add('unchanged recipe excluding seed and declared objective', Object.keys(recipe(c)).length > 0 && same(recipe(c), recipe(ref)));
  add('same F data', c.metadata?.data?.files?.['train.jsonl'] === hash(resolve(a.train_data, 'train.jsonl')) && c.metadata?.data?.requests === 58552 && c.metadata?.data?.messages === 28330);
  const obj = c.metadata?.settings?.request_class_loss;
  add('explicit objective without stacking', a.arm === 'J' ? c.metadata.settings.class_loss === undefined && obj?.sha256 === P.loss_manifest.sha256 && obj.formula === P.loss_manifest.formula && same(obj.manifest, J(P.loss_manifest.path)) : obj === undefined);
  const sources = c.metadata?.sources;
  add('original training source provenance present', !!sources && Object.keys(sources).length > 0);
  if (NEW.includes(name)) for (const [n, h] of Object.entries(sources ?? {})) add('current training source ' + n, hash(resolve(HERE, '..', n)) === h);
  else add('historical completion is frozen verbatim', P.inputs[resolve(a.training, 'complete.json')] === hash(resolve(a.training, 'complete.json')));
  const r = model.receipt;
  add('export weights bind completed run', r.weights?.sha256 === hash(resolve(a.training, r.weights?.source_file ?? 'checkpoint.pt')) && r.weights?.update === c.state?.update && r.weights?.total === c.state?.total && r.weights?.full_schedule === true);
  add('export source consistency at original training/export', Array.isArray(r.source_changes_since_training) && r.source_changes_since_training.length === 0 && Array.isArray(r.weights?.source_changes_since_training) && r.weights.source_changes_since_training.length === 0);
  add('output contract', r.contract?.output_contract === 'diagram-reader-v2' && r.contract?.protocol?.sha256 === P.FP.parent.protocol_sha256);
  if (NEW.includes(name)) {
    const ledger = J(resolve(P.task_root, 'budget.json'));
    const validation = validateAttemptLedger(P, ledger, {requireComplete: true, pendingPhase});
    add('complete durable attempt ledger', validation.pass);
    if (pendingPhase === 'verdict') add('exactly one completed quality evaluation', validation.counts.evaluation === 1);

  }
  return checks;
}
export function historicalProvenance(P, name) {
  const a = P.arms[name], cf = resolve(a.training, 'complete.json'), ef = resolve(a.model, 'arm_receipt.json'), config = resolve(a.model, 'config.json');
  const frozen = J(P.compatibility.path).historical_training?.[name];
  must(frozen && frozen.metadata?.sources && Object.keys(frozen.metadata.sources).length > 0, 'missing original training provenance');
  for (const [p, k] of [[cf, 'complete_sha256'], [ef, 'export_receipt_sha256'], [config, 'config_sha256']])
    must(P.inputs[p] === hash(p) && frozen[k] === hash(p), 'historical training/export identity changed');
  const c = J(cf), e = J(ef), provenance = J(config).reader?.training_provenance;
  must(same(c.metadata, frozen.metadata), 'historical training metadata changed');
  for (const k of ['base', 'revision', 'settings', 'tokenization', 'sources']) must(same(provenance?.[k], c.metadata[k]), 'historical export provenance changed: ' + k);
  must(same(e.source_changes_since_training, []) && same(e.weights?.source_changes_since_training, []), 'historical export source discrepancy');
  const checkpoint = resolve(a.training, 'checkpoint.pt');
  must(e.weights?.source_file === 'checkpoint.pt' && P.inputs[checkpoint] === hash(checkpoint) && e.weights.sha256 === hash(checkpoint) && e.weights.update === c.state?.update && e.weights.total === c.state?.total && e.weights.full_schedule === true, 'historical checkpoint/export binding differs');
  return frozen.metadata;
}
export function inferenceSourceChecks(recorded, required, root = REPO) {
  const checks = [F.chkBool('complete inference source inventory', recorded && required.every(p => Object.hasOwn(recorded, p)))];
  for (const [p, h] of Object.entries(recorded ?? {})) checks.push(F.chkBool('current inference source ' + p, existsSync(resolve(root, p)) && hash(resolve(root, p)) === h));
  return checks;
}
export function applicability(P, name) {
  must(['F-s0', 'W-s0', 'B-s0', 'C100-s0'].includes(name), 'not a reusable cached arm');
  const a = P.arms[name], nested = ['F-s0', 'W-s0'].includes(name), dir = nested ? resolve(a.bundle, 'eval') : a.bundle;
  const metadata = historicalProvenance(P, name);
  // This checks every recorded measurement/collection dependency against CURRENT bytes.
  // Training provenance above is immutable historical evidence, never a source exemption.
  const rec = F.applicabilityRecord(P.FP, name, dir, { expected: { arm: a.arm, seed: a.seed } });
  const checks = rec.checks.map(c => F.chkBool(c.check, c.ok));
  const collection = [...new Set([...F.COLLECTION_CODE, 'training/neural/parity/collect_set.mjs', 'training/neural/parity/arm_lib.mjs', 'training/neural/parity/sets.mjs', 'training/neural/calibrate_modernbert.mjs', 'docs/js/neural.js', 'docs/js/neural-confidence.js', 'docs/js/bench-canon.js'])];
  for (const file of readdirSync(resolve(dir, 'records')).filter(f => f.endsWith('.manifest.json'))) {
    const manifest = J(resolve(dir, 'records', file));
    if (manifest.runtime?.projected === true) {
      must(manifest.config?.projected_from?.length > 0, 'projected inference origin missing');
      for (const origin of manifest.config.projected_from) {
        const path = origin.file + '.manifest.json';
        checks.push(F.chkBool('original projected inference manifest is frozen', P.inputs[path] === hash(path)));
        checks.push(...inferenceSourceChecks(J(path).config?.code, collection));
      }
    } else checks.push(...inferenceSourceChecks(manifest.config?.code, collection));
  }
  const id = J(resolve(dir, 'identity.json'));
  checks.push(F.chkBool('registered cached model and data', resolve(id.model.dir) === resolve(a.model) && resolve(id.train_data.dir) === resolve(a.train_data)));
  for (const p of Object.keys(tree(a.bundle))) checks.push(F.chkBool('frozen cached bundle ' + relative(a.bundle, p), P.inputs[p] === hash(p)));
  if (name === 'F-s0') F.loadFormsBundle(name, a.bundle, P.FP);
  if (name === 'W-s0') {
    const seal = J(resolve(a.bundle, 'rare_seal.json'));
    verifyHashes(seal.outputs, 'original W seal');
    must(seal.identity_sha256 === hash(resolve(a.bundle, 'rare_identity.json')), 'original W identity changed');
  }
  return { schema: 'modernbert-request-weight-applicability-v1', name, protocol_sha256: P.sha256, scope: 'cached-inference-applicability', original_training_sources: metadata.sources, checks,
    historical_padding_note: name === 'B-s0' ? 'Historical padding-logit failure retained; categorical results do not establish numerical/confidence parity.' : null,
    underlying: rec, pass: checks.length > 0 && checks.every(c => c.ok) && rec.status === 'applicable' };
}
export function loadRegistered(P, name) {
  const a = P.arms[name]; must(a, `unregistered ${name}`);
  if (['F-s0', 'W-s0', 'B-s0', 'C100-s0'].includes(name)) {
    const ap = applicability(P, name); must(ap.pass, `${name}: cached applicability failed: ${ap.checks.filter(c => !c.ok).map(c => c.name)}`);
    return { name, bundle: N.loadBundle(name, ['F-s0', 'W-s0'].includes(name) ? resolve(a.bundle, 'eval') : a.bundle), applicability: ap };
  }
  const dir = owned(P, a.bundle); assertTreeNoSymlinks(dir); must(same(J(resolve(dir, 'request_identity.json')), identity(P, name)), `${name}: bundle identity changed`);
  const seal = J(resolve(dir, 'request_seal.json')); verifyHashes(seal.outputs, `${name} bundle`);
  must(seal.identity_sha256 === hash(resolve(dir, 'request_identity.json')), 'seal identity changed');
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
  const a = P.arms[name]; must(a && NEW.includes(name), 'unregistered evaluation');
  for (const [k, v] of [['model', a.model], ['training', a.training], ['out', a.bundle]]) must(resolve(opts[k]) === resolve(v), `unregistered ${k}`);
  const model = F.validateModel(a.model);
  if (NEW.includes(name)) must(completionChecks(P, name, model, 'evaluation').every(c => c.ok), 'completion/source/objective/export failed');
  const out = claim(P, a.bundle, identity(P, name));
  if (existsSync(resolve(out, 'request_seal.json'))) return loadRegistered(P, name);
  await N.evaluateArm({ protocol: P.FP.parent.protocol, addendum: P.FP.parent.addendum, views: P.FP.parent.views, arm: a.arm, seed: a.seed, model: a.model, trainData: a.train_data, out: resolve(out, 'eval'), threads: '2', includeExternal: true });
  const rootDir = resolve(out, 'root-cause-attempts', String(Date.now())), rootJson = resolve(rootDir, 'root-causes.json'), rootMd = resolve(rootDir, 'root-causes.md');
  const rootDeadline = Math.min(Date.now() + 3600000, requireResourceContext().deadline_ms);
  const root = execute({ argv: [process.execPath, resolve(HERE, 'root_causes.mjs'), resolve(out, 'eval/score.truthful.json'), a.train_data, rootMd, rootJson, '--views=' + P.FP.parent.views, '--confidence=' + resolve(out, 'eval/confidence.json')], cwd: REPO, inputs: Object.keys(tree(resolve(out, 'eval'))), sources: Object.keys(P.sources), out: rootDir, scope: 'actual-model-root-causes', timeout: rootDeadline - Date.now(), deadlineMs: rootDeadline, produced: [rootMd, rootJson] });
  must(root.exit_status === 0 && root.signal === null && !root.error, 'root-cause analysis failed');
  const analysis = J(rootJson); must(analysis.parts?.length > 0 && analysis.parts.every(p => p.reconciliation?.length > 0 && p.reconciliation.every(c => c.ok)), 'root-cause reconciliation missing');
  root.check_count = analysis.parts.reduce((n, p) => n + p.reconciliation.length, 0); root.check_scope = 'root-cause-scorer-reconciliation'; atomic(resolve(rootDir, 'receipt.json'), root);
  atomic(resolve(out, 'request_seal.json'), { identity_sha256: hash(resolve(out, 'request_identity.json')), artifacts_sha256: model.artifacts_sha256, root_cause_receipt: resolve(rootDir, 'receipt.json'), outputs: { ...tree(resolve(out, 'eval')), ...tree(rootDir) } });
  return loadRegistered(P, name);
}
export function resourceLimits(scope) {
  const policy = J(resolve(REPO, 'training/neural/parity/modernbert_request_weight_protocol.json')).resources;
  const gpu = ['actual-model-training', 'actual-model-overfit'].includes(scope);
  const rss = gpu ? policy.host_rss_gib : policy.cpu_inference_rss_gib, floor = gpu ? policy.available_floor_gib : policy.cpu_available_floor_gib;
  must(Number.isFinite(rss) && rss > 0 && Number.isFinite(floor) && floor > 0, 'invalid frozen resource policy');
  return { phase: gpu ? 'gpu-training' : 'cpu', rss_limit_bytes: rss * 1024 ** 3, available_floor_bytes: floor * 1024 ** 3 };
}

// Receipts describe the command that ran; fixture receipts never acquire a model subject.
export function execute({ argv, cwd, inputs, sources, out, scope, timeout, env = offline, produced = [], takeCpuLock = false, deadlineMs = null }) {
  must(Array.isArray(argv) && argv.length > 1 && Number.isFinite(timeout) && timeout > 0 && timeout <= 86400000, 'finite invocation required');
  out = owned({ task_root: TASK }, out); for (const p of produced) { owned({ task_root: TASK }, p); if (existsSync(p) && lstatSync(p).isDirectory()) assertTreeNoSymlinks(p); }
  must(!existsSync(out), `execution receipt output already exists: ${out}`); safeMkdir(out);
  const before = { inputs: hashes(inputs), sources: hashes(sources) }, start = new Date().toISOString(), t = Date.now();
  const cpuGuard = true; // One finite process-group deadline, including trainers that handle SIGTERM themselves.
  const spec = resolve(out, 'invocation.json'), started_ms = Date.now(), deadline_ms = deadlineMs ?? started_ms + timeout;
  must(Number.isFinite(deadline_ms) && deadline_ms > started_ms && deadline_ms <= started_ms + timeout, 'invocation deadline already exhausted or extended');
  atomic(spec, { schema: 'request-weight-resource-context-v1', argv, cwd: resolve(cwd), scope, takeCpuLock, resources: resourceLimits(scope), timeout, task_root: TASK, out, started_ms, deadline_ms });
  const guardFile = resolve(out, 'resource-result.json');
  const actual = cpuGuard ? [process.execPath, SELF, 'resource-worker', spec, guardFile] : argv;
  const specFd = openSync(spec, FS.O_RDONLY | FS.O_NOFOLLOW), inheritedCpu = heldCpuFd(TASK), ownCpu = takeCpuLock && inheritedCpu === null ? openLock(owned({ task_root: TASK }, resolve(TASK, 'cpu.lock'))) : null, cpuFd = inheritedCpu ?? ownCpu;
  let r; try { r = spawnSync(actual[0], actual.slice(1), { cwd, env, encoding: 'utf8', timeout: Math.max(1, deadline_ms - Date.now()) + (cpuGuard ? 10000 : 0), killSignal: 'SIGTERM', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe', 'ignore', 'ignore', 'ignore', specFd, cpuFd ?? 'ignore', ownsLock(8, resolve(TASK, 'budget.lock')) ? 8 : 'ignore', ownsLock(9, resolve(TASK, 'J-s0/.trajectory.lock')) ? 9 : 'ignore'] }); } finally { closeSync(specFd); if (ownCpu !== null) closeSync(ownCpu); }
  assertTreeNoSymlinks(out);
  for (const p of ['stdout.log', 'stderr.log']) assertNoSymlinks(resolve(out, p));
  writeFresh(resolve(out, 'stdout.log'), r.stdout ?? ''); writeFresh(resolve(out, 'stderr.log'), r.stderr ?? '');
  const after = { inputs: hashes(inputs), sources: hashes(sources) };
  const resource = cpuGuard && existsSync(guardFile) ? J(guardFile) : null;
  const rec = { schema: 'modernbert-request-weight-execution-v1', scope, argv, cwd: resolve(cwd), environment: Object.fromEntries(['CUDA_VISIBLE_DEVICES', 'OMP_NUM_THREADS', 'MKL_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'HF_HUB_OFFLINE', 'TRANSFORMERS_OFFLINE', 'TOKENIZERS_PARALLELISM', 'NUM_WORDS', 'LABEL_FIXES', 'IMPLIED_SCALE', 'ROLE_TOO_RICH', 'EXTRA_DIRS'].map(k => [k, env[k] ?? null])), started: start, ended: new Date().toISOString(), elapsed_ms: Date.now() - t, timeout_ms: timeout, exit_status: resource?.exit_status ?? r.status, signal: resource?.signal ?? r.signal, error: resource?.reason ?? r.error?.message ?? null, resource_guard: resource, before, after, unchanged: same(before, after), outputs: { ...hashes([resolve(out, 'stdout.log'), resolve(out, 'stderr.log'), spec, ...(existsSync(guardFile) ? [guardFile] : [])]), ...Object.assign({}, ...produced.filter(existsSync).map(p => readdirOrFile(p))) } };
  atomic(resolve(out, 'receipt.json'), rec); return rec;
}
function readdirOrFile(p) { assertNoSymlinks(p); try { readdirSync(p); return tree(p); } catch (e) { if (e.code === 'ENOTDIR') return hashes([p]); throw e; } }
function processIdentity(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8'), fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
    must(fields.length >= 20, 'truncated process identity');
    return {pid, state: fields[0], parent: Number(fields[1]), group: Number(fields[2]), session: Number(fields[3]), start_time: fields[19]};
  } catch (e) { if (e.code === 'ENOENT' || e.code === 'ESRCH') return null; throw e; }
}
function ownedGroup(leader) {
  if (!leader) return [];
  const current = processIdentity(leader.pid);
  must(!current || current.start_time === leader.start_time, 'process-group leader identity reused');
  const members = [];
  for (const name of readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    const p = processIdentity(Number(name));
    if (p?.group === leader.pid) {
      must(p.session === leader.pid, 'process group no longer belongs to the detached session');
      members.push(p);
    }
  }
  return members;
}
const activeProcess = p => !['Z', 'X'].includes(p.state);
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
  let reason = null, peak = 0, killTimer, cleanupDeadline = null, leaderStatus = null, inspectionError = null;
  const child = spawn(spec.argv[0], spec.argv.slice(1), { cwd: spec.cwd, detached: true, stdio: ['ignore', 'inherit', 'inherit', 'ignore', 'ignore', 'ignore', 6, heldCpuFd(TASK) ?? 'ignore', ownsLock(8, resolve(TASK, 'budget.lock')) ? 8 : 'ignore', ownsLock(9, resolve(TASK, 'J-s0/.trajectory.lock')) ? 9 : 'ignore'] });
  child.once('error', e => { leaderStatus = {exit_status: null, signal: null, reason: String(e)}; });
  child.once('exit', (code, signal) => { leaderStatus = {exit_status: code, signal}; });
  const leader = child.pid ? processIdentity(child.pid) : null, signals = [];
  must(!leader || (leader.group === child.pid && leader.session === child.pid), 'child is not a private process-group leader');
  const signalGroup = signal => {
    try {
      // A group ID is not sufficient ownership evidence after its leader exits.
      // Recheck the start time/session of a current member before each group signal.
      const member = ownedGroup(leader).find(activeProcess), current = member && processIdentity(member.pid);
      if (!current || current.start_time !== member.start_time || current.group !== leader.pid || current.session !== leader.pid) return;
      process.kill(-leader.pid, signal);
      signals.push({signal, at_ms: Date.now(), anchor: current});
    } catch (e) { if (e.code !== 'ESRCH') inspectionError = String(e); }
  };
  const stop = why => {
    if (reason) return; reason = why;
    cleanupDeadline = Date.now() + 5000;
    signalGroup('SIGTERM');
    killTimer = setTimeout(() => signalGroup('SIGKILL'), 2000);
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
  let members = [], inspected = false;
  for (;;) {
    try { members = ownedGroup(leader); inspected = true; }
    catch (e) { inspectionError = String(e); inspected = false; stop('process-group inspection failed'); }
    const active = members.filter(activeProcess);
    if (leaderStatus && inspected && active.length === 0) break;
    if (leaderStatus && active.length > 0) stop('leader exited with live descendants');
    if (cleanupDeadline !== null && Date.now() >= cleanupDeadline) break;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  clearTimeout(timer); clearInterval(watcher); if (killTimer) clearTimeout(killTimer);
  const active = members.filter(activeProcess), zombies = members.filter(p => !activeProcess(p));
  const quiescent = inspected && !inspectionError && active.length === 0;
  if (!quiescent || !leaderStatus) {
    reason = (reason ?? 'process-group completion failed') + '; bounded cleanup did not establish quiescence';
    child.unref(); // Report an unkillable group honestly instead of hanging beyond the finite cleanup budget.
  }
  const status = leaderStatus ?? {exit_status: null, signal: null};
  reason ??= status.reason ?? null;
  process.off('SIGTERM', term); process.off('SIGINT', term);
  const cleanup = {leader, leader_reaped: leaderStatus !== null && !status.reason, signals, deadline_ms: cleanupDeadline,
    active_quiescent: quiescent, active_remaining: active, zombies_remaining: zombies, inspection_error: inspectionError,
    descendant_reaping: 'not reaped by this Node supervisor; zombies await their parent or subreaper'};
  atomic(resultFile, { ...status, exit_status: reason && status.exit_status === 0 ? 1 : status.exit_status, leader_exit_status: status.exit_status,
    reason, process_group_cleanup: cleanup, rss_peak_bytes: peak, ...spec.resources });
  return !reason && quiescent && status.exit_status === 0 && !status.signal;
}
export function countFixture(receipt) {
  verifyHashes(receipt.outputs, 'fixture logs');
  const out = readFileSync(Object.keys(receipt.outputs).find(p => p.endsWith('stdout.log')), 'utf8');
  const lines = out.trim().split('\n'), checks = lines.filter(l => l.startsWith('ok   '));
  const terminal = /^PASS \(([1-9][0-9]*) checks\)$/.exec(lines.at(-1) ?? '');
  return receipt.schema === 'modernbert-request-weight-execution-v1' && receipt.scope === 'perfect-label-fixture' && receipt.exit_status === 0 && receipt.signal === null && !receipt.error && receipt.unchanged === true && same(receipt.before, receipt.after) && !!terminal && Number(terminal[1]) === checks.length && !lines.some(l => l.startsWith('FAIL ')) ? checks.length : 0;
}
const UNIT_RUNNER = 'import sys,unittest,json;sys.path.insert(0,sys.argv[1]);s=unittest.defaultTestLoader.discover(sys.argv[1],pattern=sys.argv[2]);r=unittest.TextTestRunner(verbosity=2).run(s);print(json.dumps(dict(kind="unittest-execution",tests=r.testsRun,failures=len(r.failures),errors=len(r.errors),skipped=len(r.skipped))));sys.exit(0 if r.wasSuccessful() and r.testsRun>0 and not r.skipped else 1)';
const fixtureSpecs = P => [
  { name: 'node-output-contract', argv: [process.execPath, resolve(HERE, 'test_output_contract.mjs')], format: 'checks', scope: 'perfect-label-fixture' },
  { name: 'python-output-contract', argv: [PY, '-B', resolve(HERE, 'test_output_contract.py')], format: 'checks', scope: 'perfect-label-fixture' },
  ...['test_batched_trainer.py', 'test_modernbert_request_class_loss.py', 'test_modernbert_request_weight.py', 'test_modernbert_request_weight_fit.py'].map(name => ({ name, argv: [PY, '-B', '-c', UNIT_RUNNER, HERE, name], format: 'unittest', scope: 'source-harness-fixture' })),
  { name: 'measurement-source', argv: [process.execPath, '--test', '--test-reporter=tap', resolve(HERE, 'test_modernbert_request_weight_measure.mjs')], format: 'tap', scope: 'source-harness-fixture' },
  ...['test_modernbert_request_weight_fit.mjs', 'test_modernbert_request_weight_fit_evidence.mjs'].map(name => ({ name, argv: [process.execPath, '--test', '--test-reporter=tap', resolve(HERE, name)], format: 'tap', scope: 'source-harness-fixture' })),

];
export function countSuite(r, spec) {
  verifyHashes(r.outputs, 'suite outputs');
  if (spec.format === 'checks') return countFixture(r);
  if (r.exit_status !== 0 || r.signal !== null || r.error || !r.unchanged || !same(r.before, r.after) || r.scope !== spec.scope) return 0;
  if (spec.format === 'unittest') {
    const output = readFileSync(Object.keys(r.outputs).find(p => p.endsWith('stdout.log')), 'utf8').trim();
    try { const n = JSON.parse(output.split('\n').at(-1)); return n.kind === 'unittest-execution' && Number.isInteger(n.tests) && n.tests > 0 && n.failures === 0 && n.errors === 0 && n.skipped === 0 ? n.tests : 0; } catch { return 0; }
  }
  if (spec.format === 'roundtrip') {
    const s = J(spec.result), rows = Object.values(s.table ?? {}).filter(x => x.train === true), total = rows.reduce((n, x) => n + (x.gold ?? 0), 0);
    const correct = rows.reduce((n, x) => n + (x.right ?? 0), 0), exact = total > 0 ? correct / total : null;
    const oracle = s.oracle;
    return total === 58552 && rows.length > 0 && rows.every(x => x.gold > 0 && 100 * ((x.right ?? 0) + (x.right_or_ref ?? 0) + (x.asked ?? 0) + (x.held ?? 0)) / x.gold >= 95 && 100 * (x.silent ?? 0) / Math.max(x.rows ?? 0, 1) <= 1) && oracle?.prep === 'modernbert' && oracle.output_contract === 'diagram-reader-v2' && oracle.max_length === 128 && oracle.cut_max_length === 512 && exact === s.exact_only?.['ALL trained folders'] ? total : 0;
  }
  const output = readFileSync(Object.keys(r.outputs).find(p => p.endsWith('stdout.log')), 'utf8').trim();
  const lines = output.split('\n'), get = key => { const l = lines.filter(x => x.startsWith('# ' + key + ' ')); return l.length === 1 ? Number(l[0].slice(key.length + 3)) : NaN; };
  const n = get('tests'); return Number.isInteger(n) && n > 0 && get('pass') === n && ['fail', 'cancelled', 'skipped', 'todo'].every(k => get(k) === 0) && !lines.some(x => /^not ok\b/.test(x)) ? n : 0;
}
export function fixtureEvidence(P, out) {
  requireCpuLock(P.task_root);
  must(resolve(out) === resolve(P.task_root, 'evidence'), 'registered evidence output required');
  out = claim(P, out, { schema: 'request-weight-fixtures-v1', protocol_sha256: P.sha256, sources: P.sources, scope: 'source-and-perfect-label-fixtures' });
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
  const e = { schema: 'modernbert-request-weight-fixture-evidence-v1', protocol_sha256: P.sha256, scope: 'source-and-perfect-label-fixtures', results };
  atomic(resolve(out, 'evidence.json'), e); return e;
}
export function loadFixtureEvidence(P) {
  const dir = resolve(P.task_root, 'evidence'), ev = J(resolve(dir, 'evidence.json'));
  must(ev.schema === 'modernbert-request-weight-fixture-evidence-v1' && ev.scope === 'source-and-perfect-label-fixtures' && ev.protocol_sha256 === P.sha256, 'invalid fixture scope/protocol');
  const specs = fixtureSpecs(P); must(ev.results?.length === specs.length, 'all registered fixture suites required');
  for (const [i, e] of ev.results.entries()) {
    must(hash(e.receipt) === e.sha256, 'fixture receipt changed'); const r = J(e.receipt);
    must(e.name === specs[i].name && same(r.argv, specs[i].argv) && r.cwd === REPO && same(r.before.sources, P.sources) && same(r.before.inputs, P.inputs) && countSuite(r, specs[i]) === e.count && e.count > 0, 'fixture checks invalid');
    verifyHashes(r.before.inputs, 'fixture inputs'); verifyHashes(r.before.sources, 'fixture sources');
  }
  const original = J(P.compatibility.path).roundtrip, result = J(original.result);
  const roundtrip = countSuite({outputs: {[original.result]: hash(original.result), [original.log]: hash(original.log)}, exit_status: 0, signal: null, error: null, unchanged: true, before: {}, after: {}, scope: 'perfect-label-corpus'}, {format: 'roundtrip', scope: 'perfect-label-corpus', result: original.result});
  must(readFileSync(original.exit_status, 'utf8').trim() === '0' && roundtrip === 58552 && result.exact_only?.['ALL trained folders'] === 0.9403265473425332, 'original roundtrip result unavailable');
  return F.chkBool('separate fixtures and unchanged original F roundtrip (not J learned evidence)', true, {results: ev.results, roundtrip: {result: original.result, exact_only: result.exact_only['ALL trained folders'], original_gate: [95, 1], reused: true}});
}
const R0_BARS = { outline_create: [85, 89], outline_coloured_create: [71, 74], outline_set: [93, 97], desc_r2: [34, 35], desc_r2_canonical: [20, 21], count_size: [14, 14], absent_controls: [1440, 1440] };
export function fitRows(P, name) {
  const checks = [], jointResults = [];
  for (const runtime of ['float', 'ort']) {
    const dir = resolve(P.task_root, name, 'fit-' + runtime), { summary: s, rows, batches, context } = validateFitEvidence(P, name, runtime, dir);
    const populations = context.populations;
    const key = runtime === 'ort' ? 'node' : 'python';
    const joint = jointChecks(P, rows, key, context.layout);
    jointResults.push(...joint.map(c => F.chkBool(`${name}/${runtime}/J0: ${c.name}`, c.ok, c)));
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
  return [F.row('J0:' + name, 'complete class vector, action and tags jointly correct in both runtimes', jointResults),
    F.row('R0:' + name, 'inherited positive/absent fit and strict Python/Node parity', checks)];
}
export function jointChecks(P, rows, runtime, layout) {
  const groups = J(P.joint_populations.path), selected = J(P.joint_selections.path);
  must(hash(P.joint_populations.path) === P.joint_populations.sha256 && hash(P.joint_selections.path) === P.joint_selections.sha256, 'joint frozen identities changed');
  must(Array.isArray(selected) && selected.length === 89 && new Set(selected.map(s => s.observation)).size === 89, 'joint selection duplicates/missing observations');
  const by = new Map(rows.map(r => [r.observation, r]));
  must(by.size === rows.length, 'duplicate fit observation');
  const result = [];
  for (const [name, total] of [['fill_outline', 57], ['outline_without_fill', 32]]) {
    const ids = groups[name]; must(Array.isArray(ids) && ids.length === total && new Set(ids).size === total, 'joint population changed');
    let correct = 0;
    for (const observation of ids) {
      const gold = selected.find(x => x.observation === observation), row = by.get(observation), pred = row?.[runtime];
      must(gold && row && pred && gold.targets?.length === 52, 'missing joint raw output');
      // The raw evidence consumer has reconstructed row identities and logits already.
      const identity = row.request === gold.request && row.ordinal === gold.ordinal && row.id === gold.id && row.text === gold.text && same(row.targets, gold.targets) && row.act === gold.act && same(row.tags, gold.tags);
      const names = layout.classes.map(([name]) => name);
      must(names.length === 52 && same(Object.keys(pred.classes), names), 'joint decoded class layout differs');
      if (identity && same(names.map(n => pred.classes[n]), gold.targets) && pred.act === gold.act && same(pred.tags, gold.tags)) correct++;
    }
    result.push({name, correct, requested: total, ok: correct === total});
  }
  must(new Set(Object.values(groups).flat()).size === 89 && same(Object.values(groups).flat().sort((a,b)=>a-b), selected.map(s=>s.observation).sort((a,b)=>a-b)), 'joint partition differs');
  return result;
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
  must(stage === 'seed0', 'only seed0 is registered; no confirmation');
  const b = n => L[n].bundle, rows = [];
  for (const n of ['F-s0', 'B-s0']) rows.push({ ...F.rowF1(F.FORMS_RULES, b('J-s0'), b(n)), id: 'R1:J-s0:' + n });
  rows.push({ ...F.rowF2(F.FORMS_RULES, b('J-s0'), fixture), id: 'R2:J-s0' });
  rows.push(...safetyRows(b('J-s0'), b('F-s0'), b('B-s0'), b('C100-s0')));
  return rows;
}
export function outlineCounts(records, membership) {
  const byId = new Map(records.map(r => [r.id, r]));
  must(byId.size === records.length, 'duplicate quality record identity');
  const seen = new Set(); let fill = 0, outline = 0, joint = 0;
  for (const item of membership) for (const index of item.wires) {
    const key = JSON.stringify([item.id, index]); must(!seen.has(key), 'duplicate outline diagnostic observation'); seen.add(key);
    const r = byId.get(item.id), gold = r?.goldSpans?.[index];
    must(gold?.want?.action === 'create' && gold.want.outline !== undefined, 'wrong outline diagnostic population');
    const paired = r.produced.filter(p => p.g === index), got = paired.length === 1 ? paired[0].got : null;
    const f = !!got && got.color === gold.want.color, o = !!got && got.outline === gold.want.outline;
    fill += Number(f); outline += Number(o); joint += Number(f && o);
  }
  must(seen.size === 80, 'outline diagnostics require the exact 80-request population');
  return {requested: seen.size, fill, outline, joint};
}
function outlineDiagnostics(P, L) {
  const manifest = J(resolve(P.FP.parent.views, 'manifest.json'));
  const pop = manifest.populations.find(p => p.name === 't1_clean_outline_create');
  must(pop?.requests === 80 && pop.view === 't1_all' && pop.part === 'all', 'registered outline population unavailable');
  const path = resolve(P.FP.parent.views, pop.file);
  must(P.inputs[path] === hash(path) && pop.sha256 === hash(path), 'outline diagnostic membership changed');
  const jsonl = p => readFileSync(p, 'utf8').trimEnd().split('\n').map(JSON.parse);
  const membership = jsonl(path), arms = {};
  for (const name of ['J-s0', 'F-s0', 'W-s0']) {
    const b = L[name].bundle, counts = outlineCounts(jsonl(resolve(b.dir, 'records/t1_all.jsonl')), membership);
    const score = b.score.populations?.t1_clean_outline_create;
    must(score?.requested === 80 && Number.isInteger(score.ungated?.right), 'complete-command outline score unavailable');
    arms[name] = {...counts, complete_command_correct: score.ungated.right};
  }
  must(same([arms['F-s0'].fill, arms['F-s0'].outline, arms['F-s0'].joint], [76, 16, 15]) && same([arms['W-s0'].fill, arms['W-s0'].outline, arms['W-s0'].joint], [27, 68, 24]), 'historical outline diagnostic reconstruction differs');
  return {population: pop.name, membership_sha256: pop.sha256, arms, acceptance: 'diagnostic only; R2 still requires at least 72/80 complete commands'};
}
export function decide(P, stage, pendingPhase = null) {
  must(STAGES[stage], 'unknown stage');
  const L = Object.fromEntries(STAGES[stage].map(n => [n, loadRegistered(P, n)])), fixture = loadFixtureEvidence(P);
  const rows = numericalRows(stage, L, fixture);
  for (const n of STAGES[stage].filter(n => NEW.includes(n))) rows.push(F.row('P3:' + n, 'honest completion, objective, source and export binding', completionChecks(P, n, null, pendingPhase)));
  for (const n of STAGES[stage].filter(n => n === 'J-s0')) rows.push(...fitRows(P, n));
  const v = { schema: 'modernbert-request-weight-verdict-v1', stage, protocol_sha256: P.sha256, comparator_matrix: COMPARATORS, explanatory_only: ['W-s0'], rows, bundles: Object.fromEntries(Object.entries(L).map(([n, l]) => [n, { dir: P.arms[n].bundle, score_sha256: hash(resolve(P.arms[n].bundle, ['F-s0', 'W-s0'].includes(n) || NEW.includes(n) ? 'eval/score.truthful.json' : 'score.truthful.json')) }])), pass: rows.length > 0 && rows.every(r => r.pass) };
  v.outline_create_diagnostics = outlineDiagnostics(P, L);
  return v;
}
export function checkPass(P, stage, file) {
  const old = J(file); must(old.schema === 'modernbert-request-weight-verdict-v1' && old.stage === stage && old.protocol_sha256 === P.sha256 && old.bundles && Object.values(old.bundles).every(x => typeof x.dir === 'string'), 'handwritten/dir-less/foreign prerequisite');
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
  must(spec.schema === 'request-weight-resource-context-v1' && spec.task_root === TASK && spec.timeout > 0 && spec.timeout <= 86400000 && spec.started_ms <= Date.now() && spec.deadline_ms > Date.now() && spec.deadline_ms - spec.started_ms <= spec.timeout, 'finite inherited resource context required');
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
    const r = spawnSync('bash', ['-c', 'flock -n 8 || exit 75; flock -n 9 || exit 75; exec "$@"', 'request-weight-runner', process.execPath, SELF, 'train', '--protocol', resolve(TASK, 'frozen/protocol.json'), '--name', name, '--stop-at', stopAt], { env: { ...offline, CUDA_VISIBLE_DEVICES: UUID }, stdio: ['inherit', 'inherit', 'inherit', 'ignore', 'ignore', 'ignore', 'ignore', 'ignore', budget, trajectory], timeout: Math.max(1, deadline(stopAt) - Date.now()) + 60000 });
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
  must(name === 'J-s0' && P.arms[name]?.arm === 'J' && P.arms[name]?.seed === 0, 'only J-s0 trajectory');
  return { schema: 'request-weight-trajectory-v1', name, arm: P.arms[name], protocol_sha256: P.sha256, objective: P.loss_manifest, sources: P.sources, inputs: P.inputs };
}
export function expectedAttemptArgv(P, label, {stop_at, resume = false} = {}) {
  const a = P.arms['J-s0'], work = resolve(P.task_root, 'J-s0');
  if (label === 'overfit' || label === 'training') {
    must(/^\d{4}-\d\d-\d\d \d\d:\d\d$/.test(stop_at ?? ''), 'explicit attempt wall deadline required');
    const common = ['--data', a.train_data, '--seed', '0', '--gpu-uuid', UUID, '--stop-at', stop_at, '--epochs', '8', '--lr', '0.00006', '--head-lr', '0.00006', '--batch', '32', '--cut-batch', '8', '--gpu-limit-gib', '5', '--expect-manifest', a.train_data + '.manifest.json', '--request-class-loss-manifest', P.loss_manifest.path];
    return [PY, '-B', resolve(HERE, '../finetune_modernbert_batched.py'), ...(label === 'overfit' ? ['--overfit-gate'] : []), '--work', resolve(work, label === 'overfit' ? 'gate' : 'run'), ...common, ...(resume ? ['--resume'] : [])];
  }
  if (label === 'export') return [PY, '-B', resolve(HERE, 'arm_export.py'), '--work', a.training, '--data', a.train_data, '--out', a.model, '--protocol', P.FP.parent.protocol];
  if (label === 'evaluation') return [process.execPath, SELF, 'evaluate-worker', '--protocol', P.file, '--name', 'J-s0', '--model', a.model, '--training', a.training, '--out', a.bundle];
  if (label === 'verdict') return [process.execPath, SELF, 'verdict-worker', '--protocol', P.file, '--stage', 'seed0', '--out', resolve(P.task_root, 'verdict-seed0')];
  throw Error('unregistered attempt phase');
}
function successfulReceipt(r, label) {
  return r.signal === null && !r.error && r.unchanged === true && (label === 'export' ? [0, 2].includes(r.exit_status) : r.exit_status === 0);
}
export function overfitPassed(P, g) {
  const last = g?.log?.at(-1), heads = Object.values(last?.keys ?? {});
  return g?.passed === true && g.stopped_by === null && g.rows === 200 && g.class_loss === undefined &&
    g.request_class_loss?.formula === P.loss_manifest.formula && g.request_class_loss.sha256 === P.loss_manifest.sha256 &&
    Number.isInteger(last?.update) && last.update > 0 && last.update <= 400 && Number.isFinite(last.elapsed) && last.elapsed <= 300 &&
    last.act >= .99 && last.act <= 1 && last.word_tags >= .99 && last.word_tags <= 1 && heads.length === 52 &&
    heads.every(h => ['val_n', 'none_n', 'val_ok', 'none_ok'].every(k => Number.isInteger(h[k]) && h[k] >= 0) && h.val_n + h.none_n === 200 &&
      h.val_ok <= h.val_n && h.none_ok <= h.none_n && (!h.val_n || h.val_ok / h.val_n >= .99) && (!h.none_n || h.none_ok / h.none_n >= .99));
}
export function validateAttemptLedger(P, ledger, {requireComplete = false, pendingPhase = null} = {}) {
  must(ledger?.schema === 'request-weight-budget-v1' && ledger.maximum === 1 && same(Object.keys(ledger.trajectories ?? {}), ['J-s0']), 'invalid single-trajectory ledger');
  const entry = ledger.trajectories['J-s0'];
  must(same(entry.identity, trajectoryIdentity(P, 'J-s0')) && Array.isArray(entry.attempts), 'trajectory identity changed');
  const counts = Object.fromEntries(Object.keys(CAPS).map(k => [k, 0])); let elapsed = 0;
  let priorTraining = null, gatePassed = false, trained = false, exported = false;
  for (const [i, attempt] of entry.attempts.entries()) {
    const {label} = attempt; must(Object.hasOwn(CAPS, label), 'unknown attempt label');
    counts[label]++;
    must(counts[label] <= (label === 'training' ? 2 : 1), 'attempt invocation budget exhausted: ' + label);
    must(attempt.index === i && attempt.state !== 'abandoned', 'attempt order/accounting changed');
    must(Number.isFinite(attempt.started_ms) && Number.isFinite(attempt.timeout_ms) && attempt.timeout_ms > 0 && attempt.timeout_ms <= CAPS[label] && attempt.deadline_ms === attempt.started_ms + attempt.timeout_ms, 'invalid attempt deadline');
    must(same(attempt.argv, expectedAttemptArgv(P, label, attempt)), 'unregistered attempt argv');
    const out = owned(P, resolve(P.task_root, 'J-s0/executions', i + '-' + label));
    must(attempt.out === out && attempt.receipt === resolve(out, 'receipt.json'), 'unregistered receipt path');
    if (label !== 'overfit') must(gatePassed, 'successful original overfit required');
    if (label === 'overfit') must(i === 0 && attempt.resume === false, 'overfit must be first and cannot resume');
    if (label === 'training') {
      must(!trained && !exported, 'training after completed schedule refused');
      must(attempt.timeout_ms <= CAPS.training - elapsed, 'aggregate training deadline exhausted');
      if (counts.training === 1) must(attempt.resume === false && !attempt.resume_checkpoint, 'initial training cannot resume');
      else must(attempt.resume === true && priorTraining?.recovery_checkpoint && same(attempt.resume_checkpoint, priorTraining.recovery_checkpoint), 'exact durable checkpoint resume required');
    }
    if (['export', 'evaluation', 'verdict'].includes(label)) must(trained, 'full training required before downstream phase');
    if (['evaluation', 'verdict'].includes(label)) must(exported, 'completed export required');
    if (attempt.state === 'reserved') {
      must(label === pendingPhase && i === entry.attempts.length - 1, 'uncertain attempt accounting; recovery refused');
      const context = requireResourceContext();
      must(context.out === attempt.out && same(context.argv, attempt.argv) && context.timeout === attempt.timeout_ms, 'pending phase is not the supervised invocation');
      continue;
    }
    must(attempt.state === 'finished' && hash(attempt.receipt) === attempt.sha256, 'missing/changed attempt receipt');
    const r = J(attempt.receipt);
    must(r.schema === 'modernbert-request-weight-execution-v1' && r.scope === 'actual-model-' + label && r.cwd === REPO && same(r.argv, attempt.argv), 'fixture or foreign attempt receipt');
    for (const [k, value] of Object.entries({CUDA_VISIBLE_DEVICES: ['overfit', 'training'].includes(label) ? UUID : '', OMP_NUM_THREADS: '2', MKL_NUM_THREADS: '2', OPENBLAS_NUM_THREADS: '2', HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1', TOKENIZERS_PARALLELISM: 'false'}))
      must(r.environment?.[k] === value, 'attempt execution environment differs: ' + k);
    must(same(r.before, r.after) && r.unchanged === true && same(r.before?.sources, P.sources), 'attempt source/input identity changed');
    for (const [p, h] of Object.entries(P.inputs)) must(r.before.inputs[p] === h, 'missing frozen attempt input');
    verifyHashes(r.before.inputs, 'attempt inputs'); verifyHashes(r.before.sources, 'attempt sources'); verifyHashes(r.outputs, 'attempt outputs');
    for (const n of ['stdout.log', 'stderr.log', 'invocation.json', 'resource-result.json']) must(r.outputs[resolve(out, n)] === hash(resolve(out, n)), 'missing attempt output');
    const spec = J(resolve(out, 'invocation.json')), resource = J(resolve(out, 'resource-result.json'));
    must(spec.schema === 'request-weight-resource-context-v1' && same(r.resource_guard, resource) && same(spec.argv, attempt.argv) && spec.scope === r.scope && spec.cwd === REPO && spec.task_root === P.task_root && spec.out === out && spec.timeout === attempt.timeout_ms && same(spec.resources, resourceLimits(r.scope)), 'supervisor receipt/context mismatch');
    must(resource.exit_status === r.exit_status && resource.signal === r.signal && (resource.reason ?? null) === (r.error ?? null) && Number.isFinite(resource.rss_peak_bytes) && resource.rss_peak_bytes >= 0, 'supervisor status contradicts attempt receipt');
    must(Number.isFinite(spec.started_ms) && spec.started_ms >= attempt.started_ms && spec.deadline_ms === attempt.deadline_ms && spec.deadline_ms <= spec.started_ms + attempt.timeout_ms, 'supervisor deadline differs');
    must(r.timeout_ms === attempt.timeout_ms && Number.isFinite(r.elapsed_ms) && r.elapsed_ms >= 0 && r.elapsed_ms <= attempt.timeout_ms + 10000 && attempt.elapsed_ms === r.elapsed_ms, 'unreliable elapsed accounting');
    must(Date.parse(r.started) >= attempt.started_ms && Date.parse(r.ended) >= Date.parse(r.started) && Math.abs(Date.parse(r.ended) - Date.parse(r.started) - r.elapsed_ms) <= 1000, 'invalid attempt time interval');
    const success = successfulReceipt(r, label);
    if (label === 'overfit') {
      const gate = resolve(P.task_root, 'J-s0/gate/overfit_gate.json');
      gatePassed = success && r.outputs[gate] === hash(gate) && overfitPassed(P, J(gate));
      must(gatePassed || entry.attempts.length === 1, 'failed/interrupted overfit stops the experiment');
    }
    if (label === 'training') {
      elapsed += r.elapsed_ms; must(elapsed <= CAPS.training, 'aggregate training time exhausted');
      trained = success && attempt.full_schedule === true;
      if (trained) {
        const file = resolve(P.arms['J-s0'].training, 'complete.json'), c = J(file);
        must(r.outputs[file] === hash(file) && c.complete === true && c.full_schedule === true && c.max_updates === 0 && c.state?.epoch === 8 && c.state?.update === 14640 && c.state?.total === 14640, 'training completion receipt is not a full schedule');
      }
      if (!trained && attempt.recovery_checkpoint) {
        const cp = attempt.recovery_checkpoint;
        must(cp.path === resolve(P.arms['J-s0'].training, 'checkpoint.pt') && /^[a-f0-9]{64}$/.test(cp.sha256) && cp.stopped?.checkpoint === true && Number.isInteger(cp.stopped.update) && cp.stopped.update > 0 && typeof cp.stopped.reason === 'string' && /stop-at|temperature|slowdown|memory|signal|gpu-unreadable|recovery/i.test(cp.stopped.reason), 'unreliable durable checkpoint provenance');
        must(same(cp, r.recovery_checkpoint), 'checkpoint not bound by receipt');
      }
      priorTraining = attempt;
    }
    if (label === 'export') exported = success;
    if (label === 'evaluation') must(success, 'incomplete quality evaluation');
    if (label === 'verdict') must(success, 'incomplete public verdict');
  }
  must(entry.training_elapsed_ms === elapsed, 'aggregate elapsed counter differs from full ledger');
  if (requireComplete) must(gatePassed && trained && exported && entry.state === 'complete', 'incomplete trajectory ledger');
  return {pass: true, counts, training_elapsed_ms: elapsed, gatePassed, trained, exported};
}
export function reserveTrajectory(P, name) {
  const id = trajectoryIdentity(P, name), file = owned(P, resolve(P.task_root, 'budget.json'));
  const ledger = existsSync(file) ? J(file) : {schema: 'request-weight-budget-v1', maximum: 1, trajectories: {}};
  if (ledger.trajectories[name]) {
    validateAttemptLedger(P, ledger);
    must(!['stopped', 'quality-failed'].includes(ledger.trajectories[name].state), 'stopped or quality failure: no restart');
  } else {
    must(ledger.schema === 'request-weight-budget-v1' && ledger.maximum === 1 && Object.keys(ledger.trajectories).length === 0, 'trajectory budget exhausted');
    const work = owned(P, resolve(P.task_root, name));
    must(!existsSync(work) || readdirSync(work).every(n => n === '.trajectory.lock'), 'foreign trajectory folder');
    ledger.trajectories[name] = {identity: id, state: 'reserved', training_elapsed_ms: 0, attempts: []};
  }
  atomic(file, ledger); return {ledger, file, entry: ledger.trajectories[name]};
}
export function prepareTrajectory(P, name, {cached = applicability, fixtures = loadFixtureEvidence} = {}) {
  must(name === 'J-s0', 'only J-s0 trajectory');
  for (const control of ['F-s0', 'W-s0', 'B-s0', 'C100-s0']) must(cached(P, control).pass === true, control + ': cached applicability unavailable; no budget/model work');
  must(P.source_review?.path && hash(P.source_review.path) === P.source_review.sha256 && same(J(P.source_review.path).sources, P.sources) && J(P.source_review.path).status === 'approved', 'exact independent source review required before budget/model work');
  must(fixtures(P).ok === true, 'nonzero source fixture evidence required before budget/model work');
  return reserveTrajectory(P, name);
}
export function reserveAttempt(P, ledger, label, {stop_at, timeout_ms, resume_checkpoint = null} = {}) {
  const validation = validateAttemptLedger(P, ledger), entry = ledger.trajectories['J-s0'];
  must(!['stopped', 'quality-failed'].includes(entry.state), 'stopped experiment cannot continue');
  must(Object.hasOwn(CAPS, label) && validation.counts[label] < (label === 'training' ? 2 : 1), 'attempt invocation budget exhausted: ' + label);
  const resume = label === 'training' && validation.counts.training === 1;
  if (label === 'overfit') must(entry.attempts.length === 0, 'overfit cannot repeat');
  else must(validation.gatePassed, 'successful original overfit required');
  if (label === 'training') {
    must(!validation.trained && !validation.exported && timeout_ms <= CAPS.training - validation.training_elapsed_ms, 'aggregate training time exhausted or training complete');
    if (resume) {
      const prior = entry.attempts.filter(a => a.label === 'training').at(-1);
      must(prior?.recovery_checkpoint && same(prior.recovery_checkpoint, resume_checkpoint), 'durable checkpoint required for resume');
      verifyHashes({[resume_checkpoint.path]: resume_checkpoint.sha256}, 'resume checkpoint');
    } else must(resume_checkpoint === null, 'initial invocation must start from pinned base');
  }
  if (['export', 'evaluation', 'verdict'].includes(label)) must(validation.trained, 'full training required');
  if (['evaluation', 'verdict'].includes(label)) must(validation.exported, 'completed export required');
  must(Number.isFinite(timeout_ms) && timeout_ms > 0 && timeout_ms <= CAPS[label], 'finite phase budget required');
  const index = entry.attempts.length, out = owned(P, resolve(P.task_root, 'J-s0/executions', index + '-' + label)), started_ms = Date.now();
  must(!existsSync(out), 'attempt output already exists');
  const a = {index, label, state: 'reserved', started_ms, timeout_ms, deadline_ms: started_ms + timeout_ms, stop_at: stop_at ?? null, resume, resume_checkpoint, out, receipt: resolve(out, 'receipt.json')};
  a.argv = expectedAttemptArgv(P, label, a); entry.attempts.push(a);
  atomic(owned(P, resolve(P.task_root, 'budget.json')), ledger); return a;
}
export function finishAttempt(P, ledger, attempt, receipt, {full_schedule = false, recovery_checkpoint = null} = {}) {
  must(attempt.state === 'reserved' && same(J(attempt.receipt), receipt) && same(receipt.argv, attempt.argv), 'unreserved/mismatched attempt completion');
  const entry = ledger.trajectories['J-s0'];
  Object.assign(attempt, {state: 'finished', sha256: hash(attempt.receipt), elapsed_ms: receipt.elapsed_ms, full_schedule, recovery_checkpoint});
  if (attempt.label === 'training') entry.training_elapsed_ms += receipt.elapsed_ms;
  atomic(owned(P, resolve(P.task_root, 'budget.json')), ledger);
}
export function runTrajectory(P, name, stopAt) {
  requireRunnerLocks(P.task_root, name); const stop = deadline(stopAt), a = P.arms[name]; must(name === 'J-s0', 'only J-s0');
  const gpuLock = resolve(homedir(), '.cache/diagram-vss-modernbert/locks', UUID + '.lock');
  must(lockAvailable(gpuLock) && lockAvailable(resolve(a.training, '.run.lock')), 'GPU/work lock occupied');
  const {ledger, entry, file} = prepareTrajectory(P, name), save = () => atomic(file, ledger);
  must(resolve(a.training) === resolve(P.task_root, name, 'run') && entry.state !== 'complete', 'unregistered or already completed training');
  const work = dirname(a.training), gate = resolve(work, 'gate/overfit_gate.json'), complete = resolve(a.training, 'complete.json'), checkpoint = resolve(a.training, 'checkpoint.pt');
  const invoke = (label, options, produced) => {
    // Reserve teardown inside the phase allowance, including a SIGKILL grace period.
    const cap = (label === 'training' ? CAPS.training - entry.training_elapsed_ms : CAPS[label]) - 10000;
    const attempt = reserveAttempt(P, ledger, label, {...options, stop_at: stopAt, timeout_ms: Math.min(cap, stop - Date.now() - 10000)});
    const r = execute({argv: attempt.argv, cwd: REPO, inputs: Object.keys(P.inputs), sources: Object.keys(P.sources), out: attempt.out, scope: 'actual-model-' + label, timeout: attempt.timeout_ms, deadlineMs: attempt.deadline_ms, env: label === 'export' ? offline : {...offline, CUDA_VISIBLE_DEVICES: UUID, PYTHONUNBUFFERED: '1'}, produced, takeCpuLock: label === 'export'});
    return {attempt, r};
  };
  if (!entry.attempts.some(x => x.label === 'overfit')) {
    must(!existsSync(dirname(gate)), 'unrecorded gate directory');
    const {attempt, r} = invoke('overfit', {}, [gate]); finishAttempt(P, ledger, attempt, r);
    if (!successfulReceipt(r, 'overfit') || !existsSync(gate) || !overfitPassed(P, J(gate))) {entry.state = 'stopped'; save(); throw Error('failed/interrupted overfit: no retry');}
    entry.state = 'gate-complete'; save();
  }
  if (!validateAttemptLedger(P, ledger).trained) {
    const previous = entry.attempts.filter(x => x.label === 'training').at(-1);
    must(!existsSync(complete), 'unrecorded completed training');
    if (!previous) must(!existsSync(checkpoint), 'unrecorded checkpoint: initial training must start from base');
    const {attempt, r} = invoke('training', {resume_checkpoint: previous?.recovery_checkpoint ?? null}, [complete]);
    const c = existsSync(complete) ? J(complete) : null;
    const full = successfulReceipt(r, 'training') && c?.complete === true && c.full_schedule === true && c.max_updates === 0 && c.state?.epoch === 8 && c.state?.update === 14640 && c.state?.total === 14640;
    let recovery = null;
    const stopped = resolve(a.training, 'stopped.json');
    if (!full && existsSync(checkpoint) && existsSync(stopped)) {
      const st = J(stopped);
      if (st.checkpoint === true && st.update > 0 && /stop-at|temperature|slowdown|memory|signal|gpu-unreadable|recovery/i.test(String(st.reason))) recovery = {path: checkpoint, sha256: hash(checkpoint), stopped: st};
    }
    // The historical checkpoint digest is preserved in immutable attempt evidence even after resume changes the live checkpoint.
    r.recovery_checkpoint = recovery; atomic(attempt.receipt, r);
    finishAttempt(P, ledger, attempt, r, {full_schedule: full, recovery_checkpoint: recovery});
    if (!full) {entry.state = recovery && entry.attempts.filter(x => x.label === 'training').length === 1 && entry.training_elapsed_ms < CAPS.training ? 'recoverable' : 'stopped'; save(); throw Error('training incomplete; only one accounted durable-checkpoint resume is eligible');}
    entry.state = 'trained'; save();
  }
  must(!existsSync(a.model), 'existing export cannot be retried or replaced');
  const {attempt, r} = invoke('export', {}, [a.model]); finishAttempt(P, ledger, attempt, r);
  if (!successfulReceipt(r, 'export')) {entry.state = 'stopped'; save(); throw Error('export failed; no automatic retry');}
  entry.state = 'complete'; save();
  must(completionChecks(P, name).every(c => c.ok), 'completion/export mismatch'); return entry;
}
function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) { const k = argv[i]; if (!k.startsWith('--')) o._.push(k); else { must(i + 1 < argv.length && !argv[i + 1].startsWith('--'), `missing value ${k}`); o[k.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i]; } }
  return o;
}
async function main(argv) {
  if (argv[0] === 'resource-worker') return resourceWorker(argv[1], argv[2]);
  if (argv[0] === 'launch-train') { const o = args(argv); return launchRunner(o.name, o.stopAt); }
  if (['evidence', 'evaluate', 'verdict'].includes(argv[0])) {
    const o = args(argv);
    if (argv[0] === 'evaluate') must(o.name === 'J-s0', 'only J-s0 evaluation');
    if (argv[0] === 'verdict') must(o.stage === 'seed0', 'only seed0; no confirmation');
    assertNoSymlinks(TASK); assertNoSymlinks(resolve(TASK, 'task-owner.txt')); must(lstatSync(resolve(TASK, 'task-owner.txt')).isFile(), 'owned task required');
    const fd = openLock(owned({task_root: TASK}, resolve(TASK, 'cpu.lock'))), runner = argv[0] === 'evidence' ? null : prepareRunner(TASK, 'J-s0');
    try {
      const lock = 'flock -n 7 || exit 75; ' + (runner ? 'flock -n 8 || exit 75; flock -n 9 || exit 75; ' : '') + 'exec "$@"';
      const cap = argv[0] === 'evaluate' ? CAPS.evaluation : argv[0] === 'verdict' ? CAPS.verdict : 6 * 3600000;
      const r = spawnSync('bash', ['-c', lock, 'request-weight-cpu', process.execPath, SELF, 'cpu-' + argv[0], ...argv.slice(1), '--phase-deadline-ms', String(Date.now() + cap)], {env: offline, stdio: ['inherit', 'inherit', 'inherit', 'ignore', 'ignore', 'ignore', 'ignore', fd, runner?.budget ?? 'ignore', runner?.trajectory ?? 'ignore'], timeout: cap + 10000, killSignal: 'SIGTERM'});
      return r.status === 0 && !r.signal && !r.error;
    } finally {closeSync(fd); if (runner) {closeSync(runner.budget); closeSync(runner.trajectory);}}
  }
  if (['cpu-evidence', 'cpu-evaluate', 'cpu-verdict', 'evaluate-worker', 'verdict-worker'].includes(argv[0])) requireCpuLock(TASK);
  if (['cpu-evaluate', 'cpu-verdict', 'evaluate-worker', 'verdict-worker'].includes(argv[0])) requireRunnerLocks(TASK, 'J-s0');
  if (['evaluate-worker', 'verdict-worker'].includes(argv[0])) requireResourceContext();
  if (argv[0] === 'train') requireRunnerLocks(TASK, args(argv).name);
  const o = args(argv), command = o._[0]; must(o.protocol, '--protocol required'); const P = loadProtocol(o.protocol);
  if (command === 'applicability') {
    must(resolve(o.out) === resolve(P.task_root, 'applicability', o.name), 'registered applicability output required');
    const r = applicability(P, o.name), out = claim(P, o.out, {schema: 'request-applicability-output-v1', name: o.name, protocol_sha256: P.sha256}); atomic(resolve(out, 'applicability.json'), r); return r.pass;
  }
  if (command === 'cpu-evidence') {fixtureEvidence(P, o.out); return true;}
  if (['cpu-evaluate', 'cpu-verdict'].includes(command)) {
    const label = command === 'cpu-evaluate' ? 'evaluation' : 'verdict', a = P.arms['J-s0'];
    if (label === 'evaluation') {
      must(o.name === 'J-s0' && ['model', 'training', 'out'].every(k => resolve(o[k]) === resolve(k === 'out' ? a.bundle : a[k])), 'unregistered evaluation paths');
    } else must(o.stage === 'seed0' && resolve(o.out) === resolve(P.task_root, 'verdict-seed0'), 'unregistered verdict stage/path');
    const requested = o.timeoutSeconds === undefined ? CAPS[label] : Number(o.timeoutSeconds) * 1000;
    const phaseDeadline = Number(o.phaseDeadlineMs), cap = Math.min(requested, phaseDeadline - Date.now()) - 10000;
    must(Number.isFinite(requested) && requested > 0 && requested <= CAPS[label] && Number.isFinite(cap) && cap > 0 && phaseDeadline <= Date.now() + CAPS[label], 'finite registered phase deadline required');
    const {ledger} = reserveTrajectory(P, 'J-s0');
    const attempt = reserveAttempt(P, ledger, label, {timeout_ms: cap});
    const products = label === 'evaluation' ? [a.bundle] : [resolve(P.task_root, 'verdict-seed0')];
    const r = execute({argv: attempt.argv, cwd: REPO, inputs: [...Object.keys(P.inputs), ...Object.keys(tree(a.model))], sources: Object.keys(P.sources), out: attempt.out, scope: 'actual-model-' + label, timeout: cap, deadlineMs: attempt.deadline_ms, produced: products});
    finishAttempt(P, ledger, attempt, r);
    must(successfulReceipt(r, label), 'phase failed; no automatic retry');
    if (label === 'verdict') return J(resolve(P.task_root, 'verdict-seed0/verdict.json')).pass;
    return true;
  }
  if (command === 'evaluate-worker') {await evaluate(P, o.name, o); return true;}
  if (command === 'verdict-worker') {
    must(o.stage === 'seed0' && resolve(o.out) === resolve(P.task_root, 'verdict-seed0'), 'registered seed0 verdict required');
    const v = decide(P, o.stage, 'verdict'), out = claim(P, o.out, {schema: 'request-verdict-output-v1', stage: o.stage, protocol_sha256: P.sha256});
    atomic(resolve(out, 'verdict.json'), v); return true; // A measured gate failure is a completed verdict, never authorization for another run.
  }
  if (command === 'check-pass') {checkPass(P, o.stage, o.verdict); return true;}
  if (command === 'train') {runTrajectory(P, o.name, o.stopAt); return true;}
  throw new Error('command: applicability|evaluate|evidence|verdict|check-pass|train');
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main(process.argv.slice(2)).then(ok => { process.exitCode = ok ? 0 : 1; }).catch(e => { console.error(e.stack); process.exitCode = 1; });
