// roles_roundtrip.mjs: the decoding half of training/neural/roles_roundtrip.py (see there). The GOLD labels of make_roles.py's rows are given
// to docs/js/neural.js as if SOP-BERT had predicted them perfectly (one-hot logits from a stand-in model), and the REAL decoding path runs:
// makeReader (cut head -> units, word pieces and truncation of the real tokenizer, class heads, B / I / O tags -> spans), then NeuralKit
// create().formalize (formalizeJoint: act_keys, fill:<key> / desc:<key>, the shared context rule nextContext of docs/js/vss-composer.js, as
// the collector training/sketch/fresh2/collect_sop.mjs passes it). The wires are compared with the gold wires in bench-canon form
// (docs/js/bench-canon.js canon / canonWant), paired as llm_score.mjs PAIR=value (layer_common.mjs pairValue), as job 072 scores.
//   node training/neural/roles_roundtrip.mjs <reader.json> <messages.jsonl> <out.jsonl> [<tokenizer folder, default docs/model/neural/sop-bert>]
// messages.jsonl (written by roles_roundtrip.py): {id, text, names, wires (gold, non-pending), cut: [B/I/O per word], words,
//   rows: [{text, words, tags, act, ct: [class target per class head], wi: gold wire index}]}
// IMPLIED_SCALE=1 (make_roles.py): `scale` is compared as well, by its number and on either side; bench-canon.js, which skips it, stays as it is.
// out.jsonl: {id, gold: [{o: right|wrong|missing, miss: [[key, got, want]], got}], extra: [{act, got, src}], units, unitsNoRow, wordsDiffer}
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, basename, resolve } from "node:path";
const [readerPath, inPath, outPath, tokArg] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const T = await import(pathToFileURL(fileURLToPath(new URL("../laptop/node_modules/@huggingface/transformers/dist/transformers.node.mjs", import.meta.url))).href);
const K = require("../../docs/js/logic.js");
globalThis.SOPKit = K;
const NeuralKit = require("../../docs/js/neural.js");
const { nextContext } = await import("../../docs/js/vss-composer.js");
const { canon, canonWant } = await import("../../docs/js/bench-canon.js");
const { pairValue } = await import("../sketch/layer_common.mjs");

const TOK = resolve(tokArg || fileURLToPath(new URL("../../docs/model/neural/sop-bert", import.meta.url)));
T.env.allowLocalModels = true; T.env.allowRemoteModels = false; T.env.localModelPath = dirname(TOK) + "/";
const realTok = await T.AutoTokenizer.from_pretrained(basename(TOK), { local_files_only: true });
const memo = new Map();
const tokenizer = {   // the real tokenizer, memoised (makeReader encodes word by word)
  encode(t, o) { const key = (o && o.add_special_tokens === false ? "0" : "1") + t; let v = memo.get(key); if (!v) { v = realTok.encode(t, o); memo.set(key, v); } return v; },
  model: realTok.model, unk_token_id: realTok.unk_token_id,
};
const R = JSON.parse(readFileSync(readerPath, "utf8"));
R.max_length = R.max_length || 128;
const nA = R.acts.length, nT = R.tags.length, nC = R.classes.reduce((s, [, v]) => s + v.length, 0), offs = [];
{ let o = nA; for (const [, v] of R.classes) { offs.push(o); o += v.length; } }
const HI = 20;   // the one-hot logit
const CMP_SCALE = process.env.IMPLIED_SCALE === "1";
const scaleOf = (a) => (a && a.scale != null ? +a.scale : null);

// makeReader's prep(): the position of each word's first word piece (the same loop, the same limit)
function firsts(text, limit) {
  const ws = NeuralKit.wordsOf(text), sp = tokenizer.encode(""), first = new Map(); let n = 1;
  for (let i = 0; i < ws.length && n < limit - 1; i++) {
    const p = tokenizer.encode(ws[i].w, { add_special_tokens: false });
    for (let j = 0; j < p.length && n < limit - 1; j++) { if (j === 0) first.set(i, n); n++; }
  }
  return { ws, first, n: n + 1, sp };
}
class Tensor { constructor(type, data, dims) { this.type = type; this.data = data; this.dims = dims; } }
let MODE = null;   // {kind: "cut", msg} | {kind: "read", rows: [row | null]}
const fake = async ({ input_ids }) => {
  const [B, n] = input_ids.dims;
  const tok = new Float32Array(B * n * nT), seq = new Float32Array(B * (nA + nC)), cut = new Float32Array(B * n * 3);
  if (MODE.kind === "cut") {
    const { first } = firsts(MODE.msg.text, (R.cut && R.cut.max_length) || 512), CI = { O: 0, B: 1, I: 2 };
    MODE.msg.cut.forEach((t, i) => { const p = first.get(i); if (p != null) cut[p * 3 + CI[t]] = HI; });
  } else {
    MODE.rows.forEach((row, b) => {
      if (!row) return;   // a unit with no training row: all logits 0 (index 0 everywhere: the first act, no class, O)
      const { first } = firsts(row.unitText, R.max_length);
      seq[b * (nA + nC) + R.acts.indexOf(row.act)] = HI;
      row.ct.forEach((c, h) => { seq[b * (nA + nC) + offs[h] + c] = HI; });
      row.unitTags.forEach((t, i) => { const p = first.get(i); if (p == null) return; const ti = R.tags.indexOf(t); tok[(b * n + p) * nT + (ti < 0 ? 0 : ti)] = HI; });
    });
  }
  return { token_logits: new Tensor("float32", tok, [B, n, nT]), seq_logits: new Tensor("float32", seq, [B, nA + nC]), cut_logits: new Tensor("float32", cut, [B, n, 3]) };
};
fake.config = { reader: R };
const reader = NeuralKit.makeReader({ Tensor }, tokenizer, fake);
const m = Object.assign({ device: "cpu", dtype: "oracle" }, reader);
const origCut = m.cut, origRM = m.readMany;
let MSG = null;
m.cut = async (text) => { MODE = { kind: "cut", msg: MSG }; return origCut(text); };
m.readMany = async (texts) => {
  const used = new Set(), low = (ws) => ws.map((w) => w.toLowerCase());
  const rows = texts.map((t) => {
    const uw = NeuralKit.wordsOf(t).map((w) => w.w);
    let k = MSG.rows.findIndex((r, i) => !used.has(i) && r.words.join("\u0001") === uw.join("\u0001"));
    if (k < 0) {   // the unit is not exactly a row (the cut tags lost or merged a span): the row it shares most words with, its tags placed where its words are
      let best = -1, bs = 0; const U = new Set(low(uw));
      MSG.rows.forEach((r, i) => { if (used.has(i)) return; const s = low(r.words).filter((w) => U.has(w)).length; if (s > bs) { bs = s; best = i; } });
      k = best;
    }
    if (k < 0) { MSG.unitsNoRow++; return null; }
    used.add(k); const r = MSG.rows[k], tags = new Array(uw.length).fill("O");
    let at = -1; for (let s = 0; s + r.words.length <= uw.length; s++) if (r.words.every((w, j) => uw[s + j] === w)) { at = s; break; }
    if (at >= 0) r.tags.forEach((g, j) => { tags[at + j] = g; }); else MSG.unitNotRow++;
    return Object.assign({}, r, { unitText: t, unitTags: tags });
  });
  MODE = { kind: "read", rows };
  return origRM(texts);
};
const nsys = K.createSystem(), neural = NeuralKit.create(nsys.engine, () => { throw new Error("SOP-BERT called the Rules reader"); });
neural.setModels(m); neural.setStrategy("finetuned");

const actOf = (type, args) => `${type}:${args.action || args.ask || ""}`;
function pairUp(mains, gold, row) {   // llm_score.mjs pairUp, PAIR=value
  const used = new Set(), G = row.wires.map((w, j) => {
    let s0 = -1;
    if (w.span) { let from = 0; for (;;) { const k = row.text.indexOf(w.span, from); if (k < 0) break; if (!used.has(k)) { s0 = k; break; } from = k + 1; } if (s0 < 0) s0 = row.text.indexOf(w.span); used.add(s0); }
    return { s: s0, e: s0 < 0 ? -1 : s0 + w.span.length, act: gold[j].act, want: gold[j].want, args: w.args };
  });
  const units = mains.map((x) => { if (x.n.span) return { c0: x.n.span[0], c1: x.n.span[1] }; return { c0: 0, c1: 0 }; });
  return pairValue({ text: row.text, gold: G, units, prods: mains.map((x, i) => ({ act: x.act, u: i, rawC: x.got })) });
}

const msgs = readFileSync(inPath, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const out = [];
let done = 0;
for (const r of msgs) {
  MSG = Object.assign(r, { unitsNoRow: 0, unitNotRow: 0 });
  const jsWords = NeuralKit.wordsOf(r.text).map((w) => w.w);
  const wordsDiffer = jsWords.join("\u0001") !== r.words.join("\u0001") || r.rows.some((x) => NeuralKit.wordsOf(x.text).map((w) => w.w).join("\u0001") !== x.words.join("\u0001"));
  let res;
  try {
    res = await neural.formalize(r.text, { names: (r.names || []).slice(), last: [] }, { update: nextContext });
  } catch (e) { out.push({ id: r.id, error: String(e && e.message || e), gold: r.wires.map(() => ({ o: "missing", miss: [] })), extra: [], units: 0, unitsNoRow: 0, wordsDiffer }); continue; }
  const nodes = res.nodes, mains = nodes.filter((n) => n.type !== "mention").map((n) => ({ act: actOf(n.type, n.args), got: canon(n, nodes), n }));
  const gold = r.wires.map((w) => ({ act: actOf(w.type, w.args || {}), want: canonWant(w.type, w.args || {}) }));
  const pairs = pairUp(mains, gold, r), G = gold.map(() => ({ o: "missing", miss: [] })), usedP = new Set();
  for (const [i, j] of pairs) {
    usedP.add(i);
    const miss = Object.entries(gold[j].want).filter(([k, v]) => (mains[i].got[k] ?? "∅") !== v).map(([k, v]) => [k, mains[i].got[k] ?? "∅", v]);
    if (CMP_SCALE) { const g = scaleOf(mains[i].n.args), w = scaleOf(r.wires[j].args); if (g !== w) miss.push(["scale", g == null ? "∅" : String(g), w == null ? "∅" : String(w)]); }
    const extraKeys = Object.keys(mains[i].got).filter((k) => !(k in gold[j].want));   // produced keys the gold does not have (not scored; reported)
    G[j] = { o: miss.length ? "wrong" : "right", miss, got: mains[i].got, extraKeys };
  }
  const extra = mains.filter((_, i) => !usedP.has(i)).map((x) => ({ act: x.act, got: x.got, src: x.n.span ? r.text.slice(x.n.span[0], x.n.span[1]) : "" }));
  out.push({ id: r.id, gold: G, extra, units: res.analyses.length, unitsNoRow: MSG.unitsNoRow, unitNotRow: MSG.unitNotRow, wordsDiffer });
  if (++done % 5000 === 0) console.error(`${done}/${msgs.length} messages`);
}
writeFileSync(outPath, out.map((x) => JSON.stringify(x)).join("\n") + "\n");
console.error(`decoded ${out.length} messages`);
