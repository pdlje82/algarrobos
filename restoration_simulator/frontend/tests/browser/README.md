# Browser checks

Use an isolated project save; never point these mutation tests at the normal API
on port 8000. Activate the project's Conda environment first.

From `restoration_simulator`, start a separate API:

```powershell
python -c "from pathlib import Path; from backend.app import create_app; import uvicorn; uvicorn.run(create_app(Path('test-artifacts/interaction-browser-save.json')), host='127.0.0.1', port=8013)"
```

From `restoration_simulator/frontend`, start Vite with the isolated API proxy:

```powershell
npm exec vite -- --config tests/browser/vite.config.mjs --host 127.0.0.1 --port 5174 --strictPort
```

In another terminal in that frontend directory, set `PLAYWRIGHT_MODULE` to an
installed Playwright module's absolute path. These checks use its Microsoft Edge
browser channel. Then run:

```powershell
$env:DESIGNER_TEST_API = 'http://127.0.0.1:8013/api/'
$env:DESIGNER_APP_URL = 'http://127.0.0.1:5174/'
node tests/browser/designer-interactions.cjs
```

This checks checklist location highlighting, Enter/blur completion and request
ordering, validation/retry/discard, Undo, plant keyboard and touch movement,
associations, placement of unplaced plants, saved values, warning colours and
contrast, both themes and narrow layouts. Screenshots go to `test-artifacts/`.
Draft operations must leave simulation state unchanged. Run
`node tests/browser/plant-workflows.cjs` with the same environment to check
Spanish/German/scientific identities, checkbox-only removal, standalone series,
reload checkpoints and failures, Apply prerequisites, and phone layouts.

To check the built app without starting another server, run `npm run build`, set
`DESIGNER_PRODUCTION_DIR` to the absolute `frontend/dist` path and rerun the same
script. Playwright serves those unchanged HTML, JavaScript, CSS and image files
only within its test browser; API requests still use the isolated server.

For the existing PDF integration checks, use the same isolated servers and set
`PDF_TEST_API` to `http://127.0.0.1:8013/api/` and `PDF_APP_URL` to
`http://127.0.0.1:5174` (without a trailing slash), then run
`node tests/browser/documents.cjs`. Both scripts replace only the isolated test
project, so run all browser scripts sequentially. Stop the isolated servers when finished.

Run `node tests/browser/planning-handoff.cjs` for draft autosave/failure recovery,
growth-form grouping, Encina/Carrasca search, filtered drawing selection and
checklist-only scrolling/focus preservation, handoff without simulation effects,
restart/reload, Project validation/review/commit, ordering status and responsive
light/dark layouts. Use the same isolated API and optional production-assets setup.

Run `node tests/browser/demonstrator-removal.cjs` for removal preview/Cancel/Escape,
dependency blocking, failed writes and lost-response retries, stable request IDs,
preserved parcels/designs/drafts, saved Undo after reload, stale revisions and
red confirmation controls in both themes at desktop/phone widths. It replaces
only the isolated fixture project; run mutation browser scripts sequentially.
