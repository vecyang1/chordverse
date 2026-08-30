#!/usr/bin/env python3
"""
Zero-Dependency MCP (Model Context Protocol) Server for ChordVerse.
Exposes zero-hallucination music theory tools over stdio for AI agents.
"""

import json
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from analyzer import UnifiedChordAnalyzer
from roman_engine import NAMED_PROGRESSIONS

ANALYZER = UnifiedChordAnalyzer()

TOOLS = [
    {
        "name": "search_chord_progression",
        "description": "Search real songs matching a chord progression (e.g. '1564', '1,5,6,4', '6,4,1,5', '4,5,3,6,2,5,1', 'I-V-vi-IV') across 75,000+ Western pop songs (Hooktheory) and curated Chinese pop (周杰伦/五月天/POP909).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "progression": {
                    "type": "string",
                    "description": "Scale degrees or Roman numerals e.g. '1564', '1,5,6,4', 'I-V-vi-IV', '4536251'"
                },
                "language": {
                    "type": "string",
                    "enum": ["all", "zh", "en"],
                    "default": "all",
                    "description": "Filter by language: 'zh' (Chinese), 'en' (Western), 'all'"
                },
                "artist": {
                    "type": "string",
                    "description": "Optional artist filter (e.g. '周杰伦', 'Taylor Swift')"
                },
                "key": {
                    "type": "string",
                    "description": "Optional key filter (e.g. 'C major', 'G')"
                }
            },
            "required": ["progression"]
        }
    },
    {
        "name": "predict_next_chords",
        "description": "Get probability distribution and music theory analysis of next chords given a progression prefix (e.g. '1,5,6' -> 78% probability of '4 / IV').",
        "inputSchema": {
            "type": "object",
            "properties": {
                "progression": {
                    "type": "string",
                    "description": "Chord sequence prefix e.g. '1,5,6' or '4,5,3' or '6,4'"
                }
            },
            "required": ["progression"]
        }
    },
    {
        "name": "analyze_chord_sheet",
        "description": "Analyze an arbitrary chord list (e.g. 'F G Em Am Dm G C'), convert to Roman numerals, detect key, and recognize classic industry patterns (Royal Road, Canon, 4-chord, 50s).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "chords": {
                    "type": "string",
                    "description": "Space-separated chords e.g. 'F G Em Am Dm G C' or 'C G Am F'"
                },
                "key": {
                    "type": "string",
                    "default": "C",
                    "description": "Key center e.g. 'C', 'G', 'D', 'F'"
                },
                "scale": {
                    "type": "string",
                    "enum": ["major", "minor"],
                    "default": "major",
                    "description": "Scale type"
                }
            },
            "required": ["chords"]
        }
    },
    {
        "name": "list_named_progressions",
        "description": "List all iconic industry chord progressions (Axis of Awesome 1564, Royal Road 4536251, Canon 15634125, Doo-Wop 1645, etc.) with their standard chords in C and G major.",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "import_yopu_song",
        "description": "Import, clean, and extract harmonic progressions from a Yopu URL, score ID (e.g. 'aXYaaOXZ'), or lead sheet with Capo compensation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "score": {
                    "type": "string",
                    "description": "Yopu URL, ID, or raw lead sheet text"
                },
                "add_to_corpus": {
                    "type": "boolean",
                    "default": False,
                    "description": "Whether to permanently save to modern Chinese corpus"
                },
                "key": {
                    "type": "string",
                    "description": "Optional key override"
                },
                "capo": {
                    "type": "integer",
                    "default": 0,
                    "description": "Capo fret offset"
                }
            },
            "required": ["score"]
        }
    },
    {
        "name": "search_yopu_scores",
        "description": "Search song lead sheets on Yopu.co by keyword (title/artist). Returns matching scores with ID, Key, and URL.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Song title or artist search query (e.g. '再见青春' or '周杰伦 晴天')"
                },
                "instrument": {
                    "type": "string",
                    "enum": ["guitar", "ukulele", "piano"],
                    "default": "guitar",
                    "description": "Target instrument (default: guitar)"
                }
            },
            "required": ["query"]
        }
    }
]


def handle_tool_call(name: str, arguments: dict) -> dict:
    if name == "search_chord_progression":
        prog = arguments.get("progression", "1,5,6,4")
        lang = arguments.get("language", "all")
        artist = arguments.get("artist")
        key = arguments.get("key")
        res = ANALYZER.search(prog, language=lang, artist_filter=artist, key_filter=key)
        return {
            "content": [
                {"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}
            ]
        }

    elif name == "predict_next_chords":
        prog = arguments.get("progression", "1,5,6")
        res = ANALYZER.get_next_chords(prog)
        return {
            "content": [
                {"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}
            ]
        }

    elif name == "analyze_chord_sheet":
        chords_str = arguments.get("chords", "")
        key = arguments.get("key", "C")
        scale = arguments.get("scale", "major")
        chords = chords_str.split()
        res = ANALYZER.analyze_chords(chords, key=key, scale_type=scale)
        return {
            "content": [
                {"type": "text", "text": json.dumps(res, ensure_ascii=False, indent=2)}
            ]
        }

    elif name == "list_named_progressions":
        items = []
        for k, v in NAMED_PROGRESSIONS.items():
            items.append({"progression": k, "name": v})
        return {
            "content": [
                {"type": "text", "text": json.dumps(items, ensure_ascii=False, indent=2)}
            ]
        }

    elif name == "import_yopu_song":
        from yopu_importer import YopuImporter
        importer = YopuImporter()
        score = arguments.get("score", "")
        add = arguments.get("add_to_corpus", False)
        custom_key = arguments.get("key")
        capo = arguments.get("capo", 0)
        song = importer.parse_and_clean_score(score, custom_key=custom_key, custom_capo=capo)
        if add:
            importer.save_to_modern_corpus(song)
        return {
            "content": [
                {"type": "text", "text": json.dumps(song.to_dict(), ensure_ascii=False, indent=2)}
            ]
        }

    elif name == "search_yopu_scores":
        from yopu_importer import YopuImporter
        importer = YopuImporter()
        query = arguments.get("query", "")
        instrument = arguments.get("instrument", "guitar")
        data = importer.search_yopu(query, instrument=instrument)
        return {
            "content": [
                {"type": "text", "text": json.dumps(data, ensure_ascii=False, indent=2)}
            ]
        }

    raise ValueError(f"Unknown tool: {name}")


def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            req = json.loads(line)
            req_id = req.get("id")
            method = req.get("method")

            if method == "initialize":
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"tools": {}},
                        "serverInfo": {"name": "chord-analyzer-mcp", "version": "1.0.0"}
                    }
                }
            elif method == "tools/list":
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"tools": TOOLS}
                }
            elif method == "tools/call":
                params = req.get("params", {})
                name = params.get("name")
                args = params.get("arguments", {})
                result = handle_tool_call(name, args)
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": result
                }
            else:
                resp = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {}
                }

            sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
            sys.stdout.flush()

        except Exception as e:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": str(e)}
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
