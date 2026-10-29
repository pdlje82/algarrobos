import React, { useState } from "react";
import { Fields, PreviewStatus } from "./LandAccess.jsx";
import { area, money, year } from "./format.js";
import { PlantChecklist, PlantingList } from "./PlantChecklist.jsx";
import { required } from "./contracts.js";
import { DESIGNER_FIELDS } from "./SiteDesigner.jsx";

const phases = [
  ["planned", "Plan"],
  ["baselined", "Baseline"],
  ["installed", "Plant"],
  ["observed", "Observe"],
  ["evaluated", "Evaluate"],
];

function Sources({ sources }) {
  return (
    <details className="demo-sources">
      <summary>Source documents and funding conditions</summary>
      <p>
        Planting choices are library examples. Species suitability, eligible
        expenses and funding approval need a project-specific review.
      </p>
      <ul>
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function FundingFit({ fit }) {
  required(
    fit !== null && typeof fit === "object",
    "Missing funding assessment from Python.",
  );
  return (
    <div className="demo-funding-fit">
      <strong>{fit.status}</strong>
      <p>{fit.explanation}</p>
      {fit.issues.length > 0 && (
        <ul className="reason">
          {fit.issues.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      {fit.unknowns.length > 0 && (
        <details open>
          <summary>Questions to resolve ({fit.unknowns.length})</summary>
          <ul>
            {fit.unknowns.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function DemonstratorEditor({
  action,
  inputs,
  onChange,
  busy,
  preview,
  previewBusy,
  previewError,
  sources,
  request,
  children,
  onOpenDesigner,
}) {
  const sections = [...new Set(action.fields.filter(f=>action.kind!=="demo_plan" || !DESIGNER_FIELDS.has(f.name)).map((f) => f.section))];
  required(
    sections.length > 0 && sections.every((s) => typeof s === "string"),
    "Missing demonstrator form sections.",
  );
  const [section, setSection] = useState(sections[0]);
  const planning = action.kind === "demo_plan";
  required(
    sections.includes(section),
    "The selected form section is no longer available. Reopen the decision.",
  );
  const selected = section;
  return (
    <div className="demo-editor">
      {planning && (
        <>
          <p className="demo-intro">Configure the demonstration, reporting, funding and remaining budget here. Physical planting choices and plant prices are edited in the Site Designer.</p>
          <button type="button" onClick={onOpenDesigner}>Open Site Designer</button>
          <nav
            className="demo-section-nav"
            aria-label="Demonstrator configuration sections"
          >
            {sections.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={selected === s}
                onClick={() => setSection(s)}
              >
                {s}
              </button>
            ))}
          </nav>
        </>
      )}
      <div className="land-detail-grid">
        <div>
          <fieldset className="demo-fields">
            <legend>{planning ? selected : action.title}</legend>
            {selected === "Budget" && (
              <p>
                Editable playtest rates. Planting, monitoring and reporting are
                paid in separate stages. Land rent and maintenance are
                additional. Edit individual plant prices in the Plant checklist.
              </p>
            )}
            {selected === "Funding route" && (
              <p>
                AL20 3.4 concerns a nonproductive, locally novel demonstration
                with open participation and shared results. Feedback,
                application, award and reimbursement are separate records. A
                nonprofit partner can apply without changing land ownership.
              </p>
            )}
            <Fields
              fields={action.fields
                .filter(
                  (f) => f.section === selected && f.type !== "plant_selection" && (!planning || !DESIGNER_FIELDS.has(f.name)),
                )
                .map((f) =>
                  f.type === "category"
                    ? { ...f, custom_label: "Custom option…" }
                    : f,
                )}
              inputs={inputs}
              onChange={onChange}
              disabled={busy}
            />
            {action.fields
                .filter((f) => !planning && f.type === "plant_selection")
              .map((f) => (
                  <div key={f.name} hidden={f.section !== selected}>
                <PlantChecklist
                  field={f}
                  value={inputs[f.name]}
                  disabled={busy}
                  request={request}
                  onChange={(value) => onChange({ ...inputs, [f.name]: value })}
                />
                  </div>
              ))}
          </fieldset>
          {planning && (
            <div className="demo-section-nav">
              <button
                type="button"
                disabled={sections.indexOf(selected) === 0}
                onClick={() =>
                  setSection(sections[sections.indexOf(selected) - 1])
                }
              >
                ← Previous section
              </button>
              <button
                type="button"
                disabled={sections.indexOf(selected) === sections.length - 1}
                onClick={() =>
                  setSection(sections[sections.indexOf(selected) + 1])
                }
              >
                Next section →
              </button>
            </div>
          )}
          <Sources sources={sources} />
        </div>
        <div className="land-result">
          {planning && <PreviewStatus preview={preview} previewBusy={previewBusy} previewError={previewError} />}
          {planning && preview?.demonstrator?.budget && (
            <DemonstratorPreview value={preview.demonstrator} updating={previewBusy} />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function DemonstratorPreview({ value: d, updating }) {
  return (
    <div className="demo-budget-preview" aria-busy={updating}>
      <h3>Planting plan · hypothetical preview</h3>
      <p>
        {d.parcel_name} · {area(d.plan.restoration_area)} · {d.plan.trees} trees
        · {d.plan.shrubs} shrubs / grasses
      </p>
      <p>Species, quantities and plant prices are available in the Site Designer.</p>
      <table className="demo-budget">
        <caption>Configured budget — eligibility unverified</caption>
        <tbody>
          {d.budget.rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{money(r.amount)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Planting subtotal</th>
            <td>{money(d.budget.installation)}</td>
          </tr>
          <tr>
            <th scope="row">Follow-up monitoring</th>
            <td>{money(d.budget.monitoring)}</td>
          </tr>
          <tr>
            <th scope="row">Evaluation / sharing</th>
            <td>{money(d.budget.reporting)}</td>
          </tr>
          <tr className="budget-total">
            <th scope="row">Total planned expenditure</th>
            <td>{money(d.budget.total)}</td>
          </tr>
        </tbody>
      </table>
      <p>
        Planting takes {year(d.plan.installation_years)} years; follow-up is
        planned {year(d.plan.followup_years)} years after planting finishes.
        Funding delays are additional.
      </p>
      {d.plan.funding_route === "al20_34" && (
        <p className="reason">
          Finance {money(d.budget.total)} before reimbursement, plus land costs.
          The preliminary reimbursement ceiling is{" "}
          {money(d.reimbursement_ceiling)}; no eligible amount or award is
          confirmed.
        </p>
      )}
      <FundingFit fit={d.fit} />
    </div>
  );
}

export function DemonstratorRecord({ value: d, onOpenDesigner }) {
  required(
    d !== null && typeof d === "object",
    "Missing demonstrator record from Python.",
  );
  if (d.status === "Not planned") return null;
  if (d.legacy)
    return (
      <section className="panel demo-record">
        <h2>{d.status}</h2>
        <p>{d.explanation}</p>
      </section>
    );
  const reached = phases.findIndex(([key]) => key === d.status);
  required(reached >= 0, `Unsupported demonstrator stage: ${d.status}.`);
  const basis = (code) =>
    code === "observed"
      ? "User-reported / unverified"
      : code === "illustrative"
        ? "Illustrative scenario assumption"
        : code === "unknown"
          ? "Not specified"
          : (() => {
              throw new Error(`Unsupported evidence basis: ${code}.`);
            })();
  return (
    <section className="panel demo-record" aria-labelledby="demo-record-title">
      <p className="eyebrow">The demonstrator</p>
      <h2 id="demo-record-title">
        {d.parcel_name} · {area(d.plan.restoration_area)}
      </h2>
      <ol className="demo-phases" aria-label="Demonstrator progress">
        {phases.map(([key, title], i) => (
          <li
            key={key}
            className={i <= reached ? "phase-reached" : ""}
            aria-current={i === reached ? "step" : undefined}
          >
            <span>{i + 1}</span>
            {title}
            {i === reached && <small>Current stage</small>}
          </li>
        ))}
      </ol>
      <p>
        {d.plan.trees} trees and {d.plan.shrubs} shrubs / grasses planned.{" "}
        {d.installed_year === null
          ? "No planting installed yet."
          : `Planting installed in year ${year(d.installed_year)}; follow-up due in year ${year(d.followup_due)}.`}{" "}
        Installed work does not establish ecological recovery.
      </p>
      <button type="button" onClick={onOpenDesigner}>Open Site Designer</button>
      <div className="demo-record-totals">
        <p>
          Planned budget<strong>{money(d.budget.total)}</strong>
        </p>
        <p>
          Spent on this pilot<strong>{money(d.spent)}</strong>
        </p>
        <p>
          Planned spending remaining
          <strong>{money(d.planned_future_spending)}</strong>
        </p>
        <p>
          Funding status<strong>{d.funding_stage.replaceAll("_", " ")}</strong>
        </p>
      </div>
      {d.funding_review && (
        <p>
          Funding feedback: {d.funding_review.feedback} ·{" "}
          {basis(d.funding_review.basis)}
        </p>
      )}
      {d.funding_record?.received_amount !== undefined && (
        <p>
          Reimbursement recorded: {money(d.funding_record.received_amount)} of a{" "}
          {money(d.funding_record.amount)} award ·{" "}
          {basis(d.funding_record.payment_basis)}. This playtest records one
          payment only.
        </p>
      )}
      <details>
        <summary>Planting plan and demonstration design</summary>
        <p>Physical planting choices are edited in the Site Designer.</p>
        <dl className="demo-description">
          {d.details.map((x) => (
            <div key={x.label}>
              <dt>{x.label}</dt>
              <dd>{x.value}</dd>
            </div>
          ))}
        </dl>
        <p>Notes: {d.plan.notes === "" ? "None supplied" : d.plan.notes}</p>
      </details>
      <details>
        <summary>Baseline, observations and evaluation</summary>
        {d.baseline ? (
          <p>
            Baseline year {year(d.baseline.year)} · {basis(d.baseline.basis)} ·
            starting vegetation cover:{" "}
            {d.baseline.cover_percent === null
              ? "Unknown"
              : `${d.baseline.cover_percent}%`}{" "}
            · photo points: {d.baseline.photo_points}. {d.baseline.reference}
          </p>
        ) : (
          <p>Baseline not yet recorded.</p>
        )}
        {d.observation ? (
          <p>
            Follow-up year {year(d.observation.year)} ·{" "}
            {basis(d.observation.basis)} · {d.observation.surviving_trees} trees
            and {d.observation.surviving_shrubs} shrubs / grasses surviving (
            {d.observation.survival_percent}% of entered planted counts). Cover:{" "}
            {d.observation.cover_percent === null
              ? "Unknown"
              : `${d.observation.cover_percent}%`}
            . {d.observation.reference}
          </p>
        ) : (
          <p>
            No survival or growth result is assumed. Follow-up observations
            remain to be entered.
          </p>
        )}
        {d.evaluation && (
          <p>
            Interpretation: {d.evaluation.conclusion} · next step:{" "}
            {d.evaluation.next_step} · dissemination: {d.evaluation.shared} ·{" "}
            {basis(d.evaluation.basis)}. {d.evaluation.reference}
          </p>
        )}
      </details>
      <details>
        <summary>Funding fit and recorded feedback</summary>
        <FundingFit fit={d.fit} />
        {d.funding_review && (
          <p>
            Feedback: {d.funding_review.feedback} ·{" "}
            {basis(d.funding_review.basis)} ·{" "}
            {d.funding_review.reference === ""
              ? "No reference supplied"
              : d.funding_review.reference}
          </p>
        )}
        <p>
          An award is not cash. This app records reports or explicit
          assumptions; it does not submit applications, publish results or
          receive real payments.
        </p>
      </details>
      <Sources sources={d.sources} />
    </section>
  );
}
