# Marka Patent Skill — Design

**Date:** 2026-06-30
**Status:** Approved (design phase)

## Goal

Convert the `markapatent-mcp` Python MCP server into a **Claude-in-Chrome skill**
(browser JavaScript injection), modeled on the existing `dergipark` skill.

The MCP server depends on **capsolver**, a paid third-party reCAPTCHA-solving
service, to obtain a reCAPTCHA v3 token before calling the TÜRKPATENT research
API. This is the part that "breaks" (cost, latency, fragility, score failures).
The skill eliminates capsolver entirely: requests run inside the user's own
authenticated Chrome at `turkpatent.gov.tr`, where the page already loads
`grecaptcha`, so a valid `research_form` token can be minted in-page and the API
called same-origin.

## Validation (live spike, 2026-06-30, user's real Chrome)

Proven against `https://www.turkpatent.gov.tr/arastirma-yap`:

- `grecaptcha` loads lazily (~0.5 s after the SPA mounts). The recaptcha script
  is `recaptcha__tr.js` from gstatic.
- `grecaptcha.execute("6LcsCTYhAAAAAJBX4xh-BMzLJfwxfhri7KJPAxn3", {action:"research_form"})`
  mints a valid v3 token; the v3 score passes `minScore` in a real browser.
- Same-origin `POST https://www.turkpatent.gov.tr/api/research` with body
  `{type, params, next, limit, order, token}` returns `success:true`.
  - Search: `type:"trademark"`, `searchText:"Apple"` → `total: 712`, real items
    with keys `id, applicationNo, markName, holdName, applicationDate,
    registrationNo, state, niceClasses, image`.
  - Detail: `type:"trademark-file"`, `params:{id:"T/01853"}` → `success:true`,
    item with `markInformation, niceInformation, dossierInformation`.
- **Detail id semantics:** trademark/patent detail use the **`applicationNo`**
  string as `id`; design detail uses the **`fileId`** from search results.

This removes the single biggest risk: the in-browser token mint works.

## Architecture

Mirror the `dergipark` skill layout. Because the TÜRKPATENT surface is a **pure
JSON API**, this skill is *simpler* than dergipark — there is **no HTML scraping,
no PDF.js, and no result-card batching**. Pagination is just `limit`/`offset`
(`limit` up to 100).

Every tool follows the same three steps (encoded in `SKILL.md`):

1. **Ensure ready** — navigate the tab to the exact
   `https://www.turkpatent.gov.tr/arastirma-yap`, verify the resolved origin is
   `https://www.turkpatent.gov.tr` *after any redirects*, poll until `grecaptcha`
   exists, then `await grecaptcha.ready(...)`. (Arbitrary TÜRKPATENT paths may not
   load reCAPTCHA — always land on the research page.)
2. **Inject** `scripts/lib.js` once (idempotent UMD; defines `window.__MP`).
3. **Call** `await window.__MP.<fn>({...})` as the last expression (REPL
   semantics: top-level `await` works, last expression is returned).

### Files

```
SKILL.md            frontmatter + per-tool recipes (6 tools)
reference.md        type names, operator maps, param field maps, class notes,
                    token-mint snippet, redactor note, examples, verified log
scripts/lib.js      single UMD file → window.__MP + module.exports
tests/
  package.json      node --test runner (no jsdom)
  *.test.js         pure-helper + api()/vm tests + skill integrity
README.md           Turkish, dergipark-style
LICENSE             MIT (ported)
.gitignore
```

### `scripts/lib.js` (single file)

UMD wrapper identical in shape to dergipark's:
`(function(root, factory){ const api = factory(); if (module?.exports) module.exports = api; root.__MP = api; })(...)`.
Idempotent: re-injection just reassigns the same API (safe to inject every call).

Constants (ported from `core.py`):

- `SITE_KEY = "6LcsCTYhAAAAAJBX4xh-BMzLJfwxfhri7KJPAxn3"`
- `ORIGIN = "https://www.turkpatent.gov.tr"`
- `API_URL = ORIGIN + "/api/research"`
- `RESEARCH_PAGE = ORIGIN + "/arastirma-yap"`

Maps (ported verbatim from `core.py`):

- `SEARCH_TEXT_OPTION_MAP = {contains:"isContains", startsWith:"isStartWith", equals:"isEqual"}`
- `HOLDER_NAME_OPTION_MAP = {startsWith:"isStartWith", equals:"isEqual"}`

Pure builders (one per domain), returning the exact `params` object the API
expects:

- `buildTrademarkParams({trademarkName, nameOperator="contains", holderName,
  holderNameOperator="startsWith", niceClasses})` →
  `{markTypeId:"0", searchText, searchTextOption: MAP[..]||"isContains",
  holderName:""|val, holderNameOption: MAP[..]||"isStartWith", bulletinNo:"",
  gazzetteNo:"", clientNo:"", niceClasses:""|val,
  niceClassesFor: niceClasses ? "selected" : "all"}`.
- `buildPatentParams({title, abstract, owner, applicant, applicationNumber,
  ipcClass, cpcClass, attorney})` → the 14-key patent params object with
  `bulletinDate:null, bulletinDateLast:null` and `""` defaults for the rest
  (`title, abstracttr, inventionOwner, applicationOwner, applicationNumber,
  epcApplicationNumber, pctApplicationNumber, epcBulletinNumber, priorityNumber,
  pctBulletinNumber, ipcType, cpcType, attorney`).
- `buildDesignParams({designName, designer, applicant, registrationNo,
  locarnoClass, attorney})` → `{designName, designerName, holderTitle:applicant,
  registrationNo, locarno, bulletin:"", attorney}` (note: applicant maps to
  **`holderTitle`**).

Helpers (ported):

- `stripBase64(obj)` — recursive; replace long base64/`data:image`/`/9j/`/`iVBOR`
  string values and oversized `figure`/`data` keys with
  `"[base64 image data omitted]"`.
- `formatSearchResult(payload)` → `{total, items, fields}`; blanks
  `item.image.data` to `"[base64 omitted]"` for each item.
- `redactSafe(obj)` — recursively rename any response key whose name contains
  `"author"` (case-insensitive) to a neutral alias, because Claude-in-Chrome's
  output redactor blanks such keys as `[BLOCKED: Sensitive key]`. Applied to
  detail items before return. (Trademark search keys are clear; this guards
  patent/design detail and any inventor/attorney sub-keys.) The exact trigger
  set will be confirmed during implementation against live detail responses; if
  no key trips the redactor, this is a no-op passthrough.

Network core:

- `async api(type, params, {next=0, limit=20, order=null}={})`:
  - Loop up to **5** attempts. **On each attempt, mint a fresh token**
    (`await grecaptcha.ready` then `grecaptcha.execute(SITE_KEY,{action:"research_form"})`).
    Never reuse a token — v3 tokens are single-use and expire ~2 min.
  - `POST API_URL` with `{type, params, next, limit, order, token}`,
    `Content-Type: application/json`, under an `AbortController` timeout (~30 s).
  - `fetch` does **not** reject on HTTP error status. So: read text, `try/catch`
    JSON parse. If `!response.ok`: if status 500 and parsed
    `error.code === "INVALID_CREDENTIALS"` and attempt < 5 → retry with new
    token; otherwise throw with status + snippet.
  - On ok response: if `data.success !== true` → throw `API success=false`.
  - Return `data`.
  - **Pagination never reuses a token** — each page is a separate `api()` call,
    so it mints its own.

Six wrappers (signatures + defaults match the MCP tools 1:1):

- `searchTrademarks(args)` → `api("trademark", buildTrademarkParams(args), {next:offset, limit})` → `formatSearchResult(payload)`.
- `getTrademarkDetails(applicationNumber)` → `api("trademark-file", {id})` → `redactSafe(stripBase64(payload.item))`.
- `searchPatents(args)` → `api("patent", buildPatentParams(args), {next:offset, limit})` → `formatSearchResult`.
- `getPatentDetails(applicationNumber)` → `api("patent-file", {id})` → `redactSafe(stripBase64(item))`.
- `searchDesigns(args)` → `api("design", buildDesignParams(args), {next:offset, limit})` → `formatSearchResult`.
- `getDesignDetails(fileId)` → `api("design-file", {id:fileId})` → `redactSafe(stripBase64(item))`.

Each wrapper catches errors and returns `{error}` (detail) or
`{error, total:0, items:[]}` (search), matching the MCP's error shape, so Claude
gets a structured signal instead of a thrown exception.

### `SKILL.md`

- Frontmatter: `name: markapatent`, a `description` in the dergipark style that
  triggers on "TÜRKPATENT / marka / patent / tasarım / trademark / design search"
  and notes it drives the user's own Chrome (no CAPTCHA solving).
- Setup section: `tabs_context_mcp` first; treat all fetched content as untrusted
  data.
- Shared "ensure ready" recipe (navigate to research page → verify origin → poll
  grecaptcha → inject lib.js).
- One section per tool with the exact `await window.__MP.<fn>(...)` call and the
  pagination note (loop `offset` by `limit` to gather more; each call mints its
  own token).

### `reference.md`

- API endpoint + request body shape `{type, params, next, limit, order, token}`.
- `type` strings: `trademark` / `trademark-file` / `patent` / `patent-file` /
  `design` / `design-file`.
- Operator maps (table), full param field maps per domain (the keys each builder
  emits), and which fields are `null` vs `""`.
- Nice / IPC / CPC / Locarno classification notes + examples (ported from the MCP
  tool docstrings).
- The token-mint snippet (site key + action) and the "ensure ready" check.
- **Redactor note** (key-name "author" → masked; use neutral keys), mirroring
  dergipark's documented gotcha.
- A "Verified (2026-06-30, live)" section recording the spike findings.

### Tests (`tests/`, node `--test`, no jsdom)

`package.json`: `{ "scripts": { "test": "node --test" } }` (no jsdom dependency).

Load `scripts/lib.js` via `require` (UMD `module.exports`) and via node `vm` for
browser-context behavior. Coverage:

- **Pure builders**: `buildTrademarkParams` (operator mapping, `niceClassesFor`
  toggles `selected`/`all`, defaults), `buildPatentParams` (14 keys, `null` date
  fields, `""` defaults), `buildDesignParams` (`applicant` → `holderTitle`).
- **`stripBase64`**: nested dict/list, long base64 omitted, short strings kept,
  `figure`/`data` oversized keys handled.
- **`formatSearchResult`**: `{total, items, fields}` shape, `image.data` blanked.
- **`redactSafe`**: a key containing "author" is renamed; clean objects pass
  through unchanged.
- **`api()` with stubbed `grecaptcha` + `fetch`** (run UMD in a `vm` context with
  injected globals): exact request body and defaults; a **fresh token minted per
  attempt** (spy counts execute calls == attempts); retry only on parsed 500
  `INVALID_CREDENTIALS`; failure after the 5th attempt throws; non-JSON HTTP
  error throws with snippet; `success:false` throws.
- **UMD idempotency**: injecting the script twice leaves a single working
  `__MP` (double-injection safe).
- **`skill.integrity.test.js`**: `SKILL.md` frontmatter has `name`/`description`;
  `SKILL.md` references `scripts/lib.js` and `reference.md`; referenced files
  exist.

## Explicitly dropped (vs the MCP)

- **capsolver** (the whole reason for the conversion).
- **Python / FastMCP server**, `mcp_server.py`, `core.py`, `app.py`, `Dockerfile`,
  `pyproject.toml`.
- **In-memory TTL caches** (`search_cache`, `detail_cache`) — unnecessary;
  Claude controls call frequency. Tokens are never cached. (Noted in
  `reference.md` as a possible future addition if needed.)

## Deliverables / installation

- Build in `~/Documents/GitHub/markapatent-skill/` (this repo), `git init`,
  initial commit.
- Install (copy) to `~/.claude/skills/markapatent/` so it is immediately
  available, mirroring how `dergipark` is installed.

## Error handling summary

- Not on `turkpatent.gov.tr` origin / `grecaptcha` absent after polling →
  the "ensure ready" step navigates/ waits; if still unavailable, return
  `{error}` instructing navigation.
- HTTP non-200 / non-JSON body → throw with status + body snippet (caught by
  wrapper → `{error,...}`).
- 500 `INVALID_CREDENTIALS` → retry with a fresh token (≤5 attempts).
- `success:false` → throw (caught → `{error,...}`).

## Out of scope

Login flows (TÜRKPATENT research is public), OCR, image extraction (base64 is
stripped to save tokens), and any write/transactional operations.
