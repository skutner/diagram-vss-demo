// A complete receipt is issued only for the identical Python, Node and browser candidate.
import { createHash } from 'node:crypto';
import { readFileSync, openSync, readSync, closeSync, statSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EXECUTION_POLICY } from './modernbert_parity.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const EXPORT_MODE = 'weight-only-u8-fp32';
export const BROWSER_ORT = '1.22.0-dev.20250409-89f8206ba4';
export const EXPORT_SOURCES = ['training/neural/export_modernbert.py', 'training/neural/modernbert_parity.mjs',
  'training/neural/modernbert_weight_only.py',
  'training/neural/check_modernbert.mjs', 'training/neural/check_modernbert_browser.py',
  'training/neural/check_modernbert_browser.mjs', 'training/neural/finalize_modernbert_export.mjs',
  'docs/js/neural.js', 'docs/js/logic.js'];
const HASH = /^[a-f0-9]{64}$/;
const eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const need = (ok, why) => { if (!ok) throw Error(why); };
export function hashFile(path) {
  const hash = createHash('sha256'), fd = openSync(path, 'r'), chunk = Buffer.alloc(1024*1024);
  try { let n; while ((n = readSync(fd, chunk, 0, chunk.length, null))) hash.update(chunk.subarray(0,n)); }
  finally { closeSync(fd); }
  return hash.digest('hex');
}
const json = path => JSON.parse(readFileSync(path, 'utf8'));
function local(folder, name) {
  need(typeof name === 'string' && name.length > 0 && !name.startsWith('/') && !name.split('/').includes('..'), 'Unsafe artifact path');
  return resolve(folder, name);
}
export function validateCandidate(folder, candidate, reference) {
  need(candidate.schema === 'modernbert-export-candidate-v2' && candidate.complete === false && candidate.export_mode === EXPORT_MODE, 'Expected incomplete weight-only export v2 candidate');
  need(eq(candidate.execution_policy,EXECUTION_POLICY) && eq(reference.execution_policy,EXECUTION_POLICY), 'Wrong export execution policy');
  const bindings = candidate.bindings;
  need(HASH.test(bindings?.checkpoint_sha256 || '') && HASH.test(bindings?.float_graph_sha256 || ''), 'Missing checkpoint/float graph binding');
  need(reference.schema === 'modernbert-reference-v2' && reference.export_mode === EXPORT_MODE && eq(bindings,reference.bindings), 'Reference bindings differ from candidate');
  need(candidate.float_validation?.passed === true && candidate.float_validation.atol===1e-3 && candidate.float_validation.rtol===1e-3 && reference.float_validation?.passed === true && eq(candidate.float_validation,reference.float_validation), 'Float parity did not pass');
  need(reference.runtime?.onnxruntime === '1.29.0' && eq(reference.runtime.providers,['CPUExecutionProvider']), 'Wrong Python reference runtime');
  need(Array.isArray(reference.cases) && reference.cases.filter(c=>c.texts?.length===1).length >= 16 && reference.cases.some(c=>c.texts?.length>1), 'Incomplete parity fixtures');
  const config = json(local(folder,'config.json')), count = config['transformers.js_config']?.use_external_data_format;
  need(eq(config.reader?.execution_policy,EXECUTION_POLICY), 'Wrong model execution policy');
  need(config.model_type === 'modernbert' && Number.isInteger(count) && count > 0 && count <= 100, 'Invalid model/shard configuration');
  const required = ['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx'];
  for(let i=0;i<count;i++) required.push('onnx/model_quantized.onnx_data'+(i?'_'+i:''));
  need(eq(Object.keys(bindings.files || {}).sort(),required.sort()), 'Incomplete model file inventory');
  for (const [name, info] of Object.entries(bindings.files)) {
    const path = local(folder,name), size=statSync(path).size;
    need(HASH.test(info?.sha256 || '') && info.bytes===size && size>0 && size<100*1024**2 && (!name.includes('.onnx_data') || size<=90*1024**2) && hashFile(path)===info.sha256, 'Artifact hash/size mismatch: '+name);
  }
  need(EXPORT_SOURCES.every(name=>HASH.test(bindings.sources?.[name] || '')), 'Missing checker source binding');
  for(const [name, hash] of Object.entries(bindings.sources || {})) need(HASH.test(hash) && hashFile(local(ROOT,name))===hash, 'Export source changed: '+name);
  need(candidate.reference?.file && HASH.test(candidate.reference.sha256 || '') && hashFile(local(folder,candidate.reference.file))===candidate.reference.sha256, 'Reference hash mismatch');
  const conversion=candidate.conversion;
  need(conversion && conversion.converted_blocks===93 && conversion.removed_activation_quantizers===91 && conversion.interfaces_unchanged===true && conversion.opset===17 && eq(conversion.forbidden_operators,{}) && Array.isArray(conversion.blocks) && conversion.blocks.length===93 && Object.keys(conversion.initializer_hashes || {}).length>0, 'Incomplete weight-only structural conversion');
  return {config,bindings};
}
export function validateParityReceipt(receipt, kind, candidate, candidateHash, reference) {
  need(receipt?.schema==='modernbert-parity-receipt-v2' && receipt.kind===kind && receipt.passed===true && receipt.export_mode===EXPORT_MODE, 'Missing passed '+kind+' parity receipt');
  need(eq(receipt.execution_policy,EXECUTION_POLICY), 'Wrong '+kind+' execution policy');
  need(receipt.manifest_sha256===candidateHash && receipt.reference_sha256===candidate.reference.sha256 && eq(receipt.files,candidate.bindings.files) && eq(receipt.sources,candidate.bindings.sources), kind+' receipt candidate mismatch');
  const checks=receipt.checks;
  need(checks && ['ids','outputs','decoded','cuts','readMany'].every(k=>checks[k]===true) && checks.fixtures===reference.cases.length && checks.singles===reference.cases.filter(c=>c.texts.length===1).length && checks.batches===reference.cases.filter(c=>c.texts.length>1).length, 'Incomplete '+kind+' checks');
  need(receipt.runtime?.transformers_js==='3.8.1' && receipt.runtime.onnxruntime===(kind==='node'?'1.21.0':BROWSER_ORT) && receipt.runtime.backend===(kind==='node'?'cpu':'wasm'), 'Wrong '+kind+' runtime');
  if(kind==='node') need(typeof receipt.runtime.node==='string' && receipt.runtime.node.startsWith('v'), 'Missing actual Node version');
  if(kind==='browser') {
    need(receipt.runtime.threads===1 && typeof receipt.runtime.browser==='string' && receipt.runtime.browser.length>0, 'Missing actual browser runtime');
    need(receipt.cleanup?.browser_closed===true && receipt.cleanup.server_closed===true, 'Browser resources not closed');
    const assets=receipt.runtime.assets;
    need(Array.isArray(assets) && assets.some(a=>a.url.endsWith('.wasm')) && assets.every(a=>a.url.startsWith('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1') && HASH.test(a.sha256) && a.bytes>0), 'Missing pinned runtime asset hashes');
    need(receipt.metrics?.warm?.short_ms>=0 && receipt.metrics.warm.multi_request_ms>=0 && receipt.metrics.warm.message512_ms>=0 && receipt.metrics.load_ms>=0, 'Missing browser timing measurements');
  }
}
export function validateCompleteManifest(folder) {
  folder=resolve(folder);
  const manifest=json(local(folder,'export_manifest.json'));
  need(manifest.schema==='modernbert-export-v2' && manifest.complete===true && manifest.export_mode===EXPORT_MODE, 'Missing completed export v2 receipt');
  need(eq(manifest.execution_policy,EXECUTION_POLICY), 'Wrong completed execution policy');
  const candidatePath=local(folder,manifest.candidate?.file), candidate=json(candidatePath), candidateHash=hashFile(candidatePath);
  need(candidateHash===manifest.candidate.sha256, 'Candidate manifest changed');
  const reference=json(local(folder,candidate.reference.file));
  const validated=validateCandidate(folder,candidate,reference);
  need(eq(manifest.bindings,candidate.bindings), 'Completed manifest bindings changed');
  for(const kind of ['node','browser']) {
    const info=manifest.receipts?.[kind], path=local(folder,info?.file);
    need(HASH.test(info?.sha256 || '') && hashFile(path)===info.sha256, 'Changed '+kind+' receipt');
    validateParityReceipt(json(path),kind,candidate,candidateHash,reference);
  }
  return {...validated,manifest,candidate,reference};
}
export function finalizeExport(folder) {
  folder=resolve(folder);
  const path=local(folder,'export_manifest.json'), candidate=json(path), candidateHash=hashFile(path);
  need(candidate.schema==='modernbert-export-candidate-v2' && candidate.complete===false, 'Expected incomplete weight-only export v2 candidate');
  const reference=json(local(folder,candidate.reference?.file));
  validateCandidate(folder,candidate,reference);
  const receipts={};
  for(const kind of ['node','browser']) {
    const file=kind+'-receipt.json', receiptPath=local(folder,file);
    validateParityReceipt(json(receiptPath),kind,candidate,candidateHash,reference);
    receipts[kind]={file,sha256:hashFile(receiptPath)};
  }
  const archived='export_candidate.json';
  need(!existsSync(local(folder,archived)), 'Candidate archive already exists; preserve prior evidence');
  writeFileSync(local(folder,archived),readFileSync(path),{flag:'wx'});
  const complete={schema:'modernbert-export-v2',complete:true,export_mode:EXPORT_MODE,execution_policy:EXECUTION_POLICY,bindings:candidate.bindings,candidate:{file:archived,sha256:candidateHash},receipts};
  const temp=path+'.tmp';
  writeFileSync(temp,JSON.stringify(complete,null,2)+'\n',{flag:'wx'});renameSync(temp,path);
  return complete;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [folder]=process.argv.slice(2); if(!folder) throw Error('usage: finalize_modernbert_export.mjs MODEL_FOLDER');
  console.log(JSON.stringify(finalizeExport(folder)));
}
