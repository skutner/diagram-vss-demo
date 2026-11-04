// app_lifecycle_check.cjs: the Qwen3 tab's lifecycle in the real page, before publishing (docs/ served from this checkout, the model URL
// replaced by a local copy of the same file; size and SHA-256 still checked in the browser). Steps: load; one message; Do it anyway on
// Qwen3's held request (only Qwen3's drawing may change); Stop while it reads (the reading is held, the five other tabs reply as usual);
// a message while it is stopped (not read by it); Try again (from the cache); Unload (memory before and after); Clear cache.
// Messages: annotated training messages (training/sketch/llm_train/haiku_short/msg_02.jsonl), not the live fixture.
//   node training/qwen/app_lifecycle_check.cjs --gguf <local copy> --out <file>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
function rss(profile) {
  const all = fs.readdirSync('/proc').filter(x => /^\d+$/.test(x)).map(pid => { try { const st = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); return { pid: +pid, ppid: +st.slice(st.lastIndexOf(')') + 2).split(' ')[1], cmd: fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' '), rss: +((fs.readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/) || [])[1] || 0) }; } catch (e) { return null; } }).filter(Boolean);
  const ids = new Set(all.filter(p => p.cmd.includes(`--user-data-dir=${profile}`) && !p.cmd.includes('--type=')).map(p => p.pid)); let g = true;
  while (g) { g = false; for (const p of all) if (!ids.has(p.pid) && ids.has(p.ppid)) { ids.add(p.pid); g = true; } }
  const ps = all.filter(p => ids.has(p.pid)); return { total_kib: ps.reduce((a, p) => a + p.rss, 0), max_kib: Math.max(0, ...ps.map(p => p.rss)) };
}
(async () => {
  const { serve } = await import(path.resolve(__dirname, 'serve_docs.mjs')), root = path.resolve(__dirname, '../../docs'), port = 8500 + Math.floor(Math.random() * 90), base = `http://127.0.0.1:${port}/`;
  const srv = serve(port, root, { '/__local_model.gguf': path.resolve(arg('--gguf')) });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'qwen-life-')), ctx = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 1400, height: 900 } });
  const reader = JSON.parse(fs.readFileSync(path.join(root, 'model/qwen3/reader.json'), 'utf8'));
  await ctx.route(base + 'model/qwen3/reader.json*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign({}, reader, { model: Object.assign({}, reader.model, { url: base + '__local_model.gguf' }) })) }));
  const page = await ctx.newPage(), out = { steps: [] }, T0 = Date.now(), log = (what, x) => { out.steps.push(Object.assign({ t: Date.now() - T0, what }, x || {})); console.log(Date.now() - T0, what, JSON.stringify(x || {}).slice(0, 300)); };
  const msgs = fs.readFileSync(path.resolve(__dirname, '../sketch/llm_train/haiku_short/msg_02.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).map(m => m.text);
  const info = () => page.evaluate(() => window.SketchpadInfo.qwen());
  const sops = async () => { const o = {}; for (const id of ['combined', 'rules', 'vss', 'neural', 'modernbert', 'qwen']) { await page.locator(`[data-rtab="${id}"]`).click(); await page.locator('[data-sub="sop"]').click(); o[id] = await page.locator('#rpanel pre.sop').innerText(); } await page.locator('[data-rtab="qwen"]').click(); await page.locator('[data-sub="drawing"]').click(); return o; };
  const send = async text => { const n = await page.locator('#msgs .b.bot').count(); await page.locator('#say').fill(text); await page.locator('#send-btn').click(); await page.waitForFunction(n => document.querySelectorAll('#msgs .b.bot').length > n && !document.querySelector('#msgs .typing'), n, { timeout: 240000 }); return page.evaluate(() => window.SketchpadInfo.turn()); };
  try {
    await page.goto(base + 'index.html?models=rules,vss,neural,combined,modernbert,qwen');
    await page.waitForFunction(() => window.SketchpadInfo && window.SketchpadInfo.qwen().ready, null, { timeout: 1800000, polling: 2000 });
    log('ready', { info: (await info()).info, check: (await info()).check, rss: rss(profile) });
    await page.locator('[data-rtab="qwen"]').click();   // on the Qwen3 tab its replies are shown in the chat
    const t1 = await send(msgs[1]);
    await page.waitForFunction(t => window.SketchpadInfo.qwenTurn(t).end, t1, { timeout: 1800000, polling: 1000 });
    const q1 = await page.evaluate(t => window.SketchpadInfo.qwenTurn(t), t1);
    log('message 1 read', { text: msgs[1], line: q1.line, read: q1.read, executed: q1.executed, gate: q1.gate, evidence_ok: q1.evidence && q1.evidence.ok });
    // Do it anyway on Qwen3's first held request, when it may run
    const btn = page.locator(`#msgs [data-anyway^="qwen:${t1}:"]`).first();
    if (await btn.count()) {
      const s1 = await sops(), nb = await page.locator('#msgs .b.bot').count(); await btn.click();
      await page.waitForFunction(n => document.querySelectorAll('#msgs .b.bot').length > n, nb, { timeout: 120000 });
      const after = await sops(), reply = await page.locator('#msgs .b.bot').last().innerText();
      log('do it anyway', { reply, qwenChangedByAnyway: after.qwen !== s1.qwen, othersUnchangedByAnyway: ['combined', 'rules', 'vss', 'neural', 'modernbert'].every(id => after[id] === s1[id]), qwenSop: after.qwen });
      out.afterAnyway = after;
    } else log('do it anyway: no button (every request of message 1 was blocked)', {});
    const sAnyway = await sops();
    // Stop while it reads
    const t2 = await send(msgs[2]);
    await page.waitForFunction(() => window.SketchpadInfo.qwen().busy, null, { timeout: 120000 });
    await page.waitForTimeout(3000);
    await page.locator('[data-sub="settings"]').click(); await page.locator('[data-qwen="stop"]').first().click();
    await page.waitForFunction(t => window.SketchpadInfo.qwenTurn(t).end, t2, { timeout: 120000 });
    const q2 = await page.evaluate(t => window.SketchpadInfo.qwenTurn(t), t2), st2 = await info();
    log('stopped while reading', { state: st2.state, error: st2.error, line: q2.line, gate: q2.gate, executed: q2.executed, othersReplied: await page.evaluate(t => window.SketchpadInfo.steps(t - 1), t2) });
    const sStop = await sops();
    log('drawings after stop', { qwenUnchangedByStoppedReading: sStop.qwen === sAnyway.qwen });
    // a message while it is stopped: the five other tabs read it; Qwen3 does not
    const t3 = await send(msgs[3]); await page.waitForTimeout(1000);
    log('message while stopped', { qwen: await page.evaluate(t => window.SketchpadInfo.qwenTurn(t), t3), steps: await page.evaluate(t => window.SketchpadInfo.steps(t - 1), t3) });
    // Try again: from the cache
    await page.locator('[data-sub="settings"]').click(); const tl = Date.now(); await page.locator('[data-qwen="load"]').first().click();
    await page.waitForFunction(() => window.SketchpadInfo.qwen().ready, null, { timeout: 1800000, polling: 2000 });
    log('try again: ready', { ms: Date.now() - tl, info: (await info()).info, rss: rss(profile) });
    // Unload: memory before and after
    const r0 = rss(profile); await page.locator('[data-sub="settings"]').click(); await page.locator('[data-qwen="unload"]').first().click();
    await page.waitForFunction(() => window.SketchpadInfo.qwen().state === 'idle', null, { timeout: 60000 }); await page.waitForTimeout(5000);
    log('unloaded', { state: (await info()).state, rss_before: r0, rss_after: rss(profile) });
    // Clear the cache
    await page.locator('[data-sub="settings"]').click(); await page.locator('[data-qwen="clear"]').first().click(); await page.waitForTimeout(3000);
    const cache = await page.evaluate(async () => { const root = await navigator.storage.getDirectory(); const names = []; for await (const [n] of root.entries()) names.push(n); return { root: names, estimate: await navigator.storage.estimate() }; });
    log('cache cleared', cache);
    out.final = await sops();
    out.console = [];
  } catch (e) { log('FAILED', { error: String(e && e.stack || e) }); }
  fs.writeFileSync(arg('--out'), JSON.stringify(out, null, 1));
  await ctx.close(); srv.close();
})();
