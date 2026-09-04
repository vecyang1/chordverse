"""Pure-function tests for the POP909 ingestion rules (no dataset download)."""

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import ingest_pop909 as ing  # noqa: E402


class TestKeyHandling(unittest.TestCase):
    def test_longest_key_segment_wins(self):
        lines = ["0.0\t20.0\tC:maj", "20.0\t200.0\tA:min", "200.0\t215.0\tBb:maj"]
        self.assertEqual(ing.parse_key_file(lines), ("A", "minor"))

    def test_minor_key_is_analysed_in_relative_major(self):
        self.assertEqual(ing.analysis_key_for("A", "minor"), "C")
        self.assertEqual(ing.analysis_key_for("E", "minor"), "G")
        self.assertEqual(ing.analysis_key_for("Eb", "minor"), "Gb")
        self.assertEqual(ing.analysis_key_for("C", "minor"), "Eb")
        self.assertEqual(ing.analysis_key_for("Gb", "major"), "Gb")

    def test_empty_key_file_defaults_to_c_major(self):
        self.assertEqual(ing.parse_key_file([]), ("C", "major"))


class TestChordDegrees(unittest.TestCase):
    def test_pop909_labels_become_chord_names(self):
        self.assertEqual(ing.pop909_label_to_chord("B:maj7"), "Bmaj7")
        self.assertEqual(ing.pop909_label_to_chord("C#:maj"), "C#")
        self.assertEqual(ing.pop909_label_to_chord("Bb:min7"), "Bbm7")
        self.assertEqual(ing.pop909_label_to_chord("G:maj/3"), "G")
        self.assertEqual(ing.pop909_label_to_chord("F:hdim7"), "Fm7b5")
        self.assertIsNone(ing.pop909_label_to_chord("N"))

    def test_degrees_against_relative_major_of_a_minor_song(self):
        # Am F C G in A minor -> 6 4 1 5 against C major (the 简谱 convention).
        key_pitch = ing.NOTE_PITCH[ing.analysis_key_for("A", "minor")]
        chords = ["Am", "F", "C", "G"]
        self.assertEqual(ing.degree_sequence(chords, key_pitch), [6, 4, 1, 5])
        romans = [ing.chord_to_degree(c, key_pitch)[1] for c in chords]
        self.assertEqual(romans, ["vi", "IV", "I", "V"])

    def test_gb_major_song_from_the_dataset(self):
        # pop909_001: Bmaj7 C# Bbm7 Ebm in Gb major -> IV V iii vi. The old
        # index filed this song as 6,4,5,1.
        key_pitch = ing.NOTE_PITCH["Gb"]
        chords = ["Bmaj7", "C#", "Bbm7", "Ebm"]
        self.assertEqual(ing.degree_sequence(chords, key_pitch), [4, 5, 3, 6])
        self.assertEqual([ing.chord_to_degree(c, key_pitch)[1] for c in chords], ["IV", "V", "iii", "vi"])

    def test_non_diatonic_chord_breaks_the_sequence(self):
        key_pitch = ing.NOTE_PITCH["C"]
        self.assertEqual(ing.degree_sequence(["C", "Eb", "F", None, "G"], key_pitch), [1, None, 4, None, 5])
        self.assertEqual(ing.chord_to_degree("Bdim", key_pitch), (7, "vii°"))

    def test_compact_sequence_collapses_breaks(self):
        self.assertEqual(ing.compact_sequence([None, 1, 5, None, None, 6, 4, None]), "1,5,x,6,4")


class TestLoopDetection(unittest.TestCase):
    def test_periodic_windows_are_rejected(self):
        self.assertTrue(ing.is_repetition_of_shorter_cycle((1, 5, 6, 4, 1, 5)))
        self.assertTrue(ing.is_repetition_of_shorter_cycle((1, 5, 6, 4, 1, 5, 6, 4)))
        self.assertFalse(ing.is_repetition_of_shorter_cycle((4, 5, 3, 6, 2, 5, 1)))
        self.assertFalse(ing.is_repetition_of_shorter_cycle((1, 5, 6, 3, 4, 1, 2, 5)))

    def test_pure_four_chord_loop_stays_four_chords(self):
        seq = [1, 5, 6, 4] * 6
        loop, count, first = ing.find_primary_loop(seq)
        self.assertEqual(loop, (1, 5, 6, 4))
        self.assertEqual(count, 6)
        self.assertEqual(first, 0)

    def test_royal_road_is_reported_as_seven_chords(self):
        seq = [4, 5, 3, 6, 2, 5, 1] * 5
        loop, count, _ = ing.find_primary_loop(seq)
        self.assertEqual(loop, (4, 5, 3, 6, 2, 5, 1))
        self.assertEqual(count, 5)

    def test_canon_is_reported_as_eight_chords(self):
        seq = [1, 5, 6, 3, 4, 1, 2, 5] * 4
        loop, _, _ = ing.find_primary_loop(seq)
        self.assertEqual(loop, (1, 5, 6, 3, 4, 1, 2, 5))

    def test_dominant_four_chord_loop_beats_a_rare_long_loop(self):
        seq = [1, 5, 6, 4] * 10 + [None] + [4, 5, 3, 6, 2, 5, 1] * 2
        loop, count, _ = ing.find_primary_loop(seq)
        self.assertEqual(loop, (1, 5, 6, 4))
        self.assertEqual(count, 10)

    def test_loops_never_span_a_break(self):
        seq = [1, 5, 6, None] * 5
        self.assertEqual(ing.loop_candidates(seq, 4), {}, "every 4-window crosses a break")
        self.assertEqual(ing.find_primary_loop(seq), None)

    def test_rotation_with_the_most_repetitions_wins(self):
        # The phrase starts on 6: 6-4-1-5 completes three times, 1-5-6-4 only twice.
        seq = [6, 4, 1, 5] * 3
        loop, count, _ = ing.find_primary_loop(seq)
        self.assertEqual(loop, (6, 4, 1, 5))
        self.assertEqual(count, 3)


class TestIndexSong(unittest.TestCase):
    def test_index_song_describes_the_loop_not_the_intro(self):
        key_lines = ["0.0\t180.0\tA:min"]
        # Intro on a non-diatonic chord, then the 6-4-1-5 loop three times.
        chord_lines = ["0.0\t1.0\tN", "1.0\t2.0\tEb:maj"]
        t = 2.0
        for _ in range(3):
            for label in ("A:min", "F:maj", "C:maj", "G:maj"):
                chord_lines.append(f"{t}\t{t + 1}\t{label}")
                t += 1
        row = ing.index_song("999", {"title": "T", "artist": "A"}, key_lines, chord_lines)
        self.assertEqual(row["key"], "A minor")
        self.assertEqual(row["analysis_key"], "C major")
        self.assertEqual(row["progression"], "6,4,1,5")
        self.assertEqual(row["roman"], "vi-IV-I-V")
        self.assertEqual(row["chords"], ["Am", "F", "C", "G"], "chords are the loop's, not the intro's")
        self.assertEqual(row["degrees"], [6, 4, 1, 5])
        self.assertEqual(row["loop_repetitions"], 3)
        self.assertTrue(row["is_loop"])
        self.assertEqual(row["degree_sequence"], "6,4,1,5,6,4,1,5,6,4,1,5")
        self.assertEqual(row["total_chords_analyzed"], 13)


class TestCommittedIndex(unittest.TestCase):
    """The committed index must obey the same rules the ingest promises."""

    @classmethod
    def setUpClass(cls):
        with open(ROOT / "data" / "pop909_indexed_chords.json", "r", encoding="utf-8") as f:
            cls.rows = json.load(f)

    def test_909_rows_with_consistent_progression_roman_and_degrees(self):
        self.assertEqual(len(self.rows), 909)
        roman_to_degree = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7}
        for row in self.rows:
            degs = [int(x) for x in row["progression"].split(",")]
            self.assertEqual(degs, row["degrees"], row["id"])
            romans = [tok.rstrip("°").lower() for tok in row["roman"].split("-")]
            self.assertEqual([roman_to_degree[r] for r in romans], degs, row["id"])
            self.assertEqual(len(row["chords"]), len(degs), row["id"])
            self.assertIn(len(degs), (4, 6, 7, 8), row["id"])
            self.assertTrue(row["analysis_key"].endswith(" major"), row["id"])

    def test_minor_songs_are_labelled_with_their_relative_major(self):
        minor = [r for r in self.rows if r["key"].endswith("minor")]
        self.assertGreater(len(minor), 300)
        for row in minor:
            root = row["key"].split()[0]
            expected = ing.analysis_key_for(root, "minor")
            self.assertEqual(row["analysis_key"], f"{expected} major", row["id"])

    def test_loop_chords_reproduce_the_loop_degrees(self):
        for row in self.rows:
            key_pitch = ing.NOTE_PITCH[row["analysis_key"].split()[0]]
            self.assertEqual(ing.degree_sequence(row["chords"], key_pitch), row["degrees"], row["id"])


if __name__ == "__main__":
    unittest.main()
