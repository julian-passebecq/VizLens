# VizLens takeover — 2026-09-11

## Read this first

The owner is stopping the costly Codex/multiple-agent workflow and handing development to one Pro AI. This branch preserves all discovered local project work. No new feature implementation was attempted during handover. Decide implementation yourself; the outcomes below are the remaining work, not a prescribed coding plan. Historical role rotation and proposed sprint mechanics are reference only under this new owner direction. Do not spend tokens rereading every report or replaying old test runs.

Start with this file. Consult [the initial audit](../projectmanagement/reviews/2026-09-08-initial-audit.md) only for defect evidence, and [Sprint 001 acceptance criteria](../projectmanagement/sprints/SPRINT-001.md#acceptance-contract) for precise required behaviors. Read relevant source when working on a specific outcome. [The backlog](../projectmanagement/BACKLOG.md) and [vision](../projectmanagement/VISION.md) provide deeper future scope when needed.

## Initial task and current product

The original personal-v1 task was to test the existing app, prioritizing the owner's personal version over the Chrome Web Store version. A later task requested architecture, audit, backlog and a lead/developer/QA workflow. That planning was completed, but its first implementation sprint never started.

VizLens is an unpacked Chrome extension plus an optional localhost Node/Gemini companion. It locally inspects articles, tables, SVG and chart runtime data; supports pasted article/PDF text; optionally requests a grounded visual plan or viewport classification; and exposes CSV, evidence, SVG/PNG, VizForge and Power BI handoffs. Actual numbers must remain host-resolved from source evidence. Extraction stays local and provider calls explicit. This is a personal research app, not a chart editor or hosted multi-user service.

Existing source covers these capabilities, but the root README's “stable” wording is not evidence of release readiness. Several trust defects remain and the tests do not cover all user flows. Do not equate green existing tests with a complete app.

## What was done and by whom

| Work | Attribution and evidence |
| --- | --- |
| Existing personal extension, companion, launchers, offline suites and browser CI | Already committed through `42d4409`; Git attributes recent commits to Julian Passebecq. Git authorship alone does not identify which AI wrote each line. |
| Personal testing and fixes, September 8 | Task `Test personal v1`, ID `01a08194-d7f7-72b2-8dd1-21f14515f67c`. Accepted missing diagnostic interaction IDs in stateless responses while retaining evidence/function validation; added regressions; repaired Puppeteer extension loading and added real Scan/tab fixture tests; added lockfile and testing notes. See [historical test results](../PERSONAL_TEST_RESULTS.md). |
| Architecture, defect audit, sprint/backlog/role documents | Lead task `01a08249-18ef-7732-be87-e909e45afa13`. No sprint production fixes. See `projectmanagement/`. |
| Independent baseline QA | Subagent Zeno, ID `01a08249-d38a-7be3-b38a-8ec6bf827d5e`; read-only inventory and offline verification. It explicitly reported no edits. Findings were incorporated into audit/registers. |
| Preservation and takeover | Current task `Prepare AI handoff branch`, September 11. Audited Git and available local task records, reran offline/browser gates, committed pre-existing work separately, and wrote this folder. No subagents started. |

## What is broken or unfinished

Sprint 001 passes P1–P4 are pending. There is no completed sprint developer report, independent sprint QA report or acceptance. The small stateless-ID fix is already present; the larger consistency work is unfinished.

| Remaining outcome | Evidence / current gap |
| --- | --- |
| Every operation and exported result belongs to the correct source | F01: tab/navigation/import changes and delayed operations can mix sources, overwrite newer state or clear busy state incorrectly. Cancellation is not integrated throughout UI callers. |
| Live measurement works when injected into Chrome | F02 reproduced offline: serialized `measureVisuals` loses its module helper and throws; fallback can hide this with old rectangles. |
| Crops contain the correct visible region and match their original capture | F03 arithmetic defect: negative left/top edges retain too much width/height. Source/geometry changes can mismatch capture and evidence. Real crop artifact verification is missing. |
| A successful plan preserves the entire valid selection | F04 reproduced through fake planner: mixed currency/percent selection silently loses facts. Unknown, duplicate and year-as-value cases need complete boundary coverage. |
| Trends contain grounded time for every row | F05 reproduced: a time-series can include a null-time row without warning. Incomplete trends must preserve rows as a table with an explicit warning. |
| Accurate attempts, cancellation and exclusivity diagnostics | F06 reproduced: dispatched requests rejected during validation can count as zero. Failure/body-read/abort paths and proxy concurrency need behavioral verification. |
| Contracts and claims match actual behavior | F07: health/root docs still claim a required interaction ID despite optional-ID code. Some coverage claims exceed actual tests. Align these and complete lifecycle, export and error-path tests. |

F01/F03 are inspection findings; F02/F04/F05/F06 have offline reproductions in the audit. They were not repaired or re-reproduced in this handover. No blocker prevents offline implementation. Browser fixture execution currently works. Live article planning reliability remains unverified after prior upstream/network failures.

## Remaining outcomes for a dependable final personal app

1. Complete the source/capture/grounding/accounting outcomes above, with observable acceptance evidence (AC01–AC14). Preserve the existing useful extraction and UI behavior.
2. Establish reliable extraction semantics: distinguish measures even when units match; resolve ambiguous year binding and localized numbers; verify runtime/table adapters; label partial/truncated recovery accurately. The existing `3,1415 -> 31415` expectation needs independent review, not blind preservation.
3. Establish safe SVG artifacts and bounded processing of untrusted page/runtime/proxy input. Current SVG cloning is not demonstrated sanitization.
4. Make evidence traceable and limitations visible to the user; verify versioned CSV/JSON/VizForge/Power BI outputs against real consumer expectations, including downloaded artifacts.
5. Verify a reproducible personal release: clean installation/archive, supported Node/browser setup, launchers/doctor, representative performance, actual activeTab navigation permissions, real articles and PDFs, viewport crops, and separately authorized live AI flows. Correct release/capability documentation to match observed results.

Items 2–5 are the documented proposed roadmap, not implemented features or a claim of new owner approval for every enhancement. Saved history, native PDF/OCR ingestion, Store publication, cloud accounts, multi-user hosting and rich visual authoring are deferred scope requiring an owner decision. Do not silently expand the app to include them.

## Verification and limitations

On September 11, the preserved production/test state subsequently committed as `b691f34b99a3003ec42baa15366401854f9f0930` passed:

- `npm.cmd run verify:personal` on Windows, Node `v21.7.1`, exit 0: syntax, 38 article cases, 24 localized-number cases, 6 BBC cases, core/security invariants, proxy/fixture smoke and Gemini contract checks.
- `tests/personal-browser-e2e-ci.mjs` using bundled Node and installed Chrome, exit 0: extension load, actual Scan button and tabs on BBC-like, D3 and Plotly fixtures. Command used `CHROME_BIN=C:/Program Files/Google/Chrome/Application/chrome.exe` and Node at `C:/Users/julia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. That absolute Node path is machine-specific; use Node 22.12+ elsewhere.
- Staged whitespace validation before the preservation commit passed. No new app code followed these runs.

Not run in this handover: live provider calls, public-page/PDF/manual activeTab matrix, exported image/consumer validation, clean archive/install, Store tests or GitHub Actions inspection. Historical September 8 structured JSON live test passed; live article planning did not become verified. Do not copy that historical result as a current live pass. The existing browser gate is separate from `verify:personal`.

PowerShell profile startup emitted broken Anaconda module errors; commands worked with profile loading disabled. This is a local shell issue, not an app failure.

## Git preservation and recovery audit

- Remote: `https://github.com/julian-passebecq/VizLens.git`; fetched successfully September 11.
- Before preservation: only local branch `main`, equal to `origin/main` at `42d4409ed973ed7ca247eec80adbfabb627fdd4f`. No local-only commits. Only registered worktree: `D:/PROJ/VizLens`. Remote Store branch remains `3316eff`; no merge/deletion requested or performed.
- New takeover branch: `codex/pro-ai-handover-2026-09-11`. Main is intentionally not merged; work is delivered on this branch.
- Commit `b691f34` preserves the exact pre-existing edits: seven tracked code/test/doc files, `PERSONAL_TEST_RESULTS.md`, `package-lock.json`, `AGENTS.md`, and all eleven management files. The preceding tracked patch was 56 insertions/9 deletions. `git show --stat b691f34` gives the complete inventory and `git show b691f34` the changes; no duplicate patch archive is needed.
- The following handover commit adds this file and current entry-point updates. Git history records the pushable commit IDs without maintaining a self-referential hash here.
- Available active task listing plus local session metadata in both sessions/archived_sessions were checked. Three earlier VizLens records were found, all using this checkout; their task histories were inspected. Zeno made no files. No separate branch/worktree or additional uncommitted agent artifact was found. This audit covers this machine's available records, not undiscovered clones/devices or private external chats.
- Only ignored workspace content was `node_modules/`; it is reproducible from the lockfile and not pushed. No credentials or raw Codex transcripts are part of this handover. A filename-only scan for common credential/private-key patterns found no matches in publishable workspace files; this is a bounded scan, not a formal secret audit.

No manual code push is expected if the branch is present remotely. Configure your own local provider credential if using AI; credentials and machine-installed dependencies are not repository deliverables. The owner need only point the Pro AI at this branch and this file. Keep future updates concise and tied to completed outcomes and remaining blockers.
