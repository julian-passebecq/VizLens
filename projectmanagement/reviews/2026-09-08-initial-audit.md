# Initial tech-lead logic audit — 2026-09-08

Disposition: **READY_FOR_DEV for Sprint 001; not a correctness/release certification.** No production fixes were made in this management task. Existing user work was preserved.

## Reviewed state and method

Local `main` at `42d4409`, including the dirty baseline recorded in REGISTERS. Lead read the sidepanel, client, scanner paths, materializer, planner and proxy paths relevant to source/grounding/capture/accounting; inspected current contract/CI/test changes and product docs. Light model performed a read-only test/branch inventory and ran the offline gate. Lead checked its coverage findings against the actual scripts. This was a focused baseline audit, not exhaustive line-by-line review of every scanner/parser/third-party path.

The offline command `npm.cmd run verify:personal` passed on Node 21.7.1, exit 0, approximately 16.9 seconds. It exercised 38 article cases, 24 localized-number cases, 6 BBC cases, contract/proxy/fixture and source assertions. These counts describe the checked corpus, not a coverage percentage. No live provider request or browser E2E was run in this audit.

## Findings

### F01 — High: live page actions and async results lack source ownership

Evidence: `src/sidepanel.js` state contains scan/result but no tab/document/operation identity; `runInPage` at initial line 58 re-queries activeTab for each call. Scan at 268 replaces state without clearing AI/crop state. `analyzeArticle` at 387 uses mutable state after awaits and builds fallback from current state; imported text and viewport analysis can overlap. The client supports AbortSignal, but UI callers do not supply it.

Consequence: old scan A can be used with a screenshot/DOM action from page B; a late response can overwrite a newer source's result. A stale finally can re-enable controls. Static control-flow finding; no two-tab browser reproduction was executed in this audit. Sprint 001 must turn these sequences into controlled-promise and browser regressions. Backlog VL-001, AC01–AC04.

### F02 — High: batch measurement is not serializable as used

Evidence: `src/page-scanner.js:679` exports `measureVisuals`, which calls sibling module binding `measureVisual`. `src/sidepanel.js:351` passes `measureVisuals` as `chrome.scripting.executeScript`'s `func`. The module binding is not serialized with the function.

Offline reproduction executed:

```js
import vm from 'node:vm';
import { measureVisuals } from './src/page-scanner.js';
vm.runInNewContext(`(${measureVisuals.toString()})(['vizlens-1'])`);
// ReferenceError: measureVisual is not defined
```

The annotation path catches the failure and uses old scan rectangles, hiding the error. Independent real-browser helper verification is still required. Backlog VL-002, AC05.

### F03 — High: crop width/height do not intersect negative edges correctly

Evidence: `src/sidepanel.js:303` in `exportPng` clamps x/y to zero, then uses the original rect width/height. With rect x=-20 and width=100 at scale 1, the visible intersection is 80 pixels but code asks for 100. The same issue applies at the top edge.

Confirmed by inspection of the arithmetic; no exported image was produced during this audit. Sprint test must decode a real synthetic crop, including fractional scale and edge cases. Source race in F01 compounds this. Backlog VL-003, AC06–AC07.

### F04 — High: incompatible selected facts are silently dropped

Evidence: `src/ai-contract.js:159` groups by kind/unit, then `compatibleSelectedFacts` returns the largest group if it contains two values. The materializer sees that subset and skips selected values outside it. Prompt tools can make multiple compatible groups visible simultaneously.

Offline full-planner reproduction used this text:

> Revenue was USD 10 million in 2024. Revenue was USD 12 million in 2025. Margin was 20% in 2024. Margin was 25% in 2025.

Fake successful provider call: `create_visual_recipe`, family `table`, fact IDs `N1,N3,N5,N7`, evidence `T1`, reason `Comparison`. Actual result: `vizlens-visual-json` with only USD rows N1/N3. All four selected IDs were valid and prompt-visible. No provider/network call occurred; fetch was injected.

Expected: reject mixed selected sets; do not reinterpret the selection as a successful subset. Root FEATURES claims incompatible selections are rejected; the current test only verifies helper grouping, not complete selection behavior. Backlog VL-004, AC08.

### F05 — High: a time-series can include rows with no time

Evidence: `src/ai-contract.js:344` materializes rows with null time. It checks the count of distinct non-null times, not time completeness of every row.

Offline reproduction: create text scan of `Revenue was USD 10 million in 2024 and USD 12 million in 2025. Profit was USD 3 million.` Extract facts; materialize a time-series with every non-year value fact, empty timeFactId/label/series. Actual output: time-series, rows at 2024, 2025 and null, warnings `[]`.

Expected Sprint 001 policy: table plus warning and all three facts preserved. This does not solve the broader same-unit/different-metric ambiguity, which remains VL-009. Backlog VL-005, AC09.

### F06 — Medium: rejected provider responses disappear from attempt totals

Evidence: `server/gemini-core.mjs:469` and `:544` invoke `postGemini` then validate; many subsequent exceptions are plain errors without `apiRequests`. The proxy sums `error.apiRequests || 0`. Body-reading failures after fetch are another path to inspect.

Offline reproduction: planning fetch stub increments a counter and returns HTTP 200 `{id:'int_bad',status:'requires_action',steps:[]}`. Actual: one fake fetch call, error `Gemini must call exactly one VizLens planning tool; received 0.`, `error.apiRequests` undefined. Proxy would add zero for that error.

Expected: one dispatched attempt even if validation rejects it; zero for pre-dispatch local failures. Backlog VL-006, AC10–AC11.

### F07 — Medium: documentation/health overstate current validation and coverage

Dirty baseline intentionally allows missing diagnostic interaction ID. `server/gemini-proxy.mjs` health still says `requiresInteractionId:true`; root FEATURES/ARCHITECTURE also describe it as required. `PERSONAL_TEST_RESULTS.md` explains the previous live observation; that is historical evidence, not a live test repeated here.

Coverage claims include cancellation and handoffs, but current proxy smoke has no held/concurrent/disconnected request; core tests directly import only CSV from model.js. Browser CI tests scan/tab rendering at a loopback origin, not AI/crop/export or real activeTab revocation. Some invariant tests inspect source strings rather than execute behavior. Backlog VL-007/008, AC12–AC14.

## Strengths to preserve

The personal/local-first architecture is appropriate to the stated product. The provider packet omits the dedicated current-page URL field, constrains tool/ID selection and resolves numerical values locally. The proxy binds loopback on normal startup, supports origin policy, JSON size limits, exclusivity and cancellation signals. There is an existing deterministic regression corpus, fixture server and browser CI entry point. These are useful foundations; stronger behavior tests and lifecycle ownership are preferable to a framework rewrite.

## Additional risks for later lead review

- Same kind/unit does not prove common metric. Nearest-year association and source-order pairing have ambiguous prose cases; no general semantic guarantee established.
- Numeric regression explicitly expects `parseLocalizedNumber('3,1415')` to return `31415`. That expectation needs an independent locale/ambiguity review, not blind preservation as a “passing” oracle.
- `extractSvg` clones DOM markup with styles; script/event/external-resource handling is not a demonstrated sanitization boundary. Review before presenting SVG exports as safe standalone shared artifacts.
- Runtime sanitization truncates nested arrays at 120; scanner/row limits vary and are not a complete bounded-work/completeness contract. Whole-node collection can still cost work before limiting rows.
- MAIN-world page data is not authenticated. Extension-origin validation is not authentication of arbitrary local clients. URL field removal does not remove URLs/private content embedded in text.
- No release ZIP, current remote CI, Store baseline, public page matrix, screenshots, live API reliability or downstream consumer compatibility was verified here.

These are backlog/review leads, not all reproduced defects. Do not treat the codebase as fully certified because Sprint 001 later passes. Future lead audits select and verify remaining risks.
