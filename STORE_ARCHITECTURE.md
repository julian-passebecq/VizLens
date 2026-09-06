# VizLens Store architecture

```text
Current page --explicit activeTab--> packaged deterministic scanner
                                    |
                                    +--> local exports / handoffs
                                    |
                              optional Gemini action
                                    | disclosure + consent
                                    | optional localhost permission
                                    v
                         127.0.0.1:3987 companion
                                    | HTTPS + user's API key
                                    v
                              Google Gemini
```

The first Store release keeps the proven local companion rather than embedding a key or exposing a shared unauthenticated backend. The extension remains useful without AI.

A future zero-setup Store edition should use an authenticated, rate-limited HTTPS backend. Origin/CORS checks alone must never be treated as protection for a shared Gemini quota.
