"""
Production-Grade HTTP Web Server & REST API for Chord Progression Analyzer.
Zero external server dependencies (pure Python standard library http.server).
"""

from __future__ import annotations
import json
import mimetypes
import os
import sys
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent
STATIC_DIR = SRC_DIR / "static"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from analyzer import UnifiedChordAnalyzer
from roman_engine import NAMED_PROGRESSIONS

# Global shared analyzer instance
ANALYZER = UnifiedChordAnalyzer()


class ChordAnalyzerHTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

    def _send_json(self, data: dict, status_code: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        # API: Search
        if path == "/api/search":
            prog = params.get("progression", ["1,5,6,4"])[0]
            lang = params.get("lang", ["all"])[0]
            artist = params.get("artist", [None])[0]
            key = params.get("key", [None])[0]
            pages = int(params.get("pages", [5])[0])
            exact = params.get("exact", ["false"])[0].lower() == "true"
            
            res = ANALYZER.search(
                progression=prog,
                language=lang,
                artist_filter=artist,
                key_filter=key,
                max_pages=pages,
                exact=exact
            )
            self._send_json(res)
            return

        # API: Next Chord Probabilities
        if path == "/api/next":
            prog = params.get("progression", ["1,5,6"])[0]
            res = ANALYZER.get_next_chords(prog)
            self._send_json(res)
            return

        # API: Stats / Taxonomy
        if path == "/api/taxonomy":
            res = {
                "named_progressions": [
                    {"progression": k, "name": v} for k, v in NAMED_PROGRESSIONS.items()
                ],
                "chinese_songs_count": len(ANALYZER.chinese_engine.corpus),
                "pop909_count": len(ANALYZER.chinese_engine._pop909_data),
                "modern_count": len(ANALYZER.chinese_engine._modern_data),
                "hooktheory_cache_count": len(ANALYZER.hooktheory._cache)
            }
            self._send_json(res)
            return

        # API: Search Yopu
        if path == "/api/yopu-search":
            q = params.get("q", [""])[0]
            instrument = params.get("instrument", ["guitar"])[0]
            if not q:
                self._send_json({"error": "Missing 'q' search parameter"}, 400)
                return
            from yopu_importer import YopuImporter
            importer = YopuImporter()
            try:
                data = importer.search_yopu(q, instrument=instrument)
                self._send_json(data)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            return

        # Static File Serving
        if path == "/" or path == "":
            file_path = STATIC_DIR / "index.html"
        else:
            rel = path.lstrip("/")
            file_path = STATIC_DIR / rel

        if file_path.exists() and file_path.is_file():
            mime_type, _ = mimetypes.guess_type(str(file_path))
            mime_type = mime_type or "application/octet-stream"
            
            with open(file_path, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", f"{mime_type}; charset=utf-8" if "text" in mime_type or "javascript" in mime_type or "json" in mime_type else mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_error(404, f"File not found: {path}")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/analyze":
            length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(length)
            try:
                payload = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                self._send_json({"error": "Invalid JSON body"}, 400)
                return

            chords = payload.get("chords", [])
            key = payload.get("key", "C")
            scale = payload.get("scale", "major")

            if isinstance(chords, str):
                chords = chords.split()

            res = ANALYZER.analyze_chords(chords, key=key, scale_type=scale)
            self._send_json(res)
            return

        elif path == "/api/import-yopu":
            length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(length)
            try:
                payload = json.loads(body_bytes.decode("utf-8"))
            except Exception:
                self._send_json({"error": "Invalid JSON body"}, 400)
                return

            score = payload.get("score", "")
            add = payload.get("add_to_corpus", False)
            key = payload.get("key")
            capo = payload.get("capo", 0)

            from yopu_importer import YopuImporter
            importer = YopuImporter()
            try:
                song = importer.parse_and_clean_score(score, custom_key=key, custom_capo=capo)
                if add:
                    importer.save_to_modern_corpus(song)
                self._send_json(song.to_dict())
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            return

        self.send_error(404, "Endpoint not found")


def start_web_server(port: int = 9482, host: str = "0.0.0.0"):
    server_address = (host, port)
    httpd = HTTPServer(server_address, ChordAnalyzerHTTPHandler)
    print(f"🎵 Chord Analyzer Server listening on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
        httpd.server_close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9482
    start_web_server(port=port)
