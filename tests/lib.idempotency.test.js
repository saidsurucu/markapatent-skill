const { test } = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "..", "scripts", "lib.js"), "utf8");

test("injecting lib.js twice into the same global leaves a working __MP", () => {
  const sandbox = {};
  sandbox.globalThis = sandbox;        // UMD resolves root = globalThis
  sandbox.window = sandbox;            // browser-like
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx);           // first injection
  vm.runInContext(src, ctx);           // second injection (idempotent)
  assert.strictEqual(typeof sandbox.__MP, "object");
  assert.strictEqual(typeof sandbox.__MP.buildTrademarkParams, "function");
  assert.strictEqual(sandbox.__MP.buildTrademarkParams({ trademarkName: "Z" }).searchText, "Z");
});
