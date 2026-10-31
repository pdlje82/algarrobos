# Funding Navigator

## AL20 annex assessment — catalogue edition 3

Question 19 is **AL20 selection assessment**. Open it in Graph to expand its
branch, select a funding route and expand criterion groups. Clicking a
subcriterion opens the existing floating editor. Funding options remain in their
column; expanding the annex creates space in the circumstances column. Collapse
and route switching preserve answers. Matrix and Your answers link back to Graph.

Three aid-line profiles cover 1.11, 2.6, 2.7, 3.4 and 3.5. Each route has its
own answers, even when two routes share a profile. The working option selects the
route when supported; otherwise choose one explicitly. No answers are inferred
from location, plants, applicant descriptions or environmental labels.

Python calculates exact decimal sums, source-defined exclusions/additions and
criterion caps. Every applicable subcriterion must be selected or explicitly
rejected before a final score is available. **None of these applies** records an
explicit zero for a group. Until complete, nodes show **Partial subtotal** and
the unresolved criterion count; the score condition stays unknown even when that
subtotal exceeds the threshold. Completed assessments use the route's configured
threshold. These are **self-assessed** results, not certification by the GDR.
References and notes are optional during exploration.

Definitions in `scenarios/funding.json` preserve Spanish wording, English
explanations, values, applicability and document/page/checksum references.
Local tables are FUND-004 PDF pp. 2–8 (line 1), 9–14 (line 2), 16–20 (line 3).
Relationships use FUND-010 Annex VII, PDF pp. 218–231; general definitions are
on PDF p. 5. Both documents were already in `doc_library/`; no source document
was added. Links open the existing viewer with edition verification.

AT.3 includes instructions and a link for the INE settlement lookup, the
distinction between a settlement and its municipality, and the strict below/equal/
above comparison. Its sources open FUND-010 PDF pp. 10–11 and Annex I p. 113.
The 539-person AL20 median is labelled **2025**, not a verified 2023 threshold:
the local table says 2023 while the later guide refers to the latest figures.
Confirm the applicable year with AL20; the guidance does not choose a year or
award points automatically. Uncertainty should remain an unanswered selection.

CO.1 links to the [official EDLL version-1 publication page (ADR Alpujarra,
2023–2027 strategy)](https://alpujarraalmeria.es/edll-version-1/), the
[prioritised-needs PDF extract, section 4.3 (ADR Alpujarra; publication date not
stated)](https://alpujarraalmeria.es/wp-content/uploads/2026/06/Necesidades-priorizadas-ALPUJARRA_SN_ALMERIENSE_EDLL_Epig_4-2.pdf)
and the [objectives and needs by aid line, section 5 (ADR Alpujarra; publication
date not stated)](https://alpujarraalmeria.es/wp-content/uploads/2026/06/Objetivos-y-necesidades-por-lineas_epig-5.pdf).
These external documents are linked for consultation, not added to
`doc_library/`. References/notes should identify the relevant NPL codes and
explain how the operation addresses each need. EDLL prioritisation ranks are
different from CO.1 selection points.

PE.1.5/PE.1.6 apply only to 2.7. PE.2 employment additions require their preceding
subcriterion. Positive PE.2 claims need confirmation of the documented minimum
one-year / 1 UTA conditions. The stored sources mention part-time graduation but
provide no proportional formula: the app does not calculate one, and unconfirmed
conditions remain unresolved with a GDR clarification message. PE.4 takes an
explicit grant amount and whole count of qualifying quality jobs and applies
strict per-job ratio boundaries. No amount is borrowed from another estimate.
EDL-dependent qualifications remain explicit assertions, requiring objectively
identified provisions in that strategy for an actual application.

New drafts use version 4 and retain the definitions in their catalogue snapshot.
The edition-1/2 evaluators are unchanged; edition 2 is frozen in
`scenarios/funding-v2.json`. **Review catalogue and baseline update** prepares an
explicit upgrade of an editing copy. Old manual totals remain historical only;
no choices are reconstructed from them. Saved alternatives and adopted plans
retain their original snapshots. Changed scoring definitions require an explicit
version-specific migration before adoption.

The explicit scoring-library-v1 guidance adapter permits reviewed prose updates
and additional criterion citations while preserving selections. It requires all
scoring definitions and original citations to remain identical; changed scoring
or removed/replaced original sources are rejected pending a separate migration.

Selections/references use autosave, named alternatives, duplication, plan review
and existing export/import. Expansion/editor state is transient. Invalid data or
failed writes preserve existing saves and expose errors/retry. Dedicated checks
are `tests/test_funding_selection.py`, frontend `fundingSelection.test.mjs` and
the isolated browser workflow `tests/browser/funding-selection.cjs`.

Funding Navigator is a project-local workspace available before a site design or
concluded land agreement. Open it from the workspace navigation, a parcel's
**Explore funding** button, or demonstrator **Funding route**. Physical design,
work costs and the demonstration protocol remain in their existing editors.

## Exploration and plans

The six stops cover activity, people/land, options, comparison, a funding plan and
review. The catalogue includes all 97 stable mechanism/programme identities in
FUND-007, plus two explicit existing-cash arrangements. Related descriptions are
linked and warn about duplicate counting. A regulation or certification pathway
alone cannot be adopted as financing or assigned a financial contribution.

Recorded baseline facts are user-reported, not certified. Scenario overrides are
separate and individually resettable. Business exploration does not require a
parcel. A plan can link multiple parcels or an organisation/activity. Questions
are filtered by activity; unknowns remain unknown. Full-catalogue browsing and
options requiring changes remain available.

An active draft autosaves outside simulation history. **Save exploration** creates
a named alternative. Load and edit its name/settings to **Update saved exploration**,
or use **Duplicate exploration** and save a new alternative. **Use this funding plan**
requires a review and records the preferred provisional plan for the activity.
Revisions retain previous adopted plans. No exploration, save or adoption changes
simulation cash, time, ownership, organisations, employment or grant decisions.

**Review proposed changes** links back to the owning tools. **Update assessment /
refresh baseline** explicitly adopts the current recorded context and catalogue,
keeping scenario overrides. Old saved alternatives retain their source/rule and
assessment snapshots. Changed recorded facts are flagged on evaluation.

## Verified core and wider research

`scenarios/funding.json` is the curated, versioned catalogue and question/rule data.
Python owns assessment and monetary calculations. It is not generated at runtime
by an LLM or automatically inferred from PDF text. FUND-007's wider descriptions
remain research context with explicit verification gaps; historic and enabling
frameworks must not be described as continuously open funding.

Core checks cover LEADER 2.7, 1.11, 2.6, 3.4 and 3.5. They assess the supplied
answers and never certify legal eligibility. In particular:

- 2.7 uses a business-plan lump sum and conditional bonuses. Its payment schedule
  is a milestone preview; it is independent of reimbursement calculations.
- Prior RETA/CNAE, unemployment, registration timing, residence, income benchmarks,
  exclusivity and continuing commitments need explicit answers. SMI is not
  silently populated with a current or fictional statutory value.
- Actual customers/services determine the 1.11 versus 2.6/2.7 classification.
  Mixed activity requires GDR confirmation. A university's legal status also needs
  clarification rather than assuming it is an eligible public body.
- A municipality-name match is preliminary, not parcel-level verification.
  Unrecognised locations require review; lack of verification is not a legal
  exclusion. Exact local interruption and budget availability remain unresolved.
- Reimbursement estimates require an explicitly entered eligible cost. Funding
  percentages and legal caps are not an award or available cash.
- Allocations distinguish existing funds, anticipated receipts, loans and in-kind
  contributions. Same-cost and related-mechanism combinations warn about overlap.
  Credit units, prices, buyers and income are not inferred from planting or area.

Real call dates and relative simulation years stay separately labelled. An optional
calendar starting date is an activity assumption, not a change to the simulator clock.

## Official sources collected on 30 October 2026

The following unchanged official PDFs are stored in `doc_library/`, catalogued in
`CATALOG.md`/`RENAME_LOG.csv`, and registered with checksums in the existing PDF viewer:

- FUND-008: [Junta de Andalucía, Order of 3 February 2026, LEADER governing rules
  (official PDF)](https://www.juntadeandalucia.es/eboja/2026/29/BOJA26-029-00163-1654-01_00332877.pdf).
  Verified PDF positions: 1.11 at 93–95; 2.6 at 109–111; 2.7 at 111–113;
  3.4 at 120–122; 3.5 at 123–124.
- FUND-009: [Junta de Andalucía, Resolution of 13 April 2026, call for non-GDR
  applicants (official PDF)](https://www.juntadeandalucia.es/eboja/2026/76/BOJA26-076-00061-5258-01_00336495.pdf).
- FUND-010: [Junta de Andalucía, selection-criteria verification guide v2-4
  (official PDF)](https://www.juntadeandalucia.es/sites/default/files/inline-files/2026/10/Guia-instrucciones-especificas-publicas_Criterios-seleccion-promotores_7119-2_LEADER_v2-4.pdf).
  The cover is dated 11 September 2026; the official listing identifies the
  published version as 25 September 2026. It is guidance, not an award decision.

The [official AL20 territory and document page](https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/areas/desarrollo-rural/tramitacion-ayudas-dr-2023-2027/paginas/ayudas-leader-intervencion-7119-2-promotores-al-al20.html)
was checked against the existing AL20 selected-activities and criteria documents
(FUND-005/FUND-004). The [official common LEADER page](https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/areas/desarrollo-rural/tramitacion-ayudas-dr-2023-2027/paginas/ayudas-leader-intervencion-7119-2-promotores.html)
links the call and current guide. Targeted BOJA searches found no amending order;
that check does not guarantee against later changes. Wider authoritative call
texts have not been exhaustively collected.

Claim links reuse `DocumentLink`, exact PDF positions and saved checksums. Missing
sources or changed editions fail visibly; no replacement page or unrelated file
is opened. Research-context links explicitly identify when an exact condition
page has not been established.

## Persistence, API and existing simulation

Save/export envelope 8 adds `funding`, `funding_revision` and `funding_undo`, while
simulation schema 4 and frozen historical replay remain intact. Envelopes 1–7
migrate explicitly; autosave migration creates an original-byte backup. Old
demonstrator financing is shown as an existing simulation record without creating
a fictitious funding plan or verified legal assessment.

API operations:

- `GET /api/funding/catalogue`, `GET /api/funding`.
- `POST /api/funding/context`: capture a recorded context and catalogue snapshot.
- `POST /api/funding/prepare`: read-only adapter for editing older explorations.
  Draft version 3 has one nullable `applicant_choice`: null inherits the captured
  applicant; recorded choices carry a party ID; planned/potential choices carry a
  legal form; an explicit unknown choice clears the whole applicant assumption.
  Independent identity/form overrides are rejected in v3. Version-1/2 assessments
  retain their original evaluation semantics. Lossless editing adapters combine
  compatible older answers; conflicting older identity/form pairs require an
  explicit choice before conversion. `/prepare` accepts an optional
  `applicant_choice` to resolve that review, without writing any records.
- `POST /api/funding/evaluate`, `POST /api/funding/plan-preview`: read-only assessment.
- `POST /api/funding/visualise`: the identical assessment plus transient, versioned
  condition dependencies and modelled/research-only coverage. Composite income
  checks explicitly include the income and SMI fields; startup bonuses are amount
  dependencies, separate from eligibility. It also returns transient applicant
  logical questions, grouped applicant options, current/initial values, relevance,
  provenance and reset destinations in `input_context`. Applicant dependencies
  map to `applicant_choice`. Metadata never enters saved assessments.
- `POST /api/funding/save`: draft, save/update exploration, adopt/revise plan, delete.

Mutations check project, funding, design and planning revisions, use idempotent
request IDs and persist atomically. Failed saves preserve the draft and confirmed
project; Retry reuses the request. JSON requests/imports are bounded at 10 MB to
accommodate saved evidence snapshots.

Parcel-deletion previews include dependent funding records. Shared adopted plans
must first be explicitly revised or unlinked. Deletion/remapping and Undo cover
funding links alongside other planning attachments. Demonstrator removal preserves
alternatives and marks its adopted plans inactive.

The demonstrator's **Explore funding** navigation opens the navigator directly;
its current financing and preferred plan remain visible in a compact summary.
The navigator can explicitly transfer existing supported financing settings into
the demonstrator planning draft, which is still separately reviewed/committed.
Actual applicants must be existing recorded parties. Existing AL20 application,
award and payment actions stay authoritative. Other mechanisms, including 2.7,
have no new cash-posting workflow in this release.

## Live funding consequences

Questions use prominent labels and only specific explanatory help. The single
**Who would apply for the funding?** question replaces the old identity and legal-
form questions. Recorded parties use their recorded form; creating a nonprofit or
business and seeking a potential partner are distinct hypothetical selections.
The less common hypothetical types are inline choices inside that same question.
No organisation, ownership or agreement is created by choosing a scenario.

**Your answers and assumptions** is available across all six stops. It includes
inherited values, groups unknowns and retained answers for other activities, and
supports direct editing. **Set to Unknown** removes the current assumption;
**Restore initial: …** returns to the captured baseline and names its destination.
Applicant resets apply to the complete choice. Hidden activity answers are
retained, and direct editing can inspect one without changing the activity.
The active question is identified by stable logical ID rather than its index.

**Graph is the default**, with Matrix one toggle away. The separate What
changed panel and aggregate change counters are removed. Affected rows/nodes and
changed fit/condition/amount cells carry text markers and highlights. Hover/focus
shows concise explanations; **Inspect effects** opens persistent interactive
detail with before/after condition results and exact PDF citations. Conditions
that are affected but unchanged are explained, including changes between two
nonprofit applicants, capped amounts and removed conditional requirements.
Unimplemented assessments remain separate from missing user answers and conflicts.
Family/page indicators locate affected options outside the current visible set.

A selection or reset triggers Python evaluation immediately, independently of
saving or question navigation. Text/numeric edits use a short debounce flushed
by Enter/blur. Current selection labels update immediately; eligibility and money
always come from Python. Old results remain explicitly labelled during pending
or failed requests, retries retain answers, and stale responses are ignored.
Highlights remain through non-answer updates until another accepted answer edit
or an explicit exploration/baseline change. Activity navigation waits for its
updated relevant question set, preventing rapid navigation into obsolete questions.

Catalogue order, browsing filters, shortlist, source viewing and selected visual
view are retained during input changes. Compact view pages up to 12 options in
one family/shortlist. **Expand view** removes the internal height limit and shows
all rows/nodes in that scope using page scrolling; **Compact view** restores its
scroll position. Phones use an expandable visual panel and compact matrix rows.
Help works with hover, keyboard focus and touch, supports Escape/outside closing,
and stays inside the viewport. Reduced-motion and both themes are supported.

Saved source editions, historical assessments, simulation schema 4 and save/export
envelope 8 remain unchanged. Opening an editing copy does not overwrite an older
snapshot. An unresolved legacy applicant can be inspected read-only or cancelled;
editing/adoption stay unavailable until the user selects a coherent applicant.

## Verification

Run Python unittest discovery, frontend `npm test` and `npm run build`.
`tests/test_funding.py` covers assessments, catalogue coverage, side-effect isolation,
compatibility warnings, persistence, migration, stale revisions and failed writes.
`tests/test_funding_visual.py` checks endpoint equivalence, composite/shared inputs,
amount-only bonuses, coverage, stable identifiers and absence of save/cash effects.
Frontend visual-state tests cover transition comparisons, rejected late responses,
failed requests/retries, scope/paging and invalid dependency contracts.

For isolated browser verification use the existing 8013 API / 5174 Vite test
configuration, with a dedicated save under `test-artifacts/`. Set `PLAYWRIGHT_MODULE`,
`DESIGNER_TEST_API` and `DESIGNER_APP_URL`, then run
`node tests/browser/funding.cjs`. Never use API port 8000 for mutation tests.
The browser check covers the guided 2.7 scenario, bonus cap, source viewer, adoption,
reload, failed-save retry and phone layouts in both themes. Screenshots are ignored
test artifacts. The user's active save is not used.
Run `node tests/browser/funding-visual.cjs` for graph/matrix, request-race, PDF focus,
question hierarchy, keyboard and 390px checks, followed by the existing funding and
`planning-handoff.cjs` checks. Each workflow uses the isolated save and test servers.
`funding-refinements.cjs` covers legacy applicant review/cancellation, complete
applicant replacement, the overview and both resets, retained activity answers,
unchanged-condition effects, sources, expanded views, phone themes, save/reload
and the direct demonstrator entry. `test_funding_choice.py` covers the v3 contract,
lossless/review adapters, provenance/relevance and unchanged financial rules.


## Catalogue edition 2 — context and sourced questions

Edition 2 replaces the combined AL20 confirmation with municipality coverage and
an explicit 3.4 territorial-scope check. The search/dropdown uses the 32 AL20
municipalities verified on PDF page 3 of FUND-012, the official 13 February 2025
recognition resolution. Unrecognised names stay unresolved. An explicitly
confirmed outside-area location conflicts with 3.4; other core mechanisms retain
an explained uncertainty because Article 6.7 contains conditional territorial
exceptions which are not fully assessed. Call/budget availability is separate.

Public participation is now two independent inputs: open demonstration
participation for 3.4, and heritage public-use/visitor arrangements for 3.5.
Neither is represented as unrestricted entry to an entire private parcel.
Applicant land rights and work permissions remain separate confirmations;
ownership does not automatically satisfy either. Help distinguishes the general
investment-retention provision from the specific 3.4 exception and publication
obligation without applying a universal commitment period.

All current questions have curated plain-language guidance and short labels.
Programme-specific explanations identify supporting PDF pages, immutable edition
checksums and verification dates. Generic planning inputs do not invent legal
citations. Hover/keyboard focus displays a brief tooltip; activation opens a
persistent modeless detail dialog with source links. The existing modal PDF
viewer preserves the underlying detail, question and keyboard focus. Broken
editions/pages use the existing visible failure and retry path.

`POST /api/funding/prepare` accepts `adopt_current_catalogue` (default false).
An explicit update produces an editing copy, conversion differences and retained
answers in `catalogue_review`, without writing storage. Applying the review updates
only the active draft; named/adopted snapshots are changed only through their
existing explicit save/revision actions. Old catalogue evaluation is frozen in
`funding_v1.py`; current evaluation uses `funding_v2.py`. Financial formulas are
unchanged. Draft 3, envelope 8 and simulation schema 4 remain unchanged.
Superseded `territory_verified` and `public_access` answers are retained in the
previous-catalogue group and never drive edition-2 results. No shared public-access
answer is copied into the new questions. Recorded demonstrator participation can
initialise only the 3.4 participation answer. New parcel-linked baselines use the
recorded parcel location; conflicting planning defaults remain visible for review.

The answer overview uses compact rows with origin detail and Edit/Reset controls;
phones disclose the actions per row. Graph opens by default and shows all
fit nodes across the complete selected family/shortlist, including other pages.
Question navigation and option inspection preserve their positions. Optional
current-question focus and amount-condition controls change presentation only.
Circumstance nodes colour their linked Python conditions green (met), amber
(unresolved) or red (conflicting). Mixed outcomes across programmes use a lavender
surface and a segmented green/amber/red rail with labelled result counts. The
working-option radio focuses colours and emphasised connections on one option.
Card/title clicks only open details; they never change the working option or
shortlist. Shortlist checkboxes are activated only through their inputs. The
working choice survives Graph/Matrix, question navigation, paging, filters and
source viewing; the summary identifies when it is outside the displayed scope.
Its requirements remain available in the graph. Clearing it restores the whole
family/shortlist colour summary. This is session presentation state, reset by
loading another exploration or refreshing its context, and never saved/adopted
into funding records. Amount-only nodes label their monetary effect explicitly.
Clay selection outlines and changed-answer highlights retain the outcome colours.
Previous counts and reserved update/status slots prevent assessment/blur updates
from moving controls during clicks.

The People and land stop now gives the visual workspace its full width without
a static answer panel. Select a circumstance node, **Answer questions**, or Edit
in the answer overview to open the modeless question editor. Clicking a graph node
opens the editor below that node and the following node, keeping both nodes and
their connection states visible. The final node uses the preceding node for context.
The graph/page scrolls only as needed to leave room, and the editor body scrolls
within the remaining viewport. Clicking another node re-anchors the editor.
Other triggers open it beside their controls. It can be moved by its title on
desktop (or with arrow keys), and retains the moved position while advancing
questions with the editor's buttons. Escape/Close returns focus to the
trigger; question help and PDF viewing remain nested interactions. Phones use a
viewport-contained editor with scrollable content.

Desktop graph columns have two draggable, keyboard-accessible separators. Minimum
column widths preserve readable nodes; **Reset column widths** restores the initial
layout. Widths survive view changes within the workspace, while phones use the
fixed scrollable layout. Editor positions and column widths are presentation state
and never enter funding snapshots, project records or simulation history.
`funding-layout.test.mjs` and the isolated `funding-layout.cjs` browser workflow
cover geometry limits, movement, focus, source PDFs and phone themes.

The planning workspace exposes computed `context`: linked parcel, owner, active
or inactive access record, operator, source design, planning municipality conflict
and changed/missing-source status. The overall demonstrator summary links to the
correct parcel record and uses existing design-library guards to open its source.
The transferred snapshot remains authoritative until another reviewed handoff;
changing, renaming or deleting a library source never silently rewrites it.
Records are labelled as project simulation information, not verified legal rights.

Targeted BOJA and official promoter-page checks on 31 October 2026 found no
amending governing order; the promoter page still lists the April call and v2-4
selection guide. This does not certify ongoing budget availability or absence of
later/local changes. FUND-012 was added with a permanent ID, checksum, catalogue
and audit entry; other existing sources were reused.

Verification adds `test_funding_edition.py` and `funding-context.cjs` for territory,
independent participation, immutable old snapshots, exact question citations,
compact resets, persistent graph nodes, phone help and source-design context.
Run these alongside the existing funding, visual, refinement and planning-handoff
browser checks using isolated API 8013 and preview 4174. Never mutate active API
8000 or the user's project save during these workflows.
