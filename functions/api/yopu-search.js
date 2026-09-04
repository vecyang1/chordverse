/**
 * GET /api/yopu-search?q=<keyword>&page=<n>&instrument=<guitar|piano|ukulele>
 *
 * Yopu.co (有谱么) lead-sheet keyword search, served from the Cloudflare edge.
 *
 * Yopu's gateway does not answer /api/... paths directly (plain requests get an
 * empty HTTP 404). The working protocol, mirrored from yopu-cli (yopu/codec.py):
 *   1. GET https://yopu.co/explore to obtain the `c=` session cookie.
 *   2. Obfuscate the internal path into /z/<token>: UTF-8 bytes XOR 92, a
 *      Fisher-Yates shuffle seeded with the byte length, then a custom
 *      URL-safe base64 alphabet.
 *   3. GET /z/<token> with that cookie; the body is JSON XOR 157.
 *
 * If Yopu is unreachable or blocks this edge IP, results fall back to the
 * corpora bundled with this deployment and are tagged source="local_corpus",
 * so a reader can always tell a live answer from a substitute.
 */

const Z_J = 601;
const Z_W = 11;
const Z_K = 65536;
const Z_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const Z_PREFIXES = ["/api/", "/i/", "/auth/", "/promotion/", "/ping/", "/ping-user/"];
const PATH_XOR = 92;
const BODY_XOR = 157;

const YOPU_ORIGIN = "https://yopu.co";
const YOPU_INIT_URL = `${YOPU_ORIGIN}/explore`;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const UPSTREAM_TIMEOUT_MS = 12000;
// One extra attempt for transient faults (timeout, reset, 5xx). An IP block is
// not transient and is never retried.
const TRANSIENT_RETRIES = 1;

export const SOURCE_LIVE = "yopu_live";
export const SOURCE_LOCAL = "local_corpus";
const LOCAL_CORPUS_FILES = [
  { path: "/data/chinese_modern_corpus.json", corpus: "chinese_modern" },
  { path: "/data/chinese_corpus.json", corpus: "chinese_curated" }
];
const FALLBACK_NOTE = "有谱么当前不可达，以下为本站内置语料库的匹配结果";
const IP_BLOCK_MESSAGE = "Yopu.co blocked this edge IP (empty HTTP 404)";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*"
};

function zMod(t, n) {
  const r = t % n;
  return r < 0 ? r + n : r;
}

/** Port of yopu-cli `encode_z`: internal path -> "/z/<token>". */
export function encodeZ(path) {
  if (!Z_PREFIXES.some((prefix) => path.startsWith(prefix))) return path;

  const raw = new TextEncoder().encode(path);
  for (let i = 0; i < raw.length; i++) raw[i] ^= PATH_XOR;

  const length = raw.length;
  let seed = zMod(length, Z_K);
  for (let r = length - 1; r > 0; r--) {
    seed = zMod(Z_J * seed + Z_W, Z_K);
    const j = Math.floor((seed / Z_K) * (r + 1));
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

/** Port of yopu-cli `decode_search_response`: XOR 157 body -> object. */
export function decodeSearchResponse(bytes) {
  const decoded = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) decoded[i] = bytes[i] ^ BODY_XOR;
  return JSON.parse(new TextDecoder("utf-8").decode(decoded));
}

function ownerName(owner) {
  if (owner && typeof owner === "object") return owner.displayName || owner.name || "";
  return owner ? String(owner) : "";
}

/** Flatten Yopu's {results:[{entryType:"song", sheets:[...]}]} into sheet rows. */
export function normalizeYopuResults(data) {
  const rows = [];
  for (const item of data.results || []) {
    if (item.entryType === "song" && Array.isArray(item.sheets)) {
      for (const sheet of item.sheets) {
        if (!sheet.id) continue;
        rows.push({
          id: sheet.id,
          title: item.title || "",
          artist: item.artist || "",
          key: sheet.key || "",
          capo: sheet.capo ?? 0,
          author: ownerName(sheet.owner),
          verified: Boolean(sheet.verified),
          views: sheet.guitarUniqViews || sheet.uniqViews || 0,
          rating: Math.round((sheet.rating || 0) * 10) / 10,
          tags: sheet.tags || [],
          url: `${YOPU_ORIGIN}/view/${sheet.id}`,
          source: SOURCE_LIVE
        });
      }
      continue;
    }
    const sheetId = item._id || item.id;
    if (!sheetId) continue;
    rows.push({
      id: sheetId,
      title: item.title || "",
      artist: item.artist || "",
      key: item.key || "",
      capo: item.capo ?? 0,
      author: ownerName(item.owner || item.author),
      verified: Boolean(item.verified),
      views: item.uniqViews || item.views || 0,
      rating: Math.round((item.rating || 0) * 10) / 10,
      tags: item.tags || [],
      url: `${YOPU_ORIGIN}/view/${sheetId}`,
      source: SOURCE_LIVE
    });
  }
  return rows;
}

function sessionCookieHeader(resp) {
  const setCookies =
    typeof resp.headers.getSetCookie === "function"
      ? resp.headers.getSetCookie()
      : [resp.headers.get("set-cookie")].filter(Boolean);
  return setCookies
    .map((line) => line.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function upstreamHeaders(cookie) {
  const headers = {
    "User-Agent": USER_AGENT,
    Referer: YOPU_INIT_URL,
    Accept: "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
  };
  if (cookie) headers.Cookie = cookie;
  return headers;
}

function timeoutSignal() {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    : undefined;
}

/** Live search; throws with a specific cause when Yopu cannot be used. */
export async function fetchYopuLive(q, page, instrument) {
  const init = await fetch(YOPU_INIT_URL, { headers: upstreamHeaders(""), signal: timeoutSignal() });
  const cookie = sessionCookieHeader(init);

  const params = new URLSearchParams({ q, page: String(page), instrument });
  const zPath = encodeZ(`/api/search/sheets?${params.toString()}`);
  const resp = await fetch(`${YOPU_ORIGIN}${zPath}`, {
    headers: upstreamHeaders(cookie),
    signal: timeoutSignal()
  });

  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (resp.status === 404 && bytes.length === 0) throw new Error(IP_BLOCK_MESSAGE);
  if (!resp.ok) throw new Error(`Yopu returned HTTP ${resp.status}`);

  const data = decodeSearchResponse(bytes);
  const results = normalizeYopuResults(data);
  return { results, total: data.totalResultNum ?? results.length };
}

function localRow(item, corpus) {
  const sourceUrl = item.source_url || null;
  return {
    id: item.id || "",
    title: item.title || "",
    artist: item.artist || "",
    key: item.key || item.original_key || "",
    capo: item.capo ?? 0,
    author: item.artist || "",
    verified: false,
    progression: item.primary_progression || item.progression || "",
    roman: item.primary_roman || item.roman || "",
    chords: item.primary_chords || item.chords || [],
    url: sourceUrl,
    source_url: sourceUrl,
    corpus,
    source: SOURCE_LOCAL
  };
}

/** Every whitespace-separated token must appear in "title artist" (case-insensitive). */
export async function searchLocalCorpus(origin, q) {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const matches = [];
  for (const { path, corpus } of LOCAL_CORPUS_FILES) {
    let items = [];
    try {
      const resp = await fetch(`${origin}${path}`);
      if (resp.ok) items = await resp.json();
    } catch (_err) {
      items = [];
    }
    for (const item of Array.isArray(items) ? items : []) {
      const haystack = `${item.title || ""} ${item.artist || ""}`.toLowerCase();
      if (tokens.every((token) => haystack.includes(token))) matches.push(localRow(item, corpus));
    }
  }
  return matches;
}

function jsonResponse(body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { headers: { ...JSON_HEADERS, ...extraHeaders } });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const page = Number.parseInt(url.searchParams.get("page") || "0", 10) || 0;
  const instrument = url.searchParams.get("instrument") || "guitar";
  const base = { query: q, page, instrument };

  if (!q) {
    return jsonResponse({ ...base, source: SOURCE_LIVE, total: 0, total_count: 0, results: [] });
  }

  let upstreamError;
  for (let attempt = 0; attempt <= TRANSIENT_RETRIES; attempt++) {
    try {
      const { results, total } = await fetchYopuLive(q, page, instrument);
      return jsonResponse(
        { ...base, source: SOURCE_LIVE, total, total_count: total, results },
        { "Cache-Control": "public, max-age=1800" }
      );
    } catch (err) {
      upstreamError = err && err.message ? err.message : String(err);
      if (upstreamError === IP_BLOCK_MESSAGE) break;
    }
  }

  const fallback = await searchLocalCorpus(url.origin, q);
  const body = {
    ...base,
    source: SOURCE_LOCAL,
    total: fallback.length,
    total_count: fallback.length,
    results: fallback,
    note: FALLBACK_NOTE,
    upstream_error: upstreamError
  };
  if (fallback.length === 0) body.error = `有谱么搜索失败 (${upstreamError})，且本地语料库无匹配`;
  return jsonResponse(body, { "Cache-Control": "no-store" });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
