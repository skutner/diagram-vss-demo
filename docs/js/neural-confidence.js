// neural-confidence.js: the SOP-BERT fitted confidence of one produced request, computed in the browser from the head logits of the
// model's own calls (no extra model call), the gate that executes a request only when its confidence clears the threshold of a level, and
// the plain-words reasons of a request below it. Browser-ready ES module, no imports (node imports it as is: the tests).
//
// The model is docs/model/confidence/sop-bert.json (format of training/sketch/precision_thresholds_bert.json; PRECISION_BERT.md): 24 named
// signals, each turned into a percentile of its calibration distribution (tables), a weight each, an intercept;
// confidence = 1 / (1 + exp(-(intercept + sum weight * percentile))). Its levels_out_of_fold hold the threshold per level: "cost" (the
// threshold that maximises the cost score, one confident mistake = 10 right answers; the default when the file has it), "95", "97", "99"
// (null: not reached). A refit changes the file only.
//
// The signals (signals() below) are training/sketch/precision_bert_collect.mjs `features`, the same code over the same numbers: the act
// head and the class heads from the request's row of seq_logits, the word tags from token_logits (first word piece of each word), the cut
// head (cut_logits) over the whole message, the word pieces. docs/js/neural.js formalizeJoint hands them over in result.joint (the reads
// with their .logits, the cut head's probabilities per word). Every signal is rounded to 1e-6 as the collect script records it, so the
// confidence is the scripts' value exactly (training/sketch/test_neural_confidence.mjs checks it).
// The confidence was fitted on requests cut by SOP-BERT's own cut head (the BERT cutter). With another cut (Rules, VSS) the cut signals are
// read from the cut head at that cut's boundaries (neural.js runs the cut head once for it); that case was not part of the fitting.
//
// Reasons (why a request is below the threshold), as in docs/js/vss-confidence.js: each feature's pull = weight * (typical - percentile),
// typical = the feature's mean percentile on the calibration requests (0.5 for a continuous signal; the share of 1s for a binary one; a
// missing value counts 1). The features are grouped by what they mean to the person (the action, the values, who a role is, the names,
// the cut, the words); the groups are sorted by their summed pull and the first ones are said: every group with a pull of at least
// REASON_MIN, at most REASON_MAX, and always the first. These two numbers only choose how many sentences the reply shows.
export const REASON_MIN = 0.1, REASON_MAX = 3;
export const FILE = "confidence/sop-bert.json";

/* ---------------------------------------------------------------- signals (precision_bert_collect.mjs features) */
const softmax = (a) => { const mx = Math.max(...a), e = a.map((x) => Math.exp(x - mx)), z = e.reduce((x, y) => x + y, 0); return e.map((x) => x / z); };
const argmax = (a) => { let b = 0; a.forEach((x, i) => { if (x > a[b]) b = i; }); return b; };
const top2 = (p) => { const s = p.slice().sort((x, y) => y - x); return [s[0], s[1] ?? 0]; };
const WORD_RE = /[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu;
const wordsOf = (text) => [...String(text).matchAll(WORD_RE)].map((x) => ({ w: x[0], start: x.index, end: x.index + x[0].length }));

/** the signals of the request analyses[si] of a neural.js formalizeJoint result -> {f: {signal: number | null}, act, detail} or null
 *  (not a produced request, or the head logits are not there). detail: what the reasons quote (which act came second, which key, which
 *  words); it does not enter the confidence. */
export function signals(result, si) {
  const J = result && result.joint, a = result && result.analyses && result.analyses[si];
  if (!J || !a || !a.span || a.kind.value === "none") return null;
  const R = J.reads[si], L = R && R.logits, RD = J.reader;
  if (!L || !RD) return null;
  const nA = RD.acts.length, offs = []; { let o = nA; for (const [, vals] of RD.classes) { offs.push(o); o += vals.length; } }
  const clsIdx = Object.fromEntries(RD.classes.map(([k], i) => [k, i]));
  const row = L.seq, headOf = (key) => row.slice(offs[clsIdx[key]], offs[clsIdx[key]] + RD.classes[clsIdx[key]][1].length);
  const actL = row.slice(0, nA), actP = softmax(actL);
  const act = a.act ? a.act.value : a.kind.value, ai = RD.acts.indexOf(act), keys = RD.act_keys[act] || [];
  const f = {}, detail = { act, src: a.src };
  // a value in words for the reasons: a name, or the shape a {ref} points to (a wire of this message: its name, else "the new <shape>")
  const show = (v) => { if (v == null) return ""; if (Array.isArray(v)) return v.map(show).filter(Boolean).join(", ");
    if (typeof v === "object" && v.ref) { const n = (result.nodes || []).find((x) => x.id === v.ref), g = n && n.args; return g ? (g.name != null ? String(g.name) : g.shape ? `the new ${g.shape}` : "a shape made just before") : "a shape made just before"; }
    return String(v); };
  const [t1, t2] = top2(actP);
  f.act_p = actP[ai]; f.act_margin = t1 - t2;
  { let H = 0; for (const p of actP) if (p > 0) H -= p * Math.log(p); f.act_negent = 1 - H / Math.log(nA); }
  { const order = actP.map((p, i) => [p, i]).sort((x, y) => y[0] - x[0]); detail.second = RD.acts[order[0][1] === ai ? order[1][1] : order[0][1]]; }
  const ws = wordsOf(a.src), tagP = ws.map((w, i) => (L.tok[i] ? softmax(L.tok[i]) : null));
  const wordsOfSpan = (s) => ws.map((w, i) => i).filter((i) => ws[i].start >= s.start && ws[i].end <= s.end);
  const vp = [], vm = [], np = [], fp = [], fm = [], tp = [], tm = [], dp = [], dm = [];
  const low = { val: null, none: null, fill: null, tag: null, desc: null }, lower = (slot, p, x) => { if (!low[slot] || p < low[slot].p) low[slot] = Object.assign({ p }, x); };
  let ctx = 0, nRoles = 0; const drawn = [];
  const v2 = RD.output_contract === "diagram-reader-v2";   // output contract (docs/js/neural.js V2): a text key's state head text:<key> is one more value head
  for (const k of keys) {
    const r = a.keys[k];
    // the value head of this key: its class head, or the head for a value the request does not write (implied:<key>, only in a model built with it), or (v2)
    // the state of a text key (text:<key>: absent counts as none, empty or written as a value; a written text's words also count in the tags below), read the same way
    const vk = clsIdx[k] != null ? k : clsIdx["implied:" + k] != null ? "implied:" + k : v2 && clsIdx["text:" + k] != null ? "text:" + k : null, cls = vk ? headOf(vk) : null;
    if (cls) {
      const pr = softmax(cls), bi = argmax(pr), [x1, x2] = top2(pr);
      if (bi === 0) { np.push(pr[0]); lower("none", pr[0], { key: k }); } else { vp.push(pr[bi]); vm.push(x1 - x2); lower("val", pr[bi], { key: k, value: RD.classes[clsIdx[vk]][1][bi] }); }
    }
    const fk = "fill:" + k;
    let fl = null;
    if (clsIdx[fk] != null) { fl = headOf(fk); const pr = softmax(fl), bi = argmax(pr), [x1, x2] = top2(pr); fp.push(pr[bi]); fm.push(x1 - x2); lower("fill", pr[bi], { key: k, fill: RD.classes[clsIdx[fk]][1][bi], value: r ? show(r.value) : "" }); }
    if (!r || r.value == null) continue;
    nRoles++;
    if (clsIdx[k] != null || r.implied) { /* a value head: in the minimum of the probabilities only (a number read from tags with an implied head beside it goes on to the tags) */ }
    else if (r.drawing) drawn.push(k);   // answered by the second read (arm M4): its own signals below
    else if (r.fill === "context") { ctx++; (detail.ctx || (detail.ctx = [])).push({ key: k, value: show(r.value) }); }
    else if (r.fill === "description") {
      for (const k2 of (r.descPre === "desc2:" ? RD.desc2_keys : RD.desc_keys) || []) { const dl = headOf((r.descPre || "desc:") + k2), pr = softmax(dl), bi = argmax(pr); if (bi !== 0 && r.span.includes(k2 + "=")) { dp.push(pr[bi]); const [x1, x2] = top2(pr); dm.push(x1 - x2); lower("desc", pr[bi], { key: k, desc: r.span }); } }
    } else {
      const spans = (R.spans || {})[k] || [];
      for (const s of spans) for (const i of wordsOfSpan(s)) if (tagP[i]) { const bi = argmax(tagP[i]), [x1, x2] = top2(tagP[i]); tp.push(tagP[i][bi]); tm.push(x1 - x2); lower("tag", tagP[i][bi], { key: k, word: ws[i].w }); }
    }
  }
  const mn = (a2) => (a2.length ? Math.min(...a2) : null);
  /* the second read (docs/js/neural.js, arm M4): the tags on the drawing's names that answered a role, their lowest probability and margin; how many
     roles it answered and was asked for; how many lines of the drawing its cap left out. Every request of a reading that had the drawing carries these
     keys (null / 0 when the request had no second read), so that a fit can read them (training/neural/calibrate_modernbert.mjs DRAW_NAMES); a model or a
     caller without the drawing gets none of them. */
  if (J.drawing) {
    const D = a.drawing && a.drawing.read && a.drawing.read.logits ? a.drawing : null, dp2 = [], dm2 = [];
    if (D) { const dws = wordsOf(D.text);
      for (const k of drawn) for (const s of (D.found[k] && D.found[k].spans) || []) dws.forEach((w, i) => {
        if (w.start < s.start || w.end > s.end || !D.read.logits.tok[i]) return;
        const q = softmax(D.read.logits.tok[i]), [x1, x2] = top2(q); dp2.push(q[argmax(q)]); dm2.push(x1 - x2); lower("draw", q[argmax(q)], { key: k, word: w.w });
      }); }
    f.draw_tag_p_min = mn(dp2); f.draw_tag_margin_min = mn(dm2); f.draw_roles = drawn.length; f.draw_roles_asked = D ? D.keys.length : 0; f.draw_lines_cut = D ? D.dropped : 0;
  }
  f.val_p_min = mn(vp); f.val_margin_min = mn(vm); f.none_p_min = mn(np);
  f.fill_p_min = mn(fp); f.fill_margin_min = mn(fm); f.ctx_fill = ctx;
  f.tag_p_min = mn(tp); f.tag_margin_min = mn(tm);
  f.desc_p_min = mn(dp); f.desc_margin_min = mn(dm);
  { const ps = tagP.filter(Boolean).map((q) => Math.max(...q)); f.tag_all_min = mn(ps);
    let wi = -1; tagP.forEach((q, i) => { if (q && (wi < 0 || Math.max(...q) < Math.max(...tagP[wi]))) wi = i; }); if (wi >= 0) detail.unsureWord = ws[wi].w; }
  { let stray = 0; const sw = []; tagP.forEach((q, i) => { if (!q) return; const t = RD.tags[argmax(q)]; if (t !== "O" && !keys.includes(t.slice(2))) { stray++; sw.push(ws[i].w); } }); f.tag_stray = stray; detail.stray = sw; }
  // the cut head, at the request's characters in the whole message (null when the cut head's output is not there)
  const mw = J.cut;
  if (mw) {
    const c0 = a.span[0], c1 = a.span[1];
    const i0 = mw.findIndex((x) => x.start >= c0), iEnd = mw.reduce((acc, x, i) => (x.end <= c1 ? i : acc), -1);
    f.cut_start = i0 >= 0 ? mw[i0].pB : null;
    f.cut_end = iEnd >= 0 && iEnd + 1 < mw.length ? 1 - mw[iEnd + 1].pI : 1;
    f.cut_inner_min = i0 >= 0 && iEnd > i0 ? Math.min(...mw.slice(i0 + 1, iEnd + 1).map((x) => x.pI)) : null;
  } else { f.cut_start = null; f.cut_end = null; f.cut_inner_min = null; detail.noCut = true; }
  // the words
  let pcs = 0, unk = 0, split = 0; const unkW = [], splitW = [];
  (L.pieces || []).forEach((pc, i) => { pcs += pc.length; const u = pc.filter((x) => x === J.unk).length; unk += u; if (u) unkW.push(ws[i].w); if (pc.length > 1) { split++; splitW.push(ws[i].w); } });
  f.unk_share = pcs ? unk / pcs : 0; f.split_share = ws.length ? split / ws.length : 0; f.n_words = ws.length; f.n_roles = nRoles; f.n_units = result.analyses.length;
  for (const k of Object.keys(f)) if (f[k] != null) f[k] = Math.round(f[k] * 1e6) / 1e6;
  Object.assign(detail, { low, unkW, splitW });
  return { f, act, detail };
}

/* ---------------------------------------------------------------- confidence (precision_confidence_bert.mjs) */
/** the percentile of a raw signal x in its calibration table (precision_confidence_bert.mjs percentile, the same code) */
export function percentile(tab, x) {
  if (x == null) return 1;
  const y = x * tab.sign;
  if (tab.binary) return tab.sign > 0 ? (y > 0 ? 1 : 0) : (y > -0.5 ? 1 : 0);
  const u = tab.values, below = tab.below, n = tab.n;
  let lo = 0, hi = u.length; while (lo < hi) { const m = (lo + hi) >> 1; if (u[m] < y) lo = m + 1; else hi = m; }
  const nb = lo < u.length ? below[lo] : n, eq = lo < u.length && u[lo] === y ? (lo + 1 < u.length ? below[lo + 1] : n) - below[lo] : 0;
  return n ? (nb + eq / 2) / n : 0.5;
}
const rawOf = (spec, name, f, act) => (name === "act_prior" ? (spec.act_prior[act] ?? spec.act_prior_default) : (f || {})[name]);
/** the fitted confidence in (0, 1) of a request with these signals, read as this act (precision_confidence_bert.mjs bertConfidence) */
export function confidence(spec, f, act) {
  let z = spec.intercept;
  for (const s of spec.features) z += s.weight * percentile(spec.tables[s.name], rawOf(spec, s.name, f, act));
  return 1 / (1 + Math.exp(-z));
}

/* ---------------------------------------------------------------- levels and thresholds */
const LV = (spec) => spec.levels_out_of_fold || {};
/** the cost levels (owner, 2026-11-02 22:12; 1 and 2 added 2026-11-03 09:30): one confident mistake counts as 1 ("boldest"), 2 ("very
 *  bold"), 5 ("bolder"), 10 (the default) or 20 ("more careful") right answers */
export const COST_LEVELS = ["cost1", "cost2", "cost5", "cost", "cost20"];
/** the levels of the file in the order the setting shows them: the cost levels (1, 2, 5, 10, 20), then the precision levels ascending; plus "all" */
export function levels(spec) {
  const ks = Object.keys(LV(spec));
  return COST_LEVELS.filter((k) => ks.includes(k)).concat(ks.filter((k) => !COST_LEVELS.includes(k)).sort((a, b) => Number(a) - Number(b))).concat(["all"]);
}
/** a level with a finite threshold */
export const reached = (spec, l) => { const x = LV(spec)[l]; return !!x && Number.isFinite(x.threshold); };
/** the default level: "cost" when the file has it, else its operating_level, else the first reached level */
export function defaultLevel(spec) {
  if (!spec) return "cost";
  if (reached(spec, "cost")) return "cost";
  if (reached(spec, String(spec.operating_level))) return String(spec.operating_level);
  return levels(spec).find((l) => reached(spec, l)) || "all";
}
/** the level the gate uses: "all" stays; a reached level stays; a precision level not reached -> the highest reached precision level
 *  below it; else null (every request is asked) */
export function effectiveLevel(spec, level) {
  if (String(level) === "all") return "all";
  if (reached(spec, String(level))) return String(level);
  if (COST_LEVELS.includes(String(level))) return reached(spec, "cost") ? "cost" : null;   // a file without that cost level: the default
  const want = Number(level);
  const below = Object.keys(LV(spec)).filter((k) => k !== "cost" && reached(spec, k) && Number(k) < want).sort((a, b) => Number(a) - Number(b));
  return below.length ? below[below.length - 1] : null;
}
export function threshold(spec, level) {
  const e = effectiveLevel(spec, level);
  if (e === "all") return -Infinity;
  return e === null ? Infinity : LV(spec)[e].threshold;
}
/** a level in words */
export const label = (l) => (l === "all" ? "execute all" : l === "cost" ? "safety threshold" : l === "cost1" ? "boldest" : l === "cost2" ? "very bold" : l === "cost5" ? "bolder" : l === "cost20" ? "more careful" : `${l}% precision`);

/* ---------------------------------------------------------------- reasons */
const heldN = (spec) => { const L = Object.values(LV(spec)).find((x) => x && x.heldout_produced); return L ? L.heldout_produced : spec.heldout && spec.heldout.produced ? spec.heldout.produced : Math.max(...Object.values(spec.tables).map((t) => t.n)); };
/** the typical (mean calibration) percentile of a feature (see the head of the file) */
export function typical(spec, name) {
  const t = spec.tables[name], N = Math.max(heldN(spec), t.n);
  let mean = 0.5;
  if (t.binary) {
    const ones = t.values.reduce((a, y, i) => a + ((t.sign > 0 ? y > 0 : y > -0.5) ? (i + 1 < t.values.length ? t.below[i + 1] : t.n) - t.below[i] : 0), 0);
    mean = t.n ? ones / t.n : 0.5;
  }
  return (mean * t.n + (N - t.n)) / N;
}
/** every feature's percentile and pull for one request -> [{name, weight, raw, p, typical, pull}] */
export function pulls(spec, f, act) {
  return spec.features.map((s) => { const raw = rawOf(spec, s.name, f, act), p = percentile(spec.tables[s.name], raw), ty = typical(spec, s.name);
    return { name: s.name, weight: s.weight, raw, p, typical: ty, pull: s.weight * (ty - p) }; });
}
const GROUP = { act_p: "act", act_margin: "act", act_negent: "act", act_prior: "prior", val_p_min: "value", val_margin_min: "value", none_p_min: "value",
  fill_p_min: "fill", fill_margin_min: "fill", ctx_fill: "fill", desc_p_min: "fill", desc_margin_min: "fill",
  tag_p_min: "tags", tag_margin_min: "tags", tag_all_min: "tags", tag_stray: "tags", cut_start: "cut", cut_end: "cut", cut_inner_min: "cut", n_units: "cut",
  unk_share: "words", split_share: "words", n_words: "size", n_roles: "size" };
const q = (w) => `‘${w}’`, quote = (ws) => ws.slice(0, 4).map(q).join(", ") + (ws.length > 4 ? ` and ${ws.length - 4} more` : "");
const ACTW = { fact: "a statement about a shape", rule: "a default for new shapes", none: "not a request" };
const actWord = (a) => ACTW[a] || q(a);
const ROLE = { target: "the shape it is about", from: "where the connection starts", to: "where the connection ends", anchor: "the shape it is placed against" };
const roleWord = (k) => ROLE[k] || `the ${k}`;
const keyWord = (k) => String(k).replace(/([A-Z])/g, " $1").toLowerCase();
// the pronoun quoted in "not sure which shape 'it' means": the sentence only, never a decision
const PRON = /\b(it|its|them|they|this|that|these|those|her|him|his)\b/i;
const pronoun = (src) => { const m = String(src).match(PRON); return m ? q(m[1]) : null; };
function sentence(group, sig, spec, parts) {
  const d = sig.detail, by = Object.fromEntries(parts.map((x) => [x.name, x])), big = (...ns) => ns.filter((n) => by[n]).sort((x, y) => by[y].pull - by[x].pull)[0];
  const few = (n) => by[n] && by[n].weight * spec.tables[n].sign > 0;   // a positive pull of a "more = surer" signal: it was low
  switch (group) {
    case "act": return d.act === "none" ? "not sure whether this is a request" : `not sure which action this is (${actWord(d.act)}, or ${actWord(d.second)})`;
    case "prior": { const r = spec.act_prior[d.act] ?? spec.act_prior_default; return `requests read as ${actWord(d.act)} are often read wrong (right about ${Math.round(r * 100)}% of the time on the calibration messages)`; }
    case "value": {
      const L = d.low;
      if (big("none_p_min", "val_p_min", "val_margin_min") === "none_p_min" && L.none) return `not sure whether it gives a ${keyWord(L.none.key)}`;
      return L.val ? `not sure of the ${keyWord(L.val.key)} (${q(L.val.value)})` : "not sure of a value";
    }
    case "fill": {
      const L = d.low;
      if (big("desc_p_min", "desc_margin_min", "fill_p_min", "fill_margin_min", "ctx_fill").startsWith("desc") && L.desc) return `not sure which shape the description (${L.desc.desc}) means`;
      if ((d.ctx && d.ctx.length && big("ctx_fill", "fill_p_min", "fill_margin_min") === "ctx_fill") || (L.fill && L.fill.fill === "context")) {
        const c = (d.ctx && d.ctx[0]) || L.fill, v = c.value, pr = pronoun(d.src);
        return `${pr ? `not sure which shape ${pr} means` : "not sure which shape this is about"}${v ? ` (taken from the conversation: ${v})` : ""}`;
      }
      if (L.fill && L.fill.fill === "none") return `not sure whether it names ${roleWord(L.fill.key)}`;
      if (L.fill && L.fill.fill === "description") return "not sure which shape the description means";
      return L.fill ? `not sure about ${roleWord(L.fill.key)}${L.fill.value ? ` (read as ${q(L.fill.value)})` : ""}` : "not sure who a role is";
    }
    case "tags": {
      const b = big("tag_stray", "tag_p_min", "tag_margin_min", "tag_all_min");
      if (b === "tag_stray" && d.stray.length) return `the word${d.stray.length > 1 ? "s" : ""} ${quote(d.stray)} look${d.stray.length > 1 ? "" : "s"} like a name this action does not take`;
      if (b !== "tag_all_min" && d.low.tag) return `not sure which words name ${roleWord(d.low.tag.key)} (${q(d.low.tag.word)})`;
      return d.unsureWord ? `not sure how to read the word ${q(d.unsureWord)}` : "not sure how to read some words";
    }
    case "cut": {
      if (d.noCut) return "where this request starts and ends could not be checked (no cut head output)";
      const b = big("cut_start", "cut_end", "cut_inner_min", "n_units");
      if (b === "n_units") return `not sure where the requests of this long message begin and end (${sig.f.n_units} requests)`;
      return b === "cut_start" ? "not sure where this request starts" : b === "cut_end" ? "not sure where this request ends" : "not sure this is one request and not two";
    }
    case "words": return d.unkW.length ? `the word${d.unkW.length > 1 ? "s" : ""} ${quote(d.unkW)} ${d.unkW.length > 1 ? "are" : "is"} unknown to the model` : d.splitW.length ? `the model knows ${quote(d.splitW)} only in pieces` : "some words are unusual for the model";
    case "size": {
      const b = big("n_roles", "n_words");
      if (b === "n_roles") return few("n_roles") ? (sig.f.n_roles ? `little was read from it besides the action (${sig.f.n_roles} part${sig.f.n_roles === 1 ? "" : "s"})` : "nothing was read from it besides the action") : `many parts were read from it (${sig.f.n_roles})`;
      return few("n_words") ? `the request is very short (${sig.f.n_words} words)` : `the request is long (${sig.f.n_words} words)`;
    }
  }
  return group;
}
/** the plain-words reasons of one request's confidence -> [{group, pull, text}] */
export function reasons(spec, sig) {
  const ps = pulls(spec, sig.f, sig.act), sum = new Map(), parts = new Map();
  for (const x of ps) { const g = GROUP[x.name] || x.name; sum.set(g, (sum.get(g) || 0) + x.pull); (parts.get(g) || parts.set(g, []).get(g)).push(x); }
  const order = [...sum.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return order.filter(([, v], i) => i === 0 || (i < REASON_MAX && v >= REASON_MIN)).map(([g, v]) => ({ group: g, pull: v, text: sentence(g, sig, spec, parts.get(g)) }));
}

/* ---------------------------------------------------------------- structural holds (output contract diagram-reader-v2) */
const BLOCK_TEXT = {
  "unresolved-reference": (k) => `it names ${roleWord(k)} with several shapes, descriptions or references together, which this reader cannot write down exactly; say them one at a time`,
  "text-state": (k) => `the ${keyWord(k)} text could not be read consistently (whether there is one, and which words it is)`,
  "malformed-output": (k) => (k === "output_contract" ? "the model's output does not follow an output contract this page knows" : `the model's output for the ${keyWord(k)} does not follow its output contract`),
};
/** the reasons of a request held by its own reading (docs/js/neural.js: analysis.blocked, analysis.block_reasons [{kind, key, source_span}]) */
export const blockReasons = (unit) => (unit.block_reasons || []).map((b) => ({ group: b.kind, pull: 0, kind: b.kind, key: b.key,
  text: (BLOCK_TEXT[b.kind] || ((k) => `it cannot be read completely (${b.kind}: ${k})`))(b.key) }));

/* ---------------------------------------------------------------- the gate */
/** the gate over one neural.js formalizeJoint result, the shape of vss-confidence.js gate (docs/js/ui.js GATES): every request that gave
 *  wires gets its confidence; it executes when the confidence >= the level's threshold, and only when every request of the message it
 *  refers to ({ref} to a wire of another request) executes. spec null (the file could not be loaded): every request is asked (level "all":
 *  executed). A request held by its own reading (unit.blocked: output contract diagram-reader-v2) never executes, at any level, and is marked
 *  blocked (docs/js/ui.js offers no "Do it anyway" for it); so is every request that uses what it would have made (reason "depends").
 *  -> {level, effective, label, threshold, cutFrom, units: [{index, unit, src, act, conf, signals, execute, nodes, reasons,
 *  dependsOn, blocked (only when true)}], executed (wires, message order), held} */
export function gate(spec, result, level) {
  level = String(level == null ? defaultLevel(spec) : level);
  const t = level === "all" ? -Infinity : spec ? threshold(spec, level) : Infinity, byUnit = new Map(), owner = new Map();
  for (const n of result.nodes || []) {
    const u = n.unit; if (!u) continue;
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u).push(n); owner.set(n.id, u);
  }
  const refsOf = (v) => (v && typeof v === "object" && !Array.isArray(v) && typeof v.ref === "string" ? [v.ref] : Array.isArray(v) ? v.flatMap(refsOf) : []);
  const G = [], gu = new Map();
  for (const [u, nodes] of byUnit) {
    const index = (result.analyses || []).indexOf(u), sig = signals(result, index);
    const conf = spec && sig && !sig.detail.noCut ? confidence(spec, sig.f, sig.act) : NaN;
    const sure = t === -Infinity || conf >= t;
    const why = sure ? [] : !spec ? [{ group: "model", pull: 0, text: "the confidence model could not be loaded" }]
      : !sig ? [{ group: "signals", pull: 0, text: "the model's head outputs were not available, so its confidence is not known" }]
      : sig.detail.noCut ? [{ group: "cut", pull: 0, text: "the cut head's output was not available, so its confidence is not known" }]
      : reasons(spec, sig);
    const g = { index, unit: u, src: u.src, act: sig ? sig.act : null, conf, signals: sig ? sig.f : null, sure, execute: sure, nodes, reasons: why, dependsOn: [] };
    for (const n of nodes) for (const r of Object.values(n.args || {}).flatMap(refsOf)) { const o = owner.get(r); if (o && o !== u && !g.dependsOn.includes(o)) g.dependsOn.push(o); }
    G.push(g); gu.set(u, g);
  }
  for (const g of G) if (g.unit.blocked) Object.assign(g, { sure: false, execute: false, blocked: true, reasons: blockReasons(g.unit) });
  for (const g of G) {      // message order: a request's dependencies come before it
    const off = g.dependsOn.map((o) => gu.get(o)).filter((d) => d && !d.execute), stuck = off.filter((d) => d.blocked);   // here blocked is only structural (transitive)
    if (!g.blocked && stuck.length) Object.assign(g, { sure: false, execute: false, blocked: true,
      reasons: stuck.map((d) => ({ group: "depends", pull: 0, kind: "depends", text: `it uses what “${d.src}” would have made, which cannot be done` })) });
    else if (g.execute && off.length) { g.execute = false; g.reasons = off.map((d) => ({ group: "depends", pull: 0, text: `it uses what “${d.src}” would have made, which was not done` })); }
  }
  const run = new Set(G.filter((g) => g.execute).flatMap((g) => g.nodes));
  const effective = level === "all" ? "all" : spec ? effectiveLevel(spec, level) : null;
  return { level, effective, label: label(effective || level), threshold: t, cutFrom: result.joint ? result.joint.cutFrom : null, units: G,
    executed: (result.nodes || []).filter((n) => !n.unit || run.has(n)), held: G.filter((g) => !g.execute) };
}

/* ---------------------------------------------------------------- loading (browser) */
const loaded = new Map();
/** fetch and parse the model file once per URL (neural.js NeuralKit.confidenceUrl(): docs/model/confidence/sop-bert.json?v=<version>) */
export function load(url) {
  if (!loaded.has(url)) loaded.set(url, fetch(url, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); })
    .catch((e) => { loaded.delete(url); throw e; }));
  return loaded.get(url);
}
