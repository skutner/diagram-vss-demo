// Tiny receipt fixtures test rejection contracts; they are never model parity evidence.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { EXPORT_SOURCES, EXPORT_MODE, BROWSER_ORT, hashFile, validateCandidate, validateParityReceipt, validateCompleteManifest, finalizeExport } from './finalize_modernbert_export.mjs';
import { EXECUTION_POLICY } from './modernbert_parity.mjs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const put=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2)+'\n');
function fixture() {
  const folder=mkdtempSync(tmpdir()+'/modernbert-receipt-');mkdirSync(folder+'/onnx');
  put(folder+'/config.json',{model_type:'modernbert',reader:{execution_policy:EXECUTION_POLICY},'transformers.js_config':{use_external_data_format:1}});
  for(const name of ['tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx','onnx/model_quantized.onnx_data'])writeFileSync(folder+'/'+name,'receipt contract fixture');
  const names=['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx','onnx/model_quantized.onnx_data'];
  const files=Object.fromEntries(names.map(name=>[name,{sha256:hashFile(folder+'/'+name),bytes:readFileSync(folder+'/'+name).length}]));
  const bindings={checkpoint_sha256:'a'.repeat(64),float_graph_sha256:'b'.repeat(64),files,sources:Object.fromEntries(EXPORT_SOURCES.map(name=>[name,hashFile(ROOT+name)]))};
  const cases=Array.from({length:18},(_,i)=>({id:i<16?'single-'+i:'batch-'+i,texts:i<16?['fixture']:['one','two unequal']}));
  const float_validation={passed:true,atol:1e-3,rtol:1e-3,max_abs:[0,0,0]};
  const reference={schema:'modernbert-reference-v2',export_mode:EXPORT_MODE,execution_policy:EXECUTION_POLICY,bindings,runtime:{python:'3.12',onnxruntime:'1.29.0',providers:['CPUExecutionProvider']},float_validation,cases};
  put(folder+'/references.json',reference);
  const candidate={schema:'modernbert-export-candidate-v2',complete:false,export_mode:EXPORT_MODE,execution_policy:EXECUTION_POLICY,bindings,reference:{file:'references.json',sha256:hashFile(folder+'/references.json')},float_validation,
    conversion:{converted_blocks:93,removed_activation_quantizers:91,interfaces_unchanged:true,opset:17,forbidden_operators:{},blocks:Array(93).fill({}),initializer_hashes:{fixture:'c'.repeat(64)}}};
  put(folder+'/export_manifest.json',candidate);
  const candidateHash=hashFile(folder+'/export_manifest.json');
  const checks={fixtures:18,singles:16,batches:2,ids:true,outputs:true,decoded:true,cuts:true,readMany:true};
  const node={schema:'modernbert-parity-receipt-v2',kind:'node',passed:true,export_mode:EXPORT_MODE,execution_policy:EXECUTION_POLICY,manifest_sha256:candidateHash,reference_sha256:candidate.reference.sha256,files,sources:bindings.sources,runtime:{transformers_js:'3.8.1',onnxruntime:'1.21.0',node:process.version,backend:'cpu'},checks};
  const browser={...node,kind:'browser',runtime:{transformers_js:'3.8.1',onnxruntime:BROWSER_ORT,backend:'wasm',threads:1,browser:'Chrome receipt fixture',assets:[{url:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/runtime.wasm',bytes:3,sha256:'d'.repeat(64)}]},cleanup:{browser_closed:true,server_closed:true},metrics:{load_ms:1,warm:{short_ms:1,multi_request_ms:1,message512_ms:1}}};
  put(folder+'/node-receipt.json',node);put(folder+'/browser-receipt.json',browser);
  return {folder,candidate,reference,candidateHash,node,browser,close:()=>rmSync(folder,{recursive:true,force:true})};
}

test('complete v2 receipt preserves exact candidate bytes and cannot be finalized twice',()=>{
  const f=fixture();try{
    const original=readFileSync(f.folder+'/export_manifest.json');
    const complete=finalizeExport(f.folder);assert.equal(complete.complete,true);
    assert.deepEqual(readFileSync(f.folder+'/export_candidate.json'),original);
    assert.equal(validateCompleteManifest(f.folder).manifest.schema,'modernbert-export-v2');
    assert.throws(()=>finalizeExport(f.folder),/Expected incomplete/);
  }finally{f.close();}
});

for(const [name,change,pattern] of [
  ['missing browser',f=>rmSync(f.folder+'/browser-receipt.json'),/ENOENT/],
  ['wrong browser version',f=>{f.browser.runtime.onnxruntime='1.29.0';put(f.folder+'/browser-receipt.json',f.browser);},/Wrong browser runtime/],
  ['wrong Node version',f=>{f.node.runtime.onnxruntime='1.29.0';put(f.folder+'/node-receipt.json',f.node);},/Wrong node runtime/],
  ['wrong optimization policy',f=>{f.browser.execution_policy={...EXECUTION_POLICY,graph_optimization:'all'};put(f.folder+'/browser-receipt.json',f.browser);},/Wrong browser execution policy/],
  ['changed shard',f=>writeFileSync(f.folder+'/onnx/model_quantized.onnx_data','tampered'),/Artifact hash/],
  ['missing tokenizer special tokens metadata',f=>rmSync(f.folder+'/special_tokens_map.json'),/ENOENT/],
  ['changed tokenizer special tokens metadata',f=>writeFileSync(f.folder+'/special_tokens_map.json','tampered'),/Artifact hash/],
  ['changed reference',f=>{f.reference.cases[0].texts=['changed'];put(f.folder+'/references.json',f.reference);},/Reference hash mismatch/],
  ['changed source',f=>{f.candidate.bindings.sources['docs/js/logic.js']='f'.repeat(64);f.reference.bindings=f.candidate.bindings;put(f.folder+'/references.json',f.reference);f.candidate.reference.sha256=hashFile(f.folder+'/references.json');put(f.folder+'/export_manifest.json',f.candidate);},/Export source changed/],
  ['failed status',f=>{f.browser.passed=false;put(f.folder+'/browser-receipt.json',f.browser);},/Missing passed browser/],
  ['partial fixtures',f=>{f.browser.checks.fixtures=17;put(f.folder+'/browser-receipt.json',f.browser);},/Incomplete.*checks/],
  ['missing output check',f=>{f.browser.checks.outputs=false;put(f.folder+'/browser-receipt.json',f.browser);},/Incomplete.*checks/],
  ['unclean browser',f=>{f.browser.cleanup.browser_closed=false;put(f.folder+'/browser-receipt.json',f.browser);},/resources not closed/],
  ['unbound receipt',f=>{f.browser.manifest_sha256='e'.repeat(64);put(f.folder+'/browser-receipt.json',f.browser);},/candidate mismatch/],
  ['missing WASM checksum',f=>{f.browser.runtime.assets=[];put(f.folder+'/browser-receipt.json',f.browser);},/asset hashes/],
])test('finalizer rejects '+name+' without publishing complete receipt',()=>{
  const f=fixture();try{change(f);assert.throws(()=>finalizeExport(f.folder),pattern);assert.equal(JSON.parse(readFileSync(f.folder+'/export_manifest.json')).complete,false);assert.equal(existsSync(f.folder+'/export_candidate.json'),false);}finally{f.close();}
});

test('complete receipt revalidates references, sources, shards and receipt files',()=>{
  for(const target of ['references.json','special_tokens_map.json','onnx/model_quantized.onnx_data','browser-receipt.json','export_candidate.json']){
    const f=fixture();try{finalizeExport(f.folder);writeFileSync(f.folder+'/'+target,'tampered');assert.throws(()=>validateCompleteManifest(f.folder));}finally{f.close();}
  }
});

test('legacy and incomplete receipts cannot establish parity',()=>{
  const f=fixture();try{
    assert.throws(()=>validateParityReceipt({...f.node,schema:'modernbert-export-v1'},'node',f.candidate,f.candidateHash,f.reference),/Missing passed/);
    assert.throws(()=>validateCandidate(f.folder,{...f.candidate,complete:true},f.reference),/Expected incomplete/);
    put(f.folder+'/export_manifest.json',{schema:'modernbert-export-v1',complete:true,parity:{node_exit_code:0}});
    assert.throws(()=>validateCompleteManifest(f.folder),/completed export v2/);
  }finally{f.close();}
});

test('production loader sends BASIC only to ModernBERT and preserves SOP/legacy options',async()=>{
  const require=createRequire(import.meta.url), SOPKit=require('../../docs/js/logic.js');
  const source=readFileSync(new URL('../../docs/js/neural.js',import.meta.url),'utf8');
  for(const mode of ['modernbert','sop-bert','legacy']) {
    const calls=[], modern=mode==='modernbert';
    const reader={acts:['create'],tags:['O'],classes:[],max_length:128,cut:{max_length:512},...(modern?{tokenization:'wordwise-bpe-prefix-space-v1',execution_policy:EXECUTION_POLICY}:{})};
    const config={model_type:modern?'modernbert':'distilbert',reader};
    const model=async input=>{
      const [b,n]=input.input_ids.dims;
      return {seq_logits:{dims:[b,1],data:new Float32Array(b)},token_logits:{dims:[b,n,1],data:new Float32Array(b*n)}};
    };model.config=config;
    const T={env:{},Tensor:class{constructor(type,data,dims){Object.assign(this,{type,data,dims});}},AutoTokenizer:{from_pretrained:async()=>({pad_token_id:0,encode:text=>text?[7]:[1,2]})},
      AutoModel:{from_pretrained:async(id,options)=>{calls.push({id,options});return model;}},
      pipeline:async(task,id,options)=>{calls.push({id,options});return async()=>task==='question-answering'?{answer:'circle',score:1}:[{label:'create',score:1}];}};
    const files=mode==='legacy'?{'neural/act-distilbert':'v1','neural/qa-distilbert-squad':'v1'}:{['neural/'+mode]:'v1'};
    const sizes=Object.fromEntries(Object.keys(files).map(name=>[name,Object.fromEntries(['config.json','tokenizer.json','tokenizer_config.json','onnx/model_quantized.onnx'].map(name=>[name,1]))]));
    const context={SOPKit,URL,console,testTransformers:T,document:{currentScript:{src:'https://example.test/js/neural.js'}},
      caches:{has:async()=>false,open:async()=>({keys:async()=>[]})},fetch:async url=>({ok:true,json:async()=>url.endsWith('versions.json')?{files,sizes}:config})};
    vm.createContext(context);vm.runInContext(source.replace('await import(LIB)','globalThis.testTransformers')+'\nglobalThis.kit=NeuralKit;',context);
    assert.equal((await context.kit.status(modern?'modernbert':'sop-bert')).published,true);
    await context.kit.load(null,modern?'modernbert':'sop-bert');
    assert.equal(calls.length,mode==='legacy'?2:1,mode+' '+JSON.stringify(calls));
    for(const {options} of calls) {
      assert.equal(options.device,'wasm');assert.equal(options.dtype,'q8');assert.equal(options.revision,'v1');assert.equal(typeof options.progress_callback,'function');
      assert.deepEqual(Object.keys(options).sort(),['device','dtype','revision','progress_callback',...(modern?['session_options']:[])].sort());
      if(modern)assert.equal(options.session_options.graphOptimizationLevel,'basic');
    }
  }
});
