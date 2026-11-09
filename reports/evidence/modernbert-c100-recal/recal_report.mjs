// recal_report.mjs: the numbers of MODERNBERT_RECAL_PLAN.md that are reported and do not decide (section 5, "Reported, not deciding"), the reproduction
// of F_ctrl's published score, and the executed-wrong requests of F_short per form. Reads outputs only; writes summary.json and summary.md.
//   node reports/evidence/modernbert-c100-recal/recal_report.mjs EV_DIR OUT_DIR
// EV_DIR = ~/.cache/diagram-vss-modernbert/arms/C100-s0/recal (ctrl.* short.* compare.json), OUT_DIR = reports/evidence/modernbert-c100-recal.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { loadRecords, itemsOf, goldCount } from '../../../training/neural/parity/arm_lib.mjs';
import { scoredItems } from '../../../training/neural/parity/score_arm.mjs';
import { decisions } from '../../../training/neural/calibrate_modernbert.mjs';
import { loadSet, BENCH } from '../../../training/neural/parity/sets.mjs';

const [EV, OUT] = process.argv.slice(2);
if (!EV || !OUT) throw new Error('usage: recal_report.mjs EV_DIR OUT_DIR');
const J = p => JSON.parse(readFileSync(p, 'utf8'));
const C = homedir() + '/.cache/diagram-vss-modernbert/arms/C100-s0';
const ctrl = J(EV + '/ctrl.confidence.json'), short = J(EV + '/short.confidence.json'), sCtrl = J(EV + '/ctrl.score.json'), sShort = J(EV + '/short.score.json'), cmp = J(EV + '/compare.json');
const pub = J(C + '/eval/cal-fresh2-short3-nl_a.score.json');
const r4 = x => (x == null ? null : Math.round(x * 1e4) / 1e4);
const summary = {};
const md = [];

// ---------------------------------------------------------------- F_ctrl reproduces the published score
{
  const diffs = [];
  const walk = (a, b, path) => {
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) walk(a[k], b[k], path + '.' + k);
    } else if (a !== b) diffs.push({ path, published: a, ctrl: b });
  };
  const compared = [];
  for (const set of Object.keys(pub.sets)) { compared.push(set); walk(pub.sets[set], sCtrl.sets[set], 'sets.' + set); }
  for (const k of ['threshold_cost10', 'calibrated_on', 'artifact', 'reader']) walk(pub[k], sCtrl[k], k);
  summary.ctrl_reproduction = { compared_sets: compared, ctrl_only_sets: Object.keys(sCtrl.sets).filter(s => !(s in pub.sets)), differences: diffs.length, first_differences: diffs.slice(0, 10) };
  md.push('## F_ctrl against the published score file (`' + C + '/eval/cal-fresh2-short3-nl_a.score.json`)', '',
    `Deep comparison of the blocks of ${compared.join(', ')} (every number, including per kind, per trigger group, paraphrase, sessions) and of threshold, calibrated_on, artifact, reader: **${diffs.length} differences**.`, '');
  if (diffs.length) md.push('```', JSON.stringify(diffs.slice(0, 10), null, 1), '```', '');
}

// ---------------------------------------------------------------- the two fits
const fitRow = (name, spec) => ({ fit: name, calibrated_on: spec.arm.cal_sets, messages: spec.calibration.messages, requested: spec.calibration.requested, produced: spec.calibration.produced, l2: spec.calibration.l2, oof_auroc: r4(spec.calibration.oof_auroc),
  threshold_cost10: spec.levels_out_of_fold.cost.threshold, oof_cost10_score: r4(spec.levels_out_of_fold.cost.score), oof_executed: spec.levels_out_of_fold.cost.executed,
  act_prior_create: spec.act_prior.create, act_prior_default: spec.act_prior_default, levels: Object.fromEntries(Object.entries(spec.levels_out_of_fold).map(([k, v]) => [k, r4(v.threshold)])) });
summary.fits = [fitRow('F_ctrl', ctrl), fitRow('F_short', short)];
md.push('## The two fits', '', '| | F_ctrl | F_short |', '|---|---|---|');
for (const k of ['calibrated_on', 'messages', 'requested', 'produced', 'l2', 'oof_auroc', 'threshold_cost10', 'oof_cost10_score', 'oof_executed', 'act_prior_create', 'act_prior_default'])
  md.push(`| ${k} | ${JSON.stringify(summary.fits[0][k])} | ${JSON.stringify(summary.fits[1][k])} |`);
md.push(`| levels (cost1, cost2, cost5, cost, cost20) | ${JSON.stringify(summary.fits[0].levels)} | ${JSON.stringify(summary.fits[1].levels)} |`, '');

// ---------------------------------------------------------------- both fits on the reported sets
const at = (S, set, part, view) => S.sets[set]?.[part]?.views?.[view]?.today?.at_threshold;
const all = (S, set, part, view) => S.sets[set]?.[part]?.views?.[view]?.today?.all_executed;
const rows = [];
for (const [set, part, view] of [['synth_short_t1', 'all', 'gold'], ['short_synth', 'test', 'gold'], ['short3', 'test', 'gold'], ['fresh2', 'test', 'gold'], ['nl_a', 'development', 'opus'], ['collected_1', 'all', 'gold'], ['scenes_test', 'all', 'gold']]) {
  const key = `${set}/${part}`, v = cmp.comparisons[key]?.variants?.[`${view}.today.gate`];
  const row = { set: key, view, requested: at(sShort, set, part, view)?.requested, every_request_executed_right_share: { ctrl: all(sCtrl, set, part, view)?.right_share, short: all(sShort, set, part, view)?.right_share } };
  for (const [n, S] of [['ctrl', sCtrl], ['short', sShort]]) { const a = at(S, set, part, view); row[n] = a && { right: a.right, wrong: a.wrong, extras: a.extras, executed: a.executed, wrong_execution_share: a.wrong_execution_share, right_share: a.right_share, cost_score: a.cost_score }; }
  row.difference = v?.difference ?? null; row.ci95 = v?.ci95 ?? null; rows.push(row);
}
summary.sets_at_threshold = rows;
md.push('## Both fits at their own cost-10 threshold (today scoring)', '', '| set/part (view) | requested | F_ctrl right / wrong+extras / executed | F_short right / wrong+extras / executed | cost F_ctrl | cost F_short | difference (F_short - F_ctrl) | ci95 |', '|---|---:|---|---|---:|---:|---:|---|');
for (const r of rows) md.push(`| ${r.set} (${r.view}) | ${r.requested} | ${r.ctrl.right} / ${r.ctrl.wrong + r.ctrl.extras} / ${r.ctrl.executed} | ${r.short.right} / ${r.short.wrong + r.short.extras} / ${r.short.executed} | ${r.ctrl.cost_score} | ${r.short.cost_score} | ${r.difference} | ${JSON.stringify(r.ci95)} |`);
md.push('');

// collected_1: as sent and corrected, by kind
{
  const k = {};
  for (const [n, S] of [['ctrl', sCtrl], ['short', sShort]]) { const b = S.sets.collected_1.all.views.gold.today.at_threshold; void b; const byKind = S.sets.collected_1.all.views.gold.today.by_kind; k[n] = Object.fromEntries(Object.entries(byKind).map(([kind, x]) => [kind, x.at_threshold && { requested: x.at_threshold.requested, right: x.at_threshold.right, wrong: x.at_threshold.wrong, extras: x.at_threshold.extras, executed: x.at_threshold.executed }])); }
  summary.collected_1_by_kind = k;
  md.push('collected_1 by kind (26 real messages each as sent and as corrected: too few to decide anything): ' + '`' + JSON.stringify(k) + '`', '');
}

// nothing_to_do: executions per 100 messages
{
  const g = S => { const nt = S.sets.nl_a.development.nothing_to_do; return nt && { messages: nt.at_threshold?.messages, at_threshold: nt.at_threshold?.actions_executed_per_100_messages, all_executed: nt.all_executed?.actions_executed_per_100_messages }; };
  summary.nothing_to_do_nl_a_development = { ctrl: g(sCtrl), short: g(sShort) };
  md.push('Actions executed per 100 `nothing_to_do` messages (nl_a development): `' + JSON.stringify(summary.nothing_to_do_nl_a_development) + '`', '');
}

// ---------------------------------------------------------------- per form (meta.form joined by id) on the two short sets, and what F_short still executes wrong
const formOf = new Map();
for (const set of ['short_synth', 'synth_short_t1']) for (const f of loadSet(set).files) for (const l of readFileSync(resolve(BENCH, f), 'utf8').split('\n')) if (l.trim()) { const r = JSON.parse(l); formOf.set(r.id, r.meta.form); }
const files = sShort.record_files;
const { records } = loadRecords(files);
const perForm = {}, wrongList = [];
for (const [set, part] of [['short_synth', 'test'], ['synth_short_t1', 'all']]) {
  const recs = records.filter(r => r.set === set && r.part === part), key = `${set}/${part}`;
  perForm[key] = {};
  const reqByForm = {}; for (const r of recs) { const f = formOf.get(r.id); reqByForm[f] = (reqByForm[f] || 0) + r.gold; }
  for (const [name, spec] of [['ctrl', ctrl], ['short', short]]) {
    const thr = spec.levels_out_of_fold.cost.threshold, { items } = itemsOf(recs, 'primary', 'today'), dec = decisions(scoredItems(items, spec), thr);
    for (const x of dec) {
      const f = formOf.get(x.id), row = ((perForm[key][f] ||= { requested: reqByForm[f] })[name] ||= { all_right: 0, right: 0, wrong: 0, extras: 0 });
      if (x.o === 'right') row.all_right++;
      if (x.execute) { if (x.o === 'right') row.right++; else if (x.o === 'wrong') row.wrong++; else row.extras++; }
      if (x.execute && x.o !== 'right' && name === 'short') {
        const r = recs[x.mi], g = x.g >= 0 ? r.goldSpans[x.g] : null;
        wrongList.push({ set: key, form: f, id: x.id, text: r.text, outcome: x.o, conf: r4(x.c), read: x.pa + ' ' + JSON.stringify(x.got), gold: g ? g.act + ' ' + JSON.stringify(g.want) : null, record_cause: x.cause, span_read: r.text.slice(x.span[0], x.span[1]) });
      }
    }
    for (const f of Object.keys(perForm[key])) perForm[key][f][name] ||= { all_right: 0, right: 0, wrong: 0, extras: 0 };
  }
}
summary.per_form = perForm; summary.f_short_executed_wrong = wrongList;
for (const [key, forms] of Object.entries(perForm)) {
  md.push(`## Per form: ${key} (join by id to meta.form; at each fit's own threshold; all = every request executed)`, '', '| form | requested | F_ctrl all right | F_ctrl executed right / wrong+extras | F_short all right | F_short executed right / wrong+extras |', '|---|---:|---:|---|---:|---|');
  for (const [f, x] of Object.entries(forms).sort((a, b) => b[1].requested - a[1].requested)) md.push(`| ${f} | ${x.requested} | ${x.ctrl.all_right} | ${x.ctrl.right} / ${x.ctrl.wrong + x.ctrl.extras} | ${x.short.all_right} | ${x.short.right} / ${x.short.wrong + x.short.extras} |`);
  md.push('');
}
{
  const byForm = {};
  for (const w of wrongList) { const k = `${w.set} ${w.form} (${w.record_cause})`; byForm[k] = (byForm[k] || 0) + 1; }
  summary.f_short_executed_wrong_by_form_and_record_cause = byForm;
  md.push('## What F_short executes wrong, per form and per record cause (`cutter` = the read span is not a gold span, `heads` = the cut is right and the reading is not)', '', '| set, form (record cause) | executed wrong or extra |', '|---|---:|');
  for (const [k, n] of Object.entries(byForm).sort((a, b) => b[1] - a[1])) md.push(`| ${k} | ${n} |`);
  md.push('', 'Each one, with the reading, the gold and the confidence: `summary.json`, `f_short_executed_wrong`.', '');
}
writeFileSync(OUT + '/summary.json', JSON.stringify(summary, null, 1) + '\n');
writeFileSync(OUT + '/summary.md', md.join('\n') + '\n');
console.log(md.join('\n'));
