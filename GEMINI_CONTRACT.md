# VizLens Gemini contract — personal v1.0

VizLens uses the Gemini Interactions API in two deliberately separate modes. Custom function calling is used when Gemini must choose a host action. Structured output is used when Gemini itself must return typed JSON. VizLens does not combine the two modes in one interaction.

## Article/document planning — forced custom function call

```text
local evidence scan
  -> compact prompt-visible T/N/V IDs
  -> Gemini 3.8 Flash
  -> custom function declarations only
  -> generation_config.tool_choice.allowed_tools.mode = any
  -> status = requires_action
  -> optional signed thought step(s)
  -> exactly one function_call
  -> host validates + executes
  -> host materializes authoritative visual JSON
```

The active tool list is generated from the exact evidence packet and can contain:

- `use_existing_visual`
- `create_visual_recipe`
- `research_only`

`create_visual_recipe` is intentionally flat. Gemini selects only a visual family and host-owned value fact IDs. It never sends authoritative numbers or value/year pairs.

### Function-call invariants

- model: `gemini-3.8-flash`
- `store:false`
- `stream:false`
- `background:false`
- `thinking_level:"low"`
- `thinking_summaries:"none"`
- `response_format` absent
- only custom `type:"function"` tools
- `tool_choice.allowed_tools.mode:"any"`
- allowed tool names are a subset of the declared tools
- interaction status must be `requires_action`
- top-level interaction `id` is optional diagnostic metadata (live `store:false` responses can omit it); when present it must be a non-empty string
- permitted response steps: `thought`, `function_call`
- every returned `thought` step must have its encrypted `signature`
- standard custom `function_call` shape is exactly `type`, `id`, `name`, `arguments`
- exactly one function call is accepted
- call ID required
- arguments are revalidated against prompt-visible IDs and host business rules

The host binds time evidence and authoritative values itself. Time binding is sentence-local; when a sentence contains equal-size compatible value and year groups, VizLens pairs them one-to-one in source order before using a nearest-year fallback. The host rejects pre-tool `model_output`, built-in tool calls, parallel calls, undeclared tools, hidden IDs, duplicate facts, incompatible units and extra argument fields.

### Why `any`, not `validated`

`any` forces a tool call. `validated` focuses on schema adherence but does not guarantee a function is called. VizLens needs exactly one planning action, so it uses `any` plus independent host validation.

### Why no second function-result turn

VizLens does not need Gemini to write a final answer after the call. Once the selected IDs are validated, the host already has enough information to build the final renderer-neutral visual JSON. Stopping after the first tool call saves one API request and prevents a second model turn from rewriting grounded facts.

Thought signatures therefore never need to be replayed in the current one-turn planning workflow. If VizLens later adds a continuation turn, the full thought/tool context must be preserved exactly according to the Interactions API rules.

## Viewport classification — structured output

```text
viewport image
  -> Gemini 3.8 Flash
  -> tools absent
  -> response_format.type = text
  -> response_format.mime_type = application/json
  -> response_format.schema = VIEWPORT_SCHEMA
  -> status = completed
  -> optional signed thought step(s)
  -> exactly one model_output containing exactly one JSON text block
  -> JSON.parse
  -> host semantic validation
```

The host rejects extra fields, bad enums, malformed JSON, multiple model outputs, multiple text blocks, tool-call steps, out-of-range coordinates and invalid bounding boxes.

## Request-builder guardrails

`makeGeminiRequest()` rejects locally, before network dispatch:

- unsupported thinking levels (`minimal` is invalid for Gemini 3.8 Flash)
- invalid output-token ranges
- duplicate or malformed custom functions
- `allowed_tools` entries that were not declared
- malformed tool-choice modes
- mixing VizLens custom function calling with `response_format` in the same interaction

Deprecated Gemini 3 sampling/configuration fields are not sent.

## Tests

Zero-quota contract audit:

```powershell
npm run test:gemini:contract
npm run verify:personal
```

Optional live tests:

```powershell
npm run test:gemini:live       # 1 function-calling request
npm run test:gemini:live:json  # 1 structured-output request
npm run test:gemini:live:contract
```

The live fixtures are synthetic and do not send a browsing URL or real article.
