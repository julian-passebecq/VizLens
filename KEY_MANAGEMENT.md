# Gemini key management — VizLens Personal v1.0

## Supported variables

VizLens reads:

1. `GOOGLE_API_KEY` if defined;
2. otherwise `GEMINI_API_KEY`.

The value is read only by the local Node companion.

## Recommended setup

Use a current key from Google AI Studio and store it in your Windows **User environment variables**.

Do not store a real key in:

- extension JavaScript;
- `manifest.json`;
- Chrome local storage;
- `.env` committed to Git;
- screenshots;
- shared diagnostics;
- release ZIPs.

Google's current Gemini guidance recommends server-side secret handling and warns against exposing API keys client-side. Current AI Studio keys are moving to the newer authorization-key model; if an old unrestricted standard key stops working, create/migrate to a current supported key.

## Windows setup

1. Search **Environment Variables** from Start.
2. Open **Edit environment variables for your account**.
3. Add `GEMINI_API_KEY` as a User variable.
4. Close dialogs.
5. Open a new terminal.
6. Run:

```powershell
npm run doctor
```

VizLens never prints the key value.

## Optional exact extension-origin lock

After loading the unpacked extension, copy its ID from `chrome://extensions` and set:

```text
VIZLENS_EXTENSION_ORIGIN=chrome-extension://YOUR_EXTENSION_ID
```

Restart the companion.

With the variable set, AI POST requests must come from that exact extension origin. Without it, the proxy still rejects non-`chrome-extension://` origins.

## `.env.example`

`.env.example` is documentation only. VizLens does **not** automatically load `.env` files in v1. The recommended personal setup is the operating-system environment.

## Official reference

https://ai.google.dev/gemini-api/docs/api-key
