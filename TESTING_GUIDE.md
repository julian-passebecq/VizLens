# VizLens Personal v1.0 — testing guide

## Test layers

VizLens deliberately separates tests into four layers so you can tell what broke.

| Layer | Gemini quota | Purpose |
|---|---:|---|
| Unit/regression | 0 | parser, scanner helpers, grounding, schemas |
| Local proxy/fixtures | 0 | localhost security, cancellation, page fixtures |
| Real unpacked Chrome E2E | 0 | Chrome permission/injection lifecycle |
| Live Gemini contract | 1-2 requests | verify current upstream API behavior |

## 1. Environment check

```powershell
npm run doctor
```

The doctor hides credential values and checks:

- Node 20+;
- manifest/package version synchronization;
- localhost host permission;
- supported environment-key presence;
- optional exact extension-origin lock;
- companion reachability.

## 2. Full zero-quota release gate

```powershell
npm run verify:personal
```

This includes:

- JavaScript syntax checks;
- core article/numeric regressions;
- BBC-style regressions;
- proxy/security/cancellation tests;
- local fixture tests;
- serialized Gemini request/response-contract assertions;
- VizForge/Power BI handoff tests;
- security source scans.

This must pass before using live Gemini as a debugging tool.

## 3. Controlled fixture server

```powershell
npm run fixtures
```

Pages:

- `http://127.0.0.1:8790/bbc-like.html`
- `http://127.0.0.1:8790/jsonld-only.html`
- `http://127.0.0.1:8790/d3-bound.html`
- `http://127.0.0.1:8790/plotly-runtime.html`

Use these for deterministic browser-level debugging before testing arbitrary live sites.

## 4. Optional real unpacked-extension E2E

This loads VizLens as an actual extension and exercises `chrome.scripting.executeScript` rather than calling scanner functions directly.

```powershell
npm install
npm run test:e2e
```

`puppeteer-core` is a development-only dependency and uses your installed Chrome. If needed:

```powershell
$env:CHROME_BIN = "C:\Path\To\chrome.exe"
npm run test:e2e
```

No Gemini request is made.

## 5. Local companion

```powershell
.\start-vizlens.cmd
```

Health endpoint:

```text
http://127.0.0.1:3987/health
```

The payload shows the active model, key presence, proxy version, origin policy and Gemini contract mode.

## 6. Live Gemini contract tests

These use synthetic content, not real article/browser data.

One function-call request:

```powershell
npm run test:gemini:live
```

One structured-output request:

```powershell
npm run test:gemini:live:json
```

Both, exactly two requests total:

```powershell
npm run test:gemini:live:contract
```

The live tests are opt-in specifically because they consume API quota.

## 7. Real-site manual matrix

Use `tests/live-sites.json` as a starting list.

For each site record:

- PASS — expected extraction/classification works.
- PARTIAL — useful output but a specific evidence/data feature is missing.
- FAIL — crash, wrong primary candidate, invalid data, or unusable result.

Use `tests/manual-results-template.json` for notes.

For every FAIL, keep:

- Debug JSON;
- screenshot;
- public URL;
- exact status text;
- whether Scan page worked;
- whether Gemini-only action failed;
- `/health` status.

## 8. Release-package verification

A release is not complete until the **ZIP itself** is extracted to a fresh folder and:

```powershell
npm run verify:personal
```

passes from that extracted artifact.
