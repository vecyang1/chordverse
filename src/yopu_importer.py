"""
1-Click Yopu / UGC Chord Sheet Importer & Consensus Cleaner for ChordVerse.
Extracts songs from Yopu.co or raw lead sheets, compensates Capo,
detects harmonic loops using N-gram frequency analysis, and exports clean ground-truth records.
"""

from __future__ import annotations
import re
import json
import urllib.request
import urllib.parse
from collections import Counter
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

try:
    from .roman_engine import (
        normalize_progression_input,
        progression_to_scale_degrees,
        chord_to_scale_degree,
        scale_degrees_to_chords,
        get_progression_name,
        NAMED_PROGRESSIONS
    )
    from .hooktheory_client import SongEntry
except ImportError:
    from roman_engine import (
        normalize_progression_input,
        progression_to_scale_degrees,
        chord_to_scale_degree,
        scale_degrees_to_chords,
        get_progression_name,
        NAMED_PROGRESSIONS
    )
    from hooktheory_client import SongEntry

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODERN_CORPUS_FILE = DATA_DIR / "chinese_modern_corpus.json"

SEMITONES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_MAP = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}

def transpose_note_name(note: str, semitones: int) -> str:
    """Transpose a root note name by a semitone offset."""
    std_note = FLAT_MAP.get(note, note)
    if std_note not in SEMITONES:
        return note
    idx = SEMITONES.index(std_note)
    new_idx = (idx + semitones) % 12
    return SEMITONES[new_idx]


def transpose_chord_name(chord: str, semitones: int) -> str:
    """Transpose an absolute chord (e.g. G/B -> A/C#)."""
    if not chord:
        return chord
    m = re.match(r"^([A-G][b#]?)(.*)$", chord)
    if not m:
        return chord
    root, suffix = m.group(1), m.group(2)
    new_root = transpose_note_name(root, semitones)
    if "/" in suffix:
        base, slash = suffix.split("/", 1)
        new_slash = transpose_note_name(slash, semitones)
        return f"{new_root}{base}/{new_slash}"
    return f"{new_root}{suffix}"


@dataclass
class ImportedSong:
    id: str
    title: str
    artist: str
    key: str
    original_key: str
    capo: int
    primary_progression: str
    primary_roman: str
    primary_degrees: List[int]
    progression_name: Optional[str]
    primary_chords: List[str]
    section_breakdowns: Dict[str, str]
    source_url: str
    raw_lyrics_sample: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class YopuImporter:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    def extract_score_id(self, input_str: str) -> str:
        """Extract Yopu score ID from URL or raw ID."""
        match = re.search(r"yopu\.co/(?:view|sheet)/([a-zA-Z0-9_-]+)", input_str)
        if match:
            return match.group(1)
        clean = input_str.strip().split("/")[-1].split("?")[0]
        return clean

    def fetch_score_data(self, score_id_or_url: str) -> Dict[str, Any]:
        """
        Fetches HTML from Yopu.co and extracts metadata and text.
        """
        score_id = self.extract_score_id(score_id_or_url)
        url = f"https://yopu.co/view/{score_id}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": "https://yopu.co/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                html = resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            # Fallback mock/offline handler for testing if network restricted
            raise ConnectionError(f"Failed to connect to Yopu ({url}): {e}")

        # Extract title and artist
        title_m = re.search(r"<title>(.*?)</title>", html, re.DOTALL | re.IGNORECASE)
        raw_title = title_m.group(1) if title_m else "Untitled"
        clean_title = re.sub(r"\s*(?:吉他和弦谱|吉他谱|和弦谱|尤克里里谱|尤克里里和弦谱|钢琴谱|弹唱谱)\s*$", "", raw_title).strip()
        parts = clean_title.split("-", 1)
        if len(parts) == 2:
            title, artist = parts[0].strip(), parts[1].strip()
        else:
            title, artist = clean_title, ""

        # Extract article lyrics text
        art_m = re.search(r"<article>(.*?)</article>", html, re.DOTALL | re.IGNORECASE)
        raw_article = art_m.group(1).strip() if art_m else ""

        return {
            "id": score_id,
            "title": title,
            "artist": artist,
            "url": url,
            "html": html,
            "article": raw_article
        }

    def detect_harmonic_loops(self, chord_sequence: List[str], key_root: str = "C", scale_type: str = "major") -> List[Tuple[str, int]]:
        """
        Detect dominant 4-chord and 8-chord progressions using N-gram sliding window.
        Returns list of (progression_comma_str, count) sorted by frequency.
        """
        if len(chord_sequence) < 4:
            return []

        degrees = progression_to_scale_degrees(chord_sequence, key_root, scale_type)
        deg_strs = [str(d) for d in degrees if d != 0]

        patterns = []
        # Check window lengths: 4, 6, 7, 8
        for win_len in [4, 6, 7, 8]:
            if len(deg_strs) >= win_len:
                for i in range(len(deg_strs) - win_len + 1):
                    pat = ",".join(deg_strs[i:i+win_len])
                    patterns.append(pat)

        counts = Counter(patterns)
        
        # Prioritize named iconic progressions with bonus for length
        ranked = []
        for pat, cnt in counts.items():
            is_named = pat in NAMED_PROGRESSIONS
            pat_len = len(pat.split(","))
            # Weight: named progressions get large boost; longer progressions get higher priority
            weight = (cnt * 5 + pat_len * 2) if is_named else (cnt * 1.5 + pat_len * 0.2)
            ranked.append((pat, weight, cnt))

        ranked.sort(key=lambda x: x[1], reverse=True)
        return [(r[0], r[2]) for r in ranked]

    def parse_and_clean_score(
        self,
        score_input: str,
        custom_title: Optional[str] = None,
        custom_artist: Optional[str] = None,
        custom_key: Optional[str] = None,
        custom_capo: int = 0
    ) -> ImportedSong:
        """
        Parse a Yopu URL, ID, or raw chord sheet into a cleaned, structured ImportedSong.
        """
        if score_input.startswith("http") or len(score_input) < 15 and " " not in score_input:
            try:
                data = self.fetch_score_data(score_input)
                title = custom_title or data["title"]
                artist = custom_artist or data["artist"]
                score_id = data["id"]
                url = data["url"]
                article_text = data["article"]
            except Exception:
                # If network fetch fails, parse as ID or title
                score_id = self.extract_score_id(score_input)
                title = custom_title or f"Song #{score_id}"
                artist = custom_artist or "华语歌手"
                url = f"https://yopu.co/view/{score_id}"
                article_text = ""
        else:
            score_id = "custom_" + str(abs(hash(score_input)) % 100000)
            title = custom_title or "Custom Song"
            artist = custom_artist or "Unknown Artist"
            url = "local://chord_sheet"
            article_text = score_input

        # Detect chords in text
        chord_regex = r"([A-G][b#]?(?:m|maj|min|dim|aug|sus[24]?|add[29]?|7|9|11|13|maj7|m7|m7b5|6)?(?:/[A-G][b#]?)?)"
        chords_found = re.findall(chord_regex, article_text)

        # Detect Key and Capo
        capo = custom_capo
        capo_m = re.search(r"(?:变调夹|Capo)[:：\s]*(\d+)", article_text, re.IGNORECASE)
        if capo_m and custom_capo == 0:
            capo = int(capo_m.group(1))

        detected_key = custom_key or "C"
        key_m = re.search(r"(?:原调|选调|Key)[:：\s]*([A-G][b#]?m?)", article_text, re.IGNORECASE)
        if key_m and not custom_key:
            detected_key = key_m.group(1).replace("1=", "").strip()

        # Handle degree notations if in article (e.g. 6m 4 5 6m)
        degree_regex = r"([1-7]m?|[IViv]+)"
        degree_tokens = re.findall(degree_regex, article_text)
        
        primary_progression = "1,5,6,4"
        if chords_found:
            loops = self.detect_harmonic_loops(chords_found, key_root=detected_key.split()[0])
            if loops:
                primary_progression = loops[0][0]
        elif degree_tokens:
            deg_clean = [t.replace("m", "") for t in degree_tokens if t[0].isdigit()]
            if len(deg_clean) >= 4:
                primary_progression = ",".join(deg_clean[:4])

        # Apply Capo Transposition if Capo is specified
        concert_key = detected_key
        if capo > 0:
            concert_key = transpose_note_name(detected_key.split()[0], capo) + " major"

        comma_str, roman_str, degrees = normalize_progression_input(primary_progression)
        prog_name = get_progression_name(comma_str)
        concrete_chords = scale_degrees_to_chords(degrees, detected_key.split()[0], "major")

        # Sample lyrics snippet
        clean_lines = [l.strip() for l in article_text.splitlines() if l.strip() and not l.startswith("★")]
        lyrics_sample = " ".join(clean_lines[:3])[:100] if clean_lines else ""

        return ImportedSong(
            id=score_id,
            title=title,
            artist=artist,
            key=f"{detected_key} major" if "major" not in detected_key and "minor" not in detected_key else detected_key,
            original_key=concert_key,
            capo=capo,
            primary_progression=comma_str,
            primary_roman=roman_str,
            primary_degrees=degrees,
            progression_name=prog_name,
            primary_chords=concrete_chords,
            section_breakdowns={"Chorus": comma_str},
            source_url=url,
            raw_lyrics_sample=lyrics_sample
        )

    def save_to_modern_corpus(self, song: ImportedSong) -> bool:
        """Save or update the song in data/chinese_modern_corpus.json."""
        existing = []
        if MODERN_CORPUS_FILE.exists():
            try:
                with open(MODERN_CORPUS_FILE, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                existing = []

        # Deduplicate
        existing = [item for item in existing if item.get("id") != song.id]
        existing.append(song.to_dict())

        with open(MODERN_CORPUS_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)

        return True
