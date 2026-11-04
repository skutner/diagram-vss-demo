#!/usr/bin/env node
import assert from 'node:assert/strict';
import { artifacts, reader, K, S, E } from './check_saved_examples.mjs';
const { manifest, readFile, data } = await artifacts();
const clone = x => JSON.parse(JSON.stringify(x));
let checks = 0;
async function test(name, fn) { await fn(); checks++; console.log('ok   ' + name); }
function api(rd, m = manifest, rf = readFile) { return S.create({ K, rd, catalog: E.catalog, readManifest: async () => m, readFile: rf }); }
async function begin(a, id, map = {}, token = id) {
  const e = data.entries.get(id), original = e.turns.map(t => t.input), effective = original.map((t, i) => t.startsWith('@') ? S.bindNodes(e.turns[i].nodes, map).map(K.serialize).join('\n') : S.bindText(t, map));
  await a.begin(id, original, effective, map, token); return { e, original, effective, token };
}
async function turn(a, b, i = 0) { return a.execute({ exampleId: b.e.id, turn: i, runToken: b.token }, b.original[i], b.effective[i]); }
await test('complete stable inventory (13 quick, 11 scenarios, 24 scenes, 1139 occurrences)', async () => {
  assert.equal(data.entries.size, 48); assert.equal([...data.entries.values()].reduce((n, e) => n + e.turns.length, 0), 1139);
});
for (const [name, mutate] of [
  ['missing example', m => m.examples.pop()],
  ['duplicate example', m => m.examples.push(clone(m.examples[0]))],
  ['duplicate occurrence', m => m.examples[1].turns[0].id = m.examples[0].turns[0].id],
  ['source drift', m => m.examples[0].turns[0].input += ' '],
  ['input hash', m => m.examples[0].turns[0].inputSha256 = '0'.repeat(64)],
  ['program hash', m => m.examples[0].turns[0].programSha256 = '0'.repeat(64)],
  ['missing target', m => m.examples[0].turns[0].section = 'turn-99'],
  ['path traversal', m => m.examples[0].turns[0].program = '../bad.sop']
]) await test(`${name} rejects before zero world/history mutation`, async () => {
  const rd = reader('opening'), before = S.capture(rd), m = clone(manifest); mutate(m);
  await assert.rejects(api(rd, m).load()); assert.equal(S.capture(rd), before);
});
await test('missing program section and changed wire bytes reject', async () => {
  for (const edit of [s => s.replace('# turn-0', '# absent'), s => s + '\n@bad command action=clear']) {
    const rd = reader(), before = S.capture(rd);
    await assert.rejects(api(rd, manifest, async file => file === manifest.examples[0].turns[0].program ? edit(await readFile(file)) : readFile(file)).load());
    assert.equal(S.capture(rd), before);
  }
});
await test('every quick executes independently, including original raw SOP', async () => {
  for (let i = 0; i < 13; i++) {
    const rd = reader('opening'), a = api(rd), b = await begin(a, `quick:${i}`), out = await turn(a, b);
    assert(!out.unavailable, `${b.e.id}: ${out.saved.reason}`); assert(S.good(out.result));
  }
});
await test('typed/custom text has no text-only fallback and edited source/effective are unavailable', async () => {
  const rd = reader('opening'), a = api(rd), b = await begin(a, 'quick:0'), before = S.capture(rd);
  assert((await a.execute({ exampleId: b.e.id, turn: 0, runToken: b.token }, b.original[0] + ' ', b.effective[0])).unavailable);
  assert((await a.execute({ exampleId: b.e.id, turn: 0, runToken: b.token }, b.original[0], b.effective[0] + ' ')).unavailable);
  assert((await a.execute(null, b.original[0], b.effective[0])).unavailable); assert.equal(S.capture(rd), before);
  await assert.rejects(a.begin(b.e.id, ['edited'], ['edited'], {}, 'edited'));
});
await test('duplicate Next, out-of-order turn and replaced-run token cannot execute', async () => {
  const rd = reader(), a = api(rd), b = await begin(a, 'scenario:traffic');
  const before = S.capture(rd); assert((await turn(a, b, 1)).unavailable); assert.equal(S.capture(rd), before);
  const out = await turn(a, b); assert(!out.unavailable); const once = S.capture(rd);
  assert((await turn(a, b)).unavailable); assert.equal(S.capture(rd), once);
  const newer = await begin(a, 'scenario:traffic', S.allocate(b.e.names, rd.world.state.shapes.map(s => s.name)), 'new'); assert((await turn(a, b, 1)).unavailable); assert.equal(S.capture(rd), once);
  assert(!(await turn(a, newer)).unavailable);
});
await test('runtime changes to state/history/context/plugins invalidate remaining sequence', async () => {
  for (const change of [rd => rd.engine.run(K.parse('@x command action=create shape=circle name=Intruder')), rd => rd.world.undoStack.push(rd.world.snapshot()), rd => rd.world.redoStack.push(rd.world.snapshot()), rd => rd.last.push('other'), rd => rd.focusCell = { x: 1, y: 2 }, rd => rd.pending = { candidates: ['A'] }, rd => rd.held.push({ state: 'held' }), rd => rd.engine.plugins[0].enabled = false]) {
    const rd = reader(), a = api(rd), b = await begin(a, 'scenario:traffic'); change(rd); const before = S.capture(rd);
    assert((await turn(a, b)).unavailable); assert.equal(S.capture(rd), before);
  }
});
await test('dynamic green-circle mention resolves current context and rejects ambiguity without mutation', async () => {
  const rd = reader('opening'); rd.engine.run(K.parse('@x command action=set target=Done color=blue\n@y command action=create shape=circle name=Fresh color=green'));
  const a = api(rd), b = await begin(a, 'quick:1'), old = rd.world.find('Done').size, fresh = rd.world.find('Fresh').size;
  assert(!(await turn(a, b)).unavailable); assert.equal(rd.world.find('Done').size, old); assert(rd.world.find('Fresh').size > fresh);
  rd.engine.run(K.parse('@z command action=create shape=circle name=Another color=green')); const c = await begin(a, 'quick:1'), before = S.capture(rd);
  assert((await turn(a, c)).unavailable); assert.equal(S.capture(rd), before);
});
await test('missing target rejects the whole multi-wire turn before any real execution', async () => {
  const rd = reader(), a = api(rd), b = await begin(a, 'quick:0'), before = S.capture(rd);
  assert((await turn(a, b)).unavailable); assert.equal(S.capture(rd), before);
});
await test('unexpected actual engine failure restores the whole turn and invalidates later context', async () => {
  const rd = reader('opening'), a = api(rd), b = await begin(a, 'quick:0'), before = S.capture(rd), real = rd.engine.run;
  let calls = 0;
  rd.engine.run = (...args) => { const result = real.apply(rd.engine, args); if (++calls === 2) throw new Error('injected unexpected runtime failure'); return result; };
  const out = await turn(a, b); assert(out.unavailable); assert.equal(S.capture(rd), before); assert((await turn(a, b)).unavailable);
});
await test('complete case-insensitive shape/group allocation reserves A2 and hyphenated names', async () => {
  const map = S.allocate(['A', 'A2', 'Group', 'Node-x'], ['a', 'GROUP', 'node-X', 'A3']);
  assert.deepEqual(map, { A: 'A4', A2: 'A2', Group: 'Group2', 'Node-x': 'Node-x2' });
  assert.equal(S.bindText('Draw a circle named A labeled "A". Connect A to A2 and Node-x.', map), 'Draw a circle named A4 labeled "A". Connect A4 to A2 and Node-x2.');
  const nodes = K.parse('@A command action=create shape=circle name=A color=red label="A"\n@b command action=group name=Group target=A,A2\n@c command action=connect from=$A to=Node-x label="Group"');
  const bound = S.bindNodes(nodes, map);
  assert.equal(bound[0].id, 'A'); assert.equal(bound[0].args.label, 'A'); assert.equal(bound[0].args.color, 'red'); assert.equal(bound[0].args.name, 'A4');
  assert.deepEqual(bound[1].args.target, ['A4', 'A2']); assert.deepEqual(bound[2].args.from, { ref: 'A' }); assert.equal(bound[2].args.label, 'Group');
});
await test('repeat populated scenario binds every named shape and leaves prior names intact', async () => {
  const rd = reader('opening'), a = api(rd), first = await begin(a, 'scenario:traffic');
  for (let i = 0; i < first.e.turns.length; i++) assert(!(await turn(a, first, i)).unavailable);
  const map = S.allocate(first.e.names, rd.world.state.shapes.map(s => s.name).concat(rd.world.state.groups.map(g => g.name))), second = await begin(a, 'scenario:traffic', map, 'second');
  for (let i = 0; i < second.e.turns.length; i++) assert(!(await turn(a, second, i)).unavailable);
  assert(rd.world.find('Stop')); assert(rd.world.find(map.Stop)); assert.notEqual(map.Stop, 'Stop');
});
await test('intentional noop/unsupported consumes occurrence with zero engine calls or undo entries', async () => {
  for (const e of data.entries.values()) {
    const index = e.turns.findIndex(t => ['noop', 'unsupported'].includes(t.status)); if (index < 0) continue;
    const rd = reader(e.initialContext), a = api(rd), b = await begin(a, e.id);
    for (let i = 0; i < index; i++) assert(!(await turn(a, b, i)).unavailable);
    const before = S.capture(rd), old = rd.engine.run; let calls = 0; rd.engine.run = (...args) => { calls++; return old.apply(rd.engine, args); };
    const out = await turn(a, b, index); assert(!out.unavailable); assert.equal(calls, 0); assert.equal(S.capture(rd), before); break;
  }
});
await test('every example replays twice through family-aware binding on a populated canvas', async () => {
  let replayed = 0;
  for (const e of data.entries.values()) {
    const rd = reader('opening'), a = api(rd);
    // Force every canonical identifier to collide across the complete shape/group namespace before either replay.
    for (const [i, name] of e.names.entries()) {
      if (!rd.world.find(name) && !rd.world.state.groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
        if (i % 2) { const r = rd.engine.run(K.parse(`@seed command action=create shape=circle name=SavedFixture${i}\n@seed2 command action=create shape=square name=SavedFixtureOther${i}\n@g command action=group target=SavedFixture${i},SavedFixtureOther${i} name=${K.fmtValue(name)}`)); assert(S.good(r)); }
        else { const r = rd.engine.run(K.parse(`@seed command action=create shape=circle name=${K.fmtValue(name)}`)); assert(S.good(r)); }
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      const occupied = rd.world.state.shapes.map(s => s.name).concat(rd.world.state.groups.map(g => g.name));
      const map = S.allocate(e.names, occupied, S.families(e));
      for (const family of S.families(e)) for (let i = 1; i < family.length; i++) assert.equal(map[family[i]], map[family[0]] + (i + 1), `${e.id}: family binding`);
      // Match the UI's new area before capturing the run.
      if (!e.id.startsWith('quick:') && rd.world.state.shapes.length) { const before = rd.world.snapshot(); rd.world.newFrame(e.title); rd.world.commit(before); }
      rd.focusCell = { ...rd.world.state.frame };
      const b = await begin(a, e.id, map, `${e.id}:${pass}`);
      for (let i = 0; i < e.turns.length; i++) {
        const before = S.capture(rd), out = await turn(a, b, i);
        if (e.id === 'quick:9' && pass === 1) { assert(out.unavailable, 'second Rename Done explicitly unavailable after first renamed Done'); assert.equal(S.capture(rd), before); }
        else { assert(!out.unavailable, `${e.id}:${pass}:${i}: ${out.saved.reason}`); if (out.result) assert(S.good(out.result)); }
        replayed++;
      }
    }
  }
  console.log(`     ${replayed} replayed occurrences with all canonical names preoccupied`);
});
console.log(`${checks}/${checks} saved-reader checks passed`);
