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
  const chordBtns = document.querySelectorAll(".chord-btn");
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
    "1,4,5,1": "Classic Tonic-Subdominant-Dominant Cadence (经典正格终止进行)"
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
        inputProg.value = activeDegrees.join(",");
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

    inputProg.value = activeDegrees.join(",");
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

  // Execute Search against Edge API with Client-Side fallback
  async function executeSearch() {
    const query = inputProg.value.trim();
    const lang = filterLang.value || "all";
    const artist = filterArtist.value.trim();

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

      let data = null;
      try {
        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {}

      if (!data || !data.songs) {
        data = await performClientSideSearch(query, lang, artist);
      }

      currentSearchResults = data;
      renderResults(data);
      loadNextChordProbabilities(query);
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
  async function performClientSideSearch(query, lang, artist) {
    const isDegreeQuery = /^[1-7\s,\-\>\|/]+$/.test(query) || /^[ivxIVX\s,\-\>\|/]+$/.test(query);
    const clean = isDegreeQuery ? query.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "") : "";
    const textKeyword = !isDegreeQuery ? query.toLowerCase().trim() : "";

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
      const sProg = s.progression || "";

      if (artist && !sArtist.includes(artist.toLowerCase()) && !sTitle.includes(artist.toLowerCase())) continue;

      let isMatch = false;
      if (textKeyword) {
        if (sTitle.includes(textKeyword) || sArtist.includes(textKeyword)) {
          isMatch = true;
        }
      } else if (clean) {
        if (hasProgressionMatch(sProg, clean)) {
          isMatch = true;
        }
      } else {
        isMatch = true;
      }

      if (isMatch) {
        const k = `${s.title}|${s.artist}|${s.section || ''}`.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          matches.push(s);
        }
      }
    }

    const degs = clean ? clean.split(",").map(Number).filter(n => !isNaN(n)) : (matches[0]?.degrees || [1, 5, 6, 4]);
    const refC = degs.map(d => degreeToChord(d, "C"));
    const refG = degs.map(d => degreeToChord(d, "G"));

    return {
      progression: clean || (matches[0]?.progression || "1,5,6,4"),
      roman_progression: matches[0]?.roman || degs.map(d => romanMap[d] || d).join("-"),
      progression_name: taxonomy[clean] || (textKeyword ? `关键词: "${query}"` : "自定义和弦进行"),
      degrees: degs,
      reference_chords: { in_C_major: refC, in_G_major: refG },
      total_count: matches.length,
      songs: matches
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
      if (song.source_url) {
        listenLink = `<a href="${song.source_url}" target="_blank" rel="noopener">曲谱/来源 ↗</a>`;
      } else if (song.youtube_id) {
        listenLink = `<a href="https://www.youtube.com/watch?v=${song.youtube_id}" target="_blank" rel="noopener">试听 ↗</a>`;
      } else if (isZh) {
        listenLink = `<a href="https://yopu.co/search?q=${encodeURIComponent(song.title + ' ' + song.artist)}" target="_blank" rel="noopener">有谱么 ↗</a>`;
      }

      const songProg = song.progression || activeDegrees.join(",");
      const songRoman = song.roman || songProg.split(",").map(d => romanMap[d] || d).join("-");

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>
          <div class="song-title-cell">
            <span class="song-title">${song.title}</span>
            ${langBadge}
          </div>
        </td>
        <td class="song-artist">${song.artist || "未知歌手"}</td>
        <td>
          <span style="font-size:12px; color:var(--text-secondary);">${song.section || "Chorus"}</span>
          <div style="font-size:10px; color:var(--primary-accent); font-family:var(--font-mono); font-weight:600;">${songRoman} (${songProg})</div>
        </td>
        <td><span class="key-badge">${song.key || "C major"}</span></td>
        <td class="listen-link">${listenLink}</td>
      `;

      songsTbody.appendChild(tr);
    });
  }

  // Load Next Chord Probabilities
  async function loadNextChordProbabilities(queryProg) {
    probContainer.innerHTML = `<div class="loading-spinner">计算下一个和弦概率...</div>`;
    const clean = queryProg.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "");
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
        "1,5,6": [{ degree: 4, roman: "IV", probability: 0.65, count: 52 }, { degree: 3, roman: "iii", probability: 0.20, count: 16 }, { degree: 5, roman: "V", probability: 0.10, count: 8 }],
        "4,5,3": [{ degree: 6, roman: "vi", probability: 0.88, count: 42 }, { degree: 1, roman: "I", probability: 0.08, count: 4 }],
        "1,6": [{ degree: 4, roman: "IV", probability: 0.72, count: 36 }, { degree: 2, roman: "ii", probability: 0.18, count: 9 }],
        "2,5": [{ degree: 1, roman: "I", probability: 0.85, count: 68 }, { degree: 6, roman: "vi", probability: 0.10, count: 8 }]
      };
      const found = dist[clean] || [
        { degree: 1, roman: "I", probability: 0.35, count: 20 },
        { degree: 4, roman: "IV", probability: 0.30, count: 18 },
        { degree: 5, roman: "V", probability: 0.25, count: 15 },
        { degree: 6, roman: "vi", probability: 0.10, count: 6 }
      ];
      renderProbabilities({ progression: clean, next_chords: found });
    }
  }

  function renderProbabilities(data) {
    const list = data.next_chords || [];
    if (list.length === 0) {
      probContainer.innerHTML = `<div style="color:var(--text-muted); font-size:12px;">暂无足够的下一个和弦统计样本</div>`;
      return;
    }

    probContainer.innerHTML = "";
    list.slice(0, 5).forEach(item => {
      const row = document.createElement("div");
      row.className = "prob-row";
      const pct = Math.round(item.probability * 100);

      row.innerHTML = `
        <div class="prob-degree-label">
          <strong>${item.degree}</strong>
          <span>${item.roman}</span>
        </div>
        <div class="prob-bar-container">
          <div class="prob-bar-fill" style="width: ${pct}%;"></div>
        </div>
        <div class="prob-val">${pct}%</div>
      `;

      row.addEventListener("click", () => {
        activeDegrees.push(item.degree);
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

      if (results.length === 0) {
        yopuSearchResultsBox.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">未找到与 "${query}" 匹配的曲谱。</div>`;
        return;
      }

      const totalHits = data.total_count ?? data.total ?? results.length;
      let html = `<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#38bdf8;">🔍 找到 ${totalHits} 个匹配曲谱（点击直接解析）：</div>`;
      html += `<div style="display:flex;flex-direction:column;gap:6px;">`;
      results.forEach((r, idx) => {
        const vTag = r.verified ? `<span style="color:#10b981;font-size:10px;font-weight:700;">✅ 认证</span>` : "";
        const keyTag = r.key && r.key !== "-" ? `<span style="font-size:10px;background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px;">${r.key}调</span>` : "";
        html += `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
            <div>
              <strong>${idx + 1}. ${r.title}</strong> - <span style="color:var(--text-secondary);">${r.artist || "未知歌手"}</span> ${keyTag} ${vTag}
            </div>
            <button class="btn btn-secondary btn-import-item" data-id="${r.id}" data-title="${r.title}" data-artist="${r.artist}" style="padding:2px 8px;font-size:11px;">
              解析 ➔
            </button>
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
    if (degs.length > 0) {
      activeDegrees = degs;
      renderBuilderDisplay();
    }
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

  // Initial Boot
  renderBuilderDisplay();
  executeSearch();
});
