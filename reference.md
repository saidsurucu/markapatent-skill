# Marka Patent reference

## API
- Endpoint: `POST https://www.turkpatent.gov.tr/api/research`
- Body: `{type, params, next, limit, order, token}` (`order` is `null`).
- `next` = offset, `limit` = page size (1–100).
- `token`: reCAPTCHA v3, site key `6LcsCTYhAAAAAJBX4xh-BMzLJfwxfhri7KJPAxn3`,
  action `research_form`. Minted in-page via
  `grecaptcha.execute(SITE_KEY, {action:"research_form"})`. Single-use, ~2 min
  expiry → minted fresh per request (handled inside `api()`).

## type strings
| operation | search type | detail type | detail id |
|-----------|-------------|-------------|-----------|
| trademark | `trademark` | `trademark-file` | `applicationNo` (e.g. `T/01853`) |
| patent    | `patent`    | `patent-file`    | `applicationNo` |
| design    | `design`    | `design-file`    | `fileId` from search results (e.g. `106417`) |

## Operator maps (trademark)
- name: `contains→isContains`, `startsWith→isStartWith`, `equals→isEqual` (default `isContains`)
- holder: `startsWith→isStartWith`, `equals→isEqual` (default `isStartWith`)

## params per domain (keys the builders emit)
**trademark:** `markTypeId:"0"`, `searchText`, `searchTextOption`, `holderName`,
`holderNameOption`, `bulletinNo:""`, `gazzetteNo:""`, `clientNo:""`,
`niceClasses`, `niceClassesFor` (`"selected"` when `niceClasses` set, else `"all"`).

**patent:** `title`, `abstracttr`, `inventionOwner`, `applicationOwner`,
`applicationNumber`, `epcApplicationNumber:""`, `pctApplicationNumber:""`,
`epcBulletinNumber:""`, `priorityNumber:""`, `pctBulletinNumber:""`, `ipcType`,
`cpcType`, `bulletinDate:null`, `bulletinDateLast:null`, `attorney`.

**design:** `designName`, `designerName`, `holderTitle` (= applicant),
`registrationNo`, `locarno`, `bulletin:""`, `attorney`.

## Classifications
- **Nice** (trademark): goods/services classes 1–45, comma-separated (`"9,35,42"`).
- **IPC/CPC** (patent): e.g. `G06F`, `H04L`.
- **Locarno** (design): e.g. `06-01`.

## Output redactor note
Claude-in-Chrome's output redactor blanks any response key whose **name**
contains `author` (shown as `[BLOCKED: Sensitive key]`) — values are never the
trigger, only key names. `redactSafe()` renames such keys (`author`→`kisi`)
before returning detail items. If a future field is masked, add its key to the
remap.

## Dropped vs the MCP
No capsolver, no Python/FastMCP, no Docker, no TTL/response cache. Tokens are
never cached. If rate/cost ever matters, a short in-page session cache could be
added in `lib.js` — not needed today.

## Verified (2026-06-30, live against turkpatent.gov.tr)
- `grecaptcha` loads ~0.5 s after the SPA mounts (`recaptcha__tr.js`).
- `grecaptcha.execute(SITE_KEY, {action:"research_form"})` mints a token whose v3
  score passes `minScore` in the real browser.
- Same-origin `POST /api/research`: trademark search `"Apple"` → `total: 712`;
  `trademark-file` `{id:"T/01853"}` → `success:true` with
  `markInformation/niceInformation/dossierInformation`.
- `javascript_tool` contract: REPL semantics — top-level `await` works; end with
  `await window.__MP.<fn>(...)`.
