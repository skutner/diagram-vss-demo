// test_saved_sop_ui.mjs: the tab of the saved SOP Lang translations (docs/js/ui.js "Saved translations", docs/js/saved-sop.js) in a real
// browser (Playwright, Chromium), as a person uses the page. It serves docs/ on a free local port (node:http, nothing installed). The other
// readers load as they can (VSS from the site; SOP-BERT and ModernBERT need their model files and the transformers.js CDN, and may not load
// here: the checks do not need them). Checks:
//   1. the tab is right after Qwen3, named after the manifest's model; it is ready at once; the opening message is "Not played"
//   2. every quick example from the + menu is played from its saved program (the SOP Lang one runs as SOP Lang), by its button's place
//   3. a typed message is not played, even with the words of an example; the tab's drawing does not change, the Rules tab's does
//   4. a scenario played twice: the second play's renames reach the saved names (CEO -> CEO2) and never the labels ("CEO" stays)
//   5. Step through: Next plays one saved turn at a time
//   6. Edit a copy and your own script: no turn is played; a stale text (the page's example text changed) is not played
//   7. the toolbar's Undo, Redo and Clear (SOP Lang) work in the tab's own world; Align never copies into or out of it
//   8. details and Settings: the program, its file and lines, the provenance; "Not live inference"
//   9. a scene played to the end (Farm), and the Edit session scenario (undo inside a scenario): every step without an engine error
//  10. a manifest without an entry: "there is no saved translation", nothing executed
// Run: node training/sop-translations/test_saved_sop_ui.mjs [screenshot dir]     exit 1 on a failure
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const req = createRequire(import.meta.url);
const { chromium } = req('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), DOCS = path.join(ROOT, 'docs');
const SHOTS = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'saved-ui-'));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(DOCS, 'sop-translations/claude-opus-5-5/manifest.json'), 'utf8'));
const ID = 'claude-opus-5-5', K = req(path.join(ROOT, 'docs/js/logic.js'));
const canon = sop => K.parse(sop).map(K.serialize).join('\n');   // the engine writes a wire's keys in its own order
let n = 0, fails = 0;
const ok = (name, cond, extra) => { n++; if (!cond) fails++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond || extra === undefined ? '' : '\n     ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)).slice(0, 1500)}`); };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.md': 'text/markdown', '.sop': 'text/plain', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = path.join(DOCS, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(DOCS) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise(res => server.listen(0, '127.0.0.1', res));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
async function open(manifestFilter) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.route(/cdn\.jsdelivr\.net|huggingface\.co/, r => r.abort());   // no network: the transformer readers do not load here
  if (manifestFilter) await pg.route(/sop-translations\/claude-opus-5-5\/manifest\.json/, async r => { const m = JSON.parse(JSON.stringify(MANIFEST)); manifestFilter(m); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(m) }); });
  await pg.goto(BASE, { waitUntil: 'load' });
  await pg.waitForFunction(() => window.SketchpadInfo && window.SketchpadInfo.turn() >= 1 && window.SketchpadInfo.translationTurn(1) && window.SketchpadInfo.translationTurn(1).state, null, { timeout: 120000 });
  return { ctx, pg, errs };
}
const I = (pg, f, a) => pg.evaluate(([f, a]) => window.SketchpadInfo[f](a), [f, a]);
const turn = pg => pg.evaluate(() => window.SketchpadInfo.turn());
/** wait until message t has been read and the saved tab has its part of it; a turn that never gets there is a failure, not a crash */
async function settle(pg, t) {
  try { await pg.waitForFunction(t => window.SketchpadInfo.turn() >= t, t, { timeout: 120000 }); await pg.waitForFunction(t => { const s = window.SketchpadInfo.translationTurn(t); return s && s.state; }, t, { timeout: 120000 }); }
  catch (e) { ok(`message ${t} reached the saved tab (its part of the turn exists)`, false, String(e.message).split('\n')[0]); }
}
async function menu(pg) { await pg.click('#open-examples'); await pg.waitForSelector('#sbody [data-quick]'); }
async function playScenario(pg, id, how) {
  const before = await turn(pg), sc = await pg.evaluate(id => SCENARIOS.find(s => s.id === id).turns.length, id);
  await menu(pg); await pg.click(`[data-sc="${id}"][data-how="${how || 'play'}"]`);
  if ((how || 'play') === 'play') { await pg.waitForFunction(() => (document.querySelector('#player') || {}).textContent && document.querySelector('#player').textContent.includes('finished'), null, { timeout: 600000 }); await settle(pg, before + sc); }
  return { before, count: sc };
}
const shapesOf = async (pg, id) => (await I(pg, 'drawing', id)).shapes;
const names = shapes => shapes.map(s => s.name);

// ---------------------------------------------------------------- 1 + 2 + 3 + 7 + 8 + 10-ish on one page
{
  const { ctx, pg, errs } = await open();
  const tabs = await pg.evaluate(() => [...document.querySelectorAll('#rtabs [data-rtab]')].map(t => ({ id: t.dataset.rtab, label: t.textContent.trim(), off: t.classList.contains('off') })));
  const qi = tabs.findIndex(t => t.id === 'saved');   // the gpt-6.1-sol tab, the other saved translations, came first right after Qwen3
  ok('1. the tab right after Qwen3 and the gpt-6.1-sol tab is the Claude Opus 5.5 saved translations\' tab', qi >= 0 && tabs[qi - 1].id === 'qwen' && tabs[qi + 1] && tabs[qi + 1].id === ID, tabs);
  ok('1. it is named after the generation model of the manifest', tabs[qi + 1] && tabs[qi + 1].label === MANIFEST.model.name && MANIFEST.model.name === 'Claude Opus 5.5', [tabs[qi + 1], MANIFEST.model.name]);
  ok('1. the tabs before it are unchanged', tabs.slice(0, qi + 1).map(t => t.id).join() === 'combined,rules,vss,neural,modernbert,qwen,saved' && tabs.length === qi + 2, tabs.map(t => t.id));
  ok('1. it is ready at once (no model to load)', tabs[qi + 1] && !tabs[qi + 1].off);
  const t1 = await I(pg, 'translationTurn', 1);
  ok('1. the opening message is not played (not a built-in example)', t1.state === 'unavailable' && !t1.executed.length && /built-in examples/.test(t1.line && t1.line.text), t1);
  const open0 = names(await shapesOf(pg, ID));
  ok('1. its drawing is the opening drawing (run by every tab)', open0.join() === names(await shapesOf(pg, 'rules')).join() && open0.includes('Start'), open0);

  // 2. the quick examples, in the menu's order, by their buttons
  const quick = await pg.evaluate(() => [...document.querySelectorAll('[data-quick]')].length).catch(() => 0);
  await menu(pg);
  const QN = await pg.evaluate(() => document.querySelectorAll('#sbody [data-quick]').length);
  ok('2. the menu has 13 quick examples', QN === 13, QN);
  await pg.click('#close-sheet');
  for (let i = 0; i < QN; i++) {
    const t = (await turn(pg)) + 1;
    await menu(pg); await pg.click(`#sbody [data-example="quick:${i}"]`); await settle(pg, t);
    const s = await I(pg, 'translationTurn', t), e = MANIFEST.entries.find(x => x.id === `quick#${i + 1}`);
    const errsHere = s.steps.filter(x => x.error).map(x => x.error);
    if (e.status === 'direct') ok(`2. quick #${i + 1} (already SOP Lang) runs as SOP Lang in the tab`, s.raw && ['sop', 'direct'].includes(s.state) && s.executed.join('\n') === canon(e.program) && !errsHere.length, s);
    else ok(`2. quick #${i + 1} plays its saved program`, s.state === 'play' && s.entry && s.entry.id === `quick#${i + 1}` && s.executed.join('\n') === canon(e.program) && !errsHere.length && s.example.original === e.input, s);
  }
  const afterQuick = await I(pg, 'drawing', ID);
  ok('2. the quick examples changed the tab\'s drawing (Gem, End, the pink star, three red circles)', ['Gem', 'End'].every(x => afterQuick.shapes.some(s => s.name === x)) && afterQuick.shapes.filter(s => s.shape === 'star' && s.color === 'pink').length === 1 && afterQuick.shapes.filter(s => s.color === 'red' && s.shape === 'circle').length === 3 && afterQuick.rules.some(r => r.shape === 'circle' && r.color === 'orange'), names(afterQuick.shapes));

  // 3. typed messages
  const typedT = (await turn(pg)) + 1, before3 = names(await shapesOf(pg, ID));
  await pg.fill('#say', 'Draw a red circle named Typed'); await pg.press('#say', 'Control+Enter'); await settle(pg, typedT);
  const s3 = await I(pg, 'translationTurn', typedT);
  ok('3. a typed message is not played', s3.state === 'unavailable' && !s3.executed.length && !s3.example, s3);
  ok('3. the tab\'s drawing did not change', names(await shapesOf(pg, ID)).join() === before3.join());
  ok('3. the Rules tab drew it in its own drawing (independent worlds)', names(await shapesOf(pg, 'rules')).includes('Typed'));
  const sameT = (await turn(pg)) + 1;
  await pg.fill('#say', 'Describe the diagram'); await pg.press('#say', 'Control+Enter'); await settle(pg, sameT);
  const s3b = await I(pg, 'translationTurn', sameT);
  ok('3. a typed message with the very words of a quick example is not played (no lookup by text)', s3b.state === 'unavailable' && !s3b.executed.length, s3b);

  // the reading tabs still report an engine error in their reply (a regression guard for the shared reply code)
  const errT = (await turn(pg)) + 1; await pg.fill('#say', '@c1 command action=move target=Nowhere direction=up'); await pg.press('#say', 'Control+Enter'); await settle(pg, errT);
  const lineOf = (t, id) => pg.evaluate(([t, id]) => { const b = [...document.querySelectorAll('#msgs .b.bot')].find(x => x.querySelector(`[data-turn="${t}"]`)); const l = b && b.querySelector(`.rl[data-reader="${id}"] .t`); return l ? l.textContent : null; }, [t, id]);
  const rulesLine = await lineOf(errT, 'rules'), errS = await I(pg, 'translationTurn', errT);
  ok('3. a failing SOP Lang line: the Rules tab still reports the engine\'s error in its reply, and so does the saved tab', /There is no shape named "Nowhere"/.test(rulesLine || '') && errS.raw && errS.steps.some(x => /There is no shape named "Nowhere"/.test(x.error || '')), [rulesLine, errS.steps]);

  // 7. toolbar Undo / Redo / Clear in the tab's own world; Align
  await pg.click(`[data-rtab="${ID}"]`);
  const d0 = await I(pg, 'drawing', ID), u0 = d0.undo;
  let t7 = (await turn(pg)) + 1; await pg.click('[data-say="Undo"]'); await settle(pg, t7);
  const d1 = await I(pg, 'drawing', ID);
  ok('7. the toolbar\'s Undo (SOP Lang) undoes the tab\'s last change', d1.undo === u0 - 1 && JSON.stringify(d1.shapes) !== JSON.stringify(d0.shapes), [u0, d1.undo]);
  t7 = (await turn(pg)) + 1; await pg.click('[data-say="Redo"]'); await settle(pg, t7);
  ok('7. Redo brings it back', JSON.stringify((await I(pg, 'drawing', ID)).shapes) === JSON.stringify(d0.shapes));
  ok('7. Align is hidden while the tab is open', await pg.evaluate(() => document.getElementById('align-btn').hidden));
  await pg.click('[data-rtab="rules"]');
  const mine = JSON.stringify(await I(pg, 'drawing', ID)), alignShown = await pg.evaluate(() => !document.getElementById('align-btn').hidden);
  ok('7. Align is offered on the Rules tab (the typed messages made the reading tabs differ)', alignShown);
  if (alignShown) { await pg.click('#align-btn'); await pg.waitForTimeout(600); }
  const rs = await I(pg, 'drawing', 'rules'), vs = await I(pg, 'drawing', 'vss');
  ok('7. Align copied the Rules drawing to VSS and not into the saved tab', alignShown && JSON.stringify(rs.shapes) === JSON.stringify(vs.shapes) && JSON.stringify(await I(pg, 'drawing', ID)) === mine && JSON.stringify(rs.shapes) !== JSON.stringify(JSON.parse(mine).shapes));
  await pg.click(`[data-rtab="${ID}"]`);
  t7 = (await turn(pg)) + 1; await pg.click('[data-say="Clear the canvas"]'); await settle(pg, t7);
  ok('7. the toolbar\'s Clear empties the tab\'s drawing', (await shapesOf(pg, ID)).length === 0);

  // 8. details and Settings
  const qt = sameT - 1;   // the last quick example? use the first played quick turn instead
  await pg.click('#sbody', { trial: true }).catch(() => {});
  const firstQuick = 2;
  await pg.evaluate(t => document.querySelector(`#msgs [data-turn="${t}"]`) && document.querySelector(`#msgs [data-turn="${t}"]`).click(), firstQuick);
  await pg.waitForSelector('#sbody .rdsec');
  const det = await pg.evaluate(() => document.getElementById('sbody').innerText);
  const q1 = MANIFEST.entries.find(x => x.id === 'quick#1');
  ok('8. details show the saved program, its file and lines and the example', /Claude Opus 5\.5/.test(det) && /saved translation, nothing read/i.test(det) && det.includes(`quick.sop, lines ${q1.lines[0]}–${q1.lines[1]}`) && /Built-in example quick#1/.test(det) && /action=create shape=star/.test(det), det.slice(det.lastIndexOf('Claude Opus 5.5'), det.lastIndexOf('Claude Opus 5.5') + 900));
  await pg.click('#close-sheet');
  await pg.click('[data-sub="settings"]'); await pg.waitForFunction(() => /Saved programs/.test(document.getElementById('rpanel').innerText), null, { timeout: 30000 });
  const st = await pg.evaluate(() => document.getElementById('rpanel').innerText);
  ok('8. Settings say these are saved translations, not live inference, with the model and the coverage', /Not live inference/.test(st) && /Claude Opus 5\.5 \(claude-opus-5-5\)/.test(st) && new RegExp(`${MANIFEST.coverage.entries} of ${MANIFEST.inventory.occurrences}`).test(st), st.slice(0, 1500));
  await pg.click('[data-sub="sop"]'); await pg.waitForTimeout(200);
  const sop = await pg.evaluate(() => document.getElementById('rpanel').innerText);
  ok('8. the SOP Lang subtab shows the last saved program it played and the drawing as SOP', /The last saved program it played/i.test(sop) && /quick#12/.test(sop) && /question ask=describe/.test(sop) && /Its drawing/i.test(sop), sop.slice(0, 600));
  await pg.click('[data-sub="drawing"]');
  await pg.screenshot({ path: path.join(SHOTS, 'quick-and-toolbar.png') });
  ok('no page error (page 1)', !errs.length, errs);
  await ctx.close();
}

// ---------------------------------------------------------------- 4 + 5 + 6: scenarios, renames, step, edit, stale
{
  const { ctx, pg, errs } = await open();
  await pg.click(`[data-rtab="${ID}"]`);
  const a = await playScenario(pg, 'org');
  const first = await shapesOf(pg, ID);
  ok('4. Org chart plays from its saved programs', (await Promise.all(Array.from({ length: a.count }, (_, k) => I(pg, 'translationTurn', a.before + 1 + k)))).every(s => s.state === 'play' && !s.steps.some(x => x.error)));
  const b = await playScenario(pg, 'org');
  const turns2 = await Promise.all(Array.from({ length: b.count }, (_, k) => I(pg, 'translationTurn', b.before + 1 + k)));
  ok('4. the second play renames the clashing names in the saved programs', turns2[0].renamed.some(r => r.from === 'CEO' && r.to === 'CEO2') && turns2.every(s => s.state === 'play' && !s.steps.some(x => x.error)), turns2[0]);
  const second = await shapesOf(pg, ID), ceo2 = second.find(s => s.name === 'CEO2'), cto2 = second.find(s => s.name === 'CTO2');
  ok('4. the renamed shapes keep their labels ("CEO" on CEO2, "CTO" on CTO2)', ceo2 && ceo2.label === 'CEO' && cto2 && cto2.label === 'CTO', [ceo2, cto2]);
  ok('4. the first play\'s shapes are untouched', ['CEO', 'CTO', 'CFO', 'COO', 'Dev', 'Ops'].every(x => first.find(s => s.name === x) && JSON.stringify(first.find(s => s.name === x)) === JSON.stringify(second.find(s => s.name === x))));
  const d = await I(pg, 'drawing', ID), e2 = d.edges.filter(e => /2$/.test(e.from));
  ok('4. the second chart has its own 5 plain lines', e2.length === 5 && e2.every(e => e.arrow === 'none'), e2);
  const gpt = await Promise.all(Array.from({ length: b.count }, (_, k) => pg.evaluate(t => window.SketchpadInfo.savedTurn(t), b.before + 1 + k)));
  ok('4. the gpt-6.1-sol tab (the other saved translations) still plays the same turns from its own programs', gpt.every(x => x && !x.unavailable && x.evidence && ['supported', 'partial', 'noop'].includes(x.evidence.status)), gpt.map(x => x && x.evidence && [x.evidence.status, x.evidence.reason]));
  const rulesCeo2 = (await shapesOf(pg, 'rules')).find(s => s.name === 'CEO2');
  console.log(`     (for comparison, the Rules tab, which reads the renamed text, labels CEO2 ${JSON.stringify(rulesCeo2 && rulesCeo2.label)})`);
  const ans = turns2[5].steps.map(x => x.answer).join();
  ok('4. a question of the second play is answered about the renamed shapes', /CTO2 connects to Dev2 and Ops2/.test(ans), ans);

  // 5. Step through
  const t5 = await turn(pg);
  await menu(pg); await pg.click('[data-sc="login"][data-how="step"]'); await pg.waitForSelector('#player [data-pl="next"]');
  for (let k = 0; k < 3; k++) { await pg.click('#player [data-pl="next"]'); await settle(pg, t5 + 1 + k); }
  const s5 = await Promise.all([1, 2, 3].map(k => I(pg, 'translationTurn', t5 + k)));
  ok('5. Step through: Next plays one saved turn at a time', s5.every((s, k) => s.state === 'play' && s.entry.id === `login#${k + 1}`) && (await turn(pg)) === t5 + 3, s5.map(s => s.entry && s.entry.id));
  ok('5. Begin, Form and Valid are drawn', (await shapesOf(pg, ID)).filter(s => ['Begin', 'Form', 'Valid'].includes(s.name)).length === 3);
  await pg.click('#player [data-pl="close"]');

  // 6. Edit a copy, then play it: nothing is played
  const t6 = await turn(pg), shapes6 = names(await shapesOf(pg, ID));
  await menu(pg); await pg.click('[data-sc="traffic"][data-how="edit"]');
  await pg.click('[data-own="play"]');
  await pg.waitForFunction(() => document.querySelector('#player') && document.querySelector('#player').textContent.includes('finished'), null, { timeout: 120000 }); await settle(pg, t6 + 4);
  const s6 = await Promise.all([1, 2, 3, 4].map(k => I(pg, 'translationTurn', t6 + k)));
  ok('6. an edited copy of a scenario is not played (no provenance)', s6.every(s => s.state === 'unavailable' && !s.example && !s.executed.length), s6.map(s => s.state));
  ok('6. the tab drew nothing for it (the new area only)', names(await shapesOf(pg, ID)).filter(x => !shapes6.includes(x)).length === 0);
  // stale: the page's text of an example differs from the translated text
  await pg.evaluate(() => { SCENARIOS.find(s => s.id === 'star').turns[0] = 'Draw a huge gold star in the middle.'; });
  const t6b = await turn(pg); await playScenario(pg, 'star');
  const s6b = await I(pg, 'translationTurn', t6b + 1);
  ok('6. a stale text is not played (the example\'s text in the page changed)', s6b.state === 'unavailable' && /stale/.test(s6b.reason) && !s6b.executed.length, s6b);
  await pg.screenshot({ path: path.join(SHOTS, 'org-twice.png') });
  ok('no page error (page 2)', !errs.length, errs);
  await ctx.close();
}

// ---------------------------------------------------------------- 9: a scene to the end, and the Edit session (undo in a scenario)
{
  const { ctx, pg, errs } = await open();
  await pg.click(`[data-rtab="${ID}"]`);
  await pg.selectOption('#sc-delay', '0').catch(() => {});
  const f = await playScenario(pg, 'farm');
  const st = await Promise.all(Array.from({ length: f.count }, (_, k) => I(pg, 'translationTurn', f.before + 1 + k)));
  const bad = st.map((s, k) => ({ k: k + 1, s })).filter(x => x.s.steps.some(y => y.error) || !['play', 'noop'].includes(x.s.state));
  ok('9. Farm: every turn played (or a no-op) with no engine error', !bad.length, bad.slice(0, 3));
  const d = await I(pg, 'drawing', ID);
  ok('9. Farm: its groups and its renamed copy exist (Barn, Bessie, Ducky, TreeA, Chick; Cloud2)', ['Barn', 'Bessie', 'Ducky', 'TreeA', 'Chick'].every(g => d.groups.some(x => x.name === g)) && d.shapes.some(s => s.name === 'Cloud2'), d.groups.map(g => g.name));
  const gf = await Promise.all(Array.from({ length: f.count }, (_, k) => pg.evaluate(t => window.SketchpadInfo.savedTurn(t), f.before + 1 + k)));
  ok('9. Farm: the gpt-6.1-sol tab plays it too, beside this tab', gf.filter(x => x && !x.unavailable).length === f.count, gf.filter(x => !x || x.unavailable).slice(0, 2));
  ok('9. Farm: the last message is a no-op that says so', st[f.count - 1].state === 'noop' && /Nothing to do/.test(st[f.count - 1].line.text), st[f.count - 1]);
  await pg.screenshot({ path: path.join(SHOTS, 'farm.png') });
  const e = await playScenario(pg, 'story');
  const se = await Promise.all(Array.from({ length: e.count }, (_, k) => I(pg, 'translationTurn', e.before + 1 + k)));
  ok('9. Edit session: every turn played with no engine error', se.every(s => s.state === 'play' && !s.steps.some(x => x.error)), se.filter(s => s.steps.some(x => x.error)));
  ok('9. Edit session: "Undo." undid the swap (A is left of B again)', /Yes: A is left of B/.test(se[9].steps.map(x => x.answer).join()), se[9].steps);
  ok('no page error (page 3)', !errs.length, errs);
  await ctx.close();
}

// ---------------------------------------------------------------- 11: the engine's question in the saved tab takes no reply; renames of the saved tab alone
{
  const { ctx, pg, errs } = await open();
  await pg.click(`[data-rtab="${ID}"]`);
  await playScenario(pg, 'traffic');
  const t = (await turn(pg)) + 1; await menu(pg); await pg.click('#sbody [data-example="quick:1"]'); await settle(pg, t);
  const s = await I(pg, 'translationTurn', t), goSize = (await shapesOf(pg, ID)).find(x => x.name === 'Go').size;
  ok('11. quick #2 after Traffic light: the saved program meets two green circles; the tab says it cannot choose and takes no reply', s.state === 'play' && s.steps.some(x => /Which green circle/.test(x.error || '')) && /takes no reply/.test(s.line.text), s);
  const chips = await pg.evaluate(t => [...document.querySelectorAll('#msgs .b.bot')].filter(b => b.querySelector(`[data-turn="${t}"]`)).flatMap(b => [...b.querySelectorAll('[data-pick]')].map(c => c.textContent)), t);
  const t2 = t + 1; await pg.fill('#say', 'Go'); await pg.press('#say', 'Control+Enter'); await settle(pg, t2);
  const s2 = await I(pg, 'translationTurn', t2);
  ok('11. a typed name after it is not played in the saved tab (Go keeps its size), whatever the other tabs do with it', s2.state === 'unavailable' && !s2.executed.length && (await shapesOf(pg, ID)).find(x => x.name === 'Go').size === goSize, { s2, chips });
  // the Rules and VSS delete Stop, Wait and Go (Align makes VSS follow the Rules); the saved tabs (gpt-6.1-sol's and this one) keep them
  const t3 = (await turn(pg)) + 1; await pg.fill('#say', 'Delete Stop, Wait and Go'); await pg.press('#say', 'Control+Enter'); await settle(pg, t3);
  await pg.click('[data-rtab="rules"]'); if (await pg.evaluate(() => !document.getElementById('align-btn').hidden)) { await pg.click('#align-btn'); await pg.waitForTimeout(600); }
  const gone = !(await shapesOf(pg, 'rules')).some(x => x.name === 'Stop') && !(await shapesOf(pg, 'vss')).some(x => x.name === 'Stop') && (await shapesOf(pg, ID)).some(x => x.name === 'Stop');
  ok('11. set-up: the Rules and VSS no longer have Stop, the saved tab still has it', gone);
  await pg.click(`[data-rtab="${ID}"]`);
  const b = await playScenario(pg, 'traffic'), r1 = await I(pg, 'translationTurn', b.before + 1);
  const effName = (r1.typed.match(/named (\w+)/) || [])[1];
  ok('11. the text every tab reads is renamed by the page (the gpt-6.1-sol tab still has Stop), and the saved tab uses the same effective name', effName && effName !== 'Stop' && r1.renamed.some(x => x.from === 'Stop' && x.to === effName), [r1.typed, r1.renamed]);
  ok('11. the saved tab plays every turn with it', r1.renamed.some(x => x.from === 'Stop') && (await Promise.all([1, 2, 3, 4].map(k => I(pg, 'translationTurn', b.before + k)))).every(x => x.state === 'play' && !x.steps.some(y => y.error)) && (await shapesOf(pg, ID)).some(x => x.name === effName), r1);
  ok('no page error (page 5)', !errs.length, errs);
  await ctx.close();
}

// ---------------------------------------------------------------- 10: a manifest without one entry
{
  const { ctx, pg, errs } = await open(m => { m.entries = m.entries.filter(e => e.id !== 'traffic#2'); });
  const t = await turn(pg); await playScenario(pg, 'traffic');
  const s = await Promise.all([1, 2, 3, 4].map(k => I(pg, 'translationTurn', t + k)));
  ok('10. a missing translation is not played and says so; the others play', s[1].state === 'unavailable' && /no saved translation of traffic#2/.test(s[1].reason) && !s[1].executed.length && s[0].state === 'play', s.map(x => [x.state, x.reason]));
  ok('10. no fallback: the turns after it run with what exists (Wait and Go were never drawn)', !(await shapesOf(pg, ID)).some(x => x.name === 'Wait' || x.name === 'Go') && s[2].steps.some(x => x.error), s[2].steps);
  ok('no page error (page 4)', !errs.length, errs);
  await ctx.close();
}

await browser.close(); server.close();
console.log(`\n${n - fails}/${n} passed; screenshots in ${SHOTS}`);
process.exit(fails ? 1 : 0);
