# Handoff: Chord Progression Analyzer (ChordVerse)

## Summary for Successive Agents
- **Project Location**: `/Users/vecsatfoxmailcom/Documents/Cowork/Antigravity Cowork/26.08.29 Chord Progression Analyzer`
- **Project Index ID**: `cowork-26-08-29-chord-progression-analyzer-74b2adac`
- **Executable CLI**: `./bin/chord-analyzer`
- **Web Dashboard**: `http://localhost:9482` (Daemon running or launch with `./bin/chord-analyzer web --port 9482`)
- **Key Modules**:
  - `src/roman_engine.py`: Symbolic music theory & Roman numeral math.
  - `src/hooktheory_client.py`: Hooktheory 75,000+ song client with caching.
  - `src/chinese_corpus.py` & `src/pop909_engine.py`: Chinese Pop & POP909 dataset engine.
  - `src/analyzer.py`: Unified multi-lingual search & export aggregator.
  - `src/web_server.py` & `src/static/`: Web server and reactive frontend.
- **Verification Command**:
  ```bash
  python3 -m unittest discover -s tests
  ```
