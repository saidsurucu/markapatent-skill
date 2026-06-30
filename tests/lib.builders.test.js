const { test } = require("node:test");
const assert = require("node:assert");
const MP = require("../scripts/lib.js");

test("constants are correct", () => {
  assert.strictEqual(MP.SITE_KEY, "6LcsCTYhAAAAAJBX4xh-BMzLJfwxfhri7KJPAxn3");
  assert.strictEqual(MP.ORIGIN, "https://www.turkpatent.gov.tr");
  assert.strictEqual(MP.API_URL, "https://www.turkpatent.gov.tr/api/research");
  assert.strictEqual(MP.RESEARCH_PAGE, "https://www.turkpatent.gov.tr/arastirma-yap");
});

test("buildTrademarkParams: defaults + operator mapping", () => {
  const p = MP.buildTrademarkParams({ trademarkName: "Apple" });
  assert.strictEqual(p.markTypeId, "0");
  assert.strictEqual(p.searchText, "Apple");
  assert.strictEqual(p.searchTextOption, "isContains");
  assert.strictEqual(p.holderName, "");
  assert.strictEqual(p.holderNameOption, "isStartWith");
  assert.strictEqual(p.bulletinNo, "");
  assert.strictEqual(p.gazzetteNo, "");
  assert.strictEqual(p.clientNo, "");
  assert.strictEqual(p.niceClasses, "");
  assert.strictEqual(p.niceClassesFor, "all");
});

test("buildTrademarkParams: niceClasses toggles niceClassesFor to selected", () => {
  const p = MP.buildTrademarkParams({ trademarkName: "X", nameOperator: "equals", niceClasses: "9,35" });
  assert.strictEqual(p.searchTextOption, "isEqual");
  assert.strictEqual(p.niceClasses, "9,35");
  assert.strictEqual(p.niceClassesFor, "selected");
});

test("buildTrademarkParams: unknown operators fall back to defaults", () => {
  const p = MP.buildTrademarkParams({ trademarkName: "X", nameOperator: "bogus", holderName: "VESTEL", holderNameOperator: "bogus" });
  assert.strictEqual(p.searchTextOption, "isContains");
  assert.strictEqual(p.holderName, "VESTEL");
  assert.strictEqual(p.holderNameOption, "isStartWith");
});

test("buildPatentParams: 14 keys, null dates, defaults", () => {
  const p = MP.buildPatentParams({ title: "yapay zeka", applicant: "ASELSAN", ipcClass: "G06F" });
  assert.strictEqual(p.title, "yapay zeka");
  assert.strictEqual(p.abstracttr, "");
  assert.strictEqual(p.inventionOwner, "");
  assert.strictEqual(p.applicationOwner, "ASELSAN");
  assert.strictEqual(p.applicationNumber, "");
  assert.strictEqual(p.epcApplicationNumber, "");
  assert.strictEqual(p.pctApplicationNumber, "");
  assert.strictEqual(p.epcBulletinNumber, "");
  assert.strictEqual(p.priorityNumber, "");
  assert.strictEqual(p.pctBulletinNumber, "");
  assert.strictEqual(p.ipcType, "G06F");
  assert.strictEqual(p.cpcType, "");
  assert.strictEqual(p.bulletinDate, null);
  assert.strictEqual(p.bulletinDateLast, null);
  assert.strictEqual(p.attorney, "");
});

test("buildDesignParams: applicant maps to holderTitle", () => {
  const p = MP.buildDesignParams({ designName: "masa", applicant: "IKEA", locarnoClass: "06-01" });
  assert.strictEqual(p.designName, "masa");
  assert.strictEqual(p.designerName, "");
  assert.strictEqual(p.holderTitle, "IKEA");
  assert.strictEqual(p.registrationNo, "");
  assert.strictEqual(p.locarno, "06-01");
  assert.strictEqual(p.bulletin, "");
  assert.strictEqual(p.attorney, "");
});
