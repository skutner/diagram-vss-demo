// run_live.cjs: runs a live harness (training/sketch/diagram_e2e_live6.mjs) with Node + Playwright in a fresh Chromium profile, samples the
// memory of the browser's processes while it runs, takes the final screenshot of every reader's drawing, and writes the evidence.
//   node training/qwen/run_live.cjs --url <page url with ?models=...> --out <dir> [--harness <file>] [--profile <dir>]
//   node training/qwen/run_live.cjs --local <query, e.g. models=rules,vss,neural,combined,modernbert,qwen> --gguf <local copy> --out <dir>
// --local (checks before publishing, never the published run): docs/ is served from this checkout, and the model URL in reader.json is
// replaced by the same file served locally (its size and SHA-256 are still checked in the browser).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execSync } = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = path.resolve(arg('--out')), harness = arg('--harness', 'training/sketch/diagram_e2e_live6.mjs'), profile = arg('--profile') || fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-live-'));
fs.mkdirSync(out, { recursive: true });
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
/** the browser process (its command line names the profile) and all its descendants: RSS in KiB per process */
function procs() {
  const all = fs.readdirSync('/proc').filter(x => /^\d+$/.test(x)).map(pid => { try { const st = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'), ppid = +st.slice(st.lastIndexOf(')') + 2).split(' ')[1]; const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' '); const rss = +((fs.readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/) || [])[1] || 0); return { pid: +pid, ppid, cmd, rss }; } catch (e) { return null; } }).filter(Boolean);
  const root = all.filter(p => p.cmd.includes(`--user-data-dir=${profile}`) && !p.cmd.includes('--type='));
  const ids = new Set(root.map(p => p.pid)); let grew = true;
  while (grew) { grew = false; for (const p of all) if (!ids.has(p.pid) && ids.has(p.ppid)) { ids.add(p.pid); grew = true; } }
  return all.filter(p => ids.has(p.pid)).map(p => ({ pid: p.pid, type: (p.cmd.match(/--type=(\S+)/) || [])[1] || 'browser', rss: p.rss }));
}
(async () => {
  const hw = { cpu: (fs.readFileSync('/proc/cpuinfo', 'utf8').match(/model name\s*:\s*(.*)/) || [])[1], logical_cpus: os.cpus().length, mem_total_kib: +(fs.readFileSync('/proc/meminfo', 'utf8').match(/MemTotal:\s+(\d+)/) || [])[1], os: (fs.readFileSync('/etc/os-release', 'utf8').match(/PRETTY_NAME="([^"]*)"/) || [])[1], kernel: os.release(), node: process.version, virtualization: (() => { try { return execSync('systemd-detect-virt 2>/dev/null || true').toString().trim() || null; } catch (e) { return null; } })() };
  const ctx = await chromium.launchPersistentContext(profile, { headless: true, acceptDownloads: true, viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  let url = arg('--url'), srv = null;
  if (arg('--local') != null) {
    const { serve } = await import(path.resolve(__dirname, 'serve_docs.mjs')), root = path.resolve(__dirname, '../../docs'), port = 8600 + Math.floor(Math.random() * 100), base = `http://127.0.0.1:${port}/`;
    const gguf = arg('--gguf'); srv = serve(port, root, gguf ? { '/__local_model.gguf': path.resolve(gguf) } : {});
    if (gguf) { const reader = JSON.parse(fs.readFileSync(path.join(root, 'model/qwen3/reader.json'), 'utf8')); await ctx.route(base + 'model/qwen3/reader.json*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign({}, reader, { model: Object.assign({}, reader.model, { url: base + '__local_model.gguf' }) })) })); }
    url = base + 'index.html?' + arg('--local');
  }
  const samples = [], t0 = Date.now(), marks = [];
  const timer = setInterval(() => { const p = procs(); samples.push({ t: Date.now() - t0, total_kib: p.reduce((a, x) => a + x.rss, 0), max_kib: Math.max(0, ...p.map(x => x.rss)), n: p.length, by: p.map(x => [x.type, x.rss]) }); }, 2000);
  const page = await ctx.newPage(), consoleLines = [];
  page.on('console', m => consoleLines.push(`${new Date().toISOString()} ${m.type()}: ${m.text().slice(0, 500)}`));
  page.on('pageerror', e => consoleLines.push(`${new Date().toISOString()} pageerror: ${String(e).slice(0, 500)}`));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const src = fs.readFileSync(harness, 'utf8'), fn = eval('(' + src.slice(src.indexOf('async page =>')) + ')');
  const record = await fn(page);
  marks.push({ t: Date.now() - t0, what: 'harness finished' });
  // the six final drawings, each reader's own tab
  const shots = {};
  for (const id of record.expectedReaders || []) {
    try {
      await page.locator(`[data-rtab="${id}"]`).click(); await page.locator('[data-sub="drawing"]').click(); await page.waitForTimeout(400);
      const f = path.join(out, `${id}.png`); await page.screenshot({ path: f, fullPage: false }); shots[id] = { file: path.basename(f), sha256: sha(f) };
    } catch (e) { shots[id] = { error: String(e) }; }
  }
  await page.locator('[data-rtab="combined"]').click().catch(() => {});
  const ua = await page.evaluate(() => ({ ua: navigator.userAgent, hc: navigator.hardwareConcurrency, coi: self.crossOriginIsolated, deviceMemory: navigator.deviceMemory || null, heap: performance.memory ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize, limit: performance.memory.jsHeapSizeLimit } : null }));
  clearInterval(timer);
  const before = samples.length ? samples[samples.length - 1] : null;
  // unload Qwen3 at the end and sample again: the memory it frees
  let unload = null;
  if ((record.expectedReaders || []).includes('qwen')) {
    try {
      await page.locator('[data-rtab="qwen"]').click(); await page.locator('[data-sub="settings"]').click();
      const t1 = Date.now(); await page.locator('[data-qwen="unload"]').first().click();
      await page.waitForFunction(() => window.SketchpadInfo.qwen().state === 'idle', null, { timeout: 60000 }); await page.waitForTimeout(4000);
      const p = procs(); unload = { ms: Date.now() - t1, after_total_kib: p.reduce((a, x) => a + x.rss, 0), after_max_kib: Math.max(0, ...p.map(x => x.rss)), before_total_kib: before && before.total_kib, before_max_kib: before && before.max_kib, state: await page.evaluate(() => window.SketchpadInfo.qwen()) };
    } catch (e) { unload = { error: String(e) }; }
  }
  const browserVersion = ctx.browser() ? ctx.browser().version() : null;
  await ctx.close(); if (srv) srv.close();
  fs.writeFileSync(path.join(out, 'record.json'), JSON.stringify(record, null, 1));
  const peak = samples.reduce((a, x) => x.total_kib > a.total_kib ? x : a, { total_kib: 0 });
  fs.writeFileSync(path.join(out, 'memory.json'), JSON.stringify({ about: 'Resident memory (VmRSS, KiB) of the Chromium processes of this run (the browser process found by its profile and every descendant), sampled every 2 s. Summed RSS double-counts shared pages: it is an upper bound of the physical memory, not a measurement of it.', peak_total_kib: peak.total_kib, peak_at_ms: peak.t, peak_max_single_kib: Math.max(0, ...samples.map(x => x.max_kib)), unload, samples: samples.map(x => ({ t: x.t, total_kib: x.total_kib, max_kib: x.max_kib, n: x.n })) }, null, 1));
  fs.writeFileSync(path.join(out, 'console.txt'), consoleLines.join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'run-metadata.json'), JSON.stringify({ url, local: arg('--local') != null, harness, harness_sha256: sha(harness), fixture_sha256: sha('training/sketch/diagram_e2e_cases.json'), record_sha256: sha(path.join(out, 'record.json')), started: record.started, finished: record.finished, status: record.status, failures: record.failures,
    hardware: hw, browser: Object.assign({ version: browserVersion, headless: true, viewport: '1400x900', device_scale_factor: 2 }, ua), screenshots: shots, profile_fresh: !arg('--profile') }, null, 1));
  console.log(JSON.stringify({ status: record.status, failures: record.failures, out }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
