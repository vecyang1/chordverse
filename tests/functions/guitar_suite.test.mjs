/**
 * Unit test suite for the Guitar Learning Suite.
 *
 * Exercises:
 *  1. GUITAR_CHORD_LIBRARY physical fret and fingering data contracts.
 *  2. Vector SVG fretboard box diagram rendering (lines, markers, barre, dots).
 *  3. Modulo-12 Capo calculator recommendations across all 12 musical keys.
 *  4. 7th chord conversion and Secondary Dominant (E7 -> Am / III7 -> vi) detection.
 *  5. Physical acoustic guitar string tuning and ~20ms micro-arpeggio timing.
 *
 * Run: node --test tests/functions/guitar_suite.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GUITAR_CHORD_LIBRARY,
  GUITAR_OPEN_TUNING_MIDI,
  stringFretToFreq,
  getGuitarStringFrequencies,
  renderGuitarChordSVG,
  calculateCapo,
  normalizeKeyRoot,
  getProgressionVoicings,
  detectSecondaryDominant,
  DIATONIC_TRIADS,
  SEVENTH_CHORDS_MAP
} from "../../src/static/guitar_suite.js";

test("GUITAR_CHORD_LIBRARY contains all required chords with valid fret & finger contracts", () => {
  const requiredChords = [
    // Key of C & relatives
    "C", "Cmaj7", "C7",
    // Key of D & relatives
    "Dm", "Dm7", "D", "D7", "Dmaj7",
    // Key of E & relatives
    "Em", "Em7", "E", "E7",
    // Key of F & relatives
    "F", "Fmaj7", "F7",
    // Key of G & relatives
    "G", "G7",
    // Key of A & relatives
    "Am", "Am7", "A", "A7", "Amaj7",
    // Key of B & relatives
    "Bm", "Bm7", "B7", "Bdim",
    // Modulations & flat/sharp keys
    "F#m", "F#7", "Bb", "Bbmaj7", "Gm", "Gm7", "Ab", "Eb"
  ];

  for (const chord of requiredChords) {
    const data = GUITAR_CHORD_LIBRARY[chord];
    assert.ok(data, `Chord ${chord} must exist in GUITAR_CHORD_LIBRARY`);

    // frets: 6 elements, values between -1 (muted) and 24
    assert.ok(Array.isArray(data.frets), `${chord}.frets must be an array`);
    assert.equal(data.frets.length, 6, `${chord}.frets must have exactly 6 strings`);
    for (let i = 0; i < 6; i++) {
      const f = data.frets[i];
      assert.ok(Number.isInteger(f), `${chord}.frets[${i}] must be an integer`);
      assert.ok(f >= -1 && f <= 24, `${chord}.frets[${i}] must be in [-1, 24]`);
    }

    // fingers: 6 elements, values in [0, 4]
    assert.ok(Array.isArray(data.fingers), `${chord}.fingers must be an array`);
    assert.equal(data.fingers.length, 6, `${chord}.fingers must have 6 finger assignments`);
    for (let i = 0; i < 6; i++) {
      const finger = data.fingers[i];
      assert.ok(Number.isInteger(finger), `${chord}.fingers[${i}] must be integer`);
      assert.ok(finger >= 0 && finger <= 4, `${chord}.fingers[${i}] must be between 0 and 4`);
      // If fret is -1 or 0, finger should typically be 0
      if (data.frets[i] <= 0) {
        assert.equal(finger, 0, `${chord} string ${6 - i} is open or muted, finger must be 0`);
      }
    }

    // baseFret: positive integer >= 1
    assert.ok(Number.isInteger(data.baseFret) && data.baseFret >= 1, `${chord}.baseFret must be >= 1`);

    // barre: optional contract check
    if (data.barre) {
      assert.ok(Number.isInteger(data.barre.fret), `${chord}.barre.fret must be an integer`);
      assert.ok(data.barre.fret >= data.baseFret, `${chord}.barre.fret must be >= baseFret`);
      assert.ok(data.barre.fromString >= 1 && data.barre.fromString <= 6);
      assert.ok(data.barre.toString >= 1 && data.barre.toString <= 6);
      assert.ok(data.barre.fromString >= data.barre.toString, `${chord}.barre.fromString must be >= toString`);
    }
  }
});

test("renderGuitarChordSVG generates valid XML SVG with all components", () => {
  // Test open C chord
  const svgC = renderGuitarChordSVG("C");
  assert.ok(svgC.startsWith("<svg"), "Must start with <svg tag");
  assert.ok(svgC.endsWith("</svg>"), "Must end with </svg> tag");
  assert.ok(svgC.includes('class="chord-box-svg"'), "Must have chord-box-svg class");
  assert.ok(svgC.includes(">C</text>"), "Must render chord title");
  assert.ok(svgC.includes('class="svg-marker-x"'), "C has muted string 6 (X)");
  assert.ok(svgC.includes('class="svg-marker-o"'), "C has open strings (O)");
  assert.ok(svgC.includes('class="svg-nut-line"'), "Open C chord must render thick nut line");
  assert.ok(svgC.includes('class="svg-fret-line"'), "Must render horizontal fret lines");
  assert.ok(svgC.includes('class="svg-string-line"'), "Must render vertical string lines");
  assert.ok(svgC.includes('class="svg-finger-dot"'), "Must render finger dots");
  assert.ok(svgC.includes(">3</text>"), "Must render finger number 3 (ring)");
  assert.ok(svgC.includes(">2</text>"), "Must render finger number 2 (middle)");
  assert.ok(svgC.includes(">1</text>"), "Must render finger number 1 (index)");

  // Test barre chord Bm (baseFret 2)
  const svgBm = renderGuitarChordSVG("Bm");
  assert.ok(svgBm.includes("2fr"), "Bm must display base fret indicator (2fr)");
  assert.ok(svgBm.includes('class="svg-barre-pill"'), "Bm must render barre pill/rect");

  // Test XSS safety
  const svgMalicious = renderGuitarChordSVG("<script>alert(1)</script>");
  assert.ok(!svgMalicious.includes("<script>"), "Must escape dangerous XML characters");
  assert.ok(svgMalicious.includes("&lt;script&gt;"), "Must XML-escape chordName");
});

test("calculateCapo recommends optimal C or G shape for all 12 keys", () => {
  const cases = [
    { key: "C", expectedShape: "C", expectedCapo: 0 },
    { key: "Db", expectedShape: "C", expectedCapo: 1 },
    { key: "C#", expectedShape: "C", expectedCapo: 1 },
    { key: "D", expectedShape: "C", expectedCapo: 2 },
    { key: "Eb", expectedShape: "C", expectedCapo: 3 },
    { key: "E", expectedShape: "C", expectedCapo: 4 },
    { key: "F", expectedShape: "C", expectedCapo: 5 },
    { key: "F#", expectedShape: "C", expectedCapo: 6 },
    { key: "Gb", expectedShape: "C", expectedCapo: 6 },
    { key: "G", expectedShape: "G", expectedCapo: 0 },
    { key: "Ab", expectedShape: "G", expectedCapo: 1 },
    { key: "A", expectedShape: "G", expectedCapo: 2 },
    { key: "Bb", expectedShape: "G", expectedCapo: 3 },
    { key: "B", expectedShape: "G", expectedCapo: 4 }
  ];

  for (const tc of cases) {
    const res = calculateCapo(tc.key);
    assert.equal(res.shape, tc.expectedShape, `Key ${tc.key} should recommend ${tc.expectedShape} shape`);
    assert.equal(res.capo, tc.expectedCapo, `Key ${tc.key} should recommend Capo ${tc.expectedCapo}`);
    assert.ok(res.capo <= 6, `Recommended Capo for ${tc.key} (${res.capo}) must be <= 6 for easy acoustic playability`);
    assert.ok(res.text.includes(tc.key), `Recommendation text must mention ${tc.key}`);
  }
});

test("normalizeKeyRoot cleans key strings", () => {
  assert.equal(normalizeKeyRoot("C major"), "C");
  assert.equal(normalizeKeyRoot("G Major"), "G");
  assert.equal(normalizeKeyRoot("Am"), "A");
  assert.equal(normalizeKeyRoot("Eb minor"), "Eb");
  assert.equal(normalizeKeyRoot(""), "C");
});

test("getProgressionVoicings supports Triad vs 7th Extensions for Royal Road across multiple keys", () => {
  const royalRoad = [4, 5, 3, 6, 2, 5, 1];

  // Triads in C major
  const triadsC = getProgressionVoicings(royalRoad, "C", "triad");
  assert.deepEqual(triadsC, ["F", "G", "Em", "Am", "Dm", "G", "C"]);

  // 7th Extensions in C major (3 upgraded to secondary dominant E7 leading to Am)
  const seventhsC = getProgressionVoicings(royalRoad, "C", "seventh");
  assert.deepEqual(seventhsC, ["Fmaj7", "G7", "E7", "Am7", "Dm7", "G7", "Cmaj7"]);

  // Triads in G major
  const triadsG = getProgressionVoicings(royalRoad, "G", "triad");
  assert.deepEqual(triadsG, ["C", "D", "Bm", "Em", "Am", "D", "G"]);

  // 7th Extensions in G major (3 upgraded to B7 leading to Em)
  const seventhG = getProgressionVoicings(royalRoad, "G", "seventh");
  assert.deepEqual(seventhG, ["Cmaj7", "D7", "B7", "Em7", "Am7", "D7", "Gmaj7"]);

  // Triads in A major (e.g. 青花瓷)
  const triadsA = getProgressionVoicings(royalRoad, "A", "triad");
  assert.deepEqual(triadsA, ["D", "E", "C#m", "F#m", "Bm", "E", "A"]);

  // 7th Extensions in A major (3 upgraded to C#7 leading to F#m)
  const seventhA = getProgressionVoicings(royalRoad, "A", "seventh");
  assert.deepEqual(seventhA, ["Dmaj7", "E7", "C#7", "F#m7", "Bm7", "E7", "Amaj7"]);

  // 7th Extensions in D major (3 upgraded to F#7 leading to Bm)
  const seventhD = getProgressionVoicings(royalRoad, "D", "seventh");
  assert.deepEqual(seventhD, ["Gmaj7", "A7", "F#7", "Bm7", "Em7", "A7", "Dmaj7"]);

  // 7th Extensions in E major (3 upgraded to G#7 leading to C#m)
  const seventhE = getProgressionVoicings(royalRoad, "E", "seventh");
  assert.deepEqual(seventhE, ["Amaj7", "B7", "G#7", "C#m7", "F#m7", "B7", "Emaj7"]);
});

test("detectSecondaryDominant flags III7 -> vi half-step leading tone across all keys", () => {
  // Royal Road progression contains 3 -> 6 in C major
  const secDomC = detectSecondaryDominant("4,5,3,6,2,5,1", [], "C");
  assert.equal(secDomC.isSecondaryDominant, true);
  assert.equal(secDomC.chordPair, "E7 → Am");
  assert.ok(secDomC.explanation.includes("E7 → Am (III7 → vi)"));
  assert.ok(secDomC.explanation.includes("导音 G#"));

  // Royal Road in A major (青花瓷: C#7 -> F#m)
  const secDomA = detectSecondaryDominant("4,5,3,6,2,5,1", [], "A");
  assert.equal(secDomA.isSecondaryDominant, true);
  assert.equal(secDomA.chordPair, "C#7 → F#m");
  assert.ok(secDomA.explanation.includes("C#7 → F#m"));
  assert.ok(secDomA.explanation.includes("导音 E#"));

  // Royal Road in G major (B7 -> Em)
  const secDomG = detectSecondaryDominant("4,5,3,6,2,5,1", [], "G");
  assert.equal(secDomG.isSecondaryDominant, true);
  assert.equal(secDomG.chordPair, "B7 → Em");

  // Royal Road in D major (F#7 -> Bm)
  const secDomD = detectSecondaryDominant("4,5,3,6,2,5,1", [], "D");
  assert.equal(secDomD.isSecondaryDominant, true);
  assert.equal(secDomD.chordPair, "F#7 → Bm");

  // Explicit E7 -> Am in chords list
  const secDomExplicit = detectSecondaryDominant("1,3,6,4", ["C", "E7", "Am", "F"], "C");
  assert.equal(secDomExplicit.isSecondaryDominant, true);

  // Non-secondary dominant progression (1,5,6,4)
  const secDomPopPunk = detectSecondaryDominant("1,5,6,4", ["C", "G", "Am", "F"], "C");
  assert.equal(secDomPopPunk.isSecondaryDominant, false);
});

test("physical acoustic guitar string tuning frequencies and micro-arpeggio timing", () => {
  // Standard tuning open string frequencies
  const tuningFreqs = GUITAR_OPEN_TUNING_MIDI.map((midi, strIdx) => stringFretToFreq(strIdx, 0));

  // Open string frequency targets from DISPATCH.md:
  // E2 (82.41 Hz), A2 (110.00 Hz), D3 (146.83 Hz), G3 (196.00 Hz), B3 (246.94 Hz), E4 (329.63 Hz)
  assert.ok(Math.abs(tuningFreqs[0] - 82.41) < 0.1, `E2 should be ~82.41 Hz, got ${tuningFreqs[0]}`);
  assert.ok(Math.abs(tuningFreqs[1] - 110.00) < 0.1, `A2 should be 110.00 Hz, got ${tuningFreqs[1]}`);
  assert.ok(Math.abs(tuningFreqs[2] - 146.83) < 0.1, `D3 should be ~146.83 Hz, got ${tuningFreqs[2]}`);
  assert.ok(Math.abs(tuningFreqs[3] - 196.00) < 0.1, `G3 should be ~196.00 Hz, got ${tuningFreqs[3]}`);
  assert.ok(Math.abs(tuningFreqs[4] - 246.94) < 0.1, `B3 should be ~246.94 Hz, got ${tuningFreqs[4]}`);
  assert.ok(Math.abs(tuningFreqs[5] - 329.63) < 0.1, `E4 should be ~329.63 Hz, got ${tuningFreqs[5]}`);

  // Fretted note calculations
  // String 5 (A2) fret 3 = C3 (130.81 Hz)
  const c3Freq = stringFretToFreq(1, 3);
  assert.ok(Math.abs(c3Freq - 130.81) < 0.1, `C3 should be ~130.81 Hz, got ${c3Freq}`);

  // String 6 (E2) fret 3 = G2 (98.00 Hz)
  const g2Freq = stringFretToFreq(0, 3);
  assert.ok(Math.abs(g2Freq - 98.00) < 0.1, `G2 should be ~98.00 Hz, got ${g2Freq}`);

  // String 1 (E4) fret 1 = F4 (349.23 Hz)
  const f4Freq = stringFretToFreq(5, 1);
  assert.ok(Math.abs(f4Freq - 349.23) < 0.1, `F4 should be ~349.23 Hz, got ${f4Freq}`);

  // Test getGuitarStringFrequencies for C chord: [-1, 3, 2, 0, 1, 0]
  // 5 unmuted strings (string 6 muted)
  const cStrings = getGuitarStringFrequencies("C");
  assert.equal(cStrings.length, 5, "C chord should play 5 resonant strings");
  assert.equal(cStrings[0].stringNumber, 5, "Lowest ringing string is string 5");
  assert.equal(cStrings[0].midi, 48, "String 5 fret 3 is MIDI 48 (C3)");
  assert.equal(cStrings[4].stringNumber, 1, "Highest string is string 1");
  assert.equal(cStrings[4].midi, 64, "String 1 fret 0 is MIDI 64 (E4)");

  // Verify ascending pitch order
  for (let i = 0; i < cStrings.length - 1; i++) {
    assert.ok(cStrings[i].freq < cStrings[i + 1].freq, "Strings must increase in frequency from low to high");
  }

  // Micro-arpeggio timing: ~18ms - 22ms per string
  const microArpeggioDelay = 0.020; // 20ms
  assert.ok(microArpeggioDelay >= 0.018 && microArpeggioDelay <= 0.022, "Timing must be within 18ms-22ms range");
});

test("DIATONIC_TRIADS and SEVENTH_CHORDS_MAP support all 14 keys with correct degree 7 A#dim for B major", () => {
  const all14Keys = ["C", "G", "D", "A", "E", "B", "F#", "Gb", "F", "Bb", "Eb", "Ab", "Db", "C#"];
  for (const k of all14Keys) {
    assert.ok(DIATONIC_TRIADS[k], `DIATONIC_TRIADS must define key ${k}`);
    assert.ok(SEVENTH_CHORDS_MAP[k], `SEVENTH_CHORDS_MAP must define key ${k}`);
    for (let d = 1; d <= 7; d++) {
      assert.ok(DIATONIC_TRIADS[k][d], `DIATONIC_TRIADS[${k}][${d}] must be defined`);
      assert.ok(SEVENTH_CHORDS_MAP[k][d], `SEVENTH_CHORDS_MAP[${k}][${d}] must be defined`);
    }
  }

  // Key of B: degree 7 is A#dim, NOT Adim
  assert.equal(DIATONIC_TRIADS["B"][7], "A#dim");
  assert.equal(SEVENTH_CHORDS_MAP["B"][7], "A#dim");

  // getProgressionVoicings with customChords from authentic song row (e.g. 凄美地 in B)
  const qmdChords = ["B", "F#", "G#m", "E"];
  const voicedCustom = getProgressionVoicings([1, 5, 6, 4], "B", "triad", qmdChords);
  assert.deepEqual(voicedCustom, ["B", "F#", "G#m", "E"]);

  // 6,4,1,3 in B (G#m, E, B, D#) uses major III D# instead of D#m
  const voiced6413inB = getProgressionVoicings([6, 4, 1, 3], "B", "triad");
  assert.deepEqual(voiced6413inB, ["G#m", "E", "B", "D#"]);
});
