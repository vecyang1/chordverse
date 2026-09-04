"""
Corpus-derived next-chord model.

Reads data/next_chord_model.json (built by scripts/build_ngram_model.py from
POP909 + the curated corpora) and answers "what usually follows this prefix?"
with counted evidence: every row carries how many occurrences and how many
songs back it. When a prefix has too little evidence the model backs off to a
shorter context and says so; it never invents a distribution.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

try:
    from .roman_engine import ROMAN_MAJOR
except ImportError:  # pragma: no cover - script-style import
    from roman_engine import ROMAN_MAJOR

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_FILE = DATA_DIR / "next_chord_model.json"

MIN_SONGS_FOR_CONTEXT = 5
DEFAULT_TOP_K = 5
SOURCE_CORPUS = "corpus_ngram"

# Harmonic-function label for each degree, used when no specific note applies.
FUNCTION_LABELS: Dict[int, str] = {
    1: "主和弦解决 (Tonic resolution)",
    2: "上主和弦 / ii 预备 (Supertonic pre-dominant)",
    3: "中音和弦 / iii 过渡 (Mediant colour)",
    4: "下属和弦 (Subdominant)",
    5: "属和弦张力 (Dominant tension)",
    6: "关系小调 / vi 假终止 (Relative minor / deceptive)",
    7: "导音和弦 (Leading-tone chord)",
}

# Notes for transitions that have an established name. Keyed "context>next".
TRANSITION_NOTES: Dict[str, str] = {
    "1,5,6>4": "流行四和弦标准结尾 1-5-6-4 (Axis of Awesome)",
    "1,5,6>3": "卡农式下行 1-5-6-3 (Canon line)",
    "1,5,6,4>1": "四和弦循环回到主和弦 (Loop resolution)",
    "1,5,6,4>5": "转接属和弦再循环 (Dominant turnaround)",
    "6,4,1>5": "伤感六四一五闭环 (6-4-1-5 cadence)",
    "6,4,1,5>6": "六四一五循环回到 vi (Minor-loop restart)",
    "4,5,3>6": "王道进行核心 4-5-3-6 (Royal Road core)",
    "4,5,3,6>2": "王道进行续接 2-5-1 (Royal Road ii-V-I extension)",
    "3,6,2,5>1": "五度循环解决到主和弦 (Circle-of-fifths resolution)",
    "6,2,5>1": "6251 循环解决 (vi-ii-V-I resolution)",
    "2,5>1": "爵士 ii-V-I 解决 (Jazz ii-V-I)",
    "1,6,4>5": "50 年代进行结尾 1-6-4-5 (Doo-wop cadence)",
    "1,6>4": "50 年代进行 1-6-4 (Doo-wop motion)",
    "1,6>2": "1-6-2-5 五度圈下行 (Circle-of-fifths descent)",
    "1,5>6": "流行假终止 1-5-6 (Pop deceptive motion)",
    "1,4>5": "经典正格进行 1-4-5 (I-IV-V)",
}


def describe_transition(context: str, degree: int) -> str:
    return TRANSITION_NOTES.get(f"{context}>{degree}", FUNCTION_LABELS.get(degree, f"Degree {degree}"))


class NextChordModel:
    """In-memory view over the n-gram counts; safe to share across threads (read-only)."""

    def __init__(self, contexts: Dict[str, Any], meta: Optional[Dict[str, Any]] = None):
        self._contexts = contexts
        self.meta = meta or {}
        self.max_order = int(self.meta.get("max_order", 4))

    @classmethod
    def load(cls, path: Path = MODEL_FILE) -> Optional["NextChordModel"]:
        if not path.exists():
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError):
            return None
        contexts = raw.get("contexts")
        if not isinstance(contexts, dict) or not contexts:
            return None
        meta = {k: v for k, v in raw.items() if k != "contexts"}
        return cls(contexts, meta)

    @property
    def total_songs(self) -> Optional[int]:
        value = self.meta.get("total_songs")
        return int(value) if isinstance(value, int) else None

    def resolve_context(self, degrees: Sequence[int]) -> Optional[str]:
        """Longest suffix (≤ max_order) with at least MIN_SONGS_FOR_CONTEXT songs."""
        degs = [int(d) for d in degrees if 1 <= int(d) <= 7]
        for order in range(min(self.max_order, len(degs)), 0, -1):
            ctx = ",".join(str(d) for d in degs[-order:])
            entry = self._contexts.get(ctx)
            if entry and int(entry.get("songs", 0)) >= MIN_SONGS_FOR_CONTEXT:
                return ctx
        return None

    def predict(self, degrees: Sequence[int], top_k: int = DEFAULT_TOP_K) -> Optional[Dict[str, Any]]:
        prefix = ",".join(str(d) for d in degrees)
        ctx = self.resolve_context(degrees)
        if ctx is None:
            return None
        entry = self._contexts[ctx]
        total_occ = int(entry.get("occ", 0)) or 1
        ranked = sorted(
            ((int(deg), info) for deg, info in entry.get("next", {}).items() if str(deg).isdigit()),
            key=lambda kv: (-int(kv[1].get("occ", 0)), kv[0]),
        )
        rows: List[Dict[str, Any]] = []
        for degree, info in ranked[:top_k]:
            occ = int(info.get("occ", 0))
            rows.append({
                "chord": str(degree),
                "degree": degree,
                "chord_degree": degree,
                "roman": ROMAN_MAJOR[degree - 1] if 1 <= degree <= 7 else str(degree),
                "probability": round(occ / total_occ, 4),
                "occurrences": occ,
                "song_count": int(info.get("songs", 0)),
                "description": describe_transition(ctx, degree),
            })
        return {
            "prefix_progression": prefix,
            "context_used": ctx,
            "backoff": ctx != prefix,
            "source": SOURCE_CORPUS,
            "model_version": self.meta.get("version"),
            "sample_songs": int(entry.get("songs", 0)),
            "sample_occurrences": total_occ,
            "corpus_songs": self.total_songs,
            "next_chord_probabilities": rows,
        }
