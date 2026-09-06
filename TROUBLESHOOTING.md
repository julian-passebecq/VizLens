# VizLens Personal v1.0 — troubleshooting

## `node` is not recognized

Install Node.js 20+ and open a new terminal. Then run:

```powershell
node --version
npm --version
```

Normal VizLens use does not need third-party npm packages, but it does need Node to run the localhost Gemini companion.

## `Gemini proxy is offline`

Run:

```powershell
.\start-vizlens.cmd
```

Keep the terminal open. Check:

```text
http://127.0.0.1:3987/health
```

## `GEMINI_API_KEY or GOOGLE_API_KEY is not set`

Add the key to your Windows **User environment variables**, then open a new terminal. Existing terminals do not automatically receive newly created environment variables.

Run:

```powershell
npm run doctor
```

The doctor never prints the key value.

## The key exists but Gemini returns an auth/permission error

Use a current Gemini key from Google AI Studio. Google is transitioning current Gemini usage to authorization keys and has tightened acceptance of unrestricted legacy standard keys. Re-create/restrict the key if necessary.

Do not debug this by putting the key into JavaScript or Chrome storage.

## Scan says page access is missing after I navigated

Expected behavior with `activeTab`.

Click the VizLens toolbar icon again on the new site/page, then click **Scan page**.

VizLens deliberately avoids permanent `<all_urls>` access.

## Chrome internal page / Chrome Web Store cannot be DOM scanned

Chrome blocks extension script injection on protected browser pages.

Use one of these instead:

- **Analyze viewport** when Chrome allows capture of the visible content.
- copy/select text and use **Text -> visual JSON**.

## PDF scan finds little or no DOM evidence

The built-in PDF viewer is not a normal article DOM.

Prefer:

- **Analyze viewport** for chart localization;
- copy PDF text into **Text -> visual JSON** for grounded numeric planning.

## Scan finds a chart but Data is empty

Not all rendered charts expose underlying values in accessible DOM/runtime objects.

Common cases:

- Canvas only.
- image chart.
- cross-origin iframe.
- minified/custom runtime that does not expose rows.

You can still export visual metadata/PNG/debug JSON, and use viewport analysis for classification.

## PNG export says the visual is outside the viewport

Click **Focus** on the visual, make sure it is visible, then click **PNG** again.

## `LOCAL_BUSY` / HTTP 429 from the localhost companion

VizLens serializes Gemini calls per extension origin to prevent duplicate requests and accidental quota bursts.

Finish/cancel the current request, then retry. VizLens does not automatically fan out retries.

## Gemini says research-only

That is not necessarily a failure. The planner is intentionally allowed to refuse a visualization when:

- fewer than two compatible numeric facts exist;
- units are incompatible;
- a generated chart would be misleading;
- an existing page visual is more appropriate;
- evidence IDs are insufficient.

## `npm run test:e2e` cannot find Chrome

The E2E test uses `puppeteer-core` and your installed Chrome.

First:

```powershell
npm install
```

If Chrome is in a non-standard path, set `CHROME_BIN` to the executable path before running:

```powershell
npm run test:e2e
```

This test is optional for normal use.

## Need to report a failure

Send/keep:

- public URL if possible;
- `vizlens-diagnostic.json` from **Debug JSON**;
- screenshot showing the target visual and side panel;
- exact status/error text;
- whether deterministic Scan page worked;
- whether `/health` worked;
- whether `npm run verify:personal` passed.

Never send your API key.
