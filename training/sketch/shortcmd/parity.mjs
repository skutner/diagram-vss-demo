// parity.mjs: the harness against the browser, on the 10 probes (VSSBERT_SHORT_COMMANDS_PLAN.md section 5.3).
//   node training/sketch/shortcmd/parity.mjs PROBE_ROWS.json BROWSER.json
// PROBE_ROWS.json: the output of `apply_gates.mjs --set probes ... --view start-diagram` (rows of the four readers at `all` and `cost`; this script
// reads the `cost` rows: the level the page runs at). BROWSER.json: the capture the coordinator writes to $EV/browser_probes.json after sending each
// probe to the live page and reading the message details (the "details" button under the reply). THE CAPTURE FORMAT:
//   {
//     "format": "browser_probes/1",
//     "page": "http://127.0.0.1:8765/",                  (free text, not compared)
//     "probes": {
//       "probe-01": {                                     one entry per probe id of probes/msg_01.jsonl (all 10 are required)
//         "corrected": "draw a circle",                   the text every reader read: the spelling line of the details ("Every reader read the
//                                                         corrected text: ...") or, when nothing was corrected, the message as typed
//         "readers": {                                    all four are required: "VSS-BERT", "VSS", "SOP-BERT", "Rules"
//           "VSS-BERT": { "requests": [                   one entry per request of the reader's reading, in the order the details list them
//               { "unit": "draw a circle",                the unit text: the quoted text of the details' unit list (<span class="src">); for
//                                                         "Rules" the page lists no units: write null (the unit is then not compared)
//                 "wires": ["@w1 command action=create shape=circle"],
//                                                         the SOP Lang lines of this request: the <pre class="sop"> lines of the reader's section
//                                                         ("@w1 command action=create shape=circle"); the executed ones are in the first block,
//                                                         the held ones in the block under "# not executed (not sure)"; put each request's own
//                                                         lines here (a request of the probes has one wire); a "# ..." line is ignored
//                 "confidence": 0.938,                    the number after "confidence" in the unit's line of the reader's gate list (3 decimals),
//                                                         null when the line shows none (the Rules have no confidence)
//                 "executed": false } ] },                true for "executed", false for "not executed: ..."
//           "VSS": {...}, "SOP-BERT": {...}, "Rules": {...} } },
//       "probe-02": {...} } }
// The probes hold no pronoun and one request each, so the order and the one-wire-per-request form are exact for them.
// Parity holds, for every probe and reader, when: the corrected text is equal; the number of requests and each request's unit text (trimmed) are equal
// (not for a null unit); the reading is equal (the wires parsed with logic.js parse, compared with bench-canon.js canon, as the harness's `got`);
// executed or held is equal; and |confidence difference| <= 0.002 (plus 1e-9 for the float arithmetic: 0.951 - 0.949 is more than 0.002 in floats).
// The page shows 3 decimals; both numbers are compared as written (the harness's exact value against the page's rounded one). A confidence that is
// null on one side only is a difference. The decision (executed) is compared on its own, so a confidence within tolerance that falls on the other side
// of the threshold shows as a different decision.
// Exit codes: 0 parity holds; 1 there are differences (printed); 2 usage; 4 the capture or the rows are unusable (missing probe or reader, a field that
// is missing or of the wrong type, unreadable JSON, a probe the rows do not have): a tool failure, never a parity result.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const REPO = new URL("../../../", import.meta.url).pathname;
export const READERS = ["VSS-BERT", "VSS", "SOP-BERT", "Rules"];
const EXECUTED_KINDS = ["done_right", "executed_wrong", "extra_executed"];
export const CONF_TOLERANCE = 0.002, FLOAT_EPS = 1e-9;   // the plan's 5.3: three decimals shown; a difference above 0.002 is a difference
const fail = (msg, code = 4) => { const e = new Error(msg); e.exitCode = code; return e; };

let K = null, canon = null;
async function libs() {
  if (!K) { K = require(REPO + "docs/js/logic.js"); ({ canon } = await import(REPO + "docs/js/bench-canon.js")); }
  return { K, canon };
}

/** the harness's requests of one probe and reader at `cost`, as the page lists them: the produced rows of the reader grouped by unit (span), in message order
 *  -> [{unit, wires: [{pa, got}], conf, execute}] */
export function harnessRequests(rows, id, reader) {
  const mine = rows.filter((r) => r.id === id && r.reader === reader && r.level === "cost" && r.prod_index !== null && r.prod_index !== undefined).sort((a, b) => a.prod_index - b.prod_index);
  const by = new Map();
  for (const r of mine) { const k = r.span.join(","); if (!by.has(k)) by.set(k, { span: r.span, unit: r.unit_text, wires: [], conf: r.conf, execute: EXECUTED_KINDS.includes(r.kind) }); by.get(k).wires.push({ pa: r.pa, got: r.got }); }
  return [...by.values()].sort((a, b) => a.span[0] - b.span[0]);
}

/** validate the capture's shape; every problem is a tool failure (exit 4) */
export function checkCapture(cap, probeIds) {
  if (!cap || typeof cap !== "object" || typeof cap.probes !== "object" || cap.probes === null) throw fail("capture: no `probes` object");
  const problems = [];
  for (const id of probeIds) {
    const p = cap.probes[id];
    if (!p) { problems.push(`missing probe ${id}`); continue; }
    if (typeof p.corrected !== "string") problems.push(`${id}: no \`corrected\` text`);
    if (!p.readers || typeof p.readers !== "object") { problems.push(`${id}: no \`readers\``); continue; }
    for (const rd of READERS) {
      const x = p.readers[rd];
      if (!x) { problems.push(`${id}: missing reader ${rd}`); continue; }
      if (!Array.isArray(x.requests)) { problems.push(`${id}/${rd}: no \`requests\` list`); continue; }
      x.requests.forEach((q, i) => {
        const at = `${id}/${rd}/request ${i + 1}`;
        if (!q || typeof q !== "object") { problems.push(`${at}: not an object`); return; }
        if (!(typeof q.unit === "string" || (q.unit === null && rd === "Rules"))) problems.push(`${at}: \`unit\` must be a string (null only for Rules)`);
        if (!Array.isArray(q.wires) || !q.wires.length || q.wires.some((w) => typeof w !== "string")) problems.push(`${at}: \`wires\` must be a non-empty list of SOP Lang lines`);
        if (!(q.confidence === null || (typeof q.confidence === "number" && Number.isFinite(q.confidence)))) problems.push(`${at}: \`confidence\` must be a number or null`);
        if (typeof q.executed !== "boolean") problems.push(`${at}: \`executed\` must be true or false`);
      });
    }
  }
  for (const id of Object.keys(cap.probes)) if (!probeIds.includes(id)) problems.push(`the capture has a probe the rows do not have: ${id}`);
  if (problems.length) throw fail("capture unusable:\n  " + problems.join("\n  "));
}

/** the wires of a request as the page shows them -> [{pa, got}] (the non-mention wires, canonical values as the harness's `got`) */
export async function readWires(lines) {
  const { K, canon } = await libs();
  const text = lines.join("\n").split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).join("\n");
  let nodes; try { nodes = K.parse(text); } catch (e) { throw fail(`a wire does not parse: ${e.message}`); }
  return nodes.filter((n) => n.type !== "mention").map((n) => ({ pa: `${n.type}:${n.args.action || n.args.ask || ""}`, got: canon(n, nodes) }));
}
const sameGot = (a, b) => { const ks = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => k !== "action" && k !== "ask"); return ks.every((k) => (a[k] ?? "∅") === (b[k] ?? "∅")); };
const show = (w) => `${w.pa} ${JSON.stringify(w.got)}`;

/** the differences of one probe: [] when parity holds. rows: all rows of the probes file; probe: the capture's entry */
export async function compareProbe(rows, id, probe) {
  const diffs = [], text = rows.find((r) => r.id === id).text;
  if (probe.corrected !== text) diffs.push(`${id}: corrected text differs: harness “${text}”, browser “${probe.corrected}”`);
  for (const rd of READERS) {
    const h = harnessRequests(rows, id, rd), b = probe.readers[rd].requests, at = `${id}/${rd}`;
    if (h.length !== b.length) { diffs.push(`${at}: ${h.length} request(s) in the harness, ${b.length} in the browser`); continue; }
    for (let i = 0; i < h.length; i++) {
      const q = b[i], hh = h[i], rq = `${at}${h.length > 1 ? `/${i + 1}` : ""}`;
      if (q.unit !== null && String(q.unit).trim() !== String(hh.unit).trim()) diffs.push(`${rq}: unit differs: harness “${hh.unit}”, browser “${q.unit}”`);
      const bw = await readWires(q.wires);
      if (bw.length !== hh.wires.length || bw.some((w, j) => w.pa !== hh.wires[j].pa || !sameGot(w.got, hh.wires[j].got))) diffs.push(`${rq}: reading differs: harness ${hh.wires.map(show).join(" + ")}, browser ${bw.map(show).join(" + ") || "nothing"}`);
      if (q.executed !== hh.execute) diffs.push(`${rq}: decision differs: harness ${hh.execute ? "executed" : "held"} (confidence ${hh.conf === null ? "none" : hh.conf.toFixed(4)}), browser ${q.executed ? "executed" : "held"} (confidence ${q.confidence === null ? "none" : q.confidence})`);
      if ((q.confidence === null) !== (hh.conf === null)) diffs.push(`${rq}: confidence ${hh.conf === null ? "none in the harness" : hh.conf.toFixed(4) + " in the harness"}, ${q.confidence === null ? "none" : q.confidence} in the browser`);
      else if (q.confidence !== null && Math.abs(q.confidence - hh.conf) > CONF_TOLERANCE + FLOAT_EPS) diffs.push(`${rq}: confidence differs by ${Math.abs(q.confidence - hh.conf).toFixed(4)}: harness ${hh.conf.toFixed(4)}, browser ${q.confidence}`);
    }
  }
  return diffs;
}

/** the whole check -> {differences: [string], probes: n, checked: n}; throws exitCode 4 for an unusable capture or rows */
/** the probe ids the check requires: the probes file's (a probe missing from the rows and the capture alike is still a failure) */
export function requiredProbeIds(file = new URL("./probes/msg_01.jsonl", import.meta.url).pathname) {
  try { return readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l).id); } catch (e) { throw fail(`probes file ${file}: ${e.message}`); }
}
export async function runParity(rowsJson, capture, ids = requiredProbeIds()) {
  const rows = Array.isArray(rowsJson) ? rowsJson : rowsJson && rowsJson.rows;
  if (!Array.isArray(rows) || !rows.length) throw fail("probe rows: no `rows`");
  const inRows = new Set(rows.map((r) => r.id)), bad = [...ids.filter((id) => !inRows.has(id)).map((id) => `the rows have no probe ${id}`), ...[...inRows].filter((id) => !ids.includes(id)).map((id) => `the rows have a probe the probes file does not: ${id}`)];
  if (bad.length) throw fail("probe rows unusable:\n  " + bad.join("\n  "));
  checkCapture(capture, ids);
  const differences = []; let checked = 0;
  for (const id of ids) { differences.push(...(await compareProbe(rows, id, capture.probes[id]))); checked += READERS.length; }
  return { differences, probes: ids.length, checked };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [rowsFile, capFile, ...rest] = process.argv.slice(2);
  if (!rowsFile || !capFile || rest.length) { console.error("usage: parity.mjs PROBE_ROWS.json BROWSER.json"); process.exit(2); }
  let code = 0;
  try {
    const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch (e) { throw fail(`${f}: ${e.message}`); } };
    const r = await runParity(read(rowsFile), read(capFile));
    if (r.differences.length) { console.log(`PARITY DIFFERS: ${r.differences.length} difference(s) over ${r.probes} probes x ${READERS.length} readers`); for (const d of r.differences) console.log("  " + d); code = 1; }
    else console.log(`PARITY HOLDS: ${r.probes} probes x ${READERS.length} readers (${r.checked} readings): corrected text, units, readings, decisions equal; confidences within ${CONF_TOLERANCE}`);
  } catch (e) { console.error(`parity: ${e.message}`); code = e.exitCode || 4; }
  process.exit(code);
}
