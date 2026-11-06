// free_run_set.mjs: the plan's session measure (M0.5, as free_run.mjs): each reader on its OWN drawing. A step is read with the names of the reader's
// own drawing and what its own previous step touched; what it executes is played on that drawing, so a mistake carries forward. The gold (and gpt's
// gold for nl_*) is played on its own drawing. At the end: the share of what the session changed beyond its setup that the reader changed the same
// way, shapes / arrows / groups, the same over the whole drawing, whether the whole drawing is the same, and whether the answers of the gold's
// question steps are the same (session_lib.mjs). A reader that executes nothing is the floor, beside every number.
//   READER=modernbert|sop|rules [MODEL=folder] [THREADS=n] node free_run_set.mjs [--confidence CONFIDENCE.json] OUT.json SET...
// Modes: all (every request executed) and, with --confidence, gate (what the confidence file's cost-10 level lets through, neural-confidence.js gate).
// The per-request measure with the gold context is score_arm.mjs `sessions`. Steps after the first unreliable one of a session are left out.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { K, ROOT, run, cp, touched } from './parity_lib.mjs';
import { nextContext } from '../../../docs/js/vss-composer.js';
import * as NC from '../../../docs/js/neural-confidence.js';
import { digest, hashFile } from '../calibrate_modernbert.mjs';
import { loadSets, sessionsOf, contextNames } from './sets.mjs';
import { startSystem, playGold } from './arm_lib.mjs';
import { compareFinal, questionStep, aggregateSessions, reliableSteps } from './session_lib.mjs';
import { loadNeural, filesOf } from './collect_set.mjs';

const names = S => S.world.state.shapes.map(s => s.name).concat((S.world.state.groups || []).map(g => g.name));
const errCount = res => (res.errors || []).length + (res.thrown ? 1 : 0);

async function main() {
  const args = process.argv.slice(2), pos = []; let confFile = null;
  for (let i = 0; i < args.length; i++) { if (args[i] === '--confidence') confFile = args[++i]; else if (args[i].startsWith('--')) throw new Error('Unknown flag ' + args[i]); else pos.push(args[i]); }
  const [out, ...setNames] = pos, reader = process.env.READER;
  if (!['modernbert', 'sop', 'rules'].includes(reader) || !out || !setNames.length) throw new Error('READER=modernbert|sop|rules [MODEL=folder] node free_run_set.mjs [--confidence CONF.json] OUT.json SET...');
  const folder = reader === 'rules' ? null : process.env.MODEL && resolve(process.env.MODEL);
  if (reader !== 'rules' && !folder) throw new Error('MODEL=folder is required for READER=' + reader);
  if (confFile && reader === 'rules') throw new Error('The Rules have no confidence');
  const spec = confFile ? JSON.parse(readFileSync(confFile, 'utf8')) : null, modelFiles = folder ? filesOf(folder) : null, artifacts = modelFiles ? digest(JSON.stringify(modelFiles)) : 'rules';
  if (spec && spec.artifacts !== artifacts) throw new Error('The confidence file was fitted for other model files than MODEL holds');
  const sets = loadSets(setNames), calSets = spec ? spec.arm?.cal_sets || [] : [];
  const N = reader === 'rules' ? null : await loadNeural(folder);
  const modes = ['all', ...(spec ? ['gate'] : [])], result = { schema: 'arm-free-run-v1', reader, model: folder, model_files_sha256: artifacts, confidence_file: confFile, calibrated_on: calSets, threshold_cost10: spec ? spec.levels_out_of_fold.cost.threshold : null,
    code: { 'free_run_set.mjs': hashFile(fileURLToPath(import.meta.url)) }, sets: {}, notes: ['Each reader reads its own drawing; the shares count only what the session changed beyond its setup (session_lib.mjs); do_nothing_floor is a reader that executes nothing.'] };
  const t0 = Date.now(); let steps = 0;
  try {
    for (const set of sets) {
      const byPart = new Map();
      for (const { session, items } of sessionsOf(set.items)) {
        const { steps: rows, leftOut } = reliableSteps(items);
        if (!rows.length) continue;
        const part = rows[0].part, first = rows[0], G = startSystem(first.setup), Gx = rows.every(r => r.altWires) ? startSystem(first.setup) : null, setup = cp(G.s.world.state);
        const runs = Object.fromEntries([...modes, 'floor'].map(m => [m, { R: startSystem(first.setup), last: [], questions: [], errors: 0 }]));
        let soFar = '', goldErrors = G.errors.length;
        for (const r of rows) {
          soFar += ' ' + r.text;
          const gres = playGold(G.s, r.wires); goldErrors += errCount(gres);
          if (Gx) playGold(Gx.s, r.altWires);
          for (const m of modes) {
            const st = runs[m], ctx = { names: names(st.R.s), last: st.last.slice() };
            let nodes;
            try {
              if (reader === 'rules') { const s = K.createSystem(); s.world.state = cp(st.R.s.world.state); nodes = s.formalize(r.text, ctx).nodes; }
              else { const o = await N.neural.formalize(r.text, ctx, { update: nextContext, signals: true }); nodes = m === 'gate' ? NC.gate(spec, o, 'cost').executed : o.nodes; }
            } catch (e) { nodes = []; st.errors++; }
            const rres = run(st.R.s, cp(nodes)); st.errors += errCount(rres); st.last = touched(st.R.s, rres); st.questions.push(questionStep(gres, rres));
          }
          runs.floor.questions.push(questionStep(gres, { steps: [] }));
          if (++steps % 100 === 0) console.error(`${steps} steps (${reader}${folder ? ', ' + folder.split('/').pop() : ''}), ${((Date.now() - t0) / 1000).toFixed(0)} s`);
        }
        for (const m of [...modes, 'floor']) {
          const st = runs[m], ent = ((byPart.get(part) || byPart.set(part, {}).get(part))[m] ||= { list: [], left: 0 });
          ent.list.push({ session, steps: rows.length, ...compareFinal(G.s.world.state, Gx && Gx.s.world.state, st.R.s.world.state, setup, soFar), questions: st.questions, engine_errors: st.errors, gold_errors: goldErrors });
          ent.left += leftOut;
        }
      }
      for (const [part, ms] of byPart) {
        const use = part === 'calibration' ? (calSets.includes(set.name) ? 'fit' : 'calibration-part') : 'evaluation', o = (result.sets[set.name] ||= {})[part] = { use, modes: {} };
        for (const m of modes) o.modes[m] = aggregateSessions(ms[m].list, ms[m].left);
        o.do_nothing_floor = { ...aggregateSessions(ms.floor.list, ms.floor.left), per_session: undefined };
      }
    }
  } finally { if (N) await N.dispose(); }
  writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
  for (const [set, parts] of Object.entries(result.sets)) for (const [part, p] of Object.entries(parts)) for (const [m, a] of Object.entries(p.modes))
    console.log(`${set}/${part} [${p.use}] ${m}: ${a.sessions} sessions, same drawing ${a.same_final_drawing}, changed-by-session shares ${JSON.stringify(a.mean_share_percent_of_what_the_session_changed)}, answers ${a.questions_same_answer}/${a.questions_with_a_gold_answer}; floor ${JSON.stringify(p.do_nothing_floor.mean_share_percent_of_what_the_session_changed)}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
