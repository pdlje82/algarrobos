import React from "react";
import {validateResearchRecord} from "./irrigationResearchState.js";

const LABELS={supported:"Supported within stated context",conditional:"Conditional candidate",unsuitable:"Unsuitable within stated context",not_assessed:"Not assessed",manufacturer_documented:"Manufacturer documents refill",field_reported_with_modification:"Field refill reported; modification may be required",development_required:"Development required",component_only:"Component documented; complete water integration unverified",manual_service:"Manual service assumption",hypothetical_integration:"Hypothetical integration",biodegradable_paper:"Biodegradable paper reservoir",reusable_polypropylene:"Reusable polypropylene comparator"};
function label(id){if(!Object.hasOwn(LABELS,id))throw Error(`Unsupported irrigation research status ${id}. Refresh the Explorer after restoring compatible data.`);return LABELS[id];}
export function IrrigationResearchRecord({adapter,value}){
  const v=validateResearchRecord(adapter,value);
  return <section className="irrigation-research-record" aria-label="Structured irrigation research"><p>{v.summary}</p>
    {adapter==="irrigation_profile"&&<><h3>Reservoir suitability</h3><table><thead><tr><th>Reservoir</th><th>Assessment</th><th>Conditions and evidence limits</th></tr></thead><tbody>{Object.entries(v.reservoir_assessments).map(([id,a])=><tr key={id}><th>{id}</th><td>{label(a.status)}</td><td>{a.reason}</td></tr>)}</tbody></table>
      <h3>Supplemental establishment water</h3>{v.water_demand.status==="not_established"?<p><strong>Daily requirement not established.</strong> No numerical default is available.</p>:<p>Reviewed range: {v.water_demand.low_l_day}–{v.water_demand.high_l_day} L/plant/day; central estimate {v.water_demand.central_l_day}.</p>}<p>{v.water_demand.context}</p><p><strong>Nursery fit not established.</strong> {v.nursery_fit.context}</p></>}
    {adapter==="reservoir_system"&&<p><strong>{label(v.material)}.</strong> {label(v.refill_status)}. Drone interface: {label(v.drone_interface_status)}.</p>}
    {(adapter==="drone_platform"||adapter==="drone_base")&&<p><strong>{label(v.integration_status)}.</strong></p>}
    {adapter==="research_topic"&&<p><strong>{v.work_package}: reviewed with gaps.</strong> Remaining questions are listed below.</p>}
    {(adapter==="research_scenario"||adapter==="cluster_template")&&<p><strong>Prepared for review; not adopted.</strong> Reading this record does not activate a simulator or change saved designs.</p>}
    {adapter==="research_scenario"&&<><h3>Inputs still required before simulation</h3><ul>{v.required_inputs.map(s=><li key={s}>{s}</li>)}</ul></>}
    {adapter==="cluster_template"&&<><p>Existing palette: {v.source_palette}. Candidate species: {v.species_ids.join(", ")}. Numerical spacing remains subject to central-rule and servicing review.</p><ul>{v.placement_requirements.map(s=><li key={s}>{s}</li>)}</ul></>}
    {Object.keys(v.facts).length>0&&<><h3>Reported values and explicit assumptions</h3><table><thead><tr><th>Quantity</th><th>Value</th><th>Basis and context</th></tr></thead><tbody>{Object.entries(v.facts).map(([id,f])=><tr key={id}><th>{f.label}</th><td>{f.value} {f.unit}</td><td>{f.basis.replaceAll("_"," ")}: {f.context}</td></tr>)}</tbody></table></>}
    {v.web_sources.length>0&&<><h3>Supplementary web evidence</h3>{v.web_sources.map(w=><article key={w.url}><p><a href={w.url} target="_blank" rel="noreferrer">{w.title}</a> · checked {w.checked_on}</p><p>{w.finding}</p><p>{w.limitation}</p></article>)}</>}
    {v.open_questions.length>0&&<><h3>Open research and development questions</h3><ul>{v.open_questions.map(q=><li key={q}>{q}</li>)}</ul></>}
  </section>;
}
