# Changelog

All notable changes to the Chord Progression Analyzer (ChordVerse) will be documented in this file.

## [1.9.2] - 2026-09-21

### Fixed & Enhanced
- **Visual Contrast & Visited Link State Protection (`src/static/styles.css`, `src/static/app.js`)**:
  - Added explicit `:visited`, `:hover`, and `:focus-visible` styling for `a`, `.listen-link a`, and all `.listen-pill` badges (`.yopu-pill`, `.yt-pill`, `.source-pill`), completely preventing links from reverting to browser default purple (`#551a8b`) or unstyled deep blue (`#0000ee`) after clicks.
  - Upgraded `.lang-badge` and `.badge` styling (`.lang-badge.zh`, `.badge.badge-zh`, `.lang-badge.en`, `.badge.badge-en`) with glassmorphism borders and 6px margin, cleanly separating language tags from song titles.
- **Yopu Search URL Auto-Extraction & Delimiter Normalization (`functions/api/yopu-search.js`, `src/yopu_importer.py`, `src/static/app.js`, `functions/api/search.js`, `src/pop909_engine.py`)**:
  - Implemented automatic query extraction from pasted Yopu search URLs (`https://yopu.co/search?q=...` or `#q=...`) in both JS and Python, decoding encoded terms like `怒放的生命 汪峰`.
  - Normalized punctuation delimiters (`-`, `–`, `—`, `_`, `/`, `\`, `~`, `·`, `:`, `：`, `|`) into spaces, resolving search failures for queries like `汪峰 - 怒放的生命`, `怒放的生命-汪峰`, `怒放的生命/汪峰`, and `汪峰·怒放的生命`.
  - Stripped attached and spaced sheet music keywords (`吉他谱`, `弹唱谱`, `六线谱`, `简谱`, `曲谱`, `谱子`, `和弦谱`, `吉他`, `谱`), ensuring user searches like `怒放的生命 吉他谱` and `怒放的生命 谱` match songs directly.
  - Added auto-routing in 1-Click Yopu Import modal: pasting a search URL or text query into "直接解析" automatically executes search instead of failing with an ID parsing error.
  - Added 1-click "载入 ➔" button (`.btn-load-local-item`) and accessible "有谱么 ↗" pill for local corpus fallback results in Yopu search modal.
  - Added multi-token title-only fallback in `functions/api/yopu-search.js` and `pop909_engine.py`.
- **Production Cloudflare Pages Deployment & Verification**:
  - Deployed updated web application and edge functions to Cloudflare Pages (`chordverse`).
  - Verified live deployment with Playwright Ego-browser acceptance runner (all 5 scenarios passed, zero console errors, full-page screenshot verified).

## [1.9.1] - 2026-09-21

### Fixed & Enhanced
- **Visual Contrast & UI/UX Enhancement (`src/static/styles.css`, `src/static/app.js`)**:
  - Fixed severe contrast failure where "试听 / 来源" table column links ("有谱么 ↗", "试听 ↗", "曲谱/来源 ↗") defaulted to unstyled browser deep blue (`#0000ee`) on dark slate (`#0f172a` / `#1e293b`), failing WCAG AA/AAA guidelines.
  - Implemented modern glassmorphism `.listen-pill` badge pills with accessible high-contrast colors following `/ui-ux-pro-max` guidelines:
    - `.listen-pill.yopu-pill`: Vibrant Sky/Cyan (`#38bdf8`, > 8.8:1 contrast ratio against dark table background, exceeding WCAG AAA), with smooth hover glow and micro-interaction lift.
    - `.listen-pill.yt-pill`: Coral/Rose (`#f87171`, > 5.5:1 contrast ratio) for YouTube audio preview links.
    - `.listen-pill.source-pill`: Emerald Green (`#34d399`, > 8:1 contrast ratio) for direct chord sheet source links.
    - Added global link `a` CSS reset with cyan accent (`var(--primary-accent)`) and hover underline to eliminate any future unstyled `#0000ee` browser link regressions.
- **Yopu SPA Hash-Routing & Query Sanitization Protocol (`src/static/app.js`, `functions/api/yopu-search.js`, `src/pop909_engine.py`, `src/analyzer.py`, `src/yopu_importer.py`)**:
  - Resolved "Yopu not working" when clicking external links: Yopu.co is a client-side SPA (`search.e59d7d4d.js`) whose search router reads query terms from `location.hash` (`#q=...`), while Yopu's gateway returns HTTP 404 on raw query strings (`/search?q=...`). Upgraded table link construction to `https://yopu.co/search?q=${encodedQ}#q=${encodedQ}`, simultaneously providing query parameters for automated testing/crawlers and hash parameters for Yopu's web frontend.
  - Filtered generic artist placeholders (e.g. `华语群星`, `华语流行`, `华语新歌`, `未知歌手`, `群星`, `佚名`, `POP909...`) from song query construction, preventing 0-result search failures on Yopu.
  - Enhanced `cleanYopuQuery()` across frontend, edge functions, and python importers to strip subtitle noise and language tags (`华语`, `华语流行`, `华语新歌`, `欧美`, `日韩`, `POP909`).
  - Added live title-only fallback in `onRequestGet` (`functions/api/yopu-search.js`): when live search for `title + artist` yields 0 hits, automatically retries `title` alone so users reliably find sheets even if artist metadata differs upstream.
  - Fixed guitar suite chord rendering bug in `app.js` where clicking triad/seventh voicing buttons after a text search used the query text instead of `activeDegrees`.
  - Added multi-token text keyword search support to local Python backend (`pop909_engine.py` & `analyzer.py`) ensuring local testing parity with Cloudflare edge API.

### Verified
- Automated Tests: 152/152 tests passing (55/55 Node.js edge tests, 97/97 Python test suite).
- Ego-Browser E2E Acceptance: Executed real headless browser verification with all 5 scenarios passing cleanly.

## [1.9.0] - 2026-09-21

### Added & Fixed
- **Full 14-Key Scale & Diatonic Triad Completion (`src/static/app.js`, `src/static/guitar_suite.js`)**:
  - Replaced hardcoded 10-key table in `app.js` with `DIATONIC_TRIADS`, bringing full 14-key diatonic scale support (including `B`, `F#`, `Gb`, `C#`) to degree-to-chord resolution and builder displays.
  - Corrected degree 7 of Key of B in `DIATONIC_TRIADS` and `SEVENTH_CHORDS_MAP` from `Adim` to `A#dim`, matching theoretical diatonic scale degree ($A\#\text{dim}$) and `GUITAR_CHORD_LIBRARY`.
  - Added missing guitar chord voicings: `D#` (fret 6), `Ebm`, `Ebm7`, `A#m`, `A#m7`, `Cb`, `Abm`, `Abm7`, `A#dim`.
- **Authentic Chord Ground-Truth & Zero-Hallucination Corpus Cleanup (`src/chinese_corpus.py`, `data/chinese_modern_corpus.json`)**:
  - Fixed misclassified songs: Replaced falsely forced 1-5-6-4 songs with authentic 1-5-6-4 classics (许巍《曾经的你》, 朴树《生如夏花》, 周杰伦《手写的从前》, 汪峰《再见青春》, 李荣浩《李白》, 告五人《给你一瓶魔法药水》, 赵雷《成都》, 宋冬野《董小姐》, 陈粒《奇妙能力歌》, 毛不易《像我这样的人》).
  - Moved 8-chord Canon songs falsely listed under 1564/6415 to Section 6 (Pachelbel Canon): 汪峰《当我想你的时候》, 林俊杰《修炼爱情》, 苏打绿《小情歌》, 光良《童话》, 庾澄庆《情非得已》, 孙燕姿《遇见》, 王菲《红豆》, 周杰伦《告白气球》, 周杰伦《稻香》, 周杰伦《龙卷风》, 王力宏《你不知道的事》, 五月天《后来的我们》.
  - Corrected 于文文《体面》(`modern_022`) from legacy false 1564 to authentic Royal Road 4-5-3-6-2-5-1 (`F, G, Em, Am, Dm, G, C`).
  - Added authentic 6-4-1-5 hits: 林俊杰《江南》(`Gm, Eb, Bb, F`), 队长《哪里都是你》(`Am, F, C, G`).
- **CI/CD Deployment Modernization (`.github/workflows/deploy.yml`)**:
  - Migrated deploy step from retired `cloudflare/pages-action@v1` (repository removed by Cloudflare) to `cloudflare/wrangler-action@v4` with `command: pages deploy src/static --project-name=chordverse`, resolving CI action resolution 404 failures.
- **Live Song Row Chord Audio Loop & Multi-Token Search (`src/static/app.js`, `functions/api/search.js`)**:
  - Bound `selectedSongChords` to song row clicks and top results so clicking a song row passes authentic song chords to guitar diagrams and audio progression playback.
  - Upgraded multi-token search in edge API and client fallback: queries like `水星记 郭顶` or `周杰伦 晴天` split tokens across title and artist, eliminating 0-result text search failures.
  - Rebuilt offline n-gram prediction models and synchronized web bundles.

### Verified
- Automated Tests: 152/152 tests passing (55/55 Node.js edge tests, 97/97 Python test suite).
- Ego-Browser E2E Acceptance: Executed real headless browser verification against production and local suites, verifying clean Yopu URLs, B major chord rendering for 《凄美地》, multi-token queries, and 1564 zero false positives.

## [1.8.0] - 2026-09-21

### Fixed
- **Yopu Search Query Sanitization & Clean URLs (`src/static/app.js`, `functions/api/yopu-search.js`, `src/yopu_importer.py`)**:
  - Eliminated zero-result failures on yopu.co caused by contaminated queries containing bilingual parentheses and record labels (e.g. `水星记 (Mercury Records) 郭顶 (Guo Ding)`).
  - Implemented `cleanYopuQuery()` across frontend, edge functions, and python importers to strip English subtitles, record company tags, and full/half-width bracketed noise, producing clean queries like `水星记 郭顶` that reliably match community tabs.
  - Added query cleaning to frontend Yopu sheet search input before sending API requests.
- **Minor Key Harmonic Mapping Engine (`functions/api/search.js`, `src/static/guitar_suite.js`, `src/static/app.js`)**:
  - Resolved minor key chord distortion bug where minor keys (e.g. `A minor / C major`, `C minor / Eb major`, `Bb minor / Db major`) were improperly truncated to their tonic and treated as major keys, generating phantom sharp chords (e.g. $A\text{ minor}$ generating $F\#m - D - A - E$).
  - Added `MINOR_TO_RELATIVE_MAJOR` dictionary to accurately resolve relative major keys ($A\text{m} \to C$, $D\text{m} \to F$, $E\text{m} \to G$, $B\text{m} \to D$, $C\text{m} \to E\flat$, $G\text{m} \to B\flat$, $B\flat\text{m} \to D\flat$).
  - Exported `MINOR_TO_RELATIVE_MAJOR` and upgraded `normalizeKeyRoot` in guitar suite, ensuring fretboard chord diagrams and capo suggestions accurately reflect the authentic chords.
- **Progression Match Ranking & Cyclic Permutation Deprioritization (`functions/api/search.js`, `src/static/app.js`)**:
  - Structured `evidenceRank` to strictly rank exact direct continuous loop matches (`isDirect = true`) first (Rank 0), followed by full-song sequence matches (Rank 1), and cyclic permutation variants (e.g. 1-5-6-4 matching a 6-4-1-5 query) last (Rank 2).
  - Fixed false-positive ranking where searching for 6-4-1-5 songs showed 1-5-6-4 songs at the top of results.
- **Corpus Ground-Truth Corrections (`src/chinese_corpus.py`, `data/chinese_modern_corpus.json`)**:
  - Corrected *水星记* (`zh_new_01`, `zh_064`) metadata to remove record label pollution.
  - Corrected Jay Chou's *夜曲* (`zh_027`) key to `Bb minor / Db major` with true absolute chords `["Bbm", "Gb", "Db", "Ab"]` (with Capo 3 Gm reference).
  - Re-exported all static web bundles and n-gram transition models via `scripts/export_web_bundle.py`.

### Verified
- Automated Tests: 150/150 tests passing (53/53 Node.js edge tests, 97/97 Python test suite).
- Ego-Browser E2E Acceptance: Executed real headless browser verification against production (`https://chord.worldinspirelab.com`), validating clean Yopu URLs, 6-4-1-5 exact loop matching, and accurate chord display for minor songs. Saved verification screenshot to `tests/ego_browser_production_verified.png`.

## [1.7.0] - 2026-09-20

### Added
- **Full 14-Key Diatonic & 7th Chords Harmonic Engine (`src/static/guitar_suite.js`, `functions/api/_yopu_decoder.js`)**:
  - Expanded `DIATONIC_TRIADS` and `SEVENTH_CHORDS_MAP` across all 14 musical keys (C, G, D, A, E, B, F#, Gb, F, Bb, Eb, Ab, Db, C#). Fixed D major 3rd degree from triad `F#m` to seventh `F#m7`.
  - Added 25+ comprehensive chord voicings to `GUITAR_CHORD_LIBRARY`: `C#7`, `C#m7`, `F#m7`, `G#7`, `G#m7`, `Emaj7`, `Ebmaj7`, `Cm7`, `D#m`, `D#7`, `D#m7`, `D#dim`, `C#dim`, `G#dim`, `Adim`, `Ddim`, `Cdim`, `Gdim`, `Fdim`, `Fm7`, `F#`, `F#maj7`, `Bmaj7`, `Db`, `Dbmaj7`, `Bbm`, `Bbm7`, `Abmaj7`, `Ab7`, complete with physical frets, finger assignments, and barre boundaries.
  - Synchronized `GUITAR_CHORD_LIBRARY` to Cloudflare Edge function `functions/api/_yopu_decoder.js`.
  - Dynamic Secondary Dominant Resolution ($III^7 \to vi$): Automatically generates key-specific secondary dominant chord pairs and music theory explanations across all keys (e.g. in A major: $C\#7 \to F\#m$ with leading tone $E\#$; in D major: $F\#7 \to Bm$; in G major: $B7 \to Em$; in E major: $G\#7 \to C\#m$; in C major: $E7 \to Am$).
- **Interactive Song-to-Fretboard Live Binding (`src/static/app.js`, `src/static/styles.css`)**:
  - Table Row Click Interaction: Clicking any song row in search results immediately highlights the row (`.selected-song-row`), syncs the song's original key into `#play-key-select`, syncs progression into `activeDegrees` & step builder, recalculates Capo recommendations, updates interactive SVG chord diagrams, and displays feedback via toast notification.
  - Fixed ghost logic in `updateGuitarSuite` key resolution: prioritizes active UI key selector over stale top search result.
  - One-Click Guitar Practice from Yopu: Added "在吉他套件中练习 🎸" button to Yopu sheet import result to instantly load imported progressions and keys into the visualizer.
  - Added modern glassmorphism `.chordverse-toast` notification and interactive table row hover styles.

### Verified
- Automated Tests: 173/173 tests passing (50/50 Node.js edge tests, 97/97 Python test suite, 26/26 yopu-cli unit tests).
- Production Chrome E2E: Real headless Chrome verification against live production (`https://chord.worldinspirelab.com`) validating 《青花瓷》 A-major click sync, Capo 2 recommendation, 7th chords toggle producing `["Dmaj7","E7","C#7","F#m7","Bm7","E7","Amaj7"]`, and complete SVG chord diagram rendering.

## [1.6.0] - 2026-09-20

### Added
- **Guitar Learning Suite (`src/static/guitar_suite.js`, `src/static/app.js`, `src/static/styles.css`)**:
  - Interactive SVG Fretboard Visualizer: Dynamic chord box diagrams rendering 6-string fretboards, open/muted string indicators (○/✕), nut/fret numbers, finger placement circles, and barre highlights across 43+ standard guitar chords.
  - Voicing Color Toggle: Instant switching between beginner-friendly standard triads (e.g. `F - G - Em - Am - Dm - G - C`) and modern Mandopop/J-Pop 7th jazz/pop extensions (e.g. `Fmaj7 - G7 - E7 - Am7 - Dm7 - G7 - Cmaj7`).
  - Secondary Dominant ($E^7 \to Am$) Music Theory Card: Real-time detection and educational callout explaining the half-step leading tone pull ($G\# \to A$) that creates irresistible emotional momentum in iconic Royal Road hits.
  - Modulo-12 Capo Calculator: Transposition assistant calculating optimal capo placements ($Capo \le 5$) with beginner-friendly open C and G shapes for all 12 musical keys.
- **Acoustic Guitar Strumming Synthesizer (`src/static/audio_synth.js`)**:
  - Web Audio acoustic guitar simulation with 6-string physical tuning (E2-A2-D3-G3-B3-E4), staggered ~20ms micro-arpeggio string timing, crisp 6ms plectrum attack, and dynamic wood resonance lowpass filtering.
- **Milestone Harmonization & Production Readiness**:
  - Consolidated M1 (Yopu toolchain egress fallback, structured score decoding, dummy song elimination, 404/400 error handling).
  - Consolidated M2 (Zero-hallucination Hooktheory sequence validation, cache sanitization, POP909 sequence match chord transposition, bilingual deduplication, Royal Road iconic ranking).
  - Production deployment pipeline to Cloudflare Pages (`chord.worldinspirelab.com`) with automated cache-busting version sync.

## [1.5.0] - 2026-09-20

### Fixed
- **Hooktheory Meilisearch Zero-Hallucination (`src/hooktheory_client.py`)**:
  - Eliminated Meilisearch bag-of-words hallucination bug where unauthenticated keyword queries (e.g. `"IV V iii vi ii V I"`) matched Roman numerals in unrelated titles (e.g. *George IV*, *Feldschlacht IV*, *D-I-V-O-R-C-E*).
  - Added `extract_hit_degrees` to parse `SInD` and `chordRelBare` scale degree sequences.
  - Gated candidate songs with `matches_progression_sequence(hit_degrees, target_degrees)` before attribution or caching.
  - Purged 17 contaminated keys from `data/hooktheory_cache.json` (such as Tammy Wynette's *D-I-V-O-R-C-E* erroneously stamped as Royal Road).
- **POP909 Sequence Match Highlighting & Dynamic Chords (`functions/api/search.js`, `src/pop909_engine.py`, `src/static/app.js`)**:
  - Resolved label ghosting where POP909 sequence matches defaulted to primary loop labels and 4 chords (e.g. 周杰伦 *《最长的电影》* returning `6,2,5,1` or 林俊杰 *《修炼爱情》* returning `4,5,3,6` for a `4,5,3,6,2,5,1` query).
  - Implemented `scaleDegreesToChords(degrees, key)` to synthesize the authentic matching chords in the song's key (e.g. 7 chords in E major: `A, B, G#m, C#m, F#m, B, E`).
  - Labeled section accurately as `匹配乐段 (Royal Road 4-5-3-6-2-5-1)` while preserving `primary_loop_progression` and `primary_loop_chords`.
- **Royal Road Ground Truth Harmonization & Deduplication (`src/chinese_corpus.py`)**:
  - Corrected *凄美地* (`zh_065`) in E major from contradictory `1,5,6,4` to Royal Road `4,5,3,6,2,5,1` (`["A", "B", "G#m", "C#m", "F#m", "B", "E"]`).
  - Implemented bilingual title/artist normalization (`normalizeTitle`, `normalizeArtist`) to deduplicate songs across translated English subtitles (e.g. *乌梅子酱* "Plum Sauce" vs "Plum Jam").
  - Ensured iconic Royal Road hits (*水星记*, *凄美地*, *漠河舞厅*, *乌梅子酱*, *青花瓷*) rank at the top of results.

### Added
- `tests/test_hooktheory_client.py`: Unit test suite verifying Meilisearch rejection of hallucinated songs, genuine sequence acceptance, and zero-hallucination cache protection.
- Extended `tests/functions/search.test.mjs`: Tests verifying dynamic chord transposition across keys, POP909 sequence match chord synthesis, and bilingual title deduplication.
- Web bundle resync: Updated derived n-gram model and static JSON datasets via `scripts/export_web_bundle.py`.

## [1.4.0] - 2026-09-20


### Fixed
- **Yopu Egress Resolution & Automated Fallback (`yopu-cli`)**: `resolve_egress` now treats `~/.config/yopu/egress` as authoritative without bleeding into `~/.config/yopu-pdf/egress`. Defaulted network egress to `direct`. Added automatic graceful fallback to direct connection with 15s timeout whenever configured proxy/SSH egress fails.
- **Chord Sheet Import Ingestion (`src/yopu_importer.py`)**: `parse_and_clean_score()` no longer discards `sheet_data["chords"]`. Structured chord arrays are now used directly to determine key center, Roman numerals, and detected harmonic loops. Fixed fallback regex to word boundary `\b([A-G]...)\b` to prevent chord truncation on space-delimited text.
- **Zero-Hallucination Error Handling (`src/yopu_importer.py` & `src/cli.py`)**: Completely eliminated silent dummy song generation (`Song #...`, `华语歌手`, `1,5,6,4`, `C-G-Am-F`). Network fetch failures and invalid/nonexistent score IDs now cleanly raise `RuntimeError` / `ConnectionError` with exit code 1. Empty and whitespace-only inputs are strictly validated and rejected. Sheets with no chords never hallucinate fallback progressions or pollute the corpus.
- **Cloudflare Edge Yopu Import Function (`functions/api/import-yopu.js`)**: Replaced fragile HTML regex scraping with canonical protocol decoder. Fetches view page for dynamic `data-model` session token, queries `/z/<token>` via `encodeZ`, and decompresses binary payload via pure JS Brotli custom dictionary decompressor (`_ar_decompressor.js` / `_yopu_decoder.js`). Now returns HTTP 404 `{ error: "曲谱不存在或无法获取", code: 404 }` on missing scores, fetch failures, or 404 titles rather than misleading HTTP 200 responses.
- **Guitar Fingerings & Edge Endpoints**: Added standard guitar chord fingering lookup (`guitar_fingerings`) for all extracted chords. Implemented both `onRequestPost` (JSON body) and `onRequestGet` (URL query parameter). Eliminated false "未内嵌和弦" errors for valid scores.

### Added
- `functions/api/_ar_decompressor.js`: Pure JavaScript Brotli dictionary decompressor with universal `globalThis` support for Cloudflare Pages Functions.
- `functions/api/_yopu_decoder.js`: Shared decoder library implementing `encodeZ`, `decodeDataModel`, `decodeSheetPayload`, `decodeSearchResponse`, and `getGuitarFingering`.
- `tests/fixtures/qingtian_sheet_payload.bin`: Captured binary test fixture from live Yopu score (`3PbjG3gP`).
- Unit and regression tests: 39 passing tests in `tests/functions/` (including negative tests for 404s, network errors, and whitespace inputs), 90 passing tests in Python suite (including clean rejection and error raising on empty inputs and fetch failures), and 26 passing tests in `yopu-cli`.

## [2026-09-12] - 2026-09-12


### Fixes
- Untrack private context files and upload artifacts, update gitignore (`4aea91a`)

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
