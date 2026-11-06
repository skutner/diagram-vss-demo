// test_drawing_lines.mjs: docs/js/drawing-lines.js (arm M4), with checks a defect would fail.
//   node training/neural/parity/test_drawing_lines.mjs
// - the same drawing gives the same text (also with the shapes in another z-order), the lines are newest first, a line's heads are where layout() says;
// - the cap keeps whole lines, newest first, within the limit, and one more line would pass it;
// - the file loaded as a classic script (the browser) gives the same text as require() (Node);
// - a replayed scene: the source of a renamed shape moves with it, a new shape takes its message's text.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { startSystem, playGold } from './arm_lib.mjs';

const FILE = new URL('../../../docs/js/drawing-lines.js', import.meta.url);
const DL = createRequire(import.meta.url)(FILE.pathname);
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };

const state = {
  shapes: [
    { name: 'Sky', shape: 'rectangle', size: 62, color: 'cyan', w: 780, h: 250, fill: 'light', layer: 'background', order: 1 },
    { name: 'star1', shape: 'star', size: 30, color: 'white', order: 3 }, { name: 'star2', shape: 'star', size: 30, color: 'white', order: 4 },
    { name: 'Sun', shape: 'circle', size: 88, color: 'gold', label: 'hot "sun"', order: 2 },
    { name: 'Moon', shape: 'circle', size: 62, color: 'white', order: 5 },
  ],
  edges: [{ id: 'e1', from: 'Sun', to: 'Moon', style: 'solid', arrow: 'forward' }, { id: 'e2', from: 'Moon', to: 'star1', style: 'dashed', arrow: 'none', label: 'glow' }],
  groups: [{ name: 'Sky1', members: ['Sky'] }, { name: 'Stars', members: ['star1', 'star2'] }],
};
const sources = new Map([['star1', 'Add two tiny white stars, "twinkly" ones, up in the night sky please now'], ['star2', 'Add two tiny white stars, "twinkly" ones, up in the night sky please now'], ['sun', 'A big gold sun']]);

ok('stable, newest first, heads at their offsets', () => {
  const a = DL.layout('make it bigger', DL.lines(state, sources)), b = DL.layout('make it bigger', DL.lines({ ...state, shapes: state.shapes.slice().reverse() }, sources));
  assert.equal(a.text, b.text);
  const ls = a.text.slice(a.drawFrom).split(DL.LSEP);
  assert.deepEqual(ls, [
    'Moon: medium white circle',
    'star1 star2: tiny white star | "Add two tiny white stars, \'twinkly\' ones, up in the"',
    'Sun: large gold circle "hot \'sun\'" | "A big gold sun"',
    'Sky: 780x250 light cyan background rectangle',
    'Moon - star1 dashed "glow"',
    'Sun -> Moon',
    'group Stars: star1 star2',
    'group Sky1: Sky',
  ]);
  assert.equal(a.text.slice(0, a.drawFrom), 'make it bigger' + DL.SEP);
  for (const h of a.heads) assert.equal(a.text.slice(h.start, h.end), h.name);
  assert.deepEqual(a.heads.map(h => h.name), ['Moon', 'star1', 'star2', 'Sun', 'Sky', 'Stars', 'Sky1']);
});

ok('names only: one line in the order given', () => {
  const L = DL.lines({ shapes: ['Start', 'Check', 'Done'].map(name => ({ name })), groups: [] }, null);
  assert.deepEqual(L.map(l => l.text), ['Start Check Done']);
  assert.deepEqual(L[0].heads.map(h => h.name), ['Start', 'Check', 'Done']);
});

ok('the cap keeps whole lines, newest first, and is the largest that fits', () => {
  const words = t => (String(t).match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) || []).length + 2;   // a stand-in piece counter: one piece per word, plus the two specials
  const ls = DL.lines(state, sources), full = words(DL.layout('make it bigger', ls).text);
  for (let limit = words('make it bigger') - 1; limit <= full + 2; limit++) {
    const f = DL.fit('make it bigger', ls, words, limit), parts = f.kept ? f.text.slice(f.drawFrom).split(DL.LSEP) : [];
    assert.deepEqual(parts, ls.slice(0, f.kept).map(l => l.text), 'whole lines, the newest ones');
    assert.equal(f.kept + f.dropped, ls.length);
    if (f.kept) assert.ok(words(f.text) <= limit, 'within the limit');
    if (f.kept < ls.length) assert.ok(words(DL.layout('make it bigger', ls.slice(0, f.kept + 1)).text) > limit, 'one more line would not fit');
  }
  assert.equal(DL.fit('make it bigger', ls, words, full).dropped, 0);
});

ok('a classic script (browser) gives the same text as require (Node)', () => {
  const src = fs.readFileSync(FILE, 'utf8'), B = vm.runInNewContext(src + '\n;DrawingLines', {});
  assert.equal(typeof B.lines, 'function');
  assert.equal(B.layout('x', B.lines(state, sources)).text, DL.layout('x', DL.lines(state, sources)).text);
});

ok('a replayed scene: sources follow creation and renames', () => {
  const G = startSystem(null), src = new Map();
  const step = (text, program) => { const before = G.s.world.state.shapes.map(s => s.name); const r = playGold(G.s, program); DL.noteMessage(src, before, G.s.world.state, text, r.steps); assert.equal((r.errors || []).length, 0, JSON.stringify(r.errors)); };
  step('draw a red circle named Ball', [{ span: 'x', type: 'command', args: { action: 'create', shape: 'circle', color: 'red', name: 'Ball' } }]);
  step('and a blue square Box', [{ span: 'x', type: 'command', args: { action: 'create', shape: 'square', color: 'blue', name: 'Box' } }]);
  step('rename Ball to Orb', [{ span: 'x', type: 'command', args: { action: 'rename', target: 'Ball', name: 'Orb' } }]);
  assert.equal(src.get('orb'), 'draw a red circle named Ball');
  assert.equal(src.has('ball'), false);
  const t = DL.layout('r', DL.lines(G.s.world.state, src)).text;
  assert.match(t, /Box: medium blue square \| "and a blue square Box" ;\nOrb: medium red circle \| "draw a red circle named Ball"$/);
});
console.log(`${n} checks passed`);
