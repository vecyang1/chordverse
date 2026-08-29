"""
Unified Chord Progression Search Engine & Music Theory Analyzer.
Integrates Hooktheory 75,000+ dataset, Curated Western Pop Ground Truth,
Curated Chinese Pop Ground Truth (周杰伦/汪峰/五月天/2026热单), and POP909.
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
        chords_to_roman,
        is_subsequence,
        NAMED_PROGRESSIONS
    )
    from .hooktheory_client import HooktheoryClient, SongEntry
    from .pop909_engine import ChinesePopEngine
    from .western_corpus import WESTERN_POP_DATABASE
except ImportError:
    from roman_engine import (
        normalize_progression_input,
        get_progression_name,
        scale_degrees_to_chords,
        chords_to_roman,
        is_subsequence,
        NAMED_PROGRESSIONS
    )
    from hooktheory_client import HooktheoryClient, SongEntry
    from pop909_engine import ChinesePopEngine
    from western_corpus import WESTERN_POP_DATABASE


class UnifiedChordAnalyzer:
    def __init__(self, hooktheory_token: Optional[str] = None):
        self.hooktheory = HooktheoryClient(token=hooktheory_token)
        self.chinese_engine = ChinesePopEngine()

    def _get_offline_western_songs(self, progression: str, exact: bool = False) -> List[SongEntry]:
        comma_str, _, target_degrees = normalize_progression_input(progression)
        results: List[SongEntry] = []
        for item in WESTERN_POP_DATABASE:
            song_prog = item["progression"]
            _, _, song_degrees = normalize_progression_input(song_prog)
            
            matched = False
            if exact:
                matched = (song_degrees == target_degrees)
            else:
                matched = is_subsequence(target_degrees, song_degrees)
                
            if matched:
                results.append(SongEntry(
                    id=item.get("id", f"west_{len(results)}"),
                    title=item["title"],
                    artist=item["artist"],
                    section=item.get("section", "Chorus"),
                    key=item.get("key", "C major"),
                    progression=song_prog,
                    roman_progression=item.get("roman", ""),
                    language="en",
                    source="western_corpus",
                    ytid=item.get("ytid")
                ))
        return results

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
        seen_keys = set()

        # 1. Fetch Chinese songs
        if language.lower() in ("all", "zh", "chinese", "mandopop"):
            zh_songs = self.chinese_engine.search_songs(comma_str, exact=exact)
            for s in zh_songs:
                k = (s.title.lower(), s.artist.lower(), s.section.lower())
                if k not in seen_keys:
                    seen_keys.add(k)
                    songs.append(s)

        # 2. Fetch Curated Western Pop Ground Truth
        if language.lower() in ("all", "en", "western", "english"):
            west_curated = self._get_offline_western_songs(comma_str, exact=exact)
            for s in west_curated:
                k = (s.title.lower(), s.artist.lower(), s.section.lower())
                if k not in seen_keys:
                    seen_keys.add(k)
                    songs.append(s)

            # 3. Fetch Hooktheory 75,000+ API / Index
            en_songs = self.hooktheory.search_songs(comma_str, max_pages=max_pages)
            for s in en_songs:
                k = (s.title.lower(), s.artist.lower(), s.section.lower())
                if k not in seen_keys:
                    seen_keys.add(k)
                    songs.append(s)

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
            "songs": [asdict(s) for s in songs]
        }

    def get_next_chords(self, progression: str) -> Dict[str, Any]:
        """
        Predict probability distribution of next chord transitions.
        """
        comma_str, roman_str, degrees = normalize_progression_input(progression)
        probs = self.hooktheory.get_next_chord_probabilities(comma_str)
        return {
            "prefix_progression": comma_str,
            "prefix_roman": roman_str,
            "next_chord_probabilities": probs
        }

    def analyze_chords(self, chords: List[str], key: str = "C", scale_type: str = "major") -> Dict[str, Any]:
        """
        Convert arbitrary chord sequence to Roman numerals and check known patterns.
        """
        return chords_to_roman(chords, key_center=key, scale_type=scale_type)

    def export(
        self,
        progression: str,
        export_format: str = "markdown",
        language: str = "all",
        artist_filter: Optional[str] = None,
        key_filter: Optional[str] = None
    ) -> str:
        """
        Export search results as Markdown, CSV, or JSON.
        """
        data = self.search(progression, language=language, artist_filter=artist_filter, key_filter=key_filter)
        songs = data.get("songs", [])

        if export_format.lower() == "json":
            return json.dumps(data, ensure_ascii=False, indent=2)

        elif export_format.lower() == "csv":
            out = io.StringIO()
            writer = csv.writer(out)
            writer.writerow(["Title", "Artist", "Section", "Key", "Progression", "Roman", "Language", "Source", "URL/Video"])
            for s in songs:
                writer.writerow([
                    s["title"],
                    s["artist"],
                    s["section"],
                    s["key"],
                    s["progression"],
                    s["roman_progression"],
                    s["language"],
                    s["source"],
                    s.get("url") or s.get("ytid") or ""
                ])
            return out.getvalue()

        else:
            # Markdown default
            lines = [
                f"# 🎵 Chord Progression Analysis: {data['roman_progression']} ({data['progression']})",
                f"**Industry Name**: {data['progression_name']}",
                f"- In C Major: `{' - '.join(data['reference_chords']['in_C_major'])}`",
                f"- In G Major: `{' - '.join(data['reference_chords']['in_G_major'])}`",
                f"- Total Found: **{data['total_count']}** songs (🇨🇳 华语: {data['counts_by_language']['chinese']}, 🌍 欧美: {data['counts_by_language']['western']})",
                "",
                "| # | Song Title | Artist | Section | Key | Lang | Source | Link |",
                "|---|---|---|---|---|---|---|---|"
            ]
            for idx, s in enumerate(songs, 1):
                link = f"[TheoryTab]({s['url']})" if s.get("url") else (f"[YouTube](https://youtu.be/{s['ytid']})" if s.get("ytid") else "-")
                lines.append(
                    f"| {idx} | **{s['title']}** | {s['artist']} | `{s['section']}` | {s['key']} | {s['language'].upper()} | {s['source']} | {link} |"
                )
            return "\n".join(lines)

    def export_data(self, data: Dict[str, Any], export_format: str = "markdown") -> str:
        """Helper to format pre-fetched dictionary into target export format."""
        songs = data.get("songs", [])
        if export_format.lower() == "json":
            return json.dumps(data, ensure_ascii=False, indent=2)
        elif export_format.lower() == "csv":
            out = io.StringIO()
            writer = csv.writer(out)
            writer.writerow(["Title", "Artist", "Section", "Key", "Progression", "Roman", "Language", "Source", "URL/Video"])
            for s in songs:
                writer.writerow([
                    s.get("title", ""),
                    s.get("artist", ""),
                    s.get("section", ""),
                    s.get("key", ""),
                    s.get("progression", ""),
                    s.get("roman_progression", ""),
                    s.get("language", ""),
                    s.get("source", ""),
                    s.get("url") or s.get("ytid") or ""
                ])
            return out.getvalue()
        else:
            lines = [
                f"# 🎵 Chord Progression Analysis: {data.get('roman_progression', '')} ({data.get('progression', '')})",
                f"**Industry Name**: {data.get('progression_name', '')}",
                f"- Total Found: **{data.get('total_count', 0)}** songs",
                "",
                "| # | Song Title | Artist | Section | Key | Lang | Source | Link |",
                "|---|---|---|---|---|---|---|---|"
            ]
            for idx, s in enumerate(songs, 1):
                link = f"[TheoryTab]({s['url']})" if s.get("url") else (f"[YouTube](https://youtu.be/{s['ytid']})" if s.get("ytid") else "-")
                lines.append(
                    f"| {idx} | **{s.get('title', '')}** | {s.get('artist', '')} | `{s.get('section', '')}` | {s.get('key', '')} | {s.get('language', '').upper()} | {s.get('source', '')} | {link} |"
                )
            return "\n".join(lines)
