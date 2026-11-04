# Four-layer Knowledge Explorer and readable topic details

Completed and verified on 4 November 2026.

Baseline revision: `9691a70c941f277d27970bc52cc9203ac31608b2`. Existing uncommitted
layout/popup changes were extended and preserved; unrelated `drone_irrigator/readouts/`
work remains untouched. No Git staging, reset or commit was performed.

## Presentation and ownership

The default Overview displays Sources → Knowledge → Rules → Projects. Its dashed,
labelled architecture connectors describe responsibilities and reviewed adoption;
registered aggregates retain their exact original edge identities/directions.
Projects is explicitly architecture context, with no project records or fabricated
zero count. Rules shows registered rule references and current assumptions, with
partial coverage explicit. No claim is presented as automatically executable.

Knowledge groups ecology, funding, research/systems, prepared examples, claims and
complete unresolved issues. All eighteen entity types are explicitly classified;
an unsupported classification is an actionable incompatibility error.

The independent presentation module consumes one validated snapshot. Display groups
have `view:` identities and are never sent to record/impact APIs. The original
198-node/516-edge collection, canonical identities, hashes, response versions,
feature memberships and rule owners remain unchanged. Registered aggregates account
for all original edges, including within-layer connections available for inspection.

PDF groups use exact document IDs/checksums, then passages and distinct citation
uses. Supplementary web records retain owner, checked date, finding and limitation;
equal URLs do not merge different contexts. Counts distinguish editions, passages,
citation uses and web references. No source was downloaded, reinterpreted or edited.

Topic detail starts with related-topic groups, collapsed claim categories and one
Sources group. Selecting a claim reveals/highlights its exact evidence; other
references remain available. Current configuration projections remain assumptions.
Issue details retain every affected claim, independent of filtering. Map routing
uses empty channels around visible cards; selected paths use lightweight labels.
Outline is hierarchical. Advanced Network remains optional and uses in-scope nodes.

First entry opens Overview; subsequent navigation resumes the previous view.
Evidence links open their registered topic. Overview/topic selections, expansions,
filters, focus, history and display choice are transient. Phones initially use
Outline. Full-width/maximized views and the draggable/keyboard-movable details
panel remain; PDFs keep their checksum/page and focus contracts. Failures clear
unavailable data and require explicit Retry without resetting editing drafts.

## Verification record

Existing Conda environment `restoration-simulator`; no dependencies installed.
Commands run from `restoration_simulator`, frontend commands from `frontend`.
Python 3.12.16, Node 22.23.4, npm 10.9.9, React 19.2.0, Vite 7.3.7,
PDF.js 6.4.299 and Playwright 1.57.0 with installed Edge were used.

| Command | Result | Status |
| --- | --- | --- |
| `node --test tests/knowledgeExplorer.test.mjs` | 26 tests passed, including eight new presentation tests | 0 |
| `npm.cmd test` | 146 frontend tests passed | 0 |
| `npm.cmd run build` | Production assets built; existing large-chunk warning | 0 |
| `python -m unittest discover -s tests -p 'test_knowledge*.py' -v` | 69 backend knowledge tests passed | 0 |
| `python -m backend.knowledge_citations --check` | Original mirrors and PDF bytes validated | 0 |
| `python -m backend.knowledge_graph --check` | Original graph and source contracts validated | 0 |
| `node tests/browser/knowledge-explorer.cjs` | Full Explorer acceptance passed | 0 |
| `node tests/browser/knowledge-evidence.cjs` | Six contexts/twelve original claims, drafts and sources passed | 0 |
| `node tests/browser/designer-interactions.cjs` | Production regression passed; 25 expected preview requests | 0 |
| `node tests/browser/knowledge-overview-focus.cjs` | Final focus/web/context/navigation-contrast and responsive checks passed | 0 |

Unit coverage includes nonmutation, exhaustive types, exact aggregation membership,
duplicate web contexts, edition/passage/use identity, grouped expansion, exact
evidence highlighting, complete stock issues, authoritative assumptions and filters.
Geometry checks assert deterministic ports and routes avoiding unrelated card
interiors for AL20, carob, MR2, R1 and R4. Keyboard focus alone does not move cards.
Web presentation identities include the owner and complete reviewed context, so
reordering an array never retargets an existing selection to a different reference.

Browser tests use fresh isolated saves on API 8013 and production preview 4174,
sequentially. They cover four-layer entry and Projects independence; Map/Outline/
Network across five small/dense topics, both themes and 1440/390/320 widths; exact
PDF pages/focus; source roles; complete issues; lazy usage and hash mismatches;
search, filters, retry and resumed views; popup/maximize/keyboard controls; all six
evidence links; retained funding/concept/planning/Designer drafts and queued work.

Initial diagnostics were not passing acceptance: new tests referenced two incorrect
fixture IDs and omitted an import; these were corrected. Browser checks identified
missing exact accessible names on the filter selects; explicit labels were restored.
Final visual review found missing colour tokens for the active Knowledge Explorer
navigation button; explicit colours and a contrast assertion now cover both themes.
Final focused browser checks also verify that maximized navigation cannot restore
focus behind its visible workspace. The complete workflow passed before those final
identity/focus refinements; the focused checks and unit suite validate the final build.
Logs, screenshots, environment information and protected fingerprints are under
ignored `test-artifacts/knowledge-overview/`.

All 213 protected configuration/document/save files retain their starting byte
fingerprints, including canonical registries, feature libraries, Designer rules and
real saves/backups. The dataset and feature-registration hashes remain unchanged.
Documentation links and `git diff --check` passed. No full backend rerun was needed
for this presentation-only change; the 69 relevant backend tests and both original
knowledge checks are recorded above. The roughly 1.61 MB main/611 kB PDF chunk
warning remains a separate performance follow-up.
Final review covered fourteen changed/new files and 39 local documentation links.
The isolated acceptance servers were stopped afterwards; the normal backend was
left running without changing its project state.

## Boundaries

No backend API, dataset, feature membership, ecological rule, save contract or source
document change. No project reads from the new projections, automatic adoption,
eligibility inference, new research or database. The existing older-edition retrieval
limitation, unregistered dependencies and unresolved research questions remain.
