import unittest
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from analyzer import UnifiedChordAnalyzer


class TestUnifiedChordAnalyzer(unittest.TestCase):
    def setUp(self):
        self.analyzer = UnifiedChordAnalyzer()

    def test_search_chinese_1564(self):
        res = self.analyzer.search("1564", language="zh")
        self.assertEqual(res["progression"], "1,5,6,4")
        self.assertEqual(res["roman_progression"], "I-V-vi-IV")
        self.assertGreaterEqual(res["total_count"], 15)
        
        # Check famous Chinese songs
        titles = [s["title"] for s in res["songs"]]
        self.assertTrue(any("晴天" in t for t in titles))
        self.assertTrue(any("简单爱" in t for t in titles))
        self.assertTrue(any("突然好想你" in t for t in titles))

    def test_search_chinese_royal_road(self):
        res = self.analyzer.search("4536251", language="zh")
        titles = [s["title"] for s in res["songs"]]
        self.assertTrue(any("青花瓷" in t for t in titles))
        self.assertTrue(any("发如雪" in t for t in titles))

    def test_search_artist_filter(self):
        res = self.analyzer.search("1564", language="zh", artist_filter="周杰伦")
        for s in res["songs"]:
            self.assertIn("周杰伦", s["artist"])

    def test_next_chord_probabilities(self):
        """1-5-6 is followed by 4 more often than anything else, and the answer
        is counted evidence from the corpus, not a hand-written table."""
        res = self.analyzer.get_next_chords("1,5,6")
        probs = res["next_chord_probabilities"]
        self.assertGreater(len(probs), 0)
        self.assertEqual(res["source"], "corpus_ngram")
        self.assertEqual(res["context_used"], "1,5,6")
        self.assertGreaterEqual(res["sample_songs"], 100)
        top = probs[0]
        self.assertEqual(top["chord"], "4")
        self.assertEqual(top["roman"], "IV")
        # Measured 2026-09-04 on 1,087 songs: 0.33. A fabricated table said 0.78.
        self.assertGreater(top["probability"], 0.2)
        self.assertLess(top["probability"], 0.6)
        self.assertGreaterEqual(top["song_count"], 100)
        self.assertAlmostEqual(sum(p["probability"] for p in probs), 1.0, delta=0.15)

    def test_analyze_chords(self):
        res = self.analyzer.analyze_chords(["F", "G", "Em", "Am", "Dm", "G", "C"], key="C")
        self.assertEqual(res["progression_string"], "4,5,3,6,2,5,1")
        self.assertEqual(res["roman_numerals"], "IV-V-iii-vi-ii-V-I")
        self.assertTrue(len(res["recognized_progressions"]) > 0)

    def test_export_formats(self):
        res = self.analyzer.search("1564", language="zh")
        csv_out = self.analyzer.export_data(res, "csv")
        self.assertIn("Title,Artist,Section", csv_out)
        self.assertIn("晴天", csv_out)

        md_out = self.analyzer.export_data(res, "markdown")
        self.assertIn("# 🎵 Chord Progression Analysis", md_out)


if __name__ == "__main__":
    unittest.main()
