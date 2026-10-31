import React from "react";
import {area,year} from "./format.js";
import {required} from "./contracts.js";

export function DemonstratorContext({planning,inputs,onParcel,onDesign}){
  required(planning!==null&&planning.context!==undefined,"Missing demonstrator context. Restart Python and reload.");
  const {parcel,design,municipality_conflict,planning_municipality,notice}=planning.context;
  return <section className="demo-context-summary" aria-label="Demonstrator parcel and design context">
    <dl><dt>Linked parcel</dt><dd>{parcel===null?"Unresolved — link a parcel in Site Designer":<><button type="button" onClick={()=>onParcel(parcel.id)}>{parcel.name}</button> · {parcel.municipality} · {area(parcel.area)} total</>}</dd>
      <dt>Planned intervention</dt><dd>{inputs.restoration_area===null||inputs.restoration_area===""?"Area unresolved":area(inputs.restoration_area)} · {planning.committed?"Committed plan":"Planning draft"}</dd>
      <dt>Transferred site design</dt><dd>{design===null?"No design transferred":<><button type="button" disabled={design.status==="missing"} onClick={()=>onDesign({designId:design.id})}>{design.name}</button>{design.status==="changed"&&<strong> · Design changed since transfer</strong>}{design.status==="missing"&&<strong> · Source design deleted; transferred snapshot retained</strong>}</>}</dd>
      <dt>Recorded owner</dt><dd>{parcel===null?"Unresolved":parcel.owner}</dd><dt>Recorded land access</dt><dd>{parcel?.access==null?"Unresolved — no agreement recorded":<>{parcel.access.route} · {parcel.access.status} · Operator: {parcel.access.operator} · Simulation year {year(parcel.access.start)}{parcel.access.end===null?" · no recorded expiry":` → ${year(parcel.access.end)}`}{parcel.access.status!=="active"&&<strong> · Access is not currently active</strong>}</>}</dd>
    </dl>
    {municipality_conflict&&<p className="reason">The planning municipality ({planning_municipality}) differs from the parcel record ({parcel.municipality}). New parcel-linked funding baselines use the recorded parcel location; review any scenario override separately.</p>}
    <small>{notice} Funding exploration assumptions do not change these records.</small>
    {design!==null&&<p className="muted">Planning uses a transferred snapshot. Changes in Site Designer require another reviewed “Use design in planning” transfer.</p>}
  </section>;
}
