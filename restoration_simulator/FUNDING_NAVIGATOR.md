# Funding Navigator

## Four areas, project overview and autosaved versions

The current interface has **Explore and score**, **Project overview**, **Activities
and delivery**, and **Budget and review**. The version name, programme, working
route and save status are visible above these areas. Activity/site setup and
**Project context** replace the former Activity and People and Land pages.
Returning to a version with an explicitly selected programme and route opens its
overview; a version without that focus opens the graph. Shortlisting is a separate,
labelled checkbox on each graph route card, used for optional funding contributions.

**Project overview** is available before creating a concept or reaching the score
threshold. It groups selected items by criterion, shows full item titles, nominal
points, capped contributions, notes, activities and details to add. Each subnode
shows all its selected EDL references in an initially expanded, collapsible blue
section, with their full titles, explanations and source-page links. The count
remains visible when collapsed. Items with supporting references remain in the
overview even when not selected for scoring; their unticked score control makes
that distinction explicit. Repeated references remain attached to every subnode
where they were selected, including in the readable overview, print and Markdown.
Choose **All items** to add selections. Checkboxes use the same prerequisite and
replacement confirmation as individual graph editors. Reading guidance, opening
the overview and linking EDL needs never select items or create activities.
The readable overview, print view, Markdown and concept brief use the same backend
scoring-overview builder. Strategy references are listed separately from grant points.

Selection-library **version 3** uses `selected_items_only`. Unticked items contribute
zero without explicit rejection answers. Its authoritative defaults create false
selections and excluded calculations. Calculation criteria carry the required
`calculation_included` boolean: turning it off retains the entered inputs and adds
zero; turning it on requires its calculation inputs. Selected employment items
retain their qualification rules. The subtotal is always visible, while missing
inputs for included items prevent a completed result. The version-1 and version-2
evaluators remain frozen in their dedicated modules.

Each named version autosaves. Use the header picker to open one, **Duplicate
version** to explore independently, and **Compare versions** to compare two versions
of the same or different routes without shortlisting. Duplication preserves content
and remaps concept/activity identities and delivery links. Comparison uses each
version's own scoring edition. Adopted plan history remains immutable; revising a
plan creates a new editing version. Switching waits for pending edits to save.
Failed or stale saves retain the draft; recovery returns it to its original version
when another window has changed the active version.

Existing workspaces require **Review workspace update**, followed by confirmation.
The preview preserves old alternatives and imports the working draft as a distinct
active version; matching titles are never used to identify records. Existing
unselected null answers remain stored unchanged and mean not selected under the
reviewed version-3 policy. Existing calculation inputs are shown in the preview:
calculations with any entered input are included, and empty calculations are
excluded. Older editing formats have a separate explicit applicant-format review.
Opening a historical version does not automatically rewrite it.

**Activities and delivery** directly exposes the route-3.4/3.5 concept editor,
activity starters and monitoring/sharing plan. No concept is created merely to
display the overview. Six individual review ticks have been replaced by the
execution comparison and confirmation; existing review flags remain audit metadata
and are recorded when execution settings are applied. **Current simulator settings**
in demonstrator planning displays retained execution values rather than another
editable planning form. Transfer and two-way reconciliation remain explicit.

### Current interfaces and compatibility

- `POST /api/funding/overview` accepts `revision`, the current `draft`, and `route`.
  It is read-only and returns grouped scoring items, points, notes, EDL references,
  activity/delivery summaries, source links, details to add and deterministic Markdown.
- `POST /api/funding/workspace-preview` accepts `revision`, `draft`, and a new
  `version_id`. Its comparison hash is required when confirming `upgrade_workspace`
  through the existing funding-save service.
- Funding-attachment version 2 adds `active_version_id`. It identifies a saved
  scenario; its draft and the active working draft must agree. Null explicitly
  means no active version and requires a null draft. Version-1 attachments remain
  readable without inferred identities or upgrades.
- Logical applicant questions expose the complete `forms` list from the version's
  catalogue. The neutral applicant-type picker includes nonprofit and public-body
  forms; source identities and earlier applicant choices remain retained.
- Funding-save operations add `activate`, `duplicate`, `create_version` and
  `upgrade_workspace`. The request UUID is the new identity for create/duplicate,
  making retries traceable. Existing revision checks, receipts and atomic writes
  remain authoritative. Confirmed concept synchronisation updates the active named
  version in the same write. The outer export envelope and concept editions remain
  compatible.

Confidence badges and assumption counts are removed from the current presentation.
Blank inputs use **Not entered**; original provenance remains in expandable source
context. Official restrictions and documentation requirements remain available.
Missing configuration, malformed responses, missing version records and failed I/O
produce visible errors and explicit retry, retaining the draft.

The isolated usability workflows are `navigator-versions.cjs` (an exported copy of
AL20 Alhama) and `navigator-graph.cjs` (all five AL20 assessments and another programme).
`navigator-legacy.cjs` additionally checks reviewed editing-format conversion.
`overview-edl.cjs` checks every EDL-bound subnode, all 50 needs, independent
unscored references, collapse/keyboard controls, source pages, edits/reload,
invalid response/retry and phone themes using a fresh isolated fixture.
Their API guard requires port 8013. They must never mutate the live port-8000 project.

## Remembered programme and working route

Selecting a programme or working route now autosaves that focus with the active
exploration. Returning to Navigator, reloading, loading a saved alternative or
duplicating it restores that exploration's choices. Clearing the working route
keeps its programme selected. These navigation choices do not shortlist a route,
select scoring answers or change points.

Editable drafts may carry optional `navigator_focus` version 1 with explicit
`programme_id` and `route_id` values (each may be null; a route requires its
programme). Absence means no focus was saved; earlier choices are not inferred.
Saved focus is validated against the exploration catalogue and registered
programme membership, retained by export/import and catalogue review, and uses
the existing revision-checked autosave/retry workflow. Historical records without
this field remain unchanged. Unavailable/incompatible reference data produces a
visible error rather than silently clearing a saved choice.

## Shared delivery planning, capped criteria and pinned headers

The project concept now includes **Monitoring, participation and sharing** for
routes 3.4 and 3.5. Create an unresolved plan explicitly, or choose **Review
existing planning values** and inspect both the retained execution values and
their proposed interpretations before adopting them. Imported topics remain
retained with their original audit metadata. Applying them now uses one execution
comparison and confirmation. Existing committed records and replay remain unchanged.

The shared plan covers comparison design, local novelty, combined baseline and
follow-up methods, participation/public use, results sharing and online publication.
Novelty and the three-year online-publication commitment are 3.4-specific; the
publication topic appears within results sharing. Comparison is optional for 3.5.
Monitoring may combine photographs, plant inventory/survival, vegetation cover,
erosion notes, infiltration and a custom method. These are intentions, not measured
data or complete ecological protocols. Each topic has explanations,
references and links to existing activities; sharing also records outputs,
responsibility and publication location/timing. Earlier topic-review flags remain
audit metadata rather than separate editing requirements.

The same plan appears in both workspaces and the deterministic brief. Reviewed
two-way updates reconcile individual topic fields. Activity duplication remaps
planning links; explicit activity removal shows and removes affected planning
links and marks those topics for review. The legacy settings are shown as an
execution snapshot rather than a second editable project plan. Existing own/partner
simulations retain a clearly labelled standalone-settings path.

In demonstrator planning, **Review execution settings** compares the reviewed
delivery plan with current execution inputs. Nothing changes until confirmation.
When combined monitoring cannot fit a legacy dropdown, choose a primary supported
execution method; all monitoring intentions remain in the concept and applied
snapshot. Unsupported custom mappings are explicit blockers. A generic heritage
public-use intention is not silently converted into scheduled visits. A 3.5 concept
cannot retain 3.4 simulator financing without resolution: choose supported own/
partner funds explicitly or leave execution unchanged. No new grant mechanism is
introduced. Applied snapshots identify later differences; detaching their tracking
link is explicit and preserves current execution inputs/history.

Related scoring selections now show an inline confirmation directly above the
affected dropdown. The proposed value stays visible as **Awaiting confirmation**;
points and accepted answers remain unchanged. Added prerequisites use amber;
removals/replacements use red. Confirm the related changes together or keep the
current answers. Previous/Next waits for this decision, while closing cancels the
unconfirmed proposal. Notes and references entered during review are retained.

Historical selection-library **version 2** counts a valid capped criterion as complete for
scoring even when additional options remain unanswered. It displays **Maximum
reached**, and unanswered siblings become **Optional for points** without changing
their saved answer. Required employment/calculation conditions cannot be bypassed.
Reaching 60 overall does not complete other unresolved criteria. Evidence readiness
remains separate. Existing version-1 assessments retain their original evaluator;
the current explicit upgrade adopts version 3 as described above. Its preview
shows the resulting completion/count changes without altering point values.

The Node area has one pinned row for **Exploration**, **Programme**, **Route
requirements** and **Funding routes**, aligned with horizontal scrolling and column
resizing. It remains visible during compact node scrolling and expanded page
scrolling, with existing theme colours and layering beneath editors/source viewers.

`funding-delivery-plan-v1.json` is a separate validated library so the retained
starter-library checksum does not change. Concepts optionally contain version-1
`delivery_plan`; absence means no plan has been adopted. Planning drafts optionally
contain `applied_delivery_plan`, preserving its delivery/activity and execution
snapshots. Existing export envelope and concept versions remain supported.
New services are `GET /api/funding/delivery-plan-guide`, read-only
`POST /api/funding/delivery-plan/prepare` and
`POST /api/demonstrator/delivery-plan-preview`, plus reviewed
`POST /api/demonstrator/delivery-plan-apply` and explicit
`POST /api/demonstrator/delivery-plan-detach`. Mutations use project/funding/planning
revisions, request identities and atomic persistence; apply also validates the
comparison hash. Failures retain drafts with explicit retry/recovery.

## Project concepts and individual scoring items

Every selectable sub-node in all five AL20 assessments opens its own floating
editor. The answer, item notes, supporting reference, Information disclosure,
EDL selections and sources belong to that item. **Previous item / Next item**
navigates siblings without changing answers; closing returns focus to the
original graph node. Earlier criterion notes remain editable under **Shared
criterion context**. Caps, exclusions and general guidance are collapsed.
Employment confirmations are criterion-wide; ratio nodes retain their calculation
editor. An exclusion or prerequisite change shows the affected items and requires
confirmation before applying all answer changes together. Criterion-wide zero/reset
controls live outside the individual editor under **Criterion-wide assessment tools**.

Select assessment route **3.4 or 3.5**, then expand **Project concept**. It is
available before or after reaching 60 points. Explicit creation brings previously
selected EDL needs into a starting objective list; the review and brief retain
selected claims, references and shared/item notes as context. NPL3, NPL4 and NPL8
are suggestions, with no preselection unless already chosen as EDL references.
Each route retains a separate concept. Duplicating an exploration explicitly
creates fresh concept and activity identities; loading an alternative retains its
identity. Adopted funding-plan snapshots are never rewritten by concept updates.

Set a title, purpose and context/assumption notes. Recorded/provisional applicant
and site context comes from the funding exploration; use the existing funding
questions and reviewed baseline refresh to change those facts. Include curated
starters with **Include activity**, or create an activity manually. One activity
can support several needs/claims; link an existing activity instead of duplicating
it. Activities have descriptions, intended outcomes, responsible organisations,
timing, evidence plans and supporting references. Empty text explicitly means
unassigned during exploration. Population, grant history and similar factual
criteria have evidence tasks instead of invented point-earning activities.

The item editor’s **Activities linked to this item** section offers the same
starters, links and justification field. Deselecting a scoring answer never removes
an activity: the review flags the inactive link. Unlinking or deleting work requires
an explicit action. Score completeness, concept gaps and evidence readiness have
separate labels. NPL15/NPL18 retain an AL20 confirmation question about the line-3
mapping; priority ranks are not grant-selection points.

**Readable project brief** uses a deterministic server-generated Markdown document
in either workspace, with print view, Markdown download and page-specific sources.
Missing details remain visible. No external AI service or invented narrative is
used. This is an exploratory project concept, not a completed application.

**Review transfer / update both copies** first compares the Navigator proposal
against an absent demonstrator copy. Confirming creates an independently editable
copy under **Project concept and activities** in demonstrator planning. Subsequent
edits stay local. The next review compares both copies with their last agreed
baseline, suggests straightforward changes and requires choices for conflicts or
removals (including edited-versus-deleted activities). Confirmation writes the
agreed concept to both workspaces atomically. Matching titles do not merge identities.
Different routes or funding alternatives retain separate copies. To remove a linked
source, explicitly unlink its demonstrator copy first, or retain a named alternative.
Parcel removal/Undo that would discard linked concepts is blocked with affected
titles until the links are resolved. Concept transfer does not change planting,
prices, simulation history or financing; in particular it never enables an
unsupported route-3.5 simulation mechanism.

Concepts and annotations autosave with visible status. Failed requests retain the
draft and offer retry; stale transfer comparisons must be refreshed and reviewed.
The demonstrator editor offers explicit revision refresh while keeping its draft.
Keep the owning exploration active when synchronising; missing origins cause a
clear error rather than selecting another concept.

### Reference and save contracts

`scenarios/funding-project-concept-v1.json` centrally defines defaults, limits,
UI timing, route applicability, source editions and 95 explicit bindings (45
subcriteria plus 50 prioritised needs). Every binding provides starters, an
evidence-only explanation or manual-entry instructions. Route-specific restoration
advice is retained for 3.4 demonstration versus 3.5 heritage recovery.

Funding draft v4 optionally contains `project_concepts`, keyed by route. Planning
draft v1 optionally contains a `project_concepts` list of `{concept, baseline,
source}` records. Concepts are version 1, bound to a library checksum, with UUIDs
for the concept and each activity. Criterion rows optionally contain
`choice_context: {version: 1, items: {subcriterion_id: {notes, reference}}}`.
Absence means nothing has been created; an empty collection means it was explicitly
cleared. Historical saves and scoring snapshots acquire no inferred fields.
Export envelope v8 preserves these validated optional fields. Unknown versions,
missing bindings/sources, incompatible editions and malformed records are rejected.

Read-only reference/draft services: `GET /api/funding/project-concept-guide`,
`POST /api/funding/project-concept/create`, `/preview`, `/transfer-preview`, and
`POST /api/demonstrator/project-concept/preview`. Reviewed mutation:
`POST /api/funding/project-concept/transfer`; local edit/unlink:
`POST /api/demonstrator/project-concept`. Mutations require project, funding and
planning revisions plus a request identity; transfer additionally checks the
comparison hash. Storage receipts make identical retries idempotent.

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

**Further proposed use:** attach a source-backed evidence checklist to each
selected subcriterion, retaining separate application, payment and later-control
requirements. Let users record the responsible person, document reference,
planned action and outstanding evidence. Keep self-assessed points and evidence
readiness separate; missing proof must remain visibly unresolved. Produce an
application-preparation export with criterion codes, source pages, project
explanations and missing documents. The node guidance described below provides
the official requirements and evidence instructions; an editable evidence
checklist and preparation export remain future work. Scoring, saved assessments
and catalogue editions are unchanged.

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

### Restoration guidance inside scoring nodes (routes 3.4 and 3.5)

Each of the **45 subcriteria across 14 criteria** has official explanations,
restoration relevance, practical illustrative recommendations, application and
payment evidence, later-control guidance and questions to confirm with AL20.
Open a scoring sub-node in the graph: **Requirements and restoration
recommendations** opens for that choice; the other choices remain expandable.
Evidence and original Spanish wording have their own disclosures. Existing EDL
references remain alongside this guidance and retain their separate selections.
Each choice also has an **Information** disclosure that collapses all its
guidance, EDL references and sources together. Its label, points and answer
control stay visible. Only the choice opened from the graph expands initially;
collapsing information never changes an answer or clears supporting references.
Disclosure state is temporary within the editor, not part of a saved assessment.

Recommendations use the route selected in **AL20 assessment route**, not an
inferred applicant or site classification. The library stores 45 shared
recommendations once and two additional route-specific recommendations for
relevant needs, innovation and heritage nodes: 3.4 demonstration design versus
3.5 heritage recovery. The official route conditions explain the overarching
requirements and exclusions, including 3.5's exclusion of standalone events.
Factual criteria explain how to verify the facts; limited-fit criteria such as
business creation or proximity services explain why a restoration activity must
not be relabelled to claim points. IN.1.1 explicitly records the absent EDL
sector designation. No new guidance is shown for the other three scoring routes.

This is **current dated reference information**, served separately from saved
assessment snapshots by `GET /api/funding/selection-guidance`. The authoritative
content is `scenarios/funding-selection-guidance-v1.json`. It contains no point
values: displayed points, criterion caps and combination constraints come from
the existing assessment. Reading guidance never selects answers, awards points,
adds evidence annotations or changes notes. There is no automatic project
recommendation or path-to-60 calculation in this release.

Every content section and recommendation identifies source pages and PDF
editions. All five official PDF downloads were rechecked byte-for-byte against
the registered local copies on **1 November 2026**; no PDF was added or changed:

- [AL20 selected scoring criteria — Junta de Andalucia, signed 2026 (FUND-004), direct PDF](https://www.juntadeandalucia.es/sites/default/files/inline-files/2026/03/Listado%20criterios%20AL20.pdf).
- [LEADER governing rules — Junta de Andalucia, Order of 3 February 2026 (FUND-008), direct PDF](https://www.juntadeandalucia.es/eboja/2026/29/BOJA26-029-00163-1654-01_00332877.pdf).
- [Non-GDR applicant call — Junta de Andalucia, Resolution of 13 April 2026 (FUND-009), direct PDF](https://www.juntadeandalucia.es/eboja/2026/76/BOJA26-076-00061-5258-01_00336495.pdf).
- [Verification guide — Junta de Andalucia, v2-4, drafted 11 September/listed 25 September 2026 (FUND-010), direct PDF](https://www.juntadeandalucia.es/sites/default/files/inline-files/2026/10/Guia-instrucciones-especificas-publicas_Criterios-seleccion-promotores_7119-2_LEADER_v2-4.pdf).
- [AL20 EDLL 2023-2027 — ADR Alpujarra, V1, 19 November 2024 (FUND-013), direct PDF](https://drive.google.com/uc?export=download&id=1OafTeCsmgjmGcOzNumeyZvvFyW6_pLpK).

The [official AL20 listing](https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/areas/desarrollo-rural/tramitacion-ayudas-dr-2023-2027/paginas/ayudas-leader-intervencion-7119-2-promotores-al-al20.html)
links the local criteria and strategy; the
[promoter listing](https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/areas/desarrollo-rural/tramitacion-ayudas-dr-2023-2027/paginas/ayudas-leader-intervencion-7119-2-promotores.html)
links the April call and September guide. The original
[governing-order publication](https://www.juntadeandalucia.es/boja/2026/29/1)
supports the reviewed route text. Publication/download links, editions and review
notes are available inside **Source editions and official downloads**.

Known population discrepancies remain explicit: local 2023 wording versus the
2025 annex, and the guide narrative's Andalusia median of 2,497 versus its annex's
2,256. JR.3.2 also flags the guide's older dual-training legal references for
confirmation. The app does not resolve these conflicts by choosing favourable
values. Missing or incompatible content produces an error and **Retry selection
guidance**; existing scoring answers, notes and strategy references are retained.

Maintenance: retain stable subcriterion IDs and explicit recommendation route
lists; review sources before publishing a new dated edition. Backend and frontend
validation require complete coverage, applicable recommendations and valid
source IDs/pages/checksums. This reference library is not persisted into drafts,
so it needs no save migration. Evidence state continues to use its existing
contracts. The broader fallback audit is not extended into a repository-wide
compliance claim by this work.

### Population and business lookup

Open an individual AT.3 or RD.5 item from the graph or project overview.
The comparison appears above its selection control. **Changing inputs previews
only**: it never changes answers, even if a previous lookup was applied.
The preview shows municipality, basis, reference year, numeric inequalities,
exclusive-band reasoning, current/proposed answers, criterion points and resulting
route subtotal. Exact source pages include both published figures and the rule.

Use **Apply business comparison to RD.5** or **Apply population comparison to AT.3**
to change that criterion alone. Expand the related comparison for an explicit
**Apply both criteria** action. Neither opening the panel nor applying one
criterion changes its sibling, another route, notes, references or activities.
An incomplete population basis blocks AT.3, while RD.5 remains usable.

AT.3 starts with an unresolved population basis. Enter the actual núcleo name and
its 2025 population, or explicitly use the municipality total. A municipality can
contain several settlements; the guide does not supply their counts. A different
source year needs manual answers. Population below 539 selects AT.3.1; otherwise
population below 2256 selects AT.3.2. Equality does not qualify. Only the strongest
satisfied band is selected; the points come from the selected scoring edition.

RD.5 uses **municipal businesses < 60**, the published ZRL mean, rather than its
median of 21.5. Alhama de Almería has 284 businesses: **284 < 60 → No**, so
RD.5.1 is not selected and contributes 0/15 on routes 3.4 and 3.5. Population does
not enter this decision. The operation must also support the municipality;
statistical location alone does not certify this official condition.

**Last applied result** retains each criterion's applied inputs and comparison.
Manual selection edits detach only that criterion while preserving its trace;
**Use manual selections** explicitly detaches without altering current answers.
Later input previews do not overwrite that record. The reference-year disclosure
retains the difference between the guide's 2025 tables and the criteria's 2023
reference, which needs confirmation. Applying the lookup does not resolve it.

`scenarios/funding-al20-statistics-v1.json` remains the immutable database of all
32 municipalities. FUND-010 pp. 113, 126, 181–182 supply counts and benchmarks;
published rounded means are preserved. Rules and page-specific source links are
available beside the comparison, with the full table in a separate disclosure.

Draft v4's optional `selection_assessments[route].location_lookup` now accepts
version 2: dataset ID/hash, per-criterion `items` with `settings` and
`before_answers`, plus `automated` identifying selections still following their
last applied result. Absence means no recorded lookup. Version 1 remains readable
unchanged. An explicit apply or manual-detach action converts its recorded
criteria; `before_answers: null` honestly retains its unrecorded previous answers.
An older unresolved AT.3 record remains intact. Loading never infers a history,
upgrades scoring, rewrites alternatives or changes saved point arithmetic.

`POST /api/funding/location-decision-preview` is read-only.
`POST /api/funding/location-apply` returns a validated draft candidate after checking
the comparison hash against current selections and score. Existing autosave performs
the revision-checked atomic write. Failure preserves inputs/answers and offers retry.
The legacy `location-preview` API remains available for version-1 records but rejects
replacement of version-2 history. Both frozen scoring editions retain their existing
calculators; the facade carries the new source metadata separately from arithmetic.

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
