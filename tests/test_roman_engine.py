import unittest
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from roman_engine import (
    normalize_note_name,
    parse_chord_string,
    chord_to_scale_degree,
    progression_to_scale_degrees,
    scale_degrees_to_chords,
    normalize_progression_input,
    matches_progression_sequence,
    get_progression_name
)


class TestRomanEngine(unittest.TestCase):
    def test_normalize_note_name(self):
        self.assertEqual(normalize_note_name("c"), "C")
        self.assertEqual(normalize_note_name("c#"), "C#")
        self.assertEqual(normalize_note_name("db"), "Db")
        self.assertEqual(normalize_note_name("  eb  "), "Eb")
        self.assertEqual(normalize_note_name(""), "")

    def test_parse_chord_string(self):
        self.assertEqual(parse_chord_string("C"), ("C", "", None))
        self.assertEqual(parse_chord_string("Am7"), ("A", "m7", None))
        self.assertEqual(parse_chord_string("G/B"), ("G", "", "B"))
        self.assertEqual(parse_chord_string("C#m7/G#"), ("C#", "m7", "G#"))
        self.assertEqual(parse_chord_string("Fmaj7"), ("F", "maj7", None))

    def test_chord_to_scale_degree(self):
        # In C Major
        self.assertEqual(chord_to_scale_degree("C", "C", "major"), (1, "I"))
        self.assertEqual(chord_to_scale_degree("Dm", "C", "major"), (2, "ii"))
        self.assertEqual(chord_to_scale_degree("Em", "C", "major"), (3, "iii"))
        self.assertEqual(chord_to_scale_degree("F", "C", "major"), (4, "IV"))
        self.assertEqual(chord_to_scale_degree("G", "C", "major"), (5, "V"))
        self.assertEqual(chord_to_scale_degree("Am", "C", "major"), (6, "vi"))
        self.assertEqual(chord_to_scale_degree("Bdim", "C", "major"), (7, "vii°"))
        self.assertEqual(chord_to_scale_degree("G7", "C", "major"), (5, "V7"))

        # In G Major
        self.assertEqual(chord_to_scale_degree("G", "G", "major"), (1, "I"))
        self.assertEqual(chord_to_scale_degree("D", "G", "major"), (5, "V"))
        self.assertEqual(chord_to_scale_degree("Em", "G", "major"), (6, "vi"))
        self.assertEqual(chord_to_scale_degree("C", "G", "major"), (4, "IV"))

    def test_progression_to_scale_degrees(self):
        self.assertEqual(progression_to_scale_degrees(["C", "G", "Am", "F"], "C"), [1, 5, 6, 4])
        self.assertEqual(progression_to_scale_degrees(["G", "D", "Em", "C"], "G"), [1, 5, 6, 4])
        self.assertEqual(progression_to_scale_degrees(["F", "G", "Em", "Am", "Dm", "G", "C"], "C"), [4, 5, 3, 6, 2, 5, 1])

    def test_scale_degrees_to_chords(self):
        self.assertEqual(scale_degrees_to_chords([1, 5, 6, 4], "C"), ["C", "G", "Am", "F"])
        self.assertEqual(scale_degrees_to_chords([1, 5, 6, 4], "G"), ["G", "D", "Em", "C"])
        self.assertEqual(scale_degrees_to_chords([6, 4, 1, 5], "C"), ["Am", "F", "C", "G"])

    def test_normalize_progression_input(self):
        self.assertEqual(normalize_progression_input("1,5,6,4"), ("1,5,6,4", "I-V-vi-IV", [1, 5, 6, 4]))
        self.assertEqual(normalize_progression_input("1564"), ("1,5,6,4", "I-V-vi-IV", [1, 5, 6, 4]))
        self.assertEqual(normalize_progression_input("1-5-6-4"), ("1,5,6,4", "I-V-vi-IV", [1, 5, 6, 4]))
        self.assertEqual(normalize_progression_input("I-V-vi-IV"), ("1,5,6,4", "I-V-vi-IV", [1, 5, 6, 4]))
        self.assertEqual(normalize_progression_input("I V vi IV"), ("1,5,6,4", "I-V-vi-IV", [1, 5, 6, 4]))

    def test_matches_progression_sequence(self):
        self.assertTrue(matches_progression_sequence([1, 5, 6, 4], [1, 5, 6, 4]))
        self.assertTrue(matches_progression_sequence([1, 1, 5, 6, 4, 1], [1, 5, 6, 4]))
        self.assertFalse(matches_progression_sequence([1, 5, 6], [1, 5, 6, 4]))
        self.assertTrue(matches_progression_sequence([4, 5, 3, 6, 2, 5, 1], [4, 5, 3, 6]))

    def test_get_progression_name(self):
        self.assertIn("Pop-Punk", get_progression_name("1,5,6,4"))
        self.assertIn("王道进行", get_progression_name("4,5,3,6,2,5,1"))
        self.assertIn("卡农", get_progression_name("1,5,6,3,4,1,2,5"))


if __name__ == "__main__":
    unittest.main()
