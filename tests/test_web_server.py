import os
os.environ["no_proxy"] = "127.0.0.1,localhost"
os.environ["NO_PROXY"] = "127.0.0.1,localhost"
import unittest
import threading
import time
import urllib.request
import json
import sys
from pathlib import Path
from http.server import HTTPServer

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from web_server import ChordAnalyzerHTTPHandler


class TestWebServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.port = 10892  # Random high port to avoid conflict
        cls.server = HTTPServer(("127.0.0.1", cls.port), ChordAnalyzerHTTPHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        time.sleep(0.2)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_get_static_index(self):
        url = f"http://127.0.0.1:{self.port}/"
        with urllib.request.urlopen(url) as resp:
            self.assertEqual(resp.status, 200)
            content = resp.read().decode("utf-8")
            self.assertIn("ChordVerse", content)

    def test_api_search(self):
        url = f"http://127.0.0.1:{self.port}/api/search?progression=1,5,6,4&lang=zh"
        with urllib.request.urlopen(url) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data["progression"], "1,5,6,4")
            self.assertGreaterEqual(data["total_count"], 15)

    def test_api_next(self):
        url = f"http://127.0.0.1:{self.port}/api/next?progression=1,5,6"
        with urllib.request.urlopen(url) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertIn("next_chord_probabilities", data)

    def test_api_analyze(self):
        url = f"http://127.0.0.1:{self.port}/api/analyze"
        payload = json.dumps({"chords": "F G Em Am Dm G C", "key": "C", "scale": "major"}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data["progression_string"], "4,5,3,6,2,5,1")

    def test_api_yopu_search(self):
        url = f"http://127.0.0.1:{self.port}/api/yopu-search?q=%E5%86%8D%E8%A7%81%E9%9D%92%E6%98%A5"
        with urllib.request.urlopen(url) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertIn("results", data)
            self.assertGreater(len(data["results"]), 0)



class TestStaticAssetVersioning(unittest.TestCase):
    """Cloudflare's edge caches compressed asset variants for up to 4 h across a
    deploy (measured 2026-09-04: browsers ran the previous app.js while curl saw
    the new bytes). Every script/stylesheet reference must carry the current
    version as a cache-busting query, so a version bump changes the URL."""

    def test_index_assets_carry_the_current_version(self):
        import re
        root = Path(__file__).resolve().parent.parent
        version = re.search(r'^version = "([^"]+)"', (root / "pyproject.toml").read_text(encoding="utf-8"), re.M).group(1)
        html = (root / "src" / "static" / "index.html").read_text(encoding="utf-8")
        refs = re.findall(r'(?:src|href)="(/[^"]+\.(?:js|css))(\?[^"]*)?"', html)
        self.assertGreaterEqual(len(refs), 3, refs)
        for asset, query in refs:
            self.assertEqual(query, f"?v={version}", f"{asset} must be referenced as {asset}?v={version}")

if __name__ == "__main__":
    unittest.main()
