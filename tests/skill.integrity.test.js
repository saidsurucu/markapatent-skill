const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const skill = fs.readFileSync(path.join(ROOT, "SKILL.md"), "utf8");

test("SKILL.md has name: markapatent + description frontmatter", () => {
  const m = skill.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(m, "frontmatter block present");
  assert.match(m[1], /(^|\n)name:\s*markapatent(\n|$)/);
  assert.match(m[1], /(^|\n)description:\s*\S/);
});

test("SKILL.md references lib.js and reference.md", () => {
  assert.ok(skill.includes("scripts/lib.js"));
  assert.ok(skill.includes("reference.md"));
});

test("referenced files exist", () => {
  ["scripts/lib.js", "reference.md"].forEach((f) =>
    assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} must exist`));
});

test("SKILL.md mentions all six wrapper names", () => {
  ["searchTrademarks", "getTrademarkDetails", "searchPatents", "getPatentDetails", "searchDesigns", "getDesignDetails"]
    .forEach((fn) => assert.ok(skill.includes(fn), `SKILL.md should mention ${fn}`));
});
