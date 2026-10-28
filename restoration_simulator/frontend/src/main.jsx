import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTheme } from "./theme.js";
import { DemonstratorEditor, DemonstratorRecord } from "./Demonstrator.jsx";
import {
  AccessTimeline,
  Fields,
  LandEditor,
  LandRecords,
  Outcome,
} from "./LandAccess.jsx";
import { area, money, year } from "./format.js";
import "./styles.css";

async function api(path, body) {
  let response;
  try {
    response = await fetch(
      `/api/${path}`,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    );
  } catch {
    throw new Error(
      "Cannot reach the Python server. Check that FastAPI is running, then reload the saved project.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server returned an unreadable response. Check the Python server and reload the saved project.",
    );
  }
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((x) => x.msg).join("; ")
      : data.detail;
    throw new Error(detail || `Request failed (${response.status}).`);
  }
  return data;
}

function ActionChoices({ actions, busy, selected, onChoose }) {
  return (
    <div className="actions">
      {actions.map((a) => (
        <button
          key={a.id}
          disabled={busy}
          aria-pressed={selected === a.id}
          className={`action ${selected === a.id ? "selected" : ""} ${!a.available ? "unavailable" : ""}`}
          onClick={() => onChoose(a)}
        >
          <span className="action-title">
            {a.title}
            <span aria-hidden="true">{a.available ? "↗" : "ⓘ"}</span>
          </span>
          <span className="action-meta">
            {a.optional ? "Optional · " : ""}
            {a.repeatable ? "Repeatable · " : ""}
            {a.terms_label || money(a.cost)}
            {!a.terms_label &&
              (a.kind !== "advance"
                ? ` · ${year(a.duration)} years`
                : " · choose year")}
          </span>
          {a.reason && <span className="reason">{a.reason}</span>}
        </button>
      ))}
    </div>
  );
}

function Timeline({ project, historyIndex, setHistoryIndex }) {
  return (
    <section className="timeline panel" aria-labelledby="timeline-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">The long view</p>
          <h2 id="timeline-heading">Thirty years. One decision at a time.</h2>
        </div>
        <span className="year-pill">Year {year(project.time)} / 30</span>
      </div>
      <p className="muted">
        Illustrative milestones with schematic spacing. Organizations are
        optional; choose your own pace and route.
      </p>
      <div className="time-progress">
        <span>Year 0</span>
        <progress
          aria-label={`Current position: year ${year(project.time)} of 30`}
          value={project.time}
          max={project.scenario.horizon}
        />
        <span>Year 30</span>
      </div>
      <div
        className="outline-scroll"
        tabIndex="0"
        aria-label="Full 30-year outline; scroll horizontally on a small screen"
      >
        <div className="outline">
          <div className="timeline-track" />
          {project.scenario.outline.map((point) => (
            <div
              className={`milestone ${point.year <= project.time ? "reached" : ""}`}
              key={point.year}
            >
              <span className="dot" />
              <span className="eyebrow">Year {point.year}</span>
              <h3>{point.title}</h3>
              <p>{point.description}</p>
            </div>
          ))}
        </div>
      </div>
      {project.agreements && (
        <AccessTimeline
          agreements={project.agreements}
          obligations={project.obligations}
          parcels={project.parcels}
          parties={project.parties}
          currentYear={project.time}
        />
      )}
      <div
        className="timeline-events"
        aria-label="Recorded actions on the timeline"
      >
        {project.history.length === 0 ? (
          <span className="muted">Your first decision starts the story.</span>
        ) : (
          project.history.map((h, i) => (
            <button
              key={i}
              className={historyIndex === i ? "event selected" : "event"}
              onClick={() => setHistoryIndex(i)}
            >
              <span>Y{year(h.end)}</span> {h.title}
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function App() {
  const [theme, setTheme] = useTheme();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [inputs, setInputs] = useState({});
  const [configReady, setConfigReady] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [name, setName] = useState("My restoration journey");
  const [historyIndex, setHistoryIndex] = useState(null);
  const [replacement, setReplacement] = useState(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [retry, setRetry] = useState(null);
  const pending = useRef(false);
  const fileInput = useRef();
  const previewPanel = useRef();
  const newProjectButton = useRef();
  const undoButton = useRef();
  const newProjectName = useRef();
  const project = data?.project;
  const action = data?.actions.find((a) => a.id === selected);
  const isLand =
    action?.kind === "land_access" || action?.kind === "activate_access";
  const isDemo = action?.kind?.startsWith("demo_");
  const updateInputs = useCallback((next) => {
    setPreview(null);
    setInputs(next);
  }, []);
  const availableActions = data?.actions.filter((a) => a.available) || [];
  const futureActions =
    data?.actions.filter((a) => a.status === "future") || [];
  const unavailableActions =
    data?.actions.filter((a) => a.status === "unavailable") || [];
  const categoriesReady = data?.actions.every((a) => a.status);

  async function load() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      setData(await api("project"));
      setRetry(null);
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (newProjectOpen) newProjectName.current?.focus();
  }, [newProjectOpen]);

  useEffect(() => {
    setPreview(null);
    setPreviewError("");
    if (!action?.available || !project || !configReady) {
      setPreviewBusy(false);
      return;
    }
    let ignore = false;
    setPreviewBusy(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api("preview", {
          revision: data.revision,
          action_id: action.id,
          inputs,
        });
        if (!ignore) setPreview(result);
      } catch (e) {
        if (!ignore) setPreviewError(e.message);
      } finally {
        if (!ignore) setPreviewBusy(false);
      }
    }, 180);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [selected, inputs, data?.revision, configReady]);

  function choose(a) {
    setConfigReady(a.kind !== "land_access" && a.kind !== "activate_access");
    setSelected(a.id);
    setInputs(Object.fromEntries(a.fields.map((f) => [f.name, f.default])));
    setPreview(null);
    setPreviewError("");
    if (window.matchMedia("(max-width: 650px)").matches) {
      requestAnimationFrame(() =>
        previewPanel.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        }),
      );
    }
  }

  async function mutate(path, body, existingRequest) {
    if (pending.current) return;
    const request = existingRequest || {
      ...body,
      revision: data.revision,
      request_id: crypto.randomUUID(),
    };
    pending.current = true;
    setBusy(true);
    setError("");
    setRetry(null);
    try {
      setData(await api(path, request));
      setPreview(null);
      setSelected("");
      setHistoryIndex(null);
      setReplacement(null);
      setNewProjectOpen(false);
      if (path === "parcels/delete") {
        requestAnimationFrame(() => undoButton.current?.focus());
      }
    } catch (e) {
      setError(e.message);
      setRetry({ path, request });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function startNew(event) {
    event.preventDefault();
    if (project) {
      setReplacement({ kind: "new", name });
      setNewProjectOpen(false);
    } else mutate("project/new", { name, confirm_replace: false });
  }

  async function importFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("Choose a JSON export smaller than 2 MB.");
      const save = JSON.parse(await file.text());
      if (project)
        setReplacement({ kind: "import", save, filename: file.name });
      else await mutate("import", { save, confirm_replace: false });
    } catch (e) {
      setError(`Import failed: ${e.message}`);
    }
  }

  async function exportFile() {
    setError("");
    try {
      const save = await api("export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "restoration-project.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  }

  const history = historyIndex === null ? null : project?.history[historyIndex];
  return (
    <>
      <a className="skip" href="#main">
        Skip to project
      </a>
      <header className="masthead">
        <a className="brand" href="/" aria-label="Algarrobos home">
          <span className="brand-mark" aria-hidden="true">
            a
          </span>
          <span>
            algarrobos<span className="brand-sub">RESTORATION LAB</span>
          </span>
        </a>
        <div className="header-tools">
          <div className="header-note">
            <span className="status-dot" /> Local prototype{" "}
            <span className="version">MVP / 01</span>
          </div>
          <label className="theme-picker">
            Theme
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
      </header>
      <main id="main">
        <div className="hero">
          <div>
            <p className="eyebrow">From a small beginning</p>
            <h1>
              A place to start.
              <br />
              <em>A future to grow.</em>
            </h1>
            <p className="intro">
              Explore how a restoration initiative could unfold over thirty
              years. Make a decision, see its effects, and shape what comes
              next.
            </p>
          </div>
          <aside className="hero-note">
            <span className="sun" aria-hidden="true" />
            <p>Land. Resources. Continuity.</p>
            <span>A journey through the choices behind restoration.</span>
          </aside>
        </div>
        <p className="fictional">
          FICTIONAL SCENARIO{" "}
          <span>
            {project?.scenario.notice ||
              "Illustrative amounts, delays and outcomes for playtesting. No ecological, financial, legal or funding predictions."}
          </span>
        </p>
        <div className="toolbar">
          <span className="save-status">
            {busy
              ? "Connecting / saving…"
              : data
                ? "● Saved on this computer by Python"
                : "Connecting to Python…"}
          </span>
          <div className="toolbar-actions">
            <button disabled={busy} onClick={load}>
              Reload saved project
            </button>
            <button
              ref={newProjectButton}
              disabled={!data || busy}
              aria-expanded={project ? newProjectOpen : undefined}
              aria-controls={project ? "new-project-panel" : "project-name"}
              onClick={() => {
                if (project) {
                  setReplacement(null);
                  setNewProjectOpen((open) => !open);
                } else newProjectName.current?.focus();
              }}
            >
              New project
            </button>
            <button disabled={!project || busy} onClick={exportFile}>
              Export JSON
            </button>
            <button
              disabled={!data || busy}
              onClick={() => fileInput.current.click()}
            >
              Import JSON
            </button>
            <button
              disabled={!data?.can_undo || busy}
              ref={undoButton}
              onClick={() => mutate("undo", {})}
            >
              {data?.undo_kind === "delete"
                ? "Undo deletion"
                : "Undo last action"}
            </button>
            <input
              className="sr-only"
              type="file"
              accept=".json,application/json"
              aria-label="Import project JSON"
              ref={fileInput}
              onChange={importFile}
              disabled={busy}
            />
          </div>
        </div>
        {project && newProjectOpen && (
          <section
            className="new-project panel"
            id="new-project-panel"
            aria-labelledby="new-project-heading"
          >
            <h2 id="new-project-heading">Start a new project</h2>
            <p>
              Keep other runs as JSON exports. One project is active at a time.
            </p>
            <form onSubmit={startNew}>
              <label htmlFor="new-name">New project name</label>
              <input
                ref={newProjectName}
                id="new-name"
                value={name}
                maxLength="80"
                required
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="form-actions">
                <button className="primary" disabled={busy}>
                  Start new project
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setNewProjectOpen(false);
                    newProjectButton.current?.focus();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
        {error && (
          <div className="error" role="alert">
            <p>{error}</p>
            {retry && (
              <button
                disabled={busy}
                onClick={() => mutate(retry.path, {}, retry.request)}
              >
                Retry the same request
              </button>
            )}
            <span>
              {" "}
              You can reload the saved project to check what was persisted.
            </span>
          </div>
        )}
        {replacement && (
          <section
            className="replacement panel"
            role="region"
            aria-labelledby="replace-title"
          >
            <h2 id="replace-title">Replace the active project?</h2>
            <p>
              {replacement.kind === "new"
                ? `Start “${replacement.name}”`
                : `Import “${replacement.filename}”`}
              . Export your current run first if you want to keep it. This
              replaces its saved undo too.
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                replacement.kind === "new"
                  ? mutate("project/new", {
                      name: replacement.name,
                      confirm_replace: true,
                    })
                  : mutate("import", {
                      save: replacement.save,
                      confirm_replace: true,
                    })
              }
            >
              Confirm replacement
            </button>
            <button disabled={busy} onClick={() => setReplacement(null)}>
              Cancel
            </button>
          </section>
        )}
        {!project ? (
          <section className="panel welcome">
            <p className="eyebrow">Your first chapter</p>
            <h2>Start a restoration initiative</h2>
            <p>
              Compare seven ways to access a demonstrator site, or record land
              you already own.
            </p>
            <form onSubmit={startNew}>
              <label htmlFor="project-name">Project name</label>
              <input
                ref={newProjectName}
                id="project-name"
                maxLength="80"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="primary" disabled={!data || busy}>
                Create project →
              </button>
            </form>
          </section>
        ) : project.area_unit !== "m2" || project.schema_version !== 4 ? (
          <section className="panel">
            <h2>Restart the Python backend</h2>
            <p>
              Restart Python, then reload the saved project to load the guided
              demonstrator and upgrade its saved data safely.
            </p>
          </section>
        ) : (
          <>
            {data.summary.migration_notice && (
              <p className="fictional">{data.summary.migration_notice}</p>
            )}
            <div className="project-title">
              <h2>{project.name}</h2>
              <span>
                Scenario {project.scenario.version} · revision {data.revision}
              </span>
            </div>
            <Timeline
              project={project}
              historyIndex={historyIndex}
              setHistoryIndex={setHistoryIndex}
            />
            <div className="stats" aria-label="Current project state">
              <div>
                <span>Available cash</span>
                <strong>{money(project.cash)}</strong>
                <small>Cash only; land is not valued</small>
              </div>
              <div>
                <span>Currently accessible land</span>
                <strong>
                  {area(data.summary.active_area ?? data.summary.area)}
                </strong>
                <small>
                  {data.summary.parcel_records ?? project.parcels.length} parcel
                  records · {area(data.summary.owned_area)} owned by you / your
                  organisations
                </small>
              </div>
              <div>
                <span>Completed work area</span>
                <strong>{area(data.summary.restored_area)}</strong>
                <small>
                  {data.summary.completed_activities} completed activities;
                  retained after access ends; ecological recovery assessed
                  separately
                </small>
              </div>
              <div>
                <span>Organizations</span>
                <strong className="org-value">
                  {project.organizations.join(" + ") || "Individual initiative"}
                </strong>
                <small>Company and foundation are optional</small>
              </div>
            </div>
            <section className="result" aria-live="polite">
              <span className="eyebrow">Latest result</span>
              <p>{data.explanation}</p>
            </section>
            <DemonstratorRecord value={data.summary.demonstrator} />
            {data.summary.complete && (
              <section className="final panel" aria-labelledby="final-title">
                <p className="eyebrow">Year 30 · your accumulated work</p>
                <h2 id="final-title">
                  A chapter complete. A legacy to inspect.
                </h2>
                <p>
                  {data.summary.completed_activities} restoration activities
                  across {area(data.summary.restored_area)};{" "}
                  {data.summary.parcel_records ?? project.parcels.length} parcel
                  records; {area(data.summary.active_area ?? data.summary.area)}{" "}
                  currently accessible and {area(data.summary.owned_area)} owned
                  by you / your organisations. Cash remaining:{" "}
                  {money(project.cash)}.
                </p>
                <p>
                  Organizations:{" "}
                  {project.organizations.join(" and ") ||
                    "Individual initiative; no company or foundation created"}
                  .
                </p>
                <p>{data.summary.pending}</p>
                <p>{data.summary.asset_explanation}</p>
                <p>
                  Inspect the parcel records and action history below to see how
                  each result was produced. Export this run to preserve it.
                </p>
              </section>
            )}
            <div
              className={
                isLand || isDemo ? "workspace land-workspace" : "workspace"
              }
            >
              <section
                className="panel actions-panel"
                aria-labelledby="actions-heading"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Choose the next step</p>
                    <h2 id="actions-heading">Available now</h2>
                  </div>
                  <span className="count">
                    {availableActions.length} available
                  </span>
                </div>
                <p className="muted decision-intro">
                  Choose a decision to preview its result before committing.
                </p>
                {availableActions.length ? (
                  <ActionChoices
                    actions={availableActions}
                    busy={busy}
                    selected={selected}
                    onChoose={choose}
                  />
                ) : (
                  <p className="muted">
                    No decisions are available now. Review your summary or undo
                    the last action to revisit a choice.
                  </p>
                )}
                {!categoriesReady ? (
                  <p className="reason decision-update" role="status">
                    Restart the Python API, then reload the saved project to
                    load the new decision groups.
                  </p>
                ) : (
                  <>
                    <details className="decision-group">
                      <summary>
                        Future decisions{" "}
                        <span className="group-count">
                          {futureActions.length}
                        </span>
                      </summary>
                      <p className="muted">
                        These need earlier decisions, more cash or additional
                        land. Each card explains what is missing; availability
                        depends on your choices.
                      </p>
                      {futureActions.length ? (
                        <ActionChoices
                          actions={futureActions}
                          busy={busy}
                          selected={selected}
                          onChoose={choose}
                        />
                      ) : (
                        <p className="muted">
                          No decisions are waiting on prerequisites or
                          resources.
                        </p>
                      )}
                    </details>
                    {unavailableActions.length > 0 && (
                      <details className="decision-group">
                        <summary>
                          No longer available{" "}
                          <span className="group-count">
                            {unavailableActions.length}
                          </span>
                        </summary>
                        <p className="muted">
                          Earlier choices or the remaining time rule these out
                          on your current path. Undo can revisit the last
                          choice.
                        </p>
                        <ActionChoices
                          actions={unavailableActions}
                          busy={busy}
                          selected={selected}
                          onChoose={choose}
                        />
                      </details>
                    )}
                  </>
                )}
                <p className="muted completed-note">
                  Completed decisions are recorded in Action history below.
                  Repeatable decisions remain here when you can choose them
                  again.
                </p>
              </section>
              <aside
                ref={previewPanel}
                className="panel preview-panel"
                aria-labelledby="preview-heading"
              >
                <p className="eyebrow">Before you commit</p>
                <h2 id="preview-heading">
                  {action ? action.title : "Explore a decision"}
                </h2>
                {!action ? (
                  <p className="muted">
                    Select any decision to inspect it. Previewing never spends
                    cash or moves time.
                  </p>
                ) : (
                  <>
                    <p>{action.description}</p>
                    {!action.available ? (
                      <p className="reason">{action.reason}</p>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (preview && !previewBusy && !busy && configReady)
                            mutate("commit", { action_id: action.id, inputs });
                        }}
                      >
                        {isLand && data.land_access ? (
                          <LandEditor
                            key={selected}
                            data={data}
                            action={action}
                            inputs={inputs}
                            onChange={updateInputs}
                            onReady={setConfigReady}
                            request={api}
                            busy={busy}
                          >
                            <Outcome
                              preview={preview}
                              previewBusy={previewBusy}
                              previewError={previewError}
                              busy={busy}
                              ready={configReady}
                            />
                          </LandEditor>
                        ) : isDemo ? (
                          <DemonstratorEditor
                            key={selected}
                            action={action}
                            inputs={inputs}
                            onChange={updateInputs}
                            busy={busy}
                            preview={preview}
                            sources={data.summary.demonstrator?.sources}
                          >
                            <Outcome
                              preview={preview}
                              previewBusy={previewBusy}
                              previewError={previewError}
                              busy={busy}
                              ready={configReady}
                            />
                          </DemonstratorEditor>
                        ) : (
                          <>
                            <Fields
                              fields={action.fields}
                              inputs={inputs}
                              onChange={updateInputs}
                              disabled={busy}
                            />
                            <Outcome
                              preview={preview}
                              previewBusy={previewBusy}
                              previewError={previewError}
                              busy={busy}
                              ready={configReady}
                            />
                          </>
                        )}
                      </form>
                    )}
                  </>
                )}
                <div className="grant">
                  <h3>Grant progress</h3>
                  <p className="grant-status">
                    {project.grant.status.replaceAll("_", " ")}
                  </p>
                  <p>{data.summary.grant_explanation}</p>
                  {project.grant.amount > 0 && (
                    <p>Award: {money(project.grant.amount)}</p>
                  )}
                </div>
              </aside>
            </div>
            <div className="records">
              <section className="panel">
                <p className="eyebrow">The asset base</p>
                <h2>Land, rights & completed work</h2>
                <p className="muted">{data.summary.asset_explanation}</p>
                {project.agreements ? (
                  <LandRecords
                    project={project}
                    summary={data.summary}
                    revision={data.revision}
                    busy={busy}
                    onRemovalPreview={(parcel_id) =>
                      api("parcels/removal-preview", {
                        revision: data.revision,
                        parcel_id,
                      })
                    }
                    onRemovalConfirm={(impact) =>
                      mutate(
                        "parcels/delete",
                        {},
                        {
                          revision: impact.revision,
                          request_id: crypto.randomUUID(),
                          parcel_id: impact.parcel_id,
                          confirm: true,
                        },
                      )
                    }
                  />
                ) : (
                  <p className="reason">
                    Restart the Python API to upgrade this save and load the
                    land-access module.
                  </p>
                )}
                <p className="muted">
                  Pending / proposed: {data.summary.pending}
                </p>
              </section>
              <section className="panel">
                <p className="eyebrow">A record of the journey</p>
                <h2>Action history</h2>
                <p className="muted">
                  Inspecting an earlier result keeps the current project
                  unchanged.
                </p>
                <ol className="history">
                  {project.history.map((h, i) => (
                    <li key={i}>
                      <button
                        aria-expanded={historyIndex === i}
                        onClick={() =>
                          setHistoryIndex(historyIndex === i ? null : i)
                        }
                      >
                        <span>Year {year(h.end)}</span>
                        {h.title}
                      </button>
                    </li>
                  ))}
                </ol>
                {history && (
                  <article className="history-detail">
                    <h3>{history.title}</h3>
                    <p>{history.explanation}</p>
                    {!history.area_unit && (
                      <p className="muted">
                        Original historical record: area inputs and descriptions
                        retain their hectare units. Current parcel and
                        restoration totals are shown in m².
                      </p>
                    )}
                    <p>
                      Year {year(history.start)} → {year(history.end)} · Cash
                      change {money(history.cash_change)} · Cost{" "}
                      {money(history.cost)}
                    </p>
                    {history.inputs.parcel_id && (
                      <p>Parcel: {history.inputs.parcel_id}</p>
                    )}
                  </article>
                )}
                {!project.history.length && (
                  <p>Your decisions will appear here.</p>
                )}
              </section>
            </div>
          </>
        )}
        <footer>
          <span>ALGARROBOS / RESTORATION LAB</span>
          <p>
            A fictional exploration of real questions. Saved locally on the
            computer running Python.
          </p>
        </footer>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
