#!/usr/bin/env python3
"""Saved example playback in Chromium. Models are blocked: only the Rules and saved reader execute.
Run with the installed Playwright Python and PLAYWRIGHT_BROWSERS_PATH set for the host.
"""
import functools, http.server, json, os, socketserver, sys, tempfile, threading
from playwright.sync_api import sync_playwright

DOCS = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../docs'))
OUT = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='saved-reader-ui-')
os.makedirs(OUT, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
class Server(socketserver.ThreadingTCPServer):
    request_queue_size = 64
server = Server(('127.0.0.1', 0), functools.partial(Quiet, directory=DOCS))
server.daemon_threads = True
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_address[1]}/'
checks = []
def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + (': ' + str(detail) if not ok else ''), flush=True)
    checks.append((name, bool(ok)))
    assert ok, name + ': ' + str(detail)
def world(pg, rid='saved'): return pg.evaluate('(id) => SketchpadInfo.world(id)', rid)
def last(pg): return pg.evaluate('() => SketchpadInfo.savedTurn(SketchpadInfo.turn())')
def settled(pg, before):
    pg.wait_for_function('(n) => SketchpadInfo.turn() > n && !!SketchpadInfo.savedTurn(SketchpadInfo.turn()) && !document.querySelector("#msgs .typing")', arg=before, timeout=30000)
def send(pg, text):
    n = pg.evaluate('() => SketchpadInfo.turn()'); pg.fill('#say', text); pg.click('#send-btn'); settled(pg, n)
def quick(pg, i):
    n = pg.evaluate('() => SketchpadInfo.turn()'); pg.click('#open-examples'); pg.click(f'[data-example="quick:{i}"]'); settled(pg, n); return last(pg)
def start(pg, sid, how='step'):
    pg.click('#open-examples'); pg.select_option('#sc-delay', '0'); pg.click(f'[data-sc="{sid}"][data-how="{how}"]')
    pg.wait_for_function('() => !document.querySelector("#player").hidden')
def next_turn(pg):
    n = pg.evaluate('() => SketchpadInfo.turn()'); pg.click('[data-pl=next]'); settled(pg, n); return last(pg)
def saved_details(pg):
    pg.locator('#msgs [data-turn]').last.click()
    return pg.locator('#sbody .minihead').filter(has_text='gpt-6.1-sol').locator('..')

with sync_playwright() as p:
    browser = p.chromium.launch()
    pg = browser.new_page(viewport={'width': 1280, 'height': 860})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.add_init_script("localStorage.setItem('sop.chat.tabs','saved'); localStorage.setItem('sop.spell.off','1');")
    pg.route('**/model/**', lambda route: route.abort())
    pg.route('https://**', lambda route: route.abort())
    def load():
        pg.goto(base, wait_until='domcontentloaded')
        try:
            pg.wait_for_function('() => window.SketchpadInfo && SketchpadInfo.saved().ready && SketchpadInfo.turn() >= 1 && !!SketchpadInfo.savedTurn(SketchpadInfo.turn())', timeout=30000)
        except Exception:
            print('load diagnostics', errors, pg.evaluate('() => window.SketchpadInfo && SketchpadInfo.saved()'), flush=True)
            raise
        pg.click('[data-rtab=saved]')
    load()
    labels = pg.locator('[data-rtab]').all_text_contents()
    check('tab immediately after Qwen3 and opening drawing is independent', labels[-2:] == ['Qwen3', 'gpt-6.1-sol'] and len(world(pg)['state']['shapes']) == 10, labels)
    for i in range(13):
        load(); r = quick(pg, i)
        check(f'quick {i} executes saved occurrence with inspectable SOP and real result', not r['unavailable'] and r['evidence']['id'] == f'quick:{i}:0' and bool(r['nodes']) and bool(r['steps']), r)
        if i == 0:
            detail = saved_details(pg); header = detail.locator('.minihead').inner_text()
            check('natural-language saved details identify saved playback without live inference', 'saved example playback' in header and 'no live inference' in header and 'your choice from the question' not in header, header)
            pg.click('#close-sheet')
        if i == 12:
            check('raw quick provenance remains pre-existing SOP', r['evidence']['provenance']['kind'] == 'pre-existing-sop')
            detail = saved_details(pg); header = detail.locator('.minihead').inner_text(); comment = detail.locator('pre.sop').first.inner_text().splitlines()[0]
            check('raw quick details identify pre-existing SOP playback and source comment', 'pre-existing SOP example' in header and 'no live inference' in header and comment == '# pre-existing SOP example', [header, comment])
            pg.click('#close-sheet')
    pg.locator('#msgs [data-turn]').last.click()
    check('details expose original/effective input, original/bound SOP and provenance', all(s in pg.locator('#sbody').inner_text() for s in ['originalInput', 'effectiveInput', 'originalSOP', 'boundSOP', 'provenance']))
    pg.screenshot(path=os.path.join(OUT, 'saved-details.png')); pg.click('#close-sheet')
    pg.click('[data-sub=settings]')
    check('saved settings describe saved translations, arbitrary-input limit, no live inference', 'not live inference' in pg.locator('#rpanel').inner_text())
    pg.click('[data-sub=drawing]')
    pg.click('[data-sub=sop]')
    check('SOP Lang subtab renders saved reader world', 'Gem' in pg.locator('#rpanel').inner_text())
    pg.click('[data-sub=drawing]')
    load(); start(pg, 'traffic', 'play')
    pg.wait_for_function('() => /finished/.test(document.querySelector("#player").textContent) && !document.querySelector("#msgs .typing") && SketchpadInfo.saved().run.next === 4', timeout=30000)
    shapes = world(pg)['state']['shapes']; check('Play consumes traffic scenario and question answer', all(any(s['name'] == n for s in shapes) for n in ['Stop', 'Wait', 'Go']) and bool(last(pg)['steps'][-1]['answer']))
    pg.screenshot(path=os.path.join(OUT, 'saved-play.png'))
    start(pg, 'traffic', 'play')
    pg.wait_for_function('() => /finished/.test(document.querySelector("#player").textContent) && SketchpadInfo.saved().run.next === 4', timeout=30000)
    shapes = world(pg)['state']['shapes']; check('repeat populated Play binds names in saved SOP', all(any(s['name'] == n for s in shapes) for n in ['Stop', 'Stop2', 'Wait', 'Wait2', 'Go', 'Go2']))
    load(); start(pg, 'traffic'); r = next_turn(pg)
    check('Next executes one saved turn', r['evidence']['id'] == 'scenario:traffic:0' and pg.evaluate('() => SketchpadInfo.saved().run.next') == 1)
    # A rapid double click must not run the same occurrence twice or consume the following turn while one is pending.
    n = pg.evaluate('() => SketchpadInfo.turn()')
    pg.evaluate('() => { const b=document.querySelector("[data-pl=next]"); b.click(); b.click(); }'); settled(pg, n)
    check('rapid Next does not execute duplicate or skip an occurrence', pg.evaluate('() => SketchpadInfo.saved().run.next') == 2)
    before = world(pg); send(pg, 'draw a purple banana')
    check('unknown typed input is explicitly unavailable with zero saved mutation', last(pg)['unavailable'] and world(pg) == before)
    r = next_turn(pg); check('intervening typed input invalidates later saved context', r['unavailable'])
    load(); start(pg, 'traffic'); next_turn(pg); send(pg, '@x command action=undo')
    check('direct SOP undo uses own history and is labeled direct input', last(pg)['evidence']['status'] == 'direct-input' and not any(s['name'] == 'Stop' for s in world(pg)['state']['shapes']))
    detail = saved_details(pg); header = detail.locator('.minihead').inner_text(); comment = detail.locator('pre.sop').first.inner_text().splitlines()[0]
    check('direct typed SOP details identify direct input rather than saved generation', 'direct SOP input, not generated' in header and comment == '# direct SOP input', [header, comment])
    pg.click('#close-sheet')
    send(pg, '@y command action=redo'); check('direct SOP redo restores saved turn', any(s['name'] == 'Stop' for s in world(pg)['state']['shapes']))
    check('toolbar/direct SOP interrupts sequence', next_turn(pg)['unavailable'])
    load(); start(pg, 'traffic'); next_turn(pg)
    n = pg.evaluate('() => SketchpadInfo.turn()'); pg.click('[data-say=Undo]'); settled(pg, n)
    check('actual Undo toolbar uses saved history and invalidates remaining sequence', not any(s['name'] == 'Stop' for s in world(pg)['state']['shapes']) and next_turn(pg)['unavailable'])
    load(); start(pg, 'traffic'); next_turn(pg)
    rules_before = world(pg, 'rules'); saved_before = world(pg)
    pg.click('[data-rtab=rules]')
    body = pg.locator('#layer .shp[data-name="Stop"] .body').bounding_box()
    x, y = body['x'] + body['width'] / 2, body['y'] + body['height'] / 2
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 25, y + 15, steps=5); pg.mouse.up()
    check('Rules drag changes only its own state/history', world(pg) == saved_before and world(pg, 'rules') != rules_before)
    pg.click('[data-rtab=saved]'); rules_after = world(pg, 'rules')
    check('alignment is hidden on saved reader', pg.locator('#align-btn').is_hidden())
    pg.evaluate('() => document.querySelector("#align-btn").click()'); pg.wait_for_timeout(100)
    check('programmatic alignment cannot copy saved source into Rules', world(pg, 'rules') == rules_after and world(pg) == saved_before)
    pg.click('[data-rtab=rules]')
    check('regular alignment ignores saved-only differences', pg.locator('#align-btn').is_hidden())
    pg.evaluate('() => document.querySelector("#align-btn").click()'); pg.wait_for_timeout(100)
    check('regular alignment cannot overwrite saved target', world(pg) == saved_before)
    pg.click('[data-rtab=saved]'); check('other-tab selection preserves saved context', not next_turn(pg)['unavailable'])
    load(); pg.click('#open-examples'); pg.locator('[data-sc=traffic][data-how=edit]').click()
    pg.locator('#sc-text').fill('# Edited traffic\nDraw a blue circle named Stop.'); pg.locator('[data-own=step]').click(); next_turn(pg)
    check('edited custom script is unavailable with zero saved shape execution', last(pg)['unavailable'] and len(world(pg)['state']['shapes']) == 10)
    load()
    # A paused old play loop must not advance a replacement's immutable run after its sleep.
    pg.click('#open-examples'); pg.select_option('#sc-delay', '400'); pg.click('[data-sc=traffic][data-how=play]')
    pg.wait_for_function('() => SketchpadInfo.saved().run && SketchpadInfo.saved().run.next >= 1')
    start(pg, 'star', 'step'); pg.wait_for_timeout(650)
    check('replacement epoch prevents old Play loop consuming replacement', pg.evaluate('() => SketchpadInfo.saved().run.id === "scenario:star" && SketchpadInfo.saved().run.next === 0'))
    check('replacement Next uses its own saved occurrence', next_turn(pg)['evidence']['id'] == 'scenario:star:0')
    load(); send(pg, '@x command action=set target=Done color=blue\n@y command action=create shape=circle name=Fresh color=green')
    old = next(s['size'] for s in world(pg)['state']['shapes'] if s['name'] == 'Done'); fresh = next(s['size'] for s in world(pg)['state']['shapes'] if s['name'] == 'Fresh')
    r = quick(pg, 1); shapes = world(pg)['state']['shapes']
    check('quick dynamic green circle resolves fresh current target', not r['unavailable'] and next(s['size'] for s in shapes if s['name'] == 'Done') == old and next(s['size'] for s in shapes if s['name'] == 'Fresh') > fresh)
    unexpected = [e for e in errors if e != 'Failed to fetch']
    check('no unexpected browser exception (blocked reader downloads report Failed to fetch)', not unexpected, unexpected)
    with open(os.path.join(OUT, 'results.json'), 'w') as f: json.dump({'checks': checks, 'expectedBlockedFetchErrors': errors.count('Failed to fetch')}, f, indent=2)
    browser.close()
server.shutdown()
print(f'{len(checks)}/{len(checks)} browser checks passed; screenshots/results in {OUT}', flush=True)
