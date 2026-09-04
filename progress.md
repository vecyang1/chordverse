# Progress: Chord Progression Analyzer (ChordVerse)

## Status: Production-Ready (v1.3.0)

### Completed Milestones
- **2026-08-29**:
  - Implemented symbolic music theory engine `src/roman_engine.py` with diatonic interval mappings, scale degrees, and progression pattern matching.
  - Built `src/hooktheory_client.py` with multi-tier fallback (authenticated Trends API + search index) and rate-limited local caching.
  - Compiled and verified `src/chinese_corpus.py` with 46+ iconic Mandopop & Cantopop harmonic analyses.
  - Implemented `src/pop909_engine.py` for POP909/POP909-CL symbolic chord annotations.
  - Built unified query & export engine `src/analyzer.py` supporting CSV, JSON, Markdown exports.
  - Built rich CLI `src/cli.py` & launcher `bin/chord-analyzer` with 7 subcommands (`search`, `next`, `analyze`, `chinese`, `export`, `web`, `doctor`).
  - Built responsive dark obsidian Web Dashboard (`src/static/`) with visual progression step builder, probability bars, and chord decoder.
  - Authored 18 automated tests in `tests/` with 100% pass rate.
  - Verified live Web UI via `chrome-devtools` browser inspection and visual screenshot.
- **2026-09-04** (v1.2.1):
  - Found and fixed the production `GET /api/yopu-search` edge Function: it called Yopu's retired `/api/search/sheets` path and answered `Yopu returned HTTP 404` for every query. Ported the `/z/` codec + session-cookie protocol from `yopu-cli`, added a bundled-corpus fallback tagged `source`, and proved it live on a Cloudflare preview branch (14 live rows for 再见青春).
  - Fixed the stale progression title during the edge round-trip and the fixed-sleep races in both Playwright suites; the Yopu e2e step now fails on empty/error output.
  - Added `tests/functions/` (node --test, 7 tests, mutation-checked) and wired it into CI; set the Cloudflare repo secrets so `deploy.yml` actually publishes; re-exported the stale modern-corpus bundle.
- **2026-09-04** (v1.3.0):
  - Rebuilt the POP909 index: 813/909 rows had degrees contradicting their own roman/chords (minor keys mangled, loop vs. opening-bars mismatch). New ingest uses relative-major degrees, breaks at non-diatonic chords, keeps whole-song sequences; every row now consistent and graded by `tests/test_ingest_pop909.py`.
  - Replaced the hand-written next-chord table with a corpus n-gram model (1,850 contexts from 1,087 songs; 1-5-6→4 measured 31%, not 78%); `/api/next`, CLI, MCP and local server share it and label any fallback.
  - Search matches loops by rotation and whole-song recurrence, orders by evidence; added leaderboard, URL state + share link, key filter, provenance surfaces; fixed mobile overflow (query card 617px → 359px at 375px).
  - Verified locally on `wrangler pages dev` (Functions + UI, both Playwright suites via `CHORDVERSE_BASE_URL`), then on production after the CI publish.
