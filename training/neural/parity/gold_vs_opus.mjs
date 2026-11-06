// gold_vs_opus.mjs: are the annotated scene folders label-compatible with the Opus 5.5 translations, and with any other annotation of the same texts?
// Each annotated turn runs on a copy of the Opus drawing before that turn and is compared with what the Opus program does, and with GPT.
//   node training/neural/parity/gold_vs_opus.mjs                 the folders scenes_r3, scenes_r3b, scenes_test
//   node training/neural/parity/gold_vs_opus.mjs DIR...          every *.jsonl in DIR (the annotation pilot: one row per turn with id, text, wires)
//   SHOW=n: print the first n turns that differ from Opus.
// The program comes from parity_lib.mjs goldProgram, as the scene harness builds it: a resize with a shrink word and no scale gets scale=0.67. A reader's decode has
// no such rule, so that rule is credited to the labels here (5 turns of scenes_r3, 1 of scenes_test) and not to a reader.
import fs from 'node:fs';
import { K, ROOT, examples, teachers, fresh, run, copyWorld, renameNodes, renamesBtoA, diffs, same, multisetEq, answers, errorsOf, goldProgram, cp, pct, STRICT, LOOSE } from './parity_lib.mjs';

const given = process.argv.slice(2), S = ROOT + '/training/sketch/';
const folders = given.length ? given : ['llm_train/scenes_r3', 'llm_train/scenes_r3b', 'llm_bench/scenes_test'].map(d => S + d);
const T = await teachers();
for (const dir of folders) {
  // rows whose id names an example turn ("winter#1") are looked up by that id; the annotated folders by text, each row once ("Clear the canvas" opens every scene)
  const byId = new Map(), byText = new Map();
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.jsonl'))) for (const l of fs.readFileSync(dir + '/' + f, 'utf8').split('\n').filter(x => x.trim())) {
    const m = JSON.parse(l);
    if (String(m.id).includes('#')) byId.set(m.id, m); else byText.set(m.text, m);
  }
  const c = { turns: 0, asOpusLoose: 0, asOpusStrict: 0, asGptLoose: 0, either: 0, parseErrors: 0, engineErrors: 0, consensus: 0, consensusRight: 0 }, miss = [], kinds = {};
  for (const ex of examples()) {
    let O = fresh(ex), G = fresh(ex);
    ex.turns.forEach((text, i) => {
      if (ex.kind === 'quick') { O = fresh(ex); G = fresh(ex); }
      const o = T.opus(ex, i), g = T.gpt(ex, i), gText = (g.nodes || []).map(K.serialize).join('\n');
      const row = byId.get(o.id) || byText.get(text);
      if (row) byText.delete(text);
      const A = copyWorld(O), SG = copyWorld(O), rGtf = run(SG, renameNodes(K.parse(gText), renamesBtoA(O, G)).nodes), turn = { base: cp(O.world.state), text };
      let nodes = [], perr = null, prog = '';
      if (row) { try { prog = goldProgram(row.wires || []); nodes = K.parse(prog); } catch (e) { perr = String(e.message || e); } }
      const rA = run(A, nodes), rO = run(O, K.parse(o.program || ''));
      run(G, K.parse(gText));
      if (!row) return;
      c.turns++;
      if (perr) c.parseErrors++;
      if (errorsOf(rA).length) c.engineErrors++;
      const asO = t => same(diffs(O.world.state, A.world.state, t, turn)) && multisetEq(answers(rO), answers(rA)), asG = t => same(diffs(SG.world.state, A.world.state, t, turn)) && multisetEq(answers(rGtf), answers(rA));
      const teachersAgree = same(diffs(O.world.state, SG.world.state, LOOSE, turn)) && multisetEq(answers(rO), answers(rGtf));
      if (asO(LOOSE)) c.asOpusLoose++;
      if (asO(STRICT)) c.asOpusStrict++;
      if (asG(LOOSE)) c.asGptLoose++;
      if (asO(LOOSE) || asG(LOOSE)) c.either++;
      if (teachersAgree) { c.consensus++; if (asO(LOOSE)) c.consensusRight++; }
      if (!asO(LOOSE)) {
        const dd = diffs(O.world.state, A.world.state, LOOSE, turn);
        for (const k of Object.keys(dd)) kinds[k] = (kinds[k] || 0) + 1;
        if (!Object.keys(dd).length) kinds.answer = (kinds.answer || 0) + 1;
        miss.push(`${o.id} | ${text.slice(0, 70)} | got ${prog.replace(/\n/g, ' ;; ').slice(0, 110)} | opus ${String(o.program).replace(/\n/g, ' ;; ').slice(0, 110)}`);
      }
    });
  }
  console.log(`${dir.split('/').slice(-2).join('/')}: ${c.turns} turns; same effect as Opus: loose ${c.asOpusLoose} = ${pct(c.asOpusLoose, c.turns)}, strict ${c.asOpusStrict} = ${pct(c.asOpusStrict, c.turns)}; as GPT, loose ${pct(c.asGptLoose, c.turns)}; as either, loose ${c.either} = ${pct(c.either, c.turns)}; where the two teachers agree (${c.consensus}): ${c.consensusRight} = ${pct(c.consensusRight, c.consensus)}; parse errors ${c.parseErrors}, turns with engine errors ${c.engineErrors}`);
  console.log('   differences:', JSON.stringify(kinds));
  if (process.env.SHOW) for (const m of miss.slice(0, +process.env.SHOW)) console.log('   -', m);
}
