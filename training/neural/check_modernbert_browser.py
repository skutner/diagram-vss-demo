#!/usr/bin/env python3
"""Check one reviewed export in an owned Chrome session using actual CDN WASM.

Usage: python3 check_modernbert_browser.py MODEL_FOLDER [--timeout 1800]
Requires npx and the existing Playwright CLI (PWCLI can select its wrapper).
No inference output, model response, CDN asset or production source is replaced.
"""
import argparse
import hashlib
import http.server
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import threading
import time
import uuid
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def digest(path):
    value = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def atomic_new(path, value):
    temp = path.with_name(path.name + '.tmp')
    with temp.open('x') as stream:
        json.dump(value, stream, indent=2, allow_nan=False)
        stream.write('\n')
    # The destination was checked before this task acquired its owned resources.
    if path.exists():
        raise RuntimeError('Refusing to overwrite existing evidence: ' + str(path))
    os.rename(temp, path)


def chrome_processes(profile):
    """RSS by PID for this exact unique Chrome profile and its descendants."""
    output = subprocess.check_output(['ps', '-axo', 'pid=,ppid=,rss=,command='], text=True)
    rows = []
    for line in output.splitlines():
        fields = line.strip().split(None, 3)
        if len(fields) == 4:
            rows.append(dict(pid=int(fields[0]), ppid=int(fields[1]), rss_kib=int(fields[2]), command=fields[3]))
    # Helpers can briefly outlive their parent. Match the exact owned profile
    # on both the browser and Chrome helper executables before tracing children.
    owned = {r['pid'] for r in rows if r['command'].startswith('/Applications/Google Chrome.app/Contents/') and '--user-data-dir=' + str(profile) in r['command'].split()}
    while True:
        children = {r['pid'] for r in rows if r['ppid'] in owned}
        if children <= owned:
            break
        owned |= children
    return [r for r in rows if r['pid'] in owned]


def stop_owned_chrome(profile):
    """Fallback after CLI failure; exact profile identities are checked again."""
    for action in (signal.SIGTERM, signal.SIGKILL):
        observed = chrome_processes(profile)
        for process in observed:
            current = {r['pid']: r for r in chrome_processes(profile)}
            same = current.get(process['pid'])
            if same and same['command'] == process['command'] and same['ppid'] == process['ppid']:
                try:
                    os.kill(process['pid'], action)
                except ProcessLookupError:
                    pass
        deadline = time.monotonic() + 5
        while chrome_processes(profile) and time.monotonic() < deadline:
            time.sleep(.1)
    return not chrome_processes(profile)


def run(folder, timeout):
    # Record cancellation without raising inside resource acquisition or cleanup.
    # The owned wait observes it, and repeated SIGTERM cannot skip finally.
    cancelled = [False]
    previous = signal.getsignal(signal.SIGTERM)
    def request_cancel(_signum, _frame):
        cancelled[0] = True
    signal.signal(signal.SIGTERM, request_cancel)
    try:
        return _run(folder, timeout, cancelled)
    finally:
        signal.signal(signal.SIGTERM, previous)


def _run(folder, timeout, cancelled):
    folder = Path(folder).resolve()
    receipt = folder / 'browser-receipt.json'
    diagnostic = folder / 'browser-diagnostic.json'
    for path in (receipt, diagnostic):
        if path.exists():
            raise RuntimeError('Use fresh browser evidence paths: ' + str(path))
    candidate_path = folder / 'export_manifest.json'
    candidate = json.loads(candidate_path.read_text())
    # Run the same strict preflight as the finalizer, before allocating a browser.
    preflight = "import {readFileSync} from 'node:fs';import {validateCandidate} from './training/neural/finalize_modernbert_export.mjs';const folder=process.argv[1];const c=JSON.parse(readFileSync(folder+'/export_manifest.json'));validateCandidate(folder,c,JSON.parse(readFileSync(folder+'/'+c.reference.file)));"
    subprocess.run(['node', '--input-type=module', '-e', preflight, str(folder)], cwd=ROOT, check=True)
    manifest_hash = digest(candidate_path)
    reference_path = folder / candidate['reference']['file']
    reference_hash = digest(reference_path)
    wrapper = Path(os.environ.get('PWCLI', str(Path.home() / '.codex/skills/playwright/scripts/playwright_cli.sh')))
    if not wrapper.is_file() or not shutil.which('npx'):
        raise RuntimeError('Playwright CLI wrapper and npx are required')
    session = 'modernbert-' + uuid.uuid4().hex
    result, samples, errors = {}, [], []
    done = threading.Event()
    cleanup = {'browser_closed': False, 'server_closed': False}

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

        def do_GET(self):
            path = unquote(urlsplit(self.path).path)
            if path == '/':
                body = b'<!doctype html><meta charset="utf-8"><pre id="status">running</pre><script src="/docs/js/logic.js"></script><script src="/docs/js/neural.js"></script><script type="module" src="/training/neural/check_modernbert_browser.mjs"></script>'
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if path == '/references.json':
                target = reference_path
            elif path.startswith('/models/modernbert/'):
                name = path.removeprefix('/models/modernbert/')
                if name not in candidate['bindings']['files']:
                    self.send_error(404)
                    return
                target = folder / name
            elif path in ['/docs/js/logic.js', '/docs/js/neural.js', '/training/neural/modernbert_parity.mjs', '/training/neural/check_modernbert_browser.mjs']:
                target = ROOT / path.lstrip('/')
            else:
                self.send_error(404)
                return
            self.target = target
            super().do_GET()

        def translate_path(self, _):
            return str(self.target)

        def do_POST(self):
            if self.path != '/result' or done.is_set():
                self.send_error(409)
                return
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length < 20 * 1024**2:
                self.send_error(400)
                return
            try:
                value = json.loads(self.rfile.read(length))
                if not isinstance(value, dict):
                    raise ValueError('Expected result object')
                result.update(value)
            except (ValueError, json.JSONDecodeError):
                self.send_error(400)
                return
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'saved')
            done.set()

    log_path = folder / 'browser-check.log'
    if cancelled[0]:
        raise RuntimeError('Browser parity cancelled by SIGTERM before resource acquisition')
    with tempfile.TemporaryDirectory(prefix='modernbert-chrome-') as scratch, log_path.open('x') as log, http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        profile = Path(scratch) / 'profile'
        cli = [str(wrapper), '--session', session]
        thread.start()
        try:
            subprocess.run(cli + ['open', f'http://127.0.0.1:{server.server_port}/', '--browser', 'chrome', '--profile', str(profile)], stdout=log, stderr=log, check=True, timeout=90)
            deadline = time.monotonic() + timeout
            while not done.wait(1):
                if cancelled[0]:
                    raise RuntimeError('Browser parity cancelled by SIGTERM')
                samples.append({'elapsed_s': timeout - (deadline - time.monotonic()), 'processes': chrome_processes(profile)})
                if time.monotonic() >= deadline:
                    raise TimeoutError('Browser parity did not finish before deadline')
            samples.append({'processes': chrome_processes(profile)})
        except BaseException as exc:
            errors.append(str(exc))
        finally:
            try:
                subprocess.run(cli + ['close'], stdout=log, stderr=log, check=True, timeout=45)
                remaining = chrome_processes(profile)
                if remaining:
                    raise RuntimeError('Owned Chrome processes remain: ' + str([r['pid'] for r in remaining]))
                cleanup['browser_closed'] = True
            except BaseException as exc:
                errors.append('Chrome cleanup failed: ' + str(exc))
                try:
                    cleanup['browser_closed'] = stop_owned_chrome(profile)
                except BaseException as fallback:
                    errors.append('Owned Chrome fallback cleanup failed: ' + str(fallback))
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=10)
                cleanup['server_closed'] = not thread.is_alive() and server.fileno() == -1
    # Never write passed evidence until resource cleanup and current bindings hold.
    if cancelled[0] and not any('SIGTERM' in message for message in errors):
        errors.append('Browser parity cancelled by SIGTERM')
    try:
        if digest(candidate_path) != manifest_hash or digest(reference_path) != reference_hash:
            raise RuntimeError('Candidate or reference changed during browser check')
        for name, info in candidate['bindings']['files'].items():
            if digest(folder / name) != info['sha256']:
                raise RuntimeError('Model artifact changed during browser check: ' + name)
        for name, expected in candidate['bindings']['sources'].items():
            if digest(ROOT / name) != expected:
                raise RuntimeError('Source changed during browser check: ' + name)
    except BaseException as exc:
        errors.append(str(exc))
    observed_rss = any(sample['processes'] for sample in samples)
    evidence = {**result, 'cleanup': cleanup, 'process_rss': {'available': observed_rss, 'unavailable_reason': None if observed_rss else 'No owned Chrome process was captured by the sampling window', 'samples': samples, 'units': 'KiB per PID', 'qualification': 'Owned unique-profile Chrome tree only. RSS can count shared pages more than once; no sum is claimed as physical RAM.'}, 'errors': errors}
    atomic_new(diagnostic, evidence)
    if errors or result.get('passed') is not True or not all(cleanup.values()):
        raise RuntimeError('Browser parity failed; see ' + str(diagnostic))
    complete = {'schema': 'modernbert-parity-receipt-v2', 'kind': 'browser', 'passed': True,
                'export_mode': candidate['export_mode'], 'execution_policy': result['execution_policy'], 'manifest_sha256': manifest_hash,
                'reference_sha256': reference_hash, 'files': candidate['bindings']['files'],
                'sources': candidate['bindings']['sources'], 'runtime': result['runtime'],
                'checks': result['checks'], 'metrics': {**result['metrics'], 'process_rss': evidence['process_rss']}, 'cleanup': cleanup}
    # Validate browser result shape/runtime as strictly as finalization does.
    validation = "import {readFileSync} from 'node:fs';import {validateParityReceipt} from './training/neural/finalize_modernbert_export.mjs';const [f,h]=process.argv.slice(1);const c=JSON.parse(readFileSync(f+'/export_manifest.json'));const r=JSON.parse(readFileSync(f+'/'+c.reference.file));validateParityReceipt(JSON.parse(readFileSync(0,'utf8')),'browser',c,h,r);"
    subprocess.run(['node', '--input-type=module', '-e', validation, str(folder), manifest_hash], input=json.dumps(complete), text=True, cwd=ROOT, check=True)
    if cancelled[0]:
        raise RuntimeError('Browser parity cancelled by SIGTERM before receipt publication')
    atomic_new(receipt, complete)
    return complete


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder')
    parser.add_argument('--timeout', type=int, default=1800)
    args = parser.parse_args()
    print(json.dumps(run(args.folder, args.timeout)))
