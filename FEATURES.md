# VizLens Personal feature inventory — v1.0

## Discovery

- SVG, Canvas, HTML table, analytical image and iframe discovery.
- Lazy iframe/image URL clues (`data-src`, `data-srcset`, related attributes).
- Primary analytical visual ranking.
- Runtime clues for Plotly, ECharts, Highcharts and Chart.js-style surfaces where accessible.
- D3-style `__data__` recovery from SVG marks, bounded row capture and mark/data mapping inference.

## Article/evidence layer

- Article/main-content extraction.
- JSON-LD NewsArticle/Article fallback for headline, author, publication date and article body.
- Stable text/visual/numeric evidence IDs.
- Multilingual/localized numeric parsing and compatibility grouping.
- Query/hash/credential stripping from captured resource URLs.

## Gemini function calling

- Gemini Interactions API with `store:false`, `stream:false`, `background:false`, `thinking_level:low` and `thinking_summaries:none`.
- At most one Gemini request for an article plan; zero-call research-only preflight when appropriate.
- Dynamic custom functions limited to prompt-visible evidence.
- `tool_choice.allowed_tools.mode = any` for exactly one planning action.
- Flat `factIds[]` contract: Gemini cannot bind selected values to years and cannot author numeric values.
- Host deterministically binds explicit time evidence and materializes authoritative numbers.
- Time binding stays inside the value's sentence segment and uses stable one-to-one source-order pairing when compatible value/year counts match.
- Long article facts send a bounded context window centered on the fact instead of truncating only from the start of the paragraph.
- Adjacent/list-style numeric facts recover host-derived labels from shared metric prefixes or text between values; the model cannot author numeric labels.
- Strict host validation rejects unknown/inactive tools, pre-tool model prose, built-in/parallel calls, hidden IDs, extra fields, duplicate facts and incompatible metric selections.
- Successful tool interactions require an interaction ID, signed thought steps when present, and exactly one standard custom `function_call`.

## Gemini structured output

- Viewport classification uses no tools.
- `response_format` requests `application/json` matching `VIEWPORT_SCHEMA`.
- Host validates exact keys, enum values, normalized bbox range/containment and primary-visual size.
- Successful structured-output interactions require `completed`, an interaction ID, signed thought steps when present, and exactly one JSON `model_output` text block.
- Unexpected tool-call or extra model-output steps are rejected.

## Outputs

- CSV, JSON, SVG, PNG crop and privacy-reduced diagnostics.
- Article snapshot.
- Neutral visual-evidence / visual-plan JSON.
- VizForge research brief.
- Power BI role/spec handoff (not `.pbiviz` generation).

## Testing

- Core article and numeric regression packs.
- BBC-style regression pack.
- Local BBC-like, JSON-LD-only, D3-bound and Plotly-runtime browser fixtures.
- Proxy/security smoke tests, including reflected-Origin cache semantics.
- Development-only unpacked-extension E2E through `puppeteer-core` + installed Chrome.
- Zero-quota serialized Gemini contract audit.
- Optional unpacked-extension Puppeteer E2E through real `chrome.scripting` injection.
- Optional one-request live function-call smoke.
- Optional one-request live structured-output smoke.
- Manual BBC + official Observable/D3 live-site matrix.
