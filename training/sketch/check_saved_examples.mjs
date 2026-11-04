#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const K = require('../../docs/js/logic.js'), S = require('../../docs/js/saved-reader.js'), E = require('../../docs/js/examples.js');
const opening = require('../../docs/js/start-diagram.js');
export async function artifacts() {
  const dir = path.join(root, 'docs/examples/gpt-6.1-sol');
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const readFile = name => fs.readFile(path.join(dir, name), 'utf8');
  return { manifest, readFile, data: await S.validate(manifest, E.catalog(), readFile, K) };
}
export function reader(context = 'empty') {
  const rd = Object.assign({ last: [], pending: null, held: [], focusCell: null }, K.createSystem());
  if (context === 'opening') { const r = rd.engine.run(K.parse(opening.SOP)); assert(S.good(r)); rd.world.undoStack = []; }
  return rd;
}
function properties(actual, expected, where) {
  assert(actual, `${where} exists`);
  for (const [k, v] of Object.entries(expected)) assert.deepEqual(actual[k], v, `${where}.${k}`);
}
export function checkExpect(rd, result, expect, id) {
  assert(expect && typeof expect === 'object', `${id}: authored expectation required`);
  const st = rd.world.state;
  for (const [key, val] of Object.entries(expect)) {
    if (key === 'shapes') for (const [name, props] of Object.entries(val)) properties(st.shapes.find(s => s.name === name), props, `${id}:${name}`);
    else if (key === 'absent') for (const name of val) assert(!st.shapes.some(s => s.name === name) && !st.groups.some(g => g.name === name), `${id}:${name} absent`);
    else if (['shapeCount', 'edgeCount', 'groupCount'].includes(key)) assert.equal(st[{ shapeCount: 'shapes', edgeCount: 'edges', groupCount: 'groups' }[key]].length, val, `${id}:${key}`);
    else if (key === 'counts') checkExpect(rd, result, val, id);
    else if (key === 'edges') for (const edge of val) assert(st.edges.some(e => Object.entries(edge).every(([k, v]) => e[k] === v)), `${id}: edge ${JSON.stringify(edge)}`);
    else if (key === 'rules') for (const rule of val) assert(st.rules.some(r => Object.entries(rule).every(([k, v]) => r[k] === v)), `${id}: rule ${JSON.stringify(rule)}`);
    else if (key === 'groups') for (const [name, members] of Object.entries(val)) assert.deepEqual([...(st.groups.find(g => g.name === name)?.members || [])].sort(), [...members].sort(), `${id}:group ${name}`);
    else if (key === 'questionValues') assert.deepEqual((result?.steps || []).filter(s => s.node.type === 'question').map(s => s.value), val, `${id}:question values`);
    else if (key === 'relations') for (const r of val) {
      const a = st.shapes.find(s => s.name === r.target), b = st.shapes.find(s => s.name === r.anchor);
      assert(a && b, `${id}: relation shapes exist`);
      const tests = { above: a.y < b.y, below: a.y > b.y, left: a.x < b.x, leftOf: a.x < b.x, right: a.x > b.x, rightOf: a.x > b.x, near: Math.hypot(a.x - b.x, a.y - b.y) < 250 };
      assert(Object.hasOwn(tests, r.position), `${id}: known relation ${r.position}`); assert(tests[r.position], `${id}: ${JSON.stringify(r)}`);
    } else assert.fail(`${id}: unknown expectation ${key}`);
  }
}
export async function checkCorpus() {
  const { manifest, readFile, data } = await artifacts(); let turns = 0, expectationTurns = 0;
  for (const e of data.entries.values()) {
    assert(e.turns.some(t => t.expect && Object.keys(t.expect).length), `${e.id}: at least one authored expectation`);
    const rd = reader(e.initialContext), api = S.create({ K, rd, catalog: E.catalog, readManifest: async () => manifest, readFile });
    const original = e.turns.map(t => t.input);
    // The browser preserves pre-existing SOP input while binding parsed name-role arguments when needed.
    const effective = original.map((t, i) => t.startsWith('@') ? e.turns[i].nodes.map(K.serialize).join('\n') : t);
    await api.begin(e.id, original, effective, {}, e.id);
    for (const t of e.turns) {
      const before = S.capture(rd), out = await api.execute({ exampleId: e.id, turn: t.turn, runToken: e.id }, t.input, effective[t.turn]);
      assert(!out.unavailable, `${t.id}: ${out.saved.reason}`);
      if (out.result) assert(S.good(out.result), `${t.id}: engine errors or warnings`);
      for (const step of out.result?.steps || []) if (step.node.type === 'question') assert(typeof step.answer === 'string' && step.answer.length, `${t.id}: real question answer`);
      if (['noop', 'unsupported'].includes(t.status)) assert.equal(S.capture(rd), before, `${t.id}: no mutation`);
      if (t.expect) { checkExpect(rd, out.result, t.expect, t.id); if (Object.keys(t.expect).length) expectationTurns++; } turns++;
    }
  }
  const counts = { quick: E.QUICK.length, scenarios: E.catalog().filter(e => e.id.startsWith('scenario:')).length, scenes: E.catalog().filter(e => e.id.startsWith('scene:')).length, turns, expectationTurns, ...data.counts };
  console.log(JSON.stringify(counts)); console.log('Saved inventory, source/program hashes, legal programs, sequential execution and authored expectations passed.');
  return counts;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await checkCorpus();
