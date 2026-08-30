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
  0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7
};

function chordToDegree(chordStr, keyCenter = "C") {
  const clean = chordStr.trim().split('/')[0];
  const match = clean.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) return 1;
  const root = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const keyPitch = NOTE_PITCH[keyCenter] ?? 0;
  const chordPitch = NOTE_PITCH[root];
  if (chordPitch === undefined) return 1;
  const interval = (chordPitch - keyPitch + 12) % 12;
  return MAJOR_SCALE_INTERVALS[interval] || 1;
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    let urlOrId = body.url || body.id || "";
    if (!urlOrId) {
      return new Response(JSON.stringify({ error: "Missing url or id parameter" }), { status: 400 });
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

    // Extract chords via regex
    const chordRegex = /\b([A-G][#b]?(?:m|maj7|7|sus4|add9|dim|aug)?(?:\/[A-G][#b]?)?)\b/g;
    const chords = [];
    let m;
    while ((m = chordRegex.exec(html)) !== null) {
      if (!["A", "I", "C", "D", "E", "F", "G"].includes(m[1]) || chords.length > 0) {
        chords.push(m[1]);
      }
    }

    const degrees = chords.slice(0, 16).map(c => chordToDegree(c, key));
    const progression = degrees.slice(0, 4).join(",");

    return new Response(JSON.stringify({
      id: sheetId,
      title: title,
      artist: artist,
      original_key: key,
      detected_progression: progression,
      extracted_chords: chords.slice(0, 32),
      source_url: targetUrl
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
