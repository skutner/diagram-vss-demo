// collect_set.mjs: a reader on named sets, one record per message (arm_lib.mjs buildRecord: the format of collect_modernbert.mjs, plus set,
// part, kind, writer, session, group, the second teacher's gold, the wires of every produced request).
//   READER=modernbert|sop|rules [MODEL=folder] [THREADS=n] node collect_set.mjs --train-data DIR [--allow-text-overlap] [--views=DIR] OUT.jsonl SET...
// --views=DIR: a folder of frozen views (modernbert_next_measure.mjs `views`; manifest.json and one file per view, every file checked against its hash):
// SET may then also be the name of a view (calibration, fresh2_test, ..., lowercase_other). The views folder's manifest hash is bound into the
// collection's manifest, so a resume after the views changed is refused. Without the flag nothing changes.
// Refuses a message whose id, or whose text up to case and spacing, is in DIR/train.jsonl or DIR/cut_train.jsonl (the arm trained on it);
// --allow-text-overlap accepts a text overlap (not an id overlap) and marks each such record train_text_overlap and lists them in the manifest.
// MODEL: any folder with config.json, tokenizer files and onnx/, in or outside docs/model (modernbert, sop). SET: fresh2 short3 collected_1
// scenes_test nl_a (sets.mjs; nl_b is sealed). --train-data DIR: the arm's data folder: DIR/train.jsonl (its hash is recorded) and the trigger inventory
// of the seen / unseen split: DIR/trigger_inventory.json (trigger_inventory.mjs; the registered definition), else the words of the
// train.jsonl rows (a trigger is seen when its words occur one after the other in a training request: a fallback, said in the manifest).
// Context of a read: names = the row's names and group names; last = [] for a single message; in a session (rows with a session, in file
// order) what the gold of the previous step touched, the gold played on the drawing of the first step's setup (scene_readers.mjs).
// The drawing (ctx.drawing, read only by a model whose reader has `drawing`, arm M4): a session's gold drawing with the source text of the shapes its
// steps made (drawing-lines.js noteMessage), a row's setup, else the row's names and groups alone (canvas_lib.mjs namesState).
// A request the second read marks drawingCut (a shape it means may be in the part of the drawing the cap left out) is recorded as truncated: held, as neural.js gateReader.
// One process, one message at a time, a progress line every 100 messages. OUT.jsonl is appended record by record; OUT.jsonl.manifest.json
// binds reader, model files, sets, code and runtime. Run it again with the same arguments after a stop: it keeps the complete records,
// repairs a record cut in half by the stop (and says so), refuses a changed model, set, data or code, and checks the final file. A message
// the reader fails on gets a record with `error` and no produced requests; the exit code is then 3.
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdtempSync, rmSync, readdirSync, statSync, truncateSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, basename, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { K, ROOT, touched, cp } from './parity_lib.mjs';
import { signals } from '../../../docs/js/neural-confidence.js';
import { nextContext } from '../../../docs/js/vss-composer.js';
import { hashFile, digest, atomicJSON, inputHash } from '../calibrate_modernbert.mjs';
import { EXECUTION_POLICY } from '../modernbert_parity.mjs';
import { contextNames } from './sets.mjs';
import { buildRecord, setDigest, seenFunction, ngramInventory, startSystem, playGold, refsOf, RECORD_SCHEMA, loadSetsOrViews, loadViewDir } from './arm_lib.mjs';
import { namesState } from './canvas_lib.mjs';
const DL = createRequire(import.meta.url)('../../../docs/js/drawing-lines.js');

const CODE = ['training/neural/parity/collect_set.mjs', 'training/neural/parity/arm_lib.mjs', 'training/neural/parity/sets.mjs', 'training/neural/parity/parity_lib.mjs',
  'training/neural/calibrate_modernbert.mjs', 'docs/js/neural.js', 'docs/js/neural-confidence.js', 'docs/js/drawing-lines.js', 'training/neural/parity/canvas_lib.mjs', 'docs/js/logic.js', 'docs/js/bench-canon.js', 'docs/js/vss-composer.js', 'training/sketch/layer_common.mjs'];
const READERS = ['modernbert', 'sop', 'rules'];

export function filesOf(dir) {
  const out = {};
  const walk = d => { for (const f of readdirSync(d).sort()) { const p = d + '/' + f; if (statSync(p).isDirectory()) walk(p); else out[relative(dir, p)] = hashFile(p); } };
  walk(dir);
  return out;
}
export function trainData(dir) {
  const train = resolve(dir, 'train.jsonl');
  if (!existsSync(train)) throw new Error(`--train-data ${dir}: train.jsonl is missing`);
  const invFile = resolve(dir, 'trigger_inventory.json');
  if (existsSync(invFile)) {
    const j = JSON.parse(readFileSync(invFile, 'utf8'));
    if (!Array.isArray(j.triggers) || !j.triggers.length) throw new Error(invFile + ': no triggers');
    return { dir: resolve(dir), train_sha256: hashFile(train), inventory: { source: invFile, exact: true, triggers: j.triggers.length, sha256: digest(JSON.stringify(j.triggers)), definition: j.source }, seen: seenFunction({ exact: j.triggers }) };
  }
  const rows = readFileSync(train, 'utf8').split('\n').filter(x => x.trim()).map(JSON.parse);
  if (rows.some(r => r.trigger)) return { dir: resolve(dir), train_sha256: hashFile(train), inventory: { source: train, exact: true, triggers: new Set(rows.filter(r => r.trigger).map(r => String(r.trigger).toLowerCase())).size, definition: 'trigger field of the train.jsonl rows' },
    seen: seenFunction({ exact: rows.filter(r => r.trigger).map(r => r.trigger) }) };
  return { dir: resolve(dir), train_sha256: hashFile(train), inventory: { source: train, exact: false, definition: 'a trigger is seen when its words occur one after the other in a training request (train.jsonl rows hold no trigger; make trigger_inventory.json with trigger_inventory.mjs for the registered definition)', rows: rows.length },
    seen: seenFunction(ngramInventory(rows)) };
}

/** the first experiment's assertDisjointIDs, and the same for text: an evaluated message whose id is in the arm's training rows, or whose text (up to case and spacing) is
 *  the text of a training row (train.jsonl: a request; cut_train.jsonl: a whole message), is refused. Exact-text overlaps of short commands exist (the
 *  synthetic short commands of the training data: "undo", "bigger"): --allow-text-overlap accepts them, lists them in the manifest and marks each
 *  record `train_text_overlap`. An id overlap is never accepted. */
const norm = t => t.toLowerCase().split(/\s+/).filter(Boolean).join(' ');   // the same text up to case and spacing
function trainOverlap(items, dir, allowText) {
  const ids = new Set(), texts = new Set();
  for (const f of ['train.jsonl', 'cut_train.jsonl']) {
    const p = resolve(dir, f);
    if (!existsSync(p)) { if (f === 'train.jsonl') throw new Error(p + ' is missing'); continue; }
    for (const l of readFileSync(p, 'utf8').split('\n')) { if (!l.trim()) continue; const r = JSON.parse(l); if (r.id != null) ids.add(String(r.id)); if (typeof r.text === 'string') texts.add(norm(r.text)); }
  }
  const canvas = resolve(dir, 'canvas/canvas_train.jsonl');   // arm M4's second-read rows (build_canvas_rows.mjs): id "<message id>#<wire>"
  if (existsSync(canvas)) for (const l of readFileSync(canvas, 'utf8').split('\n')) if (l.trim()) ids.add(String(JSON.parse(l).id).replace(/#\d+$/, ''));
  const byId = items.filter(it => ids.has(it.id)).map(it => it.id), byText = items.filter(it => texts.has(norm(it.text))).map(it => it.id);
  if (byId.length) throw new Error(`${byId.length} evaluated messages have the id of a training row (${byId.slice(0, 5).join(', ')}...): not an evaluation of this arm`);
  if (byText.length && !allowText) throw new Error(`${byText.length} evaluated messages have the text of a training row (${byText.slice(0, 5).join(', ')}...). Not an evaluation set for this arm; --allow-text-overlap accepts it and marks the records`);
  return { text: byText };
}

function readFileRecords(path, items) {
  // a record cut in half by a stop: drop it (the file ends without a newline); everything before it must be complete records of this run
  const buf = readFileSync(path);
  let end = buf.length, repaired = false;
  if (end && buf[end - 1] !== 10) { end = buf.lastIndexOf(10) + 1; repaired = true; }
  if (repaired) { truncateSync(path, end); console.error(`${path}: the last record was cut in half by a stop; removed it, it is read again`); }
  // keyed by set AND id: the same id may be in two views (a bare or spelled view of a message), never twice in one set (the ids of the sets of sets.mjs are unique across sets, so for them this is the old key)
  const want = new Map(items.map(it => [it.set + '\0' + it.id, it])), recs = [], seen = new Set();
  buf.subarray(0, end).toString('utf8').split('\n').filter(l => l.trim()).forEach((l, i) => {
    let r; try { r = JSON.parse(l); } catch { throw new Error(`${path}:${i + 1}: not JSON; not a file of this collection (move it away and collect again)`); }
    const it = want.get(r.set + '\0' + r.id);
    if (!it) throw new Error(`${path}:${i + 1}: record ${r.id} is not in the sets of this run`);
    if (seen.has(r.set + '\0' + r.id)) throw new Error(`${path}:${i + 1}: duplicate record ${r.id}`);
    if (r.input_sha256 !== inputHash({ id: it.id, text: it.text, names: it.names, wires: it.wires })) throw new Error(`${path}:${i + 1}: record ${r.id} was made from other input than the set holds now`);
    seen.add(r.set + '\0' + r.id); recs.push(r);
  });
  return { recs, repaired };
}

export async function loadNeural(folder) {
  const require = createRequire(new URL('../../laptop/package.json', import.meta.url)), T = require('@huggingface/transformers');
  globalThis.SOPKit = K;   // docs/js/neural.js reads it when it loads
  const N = createRequire(import.meta.url)(ROOT + '/docs/js/neural.js');
  const cfg = JSON.parse(readFileSync(folder + '/config.json', 'utf8'));
  if (!cfg.reader) throw new Error(folder + '/config.json: not a joint reader (no reader layout)');
  const name = basename(folder), cache = mkdtempSync(tmpdir() + '/arm-collection-');
  T.env.allowRemoteModels = false; T.env.allowLocalModels = true; T.env.localModelPath = dirname(folder) + '/'; T.env.useBrowserCache = false; T.env.useFSCache = true; T.env.cacheDir = cache;
  const modern = cfg.model_type === 'modernbert', OURS = Object.fromEntries(Object.entries(N.OURS).map(([id, f]) => [f, id]));
  const dtype = modern ? 'q8' : N.dtypeOf(OURS[name] || name);
  const session_options = { ...(modern ? { graphOptimizationLevel: EXECUTION_POLICY.graph_optimization } : {}), ...(process.env.THREADS ? { intraOpNumThreads: +process.env.THREADS } : {}) };
  const tokenizer = await T.AutoTokenizer.from_pretrained(name, { local_files_only: true });
  const model = await T.AutoModel.from_pretrained(name, { device: 'cpu', dtype, local_files_only: true, session_options });
  const neural = N.create(K.createSystem().engine, () => { throw new Error('the reader called the Rules'); }, { activateCut: false, requireJoint: true });
  const m = N.makeReader(T, tokenizer, model); neural.setModels(m); neural.setStrategy('finetuned');
  const runtime = { transformers_js: T.env.version, onnxruntime: T.env.backends.onnx.versions?.node, node: process.version, backend: 'cpu', dtype, session_options, model_type: cfg.model_type };
  return { neural, m, runtime, dispose: async () => { try { await model.dispose(); } finally { rmSync(cache, { recursive: true, force: true }); } } };
}

/** the structural hold of a v2 reader (docs/js/neural.js; shared contract of reports/modernbert-next-implementation-checkpoint.md: `blocked`, `block_reasons: [{kind, key, source_span}]`)
 *  of the request node n of analysis si -> {blocked, block_reasons}, or null when the reader writes none (a legacy reader: never blocked, the record carries no field).
 *  Where the reader puts the field is its writer's choice; this looks on the node, its unit, the joint read and the analysis, and nowhere else. */
export function blockOf(result, n, si) {
  for (const o of [n, n.unit, si >= 0 ? result.joint?.reads?.[si] : null, si >= 0 ? result.analyses?.[si] : null]) {
    if (o && o.blocked !== undefined) return { blocked: !!o.blocked, block_reasons: Array.isArray(o.block_reasons) ? o.block_reasons : [] };
  }
  return null;
}
const unitOf = (n, text) => { if (n.span) return [n.span[0], n.span[1]]; const k = n.src ? text.indexOf(n.src) : -1; return k < 0 ? [0, 0] : [k, k + n.src.length]; };
export function runOfNeural(result, m, text) {
  const nodes = result.nodes, owner = new Map(nodes.map(n => [n.id, n.unit?.id])), byId = new Map(nodes.map(n => [n.id, n]));
  const mains = nodes.filter(n => n.type !== 'mention').map(n => {
    const si = result.analyses.indexOf(n.unit), sig = si >= 0 ? signals(result, si) : null;
    let f = sig && !sig.detail.noCut ? sig.f : null;
    if (f && Object.values(f).some(v => v != null && !Number.isFinite(v))) f = null;   // never executed at a threshold: fail closed
    const refs = [...new Set(Object.values(n.args || {}).flatMap(refsOf))], blocked = blockOf(result, n, si);
    return { node: n, mentions: refs.map(id => byId.get(id)).filter(x => x && x.type === 'mention'), span: unitOf(n, text), src: n.unit?.src ?? n.src ?? '', f, act: f ? sig.act : null,
      truncated: !!result.joint.reads[si]?.truncated || !!n.unit?.drawingCut, wireId: n.unit.id, dependencies: [...new Set(refs.map(id => owner.get(id)).filter(id => id && id !== n.unit.id))], ...(blocked || {}) };
  });
  return { mains, allNodes: nodes, unread: result.unread || [], cutInfo: m.cutInfo(text) };
}
function runOfRules(nodes, text) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const mains = nodes.filter(n => n.type !== 'mention').map(n => {
    const refs = [...new Set(Object.values(n.args || {}).flatMap(refsOf))];
    return { node: n, mentions: refs.map(id => byId.get(id)).filter(x => x && x.type === 'mention'), span: unitOf(n, text), src: n.src ?? '', f: null, act: null, truncated: false, wireId: n.id, dependencies: [] };
  });
  return { mains, allNodes: nodes, unread: [], cutInfo: null, cut: 'rules' };
}

async function main() {
  const args = process.argv.slice(2), pos = []; let dataDir = null, allowText = false, viewsDir = null;
  for (let i = 0; i < args.length; i++) { if (args[i] === '--train-data') dataDir = args[++i]; else if (args[i] === '--allow-text-overlap') allowText = true; else if (args[i].startsWith('--train-data=')) dataDir = args[i].slice(13); else if (args[i].startsWith('--views=')) viewsDir = args[i].slice(8); else if (args[i].startsWith('--')) throw new Error('Unknown flag ' + args[i]); else pos.push(args[i]); }
  const [out, ...setNames] = pos, reader = process.env.READER;
  if (!READERS.includes(reader) || !out || !setNames.length || !dataDir) throw new Error('READER=modernbert|sop|rules [MODEL=folder] node collect_set.mjs --train-data DIR OUT.jsonl SET...');
  const folder = reader === 'rules' ? null : process.env.MODEL ? resolve(process.env.MODEL) : null;
  if (reader !== 'rules' && !folder) throw new Error('MODEL=folder is required for READER=' + reader);
  if (folder && !existsSync(folder + '/config.json')) throw new Error(`MODEL=${folder}: no config.json`);
  const views = viewsDir ? loadViewDir(viewsDir) : null, viewsSha = viewsDir ? hashFile(resolve(viewsDir, 'manifest.json')) : null;
  const sets = loadSetsOrViews(setNames), items = sets.flatMap(s => s.items), td = trainData(dataDir), overlap = trainOverlap(items, dataDir, allowText), overlapIds = new Set(overlap.text), manifestPath = out + '.manifest.json', lockPath = out + '.lock';
  const modelFiles = folder ? filesOf(folder) : null, artifacts = modelFiles ? digest(JSON.stringify(modelFiles)) : 'rules:' + digest(readFileSync(ROOT + '/docs/js/logic.js', 'utf8'));
  const codeHashes = Object.fromEntries(CODE.map(p => [p, hashFile(resolve(ROOT, p))]));
  const config = { schema: RECORD_SCHEMA, reader, model: folder ? { folder, files: modelFiles } : null, artifacts_sha256: artifacts,
    train_data: { dir: td.dir, train_sha256: td.train_sha256, inventory: td.inventory, text_overlap_allowed: allowText, text_overlap_ids: overlap.text }, sets: sets.map(s => ({ name: s.name, messages: s.items.length, excluded: s.excluded, files: s.files, teachers: s.teachers, input_sha256: setDigest(s.items) })),
    code: codeHashes, threads: process.env.THREADS || null, ...(views ? { views: { dir: resolve(viewsDir), manifest_sha256: viewsSha, names: views.views } } : {}) };
  const sameConfig = m => JSON.stringify(m.config) === JSON.stringify(config);
  if (existsSync(lockPath)) { const pid = +readFileSync(lockPath, 'utf8'); let alive = false; try { process.kill(pid, 0); alive = true; } catch { /* gone */ } if (alive) throw new Error(`${out} is being written by process ${pid}`); unlinkSync(lockPath); }
  writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
  const releaseLock = () => { try { unlinkSync(lockPath); } catch { /* gone */ } };
  let done = [], failed = [];
  try {
    if (existsSync(out)) {
      if (!existsSync(manifestPath)) throw new Error(`${out} exists without ${manifestPath}: not a collection of this tool; use a fresh path`);
      const old = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (!sameConfig(old)) throw new Error(`${manifestPath}: the model, sets, data or code changed since this file was started; use a fresh path (the old records are not a result of this configuration)`);
      const r = readFileRecords(out, items); done = r.recs; failed = done.filter(x => x.error).map(x => x.id);
      console.error(`resuming: ${done.length} of ${items.length} records kept${r.repaired ? ' (one repaired)' : ''}`);
    } else writeFileSync(out, '', { flag: 'wx' });
    const manifest = { config, complete: false, runtime: null, started: new Date().toISOString(), records: null, expected: items.length, failed };
    atomicJSON(manifestPath, manifest);
    const doneIds = new Set(done.map(r => r.id));
    let N = null;
    if (doneIds.size < items.length) {
      if (reader === 'rules') { manifest.runtime = { node: process.version, backend: 'cpu', reader: 'rules (docs/js/logic.js createSystem().formalize)' }; }
      else { N = await loadNeural(folder); manifest.runtime = N.runtime; }
    }
    atomicJSON(manifestPath, manifest);
    let count = 0, session = null, G = null, last = [], namesMismatch = [], goldErrors = 0, src = null;
    const t0 = Date.now();
    try {
      for (const it of items) {
        // the gold drawing of a session, step by step (also for the steps already done: the replay is cheap and the state must be there)
        if (it.session != null) {
          if (it.session !== session) { session = it.session; G = startSystem(it.setup); last = []; goldErrors += G.errors.length; src = new Map(); }
        } else { session = null; G = null; last = []; src = null; }
        const names = contextNames(it);
        if (G) {
          const st = G.s.world.state, eng = st.shapes.map(s => s.name).concat((st.groups || []).map(g => g.name));
          if (!it.unreliable && [...eng].sort().join('\0') !== [...names].sort().join('\0')) namesMismatch.push(it.id);
        }
        if (!doneIds.has(it.id)) {
          let run, error = null;
          try {
            if (reader === 'rules') {
              const S = G ? G.s : it.setup ? startSystem(it.setup).s : null, r = K.createSystem();
              if (S) r.world.state = cp(S.world.state);
              run = { reader, ...runOfRules(r.formalize(it.text, { names: names.slice(), last: last.slice() }).nodes, it.text) };
            } else {
              const drawing = G ? { state: cp(G.s.world.state), sources: new Map(src) } : it.setup ? { state: startSystem(it.setup).s.world.state, sources: new Map() } : { state: namesState(it), sources: new Map() };
              const result = await N.neural.formalize(it.text, { names: names.slice(), last: last.slice(), drawing }, { update: nextContext, signals: true });
              run = { reader, cut: 'own', ...runOfNeural(result, N.m, it.text) };
            }
          } catch (e) { error = String(e && e.message || e); run = { reader, cut: reader === 'rules' ? 'rules' : 'own', mains: [], allNodes: [], unread: [], cutInfo: null, error }; failed.push(it.id); console.error(`FAILED ${it.id}: ${error}`); }
          const rec = buildRecord(it, run, { seen: td.seen, artifactsKey: artifacts });
          if (overlapIds.has(it.id)) rec.train_text_overlap = true;
          appendFileSync(out, JSON.stringify(rec) + '\n'); doneIds.add(it.id);
        }
        if (G) { const before = G.s.world.state.shapes.map(s => s.name), res = playGold(G.s, it.wires); goldErrors += (res.errors || []).length; last = touched(G.s, res); DL.noteMessage(src, before, G.s.world.state, it.text, res.steps); }
        if (++count % 100 === 0) console.error(`${count} of ${items.length} messages (${reader}${folder ? ', ' + basename(folder) : ''}), ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
    } finally { if (N) await N.dispose(); }
    const recs = readFileRecords(out, items).recs;
    if (recs.length !== items.length) throw new Error(`The file holds ${recs.length} records for ${items.length} messages`);
    manifest.complete = true; manifest.finished = new Date().toISOString();
    manifest.records = { count: recs.length, sha256: hashFile(out) }; manifest.failed = failed;
    manifest.context = { session_steps_with_other_names_than_the_gold_drawing: namesMismatch.length, example_ids: namesMismatch.slice(0, 5), gold_engine_errors: goldErrors };
    atomicJSON(manifestPath, manifest);
    console.log(JSON.stringify({ reader, messages: recs.length, failed: failed.length, records: out, manifest: manifestPath, complete: true, names_mismatch: namesMismatch.length, gold_engine_errors: goldErrors }));
    if (failed.length) { console.error(`${failed.length} messages failed in the reader (see the manifest)`); process.exitCode = 3; }
  } finally { releaseLock(); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
