# Reviewed knowledge intake

Use this procedure for a bounded repository change. Research questions and chat
answers are inputs, not evidence. The runtime authorities remain
`citations-v1.json` and `connected-pilot-v1.json`; candidate directories and
`intake/` receipts are never loaded by the application.

## Prepare a question and its evidence

1. Complete the [intake worksheet](INTAKE_TEMPLATE.md). Search IDs, labels and
   aliases first with `python -m backend.knowledge_graph --search TEXT` (optionally
   `--type TYPE`). Resolve ambiguity explicitly. Equal labels do not establish
   equal documents, editions, passages, species or citation roles.
2. Identify the source through the [library catalogue](../../doc_library/CATALOG.md).
   Record title, issuer, publication context, complete checksum and exact PDF
   positions. Printed numbers are separate labels. Inspect the actual passages,
   including continued paragraphs/tables; record the real review date. Keep unknown
   publication dates unknown. A local filename or chat summary is insufficient.
3. For future internet research, provide verified publisher download links and
   distinguish already-stored documents from proposed additions. Follow the library
   naming/cataloguing workflow before registering a source. This milestone used
   only existing FUND-016 and FOREST-003 bytes and performed no internet research.
4. Retain old editions. The viewer currently installs one checksum per document ID;
   do not overwrite a referenced document with a revised PDF. A distinct new library
   ID can preserve both physical editions, but does not establish logical work
   equivalence. General older-edition retrieval remains separately scoped.

## Prepare an isolated candidate

Copy both canonical JSON files into an explicit scratch directory, such as
`test-artifacts/knowledge-intake/candidates/BATCH_ID/`, and edit those copies. Do
not edit the active registries while assembling an incomplete proposal. Use the
existing schema, registered native adapters and typed relationship endpoints.
New types/handlers require a separate code registration and tests. No executable
path or calculation can be supplied through a manifest.

Create `batch.json` with exactly these schema-1 fields:

| Field | Meaning |
| --- | --- |
| `version` | Integer `1` |
| `id`, `title` | Stable lowercase hyphenated ID and readable research question |
| `reviewed_on` | Real ISO review date, also the candidate dataset review date |
| `adoption` | `explorer_only`; other adoption modes fail explicitly |
| `baseline` | Current dataset ID/hash, feature-registration hash and exact authority file fingerprints |
| `candidate_files` | SHA-256 of the exact bytes of `citations-v1.json` and `connected-pilot-v1.json` |
| `candidate_authorities` | Every candidate binding ID mapped to its resolved `authority` object |
| `source_review` | Reviewed document IDs/checksums, ordered PDF pages, publication context and review notes |
| `reasons` | Nonempty reasons keyed by each replacement/removal key in the change report |

Capture `baseline` with the read-only Python helper
`backend.knowledge_intake.baseline_fingerprints()`. It fingerprints both canonical
files, the feature registry, scenario JSON, Designer-library JSON and educational
JSON. Capture `candidate_authorities` with
`candidate_authorities(candidate_data, candidate_registry)`. These helpers return
values; the author explicitly writes the candidate manifest. Native record hashes
are review inputs, not duplicated operational defaults.

Each source-review row has exactly `document_id`, `sha256`, `pages`,
`publication_context` and `review_notes`. Its pages must cover exactly the cited
passages of added/changed/removed records. A batch without affected source passages
uses an explicit empty ledger. Multiple citation roles on one page remain separate
uses. Extend `knowledge_pilot` membership in ascending PDF-page order, preserving
the relative order of existing uses and the exact three funding memberships.

Generate the candidate's six-field `sources` mirrors with
`project_candidate_sources(candidate_registry, explicit_labels)` from
`backend.knowledge_intake`. Supply every registered knowledge citation's label,
retaining existing labels. This reads the explicit candidate registry, not the
installed one; do not publish incomplete canonical files to make `--project` see a
new ID. Missing labels fail rather than acquiring invented text. Source metadata is
generated from shared ownership, not separately maintained in the knowledge file.

Each reason key is `DOMAIN.COLLECTION/ID`, such as
`knowledge.claims/claim:example` or `citations.consumers/knowledge_pilot`.
Coverage changes use `knowledge.metadata/coverage`. A review-date advance is
reported but needs no separate replacement reason. Missing or extra reason keys
fail; removal is never inferred from a missing record. Dangling dependencies must
be explicitly resolved in the same candidate.

Classify each claim as a requirement, strategy, guidance, project assumption or
bounded research gap. Keep applicability and limitations explicit. Configuration
values remain owner-resolved references. Keep complete issue groups together and
never choose a preferred interpretation implicitly. Availability remains unassessed
unless a separately scoped current-call review establishes it.

## Check and review

From the simulator directory in the existing Conda environment:

```powershell
python -m backend.knowledge_intake --check BATCH_DIR
python -m backend.knowledge_intake --review BATCH_DIR
```

Both commands read fresh inputs, validate the complete candidate, every citation
consumer and feature projection, the graph, native bindings and original PDF bytes
once per edition. They never write files, open projects, change loader paths,
perform Git operations or publish. They reject stale baselines, changed candidate
bytes/native records, unsupported data and failed reads. Current feature context
content/order must remain identical for `explorer_only`; an existing display change
requires a separately reviewed adoption change rather than a bypass flag.

Success prints deterministic version-1 JSON (exit 0). Expected failures print an
actionable error to stderr with no success/partial JSON (exit 1); invalid usage is
exit 2. Retain the candidate after failure, resolve the stated problem and retry.
Recapture a stale baseline only after reviewing concurrent changes, not merely to
make a stale proposal pass.

Review shows exact added/replaced/removed records and before/after dependency paths.
`null` on one side means the target did not exist in that snapshot. Citation checks,
actual evidence displays and manual review targets remain different effects.
Dependencies using an affected passage are review scope, not proof every dependent
feature changes. Unknown project/prose dependencies remain outside coverage.

## Publish deliberately

1. Review source wording, classifications, limitations, issue groups and the entire
   diff/report. Record the feature-adoption decision; these two batches deliberately
   expose new knowledge only in Explorer.
2. Stop the simulator. Rerun review and require the same reviewed fingerprints,
   candidate hash and complete report. Any change requires a fresh review.
3. Apply both matching candidate files as one repository change; preserve unrelated
   work. The intake commands intentionally provide no write/publish operation.
4. Run both existing knowledge checks, projections and relevant compatibility tests
   before restarting. A failed publication is an explicit editing/recovery task;
   the runtime never repairs it or substitutes an old successful result.
5. Archive `batch.json`, `review.json` and human-readable `review.md` under
   `intake/BATCH_ID/`. State the baseline revision/working-tree context and outcome.
   These are historical receipts; do not edit them as current knowledge or archive
   complete candidate datasets. A receipt is not a reusable live candidate.
6. The next batch starts from the newly published hashes. Reusing a published batch
   fails as stale. Feature sections still use their explicit memberships; Explorer
   additions never adopt scientific rules or update project snapshots.

The LIFE and kermes oak receipts demonstrate this sequence. Record query timings,
payload sizes, files/records touched and remaining duplicate authoring work after
each expansion. Use that evidence before proposing modular storage, a database,
semantic search or extraction automation.
