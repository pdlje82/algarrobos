# Irrigation research and technical drawings

Created 3 November 2026 for LEARN-016. Start with the [main report](../LEARN-016%20-%20Almeria%20Restoration%20-%20Irrigation%20Technology%20and%20Demonstrator%20Research%20-%202026-11-03.md) and [source register](SOURCES.md).

An [illustrated ElevenReader edition](elevenreader/README.md) contains sixteen listening chapters with twenty concept diagrams and fifty-two equipment/component/research reference pictures embedded, plus an editable Markdown manuscript and a self-contained browser read-along with diagram enlargement. Approximately 48–59 minutes; direct playback in ElevenReader remains untested.

The initial package contains 12 original technical concept drawings as PNGs and editable SVGs. The [drone extension](drones/README.md) adds eight original SVG/PNG pairs and twelve sourced reference pictures, with findings in section 13 of the main report. All are illustrative, not to scale, and separate proposed engineering from external evidence. The water/solar examples and 48-plant trial are explicit author assumptions. No installation dimensions, electrical pin assignments, species thresholds or final equipment ratings are prescribed.

| Drawing | PNG | Editable SVG |
|---|---|---|
| Control architectures | [View](figures/01-control-levels.png) | [Source](figures/01-control-levels.svg) |
| Tank service areas | [View](figures/02-landscape-water-cells.png) | [Source](figures/02-landscape-water-cells.svg) |
| Hydraulic assembly | [View](figures/03-tank-station-hydraulics.png) | [Source](figures/03-tank-station-hydraulics.svg) |
| Gravity pressure | [View](figures/04-gravity-pressure-budget.png) | [Source](figures/04-gravity-pressure-budget.svg) |
| Serviceable electronic node | [View](figures/05-repairable-node.png) | [Source](figures/05-repairable-node.svg) |
| Soil probe placement | [View](figures/06-sensor-placement.png) | [Source](figures/06-sensor-placement.svg) |
| Passive individual control | [View](figures/07-passive-per-plant.png) | [Source](figures/07-passive-per-plant.svg) |
| Communications | [View](figures/08-wireless-and-local-control.png) | [Source](figures/08-wireless-and-local-control.svg) |
| Control and failure states | [View](figures/09-control-state-diagram.png) | [Source](figures/09-control-state-diagram.svg) |
| Water and energy arithmetic | [View](figures/10-water-and-energy-budgets.png) | [Source](figures/10-water-and-energy-budgets.svg) |
| Repair and local assembly | [View](figures/11-repair-and-local-assembly.png) | [Source](figures/11-repair-and-local-assembly.svg) |
| Feasibility trial | [View](figures/12-comparison-trial.png) | [Source](figures/12-comparison-trial.svg) |

Rebuild with `python doc_library/irrigation-research/build_diagrams.py` from the repository root, using Python with PyMuPDF and Pillow installed. The script also makes a contact sheet for visual review. It does not fetch sources, change application configuration or manipulate project saves.

External PDFs are linked for addition rather than copied into this package. Temporary research downloads are not catalogued holdings. Concept figures are original geometric explanations. Credited manufacturer and research pictures are embedded in the drone extension and listening package; source rights and provenance remain explicit.
