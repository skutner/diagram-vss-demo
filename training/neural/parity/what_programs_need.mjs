// what_programs_need.mjs: what would a reader need in order to write the Opus 5.5 programs of the built-in examples: the words of the message
// alone, or the drawing and the earlier messages too? Can the shipped ModernBERT head layout hold them?
//   node training/neural/parity/what_programs_need.mjs [flags.json]
// A turn "needs context" when a name-valued key holds a name the message does not write, or a mention holds a colour, shape, size or label the
// message does not write. This is a word check, so it counts "the stars" -> mention(shape=star, color=gold, size=tiny) as needing context, although a
// reader's mention(shape=star) may pick the same shapes.
import fs from 'node:fs';
import { K, ROOT, opusManifest, pct } from './parity_lib.mjs';

const cfg = JSON.parse(fs.readFileSync(ROOT + '/docs/model/neural/modernbert/config.json', 'utf8')).reader;
const acts = new Set(cfg.acts), classes = new Map(cfg.classes.map(([k, v]) => [k, new Set(v)])), spanKeys = new Set(cfg.span_keys), refKeys = new Set(cfg.ref_keys), descKeys = new Set(cfg.desc_keys);
const NAME_KEYS = ['target', 'from', 'to', 'anchor', 'anchor2', 'members', 'linked'];
const words = s => String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
const flags = {}, T = {}, inc = k => { T[k] = (T[k] || 0) + 1; }, H = { action: {}, ask: {}, keys: {}, wires: {} }, bump = (o, k) => { o[k] = (o[k] || 0) + 1; }, missing = {}, lens = [];
for (const e of opusManifest().entries) {
  const nodes = K.parse(e.program || ''), W = new Set(words(e.input)), real = nodes.filter(n => n.type !== 'mention');
  const env = Object.fromEntries(nodes.filter(n => n.type === 'mention').map(n => [n.id, n.args]));
  let name = false, desc = false, out = false;
  lens.push(words(e.input).length); bump(H.wires, Math.min(real.length, 6)); inc('turns');
  for (const n of real) {
    if (n.args.action) bump(H.action, n.args.action);
    if (n.args.ask) bump(H.ask, n.args.ask);
    const act = n.args.action || n.args.ask || n.type;
    if (!acts.has(act)) { out = true; bump(missing, 'act:' + act); }
    for (const [k, v0] of Object.entries(n.args)) {
      bump(H.keys, k);
      if (k === 'action' || k === 'ask') continue;
      const list = Array.isArray(v0) ? v0 : [v0];
      if (NAME_KEYS.includes(k)) {
        if (!refKeys.has(k)) { out = true; bump(missing, 'ref key:' + k); }
        for (const v of list) {
          if (K.isRef(v)) for (const [mk, mv] of Object.entries(env[v.ref] || {})) {
            if (mk !== 'quantifier' && mk !== 'recency' && !words(mv).every(x => W.has(x))) desc = true;
            if (!descKeys.has(mk) && !descKeys.has(mk.toLowerCase())) { out = true; bump(missing, 'description:' + mk); }
          } else if (!words(v).every(x => W.has(x))) name = true;
        }
      } else if (classes.has(k)) { for (const v of list) if (!classes.get(k).has(String(v))) { out = true; bump(missing, `value:${k}=${v}`); } }
      else if (!spanKeys.has(k)) { out = true; bump(missing, 'key:' + k); }
    }
  }
  flags[e.id] = { name, desc, out, multi: real.length > 1, none: !real.length };
  if (name || desc) inc('need context'); if (name) inc('  a name not written'); if (desc) inc('  a description not written');
  if (out) inc('out of the shipped ModernBERT layout'); if (real.length > 1) inc('several wires'); if (!real.length) inc('no request');
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(flags));
for (const [k, v] of Object.entries(T)) console.log(`${k}: ${v} = ${pct(v, T.turns)}`);
const q = p => [...lens].sort((a, b) => a - b)[Math.floor(p * (lens.length - 1))], top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(x => x.join(':')).join(' ');
console.log('words per message p50, p90, p99, max:', q(.5), q(.9), q(.99), Math.max(...lens));
console.log('wires per turn:', top(H.wires)); console.log('actions:', top(H.action)); console.log('questions:', top(H.ask)); console.log('keys:', top(H.keys));
console.log('not in the shipped ModernBERT layout:', top(missing));
