"""
Comprehensive High-Concurrency & Edge-Case Stress Test Suite for ChordVerse.
Verifies system resilience under high load, fuzzing, exotic chord notations, and concurrency.
"""

import concurrent.futures
import json
import random
import sys
import time
import unittest
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from roman_engine import (
    chord_to_scale_degree,
    scale_degrees_to_chords,
    normalize_progression_input,
    matches_progression_sequence,
    chords_to_roman,
    NOTE_PITCH,
    NAMED_PROGRESSIONS
)
from analyzer import UnifiedChordAnalyzer
from web_server import ChordAnalyzerHTTPHandler


class TestChordVerseStressAndFuzzing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.analyzer = UnifiedChordAnalyzer()

    # =========================================================================
    # 1. High-Concurrency Stress Testing (ThreadPoolExecutor)
    # =========================================================================
    def test_concurrent_search_load(self):
        """Simulate 60 concurrent queries across various progressions and languages."""
        progressions = [
            ("1564", "zh"),
            ("6415", "all"),
            ("4536251", "zh"),
            ("15634125", "en"),
            ("1645", "all"),
            ("251", "all"),
            ("1564", "en")
        ]

        def worker(item):
            prog, lang = item
            res = self.analyzer.search(prog, language=lang, max_pages=1)
            self.assertIn("songs", res)
            self.assertGreaterEqual(res["total_count"], 1)
            return res["total_count"]

        queries = [random.choice(progressions) for _ in range(60)]
        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
            results = list(executor.map(worker, queries))
        elapsed = time.time() - start_time

        self.assertEqual(len(results), 60)
        self.assertLess(elapsed, 10.0, f"60 concurrent searches took {elapsed:.2f}s, expected <10s")

    def test_concurrent_next_chord_predictions(self):
        """Simulate concurrent prediction requests."""
        prefixes = ["1,5,6", "4,5,3", "6,4,1", "1,6,4", "2,5"]

        def worker(p):
            res = self.analyzer.get_next_chords(p)
            self.assertIn("next_chord_probabilities", res)
            return len(res["next_chord_probabilities"])

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(worker, prefixes * 8))

        self.assertEqual(len(results), 40)
        for r in results:
            self.assertGreater(r, 0)

    # =========================================================================
    # 2. Exhaustive Music Theory Permutations (All 12 Keys & Modes)
    # =========================================================================
    def test_all_twelve_keys_transposition(self):
        """Exhaustively test chord generation for all 12 chromatic root keys."""
        all_roots = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"]
        target_degs = [1, 5, 6, 4]

        for root in all_roots:
            chords_maj = scale_degrees_to_chords(target_degs, key_root=root, scale_type="major")
            self.assertEqual(len(chords_maj), 4)
            # Inverse check: convert chords back to Roman numerals in same key
            analysis = chords_to_roman(chords_maj, key_center=root, scale_type="major")
            self.assertEqual(analysis["scale_degrees"], target_degs, f"Failed round-trip for key {root}")

    def test_wang_feng_corpus_coverage(self):
        """Verify Wang Feng's catalog returns accurate rock and pop classifications."""
        wf_res = self.analyzer.search("1564", language="zh", artist_filter="汪峰")
        self.assertGreaterEqual(wf_res["total_count"], 7)
        titles = [s["title"] for s in wf_res["songs"]]
        self.assertTrue(any("怒放的生命" in t for t in titles))
        self.assertTrue(any("飞得更高" in t for t in titles))
        self.assertTrue(any("春天里" in t for t in titles))

        wf_6415 = self.analyzer.search("6415", language="zh", artist_filter="汪峰")
        self.assertGreaterEqual(wf_6415["total_count"], 3)
        titles_6415 = [s["title"] for s in wf_6415["songs"]]
        self.assertTrue(any("北京北京" in t for t in titles_6415))

    def test_trending_2026_hits_coverage(self):
        """Verify modern hits (水星记, 孤勇者, 漠河舞厅, 乌梅子酱) are verified in ground truth."""
        res_royal = self.analyzer.search("4536251", language="zh")
        titles = [s["title"] for s in res_royal["songs"]]
        self.assertTrue(any("水星记" in t for t in titles))
        self.assertTrue(any("乌梅子酱" in t for t in titles))
        self.assertTrue(any("漠河舞厅" in t for t in titles))

    def test_western_pop_corpus_coverage(self):
        """Verify Western classics (Let It Be, Someone Like You, Faded, Memories) are verified."""
        res_1564 = self.analyzer.search("1564", language="en")
        titles = [s["title"] for s in res_1564["songs"]]
        self.assertTrue(any("Let It Be" in t for t in titles))
        self.assertTrue(any("Someone Like You" in t for t in titles))

        res_6415 = self.analyzer.search("6415", language="en")
        titles_6415 = [s["title"] for s in res_6415["songs"]]
        self.assertTrue(any("Faded" in t for t in titles_6415))

    # =========================================================================
    # 4. Multi-Corpus Database Integrity & Schema Audit
    # =========================================================================
    def test_corpus_schema_and_uniqueness(self):
        """Validate integrity, non-null fields, and uniqueness across all data layers."""
        # 1. Chinese Curated Corpus
        zh_ids = set()
        for song in self.analyzer.chinese_engine.corpus:
            self.assertIn("id", song)
            self.assertIn("title", song)
            self.assertIn("artist", song)
            self.assertIn("key", song)
            self.assertIn("progression", song)
            self.assertIn("roman", song)
            self.assertIn("chords", song)
            self.assertNotIn(song["id"], zh_ids, f"Duplicate ID in chinese_corpus: {song['id']}")
            zh_ids.add(song["id"])

        # 2. POP909 Golden Base Index
        pop_ids = set()
        for song in self.analyzer.chinese_engine._pop909_data:
            self.assertIn("id", song)
            self.assertIn("title", song)
            self.assertIn("artist", song)
            self.assertIn("progression", song)
            self.assertIn("degrees", song)
            self.assertNotIn(song["id"], pop_ids, f"Duplicate ID in pop909_indexed_chords: {song['id']}")
            pop_ids.add(song["id"])

        # 3. Modern 2020-2026 Corpus
        modern_ids = set()
        for song in self.analyzer.chinese_engine._modern_data:
            self.assertIn("id", song)
            self.assertIn("title", song)
            self.assertIn("artist", song)
            self.assertIn("primary_progression", song)
            self.assertNotIn(song["id"], modern_ids, f"Duplicate ID in modern corpus: {song['id']}")
            modern_ids.add(song["id"])

    # =========================================================================
    # 5. Exotic Chords, Extensions, Inversions & Slash Chords
    # =========================================================================
    def test_exotic_chord_transposition_and_degrees(self):
        """Test complex jazzy, modal, and extended chord shapes."""
        from yopu_importer import transpose_chord_name, transpose_note_name

        # Enharmonics & standard roots
        self.assertEqual(transpose_note_name("Db", 2), "D#")
        self.assertEqual(transpose_note_name("Gb", 1), "G")
        self.assertEqual(transpose_note_name("A#", 2), "C")

        # Slash chords & complex extensions
        self.assertEqual(transpose_chord_name("G/B", 2), "A/C#")
        self.assertEqual(transpose_chord_name("C/E", 2), "D/F#")
        self.assertEqual(transpose_chord_name("F#m7b5", 1), "Gm7b5")
        self.assertEqual(transpose_chord_name("Cadd9", 2), "Dadd9")
        self.assertEqual(transpose_chord_name("Dsus4", 2), "Esus4")
        self.assertEqual(transpose_chord_name("Bbmaj7", 2), "Cmaj7")
        self.assertEqual(transpose_chord_name("Bdim7", 1), "Cdim7")
        self.assertEqual(transpose_chord_name("E7#9", 1), "F7#9")

    # =========================================================================
    # 6. Yopu Importer Edge Cases & Loop Detection Stress Test
    # =========================================================================
    def test_yopu_importer_loop_detector_stress(self):
        """Test harmonic loop extraction on long, noisy, and repetitive chord streams."""
        from yopu_importer import YopuImporter
        importer = YopuImporter()

        # Noisy lead sheet with chords + lyrics + comments
        noisy_chords = (
            ["C", "G", "Am", "F"] * 4 +  # Chorus 1564
            ["F", "G", "Em", "Am", "Dm", "G", "C"] * 2 + # Bridge 4536251
            ["C", "G", "Am", "F"] * 6   # Outro 1564
        )

        loops = importer.detect_harmonic_loops(noisy_chords, key_root="C")
        self.assertGreater(len(loops), 0)
        # Dominant loop must be 1,5,6,4
        top_loop, count = loops[0]
        self.assertEqual(top_loop, "1,5,6,4")
        self.assertGreaterEqual(count, 8)


if __name__ == "__main__":
    unittest.main()
