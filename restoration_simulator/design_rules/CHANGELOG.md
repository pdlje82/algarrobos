# Rule changes

## 2026-10-29 · algarroba-designer-2026-10-29-v5 · engine/draft v3

- Register the explicit treeless-series placement policy for lentisco/coscoja
  starters and selected optional shrubs. Only newly generated instances change;
  manual preferences win and plotted trees retain ordinary crown placement.
- Existing bundles without this optional policy preserve historical behaviour.
  Rules adoption preserves counts, prices, positions and already unplaced plants.
- Spanish/German/scientific display identities live in scenarios/plant-names.json;
  they do not replace historical catalogue labels or saved evidence.

## 2026-10-29 · algarroba-designer-2026-10-29-v4 · engine/draft v3

- All 23 plants receive one positive, editable crown/plant drawing diameter.
  Nine are rounded reference midpoints; fourteen are explicit project estimates.
  Original evidence ranges, taxon identity and limitations remain separate.
- Custom diameters: trees 6 m, shrubs 2 m, grasses 0.6 m. Root ball remains 0.12 m.
- Density defaults: carob 350/ha, other trees 50/ha, shrubs 350/ha, grasses 50/ha.
- Added registered deterministic, bounded placement of newly created instances,
  provisional woodland companions, open-ground preferences and 1 m centre clearance.
- Persisted tree associations/offsets, placement seed, species preferences and
  explanations. Tree movement translates children; manual shrub movement detaches.
  Out-of-zone children retain recoverable offsets; removed parents leave shrubs.
- Removed rearrangement. Earlier unplaced plants are never silently retried.
- Historical v1/v2 drafts require explicit review. Adoption preserves recorded
  counts, prices, entered dimensions and coordinates and invents no parent links.
  Applied snapshots retain their original rules and evaluator.

## algarroba-designer-2026-10-29-v1 — 29 October 2026

Initial editable, source-linked designer bundle: MR1/MR2 conceptual arrangements,
lentisco/coscoja series, retained illustrative system presets, optional companions,
conditional encina moisture-pocket example, density and establishment guidance.
Geometry and quantities are explicitly illustrative. Stone mulch is the first
material in an extensible mulch-type registry, with a separate stone_mulch rule.
No suitability score, water schedule, ecological outcome or funding assessment.


## 2026-10-29 · algarroba-designer-2026-10-29-v2

- Added density-led per-species scenarios (350 carob/ha, other species 50/ha),
  half-up counts, explicit area reconciliation and zero-count selections.
- Separated ordinary source dismissals from visible persistent exclusions;
  preserved edited prices/densities across overlap and re-selection.
- Registered centre-preserving rectangle resizing, recoverable unplaced plants,
  pocket movement, dimension evidence and measured/assumed overrides.
- Added a 23-taxon reference review with qualified crown ranges and explicit
  root-ball gaps. Crown geometry never establishes suitability or spacing.
- Kept v1 historical reads and required explicit upgrade review; existing saved
  counts/prices/coordinates and applied snapshots are preserved.
- Replaced routine removal confirmations with readable change messages and Undo.


## 2026-10-29 · algarroba-designer-2026-10-29-v3

- Added the user-selected 0.12 m shared root-ball drawing default in defaults.json,
  explicitly classified as an assumption, separate from verified stock dimensions.
- User-entered dimensions and documented stock widths take precedence; clearing
  an override restores the shared assumption. Counts, costs and positions do not change.
- Older snapshots retain their prior overlays until an explicit rules update.
