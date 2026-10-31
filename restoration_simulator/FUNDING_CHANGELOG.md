# Funding Navigator changes

## 2026-11-01 — EDL content inside assessment nodes and shared explorer

- Added the full, hash-verified AL20 strategy as FUND-013 and a versioned library
  of 109 references across ten topics. EDL-dependent subcriteria now display
  relevant needs, activities and conditions with exact-page sources.
- Added optional supporting-reference checkboxes and a searchable EDL explorer,
  opened for the current node or all topics, with English summaries and Spanish
  source keywords.
- Included all 50 NPL needs, five innovative themes and twelve innovative
  aspects. IN.1.1 explains that no innovative sectors are designated in this
  strategy edition; contextual references retain their qualification limits.
- References autosave per route and survive alternative/export flows. They never
  award points, replace explicit answers or rewrite historical scoring snapshots.
  Missing/incompatible content fails visibly with retry.
- Added Python, frontend and isolated browser coverage. FUNDING_EDL.md records
  source download links, coverage and the edition-maintenance contract.

## 2026-10-31 — explore funding across all activities

- Removed the activity filter and its full-catalogue toggle. Funding options in
  the graph and matrix now remain browsable across activities, including all five
  modelled AL20 routes. Search, family, shortlist and conflict controls still apply.
- Activity tags, eligibility calculations and saved catalogue snapshots are
  unchanged.

## 2026-10-31 — clearer hierarchy for expanded annex nodes

- Indented the route, criterion groups and subcriteria in successive levels,
  with up to 32px per level and readable widths in narrow columns. Node right
  edges stay within the circumstances lane and funding-option positions stay fixed.
- Branch lines now connect children to their actual parent, including the
  assessment-to-route connection; siblings no longer appear as a chain.

## 2026-10-31 — strategy links in every EDL/EDLL node

- Checked all 14 matching annex definitions across the three profiles. CO.1,
  IN.1, PS.1, IG.8, IG.11, DRI.3, JR.3 and PT.1 now link both official strategy
  extracts (prioritised needs and objectives/needs by aid line) and the full EDLL
  publication page wherever applicable. Three CO.1 definitions already linked them.
- Added the same links to the 2.6 funding-option research description and made
  its research URLs clickable. Guidance distinguishes the extracts from any
  additional provision requiring the full strategy. Scoring remains unchanged;
  saved snapshots receive these additions only through a reviewed update.

## 2026-10-31 — completely expand or collapse the funding node area

- The bar below the graph is a click-to-expand/collapse button. It reveals the
  complete node-area height, including on portrait screens; collapse restores
  compact height and scroll position. An equivalent control sits above the canvas.
- Removed vertical dragging, incremental resizing and reset controls. Buttons
  support Enter/Space. Expansion remains transient and does not change the option
  page, filters, answers or funding evaluations.

## 2026-10-31 — AL20 municipality statistics and explicit location lookup

- Added a source-cited database of all 32 AL20 municipalities: 2025 population,
  business counts and separate ZRL/Andalusia benchmarks from FUND-010.
- AT.3/RD.5 editors can populate their selections from a chosen municipality.
  Actual settlement counts remain explicit inputs; municipality totals require
  an explicit provisional-proxy choice. RD.5 uses the published mean of 60.
- Lookup setup is route-specific and persisted with an immutable dataset hash.
  Existing assessments remain manual until explicitly enabled. Manual overrides
  detach only the changed criterion; notes/references are preserved. Provisional
  labels and reference-year discrepancies remain visible.
- Added authoritative lookup API validation, boundary/override/isolation and
  persistence checks, plus isolated browser coverage of the complete workflow.

## 2026-10-31 — explain ZRL in annex nodes

- Expanded ZRL as Zona Rural LEADER and identified the AL20 territory in all
  affected criterion explanations (AT.3, RD.5, PE.1, PS.1 and JR.3 as applicable).
  AT.3 explains the territorial population median; RD.5 distinguishes business
  counts and the mean/median terminology. Scoring and original wording are unchanged.

## 2026-10-31 — AT.3 Andalusian median source

- Added the FUND-010 page 126 document-viewer link to AT.3 in all three profiles,
  labelled separately from the AL20 ZRL median on page 113. Existing assessments
  receive the added source through the reviewed catalogue update.

## 2026-10-31 — resume saved answers from direct funding entry

- Fixed demonstrator/parcel **Explore funding** entry replacing a matching saved
  draft with a fresh context. Matching entries now resume answers, annex choices
  and notes; a different context offers explicit preservation as a named alternative
  before switching.
- Exposed save status and **Save now** beside the funding workspace. Autosave
  starts after 1.2 seconds without an edit and confirms success after Python writes.
  New drafts remain pending until actually saved; Project navigation flushes edits.
- Fixed retries of older failed requests marking newer edits saved. Only the
  exact saved snapshot clears the dirty state; newer edits then autosave separately.

## 2026-10-31 — CO.1 strategy links

- Added the official ADR Alpujarra EDLL 2023–2027 version-1 publication page
  to CO.1 in all three profiles, together with verified direct PDF links to
  prioritised needs (section 4.3) and objectives/needs by aid line (section 5).
- Guidance identifies the NPL codes, distinguishes prioritisation ranks from
  CO.1 selection points and asks users to record the applicable evidence.
  The links are external; no document was imported into `doc_library/`.

## 2026-10-31 — AT.3 population lookup guidance

- Added INE lookup steps and a clickable link to AT.3 in all three profiles,
  distinguishing settlement population from the whole municipality and median
  from average. The 539-person reference is explicitly labelled as the 2025
  Annex I value, not a verified 2023 threshold; the year discrepancy requires
  AL20 confirmation. Guide links open PDF pages 10, 11 and 113.
- Added a reviewed version-1 guidance adapter: wording, limitations and additional
  criterion citations can be updated while retaining all answers. Scoring changes
  and removed/changed original citations still require a separate migration.

## 2026-10-31 — catalogue edition 3 / draft version 4

- Replaced question 19's manual total with route-specific AL20 annex assessments
  in the existing graph. Groups expand into subcriterion nodes; the floating
  editor handles selections, optional references and notes.
- Added three local profiles (17, 16 and 14 criteria) for all five supported
  routes. Points/caps come from FUND-004; combinations from FUND-010 Annex VII.
  Source editions and page references travel with saves.
- Added exact decimal calculations, exclusions, dependent additions, capped sums,
  employment confirmation and strict grant-per-job bands. Unknown inputs stay
  unresolved; supporting references do not certify claims.
- Preserved old evaluation and saved snapshots. Explicit catalogue updates retain
  manual totals as historical information and start unanswered annex assessments.
- Documented the source limitation for part-time employment graduation. No
  proportional formula is invented; the documented duration/UTA basis is required.
- Added arithmetic, failure-path, migration, persistence, layout and browser checks
  covering source focus, route switching, failed saves and phone views.
