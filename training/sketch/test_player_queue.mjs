#!/usr/bin/env node
// Exercise the exact UI player and quick-click functions against a blocked main queue.
// DOM and reader mocks isolate ordering; test_saved_reader_ui.py covers the real browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.argv[2] || new URL('../../docs/js/ui.js', import.meta.url), 'utf8');
const playerStart = source.indexOf('const player = {');
const playerEnd = source.indexOf('/* ---------------- formalizers:', playerStart);
const clickStart = source.indexOf("sbody.addEventListener('click', async ev => {");
const clickEnd = source.indexOf("sbody.addEventListener('change'", clickStart);
assert(playerStart >= 0 && playerEnd > playerStart && clickStart >= 0 && clickEnd > clickStart);
const deferred = () => { let release; const promise = new Promise(r => { release = r; }); return { promise, release }; };
function harness() {
  const barrier = deferred(), calls = [], handlers = {};
  const bar = { hidden: false, innerHTML: '', addEventListener(type, fn) { handlers.player = fn; } };
  const context = {
    console, setTimeout, Promise, calls, READERS: [], escH: String, namesPref: true, view: 'all', zv: {},
    queue: barrier.promise, savedLoad: Promise.resolve(),
    saved: {
      entry() { return null; }, invalidate() { calls.push({ invalidate: true }); },
      async begin(id) { calls.push({ begin: id }); if (context.beginGate) await context.beginGate; }
    },
    $: selector => selector === '#sc-delay' ? { value: '0' } : bar,
    sbody: { addEventListener(type, fn) { handlers.examples = fn; } },
    closeSheet() {}, setShowNames() {}, sysNote() {}, renderCanvas() {}, qwenJob() {}, RD: {}, SavedReaderKit: {},
    async run(text, sop, meta) { calls.push({ text, meta }); }
  };
  vm.createContext(context);
  const evaluate = code => vm.runInContext(code, context);
  evaluate('function submit(text,sop,meta) { queue = queue.then(() => run(text,sop,meta)); return queue; }');
  evaluate(source.slice(playerStart, playerEnd));
  evaluate(source.slice(clickStart, clickEnd));
  evaluate("Object.assign(player,{name:'Old',turns:['old0','old1'],original:['old0','old1'],exampleId:'scenario:old',token:1,i:0}); renderPlayer();");
  const state = () => JSON.parse(evaluate('JSON.stringify(player)'));
  const click = (action, token = state().token) => handlers.player({ target: { closest: () => ({ dataset: { pl: action, plToken: String(token) } }) } });
  const quick = (id = 'quick:0') => handlers.examples({ target: { closest: selector => selector === '[data-quick]' ? { dataset: { example: id, quick: 'quick text' } } : null } });
  return { barrier, calls, context, evaluate, state, click, quick, texts: () => calls.filter(c => 'text' in c), begins: () => calls.filter(c => 'begin' in c).map(c => c.begin) };
}
let checks = 0, failures = 0;
async function test(name, fn) {
  try { await fn(); checks++; console.log('ok   ' + name); }
  catch (error) { failures++; console.error('FAIL ' + name + ': ' + error.message); }
}
for (const action of ['playRest()', 'nextPlayer(player.token)']) await test(`queued Step rejects stale ${action}`, async () => {
  const h = harness();
  const setup = h.evaluate("startScript('New',['new0','new1'],'step',{exampleId:'scenario:new'})");
  const stale = h.evaluate(action);
  h.barrier.release(); await Promise.all([setup, stale]);
  assert.deepEqual(h.texts(), [], 'old controls must not enqueue old text or consume the replacement');
  assert.equal(h.state().i, 0); assert.equal(h.state().exampleId, 'scenario:new');
});
await test('rendered old controls cannot act on an activated replacement', async () => {
  const h = harness(), oldToken = h.state().token;
  const setup = h.evaluate("startScript('New',['new0'],'step',{exampleId:'scenario:new'})");
  h.barrier.release(); await setup;
  for (const action of ['play', 'next', 'pause', 'close']) await h.click(action, oldToken);
  assert.deepEqual(h.texts(), []); assert.equal(h.state().exampleId, 'scenario:new'); assert.equal(h.state().i, 0);
});
await test('rapid two starts leave only the latest Step run active', async () => {
  const h = harness();
  const first = h.evaluate("startScript('First',['first0'],'play',{exampleId:'scenario:first'})");
  const second = h.evaluate("startScript('Second',['second0'],'step',{exampleId:'scenario:second'})");
  h.barrier.release(); await Promise.all([first, second]);
  assert.deepEqual(h.begins(), ['scenario:second']); assert.deepEqual(h.texts(), []); assert.equal(h.state().i, 0);
});
await test('close while setup is pending prevents activation and playback', async () => {
  const h = harness();
  const setup = h.evaluate("startScript('New',['new0'],'play',{exampleId:'scenario:new'})");
  await h.click('close'); h.barrier.release(); await setup; await h.evaluate('queue');
  assert.deepEqual(h.begins(), []); assert.deepEqual(h.texts(), []); assert.deepEqual(h.state().turns, []);
});
await test('already queued old Next finishes before replacement without adding further old turns', async () => {
  const h = harness(), old = h.evaluate('nextPlayer(player.token)');
  const setup = h.evaluate("startScript('New',['new0'],'step',{exampleId:'scenario:new'})");
  const stale = h.evaluate('playRest()');
  h.barrier.release(); await Promise.all([old, setup, stale]);
  assert.deepEqual(h.texts().map(c => c.text), ['old0']);
  assert(h.calls.indexOf(h.texts()[0]) < h.calls.findIndex(c => c.begin === 'scenario:new'));
  assert.equal(h.texts()[0].meta.saved.runToken, 1); assert.equal(h.state().i, 0); assert.equal(h.state().busy, false);
});
await test('rapid Next remains blocked while the first turn is queued', async () => {
  const h = harness(), first = h.click('next'), second = h.click('next');
  h.barrier.release(); await Promise.all([first, second]);
  assert.deepEqual(h.texts().map(c => c.text), ['old0']); assert.equal(h.state().i, 1);
});
await test('quick replacement clears old player controls while queued', async () => {
  const h = harness(); await h.quick();
  const stalePlay = h.evaluate('playRest()'), staleNext = h.evaluate('nextPlayer(player.token)');
  h.barrier.release(); await Promise.all([stalePlay, staleNext]); await h.evaluate('queue');
  assert.deepEqual(h.texts().map(c => c.text), ['quick text']); assert.deepEqual(h.begins(), ['quick:0']);
  assert.deepEqual(h.state().turns, []); assert.deepEqual(h.state().original, []); assert.equal(h.state().exampleId, null); assert.equal(h.state().busy, false);
});
await test('queued quick superseded by Step never executes or captures saved context', async () => {
  const h = harness(); await h.quick();
  const setup = h.evaluate("startScript('New',['new0'],'step',{exampleId:'scenario:new'})");
  h.barrier.release(); await setup;
  assert.deepEqual(h.begins(), ['scenario:new']); assert.deepEqual(h.texts(), []); assert.equal(h.state().i, 0);
});
await test('quick replaced during asynchronous begin cannot execute or unlock replacement setup', async () => {
  const h = harness(), begin = deferred(); h.context.beginGate = begin.promise;
  await h.quick(); h.barrier.release();
  while (!h.begins().length) await Promise.resolve();
  const setup = h.evaluate("startScript('New',['new0'],'step',{exampleId:'scenario:new'})");
  const stale = h.evaluate('playRest()'); begin.release(); await Promise.all([setup, stale]);
  assert.deepEqual(h.begins(), ['quick:0', 'scenario:new']); assert.deepEqual(h.texts(), []); assert.equal(h.state().i, 0);
});
console.log(`${checks}/${checks + failures} player queue checks passed`);
if (failures) process.exitCode = 1;
