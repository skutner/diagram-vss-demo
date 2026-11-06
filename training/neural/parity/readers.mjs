// readers.mjs: the shipped readers behind one call, for the parity measurements: makeRead(name, {gate}) -> async (text, ctx, world) => {nodes}.
// nothing writes no wire. rules, sop (SOP-BERT), modernbert. gate: 'cost' executes only what the reader's own confidence file lets through (no effect on rules).
// Env: LAPTOP_PKG = a package.json beside a node_modules with @huggingface/transformers 3.8.1 (default training/laptop/package.json);
// MODEL_FOLDER = docs/model/neural/<folder> to read (default by reader).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { K, ROOT, cp } from './parity_lib.mjs';
globalThis.SOPKit = K;

export async function loadNeural(name) {
  const require = createRequire(process.env.LAPTOP_PKG || new URL('../../laptop/package.json', import.meta.url));
  const TF = require('@huggingface/transformers');
  const N = createRequire(import.meta.url)(ROOT + '/docs/js/neural.js');
  const { nextContext } = await import(ROOT + '/docs/js/vss-composer.js');
  const folder = process.env.MODEL_FOLDER || (name === 'sop' ? 'sop-bert' : 'modernbert');
  TF.env.allowRemoteModels = false; TF.env.allowLocalModels = true; TF.env.localModelPath = ROOT + '/docs/model/neural/'; TF.env.useBrowserCache = false;
  const tokenizer = await TF.AutoTokenizer.from_pretrained(folder, { local_files_only: true });
  const model = await TF.AutoModel.from_pretrained(folder, { device: 'cpu', dtype: name === 'sop' ? N.dtypeOf('ours/sop-bert') : 'q8', local_files_only: true, session_options: name === 'sop' ? { intraOpNumThreads: 4 } : { graphOptimizationLevel: 'basic', intraOpNumThreads: 4 } });
  const neural = N.create(K.createSystem().engine, () => { throw new Error('the reader called the Rules'); }, { activateCut: false, requireJoint: true });
  neural.setModels(N.makeReader(TF, tokenizer, model)); neural.setStrategy('finetuned');
  return { neural, nextContext, TF, tokenizer };
}

export async function makeRead(name, { gate = null } = {}) {
  if (name === 'nothing') return async () => ({ nodes: [] });
  if (name === 'rules') return async (text, ctx, world) => { const r = K.createSystem(); r.world.state = cp(world.state); return { nodes: r.formalize(text, ctx).nodes }; };
  const { neural, nextContext } = await loadNeural(name);
  const NC = await import(ROOT + '/docs/js/neural-confidence.js');
  const spec = gate ? JSON.parse(fs.readFileSync(ROOT + `/docs/model/confidence/${name === 'sop' ? 'sop-bert' : 'modernbert'}.json`, 'utf8')) : null;
  return async (text, ctx) => {
    const out = await neural.formalize(text, ctx, { update: nextContext, signals: true });
    return { nodes: gate ? NC.gate(spec, out, gate).executed : out.nodes };
  };
}
