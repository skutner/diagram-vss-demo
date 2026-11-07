import fs from 'node:fs'; import { createRequire } from 'node:module';
const K = createRequire(import.meta.url)(new URL('../../../docs/js/logic.js', import.meta.url).pathname);
const names = ['Start', 'Process', 'Check', 'Done'];
for (const text of fs.readFileSync(process.argv[2], 'utf8').trim().split('\n')) {
  const r = K.createSystem(); let out; try { out = r.formalize(text, { names, last: [] }); } catch (e) { out = { nodes: [] }; }
  console.log(`${JSON.stringify(text).padEnd(34)} -> ${(out.nodes || []).map(K.serialize).join(' | ') || '(none)'}`);
}
