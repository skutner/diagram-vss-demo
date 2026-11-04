// Saved scenes require an idempotent, undoable executable clear without changing Rules cues.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../../docs/js/logic.js');
const SD = require('../../docs/js/start-diagram.js');
const S = K.createSystem();
const run = text => S.engine.run(K.parse(text));
assert.equal(run('@c command action=clear').ok, true);
assert.equal(S.world.undoStack.length, 0, 'an already empty clear adds no undo step');
assert.equal(run(SD.SOP).ok, true);
assert.equal(run('@r rule shape=circle color=orange').ok, true);
const before = S.world.snapshot();
assert.equal(run('@c command action=clear').ok, true);
assert.equal(S.world.state.shapes.length, 0);
assert.equal(S.world.state.edges.length, 0);
assert.equal(S.world.state.groups.length, 0);
assert.deepEqual(S.world.state.rules, before.rules, 'clear preserves defaults');
assert.deepEqual(S.world.state.frame, before.frame);
assert.equal(run('@u command action=undo').ok, true);
assert.deepEqual(S.world.snapshot(), before, 'one undo restores the entire drawing');
assert.equal(run('@r command action=redo').ok, true);
assert.equal(S.world.state.shapes.length, 0);
assert.equal(run('@c command action=clear').ok, true);
const T = K.createSystem();
T.engine.run(K.parse(SD.SOP));
for (const text of ['clear Start', 'clear the arrows', "clear Done's label"]) {
  const f = T.formalize(text, { names: T.world.state.shapes.map(s => s.name), last: [] });
  assert.ok(f.nodes.some(n => n.type === 'command'), text + ' still has a command');
  assert.ok(f.nodes.every(n => n.args.action !== 'clear'), text + ' retains existing targeted Rules behavior');
}
console.log('saved clear: empty, populated, panels, groups, defaults, undo/redo and Rules cues passed');
