// shipped_decode_check.mjs: a change to docs/js/neural.js or docs/js/neural-confidence.js must not move a shipped model (ROLES_ROUNDTRIP.md: "identical wires, notes and
// per-key reads"). The model runs once per message; its outputs are decoded by the committed files (git show REV:...) and by the working tree's, and compared:
// the wires (ids, types, args), the notes, the text not read, each request's analysis (act, kind, every key's q / span / score / value / source / fill), and the
// confidence signals and gate decisions of neural-confidence.js (the model's confidence file, level cost).
// The gate of the ModernBERT tab (neural.js gateReader) is compared as well, and the structural holds of output contract diagram-reader-v2 (each
// request's blocked / block_reasons, each gate unit's blocked): a shipped model has none, on both sides.
//   LAPTOP_PKG=... node training/neural/parity/shipped_decode_check.mjs sop|modernbert [REV, default HEAD] [N per set, default all] [--model DIR] [--confidence FILE]
// sop: docs/model/neural/sop-bert with confidence/sop-bert.json; modernbert: the folder the ModernBERT tab reads (neural.js OURS['ours/modernbert'], today
// modernbert-c100) with its confidence file (confidence/<that folder>.json). --model and --confidence name other files explicitly (a model folder is
// read as q8 unless it is sop). The model and confidence actually used are printed with their hashes.
// Messages: llm_bench/fresh2/opus_{a,b,c,d} and llm_bench/short3, every row. Exit 1 on any difference.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { K, ROOT } from './parity_lib.mjs';
globalThis.SOPKit = K;

const argv = process.argv.slice(2), flag = n => { const i = argv.indexOf(n); return i < 0 ? null : argv.splice(i, 2)[1]; };
const modelArg = flag('--model'), confArg = flag('--confidence');
const [name = 'sop', rev = 'HEAD', nArg] = argv;
if (!['sop', 'modernbert'].includes(name)) throw new Error('sop or modernbert');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'decode-check-'));
const old = f => { const p = path.join(tmp, path.basename(f)); fs.writeFileSync(p, execFileSync('git', ['-C', ROOT, 'show', `${rev}:${f}`])); return p; };
const require = createRequire(import.meta.url);
const OLD = { N: require(old('docs/js/neural.js')), NC: await import(pathToFileURL(old('docs/js/neural-confidence.js')).href) };
const NEW = { N: require(ROOT + '/docs/js/neural.js'), NC: await import(ROOT + '/docs/js/neural-confidence.js') };
if (OLD.N === NEW.N) throw new Error('the two neural.js are the same module');
// the model folder and confidence file: explicit, else the ones the demo reads for this reader (never the obsolete first ModernBERT folder)
const folder = name === 'sop' ? 'sop-bert' : NEW.N.OURS['ours/modernbert'];
const modelDir = path.resolve(modelArg || ROOT + '/docs/model/neural/' + folder), confPath = path.resolve(confArg || ROOT + `/docs/model/confidence/${folder}.json`);
const hash = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const TF = createRequire(process.env.LAPTOP_PKG || new URL('../../laptop/package.json', import.meta.url))('@huggingface/transformers');
const { nextContext } = await import(ROOT + '/docs/js/vss-composer.js');
TF.env.allowRemoteModels = false; TF.env.allowLocalModels = true; TF.env.localModelPath = path.dirname(modelDir) + '/'; TF.env.useBrowserCache = false;
const tokenizer = await TF.AutoTokenizer.from_pretrained(path.basename(modelDir), { local_files_only: true });
const model = await TF.AutoModel.from_pretrained(path.basename(modelDir), { device: 'cpu', dtype: name === 'sop' ? NEW.N.dtypeOf('ours/sop-bert') : 'q8', local_files_only: true,
  session_options: name === 'sop' ? { intraOpNumThreads: 4 } : { graphOptimizationLevel: 'basic', intraOpNumThreads: 4 } });
// one model call per distinct input: both decoders read the same outputs
const memo = new Map();
const shared = async (inputs) => {
  const key = inputs.input_ids.dims.join('x') + ':' + Array.from(inputs.input_ids.data).join(',');
  if (!memo.has(key)) { memo.clear(); memo.set(key, await model(inputs)); }
  return memo.get(key);
};
shared.config = model.config;
const spec = JSON.parse(fs.readFileSync(confPath, 'utf8'));
console.log(`model ${modelDir} (config.json ${hash(modelDir + '/config.json')}, onnx/model_quantized.onnx ${hash(modelDir + '/onnx/model_quantized.onnx')}); confidence ${confPath} (${hash(confPath)})`);
const make = (S) => { const n = S.N.create(K.createSystem().engine, () => { throw new Error('the reader called the Rules'); }, { activateCut: false, requireJoint: true }); n.setModels(S.N.makeReader(TF, tokenizer, shared)); n.setStrategy('finetuned'); return n; };
const readers = { old: make(OLD), new: make(NEW) };

const rows = [];
for (const f of ['fresh2/opus_a', 'fresh2/opus_b', 'fresh2/opus_c', 'fresh2/opus_d', 'short3']) {
  const rs = fs.readFileSync(`${ROOT}/training/sketch/llm_bench/${f}/batch_01.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  rows.push(...(nArg ? rs.slice(0, +nArg) : rs).map(r => ({ set: f.split('/')[0], ...r })));
}
const view = (S, out) => JSON.stringify({
  nodes: out.nodes.map(n => ({ id: n.id, type: n.type, args: n.args })), notes: out.notes, unread: out.unread, cutBy: out.cutBy,
  analyses: out.analyses.map(a => ({ src: a.src, kind: a.kind, act: a.act || null, truncated: !!a.truncated, blocked: a.blocked, block_reasons: a.block_reasons, keys: Object.fromEntries(Object.entries(a.keys).map(([k, r]) => [k, { q: r.q, span: r.span, score: r.score, value: r.value, source: r.source, fill: r.fill, descPre: r.descPre, implied: r.implied }])) })),
  signals: out.analyses.map((_, i) => S.NC.signals(out, i)),
  gate: (g => g.units.map(u => ({ src: u.src, conf: u.conf, execute: u.execute, blocked: u.blocked, reasons: u.reasons.map(x => x.text) })))(S.NC.gate(spec, out, 'cost')),
  gateReader: ['cost', 'all'].map(l => (g => ({ safe: g.safe, executed: g.executed.map(n => n.id), units: g.units.map(u => ({ src: u.src, execute: u.execute, blocked: u.blocked, reasons: u.reasons.map(x => x.text) })) }))(S.N.gateReader(S.NC, spec, out, l))),
});
let same = 0, diff = 0, wires = 0, keys = 0; const per = {};
for (const r of rows) {
  const ctx = () => ({ names: (r.names || []).slice(), last: [] });
  const a = await readers.old.formalize(r.text, ctx(), { update: nextContext, signals: true });
  const b = await readers.new.formalize(r.text, ctx(), { update: nextContext, signals: true });
  const va = view(OLD, a), vb = view(NEW, b);
  (per[r.set] ||= { messages: 0, differ: 0 }).messages++;
  if (va === vb) same++; else { diff++; per[r.set].differ++; if (diff <= 3) console.log('DIFFERS', r.id, '\n old', va.slice(0, 600), '\n new', vb.slice(0, 600)); }
  wires += b.nodes.length; keys += b.analyses.reduce((s, x) => s + Object.keys(x.keys).length, 0);
}
console.log(`${path.basename(modelDir)}: decoded by ${rev}'s and the working tree's neural.js and neural-confidence.js: ${same} of ${rows.length} messages identical (${JSON.stringify(per)}); ${wires} wires, ${keys} per-key reads, ${diff} differ`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(diff ? 1 : 0);
