# VizLens V0.15 research benchmark

## Scope of this pass

V0.15 deliberately did not add a PDF engine, another AI provider, a dashboard generator, or a Power BI package generator. It hardened the existing free-tier Gemini research workflow and added a zero-call deterministic preflight.

## Regressions now locked down

- D3/runtime visual-family and bound-row recovery.
- 37 article/numeric extraction regressions.
- 21 scale/unit token cases, including grouped decimals, bps/MW ambiguity, NFKC/full-width numbers, Japanese `万/億/兆` + `円`, and accounting-parentheses negatives.
- Prompt-injection numeric bait exclusion.
- Mixed-unit rejection.
- Prompt-visible fact/visual/evidence ID enforcement.
- Dynamic enum-constrained Gemini tool schemas.
- Zero-call research-only preflight when no useful visual can be grounded.
- Actual upstream Gemini request accounting distinct from local proxy operations.
- Interaction-status and viewport-bounds validation.
- Upstream network-error normalization.
- Unknown/malformed Gemini tool-call rejection.
- Current and legacy Gemini quota/error-code normalization.
- Proxy origin/content-type/body validation.
- Single-flight quota guard.
- Browser-disconnect cancellation propagation.
- Request-ID diagnostics.

## Design consequence

The key invariant is now stronger than "the model cannot invent numbers":

> Gemini may only choose from evidence identifiers that were explicitly included in the exact compact packet it saw, and VizLens remains the only component allowed to resolve those identifiers into authoritative numeric values.
