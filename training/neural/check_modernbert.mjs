// Compare finalized q8 Python ORT outputs with the actual JS runtime and decoder.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, basename, resolve } from 'node:path';
const [folder, refs] = process.argv.slice(2);
if (!folder || !refs) throw new Error('usage: check_modernbert.mjs MODEL_FOLDER Q8_REFERENCES.json');
const require = createRequire(new URL('../laptop/package.json', import.meta.url));
const T = require('@huggingface/transformers');
globalThis.SOPKit = require('../../docs/js/logic.js');
const N = require('../../docs/js/neural.js');
T.env.allowRemoteModels = false; T.env.allowLocalModels = true;
T.env.localModelPath = dirname(resolve(folder)) + '/'; T.env.useBrowserCache = false;
const name = basename(folder), tokenizer = await T.AutoTokenizer.from_pretrained(name, { local_files_only: true });
const model = await T.AutoModel.from_pretrained(name, { device: 'cpu', dtype: 'q8', local_files_only: true });
try {
assert.equal(model.config.model_type, 'modernbert');
const r = N.makeReader(T, tokenizer, model), rows = JSON.parse(readFileSync(refs, 'utf8'));
assert.ok(rows.length > 0, 'No parity fixtures');
let checked = 0;
const flatten = x => Array.isArray(x) ? x.flat(Infinity) : Array.from(x);
for (const row of rows) {
  const p = r.prepare(row.text, row.limit);
  assert.deepEqual(p.ids, row.ids); assert.deepEqual([...p.first], row.first);
  assert.equal(p.truncated, row.truncated); assert.equal(p.unreadFrom, row.unreadFrom);
  const input = { input_ids: new T.Tensor('int64', BigInt64Array.from(p.ids, BigInt), [1, p.ids.length]),
    attention_mask: new T.Tensor('int64', new BigInt64Array(p.ids.length).fill(1n), [1, p.ids.length]) };
  const got = await model(input);
  for (const [i, key] of ['token_logits', 'seq_logits', 'cut_logits'].entries()) {
    const want = flatten(row.outputs[i]), actual = got[key].data;
    assert.equal(actual.length, want.length);
    for (let j = 0; j < want.length; j++) assert.ok(Number.isFinite(actual[j]) && Math.abs(actual[j] - want[j]) <= 1e-3 + 1e-3 * Math.abs(want[j]), `${key}[${j}] Python/JS q8 differs`);
  }
  // Request and message caps are separate; Python supplies both views below.
  if (row.limit === 128) {
    const o = await r.read(row.text);
    assert.equal(o.acts[0].label, row.decoded.act);
    const classes = Object.fromEntries(Object.entries(o.classes).filter(([, x]) => x.value != null).map(([k, x]) => [k, x.value]));
    assert.deepEqual(classes, row.decoded.classes); assert.deepEqual(o.tags, row.decoded.tags);
  }
  if (row.limit === 512) {
    assert.deepEqual((await r.cut(row.text)).map(x => [x.c0, x.c1]), row.decoded.cut);
    assert.deepEqual(r.cutInfo(row.text), row.decoded.cutInfo, 'Final cutInfo differs from preparation at an open truncated span');
  }
  checked++;
}
console.log(JSON.stringify({ fixtures: checked, ids: true, outputs: true, decoded: true, cuts: true }));
} finally {
  await model.dispose();
}
