/**
 * Unit tests for the /api/next Cloudflare Pages Function.
 *
 * Run: node --test tests/functions/next.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { onRequestGet } from "../../functions/api/next.js";

const ORIGIN = "https://chord.example.test";

async function call(query) {
  const req = new Request(`${ORIGIN}/api/next?${query}`);
  const resp = await onRequestGet({ request: req });
  return { resp, body: await resp.json() };
}

test("returns both next_chord_probabilities and next_chords aliases for compatibility", async () => {
  const { resp, body } = await call("progression=1,5,6");
  assert.equal(resp.status, 200);
  assert.equal(body.prefix_progression, "1,5,6");
  assert.ok(Array.isArray(body.next_chord_probabilities), "next_chord_probabilities must be an array");
  assert.ok(Array.isArray(body.next_chords), "next_chords must be an array");
  assert.equal(body.next_chord_probabilities.length, body.next_chords.length);
  assert.ok(body.next_chord_probabilities.length > 0);

  // Each item has consistent degree fields
  const first = body.next_chord_probabilities[0];
  assert.equal(first.chord_degree, 4);
  assert.equal(first.degree, 4);
  assert.equal(first.chord, "4");
  assert.equal(first.roman, "IV");
  assert.ok(first.probability > 0.5);
  assert.ok(first.description && first.description.length > 0);
});

test("supports 1,5,6,4 progression and returns loop turnaround probabilities", async () => {
  const { body } = await call("progression=1,5,6,4");
  assert.equal(body.prefix_progression, "1,5,6,4");
  const top = body.next_chords[0];
  assert.equal(top.degree, 1, "After 1,5,6,4 pop progression loops back to 1");
  assert.equal(top.roman, "I");
  assert.ok(top.probability >= 0.7);
});

test("supports 6,4,1,5 progression and returns 6 (vi) loop restart", async () => {
  const { body } = await call("progression=6,4,1,5");
  assert.equal(body.prefix_progression, "6,4,1,5");
  const top = body.next_chords[0];
  assert.equal(top.degree, 6, "After 6,4,1,5 minor pop progression loops back to 6");
  assert.equal(top.roman, "vi");
});

test("supports 4,5,3,6 progression leading into ii (2)", async () => {
  const { body } = await call("progression=4,5,3,6");
  assert.equal(body.prefix_progression, "4,5,3,6");
  const top = body.next_chords[0];
  assert.equal(top.degree, 2, "Royal road 4-5-3-6 continues into 2 (making 4-5-3-6-2-5-1)");
  assert.equal(top.roman, "ii");
});

test("normalizes delimiter variations like spaces, dashes, and slashes", async () => {
  const { body: body1 } = await call("progression=1%20-%205%20-%206");
  const { body: body2 } = await call("progression=1/5/6");
  assert.equal(body1.prefix_progression, "1,5,6");
  assert.equal(body2.prefix_progression, "1,5,6");
  assert.deepEqual(body1.next_chords, body2.next_chords);
});

test("unlisted arbitrary progressions receive musically valid fallback with degree and roman", async () => {
  const { body } = await call("progression=7,3,6");
  assert.equal(body.prefix_progression, "7,3,6");
  assert.ok(body.next_chords.length >= 3);
  for (const item of body.next_chords) {
    assert.ok(Number.isInteger(item.degree));
    assert.equal(item.chord_degree, item.degree);
    assert.equal(item.chord, String(item.degree));
    assert.ok(item.roman && item.roman.length > 0);
    assert.ok(item.probability > 0);
  }
});
