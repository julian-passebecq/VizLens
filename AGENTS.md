# VizLens working agreement

Read `projectmanagement/README.md` and `projectmanagement/STATUS.md` before starting project work. They identify the active sprint and role instructions. Follow the user's current instructions if they change the plan.

- Tech lead owns architecture, sprint scope, logic review, and sprint acceptance.
- Medium/developer owns implementation and focused regression tests. Execute all authorized passes in the active sprint continuously; a pass is a checkpoint, not a request for another user message.
- Light/QA owns independent testing, reproducible defect reports, and test/branch/backlog bookkeeping. QA cannot accept a sprint or redesign production code.
- Preserve existing dirty work. Record the baseline before editing; never reset, clean, stash, or overwrite unrelated changes to obtain a clean test run.
- Keep page extraction local, model numbers host-resolved, and provider calls explicit. No live provider tests, publication, push, merge, or branch deletion unless authorized by the user.
- Read the active sprint's acceptance criteria before coding. Keep checkpoints and handoffs in `projectmanagement/`; report failures and unrun checks accurately.
- Do not stop at ordinary pass boundaries. Stop at the role handoff, a real blocker, or an architecture escalation described in `projectmanagement/WORKFLOW.md`.

Existing implementation references: `ARCHITECTURE.md`, `GEMINI_CONTRACT.md`, `TESTING_GUIDE.md`. The management architecture distinguishes current implementation from target decisions; record contradictions instead of silently assuming either document describes tested behavior.
