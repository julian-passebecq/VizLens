# Handoff and review templates

Copy the relevant template to `projectmanagement/reports/SPRINT-NNN-dev.md`, `...-qa.md`, or `projectmanagement/reviews/SPRINT-NNN-lead.md`. Use one evolving developer report during the sprint; append repair/QA runs so earlier failures remain visible. The directory can be created when the report is written. Replace placeholders; do not report template text as completed work.

## Development report

```markdown
# Sprint NNN — development handoff
State: DEVELOPING / READY_FOR_QA / BLOCKED_ON_LEAD
Date, role, branch, HEAD:
Baseline dirty work and how it was preserved:
Current delta fingerprint / baseline patch reference:

## Delivered behavior
What now happens for the user; why it meets the sprint objective.

## Pass checkpoint
| Pass | State | Files / behavior delivered | Focused checks | Exact next step |
| --- | --- | --- | --- | --- |

## Acceptance mapping
| AC | Developer status | Implementation path | Test / command evidence | Remaining verification |
| --- | --- | --- | --- | --- |

## Design and compatibility
Decisions within lead guidance, changed contracts, callers affected,
source/async ownership, errors/fallbacks, preserved baseline changes.
No silent new scope; list deferred discoveries by backlog ID.

## Validation
Commands, runtime, exit codes, duration, exact tested state,
sanitized logs/artifacts, provider attempt count; list NOT_RUN explicitly.

## Risks / known issues
Reproducible details and whether they predate this sprint.

## QA handoff
Required setup, exact next commands/scenarios, expected outputs,
where independent tests should challenge the implementation.

## Work cadence
Completed passes, interruptions/resumes, owner prompts needed,
whether pass size was too short/long and why (no invented elapsed hours).
Next role and ready/blocked message.
```

## QA report

```markdown
# Sprint NNN — independent QA
State: CHANGES_REQUESTED / READY_FOR_LEAD / BLOCKED_ON_LEAD
Date, role, tested branch/HEAD/delta fingerprint:
Environment and baseline verification:

## Verdict
QA evidence complete / failures / qualified due to unrun checks.
This is not lead acceptance or release certification.

## Acceptance matrix
| AC | PASS / FAIL / BLOCKED / NOT_RUN | Test / artifact / command | Expected vs actual |
| --- | --- | --- | --- |

## Defects
For each: stable defect/backlog ID, severity, minimal input and steps,
expected/actual, code path, reproducibility, log/artifact, repair/retest scope.
Classify production defect / harness / environment / external service.

## Independent challenge
Assertions/negative paths reviewed, additional synthetic tests,
areas inspected vs not inspected, unsupported claims in dev summary.

## Register updates
Branches/worktrees observed; runs appended; backlog status links.
No branch merge/delete/push undertaken merely for bookkeeping.

## Next action
Medium repair instructions, or exact question for lead, or lead review request.
List remaining tests and why. Include compact summary for lead:
changed behavior, highest risks, failed attempts, critical paths to audit.
```

## Lead review

```markdown
# Sprint NNN — lead decision
State: ACCEPTED / CHANGES_REQUESTED / BLOCKED_ON_LEAD
Reviewed branch/HEAD/delta; linked dev and QA reports:

## Decision and evidence
What is accepted/rejected; required AC dispositions.
Distinguish sprint acceptance from live/release/Store acceptance.

## Logic audit
Production paths reviewed, relevant unchanged callers/dependencies,
identity/async, numeric semantics, contract/capture/error boundaries,
test oracle assessment, residual risks and unreviewed areas.

## Required fixes / accepted limitations
Stable IDs, concrete symptoms, severity, repair criteria and owner.

## Architecture and backlog
Decision updates and reasons; completed IDs; newly discovered work.

## Next sprint
Authorize concrete sprint only after current disposition permits it.
User outcome, dependencies, cohesive passes, acceptance/test plan,
role handoffs and adjustments from observed work cadence.
Update STATUS and navigation links if active sprint changes.
```

## Escalation note

```markdown
State / prior state:
Sprint, AC, branch/HEAD/delta:
Decision needed (one concrete question):
Minimal repro, expected vs actual:
Relevant code path:
Attempts and evidence:
Options, tradeoffs, recommended choice:
Why existing architecture does not settle it:
Independent work that can continue:
Next role: TECH LEAD
```
