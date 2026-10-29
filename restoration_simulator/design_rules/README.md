# Site Designer rule library

This directory is the authoritative index for generated planting decisions. The
Python evaluator is `backend/designer.py`; React only renders its evaluation and
collects commands. The designer is a hypothetical layout, not a suitability model.

## Files and responsibilities

- `manifest.json`: stable ruleset identity, schema/engine version and bundle files.
- `rules.json`: source-qualified guidance, observations, assumptions and unresolved
  conflicts. Stable IDs identify rules, never UI positions.
- `vegetation_combinations.json`: starter and optional members. MR1/MR2 are approaches;
  vegetation series and the retained poster presets are different concepts.
- `defaults.json`: explicit illustrative counts, shapes, planning footprints,
  placement parameters and bounded plotting capacity. These are project assumptions,
  not source-derived optimal dimensions. Excess quantities remain visibly unplaced.
- `sources.json`: library filenames, original PDF checksums and page limits.
- `treatments.json`: mulch material types. `stone` references `stone_mulch`; future
  materials get distinct IDs, rules and evidence. Supported visual patterns are
  `stones` and `organic`. No material cost or watering benefit is inferred.
- `CHANGELOG.md`: human-readable reasons for revisions.

The existing `scenarios/planting-catalog-v2.json` identifies species, growth forms and
legacy presets. New designer starter counts come from this bundle. Existing
`scenarios/plant-prices.json` supplies explicit EUR defaults: unconfirmed estimates,
not nursery quotes. Simulation costs, funding and form defaults remain in scenario
JSON and `scenarios/defaults.json`. Historical catalogue v1, form adapters and replay
modules retain their previous meaning; do not use them for new designer decisions.

## Registered evaluator operations

The generic operations are selection union, manual exclusion/retention, geometry,
position override, surface-treatment rendering and advisory text. `mr1` selects the
registered grouping template; `mr2` selects the island template (when combined,
MR2 supplies the geometry while both sources remain in the trace). `pocket` adds
the configured conditional example species. `layout` registers geometric defaults.
All placement values and capacity limits are declared here. Exact generated
coordinates are project assumptions. Add a new engine operation explicitly rather
than encoding executable Python or JavaScript in JSON. Unsupported operations fail.

## Update workflow

1. Add/identify the primary document in doc_library and its catalog. Register its
   unchanged bytes and relevant pages in sources.json. Reading a file is not
   sufficient evidence for an unqualified ecological prediction.
2. Find affected stable IDs. Edit the rule, combination or treatment, preserving
   conflicting evidence and recording the distinction between guidance and our
   interpretation. Do not relabel field observations as controlled trials.
3. Change manifest.ruleset_id and describe the change in CHANGELOG.md.
4. From restoration_simulator, run `python -m backend.designer` and
   `python -m unittest discover -s tests -p test_designer.py -v`.
5. Inspect the change through **Review with updated rules**. Current saved designs
   use their embedded bundle; reviewing presents the new evaluation before adoption.
   Exported reports include inputs, outputs, manual edits and source/rule traces.

Changing a default must not overwrite manual prices, quantities or positions.
Shared species are not added twice. Removing a feature/preset requires reviewing
its dependent removals. Manually retained pocket plants become unplaced when the
pocket is removed; they can be positioned explicitly in the remaining zone.

## Persistence and compatibility

Autosave/export envelope 5 contains the existing simulation-schema-4 project plus
versioned designer attachments and a separate designer revision. Upgrading an old
autosave makes a byte-preserving backup before writing the new envelope. Saving a
draft leaves simulation revision, time, cash, history and project undo unchanged.
Applying uses the existing demonstrator transition and retains an applied rules
snapshot. Parcel deletion removes dependent designs; its explicit undo can restore
them. Exports after deletion omit the deletion undo buffer.

## Source cautions

- MR1 has different density figures in different passages: no target or cap is
  silently chosen. Density calculations always state their area/species basis.
- A vegetation series is a reference community and related stages, not a mandatory
  mix or a claim that every site should become forest.
- FOREST-003's first-series heading says coscoja, but its Latin name identifies
  lentisco. The discrepancy remains visible.
- Moisture pockets, planning radii, starter counts and mulch ring dimensions are
  assumptions. Annual rainfall alone cannot establish suitability or survival.
- Almería 40–60% is historical carob survival with no monitoring period here; it is
  never used as a simulated probability or a replacement-planting calculation.

DRYLAND-POSTER is an internal source-register ID for the existing hash-named PNG,
not an invented permanent library catalog ID. Its one image is referenced as leaf 1;
the original author/date/source remain unverified. The prototype combinations are
explicit project illustrations.

`defaults.rainfall_capture` registers donor geometry, islands and overflow drawing
parameters. Their dimensions are assumptions; React receives evaluated coordinates.
For an earlier snapshot without that optional geometry, the overlay is unavailable
with an explicit issue requesting rule review; no replacement dimensions are guessed.
