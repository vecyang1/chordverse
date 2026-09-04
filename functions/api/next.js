/**
 * GET /api/next?progression=1,5,6
 *
 * Next-chord distribution for a progression prefix, answered from the corpus
 * n-gram model (/data/next_chord_model.json, built by scripts/build_ngram_model.py
 * from POP909 + the curated corpora). Every row carries its occurrence and song
 * counts; when the prefix has too little evidence the model backs off to a
 * shorter context and says so (`context_used`, `backoff`).
 *
 * The hand-written table below is used ONLY when the model asset cannot be
 * read, and the response is then labelled `source: "heuristic_table"` so a
 * guess is never mistaken for a measurement.
 */

const ROMAN_MAP = { 1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°" };
const NUMERAL_TO_DEGREE = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

const MODEL_PATH = "/data/next_chord_model.json";
export const MIN_SONGS_FOR_CONTEXT = 5;
const TOP_K = 5;
const DEFAULT_PREFIX = "1,5,6";
export const SOURCE_CORPUS = "corpus_ngram";
export const SOURCE_HEURISTIC = "heuristic_table";

const FUNCTION_LABELS = {
  1: "主和弦解决 (Tonic resolution)",
  2: "上主和弦 / ii 预备 (Supertonic pre-dominant)",
  3: "中音和弦 / iii 过渡 (Mediant colour)",
  4: "下属和弦 (Subdominant)",
  5: "属和弦张力 (Dominant tension)",
  6: "关系小调 / vi 假终止 (Relative minor / deceptive)",
  7: "导音和弦 (Leading-tone chord)"
};

// Mirrors src/ngram_model.py TRANSITION_NOTES — keep the two in step.
const TRANSITION_NOTES = {
  "1,5,6>4": "流行四和弦标准结尾 1-5-6-4 (Axis of Awesome)",
  "1,5,6>3": "卡农式下行 1-5-6-3 (Canon line)",
  "1,5,6,4>1": "四和弦循环回到主和弦 (Loop resolution)",
  "1,5,6,4>5": "转接属和弦再循环 (Dominant turnaround)",
  "6,4,1>5": "伤感六四一五闭环 (6-4-1-5 cadence)",
  "6,4,1,5>6": "六四一五循环回到 vi (Minor-loop restart)",
  "4,5,3>6": "王道进行核心 4-5-3-6 (Royal Road core)",
  "4,5,3,6>2": "王道进行续接 2-5-1 (Royal Road ii-V-I extension)",
  "3,6,2,5>1": "五度循环解决到主和弦 (Circle-of-fifths resolution)",
  "6,2,5>1": "6251 循环解决 (vi-ii-V-I resolution)",
  "2,5>1": "爵士 ii-V-I 解决 (Jazz ii-V-I)",
  "1,6,4>5": "50 年代进行结尾 1-6-4-5 (Doo-wop cadence)",
  "1,6>4": "50 年代进行 1-6-4 (Doo-wop motion)",
  "1,6>2": "1-6-2-5 五度圈下行 (Circle-of-fifths descent)",
  "1,5>6": "流行假终止 1-5-6 (Pop deceptive motion)",
  "1,4>5": "经典正格进行 1-4-5 (I-IV-V)"
};

// Fallback only. These numbers are NOT measurements.
const HEURISTIC_TABLE = {
  "1,5,6": [[4, 0.78], [3, 0.14], [5, 0.04], [2, 0.03], [1, 0.01]],
  "1,5,6,4": [[1, 0.82], [5, 0.10], [6, 0.05], [4, 0.03]],
  "6,4,1": [[5, 0.92], [7, 0.05], [4, 0.03]],
  "6,4,1,5": [[6, 0.85], [4, 0.10], [1, 0.05]],
  "4,5,3": [[6, 0.88], [1, 0.08], [4, 0.04]],
  "4,5,3,6": [[2, 0.76], [4, 0.15], [1, 0.09]],
  "1,6,4": [[5, 0.90], [1, 0.06], [2, 0.04]],
  "2,5": [[1, 0.85], [6, 0.10], [3, 0.05]],
  "1,4": [[5, 0.70], [1, 0.20], [6, 0.10]],
  "1,5": [[6, 0.68], [1, 0.18], [4, 0.14]],
  "1,6": [[4, 0.72], [2, 0.18], [5, 0.10]]
};
const HEURISTIC_DEFAULT = [[4, 0.50], [5, 0.35], [1, 0.15]];

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*"
};

/** "1,5,6" | "I-V-vi" | "1 5 6" -> [1,5,6]; anything unparseable is dropped. */
export function parsePrefixDegrees(raw) {
  const clean = String(raw || "").trim();
  if (!clean) return [];
  if (/^[1-7]{2,8}$/.test(clean)) return clean.split("").map(Number);
  const degrees = [];
  for (const token of clean.split(/[\s,\-\>\|/]+/).filter(Boolean)) {
    const low = token.toLowerCase();
    if (/^[1-7]$/.test(low)) degrees.push(Number(low));
    else if (NUMERAL_TO_DEGREE[low.replace(/[^iv]/g, "")] && /^[ivIV]+/.test(token)) {
      degrees.push(NUMERAL_TO_DEGREE[low.replace(/[^iv]/g, "")]);
    }
  }
  return degrees;
}

export function describeTransition(context, degree) {
  return TRANSITION_NOTES[`${context}>${degree}`] || FUNCTION_LABELS[degree] || `Degree ${degree}`;
}

/** Longest suffix (≤ maxOrder) of `degrees` with enough song evidence. */
export function resolveContext(contexts, degrees, maxOrder = 4) {
  for (let order = Math.min(maxOrder, degrees.length); order >= 1; order--) {
    const ctx = degrees.slice(-order).join(",");
    const entry = contexts[ctx];
    if (entry && Number(entry.songs || 0) >= MIN_SONGS_FOR_CONTEXT) return ctx;
  }
  return null;
}

function row(degree, probability, extra = {}) {
  return {
    chord_degree: degree,
    degree,
    chord: String(degree),
    roman: ROMAN_MAP[degree] || String(degree),
    probability,
    ...extra
  };
}

export function predictFromModel(model, degrees) {
  const contexts = model && model.contexts;
  if (!contexts || degrees.length === 0) return null;
  const ctx = resolveContext(contexts, degrees, Number(model.max_order || 4));
  if (!ctx) return null;
  const entry = contexts[ctx];
  const totalOcc = Number(entry.occ || 0) || 1;
  const ranked = Object.entries(entry.next || {})
    .filter(([deg]) => /^[1-7]$/.test(deg))
    .map(([deg, info]) => [Number(deg), Number(info.occ || 0), Number(info.songs || 0)])
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, TOP_K);
  const rows = ranked.map(([degree, occ, songs]) =>
    row(degree, Math.round((occ / totalOcc) * 10000) / 10000, {
      occurrences: occ,
      song_count: songs,
      description: describeTransition(ctx, degree)
    })
  );
  const prefix = degrees.join(",");
  return {
    prefix_progression: prefix,
    context_used: ctx,
    backoff: ctx !== prefix,
    source: SOURCE_CORPUS,
    model_version: model.version ?? null,
    sample_songs: Number(entry.songs || 0),
    sample_occurrences: totalOcc,
    corpus_songs: Number(model.total_songs || 0) || null,
    next_chord_probabilities: rows,
    next_chords: rows
  };
}

export function predictHeuristic(degrees, note) {
  const prefix = degrees.join(",");
  const table = HEURISTIC_TABLE[prefix] || HEURISTIC_DEFAULT;
  const rows = table.map(([degree, probability]) =>
    row(degree, probability, { description: describeTransition(prefix, degree) })
  );
  return {
    prefix_progression: prefix,
    context_used: prefix,
    backoff: false,
    source: SOURCE_HEURISTIC,
    note: note || "Corpus model unavailable; these are hand-written estimates, not measurements.",
    next_chord_probabilities: rows,
    next_chords: rows
  };
}

async function loadModel(origin) {
  const resp = await fetch(`${origin}${MODEL_PATH}`);
  if (!resp.ok) throw new Error(`model asset HTTP ${resp.status}`);
  return resp.json();
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const raw = url.searchParams.get("progression") || DEFAULT_PREFIX;
  const degrees = parsePrefixDegrees(raw);

  if (degrees.length === 0) {
    return new Response(JSON.stringify({ error: "progression must contain scale degrees 1-7 (e.g. 1,5,6 or I-V-vi)" }), {
      status: 400,
      headers: JSON_HEADERS
    });
  }

  let payload = null;
  let note = null;
  try {
    const model = await loadModel(url.origin);
    payload = predictFromModel(model, degrees);
    if (!payload) note = "No corpus context with enough evidence for this prefix; hand-written estimates shown.";
  } catch (err) {
    note = `Corpus model unavailable (${err.message}); hand-written estimates shown.`;
  }
  const isMeasured = payload !== null;
  if (!isMeasured) payload = predictHeuristic(degrees, note);

  return new Response(JSON.stringify(payload), {
    headers: {
      ...JSON_HEADERS,
      "Cache-Control": isMeasured ? "public, max-age=86400" : "no-store"
    }
  });
}
