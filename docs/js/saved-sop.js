/* saved-sop.js: the saved SOP Lang translations of the built-in examples (docs/sop-translations/<model>/manifest.json, built by
   training/sop-translations/build_manifest.mjs from the readable .sop files of that folder). The page's tab of the generation model plays
   them: it reads no message itself. Pure functions (no DOM); training/sop-translations/test_saved_sop.mjs runs them in node.
     load(url)            the manifest (fetched once, revalidated), with an index by occurrence id
     lookup(M, prov)      what the tab does with one message: play the saved program, or say why not (no example, missing, stale, no-op,
                          unsupported); prov = {example, turn (1-based), original (the example's text in the page's own source)} | null
     renameNodes(n, map)  the program with the names a played scenario renamed to avoid clashes (ui.js renamedForCanvas), on the keys that
                          hold names only: labels, texts and wire ids are never changed */
export const NAME_KEYS = ['name', 'target', 'from', 'to', 'anchor', 'anchor2', 'members', 'linked'];
const isRef = v => !!v && typeof v === 'object' && !Array.isArray(v) && typeof v.ref === 'string';

/** the manifest at url (cache: revalidated, so a new deployment is seen), checked and indexed -> M (the manifest + M.byId: Map) */
export async function load(url, fetchFn) {
  const r = await (fetchFn || fetch)(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return index(await r.json());
}
export function index(M) {
  if (!M || M.format !== 'sop-translations/1' || !Array.isArray(M.entries) || !M.model || !M.model.name) throw new Error('not a manifest of saved SOP Lang translations (format sop-translations/1)');
  Object.defineProperty(M, 'byId', { value: new Map(M.entries.map(e => [e.id, e])), enumerable: false });
  return M;
}
export const idOf = (example, turn) => `${example}#${turn}`;
const NOT_EXAMPLE = 'this tab plays only the saved translations of the built-in examples (the + menu: the quick examples, the scenarios and the scenes, played from the menu); it does not read typed messages, edited copies or your own scripts';

/** -> {state: 'play' | 'noop' | 'unsupported' | 'unavailable', entry (or null), reason (plain words), program (play: the SOP text)} */
export function lookup(M, prov) {
  if (!prov || !prov.example || !(prov.turn >= 1)) return { state: 'unavailable', entry: null, reason: NOT_EXAMPLE };
  const id = idOf(prov.example, prov.turn), e = M && M.byId ? M.byId.get(id) : null;
  if (!e) return { state: 'unavailable', entry: null, reason: `there is no saved translation of ${id}` };
  if (typeof prov.original !== 'string' || prov.original !== e.input) return { state: 'unavailable', entry: e, reason: `the text of ${id} in the page is not the text that was translated (stale translation): nothing was executed` };
  if (e.status === 'noop') return { state: 'noop', entry: e, reason: (e.notes.noop || []).join('; ') || 'the message asks for nothing to draw or answer' };
  if (e.status === 'unsupported') return { state: 'unsupported', entry: e, reason: (e.notes.unsupported || []).join('; ') || 'SOP Lang cannot express this request' };
  if (!e.program) return { state: 'unavailable', entry: e, reason: `the saved translation of ${id} has no wires` };
  return { state: 'play', entry: e, reason: null, program: e.program };
}

/** a value with the renamed names (a name, or a list of names; references and other values unchanged). Names are matched without regard
 *  to case, as the engine finds shapes (world.find): "stop" is the Stop that the scenario renamed */
function renameValue(v, map, hit) {
  if (Array.isArray(v)) return v.map(x => renameValue(x, map, hit));
  if (typeof v === 'string' && Object.prototype.hasOwnProperty.call(map, v.toLowerCase())) { hit.push([v, map[v.toLowerCase()]]); return map[v.toLowerCase()]; }
  return v;
}
/** nodes (parsed wires) -> {nodes: copies with every name-valued key renamed by map, renamed: [{wire, key, from, to}]} */
export function renameNodes(nodes, map) {
  const renamed = [];
  if (!map || !Object.keys(map).length) return { nodes, renamed };
  const low = Object.fromEntries(Object.entries(map).map(([a, b]) => [a.toLowerCase(), b]));
  const out = nodes.map(n => {
    const args = {};
    for (const [k, v] of Object.entries(n.args)) {
      if (!NAME_KEYS.includes(k) || isRef(v)) { args[k] = v; continue; }
      const hit = []; args[k] = renameValue(v, low, hit);
      for (const [from, to] of hit) renamed.push({ wire: n.id, key: k, from, to });
    }
    return { id: n.id, type: n.type, args };
  });
  return { nodes: out, renamed };
}
