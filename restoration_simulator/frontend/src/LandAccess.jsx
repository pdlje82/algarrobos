import React, { useEffect, useId, useRef, useState } from "react";
import { area, money, year } from "./format.js";
import { ParcelRemoval } from "./ParcelRemoval.jsx";
import { required, inputValue, record } from "./contracts.js";
import {DocumentLink} from "./DocumentLink.jsx";

export function FieldHelp({ label, children }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className="field-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={(e) => {
        if (!e.currentTarget.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          e.stopPropagation();
        }
      }}
    >
      <button
        type="button"
        className="help-trigger"
        aria-label={`Help: ${label}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      >
        i
      </button>
      {open && (
        <span role="tooltip" id={id} className="help-content">
          {children}
        </span>
      )}
    </span>
  );
}

function CategoryInput({ field: f, value, onChange, disabled }) {
  required(typeof value === "string", `Invalid category input ${f.name}.`);
  const [adding, setAdding] = useState(false);
  const custom =
    adding || (Boolean(value) && !f.options.some((o) => o.value === value));
  return (
    <>
      <select
        id={`field-${f.name}`}
        disabled={disabled}
        value={custom ? "__custom__" : value}
        aria-describedby={`help-${f.name}`}
        onChange={(e) => {
          const add = e.target.value === "__custom__";
          setAdding(add);
          onChange(add ? "" : e.target.value);
        }}
      >
        {f.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value="__custom__">
          {Object.hasOwn(f, "custom_label") ? f.custom_label : "Add category…"}
        </option>
      </select>
      {custom && (
        <>
          <label htmlFor={`custom-${f.name}`}>
            {f.custom_label ? "Custom details" : "New category name"}
          </label>
          <input
            id={`custom-${f.name}`}
            aria-label={`${f.label}: ${f.custom_label ? "custom details" : "new category name"}`}
            maxLength={f.maxLength}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      )}
    </>
  );
}

export function Fields({ fields, inputs, onChange, disabled }) {
  return (
    <div className="field-grid">
      {fields
        .filter((f) => !f.hidden)
        .map((f) => (
          <div className="field" key={f.name}>
            <div className="field-label">
              <label htmlFor={`field-${f.name}`}>{f.label}</label>
              {f.detail && <FieldHelp label={f.label}>{f.detail}</FieldHelp>}
            </div>
            {f.type === "category" ? (
              <CategoryInput
                field={f}
                value={inputValue(inputs, f.name)}
                disabled={disabled}
                onChange={(value) => onChange({ ...inputs, [f.name]: value })}
              />
            ) : f.type === "select" ? (
              <select
                id={`field-${f.name}`}
                value={inputValue(inputs, f.name)}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...inputs,
                    [f.name]: e.target.value,
                    ...(f.name === "parcel_id" &&
                    f.options.find((o) => o.value === e.target.value)
                      ?.default_area !== undefined
                      ? {
                          restoration_area: f.options.find(
                            (o) => o.value === e.target.value,
                          ).default_area,
                        }
                      : {}),
                  })
                }
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {o.remaining_area !== undefined
                      ? ` · ${area(o.remaining_area)} remaining`
                      : ""}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                id={`field-${f.name}`}
                maxLength={f.maxLength}
                aria-describedby={f.help ? `help-${f.name}` : undefined}
                value={inputValue(inputs, f.name)}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...inputs, [f.name]: e.target.value })
                }
              />
            ) : (
              <input
                id={`field-${f.name}`}
                type={f.type}
                aria-describedby={f.help ? `help-${f.name}` : undefined}
                value={inputValue(inputs, f.name)}
                disabled={disabled}
                min={f.min}
                max={f.max}
                step={Object.hasOwn(f, "step") ? f.step : "any"}
                maxLength={f.maxLength}
                onChange={(e) =>
                  onChange({
                    ...inputs,
                    [f.name]:
                      f.type === "number"
                        ? e.target.value === ""
                          ? null
                          : Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            )}
            {f.unknown_allowed && (
              <small className="muted">
                {Object.hasOwn(f, "unknown_help")
                  ? f.unknown_help
                  : "Leave blank for Unknown; proposals can retain unresolved terms."}
              </small>
            )}
            {f.help && (
              <small id={`help-${f.name}`} className="muted">
                {f.help}
              </small>
            )}
          </div>
        ))}
    </div>
  );
}

export function LandEditor({
  data,
  action,
  inputs,
  onChange,
  onReady,
  request,
  busy,
  children,
}) {
  const finalising = action.kind === "activate_access";
  const [agreementId, setAgreementId] = useState(
    finalising
      ? action.fields.find((f) => f.name === "agreement_id").default
      : "",
  );
  const proposal = data.project.agreements.find((a) => a.id === agreementId);
  const [routeId, setRouteId] = useState("");
  const [parcelId, setParcelId] = useState("new");
  const [compare, setCompare] = useState(false);
  const [wholeParcel, setWholeParcel] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [formAttempt, setFormAttempt] = useState(0);
  const drafts = useRef({});
  const selectedRoute = finalising ? proposal?.route_id : routeId;
  const selectedParcel = finalising ? proposal?.parcel_id : parcelId;
  const key = `${selectedRoute}/${selectedParcel}/${finalising ? agreementId : "new"}`;
  const routes = data.land_access.routes;
  const chosen = routes.find((r) => r.id === selectedRoute);
  useEffect(() => {
    onReady(false);
    setError("");
    setForm(null);
    setWholeParcel(false);
    onChange(Object.hasOwn(drafts.current, key) ? drafts.current[key] : {});
    if (!selectedRoute || !selectedParcel) return;
    let ignore = false;
    request("land/form", {
      revision: data.revision,
      route_id: selectedRoute,
      parcel_id: selectedParcel,
      agreement_id: finalising ? agreementId : null,
    })
      .then((result) => {
        if (ignore) return;
        const initial = {
          ...Object.fromEntries(result.fields.map((f) => [f.name, f.default])),
          route_id: selectedRoute,
          parcel_id: selectedParcel,
        };
        if (finalising) initial.agreement_id = agreementId;
        setForm(result);
        onChange(
          Object.hasOwn(drafts.current, key) ? drafts.current[key] : initial,
        );
        onReady(true);
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [
    selectedRoute,
    selectedParcel,
    agreementId,
    finalising,
    data.revision,
    key,
    request,
    onChange,
    onReady,
    formAttempt,
  ]);
  function edit(next) {
    if (selectedRoute === "existing" && next.owner_id)
      next = { ...next, holder_id: next.owner_id };
    if (wholeParcel && next.parcel_area !== inputs.parcel_area)
      next = { ...next, covered_area: next.parcel_area };
    else if (
      next.covered_area !==
      (selectedParcel === "new" ? next.parcel_area : form.parcel_area)
    )
      setWholeParcel(false);
    drafts.current[key] = next;
    onChange(next);
  }
  const siteNames = new Set([
    "location",
    "cadastral_reference",
    "current_use",
    "current_cover",
    "site_condition",
    "restrictions",
  ]);
  const termNames = new Set([
    "upfront",
    "annual_payment",
    "deposit",
    "term_years",
    "annual_maintenance",
    "commitment_years",
  ]);
  const permissionNames = new Set([
    "allow_restoration",
    "allow_monitoring",
    "allow_public",
    "physical_access",
    "permits",
    "evidence",
    "instrument",
    "exit_terms",
  ]);
  if (selectedRoute === "existing") {
    permissionNames.delete("evidence");
    permissionNames.delete("instrument");
  }
  return (
    <div className="land-editor">
      {finalising ? (
        <Fields
          fields={action.fields}
          inputs={{ agreement_id: agreementId }}
          disabled={busy}
          onChange={(x) => setAgreementId(x.agreement_id)}
        />
      ) : (
        <>
          <p className="muted">
            Choose a route for the demonstrator or a later parcel. Prices,
            approvals and terms below are fictional playtest assumptions.
          </p>
          <label htmlFor="land-target">Target parcel</label>
          <select
            id="land-target"
            value={parcelId}
            disabled={busy}
            onChange={(e) => setParcelId(e.target.value)}
          >
            {data.land_access.targets.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="land-view-controls">
            <button
              type="button"
              aria-pressed={!compare}
              onClick={() => setCompare(false)}
            >
              Route cards
            </button>
            <button
              type="button"
              aria-pressed={compare}
              onClick={() => setCompare(true)}
            >
              Compare seven routes
            </button>
            <button
              type="button"
              aria-pressed={routeId === "existing"}
              onClick={() => setRouteId("existing")}
            >
              I already own this land
            </button>
          </div>
          <fieldset className="route-picker">
            <legend>Seven ways to establish land access</legend>
            <div className={compare ? "route-radio-list" : "route-cards"}>
              {routes
                .filter((r) => r.id !== "existing")
                .map((r) => (
                  <label
                    className={`route-card ${routeId === r.id ? "selected" : ""}`}
                    key={r.id}
                  >
                    <span className="route-label">
                      <input
                        type="radio"
                        aria-label={r.title}
                        name="land-route"
                        value={r.id}
                        checked={routeId === r.id}
                        disabled={busy || !r.available}
                        onChange={() => setRouteId(r.id)}
                      />
                      <strong>{r.title}</strong>
                    </span>
                    {!compare && (
                      <>
                        <small>{r.spanish}</small>
                        <p>{r.description}</p>
                        <span>{r.ownership_label}</span>
                        <small>
                          Default one-off {money(r.upfront)} · {r.annual_label}
                        </small>
                        <small>{r.term_label}</small>
                      </>
                    )}
                    {r.reason && <span className="reason">{r.reason}</span>}
                  </label>
                ))}
            </div>
          </fieldset>
          {compare && (
            <div
              className="comparison-scroll"
              tabIndex="0"
              aria-label="Land-access comparison; scroll horizontally on a small screen"
            >
              <table className="land-comparison">
                <caption>
                  Illustrative defaults; unknown real-world conditions remain
                  unverified.
                </caption>
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Ownership</th>
                    <th>Access term</th>
                    <th>One-off / annual access</th>
                    <th>Obligations / exit</th>
                  </tr>
                </thead>
                <tbody>
                  {routes
                    .filter((r) => r.id !== "existing")
                    .map((r) => (
                      <tr key={r.id}>
                        <th scope="row">{r.title}</th>
                        <td>{r.ownership_label}</td>
                        <td>{r.term_label}</td>
                        <td>
                          {money(r.upfront)} / {r.annual_label}
                        </td>
                        <td>
                          {r.caveat}
                          <br />
                          Maintenance default {money(r.annual_maintenance)}/year
                          for {r.commitment_years} years; no automatic renewal.
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setFormAttempt((value) => value + 1)}
          >
            Retry configuration
          </button>
        </div>
      )}
      {chosen && (
        <div className="selected-route">
          <h3>Selected: {chosen.title}</h3>
          <p>{chosen.caveat}</p>
          {selectedRoute === "existing" && (
            <p>
              Already owned; no acquisition or ownership transfer. Recorded at
              the current project year without advancing time. No maintenance
              commitment is added unless you enter one.
            </p>
          )}
        </div>
      )}
      {selectedRoute && !form && !error && (
        <p role="status">Loading configuration from Python…</p>
      )}
      <div className="land-detail-grid">
        <div>
          {form && (
            <>
              <h3>
                {form.existing_ownership
                  ? "Parcel and ownership record"
                  : "Parcel, parties and status"}
              </h3>
              <Fields
                fields={form.fields.filter(
                  (f) =>
                    !siteNames.has(f.name) &&
                    !termNames.has(f.name) &&
                    !permissionNames.has(f.name),
                )}
                inputs={inputs}
                onChange={edit}
                disabled={busy}
              />
              <label className="inline-check">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={wholeParcel}
                  onChange={(e) => {
                    setWholeParcel(e.target.checked);
                    if (e.target.checked)
                      edit({
                        ...inputs,
                        covered_area:
                          selectedParcel === "new"
                            ? inputs.parcel_area
                            : form.parcel_area,
                      });
                  }}
                />
                Use the entire parcel (
                {area(
                  selectedParcel === "new"
                    ? inputs.parcel_area
                    : form.parcel_area,
                )}
                )
              </label>
              <details className="land-section">
                <summary>Site details and unresolved restrictions</summary>
                <p>
                  Use and vegetation describe the site; condition and legal
                  restrictions are separate. Categories combine document-based
                  descriptions with general choices. Custom entries are
                  user-defined.
                </p>
                <Fields
                  fields={form.fields.filter((f) => siteNames.has(f.name))}
                  inputs={inputs}
                  onChange={edit}
                  disabled={busy}
                />
                <details className="category-sources">
                  <summary>Category sources</summary>
                  <ul>
                    {form.category_sources.map((s) => (
                      <li key={s.id}>
                        <DocumentLink
                          href={`/api/sources/${s.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.label}
                        </DocumentLink>
                      </li>
                    ))}
                  </ul>
                </details>
                {!form.fields.some((f) => siteNames.has(f.name)) && (
                  <p>
                    Existing parcel metadata is retained. Ownership changes only
                    on a concluded transfer.
                  </p>
                )}
              </details>
              <details className="land-section" open>
                <summary>
                  {form.existing_ownership
                    ? "Optional maintenance commitment"
                    : "Costs, duration and continuing maintenance"}
                </summary>
                <Fields
                  fields={form.fields.filter((f) => termNames.has(f.name))}
                  inputs={inputs}
                  onChange={edit}
                  disabled={busy}
                />
              </details>
              <details className="land-section">
                <summary>Permissions, evidence and exit terms</summary>
                <Fields
                  fields={form.fields.filter((f) =>
                    permissionNames.has(f.name),
                  )}
                  inputs={inputs}
                  onChange={edit}
                  disabled={busy}
                />
              </details>
              <details className="land-section">
                <summary>Sources and scenario assumptions</summary>
                <p>
                  <DocumentLink href={form.source_url} target="_blank" rel="noreferrer">
                    Open source document
                  </DocumentLink>{" "}
                  — {form.source}
                </p>
                <ul>
                  {form.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </div>
        <div className="land-result">{children}</div>
      </div>
    </div>
  );
}

function PeriodBar({ start, end, label, currentYear, preview }) {
  const [show, setShow] = useState(false);
  const left = Math.max(0, Math.min(100, (start / 30) * 100));
  const right = Math.max(
    left,
    Math.min(100, ((end === null ? 30 : end) / 30) * 100),
  );
  const description = `${label}. ${end === null ? "No expiry recorded; continues beyond this view." : `Ends year ${year(end)}${end > 30 ? "; continues beyond the playable horizon" : ""}.`}`;
  return (
    <div className="rights-period">
      <div className="rights-track">
        <button
          type="button"
          className={`period-bar ${preview ? "period-preview" : ""}`}
          style={{ left: `${left}%`, width: `${right - left}%` }}
          aria-label={description}
          aria-expanded={show}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onFocus={() => setShow(true)}
          onBlur={() => setShow(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShow(false);
          }}
          onClick={() => setShow(true)}
        >
          {end === null && <span aria-hidden="true">→</span>}
        </button>
        {currentYear !== undefined && (
          <span
            className="rights-now"
            aria-hidden="true"
            style={{ left: `${(currentYear / 30) * 100}%` }}
          />
        )}
      </div>
      <small>
        {label}
        {end === null
          ? " · no expiry recorded →"
          : ` → year ${year(end)}${end > 30 ? " (beyond horizon)" : ""}`}
      </small>
      {show && <p className="period-details">{description}</p>}
    </div>
  );
}

export function AccessTimeline({
  agreements,
  obligations,
  parcels,
  parties,
  currentYear,
  title = "Land access and commitments",
  preview = false,
}) {
  const [showAccess, setShowAccess] = useState(true);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [selection, setSelection] = useState(null);
  const removed = new Set(
    parcels.filter((p) => p.scenario_status === "removed").map((p) => p.id),
  );
  for (const obligation of obligations)
    record(agreements, obligation.agreement_id, "agreement");
  agreements = agreements.filter((a) => !removed.has(a.parcel_id));
  const agreementIds = new Set(agreements.map((a) => a.id));
  obligations = obligations.filter((o) => agreementIds.has(o.agreement_id));
  if (!agreements.length && !obligations.length) return null;
  const parcelName = (id) => {
    const p = record(parcels, id, "parcel");
    return `${p.name}${p.scenario_status === "excluded" ? " · excluded from new work" : ""}`;
  };
  const partyName = (id) => record(parties, id, "party").name;
  const ids = [
    ...new Set([
      ...agreements.map((a) => a.parcel_id),
      ...obligations
        .map((o) => agreements.find((a) => a.id === o.agreement_id)?.parcel_id)
        .filter(Boolean),
    ]),
  ];
  const visible = (id) => selection === null || selection.includes(id);
  const toggle = (id) =>
    setSelection((prev) => {
      const prior = prev === null ? ids : prev; // Null explicitly means all parcels.
      return prior.includes(id)
        ? prior.filter((x) => x !== id)
        : [...prior, id];
    });
  const maintenance = obligations.filter((o) =>
    visible(record(agreements, o.agreement_id, "agreement").parcel_id),
  );
  return (
    <section
      className={`access-timeline ${preview ? "draft-timeline" : ""}`}
      aria-label={title}
    >
      <h3>
        {title}
        {preview ? " · hypothetical preview" : ""}
      </h3>
      <div className="timeline-controls">
        <label className="inline-check">
          <input
            type="checkbox"
            checked={showAccess}
            onChange={(e) => setShowAccess(e.target.checked)}
          />
          Show land access
        </label>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={showMaintenance}
            onChange={(e) => setShowMaintenance(e.target.checked)}
          />
          Show maintenance commitments ({obligations.length})
        </label>
        <FieldHelp label="Timeline controls">
          These controls only change the display. Hiding a row never changes
          access or cancels a payment or maintenance obligation. Ownership rows
          show when the record was added to this project, not when ownership
          began.
        </FieldHelp>
      </div>
      <details className="parcel-filter">
        <summary>
          Parcels ·{" "}
          {selection === null
            ? "All parcels"
            : `${selection.filter((id) => ids.includes(id)).length} selected`}
        </summary>
        <button type="button" onClick={() => setSelection(null)}>
          All parcels
        </button>
        <button type="button" onClick={() => setSelection([])}>
          Clear selection
        </button>
        <div className="parcel-checks">
          {ids.map((id) => (
            <label key={id} className="inline-check">
              <input
                type="checkbox"
                checked={visible(id)}
                onChange={() => toggle(id)}
              />
              {parcelName(id)}
            </label>
          ))}
        </div>
      </details>
      <p className="muted">
        Current year: {year(currentYear)} · green: access · gold: maintenance ·
        dashed: preview.
      </p>
      {(showAccess || showMaintenance) && (
        <div
          className="rights-axis"
          aria-label="Proportional project-time axis, year 0 to year 30"
        >
          {[0, 5, 10, 15, 20, 25, 30].map((y) => (
            <span key={y} style={{ left: `${(y / 30) * 100}%` }}>
              {y === 0 ? "Year " : ""}
              {y}
            </span>
          ))}
        </div>
      )}
      {showAccess &&
        agreements
          .filter((a) => visible(a.parcel_id))
          .map((a) => (
            <div className="rights-row" key={a.id}>
              <strong>
                {parcelName(a.parcel_id)} ·{" "}
                {a.route_id === "existing"
                  ? "Existing ownership record"
                  : a.route_id.replaceAll("_", " ")}
              </strong>
              <span className="agreement-status">
                {a.status === "active" && a.route_id === "existing"
                  ? "Recorded"
                  : a.status}
              </span>
              {a.status === "pending" ? (
                <p className="muted">
                  Proposal only — no effective access period.
                </p>
              ) : (
                a.periods.map((p, i) => (
                  <PeriodBar
                    key={i}
                    start={p.start}
                    end={p.end}
                    currentYear={currentYear}
                    preview={preview}
                    label={`${parcelName(a.parcel_id)} · ${area(a.covered_area)} included · holder: ${partyName(a.holder_id)} · operator: ${partyName(a.operator_id)} · ${a.route_id === "existing" ? "recorded" : "access from"} year ${year(p.start)}`}
                  />
                ))
              )}
            </div>
          ))}
      {showMaintenance &&
        maintenance.map((o) => {
          const a = agreements.find((a) => a.id === o.agreement_id);
          return (
            <div className="rights-row maintenance-row" key={o.id}>
              <strong>
                {parcelName(a.parcel_id)} · maintenance commitment
              </strong>
              <PeriodBar
                start={o.start}
                end={o.end}
                currentYear={currentYear}
                preview={preview}
                label={`${money(o.annual_amount)} / year · from year ${year(o.start)}`}
              />
            </div>
          );
        })}
      {selection !== null && !ids.some(visible) && (
        <p className="muted">
          No parcels selected. Choose a parcel or All parcels to show its
          periods.
        </p>
      )}
      {!showAccess && !showMaintenance && (
        <p className="muted">
          Timeline rows hidden. Project rights and commitments are unchanged.
        </p>
      )}
    </section>
  );
}

export function LandRecords({
  project,
  summary,
  revision,
  busy,
  onRemovalPreview,
  onRemovalConfirm,
}) {
  const party = (id) => record(project.parties, id, "party").name;
  return (
    <>
      <div className="land-totals">
        <p>
          <strong>{area(summary.owned_area)}</strong> owned by you / your
          organisations
        </p>
        <p>
          <strong>{area(summary.active_area)}</strong> currently accessible
        </p>
        <p>
          <strong>{area(summary.restored_area)}</strong> completed work area
        </p>
      </div>
      <p>
        Future access fees through year 30:{" "}
        {money(summary.future_rent_to_horizon)}. Remaining maintenance
        commitment (including beyond year 30):{" "}
        {money(summary.remaining_maintenance_commitment)}.
      </p>
      {summary.future_rent_after_horizon > 0 && (
        <p className="reason">
          Access payments after year 30:{" "}
          {money(summary.future_rent_after_horizon)} under the currently
          recorded terms.
        </p>
      )}
      {project.parcels
        .filter((p) => p.scenario_status !== "removed")
        .map((p) => (
          <article className="parcel" key={p.id}>
            <h3>
              {p.name}
              <span>{area(p.area)} total</span>
            </h3>
            <p>
              Owner: {party(p.owner_id)} · {p.location}
            </p>
            <small>
              Ownership acquisition expenditure: {money(p.acquisition_cost)}; no
              market valuation.
            </small>
            {project.schema_version === 4 && onRemovalPreview && (
              <ParcelRemoval
                parcel={p}
                revision={revision}
                busy={busy}
                onPreview={onRemovalPreview}
                onConfirm={onRemovalConfirm}
              />
            )}
            <details>
              <summary>Site record</summary>
              <p>
                Use: {p.current_use} · Cover: {p.current_cover} · Physical
                access: {p.physical_access}
              </p>
              <p>
                Cadastral reference:{" "}
                {p.cadastral_reference === ""
                  ? "Unknown"
                  : p.cadastral_reference}
              </p>
              <p>
                Condition:{" "}
                {p.site_condition === "" ? "Not specified" : p.site_condition}
              </p>
              <p>{p.restrictions}</p>
            </details>
            {project.agreements
              .filter((a) => a.parcel_id === p.id)
              .map((a) => (
                <div className="agreement-record" key={a.id}>
                  <h4>
                    {a.id} ·{" "}
                    {a.route_id === "existing"
                      ? "Existing ownership record"
                      : a.route_id.replaceAll("_", " ")}{" "}
                    <span className="agreement-status">
                      {a.route_id === "existing" && a.status === "active"
                        ? "Recorded"
                        : a.status}
                    </span>
                  </h4>
                  <p>
                    {area(a.covered_area)} included · Holder:{" "}
                    {party(a.holder_id)} · Operator: {party(a.operator_id)}
                  </p>
                  <p>
                    {a.start === null
                      ? "Not effective"
                      : `${a.route_id === "existing" ? "Recorded at" : "Starts"} year ${year(a.start)}`}{" "}
                    ·{" "}
                    {a.end === null
                      ? "No expiry recorded"
                      : `Ends year ${year(a.end)}`}
                  </p>
                  <details>
                    <summary>
                      {a.route_id === "existing"
                        ? "Ownership information and permissions"
                        : "Contract terms, permissions and evidence"}
                    </summary>
                    <p>{a.instrument}</p>
                    <p>
                      Upfront: {money(a.upfront)} · Annual access:{" "}
                      {money(a.annual_payment)} · Deposit held:{" "}
                      {money(a.deposit_held)}
                    </p>
                    <p>
                      Restoration: {a.allow_restoration} · Monitoring:{" "}
                      {a.allow_monitoring} · Public visits: {a.allow_public} ·
                      Permits: {a.permits.replaceAll("_", " ")}
                    </p>
                    <p>
                      Evidence: {a.evidence.replaceAll("_", " ")} — not legal
                      verification.
                    </p>
                    <p>{a.exit_terms}</p>
                    <p>Source: {a.source}</p>
                  </details>
                </div>
              ))}
            <ul>
              {project.activities
                .filter((a) => a.parcel_id === p.id)
                .map((a) => (
                  <li key={a.id}>
                    {a.title} · {area(a.area)} · completed year {year(a.year)}{" "}
                    (historical record)
                  </li>
                ))}
            </ul>
          </article>
        ))}
      {summary.beyond_horizon.length > 0 && (
        <p className="reason">
          {summary.beyond_horizon.length} maintenance commitment(s) continue
          beyond year 30. The playable horizon does not erase these obligations.
        </p>
      )}
      <details className="land-section">
        <summary>Payment history ({project.payments.length})</summary>
        <ul>
          {project.payments.map((p) => (
            <li key={p.id}>
              Year {year(p.year)} · {p.kind} · {money(p.cash_change)}{" "}
              {p.agreement_id === null ? "" : p.agreement_id}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

export function PreviewStatus({ preview, previewBusy, previewError }) {
  return (
    <p className="preview-status muted" role="status" aria-live="polite">
      {previewBusy
        ? preview
          ? "Updating preview · previous calculation remains visible."
          : "Preparing the first preview…"
        : previewError
          ? preview
            ? "Draft needs attention · previous calculation is not current."
            : "Draft needs attention before a preview is available."
          : preview
            ? "Preview up to date."
            : "Complete the configuration to preview."}
    </p>
  );
}

export function Outcome({ preview, previewBusy, previewError, onRetry, busy, ready, showStatus = true }) {
  return (
    <>
      {showStatus && <PreviewStatus preview={preview} previewBusy={previewBusy} previewError={previewError} />}
      {previewError && (
        <div className="error" role="alert">
          <p>{previewError}</p>
          <button type="button" disabled={busy || previewBusy} onClick={onRetry}>
            Retry preview
          </button>
        </div>
      )}
      {preview && (
        <div className="preview" aria-busy={previewBusy}>
          <span className="eyebrow">Configured result · preview</span>
          <p>{preview.explanation}</p>
          <dl>
            <div>
              <dt>Time taken</dt>
              <dd>
                {preview.recorded_ownership
                  ? "No simulation time"
                  : `${year(preview.duration)} years`}
              </dd>
            </div>
            <div>
              <dt>
                {preview.recorded_ownership
                  ? "Recorded at"
                  : "Action completes at"}
              </dt>
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
            {preview.summary && (
              <>
                <div>
                  <dt>Active access after</dt>
                  <dd>{area(preview.summary.active_area)}</dd>
                </div>
                <div>
                  <dt>Future rent to year 30</dt>
                  <dd>{money(preview.summary.future_rent_to_horizon)}</dd>
                </div>
                <div>
                  <dt>Remaining maintenance</dt>
                  <dd>
                    {money(preview.summary.remaining_maintenance_commitment)}
                  </dd>
                </div>
                {preview.summary.future_rent_after_horizon > 0 && (
                  <div>
                    <dt>Access fees after year 30</dt>
                    <dd>{money(preview.summary.future_rent_after_horizon)}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
          {preview.agreements && (
            <AccessTimeline
              agreements={preview.timeline_agreements}
              parcels={preview.parcels}
              parties={preview.parties}
              currentYear={preview.end_year}
              obligations={preview.obligations}
              preview
              title="Proposed access and commitments"
            />
          )}
          {preview.summary?.beyond_horizon.length > 0 && (
            <p className="reason">Maintenance continues beyond year 30.</p>
          )}
          {preview.payments?.length > 0 && (
            <details>
              <summary>Payments during this action</summary>
              <ul>
                {preview.payments.map((p) => (
                  <li key={p.id}>
                    Year {year(p.year)} · {p.kind} · {money(p.cash_change)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <button
        className="primary commit"
        disabled={busy || previewBusy || !preview || !ready}
      >
        Commit decision →
      </button>
      <small className="muted">
        Changes are applied only after Python validates and autosaves them.
      </small>
    </>
  );
}
