# Task Plan: Chord Progression Analyzer (ChordVerse)

## Goals
1. Provide zero-hallucination chord progression search across Western Pop (Hooktheory 75,000+) and Chinese Pop (POP909 + Mandopop corpus).
2. Support arbitrary chord progression queries (1564, 6415, 4536251, Canon, 1645, etc.).
3. Provide next-chord probability prediction and chord sheet decoding.
4. Deliver rich CLI (`bin/chord-analyzer`) and reactive Web Dashboard (`http://localhost:9482`).

## Phases
- [x] Phase 1: Research, Architecture & Music Theory Math (roman_engine.py)
- [x] Phase 2: Hooktheory Integration & Resilient Caching (hooktheory_client.py)
- [x] Phase 3: Chinese Pop & POP909 Integration (pop909_engine.py, chinese_corpus.py)
- [x] Phase 4: Unified Engine & Export Pipeline (analyzer.py)
- [x] Phase 5: Production CLI Interface (cli.py, bin/chord-analyzer)
- [x] Phase 6: Interactive Web Server & Reactive Dashboard (web_server.py, static/)
- [x] Phase 7: Automated Test Suite & Live E2E Verification (tests/)
- [x] Phase 8: Documentation, Capability Card & Registry Writeback
- [x] Phase 9: Full Production First-Principles Verification & Edge Hardening
  - [x] Verify Uptime Kuma monitoring & taxonomy contract (Monitor #36 `ChordVerse (Cloudflare Pages)`, interval 60s, UP)
  - [x] Audit unexecuted frontend & edge paths (Next chord probability field drift, Yopu 24-char score ID truncation, empty query progression naming, search-to-builder sync)
  - [x] Write edge unit tests for `/api/next` and `/api/import-yopu`
  - [x] Implement fixes in `src/static/app.js`, `functions/api/next.js`, `functions/api/import-yopu.js`, `functions/api/search.js`, and `src/static/styles.css`
  - [x] Run full test suites: Python unit tests (52/52 passing), Node function tests (18/18 passing)
  - [x] Build & deploy to Cloudflare Pages production (`chordverse`)
  - [x] Execute comprehensive Playwright E2E suite covering all 14 paths on `https://chord.worldinspirelab.com/` and capture desktop & mobile verification screenshots
