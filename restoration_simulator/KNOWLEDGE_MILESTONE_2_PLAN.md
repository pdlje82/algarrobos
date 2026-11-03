# Algarroba shared citation implementation plan

Prepared 3 November 2026 against revision
`4d33d49c54702157e12e9be4d9cdb309595f7c24`. Status: implemented and verified
3 November 2026. The three library hashes still match the
[Milestone 1 audit](KNOWLEDGE_OWNERSHIP_AUDIT.md).

Establish one authoring authority for five FUND-008 citation uses shared by three
funding libraries. Retain the existing source objects as checked projections so
public responses, saved library hashes, labels and project behaviour stay compatible.
The delivery consists of a validated registry, a small Python service, read-only
commands, three consumer checks, tests and documentation.

## Scope and compatibility contract

The canonical metadata comprises `document_id`, `sha256`, `page`, `role` and
`verified_on`. Existing feature `label` values remain separate editorial inputs.
Keep all three scenario JSON files byte-for-byte unchanged during this extraction,
including the concept labels containing the known encoding defect. Do not normalise
labels or change source order, library IDs, versions, APIs or save formats.

| Consumer ID | Existing source collection | Shared PDF pages |
| --- | --- | --- |
| `selection_guidance` | `scenarios/funding-selection-guidance-v1.json` | 120, 121, 122, 123, 124 |
| `project_concept` | `scenarios/funding-project-concept-v1.json` | 120, 121, 122, 123, 124 |
| `delivery_plan` | `scenarios/funding-delivery-plan-v1.json` | 120, 121, 123, 124 |

These are five canonical uses and 14 feature occurrences. Pages 123/124 remain
included because the delivery library jointly covers routes 3.4/3.5. The core
funding catalogue's same-page citations have different uses and remain outside
this extraction. Designer evidence, ecological assumptions, the other citations,
publication metadata, source-edition dispatch and graph visualisation remain in
their existing authorities and later work.

## Registry and Python interfaces

### Canonical records

Add `knowledge/citations-v1.json` and `knowledge/README.md`. The registry has exactly
five required top-level fields: integer `version: 1`, `editions`, `passages`,
`citations` and `consumers`. All maps are nonempty. Unknown fields and unsupported
versions are errors; there are no optional fields, inferred values or aliases.

FUND-008's existing edition hash is
`48c3cc653a5f38bae9480009873bfdb35f26133f513e8d2894d872216ccf6399`.
The edition ID is `FUND-008@` followed by that complete hash. In the table below,
`E` denotes that exact complete edition ID and is expanded in the stored JSON.

| Map | Key and required value fields |
| --- | --- |
| `editions` | Key `E`; value `{document_id, sha256}` matching the app document registry. |
| `passages` | Five keys `E:pdf:N`, for N = 120 through 124; each value `{edition_id, page_basis, page}`, with `edition_id: E`, `page_basis: "pdf"` and integer page N. |
| `citations` | Five keys `FUND-008-pN-route-requirements`; each value `{passage_id, role, verified_on}`, pointing to `E:pdf:N`, with role `route requirements` and date `2026-11-01`. |
| `consumers` | The three consumer IDs above; each value contains only `citation_ids`, an ordered list of its mapped citation-use IDs in ascending PDF-page order. |

Validate nonempty string IDs, canonical edition/passage key construction, lowercase
64-character SHA-256 strings, real ISO `YYYY-MM-DD` dates and positive integer
pages within registered bounds. Booleans are not valid versions or page numbers.
Reject duplicate keys, duplicate consumer memberships, dangling references and
unreferenced edition/passage/citation records. A citation may serve several consumers;
a passage may support distinct citation uses with their own role/review date.

Reuse `configuration.read_json` for duplicate-key detection and `keys` for closed
objects. Resolve document metadata from `documents.catalogue`; keep filenames,
titles, page limits and printed-page mappings in that existing authority.

### Service boundaries

Add `backend/knowledge_citations.py`, exposing:

- `validate_registry(data)`: validate the complete registry against registered
  document metadata and return the validated data without changing it.
- `load_registry()`: read the required registry and validate it on each call.
  Do not cache failures or retain a stale successful registry for recovery.
- `project_sources(consumer_id, labels)`: require labels for exactly that consumer's
  registered citation IDs; return a new ordered map of six-field source objects
  `{document_id, page, label, role, sha256, verified_on}`. Preserve labels verbatim.
- `validate_consumer_sources(consumer_id, sources)`: require every declared shared
  use, check its six-field shape/label and compare its five metadata fields with
  the canonical projection. Return no substitute data and mutate neither input.
- `main(argv=None)`: implement the commands below and return their exit status.

Use a fixed consumer-to-file dispatch map for the three existing library paths.
The registry supplies memberships and metadata; it does not supply executable
handlers or arbitrary file paths. Reject unsupported consumer IDs and require the
registry's consumer keys to match this supported set.

During mirror validation, the canonical citation IDs present in a consumer's full
source map must equal its declared membership. Additional sources that are outside
the canonical registry remain subject to that feature's existing validator; they
are not skipped validations or automatically enrolled into shared ownership.

The service may import configuration, documents and domain error helpers, but must
not import the three consumer modules or depend on `funding.checked`. Use the
existing `Invalid` type for registry/projection failures, with registry or consumer
file, record ID, failing field and the corrective action in the message. Preserve
explicit document-service errors. Do not turn exceptions into empty maps, stale
citations, alternate files or successful responses.

Normal library loads validate document metadata, following the existing feature
boundary. Actual PDF-byte verification remains at document opening and in the
explicit `--check` command; do not hash a 2.6 MB PDF on every concept validation.

## Commands and consumer integration

Both commands run from `restoration_simulator` in the existing Conda environment.

| Command | Exact behaviour |
| --- | --- |
| `python -m backend.knowledge_citations --check` | Validate the registry, read all three libraries with `read_json`, validate their shared mirrors, and call `documents.verified_file` once per unique registered edition using its expected hash. Print a success summary only after all checks pass. |
| `python -m backend.knowledge_citations --project CONSUMER_ID` | Validate the registry, read the selected library and require its registered IDs and labels. Emit only the canonical six-field source map for those IDs as UTF-8 JSON to stdout. Retain the library's labels. |

Choose exactly one command. Exit 0 indicates success, exit 1 a configuration,
projection or document-verification failure, and exit 2 invalid command usage.
Expected failures identify the file/ID on stderr and emit no success text or
partial JSON on stdout. Unexpected programming errors remain failures.

`--project` deliberately does not require the five old metadata fields to match:
its purpose is to preview the records needed after an explicit canonical edit.
It still rejects missing IDs/labels, malformed input, unknown consumers and an
invalid registry. This preview is never a runtime recovery path. Neither command
writes scenario files, the registry, documents or project state.

Integrate checks immediately after existing raw-library validation and before
returning data from:

- `funding_selection_guidance.describe` for `selection_guidance`.
- `project_concepts.guide` for `project_concept`.
- `delivery_plans.library` for `delivery_plan`.

Keep raw feature validators and historical bundle evaluators unchanged. Existing
HTTP handlers expose `Invalid` as an actionable 422 response; document-service
HTTP errors keep their existing statuses. The three guide endpoints retain their
current response shapes. Existing UI error/retry handling retains drafts; no new
frontend controls or API endpoints are needed.

## Implementation order and acceptance checks

1. Capture the three current library contents/hashes, revision, relevant working-tree
   changes and save/source fingerprints in ignored test artifacts. Confirm the hash
   values below before changing code. If relevant inputs differ, stop and reconcile
   the edition change explicitly instead of updating expected hashes to make tests pass.
2. Implement the registry, service and commands. Document identity, ownership,
   check/project behaviour and the reviewed update procedure in `knowledge/README.md`.
   Future metadata edits start in the registry; regenerated mirrors belong in the
   same reviewed repository change and must pass checks before publication.
3. Add `tests/test_knowledge_citations.py`, then wire the three consumer checks.
   Keep the runtime source JSON files unchanged and prove the new dependency is
   actually consulted by each consumer.
4. Run targeted tests, both commands, all backend/frontend tests and the production
   build. Inspect the final diff and fingerprints. Do not run browser mutation
   workflows against the live app, install dependencies or alter existing saves.
5. Update the roadmap and fallback audit with exact scope, commands/results and
   remaining duplication. Mark Milestone 2 complete only after acceptance evidence
   passes; leave Milestones 3–6 pending. This plan's implementation stops there.

### Required tests

- Verify exact five-use/three-consumer membership, expected projection ordering,
  distinct display labels, and nonmutation of registry, source maps and labels.
- Reject missing/corrupt/unreadable registry files, duplicate keys at nested levels,
  unknown versions/fields/consumers, absent/extra labels, missing memberships,
  dangling references, invalid dates/pages/types, edition/hash mismatches and drift
  in each canonical field. Use temporary files and mocked I/O failures.
- Prove all three live consumers fail when the registry is absent or their mirrors
  drift. Read-only endpoint failures must preserve an uninitialised store and must
  not create a save. Restore the dependency and verify explicit retry succeeds.
- Check CLI stdout/stderr and return statuses. `--check` must fail for a missing or
  changed PDF and for drift in any consumer. `--project` must be able to preview
  canonical records when only old mirrored metadata has drifted, without editing
  that file; missing labels must still fail.
- Use existing isolated concept/delivery fixtures to verify old guide hashes still
  validate, reports and citations match, import/export succeeds, and a failed
  dependency read during a save or transfer publishes no mutation. Assert unchanged
  persisted bytes and drafts, then verify retry through the normal API succeeds.
- Assert each live loader returns data deeply equal to its original raw library,
  with these unchanged `funding.digest` values:

  | Resolved library | SHA-256 |
  | --- | --- |
  | Selection guidance | `4a55f602ea8279264afcb8c3135908e4b96ffe2d3b9017559dcec95ae660c03d` |
  | Project concept guide | `19d260ade0296e99dc2ffc678ae93f49b513f45d959253bd20baddcd4fc7d542` |
  | Delivery planning | `bbfd549874c6f0152c7a5b13ae5edef5e43a416785ea3afd72ea44b43faa6ca2` |

Run `python -m unittest discover -s tests -p test_knowledge_citations.py -v`, followed
by `python -m unittest discover -s tests -v`. From the frontend directory run
`npm.cmd test` and `npm.cmd run build`. Record environment versions, exact commands,
exit statuses, totals and warnings. The Milestone 1 baseline was 292 backend tests,
107 frontend tests and a successful build with an existing bundle-size warning;
those earlier results do not establish that this implementation passes.

Completion requires unchanged library files/hashes, meaningful passing failure-path
tests, successful command checks, passing existing suites/build and preservation
of source documents, existing saves and unrelated work. No save migration or user
rule-adoption step is introduced because resolved library content remains unchanged.

## Remaining work after Milestone 2

The pilot leaves 75 other shared guidance/concept citations, six concept-only EDL
uses, duplicated publication metadata, guide/statistical sources, core funding
citations, Designer evidence and narrative research outside shared ownership.
The known label encoding defect and general support for older source/guide editions
remain separate compatibility work. Milestone 3 will address contextual claims and
relationships for AL20 3.4, carob and MR2; this extraction does not establish them.

## Implementation results

Completed 3 November 2026 against revision
`4d33d49c54702157e12e9be4d9cdb309595f7c24` plus this change. The starting working
tree already contained the roadmap link and this implementation plan; those
documents were preserved and updated. Unrelated irrigation research appearing
during implementation was left untouched.

The registry contains one FUND-008 edition, five PDF passages, five citation uses
and three consumers. `backend/knowledge_citations.py` validates the complete
registry, projects sources and rejects unequal consumer mirrors. The three live
loaders now invoke that check after their original full-library validation.
No raw feature validator, frontend contract, HTTP route, historical evaluator,
scenario file, dependency or save schema changed.

The three live libraries are deeply equal to their original data and retain the
exact baseline hashes listed above. Their files are byte-for-byte unchanged.
Both existing display-label forms, including the known concept-label encoding
defect, remain intact. Integrity checks also matched all 58 existing library
PDF/PNG files and all eight existing save JSON files.

### Verification commands and outcomes

All commands used `conda run -n restoration-simulator --no-capture-output`.
Times are Europe/Berlin, UTC+01:00 on 3 November 2026. Backend commands ran from
`restoration_simulator`; npm commands ran from its `frontend` directory.

| Command | Time | Outcome |
| --- | --- | --- |
| `python -m unittest discover -s tests -p test_knowledge_citations.py -v` | 13:24:37–13:24:47 | Exit 0; 19 tests passed, runner duration 6.459 s. |
| `python -m unittest discover -s tests -v` | 13:26:19–13:30:46 | Exit 0; 311 tests passed, runner duration 261.632 s. |
| `npm.cmd test` | 13:26:19–13:27:14 | Exit 0; 107 passed, zero failed/skipped/cancelled/todo. |
| `npm.cmd run build` | 13:28:06–13:28:26 | Exit 0; Vite built in 8.32 s. Existing chunks-over-500-kB warning remains. |
| `python -m backend.knowledge_citations --check` and the three `--project CONSUMER_ID` commands | 13:27:50–13:28:07 | All four exit 0; check verified five citations, three consumers, 14 mirrors and original PDF bytes. Each parsed projection equals its original consumer source records. |

Environment: Python 3.12.16, Node.js 22.23.4, npm 10.9.9, FastAPI 0.120.0,
HTTPX 0.28.1 and Uvicorn 0.38.0. No packages were installed or upgraded.
Raw logs, timings, parsed command outputs and before/after integrity records are
local ignored artifacts under `test-artifacts/knowledge-citations/`; these durable
results do not require those files to exist in a fresh clone.

The new tests exercise all three dependency checks, missing/corrupt/unreadable
configuration, unsupported versions/fields, bad identities/dates/pages, orphaned
records, metadata drift, exact projection ordering and label preservation. CLI
tests verify error statuses and empty success output on failure, original-byte
checks, explicit preview of drifted metadata and UTF-8 JSON output. Isolated API
tests prove no save is created by failed reference reads, failed saves/transfers
preserve stored bytes and local drafts, explicit retry succeeds, and old concept
and delivery hashes, reports and export/import remain compatible. No browser
mutation workflows or live-project API calls were used.

Milestone 2 is complete. Milestones 3–6 remain pending, with the remaining evidence
and edition limitations described above.
