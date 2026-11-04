"""Small ownership and hashing contracts; no browser/model inference is used."""
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch
from urllib.request import urlopen

from check_modernbert_browser import chrome_processes, digest


class BrowserOwnership(unittest.TestCase):
    def test_sigterm_during_owned_wait_closes_browser_and_real_server(self):
        with tempfile.TemporaryDirectory(prefix='modernbert-sigterm-') as scratch:
            folder = Path(scratch)
            (folder / 'export_manifest.json').write_text(json.dumps({'reference': {'file': 'references.json'}, 'bindings': {'files': {}, 'sources': {}}}))
            (folder / 'references.json').write_text('{}')
            child_script = '''
import json,signal,subprocess,sys,time
from pathlib import Path
from unittest.mock import patch
import check_modernbert_browser as browser
folder=Path(sys.argv[1]);previous=signal.getsignal(signal.SIGTERM)
def command(args,**kwargs):
    if 'open' in args:
        (folder/'opened').write_text(args[args.index('open')+1])
    if 'close' in args:
        (folder/'closing').write_text('yes')
        time.sleep(.5)
        (folder/'closed').write_text('yes')
    return subprocess.CompletedProcess(args,0)
try:
    with patch.object(browser.subprocess,'run',side_effect=command),patch.object(browser,'chrome_processes',return_value=[]):
        browser.run(folder,60)
finally:
    (folder/'handler-restored').write_text(str(signal.getsignal(signal.SIGTERM)==previous))
'''
            child = subprocess.Popen([sys.executable, '-c', child_script, str(folder)], cwd=Path(__file__).parent, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            def wait_for(path):
                deadline = time.monotonic() + 10
                while not path.exists() and child.poll() is None and time.monotonic() < deadline:
                    time.sleep(.02)
                self.assertTrue(path.exists(), str(path) + ' was not created')
            try:
                wait_for(folder / 'opened')
                os.kill(child.pid, signal.SIGTERM)
                wait_for(folder / 'closing')
                # Repeated cancellation must not interrupt the cleanup already running.
                os.kill(child.pid, signal.SIGTERM)
                stdout, stderr = child.communicate(timeout=15)
                self.assertEqual(child.returncode, 1, stdout + stderr)
                self.assertIn('Browser parity failed', stderr)
                self.assertTrue((folder / 'closed').exists())
                self.assertEqual((folder / 'handler-restored').read_text(), 'True')
                diagnostic = json.loads((folder / 'browser-diagnostic.json').read_text())
                self.assertEqual(diagnostic['cleanup'], {'browser_closed': True, 'server_closed': True})
                self.assertTrue(any('SIGTERM' in message for message in diagnostic['errors']))
                self.assertFalse((folder / 'browser-receipt.json').exists())
                with self.assertRaises(OSError):
                    urlopen((folder / 'opened').read_text(), timeout=1)
            finally:
                if child.poll() is None:
                    child.kill()
                child.communicate()

    @unittest.skipUnless(os.environ.get('MODERNBERT_TOKENIZER'), 'Set MODERNBERT_TOKENIZER for actual local HF serialization')
    def test_actual_hf_tokenizer_save_inventory_includes_bound_special_tokens(self):
        from transformers import AutoTokenizer
        tokenizer = AutoTokenizer.from_pretrained(os.environ['MODERNBERT_TOKENIZER'], local_files_only=True)
        with tempfile.TemporaryDirectory(prefix='modernbert-tokenizer-save-') as scratch:
            tokenizer.save_pretrained(scratch)
            self.assertEqual(sorted(path.name for path in Path(scratch).iterdir()), ['special_tokens_map.json', 'tokenizer.json', 'tokenizer_config.json'])
            special = Path(scratch) / 'special_tokens_map.json'
            self.assertGreater(special.stat().st_size, 0)
            self.assertIsInstance(json.loads(special.read_text()), dict)

    def test_only_exact_owned_chrome_profile_and_children_are_sampled(self):
        processes = '\n'.join([
            '100 1 123 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/tmp/owned',
            '101 100 456 /Applications/Google Chrome.app/Contents/Frameworks/Helper --type=renderer',
            '102 1 789 /Applications/Google Chrome.app/Contents/Frameworks/Helper --user-data-dir=/tmp/owned --type=renderer',
            '200 1 123 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --user-data-dir=/tmp/owned-other',
            '201 200 456 /Applications/Google Chrome.app/Contents/Frameworks/Helper --type=renderer',
            '300 1 789 python cli.py --user-data-dir=/tmp/owned',
        ])
        with patch('check_modernbert_browser.subprocess.check_output', return_value=processes):
            self.assertEqual([r['pid'] for r in chrome_processes(Path('/tmp/owned'))], [100, 101, 102])

    def test_hashing_streams_entire_artifact(self):
        with tempfile.TemporaryDirectory(prefix='modernbert-hash-') as folder:
            path = Path(folder) / 'shard'
            body = b'bounded contract fixture' * 100000
            path.write_bytes(body)
            self.assertEqual(digest(path), hashlib.sha256(body).hexdigest())


if __name__ == '__main__':
    unittest.main()
