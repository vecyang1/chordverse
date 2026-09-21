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

    def test_search_yopu_multi_token_and_noise_stripping(self):
        # Multi-token title + artist must successfully match local corpus without throwing ConnectionError
        res = self.importer.search_yopu("怒放的生命 汪峰")
        self.assertIn("results", res)
        self.assertGreater(len(res["results"]), 0)
        titles = [r["title"] for r in res["results"]]
        self.assertTrue(any("怒放的生命" in t for t in titles))

        # Query with noise suffix like 华语流行 or hyphen must be stripped
        res_noise = self.importer.search_yopu("怒放的生命-华语流行")
        self.assertIn("results", res_noise)
        self.assertGreater(len(res_noise["results"]), 0)
        self.assertTrue(any("怒放的生命" in r["title"] for r in res_noise["results"]))

        # Query with delimiters like 汪峰 - 怒放的生命 or 怒放的生命-汪峰
        res_delim1 = self.importer.search_yopu("汪峰 - 怒放的生命")
        self.assertGreater(len(res_delim1.get("results", [])), 0)
        res_delim2 = self.importer.search_yopu("怒放的生命-汪峰")
        self.assertGreater(len(res_delim2.get("results", [])), 0)

        # Query with sheet intent suffix like 吉他谱
        res_sheet = self.importer.search_yopu("怒放的生命 吉他谱")
        self.assertGreater(len(res_sheet.get("results", [])), 0)

        # Query with raw Yopu search URL
        res_url = self.importer.search_yopu("https://yopu.co/search?q=%E6%80%92%E6%94%BE%E7%9A%84%E7%94%9F%E5%91%BD%20%E6%B1%AA%E5%B3%B0")
        self.assertGreater(len(res_url.get("results", [])), 0)


    def test_parse_and_clean_score_with_sheet_data_chords(self):
        from unittest.mock import patch
        mock_sheet = {
            "id": "mock123",
            "title": "晴天",
            "artist": "周杰伦",
            "url": "https://yopu.co/view/mock123",
            "html": "",
            "article": "故事的小黄花 从出生那年就飘着",
            "sheet_data": {
                "id": "mock123",
                "title": "晴天",
                "artist": "周杰伦",
                "key": "G",
                "capo": 0,
                "chords": ["Em", "Cadd9", "G", "D/F#", "Cmaj7", "Dsus4", "D", "B7", "G/D", "Am7"],
                "lyrics": "故事的小黄花 从出生那年就飘着"
            }
        }
        with patch.object(self.importer, "fetch_score_data", return_value=mock_sheet):
            song = self.importer.parse_and_clean_score("mock123")
            self.assertEqual(song.title, "晴天")
            self.assertEqual(song.artist, "周杰伦")
            self.assertEqual(song.key, "G major")
            self.assertEqual(song.capo, 0)
            self.assertIn("6", song.primary_progression)
            self.assertIn("Em", song.primary_chords)
            self.assertIn("Cadd9", song.primary_chords)

    def test_parse_and_clean_score_rejects_empty_input(self):
        with self.assertRaises(ValueError):
            self.importer.parse_and_clean_score("")
        with self.assertRaises(ValueError):
            self.importer.parse_and_clean_score("   ")

    def test_parse_and_clean_score_raises_on_fetch_failure(self):
        from unittest.mock import patch
        with patch.object(self.importer, "fetch_score_data", side_effect=ConnectionError("HTTP 404 Not Found")):
            with self.assertRaises(RuntimeError) as ctx:
                self.importer.parse_and_clean_score("invalid_score_id_9999")
            self.assertIn("Failed to fetch Yopu score", str(ctx.exception))

    def test_fetch_score_data_rejects_empty_id(self):
        with self.assertRaises(ValueError):
            self.importer.fetch_score_data("")

    def test_parse_and_clean_score_no_dummy_progression_when_no_chords(self):
        # Raw lyrics with no chords must NOT fabricate 1,5,6,4 or C-G-Am-F
        song = self.importer.parse_and_clean_score(
            score_input="纯歌词文本没有任何和弦标记的一首歌\n第二行歌词\n第三行歌词",
            custom_title="无和弦歌曲",
            custom_artist="独立音乐人"
        )
        self.assertEqual(song.title, "无和弦歌曲")
        self.assertEqual(song.primary_progression, "")
        self.assertEqual(song.primary_chords, [])
        self.assertIsNone(song.progression_name)


if __name__ == "__main__":
    unittest.main()

