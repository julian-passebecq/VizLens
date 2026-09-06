# Chrome Web Store branch status

Branch: `chrome-web-store-v1`

Status: Store-preparation line. Personal `main` remains the local/unpacked v1 line.

Automated GitHub checks on this branch:

- `zero-quota`: full deterministic/core regression gate, BBC pack, Gemini wire-contract mocks, proxy/fixture security, Store permission/privacy assertions, and Store runtime package build.
- `browser-e2e`: Chrome for Testing loads the real unpacked extension, triggers the extension action to grant `activeTab`, scans the controlled BBC-like fixture, and confirms optional localhost access is not pre-granted.
- `live-gemini-optional`: manual only; runs the two-request real Gemini contract when a `GEMINI_API_KEY` GitHub Actions secret is configured.

Store v1 keeps Gemini optional through the user-run localhost companion and user's own API key. A future zero-setup Store version would need an authenticated/rate-limited HTTPS backend before replacing that companion.
