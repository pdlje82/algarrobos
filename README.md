# Algarrobos restoration simulator

A local, playable 30-year restoration journey implementing [the MVP brief](Restoration_Simulator_MVP_Brief.md). Python owns the simulation; FastAPI connects it to React. All amounts, areas, delays and outcomes are **fictional placeholders for playtesting**, not ecological, investment, legal or grant forecasts.

The application lives in `restoration_simulator/`. Existing documents remain separately in `doc_library/`; this MVP does not ingest them.

## Install with Conda (Windows PowerShell)

You need an installed Conda distribution (Miniforge, Miniconda or Anaconda), PowerShell, internet for initial installation, and a modern browser. Conda installs **Python 3.12, Node.js 22, FastAPI (0.120–0.x), Uvicorn (0.38–0.x) and HTTPX (0.28.x)** from conda-forge. No separate Python/Node installer, pip command, Docker, API key or account is required. npm installs React and Vite from the committed frontend lockfile.

If `conda activate` is unavailable, run `conda init powershell` from your Conda prompt and reopen PowerShell.

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
conda env create --file environment.yml
conda activate restoration-simulator
Set-Location .\frontend
npm.cmd ci
```

The Conda environment provides Python isolation; no second virtual environment is needed. `npm.cmd` avoids PowerShell's npm script execution-policy issue. Adjust the checkout path if installed elsewhere.

For an existing environment after changes to the definition:

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
conda env update --file environment.yml
```

## Start the simulator

Keep two PowerShell windows open. **Window 1 — Python API:**

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
conda activate restoration-simulator
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

If your terminal is at the repository root (`algarrobos`) instead, use this alternative command. The `backend` package is inside `restoration_simulator`, so running without changing directory or specifying `--app-dir` causes `ModuleNotFoundError: No module named 'backend'`.

```powershell
python -m uvicorn backend.app:app --app-dir .\restoration_simulator --host 127.0.0.1 --port 8000
```

**Window 2 — React frontend:**

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator\frontend'
conda activate restoration-simulator
npm.cmd run dev
```

Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)**. The frontend calls relative `/api` URLs through Vite's [development proxy](https://vite.dev/config/server-options#server-proxy). Both services bind to loopback; no broad CORS is configured. Stop each with **Ctrl+C**. Restart with the same commands to restore your project. Run only one backend process, with one worker, against the save file.

## First playthrough: seven land-access routes

1. Create a project and choose **Establish land access**. Browse seven cards or switch to **Compare seven routes**. **I already own this land** records an existing asset separately from new acquisition.
2. Select a new candidate or an existing parcel. Name the owner, rights holder and operator; review covered area, costs, access duration, maintenance commitment and permissions. An existing nonprofit partner is available without creating an organisation.
3. Keep **Assume concluded / approved (fictional)** for playable access, or record a **Proposal only**. Blank amounts mean Unknown. Proposals provide no access, ownership transfer, deposit or rent. Use **Finalise a land proposal** to review and complete terms later.
4. Inspect the Python preview and separate access/maintenance timeline, then commit. Comparing and editing drafts never saves or advances time.
5. Establish the demonstrator, apply for the grant, receive the award, then receive payment. Expand only where permissions, covered area and remaining access duration support the whole action.
6. **Renew temporary access** explicitly if needed. **End land access** immediately ends an arrangement before its 0.1-year administrative delay and returns held deposits; ownership and independent maintenance commitments remain. A different arrangement can then use the same parcel.
7. Optionally form a company/foundation, obtain more land and advance to year 30. Review current access, ownership, historical work and remaining commitments. Export the run to keep it.

**Available now** is expanded. **Future decisions** is collapsed with prerequisite/resource reasons. **No longer available** explains exclusions. Completed one-off actions remain in history; repeatable actions can become available again. On a phone the comparison table scrolls within its container.

## Fictional fixture and contract assumptions

All definitions live in `restoration_simulator/scenarios/default.json`. New runs use scenario/save version 3, start with **€60,000**, and retain the **30-year playable horizon**. No real legal validity, title, tax, grant eligibility, land valuation or ecological growth is calculated. The seven routes are educational entry points; an underlying agreement may combine concepts from several routes.

| Route | Setup years | One-off expenditure | Annual access fee | Access duration | Deposit |
| --- | ---: | ---: | ---: | --- | ---: |
| Stewardship agreement | 0.5 | €500 | €0 | 4 years | €0 |
| Free use | 0.5 | €200 | €0 | 8 years | €0 |
| Long-term lease | 0.5 | €500 | €600 | 10 years | €600 |
| Usufruct | 0.5 | €1,000 | €0 | 20 years | €0 |
| Public-land management | 0.5 | €500 | €100 | 5 years | €0 |
| Donation | 0.5 | €500 formalisation | €0 | No configured expiry | €0 |
| Purchase | 0.5 | €18,000 | €0 | No configured expiry | €0 |
| Existing ownership | 0 | €0 acquisition | €0 | No configured expiry | €0 |

Access templates default to **20,000 m²** covered and **€150/year maintenance for 5 years**, editable in configuration. **Existing ownership is recorded immediately at the current project year, with zero acquisition cost and no new maintenance commitment by default.** Its ownership basis is reported by the user or supported by an unverified reference; it is not a fictional agreement status. Maintenance duration is independent of access. Zero expenditure is not zero market value. Purchase/donation transfer ownership only on conclusion to the named recipient. Creating an organisation never transfers land. The existing-ownership record must match the owner and has no acquisition expenditure. The free-use fixture has no rent; its lease alternative requires positive rent. The stewardship fixture uses a nonprofit rights holder, and the public-land fixture requires a public owner plus explicit assumed approval. These fixture requirements do not certify real eligibility.

There is **at most one active arrangement per parcel**, with any number of proposals/historical arrangements. Covered area may be smaller than the parcel. It is one assumed footprint; no GIS polygons are checked. Historical restoration conservatively reduces remaining area on that parcel. Renewal/reuse does not create another parcel or double the accessible area.

Rent/access fees are paid **annually in advance**, first on activation, then on anniversaries strictly before access expiry. Maintenance is paid **annually in arrears**, prorating a final fractional period; it continues until its independent commitment ends. A renewal after a lapsed maintenance period creates a separate period. Deposits return in full on expiry or explicit ending. Renewal costs **€100**, defined in the scenario action. An active renewal extends the current end; a renewal after expiry starts a new period and preserves the gap. No renewal is automatic.

Every action processes scheduled events, including time advanced through restoration, grant and organisation actions. There is no monthly loop or compound growth. An unaffordable payment rejects the entire action without partial effects; preview an earlier target and arrange funds or reduce future access commitments before the due date. Ending access does not cancel an existing maintenance commitment.

Expiry removes current access and blocks further work requiring it; ownership and completed restoration remain historical facts. Unknown permissions, unresolved site restrictions, insufficient covered area or access ending before work finishes block that restoration action. They do not turn unknown evidence into a verified legal prohibition.

Contract/instrument and exit text are **descriptive notes**, not executable clauses. The prototype does not calculate disputes, penalties, taxes or notice periods. The timeline/final summary disclose maintenance and rent continuing beyond year 30. Sources link to the existing poster and COASTRUST material via a fixed API whitelist; no documents are duplicated or ingested. There is no success score.

## Parcel sizes, site descriptions and timeline controls

Area inputs and live summaries use **m²**, including plots as small as 200 m². Total parcel area describes the whole recorded parcel; the included/covered area describes the part made available to the initiative; restoration work area describes actual completed work. For example, a 2,000 m² finca may include 200 m², with 100 m² restored initially. The **Use the entire parcel** checkbox links included area to total area until unchecked or manually changed. Field explanations are always visible, with longer help available by hover, keyboard focus or tap; Escape closes help.

The demonstrator and expansion accept a configurable work area within the remaining covered area. Their existing scenario costs and durations remain **fixed**, clearly disclosed beside the input: a 200 m² demonstrator still costs €12,000 and takes 1.5 years in the default fixture. No area-based cost model or real grant eligibility is inferred.

Site details separate **current use**, **vegetation/cover**, **condition** and **restrictions**. The category catalogue combines document-based agricultural and vegetation descriptions with general application choices; category source links identify the Vega assessment/diagnosis and Ferreira habitat project with PDF page references. **Add category…** accepts a custom name, reusable within that project once its parcel is committed. Custom and older free-text descriptions survive save, export and import; undo removes an undone parcel's otherwise-unused categories.

The main timeline includes named parcel rows on a proportional year 0–30 axis, access start/end periods, preserved renewal gaps, indefinite-ownership arrows and a current-year marker. **Show land access**, **Show maintenance commitments** and parcel checkboxes let users display all, one or several parcels. These controls only affect presentation; hiding a row never cancels access, payments or commitments. Maintenance may outlast access. Preview bars are dashed and hypothetical; a pending proposal has no effective period. An existing-ownership row shows when its record was added, not an inferred acquisition date. The milestone cards retain their explicitly schematic spacing.

## Saving, import and undo

Python atomically saves `restoration_simulator/data/active-project.json` after each successful mutation. It includes the exact scenario snapshot, history, one-level undo snapshot, monotonic revision and request receipts. Saves live on the **computer running Python**, not in browser storage or the cloud. Runtime data, environments, dependencies and build output are Git-ignored.

JSON export contains the project and undo snapshot in a versioned envelope. Import validates schema, field types, ranges, supported scenario ID/version and the complete deterministic history before replacing anything. Invalid/unsupported imports preserve the current project. New saves/exports and the default scenario use **version 3 with explicit `area_unit: "m2"`**. Version-1 and version-2 saves/exports are validated with the frozen legacy engines and explicitly upgraded. Historic cash, time, history and undo remain. Version-1 access keeps its legacy assumptions with no retroactive rent and temporary access through year 30; version-2 agreements retain their recorded periods, payments and obligations. The original snapshot remains embedded for replay. Live parcel, covered and restoration areas are converted from hectares to square metres without rounding away original precision (2 ha becomes 20,000 m²). Original history retains its exact hectare-based inputs and wording, identified in the UI; old action dates, cash and maintenance commitments are not rewritten. Before migrating a local autosave, Python creates a byte-for-byte `active-project.schema-v1-<checksum>.json` or `active-project.schema-v2-<checksum>.json` backup and atomically replaces the active file; failed migration preserves the original. Importing an old export upgrades the active save without rewriting the source export. Scenario imports are data, not executable scripts.

Undo restores the last action's cash, time and state and survives restart/export/import. It is one level, with no redo. Revisions continue increasing after undo. New-project replacement clears undo; import restores the imported undo.

Each mutation includes an expected revision and UUID request identifier. Receipts survive restart. Retrying the exact request does not repeat effects; stale revisions and identifiers reused for different requests are rejected. After an uncertain network failure, use **Retry the same request** or **Reload saved project**. Save/API failures are shown in the UI; a failed save does not publish candidate state. A corrupt autosave is reported without overwriting it: preserve or move that file and restart, then import a valid export.

The MVP supports at most 500 decisions per project and imports up to 2 MB. It has no multiprocess file locking; use one backend. To choose another save path, set this before starting Python:

```powershell
$env:RESTORATION_SAVE_PATH = 'C:\Users\JanEngelke\restoration-saves\active-project.json'
```

## Change the simulation in Python

| File inside `restoration_simulator/` | Responsibility |
| --- | --- |
| `backend/engine.py` | Standard-library-only rules, validation, prerequisites and deterministic transitions |
| `backend/storage.py` | Atomic persistence, import, saved undo and retry receipts |
| `backend/app.py` | FastAPI routes and validated requests |
| `scenarios/default.json` | Action table, costs, duration, outcome text, effects and outline |
| `frontend/src/` | React presentation and UI state; no duplicated simulation rules |
| `tests/test_simulator.py` | Focused engine/API acceptance checks |
| `tests/test_land_access.py` | Seven-route lifecycle, payment, permission and migration checks |
| `tests/test_square_metres.py` | Small-plot journeys, category persistence and version-2 conversion |

Edit the scenario JSON for new projects. `backend/legacy.py`, `backend/engine_v2.py`, `scenarios/legacy-v1.json` and `scenarios/legacy-v2.json` are retained for exact replay of older saves. Existing saves retain their exact embedded definitions. Keep supported effect shapes and handler kinds; add new behavior through the explicit Python handlers. Incompatible handler/schema changes need version handling instead of silently reinterpreting saves. There is no scripting language, workflow editor or plugin framework.

The engine works directly in Python without installing FastAPI or running the website. From the `restoration_simulator` directory, start Python and use:

```python
from backend.engine import new_project, list_actions, transition

state = new_project('Python playtest')
from backend.engine import land_form
form = land_form(state, 'lease')
inputs = {f['name']: f['default'] for f in form['fields']}
inputs.update(route_id='lease', parcel_id='new')
state, result = transition(state, 'establish_access', inputs)
state, result = transition(state, 'demonstrator', {'parcel_id': 'parcel-1', 'restoration_area': 10000})
print(state['time'], state['cash'], result)
# 2.0 45550 ... (includes scheduled rent and maintenance)
```

`transition` returns a new state and explanation with no mutation or I/O. `list_actions(state)` supplies input fields, choices and unavailability reasons. The API provides `GET /api/project`, `GET /api/actions`, `POST /api/project/new`, `POST /api/preview`, `POST /api/commit`, `POST /api/undo`, `GET /api/export` and `POST /api/import`, read-only `POST /api/land/form` and whitelisted `GET /api/sources/{id}`. Request schemas are at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) while Python runs.

## Checks and playtest stop point

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
conda activate restoration-simulator
python -m unittest discover -s tests -v
Set-Location .\frontend
npm.cmd run build
npm.cmd audit
```

The focused tests now cover all seven land routes, proposal/finalisation, scheduled costs, expiry and renewal, overlap prevention, ownership separation, commitments beyond year 30, migration/backups, and also exercise both starting routes with and without organizations, grant stages/payment once, invalid-action immutability, frozen scenarios, horizon limits, decision grouping and prerequisite/resource changes, previews, restart with undo, duplicate/stale requests, export/import (including browser JSON number normalization), malformed imports, corrupt autosaves and atomic-write failure. Production bundling checks the React frontend; playtesting uses the two local development servers above. No deployment infrastructure is included.

Verified on Windows on 27 October 2026 with Conda Python 3.12 and Node 22.23.4: all **37 tests passed** and the production frontend built. The earlier version-2 browser playthrough combined a lease and a public-land proposal, required resolution of an unknown cost before finalisation, completed grant stages and restoration, renewed access explicitly, and reached year 30. Expiry removed current access while retaining restoration history. Export/import, refresh and saved undo passed; route comparison preserved drafts, and desktop and 390-pixel phone layouts were checked. The version-3 playtest recorded a 2,000 m² finca with 200 m² included at year 0 without costs or maintenance, completed a 200 m² demonstrator, reused a custom category on a neighbouring parcel, and checked independent parcel/access/maintenance visibility. Phone-width help stayed within the viewport. Restarting the test Python server restored the same version-3 project and its saved undo; tests also cover restoration after reopening the saved store. Browser checks used an isolated save under ignored `test-artifacts/`; no runtime dependencies were added.

Manual acceptance: complete the journey at desktop and phone-sized widths, use Tab/Enter to reach controls, inspect the final summary and past results, refresh, then restart Python to verify restoration of state and undo. Stop for a playtest before adding GIS, document ingestion, real grants, forecasting or further infrastructure.

If Conda reports a corrupt shared package cache, use a separate project cache (ignored by Git) and retry:

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
$env:CONDA_PKGS_DIRS = Join-Path (Get-Location) '.conda\pkgs'
conda env create --file environment.yml
# If already created: conda env update --file environment.yml
```
