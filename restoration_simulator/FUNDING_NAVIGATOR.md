# Funding Navigator

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

**Matrix is the default**, with the graph one toggle away. The separate What
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
phones disclose the actions per row. Matrix remains default. Graph defaults to all
fit nodes across the complete selected family/shortlist, including other pages.
Question navigation and option inspection preserve their positions. Optional
current-question focus and amount-condition controls change presentation only.
Previous counts and reserved update/status slots prevent assessment/blur updates
from moving controls during clicks.

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
