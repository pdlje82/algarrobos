# Carob restoration guide: illustrations and provenance

Companion to [LEARN-008: nursery buying and mixed planting models](../LEARN-008%20-%20Carob%20Restoration%20-%20Nursery%20Buying%20Guide%20and%20Mixed%20Planting%20Models.md), created 28 October 2026.

## Photographs extracted from the local handbook

Source: Navarro Cerrillo, R. M., and Palacios Rodríguez, G. (eds.), **2026**, *Soluciones innovadoras para consolidar el algarrobo como cultivo de alto valor en Andalucía*, UCOPress / Universidad de Córdoba. [Local FOREST-002 PDF](../FOREST-002%20-%20Andalusia%20-%20Carob%20Cultivation%20and%20Restoration%20Handbook%20-%202026.pdf), DOI [10.21071/000069](https://doi.org/10.21071/000069).

| File | Book location | Credit | Original dimensions |
|---|---|---|---|
| [01-carob-landscape-examples.png](01-carob-landscape-examples.png) | p. 92, complete Figure 5.1 photographic plate | Handbook; no individual photographer or dates in its caption | 1250 × 654 |
| [02-mixed-oak-carob-dehesa.png](02-mixed-oak-carob-dehesa.png) | p. 100, Figure 5.6 | QUERAT, 2024 | 654 × 468 |
| [03-las-labores-albox.png](03-las-labores-albox.png) | p. 128, left photograph of Figure 5.37 | QUERAT, 2024 | 625 × 468 |
| [04-la-alcantarilla-mojacar.png](04-la-alcantarilla-mojacar.png) | p. 135, Figure 5.49 | QUERAT, 2024 | 631 × 468 |
| [05-la-tortola-nijar.png](05-la-tortola-nijar.png) | p. 137, Figure 5.52 | QUERAT, 2024 | 631 × 468 |

These are actual source photographs, not newly generated depictions. Embedded JPEG 2000 images were decoded to PNG at original pixel dimensions. They were not retouched, sharpened or upscaled. The Figure 5.37 selection contains only its left photograph; all other selections reproduce the corresponding complete embedded photographic image or plate. Captions remain in the report rather than being painted onto the photographs. Source-page captions and photograph identities were visually checked.

The book's p. 6 and publisher page state **CC BY-NC-SA 4.0**. Preserve author, publisher, DOI and the individual figure credits. These extracts and the adapted guide are for noncommercial reuse under those terms; commercial app incorporation is not authorized by this licence. No repository-wide software licence is changed.

## Original explanatory graphics

| Diagram | Markdown image | Editable source |
|---|---|---|
| Container geometry and preparation depth | [PNG](06-container-and-preparation.png) | [SVG](06-container-and-preparation.svg) |
| Mixed restoration mosaic | [PNG](07-mixed-restoration-mosaic.png) | [SVG](07-mixed-restoration-mosaic.svg) |

Both graphics are **1400 × 900 px**, drawn in code and rendered directly from SVG. They have accessible titles/descriptions and no external image dependencies. They are conceptual explanations, not measured root distributions, commercial pot specifications, parcel surveys or planting prescriptions. No image-generation model or generated botanical imagery was used.

Figure 2 distinguishes nominal volume from dimensions and planting position from deeper preparation. Figure 7 proposes grouped planting, retained vegetation and a conditional oak component; there is no scale, planting density, catchment dimension or approved hydraulic design. Read the full report's qualifications. Both original graphics are supplied under **CC BY-NC-SA 4.0** for consistency with this research bundle.

## Reproduction and verification

Run `build_assets.py` from the repository root with Python, **pypdf** and **Pillow**. It requires the exact named source PDF, extracts the five images, writes the two SVGs and initializes `manifest.json`. It does not alter the PDF. Then run `render_schemes.cjs` with Node, Playwright and Edge. The rendering script currently points explicitly to this workspace's bundled Playwright installation; update that path on a different machine. No new application dependency is introduced.

Rendering regenerates the two PNGs, checks text against canvas boundaries and records PNG checksums. Re-running the Python step resets the rendering fields, so always follow it with the render step. `manifest.json` records the source PDF checksum, page count, extraction origins, dimensions, image transformations and file hashes. Rendered diagrams and extracted photographs were visually inspected; the report's local links, heading anchors, image count and source PDF integrity were checked.
