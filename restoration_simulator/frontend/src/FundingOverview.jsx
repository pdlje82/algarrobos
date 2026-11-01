import React,{useEffect,useRef,useState} from "react";
import {Alert} from "./Alert.jsx";
import {ScoringChoice} from "./ScoringChoice.jsx";
import {SelectionSources} from "./FundingSelection.jsx";
import {FundingSelectionNodeGuidance} from "./FundingSelectionGuidance.jsx";
import {DocumentLink} from "./DocumentLink.jsx";
import {editSelectionRow,selectionProfile} from "./fundingSelectionState.js";

export function useOverview(request,draft,route,context){
 const [state,setState]=useState({value:null,error:"",pending:false,context:null}),[retry,setRetry]=useState(0);
 const input=JSON.stringify({draft,route,revision:context.revision}),key=context.id+":"+route;
 useEffect(()=>{let alive=true;if(route===null){setState({value:null,error:"",pending:false,context:key});return;}
  setState(previous=>({value:previous.context===key?previous.value:null,error:"",pending:true,context:key}));
  const timer=setTimeout(async()=>{try{const value=await request("funding/overview",JSON.parse(input));if(alive)setState({value,error:"",pending:false,context:key});}catch(e){if(alive)setState(previous=>({...previous,error:e.message,pending:false}));}},100);
  return()=>{alive=false;clearTimeout(timer);};
 },[input,key,retry,request]);
 return {...state,retry:()=>setRetry(n=>n+1)};
}

export function OverviewExport({overview}){
 const [error,setError]=useState("");
 function download(){const url=URL.createObjectURL(new Blob([overview.markdown],{type:"text/markdown;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=overview.name.replace(/[^a-z0-9_-]+/gi,"-")+"-overview.md";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function print(){try{const target=window.open("","_blank");if(target===null)throw Error("Allow the print window and try again.");target.document.title=overview.name;const style=target.document.createElement("style");style.textContent="body{font:12pt/1.5 sans-serif;margin:20mm}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}";target.document.head.append(style);const pre=target.document.createElement("pre");pre.textContent=overview.markdown;target.document.body.append(pre);target.document.close();target.focus();target.print();}catch(e){setError(e.message);}}
 return <details><summary>Readable overview and export</summary><div className="funding-actions"><button type="button" onClick={download}>Download overview Markdown</button><button type="button" onClick={print}>Print overview</button></div>{error&&<p role="alert">{error}</p>}<pre className="funding-overview-markdown">{overview.markdown}</pre></details>;
}

export function FundingOverview({draft,route,request,revision,versionId,onChange,onItem,onExplore,onActivities,disabled}){
 const state=useOverview(request,draft,route,{revision,id:versionId}),[all,setAll]=useState(false),heading=useRef(null);
 useEffect(()=>setAll(false),[route,versionId]);
 function changed(criterion,row){onChange(editSelectionRow(draft,route,criterion.id,row));requestAnimationFrame(()=>{if(!all&&document.activeElement===document.body)heading.current?.focus({preventScroll:true});});}
 const binary=draft.version===4&&draft.bundle.selection.version===3;
 if(route===null)return <section className="panel"><h2>Project overview</h2><p>Choose a programme and route to see this version’s overview.</p><button type="button" onClick={onExplore}>Explore programmes and routes</button></section>;
 const o=state.value;
 return <section className="panel funding-project-overview" aria-label="Project overview"><h2 ref={heading} tabIndex={-1}>Project overview</h2><p>{route}</p>
 {state.error&&<Alert variant="error" title="Overview could not be updated">{state.error}<p>Your selections are retained. Any displayed totals belong to the previous overview.</p><button type="button" onClick={state.retry}>Retry overview</button></Alert>}
 {state.pending&&<p role="status">{o===null?"Loading overview…":"Updating overview — previous totals shown…"}</p>}
 {o!==null&&<><h3>{o.title}</h3>{o.score!==null?<><div className="funding-overview-score"><strong>{o.score.subtotal} / {o.score.threshold} points</strong><span>{o.score.unresolved?`${o.score.unresolved} criteria need inputs`:o.score.subtotal>=o.score.threshold?"Score threshold reached":"Score below threshold"}</span></div>{!binary&&<p>This version retains scoring edition {draft.bundle.selection.version}. Review its update to use selected/not selected scoring.</p>}
 <div className="funding-actions"><button type="button" aria-pressed={!all} onClick={()=>setAll(false)}>Selected items</button><button type="button" aria-pressed={all} onClick={()=>setAll(true)}>All items</button></div>
 {o.criteria.map(c=>{const definition=selectionProfile(draft,route).criteria.find(d=>d.id===c.id),row=draft.selection_assessments[route].criteria[c.id];
  const items=c.items.filter(i=>all||row.answers[i.id]===true),included=c.method==="ratio"?(Object.hasOwn(row,"calculation_included")?row.calculation_included:c.calculation_included):items.length>0;
  if(!all&&!included)return null;
  return <section className="funding-overview-criterion" data-overview-criterion={c.id} key={c.id}><h3>{c.id} · {c.label}</h3><p><strong>{c.uncapped} selected points → {c.subtotal} included</strong> · {c.cap}-point maximum</p>
   {c.method==="ratio"?<><label className="funding-pick"><input type="checkbox" aria-label={`Include calculation ${c.id}`} checked={included} disabled={disabled||!binary} onChange={e=>changed(c,{...row,calculation_included:e.target.checked})}/>Include this calculation</label>{included&&c.items.filter(i=>i.selected).map(i=><p key={i.id}>{i.id} · {i.label} · {i.points} points</p>)}<button type="button" onClick={e=>onItem(c.id,e.currentTarget,null)}>Calculation inputs and sources</button></>:items.map(item=><article data-overview-item={item.id} className="funding-overview-item" key={item.id}><div><strong>{item.id} · {item.label}</strong><span> · {item.points} points before the criterion cap</span></div>
    <ScoringChoice row={row} criterion={definition} item={item} onChange={next=>changed(c,next)} disabled={disabled||!binary}/>
    {item.notes&&<p className="funding-overview-notes">{item.notes}</p>}{item.reference&&<p>Reference: {item.reference}</p>}
    {item.edl.length>0&&<p>EDL links: {item.edl.map((r,index)=><React.Fragment key={r.id}>{index>0?", ":""}<a href={`#overview-edl-${r.id}`}>{r.id}</a></React.Fragment>)}</p>}
    {item.activities.length>0&&<p>Activities: {item.activities.map(a=>a.title).join("; ")}</p>}
    <button type="button" onClick={e=>onItem(c.id,e.currentTarget,item.id)}>Open {item.id} · notes, activities and details</button>
    <details><summary>Official explanation and recommendations · {item.id}</summary><FundingSelectionNodeGuidance route={route} choice={item} criterion={definition} focused={false}/><p lang="es">{item.label_es}</p><SelectionSources sources={item.sources}/></details>
   </article>)}{c.notes&&<p className="funding-overview-notes">Shared criterion notes: {c.notes}</p>}{c.reference&&<p>Shared reference: {c.reference}</p>}
   {c.issues.map(issue=><p key={issue}>{issue}</p>)}
  </section>;
 })}
 {!all&&!o.criteria.some(c=>c.items.some(i=>i.selected)||c.calculation_included)&&<p>No scoring items selected. Choose All items or use the graph to add selections.</p>}
 </>:<><p>This route has no AL20 scoring assessment.</p><ul>{o.checks.map((c,i)=><li key={i}>{c.message}</li>)}</ul></>}
 {o.concept!==null&&o.concept.activities.length>0&&<section><h3>Activities</h3><ul>{o.concept.activities.map(a=><li key={a.id}>{a.title}{a.outcome?" · "+a.outcome:""}</li>)}</ul></section>}
 {o.edl.length>0&&<section><h3>Selected EDL needs and references</h3><p>Strategy references are separate from grant-selection points.</p><ul>{o.edl.map(r=><li id={`overview-edl-${r.id}`} key={r.id}><DocumentLink documentId={r.document_id} page={r.page} expectedSha256={r.sha256}>{r.id} · {r.label}</DocumentLink></li>)}</ul></section>}
 {o.delivery.length>0&&<section><h3>Monitoring, participation and sharing</h3><dl>{o.delivery.map(t=><React.Fragment key={t.id}><dt>{t.label}</dt><dd>{t.value}</dd></React.Fragment>)}</dl></section>}
 <section><h3>Details to add</h3>{o.details.length?<ul>{o.details.map((d,i)=><li key={i}>{d}</li>)}</ul>:<p>No additional details recorded.</p>}</section>
 <div className="funding-actions"><button type="button" onClick={onExplore}>Open graph</button>{["LEADER-AL20-3.4","LEADER-AL20-3.5"].includes(route)&&<button type="button" onClick={onActivities}>Activities and delivery</button>}</div><OverviewExport overview={o}/></>}
 </section>;
}

export function FundingVersionComparison({versions,currentId,request,revision,onClose}){
 const [left,setLeft]=useState(currentId),[right,setRight]=useState(null);
 const a=versions.find(v=>v.id===left),b=versions.find(v=>v.id===right);
 const route=v=>v!==undefined&&Object.hasOwn(v.draft,"navigator_focus")?v.draft.navigator_focus.route_id:null;
 const sa=useOverview(request,a===undefined?null:a.draft,route(a),{revision,id:left}),sb=useOverview(request,b===undefined?null:b.draft,route(b),{revision,id:right});
 return <section className="panel funding-version-comparison" aria-label="Compare versions"><h2>Compare versions</h2><p>Compare two versions of the same route or different funding approaches. Each keeps its own scoring rules.</p><button type="button" onClick={onClose}>Close comparison</button><div className="funding-version-columns">{[[left,setLeft,a,sa,sb],[right,setRight,b,sb,sa]].map(([id,set,v,state,other],index)=><section key={index}><label>Version {index+1}<select aria-label={`Compare version ${index+1}`} value={id===null?"":id} onChange={e=>set(e.target.value===""?null:e.target.value)}><option value="">Choose a version</option>{versions.map(r=><option key={r.id} value={r.id}>{r.draft.name}</option>)}</select></label>{v!==undefined&&<><h3>{v.draft.name}</h3><p>Programme: {Object.hasOwn(v.draft,"navigator_focus")?v.draft.navigator_focus.programme_id:"Not selected"}</p><p>{route(v)===null?"Choose a working route in this version to compare its project overview.":route(v)}</p>{state.pending&&<p role="status">Loading version overview…</p>}{state.error&&<Alert variant="error" title="Comparison unavailable">{state.error}<button onClick={state.retry}>Retry comparison</button></Alert>}{state.value!==null&&<><p>{state.value.score===null?"No AL20 scoring":`${state.value.score.subtotal} points / threshold ${state.value.score.threshold} · scoring edition ${v.draft.bundle.selection.version}`}</p><h4>Selected scoring items</h4><ul>{state.value.criteria.flatMap(c=>c.items.filter(i=>i.selected)).map(i=><li key={i.id}>{i.id} · {i.label} · {i.points} points{other.value!==null&&!other.value.criteria.some(c=>c.items.some(j=>j.selected&&j.id===i.id))?" · Only in this version":""}</li>)}</ul><h4>EDL needs and references</h4><ul>{state.value.edl.map(r=><li key={r.id}>{r.id} · {r.label}</li>)}</ul><h4>Activities and delivery</h4>{state.value.concept===null?<p>No project concept created.</p>:<><ul>{state.value.concept.activities.map(a=><li key={a.id}>{a.title} · {a.outcome||"Outcome not entered"}</li>)}</ul>{state.value.delivery.length>0&&<dl>{state.value.delivery.map(t=><React.Fragment key={t.id}><dt>{t.label}</dt><dd>{t.value}</dd></React.Fragment>)}</dl>}</>}<h4>Budget</h4><p>Project budget: {(Object.hasOwn(v.draft.overrides,"budget_total")?v.draft.overrides.budget_total:v.draft.baseline.facts.budget_total)===null?"Not entered":(Object.hasOwn(v.draft.overrides,"budget_total")?v.draft.overrides.budget_total:v.draft.baseline.facts.budget_total)}</p><ul>{v.draft.allocations.map((allocation,i)=><li key={i}>{allocation.cost_line}: {allocation.amount===null?"Amount not entered":allocation.amount} · {allocation.kind}</li>)}</ul><OverviewExport overview={state.value}/></>}</>}</section>)}</div></section>;
}
