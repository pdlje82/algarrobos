# Accepted Drone Irrigator intake review

Accepted for **Explorer-only** publication on 4 November 2026 under the user's
instruction to research and integrate all eleven work packages. The review was
performed by the agent; it does not represent personal source approval by the
user. The [completed worksheet](worksheet.md) and
[source ledger](../../../../drone_irrigator/research/SOURCE_REVIEW.md) describe
what was inspected and what remains uncertain.

## Evidence and change decision

The review includes exact source editions and passages, the full `review.json`
change/dependency report, native authorities, claim categories, applicability,
issue groups and adoption scope. Citation validation is distinct from inspecting
evidence and from identifying manual review targets. The reviewed findings cover
reservoirs, cost, plant suitability, water demand, clusters, aircraft, insertion,
docks, remote resupply, operational permissions and comparative validation.

Ten original PDFs were accessioned and registered, and two existing FOREST
documents supplied re-reviewed passages. They retain exact bytes. The source
ledger and LEARN-017 provide direct original download links, verified edition/date
context and failed/offered retrievals. Supplementary web observations are labelled
as such, with dates and limitations; none was fabricated into a PDF citation.

The batch adds 306 records: 46 claims, 69 entities, 23 profile/species relationships,
five issue groups, 69 native bindings, 28 sources, ten editions, 28 passages and
28 citation uses. It changes only citation membership, coverage and review date;
there are no removals. All original records and their unresolved issue groups
are retained. `review.json` contains exact changes, not merely these totals.

The app exposes 23 plant profiles, three reservoirs, four aircraft, three bases,
eleven work packages, three prepared cluster templates and one prepared scenario.
Every plant profile assesses each reservoir explicitly. All daily demand ranges
remain unknown/null. Observed applied-water quantities, manufacturer release
claims and historical costs remain separate contextual facts. Conditional field
use does not imply local suitability or a proven dose.

Existing feature contexts and evidence registration remain identical. No active
Designer rule, spacing, quantity, catalogue price, funding assumption, saved
project or historical replay contract was adopted or migrated. Prepared central
templates and scenario inputs require separate operational review. No Drone
Irrigator simulator was built.

## Publication and fingerprints

- Baseline Git revision: `8d755dc2428337951f0f8ceaf50161554fde64a6`.
  Initial unrelated work was not overwritten; the existing untracked
  `drone_irrigator/` brief was extended within the authorized scope.
- Baseline dataset hash:
  `394b20974e2b4d37ae4506ff1f51d7ebafa216878e1bd365863f5558989915bf`.
- Published dataset hash:
  `3d169fc724a68c2e73f32d26fe8e6dbf06cafba6dd8d698e53e65b650a7b41e1`.
- Unchanged feature-registration hash:
  `1da729fd96ecda53fe26cdde010b0b6f685b6dd7bd2cb39c527069990c20b0bc`.
- Archived complete review SHA-256:
  `140d38fad9186f236a3d1480db785021478f168c3e8da3866ed32a5c647ebdad`.

The isolated candidate passed both intake commands in the existing Conda
environment. After the backend stopped, check/review passed again with identical
complete report and fingerprints. Matching canonical files were applied with
explicit rollback protection. An initial validation invocation used a nonexistent
helper; the operation restored both originals before retrying with the actual
check entry point. The corrected publication validated canonical citations,
graph and native owners before backend restart. This was authoring-time recovery,
not silent runtime substitution.

The final canonical bytes match both candidate fingerprints in `batch.json`.
Only the two canonical knowledge files differ from the manifest's baseline
authority-file fingerprints. The archive contains the manifest, complete report,
review notes and worksheet; complete candidate runtime datasets remain outside
the archive. This historical receipt must not be reused as a live candidate.

## Validation results

All commands below used the existing environment from `restoration_simulator/`
(frontend commands from `frontend/`):

| Check | Result |
| --- | --- |
| `python -m backend.knowledge_intake --check BATCH_DIR` | Exit 0 before publication; repeated while stopped |
| `python -m backend.knowledge_intake --review BATCH_DIR` | Exit 0; identical reviewed report on stopped recheck |
| `python -m backend.knowledge_citations --check` | Exit 0; 49 uses, four consumers, 60 mirrors, original PDF editions verified |
| `python -m backend.knowledge_graph --check` | Exit 0; 67 claims, 85 entities, 34 relations, eight issues, 95 bindings, 46 sources |
| `python -m backend.irrigation_research --check` | Exit 0; 23 profiles, 11 packages, three prepared clusters |
| `python -u -m unittest discover -s tests` | 368 tests passed, 391.700 seconds |
| `npm test` | 138 tests passed, 4.511 seconds |
| `npm run build` | Exit 0; production build completed |
| `git diff --check` | Exit 0; no whitespace errors |

An earlier full backend run exposed four outdated count/date/exception-message
expectations. These were corrected to the intentional schema expansion, including
using an actually future test date; the final full run above passed. They were
not bypassed or hidden with fallback data.

Read-only browser checks through the live app confirmed 198 records, 516
connections and eight unresolved issues; R2's historical/current-quote distinction;
carob's conditional reservoir assessments, unknown daily demand and separately
labelled historical trial water; and the unadopted central cluster. Expanding
reviewed passages opened the newly registered Growboxx PDF at page 5, rendered
the refill/release passage and retained the edition checksum. Closing returned
to Explorer. Search retained distinct species/profile/template identities.

The automated browser-regression shell launch was blocked by automatic policy
review without a specific reason. It was not rerun by another shell. Supported
browser controls supplied the read-only checks above. The full scripted browser
suite and mobile viewport suite were not run, and are not claimed as passed.

Eight original save files matched their pre-work SHA-256 fingerprints after UI
checks. The regression fixture also verifies original records, all six existing
feature contexts and operational authority files. The temporary isolated test API
is not part of the research integration; the user's restarted main backend remains
available on port 8000.

## Size, effort and remaining gates

A final local HTTP request to `/api/knowledge/explorer` returned 3,675,285 bytes
in 0.808 seconds, with 198 nodes and 516 edges. This is one observation, not a
latency guarantee. The full archived review is 1,020,768 bytes because it retains
complete before/after dependency information. Large issue groups and PDF passage
lists now collapse in research details; a deterministic graph-label heap merge
avoids sorting the complete candidate grid for each edge. Tests preserve prior
ordering and collision semantics.

The task required manual edition checks, passage/context and visual inspection,
23 species dispositions, owner data, adapters, candidate authoring, publication,
browser inspection and regression work. Full runtime data was not duplicated in
the receipt. The expanded graph/report sizes are evidence for measuring the next
batch before introducing a database or an automatic extraction system.

No reviewed source establishes a small unattended system combining reliable
reservoir hose insertion with water and power replenishment. Required next inputs
are exact reservoir samples and delivered quotes, measured retained volume and
wet strength, site/stock/season water demand, repeatable insertion/transfer times,
complete loaded sortie/base cycles and site-specific operating assessment. These
are open research/development tasks, not invented successful values. Operational
rules and scenario adoption require a separate reviewed change before coding or
running the requested simulator.
