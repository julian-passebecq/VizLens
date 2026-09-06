# VizLens Personal v1.0 — release notes

## Release intent

v1.0 is the first package intended for regular personal testing rather than continuous numbered development checkpoints.

It freezes the current architecture as the supported personal baseline:

- unpacked Chrome MV3 extension;
- vanilla JavaScript UI/scanner;
- deterministic-first evidence recovery;
- optional localhost Gemini companion;
- Gemini Interactions function calling for article planning;
- structured JSON output for viewport classification;
- host-owned numeric values/time binding;
- zero-quota automated release gate.

## v1.0 additions over v0.20

- Stable `1.0.0` package/manifest version.
- `START_HERE.md` with exact installation steps.
- `USER_GUIDE.md` describing every main workflow and tab.
- `FIRST_TEST_CHECKLIST.md` with PASS criteria.
- Expanded `ARCHITECTURE.md` explaining design choices/tradeoffs.
- `TROUBLESHOOTING.md` for common Chrome/key/proxy/PDF/data issues.
- Reworked `TESTING_GUIDE.md` around layered debugging.
- Windows `first-run.cmd` / `first-run.ps1` helpers.
- Windows `test-vizlens.cmd` convenience gate.
- Release documentation assertions added to automated tests.

## Grounding/correctness inherited from v0.20

- sentence-local year binding;
- one-to-one value/year pairing for compatible lists;
- fact-centered long-paragraph context;
- deterministic category/metric label recovery;
- prompt-visible dynamic Gemini fact ID schemas;
- strict function-call and structured-output topology validation;
- no model-owned authoritative numeric values;
- loopback/origin/CORS/body/single-flight/cancellation proxy protections.

## Known limits

- Some Canvas/custom runtime charts expose no recoverable underlying values.
- Cross-origin iframe internals cannot always be inspected.
- Chrome-protected pages cannot be DOM-scripted.
- PDF viewer mode is primarily viewport + copied-text oriented.
- PNG export is limited to the currently visible rendered region.
- The personal release requires a local Node process for Gemini features.
- This is not the Chrome Web Store release line.

## Upgrade from v0.20

Treat v1.0 as a new extracted folder rather than overwriting v0.20.

1. Extract v1.0.
2. Run `first-run.cmd`.
3. In `chrome://extensions`, remove or disable the old personal checkpoint.
4. Load unpacked from the new v1.0 folder.
5. Start the v1.0 local companion.
6. Run `FIRST_TEST_CHECKLIST.md`.
