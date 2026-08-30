import unittest
import json
import subprocess
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
MCP_SERVER_PATH = SRC_DIR / "mcp_server.py"


class TestMCPServer(unittest.TestCase):
    def setUp(self):
        self.proc = subprocess.Popen(
            [sys.executable, str(MCP_SERVER_PATH)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

    def tearDown(self):
        self.proc.kill()
        self.proc.wait()

    def _rpc_call(self, req: dict) -> dict:
        self.proc.stdin.write(json.dumps(req) + "\n")
        self.proc.stdin.flush()
        line = self.proc.stdout.readline()
        return json.loads(line)

    def test_initialize(self):
        resp = self._rpc_call({"jsonrpc": "2.0", "id": 1, "method": "initialize"})
        self.assertEqual(resp["result"]["serverInfo"]["name"], "chord-analyzer-mcp")

    def test_tools_list(self):
        resp = self._rpc_call({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        tools = resp["result"]["tools"]
        tool_names = [t["name"] for t in tools]
        self.assertIn("search_chord_progression", tool_names)
        self.assertIn("predict_next_chords", tool_names)
        self.assertIn("analyze_chord_sheet", tool_names)

    def test_tool_call_search(self):
        resp = self._rpc_call({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "search_chord_progression",
                "arguments": {"progression": "1564", "language": "zh"}
            }
        })
        text_content = resp["result"]["content"][0]["text"]
        data = json.loads(text_content)
        self.assertEqual(data["progression"], "1,5,6,4")
        self.assertGreaterEqual(data["total_count"], 20)

    def test_tool_call_analyze(self):
        resp = self._rpc_call({
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "analyze_chord_sheet",
                "arguments": {"chords": "F G Em Am Dm G C", "key": "C"}
            }
        })
        text_content = resp["result"]["content"][0]["text"]
        data = json.loads(text_content)
        self.assertEqual(data["progression_string"], "4,5,3,6,2,5,1")

    def test_tool_call_import_yopu(self):
        resp = self._rpc_call({
            "jsonrpc": "2.0",
            "id": 5,
            "method": "tools/call",
            "params": {
                "name": "import_yopu_song",
                "arguments": {"score": "C G Am F", "key": "C"}
            }
        })
        text_content = resp["result"]["content"][0]["text"]
        data = json.loads(text_content)
        self.assertEqual(data["primary_progression"], "1,5,6,4")


if __name__ == "__main__":
    unittest.main()
