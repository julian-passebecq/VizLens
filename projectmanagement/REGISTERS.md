# Branch and test registers

Maintainer: light QA. Initial entries observed 2026-09-08. Keep entries concise and append runs with exact tested revision/delta; retain failures rather than overwriting them with a final pass. No fabricated current remote/CI status.

## Branch inventory

| Ref | Observed tip | Relationship / purpose | Test/merge status |
| --- | --- | --- | --- |
| Local `main` | `42d4409` | Active personal line; tracks `origin/main` | HEAD equals locally observed remote-tracking tip; working tree dirty |
| `origin/main` | `42d4409` | Local remote-tracking observation | No fetch or current remote CI inspection in initial audit |
| `origin/chrome-web-store-v1` | `3316eff` | Remote-tracking Store line | Not tested here; docs call Store baseline frozen at v0.15; do not assume exact equivalence without history review |
| `codex/sprint-001-trustworthy-operations` | Not created | Proposed local development branch | Pending medium's baseline checkpoint |

Only one local branch was observed. Root worktree path is `D:\PROJ\VizLens`; additional worktrees were not inventoried in this audit. QA should run `git worktree list` before future branch operations. Do not delete/merge branches while doing bookkeeping.

## Existing dirty baseline (before management files)

Tracked modified paths:

- `GEMINI_CONTRACT.md`
- `TESTING_GUIDE.md`
- `server/gemini-core.mjs`
- `tests/gemini-contract.mjs`
- `tests/gemini-live-json.mjs`
- `tests/gemini-live.mjs`
- `tests/personal-browser-e2e-ci.mjs`

Untracked: `PERSONAL_TEST_RESULTS.md`, `package-lock.json`.

The tracked patch was 56 insertions / 9 deletions across seven files. Themes: optional stateless interaction metadata, regressions, Puppeteer installation mechanism and panel scans/tabs. These edits predate the management task; ownership/commit provenance was not established. New `AGENTS.md` and `projectmanagement/` files are this lead task's changes. A later dev must compare content, not rely on this list as a frozen fingerprint.

## Run register

| Run ID / date | State tested | Executor / environment | Command / result | Interpretation |
| --- | --- | --- | --- | --- |
| BASE-001 / 2026-09-08 | `42d4409` + dirty baseline above | Light audit agent; Windows; Node 21.7.1 | `npm.cmd run verify:personal`; PASS, exit 0, 16,854 ms | 38 article + 24 localized + 6 BBC; syntax/core/contract/proxy/fixture/source checks; zero provider quota |
| BASE-002 / 2026-09-08 | Same production baseline | Lead; Node, synthetic inputs | Isolated serialization and fake planner probes; defects reproduced | F02 helper ReferenceError; F04 selected four facts becomes two rows; F06 one fetch loses error attempt count |
| BASE-003 / 2026-09-08 | Same production baseline | Lead; Node, synthetic inputs | Direct materializer probe; defect reproduced | F05 time-series emits time=null row with no warning |
| MGMT-001 / 2026-09-08 | New AGENTS.md and management documents | Lead; Node + Git | Local Markdown link/whitespace validation over 12 files; PASS. `git diff --check`; PASS | Management handoff checked; original tracked code diff remains seven files, 56 insertions / 9 deletions |
| HIST-001 / reported 2026-09-08 | Pre-existing report; exact dirty fingerprint not supplied | Prior run described in `PERSONAL_TEST_RESULTS.md` | Report claims local + browser pass and live structured-output pass; live planning unverified after upstream errors | Historical report only, not independently repeated in this management task |
| S001-DEV | Pending | Medium | NOT_RUN | Populate from dev handoff |
| S001-QA | Pending | Light | NOT_RUN | Populate from independent QA report |
| S001-LEAD | Pending | Lead | NOT_REVIEWED | Only lead can accept |

No coverage percentage exists. `verify:personal` excludes real-browser and live tests. The previous browser report used a bundled Node 24.19.0; this audit did not resolve or reuse that path. Normal Node in this shell is 21.7.1. Use `login:false` for automation here: the PowerShell login profile attempted broken Conda imports; this is an environment issue, not a VizLens failure.

## Required fields for each subsequent run

Date/time, role, sprint/AC IDs, branch and HEAD, dirty delta fingerprint or saved patch reference, Node/browser/OS, exact command, exit code/duration, PASS/FAIL/BLOCKED/NOT_RUN, actual scenario counts if emitted, sanitized log/artifact path, fake/live provider mode and actual attempts, defects and retest requirements. A new fingerprint needs relevant retesting; do not copy an old PASS to changed code.

Keep raw browser artifacts and long logs in a clearly named local artifact directory outside the shipped extension, and reference it. Check for private content before attaching artifacts. Reports and small synthetic fixtures may be committed; don't bloat the repository with generated browser profiles or screenshots.
