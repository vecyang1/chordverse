/**
 * ChordVerse Guitar Learning Suite
 * Interactive SVG Fretboard Visualizer, 7th Chords Voicing Engine,
 * Secondary Dominant (E7 -> Am) Theory Detector, and Capo Calculator.
 */

export const GUITAR_CHORD_LIBRARY = {
  // Key of C & Family
  "C":      { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1 },
  "Cmaj7":  { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], baseFret: 1 },
  "C7":     { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], baseFret: 1 },
  "Cadd9":  { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], baseFret: 1 },
  "Cm":     { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], baseFret: 3, barre: { fret: 3, fromString: 5, toString: 1 } },

  // Key of D & Family
  "Dm":     { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], baseFret: 1 },
  "Dm7":    { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 2, toString: 1 } },
  "D":      { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1 },
  "D7":     { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], baseFret: 1 },
  "Dmaj7":  { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 1, 1], baseFret: 1, barre: { fret: 2, fromString: 3, toString: 1 } },

  // Key of E & Family
  "Em":     { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], baseFret: 1 },
  "Em7":    { frets: [0, 2, 0, 0, 0, 0], fingers: [0, 1, 0, 0, 0, 0], baseFret: 1 },
  "E":      { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1 },
  "E7":     { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], baseFret: 1, isSecondaryDominant: true, target: "Am" },
  "Edim":   { frets: [-1, -1, 2, 3, 2, 3], fingers: [0, 0, 1, 3, 2, 4], baseFret: 1 },

  // Key of F & Family
  "F":      { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 6, toString: 1 } },
  "Fmaj7":  { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], baseFret: 1 },
  "F7":     { frets: [1, 3, 1, 2, 1, 1], fingers: [1, 3, 1, 2, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 6, toString: 1 } },
  "Fm":     { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 6, toString: 1 } },

  // Key of G & Family
  "G":      { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1 },
  "G7":     { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  "Gmaj7":  { frets: [3, 2, 0, 0, 0, 2], fingers: [2, 1, 0, 0, 0, 1], baseFret: 1 },
  "Gm":     { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3, barre: { fret: 3, fromString: 6, toString: 1 } },
  "Gm7":    { frets: [3, 5, 3, 3, 3, 3], fingers: [1, 3, 1, 1, 1, 1], baseFret: 3, barre: { fret: 3, fromString: 6, toString: 1 } },

  // Key of A & Family
  "Am":     { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], baseFret: 1 },
  "Am7":    { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], baseFret: 1 },
  "A":      { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1 },
  "A7":     { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], baseFret: 1, isSecondaryDominant: true, target: "Dm" },
  "Amaj7":  { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0], baseFret: 1 },

  // Key of B & Relatives
  "Bm":     { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 2, barre: { fret: 2, fromString: 5, toString: 1 } },
  "Bm7":    { frets: [-1, 2, 0, 2, 0, 2], fingers: [0, 1, 0, 2, 0, 3], baseFret: 1 },
  "B":      { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barre: { fret: 2, fromString: 5, toString: 1 } },
  "B7":     { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], baseFret: 1, isSecondaryDominant: true, target: "Em" },
  "Bdim":   { frets: [-1, 2, 3, 4, 3, -1], fingers: [0, 1, 2, 4, 3, 0], baseFret: 1 },

  // Sharp & Flat Modulations
  "F#m":    { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  "F#7":    { frets: [2, 4, 2, 3, 2, 2], fingers: [1, 3, 1, 2, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  "F#dim":  { frets: [-1, -1, 1, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4], baseFret: 1 },
  "Bb":     { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  "Bbmaj7": { frets: [-1, 1, 3, 2, 3, 1], fingers: [0, 1, 3, 2, 4, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  "Ab":     { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "Eb":     { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 3, 4, 2], baseFret: 1 },
  "C#m":    { frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 } },
  "G#m":    { frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } }
};

/**
 * Standard open string MIDI notes: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
 */
export const GUITAR_OPEN_TUNING_MIDI = [40, 45, 50, 55, 59, 64];

/**
 * Compute pitch frequency for string index (0=string 6, 5=string 1) and fret.
 */
export function stringFretToFreq(stringIndex, fret) {
  if (fret < 0) return null;
  const midi = GUITAR_OPEN_TUNING_MIDI[stringIndex] + fret;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Get resonant frequencies for all unmuted strings of a guitar chord.
 */
export function getGuitarStringFrequencies(chordName) {
  const chordData = GUITAR_CHORD_LIBRARY[chordName];
  if (!chordData) return [];
  const result = [];
  chordData.frets.forEach((fret, strIdx) => {
    if (fret >= 0) {
      result.push({
        stringNumber: 6 - strIdx, // 6 to 1
        stringIndex: strIdx,      // 0 to 5
        fret: fret,
        midi: GUITAR_OPEN_TUNING_MIDI[strIdx] + fret,
        freq: stringFretToFreq(strIdx, fret)
      });
    }
  });
  return result;
}

/**
 * Render responsive vector SVG guitar chord box diagram.
 */
export function renderGuitarChordSVG(chordName, chordData = null) {
  const data = chordData || GUITAR_CHORD_LIBRARY[chordName] || {
    frets: [-1, -1, -1, -1, -1, -1],
    fingers: [0, 0, 0, 0, 0, 0],
    baseFret: 1
  };

  const width = 120;
  const height = 155;
  const xStart = 25;
  const xEnd = 105;
  const yStart = 45;
  const yEnd = 135;
  const numStrings = 6;
  const numFrets = 4;
  const dx = (xEnd - xStart) / (numStrings - 1); // 16px
  const dy = (yEnd - yStart) / numFrets;          // 22.5px

  const frets = data.frets;
  const fingers = data.fingers || [0, 0, 0, 0, 0, 0];
  const baseFret = data.baseFret || 1;
  const barre = data.barre;

  // Escape chordName for safe XML
  const safeName = String(chordName)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  let svg = `<svg class="chord-box-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${safeName} guitar chord">`;

  // 1. Chord Name Header
  svg += `<text x="${width / 2}" y="19" text-anchor="middle" class="svg-chord-title">${safeName}</text>`;

  // 2. Open / Muted Indicators (✕ / ○) above nut
  frets.forEach((f, idx) => {
    const x = xStart + idx * dx;
    if (f === -1) {
      svg += `<text x="${x}" y="35" text-anchor="middle" class="svg-marker-x">✕</text>`;
    } else if (f === 0) {
      svg += `<circle cx="${x}" cy="31" r="3.5" class="svg-marker-o" />`;
    }
  });

  // 3. Nut or Fret Number Indicator
  if (baseFret === 1) {
    svg += `<line x1="${xStart - 1}" y1="${yStart}" x2="${xEnd + 1}" y2="${yStart}" class="svg-nut-line" stroke-width="3.5" />`;
  } else {
    svg += `<line x1="${xStart}" y1="${yStart}" x2="${xEnd}" y2="${yStart}" class="svg-fret-line" stroke-width="1.2" />`;
    svg += `<text x="${xStart - 7}" y="${yStart + dy * 0.7}" text-anchor="end" class="svg-fret-num">${baseFret}fr</text>`;
  }

  // 4. Horizontal Fret Lines
  for (let i = 1; i <= numFrets; i++) {
    const y = yStart + i * dy;
    svg += `<line x1="${xStart}" y1="${y}" x2="${xEnd}" y2="${y}" class="svg-fret-line" stroke-width="1.2" />`;
  }

  // 5. Vertical String Lines (string 6 at left, string 1 at right)
  for (let i = 0; i < numStrings; i++) {
    const x = xStart + i * dx;
    svg += `<line x1="${x}" y1="${yStart}" x2="${x}" y2="${yEnd}" class="svg-string-line" stroke-width="1.2" />`;
  }

  // 6. Barre Indicator (pill)
  if (barre) {
    const relFret = barre.fret - baseFret + 1;
    if (relFret >= 1 && relFret <= numFrets) {
      const y = yStart + (relFret - 0.5) * dy;
      const x1 = xStart + (6 - barre.fromString) * dx;
      const x2 = xStart + (6 - barre.toString) * dx;
      const minX = Math.min(x1, x2) - 6;
      const w = Math.abs(x2 - x1) + 12;
      svg += `<rect x="${minX}" y="${y - 6}" width="${w}" height="12" rx="6" class="svg-barre-pill" />`;
    }
  }

  // 7. Finger Placement Dots with Finger Numbers
  frets.forEach((f, idx) => {
    if (f > 0) {
      const relFret = f - baseFret + 1;
      if (relFret >= 1 && relFret <= numFrets) {
        const x = xStart + idx * dx;
        const y = yStart + (relFret - 0.5) * dy;
        const finger = fingers[idx];
        svg += `<circle cx="${x}" cy="${y}" r="6.5" class="svg-finger-dot" />`;
        if (finger > 0) {
          svg += `<text x="${x}" y="${y + 3.5}" text-anchor="middle" class="svg-finger-num">${finger}</text>`;
        }
      }
    }
  });

  svg += `</svg>`;
  return svg;
}

/**
 * Modulo 12 Capo Calculator & Transposition Assistant.
 * Recommends optimal beginner-friendly C or G shapes (Capo <= 7).
 */
export const KEY_TO_SEMITONE = {
  "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
  "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
  "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
};

export function normalizeKeyRoot(keyStr) {
  if (!keyStr) return "C";
  const clean = keyStr.replace(/\s*(major|minor|m|maj)\b/i, "").trim();
  return clean || "C";
}

export function calculateCapo(key) {
  const root = normalizeKeyRoot(key);
  const targetPitch = KEY_TO_SEMITONE[root] !== undefined ? KEY_TO_SEMITONE[root] : 0;

  // Shapes: C (pitch 0), G (pitch 7)
  const cCapo = (targetPitch - 0 + 12) % 12;
  const gCapo = (targetPitch - 7 + 12) % 12;

  // Recommendation strategy:
  // Prefer shape with Capo <= 5.
  // Standard acoustic guitar sweet spot:
  // C: 0 (C), Db: 1 (C), D: 2 (C), Eb: 3 (C), E: 4 (C), F: 5 (C)
  // G: 0 (G), Ab: 1 (G), A: 2 (G), Bb: 3 (G), B: 4 (G)
  // F#/Gb: 6 (C)
  let recommendedShape = "C";
  let recommendedCapo = cCapo;

  if (targetPitch >= 7 && targetPitch <= 11) {
    recommendedShape = "G";
    recommendedCapo = gCapo;
  } else {
    recommendedShape = "C";
    recommendedCapo = cCapo;
  }

  let text = "";
  if (recommendedCapo === 0) {
    text = `原曲 ${root} 调 → 推荐 <strong>${recommendedShape} 调指法 (不夹变调夹)</strong>`;
  } else {
    text = `原曲 ${root} 调 → 推荐 <strong>${recommendedShape} 调指法 (Capo ${recommendedCapo} 品)</strong>`;
  }

  return {
    key: root,
    pitch: targetPitch,
    shape: recommendedShape,
    capo: recommendedCapo,
    cShapeCapo: cCapo,
    gShapeCapo: gCapo,
    text: text
  };
}

/**
 * Diatonic degree chords map for standard keys.
 */
export const DIATONIC_TRIADS = {
  "C":  { 1: "C",  2: "Dm",  3: "Em",   4: "F",  5: "G",  6: "Am",  7: "Bdim" },
  "G":  { 1: "G",  2: "Am",  3: "Bm",   4: "C",  5: "D",  6: "Em",  7: "F#dim" },
  "D":  { 1: "D",  2: "Em",  3: "F#m",  4: "G",  5: "A",  6: "Bm",  7: "C#dim" },
  "A":  { 1: "A",  2: "Bm",  3: "C#m",  4: "D",  5: "E",  6: "F#m", 7: "G#dim" },
  "E":  { 1: "E",  2: "F#m", 3: "G#m",  4: "A",  5: "B",  6: "C#m", 7: "D#dim" },
  "F":  { 1: "F",  2: "Gm",  3: "Am",   4: "Bb", 5: "C",  6: "Dm",  7: "Edim" },
  "Bb": { 1: "Bb", 2: "Cm",  3: "Dm",   4: "Eb", 5: "F",  6: "Gm",  7: "Adim" },
  "Eb": { 1: "Eb", 2: "Fm",  3: "Gm",   4: "Ab", 5: "Bb", 6: "Cm",  7: "Ddim" },
  "Ab": { 1: "Ab", 2: "Bbm", 3: "Cm",   4: "Db", 5: "Eb", 6: "Fm",  7: "Gdim" }
};

/**
 * 7th chords voicing mapping for popular Mandopop/J-Pop progressions.
 * In Royal Road (4,5,3,6,2,5,1), 3 leading to 6 is upgraded to secondary dominant E7 (III7).
 */
export const SEVENTH_CHORDS_MAP = {
  "C": {
    1: "Cmaj7",
    2: "Dm7",
    3: "Em7", // Upgraded to E7 when followed by 6
    "3_sec": "E7",
    4: "Fmaj7",
    5: "G7",
    6: "Am7",
    7: "Bdim"
  },
  "G": {
    1: "Gmaj7",
    2: "Am7",
    3: "Bm7",
    "3_sec": "B7",
    4: "Cmaj7",
    5: "D7",
    6: "Em7",
    7: "F#dim"
  },
  "D": {
    1: "Dmaj7",
    2: "Em7",
    3: "F#m",
    "3_sec": "F#7",
    4: "Gmaj7",
    5: "A7",
    6: "Bm7",
    7: "C#dim"
  },
  "F": {
    1: "Fmaj7",
    2: "Gm7",
    3: "Am7",
    "3_sec": "A7",
    4: "Bbmaj7",
    5: "C7",
    6: "Dm7",
    7: "Edim"
  }
};

/**
 * Resolve progression chord names with Triad vs 7th Voicings.
 */
export function getProgressionVoicings(degrees, key = "C", voicing = "triad") {
  const root = normalizeKeyRoot(key);
  const triadDict = DIATONIC_TRIADS[root] || DIATONIC_TRIADS["C"];
  const seventhDict = SEVENTH_CHORDS_MAP[root] || SEVENTH_CHORDS_MAP["C"];

  const degArray = Array.isArray(degrees)
    ? degrees
    : String(degrees).split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));

  return degArray.map((deg, idx) => {
    if (voicing === "seventh") {
      // Check if degree 3 leads to degree 6 (Secondary Dominant III7 -> vi)
      const nextDeg = degArray[idx + 1];
      if (deg === 3 && (nextDeg === 6 || idx === degArray.length - 1 && degArray[0] === 6)) {
        return seventhDict["3_sec"] || "E7";
      }
      return seventhDict[deg] || triadDict[deg] || "C";
    }
    return triadDict[deg] || "C";
  });
}

/**
 * Detect Secondary Dominant (E7 -> Am / III7 -> vi) in progression.
 */
export function detectSecondaryDominant(progressionStr, chordsList = [], key = "C") {
  const prog = String(progressionStr || "");
  const chords = chordsList || [];
  const root = normalizeKeyRoot(key);

  // Check degree pattern: "3,6" sequence anywhere in progression
  const degs = prog.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  let hasDegree3to6 = false;
  for (let i = 0; i < degs.length - 1; i++) {
    if (degs[i] === 3 && degs[i + 1] === 6) {
      hasDegree3to6 = true;
      break;
    }
  }
  // Also check loop boundary (last to first)
  if (degs.length >= 2 && degs[degs.length - 1] === 3 && degs[0] === 6) {
    hasDegree3to6 = true;
  }

  // Check explicit chords: E7 -> Am or presence of E7, B7, A7
  let hasE7toAm = false;
  for (let i = 0; i < chords.length - 1; i++) {
    if (chords[i] === "E7" && chords[i + 1].startsWith("Am")) {
      hasE7toAm = true;
      break;
    }
  }
  if (chords.includes("E7") && chords.includes("Am")) {
    hasE7toAm = true;
  }

  const isMatched = hasDegree3to6 || hasE7toAm || prog === "4,5,3,6,2,5,1";

  return {
    isSecondaryDominant: isMatched,
    chordPair: root === "C" ? "E7 → Am" : (root === "G" ? "B7 → Em" : "III7 → vi"),
    explanation: `💡 乐理精讲：副属和弦 E7 (III7) → Am (vi) 的神级推动力。在 C 大调中，三级自然小三和弦为 Em (E-G-B)。升级为副属七和弦 E7 (E-G#-B-D) 引入了调外半音变化音 G#，与六级 Am 根音 A 构成极其强烈的半音导向（G# → A），同时 E7 与 Am 构成局部的属到主解决（V7/vi → vi），赋予流行大金曲（如《凄美地》《水星记》《青花瓷》）无可替代的叙事张力与情感爆发！`
  };
}

// Attach to window in browser context
if (typeof window !== "undefined") {
  window.GUITAR_CHORD_LIBRARY = GUITAR_CHORD_LIBRARY;
  window.GUITAR_OPEN_TUNING_MIDI = GUITAR_OPEN_TUNING_MIDI;
  window.stringFretToFreq = stringFretToFreq;
  window.getGuitarStringFrequencies = getGuitarStringFrequencies;
  window.renderGuitarChordSVG = renderGuitarChordSVG;
  window.calculateCapo = calculateCapo;
  window.getProgressionVoicings = getProgressionVoicings;
  window.detectSecondaryDominant = detectSecondaryDominant;
}
