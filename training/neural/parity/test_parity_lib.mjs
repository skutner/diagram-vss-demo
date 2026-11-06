// test_parity_lib.mjs: the drawing comparison must not accept readers that are wrong by construction. Run it before trusting any capability number.
//   node training/neural/parity/test_parity_lib.mjs
import assert from 'node:assert/strict';
import { K, diffs, same, finalShares, meanShares, cp, LOOSE, STRICT, examples, teachers, fresh, run, copyWorld, multisetEq, answers } from './parity_lib.mjs';

/** the drawing after a program on a fresh canvas with `setup` drawn first, and the comparison against the same canvas after `other` */
function compare(setup, text, right, wrong, tol = LOOSE) {
  const mk = p => { const s = K.createSystem(); s.engine.run(K.parse(setup), {}); const base = cp(s.world.state); s.engine.run(K.parse(p), {}); return { s, base }; };
  const a = mk(right), b = mk(wrong);
  return diffs(a.s.world.state, b.s.world.state, tol, { base: a.base, text });
}
const SETUP = '@a command action=create shape=circle name=Alpha at=200,200\n@b command action=create shape=square name=Beta at=500,300';

// the same program is the same drawing, at every tolerance
assert.deepEqual(compare(SETUP, 'draw a red star named Gamma', '@c command action=create shape=star color=red name=Gamma at=300,100', '@c command action=create shape=star color=red name=Gamma at=300,100', STRICT), {});
// a name the message writes must be there; a shape the message does not name may have any name
assert.ok(compare(SETUP, 'draw a red star named Gamma', '@c command action=create shape=star color=red name=Gamma at=300,100', '@c command action=create shape=star color=red at=300,100').name);
assert.deepEqual(compare(SETUP, 'draw a red star', '@c command action=create shape=star color=red at=300,100', '@c command action=create shape=star color=red name=Shiny at=300,100'), {});
// the name of a group the message writes
assert.ok(compare(SETUP, 'group Alpha and Beta as Pair', '@c command action=group target=Alpha,Beta name=Pair', '@c command action=group target=Alpha,Beta name=Other')['group name']);
// a small move: not doing it, or doing it the other way, is hidden by no tolerance
assert.ok(compare(SETUP, 'move Alpha up by 20', '@c command action=move target=Alpha direction=up distance=20', '')['moved or not']);
assert.ok(compare(SETUP, 'move Alpha up by 20', '@c command action=move target=Alpha direction=up distance=20', '@c command action=move target=Alpha direction=down distance=20')['moved the other way']);
assert.ok(compare(SETUP, 'hello', '', '@c command action=move target=Alpha direction=up distance=20')['moved or not'], 'a move nobody asked for');
assert.deepEqual(compare(SETUP, 'move Alpha up a bit', '@c command action=move target=Alpha direction=up distance=20', '@c command action=move target=Alpha direction=up distance=30'), {}, 'the same direction, near enough');
// a small resize: not doing it, or the other way
assert.ok(compare(SETUP, 'make Alpha a bit bigger', '@c command action=resize target=Alpha scale=1.25', '')['resized differently']);
assert.ok(compare(SETUP, 'make Alpha a bit bigger', '@c command action=resize target=Alpha scale=1.25', '@c command action=resize target=Alpha scale=0.8')['resized differently']);
assert.deepEqual(compare(SETUP, 'shrink Alpha', '@c command action=resize target=Alpha scale=0.67', '@c command action=resize target=Alpha scale=0.8'), {}, 'two sizes of "shrink" are near enough');
// z-order
assert.ok(compare(SETUP, 'bring Alpha to the front', '@c command action=toFront target=Alpha', '')['z-order']);

// on the examples: a reader made by breaking the Opus programs
const T = await teachers(), OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
const breakers = {
  'no names on creates and groups': n => n.map(x => { const a = { ...x.args }; if (x.type === 'command' && (a.action === 'create' || a.action === 'group')) delete a.name; return { ...x, args: a }; }),
  'every direction reversed': n => n.map(x => x.args.action === 'move' && x.args.direction ? { ...x, args: { ...x.args, direction: OPP[x.args.direction] || x.args.direction } } : x),
  // not asserted: dropping a colour often leaves the same drawing (white is the default, the engine gives Sun and Roof their usual colours, a mention may pick the same shapes)
  'colours dropped': n => n.map(x => { const a = { ...x.args }; delete a.color; return { ...x, args: a }; }),
  // not asserted, and known: the loose tolerance does not see a lost gap on a new shape. The main metric compares `distance`
  'gaps dropped on creates': n => n.map(x => { if (x.args.action !== 'create') return x; const a = { ...x.args }; delete a.distance; return { ...x, args: a }; }),
};
const hit = Object.fromEntries(Object.keys(breakers).map(k => [k, { changed: 0, accepted: 0, strict: 0 }]));
let identical = 0, turns = 0;
for (const ex of examples()) {
  let O = fresh(ex);
  ex.turns.forEach((text, i) => {
    if (ex.kind === 'quick') O = fresh(ex);
    const program = T.opus(ex, i).program || '', nO = K.parse(program), base = cp(O.world.state), runs = {};
    const same0 = copyWorld(O), r0 = run(same0, cp(nO));
    for (const [k, f] of Object.entries(breakers)) { const n = f(cp(nO)); if (JSON.stringify(n) !== JSON.stringify(nO)) { const S = copyWorld(O); runs[k] = { S, r: run(S, n) }; } }
    const rO = run(O, nO);
    turns++;
    if (same(diffs(O.world.state, same0.world.state, STRICT, { base, text })) && multisetEq(answers(rO), answers(r0))) identical++;
    for (const [k, { S, r }] of Object.entries(runs)) {
      const asAt = tol => same(diffs(O.world.state, S.world.state, tol, { base, text })) && multisetEq(answers(rO), answers(r));
      hit[k].changed++;
      if (asAt(LOOSE)) hit[k].accepted++;
      if (asAt(STRICT)) hit[k].strict++;
    }
  });
}
assert.equal(identical, turns, 'an Opus program must match itself on every turn');
console.log(`an Opus program matches itself, strict: ${identical} of ${turns}`);
for (const [k, c] of Object.entries(hit)) console.log(`broken on purpose, ${k}: accepted ${c.accepted} of ${c.changed} changed turns (strict ${c.strict})`);
assert.ok(hit['every direction reversed'].accepted === 0, 'a reversed move is never accepted');

// on its own drawing: the free-run measure must see arrows and groups. The bar of the plan is every kind >= 60%, so a reader that drops one kind cannot pass on the other two.
const shares = (drop) => {
  const list = [];
  for (const ex of examples()) {
    if (ex.kind !== 'scene') continue;
    const O = fresh(ex), S = fresh(ex);
    ex.turns.forEach((_, i) => { const n = K.parse(T.opus(ex, i).program || ''); run(O, cp(n)); const rm = new Set(n.filter(drop).map(x => x.id)); run(S, cp(n).filter(x => !rm.has(x.id))); });
    list.push(finalShares(O.world.state, S.world.state, LOOSE));
  }
  return meanShares(list);
};
const whole = shares(() => false), noArrows = shares(x => x.args.action === 'connect'), noGroups = shares(x => x.args.action === 'group');
console.log('Opus against itself, final shapes, arrows, groups:', Object.values(whole).map(x => x.toFixed(1)).join(', '));
console.log('no connect wires:', Object.values(noArrows).map(x => x.toFixed(1)).join(', '), '| no group wires:', Object.values(noGroups).map(x => x.toFixed(1)).join(', '));
for (const k of ['shapes', 'arrows', 'groups']) assert.equal(whole[k], 100, 'a program against itself: ' + k);
assert.ok(noArrows.arrows < 60, 'a reader with no arrows falls under the bar');
assert.ok(noGroups.groups < 60, 'a reader with no groups falls under the bar');
console.log('PASS');
