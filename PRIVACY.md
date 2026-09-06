# VizLens Personal v1.0 — privacy / data handling

VizLens is a personal/unpacked research tool, not a public Chrome Web Store privacy policy.

## Stays local by default

`Scan page` performs deterministic extraction inside Chrome and keeps scan state/exports on your computer.

No Gemini request is made merely because you browse a page or open VizLens.

## Leaves the computer only on explicit Gemini actions

### Article -> visual

VizLens sends a bounded evidence packet through the localhost companion to Gemini. It can include article headline/description, selected bounded blocks, numeric-fact context, visual metadata and an optional resized annotated viewport screenshot.

The current page URL is not included in the Gemini prompt.

### Analyze viewport

VizLens sends a resized analysis copy of the visible viewport plus bounded page-title metadata.

The full-resolution screenshot used for local crop export remains local.

## Credential handling

The browser extension never contains the Gemini key. The Node companion reads it from `GOOGLE_API_KEY` / `GEMINI_API_KEY` in the local process environment.

## Local companion protections

- listens on `127.0.0.1`;
- validates Chrome-extension Origin on AI POSTs;
- optional exact VizLens extension-origin lock;
- no wildcard CORS;
- strict JSON/body-size validation;
- single active Gemini call per extension origin;
- browser cancellation propagates upstream;
- page-defined instructions/tools are not executed.

## Diagnostics

`Debug JSON` is intentionally privacy-reduced, but you should still inspect diagnostic files before sharing them. Never share your API key.
