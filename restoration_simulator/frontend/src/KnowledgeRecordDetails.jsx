import React,{useEffect,useMemo,useRef,useState,useSyncExternalStore} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {KnowledgeSources,KnowledgeLimitations,KnowledgeAssumption} from "./KnowledgeEvidence.jsx";
import {ENTITY_TYPES,EVIDENCE_KINDS,createExplorerResource,validateExplorerImpact} from "./knowledgeExplorerState.js";
import "./KnowledgeExplorer.css";
import {RESEARCH_ADAPTERS} from "./irrigationResearchState.js";
import {IrrigationResearchRecord} from "./IrrigationResearchRecord.jsx";

function useResource(request,validate){const resource=useMemo(()=>createExplorerResource(request,validate),[request,validate]);useEffect(()=>()=>resource.dispose(),[resource]);return [useSyncExternalStore(resource.subscribe,resource.get),resource];}
function Claim({claim,onSelect}){
  return <article className="explorer-claim" data-explorer-claim={claim.id}><p><strong>{EVIDENCE_KINDS[claim.evidence_kind]}{claim.review_status==="unresolved"?" · Unresolved":""}</strong></p><p>{claim.statement}</p><p>{claim.context} · reviewed {claim.reviewed_on}</p><KnowledgeLimitations values={claim.limitations}/>{claim.configuration_values.map(b=><KnowledgeAssumption key={b.id} binding={b}/>)}<KnowledgeSources evidence={claim.evidence}/>{onSelect&&<p>{claim.evidence.map(r=><button type="button" key={r.citation_id} onClick={()=>onSelect(r.passage_id)}>Show {r.document_id} page {r.page} in graph</button>)}</p>}</article>;
}
export function Issues({issues,onSelect}){return issues.length>0?<section className="explorer-issues" aria-label="Unresolved evidence"><h3>Unresolved evidence</h3>{issues.map(i=><details key={i.id} open={i.claims.length<=2}><summary>{i.type==="source_tension"?"Source tension":"Evidence gap"}{i.claims.length>2?` · ${i.claims.length} claims`:""}</summary><p>{i.explanation}</p><KnowledgeLimitations values={i.limitations}/>{i.claims.map(c=><Claim key={c.id} claim={c} onSelect={onSelect}/>)}</details>)}</section>:null;}
const CONSUMER_NAMES={selection_guidance:"Selection guidance",project_concept:"Project concepts",delivery_plan:"Delivery planning",designer:"Designer evidence",knowledge_pilot:"Registered knowledge"};
const CONTEXT_NAMES={"route-34":"AL20 3.4","restoration-34":"Restoration context","novelty-34":"Local novelty","publication-34":"Publication commitment",mr2:"MR2 guide",carob:"Carob inspector"};
function WhereUsed({node,graph,request,onRefresh,active}){
  const [open,setOpen]=useState(false),[state,resource]=useResource(request,validateExplorerImpact);
  const path=`knowledge/impact?${new URLSearchParams({target_kind:node.kind,target_id:node.id})}`;
  useEffect(()=>{if(open&&active)resource.load(path,graph,true);return()=>resource.cancel();},[open,active,path,graph.dataset_hash,graph.consumer_registry_hash,resource]);
  return <details onToggle={e=>{if(e.target===e.currentTarget)setOpen(e.currentTarget.open);}}><summary>Where used</summary>{open&&(state.status==="error"?<div role="alert"><p>{state.error}</p><button onClick={()=>resource.load(path,graph,true)}>Retry usage</button><button onClick={onRefresh}>Refresh explorer</button></div>:state.value===null?<p role="status">Loading registered usage…</p>:<>
    <h4>Displays shared evidence</h4>{state.value.feature_dependencies.length===0?<p>No display dependency is registered for this registered target.</p>:<ul>{state.value.feature_dependencies.map((d,i)=><li key={i}>{CONSUMER_NAMES[d.consumer_id]} · {CONTEXT_NAMES[d.context_id]}<details><summary>Dependency path</summary><p>{d.explanation}</p><ol>{d.path.map((p,j)=><li key={j}>{p.kind}: {p.id}</li>)}</ol></details></li>)}</ul>}
    <h4>Checks citation metadata</h4><ul>{state.value.validation_dependencies.map(d=><li key={d.consumer_id}>{CONSUMER_NAMES[d.consumer_id]} · {d.explanation}</li>)}</ul>{state.value.validation_dependencies.length===0&&<p>No citation-validation dependency for this target.</p>}
    <h4>Manual review targets</h4><ul>{state.value.review_targets.map((d,i)=><li key={i}>{d.target.label}<p>{d.explanation}</p></li>)}</ul>{state.value.review_targets.length===0&&<p>No manual review target is registered for this record.</p>}<p>Usage is limited to registered knowledge. Displaying evidence does not change retained rules or saved projects.</p>
  </>)}</details>;
}
export function Inspector({selected,graph,request,onSelect,onCenter,onRefresh,active}){
  if(selected===null)return <p>Select a record or connection to inspect its evidence.</p>;
  const node=graph.nodes.find(n=>n.id===selected),edge=graph.edges.find(e=>e.id===selected);
  if(node===undefined&&edge===undefined)return <p role="alert">The requested record is no longer available. Choose a topic or reset the view.</p>;
  if(edge!==undefined){const d=edge.details;return <><h2>Connection · {edge.label}</h2><p>{graph.nodes.find(n=>n.id===edge.source).label} → {graph.nodes.find(n=>n.id===edge.target).label}</p>{edge.kind==="relationship"?<><p><strong>{d.basis==="project_assumption"?"Illustrative project association":"Registered relationship"}</strong></p><p>{d.context}</p><KnowledgeLimitations values={d.limitations}/>{d.claim_ids.map(id=><button key={id} onClick={()=>onSelect(id)}>Inspect supporting claim</button>)}</>:<p>{edge.kind==="claim_subject"?"This claim explicitly names the topic as a subject.":"This record explicitly cites the passage. A citation does not establish proof or suitability."}</p>}<KnowledgeSources evidence={d.evidence}/><details><summary>Connection identity</summary><p>{edge.id}</p></details></>;}
  const d=node.details,related=graph.issues.filter(i=>i.claim_ids.includes(node.id)||(node.kind==="entity"&&i.claims.some(c=>c.subject_ids.includes(node.id)))||(node.kind==="passage"&&i.claims.some(c=>c.evidence.some(r=>r.passage_id===node.id))));
  return <><h2>{node.label}</h2>{node.kind==="entity"?<>
    <p>{ENTITY_TYPES[d.entity.type]}</p><button type="button" onClick={()=>onCenter(node.id)}>Center this topic</button>{d.entity.availability==="not_assessed"&&<p><strong>Current call availability: not assessed.</strong></p>}
    {d.entity.type==="example_activity"&&<p><strong>Illustrative activity.</strong> {d.authority.value.description}</p>}<KnowledgeLimitations values={d.entity.limitations}/>{!RESEARCH_ADAPTERS.has(d.authority.adapter)&&<KnowledgeSources evidence={d.evidence}/>}
    {RESEARCH_ADAPTERS.has(d.authority.adapter)&&<><IrrigationResearchRecord adapter={d.authority.adapter} value={d.authority.value}/>{d.evidence.length>0&&<details><summary>Reviewed PDF passages ({d.evidence.length})</summary><KnowledgeSources evidence={d.evidence}/></details>}</>}
    <h3>Claims about this topic</h3>{d.claims.length===0?<p>No claim is registered for this topic in the registered collection.</p>:<ul>{d.claims.map(c=><li key={c.id}><button type="button" onClick={()=>onSelect(c.id)}>{c.statement}</button></li>)}</ul>}
    <h3>Registered topic relationships</h3><ul>{d.relations.map(r=><li key={r.id}><button onClick={()=>onSelect(r.id)}>{graph.relation_types[r.type]} · {graph.nodes.find(n=>n.id===(r.source===node.id?r.target:r.source)).label}</button></li>)}</ul>
  </>:node.kind==="claim"?<><Claim claim={d} onSelect={onSelect}/><h3>Subjects</h3><ul>{d.subject_ids.map(id=><li key={id}><button onClick={()=>onSelect(id)}>{graph.nodes.find(n=>n.id===id).label}</button></li>)}</ul></>:<>
    <h3>{d.document.title}</h3><p>PDF page {d.page}. Document edition is checked before opening.</p><DocumentLink documentId={d.document.id} page={d.page} expectedSha256={d.document.sha256}>Open {d.document.id} PDF page {d.page}</DocumentLink>
    <h3>Citation uses</h3>{d.citation_uses.map(r=><article key={r.citation_id}><p>{r.label}</p><p>Role: {r.role} · verified {r.verified_on}</p><details><summary>Citation identity</summary><p>{r.citation_id}</p><p>Edition checksum: {r.sha256}</p></details></article>)}
  </>}
    <Issues issues={related} onSelect={onSelect}/>{node.kind!=="entity"&&<WhereUsed key={`${node.id}:${graph.dataset_hash}`} node={node} graph={graph} request={request} onRefresh={onRefresh} active={active}/>}
    <details><summary>Record identity and provenance</summary><p>{node.id}</p>{node.kind==="entity"&&<><p>{d.authority.authority.file}</p><p>Native record: {d.authority.native_id}</p></>}</details>
  </>;
}
