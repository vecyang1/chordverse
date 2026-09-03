import unittest
import sys
import json
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from yopu_importer import (
    YopuImporter,
    transpose_note_name,
    transpose_chord_name
)


class TestYopuImporter(unittest.TestCase):
    def setUp(self):
        self.importer = YopuImporter()

    def test_transpose_notes_and_chords(self):
        self.assertEqual(transpose_note_name("C", 2), "D")
        self.assertEqual(transpose_note_name("G", 2), "A")
        self.assertEqual(transpose_note_name("A", 2), "B")
        self.assertEqual(transpose_chord_name("G/B", 2), "A/C#")
        self.assertEqual(transpose_chord_name("Em7", 2), "F#m7")

    def test_extract_score_id(self):
        self.assertEqual(self.importer.extract_score_id("https://yopu.co/view/aXYaaOXZ"), "aXYaaOXZ")
        self.assertEqual(self.importer.extract_score_id("aXYaaOXZ"), "aXYaaOXZ")

    def test_detect_harmonic_loops(self):
        # 1564 repeated loop
        chords = ["C", "G", "Am", "F", "C", "G", "Am", "F", "C", "G", "Am", "F"]
        loops = self.importer.detect_harmonic_loops(chords, key_root="C")
        self.assertGreater(len(loops), 0)
        self.assertEqual(loops[0][0], "1,5,6,4")

        # Royal Road repeated loop
        rr_chords = ["F", "G", "Em", "Am", "Dm", "G", "C", "C", "F", "G", "Em", "Am", "Dm", "G", "C"]
        rr_loops = self.importer.detect_harmonic_loops(rr_chords, key_root="C")
        self.assertGreater(len(rr_loops), 0)
        self.assertEqual(rr_loops[0][0], "4,5,3,6,2,5,1")

    def test_parse_and_clean_score_with_capo(self):
        raw_sheet = """
        选调 C 变调夹 2
        C G Am F C G Am F
        我将在深秋的黎明出发
        """
        song = self.importer.parse_and_clean_score(
            score_input=raw_sheet,
            custom_title="测试歌曲",
            custom_artist="测试歌手"
        )
        self.assertEqual(song.title, "测试歌曲")
        self.assertEqual(song.artist, "测试歌手")
        self.assertEqual(song.capo, 2)
        self.assertEqual(song.original_key, "D major")
        self.assertEqual(song.primary_progression, "1,5,6,4")
        self.assertEqual(song.primary_roman, "I-V-vi-IV")

    def test_save_and_load_modern_corpus(self):
        import tempfile
        from unittest.mock import patch
        raw_sheet = "C G Am F"
        song = self.importer.parse_and_clean_score(
            score_input=raw_sheet,
            custom_title="测试入库歌曲",
            custom_artist="测试入库歌手"
        )
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            tf.write(b"[]")
            tf.flush()
            temp_path = Path(tf.name)
        try:
            with patch("yopu_importer.MODERN_CORPUS_FILE", temp_path):
                saved = self.importer.save_to_modern_corpus(song)
                self.assertTrue(saved)
                with open(temp_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.assertEqual(len(data), 1)
                self.assertEqual(data[0]["title"], "测试入库歌曲")
        finally:
            if temp_path.exists():
                temp_path.unlink()

    def test_search_yopu(self):
        res = self.importer.search_yopu("再见青春")
        self.assertIn("results", res)
        self.assertGreater(len(res["results"]), 0)
        titles = [r["title"] for r in res["results"]]
        self.assertTrue(any("再见青春" in t for t in titles))


if __name__ == "__main__":
    unittest.main()
