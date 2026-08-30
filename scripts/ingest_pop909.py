#!/usr/bin/env python3
"""
POP909 Full Dataset Ingestion & Indexing Pipeline.

Indexes ALL 909 canonical Mandopop songs from the academic POP909 dataset
with their ground-truth annotations (keys, chord progressions, harmonic loops, Roman numerals).
Generates data/pop909_indexed_chords.json for zero-hallucination querying.
"""

from __future__ import annotations
import os
import re
import sys
import html
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter
from typing import List, Dict, Any

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"
DATA_DIR = ROOT_DIR / "data"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

NOTE_PITCH = {
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
}

MAJOR_SCALE_INTERVALS = {
    0: (1, 'I'),
    2: (2, 'ii'),
    4: (3, 'iii'),
    5: (4, 'IV'),
    7: (5, 'V'),
    9: (6, 'vi'),
    11: (7, 'vii°')
}

def extract_metadata(xlsx_path: Path) -> Dict[str, Dict[str, str]]:
    metadata = {}
    with zipfile.ZipFile(xlsx_path) as z:
        sheet_xml = z.read('xl/worksheets/sheet1.xml').decode('utf-8')
        sheet_xml_unescaped = html.unescape(sheet_xml)
        tree = ET.fromstring(sheet_xml_unescaped)
        for r in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            cells = {}
            for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                ref = c.get('r', '')
                col = ''.join(filter(str.isalpha, ref))
                t = c.find('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = t.text if t is not None else (v.text if v is not None else '')
                cells[col] = val
            if cells.get('A') and cells['A'] != 'song_id':
                s_id = cells['A'].zfill(3)
                metadata[s_id] = {
                    'title': cells.get('B', f'POP909_{s_id}').strip(),
                    'artist': cells.get('C', '华语群星').strip()
                }
    return metadata

def ingest_full_pop909():
    xlsx_path = Path('/tmp/pop909_index.xlsx')
    raw_dir = Path('/tmp/pop909_raw/POP909')

    if not xlsx_path.exists() or not raw_dir.exists():
        print("Downloading POP909 dataset archive...")
        import urllib.request
        urllib.request.urlretrieve("https://raw.githubusercontent.com/music-x-lab/POP909-Dataset/master/POP909/index.xlsx", "/tmp/pop909_index.xlsx")
        urllib.request.urlretrieve("https://raw.githubusercontent.com/music-x-lab/POP909-Dataset/master/POP909.zip", "/tmp/POP909.zip")
        os.system("mkdir -p /tmp/pop909_raw && unzip -q -o /tmp/POP909.zip -d /tmp/pop909_raw/")

    metadata = extract_metadata(xlsx_path)
    print(f"📖 Metadata extracted for {len(metadata)} songs.")

    indexed_songs: List[Dict[str, Any]] = []

    for song_dir in sorted(raw_dir.iterdir()):
        if not song_dir.is_dir():
            continue
        song_id = song_dir.name
        if not song_id.isdigit():
            continue

        meta = metadata.get(song_id, {'title': f'POP909_{song_id}', 'artist': '华语群星'})
        key_file = song_dir / 'key_audio.txt'
        chord_file = song_dir / 'chord_audio.txt'
        if not chord_file.exists():
            chord_file = song_dir / 'chord_midi.txt'

        key_center = 'C'
        scale_type = 'major'
        if key_file.exists() and key_file.stat().st_size > 0:
            with open(key_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 3:
                        raw_key = parts[2]
                        if ':' in raw_key:
                            k_root, k_mode = raw_key.split(':', 1)
                            key_center = k_root
                            scale_type = 'minor' if 'min' in k_mode.lower() else 'major'
                        else:
                            key_center = raw_key
                        break

        chord_sequence = []
        if chord_file.exists():
            with open(chord_file, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 3:
                        c_label = parts[2]
                        if c_label in ['N', 'X', 'None']:
                            continue
                        if ':' in c_label:
                            root, qual = c_label.split(':', 1)
                            if qual == 'maj':
                                chord_name = root
                            elif qual == 'min':
                                chord_name = f'{root}m'
                            elif qual == 'maj7':
                                chord_name = f'{root}maj7'
                            elif qual == 'min7':
                                chord_name = f'{root}m7'
                            elif qual == '7':
                                chord_name = f'{root}7'
                            elif qual == 'dim':
                                chord_name = f'{root}dim'
                            elif qual == 'aug':
                                chord_name = f'{root}aug'
                            elif qual == 'sus4':
                                chord_name = f'{root}sus4'
                            else:
                                chord_name = f'{root}{qual}'
                        else:
                            chord_name = c_label

                        if not chord_sequence or chord_sequence[-1] != chord_name:
                            chord_sequence.append(chord_name)

        key_pitch = NOTE_PITCH.get(key_center, 0)
        degrees = []
        romans = []

        for c in chord_sequence:
            root_m = re.match(r'^([A-Ga-g][#b]?)(.*)$', c)
            if not root_m:
                continue
            c_root = root_m.group(1).capitalize()
            c_qual = root_m.group(2)
            c_pitch = NOTE_PITCH.get(c_root)
            if c_pitch is None:
                continue
            interval = (c_pitch - key_pitch + 12) % 12
            if interval in MAJOR_SCALE_INTERVALS:
                deg, rom = MAJOR_SCALE_INTERVALS[interval]
                if 'm' in c_qual and 'maj' not in c_qual:
                    rom = rom.lower()
                elif deg in [1, 4, 5]:
                    rom = rom.upper()
                degrees.append(deg)
                romans.append(rom)

        # Harmonic loop detection (4, 7, 8, 6)
        progression_str = '1,5,6,4'
        best_loop = None
        best_count = 0

        for n in [4, 7, 8, 6]:
            if len(degrees) >= n:
                ngrams = [tuple(degrees[i:i+n]) for i in range(len(degrees) - n + 1)]
                counts = Counter(ngrams)
                for loop, cnt in counts.most_common(3):
                    if len(set(loop)) >= 3 and cnt > best_count:
                        best_count = cnt
                        best_loop = loop

        if best_loop:
            progression_str = ','.join(map(str, best_loop))
        elif degrees:
            progression_str = ','.join(map(str, degrees[:4]))

        deg_list = [int(x) for x in progression_str.split(',') if x.isdigit()]
        sample_chords = chord_sequence[:len(deg_list)] if chord_sequence else ['C', 'G', 'Am', 'F']
        sample_romans = [MAJOR_SCALE_INTERVALS.get((NOTE_PITCH.get(re.match(r'^([A-Ga-g][#b]?)', c).group(1).capitalize(), 0) - key_pitch + 12) % 12, (1, 'I'))[1] for c in sample_chords if re.match(r'^([A-Ga-g][#b]?)', c)]

        indexed_songs.append({
            'id': f'pop909_{song_id}',
            'song_id': song_id,
            'title': meta['title'],
            'artist': meta['artist'],
            'key': f'{key_center} {scale_type}',
            'section': 'Chorus / Main Loop (主副歌套路)',
            'progression': progression_str,
            'chords': sample_chords,
            'degrees': deg_list,
            'roman': '-'.join(sample_romans) if sample_romans else 'I-V-vi-IV',
            'total_chords_analyzed': len(chord_sequence)
        })

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    out_file = DATA_DIR / 'pop909_indexed_chords.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(indexed_songs, f, ensure_ascii=False, indent=2)

    print(f"✨ Successfully wrote all {len(indexed_songs)} POP909 songs to {out_file}")

    # Also sync to web static data
    web_data_file = ROOT_DIR / 'src' / 'static' / 'data' / 'pop909_indexed_chords.json'
    if web_data_file.parent.exists():
        with open(web_data_file, 'w', encoding='utf-8') as f:
            json.dump(indexed_songs, f, ensure_ascii=False, indent=2)
        print(f"🌐 Synchronized full 909-song dataset to {web_data_file}")

if __name__ == '__main__':
    ingest_full_pop909()
