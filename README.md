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

## First playthrough

1. Create a project. Preview and commit either **Use an existing personal parcel** or **Buy a demonstrator parcel**.
2. Establish the demonstrator on Parcel 1.
3. Apply for the grant, receive the award decision, then receive payment. These are separate decisions; only payment adds grant cash.
4. Expand on Parcel 1, obtain additional land through purchase or permission, then restore another parcel.
5. Optionally create a company and/or foundation. Both can coexist; neither is compulsory. Land remains with its stated owner.
6. Select **Advance time**, choose year 30, and commit. Review the final summary, land records and action history.
7. Export the run, undo the last action, refresh, and import the export. Starting a new project or importing over the active run asks for replacement confirmation. Preserve other runs as separate exports.

Selecting an action or changing fields only requests a Python preview; it does not advance time or spend cash. The UI updates the project after the backend confirms persistence. Inspect unavailable actions for their reason. Past history is read-only. At phone widths, scroll the timeline outline horizontally to keep labels readable.

Decisions are grouped into **Available now** (expanded), **Future decisions** (collapsed, with prerequisite/resource reasons), and **No longer available** (collapsed, for excluded land routes or actions that cannot fit before year 30). Completed one-off decisions remain in history; repeatable actions can become available again. Python determines the groups after each commit, load or undo. Restart the Python API after updating backend code so it can supply the current categories.

## Fictional fixture

All values are together in `restoration_simulator/scenarios/default.json`. Starting cash: **€60,000**. Horizon: **30 years**. Time is an offset with up to four decimal places; currency changes are rounded to cents. Outline years suggest a journey rather than enforce deadlines or automatically execute actions.

| Action | Years | Expenditure | Configured result |
| --- | ---: | ---: | --- |
| Existing personal parcel | 0.1 | €0 | 2 ha personally owned; existing asset with unassessed market value |
| Buy demonstrator parcel (alternative) | 0.5 | €18,000 | 2 ha purchased by the individual |
| Establish demonstrator | 1.5 | €12,000 | 1 ha restored |
| Apply for grant | 0.25 | €500 | Pending application; no income |
| Receive grant decision | 0.75 | €0 | €40,000 award pending payment |
| Receive payment | 0.25 | €0 | €40,000 cash received once |
| Expand restoration (repeatable) | 2 | €10,000 | Another 1 ha restored on the chosen parcel |
| Create company (optional) | 0.5 | €2,000 | Company added; no land transfer |
| Buy additional land (repeatable) | 1 | €15,000 | 3 ha purchased by the individual |
| Agree land access (repeatable) | 0.5 | €1,500 | Restoration permission on 3 ha owned by a third party |
| Establish foundation (optional) | 1 | €3,000 | Foundation added; any company continues |
| Advance time | Chosen target | €0 | Move forward, at most to year 30 |

Restoration cannot exceed the selected parcel's area. Permission is assumed to last for the fictional horizon. There are no recurring costs, growth calculations, investment returns, land valuations, eligibility rules or automatic grant settlement. Advancing time leaves pending grant stages pending. Unchosen outline milestones are proposals, not completed assets. There is no universal success score.

## Saving, import and undo

Python atomically saves `restoration_simulator/data/active-project.json` after each successful mutation. It includes the exact scenario snapshot, history, one-level undo snapshot, monotonic revision and request receipts. Saves live on the **computer running Python**, not in browser storage or the cloud. Runtime data, environments, dependencies and build output are Git-ignored.

JSON export contains the project and undo snapshot in a versioned envelope. Import validates schema, field types, ranges, supported scenario ID/version and the complete deterministic history before replacing anything. Invalid/unsupported imports preserve the current project. Save/export schema and scenario versions are currently 1. Scenario imports are data, not executable scripts.

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

Edit the scenario JSON for new projects. Existing saves retain their exact embedded definitions. Keep supported effect shapes and handler kinds; add new behavior through the explicit Python handlers. Incompatible handler/schema changes need version handling instead of silently reinterpreting saves. There is no scripting language, workflow editor or plugin framework.

The engine works directly in Python without installing FastAPI or running the website. From the `restoration_simulator` directory, start Python and use:

```python
from backend.engine import new_project, list_actions, transition

state = new_project('Python playtest')
state, result = transition(state, 'use_own_land')
state, result = transition(state, 'demonstrator', {'parcel_id': 'parcel-1'})
print(state['time'], state['cash'], result)
# 1.6 48000 ...
```

`transition` returns a new state and explanation with no mutation or I/O. `list_actions(state)` supplies input fields, choices and unavailability reasons. The API provides `GET /api/project`, `GET /api/actions`, `POST /api/project/new`, `POST /api/preview`, `POST /api/commit`, `POST /api/undo`, `GET /api/export` and `POST /api/import`. Request schemas are at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) while Python runs.

## Checks and playtest stop point

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
conda activate restoration-simulator
python -m unittest discover -s tests -v
Set-Location .\frontend
npm.cmd run build
npm.cmd audit
```

The focused tests exercise both starting routes with and without organizations, grant stages/payment once, invalid-action immutability, frozen scenarios, horizon limits, decision grouping and prerequisite/resource changes, previews, restart with undo, duplicate/stale requests, export/import (including browser JSON number normalization), malformed imports, corrupt autosaves and atomic-write failure. Production bundling checks the React frontend; playtesting uses the two local development servers above. No deployment infrastructure is included.

Verified on Windows on 26 October 2026 with Conda Python 3.12, Node 22.23.4, FastAPI 0.162.0, Uvicorn 0.54.0 and HTTPX 0.28.1: all 10 tests passed, the production frontend built, and npm audit reported zero vulnerabilities. A browser playthrough completed the own-land route, all grant stages, expansion, purchased and permission-only additional land, both organizations and year 30, leaving **€46,000, 8 ha of land owned/accessed, and 3 ha restored**. Browser export/import, refresh, keyboard history/undo, a rejected year-31 preview and desktop/390-pixel phone layouts were checked. Python was restarted and restored the test autosave; undo survived the browser export/import. Browser checks used an isolated save under ignored `test-artifacts/`.

Manual acceptance: complete the journey at desktop and phone-sized widths, use Tab/Enter to reach controls, inspect the final summary and past results, refresh, then restart Python to verify restoration of state and undo. Stop for a playtest before adding GIS, document ingestion, real grants, forecasting or further infrastructure.

If Conda reports a corrupt shared package cache, use a separate project cache (ignored by Git) and retry:

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
$env:CONDA_PKGS_DIRS = Join-Path (Get-Location) '.conda\pkgs'
conda env create --file environment.yml
# If already created: conda env update --file environment.yml
```
