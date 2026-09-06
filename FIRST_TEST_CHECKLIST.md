# VizLens Personal v1.0 — first test checklist

Run these in order. This separates installation problems from extraction problems and Gemini/API problems.

## Test A — release gate, zero quota

From the release folder:

```powershell
npm run verify:personal
```

**PASS:** command exits normally and reports the core/BBC/proxy/fixture/Gemini-contract checks passed.

If this fails, stop and keep the full terminal output.

## Test B — local companion health

Start:

```powershell
.\start-vizlens.cmd
```

Open:

```text
http://127.0.0.1:3987/health
```

**PASS:** JSON contains:

```text
"ok": true
"keyConfigured": true
"model": "gemini-3.8-flash"
```

If `keyConfigured` is false, fix the environment variable before testing Gemini.

## Test C — controlled BBC-like fixture, zero quota

In a second terminal:

```powershell
npm run fixtures
```

Open:

```text
http://127.0.0.1:8790/bbc-like.html
```

Then:

1. Click the VizLens toolbar icon.
2. Click **Scan page**.
3. Check Visuals, Article, Data and Source.

**PASS:** scan completes, article content is present, analytical/lazy-source evidence is found, and there is no extension crash.

## Test D — D3 bound-data fixture, zero quota

Open:

```text
http://127.0.0.1:8790/d3-bound.html
```

Click **Scan page**.

**PASS:** VizLens identifies the SVG/D3-style candidate and Data exposes bounded row evidence / mark-data mapping clues.

## Test E — Plotly runtime fixture, zero quota

Open:

```text
http://127.0.0.1:8790/plotly-runtime.html
```

Click **Scan page**.

**PASS:** Plotly/runtime clues are detected without incorrectly treating nested inner SVG fragments as separate primary charts.

## Test F — synthetic live Gemini contract, 2 API requests

Only after Tests A-E pass:

```powershell
npm run test:gemini:live:contract
```

**PASS:** both the live function-call and structured-output tests pass.

This is a cleaner API check than immediately debugging a complex news page.

## Test G — real article

Choose a public article containing multiple percentages, monetary values, vote counts, yields, temperatures or year/value pairs.

1. Open the article.
2. Click the VizLens toolbar icon.
3. **Scan page**.
4. Inspect Article and detected numeric facts.
5. Gemini -> **Article -> visual**.

**PASS:** one of these is acceptable:

- grounded visual JSON with explicit host-owned rows;
- existing-visual selection;
- research-only when the evidence is insufficient/incompatible.

**FAIL:** invented numbers, facts not present in the article evidence, extension crash, or model output accepted despite invalid IDs/schema.

## Test H — PDF/viewport

Open a PDF/report with a clearly visible chart.

1. Position the chart in the viewport.
2. Click **Analyze viewport**.
3. Inspect the detected type/family/bbox.
4. Export the detected visual crop if available.

**PASS:** the main analytical visual is localized reasonably and the bbox is inside the visible viewport.

## When something fails

1. Click **Debug JSON**.
2. Save a screenshot of the page + side panel.
3. Record the URL if it is public.
4. Copy the exact red/status message.
5. Note which test above failed.

That combination is enough to reproduce most failures without exposing your API key.
