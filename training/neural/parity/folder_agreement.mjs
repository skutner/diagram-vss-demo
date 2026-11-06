// folder_agreement.mjs: the two teachers' agreement on a label folder, by the scorer's own rule (score_arm.mjs agreement/labelScores).
//   node training/neural/parity/folder_agreement.mjs FOLDER [OUT.json]
// FOLDER holds opus/ and gpt/ (and texts/), the layout of llm_bench/nl_a. It is loaded by sets.mjs loadSet('nl_a') (the folder is linked as
// nl_a inside a scratch root, so the checks, the part split and the items are exactly those of the set), the records are built by arm_lib.mjs
// buildRecord with a stub run (no reader: only goldSpans and goldAlt matter), the totals are score_arm.mjs agreement().
import { mkdtempSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { loadSet } from './sets.mjs';
import { buildRecord, seenFunction } from './arm_lib.mjs';
import { agreement, labelScores } from './score_arm.mjs';

const [folder, out] = process.argv.slice(2);
if (!folder) throw new Error('usage: node folder_agreement.mjs FOLDER [OUT.json]');
if (/(^|\/)nl_b\/?$/.test(resolve(folder))) throw new Error('nl_b is sealed');
const root = mkdtempSync(resolve(tmpdir(), 'folder-agreement-'));
let items;
try {
  symlinkSync(resolve(folder), root + '/nl_a', 'dir');
  items = loadSet('nl_a', { root }).items;
} finally { rmSync(root, { recursive: true, force: true }); }
const seen = seenFunction({ exact: [] }), stub = { reader: 'nothing', mains: [], allNodes: [], unread: [], cutInfo: null };
const records = items.map(it => buildRecord(it, stub, { seen }));
if (!records.every(r => r.goldAlt)) throw new Error('some message has no second teacher');

const totals = { all: agreement(records) };
for (const part of [...new Set(records.map(r => r.part))].sort()) totals[part] = agreement(records.filter(r => r.part === part));
const gpt = r => r.goldAlt, opus = r => r.goldSpans;
const disagreements = [];
for (const r of records) {
  const one = labelScores([r], gpt, opus).today;   // gpt scored against opus, one message
  if (one.wrong + one.not_done + one.extras > 0) disagreements.push({ id: r.id, part: r.part, wrong: one.wrong, not_done: one.not_done, extras: one.extras, requested: one.requested, unreliable: r.unreliable });
}
console.log(JSON.stringify({ folder: resolve(folder), messages: records.length, totals_today: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, { gpt_scored_against_opus: v.gpt_scored_against_opus.today, opus_scored_against_gpt: v.opus_scored_against_gpt.today }])) }, null, 1));
console.log(`messages with a disagreement: ${disagreements.length} of ${records.length}; unreliable among them: ${disagreements.filter(d => d.unreliable).length}`);
for (const d of disagreements) console.log(`${d.id}\twrong ${d.wrong}\tnot_done ${d.not_done}\textras ${d.extras}${d.unreliable ? '\tunreliable' : ''}`);
if (out) writeFileSync(out, JSON.stringify({ folder: resolve(folder), messages: records.length, totals, disagreements }, null, 1) + '\n');
