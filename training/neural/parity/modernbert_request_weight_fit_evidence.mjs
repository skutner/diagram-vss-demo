// Read-only consumption of the complete learned-fit producer chain. No inference.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {hash, validateRaw, compareRaw, categorical, compareCategorical} from './modernbert_request_weight_fit.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url)),REPO=path.resolve(HERE,'../../..');
const PY=path.join(homedir(),'.cache/diagram-vss-modernbert/venv/bin/python');
const REQUIRE=createRequire(path.join(REPO,'training/laptop/package.json'));
const LAYOUT_KEYS=['acts','tags','classes','act_keys','ref_keys','desc_keys','desc2_keys','output_contract','text_state_keys'];
const REQUIRED_OUTPUTS=['attempt.json','attempt-result.json','context.json','stdout.log','stderr.log','execution.json','node-receipt.json','batches.jsonl','decoded.jsonl','engine.stderr.log','rows.jsonl','summary.json'];
const BARS={outline_create:[89,85],outline_coloured_create:[74,71],outline_set:[97,93],desc_r2:[35,34],desc_r2_canonical:[21,20],desc_old:[24,null],count_size:[14,14],absent_controls:[1440,1440]};
const stable=o=>JSON.stringify(o,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const same=(a,b)=>stable(a)===stable(b);
const must=(ok,message)=>{if(!ok)throw Error('fit evidence: '+message);};
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const lines=p=>{const text=fs.readFileSync(p,'utf8');must(text.endsWith('\n')&&text.trim().length>0,'truncated/empty JSONL: '+p);return text.trimEnd().split('\n').map(s=>JSON.parse(s));};
const positive=n=>Number.isInteger(n)&&n>0;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const timing=r=>finite(r?.started)&&finite(r?.ended)&&r.started>0&&r.ended>=r.started;
const keys=(a,expected)=>same(Object.keys(a??{}).sort(),[...expected].sort());

function filesIn(dir) {
  must(fs.statSync(dir).isDirectory(),'missing registered directory: '+dir);
  const result=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,entry.name);
    must(!entry.isSymbolicLink(),'symlink subject: '+p);
    if(entry.isDirectory())result.push(...filesIn(p));else {must(entry.isFile(),'unsupported subject: '+p);result.push(p);}
  }
  must(result.length>0,'empty registered directory: '+dir);
  return result.sort();
}

function finalizedExport(model,complete,layout,expect) {
  const receipt=json(path.join(model,'arm_receipt.json')),config=json(path.join(model,'config.json'));
  must(receipt.schema==='arm-export-receipt-v1'&&typeof receipt.passed==='boolean','missing finalized export');
  for(const key of LAYOUT_KEYS)must(same(config.reader?.[key],layout[key]),'export layout differs: '+key);
  const policy={graph_optimization:'basic',arithmetic:'float32',weight_storage:'uint8'};
  must(receipt.export_mode==='weight-only-u8-fp32'&&config.reader.export_mode===receipt.export_mode&&same(receipt.execution_policy,policy)&&same(config.reader.execution_policy,policy),'export mode/runtime policy');
  const checks=receipt.python_ort_vs_node;
  must(checks&&['ids','outputs','decoded','cuts','readMany'].every(k=>checks[k]===true)&&['fixtures','singles','batches'].every(k=>positive(checks[k]))&&checks.fixtures===checks.singles+checks.batches,'missing export runtime checks');
  must(Array.isArray(checks.max_abs)&&checks.max_abs.length===3&&checks.max_abs.every(v=>finite(v)&&v>=0)&&same(receipt.tolerance,{atol:.001,rtol:.001}),'invalid export runtime numbers');
  must(receipt.runtime?.backend==='cpu'&&['transformers_js','onnxruntime','node','python','python_onnxruntime'].every(k=>typeof receipt.runtime[k]==='string'&&receipt.runtime[k]),'missing export runtime identity');
  must(receipt.source_changes_since_training?.length===0&&Array.isArray(receipt.source_changes_since_training)&&same(receipt.weights?.source_changes_since_training,[]),'export source changes');
  const difference=receipt.torch_vs_node;
  must(positive(difference?.texts)&&Array.isArray(difference.differences)&&receipt.passed===!difference.differences.length&&Array.isArray(receipt.cases_where_q8_decodes_differently_from_float),'malformed float/q8 diagnostic');
  const required=['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','conversion.json','export_parity.json','references.json','onnx/model_quantized.onnx'];
  must(receipt.files&&required.every(k=>receipt.files[k]),'missing finalized model inventory');
  must(Array.isArray(receipt.shards)&&receipt.shards.length>0&&new Set(receipt.shards).size===receipt.shards.length,'missing finalized shards');
  for(const shard of receipt.shards)must(typeof shard==='string'&&path.basename(shard)===shard&&receipt.files['onnx/'+shard],'missing shard inventory');
  must(config['transformers.js_config']?.use_external_data_format===receipt.shards.length,'shard count differs');
  for(const [relative,entry]of Object.entries(receipt.files)) {
    const p=path.resolve(model,relative);
    must(path.relative(model,p)&&!path.relative(model,p).startsWith('..')&&Number.isInteger(entry.bytes)&&entry.bytes>=0&&fs.statSync(p).size===entry.bytes,'invalid/missing model sidecar');
    expect(p,entry.sha256);
  }
  for(const p of filesIn(path.join(model,'onnx')).filter(p=>/onnx_data/.test(path.basename(p))))must(receipt.shards.includes(path.basename(p)),'unregistered model shard');
  const provenance=config.reader.training_provenance;
  for(const key of ['base','revision','settings','tokenization','sources'])must(same(provenance?.[key],complete.metadata[key]),'export provenance differs: '+key);
  must(same(config.reader.training_manifest?.files,complete.metadata.data?.files),'export data binding differs');
  return {receipt,config};
}

function preparation(config,model) {
  // AutoTokenizer.from_pretrained constructs this same class from these JSONs.
  // Constructing locally is synchronous and never creates a model/session.
  const T=REQUIRE('@huggingface/transformers'),tc=json(path.join(model,'tokenizer_config.json'));
  const name=tc.tokenizer_class?.replace(/Fast$/,'')??'PreTrainedTokenizer';
  const Tokenizer=T.AutoTokenizer.TOKENIZER_CLASS_MAPPING[name]??T.PreTrainedTokenizer;
  const tokenizer=new Tokenizer(json(path.join(model,'tokenizer.json')),tc);
  const previous=globalThis.SOPKit;let N;
  try{globalThis.SOPKit=REQUIRE(path.join(REPO,'docs/js/logic.js'));N=REQUIRE(path.join(REPO,'docs/js/neural.js'));}
  finally{if(previous===undefined)delete globalThis.SOPKit;else globalThis.SOPKit=previous;}
  const noInference=()=>{throw Error('fit evidence validator must never execute a model');};noInference.config=config;
  const reader=N.makeReader(T,tokenizer,noInference);
  must(config.reader.tokenization==='wordwise-bpe-prefix-space-v1','wrong preparation policy');
  return {T,reader,tokenizer};
}

function decodeRaw(raw,prepared,layout) {
  const n=raw.token_logits.dims[1],width=raw.seq_logits.dims[1],nt=layout.tags.length;
  const best=xs=>xs.reduce((a,x,i)=>x>xs[a]?i:a,0);
  return prepared.map((p,b)=>{
    const tags=p.ws.map((_,i)=>{
      const token=p.first.get(i);must(Number.isInteger(token),'unread word in fit tensors');
      const logits=raw.token_logits.data.slice((b*n+token)*nt,(b*n+token+1)*nt).map(Math.fround);
      // The production tag decoder chooses the first maximum after softmax.
      const maximum=Math.max(...logits),exps=logits.map(x=>Math.exp(x-maximum)),sum=exps.reduce((a,x)=>a+x,0);
      return layout.tags[best(exps.map(x=>x/sum))];
    });
    return categorical({logits:{seq:raw.seq_logits.data.slice(b*width,(b+1)*width).map(Math.fround)},tags,words:p.ws.map(w=>w.w),truncated:p.truncated,unreadFrom:p.unreadFrom},layout);
  });
}

function validateExecution(receipt,node,context,P,name,runtime,dir,expectedBatches,expectedRequests,complete,T) {
  const cp=path.join(dir,'context.json'),script=path.join(HERE,'modernbert_request_weight_fit.mjs');
  const execution=receipt.execution,expected=['node',script,'--context',cp,'--out',dir];
  const attempt=json(path.join(dir,'attempt.json')),result=json(path.join(dir,'attempt-result.json')),guard=context.guard;
  must(same(receipt.attempt,attempt)&&same(receipt.attempt_result,result),'fit attempt reservation/result differs');
  must(attempt.schema==='request-weight-fit-attempt-v1'&&attempt.name===name&&attempt.runtime===runtime&&attempt.protocol===P.file&&attempt.out===dir&&attempt.cwd===REPO,'foreign fit attempt');
  must(finite(attempt.started)&&attempt.started>0&&attempt.timeout_seconds===1800&&attempt.deadline===attempt.started+1800,'missing finite fit reservation');
  const publicArgs=attempt.public_argv?.slice(attempt.public_argv?.[1]==='-B'?2:1);
  must(attempt.public_argv?.[0]===PY&&publicArgs?.length===10&&path.resolve(REPO,publicArgs[0])===path.join(HERE,'modernbert_request_weight.py')&&publicArgs[1]==='fit','wrong public fit invocation');
  const options=Object.fromEntries(Array.from({length:4},(_,i)=>[publicArgs[2+i*2],publicArgs[3+i*2]]));
  must(same(options,{'--protocol':P.file,'--name':name,'--runtime':runtime,'--out':dir}),'wrong public fit arguments');
  must(guard?.scope==='actual-model-training-fit'&&guard.started===attempt.started&&guard.deadline===attempt.deadline&&positive(guard.owner_pid)&&same(guard.public_argv,attempt.public_argv),'missing inherited fit guard binding');
  const cleanup=execution?.cleanup;
  must(positive(cleanup?.process_group)&&cleanup.process_group!==guard.owner_pid&&cleanup.group_gone===true&&typeof cleanup.escalated==='boolean'&&Array.isArray(cleanup.reaped_descendants)&&cleanup.reaped_descendants.every(positive)&&new Set(cleanup.reaped_descendants).size===cleanup.reaped_descendants.length,'missing/failed owned fit group cleanup');
  must(result.schema==='request-weight-fit-attempt-result-v1'&&result.complete===true&&result.error===null&&result.started===attempt.started&&finite(result.ended)&&result.ended<=attempt.deadline&&result.ended>=execution?.ended&&attempt.started<=execution?.started,'incomplete or over-budget fit attempt');
  must(same(execution,json(path.join(dir,'execution.json'))),'execution sidecar differs');
  must(same(execution?.argv,expected)&&execution.cwd===REPO&&execution.signal===null&&execution.failure===null&&execution.timeout_seconds===1800&&timing(execution)&&execution.ended-execution.started<=1800,'fixture/wrong/incomplete actual invocation');
  must(node.version==='modernbert-request-weight-fit-node-v1'&&node.name===name&&node.runtime===runtime&&node.context_sha256===hash(cp),'Node receipt subject/context differs');
  must(same(node.argv,[process.execPath,...expected.slice(1)])&&node.node===process.version&&node.versions?.transformers===T.env.version,'Node invocation/runtime identity differs');
  if(runtime==='ort')must(node.versions.onnxruntime_node===REQUIRE('onnxruntime-node/package.json').version,'wrong Node q8 runtime');
  must(node.batches===expectedBatches&&node.requests===expectedRequests&&positive(node.batches)&&positive(node.requests),'zero/missing Node model executions');
  const e=node.engine;
  must(context.python===PY&&same(e?.argv,[PY,'-B',path.join(HERE,'modernbert_request_weight_fit.py'),'--engine',cp]),'fixture/wrong engine invocation');
  must(e.finished===true&&e.code===0&&e.signal===null&&!e.error&&e.batches===expectedBatches,'zero/failed engine model executions');
  must(timing(node)&&timing(e)&&execution.started<=node.started&&node.ended<=execution.ended&&execution.started<=e.started&&e.ended<=node.ended,'invalid nested execution times');
  must(e.versions?.python===complete.metadata.python&&e.versions?.numpy===P.versions.numpy&&e.versions?.torch===P.versions.torch,'wrong Python inference runtime');
  if(runtime==='ort')must(e.versions.onnxruntime===P.versions.onnxruntime,'wrong Python ORT runtime');
}

/** Return genuine completed evidence, including measured quality/parity misses.
 * Malformed, incomplete, foreign or fixture-relabeled chains throw instead.
 */
export function validateFitEvidence(P,name,runtime,dirIn) {
  must(['J-s0'].includes(name)&&['float','ort'].includes(runtime),'unregistered fit subject/runtime');
  const dir=path.resolve(dirIn),a=P.arms?.[name];
  must(a&&dir===path.resolve(P.task_root,name,'fit-'+runtime),'foreign fit directory/registration');
  const receipt=json(path.join(dir,'receipt.json'));
  must(receipt.version==='modernbert-request-weight-fit-v1'&&receipt.scope==='actual-model-training-fit'&&receipt.name===name&&receipt.runtime===runtime,'fixture or foreign fit cannot establish learned accuracy');
  must(P.file&&P.sha256&&receipt.protocol?.path===P.file&&receipt.protocol.sha256===P.sha256&&hash(P.file)===P.sha256,'changed fit protocol');
  const frozen=json(P.file);
  must(frozen.version==='modernbert-request-weight-frozen-v1'&&same(frozen.arms,P.arms)&&same(frozen.inputs,P.inputs)&&same(frozen.sources,P.sources)&&same(frozen.versions,P.versions)&&frozen.task_root===P.task_root&&same(frozen.selections,P.selections)&&same(frozen.joint_populations,P.joint_populations)&&same(frozen.joint_selections,P.joint_selections)&&same(frozen.loss_manifest,P.loss_manifest),'registration differs from frozen protocol');
  must(keys(receipt.outputs,REQUIRED_OUTPUTS),'missing/extra producer output inventory');
  const hashes=new Map();
  // Frozen HF snapshots legitimately contain symlinks to their immutable blobs.
  // Their content hashes remain mandatory; producer outputs may never be links.
  const actual=p=>{p=path.resolve(p);if(!hashes.has(p)){must(fs.statSync(p).isFile(),'missing evidence: '+p);hashes.set(p,hash(p));}return hashes.get(p);};
  for(const [file,sha]of Object.entries(receipt.outputs)){const p=path.join(dir,file);must(!fs.lstatSync(p).isSymbolicLink()&&actual(p)===sha,'changed/symlink output: '+file);}
  const context=json(path.join(dir,'context.json')),nodeReceipt=json(path.join(dir,'node-receipt.json')),summary=json(path.join(dir,'summary.json'));
  must(context.version==='modernbert-request-weight-fit-context-v1'&&context.name===name&&context.runtime===runtime&&same(context.arm,a)&&context.protocol===P.file&&context.task_root===P.task_root&&context.repo===REPO,'wrong model/run/context subject');
  must(same(receipt.identities_before,receipt.identities_after)&&same(context.identities,receipt.identities_before),'producer input identities differ');
  const expectedIdentities={...P.inputs,...P.sources,[P.file]:P.sha256};
  const expect=(p,sha)=>{p=path.resolve(p);must(typeof sha==='string'&&/^[a-f0-9]{64}$/.test(sha)&&actual(p)===sha,'missing/changed model/input/source: '+p);must(!expectedIdentities[p]||expectedIdentities[p]===sha,'contradictory identity: '+p);expectedIdentities[p]=sha;};
  for(const [p,sha]of Object.entries(expectedIdentities))expect(p,sha);
  const run=path.resolve(a.training),model=path.resolve(a.model),data=path.resolve(a.train_data);
  const complete=json(path.join(run,'complete.json')),layout=json(path.join(data,'reader.json'));
  must(complete.complete===true&&complete.full_schedule===true&&complete.max_updates===0&&complete.state?.epoch===8&&complete.state.update===14640&&complete.state.total===14640,'registered run is not complete');
  const meta=complete.metadata,settings={...meta?.settings};delete settings.request_class_loss;
  const recipe={seed:a.seed,epochs:8,lr:6e-5,head_lr:6e-5,batch:32,cut_batch:8,weight_decay:.01,warmup:.06,clip:1,request_cap:128,message_cap:512,attn:'sdpa',autocast:'bfloat16',weights:'float32',gradient_checkpointing:false,max_updates:0};
  must(meta?.base==='answerdotai/ModernBERT-base'&&meta.revision==='8949b909ec900327062f0ebf497f51aef5e6f0c8'&&same(settings,recipe),'wrong registered model/seed/recipe');
  must(a.arm==='J'&&a.seed===0&&a.objective==='request-max-positive-sqrt-v1'&&meta.settings.request_class_loss?.formula===a.objective&&meta.settings.request_class_loss.sha256===P.loss_manifest.sha256&&same(meta.settings.request_class_loss.manifest,json(P.loss_manifest.path)),'wrong objective manifest');
  must(meta.sources&&Object.keys(meta.sources).length>0&&meta.data?.files&&Object.keys(meta.data.files).length>0,'missing training source/data provenance');
  for(const [name,sha]of Object.entries(meta.sources)){const p=path.resolve(HERE,'..',name);must(!path.relative(path.resolve(HERE,'..'),p).startsWith('..'),'source path escape');expect(p,sha);}
  for(const [name,sha]of Object.entries(meta.data.files)){must(path.basename(name)===name,'data path escape');expect(path.join(data,name),sha);}
  const exported=finalizedExport(model,complete,layout,expect),weights=exported.receipt.weights;
  must(weights.source_file==='checkpoint.pt'&&weights.epoch===8&&weights.update===14640&&weights.total===14640&&weights.full_schedule===true&&weights.max_updates===0,'export does not bind final completed checkpoint');
  expect(path.join(run,'checkpoint.pt'),weights.sha256);
  must(context.checkpoint===path.join(run,'checkpoint.pt')&&same(context.layout,layout),'context checkpoint/layout differs');
  for(const folder of [model,path.join(run,'tokenizer'),path.join(run,'encoder_config')])for(const p of filesIn(folder))expect(p,actual(p));
  for(const p of [path.join(run,'complete.json'),path.join(HERE,'modernbert_request_weight_fit.py'),path.join(HERE,'modernbert_request_weight_fit.mjs'),path.join(REPO,'training/laptop/package-lock.json')])expect(p,actual(p));
  const selections=json(P.selections.path),populations=json(P.selections.populations.path);
  expect(P.selections.path,P.selections.sha256);expect(P.selections.populations.path,P.selections.populations.sha256);
  must(same(context.selections,selections)&&same(context.populations,populations),'context selections/populations differ');
  for(const key of ['joint_populations','joint_selections','loss_manifest'])expect(P[key].path,P[key].sha256);
  const jointPopulations=json(P.joint_populations.path),jointSelections=json(P.joint_selections.path);
  must(same(context.joint_populations,jointPopulations)&&same(context.joint_selections,jointSelections),'context joint membership differs');
  must(same(context.identities,expectedIdentities),'omitted/foreign producer model/input/source inventory');
  const diagnostics={receipt_sha256:actual(path.join(model,'arm_receipt.json')),float_vs_node_categorical_passed:exported.receipt.passed,float_vs_node:exported.receipt.torch_vs_node,cases_where_q8_decodes_differently_from_float:exported.receipt.cases_where_q8_decodes_differently_from_float};
  must(same(context.export_diagnostics,diagnostics)&&same(receipt.export_diagnostics,diagnostics)&&same(summary.export_diagnostics,diagnostics),'float/q8 export diagnostic was changed/hidden');
  const expectedRequests=selections.requests.map((r,index)=>({...r,index})).filter(r=>r.arm==='F'),expectedSelections=selections.selections.map((s,observation)=>({...s,observation})).filter(s=>s.arm==='F');
  must(expectedRequests.length>0&&expectedSelections.length===1699&&expectedSelections.filter(s=>!s.absent_control).length===259&&expectedSelections.filter(s=>s.absent_control).length===1440,'wrong frozen fit population');
  const batches=lines(path.join(dir,'batches.jsonl')),decoded=lines(path.join(dir,'decoded.jsonl')),rows=lines(path.join(dir,'rows.jsonl'));
  must(batches.length===Math.ceil(expectedRequests.length/8)&&same(decoded.map(r=>r.request),expectedRequests.map(r=>r.index))&&same(rows.map(r=>r.observation),expectedSelections.map(r=>r.observation)),'missing/extra/duplicate/reordered raw batches or requests/observations');
  const {T,reader,tokenizer}=preparation(exported.config,model);
  validateExecution(receipt,nodeReceipt,context,P,name,runtime,dir,batches.length,expectedRequests.length,complete,T);
  must(keys(nodeReceipt.outputs,['batches.jsonl','decoded.jsonl','engine.stderr.log']),'incomplete Node output inventory');
  for(const [file,sha]of Object.entries(nodeReceipt.outputs))must(actual(path.join(dir,file))===sha,'changed Node output');
  const parity={scope:'actual-python-ort-versus-production-node-q8',atol:.001,rtol:.001,includes_padding:true,batches:0,values:0,numerical_failed:0,padding_values:0,padding_failed:0,action_compared:0,action_different:0,class_compared:0,class_different:0,tag_compared:0,tag_different:0,word_different:0};
  const reads=new Map();
  batches.forEach((batch,i)=>{
    const requests=expectedRequests.slice(i*8,(i+1)*8),texts=requests.map(r=>r.text);
    must(batch.batch===i&&batch.input?.batch===i&&batch.input.cap===128&&requests.every(r=>r.cap===128)&&same(batch.requests,requests.map(r=>r.index))&&same(batch.input.texts,texts),'wrong raw batch order/coverage/text/cap');
    const prepared=texts.map(t=>reader.prepare(t,128));must(prepared.every(p=>p.truncated===false&&p.unreadFrom===null),'truncated frozen fit text');
    const n=Math.max(...prepared.map(p=>p.ids.length)),arrays={input_ids:prepared.map(p=>[...p.ids,...Array(n-p.ids.length).fill(tokenizer.pad_token_id)]),attention_mask:prepared.map(p=>[...Array(p.ids.length).fill(1),...Array(n-p.ids.length).fill(0)])};
    must(same(batch.input.arrays,arrays),'raw model inputs differ from production preparation');
    validateRaw(batch.python,arrays,layout);const python=decodeRaw(batch.python,prepared,layout);
    let node;
    if(runtime==='ort'){
      const numeric=compareRaw(batch.python,batch.node,arrays,layout);must(same(batch.parity,numeric),'per-batch numerical checks differ');
      node=decodeRaw(batch.node,prepared,layout);const category=compareCategorical(python,node);parity.batches++;
      for(const check of Object.values(numeric.checks)){parity.values+=check.values;parity.numerical_failed+=check.failed;parity.padding_values+=check.padding_values;parity.padding_failed+=check.padding_failed;}
      for(const key of ['action_compared','action_different','class_compared','class_different','tag_compared','tag_different','word_different'])parity[key]+=category[key];
    }else must(batch.node===null&&batch.parity===null,'float tensors relabeled q8 parity');
    requests.forEach((r,j)=>{const record={request:r.index,words:python[j].words,python:python[j],...(node?{node:node[j]}:{})};must(same(decoded[i*8+j],record),'decoded action/class/tag differs from raw tensors');reads.set(r.index,record);});
  });
  parity.passed=parity.batches===batches.length&&parity.values>0&&parity.numerical_failed===0&&parity.action_different===0&&parity.class_different===0&&parity.tag_different===0&&parity.word_different===0;
  const expectedParity=runtime==='ort'?parity:{scope:'float-checkpoint-fit',passed:null};
  if(runtime==='ort')must(parity.padding_values>0,'zero padded numerical checks');
  must(same(nodeReceipt.parity,expectedParity)&&same(receipt.parity,expectedParity)&&same(summary.parity,expectedParity),'aggregate numerical/categorical parity differs');
  must(receipt.execution.exit_code===(runtime==='ort'&&!parity.passed?1:0),'wrong actual process exit/parity result');
  const selected=runtime==='ort'?'node':'python',byObservation=new Map(),groups=new Map(),heads=Object.fromEntries(layout.classes.map(([key])=>[key,{observations:0,correct:0,positive:0,positive_correct:0,absent:0,absent_correct:0}]));
  rows.forEach((row,i)=>{
    const s=expectedSelections[i],r=reads.get(s.request),head=layout.classes.findIndex(([key])=>key===s.head);
    must(r&&head>=0,'unmapped fit observation/request/head');
    for(const [key,value]of Object.entries(s))must(same(row[key],value),'changed frozen observation: '+key);
    must(row.text===selections.requests[s.request].text,'changed selected text');
    for(const engine of runtime==='ort'?['python','node']:['python']){
      const raw=r[engine],target=s.targets[head],pred={...raw,head_index:raw.classes[s.head],target_index:target,correct:raw.classes[s.head]===target,action_right:raw.act===s.act,tags_exact:same(raw.tags,s.tags)};
      pred.classes_exact=layout.classes.every(([key],h)=>raw.classes[key]===s.targets[h]);
      pred.joint_correct=pred.classes_exact&&pred.action_right&&pred.tags_exact;
      must(same(row[engine],pred),'gold row is detached from actual raw model decisions');
    }
    const pred=row[selected];byObservation.set(s.observation,pred.correct);
    layout.classes.forEach(([key],h)=>{const stat=heads[key],target=s.targets[h],p=pred.classes[key];stat.observations++;stat.correct+=Number(p===target);stat.positive+=Number(target>0);stat.positive_correct+=Number(target>0&&p===target);stat.absent+=Number(target===0);stat.absent_correct+=Number(target===0&&p===0);});
    const key=JSON.stringify([s.family,s.absent_control,s.representation]);if(!groups.has(key))groups.set(key,{family:s.family,absent_control:s.absent_control,representation:s.representation,runtime,rows:0,correct:0,action_right:0,tags_exact:0});
    const stat=groups.get(key);stat.rows++;for(const k of ['correct','action_right','tags_exact'])stat[k]+=Number(pred[k]);
  });
  const populationCounts={};
  for(const [key,[count,minimum]]of Object.entries(BARS)){
    const selected=populations[key];must(Array.isArray(selected)&&selected.length===count&&new Set(selected).size===count&&selected.every(i=>byObservation.has(i)),'invalid frozen population: '+key);
    const correct=selected.filter(i=>byObservation.get(i)).length;populationCounts[key]={rows:count,correct,minimum,passed:minimum===null?null:correct>=minimum};
  }
  const counts={observations:1699,positives:259,absents:1440,requests:expectedRequests.length};
  must(same(receipt.counts,counts)&&summary.runtime===runtime&&Object.entries(counts).every(([k,v])=>summary[k]===v)&&same(summary.populations,populationCounts)&&same(summary.metrics,[...groups.values()])&&same(summary.all_heads,heads),'fit counts/accuracy summaries differ from raw observations');
  const joint=reconstructJoint(layout,selections,populations,jointPopulations,jointSelections,rows,selected);
  must(same(summary.joint,joint),'joint fit summaries differ from raw observations');
  const passed=Object.values(populationCounts).every(p=>p.passed!==false)&&Object.values(joint).every(p=>p.passed)&&receipt.execution.exit_code===0&&(runtime==='float'||parity.passed);
  must(summary.passed===passed&&receipt.passed===passed&&receipt.attempt_result.passed===passed,'fit quality failure was changed/hidden');
  return {receipt,summary,rows,batches,context,nodeReceipt};
}

export function reconstructJoint(layout,selections,populations,jointPopulations,jointSelections,rows,engine) {
  const names=layout.classes.map(([k])=>k),ci=names.indexOf('color'),oi=names.indexOf('outline'),indexes=populations.outline_create;
  must(names.length===52&&new Set(names).size===52&&ci>=0&&oi>=0,'joint fit needs all52 heads');
  must(Array.isArray(indexes)&&indexes.length===89&&new Set(indexes).size===89&&same(indexes,[...indexes].sort((a,b)=>a-b)),'invalid joint outline membership');
  const expected={fill_outline:[],outline_without_fill:[]},records=[];
  for(const observation of indexes){
    must(Number.isInteger(observation)&&observation>=0&&observation<selections.selections.length,'unknown joint observation');
    const s=selections.selections[observation];
    must(s.arm==='F'&&s.family==='outline_create'&&s.head==='outline'&&s.absent_control===false,'foreign joint observation');
    must(s.targets.length===52&&s.targets.every((v,i)=>Number.isInteger(v)&&v>=0&&v<layout.classes[i][1].length)&&s.targets[oi]>0,'invalid joint target vector');
    const text=selections.requests[s.request].text,key=s.targets[ci]>0?'fill_outline':'outline_without_fill';
    if(key==='fill_outline')must(layout.classes[ci][1][s.targets[ci]]!==layout.classes[oi][1][s.targets[oi]],'frozen distinct colors changed');
    expected[key].push(observation);
    records.push({observation,request:s.request,ordinal:s.ordinal,id:s.id,text,text_sha256:REQUIRE('node:crypto').createHash('sha256').update(text).digest('hex'),targets:s.targets,act:s.act,tags:s.tags});
  }
  must(same(expected,jointPopulations)&&same(records,jointSelections),'joint membership/artifact was substituted');
  const byObservation=new Map(rows.map(row=>[row.observation,row])),joint={};
  for(const [key,count,unique]of [['fill_outline',57,57],['outline_without_fill',32,28]]){
    const selected=records.filter(r=>expected[key].includes(r.observation));
    must(selected.length===count&&new Set(selected.map(r=>r.request)).size===unique&&new Set(selected.map(r=>r.ordinal)).size===unique,'wrong joint population request/ordinal counts');
    if(key==='fill_outline')must(new Set(selected.map(r=>r.text)).size===57,'joint specified-fill texts not distinct');
    const tally={rows:count,minimum:count,correct:0,classes_exact:0,action_right:0,tags_exact:0,passed:false};
    for(const s of selected){const p=byObservation.get(s.observation)?.[engine];must(p,'missing joint prediction');const classes=names.every((k,i)=>p.classes[k]===s.targets[i]),act=p.act===s.act,tags=same(p.tags,s.tags);tally.classes_exact+=Number(classes);tally.action_right+=Number(act);tally.tags_exact+=Number(tags);tally.correct+=Number(classes&&act&&tags);}
    tally.passed=tally.correct===count;joint[key]=tally;
  }
  return joint;
}
