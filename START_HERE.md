# START HERE — VizLens Personal v1.0

This is the shortest path from ZIP -> working extension -> first test.

## 0. What you need

- Windows 10/11.
- Google Chrome 114 or newer.
- Node.js 20 or newer.
- A current Gemini API key from Google AI Studio if you want the AI features.

**Normal deterministic scanning works even if Gemini is not configured.**

## 1. Extract the ZIP

Extract the whole release to a normal folder, for example:

```text
C:\Tools\vizlens_personal_v1_0\
```

Do not load the ZIP itself in Chrome. Chrome needs the extracted folder containing `manifest.json`.

## 2. Create/configure the Gemini key

Create a current key in Google AI Studio. Google now recommends keeping Gemini credentials server-side and treats the key as a secret.

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

## 3. Run the first-run check

Double-click:

```text
first-run.cmd
```

or in PowerShell:

```powershell
.\first-run.ps1
```

The check reports:

- Node version.
- manifest/package version sync.
- localhost permission.
- whether a key variable is present.
- whether the companion is already running.

A missing key or an offline companion is informational at this stage; the deterministic extension can still be loaded.

## 4. Start the local Gemini companion

Double-click:

```text
start-vizlens.cmd
```

Leave that terminal window open while using Gemini features.

You should see roughly:

```text
VizLens Gemini proxy listening on http://127.0.0.1:3987
Gemini model: gemini-3.8-flash
API key configured: yes
```

Then open this in Chrome:

```text
http://127.0.0.1:3987/health
```

You should get JSON containing `"ok": true` and `"keyConfigured": true`.

## 5. Load VizLens in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the extracted `vizlens_personal_v1_0` folder — the folder containing `manifest.json`.
5. Optionally pin VizLens to the Chrome toolbar.

Chrome shows an extension ID on this page. You do not need it for basic use.

## 6. First deterministic test — no Gemini quota

Open a normal article or visualization page.

1. Click the **VizLens toolbar icon** while you are on that page.
2. The VizLens side panel opens.
3. Click **Scan page**.
4. Check the **Visuals**, **Article**, **Data**, and **Source** tabs.

If you navigate to a completely different site, click the VizLens toolbar icon again before scanning. This is expected: VizLens uses Chrome's temporary `activeTab` permission instead of permanent `<all_urls>` access.

## 7. First Gemini article test

On a page with an article containing at least two compatible numeric facts:

1. Click **Scan page**.
2. Open the **Gemini** tab.
3. Confirm the status says the local Gemini companion is ready.
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

Then restart `start-vizlens.cmd`.

Without this variable, the proxy already accepts POST requests only from `chrome-extension://` origins. The exact-origin setting is an additional personal hardening option.

## 10. Run the release regression suite

From the VizLens folder:

```powershell
npm run verify:personal
```

No Gemini API call is made by this command.

Then follow `FIRST_TEST_CHECKLIST.md` for the controlled fixture test and one real-site test.
