# Personal v1 test results — 2026-09-08

Tested the personal/unpacked extension in this checkout, using installed Chrome
in an isolated automated browser. The Chrome Web Store baseline was not tested.

| Check | Result |
|---|---|
| `npm run verify:personal` | PASS after changes: 38 article cases, 24 localized numeric cases, 6 BBC cases, proxy/fixture/security and Gemini contract checks |
| Actual Chrome extension load | PASS |
| Scan page button and Article/Data/Source/VizForge/Power BI tabs | PASS on BBC-like, D3-bound and Plotly-runtime fixtures; no uncaught panel errors |
| Live Gemini structured JSON | PASS after interaction-ID fix |
| Live Gemini article planning | Not verified after fix: bounded retries failed with upstream/network errors |
| Real public article, PDF viewport localization and exported files | Not tested in this run |

## Fixes

- Successful live Gemini responses omitted their top-level interaction ID.
  VizLens now accepts that optional diagnostic metadata while retaining status,
  function-call ID, schema and evidence-ID validation. Added regression coverage
  for stateless planning/viewport responses and rejection of unknown facts.
- Updated browser E2E loading to Puppeteer's extension installation mechanism.
  Added actual button/tab coverage across three fixtures and interval polling
  for the background panel tab.
- Added a dependency lockfile and documented Node 22.12+ for Puppeteer tests.
  Installed Node 21.7.1 ran the local gate; bundled Node 24.19.0 ran browser tests.

The supplied key authenticated successfully and was used only in test-process
environments; it was not saved in the repository or Windows user environment.
Gemini also returned transient service errors and request timeouts. The passing
structured-output test does not establish reliable article planning or viewport
analysis. No personal browser installation or persistent companion was started.
