#!/usr/bin/env python3
"""
Build the corpus-derived next-chord model and the progression leaderboard.

Outputs (deterministic, compact JSON, safe to diff):
  data/next_chord_model.json   — n-gram transition counts, orders 1..4
  data/progression_stats.json  — most common loops across every corpus

Counting rules
--------------
* Every song contributes its diatonic degree runs. POP909 rows carry the whole
  song (`degree_sequence`, "x" = break); curated rows carry one loop, which is
  walked once around its cycle so the turnaround (…4 -> 1…) counts exactly once.
* `occ` counts every occurrence of context -> next; `songs` counts a song at
  most once per (context, next). Probabilities are occurrence-based; the song
  count is reported so a reader can see how broad the evidence is.
* Nothing is smoothed or invented: a context that never occurs is absent, and
  the API backs off to a shorter context rather than guessing.
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"
DATA_DIR = ROOT_DIR / "data"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from chinese_corpus import CHINESE_POP_DATABASE  # noqa: E402
from roman_engine import NAMED_PROGRESSIONS, ROMAN_MAJOR  # noqa: E402
from western_corpus import WESTERN_POP_DATABASE  # noqa: E402

MAX_ORDER = 4
MODEL_VERSION = 1
LEADERBOARD_SIZE = 30

Segment = List[int]
# (source, song_id, linear segments, cyclic loops). A loop is counted once
# around its cycle (including the turnaround), never doubled.
SongSegments = Tuple[str, str, List[Segment], List[Segment]]


# ---------------------------------------------------------------------------
# Corpus -> degree segments
# ---------------------------------------------------------------------------

def parse_degree_string(value: str) -> List[int]:
    return [int(tok) for tok in str(value or "").split(",") if tok.strip().isdigit()]


def segments_from_sequence(sequence: str) -> List[Segment]:
    """'1,5,6,4,x,2,5,1' -> [[1,5,6,4],[2,5,1]] (empty runs dropped)."""
    runs: List[Segment] = []
    for run in str(sequence or "").split("x"):
        degs = parse_degree_string(run)
        if len(degs) >= 2:
            runs.append(degs)
    return runs


def segments_from_loop(loop: Sequence[int]) -> List[Segment]:
    """A loop is kept as-is; the counter walks it cyclically (see transitions)."""
    degs = list(loop)
    if len(degs) < 2:
        return []
    return [degs]


def load_json(path: Path) -> Any:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def collect_songs(pop909: Iterable[Dict[str, Any]], curated: Iterable[Dict[str, Any]],
                  modern: Iterable[Dict[str, Any]], western: Iterable[Dict[str, Any]]) -> List[SongSegments]:
    songs: List[SongSegments] = []
    for row in pop909:
        seq = row.get("degree_sequence")
        if seq:
            songs.append(("pop909", row.get("id", ""), segments_from_sequence(seq), []))
        else:
            songs.append(("pop909", row.get("id", ""), [], segments_from_loop(parse_degree_string(row.get("progression", "")))))
    for row in curated:
        songs.append(("chinese_curated", row.get("id", ""), [], segments_from_loop(parse_degree_string(row.get("progression", "")))))
    for row in modern:
        degs = row.get("primary_degrees") or parse_degree_string(row.get("primary_progression", ""))
        songs.append(("chinese_modern", row.get("id", ""), [], segments_from_loop(degs)))
    for row in western:
        songs.append(("western", row.get("id", ""), [], segments_from_loop(parse_degree_string(row.get("progression", "")))))
    return songs


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

def _pairs_at(seq: Sequence[int], end: int, max_order: int, pairs: List[Tuple[str, int]]) -> None:
    for order in range(1, max_order + 1):
        start = end - order
        if start < 0:
            break
        pairs.append((",".join(str(d) for d in seq[start:end]), seq[end]))


def transitions(linear: Sequence[Segment], loops: Sequence[Segment] = (), max_order: int = MAX_ORDER) -> List[Tuple[str, int]]:
    """
    Every (context, next) pair for contexts of 1..max_order degrees.
    Linear runs are walked left to right. A loop is walked once around its
    cycle: the history wraps, so 4 -> 1 in 1-5-6-4 counts exactly once.
    """
    pairs: List[Tuple[str, int]] = []
    for seg in linear:
        for end in range(1, len(seg)):
            _pairs_at(seg, end, max_order, pairs)
    for loop in loops:
        n = len(loop)
        if n < 2:
            continue
        extended = list(loop) + list(loop)
        for end in range(n, 2 * n):
            _pairs_at(extended, end, min(max_order, n), pairs)
    return pairs


def build_model(songs: Sequence[SongSegments], max_order: int = MAX_ORDER) -> Dict[str, Any]:
    occ: Dict[str, Counter] = defaultdict(Counter)
    song_hits: Dict[str, Counter] = defaultdict(Counter)
    ctx_songs: Counter = Counter()
    source_counts: Counter = Counter()

    for source, _song_id, linear, loops in songs:
        pairs = transitions(linear, loops, max_order)
        if not pairs:
            continue
        source_counts[source] += 1
        seen_pairs = set()
        seen_ctx = set()
        for ctx, nxt in pairs:
            occ[ctx][nxt] += 1
            if (ctx, nxt) not in seen_pairs:
                seen_pairs.add((ctx, nxt))
                song_hits[ctx][nxt] += 1
            if ctx not in seen_ctx:
                seen_ctx.add(ctx)
                ctx_songs[ctx] += 1

    contexts: Dict[str, Any] = {}
    for ctx in sorted(occ):
        nexts = {
            str(nxt): {"occ": occ[ctx][nxt], "songs": song_hits[ctx][nxt]}
            for nxt in sorted(occ[ctx], key=lambda d: (-occ[ctx][d], d))
        }
        contexts[ctx] = {"occ": sum(occ[ctx].values()), "songs": ctx_songs[ctx], "next": nexts}

    return {
        "version": MODEL_VERSION,
        "max_order": max_order,
        "counting": "occurrence-based probabilities; per-song counts alongside",
        "songs_by_source": dict(sorted(source_counts.items())),
        "total_songs": sum(source_counts.values()),
        "contexts": contexts,
    }


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

def canonical_rotation(loop: Sequence[int]) -> Tuple[int, ...]:
    """Smallest rotation, so 6-4-1-5 and 1-5-6-4 land in one group."""
    degs = tuple(loop)
    if not degs:
        return degs
    rotations = [degs[i:] + degs[:i] for i in range(len(degs))]
    return min(rotations)


def roman_label(loop: Sequence[int]) -> str:
    return "-".join(ROMAN_MAJOR[d - 1] if 1 <= d <= 7 else str(d) for d in loop)


def build_progression_stats(pop909: Iterable[Dict[str, Any]], curated: Iterable[Dict[str, Any]],
                            modern: Iterable[Dict[str, Any]], western: Iterable[Dict[str, Any]],
                            size: int = LEADERBOARD_SIZE) -> Dict[str, Any]:
    labelled: List[Tuple[str, str]] = []  # (source, progression string)
    for row in pop909:
        labelled.append(("pop909", row.get("progression", "")))
    for row in curated:
        labelled.append(("chinese_curated", row.get("progression", "")))
    for row in modern:
        labelled.append(("chinese_modern", row.get("primary_progression", "")))
    for row in western:
        labelled.append(("western", row.get("progression", "")))

    # Exact labels stay separate (6-4-1-5 and 1-5-6-4 are different feels);
    # the rotation-group total is reported alongside for context.
    label_songs: Counter = Counter()
    label_sources: Dict[str, Counter] = defaultdict(Counter)
    group_songs: Counter = Counter()
    for source, prog in labelled:
        degs = parse_degree_string(prog)
        if len(degs) < 3:
            continue
        label = ",".join(str(d) for d in degs)
        label_songs[label] += 1
        label_sources[label][source] += 1
        group_songs[canonical_rotation(degs)] += 1

    ranked = sorted(label_songs.items(), key=lambda kv: (-kv[1], kv[0]))
    top: List[Dict[str, Any]] = []
    for label, songs in ranked[:size]:
        degs = parse_degree_string(label)
        top.append({
            "progression": label,
            "roman": roman_label(degs),
            "name": NAMED_PROGRESSIONS.get(label),
            "songs": songs,
            "by_source": dict(sorted(label_sources[label].items())),
            "rotation_group_songs": group_songs[canonical_rotation(degs)],
        })

    return {
        "version": MODEL_VERSION,
        "grouping": "exact loop labels; rotation_group_songs counts every rotation of the same loop",
        "total_songs": sum(label_songs.values()),
        "top": top,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def build_all(data_dir: Path = DATA_DIR) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    pop909 = load_json(data_dir / "pop909_indexed_chords.json")
    modern = load_json(data_dir / "chinese_modern_corpus.json")
    songs = collect_songs(pop909, CHINESE_POP_DATABASE, modern, WESTERN_POP_DATABASE)
    model = build_model(songs)
    stats = build_progression_stats(pop909, CHINESE_POP_DATABASE, modern, WESTERN_POP_DATABASE)
    return model, stats


def write_outputs(model: Dict[str, Any], stats: Dict[str, Any], data_dir: Path = DATA_DIR) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    with open(data_dir / "next_chord_model.json", "w", encoding="utf-8") as f:
        json.dump(model, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    with open(data_dir / "progression_stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def main() -> int:
    model, stats = build_all()
    write_outputs(model, stats)
    ctx = model["contexts"]
    print(f"✅ next_chord_model.json: {len(ctx)} contexts from {model['total_songs']} songs {model['songs_by_source']}")
    print(f"✅ progression_stats.json: top {len(stats['top'])} loops; #1 = {stats['top'][0]['progression']} ({stats['top'][0]['songs']} songs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
