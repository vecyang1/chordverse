# Changelog

All notable changes to the Chord Progression Analyzer (ChordVerse) will be documented in this file.

## [1.3.0] - 2026-09-04

### Fixed
- **The POP909 index (909 of the 1,087 songs) contradicted itself.** 813 rows had a `progression` that disagreed with their own `roman`/`chords`, because the ingest computed the loop from the whole song but described the song's *opening* chords, mapped minor keys through major-scale intervals (dropping every chord outside the parallel major), and picked the key from the first line rather than the longest segment. Searching `1,5,6,4` therefore returned songs that never play 1-5-6-4. The rebuilt `scripts/ingest_pop909.py` analyses minor keys against their relative major (Am-F-C-G = 6-4-1-5, the 简谱 convention the UI speaks; recorded as `analysis_key`), breaks the degree sequence at non-diatonic chords instead of splicing across them, reports the loop's own chords, prefers a genuine 6/7/8-chord loop (王道进行, 卡农) over its 4-chord fragments, and ships the whole-song `degree_sequence`. Every row is now internally consistent (`tests/test_ingest_pop909.py` grades all 909).
- `Save Tonight` (western corpus) was filed as `1,5,6,4` while its chords are Am-F-C-G; corrected to `6,4,1,5`.
- Key filter compared substrings, so `B major` matched `Db major`; it now compares whole keys and accepts a bare root (`C`).
- Search results and the probability list now HTML-escape upstream titles, artists and URLs.
- Mobile: the query card was pushed to 617px by grid items' default `min-width:auto`, and the responsive `.filter-row` rule was outranked by the base rule; both fixed (verified at 375px).
- **Browsers kept running the previous deploy's `app.js` for up to 4 h.** Cloudflare's edge caches one body per `Accept-Encoding` variant with `max-age=14400`; the gzip/br variants revalidated against an unchanged weak ETag while curl's identity variant was fresh. `index.html` now references `/app.js?v=1.3.0`, `/styles.css?v=…`, `/audio_synth.js?v=…`, and `tests/test_web_server.py` fails if the query ever lags the package version.
- Playwright: the Yopu import step and the language/artist filter steps read the table before the app had parsed and rendered the response; they now wait for their own request's response and for the spinner to be replaced by rows. A text query typed into the search box was blanked by the input's `change` handler (which re-searched the whole library); text queries are now left alone and only the latest search may render.

### Changed
- **`GET /api/next` answers from counted evidence instead of a hand-written table.** A corpus n-gram model (`data/next_chord_model.json`, built by `scripts/build_ngram_model.py` from POP909 whole-song sequences plus the curated loops walked once around their cycle) provides `probability`, `occurrences` and `song_count` per row, `sample_songs`/`sample_occurrences` for the context, `context_used`/`backoff` when a prefix has fewer than 5 songs, and `source: "corpus_ngram"`. Measured: after 1-5-6 the next chord is 4 in 31% of 2,237 transitions (the old table claimed 78%). The hand-written table survives only as a fallback labelled `source: "heuristic_table"`, served `no-store`. The CLI, MCP `predict_next_chords` and the local web server read the same model.
- **`GET /api/search` matches loops as loops.** A stored progression is matched against itself played twice, so `6,4,1,5` also answers `1,5,6,4`; a query that recurs at least twice anywhere in a POP909 song's whole sequence also matches (`match_kind: "sequence"`, `match_occurrences`), which is how an 8-chord Canon query reaches a song indexed by a 4-chord loop. Results are ordered by evidence (hand-verified loops, then POP909 loops by repetitions, then sequence matches) and the response carries `match_summary` and `total_count`. The Python engine (`match_loop_or_sequence`) applies the same rule.
- POP909 index and the two model files are written compact (no indent); `scripts/export_web_bundle.py` rebuilds the model and leaderboard on every export, so CI publishes them fresh.

### Added
- **曲库真实热门循环** leaderboard on the dashboard (`data/progression_stats.json`): the 12 most common loops by song count, exact labels with the rotation-group total in the tooltip, click to search.
- **URL as state**: `?q=6,2,5,1&lang=zh&key=C%20major&artist=` restores the search on load and is kept in sync (`history.replaceState`); a **复制链接** header button copies it.
- **调性过滤** select (12 major keys; a minor-key song is filed under its relative major).
- Probability panel shows its provenance: `真实语料统计 · 基于 N 首歌曲 / M 次转移 · 上下文 …` (or the backoff note), a per-row song count, and an amber `经验估计` pill whenever the fallback table is what you are looking at. Results header shows `主循环命中 / 全曲复现` counts; POP909 rows show `循环 ×N` / `复现 ×N` and the analysis key for minor songs.
- Named progressions: `4,5,3,6` (小王道), `6,2,5,1` (POP909's most common loop, 41 songs) and `3,6,2,5`; a `6-2-5-1` preset chip.
- Tests: `tests/test_ingest_pop909.py` (23), `tests/test_ngram_model.py` (14, including "committed model equals a fresh build"), `tests/functions/search.test.mjs` (9), `tests/functions/next.test.mjs` rewritten against the real model (9). Python 84, Node 30. Both Playwright suites accept `CHORDVERSE_BASE_URL` so they can run against a local `wrangler pages dev`.

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
