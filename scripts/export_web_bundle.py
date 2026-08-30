"""
Export complete offline search database JSON files into the web static directory
for 100% serverless / Cloudflare Pages edge deployment.
"""

import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = PROJECT_ROOT / "src"
STATIC_DIR = SRC_DIR / "static"
DATA_DIR = STATIC_DIR / "data"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from chinese_corpus import CHINESE_POP_DATABASE
from western_corpus import WESTERN_POP_DATABASE
from roman_engine import NAMED_PROGRESSIONS

DATA_DIR.mkdir(parents=True, exist_ok=True)

# 1. Export Chinese Curated Corpus
with open(DATA_DIR / "chinese_corpus.json", "w", encoding="utf-8") as f:
    json.dump(CHINESE_POP_DATABASE, f, ensure_ascii=False, indent=2)

# 2. Export POP909 Index
pop909_src = PROJECT_ROOT / "data" / "pop909_indexed_chords.json"
if pop909_src.exists():
    with open(pop909_src, "r", encoding="utf-8") as f:
        pop909_data = json.load(f)
    with open(DATA_DIR / "pop909_indexed_chords.json", "w", encoding="utf-8") as f:
        json.dump(pop909_data, f, ensure_ascii=False, indent=2)

# 3. Export Modern Harvested Corpus
modern_src = PROJECT_ROOT / "data" / "chinese_modern_corpus.json"
if modern_src.exists():
    with open(modern_src, "r", encoding="utf-8") as f:
        modern_data = json.load(f)
    with open(DATA_DIR / "chinese_modern_corpus.json", "w", encoding="utf-8") as f:
        json.dump(modern_data, f, ensure_ascii=False, indent=2)

# 4. Export Western Corpus
with open(DATA_DIR / "western_corpus.json", "w", encoding="utf-8") as f:
    json.dump(WESTERN_POP_DATABASE, f, ensure_ascii=False, indent=2)

# 5. Export Named Progressions Taxonomy
with open(DATA_DIR / "named_progressions.json", "w", encoding="utf-8") as f:
    json.dump(NAMED_PROGRESSIONS, f, ensure_ascii=False, indent=2)

print(f"✅ Exported Chinese Curated, POP909, Modern Hits, Western songs, and Named Progressions to {DATA_DIR}")
