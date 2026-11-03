import React,{createContext,useContext,useEffect,useMemo,useState,useSyncExternalStore} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {createEvidenceStore} from "./knowledgeEvidenceState.js";
import "./KnowledgeEvidence.css";

const Evidence=createContext(null);
export function KnowledgeEvidenceProvider({request,children}){
  const store=useMemo(()=>createEvidenceStore(request),[request]);
  useEffect(()=>()=>store.dispose(),[store]);
  return <Evidence.Provider value={store}>{children}</Evidence.Provider>;
}
function Sources({evidence}){
  return <ul className="knowledge-evidence-sources">{evidence.map(s=><li key={s.citation_id}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink><small> · PDF page {s.page} · verified {s.verified_on}</small></li>)}</ul>;
}
function Limitations({values}){return values.length>0?<ul className="knowledge-limitations">{values.map(v=><li key={v}>{v}</li>)}</ul>:null;}
function Assumption({binding}){
  const current=binding.value;
  return <div className="knowledge-assumption"><strong>Current reference assumption</strong>
    {binding.adapter==="carob_density"?<p>Illustrative carob starting density: <strong>{current.value} plants per hectare</strong>.</p>:<>
      <p>Sketch island width × length: <strong>{current.value.rainfall_capture.island_width} × {current.value.rainfall_capture.island_depth} m</strong>. These are drawing dimensions, not excavation or planting depth.</p>
      <p>Illustrative centres, as percentages of zone width and length: {current.value.mr2_centres.map(([x,y])=>`${x*100}%, ${y*100}%`).join("; ")}.</p>
    </>}
    <p>Current rules: {current.ruleset_id}. This reference does not replace your design’s retained assumptions or entered values.</p>
  </div>;
}
const GROUPS=[["official_requirement","Official requirements"],["official_strategy","Strategy context"],["guidance","Source guidance"],["project_assumption","Project assumptions"],["research_gap","Evidence gaps"]];
function Content({value,context,savedDesign}){
  const label=id=>context.entities.find(e=>e.id===id).label;
  return <>
    <p className="knowledge-evidence-scope">Current pilot reference information · reviewed {value.reviewed_on}. Coverage is limited to registered pilot connections. Reading does not select claims, award points or adopt rules.</p>
    {savedDesign!==null&&<div className="knowledge-saved-rules"><p>Your design retains rules {savedDesign.ruleset}. {savedDesign.density===null?"This historical design has no saved starting-density defaults; its recorded counts remain authoritative.":`Saved carob starting assumption: ${savedDesign.density} plants per hectare.`}</p><p>{savedDesign.geometry===null?"This historical design has no saved rainfall-capture sketch dimensions.":`Saved sketch island width × length: ${savedDesign.geometry.width} × ${savedDesign.geometry.length} m.`} Current references below are separate from your saved values and current plant quantities.</p></div>}
    {context.issues.length>0&&<section className="knowledge-open-issues" aria-label="Unresolved evidence"><h4>Unresolved evidence ({context.issues.length})</h4>{context.issues.map(i=><div key={i.id}><p><strong>{i.type==="source_tension"?"Source tension":"Evidence gap"}</strong> · {i.explanation}</p><Limitations values={i.limitations}/></div>)}</section>}
    {GROUPS.map(([kind,title])=>{const claims=context.claims.filter(c=>c.evidence_kind===kind);return claims.length>0?<section key={kind} aria-label={title}><h4>{title}</h4>{claims.map(c=><article key={c.id} data-knowledge-claim={c.id}><p><strong>{c.review_status==="unresolved"?"Unresolved · ":""}</strong>{c.statement}</p><p className="knowledge-context">{c.context} · reviewed {c.reviewed_on}</p><Limitations values={c.limitations}/>{c.configuration_values.map(b=><Assumption key={b.id} binding={b}/>)}<Sources evidence={c.evidence}/></article>)}</section>:null;})}
    {context.entities.some(e=>e.type==="funding_call")&&<section><h4>Published call context</h4>{context.entities.filter(e=>e.type==="funding_call").map(e=><div key={e.id}><p>{e.label}</p><p><strong>Current availability: not assessed.</strong></p><Limitations values={e.limitations}/><Sources evidence={e.evidence}/></div>)}</section>}
    {context.entities.filter(e=>e.type==="example_activity").map(e=><section key={e.id}><h4>Illustrative activity</h4><p>{e.label}</p><p>{e.authority.value.description}</p><Limitations values={e.limitations}/></section>)}
    {context.relations.length>0&&<details><summary>Registered connections</summary>{context.relations.map(r=><div key={r.id}><p><strong>{label(r.source)} → {label(r.target)}</strong></p><p>{r.context} {r.basis==="project_assumption"&&"Illustrative project association."}</p><Limitations values={r.limitations}/><Sources evidence={r.evidence}/></div>)}</details>}
    <details><summary>Evidence provenance and coverage</summary><p>Dataset {value.dataset_id} · {value.dataset_hash}</p><p>Feature registration {value.consumer_registry_hash}</p><p>Native display binding: {context.binding.native_id} · {context.binding.authority.file}</p><ul>{value.coverage.excluded.map(s=><li key={s}>{s}</li>)}</ul></details>
  </>;
}
export function KnowledgeEvidence({consumer,contextId,label,savedDesign=null}){
  const store=useContext(Evidence),[open,setOpen]=useState(false);
  if(store===null)throw Error("Current evidence requires its provider.");
  const state=useSyncExternalStore(store.subscribe,()=>store.get(consumer));
  useEffect(()=>open?store.watch(consumer):undefined,[store,consumer,open]);
  const context=state.value===null?null:state.value.contexts[contextId];
  return <details className="knowledge-evidence" data-evidence-context={`${consumer}/${contextId}`} onToggle={e=>{if(e.target===e.currentTarget)setOpen(e.currentTarget.open);}}><summary>Current evidence · {label}</summary>
    {open&&<div role="region" aria-label={`Current evidence: ${label}`}>
      {state.status==="error"?<div role="alert"><p>{state.error}</p><button type="button" onClick={()=>store.refresh(consumer)}>Retry current evidence</button></div>:state.status!=="ready"?<p role="status">Loading current evidence…</p>:context===undefined?<div role="alert"><p>Evidence context {contextId} is unavailable. Check the feature registration and reload the app.</p><button type="button" onClick={()=>store.refresh(consumer)}>Retry current evidence</button></div>:<><button type="button" onClick={()=>store.refresh(consumer)}>Refresh current evidence</button><Content value={state.value} context={context} savedDesign={savedDesign}/></>}
    </div>}
  </details>;
}
