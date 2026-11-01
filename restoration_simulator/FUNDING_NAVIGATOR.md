# Funding Navigator

## Programme → route → requirements needing attention

The graph has four columns: **Exploration → Programme → Route requirements →
Funding routes**. Choose a programme node in the second column. Expand one of
the six funding families, or use **Find a programme or approach** to filter the
nodes by name or route code. The selected programme stays at the top; **Other
programmes** reopens the family browser. There is no programme dropdown.

The registry includes all 99 catalogue entries as programmes, programme families,
mechanisms, historical examples and advisory approaches with explicit labels.
AL20 combines its 12 routes, LIFE four entries, and Horizon Europe/Missions six
entries. Other entries remain standalone approaches. Each node has a separate
**Read guide** action. Its source-cited introduction opens below the graph with
the five guide sections, limitations, research questions and exact sources.
Reading another programme's guide does not change the working programme/route.
Closing returns focus to the guide's opener; PDF sources retain their page links.

**Column view** offers **Auto**, **3 columns** and **4 columns**. All four columns
remain on one canvas. **Previous columns / Next columns** moves one column at a
time, keeping vertical scroll. The displayed range reports the actual window;
narrow screens show two or one readable columns, with an explicit fit message
when a requested count cannot fit. Focus the canvas itself to use Left/Right
arrows; inputs, family controls and resize separators keep their own keys.
Off-screen column labels and edge fades show that more graph exists. Arrow
badges appear only where actual SVG connections cross the viewport, with their
status, count and destination; clicking one reveals the connected column.

Resize any adjacent pair currently visible together. **Reset column widths**
restores the initial proportions. Narrower viewports reflow custom widths to
keep all visible columns readable. The floating editor stays open while panning;
**Show edited requirement** returns to its node. **Expand node area** still
removes the vertical height limit for portrait screens. Column view, panning,
widths and family expansion are transient and do not save funding decisions.

Choose a route using its **Work** circle on the right. Only its backend-linked
requirements appear. Single-option approaches select their sole route directly.
An AL20 programme selection by itself asks no questions: the questionnaire starts
after route selection. Clicking a title inspects that route without changing the
working route; explicitly editing a requirement in its inspection selects it.

Unresolved and conflicting requirements stay visible. Satisfied questions move
into **Requirements met**, which can be expanded. The active question and its
node positions are retained while editing; regrouping occurs after closing or
advancing. An open annex remains available until collapsed. Previous/Next and
question counts follow the route's displayed questions, including both inputs
of composite conditions such as an income/SMI comparison. Your answers retains
global answers and all five AL20 assessment summaries, including hidden answers.
**Edit budget assumptions** in Build a funding plan opens the separate budget
question flow; it remains available independently of the selected programme.

**Other programme routes** reveals alternatives on the right. **Compare programme
routes** displays their combined questions and aggregate connection states;
**Route questions** restores the focused questionnaire. Search/shortlist filters
cannot hide the working route or add unrelated questions. **Show amount questions**
adds inputs needed for funding estimates. Own/partner existing-cash arrangements
are displayed as financial calculations, not grant-eligibility questionnaires.

Coverage labels distinguish modelled eligibility checks, amount calculations and
reference-only routes. AL20 has five routes with modelled fit checks and seven
guide-only routes. Selecting a guide-only route displays its researched
introduction and sources, with no invented questions, points or eligibility
result. Standalone guides appear once rather than being repeated in inspection.

Programme/route focus, met-group expansion and comparison are session state.
They are not saved as funding decisions. Switching focus retains all saved
answers, notes and separate route assessments. A fresh session requests programme
selection; source editions, draft versions and exports use their existing
contracts. Metadata errors are explicit and retryable. A new read-only
`GET /api/funding/programmes` supplies the validated presentation registry.

Why route-first: a fresh business fixture has 34 top-level AL20 fit questions;
individual routes use 6–18, before opening the annex. Met grouping reduces the
remaining displayed questions further without deleting their answers.

## Funding introductions across all families

All 92 research-only options have a plain-English introduction: **What is it?**,
**Why consider it for Algarrobos?**, **What makes it interesting?**, **What are
the limitations?**, and **What would we investigate next?** Examples are
illustrative interpretations, not eligibility decisions. Each guide also shows
dated availability, unresolved questions, related options and source references.

Click an **Explore this option** card in the graph to show its introduction first
in the existing inspection area. The heading receives keyboard focus and scrolls
into view. **Automated assessment unavailable** distinguishes these references
from modelled assessments. Original catalogue research remains available below.
The current explorer is graph-only; guides follow that existing workspace.

`GET /api/funding/guides` serves the validated, versioned
`scenarios/funding-guides-v1.json` library. Content is current editorial reference
information, visibly separate from the exploration’s frozen rule/source snapshot.
Reading a guide or retrying its load does not edit answers, working options,
shortlists, allocations or saved assessments. Missing coverage, text, versions,
references or PDF editions fails explicitly; unavailable information has a Retry
button. This library never performs live web research or generates text at runtime.

The five assessed AL20 routes and two existing-cash arrangements retain their
existing assessment behaviour. See [the research report](FUNDING_GUIDES_RESEARCH.md)
for the complete crosswalk, seven new PDFs (FUND-014–020), download links,
verification limits and sources that could not be retrieved.

## EDL information in AL20 assessments

EDL means *Estrategia de Desarrollo Local* (Local Development Strategy); EDLL
adds LEADER. The AL20 strategy defines the local needs, innovation provisions
and other priorities referred to by the selection annex.

Open **AL20 selection assessment**, choose the funding route and expand a
criterion. Every subcriterion that refers to EDL/EDLL now includes **What the
AL20 EDL says**: relevant activities, needs or conditions, English explanations,
Spanish source keywords and links to the exact pages of the full strategy.
This covers CO.1, IN.1, IG.8, IG.11, DRI.3, JR.3, PT.1 and PS.1; route 2.6 also
shows its strategy context in the option details. The 50 prioritised needs are
available under **Show all 50 prioritised needs**.

Select relevant **supporting references**, then explicitly select/reject the
scoring subcriterion and explain the proposed operation's connection in notes.
References alone do not award points, multiply a criterion's points, certify
eligibility or change another route. The annex calculation still uses the
explicit scoring answers and the saved catalogue's combination rules/caps.
References and notes use the existing autosave: wait for **Saved to this
computer** before reloading, or use **Save now**. Save failures retain the draft
and offer retry. These references are included in alternatives and exports.

The strategy names **five innovative themes and twelve innovative aspects**.
It explicitly chooses these instead of designating innovative economic sectors;
IN.1.1 therefore explains that no sector list is designated in this edition.
Do not turn a general opportunity into an innovative sector claim. Broader
consultation priorities and contextual social needs are labelled accordingly;
users must check their operation against the cited passage.

Use **Explore EDL for …** inside a node to search related content, or
**Explore AL20 EDL** at the top of Funding Navigator for all topics. Switch the
scope to search across the library. Search matches English, Spanish keywords
and codes; the PDF viewer searches the full strategy. Source links open the
existing viewer at the cited page. Escape closes the PDF first, then the
explorer, returning focus to the triggering control. Explorer search/expansion
is transient; supporting-reference selections are saved per funding route.

The source is stored as **FUND-013**, AL20 EDLL 2023–2027, V1 (19 November 2024).
The content library is separately versioned and hash-checked. Existing saved
scoring snapshots remain unchanged; additional catalogue citations enter an
editing copy through the existing reviewed catalogue-update workflow. Missing
or incompatible strategy content shows an error and retry instead of an empty
list. See [FUNDING_EDL.md](FUNDING_EDL.md) for coverage and maintenance rules.

## AL20 annex assessment — catalogue edition 3

Question 19 is **AL20 selection assessment**. Open it in Graph to expand its
branch, select a funding route and expand criterion groups. Clicking a
subcriterion opens the existing floating editor. Funding options remain in their
column; expanding the annex creates space in the Route requirements column. Collapse
and route switching preserve answers. Your answers lists all five route scores
with a direct **Open in graph** action for each route.
Each expanded level is indented: assessment → route → criterion group →
subcriterion. Branch lines connect each child to its parent; narrow columns keep
subcriterion nodes readable while funding options retain their positions.

Three aid-line profiles cover 1.11, 2.6, 2.7, 3.4 and 3.5. Each route has its
own answers, even when two routes share a profile. The working option selects the
route when supported; otherwise choose one explicitly. Location answers can be
calculated through the explicit provisional lookup described below. No answers
are inferred from plants, applicant descriptions or environmental labels.

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
above comparison. Its sources open FUND-010 PDF pp. 10–11 and Annex I pp. 113/126.
The 539-person AL20 median is labelled **2025**, not a verified 2023 threshold:
the local table says 2023 while the later guide refers to the latest figures.
Confirm the applicable year with AL20. Uncertainty can remain an unanswered
selection; using the 2025 lookup is an explicit provisional scenario assumption.

### FUND-010 content and application evidence review (1 November 2026)

The supplied guide was already stored and registered as **FUND-010**,
[LEADER Selection Criteria Verification Guide, v2-4](../doc_library/FUND-010%20-%20Andalusia%20-%20LEADER%20Selection%20Criteria%20Verification%20Guide%20-%20v2-4%20-%202026-09.pdf).
The upload, canonical file and official download have the same SHA-256
`1d42e43cd509d13398431b431b91aeed154b601cc8279eabd405b4b9682fd326`.
The 231-page PDF is version 2, public version 4; the cover's drafting date is
11 September 2026. The
[Junta publication page](https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/areas/desarrollo-rural/tramitacion-ayudas-dr-2023-2027/paginas/ayudas-leader-intervencion-7119-2-promotores.html)
lists it as 25 September 2026. The
[direct official PDF download](https://www.juntadeandalucia.es/sites/default/files/inline-files/2026/10/Guia-instrucciones-especificas-publicas_Criterios-seleccion-promotores_7119-2_LEADER_v2-4.pdf)
was verified against the local edition on 1 November 2026. It is already in the
library, not a document awaiting addition.

The guide explains how to interpret and verify the promoter selection criteria
in Annex II of the Order of 3 February 2026, Intervention 7119.2. It covers
territory, operation quality, economic factors, demography, climate, employment,
training, gender equality, inclusion, youth, innovation, rural heritage,
applicant profile and public services. Criterion sections specify supporting
documents, definitions and control methods, often distinguishing **CadmSA**
(administrative control of the aid application), **CadmSP** (administrative
control of the payment application) and subsequent controls. PDF pp. 5-6 explain
scope and scoring combinations; seven annexes supply population, masculinised
sectors, depopulation, ageing, business counts, agricultural area and
exclusive/cumulative relationships (Annex VII, PDF pp. 218-231).

For AL20, combine the guide's verification methods with **FUND-004** for local
selection and points, **FUND-008/009** for governing rules and the call, and
**FUND-013** for strategy evidence. A regional criterion is not automatically
selected locally, and a score does not establish applicant or expense
eligibility. The guide itself calls itself orientative (PDF p. 5).

**Already implemented:** five route assessments (1.11, 2.6, 2.7, 3.4, 3.5),
three local scoring profiles, source-linked exclusive/cumulative calculations,
population/business lookups, and strategy references/notes for EDL-dependent
answers. These are self-assessments. Strategy references are not certificates
from the GDR, and existing notes do not constitute a staged evidence checklist.

**Proposed next use:** attach a source-backed evidence checklist to each
selected subcriterion, retaining separate application, payment and later-control
requirements. Let users record the responsible person, document reference,
planned action and outstanding evidence. Keep self-assessed points and evidence
readiness separate; missing proof must remain visibly unresolved. Produce an
application-preparation export with criterion codes, source pages, project
explanations and missing documents. This review does not implement those features
or change scoring, saved assessments or catalogue editions.

| Example | Guide evidence and app implication |
|---|---|
| Rural/environmental heritage, **PT.1**, relevant to the current 3.4/3.5 profile | PDF pp. 104-105 distinguish project/memorandum requirements from completion certificates, reception records, photographs and dissemination evidence. A restoration proposal could use these to plan its application and delivery record, subject to the particular subcriterion and route conditions. |
| Innovation, **IN.1** | PDF pp. 103-104 require justification from the instructing GDR against the applicable strategy. The app can link the claimed innovative theme/aspect and flag the GDR justification as outstanding; a sensor or novel planting design alone does not establish this criterion. |
| Strategy needs, **CO.1** | PDF pp. 16-17 connect the operation to prioritised needs and the assessment process. Existing EDL references can support a draft explanation; an application's own note must not be presented as the authority's confirmation. |
| Population/business criteria, **AT.3/RD.5** | Preserve the current explicit lookup and provenance. PDF pp. 10-11 require the relevant settlement population, not an invented settlement list or an unnoticed municipality substitution. Existing year/benchmark discrepancies remain documented below. |
| Environmental actions, **CC.8**, and water savings, **CC.4** | PDF pp. 40-46 and 52-56 are useful contextual evidence examples, but neither criterion appears in the app's current AL20 profiles; do not add their points. CC.8.2 specifically requires publicly owned parcels and maintenance commitments (PDF pp. 53-54), so it cannot be assumed to cover planting on a private finca. |

For an illustrative dryland restoration demonstrator, a useful preparation pack
could therefore link the selected PT.1/IN.1/CO.1 claims to a baseline and intended
outcomes, the relevant AL20 strategy passages, technical documents required by
the claimed subcriterion, and planned delivery evidence. This is a product
recommendation, not confirmation that a specific site, applicant or project is
eligible or that every listed criterion can be combined.

### Population and business lookup

Open AT.3 or RD.5 in the graph editor. **Population and business lookup** starts
with the existing municipality choice where it matches the database. Choose a
municipality, then **Set AT.3 and RD.5 from this location**. The lookup calculates
both criteria for the current route and autosaves their selections and setup.
Changing that lookup municipality recalculates the criteria still in automatic
mode. Other routes retain their own setup and answers. Notes/references survive.

AT.3 initially leaves the settlement population unconfirmed. Enter the actual
núcleo name and its 2025 population, or explicitly choose the municipality total
as a provisional proxy. The guide does not provide settlement counts, so the app
does not fabricate a list of núcleos. A different source year needs manual answers.
After entering settlement details, apply the lookup. A population below 539
selects AT.3.1; otherwise one below 2256 selects AT.3.2; equality does not qualify.
Only one alternative is selected. Published criterion points remain unchanged.

RD.5 uses **businesses < 60**, the published ZRL average, not its median of 21.5.
Using it asserts that the operation supports the selected municipality; location
alone does not certify that support. Manual editing of a selection switches only
that criterion to manual. **Use manual answers** also detaches its automatic
relationship while retaining the current answers. Reapplying the two-criterion
lookup explicitly replaces both selections. Provisional lookup labels appear in
the graph and score; these do not resolve the official reference-year discrepancy.

`scenarios/funding-al20-statistics-v1.json` is the immutable, versioned database
of all 32 municipalities, their published population/business counts, and separate
population/business means and medians. It cites FUND-010 pp. 113, 126, 181–182,
including the stored document hash. All values are labelled 2025. Its published
rounded means are preserved as printed, rather than replaced with recalculations.
The full table and source links are inspectable from each lookup editor.

Funding draft v4 has an explicit optional `selection_assessments[route].location_lookup`
v1 contract: absence means manual/historical assessment; no fields are repaired or
inferred during loading. Opting in stores the dataset ID/hash, settings and list
of automated criteria. Backend validation recomputes automatic selections and
rejects inconsistent answers or missing/incompatible data. Dataset editions must
remain available unchanged for replay. Ordinary loading and catalogue updates
never opt in, alter saved alternatives or change historical manual scores.

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

Both strategy extracts and the full publication page are also linked in every
other EDL-dependent criterion: IN.1, PS.1, IG.8, IG.11, DRI.3, JR.3 and PT.1,
where present in that aid-line profile, and in the 2.6 funding-option research
description. For innovation designations, cross-cutting objectives or specific
actions not covered by the extracts, verify the exact provision in the full EDLL.

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
are filtered by activity; unknowns remain unknown. Funding options are browsed
across all activities, so activity tags never hide alternative routes. Search,
family, shortlist and explicit conflict filters remain available.

An active draft autosaves outside simulation history. **Save exploration** creates
a named alternative. Load and edit its name/settings to **Update saved exploration**,
or use **Duplicate exploration** and save a new alternative. **Use this funding plan**
requires a review and records the preferred provisional plan for the activity.
Revisions retain previous adopted plans. No exploration, save or adoption changes
simulation cash, time, ownership, organisations, employment or grant decisions.

Answers, annex selections and notes autosave **1.2 seconds after the last edit**
while Funding Navigator is active. That interval starts the save request; the
visible **Funding save status** changes to **Saved to this computer** only after
Python confirms persistence of the current draft. Wait for that status before a
browser reload, or use **Save now**. A failed request shows an error and explicit
retry. If newer edits exist when an older request is retried, the older save
cannot mark them saved: the newer draft remains pending and autosaves separately.

Opening **Explore funding** from the same demonstrator or parcel resumes its
saved draft, including notes and annex answers. Opening a different activity or
parcel retains the current draft and shows a choice: continue it, or preserve it
as a named alternative before opening the requested exploration. A draft already
identical to a named alternative is not duplicated. Project navigation flushes
pending funding edits before leaving. **Save exploration** remains useful for
named checkpoints; it is not required for ordinary draft autosave.

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

**Graph is the funding workspace**. The Matrix view and its view toggle have
been removed. **Your answers** retains the route-by-route AL20 score summary and
direct graph navigation; **Compare alternatives** remains available for saved
explorations. Affected nodes carry text markers and highlights. Opening a funding
option shows persistent detail with before/after condition results and exact PDF
citations. Conditions
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

Catalogue order, browsing filters, shortlist and source viewing are retained
during input changes. Compact view pages up to 12 options in
the selected programme’s displayed routes. **Expand view** removes the internal height limit and shows
all nodes in that scope using page scrolling; **Compact view** restores its
scroll position. Click **Expand node area** above the canvas or **Expand node
area completely** on the bar below it to reveal the full height of all displayed
nodes. Click **Collapse node area** to restore its compact height and previous
scroll position. These buttons support Enter/Space and retain the current option
page and filters. Expansion is retained while editing and changing requirement scope,
and is not saved with the assessment.
Phones use an expandable visual panel, a scrollable graph and compact editors.
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
Run `node tests/browser/funding-visual.cjs` for the graph, request-race, PDF focus,
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
phones disclose the actions per row. Graph shows the selected route’s
requirements needing attention, or their programme-wide union in comparison.
Question navigation and option inspection preserve their context. Comparison,
met grouping and amount-question controls change presentation only.
Circumstance nodes colour their linked Python conditions green (met), amber
(unresolved) or red (conflicting). Mixed outcomes across compared routes use a lavender
surface and a segmented green/amber/red rail with labelled result counts. The
working-option radio focuses colours and emphasised connections on one option.
Card/title clicks only open details; they never change the working option or
shortlist. Shortlist checkboxes are activated only through their inputs. The
working choice survives question navigation, paging, filters and
source viewing; the summary identifies when it is outside the displayed scope.
Its requirements remain available in the graph. Clearing it restores the
programme’s route choices without a questionnaire. This is session presentation state, reset by
loading another exploration or refreshing its context, and never saved/adopted
into funding records. Amount-only nodes label their monetary effect explicitly.
Clay selection outlines and changed-answer highlights retain the outcome colours.
Previous counts and reserved update/status slots prevent assessment/blur updates
from moving controls during clicks.

The People and land stop now gives the visual workspace its full width without
a static answer panel. Select a circumstance node, **Answer route questions**, or Edit
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

The four graph columns have three draggable, keyboard-accessible separators.
Only separators between two fully visible adjacent columns are offered. Minimum
widths preserve readable nodes; **Reset column widths** restores the initial
layout. Widths survive view changes within the workspace and reflow for narrower
windows; phones show one scrollable column at a time. Editor positions and column widths are presentation state
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
