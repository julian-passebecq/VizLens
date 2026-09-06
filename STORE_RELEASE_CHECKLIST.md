# VizLens Chrome Web Store v1 — release checklist

Branch: `chrome-web-store-v1`

The Store line is isolated from the personal `main` line.

## Store v1 architecture decision

Deterministic scanning is fully functional without Gemini. Optional Gemini features use the user-run localhost companion and the user's own API key. The key is never bundled into the extension.

This deliberately avoids an extractable client secret or an unauthenticated shared cloud quota. A future zero-setup edition can replace the companion with an authenticated, rate-limited HTTPS backend. CORS/origin checks alone are not authentication.

## Before upload

- [ ] `npm run verify:store` passes.
- [ ] `npm install` then `npm run test:e2e:store` passes with Chrome for Testing/Chromium or another compatible test browser.
- [ ] `npm run build:store` stages the exact runtime package under `dist/store/`.
- [ ] On Windows, `npm run package:store` creates `dist/vizlens-chrome-web-store-v1.zip`.
- [ ] Load the unpacked `dist/store/` package once and test it.
- [ ] Confirm no real API key, `.env`, tests, server source, or development files are inside the Store ZIP.
- [ ] Confirm localhost access is optional, not persistent.
- [ ] Confirm first Gemini use shows the disclosure before transmission.
- [ ] Confirm Scan page works with no companion running.

## Dashboard

- [ ] Publisher Google account has 2-Step Verification.
- [ ] Store Listing is completed.
- [ ] Privacy tab is completed.
- [ ] Privacy-policy URL points to a stable public copy of `PRIVACY.md`.
- [ ] Single-purpose and permission explanations use `STORE_SUBMISSION_NOTES.md`.
- [ ] Google Gemini is disclosed as the recipient for optional AI request data.
- [ ] Remote hosted code answer: No. All extension executable logic is packaged.
