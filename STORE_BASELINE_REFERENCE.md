# Frozen Chrome Web Store baseline

Chrome Web Store hardening is intentionally frozen at **v0.15**. Keep the v0.15 Store review candidate/development archive separately.

**VizLens Personal v1.0 is not the Store branch.**

If Store work resumes later:

1. branch from the frozen v0.15 Store baseline;
2. cherry-pick stable scanner/Gemini/core fixes from the personal v1 line;
3. reintroduce only Store-required consent, permission, backend/deployment and listing work;
4. do not make the personal line carry publication complexity.
