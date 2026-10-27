import React, { useEffect, useRef, useState } from "react";
import { money, year } from "./format.js";

export function Fields({ fields, inputs, onChange, disabled }) {
  return (
    <div className="field-grid">
      {fields
        .filter((f) => !f.hidden)
        .map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`field-${f.name}`}>{f.label}</label>
            {f.type === "select" ? (
              <select
                id={`field-${f.name}`}
                value={inputs[f.name] ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...inputs, [f.name]: e.target.value })
                }
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                    {o.remaining_area !== undefined
                      ? ` · ${o.remaining_area} ha remaining`
                      : ""}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                id={`field-${f.name}`}
                maxLength={f.maxLength}
                value={inputs[f.name] ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...inputs, [f.name]: e.target.value })
                }
              />
            ) : (
              <input
                id={`field-${f.name}`}
                type={f.type}
                value={inputs[f.name] ?? ""}
                disabled={disabled}
                min={f.min}
                max={f.max}
                step={f.step ?? "any"}
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
                Leave blank for Unknown; proposals can retain unresolved terms.
              </small>
            )}
            {f.help && <small className="muted">{f.help}</small>}
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
    action.fields[0]?.default || "",
  );
  const proposal = data.project.agreements.find((a) => a.id === agreementId);
  const [routeId, setRouteId] = useState("");
  const [parcelId, setParcelId] = useState("new");
  const [compare, setCompare] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const drafts = useRef({});
  const selectedRoute = finalising ? proposal?.route_id : routeId;
  const selectedParcel = finalising ? proposal?.parcel_id : parcelId;
  const key = `${selectedRoute}/${selectedParcel}/${finalising ? agreementId : "new"}`;
  const routes = data.land_access?.routes || [];
  const chosen = routes.find((r) => r.id === selectedRoute);
  useEffect(() => {
    onReady(false);
    setError("");
    setForm(null);
    onChange({});
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
        onChange(drafts.current[key] || initial);
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
  ]);
  function edit(next) {
    drafts.current[key] = next;
    onChange(next);
  }
  const siteNames = new Set([
    "location",
    "cadastral_reference",
    "current_use",
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
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {chosen && (
        <div className="selected-route">
          <h3>Selected: {chosen.title}</h3>
          <p>{chosen.caveat}</p>
        </div>
      )}
      {selectedRoute && !form && !error && (
        <p role="status">Loading configuration from Python…</p>
      )}
      <div className="land-detail-grid">
        <div>
          {form && (
            <>
              <h3>Parcel, parties and status</h3>
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
              <details className="land-section">
                <summary>Site details and unresolved restrictions</summary>
                <Fields
                  fields={form.fields.filter((f) => siteNames.has(f.name))}
                  inputs={inputs}
                  onChange={edit}
                  disabled={busy}
                />
                {!form.fields.some((f) => siteNames.has(f.name)) && (
                  <p>
                    Existing parcel metadata is retained. Ownership changes only
                    on a concluded transfer.
                  </p>
                )}
              </details>
              <details className="land-section" open>
                <summary>Costs, duration and continuing maintenance</summary>
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
                  <a href={form.source_url} target="_blank" rel="noreferrer">
                    Open source document
                  </a>{" "}
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

function PeriodBar({ start, end, label }) {
  const left = Math.max(0, Math.min(100, (start / 30) * 100));
  const right = Math.max(left, Math.min(100, ((end ?? 30) / 30) * 100));
  return (
    <div className="rights-period">
      <div className="rights-track">
        <span style={{ left: `${left}%`, width: `${right - left}%` }} />
      </div>
      <small>
        {label}: year {year(start)} →{" "}
        {end === null ? "no configured expiry" : year(end)}
        {end > 30 ? " (continues beyond horizon)" : ""}
      </small>
    </div>
  );
}

export function AccessTimeline({
  agreements,
  obligations = [],
  title = "Access and commitments",
  preview = false,
}) {
  if (!agreements.length && !obligations.length) return null;
  return (
    <section
      className={`access-timeline ${preview ? "draft-timeline" : ""}`}
      aria-label={title}
    >
      <h3>
        {title}
        {preview ? " · hypothetical preview" : ""}
      </h3>
      <div className="rights-axis">
        <span>Year 0</span>
        <span>Year 15</span>
        <span>Year 30</span>
      </div>
      {agreements.map((a) => (
        <div className="rights-row" key={a.id}>
          <strong>
            {a.id} · {a.route_id.replaceAll("_", " ")}
          </strong>
          <span className="agreement-status">{a.status}</span>
          {a.status === "pending" ? (
            <p className="muted">Proposal only — no effective access period.</p>
          ) : (
            a.periods.map((p, i) => (
              <PeriodBar
                key={i}
                start={p.start}
                end={p.end}
                label={a.parcel_id}
              />
            ))
          )}
        </div>
      ))}
      {obligations.map((o) => (
        <div className="rights-row maintenance-row" key={o.id}>
          <strong>{o.agreement_id} · maintenance commitment</strong>
          <PeriodBar
            start={o.start}
            end={o.end}
            label={money(o.annual_amount) + " / year"}
          />
        </div>
      ))}
    </section>
  );
}

export function LandRecords({ project, summary }) {
  const party = (id) => project.parties.find((p) => p.id === id)?.name || id;
  return (
    <>
      <div className="land-totals">
        <p>
          <strong>{summary.owned_area} ha</strong> owned by you / your
          organisations
        </p>
        <p>
          <strong>{summary.active_area} ha</strong> currently accessible
        </p>
        <p>
          <strong>{summary.restored_area} ha</strong> historical restoration
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
      {project.parcels.map((p) => (
        <article className="parcel" key={p.id}>
          <h3>
            {p.name}
            <span>{p.area} ha total</span>
          </h3>
          <p>
            Owner: {party(p.owner_id)} · {p.location}
          </p>
          <small>
            Ownership acquisition expenditure: {money(p.acquisition_cost)}; no
            market valuation.
          </small>
          <details>
            <summary>Site record</summary>
            <p>
              Use: {p.current_use} · Physical access: {p.physical_access}
            </p>
            <p>Cadastral reference: {p.cadastral_reference || "Unknown"}</p>
            <p>{p.restrictions}</p>
          </details>
          {project.agreements
            .filter((a) => a.parcel_id === p.id)
            .map((a) => (
              <div className="agreement-record" key={a.id}>
                <h4>
                  {a.id} · {a.route_id.replaceAll("_", " ")}{" "}
                  <span className="agreement-status">{a.status}</span>
                </h4>
                <p>
                  {a.covered_area} ha covered · Holder: {party(a.holder_id)} ·
                  Operator: {party(a.operator_id)}
                </p>
                <p>
                  {a.start === null
                    ? "Not effective"
                    : `Starts year ${year(a.start)}`}{" "}
                  ·{" "}
                  {a.end === null
                    ? "No effective expiry date"
                    : `Ends year ${year(a.end)}`}
                </p>
                <details>
                  <summary>Contract terms, permissions and evidence</summary>
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
                  {a.title} · {a.area} ha · completed year {year(a.year)}{" "}
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
              {p.agreement_id || ""}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

export function Outcome({ preview, previewBusy, previewError, busy, ready }) {
  return (
    <>
      {previewBusy && <p role="status">Calculating preview in Python…</p>}
      {previewError && (
        <p className="error" role="alert">
          {previewError}
        </p>
      )}
      {preview && (
        <div className="preview" aria-live="polite">
          <span className="eyebrow">Configured result · preview</span>
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
            {preview.summary && (
              <>
                <div>
                  <dt>Active access after</dt>
                  <dd>{preview.summary.active_area} ha</dd>
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
              agreements={preview.agreements}
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
