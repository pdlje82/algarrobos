# Planting Explorer: three poster examples

Created 28 October 2026. These are visual prototypes for discussion, stored separately from the application's public assets. No Planting Explorer button, UI, planting settings or watering defaults were implemented.

| Poster | Species | Main visual distinction |
|---|---|---|
| [01 — Algarrobo](01-algarrobo-planting-poster.png) | *Ceratonia siliqua* | Root collar, broad tree planting hole, primary root and woody laterals |
| [02 — Palmito](02-palmito-planting-poster.png) | *Chamaerops humilis* | Root-initiation zone and adventitious palm roots; preserve the root ball |
| [03 — Esparto / atocha](03-esparto-planting-poster.png) | *Macrochloa tenacissima*, syn. *Stipa tenacissima* | Basal crown, nursery plug and dense fibrous grass roots |

The requested format is portrait 9:16. The built-in generator returned approximately that ratio; exact native dimensions are recorded in [manifest.json](manifest.json). Original pixels were preserved, without stretching, cropping or upscaling.

Each poster separates mature habit, young-plant positioning before backfilling, and conceptual root architecture. The soil sections are teaching schematics, not measured root distributions or a full site execution specification. W and H refer to the actual supplied root ball/plug. A 1 L nursery container is neither a planting-hole dimension nor an irrigation dose.

## What belongs in the image

- Plant identity, Spanish name, Latin name and recognisable mature habit.
- Collar/crown/root-initiation zone in relation to finished soil level.
- Root-ball width and height, firm supporting ground, and the backfilling step.
- Contrasting root patterns, explicitly schematic and without a claimed mature rooting depth.
- A brief establishment-water reminder.

## What belongs beside the image in the future explorer

Editable stock measurements, site soil/drainage observations, planting window, mature spacing, protection, and an establishment-water plan. Keep litres per application, frequency, duration, rainfall adjustments and monitoring outside the raster artwork so they can change without regenerating the picture.

[Research and watering notes](SOURCES_AND_WATERING.md) distinguish source-backed guidance, transferable general principles, experimental treatments, and unresolved values. The images intentionally contain no unverified watering doses.

## Provenance and review

Generated with the built-in image generation tool; exact initial and refinement prompts are in [generation-prompts.json](generation-prompts.json). [manifest.json](manifest.json) records dimensions, checksums and selected source files.

The selected images were visually reviewed for names, broad species habit, root-system distinctions, labels, legibility and installation-stage wording. They remain conceptual botanical illustrations; root positions and relative dimensions are not field measurements. Before practical use, confirm the supplied stock and planting method with the nursery/site practitioner. For app integration, keep parameters and explanatory text as accessible HTML alongside the image.
