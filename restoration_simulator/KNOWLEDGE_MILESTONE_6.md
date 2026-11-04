# Milestone 6: Reviewed research intake and expansion

Completed 3 November 2026. Both sequential expansions and all acceptance checks pass.
All six knowledge milestones are complete; broader content migration and feature
adoption remain separately scoped.

## Delivered workflow

The [intake procedure](knowledge/INTAKE_WORKFLOW.md) and
[worksheet](knowledge/INTAKE_TEMPLATE.md) define entity discovery, ambiguity review,
document/edition registration, inspected passages, contextual claims, unresolved
issues, dependency review, explicit adoption and publication. Chat answers remain
research inputs rather than evidence. Existing source acquisition/cataloguing rules
and the older-edition retrieval limitation remain explicit.

`backend.knowledge_intake` reads an isolated directory containing `batch.json` and
complete proposed copies of the two canonical JSON registries. The required
manifest pins dataset/registration hashes, exact authority and candidate file bytes,
resolved native bindings, source reviews and replacement/removal reasons. The
runtime never discovers or reads candidate directories or archived receipts.

Read-only interfaces:

```powershell
python -m backend.knowledge_intake --check BATCH_DIR
python -m backend.knowledge_intake --review BATCH_DIR
```

Python functions are `check_batch`, `review_batch`, `baseline_fingerprints`,
`candidate_authorities` and `project_candidate_sources`. The last helper generates
six-field source mirrors from the explicit candidate registry and required labels;
authors need not maintain another copy of citation metadata. Candidate validation
reuses the existing citation, graph, native-binding and feature validators with
explicit inputs, without changing process-global loader paths.

Both operations validate all citation consumers, the complete graph, every existing
feature context and actual source bytes once per edition. They read inputs afresh
and reject changed inputs during review. Review reports contain before/after
records, source metadata and explained dependency paths. Binding-only changes also
trace their registered dependent claims and passages. Citation checks, actual
evidence displays and manual review targets remain separate. A missing side of a
diff is explicit `null`, not recovery data. Unknown dependencies remain outside
the registered coverage boundary.

Only `explorer_only` adoption is supported. Existing feature context contents and
ordering must remain equal; a changed displayed claim is rejected with the affected
contexts and instructions for a separately scoped adoption change. Invalid schemas,
duplicate keys, nonfinite JSON, unsupported requests, stale fingerprints, changed
native records, missing labels/reasons, wrong editions/pages and failed reads fail
clearly. Success emits deterministic version-1 JSON with exit 0; expected failures
emit stderr with empty stdout and exit 1; invalid usage exits 2. Commands never
write files, open projects, perform Git operations or publish automatically.

## Two sequential published batches

The first candidate was prepared from revision
`f73b09610f84800592291b704a3808bac4e60a90`, initially a clean working tree. Both
check/review commands passed before each publication. Immediately before applying
each candidate, its complete review was rerun and compared for exact equality.
The local backend was stopped for the matching registry edits and restarted after
both batches, using its original Python executable, host and port. No normal
project browser workflow was used. No commits, staging or resets were performed.

| Batch | Additions | Reviewed local PDF pages | Result |
| --- | --- | --- | --- |
| [LIFE Nature](knowledge/intake/life-nature-v1/review.md) | Two entities, three claims, three native bindings, four citation uses and one programme-membership edge | FUND-016: 8, 9, 20, 21 | 43 nodes / 64 edges; 24 record changes |
| [Kermes oak](knowledge/intake/kermes-oak-v1/review.md) | Three entities, six claims, four native bindings, three citation uses, one issue and one optional-palette edge | FOREST-003: 1, 2, 3 | 55 nodes / 86 edges; 27 record changes |

Both PDF editions were already registered. No document bytes, download links,
catalogue entries or document registrations were changed. PDF positions and printed
labels were kept distinct. FOREST-003's publication date remains unverified.

LIFE claims distinguish Nature/Biodiversity strategy, SAP purposes and the conditional
cofinancing framework. They do not assess a current call, classify an applicant,
calculate financing or add questions. The retained LIFE guide is a manual review
target exposed through one registered `research_guide` adapter.

Kermes claims distinguish climatic occurrence, substrate context, descriptive
co-occurrence, the Rhamno-Querceto reference and two unresolved naming descriptions.
Low-rainfall occurrence is not a survival threshold. Community occurrence does not
establish beneath-crown compatibility. The prose coscoja/Quercus label and the
Bupleuro-Pistacieto Latin label remain together without a preferred correction.
Retained Designer labels, mixtures, defaults and rules are unchanged. Species,
series and shrub placement are manual review targets.

The `palette_optional_species` relationship is registered in backend and frontend
contracts, checked against the native optional-members list and classified as a
project association. It selects no plant. The existing programme-membership type
connects LIFE to its existing Nature route. No LIFE-to-species eligibility link
is inferred. Actual source connections still derive only from explicit references.

Accepted manifests and complete change reports are archived with review notes in
`knowledge/intake/`. They are deliberate historical receipts, not alternative
runtime datasets. Complete candidate files remain in ignored scratch storage.
The second receipt's baseline hash equals the first receipt's candidate hash:

- LIFE: `586dba3b17e676d4222c37259006a895d4b38d6bfc74ef45e1fc21116c59b047`
- Final: `394b20974e2b4d37ae4506ff1f51d7ebafa216878e1bd365863f5558989915bf`

Both old candidates now correctly fail as stale (exit 1, empty stdout). This is
intentional reuse protection, not a failed publication.

## Compatibility and current coverage

Dataset identity `algarroba-connected-pilot-v1`, existing HTTP/Python query response
versions and the dataset-hash formula are unchanged. New content intentionally
advances the dataset hash. Feature registration remains byte-for-byte unchanged:
`1da729fd96ecda53fe26cdde010b0b6f685b6dd7bd2cb39c527069990c20b0bc`.
The legacy `registered-pilot-only` wire value still means bounded registered
coverage; Explorer wording now says registered knowledge. Its first three roots
are retained, followed by LIFE and kermes oak. No endpoint or persistence schema
was added for authoring.

The collection contains 16 entities, 21 claims, 11 native relationships, three
issues, 26 bindings and 18 source references. The graph has 18 passage nodes and
86 edges: 11 native, 36 subject, 26 claim-citation and 13 entity-citation edges.
The shared registry contains 21 citation uses across six editions/four consumers
with 32 checked mirrors. The original 14 uses are intact; only `knowledge_pilot`
membership grows. The three funding memberships remain exact.

Frozen test fingerprints retain every original curated record, the original
34-node/52-edge subset and all six feature contexts. New knowledge about an old
subject does not auto-adopt into its evidence section. Original library hashes:

| Library | SHA-256 |
| --- | --- |
| Selection guidance | `4a55f602ea8279264afcb8c3135908e4b96ffe2d3b9017559dcec95ae660c03d` |
| Project concepts | `19d260ade0296e99dc2ffc678ae93f49b513f45d959253bd20baddcd4fc7d542` |
| Delivery planning | `bbfd549874c6f0152c7a5b13ae5edef5e43a416785ea3afd72ea44b43faa6ca2` |

All 22 scenario files, nine Designer-library files, seven educational JSON files,
42 existing PDF/PNG documents, the feature registry and eight real saves/backups
retain their baseline fingerprints. Frozen evaluators, reports, import/export
and adopted snapshots retain their existing contracts. No scientific rule,
simulation assumption, price, save format or dependency was changed.

## Verification

The existing `restoration-simulator` Conda environment was used: Python 3.12.16,
Node 22.23.4/npm 10.9.9, React 19.2.0, Vite 7.3.7, PDF.js 6.4.299 and installed
Playwright 1.57.0/Edge. Loaded FastAPI/Uvicorn report 0.162.0/0.54.0, while their
distribution metadata reports 0.120.0/0.38.0; HTTPX is 0.28.1. This observed metadata
discrepancy was recorded without repairing/installing dependencies.

Commands run from the simulator directory; frontend commands from `frontend`:

| Command | Recorded result | Exit |
| --- | --- | ---: |
| `python -m backend.knowledge_intake --check BATCH_DIR` | Both candidates valid before publication | 0 each |
| `python -m backend.knowledge_intake --review BATCH_DIR` | Both reviewed; immediate publication rechecks equal | 0 each |
| Same checks after publication | Expected stale rejection, empty stdout | 1 each |
| `python -m unittest discover -s tests -p 'test_knowledge*.py' -v` | 69 tests pass | 0 |
| `python -m unittest discover -s tests -v` | 361 tests pass | 0 |
| `npm.cmd test` | 132 tests pass | 0 |
| `npm.cmd run build` | Production assets built; existing large-chunk warning | 0 |
| `python -m backend.knowledge_citations --check` | All mirrors and original PDF bytes valid | 0 |
| `python -m backend.knowledge_graph --check` | Expanded collection, graph and sources valid | 0 |
| `python -m backend.knowledge_graph --explorer` | 55-node / 86-edge projection | 0 |
| `python -m backend.knowledge_graph --feature-evidence CONSUMER` | All four consumers, unchanged six context contents | 0 each |
| `node tests/browser/knowledge-explorer.cjs` | Expanded Explorer acceptance | 0 |
| `node tests/browser/knowledge-evidence.cjs` | Six evidence sections, twelve original displayed claims | 0 |
| `node tests/browser/designer-interactions.cjs` | Production regression passes; 25 expected preview requests | 0 |

The 18 new intake tests cover exact reports, source projection/nonmutation, manifest
and file failures, stale/native changes, references, editions/pages, explicit
removals, source-ledger completeness, verification dates, mid-review changes,
document failure/retry, binding-only dependency paths, CLI statuses and rejection of feature changes. They also
verify original records/context hashes and the two exact published batches. Existing
tests were updated for deliberate total growth while retaining exact original
citation, library, stock, gap and historical assertions.

Browser checks use a fresh isolated save on API 8013 and production preview 4174;
they run sequentially. Explorer covers original navigation/keyboard/pan/zoom,
both layouts/List, source focus, snapshot mismatches, failed reads/retry, all six
links, unfinished inputs and queued/submitted editing work. New checks cover LIFE
20/21 and FOREST-003 2/3 exact PDF pages/focus, conditional rates, unassessed calls,
complete naming contexts, illustrative optional membership and manual review
without feature adoption. Twenty-four additional topic/theme/width/layout
combinations cover both topics, both themes and desktop/390/320 px. Reading starts
no mutation or editing-preview requests. Evidence and Designer regressions remain
separate checks. No browser workflow used the normal project.

Raw command logs, environment versions, candidate checks, performance samples,
screenshots and fingerprints are under ignored `test-artifacts/knowledge-intake/`.
The new compatibility fixture contains record/graph hashes, not a competing runtime
knowledge library. Initial diagnostics are not counted as passing acceptance: old
total-count expectations failed after expansion, and a new test initially had a
syntax typo. Counts/coverage assertions were updated and the typo corrected; the
targeted and frontend runs above then passed.

Final review covered 28 changed/new files, 56 local documentation links/anchors,
six Python syntax checks and seven JSON files; `git diff --check` passed. Of 422
starting repository/document files, 406 remain unchanged and 16 have intended
edits; 12 files are new. All eight real save/backup fingerprints remain unchanged.
The isolated browser servers were stopped after acceptance; the normal backend
was restored to its original host/port and left running.

## Measured effort and remaining work

Both batches changed only the two canonical runtime registries; native feature,
rule and source files needed no duplicated knowledge edits. LIFE required 24
reviewed record changes and four inspected pages; kermes required 27 changes and
three pages. Most work was passage interpretation, applicability/limitation wording
and explicit review-target registration. Source mirrors are generated projections;
retained native prose and publication metadata still have independent ownership.

Five samples per operation (milliseconds, median; JSON sizes are uncompressed):

| Operation | Before median | After median | Before/after JSON bytes |
| --- | ---: | ---: | ---: |
| Load | 169.92 | 386.78 | 85,239 / 119,850 |
| Graph | 161.04 | 297.29 | 145,484 / 232,026 |
| Carob search | 136.33 | 280.41 | 1,391 / 1,434 |
| MR2 claim impact | 132.24 | 276.03 | 7,553 / 7,596 |

After samples ran during other verification work, so timings are indicative rather
than an isolated benchmark. Graph payload grew with the curated records and complete
details; fresh loads also validate the newly referenced native research-guide owner.
These measurements do not establish a need for a database or justify caching failed
reads. The existing roughly 1.56 MB main/611 kB PDF JavaScript chunk warning remains.

Broader source retrieval, retained guide editions, label-encoding defects,
independent prose, other programme families, automatic extraction and feature
adoption remain open. The two original research issues and new naming tension
remain unresolved; call availability is not assessed. The next bounded task is to
choose another evidence batch or separately plan adoption of these claims into
feature sections using the same reviewed workflow. No additional research was
performed beyond the agreed local passages.
