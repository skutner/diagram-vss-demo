// session_lib.mjs: how a reader's drawing at the end of a session is compared with the teachers', shared by score_arm.mjs (each request read in
// the gold context, played on the reader's own drawing) and free_run_set.mjs (the reader reads its own drawing, a mistake carrying forward).
//  - only what the session itself changed beyond its setup counts (a shape, an arrow, a group the setup already holds does not): a reader that does
//    nothing starts from the setup and would share a third or more of every final drawing with the gold;
//  - a setup shape the session deleted counts as a change (a marker that both drawings must hold);
//  - the answers of the questions a step asks are compared (parity_lib answers), step by step.
import { finalShares, meanShares, same, diffs, answers, multisetEq, LOOSE } from './parity_lib.mjs';

const lc = s => String(s).toLowerCase();
const dimsOf = s => [s.w ?? s.size, s.h ?? s.size];
const SHAPE_KEYS = ['shape', 'color', 'outline', 'label', 'fill', 'layer'];
const edgeKey = e => [e.from, e.to, e.style ?? null, e.arrow ?? null, e.label ?? null, e.color ?? null].map(x => lc(x ?? '')).join('|');
const groupKey = g => lc(g.name) + ':' + g.members.map(lc).sort().join(',');

/** the part of a final drawing that differs from the setup: new or changed shapes (and a marker for every setup shape that is gone), new arrows,
 *  new groups -> a drawing state finalShares and diffs read */
export function changedBeyond(setup, fin) {
  const before = new Map((setup.shapes || []).map(s => [lc(s.name), s])), after = new Set(fin.shapes.map(s => lc(s.name)));
  const shapes = fin.shapes.filter(s => {
    const p = before.get(lc(s.name));
    if (!p) return true;
    const [w, h] = dimsOf(s), [pw, ph] = dimsOf(p);
    return SHAPE_KEYS.some(k => (s[k] ?? null) !== (p[k] ?? null)) || Math.abs(w - pw) > 1 || Math.abs(h - ph) > 1 || Math.hypot(s.x - p.x, s.y - p.y) > 1;
  });
  for (const [n, p] of before) if (!after.has(n)) shapes.push({ name: `(deleted) ${p.name}`, shape: 'deleted', color: null, x: 0, y: 0, size: 1 });
  const left = new Map(); for (const e of setup.edges || []) left.set(edgeKey(e), (left.get(edgeKey(e)) || 0) + 1);
  const edges = fin.edges.filter(e => { const k = edgeKey(e), n = left.get(k) || 0; if (n > 0) { left.set(k, n - 1); return false; } return true; });
  const had = new Set((setup.groups || []).map(groupKey)), groups = (fin.groups || []).filter(g => !had.has(groupKey(g)));
  return { shapes, edges, groups, rules: [] };
}
const sum = s => ['shapes', 'arrows', 'groups'].reduce((t, k) => t + (s[k].total ? s[k].same / s[k].total : 0), 0);
/** the final drawings of a reader (R), the gold (G) and the second teacher's gold (Gx or null), from one setup state -> the share of what the
 *  session changed that the reader changed the same way (the teacher it is closer to), the same over the whole drawing, and whether the whole
 *  drawing is the same */
export function compareFinal(G, Gx, R, setupState, soFar) {
  const pick = (a, b) => (b && sum(b) > sum(a) ? b : a);
  const sc = pick(finalShares(changedBeyond(setupState, G), changedBeyond(setupState, R), LOOSE), Gx && finalShares(changedBeyond(setupState, Gx), changedBeyond(setupState, R), LOOSE));
  const sw = pick(finalShares(G, R, LOOSE), Gx && finalShares(Gx, R, LOOSE));
  return { shares: sc, shares_whole_drawing: sw, same_final_drawing: same(diffs(G, R, LOOSE, { text: soFar })) || (Gx ? same(diffs(Gx, R, LOOSE, { text: soFar })) : false) };
}
/** one step's questions: null when the gold asks none, else whether the reader's answers are the same (the multiset of the answers) */
export function questionStep(goldRes, readerRes) {
  const g = answers(goldRes);
  return g.length ? multisetEq(g, answers(readerRes)) : null;
}
/** the sessions of a part -> the summary of the report. each: {session, steps, shares, shares_whole_drawing, same_final_drawing, questions: [null|bool], engine_errors} */
export function aggregateSessions(list, leftOut = 0) {
  const r4 = x => (x == null ? null : Math.round(x * 1e6) / 1e6), m = meanShares(list.map(s => s.shares)), w = meanShares(list.map(s => s.shares_whole_drawing));
  const q = list.flatMap(s => s.questions).filter(x => x !== null);
  return { sessions: list.length, same_final_drawing: list.filter(s => s.same_final_drawing).length,
    mean_share_percent_of_what_the_session_changed: { shapes: r4(m.shapes), arrows: r4(m.arrows), groups: r4(m.groups) },
    mean_share_percent_whole_drawing: { shapes: r4(w.shapes), arrows: r4(w.arrows), groups: r4(w.groups) },
    questions_with_a_gold_answer: q.length, questions_same_answer: q.filter(Boolean).length,
    steps_left_out_as_unreliable: leftOut, engine_errors: list.reduce((n, s) => n + s.engine_errors, 0), per_session: list };
}
/** the steps of a session that count: those before the first unreliable one (a failed step before it made the gold drawing only a best replay) */
export function reliableSteps(rows) {
  const all = rows.slice().sort((a, b) => (a.step ?? 0) - (b.step ?? 0)), bad = all.findIndex(r => r.unreliable);
  return { steps: bad < 0 ? all : all.slice(0, bad), leftOut: bad < 0 ? 0 : all.length - bad };
}
