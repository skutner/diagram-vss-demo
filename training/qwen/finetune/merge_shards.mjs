// merge_shards.mjs: the shard files of one collect_lines.mjs collection (SHARD=i/k, each with its own complete manifest) -> one file in the
// sets' own order (set order, then item order: what arm_lib.mjs loadRecords and the parts rule expect), with a manifest that names the shards.
// Refuses: a shard manifest that is not complete or does not match its file, shards of other artifacts, a duplicate or a missing message.
//   node merge_shards.mjs OUT.jsonl SHARD.jsonl...
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSets } from '../../neural/parity/sets.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
const [out, ...shards] = process.argv.slice(2);
const recs = new Map(), mans = [];
for (const f of shards) {
  const buf = readFileSync(f), m = JSON.parse(readFileSync(f + '.manifest.json', 'utf8')), lines = buf.toString('utf8').split('\n').filter(l => l.trim());
  if (m.complete !== true || m.records.count !== lines.length || m.records.sha256 !== sha(buf)) throw new Error(f + ': incomplete or changed shard');
  if (mans.length && m.artifacts_sha256 !== mans[0].artifacts_sha256) throw new Error(f + ': other artifacts than the first shard');
  mans.push(m);
  for (const l of lines) { const r = JSON.parse(l), k = r.set + '\0' + r.id; if (recs.has(k)) throw new Error('duplicate ' + k); recs.set(k, l); }
}
const sets = mans[0].sets, part = mans[0].part, items = loadSets(sets).flatMap(s => s.items).filter(it => !part || it.part === part);
const missing = items.filter(it => !recs.has(it.set + '\0' + it.id));
if (missing.length) throw new Error(`${missing.length} messages missing (${missing.slice(0, 3).map(x => x.id)})`);
if (recs.size !== items.length) throw new Error(`${recs.size} records for ${items.length} messages`);
const text = items.map(it => recs.get(it.set + '\0' + it.id)).join('\n') + '\n';
writeFileSync(out, text);
const m = { ...mans[0], tool: 'training/qwen/finetune/merge_shards.mjs of collect_lines.mjs shards', shard: null, shards: shards.map((f, i) => ({ file: f, sha256: mans[i].records.sha256, count: mans[i].records.count, runtime: mans[i].runtime || null })),
  messages: items.length, complete: true, records: { count: items.length, sha256: sha(text) }, merged: new Date().toISOString() };
writeFileSync(out + '.manifest.json', JSON.stringify(m, null, 1));
console.log(JSON.stringify({ out, records: items.length, shards: shards.length }));
