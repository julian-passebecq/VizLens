# Chrome Web Store branch status

Branch: `chrome-web-store-v1`

Status: Store-preparation line. Personal `main` remains the local/unpacked v1 line.

Automated GitHub checks on this branch:

- `zero-quota`: validates the exact production Store manifest/policy plus the full deterministic/core regression gate, BBC pack, Gemini wire-contract mocks, proxy/fixture security, Store privacy assertions, and Store runtime package build.
- `browser-e2e`: Chrome for Testing loads a temporary CI copy of the Store runtime and exercises the real MV3 service worker, side-panel disclosure, `chrome.scripting` injection, and BBC-like scanner lifecycle. The temporary copy adds fixture-host access only because Puppeteer's Linux CI action simulation does not reliably confer Chrome `activeTab`; the production manifest is separately asserted to contain `activeTab` and no persistent host permission.
- `live-gemini-optional`: manual only; runs the two-request real Gemini contract when a `GEMINI_API_KEY` GitHub Actions secret is configured.

The authoritative `activeTab` user-gesture check remains the manual Chrome test: load the production Store build unpacked, open a page, click the VizLens toolbar action, and scan it.

Store v1 keeps Gemini optional through the user-run localhost companion and user's own API key. A future zero-setup Store version would need an authenticated/rate-limited HTTPS backend before replacing that companion.
