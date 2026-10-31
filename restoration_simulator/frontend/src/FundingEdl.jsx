import React,{createContext,useContext,useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {DocumentLink} from "./DocumentLink.jsx";
import {validateEdlResponse,editEdlEvidence,edlSearch} from "./fundingEdlState.js";
import "./FundingEdl.css";

const Edl=createContext(null);
function useEdl(){const value=useContext(Edl);if(value===null)throw Error("EDL content requires its strategy-library provider.");return value;}
export function FundingEdlProvider({request,children}){
  const [value,setValue]=useState(null),[error,setError]=useState(""),[attempt,setAttempt]=useState(0),[session,setSession]=useState(null);
  useEffect(()=>{let current=true;setError("");(async()=>{try{const next=validateEdlResponse(await request("funding/edl"));if(current)setValue(next);}catch(e){if(current){setValue(null);setError(e.message);}}})();return()=>{current=false;};},[attempt]);
  const state={value,error,retry:()=>setAttempt(n=>n+1),open:(binding,opener)=>setSession({binding,opener})};
  return <Edl.Provider value={state}>{children}{session!==null&&<EdlExplorer key={session.binding===null?"all":session.binding} session={session} onClose={()=>setSession(null)}/>}</Edl.Provider>;
}
function Unavailable(){const {error,retry}=useEdl();return error?<p role="alert">EDL content unavailable: {error} <button type="button" onClick={retry}>Retry EDL content</button></p>:<p role="status">Loading the AL20 strategy content…</p>;}
export function FundingEdlOpenButton(){const {open}=useEdl();return <button type="button" onClick={e=>open(null,e.currentTarget)}>Explore AL20 EDL</button>;}
function Source({source,page,section}){return <DocumentLink documentId={source.document_id} page={page} expectedSha256={source.sha256}>EDL §{section} · page {page}</DocumentLink>;}
function Item({item,source,selected,onSelect,disabled}){
  return <article className="funding-edl-item" data-edl-item={item.id}>
    {onSelect===null?<strong>{item.code} · {item.label}</strong>:<label className="funding-edl-reference"><input type="checkbox" disabled={disabled} checked={selected} aria-label={`EDL reference ${item.id}: ${item.label}`} onChange={e=>onSelect(e.target.checked)}/><strong>{item.code} · {item.label}</strong></label>}
    <p>{item.summary}</p><Source source={source} page={item.page} section={item.section}/>
    <details><summary>Spanish keyword</summary><span lang="es">{item.label_es}</span><small>Short source keyword; consult the cited Spanish passage for the complete wording.</small></details>
  </article>;
}
export function FundingEdlNode({bindingId,required=false,row=null,onChange=null,disabled=false}){
  const {value,open}=useEdl(),[localError,setLocalError]=useState("");
  if(value===null)return required?<section className="funding-edl-node"><Unavailable/></section>:null;
  if(!Object.hasOwn(value.library.bindings,bindingId))return required?<p role="alert">No EDL content is registered for {bindingId}. Reload the strategy library.</p>:null;
  const data=value.library,binding=data.bindings[bindingId],topics=binding.topic_ids.map(id=>data.topics.find(t=>t.id===id)),items=new Map(data.items.map(i=>[i.id,i]));
  const metadata=row!==null&&Object.hasOwn(row,"edl_evidence")?row.edl_evidence:null;
  const selected=metadata!==null&&Object.hasOwn(metadata.selections,bindingId)?metadata.selections[bindingId]:[];
  function select(id,checked){try{onChange(editEdlEvidence(row,value,bindingId,id,checked));setLocalError("");}catch(e){setLocalError(e.message);}}
  return <section className="funding-edl-node" aria-label={`EDL information for ${bindingId}`}>
    <header><strong>What the AL20 EDL says</strong><button type="button" onClick={e=>open(bindingId,e.currentTarget)}>Explore EDL for {bindingId}</button></header>
    <small>{data.edition} · {data.source.document_id} · English summaries of the cited Spanish strategy.</small><p>{binding.note}</p>
    {localError&&<p role="alert">{localError}</p>}
    {topics.map(topic=><div key={topic.id} className="funding-edl-topic"><h4>{topic.title}</h4><p className={topic.status==="not_designated"?"reason":undefined}>{topic.summary}</p><div className="funding-edl-sources">{topic.pages.map(page=><Source key={page} source={data.source} page={page} section={topic.section}/>)}</div>
      {onChange!==null&&topic.item_ids.length>0&&<p className="funding-edl-instruction">Select supporting references below, then answer the criterion explicitly. References do not award or multiply points. Explain the operation’s connection in your notes.</p>}
      {topic.item_ids.length>20?<details><summary>Show all {topic.item_ids.length} prioritised needs</summary>{topic.item_ids.map(id=><Item key={id} item={items.get(id)} source={data.source} selected={selected.includes(id)} onSelect={onChange===null?null:checked=>select(id,checked)} disabled={disabled}/>)}</details>:topic.item_ids.map(id=><Item key={id} item={items.get(id)} source={data.source} selected={selected.includes(id)} onSelect={onChange===null?null:checked=>select(id,checked)} disabled={disabled}/>)}
    </div>)}
  </section>;
}
function EdlExplorer({session,onClose}){
  const {value}=useEdl(),dialog=useRef(null),search=useRef(null),heading=useId();
  const [query,setQuery]=useState(""),[scope,setScope]=useState(session.binding===null?"all":"node");
  useEffect(()=>{const node=dialog.current,overflow=document.body.style.overflow;node.showModal();document.body.style.overflow="hidden";search.current.focus({preventScroll:true});return()=>{node.close();document.body.style.overflow=overflow;if(session.opener.isConnected)session.opener.focus({preventScroll:true});};},[session]);
  let topics=[];
  if(value!==null){const data=value.library,ids=scope==="node"&&session.binding!==null?data.bindings[session.binding].topic_ids:data.topics.map(t=>t.id);const q=edlSearch(query.trim());topics=data.topics.filter(t=>ids.includes(t.id)).map(t=>{const context=edlSearch(`${t.title} ${t.summary} ${t.section}`);const matches=data.items.filter(i=>t.item_ids.includes(i.id)&&(q===""||context.includes(q)||edlSearch(`${i.id} ${i.code} ${i.label} ${i.label_es} ${i.summary} ${i.section}`).includes(q)));return {...t,matches,matched:q===""||context.includes(q)||matches.length>0};}).filter(t=>t.matched);}
  return createPortal(<dialog ref={dialog} className="funding-edl-explorer" aria-modal="true" aria-labelledby={heading} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();onClose();}}} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
    <header><div><p className="eyebrow">Local development strategy</p><h2 id={heading}>Explore AL20 EDL</h2></div><button type="button" onClick={onClose}>Close EDL explorer</button></header>
    <div className="funding-edl-explorer-controls"><label>Search EDL content<input ref={search} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Activities, needs, NPL codes, innovation…"/></label><label>EDL content scope<select aria-label="EDL content scope" value={scope} onChange={e=>setScope(e.target.value)}>{session.binding!==null&&<option value="node">Related to {session.binding}</option>}<option value="all">All strategy topics</option></select></label></div>
    {value===null?<Unavailable/>:<><p>{value.library.intro}</p><p>Search the source-cited topics below. The PDF viewer also provides search across the full strategy.</p><p>{value.library.edition} · <DocumentLink documentId={value.library.source.document_id} page={3} expectedSha256={value.library.source.sha256}>Open the full AL20 strategy</DocumentLink></p><p role="status">Topics: {topics.length} · References: {new Set(topics.flatMap(t=>t.matches.map(i=>i.id))).size}</p>
    {topics.length===0?<p>No strategy content matches this search. Change the text or search all topics.</p>:topics.map(t=><section key={t.id} className="funding-edl-topic"><h3>{t.title}</h3><p>{t.summary}</p><div className="funding-edl-sources">{t.pages.map(page=><Source key={page} source={value.library.source} page={page} section={t.section}/>)}</div>{t.matches.map(i=><Item key={i.id} item={i} source={value.library.source} selected={false} onSelect={null} disabled={false}/>)}</section>)}</>}
  </dialog>,document.body);
}
