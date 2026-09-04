// Diatonic array subsequence matcher
function hasProgressionMatch(songProgStr, queryProgStr) {
  if (!songProgStr || !queryProgStr) return false;
  const songDegs = songProgStr.split(",").map(s => s.trim()).filter(Boolean);
  const queryDegs = queryProgStr.split(",").map(s => s.trim()).filter(Boolean);
  if (queryDegs.length === 0) return false;
  if (queryDegs.length > songDegs.length) return false;

  for (let i = 0; i <= songDegs.length - queryDegs.length; i++) {
    let match = true;
    for (let j = 0; j < queryDegs.length; j++) {
      if (songDegs[i + j] !== queryDegs[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

const ROMAN_MAP = {
  1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°"
};

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const rawQuery = (url.searchParams.get("progression") || url.searchParams.get("q") || "").trim();
  const lang = (url.searchParams.get("lang") || "all").toLowerCase();
  const artistFilter = (url.searchParams.get("artist") || "").toLowerCase().trim();
  const keyFilter = (url.searchParams.get("key") || "").toLowerCase().trim();

  // Load static data from edge assets
  const host = url.origin;
  const [zhResp, popResp, modResp, enResp, taxResp] = await Promise.all([
    fetch(`${host}/data/chinese_corpus.json`),
    fetch(`${host}/data/pop909_indexed_chords.json`),
    fetch(`${host}/data/chinese_modern_corpus.json`),
    fetch(`${host}/data/western_corpus.json`),
    fetch(`${host}/data/named_progressions.json`)
  ]);

  const zhData = zhResp.ok ? await zhResp.json() : [];
  const popData = popResp.ok ? await popResp.json() : [];
  const modData = modResp.ok ? await modResp.json() : [];
  const enData = enResp.ok ? await enResp.json() : [];
  const taxonomy = taxResp.ok ? await taxResp.json() : {};

  // Check if query is text (song title / artist keyword) vs progression numbers
  const isDegreeQuery = /^[1-7\s,\-\>\|/]+$/.test(rawQuery) || /^[ivxIVX\s,\-\>\|/]+$/.test(rawQuery);
  const cleanProg = isDegreeQuery ? rawQuery.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "") : "";
  const textKeyword = !isDegreeQuery ? rawQuery.toLowerCase() : "";

  let allSongs = [];

  // 1. Curated Chinese
  zhData.forEach(s => allSongs.push({ ...s, language: "zh", source: "chinese_curated" }));
  // 2. POP909 Academic
  popData.forEach(s => allSongs.push({ ...s, language: "zh", source: "pop909_academic" }));
  // 3. Modern Hits
  modData.forEach(s => allSongs.push({
    id: s.id,
    title: s.title,
    artist: s.artist,
    key: s.key || s.original_key,
    section: s.section || "Chorus (副歌)",
    progression: s.primary_progression || s.progression,
    chords: s.primary_chords || s.chords,
    roman: s.primary_roman || s.roman,
    language: "zh",
    source: "chinese_modern"
  }));
  // 4. Western Songs (Curated)
  enData.forEach(s => allSongs.push({ ...s, language: "en", source: "western_hooktheory" }));

  // Live Hooktheory Search for Global/English Songs (75,000+ database)
  if (textKeyword && (lang === "all" || lang === "en")) {
    try {
      const hookResp = await fetch("https://search.hooktheory.com/indexes/theorytabs/search", {
        method: "POST",
        headers: {
          "Authorization": "Bearer YHXUiQCa6024e2a88cb48f226a94d16db0c20d993e0a424cfde7834b697445bdf280ce88",
          "Content-Type": "application/json",
          "Referer": "https://www.hooktheory.com/"
        },
        body: JSON.stringify({ q: rawQuery, limit: 15 })
      });
      if (hookResp.ok) {
        const hookData = await hookResp.json();
        (hookData.hits || []).forEach(h => {
          const rawDegs = (h.SInD || "").match(/qq([1-7])/g)?.map(m => parseInt(m.replace(/qq/, ""), 10)) || [];
          const chords = (h.chordAbsBare || h.chordAbs || "").split("qq").map(c => c.trim()).filter(Boolean);
          const progStr = rawDegs.slice(0, 4).join(",") || "1,5,6,4";
          const romanStr = rawDegs.slice(0, 4).map(d => ROMAN_MAP[d] || d).join("-");

          // Clean title if it contains artist name prefix e.g. "Richard Marx - Right Here Waiting"
          let title = h.song || "Unknown";
          const artist = h.artist || "Unknown";
          if (title.startsWith(`${artist} - `)) {
            title = title.replace(`${artist} - `, "");
          }

          allSongs.push({
            id: `hook_${h.id || Math.random().toString(36).slice(2, 8)}`,
            title: title,
            artist: artist,
            section: h.section || "Chorus",
            key: h.key || "C major",
            progression: progStr,
            roman: romanStr,
            chords: chords.slice(0, 8),
            youtube_id: h.ytid,
            language: "en",
            source: "hooktheory_live"
          });
        });
      }
    } catch (e) {
      // Ignore network timeout
    }
  }

  // Filter by language
  if (lang === "zh") {
    allSongs = allSongs.filter(s => s.language === "zh");
  } else if (lang === "en") {
    allSongs = allSongs.filter(s => s.language === "en");
  }

  // Filter by query
  let matchedSongs = [];
  const seen = new Set();

  for (const s of allSongs) {
    const sTitle = (s.title || "").toLowerCase();
    const sArtist = (s.artist || "").toLowerCase();
    const sProg = s.progression || "";
    const sKey = (s.key || "").toLowerCase();

    // Key filter
    if (keyFilter && !sKey.includes(keyFilter)) continue;

    // Artist filter
    if (artistFilter && !sArtist.includes(artistFilter) && !sTitle.includes(artistFilter)) continue;

    let isMatch = false;

    if (textKeyword) {
      // Text search in Title or Artist
      if (sTitle.includes(textKeyword) || sArtist.includes(textKeyword)) {
        isMatch = true;
      }
    } else if (cleanProg) {
      // Degree sub-sequence matching
      if (hasProgressionMatch(sProg, cleanProg)) {
        isMatch = true;
      }
    } else {
      isMatch = true;
    }

    if (isMatch) {
      const uniqKey = `${s.title}|${s.artist}|${s.section || ''}`.toLowerCase();
      if (!seen.has(uniqKey)) {
        seen.add(uniqKey);
        matchedSongs.push(s);
      }
    }
  }

  const degs = cleanProg ? cleanProg.split(",").map(Number).filter(n => !isNaN(n)) : (matchedSongs[0]?.degrees || [1, 5, 6, 4]);
  const progName = taxonomy[cleanProg] || (textKeyword ? `歌曲/歌手检索: "${rawQuery}"` : (!rawQuery || rawQuery === "all" ? "全部曲库全览 (All Songs Collection - 1000+ Songs)" : "自定义和弦进行"));

  return new Response(JSON.stringify({
    query: rawQuery,
    progression: cleanProg || (matchedSongs[0]?.progression || "1,5,6,4"),
    roman_progression: matchedSongs[0]?.roman || "I-V-vi-IV",
    progression_name: progName,
    degrees: degs,
    total_found: matchedSongs.length,
    language_filter: lang,
    songs: matchedSongs
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300"
    }
  });
}
