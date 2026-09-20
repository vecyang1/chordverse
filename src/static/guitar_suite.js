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

  // Sharp & Flat Modulations & Extensions
  "F#":     { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  "F#maj7": { frets: [2, 4, 3, 3, 2, 2], fingers: [1, 4, 2, 3, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  "F#m":    { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  "F#m7":   { frets: [2, 4, 2, 2, 2, 2], fingers: [1, 3, 1, 1, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  "F#7":    { frets: [2, 4, 2, 3, 2, 2], fingers: [1, 3, 1, 2, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 }, isSecondaryDominant: true, target: "Bm" },
  "F#dim":  { frets: [-1, -1, 1, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4], baseFret: 1 },
  "Gb":     { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  "Gbmaj7": { frets: [2, 4, 3, 3, 2, 2], fingers: [1, 4, 2, 3, 1, 1], baseFret: 2, barre: { fret: 2, fromString: 6, toString: 1 } },
  "Bb":     { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  "Bbmaj7": { frets: [-1, 1, 3, 2, 3, 1], fingers: [0, 1, 3, 2, 4, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  "Bb7":    { frets: [-1, 1, 3, 1, 3, 1], fingers: [0, 1, 3, 1, 4, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 }, isSecondaryDominant: true, target: "Ebm" },
  "Bbm":    { frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  "Bbm7":   { frets: [-1, 1, 3, 1, 2, 1], fingers: [0, 1, 3, 1, 2, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  "Bmaj7":  { frets: [-1, 2, 4, 3, 4, 2], fingers: [0, 1, 3, 2, 4, 1], baseFret: 2, barre: { fret: 2, fromString: 5, toString: 1 } },
  "Ab":     { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "Abmaj7": { frets: [4, 6, 5, 5, 4, 4], fingers: [1, 4, 2, 3, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "Ab7":    { frets: [4, 6, 4, 5, 4, 4], fingers: [1, 3, 1, 2, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "Eb":     { frets: [-1, -1, 1, 3, 4, 3], fingers: [0, 0, 1, 3, 4, 2], baseFret: 1 },
  "Ebmaj7": { frets: [-1, -1, 1, 3, 3, 3], fingers: [0, 0, 1, 2, 3, 4], baseFret: 1 },
  "Eb7":    { frets: [-1, -1, 1, 3, 2, 3], fingers: [0, 0, 1, 3, 2, 4], baseFret: 1 },
  "Emaj7":  { frets: [0, 2, 1, 1, 0, 0], fingers: [0, 2, 1, 1, 0, 0], baseFret: 1 },
  "Cm7":    { frets: [-1, 3, 5, 3, 4, 3], fingers: [0, 1, 3, 1, 2, 1], baseFret: 3, barre: { fret: 3, fromString: 5, toString: 1 } },
  "C#":     { frets: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 2, 3, 4, 1], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 } },
  "C#maj7": { frets: [-1, 4, 6, 5, 6, 4], fingers: [0, 1, 3, 2, 4, 1], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 } },
  "C#7":    { frets: [-1, 4, 6, 4, 6, 4], fingers: [0, 1, 3, 1, 4, 1], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 }, isSecondaryDominant: true, target: "F#m" },
  "C#m":    { frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 } },
  "C#m7":   { frets: [-1, 4, 6, 4, 5, 4], fingers: [0, 1, 3, 1, 2, 1], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 } },
  "C#dim":  { frets: [-1, 4, 5, 3, 5, -1], fingers: [0, 2, 3, 1, 4, 0], baseFret: 3 },
  "Db":     { frets: [-1, 4, 6, 6, 6, 4], fingers: [0, 1, 2, 3, 4, 1], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 } },
  "Dbmaj7": { frets: [-1, 4, 6, 5, 6, 4], fingers: [0, 1, 3, 2, 4, 1], baseFret: 4, barre: { fret: 4, fromString: 5, toString: 1 } },
  "D#":     { frets: [-1, 6, 8, 8, 8, 6], fingers: [0, 1, 2, 3, 4, 1], baseFret: 6, barre: { fret: 6, fromString: 5, toString: 1 } },
  "D#m":    { frets: [-1, 6, 8, 8, 7, 6], fingers: [0, 1, 3, 4, 2, 1], baseFret: 6, barre: { fret: 6, fromString: 5, toString: 1 } },
  "D#7":    { frets: [-1, 6, 8, 6, 8, 6], fingers: [0, 1, 3, 1, 4, 1], baseFret: 6, barre: { fret: 6, fromString: 5, toString: 1 }, isSecondaryDominant: true, target: "G#m" },
  "D#m7":   { frets: [-1, 6, 8, 6, 7, 6], fingers: [0, 1, 3, 1, 2, 1], baseFret: 6, barre: { fret: 6, fromString: 5, toString: 1 } },
  "D#dim":  { frets: [-1, -1, 1, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4], baseFret: 1 },
  "Ebm":    { frets: [-1, 6, 8, 8, 7, 6], fingers: [0, 1, 3, 4, 2, 1], baseFret: 6, barre: { fret: 6, fromString: 5, toString: 1 } },
  "Ebm7":   { frets: [-1, 6, 8, 6, 7, 6], fingers: [0, 1, 3, 1, 2, 1], baseFret: 6, barre: { fret: 6, fromString: 5, toString: 1 } },
  "A#m":    { frets: [-1, 1, 3, 3, 2, 1], fingers: [0, 1, 3, 4, 2, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  "A#m7":   { frets: [-1, 1, 3, 1, 2, 1], fingers: [0, 1, 3, 1, 2, 1], baseFret: 1, barre: { fret: 1, fromString: 5, toString: 1 } },
  "Cb":     { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barre: { fret: 2, fromString: 5, toString: 1 } },
  "Abm":    { frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "Abm7":   { frets: [4, 6, 4, 4, 4, 4], fingers: [1, 3, 1, 1, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "G#":     { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "G#7":    { frets: [4, 6, 4, 5, 4, 4], fingers: [1, 3, 1, 2, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 }, isSecondaryDominant: true, target: "C#m" },
  "G#m":    { frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "G#m7":   { frets: [4, 6, 4, 4, 4, 4], fingers: [1, 3, 1, 1, 1, 1], baseFret: 4, barre: { fret: 4, fromString: 6, toString: 1 } },
  "G#dim":  { frets: [-1, -1, 3, 4, 3, 4], fingers: [0, 0, 1, 3, 2, 4], baseFret: 3 },
  "Adim":   { frets: [-1, 0, 1, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4], baseFret: 1 },
  "A#dim":  { frets: [-1, 1, 2, 0, 2, 0], fingers: [0, 1, 2, 0, 3, 0], baseFret: 1 },
  "Ddim":   { frets: [-1, -1, 0, 1, 0, 1], fingers: [0, 0, 0, 1, 0, 2], baseFret: 1 },
  "Cdim":   { frets: [-1, -1, 1, 2, 1, 2], fingers: [0, 0, 1, 3, 2, 4], baseFret: 1 },
  "Gdim":   { frets: [-1, -1, 2, 3, 2, 3], fingers: [0, 0, 1, 3, 2, 4], baseFret: 2 },
  "Fdim":   { frets: [-1, -1, 0, 1, 0, 1], fingers: [0, 0, 0, 1, 0, 2], baseFret: 1 },
  "Fm7":    { frets: [1, 3, 1, 1, 1, 1], fingers: [1, 3, 1, 1, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 6, toString: 1 } }
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

export const MINOR_TO_RELATIVE_MAJOR = {
  "Am": "C", "A minor": "C", "Amin": "C",
  "Em": "G", "E minor": "G", "Emin": "G",
  "Bm": "D", "B minor": "D", "Bmin": "D",
  "F#m": "A", "F# minor": "A", "F#min": "A",
  "C#m": "E", "C# minor": "E", "C#min": "E",
  "G#m": "B", "G# minor": "B", "G#min": "B",
  "Dm": "F", "D minor": "F", "Dmin": "F",
  "Gm": "Bb", "G minor": "Bb", "Gmin": "Bb",
  "Cm": "Eb", "C minor": "Eb", "Cmin": "Eb",
  "Fm": "Ab", "F minor": "Ab", "Fmin": "Ab",
  "Bbm": "Db", "Bb minor": "Db", "Bbmin": "Db",
  "Ebm": "Gb", "Eb minor": "Gb", "Ebmin": "Gb"
};

export function normalizeKeyRoot(keyStr) {
  if (!keyStr) return "C";
  let str = String(keyStr).trim();
  if (str.includes("/")) {
    const parts = str.split("/").map((p) => p.trim());
    const majorPart = parts.find((p) => /major/i.test(p));
    if (majorPart) {
      str = majorPart;
    } else {
      const nonMinorPart = parts.find((p) => !/minor\b|min\b/i.test(p));
      str = nonMinorPart || parts[0];
    }
  }

  const clean = str.replace(/\s*(major|minor|m|maj)\b/i, "").trim();
  const m = clean.match(/^[A-G][#b]?/i);
  if (m) {
    const root = m[0][0].toUpperCase() + (m[0][1] ? m[0][1].toLowerCase() : "");
    if (KEY_TO_SEMITONE[root] !== undefined) return root;
  }
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
 * Diatonic degree chords map for standard keys (14 keys).
 */
export const DIATONIC_TRIADS = {
  "C":  { 1: "C",  2: "Dm",  3: "Em",   4: "F",  5: "G",  6: "Am",  7: "Bdim" },
  "G":  { 1: "G",  2: "Am",  3: "Bm",   4: "C",  5: "D",  6: "Em",  7: "F#dim" },
  "D":  { 1: "D",  2: "Em",  3: "F#m",  4: "G",  5: "A",  6: "Bm",  7: "C#dim" },
  "A":  { 1: "A",  2: "Bm",  3: "C#m",  4: "D",  5: "E",  6: "F#m", 7: "G#dim" },
  "E":  { 1: "E",  2: "F#m", 3: "G#m",  4: "A",  5: "B",  6: "C#m", 7: "D#dim" },
  "B":  { 1: "B",  2: "C#m", 3: "D#m",  4: "E",  5: "F#", 6: "G#m", 7: "Adim" },
  "F#": { 1: "F#", 2: "G#m", 3: "Bbm",  4: "B",  5: "C#", 6: "D#m", 7: "Fdim" },
  "Gb": { 1: "Gb", 2: "Abm", 3: "Bbm",  4: "B",  5: "Db", 6: "Ebm", 7: "Fdim" },
  "F":  { 1: "F",  2: "Gm",  3: "Am",   4: "Bb", 5: "C",  6: "Dm",  7: "Edim" },
  "Bb": { 1: "Bb", 2: "Cm",  3: "Dm",   4: "Eb", 5: "F",  6: "Gm",  7: "Adim" },
  "Eb": { 1: "Eb", 2: "Fm",  3: "Gm",   4: "Ab", 5: "Bb", 6: "Cm",  7: "Ddim" },
  "Ab": { 1: "Ab", 2: "Bbm", 3: "Cm",   4: "Db", 5: "Eb", 6: "Fm",  7: "Gdim" },
  "Db": { 1: "Db", 2: "Ebm", 3: "Fm",   4: "Gb", 5: "Ab", 6: "Bbm", 7: "Cdim" },
  "C#": { 1: "C#", 2: "D#m", 3: "Fm",   4: "F#", 5: "G#", 6: "Bbm", 7: "Cdim" }
};

/**
 * 7th chords voicing mapping for popular Mandopop/J-Pop progressions across all 14 keys.
 * In Royal Road (4,5,3,6,2,5,1), 3 leading to 6 is upgraded to secondary dominant III7 (3_sec).
 */
export const SEVENTH_CHORDS_MAP = {
  "C": {
    1: "Cmaj7", 2: "Dm7", 3: "Em7", "3_sec": "E7", 4: "Fmaj7", 5: "G7", 6: "Am7", 7: "Bdim"
  },
  "G": {
    1: "Gmaj7", 2: "Am7", 3: "Bm7", "3_sec": "B7", 4: "Cmaj7", 5: "D7", 6: "Em7", 7: "F#dim"
  },
  "D": {
    1: "Dmaj7", 2: "Em7", 3: "F#m7", "3_sec": "F#7", 4: "Gmaj7", 5: "A7", 6: "Bm7", 7: "C#dim"
  },
  "A": {
    1: "Amaj7", 2: "Bm7", 3: "C#m7", "3_sec": "C#7", 4: "Dmaj7", 5: "E7", 6: "F#m7", 7: "G#dim"
  },
  "E": {
    1: "Emaj7", 2: "F#m7", 3: "G#m7", "3_sec": "G#7", 4: "Amaj7", 5: "B7", 6: "C#m7", 7: "D#dim"
  },
  "B": {
    1: "Bmaj7", 2: "C#m7", 3: "D#m7", "3_sec": "D#7", 4: "Emaj7", 5: "F#7", 6: "G#m7", 7: "Adim"
  },
  "F#": {
    1: "F#maj7", 2: "G#m7", 3: "Bbm7", "3_sec": "Bb7", 4: "Bmaj7", 5: "C#7", 6: "D#m7", 7: "Fdim"
  },
  "Gb": {
    1: "Gbmaj7", 2: "Abm7", 3: "Bbm7", "3_sec": "Bb7", 4: "Bmaj7", 5: "Db7", 6: "Ebm7", 7: "Fdim"
  },
  "F": {
    1: "Fmaj7", 2: "Gm7", 3: "Am7", "3_sec": "A7", 4: "Bbmaj7", 5: "C7", 6: "Dm7", 7: "Edim"
  },
  "Bb": {
    1: "Bbmaj7", 2: "Cm7", 3: "Dm7", "3_sec": "D7", 4: "Ebmaj7", 5: "F7", 6: "Gm7", 7: "Adim"
  },
  "Eb": {
    1: "Ebmaj7", 2: "Fm7", 3: "Gm7", "3_sec": "G7", 4: "Abmaj7", 5: "Bb7", 6: "Cm7", 7: "Ddim"
  },
  "Ab": {
    1: "Abmaj7", 2: "Bbm7", 3: "Cm7", "3_sec": "C7", 4: "Dbmaj7", 5: "Eb7", 6: "Fm7", 7: "Gdim"
  },
  "Db": {
    1: "Dbmaj7", 2: "Ebm7", 3: "Fm7", "3_sec": "F7", 4: "Gbmaj7", 5: "Ab7", 6: "Bbm7", 7: "Cdim"
  },
  "C#": {
    1: "C#maj7", 2: "D#m7", 3: "Fm7", "3_sec": "F7", 4: "F#maj7", 5: "G#7", 6: "Bbm7", 7: "Cdim"
  }
};

/**
 * Resolve progression chord names with Triad vs 7th Voicings.
 */
export function getProgressionVoicings(degrees, key = "C", voicing = "triad", customChords = null) {
  if (Array.isArray(customChords) && customChords.length > 0 && voicing === "triad") {
    return customChords.map(c => String(c).split("/")[0].trim());
  }

  const root = normalizeKeyRoot(key);
  const triadDict = DIATONIC_TRIADS[root] || DIATONIC_TRIADS["C"];
  const seventhDict = SEVENTH_CHORDS_MAP[root] || SEVENTH_CHORDS_MAP["C"];

  const degArray = Array.isArray(degrees)
    ? degrees
    : String(degrees).split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));

  const is6413 = degArray.length === 4 && degArray[0] === 6 && degArray[1] === 4 && degArray[2] === 1 && degArray[3] === 3;
  const maj3 = { "C": "E", "G": "B", "D": "F#", "A": "C#", "E": "G#", "B": "D#", "F#": "A#", "Gb": "Bb", "F": "A", "Bb": "D", "Eb": "G", "Ab": "C", "Db": "F", "C#": "F" };

  return degArray.map((deg, idx) => {
    if (voicing === "seventh") {
      // Check if degree 3 leads to degree 6 (Secondary Dominant III7 -> vi)
      const nextDeg = degArray[idx + 1];
      if (deg === 3 && (nextDeg === 6 || (idx === degArray.length - 1 && degArray[0] === 6))) {
        return seventhDict["3_sec"] || "E7";
      }
      return seventhDict[deg] || triadDict[deg] || "C";
    }
    if (deg === 3 && is6413 && maj3[root]) {
      return maj3[root];
    }
    return triadDict[deg] || "C";
  });
}

/**
 * Secondary dominant profile definitions for all keys.
 */
export const SEC_DOM_PROFILES = {
  "C":  { pair: "E7 → Am",   sec: "E7",  target: "Am",  scale3: "Em",  leadTone: "G#" },
  "G":  { pair: "B7 → Em",   sec: "B7",  target: "Em",  scale3: "Bm",  leadTone: "D#" },
  "D":  { pair: "F#7 → Bm",  sec: "F#7", target: "Bm",  scale3: "F#m", leadTone: "A#" },
  "A":  { pair: "C#7 → F#m", sec: "C#7", target: "F#m", scale3: "C#m", leadTone: "E#" },
  "E":  { pair: "G#7 → C#m", sec: "G#7", target: "C#m", scale3: "G#m", leadTone: "B#" },
  "B":  { pair: "D#7 → G#m", sec: "D#7", target: "G#m", scale3: "D#m", leadTone: "Fx" },
  "F":  { pair: "A7 → Dm",   sec: "A7",  target: "Dm",  scale3: "Am",  leadTone: "C#" },
  "Bb": { pair: "D7 → Gm",   sec: "D7",  target: "Gm",  scale3: "Dm",  leadTone: "F#" },
  "Eb": { pair: "G7 → Cm",   sec: "G7",  target: "Cm",  scale3: "Gm",  leadTone: "B" },
  "Ab": { pair: "C7 → Fm",   sec: "C7",  target: "Fm",  scale3: "Cm",  leadTone: "E" },
  "Db": { pair: "F7 → Bbm",  sec: "F7",  target: "Bbm", scale3: "Fm",  leadTone: "A" },
  "F#": { pair: "Bb7 → D#m", sec: "Bb7", target: "D#m", scale3: "Bbm", leadTone: "D" },
  "Gb": { pair: "Bb7 → Ebm", sec: "Bb7", target: "Ebm", scale3: "Bbm", leadTone: "D" },
  "C#": { pair: "F7 → Bbm",  sec: "F7",  target: "Bbm", scale3: "Fm",  leadTone: "A" }
};

/**
 * Detect Secondary Dominant (III7 -> vi) in progression across all keys.
 */
export function detectSecondaryDominant(progressionStr, chordsList = [], key = "C") {
  const prog = String(progressionStr || "");
  const chords = chordsList || [];
  const root = normalizeKeyRoot(key);
  const profile = SEC_DOM_PROFILES[root] || SEC_DOM_PROFILES["C"];

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

  // Check explicit chords matching profile secondary dominant pair
  let hasChordPair = false;
  for (let i = 0; i < chords.length - 1; i++) {
    if (chords[i] === profile.sec && chords[i + 1].startsWith(profile.target)) {
      hasChordPair = true;
      break;
    }
  }
  if (chords.includes(profile.sec) && chords.some(c => c.startsWith(profile.target))) {
    hasChordPair = true;
  }

  const isMatched = hasDegree3to6 || hasChordPair || prog === "4,5,3,6,2,5,1";

  return {
    isSecondaryDominant: isMatched,
    chordPair: profile.pair,
    explanation: `💡 乐理精讲：副属和弦 ${profile.pair} (III7 → vi) 的神级推动力。在 ${root} 大调中，三级自然小三和弦为 ${profile.scale3}。升级为副属七和弦 ${profile.sec} 引入了调外变化音（导音 ${profile.leadTone}），与六级 ${profile.target} 构成强烈的半音导向解决（V7/vi → vi），赋予流行大金曲（如《凄美地》《水星记》《青花瓷》）无可替代的叙事张力与情感爆发！`
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
  window.SEC_DOM_PROFILES = SEC_DOM_PROFILES;
  window.DIATONIC_TRIADS = DIATONIC_TRIADS;
  window.SEVENTH_CHORDS_MAP = SEVENTH_CHORDS_MAP;
}
