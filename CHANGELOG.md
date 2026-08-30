# Changelog

All notable changes to the Chord Progression Analyzer (ChordVerse) will be documented in this file.

## [1.1.0] - 2026-08-30

### Added
- **3-Tier Harmonic Data Architecture**:
  - **Tier 1 (POP909 Golden Base Index)**: 909 classic pop songs indexed with academic MIR ground truth.
  - **Tier 2 (1-Click Yopu / UGC Harvester & Cleaner)**: `YopuImporter` with Capo compensation, reverse-engineered Svelte DOM extractor, and multi-scale N-gram loop detection (4/6/7/8-chord sliding window).
  - **Tier 3 (Modern 2020-2026 Hits & Hooktheory 75,000+)**: Dynamic JSON layer for modern viral Mandopop hits.
- **New CLI Subcommands & Tools**:
  - `chord-analyzer import-yopu <url_or_id> [--add]` for 1-click lead sheet ingestion.
  - Enhanced `chord-analyzer doctor` with multi-corpus status diagnostics.
- **MCP Server Expansion (`src/mcp_server.py`)**:
  - Added `import_yopu_song` tool for AI agents.
- **Web UI & REST API Upgrades (`src/static/`, `src/web_server.py`)**:
  - Added Dataset Provenance Badges (`[POP909 基准]`, `[华语精选]`, `[现代热歌]`, `[Hooktheory]`, `[欧美经典]`).
  - Added interactive Yopu URL Harvester tab on Web Dashboard.
  - Added `/api/import-yopu` endpoint.
- **Expanded Test Suite**:
  - 46 unit & integration tests covering symbolic math, POP909 search, Yopu parsing, MCP server, web server, and CLI commands.

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
