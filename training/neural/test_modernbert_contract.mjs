import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdtempSync,rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir,tmpdir } from 'node:os';
import { ASK_ALL, NAMES, calibrate, fitCalibrationRecipe, evaluationInventory, validateCollection, validateArtifactFiles,assertDisjointIDs,digest, costThreshold, fitModel, isCalibration, auroc, stats } from './calibrate_modernbert.mjs';
const require = createRequire(new URL('../laptop/package.json', import.meta.url));
const T = require('@huggingface/transformers');
globalThis.SOPKit = require('../../docs/js/logic.js');
const N = require('../../docs/js/neural.js');
const fixture = JSON.parse(readFileSync(new URL('./fixtures/modernbert_alignment.json', import.meta.url), 'utf8'));
T.env.allowRemoteModels = false; T.env.allowLocalModels = true; T.env.useBrowserCache = false;
const tokenizer = await T.AutoTokenizer.from_pretrained(homedir() + '/.cache/diagram-vss-modernbert/tokenizer', { local_files_only: true });
const model = async () => { throw new Error('Tokenizer contract must not run a model'); };
model.config = { model_type:'modernbert', reader: { acts:['create'], tags:['O'], classes:[], max_length:128, cut:{max_length:512}, tokenization:fixture.policy } };
const r = N.makeReader(T, tokenizer, model);
for (const row of fixture.cases) {
  const p = r.prepare(row.text,row.limit), want = row.prepared;
  assert.deepEqual(p.ids,want.ids);assert.deepEqual([...p.first],want.first);assert.deepEqual(p.pieces,want.pieces);
  assert.deepEqual(p.ws,want.ws);assert.equal(p.truncated,want.truncated);assert.equal(p.unreadFrom,want.unreadFrom);
}
const p=fixture.batch.texts.map(text=>r.prepare(text,fixture.batch.limit)), len=Math.max(...p.map(x=>x.ids.length));
assert.deepEqual(p.map(x=>x.ids.concat(Array(len-x.ids.length).fill(tokenizer.pad_token_id))),fixture.batch.arrays.input_ids);
assert.deepEqual(p.map(x=>Array(x.ids.length).fill(1).concat(Array(len-x.ids.length).fill(0))),fixture.batch.arrays.attention_mask);
assert.equal(ASK_ALL>1,true);assert.equal(Number.isFinite(ASK_ALL),true);
assert.equal(costThreshold([{c:.9,o:'wrong'}],1,10).threshold,ASK_ALL);
assert.equal(costThreshold([{c:.9,o:'right'},{c:.8,o:'wrong'},{c:.7,o:'right'}],3,1).threshold,.9,'ties keep higher threshold');
assert.equal(auroc([{c:.8,o:'right'},{c:.2,o:'wrong'}]),1);
assert.equal(auroc([{c:.8,o:'right'}]),null);
assert.throws(()=>fitModel([{act:'create',o:'right',f:{}}],.1),/both outcomes/);
assert.equal(typeof isCalibration('fixed-id'),'boolean');
assert.deepEqual(stats([{o:'right',c:.9,truncated:true}],1,.5).right,0);
assert.equal(stats([{id:'m',wireId:'n1',o:'right',c:.2},{id:'m',wireId:'n2',o:'right',c:.9,dependencies:['n1']}],2,.5).right,0);
const records=Array.from({length:200},(_,i)=>({id:'unit-'+i,cut:'own',gold:1,goldActs:['command:create'],artifacts:{fixture:'random-unit-data'},
  modernbert:[{wireId:'n1',g:0,act:'create',pa:'command:create',o:i%2?'right':'wrong',f:Object.fromEntries(NAMES.filter(([n])=>n!=='act_prior').map(([n])=>[n,i%2?.9:.1])),cause:'heads'}]}));
assert.throws(()=>calibrate(records),/finalized.*manifest/,'Synthetic rows cannot declare experimental success');
assert.throws(()=>validateCollection(records,{schema:'modernbert-collection-v1',complete:false,set:'fresh2+short3'}),/finalized.*manifest/);
assert.throws(()=>validateCollection(records,{schema:'modernbert-collection-v1',complete:true,set:'wrong'}),/finalized.*manifest/);
assert.throws(()=>validateCollection(records,{schema:'modernbert-collection-v1',complete:true,set:'fresh2+short3'}),/Partial or modified/);
const scratch=mkdtempSync(tmpdir()+'/modernbert-manifest-');
try{
  const files={'model_quantized.onnx':{sha256:digest('graph fixture'),bytes:13},'model_quantized.onnx_data':{sha256:digest('tensor fixture'),bytes:14}};
  writeFileSync(scratch+'/model_quantized.onnx','graph fixture');writeFileSync(scratch+'/model_quantized.onnx_data','tensor fixture');
  const required=Object.keys(files);
  assert.equal(Object.keys(validateArtifactFiles(scratch,required,files)).length,2);
  assert.throws(()=>validateArtifactFiles(scratch,required,{}),/Incomplete artifact/);
  assert.throws(()=>validateArtifactFiles(scratch,required,{'model_quantized.onnx':files['model_quantized.onnx']}),/external shards/);
  writeFileSync(scratch+'/model_quantized.onnx_data','changed tensor');
  assert.throws(()=>validateArtifactFiles(scratch,required,files),/Artifact hash\/size mismatch/);
  writeFileSync(scratch+'/model_quantized.onnx','');
  assert.throws(()=>validateArtifactFiles(scratch,required,files),/Artifact hash\/size mismatch/);
  const prefix=records.slice(0,80),text=prefix.map(r=>JSON.stringify(r)+'\n').join('');writeFileSync(scratch+'/partial.jsonl',text);
  assert.throws(()=>validateCollection(prefix,{schema:'modernbert-collection-v1',complete:true,set:'fresh2+short3',records:{count:1113,sha256:digest(text)}},scratch+'/partial.jsonl'),/Partial or modified/);
}finally{rmSync(scratch,{recursive:true,force:true});}
assert.doesNotThrow(()=>assertDisjointIDs(['test'],new Set(['train'])));
assert.throws(()=>assertDisjointIDs(['same'],new Set(['same'])),/ID overlap/);
const inventory=evaluationInventory();assert.equal(inventory.rows.length,1113);assert.equal(inventory.summary.requested,2553);assert.equal(inventory.summary.excluded.length,17);
assert.throws(()=>evaluationInventory(['/tmp/arbitrary']),/exactly the five/);
const one=fitCalibrationRecipe(records),two=fitCalibrationRecipe(records.map(r=>isCalibration(r.id)?r:{...r,modernbert:r.modernbert.map(x=>({...x,o:x.o==='right'?'wrong':'right',f:Object.fromEntries(Object.keys(x.f).map(k=>[k,999]))}))}));
assert.deepEqual(one.spec,two.spec,'Test outcomes/features must not alter fitted confidence or OOF thresholds');
assert.equal(one.spec.features.length,24);assert.equal(one.cal.length+one.test.length,200);assert.equal(Object.hasOwn(one,'report'),false);
assert.ok(Object.values(one.spec.levels_out_of_fold).every(x=>Number.isFinite(x.threshold)));
const zero=fitCalibrationRecipe(records.map(r=>({...r,modernbert:[]})));
assert.ok(Object.values(zero.spec.levels_out_of_fold).every(x=>x.threshold===ASK_ALL));
assert.equal(stats([],100,ASK_ALL).right,0);assert.equal(stats([],100,ASK_ALL).unread,100);

const longText='word '.repeat(600),longPrepared=r.prepare(longText,512),count=longPrepared.first.size;
const cutCases=[
  {tags:['B',...Array(count-1).fill('I')],spans:[],unread:0},
  {tags:['B','I',...Array(count-3).fill('O'),'B'],spans:[[0,9]],unread:longPrepared.ws[count-1].start},
  {tags:['B','I',...Array(count-3).fill('O'),'I'],spans:[[0,9]],unread:longPrepared.ws[count-1].start},
  {tags:['B','I',...Array(count-2).fill('O')],spans:[[0,9]],unread:longPrepared.unreadFrom},
  {tags:['B','I','O','B',...Array(count-4).fill('I')],spans:[[0,9]],unread:15},
];
for(const row of cutCases){
  const cutModel=async input=>{
    const n=input.input_ids.dims[1],data=new Float32Array(n*3);
    row.tags.forEach((tag,i)=>{data[longPrepared.first.get(i)*3+'OBI'.indexOf(tag)]=10;});
    return {cut_logits:new T.Tensor('float32',data,[1,n,3])};
  };
  cutModel.config=model.config;
  const reader=N.makeReader(T,tokenizer,cutModel);
  assert.deepEqual((await reader.cut(longText)).map(x=>[x.c0,x.c1]),row.spans);
  assert.deepEqual(reader.cutInfo(longText),{truncated:true,unreadFrom:row.unread});
}
console.log(`PASS ${fixture.cases.length} Python/JavaScript tokenizer fixtures, padded masks, finite ask-all, cost ties, AUROC, fold failure, truncated hold`);
