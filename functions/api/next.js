const ROMAN_MAP = {
  1: "I", 2: "ii", 3: "iii", 4: "IV", 5: "V", 6: "vi", 7: "vii°"
};

// Default probability distribution tree for top progressions
const MODEL_PROBS = {
  "1,5,6": [
    { chord_degree: 4, roman: "IV", probability: 0.78, description: "Axis of Awesome 4-Chord standard (流行四和弦标准结尾)" },
    { chord_degree: 3, roman: "iii", probability: 0.14, description: "Canon progression line (卡农经典下行进行)" },
    { chord_degree: 5, roman: "V", probability: 0.04, description: "Turnaround dominant" },
    { chord_degree: 2, roman: "ii", probability: 0.03, description: "Jazz ii substitute" },
    { chord_degree: 1, roman: "I", probability: 0.01, description: "Resolution to tonic" }
  ],
  "1,5,6,4": [
    { chord_degree: 1, roman: "I", probability: 0.82, description: "Loop resolution to tonic (回归主和弦循环)" },
    { chord_degree: 5, roman: "V", probability: 0.10, description: "Dominant turnaround (进阶属和弦回转)" },
    { chord_degree: 6, roman: "vi", probability: 0.05, description: "Deceptive turnaround (假终止回转)" },
    { chord_degree: 4, roman: "IV", probability: 0.03, description: "Plagal extension (下属和弦延伸)" }
  ],
  "6,4,1": [
    { chord_degree: 5, roman: "V", probability: 0.92, description: "Emotional 6415 cadence standard (六四一五标准结尾)" },
    { chord_degree: 7, roman: "bVII", probability: 0.05, description: "Modal interchange flat 7" },
    { chord_degree: 4, roman: "IV", probability: 0.03, description: "Plagal extension" }
  ],
  "6,4,1,5": [
    { chord_degree: 6, roman: "vi", probability: 0.85, description: "Minor loop resolution to vi (小调主和弦循环)" },
    { chord_degree: 4, roman: "IV", probability: 0.10, description: "Plagal shift (下属和弦过渡)" },
    { chord_degree: 1, roman: "I", probability: 0.05, description: "Tonic shift (大调主和弦过渡)" }
  ],
  "4,5,3": [
    { chord_degree: 6, roman: "vi", probability: 0.88, description: "Royal Road core (王道进行核心 4-5-3-6)" },
    { chord_degree: 1, roman: "I", probability: 0.08, description: "Resolution to tonic" },
    { chord_degree: 4, roman: "IV", probability: 0.04, description: "Subdominant restart" }
  ],
  "4,5,3,6": [
    { chord_degree: 2, roman: "ii", probability: 0.76, description: "Royal Road ii-V-I extension (王道进行续接 4-5-3-6-2-5-1)" },
    { chord_degree: 4, roman: "IV", probability: 0.15, description: "Subdominant loop restart (小王道循环)" },
    { chord_degree: 1, roman: "I", probability: 0.09, description: "Resolution to tonic" }
  ],
  "4,5,3,6,2,5": [
    { chord_degree: 1, roman: "I", probability: 0.94, description: "Royal Road authentic cadence (王道大正格终结回到 I)" },
    { chord_degree: 6, roman: "vi", probability: 0.04, description: "Deceptive cadence (假终止到 vi)" },
    { chord_degree: 3, roman: "iii", probability: 0.02, description: "Mediant transition" }
  ],
  "1,6,4": [
    { chord_degree: 5, roman: "V", probability: 0.90, description: "50s Doo-Wop cadence (50年代经典进行结尾)" },
    { chord_degree: 1, roman: "I", probability: 0.06, description: "Plagal cadence" },
    { chord_degree: 2, roman: "ii", probability: 0.04, description: "Secondary turnaround" }
  ],
  "2,5": [
    { chord_degree: 1, roman: "I", probability: 0.85, description: "Jazz standard resolution (爵士 ii-V-I 解决到主和弦)" },
    { chord_degree: 6, roman: "vi", probability: 0.10, description: "Deceptive cadence (假终止到 vi)" },
    { chord_degree: 3, roman: "iii", probability: 0.05, description: "Stepwise motion" }
  ],
  "1,4": [
    { chord_degree: 5, roman: "V", probability: 0.70, description: "Tonic-Subdominant-Dominant (经典正格终止 1-4-5)" },
    { chord_degree: 1, roman: "I", probability: 0.20, description: "Plagal oscillation (下属复归 1-4-1)" },
    { chord_degree: 6, roman: "vi", probability: 0.10, description: "Relative minor shift" }
  ],
  "1,5": [
    { chord_degree: 6, roman: "vi", probability: 0.68, description: "Pop deceptive standard (流行假终止 1-5-6)" },
    { chord_degree: 1, roman: "I", probability: 0.18, description: "Resolution back to tonic (主和弦复归 1-5-1)" },
    { chord_degree: 4, roman: "IV", probability: 0.14, description: "Plagal turnaround (1-5-4)" }
  ],
  "1,6": [
    { chord_degree: 4, roman: "IV", probability: 0.72, description: "50s Doo-Wop motion (1-6-4)" },
    { chord_degree: 2, roman: "ii", probability: 0.18, description: "Circle of fifths descent (1-6-2)" },
    { chord_degree: 5, roman: "V", probability: 0.10, description: "Direct dominant motion (1-6-5)" }
  ]
};

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const prog = url.searchParams.get("progression") || "1,5,6";
  const cleanProg = prog.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "");

  const rawList = MODEL_PROBS[cleanProg] || [
    { chord_degree: 4, roman: "IV", probability: 0.50, description: "Subdominant transition (下属功能过渡)" },
    { chord_degree: 5, roman: "V", probability: 0.35, description: "Dominant tension (属功能张力)" },
    { chord_degree: 1, roman: "I", probability: 0.15, description: "Tonic resolution (主功能解决)" }
  ];

  // Harmonize objects with degree, chord_degree, and chord string for client compatibility
  const normalized = rawList.map(item => {
    const deg = item.chord_degree ?? item.degree ?? Number(item.chord || 1);
    const roman = item.roman || ROMAN_MAP[deg] || String(deg);
    return {
      chord_degree: deg,
      degree: deg,
      chord: String(deg),
      roman: roman,
      probability: item.probability,
      description: item.description || ""
    };
  });

  return new Response(JSON.stringify({
    prefix_progression: cleanProg,
    next_chord_probabilities: normalized,
    next_chords: normalized
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400"
    }
  });
}

