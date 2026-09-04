// Escape untrusted text (upstream titles, error strings) before HTML insertion.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const inputProg = document.getElementById("input-progression");
  const btnSearch = document.getElementById("btn-search");
  const btnClear = document.getElementById("btn-clear");
  const btnBackspace = document.getElementById("btn-backspace");
  const btnPlayLoop = document.getElementById("btn-play-loop");
  const playBtnText = document.getElementById("play-btn-text");
  const playKeySelect = document.getElementById("play-key-select");
  const activeChipsContainer = document.getElementById("prog-display-box") || document.getElementById("active-chips");
  const chordBtns = document.querySelectorAll(".chord-btn[data-degree]");
  const presetChips = document.querySelectorAll(".chip");
  const filterLang = document.getElementById("select-lang") || document.getElementById("filter-lang");
  const filterArtist = document.getElementById("input-artist") || document.getElementById("filter-artist");
  const songsTbody = document.getElementById("songs-tbody");
  const totalCountEl = document.getElementById("total-songs-count");
  const currentRoman = document.getElementById("current-roman");
  const currentDeg = document.getElementById("current-deg");
  const progTitle = document.getElementById("progression-name-title");
  const refKeysBox = document.getElementById("ref-keys-box");
  const probContainer = document.getElementById("prob-container");
  const btnExportCsv = document.getElementById("btn-export-csv");
  const btnExportMd = document.getElementById("btn-export-md");
  const btnShareLink = document.getElementById("btn-share-link");
  const shareBtnText = document.getElementById("share-btn-text");
  const filterKey = document.getElementById("select-key");
  const probMeta = document.getElementById("prob-meta");
  const resultsNote = document.getElementById("results-note");
  const leaderboardChips = document.getElementById("leaderboard-chips");
  const leaderboardMeta = document.getElementById("leaderboard-meta");

  // Custom Analyzer Elements
  const customChordsInput = document.getElementById("custom-chords-input");
  const customKeySelect = document.getElementById("custom-key-select");
  const btnCustomAnalyze = document.getElementById("btn-custom-analyze");
  const customAnalysisResult = document.getElementById("custom-analysis-result");

  // State
  let activeDegrees = [1, 5, 6, 4];
  let currentSearchResults = null;
  let isLoopPlaying = false;

  // Diatonic scale mappings for C Major / standard major
  const romanMap = {
    1: "I",
    2: "ii",
    3: "iii",
    4: "IV",
    5: "V",
    6: "vi",
    7: "vii°"
  };

  const keyScaleChords = {
    "C":  { 1: "C", 2: "Dm", 3: "Em", 4: "F", 5: "G", 6: "Am", 7: "Bdim" },
    "G":  { 1: "G", 2: "Am", 3: "Bm", 4: "C", 5: "D", 6: "Em", 7: "F#dim" },
    "D":  { 1: "D", 2: "Em", 3: "F#m", 4: "G", 5: "A", 6: "Bm", 7: "C#dim" },
    "A":  { 1: "A", 2: "Bm", 3: "C#m", 4: "D", 5: "E", 6: "F#m", 7: "G#dim" },
    "E":  { 1: "E", 2: "F#m", 3: "G#m", 4: "A", 5: "B", 6: "C#m", 7: "D#dim" },
    "F":  { 1: "F", 2: "Gm", 3: "Am", 4: "Bb", 5: "C", 6: "Dm", 7: "Edim" },
    "Bb": { 1: "Bb", 2: "Cm", 3: "Dm", 4: "Eb", 5: "F", 6: "Gm", 7: "Adim" },
    "Eb": { 1: "Eb", 2: "Fm", 3: "Gm", 4: "Ab", 5: "Bb", 6: "Cm", 7: "Ddim" },
    "Ab": { 1: "Ab", 2: "Bbm", 3: "Cm", 4: "Db", 5: "Eb", 6: "Fm", 7: "Gdim" },
    "Db": { 1: "Db", 2: "Ebm", 3: "Fm", 4: "Gb", 5: "Ab", 6: "Bbm", 7: "Cdim" }
  };

  const namedProgressionsTaxonomy = {
    "1,5,6,4": "Pop-Punk / 4-Chord Progression (Axis of Awesome / 流行四和弦)",
    "6,4,1,5": "Emotional Minor 4-Chord / Sensitive Female Chord Progression (伤感六四一五)",
    "4,5,3,6,2,5,1": "Royal Road / 王道进行 (J-Pop / ACG / 经典华语副歌神级进行)",
    "4,5,3,6": "Royal Road 4-Chord Variant (小王道进行)",
    "1,5,6,3,4,1,2,5": "Pachelbel's Canon in D Progression (经典卡农进行)",
    "1,5,6,3,4,1,4,5": "Pachelbel's Canon Variant (卡农变体)",
    "1,6,4,5": "50s Doo-Wop Progression (经典50年代进行 / 倒卡农)",
    "2,5,1": "Jazz ii-V-I Standard (爵士标准进行)",
    "6,5,4,3": "Andalusian Cadence / 弗拉门戈下行",
    "1,4,5,1": "Classic Tonic-Subdominant-Dominant Cadence (经典正格终止进行)",
    "6,2,5,1": "vi-ii-V-I Circle Loop (华语抒情 6251 循环 / POP909 最常见循环)",
    "3,6,2,5": "iii-vi-ii-V Circle-of-Fifths Turnaround (3625 五度循环进行)"
  };

  function degreeToChord(degree, key = "C") {
    const scale = keyScaleChords[key] || keyScaleChords["C"];
    return scale[degree] || "C";
  }

  function getActiveChordsInKey(key) {
    return activeDegrees.map(deg => degreeToChord(deg, key));
  }

  // Render Step Builder Chips
  function renderBuilderDisplay() {
    inputProg.value = activeDegrees.join(",");
    activeChipsContainer.innerHTML = "";
    if (activeDegrees.length === 0) {
      activeChipsContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 13px;">点击下方和弦按钮构建进行...</span>`;
      return;
    }

    const currentKey = playKeySelect.value || "C";

    activeDegrees.forEach((deg, idx) => {
      const chip = document.createElement("div");
      chip.className = "active-deg-chip";
      chip.dataset.index = idx;

      const roman = romanMap[deg] || deg;
      const chordName = degreeToChord(deg, currentKey);

      chip.innerHTML = `
        <span class="deg-num">${deg}</span>
        <span class="deg-roman">${roman}</span>
        <span class="deg-chord" style="font-size:10px; opacity:0.8;">(${chordName})</span>
        <span class="chip-remove">×</span>
      `;

      chip.querySelector(".chip-remove").addEventListener("click", (e) => {
        e.stopPropagation();
        activeDegrees.splice(idx, 1);
        renderBuilderDisplay();
        executeSearch();
      });

      chip.addEventListener("click", () => {
        if (window.chordSynth) {
          window.chordSynth.playChord(chordName, 0.8);
        }
      });

      activeChipsContainer.appendChild(chip);
    });
  }

  // Subsequence matching for degree arrays
  function hasProgressionMatch(songProgStr, queryProgStr) {
    if (!songProgStr || !queryProgStr) return false;
    const songDegs = songProgStr.split(",").map(s => s.trim()).filter(Boolean);
    const queryDegs = queryProgStr.split(",").map(s => s.trim()).filter(Boolean);
    if (queryDegs.length === 0) return false;
    if (queryDegs.length > songDegs.length) return false;

    for (let i = 0; i <= songDegs.length - queryDegs.length; i++) {
      let match = true;
      for (let j = 0; j < queryDegs.length; j++) {
        if (songDegs[i + j] !== queryDegs[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  function parseInputToDegrees(val) {
    val = val.trim();
    if (!val) return [];
    if (/^[1-7]{2,8}$/.test(val)) {
      return val.split("").map(Number);
    }
    const tokens = val.split(/[\s,\-\>\|/]+/).filter(Boolean);
    const degs = [];
    tokens.forEach(t => {
      const low = t.toLowerCase();
      if (/^[1-7]$/.test(low)) degs.push(Number(low));
      else if (low === "i") degs.push(1);
      else if (low === "ii") degs.push(2);
      else if (low === "iii") degs.push(3);
      else if (low === "iv") degs.push(4);
      else if (low === "v") degs.push(5);
      else if (low === "vi") degs.push(6);
      else if (low === "vii") degs.push(7);
    });
    return degs;
  }

  // Toggle Audio Progression Loop
  btnPlayLoop.addEventListener("click", () => {
    if (isLoopPlaying) {
      if (window.chordSynth) window.chordSynth.stopLoop();
      isLoopPlaying = false;
      btnPlayLoop.classList.remove("btn-playing");
      playBtnText.textContent = "试听进行 (Play)";
      document.querySelectorAll(".active-deg-chip").forEach(c => c.classList.remove("playing-highlight"));
    } else {
      if (!activeDegrees || activeDegrees.length === 0) return;
      const key = playKeySelect.value || "C";
      const chords = getActiveChordsInKey(key);
      isLoopPlaying = true;
      btnPlayLoop.classList.add("btn-playing");
      playBtnText.textContent = "停止试听 (Stop)";

      if (window.chordSynth) {
        window.chordSynth.playProgressionLoop(chords, 110, (idx, chord) => {
          document.querySelectorAll(".active-deg-chip").forEach((c, i) => {
            if (i === idx) c.classList.add("playing-highlight");
            else c.classList.remove("playing-highlight");
          });
        });
      }
    }
  });

  playKeySelect.addEventListener("change", () => {
    renderBuilderDisplay();
    if (isLoopPlaying) {
      const key = playKeySelect.value || "C";
      const chords = getActiveChordsInKey(key);
      if (window.chordSynth) {
        window.chordSynth.playProgressionLoop(chords, 110, (idx, chord) => {
          document.querySelectorAll(".active-deg-chip").forEach((c, i) => {
            if (i === idx) c.classList.add("playing-highlight");
            else c.classList.remove("playing-highlight");
          });
        });
      }
    }
  });

  // URL as state: ?q=1,5,6,4&lang=zh&artist=&key= is shareable and survives reload.
  const URL_PARAM_QUERY = "q";
  function optionExists(select, value) {
    return !!select && Array.from(select.options).some(o => o.value === value);
  }
  function readUrlState() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get(URL_PARAM_QUERY);
    if (q !== null) {
      inputProg.value = q.trim();
      activeDegrees = parseInputToDegrees(q);
    }
    const lang = params.get("lang");
    if (lang && optionExists(filterLang, lang)) filterLang.value = lang;
    const artist = params.get("artist");
    if (artist && filterArtist) filterArtist.value = artist;
    const key = params.get("key");
    if (key && optionExists(filterKey, key)) filterKey.value = key;
    return q !== null;
  }
  function writeUrlState(query, lang, artist, key) {
    const params = new URLSearchParams();
    if (query) params.set(URL_PARAM_QUERY, query);
    if (lang && lang !== "all") params.set("lang", lang);
    if (artist) params.set("artist", artist);
    if (key) params.set("key", key);
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? "?" + qs : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }
  function syncProgressionChips(query) {
    const clean = query.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "");
    presetChips.forEach(c => c.classList.toggle("active", (c.getAttribute("data-prog") || "") === (clean || "all")));
    document.querySelectorAll(".lb-chip").forEach(c => c.classList.toggle("active", c.getAttribute("data-prog") === clean));
  }

  // Client-side mirror of functions/api/search.js matching rules (used only when the edge is unreachable).
  const MIN_SEQUENCE_OCCURRENCES = 2;
  const CURATED_SOURCES = new Set(["chinese_curated", "chinese_modern", "western_hooktheory"]);
  function parseDegreeList(value) {
    return String(value || "").split(",").map(s => s.trim()).filter(s => /^[1-7]$/.test(s)).map(Number);
  }
  function countOccurrences(run, target) {
    if (target.length === 0 || run.length < target.length) return 0;
    let hits = 0;
    for (let i = 0; i <= run.length - target.length; i++) {
      let ok = true;
      for (let j = 0; j < target.length; j++) {
        if (run[i + j] !== target[j]) { ok = false; break; }
      }
      if (ok) hits++;
    }
    return hits;
  }
  function matchSongClient(song, target) {
    const loop = parseDegreeList(song.progression);
    if (loop.length >= 2 && countOccurrences(loop.concat(loop), target) > 0) {
      return { kind: "loop", occurrences: Number(song.loop_repetitions || 0) };
    }
    if (loop.length === 1 && countOccurrences(loop, target) > 0) {
      return { kind: "loop", occurrences: Number(song.loop_repetitions || 0) };
    }
    if (song.degree_sequence) {
      const hits = String(song.degree_sequence).split("x").map(parseDegreeList)
        .reduce((sum, run) => sum + countOccurrences(run, target), 0);
      if (hits >= MIN_SEQUENCE_OCCURRENCES) return { kind: "sequence", occurrences: hits };
    }
    return null;
  }
  function keyMatchesClient(song, filter) {
    const wanted = String(filter || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!wanted) return true;
    const candidates = [song.key, song.analysis_key].filter(Boolean).map(k => String(k).trim().toLowerCase().replace(/\s+/g, " "));
    if (candidates.some(k => k === wanted)) return true;
    if (!wanted.includes(" ")) return candidates.some(k => k.split(" ")[0] === wanted);
    return false;
  }
  function sortByEvidenceClient(songs) {
    const rank = s => [s.match_kind === "loop" ? 0 : 1, CURATED_SOURCES.has(s.source) ? 0 : 1, -(s.match_occurrences || 0)];
    return songs.map((song, index) => ({ song, index, r: rank(song) }))
      .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.r[2] - b.r[2] || a.index - b.index)
      .map(e => e.song);
  }

  // Execute Search against Edge API with Client-Side fallback
  async function executeSearch() {
    const query = inputProg.value.trim();
    const lang = filterLang.value || "all";
    const artist = filterArtist.value.trim();
    const key = filterKey ? filterKey.value : "";
    writeUrlState(query, lang, artist, key);
    syncProgressionChips(query);

    // Clear the previous search's identity immediately: the edge round-trip takes
    // 0.4-2 s and a stale title/count reads as the answer to the new query.
    progTitle.textContent = "检索中…";
    totalCountEl.textContent = "…";

    songsTbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="loading-spinner">正在多维检索华语真值库与 Hooktheory 数据库...</div>
        </td>
      </tr>
    `;

    try {
      const params = new URLSearchParams({
        progression: query,
        lang: lang,
        pages: "5"
      });
      if (artist) params.append("artist", artist);
      if (key) params.append("key", key);

      let data = null;
      try {
        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {}

      if (!data || !data.songs) {
        data = await performClientSideSearch(query, lang, artist, key);
      }

      currentSearchResults = data;
      renderResults(data);

      const isDegreeQuery = /^[1-7\s,\-\>\|/]+$/.test(query) || /^[ivxIVX\s,\-\>\|/]+$/.test(query);
      if (query && !isDegreeQuery && data.progression && data.songs && data.songs.length > 0) {
        const matchedSongProg = data.songs[0]?.progression || data.progression;
        const matchedDegs = parseInputToDegrees(matchedSongProg);
        if (matchedDegs.length > 0) {
          activeDegrees = matchedDegs;
          renderBuilderDisplay();
          loadNextChordProbabilities(matchedSongProg);
        } else {
          loadNextChordProbabilities(query);
        }
      } else {
        loadNextChordProbabilities(query);
      }
    } catch (err) {
      console.error(err);
      songsTbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <span>❌ 检索失败，请检查输入或网络。</span>
          </td>
        </tr>
      `;
    }
  }

  // Client-Side Search Fallback using static data JSON
  async function performClientSideSearch(query, lang, artist, key = "") {
    const isDegreeQuery = /^[1-7\s,\-\>\|/]+$/.test(query) || /^[ivxIVX\s,\-\>\|/]+$/.test(query);
    const clean = isDegreeQuery ? query.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "") : "";
    const textKeyword = !isDegreeQuery ? query.toLowerCase().trim() : "";
    const targetDegs = parseDegreeList(clean);

    let zhSongs = [];
    let popSongs = [];
    let modSongs = [];
    let enSongs = [];
    let taxonomy = {};

    try {
      const [zhResp, popResp, modResp, enResp, taxResp] = await Promise.all([
        fetch("/data/chinese_corpus.json"),
        fetch("/data/pop909_indexed_chords.json"),
        fetch("/data/chinese_modern_corpus.json"),
        fetch("/data/western_corpus.json"),
        fetch("/data/named_progressions.json")
      ]);
      if (zhResp.ok) zhSongs = await zhResp.json();
      if (popResp.ok) popSongs = await popResp.json();
      if (modResp.ok) modSongs = await modResp.json();
      if (enResp.ok) enSongs = await enResp.json();
      if (taxResp.ok) taxonomy = await taxResp.json();
    } catch (e) {
      console.warn("Could not load static datasets:", e);
    }

    let allSongs = [];
    zhSongs.forEach(s => allSongs.push({ ...s, language: "zh", source: "chinese_curated" }));
    popSongs.forEach(s => allSongs.push({ ...s, language: "zh", source: "pop909_academic" }));
    modSongs.forEach(s => allSongs.push({
      id: s.id,
      title: s.title,
      artist: s.artist,
      key: s.key || s.original_key,
      section: s.section || "Chorus (副歌)",
      progression: s.primary_progression || s.progression,
      chords: s.primary_chords || s.chords,
      roman: s.primary_roman || s.roman,
      source_url: s.source_url,
      language: "zh",
      source: "chinese_modern"
    }));
    enSongs.forEach(s => allSongs.push({ ...s, language: "en", source: "western_hooktheory" }));

    let matches = [];
    const seen = new Set();

    for (const s of allSongs) {
      if (lang === "zh" && s.language !== "zh") continue;
      if (lang === "en" && s.language !== "en") continue;

      const sTitle = (s.title || "").toLowerCase();
      const sArtist = (s.artist || "").toLowerCase();

      if (key && !keyMatchesClient(s, key)) continue;
      if (artist && !sArtist.includes(artist.toLowerCase()) && !sTitle.includes(artist.toLowerCase())) continue;

      let match = null;
      if (textKeyword) {
        if (sTitle.includes(textKeyword) || sArtist.includes(textKeyword)) match = { kind: "text", occurrences: 0 };
      } else if (targetDegs.length > 0) {
        match = matchSongClient(s, targetDegs);
      } else {
        match = { kind: "all", occurrences: 0 };
      }
      if (!match) continue;

      const k = `${s.title}|${s.artist}|${s.section || ''}`.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      const { degree_sequence: _seq, ...row } = s;
      matches.push({ ...row, match_kind: match.kind, match_occurrences: match.occurrences });
    }

    const ordered = targetDegs.length > 0 ? sortByEvidenceClient(matches) : matches;
    const degs = targetDegs.length > 0 ? targetDegs : (ordered[0]?.degrees || [1, 5, 6, 4]);
    const refC = degs.map(d => degreeToChord(d, "C"));
    const refG = degs.map(d => degreeToChord(d, "G"));

    return {
      progression: clean || (ordered[0]?.progression || "1,5,6,4"),
      roman_progression: targetDegs.length > 0 ? degs.map(d => romanMap[d] || d).join("-") : (ordered[0]?.roman || "I-V-vi-IV"),
      progression_name: taxonomy[clean] || (textKeyword ? `关键词: "${query}"` : (!query ? "全部曲库全览 (All Songs Collection)" : "自定义和弦进行")),
      degrees: degs,
      reference_chords: { in_C_major: refC, in_G_major: refG },
      total_count: ordered.length,
      match_summary: {
        loop: ordered.filter(s => s.match_kind === "loop").length,
        sequence: ordered.filter(s => s.match_kind === "sequence").length
      },
      offline: true,
      songs: ordered
    };
  }

  // Render Table & Header Stats
  function renderResults(data) {
    currentRoman.textContent = data.roman_progression || "Custom";
    currentDeg.textContent = data.progression || "";
    progTitle.textContent = data.progression_name || "自定义和弦进行 (Custom Progression)";
    totalCountEl.textContent = data.total_count ?? data.total_found ?? (data.songs?.length || 0);

    const refC = data.reference_chords?.in_C_major?.join(" - ") || (activeDegrees.map(d => degreeToChord(d, "C")).join(" - "));
    const refG = data.reference_chords?.in_G_major?.join(" - ") || (activeDegrees.map(d => degreeToChord(d, "G")).join(" - "));
    refKeysBox.innerHTML = `
      <span><strong>C 调参考:</strong> ${refC}</span>
      <span><strong>G 调参考:</strong> ${refG}</span>
    `;

    if (resultsNote) {
      const summary = data.match_summary;
      if (summary && (summary.loop || summary.sequence)) {
        resultsNote.innerHTML = `
          <span class="match-tag match-loop">主循环命中 ${summary.loop}</span>
          <span class="match-tag match-seq">全曲复现 ≥2 次 ${summary.sequence}</span>
          <span>循环按任意旋转匹配（6-4-1-5 也命中 1-5-6-4）；小调歌曲级数按关系大调计（Am-F-C-G = 6-4-1-5）。</span>
          ${data.offline ? `<span class="source-pill heuristic">离线检索</span>` : ""}
        `;
      } else {
        resultsNote.innerHTML = "";
      }
    }

    const songs = data.songs || [];
    if (songs.length === 0) {
      songsTbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <span>未找到匹配该和弦进行或关键词的歌曲。</span>
          </td>
        </tr>
      `;
      return;
    }

    songsTbody.innerHTML = "";

    songs.forEach((song, idx) => {
      const tr = document.createElement("tr");

      const isZh = song.language === "zh" || song.source?.startsWith("chinese") || song.source?.startsWith("pop909");
      const langBadge = isZh 
        ? `<span class="badge badge-zh">华语</span>` 
        : `<span class="badge badge-en">欧美</span>`;

      let listenLink = "-";
      if (song.source_url && /^https?:\/\//i.test(song.source_url)) {
        listenLink = `<a href="${escapeHtml(song.source_url)}" target="_blank" rel="noopener">曲谱/来源 ↗</a>`;
      } else if (song.youtube_id) {
        listenLink = `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(song.youtube_id)}" target="_blank" rel="noopener">试听 ↗</a>`;
      } else if (isZh) {
        listenLink = `<a href="https://yopu.co/search?q=${encodeURIComponent(song.title + ' ' + song.artist)}" target="_blank" rel="noopener">有谱么 ↗</a>`;
      }

      const songProg = song.progression || activeDegrees.join(",");
      const songRoman = song.roman || songProg.split(",").map(d => romanMap[d] || d).join("-");

      let matchTag = "";
      if (song.match_kind === "sequence") {
        matchTag = `<span class="match-tag match-seq" title="该进行在整首歌中出现 ${song.match_occurrences} 次（非主循环）">复现 ×${song.match_occurrences}</span>`;
      } else if (song.match_kind === "loop" && song.loop_repetitions) {
        matchTag = `<span class="match-tag match-loop" title="主循环在整首歌中重复 ${song.loop_repetitions} 次">循环 ×${song.loop_repetitions}</span>`;
      }

      const keyLabel = escapeHtml(song.key || "C major");
      const analysisKey = song.analysis_key && song.analysis_key !== song.key
        ? `<span class="key-analysis" title="小调按关系大调计算级数">级数按 ${escapeHtml(song.analysis_key.replace(" major", ""))} 大调</span>`
        : "";

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>
          <div class="song-title-cell">
            <span class="song-title">${escapeHtml(song.title)}</span>
            ${langBadge}
          </div>
        </td>
        <td class="song-artist">${escapeHtml(song.artist || "未知歌手")}</td>
        <td>
          <span style="font-size:12px; color:var(--text-secondary);">${escapeHtml(song.section || "Chorus")}</span> ${matchTag}
          <div style="font-size:10px; color:var(--primary-accent); font-family:var(--font-mono); font-weight:600;">${escapeHtml(songRoman)} (${escapeHtml(songProg)})</div>
        </td>
        <td><span class="key-badge">${keyLabel}</span>${analysisKey}</td>
        <td class="listen-link">${listenLink}</td>
      `;

      songsTbody.appendChild(tr);
    });
  }

  // Load Next Chord Probabilities
  async function loadNextChordProbabilities(queryProg) {
    probContainer.innerHTML = `<div class="loading-spinner">计算下一个和弦概率...</div>`;
    const clean = (queryProg || "").replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "");
    if (!clean) {
      probContainer.innerHTML = `<div style="color:var(--text-muted); font-size:12px;">构建进行后显示统计概率</div>`;
      return;
    }

    try {
      const res = await fetch(`/api/next?progression=${encodeURIComponent(clean)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      renderProbabilities(data);
    } catch (e) {
      // Client-side probability fallback
      const dist = {
        "1,5,6": [{ degree: 4, chord_degree: 4, chord: "4", roman: "IV", probability: 0.78, description: "Axis of Awesome standard" }, { degree: 3, chord_degree: 3, chord: "3", roman: "iii", probability: 0.14, description: "Canon line" }, { degree: 5, chord_degree: 5, chord: "5", roman: "V", probability: 0.04, description: "Dominant" }],
        "1,5,6,4": [{ degree: 1, chord_degree: 1, chord: "1", roman: "I", probability: 0.82, description: "Loop resolution to tonic" }, { degree: 5, chord_degree: 5, chord: "5", roman: "V", probability: 0.10, description: "Dominant turnaround" }, { degree: 6, chord_degree: 6, chord: "6", roman: "vi", probability: 0.05, description: "Deceptive turnaround" }],
        "4,5,3": [{ degree: 6, chord_degree: 6, chord: "6", roman: "vi", probability: 0.88, description: "Royal Road core" }, { degree: 1, chord_degree: 1, chord: "1", roman: "I", probability: 0.08, description: "Tonic" }],
        "4,5,3,6": [{ degree: 2, chord_degree: 2, chord: "2", roman: "ii", probability: 0.76, description: "Royal Road ii extension" }, { degree: 4, chord_degree: 4, chord: "4", roman: "IV", probability: 0.15, description: "Subdominant restart" }],
        "6,4,1": [{ degree: 5, chord_degree: 5, chord: "5", roman: "V", probability: 0.92, description: "Emotional 6415 cadence" }],
        "6,4,1,5": [{ degree: 6, chord_degree: 6, chord: "6", roman: "vi", probability: 0.85, description: "Minor loop resolution" }, { degree: 4, chord_degree: 4, chord: "4", roman: "IV", probability: 0.10, description: "Plagal shift" }],
        "1,6": [{ degree: 4, chord_degree: 4, chord: "4", roman: "IV", probability: 0.72, description: "50s Doo-Wop" }, { degree: 2, chord_degree: 2, chord: "2", roman: "ii", probability: 0.18, description: "Circle of fifths" }],
        "2,5": [{ degree: 1, chord_degree: 1, chord: "1", roman: "I", probability: 0.85, description: "Jazz standard resolution" }]
      };
      const found = dist[clean] || [
        { degree: 4, chord_degree: 4, chord: "4", roman: "IV", probability: 0.50, description: "Subdominant transition" },
        { degree: 5, chord_degree: 5, chord: "5", roman: "V", probability: 0.35, description: "Dominant tension" },
        { degree: 1, chord_degree: 1, chord: "1", roman: "I", probability: 0.15, description: "Tonic resolution" }
      ];
      renderProbabilities({
        progression: clean,
        source: "heuristic_table",
        note: "无法连接边缘 API：以下为经验估计，不是语料统计",
        next_chord_probabilities: found
      });
    }
  }

  function renderProbabilityMeta(data) {
    if (!probMeta) return;
    if (data.source === "corpus_ngram") {
      const backoff = data.backoff
        ? `<span class="note-backoff">（前缀 <code>${escapeHtml(data.prefix_progression)}</code> 样本不足，退回 <code>${escapeHtml(data.context_used)}</code>）</span>`
        : "";
      probMeta.innerHTML = `<span class="source-pill measured">真实语料统计</span>基于 <strong>${data.sample_songs}</strong> 首歌曲 / <strong>${data.sample_occurrences}</strong> 次转移 · 上下文 <code>${escapeHtml(data.context_used)}</code>${backoff}`;
    } else if (data.source === "heuristic_table") {
      probMeta.innerHTML = `<span class="source-pill heuristic">经验估计</span>${escapeHtml(data.note || "语料模型不可用，以下为经验估计")}`;
    } else {
      probMeta.innerHTML = "";
    }
  }

  function renderProbabilities(data) {
    const list = data.next_chord_probabilities || data.next_chords || [];
    renderProbabilityMeta(data);
    if (list.length === 0) {
      probContainer.innerHTML = `<div style="color:var(--text-muted); font-size:12px;">暂无足够的下一个和弦统计样本</div>`;
      return;
    }

    probContainer.innerHTML = "";
    list.slice(0, 5).forEach(item => {
      const row = document.createElement("div");
      row.className = "prob-row";
      const deg = item.degree ?? item.chord_degree ?? Number(item.chord || 1);
      const roman = item.roman || romanMap[deg] || String(deg);
      const pct = Math.round(item.probability * 100);
      const songs = item.song_count ? `${item.song_count} 首` : "";
      if (item.description) row.title = item.description;

      row.innerHTML = `
        <div class="prob-degree-label">
          <strong>${deg}</strong>
          <span>${escapeHtml(roman)}</span>
        </div>
        <div class="prob-bar-container">
          <div class="prob-bar-fill" style="width: ${pct}%;"></div>
        </div>
        <div class="prob-val">${pct}%</div>
        <div class="prob-songs">${songs}</div>
      `;

      row.addEventListener("click", () => {
        activeDegrees.push(deg);
        inputProg.value = activeDegrees.join(",");
        renderBuilderDisplay();
        executeSearch();
      });

      probContainer.appendChild(row);
    });
  }


  // Custom Chord Sheet Analyzer (POST /api/analyze with client-side fallback)
  btnCustomAnalyze.addEventListener("click", async () => {
    const text = customChordsInput.value.trim();
    const key = customKeySelect.value || "C";
    if (!text) return;

    btnCustomAnalyze.textContent = "解析中...";
    btnCustomAnalyze.disabled = true;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chords: text, key: key, scale: "major" })
      });
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();
      renderCustomAnalysisResult(data);
    } catch (e) {
      // Local Diatonic Symbolic Fallback
      const chordList = text.split(/[\s,\-\>\|/]+/).filter(Boolean);
      const NOTE_PITCH = { 'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11 };
      const MAJOR_INTERVALS = { 0:1, 2:2, 4:3, 5:4, 7:5, 9:6, 11:7 };
      const keyPitch = NOTE_PITCH[key] ?? 0;
      const degrees = [];
      const romans = [];

      for (const c of chordList) {
        const rootMatch = c.match(/^([A-Ga-g][#b]?)(.*)$/);
        if (!rootMatch) continue;
        const root = rootMatch[1].charAt(0).toUpperCase() + rootMatch[1].slice(1);
        const quality = rootMatch[2];
        const pitch = NOTE_PITCH[root];
        if (pitch === undefined) continue;
        const interval = (pitch - keyPitch + 12) % 12;
        const deg = MAJOR_INTERVALS[interval] || 1;
        let rom = romanMap[deg] || "I";
        if (quality.startsWith("m") && !quality.startsWith("maj")) {
          rom = rom.toLowerCase();
        } else if (deg === 1 || deg === 4 || deg === 5) {
          rom = rom.toUpperCase();
        }
        degrees.push(deg);
        romans.push(rom);
      }

      const progStr = degrees.join(",");
      const recognized = namedProgressionsTaxonomy[progStr] ? [{ name: namedProgressionsTaxonomy[progStr], progression: progStr }] : [];

      renderCustomAnalysisResult({
        input_chords: chordList,
        key: `${key} major`,
        scale_degrees: degrees,
        progression_string: progStr,
        roman_numerals: romans.join(" - "),
        recognized_progressions: recognized
      });
    } finally {
      btnCustomAnalyze.textContent = "解析级数";
      btnCustomAnalyze.disabled = false;
    }
  });

  function renderCustomAnalysisResult(data) {
    customAnalysisResult.style.display = "block";
    let recHtml = "";
    if (data.recognized_progressions?.length > 0) {
      recHtml = `<div style="margin-top:8px;color:#10b981;font-weight:600;">🏆 命中经典进行: ${data.recognized_progressions.map(r => r.name).join(" / ")}</div>`;
    }

    customAnalysisResult.innerHTML = `
      <div><strong>输入和弦:</strong> ${data.input_chords.join(" - ")} (${data.key})</div>
      <div style="margin-top:4px;"><strong>罗马级数:</strong> <span style="color:var(--primary-accent);font-weight:700;">${data.roman_numerals}</span> (${data.progression_string})</div>
      ${recHtml}
      <button id="btn-use-custom-prog" class="btn btn-secondary" style="margin-top:8px;padding:4px 8px;font-size:11px;">用此进行检索歌曲 ➔</button>
    `;

    document.getElementById("btn-use-custom-prog")?.addEventListener("click", () => {
      inputProg.value = data.progression_string;
      activeDegrees = parseInputToDegrees(data.progression_string);
      renderBuilderDisplay();
      executeSearch();
    });
  }

  // 1-Click Yopu Search & Parser Handler
  const btnYopuSearch = document.getElementById("btn-yopu-search");
  const btnYopuImport = document.getElementById("btn-yopu-import");
  const yopuImportInput = document.getElementById("yopu-import-input");
  const yopuSearchResultsBox = document.getElementById("yopu-search-results-box");
  const yopuImportResult = document.getElementById("yopu-import-result");

  btnYopuSearch?.addEventListener("click", async () => {
    const query = yopuImportInput.value.trim();
    if (!query) return;

    btnYopuSearch.textContent = "搜索中...";
    btnYopuSearch.disabled = true;
    yopuSearchResultsBox.style.display = "block";
    yopuSearchResultsBox.innerHTML = `<div class="loading-spinner">正在搜索有谱么曲库...</div>`;

    try {
      const res = await fetch(`/api/yopu-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = data.results || [];
      const isLocalFallback = data.source === "local_corpus";

      if (results.length === 0) {
        const cause = data.error || data.upstream_error;
        yopuSearchResultsBox.innerHTML = cause
          ? `<div style="font-size:12px;color:#ef4444;">搜索失败: ${escapeHtml(cause)}</div>`
          : `<div style="font-size:12px;color:var(--text-muted);">未找到与 "${escapeHtml(query)}" 匹配的曲谱。</div>`;
        return;
      }

      const totalHits = data.total_count ?? data.total ?? results.length;
      let html = "";
      if (isLocalFallback) {
        html += `<div class="yopu-fallback-note" style="font-size:11px;color:#fbbf24;margin-bottom:6px;">⚠️ ${escapeHtml(data.note || "有谱么当前不可达，以下为本站内置语料库的匹配结果")}</div>`;
      }
      html += `<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#38bdf8;">🔍 找到 ${totalHits} 个匹配曲谱${isLocalFallback ? "（本地语料库）" : "（点击直接解析）"}：</div>`;
      html += `<div style="display:flex;flex-direction:column;gap:6px;">`;
      results.forEach((r, idx) => {
        const title = escapeHtml(r.title || "未知曲目");
        const artist = escapeHtml(r.artist || "未知歌手");
        const vTag = r.verified ? `<span style="color:#10b981;font-size:10px;font-weight:700;">✅ 认证</span>` : "";
        const keyTag = r.key && r.key !== "-" ? `<span style="font-size:10px;background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px;">${escapeHtml(r.key)}调</span>` : "";
        let action;
        if (r.source === "local_corpus") {
          const prog = r.roman ? `${escapeHtml(r.roman)} (${escapeHtml(r.progression || "")})` : escapeHtml(r.progression || "");
          const link = r.source_url ? ` <a href="${escapeHtml(r.source_url)}" target="_blank" rel="noopener" style="font-size:11px;">来源 ↗</a>` : "";
          action = `<span style="font-size:11px;color:#38bdf8;white-space:nowrap;">${prog}${link}</span>`;
        } else {
          action = `<button class="btn btn-secondary btn-import-item" data-id="${escapeHtml(r.id)}" data-title="${title}" data-artist="${artist}" style="padding:2px 8px;font-size:11px;">解析 ➔</button>`;
        }
        html += `
          <div class="yopu-result-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
            <div>
              <strong>${idx + 1}. ${title}</strong> - <span style="color:var(--text-secondary);">${artist}</span> ${keyTag} ${vTag}
            </div>
            ${action}
          </div>
        `;
      });
      html += `</div>`;
      yopuSearchResultsBox.innerHTML = html;

      yopuSearchResultsBox.querySelectorAll(".btn-import-item").forEach(btn => {
        btn.addEventListener("click", () => {
          const scoreId = btn.getAttribute("data-id");
          yopuImportInput.value = scoreId;
          btnYopuImport.click();
        });
      });

    } catch (e) {
      yopuSearchResultsBox.innerHTML = `<div style="font-size:12px;color:#ef4444;">搜索失败: ${e.message}</div>`;
    } finally {
      btnYopuSearch.textContent = "全网搜索";
      btnYopuSearch.disabled = false;
    }
  });

  btnYopuImport?.addEventListener("click", async () => {
    const raw = yopuImportInput.value.trim();
    if (!raw) return;
    btnYopuImport.textContent = "解析中...";
    btnYopuImport.disabled = true;
    yopuImportResult.style.display = "block";
    yopuImportResult.innerHTML = `<div class="loading-spinner">正在分析有谱么曲谱...</div>`;

    try {
      const res = await fetch("/api/import-yopu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: raw, add_to_corpus: true })
      });
      const data = await res.json();
      
      if (data.error) {
        yopuImportResult.innerHTML = `<div style="font-size:12px;color:#ef4444;">❌ 解析失败: ${data.error}</div>`;
        return;
      }

      if (data.no_inline_chords) {
        yopuImportResult.innerHTML = `
          <div style="color:#38bdf8;font-weight:700;margin-bottom:6px;">ℹ️ 曲目信息已解析：${data.title} - ${data.artist}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">原曲调性: ${data.key} (Capo: ${data.capo || 0})</div>
          <div style="font-size:12px;line-height:1.5;background:rgba(255,255,255,0.03);padding:8px;border-radius:4px;margin-bottom:8px;">
            ⚠️ 该曲谱在有谱么平台使用客户端动态渲染。您可以在上方【自选和弦谱解析器】中输入其和弦走向（如 <code>C G Am F</code> 或 <code>F G Em Am Dm G C</code>），即可秒级分析罗马级数！
          </div>
          <a href="${data.source_url}" target="_blank" class="btn btn-secondary" style="display:inline-block;padding:4px 8px;font-size:11px;">在有谱么查看原谱 ↗</a>
        `;
        return;
      }

      yopuImportResult.innerHTML = `
        <div style="color:#10b981;font-weight:700;margin-bottom:6px;">✅ 解析成功并已入库！</div>
        <div><strong>歌名/歌手:</strong> ${data.title} - ${data.artist}</div>
        <div><strong>原曲调性:</strong> ${data.key} (Capo: ${data.capo || 0})</div>
        <div><strong>核心 Loop 级数:</strong> <span style="color:var(--primary-accent);font-weight:700;">${data.primary_roman}</span> (${data.primary_progression})</div>
        ${data.progression_name ? `<div style="color:#38bdf8;font-size:12px;">🏷️ 对应进行: ${data.progression_name}</div>` : ""}
        <div><strong>和弦走向:</strong> ${(data.primary_chords || []).join(" - ")}</div>
        <button id="btn-use-yopu-prog" class="btn btn-secondary" style="margin-top:8px;padding:4px 8px;font-size:11px;">在曲库中检索此进行 ➔</button>
      `;

      document.getElementById("btn-use-yopu-prog")?.addEventListener("click", () => {
        inputProg.value = data.primary_progression;
        activeDegrees = parseInputToDegrees(data.primary_progression);
        renderBuilderDisplay();
        executeSearch();
      });

    } catch (e) {
      yopuImportResult.innerHTML = `<div style="font-size:12px;color:#ef4444;">❌ 网络请求失败: ${e.message}</div>`;
    } finally {
      btnYopuImport.textContent = "直接解析";
      btnYopuImport.disabled = false;
    }
  });

  // Step Builder Interactions
  chordBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const deg = Number(btn.getAttribute("data-degree"));
      if (!deg || isNaN(deg)) return;
      activeDegrees.push(deg);
      
      const key = playKeySelect.value || "C";
      const chord = degreeToChord(deg, key);
      if (window.chordSynth) window.chordSynth.playChord(chord, 0.9);

      renderBuilderDisplay();
      executeSearch();
    });
  });

  btnBackspace.addEventListener("click", () => {
    if (activeDegrees.length > 0) {
      activeDegrees.pop();
      renderBuilderDisplay();
      executeSearch();
    }
  });

  btnClear.addEventListener("click", () => {
    activeDegrees = [];
    renderBuilderDisplay();
    executeSearch();
  });

  presetChips.forEach(chip => {
    chip.addEventListener("click", () => {
      presetChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const prog = chip.getAttribute("data-prog");
      if (prog === "all" || !prog) {
        inputProg.value = "";
        activeDegrees = [];
      } else {
        inputProg.value = prog;
        activeDegrees = parseInputToDegrees(prog);
      }
      renderBuilderDisplay();
      executeSearch();
    });
  });

  // Search Input listener (triggers on enter or input)
  inputProg.addEventListener("change", () => {
    const val = inputProg.value.trim();
    const degs = parseInputToDegrees(val);
    activeDegrees = degs;
    renderBuilderDisplay();
    executeSearch();
  });

  inputProg.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      executeSearch();
    }
  });

  btnSearch?.addEventListener("click", executeSearch);

  filterLang?.addEventListener("change", executeSearch);
  filterArtist?.addEventListener("input", executeSearch);

  document.querySelectorAll(".btn-quick-song").forEach(btn => {
    btn.addEventListener("click", () => {
      inputProg.value = btn.textContent.trim();
      executeSearch();
    });
  });

  // Corpus leaderboard (static asset built by scripts/build_ngram_model.py)
  const LEADERBOARD_ROWS = 12;
  async function loadLeaderboard() {
    if (!leaderboardChips) return;
    try {
      const res = await fetch("/data/progression_stats.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const stats = await res.json();
      const top = (stats.top || []).slice(0, LEADERBOARD_ROWS);
      if (leaderboardMeta) leaderboardMeta.textContent = `按主循环歌曲数统计 · 全库 ${stats.total_songs} 首`;
      leaderboardChips.innerHTML = "";
      top.forEach((row, idx) => {
        const chip = document.createElement("button");
        chip.className = "lb-chip";
        chip.type = "button";
        chip.dataset.prog = row.progression;
        const group = row.rotation_group_songs && row.rotation_group_songs !== row.songs
          ? ` · 含旋转变体共 ${row.rotation_group_songs} 首` : "";
        chip.title = `${row.name || row.roman}${group}`;
        chip.innerHTML = `
          <span class="lb-rank">${idx + 1}</span>
          <span class="lb-prog">${escapeHtml(row.progression.replace(/,/g, "-"))}</span>
          <span class="lb-roman">${escapeHtml(row.roman)}</span>
          <span class="lb-count">${row.songs} 首</span>
        `;
        chip.addEventListener("click", () => {
          inputProg.value = row.progression;
          activeDegrees = parseInputToDegrees(row.progression);
          renderBuilderDisplay();
          executeSearch();
        });
        leaderboardChips.appendChild(chip);
      });
      syncProgressionChips(inputProg.value.trim());
    } catch (e) {
      leaderboardChips.innerHTML = `<span class="prog-empty-hint">热门循环统计暂不可用 (${escapeHtml(e.message)})</span>`;
    }
  }

  // Share the current search: the URL already carries q/lang/artist/key.
  btnShareLink?.addEventListener("click", async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      if (shareBtnText) shareBtnText.textContent = "已复制 ✓";
      btnShareLink.classList.add("copied");
    } catch (e) {
      window.prompt("复制此链接：", url);
    }
    setTimeout(() => {
      if (shareBtnText) shareBtnText.textContent = "复制链接";
      btnShareLink.classList.remove("copied");
    }, 1800);
  });

  filterKey?.addEventListener("change", executeSearch);

  // Exporters
  btnExportCsv?.addEventListener("click", () => {
    if (!currentSearchResults || !currentSearchResults.songs) return;
    const rows = [["#", "Song Title", "Artist", "Section", "Key", "Progression", "Roman", "Source"]];
    currentSearchResults.songs.forEach((s, i) => {
      rows.push([
        i + 1,
        `"${(s.title || '').replace(/"/g, '""')}"`,
        `"${(s.artist || '').replace(/"/g, '""')}"`,
        `"${(s.section || '').replace(/"/g, '""')}"`,
        s.key || "C major",
        s.progression || "",
        s.roman || "",
        s.source || ""
      ]);
    });
    const csvContent = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chordverse_${currentSearchResults.progression || 'search'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnExportMd?.addEventListener("click", () => {
    if (!currentSearchResults || !currentSearchResults.songs) return;
    let md = `# ChordVerse: ${currentSearchResults.progression_name || currentSearchResults.progression}\n\n`;
    md += `- **罗马级数 (Roman):** ${currentSearchResults.roman_progression || ''}\n`;
    md += `- **和弦数字 (Degrees):** ${currentSearchResults.progression || ''}\n`;
    md += `- **命中歌曲总数:** ${currentSearchResults.songs.length}\n\n`;
    md += `| # | 歌名 | 歌手 | 段落 | 原调 | 和弦级数 |\n`;
    md += `|---|---|---|---|---|---|\n`;
    currentSearchResults.songs.forEach((s, i) => {
      md += `| ${i + 1} | ${s.title} | ${s.artist} | ${s.section || 'Chorus'} | ${s.key || 'C major'} | ${s.roman || s.progression} |\n`;
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chordverse_${currentSearchResults.progression || 'search'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Initial Boot: a URL that carries ?q= is the source of truth.
  readUrlState();
  renderBuilderDisplay();
  executeSearch();
  loadLeaderboard();
});
