// short_eval.mjs (scratch, not the registered metric): one reader on training/sketch/llm_train/synth_short_r2 (1,997 synthetic short commands
// whose gold the Rules read exactly), scored per message with docs/js/bench-canon.js score() (gold keys only, scale skipped, wires in order).
// Two views: every request executed; and the reader's cost-10 gate (right = executed and correct, wrong = executed and not correct,
// asked = nothing executed). Per meta.form too.
// Usage: node short_eval.mjs <label> rules|<model folder> [confidence.json] [train.jsonl for text-overlap count]  -> JSON on stdout last line
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');
const K = createRequire(import.meta.url)(ROOT + '/docs/js/logic.js'); globalThis.SOPKit = K;
const { score } = await import(ROOT + '/docs/js/bench-canon.js');
const [label, folder, confPath, trainPath] = process.argv.slice(2);
const dir = ROOT + '/training/sketch/llm_train/synth_short_r2/';
const rows = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort().flatMap(f => fs.readFileSync(dir + f, 'utf8').trim().split('\n').map(l => JSON.parse(l)));
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
let trainTexts = null;
if (trainPath && fs.existsSync(trainPath)) { trainTexts = new Set(); for (const l of fs.readFileSync(trainPath, 'utf8').split('\n')) { if (!l) continue; try { const r = JSON.parse(l); if (r.text) trainTexts.add(norm(r.text)); } catch {} } }
let read;
const NC = await import(ROOT + '/docs/js/neural-confidence.js');
let spec = null;
if (folder === 'rules') {
  read = async (text, ctx) => { const r = K.createSystem(); return { all: r.formalize(text, ctx).nodes, gated: null }; };
} else {
  const require = createRequire(ROOT + '/training/laptop/package.json');
  const TF = require('@huggingface/transformers');
  const N = createRequire(import.meta.url)(ROOT + '/docs/js/neural.js');
  const { nextContext } = await import(ROOT + '/docs/js/vss-composer.js');
  TF.env.allowRemoteModels = false; TF.env.allowLocalModels = true; TF.env.localModelPath = dirname(folder) + '/'; TF.env.useBrowserCache = false;
  const name = basename(folder);
  const tokenizer = await TF.AutoTokenizer.from_pretrained(name, { local_files_only: true });
  const model = await TF.AutoModel.from_pretrained(name, { device: 'cpu', dtype: 'q8', local_files_only: true, session_options: { graphOptimizationLevel: 'basic', intraOpNumThreads: 4 } });
  const neural = N.create(K.createSystem().engine, () => { throw new Error('the reader called the Rules'); }, { activateCut: false, requireJoint: true });
  neural.setModels(N.makeReader(TF, tokenizer, model)); neural.setStrategy('finetuned');
  spec = JSON.parse(fs.readFileSync(confPath, 'utf8'));
  read = async (text, ctx) => { const out = await neural.formalize(text, ctx, { update: nextContext, signals: true }); return { all: out.nodes || [], gated: NC.gate(spec, out, 'cost').executed }; };
}
const tot = { n: 0, all_right: 0, g_right: 0, g_wrong: 0, g_asked: 0, overlap: 0, errors: 0 }, byForm = {}, wrongEx = [];
const t0 = Date.now();
for (const row of rows) {
  const ctx = { names: row.names || [], last: [] };
  let r; try { r = await read(row.text, ctx); } catch (e) { r = { all: [], gated: [] }; tot.errors++; }
  const okAll = score(r.all, row).ok;
  const f = (byForm[row.meta?.form || '?'] ||= { n: 0, all_right: 0, g_right: 0, g_wrong: 0, g_asked: 0 });
  tot.n++; f.n++; if (okAll) { tot.all_right++; f.all_right++; }
  if (trainTexts && trainTexts.has(norm(row.text))) tot.overlap++;
  if (r.gated) {
    const main = r.gated.filter(n => n.type !== 'mention');
    if (!main.length) { tot.g_asked++; f.g_asked++; }
    else if (score(r.gated, row).ok) { tot.g_right++; f.g_right++; }
    else { tot.g_wrong++; f.g_wrong++; if (wrongEx.length < 12) wrongEx.push({ text: row.text, got: r.gated.map(K.serialize).join(' | '), want: row.wires.map(w => JSON.stringify(w.args)).join(' | ') }); }
  } else if (!okAll && wrongEx.length < 12) wrongEx.push({ text: row.text, got: r.all.map(K.serialize).join(' | '), want: row.wires.map(w => JSON.stringify(w.args)).join(' | ') });
}
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '-');
const g = tot.g_right + tot.g_wrong;
console.log(`## ${label}: n ${tot.n}, every request executed right ${pct(tot.all_right, tot.n)}%` + (spec ? `; cost gate (thr ${NC.threshold(spec, 'cost').toFixed(4)}): right ${tot.g_right} (${pct(tot.g_right, tot.n)}%), wrong ${tot.g_wrong}, asked ${tot.g_asked}, wrong share of executions ${pct(tot.g_wrong, g)}%` : '') + (trainTexts ? `; texts also in train.jsonl ${tot.overlap}` : '') + `; errors ${tot.errors}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (const [k, f] of Object.entries(byForm).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k.padEnd(16)} n ${String(f.n).padStart(4)}  all ${pct(f.all_right, f.n).padStart(5)}%` + (spec ? `  gate R/W/A ${f.g_right}/${f.g_wrong}/${f.g_asked}` : ''));
for (const w of wrongEx) console.log(`  WRONG ${JSON.stringify(w.text)} -> ${w.got} (want ${w.want})`);
console.log(JSON.stringify({ label, ...tot, byForm }));
