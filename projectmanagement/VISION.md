# Product direction and sequence

## Destination

VizLens should let one researcher inspect a web article or visual, understand exactly what evidence is recoverable, and export a useful, traceable handoff without silently inventing data or mixing sources. A useful result can be recovered data, an existing-visual brief, a grounded visual plan, or an honest explanation that more research is needed.

This direction follows the existing personal-mode decision. It is a lead planning baseline, not a claim that every proposed feature has been requested by the owner. The owner can revise it; medium implements only the active sprint.

Success means a researcher can answer: What did this come from? Are these actual recovered values or an interpretation? Is the dataset complete? Why was this visual suggested? What can I safely do with this export?

## Major capabilities

| Capability | Why it matters | Current evidence | Destination |
| --- | --- | --- | --- |
| Reliable inspection session | Evidence from the wrong page invalidates all downstream work | Scanner/UI exist; tab and request identity gaps found | Tab/document/scan identity; stale/cancelled work cannot publish results |
| Local evidence recovery | Gives utility with no API, handles real rendered charts | SVG, tables, D3, Plotly and other runtime paths exist | Measured adapter coverage, honest truncation, safe partial recovery |
| Grounded article planning | Converts prose into reusable structured evidence | Host facts, dynamic tool IDs and materializer exist | Conservative numeric/time/metric semantics; explain why a plan is unsafe |
| Viewport understanding | Helps where DOM data is inaccessible | Screenshot classification and bbox exports exist | Correct capture identity/geometry; classification kept distinct from recovered data |
| Traceable handoffs | Makes research reusable in VizForge/Power BI and other tools | CSV, evidence JSON, recipes and handoffs exist | Versioned outputs, source linkage, explicit completeness and limitations |
| Dependable operation | Prevents quota confusion and “works on my machine” claims | Proxy/launcher/doctor/CI exist | Accurate request/error accounting, reproducible release and browser gates |
| Evidence quality feedback | Converts real failures into lasting improvement | Regression packs and manual site lists exist | Local sanitized fixture corpus and capability scorecard; no silent telemetry |

## Roadmap order

1. **Sprint 001 — trustworthy research operations (authorized now):** source identity, cancellation, capture correctness, strict selected-fact handling, valid time-series completeness, request accounting, and meaningful UI regression coverage.
2. **Candidate Sprint 002 — extraction and semantic quality:** metric/time ambiguity corpus; conservative time binding; truncation metadata; runtime/table adapters and SVG-export safety. Lead chooses exact scope after Sprint 001 evidence. Same unit does not establish that two measures belong in the same chart.
3. **Candidate Sprint 003 — understandable evidence and stable exports:** source/fact drill-down, clear recovered/inferred/unavailable states, stable export contracts and downstream consumer fixtures. This makes trust inspectable by the user, beyond raw JSON.
4. **Candidate Sprint 004 — reproducible personal release:** archive verification, clean setup, CI/runtime alignment, performance budgets on representative pages, manual activeTab/navigation/PDF matrix, capability documentation grounded in results.
5. **Later, only with demonstrated demand:** local saved research sessions and comparison; selectable PDF import/OCR pipeline; additional source adapters. Design storage/retention and provenance first.

Cross-cutting security/privacy defects can override that order. A roadmap theme is not a deadline or authorization for medium to implement it early. Each future sprint must receive concrete acceptance criteria from the lead.

## Deliberate boundaries

Keep the personal unpacked extension and localhost companion. Continue with vanilla modules unless evidence justifies a framework. Rich chart authoring belongs downstream; a Power BI handoff is not `.pbiviz` generation. Public Store publication, cloud accounts, shared credentials, a hosted multi-user backend, automatic page surveillance, provider proliferation, a full PDF engine and dashboard authoring require separate owner decisions.

## Evidence of improvement

Track behavioral measures instead of treating test counts as quality: reproducible supported fixtures; zero wrong-source completions in race tests; rejection of every selected incompatible fact set in the corpus; no time-series with missing time values; exact upstream attempt counts in error tests; export completeness labels matching recovered rows; clean release/setup checks. Baseline and later measurements go in REGISTERS, never fabricated numeric targets or confidence percentages.
