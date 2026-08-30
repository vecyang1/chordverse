import unittest
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from pop909_engine import ChinesePopEngine
from roman_engine import normalize_progression_input


class TestPOP909Engine(unittest.TestCase):
    def setUp(self):
        self.engine = ChinesePopEngine()

    def test_pop909_index_loaded(self):
        self.assertGreater(len(self.engine._pop909_data), 0, "POP909 indexed songs should be loaded")

    def test_search_pop909_1564(self):
        results = self.engine.search_songs("1,5,6,4")
        self.assertGreater(len(results), 5)
        titles = [r.title for r in results]
        self.assertTrue(any("晴天" in t for t in titles))
        self.assertTrue(any("存在" in t for t in titles) or any("怒放的生命" in t for t in titles))

    def test_search_pop909_royal_road_4536251(self):
        results = self.engine.search_songs("4,5,3,6,2,5,1")
        self.assertGreater(len(results), 3)
        titles = [r.title for r in results]
        self.assertTrue(any("青花瓷" in t for t in titles) or any("发如雪" in t for t in titles))

    def test_search_pop909_canon_15634125(self):
        results = self.engine.search_songs("1,5,6,3,4,1,2,5")
        self.assertGreater(len(results), 2)
        titles = [r.title for r in results]
        self.assertTrue(any("说好的幸福呢" in t for t in titles) or any("安静" in t for t in titles) or any("七里香" in t for t in titles))

    def test_search_pop909_6415(self):
        results = self.engine.search_songs("6,4,1,5")
        self.assertGreater(len(results), 3)
        titles = [r.title for r in results]
        self.assertTrue(any("爱在西元前" in t for t in titles) or any("北京北京" in t for t in titles) or any("平凡之路" in t for t in titles))


if __name__ == "__main__":
    unittest.main()
