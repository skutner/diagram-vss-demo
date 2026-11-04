// Shared assertions for native Node and the pinned browser WASM runtime.
// This module deliberately has no platform imports.
const fail = (ok, message) => { if (!ok) throw new Error(message); };
const stable = x => Array.isArray(x) ? x.map(stable) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
const equal = (a, b, message) => fail(JSON.stringify(stable(a)) === JSON.stringify(stable(b)), message);
const flat = x => x.flat(Infinity);
const argmax = xs => xs.reduce((best, x, i) => x > xs[best] ? i : best, 0);
const HEADS = ['token_logits', 'seq_logits', 'cut_logits'];
export const EXECUTION_POLICY = Object.freeze({ graph_optimization: 'basic', arithmetic: 'float32', weight_storage: 'uint8' });

function roleIndices(tags) {
  const spans = {}; let current = null;
  tags.forEach((tag, i) => {
    if (tag === 'O') { current = null; return; }
    const key = tag.slice(2), list = spans[key] || (spans[key] = []), last = list.at(-1);
    if (tag[0] === 'I' && current === key && last && last[1] === i) last[1] = i + 1;
    else { list.push([i, i + 1]); current = key; }
  });
  return spans;
}

function categorical(out, row, b, reader, prepared) {
  const n = out.token_logits.dims[1], nt = reader.tags.length, seqn = out.seq_logits.dims[1];
  const seq = Array.from(out.seq_logits.data.slice(b * seqn, (b + 1) * seqn));
  const classes = {}; let offset = reader.acts.length;
  for (const [key, values] of reader.classes) {
    const index = argmax(seq.slice(offset, offset + values.length));
    if (index) classes[key] = values[index]; offset += values.length;
  }
  const tags = prepared.ws.map((_, i) => {
    const token = prepared.first.get(i);
    return token == null ? 'O' : reader.tags[argmax(Array.from(out.token_logits.data.slice((b * n + token) * nt, (b * n + token + 1) * nt)))];
  });
  return { act: reader.acts[argmax(seq.slice(0, reader.acts.length))], classes, tags, spans: roleIndices(tags) };
}

function actualRoles(result, prepared) {
  const roles = {};
  for (const [key, spans] of Object.entries(result.spans)) roles[key] = spans.map(span => {
    const i = prepared.ws.findIndex(w => w.start === span.start);
    const j = prepared.ws.findIndex(w => w.end === span.end) + 1;
    fail(i >= 0 && j > i && span.text === prepared.text.slice(span.start, span.end), 'Production role text/UTF16 bounds differ');
    return [i, j];
  });
  return roles;
}

export async function checkParity(T, tokenizer, model, N, envelope) {
  fail(envelope.schema === 'modernbert-reference-v2' && envelope.export_mode === 'weight-only-u8-fp32', 'Wrong reference schema/mode');
  fail(Array.isArray(envelope.cases), 'Missing parity fixtures');
  const ids = envelope.cases.map(x => x.id);
  fail(new Set(ids).size === ids.length && Array.from({ length: 16 }, (_, i) => `single-${String(i).padStart(2, '0')}`).every(id => ids.includes(id)), 'Missing/duplicate original single fixtures');
  const reader = model.config.reader;
  let singles = 0, batches = 0, readMany = 0;
  const maxima = [0, 0, 0];
  for (const row of envelope.cases) {
    fail(row.texts.length > 0 && row.texts.length === row.prepared.length && row.texts.length === row.decoded.length, 'Invalid case rows');
    const config = { ...model.config, reader: { ...reader, max_length: Math.min(row.limit, 128), cut: { ...reader.cut, max_length: row.limit } } };
    const invoke = input => model(input); invoke.config = config;
    const r = N.makeReader(T, tokenizer, invoke);
    const prepared = row.texts.map(text => r.prepare(text, row.limit));
    prepared.forEach((p, i) => equal({ ids: p.ids, first: [...p.first], truncated: p.truncated, unreadFrom: p.unreadFrom }, row.prepared[i], `${row.id}: preparation differs`));
    const n = Math.max(...prepared.map(p => p.ids.length));
    if (row.texts.length > 1) fail(new Set(prepared.map(p => p.ids.length)).size > 1, `${row.id}: batch does not exercise padding`);
    const ids = prepared.map(p => [...p.ids, ...Array(n - p.ids.length).fill(tokenizer.pad_token_id)]);
    const mask = prepared.map(p => [...Array(p.ids.length).fill(1), ...Array(n - p.ids.length).fill(0)]);
    equal({ input_ids: ids, attention_mask: mask }, row.inputs, `${row.id}: padded inputs differ`);
    const tensors = Object.fromEntries(Object.entries(row.inputs).map(([key, data]) => [key,
      new T.Tensor('int64', BigInt64Array.from(flat(data), BigInt), [row.texts.length, n])]));
    const out = await model(tensors);
    for (const [i, key] of HEADS.entries()) {
      equal(out[key].dims, row.output_shapes[i], `${row.id}: ${key} shape differs`);
      const want = flat(row.outputs[i]), got = out[key].data;
      fail(got.length === want.length, `${row.id}: ${key} length differs`);
      for (let j = 0; j < want.length; j++) {
        const error = Math.abs(got[j] - want[j]); maxima[i] = Math.max(maxima[i], error);
        fail(Number.isFinite(got[j]) && Number.isFinite(want[j]) && error <= 1e-3 + 1e-3 * Math.abs(want[j]), `${row.id}: ${key}[${j}] numeric parity failed`);
      }
    }
    prepared.forEach((p, b) => {
      const actual = categorical(out, row, b, reader, p), expected = row.decoded[b];
      for (const key of ['act', 'classes', 'tags', 'spans']) equal(actual[key], expected[key], `${row.id}: raw decoded ${key} differs`);
    });
    if (row.limit <= 128) {
      const results = await r.readMany(row.texts); readMany++;
      results.forEach((result, b) => {
        const want = row.decoded[b];
        equal(result.acts[0].label, want.act, `${row.id}: production act differs`);
        equal(Object.fromEntries(Object.entries(result.classes).filter(([, value]) => value.value != null).map(([key, value]) => [key, value.value])), want.classes, `${row.id}: production classes differ`);
        equal(result.tags, want.tags, `${row.id}: production tags differ`);
        equal(actualRoles(result, prepared[b]), want.spans, `${row.id}: production roles differ`);
      });
    }
    // Feed each actual batch row through the production cut decoder. This keeps
    // padded-batch semantics instead of comparing to a different single call.
    for (let b = 0; b < row.texts.length; b++) {
      const one = {};
      for (const key of HEADS) {
        const shape = out[key].dims, width = out[key].data.length / row.texts.length;
        one[key] = new T.Tensor('float32', out[key].data.slice(b * width, (b + 1) * width), [1, ...shape.slice(1)]);
      }
      const cached = async () => one; cached.config = config;
      const cutter = N.makeReader(T, tokenizer, cached);
      equal((await cutter.cut(row.texts[b])).map(x => [x.c0, x.c1]), row.decoded[b].cut, `${row.id}: production cuts differ`);
      equal(cutter.cutInfo(row.texts[b]), row.decoded[b].cutInfo, `${row.id}: final cutInfo differs`);
    }
    if (row.texts.length === 1) singles++; else batches++;
  }
  fail(batches >= 2 && readMany > 0, 'Missing padded batches/readMany');
  return { fixtures: envelope.cases.length, singles, batches, ids: true, outputs: true, decoded: true, cuts: true, readMany: true, max_abs: maxima };
}
