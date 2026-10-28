# Botanical depiction review — 28 October 2026

All 16 shipped checklist PNGs now have **1254 × 1254 pixels** and transparent
RGBA backgrounds. The 13 older files previously shipped at 384 × 384.
Eleven were replaced with their full-resolution generated originals; retama and
Salsola received targeted botanical corrections. No pixels were enlarged by
interpolation. The three recent additions remain unchanged.

The review compared visible diagnostic features with primary botanical sources.
The drawings remain the app's labelled AI-generated planning illustrations, not
specimens identified by a botanist. They show selected growth/reproductive states
at different biological scales. Pixel dimensions do not imply equal plant size.

## Older depictions checked

| Asset | Visible features checked | Source | Resolution-update result |
|---|---|---|---|
| [Carob](carob.png) — *Ceratonia siliqua* | Paired leathery leaflets, even-pinnate leaves and flattened mature pods | [University of Almería](https://www.ual.es/vida-universitaria/patrimonio-cultural/ciencias-naturales/obra/22483/ceratonia-siliqua-l) | Original restored |
| [Wild olive](wild_olive.png) — *Olea europaea* var. *sylvestris* | Opposite narrow simple leaves, silvery undersides and small dark olive drupes | [University of Porto](https://mhnc.up.pt/pt/colecoes/colecao-botanica-viva/zambujeiro/), [University of Seville](https://asignatura.us.es/abotcam/especies/Olea_europaea.html) | Original restored |
| [Lentisk](lentisk.png) — *Pistacia lentiscus* | Even pairs of leathery leaflets, winged rachis, no terminal leaflet, red-to-dark drupes | [University of Almería](https://nevada.ual.es/biocon/pistacia-lentiscus.html) | Earlier corrected original restored; initial rejected leaf arrangement not reused |
| [Aladierno](buckthorn.png) — *Rhamnus alaternus* | Alternate toothed simple leaves and dark drupes; distinct from thorny *R. lycioides* | [University of València Botanic Garden](https://www.jardibotanic.org/index.php?apid=cataleg_virtual_despecies-220&pid=2337) | Original restored |
| [Palmetto](palmetto.png) — *Chamaerops humilis* | Palmately divided folded fan leaves, spiny petioles and fibrous stem base | [UAM herbarium](https://herbariodocenteuam.github.io/Paneles/paneles/fichas/Chamaerops_humilis.pdf), [Stanford](https://trees.stanford.edu/ENCYC/CHAhu.htm) | Original restored |
| [Retama](retama.png) — *Retama sphaerocarpa* | Almost leafless grey-green shoots and small yellow pea flowers in axillary racemes | [University of Almería](https://nevada.ual.es/biocon/retama-sphaerocarpa.html) | Corrected: smaller separated lateral clusters, exposed shoot tips; reduced long flower-column appearance |
| [Esparto](esparto.png) — *Macrochloa tenacissima* | Dense basal tussock, long narrow rolled leaves and retained straw-coloured bases | [University of Almería](https://nevada.ual.es/biocon/macrochloa-tenacissima.html) | Earlier foliage-only correction restored; rejected pampas-like plumes not reused |
| [Winter thyme](thyme.png) — *Thymus hyemalis* | Small opposite narrow leaves, compact terminal flower heads, pink two-lipped corollas and reddish calyces | [University of Almería](https://nevada.ual.es/biocon/thymus-hyemalis-subsp.-hyemalis.html) | Original restored |
| [Ziziphus](ziziphus.png) — *Ziziphus lotus* | Zigzag thorny twig, alternating three-veined leaves and small rounded drupes | [UAM herbarium](https://herbariodocenteuam.github.io/Paneles/paneles/fichas/Ziziphus_lotus.pdf), [MAPA botanical account](https://www.mapa.gob.es/dam/mapa/contenido/agricultura/temas/medios-de-produccion/semillas-y-plantas-de-vivero/recursos-fitogeneticos-para-la-agricultura-y-la-alimentacion/docs/flora_al-andalus_2/angiospermas/flora_al_andalus_vol_2_374-386_ramnaceas.pdf) | Original restored; no substitution with cultivated *Z. jujuba* |
| [Lycium](lycium.png) — *Lycium intricatum* | Thorny branching, small fleshy leaves and violet flowers with a distinct tubular corolla | [University of the Balearic Islands](https://herbarivirtual.uib.es/es/general/505/especie/arc-intricat) | Original restored |
| [Salsola](salsola.png) — *Salsola webbii* | Pale woody shoots and slender curved cylindrical glaucous leaves, alternating or in axillary tufts | [Flora de Almería, printed p. 108](https://www.dipalme.org/Servicios/Anexos/anexosiea.nsf/VAnexos/IEA-FA-f-c9/%24File/FA-f-c9.pdf) | Redrawn in non-flowering foliage state; removed broad flat blades and oversized fruiting forms |
| [Oleander](oleander.png) — *Nerium oleander* | Narrow leathery leaves, whorled arrangement and simple five-lobed pink flowers | [University of Barcelona](https://museuvirtual.ub.edu/objecte/cpvfs00041/) | Original restored |
| [Tamarix](tamarix.png) — *Tamarix* spp. | Fine branching, small scale leaves and narrow racemes of tiny pink flowers | [University of València: *T. gallica* example](https://www.jardibotanic.org/?apid=cataleg_virtual_despecies-220&pid=2663) | Original restored; genus-level representation retained, without assigning a species |

Some earlier source URLs were intermittently unavailable during the review.
Additional accessible university descriptions were added to plant details for
wild olive, lentisk, palmetto, retama and Ziziphus; the original links were retained
as supplementary references. The Salsola diagnosis was available in the indexed
Flora de Almería page; direct PDF fetching was intermittent.

## Provenance and prompts

The [high-resolution manifest](high-resolution-manifest.json) lists all final files,
dimensions and SHA-256 checksums. For the 13 replacements it records the source
original, original generation prompt, relevant earlier correction prompt, and
new correction/redraw prompt where applicable. Built-in `image_gen` was used for
the original images and the retama/Salsola corrections; restoring the other
originals was a byte-for-byte file copy.

The three additions are documented separately in
[generation-prompts-v2.json](generation-prompts-v2.json). The original prompt
history remains in [generation-prompts.json](generation-prompts.json).
