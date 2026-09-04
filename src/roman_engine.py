"""
Symbolic Music Theory and Roman Numeral Engine.
Handles chord parsing, transposition, key detection, and conversion between
absolute chords (e.g. C, G, Am, F) and relative Roman numerals / scale degrees (e.g. I, V, vi, IV / 1, 5, 6, 4).
"""

from __future__ import annotations
import re
from typing import List, Tuple, Optional, Dict, Any

# Pitch Classes (0 to 11, semitones from C)
NOTE_PITCH: Dict[str, int] = {
    "C": 0, "B#": 0,
    "C#": 1, "DB": 1, "Db": 1,
    "D": 2,
    "D#": 3, "EB": 3, "Eb": 3,
    "E": 4, "FB": 4, "Fb": 4,
    "F": 5, "E#": 5,
    "F#": 6, "GB": 6, "Gb": 6,
    "G": 7,
    "G#": 8, "AB": 8, "Ab": 8,
    "A": 9,
    "A#": 10, "BB": 10, "Bb": 10,
    "B": 11, "CB": 11, "Cb": 11
}

PITCH_TO_NOTE_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
PITCH_TO_NOTE_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

# Major scale intervals in semitones: 1(0), 2(2), 3(4), 4(5), 5(7), 6(9), 7(11)
MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
# Natural Minor scale intervals in semitones: 1(0), 2(2), b3(3), 4(5), 5(7), b6(8), b7(10)
MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10]

ROMAN_MAJOR = ["I", "ii", "iii", "IV", "V", "vi", "vii°"]
ROMAN_MINOR = ["i", "ii°", "III", "iv", "v", "VI", "VII"]

NUMERAL_TO_DEGREE = {
    "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7
}

# Known famous progressions
NAMED_PROGRESSIONS = {
    "1,5,6,4": "Pop-Punk / 4-Chord Progression (Axis of Awesome / 流行四和弦)",
    "6,4,1,5": "Emotional Minor 4-Chord / Sensitive Female Chord Progression (伤感六四一五)",
    "1,6,4,5": "50s Doo-Wop Progression (经典50年代进行 / 倒卡农)",
    "4,5,3,6,2,5,1": "Royal Road / 王道进行 (J-Pop / ACG / 经典华语副歌神级进行)",
    "1,5,6,3,4,1,2,5": "Pachelbel's Canon in D Progression (经典卡农进行)",
    "1,5,6,3,4,1,4,5": "Canon Variation Progression (流行卡农变体)",
    "6,5,4,3,2,1,7,3": "La Folia / 古典悲伤下行",
    "2,5,1": "Jazz ii-V-I Standard (爵士标准进行)",
    "1,4,5": "I-IV-V Classic Rock & Blues (经典摇滚三和弦)",
    "1,4,6,5": "Modern Pop Variation (1-4-6-5 进行)",
    "4,5,6,1": "J-Pop Variant (四五六一进行)",
    "4,5,3,6": "Royal Road 4-Chord Variant (小王道进行 / 4536)",
    "6,2,5,1": "vi-ii-V-I Circle Loop (华语抒情 6251 循环 / POP909 最常见循环)",
    "3,6,2,5": "iii-vi-ii-V Circle-of-Fifths Turnaround (3625 五度循环进行)"
}


def normalize_note_name(raw: str) -> str:
    """Normalize note string e.g. 'db' -> 'Db', 'c#' -> 'C#'."""
    clean = raw.strip()
    if not clean:
        return ""
    root = clean[0].upper()
    if len(clean) > 1 and clean[1] in ("#", "b", "B"):
        acc = "#" if clean[1] == "#" else "b"
        return root + acc
    return root


def parse_chord_string(chord: str) -> Tuple[str, str, Optional[str]]:
    """
    Parse a chord string into (root, quality, bass).
    e.g. 'C#m7/G#' -> ('C#', 'm7', 'G#')
         'Fmaj7' -> ('F', 'maj7', None)
         'Gsus4' -> ('G', 'sus4', None)
    """
    chord = chord.strip()
    if "/" in chord:
        main, bass = chord.split("/", 1)
        bass = normalize_note_name(bass)
    else:
        main = chord
        bass = None

    if not main:
        return ("", "", None)

    m = re.match(r"^([A-Ga-g][#bB]?)(.*)$", main)
    if not m:
        return (main, "", bass)

    root = normalize_note_name(m.group(1))
    quality = m.group(2).strip()
    return (root, quality, bass)


def chord_to_scale_degree(chord: str, key_root: str = "C", scale_type: str = "major") -> Tuple[int, str]:
    """
    Convert an absolute chord (e.g. 'Am', 'G7') to a scale degree number (1-7) and Roman numeral.
    Returns (degree_num, roman_str).
    """
    root, quality, _ = parse_chord_string(chord)
    if root not in NOTE_PITCH:
        return (0, "?")

    key_root_norm = normalize_note_name(key_root)
    if key_root_norm not in NOTE_PITCH:
        key_root_norm = "C"

    root_pitch = NOTE_PITCH[root]
    key_pitch = NOTE_PITCH[key_root_norm]
    semitones = (root_pitch - key_pitch) % 12

    intervals = MAJOR_INTERVALS if scale_type.lower() == "major" else MINOR_INTERVALS
    
    if semitones in intervals:
        degree = intervals.index(semitones) + 1
    else:
        closest = 0
        for i, val in enumerate(intervals):
            if val <= semitones:
                closest = i + 1
        degree = closest

    is_minor = (
        "m" in quality.lower() and "maj" not in quality.lower()
    ) or "dim" in quality.lower() or "°" in quality

    roman_base = ["I", "II", "III", "IV", "V", "VI", "VII"][degree - 1]
    roman = roman_base.lower() if is_minor else roman_base

    if "maj7" in quality:
        roman += "maj7"
    elif "7" in quality:
        roman += "7"
    elif "dim" in quality or "°" in quality:
        roman += "°"
    elif "sus4" in quality:
        roman += "sus4"

    return (degree, roman)


def progression_to_scale_degrees(chords: List[str], key_root: str = "C", scale_type: str = "major") -> List[int]:
    """Convert a list of chords to a list of scale degrees (e.g. [1, 5, 6, 4])."""
    return [chord_to_scale_degree(c, key_root, scale_type)[0] for c in chords if c.strip()]


def scale_degrees_to_chords(degrees: List[int], key_root: str = "C", scale_type: str = "major") -> List[str]:
    """
    Given a list of scale degrees (e.g. [1, 5, 6, 4]) and a key, return default diatonic chords.
    e.g. [1, 5, 6, 4] in C major -> ['C', 'G', 'Am', 'F']
    """
    key_root_norm = normalize_note_name(key_root)
    if key_root_norm not in NOTE_PITCH:
        key_root_norm = "C"

    key_pitch = NOTE_PITCH[key_root_norm]
    intervals = MAJOR_INTERVALS if scale_type.lower() == "major" else MINOR_INTERVALS
    use_flats = "b" in key_root_norm or key_root_norm in ("F", "Bb", "Eb", "Ab", "Db", "Gb")
    pitch_map = PITCH_TO_NOTE_FLAT if use_flats else PITCH_TO_NOTE_SHARP

    chords = []
    for d in degrees:
        if 1 <= d <= 7:
            semi = (key_pitch + intervals[d - 1]) % 12
            note = pitch_map[semi]
            if scale_type.lower() == "major":
                if d in (2, 3, 6):
                    chords.append(note + "m")
                elif d == 7:
                    chords.append(note + "dim")
                else:
                    chords.append(note)
            else:
                if d in (1, 4, 5):
                    chords.append(note + "m")
                elif d == 2:
                    chords.append(note + "dim")
                else:
                    chords.append(note)
    return chords


def normalize_progression_input(prog_str: str) -> Tuple[str, str, List[int]]:
    """
    Standardize various user input formats into normalized representations.
    Supports:
      '1,5,6,4', '1-5-6-4', '1 5 6 4', '1564',
      'I-V-vi-IV', 'I V vi IV', 'I,V,vi,IV',
      'I-V-VI-IV'
    Returns:
      (comma_separated_degrees '1,5,6,4',
       hyphenated_roman 'I-V-vi-IV',
       degrees_list [1, 5, 6, 4])
    """
    clean = prog_str.strip()
    if not clean:
        return ("", "", [])

    if re.fullmatch(r"^[1-7]{2,8}$", clean):
        degrees = [int(c) for c in clean]
    else:
        tokens = [t.strip() for t in re.split(r"[\s,\-\>\|/]+", clean) if t.strip()]
        degrees = []
        for t in tokens:
            t_low = t.lower()
            base = re.match(r"^([ivx1-7]+)", t_low)
            if base:
                sym = base.group(1)
                if sym in NUMERAL_TO_DEGREE:
                    degrees.append(NUMERAL_TO_DEGREE[sym])
                elif sym.isdigit() and 1 <= int(sym) <= 7:
                    degrees.append(int(sym))

    comma_str = ",".join(str(d) for d in degrees)
    
    roman_tokens = []
    for d in degrees:
        if 1 <= d <= 7:
            roman_tokens.append(ROMAN_MAJOR[d - 1])
        else:
            roman_tokens.append(str(d))
    roman_str = "-".join(roman_tokens)

    return (comma_str, roman_str, degrees)


def matches_progression_sequence(song_degrees: List[int], target_degrees: List[int], exact: bool = False) -> bool:
    """
    Check if a sequence of song degrees contains or matches the target degrees.
    """
    if not song_degrees or not target_degrees:
        return False

    if exact:
        return song_degrees == target_degrees

    t_len = len(target_degrees)
    s_len = len(song_degrees)
    if s_len < t_len:
        return False

    for i in range(s_len - t_len + 1):
        if song_degrees[i:i + t_len] == target_degrees:
            return True
    return False


def count_occurrences(song_degrees: List[int], target_degrees: List[int]) -> int:
    """How many times target occurs as a contiguous run inside song_degrees."""
    t_len = len(target_degrees)
    if not target_degrees or len(song_degrees) < t_len:
        return 0
    return sum(1 for i in range(len(song_degrees) - t_len + 1) if song_degrees[i:i + t_len] == target_degrees)


def parse_degree_sequence(sequence: str) -> List[List[int]]:
    """'1,5,6,4,x,2,5,1' -> [[1,5,6,4],[2,5,1]]; 'x' marks a non-diatonic break."""
    runs: List[List[int]] = []
    for run in str(sequence or "").split("x"):
        degs = [int(tok) for tok in run.split(",") if tok.strip().isdigit()]
        if degs:
            runs.append(degs)
    return runs


def match_loop_or_sequence(
    loop_degrees: List[int],
    target_degrees: List[int],
    sequence_runs: Optional[List[List[int]]] = None,
    min_sequence_occurrences: int = 2,
) -> Optional[str]:
    """
    Decide whether a song matches a queried progression.

    A stored loop repeats, so the query is matched against the loop played
    twice (6-4-1-5 therefore also answers 1-5-6-4). When the whole-song degree
    sequence is available, a query that occurs at least `min_sequence_occurrences`
    times anywhere in it also matches — that is how an 8-chord Canon query finds
    a song whose primary loop was indexed as 4 chords.

    Returns "loop", "sequence", or None.
    """
    if not target_degrees:
        return None
    if loop_degrees and len(loop_degrees) >= 2:
        doubled = list(loop_degrees) + list(loop_degrees)
        if matches_progression_sequence(doubled, target_degrees):
            return "loop"
    elif loop_degrees and matches_progression_sequence(loop_degrees, target_degrees):
        return "loop"
    if sequence_runs:
        hits = sum(count_occurrences(run, target_degrees) for run in sequence_runs)
        if hits >= min_sequence_occurrences:
            return "sequence"
    return None


def get_progression_name(prog_str: str) -> Optional[str]:
    """Get the common industry/theory name for a chord progression if recognized."""
    comma_str, _, _ = normalize_progression_input(prog_str)
    return NAMED_PROGRESSIONS.get(comma_str)


def is_subsequence(sub: List[int], main_seq: List[int]) -> bool:
    """Check if sub list is a contiguous subsegment of main_seq."""
    return matches_progression_sequence(main_seq, sub, exact=False)


def chords_to_roman(chords: List[str], key_center: str = "C", scale_type: str = "major") -> Dict[str, Any]:
    """
    Given a list of absolute chords (e.g. ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C']),
    convert to Roman numerals, scale degrees, and detect recognized patterns.
    """
    clean_chords = [c.strip() for c in chords if c.strip()]
    degrees = []
    romans = []

    for c in clean_chords:
        deg, rom = chord_to_scale_degree(c, key_root=key_center, scale_type=scale_type)
        degrees.append(deg)
        romans.append(rom)

    deg_str = ",".join(str(d) for d in degrees)
    rom_str = "-".join(romans)

    recognized = []
    for pattern_str, name in NAMED_PROGRESSIONS.items():
        _, _, pat_degs = normalize_progression_input(pattern_str)
        if is_subsequence(pat_degs, degrees):
            recognized.append({
                "pattern": pattern_str,
                "progression": pattern_str,
                "name": name
            })

    return {
        "input_chords": clean_chords,
        "key": f"{key_center} {scale_type}",
        "scale_degrees": degrees,
        "progression_string": deg_str,
        "roman_numerals": rom_str,
        "recognized_progressions": recognized
    }
