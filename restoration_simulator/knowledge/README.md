# Shared citation metadata

`citations-v1.json` owns 14 citation uses across four registered document editions
and four consumers. The original five FUND-008 uses and their 14 checked mirrors
in three funding libraries remain unchanged. The connected pilot reuses two of
those uses and adds nine handbook, strategy and published-call uses, giving it
11 source records. The registry now checks 25 mirrors in total. Other evidence
retains its existing authority.

The registry connects an exact document edition to a PDF passage, a citation use
and its consumers. Edition IDs are `document_id@sha256`; passage IDs append
`:pdf:page`. The app's existing [PDF registry](../scenarios/documents.json) still
owns filenames, titles, page limits, aliases and printed-page mappings. The shared
registry references it rather than maintaining another document catalogue.

## Contract and ownership

Schema 1 requires `version`, `editions`, `passages`, `citations` and `consumers`.
Each edition has `document_id` and `sha256`; each passage has `edition_id`,
`page_basis` and `page`; each citation use has `passage_id`, `role` and `verified_on`.
Each consumer has an ordered `citation_ids` list. Unknown fields, unsupported
versions, duplicate keys/memberships, invalid dates/pages, unresolved references
and unreferenced records fail validation. Only explicit PDF page positions are
supported in this first schema. A verification date belongs to its citation use,
not to every use of that page.

The backend's fixed consumer dispatch maps these IDs to source files:

| Consumer ID | Existing feature library |
| --- | --- |
| `selection_guidance` | `scenarios/funding-selection-guidance-v1.json` |
| `project_concept` | `scenarios/funding-project-concept-v1.json` |
| `delivery_plan` | `scenarios/funding-delivery-plan-v1.json` |
| `knowledge_pilot` | `knowledge/connected-pilot-v1.json` |

Restart any already-running Python backend after applying a consumer-registration
change so its registered dispatch and registry agree. A process using an older
registration rejects the expanded registry explicitly.

For registered uses, `document_id`, `sha256`, `page`, `role` and `verified_on` in
the feature source records are generated mirrors. Their `label` fields remain
feature-owned editorial text. Every live loader validates its mirrors against
the shared registry after the existing full-library validation. Mismatches are
errors with source ID/field context; loading never repairs a file or substitutes
the inline record for failed shared data. Each load reads the required registry;
there is no stale successful cache used as recovery.

## Read-only commands

Activate the existing `restoration-simulator` Conda environment and run these
commands from `restoration_simulator`:

```powershell
python -m backend.knowledge_citations --check
python -m backend.knowledge_citations --project selection_guidance
python -m backend.knowledge_citations --project project_concept
python -m backend.knowledge_citations --project delivery_plan
python -m backend.knowledge_citations --project knowledge_pilot
```

`--check` validates all four sets of mirrors and verifies each original PDF
edition's bytes once through the existing document service. It reports success
only after every check passes. Ordinary library loads check registered metadata;
the viewer also verifies original bytes when opening a document.

`--project` emits a JSON source map for the selected consumer's registered shared
IDs. It retains that consumer's exact labels and generates metadata from the
validated registry. It deliberately permits different old metadata values so a
reviewer can preview the changes needed after a canonical edit. Identities,
six-field record shape and nonempty labels must still be present. This explicit
preview does not make a failing normal load successful.

Neither command writes any files. Success returns exit 0, expected configuration
or document failures return 1, and invalid usage returns 2. Errors go to stderr;
failed operations emit no success text or partial JSON to stdout.

## Reviewed update procedure

1. Identify and review the unchanged original document edition and passages.
   Register actual document additions through the [library workflow](../../doc_library/CATALOG.md).
2. Edit canonical citation metadata in this registry. New consumer integrations
   require an explicit backend registration and tests, rather than executable
   configuration or an inferred file path.
3. Run `--project` for every affected consumer. Review its JSON and explicitly
   update only the registered mirrored metadata in the same repository change.
   Retain feature labels and all unregistered sources unless a separate editorial
   or content change has been authorised.
4. Run `--check`, the targeted citation tests and affected domain/compatibility
   tests. Publish only when the canonical metadata and all declared mirrors agree.
5. Before changing a resolved library hash, provide a separate retained-edition
   and migration/adoption plan. Existing concepts and delivery records require
   exact library hashes; even a label correction can change them.

## Compatibility and remaining work

This initial extraction preserves all three feature JSON files, their labels,
library hashes, public responses and saved formats. In particular, the existing
concept-label encoding defect remains unchanged. No scoring rule, scientific
assumption, plant choice, quantity, price or project observation is altered.

The other 75 shared guidance/concept citations, six concept-only EDL uses,
publication metadata, guide/statistical sources, core funding citations, Designer
evidence and research prose remain outside shared metadata ownership, apart from
the explicitly registered pilot passage uses. General support for older
source/guide editions and the visual graph explorer remain later work.
See the [implementation plan](../KNOWLEDGE_MILESTONE_2_PLAN.md) and
[ownership audit](../KNOWLEDGE_OWNERSHIP_AUDIT.md) for these boundaries.

## Connected knowledge pilot

`connected-pilot-v1.json` contains 12 curated claims, 11 typed entities, nine
explicit relationships, two unresolved issues and 19 registered source/feature
bindings. It connects AL20 3.4, carob, MR2 and their evidence. Its claim categories
distinguish official requirements, strategy content, technical guidance, project
assumptions and bounded research gaps. Each claim retains its applicability,
review status/date and limitations.

Programme, route, call, approach, palette and vegetation-series types remain
distinct. The published call is explicitly `not_assessed` for current availability.
The example activity and its links are labelled project illustrations; they are
not saved project records, selected scoring answers or eligibility findings.
The two stock-size descriptions remain separate claims with an unresolved
`source_tension`; there is no inferred preferred container or stock default.
The water gap is restricted to the inspected local case passages and does not
imply zero irrigation or a literature-wide absence of evidence.

Designer values are resolved by registered adapters from the current central
rule bundle. The claim text does not maintain another numerical density or
geometry default. Each returned configuration value is labelled a project
assumption with its current ruleset ID. Saved designs may retain different
snapshots; the pilot does not read or change them. Source adapters select stable
domain records; no arbitrary file paths or executable handlers come from data.

Run the read-only query commands from `restoration_simulator`:

```powershell
python -m backend.knowledge_graph --check
python -m backend.knowledge_graph --search Johannisbrotbaum --type species
python -m backend.knowledge_graph --entity species:carob
python -m backend.knowledge_graph --impact-claim claim:mr2-runoff-capture
python -m backend.knowledge_graph --issues
python -m backend.knowledge_graph --issues --for-entity species:carob
```

`--impact-passage` takes the exact edition-qualified passage ID returned in
query evidence, for example
`FOREST-002@75262e343d4d1e2f1d981b08c9e36a73c9a2c5e9130d14af951124d4cc5d84b8:pdf:134`.
It rejects passages outside the registered pilot rather than presenting an empty
result as complete impact analysis.

The matching Python functions are `find_entities(text, entity_type=None)`,
`entity_details(entity_id)`, `impact(target_kind, target_id)` and
`issues(entity_id=None)`. An absent type filter searches all registered entity
types; an absent issue filter requests all pilot issues. Search uses Unicode
NFKC normalisation and case folding. It returns all matching candidates and an
explicit ambiguity flag. A valid search with no matches returns an empty list;
an unknown identity, invalid query or failed data load is an error.

Search, detail, issue, check and feature-evidence outputs use response version 1;
impact outputs use version 2. All include dataset ID/hash, review date and explicit
`registered-pilot-only` coverage with exclusions. The hash includes the dataset,
validated citation registry and resolved authoritative bindings. Results are
deterministic for the same inputs; a changed current binding changes the hash.
All files are read afresh for each query. The resolver reuses validated source
snapshots only within that single load, never after a later read fails.

Impact output separates `citation_validation_dependency`,
`shared_evidence_dependency` and `review_required`. These identify checked citation
mirrors, actual evidence display contexts, and manually curated review targets for
retained wording/rules/calculations. Paths through displayed call entities and
relationships are included even when no claim cites their passage. Version 2 also
includes the feature-consumer registry hash. No impact result selects rules,
adopts evidence or updates a project.

The pilot validates closed schema fields, reference identities, endpoint types,
structural programme/palette memberships, configuration bindings, review states
and coverage declarations. All unresolved claims require explicit issue records;
unreferenced sources/bindings are rejected. The check additionally verifies original
PDF bytes. Commands emit deterministic UTF-8 JSON only after success, use exit
statuses 0/1/2 as above, and never write application or project state. The bounded
feature integration is described below; graph visualisation remains Milestone 5.

To curate this bounded pilot, first resolve an existing native identity and review
the exact local source edition/passages. Update citation metadata and its explicit
projection using the procedure above. Edit contextual claims and relationships
with a real review date, limitations and unresolved issues where appropriate.
Register any new adapter or relationship type in Python with validation and tests;
data cannot invent an executable binding. Configuration assumptions continue to
reference their owners. Review the declared feature targets, run both checks and
the relevant regression tests, and inspect the diff before accepting the update.
Changing a registered claim updates current evidence on its next successful fetch;
it does not replace retained feature text or adopt rules into a saved design.

The [Milestone 3 implementation record](../KNOWLEDGE_MILESTONE_3.md) contains the
curated source contexts, verification results and remaining coverage gaps.

## Evidence sections in existing features

`feature-consumers-v1.json` registers four feature consumers and six widgets:
`selection_guidance/route-34`, `project_concept/restoration-34`,
`delivery_plan/novelty-34`, `delivery_plan/publication-34`, `designer/mr2` and
`designer/carob`. The first two display the three funding/strategy claims; the
delivery widgets display their individual requirement. The MR2 guide and carob
inspector display their eight and seven explicitly registered claims. Together
they cover all twelve claims, eleven entities and nine relationships.

Schema 1 requires `version`, `dataset_id` and `consumers`. Each consumer contains
`context_order` and `contexts`; each context has one `binding_id` and ordered
`claim_ids`, `entity_ids` and `relation_ids`. Contexts/native adapters must match
registered Python widgets. Subjects, relation endpoints and supporting claims must
be included, and an unresolved issue cannot display only part of its claim group.
Adding a claim to the corpus never silently registers it for feature adoption.

The Python function `feature_evidence(consumer_id)`, HTTP endpoint
`GET /api/knowledge/feature-evidence/{consumer_id}` and CLI operation below expose
the same read-only projection. Supported IDs are the four consumer names above:

```powershell
python -m backend.knowledge_graph --feature-evidence selection_guidance
python -m backend.knowledge_graph --feature-evidence project_concept
python -m backend.knowledge_graph --feature-evidence delivery_plan
python -m backend.knowledge_graph --feature-evidence designer
```

The version-1 response adds `consumer_id`, `consumer_registry_hash`,
`context_order` and `contexts` to the dataset header. Contexts contain their native
binding, ordered resolved claims/entities/relationships and complete issues. The
separate registry hash covers widget membership and ordering; the original dataset
hash definition is unchanged. Normal loads validate metadata; `--check` additionally
validates the feature registry and original PDF bytes. No project is required.
The new registry is required for feature and impact queries, not for independent
search, detail or issue queries. Existing owner loaders never call the graph.

Current evidence sections start collapsed and load lazily, sharing a successful
projection per consumer within the mounted app session. Refresh checks the latest
data. Failed refreshes clear evidence and show an actionable Retry; late abandoned
responses cannot replace newer results. Surrounding drafts and controls are not
reset. Existing help, reports and exports remain independently retained content.

The UI distinguishes requirements, strategy, guidance, assumptions and gaps;
shows limitations and checksum-qualified PDF pages; and keeps both stock contexts
unresolved. The call is not assessed for current availability. The activity and
its connections remain illustrative. Designer panels identify current reference
values separately from retained rule IDs, saved starting assumptions and entered
plant quantities. Historical missing defaults/geometry remain explicitly unknown.
Island sketch width/length are not excavation or planting depth.

For changes, edit the explicit registration and matching registered widget/tests
in the same change, run the projection/check commands and inspect impact version 2.
Keep the citation registry, feature libraries and rule bundles unchanged unless a
separate change explicitly provides their compatibility/adoption contract. The
[Milestone 4 implementation record](../KNOWLEDGE_MILESTONE_4.md) records validation
and remaining duplication. Standalone educational explorers, other routes and
unregistered research remain outside this integration.

## Knowledge Explorer

The project-independent Knowledge Explorer reads the same pilot through
`explorer_graph()` and `GET /api/knowledge/explorer`. The version-1 snapshot
contains dataset identity/hash, review date, coverage, `consumer_registry_hash`,
`entity_types`, `relation_types`, ordered `nodes`, ordered `edges` and complete
`issues`. Source documents are taken from the validated load's native document
authority; they are not separately maintained explorer metadata. The dataset hash
still covers exactly the pilot, citation registry and resolved bindings.

The current projection has 34 nodes (11 entities, 12 claims, 11 passages) and
52 edges (9 native relationships, 22 subject links, 14 claim citations and 7 entity
citations). Native IDs are retained. Derived IDs are `edge:` followed by the
SHA-256 of Python's UTF-8 `json.dumps([kind, source, target], sort_keys=True,
ensure_ascii=False, allow_nan=False)` output. Source links say **cites**, which
does not establish proof. Relationship provenance remains in relationship details;
it never creates an inferred entity-to-source connection.

Passage nodes retain the complete registered document description, PDF page and
all pilot citation uses for that passage, including their distinct roles, labels,
verification dates and edition checksums. A passage and its citation uses remain
different identities, even when several uses refer to the same page. No corpus
records, feature memberships or source documents are created by this projection.

```powershell
python -m backend.knowledge_graph --explorer
python -m backend.knowledge_graph --check
```

The check validates the graph in addition to the existing checks, retaining its
original response fields. CLI status 0 means success, 1 configuration/document
failure, and 2 invalid usage. Commands never write application data. HTTP also
exposes existing search semantics at `GET /api/knowledge/search?text=MR2` (optional
`entity_type`) and version-2 usage at
`GET /api/knowledge/impact?target_kind=claim&target_id=claim:mr2-runoff-capture`.
Unknown or repeated parameters, unsupported requests and unknown targets fail.
These endpoints never open project state.

The frontend owns only transient presentation: selected topic/record, explicit
expansions, filters, topic history, layout and zoom. Lanes and Network share that
state; List exposes the same records/actions and is the automatic default below
900 px. Expansion uses actual registered adjacency; collapse retains records
reachable through another expanded branch. Filters never create bypass edges.
Selecting details does not recenter the topic; centering is explicit.

Graph data loads only on entry. Refresh clears the unavailable snapshot, preserves
the view inputs and offers Retry on failure. Search and lazy Where used responses
must agree with the graph's dataset identity/hash; usage must also agree with its
feature-registration hash. Mismatches require Refresh rather than mixing editions.
Abandoned requests cannot replace newer results. Missing requested records require
an explicit topic choice/reset. PDF viewing retains checksum/page verification
and returns focus to its opening link.

Entering/returning bypasses editing guards and keeps the editing components mounted.
An in-memory gate suspends unsubmitted planning autosaves, demonstrator autosaves,
concept reports and Designer commands. Funding keeps its existing inactive policy.
Submitted operations settle; further queued writes wait. Returning restores the
originating control and the existing editing policy. No preference, URL route,
project field or persistence format is added. See the
[Milestone 5 record](../KNOWLEDGE_MILESTONE_5.md) for acceptance and limitations.
