// short_probe.mjs: read a few short literal commands with one ModernBERT export folder, print each reading, its confidence and the cost gate.
// Usage: node short_probe.mjs <label> <model folder> <confidence.json>
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\/$/, '');
const K = createRequire(import.meta.url)(ROOT + '/docs/js/logic.js'); globalThis.SOPKit = K;
const [label, folder, confPath] = process.argv.slice(2);
const require = createRequire(ROOT + '/training/laptop/package.json');
const TF = require('@huggingface/transformers');
const N = createRequire(import.meta.url)(ROOT + '/docs/js/neural.js');
const { nextContext } = await import(ROOT + '/docs/js/vss-composer.js');
const NC = await import(ROOT + '/docs/js/neural-confidence.js');
TF.env.allowRemoteModels = false; TF.env.allowLocalModels = true; TF.env.localModelPath = dirname(folder) + '/'; TF.env.useBrowserCache = false;
const name = basename(folder);
const tokenizer = await TF.AutoTokenizer.from_pretrained(name, { local_files_only: true });
const model = await TF.AutoModel.from_pretrained(name, { device: 'cpu', dtype: 'q8', local_files_only: true, session_options: { graphOptimizationLevel: 'basic', intraOpNumThreads: 4 } });
const neural = N.create(K.createSystem().engine, () => { throw new Error('the reader called the Rules'); }, { activateCut: false, requireJoint: true });
neural.setModels(N.makeReader(TF, tokenizer, model)); neural.setStrategy('finetuned');
const spec = JSON.parse(fs.readFileSync(confPath, 'utf8'));
const thr = NC.threshold(spec, 'cost');
const names = ['Start', 'Process', 'Check', 'Done'];
const MSGS = (process.env.MSGS ? fs.readFileSync(process.env.MSGS, 'utf8').trim().split('\n') : ['draw a circle']);
let ran = 0;
console.log(`## ${label}  cost threshold ${thr.toFixed(4)}`);
for (const text of MSGS) {
  const out = await neural.formalize(text, { names, last: [] }, { update: nextContext, signals: true });
  const g = NC.gate(spec, out, 'cost');
  const wires = (out.nodes || []).map(K.serialize).join(' | ') || '(none)';
  const confs = g.units.map(u => u.conf.toFixed(3)).join(',') || '-';
  const ex = g.executed.length && !g.held.length ? 'RUN ' : g.executed.length ? 'PART' : 'HOLD';
  if (ex !== 'HOLD') ran++;
  console.log(`${ex} conf=${confs.padEnd(6)} ${JSON.stringify(text).padEnd(34)} -> ${wires}`);
}
console.log(`executed ${ran}/${MSGS.length}`);
