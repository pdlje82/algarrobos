import React from "react";
import {programmeMembers,routeCoverage} from "./fundingProgrammeState.js";

export function FundingProgrammeNodes({layout,column,state,selected,browse,onBrowse,onFamily,onSelect,onGuide,catalogue,conditions}){
  if(state.value===null)return <section className="funding-programme-loading" data-graph-column="programme" style={{position:"absolute",top:44,left:column.left,width:column.width}}>{state.error?<div role="alert"><p>Programme list unavailable: {state.error}</p><button type="button" onClick={state.retry}>Retry programme list</button><button type="button" onClick={()=>onSelect(null)}>Clear programme focus</button><p>Your answers and draft are retained.</p></div>:<p role="status">Loading programme nodes…</p>}</section>;
  return layout.rows.map(row=>{
    const style={position:"absolute",top:row.top,left:column.left+(row.indented?16:0),width:column.width-(row.indented?16:0),height:row.height};
    if(row.kind==="browse")return <button key={row.key} type="button" data-graph-column="programme" className="funding-programme-browse" style={style} aria-expanded={browse} onClick={()=>onBrowse(!browse)}>Other programmes ({row.count}) · {browse?"Hide":"Show"}</button>;
    if(row.kind==="family")return <button key={row.key} type="button" data-graph-column="programme" data-programme-family={row.id} className="funding-programme-family" style={style} aria-expanded={row.expanded} onClick={()=>onFamily(row.id,!row.expanded)} onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();onFamily(row.id,e.key==="ArrowRight");}}}><strong>{row.expanded?"▾":"▸"} {row.title}</strong><small>{row.count} programmes / approaches</small></button>;
    if(row.kind==="empty")return <p key={row.key} style={style}>No matching programme nodes. Clear the programme search.</p>;
    const p=row.programme,members=programmeMembers(p,catalogue),fit=conditions===null?null:members.filter(id=>routeCoverage(conditions,id).fit).length;
    return <article key={row.key} data-graph-column="programme" data-programme-id={p.id} className={`funding-programme-node${p.id===selected?" is-selected":""}`} style={style}>
      <button type="button" className="funding-programme-select" aria-pressed={p.id===selected} onClick={()=>onSelect(p.id)} title={`${p.title}\n${p.summary}`}><strong>{p.title}</strong><span>{members.length} route(s){fit===null?" · Loading coverage…":` · ${fit} with modelled fit checks`}</span><small>{p.kind.replaceAll("_"," ")}</small></button>
      <button type="button" className="funding-programme-guide-open" aria-label={`Read guide for ${p.title}`} onClick={e=>onGuide(p.id,e.currentTarget)}>Read guide</button>
    </article>;
  });
}
