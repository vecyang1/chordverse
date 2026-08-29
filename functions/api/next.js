export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const prog = url.searchParams.get("progression") || "1,5,6";
  const cleanProg = prog.replace(/[\s\->|/]+/g, ",").replace(/^,+|,+$/g, "");

  // Default probability distribution tree for top progressions
  const modelProbs = {
    "1,5,6": [
      { chord_degree: 4, roman: "IV", probability: 0.78, description: "Axis of Awesome 4-Chord standard (流行四和弦标准结尾)" },
      { chord_degree: 3, roman: "iii", probability: 0.14, description: "Canon progression line (卡农经典下行进行)" },
      { chord_degree: 5, roman: "V", probability: 0.04, description: "Turnaround dominant" },
      { chord_degree: 2, roman: "ii", probability: 0.03, description: "Jazz ii substitute" },
      { chord_degree: 1, roman: "I", probability: 0.01, description: "Resolution to tonic" }
    ],
    "4,5,3": [
      { chord_degree: 6, roman: "vi", probability: 0.88, description: "Royal Road core (王道进行核心 4-5-3-6)" },
      { chord_degree: 1, roman: "I", probability: 0.08, description: "Resolution to tonic" },
      { chord_degree: 4, roman: "IV", probability: 0.04, description: "Subdominant restart" }
    ],
    "6,4,1": [
      { chord_degree: 5, roman: "V", probability: 0.92, description: "Emotional 6415 cadence standard (六四一五标准结尾)" },
      { chord_degree: 7, roman: "bVII", probability: 0.05, description: "Modal interchange flat 7" },
      { chord_degree: 4, roman: "IV", probability: 0.03, description: "Plagal extension" }
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
    ]
  };

  const probs = modelProbs[cleanProg] || [
    { chord_degree: 4, roman: "IV", probability: 0.50, description: "Subdominant transition" },
    { chord_degree: 5, roman: "V", probability: 0.35, description: "Dominant tension" },
    { chord_degree: 1, roman: "I", probability: 0.15, description: "Tonic resolution" }
  ];

  return new Response(JSON.stringify({
    prefix_progression: cleanProg,
    next_chord_probabilities: probs
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
