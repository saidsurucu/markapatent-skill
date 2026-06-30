const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
const MP = require("../scripts/lib.js");

let executeCalls;
function stubGrecaptcha() {
  executeCalls = 0;
  global.grecaptcha = {
    ready: (cb) => cb(),
    execute: async () => { executeCalls++; return "tok-" + executeCalls; },
  };
}

beforeEach(stubGrecaptcha);

function jsonResponse(status, obj) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(obj) };
}

test("api: success returns data, mints exactly one token, sends correct body", async () => {
  let captured = null;
  global.fetch = async (url, init) => {
    captured = { url, init };
    return jsonResponse(200, { success: true, payload: { total: 5, items: [] } });
  };
  const data = await MP.api("trademark", { searchText: "Apple" }, { next: 10, limit: 8 });
  assert.strictEqual(data.success, true);
  assert.strictEqual(executeCalls, 1);
  assert.strictEqual(captured.url, MP.API_URL);
  assert.strictEqual(captured.init.method, "POST");
  assert.strictEqual(captured.init.headers["Content-Type"], "application/json");
  const body = JSON.parse(captured.init.body);
  assert.deepStrictEqual(body, { type: "trademark", params: { searchText: "Apple" }, next: 10, limit: 8, order: null, token: "tok-1" });
});

test("api: retries on 500 INVALID_CREDENTIALS with a fresh token each attempt", async () => {
  let n = 0;
  global.fetch = async () => {
    n++;
    if (n < 3) return jsonResponse(500, { error: { code: "INVALID_CREDENTIALS" } });
    return jsonResponse(200, { success: true, payload: {} });
  };
  const data = await MP.api("patent", {});
  assert.strictEqual(data.success, true);
  assert.strictEqual(n, 3);
  assert.strictEqual(executeCalls, 3); // one fresh token per attempt
});

test("api: throws after 5 INVALID_CREDENTIALS attempts", async () => {
  global.fetch = async () => jsonResponse(500, { error: { code: "INVALID_CREDENTIALS" } });
  await assert.rejects(() => MP.api("design", {}), /after 5 attempts/);
  assert.strictEqual(executeCalls, 5);
});

test("api: non-INVALID_CREDENTIALS HTTP error throws immediately (no retry)", async () => {
  global.fetch = async () => jsonResponse(503, { error: { code: "SERVICE_DOWN" } });
  await assert.rejects(() => MP.api("trademark", {}), /HTTP 503/);
  assert.strictEqual(executeCalls, 1);
});

test("api: non-JSON HTTP error body throws with snippet", async () => {
  global.fetch = async () => ({ ok: false, status: 502, text: async () => "<html>Bad Gateway</html>" });
  await assert.rejects(() => MP.api("trademark", {}), /HTTP 502/);
});

test("api: success=false throws", async () => {
  global.fetch = async () => jsonResponse(200, { success: false, message: "nope" });
  await assert.rejects(() => MP.api("trademark", {}), /success=false/);
});
