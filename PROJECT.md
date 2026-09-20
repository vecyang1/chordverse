# Project: ChordVerse

## Architecture
ChordVerse is an intelligent harmonic progression analyzer, song catalog, and guitar learning platform. It runs as a hybrid system:
1. **Frontend / Static App (`src/static/`)**: Pure static zero-build web app hosted on Cloudflare Pages (`chord.worldinspirelab.com`), featuring interactive progression selection, SVG guitar fretboard visualizer, Capo calculator, and Web Audio acoustic strumming synthesizer (`audio_synth.js`).
2. **Cloudflare Edge Functions (`functions/api/`)**: Serverless edge endpoints handling song search (`search.js`), Yopu sheet search (`yopu-search.js`), and structured score chord extraction (`import-yopu.js`).
3. **Core Python Intelligence Engines (`src/`)**: Offline progression extraction, corpus management (`pop909_engine.py`, `chinese_corpus.py`), external integrations (`hooktheory_client.py`, `yopu_importer.py`), and web bundle export (`scripts/export_web_bundle.py`).
4. **External CLI Toolchain (`yopu-cli`)**: Located in `vec-productivity-skills/yopu-cli` and `~/.gemini/antigravity/skills/yopu-cli`, providing terminal score search and structured parsing.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | yopu-cli Egress Fallback | Automatic fallback to direct connection on HTTP 404 or connection error; prevent config bleed-through from `yopu-pdf`. | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| 2 | yopu-cli Egress Reset | Reset `~/.config/yopu/egress` to direct connection by default. | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| 3 | yopu-cli CLI Verification | Ensure `yp search "晴天"` and `yp 3PbjG3gP` pass hermetic and live tests with chords. | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| 4 | ChordVerse import-yopu.js Structured Parsing | Replace naive HTML regex with canonical yopu-cli decoder logic (XOR/Brotli/permutation) for immediate guitar chord extraction. | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| 5 | ChordVerse yopu_importer.py Chords Retention | Use `sheet_data["chords"]` instead of discarding it and falling back to default 1,5,6,4. | M1 | Survey 1 / ORIGINAL_REQUEST R1 |
| 6 | Hooktheory Meilisearch Zero-Hallucination | Eliminate bag-of-words hallucination in `_fetch_via_search()`; validate scale degree sequence via `matches_progression_sequence`. | M2 | Survey 2 / ORIGINAL_REQUEST R2 |
| 7 | POP909 Sequence Match Highlighting | When songs match via `degree_sequence`, accurately return and highlight matching section and chords rather than defaulting to unrelated loop labels. | M2 | Survey 2 / ORIGINAL_REQUEST R2 |
| 8 | Royal Road Ranking & Deduplication | Rank and deduplicate real Royal Road hits (水星记, 凄美地, 漠河舞厅, 乌梅子酱, 青花瓷). | M2 | Survey 2 / ORIGINAL_REQUEST R2 |
| 9 | Zero-Hallucination Test Suite | Tests in Python and Node.js validating zero-hallucination guarantees. | M2 | Survey 2 / ORIGINAL_REQUEST R2 |
| 10 | SVG Guitar Chord Fretboard Visualizer | Inline SVG chord box diagrams rendering fret numbers, string lines, finger placement circles, O and X indicators. | M3 | Survey 3 / ORIGINAL_REQUEST R3 |
| 11 | Guitar Voicings & 7th Chords | Support standard triads and jazz/pop extensions (Fmaj7 - G7 - E7 - Am7 - Dm7 - G7 - Cmaj7). | M3 | Survey 3 / ORIGINAL_REQUEST R3 |
| 12 | Secondary Dominant Explanation | Educational callout explaining E7 (III7) -> Am (vi) secondary dominant half-step leading tone resolution. | M3 | Survey 3 / ORIGINAL_REQUEST R3 |
| 13 | Capo Calculator & Transposition Assistant | Modulo-12 Capo calculator showing beginner-friendly C/G shapes for any key. | M3 | Survey 3 / ORIGINAL_REQUEST R3 |
| 14 | Acoustic Strumming Synthesizer | Web Audio synthesizer with ~20ms micro-arpeggio string timing, physical guitar tuning voicings, and envelope shaping. | M3 | Survey 3 / ORIGINAL_REQUEST R3 |
| 15 | Hermetic Test Execution | Complete test suite passing: yopu-cli tests, ChordVerse Python tests, and Node.js edge function tests. | M4 | Survey 3 / ORIGINAL_REQUEST R4 |
| 16 | Web Bundle Build & Cloudflare Deployment | Export bundle (`python3 scripts/export_web_bundle.py`) and deploy via `wrangler pages deploy` to `chord.worldinspirelab.com`. | M4 | Survey 3 / ORIGINAL_REQUEST R4 |
| 17 | Ego-Browser Two-Sided Live Verification | Live end-to-end browser verification of Royal Road progression and adversarial test cases. | M4 | Survey 3 / ORIGINAL_REQUEST R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Wheel Repair & Unified Yopu Toolchain | Fix yopu-cli fetcher fallback, reset egress, fix ChordVerse import-yopu.js and yopu_importer.py | none | DONE |
| M2 | Zero-Hallucination Chord Accuracy Engine | Fix hooktheory_client.py, search.js, pop909_engine.py, deduplication and ranking | M1 | DONE |
| M3 | Guitar Learning Suite | SVG chord boxes, 7th voicings, secondary dominant, Capo calculator, audio synth strumming | M2 | DONE |
| M4 | Production Deployment & Verification | Hermetic test suites, bundle export, Cloudflare Pages deploy, Ego-Browser live verification | M3 | DONE |

## Interface Contracts
### Yopu Egress & Decoder Contract (`yopu/fetcher.py` ↔ `yp_cli.py` / `import-yopu.js`)
- `resolve_egress()`: Returns `"direct"` by default. Only reads `~/.config/yopu/egress`. Does not leak to `yopu-pdf`.
- `fetch_score_data(code)`: Decodes structured sheet via binary/JSON payload. Extracts `chords: list[str]`.
- `import-yopu.js`: Accepts `GET /api/import-yopu?url=...` or `?id=...`. Returns JSON:
  ```json
  {
    "success": true,
    "title": "晴天",
    "artist": "周杰伦",
    "key": "G",
    "chords": ["G", "Em7", "Cadd9", "D"],
    "progression": "1,6,4,5",
    "raw_chords": "..."
  }
  ```

### Search API Contract (`functions/api/search.js` / `src/pop909_engine.py`)
- `GET /api/search?progression=4,5,3,6,2,5,1`:
  - Returns `songs: [...]`, where each song matching via sequence has:
    - `match_kind`: `"sequence"`
    - `progression`: `"4,5,3,6,2,5,1"`
    - `roman`: `"IV-V-iii-vi-ii-V-I"`
    - `chords`: array of matching chords transposed to song's key (e.g. `F, G, Em, Am, Dm, G, C`)
    - `section`: `"匹配乐段 (Royal Road 4-5-3-6-2-5-1)"`

### Guitar Learning Suite Contract (`src/static/app.js` ↔ `src/static/audio_synth.js`)
- `GUITAR_CHORD_LIBRARY[chordName]`: Defines `{ frets: [string6..string1], fingers: [...], barres: [...], baseFret: 1 }`.
- `renderGuitarChordSVG(chordName, options)`: Returns inline `<svg>` string.
- `audioSynth.playGuitarStrum(chordName, duration, options)`: Strums 6 strings with ~20ms micro-arpeggio delay between strings.

## Code Layout
- `src/static/`: Frontend static web application (HTML, CSS, JS)
  - `src/static/index.html`: Main HTML entry
  - `src/static/app.js`: Application logic, UI controllers, chord visualizer, Capo calculator
  - `src/static/styles.css`: Visual styling, chord box cards, strumming controls
  - `src/static/audio_synth.js`: Web Audio synthesizer, polyphonic chords & guitar micro-arpeggio strumming
- `functions/api/`: Cloudflare Pages Edge Functions
  - `functions/api/search.js`: Progression search and song matching
  - `functions/api/import-yopu.js`: Structured score chord extraction
  - `functions/api/yopu-search.js`: Yopu score search proxy
- `src/`: Core Python backend
  - `src/hooktheory_client.py`: Hooktheory API and Meilisearch query engine
  - `src/pop909_engine.py`: POP909 progression indexing and sequence matching
  - `src/chinese_corpus.py`: Chinese curated songs and modern hits
  - `src/yopu_importer.py`: Backend Yopu score importer
- `tests/`: Test suites
  - `tests/test_*.py`: Python unit tests
  - `tests/functions/*.test.mjs`: Cloudflare edge function unit tests
- `yopu-cli/`: (`/Users/vecsatfoxmailcom/Documents/A-coding/vec-productivity-skills/yopu-cli` and `~/.gemini/antigravity/skills/yopu-cli`)
  - `yopu/fetcher.py`: Network fetcher with direct fallback
  - `yp_cli.py`: Command line tool
