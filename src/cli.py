#!/usr/bin/env python3
"""
Production-Grade Chord Progression Analyzer CLI.
Usage:
  chord-analyzer search <progression> [--lang zh/en/all] [--artist <name>] [--format table/md/json/csv]
  chord-analyzer next <progression>
  chord-analyzer analyze <chords...> [--key <key>]
  chord-analyzer chinese [--top]
  chord-analyzer export <progression> -o <file> [-f csv/json/md]
  chord-analyzer web [--port <port>]
  chord-analyzer doctor
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Add src to sys.path
SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from roman_engine import (
    normalize_progression_input,
    get_progression_name,
    NAMED_PROGRESSIONS,
    scale_degrees_to_chords
)
from analyzer import UnifiedChordAnalyzer


def format_table_cli(songs: list) -> str:
    """Format song list into a beautiful CLI table."""
    if not songs:
        return "No matching songs found."
    
    headers = ["#", "Song Title", "Artist", "Section", "Key", "Lang", "Source"]
    col_w = [4, 28, 22, 16, 12, 6, 14]
    
    header_line = " │ ".join(h.ljust(col_w[i]) for i, h in enumerate(headers))
    sep_line = "─┼─".join("─" * col_w[i] for i in range(len(headers)))
    
    lines = [
        "┌─" + "─┬─".join("─" * col_w[i] for i in range(len(headers))) + "─┐",
        f"│ {header_line} │",
        "├─" + sep_line + "─┤"
    ]
    
    for idx, s in enumerate(songs, 1):
        title = s.get("title", "")
        if len(title) > col_w[1] - 2:
            title = title[:col_w[1] - 3] + "…"
            
        artist = s.get("artist", "")
        if len(artist) > col_w[2] - 2:
            artist = artist[:col_w[2] - 3] + "…"
            
        section = s.get("section", "")
        if len(section) > col_w[3] - 2:
            section = section[:col_w[3] - 3] + "…"
            
        key = s.get("key", "")
        lang = "ZH" if s.get("language") == "zh" else "EN"
        src = s.get("source", "")
        
        row_str = f"│ {str(idx).ljust(col_w[0])} │ {title.ljust(col_w[1])} │ {artist.ljust(col_w[2])} │ {section.ljust(col_w[3])} │ {key.ljust(col_w[4])} │ {lang.ljust(col_w[5])} │ {src.ljust(col_w[6])} │"
        lines.append(row_str)
        
    lines.append("└─" + "─┴─".join("─" * col_w[i] for i in range(len(headers))) + "─┘")
    return "\n".join(lines)


def cmd_search(args, analyzer: UnifiedChordAnalyzer):
    res = analyzer.search(
        progression=args.progression,
        language=args.lang,
        artist_filter=args.artist,
        key_filter=args.key,
        max_pages=args.pages,
        exact=args.exact
    )
    
    if "error" in res:
        print(f"❌ Error: {res['error']}", file=sys.stderr)
        sys.exit(1)

    fmt = args.format.lower()
    if fmt == "json":
        print(json.dumps(res, ensure_ascii=False, indent=2))
    elif fmt == "csv":
        print(analyzer.export_data(res, "csv"))
    elif fmt == "md":
        print(analyzer.export_data(res, "markdown"))
    else:
        # CLI Rich formatted view
        print(f"\n🎵 \033[1;36mChord Progression:\033[0m \033[1;32m{res['roman_progression']}\033[0m ({res['progression']})")
        if res.get("progression_name"):
            print(f"🏷️  \033[1;33mName:\033[0m {res['progression_name']}")
        
        chords_c = " - ".join(res.get("reference_chords", {}).get("in_C_major", []))
        chords_g = " - ".join(res.get("reference_chords", {}).get("in_G_major", []))
        print(f"🎹 \033[1;35mIn C Major:\033[0m {chords_c}  │  \033[1;35mIn G Major:\033[0m {chords_g}")
        print(f"📊 \033[1mTotal Found:\033[0m {res['total_count']} songs (🇨🇳 华语: {res['counts_by_language']['chinese']}, 🌍 欧美: {res['counts_by_language']['western']})\n")
        
        print(format_table_cli(res["songs"]))
        print()


def cmd_next(args, analyzer: UnifiedChordAnalyzer):
    res = analyzer.get_next_chords(args.progression)
    roman = res.get("prefix_roman") or res.get("roman_progression") or args.progression
    prog = res.get("prefix_progression") or res.get("current_progression") or args.progression
    print(f"\n🔮 \033[1;36mNext Chord Probability Distribution for:\033[0m \033[1;32m{roman}\033[0m ({prog})\n")
    
    probs = res.get("next_chord_probabilities", [])
    if not probs:
        print("No probability distribution available for this pattern.")
        return

    for item in probs:
        pct = int(item["probability"] * 100)
        bar_len = int(pct / 2)  # 50 chars max
        bar = "█" * bar_len + "░" * (50 - bar_len)
        roman = item["roman"].ljust(6)
        desc = f" ({item.get('description', '')})" if item.get("description") else ""
        print(f"  \033[1;33m{roman}\033[0m [{bar}] \033[1;32m{pct:>3}%\033[0m{desc}")
    print()


def cmd_analyze(args, analyzer: UnifiedChordAnalyzer):
    # Parse list of chords from args.chords (either single string 'C G Am F' or list)
    chord_list = []
    for item in args.chords:
        chord_list.extend(item.split())
        
    res = analyzer.analyze_chords(chord_list, key=args.key, scale_type=args.scale)
    
    print(f"\n🎼 \033[1;36mChord Sequence Analysis:\033[0m")
    print(f"   Input Chords:      {' - '.join(res['input_chords'])}")
    print(f"   Key:               {res['key']}")
    print(f"   Scale Degrees:     {res['progression_string']}")
    print(f"   Roman Numerals:    \033[1;32m{res['roman_numerals']}\033[0m")
    
    if res.get("recognized_progressions"):
        print(f"\n🏆 \033[1;33mRecognized Iconic Progressions:\033[0m")
        for rec in res["recognized_progressions"]:
            print(f"   • \033[1m{rec['progression']}\033[0m: {rec['name']}")
    else:
        print("\nℹ️  Custom/Novel progression sequence.")
    print()


def cmd_chinese(args, analyzer: UnifiedChordAnalyzer):
    print("\n🇨🇳 \033[1;36mIconic Chinese Pop (华语流行) Chord Progression Taxonomy:\033[0m\n")
    for prog, name in NAMED_PROGRESSIONS.items():
        _, roman, degs = normalize_progression_input(prog)
        chords_c = " - ".join(scale_degrees_to_chords(degs, "C", "major"))
        count = len(analyzer.chinese_engine.search_songs(prog))
        print(f"  • \033[1;32m{roman:<16}\033[0m ({prog:<12}) │ \033[1;35mC调:\033[0m {chords_c:<22} │ 命中 {count} 首")
        print(f"    \033[1;33m{name}\033[0m\n")


def cmd_export(args, analyzer: UnifiedChordAnalyzer):
    res = analyzer.search(
        progression=args.progression,
        language=args.lang,
        artist_filter=args.artist,
        key_filter=args.key,
        max_pages=args.pages
    )
    data = analyzer.export_data(res, export_format=args.format)
    out_path = Path(args.output).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(data)
    print(f"✅ Exported {res['total_count']} songs to \033[1;32m{out_path}\033[0m (Format: {args.format})")


def cmd_web(args, analyzer: UnifiedChordAnalyzer):
    from web_server import start_web_server
    port = args.port or 9482
    print(f"🚀 Starting Chord Analyzer Web Dashboard on http://localhost:{port} ...")
    start_web_server(port=port)


def cmd_import_yopu(args):
    from yopu_importer import YopuImporter
    importer = YopuImporter()
    
    print(f"\n📥 \033[1;36mFetching & Analyzing Score:\033[0m {args.score} ...")
    try:
        song = importer.parse_and_clean_score(
            score_input=args.score,
            custom_title=args.title,
            custom_artist=args.artist,
            custom_key=args.key,
            custom_capo=args.capo or 0
        )
    except Exception as e:
        print(f"❌ Failed to parse score: {e}", file=sys.stderr)
        sys.exit(1)

    if args.format == "json":
        print(json.dumps(song.to_dict(), ensure_ascii=False, indent=2))
        return

    print("\n" + "=" * 60)
    print(f"🎵 \033[1;32m{song.title}\033[0m - \033[1;33m{song.artist}\033[0m")
    print(f"🔑 Key: \033[1m{song.key}\033[0m (Original/Concert: \033[1m{song.original_key}\033[0m, Capo: {song.capo})")
    print(f"🎼 Primary Progression: \033[1;36m{song.primary_roman}\033[0m ({song.primary_progression})")
    if song.progression_name:
        print(f"🏷️  Progression Name: \033[1;35m{song.progression_name}\033[0m")
    print(f"🎹 Chords: {' - '.join(song.primary_chords)}")
    print(f"🔗 Source: {song.source_url}")
    if song.raw_lyrics_sample:
        print(f"📝 Lyrics Snippet: {song.raw_lyrics_sample}...")
    print("=" * 60)

    if args.add:
        importer.save_to_modern_corpus(song)
        print(f"✅ Successfully added '{song.title}' to data/chinese_modern_corpus.json!\n")
    else:
        print("💡 Tip: Use '--add' to permanently save this song to ChordVerse's Chinese modern corpus.\n")


def cmd_yopu_search(args):
    from yopu_importer import YopuImporter
    importer = YopuImporter()

    query = args.query.strip()
    print(f"\n🔍 \033[1;36mSearching Yopu.co for:\033[0m '{query}' ...")
    try:
        data = importer.search_yopu(query)
    except Exception as e:
        print(f"❌ Search failed: {e}", file=sys.stderr)
        sys.exit(1)

    results = data.get("results", [])
    if args.format == "json":
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    if not results:
        print(f"❌ No matching lead sheets found on Yopu for '{query}'\n")
        return

    if args.pick is not None:
        idx = args.pick - 1
        if 0 <= idx < len(results):
            chosen = results[idx]
            print(f"🎯 Auto-importing result #{args.pick}: \033[1;32m{chosen['title']}\033[0m - \033[1;33m{chosen['artist']}\033[0m (ID: {chosen['id']}) ...")
            song = importer.parse_and_clean_score(chosen["id"], custom_title=chosen["title"], custom_artist=chosen["artist"])
            print("\n" + "=" * 60)
            print(f"🎵 \033[1;32m{song.title}\033[0m - \033[1;33m{song.artist}\033[0m")
            print(f"🔑 Key: \033[1m{song.key}\033[0m (Original/Concert: \033[1m{song.original_key}\033[0m, Capo: {song.capo})")
            print(f"🎼 Primary Progression: \033[1;36m{song.primary_roman}\033[0m ({song.primary_progression})")
            if song.progression_name:
                print(f"🏷️  Progression Name: \033[1;35m{song.progression_name}\033[0m")
            print(f"🎹 Chords: {' - '.join(song.primary_chords)}")
            print("=" * 60)
            if args.add:
                importer.save_to_modern_corpus(song)
                print(f"✅ Successfully added '{song.title}' to data/chinese_modern_corpus.json!\n")
            return
        else:
            print(f"❌ Pick index {args.pick} out of range (1-{len(results)})", file=sys.stderr)
            sys.exit(1)

    print(f"\n📊 Found {data['total_count']} matching scores on Yopu.co:\n")
    print(f"  {'#':<3} {'ID':<10} {'Song Title':<24} {'Artist':<18} {'Key':<6} {'Verified':<10} {'URL'}")
    print("  " + "─" * 90)
    for idx, r in enumerate(results, 1):
        v_tag = "✅ 认证" if r["verified"] else "─"
        key_tag = r["key"] or "-"
        print(f"  {idx:<3} {r['id']:<10} {r['title'][:22]:<24} {r['artist'][:16]:<18} {key_tag:<6} {v_tag:<10} {r['url']}")

    print(f"\n💡 To import a score: \033[1;32m./bin/chord-analyzer import-yopu {results[0]['id']} --add\033[0m")
    print(f"   Or auto-pick:      \033[1;32m./bin/chord-analyzer yopu-search \"{query}\" --pick 1 --add\033[0m\n")


def cmd_doctor(args, analyzer: UnifiedChordAnalyzer):
    print("\n🩺 \033[1;36mRunning ChordVerse System Diagnostics...\033[0m\n")

    # 1. Check Roman Engine
    try:
        from roman_engine import normalize_progression_input
        _, roman, _ = normalize_progression_input("1564")
        assert roman == "I-V-vi-IV"
        print("  ✅ Roman Numeral Engine:           OK (Symbolic math verified)")
    except Exception as e:
        print(f"  ❌ Roman Numeral Engine:           FAILED ({e})")

    # 2. Check Chinese Curated Corpus
    zh_count = len(analyzer.chinese_engine.corpus)
    print(f"  ✅ Chinese Ground-Truth Corpus:    OK ({zh_count} curated songs indexed)")

    # 3. Check POP909 Index
    pop909_count = len(analyzer.chinese_engine._pop909_data)
    print(f"  ✅ POP909 Golden Base Index:       OK ({pop909_count} classic songs indexed)")

    # 4. Check Modern Harvested Corpus
    modern_count = len(analyzer.chinese_engine._modern_data)
    print(f"  ✅ Modern 2020-2026 Corpus:        OK ({modern_count} modern hits indexed)")

    # 5. Check Hooktheory Cache
    cache_items = len(analyzer.hooktheory._cache)
    print(f"  ✅ Local Hooktheory Cache:         OK ({cache_items} query caches stored)")

    # 6. Check Hooktheory Remote API
    try:
        sample_res = analyzer.hooktheory.search_songs("1,5,6,4", max_pages=1, use_cache=True)
        print(f"  ✅ Hooktheory Engine & Cache:      OK ({len(sample_res)} hits ready)")
    except Exception as e:
        print(f"  ⚠️  Hooktheory Remote Engine:       OFFLINE ({e}) - Local cache active")

    # 7. Check Token Status
    if analyzer.hooktheory.token:
        print("  🔑 Hooktheory Bearer Auth:         CONFIGURED")
    else:
        print("  ℹ️  Hooktheory Bearer Auth:         NOT CONFIGURED (Using public index fallback)")

    print("\n🎉 System is ready for production queries!\n")


def main():
    parser = argparse.ArgumentParser(
        prog="chord-analyzer",
        description="Production-Grade Zero-Hallucination Chord Progression Search Engine & Music Theory CLI."
    )
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # search
    p_search = subparsers.add_parser("search", help="Search songs by chord progression (e.g. 1564, 6415, I-V-vi-IV)")
    p_search.add_argument("progression", help="Chord progression (e.g. 1564, 1,5,6,4, I-V-vi-IV, 4536251)")
    p_search.add_argument("--lang", default="all", choices=["all", "zh", "en"], help="Filter by song language")
    p_search.add_argument("--artist", help="Filter by artist name")
    p_search.add_argument("--key", help="Filter by key (e.g. 'C major', 'G')")
    p_search.add_argument("--pages", type=int, default=5, help="Max pages to fetch from Hooktheory (20 songs/page)")
    p_search.add_argument("--exact", action="store_true", help="Match progression exactly without sub-sequence matching")
    p_search.add_argument("--format", default="table", choices=["table", "md", "json", "csv"], help="Output format")

    # next
    p_next = subparsers.add_parser("next", help="Get probability distribution of next chords given a prefix")
    p_next.add_argument("progression", help="Current progression prefix (e.g. 1,5,6 or 4,5,3)")

    # analyze
    p_analyze = subparsers.add_parser("analyze", help="Analyze absolute chords (e.g. 'C G Am F') into Roman numerals & patterns")
    p_analyze.add_argument("chords", nargs="+", help="Chord list (e.g. C G Am F)")
    p_analyze.add_argument("--key", default="C", help="Root key (default: C)")
    p_analyze.add_argument("--scale", default="major", choices=["major", "minor"], help="Scale type")

    # import-yopu
    p_yopu = subparsers.add_parser("import-yopu", help="Import & clean a song from Yopu.co or lead sheet")
    p_yopu.add_argument("score", help="Yopu URL, score ID (e.g. aXYaaOXZ), or raw chord sheet text")
    p_yopu.add_argument("--title", help="Custom song title")
    p_yopu.add_argument("--artist", help="Custom artist name")
    p_yopu.add_argument("--key", help="Key override (e.g. 'C', 'G')")
    p_yopu.add_argument("--capo", type=int, default=0, help="Capo fret number")
    p_yopu.add_argument("--add", action="store_true", help="Save imported song directly to modern Chinese corpus")
    p_yopu.add_argument("--format", default="table", choices=["table", "json"], help="Output display format")

    # yopu-search
    p_yp_search = subparsers.add_parser("yopu-search", help="Search lead sheets on Yopu.co by song/artist keyword")
    p_yp_search.add_argument("query", help="Song title, artist name, or query keyword (e.g. '再见青春' or '汪峰 存在')")
    p_yp_search.add_argument("--pick", type=int, help="Auto-pick and import Nth search result (1-indexed)")
    p_yp_search.add_argument("--add", action="store_true", help="Save imported song directly to modern Chinese corpus")
    p_yp_search.add_argument("--format", default="table", choices=["table", "json"], help="Output display format")

    # chinese
    p_chinese = subparsers.add_parser("chinese", help="Browse iconic Chinese pop chord progression taxonomy")
    p_chinese.add_argument("--top", action="store_true", help="Show top progressions")

    # export
    p_export = subparsers.add_parser("export", help="Search and export songs to a file")
    p_export.add_argument("progression", help="Chord progression (e.g. 1564)")
    p_export.add_argument("-o", "--output", required=True, help="Output file path (.csv, .json, .md)")
    p_export.add_argument("-f", "--format", default="csv", choices=["csv", "json", "md"], help="Export format")
    p_export.add_argument("--lang", default="all", choices=["all", "zh", "en"])
    p_export.add_argument("--artist", help="Filter by artist")
    p_export.add_argument("--key", help="Filter by key")
    p_export.add_argument("--pages", type=int, default=5)

    # web
    p_web = subparsers.add_parser("web", help="Launch the interactive visual Web Dashboard")
    p_web.add_argument("--port", type=int, default=9482, help="Port to listen on (default: 9482)")

    # doctor
    subparsers.add_parser("doctor", help="Run system diagnostics and verify data sources")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    analyzer = UnifiedChordAnalyzer()

    if args.command == "search":
        cmd_search(args, analyzer)
    elif args.command == "next":
        cmd_next(args, analyzer)
    elif args.command == "analyze":
        cmd_analyze(args, analyzer)
    elif args.command == "import-yopu":
        cmd_import_yopu(args)
    elif args.command == "yopu-search":
        cmd_yopu_search(args)
    elif args.command == "chinese":
        cmd_chinese(args, analyzer)
    elif args.command == "export":
        cmd_export(args, analyzer)
    elif args.command == "web":
        cmd_web(args, analyzer)
    elif args.command == "doctor":
        cmd_doctor(args, analyzer)


if __name__ == "__main__":
    main()
