# VizLens v1.0 personal-mode decision

v1.0 is intentionally optimized for one-user unpacked Chrome usage.

## Active personal architecture

- Chrome MV3 side-panel extension.
- `activeTab` + `scripting` temporary page access.
- Deterministic extraction/local exports.
- Local Node Gemini companion on loopback.
- Environment-held Gemini key.
- Strict function/structured-output contracts and host validation.

## Deliberately not carried in this line

- Chrome Web Store consent/listing UX.
- Store packaging/publication gates.
- public multi-user authentication/backend deployment.
- Native Messaging work.
- HTTPS production backend work.

## Store baseline

The v0.15 Store-hardening checkpoint remains the reference if publication work resumes. Store work should cherry-pick stable scanner/Gemini/core changes from this personal v1 line rather than adding publication complexity back into the personal build.
