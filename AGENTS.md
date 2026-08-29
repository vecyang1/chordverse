# CHORD PROGRESSION ANALYZER CONSTITUTION (AGENTS.md)

> [!IMPORTANT]
> This document is the operating constitution and single source of truth for all AI agents and developers collaborating on the **Chord Progression Analyzer (ChordVerse)** project.

---

## 🎯 System Purpose & Boundaries

**Problem**: Large Language Models (LLMs) suffer severe hallucinations when asked to list songs using specific chord progressions (e.g. 1564, 6415, 4536251), confusing song sections (verses vs choruses) and miscomputing Roman numerals.

**Solution**: A zero-hallucination, ground-truth-backed chord progression analysis system and CLI/Web engine that cross-references:
1. **Western Pop (75,000+ songs)**: Hooktheory Trends & TheoryTab database.
2. **Chinese Pop (华语流行)**: Curated Mandopop/Cantopop corpus + POP909/POP909-CL symbolic harmonic annotations.
3. **Symbolic Music Theory Engine**: Real-time parsing of key signatures, Roman numeral scale degrees, and chord qualities.

---

## 🏗️ Architecture & Core Modules

- `src/roman_engine.py`: Pure-math symbolic music theory engine (note parsing, key intervals, Roman numerals, diatonic chord mapping).
- `src/hooktheory_client.py`: Resilient Hooktheory API & Meilisearch index client with rate limiting, cache, and next-chord probability distribution.
- `src/chinese_corpus.py`: Curated ground-truth database of Mandopop & Cantopop songs with exact section analysis.
- `src/pop909_engine.py`: POP909 dataset indexer and matcher for Chinese songs.
- `src/analyzer.py`: Unified search and analysis engine connecting Western and Chinese sources.
- `src/cli.py` & `bin/chord-analyzer`: Rich CLI supporting `search`, `next`, `analyze`, `chinese`, `export`, `web`, `doctor`.
- `src/web_server.py` & `src/static/`: High-performance HTTP server and reactive visual dashboard.

---

## 🛠️ Verification & Quality Standard

Before claiming any task complete:
1. Run hermetic test suite:
   ```bash
   python3 -m unittest discover -s tests
   ```
2. Verify CLI commands:
   ```bash
   ./bin/chord-analyzer doctor
   ./bin/chord-analyzer search 1564 --lang zh
   ./bin/chord-analyzer next 1,5,6
   ./bin/chord-analyzer analyze "F G Em Am Dm G C" --key C
   ```
3. Test Web Server on collision-free port:
   ```bash
   ./bin/chord-analyzer web --port 9482
   ```

