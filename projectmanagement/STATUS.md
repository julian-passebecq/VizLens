# Current project state

Updated: 2026-09-08 by tech lead.

- **State:** READY_FOR_DEV
- **Active sprint:** [SPRINT-001 — trustworthy research operations](sprints/SPRINT-001.md)
- **Next role:** Medium developer
- **Next action:** Record baseline and execute P1 through P4 continuously, then write the QA handoff.
- **Implementation baseline:** local `main`, HEAD `42d4409`; existing uncommitted changes recorded in [REGISTERS.md](REGISTERS.md).
- **Sprint branch:** suggested `codex/sprint-001-trustworthy-operations`; not created yet. Preserve the current dirty work when creating it. Do not start a clean worktree that silently omits those changes.
- **Completed:** initial architecture/code review, targeted offline reproductions, first sprint definition, role/handoff process.
- **Development passes:** P1 pending; P2 pending; P3 pending; P4 pending.
- **QA report:** not yet produced for Sprint 001. Baseline verification belongs in the registers and is not sprint acceptance.
- **Lead acceptance:** not granted; implementation is pending.
- **Open blockers:** none for offline implementation. Browser setup and pre-existing change provenance must be recorded during P1/P4; live provider verification remains a separate unrun gate unless explicitly authorized.
- **Next lead visit:** after QA produces its report, or earlier for an architecture/privacy/grounding blocker.

Each role updates this file at a durable checkpoint or handoff: state, branch/HEAD and dirty scope, completed/pending acceptance IDs, report paths, blocker if any, next role, exact resume action. Do not leave contradictory “ready” and “blocked” labels in different reports.
