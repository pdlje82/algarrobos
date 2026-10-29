import React, { useEffect, useRef, useState } from "react";

const display = value => Number(value.toFixed(4)).toString();

export function DensityControl({ row, label, onDensity, onStep, disabled }) {
  const [text, setText] = useState(display(row.requested_density));
  const touched = useRef(false);
  useEffect(() => { setText(display(row.requested_density)); touched.current = false; }, [row.requested_density]);
  function commit() {
    if (!touched.current) return;
    touched.current = false;
    onDensity(text === "" ? null : Number(text));
  }
  return <div className="density-control">
    <label>Plants/ha <span className="sr-only">for {label}</span>
      <div className="density-input"><input type="number" min="0" max="1000000" step="any" aria-label={`Plants/ha for ${label}`} value={text} disabled={disabled}
        onChange={e => { setText(e.target.value); touched.current = true; }} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}/>
      <span className="density-arrows"><button type="button" disabled={disabled} aria-label={`Add one ${label}`} onClick={() => onStep(1)}>▲</button><button type="button" disabled={disabled} aria-label={`Remove one ${label}`} onClick={() => onStep(-1)}>▼</button></span></div>
    </label>
    <small>{row.quantity} {row.quantity === 1 ? "plant" : "plants"} at this area · {display(row.effective_density)}/ha</small>
    {Math.abs(row.requested_density - row.effective_density) > 0.000001 && <small>Requested {display(row.requested_density)}/ha; rounded to whole plants.</small>}
    <small>Each arrow: one plant ({display(row.density_step)}/ha).</small>
  </div>;
}
