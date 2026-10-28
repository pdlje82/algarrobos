# Botanical checklist illustrations

Thirteen original transparent PNG illustrations generated with the built-in
`image_gen` tool on 28 October 2026. The exact generation and correction prompts
are in [generation-prompts.json](generation-prompts.json). Runtime images are
384 × 384 pixels, prepared from the generated originals without a background;
the checklist displays them at a smaller size and loads them lazily.

Names, identifying features and primary botanical reference links are maintained
in [plant-illustrations.json](../../src/plant-illustrations.json). Each catalogue
plant has an English name, a Spanish common name and an italic Latin name. Common
names vary locally; the scientific name identifies the intended poster taxon.
This presentation metadata is separate from the immutable simulation catalogue
v1, so adding labels or drawings does not change saved quantities or replay.

The library poster supplies the system grouping and intended taxa. University
botanic gardens, herbaria and the Flora de Almería supply the morphology checks.
The source pages are references for names/features, not copied artwork. The
drawings were visually reviewed; the lentisk was revised to remove terminal
leaflets and show its winged rachis, and esparto was revised to a foliage-only
tussock after rejecting an inaccurate plume shape. Other checks included carob
pods and paired leaflets, olive leaf undersides, alternate buckthorn leaves,
fan-palm leaves, yellow retama flowers, winter-thyme flower heads, three-veined
Ziziphus leaves, tubular Lycium flowers, curved Salsola leaves, simple oleander
flowers and Tamarix scale foliage.

These are small AI-generated planning illustrations, not diagnostic herbarium
plates, and are explicitly labelled as such in plant details. They are not to a
common scale. Tamarix intentionally remains genus-level, matching the poster;
the T. gallica reference is an example, not a species assignment. Custom entries
show an explicit unidentified placeholder, since a free-text name cannot support
an accurate species drawing. Species identity, local provenance and planting
suitability still need site-specific confirmation.

No runtime imaging service or additional package is required. Each PNG is shipped
with the frontend. A failed image displays an explicit message; identification
references remain accessible in Details.
