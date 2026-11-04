// clear_cache_check.cjs: Clear cache on the Qwen3 tab when the model is not loaded (the idle card). The private file system is per
// origin, so the check puts a 1 MB stand-in file (not the model) into the reader's cache folder, opens the page without loading Qwen3,
// presses "Clear its cache", and lists the folder before and after.
//   node training/qwen/clear_cache_check.cjs --profile <fresh profile dir> --out <file>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
(async () => {
  const { serve } = await import(path.resolve(__dirname, 'serve_docs.mjs')), root = path.resolve(__dirname, '../../docs');
  const port = +(arg('--port') || 8590), srv = serve(port, root), base = `http://127.0.0.1:${port}/`;
  const ctx = await chromium.launchPersistentContext(arg('--profile'), { headless: true }), page = await ctx.newPage(), out = {};
  const list = () => page.evaluate(async () => { const root = await navigator.storage.getDirectory(), o = {}; for await (const [n, h] of root.entries()) { o[n] = []; if (h.kind === 'directory') for await (const [m, f] of h.entries()) o[n].push([m, f.kind === 'file' ? (await f.getFile()).size : null]); } return o; });
  await page.goto(base + 'index.html'); await page.waitForFunction(() => window.SketchpadInfo, null, { timeout: 60000 });
  await page.evaluate(async () => { const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('qwen3-reader', { create: true }); const w = await (await d.getFileHandle('stand-in.gguf', { create: true })).createWritable(); await w.write(new Uint8Array(1 << 20)); await w.close(); });
  out.before = await list(); out.state = await page.evaluate(() => window.SketchpadInfo.qwen().state);
  await page.locator('[data-rtab="qwen"]').click(); await page.locator('[data-sub="settings"]').click();
  await page.locator('[data-qwen="clear"]').first().click(); await page.waitForTimeout(4000);
  out.after = await list(); out.note = await page.locator('#msgs .sys').last().innerText();
  fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
  await ctx.close(); srv.close();
})();
