# VizLens Personal v1.0 — architecture and design choices

## System overview

```text
                    EXPLICIT USER ACTION
                           |
                           v
+-------------------------------------------------------------+
| Chrome MV3 extension                                       |
|                                                             |
| Side panel UI                                               |
|   |                                                         |
|   +--> chrome.scripting + activeTab                         |
|          |                                                  |
|          v                                                  |
|   deterministic page scanner                               |
|   DOM / article / JSON-LD / SVG / D3 / tables / runtimes   |
|          |                                                  |
|          +--> visual evidence V#                            |
|          +--> text evidence T#                              |
|          +--> numeric facts N#                              |
|          |                                                  |
|          +---------------------------+                      |
+--------------------------------------|----------------------+
                                       |
                        only on explicit Gemini action
                                       |
                                       v
+-------------------------------------------------------------+
| Local Node companion — 127.0.0.1:3987                      |
|                                                             |
| - reads GOOGLE_API_KEY / GEMINI_API_KEY from environment    |
| - Chrome-extension Origin validation                        |
| - optional exact extension-origin lock                      |
| - strict request/body limits                                |
| - single-flight/cancellation/quota metadata                 |
| - no wildcard CORS                                          |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Gemini Interactions API                                     |
|                                                             |
| Article plan: custom function calling, tool_choice=any      |
| Viewport: structured application/json output, no tools      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Host validation/materialization                             |
|                                                             |
| - only known IDs                                            |
| - actual numeric values from deterministic host facts       |
| - host-owned time/year binding                              |
| - strict schema/bbox checks                                 |
| - research-only fallback when grounding is insufficient     |
+-------------------------------------------------------------+
```

## Why Manifest V3

Chrome's current extension platform is Manifest V3. VizLens uses an MV3 service worker and the supported `chrome.sidePanel`/`chrome.scripting` APIs rather than legacy background-page patterns.

## Why a side panel instead of a popup

VizLens is a research companion, not a one-click action. A popup is too small and disappears when focus changes. The side panel provides persistent room for Visuals, Article, Data, Source, Gemini, VizForge and Power BI views while leaving the target page visible.

Chrome's Side Panel API is available on MV3 from Chrome 114, which is why `minimum_chrome_version` is 114.

## Why `activeTab` + `scripting` instead of `<all_urls>`

VizLens needs page access only when you intentionally invoke it. `activeTab` grants temporary access to the active page after a user gesture, and `scripting` performs the runtime injection.

Benefits:

- no persistent blanket read access to every website;
- access naturally expires on cross-origin navigation/close;
- smaller permission surface;
- behavior matches the personal research workflow.

The tradeoff is intentional: after navigating to a different site, you may need to click the VizLens action again.

## Why vanilla JavaScript instead of React

For v1 the extension UI/scanner is deliberately vanilla JS.

Reasons:

- the UI is modest and state is local to one side-panel instance;
- no bundler/build step is needed to load the extension;
- no production npm dependency needs to be shipped;
- simpler CSP and debugging;
- smaller supply-chain and maintenance surface;
- direct use of Chrome APIs is straightforward.

React would become justified if VizLens grows into a much larger stateful application with reusable interactive components, routing, complex editor state or a plugin ecosystem. It is not required for this v1 research tool.

D3 is also **not bundled as a renderer**. VizLens detects/recover D3-bound evidence from pages; downstream VizForge is the better place for rich D3 visualization authoring/rendering.

## Why deterministic extraction before AI

The central architecture rule is:

> Use code for evidence and numbers; use the model for semantic selection/classification.

The page scanner locally creates bounded evidence and numeric facts before Gemini sees anything. This provides:

- reproducible parsing tests;
- lower token usage;
- fewer hallucinated values;
- explicit provenance IDs;
- a useful non-AI mode when Gemini is offline.

## Why the model never owns authoritative numeric values

Article planning exposes value fact IDs such as `N1`, not free-form numeric fields. Gemini chooses which facts are useful. VizLens resolves the actual values from its own deterministic fact catalog.

Time/year association is also host-owned. This prevents the model from silently pairing a correct value with an invented or wrong year.

## Why two separate Gemini contracts

### Article planning -> function calling

Article planning is a discrete decision: choose an existing visual, choose grounded article facts for a visual, or stop research-only.

VizLens uses custom function declarations and constrains Gemini with `tool_choice.allowed_tools.mode = "any"`. The returned function call must match a dynamically limited schema containing only prompt-visible IDs.

### Viewport analysis -> structured output

Viewport analysis is classification/localization, not tool execution. VizLens requests `application/json` constrained by `VIEWPORT_SCHEMA`, with no custom tools in that interaction.

Keeping these modes separate makes response validation simpler and avoids ambiguous “tool call plus final structured answer” behavior.

## Why the Interactions API

The Gemini Interactions API is the current unified interface for Gemini model/tool/structured-output workflows. VizLens uses its explicit `steps[]` topology so tool calls and model outputs can be validated by type rather than inferred from free-form text.

## Why a localhost Node companion

A Chrome extension is client-side software. Shipping the Gemini key inside it would make extraction trivial.

The Node companion provides a minimal server-side secret boundary without requiring you to deploy infrastructure:

- binds only to `127.0.0.1`;
- reads the key from process environment;
- accepts AI POSTs only from Chrome-extension origins;
- can optionally lock to the exact unpacked VizLens origin;
- applies request limits, cancellation and single-flight behavior;
- forwards only explicit Gemini actions.

For a future public Store version, this boundary would likely move to a proper authenticated HTTPS backend rather than shipping a shared secret in the extension.

## Why no automatic Gemini retry storm

VizLens is free-tier/cost-conscious. The proxy allows one active Gemini operation per extension origin and exposes retry metadata instead of automatically issuing multiple upstream requests.

This makes API usage inspectable and prevents an accidental click loop from multiplying cost/quota.

## Data flow by operation

### Scan page

```text
page -> injected deterministic scanner -> side-panel state
```

No Gemini request.

### Article -> visual

```text
scan -> bounded evidence packet + optional resized annotated screenshot
     -> localhost proxy
     -> one Gemini planning function call at most
     -> strict ID/tool validation
     -> host-owned numeric/time materialization
     -> visual JSON
```

If the local evidence cannot support a visual, the host can skip Gemini entirely or the allowed function can return research-only.

### Analyze viewport

```text
visible viewport screenshot
     -> resize locally
     -> localhost proxy
     -> Gemini structured JSON classification
     -> host bbox/schema validation
     -> optional local crop export
```

## Trust boundaries

Untrusted:

- inspected page HTML/text;
- embedded instructions in articles/PDFs/images;
- model response until validation succeeds.

Trusted/authoritative:

- extension allowlists and schemas;
- locally extracted fact IDs/values after parser validation;
- host tool execution/materialization rules.

The Gemini system prompt explicitly treats page/document content as evidence, never instructions.

## External design references

- Chrome activeTab: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- Chrome scripting: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Chrome sidePanel: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Gemini Interactions API: https://ai.google.dev/gemini-api/docs/interactions-overview
- Gemini function calling: https://ai.google.dev/gemini-api/docs/function-calling
- Gemini API keys/security: https://ai.google.dev/gemini-api/docs/api-key
