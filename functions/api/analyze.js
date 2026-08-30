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
  0: { degree: 1, roman: "I" },
  2: { degree: 2, roman: "ii" },
  4: { degree: 3, roman: "iii" },
  5: { degree: 4, roman: "IV" },
  7: { degree: 5, roman: "V" },
  9: { degree: 6, roman: "vi" },
  11: { degree: 7, roman: "vii°" }
};

function parseChord(chordStr) {
  const clean = chordStr.trim().split('/')[0];
  const match = clean.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) return { root: clean, quality: "" };
  return {
    root: match[1].charAt(0).toUpperCase() + match[1].slice(1),
    quality: match[2]
  };
}

function chordToDegree(chordStr, keyCenter = "C") {
  const { root, quality } = parseChord(chordStr);
  const keyPitch = NOTE_PITCH[keyCenter] ?? 0;
  const chordPitch = NOTE_PITCH[root];
  if (chordPitch === undefined) {
    return { degree: 1, roman: chordStr };
  }

  const interval = (chordPitch - keyPitch + 12) % 12;
  const match = MAJOR_SCALE_INTERVALS[interval];
  if (match) {
    let roman = match.roman;
    if (quality.startsWith("m") && !quality.startsWith("maj")) {
      roman = roman.toLowerCase();
    } else if (quality.startsWith("7") || quality.startsWith("maj7") || quality === "") {
      if (match.degree === 1 || match.degree === 4 || match.degree === 5) {
        roman = roman.toUpperCase();
      }
    }
    return { degree: match.degree, roman: roman };
  }

  return { degree: interval, roman: chordStr };
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const chordsRaw = body.chords || "";
    const keyCenter = body.key || "C";
    const scale = body.scale || "major";

    const chordList = typeof chordsRaw === "string" 
      ? chordsRaw.replace(/[\s\->,|/]+/g, " ").trim().split(/\s+/).filter(Boolean)
      : chordsRaw;

    const degrees = [];
    const romans = [];

    for (const c of chordList) {
      const res = chordToDegree(c, keyCenter);
      degrees.push(res.degree);
      romans.push(res.roman);
    }

    const progStr = degrees.join(",");
    const romanStr = romans.join(" - ");

    // Check taxonomy
    let recognized = [];
    const host = new URL(context.request.url).origin;
    try {
      const taxResp = await fetch(`${host}/data/named_progressions.json`);
      if (taxResp.ok) {
        const taxonomy = await taxResp.json();
        if (taxonomy[progStr]) {
          recognized.push({
            name: taxonomy[progStr],
            progression: progStr
          });
        }
      }
    } catch (e) {}

    return new Response(JSON.stringify({
      input_chords: chordList,
      key: `${keyCenter} ${scale}`,
      scale_degrees: degrees,
      progression_string: progStr,
      roman_numerals: romanStr,
      recognized_progressions: recognized
    }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
