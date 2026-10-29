# Site Designer rule library

This directory is the authoritative index for generated planting decisions. The
Python facade is `backend/designer.py`; current editing is in
`backend/designer_v2.py`. React renders evaluations and collects commands. The designer is a hypothetical layout, not a suitability model.

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
Shared species are not added twice. Ordinary draft removals apply immediately with a readable explanation and session
Undo/Redo. Only applying to the demonstrator or adopting updated rules requires
explicit review. Manually retained pocket plants become unplaced when the
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


## Designer v2 editing and density rules

`designer_v1.py` preserves the historical evaluator. New drafts use engine v2;
old drafts are read unchanged until **Review designer upgrade** is accepted.
Upgrading derives density from existing count and area, preserves prices and
positions, and labels prior persistent exclusions as legacy exclusions. Envelope 5
and the existing simulation schema remain unchanged; applied historical snapshots
are not rewritten. An explicit versioned review supplies missing v2 metadata;
normal execution never guesses it.

The registered v2 handlers are density conversion, half-up integer rounding,
per-species preferences, source-specific dismissal, persistent exclusion,
centre-preserving resize, overlay evidence/overrides and readable change messages.
The frozen evaluator supplies existing deterministic layout and pricing. The
adapter passes only positive-count selected plants and in-zone features to that
old engine; zero-count species and out-of-zone features remain in the v2 draft and
response with explicit status. No botanical dimension is used as a spacing rule.

- `density_defaults` declares carob 350/ha and other species 50/ha as assumptions.
  Selecting either through the checklist or an approach uses the same values.
  350 does not satisfy a strict <350 source limit and is not a recommendation.
- Positive density may round to zero; its selection and requested value remain
  visible. A zero input/last decrement removes the current selection. Rechecking
  such a zero-density choice explicitly starts its configured scenario again.
- Source overlap uses set union and preserves the first edited density and price;
  it never adds counts. Ordinary unchecking dismisses currently active sources.
  A new/reactivated source may offer the plant again. Persistent exclusions are a
  distinct visible setting, and checking a plant clears them deliberately.
- `preferences` retains previously edited prices, confirmations and density when a
  species is removed. `selection` contains only positive integer priced entries
  used by the existing budget/application path.
- `resize` keeps area and the centre fixed. Coordinates shift by half the change
  in dimensions, preserving metre offsets. Out-of-zone plants retain recoverable
  coordinates in `displaced`; they are explicitly unplaced and remain costed.
- An area edit retains counts and exposes previous targets and proposed counts.
  Only **Update plants to previous densities** changes those counts. Repeated area
  edits retain the original pending target until that explicit update.
- `plant_dimensions.json` covers all 23 catalogue taxa. `null` means not
  established. Reference ranges are drawn as annuli, not averaged. User overrides
  require an explicit measured/supplied or assumption basis and stay in the draft.
  Root-ball volume is never converted to a guessed diameter. Sources and gaps are
  documented in LEARN-009; the existing placement clearance is separate.

The browser's reversible edit history is session-only presentation state. One
accepted command or completed gesture is one step; new edits clear Redo. Saving
and workspace switching preserve the session stack; explicit reload/project
replacement resets it. Undo/Redo re-evaluates the selected complete draft in Python
before accepting it, and does not change simulation history or the project undo.
Pointer motion renders a temporary gesture preview; Python validates the final
metres/area/positions on release. Escape cancels without a domain command.


## Shared root-ball drawing default

The `root_ball_default` rule registers `defaults.root_ball_default`: an explicit
12 cm diameter drawing assumption, shared by catalogue and custom plants.
Overlay precedence is user-entered dimension, documented stock dimension, then
the shared drawing assumption. No width is inferred from container litres.
Older bundles without this rule/default keep their previous unspecified root-ball
behaviour until **Review with updated rules** is accepted. The rule and default
must appear together; a missing or invalid configured value raises an error.
This overlay does not change counts, costs, placement clearance or planting holes.
