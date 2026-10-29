# Library PDFs in Algarroba

The PDF viewer reads registered local library documents without opening project
storage, running designer calculations or changing saves. PDF.js is pinned to
6.4.299. Its library is loaded on first use; Vite serves/emits the matching worker,
CMaps, standard fonts, ICC profiles, image resources and WASM decoders locally.
The dependency's licence and font licences accompany the emitted assets.

## Catalogue and references

`scenarios/documents.json` is the editable catalogue, validated in Python and
JavaScript. It contains the 24 existing library PDFs: stable catalogue IDs,
descriptive titles, exact filenames, SHA-256 checksums, PDF page counts, known URL
aliases, explicit printed-page mappings and a verification note. Its viewer
settings own the initial page/scale, zoom limits and dialog dimensions/breakpoint.
PNG sources and unregistered external PDFs remain ordinary links.

PDF positions are one-based. The handbook's numbered running headers were checked
against PDF positions; existing guide citations match the printed numbers. Page
125 was also rendered for visual verification against its printed footer and
photographs. Existing photograph provenance verifies pages 92, 100, 128, 135 and
137. Only established printed numbers are mapped; absent mappings do not imply
an offset or an identity mapping. Other documents currently use PDF positions;
their printed numbering remains explicitly unestablished.

`DocumentLink` accepts a document ID/page/basis or an existing registered URL alias.
Handbook guide links use the printed-page mapping. Designer references retain
their existing PDF-page interpretation and pass their saved source checksum.
Other references without a page start at PDF page 1. Ordinary clicks open the
shared viewer; modified clicks preserve real local PDF anchor destinations.
Publisher webpages retain their original links.

Add a document by following doc_library/CATALOG.md, verifying its bytes and page
count, then adding an explicit catalogue record. Printed numbers must be checked
against the unchanged source before adding a mapping. Register a changed edition
deliberately; never replace an old saved reference's checksum or redirect it to a
different edition silently. Catalogue changes are independent of ecological
rules and do not rewrite embedded rules snapshots.

## Read-only interfaces and lifecycle

- `GET /api/documents/{id}` returns versioned metadata, media type and file URL.
- `GET /api/documents/{id}/file` serves the verified PDF inline, with byte ranges.
- Both accept optional `expected_sha256`; a mismatch returns 409.
- `download=true` on the file endpoint uses attachment disposition and the
  registered filename. Existing source endpoints remain compatible.
- Unknown IDs/missing files, changed bytes, bad configuration and unsupported
  citations produce explicit errors. Neither endpoint initialises the save store.

The viewer is a native modal rendered beside the app, above any mounted guide.
Only its window receives focus/Escape; the underlying guide's state and scroll
remain mounted. Closing cancels fetches/rendering and returns focus without
scrolling the opener. An explicit link target always determines the opening page;
there is no persistent reading position. Rendering starts hidden until the cited
page is ready. Retry repeats the requested document/page, without replacing the
underlying project. Search uses PDF text and reports no matches explicitly; it
does not recognise text in scanned images.

## Verification

From restoration_simulator, run `python -m unittest discover -s tests`.
From frontend, run `npm.cmd test` and `npm.cmd run build`.

`tests/browser/documents.cjs` checks the real viewer and native guide dialog using
`tests/fixtures/documents.html`, then the real designer. It deliberately refuses
the normal backend port 8000 for fixture mutations. Start a separate backend on
8013 with an isolated save and the frontend on 5174 using
`--config tests/browser/vite.config.mjs`. That test configuration routes native PDF
downloads/new tabs to the isolated backend as well as intercepted API requests.

Set `PLAYWRIGHT_MODULE` to an installed Playwright module,
`PDF_TEST_API=http://127.0.0.1:8013/api/` and
`PDF_APP_URL=http://127.0.0.1:5174`, then run
`node tests/browser/documents.cjs` from frontend. Screenshots/results go to the
ignored test-artifacts directory. Production verification uses the same isolated
proxy configuration with `vite preview --port 4174`, opening a real app reference
and checking worker/font/image rendering without any CDN or remote document URL.
