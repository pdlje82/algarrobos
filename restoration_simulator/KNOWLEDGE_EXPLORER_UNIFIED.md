# Knowledge Explorer: one expanding hierarchy

Completed 5 November 2026 against revision
`d3a2cb9f682f6c34df78d9187551407bab0e5324`.
Starting changes in `knowledge/README.md` and `frontend/tests/browser/README.md`
were preserved. No dependencies were installed.

## Result

- Knowledge areas now contain explicit record-type groups with exact counts.
  Ecology separates Species, Plant irrigation profiles, Restoration approaches,
  Vegetation series, Planting palettes and Treatments. Funding, Research & systems
  and Prepared examples receive the same intermediate grouping.
- There is one continuous Map/Outline tree. Clicking MR2 or another topic expands
  registered relationships, claim categories, current reference assumptions,
  sources and complete unresolved issues beneath that record. It does not switch
  to a separate Topic detail screen. Other expanded branches remain available.
- Search, starting topics, evidence links and Center this topic reveal the same
  registered hierarchy. Previous topic restores prior tree state; Reset view
  explicitly returns to the initial four layers. Presentation choices persist
  in memory, with Outline initially selected on phones.
- Display occurrences have separate, deterministic presentation IDs while retaining
  their original native node identities. Shared records can appear beneath multiple
  topics without duplicating knowledge or coupling their expansion state. Related
  records can expand further without automatically recursing around graph cycles.
- Every aggregate retains exact underlying edge membership; unique record counts
  do not count display copies. Filters do not reconnect hidden records. Complete
  issue details still retain both stock descriptions. Configuration-only claims
  acquire no fabricated citations. Sources preserve edition, passage and use roles.
- Map cards retain readable minimum widths at deeper levels, with neutral indented
  branch lines. Map, Outline and Advanced Network share selection and expansion.
  Whole-card actions, draggable/resizable popup, phone panel, maximization,
  checksum-qualified PDFs, retry and editing suspension remain available.

Only frontend presentation, its tests and documentation changed. Canonical registries,
feature memberships, dataset/hash contracts, rules, source documents and save formats
are unchanged. Projects remains architecture context; this tree loads no project
records. This is not a knowledge-intake publication or rule-adoption change.

## Verification

Existing `restoration-simulator` Conda environment: Python 3.12.16,
Node 22.23.4/npm 10.9.9, React 19.2.0, Vite 7.3.7 and installed
Playwright 1.57.0/Edge. Backend commands run from `restoration_simulator/`;
frontend commands run from `restoration_simulator/frontend/`.

| Command | Result | Exit |
| --- | --- | ---: |
| `npm.cmd test` | 156 tests passed | 0 |
| `npm.cmd run build` | Production build passed; existing large-chunk warning remains | 0 |
| `python -m backend.knowledge_citations --check` | 49 shared citations, 4 consumers; document bytes verified | 0 |
| `python -m backend.knowledge_graph --check` | Existing 198-node/516-edge graph validated | 0 |
| `python -m unittest discover -s tests -p 'test_knowledge*.py' -v` | 69 backend tests passed | 0 |
| `node tests/browser/knowledge-node-interactions.cjs` | Inline/type-group, card, resize, PDF and recovery acceptance passed | 0 |
| `node tests/browser/knowledge-explorer.cjs` | Whole Explorer regression passed | 0 |
| `node tests/browser/knowledge-overview-focus.cjs` | Responsive, web-context, focus, network and contrast checks passed | 0 |

Five new unit cases cover exhaustive type membership, inline paths, independently
expanded shared records/cycles, sources/assumptions/complete issues, filters,
determinism, routing, nonmutation and unavailable/malformed expansion identities.
Browser runs were sequential against isolated API 8013 and production preview 4174,
in light/dark themes at 1440/390/320 pixels. No page errors or exploration-triggered
mutations occurred. The full regression covered all six evidence links, exact PDFs,
snapshot mismatches/retry, funding/concept/planning/Designer drafts, and separate
queued/submitted-operation suspension and normal resumption.

An initial direct-module backend invocation failed because one existing test imports
its sibling as a top-level module. The repository discovery invocation above supplies
the required test path and passed all 69 tests; the failed invocation is retained in
`backend.log` and is not counted as passing. A development unit fixture initially
asked MR2 for a density claim registered only to carob; its subject was corrected.

All 213 protected configuration/document/real-save fingerprints match the initial
baseline. Documentation links and `git diff --check` pass. No browser workflow used
the normal project API. Isolated API/preview processes were stopped after validation;
the existing API on 8000 was left running.

Logs, baseline/final integrity metadata and representative screenshots are under
`test-artifacts/knowledge-unified/` (ignored verification artifacts). The two primary
screenshots are `browser/resized-dark-1440.png` and `browser/outline-dark-390.png`.
