"""Tests for the corpus n-gram model: the builder and the runtime predictor."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
for sub in ("src", "scripts"):
    path = str(ROOT / sub)
    if path not in sys.path:
        sys.path.insert(0, path)

import build_ngram_model as bnm  # noqa: E402
from ngram_model import MIN_SONGS_FOR_CONTEXT, NextChordModel, describe_transition  # noqa: E402


class TestBuilder(unittest.TestCase):
    def test_segments_from_sequence_and_loop(self):
        self.assertEqual(bnm.segments_from_sequence("1,5,6,4,x,2,5,1,x,7"), [[1, 5, 6, 4], [2, 5, 1]])
        self.assertEqual(bnm.segments_from_loop([6, 4, 1, 5]), [[6, 4, 1, 5]])
        self.assertEqual(bnm.segments_from_loop([1]), [])

    def test_transitions_cover_orders_one_to_four(self):
        pairs = bnm.transitions([[1, 5, 6, 4, 1]], max_order=4)
        self.assertIn(("1", 5), pairs)
        self.assertIn(("1,5,6", 4), pairs)
        self.assertIn(("1,5,6,4", 1), pairs)
        self.assertNotIn(("1,5,6,4,1", 1), pairs)

    def test_a_loop_is_walked_once_around_its_cycle(self):
        pairs = bnm.transitions([], [[1, 5, 6, 4]], max_order=4)
        self.assertEqual(pairs.count(("1,5,6", 4)), 1)
        self.assertEqual(pairs.count(("6,4,1", 5)), 1, "the turnaround context wraps around the loop")
        self.assertEqual(pairs.count(("4", 1)), 1)
        self.assertEqual(len([p for p in pairs if "," not in p[0]]), 4, "four order-1 transitions for a 4-chord loop")

    def test_occurrences_and_songs_are_counted_separately(self):
        songs = [
            ("pop909", "a", [[1, 5, 6, 4, 1, 5, 6, 4, 1, 5, 6, 3]], []),  # 1,5,6 -> 4 twice, -> 3 once
            ("chinese_curated", "b", [], bnm.segments_from_loop([1, 5, 6, 4])),  # 1,5,6 -> 4 once
        ]
        model = bnm.build_model(songs)
        ctx = model["contexts"]["1,5,6"]
        self.assertEqual(ctx["songs"], 2)
        self.assertEqual(ctx["occ"], 4)
        self.assertEqual(ctx["next"]["4"], {"occ": 3, "songs": 2})
        self.assertEqual(ctx["next"]["3"], {"occ": 1, "songs": 1})
        self.assertEqual(model["songs_by_source"], {"chinese_curated": 1, "pop909": 1})
        self.assertEqual(model["total_songs"], 2)

    def test_leaderboard_keeps_exact_labels_and_reports_rotation_group(self):
        pop = [{"progression": "6,4,1,5"}, {"progression": "6,4,1,5"}, {"progression": "6,4,1,5"}, {"progression": "1,5,6,4"}, {"progression": "2,5,1,4"}]
        stats = bnm.build_progression_stats(pop, [{"progression": "1,5,6,4"}], [], [])
        top = stats["top"]
        self.assertEqual(top[0]["progression"], "6,4,1,5")
        self.assertEqual(top[0]["songs"], 3)
        self.assertEqual(top[0]["rotation_group_songs"], 5)
        self.assertEqual(top[1]["progression"], "1,5,6,4")
        self.assertEqual(top[1]["name"].split(" (")[0], "Pop-Punk / 4-Chord Progression")
        self.assertEqual(top[1]["by_source"], {"chinese_curated": 1, "pop909": 1})
        self.assertEqual(stats["total_songs"], 6)

    def test_committed_outputs_match_a_fresh_build(self):
        """data/*.json are derived files; a stale commit would ship a stale model."""
        model, stats = bnm.build_all()
        with open(ROOT / "data" / "next_chord_model.json", "r", encoding="utf-8") as f:
            self.assertEqual(json.load(f), json.loads(json.dumps(model, sort_keys=True)))
        with open(ROOT / "data" / "progression_stats.json", "r", encoding="utf-8") as f:
            self.assertEqual(json.load(f), json.loads(json.dumps(stats, sort_keys=True)))
        self.assertGreaterEqual(model["total_songs"], 1000)
        self.assertEqual(stats["top"][0]["progression"], "1,5,6,4")


class TestPredictor(unittest.TestCase):
    def setUp(self):
        self.model = NextChordModel({
            "1,5,6": {"songs": 40, "occ": 100, "next": {"4": {"occ": 60, "songs": 30}, "3": {"occ": 40, "songs": 20}}},
            "5,6": {"songs": 80, "occ": 200, "next": {"4": {"occ": 110, "songs": 60}, "3": {"occ": 90, "songs": 40}}},
            "7,3,6": {"songs": MIN_SONGS_FOR_CONTEXT - 1, "occ": 4, "next": {"2": {"occ": 4, "songs": 4}}},
            "3,6": {"songs": 12, "occ": 30, "next": {"2": {"occ": 20, "songs": 9}, "4": {"occ": 10, "songs": 5}}},
        }, {"max_order": 4, "total_songs": 100, "version": 1})

    def test_predicts_from_the_full_context_when_it_has_evidence(self):
        out = self.model.predict([1, 5, 6])
        self.assertEqual(out["context_used"], "1,5,6")
        self.assertFalse(out["backoff"])
        self.assertEqual(out["source"], "corpus_ngram")
        self.assertEqual(out["sample_songs"], 40)
        self.assertEqual(out["corpus_songs"], 100)
        rows = out["next_chord_probabilities"]
        self.assertEqual([r["chord"] for r in rows], ["4", "3"])
        self.assertEqual(rows[0]["probability"], 0.6)
        self.assertEqual(rows[0]["song_count"], 30)
        self.assertEqual(rows[0]["roman"], "IV")
        self.assertIn("1-5-6-4", rows[0]["description"])

    def test_backs_off_when_the_context_is_too_rare(self):
        out = self.model.predict([7, 3, 6])
        self.assertEqual(out["context_used"], "3,6")
        self.assertTrue(out["backoff"])
        self.assertEqual(out["prefix_progression"], "7,3,6")

    def test_returns_none_when_nothing_is_known(self):
        self.assertIsNone(self.model.predict([2, 2, 2]))

    def test_long_prefix_uses_its_last_max_order_degrees(self):
        out = self.model.predict([4, 4, 1, 5, 6])
        self.assertEqual(out["context_used"], "1,5,6")

    def test_generic_description_names_the_harmonic_function(self):
        self.assertIn("Dominant", describe_transition("2,2", 5))
        self.assertIn("Tonic", describe_transition("2,2", 1))

    def test_load_rejects_a_missing_or_empty_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            missing = Path(tmp) / "nope.json"
            self.assertIsNone(NextChordModel.load(missing))
            empty = Path(tmp) / "empty.json"
            empty.write_text('{"contexts": {}}', encoding="utf-8")
            self.assertIsNone(NextChordModel.load(empty))

    def test_committed_model_loads_and_answers_the_headline_query(self):
        model = NextChordModel.load()
        self.assertIsNotNone(model)
        out = model.predict([1, 5, 6])
        self.assertEqual(out["next_chord_probabilities"][0]["chord"], "4")
        self.assertGreaterEqual(out["sample_songs"], 100)


if __name__ == "__main__":
    unittest.main()
