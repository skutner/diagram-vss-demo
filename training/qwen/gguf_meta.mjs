// gguf_meta.mjs: reads the metadata of a GGUF file (format v2/v3, https://github.com/ggml-org/ggml/blob/master/docs/gguf.md) without any
// runtime, to check what the pinned Qwen3 file embeds: architecture, tokenizer model and its token list, special token ids and the
// chat template. Native Node only.
// Run: node training/qwen/gguf_meta.mjs <file.gguf> [--template-out <file>] [--json-out <file>]
import fs from 'node:fs';
import crypto from 'node:crypto';
const [file] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const argOf = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const fd = fs.openSync(file, 'r'); let pos = 0; const CH = 1 << 20; let buf = Buffer.alloc(0), bufAt = 0;
function need(n) { if (pos + n <= bufAt + buf.length) return; const at = pos, b = Buffer.alloc(Math.max(CH, n)); const r = fs.readSync(fd, b, 0, b.length, at); buf = b.subarray(0, r); bufAt = at; if (r < n) throw new Error('unexpected end of file'); }
const rd = { u8() { need(1); return buf[pos++ - bufAt]; }, u16() { need(2); const v = buf.readUInt16LE(pos - bufAt); pos += 2; return v; }, i16() { need(2); const v = buf.readInt16LE(pos - bufAt); pos += 2; return v; },
  u32() { need(4); const v = buf.readUInt32LE(pos - bufAt); pos += 4; return v; }, i32() { need(4); const v = buf.readInt32LE(pos - bufAt); pos += 4; return v; }, f32() { need(4); const v = buf.readFloatLE(pos - bufAt); pos += 4; return v; },
  u64() { need(8); const v = buf.readBigUInt64LE(pos - bufAt); pos += 8; return Number(v); }, i64() { need(8); const v = buf.readBigInt64LE(pos - bufAt); pos += 8; return Number(v); }, f64() { need(8); const v = buf.readDoubleLE(pos - bufAt); pos += 8; return v; },
  str() { const n = rd.u64(); need(n); const s = buf.toString('utf8', pos - bufAt, pos - bufAt + n); pos += n; return s; } };
const scalar = t => [rd.u8, () => rd.u8() << 24 >> 24, rd.u16, rd.i16, rd.u32, rd.i32, rd.f32, () => rd.u8() !== 0, rd.str, null, rd.u64, rd.i64, rd.f64][t];
function value(t) {
  if (t === 9) { const et = rd.u32(), n = rd.u64(), f = scalar(et); if (!f) throw new Error('nested arrays are not read'); const out = new Array(n); for (let i = 0; i < n; i++) out[i] = f(); return out; }
  const f = scalar(t); if (!f) throw new Error('unknown GGUF value type ' + t); return f();
}
const magic = (need(4), buf.toString('latin1', 0, 4)); pos = 4;
if (magic !== 'GGUF') throw new Error('not a GGUF file');
const version = rd.u32(), tensors = rd.u64(), nkv = rd.u64(), meta = {};
for (let i = 0; i < nkv; i++) { const k = rd.str(), t = rd.u32(); meta[k] = value(t); }
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const tok = meta['tokenizer.ggml.tokens'] || [], tpl = meta['tokenizer.chat_template'] || '';
const summary = {
  file, bytes: fs.statSync(file).size, gguf_version: version, tensor_count: tensors, metadata_count: nkv,
  architecture: meta['general.architecture'], name: meta['general.name'], file_type: meta['general.file_type'], quantization_version: meta['general.quantization_version'],
  block_count: meta[`${meta['general.architecture']}.block_count`], context_length: meta[`${meta['general.architecture']}.context_length`],
  tokenizer: { model: meta['tokenizer.ggml.model'], pre: meta['tokenizer.ggml.pre'], tokens: tok.length, merges: (meta['tokenizer.ggml.merges'] || []).length,
    bos: meta['tokenizer.ggml.bos_token_id'], eos: meta['tokenizer.ggml.eos_token_id'], padding: meta['tokenizer.ggml.padding_token_id'], add_bos: meta['tokenizer.ggml.add_bos_token'],
    tokens_sha256: sha(tok.join('\n')), eos_text: tok[meta['tokenizer.ggml.eos_token_id']], special: Object.fromEntries(['<|im_start|>', '<|im_end|>', '<think>', '</think>', '<|endoftext|>'].map(s => [s, tok.indexOf(s)])) },
  chat_template: { chars: tpl.length, sha256: sha(tpl), enable_thinking_false_branch: tpl.includes("enable_thinking is defined and enable_thinking is false") && tpl.includes("'<think>\\n\\n</think>\\n\\n'") },
  other_keys: Object.keys(meta).filter(k => !k.startsWith('tokenizer.ggml.tokens') && !k.startsWith('tokenizer.ggml.merges') && !k.startsWith('tokenizer.ggml.token_type'))
};
fs.closeSync(fd);
if (argOf('--template-out')) fs.writeFileSync(argOf('--template-out'), tpl);
if (argOf('--json-out')) fs.writeFileSync(argOf('--json-out'), JSON.stringify(summary, null, 1) + '\n');
console.log(JSON.stringify(summary, null, 1));
