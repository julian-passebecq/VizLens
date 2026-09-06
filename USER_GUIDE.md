# VizLens Personal v1.0 — user guide

## Mental model

VizLens has two layers:

1. **Local evidence recovery** — inspect DOM/article/chart structure and recover as much trustworthy information as possible without an LLM.
2. **Optional Gemini reasoning** — choose/classify only after the local layer has prepared bounded evidence.

You can use layer 1 without Gemini.

## Top buttons

### Scan page

Use this first on normal HTML pages.

VizLens inspects the currently active page for:

- SVG visualizations.
- Canvas surfaces.
- HTML tables.
- Analytical images and iframes.
- D3 `__data__` bindings and mark/data clues.
- Plotly/ECharts/Highcharts/Chart.js-style runtime clues where accessible.
- Article/main content and JSON-LD fallback metadata.
- Numeric facts with local evidence IDs.

This operation is deterministic and local.

### Analyze viewport

Use when the visible pixels are more useful than the DOM:

- PDF viewer.
- scanned report/newspaper.
- canvas-heavy chart.
- inaccessible embedded visualization.
- chart inside a complex visual-journalism page.

VizLens captures the visible browser area, creates a resized analysis copy, and asks Gemini for one constrained visual classification + normalized bounding box.

Do not treat viewport mode as authoritative numeric extraction.

### Debug JSON

Exports a privacy-reduced diagnostic package containing summary/visual metadata, counts, selected visual, and local Gemini companion status. It is the best file to keep when a page fails.

## Tabs

### Visuals

Lists detected visual candidates and a deterministic primary heuristic.

Per visual:

- **Focus** — scroll/focus the visual in the page.
- **PNG** — crop the currently visible rendered region.
- **SVG** — serialize SVG when the candidate is an SVG.
- **JSON** — export recovered evidence for that visual.

If PNG says the visual is outside the viewport, click **Focus** first and try PNG again.

### Article

Shows the semantic article snapshot recovered from rendered content and/or JSON-LD. Use **JSON** to export the snapshot.

### Data

Shows bounded rows recovered from the selected visual, including D3-bound rows where available. Use **CSV** to export tabular evidence.

Not every visual exposes underlying data. Canvas/image/remote iframe pages may expose only visual metadata.

### Source

Shows library/resource clues and other source evidence useful for understanding how the page was built.

### Gemini

Contains three workflows.

#### Article -> visual

Requires a prior page scan. VizLens sends a compact evidence packet and optionally a resized annotated screenshot. Gemini must choose one allowlisted planning function. The model references fact/visual IDs; host code owns numbers and final materialization.

#### Text -> visual JSON

Paste copied article text, selectable PDF text or OCR text. VizLens builds deterministic numeric facts locally, then runs the same grounded planner.

Useful when:

- the page DOM is difficult to extract;
- you already copied report/PDF text;
- you want to test the article planner independently of web extraction.

#### Viewport result

Results from **Analyze viewport** appear here. When a primary visual is detected you can export the detected region as PNG.

### VizForge

Creates a neutral research brief from the selected visual for use by the separate VizForge visualization/rendering project.

VizLens does not try to become the final rendering engine. Its job is evidence recovery and semantic handoff.

### Power BI

Creates a draft data-role/spec handoff for a selected visual. It is not a `.pbiviz` generator. The downstream Power BI/VizForge adapter should own capabilities, DataView mapping, formatting, lifecycle and packaging.

## What gets sent to Gemini

Only when you explicitly request a Gemini action:

### Article planning

A bounded evidence packet containing approximately:

- page title, not the page URL;
- article headline/description;
- selected article blocks;
- bounded numeric-fact text contexts;
- bounded visual metadata;
- optionally a resized annotated viewport screenshot when useful.

### Viewport analysis

- resized visible screenshot;
- bounded page title metadata.

The local extension/proxy validates AI outputs before accepting them.

## What VizLens intentionally does not do

- It does not automatically call Gemini on every page.
- It does not send every page you browse to a server.
- It does not expose the Gemini key to page JavaScript.
- It does not trust model-generated numeric values.
- It does not run page-provided code or page-provided AI tools.
- It does not guarantee that every visual has recoverable source data.
- It does not force a chart when evidence is insufficient.
