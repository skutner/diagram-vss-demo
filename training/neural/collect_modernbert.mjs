// MODEL=finalized-folder node collect_modernbert.mjs records.jsonl fresh2+short3 DATA_DIR...
// Uses this artifact's own cutter and the browser's own 24 confidence features.
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { canon } from '../../docs/js/bench-canon.js';
import { nextContext } from '../../docs/js/vss-composer.js';
import { signals } from '../../docs/js/neural-confidence.js';
import { goldSpans, pairValue, actOf } from '../sketch/layer_common.mjs';
import { startCollection, validateCollection, inputHash, hashFile, atomicJSON, collectionRuntime } from './calibrate_modernbert.mjs';

const [out, set, ...dirs] = process.argv.slice(2);
if (!out || !set || !dirs.length || !process.env.MODEL) throw new Error('MODEL=folder node collect_modernbert.mjs OUT SET DATA_DIR...');
if(set!=='fresh2+short3')throw new Error('Only the preregistered fresh2+short3 collection is accepted');
const folder = resolve(process.env.MODEL), name = basename(folder), manifestPath=out+'.manifest.json';
if(existsSync(out)||existsSync(manifestPath))throw new Error('Use a fresh records path; preserve existing collection evidence');
const prepared=startCollection(folder,dirs),artifacts=prepared.manifest.model.artifacts;
atomicJSON(manifestPath,prepared.manifest);
writeFileSync(out,'',{flag:'wx'});
const require = createRequire(new URL('../laptop/package.json', import.meta.url));
// Annotation-derived only: this is a reporting split, never a word-to-action map.
const seenTriggers = new Set(prepared.trainingInfo.triggers);
const T = require('@huggingface/transformers');
prepared.manifest.runtime=collectionRuntime(T);
atomicJSON(manifestPath,prepared.manifest);
const K = require('../../docs/js/logic.js'); globalThis.SOPKit = K;
const N = require('../../docs/js/neural.js');
T.env.allowRemoteModels = false; T.env.allowLocalModels = true;
T.env.localModelPath = dirname(folder) + '/'; T.env.useBrowserCache = false;
const cache=mkdtempSync(tmpdir()+'/modernbert-collection-');
T.env.useFSCache=true;T.env.cacheDir=cache;
let model;
try {
const tokenizer = await T.AutoTokenizer.from_pretrained(name, { local_files_only: true });
model = await T.AutoModel.from_pretrained(name, { device: 'cpu', dtype: 'q8', local_files_only: true,
  session_options: { graphOptimizationLevel: prepared.manifest.runtime.execution_policy.graph_optimization } });
if (model.config.model_type !== 'modernbert' || model.config.reader.tokenization !== 'wordwise-bpe-prefix-space-v1') throw new Error('Expected trained ModernBERT reader');
const m = N.makeReader(T, tokenizer, model);
const system = K.createSystem(), neural = N.create(system.engine, () => { throw new Error('ModernBERT invoked Rules fallback'); }, { activateCut: false, requireJoint: true });
neural.setModels(m); neural.setStrategy('finetuned');
let count = 0;
for (const row of prepared.rows) {
    const result = await neural.formalize(row.text, { names: [...(row.names || [])], last: [] }, { update: nextContext, signals: true });
    const gold = goldSpans(row);
    gold.forEach((g,i) => {
      g.trigger = row.wires[i].trigger || null;
      g.triggerGroup = g.trigger == null ? 'unannotated' : seenTriggers.has(String(g.trigger).toLowerCase()) ? 'seen' : 'unseen';
    });
    const mains = result.nodes.filter(n => n.type !== 'mention');
    const units = mains.map(n => ({ c0: n.span[0], c1: n.span[1] }));
    const prods = mains.map((n, i) => ({ u: i, act: actOf(n.type, n.args), rawC: canon(n, result.nodes) }));
    const pair = new Map(pairValue({ text: row.text, gold, units, prods }));
    const owner = new Map(result.nodes.map(n => [n.id, n.unit?.id]));
    const refs = v => v && typeof v === 'object' && v.ref ? [v.ref] : Array.isArray(v) ? v.flatMap(refs) : [];
    const produced = mains.map((n, i) => {
      const si = result.analyses.indexOf(n.unit), sig = signals(result, si);
      if (!sig || sig.detail.noCut) throw new Error(`Missing own confidence outputs: ${row.id}/${si}`);
      for (const [key, value] of Object.entries(sig.f)) if (value != null && !Number.isFinite(value)) throw new Error('Non-finite confidence feature ' + key);
      const g = pair.get(i) ?? -1, want = g < 0 ? null : gold[g].want;
      const o = want == null ? 'extra' : Object.entries(want).every(([k, v]) => (prods[i].rawC[k] ?? '∅') === v) ? 'right' : 'wrong';
      // A wrong action is paired as extra + unread by PAIR=value. An exact
      // annotated span still establishes that this first failure is in the heads.
      const exactCut = gold.some(w => n.span[0] === w.s && n.span[1] === w.e);
      return { o, g, triggerGroup: g < 0 ? 'unpaired extras' : gold[g].triggerGroup, act: sig.act, pa: prods[i].act, f: sig.f, src: n.unit.src, span: n.span,
        got: prods[i].rawC, want, truncated: !!result.joint.reads[si]?.truncated,
        cause: o === 'right' ? null : !exactCut ? 'cutter' : 'heads',
        dependencies: [...new Set(Object.values(n.args || {}).flatMap(refs).map(id => owner.get(id)).filter(id => id && id !== n.unit.id))], wireId: n.unit.id };
    });
    appendFileSync(out, JSON.stringify({ id: row.id, set, input_sha256:inputHash(row), gold: gold.length, goldActs: gold.map(g => g.act),
      text: row.text, goldSpans: gold, modernbert: produced, cut: 'own', cutInfo: m.cutInfo(row.text),
      unread: result.unread || [], artifacts }) + '\n');
    if (++count % 100 === 0) console.error(`${count} messages (ModernBERT own cut; 8-bit weights, float32 arithmetic)`);
}
} finally {
  try { if(model)await model.dispose(); }
  finally { rmSync(cache,{recursive:true,force:true}); }
}
const records=readFileSync(out,'utf8').split('\n').filter(x=>x.trim()).map(JSON.parse);
const finalized={...prepared.manifest,complete:true,records:{count:records.length,sha256:hashFile(out)}};
validateCollection(records,finalized,out);
atomicJSON(manifestPath,finalized);
console.log(JSON.stringify({ messages:records.length,artifacts,manifest:manifestPath,complete:true }));
