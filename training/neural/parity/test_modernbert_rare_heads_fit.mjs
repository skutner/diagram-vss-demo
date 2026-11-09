// Contracts on tiny synthetic tensors only; no learned-model accuracy evidence.
import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compareRaw,validateRaw,compareCategorical,categorical} from './modernbert_rare_heads_fit.mjs';
const layout={acts:['create','set'],tags:['O','B-name'],classes:[['outline',['none','red','none']],['text:label',['absent','empty','written']]]};
const arrays={input_ids:[[1,2],[1,0]],attention_mask:[[1,1],[1,0]]};
function raw(){return {token_logits:{dims:[2,2,2],data:Array(8).fill(0)},seq_logits:{dims:[2,8],data:Array(16).fill(0)},cut_logits:{dims:[2,2,3],data:Array(12).fill(0)}};}
const clone=x=>structuredClone(x);

test('production module initializes SOPKit in a fresh process without model execution',()=>{
  const moduleURL=new URL('./modernbert_rare_heads_fit.mjs',import.meta.url).href,repo=fileURLToPath(new URL('../../../',import.meta.url));
  const code='const {loadProductionReader}=await import(process.argv[1]);const N=loadProductionReader(process.argv[2]);if(typeof N.makeReader!=="function"||typeof globalThis.SOPKit.createSystem!=="function")throw Error("reader initialization failed");console.log(JSON.stringify(N.wordsOf("Café 東京").map(x=>x.w)));';
  const result=spawnSync(process.execPath,['--input-type=module','-e',code,moduleURL,repo.replace(/\/$/,'')],{encoding:'utf8',timeout:5000});
  assert.equal(result.status,0,result.stderr);assert.equal(result.signal,null);assert.deepEqual(JSON.parse(result.stdout),['Café','東京']);
});

test('strict tolerance checks padded values and preserves numeric failure independently',()=>{
  const a=raw(),b=clone(a);b.token_logits.data[7]=0.002;
  const q=compareRaw(a,b,arrays,layout);
  assert.equal(q.passed,false);assert.equal(q.checks.token_logits.padding_failed,1);assert.equal(q.checks.token_logits.failed,1);
  assert.equal(q.checks.seq_logits.padding_values,0);assert.equal(q.checks.cut_logits.padding_values,3);
  b.token_logits.data[7]=.001;assert.equal(compareRaw(a,b,arrays,layout).passed,true);
});
test('each output shape, name and finite value is required',()=>{
  for(const kind of ['shape','missing','extra','nonfinite','short','input','mask']){
    const a=raw(),x=clone(arrays);
    if(kind==='shape')a.seq_logits.dims=[1,16];
    if(kind==='missing')delete a.cut_logits;
    if(kind==='extra')a.unexpected={dims:[],data:[]};
    if(kind==='nonfinite')a.cut_logits.data[11]=Infinity;
    if(kind==='short')a.token_logits.data.pop();
    if(kind==='input')x.input_ids[1].pop();
    if(kind==='mask')x.attention_mask[1][1]=2;
    assert.throws(()=>validateRaw(a,x,layout),undefined,kind);
  }
});
test('literal none retains populated index and text absence index remains zero',()=>{
  const r={logits:{seq:[0,1,0,0,9,8,0,0]},tags:['O'],words:['Café'],truncated:false,unreadFrom:null};
  const c=categorical(r,layout);assert.equal(c.act,'set');assert.equal(c.classes.outline,2);assert.equal(c.classes['text:label'],0);
});
test('categorical decode is checked independently of numeric tolerance',()=>{
  const r={act:'create',classes:{outline:1,'text:label':0},tags:['O'],words:['東京'],truncated:false,unreadFrom:null};
  const s=clone(r);s.classes.outline=2;s.act='set';s.tags=['B-name'];
  const c=compareCategorical([r],[s]);assert.equal(c.passed,false);assert.equal(c.class_compared,2);assert.equal(c.class_different,1);assert.equal(c.action_different,1);assert.equal(c.tag_different,1);
  assert.equal(compareCategorical([r],[clone(r)]).passed,true);
});
test('zero, truncation, wrong tag counts and changed head order fail categorical checks',()=>{
  assert.throws(()=>compareCategorical([],[]));
  const r={act:'create',classes:{outline:1,'text:label':0},tags:['O'],words:['x'],truncated:false,unreadFrom:null};
  for(const kind of ['truncate','tags','order']){
    const s=clone(r);if(kind==='truncate')s.truncated=true;if(kind==='tags')s.tags=[];if(kind==='order')s.classes={'text:label':0,outline:1};
    assert.throws(()=>compareCategorical([r],[s]),undefined,kind);
  }
});
