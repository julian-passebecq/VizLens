# START HERE — VizLens Personal v1.0

This is the shortest path from repo/ZIP -> working extension -> first test.

## 0. What you need

- Windows 10/11.
- Google Chrome 114 or newer.
- Node.js 20 or newer.
- A current Gemini API key from Google AI Studio only if you want the AI features.

**Normal deterministic scanning works even if Gemini is not configured.**

## 1. Extract or clone VizLens

Use a normal folder containing `manifest.json`, for example:

```text
C:\Tools\VizLens\
```

Do not load the ZIP itself in Chrome.

## 2. Optional: configure the Gemini key

Recommended Windows method:

1. Start menu -> search **Environment Variables**.
2. Open **Edit environment variables for your account**.
3. Under **User variables**, choose **New**.
4. Variable name: `GEMINI_API_KEY`
5. Variable value: your key.
6. Close all dialogs.
7. Open a **new** terminal so the new environment is visible.

`GOOGLE_API_KEY` is also supported. If both are defined, VizLens uses `GOOGLE_API_KEY` first.

Do **not** paste the key into extension source files, `manifest.json`, GitHub, or a ZIP you share.

## 3. Fastest path: one launcher

Double-click:

```text
run-vizlens.cmd
```

or from PowerShell:

```powershell
.\run-vizlens.cmd
```

The launcher:

- checks Node.js;
- detects whether the local Gemini companion is already running;
- starts it only when needed and a key is configured;
- continues in deterministic scan-only mode if no key is configured;
- opens `chrome://extensions/`;
- opens the health endpoint when the companion is running.

You can rerun the launcher safely; it will not intentionally start a duplicate companion when the existing health endpoint is reachable.

## 4. Load VizLens in Chrome — first time only

Use a separate Chrome profile such as **VizLens Dev** if you want development state isolated from your normal browsing profile.

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the VizLens folder containing `manifest.json`.
5. Optionally pin VizLens to the toolbar.

After this first load, normal use is just `run-vizlens.cmd` plus the VizLens toolbar icon.

## 5. Optional zero-quota verification before browsing

Double-click:

```text
verify-vizlens.cmd
```

or run:

```powershell
npm run verify:personal
```

This checks the deterministic scanner, article/data extraction, BBC regression cases, local proxy behavior, fixtures, and Gemini request/structured-output contracts without making a live Gemini request.

The `main` branch also runs these checks automatically in GitHub Actions, plus a real Chrome-for-Testing MV3 integration test.

## 6. First deterministic test — no Gemini quota

Open a normal article or visualization page.

1. Click the **VizLens toolbar icon** while you are on that page.
2. The VizLens side panel opens.
3. Click **Scan page**.
4. Check the **Visuals**, **Article**, **Data**, and **Source** tabs.

If you navigate to a completely different site, click the VizLens toolbar icon again before scanning. This is expected: VizLens uses Chrome's temporary `activeTab` permission instead of permanent blanket web access.

## 7. First Gemini article test

On a page with an article containing at least two compatible numeric facts:

1. Click **Scan page**.
2. Open the **Gemini** tab.
3. Confirm the local Gemini companion is ready.
4. Click **Article -> visual**.
5. Inspect the grounded JSON.

Expected behavior:

- Gemini makes at most one planning request.
- Gemini chooses allowlisted evidence IDs/functions.
- VizLens materializes the actual numbers locally.
- If evidence is insufficient, VizLens may intentionally return research-only instead of forcing a chart.

## 8. First PDF/viewport test

Open a PDF or a page with a clearly visible chart.

1. Put the chart visibly in the viewport.
2. Open VizLens.
3. Click **Analyze viewport**.
4. Inspect the result in the Gemini tab.
5. If a primary visual is detected, try **Export detected viewport visual PNG**.

Viewport mode sends a resized copy of the visible screenshot to Gemini. It is for visual localization/classification, not authoritative number extraction.

## 9. Optional exact-origin hardening

After Chrome assigns the unpacked extension ID, you can restrict the local companion to only that exact VizLens instance.

Set a user environment variable:

```text
VIZLENS_EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID
```

Then restart the companion.

Without this variable, the proxy accepts POST requests only from `chrome-extension://` origins. The exact-origin setting is additional personal hardening.

## 10. Detailed test checklist

Follow `FIRST_TEST_CHECKLIST.md` for the controlled fixture tests and real-site checks.
