"""
POP909 Dataset & Chinese Chord Progression Engine.
Provides integration with POP909 / POP909-CL dataset annotations and the curated Chinese pop corpus.
Enables exact harmonic pattern matching for Mandopop and Cantopop.
"""

from __future__ import annotations
import json
import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    from .roman_engine import (
        normalize_progression_input,
        progression_to_scale_degrees,
        matches_progression_sequence,
        chord_to_scale_degree,
        NAMED_PROGRESSIONS
    )
    from .chinese_corpus import CHINESE_POP_DATABASE
    from .hooktheory_client import SongEntry
except ImportError:
    from roman_engine import (
        normalize_progression_input,
        progression_to_scale_degrees,
        matches_progression_sequence,
        chord_to_scale_degree,
        NAMED_PROGRESSIONS
    )
    from chinese_corpus import CHINESE_POP_DATABASE
    from hooktheory_client import SongEntry


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
POP909_INDEX_FILE = DATA_DIR / "pop909_indexed_chords.json"


class ChinesePopEngine:
    def __init__(self):
        self.corpus = CHINESE_POP_DATABASE
        self._pop909_data = self._load_or_build_pop909_index()

    def _load_or_build_pop909_index(self) -> List[Dict[str, Any]]:
        """Load pre-indexed POP909 dataset if exists, or return empty."""
        if POP909_INDEX_FILE.exists():
            try:
                with open(POP909_INDEX_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def search_songs(
        self,
        progression: str,
        exact: bool = False
    ) -> List[SongEntry]:
        """
        Search Chinese songs containing the given chord progression.
        Checks both the curated high-precision Chinese corpus and POP909 dataset.
        """
        comma_str, roman_str, target_degrees = normalize_progression_input(progression)
        if not target_degrees:
            return []

        results: List[SongEntry] = []
        seen_ids = set()

        # 1. Search in Curated Corpus (Highest Accuracy)
        for item in self.corpus:
            item_prog = item.get("progression", "")
            item_comma, item_roman, item_degrees = normalize_progression_input(item_prog)
            
            matched = False
            if exact:
                matched = (item_degrees == target_degrees)
            else:
                if item_degrees == target_degrees:
                    matched = True
                elif matches_progression_sequence(item_degrees, target_degrees):
                    matched = True
                elif "chords" in item:
                    key_root = item.get("key", "C").split()[0]
                    scale_type = "minor" if "minor" in item.get("key", "").lower() else "major"
                    calc_degrees = progression_to_scale_degrees(item["chords"], key_root, scale_type)
                    if matches_progression_sequence(calc_degrees, target_degrees, exact=exact):
                        matched = True

            if matched and item["id"] not in seen_ids:
                seen_ids.add(item["id"])
                song = SongEntry(
                    id=item["id"],
                    title=item["title"],
                    artist=item["artist"],
                    section=item.get("section", "Chorus"),
                    key=item.get("key", "C major"),
                    progression=comma_str,
                    roman_progression=roman_str,
                    ytid=None,
                    url=None,
                    language="zh",
                    source="chinese_corpus"
                )
                results.append(song)

        # 2. Search in POP909 Index if available
        for p_item in self._pop909_data:
            p_id = p_item.get("id", "")
            if p_id in seen_ids:
                continue
            p_degrees = p_item.get("degrees", [])
            if matches_progression_sequence(p_degrees, target_degrees, exact=exact):
                seen_ids.add(p_id)
                song = SongEntry(
                    id=p_id,
                    title=p_item.get("title", f"POP909 #{p_id}"),
                    artist=p_item.get("artist", "华语流行"),
                    section=p_item.get("section", "Section"),
                    key=p_item.get("key", "C major"),
                    progression=comma_str,
                    roman_progression=roman_str,
                    language="zh",
                    source="pop909"
                )
                results.append(song)

        return results

    def analyze_chords(self, chords: List[str], key: str = "C", scale_type: str = "major") -> Dict[str, Any]:
        """
        Analyze a list of absolute chords, identify their Roman numerals,
        scale degrees, and check if it matches any famous progressions.
        """
        degrees = progression_to_scale_degrees(chords, key, scale_type)
        comma_str, roman_str, _ = normalize_progression_input(",".join(str(d) for d in degrees))

        recognized_names = []
        for pat_str, name in NAMED_PROGRESSIONS.items():
            _, _, pat_degrees = normalize_progression_input(pat_str)
            if matches_progression_sequence(degrees, pat_degrees):
                recognized_names.append({"progression": pat_str, "name": name})

        return {
            "input_chords": chords,
            "key": f"{key} {scale_type}",
            "scale_degrees": degrees,
            "roman_numerals": roman_str,
            "progression_string": comma_str,
            "recognized_progressions": recognized_names
        }
