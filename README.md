# VizLens Personal v1.0

**Stable personal/unpacked release for visual research in Chrome.**

VizLens inspects the page you are looking at, recovers structured visual/article evidence locally, and can optionally ask Gemini to choose a grounded visual plan or identify the main visual in the visible viewport.

## Start here

If you only want to install and test it, read:

1. **`START_HERE.md`** — 10-minute setup and first use.
2. **`FIRST_TEST_CHECKLIST.md`** — exact tests to run and what counts as PASS.
3. **`USER_GUIDE.md`** — what each button/tab does.
4. **`TROUBLESHOOTING.md`** — common failures and fixes.

For development/reference:

- `ARCHITECTURE.md` — architecture and design choices.
- `GEMINI_CONTRACT.md` — exact Gemini request/response contract.
- `TESTING_GUIDE.md` — automated and live testing.
- `FEATURES.md` — feature inventory.
- `PRIVACY.md` and `KEY_MANAGEMENT.md` — local data/key handling.
- `RELEASE_NOTES.md` — v1.0 release notes.

## What v1.0 is

- A **personal Chrome extension loaded unpacked** from `chrome://extensions`.
- Manifest V3, Chrome 114+.
- Vanilla JavaScript; no React, bundler, or production npm dependency.
- Page scanning is deterministic and local.
- Gemini is optional and goes through a local Node companion at `127.0.0.1:3987`.
- The Gemini key stays in a Windows environment variable and is never bundled into the extension.
- The current page URL is not included in Gemini prompts.
- The active personal line is separate from the frozen Chrome Web Store-oriented v0.15 baseline.

## Fast Windows setup

```text
1. Install Node.js 20+ if needed.
2. Create a current Gemini API key.
3. Store it as GEMINI_API_KEY or GOOGLE_API_KEY in your Windows user environment.
4. Double-click first-run.cmd.
5. Double-click start-vizlens.cmd and leave that terminal open.
6. Chrome -> chrome://extensions -> Developer mode -> Load unpacked -> select this folder.
7. Open a normal article/web page and click the VizLens toolbar icon.
8. Click Scan page.
```

No `npm install` is required for normal VizLens use. It is only needed for the optional Puppeteer extension E2E test.

## Three main ways to use VizLens

### 1. Inspect a normal web page

Open a page, click the VizLens toolbar icon, then **Scan page**. VizLens looks for SVG, Canvas, tables, analytical images/iframes, D3-bound data and common chart-runtime clues. Use the tabs to inspect Article, Data, Source, VizForge and Power BI handoffs.

### 2. Turn article/PDF text into grounded visual JSON

After scanning an article, open **Gemini** and click **Article -> visual**. Or paste copied PDF/article/OCR text into the text box and click **Text -> visual JSON**.

Gemini selects existing evidence IDs; VizLens owns the actual numeric values and deterministically binds compatible years/time evidence.

### 3. Analyze what is visibly rendered

For PDFs, scanned pages, newspaper graphics, canvas-heavy pages or pages whose DOM is inaccessible, click **Analyze viewport**. A resized screenshot of the visible viewport is sent through the local companion to Gemini, which returns a constrained primary-visual classification and normalized bounding box.

## One-command local regression gate

```powershell
npm run verify:personal
```

This uses **zero Gemini quota**.

Optional live Gemini contract check:

```powershell
npm run test:gemini:live:contract
```

That makes exactly two synthetic Gemini requests: one function-call contract and one structured-output contract.

## Security boundary

```text
Chrome page
   |
   | explicit user invocation / activeTab
   v
VizLens extension
   |-- deterministic DOM/article/chart extraction stays local
   |
   | localhost only when you request Gemini
   v
127.0.0.1:3987 Node companion
   |-- reads GOOGLE_API_KEY / GEMINI_API_KEY from environment
   |-- validates Chrome-extension origin
   |-- validates request body
   v
Gemini Interactions API
```

See `ARCHITECTURE.md` for the rationale and `PRIVACY.md` for what leaves the machine.
