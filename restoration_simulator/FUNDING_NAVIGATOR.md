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
  Draft version 2 derives an inherited legal form from the selected applicant's
  recorded type. An explicit legal-form override (including Unknown) takes
  precedence. Selecting an unrecorded/hypothetical applicant yields Unknown.
  Version-1 saved assessments retain their original evaluation semantics.
- `POST /api/funding/evaluate`, `POST /api/funding/plan-preview`: read-only assessment.
- `POST /api/funding/visualise`: the identical assessment plus transient, versioned
  condition dependencies and modelled/research-only coverage. Composite income
  checks explicitly include the income and SMI fields; startup bonuses are amount
  dependencies, separate from eligibility. It also returns transient applicant
  provenance and flags explicit form overrides that differ from the selected
  party's recorded type. Metadata never enters saved snapshots.
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

Questions use prominent labels and only specific explanatory help. Activity,
people/land, option browsing and budget steps share a native HTML/SVG graph and
matrix. The family selector includes counts for the entire catalogue. One family
or the explicit shortlist is shown at a time, with catalogue-order pages of at
most 12 options in compact view. **Expand view** shows all nodes/rows in the
current family or shortlist and removes the internal height limit, allowing page
scrolling. **Compact view** restores paging and scroll position. Inspection
reveals modelled dependencies, explanations and exact source editions; it never
selects funding. Research-only entries are labelled **Assessment not implemented**
and counted separately from **Needs your answers**. Conflicting modelled inputs
are labelled **Conflicts with current scenario**. These are presentation labels;
historical stored status values remain unchanged. The matrix and graph share browsing scope,
selection and Python assessments. Selecting a circumstance focuses its existing
question; conditions outside the current activity's question flow explain that
limitation without changing the activity or relevance filtering.

Help buttons explain the four outcome categories and the three change counters
on hover, keyboard focus or tap. They close on Escape/outside interaction, fit
inside phone viewports and leave the question and entered answers unchanged.
Inherited inputs are marked as not answered here and may include planning
defaults. The legal-form field explicitly identifies its selected-party source;
resetting an explicit legal-form override resumes that inheritance. Parcel
ownership never determines applicant form. Saved comparisons use the Python
assessment's facts, including derived form, rather than reconstructing them in JS.
Envelope 8 remains unchanged; the nested draft version preserves historical
snapshots while opening a separately upgraded editing copy with a visible notice.

Accepted responses are compared with the previous accepted response in the same
exploration. The feedback distinguishes fit, resolved conditions and conditional
amount/schedule changes, including multiple edits and unchanged overall fit.
Loading/duplicating an exploration or refreshing context resets this comparison.
Pending and failed requests retain an explicitly labelled previous assessment;
late responses cannot replace the current result. Retry preserves entered inputs.
No graph coordinates, transitions or dependencies are persisted, and envelope 8
requires no migration. On phones the visual panel expands below the question;
diagram/table scrolling stays inside the panel. Reduced motion is supported.

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
`funding-refinements.cjs` covers version-1 editing, selected-party inheritance,
explicit overrides/reset/reload, saved comparison facts, distinct assessment
categories, help interactions, expanded graph/matrix and direct demonstrator entry.
