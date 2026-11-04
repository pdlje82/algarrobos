// Display contract only; no ecological defaults or simulator calculations.
export const RESEARCH_ADAPTERS=new Set(["irrigation_profile","reservoir_system","drone_platform","drone_base","research_topic","research_scenario","cluster_template"]);
const COMMON=["title","summary","citation_ids","limitations","facts","open_questions","web_sources"];
const EXTRA={irrigation_profile:["species_id","reservoir_assessments","water_demand","nursery_fit"],reservoir_system:["material","refill_status","drone_interface_status"],drone_platform:["integration_status"],drone_base:["integration_status"],research_topic:["work_package","research_status"],research_scenario:["adoption","inputs","required_inputs","cluster_ids","reservoir_id","aircraft_id","base_id"],cluster_template:["adoption","source_palette","species_ids","spacing_policy","placement_requirements"]};
const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const text=v=>typeof v==="string"&&v.trim()!=="";
const strings=v=>Array.isArray(v)&&v.every(text)&&new Set(v).size===v.length;
const keys=(v,names)=>object(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
export function validateResearchRecord(adapter,v){
  const need=(ok,field)=>{if(!ok)throw Error(`Irrigation research is incompatible at ${field}. Restore the reviewed data, restart Python and refresh the Explorer. No values were substituted.`);};
  need(RESEARCH_ADAPTERS.has(adapter),"adapter");
  need(keys(v,[...COMMON,...EXTRA[adapter]])&&text(v.title)&&text(v.summary)&&strings(v.citation_ids)&&strings(v.limitations)&&v.limitations.length>0&&strings(v.open_questions)&&object(v.facts)&&Array.isArray(v.web_sources),"record fields");
  for(const f of Object.values(v.facts))need(keys(f,["label","value","unit","basis","context","citation_ids"])&&text(f.label)&&text(f.unit)&&text(f.context)&&Number.isFinite(f.value)&&f.value>=0&&["manufacturer","field_observation","historical_price","project_assumption"].includes(f.basis)&&strings(f.citation_ids)&&f.citation_ids.every(id=>v.citation_ids.includes(id))&&(f.citation_ids.length>0)===(f.basis!=="project_assumption"),"fact");
  for(const w of v.web_sources)need(keys(w,["title","url","checked_on","finding","limitation"])&&Object.values(w).every(text)&&w.url.startsWith("https://")&&/^\d{4}-\d{2}-\d{2}$/.test(w.checked_on)&&!Number.isNaN(Date.parse(w.checked_on))&&new Date(w.checked_on).toISOString().slice(0,10)===w.checked_on,"web evidence");
  if(adapter==="irrigation_profile"){
    need(text(v.species_id)&&object(v.reservoir_assessments)&&Object.keys(v.reservoir_assessments).length>0,"plant identity/assessments");
    for(const a of Object.values(v.reservoir_assessments))need(keys(a,["status","reason","citation_ids"])&&["supported","conditional","unsuitable","not_assessed"].includes(a.status)&&text(a.reason)&&strings(a.citation_ids)&&a.citation_ids.every(id=>v.citation_ids.includes(id))&&(a.status==="not_assessed"||a.citation_ids.length>0),"suitability");
    const w=v.water_demand;
    need(keys(w,["status","low_l_day","central_l_day","high_l_day","context","citation_ids"])&&text(w.context)&&strings(w.citation_ids)&&w.citation_ids.every(id=>v.citation_ids.includes(id)),"water demand fields");
    const range=[w.low_l_day,w.central_l_day,w.high_l_day];
    need(w.status==="not_established"?range.every(n=>n===null):w.status==="reviewed_range"&&range.every(n=>Number.isFinite(n)&&n>=0)&&range[0]<=range[1]&&range[1]<=range[2]&&w.citation_ids.length>0,"water demand status/range");
    need(keys(v.nursery_fit,["status","context"])&&v.nursery_fit.status==="not_established"&&text(v.nursery_fit.context),"nursery fit");
  }
  if(adapter==="research_scenario"||adapter==="cluster_template")need(v.adoption==="prepared_not_adopted","adoption");
  if(adapter==="research_scenario")need(object(v.inputs)&&Object.keys(v.inputs).length>0&&Object.entries(v.inputs).every(([k,n])=>Number.isFinite(n)&&Object.hasOwn(v.facts,k)&&v.facts[k].basis==="project_assumption"&&v.facts[k].value===n)&&strings(v.required_inputs)&&v.required_inputs.length>0&&strings(v.cluster_ids)&&[v.reservoir_id,v.aircraft_id,v.base_id].every(text),"scenario inputs");
  if(adapter==="cluster_template")need(text(v.source_palette)&&strings(v.species_ids)&&v.species_ids.length>0&&v.spacing_policy==="reference_current_designer_rules_then_review_access"&&strings(v.placement_requirements)&&v.placement_requirements.length>0,"cluster references");
  if(adapter==="research_topic")need(/^R([1-9]|10|11)$/.test(v.work_package)&&v.research_status==="reviewed_with_gaps","work package status");
  if(adapter==="reservoir_system")need(["biodegradable_paper","reusable_polypropylene"].includes(v.material)&&["manufacturer_documented","field_reported_with_modification"].includes(v.refill_status)&&v.drone_interface_status==="development_required","reservoir status");
  if(adapter==="drone_platform"||adapter==="drone_base")need(["component_only","manual_service","hypothetical_integration"].includes(v.integration_status),"integration status");
  return v;
}
