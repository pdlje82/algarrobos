import React, { useEffect, useRef, useState } from "react";
import { area, money, year } from "./format.js";

export function ParcelRemoval({
  parcel,
  revision,
  busy,
  onPreview,
  onConfirm,
}) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const button = useRef();
  const heading = useRef();
  useEffect(() => {
    setImpact(null);
    setLoading(false);
    setError("");
    return () => {
      request.current += 1;
    };
  }, [revision]);
  useEffect(() => {
    if (impact) heading.current?.focus();
  }, [impact]);
  async function preview() {
    const token = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await onPreview(parcel.id);
      if (!Array.isArray(result.removed_actions)) {
        throw new Error(
          "Restart the Python backend to load exploration deletion, then reload the saved project.",
        );
      }
      if (request.current === token) setImpact(result);
    } catch (e) {
      if (request.current === token) setError(e.message);
    } finally {
      if (request.current === token) setLoading(false);
    }
  }
  function cancel() {
    request.current += 1;
    setImpact(null);
    setLoading(false);
    setError("");
    button.current?.focus();
  }
  return (
    <div className="parcel-removal">
      <button
        ref={button}
        type="button"
        className="remove-parcel"
        disabled={busy || loading}
        aria-label={`Delete parcel… ${parcel.name}`}
        aria-expanded={!!impact}
        onClick={preview}
      >
        Delete parcel…
      </button>
      {loading && (
        <p role="status">Checking this parcel’s plans and commitments…</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {impact && (
        <section
          className="parcel-removal-preview"
          aria-labelledby={`removal-${parcel.id}`}
        >
          <h4 ref={heading} tabIndex={-1} id={`removal-${parcel.id}`}>
            {impact.title}: {impact.name}
          </h4>
          <p>
            {area(impact.area)} total parcel area · Edit exploration choices
          </p>
          <p>{impact.explanation}</p>
          {impact.deleted_parcels.length > 1 && (
            <ul>
              {impact.deleted_parcels.map((p, index) => (
                <li key={index}>
                  {p.name} · {area(p.area)} will be deleted
                </li>
              ))}
            </ul>
          )}
          <details open>
            <summary>
              Choices to delete ({impact.removed_actions.length})
            </summary>
            <ul>
              {impact.removed_actions.map((a, index) => (
                <li key={index}>
                  <strong>{a.title}</strong> · year {year(a.year)}
                  <br />
                  {a.reason}
                </li>
              ))}
            </ul>
          </details>
          <dl className="removal-costs">
            <div>
              <dt>Cash after rebuilding</dt>
              <dd>{money(impact.cash_after)}</dd>
            </div>
            <div>
              <dt>Cash adjustment</dt>
              <dd>{money(impact.cash_change)}</dd>
            </div>
            <div>
              <dt>Project year before → after</dt>
              <dd>
                {year(impact.year_before)} → {year(impact.year_after)}
              </dd>
            </div>
          </dl>
          <p>
            {impact.remaining_parcels} parcel
            {impact.remaining_parcels === 1 ? "" : "s"} and{" "}
            {impact.remaining_actions} simulation action
            {impact.remaining_actions === 1 ? "" : "s"} will remain. Cash and
            time are recalculated; this is not a sale or an end-access decision.
          </p>
          <p className="muted">{impact.undo_notice}</p>
          <div className="form-actions">
            <button
              type="button"
              className="remove-parcel"
              disabled={busy}
              onClick={() => onConfirm(impact)}
            >
              Confirm deletion
            </button>
            <button type="button" disabled={busy} onClick={cancel}>
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
