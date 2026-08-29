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
