import React, {useEffect,useState} from "react";
import {FundingHelp} from "./FundingHelp.jsx";
import {applicantKey,explicitlyUnknown} from "./fundingState.js";
import {selectionSummary} from "./fundingSelectionState.js";

export function ApplicantPicker({question:q,value,onChange,disabled=false,review=false}){
  const key=value===null||value.kind==="unknown"||value.kind==="potential"&&value.legal_form===null?"":value.kind==="recorded"?`party:${value.party_id}`:`type:${value.legal_form}`;
  const parties=q.options.filter(o=>o.choice.kind==="recorded");
  function choose(key){if(key===""){onChange({kind:"unknown"});return;}if(key.startsWith("party:")){const item=parties.find(o=>o.choice.party_id===key.slice(6));if(item===undefined)throw Error("This applicant is missing. Reload project context.");onChange(item.choice);return;}const form=key.slice(5);if(!q.forms.some(([id])=>id===form))throw Error("This applicant type is missing. Reload project context.");onChange({kind:"potential",legal_form:form});}
  return <select id="funding-applicant_choice" aria-label="Applicant type" value={key} disabled={disabled} onChange={e=>choose(e.target.value)}><option value="">Not entered</option><optgroup label="Project organisations and people">{parties.map(o=><option key={o.choice.party_id} value={`party:${o.choice.party_id}`}>{o.label}</option>)}</optgroup><optgroup label="Applicant types">{q.forms.map(([id,label])=><option key={id} value={`type:${id}`}>{label}</option>)}</optgroup></select>;
}

export function FundingAnswers({questions,selectionScores,onSelection,open,onOpen,onEdit,onUnknown,onRestore,onParcel,disabled}){
  if(questions.some(q=>q.type==="selection")&&(selectionScores===null||typeof selectionScores!=="object"||Array.isArray(selectionScores)||Object.keys(selectionScores).length===0))throw Error("AL20 route scores are missing. Retry the funding assessment or restart Python and reload.");
  const [wide,setWide]=useState(()=>matchMedia("(min-width:801px)").matches);
  useEffect(()=>{const media=matchMedia("(min-width:801px)"),changed=()=>setWide(media.matches);media.addEventListener("change",changed);return()=>media.removeEventListener("change",changed);},[]);
  const relevant=questions.filter(q=>q.relevant),unknown=relevant.filter(q=>q.unknown),known=relevant.filter(q=>!q.unknown);
  const retained=questions.filter(q=>!q.relevant&&!q.retired&&(q.overridden||!q.unknown));
  const previous=questions.filter(q=>q.retired&&(q.overridden||!q.unknown));
  function reset(e,q,action){e.currentTarget.closest("details").open=false;action(q.id);}
  function rows(items){return <div className="funding-answer-list">{items.map(q=><article className="funding-answer-row" data-question-id={q.id} key={q.id}>
    <strong title={q.label}>{q.short_label}</strong><span className="funding-answer-value">{q.type==="selection"?"See route scores above":q.unknown?"Not entered":q.display_value}</span>
    <details className="funding-answer-origin"><summary>Source context</summary><p>{q.provenance.detail}</p><p>Initial: {q.initial_label}</p>{q.provenance.parcel_ids.map(id=><button type="button" key={id} onClick={()=>onParcel(id)}>Open parcel record</button>)}</details>
    <details className="funding-answer-actions" open={wide?true:undefined}><summary>Edit / reset</summary><div><button type="button" disabled={disabled} onClick={e=>onEdit(q.id,e.currentTarget)}>{q.type==="selection"?"Open in graph":"Edit"}</button>{q.type!=="selection"&&<details className="funding-answer-reset"><summary>Reset</summary><div><button type="button" disabled={disabled||explicitlyUnknown(q)} onClick={e=>reset(e,q,onUnknown)}>Clear value</button><button type="button" disabled={disabled||!q.overridden} onClick={e=>reset(e,q,onRestore)}>Restore initial: {q.initial_label}</button></div></details>}</div></details>
  </article>)}</div>;}
  return <details className="panel funding-answers" open={open} onToggle={e=>onOpen(e.currentTarget.open)}><summary>Project context</summary>
    <p className="funding-answer-intro">Review activity, applicant, site and land-rights inputs. Source context and original values remain available.</p>
    {selectionScores!==null&&<section className="funding-selection-summary" aria-label="AL20 selection assessments"><h3>AL20 selection assessments</h3>{Object.entries(selectionScores).map(([id,score])=><p key={id} data-selection-route={id}><span><strong>{id}</strong> · {selectionSummary(score)}</span><button type="button" disabled={disabled} onClick={e=>onSelection(id,e.currentTarget)}>Open in graph</button></p>)}</section>}
    {rows(known)}<details><summary>Inputs to add ({unknown.length})</summary>{rows(unknown)}</details>
    {retained.length>0&&<details><summary>Other activity answers ({retained.length})</summary>{rows(retained)}</details>}
    {previous.length>0&&<details><summary>Previous catalogue answers ({previous.length}) — retained for traceability</summary>{rows(previous)}</details>}
  </details>;
}
