// first_run_batches.mjs: the first run's rows in ModernBERT word pieces: how long they are, and how many tokens the batches of SOP-BERT's recipe would hold (random batches of 32 requests, 8 messages for the cut head; finetune_roles.py batches).
//   LAPTOP_PKG=... node training/neural/parity/first_run_batches.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ROOT } from './parity_lib.mjs';

const require = createRequire(process.env.LAPTOP_PKG || new URL('../../laptop/package.json', import.meta.url));
const TF = require('@huggingface/transformers');
TF.env.allowRemoteModels = false; TF.env.allowLocalModels = true; TF.env.localModelPath = ROOT + '/docs/model/neural/'; TF.env.useBrowserCache = false;
const tok = await TF.AutoTokenizer.from_pretrained('modernbert', { local_files_only: true });
const C = process.env.HOME + '/.cache/diagram-vss-modernbert/roles/', cache = new Map();
const pcs = (w, first) => { const k = (first ? '' : ' ') + w; if (!cache.has(k)) cache.set(k, tok.encode(k, { add_special_tokens: false }).length); return cache.get(k); };
const load = f => fs.readFileSync(C + f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const len = (r, cap) => { let n = 2; r.words.forEach((w, i) => { n += pcs(w, i === 0); }); return Math.min(n, cap); };
const a = load('train.jsonl').map(r => len(r, 128)), b = load('cut_train.jsonl').map(r => len(r, 512));
const q = (x, p) => [...x].sort((u, v) => u - v)[Math.floor(p * (x.length - 1))];
console.log(`request rows ${a.length}: pieces p50 ${q(a, .5)}, p90 ${q(a, .9)}, p99 ${q(a, .99)}, max ${Math.max(...a)}`);
console.log(`whole messages ${b.length}: pieces p50 ${q(b, .5)}, p90 ${q(b, .9)}, p99 ${q(b, .99)}, max ${Math.max(...b)}`);
let seed = 1; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const shuf = x => { const y = [...x]; for (let i = y.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [y[i], y[j]] = [y[j], y[i]]; } return y; };
const sa = shuf(a), sb = shuf(b), R = [], M = [];
for (let i = 0, c = 0; i + 32 <= sa.length; i += 32, c += 8) { R.push(Math.max(...sa.slice(i, i + 32)) * 32); const k = c % Math.max(sb.length - 8, 1); M.push(Math.max(...sb.slice(k, k + 8)) * 8); }
console.log(`steps per epoch ${R.length}; tokens in a batch of 32 requests: p50 ${q(R, .5)}, p99 ${q(R, .99)}, max ${Math.max(...R)}; in a batch of 8 messages: p50 ${q(M, .5)}, p99 ${q(M, .99)}, max ${Math.max(...M)}; steps over 4,096 tokens in one batch: ${R.concat(M).filter(x => x > 4096).length}`);
