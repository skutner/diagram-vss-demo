// test_saved_sop.mjs: the saved SOP Lang translations of the built-in examples (docs/sop-translations/claude-opus-5-5/) without a browser.
//   1. inventory: every input occurrence of the examples (ui.js QUICK, scenarios.js, scenes-extra.js) recomputed from the source; the
//      manifest has exactly one entry per occurrence, in order, with a unique id, the exact source text, and a file and lines that hold it
//   2. provenance: the model, the source revision and the date in every entry; the tab's label in ui.js is the model's name; every turn changed
//      since its frozen first pass says why (and only those); the example that is already SOP Lang is marked as not generated
//   3. the manifest is what build_manifest.mjs builds from the .sop files (no hand edits); every program parses
//   4. docs/js/saved-sop.js: lookup (play, no-op, unsupported, missing, stale, no example), renameNodes (names only: labels, texts, wire
//      ids and references unchanged)
//   5. playback: run_examples.mjs plays every example on an empty canvas, on the opening drawing and a second time: no problem that is not
//      known and explained
//   6. what the examples draw and answer: assertions per scenario and for some scenes (positions, connections, labels, groups, defaults,
//      answers), played as the page plays them (opening drawing, new area, renames)
// Run: node training/sop-translations/test_saved_sop.mjs        exit 1 on a failure
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, K, examples, inventory, parseSopFile, openingSystem, newArea, pageRenames, gptEntries, renamedForCanvasWith, trRenamesOf } from './lib.mjs';
const ENTRIES0 = await gptEntries();
import * as SS from '../../docs/js/saved-sop.js';

const DIR = path.join(ROOT, 'docs/sop-translations/claude-opus-5-5');
const M = SS.index(JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')));
let n = 0, fails = 0;
const ok = (name, cond, extra) => { n++; if (!cond) fails++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || extra === undefined ? '' : '\n     ' + JSON.stringify(extra).slice(0, 1200)}`); };

// ---------------------------------------------------------------- 1. inventory
const inv = inventory(), ex = examples();
ok('1. 13 quick examples, 11 scenarios, 24 scenes in the source', ex.filter(e => e.kind === 'quick')[0].turns.length === 13 && ex.filter(e => e.kind === 'scenario').length === 11 && ex.filter(e => e.kind === 'scene').length === 24, ex.map(e => e.kind));
ok('1. the inventory counts every message of every scenario and scene', M.inventory.occurrences === inv.length && M.inventory.scenario_turns === ex.filter(e => e.kind === 'scenario').reduce((a, e) => a + e.turns.length, 0) && M.inventory.scene_turns === ex.filter(e => e.kind === 'scene').reduce((a, e) => a + e.turns.length, 0), [M.inventory, inv.length]);
ok('1. one manifest entry per occurrence, in the same order', M.entries.length === inv.length && M.entries.every((e, i) => e.id === inv[i].id), M.entries.length);
ok('1. the occurrence ids are unique', new Set(M.entries.map(e => e.id)).size === M.entries.length);
ok('1. every entry has the exact text of its occurrence', M.entries.every((e, i) => e.input === inv[i].input && e.turn === inv[i].turn && e.example === inv[i].example));
ok('1. the source text hash is the current source', M.source.text_sha256 === (await import('node:crypto')).createHash('sha256').update(JSON.stringify(ex.map(e => [e.example, e.turns]))).digest('hex'));
{
  const bad = [];
  const files = new Map();
  for (const e of M.entries) {
    const f = path.join(DIR, e.file); if (!files.has(f)) files.set(f, fs.readFileSync(f, 'utf8').split('\n'));
    const L = files.get(f), first = L[e.lines[0] - 1], second = L[e.lines[0]];
    if (first !== `## turn ${e.turn}` || second !== `# input: ${e.input}`) bad.push(e.id);
    const body = L.slice(e.lines[0], e.lines[1]).filter(l => l.startsWith('@')).join('\n');
    if (body !== e.program) bad.push(e.id + ' (program)');
  }
  ok('1. every entry points at its "## turn" block and its program is the block\'s wires', !bad.length, bad.slice(0, 10));
}
ok('1. full coverage: every occurrence has a saved program, a no-op, an unsupported mark or is SOP Lang itself', M.coverage.entries === M.inventory.occurrences && M.entries.every(e => ['executable', 'partly', 'noop', 'unsupported', 'direct'].includes(e.status)), M.coverage);
ok('1. a turn without wires says why (no-op or unsupported)', M.entries.every(e => e.wires > 0 || (e.status === 'noop' && e.notes.noop) || (e.status === 'unsupported' && e.notes.unsupported)));

// ---------------------------------------------------------------- 2. provenance
ok('2. the model is Claude Opus 5.5 (claude-opus-5-5), with its evidence', M.model.name === 'Claude Opus 5.5' && M.model.id === 'claude-opus-5-5' && M.model.evidence.length >= 1);
const ui = fs.readFileSync(path.join(ROOT, 'docs/js/ui.js'), 'utf8'), lab = ui.match(/const OPUS = \{ id: '([^']+)', label: '([^']+)', dir: '([^']+)' \}/);
ok('2. the tab in ui.js is named after the manifest\'s model and reads this folder', lab && lab[1] === M.model.id && lab[2] === M.model.name && lab[3] === 'sop-translations/claude-opus-5-5/', lab && lab.slice(1));
ok('2. the tab comes after Qwen3 and the gpt-6.1-sol tab (the other saved translations, which came first) in READERS', /\['qwen', 'Qwen3'\], \['saved', 'gpt-6\.1-sol'\], \[OPUS\.id, OPUS\.label\]\]/.test(ui));
ok('2. every generated entry has the model\'s date, the source revision and an author', M.entries.filter(e => e.status !== 'direct').every(e => e.generated === M.generated && /^[0-9a-f]{40}$/.test(e.source_revision) && e.author && /claude-opus-5-5/.test(e.author)));
{
  const d = M.entries.filter(e => e.status === 'direct');
  ok('2. exactly one example is already SOP Lang: quick #13, played as written, not generated', d.length === 1 && d[0].id === 'quick#13' && d[0].program === d[0].input && d[0].generated === null && d[0].author === null && /e69eef6/.test(d[0].notes.direct.join()), d.map(x => x.id));
}
{
  let mismatch = [];
  for (const e of M.entries) {
    const F = parseSopFile(fs.readFileSync(path.join(DIR, 'first-pass', e.file), 'utf8')).turns[e.turn - 1];
    if (!F) { mismatch.push(e.id + ' (no first pass)'); continue; }
    const changed = F.program !== e.program;
    if (changed && !e.repaired) mismatch.push(e.id + ' (changed, not marked)');
    if (e.repaired && !e.repairs.length) mismatch.push(e.id + ' (marked, no reason)');
    if (e.repaired && changed && e.firstPass.program !== F.program) mismatch.push(e.id + ' (first pass not kept)');
  }
  ok('2. every program changed since the frozen first pass is marked as repaired, with the first pass and the reason', !mismatch.length, mismatch);
  ok('2. every repair says whether validation or review caused it', M.entries.filter(e => e.repaired).every(e => e.repairs.every(r => /^(validation|review): /.test(r))), M.entries.filter(e => e.repaired).map(e => e.repairs));
}

// ---------------------------------------------------------------- 3. the manifest is built, every program parses
{
  let out = '', code = 0;
  try { out = execFileSync('node', [path.join(ROOT, 'training/sop-translations/build_manifest.mjs'), '--check'], { encoding: 'utf8' }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); code = e.status; }
  ok('3. manifest.json is what build_manifest.mjs builds from the .sop files, with no problem', code === 0 && /is up to date/.test(out) && !/PROBLEM/.test(out), out.slice(-800));
}
ok('3. every saved program parses as SOP Lang', M.entries.every(e => { try { return K.parse(e.program).length === e.wires; } catch (x) { return false; } }));
ok('3. only legend keys and values are used (no warning from the legend)', M.entries.every(e => K.parse(e.program).every(nd => !K.createSystem().engine.legend.validate(nd).length)), M.entries.filter(e => K.parse(e.program).some(nd => K.createSystem().engine.legend.validate(nd).length)).map(e => e.id).slice(0, 5));

// ---------------------------------------------------------------- 4. saved-sop.js
{
  const e = M.byId.get('traffic#2');
  const L = SS.lookup(M, { example: 'traffic', turn: 2, original: e.input });
  ok('4. lookup: a built-in example with its own text plays its program', L.state === 'play' && L.program === e.program && L.entry === e);
  ok('4. lookup: no provenance (typed, edited, own script) is not played', SS.lookup(M, null).state === 'unavailable' && SS.lookup(M, { example: 'traffic' }).state === 'unavailable');
  ok('4. lookup: a changed text is stale, not played', /stale/.test(SS.lookup(M, { example: 'traffic', turn: 2, original: e.input + ' ' }).reason) && SS.lookup(M, { example: 'traffic', turn: 2, original: e.input.replace('Wait', 'Halt') }).state === 'unavailable');
  ok('4. lookup: an unknown example or turn is not played', SS.lookup(M, { example: 'nope', turn: 1, original: 'x' }).state === 'unavailable' && /no saved translation of traffic#99/.test(SS.lookup(M, { example: 'traffic', turn: 99, original: 'x' }).reason));
  const noop = M.entries.find(x => x.status === 'noop');
  ok('4. lookup: a no-op says so, with the model\'s reason', SS.lookup(M, { example: noop.example, turn: noop.turn, original: noop.input }).state === 'noop' && SS.lookup(M, { example: noop.example, turn: noop.turn, original: noop.input }).reason === noop.notes.noop.join('; '));
  const fake = SS.index(JSON.parse(JSON.stringify(M))); fake.byId.get('traffic#2').status = 'unsupported'; fake.byId.get('traffic#2').notes = { unsupported: ['"x": y'] };
  ok('4. lookup: an unsupported turn says so', SS.lookup(fake, { example: 'traffic', turn: 2, original: e.input }).state === 'unsupported');
  const nodes = K.parse('@m1 mention shape=circle label="CEO"\n@c1 command action=create shape=rectangle name=CEO label="CEO"\n@c2 command action=connect from=CEO to=CTO,CFO label="CEO to CTO"\n@c3 command action=group target=CEO,$m1 name=CEO\n@q1 question ask=check target=CEO position=below anchor=CEO');
  const R = SS.renameNodes(nodes, { CEO: 'CEO2', CFO: 'CFO2' }), s = R.nodes.map(K.serialize).join('\n');
  const [m1, c1, c2, c3, q1] = R.nodes;
  ok('4. renameNodes renames name-valued keys (name, target, from, to, anchor, members)', c1.args.name === 'CEO2' && c2.args.from === 'CEO2' && c2.args.to.join() === 'CTO,CFO2' && c3.args.target[0] === 'CEO2' && c3.args.name === 'CEO2' && q1.args.target === 'CEO2' && q1.args.anchor === 'CEO2', s);
  ok('4. renameNodes leaves labels, mention texts, wire ids and references alone', m1.args.label === 'CEO' && c1.args.label === 'CEO' && c2.args.label === 'CEO to CTO' && R.nodes.map(x => x.id).join() === 'm1,c1,c2,c3,q1' && K.isRef(c3.args.target[1]) && c3.args.target[1].ref === 'm1', s);
  ok('4. renameNodes reports what it renamed', R.renamed.length === 7 && R.renamed.every(r => r.to === r.from + '2'), R.renamed);
  ok('4. renameNodes without a map returns the same nodes', SS.renameNodes(nodes, {}).nodes === nodes);
  ok('4. renameNodes matches a name without regard to case, as the engine finds shapes', SS.renameNodes(K.parse('@c1 command action=move target=ceo direction=up'), { CEO: 'CEO2' }).nodes[0].args.target === 'CEO2');
  ok('4. index refuses a file that is not a manifest', (() => { try { SS.index({ format: 'x' }); return false; } catch (x) { return true; } })());
}

{
  // the text every tab reads is renamed over the reading tabs' drawings only: this tab's drawing never changes it (ui.js renamedForCanvas)
  const w = K.createSystem(); w.engine.run(K.parse('@c1 command action=create shape=circle name=Stop'));
  const turns = ['Draw a large red circle named Stop at the top.'], entry = ENTRIES0.get('scenario:traffic');
  const withOpus = renamedForCanvasWith([{ id: 'claude-opus-5-5', world: w.world }])(turns, entry), withReader = renamedForCanvasWith([{ id: 'rules', world: w.world }])(turns, entry);
  ok('4. a name only the Claude Opus 5.5 tab has does not rename the text; the same name in a reading tab does', withOpus.map.Stop === 'Stop' && withReader.map.Stop === 'Stop2' && withReader.turns[0] === 'Draw a large red circle named Stop2 at the top.', [withOpus, withReader]);
  const own = trRenamesOf(w.world)('traffic', withOpus.map, M);
  ok('4. ... and that tab renames its own clash for its programs (Stop -> Stop2), leaving Wait and Go', own.Stop === 'Stop2' && !own.Wait && !own.Go, own);
}

// ---------------------------------------------------------------- 5. playback of every example (run_examples.mjs)
{
  const out = path.join(ROOT, 'training/sop-translations/.run.json');
  let log = '', code = 0;
  try { log = execFileSync('node', [path.join(ROOT, 'training/sop-translations/run_examples.mjs'), '--json', out], { encoding: 'utf8', maxBuffer: 64e6 }); } catch (e) { log = (e.stdout || '') + (e.stderr || ''); code = e.status; }
  const J = JSON.parse(fs.readFileSync(out, 'utf8')); fs.unlinkSync(out);
  ok('5. every example plays on an empty canvas, on the opening drawing and a second time with no unexplained problem', code === 0 && J.problems.length === 0 && /played 36 examples; 0 problem/.test(log), J.problems.slice(0, 10));
  const KN = /#1 fresh: |^(circuit|floorplan|jungle|recycle|reef|factory)#\d+ again|^(circuit|floorplan|jungle|recycle|reef|factory): the second play/;
  ok('5. the known problems are only the explained ones (an empty canvas cleared; second plays of examples that name engine-given names)', J.known.every(k => KN.test(k)), J.known.filter(k => !KN.test(k)));
  ok('5. every fresh-canvas and opening-drawing play is clean (the known ones are the empty-canvas clear only)', J.known.filter(k => / (fresh|page): /.test(k)).every(k => /#1 fresh: /.test(k)));
}

// ---------------------------------------------------------------- 6. what the examples draw and answer (as the page plays them)
const ENTRIES = await gptEntries();
/** plays an example as the + menu does on a freshly opened page, or on the given system -> {sys, turns: [{answers, errors}], map} */
function playPage(id, sys) {
  const e = ex.find(x => x.example === id), P = parseSopFile(fs.readFileSync(path.join(DIR, e.file), 'utf8'));
  sys = sys || openingSystem(); const map = pageRenames(sys.world, e, ENTRIES, M).map; newArea(sys.world, e.title);
  const turns = P.turns.map(t => { if (!t.wires.length) return { answers: [], errors: [] }; const { nodes } = SS.renameNodes(K.parse(t.program), map); const r = sys.engine.run(nodes, {}); return { answers: r.steps.map(s => s.answer).filter(Boolean), errors: (r.errors || []).map(x => x.error.message) }; });
  return { sys, W: sys.world, turns, map, find: nm => sys.world.find(nm), edge: (a, b) => sys.world.state.edges.find(x => x.from === a && x.to === b), group: g => sys.world.findGroup(g) };
}
const A = (p, k) => p.turns[k - 1].answers.join(' ');
{
  const p = playPage('star'), s = p.W.state.shapes.filter(x => x.shape === 'star'), F = p.W.state.frame;
  ok('6. star: one huge gold star in the centre of its area', s.length === 1 && s[0].color === 'gold' && K.sizeName(s[0].size) === 'huge' && s[0].x - F.x === 400 && s[0].y - F.y === 250, s);
}
{
  const p = playPage('traffic'), S = p.find('Stop'), W = p.find('Wait'), G = p.find('Go');
  ok('6. traffic: Stop red at the top, Wait yellow below it, Go green below Wait, all large', S.color === 'red' && W.color === 'yellow' && G.color === 'green' && [S, W, G].every(x => K.sizeName(x.size) === 'large') && S.y < W.y && W.y < G.y && S.x === W.x && W.x === G.x);
  ok('6. traffic: plain lines Stop–Wait and Wait–Go; "What color is Go?" answers green', p.edge('Stop', 'Wait').arrow === 'none' && p.edge('Wait', 'Go').arrow === 'none' && A(p, 4) === 'Go is green.', A(p, 4));
}
{
  const p = playPage('zoo'), F = p.W.state.frame, mine = p.W.state.shapes.filter(s => K.cellOf(s.x, s.y).x === F.x && K.cellOf(s.x, s.y).y === F.y);
  ok('6. zoo: eight shapes of the eight kinds and colours, in one row of their own area', mine.length === 8 && new Set(mine.map(s => s.shape)).size === 8 && new Set(mine.map(s => s.y)).size === 1 && mine.map(s => s.shape + ':' + s.color).sort().join() === ['circle:red', 'square:orange', 'rectangle:yellow', 'triangle:green', 'diamond:teal', 'ellipse:blue', 'hexagon:purple', 'star:pink'].sort().join());
  ok('6. zoo: the count covers the canvas (8 here + the opening drawing\'s 7 items; the scope note says so)', A(p, 3) === 'There are 15 shapes.' && M.byId.get('zoo#3').notes.scope, A(p, 3));
}
{
  const p = playPage('house'), F = p.W.state.frame, at = (nm, x, y) => { const s = p.find(nm); return s && s.x - F.x === x && s.y - F.y === y; };
  ok('6. house: Walls, Roof, Door, Window, Tree, Trunk at their coordinates in the new area', at('Walls', 400, 300) && at('Roof', 400, 182) && at('Door', 400, 337) && at('Window', 365, 280) && at('Tree', 190, 300) && at('Trunk', 190, 365));
  ok('6. house: Door labelled "door"; the yellow sun in the top right; Cloud a white ellipse in the top left', p.find('Door').label === 'door' && p.W.state.shapes.some(s => s.color === 'yellow' && s.shape === 'circle' && K.region(s) === 'top right') && p.find('Cloud').shape === 'ellipse' && K.region(p.find('Cloud')) === 'top left');
}
{
  const p = playPage('login');
  ok('6. login: Begin → Form → Valid → Home left to right; Error below Valid', p.find('Begin').x < p.find('Form').x && p.find('Form').x < p.find('Valid').x && p.find('Valid').x < p.find('Home').x && p.find('Error').y > p.find('Valid').y);
  ok('6. login: yes / dashed no / dotted retry arrows, with their labels', p.edge('Valid', 'Home').label === 'yes' && p.edge('Valid', 'Error').style === 'dashed' && p.edge('Valid', 'Error').label === 'no' && p.edge('Error', 'Form').style === 'dotted' && p.edge('Error', 'Form').label === 'retry');
  ok('6. login: a path Begin → Home; the cycle Form, Valid, Error', /^Yes: Begin → Form → Valid → Home/.test(A(p, 7)) && /Form, Valid and Error sit on a cycle/.test(A(p, 8)), [A(p, 7), A(p, 8)]);
}
{
  const p = playPage('org');
  ok('6. org: CEO on top, CTO below, CFO left and COO right of CTO, Dev below CTO, Ops right of Dev', p.find('CTO').y > p.find('CEO').y && p.find('CFO').x < p.find('CTO').x && p.find('COO').x > p.find('CTO').x && p.find('Dev').y > p.find('CTO').y && p.find('Ops').x > p.find('Dev').x && p.find('CEO').label === 'CEO');
  ok('6. org: five plain lines; CTO\'s neighbours; CEO and CTO tie for the most connections', ['CTO', 'CFO', 'COO'].every(t => p.edge('CEO', t).arrow === 'none') && ['Dev', 'Ops'].every(t => p.edge('CTO', t).arrow === 'none') && A(p, 6) === 'CTO connects to Dev and Ops; CEO connects to CTO.' && /^CEO and CTO tie/.test(A(p, 7)), [A(p, 6), A(p, 7)]);
}
{
  const p = playPage('solar'), S = p.find('Sun');
  ok('6. solar: the planets around Sun (Mercury right, Venus left, Earth above, Mars below), Saturn with a gold outline', p.find('Mercury').x > S.x && p.find('Venus').x < S.x && p.find('Earth').y < S.y && p.find('Mars').y > S.y && p.find('Saturn').outline === 'gold' && K.region(p.find('Jupiter')) === 'top right');
  ok('6. solar: four dotted lines; Mercury closest to Jupiter; Sun the biggest; Earth above Mars', ['Mercury', 'Venus', 'Earth', 'Mars'].every(t => p.edge('Sun', t).style === 'dotted' && p.edge('Sun', t).arrow === 'none') && /^Mercury is the closest circle to Jupiter/.test(A(p, 6)) && A(p, 7) === 'Sun is the biggest.' && A(p, 8) === 'Yes: Earth is above Mars.', [A(p, 6), A(p, 7), A(p, 8)]);
}
{
  const p = playPage('states');
  ok('6. states: the labelled transitions, "resume" dashed; everything reachable from Idle; Playing ⇄ Paused is the cycle; no path back to Idle', p.edge('Idle', 'Playing').label === 'play' && p.edge('Paused', 'Playing').style === 'dashed' && A(p, 6) === 'From Idle you can reach Playing, Paused and Ended.' && /Playing and Paused sit on a cycle/.test(A(p, 7)) && /^No path follows the arrows from Ended to Idle/.test(A(p, 8)), [A(p, 6), A(p, 7), A(p, 8)]);
}
{
  const p = playPage('network');
  ok('6. network: the rule makes the switches teal; the two-way arrows; the red dashed "nightly"', p.find('SwitchA').color === 'teal' && p.find('SwitchB').color === 'teal' && p.edge('Internet', 'Firewall').arrow === 'both' && p.edge('Server', 'Backup').color === 'red' && p.edge('Server', 'Backup').style === 'dashed' && p.edge('Server', 'Backup').label === 'nightly');
  ok('6. network: the four squares grew by a quarter (44 -> 55), Printer is gray, Router moved up 30', ['Laptop', 'Printer', 'Server', 'Backup'].every(x => p.find(x).size === 55) && p.find('Printer').color === 'gray' && p.find('Router').y === p.find('Firewall').y - 30);
  ok('6. network: the answers (path, no path Laptop → Server, reachable from SwitchB, describe Router)', /^Yes: Internet → Firewall → Router → SwitchB → Backup/.test(A(p, 14)) && /^No path follows the arrows from Laptop to Server/.test(A(p, 15)) && A(p, 16) === 'From SwitchB you can reach Server and Backup.' && /Router is a medium purple hexagon labeled "core"/.test(A(p, 19)), [A(p, 14), A(p, 15), A(p, 16), A(p, 19)]);
}
{
  const p = playPage('cartoon'), F = p.W.state.frame;
  ok('6. cartoon: 62 messages, no engine error; the six groups with their members', p.turns.every(t => !t.errors.length) && p.group('Robot').members.length === 11 && p.group('Monkey').members.length === 9 && p.group('Kid').members.length === 9 && p.group('Bunny').members.length === 12 && p.group('Hippo').members.length === 8 && p.group('Tree').members.join() === 'Trunk,Leaves,Apple,Apple2');
  ok('6. cartoon: the title text, Bubble labelled "Hello, friends!", arms as plain lines', p.W.state.shapes.some(s => s.shape === 'text' && s.label === 'Sunny Meadow' && s.x - F.x === 400 && s.y - F.y === 48) && p.find('Bubble').label === 'Hello, friends!' && p.edge('RoboBody', 'RoboHand').arrow === 'none' && p.edge('Dress', 'Shoe2').arrow === 'none');
}
{
  const p = playPage('story');
  ok('6. story: A orange with a black border, C renamed Leaf; the swap undone (A left of B)', p.find('A').color === 'orange' && p.find('A').outline === 'black' && p.find('Leaf') && !p.find('C') && A(p, 10) === 'Yes: A is left of B.', A(p, 10));
  ok('6. story: the duplicate of B, Leaf\'s neighbours, the pink stars deleted', p.W.state.shapes.filter(s => s.shape === 'square' && s.color === 'red').length === 2 && A(p, 9) === 'A and B connect to Leaf.' && !p.W.state.shapes.some(s => s.shape === 'star' && s.color === 'pink'), A(p, 9));
}
{
  const s = openingSystem(), q = parseSopFile(fs.readFileSync(path.join(DIR, 'quick.sop'), 'utf8')).turns, run = k => s.engine.run(K.parse(q[k - 1].program), {});
  const a = k => { const r = run(k); return r.steps.map(x => x.answer).filter(Boolean).join(' ') + (r.errors.length ? ' ERROR ' + r.errors.map(e => e.error.message).join() : ''); };
  run(1); const star = s.world.state.shapes.find(x => x.shape === 'star');
  ok('6. quick 1: a small pink star near Done', star && star.color === 'pink' && K.sizeName(star.size) === 'small' && Math.hypot(star.x - s.world.find('Done').x, star.y - s.world.find('Done').y) < 170);
  run(2); ok('6. quick 2: the green circle (Done) grew by half', s.world.find('Done').size === 93, s.world.find('Done').size);
  run(3); ok('6. quick 3: a dotted line Done – Start', s.world.state.edges.some(e => e.from === 'Done' && e.to === 'Start' && e.style === 'dotted' && e.arrow === 'none'));
  ok('6. quick 4-5: the path (after quick 3\'s plain line Done – Start, which counts both ways: one step) and Check\'s neighbours', a(4) === 'Yes: Start → Done (1 step).' && a(5) === 'Check connects to Done; Process connects to Check.', [a(4)]);
  run(6); ok('6. quick 6: three tiny red circles in a row below Process', s.world.state.shapes.filter(x => x.color === 'red' && x.shape === 'circle' && K.sizeName(x.size) === 'tiny' && x.y > s.world.find('Process').y).length === 3);
  ok('6. quick 7: most connections on the canvas', /tie: they have the most connections/.test(a(7)));
  run(8); ok('6. quick 8: the rule "circles are orange"', s.world.state.rules.some(r => r.shape === 'circle' && r.color === 'orange'));
  run(9); ok('6. quick 9: the fact puts Check above Process', s.world.find('Check').y < s.world.find('Process').y - 20);
  run(10); ok('6. quick 10: Done is End now', s.world.find('End') && !s.world.find('Done'));
  const r11 = run(11); ok('6. quick 11: everything of the drawing in a circle', /as a circle/.test(r11.steps.map(x => x.answer).join()), r11.steps.map(x => x.answer));
  ok('6. quick 12: a description of the diagram', /^The canvas has \d+ shapes/.test(a(12)));
  run(13); ok('6. quick 13 (SOP Lang): the gold star Gem', s.world.find('Gem') && s.world.find('Gem').color === 'gold');
}
{   // some scenes, as the page plays them
  const f = playPage('farm');
  ok('6. farm: no engine error; Barn, Bessie (moved 30 left), Ducky, TreeA, Chick; Cloud2 is the moved copy, in front', f.turns.slice(1).every(t => !t.errors.length) && ['Barn', 'Bessie', 'Ducky', 'TreeA', 'Chick'].every(g => f.group(g)) && f.find('Cow').x - f.W.state.frame.x === 450 && f.find('Cloud2') && f.find('Cloud2').x - f.W.state.frame.x === 660 && f.W.state.shapes.filter(s => !s.layer && s.shape !== 'text').map(s => s.name).indexOf('Cloud2') > f.W.state.shapes.filter(s => !s.layer && s.shape !== 'text').map(s => s.name).indexOf('Sun'), f.turns.map((t, i) => t.errors.length ? i + 1 : 0).filter(Boolean));
  ok('6. farm: the fence chained with brown plain lines, the stars deleted, the "lunch" arrow, the answers', f.W.state.edges.filter(e => e.color === 'brown' && e.arrow === 'none').length === 4 && !f.W.state.shapes.some(s => s.shape === 'star') && f.edge('Hen', 'Hay').label === 'lunch' && A(f, 31) === 'Roof is brown.' && A(f, 44) === 'Bessie holds Cow, CowHead, Spot1 and Spot2.' && A(f, 43) === 'There are 5 groups.', [A(f, 31), A(f, 43), A(f, 44)]);
  const c = playPage('city');
  ok('6. city: the car group moved 60 px left (CarBody at 520 in its area), the stars made gold, the oval deleted, the title size undone', c.find('CarBody').x - c.W.state.frame.x === 520 && A(c, 27) === `CarBody is at (${c.find('CarBody').x}, 405), in the bottom center.` && c.W.state.shapes.filter(s => s.shape === 'star' && s.color === 'gold').length === 5 && !c.W.state.shapes.some(s => s.shape === 'ellipse') && K.sizeName(c.W.state.shapes.find(s => s.label === 'Night Shift').size) === 'medium', A(c, 27));
  const j = playPage('jungle');
  ok('6. jungle: the board squares numbered 1-9, the ladder and the dotted snake, the second dice deleted', ['1', '2', '3', '4', '5', '6', '7', '8', '9'].every((l, i) => j.find('square' + (i + 1)).label === l) && j.edge('square2', 'square7').color === 'green' && j.edge('square8', 'square3').style === 'dotted' && j.W.state.shapes.filter(s => s.shape === 'square' && s.color === 'white' && s.label && /^[36]$/.test(s.label) && s.name !== 'square6' && s.name !== 'square3').length === 1);
  const w = playPage('winter');
  ok('6. winter: three houses with their roofs on top, the snowman group, the partly translated count question', ['1', '2', '3'].every(k => w.find('Roof' + k).y < w.find('House' + k).y) && w.group('Snowman').members.length === 4 && M.byId.get('winter#22').status === 'partly' && A(w, 22) === 'There are 8 stars. There are 4 circles.', A(w, 22));
  const pu = playPage('pump');
  ok('6. pump: the chain Tank → … → Outlet, the reversed bypass, Valve has the most connections', /^Yes: Tank → Pump → Valve → Filter → Outlet/.test(A(pu, 18)) && pu.edge('Tank', 'Valve') && !pu.edge('Valve', 'Tank') && /^Valve has the most connections/.test(A(pu, 38)));
  const two = playPage('farm', f.sys);
  const nm = n => two.map[n] || n;
  ok('6. farm played twice: the second play draws in its own area with renamed names (Spot1, Duck, Bessie get new names; the scene clears the first play) and no error', two.turns.slice(1).every(t => !t.errors.length) && nm('Spot1') !== 'Spot1' && nm('Duck') !== 'Duck' && two.find(nm('Spot1')) && two.find(nm('Duck')) && two.group(nm('Bessie')) && two.group(nm('Bessie')).members.includes(nm('Spot1')), two.map);
}

console.log(`\n${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
