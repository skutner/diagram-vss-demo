// test_a1_words.mjs: the A1 tool's definitions on fixtures (node training/neural/parity/test_a1_words.mjs). Each assertion fails when the rule is mis-built: a question that names
// the request's own `src` by quoting it must not pass, nor one that names words not in the request, nor one with no reason.
import assert from 'node:assert/strict';
import { judge, analyse, quoted, wordsOf, reasonKind } from './a1_words.mjs';
let n = 0; const test = (name, fn) => { try { fn(); n++; console.log('ok   ' + name); } catch (e) { console.log('FAIL ' + name + '\n' + (e.stack || e)); process.exitCode = 1; } };
// the reply of the demo to "Make Check red and put Done below it" (captured 2026-11-07 from docs/index.html)
const real = { src: 'put Done below it', reasons: ['“it” was taken to mean Check; the name was not written'], how: 'Write it with the name instead of the word, like this: “Move Done below Check.”, or press Do it anyway.', runs: null };
test('the demo\'s own reply: it names “it”, a word of the request: pass; the clearer command is a form offered, not a named word', () => {
  const j = judge(real); assert.equal(j.pass, true); assert.deepEqual(j.named_words, ['it']); assert.deepEqual(j.forms.clearer, ['Move Done below Check.']);
});
test('names only a word that is not in the request: fail', () => assert.equal(judge({ src: 'put Done below it', reasons: ['the word ‘Check’ was not understood'] }).failure, 'names only words that are not in the request'));
test('no quoted word (a generic reason): fail, "names no word"', () => assert.equal(judge({ src: 'make it blue', reasons: ['the cut of this request was uncertain (where it ends)'] }).failure, 'names no word'));
test('no reason at all: fail', () => assert.equal(judge({ src: 'make it blue', reasons: [] }).failure, 'names no word'));
test('case is ignored and a word, not a substring, must match: ‘Blue’ vs "blueprint"', () => {
  assert.equal(judge({ src: 'make it blue', reasons: ['‘BLUE’ was read as a colour'] }).pass, true);
  assert.equal(judge({ src: 'open the blueprint', reasons: ['‘blue’ was read as a colour'] }).pass, false);
});
test('the quoted src of the request is not a reason: a reason that is only the src passes only if it is in a reason', () => {
  assert.equal(judge({ src: 'put Done below it', reasons: [], how: 'If you meant “put Done below it”, write it like that' }).pass, false);   // the line is not read
});
test('several fragments: one word of the request is enough', () => assert.equal(judge({ src: 'give them some space', reasons: ['‘them’ was taken to mean A and B', 'the word ‘zzz’ was not understood'] }).pass, true));
test('placeholders of the line are listed', () => assert.deepEqual(judge({ src: 'x', reasons: [], how: 'Write it with colour stated, like this: “Make Ivy ‹navy or teal?›.”' }).forms.placeholders, ['navy or teal?']));
test('quoted and wordsOf', () => { assert.deepEqual(quoted('a ‘b c’ and “d”'), ['b c', 'd']); assert.deepEqual(wordsOf('Wi-Fi, don’t 2x'), ['wi', 'fi', 'don', 't', '2x']); });
test('reasonKind: the quoted fragment and the list of names become X / NAMES', () => {
  assert.equal(reasonKind('“it” was taken to mean Check; the name was not written'), 'X was taken to mean Check; the name was not written');
  assert.equal(reasonKind('Internet, Firewall and Switch was taken from the conversation; the name was not written'), 'NAMES was taken from the conversation; the name was not written');
});
test('analyse: shares per set, failed captures counted and never passed, the rule is met only when every question passes and the capture is complete', () => {
  const L = [{ id: 'a', set: 'nl_a', ok: true, held: [real] }, { id: 'b', set: 'nl_a', ok: true, held: [{ src: 'make it blue', reasons: ['x ‘y’'] }, real] }, { id: 'c', set: 'collected_1', ok: true, held: [] }, { id: 'd', set: 'nl_a', ok: false, error: 'timeout' }];
  const r = analyse(L);
  assert.equal(r.sets.nl_a.held_requests, 3); assert.equal(r.sets.nl_a.passing, 2); assert.equal(r.sets.nl_a.pass_share, 0.6667);
  assert.equal(r.sets.collected_1.held_requests, 0); assert.equal(r.sets.collected_1.all_pass, false); assert.equal(r.capture.failed.length, 1);
  assert.equal(r.total.rule_met, false); assert.equal(r.bugs.length, 1);
  assert.equal(analyse([{ id: 'a', set: 'nl_a', ok: true, held: [real] }]).total.rule_met, true);
  assert.equal(analyse([{ id: 'a', set: 'nl_a', ok: true, held: [] }]).total.rule_met, false);   // nothing held proves nothing
});
console.log(`${n} passed`);
