#!/usr/bin/env python3
"""
POP909 Full Dataset Ingestion & Indexing Pipeline.

Indexes all 909 songs of the academic POP909 dataset (key + chord annotations)
into data/pop909_indexed_chords.json for zero-hallucination querying.

Conventions (every downstream consumer relies on these):

* Scale degrees are computed against the MAJOR key. A song POP909 labels as
  minor is analysed against its RELATIVE major (A minor -> C major), which is
  the 简谱 convention the whole product speaks (Am-F-C-G is "6-4-1-5", not
  "i-VI-III-VII"). `key` keeps POP909's label; `analysis_key` names the major
  key the degrees refer to.
* A chord outside the diatonic major scale is kept in the chord list but BREAKS
  the degree sequence ("x"): no loop and no transition ever spans it.
* `progression` is the song's most frequent repeating loop (4, 6, 7 or 8
  chords). `chords` and `roman` describe the FIRST OCCURRENCE OF THAT LOOP —
  never the song's opening bars. `degree_sequence` is the whole song, so
  longer queries and n-gram models can be answered from the same file.

Usage:
    python3 scripts/ingest_pop909.py [--raw-dir DIR] [--index XLSX]

Without arguments the raw dataset is downloaded once into
~/.cache/chordverse/pop909/ (never /tmp, which macOS purges).
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
STATIC_DATA_DIR = ROOT_DIR / "src" / "static" / "data"
DEFAULT_CACHE_DIR = Path.home() / ".cache" / "chordverse" / "pop909"

POP909_INDEX_URL = "https://raw.githubusercontent.com/music-x-lab/POP909-Dataset/master/POP909/index.xlsx"
POP909_ZIP_URL = "https://raw.githubusercontent.com/music-x-lab/POP909-Dataset/master/POP909.zip"

NOTE_PITCH: Dict[str, int] = {
    "C": 0, "B#": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "Fb": 4,
    "F": 5, "E#": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9,
    "A#": 10, "Bb": 10, "B": 11, "Cb": 11,
}

# Conventional spelling for a major key centre by pitch class.
MAJOR_KEY_NAME = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

MAJOR_SCALE_INTERVALS: Dict[int, Tuple[int, str]] = {
    0: (1, "I"), 2: (2, "II"), 4: (3, "III"), 5: (4, "IV"), 7: (5, "V"), 9: (6, "VI"), 11: (7, "VII"),
}

# Candidate loop lengths, and the minimum share of the best 4-chord loop's
# repetition count a longer loop must reach to be preferred over it.
LOOP_LENGTHS = (4, 6, 7, 8)
LONG_LOOP_MIN_SHARE = 0.75
MIN_DISTINCT_DEGREES = 3

BREAK = "x"

XLSX_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


# ---------------------------------------------------------------------------
# Raw dataset access
# ---------------------------------------------------------------------------

def ensure_raw_dataset(cache_dir: Path) -> Tuple[Path, Path]:
    """Return (index.xlsx, POP909 raw dir), downloading into cache_dir once."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    xlsx_path = cache_dir / "index.xlsx"
    zip_path = cache_dir / "POP909.zip"
    raw_dir = cache_dir / "raw" / "POP909"
    if not xlsx_path.exists():
        print(f"Downloading {POP909_INDEX_URL} ...")
        urllib.request.urlretrieve(POP909_INDEX_URL, xlsx_path)
    if not raw_dir.exists():
        if not zip_path.exists():
            print(f"Downloading {POP909_ZIP_URL} ...")
            urllib.request.urlretrieve(POP909_ZIP_URL, zip_path)
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(cache_dir / "raw")
    if not raw_dir.exists():
        raise SystemExit(f"POP909 raw directory missing after extraction: {raw_dir}")
    return xlsx_path, raw_dir


def extract_metadata(xlsx_path: Path) -> Dict[str, Dict[str, str]]:
    """Read song_id -> {title, artist} from the dataset's index.xlsx."""
    metadata: Dict[str, Dict[str, str]] = {}
    with zipfile.ZipFile(xlsx_path) as z:
        sheet_xml = html.unescape(z.read("xl/worksheets/sheet1.xml").decode("utf-8"))
    tree = ET.fromstring(sheet_xml)
    for row in tree.findall(f".//{XLSX_NS}row"):
        cells: Dict[str, str] = {}
        for cell in row.findall(f"{XLSX_NS}c"):
            col = "".join(ch for ch in cell.get("r", "") if ch.isalpha())
            t = cell.find(f".//{XLSX_NS}t")
            v = cell.find(f"{XLSX_NS}v")
            cells[col] = (t.text if t is not None else (v.text if v is not None else "")) or ""
        if cells.get("A") and cells["A"] != "song_id":
            song_id = cells["A"].zfill(3)
            metadata[song_id] = {
                "title": cells.get("B", f"POP909_{song_id}").strip(),
                "artist": cells.get("C", "华语群星").strip(),
            }
    return metadata


# ---------------------------------------------------------------------------
# Music-theory helpers (pure; unit-tested)
# ---------------------------------------------------------------------------

def normalize_root(raw: str) -> str:
    root = raw.strip()
    if not root:
        return ""
    name = root[0].upper()
    if len(root) > 1 and root[1] in "#b":
        name += root[1]
    return name


def parse_key_file(lines: Sequence[str]) -> Tuple[str, str]:
    """Pick the longest key segment. Returns (root, 'major'|'minor')."""
    best: Optional[Tuple[float, str, str]] = None
    for line in lines:
        parts = line.strip().split()
        if len(parts) < 3:
            continue
        try:
            duration = float(parts[1]) - float(parts[0])
        except ValueError:
            duration = 0.0
        raw_key = parts[2]
        if ":" in raw_key:
            root, mode = raw_key.split(":", 1)
            scale = "minor" if "min" in mode.lower() else "major"
        else:
            root, scale = raw_key, "major"
        root = normalize_root(root)
        if root not in NOTE_PITCH:
            continue
        if best is None or duration > best[0]:
            best = (duration, root, scale)
    if best is None:
        return ("C", "major")
    return (best[1], best[2])


def analysis_key_for(root: str, scale: str) -> str:
    """Major key the degrees are computed against (relative major for minor)."""
    pitch = NOTE_PITCH[root]
    if scale == "minor":
        pitch = (pitch + 3) % 12
        return MAJOR_KEY_NAME[pitch]
    return root


POP909_QUALITY_SUFFIX = {
    "maj": "", "min": "m", "maj7": "maj7", "min7": "m7", "7": "7",
    "dim": "dim", "aug": "aug", "sus4": "sus4", "sus2": "sus2",
    "hdim7": "m7b5", "dim7": "dim7", "maj6": "6", "min6": "m6", "minmaj7": "mMaj7",
}


def pop909_label_to_chord(label: str) -> Optional[str]:
    """'B:maj7' -> 'Bmaj7'; 'N'/'X' -> None (no chord)."""
    if label in ("N", "X", "None", ""):
        return None
    if ":" not in label:
        return label
    root, quality = label.split(":", 1)
    # POP909 occasionally appends an inversion like 'maj/3'; the root is what matters.
    quality = quality.split("/")[0]
    if quality.startswith("(") or quality.startswith("maj("):
        quality = "maj"
    suffix = POP909_QUALITY_SUFFIX.get(quality, quality)
    return f"{root}{suffix}"


def parse_chord_file(lines: Sequence[str]) -> List[Optional[str]]:
    """Chord names in order, consecutive duplicates collapsed, None marks a gap."""
    sequence: List[Optional[str]] = []
    for line in lines:
        parts = line.strip().split()
        if len(parts) < 3:
            continue
        chord = pop909_label_to_chord(parts[2])
        if not sequence or sequence[-1] != chord:
            sequence.append(chord)
    return sequence


def chord_to_degree(chord: str, key_pitch: int) -> Tuple[Optional[int], str]:
    """(degree, roman) against a major key; (None, chord) when non-diatonic."""
    m = re.match(r"^([A-Ga-g][#b]?)(.*)$", chord)
    if not m:
        return (None, chord)
    root = normalize_root(m.group(1))
    quality = m.group(2)
    pitch = NOTE_PITCH.get(root)
    if pitch is None:
        return (None, chord)
    interval = (pitch - key_pitch) % 12
    if interval not in MAJOR_SCALE_INTERVALS:
        return (None, chord)
    degree, roman = MAJOR_SCALE_INTERVALS[interval]
    is_minor_quality = ("m" in quality and "maj" not in quality) or "dim" in quality or "°" in quality
    roman = roman.lower() if is_minor_quality else roman.upper()
    if "dim" in quality or "°" in quality:
        roman += "°"
    return (degree, roman)


def degree_sequence(chords: Sequence[Optional[str]], key_pitch: int) -> List[Optional[int]]:
    """Diatonic degrees with None wherever a gap or non-diatonic chord occurs."""
    out: List[Optional[int]] = []
    for chord in chords:
        if chord is None:
            out.append(None)
            continue
        degree, _ = chord_to_degree(chord, key_pitch)
        out.append(degree)
    return out


def is_repetition_of_shorter_cycle(window: Sequence[int]) -> bool:
    """True when the window is a prefix of some shorter cycle repeated (1,5,6,4,1,5)."""
    n = len(window)
    for period in range(1, n):
        if all(window[i] == window[i - period] for i in range(period, n)):
            return True
    return False


def loop_candidates(degrees: Sequence[Optional[int]], length: int) -> Dict[Tuple[int, ...], Tuple[int, int]]:
    """Windows of `length` fully inside diatonic runs -> (count, first_index)."""
    found: Dict[Tuple[int, ...], Tuple[int, int]] = {}
    for i in range(len(degrees) - length + 1):
        window = degrees[i:i + length]
        if any(d is None for d in window):
            continue
        key = tuple(int(d) for d in window)  # type: ignore[arg-type]
        if len(set(key)) < MIN_DISTINCT_DEGREES or is_repetition_of_shorter_cycle(key):
            continue
        count, first = found.get(key, (0, i))
        found[key] = (count + 1, first)
    return found


def best_candidate(cands: Dict[Tuple[int, ...], Tuple[int, int]]) -> Optional[Tuple[Tuple[int, ...], int, int]]:
    """Most repeated window; ties go to the earliest occurrence (phrase start)."""
    if not cands:
        return None
    loop, (count, first) = min(cands.items(), key=lambda kv: (-kv[1][0], kv[1][1]))
    return (loop, count, first)


def find_primary_loop(degrees: Sequence[Optional[int]]) -> Optional[Tuple[Tuple[int, ...], int, int]]:
    """
    The song's main harmonic loop as (loop, repetitions, first_index).
    A longer loop (6/7/8) wins over the best 4-chord loop only when it repeats
    at least LONG_LOOP_MIN_SHARE as often — so 4-5-3-6-2-5-1 is reported as the
    7-chord Royal Road rather than one of its 4-chord fragments.
    """
    best4 = best_candidate(loop_candidates(degrees, 4))
    if best4 is None:
        return None
    threshold = max(2, int(-(-best4[1] * LONG_LOOP_MIN_SHARE // 1)))  # ceil
    chosen = best4
    for length in sorted(LOOP_LENGTHS, reverse=True):
        if length == 4:
            continue
        cand = best_candidate(loop_candidates(degrees, length))
        if cand is not None and cand[1] >= threshold:
            chosen = cand
            break
    return chosen


def compact_sequence(degrees: Sequence[Optional[int]]) -> str:
    """'1,5,6,4,x,2,5,1' — collapses runs of gaps to a single x."""
    tokens: List[str] = []
    for d in degrees:
        token = BREAK if d is None else str(d)
        if token == BREAK and tokens and tokens[-1] == BREAK:
            continue
        tokens.append(token)
    while tokens and tokens[0] == BREAK:
        tokens.pop(0)
    while tokens and tokens[-1] == BREAK:
        tokens.pop()
    return ",".join(tokens)


# ---------------------------------------------------------------------------
# Song indexing
# ---------------------------------------------------------------------------

def index_song(song_id: str, meta: Dict[str, str], key_lines: Sequence[str], chord_lines: Sequence[str]) -> Dict[str, Any]:
    root, scale = parse_key_file(key_lines)
    analysis_key = analysis_key_for(root, scale)
    key_pitch = NOTE_PITCH[analysis_key]

    chords = parse_chord_file(chord_lines)
    degrees = degree_sequence(chords, key_pitch)
    loop = find_primary_loop(degrees)

    if loop is not None:
        loop_degrees, repetitions, first = loop
        loop_chords = [str(c) for c in chords[first:first + len(loop_degrees)]]
    else:
        # No repeating diatonic loop (rare): fall back to the first diatonic run.
        run = [d for d in degrees if d is not None][:4]
        loop_degrees, repetitions, first = tuple(run), 0, 0
        loop_chords = [str(c) for c in chords if c is not None][:len(run)]

    romans = [chord_to_degree(c, key_pitch)[1] for c in loop_chords]
    diatonic_count = sum(1 for d in degrees if d is not None)

    return {
        "id": f"pop909_{song_id}",
        "song_id": song_id,
        "title": meta["title"],
        "artist": meta["artist"],
        "key": f"{root} {scale}",
        "analysis_key": f"{analysis_key} major",
        "section": "Chorus / Main Loop (主副歌套路)",
        "progression": ",".join(str(d) for d in loop_degrees),
        "degrees": list(loop_degrees),
        "roman": "-".join(romans),
        "chords": loop_chords,
        "is_loop": True,
        "loop_repetitions": repetitions,
        "degree_sequence": compact_sequence(degrees),
        "total_chords_analyzed": len([c for c in chords if c is not None]),
        "diatonic_chords": diatonic_count,
    }


def read_lines(path: Path) -> List[str]:
    if not path.exists() or path.stat().st_size == 0:
        return []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.readlines()


def ingest_full_pop909(raw_dir: Path, xlsx_path: Path) -> List[Dict[str, Any]]:
    metadata = extract_metadata(xlsx_path)
    print(f"📖 Metadata extracted for {len(metadata)} songs.")

    indexed: List[Dict[str, Any]] = []
    for song_dir in sorted(raw_dir.iterdir()):
        if not song_dir.is_dir() or not song_dir.name.isdigit():
            continue
        song_id = song_dir.name
        meta = metadata.get(song_id, {"title": f"POP909_{song_id}", "artist": "华语群星"})
        chord_file = song_dir / "chord_audio.txt"
        if not chord_file.exists():
            chord_file = song_dir / "chord_midi.txt"
        indexed.append(index_song(song_id, meta, read_lines(song_dir / "key_audio.txt"), read_lines(chord_file)))
    return indexed


def write_index(indexed: List[Dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_file = DATA_DIR / "pop909_indexed_chords.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(indexed, f, ensure_ascii=False, separators=(",", ":"))
    print(f"✨ Wrote {len(indexed)} POP909 songs to {out_file}")
    if STATIC_DATA_DIR.exists():
        with open(STATIC_DATA_DIR / "pop909_indexed_chords.json", "w", encoding="utf-8") as f:
            json.dump(indexed, f, ensure_ascii=False, separators=(",", ":"))
        print(f"🌐 Synchronized to {STATIC_DATA_DIR / 'pop909_indexed_chords.json'}")


def summarize(indexed: List[Dict[str, Any]]) -> None:
    loops = Counter(s["progression"] for s in indexed)
    lengths = Counter(len(s["degrees"]) for s in indexed)
    minor = sum(1 for s in indexed if s["key"].endswith("minor"))
    print(f"   loop lengths: {dict(sorted(lengths.items()))}; minor-key songs (analysed in relative major): {minor}")
    print("   top loops:", ", ".join(f"{p}×{n}" for p, n in loops.most_common(8)))


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Index the POP909 dataset into data/pop909_indexed_chords.json")
    parser.add_argument("--raw-dir", type=Path, help="Extracted POP909 directory (contains 001/, 002/, ...)")
    parser.add_argument("--index", type=Path, help="POP909 index.xlsx")
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR, help="Download cache (default ~/.cache/chordverse/pop909)")
    args = parser.parse_args(argv)

    if args.raw_dir and args.index:
        raw_dir, xlsx_path = args.raw_dir, args.index
    else:
        xlsx_path, raw_dir = ensure_raw_dataset(args.cache_dir)
        raw_dir = args.raw_dir or raw_dir
        xlsx_path = args.index or xlsx_path

    indexed = ingest_full_pop909(raw_dir, xlsx_path)
    if len(indexed) < 900:
        print(f"❌ Only {len(indexed)} songs indexed; refusing to overwrite the 909-song index.", file=sys.stderr)
        return 1
    write_index(indexed)
    summarize(indexed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
