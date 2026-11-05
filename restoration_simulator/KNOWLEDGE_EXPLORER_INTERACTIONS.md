# Knowledge Explorer card interaction and popup sizing

Completed 5 November 2026. Baseline revision:
`b1bc221156e7c9c9fbd58702689b99e716aab2a9`; starting working tree clean.

## Behaviour

- Entire group/layer cards toggle their children, including padding and border
  clicks. Separate Explore/Collapse and selected-record expansion buttons are gone.
- Entire record cards open the floating details panel. In Topic detail, connected
  records also toggle their registered neighbourhood. Source passages are leaves.
  Embedded shortcuts and native Enter/Space activation do not toggle twice.
- Explicit display parents create progressively indented subnodes in Map and
  nested lists in Outline. Neutral branch lines show grouping; registered evidence
  arrows retain their original identities and meanings. Routing keeps clear of
  unrelated cards, including the newly indented descendants.
- The desktop popup has a full-width bottom resize grip. Mouse dragging or
  Up/Down, Shift+Up/Down, Home/End changes height within the available workspace.
  Manual height differs explicitly from automatic height and persists through
  selection, close/reopen and failed-refresh retry. Resizing does not pan the graph.
  The phone bottom panel retains its existing automatic sizing.

All changes are frontend presentation/interaction. Canonical JSON, citation uses,
feature memberships, APIs, rules, documents and save contracts are unchanged.

## Verification

Existing Conda environment `restoration-simulator`: Python 3.12.16,
Node 22.23.4/npm 10.9.9, React 19.2.0 and Vite 7.3.7. Browser checks use installed
Playwright 1.57.0/Edge and production assets, sequentially against isolated API
8013 and preview 4174. No normal-project browser workflows or dependency installs.

| Command | Result | Exit |
| --- | --- | ---: |
| `node --test tests/knowledgeExplorer.test.mjs tests/explorerPanelGeometry.test.mjs` | 31 tests passed | 0 |
| `npm.cmd test` | 151 frontend tests passed | 0 |
| `npm.cmd run build` | Production build passed; existing large-chunk warning | 0 |
| `node tests/browser/knowledge-node-interactions.cjs` | New interaction acceptance passed | 0 |
| `node tests/browser/knowledge-explorer.cjs` | Whole Explorer regression passed | 0 |

Five additional unit cases cover hierarchy identity/indentation, neutral branches,
cycle/missing-parent rejection, route geometry, expandable records versus source
leaves, automatic/manual sizing, resize anchors/bounds, viewport shrink and malformed
geometry. Existing nonmutation, citation, filter and source-tension assertions pass.

Interaction browser checks exercise actual blank-padding clicks, repeated toggles,
embedded shortcut isolation, full-record popup opening, nested branches, pointer
resize growth/shrink, keyboard minimum/maximum, no graph panning while resizing,
close/reopen, exact PDF page/focus, refresh failure/retry and phone outlines. Both
themes and 1440/390/320 widths pass with no page errors or mutation requests.

The whole-Explorer regression retains all six contextual links, dense topics,
Map/Outline/Network, source roles/pages, search/usage hash checks, retry, resumed
views, unfinished drafts and queued/submitted editing suspension/resumption.
Backend tests were not rerun for this presentation-only change.

An initial browser diagnostic found that a stretched button did not cover the last
pixels of a card border. Explicit card-background event delegation corrected it;
the final browser run verifies border/padding activation. That failed diagnostic
is not counted as passing acceptance.

Logs, screenshots, command records and fingerprints are under ignored
`test-artifacts/knowledge-interactions/`. Protected-file comparison and final
documentation/diff review are recorded there. No Git staging, reset or commit.
All 213 protected configuration/document/save files retain their byte fingerprints.
Final review covered thirteen changed/new files and seventeen local documentation
links; `git diff --check` passed. The isolated test servers were stopped afterwards;
the normal backend and its saved project were left unchanged.
