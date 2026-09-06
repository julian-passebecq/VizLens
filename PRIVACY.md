# VizLens Chrome Web Store privacy policy — v1.0

Last updated: 2026-09-06

VizLens has one purpose: help you inspect analytical visuals and article evidence on the page you intentionally invoke it on, recover grounded data locally, and create visual-research/export handoffs.

## Local page scanning

VizLens does not continuously monitor browsing. It uses Chrome `activeTab` access only after you invoke the extension on the current page. `Scan page` performs deterministic inspection in the browser and keeps scan state and exports on your device. No page content is sent merely because you browse, open VizLens, or scan a page.

## Optional Gemini features

Before the first Gemini transmission, VizLens shows an in-product AI data disclosure and asks for affirmative consent plus optional permission to contact the localhost companion.

When you explicitly choose **Article -> visual**, **Text -> visual JSON**, or **Analyze viewport**, VizLens may send only the data needed for that request through the local companion on your computer to the Google Gemini API. Depending on the action, this can include bounded article text/evidence, numeric-fact context, visual metadata, a resized/annotated viewport image, or pasted document text.

The current page URL is not included in Gemini prompts. The full-resolution screenshot used for local crop export remains local.

## Parties receiving data

For optional Gemini actions, the relevant bounded request data is transmitted to **Google Gemini** using the API key configured by the user in the local VizLens companion. VizLens does not sell user data, use it for advertising, or share it with data brokers.

## API credentials

The Chrome extension does not collect, store, or transmit your Gemini API key. The separate localhost companion reads the key from your operating-system environment and sends it directly to Google over HTTPS as required by the Gemini API. Never put a real API key in extension source files or GitHub.

## Permissions

- `activeTab`: temporary access to the page only after explicit invocation.
- `scripting`: runs the deterministic scanner in the active page after invocation.
- `sidePanel`: provides the VizLens research interface alongside the page.
- optional `http://127.0.0.1/*`: requested only if you enable Gemini features so the extension can contact your local companion.

VizLens does not request blanket `<all_urls>` browsing permission.

## Retention

VizLens does not operate a cloud database for page scans. Local extension state is transient unless you explicitly download/export a file. Google Gemini processing/retention is governed by the Google API terms applicable to the Gemini API and the Google project/API key you use.

## Security

The local companion binds to loopback (`127.0.0.1`), validates Chrome-extension origins on AI requests, does not use wildcard CORS, limits request bodies, and communicates with Gemini over HTTPS. Page/document content is treated as untrusted evidence rather than executable instructions.

## Changes

If VizLens introduces materially different user-data practices, the disclosure and this policy will be updated before those practices are enabled.
