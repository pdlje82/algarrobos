# Algarroba knowledge ownership audit

Milestone 1 completed on 3 November 2026. Baseline revision:
`9047aa81a830df90c6267de397bdb9963c937777`.

Algarroba has validated domain catalogues and explicit historical snapshots. Its
main knowledge-management weakness is independently maintained evidence metadata
and narrative connections across features. The first refactor should establish
shared ownership of five funding citations while preserving their existing
resolved representations and library hashes. The connected ecological pilot and
visual explorer remain later milestones.

This audit maps local repository structures and their use. It does not establish
current funding availability or re-evaluate every scientific claim. No internet
research, document imports, application changes or live-project mutations were
performed. The governing boundaries are in [AGENTS.md](../AGENTS.md), the
[fallback audit](FALLBACK_AUDIT.md) and the
[Designer rule instructions](design_rules/README.md).

## Inventory and authority matrix

Paths below are relative to `restoration_simulator/` unless prefixed with `../`.
An authoring authority is the place where a maintained fact or policy is edited.
A projection derives information for a consumer. A historical snapshot deliberately
retains the meaning of an earlier edition. Identical content in the last category
is not an independently maintained duplicate to remove.

### Sources and research

| Records and identity | Current authority | Validation and consumers | Version and update procedure |
| --- | --- | --- | --- |
| Library inventory; permanent `GROUP-NNN` IDs | [Library catalog](../doc_library/CATALOG.md), original document bytes and `RENAME_LOG.csv` | Human catalogue workflow; machine PDF registration covers a subset. Research and later curation use the catalog; documents are not automatically ingested. | Allocate the next unused ID, preserve original bytes, register contents/status and verified metadata; retain rename/checksum history. The catalog is a human inventory, not the PDF-serving schema. |
| App PDF metadata; document ID, SHA-256, aliases and page mappings | [documents.json](scenarios/documents.json): 36 PDF records | `backend/documents.py:validate_catalogue`, `record`, `verified_file`; `frontend/src/documentLibrary.js` imports the same JSON and validates it. Document APIs, `DocumentLink` and `DocumentViewer` consume it. | Catalogue schema 1; one unique current record per document ID. Updates require matching unchanged files, checksums and explicit mappings. Restart/rebuild affected consumers when registration changes. |
| Designer source editions; source-register ID, filename and SHA-256 | [Designer sources](design_rules/sources.json): five records | `designer_v1.references`, `source_file`, current bundle validation; Designer reports and source opening. | Embedded in versioned rule bundles. `FOREST-002/003/004` and `NIJAR-003` match library IDs; `DRYLAND-POSTER` is an internal ID for an unverified PNG, not an allocated catalogue ID. Follow the ruleset/changelog/adoption workflow. |
| Funding citation uses; library-local source IDs or inline citations | Source maps in selection guidance, project concepts, delivery planning, guides and statistics; inline records in `funding.json` | Feature validators check document/page/hash as described below. Citations are emitted to UI and reports. | Different schemas coexist: inline entry citations have five fields; scoring/guidance uses add `verified_on`; route guides also describe issuer, date, URL and note. Update these current sources explicitly; frozen assessment bundles retain their copies. |
| Source publication metadata and downloads | `publications` in selection guidance and project concepts; guide source records; EDL `source` | Feature validators check identity/hash and URL shape; reports construct page links. | Five publication records are independently duplicated between guidance and concepts. They are outside the first five-citation extraction. URLs already in the repository were not re-verified online. |
| Research syntheses, listening texts, companion assets and proposals | Library Markdown/TXT files and their catalogued companion directories | Human source review; selected information is manually curated into app records. LEARN-015 is directly displayed by a frontend component. | These are evidence/learning inputs, not automatic operational configuration. Store additions through the cataloguing workflow; implementation adoption requires the relevant domain workflow. |

At inspection, the catalog described **55 library entries**: 39 PDFs, seven
research/overview Markdown documents, five listening/proposal texts, three supplied
PNG illustrations and one generated poster collection. Companion formats and
images belong to their parent entries. The app's 36-PDF registry excludes the
three stored PDFs FUND-011 and POLICY-001/002. This is an integration boundary,
not evidence that those files are absent or that all library entries should be
served as PDFs.

| Research or learning records | Role and current integration |
| --- | --- |
| FUND-007 | Funding taxonomy, examples, source crosswalk and proposed fields. `funding.json.reference` names it; catalogue content was curated from it. It is not parsed at runtime and is not proof that all 99 entries have executable checks. |
| LEARN-002 and `catalog_history/` | Earlier learning taxonomy and research leads; historical orientation rather than the current inventory. The catalog explicitly distinguishes missing leads and stored files. |
| LEARN-005 | Planting-technique/checklist coverage and evidence gaps. Research reference, not a runtime technique registry. |
| LEARN-007/008, `carob-soil-research/`, `carob-restoration-guide/` | Carob establishment, nursery and mixed-model syntheses with source-qualified illustrations. The carob guide names LEARN-007/008; app educational JSON and assets manually curate selected material. No automatic Markdown-to-rule pipeline exists. |
| LEARN-009 | Dimension evidence and drawing assumptions for 23 taxa. Related current data lives in `design_rules/plant_dimensions.json` and `defaults.json`; source research remains separately readable. Suggested downloadable documents are not thereby added to the app registry. |
| LEARN-006 poster collection | Generated teaching prototypes and notes; the catalog labels them as research examples outside the app. They are distinct from the supplied dryland-systems PNG. |
| LEARN-010/011 and listening companions | AL20 strategy and forestry learning syntheses, with source notes and EPUBs; no runtime parser or rule import. |
| LEARN-012/013/014 and proposal/score companions | User goals, illustrative proposals, prospective scoring and application evidence packages. These remain research/planning artifacts; their scores or proposals do not become confirmed app state through cataloguing. Concurrent editorial work in LEARN-014 was preserved. |
| LEARN-015 | Recovery forecasting research roadmap. `frontend/src/RecoveryForecasting.jsx` imports the Markdown as raw text and as a download asset. It displays a planned-functionality notice; no forecasting engine or forecasting data model is implemented. |
| LEARN-001, supplied infographics and original technical PDFs | Learning context and source evidence. Some are served through explicit API aliases; selected plants, routes and techniques are curated into structured app data. A source link alone does not create structured claims or establish applicability. |

### Funding knowledge

| Records and identity | Current authority | Validation and consumers | Version and update procedure |
| --- | --- | --- | --- |
| Funding mechanisms/routes; entry ID such as `LEADER-AL20-3.4` | [funding.json](scenarios/funding.json): 99 entries in six families, including 48 `public` entries | `funding.validate_catalogue`, `assess`, `evaluate`; Navigator, visual dependencies, guides, overview and saved assessments | Catalogue version 3. Five AL20 rules are executable: 1.11, 2.6, 2.7, 3.4, 3.5. Editions 1/2 remain in separate files and evaluators. Review/adopt current catalogue explicitly; do not overwrite old bundles. |
| Programme membership; programme ID and entry IDs | `scenarios/funding-programmes-v1.json`: 80 programme/mechanism records | `funding_programmes.validate` requires every entry to have exactly one primary membership and checks sources; programme navigation and graph | Schema 1, current reference metadata. Update membership/introduction and validate coverage. This navigation grouping does not confer executable eligibility checks. |
| Guide-only research and source IDs | `scenarios/funding-guides-v1.json`: 92 guides and 95 sources | `funding_guides.validate` checks against assessment-derived research coverage and registered PDFs; `FundingGuide` and programme introductions | Schema 1, dated editorial library independent of saved scoring. Update current research with its unresolved questions and evidence status. Guide count differs from 94 entries with null `rule`, because coverage also recognises existing-resource calculations. |
| Amounts, requirements, questions, territory and scoring profiles | `funding.json.rules`, `.questions`, `.territory`, `.selection`; five route-specific branches in `backend/funding.py` | `funding.validate_catalogue`, `funding_selection.validate_rules/validate_answers/calculate`; Python computes results, frontend renders and collects answers | Selection schema 3, three aid-line profiles; earlier calculators are frozen. Existing calculation types include sum, employment and ratio. A new programme may need explicit registered behaviour rather than a copied AL20 branch. |
| Selection advice, recommendations and cited passages | [Selection guidance](scenarios/funding-selection-guidance-v1.json): 80 sources, 47 recommendations, 45 subcriterion nodes | `funding_selection_guidance.validate/describe`; `FundingSelectionGuidance`, selection editors and overview | Editorial schema 1 for routes 3.4/3.5; five publication records. Current content is loaded separately from the assessment's pinned scoring catalogue. Validate every applicable node and source when editing. |
| Territorial strategy needs and bindings; NPL and criterion IDs | `scenarios/funding-edl-v1.json`: 109 items, including 50 prioritised needs, ten topics, 14 bindings | `funding_edl.validate/validate_evidence`; EDL explorer, criterion supporting references, concepts and overview | Library ID `al20-edl-v1-2024-11-19`, schema 1, exact library hash in saved evidence. A new edition needs retention and an explicit adapter. Selecting a strategy reference does not award points. |
| Population/business lookup and geographical choices | `scenarios/funding-al20-statistics-v1.json`: 32 municipalities, four citations, six benchmarks; `funding_location_decisions.py` for decision metadata | `funding_statistics` validation/lookup and location-decision validation; route-specific provisional calculations | Schema 1 data; explicit population basis and manual overrides. Source year, lookup year, settlement population and chosen municipality are different inputs. Preserve provisional status and pinned source dependencies. |
| Concept starters, needs/criterion bindings and activity UUIDs | [Concept guide](scenarios/funding-project-concept-v1.json): 86 sources, 95 bindings, 59 templates | `project_concepts.validate_guide/validate/report`; concept editor, shared overview, reports and reviewed two-way transfer | Guide ID `al20-project-concept-v1`; saved concepts schema 1 store `guide_id` and exact `guide_hash`. The current loader requires that exact installed guide. Update requires preserving hash or introducing retained editions/adapters. |
| Delivery intentions, activity links and execution mapping | [Delivery library](scenarios/funding-delivery-plan-v1.json): six topics and four citations | `delivery_plans.validate_library/validate/review/execution_preview/apply`; delivery editor, reports and reviewed execution transfer | Library schema 1, ID `al20-delivery-plan-v1`; a plan stores exact library hash. Topic activity IDs are explicit dependencies. Changes to execution settings require review; unsupported custom mappings are blockers. |

### Ecology, presentation and project records

| Records and identity | Current authority | Validation and consumers | Version and update procedure |
| --- | --- | --- | --- |
| Species IDs, budgeting growth form and legacy presets | `scenarios/planting-catalog-v2.json`: 23 plants, three groups, four mixes | `planting.catalogue/resolve`; Designer, priced planting lists, order lists, planning and budgets | Catalogue 2; frozen catalogue 1 has 13 plants. Legacy `system`/quantity fields remain for compatibility and are not current Designer policy. Extend IDs explicitly and preserve replay meaning. |
| Presentation names and taxonomic wording | `scenarios/plant-names.json`: 23 records | `plant_names.validate/load`, frontend `plantNames.js`; names, aliases and labels | Schema 1; explicit verified/not-established name status and source URLs. Labels can change without rewriting immutable IDs or saved original explanations. |
| Current price defaults and saved prices | `scenarios/plant-prices.json`: 23 species and three custom growth-form defaults | `plant_prices.validate/snapshot/update`, `planting.resolve`; checklist and budget | Price schema 1; priced selections schema 2 retain entered unit costs/confirmation. Catalogue price updates are atomic and revision checked; they do not replace saved manual costs. |
| Communities, approaches, membership and treatments | `design_rules/vegetation_combinations.json` (eight), `rules.json` (16), `treatments.json` (one: `stone`) | `designer_v3.validate_bundle`, registered Python handlers and retained evaluator chain; checklist, generation, reasons and reports | Current manifest schema/engine 3, ruleset `algarroba-designer-2026-10-29-v5`. Follow rule validation, changelog and review/adoption. Series, MR approaches and poster presets remain distinct; a new mulch material needs a new stable type. |
| Drawing dimensions, density and placement | `design_rules/plant_dimensions.json` (23 taxa), `defaults.json` and registered v3 handlers | Bundle validation, `overlay_for`, `place_new`, `reconcile_positions`; evaluated drawing and species summaries | Dimension schema 2 within bundle; source ranges/context are distinct from representative drawing values. Current densities are carob 350/ha, other tree 50/ha, shrub 350/ha and grass 50/ha, explicitly project assumptions. A diameter does not establish spacing or suitability. |
| Educational methods, finca examples and planting guidance | `frontend/src/carob-planting-guide.json` and `restoration-models.json` | `plantingGuide.js:validatePlantingGuide`, `restorationModels.js:validateRestorationModels`; Planting and Model Explorers | Both schema 1; guide fixes carob and handbook page bounds, models define MR1/2/3. Shared model IDs and page references are present, but there is no shared claim registry or backend relationship service. Update source-qualified cards and asset provenance together. |
| Presentation assets and interaction settings | Plant illustrations/public asset manifests, `designer-help.json`, `designer-symbols.json`, interaction/planning UI JSON | Frontend validators and asset/unit checks; portraits, help, colour key, keyboard gestures and autosave timing | Independent presentation versions. These may map stable domain IDs but must not select species, alter compatibility or introduce ecological defaults. |
| Project scenario, form inputs and observations | `scenarios/default.json`, `defaults.json`; `backend/engine.py`, `demonstrator.py`; saved user records | Scenario/configuration/state/replay validators, record-specific basis fields and guarded transitions; Project and demonstrator workflow | Simulation schema 4, form schema 2 and defaults schema 1. User measurements, fictional/assumed records and observations retain their recorded basis. Ordinary execution does not replace missing required data with prefills. |
| Named designs, planning drafts and applied evidence | `designer_library.py`, `planning_draft.py`, `project_concepts.py`; project attachments | Attachment/draft validators, UUID identity, source/rules hashes and explicit transfer/merge previews | Named design library 1, current design draft 3, planning draft 1; separate revisions. Handoff copies a named design; saved alternatives and applied snapshots remain independent. Concept links use an agreed baseline and explicit conflict resolution. |
| Named funding versions, assumptions and adopted plans | `funding.py`, `funding_versions.py`; baseline facts, overrides, assessment bundle and immutable adopted plans | Draft/attachment validation and `funding.evaluate`; version switching, comparison and project funding | Current funding draft 4 and attachment 2; absence/null retain documented meanings. Duplication remaps concept/activity UUIDs. Workspace/rule upgrades require explicit review. |
| Persistence and history | `backend/storage.py`, frozen engines and migration helpers | `validate_export`, deterministic history validation, revision/request checks, candidate validation and atomic replacement | Current export envelope 8 around simulation 4. Envelopes 1–7 have explicit migrations/backups. Failed import or write preserves existing state. Repository default runtime save path is `data/active-project.json`; it was not opened through application APIs. |

## Trace one AL20 3.4

### Documents and passage locations

All locations below are one-based PDF page positions. Local source bytes for the
inspected passages matched their registered SHA-256 values.

| Source | Passage represented by the app | Local verification |
| --- | --- | --- |
| FUND-008, PDF 120–122 | Annex I, typology 3.4: demonstration definition, participation/publication obligations, beneficiaries, eligible costs and funding terms | Extracted these pages from the registered local PDF. Page 120 contains the start of 3.4 after the preceding typology; page 122 contains the 3.4 rate/cap. A page citation needs section context, not just a number. |
| FUND-008, PDF 38 | Article 22 minimum selection threshold | The local passage states a minimum of 60 points. The app stores this separately from score calculation and eligibility. |
| FUND-004, PDF 16 | Local line-3 CO.1.1/1.2/1.3 weights: 10, 12, 15, criterion cap 15 | The table is scanned; text extraction returns only a registration stamp. Visual inspection of the local page confirmed these rows. |
| FUND-010, PDF 219 | CO.1 alternatives are exclusive | Text extraction confirmed the one-, two-, and three-or-more-needs alternatives and their exclusive character. This is a combination rule, not the source of local point weights. |
| FUND-013, PDF 395, section 4.3 | NPL3: conserving, enhancing and disseminating rural natural/cultural heritage | Extracted the need and its strategy ranking. Its ranking value is not a grant-selection score. |
| FUND-005 PDF 1 and FUND-009 PDF 1 | Locally selected activities and published call | The 3.4 entry cites these registered editions; their full substantive content was not re-audited in this milestone. |

FUND-008's edition SHA-256 is
`48c3cc653a5f38bae9480009873bfdb35f26133f513e8d2894d872216ccf6399`.
FUND-004, FUND-010 and FUND-013 checksums remain in the shared app PDF registry;
the trace relies on those registered editions, not a fresh online legal check.

### Structured route through the app

1. `funding.json.entries[id=LEADER-AL20-3.4]` identifies rule `3.4` and six cited
   passages/uses. `rules[3.4]` holds rate 1, cap EUR 28,000 and threshold 60.
   `funding.assess` evaluates the route against entered facts; these configured
   values are not an award or eligibility determination.
2. `selection.routes[LEADER-AL20-3.4]` selects profile `line3`. CO.1 declares its
   exclusive choices and cited weights/combination rule. `funding_selection.calculate`
   uses the assessment's pinned bundle and the saved selection-policy version.
3. `funding-selection-guidance-v1.json.route_contexts` and `.nodes` hold current
   source-qualified advice. IDs such as `FUND-008-p120-route-requirements` resolve
   through the library's source map. Guidance is editorial content, independently
   loaded from the frozen calculation definitions.
4. `funding-edl-v1.json` identifies `NPL3`, page 395, classification
   `prioritised_need`. Its `bindings[CO.1.1]` permits the needs topic; a criterion's
   optional `edl_evidence` records library ID/hash and selected stable item IDs.
   Selecting NPL3 does not select CO.1.1 or change points.
5. `funding-project-concept-v1.json.bindings[NPL3]` points to template `restoration`
   and citation `EDL-395`. User activities have UUIDs, a template reference or
   explicit manual status, binding IDs and editable evidence/reference text.
   `delivery_plan.topics[*].activity_ids` separately links delivery intentions.
6. `project_concepts.report` and `funding_overview.scoring/describe` resolve the
   saved choices, linked activities, EDL references, missing details and sources.
   `FundingSelection`, `FundingSelectionGuidance`, `FundingEdl`, `ProjectConcept`
   and `FundingOverview` display these through `DocumentLink`. Markdown/print
   exports derive from backend report builders; publication URLs receive `#page=N`.
7. Funding-to-planning concept transfer uses identity, baseline, comparison hash,
   revision checks and explicit resolution. It does not transfer a score into an
   award or silently change the planting plan.

Structural connections include programme→route, route→profile, criterion→choice,
choice→passage, EDL binding→item, concept activity→binding, delivery topic→activity
and reviewed concept→planning copy. References to site novelty, technical merit
and the real evidence needed to justify an activity still require interpretation
or free text. There is no typed relation from a concept activity to Designer rule
`mr2`, species `carob`, or a shared scientific claim.

## Trace two carob and MR2

FOREST-002 is registered as a 168-page handbook with SHA-256
`75262e343d4d1e2f1d981b08c9e36a73c9a2c5e9130d14af951124d4cc5d84b8`.
Its cited running page numbers have explicit mappings to PDF positions. Local
pages 131–134 were extracted: runoff capture, low overall tree density with local
grouping, provenance/establishment guidance, and preparation/microcatchment/stone
mulch discussion are located there. Those passages do not supply the app's exact
generated coordinates or establish suitability for a particular parcel.

1. `planting-catalog-v2.json.plants[id=carob]` supplies the stable species identity
   and budgeting growth form. `plant-names.json` supplies Ceratonia siliqua and
   current presentation names. `plant-prices.json` supplies the current default
   price; saved priced selections keep their own explicit amounts.
2. `design_rules/rules.json[id=mr2]` registers effect `island_layout`, evidence
   `guidance`, FOREST-002 pages 131–134 and an illustrative-planning limitation.
   `vegetation_combinations.json[id=mr2_mix]` identifies `mr2`, carob as starter,
   and wild olive, lentisk, palmetto and kermes oak as optional members. Optional
   membership does not mean that every species is generated or suitable.
3. `defaults.json` declares actual application assumptions: growth-form densities,
   MR2 centre positions, rainfall-capture drawing geometry, plotting limits and
   placement policy. Carob's representative crown drawing diameter is 6 m;
   `plant_dimensions.json` retains the external 4–8 m reference range, context and
   the midpoint selection method. The range and selected drawing value are
   deliberately different representations, not contradictory observations.
4. `designer_v3.sources_for/wanted_species` reconciles approach/combination sources,
   manual choices and dismissals. Registered v3 handlers own density conversion,
   placement, retained positions and overlays. Current evaluation deliberately
   reuses the frozen v1 evaluator for integer pricing and conceptual MR features;
   this is an explicit adapter, not failure recovery or alternate-source selection.
5. The evaluation returns the draft, reasons, active rules, dimensions, placements,
   issues and a `ruleset_hash`. `designer_display.describe` adds read-only display
   facts. `SiteDesigner` and `DesignerPlan` render these evaluated results and
   export inputs/evaluation/source traces; React does not own ecological generation.
6. `designer_library.save` stores the complete evaluated draft and embedded bundle
   under a named design UUID. `planning_draft.handoff` copies the draft, origin
   UUID/name and ruleset hash into the independent planning source. Committed
   Designer evidence is retained in applied snapshots with draft, plan and hash.
   Saving a named alternative, handoff and final Project commit are distinct actions.
7. The educational `restoration-models.json.models[id=mr2]` separately describes
   method topics, source pages and finca examples. `restorationModels.js` validates
   it against the carob guide. The shared `mr2` spelling is not enforced as a
   cross-layer claim relationship. Source wording and conflicts are separately
   maintained in research, educational JSON and rule descriptions.

The educational references already retain the distinction between catchment and
planted area, conflicting stock descriptions and uncertain establishment water.
Those limitations must survive extraction into shared knowledge. Code comments
and the rule README distinguish historical v2 assumptions from current v3 values;
the active JSON is the authority for current numeric defaults.

### An activity connecting the two traces

An illustrative activity could be titled “Compare carob establishment with a
site-assessed rainfall-capture treatment and a reference treatment.” Its current
concept record can bind to `NPL3`, describe a comparison and monitoring protocol,
and link through delivery topics by activity UUID. A named Site Designer draft
can independently contain `carob` and approach `mr2`, then be handed to planning.

Today, explaining that the activity uses that ecological method requires text
and human review. There is no machine-validated claim that the design fulfils a
3.4 condition, is novel locally or is scientifically valid. A later knowledge
relationship should record the method/design reference and its evidence while
leaving funding assessment and project confirmation with their existing rules.

## Citation duplication classification

The comparison used parsed JSON field equality and explicit document ID, SHA-256,
PDF page, role and verification-date comparisons. Labels were compared separately.
No source, label or substantive content was corrected.

| Comparison or category | Observed result | Interpretation and action |
| --- | --- | --- |
| Guidance versus concept source maps | 80 shared IDs; all agree on document, page, checksum, role and date; all 80 labels differ | Independently maintained copies with encoding-only display drift. Every concept label decodes from its Latin-1 misinterpretation to the guidance label. Preserve the existing labels in the first extraction because they contribute to library hashes. |
| Guidance versus delivery source maps | Four common IDs and four fully identical records: FUND-008 pages 120, 121, 123, 124 | Exact maintained duplicates, suitable for the bounded shared-owner pilot. |
| Concepts versus delivery source maps | Four common IDs; only label differs | Same encoding defect as the 80-record comparison. |
| Concept-only sources | `EDL-395/396/397/419/420/421` | Six additional strategy passage uses. Their absence from guidance is not data loss; the collections have different consumers. |
| Publication metadata | Five common publication IDs, all five objects identical between guidance and concepts | Independent maintenance duplication; defer extraction to avoid broadening the citation pilot. |
| Different wording or provenance on the same page | FUND-008 page 120 is a `legal rule` entry citation and a `route requirements` editorial citation; dates can be absent, 2026-10-31 or 2026-11-01 | Legitimate citation uses are distinct from passage identity. A verification date belongs to its use/review, not to an intrinsic property of the PDF page. Do not merge roles or dates by page alone. |
| Different passages | FUND-008 pages 120–122, FUND-004 page 16, FUND-010 page 219 and FUND-013 page 395 support different parts of the 3.4 trace | Different documents/pages can jointly support a rule; they are not interchangeable duplicates. Page 120 also spans typologies, so section context remains important. |
| Same document/page with different checksums | None in the structured funding-citation scan described below | This limited scan found no edition collision. It is not a semantic review of every statement or an audit of all URLs and research files. |
| Substantive differences needing contextual review | MR2 whole-area density versus internal group spacing; stock-size differences between narrative/table retained in educational limitations | Preserve context and unresolved status. These are outside the citation-metadata extraction and do not authorise changing default counts, stock or watering assumptions. |
| Repeated frozen records | Funding catalogue v1/v2, historical plant catalogue, embedded design/funding bundles, original scenario and applied snapshots | Deliberate replay/snapshot data. Preserve it; do not redirect historical evaluation to mutable current knowledge. |

The automated scan found **968 citation occurrences**, **240 distinct
(document, edition, page, role) combinations**, and **181 distinct document/page
pairs**, with no different-checksum collision within those pairs. It covered
inline objects carrying `document_id`, `page`, `sha256` and a non-null document ID
in the current funding catalogue (739), route guides (55), selection guidance
(80), concepts (86), delivery (4) and statistics (4). Fifty-three page pairs have
more than one role, including absent roles in guide records. The scan excludes
web-only references, EDL items whose document identity is held at library level,
Designer references and prose citations. Those omissions are explicit scope
boundaries, not empty evidence results.

## Compatibility findings and open issues

| Finding | Consequence and required handling |
| --- | --- |
| One app PDF record per document ID | `documents.record` selects by ID; `verified_file` compares an optional expected hash against that one record and returns 409 on mismatch. There is no general `(document ID, edition)` file resolver. Retaining an old file on disk alone does not make it discoverable through the current app ID. |
| Designer source snapshots retain filename/hash | The exact old bytes can be reopened through the retained source filename if kept available. A renamed, overwritten or missing file fails explicitly. Bundles retain metadata, not the original PDF bytes. |
| Frontend PDF metadata is bundled | Python and frontend both validate `documents.json`; mismatched hash/page mapping is surfaced. An updated backend registry does not silently repair an older built frontend. |
| Printed and PDF page numbers have explicit contracts | Printed-page lookup must have a mapping; PDF references use one-based positions. No mapping is inferred. FUND-004/008/010 use PDF positions in this trace; FOREST-002 and selected FUND-013 pages have mappings. |
| Funding scoring and Designer policies are pinned | Keep catalogue versions, selection-policy versions and evaluator dispatch distinct. Designer v1/v2 and funding v1/v2 evaluators remain frozen; registered current handlers may explicitly reuse historical calculations. New evidence must not change saved quantities, positions, scores or history. |
| Concept, delivery and EDL editions are hash-bound external dependencies | `project_concepts.validate`, `delivery_plans.validate` and `funding_edl.validate_evidence` compare saved hashes with their installed libraries. These are not all embedded, self-contained bundles. Changing even a concept citation label can invalidate an existing concept. General multi-edition dispatch is not implemented; errors request restoration of the matching edition. |
| Current reference guidance can change independently | Programme/guide/selection advice is editorial current content, while calculations may be pinned to older catalogues. A later explorer must identify which edition informs an explanation and avoid implying that current advice rewrites historical rules. |
| Current outer envelope is 8 | Some narrative documentation still describes envelope 7 in older passages. Storage code explicitly validates/migrates envelopes 1–8 and emits 8 around simulation 4. Use code and migration tests for the compatibility baseline; correct broader documentation separately. |
| No typed cross-domain claim/dependency registry | Current references support local traces, but cannot establish a complete “everything affected by this source change” query. Free text, research notes and frontend knowledge require explicit consumer registration before any completeness claim. |
| AL20-specific execution branches | The current five-route set and aid-line mappings are explicit in Python. Introducing a second programme with different semantics is later work; adding a catalogue entry alone does not implement it. |

The source-edition resolver, retained guide-edition dispatch and full dependency
coverage remain open architecture work. They do not block the first extraction
if the resolved source records and hashes are preserved exactly. This audit does
not claim repository-wide removal of silent fallbacks; it changes no runtime path.

## Milestone 2 handoff

### Bounded scope and ownership

Extract **five passage/citation uses** from the three live editorial collections:
selection guidance, project concepts and delivery planning. Their maps contain
14 occurrences of these uses: five, five and four respectively. Pages 123/124 are
included because the delivery library jointly covers routes 3.4/3.5; their
inclusion preserves that dependency without expanding assessment logic.

Use `knowledge/citations-v1.json` as their metadata authoring authority and
`backend/knowledge_citations.py` as the validated loader/projector. Existing
feature source records become declared, generated mirrors of the five canonical
metadata fields (`document_id`, `sha256`, `page`, `role`, `verified_on`). Feature
`label` fields remain editorial display inputs and stay byte-for-byte unchanged.
This avoids changing feature JSON schemas, public responses or persisted hashes.

The mirrors are not independently editable authority: each consumer load must
validate them against the canonical projections and fail if they drift. Provide
a read-only projection command to emit the expected source map for an explicit
repository editing operation; no startup repair or automatic file writes occur.

Reuse `configuration.read_json/keys`, `documents.catalogue/record/verified_file`,
registered page limits and checksum validation. Do not copy filenames, titles,
page counts or printed-page mappings into a competing document registry. The
canonical edition records reference existing document IDs and hashes. No old PDF
is overwritten and no general multi-edition resolver is introduced in this step.

### Identities and explicit mappings

Let `H` denote the full FUND-008 SHA-256 printed in trace one. The edition ID is
the exact concatenation `FUND-008@H`; passage IDs append `:pdf:N`. `H` is expanded
to all 64 lowercase hexadecimal characters in stored IDs, not a guessed edition.

| Existing citation-use ID retained verbatim | Canonical passage | Registered consumers |
| --- | --- | --- |
| `FUND-008-p120-route-requirements` | `FUND-008@H:pdf:120` | selection guidance, project concepts, delivery |
| `FUND-008-p121-route-requirements` | `FUND-008@H:pdf:121` | selection guidance, project concepts, delivery |
| `FUND-008-p122-route-requirements` | `FUND-008@H:pdf:122` | selection guidance, project concepts |
| `FUND-008-p123-route-requirements` | `FUND-008@H:pdf:123` | selection guidance, project concepts, delivery |
| `FUND-008-p124-route-requirements` | `FUND-008@H:pdf:124` | selection guidance, project concepts, delivery |

Use registry schema 1 with explicit `editions`, `passages`, `citations` and
`consumers` maps. An edition contains `document_id` and `sha256`; a passage
contains `edition_id`, `page_basis: pdf` and integer `page`; a citation use contains
`passage_id`, `role` and `verified_on`. The five uses retain role
`route requirements` and date `2026-11-01`. Consumer IDs are
`selection_guidance`, `project_concept`, `delivery_plan`; each declares exactly
the citation IDs listed above. Closed field sets, duplicate-key rejection and
supported-version checks apply at every registry level.

`project_sources(consumer_id, labels)` returns the existing six-field source
objects for that consumer's registered IDs. Labels must be explicitly supplied
for every projected use. `validate_consumer_sources(consumer_id, sources)` checks
the mirrored five metadata fields; the existing feature validator continues to
validate the full collection, labels and all untouched inline citations. Unknown
consumers, unresolved IDs and unequal projections are errors, never reasons to
use the previous inline data as recovery.

Wire that check into `funding_selection_guidance.describe`,
`project_concepts.guide`, and `delivery_plans.library`, before returning validated
data. Raw feature validators keep their existing versioned contracts. Public
endpoints and frontend contract validators require no wire-shape adapter.

### Ordered implementation tasks and checks

1. Add the registry, `knowledge/README.md`, loader/projector and
   `tests/test_knowledge_citations.py`. Document mirror ownership and the exact
   five-use/three-consumer scope. Reuse existing domain error handling.
2. Provide `python -m backend.knowledge_citations --check` for all registered
   mirrors, and `--project CONSUMER_ID` to emit projected records as JSON to stdout.
   Commands return nonzero with file/ID context on invalid input and do not write
   application, library or project files.
3. Add the three consumer checks. Keep current labels, source ordering, library
   versions and content intact. Avoid circular imports: the shared module may
   depend on configuration/documents and error helpers, not the three consumers.
4. Add meaningful tests for valid resolution, exact projections, duplicate keys,
   unknown versions/consumers/fields, missing IDs or labels, invalid pages,
   invalid verification dates, document/hash mismatch, missing/corrupt registry,
   drifted mirrors and failed reads. Existing references must not mask failure.
5. Assert exact library equality and these baseline `funding.digest` values:

   | Resolved library | SHA-256 |
   | --- | --- |
   | Selection guidance | `4a55f602ea8279264afcb8c3135908e4b96ffe2d3b9017559dcec95ae660c03d` |
   | Project concept guide | `19d260ade0296e99dc2ffc678ae93f49b513f45d959253bd20baddcd4fc7d542` |
   | Delivery planning | `bbfd549874c6f0152c7a5b13ae5edef5e43a416785ea3afd72ea44b43faa6ca2` |

6. Run existing relevant domain/import/export/atomic-failure tests, full backend
   and frontend suites, and the frontend build. Confirm old concepts and delivery
   plans still validate, reports/citations match and failed reference loads do not
   publish mutations. No save migration or rule adoption is needed for unchanged
   resolved content. A deliberate content change requires a separate edition plan.

Remaining after this step: 75 shared guidance/concept citations, six additional
concept EDL uses, publication metadata, guide/statistical sources, embedded
funding citations, all Designer evidence and educational/research prose. Record
these boundaries in the roadmap. Do not fix the label encoding, switch document
editions, alter scientific assumptions or implement the graph in this extraction.

## Verification baseline

Tests ran against revision `9047aa81a830df90c6267de397bdb9963c937777` on
3 November 2026. Times below are Europe/Berlin, UTC+01:00. No dependency was
installed or changed. At the fingerprint capture, unrelated work modified
LEARN-014's listening text and added its companion presentation text; those
documents were preserved and are not test inputs. A later dirty tree must not be
mistaken for a clean-revision result.

Environment: Windows PowerShell, Conda environment `restoration-simulator`,
Python 3.12.16, Node.js 22.23.4, npm 10.9.9, FastAPI 0.120.0, Uvicorn 0.38.0,
HTTPX 0.28.1 and Git 2.53.0.windows.2. The frontend manifest pins React/React DOM
19.2.0, Vite 7.3.7 and PDF.js 6.4.299. Existing base-environment Python 3.12.9
and PyMuPDF 2.0 were used for source-page inspection; application tests used the
named Conda environment.

| Working directory | Exact command | Time | Result |
| --- | --- | --- | --- |
| `restoration_simulator` | `conda run -n restoration-simulator --no-capture-output python -m unittest discover -s tests -v` | 12:11:56–12:15:53 | Exit 0; 292 tests, OK; runner duration 230.574 s. |
| `restoration_simulator/frontend` | `conda run -n restoration-simulator --no-capture-output npm.cmd test` | 12:11:56–12:12:46 | Exit 0; 107 tests passed, zero failed/skipped/cancelled/todo; runner duration 36.602 s. |
| `restoration_simulator/frontend` | `conda run -n restoration-simulator --no-capture-output npm.cmd run build` | 12:13:18–12:13:42 | Exit 0; Vite build succeeded in 7.39 s. Existing warning: chunks over 500 kB, including main JS about 1,496 kB and PDF engine about 611 kB. |

The build warning is a performance follow-up, not a failed check or a reason to
change bundling during this milestone. No failing test was observed. Browser
workflows were not run. No new tests were added for this documentation audit.

Raw logs, exit/timing records, inventory/comparison data, source-page extracts and
before/after integrity records are under ignored `test-artifacts/knowledge-audit/`.
The durable results and reproduction commands are recorded here so a fresh clone
does not depend on those local artifacts. Repeat the baseline if relevant source
files or dependencies change during subsequent work.

The final integrity comparison matched all 352 fingerprinted application,
configuration, test and asset files, all 58 tracked library PDF/PNG files and all
eight existing save JSON files. Documentation links and the cited existing test
names passed verification. Concurrent changes to the library catalog and AL20
score-optimisation publication package were preserved; they are outside this
milestone. This task's maintained changes are this audit and the roadmap update.

### Existing failure and compatibility coverage

The listed test names are concrete coverage anchors, not claims that every path
in the repository is audited.

| Requirement | Existing evidence |
| --- | --- |
| Missing/malformed/duplicate configuration | `test_configuration.ConfigurationTests.test_missing_malformed_and_duplicate_config_are_errors`, `test_required_defaults_and_versions_are_not_repaired`; guidance tests `test_missing_malformed_and_duplicate_key_files_fail_actionably`. |
| Invalid citations, pages and mappings | Document tests `test_configuration_rejects_unsafe_paths_duplicates_and_bad_mappings`; selection-guidance `test_bad_coverage_routes_text_sources_and_versions_are_rejected`; concept `test_library_complete_sources_explicit_factual_tasks_and_route_starters`; frontend guide/model invalid-reference tests. |
| Changed or missing source editions | Document `test_missing_changed_and_unregistered_documents_fail_explicitly`; concept `test_invalid_version_missing_binding_identity_duplicate_activity_and_edition_fail`; funding edition and selection tests validate cited/frozen source data. |
| Malformed saves and preservation | Simulator `test_export_import_undo_and_invalid_import_preserve_save`, `test_corrupt_autosave_is_never_overwritten`; Designer library `test_export_import_and_unknown_ids_do_not_replace_saved_data`; planning `test_v6_backup_and_invalid_v7_import_are_explicit`. |
| Historical replay and explicit upgrades | Simulator `test_preview_and_replay_after_restart_and_undo`; funding edition `test_financial_formulas_and_frozen_edition_one_are_preserved`; Navigator `test_frozen_editions_and_reviewed_upgrade_preserve_raw_answers`; Designer library `test_v5_migration_preserves_historical_bundle_and_makes_byte_backup`. |
| Atomic failure, retries and revisions | Simulator `test_save_failure_is_visible_and_does_not_publish_candidate`; concept `test_write_failure_preserves_both_and_retry_idempotency`; Designer library `test_library_failures_conflicts_and_retries_are_atomic_and_idempotent`; Navigator `test_atomic_retries_stale_revisions_bad_hash_and_incompatible_versions`. |
| Draft preservation and read-only knowledge views | Planning `test_revision_validation_and_failed_writes_preserve_draft`; guidance `test_reference_reads_preserve_current_and_historical_assessments`; frontend `fundingPersistence.test.mjs` stale-snapshot checks, guidance read/filter immutability, and concept contract tests preserving caller drafts. |

## Completion and next task

Milestone 1 delivers the authority matrix, research integration inventory, both
source-to-feature traces, classified duplication, compatibility constraints,
reproducible passing baseline and the bounded Milestone 2 specification above.
The [implementation roadmap](KNOWLEDGE_IMPLEMENTATION_PLAN.md) records this result.

Next task: implement the five-citation registry and validated projections exactly
within the handoff scope. Milestones 2–6 remain pending. Edition-aware document
retrieval, retained guide editions, source-label correction, remaining duplication,
cross-domain dependencies and the graph explorer remain separately tracked work.


## Milestone 6 ownership addendum · 3 November 2026

The original audit/compatibility baseline above is retained as historical evidence.
The current collection additionally registers LIFE Nature and kermes oak, with
[source review receipts](knowledge/intake/life-nature-v1/review.md) and
[ecological review receipts](knowledge/intake/kermes-oak-v1/review.md).

| Category | Current ownership and update boundary |
| --- | --- |
| Source editions/passages/uses | Existing document registry still owns PDF bytes, identity, filenames, limits and mappings. Shared citation registry adds seven uses across existing FUND-016/FOREST-003 editions. Their original documents/registrations and the original 14 shared uses are unchanged. |
| LIFE programme/route | Existing funding programme/catalogue IDs are projected; three contextual claims reference the stored work programme. The retained research guide is a manual review target. No current call or eligibility model is added. |
| Kermes/vegetation series | Existing species and series identities/names remain native authorities. Six source claims and the complete unresolved naming issue are shared knowledge. Native optional MR2 membership remains an illustrative project association. |
| Rules/configuration | Existing rule bundle, prices and scenario assumptions remain sole operational owners. Species/series/shrub-placement bindings are review targets; knowledge does not adopt or modify rules. |
| Feature displays | The six existing contexts retain their exact claim/entity/relationship memberships and content. New claims are Explorer-only even when they mention carob. Funding-library hashes and feature registration are unchanged. |
| Intake/review artifacts | Candidate copies are isolated proposals, never runtime data. Accepted manifests/reports under `knowledge/intake/` are deliberate historical receipts; they retain changed records/dependency paths, not full duplicate runtime datasets. |
| Projects/history | Existing project/snapshot ownership, atomic saves and explicit rule review/adoption remain unchanged. Eight real saves/backups retain their fingerprints. |

The [intake procedure](knowledge/INTAKE_WORKFLOW.md) defines discovery, source
inspection, classification, conflict preservation, explicit dependency/adoption
review, validation and publication. Its read-only commands validate one coherent
candidate and reject stale inputs; only an explicit repository edit publishes it.
The [Milestone 6 verification record](KNOWLEDGE_MILESTONE_6.md) records commands,
versions, checks, authoring effort and indicative timings.

The collection now has 21 claims/16 entities and a 55-node/86-edge Explorer, retaining
the original subset and all original records. Remaining parallel guide/educational
prose, publication metadata, unregistered dependencies and source-edition retrieval
are not claimed as migrated. Both old issues and the new naming tension remain
unresolved; call availability is not assessed. Future source revision requires
retaining the old installed edition and an explicit compatibility review; matching
labels alone still cannot establish equivalence.
