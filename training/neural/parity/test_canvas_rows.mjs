// test_canvas_rows.mjs: the second-read rows of arm M4 (canvas_lib.mjs, build_canvas_rows.mjs labelRow), with checks a defect would fail.
//   node training/neural/parity/test_canvas_rows.mjs
// - a row's tags land on the head of the right line (not on the request, not on an arrow or a group's member list), with B then I on a name of
//   several words;
// - a description the request does not write resolves to exactly the shapes the engine selects for it on that drawing;
// - a role the request writes, and a description it writes, give no tag on the drawing;
// - a session stops at its first unreliable step; a setup row and a names-only row get their own drawing.
import assert from 'node:assert/strict';
import { K, cp } from './parity_lib.mjs';
import { DL, drawingsOf, targetsOf, wordsOf } from './canvas_lib.mjs';
import { labelRow } from './build_canvas_rows.mjs';

let n = 0; const ok = (name, f) => { f(); n++; console.log('ok', name); };
const count = t => wordsOf(t).length + 2;   // a stand-in piece counter
const SETUP = ['@a command action=create shape=circle color=red name=Apple', '@b command action=create shape=circle color=red name=Cherry', '@c command action=create shape=circle color=blue name=Plum',
  '@d command action=create shape=square color=yellow name=Sun_Box', '@e command action=connect from=Apple to=Plum', '@f command action=group target=Apple,Cherry name=Reds'].join('\n');
const tagsOf = (lab, text) => wordsOf(text).map((w, i) => [w.w, lab.tags[i]]).filter(([, t]) => t && t !== 'O');
function rowFor(text, wires, extra = {}) {
  const e = drawingsOf([{ id: 'x', setup: SETUP, names: ['Apple', 'Cherry', 'Plum', 'Sun_Box'], groups: { Reds: ['Apple', 'Cherry'] }, text, wires, ...extra }], 'rows', { left_out_unreliable: 0, engine_errors: 0 })[0];
  const lines = DL.lines(e.state, e.sources), t = targetsOf(e.system, e.state, e.row);
  return { e, lines, t, labs: wires.map((w, i) => { const f = DL.fit(w.span, lines, count, 512); return { f, lab: labelRow(f, lines, t[i]) }; }) };
}

ok('tags on the head of the right line only; B then I on a name of several words', () => {
  const text = 'make that yellow box bigger';
  const { labs } = rowFor(text, [{ span: text, type: 'command', args: { action: 'resize', target: 'Sun_Box' } }]);
  const { f, lab } = labs[0];
  assert.deepEqual(tagsOf(lab, f.text), [['Sun', 'B-target'], ['_', 'I-target'], ['Box', 'I-target']]);
  const ws = wordsOf(f.text);
  ws.forEach((w, i) => { if (w.start < f.drawFrom) assert.equal(lab.tags[i], null, 'the request is not labelled'); else assert.notEqual(lab.tags[i], null); });
  assert.equal(lab.missing.length, 0); assert.equal(lab.tagged, 1);
});

ok('a description the request does not write: exactly the shapes the engine selects', () => {
  const text = 'delete all the round fruit';
  const { e, labs } = rowFor(text, [{ span: text, type: 'command', args: { action: 'delete', target: 'mention(quantifier=all,shape=circle)' } }]);
  const S = K.createSystem(); S.world.state = cp(e.state);
  const sel = S.engine.run(K.parse('@m1 mention quantifier=all shape=circle'), {}).steps[0].value;
  assert.deepEqual([...sel].sort(), ['Apple', 'Cherry', 'Plum']);
  const { f, lab } = labs[0], got = tagsOf(lab, f.text);
  assert.deepEqual(got.map(x => x[0]).sort(), [...sel].sort());
  assert.ok(got.every(x => x[1] === 'B-target'));
  // the names also occur in the arrow line and the group line: only the heads of the shape lines are tagged
  assert.equal(got.length, 3);
});

ok('a mention with a single pick: the one the engine resolves', () => {
  const text = 'remove the blue fruit';   // "fruit" is not a shape: the kind is not written
  const { labs } = rowFor(text, [{ span: text, type: 'command', args: { action: 'delete', target: 'mention(color=blue,shape=circle)' } }]);
  assert.deepEqual(tagsOf(labs[0].lab, labs[0].f.text), [['Plum', 'B-target']]);
});

ok('written roles and written descriptions: no tag on the drawing', () => {
  const t1 = 'connect Apple to Plum', t2 = 'delete every blue circle';
  const { labs } = rowFor(`${t1}. ${t2}`, [{ span: t1, type: 'command', args: { action: 'connect', from: 'Apple', to: 'Plum' } }, { span: t2, type: 'command', args: { action: 'delete', target: 'mention(quantifier=all,color=blue,shape=circle)' } }]);
  for (const { lab } of labs) { assert.equal(lab.tagged, 0); assert.equal(lab.missing.length, 0); assert.ok(lab.tags.filter(x => x !== null).every(x => x === 'O')); }
});

ok('a role with written and unwritten parts: every part tagged on the drawing; $new beside the drawing: not a row', () => {
  const t1 = 'link Apple and the other red one to Plum';
  const { labs } = rowFor(t1, [{ span: t1, type: 'command', args: { action: 'connect', from: 'Apple,Cherry', to: 'Plum' } }]);
  assert.deepEqual(tagsOf(labs[0].lab, labs[0].f.text).map(x => x.join(' ')).sort(), ['Apple B-from', 'Cherry B-from']);
  assert.equal(labs[0].lab.missing.length, 0);
  const t2 = 'connect it and the new one to Plum';
  const b = rowFor(t2, [{ span: t2, type: 'command', args: { action: 'connect', from: 'Cherry,$new', to: 'Plum' } }]);
  assert.deepEqual(b.labs[0].lab.missing, ['a role that mixes $new with the drawing']);
});

ok('a name not on the drawing is not a row; a description on a names-only drawing is not a row', () => {
  const text = 'move it up';
  const a = rowFor(text, [{ span: text, type: 'command', args: { action: 'move', target: 'Banana', direction: 'up' } }]);
  assert.deepEqual(a.labs[0].lab.missing, ['name not on the drawing']);
  const e = drawingsOf([{ id: 'y', names: ['Apple', 'Plum'], text: 'delete the round ones', wires: [] }], 'rows', { left_out_unreliable: 0, engine_errors: 0 })[0];
  assert.equal(e.kind, 'names'); assert.equal(e.system, null);
  const t = targetsOf(e.system, e.state, { ...e.row, wires: [{ span: 'delete the round ones', type: 'command', args: { action: 'delete', target: 'mention(quantifier=all,shape=circle)' } }] });
  assert.equal(t[0].target[0].error, 'no drawing');
});

ok('sessions: replayed step by step with sources, cut at the first unreliable step', () => {
  const rows = [
    { id: 's1', session: 'S', setup: '@a command action=create shape=circle name=Ball', text: 'add a red square named Crate', wires: [{ span: 'add a red square named Crate', type: 'command', args: { action: 'create', shape: 'square', color: 'red', name: 'Crate' } }] },
    { id: 's2', session: 'S', text: 'paint it blue', wires: [{ span: 'paint it blue', type: 'command', args: { action: 'set', target: 'Crate', color: 'blue' } }] },
    { id: 's3', session: 'S', unreliable: true, text: 'x', wires: [] }, { id: 's4', session: 'S', text: 'y', wires: [] },
    { id: 'r', setup: '@a command action=create shape=star name=Star1', text: 'z', wires: [] }];
  const counts = { left_out_unreliable: 0, engine_errors: 0 }, es = drawingsOf(rows, 'rows', counts);
  assert.deepEqual(es.map(e => e.row.id), ['s1', 's2', 'r']); assert.equal(counts.left_out_unreliable, 2);
  assert.match(DL.lines(es[1].state, es[1].sources).map(l => l.text).join('\n'), /^Crate: medium red square \| "add a red square named Crate"\nBall: medium white circle$/);
  assert.deepEqual(es[2].state.shapes.map(s => s.name), ['Star1']);
  const { labs } = (() => { const lines = DL.lines(es[1].state, es[1].sources), t = targetsOf(es[1].system, es[1].state, es[1].row); const f = DL.fit('paint it blue', lines, count, 512); return { labs: [labelRow(f, lines, t[0])] }; })();
  assert.equal(labs[0].tagged, 1);
});
console.log(`${n} checks passed`);
