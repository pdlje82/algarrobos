# Algarroba — Restoration planning

A local, playable 30-year restoration journey implementing [the MVP brief](Restoration_Simulator_MVP_Brief.md). Python owns the simulation; FastAPI connects it to React. All amounts, areas, delays and outcomes are **fictional placeholders for playtesting**, not ecological, investment, legal or grant forecasts.

The application lives in `restoration_simulator/`. Existing documents remain separately in `doc_library/`; reference rules are curated from these documents; there is no automatic document ingestion.

The interface uses the Algarroba identity from the supplied logo sheet: forest green, warm ivory, restrained carob-brown accents and serif headings. Light, dark and system themes are available; dark mode keeps botanical image canvases black. Production logo assets and their provenance are documented in [the branding guide](restoration_simulator/frontend/public/branding/README.md). The checkout directory and Conda environment names remain as shown in the installation commands.

Development follows the mandatory [repository coding rules](AGENTS.md). Silent fallbacks are prohibited: required configuration and data must be validated, failures must be visible, and compatibility changes must use explicit migrations. The [fallback audit](restoration_simulator/FALLBACK_AUDIT.md) records the changes and intentional optional/legacy cases.

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
5. Choose **Plan the demonstrator**. Configure the planting pilot, record a baseline and, for AL20 3.4, funding feedback and an application before works. Explicitly record the decision, then plant, observe, evaluate and record reimbursement. Own/partner-funded pilots can proceed without an award. Expand only after evaluation and where access and area permit.
6. **Renew temporary access** explicitly if needed. **End land access** immediately ends an arrangement before its 0.1-year administrative delay and returns held deposits; ownership and independent maintenance commitments remain. A different arrangement can then use the same parcel.
7. Optionally form a company/foundation, obtain more land and advance to year 30. Review current access, ownership, historical work and remaining commitments. Export the run to keep it.

**Available now** is expanded. **Future decisions** is collapsed with prerequisite/resource reasons. **No longer available** explains exclusions. Completed one-off actions remain in history; repeatable actions can become available again. On a phone the comparison table scrolls within its container.

## Fictional fixture and contract assumptions

All definitions live in `restoration_simulator/scenarios/default.json`. New runs use scenario/save version 4, start with **€60,000**, and retain the **30-year playable horizon**. No real legal validity, title, tax, grant eligibility, land valuation or ecological growth is calculated. The seven routes are educational entry points; an underlying agreement may combine concepts from several routes.

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

For a new **I already own this land** record, the default total parcel area is **4,500 m²**, with **200 m² included for restoration**. Both remain editable. Configure `forms.land.existing.parcel_area` and `forms.land.existing.covered_area` in `restoration_simulator/scenarios/defaults.json`. Saved parcels and proposals keep their entered areas.

Area inputs and live summaries use **m²**, including plots as small as 200 m². Total parcel area describes the whole recorded parcel; the included/covered area describes the part made available to the initiative; restoration work area describes actual completed work. For example, a 2,000 m² finca may include 200 m², with 100 m² restored initially. The **Use the entire parcel** checkbox links included area to total area until unchecked or manually changed. Field explanations are always visible, with longer help available by hover, keyboard focus or tap; Escape closes help.

The guided demonstrator accepts a configurable work area and an **itemised, editable planting budget**. Costs follow entered plant counts and assumed unit prices, labour, preparation and water; monitoring and reporting are separate stages. The separate expansion action retains its fixed scenario cost and duration. No real quotes, eligible-cost rulings or ecological outcomes are inferred. Earlier saved journeys keep their original €12,000/1.5-year demonstrator results and assumptions.

Site details separate **current use**, **vegetation/cover**, **condition** and **restrictions**. The category catalogue combines document-based agricultural and vegetation descriptions with general application choices; category source links identify the Vega assessment/diagnosis and Ferreira habitat project with PDF page references. **Add category…** accepts a custom name, reusable within that project once its parcel is committed. Custom and older free-text descriptions survive save, export and import; undo removes an undone parcel's otherwise-unused categories.

The main timeline includes named parcel rows on a proportional year 0–30 axis, access start/end periods, preserved renewal gaps, indefinite-ownership arrows and a current-year marker. **Show land access**, **Show maintenance commitments** and parcel checkboxes let users display all, one or several parcels. These controls only affect presentation; hiding a row never cancels access, payments or commitments. Maintenance may outlast access. Preview bars are dashed and hypothetical; a pending proposal has no effective period. An existing-ownership row shows when its record was added, not an inferred acquisition date. The milestone cards retain their explicitly schematic spacing.

## Deleting a parcel while exploring

Each parcel card under **Land, rights & completed work** has a red **Delete parcel…** button. Deletion is an exploration edit outside the simulation workflow. The preview lists the parcel and dependent choices to delete, any other parcels affected through dependencies, and recalculated cash and project year. **Cancel** changes nothing. **Confirm deletion** rebuilds the project from its retained choices, removing the parcel's access arrangements, costs, planting, funding and timeline/history entries. It adds no deletion event, archive row or tombstone.

Python remaps surviving parcel/agreement references and replays their original inputs and rules, including earlier save versions. Choices that cannot remain valid without the deleted parcel are explicitly listed in the preview. Explicit unrelated choices, such as advancing to a given year, remain. Cash and time are recomputed rather than recording sale proceeds or a simulated refund. **End land access** remains a separate simulation decision with history.

**Undo deletion** restores the previous project until another change is saved, including after restarting Python. The previous project exists only in the local one-level undo buffer; **JSON exports omit that deletion buffer**, so exported files contain no hidden copy of the deleted parcel. The next saved change replaces the buffer. Older saves containing soft-removed/excluded parcels are cleaned on load or import, including their nested migration snapshots. Frozen legacy handlers validate those older saves before rebuilding them. Preview uses `POST /api/parcels/removal-preview`; confirmation uses the separate revision-checked, idempotent `POST /api/parcels/delete`. Deletion cannot be committed as a simulation action. Failed writes preserve the last saved project.

## Establishing the planting demonstrator

**Project** retains demonstration protocol, funding, participation, reporting, other budget fields and timing. **Site Designer** owns physical planting choices. Open it from the workspace navigation or the demonstrator summary. There is one plant editor; the project form links to it rather than repeating area, species, prices, methods and water controls.

The Site Designer **Plants** panel has the single checklist/cart, grouped by vegetation system, with English, Spanish and scientific names, quantities, editable prices and custom plants. Approaches activates source-qualified combinations; shared species are not duplicated, starter counts are explicitly illustrative, and manual exclusions persist. Python derives tree/shrub totals and plant costs. The catalogue now has **23 species**; original catalogue-v1 records remain unchanged for historical replay.

Each selected plant has an editable **€/plant** field and a **Price confirmed** checkbox. Confirmation means the user checked that amount, for example with a supplier; it is not a certified quote or funding approval. Changing the amount clears confirmation. Unconfirmed prices can still be used for exploratory planning and are labelled **Estimate**. Quantity, unit price, line total and confirmation appear in the preview and saved record.

**Save selected prices as defaults** writes catalogue amounts to `restoration_simulator/scenarios/plant-prices.json` immediately, separately from committing the plan. It preserves other catalogue prices, existing project prices and all confirmation statuses. Later selections/new plans use the new amounts and start unconfirmed. Custom plant prices remain project-specific. **Reload default prices** refreshes the preset amounts and resolves concurrent-edit conflicts without overwriting the checklist. Missing or invalid prices, conflicts and failed atomic writes produce explicit errors. `RESTORATION_PLANT_PRICES_PATH` can select a separate required JSON file for an isolated playtest.

New checklist submissions use selection version 2 with explicit unit prices and confirmation flags. Older aggregate/v1 checklists replay with their recorded shared tree/shrub rates. Their editing adapter displays a notice, copies those recorded amounts into per-plant fields and marks confirmation as unrecorded/false; the original history is preserved. Catalogue v1 remains immutable.

Catalogue v2 completes the poster’s semi-arid system with **Rosemary / Romero (*Salvia rosmarinus*)**, **Mediterranean buckthorn / Espino negro (*Rhamnus lycioides*)**, and **Joint pine / Hierba de las coyunturas (*Ephedra fragilis*)**. Its preset selects six plants; each can be selected or removed independently. The original 13 plant records and existing selections remain unchanged. The three new plants each start with an explicit **€2.50 estimate**, editable in `plant-prices.json` or the checklist, and start unconfirmed. New drawings retain their 1254 × 1254 transparent originals and support the click-to-view viewer. Restart Python and refresh the frontend after updating the catalogue. If using `RESTORATION_PLANT_PRICES_PATH`, add explicit amounts for `rosemary`, `rhamnus_lycioides` and `ephedra_fragilis` to that file; incomplete price files produce an error.

Each of the 23 plants now has a **whole-plant portrait and its retained botanical detail**, both at **1254 × 1254 pixels** with transparency. Checklist thumbnails show the whole plant. Clicking one compares **Representative mature form** and **Botanical detail** side by side on desktop, stacked on phones. Each panel has independent **Original size / Fit view** controls; the original view scrolls within its panel. Whole-plant notes describe the form and its variation with age, site and management; images are not to a shared biological scale. Escape, Close and backdrop dismissal return to the checklist without changing selections. See [whole-plant files and prompts](restoration_simulator/frontend/public/plants/whole/README.md) and the [botanical detail review](restoration_simulator/frontend/public/plants/botanical-review-2026-10-28.md). Refresh the browser after updating the files. The seven designer additions have [source references, exact prompts and checksums](restoration_simulator/frontend/public/plants/designer-species-README.md).

**Algarrobo Planting Explorer:** **Planting information** beside Carob / Algarrobo opens a read-only guide, available with the plant checked or unchecked. Its four views cover **Planting**, **Buying plants**, **Establishment care**, and **Examples and evidence**. Select numbered features or their labels in the original SVG section to understand root-ball dimensions, collar level, stable support and deeper soil preparation. Book recommendations, finca observations, project suggestions and unresolved questions carry distinct text labels, with handbook page links and expandable evidence limitations. Example cards label **Annual rainfall** explicitly and display the original finca photographs beside the source links; selecting an image opens its original pixels. Photo attribution and noncommercial share-alike terms are documented in the [example photograph guide](restoration_simulator/frontend/public/planting-explorer/carob/README.md).

The guide is based on [LEARN-008](doc_library/LEARN-008%20-%20Carob%20Restoration%20-%20Nursery%20Buying%20Guide%20and%20Mixed%20Planting%20Models.md) and [LEARN-007](doc_library/LEARN-007%20-%20Carob%20Establishment%20-%20Soil%20Preparation%20and%20Growth%20with%20Limited%20Water.md). Curated reference text and initial navigation are maintained in [carob-planting-guide.json](restoration_simulator/frontend/src/carob-planting-guide.json), validated separately from project data. This content does not define simulation rules or planting defaults. Reading the guide preserves quantities, prices, confirmations and the existing preview without requesting another calculation. Invalid guide data and failed botanical images produce explicit messages. Only algarrobo currently has a planting guide; no API or save-format change or extra dependency is required.

**Restoration Model Explorer:** read and compare MR1, MR2, MR3 and related production/dehesa examples from the designer Approaches panel, or from the carob guide. The reference content appears in the designer inspector while the plan remains visible. Reading guidance does not select plants, save a model or trigger calculations. The designer separately supports explicit MR1/MR2 example generation and vegetation combinations.

The model reference is maintained in [restoration-models.json](restoration_simulator/frontend/src/restoration-models.json), validated against its model/topic IDs, evidence categories, source pages, finca references and image metadata. It reuses the carob guide's credited photographs and adds the original Rozas Altas photograph ([asset provenance](restoration_simulator/frontend/public/restoration-models/README.md)). Both explorers share one accessible dialog. Close, Back or Escape from the contextual model view restores the carob guide's tab, diagram selection, disclosures, scroll and focus. Exploring does not save a strategy, apply presets, change a budget, calculate suitability or assess funding; no backend API or project-save change is introduced.

The last valid Python preview stays visible while a draft is recalculated. A fixed-height status marks updating or invalid drafts, and Commit is disabled until the current draft has a successful preview. Errors remain explicit with a Retry preview button; older responses cannot replace a newer draft or another project/decision.

The default 200 m² example has 10 trees and 30 shrubs/grasses. Its editable assumed budget is **€645 planting + €100 monitoring + €100 evaluation/dissemination = €845**, excluding any land rent/maintenance. Planting takes 0.25 years, followed by observations after 1 year; these are configurable playtest assumptions, not local quotes or ecological predictions. Planning and recording a baseline take no simulation time and install no work. Planting pays the installation subtotal and records its work area; monitoring and evaluation pay their respective budgets separately. No observation or ecological success appears automatically when time advances.

The five stages are **Plan → Baseline → Plant → Observe → Evaluate**. A suitable baseline, starting photo points, water choices and planting/monitoring permissions are required before installation. Available area and access must cover planting and the planned follow-up. At the due date, explicitly advance time and enter surviving plant counts and optional vegetation-cover observations. Counts cannot exceed those planted. Each baseline, observation and interpretation is labelled **user-reported/unverified** or **explicitly illustrative**. Evaluation may be inconclusive, encouraging, mixed or poor; it never certifies ecological recovery. Evaluation unlocks separate expansion and optional organisation actions.

For **potential AL20 3.4** funding, the preliminary check covers applicant type, AL20 municipality, nonproductive purpose, local novelty, demonstration design, open participation and online dissemination for at least 3 years after final payment. Missing/custom conditions remain questions; explicit mismatches are shown. This is **not an eligibility ruling**. Positive funding feedback must be user-reported with a reference or a clearly labelled playtest assumption; custom unresolved conditions need referenced feedback. The app sends no applications, emails or reports. The funding catalogue is a 2026 reference snapshot; relative project years do not predict availability of future calls.

Record **funding feedback → application → decision → reimbursement** explicitly. An application requires confirmation of applicable start-date conditions before physical works. A decision can remain pending or be declined; awards are never automatic. Requested amounts cannot exceed the planned budget or the category's **€28,000 ceiling**; no individual expense is automatically eligible. For this playtest, grant-funded planting waits for an award, and reimbursement follows paid planting, observation, evaluation and reported dissemination. Those two sequencing gates are conservative simulator assumptions, not claims about every real AL20 payment schedule. An award adds no cash; a recorded reimbursement is capped by the award and paid pilot expenditure and can be recorded only once. Own/partner financing instead uses cash already available in the project.

## Saving, import and undo

Python atomically saves `restoration_simulator/data/active-project.json` after each successful mutation. It includes the exact scenario snapshot, history, one-level undo snapshot, monotonic revision and request receipts. Saves live on the **computer running Python**, not in browser storage or the cloud. Runtime data, environments, dependencies and build output are Git-ignored.

JSON export contains the project and undo snapshot in a versioned envelope. Import validates schema, field types, ranges, supported scenario ID/version and the complete deterministic history before replacing anything. Invalid/unsupported imports preserve the current project. New saves/exports and the default scenario use **version 4 with explicit `area_unit: "m2"`**. Version-1, version-2 and version-3 saves/exports are validated with the frozen legacy engines and explicitly upgraded. Historic cash, time, history and undo remain. Version-1 access keeps its legacy assumptions with no retroactive rent and temporary access through year 30; version-2 agreements retain their recorded periods, payments and obligations. The original snapshot remains embedded for replay. Live parcel, covered and restoration areas are converted from hectares to square metres without rounding away original precision (2 ha becomes 20,000 m²). Original history retains its exact hectare-based inputs and wording, identified in the UI; old action dates, cash and maintenance commitments are not rewritten. Before migrating a local autosave, Python creates a byte-for-byte `active-project.schema-v1-<checksum>.json`, `active-project.schema-v2-<checksum>.json` or `active-project.schema-v3-<checksum>.json` backup and atomically replaces the active file; failed migration preserves the original. Projects without a previous demonstrator receive the guided workflow. Projects with an earlier demonstrator or grant stage retain their original action table, historic costs/grants and undo; they are clearly labelled as an earlier workflow, and **New project** starts a guided pilot. No old grant is relabelled as AL20 3.4. Importing an old export upgrades the active save without rewriting the source export. Scenario imports are data, not executable scripts.

Undo restores the last action's cash, time and state and survives restart/export/import. It is one level, with no redo. Revisions continue increasing after undo. New-project replacement clears undo; import restores the imported undo.

Each mutation includes an expected revision and UUID request identifier. Receipts survive restart. Retrying the exact request does not repeat effects; stale revisions and identifiers reused for different requests are rejected. After an uncertain network failure, use **Retry the same request** or **Reload saved project**. Save/API failures are shown in the UI; a failed save does not publish candidate state. A corrupt autosave is reported without overwriting it: preserve or move that file and restart, then import a valid export.

The MVP supports at most 500 decisions per project and imports up to 2 MB. It has no multiprocess file locking; use one backend. To choose another save path, set this before starting Python:

```powershell
$env:RESTORATION_SAVE_PATH = 'C:\Users\JanEngelke\restoration-saves\active-project.json'
```

## Change the simulation in Python

**Edit `restoration_simulator/scenarios/defaults.json` for normal defaults.** It contains land form prefills, pilot area, historical shared tree/shrub rates, labour and monitoring budgets, timing, evidence-form initial values, custom-plant initial values, renewal terms, initial project name/theme and the default save path. `scenarios/default.json` still defines the action table, land-route costs/terms, funding catalogue and rules. Current plant examples and preset quantities live in `scenarios/planting-catalog-v2.json`; `scenarios/planting-catalog-v1.json` remains frozen for unpriced history replay. Current per-plant price prefills live in `scenarios/plant-prices.json` and can be saved from the checklist. These mutable catalogue prices are separate from form snapshots: each saved version-2 plan records its own amounts and confirmation flags.

New projects use form schema 2 and embed a validated `input_defaults` snapshot in their scenario. Later edits to the JSON affect new projects, not the assumptions already saved in an existing project. Missing/invalid keys, unsupported versions, duplicate JSON keys and invalid quantities raise errors; Python does not substitute constants. Older v4 projects without form snapshots use the explicit, immutable `legacy-form-defaults-v1.json` adapter, identified in the UI. Do not edit either a legacy form definition or an existing plant-catalogue version in place; introduce a new supported version for incompatible changes. **Restart Python and reload the browser after changing code/configuration.** An incompatible running API is reported rather than silently accepted.

| File inside `restoration_simulator/` | Responsibility |
| --- | --- |
| `backend/engine.py` | Standard-library-only rules, validation, prerequisites and deterministic transitions |
| `backend/demonstrator.py` | Planting plans, stages, budget and preliminary AL20 3.4 checks |
| `backend/configuration.py` | Strict JSON loading, form-schema validation and explicit legacy adapter |
| `backend/planting.py` | Versioned plant catalogue, checklist quantities/prices/confirmation and derived counts |
| `backend/plant_prices.py` | Validated editable default prices, conflict detection and atomic persistence |
| `backend/parcel_removal.py` | Exploration deletion, dependency replay and reference remapping |
| `backend/parcel_removal_legacy.py` | Frozen validation of earlier soft-removal history |
| `backend/storage.py` | Atomic persistence, import, saved undo and retry receipts |
| `backend/app.py` | FastAPI routes and validated requests |
| `scenarios/default.json` | New-project action table and embedded demonstrator catalogue |
| `scenarios/defaults.json` | Authoritative form, client and runtime defaults for new projects |
| `scenarios/plant-prices.json` | Current catalogue unit-price prefills and custom growth-form price prefills |
| `scenarios/planting-catalog-v2.json` | Current 16-plant catalogue, four system presets and suggested quantities |
| `scenarios/planting-catalog-v1.json` | Frozen original 13-plant catalogue for unpriced history replay |
| `scenarios/legacy-form-defaults-v1.json` | Immutable compatibility form definition for earlier v4 saves |
| `frontend/src/` | React presentation and UI state; no duplicated simulation rules |
| `tests/test_simulator.py` | Focused engine/API acceptance checks |
| `tests/test_land_access.py` | Seven-route lifecycle, payment, permission and migration checks |
| `tests/test_square_metres.py` | Earlier small-plot journeys, category persistence and conversion |
| `tests/test_demonstrator.py` | Guided pilot, cash/evidence separation, AL20 gates and version-3 migration |
| `tests/test_planting.py` | Species quantities, custom plants, derived budgets, legacy replay and persistence |
| `tests/test_parcel_removal.py` | Deletion replay, clean exports, legacy cleanup, atomic persistence and saved undo |
| `tests/test_configuration.py` | Missing/invalid config, snapshot stability, zero values and atomic import rejection |
| `tests/test_plant_prices.py` | Per-plant prices, confirmations, legacy replay, default updates, conflicts and failed writes |
| `frontend/tests/contracts.test.mjs` | Missing API data, numeric formatting, form contracts and broken references |

Edit the scenario JSON for new projects. `backend/legacy.py`, `backend/engine_v2.py`, `backend/engine_v3.py` and `scenarios/legacy-v1.json` through `legacy-v3.json` are retained for exact replay of older saves. Existing saves retain their exact embedded definitions. Keep supported effect shapes and handler kinds; add new behavior through the explicit Python handlers. Incompatible handler/schema changes need version handling instead of silently reinterpreting saves. There is no scripting language, workflow editor or plugin framework.

The engine works directly in Python without installing FastAPI or running the website. From the `restoration_simulator` directory, start Python and use:

```python
from backend.engine import new_project, land_form, list_actions, transition

state = new_project('Python planting pilot')
form = land_form(state, 'existing')
inputs = {f['name']: f['default'] for f in form['fields']}
inputs.update(route_id='existing', parcel_id='new', parcel_area=400, covered_area=400)
state, _ = transition(state, 'establish_access', inputs)
action = next(a for a in list_actions(state) if a['id'] == 'demonstrator')
inputs = {f['name']: f['default'] for f in action['fields']}
inputs.update(funding_route='self', vegetation_system='woodland', water_plan='temporary')
state, result = transition(state, 'demonstrator', inputs)
print(state['demonstrator']['budget']['total'])  # 845.0; planned, not yet spent
```

`transition` returns a new state and explanation with no mutation or I/O. `list_actions(state)` supplies input fields, choices and unavailability reasons. The API provides `GET /api/project`, `GET /api/actions`, `POST /api/project/new`, `POST /api/preview`, `POST /api/commit`, `POST /api/undo`, `GET /api/export` and `POST /api/import`, read-only `POST /api/land/form` and whitelisted `GET /api/sources/{id}`. Request schemas are at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) while Python runs.

## Checks and playtest stop point

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
conda activate restoration-simulator
python -m unittest discover -s tests -v
Set-Location .\frontend
npm.cmd test
npm.cmd run build
npm.cmd audit
```

The focused tests now cover all seven land routes, proposal/finalisation, scheduled costs, expiry and renewal, overlap prevention, ownership separation, commitments beyond year 30, migration/backups, and also exercise both starting routes with and without organizations, grant stages/payment once, invalid-action immutability, frozen scenarios, horizon limits, decision grouping and prerequisite/resource changes, previews, restart with undo, duplicate/stale requests, export/import (including browser JSON number normalization), malformed imports, corrupt autosaves and atomic-write failure. Production bundling checks the React frontend; playtesting uses the two local development servers above. No deployment infrastructure is included.

Verified on Windows on 27 October 2026 with Conda Python 3.12 and Node 22.23.4: all **62 tests passed** and the production frontend built. The version-4 browser playthrough planned a 200 m² dryland demonstrator with a custom objective, completed baseline recording, simulated AL20 3.4 feedback/application/award, planted, waited for follow-up, entered illustrative survival observations, evaluated the pilot and recorded reimbursement. The checklist browser check combined two mixes, preserved an edited quantity when re-adding a mix, deselected a plant with the keyboard, added a custom plant and restored the exact selections after saving, refreshing and reopening the editor. Desktop and 390-pixel phone layouts passed. Export/import, an actual test-backend restart and persisted undo passed in the earlier demonstrator playtest; automated tests also cover these with the species checklist. Tests additionally cover funding caps, uncertain eligibility, evidence and access gates, cash constraints, observation bounds, legacy migrations and preservation of earlier workflows. Browser checks used isolated saves under ignored `test-artifacts/`; no runtime dependencies were added.

Manual acceptance: complete the journey at desktop and phone-sized widths, use Tab/Enter to reach controls, inspect the final summary and past results, refresh, then restart Python to verify restoration of state and undo. Stop for a playtest before adding GIS, document ingestion, real grants, forecasting or further infrastructure.

Exploration deletion verified on 28 October 2026: **76 tests passed** and the production frontend built. An isolated two-parcel browser playtest deleted a purchased parcel and its installed planting, removed its four timeline/history entries, and restored cash from €41,355 to €60,000 and project time from year 0.75 to 0 while preserving the other finca. The exported JSON contained neither the deleted name nor a hidden undo copy. Undo restored the original project after refresh. Cancel and the 390-pixel phone layout also passed. Automated tests cover nested legacy snapshots, surviving references, funding and transitive dependencies, clean-up of earlier soft deletions, saved undo, invalid/stale requests and atomic-write failures.

The 28 October fallback audit passed **84 Python tests, 11 frontend tests and the production build**. Browser checks covered the explicit legacy adapter, JSON defaults, preservation of an entered zero price, baseline/planting, reload/undo, a visible controlled server failure followed by explicit retry, and the 390-pixel layout. See [the audit report](restoration_simulator/FALLBACK_AUDIT.md) for retained optional and historical cases.

The 28 October demonstrator-planning update passed **84 Python tests, 17 frontend tests and the production build**. An isolated browser playtest verified combined system presets, preservation of edited quantities, keyboard unchecking, continuously visible previews while updating, invalid-quantity errors and explicit retry, and saved selections after reload. All 13 botanical images loaded, with Spanish and Latin labels in the checklist and summary. Dark/light desktop and 390-pixel phone layouts passed with no horizontal page overflow. The user’s active save was not changed. No dependencies were added.

The 28 October per-plant pricing update passed **91 Python tests, 19 frontend tests and the production build**. Checks cover individual and zero prices, whole-cent validation, confirmation flags, v1 history replay, atomic default updates, concurrent edits and failed writes. The isolated browser playtest edited and confirmed prices, verified confirmation reset on a price change, saved catalogue defaults, checked new selections start unconfirmed, rejected empty prices without substituting a default, and restored prices/confirmation after an actual Python-server restart. Dark desktop and 390-pixel phone layouts passed. Playtesting used separate project and price files; the active user save and actual configured defaults were not changed.

The 28 October poster-completion update passed **93 Python tests, 20 frontend tests and the production build**. An isolated browser check verified all 16 entries, the six-plant semi-arid preset, preservation of edited prices/quantities and confirmation, saving a new plant's default price to an isolated file, and all three new transparent depictions at their original 1254 × 1254 size. Desktop and dark 390-pixel phone layouts passed without page overflow or browser errors. The original v1 catalogue, active project and configured prices were preserved during browser testing. No dependencies were added.

The whole-plant viewer update passed **20 frontend tests and the production build**. An isolated browser check loaded all 16 whole/detail pairs, checked desktop side-by-side and phone stacked layouts, independent original-size/fit controls, keyboard opening and focus return, Escape/Close/backdrop dismissal, and separate image-load failures with no substitution. All 32 transparent assets have 1254 × 1254 pixels. The retained detail files and active project were preserved. No dependencies were added.

If Conda reports a corrupt shared package cache, use a separate project cache (ignored by Git) and retry:

```powershell
Set-Location 'C:\Users\JanEngelke\git_private\algarrobos\restoration_simulator'
$env:CONDA_PKGS_DIRS = Join-Path (Get-Location) '.conda\pkgs'
conda env create --file environment.yml
# If already created: conda env update --file environment.yml
```


## Site Designer

Open **Site Designer** after creating a project. The drawing shows an assumed
planting zone, not the whole parcel. A square of 200 m² is the initial geometry;
area, proportions and reference-boundary side/type are editable. Link a parcel
before applying. Existing plans can be imported explicitly: recorded species,
quantities and prices are preserved, but coordinates are new assumptions.

Use **Approaches** to combine MR1/MR2 and starter vegetation combinations.
Optional companions stay visible. Use **Plants** for quantities, prices and
custom selections. **Establishment** controls the assumed moisture pocket,
conditional encina example, water/method declaration and material-specific mulch.
Stone is the first mulch type; other types can be added with separate rules.
Select symbols to inspect provenance and edit coordinates/footprints. Drag to move,
drag blank ground to pan, and use Zoom/Fit. Coordinates provide a keyboard
alternative. Existing vegetation is drawn separately and excluded from new-plant
costs. Planning circles are not measured crowns or roots. Overflow quantities are
explicitly unplaced and remain in totals; no plants are silently dropped.

**Save draft** persists without changing simulation time, cash, history or undo.
**Apply to demonstrator** reviews the saved draft with retained administration and
budget settings before committing through the existing planning action. Submitted
or installed plans keep their existing locks. Export/import includes designer
attachments. Autosave/export envelope 5 retains simulation schema 4; upgrading
older autosaves creates a checksum-named backup before writing. Parcel deletion
previews and removes linked designs; explicit undo can restore them.

The [rules library](restoration_simulator/design_rules/README.md) is the entry point
for rule maintenance. Run `python -m backend.designer` from restoration_simulator to
validate its schema, references and source checksums. Saved designs retain embedded
rules until **Review with updated rules** is accepted. **Saved design report**
downloads the inputs, output, evidence, overrides and applied snapshots as JSON.
No document-derived statement is treated as an ecological forecast or grant award.

After installing an update, restart the Python backend and reload the browser.
No new Conda or npm dependencies are required. If using an external
RESTORATION_PLANT_PRICES_PATH, explicitly add rates for kermes_oak, holm_oak,
phillyrea_angustifolia, phillyrea_latifolia, myrtle, terebinth and cork_oak; an
incomplete custom price file is rejected rather than filled silently.


### Site Designer density and direct editing

New designs use per-species plants/ha controls and derived purchasing counts.
Carob and each shrub species start at an illustrative 350/ha (seven plants per
species on 200 m²); other trees and grasses start at 50/ha. These are editable
project scenarios, not handbook prescriptions.
Arrows add/remove one actual plant. Typed densities round to whole plants, with
requested and effective values displayed. Changing area preserves current plants
until **Update plants to previous densities** is chosen.

Drag a moisture-pocket outline to move it and its automatic example encina.
Drag rectangle edge handles to change proportions at fixed area. The assumed
north marker is a drawing convention. Numeric fields provide keyboard alternatives.
Ordinary design edits apply immediately and have session Undo/Redo. Persistent
exclusions are separate from unchecking a plant. Save and Apply remain distinct.

Root-ball and crown/plant overlays are separate. Every catalogue plant has one
editable drawing diameter: a rounded reference midpoint or an explicit
plant-specific estimate, with original ranges retained in evidence details.
The root-ball drawing default is 12 cm. Custom tree/shrub/grass diameters are
6/2/0.6 m. No dimensions are inferred from pot litres or plant height. All 23 taxa were
reviewed in [LEARN-009](doc_library/LEARN-009%20-%20Site%20Designer%20-%20Root%20Ball%20and%20Mature%20Crown%20Dimension%20Evidence%20-%202026-10-29.md),
including links to downloadable references for possible library addition. An older
designer draft opens unchanged and offers **Review designer upgrade**; adopting it
preserves recorded counts, prices, positions and legacy exclusions.

New woodland-companion shrubs are distributed among all plotted planned trees,
inside their indicative crowns with 1 m automatic centre clearance. Other shrubs
and grasses prefer open ground; custom plants start Independent. Change a species'
placement preference in its checklist details or inspector. These are illustrative
geometry preferences, not ecological suitability findings. Only new instances are
placed automatically; unsuccessful plants remain unplaced, counted and costed.
There is no rearrange command. Existing vegetation is an obstacle, not a parent.

Select a tree or shrub to see its associations. Moving a tree carries linked
shrubs; manually moving a shrub detaches it. Manual clearance conflicts generate
warnings. A child moved outside the zone retains its recoverable offset; removing
its parent detaches it without deleting it. Crown edits never redistribute plants.
Session Undo/Redo, save/export/import and decision reports preserve these data.
Older saved layouts stay unchanged until their explicit rules upgrade is accepted;
historical positions acquire no invented parent relationships.

Restart the Python backend after updating its source, then refresh the frontend.
There are no new Conda or npm dependencies for these improvements.
