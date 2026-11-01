import React,{createContext,useContext,useEffect,useRef,useState} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {SELECTION_GUIDANCE_ROUTES,selectionGuidanceFor,validateSelectionGuidanceResponse} from "./fundingSelectionGuidanceState.js";
import "./FundingSelectionGuidance.css";

const Guidance=createContext(null);
export function FundingSelectionGuidanceProvider({request,children}){
  const [value,setValue]=useState(null),[error,setError]=useState(""),[attempt,setAttempt]=useState(0),[enabled,setEnabled]=useState(false);
  useEffect(()=>{
    if(!enabled)return;
    let active=true;setValue(null);setError("");
    (async()=>{try{const result=validateSelectionGuidanceResponse(await request("funding/selection-guidance"));if(active)setValue(result);}catch(e){if(active)setError(e.message);}})();
    return()=>{active=false;};
  },[request,enabled,attempt]);
  return <Guidance.Provider value={{value,error,enable:()=>setEnabled(true),retry:()=>setAttempt(n=>n+1)}}>{children}</Guidance.Provider>;
}
function Sources({ids,library}){
  const sources=[...new Map(ids.map(id=>{const s=library.sources[id];return [`${s.document_id}-${s.page}-${s.sha256}`,s];})).values()];
  return <div className="funding-selection-guidance-sources">{sources.map(s=><DocumentLink key={`${s.document_id}-${s.page}`} documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink>)}</div>;
}
function Block({block}){return <p>{block.text}</p>;}
function Unavailable({error,retry}){
  return error!==""?<div role="alert"><p>Selection guidance unavailable: {error}</p><p>Your scoring answers and notes are retained.</p><button type="button" onClick={retry}>Retry selection guidance</button></div>:<p role="status">Loading selection guidance…</p>;
}
export function FundingSelectionRouteGuidance({route}){
  const state=useContext(Guidance);
  if(state===null)throw Error("Selection guidance requires its provider.");
  const supported=SELECTION_GUIDANCE_ROUTES.includes(route);
  useEffect(()=>{if(supported)state.enable();},[supported]);
  if(!supported)return null;
  const {value,error,retry}=state;
  return <section className="funding-selection-route-guidance" aria-label="Restoration route guidance">
    {value===null?<Unavailable error={error} retry={retry}/>:<>
      <p className="funding-selection-guidance-date">Current reference guidance · reviewed {value.library.checked_on}. Points and answers use your saved assessment. Reading advice does not award points.</p>
      <details><summary>Official route conditions · {route}</summary><Block block={value.library.route_contexts[route].official}/><h4>Delivery and later commitments</h4><Block block={value.library.route_contexts[route].follow_up}/><Sources ids={[...value.library.route_contexts[route].official.sources,...value.library.route_contexts[route].follow_up.sources]} library={value.library}/></details>
      <details><summary>Source editions and official downloads</summary><ul>{Object.entries(value.library.publications).map(([id,p])=><li key={id}><p>{p.title} · {p.edition}</p><p>{p.review_note}</p><DocumentLink documentId={id} page={1} expectedSha256={p.sha256}>Open {id}</DocumentLink>{" · "}<a href={p.publication_url} target="_blank" rel="noreferrer">Official publication</a>{" · "}<a href={p.download_url} target="_blank" rel="noreferrer">Official PDF download</a></li>)}</ul></details>
    </>}
  </section>;
}
export function FundingSelectionNodeGuidance({route,choice,criterion,focused}){
  const state=useContext(Guidance);
  const root=useRef(null);
  useEffect(()=>{if(focused&&state!==null&&state.value!==null&&root.current!==null)root.current.closest(".funding-selection-choice").scrollIntoView({block:"start",inline:"nearest",behavior:"instant"});},[focused,state===null?null:state.value]);
  if(state===null)throw Error("Selection guidance requires its provider.");
  if(!SELECTION_GUIDANCE_ROUTES.includes(route)||state.value===null)return null;
  let node;
  try{node=selectionGuidanceFor(state.value,route,choice.id);}catch(e){return <Unavailable error={e.message} retry={state.retry}/>;}
  const library=state.value.library;
  const combinations=criterion.exclusive_groups.filter(group=>group.includes(choice.id)).map(group=>group.filter(id=>id!==choice.id));
  const sourceIds=[...new Set([node.official,node.restoration,node.application,node.payment,node.follow_up,...node.recommendations,...node.unresolved].flatMap(b=>b.sources))];
  return <details ref={root} className="funding-selection-node-guidance" key={`${route}-${choice.id}-${focused}`} open={focused?true:undefined}>
    <summary>Requirements and restoration recommendations · {choice.id}</summary>
    <section aria-label={`Selection guidance for ${choice.id}`} data-guidance-node={choice.id}>
      <h4>Official requirements</h4><Block block={node.official}/>
      <p className="funding-selection-guidance-points">{choice.points} points · {criterion.id} cap: {criterion.cap} points. {combinations.length>0?`Cannot combine with ${[...new Set(combinations.flat())].join(", ")}. `:""}{Object.hasOwn(criterion.requires,choice.id)?`Requires ${criterion.requires[choice.id].join(", ")}. `:""}Selections remain subject to the criterion cap.</p>
      <h4>Relevance to nature restoration</h4><Block block={node.restoration}/>
      <h4>Recommendations to consider · illustrative</h4><ul>{node.recommendations.map(r=><li key={r.id} data-guidance-recommendation={r.id}><p>{r.text}</p></li>)}</ul>
      <details><summary>Required evidence · application, payment and later controls</summary>{[["application","Application"],["payment","Payment"],["follow_up","Later controls"]].map(([key,label])=><div key={key}><h4>{label}</h4><Block block={node[key]}/></div>)}</details>
      {node.unresolved.length>0&&<details><summary>Questions to confirm with AL20 ({node.unresolved.length})</summary>{node.unresolved.map((block,i)=><Block key={i} block={block}/>)}</details>}
      <details><summary>Official sources and documentation</summary><Sources ids={sourceIds} library={library}/></details>
    </section>
  </details>;
}
