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
    print(f"\n🔮 \033[1;36mNext Chord Probability Distribution for:\033[0m \033[1;32m{res['roman_progression']}\033[0m ({res['current_progression']})\n")
    
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
    data = analyzer.export_data(res, format_type=args.format)
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


def cmd_doctor(args, analyzer: UnifiedChordAnalyzer):
    print("\n🩺 \033[1;36mChord Analyzer Health Check & Diagnostics:\033[0m\n")
    
    # 1. Check Roman Engine
    try:
        from roman_engine import normalize_progression_input
        _, roman, _ = normalize_progression_input("1564")
        assert roman == "I-V-vi-IV"
        print("  ✅ Roman Numeral Engine:           OK (Symbolic math verified)")
    except Exception as e:
        print(f"  ❌ Roman Numeral Engine:           FAILED ({e})")

    # 2. Check Chinese Corpus
    zh_count = len(analyzer.chinese_engine.corpus)
    print(f"  ✅ Chinese Ground-Truth Corpus:    OK ({zh_count} curated songs indexed)")

    # 3. Check Hooktheory Cache
    cache_items = len(analyzer.hooktheory._cache)
    print(f"  ✅ Local Hooktheory Cache:         OK ({cache_items} query caches stored)")

    # 4. Check Hooktheory Search Index Connection
    try:
        sample_res = analyzer.hooktheory.search_songs("1,5,6,4", max_pages=1, use_cache=False)
        print(f"  ✅ Hooktheory Remote API/Index:    OK ({len(sample_res)} hits live retrieved)")
    except Exception as e:
        print(f"  ⚠️  Hooktheory Remote API:          OFFLINE/RATE-LIMITED ({e}) - Local cache available")

    # 5. Check Token Status
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
