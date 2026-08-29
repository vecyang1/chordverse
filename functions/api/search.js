export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const prog = url.searchParams.get("progression") || "1,5,6,4";
  const lang = url.searchParams.get("lang") || "all";
  const artist = (url.searchParams.get("artist") || "").toLowerCase();
  const key = (url.searchParams.get("key") || "").toLowerCase();

  // Load static data from edge asset fetch
  const host = url.origin;
  const zhResp = await fetch(`${host}/data/chinese_corpus.json`);
  const enResp = await fetch(`${host}/data/western_corpus.json`);
  const taxResp = await fetch(`${host}/data/named_progressions.json`);

  const zhData = zhResp.ok ? await zhResp.json() : [];
  const enData = enResp.ok ? await enResp.json() : [];
  const taxonomy = taxResp.ok ? await taxResp.json() : {};

  // Clean progression string
  const cleanProg = prog.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "");
  const targetDegs = cleanProg.split(",").filter(Boolean);

  let songs = [];
  const seen = new Set();

  if (["all", "zh"].includes(lang.toLowerCase())) {
    for (const s of zhData) {
      if (s.progression.includes(cleanProg) || cleanProg.includes(s.progression)) {
        const k = (s.title + s.artist + s.section).toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          songs.push({ ...s, language: "zh", source: "chinese_corpus" });
        }
      }
    }
  }

  if (["all", "en"].includes(lang.toLowerCase())) {
    for (const s of enData) {
      if (s.progression.includes(cleanProg) || cleanProg.includes(s.progression)) {
        const k = (s.title + s.artist + s.section).toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          songs.push({ ...s, language: "en", source: "western_corpus" });
        }
      }
    }

    // Edge query to Hooktheory Search Index
    try {
      const hooktheoryUrl = `https://search.hooktheory.com/indexes/theorytabs/search`;
      const htResp = await fetch(hooktheoryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YHXUiQCa6d47d4e5ff01237a4c77c68832a878564e9e0344d57cff5ae8c2f1f516a73c9f"
        },
        body: JSON.stringify({
          q: cleanProg,
          limit: 20
        })
      });
      if (htResp.ok) {
        const htData = await htResp.json();
        for (const hit of htData.hits || []) {
          const k = (hit.song + hit.artist + (hit.section || "")).toLowerCase();
          if (!seen.has(k)) {
            seen.add(k);
            songs.push({
              id: hit.id || `ht_${songs.length}`,
              title: hit.song || hit.title,
              artist: hit.artist,
              section: hit.section || "Chorus",
              key: hit.key || "C major",
              progression: cleanProg,
              roman_progression: hit.chordRel || "",
              language: "en",
              source: "hooktheory_75k",
              ytid: hit.ytid
            });
          }
        }
      }
    } catch (e) {
      // Fallback cleanly to local dataset
    }
  }

  if (artist) {
    songs = songs.filter(s => s.artist.toLowerCase().includes(artist) || s.title.toLowerCase().includes(artist));
  }
  if (key) {
    songs = songs.filter(s => s.key.toLowerCase().includes(key));
  }

  const zhCount = songs.filter(s => s.language === "zh").length;
  const enCount = songs.filter(s => s.language === "en").length;

  return new Response(JSON.stringify({
    progression: cleanProg,
    progression_name: taxonomy[cleanProg] || "Custom Progression",
    total_count: songs.length,
    counts_by_language: {
      chinese: zhCount,
      western: enCount
    },
    songs: songs
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
