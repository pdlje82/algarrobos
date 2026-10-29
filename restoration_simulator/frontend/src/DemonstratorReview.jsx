import React,{useEffect,useRef} from "react";
import {money,year} from "./format.js";
import {Alert} from "./Alert.jsx";

export function DemonstratorReview({review,previous,busy,error,onClose,onCommit}){
  const ref=useRef(null);
  useEffect(()=>{const origin=document.activeElement,node=ref.current;node.showModal();return()=>{node.close();if(origin instanceof HTMLElement&&origin.isConnected)origin.focus({preventScroll:true});};},[]);
  const d=review.preview.demonstrator;
  return <dialog ref={ref} className="designer-library-dialog demonstrator-review" aria-labelledby="demonstrator-review-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <h2 id="demonstrator-review-title">Review demonstrator plan</h2>
    <p>{d.parcel_name} · {d.plan.restoration_area} m² · {d.plan.trees} trees · {d.plan.shrubs} shrubs / grasses</p>
    <p>Planned budget: <strong>{money(d.budget.total)}</strong>. This action costs {money(review.preview.cost)}, finishes at year {year(review.preview.end_year)} and leaves {money(review.preview.cash_after)}.</p>
    <table className="demo-budget"><caption>Configured budget</caption><tbody>{d.budget.rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{money(row.amount)}</td></tr>)}<tr><th scope="row">Follow-up monitoring</th><td>{money(d.budget.monitoring)}</td></tr><tr><th scope="row">Evaluation / sharing</th><td>{money(d.budget.reporting)}</td></tr></tbody></table>
    <p>Planting duration: {year(d.plan.installation_years)} years. Follow-up: {year(d.plan.followup_years)} years after planting.</p>
    {previous!==null&&<Alert variant="warning" title="Replace existing demonstrator plan">Committing replaces the current plan and resets baseline and funding preparation according to the existing planning workflow.</Alert>}
    <details><summary>Settings being committed</summary><dl>{Object.entries(review.inputs).filter(([k])=>k!=="plant_selection").map(([k,v])=><React.Fragment key={k}><dt>{k.replaceAll("_"," ")}</dt><dd>{String(v)}</dd></React.Fragment>)}</dl></details>
    <p>{review.preview.explanation}</p>
    {error!==""&&<Alert variant="error" title="Commit failed">{error}</Alert>}
    <div className="designer-dialog-actions"><button type="button" disabled={busy} onClick={onCommit}>Commit demonstrator plan</button><button type="button" disabled={busy} onClick={onClose}>Keep editing</button></div>
  </dialog>;
}
