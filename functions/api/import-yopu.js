const NOTE_PITCH = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11
};

const MAJOR_SCALE_INTERVALS = {
  0: (1, 'I'),
  2: (2, 'ii'),
  4: (3, 'iii'),
  5: (4, 'IV'),
  7: (5, 'V'),
  9: (6, 'vi'),
  11: (7, 'vii°')
};

const INTERVAL_TO_DEGREE = {
  0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7
};

const DEGREE_TO_ROMAN = {
  1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°"
};

function chordToDegree(chordStr, keyCenter = "C") {
  const clean = chordStr.trim().split('/')[0];
  const match = clean.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) return { deg: 1, rom: "I" };
  const root = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const qual = match[2];
  const keyPitch = NOTE_PITCH[keyCenter] ?? 0;
  const chordPitch = NOTE_PITCH[root];
  if (chordPitch === undefined) return { deg: 1, rom: "I" };
  const interval = (chordPitch - keyPitch + 12) % 12;
  const deg = INTERVAL_TO_DEGREE[interval] || 1;
  let rom = DEGREE_TO_ROMAN[deg] || "I";
  if (qual.startsWith("m") && !qual.startsWith("maj")) {
    rom = rom.toLowerCase();
  } else if (deg === 1 || deg === 4 || deg === 5) {
    rom = rom.toUpperCase();
  }
  return { deg, rom };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    let urlOrId = body.score || body.url || body.id || "";
    if (!urlOrId) {
      return new Response(JSON.stringify({ error: "Missing score, url or id parameter" }), { status: 400 });
    }

    const idMatch = urlOrId.match(/[a-zA-Z0-9_-]{6,16}/);
    const sheetId = idMatch ? idMatch[0] : urlOrId;
    const targetUrl = `https://yopu.co/view/${sheetId}`;

    const resp = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Yopu returned HTTP ${resp.status}` }), { status: 502 });
    }

    const html = await resp.text();
    let title = "未知曲目";
    let artist = "未知歌手";
    let key = "C";
    let capo = 0;

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const rawTitle = titleMatch[1].replace(/_.*$/, "").trim();
      const parts = rawTitle.split(/\s*[-—]\s*/);
      if (parts.length >= 2) {
        title = parts[0].trim();
        artist = parts[1].trim();
      } else {
        title = rawTitle;
      }
    }

    // Try to extract key and capo from html or data json
    const keyMatch = html.match(/原调[：:\s]*([A-G][#b]?)/i) || html.match(/Key[：:\s]*([A-G][#b]?)/i);
    if (keyMatch) key = keyMatch[1];
    const capoMatch = html.match(/变调夹[：:\s]*(\d+)/i) || html.match(/Capo[：:\s]*(\d+)/i);
    if (capoMatch) capo = parseInt(capoMatch[1], 10);

    // Extract chords via regex
    const chordRegex = /\b([A-G][#b]?(?:m|maj7|7|sus4|add9|dim|aug)?(?:\/[A-G][#b]?)?)\b/g;
    const chords = [];
    let m;
    while ((m = chordRegex.exec(html)) !== null) {
      const c = m[1];
      if (!chord_ignore(c) || chords.length > 0) {
        if (chords.length === 0 || chords[chords.length - 1] !== c) {
          chords.push(c);
        }
      }
    }

    function chord_ignore(token) {
      return ["A", "I", "C", "D", "E", "F", "G"].includes(token);
    }

    const validChords = chords.length > 0 ? chords : ["C", "G", "Am", "F"];
    const degObjList = validChords.map(c => chordToDegree(c, key));
    const degrees = degObjList.map(o => o.deg);
    const romans = degObjList.map(o => o.rom);

    // Detect 4-chord loop
    let loopDegs = degrees.slice(0, 4);
    let loopRomans = romans.slice(0, 4);
    let loopChords = validChords.slice(0, 4);

    if (degrees.length >= 4) {
      const counts = {};
      for (let i = 0; i <= degrees.length - 4; i++) {
        const k = degrees.slice(i, i + 4).join(",");
        counts[k] = (counts[k] || 0) + 1;
      }
      let topK = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      if (topK && new Set(topK.split(",")).size >= 3) {
        loopDegs = topK.split(",").map(Number);
      }
    }

    const progStr = loopDegs.join(",");
    const romanStr = loopRomans.join("-");

    // Lookup named progression
    const host = new URL(context.request.url).origin;
    let progName = "";
    try {
      const taxResp = await fetch(`${host}/data/named_progressions.json`);
      if (taxResp.ok) {
        const tax = await taxResp.json();
        progName = tax[progStr] || "";
      }
    } catch (e) {}

    return new Response(JSON.stringify({
      id: sheetId,
      title: title,
      artist: artist,
      key: `${key} major`,
      original_key: key,
      capo: capo,
      primary_progression: progStr,
      primary_roman: romanStr,
      progression_name: progName,
      primary_chords: loopChords,
      extracted_chords: validChords.slice(0, 32),
      source_url: targetUrl
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
