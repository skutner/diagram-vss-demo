// Five message folds, fold-local priors/percentiles, fixed L2 grid, OOF thresholds.
// node calibrate_modernbert.mjs RECORDS.jsonl CONFIDENCE.json REPORT.json
import { readFileSync, writeFileSync, renameSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { confidence, percentile } from '../../docs/js/neural-confidence.js';
import { goldSpans, actOf } from '../sketch/layer_common.mjs';
import { validateCompleteManifest, EXPORT_MODE } from './finalize_modernbert_export.mjs';
import { EXECUTION_POLICY } from './modernbert_parity.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BASE = 'answerdotai/ModernBERT-base', REVISION = '8949b909ec900327062f0ebf497f51aef5e6f0c8';
const HASH = /^[a-f0-9]{64}$/;
const EVALUATION_FILES = {
  'training/sketch/llm_bench/fresh2/opus_a/batch_01.jsonl': '646bd2656ea1c147ee5445146d0eacaf6a612f7922ad9c6f95f236e5ffcea88f',
  'training/sketch/llm_bench/fresh2/opus_b/batch_01.jsonl': 'a28e617b8f5c57cf33fc44aa591760c5685de7ded9f43bb725c6c60c3288da00',
  'training/sketch/llm_bench/fresh2/opus_c/batch_01.jsonl': 'a833c63c8e5f51823adb9543bdf5fc737f68955c98bd890720e4f600c8c11834',
  'training/sketch/llm_bench/fresh2/opus_d/batch_01.jsonl': 'd46cd88563d2663e038a8153a3fa2a07deee6d9fc74041240d5f3a9bb8498ef2',
  'training/sketch/llm_bench/short3/batch_01.jsonl': 'e14b271f7d50e416346474345bcdd95397c9784b8206be169c5bfed56ae0d782',
};
export const COLLECTION_SOURCES = ['training/neural/collect_modernbert.mjs', 'training/neural/calibrate_modernbert.mjs',
  'training/neural/finalize_modernbert_export.mjs',
  'training/neural/modernbert_parity.mjs',
  'docs/js/neural.js', 'docs/js/neural-confidence.js', 'docs/js/logic.js', 'docs/js/bench-canon.js',
  'docs/js/vss-composer.js', 'training/sketch/layer_common.mjs', 'training/neural/make_data.py'];
const TRAINING_SOURCES = ['finetune_modernbert.py', 'modernbert_tokenization.py', 'finetune_roles.py', 'make_roles.py', 'make_data.py'];
const EXTRA_DIRS='opus_train_a opus_train_b opus_train_c opus_train_d opus_gen_1 opus_gen_2 synth_rules synth_rules_ops synth_rules_ext ops_formulations opus_ext_1 synth_combo'.split(' ').map(x=>'llm_train/'+x);
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export const digest = data => createHash('sha256').update(data).digest('hex');
export function hashFile(path) {
  const h=createHash('sha256'), fd=openSync(path,'r'), chunk=Buffer.alloc(1024*1024);
  try { let n; while((n=readSync(fd,chunk,0,chunk.length,null)))h.update(chunk.subarray(0,n)); }
  finally { closeSync(fd); }
  return h.digest('hex');
}
export function atomicJSON(path, value) {
  const tmp=path+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');renameSync(tmp,path);
}
export const inputHash = row => digest(JSON.stringify({id:row.id,text:row.text,names:row.names||[],wires:row.wires}));
const idHash = ids => digest([...ids].sort().join('\n')+'\n');
export function evaluationInventory(dirs=null) {
  const expectedDirs=[...new Set(Object.keys(EVALUATION_FILES).map(f=>resolve(ROOT,dirname(f))))].sort();
  if(dirs && !equal(dirs.map(d=>resolve(d)).sort(),expectedDirs))throw new Error('Expected exactly the five fresh2+short3 directories');
  const rows=[],excluded=[];
  for(const [file,hash] of Object.entries(EVALUATION_FILES)) {
    if(hashFile(resolve(ROOT,file))!==hash)throw new Error('Canonical evaluation data changed: '+file);
    for(const line of readFileSync(resolve(ROOT,file),'utf8').split('\n').filter(x=>x.trim())) {
      const row=JSON.parse(line);
      if(!Array.isArray(row.wires))throw new Error('Evaluation row has no gold wires');
      // Existing arm-ALL protocol, TRAIN_PLAN_1103.md:154: exclude whole messages
      // containing an operation whose gold is still explicitly pending.
      if(row.wires.some(w=>w.pending))excluded.push({id:row.id,input_sha256:inputHash(row),reason:'pending gold wire'});
      else rows.push(row);
    }
  }
  if(rows.length!==1113 || excluded.length!==17 || new Set(rows.map(r=>r.id)).size!==1113 || rows.reduce((s,r)=>s+r.wires.length,0)!==2553)throw new Error('Canonical evaluation inventory count mismatch');
  const summary={files:EVALUATION_FILES,messages:rows.map(r=>({id:r.id,input_sha256:inputHash(r)})),
    count:rows.length,requested:2553,ids_sha256:idHash(rows.map(r=>r.id)),excluded};
  return {rows,summary};
}
function sourceHashes(paths) { return Object.fromEntries(paths.map(p=>[p,hashFile(resolve(ROOT,p))])); }
function validateTraining(provenance, manifest) {
  if(!provenance || provenance.base!==BASE || provenance.revision!==REVISION || provenance.tokenization!=='wordwise-bpe-prefix-space-v1')throw new Error('Missing pinned training provenance');
  if(!equal(Object.keys(provenance.sources||{}).sort(),[...TRAINING_SOURCES].sort()))throw new Error('Incomplete training source hashes');
  for(const name of TRAINING_SOURCES)if(!HASH.test(provenance.sources[name]) || hashFile(resolve(ROOT,'training/neural',name))!==provenance.sources[name])throw new Error('Training source changed: '+name);
  const state=provenance.completed;
  if(!state || state.request_pos!==54584 || state.update!==3412 || state.accumulated!==0 || state.pilot_passed!==true)throw new Error('Training epoch is not finalized');
  const ids=manifest?.message_ids;
  if(manifest?.messages!==24698 || manifest.requests!==54584 || !Array.isArray(ids) || ids.length!==24698 || new Set(ids).size!==24698 || ids.some(id=>typeof id!=='string'||!id) || manifest.message_ids_sha256!==idHash(ids))throw new Error('Missing actual ALL training message IDs');
  if(!manifest.files || !HASH.test(manifest.files['train.jsonl']) || !HASH.test(manifest.files['cut_train.jsonl']) || !HASH.test(manifest.files['reader.json']))throw new Error('Missing generated training data hashes');
  if(!equal(manifest.extra_dirs,EXTRA_DIRS))throw new Error('Training directory regime changed');
  return new Set(ids);
}
function trainingInventory(manifest) {
  // Re-read the real ALL annotations independently of a supplied ID list.
  const script="import sys,json,os;sys.path.insert(0,sys.argv[1]);os.environ['EXTRA_DIRS']=' '.join(json.loads(sys.argv[2]));import make_data as M;ms,_,_,_=M.split_messages(None,0,True);a,q=M.acts_from_neural_js();acts=set(a+q+['fact','rule']);ws=[w for m in ms for w in m.get('wires',[]) if w.get('span') and w['span'] in m['text'] and M.act_of(w.get('type'),w.get('args',{})) in acts];print(json.dumps({'messages':len(ms),'requests':len(ws),'ids':sorted(m['id'] for m in ms),'triggers':sorted({str(w['trigger']).lower() for w in ws if w.get('trigger')})}))";
  const info=JSON.parse(execFileSync(process.env.PYTHON||'python3',['-c',script,resolve(ROOT,'training/neural'),JSON.stringify(manifest.extra_dirs)],{encoding:'utf8',maxBuffer:8*1024*1024}));
  if(info.messages!==24698||info.requests!==54584||idHash(info.ids)!==manifest.message_ids_sha256)throw new Error('Training annotation inventory differs from finalized actual ALL IDs');
  return info;
}
export function validateArtifactFiles(folder,required,files) {
  if(!required.length || !equal(Object.keys(files||{}).sort(),[...required].sort()))throw new Error('Incomplete artifact inventory or external shards');
  const artifacts={};
  for(const name of [...required].sort()) {
    const path=folder+'/'+name,info=files[name],bytes=statSync(path).size;
    if(!HASH.test(info?.sha256||'') || info.bytes!==bytes || bytes<=0 || bytes>=100*1024**2 || (name.includes('.onnx_data') && bytes>90*1024**2) || hashFile(path)!==info.sha256)throw new Error('Artifact hash/size mismatch: '+name);
    artifacts[name]=info.sha256;
  }
  return artifacts;
}
export function assertDisjointIDs(evaluationIDs,trainingIDs) {
  if(evaluationIDs.some(id=>trainingIDs.has(id)))throw new Error('Evaluation/training message ID overlap');
}
export function validateModel(folder) {
  folder=resolve(folder);
  const cfg=JSON.parse(readFileSync(folder+'/config.json','utf8'));
  if(cfg.model_type!=='modernbert' || cfg.reader?.tokenization!=='wordwise-bpe-prefix-space-v1')throw new Error('Expected a finalized ModernBERT task model');
  const trainingIDs=validateTraining(cfg.reader.training_provenance,cfg.reader.training_manifest);
  const count=cfg['transformers.js_config']?.use_external_data_format;
  if(!Number.isInteger(count) || count<1 || count>100)throw new Error('Invalid external-data chunk count');
  const required=['config.json','tokenizer.json','tokenizer_config.json','special_tokens_map.json','onnx/model_quantized.onnx'];
  for(let i=0;i<count;i++)required.push('onnx/model_quantized.onnx_data'+(i?'_'+i:''));
  const receiptPath=folder+'/export_manifest.json',validated=validateCompleteManifest(folder);
  const artifacts=validateArtifactFiles(folder,required,validated.bindings.files);
  artifacts['export_manifest.json']=hashFile(receiptPath);
  for(const info of [validated.manifest.candidate,...Object.values(validated.manifest.receipts),validated.candidate.reference])artifacts[info.file]=hashFile(folder+'/'+info.file);
  return {config:cfg,trainingIDs,trainingInfo:trainingInventory(cfg.reader.training_manifest),summary:{folder,artifacts,export_mode:EXPORT_MODE,export_schema:validated.manifest.schema,training_ids_sha256:cfg.reader.training_manifest.message_ids_sha256}};
}
export function collectionRuntime(T) {
  const runtime={transformers_js:T.env.version,onnxruntime:T.env.backends.onnx.versions?.node,node:process.version,backend:'cpu',export_mode:EXPORT_MODE,execution_policy:EXECUTION_POLICY};
  if(runtime.transformers_js!=='3.8.1'||runtime.onnxruntime!=='1.21.0')throw new Error('Wrong actual collection runtime');
  return runtime;
}
function validateCollectionRuntime(runtime) {
  if(runtime?.transformers_js!=='3.8.1'||runtime.onnxruntime!=='1.21.0'||runtime.backend!=='cpu'||runtime.export_mode!==EXPORT_MODE||!equal(runtime.execution_policy,EXECUTION_POLICY)||typeof runtime.node!=='string'||!runtime.node.startsWith('v'))throw new Error('Missing actual collection runtime provenance');
}
export function startCollection(folder, dirs) {
  const inventory=evaluationInventory(dirs),model=validateModel(folder);
  assertDisjointIDs(inventory.rows.map(r=>r.id),model.trainingIDs);
  return {rows:inventory.rows,config:model.config,trainingInfo:model.trainingInfo,manifest:{schema:'modernbert-collection-v1',complete:false,set:'fresh2+short3',
    evaluation:inventory.summary,model:model.summary,sources:sourceHashes(COLLECTION_SOURCES),runtime:null,records:null}};
}
export function validateCollection(records, manifest, recordsPath) {
  if(!manifest || manifest.schema!=='modernbert-collection-v1' || manifest.complete!==true || manifest.set!=='fresh2+short3')throw new Error('A finalized fresh2+short3 collection manifest is required');
  if(records.length!==1113 || !recordsPath || !manifest.records || manifest.records.count!==1113 || !HASH.test(manifest.records.sha256||'') || hashFile(recordsPath)!==manifest.records.sha256 || digest(records.map(r=>JSON.stringify(r)+'\n').join(''))!==manifest.records.sha256)throw new Error('Partial or modified collection records');
  validateCollectionRuntime(manifest.runtime);
  const current=startCollection(manifest.model?.folder,null);
  if(!equal(manifest.evaluation,current.manifest.evaluation) || !equal(manifest.model,current.manifest.model) || !equal(manifest.sources,current.manifest.sources))throw new Error('Collection data/model/source provenance changed');
  const wanted=new Map(current.rows.map(r=>[r.id,r])),seen=new Set();
  if(records.length!==wanted.size)throw new Error('Incomplete evaluation message set');
  for(const r of records) {
    const row=wanted.get(r.id);
    if(!row || seen.has(r.id))throw new Error('Unexpected or duplicate evaluation ID');seen.add(r.id);
    if(r.set!=='fresh2+short3' || r.cut!=='own' || r.input_sha256!==inputHash(row) || r.text!==row.text || r.gold!==row.wires.length || !equal(r.goldActs,row.wires.map(w=>actOf(w.type,w.args))) || !equal(r.artifacts,manifest.model.artifacts))throw new Error('Evaluation content/artifact mismatch: '+r.id);
    const gold=goldSpans(row),paired=new Set(),wireIDs=new Set();
    if(!Array.isArray(r.goldSpans)||r.goldSpans.length!==gold.length||!Array.isArray(r.modernbert))throw new Error('Malformed collected gold/outputs');
    for(let i=0;i<gold.length;i++)for(const key of ['s','e','act','want','args','span'])if(!equal(r.goldSpans[i][key],gold[i][key]))throw new Error('Collected gold changed: '+r.id);
    for(const x of r.modernbert) {
      if(typeof x.wireId!=='string'||wireIDs.has(x.wireId)||!Number.isInteger(x.g)||x.g< -1||x.g>=gold.length||!['right','wrong','extra'].includes(x.o)||typeof x.act!=='string'||!x.act||!Array.isArray(x.dependencies))throw new Error('Malformed collected prediction');
      wireIDs.add(x.wireId);
      if(x.g>=0){if(paired.has(x.g))throw new Error('Duplicate paired gold');paired.add(x.g);}
      const outcome=x.g<0?'extra':Object.entries(gold[x.g].want).every(([k,v])=>(x.got?.[k]??'∅')===v)?'right':'wrong';
      if(x.o!==outcome || !equal(x.want,x.g<0?null:gold[x.g].want))throw new Error('Collected outcome changed');
      for(const [name] of NAMES)if(name!=='act_prior'&&(!Object.hasOwn(x.f||{},name)||(x.f[name]!=null&&!Number.isFinite(x.f[name]))))throw new Error('Missing/non-finite model confidence feature');
    }
  }
  return current;
}

export const NAMES = [['act_p',1],['act_margin',1],['act_negent',1],['act_prior',1],['val_p_min',1],['val_margin_min',1],['none_p_min',1],['fill_p_min',1],['fill_margin_min',1],['ctx_fill',-1],['tag_p_min',1],['tag_margin_min',1],['tag_all_min',1],['tag_stray',-1],['desc_p_min',1],['desc_margin_min',1],['cut_start',1],['cut_end',1],['cut_inner_min',1],['unk_share',-1],['split_share',-1],['n_words',1],['n_roles',1],['n_units',1]];
export const ASK_ALL = 1.0000001;
export const isCalibration = id => BigInt('0x' + createHash('sha256').update(id).digest('hex')) % 3n === 0n;
export function auroc(items) {
  const pos = items.filter(x => x.o === 'right'), neg = items.filter(x => x.o !== 'right');
  if (!pos.length || !neg.length) return null;
  let s = 0;
  for (const p of pos) for (const n of neg) s += p.c > n.c ? 1 : p.c === n.c ? .5 : 0;
  return s / (pos.length * neg.length);
}
function table(vals, sign) {
  const v = vals.filter(x => x != null).map(x => x * sign).sort((a,b) => a-b), values = [], below = [];
  v.forEach((x,i) => { if (!i || x !== v[i-1]) { values.push(x); below.push(i); } });
  return { sign, binary: v.every(x => x === 0 || Math.abs(x) === 1), n: v.length, values, below };
}
function logistic(X, y, lam) {
  const d = X[0].length + 1, w = Array(d).fill(0);
  for (let iteration = 0; iteration < 200; iteration++) {
    const H = Array.from({length:d}, () => Array(d).fill(0)), g = Array(d).fill(0);
    X.forEach((row,i) => {
      const x = [1,...row], z = x.reduce((s,v,j) => s+v*w[j],0), p = 1/(1+Math.exp(-z)), s = Math.max(p*(1-p),1e-6);
      for (let j=0;j<d;j++) { g[j]+=(p-y[i])*x[j]; for(let k=0;k<d;k++) H[j][k]+=s*x[j]*x[k]; }
    });
    for(let j=1;j<d;j++) { g[j]+=lam*w[j]; H[j][j]+=lam; }
    for(let i=0;i<d;i++) {
      let p=i; for(let r=i+1;r<d;r++) if(Math.abs(H[r][i])>Math.abs(H[p][i])) p=r;
      [H[i],H[p]]=[H[p],H[i]]; [g[i],g[p]]=[g[p],g[i]];
      if (!Number.isFinite(H[i][i]) || Math.abs(H[i][i])<1e-15) throw new Error('Singular calibration Hessian');
      for(let r=i+1;r<d;r++) { const q=H[r][i]/H[i][i]; for(let c=i;c<d;c++) H[r][c]-=q*H[i][c]; g[r]-=q*g[i]; }
    }
    const step=Array(d).fill(0);
    for(let i=d-1;i>=0;i--) { let s=g[i]; for(let j=i+1;j<d;j++) s-=H[i][j]*step[j]; step[i]=s/H[i][i]; w[i]-=step[i]; }
    if(w.some(x=>!Number.isFinite(x))) throw new Error('Non-finite calibration fit');
    if(Math.max(...step.map(Math.abs))<1e-7) break;
  }
  return w;
}
export function fitModel(rows, lam) {
  if (!rows.length || !rows.some(x=>x.o==='right') || rows.every(x=>x.o==='right')) throw new Error('Calibration training fold needs both outcomes');
  const overall=rows.filter(x=>x.o==='right').length/rows.length, counts={};
  for(const x of rows) { const c=counts[x.act] ||= [0,0]; c[0]+=x.o==='right'; c[1]++; }
  const act_prior=Object.fromEntries(Object.entries(counts).map(([k,[r,n]])=>[k,(r+overall*5)/(n+5)]));
  const raw=(x,n)=>n==='act_prior'?(act_prior[x.act]??overall):x.f[n];
  const tables=Object.fromEntries(NAMES.map(([n,s])=>[n,table(rows.map(x=>raw(x,n)),s)]));
  const vec=x=>NAMES.map(([n])=>percentile(tables[n],raw(x,n)));
  const w=logistic(rows.map(vec),rows.map(x=>x.o==='right'?1:0),lam);
  return {reader:'modernbert',intercept:w[0],features:NAMES.map(([name],i)=>({name,weight:w[i+1]})),tables,act_prior,act_prior_default:overall};
}
export function costThreshold(items, G, cost) {
  let best={threshold:ASK_ALL,score:0,executed:0};
  const sorted=items.slice().sort((a,b)=>b.c-a.c);
  for(let i=0;i<sorted.length;) {
    let j=i; while(j<sorted.length && sorted[j].c===sorted[i].c) j++;
    const st=stats(items,G,sorted[i].c,cost),score=st.cost_score??0;
    if(score>best.score+1e-12)best={threshold:sorted[i].c,score,executed:st.executed}; i=j;
  }
  return best;
}
export function decisions(items, threshold) {
  const keys=new Map(items.map(x=>[x.id+'\0'+x.wireId,x])),out=new Map(),active=new Set();
  const run=x=>{
    if(out.has(x))return out.get(x);
    if(active.has(x))return false;
    active.add(x);
    const yes=Number.isFinite(x.c)&&x.c>=threshold&&!x.truncated&&(x.dependencies||[]).every(id=>{
      const dep=keys.get(x.id+'\0'+id);return dep&&run(dep);
    });
    active.delete(x);out.set(x,yes);return yes;
  };
  return items.map(x=>({...x,execute:run(x)}));
}
export function stats(items, G, threshold, cost=10) {
  let right=0,wrong=0,extras=0,asked=0;
  for(const x of decisions(items,threshold)) {
    if(x.execute) { if(x.o==='right')right++;else if(x.o==='wrong')wrong++;else extras++; }
    else if(x.o!=='extra')asked++;
  }
  const matched=items.filter(x=>x.o!=='extra').length, executed=right+wrong+extras;
  return {requested:G,right,wrong,asked,unread:G-matched,extras,executed,
    execution_precision:executed?right/executed:null,wrong_execution_share:executed?(wrong+extras)/executed:null,
    right_share:G?right/G:null,cost_score:G?(right-cost*(wrong+extras))/G*100:null};
}
// Pure numerical recipe for unit checks. It cannot produce an experimental
// report or success declaration; calibrate() additionally requires provenance.
export function fitCalibrationRecipe(records) {
  const ids=new Set(), artifactSet=new Set(records.map(x=>JSON.stringify(x.artifacts)));
  if(artifactSet.size!==1)throw new Error('Mixed artifact candidates');
  for(const r of records) {if(ids.has(r.id))throw new Error('Duplicate id');ids.add(r.id);if(r.cut!=='own')throw new Error('Expected own cuts');}
  const cal=records.filter(r=>isCalibration(r.id)), test=records.filter(r=>!isCalibration(r.id));
  if(!cal.length || !test.length)throw new Error('Both calibration and test messages are required');
  const items=rs=>rs.flatMap((r,mi)=>r.modernbert.map(x=>({...x,id:r.id,mi})));
  const train=items(cal).filter(x=>!x.truncated), tst=items(test), G=cal.reduce((s,r)=>s+r.gold,0), GT=test.reduce((s,r)=>s+r.gold,0);
  const both=xs=>xs.some(x=>x.o==='right')&&xs.some(x=>x.o!=='right');
  const fitAvailable=both(train)&&[0,1,2,3,4].every(fold=>both(train.filter(x=>x.mi%5!==fold)));
  let best=null;
  for(const lam of fitAvailable?[.01,.1,1,10]:[]) {
    const oof=Array(train.length);
    for(let fold=0;fold<5;fold++) {
      const fit=fitModel(train.filter(x=>x.mi%5!==fold),lam);
      train.forEach((x,i)=>{if(x.mi%5===fold)oof[i]={...x,c:confidence(fit,x.f,x.act)};});
    }
    const auc=auroc(oof);if(auc==null)throw new Error('OOF AUROC needs both outcomes');
    if(!best || auc>best.auc+1e-9)best={lam,auc,oof};
  }
  const spec=best?fitModel(train,best.lam):{reader:'modernbert',intercept:-40,
    features:NAMES.map(([name])=>({name,weight:0})),tables:Object.fromEntries(NAMES.map(([n,s])=>[n,table([],s)])),act_prior:{},act_prior_default:0};
  if(!best)best={lam:null,auc:null,oof:[]};
  spec.operating_level='cost';spec.levels_out_of_fold={};
  for(const cost of [1,2,5,10,20])spec.levels_out_of_fold[cost===10?'cost':'cost'+cost]=costThreshold(best.oof,G,cost);
  spec.fit_status=fitAvailable?'fitted':'asks everything: calibration folds lack both outcomes';
  return {spec,cal,test,train,tst,G,GT,best};
}
export function calibrate(records,manifest,recordsPath) {
  validateCollection(records,manifest,recordsPath);
  const {spec,cal,test,train,tst,G,GT,best}=fitCalibrationRecipe(records);
  const scored=tst.map(x=>({...x,c:confidence(spec,x.f,x.act)})), threshold=spec.levels_out_of_fold.cost.threshold;
  const headline=stats(scored,GT,threshold), actions={},trigger_breakdown={};
  const decided=decisions(scored,threshold);
  for(const a of new Set(test.flatMap(r=>r.goldActs).concat(scored.map(x=>x.pa)))) {
    const g=test.reduce((s,r)=>s+r.goldActs.filter(x=>x===a).length,0);
    // Dependencies are evaluated across actions before computing each action's counts.
    actions[a]=stats(decided.filter(x=>x.pa===a).map(x=>({...x,c:x.execute?1:0,dependencies:[]})),g,.5);
  }
  for(const group of ['seen','unseen','unannotated','unpaired extras']) {
    const g=test.reduce((s,r)=>s+(r.goldSpans||[]).filter(x=>x.triggerGroup===group).length,0);
    trigger_breakdown[group]=stats(decided.filter(x=>x.triggerGroup===group).map(x=>({...x,c:x.execute?1:0,dependencies:[]})),g,.5);
  }
  const causes={},examples={};
  for(const x of scored.filter(x=>x.o!=='right')) {
    const cause=x.truncated?'tokenizer':(x.cause||'heads');
    causes[cause]=(causes[cause]||0)+1;(examples[cause]||=[]);if(examples[cause].length<5)examples[cause].push({id:x.id,src:x.src,got:x.got,want:x.want,outcome:x.o});
  }
  for(const r of test)for(let i=0;i<r.gold;i++)if(!r.modernbert.some(x=>x.g===i)) {
    const g=r.goldSpans[i],sameCut=r.modernbert.some(x=>x.span?.[0]===g.s&&x.span?.[1]===g.e);
    const cause=r.cutInfo?.truncated&&g.s>=r.cutInfo.unreadFrom?'tokenizer':sameCut?'heads':'cutter';
    causes[cause]=(causes[cause]||0)+1;(examples[cause]||=[]);if(examples[cause].length<5)examples[cause].push({id:r.id,gold:r.goldSpans[i].span,outcome:'unread'});
  }
  const report={recipe:'fresh2+short3 SHA256(id)%3; 5 message folds; fold-local priors and percentiles',artifacts:records[0].artifacts,
    collection:{schema:manifest.schema,records_sha256:manifest.records.sha256,evaluation:manifest.evaluation,model:manifest.model,sources:manifest.sources,runtime:manifest.runtime},
    calibration:{messages:cal.length,requested:G,produced:train.length,l2:best.lam,oof_auroc:best.auc},
    test:{messages:test.length,...headline,auroc:auroc(scored)},actions,causes,examples,
    risk_coverage:[ASK_ALL,...new Set(scored.map(x=>x.c))].sort((a,b)=>b-a).map(t=>({threshold:t,...stats(scored,GT,t)})),
    experimental_success:headline.cost_score>0&&headline.right_share>=.2&&headline.wrong_execution_share!=null&&headline.wrong_execution_share<=.05,
    trigger_breakdown};
  spec.calibration=report.calibration;spec.artifacts=report.artifacts;
  return {spec,report};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [input,out,report]=process.argv.slice(2);if(!input||!out||!report)throw new Error('usage: calibrate_modernbert.mjs RECORDS CONFIDENCE REPORT');
  const rows=readFileSync(input,'utf8').split('\n').filter(x=>x.trim()).map(JSON.parse);
  const manifest=JSON.parse(readFileSync(input+'.manifest.json','utf8'));
  const result=calibrate(rows,manifest,input);writeFileSync(out,JSON.stringify(result.spec,null,2)+'\n');writeFileSync(report,JSON.stringify(result.report,null,2)+'\n');
  console.log(JSON.stringify(result.report.test));
}
