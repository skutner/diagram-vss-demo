// freeze_first_pass.mjs: copies a translation file, as first written, into first-pass/ of its model folder, BEFORE any validation runs
// on it. It never overwrites a frozen copy: a later change to the file is a repair, recorded with a "#! repair:" line (CONVENTIONS.md) and
// found by build_manifest.mjs by comparing each turn with this copy.
//   node training/sop-translations/freeze_first_pass.mjs docs/sop-translations/<model>/<file>.sop ...
import fs from 'node:fs';
import path from 'node:path';
let n = 0;
for (const f of process.argv.slice(2)) {
  const abs = path.resolve(f), m = abs.match(/^(.*\/docs\/sop-translations\/[^/]+)\/(.+\.sop)$/);
  if (!m) { console.error(`not a translation file: ${f}`); process.exitCode = 1; continue; }
  if (m[2].startsWith('first-pass/')) { console.error(`already a frozen copy: ${f}`); process.exitCode = 1; continue; }
  const to = path.join(m[1], 'first-pass', m[2]);
  if (fs.existsSync(to)) { console.log(`kept   ${path.relative(process.cwd(), to)} (already frozen)`); continue; }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(abs, to, fs.constants.COPYFILE_EXCL); n++;
  console.log(`frozen ${path.relative(process.cwd(), to)}`);
}
console.log(`${n} file(s) frozen`);
