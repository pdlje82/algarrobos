# Botanical checklist illustrations

Thirty-two transparent PNG illustrations generated with the built-in `image_gen`
tool on 28 October 2026: a whole-plant portrait and a retained botanical detail
for each of the 16 catalogue plants. The whole-plant collection, growth-form
notes and exact prompts are documented in [whole/README.md](whole/README.md) and
[whole/manifest.json](whole/manifest.json). The first 13 detail generation/correction prompts are in
[generation-prompts.json](generation-prompts.json); the three poster additions
and their exact prompts are in [generation-prompts-v2.json](generation-prompts-v2.json).
All 32 shipped images are **1254 × 1254 pixels**, retaining transparent alpha.
The first 13 were originally shipped as 384 × 384 thumbnails. Eleven now use
their reviewed full-resolution originals; retama and Salsola were corrected
during this review. The three more recent additions retain their existing originals.
See the [botanical review](botanical-review-2026-10-28.md) and
[full-resolution provenance and correction prompts](high-resolution-manifest.json).
The checklist loads whole-plant thumbnails lazily. Clicking one opens the
representative mature form and botanical detail side by side on desktop and
stacked on phones. Each image starts fitted to its panel; its **Original size**
button switches independently to natural-size scrolling, and **Fit view** returns
to the comparison. Keyboard, Close, Escape and backdrop dismissal are supported.

Names, identifying features and primary botanical reference links are maintained
in [plant-illustrations.json](../../src/plant-illustrations.json). Each catalogue
plant has an English name, a Spanish common name and an italic Latin name. Common
names vary locally; the scientific name identifies the intended poster taxon.
This presentation metadata is separate from the simulation catalogues. Frozen
v1 retains 13 entries for unpriced history replay; current v2 adds the three
missing system-4 entries while preserving the original records unchanged.

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

The three additions were reviewed against these primary botanical references:

- [UAM herbarium: rosemary](https://herbariodocenteuam.github.io/Paneles/paneles/fichas/Rosmarinus_officinalis.pdf): opposite narrow leaves, rolled margins, pale undersides and pale blue two-lipped axillary flowers. The metadata cross-references *Rosmarinus officinalis* and *Salvia rosmarinus*.
- [University of Málaga: Rhamnus lycioides](https://jardinbotanico.uma.es/jb-psa1-03/): narrow entire leaves, thorn-tipped woody branches and small black ripe drupes; distinct from the existing *R. alaternus* illustration.
- [University of Almería: Ephedra fragilis](https://nevada.ual.es/biocon/ephedra-fragilis-desf.-subsp.-fragilis.html): essentially leafless articulated green stems and reduced scales. The drawing shows a female sprig with red seed-cone bracts, without ordinary flowers or male structures on the same plant.

New files: [rosemary.png](rosemary.png), [rhamnus_lycioides.png](rhamnus_lycioides.png),
[ephedra_fragilis.png](ephedra_fragilis.png). No existing image was replaced.

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

Whole-plant portraits show representative mature forms, not the size of the
plants being purchased or an equal biological scale. Notes describe variation
with age, site and management. Trees/shrubs with variable habit are labelled
accordingly, and Tamarix remains a representative genus-level tree form.
Image load failures are reported per view; a failed whole-plant image does not
silently substitute the detail drawing or prevent inspection of that detail.

For the resolution update, all 13 older originals were visually reviewed against
the linked botanical descriptions. The prior lentisk and esparto corrections were
retained. Retama's yellow flowers were changed to smaller, distinct axillary
clusters with exposed green shoot tips. Salsola was redrawn in foliage state with
slender curved cylindrical leaves, removing the broad-blade appearance and
oversized fruiting structures. Additional university references were added where
earlier links were intermittently unavailable. No plant ID or simulation data
changed in this resolution update.
