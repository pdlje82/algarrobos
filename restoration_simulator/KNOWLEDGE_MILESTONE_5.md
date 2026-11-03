# Milestone 5: Knowledge Explorer

Completed 3 November 2026. Both graph layouts and all acceptance checks pass.
Milestone 6 remains pending.

## Delivered scope

Knowledge Explorer is a dedicated, project-independent workspace with Lanes and
Network graphs and an equivalent List/detail view. It starts with the three
registered coverage topics and entity search, without selecting a topic from a
project. All six Current evidence placements link to their explicit topic; the
concept placement links to the illustrative activity. Return restores the previous
workspace and originating control. Presentation state stays in memory only.

Both deterministic layouts use the same record selection, filters and expansion
state. Lanes separate entities, claims and passages; Network uses spaced rings
around the centered entity. Native node/connection buttons, labelled zoom controls,
arrow-key canvas panning and focus scrolling support keyboard interaction. List
is automatic below 900 px and can be explicitly selected at any width. Expansion
uses registered adjacency; collapse preserves shared neighbours. Filters remove
records/edges without inventing bypass connections. Center, Previous topic and
Reset are explicit operations. Position and zoom are presentation state only.

Details retain applicability, evidence categories, limitations, review dates,
configuration references, complete unresolved issues and citation roles. Both stock
descriptions remain together, without a preferred size. Water evidence remains
bounded to the inspected passages; call availability is not assessed. Illustrative
associations are labelled and dashed. Current density/geometry remain owner-resolved
assumptions. Checksum-qualified PDF links reuse the existing viewer and focus return.

Where used loads only when opened. Citation-validation dependencies, shared-evidence
displays and manual review targets are separate. Reading them opens no editing
screen and adopts no rule.

## Projection and contracts

`backend.knowledge_graph.explorer_graph()` and `--explorer` build from one validated
load, including the document descriptions already resolved by its native adapter.
The graph contains 34 nodes and 52 edges:

| Kind | Count | Identity/provenance |
| --- | ---: | --- |
| Entities | 11 | Existing prefixed native identities |
| Claims | 12 | Existing claim IDs and resolved evidence/configuration |
| Passages | 11 | Existing document/checksum/PDF-page identities |
| Native relationships | 9 | Existing typed relationship IDs |
| Claim subjects | 22 | Explicit subject IDs only |
| Claim citations | 14 | Explicit claim references only |
| Entity citations | 7 | Explicit entity references only |

Derived edges use `edge:` plus the SHA-256 of the canonical Python JSON array
`[kind, source, target]`. Citation links are labelled **cites**. Relationship
provenance stays in relationship details and creates no inferred source links.
Each passage carries its authoritative document description and separate citation
uses. The existing twelve claims and three knowledge JSON registries are unchanged.

New project-free GET interfaces:

| Endpoint | Response |
| --- | --- |
| `/api/knowledge/explorer` | Version 1 complete graph snapshot |
| `/api/knowledge/search?text=...&entity_type=...` | Existing version 1 search; type optional |
| `/api/knowledge/impact?target_kind=...&target_id=...` | Existing version 2 explained usage |

`--check` additionally validates the graph, preserving its response fields. CLI
statuses remain 0/1/2. Unknown/repeated query fields and unsupported requests fail
clearly. UI contracts are independent of components/central dispatch, validate
identities, endpoints, editions, issue groups and required details, and reject
search/impact responses from another snapshot. Usage also checks the registration
hash and requested target. Errors clear unavailable graph/detail data, retain view
inputs and require explicit Retry/Refresh. No stale successful snapshot or alternate
source replaces a failed load.

The dataset hash definition is unchanged:
`2f1c65ace5d2c962e921a6f347f7c9decc8d0f0b0b3e0c2005b5186e71230f04`.
Feature registration remains
`1da729fd96ecda53fe26cdde010b0b6f685b6dd7bd2cb39c527069990c20b0bc`.

## Editing isolation

`explorerSession.js` provides a synchronous in-memory suspension gate. Explorer
entry/return bypass save guards, project refreshes, previews and rule adoption.
Project, funding and Designer components remain mounted; the funding question
editor also remains mounted while exploring, with its resize/keyboard observers
suspended so focus can return to the same control.

Unsubmitted planning autosaves, demonstrator concept autosaves/report previews and
Designer queue entries wait while suspended. Dirty inputs and request identities
remain retained. Submitted operations may settle; planning checks suspension before
starting a follow-on write. Return resumes the existing policy. Funding already
pauses automatic save/evaluation while inactive. Unrelated explicit save, transfer
and adoption controls retain their existing review behavior. There is no new save
field, migration, ecological rule, calculation, claim, dependency or source download.

## Verification record

Starting revision: `0cc8c8b3ff6096fc8b23adfc6c4d49a0e69e4888`. The simulator working
tree was clean at the baseline. No commits, staging, resets or unrelated edits were
performed. Starting fingerprints cover 413 repository/document files and eight real
save/backup files. Raw logs, projections, screenshots and fixture saves are ignored
under `test-artifacts/knowledge-explorer/`.

Use the existing `restoration-simulator` Conda environment. Recorded versions:
Python 3.12.16, FastAPI 0.162.0, HTTPX 0.28.1, Uvicorn 0.54.0, Node 22.23.4,
npm 10.9.9, React 19.2.0, Vite 7.3.7, Playwright 1.57.0 with installed Edge.
Early build/targeted diagnostics also used system Node 24.14.0/npm 11.9.0;
final frontend suite and production assets use Conda. No installation was needed.
The loaded FastAPI/Uvicorn modules report 0.162.0/0.54.0; their installed
`importlib.metadata` distribution records report 0.120.0/0.38.0. Both modules
resolve inside this Conda environment. This metadata discrepancy is
recorded explicitly; dependencies and environment files were not changed.

From `restoration_simulator` (frontend commands from its `frontend` directory):

| Command | Result | Exit |
| --- | --- | ---: |
| `python -m unittest discover -s tests -p 'test_knowledge*.py' -v` | 51 tests pass | 0 |
| `python -m unittest discover -s tests -v` | 343 tests pass | 0 |
| `node --test tests/knowledgeExplorer.test.mjs` | 15 tests pass | 0 |
| `npm.cmd test` | 130 tests pass | 0 |
| `npm.cmd run build` | Production assets built; existing large-chunk warning | 0 |
| `python -m backend.knowledge_citations --check` | Shared registry, mirrors and actual document bytes valid | 0 |
| `python -m backend.knowledge_graph --check` | Pilot, feature registry, graph and document bytes valid | 0 |
| `python -m backend.knowledge_graph --explorer` | Deterministic 34-node/52-edge JSON | 0 |
| `python -m backend.knowledge_graph --feature-evidence CONSUMER` | All four original consumers valid | 0 each |
| `node tests/browser/knowledge-explorer.cjs` | Full Explorer acceptance; six links, both layouts/List, failure/retry and editing suspension | 0 |
| `node tests/browser/knowledge-evidence.cjs` | Milestone 4 regression; six sections and twelve claims | 0 |
| `node tests/browser/designer-interactions.cjs` | Production Designer regression; 25 expected preview requests | 0 |

The targeted suite was repeated after strict new HTTP-parameter validation. The
complete existing suite covers saved library hashes, historical replay, reports,
import/export, atomic failures, draft preservation, adoption and successful retry.
New backend tests verify exact graph membership/IDs/endpoints, only explicit
connections, edition/page/role metadata, separate citation uses, complete unresolved
issues, deterministic output, nonmutation, failed reads/retry and project-free
endpoints. Frontend tests cover contracts, Unicode/ambiguity/empty result responses,
snapshot mismatch, expansion/collapse/shared neighbours, filters, layout spacing,
selection without recentering, List membership equivalence, stale-response rejection
and suspension/queued identities. Connection labels have independent collision boxes.

The new Explorer browser check passes against production preview assets on 4174
and a fresh, unique isolated save on API 8013. It covers no-project entry/laziness,
all six contextual links and returned focus, both layouts and List, centered-topic
and individual-record expansion/collapse, shared navigation/filter state, keyboard
selection, native pan/zoom controls, source pages and PDF focus, lazy claim/passage
usage, dataset/registration mismatch, malformed responses, failed reads and Retry.
Light/dark checks cover desktop, 390 and 320 px; explicit Graph remains usable on
phones while Auto selects List. Both stock contexts, strategy, illustrative activity
connections and bounded gap/assumption context remain accessible.

Browser fetch instrumentation marks actual Explorer entry/return events. Requests
that already began in an editing workspace are distinguished from requests started
while exploring. No mutation or editing-preview fetch starts during exploration.
Unfinished funding notes, concepts, planning inputs, demonstrator concepts and
Designer inputs survive entry, errors and return. A held submitted planning save
settles without starting its queued follow-on write; the newer input saves on return.
A queued Designer command similarly waits and resumes without losing its input.


The browser workflows ran sequentially, never against the normal application or
real projects. Milestone 4 covered all six sections in light/dark at 1440/390/320 px,
source-page focus, failure/retry and draft preservation. Designer regression
reported `passed: true`, `production: true`, 25 preview requests, both themes and
1680/390/320 px. It verifies quantities/placements, interactions, unfinished input,
Undo, saves and failures independently of Explorer reading. The API used a fresh
unique file under the ignored artifact folder; preview served the built app on
4174 using the existing isolated proxy configuration. The installed Playwright
module was used directly; no browser/dependency download was performed.

### Integrity and final review

All 22 scenario files, nine Designer rule-library files, seven educational JSON
files, three knowledge JSON registries and 42 existing PDF/PNG documents retain
baseline hashes. All eight real saves/backups retain their hashes. Frozen evaluators,
funding owner loaders, retained results and save formats are unchanged. Original
funding library hashes remain:

| Library | SHA-256 |
| --- | --- |
| Selection guidance | `4a55f602ea8279264afcb8c3135908e4b96ffe2d3b9017559dcec95ae660c03d` |
| Project concepts | `19d260ade0296e99dc2ffc678ae93f49b513f45d959253bd20baddcd4fc7d542` |
| Delivery planning | `bbfd549874c6f0152c7a5b13ae5edef5e43a416785ea3afd72ea44b43faa6ca2` |

Existing compatibility coverage remains in `test_knowledge_citations.py`,
`test_project_concepts.py`, `test_planning_draft.py`, Designer v1/v2/v3/library
suites and the other full backend tests. This change creates no new project
persistence or migration path. Fingerprint and diff review checks every changed
tracked file plus new implementation/test/documentation files; the final record is
in `test-artifacts/knowledge-explorer/fingerprints.json` and `review.json`.
Of 413 starting files, 399 are unchanged and 14 match the intended code/documentation
edits; nine new implementation/test/documentation files bring the reviewed diff to
23 files. All 27 local documentation links/heading anchors resolve. Three Python
files pass syntax parsing, the browser script passes `node --check`, whitespace and
final-newline checks pass, and `git diff --check` exits 0. Git's existing LF-to-CRLF
notices are informational. Both owned isolated servers were stopped after checks.
Restart an already-running application backend and reload its frontend to load the
new endpoints and workspace.

### Diagnostics and warnings

Early checks were not all successful. A discovery invocation from the repository
root failed to import `backend`; runs from the simulator directory passed. New
test assertions initially assumed two existing citation uses on FUND-008 page 120,
a different stock-claim ID, and a full-width search string damaged by a test-file
encoding conversion. They were corrected using actual registry identities; an
explicit separate-role fixture now tests multiple uses on one passage without
changing corpus data. An early label-layout test and its full-suite run failed;
the collision solver was corrected and the final 15 targeted/130 full frontend
tests pass.

Browser diagnostics found missing explicit accessible selector names (fixed in the
controls). Test-only corrections addressed selection changed by the preceding
iteration, hidden duplicate delivery topics, and requests started before entry or
legitimately resumed after return. Instrumentation now uses the actual transition
clicks. These attempts, including an interrupted diagnostic, are not counted as
passing acceptance. The final complete Explorer, evidence and Designer runs passed.

The existing production warning remains: main JavaScript is about 1.56 MB and the
PDF engine about 611 kB before gzip; Vite warns about chunks above 500 kB. The loaded
module/distribution-version discrepancy above is recorded for reproducibility;
no environment repair was attempted. Older unrelated funding browser scripts with
obsolete navigation labels were not claimed as passing. No broader repository
fallback-compliance or complete knowledge-coverage claim is made.

## Remaining coverage and next task

This is the registered pilot, not an inventory of all research or project-specific
dependencies. The current source registry retains one installed edition per document
ID. Current call availability, the stock tension, the bounded water gap, broader
dependency coverage, retained help/exports and standalone educational ownership
remain open as recorded in the [ownership audit](KNOWLEDGE_OWNERSHIP_AUDIT.md).
The existing large-bundle warning remains separately scoped.

Milestone 6 remains pending: define repeatable research intake and review, then
extend knowledge in bounded, deliberately registered batches. No database or
automated ingestion decision is implied by the Explorer.
