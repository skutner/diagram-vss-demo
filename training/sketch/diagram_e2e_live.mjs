// Run from the repository root: playwright-cli -s=SESSION run-code --filename training/sketch/diagram_e2e_live.mjs
// Open the deployed page first; add ?models=rules,vss,neural,combined,modernbert only when that reader is deployed.
// The returned record is evidence for a human per-action assessment, not an automatic pass or score.
async page => {
  const record = { status: 'incomplete', started: new Date().toISOString(), failures: [], cases: [], assessment: 'pending: compare each action with the evidence; wires alone do not prove execution' };
  const requests = [];
  const onResponse = r => requests.push({ url: r.url(), status: r.status() });
  page.on('response', onResponse);
  try {
    // Playwright uploads the local, reviewed fixture into a temporary DOM input; it does not alter the application state.
    await page.evaluate(() => { const input = document.createElement('input'); input.type = 'file'; input.id = 'e2e-fixture-input'; input.hidden = true; document.body.appendChild(input); });
    await page.locator('#e2e-fixture-input').setInputFiles('training/sketch/diagram_e2e_cases.json');
    record.fixture = JSON.parse(await page.locator('#e2e-fixture-input').evaluate(e => e.files[0].text()));
    await page.locator('#e2e-fixture-input').evaluate(e => e.remove());
    const url = new URL(page.url());
    if (!/^https?:$/.test(url.protocol)) throw new Error('Open the deployed page in this session before running.');
    const expected = (url.searchParams.get('models') || 'rules,vss,neural,combined').split(',').map(s => s.trim()).filter(Boolean);
    if (!expected.length || new Set(expected).size !== expected.length || expected.some(x => !/^[a-z][a-z0-9_-]*$/.test(x))) throw new Error('Invalid models query parameter');
    record.url = url.href; record.expectedReaders = expected;
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(ids => ids.every(id => { const t = document.querySelector(`[data-rtab="${id}"]`); return t && !t.classList.contains('off'); }), expected, { timeout: 900000 });
    await page.waitForFunction(() => document.querySelectorAll('#msgs .b.bot').length >= 1 + (window.StartDiagram ? window.StartDiagram.MESSAGES.length : 3) && !document.querySelector('#msgs .typing'), null, { timeout: 240000 });
    record.startup = await page.evaluate(() => ({ tabs: [...document.querySelectorAll('[data-rtab]')].map(t => ({ id: t.dataset.rtab, text: t.textContent.trim(), off: t.classList.contains('off'), selected: t.getAttribute('aria-selected') })), turn: window.SketchpadInfo.turn(), scripts: [...document.scripts].map(s => s.src).filter(Boolean), resources: performance.getEntriesByType('resource').map(r => r.name), startSop: window.StartDiagram && window.StartDiagram.SOP }));
    if (record.startup.tabs.find(t => t.selected === 'true')?.id !== 'combined') throw new Error('The page did not start on the combined reader; restore the default before running.');
    const snapshot = async () => {
      const readers = {};
      for (const id of expected) {
        await page.locator(`[data-rtab="${id}"]`).click();
        await page.locator('[data-sub="drawing"]').click();
        const drawing = await page.evaluate(id => ({ svg: document.querySelector('#canvas')?.outerHTML || null, shapes: [...document.querySelectorAll('#layer .shp[data-name]')].map(e => ({ name: e.dataset.name, svg: e.outerHTML })), edges: [...document.querySelectorAll('#layer .edge[data-edge]')].map(e => ({ id: e.dataset.edge, svg: e.outerHTML })), area: window.SketchpadInfo.area(id) }), id);
        await page.locator('[data-sub="sop"]').click();
        readers[id] = { drawing, sop: await page.locator('#rpanel pre.sop').innerText() };
      }
      await page.locator('[data-rtab="combined"]').click();
      await page.locator('[data-sub="drawing"]').click();
      return readers;
    };
    record.initial = await snapshot();
    // Every reader should begin with the same StartDiagram; stop rather than compare unequal worlds.
    const initialSops = expected.map(id => record.initial[id].sop);
    if (new Set(initialSops).size !== 1) throw new Error('Initial reader SOP drawings differ; inspect initial evidence before comparing.');
    for (const test of record.fixture.cases) {
      const item = { id: test.id, text: test.text, actions: test.actions, assessment: 'pending', beforeRef: record.cases.length ? record.cases[record.cases.length - 1].id : 'initial' };
      record.cases.push(item);
      const beforeTurn = await page.evaluate(() => window.SketchpadInfo.turn());
      const count = await page.locator('#msgs .b.bot').count();
      const started = Date.now();
      await page.locator('#say').fill(test.text);
      await page.locator('#send-btn').click();
      await page.waitForFunction(n => document.querySelectorAll('#msgs .b.bot').length > n && !document.querySelector('#msgs .typing'), count, { timeout: 240000 });
      item.elapsedMs = Date.now() - started;
      item.reply = await page.locator('#msgs .b.bot').last().evaluate(b => ({ text: b.innerText, html: b.outerHTML }));
      item.steps = await page.evaluate(n => ({ turn: window.SketchpadInfo.turn(), readers: window.SketchpadInfo.steps(n) }), beforeTurn);
      const detailsButton = page.locator('#msgs .b.bot').last().locator('[data-turn]');
      if (await detailsButton.count()) {
        await detailsButton.click();
        item.details = await page.locator('#sbody').evaluate(e => ({ text: e.innerText, html: e.innerHTML, sections: [...e.querySelectorAll('.rdsec')].map(s => ({ text: s.innerText, html: s.outerHTML })) }));
        await page.locator('#close-sheet').click();
      } else item.details = null;
      item.after = await snapshot();
    }
    record.status = 'captured; assessment pending';
  } catch (e) {
    record.failures.push(String(e && e.stack || e));
  } finally {
    page.off('response', onResponse);
    record.responses = requests;
    record.finished = new Date().toISOString();
    // The CLI may truncate large results. Save the complete JSON through a browser download as well.
    try {
      const path = '/tmp/diagram-e2e-' + record.started.replace(/[^0-9]/g, '') + '.json';
      record.downloadPath = path;
      const download = page.waitForEvent('download', { timeout: 15000 });
      await page.evaluate(data => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'diagram-e2e-record.json'; document.body.appendChild(a); a.click(); a.remove(); }, record);
      await (await download).saveAs(path);
    } catch (e) { record.failures.push('Record download failed: ' + String(e)); record.status = 'incomplete'; }
  }
  return record;
}
