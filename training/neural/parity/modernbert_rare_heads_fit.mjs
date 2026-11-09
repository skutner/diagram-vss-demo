// Actual production preparation/decoding and CPU q8 execution for the frozen campaign.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

export function hash(p) {
  const h=crypto.createHash('sha256'), fd=fs.openSync(p,'r'), buf=Buffer.alloc(4*1024*1024);
  try { for (;;) { const n=fs.readSync(fd,buf,0,buf.length,null); if (!n) break; h.update(buf.subarray(0,n)); } }
  finally { fs.closeSync(fd); }
  return h.digest('hex');
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=message=>{throw Error(message);};

export function validateRaw(raw, arrays, layout) {
  if (!same(Object.keys(raw).sort(),['cut_logits','seq_logits','token_logits'])) fail('wrong output names');
  if (!same(Object.keys(arrays).sort(),['attention_mask','input_ids'])) fail('wrong input names');
  const B=arrays.input_ids.length, n=arrays.input_ids[0]?.length;
  if (!B || B>8 || !Number.isInteger(n) || n<2 || n>128) fail('wrong batch size/cap');
  for (const [k,rows] of Object.entries(arrays)) {
    if (rows.length!==B || rows.some(r=>r.length!==n)) fail('ragged input');
    if (rows.flat().some(v=>!Number.isInteger(v)||v<0||(k==='attention_mask'&&v>1))) fail('invalid input values');
  }
  const dims={token_logits:[B,n,layout.tags.length],seq_logits:[B,layout.acts.length+layout.classes.reduce((s,[,v])=>s+v.length,0)],cut_logits:[B,n,3]};
  for (const [k,want] of Object.entries(dims)) {
    if (!same(raw[k].dims,want)||raw[k].data.length!==want.reduce((a,b)=>a*b,1)) fail('tensor shape mismatch: '+k);
    if (raw[k].data.some(v=>typeof v!=='number'||!Number.isFinite(v))) fail('nonfinite output: '+k);
  }
}

export function compareRaw(reference, actual, arrays, layout) {
  validateRaw(reference,arrays,layout); validateRaw(actual,arrays,layout);
  const checks={};
  for (const k of Object.keys(reference)) {
    let max_abs=0,failed=0,padding_values=0,padding_failed=0;
    for (let i=0;i<reference[k].data.length;i++) {
      const ref=reference[k].data[i],delta=Math.abs(actual[k].data[i]-ref),wrong=delta>1e-3+1e-3*Math.abs(ref);
      max_abs=Math.max(max_abs,delta); failed+=Number(wrong);
      if (k!=='seq_logits') {
        const width=reference[k].dims[2],n=reference[k].dims[1],token=Math.floor(i/width),pad=arrays.attention_mask[Math.floor(token/n)][token%n]===0;
        padding_values+=Number(pad); padding_failed+=Number(pad&&wrong);
      }
    }
    checks[k]={values:reference[k].data.length,max_abs,failed,padding_values,padding_failed,passed:failed===0};
  }
  return {atol:1e-3,rtol:1e-3,includes_padding:true,checks,passed:Object.values(checks).every(x=>x.passed)};
}

export function categorical(read, layout) {
  const seq=read.logits.seq, best=xs=>xs.reduce((a,x,i)=>x>xs[a]?i:a,0);
  const classes={};let offset=layout.acts.length;
  for (const [key,values] of layout.classes) { classes[key]=best(seq.slice(offset,offset+values.length));offset+=values.length; }
  return {act:layout.acts[best(seq.slice(0,layout.acts.length))],classes,tags:read.tags,words:read.words,truncated:read.truncated,unreadFrom:read.unreadFrom};
}

export function compareCategorical(a,b) {
  if (a.length!==b.length||!a.length) fail('wrong categorical count');
  const counts={requests:a.length,action_compared:0,action_different:0,class_compared:0,class_different:0,tag_compared:0,tag_different:0,word_different:0};
  a.forEach((r,i)=>{
    const s=b[i];counts.action_compared++;counts.action_different+=Number(r.act!==s.act);
    if (!same(Object.keys(r.classes),Object.keys(s.classes))) fail('categorical head order mismatch');
    for (const key of Object.keys(r.classes)) {counts.class_compared++;counts.class_different+=Number(r.classes[key]!==s.classes[key]);}
    if(r.tags.length!==s.tags.length) fail('categorical tag count mismatch');
    r.tags.forEach((tag,j)=>{counts.tag_compared++;counts.tag_different+=Number(tag!==s.tags[j]);});
    counts.word_different+=Number(!same(r.words,s.words));
    if(r.truncated!==false||s.truncated!==false||r.unreadFrom!==null||s.unreadFrom!==null) fail('truncated fit output');
  });
  return {...counts,passed:!counts.action_different&&!counts.class_different&&!counts.tag_different&&!counts.word_different};
}

function resources() {
  const available=Number(/^MemAvailable:\s+(\d+)/m.exec(fs.readFileSync('/proc/meminfo','utf8'))[1])*1024;
  if(process.resourceUsage().maxRSS*1024>12*1024**3||available<4*1024**3) fail('preregistered memory stop');
}

export function loadProductionReader(repo) {
  const require=createRequire(repo+'/training/laptop/package.json');
  globalThis.SOPKit=require(repo+'/docs/js/logic.js');
  return require(repo+'/docs/js/neural.js');
}

export async function execute(contextPath,out) {
  const c=JSON.parse(fs.readFileSync(contextPath)), contextSha=hash(contextPath);
  if(c.version!=='modernbert-rare-heads-fit-context-v1'||!['float','ort'].includes(c.runtime)||!['W-s0','F-s1','W-s1'].includes(c.name)) fail('wrong fit context');
  function check() { if(hash(contextPath)!==contextSha) fail('context changed');for(const[p,w]of Object.entries(c.identities)) if(hash(p)!==w) fail('source/input/model changed: '+p); }
  check();resources();
  const require=createRequire(c.repo+'/training/laptop/package.json'),T=require('@huggingface/transformers');
  T.env.allowRemoteModels=false;T.env.allowLocalModels=true;T.env.useFSCache=false;T.env.useBrowserCache=false;
  T.env.localModelPath=path.dirname(c.arm.model)+'/';
  const tokenizer=await T.AutoTokenizer.from_pretrained(path.basename(c.arm.model),{local_files_only:true});
  const N=loadProductionReader(c.repo),config=JSON.parse(fs.readFileSync(c.arm.model+'/config.json'));
  for(const k of ['acts','tags','classes','act_keys','ref_keys','desc_keys','desc2_keys','output_contract','text_state_keys']) if(!same(config.reader[k],c.layout[k])) fail('layout mismatch: '+k);
  const engineArgv=[c.python,'-B',path.join(path.dirname(fileURLToPath(import.meta.url)),'modernbert_rare_heads_fit.py'),'--engine',contextPath];
  const stderr=fs.openSync(path.join(out,'engine.stderr.log'),'wx');
  const child=spawn(engineArgv[0],engineArgv.slice(1),{env:process.env,stdio:['pipe','pipe',stderr]});
  const lines=readline.createInterface({input:child.stdout})[Symbol.asyncIterator]();
  let exited=false;
  const done=new Promise(resolve=>{child.on('exit',(code,signal)=>{exited=true;resolve({code,signal});});child.on('error',error=>{exited=true;resolve({code:null,error:String(error)});});});
  async function rpc(job) {if(exited) fail('Python engine exited');child.stdin.write(JSON.stringify(job)+'\n');const line=await lines.next();if(line.done) fail('Python engine output ended');return JSON.parse(line.value);}
  let session=null,ort=null,job=null,saved=null,batchIndex=0,requestCount=0;
  const files={batches:fs.openSync(path.join(out,'batches.jsonl'),'wx'),decoded:fs.openSync(path.join(out,'decoded.jsonl'),'wx')};
  const parity={scope:'actual-python-ort-versus-production-node-q8',atol:1e-3,rtol:1e-3,includes_padding:true,batches:0,values:0,numerical_failed:0,padding_values:0,padding_failed:0,action_compared:0,action_different:0,class_compared:0,class_different:0,tag_compared:0,tag_different:0,word_different:0};
  const toTensors=raw=>Object.fromEntries(Object.entries(raw).map(([k,t])=>[k,new T.Tensor('float32',new Float32Array(t.data),t.dims)]));
  const plain=out=>Object.fromEntries(Object.entries(out).map(([k,t])=>[k,{dims:t.dims,data:Array.from(t.data)}]));
  const toArrays=args=>Object.fromEntries(['input_ids','attention_mask'].map(k=>{const t=args[k],n=t.dims[1];return[k,Array.from({length:t.dims[0]},(_,b)=>Array.from(t.data.slice(b*n,(b+1)*n),Number))];}));
  const pythonModel=async args=>{
    const arrays=toArrays(args),input={batch:batchIndex,texts:job.map(x=>x.text),cap:128,arrays};
    const raw=await rpc(input);validateRaw(raw,arrays,c.layout);
    let node=null,numeric=null;
    if(session) {
      const dims=args.input_ids.dims;
      const got=await session.run(Object.fromEntries(Object.entries(arrays).map(([k,v])=>[k,new ort.Tensor('int64',BigInt64Array.from(v.flat(),BigInt),dims)])));
      node=plain(got);numeric=compareRaw(raw,node,arrays,c.layout);
      parity.batches++;
      for(const check of Object.values(numeric.checks)) {parity.values+=check.values;parity.numerical_failed+=check.failed;parity.padding_values+=check.padding_values;parity.padding_failed+=check.padding_failed;}
    }
    saved={batch:batchIndex,requests:job.map(x=>x.index),input,python:raw,node,parity:numeric};
    fs.writeSync(files.batches,JSON.stringify(saved)+'\n');
    return toTensors(raw);
  };pythonModel.config=config;
  const nodeModel=async args=>{if(!same(toArrays(args),saved.input.arrays)) fail('Node decoder input differs');return toTensors(saved.node);};nodeModel.config=config;
  const reader=N.makeReader(T,tokenizer,pythonModel),nodeReader=N.makeReader(T,tokenizer,nodeModel);
  const started=Date.now()/1000;
  let engineReceipt,status;
  const watchdog=setInterval(()=>{try{resources();}catch(error){process.stderr.write(String(error)+'\n');child.kill('SIGTERM');process.exitCode=70;}},1000);
  try {
    if(c.runtime==='ort') {ort=require('onnxruntime-node');session=await ort.InferenceSession.create(c.arm.model+'/onnx/model_quantized.onnx',{executionProviders:['cpu'],graphOptimizationLevel:'basic',intraOpNumThreads:2,interOpNumThreads:2});}
    const requests=c.selections.requests.map((r,index)=>({...r,index})).filter(r=>r.arm==='F');
    if(!requests.length) fail('zero fit requests');
    for(let start=0;start<requests.length;start+=8) {
      resources();job=requests.slice(start,start+8);
      if(job.some(r=>r.cap!==128)) fail('wrong frozen request cap');
      const python=(await reader.readMany(job.map(x=>x.text))).map(r=>categorical(r,c.layout));
      const node=session?(await nodeReader.readMany(job.map(x=>x.text))).map(r=>categorical(r,c.layout)):null;
      if(node) {const checks=compareCategorical(python,node);for(const key of ['action_compared','action_different','class_compared','class_different','tag_compared','tag_different','word_different'])parity[key]+=checks[key];}
      python.forEach((r,i)=>{if(r.truncated!==false||r.unreadFrom!==null)fail('truncated fit output');fs.writeSync(files.decoded,JSON.stringify({request:job[i].index,words:r.words,python:r,...(node?{node:node[i]}:{})})+'\n');});
      requestCount+=job.length;batchIndex++;
    }
    engineReceipt=await rpc({finish:true});if(!engineReceipt.finished||engineReceipt.batches!==batchIndex)fail('invalid engine receipt');
    child.stdin.end();status=await done;
    if(status.code!==0)fail('engine failed: '+JSON.stringify(status));
    if(!(await lines.next()).done)fail('unexpected trailing engine output');
    check();resources();
  } finally {
    clearInterval(watchdog);if(!exited){child.kill('SIGTERM');await done;}fs.closeSync(stderr);
    for(const fd of Object.values(files))fs.closeSync(fd);if(session)await session.release();
  }
  parity.passed=c.runtime==='ort'&&parity.batches===batchIndex&&parity.values>0&&parity.numerical_failed===0&&parity.action_different===0&&parity.class_different===0&&parity.tag_different===0&&parity.word_different===0;
  const receipt={version:'modernbert-rare-heads-fit-node-v1',context_sha256:contextSha,name:c.name,runtime:c.runtime,argv:process.argv,started,ended:Date.now()/1000,engine:{...engineReceipt,argv:engineArgv,...status},node:process.version,versions:{transformers:T.env.version,...(ort?{onnxruntime_node:require('onnxruntime-node/package.json').version}:{})},batches:batchIndex,requests:requestCount,outputs:Object.fromEntries(['batches.jsonl','decoded.jsonl','engine.stderr.log'].map(n=>[n,hash(path.join(out,n))])),parity:c.runtime==='ort'?parity:{scope:'float-checkpoint-fit',passed:null}};
  fs.writeFileSync(path.join(out,'node-receipt.json'),JSON.stringify(receipt)+'\n',{flag:'wx'});
  if(c.runtime==='ort'&&!parity.passed)process.exitCode=1;
  return receipt;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const a=process.argv.slice(2);
  if(a.length!==4||a[0]!=='--context'||a[2]!=='--out') fail('usage: --context FILE --out DIR');
  await execute(path.resolve(a[1]),path.resolve(a[3]));
}
