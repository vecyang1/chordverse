"""
Unit tests for Hooktheory Client and zero-hallucination validation.
Verifies that Meilisearch keyword / Roman numeral search hits are strictly
gated by scale degree sequence matching before attribution.
"""

import json
import os
import tempfile
import unittest
from unittest.mock import patch, MagicMock

from src.hooktheory_client import HooktheoryClient, extract_hit_degrees, SongEntry
from src.analyzer import UnifiedChordAnalyzer


def _make_mock_response(hits):
    mock_resp = MagicMock()
    mock_resp.__enter__.return_value = mock_resp
    mock_resp.read.return_value = json.dumps({"hits": hits}).encode("utf-8")
    return mock_resp


class TestHooktheoryClient(unittest.TestCase):
    def test_extract_hit_degrees_from_sind(self):
        hit = {
            "song": "When You're Gone",
            "artist": "Avril Lavigne",
            "SInD": "qq1qq56qq67qq4add9qq5sus4qq5qq 3qq4qq1qq"
        }
        degs = extract_hit_degrees(hit)
        self.assertEqual(degs, [1, 5, 6, 4, 5, 5, 3, 4, 1])

    def test_extract_hit_degrees_from_chord_rel_bare(self):
        hit = {
            "song": "Test Song",
            "artist": "Test Artist",
            "SInD": "",
            "chordRelBare": "qqIqqVqqviqqIVqq"
        }
        degs = extract_hit_degrees(hit)
        self.assertEqual(degs, [1, 5, 6, 4])

    def test_extract_hit_degrees_slash_chords(self):
        hit = {
            "song": "Slash Song",
            "artist": "Test Artist",
            "chordRelBare": "qqIqqVslashIVqqIVqqVqq"
        }
        degs = extract_hit_degrees(hit)
        self.assertEqual(degs, [1, 5, 4, 5])

    def test_meilisearch_rejection_of_hallucinated_songs(self):
        """
        Verify that Meilisearch hits matching Roman 'IV' in title or bag-of-words
        are rejected if they do not contain the target sequence.
        """
        fake_hits = [
            {
                "id": 101,
                "song": "D-I-V-O-R-C-E",
                "artist": "Tammy Wynette",
                "section": "Chorus",
                "key": "D major",
                "SInD": "qq1qq5qq4qq5qq1qq5qq5qq1qq4qq5qq1qq",
                "chordAbsBare": "qqDqqA7qqGqqA7qqDqq"
            },
            {
                "id": 102,
                "song": "George IV-Couldn't Stand My Wife",
                "artist": "Horrible Histories",
                "section": "Verse",
                "key": "C major",
                "SInD": "qq1qq5qq5qq4qq2qq6qq1qq",
                "chordAbsBare": "qqCqqGqqGqqFqqDmqq"
            },
            {
                "id": 103,
                "song": "Feldschlacht IV",
                "artist": "Masashi Hamauzu",
                "section": "Intro",
                "key": "C major",
                "SInD": "qq1qq5qq4qq3qq6qq7qq",
                "chordAbsBare": "qqCqqGqqFqqEmqqAmqq"
            }
        ]

        mock_resp = _make_mock_response(fake_hits)
        client = HooktheoryClient(cache_enabled=False)
        with patch("urllib.request.urlopen", return_value=mock_resp):
            results = client.search_songs("4,5,3,6,2,5,1", max_pages=1, use_cache=False)

        # None of the fake hits contain 4,5,3,6,2,5,1
        self.assertEqual(len(results), 0)

    def test_sequence_validation_acceptance_of_genuine_songs(self):
        """
        Verify that songs genuinely containing the sequence are accepted
        and accurately stamped with matching attributes.
        """
        fake_hits = [
            {
                "id": 201,
                "song": "When You're Gone",
                "artist": "Avril Lavigne",
                "section": "Chorus",
                "key": "G major",
                "SInD": "qq1qq56qq67qq4add9qq5sus4qq5qq",
                "chordAbsBare": "qqGqqDqqEmqqC(add9)qqDsus4qqDqq"
            },
            {
                "id": 202,
                "song": "George IV-Couldn't Stand My Wife",
                "artist": "Horrible Histories",
                "section": "Verse",
                "key": "C major",
                "SInD": "qq1qq2qq3qq",
                "chordAbsBare": "qqCqqDmqqEmqq"
            }
        ]

        mock_resp = _make_mock_response(fake_hits)
        client = HooktheoryClient(cache_enabled=False)
        with patch("urllib.request.urlopen", return_value=mock_resp):
            results = client.search_songs("1,5,6,4", max_pages=1, use_cache=False)

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].title, "When You're Gone")
        self.assertEqual(results[0].artist, "Avril Lavigne")
        self.assertEqual(results[0].progression, "1,5,6,4")
        self.assertEqual(results[0].roman_progression, "I-V-vi-IV")
        self.assertEqual(results[0].chords, ["G", "D", "Em", "C(add9)"])

    def test_cache_not_polluted_with_unmatched_songs(self):
        """Verify that cache is never written with hallucinated songs."""
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_cache_path = os.path.join(tmpdir, "test_cache.json")
            with patch("src.hooktheory_client.CACHE_FILE", MagicMock(exists=lambda: False)):
                client = HooktheoryClient(cache_enabled=True)
                client._cache = {}

                fake_hits = [{
                    "id": 999,
                    "song": "D-I-V-O-R-C-E",
                    "artist": "Tammy Wynette",
                    "section": "Chorus",
                    "key": "D major",
                    "SInD": "qq1qq5qq4qq5qq1qq",
                    "chordAbsBare": "qqDqqAqqGqq"
                }]
                mock_resp = _make_mock_response(fake_hits)

                with patch("urllib.request.urlopen", return_value=mock_resp):
                    results = client.search_songs("4,5,3,6,2,5,1", max_pages=1, use_cache=False)

                self.assertEqual(len(results), 0)
                self.assertNotIn("songs_4,5,3,6,2,5,1", client._cache)


    def test_analyzer_search_zero_hallucination_for_royal_road(self):
        """UnifiedChordAnalyzer must return 0 hallucinated western songs for 4,5,3,6,2,5,1."""
        analyzer = UnifiedChordAnalyzer()
        res = analyzer.search("4,5,3,6,2,5,1", language="en")
        for song in res["songs"]:
            self.assertNotEqual(song["title"], "D-I-V-O-R-C-E")
            self.assertNotIn("George IV", song["title"])
            self.assertNotIn("Feldschlacht IV", song["title"])


if __name__ == "__main__":
    unittest.main()
