# Drone extension: sources, pictures and technical figures

Prepared 3 November 2026 for section 13 of [LEARN-016](../../LEARN-016%20-%20Almeria%20Restoration%20-%20Irrigation%20Technology%20and%20Demonstrator%20Research%20-%202026-11-03.md). The full findings are in that report; listening chapters thirteen–sixteen are in the [illustrated reading package](../elevenreader/README.md).

The author recommendation is to begin with a shared RGB survey service, fixed ground probes and locally controlled tank irrigation. Spectral/thermal sensing should demonstrate useful additional information. Microwave mapping, contact-probe robotics and water delivery have separate validation requirements. This search did not establish that drone root-watering is common practice in Almería.

## Evidence map

| Evidence | What was verified | Limits |
|---|---|---|
| FGR PSP-T014 and T018, 28 March 2024 | Seedling survival survey comparison; RGB versus multispectral | Radiata pine in New Zealand; not local accuracy estimates |
| [DJI Mavic 3M](https://enterprise.dji.com/mavic-3-m) | Integrated RGB and four-band camera examples | Manufacturer capabilities, no local field validation |
| [MicaSense Altum-PT](https://eaglenxt.com/products/sensors/micasense-series/altum-pt/) | Thermal/spectral payload, stated resolution and calibration | Manufacturer specifications; plant temperature requires sufficient clean canopy pixels |
| [Monash SMART Irrigation](https://smart.eng.monash.edu/index.html) | Project description of radiometry and deeper water-balance modelling | Near-surface retrieval and modelled depth are distinct; roadmap is not completed validation |
| Henrion et al., 2025 | GPR peatland study, including limited spatial agreement | Peatland-specific calibration and footprint; no universal depth |
| [GreenScatter](https://arxiv.org/abs/2604.09363), 10 April 2026 | Research preprint and reported crop trials | Peer-reviewed status not established from arXiv record; no Almería validation |
| [DAISY Lab authors' repository](https://github.com/thedaisylab/UAV-soil-moisture-robot) | Landing/probe sequence, field data and code | Publisher full text blocked; do not imply its complete paper was read |
| [Singh et al., Sensors, 26 February 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC8914728/) | Ground-sensor data ferry field study | RF450 implementation; not a ready EU868 LoRa design |
| Miwa et al., 21 March 2024 | Hose/power-fed citrus water-spraying experiment | Spray adhesion, not root moisture, water-use efficiency or survival |
| [DJI Agras T100](https://ag.dji.com/t100), T50 manual | Commercial spraying payload examples | Regional availability, exact Spanish operation and price not established |
| [IFAPA, 8 June 2020](https://www.juntadeandalucia.es/agriculturaypesca/ifapa/web/noticias/el-dron-aliado-imprescindible-en-la-investigacion-andaluza) | Andalusian thermal irrigation-uniformity research | Agricultural study; not prevalence of restoration watering |
| [EASA open category](https://www.easa.europa.eu/en/domains/drones-air-mobility/operating-drone/open-category-low-risk-civil-drones), AESA, [ENAIRE](https://aip.enaire.es/AIP/UAS-es.html) | General operation/geozone planning boundaries | No site coordinates assessed or flight permission obtained |

## Downloadable documents offered for addition

These external PDFs are not catalogued library holdings. Temporary downloaded PDFs were used for text/page inspection; copied reference images are separately credited assets within LEARN-016. Checked 3 November 2026.

- [UAV Survival Assessments: RGB Ortho-plotting — Forest Growers Research, PSP-T014, 28 March 2024 — direct PDF](https://www.toolsforforesters.co.nz/__data/assets/pdf_file/0005/124925/UAV-Survival_RGB_ortho-plot.pdf). 10 pages; research browser opened the PDF, while the automated downloader received HTTP 403.
- [Enhancing Survival Surveys: Multispectral vs. RGB UAV Imaging — Blake A. Singleton, Robin J. L. Hartley and Sam J. Davidson / Forest Growers Research, PSP-T018, 28 March 2024 — direct PDF](https://fgr.nz/wp-content/uploads/2024/06/PSP-T018_UAVSurvival_Report_Multispectral_vs-RGB_final-1.pdf). 11 pages; downloaded and parsed for research.
- [Drone-borne ground-penetrating radar reveals spatiotemporal moisture dynamics in peatland root zones — Maud Henrion et al., Science of Remote Sensing, 10 October 2025 — repository PDF](https://orbi.uliege.be/bitstream/2268/336849/1/_Henrion%20SRS%202025.pdf). 17 pages; downloaded and parsed; research browser exceeded its size limit. Peatland-specific evidence, not Almería validation.
- [GreenScatter: Through-Canopy Soil Moisture Sensing with UAV-Mounted Radar — Luke Jacobs et al., arXiv submission 10 April 2026 — direct preprint PDF](https://arxiv.org/pdf/2604.09363). 14 pages; downloaded and parsed. [Stable abstract/version page](https://arxiv.org/abs/2604.09363).
- [Experiments on watering citrus fruits with a wire-supplied drone using RTK-GNSS — Masafumi Miwa, Satoshi Hishida, Keiichi Nishikawa and Masataka Shiromaru, 21 March 2024 — publisher PDF](https://medcraveonline.com/IRATJ/IRATJ-10-00280.pdf). Four pages, journal pp. 32–35; downloaded and parsed. Spray trial, not root-irrigation validation.
- [AGRAS T50/T25 Unmanned Aircraft Flight Manual v1.0 — DJI, January 2025 edition — manufacturer PDF](https://dl.djicdn.com/downloads/t50_t25/20250109/T50_T25_User_Manual_v1.0_EN.pdf). 107 pages; downloaded and parsed. Cover date January 2025; body copyright 2024.
- [Metodología del uso de drones e imágenes satélite para la mejora de la rentabilidad de los regadíos — Benito Salvatierra Bellido and Manuel López Rodríguez / Junta de Andalucía, hosted by MAPA, date not established — direct PDF](https://www.mapa.gob.es/dam/mapa/contenido/desarrollo-rural/temas/gestion-sostenible-de-regadios/documentos/ponencia2.pdf). 33 pages; research browser opened it; automated download failed certificate verification and was not retried with TLS checks disabled.
- [Guide to UAS flight requirements and limitations depending on the place of operations — AESA, Ed. 03, publication date not established — direct PDF](https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPR-P01-DT16_Ed.03_UAS.geoghaphical.zones.pdf). 36 pages; research browser opened it. Check the current official edition before planning flights.

## Original technical figures

Eight original schemes, not surveyed layouts, measured image data or installation instructions. [Builder](build_figures.py) requires Python, PyMuPDF and Pillow. Figures 1–12 remain in their original directory.

| Figure | PNG | Editable SVG |
|---|---|---|
| 13 drone roles | [View](figures/13-drone-roles.png) | [Source](figures/13-drone-roles.svg) |
| 14 drone image resolution | [View](figures/14-drone-image-resolution.png) | [Source](figures/14-drone-image-resolution.svg) |
| 15 drone moisture depth | [View](figures/15-drone-moisture-depth.png) | [Source](figures/15-drone-moisture-depth.svg) |
| 16 drone ground fusion | [View](figures/16-drone-ground-fusion.png) | [Source](figures/16-drone-ground-fusion.svg) |
| 17 drone water loads | [View](figures/17-drone-water-loads.png) | [Source](figures/17-drone-water-loads.svg) |
| 18 drone spray versus root | [View](figures/18-drone-spray-versus-root.png) | [Source](figures/18-drone-spray-versus-root.svg) |
| 19 drone validation trial | [View](figures/19-drone-validation-trial.png) | [Source](figures/19-drone-validation-trial.svg) |
| 20 drone demonstrator gates | [View](figures/20-drone-demonstrator-gates.png) | [Source](figures/20-drone-demonstrator-gates.svg) |

## Source pictures and reproducibility

Twelve reviewed pictures are in the [contact sheet](picture-contact-sheet.jpg) and embedded at the corresponding report/ebook passages. The [picture credits](../elevenreader/Picture%20credits%20and%20coverage.md) and [acquisition record](Acquisition%20record.json) identify owners, source URLs, file hashes and rights. Manufacturer images can be renders; the GPR and Miwa images come from research figures. None is an AI-generated product photograph. The source copyrights and stated non-commercial/no-derivatives conditions are preserved in the credits; this package does not grant blanket reuse rights.

[Extension checks](Extension%20checks.json) verify 32 report images, all 72 ebook images, local Markdown links and byte preservation of the predecessor’s 52 illustrations. Direct ElevenReader import/playback remains untested.

[Research verification](Research%20verification.json) retains successful reads and failed requests. Automated requests to some institutional/publisher sites received 403, and MAPA failed certificate verification. Where the research browser independently opened the intended PDF, that route is recorded explicitly. TLS validation was not disabled. The initial Altum URL redirected to a blocked legacy path; the explicitly verified current canonical manufacturer page was used. The GPR PDF exceeded the research-browser size limit but was downloaded and parsed successfully.

`inspect_sources.py` records these intended reads in a temporary research cache and exits unsuccessfully if any source fails; a failed source is not silently replaced. `add_pictures.py` is a one-time migration from the predecessor forty-picture manifest and intentionally rejects rerunning on the expanded registry. Ordinary ebook rebuilds use retained, hash-validated assets and do not fetch sources. No simulator configuration or saved project was changed.
