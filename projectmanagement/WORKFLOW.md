# Roles and continuous delivery

## Ownership

| Role | Owns | Limits |
| --- | --- | --- |
| Owner | Product priorities, optional external/API spending, publication decisions, role starts | Should not have to design implementation or say “next pass” every few minutes |
| Tech lead | Target architecture, invariants, sprint selection, difficult technical decisions, final logic audit | Uses QA for inventory/evidence; does not treat a green report as proof of correct logic |
| Medium developer | Production code, focused tests for changed behavior, integration, repair of QA defects, concise handoff | No framework/provider/permission/product-scope changes outside the sprint; cannot self-accept |
| Light QA | Independent test execution, bounded supporting tests/fixtures, reproducible bugs, branch/test/backlog records | No speculative production rewrites, weakened assertions, changed expected values just to pass, sprint acceptance or branch cleanup |

An explicitly requested role controls the work. If no role is specified, read STATUS and take the next role within your capabilities, stating the role. Do not silently substitute the light model for architecture decisions. Delegation is optional and must be explicitly authorized by the user or governing instructions; these documents do not start other tasks themselves.

## State transitions

`READY_FOR_DEV -> DEVELOPING -> READY_FOR_QA -> TESTING -> READY_FOR_LEAD -> ACCEPTED`

QA failures go to `CHANGES_REQUESTED -> DEVELOPING -> READY_FOR_QA`. A decision blocker is `BLOCKED_ON_LEAD` with its previous state and a reproducible question. Lead rejection returns to `CHANGES_REQUESTED`; only lead acceptance closes the sprint and sets the next sprint to `READY_FOR_DEV`.

## Design of a long development cycle

- A sprint has 3–4 cohesive passes with explicit completion conditions. Each pass may require substantial uninterrupted work. Do not force a timer, token target, arbitrary commit count, or tiny task size.
- Start with enough scope for all passes. After a pass, update a short checkpoint, run the focused checks needed to detect its failures, and continue automatically into the next pass.
- At the end of the sprint's development scope, run integration checks once, repair failures, then hand off to QA. Independent full QA is normally once after all passes, not after every small edit.
- QA findings trigger a cohesive repair pass covering the report. Developer rechecks changed paths; QA reruns failed scenarios plus affected integration gates. Avoid unrelated repeated full suites once evidence is current.
- During long work, give concise progress updates. Update the durable checkpoint before a task/context limit, a risky transition, and each pass completion. An interruption is not a completed pass.
- If work is smaller than expected, finish and hand off. If larger, keep working within scope; escalate only if completion requires a new architecture/product decision. Never add features merely to fill time.
- Record owner interruptions and pass friction in the final report. The next lead adjusts pass sizing based on those observations.

## Baseline and branch discipline

Before editing: inspect `git status --short`, `git branch -a -vv`, HEAD and existing diff. Record which changes predate the sprint. Existing uncommitted work is part of the reviewed input, but must remain distinguishable from sprint work. Save an exact baseline patch/hash manifest locally if code overlaps; never include credentials. If the repo is dirty, a single sprint branch in the current checkout is the default. A clean separate worktree is appropriate only after relevant baseline work is preserved and included deliberately.

Use `codex/` for new branch names. Local checkpoint commits may be made if consistent with the owner's instructions; stage explicit relevant paths and inspect the staged diff, never blindly stage all dirty files. Push/merge/delete/archive are separate owner actions unless already authorized. Do not invent branch or CI status from documentation. Remote-tracking refs may be stale; record “observed locally” unless refreshed.

## Escalation policy

Developer handles ordinary implementation errors, flaky setup diagnosis, and fixes that satisfy already-defined criteria without asking the owner to choose.

Call the lead when a fix would change a public output contract, model-owned versus host-owned data, permissions/network exposure, privacy defaults, or product scope; when evidence contradicts the sprint's architecture; or when two materially different attempted approaches fail at the same technical boundary. For routine environment failures, perform a bounded diagnosis (roughly 30–45 minutes is a guide, not a compulsory wait), record exact errors and continue independent work. Never exhaust hours retrying unchanged conditions.

QA returns clear implementation defects to medium. QA calls the lead for ambiguous correctness/semantic rules, potential fabricated/misattributed evidence, security-boundary changes, recurring failed repairs, and at the completed sprint milestone. QA may finish independent tests while one lane is blocked, but must not mark the blocked criterion passed.

Each escalation includes: failing acceptance ID, minimal input, expected/actual, code path, attempts and results, proposed options/tradeoffs, recommended decision, and work that can continue. Ask one concrete technical question. No secrets or private page dumps.

## Handoff messages

At development completion, say: **“Ready for light QA. Read [report path]. All authorized development passes are complete; remaining verification is listed there.”**

At a clear QA failure, say: **“Return to medium for the repair pass in [report path]. Retest criteria are listed.”**

At QA completion or an architecture escalation, say: **“Call the tech lead. Read [report path]. Status: READY_FOR_LEAD / BLOCKED_ON_LEAD. Reason: …”**

Lead reviews the actual final diff and relevant unchanged callers, not only the summary. Review async ownership, data identity, numeric/semantic grounding, trust boundaries, error/cancel paths, compatibility, test oracles and scope. Every sprint-touched production path needs disposition; critical untouched dependencies need inspection. Record limitations explicitly. Only then accept or request changes and select the next sprint.
