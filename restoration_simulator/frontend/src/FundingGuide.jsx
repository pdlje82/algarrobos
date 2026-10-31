import React,{createContext,useContext,useEffect,useState} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {GUIDE_SECTIONS,guideFor,validateGuideResponse} from "./fundingGuideState.js";
import "./FundingGuide.css";

const Guides=createContext(null);
export function FundingGuideProvider({request,children}){
  const [value,setValue]=useState(null),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let active=true;setValue(null);setError("");
    (async()=>{try{const next=validateGuideResponse(await request("funding/guides"));if(active)setValue(next);}catch(e){if(active)setError(e.message);}})();
    return()=>{active=false;};
  },[request,attempt]);
  return <Guides.Provider value={{value,error,retry:()=>setAttempt(n=>n+1)}}>{children}</Guides.Provider>;
}
export function FundingGuide({id}){
  const state=useContext(Guides);
  if(state===null)throw Error("Funding introductions require the guide provider.");
  const {value,error,retry}=state;
  let guide=null,problem=error;
  if(value!==null){try{guide=guideFor(value,id);}catch(e){problem=e.message;}}
  const heading=React.useRef(null);
  useEffect(()=>{if(heading.current){heading.current.scrollIntoView({block:"start",behavior:"instant"});heading.current.focus({preventScroll:true});}},[id,guide!==null,problem]);
  return <section className="funding-guide" aria-label={`Introduction to ${id}`}>
    <h3 ref={heading} tabIndex={-1}>{guide===null?`Explore ${id}`:guide.title}</h3>
    {problem!==""?<div role="alert"><p>Funding introduction unavailable: {problem}</p><p>Your exploration and saved assessment are retained.</p><button type="button" onClick={retry}>Retry reference information</button></div>:guide===null?<p role="status">Loading funding introduction…</p>:<>
      <p className="funding-guide-notice">Current reference information · checked {guide.checked_on} · {guide.kind.replaceAll("_"," ")}. Saved assessments retain their original rules.</p>
      <p><strong>Automated assessment unavailable.</strong> This introduction helps you investigate the option; it does not determine eligibility or calculate funding.</p>
      {GUIDE_SECTIONS.map(([key,title])=><section key={key}><h4>{title}</h4><p>{guide[key]}</p></section>)}
      <p className="funding-guide-availability"><strong>Availability at the reference date:</strong> {guide.availability}</p>
      {guide.unresolved.length>0&&<details><summary>Questions still to verify</summary><ul>{guide.unresolved.map(s=><li key={s}>{s}</li>)}</ul></details>}
      <details className="funding-guide-sources"><summary>Sources and verification ({guide.source_ids.length})</summary><ul>{guide.source_ids.map(sid=>{const s=value.library.sources[sid];return <li key={sid}>
        <DocumentLink href={s.url} documentId={s.document_id} page={s.page} expectedSha256={s.sha256} target="_blank" rel="noreferrer">{s.title}</DocumentLink>
        <p>{s.issuer} · {s.date===null?"Publication date unverified":s.date} · checked {s.checked_on}{s.document_id!==null?` · ${s.document_id}, PDF page ${s.page}`:" · external reference"}</p><p>{s.note}</p>
      </li>;})}</ul></details>
      {guide.related.length>0&&<p><strong>Related options:</strong> {guide.related.join(", ")}. Check overlap before combining support.</p>}
    </>}
  </section>;
}
