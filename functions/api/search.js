/**
 * GET /api/search?progression=1,5,6,4&lang=zh&artist=&key=
 *
 * Matching rules (shared with src/roman_engine.py match_loop_or_sequence):
 *  - A stored progression is a repeating LOOP, so a query is matched against the
 *    loop played twice: 6-4-1-5 therefore also answers 1-5-6-4 (`match_kind: "loop"`).
 *  - POP909 rows carry the whole song as `degree_sequence` ("x" = break). A
 *    query that recurs at least MIN_SEQUENCE_OCCURRENCES times anywhere in it
 *    also matches (`match_kind: "sequence"`) — how an 8-chord Canon query finds
 *    a song whose primary loop was indexed as 4 chords.
 *  - Results are ordered by evidence: hand-verified loop matches, then POP909
 *    loop matches by repetitions, then sequence matches by occurrences.
 */

export const MIN_SEQUENCE_OCCURRENCES = 2;

const ROMAN_MAP = { 1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°" };
const CURATED_SOURCES = new Set(["chinese_curated", "chinese_modern", "western_hooktheory"]);

export function parseDegrees(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[1-7]$/.test(s))
    .map(Number);
}

/** '1,5,6,4,x,2,5,1' -> [[1,5,6,4],[2,5,1]] */
export function parseDegreeSequence(sequence) {
  return String(sequence || "")
    .split("x")
    .map(parseDegrees)
    .filter((run) => run.length > 0);
}

export function countOccurrences(run, target) {
  if (target.length === 0 || run.length < target.length) return 0;
  let hits = 0;
  for (let i = 0; i <= run.length - target.length; i++) {
    let ok = true;
    for (let j = 0; j < target.length; j++) {
      if (run[i + j] !== target[j]) { ok = false; break; }
    }
    if (ok) hits++;
  }
  return hits;
}

/**
 * Returns { kind: "loop" | "sequence", occurrences } or null.
 */
export function matchSong(song, target) {
  if (target.length === 0) return null;
  const loop = parseDegrees(song.progression);
  if (loop.length >= 2) {
    if (countOccurrences(loop.concat(loop), target) > 0) {
      return { kind: "loop", occurrences: Number(song.loop_repetitions || 0) };
    }
  } else if (loop.length > 0 && countOccurrences(loop, target) > 0) {
    return { kind: "loop", occurrences: Number(song.loop_repetitions || 0) };
  }
  if (song.degree_sequence) {
    const hits = parseDegreeSequence(song.degree_sequence)
      .reduce((sum, run) => sum + countOccurrences(run, target), 0);
    if (hits >= MIN_SEQUENCE_OCCURRENCES) return { kind: "sequence", occurrences: hits };
  }
  return null;
}

/**
 * Key filter: "C major" matches the song's own key or its analysis key (a
 * minor-key song analysed in its relative major); a bare root ("C") matches
 * either root. Whole-token comparison — "B major" must not match "Db major".
 */
export function keyMatches(song, filter) {
  const wanted = String(filter || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!wanted) return true;
  const candidates = [song.key, song.analysis_key]
    .filter(Boolean)
    .map((k) => String(k).trim().toLowerCase().replace(/\s+/g, " "));
  if (candidates.some((k) => k === wanted)) return true;
  if (!wanted.includes(" ")) return candidates.some((k) => k.split(" ")[0] === wanted);
  return false;
}

function evidenceRank(song) {
  const curated = CURATED_SOURCES.has(song.source) ? 0 : 1;
  const kind = song.match_kind === "loop" ? 0 : 1;
  return [kind, curated, -(song.match_occurrences || 0)];
}

export function sortByEvidence(songs) {
  return songs
    .map((song, index) => ({ song, index, rank: evidenceRank(song) }))
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1] || a.rank[2] - b.rank[2] || a.index - b.index)
    .map((entry) => entry.song);
}

async function loadJson(url) {
  try {
    const resp = await fetch(url);
    return resp.ok ? await resp.json() : null;
  } catch (_err) {
    return null;
  }
}

function normalizeModern(s) {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    key: s.key || s.original_key,
    section: s.section || "Chorus (副歌)",
    progression: s.primary_progression || s.progression,
    chords: s.primary_chords || s.chords,
    roman: s.primary_roman || s.roman,
    source_url: s.source_url,
    language: "zh",
    source: "chinese_modern"
  };
}

function normalizePop909(s) {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    key: s.key,
    analysis_key: s.analysis_key,
    section: s.section,
    progression: s.progression,
    chords: s.chords,
    roman: s.roman,
    degree_sequence: s.degree_sequence,
    loop_repetitions: s.loop_repetitions,
    language: "zh",
    source: "pop909_academic"
  };
}

async function fetchHooktheoryLive(rawQuery) {
  try {
    const hookResp = await fetch("https://search.hooktheory.com/indexes/theorytabs/search", {
      method: "POST",
      headers: {
        // Hooktheory's public search-index key, embedded in their own frontend.
        "Authorization": "Bearer YHXUiQCa6024e2a88cb48f226a94d16db0c20d993e0a424cfde7834b697445bdf280ce88",
        "Content-Type": "application/json",
        "Referer": "https://www.hooktheory.com/"
      },
      body: JSON.stringify({ q: rawQuery, limit: 15 })
    });
    if (!hookResp.ok) return [];
    const hookData = await hookResp.json();
    return (hookData.hits || []).map((h) => {
      const rawDegs = (h.SInD || "").match(/qq([1-7])/g)?.map((m) => parseInt(m.replace(/qq/, ""), 10)) || [];
      const chords = (h.chordAbsBare || h.chordAbs || "").split("qq").map((c) => c.trim()).filter(Boolean);
      const progStr = rawDegs.slice(0, 4).join(",") || "1,5,6,4";
      const romanStr = rawDegs.slice(0, 4).map((d) => ROMAN_MAP[d] || d).join("-");
      const artist = h.artist || "Unknown";
      let title = h.song || "Unknown";
      if (title.startsWith(`${artist} - `)) title = title.replace(`${artist} - `, "");
      return {
        id: `hook_${h.id || Math.random().toString(36).slice(2, 8)}`,
        title,
        artist,
        section: h.section || "Chorus",
        key: h.key || "C major",
        progression: progStr,
        roman: romanStr,
        chords: chords.slice(0, 8),
        youtube_id: h.ytid,
        language: "en",
        source: "hooktheory_live"
      };
    });
  } catch (_err) {
    return [];
  }
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const rawQuery = (url.searchParams.get("progression") || url.searchParams.get("q") || "").trim();
  const lang = (url.searchParams.get("lang") || "all").toLowerCase();
  const artistFilter = (url.searchParams.get("artist") || "").toLowerCase().trim();
  const keyFilter = (url.searchParams.get("key") || "").toLowerCase().trim();

  const host = url.origin;
  const [zhData, popData, modData, enData, taxonomy] = await Promise.all([
    loadJson(`${host}/data/chinese_corpus.json`),
    loadJson(`${host}/data/pop909_indexed_chords.json`),
    loadJson(`${host}/data/chinese_modern_corpus.json`),
    loadJson(`${host}/data/western_corpus.json`),
    loadJson(`${host}/data/named_progressions.json`)
  ]).then((parts) => parts.map((p, i) => p || (i === 4 ? {} : [])));

  const isDegreeQuery = /^[1-7\s,\-\>\|/]+$/.test(rawQuery) || /^[ivxIVX\s,\-\>\|/]+$/.test(rawQuery);
  const cleanProg = isDegreeQuery ? rawQuery.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "") : "";
  const textKeyword = !isDegreeQuery ? rawQuery.toLowerCase() : "";
  const targetDegrees = parseDegrees(cleanProg);

  let allSongs = [];
  zhData.forEach((s) => allSongs.push({ ...s, language: "zh", source: "chinese_curated" }));
  popData.forEach((s) => allSongs.push(normalizePop909(s)));
  modData.forEach((s) => allSongs.push(normalizeModern(s)));
  enData.forEach((s) => allSongs.push({ ...s, language: "en", source: "western_hooktheory" }));

  if (textKeyword && (lang === "all" || lang === "en")) {
    allSongs = allSongs.concat(await fetchHooktheoryLive(rawQuery));
  }

  if (lang === "zh") allSongs = allSongs.filter((s) => s.language === "zh");
  else if (lang === "en") allSongs = allSongs.filter((s) => s.language === "en");

  const matchedSongs = [];
  const seen = new Set();

  for (const s of allSongs) {
    const sTitle = (s.title || "").toLowerCase();
    const sArtist = (s.artist || "").toLowerCase();
    if (keyFilter && !keyMatches(s, keyFilter)) continue;
    if (artistFilter && !sArtist.includes(artistFilter) && !sTitle.includes(artistFilter)) continue;

    let match = null;
    if (textKeyword) {
      if (sTitle.includes(textKeyword) || sArtist.includes(textKeyword)) match = { kind: "text", occurrences: 0 };
    } else if (targetDegrees.length > 0) {
      match = matchSong(s, targetDegrees);
    } else {
      match = { kind: "all", occurrences: 0 };
    }
    if (!match) continue;

    const uniqKey = `${s.title}|${s.artist}|${s.section || ""}`.toLowerCase();
    if (seen.has(uniqKey)) continue;
    seen.add(uniqKey);
    // The whole-song sequence is evidence, not a row the client renders.
    const { degree_sequence: _seq, ...publicRow } = s;
    matchedSongs.push({ ...publicRow, match_kind: match.kind, match_occurrences: match.occurrences });
  }

  const ordered = targetDegrees.length > 0 ? sortByEvidence(matchedSongs) : matchedSongs;

  const degs = targetDegrees.length > 0 ? targetDegrees : (ordered[0]?.degrees || [1, 5, 6, 4]);
  const progName = taxonomy[cleanProg]
    || (textKeyword ? `歌曲/歌手检索: "${rawQuery}"`
      : (!rawQuery || rawQuery === "all" ? "全部曲库全览 (All Songs Collection - 1000+ Songs)" : "自定义和弦进行"));

  const loopMatches = ordered.filter((s) => s.match_kind === "loop").length;
  const sequenceMatches = ordered.filter((s) => s.match_kind === "sequence").length;

  return new Response(JSON.stringify({
    query: rawQuery,
    progression: cleanProg || (ordered[0]?.progression || "1,5,6,4"),
    roman_progression: targetDegrees.length > 0
      ? targetDegrees.map((d) => ROMAN_MAP[d] || d).join("-")
      : (ordered[0]?.roman || "I-V-vi-IV"),
    progression_name: progName,
    degrees: degs,
    total_found: ordered.length,
    total_count: ordered.length,
    match_summary: { loop: loopMatches, sequence: sequenceMatches },
    matching: targetDegrees.length > 0
      ? "loop = query occurs in the song's main loop (any rotation); sequence = query recurs ≥2× in the whole song"
      : undefined,
    language_filter: lang,
    songs: ordered
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300"
    }
  });
}
