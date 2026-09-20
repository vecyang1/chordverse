/**
 * Pure JavaScript decoder bridge for Yopu.co data payloads.
 *
 * Provides:
 * - `decodeDataModel(encodedStr)`: Decodes the URL-encoded and obfuscated `data-model` from Yopu view HTML.
 * - `decodeSheetPayload(buf)`: Inverse permutation V(e) + q7 Brotli custom dictionary decompression.
 * - `decodeSearchResponse(bytes)`: Decodes XOR 157 search response.
 * - `encodeZ(path)`: Obfuscates internal paths to /z/<token>.
 * - `getGuitarFingering(chordName)`: Returns fret positions and fingerings for standard guitar chords.
 */
import "./_ar_decompressor.js";

const L = "ə\vĀ";
const R = L.charCodeAt(0);
const G = L.charCodeAt(1);
const U = L.charCodeAt(2) * L.charCodeAt(2);

function Q(t, n) {
  const e = t % n;
  return e < 0 ? e + n : e;
}

const H = (function (t, n) {
  let [e, i] = [n, Q(t, n)],
    [o, r] = [0, 1];
  for (; 0 !== i; ) {
    const t = (e / i) | 0;
    [e, i] = [i, e - t * i];
    [o, r] = [r, o - t * r];
  }
  return Q(o, n);
})(R, U);

function Y(t, n, e) {
  let i = 1,
    o = (t = Q(t, e));
  for (; n > 0; ) {
    const t = Q(n, 2);
    (n = (n / 2) | 0), 1 === t && (i = Q(i * o, e)), (o = Q(o * o, e));
  }
  return i;
}

function V(t = 1) {
  let n = Q(t, U);
  return {
    S: () => n / U,
    k: () => {
      n = Q(R * n + G, U);
    },
    T: () => {
      n = Q(H * (n - G), U);
    },
    X: (t) => {
      const e = (((Y(R, t, R * U - U) - 1) / (R - 1)) * G) | 0;
      const i = Y(R, t, U) * n;
      n = Q(e + i, U);
    }
  };
}

function W(t, n, e) {
  const i = (e * (n + 1)) | 0;
  [t[n], t[i]] = [t[i], t[n]];
}

export function permuteV(t) {
  const n = t.length,
    e = V(n);
  e.X(n);
  for (let i = 1; i < n; i++) e.T(), W(t, i, e.S());
}

export function decodeDataModel(encoded) {
  const str = decodeURIComponent(encoded);
  const n = new Uint8Array(str.length);
  for (let e = 0; e < str.length; e++) n[e] = str.charCodeAt(e) ^ 171;
  permuteV(n);
  return JSON.parse(new TextDecoder("utf-8").decode(n));
}

export function decodeSheetPayload(buf) {
  const arr = new Uint8Array(buf);
  permuteV(arr);
  const q7Fn = globalThis.q7 || (typeof self !== "undefined" ? self.q7 : null);
  if (!q7Fn) throw new Error("Decompressor q7 not initialized");
  const decompressed = q7Fn(arr);
  return JSON.parse(new TextDecoder("utf-8").decode(decompressed));
}

export function decodeSearchResponse(bytes) {
  const decoded = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) decoded[i] = bytes[i] ^ 157;
  return JSON.parse(new TextDecoder("utf-8").decode(decoded));
}

const Z_PREFIXES = ["/api/", "/i/", "/auth/", "/promotion/", "/ping/", "/ping-user/"];
const Z_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function encodeZ(path) {
  if (!Z_PREFIXES.some((prefix) => path.startsWith(prefix))) return path;
  const raw = new TextEncoder().encode(path);
  for (let i = 0; i < raw.length; i++) raw[i] ^= 92;
  const length = raw.length;
  let seed = length % 65536;
  for (let r = length - 1; r > 0; r--) {
    seed = (601 * seed + 11) % 65536;
    const j = Math.floor((seed / 65536) * (r + 1));
    const tmp = raw[r];
    raw[r] = raw[j];
    raw[j] = tmp;
  }
  let out = "";
  let i = 0;
  while (i < length) {
    const hasNext = i + 1 < length;
    const hasThird = i + 2 < length;
    const o = raw[i];
    const a = hasNext ? raw[i + 1] : 0;
    const s = hasThird ? raw[i + 2] : 0;
    out += Z_B64[o >> 2];
    out += Z_B64[((3 & o) << 4) | (a >> 4)];
    if (!hasNext) break;
    out += Z_B64[((15 & a) << 2) | (s >> 6)];
    if (!hasThird) break;
    out += Z_B64[63 & s];
    i += 3;
  }
  return "/z/" + out;
}

/** Standard guitar chord shapes [str6, str5, str4, str3, str2, str1] (-1 is muted/x, 0 is open) */
export const GUITAR_CHORD_LIBRARY = {
  "C": { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1 },
  "Cmaj7": { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], baseFret: 1 },
  "C7": { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], baseFret: 1 },
  "Cadd9": { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0], baseFret: 1 },
  "Cm": { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], baseFret: 3, barres: [3] },
  "D": { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1 },
  "D/F#": { frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3], baseFret: 1 },
  "Dm": { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], baseFret: 1 },
  "Dm7": { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], baseFret: 1, barres: [1] },
  "D7": { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], baseFret: 1 },
  "Dsus4": { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3], baseFret: 1 },
  "E": { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1 },
  "Em": { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], baseFret: 1 },
  "Em7": { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 2, 3, 0, 4, 0], baseFret: 1 },
  "E7": { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  "F": { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1, barres: [1] },
  "Fmaj7": { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], baseFret: 1 },
  "Fm": { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1, barres: [1] },
  "F#m": { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], baseFret: 2, barres: [2] },
  "G": { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1 },
  "G/B": { frets: [-1, 2, 0, 0, 3, 3], fingers: [0, 1, 0, 0, 3, 4], baseFret: 1 },
  "G/D": { frets: [-1, -1, 0, 0, 0, 3], fingers: [0, 0, 0, 0, 0, 3], baseFret: 1 },
  "G7": { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  "Gm": { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3, barres: [3] },
  "A": { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1 },
  "Am": { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], baseFret: 1 },
  "Am7": { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], baseFret: 1 },
  "A7": { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], baseFret: 1 },
  "B": { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barres: [2] },
  "Bm": { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 2, barres: [2] },
  "Bm7": { frets: [-1, 2, 4, 2, 3, 2], fingers: [0, 1, 3, 1, 2, 1], baseFret: 2, barres: [2] },
  "B7": { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], baseFret: 1 },
  "Bb": { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 1, barres: [1] }
};

export function getGuitarFingering(chordName) {
  if (!chordName) return null;
  const clean = chordName.trim().replace(/^\[|\]$/g, "");
  if (GUITAR_CHORD_LIBRARY[clean]) return GUITAR_CHORD_LIBRARY[clean];
  // Fallback to base chord root
  const root = clean.split("/")[0];
  if (GUITAR_CHORD_LIBRARY[root]) return GUITAR_CHORD_LIBRARY[root];
  return null;
}
