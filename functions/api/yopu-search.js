export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = url.searchParams.get("q") || "";
  const page = url.searchParams.get("page") || "0";
  const instrument = url.searchParams.get("instrument") || "guitar";

  if (!q.trim()) {
    return new Response(JSON.stringify({ query: q, total: 0, total_count: 0, results: [] }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    const yopuUrl = `https://yopu.co/api/search/sheets?q=${encodeURIComponent(q)}&page=${page}&instrument=${instrument}`;
    const resp = await fetch(yopuUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://yopu.co/explore"
      }
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ query: q, total: 0, total_count: 0, results: [], error: `Yopu returned HTTP ${resp.status}` }), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    }

    const data = await resp.json();
    const rawResults = data.results || [];
    const formatted = rawResults
      .filter(item => item && (item._id || item.id))
      .map(item => {
        const id = item._id || item.id;
        return {
          id: id,
          title: item.title || "未知曲目",
          artist: item.artist || "未知歌手",
          key: item.key || item.originalKey || "-",
          capo: item.capo ?? 0,
          author: item.author?.name || item.author || "有谱么曲谱",
          verified: Boolean(item.verified || item.isVerified),
          views: item.views || 0,
          favCount: item.favCount || 0,
          url: `https://yopu.co/view/${id}`
        };
      });

    const totalNum = data.totalResultNum || formatted.length;

    return new Response(JSON.stringify({
      query: q,
      total: totalNum,
      total_count: totalNum,
      results: formatted
    }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ query: q, total: 0, total_count: 0, results: [], error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  }
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
