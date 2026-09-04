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
- `src/pop909_engine.py`: POP909 dataset matcher for Chinese songs (loop-rotation + whole-song sequence matching via `roman_engine.match_loop_or_sequence`).
- `src/ngram_model.py`: corpus next-chord model (`data/next_chord_model.json`); the only source of `/api/next` numbers. `scripts/ingest_pop909.py` builds the POP909 index, `scripts/build_ngram_model.py` the model + leaderboard, `scripts/export_web_bundle.py` publishes all of it to `src/static/data/`.
- `src/analyzer.py`: Unified search and analysis engine connecting Western and Chinese sources.
- `src/cli.py` & `bin/chord-analyzer`: Rich CLI supporting `search`, `next`, `analyze`, `chinese`, `export`, `web`, `doctor`.
- `src/web_server.py` & `src/static/`: High-performance HTTP server and reactive visual dashboard.

---

## 🛠️ Verification & Quality Standard

Before claiming any task complete:
1. Run both hermetic test suites (CI runs the same two):
   ```bash
   python3 -m unittest discover -s tests
   node --test 'tests/functions/*.test.mjs'
   ```
   The node suite covers the Cloudflare Pages Functions in `functions/api/` (the edge is what
   production serves; the Python web server is local only). `node --test` needs the file glob;
   a bare directory path fails on Node 22.
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
4. For anything that ships to `chord.worldinspirelab.com`, the gate is the live URL, not green
   CI: `node tests/e2e_production_test.mjs` (Playwright) against production after the deploy.
   Deploy identity, secrets, and manual/preview commands live in `PROJECT_LINKS.md` → *Deploy
   Path*. Run `python3 scripts/export_web_bundle.py` after editing `data/*.json` or any corpus
   module, or the edge serves stale corpora and a stale model (`tests/test_ngram_model.py` fails
   when the committed model differs from a fresh build). Both Playwright suites accept
   `CHORDVERSE_BASE_URL=http://localhost:8788/` to run against `npx wrangler pages dev`.
5. Degree convention is non-negotiable: degrees are relative to the MAJOR key; minor-key songs
   are analysed against their relative major (`analysis_key`). Never write a probability, count
   or "N songs" claim by hand — it comes from the model or it is labelled `heuristic_table`.

