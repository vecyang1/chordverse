/**
 * Unit tests for the /api/next Cloudflare Pages Function.
 *
 * The Function reads /data/next_chord_model.json from its own origin; here
 * `fetch` is replaced so the real committed model (or a failure) is served.
 *
 * Run: node --test 'tests/functions/*.test.mjs'
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  onRequestGet,
  parsePrefixDegrees,
  resolveContext,
  predictFromModel,
  MIN_SONGS_FOR_CONTEXT,
  SOURCE_CORPUS,
  SOURCE_HEURISTIC
} from "../../functions/api/next.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL_FILE = path.resolve(HERE, "../../src/static/data/next_chord_model.json");
const MODEL = JSON.parse(readFileSync(MODEL_FILE, "utf8"));
const ORIGIN = "https://chord.example.test";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function serveModel(status = 200, body = MODEL) {
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (!url.endsWith("/data/next_chord_model.json")) throw new Error(`unexpected fetch ${url}`);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
  return calls;
}

async function call(query) {
  const resp = await onRequestGet({ request: new Request(`${ORIGIN}/api/next?${query}`) });
  return { resp, body: await resp.json() };
}

test("the committed model is a real corpus: >1000 songs, every context counted", () => {
  assert.ok(MODEL.total_songs >= 1000, `total_songs=${MODEL.total_songs}`);
  assert.equal(MODEL.max_order, 4);
  const ctx = MODEL.contexts["1,5,6"];
  assert.ok(ctx && ctx.songs >= 100 && ctx.occ >= ctx.songs);
  for (const [deg, info] of Object.entries(ctx.next)) {
    assert.match(deg, /^[1-7]$/);
    assert.ok(info.occ >= info.songs && info.songs >= 1, `${deg}: ${JSON.stringify(info)}`);
  }
});

test("answers 1,5,6 from the corpus with counts, both aliases, and a cacheable header", async () => {
  const calls = serveModel();
  const { resp, body } = await call("progression=1,5,6");
  assert.equal(resp.status, 200);
  assert.equal(resp.headers.get("Cache-Control"), "public, max-age=86400");
  assert.equal(calls.length, 1);
  assert.equal(body.source, SOURCE_CORPUS);
  assert.equal(body.prefix_progression, "1,5,6");
  assert.equal(body.context_used, "1,5,6");
  assert.equal(body.backoff, false);
  assert.ok(body.sample_songs >= 100);
  assert.ok(body.corpus_songs >= 1000);
  assert.deepEqual(body.next_chords, body.next_chord_probabilities);

  const top = body.next_chords[0];
  assert.equal(top.degree, 4);
  assert.equal(top.chord_degree, 4);
  assert.equal(top.chord, "4");
  assert.equal(top.roman, "IV");
  // Measured 2026-09-04: 0.33 of 2,328 occurrences. The old table claimed 0.78.
  assert.ok(top.probability > 0.2 && top.probability < 0.6, `p=${top.probability}`);
  assert.ok(top.song_count >= 100 && top.occurrences >= top.song_count);
  assert.match(top.description, /1-5-6-4/);

  const total = body.next_chords.reduce((s, r) => s + r.probability, 0);
  assert.ok(total > 0.85 && total <= 1.0001, `sum=${total}`);
  // Sorted by evidence, descending.
  for (let i = 1; i < body.next_chords.length; i++) {
    assert.ok(body.next_chords[i - 1].occurrences >= body.next_chords[i].occurrences);
  }
});

test("1,5,6,4 loops back to I and 4,5,3,6 continues to ii — as the corpus says", async () => {
  serveModel();
  const pop = await call("progression=1,5,6,4");
  assert.equal(pop.body.next_chords[0].degree, 1);
  assert.equal(pop.body.next_chords[0].roman, "I");
  assert.ok(pop.body.next_chords[0].probability > 0.4);

  const royal = await call("progression=4,5,3,6");
  assert.equal(royal.body.next_chords[0].degree, 2);
  assert.equal(royal.body.next_chords[0].roman, "ii");
  assert.match(royal.body.next_chords[0].description, /2-5-1|Royal Road/);
});

test("a prefix longer than the model order backs off to its last 4 degrees and says so", async () => {
  serveModel();
  const { body } = await call("progression=4,5,3,6,2,5");
  assert.equal(body.prefix_progression, "4,5,3,6,2,5");
  assert.equal(body.context_used, "3,6,2,5");
  assert.equal(body.backoff, true);
  assert.equal(body.next_chords[0].degree, 1);
});

test("normalizes delimiters and roman numerals to the same prefix", async () => {
  serveModel();
  const a = await call("progression=1%20-%205%20-%206");
  const b = await call("progression=1/5/6");
  const c = await call("progression=I-V-vi");
  assert.equal(a.body.prefix_progression, "1,5,6");
  assert.equal(b.body.prefix_progression, "1,5,6");
  assert.equal(c.body.prefix_progression, "1,5,6");
  assert.deepEqual(a.body.next_chords, b.body.next_chords);
  assert.deepEqual(a.body.next_chords, c.body.next_chords);
});

test("a rare prefix backs off rather than inventing a distribution", () => {
  const contexts = {
    "7,3,6": { songs: MIN_SONGS_FOR_CONTEXT - 1, occ: 4, next: { 2: { occ: 4, songs: 4 } } },
    "3,6": { songs: 50, occ: 120, next: { 2: { occ: 90, songs: 40 }, 4: { occ: 30, songs: 12 } } }
  };
  assert.equal(resolveContext(contexts, [7, 3, 6]), "3,6");
  const out = predictFromModel({ contexts, max_order: 4, total_songs: 60 }, [7, 3, 6]);
  assert.equal(out.context_used, "3,6");
  assert.equal(out.backoff, true);
  assert.deepEqual(out.next_chords.map((r) => [r.degree, r.probability]), [[2, 0.75], [4, 0.25]]);
  assert.equal(resolveContext({}, [1, 2]), null);
});

test("when the model asset cannot be read, falls back to the labelled heuristic table, uncached", async () => {
  serveModel(500, {});
  const { resp, body } = await call("progression=1,5,6");
  assert.equal(resp.status, 200);
  assert.equal(body.source, SOURCE_HEURISTIC);
  assert.match(body.note, /unavailable/);
  assert.equal(resp.headers.get("Cache-Control"), "no-store");
  assert.equal(body.next_chords[0].degree, 4);
  for (const item of body.next_chords) {
    assert.ok(Number.isInteger(item.degree));
    assert.equal(item.chord_degree, item.degree);
    assert.equal(item.chord, String(item.degree));
    assert.ok(item.roman && item.probability > 0 && item.description.length > 0);
  }
});

test("rejects a prefix with no scale degrees", async () => {
  serveModel();
  const { resp, body } = await call("progression=hello");
  assert.equal(resp.status, 400);
  assert.match(body.error, /1-7/);
});

test("parsePrefixDegrees covers compact, delimited and roman forms", () => {
  assert.deepEqual(parsePrefixDegrees("1564"), [1, 5, 6, 4]);
  assert.deepEqual(parsePrefixDegrees("4 > 5 | 3"), [4, 5, 3]);
  assert.deepEqual(parsePrefixDegrees("IV-V-iii-vi"), [4, 5, 3, 6]);
  assert.deepEqual(parsePrefixDegrees(""), []);
  assert.deepEqual(parsePrefixDegrees("8,9"), []);
});
