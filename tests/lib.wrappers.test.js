const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
const MP = require("../scripts/lib.js");

let calls;
function stub(responder) {
  calls = [];
  global.grecaptcha = { ready: (cb) => cb(), execute: async () => "tok" };
  global.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const obj = responder(body);
    return { ok: true, status: 200, text: async () => JSON.stringify(obj) };
  };
}

beforeEach(() => { calls = []; });

test("searchTrademarks: routes type+params+pagination, formats result", async () => {
  stub(() => ({ success: true, payload: { total: 712, items: [{ markName: "apple", image: { data: "BIG" } }], fields: [{ id: "markName" }] } }));
  const out = await MP.searchTrademarks({ trademarkName: "Apple", niceClasses: "9,35", limit: 8, offset: 16 });
  assert.strictEqual(calls[0].type, "trademark");
  assert.strictEqual(calls[0].params.searchText, "Apple");
  assert.strictEqual(calls[0].params.niceClassesFor, "selected");
  assert.strictEqual(calls[0].next, 16);
  assert.strictEqual(calls[0].limit, 8);
  assert.strictEqual(out.total, 712);
  assert.strictEqual(out.items[0].image.data, "[base64 omitted]");
});

test("searchTrademarks: defaults next=0 limit=20", async () => {
  stub(() => ({ success: true, payload: { items: [] } }));
  await MP.searchTrademarks({ trademarkName: "X" });
  assert.strictEqual(calls[0].next, 0);
  assert.strictEqual(calls[0].limit, 20);
});

test("searchTrademarks: error is caught into {error,total:0,items:[]}", async () => {
  stub(() => ({ success: false }));
  const out = await MP.searchTrademarks({ trademarkName: "X" });
  assert.match(out.error, /success=false/);
  assert.strictEqual(out.total, 0);
  assert.deepStrictEqual(out.items, []);
});

test("getTrademarkDetails: type trademark-file, id=applicationNumber, stripped+redacted", async () => {
  stub((b) => ({ success: true, payload: { item: { applicationNo: b.params.id, authorName: "Jane", fig: "ok" } } }));
  const out = await MP.getTrademarkDetails("T/01853");
  assert.strictEqual(calls[0].type, "trademark-file");
  assert.strictEqual(calls[0].params.id, "T/01853");
  assert.strictEqual(out.applicationNo, "T/01853");
  assert.strictEqual(out.kisiName, "Jane");        // redactSafe applied
  assert.strictEqual(out.authorName, undefined);
});

test("getTrademarkDetails: error caught into {error}", async () => {
  stub(() => ({ success: false }));
  const out = await MP.getTrademarkDetails("T/01853");
  assert.match(out.error, /success=false/);
});

test("searchPatents + getPatentDetails route correct types", async () => {
  stub((b) => ({ success: true, payload: b.type === "patent" ? { items: [] } : { item: { ok: 1 } } }));
  await MP.searchPatents({ title: "yapay zeka", applicant: "ASELSAN" });
  assert.strictEqual(calls[0].type, "patent");
  assert.strictEqual(calls[0].params.applicationOwner, "ASELSAN");
  await MP.getPatentDetails("2020/12345");
  assert.strictEqual(calls[1].type, "patent-file");
  assert.strictEqual(calls[1].params.id, "2020/12345");
});

test("searchDesigns + getDesignDetails route correct types and id=fileId", async () => {
  stub((b) => ({ success: true, payload: b.type === "design" ? { items: [] } : { item: { ok: 1 } } }));
  await MP.searchDesigns({ designName: "masa", applicant: "IKEA" });
  assert.strictEqual(calls[0].type, "design");
  assert.strictEqual(calls[0].params.holderTitle, "IKEA");
  await MP.getDesignDetails("106417");
  assert.strictEqual(calls[1].type, "design-file");
  assert.strictEqual(calls[1].params.id, "106417");
});
