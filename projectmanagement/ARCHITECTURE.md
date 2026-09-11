# Lead architecture decisions

Status: initial target approved for Sprint 001 on 2026-09-08. This is a design specification, not a claim that these boundaries are implemented. Root `ARCHITECTURE.md` documents the established product approach; the initial audit identifies where code differs from claims.

## Current map

| Module | Responsibility | Review observation |
| --- | --- | --- |
| `src/service-worker.js` | Side-panel opening behavior | Small lifecycle entry point |
| `src/page-scanner.js` | Serialized MAIN-world DOM/runtime extraction; measure/focus/SVG helpers | Helpers must survive serialization; extraction output is bounded in places but not globally |
| `src/article-facts.js` | Text scan, localized numeric facts and evidence references | Authoritative values are parser outputs, still subject to parser/semantic errors |
| `src/model.js` | Runtime rows, family inference, CSV and downstream handoffs | Family inference is heuristic, not proof of temporal/semantic meaning |
| `src/ai-contract.js` | Prompt packet, host selection and materialization | Mixed selections currently subset silently; time completeness needs a guard |
| `src/sidepanel.js` | State, Chrome access, UI, captures and action coordination | Many async responsibilities with no operation/source ownership |
| `src/gemini-api.js` | Localhost client, timeout and AbortSignal relay | Already supports cancellation; UI must actually pass a signal |
| `server/gemini-core.mjs` | Provider adapter, constrained requests and response validation | Keep provider details here; validation errors after a call lack request accounting |
| `server/gemini-proxy.mjs` | Loopback HTTP, origin/body validation, exclusivity, counters | Exact-origin lock optional; aggregate counters rely on result/error metadata |

## Target flow

```text
Explicit action
  -> source/session controller (local identity and operation generation)
  -> bound browser adapter OR imported-text snapshot
  -> immutable scan/evidence snapshot
  -> deterministic facts + bounded prompt-visible catalog
  -> optional Gemini request via localhost (cancellable)
  -> strict provider response validation
  -> host materializer (all selected facts preserved or rejected)
  -> result envelope bound to source/operation
  -> UI and local exporters
```

### D001 — Source identity and operation ownership

Introduce a small controller module (suggested `src/research-session.js`) with plain data and pure transitions where practical. The UI owns presentation; the controller owns source generation and active operation. A snapshot needs local `scanId`, source kind, captured time, and, for DOM work, tab/window/document identity. Imported text has its own ID and no live tab dependency. Do not send browser IDs or full navigation URLs to the model.

Capture the tab once per action. Preserve the `documentId` returned by injection and use it when targeting subsequent DOM actions. Repeatedly querying “active tab” is not source binding. Document identity cannot detect every SPA/DOM update; use a scan-generation marker for visual lookup, observe navigation/activation to invalidate live eligibility, and fail closed on detected mismatches. The marker is a consistency check, not an authentication secret in MAIN world. Do not claim protection against a hostile page forging its own evidence.

A request holds its snapshot and operation ID. Success, catch/fallback, finally/button updates, and availability refreshes must all check current ownership. A late completion cannot replace the new source or clear a newer busy state. The explicit policy is **one active research operation per panel**; beginning a new source operation aborts/supersedes old work. Cancellation must not render an error fallback as a successful result. Closing/unloading the panel aborts active work where possible.

Retain the old local snapshot only as clearly labeled stale research, or clear it consistently. Sprint 001 chooses the simpler policy: new scan/import clears AI results, crops and selected visual; a tab/document change invalidates live-page actions and any in-flight result. Imported-text results remain independent of tab activation. Never silently turn a failed new scan into an export of the preceding source.

### D002 — Capture is a source-bound transaction

Suggested `src/browser-session.js` wraps Chrome access; suggested `src/capture.js` owns pure geometry/image work. Names may vary; avoid a broad framework migration. Injected functions remain self-contained with nested helpers; imported module bindings do not accompany a serialized function.

Screenshot capture is window-scoped and captures the active tab, so bind and check active tab/document and navigation generation around capture, measurements, and before sending/committing. If the page changes, discard and ask for a fresh explicit action. Compare viewport/scroll geometry around the operation; never substitute stale scan rectangles if live measurement fails. Do not promise atomic capture of a continuously animating page. Record a limitation if the API cannot guarantee it.

For DOM crop: compute the rectangle intersection with the viewport first, then convert both edges to image pixels, then clamp. Example: x=-20, width=100 means 80 visible CSS pixels, not 100. Fully outside/degenerate rectangles are an explicit no-crop result. Viewport analysis bbox belongs to the retained screenshot, not to whatever page is active when exporting.

Chrome documents injection `documentId` and targeted `documentIds` from Chrome 106, compatible with the repo's minimum 114. [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting). `captureVisibleTab` captures the active tab in the specified window; it does not accept a tab ID. [Chrome tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs). Checked 2026-09-08. The transaction design above is our inference from those API boundaries.

### D003 — Host grounding means preserving meaning as well as values

Keep Gemini selection restricted to prompt-visible fact/evidence IDs. Preserve every selected value fact in a successful materialization or reject the proposal. Do not select the largest unit group and silently discard the remainder. Unknown IDs, duplicate IDs, year-as-value IDs and mixed kind/unit selections must fail at a host boundary even if a schema also constrains them.

A time-series requires a grounded time for every emitted row and at least two distinct times. If any row has no defensible time, emit a table with a warning, preserving facts; do not quietly turn an incomplete trend into a ranking. This is an intentional behavior correction; update affected expectations and contract docs with rationale. Same-unit semantic coherence and ambiguous nearest-year heuristics remain an explicit Sprint 002 research priority. Do not pretend the host proves metric equivalence today. No automatic numeric derivation, interpolation or OCR values become authoritative in Sprint 001.

### D004 — Provider attempts are observable even on rejection

Count an upstream attempt once when dispatching fetch, regardless of transport, body-read, decoding, status, schema, tool or materialization failure. Attach bounded internal attempt metadata on every failure path and preserve it through the proxy; count zero on preflight or local rejection before dispatch. Never double-count by incrementing independently at multiple layers. Preserve original error code/cancel semantics. One article action remains at most one provider request, with no automatic retry.

The dirty baseline relaxes the requirement for a provider interaction ID. Keep strict type checking when present, accept absent diagnostic IDs, retain mandatory custom function-call IDs and all evidence/step validation. This is a local acceptance decision; current provider behavior was not independently verified in this audit. Update `/health` and docs that still claim the diagnostic ID is mandatory. No provider/model switch in this sprint.

### D005 — Scope of trust and future boundaries

MAIN-world data and DOM are untrusted even after extraction. Sanitization protects serialization, not truth. Validate structured input at boundaries, do not execute page-defined instructions, keep key material solely in the companion environment, and keep default extraction API-free. Resource URL redaction does not guarantee article prose contains no URL/private text; describe that accurately.

Retain the existing personal loopback/origin boundary. A Chrome-extension Origin allowlist is not authentication of all local clients; exact configured extension lock narrows browser callers. Further tightening, global payload/work budgets, export sanitization, schema versioning and extraction completeness are backlog decisions. Avoid presenting unsupported security guarantees while planning them.

Future output envelopes should identify schema version, source snapshot, method, warnings/completeness and evidence IDs. Preserve current public output shapes during Sprint 001 except the explicit incomplete-time-series fallback correction and accurate metadata. Any other compatibility change comes back to the lead with consumer impact.
