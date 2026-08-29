# Changelog

All notable changes to the Chord Progression Analyzer (ChordVerse) will be documented in this file.

## [1.0.0] - 2026-08-29

### Added
- **Symbolic Music Theory Engine (`src/roman_engine.py`)**:
  - Exact note, interval, key signature and Roman numeral parsing.
  - Scale degree translation across all 12 major & minor keys.
  - Sub-sequence pattern matching and industry named progression lookup.
- **Hooktheory Ground-Truth Client (`src/hooktheory_client.py`)**:
  - Integration with Hooktheory 75,000+ song dataset.
  - Next-chord probability distribution prediction.
  - Local resilient caching to adhere to rate limits.
- **Chinese Pop & POP909 Engine (`src/pop909_engine.py`, `src/chinese_corpus.py`)**:
  - Verified ground-truth dataset of Mandopop/Cantopop classics with section breakdown.
  - Ingestion pipeline for POP909/POP909-CL annotations.
- **Unified Analyzer (`src/analyzer.py`)**:
  - Unified multi-lingual search across Western and Chinese music corpora.
  - Export capabilities to CSV, JSON, Markdown.
- **Production CLI (`src/cli.py`, `bin/chord-analyzer`)**:
  - Subcommands: `search`, `next`, `analyze`, `chinese`, `export`, `web`, `doctor`.
- **Interactive Web Dashboard (`src/web_server.py`, `src/static/`)**:
  - Responsive dark obsidian UI with interactive visual chord builder.
- **Comprehensive Unit & Integration Test Suite (`tests/`)**:
  - 18 automated tests passing hermetically in <1.0s.
