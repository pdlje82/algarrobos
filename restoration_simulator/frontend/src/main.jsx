import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const money = (value) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
const year = (value) =>
  Number(value).toLocaleString("en", { maximumFractionDigits: 4 });

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
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [inputs, setInputs] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [name, setName] = useState("My restoration journey");
  const [historyIndex, setHistoryIndex] = useState(null);
  const [replacement, setReplacement] = useState(null);
  const [retry, setRetry] = useState(null);
  const pending = useRef(false);
  const fileInput = useRef();
  const previewPanel = useRef();
  const project = data?.project;
  const action = data?.actions.find((a) => a.id === selected);

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
    setPreview(null);
    setPreviewError("");
    if (!action?.available || !project) {
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
  }, [selected, inputs, data?.revision]);

  function choose(a) {
    setSelected(a.id);
    setInputs(Object.fromEntries(a.fields.map((f) => [f.name, f.default])));
    setPreview(null);
    setPreviewError("");
    if (window.matchMedia("(max-width: 650px)").matches) {
      requestAnimationFrame(() =>
        previewPanel.current?.scrollIntoView({
          behavior: "smooth",
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
    if (project) setReplacement({ kind: "new", name });
    else mutate("project/new", { name, confirm_replace: false });
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
        <div className="header-note">
          <span className="status-dot" /> Local prototype{" "}
          <span className="version">MVP / 01</span>
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
              onClick={() => mutate("undo", {})}
            >
              Undo last action
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
              You’ll begin with a personal parcel or purchase a small
              demonstrator site.
            </p>
            <form onSubmit={startNew}>
              <label htmlFor="project-name">Project name</label>
              <input
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
        ) : (
          <>
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
                <span>Land in the initiative</span>
                <strong>
                  {data.summary.area} <small>ha</small>
                </strong>
                <small>
                  {project.parcels.length} parcels · ownership / access below
                </small>
              </div>
              <div>
                <span>Completed restoration</span>
                <strong>
                  {data.summary.restored_area} <small>ha</small>
                </strong>
                <small>
                  {data.summary.completed_activities} completed activities
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
            {data.summary.complete && (
              <section className="final panel" aria-labelledby="final-title">
                <p className="eyebrow">Year 30 · your accumulated work</p>
                <h2 id="final-title">
                  A chapter complete. A legacy to inspect.
                </h2>
                <p>
                  {data.summary.completed_activities} restoration activities
                  across {data.summary.restored_area} ha;{" "}
                  {project.parcels.length} parcels with {data.summary.area} ha
                  of land owned or accessed. Cash remaining:{" "}
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
            <div className="workspace">
              <section
                className="panel actions-panel"
                aria-labelledby="actions-heading"
              >
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Choose the next step</p>
                    <h2 id="actions-heading">Decisions available to you</h2>
                  </div>
                  <span className="count">
                    {data.actions.filter((a) => a.available).length} available
                  </span>
                </div>
                <div className="actions">
                  {data.actions.map((a) => (
                    <button
                      key={a.id}
                      disabled={busy}
                      aria-pressed={selected === a.id}
                      className={`action ${selected === a.id ? "selected" : ""} ${!a.available ? "unavailable" : ""}`}
                      onClick={() => choose(a)}
                    >
                      <span className="action-title">
                        {a.title}
                        <span aria-hidden="true">↗</span>
                      </span>
                      <span className="action-meta">
                        {a.optional ? "Optional · " : ""}
                        {a.repeatable ? "Repeatable · " : ""}
                        {money(a.cost)}
                        {a.kind !== "advance"
                          ? ` · ${year(a.duration)} years`
                          : " · choose year"}
                      </span>
                      {a.reason && <span className="reason">{a.reason}</span>}
                    </button>
                  ))}
                </div>
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
                          if (preview && !previewBusy && !busy)
                            mutate("commit", { action_id: action.id, inputs });
                        }}
                      >
                        {action.fields.map((f) => (
                          <div className="field" key={f.name}>
                            <label htmlFor={f.name}>{f.label}</label>
                            {f.type === "select" ? (
                              <select
                                id={f.name}
                                value={inputs[f.name] ?? ""}
                                disabled={busy}
                                onChange={(e) => {
                                  setPreview(null);
                                  setInputs({
                                    ...inputs,
                                    [f.name]: e.target.value,
                                  });
                                }}
                              >
                                {f.options.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label} · {o.remaining_area} ha remaining
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                id={f.name}
                                type="number"
                                step="any"
                                min={f.min}
                                max={f.max}
                                value={inputs[f.name] ?? ""}
                                disabled={busy}
                                onChange={(e) => {
                                  setPreview(null);
                                  setInputs({
                                    ...inputs,
                                    [f.name]:
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value),
                                  });
                                }}
                              />
                            )}
                          </div>
                        ))}
                        {previewBusy && (
                          <p role="status">Calculating preview in Python…</p>
                        )}
                        {previewError && (
                          <p className="error" role="alert">
                            {previewError}
                          </p>
                        )}
                        {preview && (
                          <div className="preview" aria-live="polite">
                            <span className="eyebrow">
                              Configured result · preview
                            </span>
                            <p>{preview.explanation}</p>
                            <dl>
                              <div>
                                <dt>Time taken</dt>
                                <dd>{year(preview.duration)} years</dd>
                              </div>
                              <div>
                                <dt>Finish at</dt>
                                <dd>Year {year(preview.end_year)}</dd>
                              </div>
                              <div>
                                <dt>Cash change</dt>
                                <dd>{money(preview.cash_change)}</dd>
                              </div>
                              <div>
                                <dt>Cash after</dt>
                                <dd>{money(preview.cash_after)}</dd>
                              </div>
                            </dl>
                          </div>
                        )}
                        <button
                          className="primary commit"
                          disabled={busy || previewBusy || !preview}
                        >
                          Commit decision →
                        </button>
                        <small className="muted">
                          The result is applied and autosaved together.
                        </small>
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
                <h2>Land & completed work</h2>
                <p className="muted">{data.summary.asset_explanation}</p>
                {!project.parcels.length && <p>No land route chosen yet.</p>}
                {project.parcels.map((p) => (
                  <article className="parcel" key={p.id}>
                    <h3>
                      {p.name}
                      <span>{p.area} ha</span>
                    </h3>
                    <p>
                      {p.access} · Owner: {p.owner}
                    </p>
                    <small>
                      Access established in year {year(p.year)} · Acquisition
                      expenditure: {money(p.acquisition_cost)}
                    </small>
                    <ul>
                      {project.activities
                        .filter((a) => a.parcel_id === p.id)
                        .map((a) => (
                          <li key={a.id}>
                            {a.title} · {a.area} ha · completed year{" "}
                            {year(a.year)}
                          </li>
                        ))}
                    </ul>
                  </article>
                ))}
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
            <details className="new-project panel">
              <summary>Start another project</summary>
              <p>
                Keep other runs as JSON exports. One project is active at a
                time.
              </p>
              <form onSubmit={startNew}>
                <label htmlFor="new-name">New project name</label>
                <input
                  id="new-name"
                  value={name}
                  maxLength="80"
                  required
                  onChange={(e) => setName(e.target.value)}
                />
                <button disabled={busy}>Start new project</button>
              </form>
            </details>
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
