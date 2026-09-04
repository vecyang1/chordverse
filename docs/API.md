# API Reference: ChordVerse Server & CLI

## HTTP REST Endpoints

### 1. `GET /api/search`
Query songs matching a chord progression.
- **Query Parameters**:
  - `progression` (string, required): e.g. `1,5,6,4` or `1564` or `I-V-vi-IV`
  - `lang` (string, optional): `all` (default), `zh`, `en`
  - `artist` (string, optional): Artist name filter
  - `key` (string, optional): Key filter (e.g. `C major`)
  - `pages` (int, optional): Max pages from remote index (default 5)
- **Response**:
  ```json
  {
    "progression": "1,5,6,4",
    "roman_progression": "I-V-vi-IV",
    "progression_name": "Pop-Punk / 4-Chord Progression (Axis of Awesome / 流行四和弦)",
    "degrees": [1, 5, 6, 4],
    "total_count": 20,
    "counts_by_language": { "chinese": 20, "western": 0 },
    "songs": [
      {
        "id": "zh_001",
        "title": "晴天 (Sunny Day)",
        "artist": "周杰伦 (Jay Chou)",
        "section": "Chorus (副歌)",
        "key": "G major",
        "progression": "1,5,6,4",
        "roman_progression": "I-V-vi-IV",
        "language": "zh",
        "source": "chinese_corpus"
      }
    ]
  }
  ```

### 2. `GET /api/next`
Get probability distribution of next chords given a chord prefix.
- **Query Parameters**:
  - `progression` (string, required): e.g. `1,5,6`
- **Response**:
  ```json
  {
    "current_progression": "1,5,6",
    "roman_progression": "I-V-vi",
    "next_chord_probabilities": [
      {
        "chord": "4",
        "roman": "IV",
        "probability": 0.78,
        "description": "Axis of Awesome 4-Chord standard"
      }
    ]
  }
  ```

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
