/**
 * ChordVerse Web Audio API Polyphonic Synthesizer.
 * Real-time zero-dependency sound generator for piano/electric piano chord playback.
 */

class ChordAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.isPlayingLoop = false;
    this.loopTimer = null;
  }

  _initContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Pitch calculation: note name + octave to frequency (Hz)
  noteToFreq(note, octave = 4) {
    const noteMap = {
      "C": 0, "C#": 1, "Db": 1,
      "D": 2, "D#": 3, "Eb": 3,
      "E": 4, "F": 5, "F#": 6,
      "Gb": 6, "G": 7, "G#": 8,
      "Ab": 8, "A": 9, "A#": 10,
      "Bb": 10, "B": 11
    };
    const semitones = noteMap[note] !== undefined ? noteMap[note] : 0;
    // A4 = 440Hz, C4 is 9 semitones below A4 (midi 60)
    const midi = (octave + 1) * 12 + semitones;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Generate triad/7th chord frequencies for a given chord name
  getChordFrequencies(chordName) {
    const m = chordName.match(/^([A-G][#b]?)(.*)$/);
    if (!m) return [261.63, 329.63, 392.0]; // Default C major
    const root = m[1];
    const quality = m[2].toLowerCase();

    const rootPitchMap = {
      "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
      "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
      "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
    };
    const rootPitch = rootPitchMap[root] || 0;

    let intervals = [0, 4, 7]; // Major triad by default
    if (quality.includes("m") && !quality.includes("maj")) {
      intervals = [0, 3, 7]; // Minor triad
    } else if (quality.includes("dim") || quality.includes("°")) {
      intervals = [0, 3, 6]; // Diminished
    } else if (quality.includes("aug") || quality.includes("+")) {
      intervals = [0, 4, 8]; // Augmented
    } else if (quality.includes("sus4")) {
      intervals = [0, 5, 7]; // Sus4
    }

    if (quality.includes("maj7")) {
      intervals.push(11);
    } else if (quality.includes("7")) {
      intervals.push(10);
    } else if (quality.includes("add9") || quality.includes("9")) {
      intervals.push(14);
    }

    // Root note base octave (Octave 3 for rich bass warmth, notes in Octave 4)
    const baseMidi = 48 + rootPitch; // C3
    return intervals.map(inter => {
      const midi = baseMidi + inter;
      return 440 * Math.pow(2, (midi - 69) / 12);
    });
  }

  // Play a single chord with warm polyphonic ADSR envelope
  playChord(chordName, duration = 1.2) {
    this._initContext();
    const freqs = this.getChordFrequencies(chordName);
    const now = this.ctx.currentTime;

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Warm triangle/sine blend for piano/rhodes feel
      osc.type = idx === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now);

      // Low-pass filter to soften high frequencies
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + duration);

      // ADSR Gain Envelope
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18 / freqs.length, now + 0.04); // Attack
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Decay & Release

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Play a sequence of chords in loop (e.g. C -> G -> Am -> F)
  playProgressionLoop(chordsList, bpm = 110, onStepCallback = null) {
    this.stopLoop();
    if (!chordsList || chordsList.length === 0) return;

    this.isPlayingLoop = true;
    const stepDuration = (60 / bpm) * 2; // 2 beats per chord
    let currentIdx = 0;

    const playNext = () => {
      if (!this.isPlayingLoop) return;
      const chord = chordsList[currentIdx];
      this.playChord(chord, stepDuration * 0.95);
      if (onStepCallback) onStepCallback(currentIdx, chord);

      currentIdx = (currentIdx + 1) % chordsList.length;
      this.loopTimer = setTimeout(playNext, stepDuration * 1000);
    };

    playNext();
  }

  stopLoop() {
    this.isPlayingLoop = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }
}

window.chordSynth = new ChordAudioSynthesizer();
