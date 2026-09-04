/**
 * Unit tests for the /api/search Cloudflare Pages Function.
 *
 * `fetch` is replaced with a fake that serves small corpora from memory, so the
 * matching rules are exercised without the network. Degree queries with
 * lang=zh never reach Hooktheory; the fake throws if anything else is fetched.
 *
 * Run: node --test 'tests/functions/*.test.mjs'
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  onRequestGet,
  matchSong,
  countOccurrences,
  parseDegreeSequence,
  sortByEvidence,
  keyMatches,
  MIN_SEQUENCE_OCCURRENCES
} from "../../functions/api/search.js";

const ORIGIN = "https://chord.example.test";
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

const CURATED = [
  { id: "zh_1", title: "怒放的生命", artist: "汪峰", key: "C major", section: "Chorus", progression: "1,5,6,4", roman: "I-V-vi-IV", chords: ["C", "G", "Am", "F"] },
  { id: "zh_2", title: "青花瓷", artist: "周杰伦", key: "F major", section: "Chorus", progression: "4,5,3,6,2,5,1", roman: "IV-V-iii-vi-ii-V-I", chords: ["Bb", "C", "Am", "Dm", "Gm", "C", "F"] }
];
const POP909 = [
  // 6-4-1-5 loop: a rotation of 1-5-6-4.
  { id: "pop909_a", title: "晴天", artist: "周杰伦", key: "G major", analysis_key: "G major", section: "Main Loop", progression: "6,4,1,5", roman: "vi-IV-I-V", chords: ["Em", "C", "G", "D"], loop_repetitions: 11, degree_sequence: "6,4,1,5,6,4,1,5,6,4,1,5,x,1,4,5" },
  // Primary loop is 4 chords, but the 8-chord Canon recurs twice in the verse.
  { id: "pop909_b", title: "卡农歌", artist: "某人", key: "D major", analysis_key: "D major", section: "Main Loop", progression: "1,4,5,1", roman: "I-IV-V-I", chords: ["D", "G", "A", "D"], loop_repetitions: 9, degree_sequence: "1,5,6,3,4,1,2,5,1,5,6,3,4,1,2,5,x,1,4,5,1,1,4,5,1,1,4,5,1" },
  // Minor-key song analysed in its relative major.
  { id: "pop909_c", title: "小调歌", artist: "歌手", key: "A minor", analysis_key: "C major", section: "Main Loop", progression: "6,2,5,1", roman: "vi-ii-V-I", chords: ["Am", "Dm", "G", "C"], loop_repetitions: 4, degree_sequence: "6,2,5,1,6,2,5,1,6,2,5,1,6,2,5,1" },
  // Contains 1,5,6,4 exactly once in the sequence: NOT enough evidence.
  { id: "pop909_d", title: "偶遇歌", artist: "歌手", key: "C major", analysis_key: "C major", section: "Main Loop", progression: "2,5,1,4", roman: "ii-V-I-IV", chords: ["Dm", "G", "C", "F"], loop_repetitions: 6, degree_sequence: "2,5,1,4,2,5,1,4,1,5,6,4,2,5,1,4" }
];
const MODERN = [
  { id: "modern_1", title: "漠河舞厅", artist: "柳爽", key: "G major", primary_progression: "4,5,3,6,2,5,1", primary_roman: "IV-V-iii-vi-ii-V-I", primary_chords: ["C", "D", "Bm", "Em", "Am", "D", "G"], source_url: "https://yopu.co/view/x" }
];
const WESTERN = [
  { id: "en_1", title: "Let It Be", artist: "The Beatles", key: "C major", section: "Chorus", progression: "1,5,6,4", roman: "I-V-vi-IV", chords: ["C", "G", "Am", "F"], ytid: "abc" }
];
const TAXONOMY = { "1,5,6,4": "流行四和弦", "4,5,3,6,2,5,1": "王道进行" };

function serveCorpora() {
  const calls = [];
  const assets = {
    "/data/chinese_corpus.json": CURATED,
    "/data/pop909_indexed_chords.json": POP909,
    "/data/chinese_modern_corpus.json": MODERN,
    "/data/western_corpus.json": WESTERN,
    "/data/named_progressions.json": TAXONOMY
  };
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const pathName = new URL(url).pathname;
    if (!(pathName in assets)) throw new Error(`unexpected fetch ${url}`);
    return new Response(JSON.stringify(assets[pathName]), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  return calls;
}

async function call(query) {
  const resp = await onRequestGet({ request: new Request(`${ORIGIN}/api/search?${query}`) });
  return { resp, body: await resp.json() };
}

test("countOccurrences / parseDegreeSequence / matchSong follow the loop-and-sequence rules", () => {
  assert.equal(countOccurrences([1, 5, 6, 4, 1, 5, 6, 4], [1, 5, 6, 4]), 2);
  assert.equal(countOccurrences([1, 5, 6], [1, 5, 6, 4]), 0);
  assert.deepEqual(parseDegreeSequence("1,5,6,4,x,2,5,1"), [[1, 5, 6, 4], [2, 5, 1]]);

  const loopSong = POP909[0];
  assert.deepEqual(matchSong(loopSong, [1, 5, 6, 4]), { kind: "loop", occurrences: 11 }, "rotation of the loop matches");
  assert.deepEqual(matchSong(loopSong, [6, 4, 1, 5]), { kind: "loop", occurrences: 11 });
  assert.equal(matchSong(loopSong, [2, 5, 1]), null);

  const canonSong = POP909[1];
  assert.deepEqual(matchSong(canonSong, [1, 5, 6, 3, 4, 1, 2, 5]), { kind: "sequence", occurrences: 2 });
  assert.equal(matchSong(POP909[3], [1, 5, 6, 4]), null, `a single occurrence is below MIN_SEQUENCE_OCCURRENCES=${MIN_SEQUENCE_OCCURRENCES}`);
  assert.equal(matchSong(loopSong, []), null);
});

test("1,5,6,4 finds curated loops, the 6-4-1-5 rotation, and orders by evidence", async () => {
  const calls = serveCorpora();
  const { resp, body } = await call("progression=1,5,6,4&lang=zh");
  assert.equal(resp.status, 200);
  assert.equal(calls.length, 5, "five same-origin assets, no Hooktheory call for a degree query");
  assert.equal(body.progression_name, "流行四和弦");
  assert.equal(body.roman_progression, "I-V-vi-IV");
  assert.equal(body.total_count, body.total_found);

  const ids = body.songs.map((s) => s.id);
  assert.deepEqual(ids, ["zh_1", "pop909_a"], `got ${ids}`);
  assert.equal(body.songs[1].match_kind, "loop");
  assert.equal(body.songs[1].analysis_key, "G major");
  assert.equal(body.songs[1].degree_sequence, undefined, "whole-song sequence is not shipped to the client");
  assert.deepEqual(body.match_summary, { loop: 2, sequence: 0 });
  assert.ok(!ids.includes("pop909_d"), "one stray occurrence is not a match");
  assert.ok(!ids.includes("en_1"), "lang=zh excludes western rows");
});

test("an 8-chord Canon query reaches a POP909 song through its whole-song sequence", async () => {
  serveCorpora();
  const { body } = await call("progression=1,5,6,3,4,1,2,5&lang=zh");
  const canon = body.songs.find((s) => s.id === "pop909_b");
  assert.ok(canon, "sequence match found");
  assert.equal(canon.match_kind, "sequence");
  assert.equal(canon.match_occurrences, 2);
  assert.deepEqual(body.match_summary, { loop: 0, sequence: 1 });
});

test("loop matches rank before sequence matches, hand-verified rows first", () => {
  const rows = [
    { id: "seq", source: "pop909_academic", match_kind: "sequence", match_occurrences: 9 },
    { id: "pop-loop-3", source: "pop909_academic", match_kind: "loop", match_occurrences: 3 },
    { id: "curated", source: "chinese_curated", match_kind: "loop", match_occurrences: 0 },
    { id: "pop-loop-12", source: "pop909_academic", match_kind: "loop", match_occurrences: 12 }
  ];
  assert.deepEqual(sortByEvidence(rows).map((r) => r.id), ["curated", "pop-loop-12", "pop-loop-3", "seq"]);
});

test("key filter matches the analysis key of a minor-key song", async () => {
  serveCorpora();
  const viaAnalysis = await call("progression=6,2,5,1&lang=zh&key=c%20major");
  assert.deepEqual(viaAnalysis.body.songs.map((s) => s.id), ["pop909_c"]);
  const viaLabel = await call("progression=6,2,5,1&lang=zh&key=a%20minor");
  assert.deepEqual(viaLabel.body.songs.map((s) => s.id), ["pop909_c"]);
  const none = await call("progression=6,2,5,1&lang=zh&key=e%20major");
  assert.equal(none.body.total_count, 0);
});

test("keyMatches compares whole keys, so B major never matches Db major", () => {
  assert.equal(keyMatches({ key: "Db major" }, "B major"), false);
  assert.equal(keyMatches({ key: "B major" }, "b major"), true);
  assert.equal(keyMatches({ key: "A minor", analysis_key: "C major" }, "C major"), true);
  assert.equal(keyMatches({ key: "A minor", analysis_key: "C major" }, "C"), true);
  assert.equal(keyMatches({ key: "A minor", analysis_key: "C major" }, "A"), true);
  assert.equal(keyMatches({ key: "Bb major" }, "B"), false);
  assert.equal(keyMatches({ key: "Bb major" }, ""), true);
});

test("the Royal Road query finds curated and modern rows and keeps the 7-chord name", async () => {
  serveCorpora();
  const { body } = await call("progression=4,5,3,6,2,5,1&lang=zh");
  assert.equal(body.progression_name, "王道进行");
  assert.deepEqual(body.songs.map((s) => s.id).sort(), ["modern_1", "zh_2"]);
  assert.equal(body.songs.find((s) => s.id === "modern_1").source_url, "https://yopu.co/view/x");
});

test("an empty query lists every row once, in corpus order", async () => {
  serveCorpora();
  const { body } = await call("progression=&lang=all");
  assert.equal(body.total_count, CURATED.length + POP909.length + MODERN.length + WESTERN.length);
  assert.match(body.progression_name, /全部曲库/);
  assert.equal(body.songs[0].id, "zh_1");
  assert.equal(body.matching, undefined);
});

test("a text query with lang=zh searches titles and artists without calling Hooktheory", async () => {
  const calls = serveCorpora();
  const { body } = await call("progression=%E5%91%A8%E6%9D%B0%E4%BC%A6&lang=zh");
  assert.equal(calls.length, 5);
  assert.deepEqual(body.songs.map((s) => s.id).sort(), ["pop909_a", "zh_2"]);
  assert.equal(body.songs[0].match_kind, "text");
});
