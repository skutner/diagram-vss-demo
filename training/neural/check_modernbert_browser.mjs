// This module runs in real Chrome; inference and decoding use the production reader.
import * as T from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
import { checkParity, EXECUTION_POLICY } from './modernbert_parity.mjs';

const ORT='1.22.0-dev.20250409-89f8206ba4';
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
const heap=()=>performance.memory ? {used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit} : null;
const sha256=async buffer=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),x=>x.toString(16).padStart(2,'0')).join('');
let model=null,result={passed:false},error=null;
try {
  const reference=await fetch('/references.json').then(r=>{requireValue(r.ok,'Reference fetch failed');return r.json();});
  T.env.allowRemoteModels=false;T.env.allowLocalModels=true;
  T.env.localModelPath=new URL('/models/',location.href).href;
  T.env.useBrowserCache=false;T.env.useFSCache=false;
  T.env.backends.onnx.wasm.numThreads=1;T.env.backends.onnx.wasm.proxy=false;
  requireValue(T.env.version==='3.8.1','Wrong Transformers.js version');
  const before=heap(),start=performance.now();
  const tokenizer=await T.AutoTokenizer.from_pretrained('modernbert',{local_files_only:true});
  requireValue(JSON.stringify(reference.execution_policy)===JSON.stringify(EXECUTION_POLICY),'Wrong reference execution policy');
  model=await T.AutoModel.from_pretrained('modernbert',{device:'wasm',dtype:'q8',local_files_only:true,session_options:{graphOptimizationLevel:EXECUTION_POLICY.graph_optimization}});
  requireValue(JSON.stringify(model.config.reader.execution_policy)===JSON.stringify(EXECUTION_POLICY),'Wrong model execution policy');
  const loaded=heap(),load_ms=performance.now()-start;
  requireValue(T.env.backends.onnx.versions?.web===ORT || T.env.backends.onnx.versions?.wasm===ORT,'Wrong actual browser ONNX runtime: '+JSON.stringify(T.env.backends.onnx.versions));
  const checks=await checkParity(T,tokenizer,model,NeuralKit,reference);
  const reader=NeuralKit.makeReader(T,tokenizer,model);
  const short=reference.cases.find(c=>c.limit===128 && c.texts.length===1);
  const multi=reference.cases.find(c=>c.limit===128 && c.texts.length>1);
  const long=reference.cases.find(c=>c.limit===512 && c.prepared.some(p=>p.ids.length>=500));
  requireValue(short && multi && long,'Missing representative warm timing fixtures');
  const time=async call=>{await call();const t=performance.now();await call();return performance.now()-t;};
  const warm={short_ms:await time(()=>reader.read(short.texts[0])),multi_request_ms:await time(()=>reader.readMany(multi.texts)),message512_ms:await time(()=>reader.cut(long.texts[0]))};
  const urls=[...new Set(performance.getEntriesByType('resource').map(e=>e.name).filter(url=>url.startsWith('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1')))];
  const assets=[];
  for(const url of urls) {
    const response=await fetch(url);requireValue(response.ok,'Runtime asset checksum fetch failed');
    const bytes=await response.arrayBuffer();assets.push({url,bytes:bytes.byteLength,sha256:await sha256(bytes)});
  }
  requireValue(assets.some(a=>a.url.endsWith('.wasm')),'Actual WASM asset was not observed');
  result={passed:true,execution_policy:EXECUTION_POLICY,checks,runtime:{transformers_js:T.env.version,onnxruntime:ORT,backend:'wasm',threads:T.env.backends.onnx.wasm.numThreads,browser:navigator.userAgent,versions:T.env.backends.onnx.versions,assets},metrics:{load_ms,warm,js_heap:{before,loaded,after:heap()},gpu_memory:null,memory_notes:'JS heap is feature gated. Process RSS can overlap between processes and is not total physical RAM. GPU memory is unavailable.'}};
} catch(e) {error={message:String(e),stack:e.stack};}
finally {
  if(model)try{await model.dispose();}catch(e){error={message:'Model disposal failed: '+e,stack:e.stack};}
  if(error)result={...result,passed:false,error};
  const response=await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});
  if(!response.ok)throw Error('Result persistence failed: '+response.status);
  document.querySelector('#status').textContent=JSON.stringify(result);
}
