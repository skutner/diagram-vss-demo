// line_scores.mjs: the per-request confidence signals of a line-format output (QWEN3_FINETUNE_PLAN.md section 7, Q0.8), from the
// runtime's own token probabilities (llama.cpp / wllama `logprobs` with `top_logprobs: 2`, pre-sampling). Never a number the model writes.
//   tokensOfLines(content)   logprobs.content [{id, logprob, bytes, top_logprobs}] -> {text, tokens: [{id, b0, b1, lp, lp2}], eos} | {error}
//                            (a token whose bytes leave a UTF-8 character unfinished has no entry in llama.cpp; the entry after it carries
//                            the whole character: such tokens are matched by bytes, and a field whose bytes are covered by them still has
//                            their probability. An entry with no top_logprobs gets lp NaN. The end-of-turn token, if listed, has no bytes
//                            and is kept apart as `eos`.)
//   scoreLines(v, tk, raw)   per request of lines_reader.readOutput: fields [{name, mean, n}] (trigger, act, each key=value, end), and
//                            the signals: score_min (the shipped score: the minimum over fields of the mean token log-probability), act_lp,
//                            val_margin_min (smallest top-1 minus top-2 over the value tokens: act and key=value fields), trigger_lp,
//                            req_index, n_requests; `missing` when a field has no probability (such a request is never executed).
//   'end' is the decision to stop the request: the newline after its line, or for the last line the end-of-turn token.
const IM_END = 151645;
const utf8len = s => new TextEncoder().encode(s).length;
export function byteOffsets(s) {
  const off = new Array(s.length + 1); let b = 0;
  for (let i = 0; i < s.length; i++) {
    off[i] = b; const c = s.charCodeAt(i);
    if (c < 0x80) b += 1; else if (c < 0x800) b += 2; else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) { off[i + 1] = b; b += 4; i++; } else b += 3;
  }
  off[s.length] = b; return off;
}
export function tokensOfLines(content) {
  if (!Array.isArray(content)) return { error: 'the runtime returned no token probabilities' };
  const tokens = [], bytes = []; let b = 0, eos = null;
  for (const t of content) {
    const by = Array.isArray(t.bytes) ? t.bytes : null;
    const tops = Array.isArray(t.top_logprobs) ? t.top_logprobs : [];
    const lp = typeof t.logprob === 'number' && Number.isFinite(t.logprob) && tops.length ? t.logprob : NaN;
    const lp2 = tops.length >= 2 && Number.isFinite(tops[1].logprob) ? tops[1].logprob : null;
    if (t.id === IM_END && (!by || !by.length)) { eos = { id: t.id, lp, lp2 }; continue; }
    if (!by) return { error: 'a token without its bytes' };
    tokens.push({ id: t.id, b0: b, b1: b + by.length, lp, lp2 }); bytes.push(...by); b += by.length;
  }
  let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); } catch { return { error: 'the tokens do not decode as UTF-8' }; }
  return { text, tokens, eos };
}
const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
export function scoreLines(v, tk, raw) {
  const n = v.requests.length;
  if (tk.error || tk.text !== raw) return v.requests.map(() => ({ fields: [], missing: tk.error || 'the token text differs from the output text' }));
  const off = byteOffsets(raw);
  return v.requests.map((R, i) => {
    const fields = [], margins = [];
    const hit = ranges => { const bs = ranges.filter(([s, e]) => e > s).map(([s, e]) => [off[s], off[e]]); return tk.tokens.filter(t => bs.some(([b0, b1]) => t.b0 < b1 && t.b1 > b0)); };
    for (const f of R.fields) {
      const ts = hit(f.ranges);
      fields.push({ name: f.name, mean: ts.length && ts.every(t => Number.isFinite(t.lp)) ? mean(ts.map(t => t.lp)) : NaN, n: ts.length });
      if (f.name !== 'trigger') for (const t of ts) margins.push(t.lp2 == null ? NaN : t.lp - t.lp2);
    }
    // the end of the request: the newline after the line, or the end-of-turn token after the last line
    const last = i === n - 1 && R.end[1] === R.end[0];
    if (!last) { const ts = hit([R.end]); fields.push({ name: 'end', mean: ts.length && ts.every(t => Number.isFinite(t.lp)) ? mean(ts.map(t => t.lp)) : NaN, n: ts.length }); }
    else fields.push({ name: 'end', mean: tk.eos && Number.isFinite(tk.eos.lp) ? tk.eos.lp : NaN, n: tk.eos ? 1 : 0 });
    const missing = fields.some(f => !Number.isFinite(f.mean)) || margins.some(m => !Number.isFinite(m)) ? 'a field has no token probability' : null;
    const finite = fields.filter(f => Number.isFinite(f.mean)), w = finite.length ? finite.reduce((a, b) => b.mean < a.mean ? b : a) : null;
    const get = name => { const f = fields.find(x => x.name === name); return f ? f.mean : NaN; };
    return { fields, missing, weakest: w ? w.name : null, score_min: missing || !w ? NaN : w.mean, act_lp: get('act'), trigger_lp: get('trigger'),
      val_margin_min: margins.length ? Math.min(...margins) : NaN, req_index: i, n_requests: n };
  });
}
/** the signals of one request as the confidence reads them (null when any is missing: never executed at a threshold) */
export const SIGNALS = [['score_min', 1], ['act_lp', 1], ['val_margin_min', 1], ['trigger_lp', 1], ['req_index', -1], ['n_requests', -1], ['msg_tokens', -1]];
export function signalsOf(sc, msgTokens) {
  if (!sc || sc.missing) return null;
  const f = { score_min: sc.score_min, act_lp: sc.act_lp, val_margin_min: sc.val_margin_min, trigger_lp: sc.trigger_lp, req_index: sc.req_index, n_requests: sc.n_requests, msg_tokens: msgTokens };
  if (Object.values(f).some(x => !Number.isFinite(x))) return null;
  for (const k of Object.keys(f)) f[k] = Math.round(f[k] * 1e6) / 1e6;
  return f;
}
export { utf8len };
