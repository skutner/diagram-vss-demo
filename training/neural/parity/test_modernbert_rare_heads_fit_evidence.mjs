// Entirely synthetic, small evidence-chain fixtures. Never model-accuracy evidence.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {validateFitEvidence} from './modernbert_rare_heads_fit_evidence.mjs';
import {hash,compareRaw,compareCategorical,categorical} from './modernbert_rare_heads_fit.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url)),REPO=path.resolve(HERE,'../../..'),ROOT=path.join(homedir(),'.cache/diagram-vss-modernbert/rare-heads-2026-11-09/evidence-validator-dev');
fs.mkdirSync(ROOT,{recursive:true});
const require=createRequire(path.join(REPO,'training/laptop/package.json')),T=require('@huggingface/transformers');
globalThis.SOPKit=require(path.join(REPO,'docs/js/logic.js'));
const PY=path.join(homedir(),'.cache/diagram-vss-modernbert/venv/bin/python'),NAME='F-s1';
const clone=o=>structuredClone(o),put=(p,o)=>fs.writeFileSync(p,JSON.stringify(o)+'\n'),jl=(p,rows)=>fs.writeFileSync(p,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
const BARS={outline_create:[89,85],outline_coloured_create:[74,71],outline_set:[97,93],desc_r2:[35,34],desc_r2_canonical:[21,20],desc_old:[24,null],count_size:[14,14],absent_controls:[1440,1440]};
const outnames=['context.json','stdout.log','stderr.log','execution.json','node-receipt.json','batches.jsonl','decoded.jsonl','engine.stderr.log','rows.jsonl','summary.json'];
function fixture(runtime='ort',options={}) {
  const root=fs.mkdtempSync(path.join(ROOT,'chain-')),run=path.join(root,NAME,'run'),model=path.join(root,NAME,'export/modernbert-'+NAME),data=path.join(root,'data'),dir=path.join(root,NAME,'fit-'+runtime);
  for(const p of [run,model,data,dir,path.join(run,'tokenizer'),path.join(run,'encoder_config'),path.join(model,'onnx')])fs.mkdirSync(p,{recursive:true});
  const layout={acts:['create','set'],tags:['O','B-name'],classes:[['outline',['none','red','none']],['desc:size',['none','small']],['size',['none','large']]],tokenization:'wordwise-bpe-prefix-space-v1',max_length:128};
  const vocab=Object.fromEntries(['[PAD]','[UNK]','[CLS]','[SEP]','Café','Box',...Array.from({length:17},(_,i)=>String(i))].map((s,i)=>[s,i]));
  const specials=Object.keys(vocab).slice(0,4),tokenizer={version:'1.0',truncation:null,padding:null,normalizer:null,pre_tokenizer:{type:'Whitespace'},decoder:null,added_tokens:specials.map(content=>({id:vocab[content],content,single_word:false,lstrip:false,rstrip:false,normalized:false,special:true})),model:{type:'WordLevel',vocab,unk_token:'[UNK]'},post_processor:{type:'TemplateProcessing',single:[{SpecialToken:{id:'[CLS]',type_id:0}},{Sequence:{id:'A',type_id:0}},{SpecialToken:{id:'[SEP]',type_id:0}}],pair:[],special_tokens:Object.fromEntries(['[CLS]','[SEP]'].map(s=>[s,{id:s,ids:[vocab[s]],tokens:[s]}]))}};
  const tokenizerConfig={tokenizer_class:'PreTrainedTokenizerFast',pad_token:'[PAD]',unk_token:'[UNK]',bos_token:'[CLS]',eos_token:'[SEP]',model_max_length:8192};
  for(const folder of [model,path.join(run,'tokenizer')]){put(path.join(folder,'tokenizer.json'),tokenizer);put(path.join(folder,'tokenizer_config.json'),tokenizerConfig);put(path.join(folder,'special_tokens_map.json'),{});}
  put(path.join(data,'reader.json'),layout);fs.writeFileSync(path.join(data,'train.jsonl'),'synthetic fixture, never trained\n');
  put(path.join(run,'encoder_config/config.json'),{fixture:true});fs.writeFileSync(path.join(run,'checkpoint.pt'),'synthetic weight identity; never loaded\n');
  const meta={base:'answerdotai/ModernBERT-base',revision:'8949b909ec900327062f0ebf497f51aef5e6f0c8',settings:{seed:1,epochs:8,lr:6e-5,head_lr:6e-5,batch:32,cut_batch:8,weight_decay:.01,warmup:.06,clip:1,request_cap:128,message_cap:512,attn:'sdpa',autocast:'bfloat16',weights:'float32',gradient_checkpointing:false,max_updates:0},tokenization:layout.tokenization,python:'fixture Python; not executed',sources:{'parity/modernbert_rare_heads_fit.py':hash(path.join(HERE,'modernbert_rare_heads_fit.py'))},data:{messages:28330,requests:58552,files:Object.fromEntries(['reader.json','train.jsonl'].map(n=>[n,hash(path.join(data,n))]))}};
  const complete={complete:true,full_schedule:true,max_updates:0,state:{epoch:8,update:14640,total:14640},metadata:meta};put(path.join(run,'complete.json'),complete);
  const policy={graph_optimization:'basic',arithmetic:'float32',weight_storage:'uint8'},config={reader:{...layout,training_provenance:Object.fromEntries(['base','revision','settings','tokenization','sources'].map(k=>[k,meta[k]])),training_manifest:meta.data,export_mode:'weight-only-u8-fp32',execution_policy:policy},'transformers.js_config':{use_external_data_format:1}};
  put(path.join(model,'config.json'),config);
  for(const n of ['conversion.json','export_parity.json','references.json'])put(path.join(model,n),{fixture:true});
  for(const n of ['model_quantized.onnx','model_quantized.onnx_data'])fs.writeFileSync(path.join(model,'onnx',n),'synthetic artifact identity; never loaded\n');
  const modelFiles={};for(const n of fs.readdirSync(model))if(n!=='onnx')modelFiles[n]={sha256:hash(path.join(model,n)),bytes:fs.statSync(path.join(model,n)).size};for(const n of fs.readdirSync(path.join(model,'onnx')))modelFiles['onnx/'+n]={sha256:hash(path.join(model,'onnx',n)),bytes:fs.statSync(path.join(model,'onnx',n)).size};
  const exportReceipt={schema:'arm-export-receipt-v1',passed:false,export_mode:'weight-only-u8-fp32',execution_policy:policy,weights:{sha256:hash(path.join(run,'checkpoint.pt')),source_file:'checkpoint.pt',epoch:8,update:14640,total:14640,full_schedule:true,max_updates:0,source_changes_since_training:[]},source_changes_since_training:[],files:modelFiles,shards:['model_quantized.onnx_data'],python_ort_vs_node:{fixtures:3,singles:1,batches:2,ids:true,outputs:true,decoded:true,cuts:true,readMany:true,max_abs:[0,0,0]},tolerance:{atol:.001,rtol:.001},runtime:{backend:'cpu',transformers_js:'fixture',onnxruntime:'fixture',node:'fixture',python:'fixture',python_onnxruntime:'fixture'},torch_vs_node:{texts:1,differences:[{fixture:'preserved float/q8 difference'}]},cases_where_q8_decodes_differently_from_float:[{fixture:'preserved'}]};put(path.join(model,'arm_receipt.json'),exportReceipt);
  const tok=new T.PreTrainedTokenizer(tokenizer,tokenizerConfig),N=require(path.join(REPO,'docs/js/neural.js')),stub=()=>{throw Error('no fixture inference');};stub.config=config;const reader=N.makeReader(T,tok,stub);
  const requestReads=Array.from({length:17},(_,i)=>({act:layout.acts[i%2],classes:{outline:i%3,'desc:size':i%2,size:i%2},tags:Array(i%2?3:2).fill('O'),words:['Café',String(i),...(i%2?['Box']:[])],truncated:false,unreadFrom:null}));
  const requests=requestReads.map(r=>({arm:'F',text:r.words.join(' '),cap:128})),selections=[],populations=Object.fromEntries(Object.keys(BARS).map(k=>[k,[]]));
  const add=(family,count,head,population,absent=false)=>{
    const candidates=requestReads.map((r,i)=>[r,i]).filter(([r])=>absent?r.classes[head]===0:r.classes[head]>0);
    for(let j=0;j<count;j++){
      const [r,request]=candidates[j%candidates.length],target=r.classes[head],observation=selections.length;
      const row={arm:'F',source:path.join(data,'train.jsonl'),ordinal:request,id:'duplicate-id',request,family,head,gold:layout.classes.find(([k])=>k===head)[1][target],compiled:null,representation:absent?'compiled_missing':'encoded',absent_control:absent,targets:Object.values(r.classes),act:r.act,tags:r.tags};
      // This synthetic selection's family membership is independently frozen below.
      selections.push(row);populations[population].push(observation);
      if(population==='outline_create'&&j<74)populations.outline_coloured_create.push(observation);
      if(population==='desc_r2'&&j<21)populations.desc_r2_canonical.push(observation);
    }
  };
  add('outline_create',89,'outline','outline_create');add('outline_set',97,'outline','outline_set');add('description_size:target',35,'desc:size','desc_r2');add('description_size:from',24,'desc:size','desc_old');add('count_size',14,'size','count_size');add('outline_create',1440,'outline','absent_controls',true);
  if(options.qualityFail)for(const read of requestReads)read.classes.outline=0;
  const selectionFile=path.join(root,'selections.json'),populationFile=path.join(root,'populations.json');put(selectionFile,{requests,selections});put(populationFile,populations);
  const sourceFiles=['modernbert_rare_heads_fit.py','modernbert_rare_heads_fit.mjs','modernbert_rare_heads_fit_evidence.mjs','test_modernbert_rare_heads_fit_evidence.mjs'].map(n=>path.join(HERE,n));sourceFiles.push(path.join(REPO,'docs/js/neural.js'));
  const arm={arm:'F',seed:1,training:run,model,train_data:data,bundle:path.join(root,NAME,'bundle'),objective:'ordinary-ce-v1'};
  fs.writeFileSync(path.join(root,'hf-blob'),'pinned historical fixture blob\n');fs.symlinkSync('hf-blob',path.join(root,'hf-snapshot-link'));
  const frozen={version:'modernbert-rare-heads-frozen-v1',task_root:root,arms:{[NAME]:arm},inputs:{[path.join(data,'reader.json')]:hash(path.join(data,'reader.json')),[path.join(data,'train.jsonl')]:hash(path.join(data,'train.jsonl')),[path.join(root,'hf-snapshot-link')]:hash(path.join(root,'hf-snapshot-link'))},sources:Object.fromEntries(sourceFiles.map(p=>[p,hash(p)])),versions:{numpy:'fixture numpy',torch:'fixture torch',onnxruntime:'fixture ORT'},selections:{path:selectionFile,sha256:hash(selectionFile),populations:{path:populationFile,sha256:hash(populationFile)}}};
  const protocol=path.join(root,'frozen.json');put(protocol,frozen);const P={...frozen,file:protocol,sha256:hash(protocol)};
  const identities={...P.inputs,...P.sources,[P.file]:P.sha256};
  const walk=d=>{for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())walk(p);else identities[p]=hash(p);}};
  for(const d of [model,path.join(run,'tokenizer'),path.join(run,'encoder_config')])walk(d);
  for(const p of [path.join(run,'complete.json'),path.join(run,'checkpoint.pt'),path.join(REPO,'training/laptop/package-lock.json'),selectionFile,populationFile])identities[p]=hash(p);
  const diagnostics={receipt_sha256:hash(path.join(model,'arm_receipt.json')),float_vs_node_categorical_passed:false,float_vs_node:exportReceipt.torch_vs_node,cases_where_q8_decodes_differently_from_float:exportReceipt.cases_where_q8_decodes_differently_from_float};
  const context={version:'modernbert-rare-heads-fit-context-v1',name:NAME,runtime,arm,protocol,task_root:root,repo:REPO,python:PY,checkpoint:path.join(run,'checkpoint.pt'),identities,layout,selections:{requests,selections},populations,export_diagnostics:diagnostics};
  const batches=[],decoded=[],parity={scope:'actual-python-ort-versus-production-node-q8',atol:.001,rtol:.001,includes_padding:true,batches:0,values:0,numerical_failed:0,padding_values:0,padding_failed:0,action_compared:0,action_different:0,class_compared:0,class_different:0,tag_compared:0,tag_different:0,word_different:0};
  for(let start=0;start<requests.length;start+=8){
    const texts=requests.slice(start,start+8).map(r=>r.text),ps=texts.map(t=>reader.prepare(t,128)),n=Math.max(...ps.map(p=>p.ids.length)),B=ps.length,arrays={input_ids:ps.map(p=>[...p.ids,...Array(n-p.ids.length).fill(tok.pad_token_id)]),attention_mask:ps.map(p=>[...Array(p.ids.length).fill(1),...Array(n-p.ids.length).fill(0)])},W=layout.acts.length+layout.classes.reduce((s,[,v])=>s+v.length,0);
    const raw={token_logits:{dims:[B,n,layout.tags.length],data:Array(B*n*layout.tags.length).fill(0)},seq_logits:{dims:[B,W],data:Array(B*W).fill(0)},cut_logits:{dims:[B,n,3],data:Array(B*n*3).fill(0)}};
    for(let b=0;b<B;b++){const read=requestReads[start+b];raw.seq_logits.data[b*W+layout.acts.indexOf(read.act)]=8;let off=layout.acts.length;for(const[k,v]of layout.classes){raw.seq_logits.data[b*W+off+read.classes[k]]=8;off+=v.length;}for(const token of ps[b].first.values())raw.token_logits.data[(b*n+token)*layout.tags.length]=8;}
    const node=runtime==='ort'?clone(raw):null;
    if(node&&options.numericFail&&start===0)node.cut_logits.data[(n-1)*3+2]=Math.fround(.01);
    const numeric=node?compareRaw(raw,node,arrays,layout):null;
    batches.push({batch:batches.length,requests:texts.map((_,i)=>start+i),input:{batch:batches.length,texts,cap:128,arrays},python:raw,node,parity:numeric});
    if(node){parity.batches++;for(const c of Object.values(numeric.checks)){parity.values+=c.values;parity.numerical_failed+=c.failed;parity.padding_values+=c.padding_values;parity.padding_failed+=c.padding_failed;}const c=compareCategorical(requestReads.slice(start,start+B),requestReads.slice(start,start+B));for(const k of ['action_compared','action_different','class_compared','class_different','tag_compared','tag_different','word_different'])parity[k]+=c[k];}
    texts.forEach((_,b)=>decoded.push({request:start+b,words:requestReads[start+b].words,python:clone(requestReads[start+b]),...(node?{node:clone(requestReads[start+b])}:{})}));
  }
  parity.passed=parity.numerical_failed===0;
  const expectedParity=runtime==='ort'?parity:{scope:'float-checkpoint-fit',passed:null};
  const rows=selections.map((s,observation)=>{const r={...s,observation,text:requests[s.request].text};for(const k of runtime==='ort'?['python','node']:['python']){const read=clone(decoded[s.request][k]),target=s.targets[layout.classes.findIndex(([key])=>key===s.head)];r[k]={...read,head_index:read.classes[s.head],target_index:target,correct:read.classes[s.head]===target,action_right:read.act===s.act,tags_exact:JSON.stringify(read.tags)===JSON.stringify(s.tags)};}return r;});
  const summary={runtime,observations:1699,positives:259,absents:1440,requests:17,parity:expectedParity,export_diagnostics:diagnostics,populations:{},metrics:[],all_heads:Object.fromEntries(layout.classes.map(([k])=>[k,{observations:0,correct:0,positive:0,positive_correct:0,absent:0,absent_correct:0}]))},groups=new Map(),chosen=runtime==='ort'?'node':'python';
  for(const row of rows){const r=row[chosen],key=JSON.stringify([row.family,row.absent_control,row.representation]);if(!groups.has(key))groups.set(key,{family:row.family,absent_control:row.absent_control,representation:row.representation,runtime,rows:0,correct:0,action_right:0,tags_exact:0});const g=groups.get(key);g.rows++;for(const k of ['correct','action_right','tags_exact'])g[k]+=Number(r[k]);layout.classes.forEach(([k],i)=>{const h=summary.all_heads[k],t=row.targets[i],p=r.classes[k];h.observations++;h.correct+=Number(t===p);h.positive+=Number(t>0);h.positive_correct+=Number(t>0&&t===p);h.absent+=Number(t===0);h.absent_correct+=Number(t===0&&p===0);});}
  summary.metrics=[...groups.values()];for(const[k,[count,min]]of Object.entries(BARS)){const correct=populations[k].filter(i=>rows[i][chosen].correct).length;summary.populations[k]={rows:count,correct,minimum:min,passed:min===null?null:correct>=min};}
  const argv=['node',path.join(HERE,'modernbert_rare_heads_fit.mjs'),'--context',path.join(dir,'context.json'),'--out',dir],execution={argv,cwd:REPO,started:100,ended:105,exit_code:runtime==='ort'&&!parity.passed?1:0,signal:null,timeout_seconds:1800,failure:null};
  summary.passed=Object.values(summary.populations).every(p=>p.passed!==false)&&execution.exit_code===0;
  const nodeReceipt={version:'modernbert-rare-heads-fit-node-v1',context_sha256:'',name:NAME,runtime,argv:[process.execPath,...argv.slice(1)],started:101,ended:104,node:process.version,versions:{transformers:T.env.version,...(runtime==='ort'?{onnxruntime_node:require('onnxruntime-node/package.json').version}:{})},engine:{argv:[PY,'-B',path.join(HERE,'modernbert_rare_heads_fit.py'),'--engine',path.join(dir,'context.json')],started:102,ended:103,finished:true,batches:batches.length,versions:{python:meta.python,numpy:P.versions.numpy,torch:P.versions.torch,...(runtime==='ort'?{onnxruntime:P.versions.onnxruntime}:{})},code:0,signal:null},batches:batches.length,requests:17,outputs:{},parity:expectedParity};
  const receipt={version:'modernbert-rare-heads-fit-v1',scope:'actual-model-training-fit',name:NAME,runtime,protocol:{path:P.file,sha256:P.sha256},identities_before:identities,identities_after:identities,execution,outputs:{},counts:{observations:1699,positives:259,absents:1440,requests:17},parity:expectedParity,export_diagnostics:diagnostics,passed:summary.passed};
  for(const n of ['stdout.log','stderr.log','engine.stderr.log'])fs.writeFileSync(path.join(dir,n),'fixture-only evidence-chain test\n');
  const f={P,root,run,model,data,dir,runtime,context,nodeReceipt,receipt,summary,rows,batches,decoded,selections,exportReceipt};
  f.seal=()=>{put(path.join(dir,'context.json'),context);jl(path.join(dir,'batches.jsonl'),batches);jl(path.join(dir,'decoded.jsonl'),decoded);jl(path.join(dir,'rows.jsonl'),rows);put(path.join(dir,'summary.json'),summary);put(path.join(dir,'execution.json'),receipt.execution);nodeReceipt.context_sha256=hash(path.join(dir,'context.json'));nodeReceipt.outputs=Object.fromEntries(['batches.jsonl','decoded.jsonl','engine.stderr.log'].map(n=>[n,hash(path.join(dir,n))]));put(path.join(dir,'node-receipt.json'),nodeReceipt);receipt.outputs=Object.fromEntries(outnames.map(n=>[n,hash(path.join(dir,n))]));put(path.join(dir,'receipt.json'),receipt);};
  f.seal();return f;
}
const validate=f=>validateFitEvidence(f.P,NAME,f.runtime,f.dir);

test('complete float/ort chains bind all raw decisions and retain export passed=false',()=>{
  for(const runtime of ['float','ort']){const f=fixture(runtime),v=validate(f);assert.equal(v.rows.length,1699);assert.equal(v.batches.length,3);assert.equal(v.receipt.export_diagnostics.float_vs_node_categorical_passed,false);assert.equal(v.summary.passed,true);}
});
test('valid measured numeric parity failure remains failure evidence',()=>{
  const f=fixture('ort',{numericFail:true}),v=validate(f);assert.equal(v.summary.passed,false);assert.equal(v.receipt.execution.exit_code,1);assert.equal(v.nodeReceipt.engine.code,0);assert.equal(v.summary.parity.numerical_failed,1);assert.equal(v.summary.parity.padding_failed,1);
});
test('valid measured quality miss remains readable negative evidence in both runtimes',()=>{
  for(const runtime of ['float','ort']){const f=fixture(runtime,{qualityFail:true}),v=validate(f);assert.equal(v.summary.passed,false);assert.equal(v.receipt.execution.exit_code,0);assert.equal(v.summary.populations.outline_set.correct,0);}
});
test('fixture echo, wrong runtime, zero executions and malformed nested receipts fail even rehashed',()=>{
  for(const [name,alter]of Object.entries({echo:f=>{f.receipt.execution.argv=['echo','perfect-label-fixture'];},cwd:f=>{f.receipt.execution.cwd=f.root;},runtime:f=>{f.context.runtime='float';},engine:f=>{f.nodeReceipt.engine.argv=[PY,'-c','print("fixture")'];},zero:f=>{f.nodeReceipt.engine.batches=0;},node:f=>{f.nodeReceipt.argv=['echo'];},time:f=>{f.nodeReceipt.engine.ended=106;},signal:f=>{f.nodeReceipt.engine.signal='SIGTERM';},exit:f=>{f.receipt.execution.exit_code=0;f.nodeReceipt.engine.code=1;}})){
    const f=fixture();alter(f);f.seal();assert.throws(()=>validate(f),/fit evidence:/,name);
  }
});
test('missing registered model/run/checkpoint/shard and omitted identity cannot pass',()=>{
  for(const kind of ['model','run','checkpoint','shard','source','identity','context-arm','layout','export-diagnostic']){
    const f=fixture();
    if(kind==='model')fs.renameSync(f.model,f.model+'-missing');
    if(kind==='run')fs.renameSync(f.run,f.run+'-missing');
    if(kind==='checkpoint')fs.unlinkSync(path.join(f.run,'checkpoint.pt'));
    if(kind==='shard')fs.unlinkSync(path.join(f.model,'onnx/model_quantized.onnx_data'));
    if(kind==='source'){const source=path.join(HERE,'modernbert_rare_heads_fit.py');delete f.context.identities[source];delete f.receipt.identities_before[source];delete f.receipt.identities_after[source];}
    if(kind==='identity')delete f.context.identities[path.join(f.run,'checkpoint.pt')];
    if(kind==='context-arm')f.context.arm={...f.context.arm,model:f.root};
    if(kind==='layout')f.context.layout.classes.reverse();
    if(kind==='export-diagnostic')f.summary.export_diagnostics={float_vs_node_categorical_passed:true};
    f.seal();assert.throws(()=>validate(f),undefined,kind);
  }
});
test('full unique raw coverage is required independently of perfect gold rows',()=>{
  for(const kind of ['single-zero-batch','zero-tensors-full-coverage','missing','extra','duplicate','request','texts','arrays','truncation','nonfinite','decoded-class','decoded-action','decoded-tag','row-class','row-action','row-tag','row-index','summary']){
    const f=fixture();
    if(kind==='single-zero-batch'){f.batches.splice(1);for(const t of Object.values(f.batches[0].python))t.data.fill(0);for(const t of Object.values(f.batches[0].node))t.data.fill(0);}
    if(kind==='zero-tensors-full-coverage')for(const b of f.batches)for(const engine of ['python','node'])for(const t of Object.values(b[engine]))t.data.fill(0);
    if(kind==='missing')f.batches.pop();if(kind==='extra')f.batches.push(clone(f.batches[0]));if(kind==='duplicate')f.batches[1]=clone(f.batches[0]);
    if(kind==='request')f.batches[0].requests[0]=16;if(kind==='texts')f.batches[0].input.texts[0]='wrong';if(kind==='arrays')f.batches[0].input.arrays.input_ids[0][1]=999;
    if(kind==='truncation')f.decoded[0].python.truncated=true;
    if(kind==='nonfinite')f.batches[0].python.seq_logits.data[0]=null;
    if(kind.startsWith('decoded-')){const r=f.decoded[0].node;if(kind==='decoded-class')r.classes.outline=2;if(kind==='decoded-action')r.act='set';if(kind==='decoded-tag')r.tags[0]='B-name';}
    if(kind.startsWith('row-')){const r=f.rows[0].node;if(kind==='row-class')r.classes.outline=0;if(kind==='row-action')r.act='wrong';if(kind==='row-tag')r.tags[0]='B-name';if(kind==='row-index')f.rows[1].observation=f.rows[0].observation;}
    if(kind==='summary')f.summary.populations.absent_controls.correct=0;
    f.seal();assert.throws(()=>validate(f),undefined,kind);
  }
});
test('required output inventories and hashes reject missing or changed artifacts',()=>{
  for(const kind of ['inventory','hash','node-inventory']){const f=fixture();if(kind==='inventory'){f.seal();delete f.receipt.outputs['context.json'];put(path.join(f.dir,'receipt.json'),f.receipt);}else if(kind==='hash'){fs.appendFileSync(path.join(f.dir,'batches.jsonl'),'{}\n');}else{f.seal();delete f.nodeReceipt.outputs['batches.jsonl'];put(path.join(f.dir,'node-receipt.json'),f.nodeReceipt);f.receipt.outputs['node-receipt.json']=hash(path.join(f.dir,'node-receipt.json'));put(path.join(f.dir,'receipt.json'),f.receipt);}assert.throws(()=>validate(f),/fit evidence:/,kind);}
});
test('original echo/perfect-label exploit is rejected without modifying preserved evidence',()=>{
  // Self-contained equivalent of the independently preserved /tmp review case.
  const f=fixture('float');f.receipt.execution.argv=['echo','perfect-label-fixture'];f.receipt.outputs=Object.fromEntries(['rows.jsonl','summary.json','batches.jsonl'].map(n=>[n,hash(path.join(f.dir,n))]));
  fs.renameSync(f.model,f.model+'-missing');fs.renameSync(f.run,f.run+'-missing');put(path.join(f.dir,'receipt.json'),f.receipt);
  assert.throws(()=>validate(f),/missing\/extra producer output inventory/);
});
