/**
 * Unit tests for the /api/import-yopu Cloudflare Pages Function.
 *
 * Run: node --test tests/functions/import_yopu.test.mjs
 */
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { onRequestPost, onRequestGet } from "../../functions/api/import-yopu.js";
import { decodeSheetPayload, getGuitarFingering, permuteV } from "../../functions/api/_yopu_decoder.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ORIGIN = "https://chord.example.test";
const REAL_FETCH = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = REAL_FETCH;
});
afterEach(() => {
  globalThis.fetch = REAL_FETCH;
});

function mockFetch(htmlMap) {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (htmlMap[url]) {
      return new Response(htmlMap[url], { status: 200, headers: { "content-type": "text/html" } });
    }
    return new Response("Not found", { status: 404 });
  };
}

async function callPost(body) {
  const req = new Request(`${ORIGIN}/api/import-yopu`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const resp = await onRequestPost({ request: req });
  return { resp, body: await resp.json() };
}

test("rejects empty score input with 400", async () => {
  const { resp, body } = await callPost({ score: "" });
  assert.equal(resp.status, 400);
  assert.ok(body.error && body.error.includes("请输入"));
});

test("supports 24-character hex MongoDB ObjectIds without truncating", async () => {
  const oid = "5de0d85ab2802613ba2a11b6";
  const expectedUrl = `https://yopu.co/view/${oid}`;
  let calledUrl = null;

  globalThis.fetch = async (input) => {
    calledUrl = String(input);
    return new Response("<title>晴天 - 周杰伦 吉他弹唱谱</title><article>故事的小黄花</article>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  };

  const { resp, body } = await callPost({ score: oid });
  assert.equal(resp.status, 200);
  assert.equal(calledUrl, expectedUrl, "24-char ObjectId must be passed completely without truncation");
  assert.equal(body.id, oid);
  assert.equal(body.title, "晴天");
  assert.equal(body.artist, "周杰伦", "Trailing '吉他弹唱谱' or '吉他' must be stripped from artist");
});

test("extracts sheet ID from full Yopu URLs", async () => {
  const fullUrl = "https://yopu.co/view/3PbL9Wr1?from=share";
  let calledUrl = null;

  globalThis.fetch = async (input) => {
    calledUrl = String(input);
    return new Response("<title>再见青春 - 汪峰 吉他弹唱谱</title><article>我将在冬日的黎明出发</article>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  };

  const { resp, body } = await callPost({ score: fullUrl });
  assert.equal(resp.status, 200);
  assert.equal(calledUrl, "https://yopu.co/view/3PbL9Wr1");
  assert.equal(body.id, "3PbL9Wr1");
  assert.equal(body.title, "再见青春");
  assert.equal(body.artist, "汪峰");
});

test("parses inline chords when present in HTML and extracts 4-chord loop", async () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>稻香 - 周杰伦</title></head>
      <body>
        <div>原调: G</div>
        <div>变调夹: 0</div>
        <p>G D Em C G D Em C G D Em C</p>
      </body>
    </html>
  `;

  globalThis.fetch = async () => new Response(sampleHtml, { status: 200, headers: { "content-type": "text/html" } });

  const { resp, body } = await callPost({ score: "dao-xiang-id" });
  assert.equal(resp.status, 200);
  assert.equal(body.title, "稻香");
  assert.equal(body.artist, "周杰伦");
  assert.equal(body.primary_progression, "1,5,6,4");
  assert.equal(body.primary_roman, "I-V-vi-IV");
  assert.deepEqual(body.primary_chords, ["G", "D", "Em", "C"]);
});

test("onRequestGet rejects empty score query with 400", async () => {
  const req = new Request(`${ORIGIN}/api/import-yopu?id=`, { method: "GET" });
  const resp = await onRequestGet({ request: req });
  const body = await resp.json();
  assert.equal(resp.status, 400);
  assert.ok(body.error && body.error.includes("请输入"));
});

test("onRequestGet extracts score ID and title from query parameters", async () => {
  globalThis.fetch = async () => new Response("<title>晴天 - 周杰伦 吉他弹唱谱</title>", {
    status: 200,
    headers: { "content-type": "text/html" }
  });

  const req = new Request(`${ORIGIN}/api/import-yopu?url=https://yopu.co/view/3PbjG3gP`, { method: "GET" });
  const resp = await onRequestGet({ request: req });
  const body = await resp.json();
  assert.equal(resp.status, 200);
  assert.equal(body.id, "3PbjG3gP");
  assert.equal(body.title, "晴天");
  assert.equal(body.artist, "周杰伦");
});

test("decodeSheetPayload decodes real binary payload and resolves guitar fingerings", () => {
  const fixturePath = path.resolve(__dirname, "../fixtures/qingtian_sheet_payload.bin");
  const buf = fs.readFileSync(fixturePath);
  const decoded = decodeSheetPayload(buf);
  assert.equal(decoded.title, "晴天");
  assert.equal(decoded.artist, "周杰伦");
  assert.equal(decoded.key, "G");
  assert.deepEqual(decoded.chords.slice(0, 4), ["Em", "Cadd9", "G", "D/F#"]);

  const emFingering = getGuitarFingering("Em");
  assert.deepEqual(emFingering.frets, [0, 2, 2, 0, 0, 0]);
  const cadd9Fingering = getGuitarFingering("Cadd9");
  assert.deepEqual(cadd9Fingering.frets, [-1, 3, 2, 0, 3, 0]);
  const dfsharpFingering = getGuitarFingering("D/F#");
  assert.deepEqual(dfsharpFingering.frets, [2, 0, 0, 2, 3, 2]);
});

function encodeTestDataModel(obj) {
  const jsonStr = JSON.stringify(obj);
  const raw = new TextEncoder().encode(jsonStr);
  const n = raw.length;
  const indices = new Uint32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  permuteV(indices);
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) arr[indices[i]] = raw[i];
  const xorArr = new Uint8Array(n);
  for (let i = 0; i < n; i++) xorArr[i] = arr[i] ^ 171;
  let str = "";
  for (let i = 0; i < n; i++) str += String.fromCharCode(xorArr[i]);
  return encodeURIComponent(str);
}

test("onRequestPost decodes data-model token, fetches structured binary sheet, and extracts chords + fingerings", async () => {
  const sheetId = "3PbjG3gP";
  const fakeToken = "2.testToken.123456.3PbjG3gP";
  const encodedModel = encodeTestDataModel({ st: fakeToken });

  const fixturePath = path.resolve(__dirname, "../fixtures/qingtian_sheet_payload.bin");
  const fixtureBuf = fs.readFileSync(fixturePath);

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes(`/view/${sheetId}`)) {
      return new Response(`<html><head><title>晴天 - 周杰伦</title></head><body><div id="c" data-model="${encodedModel}"></div></body></html>`, {
        status: 200,
        headers: { "content-type": "text/html" }
      });
    }
    if (url.includes("/z/")) {
      return new Response(fixtureBuf, {
        status: 200,
        headers: { "content-type": "application/octet-stream" }
      });
    }
    return new Response("Not found", { status: 404 });
  };

  const { resp, body } = await callPost({ score: sheetId });
  assert.equal(resp.status, 200);
  assert.equal(body.id, sheetId);
  assert.equal(body.title, "晴天");
  assert.equal(body.artist, "周杰伦");
  assert.equal(body.original_key, "G");
  assert.equal(body.primary_progression, "6,4,1,5");
  assert.equal(body.primary_roman, "vi-IV-I-V");
  assert.deepEqual(body.primary_chords, ["Em", "Cadd9", "G", "D/F#"]);
  assert.ok(body.extracted_chords.length >= 8);
  assert.ok(body.guitar_fingerings["Em"]);
  assert.ok(body.guitar_fingerings["Cadd9"]);
  assert.ok(body.guitar_fingerings["D/F#"]);
});

test("rejects whitespace-only score input with 400", async () => {
  const { resp, body } = await callPost({ score: "   " });
  assert.equal(resp.status, 400);
  assert.equal(body.code, 400);
  assert.ok(body.error && body.error.includes("请输入"));
});

test("returns HTTP 404 with error message when score is not found upstream (404)", async () => {
  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  const { resp, body } = await callPost({ score: "nonexistent_score_9999" });
  assert.equal(resp.status, 404);
  assert.equal(body.code, 404);
  assert.equal(body.error, "曲谱不存在或无法获取");
});

test("returns HTTP 404 when upstream fetch throws network error", async () => {
  globalThis.fetch = async () => {
    throw new Error("Network timeout or connection refused");
  };

  const { resp, body } = await callPost({ score: "network_err_id" });
  assert.equal(resp.status, 404);
  assert.equal(body.code, 404);
  assert.equal(body.error, "曲谱不存在或无法获取");
});

test("returns HTTP 404 when upstream HTML title indicates 404 Not Found", async () => {
  globalThis.fetch = async () => new Response("<html><head><title>404 Not Found</title></head><body></body></html>", {
    status: 200,
    headers: { "content-type": "text/html" }
  });

  const { resp, body } = await callPost({ score: "not_found_page_id" });
  assert.equal(resp.status, 404);
  assert.equal(body.code, 404);
  assert.equal(body.error, "曲谱不存在或无法获取");
});

test("onRequestGet returns HTTP 404 for nonexistent score", async () => {
  globalThis.fetch = async () => new Response("Not found", { status: 404 });

  const req = new Request(`${ORIGIN}/api/import-yopu?id=nonexistent_score_9999`, { method: "GET" });
  const resp = await onRequestGet({ request: req });
  assert.equal(resp.status, 404);
  const body = await resp.json();
  assert.equal(body.code, 404);
  assert.equal(body.error, "曲谱不存在或无法获取");
});

