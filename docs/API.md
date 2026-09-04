# API Reference: ChordVerse Server & CLI

## HTTP REST Endpoints

### 1. `GET /api/search`
Query songs matching a chord progression (or a title/artist keyword).
- **Query Parameters**:
  - `progression` (string, required): e.g. `1,5,6,4` or `1564` or `I-V-vi-IV`; free text is a title/artist search
  - `lang` (string, optional): `all` (default), `zh`, `en`
  - `artist` (string, optional): Artist/title substring filter
  - `key` (string, optional): Whole-key filter, e.g. `C major`, or a bare root `C`. Matches a song's own key **or** its `analysis_key` (a minor-key POP909 song is filed under its relative major, so `C major` also returns songs in A minor)
- **Matching rules** (edge `functions/api/search.js` and Python `roman_engine.match_loop_or_sequence` agree):
  - A stored progression is a repeating loop, so it is matched as the loop played twice: `6,4,1,5` also answers `1,5,6,4` → `match_kind: "loop"`.
  - POP909 rows carry the whole song; a query that recurs **≥ 2 times** anywhere in it also matches → `match_kind: "sequence"`, `match_occurrences`.
  - Order: hand-verified loops, then POP909 loops by `loop_repetitions`, then sequence matches by occurrences.
- **Response**:
  ```json
  {
    "query": "1,5,6,4",
    "progression": "1,5,6,4",
    "roman_progression": "I-V-vi-IV",
    "progression_name": "Pop-Punk / 4-Chord Progression (Axis of Awesome / 流行四和弦)",
    "degrees": [1, 5, 6, 4],
    "total_count": 194,
    "total_found": 194,
    "match_summary": { "loop": 117, "sequence": 77 },
    "matching": "loop = query occurs in the song's main loop (any rotation); sequence = query recurs ≥2× in the whole song",
    "language_filter": "all",
    "songs": [
      {
        "id": "pop909_123",
        "title": "晴天",
        "artist": "周杰伦",
        "section": "Chorus / Main Loop (主副歌套路)",
        "key": "G major",
        "analysis_key": "G major",
        "progression": "6,4,1,5",
        "roman": "vi-IV-I-V",
        "chords": ["Em", "C", "G", "D"],
        "loop_repetitions": 11,
        "match_kind": "loop",
        "match_occurrences": 11,
        "language": "zh",
        "source": "pop909_academic"
      }
    ]
  }
  ```
  `source` is one of `chinese_curated`, `pop909_academic`, `chinese_modern`, `western_hooktheory`, `hooktheory_live`. The whole-song `degree_sequence` is used for matching but not returned.

### 2. `GET /api/next`
Next-chord distribution for a progression prefix, **counted from the corpus** (`/data/next_chord_model.json`, built by `scripts/build_ngram_model.py`: POP909 whole-song sequences plus the curated loops, contexts of 1–4 degrees).
- **Query Parameters**:
  - `progression` (string, required): e.g. `1,5,6`, `1-5-6`, `I-V-vi` (400 if it contains no scale degree)
- **Semantics**: the longest suffix (≤ 4 degrees) with at least 5 songs of evidence is used; if that is shorter than the prefix, `backoff` is `true` and `context_used` says which. Probabilities are occurrence-based and sum to 1 over the returned rows (top 5). Nothing is smoothed or invented; if the model asset cannot be read the response falls back to a hand-written table and says so with `source: "heuristic_table"` + `note`, served `Cache-Control: no-store`.
- **Response**:
  ```json
  {
    "prefix_progression": "4,5,3,6,2,5",
    "context_used": "3,6,2,5",
    "backoff": true,
    "source": "corpus_ngram",
    "model_version": 1,
    "sample_songs": 381,
    "sample_occurrences": 1499,
    "corpus_songs": 1087,
    "next_chord_probabilities": [
      {
        "chord": "1",
        "degree": 1,
        "chord_degree": 1,
        "roman": "I",
        "probability": 0.72,
        "occurrences": 1080,
        "song_count": 319,
        "description": "五度循环解决到主和弦 (Circle-of-fifths resolution)"
      }
    ],
    "next_chords": "(alias of next_chord_probabilities)"
  }
  ```
  The CLI `next`, the MCP tool `predict_next_chords` and the local web server return the same shape from `src/ngram_model.py`.

### 3. `POST /api/analyze`
Analyze arbitrary chord list into Roman numerals.
- **Request Body**:
  ```json
  {
    "chords": "F G Em Am Dm G C",
    "key": "C",
    "scale": "major"
  }
  ```

### 4. `GET /api/yopu-search`

Keyword search of Yopu.co (有谱么) lead sheets, served by the Cloudflare Pages Function `functions/api/yopu-search.js` (and by `src/web_server.py` locally).

| Param | Default | Notes |
|---|---|---|
| `q` | required | song title, artist, or keyword |
| `page` | `0` | Yopu result page |
| `instrument` | `guitar` | `guitar` / `piano` / `ukulele` |

Response fields:

- `source`: `"yopu_live"` when Yopu answered, `"local_corpus"` when the bundled corpora were searched instead. Read this before trusting counts: a fallback answer is a substitute, not Yopu's index.
- `results[]`: `id`, `title`, `artist`, `key`, `capo`, `author`, `verified`, `url`, `source`; live rows add `views`, `rating`, `tags`; local rows add `progression`, `roman`, `chords`, `corpus`, `source_url`.
- `total` / `total_count`: Yopu's `totalResultNum` for live answers, the match count for local ones.
- Fallback only: `note` (human-readable), `upstream_error` (why Yopu could not be used), and `error` when nothing matched locally either. Fallback responses are `Cache-Control: no-store`; live ones are cached 30 minutes.

Yopu's gateway rejects plain `/api/...` requests with an empty HTTP 404. The Function obtains the `c=` session cookie from `https://yopu.co/explore`, encodes the internal path to `/z/<token>` (UTF-8 XOR 92, seeded Fisher-Yates, custom base64 alphabet) and XOR-157-decodes the body, mirroring `yopu-cli`'s `yopu/codec.py`.

## Static Data Assets (served from `/data/`)

| File | Built by | Used by |
|---|---|---|
| `pop909_indexed_chords.json` | `scripts/ingest_pop909.py` (raw POP909 → 909 rows: `progression` = main loop, `chords`/`roman` = that loop's first occurrence, `analysis_key`, `degree_sequence`, `loop_repetitions`) | `/api/search`, model builder, CLI |
| `next_chord_model.json` | `scripts/build_ngram_model.py` (`contexts["1,5,6"] = {occ, songs, next: {"4": {occ, songs}}}`) | `/api/next`, `src/ngram_model.py` |
| `progression_stats.json` | `scripts/build_ngram_model.py` (`top[]` = exact loop labels by song count, `rotation_group_songs`) | Dashboard leaderboard |
| `chinese_corpus.json`, `chinese_modern_corpus.json`, `western_corpus.json`, `named_progressions.json` | `scripts/export_web_bundle.py` | `/api/search`, `/api/analyze`, client fallback |

`scripts/export_web_bundle.py` rebuilds the model and stats and copies everything into `src/static/data/`; CI runs it before every publish. Degree convention everywhere: relative to the **major** key; a minor-key song is analysed against its relative major (A minor → C major).

