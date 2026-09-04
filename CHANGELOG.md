# Changelog

All notable changes to the Chord Progression Analyzer (ChordVerse) will be documented in this file.

## [1.2.1] - 2026-09-04

### Fixed
- **Edge `GET /api/yopu-search` returned "Yopu returned HTTP 404" for every query in production.** Yopu.co no longer serves `/api/search/sheets` directly; the Function now speaks the real protocol mirrored from `yopu-cli` (session cookie from `/explore`, `/z/<token>` path obfuscation, XOR-157 body) and retries a transient fault once (never an IP block), and falls back to the bundled corpora when Yopu is unreachable. Every response carries `source: "yopu_live" | "local_corpus"` so a substitute answer is never mistaken for a live one; fallback responses add `note` and `upstream_error` and are served `no-store`.
- **Stale progression title during a search.** The dashboard cleared nothing while the 0.4-2 s edge round-trip ran, so the previous query's name and count stayed on screen and read as the new answer. The header now shows `检索中…` until results arrive.
- **Production E2E suites raced the edge.** Both Playwright suites slept 300/600 ms after clicking a preset chip and then read the title; they now wait for the `/api/search` response and for the loading state to clear. The Yopu step now fails on an empty or error result instead of passing on any non-empty box.
- **Stale exported bundle.** `src/static/data/chinese_modern_corpus.json` lagged `data/` by 56 lines; re-exported.
- Local web server: `search_yopu()` results are tagged `source`, and the offline fallback no longer reports invented `verified`/`views`/`fav_count` values.

### Added
- `tests/functions/yopu_search.test.mjs` (`node --test 'tests/functions/*.test.mjs'`, also run in CI): the `/z/` codec against 8 vectors pinned from the Python reference, a captured raw `/z/` body, the live cookie path, the blocked-IP fallback, multi-token matching, and the no-network empty query. Verified red under three mutations (XOR constant, dropped cookie, token `every`→`some`).
- Frontend escapes upstream titles, artists, keys and error strings before inserting them as HTML.

## [1.2.0] - 2026-08-30

### Added
- **Full Yopu (有谱么) Keyword Search & Discovery**:
  - Reverse-engineered `/api/search/sheets` endpoint with instrument filtering.
  - Implemented `search_yopu()` in `YopuImporter` and `search_yopu_scores()` in `yopu-cli`.
  - Added CLI command `chord-analyzer yopu-search <query> [--pick <N>] [--add]`.
  - Upgraded `yopu-cli` (`yp`) with `yp search <query>` and `--pick <N>` auto-selection.
  - Added `search_yopu_scores` tool to Model Context Protocol (MCP) server.
  - Added full live keyword search bar and interactive result cards to the Web Dashboard UI.
- **REST API Extension**:
  - Added `GET /api/yopu-search?q=...&instrument=...` endpoint.
- **Expanded Test Coverage**:
  - Added 4 new automated tests for Yopu search across CLI, SDK, Web Server, and MCP Server (total 50 passing tests).

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
