// test_qwen_lines.mjs: tests of the line-format reader (lines_reader.mjs), its per-request scores (line_scores.mjs) and its calibration
// (calibrate_qwen.mjs), before any number from them is used (QWEN3_FINETUNE_PLAN.md Q0.8 and section 7).
//   node test_qwen_lines.mjs
import { readFileSync } from 'node:fs';
import { K } from '../../neural/parity/parity_lib.mjs';
import { writeLines } from './lines_format.mjs';
import { lineSpec, readOutput, toNodes, grammar, learnKeys, messageWords } from './lines_reader.mjs';
import { tokensOfLines, scoreLines, signalsOf, SIGNALS } from './line_scores.mjs';
import { fitRecipe } from './calibrate_qwen.mjs';
import { auroc, ASK_ALL } from '../../neural/calibrate_modernbert.mjs';

let fails = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) fails++; };
const learned = JSON.parse(readFileSync(process.env.KEYS || (process.env.HOME + '/.cache/diagram-vss-qwen/arms/act_keys.ALL.json'), 'utf8'));
const spec = lineSpec(K.createSystem().engine, learned);
const ctx = { text: 'Draw a red circle called Pump, then connect Pump to Tank and label it "main line".', names: ['Tank'], labels: ['Cold room'] };

// ---------------------------------------------------------------- the reader
let raw = '[Draw] command action=create shape=circle color=red name=Pump\n[connect] command action=connect from=Pump to=Tank\n[label] command action=label from=Pump to=Tank label="main line"';
let v = readOutput(spec, raw, 'stop', ctx);
check('gold-like output: 3 requests, none held', v.ok && v.requests.length === 3 && v.requests.every(R => !R.blocked), JSON.stringify(v.requests.map(R => R.errors)));
check('toNodes gives 3 main wires through K.parse', toNodes(spec, v).mains.length === 3);
check('the trigger span is located in the message', v.requests[1].span && ctx.text.slice(...v.requests[1].span) === 'connect');
v = readOutput(spec, raw, 'length', ctx);
check('a cut output holds every request', !v.ok && v.requests.every(R => R.blocked));
const held = (line, why) => { const x = readOutput(spec, line, 'stop', ctx); check('held: ' + why, x.requests.length === 1 && x.requests[0].blocked, JSON.stringify(x.requests[0] && x.requests[0].errors)); };
held('[Draw] command action=frobnicate shape=circle', 'an action that is not a legend value');
held('[Draw] command action=create shape=blob', 'an enum value that is not a legend value');
held('[Draw] command action=create wibble=3', 'a key the act never takes in training');
held('[Paint] command action=create shape=circle', 'a trigger not in the message');
held('[] command action=create shape=circle', 'an empty trigger');
held('[Draw] command action=create shape=circle name=Boiler', 'a new name whose words are not in the message');
held('[connect] command action=connect from=Boiler to=Tank', 'a shape neither on the drawing nor in the message');
held('[connect] command action=connect from=$new to=Tank', '$new with no earlier create');
held('[label] command action=label from=Pump to=Tank label="side line"', 'a label whose words are not in the message (D1)');
held('this is not a line', 'a line that does not parse');
v = readOutput(spec, '[Draw] command action=create shape=blob name=Pump\n[connect] command action=connect from=$new to=Tank', 'stop', ctx);
check('a request using $new of a held create is held too', v.requests[1].blocked, JSON.stringify(v.requests[1].errors));
// review B1: $new binds to the latest create line even when it is held, and a name a held create would make is held
const ctx2 = { text: 'Draw Pump, draw a Valve, then connect it to Tank', names: ['Tank'], labels: [] };
v = readOutput(spec, '[Draw] command action=create shape=circle name=Pump\n[draw] command action=create shape=blob name=Valve\n[connect] command action=connect from=$new to=Tank', 'stop', ctx2);
check('B1: $new after a held create is held (not bound to the earlier create)', !v.requests[0].blocked && v.requests[1].blocked && v.requests[2].blocked && toNodes(spec, v).mains.length === 1, JSON.stringify(v.requests[2].errors));
v = readOutput(spec, '[Draw] command action=create shape=blob name=Pump\n[connect] command action=connect from=Pump to=Tank', 'stop', ctx2);
check('B1: a name only a held create would make is held', v.requests[1].blocked, JSON.stringify(v.requests[1].errors));
v = readOutput(spec, 'garbage line\n[connect] command action=connect from=$new to=Tank', 'stop', ctx2);
check('B1: $new after an unreadable line is held', v.requests[1].blocked);
for (const [bad, why] of [['[draw] command action=creat shape=rectangle name=Valve', 'misspelled action'], ['[draw] command shape=rectangle name=Valve', 'missing action']]) {
  v = readOutput(spec, '[Draw] command action=create shape=circle name=Pump\n' + bad + '\n[connect] command action=connect from=$new to=Tank', 'stop', ctx2);
  check(`B1 delta: $new after a held line with a ${why} is held`, v.requests[2].blocked, JSON.stringify(v.requests[2].errors));
  v = readOutput(spec, '[Draw] command action=create shape=circle name=Pump\n' + bad + '\n[connect] command action=connect from=Valve to=Tank', 'stop', ctx2);
  check(`B1 delta: the name a held line with a ${why} would make is held`, v.requests[2].blocked, JSON.stringify(v.requests[2].errors));
}
v = readOutput(spec, '[Draw] command action=create shape=blob name=Pump\n[Draw] command action=create shape=circle name=Pump\n[connect] command action=connect from=Pump to=Tank', 'stop', ctx2);
check('a name made again by a later unheld create is not held', !v.requests[2].blocked, JSON.stringify(v.requests[2].errors));
const ctx3 = { text: 'Add a box labelled main pump, then move the main pump box left', names: [], labels: [] };
v = readOutput(spec, '[Add] command action=create shape=blob label="main pump"\n[move] command action=move target=mention(label=main pump) direction=left', 'stop', ctx3);
check('a description by a label only a held line would set is held', v.requests[1].blocked, JSON.stringify(v.requests[1].errors));
v = readOutput(spec, '[Add] command action=create shape=rectangle label="main pump"\n[move] command action=move target=mention(label=main pump) direction=left', 'stop', ctx3);
check('the same description after an unheld line passes', !v.requests[1].blocked, JSON.stringify(v.requests[1].errors));
v = readOutput(spec, '[connect] command action=connect from=Art to=Tank', 'stop', { text: 'Start: connect the flow to Tank', names: ['Tank'], labels: [] });
check('M1: a name inside a longer word of the message is not "written in the message"', v.requests[0].blocked, JSON.stringify(v.requests[0].errors));
v = readOutput(spec, '[connect] command action=connect from=mention(label=Cold room) to=Tank', 'stop', ctx);
check('a description label from the drawing passes', !v.requests[0].blocked, JSON.stringify(v.requests[0].errors));
v = readOutput(spec, '[label] command action=label from=Pump to=Tank label=', 'stop', ctx);
check('an empty label passes (removes a label)', !v.requests[0].blocked, JSON.stringify(v.requests[0].errors));
check('number table: "twelve thirty" reads as 12 and 30 only with the table', messageWords('meet at twelve thirty', true).has('12') && messageWords('meet at twelve thirty', true).has('30') && !messageWords('meet at twelve thirty', false).has('12'));
const lk = learnKeys([[{ type: 'command', args: { action: 'move', target: 'mention(color=red,shape=circle)', direction: 'left' } }]]);
check('learnKeys learns act keys and description keys', JSON.stringify(lk.act_keys) === '{"move":["direction","target"]}' && lk.desc_keys.join() === 'color,shape');
const g = grammar(spec);
check('the grammar has a root and one rule per act', g.startsWith('root ::=') && Object.keys(learned.act_keys).every(a => g.includes('a-' + a.replace(/[^A-Za-z0-9]/g, '-') + ' ::=')));
check('writeLines output round-trips through the reader on a gold row', (() => { const w = [{ trigger: 'Draw', type: 'command', args: { action: 'create', shape: 'circle', color: 'red', name: 'Pump' } }]; const x = readOutput(spec, writeLines(w), 'stop', ctx); return !x.requests[0].blocked && JSON.stringify(x.requests[0].args) === JSON.stringify(w[0].args); })());

// ---------------------------------------------------------------- the scores
const enc = s => [...new TextEncoder().encode(s)];
const toks = (pieces, eos = true) => [...pieces.map(([t, lp, lp2]) => ({ id: 1, logprob: lp, bytes: enc(t), top_logprobs: [{ logprob: lp }, { logprob: lp2 }] })), ...(eos ? [{ id: 151645, logprob: -0.01, bytes: [], top_logprobs: [{ logprob: -0.01 }, { logprob: -5 }] }] : [])];
const pieces = [['[Draw', -0.1, -3], ['] command', -0.2, -4], [' action=create', -0.3, -2], [' shape=circle', -1.5, -1.7], ['\n', -0.05, -4], ['[connect', -0.4, -2], ['] command action=connect from=Pump to=Tank', -0.2, -6]];
raw = pieces.map(p => p[0]).join('');
const tk = tokensOfLines(toks(pieces));
check('tokens decode to the raw text, end-of-turn kept apart', tk.text === raw && tk.eos && tk.tokens.length === pieces.length);
v = readOutput(spec, raw, 'stop', ctx);
const sc = scoreLines(v, tk, raw);
check('request 1: its weakest field is shape (-1.5)', sc[0].weakest === 'shape' && Math.abs(sc[0].score_min - -1.5) < 1e-9, JSON.stringify(sc[0]));
check('request 1: value margin is the smallest top-1 minus top-2 over act and values (0.2)', Math.abs(sc[0].val_margin_min - 0.2) < 1e-9, String(sc[0].val_margin_min));
check('request 1: its end is the newline (-0.05)', Math.abs(sc[0].fields.find(f => f.name === 'end').mean - -0.05) < 1e-9);
check('request 2 (last): its end is the end-of-turn token (-0.01)', Math.abs(sc[1].fields.find(f => f.name === 'end').mean - -0.01) < 1e-9);
check('signals of a full request are finite', signalsOf(sc[0], 20) && SIGNALS.every(([n]) => Number.isFinite(signalsOf(sc[0], 20)[n])));
const tkNo = tokensOfLines(toks(pieces, false)), scNo = scoreLines(v, tkNo, raw);
check('no end-of-turn probability: the last request has no signals (never executed)', scNo[1].missing && signalsOf(scNo[1], 20) === null && signalsOf(scNo[0], 20) !== null);
const bad = toks(pieces); bad[3].top_logprobs = [];
const scBad = scoreLines(v, tokensOfLines(bad), raw);
check('a token without top log-probabilities: that request has no signals', signalsOf(scBad[0], 20) === null && signalsOf(scBad[1], 20) !== null);
check('token text that differs from the output: no request has signals', scoreLines(v, tk, raw + 'x').every(s => s.missing));

// ---------------------------------------------------------------- calibration
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const mkRecords = (n, outcome) => Array.from({ length: n }, (_, i) => {
  const p = Array.from({ length: 2 }, (_, k) => { const f = Object.fromEntries(SIGNALS.map(([s]) => [s, Math.round(rnd() * 100) / 10])); return { o: outcome(f), f, act: 'command:create', truncated: false, dependencies: [], wireId: 'w' + (k + 1), pa: 'command:create' }; });
  return { id: 'm' + i, set: 'nl_a', part: 'calibration', reader: 'qwen-lines', artifacts_sha256: 'x', gold: 2, goldSpans: [{}, {}], produced: p };
});
let fit = fitRecipe(mkRecords(400, () => rnd() < 0.3 ? 'right' : 'wrong'));
check('shuffled outcomes: out-of-fold AUROC 0.5 +- 0.05', Math.abs(fit.best.auc - 0.5) <= 0.05, String(fit.best.auc));
check('shuffled outcomes: the cost-10 threshold asks everything', fit.spec.levels_out_of_fold.cost.threshold === ASK_ALL && fit.spec.levels_out_of_fold.cost.executed === 0, JSON.stringify(fit.spec.levels_out_of_fold.cost));
fit = fitRecipe(mkRecords(200, () => 'right'));
check('every outcome right: the fit refuses (asks everything)', !fit.fitAvailable && fit.spec.levels_out_of_fold.cost.threshold === ASK_ALL);
fit = fitRecipe(mkRecords(400, f => f.score_min > 5 ? 'right' : 'wrong'));
check('an informative signal: AUROC > 0.9 and something is executed', fit.best.auc > 0.9 && fit.spec.levels_out_of_fold.cost.executed > 0, `${fit.best.auc} ${JSON.stringify(fit.spec.levels_out_of_fold.cost)}`);
const recs = mkRecords(400, f => f.score_min > 5 ? 'right' : 'wrong'); for (const r of recs) for (const x of r.produced) if (x.f.score_min > 7) x.f = null;
fit = fitRecipe(recs);
const { decisions, stats } = await import('../../neural/calibrate_modernbert.mjs');
const { confidence } = await import('../../../docs/js/neural-confidence.js');
const items = recs.flatMap((r, mi) => r.produced.map((x, pi) => ({ ...x, id: r.id, mi, pi, c: x.f ? confidence(fit.spec, x.f, x.act) : NaN })));
const dec = decisions(items, fit.spec.levels_out_of_fold.cost.threshold);
check('records with a missing signal are never executed (and not fitted on)', dec.filter(x => !x.f).every(x => !x.execute) && fit.missing === dec.filter(x => !x.f).length, `missing ${fit.missing}`);
process.exitCode = fails ? 1 : 0;
console.log(fails ? `FAILED (${fails})` : 'ALL PASS');
