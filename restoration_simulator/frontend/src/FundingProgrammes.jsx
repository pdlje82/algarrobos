import React,{useEffect,useState} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {GUIDE_SECTIONS} from "./fundingGuideState.js";
import {validateProgrammesResponse} from "./fundingProgrammeState.js";

export function useFundingProgrammes(request){
  const [value,setValue]=useState(null),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let current=true;setError("");setValue(null);(async()=>{try{const data=validateProgrammesResponse(await request("funding/programmes"));if(current)setValue(data);}catch(e){if(current)setError(e.message);}})();return()=>{current=false;};},[request,attempt]);
  return {value,error,retry:()=>setAttempt(n=>n+1)};
}
const kindLabels={programme:"Programme",programme_family:"Programme family",legal_framework:"Legal framework",historical:"Historical example",mechanism:"Funding approach",emerging:"Emerging approach",advisory:"Advisory support"};
export function FundingProgrammeGuide({programme:p,workingProgramme,onClose}){
  const heading=React.useRef(null);
  useEffect(()=>{heading.current.scrollIntoView({block:"start",behavior:"instant"});heading.current.focus({preventScroll:true});},[p.id]);
  return <section className="funding-programme-intro" aria-label={`Programme overview: ${p.title}`}>
    <header><h3 ref={heading} tabIndex={-1}>{p.title}</h3><button type="button" onClick={onClose}>Close programme guide</button></header>
    <small>{kindLabels[p.kind]} · Reference checked {p.guide.checked_on} · Current reference information</small>
    {workingProgramme!==null&&workingProgramme.id!==p.id&&<p>Working programme: {workingProgramme.title}. Reading this guide does not change your selection.</p>}
    <p>{p.summary}</p><details open><summary>Read programme or approach guide</summary>
    {GUIDE_SECTIONS.map(([key,title])=><section key={key}><h4>{title}</h4><p>{p.guide[key]}</p></section>)}
    <p><strong>Availability:</strong> {p.guide.availability}</p>{p.guide.unresolved.length>0&&<><h4>Questions still to verify</h4><ul>{p.guide.unresolved.map(q=><li key={q}>{q}</li>)}</ul></>}
    <h4>Sources and verification</h4><ul className="funding-sources">{p.guide.sources.map((source,i)=><li key={i}><DocumentLink href={source.url} documentId={source.document_id} page={source.page} expectedSha256={source.sha256} target="_blank" rel="noreferrer">{source.title}</DocumentLink><p>{source.issuer} · checked {source.checked_on}{source.document_id===null?"":` · ${source.document_id}, PDF page ${source.page}`}</p><small>{source.note}</small></li>)}</ul>
    </details>
  </section>;
}
