# Product Requirements Document (PRD): ChordVerse

## 1. Executive Summary
ChordVerse is an agentic, zero-hallucination chord progression search and music theory analysis engine. It eliminates LLM hallucinations when discovering songs that adhere to harmonic structures (like 1-5-6-4, 6-4-1-5, 4-5-3-6-2-5-1 Royal Road, and Pachelbel's Canon).

## 2. Core Users & Use Cases
1. **Songwriters & Producers**: Discovering reference tracks and analyzing harmonic transition probabilities when drafting hooks.
2. **Music Enthusiasts & Guitarists**: Finding songs that share the same 4-chord or Royal Road loops to play and sing.
3. **AI Agents & Data Pipelines**: Consuming structured, verifiable harmonic datasets without generative hallucinations.

## 3. Functional Requirements
- **FR-1**: Fast search across 75,000+ Western songs and curated Chinese pop songs by scale degree string (`1564`, `1,5,6,4`, `I-V-vi-IV`).
- **FR-2**: Next-chord probability tree prediction based on statistical transition distributions.
- **FR-3**: Chord sheet decoder converting raw chords (`F G Em Am`) into Roman numerals and identifying classic patterns.
- **FR-4**: Dual CLI and Web dashboard interfaces.
- **FR-5**: 1-click export to CSV, JSON, Markdown.
