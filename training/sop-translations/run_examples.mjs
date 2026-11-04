// run_examples.mjs: plays every saved translation through the page's engine (docs/js/logic.js), the way the page's tab plays it, and checks
// what each wire did. Three ways of playing each example:
//   fresh   on an empty canvas (scenarios and scenes); each quick example alone on the opening drawing
//   page    as the + menu plays it on a freshly opened page: the opening drawing (start-diagram.js) is there, the scenario goes into a new
//           area (startScript's newArea), the names it declares that are taken are renamed (ui.js renamedForCanvas, from its source) and the
//           same renames are applied to the saved wires (saved-sop.js renameNodes: name-valued keys only)
//   again   the same example played a second time right after "page" (every declared name now clashes): the second area must come out like
//           the first, names aside
// Per wire it checks what the wire says against the drawing after it ran (a create's shape with its stated kind, colour, size, outline,
// label and place; a connection's ends, style, arrow, colour and label; a move, a restyle, a rename, a label, a group, a delete), and that a
// question got an answer. Problems: an engine error or question ("Which …?") in a turn, a wire whose effect is not what it says, a turn
// that changed nothing although it has commands, an area that differs on the second play. Warnings: a stated place moved by the engine.
//   node training/sop-translations/run_examples.mjs [--model claude-opus-5-5] [--only id,id] [--report file] [--json file]
// Exit 1 on a problem.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, K, examples, parseSopFile, openingSystem, newArea, pageRenames, gptEntries } from './lib.mjs';
import { renameNodes } from '../../docs/js/saved-sop.js';

const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const model = opt('--model') || 'claude-opus-5-5', only = opt('--only') ? opt('--only').split(',') : null;
const DIR = path.join(ROOT, 'docs/sop-translations', model);
const ENTRIES = await gptEntries();   // the effective names of a played example come from the gpt-6.1-sol tab's allocation (ui.js renamedForCanvas)
const MAN = fs.existsSync(path.join(DIR, 'manifest.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')) : null;
const problems = [], warnings = [], report = [], known = [];
/* problems that are explained and not caused by a translation (README.md "Limitations"); each is matched by occurrence, mode and text */
const KNOWN = [
  { at: /^[a-z]+#1 fresh$/, msg: /There are no shapes on the canvas|skipped \(it needs @m1\)|the commands changed nothing/, kind: 'scene', why: '"Clear the canvas" on an empty canvas: the engine answers that there is nothing to clear (the toolbar\'s Clear does the same)' },
];
/* examples whose messages name shapes by names the engine gave (automatic names such as rectangle1, square3, text1, and the names of
   group copies such as Finn2, Bot12): a name that a program refers to but that no program of the example creates. Those names exist on a
   fresh page (the "fresh" and "page" plays, which must be clean) but not on a second play (the engine's counters survive a clear, and a
   renamed group's copy gets another name), in every tab */
const autoNamed = new Map();   // example -> the engine-given names its programs refer to
const REF_KEYS = ['target', 'from', 'to', 'anchor', 'anchor2', 'members', 'linked'];
function engineGiven(P) {
  const made = new Set(), ref = new Set();
  for (const t of P.turns) for (const n of K.parse(t.program)) {
    if (n.type === 'command' && typeof n.args.name === 'string') made.add(n.args.name.toLowerCase());
    for (const k of REF_KEYS) for (const v of [].concat(n.args[k] || [])) if (typeof v === 'string') ref.add(v);
  }
  return [...ref].filter(v => !made.has(v.toLowerCase()));
}
const usedKnown = new Set();
const isKnown = (id, mode, msg, kind) => KNOWN.find(k => k.at.test(`${id} ${mode}`) && k.msg.test(msg) && (!k.kind || k.kind === kind) && usedKnown.add(k))
  || (mode === 'again' && autoNamed.has(id.split('#')[0]) && /There is no shape named "|the commands changed nothing|There are no arrows|I can't find an? |skipped \(it needs @|is not on the canvas|no connection .* → |the second play's area/.test(msg) ? { why: 'the example\'s messages name shapes by the engine\'s automatic names, which exist on a fresh page but not on a second play (the counters survive a clear); every tab reads the same names' } : null);
const names = K.names, lc = s => String(s).toLowerCase();

/** one turn: parse, rename, run as one message (Engine.run, partial) -> {nodes, result, renamed} */
function play(sys, program, map) {
  const nodes0 = K.parse(program), { nodes, renamed } = renameNodes(nodes0, map || {});
  const result = sys.engine.run(nodes, {});
  return { nodes, result, renamed };
}
const frameOf = W => W.state.frame || { x: 0, y: 0 };
/** what each wire did, checked against what it says -> [problem text], [warning text] */
function effects(sys, nodes, result) {
  const W = sys.world, out = [], warn = [], F = frameOf(W);
  for (const st of result.steps) {
    const n = st.node, a = n.args, val = st.value;
    if (st.error || st.skipped || n.type === 'mention') continue;
    const fail = m => out.push(`@${n.id}: ${m}`);
    const resolve = v => K.isRef(v) ? [].concat(result.env[v.ref] || []) : Array.isArray(v) ? v.flatMap(resolve) : [v];
    if (n.type === 'question') { if (!st.answer && st.value === undefined) fail('the question got no answer'); continue; }
    if (n.type === 'rule') { if (!st.patches.some(p => p.op === 'rule')) fail('no rule was added'); continue; }
    const act = a.action;
    if (n.type === 'fact') continue;   // a fact may already hold (no change); its checks are the semantic ones of test_saved_sop.mjs
    if (act === 'create' && !a.template) {
      const made = [].concat(val || []);
      if (!made.length) { fail('created nothing'); continue; }
      const want = Math.max(1, +a.count || 1); if (made.length !== want) fail(`created ${made.length} shapes, the wire asks for ${want}`);
      for (const nm of made) {
        const s = W.find(nm); if (!s) { fail(`${nm} is not on the canvas after it was created`); continue; }
        if (a.name != null && made.length === 1 && s.name !== String(a.name)) fail(`named ${s.name}, not ${a.name}`);
        if (a.shape && a.shape !== 'any' && s.shape !== a.shape) fail(`${nm} is a ${s.shape}, not a ${a.shape}`);
        if (a.color && s.color !== a.color) fail(`${nm} is ${s.color}, not ${a.color}`);
        if (a.size && !s.w && s.shape !== 'text' && K.sizeName(s.size) !== a.size) fail(`${nm} is ${K.sizeName(s.size)}, not ${a.size}`);
        if (a.outline && (s.outline || 'none') !== a.outline) fail(`${nm} has outline ${s.outline || 'none'}, not ${a.outline}`);
        if (a.label != null && s.label !== String(a.label)) fail(`${nm} says ${JSON.stringify(s.label)}, not ${JSON.stringify(String(a.label))}`);
        if (a.layer && a.layer !== 'item' && s.layer !== a.layer) fail(`${nm} is not on the ${a.layer} layer`);
        if (a.width != null && s.w !== Math.max(10, Math.round(+a.width))) fail(`${nm} is ${s.w} wide, not ${a.width}`);
        if (a.height != null && s.h !== Math.max(10, Math.round(+a.height))) fail(`${nm} is ${s.h} tall, not ${a.height}`);
        if (a.at && made.length === 1) { const [x, y] = String(a.at).split(',').map(Number), at = [].concat(a.at).map(Number), X = (at.length === 2 ? at[0] : x) + F.x, Y = (at.length === 2 ? at[1] : y) + F.y;
          if (Math.abs(s.x - X) > 0.5 || Math.abs(s.y - Y) > 0.5) warn.push(`@${n.id}: ${nm} was asked at ${X - F.x},${Y - F.y} and is at ${s.x - F.x},${s.y - F.y} (kept on the canvas)`); }
        if (a.position && a.anchor && !['inside', 'onTop', 'between'].includes(a.position) && made.length === 1) {
          const anc = names(a.anchor)[0], o = W.find(anc) || (W.findGroup(anc) && K.groupBox(W.state, W.findGroup(anc)));
          const rel = { leftOf: () => s.x < o.x - 20, rightOf: () => s.x > o.x + 20, above: () => s.y < o.y - 20, below: () => s.y > o.y + 20, near: () => Math.hypot(s.x - o.x, s.y - o.y) < 170 }[a.position];
          if (o && rel && !rel()) warn.push(`@${n.id}: ${nm} is not ${a.position} ${anc} (no free spot there)`);
        }
      }
      continue;
    }
    if (act === 'connect') {
      const from = resolve(a.from), to = resolve(a.to).filter(x => x != null && x !== '');
      const pairs = a.pairing || (!to.length && from.length > 1) ? (val || []).slice(1).map((y, i) => [val[i], y]) : from.flatMap(f => to.map(t => [f, t]));
      for (const [f, t] of pairs) {
        const e = W.state.edges.find(x => lc(x.from) === lc(f) && lc(x.to) === lc(t));
        if (!e) { fail(`no connection ${f} → ${t}`); continue; }
        if (a.style && e.style !== a.style) fail(`${f} → ${t} is ${e.style}, not ${a.style}`);
        if ((a.arrow || 'forward') !== e.arrow && !(st.notes || []).some(x => /already exists/.test(x))) fail(`${f} → ${t} has arrow ${e.arrow}, not ${a.arrow || 'forward'}`);
        if (a.color && e.color !== a.color) fail(`${f} → ${t} is ${e.color || 'default'}, not ${a.color}`);
        if (a.label != null && e.label !== String(a.label)) fail(`${f} → ${t} says ${JSON.stringify(e.label)}, not ${JSON.stringify(String(a.label))}`);
      }
      if (!pairs.length) fail('connected nothing');
      continue;
    }
    if (act === 'delete') { for (const t of resolve(a.target)) if (W.find(t)) fail(`${t} is still on the canvas`); continue; }
    if (act === 'rename') { if (!W.find(String(a.name)) && !W.findGroup(String(a.name))) fail(`nothing is called ${a.name} after the rename`); continue; }
    if (act === 'group') { const g = W.findGroup(String(a.name != null ? a.name : (val || [])[0])); if (!g) fail(`no group ${a.name}`); continue; }
    if (act === 'label' && a.target != null && a.from == null && a.to == null) { for (const t of resolve(a.target)) { const s = W.find(t); if (s && s.label !== (String(a.label) === '' ? null : String(a.label))) fail(`${t} says ${JSON.stringify(s.label)}`); } continue; }
    if ((act === 'set' || act === 'resize') && a.target != null && a.kind !== 'edge' && a.from == null && a.to == null) {
      for (const t of resolve(a.target)) {
        const s = W.find(t); if (!s) { if (!W.findGroup(t)) fail(`${t} is not on the canvas`); continue; }
        if (a.color && s.color !== a.color) fail(`${t} is ${s.color}, not ${a.color}`);
        if (a.size && !s.w && K.sizeName(s.size) !== a.size) fail(`${t} is ${K.sizeName(s.size)}, not ${a.size}`);
        if (a.shape && a.shape !== 'any' && s.shape !== a.shape) fail(`${t} is a ${s.shape}, not a ${a.shape}`);
        if (a.outline && (s.outline || 'none') !== a.outline) fail(`${t} has outline ${s.outline || 'none'}, not ${a.outline}`);
      }
      if (!st.patches.length && (a.scale != null || act === 'resize')) warn.push(`@${n.id}: the resize changed nothing (already at the size limit)`);
      continue;
    }
    if (act === 'move' && a.target != null) {
      const ts = resolve(a.target);
      if (a.at && ts.length === 1 && W.find(ts[0])) { const s = W.find(ts[0]), at = String([].concat(a.at).join(',')).split(',').map(Number); if (Math.abs(s.x - at[0] - F.x) > 0.5 || Math.abs(s.y - at[1] - F.y) > 0.5) warn.push(`@${n.id}: ${ts[0]} was asked at ${at} and is at ${s.x - F.x},${s.y - F.y} (kept on the canvas)`); }
      if (!st.patches.length) fail('moved nothing');
      continue;
    }
  }
  return { out, warn };
}
const steps = (result, nodes) => result.steps.filter(st => st.node.type !== 'mention');
/** a summary line of the patches of a run */
function patchText(result) {
  const p = result.steps.flatMap(st => st.patches), c = op => p.filter(x => x.op === op).length, parts = [];
  for (const [op, w] of [['add', 'added'], ['remove', 'removed'], ['set', 'changed'], ['rename', 'renamed'], ['link', 'linked'], ['unlink', 'unlinked'], ['edgeSet', 'arrows changed'], ['group', 'grouped'], ['ungroup', 'ungrouped'], ['rule', 'rules'], ['reorder', 'restacked']]) if (c(op)) parts.push(`${w} ${c(op)}`);
  return parts.join(', ') || 'no change';
}
/** the shapes of the world's current area, without names, sorted: for comparing two plays of one example */
function areaShape(W) {
  const F = frameOf(W), inArea = s => { const c = K.cellOf(s.x, s.y); return c.x === F.x && c.y === F.y; };
  const sh = W.state.shapes.filter(inArea), set = new Set(sh.map(s => s.name));
  return JSON.stringify({ shapes: sh.map(s => [s.shape, s.color, s.size, s.x - F.x, s.y - F.y, s.label || '', s.outline || '', s.w || 0, s.h || 0, s.layer || '', s.fill || ''].join('|')).sort(),
    edges: W.state.edges.filter(e => set.has(e.from)).map(e => [e.style, e.arrow, e.color || '', e.label || ''].join('|')).sort(), groups: (W.state.groups || []).filter(g => g.members.some(m => set.has(m))).map(g => g.members.length).sort() });
}

/** plays one example in one world (the world's area is prepared by the caller) -> per turn {turn, input, program, renamed, result, errs, warn} */
function playExample(ex, P, sys, map, how) {
  const out = [];
  P.turns.forEach((t, i) => {
    const rec = { turn: i + 1, input: ex.turns[i], program: t.program, status: t.wires.length ? 'run' : 'none', errs: [], warn: [], answers: [], change: '' };
    out.push(rec);
    if (!t.wires.length) return;
    // the destructive policy of the reading tabs (logic.js holdDestructive, rule (b) as the Rules apply it): would it hold a request here?
    if (how === 'page') try {
      const ns = K.parse(t.program), main = ns.filter(n => n.type !== 'mention'), refs = v => K.isRef(v) ? [v.ref] : Array.isArray(v) ? v.flatMap(refs) : [];
      const units = main.map((n, index) => { const own = new Set(Object.values(n.args).flatMap(refs)); return { index, src: n.id, conf: NaN, execute: true, reasons: [], nodes: ns.filter(m => m === n || (m.type === 'mention' && own.has(m.id))) }; });
      if (K.holdDestructive(sys.engine, units, { gated: false })) rec.policy = units.filter(u => !u.execute).map(u => `${u.destructive ? u.destructive.question : u.src} (${u.reasons.map(x => x.text).join('; ')})`);
    } catch (e) { rec.warn.push(`the destructive check failed: ${e.message}`); }
    let r; const before = JSON.stringify(sys.world.state);
    try { r = play(sys, t.program, map); } catch (e) { rec.errs.push(`does not parse: ${e.message}`); return; }
    rec.renamed = r.renamed; rec.wires = r.nodes.map(K.serialize);
    for (const er of r.result.errors || []) rec.errs.push(`${er.error instanceof K.Clarify ? 'asks' : 'error'} @${er.node.id}: ${er.error.message}`);
    for (const st of r.result.steps) if (st.skipped) rec.errs.push(`@${st.node.id} skipped (it needs @${st.skipped})`);
    for (const st of steps(r.result)) { if (st.answer) rec.answers.push(st.answer); for (const iss of st.issues || []) if (iss.level === 'warn') rec.warn.push(`@${st.node.id}: ${iss.msg}`); }
    const E = effects(sys, r.nodes, r.result); rec.errs.push(...E.out); rec.warn.push(...E.warn);
    rec.change = patchText(r.result);
    const hist = r.nodes.filter(n => n.type === 'command' && ['undo', 'redo'].includes(n.args.action));
    if (hist.length && JSON.stringify(sys.world.state) === before && !rec.errs.length) rec.errs.push(`${hist[0].args.action} changed nothing`);
    const cmds = r.nodes.filter(n => (n.type === 'command' && !['undo', 'redo'].includes(n.args.action)) || n.type === 'rule');
    const LAYOUT = ['align', 'distribute', 'arrange', 'respace', 'snap', 'straighten', 'untangle', 'fit', 'improve', 'equalize', 'sort', 'groupBy', 'flip'];
    if (cmds.length && !r.result.changed && !(r.result.steps.some(st => (st.notes || []).concat(st.answer ? [st.answer] : []).some(x => /already|nothing to/i.test(x))))) {
      if (cmds.every(n => LAYOUT.includes(n.args.action)) && r.result.steps.some(st => st.answer)) rec.warn.push(`the layout already held: nothing moved (${r.result.steps.map(st => st.answer).filter(Boolean).join(' ')})`);
      else rec.errs.push('the commands changed nothing');
    }
  });
  return out;
}

const runs = {};
for (const ex of examples()) {
  if (only && !only.includes(ex.example)) continue;
  const f = path.join(DIR, ex.file); if (!fs.existsSync(f)) { problems.push(`${ex.example}: ${ex.file} missing`); continue; }
  const P = parseSopFile(fs.readFileSync(f, 'utf8'));
  if (ex.kind !== 'quick') { const g = engineGiven(P); if (g.length) autoNamed.set(ex.example, g); }
  if (P.turns.length !== ex.turns.length) { problems.push(`${ex.example}: ${P.turns.length} turns for ${ex.turns.length} messages`); continue; }
  if (ex.kind === 'quick') {   // each quick example alone on a fresh opening drawing (as on a page that was just opened)
    const res = P.turns.map((t, i) => { const sys = openingSystem(), q = Object.assign({}, ex, { turns: [ex.turns[i]] });
      const R = pageRenames(sys.world, Object.assign(q, { kind: 'quick' }), new Map([[`quick:0`, ENTRIES.get(`quick:${i}`)]]), MAN, i + 1);
      return playExample(q, { turns: [t] }, sys, R.map, 'page')[0]; });
    res.forEach((r, i) => { r.turn = i + 1; });
    runs[ex.example] = { ex, page: res };
    continue;
  }
  const fresh = K.createSystem(); newArea(fresh.world, ex.title);
  const A = playExample(ex, P, fresh, null, 'fresh');
  const page = openingSystem();
  const m1 = pageRenames(page.world, ex, ENTRIES, MAN).map; newArea(page.world, ex.title);
  const B = playExample(ex, P, page, m1, 'page'); const shape1 = areaShape(page.world);
  const m2 = pageRenames(page.world, ex, ENTRIES, MAN).map; newArea(page.world, ex.title);
  const C = playExample(ex, P, page, m2, 'again'); const shape2 = areaShape(page.world);
  runs[ex.example] = { ex, fresh: A, page: B, again: C, maps: [m1, m2], same: shape1 === shape2 };
  if (shape1 !== shape2) { const m = `${ex.example}: the second play's area differs from the first (names aside)`; if (autoNamed.has(ex.example)) known.push(m + ' (known: see the again-mode lines)'); else problems.push(m); }
}

for (const [id, R] of Object.entries(runs)) {
  report.push(`\n=== ${R.ex.kind} ${id}: ${R.ex.title} (${R.ex.turns.length} messages)` + (R.maps ? `; renamed on the page: ${Object.entries(R.maps[0]).map(([a, b]) => a + '→' + b).join(', ') || 'none'}, on the second play: ${Object.entries(R.maps[1]).map(([a, b]) => a + '→' + b).join(', ') || 'none'}; second play ${R.same ? 'same area' : 'DIFFERENT area'}` : ''));
  const modes = R.ex.kind === 'quick' ? ['page'] : ['fresh', 'page', 'again'];
  R[modes[0]].forEach((r0, i) => {
    report.push(`-- ${id}#${i + 1}: ${r0.input}`);
    for (const w of (r0.program ? r0.program.split('\n') : [])) report.push(`   ${w}`);
    if (!r0.program) report.push('   (no wires)');
    for (const mode of modes) {
      const r = R[mode][i]; if (!r || r.status === 'none') continue;
      const tag = mode === modes[0] ? '' : `[${mode}] `;
      if (mode === modes[0] || r.errs.length || r.answers.join() !== r0.answers.join()) {
        report.push(`   ${tag}=> ${r.change}${r.answers.length ? ' | ' + r.answers.join(' | ') : ''}`);
      }
      for (const e of r.errs) { const k = isKnown(`${id}#${i + 1}`, mode, e, R.ex.kind);
        if (k) { report.push(`   ${tag}known ${e} (${k.why})`); known.push(`${id}#${i + 1} ${mode}: ${e}`); continue; }
        report.push(`   ${tag}PROBLEM ${e}`); problems.push(`${id}#${i + 1} ${mode}: ${e}`); }
      for (const w of r.warn) { report.push(`   ${tag}warn ${w}`); if (mode === modes[0]) warnings.push(`${id}#${i + 1}: ${w}`); }
    }
  });
}
const rp = opt('--report'); if (rp) fs.writeFileSync(rp, report.join('\n') + '\n');
const policy = Object.entries(runs).flatMap(([id, R]) => (R.page || []).filter(r => r.policy).map(r => ({ id: `${id}#${r.turn}`, input: r.input, held: r.policy })));
const jp = opt('--json'); if (jp) fs.writeFileSync(jp, JSON.stringify({ problems, known, warnings, policy }, null, 1));
if (policy.length) console.log(`the reading tabs' destructive policy would hold a request in ${policy.length} turn(s) that this tab plays as saved: ${policy.map(p => p.id).join(', ')}`);
console.log(`played ${Object.keys(runs).length} examples; ${problems.length} problem(s), ${known.length} known and explained, ${warnings.length} warning(s)${rp ? `; report: ${rp}` : ''}`);
for (const p of problems) console.log('PROBLEM ' + p);
for (const w of warnings) console.log('warn    ' + w);
if (problems.length) process.exitCode = 1;
