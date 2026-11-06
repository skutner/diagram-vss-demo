// m5_report.mjs: the M5 table of MODERNBERT_PARITY_PLAN.md section 5, with the thresholds as restated in MODERNBERT_RUNLOG.md (the teachers' own agreement c
// on the set, gpt scored against Opus by the scorer's rule, is the ceiling that the plan's 85% and 70% fall under):
//   every request executed: right >= 0.75 c          at the cost-10 threshold: right >= 0.5 c and <= 2% of executions wrong
//   paraphrase groups: same effect as the gold >= 50%        the other rows as in the plan.
// It reads only score_arm.mjs / compare_arms.mjs / free_run_set.mjs outputs. Nothing is computed from records and nothing is fitted.
//   node m5_report.mjs --final F.score.json --control C.score.json [--side S.score.json] --compare F_minus_C.json
//        [--free-final F.free_run.json --free-control C.free_run.json [--free-side S.free_run.json]]
//        [--fs-final F.eval.score.json --fs-control C.eval.score.json --fs-compare fs_minus_C.json --rules rules.score.json]
//        [--names F0-s0,SOP-F0-s0,M4-s0] [--set nl_b] [--part all] [--drawing] [--json OUT.json]
//   node m5_report.mjs --arms DIR --final-arm F0-s0 --control-arm SOP-F0-s0 [--side-arm M4-s0] [--rules rules.score.json]    (the paths of m5_nlb.sh in DIR/ARM/nlb/ and DIR/ARM/eval/)
//   node m5_report.mjs --self-test      (on the baseline score files, with nl_a development in place of nl_b)
// --drawing: the arm reads the drawing (arm M4 adopted): the sessions bar is 60%, else 50% (the plan: "50% if M4 is declined").
// The side arm is shown beside, labelled as on a list the plan does not allow; it is never the verdict.
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import assert from 'node:assert/strict';

const j = p => JSON.parse(readFileSync(p, 'utf8'));
const pct = x => (x == null ? 'n/a' : (100 * x).toFixed(1) + '%');
const num = (x, d = 1) => (x == null ? 'n/a' : (+x).toFixed(d));
const part = (score, set, p) => { const x = score?.sets?.[set]?.[p]; if (!x) throw new Error(`the score file holds no ${set}/${p} (arm ${score?.artifact?.slice(0, 8)}); sets: ${Object.keys(score?.sets || {}).join(', ')}`); return x; };
const viewOf = x => { const v = x.views.opus; if (!v) throw new Error('no opus view: this is not a set with two teachers'); return v; };
const wrongShare = a => (a && a.executed ? (a.wrong + a.extras) / a.executed : a ? 0 : null);   // a threshold that executes nothing has no wrong execution

/** everything the table needs from one arm's score (+ free run) for the set: all numbers are read, none computed beyond a ratio */
export function readArm(score, free, set, p) {
  const x = part(score, set, p), v = viewOf(x), t = v.today, d = v.direction;
  const at = t.at_threshold, all = t.all_executed;
  if (!at) throw new Error('the score has no threshold: this arm was scored without a confidence file');
  const fr = free && free.sets?.[set]?.[p];
  return {
    messages: x.messages, requested: x.requested, c: x.teachers_agreement?.gpt_scored_against_opus?.today?.right_share ?? null, use: x.use, threshold: at.threshold,
    all: { right: all.right_share, wrong: all.wrong, extras: all.extras, cost: all.cost_score, right_dir: d.all_executed ? d.all_executed.right_share : null },
    gate: { right: at.right_share, wrongShare: wrongShare(at), wrong: at.wrong, extras: at.extras, asked: at.asked, executed: at.executed, cost: at.cost_score, auroc: at.auroc, right_dir: d.at_threshold ? d.at_threshold.right_share : null },
    unseen: { all: t.by_trigger?.unseen?.all_executed?.right_share ?? null, requested: t.by_trigger?.unseen?.all_executed?.requested ?? null, gateWrong: wrongShare(t.by_trigger?.unseen?.at_threshold) },
    paraphrase: x.paraphrase ? { all: x.paraphrase.all_executed, gate: x.paraphrase.at_threshold, floor: x.do_nothing_floor?.paraphrase } : null,
    nothing: x.nothing_to_do ? { gate: x.nothing_to_do.at_threshold?.actions_executed_per_100_messages ?? null, all: x.nothing_to_do.all_executed?.actions_executed_per_100_messages ?? null, messages: (x.nothing_to_do.at_threshold || x.nothing_to_do.all_executed).messages } : null,
    sessions: fr ? { all: fr.modes.all, gate: fr.modes.gate, floor: fr.do_nothing_floor } : null,
    either: x.views.either ? { all: x.views.either.today.all_executed.right_share, gate: x.views.either.today.at_threshold?.right_share ?? null, requested: x.views.either.today.all_executed.requested } : null,
  };
}

const bar = { pass: 'PASS', fail: 'FAIL', na: 'n/a' };
const verdict = (ok) => (ok == null ? bar.na : ok ? bar.pass : bar.fail);

/** the table: {rows: [{id, row, bar, final, control, side, status, note}], cannot: [...], summary} */
export function buildReport(o) {
  const set = o.set || 'nl_b', p = o.part || 'all';
  const F = readArm(o.final, o.freeFinal, set, p), C = o.control ? readArm(o.control, o.freeControl, set, p) : null, S = o.side ? readArm(o.side, o.freeSide, set, p) : null;
  for (const [n, A] of [['control', C], ['side', S]]) if (A && F.c != null && A.c != null && Math.abs(A.c - F.c) > 1e-9) throw new Error(`the teachers' agreement differs between final and ${n} (${F.c} against ${A.c}): not the same set`);
  const c = F.c;
  if (c == null) throw new Error('no teachers\' agreement in the final arm\'s score: c is unknown');
  const sessBar = o.drawing ? 0.6 : 0.5, rows = [];
  const add = (id, row, barText, fin, ctl, side, ok, note = '') => rows.push({ id, row, bar: barText, final: fin, control: ctl, side, status: verdict(ok), note });
  const cmp = o.compare?.comparisons?.[`${set}/${p}`], cv = cmp?.variants?.['opus.today.gate'], cvAll = cmp?.variants?.['opus.today.all'];
  const g = (A, f) => (A ? f(A) : null);
  add('1', `${set}: every request executed, right (teachers' agreement c = ${pct(c)})`, `>= 0.75 c = ${pct(.75 * c)}`, pct(F.all.right), g(C, a => pct(a.all.right)), g(S, a => pct(a.all.right)), F.all.right >= .75 * c - 1e-12, `with the direction of a resize compared: ${pct(F.all.right_dir)}; either teacher (upper reading): ${pct(F.either?.all)}`);
  add('2', `${set}: at the cost-10 threshold, right`, `>= 0.5 c = ${pct(.5 * c)}`, pct(F.gate.right), g(C, a => pct(a.gate.right)), g(S, a => pct(a.gate.right)), F.gate.right >= .5 * c - 1e-12, `threshold ${num(F.threshold, 4)}; asked ${F.gate.asked}; with direction: ${pct(F.gate.right_dir)}`);
  add('3', `${set}: at the cost-10 threshold, executions wrong (wrong + extras)`, '<= 2%', `${pct(F.gate.wrongShare)} (${F.gate.wrong + F.gate.extras} of ${F.gate.executed})`, g(C, a => `${pct(a.gate.wrongShare)} (${a.gate.wrong + a.gate.extras} of ${a.gate.executed})`), g(S, a => `${pct(a.gate.wrongShare)} (${a.gate.wrong + a.gate.extras} of ${a.gate.executed})`), F.gate.wrongShare <= .02, F.gate.executed < 50 ? `only ${F.gate.executed} executions at the threshold: ${F.gate.executed ? 'a rate of so few is weak evidence' : 'nothing is executed, so the rate is vacuous (and row 2 shows what is lost)'}` : '');
  add('4', `${set}: cost score (cost-10 threshold) above the SOP-BERT control, 95% interval above 0`, 'interval above 0', `${num(F.gate.cost)}`, g(C, a => num(a.gate.cost)), g(S, a => num(a.gate.cost)),
    cv ? cv.ci95 != null && cv.ci95[0] > 0 : null, cv ? `final minus control ${num(cv.difference)} ${cv.ci95 ? `[${num(cv.ci95[0])}, ${num(cv.ci95[1])}]` : '(' + cv.ci95_reason + ')'}, ${cmp.unit}, ${cmp.resampled_units} units, sign-flip p ${cv.p_sign_flip}` : 'no comparison file');
  add('5', `${set}: requests whose trigger never occurs in training, every request executed, right`, '>= 70% (as in the plan)', `${pct(F.unseen.all)} (${F.unseen.requested} requests)`, g(C, a => pct(a.unseen.all)), g(S, a => pct(a.unseen.all)), F.unseen.all != null ? F.unseen.all >= .7 : null, 0.7 > 0.75 * c ? `the plan's 70% is not restated: it is ${pct(.7 / c)} of the teachers' agreement c, above the restated every-request bar (0.75 c = ${pct(.75 * c)})` : '');
  add('5b', `${set}: unseen triggers, at the threshold, executions wrong`, '<= 2%', pct(F.unseen.gateWrong), g(C, a => pct(a.unseen.gateWrong)), g(S, a => pct(a.unseen.gateWrong)), F.unseen.gateWrong != null ? F.unseen.gateWrong <= .02 : null);
  const pp = F.paraphrase;
  add('6', `${set}: paraphrase groups, wordings with the same effect as the gold (every request executed)`, '>= 50% (restated)', pp ? `${pct(pp.all.same_effect_as_gold_share)} (${pp.all.groups} groups, ${pp.all.wordings} wordings)` : 'n/a', g(C, a => a.paraphrase && pct(a.paraphrase.all.same_effect_as_gold_share)), g(S, a => a.paraphrase && pct(a.paraphrase.all.same_effect_as_gold_share)),
    pp ? pp.all.same_effect_as_gold_share >= .5 : null, pp ? `same effect as one another ${pct(pp.all.same_effect_share)}; at the threshold: as gold ${pct(pp.gate?.same_effect_as_gold_share)}, as one another ${pct(pp.gate?.same_effect_share)}, changed nothing ${pct(pp.gate?.changed_nothing_share)}; floor (executes nothing): as one another ${pct(pp.floor?.same_effect_share)}, as gold ${pct(pp.floor?.same_effect_as_gold_share)}` : 'no paraphrase groups in the score');
  add('7', `${set}: messages with nothing to do, actions executed per 100 at the threshold`, '<= 1', F.nothing ? `${num(F.nothing.gate, 2)} (${F.nothing.messages} messages; every request executed: ${num(F.nothing.all, 1)})` : 'n/a', g(C, a => a.nothing && num(a.nothing.gate, 2)), g(S, a => a.nothing && num(a.nothing.gate, 2)), F.nothing && F.nothing.gate != null ? F.nothing.gate <= 1 : null);
  const sh = s => (s ? ['shapes', 'arrows', 'groups'].map(k => `${k} ${s.mean_share_percent_of_what_the_session_changed[k] == null ? 'n/a' : num(s.mean_share_percent_of_what_the_session_changed[k]) + '%'}`).join(', ') : 'n/a');
  const sessOk = s => (s ? ['shapes', 'arrows', 'groups'].map(k => s.mean_share_percent_of_what_the_session_changed[k]).filter(x => x != null).every(x => x >= 100 * sessBar) : null);
  add('8', `${set}: step-by-step sessions, each on its own drawing, what the session changed that the reader changed the same way (mean over ${F.sessions?.all?.sessions ?? '?'} sessions, every request executed)`, `each >= ${100 * sessBar}%${o.drawing ? '' : ' (M4 declined)'}`, sh(F.sessions?.all), g(C, a => sh(a.sessions?.all)), g(S, a => sh(a.sessions?.all)), sessOk(F.sessions?.all),
    F.sessions ? `at the threshold: ${sh(F.sessions.gate)}; floor (executes nothing): ${sh(F.sessions.floor)}; same whole drawing in ${F.sessions.all.same_final_drawing} of ${F.sessions.all.sessions}; answers of the gold's questions ${F.sessions.all.questions_same_answer} of ${F.sessions.all.questions_with_a_gold_answer}` : 'no free-run file');
  // the arm's own old sets, from the evaluation scores
  let shortOk = null, shortFin = 'n/a', shortCtl = null, shortNote = 'no fresh2/short3 scores given';
  if (o.fsFinal && o.rules) {
    const s3 = a => part(a, 'short3', 'test').views.gold.today, f3 = s3(o.fsFinal), r3 = s3(o.rules).all_executed, G = r3.requested;
    const fr = f3.at_threshold.right / G, rr = r3.right / G, fw = f3.at_threshold.wrong / G, rw = r3.wrong / G;
    shortOk = fr >= rr - .05 && fw <= rw; shortFin = `right ${pct(fr)}, wrong ${pct(fw)}`; shortNote = `Rules, every request executed: right ${pct(rr)}, wrong ${pct(rw)}; short3 test only (the short sets of regress.sh are not read here)`;
    if (o.fsControl) { const k = s3(o.fsControl).at_threshold; shortCtl = `right ${pct(k.right / G)}, wrong ${pct(k.wrong / G)}`; }
  }
  add('9', 'short3 test: at the threshold, right within 5 points of the Rules and wrong not above theirs', 'right >= Rules - 5 pt; wrong <= Rules', shortFin, shortCtl, null, shortOk, shortNote);
  let loss = null, lossFin = 'n/a', lossNote = 'no fresh2/short3 comparison given';
  if (o.fsCompare) {
    const parts = ['fresh2/test', 'short3/test'].map(k => [k, o.fsCompare.comparisons?.[k]?.variants?.['gold.today.gate']]);
    loss = parts.every(([, v]) => v && v.ci95) ? parts.every(([, v]) => !(v.ci95[1] < 0)) : null;
    lossFin = parts.map(([k, v]) => `${k.split('/')[0]} ${v ? num(v.difference) + (v.ci95 ? ` [${num(v.ci95[0])}, ${num(v.ci95[1])}]` : '') : 'n/a'}`).join('; '); lossNote = 'final minus control, cost score at the threshold; a loss is shown when an interval lies below 0';
  } else if (o.fsFinal && o.fsControl) {
    const k = a => ['fresh2', 'short3'].map(s => part(a, s, 'test').views.gold.today.at_threshold.cost_score); lossFin = `final ${k(o.fsFinal).map(num)} against control ${k(o.fsControl).map(num)} (fresh2, short3; points, no interval)`; lossNote = 'point estimates only: no loss can be shown without an interval';
  }
  add('10', 'fresh2, short3 test: no loss against the SOP-BERT control', 'no interval below 0', lossFin, null, null, loss, lossNote);
  const adopt = cv ? cv.difference >= 5 && cv.ci95 != null && cv.ci95[0] > 0 : null;
  add('A', `Adoption (a separate decision): cost score on ${set} above the control's by >= 5 points, interval above 0`, '>= 5 points, interval above 0', cv ? `${num(cv.difference)}${cv.ci95 ? ` [${num(cv.ci95[0])}, ${num(cv.ci95[1])}]` : ''}` : 'n/a', null, null, adopt, 'for its cost: 150 MB and 537 ms against 68 MB and 71 ms per message (plan); if SOP-BERT does as well, that is the result');
  const cannot = [
    { row: `${set}: cost score above VSS-BERT's`, why: 'VSS-BERT is not a reader in collect_set.mjs (it needs the composer of the micro registry, vss-composer.js); its numbers on this set cannot be produced tonight' },
    { row: 'real messages (>= 200): no destructive action wrong, right share above the control', why: 'the data is LLM-written (MODERNBERT_RUNLOG.md D8); collected_1 holds 26 real messages (52 with the corrected variants), under 200, so the gate does not apply' },
    { row: 'seeds 1 and 2 (the spread)', why: 'only seed 0 was trained (MODERNBERT_RUNLOG.md); the 95% intervals of rows 4 and A are over messages, sessions and groups, not over seeds' },
    { row: 'the short sets of regress.sh', why: 'only short3 is read by these tools' },
  ];
  const computed = rows.filter(r => r.status !== bar.na);
  return { set, part: p, c, teachers_agreement_requested: F.requested, thresholds: { every_request_executed: .75 * c, at_threshold_right: .5 * c, wrong_execution_share: .02, paraphrase_same_effect_as_gold: .5, sessions: sessBar }, names: o.names, rows, cannot_compute: cannot,
    reached: computed.filter(r => r.id !== 'A').every(r => r.status === bar.pass) && computed.some(r => r.id !== 'A'), gating_rows_failing: rows.filter(r => r.id !== 'A' && r.status === bar.fail).map(r => r.id), gating_rows_not_computed: rows.filter(r => r.id !== 'A' && r.status === bar.na).map(r => r.id) };
}

export function printReport(R) {
  const [fn, cn, sn] = R.names || ['final', 'control', 'side'];
  const L = [];
  L.push(`# M5 on ${R.set} (${R.part}): ${fn} against its SOP-BERT control ${cn}${R.names?.[2] ? `, with ${sn} beside (on a list the plan does not allow)` : ''}`);
  L.push('', `c = the teachers' agreement per requested action on ${R.set} (gpt scored against Opus) = ${(100 * R.c).toFixed(1)}% of ${R.teachers_agreement_requested} requested actions. Thresholds as restated in MODERNBERT_RUNLOG.md; the rows not restated stand as in the plan.`);
  L.push('', `| row | bar | ${fn} | ${cn} | ${sn || 'side arm'} | verdict (${fn}) |`, '|---|---|---|---|---|---|');
  for (const r of R.rows) L.push(`| ${r.id}. ${r.row} | ${r.bar} | ${r.final} | ${r.control ?? ''} | ${r.side ?? ''} | **${r.status}** |`);
  L.push('', 'Notes:');
  for (const r of R.rows) if (r.note) L.push(`- ${r.id}: ${r.note}`);
  L.push('', 'Cannot be computed here:');
  for (const x of R.cannot_compute) L.push(`- ${x.row}: ${x.why}`);
  L.push('', R.gating_rows_failing.length ? `Gating rows failing: ${R.gating_rows_failing.join(', ')}.` : 'No computed gating row fails.', R.gating_rows_not_computed.length ? `Gating rows not computed: ${R.gating_rows_not_computed.join(', ')}.` : '',
    `"Detects the intention" (all computed gating rows pass, none missing): ${R.reached && !R.gating_rows_not_computed.length ? 'yes' : 'no / not decided'}. Rows that cannot be computed tonight (above) are pending, not passed.`);
  return L.join('\n') + '\n';
}

function fromArms(a) {
  const dir = (arm, ...f) => `${a.dir}/${arm}/${f.join('/')}`, setPath = (arm, f) => dir(arm, 'nlb', f);
  const o = { final: j(setPath(a.finalArm, 'nlb.score.json')), control: j(setPath(a.controlArm, 'nlb.score.json')), names: [a.finalArm, a.controlArm, a.sideArm].filter(Boolean) };
  const opt = (path) => (existsSync(path) ? j(path) : undefined);
  o.freeFinal = opt(setPath(a.finalArm, 'nlb.free_run.json')); o.freeControl = opt(setPath(a.controlArm, 'nlb.free_run.json'));
  o.compare = opt(setPath(a.finalArm, `minus_${a.controlArm}.json`)); o.fsCompare = opt(setPath(a.finalArm, `fs_minus_${a.controlArm}.json`));
  o.fsFinal = opt(dir(a.finalArm, 'eval', 'cal-fresh2-short3-nl_a.score.json')); o.fsControl = opt(dir(a.controlArm, 'eval', 'cal-fresh2-short3-nl_a.score.json'));
  if (a.sideArm) { o.side = j(setPath(a.sideArm, 'nlb.score.json')); o.freeSide = opt(setPath(a.sideArm, 'nlb.free_run.json')); }
  return o;
}

// ---------------------------------------------------------------- self-test: the baseline score files, nl_a development in place of nl_b
function selfTest() {
  const B = homedir() + '/.cache/diagram-vss-modernbert/arms/baseline/', E = fileURLToPath(new URL('../../../reports/evidence/modernbert-parity-baseline/baselines/', import.meta.url));
  const o = { set: 'nl_a', part: 'development', final: j(B + 'modernbert.cal-fresh2-short3-nl_a.score.json'), control: j(B + 'sop.cal-fresh2-short3-nl_a.score.json'), side: j(B + 'sop.cal-fresh2-short3.score.json'),
    freeFinal: j(B + 'modernbert.free_run.json'), freeControl: j(B + 'sop.free_run.json'), compare: j(E + 'modernbert_minus_sop.cal-fresh2-short3-nl_a.json'), rules: j(B + 'rules.score.json'),
    fsFinal: j(B + 'modernbert.cal-fresh2-short3-nl_a.score.json'), fsControl: j(B + 'sop.cal-fresh2-short3-nl_a.score.json'), fsCompare: j(E + 'modernbert_minus_sop.cal-fresh2-short3-nl_a.json'), names: ['ModernBERT', 'SOP-BERT', 'SOP (other fit)'] };
  const R = buildReport(o), by = Object.fromEntries(R.rows.map(r => [r.id, r]));
  const P = o.final.sets.nl_a.development, v = P.views.opus.today, c = P.teachers_agreement.gpt_scored_against_opus.today.right_share;
  assert.equal(R.c, c); assert.ok(Math.abs(c - 283 / 392) < 1e-4, 'c is the teachers\' 72.2% on nl_a development');
  assert.equal(R.thresholds.every_request_executed, .75 * c);
  // every threshold decision is recomputed here, by hand, from the score file
  assert.equal(by['1'].status, v.all_executed.right_share >= .75 * c ? 'PASS' : 'FAIL'); assert.equal(by['1'].status, 'FAIL');
  assert.equal(by['2'].status, v.at_threshold.right_share >= .5 * c ? 'PASS' : 'FAIL');
  assert.equal(by['3'].final.split(' ')[0], (v.at_threshold.executed ? (100 * (v.at_threshold.wrong + v.at_threshold.extras) / v.at_threshold.executed).toFixed(1) : '0.0') + '%');
  assert.equal(by['4'].status, o.compare.comparisons['nl_a/development'].variants['opus.today.gate'].ci95[0] > 0 ? 'PASS' : 'FAIL');
  assert.equal(by['6'].status, P.paraphrase.all_executed.same_effect_as_gold_share >= .5 ? 'PASS' : 'FAIL');
  assert.equal(by['7'].status, P.nothing_to_do.at_threshold.actions_executed_per_100_messages <= 1 ? 'PASS' : 'FAIL');
  assert.equal(by['8'].status, 'FAIL'); assert.match(by['8'].note, /floor/);
  assert.match(by['9'].note, /Rules, every request executed/); assert.match(by['10'].final, /fresh2/);
  assert.equal(by['A'].status, 'FAIL');
  assert.ok(R.cannot_compute.some(x => /VSS-BERT/.test(x.row)) && R.cannot_compute.some(x => /real messages/.test(x.row)) && R.cannot_compute.some(x => /seeds 1 and 2/.test(x.row)));
  assert.equal(R.reached, false);
  // a different c between arms is refused; a set that is not in the score is refused
  const bad = JSON.parse(JSON.stringify(o.control)); bad.sets.nl_a.development.teachers_agreement.gpt_scored_against_opus.today.right_share = .5;
  assert.throws(() => buildReport({ ...o, control: bad }), /teachers' agreement differs/);
  assert.throws(() => buildReport({ ...o, set: 'nl_b', part: 'all' }), /holds no nl_b\/all/);
  // the drawing flag moves the sessions bar to 60%
  assert.equal(buildReport({ ...o, drawing: true }).thresholds.sessions, .6);
  const text = printReport(R); assert.match(text, /Cannot be computed here/); assert.match(text, /\| 8\./);
  console.log(text);
  console.log('m5_report self-test: ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), a = {};
  for (let i = 0; i < args.length; i++) { const k = args[i]; if (k === '--self-test' || k === '--drawing') a[k.slice(2)] = true; else if (k.startsWith('--')) a[k.slice(2)] = args[++i]; else throw new Error('unexpected ' + k); }
  if (a['self-test']) selfTest();
  else {
    let o;
    if (a.arms) { o = fromArms({ dir: a.arms, finalArm: a['final-arm'], controlArm: a['control-arm'], sideArm: a['side-arm'] }); if (a.rules) o.rules = j(a.rules); }
    else {
      if (!a.final || !a.control) throw new Error('usage: m5_report.mjs --final F.score.json --control C.score.json [--side S.score.json] --compare F_minus_C.json ... | --arms DIR --final-arm A --control-arm B | --self-test');
      o = { final: j(a.final), control: j(a.control), side: a.side && j(a.side), compare: a.compare && j(a.compare), freeFinal: a['free-final'] && j(a['free-final']), freeControl: a['free-control'] && j(a['free-control']), freeSide: a['free-side'] && j(a['free-side']),
        fsFinal: a['fs-final'] && j(a['fs-final']), fsControl: a['fs-control'] && j(a['fs-control']), fsCompare: a['fs-compare'] && j(a['fs-compare']), rules: a.rules && j(a.rules), names: a.names ? a.names.split(',') : ['final', 'control', 'side'] };
    }
    o.set = a.set || 'nl_b'; o.part = a.part || 'all'; o.drawing = !!a.drawing;
    const R = buildReport(o);
    process.stdout.write(printReport(R));
    if (a.json) { const t = a.json + '.tmp-' + process.pid; writeFileSync(t, JSON.stringify(R, null, 1) + '\n'); renameSync(t, a.json); }
  }
}
