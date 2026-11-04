// test_qwen_contract.mjs: the Qwen3 reader's contract without a model (docs/js/qwen-contract.js, docs/js/qwen-reader.js qwenGate,
// docs/js/qwen-sha256.js): schema and prompt from the legend, the strict JSON parser, every validation rule, the mapping to wires and
// their run in the real engine, the token-probability score and the gate. Run from the repository root:
//   node training/qwen/test_qwen_contract.mjs        (exit 1 on a failure)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { buildSpec, buildSchema, buildPrompt, parseJSON, validate, toNodes, tokensOf, scoreRequests, userContent } from '../../docs/js/qwen-contract.js';
import { qwenGate } from '../../docs/js/qwen-reader.js';
import { Sha256 } from '../../docs/js/qwen-sha256.js';
const req = createRequire(import.meta.url), K = req('../../docs/js/logic.js');
// neural.js is a classic script that expects SOPKit as a global; its NEXT_CONTEXT is the shared context rule
globalThis.SOPKit = K; const NK = (0, eval)(fs.readFileSync('docs/js/neural.js', 'utf8').replace('/*NEURAL-START*/', '') + '\nNeuralKit');
let n = 0, fail = 0;
const ok = (name, cond, extra) => { n++; if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || extra === undefined ? '' : '\n     ' + JSON.stringify(extra)}`); };
const reader = JSON.parse(fs.readFileSync('docs/model/qwen3/reader.json', 'utf8'));
const S0 = K.createSystem(), spec = buildSpec(S0.engine.legend, reader, K.serialize);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const wireDocs = Object.fromEntries([...S0.engine.wireTypes].map(([t, w]) => [t, w.doc]));

// 1. fixed inputs: the prompt and schema from this legend are the ones reader.json pins
ok('prompt from the legend has the pinned SHA-256', sha(buildPrompt(spec, reader, wireDocs)) === reader.prompt_sha256);
ok('schema from the legend has the pinned SHA-256', sha(JSON.stringify(buildSchema(spec))) === reader.schema_sha256);
ok('every act of the contract is a legend act, fact or rule', spec.acts.every(a => a.type));
ok('no excluded or non-legend key is in the contract', spec.acts.every(a => a.keys.every(k => S0.engine.legend.get(k) && !['position2', 'anchor2', 'region', 'topic'].includes(k))));
ok('the prompt has no cue words of the legend (e.g. "paint", "erase")', !/\b(paint|erase|get rid)\b/i.test(buildPrompt(spec, reader, wireDocs)));
ok('the two prompt examples come from annotated training data', reader.examples.length === 2 && reader.examples.every(e => e.source.startsWith('training/sketch/llm_train/')));

// 2. SHA-256
{ let good = true; for (const len of [0, 1, 55, 56, 64, 65, 1000, 70001]) { const d = crypto.randomBytes(len); const s = new Sha256(); for (let i = 0; i < len; i += 97) s.update(d.subarray(i, i + 97)); if (s.hex() !== sha(d)) good = false; } ok('streaming SHA-256 equals node crypto', good); }
{ const d = crypto.randomBytes(5000); const w = Buffer.from(await crypto.webcrypto.subtle.digest('SHA-256', d)).toString('hex'); ok('streaming SHA-256 equals WebCrypto', new Sha256().update(d).hex() === w); }

// 3. strict JSON with offsets
{
  const t = '{"a": [1, {"b": "x\\u0041"}], "c": true}', p = parseJSON(t);
  ok('JSON parses with offsets', p.ok && p.value.a[1].b === 'xA' && t.slice(p.node.members[0].ks, p.node.members[0].ke) === '"a"');
  for (const [bad, why] of [['{"a":1,}', 'trailing comma'], ['{"a":1} x', 'text after'], ['{"a":1,"a":2}', 'duplicate key'], ['{a:1}', 'unquoted key'], ['[1,2', 'unterminated'], ['{"a":"\n"}', 'control character'], ['', 'empty']]) ok(`JSON rejects: ${why}`, !parseJSON(bad).ok);
}

// 4. validation
const msg = 'Please add a red circle called Alpha, then connect it to Start. Also make the plan feel happier.';
const ctx = { text: msg, names: ['Start', 'Done'], last: ['Done'] };
const good = { requests: [
  { id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Alpha', shape: 'circle', color: 'red' } },
  { id: 'r2', text: 'connect it to Start', do: 'connect', args: { from: [{ ref: 'r1' }], to: [{ name: 'Start' }] } }],
  not_understood: ['make the plan feel happier'] };
const V = (o, extra) => validate(spec, Object.assign({ content: typeof o === 'string' ? o : JSON.stringify(o), finish: 'stop', reasoning: '' }, extra || {}), ctx);
{
  const v = V(good);
  ok('a good output is valid, no request blocked', v.ok && v.requests.every(r => !r.blocked), v.requests.map(r => r.errors));
  ok('spans are the quoted words in the message (UTF-16)', v.requests.every(r => msg.slice(r.span[0], r.span[1]) === r.src));
  ok('not_understood is located in the message', v.notUnderstood[0].span && !v.notUnderstood[0].error);
}
const whole = [
  ['truncated output (finish length)', V(good, { finish: 'length' })],
  ['runtime error', V(good, { error: 'boom' })],
  ['hidden reasoning', V(good, { reasoning: 'let me think' })],
  ['not JSON', V('{"requests": [')],
  ['an unknown top-level field', V(Object.assign({}, good, { confidence: 0.99 }))],
  ['an unknown request field', V({ requests: [Object.assign({}, good.requests[0], { confidence: 0.9 })], not_understood: [] })],
  ['a duplicate id', V({ requests: [good.requests[0], Object.assign({}, good.requests[1], { id: 'r1' })], not_understood: [] })],
  ['too many requests', V({ requests: Array.from({ length: 17 }, (_, i) => Object.assign({}, good.requests[0], { id: 'r' + (i + 1) })), not_understood: [] })],
  ['requests missing', V({ not_understood: [] })]];
for (const [why, v] of whole) ok(`whole output held: ${why}`, !v.ok && v.errors.length > 0, v.errors);
const per = [
  ['an act outside the legend', { id: 'r1', text: 'add a red circle called Alpha', do: 'paint', args: {} }],
  ['a key the act does not take (delete with color)', { id: 'r1', text: 'add a red circle called Alpha', do: 'delete', args: { target: [{ name: 'Start' }], color: 'red' } }],
  ['a key outside the contract', { id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { position2: 'below' } }],
  ['an enum value outside the legend', { id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { color: 'crimson' } }],
  ['a paraphrased quote', { id: 'r1', text: 'add a crimson circle', do: 'create', args: { shape: 'circle' } }],
  ['a count that is not a positive integer', { id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { count: 0 } }],
  ['a point that is not two numbers', { id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { at: [1] } }],
  ['a ref to a later request', { id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ ref: 'r2' }], to: [{ name: 'Start' }] } }],
  ['a context whose words are not in the message', { id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ context: 'that thing' }], to: [{ name: 'Start' }] } }],
  ['a description with a key it cannot use', { id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ like: { size: 'large' } }], to: [{ name: 'Start' }] } }],
  ['a shape item with two kinds', { id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ name: 'A', ref: 'r1' }], to: [{ name: 'Start' }] } }]];
for (const [why, r] of per) { const v = V({ requests: [r], not_understood: [] }); ok(`request blocked: ${why}`, v.ok && v.requests[0].blocked, v.requests[0] && v.requests[0].errors); }
{ const v = V({ requests: [{ id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ name: 'Done' }], to: [{ name: 'Start' }] } }, { id: 'r2', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Alpha' } }], not_understood: [] }); ok('requests may come in another order than the text; both located', v.requests.every(r => !r.blocked && r.span), v.requests.map(r => r.errors)); }
{ const v = V({ requests: [Object.assign({}, good.requests[0], { do: 'paint' }), good.requests[1]], not_understood: [] }); ok('a request that refers to a blocked create is blocked', v.requests[0].blocked && v.requests[1].blocked, v.requests[1].errors); }
{ const v = V({ requests: [Object.assign({}, good.requests[0], { do: 'paint' }), { id: 'r2', text: 'connect it to Start', do: 'connect', args: { from: [{ context: 'it' }], to: [{ name: 'Start' }] } }], not_understood: [] }); ok('a context reference after a blocked request is blocked (which shape is unknown)', v.requests[1].blocked, v.requests[1].errors); }

// 5. mapping to wires and the engine
{
  const S = K.createSystem(); S.engine.run(K.parse('@a command action=create shape=circle name=Start\n@b command action=create shape=square name=Done'));
  const v = V(good), m = toNodes(spec, v, ctx, NK.NEXT_CONTEXT);
  ok('wires: create then connect from the created shape ($r1)', m.nodes.map(x => K.serialize(x)).join(' | ') === '@r1 command action=create shape=circle color=red name=Alpha | @r2 command action=connect from=$r1 to=Start', m.nodes.map(x => K.serialize(x)));
  ok('every wire has its unit and span (not enumerable)', m.nodes.every(x => x.unit && x.span && !Object.keys(x).includes('unit')));
  const r = S.engine.run(m.nodes);
  ok('the engine runs the validated wires', r.ok && S.world.find('Alpha') && S.world.state.edges.some(e => e.from === 'Alpha' && e.to === 'Start'), r.errors.map(e => e.error.message));
  const v2 = V({ requests: [{ id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Alpha', shape: 'circle' } }, { id: 'r2', text: 'connect it to Start', do: 'connect', args: { from: [{ name: 'alpha' }], to: [{ context: 'it' }] } }], not_understood: [] });
  const m2 = toNodes(spec, v2, ctx, NK.NEXT_CONTEXT);
  ok('a name created earlier in the message becomes a reference; "it" takes the last shape by the shared rule', m2.nodes.map(x => K.serialize(x))[1] === '@r2 command action=connect from=$r1 to=$r1', m2.nodes.map(x => K.serialize(x)));
  const v3 = V({ requests: [{ id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ like: { color: 'red', shape: 'circle' } }], to: [{ name: 'Start' }] } }], not_understood: [] }), m3 = toNodes(spec, v3, ctx, NK.NEXT_CONTEXT);
  ok('a description becomes a mention wire before its request', m3.nodes.map(x => K.serialize(x)).join(' | ') === '@m1 mention shape=circle color=red | @r1 command action=connect from=$m1 to=Start', m3.nodes.map(x => K.serialize(x)));
  const v4 = validate(spec, { content: JSON.stringify({ requests: [{ id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ context: 'it' }], to: [{ name: 'Start' }] } }], not_understood: [] }), finish: 'stop', reasoning: '' }, { text: msg, names: [], last: [] });
  const m4 = toNodes(spec, v4, { names: [], last: [] }, NK.NEXT_CONTEXT);
  ok('"it" with no earlier shape: blocked, no wire', m4.nodes.length === 0 && m4.analyses[0].blocked, m4.analyses[0].errors);
  const vq = V({ requests: [{ id: 'r1', text: 'add a red circle called Alpha', do: 'path', args: { from: [{ name: 'Start' }], to: [{ name: 'Done' }] } }], not_understood: [] }), mq = toNodes(spec, vq, ctx, NK.NEXT_CONTEXT);
  ok('a question act becomes a question wire with ask=', K.serialize(mq.nodes[0]) === '@r1 question ask=path from=Start to=Done');
}

// 6. score from token probabilities
{
  const raw = JSON.stringify(good), enc = new TextEncoder();
  // tokens of 3 characters each with log-probability -0.1, except those overlapping the value red (characters of "red") at -2.0
  const r0 = raw.indexOf('"red"') + 1, r1 = r0 + 3, content = [];
  for (let i = 0; i < raw.length; i += 3) { const s = raw.slice(i, i + 3); content.push({ id: 1000 + i, token: s, logprob: i < r1 && i + 3 > r0 ? -2.0 : -0.1, bytes: [...enc.encode(s)], top_logprobs: [{ token: s, logprob: -0.1 }] }); }
  content.push({ id: 151645, token: '', logprob: -0.01, bytes: [], top_logprobs: [{ token: '', logprob: -0.01 }] });   // the end-of-generation token: no bytes
  const tk = tokensOf({ content }), v = V(good), sc = scoreRequests(v, tk, raw);
  ok('token text equals the raw output', tk.text === raw);
  ok('the score is the weakest field: color, the mean of its key and value tokens', sc[0].weakest === 'color' && Math.abs(sc[0].min - (-2.2 / 3)) < 1e-9, sc[0]);
  ok('fields cover do, each argument, each shape item and the end of the request', sc[1].fields.map(f => f.name).join(',') === 'do,from[0].ref,to[0].name,end', sc[1].fields.map(f => f.name));
  ok('missing probabilities: no score', Number.isNaN(scoreRequests(v, tokensOf(null), raw)[0].min));
  ok('the id and the quote are not scored', !sc[0].fields.some(f => /^(id|text)$/.test(f.name)));
  {
    const ids = content.map(t => t.id), gap = ids.slice(0, 5).concat([42], ids.slice(5));   // a generated token without its own probability entry
    const tg = tokensOf({ content }, gap), hit = tg.tokens.findIndex(t => Number.isNaN(t.logprob));
    ok('a token without a probability entry: the next entry has no probability', hit === 5 && tg.tokens.filter(t => Number.isNaN(t.logprob)).length === 1);
    ok('token ids that do not match: no tokens', !!tokensOf({ content }, [1, 2, 3]).error);
    const noTop = content.map((t, i) => i === 2 ? Object.assign({}, t, { top_logprobs: [] }) : t);
    ok('an entry without top_logprobs has no probability', Number.isNaN(tokensOf({ content: noTop }).tokens[2].logprob));
  }
}

// 6a. the ```json fence the runtime's grammar allows
{
  const raw = '```json\n' + JSON.stringify(good, null, 2) + '\n```', v = V(raw);
  ok('a fenced output (allowed by the runtime grammar) is valid, offsets unchanged', v.ok && v.fenced && v.requests.every(r => !r.blocked) && v.parsed.node.s >= 7, v.errors);
  ok('text around the fence is still invalid JSON', !V('Here you go: ' + raw).ok);
  ok('two fences are invalid JSON', !V(raw + raw).ok);
}

// 6b. the rules added after the independent review
{
  const one = r => V({ requests: [r], not_understood: [] }).requests[0];
  ok('an invented shape name (not on the drawing, not in the request) is blocked', one({ id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ name: 'Zeta' }], to: [{ name: 'Start' }] } }).blocked);
  ok('a name on the drawing outside the quote is accepted', !one({ id: 'r1', text: 'connect it to Start', do: 'connect', args: { from: [{ name: 'done' }], to: [{ name: 'Start' }] } }).blocked);
  ok('a new name that is not in the request is blocked', one({ id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Beta' } }).blocked);
  ok('a label that is not in the request is blocked', one({ id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Alpha', label: 'hello' } }).blocked);
  ok('context words outside the request quote are blocked', one({ id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Alpha', linked: [{ context: 'it' }] } }).blocked);
  ok('a relative position without an anchor is blocked', one({ id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Alpha', position: 'below' } }).blocked);
  ok('an anchor without a position is blocked', one({ id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Alpha', anchor: [{ name: 'Start' }] } }).blocked);
  ok('a count above the engine cap of 12 is blocked', one({ id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { count: 13 } }).blocked);
  ok('a name with a comma is blocked', one({ id: 'r1', text: 'add a red circle called Alpha', do: 'create', args: { name: 'Al,pha' } }).blocked);
  ok('color equal to notColor is blocked', one({ id: 'r1', text: 'add a red circle called Alpha', do: 'count', args: { color: 'red', notColor: 'red' } }).blocked);
  const sixteen = V({ requests: Array.from({ length: 16 }, (_, i) => ({ id: 'r' + (i + 1), text: 'add a red circle called Alpha', do: 'undo', args: {} })), not_understood: [] });
  ok('16 requests (the schema limit): the whole output is held, the rest may be missing', !sixteen.ok && /limit/.test(sixteen.errors.join(' ')));
  ok('a create name later used by name is accepted', !V({ requests: [good.requests[0], { id: 'r2', text: 'connect it to Start', do: 'connect', args: { from: [{ name: 'Alpha' }], to: [{ name: 'Start' }] } }], not_understood: [] }).requests[1].blocked);
}

// 7. the gate
{
  const v = V(good), m = toNodes(spec, v, ctx, NK.NEXT_CONTEXT); m.analyses.forEach(a => { a.score = -0.2; a.scoreMissing = null; });
  const g = qwenGate(Object.assign({ qwen: { ok: true, errors: [] } }, m), msg);
  ok('no calibrated threshold: nothing executes, every request is held with the reason', g.executed.length === 0 && g.held.length === 2 && g.units.every(u => !u.execute && !u.blocked && u.reasons.some(x => x.group === 'calibration')));
  ok('the connect depends on the create', g.units[1].dependsOn[0] === g.units[0]);
  ok('the reasons the chat shows have no digits (ui.js plainReason drops those)', g.units.every(u => u.reasons.every(x => !/\d/.test(x.text))), g.units.map(u => u.reasons));
  const gb = qwenGate({ qwen: { ok: false, errors: ['the output was cut off at the token limit'] }, nodes: [], analyses: [] }, msg);
  ok('an invalid output: one blocked unit, no Do it anyway, nothing executes', gb.units.length === 1 && gb.units[0].blocked && gb.executed.length === 0);
}
ok('user turn: names and message', userContent(['A', 'B'], 'x') === 'Names on the canvas: A, B\nMessage: x' && userContent([], 'x').includes('(none)'));
console.log(`${n - fail}/${n} passed`);
process.exit(fail ? 1 : 0);
