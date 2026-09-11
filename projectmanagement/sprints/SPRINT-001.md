# Sprint 001 — trustworthy research operations

State: READY_FOR_DEV. Authorized scope: VL-001 through VL-008. Lead: current tech-lead role. Developer: medium. Independent verifier/register maintainer: light QA. Baseline: `main` at `42d4409` plus existing dirty changes identified in REGISTERS.

## User outcome

A researcher can scan, switch tabs/import text, ask for analysis and export a crop without receiving another source's result. A successful generated plan preserves its selected evidence and never represents missing-time rows as a valid trend. API diagnostics count rejected responses accurately.

This is a substantive correctness sprint across the operation lifecycle. Execute all four passes continuously. Passes are reviewable milestones, not prompts for the owner to approve each implementation step. The lead intentionally placed closely related trust failures together; general extraction expansion and interface redesign wait.

## Read before coding

Read the lead architecture D001–D005, initial audit, current sidepanel/scanner/client/proxy/contracts and tests. Preserve the dirty stateless-response and Puppeteer changes. Record their baseline separately before editing overlapping files. Do not assume root feature/QA prose is executable evidence.

## P1 — source session and async ownership

**Deliverable:** a working source/operation controller integrated into every source-changing research action.

1. Record branch/HEAD, dirty paths, tool versions and baseline gate. Create the suggested local sprint branch if not already working in an explicitly chosen branch. Do not lose the dirty baseline.
2. Introduce small testable boundaries for session ownership and Chrome targeting. Store tab/window/document identity returned from injection and a local scan generation. Imported text has a separate source identity.
3. Bind scan, focus, SVG export and measurement to their originating document/generation. Invalidate live eligibility on tab change, navigation/reload, removal and scan supersession. At action time check the originating source; sanitized URL equality is insufficient. Detect changed SPA route/scan markers where possible and document residual dynamic-content limits.
4. Use one active research operation per panel. Pass AbortSignal into the client; guard successful results, fallback/error paths and finally handlers against superseded operations. New source work clears incompatible AI/crop/selection state. Fix selected visual consistency across all views, including Source.
5. Imported-text operations continue to work without DOM access and do not become stale just because a browser tab changes. An old DOM response cannot replace an imported-text result.

**Focused development checks:** controlled promises for out-of-order completion, failure after supersession, cancel during image encoding, and stale finally handlers. Verify normal scan/selection still renders. Check changes through AC01–AC04 before continuing; these tests can be implemented incrementally with the code.

## P2 — capture and browser helper correctness

**Deliverable:** source-bound screenshots, live measurement and mathematically correct crops.

1. Make every injected function self-contained; `measureVisuals` must execute after Chrome serializes it without a module binding to `measureVisual`. Use nested helpers or an explicitly packaged injection design, never dynamic eval in production.
2. Guard measurement and capture with the P1 source identity. On changed source/geometry or failed measurement, do not fall back to stale rectangles and silently annotate. Article planning may proceed evidence-only with a clear omission warning when capture is unavailable; do not send an ambiguous screenshot.
3. Share a small, pure viewport intersection/pixel conversion helper where it reduces inconsistent math. Correct negative x/y clipping; preserve actual visible dimensions at all boundaries, zoom and non-integer image scales. Close image bitmaps on every path.
4. Keep a viewport analysis and its source image together. Clear them together on source replacement/failed new analysis; exporting a retained crop must use the matched captured image. Never re-capture another page for an old bbox.
5. Add a local fixture with clipped/offscreen visuals and stable expected pixels. Exercise capture/annotation/exports with mocked AI; spend no provider quota.

**Focused development checks:** self-contained injection execution, pure geometry cases with independently calculated edges, and one real Chrome helper/crop path. If browser setup is blocked, record it and continue P3 and non-browser P4 work; browser acceptance stays pending.

## P3 — strict materialization and accurate provider accounting

**Deliverable:** host invariants hold through success and every failure path.

1. Reject mixed kind/unit selected sets as research-only or a normalized contract failure; do not retain the largest subset. Successful materialization preserves all valid selected value facts exactly once. Enforce duplicate/unknown/year-as-value checks at the shared host boundary, not just the provider schema.
2. Require every time-series row to have a grounded time, and two distinct times. If incomplete, keep all valid rows in a table and add an explicit warning. Retain supported sentence-local and explicit list pairing. Do not broaden nearest-year heuristics or redesign semantic inference in this pass.
3. Track upstream dispatch exactly once on all exits: fetch failure, body-read failure/abort, malformed JSON, invalid status, unexpected/invalid tools, viewport schema failure and host rejection. Preserve cancellation/error semantics; no retry loop. Local preflight/rejection before dispatch remains zero.
4. Verify client abort reaches the proxy and upstream; proxy exclusivity releases after cancellation/failure. Use injected fake provider functions for these tests. Correct misleading `/health` interaction-ID metadata and corresponding documentation while preserving the dirty baseline's stateless response support.
5. Keep all other public payload contracts/provider configuration stable. Add focused tests for corrected logic, including a test through the complete planner rather than only a utility function.

**Focused development checks:** AC08–AC12 with deterministic provider responses; no live API access. Existing buggy/weak tests may be replaced only with stronger independent expected outcomes and a documented reason. In particular, do not rely on a duplicated value fact to test sentence boundaries: create two distinct values and explicitly inspect the unresolved time.

## P4 — integration and independent-test handoff

**Deliverable:** a testable completed sprint with durable evidence, ready for light QA.

1. Wire new offline suites into the regular verification gate and syntax-check any new modules. Extend the source/security file list so extracting code into a new module cannot silently remove it from checks.
2. Extend real browser automation with real panel actions, helpers, downloaded artifacts and mocked AI lifecycle cases. Cover at least two source tabs, navigation/reload and imported text. Test loopback-origin fixture behavior separately from a real activeTab grant/revocation path. Do not widen production permissions to make tests pass.
3. Check the available Node/browser runtime and dependency lockfile; use a supported runtime for Puppeteer. Avoid a general dependency upgrade. If a runner needs adjustment for the sprint tests, keep it narrow and document it.
4. Run `npm.cmd run verify:personal`, the expanded browser gate where supported, and `git diff --check`. Repair failures. Update implementation/contract/testing docs for actual behavior, including the distinction between offline, browser, manual and live gates.
5. Write `projectmanagement/reports/SPRINT-001-dev.md` using the template. Update STATUS to READY_FOR_QA and acceptance IDs to developer-verified or pending, never lead-accepted. Include exact branch/HEAD plus dirty-state fingerprint/patch record; command/environment/results; all remaining risks; links to tests; and exact QA instructions. Keep a concise pass checkpoint in that report if interrupted earlier.

## Acceptance contract

| ID | Required observable outcome |
| --- | --- |
| AC01 | Scan A, activate/navigate to B, invoke A's focus/measure/SVG/PNG: no DOM read/capture/export falsely attributed to A; clear stale/re-scan guidance |
| AC02 | Start delayed A analysis, then scan/import B; resolve or reject A last: B remains current, no A fallback/result/crop/status replaces B |
| AC03 | New source/failed replacement clears or explicitly invalidates old result, crop, selection and export eligibility consistently; changing selected visual updates Source and other dependent views |
| AC04 | Cancellation/timeout/supersession never creates a success fallback; all busy controls settle correctly; a late finally cannot enable controls for a newer operation; imported text remains independent of tab changes |
| AC05 | Real serialized `measureVisuals` returns live rects for known IDs; unknown/stale IDs fail safely; annotation never silently reuses stale scan rects |
| AC06 | Partly left/top/right/bottom clipped crops contain only the visible intersection; fully offscreen/zero-area cases do not export; pixel scales/zoom verified |
| AC07 | Tab/navigation/viewport changes between measurement, capture and send are detected where observable, and prevent mismatched screenshots; crop image and bbox remain paired |
| AC08 | Complete planner and host materializer reject mixed/unknown/duplicate/year value selections; successful outputs preserve every selected value ID once with unchanged host values |
| AC09 | Any missing-time row or fewer than two distinct times yields table + warning for a requested time-series, without dropped rows; valid explicit paired years still yield time-series |
| AC10 | Exactly one attempt reported after dispatch on success and each failure class; preflight/local validation before dispatch reports zero; proxy totals match actual fake fetch dispatches |
| AC11 | Same-origin simultaneous calls get LOCAL_BUSY without a second upstream call; disconnect/cancel propagates and releases exclusivity; later request succeeds; errors do not leak test secret markers |
| AC12 | Absent top-level interaction ID accepted; malformed present ID rejected; custom call ID and schema/evidence/step checks stay enforced; health and docs agree |
| AC13 | Existing offline gate and new suites pass; browser tests exercise actual actions/artifacts; required unrun tests are explicitly pending; no fake green statuses or permission weakening |
| AC14 | Development report, independent QA report, branch/test registers and lead review identify exact tested state; no unrelated changes; lead decides acceptance |

## Exit and review

The developer stops once P1–P4 are implemented and ready for QA, not at each pass. Light QA then executes the test plan, reports defects or marks READY_FOR_LEAD. Lead reviews source identity through all callbacks, serialization, geometry, selection preservation, time fallback, counter ownership and test quality. All required criteria must pass for acceptance; environment-blocked browser checks can permit a review of partial evidence but not a passing criterion. No publication/release acceptance is implied by sprint acceptance.

Out of scope: metric ontology, new AI models/providers, new permissions, cloud backend, history database, native PDF engine, rich visual editor, extensive UI redesign, Store work and sweeping scanner refactoring.
