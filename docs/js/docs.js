/* The Help overlay: a full-screen reader for the documentation, opened by the ? button above the drawing or by a link #help/<page>.
   Pages, in this order: Start here (the introduction), the editor and its language (docs/js/help.js, generated from the live engine), Why VSS-BERT (docs/js/docs-concepts.js:
   the goal, SOP-BERT, the data, VSS-BERT, asking, the Rules as a comparison) and How it works inside (docs/js/docs-arch.js, also shown as one
   page by docs/architecture.html). Removed pages keep working as links: ALIASES sends them to the page (and section) that took their place;
   a key "<page>/<section>" sends one moved section (the old Start here became Using the demo on 2026-11-03: #help/start/replies opens it).
   Every page ends with the credit line (HelpKit.CREDIT: Axiologic Research, the Achilles project), and the sidebar shows it too.
   Navigation is the browser's history: every page is an entry (#help/<page>, or #help/<page>/<anchor> for a section), so Back, Forward,
   reload and shared links work. Closing (✕ or Esc) goes back to the entry the overlay was opened from; an overlay opened by a link
   (reload, shared URL) has no such entry, so closing removes the #help part instead. While it is open the app behind it is inert.
   A sentence button (data-quick) closes the overlay and sends the sentence; a switch (data-plug) turns a capability on or off.
   The pages live in the same document as the app: an id of a page must not repeat an id of the app (index.html styles some ids,
   e.g. the drawing's svg #canvas; on 2026-11-02 <h2 id="canvas"> took that style and covered the sidebar). training/sketch/test_help_overlay.py checks it. */
(function (root) {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- the page list ---------------- */
const HELP = (root.HelpKit && root.HelpKit.pages) || {};
const GROUPS = [
  { title: 'Introduction', pages: [['start', 'Start here']].map(([id, title]) => ({ id, title, render: env => HELP[id](env) })) },
  { title: 'Using the editor', pages: [['using', 'Using the demo'], ['draw', 'What you can draw'], ['arrows', 'Arrows and lines'], ['where', 'Where things go'], ['do', 'Everything you can do'], ['templates', 'Templates'], ['ask', 'Everything you can ask'], ['limits', 'What it cannot do']].map(([id, title]) => ({ id, title, render: env => HELP[id](env) })) },
  { title: 'The language', pages: [['sop-lang', 'SOP Lang'], ['capabilities', 'Capabilities']].map(([id, title]) => ({ id, title, render: env => HELP[id](env) })) },
  { title: 'Why VSS-BERT', pages: ((root.DocsConcepts && root.DocsConcepts.pages) || []).map(p => ({ id: p.id, title: p.title, lead: p.lead, render: () => p.html })) },
  { title: 'How it works inside', pages: ((root.DocsArch && root.DocsArch.pages) || []).map(p => ({ id: p.id, title: p.title, lead: p.lead, render: () => p.html })) }
];
/* sidebar links that are not help pages: other pages of the site, listed at the end of their group. They open in a new tab (show() gives every
   link that does not start with # target=_blank) and are not part of Previous / Next or of the page routes.
   vss-explainer.html: the illustrated, plain-language explainer of the VSS reader (2026-11-04). */
const EXTRA_LINKS = { 'How it works inside': [{ href: 'vss-explainer.html', title: 'VSS, illustrated', note: 'Opens the illustrated explainer of the VSS reader in a new tab' }] };
const FLAT = [];
GROUPS.forEach(g => g.pages.forEach(p => { p.group = g.title; FLAT.push(p); }));
const BY = Object.fromEntries(FLAT.map(p => [p.id, p]));
const ROUTE = /^#help(?:\/([\w-]+))?(?:\/([\w-]+))?\/?$/;
/* pages removed on 2026-11-03 (the documentation restructured around VSS-BERT): a link to one opens the page that took its place */
const ALIASES = { 'why-three': ['rules-vs-learned'], knowing: ['history', 'h-confidence'], 'chain-vs-one': ['history', 'h-vss'],
  'fresh-writer': ['history', 'h-fresh'], 'three-readers': ['rules-vs-learned', 'rv-vote'] };
/* 2026-11-03: Start here became the introduction; its former content is the page Using the demo, so its old section links open there */
['readers', 'steps', 'replies', 'screen', 'next'].forEach(a => { ALIASES['start/' + a] = ['using', a]; });
ALIASES['using-the-demo'] = ['using'];
/** #help/<page>/<anchor> -> {id, anchor, missing}; null when the hash is not a help link */
function parse(hash) {
  const m = ROUTE.exec(hash || ''); if (!m) return null;
  const moved = m[1] && m[2] && ALIASES[m[1] + '/' + m[2]];
  if (moved && BY[moved[0]]) return { id: moved[0], anchor: moved[1] || null, missing: null };
  const al = m[1] && !BY[m[1]] && ALIASES[m[1]] && BY[ALIASES[m[1]][0]] ? ALIASES[m[1]] : null;
  if (al) return { id: al[0], anchor: al[1] || null, missing: null };
  return { id: m[1] && BY[m[1]] ? m[1] : 'start', anchor: m[2] || null, missing: m[1] && !BY[m[1]] ? m[1] : null };
}

/* ---------------- state ---------------- */
let opts = { env: () => ({}), say: () => {}, onPlug: () => {} };
let el = null, isOpen = false, closing = false, current = null, before = null, titleBefore = '';
const base = () => location.pathname + location.search;
const hist = () => history.state || {};

function els() {
  if (el) return el;
  el = { root: $('#docs'), nav: $('#docs-nav'), main: $('#docs-main'), page: $('#docs-page'), back: $('#docs-back'), close: $('#docs-close'), menu: $('#docs-menu-btn'), crumb: $('#docs-crumb'), app: $('.app') };
  return el;
}

const CREDIT = (root.HelpKit && root.HelpKit.CREDIT) || '';
function navHTML(cur) {
  return GROUPS.map(g => `<div class="dn-group"><p class="dn-title">${esc(g.title)}</p><ul>${g.pages.map(p => `<li><a href="#help/${p.id}"${p.id === cur ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`).join('')}`
      + (EXTRA_LINKS[g.title] || []).map(x => `<li><a href="${esc(x.href)}" title="${esc(x.note)}">${esc(x.title)}<span aria-hidden="true"> ↗</span></a></li>`).join('')
      + `</ul></div>`).join('')
    + (CREDIT ? `<p class="dn-credit" style="margin:18px 10px 0;font-size:12.5px;line-height:1.45;color:var(--muted)">${CREDIT.replace(/<a /g, '<a style="display:inline;padding:0;font-size:inherit;color:var(--link);text-decoration:underline;white-space:nowrap" ')}</p>` : '');
}
function pageHTML(p, missing) {
  let body;
  try { body = p.render(opts.env()); }
  catch (e) { console.error(e); body = `<p class="errt">This page could not be built: ${esc(e && e.message || e)}</p>`; }
  const i = FLAT.indexOf(p), prev = FLAT[i - 1], next = FLAT[i + 1];
  return `${missing ? `<p class="callout warn">There is no help page “${esc(missing)}”. Here is the start page; the list of pages is in the menu.</p>` : ''}
  <header class="doc-head"><p class="doc-kicker">${esc(p.group)}</p><h1 id="docs-title" tabindex="-1">${esc(p.title)}</h1>${p.lead ? `<p class="lead">${esc(p.lead)}</p>` : ''}</header>
  ${body}
  <nav class="doc-pn" aria-label="Previous and next page">${prev ? `<a class="prev" href="#help/${prev.id}"><span>Previous</span>${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="next" href="#help/${next.id}"><span>Next</span>${esc(next.title)}</a>` : '<span></span>'}</nav>
  ${CREDIT ? `<footer class="doc-credit note">${CREDIT}</footer>` : ''}`;
}

/** draw a route into the overlay (opening it if needed); y: the scroll position to restore */
function show(route, y) {
  const E = els(); if (!E.root) return;
  const p = BY[route.id]; current = route.id;
  if (!isOpen) {
    isOpen = true; before = document.activeElement; titleBefore = document.title;
    E.root.hidden = false; if (E.app) E.app.inert = true;
    document.documentElement.classList.add('docs-open');
  }
  E.root.classList.remove('menu-open'); if (E.menu) E.menu.setAttribute('aria-expanded', 'false');
  E.nav.innerHTML = navHTML(p.id);
  E.page.innerHTML = pageHTML(p, route.missing);
  [...E.page.querySelectorAll('a[href]'), ...E.nav.querySelectorAll('a[href]')].forEach(a => { const h = a.getAttribute('href'); if (!h.startsWith('#')) { a.target = '_blank'; a.rel = 'noopener'; } });
  if (E.crumb) E.crumb.textContent = p.title;
  E.back.hidden = !((hist().help || 0) > 1);
  document.title = `${p.title} · Help · SOP Sketchpad`;
  // the anchor is looked up inside the page: an id of the app behind the overlay (canvas, docs, ...) must not hide it
  const a = route.anchor && E.page.querySelector(`[id="${route.anchor}"]`);
  if (a) a.scrollIntoView({ block: 'start' }); else E.main.scrollTop = y || 0;
  const cur = E.nav.querySelector('[aria-current]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
  const h1 = $('#docs-title'); if (h1) h1.focus({ preventScroll: true });
}
function hide() {
  const E = els(); if (!isOpen) return;
  isOpen = false; closing = false; current = null;
  E.root.hidden = true; E.root.classList.remove('menu-open'); if (E.app) E.app.inert = false;
  document.documentElement.classList.remove('docs-open');
  document.title = titleBefore || document.title;
  E.page.innerHTML = '';
  if (before && before.focus && document.contains(before)) before.focus({ preventScroll: true });
}

/** go to a help link: a new history entry, so Back returns here */
function navigate(hash) {
  const r = parse(hash); if (!r) return;
  const st = hist();
  if (isOpen && st.help) {
    history.replaceState(Object.assign({}, st, { y: els().main.scrollTop }), '');
    // browsers keep about 50 entries; past 40 help pages the newest entry is replaced, so the entry the overlay was opened from stays reachable
    if (st.help >= 40) history.replaceState({ help: st.help, deep: !!st.deep }, '', hash);
    else history.pushState({ help: st.help + 1, deep: !!st.deep }, '', hash);
  } else history.pushState({ help: 1 }, '', hash);
  show(r, 0);
}
function open(id, anchor) { navigate('#help/' + (id && (BY[id] || ALIASES[id]) ? id : 'start') + (anchor ? '/' + anchor : '')); }
/** close: back to the entry before the first help page, or drop the #help part when the overlay was opened by a link */
function close() {
  if (!isOpen) return;
  const st = hist(), n = st.deep ? (st.help || 1) - 1 : (st.help || 0);
  if (n > 0) {
    closing = true; history.go(-n);
    // the browser keeps at most about 50 entries: when the first help entry is gone, go() does nothing and no popstate comes
    setTimeout(() => { if (closing && isOpen) { history.replaceState(null, '', base()); hide(); } }, 400);
  } else { history.replaceState(null, '', base()); hide(); }
}
function rerender() { if (!isOpen || !current) return; const y = els().main.scrollTop; show({ id: current }, y); }

window.addEventListener('popstate', () => {
  const r = parse(location.hash), st = hist();
  if (closing && st.deep) { history.replaceState(null, '', base()); hide(); return; }
  if (r && !closing) show(r, st.y); else hide();
});
window.addEventListener('hashchange', () => {   // a #help link typed or followed outside the overlay (no state yet)
  if (isOpen || closing) return;
  const r = parse(location.hash); if (!r) return;
  history.replaceState({ help: 1 }, ''); show(r, 0);
});

function init(o) {
  opts = Object.assign(opts, o || {});
  const E = els(); if (!E.root) return;
  E.close.addEventListener('click', close);
  E.back.addEventListener('click', () => { if ((hist().help || 0) > 1) history.back(); });
  if (E.menu) E.menu.addEventListener('click', () => { const on = !E.root.classList.contains('menu-open'); E.root.classList.toggle('menu-open', on); E.menu.setAttribute('aria-expanded', String(on)); if (on) { const c = E.nav.querySelector('[aria-current]') || E.nav.querySelector('a'); if (c) c.focus(); } });
  E.root.addEventListener('click', ev => {
    const a = ev.target.closest('a[href^="#help"]');
    if (a) { ev.preventDefault(); navigate(a.getAttribute('href')); return; }
    const h = ev.target.closest('[data-help]');
    if (h) { navigate('#help/' + h.dataset.help); return; }
    const q = ev.target.closest('[data-quick]');
    if (q) { const t = q.dataset.quick; close(); opts.say(t); return; }
    if (ev.target === E.root.querySelector('.docs-scrim')) { E.root.classList.remove('menu-open'); E.menu.setAttribute('aria-expanded', 'false'); }
  });
  E.root.addEventListener('change', ev => {
    const pl = ev.target.closest('[data-plug]');
    if (pl) { opts.onPlug(pl.dataset.plug, pl.checked); rerender(); }
  });
  document.addEventListener('keydown', ev => {
    if (!isOpen || ev.key !== 'Escape') return;
    ev.preventDefault(); ev.stopPropagation();
    if (E.root.classList.contains('menu-open')) { E.root.classList.remove('menu-open'); E.menu.setAttribute('aria-expanded', 'false'); E.menu.focus(); return; }
    close();
  }, true);
  // opened by a link (reload, shared URL): this entry is the first help page
  const r = parse(location.hash);
  if (r) { history.replaceState({ help: 1, deep: true }, ''); show(r, 0); }
}

const DocsKit = { init, open, close, rerender, isOpen: () => isOpen, current: () => current, pages: FLAT.map(p => ({ id: p.id, title: p.title, group: p.group })), aliases: ALIASES };
root.DocsKit = DocsKit;
})(window);
