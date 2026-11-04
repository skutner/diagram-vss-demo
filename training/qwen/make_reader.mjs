// make_reader.mjs: writes docs/model/qwen3/reader.json, the Qwen3 reader's fixed inputs (training/qwen/QWEN3_PLAN.md B1, B4, B6):
// the artifact and runtime pins, the act keys of the shipped SOP-BERT config (learned from the annotated training data), the two
// prompt examples taken from annotated training data by a fixed rule, and the SHA-256 of the prompt and schema they give with the
// current legend (the browser recomputes both and refuses to run on a mismatch).
// Run from the repository root: node training/qwen/make_reader.mjs [--check]   (--check: exit 1 if the file would change)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { buildSpec, buildSchema, buildPrompt, validate, toNodes, userContent } from '../../docs/js/qwen-contract.js';
const K = createRequire(import.meta.url)('../../docs/js/logic.js');
const OUT = 'docs/model/qwen3/reader.json', SOP = 'docs/model/neural/sop-bert/config.json', EX = 'training/sketch/llm_train/opus_train_c/msg_01.jsonl';
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const S = K.createSystem(), legend = S.engine.legend;
const sopCfg = JSON.parse(fs.readFileSync(SOP, 'utf8')).reader;
const versions = JSON.parse(fs.readFileSync('docs/model/versions.json', 'utf8')).files;
const base = { act_keys: sopCfg.act_keys, desc_keys: sopCfg.desc_keys, examples: [] };
const spec = buildSpec(legend, base, K.serialize);

/** one annotated message -> the contract's output, or null when a gold wire cannot be written in the contract (fixed rule, B6) */
function convert(m) {
  const requests = [];
  for (const [i, w] of m.wires.entries()) {
    const act = w.type === 'command' ? w.args.action : w.type === 'question' ? w.args.ask : w.type;
    const a = spec.byDo.get(act); if (!a || !m.text.includes(w.span)) return null;
    const args = {};
    for (const k of spec.order) {
      if (!(k in w.args)) continue;
      if (!a.keys.includes(k)) return null;
      const kind = spec.keys.get(k).kind, v = w.args[k];
      if (kind === 'names') { const parts = String(v).split(',').map(x => x.trim()).filter(Boolean); if (!parts.length || parts.some(x => x.startsWith('$'))) return null; args[k] = parts.map(name => ({ name })); }
      else if (kind === 'number') { const n = Number(v); if (!Number.isFinite(n)) return null; args[k] = n; }
      else if (kind === 'enum') { if (!spec.keys.get(k).values.includes(String(v))) return null; args[k] = String(v); }
      else if (kind === 'name' || kind === 'text') args[k] = String(v);
      else return null;
    }
    for (const k of Object.keys(w.args)) if (k !== 'action' && k !== 'ask' && !(k in args)) return null;
    requests.push({ id: 'r' + (i + 1), text: w.span, do: act, args });
  }
  return { requests, not_understood: [] };
}
const lines = fs.readFileSync(EX, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
for (const m of lines) {
  if (base.examples.length === 2) break;
  const output = convert(m); if (!output) continue;
  // the example must pass the reader's own validation and mapping
  const v = validate(spec, { content: JSON.stringify(output), finish: 'stop', reasoning: '' }, { text: m.text, names: m.names, last: [] });
  const ok = v.ok && v.requests.every(r => !r.blocked) && toNodes(spec, v, { names: m.names, last: [] }, null).nodes.length;
  if (ok) base.examples.push({ id: m.id, source: EX, names: m.names, text: m.text, output });
}
const wireDocs = Object.fromEntries([...S.engine.wireTypes].map(([t, w]) => [t, w.doc]));
const prompt = buildPrompt(spec, base, wireDocs), schema = buildSchema(spec);
const reader = {
  about: 'Fixed inputs of the experimental Qwen3 reader (training/qwen/QWEN3_PLAN.md). Written by training/qwen/make_reader.mjs; do not edit by hand.',
  model: { repo: 'Qwen/Qwen3-0.6B-GGUF', file: 'Qwen3-0.6B-Q8_0.gguf', revision: '23749fefcc72300e3a2ad315e1317431b06b590a',
    url: 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/Qwen3-0.6B-Q8_0.gguf',
    bytes: 639446688, sha256: '9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031', license: 'Apache-2.0',
    expect: { architecture: 'qwen3', name: 'Qwen3 0.6B Instruct', n_vocab: 151936, n_layer: 28, eos: 151645, file_type: '7', chat_template_sha256: '' } },
  runtime: { package: '@wllama/wllama', version: '3.8.1', npm_integrity: 'sha512-Pl7BEJhPU8OHnV/yhn3DFZYhLLOdSHh+4TND79WCftHnlUAdQPAsyc/CfIOY+4mVxvf5VW3Xw3Uf7BBfotS1gw==', git_head: 'b68fd6427063266176bb0054befe9ff70b3258f1', libllama: 'b11364-46ca246',
    files: { 'vendor/wllama-3.8.1/index.min.js': sha(fs.readFileSync('docs/vendor/wllama-3.8.1/index.min.js')), 'vendor/wllama-3.8.1/wllama.wasm': sha(fs.readFileSync('docs/vendor/wllama-3.8.1/wllama.wasm')) } },
  load: { n_gpu_layers: 0, n_threads: 1, n_ctx: 6144, n_batch: 512, n_parallel: 1, jinja: true, seed: 0 },
  request: { temperature: 0, seed: 0, max_tokens: 2048, chat_template_kwargs: { enable_thinking: false }, cache_prompt: true, logprobs: true, top_logprobs: 1, post_sampling_probs: false, verbose: true, return_tokens: true },
  time_limit_ms: 30 * 60 * 1000,
  check_sentence: 'Draw a small circle.',
  act_keys: base.act_keys, desc_keys: base.desc_keys, act_keys_source: `${SOP} reader.act_keys (neural/sop-bert version ${versions['neural/sop-bert']})`,
  examples: base.examples,
  prompt_sha256: sha(prompt), schema_sha256: sha(JSON.stringify(schema)), prompt_chars: prompt.length
};
// the chat template embedded in the pinned GGUF (read once from the file's metadata by training/qwen/gguf_meta.mjs) is pinned here too
const tpl = 'reports/evidence/qwen3-browser-prototype/gguf-chat-template.jinja';
if (fs.existsSync(tpl)) reader.model.expect.chat_template_sha256 = sha(fs.readFileSync(tpl, 'utf8'));
const text = JSON.stringify(reader, null, 1) + '\n';
if (process.argv.includes('--check')) { const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''; if (cur !== text) { console.error(`${OUT} is out of date: run node training/qwen/make_reader.mjs`); process.exit(1); } console.log(`${OUT} is up to date`); process.exit(0); }
fs.mkdirSync('docs/model/qwen3', { recursive: true }); fs.writeFileSync(OUT, text);
console.log(`wrote ${OUT}: ${spec.acts.length} acts, ${spec.order.length} keys, examples ${base.examples.map(e => e.id).join(', ')}, prompt ${prompt.length} chars (sha256 ${reader.prompt_sha256.slice(0, 12)}), schema sha256 ${reader.schema_sha256.slice(0, 12)}`);
if (process.argv.includes('--print')) { console.log(prompt); console.log(userContent(['Start'], 'example')); }
