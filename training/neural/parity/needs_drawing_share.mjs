// needs_drawing_share.mjs: M4's first condition. Of the requests of a set part whose gold names a shape by a word the message does not write
// (root_causes.mjs needsKeys, nl_needs.py's rule), how many does the reader get right, with every request executed and at its threshold?
//   node training/neural/parity/needs_drawing_share.mjs SCORE.json [SET PART]      (default: nl_a development; primary view (Opus), today scoring)
// Records, confidence and threshold come from the score file; the items, the confidence and the threshold decision are the scorer's own
// (arm_lib itemsOf, score_arm scoredItems, calibrate_modernbert decisions), as score_arm.mjs computes them.
import fs from 'node:fs';
import { loadRecords, itemsOf } from './arm_lib.mjs';
import { needsKeys } from './root_causes.mjs';
import { scoredItems } from './score_arm.mjs';
import { decisions } from '../calibrate_modernbert.mjs';

const [scorePath, setName = 'nl_a', partName = 'development'] = process.argv.slice(2);
if (!scorePath) throw new Error('usage: needs_drawing_share.mjs SCORE.json [SET PART]');
const score = JSON.parse(fs.readFileSync(scorePath, 'utf8'));
const recs = loadRecords(score.record_files).records.filter(r => r.set === setName && r.part === partName);
if (!recs.length) throw new Error(`no records of ${setName}/${partName} in ${scorePath}`);
const spec = score.confidence_file && score.confidence_file !== 'none' ? JSON.parse(fs.readFileSync(score.confidence_file, 'utf8')) : null;
const threshold = score.threshold_cost10;
const needs = recs.map(r => r.goldSpans.map(g => needsKeys(g.args, r.text, g.span).msg.length > 0));
const { items } = itemsOf(recs, 'primary', 'today');
const scored = scoredItems(items, spec);
const dec = spec && threshold != null ? decisions(scored, threshold) : scored.map(x => ({ ...x, execute: true }));
const need = needs.reduce((s, a) => s + a.filter(Boolean).length, 0), total = needs.reduce((s, a) => s + a.length, 0);
const count = list => list.filter(x => x.o === 'right' && x.g >= 0 && needs[x.mi][x.g]).length;
const rightAll = count(scored), rightGate = count(dec.filter(x => x.execute));
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : '-');
console.log(JSON.stringify({ score: scorePath, set: setName, part: partName, messages: recs.length, requests: total, need_the_drawing: need,
  right_every_request_executed: rightAll, share_every_request_executed: pct(rightAll, need), right_at_threshold: rightGate,
  share_at_threshold: pct(rightGate, need), threshold }));
