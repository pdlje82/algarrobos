# First version: a playable 30-year restoration timeline

Version 0.4 · 26 October 2026 · React frontend with a Python/FastAPI backend; supersedes the no-JavaScript/Flask proposal and retains the 30-year scope.

## 1. What the first version must demonstrate

Let a user play through the complete development of a restoration initiative over approximately 30 simulated years. The user starts with a demonstrator, explores funding and expansion, optionally creates organizations, acquires access to more land and finishes with a summary of the accumulated assets and activities.

Keep almost every action and result as a simple preconfigured placeholder. The first playtest evaluates whether the full journey, choices, time progression and feedback are useful. It does not validate ecological predictions, investment returns or legal/funding feasibility.

## 2. The outline visible from the beginning

The timeline should show the whole year-0-to-year-30 horizon, with understandable milestone labels. The sequence below is a scenario outline; organizations are optional and exact dates/outcomes are fictional.

1. Start a project and establish access to land: use an existing personal parcel or acquire a demonstrator parcel.
2. Create the demonstrator and receive a simple configured result.
3. Apply for a grant; progress to a configured award outcome, then a separate configured payment.
4. Use available resources to expand restoration activity.
5. Optionally create a company or continue without it.
6. Acquire access to additional parcels and undertake further restoration.
7. Optionally establish a foundation or continue with the existing arrangement.
8. Advance to year 30 and inspect the final project/asset summary.

The first fixture must allow a complete end-to-end run. It should also allow both initial land routes and optional organizational steps. No automatic transfer of personally owned land to a company or foundation is implied. Show the stated ownership/access distinction in the summary.

## 3. Minimal interaction

**Select an available action → inspect/configure a few fields → commit the action → advance its configured duration → show its preconfigured result → choose again.**

Inspecting an action changes nothing. Committing it applies its configured state changes, moves the clock and records one history entry. Time can move by different amounts for different actions. Do not implement a fixed monthly loop, hundreds of empty turns or real-time animation. Store time as a simple offset from project start; use years with enough precision for a short placeholder delay if necessary.

Provide a simple Advance time action to reach a later point or year 30 when no further chosen activity is needed. Keep final time within the horizon. Surface an unavailable action's reason. Invalid choices must leave state unchanged.

## 4. Placeholder objects and project state

Keep a small editable scenario-definition file containing action IDs, titles, descriptions, minimal prerequisites, duration, cost, configured outcome, state effects and whether an action is optional/repeatable. A simple action table and a few explicit condition handlers are sufficient. Do not build a generic scripting language, workflow editor or plugin system.

Use a tiny, coherent fictional fixture. Pick only enough illustrative amounts/durations to make the journey playable, and document them together. Label them clearly as placeholders. An owned starting parcel may have zero acquisition expenditure while still being an existing asset; this is not a claim that the parcel has zero market value.

The saved project needs only:

- Project ID/name, save-schema version and scenario ID/version.
- Current simulated time and available cash.
- Parcels with simple IDs and an ownership/access label.
- A demonstrator/restoration status or small list of completed restoration activities.
- Organization flags/list, allowing a company and foundation to coexist if selected.
- Action history, including grant application, award and payment states.

Grant application does not immediately increase cash. A grant payment can be received only once per configured award. Distinguish cash from land/assets; the final asset base need not have a monetary valuation. No compound growth formula or annual financial/ecological calculation is required.

Make state transitions deterministic. Keep the current scenario definition or its exact values with the save so that a later edit does not silently change an existing project.

## 5. One browser screen

Show a readable full-horizon timeline with the current position, past actions and future outline. On small screens, let users inspect the outline without shrinking labels into unreadability.

Alongside it, show the available actions, a small action configuration/preview, the current cash/land/organization/restoration state, and an explanation of the most recent result. Let the user inspect past history without changing the current state.

At year 30, summarize what was accumulated, how it was acquired or accessed, which organizations exist and which actions produced the result. Distinguish proposed/pending activity from completed activity. No universal success score, leaderboard or detailed 3D landscape is needed.

## 6. Save and review

Support new project, local autosave/restore, and JSON export/import through React controls connected to the Python API. One active project is enough for the first build; separate exports can preserve other runs. Python saves the active project to a local JSON file after each successful mutation, using atomic replacement. Restore it after restarting the application. Saves live on the computer running Python, not in browser storage and not in the cloud. Preserve the current project if an import is invalid or unsupported; validate schema, types, ranges and scenario compatibility before replacing it. Persist the undo snapshot too. Confirm replacement before starting a new project over an existing run.

Include a simple Undo last action or equivalent saved pre-action state. Named scenario branching and comparative dashboards are later extensions.

## 7. Implementation boundary

Use **Python for the simulation engine, FastAPI for the backend API, and React with semantic HTML/CSS for the browser interface**. JavaScript is expected in the frontend. The user wants to understand and modify the simulation in Python, not to eliminate the browser frontend. Do not use Flask/Jinja server-rendered pages or require operation with JavaScript disabled.

| Part | Technology | Responsibility |
| --- | --- | --- |
| Simulation engine | Python | Project state, actions, advancing time, costs, dependencies and outcomes |
| Backend API | Python with FastAPI | Connect the browser to the engine and save/load projects |
| Browser interface | React | Display the timeline, configure actions and explain results |

All simulation rules, prerequisite validation, time/cash calculations and outcome explanations must live in Python or editable scenario JSON. React displays server results and handles UI state such as selected action, input fields and expanded history. Do not duplicate simulation rules in JavaScript. The backend is authoritative for the saved project state.

Keep the implementation small:

- `backend/engine.py`: pure Python state validation, prerequisites and deterministic transitions, independent of FastAPI and React. Return a new state plus an explanation; invalid actions leave the original unchanged. The engine must also be usable directly from Python without running the website.
- `backend/storage.py`: JSON load/save/export/import and undo persistence. No database.
- `backend/app.py`: FastAPI routes and request/response validation. Provide only the operations needed by the UI: load current project, create new project, list available actions with unavailability reasons, preview, commit, undo, export and import.
- `scenarios/default.json`: fictional editable action definitions and parameters.
- `frontend/`: a small React application, CSS and frontend build configuration. Use Vite with JavaScript/JSX unless existing repository conventions require otherwise. Avoid unnecessary state-management packages.

Selecting or configuring an action changes no project state. Preview calls the Python engine through the API without saving or advancing time. Commit calls the same engine with the chosen inputs, validates the current project revision, saves a successful transition and returns the updated state and explanation. React then updates all visible views from that response. Prevent duplicate effects from retries/double clicks using a request identifier and revision check; reject stale requests without changing state. Disable commit while a request is pending and show understandable API/save errors. Do not show an action as completed until the backend confirms persistence.

Build the first timeline as a React component using HTML/CSS or simple SVG. React, shared UI state and Python persistence are required foundations. Vega-Lite, TanStack Table and React Flow remain candidates for later linked charts, sortable comparisons and branching diagrams; they are not required dependencies until their corresponding features are implemented. Do not introduce them merely to satisfy the earlier technology shortlist.

Document Python and Node dependencies and include a frontend lockfile. Provide exact Windows PowerShell commands to create a Python virtual environment, install dependencies, start FastAPI and start the React development server, with working directories and the browser URL. Use a development proxy for API requests so the frontend calls relative `/api` URLs; avoid broad CORS configuration. Bind local services to loopback. Two local development processes are acceptable; no Docker, public deployment, cloud services or production infrastructure is required. Exclude node_modules, build output, virtual environments and runtime saves from Git.

The trade-off is intentional: Codex maintains the JavaScript presentation code, while the user can change simulation behavior in Python and scenario configuration. A few focused engine/API checks and a frontend build plus manual UI inspection are sufficient for the MVP.

### Existing repository and document sources

User-provided Windows repository: `C:\Users\JanEngelke\git_private\algarrobos`.

**All project documents already exist, with renamed filenames, in `C:\Users\JanEngelke\git_private\algarrobos\doc_library`.** Treat this as the existing source collection. Do not ask the user to copy the documents again, create duplicate copies or assume the original ChatGPT filenames are present. When a later feature needs a source, inspect the actual local filenames and document contents to identify it; preserve source files and record the real relative path (and page when relevant). Do not assume a fixed document count.

The current editing session has not inspected that Windows directory. Codex running locally should first read applicable AGENTS.md instructions and inspect the existing repository structure/status. Reuse existing conventions and preserve unrelated work. Place the simulator in a dedicated `restoration_simulator/` folder unless an existing application layout calls for another location. Keep `doc_library/` separate from application files, use repository-relative paths, and exclude virtual environments and personal runtime saves from Git. Do not create a new repository or overwrite existing files indiscriminately.

No paid API, runtime language-model call, account system, server database, deployment, document ingestion, GIS, live weather, real grants, detailed legal structures, species model or agent system is required. The source documents support later extensions; building a document catalog or reading every PDF is not a prerequisite for this placeholder prototype. Earlier browsing sketches are optional inspiration, not technology requirements.

## 8. Acceptance checks and stop point

1. Complete a run from the demonstrator stage to year 30 in one short sitting without monthly busywork.
2. Exercise both starting routes: own parcel and acquired parcel.
3. Demonstrate grant application, award and payment separately; prevent payment twice.
4. Demonstrate expansion and additional land; preserve the ownership/access labels.
5. Continue with and without the optional company/foundation steps; neither is a compulsory success requirement.
6. Confirm time, cash and history match the configured effects; invalid actions change nothing.
7. Save/refresh, export/import and undo preserve the expected state; malformed import preserves the existing run.
8. Inspect a phone-sized and a desktop layout, keyboard access and the final summary.
9. Complete the flow through React and FastAPI; confirm previews do not mutate state and the UI displays backend results consistently. Run the frontend production build. Confirm simulation rules can also run directly in Python without the web stack.
10. Restart Python and restore the saved state and undo snapshot. Refresh after committing, retry the same request and submit a stale revision; none may duplicate effects. Confirm API/save failures are visible and preserve the last successfully saved state.

Use a few focused checks for state transitions and manual usability inspection. Avoid extensive testing infrastructure. Deliver local run instructions, identify placeholder assumptions and stop for a playtest. Do not implement extensions until the user responds to the core experience.

## 9. First Codex task

> Work in the existing algarrobos repository, read its applicable instructions, and implement this specification only using a Python simulation engine, FastAPI backend API and React frontend. Keep all simulation rules in Python or scenario JSON; use JavaScript only for browser presentation and interaction. Existing renamed source documents are already in doc_library; preserve them and do not duplicate them. Deliver the complete approximately 30-year outline using simple preconfigured action/result objects, with a usable timeline, state display, saving/loading and undo. Keep the initial data fictional and explicitly labelled. Run the acceptance checks, provide exact Windows setup/start instructions and explain how to open the prototype locally and stop for a playtest. If a requirement would require substantial infrastructure, describe the smallest workable simplification instead of adding a platform.
