# VizLens project management

This folder is the working contract between the owner, tech lead, medium developer, and light QA model. Created 2026-09-08 after inspecting the code and existing documentation. Planning and audit are complete for the initial handoff; the sprint implementation has not started.

## Start here

1. Read [STATUS.md](STATUS.md) for the next action and active sprint.
2. Read your role in [WORKFLOW.md](WORKFLOW.md).
3. Read [SPRINT-001.md](sprints/SPRINT-001.md), including acceptance criteria, before implementation or QA.
4. Use [TEST-PLAN.md](TEST-PLAN.md) for independent verification and [REGISTERS.md](REGISTERS.md) for branch/test records.

## Planning map

| File | Purpose | Maintainer |
| --- | --- | --- |
| [VISION.md](VISION.md) | Product destination, major features, sequencing, why they matter | Lead |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Current modules, target boundaries, decisions and invariants | Lead |
| [BACKLOG.md](BACKLOG.md) | Ordered work with stable IDs and completion evidence | QA updates status; lead prioritizes |
| [WORKFLOW.md](WORKFLOW.md) | Roles, continuous passes, escalation and handoffs | Lead |
| [STATUS.md](STATUS.md) | One current state; next role and exact next action | Current role |
| [TEST-PLAN.md](TEST-PLAN.md) | Gates, behavioral oracles, required and external checks | Lead defines; QA records execution |
| [REGISTERS.md](REGISTERS.md) | Observed branches and runs, including unverified claims | QA |
| [Initial audit](reviews/2026-09-08-initial-audit.md) | Confirmed defects, risks, review limitations | Lead |
| [Report templates](templates/REPORTS.md) | Development, QA, escalation and lead-review formats | All roles |

`STATUS.md` is the authority for current ownership. The sprint document is the authority for committed scope. Backlog proposals and future sprint themes do not authorize implementation. Existing root product docs remain implementation references and user guides; update them when behavior changes instead of copying them into new documents.

## Prompts the owner can use

**Medium developer — start:**

> Act as the medium developer. Read AGENTS.md and projectmanagement/README.md, then implement all passes of the active sprint identified in projectmanagement/STATUS.md. Continue through the authorized passes without asking me for “next pass.” Follow the lead's architecture and acceptance criteria. Preserve existing changes, run focused development checks, and leave the development handoff for light QA. Tell me clearly when to call light QA or the tech lead.

**Light model — test:**

> Act as light QA. Read AGENTS.md, projectmanagement/STATUS.md and projectmanagement/TEST-PLAN.md. Independently verify the developer's sprint handoff. Reproduce defects and maintain the backlog, branch register and test records. Do not redesign production code or declare the sprint accepted. Tell me whether to return the report to medium for fixes or call the tech lead for review.

**Tech lead — review:**

> Review the active sprint using projectmanagement/STATUS.md and its development/QA reports. Inspect the actual diff and relevant callers, trace the code logic and trust boundaries, and validate the reported evidence. Accept or request changes, update architecture/backlog, and authorize the next sprint when appropriate.

**Resume after a limit or interruption:**

> Resume your role from projectmanagement/STATUS.md and the latest checkpoint. Reconcile the current diff and resume the unfinished pass; do not restart completed work.

The normal owner interaction is one developer start, one QA start, and one lead review. A failed QA cycle adds a developer repair and targeted QA rerun. The documents support long continuous work; they do not guarantee a model can keep running after its task ends or after a platform limit. Do not schedule background work or create separate tasks implicitly.
