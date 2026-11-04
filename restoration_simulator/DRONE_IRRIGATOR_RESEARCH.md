# Drone Irrigator research integration

Reviewed and integrated on 4 November 2026. All eleven work packages have a
bounded research disposition; unresolved evidence is retained as data. This
change adds research knowledge, not the Drone Irrigator simulator.

## Read and inspect

- [Research findings, R1–R11](../doc_library/LEARN-017%20-%20Drone%20Irrigator%20-%20Research%20Findings%20and%20App%20Knowledge%20Adoption%20-%202026-11-04.md)
- [Exact editions, passages, download links and species screening](../drone_irrigator/research/SOURCE_REVIEW.md)
- [Accepted intake manifest, complete change report and review notes](knowledge/intake/drone-irrigator-v1/)
- [Original simulator brief](../drone_irrigator/README.md)

In the app, open **Knowledge Explorer**. R1, R2 and R4 are starting topics;
search finds the other packages, reservoirs, aircraft, bases and plant profiles.
Select a plant irrigation profile to inspect reservoir-specific suitability,
unknown water-demand fields, observed trial quantities, limitations and source
passages. Prepared templates and scenarios are separately identified. Large
issue groups and reviewed PDF passages expand without hiding their identities.

## Ownership and contracts

`scenarios/drone-irrigator-research-v1.json` owns 23 profiles keyed by the existing
plant catalogue IDs, three reservoir records, four aircraft records, three base
records, eleven work packages and one prepared scenario. It is a companion to the
existing plant catalogue, not a second species catalogue. `backend.irrigation_research`
validates and resolves it. `GET /api/plants/irrigation-profiles` returns the same
validated profiles; unknown query parameters are rejected.

Every profile explicitly assesses every registered reservoir. `not_assessed` does
not mean unsuitable. Daily low/central/high litre values are all `null` with
`not_established`: this review found no defensible transferable product-, stock-,
site- and stage-specific daily prescription. Manufacturer release rates and
historical applied-water totals remain separately labelled facts. A future
evidence-backed range must be complete, finite, ordered and contextually described;
zero, missing and unknown remain distinct. A future simulation must require
explicitly supplied and reviewed demand inputs before producing refill deadlines.

Three prepared cluster templates live centrally in
`design_rules/drone_irrigator_v1.json`. They resolve existing palette/species
identities and retain central spacing/dimension ownership; they add no numeric
spacing, starter quantities or live handler. They are deliberately absent from the
active Designer manifest. The scenario declares area bounds of 1–10 ha, one drone
and idealised insertion as author inputs, while identifying missing operational
parameters. Neither file can run a Drone Irrigator simulation.

The graph has seven explicit new native adapters: `irrigation_profile`,
`reservoir_system`, `drone_platform`, `drone_base`, `research_topic`,
`research_scenario`, and `cluster_template`. Each profile links to its exact species
identity. Record citations must match their owner, and typed profile/species links
must agree. Invalid data raises contextual errors; the UI does not derive ecological
defaults or turn failed reads into empty successful views.

## Evidence and adoption

Ten original PDFs were added to `doc_library`, catalogued, logged and registered
for the checksum-verified viewer. Existing FOREST passages were re-reviewed.
Supplementary web observations keep URLs, actual review dates and transfer
limitations; they do not masquerade as locally registered PDF evidence. Failed
retrievals and offered additions are explicit in the source ledger.

The Explorer now contains 67 claims, 85 entities, 34 native relationships, eight
issue groups and 46 source records, projected as 198 nodes and 516 connections.
This does not represent scientific completeness. The intake added 306 records
and changed only the knowledge citation membership, coverage and review date.
All original records, six existing feature contexts and the feature-registration
fingerprint were preserved. Existing Designer generation, catalogue prices,
scenario execution and saved projects were not adopted or migrated.

Publication followed `INTAKE_WORKFLOW.md`: isolated candidate, byte fingerprints,
check and full review, stopped backend, identical report recheck, paired canonical
file update, canonical validation and restart. The archived worksheet distinguishes
source inspection, validation dependencies and manual adoption targets. A future
operational adoption requires its own reviewed change.

## Verification and remaining work

Backend tests cover owner resolution, the catalogue-wide profile contract,
unsupported schemas, malformed ranges, nonfinite values, unresolved evidence,
missing files, typed identity mismatches, citation mismatches, API behaviour and
original-record/feature preservation. Frontend tests cover explicit unknowns,
source facts, unsupported records and prepared adoption states. Existing regression
suites and production build are also run; final outcomes are recorded in the
accepted intake review notes.

Browser inspection exercised research navigation and structured findings through
the live Knowledge Explorer. The graph label allocator uses a deterministic heap
merge with the previous distance/order semantics, avoiding an exhaustive sort of
every candidate grid point for every edge as the graph grows. Collision and
pre-change-order regressions cover this change.

Next research should measure the exact reservoir's usable capacity and repeated
wet strength, plant/site demand, inlet acceptance and insertion time, complete
loaded sortie/base cycles, and delivered lifecycle costs. No reviewed source
establishes a small unattended system combining plant-reservoir insertion with
water and power replenishment. Physical trials, supplier quotes and site-specific
flight assessment remain open; no throughput or plant-survival guarantee is made.
