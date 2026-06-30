(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.__MP = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SITE_KEY = "6LcsCTYhAAAAAJBX4xh-BMzLJfwxfhri7KJPAxn3";
  const ORIGIN = "https://www.turkpatent.gov.tr";
  const API_URL = ORIGIN + "/api/research";
  const RESEARCH_PAGE = ORIGIN + "/arastirma-yap";

  const SEARCH_TEXT_OPTION_MAP = { contains: "isContains", startsWith: "isStartWith", equals: "isEqual" };
  const HOLDER_NAME_OPTION_MAP = { startsWith: "isStartWith", equals: "isEqual" };

  function buildTrademarkParams(a) {
    a = a || {};
    const nice = a.niceClasses || "";
    return {
      markTypeId: "0",
      searchText: a.trademarkName || "",
      searchTextOption: SEARCH_TEXT_OPTION_MAP[a.nameOperator] || "isContains",
      holderName: a.holderName || "",
      holderNameOption: HOLDER_NAME_OPTION_MAP[a.holderNameOperator] || "isStartWith",
      bulletinNo: "", gazzetteNo: "", clientNo: "",
      niceClasses: nice,
      niceClassesFor: nice ? "selected" : "all",
    };
  }

  function buildPatentParams(a) {
    a = a || {};
    return {
      title: a.title || "",
      abstracttr: a.abstract || "",
      inventionOwner: a.owner || "",
      applicationOwner: a.applicant || "",
      applicationNumber: a.applicationNumber || "",
      epcApplicationNumber: "",
      pctApplicationNumber: "",
      epcBulletinNumber: "",
      priorityNumber: "",
      pctBulletinNumber: "",
      ipcType: a.ipcClass || "",
      cpcType: a.cpcClass || "",
      bulletinDate: null,
      bulletinDateLast: null,
      attorney: a.attorney || "",
    };
  }

  function buildDesignParams(a) {
    a = a || {};
    return {
      designName: a.designName || "",
      designerName: a.designer || "",
      holderTitle: a.applicant || "",
      registrationNo: a.registrationNo || "",
      locarno: a.locarnoClass || "",
      bulletin: "",
      attorney: a.attorney || "",
    };
  }

  return {
    SITE_KEY, ORIGIN, API_URL, RESEARCH_PAGE,
    SEARCH_TEXT_OPTION_MAP, HOLDER_NAME_OPTION_MAP,
    buildTrademarkParams, buildPatentParams, buildDesignParams,
  };
});
