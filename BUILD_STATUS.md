# VizLens Personal v1.0 — build / QA status

## Release stance

Stable personal/unpacked Chrome release candidate. Chrome Web Store-specific work remains frozen on the separate v0.15 baseline.

## Required v1 release gate

```powershell
npm run verify:personal
```

The gate must pass from both the working tree and a freshly extracted release ZIP.

## Coverage carried into v1

- 38 core article regressions.
- 6 BBC-style regression scenarios.
- 24 numeric/unit ambiguity cases.
- JSON-LD, lazy-news, D3-bound and Plotly-runtime fixtures.
- Gemini dynamic tool schemas and prompt-visible ID enforcement.
- malformed/parallel/inactive/unknown tool rejection.
- structured-output schema/extra-output rejection.
- sentence-local host time binding and list pairing.
- proxy Origin/CORS/body/single-flight/cancellation tests.
- VizForge/Power BI handoff checks.
- credential/source security scan.
- release-document presence/version assertions.

## Optional external gates

### Real Chrome E2E

```powershell
npm install
npm run test:e2e
```

### Live Gemini

```powershell
npm run test:gemini:live:contract
```

The live contract makes two synthetic API requests total.

## Security/release invariants

- no Gemini credential embedded in extension files;
- no wildcard CORS;
- companion bound to loopback;
- Chrome-extension Origin validation;
- no `eval` / `new Function`;
- no automatic Gemini retry fan-out;
- no model-generated authoritative numeric values;
- page/document content treated as untrusted evidence;
- current page URL omitted from Gemini prompts.
