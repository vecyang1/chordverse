"""
Unified Chord Progression Search Engine & Music Theory Analyzer.
Integrates Hooktheory ground truth (Western Pop) and POP909/Curated Chinese Pop datasets.
"""

from __future__ import annotations
import csv
import io
import json
from dataclasses import asdict
from typing import List, Dict, Any, Optional

try:
    from .roman_engine import (
        normalize_progression_input,
        get_progression_name,
        scale_degrees_to_chords,
        NAMED_PROGRESSIONS
    )
    from .hooktheory_client import HooktheoryClient, SongEntry
    from .pop909_engine import ChinesePopEngine
except ImportError:
    from roman_engine import (
        normalize_progression_input,
        get_progression_name,
        scale_degrees_to_chords,
        NAMED_PROGRESSIONS
    )
    from hooktheory_client import HooktheoryClient, SongEntry
    from pop909_engine import ChinesePopEngine


class UnifiedChordAnalyzer:
    def __init__(self, hooktheory_token: Optional[str] = None):
        self.hooktheory = HooktheoryClient(token=hooktheory_token)
        self.chinese_engine = ChinesePopEngine()

    def search(
        self,
        progression: str,
        language: str = "all",  # "all", "zh", "en"
        artist_filter: Optional[str] = None,
        key_filter: Optional[str] = None,
        max_pages: int = 5,
        exact: bool = False
    ) -> Dict[str, Any]:
        """
        Unified search across Western and Chinese music databases.
        """
        comma_str, roman_str, degrees = normalize_progression_input(progression)
        if not degrees:
            return {
                "progression": progression,
                "error": f"Invalid progression format: '{progression}'. Use e.g. '1,5,6,4', '1564', or 'I-V-vi-IV'.",
                "total_count": 0,
                "songs": []
            }

        prog_name = get_progression_name(comma_str)
        default_chords_c = scale_degrees_to_chords(degrees, "C", "major")
        default_chords_g = scale_degrees_to_chords(degrees, "G", "major")

        songs: List[SongEntry] = []

        # 1. Fetch Chinese songs
        if language.lower() in ("all", "zh", "chinese", "mandopop"):
            zh_songs = self.chinese_engine.search_songs(comma_str, exact=exact)
            songs.extend(zh_songs)

        # 2. Fetch Western / Hooktheory songs
        if language.lower() in ("all", "en", "western", "english"):
            en_songs = self.hooktheory.search_songs(comma_str, max_pages=max_pages)
            songs.extend(en_songs)

        # Apply artist filter if specified
        if artist_filter:
            af_low = artist_filter.lower()
            songs = [s for s in songs if af_low in s.artist.lower() or af_low in s.title.lower()]

        # Apply key filter if specified
        if key_filter:
            kf_low = key_filter.lower()
            songs = [s for s in songs if kf_low in s.key.lower()]

        # Stats breakdown
        zh_count = sum(1 for s in songs if s.language == "zh")
        en_count = sum(1 for s in songs if s.language == "en")

        return {
            "progression": comma_str,
            "roman_progression": roman_str,
            "progression_name": prog_name,
            "degrees": degrees,
            "reference_chords": {
                "in_C_major": default_chords_c,
                "in_G_major": default_chords_g
            },
            "total_count": len(songs),
            "counts_by_language": {
                "chinese": zh_count,
                "western": en_count
            },
            "songs": [s.to_dict() for s in songs]
        }

    def get_next_chords(self, progression: str) -> Dict[str, Any]:
        """
        Get next chord probability distribution and theoretical reasoning.
        """
        comma_str, roman_str, degrees = normalize_progression_input(progression)
        probabilities = self.hooktheory.get_next_chord_probabilities(comma_str)
        return {
            "current_progression": comma_str,
            "roman_progression": roman_str,
            "next_chord_probabilities": probabilities
        }

    def analyze_chords(self, chords: List[str], key: str = "C", scale_type: str = "major") -> Dict[str, Any]:
        """
        Analyze a user-provided chord sequence.
        """
        return self.chinese_engine.analyze_chords(chords, key, scale_type)

    def export_data(self, search_result: Dict[str, Any], format_type: str = "markdown") -> str:
        """
        Export search result to Markdown, CSV, or JSON.
        """
        songs = search_result.get("songs", [])
        prog = search_result.get("progression", "")
        roman = search_result.get("roman_progression", "")
        name = search_result.get("progression_name", "")

        if format_type.lower() == "json":
            return json.dumps(search_result, ensure_ascii=False, indent=2)

        elif format_type.lower() == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Title", "Artist", "Section", "Key", "Progression", "Roman", "Language", "Source", "URL/Link"])
            for s in songs:
                link = s.get("url") or (f"https://www.youtube.com/watch?v={s['ytid']}" if s.get("ytid") else "")
                writer.writerow([
                    s.get("title"),
                    s.get("artist"),
                    s.get("section"),
                    s.get("key"),
                    s.get("progression"),
                    s.get("roman_progression"),
                    s.get("language"),
                    s.get("source"),
                    link
                ])
            return output.getvalue()

        else: # Markdown table
            lines = [
                f"# 🎵 Chord Progression Analysis: {roman} ({prog})",
                f"**Industry Name**: {name or 'Custom Progression'}",
                f"**Total Songs Found**: {len(songs)} (华语: {search_result.get('counts_by_language', {}).get('chinese', 0)}, 欧美: {search_result.get('counts_by_language', {}).get('western', 0)})\n",
                "| # | Song Title (歌名) | Artist (歌手) | Section (段落) | Key (调性) | Language | Link / Source |",
                "|---|---|---|---|---|---|---|"
            ]
            for idx, s in enumerate(songs, 1):
                lang_tag = "🇨🇳 华语" if s.get("language") == "zh" else "🌍 Western"
                link_str = ""
                if s.get("url"):
                    link_str = f"[TheoryTab]({s['url']})"
                elif s.get("ytid"):
                    link_str = f"[YouTube](https://youtu.be/{s['ytid']})"
                else:
                    link_str = s.get("source", "Ground Truth")
                lines.append(f"| {idx} | **{s.get('title')}** | {s.get('artist')} | `{s.get('section')}` | `{s.get('key')}` | {lang_tag} | {link_str} |")
            return "\n".join(lines)
