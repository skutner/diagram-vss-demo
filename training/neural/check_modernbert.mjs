// Compare the bound float32 reference with the existing native JS runtime.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, basename, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkParity, EXECUTION_POLICY } from './modernbert_parity.mjs';
const [folderArg, refsArg, receiptArg] = process.argv.slice(2);
if (!folderArg || !refsArg) throw new Error('usage: check_modernbert.mjs MODEL_FOLDER REFERENCES.json [NODE_RECEIPT.json]');
const folder = resolve(folderArg), refs = resolve(refsArg), repo = fileURLToPath(new URL('../../', import.meta.url));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const manifestPath = join(folder, 'export_manifest.json');
const candidate = JSON.parse(readFileSync(manifestPath, 'utf8')), envelope = JSON.parse(readFileSync(refs, 'utf8'));
assert.equal(candidate.schema, 'modernbert-export-candidate-v2'); assert.equal(candidate.complete, false);
assert.equal(candidate.export_mode, 'weight-only-u8-fp32');
const policy = EXECUTION_POLICY;
assert.deepEqual(candidate.execution_policy, policy); assert.deepEqual(envelope.execution_policy, policy);
assert.equal(candidate.reference.sha256, hash(refs));
assert.deepEqual(candidate.bindings, envelope.bindings);
for (const [name, value] of Object.entries(candidate.bindings.files)) {
  assert.equal(hash(join(folder, name)), value.sha256, 'Artifact hash changed: ' + name);
  assert.equal(readFileSync(join(folder, name)).byteLength, value.bytes);
}
for (const [name, value] of Object.entries(candidate.bindings.sources)) assert.equal(hash(join(repo, name)), value, 'Source hash changed: ' + name);
const manifestHash = hash(manifestPath), referenceHash = hash(refs);
const require = createRequire(new URL('../laptop/package.json', import.meta.url));
const T = require('@huggingface/transformers'), ort = require('onnxruntime-node');
const transformersVersion = JSON.parse(readFileSync(join(dirname(require.resolve('@huggingface/transformers')), '../package.json'), 'utf8')).version;
assert.equal(transformersVersion, '3.8.1'); assert.equal(ort.env.versions.node, '1.21.0');
globalThis.SOPKit = require('../../docs/js/logic.js');
const N = require('../../docs/js/neural.js');
const cache = mkdtempSync(join(tmpdir(), 'modernbert-node-'));
T.env.allowRemoteModels = false; T.env.allowLocalModels = true;
T.env.localModelPath = dirname(folder) + '/'; T.env.useBrowserCache = false;
// Transformers.js 3.8 needs its FS cache path to resolve external tensor files.
T.env.useFSCache = true; T.env.cacheDir = cache;
let model, checks;
try {
  const name = basename(folder), tokenizer = await T.AutoTokenizer.from_pretrained(name, { local_files_only: true });
  model = await T.AutoModel.from_pretrained(name, { device: 'cpu', dtype: 'q8', local_files_only: true,
    session_options: { graphOptimizationLevel: policy.graph_optimization } });
  assert.equal(model.config.model_type, 'modernbert');
  assert.deepEqual(model.config.reader.execution_policy, policy);
  checks = await checkParity(T, tokenizer, model, N, envelope);
} finally {
  try { if (model) await model.dispose(); }
  finally { rmSync(cache, { recursive: true, force: true }); }
}
// Recheck identities after inference and cleanup, before emitting a receipt.
assert.equal(hash(manifestPath), manifestHash); assert.equal(hash(refs), referenceHash);
for (const [name, value] of Object.entries(candidate.bindings.files)) assert.equal(hash(join(folder, name)), value.sha256);
for (const [name, value] of Object.entries(candidate.bindings.sources)) assert.equal(hash(join(repo, name)), value);
const receipt = { schema: 'modernbert-parity-receipt-v2', kind: 'node', passed: true,
  export_mode: candidate.export_mode, manifest_sha256: manifestHash, reference_sha256: referenceHash,
  execution_policy: policy,
  files: candidate.bindings.files, sources: candidate.bindings.sources,
  runtime: { transformers_js: transformersVersion, onnxruntime: ort.env.versions.node, node: process.version, backend: 'cpu' },
  checks, cleanup: { model_disposed: true, cache_removed: true } };
writeFileSync(receiptArg || join(folder, 'node-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt));
