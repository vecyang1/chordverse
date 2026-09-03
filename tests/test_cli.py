import unittest
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CLI_PATH = PROJECT_ROOT / "bin" / "chord-analyzer"


class TestCLI(unittest.TestCase):
    def _run(self, args):
        cmd = [str(CLI_PATH)] + args
        res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(PROJECT_ROOT))
        return res

    def test_cli_doctor(self):
        res = self._run(["doctor"])
        self.assertEqual(res.returncode, 0)
        self.assertIn("Roman Numeral Engine", res.stdout)
        self.assertIn("POP909 Golden Base Index", res.stdout)

    def test_cli_search_1564_json(self):
        res = self._run(["search", "1564", "--lang", "zh", "--format", "json"])
        self.assertEqual(res.returncode, 0)
        self.assertIn("1,5,6,4", res.stdout)
        self.assertIn("汪峰", res.stdout)

    def test_cli_next(self):
        res = self._run(["next", "1,5,6"])
        self.assertEqual(res.returncode, 0)
        self.assertIn("Next Chord Probability", res.stdout)

    def test_cli_analyze(self):
        res = self._run(["analyze", "F", "G", "Em", "Am", "Dm", "G", "C"])
        self.assertEqual(res.returncode, 0)
        self.assertIn("Royal Road", res.stdout)

    def test_cli_chinese(self):
        res = self._run(["chinese"])
        self.assertEqual(res.returncode, 0)
        self.assertIn("Taxonomy", res.stdout)

    def test_cli_export(self):
        tmp_file = "/tmp/test_export_cli.md"
        res = self._run(["export", "1564", "-o", tmp_file, "-f", "md", "--lang", "zh"])
        self.assertEqual(res.returncode, 0)
        self.assertTrue(Path(tmp_file).exists())

    def test_cli_yopu_search(self):
        res = self._run(["yopu-search", "再见青春", "--format", "json"])
        if res.returncode == 0:
            self.assertTrue("3PbL9Wr1" in res.stdout or "再见青春" in res.stdout)
        else:
            self.assertIn("Search failed", res.stderr)


if __name__ == "__main__":
    unittest.main()
