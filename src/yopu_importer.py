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

try:
    from yopu.fetcher import search_yopu_scores, fetch_score_data as yopu_fetch_score_data
except ImportError:
    import sys
    yp_paths = [
        Path.home() / ".gemini" / "antigravity" / "skills" / "yopu-cli",
        Path.home() / "Documents" / "A-coding" / "vec-productivity-skills" / "yopu-cli"
    ]
    search_yopu_scores = None
    yopu_fetch_score_data = None
    for p in yp_paths:
        if p.exists() and str(p) not in sys.path:
            sys.path.insert(0, str(p))
            try:
                from yopu.fetcher import search_yopu_scores, fetch_score_data as yopu_fetch_score_data
                break
            except ImportError:
                pass

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
        Fetches score data from Yopu.co using canonical yopu client or fallback HTML.
        """
        score_id = self.extract_score_id(score_id_or_url)
        url = f"https://yopu.co/view/{score_id}"
        
        if yopu_fetch_score_data is not None:
            try:
                sheet_data = yopu_fetch_score_data(score_id)
                return {
                    "id": score_id,
                    "title": sheet_data.get("title", "Untitled"),
                    "artist": sheet_data.get("artist", ""),
                    "url": url,
                    "html": "",
                    "article": sheet_data.get("lyrics", ""),
                    "sheet_data": sheet_data,
                }
            except Exception:
                pass

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

    def search_yopu(self, query: str, page: int = 0, instrument: str = "guitar", timeout: int = 15) -> Dict[str, Any]:
        """
        Search Yopu.co for lead sheets matching a song title, artist, or query keyword.
        """
        if search_yopu_scores is not None:
            try:
                return search_yopu_scores(query=query, page=page, instrument=instrument)
            except Exception:
                pass

        params = {
            "q": query.strip(),
            "page": page,
            "instrument": instrument
        }
        api_url = "https://yopu.co/api/search/sheets?" + urllib.parse.urlencode(params)

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Referer": "https://yopu.co/explore",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
        }

        req = urllib.request.Request(api_url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                results = []
                for item in data.get("results", []):
                    sheet_id = item.get("_id") or item.get("id")
                    if not sheet_id:
                        continue
                    author = item.get("author", {})
                    author_name = author.get("name") if isinstance(author, dict) else str(author or "")
                    results.append({
                        "id": sheet_id,
                        "title": item.get("title", ""),
                        "artist": item.get("artist", ""),
                        "key": item.get("key", ""),
                        "capo": item.get("capo", 0),
                        "author": author_name,
                        "verified": bool(item.get("verified", False)),
                        "views": item.get("views", 0),
                        "fav_count": item.get("favCount", 0),
                        "url": f"https://yopu.co/view/{sheet_id}"
                    })
                return {
                    "query": query,
                    "total_count": data.get("totalResultNum", len(results)),
                    "results": results
                }
        except Exception as e:
            fallback = self._search_local_corpus(query)
            if fallback:
                return {
                    "query": query,
                    "total_count": len(fallback),
                    "results": fallback
                }
            raise ConnectionError(f"Failed to search Yopu.co for '{query}': {e}")

    def _search_local_corpus(self, query: str) -> List[Dict[str, Any]]:
        """Search local modern corpus for matching songs as offline/CI fallback."""
        if not MODERN_CORPUS_FILE.exists():
            return []
        try:
            with open(MODERN_CORPUS_FILE, "r", encoding="utf-8") as f:
                items = json.load(f)
            q = query.strip().lower()
            matched = []
            for item in items:
                title = str(item.get("title", "")).lower()
                artist = str(item.get("artist", "")).lower()
                if q in title or q in artist:
                    matched.append({
                        "id": item.get("id", ""),
                        "title": item.get("title", ""),
                        "artist": item.get("artist", ""),
                        "key": item.get("key", "C"),
                        "capo": item.get("capo", 0),
                        "author": item.get("artist", ""),
                        "verified": True,
                        "views": 1000,
                        "fav_count": 500,
                        "url": item.get("source_url", f"https://yopu.co/view/{item.get('id', '')}")
                    })
            return matched
        except Exception:
            return []

    def import_from_search(self, query: str, pick_index: int = 0, add_to_corpus: bool = True) -> ImportedSong:
        """
        Search Yopu.co by keyword, auto-pick the top (or Nth) result, clean and import it.
        """
        search_res = self.search_yopu(query)
        results = search_res.get("results", [])
        if not results:
            raise ValueError(f"No results found on Yopu.co for '{query}'")
        
        if pick_index < 0 or pick_index >= len(results):
            raise IndexError(f"Pick index {pick_index} out of range (0-{len(results)-1})")

        chosen = results[pick_index]
        song = self.parse_and_clean_score(
            score_input=chosen["id"],
            custom_title=chosen["title"],
            custom_artist=chosen["artist"],
            custom_key=chosen.get("key") or None,
            custom_capo=chosen.get("capo") or 0
        )
        if add_to_corpus:
            self.save_to_modern_corpus(song)
        return song

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
