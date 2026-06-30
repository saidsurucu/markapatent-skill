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

  function stripBase64(obj) {
    if (Array.isArray(obj)) {
      for (const item of obj) stripBase64(item);
      return obj;
    }
    if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (typeof value === "string" && value.length > 500 &&
            (value.startsWith("data:image") || value.startsWith("/9j/") || value.startsWith("iVBOR"))) {
          obj[key] = "[base64 image data omitted]";
        } else if ((key === "figure" || key === "data") && typeof value === "string" && value.length > 500) {
          obj[key] = "[base64 image data omitted]";
        } else {
          stripBase64(value);
        }
      }
    }
    return obj;
  }

  function formatSearchResult(payload) {
    payload = payload || {};
    const items = payload.items || [];
    for (const item of items) {
      if (item && typeof item.image === "object" && item.image && item.image.data) {
        item.image.data = "[base64 omitted]";
      }
    }
    return {
      total: payload.total != null ? payload.total : items.length,
      items,
      fields: payload.fields || [],
    };
  }

  function redactSafe(obj) {
    if (Array.isArray(obj)) { for (const item of obj) redactSafe(item); return obj; }
    if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        redactSafe(obj[key]);
        if (/author/i.test(key)) {
          const neutral = key.replace(/author/gi, "kisi");
          if (neutral !== key && !(neutral in obj)) {
            obj[neutral] = obj[key];
            delete obj[key];
          }
        }
      }
    }
    return obj;
  }

  async function mintToken() {
    await new Promise((res) => grecaptcha.ready(res));
    return grecaptcha.execute(SITE_KEY, { action: "research_form" });
  }

  async function api(type, params, opts) {
    opts = opts || {};
    const next = opts.next || 0;
    const limit = opts.limit || 20;
    const order = opts.order != null ? opts.order : null;
    let lastErr = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const token = await mintToken();
      const body = JSON.stringify({ type, params, next, limit, order, token });
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      let resp, text;
      try {
        resp = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: ctrl.signal,
        });
        text = await resp.text();
      } finally {
        clearTimeout(timer);
      }
      let data = null;
      try { data = JSON.parse(text); } catch (e) { data = null; }
      if (!resp.ok) {
        const code = data && data.error && data.error.code;
        if (resp.status === 500 && code === "INVALID_CREDENTIALS") {
          lastErr = data;
          continue;
        }
        throw new Error("API HTTP " + resp.status + ": " + (text || "").slice(0, 300));
      }
      if (!data || data.success !== true) {
        throw new Error("API success=false: " + (text || "no body").slice(0, 300));
      }
      return data;
    }
    throw new Error("API failed after 5 attempts: " + JSON.stringify(lastErr));
  }

  async function waitReady(timeoutMs) {
    timeoutMs = timeoutMs || 12000;
    const ready = () => location.origin === ORIGIN && typeof grecaptcha !== "undefined";
    const start = Date.now();
    while (!ready()) {
      if (Date.now() - start > timeoutMs) {
        return { ready: false, origin: location.origin, hasGrecaptcha: typeof grecaptcha !== "undefined" };
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    await new Promise((res) => grecaptcha.ready(res));
    return { ready: true, origin: location.origin };
  }

  return {
    SITE_KEY, ORIGIN, API_URL, RESEARCH_PAGE,
    SEARCH_TEXT_OPTION_MAP, HOLDER_NAME_OPTION_MAP,
    buildTrademarkParams, buildPatentParams, buildDesignParams,
    stripBase64, formatSearchResult, redactSafe,
    mintToken, api, waitReady,
  };
});
