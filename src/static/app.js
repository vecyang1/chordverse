/**
 * ChordVerse Frontend Application Logic with Live Audio Playback & Transposition.
 */

document.addEventListener("DOMContentLoaded", () => {
  let activeDegrees = [1, 5, 6, 4];
  let currentSearchResults = null;
  let isLoopPlaying = false;

  // DOM Elements
  const inputProg = document.getElementById("input-progression");
  const selectLang = document.getElementById("select-lang");
  const inputArtist = document.getElementById("input-artist");
  const btnSearch = document.getElementById("btn-search");
  
  const progDisplayBox = document.getElementById("prog-display-box");
  const btnBackspace = document.getElementById("btn-backspace");
  const btnClear = document.getElementById("btn-clear");
  const chordBtns = document.querySelectorAll(".chord-btn[data-degree]");
  const presetChips = document.querySelectorAll(".preset-chips .chip");
  
  const playKeySelect = document.getElementById("play-key-select");
  const btnPlayLoop = document.getElementById("btn-play-loop");
  const playBtnText = document.getElementById("play-btn-text");

  const currentRoman = document.getElementById("current-roman");
  const currentDeg = document.getElementById("current-deg");
  const progTitle = document.getElementById("progression-name-title");
  const refKeysBox = document.getElementById("ref-keys-box");
  const totalCountEl = document.getElementById("total-songs-count");
  const songsTbody = document.getElementById("songs-tbody");
  const probContainer = document.getElementById("prob-container");
  
  const btnExportCsv = document.getElementById("btn-export-csv");
  const btnExportMd = document.getElementById("btn-export-md");
  
  const customChordsInput = document.getElementById("custom-chords-input");
  const customKeySelect = document.getElementById("custom-key-select");
  const btnCustomAnalyze = document.getElementById("btn-custom-analyze");
  const customAnalysisResult = document.getElementById("custom-analysis-result");

  const romanMap = { 1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°" };

  // Diatonic scale degree to chord calculator
  const diatonicIntervals = [0, 2, 4, 5, 7, 9, 11];
  const pitchToNoteSharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const pitchToNoteFlat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const notePitchMap = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
  };

  function degreeToChord(deg, key = "C") {
    const keyPitch = notePitchMap[key] !== undefined ? notePitchMap[key] : 0;
    const isFlatKey = ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(key);
    const pitchMap = isFlatKey ? pitchToNoteFlat : pitchToNoteSharp;
    
    if (deg >= 1 && deg <= 7) {
      const semi = (keyPitch + diatonicIntervals[deg - 1]) % 12;
      const rootNote = pitchMap[semi];
      if ([2, 3, 6].includes(deg)) return rootNote + "m";
      if (deg === 7) return rootNote + "dim";
      return rootNote;
    }
    return key;
  }

  function getActiveChordsInKey(key = "C") {
    return activeDegrees.map(d => degreeToChord(d, key));
  }

  // Update Visual Step Builder Box
  function renderBuilderDisplay() {
    progDisplayBox.innerHTML = "";
    if (activeDegrees.length === 0) {
      progDisplayBox.innerHTML = '<span class="prog-empty-hint">点击下方级数构建进行...</span>';
      return;
    }
    const currentKey = playKeySelect.value || "C";
    activeDegrees.forEach((deg, idx) => {
      const chip = document.createElement("div");
      chip.className = "active-deg-chip";
      chip.setAttribute("data-index", idx);
      const chordName = degreeToChord(deg, currentKey);
      chip.innerHTML = `<strong>${deg}</strong> <small>${romanMap[deg] || deg}</small> <span style="font-size:11px;opacity:0.8;margin-left:2px;">(${chordName})</span>`;
      
      // Click single chip to hear its chord
      chip.addEventListener("click", () => {
        if (window.chordSynth) {
          window.chordSynth.playChord(chordName, 1.2);
        }
      });
      progDisplayBox.appendChild(chip);
    });
    inputProg.value = activeDegrees.join(",");
  }

  // Parse text input to degrees array
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
      // Stop loop
      if (window.chordSynth) window.chordSynth.stopLoop();
      isLoopPlaying = false;
      btnPlayLoop.classList.remove("btn-playing");
      playBtnText.textContent = "试听进行 (Play)";
      document.querySelectorAll(".active-deg-chip").forEach(c => c.classList.remove("playing-highlight"));
    } else {
      // Start loop
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

  // Fetch & Render Search
  async function executeSearch() {
    const query = inputProg.value.trim() || "1,5,6,4";
    const lang = selectLang.value;
    const artist = inputArtist.value.trim();

    songsTbody.innerHTML = `
      <tr>
        <td colspan="6" class="loading-state">
          <div class="spinner"></div>
          <span>正在检索真值曲库 (Hooktheory & 华语真值库)...</span>
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
      } catch (e) {
        // Fallback to client-side static dataset
      }

      if (!data || !data.songs) {
        // Pure client-side edge search fallback
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
    const clean = query.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "");
    let zhSongs = [];
    let enSongs = [];
    let taxonomy = {};

    try {
      const [zhResp, enResp, taxResp] = await Promise.all([
        fetch("/data/chinese_corpus.json"),
        fetch("/data/western_corpus.json"),
        fetch("/data/named_progressions.json")
      ]);
      if (zhResp.ok) zhSongs = await zhResp.json();
      if (enResp.ok) enSongs = await enResp.json();
      if (taxResp.ok) taxonomy = await taxResp.json();
    } catch (e) {
      console.warn("Could not load static datasets:", e);
    }

    let matches = [];
    const seen = new Set();

    if (["all", "zh"].includes(lang.toLowerCase())) {
      for (const s of zhSongs) {
        if (s.progression.includes(clean) || clean.includes(s.progression)) {
          const k = (s.title + s.artist + s.section).toLowerCase();
          if (!seen.has(k)) {
            seen.add(k);
            matches.push({ ...s, language: "zh", source: "chinese_corpus" });
          }
        }
      }
    }

    if (["all", "en"].includes(lang.toLowerCase())) {
      for (const s of enSongs) {
        if (s.progression.includes(clean) || clean.includes(s.progression)) {
          const k = (s.title + s.artist + s.section).toLowerCase();
          if (!seen.has(k)) {
            seen.add(k);
            matches.push({ ...s, language: "en", source: "western_corpus" });
          }
        }
      }
    }

    if (artist) {
      const aLow = artist.toLowerCase();
      matches = matches.filter(s => s.artist.toLowerCase().includes(aLow) || s.title.toLowerCase().includes(aLow));
    }

    const degs = clean.split(",").map(Number).filter(n => !isNaN(n));
    const refC = degs.map(d => degreeToChord(d, "C"));
    const refG = degs.map(d => degreeToChord(d, "G"));

    return {
      progression: clean,
      roman_progression: degs.map(d => romanMap[d] || d).join("-"),
      progression_name: taxonomy[clean] || (namedProgressions[clean] || "自定义和弦进行"),
      degrees: degs,
      reference_chords: {
        in_C_major: refC,
        in_G_major: refG
      },
      total_count: matches.length,
      counts_by_language: {
        chinese: matches.filter(s => s.language === "zh").length,
        western: matches.filter(s => s.language === "en").length
      },
      songs: matches
    };
  }

  // Render Table & Header Stats
  function renderResults(data) {
    currentRoman.textContent = data.roman_progression || "Custom";
    currentDeg.textContent = data.progression || "";
    progTitle.textContent = data.progression_name || "自定义和弦进行 (Custom Progression)";
    totalCountEl.textContent = data.total_count || 0;

    const refC = data.reference_chords?.in_C_major?.join(" - ") || "";
    const refG = data.reference_chords?.in_G_major?.join(" - ") || "";
    refKeysBox.innerHTML = `
      <span><strong>C 调参考:</strong> ${refC}</span>
      <span><strong>G 调参考:</strong> ${refG}</span>
    `;

    const songs = data.songs || [];
    if (songs.length === 0) {
      songsTbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <span>未找到匹配该和弦进行的歌曲。</span>
          </td>
        </tr>
      `;
      return;
    }

    songsTbody.innerHTML = "";
    songs.forEach((s, idx) => {
      const tr = document.createElement("tr");
      const isZh = s.language === "zh";
      const langBadge = isZh ? `<span class="lang-badge zh">🇨🇳 华语</span>` : `<span class="lang-badge en">🌍 Western</span>`;
      
      let linkHtml = "-";
      if (s.url) {
        linkHtml = `<a href="${s.url}" target="_blank" class="song-link">TheoryTab ↗</a>`;
      } else if (s.ytid) {
        linkHtml = `<a href="https://www.youtube.com/watch?v=${s.ytid}" target="_blank" class="song-link">YouTube ↗</a>`;
      } else if (s.source) {
        linkHtml = `<span style="color:var(--text-muted);">${s.source}</span>`;
      }

      tr.innerHTML = `
        <td style="color:var(--text-muted);">${idx + 1}</td>
        <td class="song-title-cell">${s.title}</td>
        <td>${s.artist}</td>
        <td><span class="section-badge">${s.section}</span></td>
        <td><span class="key-badge">${s.key}</span></td>
        <td>${langBadge} ${linkHtml}</td>
      `;
      songsTbody.appendChild(tr);
    });
  }

  // Next Chord Probability Bar Chart
  async function loadNextChordProbabilities(prog) {
    probContainer.innerHTML = `<div class="loading-spinner">计算概率分布中...</div>`;
    try {
      const res = await fetch(`/api/next?progression=${encodeURIComponent(prog)}`);
      const data = await res.json();
      const probs = data.next_chord_probabilities || [];

      if (probs.length === 0) {
        probContainer.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">暂无该前缀的下一个和弦概率模型。</div>`;
        return;
      }

      probContainer.innerHTML = "";
      probs.forEach(item => {
        const pct = Math.round(item.probability * 100);
        const row = document.createElement("div");
        row.className = "prob-row";
        row.innerHTML = `
          <div class="prob-roman">${item.roman}</div>
          <div class="prob-bar-container">
            <div class="prob-bar-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="prob-pct">${pct}%</div>
          ${item.description ? `<div class="prob-desc">${item.description}</div>` : ""}
        `;
        probContainer.appendChild(row);
      });
    } catch (e) {
      probContainer.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">加载概率失败。</div>`;
    }
  }

  // Custom Chord Decoder
  btnCustomAnalyze.addEventListener("click", async () => {
    const raw = customChordsInput.value.trim();
    if (!raw) return;
    const key = customKeySelect.value;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chords: raw, key: key, scale: "major" })
      });
      const data = await res.json();
      
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

    } catch (e) {
      alert("解析失败");
    }
  });

  // Step Builder Interactions (with instant audio playback)
  chordBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const deg = Number(btn.getAttribute("data-degree"));
      activeDegrees.push(deg);
      
      // Play audio on button click
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
    if (isLoopPlaying && window.chordSynth) {
      window.chordSynth.stopLoop();
      isLoopPlaying = false;
      btnPlayLoop.classList.remove("btn-playing");
      playBtnText.textContent = "试听进行 (Play)";
    }
    renderBuilderDisplay();
  });

  // Presets
  presetChips.forEach(chip => {
    chip.addEventListener("click", () => {
      presetChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const prog = chip.getAttribute("data-prog");
      inputProg.value = prog;
      activeDegrees = parseInputToDegrees(prog);
      renderBuilderDisplay();
      executeSearch();
    });
  });

  // Search Button & Input
  btnSearch.addEventListener("click", () => {
    activeDegrees = parseInputToDegrees(inputProg.value);
    renderBuilderDisplay();
    executeSearch();
  });

  inputProg.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      activeDegrees = parseInputToDegrees(inputProg.value);
      renderBuilderDisplay();
      executeSearch();
    }
  });

  selectLang.addEventListener("change", executeSearch);
  inputArtist.addEventListener("input", () => {
    clearTimeout(window._searchDebounce);
    window._searchDebounce = setTimeout(executeSearch, 400);
  });

  // Export handlers
  btnExportCsv.addEventListener("click", () => {
    if (!currentSearchResults?.songs) return;
    const rows = [["Title", "Artist", "Section", "Key", "Progression", "Roman", "Language", "Source"]];
    currentSearchResults.songs.forEach(s => {
      rows.push([`"${s.title}"`, `"${s.artist}"`, `"${s.section}"`, `"${s.key}"`, `"${s.progression}"`, `"${s.roman_progression}"`, `"${s.language}"`, `"${s.source}"`]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chord_progression_${currentSearchResults.progression}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  btnExportMd.addEventListener("click", () => {
    if (!currentSearchResults?.songs) return;
    let md = `# Chord Progression: ${currentSearchResults.roman_progression} (${currentSearchResults.progression})\n\n`;
    md += `| # | Song Title | Artist | Section | Key | Language |\n|---|---|---|---|---|---|\n`;
    currentSearchResults.songs.forEach((s, idx) => {
      md += `| ${idx + 1} | ${s.title} | ${s.artist} | ${s.section} | ${s.key} | ${s.language} |\n`;
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `chord_progression_${currentSearchResults.progression}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Initial Load
  renderBuilderDisplay();
  executeSearch();
});
