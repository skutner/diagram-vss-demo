// token_budget.mjs: how many Qwen3 tokens each candidate output format, the drawing and the prompt take, measured with the GGUF's own
// tokenizer (a running llama-server's /tokenize and /apply-template), on the gold labels of a set or of annotated training folders.
//   SERVER=http://127.0.0.1:8091 node token_budget.mjs OUT.json [SET=nl_a] [FOLDERS=dir,dir,...] [LIMIT=n]
// Formats of one message's requests (the annotated wires {span, trigger, type, args}):
//   json      the shipped reader's JSON contract (docs/js/qwen-contract.js), quotes included; null where the contract cannot express a wire
//             ($new is a ref to the last create; a mention whose keys are not all description keys, e.g. label, layer, size, cannot be written)
//   json_noq  the same without the "text" quotes
//   sop       SOP Lang as the engine reads it (parity_lib goldProgram: mention lines, then one line per request)
//   lines     one line per request in the annotation's own form: `type key=value ...`, mentions inline (`target=mention(color=red,shape=circle)`)
//   lines_t   the same, each line starting with the trigger words in brackets: `[get rid of] command action=delete target=Pump`
//   lines_s   the same with the whole span quoted instead of the trigger
// Context: names (the shipped user turn: userContent(names, text)); drawing (K.worldSOP of the setup, or of the gold replay of a session).
// Prompts: the shipped system prompt, and a one-line system prompt, each through the chat template with an empty user turn.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSpec, buildPrompt, userContent } from '../../../docs/js/qwen-contract.js';
import { K, goldProgram, touched } from '../../neural/parity/parity_lib.mjs';
import { loadSets, contextNames } from '../../neural/parity/sets.mjs';
import { startSystem, playGold } from '../../neural/parity/arm_lib.mjs';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname), server = process.env.SERVER || 'http://127.0.0.1:8091';
const reader = JSON.parse(readFileSync(ROOT + '/docs/model/qwen3/reader.json', 'utf8'));
const S0 = K.createSystem(), spec = buildSpec(S0.engine.legend, reader, K.serialize);
const wireDocs = Object.fromEntries([...S0.engine.wireTypes].map(([t, w]) => [t, w.doc]));
const SHORT_SYSTEM = 'Write the diagram editor requests in this message, one per line.';

async function ntok(s) {
  const r = await fetch(server + '/tokenize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: s, add_special: false }) });
  return (await r.json()).tokens.length;
}
async function templ(system, user) {
  const r = await fetch(server + '/apply-template', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }], chat_template_kwargs: { enable_thinking: false } }) });
  return (await r.json()).prompt;
}

const parts = v => String(v).split(',').map(x => x.trim()).filter(Boolean);
const splitMention = v => { const out = []; let d = 0, cur = ''; for (const ch of String(v)) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out.map(s => s.trim()).filter(Boolean); };
function toJSON(wires, quotes) {
  const requests = []; let lastCreate = null;
  for (const [i, w] of wires.entries()) {
    const act = w.type === 'command' ? w.args.action : w.type === 'question' ? w.args.ask : w.type, a = spec.byDo.get(act);
    if (!a) return null;
    const args = {};
    for (const [k, v] of Object.entries(w.args)) {
      if (k === 'action' || k === 'ask') continue;
      if (!a.keys.includes(k) || !spec.keys.get(k)) return null;
      const kind = spec.keys.get(k).kind;
      if (kind === 'names') {
        const items = [];
        for (const p of splitMention(v)) {
          if (p === '$new') { if (!lastCreate) return null; items.push({ ref: lastCreate }); continue; }
          const m = /^mention\((.*)\)$/.exec(p);
          if (m) { const like = {}; for (const kv of m[1].split(',')) { const [kk, vv] = kv.split('='); const key = kk.trim() === 'notcolor' ? 'notColor' : kk.trim(); if (!spec.descKeys.includes(key)) return null; like[key] = vv.trim(); } items.push({ like }); continue; }
          items.push({ name: p });
        }
        args[k] = items;
      } else if (kind === 'number') args[k] = Number(v);
      else if (Array.isArray(spec.keys.get(k).values) && kind === 'enum') { if (!spec.keys.get(k).values.includes(String(v))) return null; args[k] = String(v); }
      else args[k] = kind === 'list' ? parts(v) : String(v);
    }
    const r = { id: 'r' + (i + 1) }; if (quotes) r.text = w.span; r.do = act; r.args = args;
    requests.push(r);
    if (w.type === 'command' && ['create', 'duplicate'].includes(w.args.action)) lastCreate = r.id;
  }
  return JSON.stringify({ requests, not_understood: [] });
}
const lineOf = w => `${w.type} ` + Object.entries(w.args).map(([k, v]) => `${k}=${/\s/.test(String(v)) && !String(v).startsWith('mention(') ? JSON.stringify(String(v)) : v}`).join(' ');

function rowsOfSet(name) {
  const items = loadSets([name])[0].items, out = []; let session = null, G = null;
  for (const it of items) {
    if (it.session != null) { if (it.session !== session) { session = it.session; G = startSystem(it.setup); } } else { session = null; G = null; }
    const sys = G ? G.s : startSystem(it.setup).s;
    out.push({ id: it.id, kind: it.kind, text: it.text, names: contextNames(it), wires: it.wires, drawing: K.worldSOP(sys.world.state) });
    if (G) playGold(G.s, it.wires);
  }
  return out;
}
function rowsOfFolders(dirs) {
  const out = [];
  for (const d of dirs) for (const f of readdirSync(d).filter(f => f.endsWith('.jsonl')).sort()) for (const l of readFileSync(resolve(d, f), 'utf8').split('\n').filter(Boolean)) {
    const r = JSON.parse(l); if (!Array.isArray(r.wires)) continue;
    let drawing = ''; if (r.setup) { try { drawing = K.worldSOP(startSystem(r.setup).s.world.state); } catch { } }
    out.push({ id: r.id, kind: r.kind || null, text: r.text, names: r.names || [], wires: r.wires, drawing, folder: d.split('/').slice(-1)[0] });
  }
  return out;
}

const q = (xs, p) => { const s = xs.filter(x => x != null).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };
const summary = xs => ({ n: xs.filter(x => x != null).length, p50: q(xs, .5), p90: q(xs, .9), max: q(xs, 1), mean: xs.filter(x => x != null).length ? +(xs.filter(x => x != null).reduce((a, b) => a + b, 0) / xs.filter(x => x != null).length).toFixed(1) : null });

const out = process.argv[2];
const rows = process.env.FOLDERS ? rowsOfFolders(process.env.FOLDERS.split(',')) : rowsOfSet(process.env.SET || 'nl_a');
const use = process.env.LIMIT ? rows.slice(0, +process.env.LIMIT) : rows;
const fmts = ['json', 'json_noq', 'sop', 'lines', 'lines_t', 'lines_s'], per = [];
for (const r of use) {
  const w = r.wires, o = { id: r.id, kind: r.kind, requests: w.length, text: await ntok(r.text), names_turn: await ntok(userContent(r.names, r.text)), drawing: r.drawing ? await ntok(r.drawing) : 0, drawing_lines: r.drawing ? r.drawing.split('\n').length : 0 };
  const s = { json: toJSON(w, true), json_noq: toJSON(w, false), sop: w.length ? goldProgram(w) : '', lines: w.map(lineOf).join('\n'),
    lines_t: w.map(x => `[${x.trigger || ''}] ` + lineOf(x)).join('\n'), lines_s: w.map(x => `[${x.span}] ` + lineOf(x)).join('\n') };
  for (const f of fmts) o[f] = s[f] == null ? null : await ntok(s[f]);
  per.push(o);
}
const sysFull = buildPrompt(spec, reader, wireDocs);
const prompts = { shipped_system_template_tokens: await ntok(await templ(sysFull, '')), short_system_template_tokens: await ntok(await templ(SHORT_SYSTEM, '')), short_system: SHORT_SYSTEM };
const res = { source: process.env.FOLDERS || (process.env.SET || 'nl_a'), messages: per.length, requests: per.reduce((a, b) => a + b.requests, 0), prompts,
  json_expressible_messages: per.filter(p => p.json != null).length, json_expressible_with_requests: per.filter(p => p.json != null && p.requests).length, messages_with_requests: per.filter(p => p.requests).length,
  per_message: Object.fromEntries(['text', 'names_turn', 'drawing', 'drawing_lines', ...fmts].map(k => [k, summary(per.map(p => p[k]))])),
  per_request_in_messages_with_requests: Object.fromEntries(fmts.map(f => [f, summary(per.filter(p => p.requests && p[f] != null).map(p => p[f] / p.requests))])),
  same_messages_all_formats: (() => { const ok = per.filter(p => p.requests && fmts.every(f => p[f] != null)); return { n: ok.length, ...Object.fromEntries(fmts.map(f => [f, summary(ok.map(p => p[f]))])) }; })() };
writeFileSync(out, JSON.stringify({ summary: res, rows: per }, null, 1));
console.log(JSON.stringify(res, null, 1));
