/**
 * Unit tests for the /api/import-yopu Cloudflare Pages Function.
 *
 * Run: node --test tests/functions/import_yopu.test.mjs
 */
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { onRequestPost } from "../../functions/api/import-yopu.js";

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
