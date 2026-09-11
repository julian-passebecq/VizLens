# Ordered backlog

Updated 2026-09-08. `READY` means scoped in the active sprint; `PROPOSED` means not authorized for implementation. QA maintains status and evidence; only lead changes priority/sprint scope or marks work accepted. Severity describes consequence, not elapsed effort.

| ID | Priority / state | Outcome and why | Scope / owner | Done when |
| --- | --- | --- | --- | --- |
| VL-001 | High / READY | Bind scans and results to their real source; prevent wrong-page evidence | S001 P1 / medium | AC01–AC04 pass; lead reviews all async commit paths |
| VL-002 | High / READY | Serialized measurement works in Chrome; no stale annotation fallback | S001 P2 / medium | AC05; helper serialization and browser injection verified |
| VL-003 | High / READY | Correct viewport clipping and capture identity | S001 P2 / medium | AC06–AC07; downloaded crop dimensions/content checked |
| VL-004 | High / READY | Reject mixed selected fact sets without silently removing facts | S001 P3 / medium | AC08; complete mocked planner boundary and direct materializer checks |
| VL-005 | High / READY | No incomplete time-series passed downstream | S001 P3 / medium | AC09; missing time becomes table plus warning, preserving rows |
| VL-006 | Medium / READY | Every dispatched provider request counted on success/rejection/cancel | S001 P3 / medium | AC10–AC11; upstream and proxy counts match |
| VL-007 | Medium / READY | Align stateless-ID code, health metadata and documentation | S001 P3 / medium | AC12; absent diagnostic ID accepted, malformed IDs/steps rejected |
| VL-008 | High / READY | Test real user action failure/race/export paths and record truthful coverage | S001 P4 / medium; QA independently executes | AC13–AC14; new tests wired into commands/CI and evidence recorded |
| VL-009 | High / PROPOSED | Conservative time and metric semantics; same unit is not same metric | Candidate S002 / lead designs, medium implements | Corpus covers reversed clauses, duplicate years, mismatched counts, mixed metrics, explicit/ambiguous association; no unjustified time binding |
| VL-010 | High / PROPOSED | Audit localized numeric parsing against independent oracles | Candidate S002 / light corpus, lead semantics | Resolve existing `3,1415 -> 31415` expectation and grouping ambiguity; document locale policy before changing it |
| VL-011 | Medium / PROPOSED | Bounded extraction with explicit truncation metadata | Candidate S002 / medium | Large SVG/runtime/table fixtures show bounds and accurate partial-data labels; limits do not silently imply completeness |
| VL-012 | Medium / PROPOSED | Runtime/table fidelity | Candidate S002 / medium | Plotly missing x, ECharts dataset/category axes, Chart.js object rows, duplicate table headers and Highcharts categories have independent expected rows |
| VL-013 | High / PROPOSED | Safe SVG artifact policy | Candidate S002 or earlier if actively sharing SVG / lead | Define handling of script/event/external-resource/foreignObject content; preserve ordinary drawing fidelity; exported artifact tests |
| VL-014 | Medium / PROPOSED | Evidence drill-down and understandable uncertainty | Candidate S003 / medium | User can trace output row to source fact/context, see stale/partial/research-only distinctions |
| VL-015 | Medium / PROPOSED | Versioned, consumer-verified exports | Candidate S003 / medium | CSV/JSON/VizForge/Power BI fixture consumers verify required roles, values, provenance, warnings and compatibility |
| VL-016 | Medium / PROPOSED | Proxy input/work limits and exact-origin policy audit | Future hardening / lead | Nested malformed scans, oversized fields, malicious origins and cancellation resource release tested; documented caller threat model |
| VL-017 | Medium / PROPOSED | Reproducible personal release and CI/runtime alignment | Candidate S004 / medium, QA | Lockfile provenance resolved; supported Node/browser matrix; clean extracted ZIP gate and manifest; setup/doctor exercises |
| VL-018 | Medium / PROPOSED | Manual live capability matrix | Release gate / QA, owner authorizes provider calls | ActiveTab revoke/regrant, real articles, PDFs, viewport crops and API modes individually reported with dates/environment |
| VL-019 | Low / PROPOSED | Local saved research history | Owner demand required | Lead approves data retention/storage and provenance; separate sprint |
| VL-020 | Low / PROPOSED | Native PDF/OCR ingestion | Owner demand required | Distinct OCR uncertainty model and explicit input/network behavior before implementation |
| VL-021 | Deferred | Public Store/cloud/multi-user direction | Owner decision; frozen Store line | Separate scope, authenticated backend and publication review, without burdening personal mode |

No item is accepted yet. Existing implementation may partially serve a feature; that does not close its audit gap. New discoveries get the next unused VL ID, a repro/report link and proposed priority. Avoid duplicate issues for different symptoms of the same defect.
