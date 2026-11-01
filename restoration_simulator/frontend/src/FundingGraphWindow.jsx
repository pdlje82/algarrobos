import React from "react";
import {FUNDING_GRAPH_COLUMNS} from "./fundingLayout.js";

export function FundingColumnControls({view,hasProgramme,onReset}){
  const {layout,start}=view;
  return <div className="funding-column-controls" aria-label="Funding graph columns">
    <label>Column view<select aria-label="Column view" value={view.preference} onChange={e=>view.changePreference(e.target.value,hasProgramme?3:1)}><option value="auto">Auto</option><option value="3">3 columns</option><option value="4">4 columns</option></select></label>
    <button type="button" aria-label="Previous columns" disabled={start===0} onClick={()=>view.pan(-1)}>← Previous columns</button>
    <button type="button" aria-label="Next columns" disabled={start===layout.maxStart} onClick={()=>view.pan(1)}>Next columns →</button>
    <span role="status" aria-label="Visible funding columns">Columns {start+1}–{start+layout.count} of 4 · {FUNDING_GRAPH_COLUMNS[start].label} → {FUNDING_GRAPH_COLUMNS[start+layout.count-1].label}{view.preference!=="auto"&&layout.count<Number(view.preference)?` · ${layout.count} fit at this width`:""}</span>
    {layout.count>1&&<button type="button" onClick={onReset}>Reset column widths</button>}
  </div>;
}
export function FundingContinuationMarkers({markers,onReveal,hiddenLeft,hiddenRight}){
  return <div className="funding-continuations" aria-label="Connections beyond the visible graph">
    {hiddenLeft&&<span className="funding-edge-fade is-left" aria-hidden="true"/>}{hiddenRight&&<span className="funding-edge-fade is-right" aria-hidden="true"/>}
    {markers.map((m,i)=><button key={`${m.side}-${i}`} type="button" data-continuation-side={m.side} className={`funding-continuation is-${m.side} funding-continuation-${m.statuses.length===1?m.statuses[0]:"mixed"}`} style={{top:m.y-22}} aria-label={`Show ${m.label}: ${m.count} connection(s) continue to the ${m.side}`} title={`${m.label}\n${m.details}`} onClick={()=>onReveal(m.column)}><span aria-hidden="true">{m.side==="left"?"←":"→"}</span><small>{m.count}</small></button>)}
  </div>;
}
