import {
  encodeZ,
  decodeDataModel,
  decodeSheetPayload,
  getGuitarFingering
} from "./_yopu_decoder.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*"
};

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

const INTERVAL_TO_DEGREE = {
  0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7
};

const DEGREE_TO_ROMAN = {
  1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°"
};

function chordToDegree(chordStr, keyCenter = "C") {
  const clean = chordStr.trim().replace(/^\[|\]$/g, "").split('/')[0];
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

const TITLE_STRIP_REGEX = /\s*(?:吉他弹唱谱|尤克里里弹唱谱|吉他和弦谱|尤克里里和弦谱|吉他谱|和弦谱|尤克里里谱|钢琴谱|弹唱谱|简谱|吉他|尤克里里|钢琴)\s*$/i;

function extractScoreId(inputStr) {
  const str = String(inputStr || "").trim();
  const urlMatch = str.match(/yopu\.co\/(?:view|sheet)\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch) return urlMatch[1];
  const clean = str.replace(/^https?:\/\/[^\/]+\//, "").trim().split(/[?#]/)[0];
  const idMatch = clean.match(/[a-zA-Z0-9_-]{6,32}/);
  return idMatch ? idMatch[0] : clean;
}

function cleanTitleAndArtist(rawTitle) {
  const cleaned = rawTitle.replace(/_.*$/, "").replace(TITLE_STRIP_REGEX, "").trim();
  const parts = cleaned.split(/\s*[-—]\s*/);
  let title = "未知曲目";
  let artist = "未知歌手";
  if (parts.length >= 2) {
    title = parts[0].trim();
    artist = parts[1].replace(TITLE_STRIP_REGEX, "").trim();
  } else {
    title = cleaned;
  }
  return { title, artist };
}

async function handleImport(urlOrId, context) {
  const cleanInput = String(urlOrId ?? "").trim();
  if (!cleanInput) {
    return new Response(JSON.stringify({ error: "请输入曲谱链接、ID 或歌名", code: 400 }), {
      status: 400,
      headers: JSON_HEADERS
    });
  }

  const sheetId = extractScoreId(cleanInput);
  if (!sheetId || !sheetId.trim()) {
    return new Response(JSON.stringify({ error: "请输入有效的曲谱链接或 ID", code: 400 }), {
      status: 400,
      headers: JSON_HEADERS
    });
  }

  const targetUrl = `https://yopu.co/view/${sheetId}`;

  let structuredSheet = null;
  let html = "";
  let fetchFailed = false;

  // 1. Fetch view page (to extract data-model session token and HTML metadata)
  try {
    const viewResp = await fetch(targetUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (viewResp.ok) {
      html = await viewResp.text();
      const cookieHeader = viewResp.headers.get("set-cookie") || "";
      const cookieVal = cookieHeader ? cookieHeader.split(";")[0] : "";

      // Look for data-model token
      const modelMatch = html.match(/data-model="([^"]+)"/);
      if (modelMatch) {
        try {
          const modelData = decodeDataModel(modelMatch[1]);
          const st = modelData.st;
          if (st) {
            const apiPath = `/api/sheet?code=${sheetId}&screen=1&t=${st}`;
            const zPath = encodeZ(apiPath);
            const zUrl = `https://yopu.co${zPath}`;

            const headers = {
              "User-Agent": USER_AGENT,
              "Referer": targetUrl,
              "Accept": "*/*"
            };
            if (cookieVal) headers["Cookie"] = cookieVal;

            const zResp = await fetch(zUrl, { headers });
            if (zResp.ok) {
              const buf = await zResp.arrayBuffer();
              structuredSheet = decodeSheetPayload(buf);
            }
          }
        } catch (decErr) {
          // Fall through to HTML/corpus fallback
        }
      }
    } else {
      fetchFailed = true;
    }
  } catch (err) {
    fetchFailed = true;
  }

  // If score was not found (404) or fetch failed completely
  if (fetchFailed || (!structuredSheet && !html)) {
    return new Response(JSON.stringify({
      error: "曲谱不存在或无法获取",
      code: 404
    }), {
      status: 404,
      headers: JSON_HEADERS
    });
  }

  const titleMatch = html ? html.match(/<title>([^<]+)<\/title>/i) : null;
  const rawTitle = titleMatch ? titleMatch[1].trim() : "";
  if (!structuredSheet && (!rawTitle || /404|页面未找到|Not Found/i.test(rawTitle))) {
    return new Response(JSON.stringify({
      error: "曲谱不存在或无法获取",
      code: 404
    }), {
      status: 404,
      headers: JSON_HEADERS
    });
  }

  let title = "未知曲目";
  let artist = "未知歌手";
  let key = "C";
  let capo = 0;
  let chords = [];

  // 2. Extract from structured sheet data if available
  if (structuredSheet) {
    if (structuredSheet.title) title = structuredSheet.title;
    if (structuredSheet.artist) artist = structuredSheet.artist;
    if (structuredSheet.key) key = structuredSheet.key.replace("1=", "").trim();
    if (structuredSheet.capo !== undefined) capo = Number(structuredSheet.capo) || 0;
    if (Array.isArray(structuredSheet.chords) && structuredSheet.chords.length > 0) {
      chords = structuredSheet.chords
        .map(c => String(c).replace(/^\[|\]$/g, "").trim())
        .filter(Boolean);
    }
  }

  // 3. Fallback: Parse from HTML if structured chords were not found
  if (chords.length === 0 && html) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const parsed = cleanTitleAndArtist(titleMatch[1]);
      title = parsed.title;
      artist = parsed.artist;
    }

    const keyMatch = html.match(/原调[：:\s]*([A-G][#b]?)/i) || html.match(/Key[：:\s]*([A-G][#b]?)/i);
    if (keyMatch) key = keyMatch[1];
    const capoMatch = html.match(/变调夹[：:\s]*(\d+)/i) || html.match(/Capo[：:\s]*(\d+)/i);
    if (capoMatch) capo = parseInt(capoMatch[1], 10);

    const chordRegex = /\b([A-G][#b]?(?:m|maj7|7|sus4|add9|dim|aug)?(?:\/[A-G][#b]?)?)\b/g;
    let m;
    while ((m = chordRegex.exec(html)) !== null) {
      const c = m[1];
      if (!["A", "I"].includes(c) || chords.length > 0) {
        if (chords.length === 0 || chords[chords.length - 1] !== c) {
          chords.push(c);
        }
      }
    }
  }

  if (chords.length < 2) {
    if (title === "未知曲目" && !structuredSheet) {
      return new Response(JSON.stringify({
        error: "曲谱不存在或无法获取",
        code: 404
      }), {
        status: 404,
        headers: JSON_HEADERS
      });
    }

    const artM = html.match(/<article>(.*?)<\/article>/is);
    const lyricsSnippet = artM ? artM[1].slice(0, 100).trim() : "";
    return new Response(JSON.stringify({
      id: sheetId,
      title: title,
      artist: artist,
      key: `${key} major`,
      original_key: key,
      capo: capo,
      no_inline_chords: true,
      message: `已解析曲目信息《${title} - ${artist}》，但该曲谱未内嵌公开文本和弦。请在【自选和弦谱解析器】中粘贴其实际和弦走向进行分析！`,
      source_url: targetUrl,
      lyrics_sample: lyricsSnippet
    }), {
      headers: JSON_HEADERS
    });
  }

  const degObjList = chords.map(c => chordToDegree(c, key));
  const degrees = degObjList.map(o => o.deg);
  const romans = degObjList.map(o => o.rom);

  // Detect 4-chord loop
  let loopDegs = degrees.slice(0, 4);
  let loopRomans = romans.slice(0, 4);
  let loopChords = chords.slice(0, 4);

  if (degrees.length >= 4) {
    const counts = {};
    const firstIndex = {};
    for (let i = 0; i <= degrees.length - 4; i++) {
      const k = degrees.slice(i, i + 4).join(",");
      counts[k] = (counts[k] || 0) + 1;
      if (firstIndex[k] === undefined) firstIndex[k] = i;
    }
    let topK = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    if (topK && new Set(topK.split(",")).size >= 3) {
      loopDegs = topK.split(",").map(Number);
      const idx = firstIndex[topK] ?? 0;
      loopRomans = romans.slice(idx, idx + 4);
      loopChords = chords.slice(idx, idx + 4);
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

  // Guitar fingerings for all extracted chords
  const guitarFingerings = {};
  for (const c of chords) {
    const fingering = getGuitarFingering(c);
    if (fingering) guitarFingerings[c] = fingering;
  }

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
    extracted_chords: chords.slice(0, 32),
    guitar_fingerings: guitarFingerings,
    source_url: targetUrl
  }), {
    headers: JSON_HEADERS
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const urlOrId = body.score ?? body.url ?? body.id ?? "";
    return await handleImport(urlOrId, context);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, code: 500 }), {
      status: 500,
      headers: JSON_HEADERS
    });
  }
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const urlOrId = url.searchParams.get("url") ?? url.searchParams.get("id") ?? url.searchParams.get("score") ?? url.searchParams.get("q") ?? "";
    return await handleImport(urlOrId, context);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, code: 500 }), {
      status: 500,
      headers: JSON_HEADERS
    });
  }
}
