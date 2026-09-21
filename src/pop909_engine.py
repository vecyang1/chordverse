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
        scale_degrees_to_chords,
        matches_progression_sequence,
        match_loop_or_sequence,
        parse_degree_sequence,
        chord_to_scale_degree,
        NAMED_PROGRESSIONS
    )
    from .chinese_corpus import CHINESE_POP_DATABASE
    from .hooktheory_client import SongEntry
except ImportError:
    from roman_engine import (
        normalize_progression_input,
        progression_to_scale_degrees,
        scale_degrees_to_chords,
        matches_progression_sequence,
        match_loop_or_sequence,
        parse_degree_sequence,
        chord_to_scale_degree,
        NAMED_PROGRESSIONS
    )
    from chinese_corpus import CHINESE_POP_DATABASE
    from hooktheory_client import SongEntry


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
POP909_INDEX_FILE = DATA_DIR / "pop909_indexed_chords.json"
MODERN_CORPUS_FILE = DATA_DIR / "chinese_modern_corpus.json"


class ChinesePopEngine:
    def __init__(self):
        self.corpus = CHINESE_POP_DATABASE
        self._pop909_data = self._load_or_build_pop909_index()
        self._modern_data = self._load_modern_corpus()

    def _load_or_build_pop909_index(self) -> List[Dict[str, Any]]:
        """Load pre-indexed POP909 dataset if exists, or return empty."""
        if POP909_INDEX_FILE.exists():
            try:
                with open(POP909_INDEX_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def _load_modern_corpus(self) -> List[Dict[str, Any]]:
        """Load modern harvested Chinese pop corpus if exists."""
        if MODERN_CORPUS_FILE.exists():
            try:
                with open(MODERN_CORPUS_FILE, "r", encoding="utf-8") as f:
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
        is_text = not target_degrees and bool(str(progression or "").strip())
        if not target_degrees and not is_text:
            return []

        results: List[SongEntry] = []
        seen_ids = set()

        # 1. Search in Curated Corpus (Highest Accuracy)
        def normalize_text_key(s: str) -> str:
            return re.sub(r"\s*[\(（].*?[\)）]\s*", "", s).strip().lower()

        seen_keys = set()

        if is_text:
            tokens = str(progression).strip().lower().split()
            for item in self.corpus:
                haystack = f"{item.get('title', '')} {item.get('artist', '')}".lower()
                if all(tok in haystack for tok in tokens):
                    song_id = item.get("id", str(len(seen_ids) + 1))
                    norm_key = (normalize_text_key(item.get("title", "")), normalize_text_key(item.get("artist", "")))
                    if norm_key not in seen_keys:
                        seen_ids.add(song_id)
                        seen_keys.add(norm_key)
                        prog = item.get("primary_progression") or item.get("progression", "")
                        roman = item.get("primary_roman") or item.get("roman", "")
                        chords = item.get("primary_chords") or item.get("chords", [])
                        results.append(SongEntry(
                            id=song_id,
                            title=item.get("title", "Unknown"),
                            artist=item.get("artist", "Unknown"),
                            section=item.get("section", "Chorus"),
                            key=item.get("key", "C major"),
                            progression=prog,
                            roman_progression=roman,
                            language="zh",
                            source="chinese_curated",
                            chords=chords,
                            match_kind="loop",
                            url=item.get("source_url"),
                            primary_loop_progression=prog,
                            primary_loop_chords=chords
                        ))
            for m_item in self._modern_data:
                haystack = f"{m_item.get('title', '')} {m_item.get('artist', '')}".lower()
                if all(tok in haystack for tok in tokens):
                    m_id = m_item.get("id", "")
                    norm_key = (normalize_text_key(m_item.get("title", "")), normalize_text_key(m_item.get("artist", "")))
                    if norm_key not in seen_keys:
                        seen_ids.add(m_id)
                        seen_keys.add(norm_key)
                        m_prog = m_item.get("primary_progression") or m_item.get("progression", "")
                        m_roman = m_item.get("primary_roman") or m_item.get("roman", "")
                        m_chords = m_item.get("primary_chords") or m_item.get("chords") or []
                        results.append(SongEntry(
                            id=m_id,
                            title=m_item.get("title", f"Modern #{m_id}"),
                            artist=m_item.get("artist", "华语新歌"),
                            section=m_item.get("section", "Chorus"),
                            key=m_item.get("key", "C major"),
                            progression=m_prog,
                            roman_progression=m_roman,
                            language="zh",
                            source="modern_harvest",
                            chords=m_chords,
                            match_kind="loop",
                            url=m_item.get("source_url"),
                            primary_loop_progression=m_prog,
                            primary_loop_chords=m_chords
                        ))
            return results

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

            title = item.get("title", "Unknown")
            artist = item.get("artist", "Unknown")
            norm_key = (normalize_text_key(title), normalize_text_key(artist))

            if matched and item["id"] not in seen_ids and norm_key not in seen_keys:
                seen_ids.add(item["id"])
                seen_keys.add(norm_key)
                song_key = item.get("key", "C major")
                chords = item.get("chords") or scale_degrees_to_chords(target_degrees, song_key)
                song = SongEntry(
                    id=item["id"],
                    title=title,
                    artist=artist,
                    section=item.get("section", "Chorus"),
                    key=song_key,
                    progression=comma_str,
                    roman_progression=roman_str,
                    ytid=None,
                    url=None,
                    language="zh",
                    source="chinese_corpus",
                    chords=chords,
                    match_kind="loop"
                )
                results.append(song)

        # 2. Search in POP909 Index if available. A stored loop repeats, so it is
        #    matched as loop+loop (any rotation), and a query that recurs in the
        #    whole-song degree sequence also counts (long Canon/Royal Road queries).
        for p_item in self._pop909_data:
            p_id = p_item.get("id", "")
            if p_id in seen_ids:
                continue
            p_degrees = p_item.get("degrees", [])
            if exact:
                matched_kind = "loop" if p_degrees == target_degrees else None
            else:
                matched_kind = match_loop_or_sequence(
                    p_degrees, target_degrees, parse_degree_sequence(p_item.get("degree_sequence", ""))
                )
            if matched_kind:
                p_title = p_item.get("title", f"POP909 #{p_id}")
                p_artist = p_item.get("artist", "华语流行")
                norm_key = (normalize_text_key(p_title), normalize_text_key(p_artist))
                if norm_key in seen_keys:
                    continue
                seen_ids.add(p_id)
                seen_keys.add(norm_key)

                song_key = p_item.get("analysis_key") or p_item.get("key", "C major")
                if matched_kind == "sequence":
                    section = "匹配乐段 (Royal Road 4-5-3-6-2-5-1)" if comma_str == "4,5,3,6,2,5,1" else f"匹配乐段 (全曲复现 {roman_str})"
                    matching_chords = scale_degrees_to_chords(target_degrees, song_key)
                else:
                    section = p_item.get("section", "Section")
                    matching_chords = p_item.get("chords") or scale_degrees_to_chords(target_degrees, song_key)

                song = SongEntry(
                    id=p_id,
                    title=p_title,
                    artist=p_artist,
                    section=section,
                    key=p_item.get("key", "C major"),
                    progression=comma_str,
                    roman_progression=roman_str,
                    language="zh",
                    source="pop909",
                    chords=matching_chords,
                    match_kind=matched_kind,
                    primary_loop_progression=p_item.get("progression"),
                    primary_loop_chords=p_item.get("chords")
                )
                results.append(song)

        # 3. Search in Modern Harvested Corpus
        for m_item in self._modern_data:
            m_id = m_item.get("id", "")
            m_title = m_item.get("title", f"Modern #{m_id}")
            m_artist = m_item.get("artist", "华语新歌")
            norm_key = (normalize_text_key(m_title), normalize_text_key(m_artist))

            m_degrees = m_item.get("primary_degrees", []) or m_item.get("degrees", [])
            if matches_progression_sequence(m_degrees, target_degrees, exact=exact):
                if m_id not in seen_ids and norm_key not in seen_keys:
                    seen_ids.add(m_id)
                    seen_keys.add(norm_key)
                    song_key = m_item.get("key", "C major")
                    chords = m_item.get("primary_chords") or m_item.get("chords") or scale_degrees_to_chords(target_degrees, song_key)
                    song = SongEntry(
                        id=m_id,
                        title=m_title,
                        artist=m_artist,
                        section="Chorus",
                        key=song_key,
                        progression=comma_str,
                        roman_progression=roman_str,
                        language="zh",
                        source="modern_harvest",
                        chords=chords,
                        match_kind="loop"
                    )
                    results.append(song)

        if comma_str == "4,5,3,6,2,5,1":
            iconic_order = ["水星记", "漠河舞厅", "乌梅子酱", "青花瓷"]
            def sort_key(s: SongEntry):
                t = s.title or ""
                for idx, name in enumerate(iconic_order):
                    if name in t:
                        return (0, idx)
                kind_order = 0 if getattr(s, "match_kind", "loop") != "sequence" else 1
                return (1, kind_order)
            results.sort(key=sort_key)

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
