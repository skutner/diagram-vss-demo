// test_neural_confidence.mjs: parity of the browser code (docs/js/neural.js head logits + docs/js/neural-confidence.js signals, confidence,
// gate) with the scripts (training/sketch/precision_bert_collect.mjs `features` + precision_confidence_bert.mjs bertConfidence), code vs
// code on the same model (docs/model/neural/sop-bert) and the same confidence file.
//   node training/sketch/test_neural_confidence.mjs [confidence json] [N requests]
//     default json: docs/model/confidence/sop-bert.json; default N: 200 (the first N produced requests of the sample, in the collect
//     script's order: the sample1000 folders sorted, LIMIT messages each).
// 1. runs precision_bert_collect.mjs (unchanged) as a child process on the sample -> its signals; confidence = bertConfidence(spec, f, act);
// 2. loads the model here once and reads the same messages with NeuralKit (the demo's code path, its own cut), the gate of
//    neural-confidence.js at every level of the file;
// 3. reports per request: act equal, max |signal difference|, max |confidence difference|, decisions (conf >= threshold) per level;
// 4. the demo's path with the BERT cutter (units given by NeuralKit.cut, then formalize with those units: the cut head's output is reused,
//    no extra call) gives the same confidences; with units from another cut and opts.signals the cut head runs once more (one extra call).
// Needs `npm install` in training/laptop (@huggingface/transformers). Exit 0 when every check passes.
import { readFileSync, readdirSync, mkdtempSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const SPEC_PATH = process.argv[2] || path.join(ROOT, "docs/model/confidence/sop-bert.json");
const NREQ = +(process.argv[3] || 200);
const LIMIT = process.env.LIMIT || "8";
const SAMPLE = path.join(HERE, "eval/sample1000");
const dirs = readdirSync(SAMPLE).sort().map((d) => path.join(SAMPLE, d));
const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
const { bertConfidence } = await import("./precision_confidence_bert.mjs");
const NC = await import(pathToFileURL(path.join(ROOT, "docs/js/neural-confidence.js")).href);

let fails = 0;
const check = (name, ok, detail = "") => { console.log((ok ? "ok   " : "FAIL ") + name + (ok || !detail ? "" : "\n     " + detail)); if (!ok) fails++; };

// 1. the scripts
const out = path.join(process.env.SCRATCH || mkdtempSync(path.join(tmpdir(), "nc-")), "collect.jsonl");
console.log(`collect: precision_bert_collect.mjs on ${dirs.length} sample folders, LIMIT=${LIMIT} -> ${out}`);
const cp = spawnSync(process.execPath, [path.join(HERE, "precision_bert_collect.mjs"), out, "sample", ...dirs], { env: { ...process.env, LIMIT }, encoding: "utf8", maxBuffer: 1 << 26 });
if (cp.status !== 0) { console.error(cp.stderr); process.exit(2); }
console.log(cp.stdout.trim().split("\n").pop());
const recs = readFileSync(out, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const script = recs.flatMap((r) => r.sop.map((s, j) => ({ id: r.id, j, act: s.act, f: s.f, conf: bertConfidence(spec, s.f, s.act) })));

// 2. the browser code, here in node
process.env.LLM_SCORE_LIB = "1"; process.env.SEG ||= "composer"; process.env.PAIR ||= "value";
const { logic: K } = await import("./llm_score.mjs");
const { nextContext } = await import("../../docs/js/vss-composer.js");
const require = createRequire(import.meta.url);
globalThis.SOPKit = K;
const NeuralKit = require("../../docs/js/neural.js");
const T = await import(pathToFileURL(path.join(HERE, "../laptop/node_modules/@huggingface/transformers/dist/transformers.node.mjs")).href);
T.env.allowLocalModels = true; T.env.localModelPath = path.join(ROOT, "docs/model/neural") + "/";
const dtype = NeuralKit.dtypeOf("ours/sop-bert");
const tokenizer = await T.AutoTokenizer.from_pretrained("sop-bert", { local_files_only: true });
const model = await T.AutoModel.from_pretrained("sop-bert", { device: "cpu", dtype, local_files_only: true });
try {
let calls = 0;
const counted = async (inp) => { calls++; return model(inp); };
counted.config = model.config;
const m = Object.assign({ device: "cpu", dtype }, NeuralKit.makeReader(T, tokenizer, counted));
await m.read("draw a circle");
const nsys = K.createSystem(), neural = NeuralKit.create(nsys.engine, () => { throw new Error("SOP-BERT called the Rules reader"); });
neural.setModels(m); neural.setStrategy("finetuned");

const rows = new Map();
for (const d of dirs) for (const f of readdirSync(d).filter((x) => x.endsWith(".jsonl") && /^(msg|batch|s)[_.]/.test(x)).sort())
  for (const l of readFileSync(path.join(d, f), "utf8").split("\n")) if (l.trim()) { const r = JSON.parse(l); if (!rows.has(r.id)) rows.set(r.id, r); }
const LVS = NC.levels(spec).filter((l) => l !== "all" && NC.reached(spec, l));
const browser = [], viaBert = []; let extraCallOk = true, extraCallSeen = 0;
for (const rec of recs) {
  const r = rows.get(rec.id), ctx = () => ({ names: (r.names || []).slice(), last: [] });
  const res = await neural.formalize(r.text, ctx(), { update: nextContext });
  const g = NC.gate(spec, res, NC.defaultLevel(spec));
  for (const n of res.nodes) if (n.type !== "mention") {
    const u = g.units.find((x) => x.unit === n.unit);
    browser.push({ id: rec.id, act: u.act, f: u.signals, conf: u.conf });
  }
  // the demo's path with the BERT cutter: the cutter's call, then the reader with those units (the cut head's output reused)
  const units = (await NeuralKit.cut(r.text)).map(({ c0, c1 }) => ({ c0, c1 }));
  const c0 = calls, res2 = await neural.formalize(r.text, ctx(), { update: nextContext, units, signals: true });
  if (calls - c0 !== (units.length ? 1 : 0)) extraCallOk = false;
  const g2 = NC.gate(spec, res2, NC.defaultLevel(spec));
  for (const n of res2.nodes) if (n.type !== "mention") viaBert.push(g2.units.find((x) => x.unit === n.unit).conf);
  // units from another cut (here: the whole message as one unit) with opts.signals: the cut head runs once more
  if (extraCallSeen < 5 && units.length) {
    await m.cut("draw a circle");   // the cut head's last output is now of another text
    const c1 = calls, res3 = await neural.formalize(r.text, ctx(), { update: nextContext, units: [{ c0: 0, c1: r.text.length }], signals: true });
    if (!(calls - c1 === 2 && res3.joint.cut && res3.joint.cutFrom === "cut head (extra call)")) extraCallOk = false;
    extraCallSeen++;
  }
}

// 3. compare
check(`same number of produced requests (scripts ${script.length}, browser code ${browser.length})`, script.length === browser.length);
const n = Math.min(NREQ, script.length, browser.length);
check(`at least ${NREQ} produced requests compared (${n} of ${recs.length} messages' ${script.length})`, n >= NREQ);
let actSame = 0, maxF = 0, worstF = "", maxC = 0, maxB = 0; const agree = Object.fromEntries(LVS.map((l) => [l, 0])), exec = Object.fromEntries(LVS.map((l) => [l, 0]));
for (let i = 0; i < n; i++) {
  const s = script[i], b = browser[i];
  if (s.id === b.id && s.act === b.act) actSame++;
  for (const k of Object.keys(s.f)) { const x = s.f[k], y = b.f ? b.f[k] : undefined; const d = x == null || y == null ? (x == y ? 0 : Infinity) : Math.abs(x - y); if (d > maxF) { maxF = d; worstF = `${s.id} #${s.j} ${k}: script ${x}, browser ${y}`; } }
  maxC = Math.max(maxC, Math.abs(s.conf - b.conf)); maxB = Math.max(maxB, Math.abs(s.conf - viaBert[i]));
  for (const l of LVS) { const t = NC.threshold(spec, l); if ((s.conf >= t) === (b.conf >= t)) agree[l]++; if (b.conf >= t) exec[l]++; }
}
check(`act equal on ${actSame} / ${n}`, actSame === n);
check(`max |signal difference| = ${maxF}`, maxF === 0, worstF);
check(`max |confidence difference| (scripts vs browser code) = ${maxC.toExponential(2)}`, maxC <= 1e-12);
for (const l of LVS) check(`decisions agree at ${l} (threshold ${NC.threshold(spec, l).toFixed(4)}): ${agree[l]} / ${n} (executed ${exec[l]})`, agree[l] === n);
check(`BERT cutter path (units given, cut head output reused): max |confidence difference| = ${maxB.toExponential(2)}, one model call per message`, maxB <= 1e-12 && extraCallOk);
check("units from another cut with opts.signals: the cut head runs once more and its output is read", extraCallOk && extraCallSeen > 0);
// the reasons: every held request gets at least one sentence
{ let held = 0, said = 0;
  for (const rec of recs.slice(0, 40)) { const r = rows.get(rec.id); const g = NC.gate(spec, await neural.formalize(r.text, { names: (r.names || []).slice(), last: [] }, { update: nextContext }), NC.defaultLevel(spec)); for (const u of g.held) { held++; if (u.reasons.length && u.reasons.every((x) => x.text && !/undefined|NaN|\[object/.test(x.text))) said++; } }
  check(`every request not executed has its reasons in words (${said} / ${held})`, held > 0 && said === held); }
console.log(`model: docs/model/neural/sop-bert (versions.json ${JSON.parse(readFileSync(path.join(ROOT, "docs/model/versions.json"), "utf8")).files["neural/sop-bert"]}); confidence: ${path.relative(ROOT, SPEC_PATH)}`);
} finally {
  await model.dispose();
}
console.log(fails ? `FAIL (${fails})` : "PASS");
process.exitCode = fails ? 1 : 0;
