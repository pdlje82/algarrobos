# Algarroba knowledge architecture implementation plan

Created 3 November 2026. Status: Milestones 1–5 complete; Milestone 6 pending.

Algarroba needs a shared way to connect research evidence, ecological knowledge,
funding requirements and project decisions as its content grows. Implement this
through six bounded milestones. Each milestone must leave the app usable and
produce a result that can be checked independently.

The first delivery is an authority map and compatibility baseline. Shared evidence
records follow, then a small connected knowledge pilot, integration into existing
features, a visual explorer and a repeatable expansion workflow. Keep later
milestones at roadmap level until the preceding work establishes their contracts.

## Intended architecture

| Layer | Responsibility | Existing foundations to preserve |
| --- | --- | --- |
| Sources | Document and web-source identities, editions, passages and retrieval metadata | `doc_library/CATALOG.md`, `scenarios/documents.json`, document verification and page mappings |
| Knowledge | Typed entities, contextual claims, evidence, relationships, conflicts and research gaps | Species IDs, funding entry and programme IDs, EDL references and existing evidence classifications |
| Rules | Executable calculations and editing policies, with explicit versions and supporting evidence | Scenario funding assumptions, registered Site Designer rules and Python handlers |
| Projects | User inputs, assumptions, observations, drafts and adopted snapshots | Atomic saves, revision checks, immutable history and explicit review/adoption |

Use version-controlled, validated records for initial authoring. Treat graph,
search and feature responses as projections of declared authorities. Any later
database or index must have an explicit ownership and rebuild contract.

Ecological generation remains authoritative in `design_rules/` and its registered
Python handlers. Simulation and funding assumptions remain in scenario JSON;
current plant-price defaults remain in `scenarios/plant-prices.json`. The shared
knowledge layer connects these authorities and their evidence. It must not become
a competing source of operational defaults.

## Delivery boundaries

- Preserve stable identities, historical evaluators, saved rule bundles and manual
  project inputs. New knowledge editions must not silently change existing projects.
- Validate required fields and references at boundaries. Reject unsupported types,
  unresolved references and incompatible editions with actionable errors. Preserve
  the user's confirmed state and draft on failure.
- Distinguish a document, its edition, a passage, a claim and a rule. Keep citation
  display wording separate from the identity of the cited passage.
- Preserve unknown, absent, zero, false and empty according to explicit contracts.
  Separate publication dates, verification dates and dates of legal applicability.
- Retain evidence categories, contextual limitations and conflicting statements.
  Shared community membership does not establish plant compatibility or suitability.
- Separate researched guidance, executable assessment coverage and actual project
  evidence. Adding a graph connection must not award points or establish eligibility.
- Keep failed mutations atomic. Use explicit, validated migrations only when a
  persisted contract actually changes.
- Follow [repository instructions](../AGENTS.md), the
  [fallback audit](FALLBACK_AUDIT.md), the
  [designer rule workflow](design_rules/README.md) and the
  [document cataloguing workflow](../doc_library/CATALOG.md).

## Milestone 1 Knowledge ownership and compatibility baseline

**Outcome:** an implementation-ready map of where knowledge belongs and what must
remain compatible. App behaviour stays unchanged.

1. Inventory current source, citation, species, community, method, funding, scoring
   and project records. Include educational knowledge in frontend JSON and research
   reports, while distinguishing presentation-only content and historical data.
2. Produce an authority matrix: record type, owning file/module, ID scope, validation,
   consumers, versioning and update procedure. Identify deliberate snapshots and
   generated copies separately from independently maintained duplicates.
3. Trace two small examples end to end: AL20 3.4 requirements and their use in
   guidance/project concepts; carob and MR2 evidence and their use in the Designer.
   Connect the examples through an illustrative project activity. Preserve the
   distinction between an ecological method and a funding requirement.
4. Examine repeated citations, including those shared by selection guidance and
   project concepts. Classify identical records, presentation differences, encoding
   defects and substantive conflicts. Do not merge by label or ID alone.
5. Inspect existing source-edition and historical-save handling. Document how an
   older edition can remain identifiable and accessible when a new one is registered.
6. Define the minimum pilot contracts, ownership and dependencies for Milestone 2.
   Reuse existing document registration wherever it satisfies those contracts.
7. Establish relevant regression checks using repository fixtures and isolated test
   saves. Record the commands, results and any pre-existing failures.

**Completion evidence:** authority matrix, two source-to-feature traces, a classified
duplication list, compatibility constraints and a concrete Milestone 2 change list.
Keep these findings in this plan or directly linked repository documentation.

Completed 3 November 2026 in the [knowledge ownership audit](KNOWLEDGE_OWNERSHIP_AUDIT.md).
It contains the authority matrix, research integration inventory, both pilot
traces, citation comparison, compatibility findings and the bounded Milestone 2
handoff. Baseline revision `9047aa81a830df90c6267de397bdb9963c937777` passed
292 backend tests, 107 frontend tests and the production build. Exact commands,
environment, times and the non-fatal bundle-size warning are recorded in the audit.

## Milestone 2 Shared source and passage records

**Outcome:** pilot citations have one authoring authority and resolve to an exact
source edition and passage.

Completed 3 November 2026. The [Milestone 2 implementation results](KNOWLEDGE_MILESTONE_2_PLAN.md#implementation-results)
record the shared registry, three consumer checks, read-only commands and
compatibility evidence. The [knowledge README](knowledge/README.md) defines
ownership and the editing workflow. All 19 new citation tests passed; the full
backend suite passed 311 tests, frontend tests passed 107, and the build succeeded
with the existing bundle-size warning. The three feature JSON files, labels and
library hashes are unchanged.

Implement a validated shared evidence contract, resolving the registry paths from
Milestone 1. The audit's handoff fixes the first scope to five FUND-008 citation
uses across selection guidance, project concepts and delivery planning. Keep the
existing source objects as validated generated mirrors, preserving labels and
resolved library hashes. Reuse existing library IDs, checksums and PDF page
mappings. Broader representation of external web sources and unavailable local
documents follows this first extraction.
Use source-edition identity and passage location to detect duplicate candidates;
retain distinct uses, interpretations and evidence roles where needed.

Provide explicit mappings from existing pilot citation IDs to shared records.
Produce deterministic feature projections where existing response contracts need
their current shapes. Declare which representations are generated and verify that
they match their source; maintaining two independent authoring copies is a defect.

Initially operate alongside existing consumers through an explicitly selected
validation or comparison command. Application requests must use one declared path;
failure must never trigger an implicit retry through the earlier implementation.

**Completion evidence:** valid pilot references resolve; duplicate identities,
missing records, page errors, edition mismatches, malformed data and failed reads
produce clear failures. Existing historical snapshots remain independently readable.
Any citation-label correction is a documented editorial change.

## Milestone 3 Connected knowledge pilot and queries

**Outcome:** the pilot can answer useful questions through structured relationships.

Completed 3 November 2026. The [Milestone 3 implementation record](KNOWLEDGE_MILESTONE_3.md)
documents 12 claims, 11 typed entities, nine relationships, two unresolved issues,
19 registered bindings and four read-only query capabilities. Its source review,
explicit coverage boundary and distinction between citation dependencies and
manual review targets are documented with the verification evidence. The targeted
35 tests, full 327 backend tests, 107 frontend tests, both check commands and
production build passed. The existing bundle-size warning remains. Original
funding libraries, Designer rules, educational content, documents and saves retain
their fingerprints. Feature adoption has not started.

Model only the entity and relationship types required by AL20 3.4, carob, MR2 and
their sources. Reference existing domain identities. Introduce explicit typed
claims with applicability, evidence category, supporting passages, review status
and limitations. Model assumptions, conflicting claims and unresolved research
without promoting them into verified facts.

Define allowed relationship types and endpoint types. Preserve the different
meanings of a vegetation series, a planting preset, an approach and a technique.
Represent funding programmes, routes and researched call editions distinctly;
unknown call information remains explicitly unknown.

Provide a small read-only Python query interface, with versioned results, for:

- Finding an entity and its aliases without creating another identity.
- Listing claims, passages and limitations relevant to an entity.
- Listing registered consumers affected by a changed passage or claim, with each
  dependency explained and the coverage scope stated.
- Reporting unresolved evidence and conflicts.

Dependency answers must use registered references. List unindexed narrative
material as outside the query's coverage; do not claim complete impact analysis
until its consumers are registered.

**Completion evidence:** trace the pilot's claims to exact passages, expose their
registered consumers and preserve conflicting contexts. Reject unknown relation
types and dangling references. Querying must not mutate project state or scores.

## Milestone 4 Integrate the pilot into existing features

**Outcome:** the existing funding and Designer experiences consume shared pilot
knowledge while retaining their calculation and editing contracts.

Completed 3 November 2026. The [Milestone 4 implementation record](KNOWLEDGE_MILESTONE_4.md)
documents six read-only Current evidence sections across four consumers, the
version-1 projection/API/CLI and version-2 impact paths. All twelve claims are
accessible, with source context, assumptions and unresolved issues preserved.
The targeted 44 tests, full 336 backend tests, 115 frontend tests, registry/pilot
checks, four projections and production builds passed. Isolated browser checks
covered all six placements in both themes at desktop/390/320 px, exact PDF pages,
failure/retry, unfinished inputs and absence of evidence-triggered commands. The
existing Designer interaction regression passed too. Funding libraries, rules,
educational data, source documents and real saves retain their fingerprints.
The existing bundle-size warning remains; older funding browser navigation
scripts require separate maintenance and were not reported as passing.

Switch the selected live editorial consumers to the shared records and deterministic
projections. Retain frozen replay inputs and embedded project bundles. Keep current
rule execution in its existing authorities and register its evidence dependencies.
Use explicit adapters when a response or save version changes.

Separate intended editorial corrections from behaviour-preserving changes. Compare
funding results, planting counts, costs, positions, explanations, source links and
exports for representative existing inputs. Document expected differences.

**Completion evidence:** relevant regression tests pass, source links retain edition
and page identity, and supported historical projects preserve their results. Check
failure/retry, draft retention and explicit rule adoption wherever those paths change.
Perform browser checks against isolated saves following the
[browser test instructions](frontend/tests/browser/README.md).

## Milestone 5 Focused knowledge explorer

**Outcome:** users can inspect the pilot's connections and the evidence behind them.

Completed 3 November 2026. The [Milestone 5 implementation record](KNOWLEDGE_MILESTONE_5.md)
documents the project-independent Knowledge Explorer, Lanes and Network layouts,
List/detail alternative, 34-node/52-edge projection and read-only query endpoints.
All six evidence links, precise sources, classified usage and unresolved contexts
are accessible. Entry/return preserve mounted drafts and suspend unstarted editing
work; submitted work settles and follow-on writes resume only after return.

Acceptance passed: 51 targeted/343 full backend tests, 15 targeted/130 full frontend
tests, both knowledge checks, all four original projections, new CLI and production
build. Sequential production browser checks cover Explorer, Milestone 4 evidence
and Designer regression, themes, phone widths, PDF focus, explicit failure/retry,
editing suspension and successful resumption. Corpus/rule/library/save fingerprints
and historical compatibility remain unchanged. The existing bundle warning and
observed environment metadata discrepancy are recorded; no dependencies changed.

Add a read-only explorer centred on a selected entity. Show a bounded neighbourhood
with labelled relationships, filters and progressive expansion. Provide a readable
list/detail alternative for keyboard and narrow-screen use. Reuse document viewing
and exact source-page links. Display evidence status and limitations in the details.

Keep this explorer's purpose distinct from the existing funding assessment graph.
Both views consume their declared services. Opening a node, filtering or expanding
connections must not change selection, funding points, planting or project drafts.

**Completion evidence:** a user can navigate carob to an MR2 claim and its source,
and AL20 3.4 to a requirement and its supporting passage. Verify keyboard access,
phone layout, visible loading failures, explicit retry and unchanged project state.
Show the pilot's coverage clearly so absence is not mistaken for lack of evidence.

## Milestone 6 Repeatable research intake and gradual expansion

**Outcome:** future research can extend the model through a documented, testable
procedure with limited changes to unrelated features.

Document and support this sequence: locate existing entities; register the source;
propose contextual claims and relationships; identify conflicts and affected
consumers; validate; review the diff; publish the knowledge/rule edition. Existing
projects continue to use their adopted snapshots until their existing explicit
review/adoption flow is used. Research prompts and chat answers are research inputs;
their substantive claims require evidence classification.

Exercise the procedure with a second funding programme and another ecological
example selected for their different requirements. Reuse registered calculations
where their semantics match. Add an explicit handler and tests for genuinely new
behaviour. Classify guide-only coverage honestly.

Expand in batches after the pilot works: source/citation libraries, funding families,
plant/community/method knowledge, then other research topics. Record coverage and
remaining independent copies after each batch. Measure query and authoring needs
before deciding on a database, semantic search or automated ingestion.

**Completion evidence:** the two expansion examples work through the documented
procedure, unrelated features need no duplicate knowledge edits, and source updates
produce a useful impact report with an explicit coverage boundary.

## Work session procedure

Keep this roadmap as the durable handoff between sessions. At the beginning of a
session, read the current milestone, repository instructions and relevant authority
documentation. Check the working tree and preserve unrelated work.

Split each implementation milestone into small changes with a concrete outcome,
affected files, acceptance checks and compatibility notes. Keep changes independently
reviewable; separate preparatory work from changed domain behaviour where practical.
Verification points establish readiness for the next step. Existing product review
requirements still apply to rule adoption, transfers and project confirmation.

At the end of each session, update the progress record with completed work, exact
checks, unresolved decisions and the next bounded task. Mark completion only when
the milestone's acceptance evidence exists. Use a specific blocker when a required
decision cannot be resolved from the repository or authorised task scope.

## Progress and next task

| Milestone | Status | Completion evidence |
| --- | --- | --- |
| 1 Knowledge ownership and compatibility baseline | Complete | [Audit, traces, compatibility review and passing baseline](KNOWLEDGE_OWNERSHIP_AUDIT.md) |
| 2 Shared source and passage records | Complete | [Registry, compatibility checks and passing verification](KNOWLEDGE_MILESTONE_2_PLAN.md#implementation-results) |
| 3 Connected knowledge pilot and queries | Complete | [Curated pilot, read-only queries and passing acceptance checks](KNOWLEDGE_MILESTONE_3.md) |
| 4 Integration into existing features | Complete | [Six shared-evidence sections, compatible projections and passing acceptance](KNOWLEDGE_MILESTONE_4.md) |
| 5 Focused knowledge explorer | Complete | [Two layouts, shared graph/query contracts, preserved drafts and passing acceptance](KNOWLEDGE_MILESTONE_5.md) |
| 6 Research intake and gradual expansion | Pending | To be recorded |

**Next bounded task:** prepare the Milestone 6 implementation plan for repeatable
research intake and gradual expansion. Specify source registration, contextual
claims/relationships, tension review, explicit feature adoption, validation and
impact checks, then select two bounded expansion examples. Preserve current
project snapshots and deliberate feature memberships. Milestone 6 remains pending;
no additional research or content migration was performed in Milestone 5.

**Open findings:** the viewer registers one edition per document ID; concept,
delivery and EDL records require exact installed library hashes; 80 shared
guidance/concept citation labels have encoding drift. Seventy-five other shared
guidance/concept citations, six concept-only EDL uses and the other evidence
collections remain outside the new registry. General source-edition retrieval,
retained guide editions and cross-domain dependency coverage remain open. The
pilot's stock-format tension and bounded establishment-water gap remain unresolved;
current call availability is not assessed. Shared claims now feed the six current
evidence sections, while retained help, reports, rules and standalone educational
explorers keep their existing ownership. Older funding browser scripts refer to
obsolete navigation labels. The build reports large JavaScript chunks. These
are separately scoped future work.
