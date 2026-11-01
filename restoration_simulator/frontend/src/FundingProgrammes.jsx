import React,{useEffect,useState} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {GUIDE_SECTIONS} from "./fundingGuideState.js";
import {validateProgrammesResponse,programmeMembers,routeCoverage} from "./fundingProgrammeState.js";

export function useFundingProgrammes(request){
  const [value,setValue]=useState(null),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let current=true;setError("");setValue(null);(async()=>{try{const data=validateProgrammesResponse(await request("funding/programmes"));if(current)setValue(data);}catch(e){if(current)setError(e.message);}})();return()=>{current=false;};},[request,attempt]);
  return {value,error,retry:()=>setAttempt(n=>n+1)};
}
const kindLabels={programme:"Programme",programme_family:"Programme family",legal_framework:"Legal framework",historical:"Historical example",mechanism:"Funding approach",emerging:"Emerging approach",advisory:"Advisory support"};
export function FundingProgrammes({state,selected,onSelect,catalogue,conditions}){
  const [search,setSearch]=useState("");
  if(state.value===null)return <section className="funding-programmes">{state.error?<div role="alert"><p>Programme list unavailable: {state.error}</p><button type="button" onClick={state.retry}>Retry programme list</button><button type="button" onClick={()=>onSelect(null)}>Clear programme focus</button><p>Your saved answers and current draft are retained.</p></div>:<p role="status">Loading funding programmes and introductions…</p>}</section>;
  const data=state.value.library,p=selected===null?null:data.programmes.find(p=>p.id===selected);
  if(selected!==null&&p===undefined)throw Error("The selected funding programme is missing. Retry the programme list.");
  const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),query=norm(search.trim());
  const list=data.programmes.filter(p=>programmeMembers(p,catalogue).length>0&&(query===""||norm(`${p.title} ${p.id} ${p.entry_ids.join(" ")}`).includes(query)));
  const outside=p!==null&&!list.some(x=>x.id===p.id);
  const coverage=p===null||conditions===null?null:programmeMembers(p,catalogue).map(id=>routeCoverage(conditions,id));
  return <section className="funding-programmes" aria-label="Programme selection">
    <div className="funding-programme-picker"><label>Find a programme or approach<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="AL20, LIFE, Horizon, donations…"/></label>
    <label>Programme or funding approach<select aria-label="Programme or funding approach" value={selected===null?"":selected} onChange={e=>onSelect(e.target.value===""?null:e.target.value)}><option value="">Choose a programme or approach</option>{outside&&<optgroup label="Current selection"><option value={p.id}>{p.title}</option></optgroup>}{Object.entries(data.families).map(([id,label])=><optgroup key={id} label={label}>{list.filter(p=>p.family===id).map(p=><option key={p.id} value={p.id}>{p.title} · {kindLabels[p.kind]} · {programmeMembers(p,catalogue).length} route(s)</option>)}</optgroup>)}</select></label></div>
    {list.length===0&&<p>No programme matches this search. Clear the search to show all approaches.</p>}
    {p===null?<p>Choose a programme, then a funding route. Only that route’s requirements will appear.</p>:<section className="funding-programme-intro" aria-label={`Programme overview: ${p.title}`}><h3>{p.title}</h3><small>{kindLabels[p.kind]} · Reference checked {p.guide.checked_on}</small><p>{p.summary}</p>
      {coverage===null?<p role="status">Loading route assessment coverage…</p>:<p className="funding-programme-coverage">{coverage.filter(c=>c.fit).length} route(s) with modelled eligibility checks · {coverage.filter(c=>c.amount).length} with amount calculations · {coverage.filter(c=>!c.fit&&!c.amount).length} reference guide only</p>}
      <details><summary>Read programme or approach guide</summary>{GUIDE_SECTIONS.map(([key,title])=><section key={key}><h4>{title}</h4><p>{p.guide[key]}</p></section>)}<p><strong>Availability:</strong> {p.guide.availability}</p>{p.guide.unresolved.length>0&&<><h4>Questions still to verify</h4><ul>{p.guide.unresolved.map(q=><li key={q}>{q}</li>)}</ul></>}<h4>Sources and verification</h4><ul className="funding-sources">{p.guide.sources.map((s,i)=><li key={i}><DocumentLink href={s.url} documentId={s.document_id} page={s.page} expectedSha256={s.sha256} target="_blank" rel="noreferrer">{s.title}</DocumentLink><p>{s.issuer} · checked {s.checked_on}{s.document_id===null?"":` · ${s.document_id}, PDF page ${s.page}`}</p><small>{s.note}</small></li>)}</ul></details>
    </section>}
  </section>;
}
