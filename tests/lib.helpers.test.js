const { test } = require("node:test");
const assert = require("node:assert");
const MP = require("../scripts/lib.js");

test("stripBase64: long data:image value is omitted, short kept", () => {
  const obj = { a: "data:image/png;base64," + "A".repeat(600), b: "short", nested: { c: "/9j/" + "B".repeat(600) } };
  MP.stripBase64(obj);
  assert.strictEqual(obj.a, "[base64 image data omitted]");
  assert.strictEqual(obj.b, "short");
  assert.strictEqual(obj.nested.c, "[base64 image data omitted]");
});

test("stripBase64: oversized figure/data keys omitted; arrays recursed", () => {
  const obj = { items: [{ figure: "X".repeat(600), keep: "Y".repeat(10) }, { data: "Z".repeat(600) }] };
  MP.stripBase64(obj);
  assert.strictEqual(obj.items[0].figure, "[base64 image data omitted]");
  assert.strictEqual(obj.items[0].keep, "YYYYYYYYYY");
  assert.strictEqual(obj.items[1].data, "[base64 image data omitted]");
});

test("formatSearchResult: shape + image.data blanked", () => {
  const out = MP.formatSearchResult({ total: 712, items: [{ markName: "apple", image: { data: "BIGDATA" } }], fields: [{ id: "markName" }] });
  assert.strictEqual(out.total, 712);
  assert.strictEqual(out.items.length, 1);
  assert.strictEqual(out.items[0].image.data, "[base64 omitted]");
  assert.deepStrictEqual(out.fields, [{ id: "markName" }]);
});

test("formatSearchResult: total falls back to items.length", () => {
  const out = MP.formatSearchResult({ items: [{}, {}] });
  assert.strictEqual(out.total, 2);
  assert.deepStrictEqual(out.fields, []);
});

test("redactSafe: key containing 'author' is renamed, value preserved", () => {
  const obj = { authorName: "Jane", nested: { coAuthor: "Bob" }, clean: "ok" };
  MP.redactSafe(obj);
  assert.strictEqual(obj.authorName, undefined);
  assert.strictEqual(obj.kisiName, "Jane");
  assert.strictEqual(obj.nested.coAuthor, undefined);
  assert.strictEqual(obj.nested.cokisi, "Bob");
  assert.strictEqual(obj.clean, "ok");
});

test("redactSafe: clean object passes through unchanged", () => {
  const obj = { markName: "apple", holdName: "Apple Inc" };
  const ret = MP.redactSafe(obj);
  assert.deepStrictEqual(ret, { markName: "apple", holdName: "Apple Inc" });
});
