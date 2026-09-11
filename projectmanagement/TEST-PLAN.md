# Verification strategy

Lead defines behavioral oracles. Medium implements focused regression protection while developing. Light QA independently executes the final suite, checks that assertions match the intended behavior, reproduces gaps and maintains records. Automated tests are evidence, not a substitute for lead logic review.

## Layers and commands

| Layer | Current command | What it establishes | Limits |
| --- | --- | --- | --- |
| Offline regression | `npm.cmd run verify:personal` | Syntax; core/article/numeric/contract tests; fixture/proxy smoke | Current command excludes browser and live provider; see initial audit gaps |
| Focused core | `npm.cmd test` / `npm.cmd run test:bbc` | Numeric/materialization corpus | Expected values can themselves be wrong; inspect oracles |
| Focused provider contract | `npm.cmd run test:gemini:contract` | Serialized requests and fake responses | No proof of live API availability or all failure paths |
| Focused proxy | `npm.cmd run test:proxy` | Local HTTP smoke with fake handlers | Initial suite lacks actual busy/disconnect tests; S001 adds them |
| Fixture server | `npm.cmd run test:fixtures` | Local fixture HTTP availability/content | Not actual page extraction assertions |
| Browser integration | `npm.cmd run test:e2e:ci` | Real unpacked extension injection/panel behavior | Needs supported Node and explicit `CHROME_BIN`; initial fixture origin already has loopback host permission |
| Extension launch smoke | `npm.cmd run test:e2e` | Installed browser loads extension/panel | Current script does not click Scan or verify exports |
| Alternative harness | `npm.cmd run smoke` / `npm.cmd run check:browser` | Existing Bash browser smoke | Requires Bash/appropriate environment; not a replacement for missing S001 cases |
| Patch hygiene | `git diff --check` | Whitespace/conflict hygiene | Does not prove logic or absence of secrets |

On non-Windows systems use `npm` instead of `npm.cmd`. Check installed versions; the initial offline run used Node 21.7.1. The locked Puppeteer requires Node 22.12+ per the local package/runtime audit; use a supported runtime rather than assuming the offline gate proves browser compatibility. Locate existing runtimes before installing anything or changing the user's default Node. Explicitly record browser path/version, headless/headed mode and OS.

New test commands/modules named in development must be wired into package scripts before claiming the gate covers them. The developer documents final command names in its handoff. Test processes use loopback, ephemeral ports and synthetic data. Clean up only their own servers/browser profiles; never use or modify the personal browser profile. Avoid a standing companion at port 3987 for tests when an injected client/transport can be used; integration fixtures must not accidentally reach a real provider.

## Sprint 001 matrix

| Case group | Method and independent oracle | Covers |
| --- | --- | --- |
| Source A/B ownership | Deferred responses controlled by test, two distinct titles/fact values; assert result/source/export content is B regardless of A's completion order | AC01–AC04 |
| Navigation identity | Same-tab cross-origin navigation, same-URL reload, close, tab switch and supported SPA route invalidation; same sanitized URL must not count as same document | AC01, AC07 |
| Imported source | Import after scan and during delayed plan, import twice, switch browser tabs while imported plan runs; only latest imported snapshot commits | AC02–AC04 |
| Cancel lifecycle | Abort before request, during image conversion, during fetch and response body, after newer operation starts; inspect buttons/status/fallback and fetch signal | AC04, AC10–AC11 |
| Injected helpers | Execute actual exported function through Chrome scripting on fixture. Also isolate serialized function with no sibling module bindings; assert nonempty results, not merely absence of throws | AC05 |
| Geometry | Known rectangles at negative x/y and each edge; example x=-20,width=100 gives width=80 at scale 1. Use fractional scale and independently computed clamped edges; fully outside/degenerate gives no export | AC06 |
| Artifact inspection | Download/decode generated PNG, assert pixel dimensions and known fixture color regions. Verify SVG helper targets current source; full SVG sanitization is future scope | AC05–AC07 |
| Capture race | Delay measurement/capture and change tab, scroll/viewport or document between steps; assert no mismatched image dispatch and no stale-rectangle annotation | AC07 |
| Fact preservation | Four selected facts: two USD and two percentages. Full fake provider response must not yield a successful two-row subset. Repeat with 2+1 where prompt-visible IDs allow selection; unknown/duplicate/year cases | AC08 |
| Time completeness | Two dated revenues plus undated profit -> table/warning/all three rows. No time, one distinct time, mixed missing times; valid respective list still maps exact years | AC09 |
| Attempt accounting | Compare actual fake fetch count to response/error metadata and proxy aggregate through success, HTTP errors, body-read/JSON/schema/tool/host failures | AC10 |
| Exclusivity | Hold first same-origin fake upstream promise; second gets LOCAL_BUSY, no extra dispatch; disconnect first, observe signal, settle then verify next succeeds | AC11 |
| Stateless contract | Missing ID accepted, malformed nonempty-type/blank ID rejected; missing call ID, unknown fact, extra step rejected. Assert health fields/doc claims | AC12 |
| Regression/product boundary | Existing suites, renderer tabs, CSV/JSON fallback exports and no-key/offline usability; manifest/secret/eval invariants include new modules | AC13 |

Pure transition tests must be paired with at least one browser UI path proving the controller is actually used. A mocked Chrome API alone cannot prove permission behavior. Loopback fixtures exercise real injection but already match the extension's host permission; record a separate manual/automation check for real activeTab grant and revocation without adding `<all_urls>` or test-only permissions to the production manifest.

Failure criteria: wrong source, silently dropped facts, ungrounded numeric changes, stale crop reuse, extra upstream attempts, missing counted attempts, stuck busy state, page errors or exported artifact mismatch. A screenshot of a visible tab is not verification of exported bytes. A “no throw” test is insufficient when an empty/fallback result can hide the defect.

## QA execution protocol

1. Read dev handoff and inspect exact diff/baseline. Record HEAD plus working-tree delta; HEAD alone is insufficient with uncommitted code. Confirm no concurrent editor/agent is changing the tested files.
2. Verify the promised test cases exist and assertions test the acceptance contract. Add bounded independent fixtures/tests if needed; report any code changes to medium. Do not weaken assertions or fix production logic as QA.
3. Run the offline gate and the required browser cases using explicit environment. Save compact sanitized logs outside the production bundle, link them from the report, and record exit codes/durations. Reproduce failures before classifying them as product, test harness, environment, or external service failures.
4. Inspect targeted untested branches and the initial audit findings; report uncertainty rather than asserting that all code was audited. Record every AC as PASS / FAIL / BLOCKED / NOT_RUN with evidence.
5. Update reports, backlog status and registers. Return concrete bugs to medium. When required checks are complete, hand to lead. If a required check remains blocked, hand to lead with a qualified report, not a QA pass.

After a repair: rerun failed tests plus dependent integrations. Record the new code fingerprint. Prior results remain historical; changed code cannot inherit an unqualified earlier pass. Do not rerun unaffected expensive external checks without a reason.

## External/release checks

Do not invoke live Gemini commands unless the owner explicitly authorizes that run. Current combined live contract script nominally dispatches one function-call and one structured-output test; verify scripts before execution and record actual attempts. Do not introduce retries to obtain a green report. No credentials in reports, fixtures or command output.

Release verification additionally requires a fresh extracted artifact, startup/doctor checks, real activeTab revoke/regrant, representative public articles/PDFs, viewport localization and exports. These are not established by an offline or fake-provider pass. Record browser/live/ZIP checks separately and retain the frozen Store branch distinction.
