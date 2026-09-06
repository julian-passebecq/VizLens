# AI backend — personal v1.0

VizLens Personal uses `gemini-3.8-flash` through the local Node companion and the Gemini Interactions API.

## Article/document planning

- `store:false`, `stream:false`, `background:false`
- `thinking_level:"low"`, `thinking_summaries:"none"`
- custom functions only
- dynamic tools generated from prompt-visible evidence
- forced `tool_choice.allowed_tools.mode:"any"`
- no structured-output `response_format`
- one function call maximum
- Gemini chooses IDs; VizLens owns values, unit compatibility, time binding and final JSON
- zero Gemini calls when deterministic preflight finds no viable analytical result

## Viewport classification

- same Gemini model and synchronous Interactions endpoint
- no tools
- JSON Schema structured output via `response_format`
- exactly one JSON model-output text block
- independent host validation after `JSON.parse`

## Why not combine tools + structured output

Gemini 3 can support combined modes, but VizLens does not need the preview combination path. Keeping host actions and final typed model output as separate contracts makes failures easier to detect and prevents ambiguous handling.

## Thought handling

VizLens does not request thought summaries. If the API returns a `thought` step, its encrypted signature is validated but not surfaced to the extension. The personal planning flow has no continuation turn, so signatures do not need to be replayed.

## Provider scope

No Chrome built-in AI, Ollama, WebLLM, OpenAI or Groq runtime is shipped in the personal line.

The companion reads `GOOGLE_API_KEY` or `GEMINI_API_KEY` from the environment and calls Gemini over HTTPS. The credential is never bundled into the extension.
