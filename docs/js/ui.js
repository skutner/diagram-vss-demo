(function () {
'use strict';
const K = SOPKit;
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const svg = $('#canvas'), layer = $('#layer'), framesG = $('#frames'), msgs = $('#msgs');
const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Four readers turn each message into SOP wires, and VSS-BERT combines two of them. Each has its own system (world, engine, undo/redo),
// changed only by its own readings; the canvas shows the active tab's world. Every message goes to every reader that is loaded. The tab of the
// neural reader is labelled SOP-BERT (its id stays 'neural'); VSS-BERT (id 'combined') is the combined reader of VSS and SOP-BERT (see the
// "VSS-BERT" block below; training/sketch/combine/COMBINED_READER.md).
// The tabs (owner, 2026-11-03 09:30): VSS-BERT first, then Rules, VSS, SOP-BERT; the page opens on VSS-BERT. The "3 readers" tab (the three
// readers voting) was removed then: VSS-BERT measured better (test part cost score 34.8 against 31.8, confidently wrong 1.8% against 2.6%).
// READERS is the order of the tabs, of the lines of a reply and of the details; READ_ORDER is the order in which they read a message
// (VSS-BERT reuses the readings of VSS and SOP-BERT, so it reads last).
// OPUS: the tab of the saved SOP Lang translations written by Claude Opus 5.5 (see "Saved translations of Claude Opus 5.5" below), after the
// gpt-6.1-sol tab; it is named after the model that wrote them (docs/sop-translations/<model>/manifest.json, model.name; test_saved_sop.mjs).
const OPUS = { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', dir: 'sop-translations/claude-opus-5-5/' };
const READERS = [['combined', 'VSS-BERT'], ['rules', 'Rules'], ['vss', 'VSS'], ['neural', 'SOP-BERT'], ['modernbert', 'ModernBERT'], ['qwen', 'Qwen3'], ['saved', 'gpt-6.1-sol'], [OPUS.id, OPUS.label]].map(([id, label]) => Object.assign({ id, label, last: [], pending: null, held: [], focusCell: null, reads: 0, lastRead: null }, K.createSystem()));
const RD = Object.fromEntries(READERS.map(r => [r.id, r]));
const READ_ORDER = ['rules', 'vss', 'neural', 'combined', 'modernbert', 'saved', OPUS.id].map(id => RD[id]);
const sys = RD.rules, engine = sys.engine;          // the legend, plugins and SOP rendering are the same in every reader; the Rules system serves them
let cur = RD.combined, world = cur.world;            // the active tab
const neural = NeuralKit.create(RD.neural.engine, RD.neural.formalize);
const modernbert = NeuralKit.create(RD.modernbert.engine, RD.modernbert.formalize, { activateCut: false, requireJoint: true });
const modern = { state: 'checking', models: null, status: null, error: null, bytes: 0, ms: 0, progress: { L: 0, T: 0 }, fromCache: false, token: 0, conf: { spec: null, error: null, url: null } };
let models = null, queue = Promise.resolve();
const saved = SavedReaderKit.create({ K, rd: RD.saved, catalog: ExamplesKit.catalog,
  readManifest: async () => { const r = await fetch('examples/gpt-6.1-sol/manifest.json', { cache: 'no-cache' }); if (!r.ok) throw new Error(`Saved manifest: HTTP ${r.status}`); return r.json(); },
  readFile: async name => { const r = await fetch('examples/gpt-6.1-sol/' + name, { cache: 'no-cache' }); if (!r.ok) throw new Error(`Saved program: HTTP ${r.status}`); return r.text(); } });
const savedLoad = saved.load().catch(e => { console.error(e); return null; });
// the VSS formalizer reads through the composer (docs/model/micro/registry.json: 9 micro-worlds, CandidateRouter, event hint;
// training/sketch/COMBINED.md).
const VSS_OPTS = { composer: true };
let view = 'auto';
let hl = { shapes: new Set(), edges: new Set() }, hlTimer = null, drag = null;
let selItem = null;   // the item selected by a click on the drawing: {shape: name} | {edge: id} | null (see "Direct editing")
const history = []; let turnSeq = 0;               // every message with what each reader made of it; a bubble's "details" shows one
let sub = 'drawing';                                // the active reader's subtab: 'drawing' | 'sop' | 'settings' (the same for every reader)
// browser storage is a convenience only: every access is guarded and the page works without it
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } } };
/* Name tags (owner, 2026-11-03): every shape shows its name above it, which suits a diagram and covers a picture (the faces of the Cartoon
   and of the scenes under "RoboEye"). The footer's "names" switch shows or hides them; the user's choice is kept in this browser (default on).
   A scenario with names: false (scenarios.js: the Cartoon and every scene of scenes-extra.js) turns them off when it starts, without
   changing the kept choice; any other scenario puts the kept choice back. Hidden tags still show on hover (the shape's <title>), and the
   view's fit and the arrow labels stop leaving room for them. Also, always: a small shape that lies on a bigger one (its body's box inside
   the other's, at most half its area; a panel does not count) shows no tag (tuckedNames), because it would sit on the bigger shape's body
   (an eye on a head, a window on a house); its name is on hover and in the details. */
const NAMES_KEY = 'sop.names.off';
let namesPref = store.get(NAMES_KEY) !== '1', showNames = namesPref, tucked = new Set();
/** the names of the shapes that lie on a bigger shape (see "Name tags") */
function tuckedNames(shapes) {
  const box = s => { const d = K.dims(s); return { x1: s.x - d.w / 2, x2: s.x + d.w / 2, y1: s.y - d.h / 2, y2: s.y + d.h / 2, a: d.w * d.h }; };
  const solid = shapes.filter(s => !s.layer && s.shape !== 'text' && Number.isFinite(s.x) && Number.isFinite(s.y)).map(s => [s, box(s)]), out = new Set();
  for (const [s, b] of solid) if (solid.some(([o, c]) => o !== s && b.a * 2 <= c.a && b.x1 >= c.x1 - 1 && b.x2 <= c.x2 + 1 && b.y1 >= c.y1 - 1 && b.y2 <= c.y2 + 1)) out.add(s.name);
  return out;
}
/** does s show its name tag now */
const tagShown = s => !s.layer && s.shape !== 'text' && !s.quiet && showNames && !tucked.has(s.name);
function setShowNames(on, keep) {
  showNames = !!on; if (keep) { namesPref = showNames; store.set(NAMES_KEY, showNames ? null : '1'); }
  const b = document.getElementById('names-btn'); if (b) { b.setAttribute('aria-pressed', String(showNames)); b.title = showNames ? 'Hide the names above the shapes' : 'Show the names above the shapes'; }
}
const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// Collected requests (owner, 2026-11-03; docs/js/collect.js, training/sketch/COLLECT_FORMAT.md): every message the user sends (typed, spoken,
// an example or a reply's button; not the opening message, not SOP Lang or the toolbar) is kept in this browser with the model versions and
// what VSS-BERT did, and the user's later actions on it (Do it anyway, Edit, superseded, undo right after) are added as events. Nothing leaves
// the browser unless the user downloads the file (⋮ › Settings › Collected requests). SESSION tells the turns of this page load apart.
const SESSION = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const collector = window.CollectKit ? CollectKit.createStore() : null;
const collectUI = collector ? CollectKit.mountSettings(collector) : null;
const collectEvent = (turn, ev) => { if (collector) try { collector.event(SESSION, turn, ev); } catch (e) { console.error(e); } };
// the model versions of every collected entry (docs/model/versions.json, fetched once, revalidated): with the text and the names on the
// drawing they reproduce every reader's reading, which is therefore not stored (collect.js format 2)
let modelStamps = null;
if (collector) fetch(new URL('model/versions.json', document.baseURI).href, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null)
  .then(j => { modelStamps = j && j.files ? CollectKit.modelVersions(j.files) : null; }).catch(() => { /* the entries then have models: null */ });
let pendingEdit = null;   // the held request whose Edit put a command into the message box: the next typed message is its "edit-sent"
// The gate (owner's main metric, 2026-11-02: do only what you are sure of, ask about the rest; training/sketch/PRECISION.md): a learned reader
// executes a request only when its own confidence clears the threshold of the chosen precision level; below it the request is not executed,
// the reply says why the reader is not sure (vss-confidence.js reasons) and offers "Do it anyway" (that one reading, as one undoable turn).
// GATES[reader id](its formalize result) -> Promise<gate> | null; a gate is {level, threshold, units: [{index, src, conf, execute, nodes,
// reasons: [{text}]}], executed (the nodes to run, message order), held (the units not executed)} (vss-confidence.js gate).
// VSS and SOP-BERT (since 2026-11-03, training/sketch/confidence3/RESULT.md method (c), judged "better" than each reader's own confidence
// on the fresh2 test part): the confidence of a request is the reader's own signals plus whether the other two readers, reading the same
// requests, read it the same way (the "votes of the other readers" block below: columnVss, columnSop of docs/js/vote-confidence.js, model
// docs/model/confidence/vote3.json, a threshold for commands and one for questions). When the other learned reader has not read the message
// (not loaded), the tab uses its own confidence alone: VSS docs/model/confidence/vss.json (vss-confidence.js), SOP-BERT
// docs/model/confidence/sop-bert.json (the "Neural gate" block below); the details say which. Level: the tab's Settings (default "cost": the
// safety threshold that maximises the cost score, one confident mistake = 10 right answers, owner 2026-11-02 21:24; execute all, never the
// default; a choice other than the default is kept in this browser when storage works). readPart / doPart, the reply, "Do it anyway" and the details
// are the same code for every reader. The Rules have no confidence and execute everything.
// The cost levels (owner, 2026-11-02 22:12; cost 2 and cost 1 added 2026-11-03 09:30): besides the default (cost 10), "boldest", "very bold"
// and "bolder" (one confident mistake counts as 1, 2 or 5 right answers: the reader is more confident and makes more mistakes) and "more
// careful" (as 20), each the cost-score optimum fitted the same way on the calibration data and stored in the reader's confidence file
// (vote3.json, vss.json, sop-bert.json, combined.json; never typed by hand); a file without one falls back to the default. Each tab's Settings
// shows them as a table with their numbers on the calibration part (done right, confidently wrong, asked). The precision levels 95 / 97 / 99
// of vss.json and sop-bert.json are not offered any more: the confidences with the votes have only the cost levels.
const GATE_KEY = 'sop.vss.gate', GATE_LEVELS = ['cost1', 'cost2', 'cost5', 'cost', 'cost20', 'all'], GATE_DEFAULT = 'cost';
const COST_LEVELS = GATE_LEVELS.filter(l => l !== 'all'), NON_DEFAULT = GATE_LEVELS.filter(l => l !== GATE_DEFAULT);
const COST_OF = { cost1: 1, cost2: 2, cost5: 5, cost: 10, cost20: 20 }, costWords = c => `one confident mistake counts as ${c} right answer${c === 1 ? '' : 's'}`;
/** what a reader does at a level, for the note when the setting changes */
const gateDoes = l => l === 'all' ? 'executes every request it reads (no gate)' : COST_OF[l] ? `executes a request only when its confidence clears its ${gateLabel(l)} threshold (${costWords(COST_OF[l])}); below it, it asks` : `executes a request only at ${l}% precision; below it, it asks`;
let vssGate = GATE_LEVELS.includes(store.get(GATE_KEY)) ? store.get(GATE_KEY) : GATE_DEFAULT;
const GATES = { vss: v => window.VSSFormalizer && window.VSSFormalizer.gate ? window.VSSFormalizer.gate(v, vssGate) : null, neural: null };
const gateLabel = l => l === 'all' ? 'execute all' : l === 'cost' ? 'safety threshold' : l === 'cost1' ? 'boldest' : l === 'cost2' ? 'very bold' : l === 'cost5' ? 'bolder' : l === 'cost20' ? 'more careful' : `${l}% precision`;
// Neural gate (GATES.neural): SOP-BERT's fitted confidence (docs/js/neural-confidence.js; model docs/model/confidence/sop-bert.json, versioned;
// training/sketch/PRECISION_BERT.md), 24 numbers read from the head logits of the reader's own model calls (the act, the value heads, who
// fills each role, the word tags, the cut head, the word pieces), the same value as the scripts (training/sketch/test_neural_confidence.mjs).
// Level: SOP-BERT › Settings, default the file's "cost" level (its safety threshold), the other levels of the file, execute all; a level other
// than the default is kept in this browser. The confidence was fitted on requests cut by the BERT cutter, the tab's own cut: the cut head's
// output of its own cut call is read. Without the file every request is asked (the reason says so).
const NGATE_KEY = 'sop.neural.gate';
let neuralGate = NON_DEFAULT.includes(store.get(NGATE_KEY)) ? store.get(NGATE_KEY) : null;   // null: the default level ("cost")
let ncNow = null;   // the module once loaded (the settings render synchronously)
const ncP = import(new URL('js/neural-confidence.js', document.baseURI).href).then(m => { ncNow = m; return m; }).catch(e => { console.error(e); return null; });
const nconf = { spec: null, error: null, url: null };
const MGATE_KEY = 'sop.modernbert.gate';
let modernGate = NON_DEFAULT.includes(store.get(MGATE_KEY)) ? store.get(MGATE_KEY) : 'cost';
async function modernSpec() {
  const NC = await ncP; if (!NC) throw new Error('The neural confidence decoder could not be loaded');
  const c = modern.conf; c.url = await NeuralKit.confidenceUrl('modernbert');
  try {
    const spec = await NC.load(c.url);
    if (!Number.isFinite(NC.threshold(spec, 'cost'))) throw new Error('ModernBERT has no finite cost-10 confidence threshold');
    c.spec = spec; c.error = null; return spec;
  } catch (e) { c.spec = null; c.error = e; throw e; }
}
GATES.modernbert = async n => {
  const NC = await ncP; if (!NC) throw new Error('ModernBERT confidence decoder is unavailable; nothing was executed');
  let spec = null; try { spec = await modernSpec(); } catch (e) { console.error(e); }
  return NeuralKit.gateReader(NC, spec, n, modernGate);
};
/* ---------------- Qwen3 (experimental; training/qwen/QWEN3_PLAN.md) ----------------
   An opt-in sixth reader: Qwen3-0.6B Q8_0 run by wllama 3.8.1 on the CPU, one thread, in its own worker (docs/js/qwen-reader.js,
   qwen-worker.js, qwen-contract.js). It loads only when the user presses Load Qwen3 on its tab, or when the page URL's models parameter
   lists qwen (?models=...,qwen); the five other readers start as before either way. It reads each message after they have replied, in a
   queue of its own (qwenJob), into its own drawing: nothing waits for it, and it takes no part in the votes, VSS-BERT or another reader's
   gate. Every change to its drawing goes through that queue: messages (SOP Lang and toolbar turns too), Do it anyway, the Rules drawing it
   starts from, a scenario's new area and the capability switches; it is not a target of "align", and its drawing cannot be dragged while
   it is reading. A message sent while it is not loaded is not read by it. It has no calibrated confidence threshold, so its gate holds
   every request (QM.qwenGate); Do it anyway runs one validated reading. */
const QWEN_URL = (() => { try { return (new URL(location.href).searchParams.get('models') || '').split(',').map(x => x.trim()).includes('qwen'); } catch (e) { return false; } })();
let QM = null, qwen = null, qwenQ = Promise.resolve(), qwenQueued = 0, qwenDone = 0, qwenNoted = false;
const qwenReady = () => !!qwen && qwen.isReady();
const qwenState = () => qwen ? qwen.S.state : 'idle';
/** run fn after every earlier Qwen job (one serial executor for every change to Qwen's drawing) */
function qwenJob(fn) {
  qwenQueued++; refreshQwen();
  const p = qwenQ.then(fn).catch(e => { console.error(e); }).finally(() => { qwenQueued--; refreshQwen(); });
  qwenQ = p; return p;
}
/** a copy of a reader's drawing now, applied later in Qwen's queue (copyDrawing reads the source when it runs) */
function drawingOf(rd) { const c = x => JSON.parse(JSON.stringify(x)); return { state: c(rd.world.state), undo: c(rd.world.undoStack), redo: c(rd.world.redoStack), last: rd.last.slice(), focusCell: rd.focusCell && Object.assign({}, rd.focusCell) }; }
function setDrawing(rd, d) { rd.world.restore(d.state); rd.world.undoStack = d.undo; rd.world.redoStack = d.redo; rd.last = d.last; rd.focusCell = d.focusCell; rd.pending = null; rd.held = []; }
/** the reader object without loading the model (Clear cache on a tab that never loaded it) */
async function loadReaderOnly() {
  try { if (!QM) QM = await import(new URL('js/qwen-reader.js', document.baseURI).href); } catch (e) { console.error(e); return; }
  if (!qwen) qwen = QM.createQwenReader({ engine: RD.qwen.engine, serialize: K.serialize, base: document.baseURI, next: NeuralKit.NEXT_CONTEXT, onChange: () => refreshQwen() });
}
async function loadQwen() {
  try { if (!QM) QM = await import(new URL('js/qwen-reader.js', document.baseURI).href); }
  catch (e) { console.error(e); sysNote('Qwen3 could not be loaded: docs/js/qwen-reader.js failed (' + (e && e.message || e) + ').'); return; }
  if (!qwen) qwen = QM.createQwenReader({ engine: RD.qwen.engine, serialize: K.serialize, base: document.baseURI, next: NeuralKit.NEXT_CONTEXT, onChange: () => refreshQwen() });
  if (qwen.S.state === 'loading' || qwen.S.state === 'ready') return;
  sysNote('Loading Qwen3 (experimental): a 639 MB model from Hugging Face (from this browser’s cache when it is there), checked against its SHA-256, run on the CPU in one thread. It reads into its own tab and executes nothing by itself.');
  refreshReaders();
  await qwen.load();
  if (qwen.S.state === 'ready') {
    // it starts from the Rules drawing when it has read nothing yet: taken now, in the main queue's order, applied in its own queue
    queue = queue.then(() => { const d = drawingOf(RD.rules); qwenJob(() => { if (!RD.qwen.reads) { setDrawing(RD.qwen, d); if (cur === RD.qwen) renderCanvas(); } updateTabs(); }); });
    const i = qwen.S.info || {};
    sysNote(`Qwen3 ready on the CPU (one thread), ${mb(i.bytes || 0)}${i.source === 'cache' ? ' from this browser’s cache' : ''}, in ${(qwen.S.loadMs / 1000).toFixed(0)} s. It reads every message after the other tabs and replies when it is done; it holds every request (no calibrated threshold yet).`);
  } else sysNote('Qwen3 could not be loaded: ' + (qwen.S.error && qwen.S.error.message || 'unknown error') + '.');
  refreshReaders();
}
GATES.qwen = (q, rec) => QM ? QM.qwenGate(q, rec.text) : null;
/** Qwen reads one message (or runs one SOP Lang turn) in its queue: its own pending question, readPart / doPart as every reader, its reply */
async function qwenRead(rec, text) {
  const rd = RD.qwen;
  if (!qwenReady()) { rec.off.qwen = `${offText(rd)} (it was not ready when its turn came)`; rec.qwenEnd = 'not read'; qwenDone++; refreshQwenTurn(rec); return; }
  rec.qwenStart = performance.now(); rec.off.qwen = 'reading…'; refreshQwenTurn(rec);
  const pend = rd.pending; rd.pending = null;
  // a reply to Qwen's own question (the same rule as run(), applied when its turn comes: Qwen's question may be several messages old)
  const want = text.toLowerCase().replace(/^(?:i\s+mean|use|the\s+one\s+(?:named|called))\s+/, '').replace(/[.!]+$/, '').trim();
  const pick = !rec.raw && pend && pend.candidates.find(c => c.toLowerCase() === want), pk = pick ? { pend, pick } : null;
  const line = (await readPart(rd, text, rec, pk)) || await doPart(rd, text, rec, pk, pend);
  rec.ran.push('qwen'); rec.qwenEnd = 'done'; rec.qwenMs = performance.now() - rec.qwenStart; delete rec.off.qwen; qwenDone++;
  rec.qwenLine = { text: line.text || '', sub: line.sub || null, err: !!line.err, held: (line.held || []).map(h => ({ index: h.index, src: h.view.src, reasons: h.view.reasons, line: h.view.line, canAnyway: h.view.canAnyway !== false })) };
  if (chatTabs.has('qwen') || cur === rd) botBubble({ lines: [Object.assign(line, { rd })], chips: line.chips || [], turn: rec.id, tag: rec.raw ? (rec.button ? 'button' : 'SOP Lang') : null });
  if (cur === rd) { if (line.highlight) flash(line.highlight); else renderCanvas(); }
  updateTabs(); refreshQwenTurn(rec);
}
/** the details of a turn that is open in the sheet are drawn again when Qwen's part of it changes */
function refreshQwenTurn(rec) { if (!sheet.hidden && sheetKind === 'turn' && sheetTurn === rec.id) renderSheet(); }
function refreshQwen() { refreshReaders(); }
function qwenBoxHTML() {
  const S = qwen ? qwen.S : { state: 'idle' }, pc = (a, b) => b ? ` ${mb(a)} of ${mb(b)}` : '';
  if (S.state === 'idle') return '<p>Not loaded. Qwen3-0.6B (Q8_0, 639 MB from Hugging Face, kept in this browser’s cache) runs on the CPU in one thread through wllama 3.8.1. Loading takes minutes: the download, a SHA-256 check, the start and a first check that reads one sentence; on a slow computer a message then takes a minute or more.</p><div class="acts"><button type="button" class="btn solid" data-qwen="load">Load Qwen3</button> <button type="button" class="btn" data-qwen="clear">Clear its cache</button></div>';
  if (S.state === 'loading') {
    const st = { prepare: 'Checking the fixed prompt against the legend…', download: 'Downloading the model' + pc(S.progress.done, S.progress.total) + '…', verify: 'Checking the cached model’s SHA-256' + pc(S.progress.done, S.progress.total) + '…', start: 'Starting the runtime…', check: 'First check: reading one sentence (it also prepares the fixed prompt; this is the slow part)…' }[S.stage] || 'Loading…';
    return `<p>${escH(st)}</p>${S.progress.total && (S.stage === 'download' || S.stage === 'verify') ? `<div class="prog"><div style="width:${(S.progress.done / S.progress.total * 100).toFixed(1)}%"></div></div>` : ''}<button type="button" class="btn" data-qwen="stop">Stop</button>`;
  }
  if (S.state === 'failed') return `<p>Qwen3 could not be loaded or was stopped:</p>${errHTML(S.error)}<div class="acts"><button type="button" class="btn solid" data-qwen="load">Try again</button> <button type="button" class="btn" data-qwen="clear">Clear its cache</button></div>`;
  const i = S.info || {};
  return `<p>Ready: Qwen3-0.6B Q8_0 on the CPU, ${i.threads} thread, ${mb(i.bytes || 0)}${i.source === 'cache' ? ' from this browser’s cache' : ''}, loaded in ${(S.loadMs / 1000).toFixed(0)} s.${qwenQueued ? ` Reading: ${qwenQueued} message${qwenQueued === 1 ? '' : 's'} in its queue.` : ''}</p><div class="acts">${qwenQueued || S.busy ? '<button type="button" class="btn" data-qwen="stop">Stop</button> ' : ''}<button type="button" class="btn" data-qwen="unload">Unload</button> <button type="button" class="btn" data-qwen="clear">Unload and clear its cache</button></div>`;
}
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-qwen]'); if (!b) return;
  const what = b.dataset.qwen;
  if (what === 'load') { loadQwen(); return; }
  if (what === 'clear' && !qwen) { await loadReaderOnly(); }
  if (!qwen) return;
  if (what === 'stop') { qwen.stop('stopped by you'); sysNote('Qwen3 stopped: the request it was reading is held, and the messages in its queue are not read. Press Try again to load it again.'); }
  if (what === 'unload') { await qwen.unload(); sysNote('Qwen3 unloaded: its memory is freed; its drawing stays. Messages are not read by it until it is loaded again.'); }
  if (what === 'clear') { try { await qwen.clearCache(); sysNote('Qwen3 unloaded and its cached model deleted from this browser.'); } catch (e) { sysNote('Qwen3’s cache could not be cleared: ' + (e && e.message || e)); } }
  refreshReaders(); if (sub === 'settings') renderSub();
});
/* ---------------- Saved translations of Claude Opus 5.5 (the tab OPUS; docs/sop-translations/claude-opus-5-5/README.md) ----------------
   Not a reader: the generation model wrote every built-in example (the quick examples, the scenarios, the scenes) as SOP Lang once, offline
   (the .sop files and manifest.json of its folder); this tab plays those saved programs through its own engine, into its own drawing. A
   message gets its program only by where it came from: the quick example or the turn of the scenario or scene played from the + menu
   (rec.example = {example, turn, original, map}, made in run() from the occurrence the example buttons and the player send, meta.saved
   {exampleId, turn, original}, and from meta.opusMap), never by its text (the same words occur in different examples). The program runs
   when the example's text in this page is the text that was translated; the names a played example renames to avoid clashes
   (renamedForCanvas: the effective names every reading tab reads) are applied to its name-valued keys only, plus a rename of any name its
   programs create that only this tab's own drawing already has (trRenames; saved-sop.js renameNodes). An engine question raised by a saved program ("Which green circle?") is not left open: this tab takes no reply, so a typed
   name never chooses what runs here. Anything else (a typed message, an edited copy,
   your own script, a missing or stale translation) is not played, and the reply says why; a turn the model wrote as a no-op or as
   unsupported says so. No confidence and no gate: a saved program is played as written, like a message typed as SOP Lang (the destructive
   policy of the reading tabs does not apply; README.md lists the turns concerned). SOP Lang messages and the toolbar run here as in every
   tab. It never copies another tab's drawing, and Align neither copies into it nor from it. */
let SS = null, trM = null, trErr = null, trP = null, trLast = null;
const trCount = { played: 0, noop: 0, unsupported: 0, unavailable: 0 };
const ssP = import(new URL('js/saved-sop.js', document.baseURI).href).then(m => { SS = m; return m; }).catch(e => { console.error(e); trErr = e; return null; });
/** the manifest of the saved translations (fetched once, revalidated; a failure is kept in trErr and tried again on the next message) */
function trManifest() {
  if (!trP) trP = (async () => {
    const m = await ssP; if (!m) throw trErr || new Error('docs/js/saved-sop.js could not be loaded');
    const limit = new Promise((_, no) => setTimeout(() => no(new Error('the saved translations did not load within 30 s')), 30000));   // never holds the message queue longer
    trM = await Promise.race([m.load(new URL(OPUS.dir + 'manifest.json', document.baseURI).href), limit]); trErr = null;
    if (trM.model.name !== OPUS.label) console.warn(`the saved translations are by ${trM.model.name}, the tab says ${OPUS.label}`);
    return trM;
  })().catch(e => { trP = null; trErr = e; throw e; });
  return trP;
}
/** the saved translation of one message -> {state: play | noop | unsupported | unavailable, reason, entry, prov, nodes, renamed, notes} */
async function trRead(rec) {
  if (!rec.example) { const m = await ssP; return { state: 'unavailable', reason: m ? m.lookup(null, null).reason : 'this tab plays only the saved translations of the built-in examples', entry: null, prov: null, nodes: [], renamed: [], notes: [] }; }   // nothing to fetch
  const M = await trManifest(), prov = rec.example, L = SS.lookup(M, prov);
  const s = { state: L.state, reason: L.reason, entry: L.entry, prov, nodes: [], renamed: [], notes: [] };
  if (L.state !== 'play') return s;
  const R = SS.renameNodes(K.parse(L.program), prov.map || {});
  for (const n of R.nodes) if (n.type === 'question' && n.args.ask === 'help') Object.defineProperty(n, 'src', { value: rec.text, enumerable: false, configurable: true });   // the help world reads the question's words
  s.nodes = R.nodes; s.renamed = R.renamed;
  const N = L.entry.notes || {};
  for (const u of N.unsupported || []) s.notes.push(`Not translated (SOP Lang cannot express it): ${u}`);
  for (const a of N.approx || []) s.notes.push(`Approximated: ${a}`);
  for (const r of N.resolved || []) s.notes.push(`Reference: ${r}`);
  for (const c of N.scope || []) s.notes.push(`Scope: ${c}`);
  return s;
}
/** the renames of a played example for this tab's programs: the effective names of the text (textMap: renamedForCanvas, the same for every
 *  reading tab), plus, for each name the example's saved programs create (create, duplicate, rename, group), a rename when this tab's own
 *  drawing already has that name (it keeps shapes the reading tabs deleted, and it does not count in the text's renames) */
function trRenames(exampleKey, textMap, M, turn) {
  const lc = x => String(x).toLowerCase(), W = RD[OPUS.id].world, out = {}, low = new Map();
  for (const [a, b] of Object.entries(textMap || {})) { low.set(lc(a), b); if (a !== b) out[a] = b; }
  const made = new Set();
  for (const e of (M && M.entries || []).filter(x => x.example === exampleKey && (turn == null || x.turn === turn))) {   // a quick example: its own turn
    let ns = []; try { ns = K.parse(e.program); } catch (x) { ns = []; }
    for (const n of ns) if (n.type === 'command' && ['create', 'duplicate', 'rename', 'group'].includes(n.args.action) && typeof n.args.name === 'string') made.add(n.args.name);
  }
  const used = new Set(Object.values(out).map(lc)), own = new Set([...made].map(lc)), taken = n => W.find(n) || W.findGroup(n);
  for (const n of made) {
    if (!taken(low.get(lc(n)) || n)) continue;
    let k = 2; while (taken(n + k) || own.has(lc(n + k)) || used.has(lc(n + k)) || low.has(lc(n + k))) k++;
    out[n] = n + k; used.add(lc(n + k));
  }
  return out;
}
/** the manifest, loaded or failed (never throws): awaited with the gpt-6.1-sol tab's savedLoad, before the player's run-token check */
// (after a failed load it does not wait again: an example click never waits on this tab's file twice; its messages still retry)
const trNow = () => trM ? Promise.resolve(trM) : trErr ? Promise.resolve(null) : trManifest().catch(e => { console.error(e); return null; });
/** this tab's renames for a played example (see trRenames), synchronous: with the manifest when it has loaded (else the text's renames) */
function trMapSync(exampleId, textMap) {
  const id = String(exampleId || ''), q = id.match(/^quick:(\d+)$/), key = q ? 'quick' : id.replace(/^(?:scenario|scene):/, '');
  return trRenames(key, textMap, trM, q ? +q[1] + 1 : undefined);
}
/** the reply line of a message the saved translations do not play (no program, a no-op, unsupported, or not an example) */
function trLine(s, ms) {
  if (s.state === 'noop') return { text: `Nothing to do: ${s.reason} (the saved translation is a no-op).`, ms };
  if (s.state === 'unsupported') return { text: `Not done: the saved translation marks this as something SOP Lang cannot express: ${s.reason}.`, ms };
  return { text: `Not played: ${s.reason}.`, ms };
}
/** the details of a message in this tab: where the program came from, the text translated and the text played, the renames */
function trHTML(s, rec) {
  const e = s.entry, p = s.prov, M = trM;
  let h = '';
  if (p) h += `<div class="note">Built-in example <code>${escH(`${p.example}#${p.turn}`)}</code>. The text that was translated: <span class="src">“${escH(e ? e.input : p.original)}”</span>${rec.typed !== (e ? e.input : p.original) ? `; the text sent (after the scenario's renames): <span class="src">“${escH(rec.typed)}”</span>` : ''}. The program is chosen by the example and the turn, not by the words.</div>`;
  h += `<div class="note">${s.state === 'play' ? 'Played the saved program' : s.state === 'direct' ? 'The example is SOP Lang itself; it ran as written' : s.state === 'sop' ? 'SOP Lang' : s.state === 'noop' ? 'The saved translation is a no-op' : s.state === 'unsupported' ? 'The saved translation marks this as unsupported' : 'Not played'}${s.reason ? `: ${escH(s.reason)}` : ''}.</div>`;
  if (s.renamed && s.renamed.length) h += `<div class="note">Renamed to avoid clashes with the canvas (name-valued keys only): ${escH(s.renamed.map(r => `@${r.wire} ${r.key}: ${r.from} → ${r.to}`).join('; '))}.</div>`;
  if (e) {
    const where = `${OPUS.dir}${e.file}, lines ${+e.lines[0]}–${+e.lines[1]}`;
    h += `<div class="note">Saved translation <code>${escH(where)}</code> (${escH(e.status)}${e.status === 'direct' ? ': not generated' : `; written by ${escH(M ? M.model.name : OPUS.label)} on ${escH(e.generated || '?')} from the source at ${escH(String(e.source_revision || '').slice(0, 7))}`}).${e.repaired ? ` Changed after the first pass (first-pass/${escH(e.file)}): ${escH(e.repairs.join('; '))}.` : ''}</div>`;
    for (const k of ['direct', 'noop', 'unsupported', 'approx', 'resolved', 'scope', 'note']) for (const t of (e.notes || {})[k] || []) h += `<div class="note">${escH(k)}: ${escH(t)}</div>`;
  }
  return h;
}
/** the facts table and the explanation of the tab's Settings */
function trSettingsHTML(rd) {
  if (!trM && !trErr) trManifest().then(() => { if (sub === 'settings' && cur === rd) renderSub(); }, () => { if (sub === 'settings' && cur === rd) renderSub(); });
  const M = trM, I = M && M.inventory, C = M && M.coverage, pc = (a, b) => b ? ` (${(a / b * 100).toFixed(1)}%)` : '';
  const facts = M ? `<table class="kv"><tr><td>Generation model</td><td>${escH(M.model.name)} (<code>${escH(M.model.id)}</code>)</td></tr>
    <tr><td>Generated</td><td>${escH(M.generated)}, offline, from the examples' source at <code>${escH(M.source.revision.slice(0, 12))}</code></td></tr>
    <tr><td>Examples</td><td>${escH(I.quick)} quick examples, ${escH(I.scenarios)} scenarios (${escH(I.scenario_turns)} messages), ${escH(I.scenes)} scenes (${escH(I.scene_turns)} messages): ${escH(I.occurrences)} messages</td></tr>
    <tr><td>Saved programs</td><td>${escH(C.entries)} of ${escH(I.occurrences)}${pc(C.entries, I.occurrences)}: ${escH(C.executable)} executable, ${escH(C.partly)} partly (a part SOP Lang cannot express), ${escH(C.noop)} no-op, ${escH(C.unsupported)} unsupported, ${escH(C.direct)} already SOP Lang; ${escH(C.repaired)} changed after the first pass</td></tr>
    <tr><td>Played here</td><td>${trCount.played} played, ${trCount.noop} no-op, ${trCount.unsupported} unsupported, ${trCount.unavailable} not played</td></tr>
    <tr><td>Files</td><td><a href="${escH(OPUS.dir)}README.md" target="_blank" rel="noopener">README</a> · <a href="${escH(OPUS.dir)}CONVENTIONS.md" target="_blank" rel="noopener">conventions</a> · <a href="${escH(OPUS.dir)}manifest.json" target="_blank" rel="noopener">manifest.json</a> · the programs: <code>${escH(OPUS.dir)}quick.sop, scenarios/*.sop, scenes/*.sop</code></td></tr></table>`
    : `<p class="note">${trErr ? `The saved translations could not be loaded (${escH(trErr.message || trErr)}): nothing is played.` : 'Loading the saved translations…'}</p>`;
  return `<h3 class="sub">${escH(OPUS.label)}: saved example translations</h3>${readerFacts(rd)}
  <p class="intro"><b>Not live inference.</b> ${escH(OPUS.label)} wrote every built-in example (the quick examples, the scenarios and the scenes of the + menu) as SOP Lang once, offline, before this page was published. Nothing is downloaded to run a model and no service is called: this tab plays those saved programs through the same engine as every tab, into its own drawing, with its own undo history and replies. It does not read anything you type: a typed message, an edited copy of a scenario, your own script or a file gets “Not played”, and so does a message whose saved translation is missing or was made for a different text.</p>
  <p class="intro">A message is matched by where it came from (the quick example or the turn of the scenario played from the menu), not by its words. A scenario drawn in a new area may rename the names that clash with the canvas (Stop → Stop2, for every tab); the same renames are applied to the saved program's names (never to its labels), and a name only this tab still has is renamed for it alone. There is no confidence and no gate: a saved program runs as written, like a message typed as SOP Lang, so the cautious rule for deleting requests of the reading tabs does not apply here. A turn the model found nothing to do in, or could not express in SOP Lang, says so. <b>details</b> under a reply shows the program, the file and lines it comes from and every note the model wrote with it.</p>
  ${facts}${sharedNote}`;
}
/** the facts of a tab (SketchpadInfo.translationTurn): what the saved translations did with one message */
function trTurnInfo(id) {
  const rec = history.find(x => x.id === id), r = rec && rec.readers[OPUS.id]; if (!rec) return null;
  const s = r && r.tr, ser = ns => (ns || []).map(n => K.serialize(n));
  return JSON.parse(JSON.stringify({ example: rec.example || null, typed: rec.typed, raw: rec.raw, state: s ? s.state : r && r.error ? 'error' : rec.raw ? 'sop' : null, reason: s ? s.reason : null,
    entry: s && s.entry ? { id: s.entry.id, file: s.entry.file, lines: s.entry.lines, status: s.entry.status } : null, renamed: s ? s.renamed : [], executed: r ? ser(r.nodes) : [],
    line: r && r.line ? r.line : null, error: r && r.error ? r.error.message : null,
    steps: r && r.result ? r.result.steps.map(st => ({ wire: K.serialize(st.node), error: st.error ? st.error.message : null, skipped: st.skipped || null, answer: st.answer || null, patches: st.patches.length })) : [] }));
}
/** the confidence file (loaded once; a failure is kept in nconf.error and tried again on the next message) */
async function neuralSpec() {
  const NC = await ncP; if (!NC) throw new Error('docs/js/neural-confidence.js could not be loaded');
  const url = await NeuralKit.confidenceUrl(); nconf.url = url;
  try { nconf.spec = await NC.load(url); nconf.error = null; } catch (e) { nconf.spec = null; nconf.error = e; throw e; }
  return nconf.spec;
}
/** the level the neural gate uses: the chosen one when the file reaches it (or "all"), else the file's default */
const neuralLevel = (NC, spec) => neuralGate && (!spec || neuralGate === 'all' || NC.reached(spec, neuralGate)) ? neuralGate : spec ? NC.defaultLevel(spec) : 'cost';
/** SOP-BERT's own confidence alone (sop-bert.json): the gate when VSS has not read the message (see GATES) */
async function neuralOwnGate(n) {
  const NC = await ncP; if (!NC || !n || !n.joint) return null;
  let spec = null; try { spec = await neuralSpec(); } catch (e) { console.error(e); }
  const g = NC.gate(spec, n, neuralLevel(NC, spec)); if (g) g.safe = spec ? NC.threshold(spec, 'cost') : NaN;
  return g;
}
// VSS-BERT (READERS id 'combined'; owner, 2026-11-02 21:57 and 22:08): the combined reader of VSS and SOP-BERT (docs/js/combined-confidence.js;
// model docs/model/confidence/combined.json, versioned; training/sketch/combine/COMBINED_READER.md). Both readers read the units of the BERT
// cutter (the cut whose combined confidence scored best on the fresh2 calibration part and was fitted on, the file's best_cut). Nothing is read
// for it: SOP-BERT's reading is the SOP-BERT tab's own (its own cut is the BERT cutter), and VSS's reading of the same units is the one
// crossReads made for SOP-BERT's votes (see "cutting" below). The two readers' requests are paired; on a pair SOP-BERT's reading is
// executed, otherwise the one that exists; each gets the combined confidence (SOP-BERT's or VSS's own signals, the agreement of the two, VSS's
// own confidence of its paired reading), executed when it clears the file's threshold; below it the reply says why ("the two readers disagree
// on the colour", "only one reader found this request", what the executing reader itself was unsure of) and offers "Do it anyway". Level:
// VSS-BERT › Settings: the cost levels (default the safety threshold) or execute all, kept in this browser when it is not the default. Every number comes from the file.
const CGATE_KEY = 'sop.combined.gate';
let combGate = NON_DEFAULT.includes(store.get(CGATE_KEY)) ? store.get(CGATE_KEY) : 'cost';
let ccNow = null;
const ccP = import(new URL('js/combined-confidence.js', document.baseURI).href).then(m => { ccNow = m; return m; }).catch(e => { console.error(e); return null; });
const vcP = import(new URL('js/vss-confidence.js', document.baseURI).href).catch(e => { console.error(e); return null; });
const cconf = { spec: null, error: null, url: null };
/** the combined confidence file (loaded once; a failure is kept in cconf.error and tried again on the next message) */
async function combinedSpec() {
  const CC = await ccP; if (!CC) throw new Error('docs/js/combined-confidence.js could not be loaded');
  if (cconf.spec) return cconf.spec;
  try { cconf.url = await CC.urlUnder(new URL('model/', document.baseURI).href); cconf.spec = await CC.load(cconf.url); cconf.error = null; } catch (e) { cconf.error = e; throw e; }
  return cconf.spec;
}
const CNAMES = { sop: 'SOP-BERT', vss: 'VSS' };
/** the request's text as written on a wire rebuilt from a reader's wire (VSS-BERT): the help world answers from its words
 *  ("how do I label an arrow?"; logic.js help plugin reads node.src, else node.unit.src) */
const keepSrc = (x, y) => { const src = x.src || (x.unit && x.unit.src); if (src) Object.defineProperty(y, 'src', { value: src, enumerable: false, configurable: true }); };
/** VSS-BERT reads one message: the two readings on the BERT cut, paired, the combined confidence and the gate -> {nodes, notes, gate, ms, ...} */
async function combinedRead(rd, text, rec, ctx) {
  const CC = await ccP, NC = await ncP, VCm = await vcP;
  let spec = null; try { spec = await combinedSpec(); } catch (e) { console.error(e); }
  // the BERT cut: SOP-BERT's own reading (the SOP-BERT tab's) and VSS's reading of its units (crossReads, made for SOP-BERT's votes)
  const rn = rec.readers.neural, X = await crossReads(rec, text), cut = 'bert';
  const n = rn && !rn.error && rn.neural ? rn.neural : null, v = X.bert && X.bert.vss ? X.bert.vss : null;
  if (!n) throw new Error('VSS-BERT needs SOP-BERT’s reading of this message' + (rn && rn.error ? ` (it failed: ${rn.error.message})` : ''));
  if (!v) throw new Error('VSS-BERT needs VSS’s reading of the BERT cutter’s requests' + (X.bert && X.bert.why ? ` (${X.bert.why})` : ''));
  const how = 'reused', readMs = (rn.ms || 0) + (X.bert.vssMs || 0);
  const tc = performance.now();
  let vssModel = null; try { vssModel = await window.VSSFormalizer.loadConfidence(); } catch (e) { console.error(e); }
  let nspec = null; try { nspec = await neuralSpec(); } catch (e) { console.error(e); }
  const pa = x => `${x.type}:${x.args.action || x.args.ask || ''}`;
  const args0 = x => ({ action: x.args.action ?? null, name: typeof x.args.name === 'string' ? x.args.name : null, count: x.args.count ?? null });
  const sop = n.nodes.filter(x => x.type !== 'mention' && x.unit).map(x => { const sig = NC ? NC.signals(n, n.analyses.indexOf(x.unit)) : null;
    return { node: x, sig, f: sig ? sig.f : {}, act: sig ? sig.act : (x.args.action || x.args.ask || x.type), pa: pa(x), got: BenchCanon.canon(x, n.nodes), span: x.span || [0, 0], args0: args0(x) }; });
  const vss = v.nodes.filter(x => x.type !== 'mention' && x.unit).map(x => ({ node: x, f: x.unit.signals || {}, world: x.unit.world, pa: pa(x), got: BenchCanon.canon(x, v.nodes), span: x.span || [x.unit.c0, x.unit.c1], args0: args0(x),
    conf: vssModel && VCm ? (x.unit.signals ? VCm.confidence(vssModel, x.unit.signals, x.unit.world) : 0) : NaN }));
  const msg = { text, cut, sop, vss, cutWords: n.joint ? n.joint.cut : null };
  const ok = !!(spec && CC && vssModel && NC);
  const res = ok ? CC.combine(spec, msg, combGate) : null;
  const items = res ? res.items : sop.map((s, j) => ({ from: 'sop', j, partner: -1, conf: NaN, execute: combGate === 'all' })).concat(vss.map((s, j) => ({ from: 'vss', j, partner: -1, conf: NaN, execute: combGate === 'all' })));
  // the readings to run, in message order, with fresh ids (the two readers number their wires independently); a VSS request that refers
  // to a shape made by a paired request refers to SOP-BERT's reading of it (the one executed)
  const R = { sop: { res: n, list: sop }, vss: { res: v, list: vss } };
  items.forEach(it => { const q = R[it.from].list[it.j]; it.req = q; it.nodes0 = R[it.from].res.nodes.filter(x => x.unit === q.node.unit); });
  items.sort((a, b) => (a.req.span[0] - b.req.span[0]) || (a.from === 'sop' ? -1 : 1));
  const idOf = new Map(); let k = 0;
  for (const it of items) for (const x of it.nodes0) idOf.set(it.from + ':' + x.id, (x.type === 'mention' ? 'm' : 'w') + (++k));
  for (const it of items) if (it.from === 'sop' && it.partner >= 0) idOf.set('vss:' + vss[it.partner].node.id, idOf.get('sop:' + it.req.node.id));
  const mapV = (from, val) => K.isRef(val) ? { ref: idOf.get(from + ':' + val.ref) || val.ref } : Array.isArray(val) ? val.map(y => mapV(from, y)) : val;
  const units = items.map((it, index) => {
    const nodes = it.nodes0.map(x => { const y = { id: idOf.get(it.from + ':' + x.id), type: x.type, args: Object.fromEntries(Object.entries(x.args).map(([a, b]) => [a, mapV(it.from, b)])) };
      if (x.span) Object.defineProperty(y, 'span', { value: x.span, enumerable: false, configurable: true }); keepSrc(x, y); return y; });
    const src = text.slice(it.req.span[0], it.req.span[1]).trim() || it.req.node.src || '';
    return { index, item: it, from: it.from, src, conf: it.conf, execute: it.execute, nodes, reasons: [], dependsOn: [] };
  });
  const owner = new Map(); units.forEach(u => u.nodes.forEach(x => owner.set(x.id, u)));
  const refsOf = val => K.isRef(val) ? [val.ref] : Array.isArray(val) ? val.flatMap(refsOf) : [];
  for (const u of units) for (const x of u.nodes) for (const r of Object.values(x.args).flatMap(refsOf)) { const o = owner.get(r); if (o && o !== u && !u.dependsOn.includes(o)) u.dependsOn.push(o); }
  for (const u of units) {   // message order: a request's dependencies come before it
    const off = u.dependsOn.filter(d => !d.execute);
    if (u.execute && off.length) { u.execute = false; u.reasons = off.map(d => ({ group: 'depends', text: `it uses what “${d.src}” would have made, which was not done` })); continue; }
    if (u.execute) continue;
    if (!ok) { u.reasons = [{ group: 'model', text: !spec ? 'the combined confidence model could not be loaded' : !vssModel ? 'VSS’s confidence model could not be loaded' : 'the code of the combined confidence could not be loaded' }]; continue; }
    u.reasons = CC.reasons(msg, u.item, CNAMES).map(x => ({ group: x.group, text: x.text }));
    // what the executing reader itself was unsure of (its own confidence below its own safety threshold); `own` keeps the sentence without
    // the reader's name for the chat (clarifyInput)
    if (u.from === 'sop' && nspec && u.item.req.sig) { const c = NC.confidence(nspec, u.item.req.sig.f, u.item.req.sig.act); if (c < NC.threshold(nspec, 'cost')) { const w = NC.reasons(nspec, u.item.req.sig)[0]; if (w) u.reasons.push({ group: w.group, own: w.text, text: `SOP-BERT alone is not sure: ${w.text}` }); } }
    if (u.from === 'vss' && VCm) { const q = u.item.req; if (q.conf < VCm.threshold(vssModel, 'cost')) { const w = VCm.reasons(vssModel, q.node.unit)[0]; if (w) u.reasons.push({ group: w.group, own: w.text, text: `VSS alone is not sure: ${w.text}` }); } }
  }
  const all = units.flatMap(u => u.nodes), run = new Set(units.filter(u => u.execute).flatMap(u => u.nodes));
  const t = res ? res.threshold : combGate === 'all' ? -Infinity : Infinity;
  const gate = { level: combGate, effective: combGate, threshold: t, units, executed: all.filter(x => run.has(x)), held: units.filter(u => !u.execute),
    safe: res && spec && CC ? CC.threshold(spec, res.cut, 'cost') : NaN };   // what a destructive request needs (holdDestructive)
  const notes = [];
  if (n.cutBy !== 'model') notes.push('The SOP-BERT model has no cut head (the BERT cutter), so the whole message was read as one request.');
  const combineMs = performance.now() - tc;
  return { nodes: all, notes, gate, cut, how, fitted: res ? res.fitted : null, fit: res ? res.cut : null, msg, items, units, readMs, combineMs, calls: 0, ms: readMs + combineMs };
}
GATES.combined = async c => c.gate;
/** VSS-BERT in a message's details: where the readings came from, and how the two readings of each request compare */
function combinedHTML(c) {
  const from = `the ${cutLabel(c.cut)}’s requests: the SOP-BERT tab’s reading and VSS’s reading of the same requests (made for SOP-BERT’s votes), reused, no model call (reading ${fmtMs(c.readMs)}, combining ${fmtMs(c.combineMs)})`;
  let h = `<div class="note">VSS-BERT: ${escH(from)}; combined confidence of the ${escH(c.fit ? cutLabel(c.fit) : '?')}${c.fitted === false ? ' (this cut was not fitted)' : ''}.</div>`;
  h += `<ul class="units">${c.units.map(u => { const it = u.item, p = it.from === 'sop' && it.partner >= 0;
    const what = it.from === 'vss' ? 'VSS’s reading (SOP-BERT has none of this action here)' : p ? `SOP-BERT’s reading; VSS ${it.agree ? 'reads it the same' : `agrees on ${Math.round(it.agree_share * 100)}% of the values`} (VSS’s own confidence ${Number.isFinite(it.other_conf) ? it.other_conf.toFixed(3) : '?'})` : 'SOP-BERT’s reading (VSS has none of this action here)';
    return `<li><span class="src">“${escH(u.src)}”</span> → ${escH(what)}</li>`; }).join('')}</ul>`;
  return h;
}
/** the levels of a tab's gate as a table (owner, 2026-11-03 09:30): one row per level in plain words, with its numbers on the calibration
 *  part (out-of-fold confidences): the share of the requested actions done right, the share of what it executed that was wrong (confidently
 *  wrong), the share of the requested actions it asked about; a radio in each row chooses the level. rows: [{level, num: {right, wrong,
 *  asked} | null, acts: the threshold in words}] */
const LEVEL_NAME = l => { const t = gateLabel(l); return t.charAt(0).toUpperCase() + t.slice(1); };
function levelTableHTML(name, chosen, rows) {
  const pc = v => Number.isFinite(v) ? (v * 100).toFixed(1) + '%' : '–';
  return `<div class="tbl lvt"><table><thead><tr><th>level</th><th>done right</th><th>confidently wrong</th><th>asked</th></tr></thead><tbody>${rows.map(r => `<tr${r.level === chosen ? ' class="on"' : ''}>
    <td><label><input type="radio" name="${name}" value="${r.level}" ${r.level === chosen ? 'checked' : ''}><span><b>${escH(LEVEL_NAME(r.level))}</b>${r.level === GATE_DEFAULT ? ' (default)' : ''}<span class="lvw">${escH(r.level === 'all' ? 'no gate: it does every request it reads' : costWords(COST_OF[r.level]))}${r.acts ? `; ${escH(r.acts)}` : ''}</span></span></label></td>
    <td>${pc(r.num && r.num.right)}</td><td>${pc(r.num && r.num.wrong)}</td><td>${pc(r.num && r.num.asked)}</td></tr>`).join('')}</tbody></table></div>`;
}
const LEVELS_NOTE = 'Bolder levels do more and are wrong more often; more careful ones ask more. The numbers: the calibration part of the fresh2 and short3 messages (368 messages, 808 requested actions), out-of-fold confidences; done right and asked are shares of the requested actions, confidently wrong is the share of what it executed (wrong or not requested). Each level’s threshold is the one that scores best on that part when a mistake costs that many right answers; none is typed by hand.';
/** VSS-BERT › Settings: what it is, the level (the cost levels or execute all, as a table with the file's numbers) */
function combinedSettingsHTML() {
  const spec = cconf.spec;
  if (!spec) { const again = () => { if (sub === 'settings' && cur.id === 'combined') renderSub(); }; if (!cconf.error) combinedSpec().then(again, again); }
  const pc = v => (v * 100).toFixed(1) + '%', B = spec ? spec.cuts[spec.best_cut] : null, cal = B && B.calibration_oof, te = B && B.test_already_read_exploratory, alone = spec && spec.readers_alone;
  const row = l => { const x = l === 'all' ? B && B.execute_all : B && (B.levels || {})[l];
    return { level: l, num: x ? { right: x.heldout_oof_coverage, wrong: x.heldout_oof_precision == null ? NaN : 1 - x.heldout_oof_precision, asked: x.heldout_oof_asked } : null,
      acts: l === 'all' ? '' : x ? (Number.isFinite(x.threshold) ? `acts from confidence ${x.threshold.toFixed(4)}` : x.kind) : B ? 'not in the model file: the safety threshold is used' : '' }; };
  const state = !spec ? `<p class="note">${cconf.error ? `The model could not be loaded (${escH(cconf.error.message || cconf.error)}): every request is asked.` : 'Loading the model…'}</p>` : '';
  return `<h3 class="sub">VSS-BERT reader</h3>${readerFacts(RD.combined)}
  <p class="intro">VSS-BERT is not a third model: it is VSS and SOP-BERT reading the same requests, and it does what they are sure of together. Both read the requests of the BERT cutter (SOP-BERT’s cut head: the cut with which this combination scored best, and the one its confidence was fitted on). Nothing is read again for VSS-BERT: SOP-BERT’s reading is the SOP-BERT tab’s, and VSS’s reading of the same requests is the one made for SOP-BERT’s votes. The two readings of each request are paired: when both readers have it, SOP-BERT’s reading is the one executed; when only one has it, that one. Each request gets a combined confidence: the executing reader’s own numbers, whether the two readers agree (all the values, or a share of them) and VSS’s own confidence. When the two agree, a request is right about 95% of the time, so agreement raises the confidence; when they disagree, or only one reader found the request, it is lowered. Below the threshold it asks, says why, and offers <b>Do it anyway</b>.</p>
  <p class="intro"><button type="button" class="btn" data-help="two-readers">Two readers together</button></p>
  <h3 class="sub">When VSS-BERT acts</h3>
  ${state}${levelTableHTML('comb-gate', combGate, GATE_LEVELS.map(row))}
  <p class="note">${escH(LEVELS_NOTE)} A level other than the default is kept in this browser.</p>
  ${B ? `<p class="note">Fitted on the calibration part of the fresh2 and short3 messages (368 messages), out of fold (training/sketch/combine/COMBINED_READER.md, refitted for the readers of 2026-11-03${spec.variant && spec.variant !== '(a)' ? `; variant ${escH(spec.variant)}: the combined confidence reads neither how often SOP-BERT’s action nor how often VSS’s world is read right, the variant chosen on the calibration part by the rule of training/sketch/confidence3/PLAN.md` : ''}). Cost score on that part: VSS-BERT ${cal.score.toFixed(1)}, SOP-BERT alone ${alone.sop.calibration_oof_score.toFixed(1)}, VSS alone ${alone.vss.calibration_oof_score.toFixed(1)}. On the test part (already read before; exploratory): ${te.score.toFixed(1)}, ${pc(te.confidently_wrong)} of what it executed wrong, ${pc(te.done_right)} of the requests done right. The clean confirmation needs a fresh set of messages (fresh3). Model <code>confidence/combined.json</code>${cconf.url && /[?&]v=/.test(cconf.url) ? `, version <code>${escH(decodeURIComponent(cconf.url.split('v=').pop()))}</code>` : ''}.</p>` : ''}`;
}
// The votes of the other readers (owner, 2026-11-02 evening; training/sketch/confidence3/PLAN.md, RESULT.md; docs/js/vote-confidence.js, model
// docs/model/confidence/vote3.json, versioned, written by training/sketch/confidence3/export3.mjs). For a tab's votes, the Rules, VSS and
// SOP-BERT read the same requests: those of the cut that tab's column was fitted on, which is the tab's own cut (see "cutting" below: VSS the
// VSS cutter, SOP-BERT the BERT cutter). Their readings of a request are paired, and two readings agree when every canonical value (bench-canon.js) is
// equal after engineNorm (d1: what logic.js does with them: an arrange / distribute / whole-drawing operation's list in any order, "no target" = "all" = every name on
// the canvas). The Rules are edited often: comparing after engineNorm keeps a change in how they write the same request from counting as a
// disagreement. Uses:
//  - VSS tab: columnVss (VSS's own signals, no world prior, + whether SOP-BERT and the Rules read it the same), method (c) of RESULT.md;
//  - SOP-BERT tab: columnSop (its own signals and act prior + the votes of VSS and the Rules), method (c).
// (The "3 readers" tab, which executed what all three read the same, was removed on 2026-11-03: VSS-BERT measured better; vote3.json's
// column vote3 is no longer used by the page.)
// The tab's own reading is reused, and the other two readers' readings of the tab's cut come from crossReads (made once per message, shared
// with VSS-BERT): nothing is read twice. Thresholds per type (commands, questions) and weights are the file's. Column vss was fitted on the
// VSS cut (VSS on its own cut, SOP-BERT and the Rules on the VSS cutter's units), column sop on the BERT cut (SOP-BERT on its own cut, VSS
// and the Rules on the BERT cutter's units): training/sketch/confidence3/fit3.mjs build(), records vss_own + sop_vss + rules_vss and
// sop_own + vss_bert + rules_bert (combine/collect_pair.mjs, confidence3/collect_rules3.mjs).
const VOTE_OPTS = { agreement: 'engine' };
let vtNow = null;
const vtP = import(new URL('js/vote-confidence.js', document.baseURI).href).then(m => { vtNow = m; return m; }).catch(e => { console.error(e); return null; });
const vconf = { spec: null, error: null, url: null };
/** the vote file (loaded once; a failure is kept in vconf.error and tried again on the next message) */
async function voteSpec() {
  const VT = await vtP; if (!VT) throw new Error('docs/js/vote-confidence.js could not be loaded');
  if (vconf.spec) return vconf.spec;
  try { vconf.url = await VT.urlUnder(new URL('model/', document.baseURI).href); vconf.spec = await VT.load(vconf.url); vconf.error = null; } catch (e) { vconf.error = e; throw e; }
  return vconf.spec;
}
const unitOfNode = (n, text) => { if (n.span) return [n.span[0], n.span[1]]; const k = n.src ? text.indexOf(n.src) : -1; return k < 0 ? [0, 0] : [k, k + n.src.length]; };
const paOf = x => `${x.type}:${x.args.action || x.args.ask || ''}`;
const args0Of = x => ({ action: x.args.action ?? null, name: typeof x.args.name === 'string' ? x.args.name : null, count: x.args.count ?? null });
/** the three readers' readings of one message on one cut ('vss': the VSS tab's votes; 'bert': the SOP-BERT tab's) in the form
 *  vote-confidence.js takes (training/sketch/confidence3/collect_rules3.mjs and combine/collect_pair.mjs: one entry per wire that is not a
 *  mention; SOP-BERT and VSS: the wires of a request), built once per message and cut: the tab's own reading and the other two readers'
 *  readings of its cut (crossReads). A reader that did not read the message (or that cut) has null. */
async function votesOf(rec, cut) {
  rec.votes = rec.votes || {};
  if (rec.votes[cut]) return rec.votes[cut];
  const NC = await ncP, VCm = await vcP, R = rec.readers, text = rec.text, X = await crossReads(rec, text);
  let vssModel = null; try { vssModel = await window.VSSFormalizer.loadConfidence(); } catch (e) { console.error(e); }
  const own = id => R[id] && !R[id].error ? R[id] : null, C = cut === 'vss' ? X.vss : X.bert;
  const rr = C ? C.rules : null, rv = cut === 'vss' ? own('vss') && own('vss').vss : C && C.vss, rn = cut === 'bert' ? own('neural') && own('neural').neural : C && C.sop;
  const one = (res, x) => ({ node: x, pa: paOf(x), got: BenchCanon.canon(x, res.nodes), span: unitOfNode(x, text), args0: args0Of(x) });
  const rules = rr ? rr.nodes.filter(x => x.type !== 'mention').map(x => Object.assign(one(rr, x), { notes: (rr.notes || []).filter(s => String(s).startsWith(`@${x.id}:`)).length })) : null;
  const rulesMsg = rr ? { msgNotes: (rr.notes || []).filter(s => !/^@\w+:/.test(String(s))).length, unread: (rr.segments || []).filter(sg => sg.id == null).length } : null;
  const vss = rv ? rv.nodes.filter(x => x.type !== 'mention' && x.unit).map(x => Object.assign(one(rv, x), { span: x.span ? [x.span[0], x.span[1]] : x.unit.c1 != null ? [x.unit.c0, x.unit.c1] : unitOfNode(x, text),
    f: x.unit.signals || {}, world: x.unit.world, conf: vssModel && VCm ? (x.unit.signals ? VCm.confidence(vssModel, x.unit.signals, x.unit.world) : 0) : NaN })) : null;
  const sop = rn ? rn.nodes.filter(x => x.type !== 'mention' && x.unit).map(x => { const sig = NC ? NC.signals(rn, rn.analyses.indexOf(x.unit)) : null;
    return Object.assign(one(rn, x), { sig, f: sig ? sig.f : {}, act: sig ? sig.act : (x.args.action || x.args.ask || x.type) }); }) : null;
  rec.votes[cut] = { text, rules, rulesMsg, vss, sop, cutWords: rn && rn.joint ? rn.joint.cut : null, cut, why: C ? C.why : null };
  return rec.votes[cut];
}
/** what logic.js does with the shapes of one tab's drawing when it arranges or distributes (alRun / alShapes, itemsOnly, expandGroups): a
 *  group name stands for its members; the background and zone panels are not moved; no target or "all" = every other shape of the
 *  drawing's current area. -> {all: those names (engineNorm's "every canvas name"), groups (lower-case name -> members), panels} */
function engineView(rd) {
  const S = rd.world.state, f = S.frame || { x: 0, y: 0 }, lc = n => String(n).toLowerCase(), isPanel = s => s.layer === 'background' || s.layer === 'zone';
  return { all: S.shapes.filter(s => !isPanel(s) && (c => c.x === f.x && c.y === f.y)(K.cellOf(s.x, s.y))).map(s => s.name),
    groups: new Map((S.groups || []).map(g => [lc(g.name), g.members.map(lc)])), panels: new Set(S.shapes.filter(isPanel).map(s => lc(s.name))) };
}
/** the input of vote-confidence.js for one tab: the three readings, their arrange / distribute lists as that tab's drawing makes them
 *  (vote-confidence.js engineTargets), and the names of "every shape" of that drawing */
const voteMsg = (votes, rd) => { const v = engineView(rd), f = l => (l || []).map(x => vtNow.engineTargets(x, v)); return Object.assign({}, votes, { rules: f(votes.rules), vss: f(votes.vss), sop: f(votes.sop), names: v.all }); };
/** a tab's gate from a column of the vote file: base = the reader's own gate at level "all" (the requests and their wires, every one
 *  executed), items = columnVss / columnSop (one per wire of a request), list = the readings the items index. A request executes when every
 *  item of it clears its threshold, and only when the requests it refers to execute (as vss-confidence.js gate). -> the gate (see GATES) */
function columnGate(base, items, list, level, levels, whyOf) {
  const VT = vtNow, by = new Map();
  items.forEach(it => { const u = list[it.j].node.unit; (by.get(u) || by.set(u, []).get(u)).push(it); });
  const gu = new Map(base.units.map(g => [g.unit, g]));
  for (const g of base.units) {
    const its = by.get(g.unit) || [];
    g.items = its; g.conf = its.length ? Math.min(...its.map(i => i.conf)) : NaN; g.t = its.length ? Math.max(...its.map(i => i.threshold)) : -Infinity;
    g.sure = g.execute = its.every(i => i.execute);
    g.reasons = g.execute ? [] : whyOf(its.filter(i => !i.execute));
  }
  for (const g of base.units) {   // message order: a request's dependencies come before it
    const off = g.dependsOn.map(o => gu.get(o)).filter(d => d && !d.execute);
    if (g.execute && off.length) { g.execute = false; g.reasons = off.map(d => ({ group: 'depends', text: `it uses what “${d.src}” would have made, which was not done` })); }
  }
  const run = new Set(base.units.filter(g => g.execute).flatMap(g => g.nodes));
  const thresholds = { command: VT.thresholdOf(levels, level, 'command:'), question: VT.thresholdOf(levels, level, 'question:') };
  return Object.assign(base, { level, effective: level, label: gateLabel(level), threshold: thresholds.command, thresholds, method: 'votes', safe: VT.thresholdOf(levels, 'cost', 'command:'), executed: base.executed.filter(n => !n.unit || run.has(n)), held: base.units.filter(g => !g.execute) });
}
/** the plain-words reasons of a held request of a column: who reads it the same, then what the reader itself was unsure of (its own signals
 *  under the column's weights, the sentences of vss-confidence.js / neural-confidence.js) */
function columnWhy(self, mine, others, names, own) {
  const VT = vtNow, out = [{ text: VT.agreementWords(self, mine, others, names, 'engine') }];
  for (const w of (own || []).slice(0, 2)) out.push({ group: w.group, own: w.text, text: `${self} itself: ${w.text}` });
  return out;
}
/** why a reader's gate has no votes for this message, in plain words: the other learned reader still loading, not available, or ready but
 *  without a reading of it; the Rules did not read it */
function noVoteWhy(votes, other, otherRd) {
  votes = votes || {};
  if (!votes[other === 'SOP-BERT' ? 'sop' : 'vss']) {
    const st = other === 'SOP-BERT' ? nState : vssState;
    return isReady(otherRd) ? votes.why || `${other} did not read this message` : ['checking', 'loading', 'idle'].includes(st) ? `${other} is still loading` : `${other} is not available`;
  }
  return !votes.rules ? 'the Rules did not read this message' : null;
}
/** a gate without the votes (noVoteWhy): the reason of every request held by the reader's own confidence starts with why there were no votes,
 *  "SOP-BERT is still loading, so VSS decided alone and is not sure: …" (a request held because it uses one not done keeps its reason) */
function aloneReasons(g, why, self) {
  if (!g) return g;
  for (const u of g.units || []) if (!u.execute && u.sure === false)
    u.ownReasons = u.reasons.slice(), u.reasons = [{ text: `${why}, so ${self} decided alone and is not sure${u.reasons.length ? ': ' + u.reasons.map(r => r.text).join('; ') : ''}` }];
  return g;
}
/** VSS's gate (GATES.vss): columnVss when SOP-BERT and the Rules have read the message, else VSS's own confidence alone (vss.json) */
GATES.vss = async (v, rec, r) => {
  if (!window.VSSFormalizer || !window.VSSFormalizer.gate) return null;
  const VT = await vtP; let spec = null; try { spec = await voteSpec(); } catch (e) { console.error(e); }
  const votes = rec ? await votesOf(rec, 'vss') : null;   // column vss: the VSS cut
  const why = !VT || !spec ? 'the model of the votes (confidence/vote3.json) could not be loaded' : noVoteWhy(votes, 'SOP-BERT', RD.neural);
  if (why) { const g = aloneReasons(await window.VSSFormalizer.gate(v, vssGate), why, 'VSS'); if (g) { g.fallback = `${why}, so VSS used its own confidence alone (confidence/vss.json)`;
    const VCm = await vcP; let vm = null; try { vm = await window.VSSFormalizer.loadConfidence(); } catch (e) { console.error(e); } g.safe = VCm && vm ? VCm.threshold(vm, 'cost') : NaN; } return g; }
  const VCm = await vcP, C = spec.columns.vss, m = voteMsg(votes, RD.vss), items = VT.columnVss(spec, m, vssGate, VOTE_OPTS);
  const own = VCm ? VT.ownSpec(C.model) : null;
  return Object.assign(columnGate(await window.VSSFormalizer.gate(v, 'all'), items, m.vss, vssGate, C.levels, held => held.length ? columnWhy('VSS', m.vss[held[0].j], [
    { label: 'SOP-BERT', agree: held[0].agree_sop, reading: held[0].partner_sop >= 0 ? m.sop[held[0].partner_sop] : VT.otherAct(m.text, m.sop, m.vss[held[0].j]) },
    { label: 'the Rules', agree: held[0].agree_rules, reading: held[0].partner_rules >= 0 ? m.rules[held[0].partner_rules] : VT.otherAct(m.text, m.rules, m.vss[held[0].j]) }], m.names, own ? VCm.reasons(own, m.vss[held[0].j].node.unit) : []) : []),
    { pairing: { text: m.text, self: m.vss, other: m.sop, partner: 'partner_sop', agree: 'agree_sop' } });
};
/** SOP-BERT's gate (GATES.neural): columnSop when VSS and the Rules have read the message, else its own confidence alone (sop-bert.json) */
GATES.neural = async (n, rec, r) => {
  const NC = await ncP; if (!NC || !n || !n.joint) return null;
  const VT = await vtP; let spec = null; try { spec = await voteSpec(); } catch (e) { console.error(e); }
  const votes = rec ? await votesOf(rec, 'bert') : null;   // column sop: the BERT cut
  const why = !VT || !spec ? 'the model of the votes (confidence/vote3.json) could not be loaded' : noVoteWhy(votes, 'VSS', RD.vss);
  if (why) { const g = aloneReasons(await neuralOwnGate(n), why, 'SOP-BERT'); if (g) g.fallback = `${why}, so SOP-BERT used its own confidence alone (confidence/sop-bert.json)`; return g; }
  const level = neuralGate || 'cost', C = spec.columns.sop, m = voteMsg(votes, RD.neural), items = VT.columnSop(spec, m, level, VOTE_OPTS), own = VT.ownSpec(C.model);
  for (const it of items) { const s = m.sop[it.j]; if (level !== 'all' && (!s.sig || s.sig.detail.noCut)) { it.conf = NaN; it.execute = false; it.noSignals = true; } }
  return Object.assign(columnGate(NC.gate(null, n, 'all'), items, m.sop, level, C.levels, held => {
    if (!held.length) return [];
    const it = held[0], s = m.sop[it.j];
    if (it.noSignals) return [{ text: !s.sig ? 'the model’s head outputs were not available, so its confidence is not known' : 'the cut head’s output was not available, so its confidence is not known' }];
    return columnWhy('SOP-BERT', s, [{ label: 'VSS', agree: it.agree_vss, reading: it.partner_vss >= 0 ? m.vss[it.partner_vss] : VT.otherAct(m.text, m.vss, s) },
      { label: 'the Rules', agree: it.agree_rules, reading: it.partner_rules >= 0 ? m.rules[it.partner_rules] : VT.otherAct(m.text, m.rules, s) }], m.names, NC.reasons(own, s.sig));
  }), { pairing: { text: m.text, self: m.sop, other: m.vss, partner: 'partner_vss', agree: 'agree_vss' } });
};
// spelling (docs/js/spell.js): a VSA spell checker corrects typed messages before the readers read them; every reader reads the same
// corrected text. Its vocabulary: docs/model/spell/vocab.json (the VSS worlds' words), the legend's values and cue words, and the names
// on the active reader's canvas. The switch is in ⋮ › Settings (Spelling); it is kept in this browser when storage works.
const SPELL_OFF = 'sop.spell.off';
let spellEnabled = store.get(SPELL_OFF) !== '1', speller = null;
const spellP = (window.SpellKit ? SpellKit.load(new URL('model/', document.baseURI).href, engine.legend) : Promise.resolve(null)).then(s => { speller = s; return s; });
const canvasNames = rd => rd.world.state.shapes.map(s => s.name).concat((rd.world.state.groups || []).map(g => g.name));
// cutting (owner, 2026-11-03 afternoon; replaces the one cut for all readers of 2026-11-02 and its setting): each tab reads the requests of
// its own cutter, the cut its confidence was fitted on. Rules: the Rules segmenter (logic.js); VSS: the VSS cutter (docs/model/micro/
// cutter_worlds8s.json, the composer's own cut); SOP-BERT: the BERT cutter (its cut head); VSS-BERT: the BERT cutter (combined.json's
// best_cut, the cut it was fitted on). There is no setting. The votes of the VSS and SOP-BERT tabs need the other two readers' readings of
// the tab's own requests, as vote3.json's columns were fitted (training/sketch/confidence3/fit3.mjs build(): column vss = VSS on its own cut
// with SOP-BERT and the Rules reading the VSS cutter's units; column sop = SOP-BERT on its own cut with VSS and the Rules reading the BERT
// cutter's units). crossReads makes those readings once per message, after every tab has read and before any gate runs:
//  - the VSS cut: the VSS cutter's units (vss-composer.js cutVss, no model call), read by SOP-BERT (one model call: the read of all the
//    units at once) and by the Rules;
//  - the BERT cut: the units of SOP-BERT's own reading (neural.js result.units, no model call), read by VSS and by the Rules; VSS-BERT
//    reuses this VSS reading with SOP-BERT's own reading, so the BERT cutter runs once per message.
// Each partner reads with its own tab's drawing (its names and last shapes, as when it read the message itself).
const OWN_CUT = { rules: 'rules', vss: 'vss', neural: 'bert', combined: 'bert', modernbert: 'modernbert', qwen: 'qwen', [OPUS.id]: 'opus' };
let VF = null;
const vfP = import(new URL('js/vss-formalizer.js', document.baseURI).href).then(m => { VF = m; return m; }).catch(e => { console.error(e); return null; });
const cutStrategies = () => VF ? VF.CUT_STRATEGIES : [{ id: 'rules', label: 'Rules segmenter' }, { id: 'vss', label: 'VSS cutter' }, { id: 'bert', label: 'BERT cutter' }];
const cutLabel = id => id === 'modernbert' ? 'ModernBERT cutter' : id === 'qwen' ? 'Qwen3’s own quotes' : id === 'opus' ? 'nothing: one saved program per message' : (cutStrategies().find(x => x.id === id) || { label: id }).label;
/** the cut a tab's own reading used: its own cutter, or for SOP-BERT without a cut head the whole message */
const cutOfRead = (rd, r) => rd.id === 'neural' && r.neural && r.neural.cutBy !== 'model' ? 'the whole message (no cut head)' : OWN_CUT[rd.id];
/** the readings of the other readers on the VSS and the BERT cut (see above), made once per message (rec.crossP) -> {vss: {units, sop, rules,
 *  ms, why} | null, bert: {units, vss, rules, vssMs, ms, why} | null}; a reading that failed or could not be made is null, with why */
function crossReads(rec, text) {
  if (!rec.crossP) rec.crossP = (async () => {
    const R = rec.readers, ok = id => R[id] && !R[id].error && R[id].ctx ? R[id] : null, X = { vss: null, bert: null };
    if (rec.raw) return X;
    await vfP;
    const rules = (units, ctx) => RD.rules.formalize(text, ctx, { units });
    if (ok('vss') && VF) {
      const t0 = performance.now(), C = X.vss = { units: null, sop: null, rules: null, why: null };
      try {
        C.units = await VF.cut(text, ok('vss').ctx, 'vss', {});
        if (ok('rules')) C.rules = rules(C.units, ok('rules').ctx);
        if (ok('neural')) C.sop = await neural.formalize(text, ok('neural').ctx, { units: C.units });
        else C.why = 'SOP-BERT did not read this message';
      } catch (e) { console.error(e); C.why = `reading the VSS cutter’s requests failed: ${e.message}`; }
      C.ms = performance.now() - t0;
    }
    const n = ok('neural') && ok('neural').neural;
    if (n && Array.isArray(n.units)) {
      const t0 = performance.now(), C = X.bert = { units: n.units, vss: null, rules: null, why: null };
      try {
        if (ok('rules')) C.rules = rules(C.units, ok('rules').ctx);
        if (ok('vss')) { const t1 = performance.now(); C.vss = await window.VSSFormalizer.formalize(text, ok('vss').ctx, RD.vss.formalize, Object.assign({}, VSS_OPTS, { units: C.units })); C.vssMs = performance.now() - t1; }
        else C.why = 'VSS did not read this message';
      } catch (e) { console.error(e); C.why = `reading the BERT cutter’s requests failed: ${e.message}`; }
      C.ms = performance.now() - t0;
    }
    rec.cross = X; return X;
  })();
  return rec.crossP;
}

/* ---------------- canvas ---------------- */
/* ---------------- canvas ---------------- */
function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
/* the palette (logic.js PALETTE, the one table of shades) as CSS variables --pc-<name>-<fill|edge|ink|line> and --pc-arrow, with its dark
   values under the page's dark theme (the same two selectors as index.html), so a theme change repaints without a re-render */
(function paletteCss() {
  const val = (p, r, dark) => (dark && p.dark && p.dark[r]) || p[r];
  /* wash: a label on the colour's light / faint tint: on the pale wash the hue's own dark ink (light hues) or its edge (deep hues);
     on the dark wash its dark line */
  const wash = (p, dark) => dark ? val(p, 'line', true) : p.ink !== '#FFFFFF' ? p.ink : p.edge;
  const vars = dark => Object.entries(K.PALETTE).map(([n, p]) => ['fill', 'edge', 'ink', 'line'].map(r => `--pc-${n}-${r}: ${val(p, r, dark)};`).join(' ') + ` --pc-${n}-wash: ${wash(p, dark)};`).join('\n  ')
    + `\n  --pc-arrow: ${dark ? K.PALETTE_ARROW.dark : K.PALETTE_ARROW.light};`;
  const st = document.createElement('style'); st.id = 'palette';
  st.textContent = `:root {\n  ${vars(false)}\n}\n@media (prefers-color-scheme: dark) {\n:root:not([data-theme="light"]) {\n  ${vars(true)}\n}\n}\n:root[data-theme="dark"] {\n  ${vars(true)}\n}`;
  document.head.appendChild(st);
})();
/** a colour name -> the CSS value of one of its roles (fill, edge, ink, line, wash); an unknown name is drawn as white */
const pc = (name, role) => `var(--pc-${K.PALETTE[name] ? name : 'white'}-${role})`;
function outlinePts(s) {
  const { w, h } = K.dims(s), hw = w / 2, hh = h / 2;
  if (s.shape === 'triangle') return [[0, -hh], [hw, hh], [-hw, hh]];
  if (s.shape === 'diamond') return [[0, -hh], [hw, 0], [0, hh], [-hw, 0]];
  if (s.shape === 'hexagon') return [0, 1, 2, 3, 4, 5].map(i => [Math.cos(i * Math.PI / 3) * hw, Math.sin(i * Math.PI / 3) * hh * 1.0]);
  if (s.shape === 'star') return [...Array(10)].map((_, i) => { const r = i % 2 ? 0.44 : 1, a = -Math.PI / 2 + i * Math.PI / 5; return [Math.cos(a) * hw * r, Math.sin(a) * hh * r + hh * 0.08]; });
  return null;
}
function rayDist(s, ux, uy) {
  const { w, h } = K.dims(s), hw = w / 2, hh = h / 2, c = Math.abs(ux) || 1e-6, sn = Math.abs(uy) || 1e-6;
  switch (s.shape) {
    case 'circle': return hw;
    case 'ellipse': return 1 / Math.sqrt((c / hw) ** 2 + (sn / hh) ** 2);
    case 'square': case 'rectangle': return Math.min(hw / c, hh / sn);
    case 'diamond': return 1 / (c / hw + sn / hh);
    case 'hexagon': return Math.min(hw / c, (hh * 0.87) / sn, 1 / Math.sqrt((c / hw) ** 2 + (sn / hh) ** 2) * 1.02);
    case 'triangle': return Math.min(hw, hh) * 0.72;
    default: return hw * 0.62;
  }
}
function drawShape(g, s) {
  const grp = el('g', { class: 'shp' + (hl.shapes.has(s.name) ? ' hl' : '') + (s.layer ? ' ' + s.layer : '') + (s.shape === 'text' ? ' txt' : '') + (s === stagePanel ? ' stage' : ''), 'data-name': s.name, transform: `translate(${s.x} ${s.y})` }, g);
  const { w, h } = K.dims(s), tint = K.PALETTE_TINT[s.fill];   /* fill=light / faint / none: the body's fill opacity (logic.js PALETTE_TINT) */
  if (s.shape === 'text') {   /* a free text: no body, no name tag; its colour is the text's */
    if (hl.shapes.has(s.name)) el('rect', { class: 'halo', x: -w / 2 - 5, y: -h / 2 - 4, width: w + 10, height: h + 8, rx: 8 }, grp);
    if (selItem && selItem.shape === s.name) el('rect', { class: 'selbox', x: -w / 2 - 5, y: -h / 2 - 4, width: w + 10, height: h + 8, rx: 8 }, grp);
    const t = el('text', { class: 'ftext', x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': K.fontOf(s), style: `fill: ${pc(s.color || 'black', 'line')}` }, grp); t.textContent = s.label || '';
    return;
  }
  const attrs = { class: 'body' + (s.outline ? ' outlined' : ''), style: `fill: ${pc(s.color, 'fill')}; stroke: ${s.outline ? pc(s.outline, 'line') : pc(s.color, 'edge')}` };
  if (tint != null) attrs['fill-opacity'] = tint;
  const pts = outlinePts(s);
  if (s.shape === 'circle') el('circle', Object.assign({ r: w / 2 }, attrs), grp);
  else if (s.shape === 'ellipse') el('ellipse', Object.assign({ rx: w / 2, ry: h / 2 }, attrs), grp);
  else if (pts) el('polygon', Object.assign({ points: pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '), 'stroke-linejoin': 'round' }, attrs), grp);
  else el('rect', Object.assign({ x: -w / 2, y: -h / 2, width: w, height: h, rx: 6 }, attrs), grp);
  if (hl.shapes.has(s.name)) el('rect', { class: 'halo', x: -w / 2 - 7, y: -h / 2 - 7, width: w + 14, height: h + 14, rx: 10 }, grp);
  if (selItem && selItem.shape === s.name) el('rect', { class: 'selbox', x: -w / 2 - 5, y: -h / 2 - 5, width: w + 10, height: h + 10, rx: 8 }, grp);
  /* the name above the shape; a template's own shapes do not show it (their texts say what they are; the details list the names), nor does
     a panel (a background or a zone: its group's frame, its caption and the details name it, and its name shows on hover), so that no
     shape laid out on a zone sits under the zone's name */
  if (s.layer === 'background' || s.layer === 'zone' || !tagShown(s)) el('title', {}, grp).textContent = s.name;
  if (tagShown(s)) { const tag = el('text', { class: 'tag', x: 0, y: -h / 2 - (hl.shapes.has(s.name) ? 12 : 7), 'text-anchor': 'middle' }, grp); tag.textContent = s.name; }
  if (s.label) {
    const room = s.shape === 'rectangle' || s.shape === 'square' || s.shape === 'ellipse' || s.shape === 'circle' ? w * 0.84 : w * 0.56;
    let fs = s.w ? Math.max(10, Math.min(15, s.h / 2.8)) : Math.max(9, Math.min(14, s.size / 4.4)), txt = s.label;   // a box of its own size: the font follows its height
    while (txt.length * fs * 0.56 > room && fs > 9) fs -= 0.5;
    const maxc = Math.max(3, Math.floor(room / (fs * 0.56))); if (txt.length > maxc) txt = txt.slice(0, maxc - 1) + '…';
    const t = el('text', { class: 'lbl', x: 0, y: s.shape === 'triangle' ? h * 0.18 : 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs.toFixed(1), style: `fill: ${pc(s.color, tint != null ? 'wash' : 'ink')}` }, grp);
    t.textContent = txt;
  }
}
/* an arrow that bends round the shapes in its way (logic.js edgeRoutes: the bends, and a free place for its label) */
function drawRoutedEdge(g, e, a, b, bends, lab) {
  const P = [{ x: a.x, y: a.y }].concat(bends, [{ x: b.x, y: b.y }]);
  const unit = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
  const [ux0, uy0] = unit(P[0], P[1]), [ux1, uy1] = unit(P[P.length - 2], P[P.length - 1]);
  const x1 = a.x + ux0 * (rayDist(a, ux0, uy0) + 3), y1 = a.y + uy0 * (rayDist(a, ux0, uy0) + 3), x2 = b.x - ux1 * (rayDist(b, -ux1, -uy1) + 3), y2 = b.y - uy1 * (rayDist(b, -ux1, -uy1) + 3);
  const grp = el('g', { class: 'edge' + (hl.edges.has(e.id) ? ' hl' : '') + (selItem && selItem.edge === e.id ? ' sel' : ''), 'data-edge': e.id }, g);
  const col = e.color ? pc(e.color, 'line') : null;
  const head = (tx, ty, vx, vy) => { const bx = tx - vx * 11, by = ty - vy * 11; el('polygon', { class: 'hd', points: `${tx},${ty} ${bx - vy * 5},${by + vx * 5} ${bx + vy * 5},${by - vx * 5}`, style: col ? `fill:${col}` : '' }, grp); };
  const sx = e.arrow === 'both' ? x1 + ux0 * 9 : x1, sy = e.arrow === 'both' ? y1 + uy0 * 9 : y1;
  const ex = e.arrow === 'none' ? x2 : x2 - ux1 * 9, ey = e.arrow === 'none' ? y2 : y2 - uy1 * 9;
  const pts = [[sx, sy]].concat(bends.map(p => [p.x, p.y]), [[ex, ey]]);
  const ln = el('polyline', { class: 'ln', points: pts.map(p => p.map(v => (+v).toFixed(1)).join(',')).join(' '), 'stroke-linejoin': 'round', style: col ? `stroke:${col}` : '' }, grp);
  if (e.style === 'dashed') ln.setAttribute('stroke-dasharray', '8 6');
  if (e.style === 'dotted') { ln.setAttribute('stroke-dasharray', '0.5 6'); ln.setAttribute('stroke-linecap', 'round'); ln.setAttribute('stroke-width', '2.6'); }
  if (e.width) ln.setAttribute('stroke-width', String(e.style === 'dotted' ? Math.max(2.6, e.width + 0.6) : e.width));
  if (e.arrow !== 'none') head(x2, y2, ux1, uy1);
  if (e.arrow === 'both') head(x1, y1, -ux0, -uy0);
  if (e.label && lab) { const t = el('text', { class: 'elbl', x: lab.x, y: lab.y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grp); t.textContent = e.label; }
}
function drawEdge(g, e, a, b, offset, taken, via) {
  if (via && via.points && via.points.length) return drawRoutedEdge(g, e, a, b, via.points, via.label);
  let dx = b.x - a.x, dy = b.y - a.y; const L = Math.hypot(dx, dy) || 1; const ux = dx / L, uy = dy / L;
  const ox = -uy * offset, oy = ux * offset;
  const ra = rayDist(a, ux, uy) + 3, rb = rayDist(b, -ux, -uy) + 3;
  if (ra + rb >= L - 4) return;
  const x1 = a.x + ux * ra + ox, y1 = a.y + uy * ra + oy, x2 = b.x - ux * rb + ox, y2 = b.y - uy * rb + oy;
  const grp = el('g', { class: 'edge' + (hl.edges.has(e.id) ? ' hl' : '') + (selItem && selItem.edge === e.id ? ' sel' : ''), 'data-edge': e.id }, g);
  const col = e.color ? pc(e.color, 'line') : null;
  const head = (tx, ty, vx, vy) => { const bx = tx - vx * 11, by = ty - vy * 11; el('polygon', { class: 'hd', points: `${tx},${ty} ${bx - vy * 5},${by + vx * 5} ${bx + vy * 5},${by - vx * 5}`, style: col ? `fill:${col}` : '' }, grp); };
  const sx = e.arrow === 'both' ? x1 + ux * 9 : x1, sy = e.arrow === 'both' ? y1 + uy * 9 : y1;
  const ex = e.arrow === 'none' ? x2 : x2 - ux * 9, ey = e.arrow === 'none' ? y2 : y2 - uy * 9;
  const ln = el('line', { class: 'ln', x1: sx, y1: sy, x2: ex, y2: ey, style: col ? `stroke:${col}` : '' }, grp);
  if (e.style === 'dashed') ln.setAttribute('stroke-dasharray', '8 6');
  if (e.style === 'dotted') { ln.setAttribute('stroke-dasharray', '0.5 6'); ln.setAttribute('stroke-linecap', 'round'); ln.setAttribute('stroke-width', '2.6'); }
  if (e.width) ln.setAttribute('stroke-width', String(e.style === 'dotted' ? Math.max(2.6, e.width + 0.6) : e.width));   /* an arrow restyled thicker / thinner (size -> px, logic.js EDGE_PX) */
  if (e.arrow !== 'none') head(x2, y2, ux, uy);
  if (e.arrow === 'both') head(x1, y1, -ux, -uy);
  if (e.label) {
    /* beside the arrow, at its middle; when a shape, a name tag or a text is there, the first free spot further along it or on its other side */
    const lw = String(e.label).length * 6.8 + 4, free = (cx, cy) => !(taken || []).some(o => Math.min(o.x2, cx + lw / 2) - Math.max(o.x1, cx - lw / 2) > 0.5 && Math.min(o.y2, cy + 8) - Math.max(o.y1, cy - 8) > 0.5);
    const spots = []; for (const f of [0.5, 0.38, 0.62, 0.26, 0.74]) for (const side of [1, -1]) { const off = side * (12 + Math.abs(uy) * lw / 2); spots.push([x1 + (x2 - x1) * f - uy * off, y1 + (y2 - y1) * f + ux * off]); }
    const [lx, ly] = via && via.label ? [via.label.x, via.label.y] : spots.find(([cx, cy]) => free(cx, cy)) || spots[0];
    const t = el('text', { class: 'elbl', x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grp); t.textContent = e.label;
  }
}

/* a group: a light dashed frame around its members with its name, drawn behind them and recomputed from the members on every render */
function drawGroups(g, S) {
  const spots = new Map(K.groupLabels(S).map(q => [q.name, q]));   /* the name where nothing else is drawn (logic.js groupLabels) */
  for (const gr of S.groups || []) {
    const b = K.groupBox(S, gr); if (!b) continue;
    const pad = 12, x = b.x1 - pad, y = b.y1 - pad - 14, w = b.w + 2 * pad, h = b.h + 2 * pad + 14, at = spots.get(gr.name) || { x: x + 10, y: y - 6 };
    const grp = el('g', { class: 'grp', 'data-group': gr.name }, g);
    el('rect', { x, y, width: w, height: h, rx: 12, style: 'fill: var(--accent); fill-opacity: .045; stroke: var(--faint); stroke-width: 1.25; stroke-dasharray: 6 5; pointer-events: none' }, grp);
    const t = el('text', { x: at.x, y: at.y, style: 'font-family: var(--font); font-size: 12px; font-weight: 600; fill: var(--faint); pointer-events: none' }, grp);
    t.textContent = gr.name;
  }
}
function cellsInUse() {
  const S = world.state, cells = new Map(), add = c => cells.set(c.x + ',' + c.y, c);
  S.shapes.forEach(s => add(K.cellOf(s.x, s.y)));
  add(S.frame || { x: 0, y: 0 });
  return [...cells.values()];
}
/* The drawing fills its column edge to edge (owner, 2026-11-03 12:22: "make only the gray zone visible, remove the paddings"). When the
   drawing has a background panel (layer=background, a rectangle: the opening drawing's Backdrop), the view is the panel and whatever lies
   outside it, with no padding, and the panel's wash continues to the edges of the board where its shape does not match the board's, so the
   whole board reads as the panel; its own outline is not drawn then. Without a panel the view is the drawing itself (contentExtent: its
   shapes and their name tags, a small margin, at least 380 x 240), centred (owner's bug report, 2026-11-03 afternoon: the examples' drawings
   were crammed into the left: the view was the whole 800 x 500 cell while the readers place new shapes from its top left). renderCanvas
   recomputes it on every change; zoom and pan apply on top of it ("Zoom and pan"). */
let stagePanel = null;
const FIT_MIN = { w: 560, h: 350 }, FIT_PAD = 24;
/** the drawing's own extent: its shapes' bodies and name tags, a margin, at least FIT_MIN, centred on them -> {x1, y1, x2, y2} | null */
function contentExtent(shapes) {
  shapes = shapes.filter(s => Number.isFinite(s.x) && Number.isFinite(s.y));
  if (!shapes.length) return null;
  const boxes = shapes.map(s => { const d = K.dims(s); return { x1: s.x - d.w / 2, x2: s.x + d.w / 2, y1: s.y - d.h / 2, y2: s.y + d.h / 2 }; })
    .concat(shapes.filter(tagShown).map(s => K.tagBox(s)));
  let x1 = Math.min(...boxes.map(b => b.x1)) - FIT_PAD, x2 = Math.max(...boxes.map(b => b.x2)) + FIT_PAD, y1 = Math.min(...boxes.map(b => b.y1)) - FIT_PAD, y2 = Math.max(...boxes.map(b => b.y2)) + FIT_PAD;
  if (x2 - x1 < FIT_MIN.w) { const m = (x1 + x2) / 2; x1 = m - FIT_MIN.w / 2; x2 = m + FIT_MIN.w / 2; }
  if (y2 - y1 < FIT_MIN.h) { const m = (y1 + y2) / 2; y1 = m - FIT_MIN.h / 2; y2 = m + FIT_MIN.h / 2; }
  return { x1, y1, x2, y2 };
}
function stageExtent(shapes) {
  const panels = shapes.filter(s => s.layer === 'background' && (s.shape === 'rectangle' || s.shape === 'square'));
  if (!panels.length) return null;
  const panel = panels.reduce((a, b) => (K.dims(b).w * K.dims(b).h > K.dims(a).w * K.dims(a).h ? b : a));
  const boxes = shapes.map(s => { const d = K.dims(s); return { x1: s.x - d.w / 2, x2: s.x + d.w / 2, y1: s.y - d.h / 2, y2: s.y + d.h / 2 }; })
    .concat(shapes.filter(tagShown).map(s => K.tagBox(s)));
  const e = { x1: Math.min(...boxes.map(b => b.x1)), y1: Math.min(...boxes.map(b => b.y1)), x2: Math.max(...boxes.map(b => b.x2)), y2: Math.max(...boxes.map(b => b.y2)) };
  return Object.assign(e, { panel });
}
/** the panel's wash on the board outside the panel (a rounded hole the size of the panel's body), behind everything */
function washOutside(p) {
  const d = K.dims(p), x = p.x - d.w / 2, y = p.y - d.h / 2, w = d.w, h = d.h, r = 6, tint = K.PALETTE_TINT[p.fill];
  const hole = `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  el('path', { class: 'wash', d: `M-5000 -5000H15000V15000H-5000Z${hole}`, 'fill-rule': 'evenodd', style: `fill: ${pc(p.color, 'fill')}; pointer-events: none`, 'fill-opacity': tint != null ? tint : 1 }, framesG);
}
let dockNames = null;   // the dictation dock's name chips (voice.js setNames), set once the dock is mounted
function renderCanvas() {
  layer.textContent = ''; framesG.textContent = '';
  if (dockNames) dockNames(world.state.shapes.map(s => s.name).concat((world.state.groups || []).map(g => g.name)));
  const S = world.state, by = new Map(S.shapes.map(s => [s.name, s])), cells = cellsInUse();
  tucked = tuckedNames(S.shapes);
  const narrow = svg.clientWidth > 0 && svg.clientWidth < 640;
  const focus = view === 'focus' || (view === 'auto' && narrow);
  if (focus) {
    const fc = cur.focusCell || S.frame || { x: 0, y: 0 };
    const inside = S.shapes.filter(s => { const c = K.cellOf(s.x, s.y); return c.x === fc.x && c.y === fc.y; });
    let bx1 = fc.x, by1 = fc.y, bx2 = fc.x + 800, by2 = fc.y + 500;
    const st = stageExtent(inside);
    if (st) ({ x1: bx1, y1: by1, x2: bx2, y2: by2 } = st);
    else if (inside.length) ({ x1: bx1, y1: by1, x2: bx2, y2: by2 } = contentExtent(inside));
    setBase(`${bx1} ${by1} ${bx2 - bx1} ${by2 - by1}`);
  } else {
    const x1 = Math.min(...cells.map(c => c.x)), y1 = Math.min(...cells.map(c => c.y));
    const x2 = Math.max(...cells.map(c => c.x + 800)), y2 = Math.max(...cells.map(c => c.y + 500));
    const st = cells.length === 1 ? stageExtent(S.shapes) : null, ce = cells.length === 1 && !st ? contentExtent(S.shapes) : null;
    // one cell: its drawing edge to edge (the background panel, else the drawing itself, centred; an empty cell: the cell); several cells:
    // their frames and titles
    if (st) setBase(`${st.x1} ${st.y1} ${st.x2 - st.x1} ${st.y2 - st.y1}`);
    else if (ce) setBase(`${ce.x1} ${ce.y1} ${ce.x2 - ce.x1} ${ce.y2 - ce.y1}`);
    else if (cells.length === 1) setBase(`${x1} ${y1} 800 500`);
    else setBase(`${x1 - 14} ${y1 - 30} ${x2 - x1 + 28} ${y2 - y1 + 44}`);
  }
  stagePanel = (focus ? stageExtent(S.shapes.filter(s => { const c = K.cellOf(s.x, s.y), fc = cur.focusCell || S.frame || { x: 0, y: 0 }; return c.x === fc.x && c.y === fc.y; })) : cells.length === 1 ? stageExtent(S.shapes) : null);
  stagePanel = stagePanel && stagePanel.panel;
  if (stagePanel) washOutside(stagePanel);
  const vb = $('#view-btn'); if (vb) { vb.setAttribute('aria-pressed', String(!focus)); vb.title = focus ? 'Show the whole canvas' : 'Zoom to the current drawing'; vb.setAttribute('aria-label', vb.title); }
  if (cells.length > 1) for (const c of cells) {
    el('rect', { class: 'frame', x: c.x, y: c.y, width: 800, height: 500, rx: 14 }, framesG);
    const f = (S.frames || []).find(f => f.x === c.x && f.y === c.y);
    if (f && f.title) { const t = el('text', { class: 'ftitle', x: c.x + 14, y: c.y - 9 }, framesG); t.textContent = f.title; }
  }
  if (!S.shapes.length) { const f = S.frame || { x: 0, y: 0 }, t = el('text', { class: 'empty-note', x: f.x + 400, y: f.y + 250, 'text-anchor': 'middle' }, layer); t.textContent = 'Nothing here yet. Write what to draw.'; }
  const gg = el('g', {}, layer), pg = el('g', {}, layer), eg = el('g', {}, layer), sg = el('g', {}, layer);   // panels (background, zones) behind the arrows, so an arrow and its label are never under a zone
  drawGroups(gg, S);
  const taken = [];   /* what an arrow's label must not cover: the shapes' bodies, their name tags and the free texts */
  for (const s of S.shapes) { if (s.layer) continue; const d = K.dims(s); taken.push({ x1: s.x - d.w / 2, x2: s.x + d.w / 2, y1: s.y - d.h / 2, y2: s.y + d.h / 2 }); if (tagShown(s)) taken.push(K.tagBox(s)); }
  const routes = K.edgeRoutes ? K.edgeRoutes(S) : {};   /* bends round the shapes in the way, and label places (logic.js edgeRoutes) */
  for (const e of S.edges) {
    const a = by.get(e.from), b = by.get(e.to); if (!a || !b) continue;
    const pair = S.edges.some(o => o !== e && o.from === e.to && o.to === e.from);
    drawEdge(eg, e, a, b, pair ? 6 : 0, taken, pair ? null : routes[e.id]);
  }
  for (const s of S.shapes) drawShape(s.layer === 'background' || s.layer === 'zone' ? pg : sg, s);
  fitIfNew(); applyZoom();   // the automatic fit above, then the view's zoom and pan (see "Zoom and pan")
  const n = S.shapes.length, m = S.edges.length;
  $('#readout').textContent = `${n} shape${n === 1 ? '' : 's'} · ${m} link${m === 1 ? '' : 's'}`;
}
function flash(h) {
  hl = { shapes: new Set((h && h.shapes) || []), edges: new Set((h && h.edges) || []) };
  renderCanvas(); clearTimeout(hlTimer);
  if (hl.shapes.size || hl.edges.size) hlTimer = setTimeout(() => { hl = { shapes: new Set(), edges: new Set() }; renderCanvas(); }, 4200);
}

/* drag shapes by hand */
function svgPt(ev) { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
svg.addEventListener('pointerdown', ev => {
  const g = ev.target.closest && ev.target.closest('.shp'); if (!g) return;
  if (cur.id === 'qwen' && (qwenQueued || (qwen && qwen.S.busy))) { if (!qwenNoted) { qwenNoted = true; sysNote('Qwen3 is reading: its drawing can be moved by hand when its queue is empty.'); } return; }
  const s = world.find(g.dataset.name); if (!s || s.layer === 'background') return;   // the background stays put
  const p = svgPt(ev); drag = { name: s.name, before: world.snapshot(), dx: s.x - p.x, dy: s.y - p.y, cell: K.cellOf(s.x, s.y), moved: false };
  svg.setPointerCapture(ev.pointerId); ev.preventDefault();
});
svg.addEventListener('pointermove', ev => {
  if (!drag) return; const s = world.find(drag.name); if (!s) return;
  const p = svgPt(ev), { w, h } = K.dims(s), c = drag.cell;
  const x = Math.round(Math.min(c.x + 800 - w / 2 - 10, Math.max(c.x + w / 2 + 10, p.x + drag.dx))), y = Math.round(Math.min(c.y + 500 - h / 2 - 10, Math.max(c.y + h / 2 + 24, p.y + drag.dy)));
  if (x !== s.x || y !== s.y) { s.x = x; s.y = y; drag.moved = true; renderCanvas(); }
});
const endDrag = () => {
  if (!drag) return; const d = drag; drag = null;
  if (d.moved) { world.commit(d.before); cur.last = [d.name]; updateTabs(); }
  else {   // a click without a move selects the shape; a second click on it within 450 ms is a double-click (Direct editing; the first
    // click re-renders the drawing, so the browser's own dblclick does not always reach the new element)
    const now = Date.now(), dbl = lastShapeClick && lastShapeClick.name === d.name && now - lastShapeClick.t < 450;
    lastShapeClick = dbl ? null : { name: d.name, t: now };
    if (dbl) editInline({ shape: d.name }); else select({ shape: d.name });
  }
};
svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);

/* Direct editing (owner, 2026-11-03): a click selects a shape, a free text or an arrow (a dashed frame or a highlighted line; a click on the
   empty canvas or Escape clears it); Delete or Backspace, with the focus outside any text field, deletes the selected item; a double-click
   on a shape, a free text or an arrow opens a small input over its text (a shape with no label gets one), Enter saves and Escape cancels.
   Each change goes through the engine as a SOP Lang message, like the toolbar's buttons: it shows in the chat ("Delete Check" → "Deleted
   Check."), is read by every tab, and undo takes it back in one step. */
let lastShapeClick = null;
function select(it) { if (JSON.stringify(it) === JSON.stringify(selItem)) return; selItem = it; renderCanvas(); }
svg.addEventListener('click', ev => {
  const eg = ev.target.closest && ev.target.closest('.edge');
  if (eg && eg.dataset.edge) {   // a second click within 450 ms: the inline editor of its label (as for shapes, endDrag)
    const now = Date.now(), id = eg.dataset.edge, dbl = lastShapeClick && lastShapeClick.name === 'edge:' + id && now - lastShapeClick.t < 450;
    lastShapeClick = dbl ? null : { name: 'edge:' + id, t: now };
    if (dbl) editInline({ edge: id }); else select({ edge: id }); return; }
  if (ev.detail > 1) return;
  if (!(ev.target.closest && ev.target.closest('.shp')) && !svg.classList.contains('panned') && selItem) select(null);
});
const sopText = t => String(t).replace(/["\n\r]+/g, ' ').trim();   // a label in a SOP Lang wire (quotes inside are dropped)
const edgeById = id => world.state.edges.find(e => e.id === id);
function deleteSelected() {
  const it = selItem; if (!it) return false;
  if (it.shape) { const s = world.find(it.shape); if (!s) { select(null); return false; } selItem = null; submit(`Delete ${s.name}`, `@d command action=delete target=${s.name}`); return true; }
  const e = edgeById(it.edge); if (!e) { select(null); return false; } selItem = null;
  submit(`Disconnect ${e.from} from ${e.to}`, `@d command action=disconnect from=${e.from} to=${e.to}`); return true;
}
document.addEventListener('keydown', ev => {
  if (!selItem || ev.defaultPrevented) return;
  const t = ev.target, typing = t && (t.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  if (typing || sub !== 'drawing') return;
  if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); deleteSelected(); }
  else if (ev.key === 'Escape') select(null);
});
/** the inline editor over a text: target {shape: name} | {edge: id}; Enter saves through the engine, Escape (or leaving it) cancels */
function editInline(target) {
  const old = document.querySelector('.inl-edit'); if (old) old.remove();
  let anchorEl, value = '', label;
  if (target.shape) {
    const s = world.find(target.shape); if (!s || s.layer === 'background') return;
    const g = layer.querySelector(`.shp[data-name="${CSS.escape(s.name)}"]`); if (!g) return;
    anchorEl = g.querySelector('.lbl, .ftext') || g; value = s.label || ''; label = s.shape === 'text' ? `the text of ${s.name}` : `the label of ${s.name}`;
  } else {
    const e = edgeById(target.edge); if (!e) return;
    const g = layer.querySelector(`.edge[data-edge="${CSS.escape(e.id)}"]`); if (!g) return;
    anchorEl = g.querySelector('.elbl') || g; value = e.label || ''; label = `the label of the arrow ${e.from} → ${e.to}`;
  }
  const board = document.querySelector('.board'), br = board.getBoundingClientRect(), r = anchorEl.getBoundingClientRect();
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'inl-edit'; inp.value = value; inp.setAttribute('aria-label', `Edit ${label}`); inp.placeholder = 'label';
  const w = Math.max(90, Math.min(br.width - 16, r.width + 40));
  inp.style.left = Math.max(4, Math.min(br.width - w - 4, r.left - br.left + r.width / 2 - w / 2)) + 'px'; inp.style.top = Math.max(4, r.top - br.top + r.height / 2 - 15) + 'px'; inp.style.width = w + 'px';
  board.appendChild(inp); inp.focus(); inp.select();
  let done = false;
  const close = () => { done = true; inp.remove(); };
  inp.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(); return; }
    if (ev.key !== 'Enter') return;
    ev.preventDefault(); const v = sopText(inp.value); close();
    if (v === sopText(value)) return;
    if (target.shape) { const s = world.find(target.shape); if (s) submit(v ? `Label ${s.name} "${v}"` : `Remove the label of ${s.name}`, `@l command action=label target=${s.name} label="${v}"`); }
    else { const e = edgeById(target.edge); if (e) submit(v ? `Label the arrow from ${e.from} to ${e.to} "${v}"` : `Remove the label of the arrow from ${e.from} to ${e.to}`, `@l command action=label from=${e.from} to=${e.to} label="${v}"`); }
  });
  inp.addEventListener('blur', () => { if (!done) close(); });
}
svg.addEventListener('dblclick', ev => ev.preventDefault());   // no text selection; shapes: endDrag, arrows: the click handler above

/* Zoom and pan (owner, 2026-11-03 afternoon): a pure view transform, the svg's viewBox around the automatic fit that renderCanvas computes
   (the edge-to-edge panel view); nothing in the engine changes. zv: the zoom factor k (1 = the fit) and the pan (dx, dy, world units from
   the fit's centre), in memory only and shared by every tab. Zoom: the footer's − / + buttons (with the zoom %), Ctrl+wheel and pinch
   around the pointer, + / − keys; pan: dragging the empty canvas (mouse or one finger; a shape still drags the shape), arrow keys when the
   canvas has focus; fit (the footer button, 0, a new drawing: cleared or a new frame) returns to the automatic fit. After a message, when
   the view is zoomed or panned and shapes lie outside it, the fit button is highlighted as a hint; the view does not jump. */
const zv = { k: 1, dx: 0, dy: 0 }, ZMIN = 0.25, ZMAX = 8, ZSTEP = 1.25;
let vbBase = { x: 0, y: 0, w: 800, h: 500 }, vbNow = vbBase;
const fitKeys = new Map();   // per tab: its frame and whether it is empty, to see a new drawing
const zoomedNow = () => zv.k !== 1 || zv.dx !== 0 || zv.dy !== 0;
function setBase(s) { const [x, y, w, h] = String(s).split(/\s+/).map(Number); if ([x, y, w, h].every(Number.isFinite) && w > 0 && h > 0) vbBase = { x, y, w, h }; }   // never a NaN view (a shape at NaN once broke zoom and fit)
function applyZoom() {
  const b = vbBase, w = b.w / zv.k, h = b.h / zv.k, cx = b.x + b.w / 2 + zv.dx, cy = b.y + b.h / 2 + zv.dy;
  vbNow = { x: cx - w / 2, y: cy - h / 2, w, h };
  svg.setAttribute('viewBox', `${+vbNow.x.toFixed(2)} ${+vbNow.y.toFixed(2)} ${+vbNow.w.toFixed(2)} ${+vbNow.h.toFixed(2)}`);
  const p = $('#zoom-pct'); if (p) p.textContent = Math.round(zv.k * 100) + '%';
  const f = $('#zoom-fit'); if (f) { f.setAttribute('aria-pressed', String(!zoomedNow())); if (!zoomedNow()) f.classList.remove('hint'); }
  const zi = $('#zoom-in'), zo = $('#zoom-out'); if (zi) zi.disabled = zv.k >= ZMAX - 1e-9; if (zo) zo.disabled = zv.k <= ZMIN + 1e-9;
}
function zoomFit() { zv.k = 1; zv.dx = 0; zv.dy = 0; applyZoom(); }
/** zoom by f keeping the world point p (default: the view's centre) under the same screen point */
function zoomBy(f, p) {
  const k2 = Math.min(ZMAX, Math.max(ZMIN, zv.k * f)), r = k2 / zv.k; if (r === 1) return;
  const c = { x: vbNow.x + vbNow.w / 2, y: vbNow.y + vbNow.h / 2 }; p = p || c;
  const nc = { x: p.x - (p.x - c.x) / r, y: p.y - (p.y - c.y) / r };
  zv.k = k2; zv.dx = nc.x - (vbBase.x + vbBase.w / 2); zv.dy = nc.y - (vbBase.y + vbBase.h / 2);
  if (Math.abs(zv.k - 1) < 1e-9) zv.k = 1;
  applyZoom();
}
/** world units per screen pixel (preserveAspectRatio meet) */
const unitsPerPx = () => { const m = svg.getScreenCTM(); return m && m.a ? 1 / m.a : 1; };
function panBy(dxW, dyW) { zv.dx += dxW; zv.dy += dyW; applyZoom(); }
/** a new drawing on the active tab (cleared, or another frame): back to the automatic fit */
function fitIfNew() {
  const S = world.state, f = S.frame || { x: 0, y: 0 }, key = `${f.x},${f.y},${S.shapes.length ? 1 : 0}`, was = fitKeys.get(cur.id);
  fitKeys.set(cur.id, key);
  if (was != null && was !== key && zoomedNow()) { zv.k = 1; zv.dx = 0; zv.dy = 0; }
}
/** after a message: shapes outside a zoomed or panned view -> the fit button as a highlighted hint (no jump) */
function fitHint() {
  const f = $('#zoom-fit'); if (!f) return;
  const out = zoomedNow() && world.state.shapes.some(s => { if (s.layer === 'background') return false; const d = K.dims(s); return s.x + d.w / 2 < vbNow.x || s.x - d.w / 2 > vbNow.x + vbNow.w || s.y + d.h / 2 < vbNow.y || s.y - d.h / 2 > vbNow.y + vbNow.h; });
  f.classList.toggle('hint', out); f.title = out ? 'Some shapes are outside the view: fit the drawing to the view' : 'Fit the drawing to the view';
}
// pan by dragging the empty canvas, pinch with two fingers (the shape drag above starts first and wins on a shape)
const ptrs = new Map(); let pan = null, pinch = null;
svg.addEventListener('pointerdown', ev => {
  ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (drag) return;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: zv.k }; pan = null; return; }
  if (ev.button !== 0 && ev.pointerType === 'mouse') return;
  pan = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, dx0: zv.dx, dy0: zv.dy, upp: unitsPerPx(), moved: false };
});
svg.addEventListener('pointermove', ev => {
  if (!ptrs.has(ev.pointerId)) return; ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), p = svgPt({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
    zoomBy(pinch.k0 * d / pinch.d0 / zv.k, p); return;
  }
  if (!pan || pan.id !== ev.pointerId || drag) return;
  const mx = ev.clientX - pan.x0, my = ev.clientY - pan.y0;
  if (!pan.moved && Math.hypot(mx, my) < 4) return;   // a click stays a click
  if (!pan.moved) { pan.moved = true; try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* gone */ } svg.classList.add('panning'); }
  zv.dx = pan.dx0 - mx * pan.upp; zv.dy = pan.dy0 - my * pan.upp; applyZoom();
});
const endPan = ev => { ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinch = null; if (pan && pan.id === ev.pointerId) { svg.classList.toggle('panned', pan.moved); pan = null; svg.classList.remove('panning'); setTimeout(() => svg.classList.remove('panned'), 0); } };
svg.addEventListener('pointerup', endPan); svg.addEventListener('pointercancel', endPan);
svg.addEventListener('wheel', ev => { if (!ev.ctrlKey && !ev.metaKey) return; ev.preventDefault(); zoomBy(Math.exp(-ev.deltaY * 0.0025), svgPt(ev)); }, { passive: false });
svg.addEventListener('keydown', ev => {
  const step = 0.1, K2 = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
  if (K2) { ev.preventDefault(); panBy(K2[0] * vbNow.w, K2[1] * vbNow.h); return; }
  if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); zoomBy(ZSTEP); }
  else if (ev.key === '-' || ev.key === '_') { ev.preventDefault(); zoomBy(1 / ZSTEP); }
  else if (ev.key === '0') { ev.preventDefault(); zoomFit(); }
});
$('#zoom-in').addEventListener('click', () => zoomBy(ZSTEP));
$('#zoom-out').addEventListener('click', () => zoomBy(1 / ZSTEP));
$('#zoom-fit').addEventListener('click', () => zoomFit());
$('#names-btn').addEventListener('click', () => { setShowNames(!showNames, true); renderCanvas(); });
setShowNames(showNames);

/* ---------------- chat ---------------- */
const scrollDown = () => { msgs.scrollTop = msgs.scrollHeight; };
function meBubble(text, sp, meta) {
  const d = document.createElement('div'); d.className = 'b me';
  const fix = sp && sp.fixes.length ? `<div class="fix" title="${escH('Every reader read: ' + sp.text)}">spelling: ${sp.fixes.map(f => `<s>${escH(f.from)}</s> → ${escH(f.to)}`).join(', ')}</div>` : '';
  // a message spoken or typed in another language (docs/js/voice.js): the English text is the message, the original is shown under it
  const orig = meta && meta.original ? `<div class="orig" lang="${escH(meta.lang || '')}"><b>${escH(window.VoiceKit ? VoiceKit.shortName(meta.lang) : meta.lang || '')}</b>${meta.via === 'voice' ? ', spoken' : ''}: ${escH(meta.original)}${meta.translation && meta.translation.by === 'none' ? ' (not translated)' : ''}</div>` : '';
  d.innerHTML = `<div class="txt">${escH(text)}</div>${orig}${fix}<div class="meta"><time>${clock()}</time></div>`;
  msgs.appendChild(d); scrollDown();
}
// Which tabs' replies the chat shows (owner, 2026-11-03 09:30): ⋮ › Settings › Replies in the chat, default VSS-BERT only, so that the
// conversation reads as one reply. Every tab still reads every message into its own drawing, and a message's details show every reader.
// When none of the chosen tabs read a message (VSS-BERT waits until VSS and SOP-BERT are loaded), the chat shows the lines of the readers that
// did read it, by name, and says why. A reply of one line from the only tab shown has no "VSS-BERT · 12 ms:" prefix: the reader and its time
// are a quiet tag beside the time. The choice is kept in this browser when it is not the default.
const CHAT_KEY = 'sop.chat.tabs', CHAT_DEFAULT = ['combined'];
const chatTabs = (() => { const ids = String(store.get(CHAT_KEY) || '').split(',').filter(id => RD[id]); return new Set(ids.length ? ids : CHAT_DEFAULT); })();
/** the lines of a reply the chat shows (see CHAT_KEY): {lines, note} */
function chatLines(parts) {
  const chosen = parts.filter(p => chatTabs.has(p.rd.id));
  if (chosen.some(p => !p.off)) return { lines: chosen, note: null };
  const others = parts.filter(p => !chatTabs.has(p.rd.id) && !p.off && p.rd.id !== 'saved' && p.rd.id !== OPUS.id);
  if (!others.length) return { lines: chosen, note: null };
  return { lines: others, note: `${listing(chosen.map(p => p.rd.label))} ${chosen.length === 1 ? 'is' : 'are'} not ready yet, so here is what ${listing(others.map(p => p.rd.label))} made of it.` };
}
function botBubble(o) {
  const d = document.createElement('div'); d.className = 'b bot' + (o.err ? ' err' : '');
  const solo = o.lines && o.lines.length === 1 && chatTabs.size === 1 && chatTabs.has(o.lines[0].rd.id) ? o.lines[0] : null;   // no prefix
  let h = o.lines ? o.lines.map(p => `<div class="rl${p.err ? ' err' : ''}${p.off ? ' off' : ''}" data-reader="${p.rd.id}">${solo ? '' : `<b>${escH(p.rd.label)}${p.ms != null ? ` · ${fmtMs(p.ms)}` : ''}:</b> `}<span class="t">${escH(p.off || p.text)}</span>${p.held && p.held.length ? heldHTML(p.held) : ''}${p.sub ? `<div class="sub">${escH(p.sub)}</div>` : ''}</div>`).join('')
    : `<div class="txt">${escH(o.text)}</div>`;
  if (o.sub) h += `<div class="sub">${escH(o.sub)}</div>`;
  if (o.chips && o.chips.length) h += `<div class="chips">${o.chips.map(c => `<button type="button" data-pick="${escH(c)}">${escH(c)}</button>`).join('')}</div>`;
  const who = solo ? `<span class="who" title="${escH(`The reply of the ${solo.rd.label} tab; ⋮ › Settings › Replies in the chat shows the other tabs’ replies too`)}">${escH(solo.rd.label)}${solo.ms != null ? ` · ${fmtMs(solo.ms)}` : ''}</span>` : '';
  h += `<div class="meta">${o.tag ? `<span class="tag2">${escH(o.tag)}</span>` : ''}${who}${o.turn ? `<button type="button" data-turn="${o.turn}">details</button>` : ''}<time>${clock()}</time></div>`;
  d.innerHTML = h;
  if (o.replace) o.replace.replaceWith(d); else msgs.appendChild(d);
  scrollDown(); return d;
}
function sysNote(text) { const d = document.createElement('div'); d.className = 'sys'; d.textContent = text; msgs.appendChild(d); scrollDown(); }
function typing() { const d = document.createElement('div'); d.className = 'b bot'; d.innerHTML = '<div class="typing" aria-label="Thinking"><i></i><i></i><i></i></div>'; msgs.appendChild(d); scrollDown(); return d; }
function setStatus(t) { $('#status').textContent = t; }
const fmtMs = ms => ms < 10 ? ms.toFixed(1) + ' ms' : Math.round(ms) + ' ms';
const isReady = rd => rd.id === 'rules' || rd.id === 'saved' || rd.id === OPUS.id || (rd.id === 'qwen' ? qwenReady() : rd.id === 'modernbert' ? !!modern.models && modern.state === 'ready' : rd.id === 'vss' ? vssState === 'ready' : rd.id === 'neural' ? !!models && nState === 'ready' : isReady(RD.vss) && isReady(RD.neural));
/** what a reader that is not loaded says instead of an answer */
function offText(rd) {
  if (rd.id === 'saved') return saved.info().error ? 'saved translations unavailable: ' + saved.info().error : 'saved example translations; no live inference';
  if (rd.id === 'qwen') return { idle: 'not loaded (experimental: Load Qwen3 on its tab)', loading: 'still loading, did not read this', failed: 'not available (it failed or was stopped; see Qwen3 › Settings)' }[qwenState()] || 'not ready, did not read this';
  if (rd.id === 'modernbert') return { unpublished: 'not available (the trained ModernBERT model is not published yet)', failed: 'not available (loading failed; see ModernBERT › Settings)' }[modern.state] || 'still loading, did not read this';
  if (rd.id === 'combined') { const wait = [RD.vss, RD.neural].filter(x => !isReady(x)); return `waits for ${listing(wait.map(x => x.label))} (it combines the readings of VSS and SOP-BERT)`; }
  if (rd.id === 'vss') return vssState === 'failed' ? 'not available (it could not be loaded)' : 'still loading, did not read this';
  return { unpublished: 'not available (the neural model is not published yet)', failed: 'not available (loading failed; see SOP-BERT › Settings)' }[nState] || 'still loading, did not read this';
}
const idleStatus = () => 'reads with ' + listing(READERS.filter(rd => isReady(rd) && rd.id !== OPUS.id).map(r => r.label)) + (qwenQueued ? `; Qwen3 is reading (${qwenQueued} in its queue)` : '');
msgs.addEventListener('click', ev => {
  const p = ev.target.closest('[data-pick]'); if (p) { submit(p.dataset.pick, undefined, { via: 'chip' }); return; }
  const a = ev.target.closest('[data-anyway]');
  if (a) { const [rid, turn, idx] = a.dataset.anyway.split(':'); a.disabled = true; const job = () => doAnyway(rid, +turn, +idx).catch(e => { console.error(e); botBubble({ text: 'Something went wrong: ' + e.message, err: true }); });
    if (rid === 'qwen') qwenJob(job); else queue = queue.then(job); return; }
  // Edit: the clearer command into the message box, not sent; the first ‹placeholder› is selected, so typing replaces it
  const ed = ev.target.closest('[data-edit]');
  if (ed) { { const [r0, t0, i0] = ed.dataset.edit.split(':'); pendingEdit = { turn: +t0, reader: r0, index: +i0, suggested: ed.dataset.text || '' }; collectEvent(+t0, { kind: 'edit', reader: r0, index: +i0, suggested: ed.dataset.text || '' }); }
    ta.value = ed.dataset.text || ''; grow(); ta.focus({ preventScroll: true }); const i = ta.value.indexOf('‹'), j = i < 0 ? -1 : ta.value.indexOf('›', i); if (j > i) ta.setSelectionRange(i, j + 1); else ta.setSelectionRange(ta.value.length, ta.value.length); return; }
  const t = ev.target.closest('[data-turn]'); if (t) openSheet('turn', null, +t.dataset.turn);
});

/* Turn effects into one or two plain sentences. */
const listing = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const few = (a, n) => a.length > n ? listing(a.slice(0, n).concat(`${a.length - n} more`)) : listing(a);
function summarize(result) {
  const adds = [], links = [], unlinks = [], dels = [], moved = [], changed = [], renames = [], rules = [], said = [], answers = [];
  for (const st of result.steps) {
    if (st.node.type === 'mention' || st.error || st.skipped) continue;
    if (st.node.args && st.node.args.template && st.answer) { answers.push(st.answer); continue; }   // a template: its answer says what it drew
    for (const p of st.patches) {
      if (p.op === 'add') adds.push(`${p.shape.name}`);
      else if (p.op === 'link') links.push(K.edgeText(p.edge).replace(/ \(.*$|\s+".*"$/, ''));
      else if (p.op === 'unlink') unlinks.push(p.edge ? `${p.edge.from}–${p.edge.to}` : p.id);
      else if (p.op === 'remove') dels.push(p.name);
      else if (p.op === 'rename') renames.push(`${p.from} to ${p.to}`);
      else if (p.op === 'rule') rules.push(p.rule);
      else if (p.op === 'forget') said.push('Forgot all default rules.');
      else if (p.op === 'reorder') said.push(p.to === 'front' ? `Brought ${p.name} to the front.` : `Sent ${p.name} to the back.`);
      else if (p.op === 'edgeSet') { if (!st.answer && p.edge) said.push(`The arrow ${p.edge.from}–${p.edge.to} ${p.edge.label ? `now says “${p.edge.label}”` : 'has no label now'}.`); }
      else if (p.op === 'set') {
        if ('x' in p.props && !moved.includes(p.name)) moved.push(p.name);
        const ch = Object.entries(p.props).filter(([k]) => k !== 'x' && k !== 'y').map(([k, v]) => k === 'size' ? K.sizeName(v) : k === 'label' ? `labeled “${v}”` : k === 'outline' ? (v ? `${v} outline` : 'no outline') : k === 'shape' ? `a ${v}` : String(v));
        if (ch.length) changed.push(`${p.name} is now ${listing(ch)}`);
      }
    }
    if (st.answer) answers.push(st.answer);
    for (const n of st.notes || []) if (/^(reverted|re-applied|there was nothing)|already/.test(n)) said.push(n.charAt(0).toUpperCase() + n.slice(1) + '.');
  }
  const out = [];
  if (adds.length) out.push(`Drew ${few(adds, 6)}.`);
  if (links.length) out.push(`Connected ${few(links, 4)}.`);
  if (renames.length) out.push(`Renamed ${listing(renames)}.`);
  if (changed.length) out.push(changed.slice(0, 4).join('; ') + (changed.length > 4 ? `; and ${changed.length - 4} more.` : '.'));
  if (moved.length) out.push(`Moved ${few(moved, 5)}.`);
  if (unlinks.length) out.push(`Removed the link${unlinks.length > 1 ? 's' : ''} ${few(unlinks, 4)}.`);
  if (dels.length) out.push(`Deleted ${few(dels, 6)}.`);
  for (const r of rules) out.push(`From now on, new ${r.shape ? r.shape + 's' : 'shapes'} will be ${['size', 'color'].filter(k => r[k]).map(k => r[k]).join(' ')}${r.outline ? ' with a ' + r.outline + ' outline' : ''}.`);
  out.push(...said.map(s => s.replace(/^Reverted 1 turn\.$/, 'Undid the last change.').replace(/^Re-applied 1 turn\.$/, 'Redid it.')));
  out.push(...answers);
  return out.join(' ') || 'Done.';
}

/* ---------------- running a turn ---------------- */
/** meta (optional): where the message came from, for the collected requests and the chat: {via: 'typed' | 'voice' | 'chip' | 'example' |
 *  'script' | 'help' | 'start', lang, original, translation, speak} (docs/js/voice.js sends the English text with the original in meta) */
function submit(text, sop, meta) { if (typeof sop !== 'string') sop = undefined; queue = queue.then(() => run(text, sop, meta)).catch(e => { console.error(e); botBubble({ text: 'Something went wrong: ' + e.message, err: true }); }); return queue; }
async function run(text, sop, meta) {
  text = String(text).trim(); if (!text) return;
  // the spell checker runs before every reader (not on SOP and toolbar buttons): they all read the corrected text
  const typed = text, raw = !!sop || text.startsWith('@');
  // Capture the immutable occurrence before spelling. Saved programs never use the corrected text to select a translation.
  const savedSource = meta && meta.saved ? Object.assign({}, meta.saved) : null;
  let sp = null;
  if (!raw && spellEnabled) { const sc = await spellP; if (sc) { sp = sc.check(text, { names: canvasNames(cur) }); text = sp.text; } }
  meBubble(typed, sp, meta);
  const namesBefore = canvasNames(RD.combined);   // the drawing the chat speaks for, before the message (the collected entry's `names`)
  const id = ++turnSeq, rec = { id, time: clock(), text, typed, spell: sp, spellOff: !raw && !spellEnabled, raw, sop: sop || text, button: !!sop, savedSource, readers: {}, off: {}, ran: [] }; history.push(rec);
  // the occurrence for the Claude Opus 5.5 tab (see "Saved translations of Claude Opus 5.5"): example id and 1-based turn, the source text and
  // its renames; only a built-in example played from the menu has one
  if (savedSource && typeof savedSource.exampleId === 'string') { const [kind, eid] = savedSource.exampleId.split(':');
    rec.example = { example: kind === 'quick' ? 'quick' : eid, turn: kind === 'quick' ? +eid + 1 : savedSource.turn + 1, original: savedSource.original, map: Object.assign({}, (meta && meta.opusMap) || {}) }; }
  if (rec.raw) { try { K.parse(rec.sop); } catch (e) { rec.error = e; botBubble({ text: e.message, err: true, turn: id, tag: 'SOP Lang' }); return; } }
  // the readers that read this message are fixed now: one that finishes loading meanwhile starts from the Rules drawing instead
  const live = READERS.filter(rd => isReady(rd) && rd.id !== 'qwen'), qwenLive = qwenReady();   // Qwen3 reads in its own queue (qwenRead)
  // a reply to a question ("which Hub?") goes to the readers that asked it; the others have nothing to choose
  const want = text.toLowerCase().replace(/^(?:i\s+mean|use|the\s+one\s+(?:named|called))\s+/, '').replace(/[.!]+$/, '').trim();
  const picks = new Map(live.map(rd => [rd, rd.id !== OPUS.id && rd.pending && rd.pending.candidates.find(c => c.toLowerCase() === want)]));   // the Claude Opus 5.5 tab takes no reply
  const anyPick = [...picks.values()].some(Boolean);
  const wait = live.filter(rd => rd.id !== OPUS.id).length > 1 ? typing() : null; if (wait) setStatus('typing…');
  // first every reader reads (formalizes) the message with its own cutter (READ_ORDER; see "cutting"), then the other readers' readings of
  // the VSS and the BERT cut are made (crossReads, before VSS-BERT reads: it reuses them), then each one's gate and engine run: the gates
  // of VSS and SOP-BERT use the readings of the other two readers on their own cut (see GATES)
  const plan = [];
  for (const rd of READ_ORDER) {
    if (!live.includes(rd)) { rec.off[rd.id] = offText(rd); plan.push({ rd, line: { off: rec.off[rd.id] } }); continue; }
    const pend = rd.pending; rd.pending = null;
    if (rd.id === 'saved') { plan.push({ rd, ran: true, line: await savedPart(rd, rec) }); continue; }
    if (anyPick && !picks.get(rd) && rd.id !== OPUS.id) { plan.push({ rd, ran: true, line: { text: 'No question was open here; nothing to choose.' } }); continue; }   // the Claude Opus 5.5 tab answers by where the message came from
    const pk = picks.get(rd) ? { pend, pick: picks.get(rd) } : null;
    plan.push({ rd, ran: true, pk, pend, line: await readPart(rd, text, rec, pk) });
  }
  if (!anyPick && !rec.raw) await crossReads(rec, text);   // when VSS-BERT did not read (not loaded), for the gates of VSS and SOP-BERT
  const parts = [];
  for (const x of plan) {
    const p = x.line || await doPart(x.rd, text, rec, x.pk, x.pend);
    if (x.ran && !(x.rd.id === OPUS.id && x.line)) rec.ran.push(x.rd.id);   // the Claude Opus 5.5 tab: only when it played the message
    parts.push(Object.assign(p, { rd: x.rd }));
  }
  if (qwenLive) { rec.off.qwen = 'waiting for its turn (Qwen3 reads in its own queue)'; if (chatTabs.has('qwen')) parts.push({ rd: RD.qwen, text: 'Reading this; Qwen3 replies in a message of its own when it is done.' }); }
  else { rec.off.qwen = offText(RD.qwen); if (chatTabs.has('qwen')) parts.push({ rd: RD.qwen, off: rec.off.qwen }); }
  setStatus(idleStatus());
  parts.sort((a, b) => READERS.indexOf(a.rd) - READERS.indexOf(b.rd));   // the order of the tabs
  const shown = chatLines(parts);   // the chat shows the chosen tabs' lines (see CHAT_KEY); the details show every reader
  { const sv = parts.find(p => p.rd.id === OPUS.id), r = rec.readers[OPUS.id];
    if (sv && r && r.tr && r.tr.state === 'play' && r.tr.entry && (r.tr.entry.notes.unsupported || []).length) sv.sub = [sv.sub, `Not translated (SOP Lang cannot express it): ${r.tr.entry.notes.unsupported.join('; ')}.`].filter(Boolean).join(' ');
    if (sv && r) r.line = { text: sv.off || sv.text || '', sub: sv.sub || null, err: !!sv.err };
    if (cur.id === OPUS.id && sv && !shown.lines.includes(sv)) shown.lines.push(sv); }   // the Claude Opus 5.5 tab, while it is open, as Qwen3's
  botBubble({ lines: shown.lines, sub: shown.note, chips: [...new Set(shown.lines.flatMap(p => p.chips || []))], turn: id, tag: rec.button ? 'button' : rec.raw ? 'SOP Lang' : null, replace: wait });
  const mine = parts.find(p => p.rd === cur);
  if (mine && mine.highlight) flash(mine.highlight); else renderCanvas();
  fitHint();
  updateTabs(); renderSopBar();
  afterTurn(rec, parts, shown, meta, namesBefore);
  if (qwenLive) qwenJob(() => qwenRead(rec, text));
}
/** the words of a reader's line of the reply (its text, then the requests it did not do): read aloud and kept with the collected entry */
function replyWords(p) {
  if (!p) return '';
  const held = p.held && p.held.length ? [CL ? CL.heldHeader(p.held.length) : 'Not done:', ...p.held.map(h => h.view && h.view.src ? `“${h.view.src}”` : '')].filter(Boolean).join(' ') : '';
  return [p.off || p.text || '', held, p.sub || ''].filter(Boolean).join(' ').trim();
}
/** after a message: keep it in the collected requests, mark an undo right after the previous message, read the reply aloud (voice.js) */
function afterTurn(rec, parts, shown, meta, namesBefore) {
  try {
    const via = (meta && meta.via) || 'other';
    const vb = parts.find(p => p.rd.id === 'combined'), reply = replyWords(vb && !vb.off ? vb : shown.lines[0]);
    if (collector && !rec.raw && via !== 'start')
      collector.add(CollectKit.buildEntry(rec, { session: SESSION, names: namesBefore, source: Object.assign({ via }, meta || {}, { opusMap: undefined }), models: modelStamps, reply, tab: cur.id }));
    // an undo right after a message: the toolbar button, or an undo that VSS-BERT executed
    const vr = rec.readers.combined, undid = rec.raw ? (rec.button && /\baction=undo\b/.test(rec.sop) ? 'button' : null)
      : vr && (vr.nodes || []).some(n => n.type === 'command' && n.args && n.args.action === 'undo') ? 'message' : null;
    if (undid) collectEvent(rec.id - 1, { kind: 'undo-next', by: undid });
    if (voice && meta && meta.speak) voice.onReply(meta, reply).catch(e => console.error(e));
  } catch (e) { console.error(e); }
}
/** a question of the engine ("which Hub?") -> the reader's pending choice: the wire asked about, its dependents, the wires they refer to
 *  (with the values they had), so a reply with a name runs them again */
function pendingOf(er, nodes, result, overrides) {
  const e = er.error, keep = new Set([e.wire, ...er.dependents.map(n => n.id)]);
  const need = new Set(); const refsOf = v => K.isRef(v) ? [v.ref] : Array.isArray(v) ? v.flatMap(refsOf) : [];
  for (const n of nodes) if (keep.has(n.id)) Object.values(n.args).flatMap(refsOf).forEach(x => need.add(x));
  const ov = Object.assign({}, overrides); for (const st of result.steps) if (need.has(st.node.id) && !keep.has(st.node.id) && st.value !== undefined) ov[st.node.id] = st.value;
  return { nodes: nodes.filter(n => keep.has(n.id) || need.has(n.id)), wire: e.wire, candidates: e.candidates, overrides: ov };
}
/** "Do it anyway" (see GATES): the reading of one request the reader was not sure of, run now in that reader's world as one turn (undoable
 *  like any message). The wires of the message it refers to that ran earlier keep their values; a request that uses what another request
 *  that was not done would have made is not run (the reply says which to do first). */
async function doAnyway(rid, turn, idx) {
  const rec = history.find(x => x.id === turn), rd = RD[rid], r = rec && rec.readers[rid], h = r && r.gate && r.gate.units.find(u => u.index === idx);
  const key = `${rid}:${turn}:${idx}`, mark = () => markHeld(key, 'done anyway'), pend = (rd.held || []).find(p => p.turn === turn && p.index === idx);
  if (pend && pend.state === 'superseded') { markHeld(key, 'superseded'); return; }
  if (!h || h.doneAnyway) { mark(); return; }
  if (h.blocked) return;
  const env = r.env || (r.env = Object.assign({}, r.result ? r.result.env : {}));
  const own = new Set(h.nodes.map(n => n.id)), refsOf = v => K.isRef(v) ? [v.ref] : Array.isArray(v) ? v.flatMap(refsOf) : [];
  const need = [...new Set(h.nodes.flatMap(n => Object.values(n.args).flatMap(refsOf)).filter(x => !own.has(x)))];
  const missing = need.filter(x => !(x in env));
  if (missing.length) {
    const deps = r.gate.units.filter(u => u.nodes.some(n => missing.includes(n.id)));
    botBubble({ lines: [{ rd, text: `“${h.src}” uses what ${listing(deps.map(d => `“${d.src}”`))} would make; do ${deps.length > 1 ? 'those' : 'that'} first.`, err: true }], turn });
    return;
  }
  const overrides = Object.fromEntries(need.map(x => [x, env[x]]));
  const list = (r.allNodes || []).filter(n => need.includes(n.id)).concat(h.nodes);
  const result = rd.engine.run(list, { overrides });
  Object.assign(env, result.env); h.doneAnyway = true; (r.anyway || (r.anyway = [])).push({ index: idx, src: h.src, nodes: list, result });
  mark(); if (pend) pend.state = 'done anyway';
  collectEvent(turn, { kind: 'anyway', reader: rid, index: idx, src: h.src });
  supersedeHeld(rd, doneOf(result, list));
  const clarE = (result.errors || []).find(er => er.error instanceof K.Clarify);
  if (clarE) rd.pending = pendingOf(clarE, list, result, overrides);
  const problems = (result.errors || []).filter(er => !(er.error instanceof K.Clarify)).map(er => er.error.message);
  const done = result.steps.some(st => !st.error && !st.skipped && st.node.type !== 'mention' && !(st.node.id in overrides));
  const touched = [];
  result.steps.forEach(st => st.patches.forEach(p => { if (p.op === 'add') touched.push(p.shape.name); else if (p.op === 'set') touched.push(p.name); else if (p.op === 'rename') touched.push(p.to); }));
  const alive = [...new Set(touched)].filter(n => rd.world.find(n)); if (alive.length) rd.last = alive;
  // the reply spells out what it ran: the reading written as an explicit command (clarify.js), else the words of the request
  const ran = h.clar && h.clar.view && h.clar.view.anyway;
  const body = [done ? summarize(result) : '', clarE ? clarE.error.message.replace(/ Reply with a name\.$/, '') : '', problems.join(' ')].filter(Boolean).join(' ');
  const text = ran ? `Did it anyway: “${ran}” ${body || 'Nothing changed.'}` : `Did “${h.src}” anyway: ${body || 'nothing changed.'}`;
  botBubble({ lines: [{ rd, text, err: !done && !clarE }], chips: clarE ? clarE.error.candidates : [], turn, tag: 'Do it anyway' });
  if (rd === cur) { if (alive.length) flash({ shapes: alive, edges: [] }); else renderCanvas(); }
  updateTabs(); renderSopBar();
}
// The reply about the requests a reader did not do (owner, 2026-11-03: explicit and clear rather than fluent; training/sketch/CLARIFY_DESIGN.md
// design B, docs/js/clarify.js). No questions: per held request, at most 3 plain reasons and the request written as a clearer command (a
// ‹a or b?› placeholder where the two readers read different values, the name instead of "it", the two commands when they read different
// actions, "do the request it depends on first"), with the buttons Do it anyway and Edit (the clearer command into the message box, not sent).
// No numbers and no reader names in the chat: the confidence, the threshold and who read what are in the details. A held request stays held:
// nothing written later is merged into it and no later message is read as an answer to it (the learned readers cannot read a bare answer:
// CLARIFY_DESIGN.md part 2). It becomes "superseded" when a later executed request has the same action on the same shapes (clarify.js
// supersedes; its buttons are disabled, so it cannot run twice), or "done anyway" when its button is used. A message in which nothing is
// read while requests are held gets clarify.js nothingReadText. Every gated tab (VSS-BERT, VSS, SOP-BERT) replies the same way.
let CL = null;
const clP = import(new URL('js/clarify.js', document.baseURI).href).then(m => { CL = m; return m; }).catch(e => { console.error(e); return null; });
const lc = x => String(x).toLowerCase();
const mainOf = nodes => (nodes || []).filter(x => x.type !== 'mention');
const strNames = v => typeof v === 'string' ? v.split(',').map(x => x.trim()).filter(Boolean) : Array.isArray(v) ? v.flatMap(strNames) : [];
const refsIn = v => K.isRef(v) ? [v.ref] : Array.isArray(v) ? v.flatMap(refsIn) : [];
const NAME_ROLES = ['target', 'from', 'to', 'anchor'];
/** the name rule (CLARIFY_DESIGN.md 4.1; VSS_BERT_FAILURES.md fix 3; measured on the readings by training/sketch/combine/failures_vss_bert.mjs
 *  DEP=names, the same rule): while a create of the message is held, a request that names a shape which is not in the drawing and which no
 *  executed create of the message makes can only mean a shape that a held create would have made (the two readers do not always read the
 *  create's name the same), so it is held too, with the reason "it needs “<that create>” first"; a request that refers to the wires of a
 *  request held so is held as well (the gates' rule for references). Applied to every gate (VSS-BERT, VSS, SOP-BERT). g: a gate (see GATES),
 *  drawing: the names on the reader's canvas. -> g, changed in place */
function holdNamed(g, drawing) {
  if (!g || !g.units || !g.units.length) return g;
  const have = new Set((drawing || []).map(lc)), U = g.units, owner = new Map(), off = new Set();
  U.forEach(u => u.nodes.forEach(x => owner.set(x.id, u)));
  const creates = u => mainOf(u.nodes).filter(x => x.args && x.args.action === 'create');
  const makes = u => creates(u).flatMap(x => strNames(x.args.name)).map(lc);
  const named = u => mainOf(u.nodes).flatMap(x => NAME_ROLES.flatMap(k => strNames(x.args[k]))).map(lc);
  const words = t => lc(t).split(/[^\p{L}\p{N}_]+/u);
  for (let changed = true; changed;) {
    changed = false;
    const heldC = U.filter(u => !u.execute && creates(u).length);
    if (!heldC.length) break;
    const made = new Set(U.filter(u => u.execute).flatMap(makes));
    U.forEach((u, i) => {
      if (!u.execute) return;
      const own = makes(u), miss = named(u).filter(n => !have.has(n) && !made.has(n) && !own.includes(n));
      if (miss.length) {   // the create it needs: the one that names the shape, else the nearest one before it
        const need = heldC.find(c => makes(c).some(n => miss.includes(n)) || words(c.src).some(w => miss.includes(w))) || heldC.filter(c => U.indexOf(c) < i).pop() || heldC[0];
        u.execute = false; u.needs = [need]; u.reasons = [{ group: 'depends', text: `it needs “${need.src}” first` }]; off.add(u); changed = true; return;
      }
      const dep = mainOf(u.nodes).flatMap(x => Object.values(x.args).flatMap(refsIn)).map(id => owner.get(id)).find(o => o && o !== u && off.has(o));
      if (dep) { u.execute = false; u.reasons = [{ group: 'depends', text: `it uses what “${dep.src}” would have made, which was not done` }]; off.add(u); changed = true; }
    });
  }
  if (!off.size) return g;
  const drop = new Set([...off].flatMap(u => u.nodes));
  g.executed = g.executed.filter(n => !drop.has(n)); g.held = U.filter(u => !u.execute); g.byName = off.size;
  return g;
}
/** a reason of the reader's own confidence as the chat says it: no numbers (they stay in the details), no stage names */
function plainReason(x) {
  let t = String(x.text || '');
  const cut = t.match(/^the cut of this request was uncertain \((where it (?:starts|ends))\)/); if (cut) return `not sure ${cut[1]}`;
  if (x.group === 'world' && /world/.test(t)) return 'not sure what kind of request this is';
  t = t.replace(/\s*\([^()]*\d[^()]*\)/g, '').replace(/\ba (?=[aeiou])/g, 'an ');
  return /\d/.test(t.replace(/‘[^’]*’|“[^”]*”/g, '')) ? null : t;
}
const actOfPa = pa => { const [type, act] = String(pa || '').split(':'); return act || type || null; };
/** the input of clarify.js heldReply for one held request of a gate (CLARIFY_DESIGN.md 4.6): the executing reading and the other learned
 *  reader's reading of the same request (VSS-BERT: its pair; the VSS and SOP-BERT tabs: the votes' pairing), the values they read differently,
 *  the other action when the other reader read another action here, what the executing reader itself was unsure of (the context fill as
 *  the word and the name it was filled with), and the held requests of the message it needs */
function clarifyInput(r, u) {
  const g = r.gate, names = r.names || [], all = r.allNodes || r.nodes, main = mainOf(u.nodes)[0];
  const nm = v => names.find(x => lc(x) === lc(v)) || v;
  const input = { src: u.src || '', type: main ? main.type : 'command', reading: null, other: null, otherAct: null, differ: [], signals: [], dependsOn: [] };
  const diffOf = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => k !== 'action' && k !== 'ask' && (a[k] ?? '∅') !== (b[k] ?? '∅')).map(k => ({ key: k, sop: a[k] ?? '∅', vss: b[k] ?? '∅' }));
  const otherAct = (text, list, me) => vtNow && list ? vtNow.otherAct(text, list, me) : null;
  let mine = null, partner = null, over = null;
  if (r.combined && u.item) {
    const it = u.item, M = r.combined.msg; mine = it.req; input.reading = mine.got;
    if (it.from === 'sop' && it.partner >= 0) { partner = M.vss[it.partner]; input.differ = it.agree ? [] : (it.differ || []); }
    else over = otherAct(M.text, it.from === 'sop' ? M.vss : M.sop, mine);
  } else if (g.pairing && u.items && u.items.length) {
    const P = g.pairing, it = u.items[0], k = it[P.partner]; mine = P.self[it.j]; input.reading = mine.got;
    if (k >= 0) { partner = P.other[k]; input.differ = it[P.agree] ? [] : diffOf(mine.got, partner.got); }
    else over = otherAct(P.text, P.other, mine);
  } else {   // no second reading to compare with (the other learned reader did not read this message): not "only one reader found it"
    input.reading = main ? BenchCanon.canon(main, all) : null; input.other = input.reading;
    if (g.fallback) input.signals.push({ group: 'alone', text: 'the second reader has not read this message, so this reading could not be checked against another' });
  }
  if (partner) input.other = partner.got;
  if (over) { input.other = over.got; input.otherAct = actOfPa(over.pa); }
  // the context fill of the executing reading: the word ("it") and the name it was taken to mean
  const gapsOf = x => (x && x.node && x.node.unit && x.node.unit.gaps) || [];
  // (SOP-BERT without a pairing: its signals of this request, neural-confidence.js signals)
  let sig = mine ? mine.sig : null;
  if (!mine && r.neural && ncNow && u.unit && r.neural.analyses && r.neural.analyses.includes(u.unit)) try { sig = ncNow.signals(r.neural, r.neural.analyses.indexOf(u.unit)); } catch (e) { console.error(e); }
  const fills = sig ? ((sig.detail && sig.detail.ctx) || []).map(c => ({ key: c.key, word: ((gapsOf(partner).find(gp => gp.decision === 'fill' && gp.key === c.key) || {}).word) }))
    : (mine ? gapsOf(mine) : main && main.unit && main.unit.gaps ? main.unit.gaps : []).filter(gp => gp.decision === 'fill').map(gp => ({ key: gp.key, word: gp.word }));
  for (const f of fills) {
    const v = input.reading && input.reading[f.key]; if (!v || /^mention\(|\$/.test(String(v))) continue;
    const filled = listing(strNames(v).map(nm)), word = f.word ? String(f.word).replace(/^@/, '') : null;
    input.signals.push(word ? { group: 'context', key: f.key, word, filled } : { group: 'context', key: f.key, text: `${filled} was taken from the conversation; the name was not written` });
  }
  // what the executing reader itself was unsure of (its own sentences; the sentences about the two readers are clarify.js's own)
  const own = u.ownReasons || (u.reasons || []).filter(x => x.own != null).map(x => ({ group: x.group, text: x.own }));
  const ownList = own.length ? own : !r.combined && !g.pairing ? (u.reasons || []).filter(x => x.group) : [];
  for (const x of ownList) {
    if (x.group === 'depends' || ((x.group === 'context' || x.group === 'fill') && fills.length)) continue;
    const t = plainReason(x); if (t) input.signals.push({ group: x.group, text: t });
  }
  // the held requests it needs: a held create whose shape it names (holdNamed), or a held request whose wires it refers to
  const owner = new Map(g.units.flatMap(x => x.nodes.map(n => [n.id, x]))), deps = new Set(u.needs || []);
  for (const n of mainOf(u.nodes)) for (const id of Object.values(n.args).flatMap(refsIn)) { const o = owner.get(id); if (o && o !== u && !o.execute) deps.add(o); }
  input.dependsOn = [...deps].map(d => d.src);
  return input;
}
/** the names clarify.js writes a command with: the drawing's names as written, and the names the message's creates make ("$new") */
const clarifyOpts = r => ({ names: r.names || [], created: r.gate ? r.gate.units.flatMap(u => mainOf(u.nodes).filter(x => x.args && x.args.action === 'create').flatMap(x => strNames(x.args.name))) : [] });
/** the held requests of a reader's reply (see above): the line above them, then per request its words, reasons, clearer command and buttons */
function heldHTML(held) {
  const head = CL ? CL.heldHeader(held.length) : 'Not done, because I am not sure what you meant:';
  return `<div class="hhead">${escH(head)}</div><ul class="held">${held.map(h => { const v = h.view, key = escH(`${h.reader}:${h.turn}:${h.index}`);
    return `<li data-held="${key}"><span class="src">“${escH(v.src || '')}”</span><div class="why">${v.reasons.map(x => `<div class="r">${escH(x)}</div>`).join('')}</div>`
      + (v.line ? `<div class="how">${escH(v.line)}</div>` : '') + (v.runs ? `<div class="runs">${escH(v.runs)}</div>` : '')
      + `<div class="acts">${v.canAnyway ? `<button type="button" class="anyway" data-anyway="${key}" title="${escH(v.anyway ? `Run “${v.anyway}” now (undo takes it back)` : 'Run exactly this reading now (undo takes it back)')}">Do it anyway</button>` : ''}`
      + `${v.edit ? `<button type="button" class="edit" data-edit="${key}" data-text="${escH(v.edit)}" title="Put the clearer command in the message box, to complete or correct it before you send it">Edit</button>` : ''}<span class="state"></span></div></li>`; }).join('')}</ul>`;
}
/** a held request changed state: its buttons are disabled and a short note says why ("superseded" | "done anyway") */
function markHeld(key, state) {
  document.querySelectorAll(`[data-held="${key}"]`).forEach(li => {
    li.classList.add(state === 'superseded' ? 'superseded' : 'doneanyway');
    li.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const a = li.querySelector('button.anyway'); if (a && state !== 'superseded') a.textContent = 'Done anyway';
    const st = li.querySelector('.state'); if (st) st.textContent = state === 'superseded' ? 'replaced by your later command' : '';
  });
}
/** the held requests of earlier messages after this reader executed `done` (canonical readings): the ones the same action on the same shapes
 *  replaces become "superseded" (clarify.js updatePending) */
function supersedeHeld(rd, done) {
  if (!CL || !rd.held || !rd.held.length || !done.length) return;
  const before = rd.held; rd.held = CL.updatePending(before, done);
  rd.held.forEach((p, i) => { if (p.state === before[i].state) return;
    const x = history.find(t => t.id === p.turn), u = x && x.readers[rd.id] && x.readers[rd.id].gate && x.readers[rd.id].gate.units.find(y => y.index === p.index);
    if (u) u.superseded = true; markHeld(`${rd.id}:${p.turn}:${p.index}`, p.state);
    if (p.state === 'superseded') collectEvent(p.turn, { kind: 'superseded', reader: rd.id, index: p.index, by: turnSeq }); });
}
/** the canonical readings of the wires a run executed (no error, not skipped) */
const doneOf = (result, nodes) => result ? result.steps.filter(st => st.node.type !== 'mention' && !st.error && !st.skipped).map(st => { try { return BenchCanon.canon(st.node, nodes); } catch (e) { return null; } }).filter(Boolean) : [];
/** after a reader's part of a message: its executed readings supersede the held requests of earlier messages, and its own held requests
 *  are added to its list (rd.held: [{turn, index, reading, input, opts, state}]) */
function trackHeld(rd, rec, r) {
  if (!r || !CL) return;
  supersedeHeld(rd, doneOf(r.result, r.allNodes || r.nodes));
  if (r.gate) for (const h of r.gate.held) if (h.clar) (rd.held || (rd.held = [])).push({ turn: rec.id, index: h.index, reading: h.clar.input.reading, input: h.clar.input, opts: h.clar.opts, state: 'held' });
}
// Destructive requests: cautious by design (owner's session 2026-11-03, training/sketch/collected/SESSION_1_ANALYSIS.md: at "execute all" a
// delete of "the background boxes" removed Process with its links, and a delete of a quoted title forgot the rules twice; the one request
// the default level let through was the confident delete of four shapes). logic.js holdDestructive: (a) delete, disconnect, forget, clear and
// an ungroup that removes a group execute only at or above the tab's DEFAULT safety threshold (gate.safe), whatever level is chosen,
// "execute all" included; (b) such a request whose target is a description that would remove more than one item is held in every tab, the
// Rules too, and the reply lists the items; (c) every held destructive request says exactly what Do it anyway would remove.
/** the policy on one reader's part of a message: its gate (a learned reader) or, for the Rules, a gate made only when the policy holds
 *  something (one unit per command with the descriptions it uses; the Rules have no confidence, so only rule (b) applies) */
function holdDestructiveIn(rd, r, text) {
  if (!K.holdDestructive || r.error) return;
  let g = r.gate;
  if (!g) {
    if (rd.id !== 'rules' || !r.nodes.some(n => n.type === 'command' && K.DESTRUCTIVE.includes(n.args && n.args.action))) return;
    const main = r.nodes.filter(n => n.type !== 'mention'), segs = (r.rulesRes && r.rulesRes.segments) || [];
    const units = main.map((n, index) => { const own = new Set(refsIn(Object.values(n.args)));
      const seg = segs.find(x => x.id === n.id);
      return { index, src: main.length === 1 ? text.trim() : (seg && seg.src) || n.src || K.serialize(n), conf: NaN, execute: true, reasons: [], dependsOn: [], nodes: r.nodes.filter(m => m === n || (m.type === 'mention' && own.has(m.id))) }; });
    g = { level: 'rules', effective: 'rules', label: 'no confidence (the Rules execute what they read; a request that would remove several described items asks first)', threshold: -Infinity, units, executed: r.nodes.slice(), held: [] };
    if (!K.holdDestructive(rd.engine, units, { gated: false, overrides: r.overrides })) { units.forEach(u => { if (u.destructive) delete u.destructive; }); return; }
    r.gate = g; r.allNodes = r.nodes;
  } else K.holdDestructive(rd.engine, g.units, { safe: g.safe, overrides: r.overrides });
  const run = new Set(g.units.filter(u => u.execute).flatMap(u => u.nodes)), unitOf = new Set(g.units.flatMap(u => u.nodes));
  g.executed = (r.allNodes || r.nodes).filter(n => run.has(n) || (!unitOf.has(n) && g.executed.includes(n)));
  g.held = g.units.filter(u => !u.execute); r.nodes = g.executed;
}
/** the chat's block of a held destructive request: the policy's reason first, the items when it listed them ("Delete Start and Done? Write
 *  their names, or press Do it anyway."), and exactly what Do it anyway would remove (also when it was held for another reason) */
function destructiveView(view, h) {
  const d = h.destructive, own = (h.reasons || []).filter(x => x.group === 'destructive').map(x => x.text);
  view.reasons = [...new Set(own.concat(view.reasons || []))].slice(0, 3);
  if (d.described && d.count > 1) view.line = `${d.question} Write their names, or press Do it anyway.`;
  view.runs = `Do it anyway would ${d.verb === 'delete' ? 'delete' : d.verb === 'forget' ? 'forget' : 'remove'} ${d.removes}.`;
  if (d.action === 'delete' && d.shapes.length) view.edit = `delete ${d.shapes.join(', ')}`;
  view.canAnyway = view.canAnyway !== false;
}
/** Saved occurrences execute in the main queue, independently of other readers' clarification and confidence gates. */
async function savedPart(rd, rec) {
  let r;
  try {
    if (rec.raw && !rec.savedSource) {
      saved.invalidate('direct SOP input');
      r = { nodes: K.parse(rec.sop), notes: ['Direct SOP input; this was not generated by gpt-6.1-sol.'], saved: { status: 'direct-input', reason: 'Direct SOP input' } };
      r.result = rd.engine.run(r.nodes);
    } else {
      await savedLoad;
      const src = rec.savedSource;
      r = await saved.execute(src, src ? src.original : rec.typed, rec.typed);
    }
  } catch (e) { saved.invalidate(); r = { nodes: [], notes: [], unavailable: true, saved: { status: 'unavailable', reason: e.message } }; }
  rec.readers.saved = r; rd.reads++; rd.lastRead = { turn: rec.id, nodes: r.nodes };
  if (r.unavailable) return { text: `Saved translation unavailable: ${r.saved.reason}`, err: true };
  if (r.saved.status === 'unsupported') return { text: `Unsupported saved input: ${r.saved.reason}`, err: true };
  if (r.saved.status === 'noop') return { text: `No executable request: ${r.saved.reason}` };
  return { text: [r.result ? summarize(r.result) : 'Nothing changed.', r.saved.status === 'partial' ? `Partial translation: ${r.saved.reason}` : ''].filter(Boolean).join(' '), err: !!r.result && !r.result.ok };
}
/** one reader reads (formalizes) one message, nothing is executed yet: fills rec.readers[rd.id]; returns null, or the reply's line when it failed */
async function readPart(rd, text, rec, pk) {
  const r = { nodes: [], notes: [], overrides: {} }; rec.readers[rd.id] = r;
  const ctx = { names: rd.world.state.shapes.map(s => s.name).concat((rd.world.state.groups || []).map(g => g.name)), last: rd.last,   // group names are names too (VSS reads a name only if it is listed)
    texts: rd.world.state.shapes.filter(s => s.label != null && String(s.label).trim() !== '').map(s => String(s.label)) };   // the texts the items show: the Rules read "delete Order flow" as the item showing it (logic.js textRefsOut)
  r.names = ctx.names; r.ctx = ctx;
  // the time is the formalizing only (text -> SOP wires), not the engine or the drawing; VSS and Neural are loaded before they read
  const t0 = performance.now();
  try {
    if (pk) { r.nodes = pk.pend.nodes; r.overrides = Object.assign({}, pk.pend.overrides, { [pk.pend.wire]: [pk.pick] }); }
    else if (rec.raw) { r.nodes = K.parse(rec.sop);   // SOP: nothing to formalize, no time
      if (rd.id === OPUS.id && rec.example) { const note = M => { const L = SS.lookup(M, rec.example), d = L.state === 'play' && L.entry.status === 'direct';
          r.tr = { state: d ? 'direct' : 'sop', reason: d ? null : `it ran as SOP Lang, as in every tab; ${L.reason || 'its saved entry is not marked as SOP Lang'}`, entry: L.entry, prov: rec.example, nodes: [], renamed: [], notes: [] }; };
        if (trM && SS) note(trM); else trManifest().then(note).catch(e => console.error(e)); } }
    else if (rd.id === 'rules') { const f = rd.formalize(text, ctx); r.ms = performance.now() - t0; r.rulesRes = f; r.nodes = f.nodes; r.notes = f.notes; }
    else if (rd.id === 'vss') { const v = await window.VSSFormalizer.formalize(text, ctx, rd.formalize, VSS_OPTS); r.ms = performance.now() - t0; r.vss = v; r.nodes = v.nodes; r.notes = v.notes; }
    else if (rd.id === 'combined') { const c = await combinedRead(rd, text, rec, ctx); r.ms = c.ms; r.combined = c; r.nodes = c.nodes; r.notes = c.notes; }
    else if (rd.id === 'qwen') { if (!qwen) throw new Error('Qwen3 is not loaded'); const q = await qwen.formalize(text, ctx); r.ms = performance.now() - t0; r.qwen = q; r.nodes = q.nodes; r.notes = q.notes; }
    else if (rd.id === OPUS.id) {   // the saved translation of a built-in example (see "Saved translations of Claude Opus 5.5"); nothing is read
      const sv = await trRead(rec); r.ms = performance.now() - t0; r.tr = sv; r.nodes = sv.nodes; r.notes = sv.notes; if (sv.state === 'play') trLast = { turn: rec.id, saved: sv };
      if (sv.state !== 'play') { trCount[sv.state === 'noop' || sv.state === 'unsupported' ? sv.state : 'unavailable']++; r.line = trLine(sv, r.ms); return r.line; }
      trCount.played++;
    }
    else if (rd.id === 'neural' || rd.id === 'modernbert') { const n = await (rd.id === 'modernbert' ? modernbert : neural).formalize(text, ctx, { signals: true }); r.ms = performance.now() - t0; r.neural = n; r.nodes = n.nodes; r.notes = n.notes.filter(x => !/couldn't find an action/.test(x)); }
    else throw new Error(`no reader is defined for the tab ${rd.id}`);
    if (!pk && !rec.raw) r.cutBy = cutOfRead(rd, r);   // each tab's own cutter (see "cutting")
  } catch (e) { r.error = e; r.ms = performance.now() - t0; return { text: `The ${rd.label} reader failed: ${e.message}`, err: true, ms: r.ms }; }
  return null;
}
/** the reader's gate and engine on what it read (readPart); returns its line of the reply ({text, sub, err, chips, ms, highlight, held}).
 *  pend: the engine's question that was open before this message (null: none) */
async function doPart(rd, text, rec, pk, pend) {
  const line = await doPart0(rd, text, rec, pk, pend);
  trackHeld(rd, rec, rec.readers[rd.id]);
  return line;
}
async function doPart0(rd, text, rec, pk, pend) {
  const r = rec.readers[rd.id], overrides = r.overrides;
  const CLm = await clP;
  try {
    // the gate (see GATES): the requests this reader is not sure of are not executed; the reply lists them with Do it anyway and Edit;
    // then the name rule (holdNamed)
    const gf = !pk && !rec.raw ? GATES[rd.id] : null, gsrc = rd.id === 'vss' ? r.vss : rd.id === 'combined' ? r.combined : rd.id === 'qwen' ? r.qwen : r.neural;
    if (gf && gsrc) { const g = await gf(gsrc, rec, r); if (g) { holdNamed(g, r.names); r.gate = g; r.allNodes = r.nodes; r.nodes = g.executed; } }
    if (rd.id === 'qwen' && !pk && !rec.raw && !r.gate) throw new Error('its gate is not available, so nothing it read was executed');
    if (!pk && !rec.raw) holdDestructiveIn(rd, r, text);   // destructive requests: cautious by design (logic.js holdDestructive)
  } catch (e) { r.error = e; return { text: `The ${rd.label} reader failed: ${e.message}`, err: true, ms: r.ms }; }
  const ms = r.ms, nodes = r.nodes, notes = r.notes, world = rd.world, engine = rd.engine;
  rd.reads++; rd.lastRead = { turn: rec.id, nodes };
  // the parts no reading took: the Rules reader's "couldn't find an action in …" and the VSS reader's "Ignored (not understood): “…”, “…”"
  const unread = notes.filter(n => /couldn't find an action/.test(n)).map(n => (n.match(/in "(.*)"\.?$/) || [])[1]).filter(Boolean)
    .concat(notes.filter(n => /^Ignored \(not understood\):/.test(n)).flatMap(n => [...n.matchAll(/“([^”]*)”/g)].map(m => m[1])).filter(u => u.trim().split(/\s+/).length > 1));   // a one-word unit ("and") stays in the details only
  if (r.neural && r.neural.unread) unread.push(...r.neural.unread);
  const unreadWords = u => r.neural?.unread?.includes(u) ? `I did not read “${u}”: the message exceeds the token limit. Send that part as a separate message.` : `I didn’t understand “${u}”.`;
  // the requests not executed, as the chat says them (clarify.js; see heldHTML); the numbers stay in the details (gateHTML)
  const opts = clarifyOpts(r);
  const held = r.gate ? r.gate.held.map(h => {
    const input = clarifyInput(r, h), view = CLm ? CLm.heldView(input, opts) : { src: h.src, reasons: h.reasons.map(x => x.text), line: null, runs: null, anyway: null, canAnyway: true, edit: null };
    if (h.blocked) { view.canAnyway = false; view.reasons = h.reasons.map(x => x.text); }
    if (h.destructive) destructiveView(view, h);
    h.clar = { input, opts, view };
    return { reader: rd.id, turn: rec.id, index: h.index, view };
  }) : [];
  // the reply's line: what was done; the requests not executed are rendered under it (botBubble, heldHTML)
  const withHeld = o => held.length ? Object.assign(o, { held, text: o.text && o.text !== 'Done.' ? o.text : '' }) : o;
  if (!nodes.length && held.length) {
    const sub = unread.length ? unread.map(unreadWords).join(' ') : null;
    return withHeld({ text: '', sub, ms });
  }
  if (!nodes.length) {
    if (rd.id === 'modernbert' && r.neural?.unread?.length) return { text: unread.map(unreadWords).join(' '), ms };
    r.error = new K.SOPError('No wires.');
    // the engine's question stays open when nothing was read (CLARIFY_DESIGN.md 4.5): a name still answers it
    const ask = pend && !pk ? ` Write one of the names to answer the question: ${listing(pend.candidates)}.` : '';
    if (pend && !pk) rd.pending = pend;
    // nothing read while requests of earlier messages are held: say so, without pretending the message answered them (no word list decides
    // this: it is the case "nothing was read" + "something is held")
    const open = (rd.held || []).filter(p => p.state === 'held');
    if (open.length && CLm) return { text: CLm.nothingReadText(open.map(p => p.input), open[open.length - 1].opts) + ask, ms };
    return { text: (unread.length ? 'I didn’t get what to do there. Try something like “draw a red circle next to Start” or “what is connected to Start?”.' : 'I couldn’t turn that into anything I can do.') + ask, err: !ask, ms };
  }
  const result = engine.run(nodes, { overrides }); r.result = result;
  // do what was understood; ask about the rest (a question never blocks the other wires of the message)
  const asks = [], problems = [];
  let clar = null;
  for (const er of result.errors || []) {
    const e = er.error;
    // (the Claude Opus 5.5 tab takes no reply: it never keeps the question open)
    if (e instanceof K.Clarify && !clar) { clar = e; if (rd.id !== OPUS.id) rd.pending = pendingOf(er, nodes, result, overrides); } else if (!(e instanceof K.Clarify)) problems.push(e.message + (er.dependents.length ? ` (so I also skipped ${er.dependents.length} step${er.dependents.length > 1 ? 's' : ''} that needed it)` : ''));
  }
  for (const u of unread) asks.push(unreadWords(u) + (r.neural?.unread?.includes(u) ? '' : ' Could you say it another way?'));
  const anyDone = result.steps.some(st => !st.error && !st.skipped && st.node.type !== 'mention');
  if (!anyDone && !clar && !problems.length && !asks.length) return withHeld({ text: 'Done.', ms });
  const highlight = { shapes: [], edges: [] }, touched = [];
  result.steps.forEach(s => {
    s.patches.forEach(p => { if (p.op === 'add') touched.push(p.shape.name); else if (p.op === 'set') touched.push(p.name); else if (p.op === 'rename') touched.push(p.to); });
    if (s.highlight) { highlight.shapes.push(...(s.highlight.shapes || [])); highlight.edges.push(...(s.highlight.edges || [])); }
  });
  const alive = [...new Set(touched)].filter(n => world.find(n));
  if (alive.length) rd.last = alive; else if (highlight.shapes.length) rd.last = [...new Set(highlight.shapes)].filter(n => world.find(n));
  if (!highlight.shapes.length) highlight.shapes = alive;
  { const f = world.find(highlight.shapes[0] || alive[0]); if (f) rd.focusCell = K.cellOf(f.x, f.y); }
  const odd = notes.filter(n => /is not a shape I know|couldn't tell|^I read /.test(n));
  const did = anyDone ? summarize(result) : '';
  const tail = problems.concat(asks).join(' ');
  const examples = [...new Set(result.steps.flatMap(st => st.examples || []))];   // a help answer's example sentences: buttons that send them
  if (clar && rd.id === OPUS.id) return { text: (did && did !== 'Done.' ? did + ' ' : '') + clar.message.replace(/ Reply with a name\.$/, '') + ' The saved program cannot choose, and this tab takes no reply: that step was not done.', sub: [tail, odd.join(' ')].filter(Boolean).join(' ') || null, err: !did, ms, highlight };
  if (clar) return withHeld({ text: (did && did !== 'Done.' ? did + ' ' : '') + clar.message.replace(/ Reply with a name\.$/, ''), sub: [tail, odd.join(' ')].filter(Boolean).join(' ') || null, chips: clar.candidates, ms, highlight });
  if (problems.length && !anyDone) return withHeld({ text: problems.join(' '), sub: [asks.join(' '), odd.join(' ')].filter(Boolean).join(' ') || null, err: true, ms, highlight });
  return withHeld({ text: did || 'Done.', sub: [tail, odd.join(' ')].filter(Boolean).join(' ') || null, ms, highlight, chips: examples.length ? examples : undefined });
}

/* ---------------- technical history ---------------- */
/** the cuts of a message in its details: each tab read its own cutter's requests; the requests of the VSS and the BERT cut, and who else
 *  read them for the votes (crossReads) */
function crossHTML(r) {
  const X = r.cross; if (!X || (!X.vss && !X.bert)) return '';
  const n = k => `${k} request${k === 1 ? '' : 's'}`, list = us => `<ul class="units">${us.map(u => `<li><span class="src">“${escH(u.src != null ? u.src : r.text.slice(u.c0, u.c1))}”</span></li>`).join('')}</ul>`;
  const who = (C, a) => [C[a.k] ? a.label : null, C.rules ? 'the Rules' : null].filter(Boolean);
  let h = `<div class="note">Each tab read the requests of its own cutter: Rules the ${escH(cutLabel('rules'))}, VSS the ${escH(cutLabel('vss'))}, SOP-BERT and VSS-BERT the ${escH(cutLabel('bert'))}. For the votes, the other readers read the same requests as the tab they vote for (the cut its confidence was fitted on):</div>`;
  if (X.vss && X.vss.units) { const w = who(X.vss, { k: 'sop', label: 'SOP-BERT' }); h += `<div class="note">${escH(cutLabel('vss'))}, ${n(X.vss.units.length)}${w.length ? `, also read by ${escH(listing(w))} for VSS’s votes` : ''} (${fmtMs(X.vss.ms)})${X.vss.why ? `; ${escH(X.vss.why)}` : ''}:</div>${list(X.vss.units)}`; }
  if (X.bert && X.bert.units) { const w = who(X.bert, { k: 'vss', label: 'VSS' }); h += `<div class="note">${escH(cutLabel('bert'))}, ${n(X.bert.units.length)}${w.length ? `, also read by ${escH(listing(w))} for SOP-BERT’s votes${X.bert.vss ? ' and VSS-BERT' : ''}` : ''} (${fmtMs(X.bert.ms)})${X.bert.why ? `; ${escH(X.bert.why)}` : ''}:</div>${list(X.bert.units)}`; }
  return h;
}
function turnHTML(r) {
  if (r.error) return `<pre class="sop"><span class="cm"># typed as SOP Lang</span>\n${escH(r.sop)}</pre><div class="errt">${escH(r.error.message)}</div>`;
  return READERS.map(rd => {
    const x = r.readers[rd.id];
    if (!x) return `<section class="rdsec"><div class="minihead">${escH(rd.label)} <span>${escH(r.off[rd.id] || 'did not read this')}</span></div></section>`;
    const preExisting = x.saved?.provenance?.kind === 'pre-existing-sop' || (r.raw && r.savedSource);
    const source = preExisting ? 'pre-existing SOP example' : r.button ? 'toolbar button, sent as SOP Lang' : 'direct SOP input';
    const reading = rd.id === OPUS.id && x.tr && !r.raw ? 'saved translation, nothing read' : x.saved ? x.saved.status === 'direct-input' ? 'direct SOP input, not generated' : preExisting ? 'saved playback · pre-existing SOP example · no live inference' : 'saved example playback · no live inference'
      : x.ms != null ? 'formalized in ' + fmtMs(x.ms) : r.raw ? preExisting ? 'pre-existing SOP example, nothing to formalize' : 'SOP Lang, nothing to formalize' : 'your choice from the question';
    let h = `<div class="minihead">${escH(rd.label)} <span>${reading}${x.neural ? ` · ${x.neural.calls} model calls` : x.qwen ? ' · 1 model call' : ''}${x.cutBy ? ` · cut by: ${escH(cutLabel(x.cutBy))}` : ''}</span></div>`;
    if (x.nodes && x.nodes.length) h += `<pre class="sop">${r.raw ? `<span class="cm"># ${source}</span>\n` : ''}${x.nodes.map(hlNode).join('\n')}</pre>`;
    (x.notes || []).forEach(n => { h += `<div class="note">${escH(n)}</div>`; });
    if (x.gate) h += gateHTML(x, rd);
    if (x.vss) h += vssHTML(x.vss);
    if (x.neural) h += neuralHTML(x.neural);
    if (x.combined) h += combinedHTML(x.combined);
    if (x.qwen) { try { h += qwenHTML(x.qwen.qwen); } catch (e) { console.error(e); h += `<div class="errt">Qwen3’s evidence could not be shown: ${escH(e.message)}</div>`; } }   // x.qwen: the reading; .qwen: its evidence
    if (rd.id === OPUS.id && x.tr) h += trHTML(x.tr, r);
    if (x.saved) h += `<div class="note">Saved translation: ${escH(x.saved.status)}${x.saved.reason ? ' · ' + escH(x.saved.reason) : ''}</div><pre class="sop">${escH(JSON.stringify(x.saved, null, 2))}</pre>`;
    if (x.result) h += x.result.steps.map(stepHTML).join('');
    for (const a of x.anyway || []) h += `<div class="note">Done anyway: “${escH(a.src)}”</div><pre class="sop">${a.nodes.map(hlNode).join('\n')}</pre>` + a.result.steps.map(stepHTML).join('');
    const err = x.error && x.error.message !== 'No wires.' ? x.error : x.result && !x.result.ok ? x.result.error : null;
    if (err) h += `<div class="errt">${escH(err.message)}</div>`;
    if ((!x.nodes || !x.nodes.length) && !(rd.id === OPUS.id && x.tr)) h += '<div class="note">No wires were produced.</div>';
    return `<section class="rdsec">${h}</section>`;
  }).join('');
}
const ranLabel = r => (r.button ? 'button · ' : r.raw ? 'SOP Lang · ' : '') + (r.ran.length ? r.ran.map(id => RD[id].label).join(' · ') : 'none');
/** the details of one message: what each reader wrote (SOP wires), how long that took, and what it did to that reader's drawing */
function renderTurn(id) {
  const r = history.find(x => x.id === id);
  if (!r) return '<p class="intro">This message is no longer here.</p>';
  const sp = r.spell, fixes = sp && sp.fixes.length ? sp.fixes.map(f => `${f.from} → ${f.to} (similarity ${f.sim.toFixed(2)}, next ${f.second.toFixed(2)})`).join(', ') : '';
  const spell = fixes ? `<div class="note">Spelling, in ${fmtMs(sp.ms)}: ${escH(fixes)}. Every reader read the corrected text:</div><div class="q">${escH(r.text)}</div>`
    : sp ? `<div class="note">Spelling: nothing corrected (${fmtMs(sp.ms)}).</div>` : r.spellOff ? '<div class="note">Spelling check was off (⋮ › Settings).</div>' : '';
  const cut = crossHTML(r);
  return `<div class="msghead"><div class="q">${escH(r.typed || r.text)}</div>${spell}${cut}<div class="note">${escH(r.time)} · read by ${escH(ranLabel(r))}</div></div>
  <p class="intro">What each reader wrote for this message in SOP Lang and how long writing it took, the plugin that ran each wire and the changes it made to that reader’s drawing, the requests each VSS world read and the neural model’s evidence.</p>${turnHTML(r)}`;
}

/* ---------------- SOP highlighting ---------------- */
function hlValue(raw) {
  return K.fmtValue(raw).split(/(,)/).map(part => {
    if (part === ',') return '<span class="cm">,</span>';
    if (part.startsWith('$')) return `<span class="rf">${escH(part)}</span>`;
    if (part.startsWith('"')) return `<span class="str">${escH(part)}</span>`;
    return `<span class="v">${escH(part)}</span>`;
  }).join('');
}
function hlNode(n) {
  const line = K.serialize(n); const head = `<span class="wid">@${escH(n.id)}</span> <span class="wt">${escH(n.type)}</span>`;
  const order = (line.match(/ ([A-Za-z_]\w*)=/g) || []).map(t => t.trim().slice(0, -1)), keys = Object.keys(n.args).filter(k => n.args[k] != null && !(Array.isArray(n.args[k]) && !n.args[k].length)).sort((a, b) => order.indexOf(a) - order.indexOf(b));   // a quoted value may hold spaces ("Order flow")
  const body = keys.map(k => { const q = engine.legend.get(k); return ` <span class="k"${q && q.ask ? ` title="${escH(q.ask)}"` : ''}>${escH(k)}</span><span class="cm">=</span>${hlValue(n.args[k])}`; }).join('');
  return `<span class="${n.type === 'mention' ? 'ln-mention' : ''}">${head}${body}</span>`;
}

/* ---------------- conversation ---------------- */
function patchLine(p) {
  const sz = v => K.sizeName(v);
  switch (p.op) {
    case 'add': return ['add', '+', `${p.shape.name}  ${sz(p.shape.size)} ${p.shape.color} ${p.shape.shape}${p.shape.label ? ` "${p.shape.label}"` : ''}`];
    case 'remove': return ['del', '−', p.name];
    case 'set': { const pr = p.props, parts = []; if ('x' in pr) parts.push(`moved to (${pr.x}, ${pr.y})`); for (const [k, v] of Object.entries(pr)) { if (k === 'x' || k === 'y') continue; parts.push(k === 'size' ? `size ${sz(v)}` : `${k} ${v == null ? 'none' : v}`); } return ['chg', '~', `${p.name}  ${parts.join(', ')}`]; }
    case 'rename': return ['chg', '~', `${p.from} is now ${p.to}`];
    case 'link': return ['add', '+', K.edgeText(p.edge)];
    case 'unlink': return ['del', '−', p.edge ? K.edgeText(p.edge) : p.id];
    case 'edgeSet': return ['chg', '~', p.edge ? `${K.edgeText(p.edge)}${'label' in p.props && p.props.label == null ? '  label removed' : ''}` : p.id];
    case 'rule': return ['add', '+', `rule ${p.rule.id}`];
    case 'forget': return ['del', '−', 'all rules'];
  }
  return ['chg', '?', p.op];
}
function stepHTML(st) {
  const bits = [];
  if (st.patches.length) bits.push(`<ul class="fx">${st.patches.map(p => { const [c, o, t] = patchLine(p); return `<li><span class="op ${c}">${o}</span>${escH(t)}</li>`; }).join('')}</ul>`);
  if (st.answer) bits.push(`<div class="answer">${escH(st.answer)}</div>`);
  if (st.notes && st.notes.length) bits.push(`<div class="note">${escH(st.notes.join('; '))}</div>`);
  (st.issues || []).filter(i => i.level === 'warn').forEach(i => bits.push(`<div class="note">${escH(i.msg)}</div>`));
  if (st.lowering) bits.push(`<details class="lower"><summary>Lowered to Datalog and evaluated</summary><pre>${escH(st.lowering)}</pre></details>`);
  if (!bits.length) return '';
  const plug = st.plugin ? engine.plugin(st.plugin) : null;
  return `<div class="row"><span class="chip">@${escH(st.node.id)} <span class="p">${escH(plug ? plug.name : st.plugin || '')}</span></span><div class="res">${bits.join('')}</div></div>`;
}
const fmtV = v => v == null ? '' : K.fmtValue(v);
/** the gate of one reader on one message (see GATES): the level, each request's confidence, executed or not and why, the wires not run */
function gateHTML(x, rd) {
  const g = x.gate, ex = g.units.filter(u => u.execute).length, t = g.threshold, T = g.thresholds;
  const tt = T && Number.isFinite(T.command) && Number.isFinite(T.question) ? ` (it acts from confidence ${T.command.toFixed(4)} for commands and ${T.question.toFixed(4)} for questions${g.method === 'votes' ? ', with the votes of the other two readers' : ''})`
    : Number.isFinite(t) ? ` (it acts from confidence ${t.toFixed(4)})` : t === -Infinity ? ' (every request is executed)' : ' (no confidence: every request is asked)';
  const lab = g.label || gateLabel(g.effective || g.level);
  let h = `<div class="note">${escH(rd.label)} gate: ${escH(lab)}${!g.label && g.effective && g.effective !== g.level ? ` (${escH(gateLabel(g.level))} is not reached)` : ''}${escH(tt)}; executed ${ex} of ${g.units.length} request${g.units.length === 1 ? '' : 's'}${g.held.length ? `, not sure about ${g.held.length}` : ''}.</div>`;
  if (g.fallback) h += `<div class="note">${escH(g.fallback.charAt(0).toUpperCase() + g.fallback.slice(1))}.</div>`;
  if (g.units.length) h += `<ul class="units">${g.units.map(u => `<li><span class="src">“${escH(u.src || '')}”</span> → ${Number.isFinite(u.conf) ? `confidence ${u.conf.toFixed(3)}, ` : ''}${u.execute ? 'executed' : `<b>not executed</b>: ${escH(u.reasons.map(r => r.text).join('; ') || 'not sure')}${u.doneAnyway ? ' (then done anyway)' : u.superseded ? ' (then replaced by a later command)' : ''}`}</li>`).join('')}</ul>`;
  const heldNodes = g.held.flatMap(u => u.nodes);
  if (heldNodes.length) h += `<pre class="sop"><span class="cm"># not executed (not sure)</span>\n${heldNodes.map(hlNode).join('\n')}</pre>`;
  return h;
}
function vssHTML(v) {
  let h = '';
  if (v.units) h += `<div class="note">The requests and the world that read each:</div><ul class="units">${v.units.map(u => `<li><span class="src">“${escH(u.src || '')}”</span> → ${u.zone === 'ignored' ? 'not read' + (u.reason ? ' (' + escH(u.reason) + ')' : '') : `world <code>${escH(((vssInfo && vssInfo.worlds || []).find(w => w.world === u.world) || { model: u.world || '' }).model)}</code>, ${escH(u.event || '?')}${u.zone === 'ask' ? ', asked which shape' : ''}${u.tie > 1 ? `, ${u.tie} worlds read it, decided by ${escH(u.decidedBy || '?')}` : ''}${u.reread ? ', action from the event hint' : ''}`}${u.noWorldSignal ? ' (the VSS cutter named no world here: every world read it)' : ''}</li>`).join('')}</ul>`;
  for (const c of v.clauses) {
    if (!c.vss) continue;
    const m = c.vss.margins || {}, ms = Object.entries(m).filter(([, x]) => typeof x === 'number').map(([k, x]) => `${k} ${x.toFixed(2)}`).slice(0, 8).join(' · ');
    h += `<details class="cmp"><summary>clause <span class="src">${escH(c.src)}</span></summary><div class="tb" style="padding:6px 0 0">
      <div class="note">normalized: <code>${escH(c.normalized)}</code> · status <b>${escH(c.vss.status)}</b> · residual ${(+c.vss.residual).toFixed(3)}${c.vss.unplaced && c.vss.unplaced.length ? ' · unplaced: ' + escH(c.vss.unplaced.join(' ')) : ''}</div>
      ${ms ? `<div class="note">margins: ${escH(ms)}</div>` : ''}<pre class="sop">${escH(c.vss.sop)}</pre></div></details>`;
  }
  return h;
}
/** Qwen3's part of a message's details: what it wrote, how it was checked, its score, the tokens and the settings the runtime used */
function qwenHTML(q) {
  const f = x => Number.isFinite(x) ? x.toFixed(3) : '–', u = q.usage, t = q.timings, st = q.settings;
  let h = `<div class="note">Qwen3 output (${escH(q.finish || 'no finish')})${u ? `: ${u.prompt_tokens} prompt tokens (${u.prompt_tokens_details ? u.prompt_tokens_details.cached_tokens : 0} from the runtime's cache), ${u.completion_tokens} generated` : ''}${t ? `; prompt ${(t.prompt_ms / 1000).toFixed(1)} s, generation ${(t.predicted_ms / 1000).toFixed(1)} s (${f(t.predicted_per_second)} tokens/s)` : ''}; ${(q.ms / 1000).toFixed(1)} s in all.</div>`;
  if (q.error) h += `<div class="errt">${escH(q.error.message)}</div>`;
  h += `<pre class="sop">${escH(q.rawShown || '(nothing)')}</pre>`;
  h += `<div class="note">Checks: ${q.ok ? 'the whole output passed' : '<b>the output failed</b>: ' + escH(q.errors.join('; '))}.</div>`;
  if (q.requests && q.requests.length) h += `<ul class="units">${q.requests.map(r => { const sc = (q.scores || [])[r.index];
    return `<li><code>${escH(r.id)}</code> ${escH(String(r.do))} <span class="src">“${escH(r.src)}”</span>${r.span ? ` [${r.span[0]}, ${r.span[1]})` : ''} → ${r.blocked ? `<b>cannot run</b>: ${escH(r.errors.join('; '))}` : 'checked'}${sc ? ` · score ${f(sc.min)}${sc.weakest ? ` (weakest: ${escH(sc.weakest)})` : ''}${sc.missing ? ` · ${escH(sc.missing)}` : ''}` : ''}</li>`; }).join('')}</ul>`;
  if (q.notUnderstood && q.notUnderstood.length) h += `<div class="note">Not understood, by its own reading: ${q.notUnderstood.map(x => `“${escH(x.src)}”${x.error ? ` (${escH(x.error)})` : ''}`).join(', ')}</div>`;
  if (st) h += `<div class="note">Runtime settings: temperature ${escH(String(st.temperature))}, seed ${escH(String(st.seed))}, token probabilities ${st.post_sampling_probs ? 'after' : 'before'} sampling (n_probs ${escH(String(st.n_probs))}), chat format ${escH(String(st.chat_format))}, at most ${escH(String(st.n_predict))} tokens.</div>`;
  h += `<div class="note">Prompt SHA-256 <code>${escH(String(q.promptSha || '').slice(0, 16))}…</code>; the rendered prompt (${q.renderedPromptChars || '?'} characters) ends with <code>${escH(JSON.stringify(q.renderedPromptTail ? q.renderedPromptTail.slice(-60) : ''))}</code>. The message as given: <code>${escH(q.userContent || '')}</code></div>`;
  return h;
}
function neuralHTML(n) {
  const pct = x => (x * 100).toFixed(0) + '%';
  let h = '';
  for (const a of n.analyses) {
    const r = a.rules, rows = [];
    const actKey = a.kind.value === 'command' ? 'action' : a.kind.value === 'question' ? 'ask' : null;
    rows.push(['wire type', r ? r.type : '', a.kind.value, a.kind.top.map(t => `${t[0]} ${pct(t[1])}`).join(' · '), true]);
    if (actKey || (r && (r.args.action || r.args.ask))) { const rk = r ? (r.args.action || r.args.ask || '') : ''; rows.push([actKey || 'action/ask', rk, a.act ? a.act.value : '', a.act ? a.act.top.map(t => `${t[0]} ${pct(t[1])}`).join(' · ') : '', true]); }
    const keys = new Set(Object.keys(a.keys).concat(r ? Object.keys(r.args).filter(k => k !== 'action' && k !== 'ask') : []));
    for (const k of keys) {
      const q = a.keys[k];
      const why = q ? (q.span ? `“${q.span}” ${pct(q.score)}${q.source !== 'neural' ? ' · from ' + q.source : ''}` : 'no span') : 'not in frame';
      rows.push([k, r ? fmtV(r.args[k]) : '', q ? fmtV(q.value) : '', why, false]);
    }
    const body = rows.filter(x => x[1] !== '' || x[2] !== '' || x[4]).map(([k, rv, nv, why]) => r ? `<tr class="${rv === nv ? 'same' : 'diff'}"><th>${escH(k)}</th><td>${escH(rv || '–')}</td><td>${escH(nv || '–')}</td><td class="why">${escH(why)}</td></tr>` : `<tr><th>${escH(k)}</th><td>${escH(nv || '–')}</td><td class="why">${escH(why)}</td></tr>`).join('');
    h += `<details class="cmp"><summary>@${escH(a.id)} <span class="src">${escH(a.src)}</span></summary><div class="tbl"><table><thead><tr><th>question</th>${r ? '<th>rules</th>' : ''}<th>neural</th><th>model evidence</th></tr></thead><tbody>${body}</tbody></table></div></details>`;
  }
  return h;
}

/* ---------------- sheets ---------------- */
const sheet = $('#sheet'), scrim = $('#scrim'), sbody = $('#sbody'), stabs = $('#stabs');
let sheetKind = null, sheetTab = null, sheetTurn = null;
// the readers' own settings and their drawing as SOP are subtabs of each reader tab; the sheet keeps what is shared by every reader
// Help is not here: it is the full-screen overlay (docs/js/docs.js), opened by the ? button above the drawing
const TABS = { settings: [['settings', 'Settings'], ['plugins', 'Capabilities']], examples: [], turn: [] };
function openSheet(kind, tab, focus) {
  sheetKind = kind; sheetTab = tab || (TABS[kind][0] || [])[0] || null;
  $('#sheet-title').textContent = kind === 'examples' ? 'Examples' : kind === 'turn' ? 'Message details' : 'Settings';
  stabs.hidden = !TABS[kind].length;
  stabs.innerHTML = TABS[kind].map(([k, l]) => `<button class="stab" role="tab" type="button" data-stab="${k}" aria-selected="${k === sheetTab}">${l}</button>`).join('');
  sheet.hidden = false; scrim.hidden = false; renderSheet(focus); sbody.scrollTop = 0;
}
function closeSheet() { sheet.hidden = true; scrim.hidden = true; sheetKind = null; }
$('#close-sheet').addEventListener('click', closeSheet); scrim.addEventListener('click', closeSheet);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !sheet.hidden) closeSheet(); });
stabs.addEventListener('click', ev => { const b = ev.target.closest('[data-stab]'); if (!b) return; sheetTab = b.dataset.stab; stabs.querySelectorAll('.stab').forEach(x => x.setAttribute('aria-selected', String(x === b))); renderSheet(); sbody.scrollTop = 0; });
$('#open-settings').addEventListener('click', () => openSheet('settings', 'settings'));
$('#help-btn').addEventListener('click', () => { closeSheet(); DocsKit.open('start'); });
/** open a help page from anywhere in the app (a button with data-help="<page>") */
function openHelp(id) { if (!sheet.hidden) closeSheet(); DocsKit.open(id); }
$('#open-examples').addEventListener('click', () => { openSheet('examples'); trManifest().catch(() => {}); });   // the Claude Opus 5.5 translations load while the menu is open
function renderSheet(focus) {
  if (sheetKind === 'examples') sbody.innerHTML = renderExamples();
  else if (sheetKind === 'turn') { if (focus) sheetTurn = focus; sbody.innerHTML = renderTurn(sheetTurn); }
  else if (sheetTab === 'settings') sbody.innerHTML = renderSettings();
  else if (sheetTab === 'plugins') sbody.innerHTML = renderPlugins();
}

/* ---------------- examples ---------------- */
const QUICK = ExamplesKit.QUICK;
/** one scenario's card in the + menu (a scene marked test: llm_bench/scenes_test, shown here, never trained on) */
const scCard = sc => `<article class="sc"><header><h4>${escH(sc.title)}${sc.test ? ' <span class="tst" title="A scene of the test set (training/sketch/llm_bench/scenes_test): shown in the demo, never trained on">test</span>' : ''}</h4><span class="len">${sc.size} · ${sc.turns.length} message${sc.turns.length === 1 ? '' : 's'}</span></header><p>${escH(sc.blurb)}</p><div class="row2"><button type="button" class="btn solid" data-sc="${sc.id}" data-how="play">Play</button><button type="button" class="btn" data-sc="${sc.id}" data-how="step">Step through</button><button type="button" class="btn" data-sc="${sc.id}" data-how="edit">Edit a copy</button></div></article>`;
function renderExamples() {
  return `<h3 class="sub">Send one sentence</h3>
  <div class="quick">${QUICK.map((q, i) => `<button type="button" data-quick="${escH(q)}" data-example="quick:${i}">${escH(q.startsWith('@') ? 'SOP Lang: ' + q : q)}</button>`).join('')}</div>
  <h3 class="sub">Play a scenario</h3>
  <p class="intro">A scenario is a script of messages. It is drawn in a new area next to what is already on the canvas; nothing is erased.</p>
  <div class="opts"><label for="sc-delay">Pause between messages</label><select id="sc-delay"><option value="0">none</option><option value="400" selected>0.4 s</option><option value="1000">1 s</option><option value="2000">2 s</option></select></div>
  <div class="sc-list">${SCENARIOS.filter(sc => sc.kind !== 'scene').map(scCard).join('')}</div>
  <h3 class="sub" id="scenes-head">Scenes</h3>
  <p class="intro">Pictures drawn step by step, one plain English message at a time (scenes-extra.js): landscapes, technical drawings, plans, a chart, a poster, cards. Each starts with “Clear the canvas”; the names above the shapes are hidden while they play (the footer’s <b>names</b> shows them). The four marked <i>test</i> are the scenes’ test set: shown here, never trained on.</p>
  <div class="sc-list scenes">${SCENARIOS.filter(sc => sc.kind === 'scene').map(scCard).join('')}</div>
  <h3 class="sub">Your own script</h3>
  <p class="intro">One message per line. Lines starting with <code>#</code> are comments; lines starting with <code>@</code> are SOP Lang, sent to the engine as they are.</p>
  <textarea id="sc-text" rows="7" spellcheck="false" placeholder="# My diagram&#10;Draw a blue circle named Hub in the center.&#10;Add a red square named Node1 left of Hub and connect Hub to it.&#10;What is connected to Hub?"></textarea>
  <div class="row2" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px"><button type="button" class="btn solid" data-own="play">Play</button><button type="button" class="btn" data-own="step">Step through</button><label class="btn file">Load .txt<input type="file" id="sc-file" accept=".txt,.md,.sop,text/plain"></label><span class="status" id="sc-status"></span></div>`;
}
const player = { name: '', turns: [], original: [], exampleId: null, token: 0, i: 0, playing: false, stop: false, busy: false, delay: 400 };
function deactivatePlayer(busy = false) {
  const token = player.token + 1;
  Object.assign(player, { name: '', turns: [], original: [], exampleId: null, opusMap: null, token, i: 0, playing: false, stop: true, busy });
  renderPlayer();
  return token;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const parseScript = txt => txt.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
function renamedForCanvas(turns, savedEntry) {
  if (savedEntry) {
    const occupied = READERS.filter(rd => rd.id !== OPUS.id).flatMap(rd => rd.world.state.shapes.map(s => s.name).concat((rd.world.state.groups || []).map(g => g.name)));
    const map = SavedReaderKit.allocate(savedEntry.names, occupied, SavedReaderKit.families(savedEntry));
    return { map, turns: turns.map((t, i) => t.startsWith('@') ? SavedReaderKit.bindNodes(savedEntry.turns[i].nodes, map).map(K.serialize).join('\n') : SavedReaderKit.bindText(t, map)) };
  }
  const declared = new Set(); turns.forEach(t => (t.match(/\b(?:named|called)\s+([A-Za-z_][\w-]*)/g) || []).forEach(m => declared.add(m.split(/\s+/).pop())));
  const map = {};
  const taken = n => READERS.some(rd => rd.id !== OPUS.id && rd.world.find(n));
  for (const n of declared) if (taken(n)) { let k = 2; while (taken(n + k) || declared.has(n + k)) k++; map[n] = n + k; }
  const keys = Object.keys(map); if (!keys.length) return { turns, map };
  const re = new RegExp(`\\b(${keys.join('|')})\\b`, 'g');
  return { turns: turns.map(t => t.replace(re, m => map[m])), map };
}
function renderPlayer() {
  const bar = $('#player');
  if (!player.turns.length) { bar.hidden = true; return; }
  bar.hidden = false;
  const done = player.i >= player.turns.length;
  bar.innerHTML = `<div class="pl-t"><b>${escH(player.name)}</b> · ${done ? 'finished' : `${player.i + 1} of ${player.turns.length}`}${done ? '' : `<span>Next: ${escH(player.turns[player.i])}</span>`}</div>
    ${done ? '' : player.playing ? `<button type="button" class="pbtn ghost" data-pl="pause" data-pl-token="${player.token}">Pause</button>` : `<button type="button" class="pbtn ghost" data-pl="play" data-pl-token="${player.token}">Play</button><button type="button" class="pbtn" data-pl="next" data-pl-token="${player.token}">Next</button>`}
    <button type="button" class="ib" data-pl="close" data-pl-token="${player.token}" aria-label="Close player"><svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
}
async function playRest(token = player.token) {
  if (token !== player.token || player.playing || player.busy || !player.turns.length) return;
  player.playing = true; player.stop = false; renderPlayer();
  while (token === player.token && player.i < player.turns.length && !player.stop) { await nextPlayer(token); await sleep(player.delay); }
  if (token === player.token) { player.playing = false; renderPlayer(); }
}
async function nextPlayer(token) {
  if (token !== player.token || player.busy || player.i >= player.turns.length) return;
  const i = player.i++, text = player.turns[i], original = player.original[i], exampleId = player.exampleId;
  player.busy = true; renderPlayer();
  const meta = { via: 'script' };
  if (exampleId) { meta.saved = { exampleId, turn: i, original, runToken: token }; meta.opusMap = player.opusMap; }
  await submit(text, undefined, meta);
  if (token === player.token) { player.busy = false; renderPlayer(); }
}
/** play a script in a new area of every tab's drawing. opts.names: false hides the name tags (a scenario's names: false; see "Name tags"),
 *  otherwise the user's kept choice comes back. The view switches to the scenario's own area (the 'focus' view, fitted to what it draws, the
 *  zoom and pan reset), on desktop too, where the default view shows every area small; the view button still shows them all. */
async function startScript(name, turns, how, opts) {
  if (!turns.length) return;
  const token = deactivatePlayer(true), delay = +(($('#sc-delay') || {}).value ?? 400);
  closeSheet();
  const original = turns.slice(), exampleId = opts && opts.exampleId;
  let fixed, opusMap = null;
  const newArea = rd => {   // every reader's drawing gets the new area (Qwen3's in its queue, before the scenario's messages)
    const w = rd.world;
    if (w.state.shapes.length) { const before = w.snapshot(); w.newFrame(name); w.commit(before); }
    else { w.state.frame = { x: 0, y: 0 }; w.state.frames = [{ x: 0, y: 0, title: name }]; }
    rd.focusCell = Object.assign({}, w.state.frame);
  };
  // New area, allocation and saved context capture are one queue operation. A replaced run cannot capture the replacement's context.
  queue = queue.then(async () => {
    await savedLoad; await trNow(); if (token !== player.token) return;
    fixed = renamedForCanvas(original, exampleId && saved.entry(exampleId));
    if (exampleId) opusMap = trMapSync(exampleId, fixed.map);   // the Claude Opus 5.5 tab's renames, before the new area (as the text's)
    for (const rd of READERS) if (rd.id !== 'qwen') newArea(rd);
    qwenJob(() => { newArea(RD.qwen); if (cur === RD.qwen) renderCanvas(); });
    saved.invalidate();
    if (exampleId) try { await saved.begin(exampleId, original, fixed.turns, fixed.map, token); } catch (e) { console.error(e); }
  });
  await queue; if (token !== player.token) return;
  setShowNames(opts && opts.names === false ? false : namesPref);
  view = 'focus'; zv.k = 1; zv.dx = 0; zv.dy = 0;
  const ren = Object.entries(fixed.map).filter(([a, b]) => a !== b).map(([a, b]) => `${a} → ${b}`);
  sysNote(`Scenario: ${name}` + (ren.length ? ` · renamed ${ren.join(', ')} to avoid clashes` : ''));
  renderCanvas();
  Object.assign(player, { name, turns: fixed.turns, original, exampleId, opusMap, delay, i: 0, busy: false });
  renderPlayer();
  if (how === 'play') playRest(token);
}
$('#player').addEventListener('click', async ev => {
  const b = ev.target.closest('[data-pl]'); if (!b) return;
  const a = b.dataset.pl, token = +b.dataset.plToken;
  if (token !== player.token) return;
  if (a === 'next' && !player.playing) await nextPlayer(token);
  if (a === 'play') playRest(token);
  if (a === 'pause') player.stop = true;
  if (a === 'close') { deactivatePlayer(); queue = queue.then(() => saved.invalidate()); }
});

/* ---------------- formalizers: rules, VSS, neural ---------------- */
let vssState = 'idle', vssInfo = null, vssError = null, neuralBytes = 0, neuralLoadMs = 0;
// neural: 'checking' (is it published? in the cache?), 'loading', 'ready', 'unpublished' (our model is not on this site), 'failed'
let nState = 'checking', nError = null, nProg = { L: 0, T: 0 }, nFromCache = false, nToken = 0;
const VSS_HINT = 31.4e6;   // the composer's files (9 worlds of arm VSS-ALL with generated stars, cutters, context weights), measured 2026-11-03; the loaded size is measured again in the page
const RULES_BYTES_INLINE = (() => { try { return [...document.scripts].filter(s => !s.src && /SOPKit/.test(s.textContent.slice(0, 400))).reduce((a, s) => a + s.textContent.length, 0); } catch (e) { return 0; } })();
const rulesBytes = () => { try { const e = performance.getEntriesByType('resource').find(r => /\/js\/logic\.js$/.test(r.name)); return e && e.decodedBodySize ? e.decodedBodySize : RULES_BYTES_INLINE; } catch (e) { return RULES_BYTES_INLINE; } };
const mb = b => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(0) + ' KB';
const mb0 = b => Math.round(b / 1e6) + ' MB';

/* a reader that finishes loading before it has read anything starts from the Rules drawing */
function copyDrawing(src, dst) {
  const c = x => JSON.parse(JSON.stringify(x));
  dst.world.restore(src.world.state); dst.world.undoStack = c(src.world.undoStack); dst.world.redoStack = c(src.world.redoStack);
  dst.last = src.last.slice(); dst.focusCell = src.focusCell && Object.assign({}, src.focusCell); dst.pending = null; dst.held = [];
}
function adoptRules(rd) { if (rd.id === 'saved') return queue; queue = queue.then(() => { if (!rd.reads) { copyDrawing(RD.rules, rd); if (rd === cur) renderCanvas(); } updateTabs(); renderSopBar(); }); return queue; }
function alignDrawings() {
  queue = queue.then(() => {
    if (cur.id === 'saved' || cur.id === OPUS.id) return;
    const src = cur, to = READERS.filter(rd => rd !== src && isReady(rd) && rd.id !== 'qwen' && rd.id !== 'saved' && rd.id !== OPUS.id);
    for (const rd of to) copyDrawing(src, rd);
    sysNote(`Drawings aligned: ${to.map(rd => rd.label).join(' and ') || 'no other reader'} now ${to.length > 1 ? 'have' : 'has'} the ${src.label} drawing and its undo history.`);
    renderCanvas(); updateTabs(); renderSopBar();
  });
}
/* what a drawing shows (shapes, links, rules), independent of ids and counters */
function sig(w) {
  const S = w.state;
  return JSON.stringify([S.shapes.map(s => [s.name, s.shape, s.color, s.size, s.x, s.y, s.label || '', s.outline || ''].join('|')).sort(),
    S.edges.map(e => [e.from, e.to, e.style, e.arrow, e.label || '', e.color || ''].join('|')).sort(), S.rules.map(r => [r.shape, r.size, r.color, r.outline].join('|')).sort()]);
}
const differs = rd => rd !== cur && isReady(rd) && isReady(cur) && sig(rd.world) !== sig(cur.world);

/* ---------------- reader tabs, SOP bar, loading overlay ---------------- */
const rtabs = $('#rtabs');
function tabTitle(rd) {
  if (!isReady(rd)) return `${rd.label}: ${offText(rd).replace(/, did not read this$/, '')}`;
  return differs(rd) ? `${rd.label}: this drawing differs from the ${cur.label} drawing` : `${rd.label}: show this reader’s drawing`;
}
function updateTabs() {
  renderSub();
  const keep = rtabs.scrollLeft;
  rtabs.innerHTML = READERS.map(rd => `<button type="button" role="tab" class="rtab${isReady(rd) ? '' : ' off'}" data-rtab="${rd.id}" aria-selected="${rd === cur}" title="${escH(tabTitle(rd))}">${escH(rd.label)}${differs(rd) ? `<i class="dot" aria-label="differs from ${escH(cur.label)}"></i>` : ''}${!isReady(rd) && (rd.id === 'qwen' ? qwenState() === 'loading' : ((rd.id !== 'neural' && vssState === 'loading') || (rd.id !== 'vss' && (nState === 'loading' || nState === 'checking')))) ? '<i class="spin" aria-hidden="true"></i>' : ''}</button>`).join('');
  rtabs.scrollLeft = keep; activeTabInView();
}
/** on a narrow screen the tab strip scrolls sideways: the active tab is scrolled into view (after a render and a resize) */
function activeTabInView() {
  const sel = rtabs.querySelector('[aria-selected="true"]');
  if (sel && rtabs.scrollWidth > rtabs.clientWidth) { const a = rtabs.getBoundingClientRect(), b = sel.getBoundingClientRect(); if (b.left < a.left) rtabs.scrollLeft -= a.left - b.left; else if (b.right > a.right) rtabs.scrollLeft += b.right - a.right; }
}
function setActive(id) {
  if (!RD[id] || drag) return;
  cur = RD[id]; world = cur.world; hl = { shapes: new Set(), edges: new Set() }; clearTimeout(hlTimer);
  renderCanvas(); updateTabs(); renderCard(); renderSopBar();
}
rtabs.addEventListener('click', ev => { const b = ev.target.closest('[data-rtab]'); if (b) setActive(b.dataset.rtab); });
rtabs.addEventListener('keydown', ev => {
  if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
  const i = READERS.indexOf(cur), n = READERS[(i + (ev.key === 'ArrowRight' ? 1 : READERS.length - 1)) % READERS.length];
  setActive(n.id); const b = rtabs.querySelector(`[data-rtab="${n.id}"]`); if (b) b.focus();
});
/* the align tool: shown when another loaded reader's drawing differs from the one on screen; copies this drawing to them */
function renderSopBar() {
  const b = $('#align-btn'); if (!b) return;
  b.hidden = cur.id === 'saved' || cur.id === OPUS.id || !READERS.filter(rd => rd.id !== 'qwen' && rd.id !== 'saved' && rd.id !== OPUS.id).some(differs);
  b.title = b.ariaLabel = `Copy this ${cur.label} drawing and its undo history to the other tabs`;
}
$('#align-btn').addEventListener('click', alignDrawings);
/* The loading overlay (owner, 2026-11-03 afternoon; it replaces the loading card): while the readers load it covers the drawing area of a
   tab whose reader is not ready (VSS-BERT, VSS, SOP-BERT; never the Rules, which need nothing), says why it is there and shows one row per
   step with its state: VSS (its 9 worlds), SOP-BERT (the model download, then the start of WASM on the CPU), the confidence files
   (vss.json, sop-bert.json, combined.json, vote3.json) and the first check (one sentence read end to end by VSS-BERT on a scratch drawing:
   SOP-BERT's cut and reading, VSS on the same requests, the votes' readers, the combined confidence; nothing is executed or shown in the
   chat). No timer: it fades out by itself when every step is done and the check passed. A failed step keeps it, with the reason and
   "Continue with Rules only" (it then closes for good and the Rules tab opens). Only on the Drawing subtab, so Settings stay usable. */
const CONF_FILES = [['vss', 'vss.json'], ['sop', 'sop-bert.json'], ['combined', 'combined.json'], ['vote', 'vote3.json']];
const lo = { conf: { vss: 'wait', sop: 'wait', combined: 'wait', vote: 'wait' }, confErr: {}, started: {}, check: 'wait', checkErr: null, done: false, dismissed: false };
const CHECK_TEXT = 'Draw a red circle named Hub and connect Start to it.';
function confStep(k, p) {
  if (lo.started[k]) return; lo.started[k] = true; lo.conf[k] = 'loading';
  p.then(() => { lo.conf[k] = 'ready'; }, e => { console.error(e); lo.conf[k] = 'failed'; lo.confErr[k] = e; }).then(loadProgress);
}
/** start what can start now, then the first check when everything it needs is there */
function loadProgress() {
  if (lo.done) return;
  confStep('combined', combinedSpec()); confStep('vote', voteSpec());
  if (vssState === 'ready') confStep('vss', window.VSSFormalizer.loadConfidence());
  if (nState === 'ready') confStep('sop', neuralSpec());
  const confOk = Object.values(lo.conf).every(s => s === 'ready');
  if (lo.check === 'wait' && confOk && isReady(RD.vss) && isReady(RD.neural)) {
    lo.check = 'loading';
    const run = queue.then(firstCheck); queue = run.catch(() => {});   // in the message queue: never alongside a message's readings
    run.then(() => { lo.check = 'ready'; }, e => { console.error(e); lo.check = 'failed'; lo.checkErr = e; }).then(() => { if (lo.check === 'ready') lo.done = true; renderCard(); });
  }
  renderCard();
}
/** the first check: one sentence read by VSS-BERT end to end, on an empty scratch drawing (no reader's drawing changes) */
async function firstCheck() {
  const text = CHECK_TEXT, ctx = { names: ['Start'], last: [] }, t0 = performance.now();
  const n = await neural.formalize(text, ctx, { signals: true });
  const v = await window.VSSFormalizer.formalize(text, ctx, RD.vss.formalize, VSS_OPTS);
  const rec = { text, raw: false, readers: { rules: { ctx }, vss: { vss: v, ctx }, neural: { neural: n, ctx, ms: performance.now() - t0 } } };
  const c = await combinedRead(RD.combined, text, rec, ctx);
  if (!c.units.length) throw new Error('VSS-BERT read no request in the check sentence');
  if (!c.units.every(u => Number.isFinite(u.conf))) throw new Error('VSS-BERT gave no confidence for the check sentence');
  lo.checkMs = performance.now() - t0;
}
const loFailed = () => vssState === 'failed' || nState === 'failed' || nState === 'unpublished' || Object.values(lo.conf).includes('failed') || lo.check === 'failed';
function loRow(name, sub, state, body) {
  const icon = state === 'ready' ? '<span class="lo-i ok" aria-label="ready">✓</span>' : state === 'failed' ? '<span class="lo-i bad" aria-label="failed">!</span>'
    : state === 'loading' ? '<span class="lo-i spin" aria-label="loading"></span>' : '<span class="lo-i wait" aria-label="waiting"></span>';
  return `<li class="lo-row ${state}" data-step="${escH(name)}">${icon}<div class="lo-b"><div class="lo-h"><b>${escH(name)}</b> <span>${escH(sub)}</span></div>${body || ''}</div></li>`;
}
const loErr = e => `<div class="lo-err">${escH(String(e && e.message || e || 'unknown error'))}</div>`;
/** the overlay's rows, from the readers' states */
function loadRowsHTML() {
  const vb = vssInfo && vssInfo.bytes ? mb(vssInfo.bytes) : `about ${mb0(VSS_HINT)}`;
  const vss = vssState === 'ready' ? loRow('VSS', `9 worlds, ${vb}`, 'ready', `<div class="lo-s">loaded in ${((vssInfo && vssInfo.loadMs || 0) / 1000).toFixed(1)} s${vssInfo && vssInfo.cache && vssInfo.cache.state === 'hit' ? ' from this browser’s cache' : ''}</div>`)
    : vssState === 'failed' ? loRow('VSS', `9 worlds, ${vb}`, 'failed', loErr(vssError))
      : loRow('VSS', `9 worlds, ${vb}`, 'loading', '<div class="prog lo-ind"><div></div></div>');
  const nb = nProg.T ? mb(nProg.T) : (() => { try { return 'about ' + mb0(nBytesHint()); } catch (e) { return ''; } })();
  const started = nProg.T && nProg.L >= nProg.T;
  const sop = nState === 'ready' ? loRow('SOP-BERT', `model ${mb(neuralBytes || nProg.T)}`, 'ready', `<div class="lo-s">downloaded${nFromCache ? ' from this browser’s cache' : ''} and started on the CPU (WASM) in ${(neuralLoadMs / 1000).toFixed(1)} s</div>`)
    : nState === 'unpublished' ? loRow('SOP-BERT', 'model', 'failed', loErr('the neural model is not published on this site'))
      : nState === 'failed' ? loRow('SOP-BERT', `model ${nb}`, 'failed', loErr(nError) + '<div class="lo-acts"><button type="button" class="btn" data-nact="retry">Try again</button></div>')
        : nState === 'loading' ? loRow('SOP-BERT', `model ${nb}`, 'loading', started ? '<div class="lo-s">downloaded; starting on the CPU (WASM)…</div><div class="prog lo-ind"><div></div></div>'
          : `<div class="lo-s nprog-t">${escH(progText())}</div><div class="prog lo-n"><div style="width:${nProg.T ? (nProg.L / nProg.T * 100).toFixed(1) : 0}%"></div></div>`)
          : loRow('SOP-BERT', `model ${nb}`, 'loading', '<div class="lo-s">checking whether it is in this browser’s cache…</div>');
  const cs = Object.values(lo.conf), cstate = cs.includes('failed') ? 'failed' : cs.every(s => s === 'ready') ? 'ready' : cs.includes('loading') ? 'loading' : 'wait';
  const readerOf = { vss: [vssState === 'failed', 'VSS'], sop: [nState === 'failed' || nState === 'unpublished', 'SOP-BERT'] };
  const conf = loRow('Confidence files', CONF_FILES.map(x => x[1]).join(', '), cstate, `<div class="lo-s">${CONF_FILES.map(([k, f]) => `${escH(f)} ${lo.conf[k] === 'ready' ? '✓' : lo.conf[k] === 'failed' ? '✗' : lo.conf[k] === 'loading' ? '…' : readerOf[k] && readerOf[k][0] ? `(not loaded: ${readerOf[k][1]} failed)` : '(waits for its reader)'}`).join(' · ')}</div>${CONF_FILES.filter(([k]) => lo.conf[k] === 'failed').map(([k, f]) => loErr(`${f}: ${lo.confErr[k] && lo.confErr[k].message || lo.confErr[k]}`)).join('')}`);
  const blocked = loFailed() && lo.check === 'wait';
  const check = loRow('The first check', 'one sentence read end to end by VSS-BERT', lo.check === 'wait' ? 'wait' : lo.check,
    lo.check === 'failed' ? loErr(lo.checkErr) : lo.check === 'ready' ? `<div class="lo-s">read in ${fmtMs(lo.checkMs || 0)}</div>` : `<div class="lo-s">${blocked ? 'not run: a step above failed' : lo.check === 'loading' ? 'reading…' : 'waits for the steps above'}</div>`);
  return vss + sop + conf + check;
}
function renderCard() {
  const c = $('#loadov'); if (!c) return;
  if (cur.id === 'qwen' && sub === 'drawing' && !isReady(cur)) {
    c.hidden = false; c.classList.remove('out');
    c.innerHTML = `<div class="lo-card" role="status"><h2>Qwen3 (experimental)</h2>${qwenBoxHTML()}<p class="note">Its drawing is below this card; it changes only through what Qwen3 reads.</p></div>`; return;
  }
  if (cur.id === 'modernbert' && sub === 'drawing' && !isReady(cur)) {
    c.hidden = false; c.classList.remove('out');
    c.innerHTML = `<div class="lo-card" role="status"><h2>ModernBERT</h2>${modernBoxHTML()}<button type="button" class="btn" data-modern-settings>Open ModernBERT Settings</button></div>`; return;
  }
  const show = !lo.dismissed && sub === 'drawing' && (cur.id === 'combined' ? !lo.done : cur.id !== 'rules' && !isReady(cur));
  if (!show) {
    if (c.hidden || c.classList.contains('out')) return;
    if (lo.done && cur.id === 'combined') {   // a short fade, then gone
      c.classList.add('out');
      const end = () => { c.hidden = true; c.classList.remove('out'); c.innerHTML = ''; };
      c.addEventListener('transitionend', end, { once: true }); setTimeout(() => { if (!c.hidden && c.classList.contains('out')) end(); }, 600);   // no transitionend under reduced motion
      return;
    }
    c.hidden = true; c.innerHTML = ''; return;
  }
  const failed = loFailed(), list = c.querySelector('.lo-rows');
  if (list && !!c.querySelector('.lo-card.failed') === failed) { list.innerHTML = loadRowsHTML(); return; }   // keep the card, refresh the rows
  c.hidden = false; c.classList.remove('out');
  c.innerHTML = `<div class="lo-card${failed ? ' failed' : ''}" role="dialog" aria-modal="false" aria-labelledby="lo-t" aria-describedby="lo-d">
    <h2 id="lo-t">${failed ? 'A reader could not be loaded' : 'Loading the readers'}</h2>
    <p id="lo-d">${failed ? 'VSS-BERT needs both VSS and SOP-BERT. The Rules still read every message in the chat.' : `Loading the readers. VSS-BERT answers once both are ready.${cur.id !== 'combined' ? ` This tab shows ${escH(cur.label)}.` : ''} Meanwhile the Rules reply in the chat.`}</p>
    <ol class="lo-rows" aria-live="polite">${loadRowsHTML()}</ol>
    ${failed ? '<div class="lo-acts"><button type="button" class="btn solid" data-lo="rules">Continue with Rules only</button></div>' : ''}</div>`;
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-lo="rules"]'); if (!b) return;
  lo.dismissed = true; renderCard(); setActive('rules'); sysNote('Continuing with the Rules only. VSS-BERT answers once both VSS and SOP-BERT are loaded (reload the page to try again).');
});

/* ---------------- VSS: loads by itself when the page opens (same site) ---------------- */
async function ensureVSS(announce) {
  if (vssState === 'ready') return true;
  if (vssState === 'loading') { while (vssState === 'loading') await sleep(100); return vssState === 'ready'; }
  vssState = 'loading'; refreshReaders();
  try {
    if (!window.VSSFormalizer) await import(new URL('js/vss-formalizer.js', document.baseURI).href);
    await window.VSSFormalizer.loadComposerAt(); vssInfo = window.VSSFormalizer.composerInfo();
    try {
      await window.VSSFormalizer.loadConfidence();
      // a level kept from before that the model does not reach (e.g. 99): the highest reached level below it, else the safety threshold
      const ci = window.VSSFormalizer.confidenceInfo(), eff = ci && ci.effective(vssGate);
      if (eff && eff !== vssGate) { sysNote(`VSS does not reach ${vssGate}% precision on its calibration messages; it uses its ${gateLabel(eff)} instead.`); vssGate = eff; store.set(GATE_KEY, vssGate === GATE_DEFAULT ? null : vssGate); }
    } catch (e) { sysNote('The VSS confidence model could not be loaded (' + (e && e.message || e) + '): VSS will ask about every request.'); }
    vssState = 'ready'; vssError = null;
    const fresh = !RD.vss.reads;
    if (announce !== false) sysNote((vssInfo.composer ? `VSS ready: ${vssInfo.worlds.length} micro-worlds, ${mb(vssInfo.bytes)}, loaded in ${(vssInfo.loadMs / 1000).toFixed(1)} s.`
      : `VSS model ready: ${mb(vssInfo.bytes)}, D ${vssInfo.D}, loaded in ${(vssInfo.loadMs / 1000).toFixed(1)} s.`) + (fresh ? ' It starts from the Rules drawing.' : ''));
    adoptRules(RD.vss); if (isReady(RD.combined)) adoptRules(RD.combined);
  } catch (e) { vssState = 'failed'; vssError = e; sysNote('The VSS reader could not be loaded: ' + (e && e.message || e)); }
  refreshReaders(); return vssState === 'ready';
}

/* ---------------- Neural: our model (SOP-BERT, NeuralKit.modelsFor) loads by itself when the page opens, like VSS ---------------- */
let nStatus = null;   // NeuralKit.status(): is our model published on this site
/** the neural model(s) this page loads, by name: "SOP-BERT" (one model; the earlier pair joined with +) */
const neuralNames = () => { try { return NeuralKit.modelsFor().map(id => NeuralKit.NAMES[id] || id); } catch (e) { return []; } };
const nBytesHint = () => NeuralKit.modelsFor().reduce((a, id) => a + (NeuralKit.bytesOf(id) || 0), 0);
function errHTML(e) {
  if (!e) return '';
  const msg = String(e.message || e);
  return `<div class="errt">${escH(msg)}</div>${e.files && e.files.length ? `<div class="note">Files still loading when it failed: ${e.files.map(u => `<code>${escH(u)}</code>`).join(', ')}</div>` : e.url && !msg.includes(e.url) ? `<div class="note">File: <code>${escH(e.url)}</code></div>` : ''}${e.network ? '<div class="note">This looks like a network failure (this site or the transformers.js library on cdn.jsdelivr.net could not be reached).</div>' : ''}`;
}
function progText() { return nFromCache ? 'Loading from this browser’s cache…' : nProg.T ? `Downloading ${(nProg.L / 1e6).toFixed(0)} of ${(nProg.T / 1e6).toFixed(0)} MB…` : 'Starting the download…'; }
function unpublishedHTML() { return `<p>The neural model is not published yet.</p>${nStatus && nStatus.missing.length ? `<div class="note">Not on this site: ${nStatus.missing.map(m => `<code>${escH(m)}</code>`).join(', ')}</div>` : ''}`; }
function neuralBoxHTML() {
  if (nState === 'checking') return '<p>Checking whether the neural model is published and in this browser’s cache…</p>';
  if (nState === 'unpublished') return unpublishedHTML();
  if (nState === 'loading') return `<p class="nprog-t">${escH(progText())}</p><div class="prog"><div style="width:${nProg.T ? (nProg.L / nProg.T * 100).toFixed(1) : 0}%"></div></div>`;
  if (nState === 'failed') return `<p>The neural model could not be loaded:</p>${errHTML(nError)}<div class="acts"><button type="button" class="btn solid" data-nact="retry">Try again</button></div>`;
  return `<p>Ready: ${escH(neuralNames().join(' + '))} on the CPU (WASM, ${escH(models.dtypeText || '8-bit files')}), ${mb(neuralBytes)}, loaded in ${(neuralLoadMs / 1000).toFixed(1)} s${nFromCache ? ' from the browser cache' : ''}.</p>`;
}
let nRaf = 0;
function refreshReaders() {   // every place that shows a reader's state
  updateTabs(); loadProgress(); setStatus(idleStatus());
  // ModernBERT loads independently after the original readers' first check has completed.
  if (cur.id === 'modernbert' || cur.id === 'qwen') renderCard();
  const qbox = $('#qwen-box'); if (qbox) qbox.innerHTML = qwenBoxHTML();
  const box = $('#nm-box'); if (box) box.innerHTML = neuralBoxHTML();
  const modernBox = $('#modern-box'); if (modernBox) modernBox.innerHTML = modernBoxHTML();
}

function modernBoxHTML() {
  if (modern.state === 'checking') return '<p>Checking whether the trained ModernBERT model is published…</p>';
  if (modern.state === 'unpublished') return `<p>The trained ModernBERT model is not published yet.</p><div class="note">${(modern.status?.missing || []).map(escH).join('<br>')}</div>`;
  if (modern.state === 'failed') return `<p>ModernBERT could not be loaded.</p>${errHTML(modern.error)}<button type="button" class="btn" data-modern-retry>Try again</button>`;
  if (modern.state === 'loading') return `<p>Loading ModernBERT on the CPU (WASM)… ${modern.progress.T ? `${mb(modern.progress.L)} of ${mb(modern.progress.T)}` : ''}</p>`;
  return `<p>Ready: ModernBERT on the CPU (WASM, 8-bit files), ${mb(modern.bytes)}, loaded in ${(modern.ms / 1000).toFixed(1)} s${modern.fromCache ? ' from the browser cache' : ''}.</p>`;
}
async function checkModern() {
  const token = ++modern.token, t0 = performance.now(), files = {};
  modern.models = null; modernbert.setModels(null); modern.state = 'checking'; modern.error = null; refreshReaders();
  try {
    const status = await NeuralKit.status('modernbert'); if (token !== modern.token) return;
    modern.status = status;
    if (status.error) throw new Error(status.error);
    if (!status.published) { modern.state = 'unpublished'; refreshReaders(); return; }
    modern.fromCache = await NeuralKit.cached('modernbert'); if (token !== modern.token) return;
    modern.state = 'loading'; refreshReaders();
    const m = await NeuralKit.load(e => {
      if (token !== modern.token || !e?.file) return;
      if (e.status === 'progress') files[e.file] = [e.loaded || 0, e.total || 0];
      if (e.status === 'done' && files[e.file]) files[e.file][0] = files[e.file][1];
      const values = Object.values(files); modern.progress = { L: values.reduce((s, x) => s + x[0], 0), T: values.reduce((s, x) => s + x[1], 0) };
      refreshReaders();
    }, 'modernbert');
    if (token !== modern.token) return;
    modernbert.setModels(m); modern.models = m; modern.bytes = NeuralKit.bytesOf('ours/modernbert') || modern.progress.T; modern.ms = performance.now() - t0;
    try { await modernSpec(); } catch (e) { console.error(e); }
    modern.state = 'ready'; adoptRules(RD.modernbert);
    sysNote(`ModernBERT reader ready on the CPU (WASM), ${mb(modern.bytes)}.` + (modern.conf.spec ? '' : ' Its confidence is unavailable, so every request is held.'));
  } catch (e) { if (token !== modern.token) return; modern.state = e.unpublished ? 'unpublished' : 'failed'; modern.error = e; }
  refreshReaders(); if (cur.id === 'modernbert' && sub === 'settings') renderSub();
}
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-modern-retry]') && modern.state !== 'loading') checkModern();
  if (ev.target.closest('[data-modern-settings]')) setSub('settings');
});
/** when the page opens: is our model published? then it loads (from the browser cache when it is there) */
async function checkNeural() {
  const tok = ++nToken; models = null; neural.setModels(null); nState = 'checking'; nError = null; refreshReaders();
  nStatus = await NeuralKit.status();
  if (tok !== nToken) return;
  if (sub === 'settings' && cur.id === 'neural') renderSub();   // the sizes and the model facts are known now
  if (nStatus.error) { nState = 'failed'; nError = Object.assign(new Error(nStatus.error), { network: true }); refreshReaders(); return; }
  if (!nStatus.published) { nState = 'unpublished'; refreshReaders(); return; }
  loadModels(await NeuralKit.cached());
}
async function loadModels(fromCache) {
  const tok = ++nToken, files = {}, t0 = performance.now(); neuralBytes = 0;
  models = null; neural.setModels(null); nState = 'loading'; nError = null; nFromCache = !!fromCache; nProg = { L: 0, T: 0 }; refreshReaders();
  try {
    const m = await NeuralKit.load(e => {
      if (tok !== nToken || e.status !== 'progress' || !e.file) return;
      files[e.name + '/' + e.file] = [e.loaded || 0, e.total || 0]; const v = Object.values(files);
      nProg = { L: v.reduce((a, x) => a + x[0], 0), T: v.reduce((a, x) => a + x[1], 0) }; neuralBytes = nProg.T;
      if (!nRaf) nRaf = requestAnimationFrame(() => { nRaf = 0; if (nState !== 'loading') return; document.querySelectorAll('.nprog-t').forEach(x => { x.textContent = progText(); }); document.querySelectorAll('#loadov .lo-n > div, #nm-box .prog > div').forEach(x => { x.style.width = (nProg.T ? nProg.L / nProg.T * 100 : 0).toFixed(1) + '%'; }); if (nProg.T && nProg.L >= nProg.T) renderCard(); setStatus(`loading the neural reader ${(nProg.T ? nProg.L / nProg.T * 100 : 0).toFixed(0)}%`); });
    });
    if (tok !== nToken) return;
    neural.setStrategy('finetuned'); neural.setModels(m); models = m; nState = 'ready'; neuralLoadMs = performance.now() - t0;
    if (!neuralBytes) neuralBytes = nBytesHint();
    const fresh = !RD.neural.reads;
    sysNote(`SOP-BERT reader ready: ${neuralNames().join(' + ')} on the CPU, ${mb(neuralBytes)}${fromCache ? ' from the browser cache' : ''}, ${(neuralLoadMs / 1000).toFixed(1)} s.` + (fresh ? ' It starts from the Rules drawing.' : ''));
    adoptRules(RD.neural); if (isReady(RD.combined)) adoptRules(RD.combined);
  } catch (e) {
    if (tok !== nToken) return;
    console.error(e); nState = e && e.unpublished ? 'unpublished' : 'failed'; nError = e;
    if (nState === 'failed') sysNote('The neural model could not be loaded: ' + (e && e.message || e) + (e && e.files && e.files.length ? ` (while loading ${e.files.length === 1 ? e.files[0] : e.files.length + ' files; SOP-BERT › Settings lists them'})` : ''));
  }
  refreshReaders();
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-nact]'); if (!b) return;
  if (b.dataset.nact === 'retry') loadModels(false);
});

/* ---------------- reader subtabs: Drawing | SOP | Settings ---------------- */
const SUBS = [['drawing', 'Drawing'], ['sop', 'SOP Lang'], ['settings', 'Settings']];
const subbar = $('#subtabs'), rpanel = $('#rpanel');
function renderSub() {
  subbar.innerHTML = SUBS.map(([k, l]) => `<button type="button" role="tab" class="subtab" data-sub="${k}" aria-selected="${k === sub}">${l}</button>`).join('') + `<span class="of">${escH(cur.label)} reader</span>`;
  const draw = sub === 'drawing';
  $('#view-btn').hidden = !draw; $('#cfoot').hidden = !draw;
  if (draw) { rpanel.hidden = true; rpanel.innerHTML = ''; return; }
  const top = rpanel.hidden ? 0 : rpanel.scrollTop;
  rpanel.hidden = false;
  rpanel.innerHTML = sub === 'sop' ? renderWorld(cur) : renderReaderSettings(cur);
  rpanel.scrollTop = top;
}
function setSub(k) { if (k === sub || !SUBS.some(x => x[0] === k)) return; sub = k; renderSub(); renderCard(); if (k === 'drawing') renderCanvas(); }
subbar.addEventListener('click', ev => { const b = ev.target.closest('[data-sub]'); if (b) setSub(b.dataset.sub); });
rpanel.addEventListener('change', ev => {   // SOP-BERT › Settings: the level of the neural gate (GATES.neural)
  if (ev.target.name === 'modern-gate') {
    modernGate = NON_DEFAULT.includes(ev.target.value) ? ev.target.value : 'cost'; store.set(MGATE_KEY, modernGate === 'cost' ? null : modernGate);
    sysNote(`ModernBERT now ${gateDoes(modernGate)}.`); renderGateBadges(); if (sub === 'settings') renderSub(); return;
  }
  if (ev.target.name !== 'neural-gate') return;
  const l = NON_DEFAULT.includes(ev.target.value) ? ev.target.value : 'cost'; neuralGate = l === 'cost' ? null : l; store.set(NGATE_KEY, neuralGate);
  sysNote(`SOP-BERT now ${gateDoes(l)}.`); renderGateBadges();
  if (sub === 'settings') renderSub();
});
rpanel.addEventListener('change', ev => {   // VSS-BERT › Settings: a cost level or execute all
  if (ev.target.name !== 'comb-gate') return;
  combGate = NON_DEFAULT.includes(ev.target.value) ? ev.target.value : 'cost'; store.set(CGATE_KEY, combGate === 'cost' ? null : combGate);
  sysNote(`VSS-BERT now ${gateDoes(combGate)}.`); renderGateBadges();
  if (sub === 'settings') renderSub();
});
rpanel.addEventListener('change', ev => {
  if (ev.target.name === 'vss-gate' && GATE_LEVELS.includes(ev.target.value)) { vssGate = ev.target.value; store.set(GATE_KEY, vssGate === GATE_DEFAULT ? null : vssGate); sysNote(`VSS now ${gateDoes(vssGate)}.`); renderGateBadges(); if (sub === 'settings') renderSub(); }
});
rpanel.addEventListener('click', ev => { const h = ev.target.closest('[data-help]'); if (h) { openHelp(h.dataset.help); return; } const b = ev.target.closest('[data-open]'); if (b) openSheet('settings', b.dataset.open); });
/* A tab that is not at its safety threshold says so all the time (owner's session 2026-11-03: VSS-BERT had been left on "execute all" in that
   browser and nothing on the screen showed it): an amber badge per such tab in the chat's header, "VSS-BERT: execute all", which opens that
   tab's Settings, and "Back to the safety threshold", which sets every tab back to its default level in one click. */
const gateTabs = () => [['combined', combGate], ['vss', vssGate], ['neural', neuralGate || 'cost'], ['modernbert', modernGate]];
function renderGateBadges() {
  const box = $('#gate-badges'); if (!box) return;
  const off = gateTabs().filter(([id, l]) => l !== GATE_DEFAULT && RD[id]);
  box.hidden = !off.length;
  box.innerHTML = off.map(([id, l]) => `<button type="button" class="gbadge" data-gtab="${id}" title="${escH(`${RD[id].label} ${gateDoes(l)}. Click to open its Settings.`)}">${escH(RD[id].label)}: ${escH(gateLabel(l))}</button>`).join('')
    + (off.length ? `<button type="button" class="gback" id="gate-reset" title="${escH(off.length > 1 ? 'Set every tab back to its safety threshold' : `Set ${RD[off[0][0]].label} back to its safety threshold`)}">Back to the safety threshold</button>` : '');
}
$('#gate-badges').addEventListener('click', ev => {
  const b = ev.target.closest('[data-gtab]');
  if (b) { setActive(b.dataset.gtab); if (sub === 'settings') renderSub(); else setSub('settings'); return; }
  if (ev.target.closest('#gate-reset')) {
    const was = gateTabs().filter(([, l]) => l !== GATE_DEFAULT).map(([id]) => RD[id].label);
    combGate = 'cost'; store.set(CGATE_KEY, null); vssGate = GATE_DEFAULT; store.set(GATE_KEY, null); neuralGate = null; store.set(NGATE_KEY, null);
    modernGate = 'cost'; store.set(MGATE_KEY, null);
    sysNote(`${listing(was)} ${was.length > 1 ? 'are' : 'is'} back at the safety threshold: ${gateDoes('cost')}.`);
    renderGateBadges(); if (sub === 'settings') renderSub();
  }
});
renderGateBadges();
function vssStatusHTML() {
  return escH(vssState === 'ready' ? (vssInfo.composer ? `Ready: ${vssInfo.worlds.length} micro-worlds, ${mb(vssInfo.bytes)}, loaded in ${(vssInfo.loadMs / 1000).toFixed(1)} s.`
    : `Ready: D ${vssInfo.D}, ${vssInfo.bits || 8}-bit route book, ${mb(vssInfo.bytes)}, loaded in ${(vssInfo.loadMs / 1000).toFixed(1)} s.`) : vssState === 'failed' ? 'Failed: ' + (vssError && vssError.message || vssError) : `Loading (about ${mb0(VSS_HINT)} from this site)…`);
}
/** the levels of a column of the vote file in the settings (VSS and SOP-BERT tabs): the table of levelTableHTML with the file's numbers of
 *  each level on the calibration part (level_stats) and its thresholds for commands and questions */
function columnLevelsHTML(name, col, chosen, fallbackNote) {
  const spec = vconf.spec, C = spec && spec.columns[col], pc = v => (v * 100).toFixed(1) + '%';
  if (!spec) { const again = () => { if (sub === 'settings') renderSub(); }; if (!vconf.error) voteSpec().then(again, again); }
  const num = v => typeof v === 'number' ? v.toFixed(4) : v;
  const row = l => { const x = C && C.levels[l], st = C && C.level_stats && C.level_stats[l] && C.level_stats[l].calibration_oof;
    return { level: l, num: st ? { right: st.done_right, wrong: st.confidently_wrong == null ? NaN : st.confidently_wrong, asked: st.asked } : null,
      acts: l === 'all' ? '' : x ? `acts from confidence ${num(x.command ?? x.all)} for commands, ${num(x.question ?? x.all)} for questions` : C ? 'not in the model file: the safety threshold is used' : '' }; };
  const state = !spec ? `<p class="note">${vconf.error ? `The model of the votes could not be loaded (${escH(vconf.error.message || vconf.error)}): ${escH(fallbackNote)}.` : 'Loading the model…'}</p>` : '';
  const cal = C && C.calibration_oof, te = C && C.test;
  return state + levelTableHTML(name, chosen, GATE_LEVELS.map(row)) + `<p class="note">${escH(LEVELS_NOTE)} A level other than the default is kept in this browser.</p>`
    + (C ? `<p class="note">At the safety threshold, on the calibration part (out-of-fold scores): cost score ${cal.score.toFixed(1)}; on the test part ${te.score.toFixed(1)}, ${pc(te.done_right)} of the requests done right, ${pc(te.confidently_wrong)} of what it executed wrong. Model <code>confidence/vote3.json</code>${vconf.url && /[?&]v=/.test(vconf.url) ? `, version <code>${escH(decodeURIComponent(vconf.url.split('v=').pop()))}</code>` : ''}, column <code>${escH(col)}</code> (${escH(C.variant)}).</p>` : '');
}
/** VSS › Settings: the level of the gate (see GATES): the confidence with the votes (vote3.json column vss) */
function gateSettingsHTML() {
  const info = window.VSSFormalizer && window.VSSFormalizer.confidenceInfo ? window.VSSFormalizer.confidenceInfo() : null;
  return `<h3 class="sub">When VSS acts</h3>
  <p class="intro">VSS executes a request only when its confidence clears the threshold of the level chosen here (by default its safety threshold: the one that scores best when a confident mistake costs as much as 10 right answers; “boldest”, “very bold”, “bolder” and “more careful” are the same rule with a mistake counted as 1, 2, 5 or 20 right answers, see the table below); below it, it does not execute the request, says why it is not sure and offers <b>Do it anyway</b>. The confidence combines 13 numbers from VSS’s own chain (the cut, the world, the reading, the words, the context filler) with <b>whether SOP-BERT and the Rules, reading the same request (VSS’s own cut: they read the VSS cutter’s requests for this), read it the same way</b> (and whether the Rules had a note about it). Commands and questions have their own threshold. It was fitted on the calibration part of the fresh2 and short3 messages, from out-of-fold scores (the refit of 2026-11-03 for the 9 worlds: votes as inputs, no world prior, a threshold for commands and one for questions), and on the test part it did better than VSS’s confidence without the votes: cost score 22.9 against 4.8, difference +18.2 (95% interval 11.9 to 24.7), 37.8% of the requests done right instead of 5.3%. So a held request’s reason first says who reads it differently (“SOP-BERT reads colour ‘red’ instead of colour ‘blue’”), then what VSS itself was unsure of. When SOP-BERT has not read the message (still loading, or not available), VSS uses its confidence without the votes (<code>confidence/vss.json</code>${info && info.version ? `, version <code>${escH(info.version)}</code>` : ''}) at the same level, and the details say so.</p>
  ${columnLevelsHTML('vss-gate', 'vss', vssGate, 'VSS uses its confidence without the votes (vss.json)')}`;
}
/** what every reader's Settings subtab starts with: its drawing and what it has read */
function readerFacts(rd) {
  const S = rd.world.state, n = S.shapes.length, m = S.edges.length, u = rd.world.undoStack.length;
  return `<table class="kv"><tr><td>State</td><td>${escH(isReady(rd) ? 'ready' : offText(rd).replace(/, did not read this$/, '').replace(/ \(see SOP-BERT › Settings\)$/, '').replace(/; see SOP-BERT › Settings\)$/, ')'))}</td></tr><tr><td>Messages read</td><td>${rd.reads}</td></tr><tr><td>Its drawing</td><td>${n} shape${n === 1 ? '' : 's'} · ${m} link${m === 1 ? '' : 's'} · ${u} step${u === 1 ? '' : 's'} to undo</td></tr><tr><td>Requests cut by</td><td>${escH(cutLabel(OWN_CUT[rd.id]))} (${rd.id === 'qwen' ? 'the words it quotes for each request; no confidence is fitted' : rd.id === OPUS.id ? 'written offline by the generation model, played as saved; no confidence' : 'its own cutter: the cut its confidence was fitted on'})</td></tr></table>`;
}
const sharedNote = `<p class="intro">SOP Lang (the commands every reader writes) and the engine’s capabilities are the same for every reader. Help explains both: <button type="button" class="btn" data-help="sop-lang">SOP Lang</button> <button type="button" class="btn" data-help="capabilities">Capabilities</button> <button type="button" class="btn" data-help="architecture">How it works inside</button></p>`;
function renderReaderSettings(rd) {
  if (rd.id === OPUS.id) return trSettingsHTML(rd);
  if (rd.id === 'saved') return `<h3 class="sub">gpt-6.1-sol saved examples</h3><p class="intro">These are saved example translations generated by gpt-6.1-sol, not live inference. Use the unchanged built-in Examples buttons or player. Custom or edited scripts have no saved translation. Direct SOP input runs as your input. No model download or confidence gate is used.</p><p class="intro">Each example uses this tab’s own drawing and history. Global clear, defaults and questions use the current drawing; earlier drawings can change answers. Changing the drawing or history outside a running example makes its later saved turns unavailable. Partial and unsupported translations say why. Message details show the original and effective input, saved and bound SOP, provenance, repairs and engine results.</p><pre class="sop">${escH(JSON.stringify(saved.info(), null, 2))}</pre>${sharedNote}`;
  if (rd.id === 'qwen') {
    const S = qwen ? qwen.S : null, R = S && S.reader, i = S && S.info, ck = S && S.check;
    return `<h3 class="sub">Qwen3 reader (experimental)</h3>${readerFacts(rd)}<div id="qwen-box">${qwenBoxHTML()}</div>
      <p class="intro">Qwen3-0.6B, a general instruction model, not trained on this editor: it is given the legend (every action, question, key and value) and two annotated messages, and writes its requests as JSON that a grammar keeps to the form. Before anything runs, the whole output is checked: the form, every act, key and value against the legend, the quoted words against the message, the names against the drawing and the request, the references and their order. It reads into its own drawing and takes no part in the votes or in VSS-BERT.</p>
      <p class="intro"><b>When Qwen3 acts: never by itself.</b> A threshold would have to be chosen on calibration messages by the rule the other readers follow (the cost score, out of fold); no such readings of Qwen3 exist yet, so every request is held, at every level, and says why. Do it anyway runs one checked reading (a request that failed the checks cannot run). Its score (the weakest field's mean token log-probability, from the model's own probabilities before the grammar) is shown in the details; it is a ranking number, not a probability of being right.</p>
      <table class="kv"><tr><td>Model</td><td><code>${escH(R ? R.model.repo + '/' + R.model.file : 'Qwen/Qwen3-0.6B-GGUF/Qwen3-0.6B-Q8_0.gguf')}</code>${R ? `, revision <code>${escH(R.model.revision.slice(0, 12))}</code>, ${R.model.bytes.toLocaleString('en')} bytes, SHA-256 <code>${escH(R.model.sha256.slice(0, 16))}…</code>` : ''}${i ? ` (checked in this browser${i.source === 'cache' ? ', from its cache' : ''})` : ''}</td></tr>
      <tr><td>Runtime</td><td>wllama 3.8.1 (llama.cpp ${escH(i && i.libllama || 'b11364-46ca246')}), WASM, CPU only (no GPU layers), ${i ? i.threads : 1} thread${i ? `, ${i.multithread ? 'multi-threaded' : 'single-threaded'}` : ''}; thinking off by the chat template's own switch</td></tr>
      ${R ? `<tr><td>Prompt</td><td>${R.prompt_chars.toLocaleString('en')} characters, SHA-256 <code>${escH(R.prompt_sha256.slice(0, 16))}…</code>; examples ${escH(R.examples.map(e => e.id).join(', '))}</td></tr>` : ''}
      ${ck ? `<tr><td>First check</td><td>“${escH(ck.sentence)}” read in ${(ck.ms / 1000).toFixed(0)} s${ck.usage ? ` (${ck.usage.prompt_tokens} prompt tokens, ${ck.usage.completion_tokens} generated)` : ''}: ${ck.ok ? 'passed' : 'failed'}</td></tr>` : ''}</table>${sharedNote}`;
  }
  if (rd.id === 'modernbert') {
    const spec = modern.conf.spec, NC = ncNow;
    const row = level => {
      const x = spec?.levels_out_of_fold?.[level];
      return { level, num: x ? { right: x.heldout_oof_coverage, wrong: Number.isFinite(x.heldout_oof_precision) ? 1 - x.heldout_oof_precision : NaN, asked: x.heldout_oof_asked } : null,
        acts: level === 'all' ? '' : NC && spec && Number.isFinite(NC.threshold(spec, level)) ? `acts from confidence ${NC.threshold(spec, level).toFixed(4)}` : 'confidence unavailable: every request is held' };
    };
    return `<h3 class="sub">ModernBERT reader</h3>${readerFacts(rd)}<div id="modern-box">${modernBoxHTML()}</div>
      <p class="intro">An independent ModernBERT diagram parser with its own trained action, role, value, name and cut heads. It reads into its own drawing and uses only its own confidence. Its settings do not change SOP-BERT, the votes or VSS-BERT.</p>
      <p class="note">Model <code>neural/modernbert</code>${modern.status?.info?.['ours/modernbert'] ? `, version <code>${escH(modern.status.info['ours/modernbert'].version)}</code>` : ''}. Confidence <code>confidence/modernbert.json</code>${modern.conf.url ? ` (<a href="${escH(modern.conf.url)}" target="_blank" rel="noopener">source</a>)` : ''}. ${modern.conf.error ? escH(modern.conf.error.message) + '. Every request is held.' : spec ? 'Loaded.' : 'Not loaded.'}</p>
      <p class="note">Requests are limited to 128 pieces and messages to 512. A request that exceeds the limit is held; an omitted message suffix is reported as unread. Missing confidence or a missing safety threshold holds every request, including at Execute all.</p>
      ${levelTableHTML('modern-gate', modernGate, GATE_LEVELS.map(row))}${sharedNote}`;
  }
  if (rd.id === 'combined') return combinedSettingsHTML() + sharedNote;
  if (rd.id === 'rules') return `<h3 class="sub">Rules reader</h3>${readerFacts(rd)}
  <p class="intro">Hand-written code (<code>docs/js/logic.js</code>, ${mb(rulesBytes())}): it cuts the message into requests, finds the action by its cue words and answers the SOP Lang questions from the words around it. Nothing to download and nothing to choose; it reads every message at once.</p>${sharedNote}`;
  if (rd.id === 'vss') {
    const vrows = vssState === 'ready' && vssInfo.composer ? `<table class="kv">${vssInfo.worlds.map(w => `<tr><td><code>${escH(w.model)}</code></td><td>${escH(w.events.join(', '))}</td><td>${mb(w.bytes)}</td></tr>`).join('')}<tr><td>cutters, registry</td><td>which world reads which request</td><td>${mb(vssInfo.cutterBytes)}</td></tr></table>` : '';
    return `<h3 class="sub">VSS reader</h3>${readerFacts(rd)}<div class="actions"><span class="status" id="vss-st">${vssStatusHTML()}</span></div>
    <p class="intro">Nine small VSS readers (micro-worlds), each trained on a few actions of SOP Lang (VSA route books, no transformer). The world cutter names the worlds that could read each request (it also cuts the message: the VSS cutter, this tab’s own cut); each of those worlds reads it, and the reading that leaves the fewest words not understood is kept (no drawing is passed to a world). A tie, and a reference such as “it” or a role left empty, go to the context filler, which fills it from the conversation and the names on the canvas when one candidate ranks first, and asks otherwise (the rule of 2026-11-01). In a world with several actions, a request without a verb (“Hub teal”) gets its action from a second cutter (the event hint). The files come from this site and load when the page opens.</p>
    <p class="intro"><button type="button" class="btn" data-help="vss-reader">How the VSS reader works</button> <button type="button" class="btn" data-help="vss-worlds">What a VSS world is</button></p>
    ${gateSettingsHTML()}
    ${vssState === 'ready' ? '<h3 class="sub">Worlds: actions and sizes</h3>' + vrows : ''}`;
  }
  const N = NeuralKit.NAMES, A = NeuralKit.ABOUT, info = nStatus ? nStatus.info : {}, ids = NeuralKit.modelsFor();
  const size = id => { const b = NeuralKit.bytesOf(id); return b ? mb(b) : 'size not known yet'; };
  const facts = id => { const f = info[id] && info[id].facts; if (!f) return ''; const p = [f.base && `base model <code>${escH(f.base)}</code>`, f.spans && `${escH(f.spans)} annotated requests`, f.heldout && `held-out act accuracy ${(+f.heldout * 100).toFixed(1)}%`].filter(Boolean); return p.length ? ` (${p.join(', ')})` : ''; };
  const row = (label, id) => `<label>${label}</label><div>${escH(N[id] || id)} · ${size(id)}<div class="note">${escH(A[id] || '')}${facts(id)}.${info[id] ? `${info[id].readme ? ` <a href="${escH(info[id].readme)}" target="_blank" rel="noopener">README</a> ·` : ''} version <code>${escH(info[id].version)}</code>` : ''}</div></div>`;
  return `<h3 class="sub">SOP-BERT reader</h3>${readerFacts(rd)}
  <p class="intro">SOP-BERT: one DistilBERT model of ours, fine-tuned on the same annotated requests as the VSS worlds, run in this browser. In two calls per message (the cut, then all its requests at once) it reads, for every request, the action, the value of each SOP Lang key, who fills each role (a name written in the request, “it”, or a description such as “the red circle”) and the words that are names, labels and numbers; the SOP Lang wires are then assembled by the legend. It does not use the Rules reader. It carries out a request only when its confidence clears the threshold chosen below, and asks about the rest. Its cut head is the BERT cutter: the cut this tab and VSS-BERT read. The files come from this site, load by themselves when the page opens, and stay in this browser’s cache.</p>
  <p class="intro"><button type="button" class="btn" data-help="neural-reader">How SOP-BERT works</button> <button type="button" class="btn" data-help="bert">What we do with BERT</button></p>
  <div class="form">
    ${ids.map((id, i) => row(ids.length > 1 ? ['Act', 'Answers'][i] || 'Model' : 'Model', id)).join('')}
    <label>Device</label><div>CPU (WASM), ${escH(NeuralKit.dtypeText())}</div>
  </div>
  <div class="nbox" id="nm-box">${neuralBoxHTML()}</div>
  ${neuralGateSettingsHTML()}`;
}
/** SOP-BERT › Settings: the level of the neural gate (GATES.neural): the confidence with the votes (vote3.json column sop) */
function neuralGateSettingsHTML() {
  return `<h3 class="sub">When SOP-BERT acts</h3>
  <p class="intro">SOP-BERT executes a request only when its confidence clears the threshold of the level chosen here (by default its safety threshold, the one that scores best when a confident mistake costs as much as 10 right answers; “boldest”, “very bold”, “bolder” and “more careful” count a mistake as 1, 2, 5 or 20 right answers, see the table below); below it, it does not execute the request, says why it is not sure and offers <b>Do it anyway</b>. The confidence combines 24 numbers read from the model’s own outputs for that request (the action, the values, who fills each role, the word tags, the cut, the word pieces, how often its action is read right) with <b>whether VSS and the Rules, reading the same request (they read the BERT cutter’s requests for this), read it the same way</b> (and whether the Rules had a note about it). Commands and questions have their own threshold. It was fitted on requests of the BERT cutter, on the calibration part of the fresh2 and short3 messages, from out-of-fold scores (the refit of 2026-11-03 for the new SOP-BERT: votes as inputs, a threshold for commands and one for questions); on the test part it scored 33.4 against 29.3 for SOP-BERT’s confidence without the votes, difference +4.0 (95% interval −2.4 to 9.8: not shown either way), confidently wrong on 2.5% of what it executed instead of 3.0%. A held request’s reason first says who reads it differently, then what SOP-BERT itself was unsure of. When VSS has not read the message (still loading, or not available), SOP-BERT uses its confidence without the votes (<code>confidence/sop-bert.json</code>${nconf.url && /[?&]v=/.test(nconf.url) ? `, version <code>${escH(decodeURIComponent(nconf.url.split('v=').pop()))}</code>` : ''}) at the same level.</p>
  ${columnLevelsHTML('neural-gate', 'sop', neuralGate || 'cost', 'SOP-BERT uses its confidence without the votes (sop-bert.json)')}`;
}
sbody.addEventListener('click', async ev => {
  const q = ev.target.closest('[data-quick]'); if (q) {
    const exampleId = q.dataset.example, original = q.dataset.quick, token = deactivatePlayer(true);
    closeSheet();
    queue = queue.then(async () => {
      await savedLoad; await trNow(); if (token !== player.token) return;
      const entry = saved.entry(exampleId), fixed = renamedForCanvas([original], entry), opusMap = trMapSync(exampleId, fixed.map);
      saved.invalidate();
      try { await saved.begin(exampleId, [original], fixed.turns, fixed.map, token); } catch (e) { console.error(e); }
      if (token !== player.token) return;
      await run(fixed.turns[0], undefined, { via: 'example', saved: { exampleId, turn: 0, original, runToken: token }, opusMap });
      if (token === player.token) player.busy = false;
    }).catch(e => { console.error(e); }); return;
  }
  const op = ev.target.closest('[data-open]'); if (op) { openSheet('settings', op.dataset.open); return; }
  const hp = ev.target.closest('[data-help]'); if (hp) { openHelp(hp.dataset.help); return; }
  const b = ev.target.closest('[data-sc]');
  if (b) {
    const sc = SCENARIOS.find(x => x.id === b.dataset.sc);
    if (b.dataset.how === 'edit') { const t = $('#sc-text'); t.value = `# ${sc.title}\n` + sc.turns.join('\n'); t.focus(); t.scrollIntoView({ block: 'center' }); return; }
    startScript(sc.title, sc.turns.slice(), b.dataset.how, { names: sc.names !== false, exampleId: `${sc.kind === 'scene' ? 'scene' : 'scenario'}:${sc.id}` }); return;
  }
  const o = ev.target.closest('[data-own]');
  if (o) { const v = $('#sc-text').value, turns = parseScript(v); if (!turns.length) { $('#sc-status').textContent = 'Write at least one line first.'; return; } startScript((v.match(/^\s*#\s*(.+)$/m) || [])[1] || 'Your script', turns, o.dataset.own); return; }
});
sbody.addEventListener('change', ev => {
  const ck = ev.target.closest('[data-chat]');
  if (ck) {   // Replies in the chat: at least one tab stays chosen
    if (ck.checked) chatTabs.add(ck.dataset.chat); else if (chatTabs.size > 1) chatTabs.delete(ck.dataset.chat); else { ck.checked = true; return; }
    const ids = READERS.map(r => r.id).filter(i => chatTabs.has(i)); store.set(CHAT_KEY, ids.join(',') === CHAT_DEFAULT.join(',') ? null : ids.join(','));
    sysNote(`The chat now shows the replies of ${listing(ids.map(i => RD[i].label))}.`); return;
  }
  if (ev.target.id === 'spell-on') { spellEnabled = ev.target.checked; store.set(SPELL_OFF, spellEnabled ? null : '1'); sysNote(`Spelling check ${spellEnabled ? 'on' : 'off'}.`); return; }
  if (ev.target.id === 'sc-file' && ev.target.files[0]) {
    const f = ev.target.files[0], rd = new FileReader();
    rd.onload = () => { $('#sc-text').value = String(rd.result); $('#sc-status').textContent = `Loaded ${f.name}: ${parseScript(String(rd.result)).length} messages.`; };
    rd.onerror = () => { $('#sc-status').textContent = `Couldn't read ${f.name}.`; };
    rd.readAsText(f); ev.target.value = '';
  }
  const pl = ev.target.closest('[data-plug]');
  if (pl) { setPlug(pl.dataset.plug, pl.checked); sbody.innerHTML = renderPlugins(); }
});

/* ---------------- Help overlay and settings (docs/js/help.js, docs.js; their lists are read from the legend) ---------------- */
/** what the help pages need: the engine (legend, plugins), the canvas drawing code for their small drawings, and facts to quote */
function helpEnv() {
  let nb = neuralBytes; try { if (!nb) nb = nBytesHint(); } catch (e) { }
  return { K, engine, drawShape, drawEdge, drawGroups, startMessages: START, vssBytes: vssInfo && vssInfo.bytes ? vssInfo.bytes : VSS_HINT, neuralBytes: nb,
    neuralModels: neuralNames() };
}
/** a capability switch (Settings › Capabilities or Help › Capabilities): the same for every reader */
function setPlug(name, on) {
  for (const rd of READERS) if (rd.id !== 'qwen') rd.engine.plugin(name).enabled = on;
  qwenJob(() => { RD.qwen.engine.plugin(name).enabled = on; });
  const p = engine.plugin(name); sysNote(`${(HelpKit.CAPS[p.name] || p).t || p.title} switched ${p.enabled ? 'on' : 'off'} for every reader`);
}
/** ⋮ › Settings: the replies in the chat, the collected requests, the spell checker (it acts before every reader) */
const renderSettings = () => chatSettingsHTML() + (collectUI ? collectUI.settingsHTML() : '') + `<h3 class="sub">Before every reader</h3><p class="intro">The spell checker acts before every reader. Then each tab cuts the message into requests with its own cutter, the one its confidence was fitted on (each tab’s Settings says which). <button type="button" class="btn" data-help="spelling">Spell checker</button> <button type="button" class="btn" data-help="cutting">Each tab’s cutter</button></p>` + spellHelpHTML()
  + `<div class="help"><h3 class="sub">Help</h3><p class="note">How to use the editor, SOP Lang, the concepts and the architecture are in Help: the <b>?</b> button above the drawing. <button type="button" class="btn" data-help="start">Open Help</button></p></div>`;
/** ⋮ › Settings › Replies in the chat: which tabs' replies the chat shows (see CHAT_KEY) */
function chatSettingsHTML() {
  return `<div class="help"><h3 class="sub">Replies in the chat</h3>
  <p class="note">Every tab reads every message into its own drawing; choose whose replies the chat shows. By default only VSS-BERT’s, so the conversation reads as one reply. <b>details</b> under a reply always shows every reader.</p>
  ${READERS.map(rd => `<label style="display:flex;gap:8px;align-items:center;margin:4px 0;cursor:pointer"><input type="checkbox" data-chat="${rd.id}" ${chatTabs.has(rd.id) ? 'checked' : ''}> <span>${escH(rd.label)}${CHAT_DEFAULT.includes(rd.id) ? ' (default)' : ''}</span></label>`).join('')}</div>`;
}
/** the spell checker's switch, in ⋮ › Settings (it acts before every reader, so it is not one reader's setting) */
function spellHelpHTML() {
  const P = speller && speller.params;
  const about = P ? `A word that no reader knows is replaced by the most similar known word when the similarity of their letter groups (VSA character n-grams, D ${P.D}) is at least ${P.threshold} and ${P.margin} above the next word. Known words: ${speller.size()} (the VSS worlds’ words, the legend’s values and cue words) and the names on the canvas; ${speller.keepSize()} more words of the training messages are left alone. Never changed: quoted text, numbers, words of one or two letters, the word after “named” or “called”, and capitalised names that are not on the canvas. A name the message introduces (“named RoboHand”, “call it Nose”, “Name: Kitchen”) counts as a canvas name for the rest of that message.`
    : 'The spell checker’s vocabulary is not loaded (yet).';
  return `<div class="help"><h3 class="sub">Spelling</h3>
  <label style="display:flex;gap:8px;align-items:flex-start;margin:0 0 6px;cursor:pointer"><input type="checkbox" id="spell-on" ${spellEnabled ? 'checked' : ''}> <span>Correct typos before the readers read a message (“gree circle” → “green circle”). Every reader reads the corrected text; your message shows what was changed, and <b>details</b> shows the typed and the corrected text.</span></label>
  <p class="note">${escH(about)}</p></div>`;
}
const renderPlugins = () => HelpKit.capSwitches(helpEnv());
function renderWorld(rd) {
  const w = rd.world, S = w.state, lines = [];
  for (const s of S.shapes) lines.push(hlNode({ id: s.name, type: 'shape', args: Object.assign({ shape: s.shape, size: K.sizeName(s.size), color: s.color }, s.outline ? { outline: s.outline } : {}, s.label ? { label: s.label } : {}, { at: [s.x, s.y] }) }));
  for (const e of S.edges) lines.push(hlNode({ id: e.id, type: 'edge', args: Object.assign({ from: { ref: e.from }, to: { ref: e.to }, style: e.style, arrow: e.arrow }, e.color ? { color: e.color } : {}, e.label ? { label: e.label } : {}) }));
  for (const r of S.rules) { const a = {}; ['shape', 'size', 'color', 'outline'].forEach(k => { if (r[k]) a[k] = r[k]; }); lines.push(hlNode({ id: r.id, type: 'rule', args: a })); }
  for (const g of S.groups || []) lines.push(hlNode({ id: g.name, type: 'group', args: { members: g.members.map(m => ({ ref: m })) } }));
  if (!lines.length) lines.push('<span class="cm"># empty</span>');
  const last = rd.id === OPUS.id && trLast ? (() => { const sv = trLast.saved, e = sv.entry;
    return `<h3 class="sub">The last saved program it played</h3><p class="intro">Message ${trLast.turn}, built-in example <code>${escH(sv.prov.example + '#' + sv.prov.turn)}</code>, from <code>${escH(`${OPUS.dir}${e.file}`)}</code>, lines ${+e.lines[0]}–${+e.lines[1]}${sv.renamed.length ? `, with the scenario's renames (${escH([...new Set(sv.renamed.map(r => `${r.from} → ${r.to}`))].join(', '))})` : ''}:</p><pre class="sop">${sv.nodes.map(hlNode).join('\n')}</pre><h3 class="sub">Its drawing</h3>`; })() : '';
  return `${last}${isReady(rd) ? '' : `<p class="intro">This reader is ${escH(offText(rd).replace(/, did not read this$/, '').replace(/ \(see SOP-BERT › Settings\)$/, ''))}; its Settings subtab shows how to load it.</p>`}<p class="intro">The ${escH(rd.label)} reader’s drawing, written back as SOP Lang wires. This is what a backend such as Datalog, Prolog or Z3 would receive after lowering. ${w.undoStack.length} step${w.undoStack.length === 1 ? '' : 's'} can be undone.</p><pre class="sop">${lines.join('\n')}</pre>`;
}

/* ---------------- composer ---------------- */
const ta = $('#say');
const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(128, ta.scrollHeight) + 'px'; };
ta.addEventListener('input', grow);
// the messages typed in this box, oldest first (this page only, like a shell's history). ArrowUp on the first line of the box goes to the
// previous one, ArrowDown on the last line to the next one and, after the newest, back to the draft that was being typed. A recalled
// message can be edited; the edit is kept while walking the history, until a message is sent.
const sent = [], edits = new Map();
let histPos = 0, draft = '';
/** send the message box. metaIn: from the dictation dock (a spoken "send"); else the dock is asked whether the box holds its text
 *  (voice.consume: its meta, or {block} when the dock has text in another language that could not be translated: nothing is sent) */
function sendTyped(metaIn) {
  const v = ta.value; if (!v.trim()) return false;
  let meta = metaIn && metaIn.via ? metaIn : null;
  if (!meta && voice) { const m = voice.consume(v); if (m && m.block) return false; meta = m; }
  if (!meta) { meta = { via: 'typed' }; warnNotEnglish(v); }
  if (sent[sent.length - 1] !== v) sent.push(v);
  histPos = sent.length; draft = ''; edits.clear();
  if (pendingEdit) { const pe = pendingEdit; pendingEdit = null; collectEvent(pe.turn, { kind: 'edit-sent', reader: pe.reader, index: pe.index, sent: v, same: v.trim() === pe.suggested.trim() }); }
  ta.value = ''; grow(); submit(v, undefined, meta);
  return true;
}
/* A message typed straight into the box that is likely not English (the readers read English only): a cheap check, with no word list of
   any other language: of its words of two letters or more that are not names on the canvas, how many the spell checker's vocabulary knows
   (the readers' words and the training messages' words). Under half, with at least 3 such words: the chat says once how to dictate or
   translate. It never blocks the message. */
let warnedLang = false;
function notEnglishShare(text) {
  if (!speller) return null;
  const names = new Set(canvasNames(cur).map(n => String(n).toLowerCase()));
  const ws = (String(text).match(/[\p{L}]+/gu) || []).filter(w => w.length >= 2 && !names.has(w.toLowerCase()));
  if (ws.length < 3) return null;
  const known = ws.filter(w => /^[a-z]+$/i.test(w) && (speller.has(w) || speller.kept(w))).length;
  return 1 - known / ws.length;
}
function warnNotEnglish(text) {
  if (warnedLang) return;
  const share = notEnglishShare(text);
  if (share == null || share <= 0.5) return;
  warnedLang = true;
  sysNote('This message does not look like English, and the readers read English only. To write or speak in another language, use the dictation bar under the drawing: its language code opens its settings, and it translates to English on this device before sending.');
}
function recall(to) {
  if (to < 0 || to > sent.length || to === histPos) return false;
  if (histPos === sent.length) draft = ta.value; else if (ta.value !== sent[histPos]) edits.set(histPos, ta.value); else edits.delete(histPos);
  histPos = to;
  ta.value = to === sent.length ? draft : (edits.has(to) ? edits.get(to) : sent[to]);
  grow(); const n = ta.value.length; ta.setSelectionRange(n, n);
  return true;
}
const touchFirst = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
ta.addEventListener('keydown', ev => {
  if ((ev.key === 'ArrowUp' || ev.key === 'ArrowDown') && !ev.shiftKey && !ev.altKey && !ev.ctrlKey && !ev.metaKey && !ev.isComposing && ta.selectionStart === ta.selectionEnd) {
    const v = ta.value, at = ta.selectionStart;
    const firstLine = v.lastIndexOf('\n', at - 1) === -1, lastLine = v.indexOf('\n', at) === -1;
    if (ev.key === 'ArrowUp' && firstLine && recall(histPos - 1)) ev.preventDefault();
    else if (ev.key === 'ArrowDown' && lastLine && recall(histPos + 1)) ev.preventDefault();
    return;
  }
  if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing || ev.keyCode === 229) return;
  if (touchFirst && !ev.ctrlKey && !ev.metaKey) return; // phone keyboards: Enter adds a line, the button sends
  ev.preventDefault(); sendTyped();
});
const sendBtn = $('#send-btn');
sendBtn.addEventListener('pointerdown', ev => ev.preventDefault()); // keep the keyboard open
sendBtn.addEventListener('click', () => { sendTyped(); ta.focus({ preventScroll: true }); });
// the dictation dock under the drawing: speak or type in another language, sent in English (docs/js/voice.js; the original goes along as
// meta). Its spoken commands press the last "Do it anyway" or "Edit" of the chat, as a click would.
const clickLast = sel => { const bs = [...msgs.querySelectorAll(sel)].filter(b => !b.disabled); const b = bs[bs.length - 1]; if (!b) return false; b.click(); return true; };
const voice = window.VoiceKit && $('#dock') ? VoiceKit.mount({ dock: $('#dock'), composer: ta, send: m => sendTyped(m),
  actions: { anyway: () => clickLast('.held button.anyway'), edit: () => clickLast('.held button.edit') },
  names: () => world.state.shapes.map(s => s.name).concat((world.state.groups || []).map(g => g.name)) }) : null;
if (voice && voice.setNames) dockNames = voice.setNames;

/* Fit the app to the visible area, so the composer stays above the on-screen keyboard. */
const appEl = document.querySelector('.app');
function fitViewport() {
  const vv = window.visualViewport; if (!vv) return;
  const full = window.innerHeight, h = Math.round(vv.height);
  appEl.style.setProperty('--app-h', h + 'px');
  appEl.classList.toggle('kb', full - h > 120 && window.matchMedia('(max-width: 860px)').matches);
  if (vv.offsetTop) window.scrollTo(0, 0);
  msgs.scrollTop = msgs.scrollHeight;
}
if (window.visualViewport) { visualViewport.addEventListener('resize', fitViewport); visualViewport.addEventListener('scroll', fitViewport); fitViewport(); }
// the toolbar buttons are not language: their SOP wires go straight to every loaded reader (each undoes or clears its own drawing)
document.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', () => submit(b.dataset.say, b.dataset.sop)));
$('#view-btn').addEventListener('click', () => { zv.k = 1; zv.dx = 0; zv.dy = 0; const narrow = svg.clientWidth < 640, focused = view === 'focus' || (view === 'auto' && narrow); view = focused ? 'all' : 'focus'; renderCanvas(); });
window.addEventListener('resize', () => { if (!drag) renderCanvas(); activeTabInView(); });

/* ---------------- start ---------------- */
updateTabs(); renderCanvas(); setStatus(idleStatus());
{ const ids = READERS.map(r => r.id).filter(i => chatTabs.has(i)), def = ids.join(',') === CHAT_DEFAULT.join(',');
  botBubble({ text: 'Hi! Tell me what to draw, change or connect, or ask me about the drawing. I do what I am sure of; for the rest I say why I am not sure and show a clearer way to write it. ' + (def
    ? 'The replies here are VSS-BERT’s: VSS and SOP-BERT reading together. Rules, VSS and SOP-BERT also read every message, each into its own drawing: the tabs above the canvas switch between them, and ⋮ › Settings can show their replies here too.'
    : `The replies here are those of ${listing(ids.map(i => RD[i].label))} (⋮ › Settings › Replies in the chat); every tab reads every message into its own drawing, and the tabs above the canvas switch between them.`) + ' Tap + for examples and whole scenarios, ? for help.' }); }
/* the opening drawing (docs/js/start-diagram.js): a background, two zones, the items and their texts, as SOP Lang wires run by every
   reader's engine (not a message: no reader reads it); then its first question is sent as a message */
const START = [StartDiagram.SOP];
for (const rd of READERS) rd.engine.run(K.parse(StartDiagram.SOP));
renderCanvas(); updateTabs();
StartDiagram.MESSAGES.forEach(t => submit(t, undefined, { via: 'start' }));
queue.then(() => { READERS.forEach(rd => { rd.world.undoStack = []; }); renderSopBar(); });
// the Help overlay: opened by the ? button, by a data-help button, or by a link #help/<page> (also on reload)
DocsKit.init({ env: helpEnv, say: t => submit(t, undefined, { via: 'help' }), onPlug: (name, on) => { setPlug(name, on); if (!sheet.hidden && sheetTab === 'plugins') sbody.innerHTML = renderPlugins(); } });
ensureVSS();              // same site: no button, no question
checkNeural();            // our neural model loads by itself (from the browser cache when it is there)
checkModern();
if (QWEN_URL) loadQwen();   // opt-in (see the Qwen3 block): the URL lists qwen
/* a read-only summary for the browser tests and the console (training/sketch/test_scenes_menu.py): nothing here changes the page.
   turn(): the number of messages so far; view(): 'auto' | 'focus' | 'all'; steps(after): per tab, the messages after turn `after` that it
   did fully (executed every request it read, no engine error, nothing held), partly (executed something, held or failed something else) or
   not at all; area(id): the shapes of that tab's current area (its focus cell) and those whose body leaves the area's 800 x 500 canvas */
window.SketchpadInfo = Object.freeze({
  turn: () => turnSeq, view: () => view, names: () => showNames,
  saved: () => saved.info(),
  /** the Claude Opus 5.5 tab's part of one turn, and its manifest and counts (training/sop-translations/test_saved_sop_ui.mjs) */
  translationTurn: id => trTurnInfo(id),
  translations: () => JSON.parse(JSON.stringify({ id: OPUS.id, label: OPUS.label, loaded: !!trM, error: trErr ? String(trErr.message || trErr) : null, model: trM ? trM.model : null, coverage: trM ? trM.coverage : null, count: trCount })),
  /** a tab's drawing (its shapes, edges, groups, rules and undo depth), for comparing tabs */
  drawing: id => { const rd = RD[id]; if (!rd) return null; const S = rd.world.state; return JSON.parse(JSON.stringify({ shapes: S.shapes, edges: S.edges, groups: S.groups || [], rules: S.rules, frame: S.frame, undo: rd.world.undoStack.length, redo: rd.world.redoStack.length })); },
  world: id => RD[id] ? JSON.parse(JSON.stringify({ state: RD[id].world.snapshot(), undo: RD[id].world.undoStack, redo: RD[id].world.redoStack, last: RD[id].last, pending: RD[id].pending, held: RD[id].held, focusCell: RD[id].focusCell })) : null,
  savedTurn(id) {
    const rec = history.find(x => x.id === id), r = rec && rec.readers.saved;
    return r ? JSON.parse(JSON.stringify({ evidence: r.saved, nodes: (r.nodes || []).map(K.serialize), notes: r.notes, unavailable: !!r.unavailable, steps: r.result ? r.result.steps.map(s => ({ wire: K.serialize(s.node), value: s.value, answer: s.answer, error: s.error && s.error.message, skipped: s.skipped, patches: s.patches })) : [] })) : null;
  },
  /** Qwen3's part of one turn: its reply line, its wires (those executed and all it read), the gate and the evidence of the reading */
  qwenTurn(id) {
    const rec = history.find(x => x.id === id), r = rec && rec.readers.qwen; if (!rec) return null;
    const ser = ns => (ns || []).map(n => K.serialize(n));
    return JSON.parse(JSON.stringify({ end: rec.qwenEnd || null, off: rec.off.qwen || null, ms: rec.qwenMs || null, line: rec.qwenLine || null, raw: rec.raw,
      executed: r ? ser(r.nodes) : [], read: r ? ser(r.allNodes || r.nodes) : [], notes: r ? r.notes : [], error: r && r.error ? r.error.message : null,
      gate: r && r.gate ? { label: r.gate.label, units: r.gate.units.map(u => ({ index: u.index, src: u.src, execute: u.execute, blocked: !!u.blocked, score: u.score, reasons: u.reasons.map(x => x.text), nodes: ser(u.nodes) })) } : null,
      steps: r && r.result ? r.result.steps.map(st => ({ wire: K.serialize(st.node), error: st.error ? st.error.message : null, skipped: st.skipped || null, answer: st.answer || null, patches: st.patches.length })) : [],
      evidence: r && r.qwen && r.qwen.qwen ? Object.assign({}, r.qwen.qwen, { tokens: undefined, tokenCount: (r.qwen.qwen.tokens || []).length }) : null }));
  },
  /** Qwen3's state (training/sketch/diagram_e2e_live6.mjs): loaded or not, its queue, the turns it has finished, the load evidence */
  qwen: () => { const S = qwen ? qwen.S : null; return JSON.parse(JSON.stringify({ state: qwenState(), ready: qwenReady(), queued: qwenQueued, done: qwenDone, busy: !!(S && S.busy), stage: S && S.stage, progress: S && S.progress, error: S && S.error ? S.error.message : null, loadMs: S && S.loadMs, info: S && S.info ? Object.assign({}, S.info, { chatTemplate: undefined, chatTemplateChars: (S.info.chatTemplate || '').length }) : null, check: S && S.check, promptSha: S && S.promptSha, turns: history.filter(r => r.qwenEnd).map(r => ({ turn: r.id, end: r.qwenEnd, ms: r.qwenMs })) })); },
  steps(after) {
    const out = {};
    for (const rd of READERS) {
      let done = 0, partly = 0, none = 0;
      for (const rec of history.filter(x => x.id > after)) {
        const r = rec.readers[rd.id], steps = r && r.result ? r.result.steps.filter(st => st.node.type !== 'mention') : [];
        const ok = steps.filter(st => !st.error && !st.skipped).length, bad = steps.length - ok, held = r && r.gate ? r.gate.held.length : 0;
        if (ok && !bad && !held) done++; else if (ok) partly++; else none++;
      }
      out[rd.id] = { done, partly, none };
    }
    return out;
  },
  area(id) {
    const rd = RD[id], S = rd.world.state, f = rd.focusCell || S.frame || { x: 0, y: 0 };
    const mine = S.shapes.filter(s => { const c = K.cellOf(s.x, s.y); return c.x === f.x && c.y === f.y; });
    const off = mine.filter(s => { const d = K.dims(s); return s.x - d.w / 2 < f.x - 0.5 || s.y - d.h / 2 < f.y - 0.5 || s.x + d.w / 2 > f.x + 800.5 || s.y + d.h / 2 > f.y + 500.5; }).map(s => s.name);
    return { cell: f, shapes: mine.length, edges: S.edges.length, off };
  }
});
})();
