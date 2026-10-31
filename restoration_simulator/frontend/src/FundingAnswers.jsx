import React, {useEffect,useState} from "react";
import {FundingHelp} from "./FundingHelp.jsx";
import {applicantKey,explicitlyUnknown} from "./fundingState.js";

export function ApplicantPicker({question:q,value,onChange,disabled=false,review=false}){
  const known=q.options.some(o=>applicantKey(o.choice)===applicantKey(value));
  const key=known?applicantKey(value):value===null?"":"potential:";
  const groups=[...new Set(q.options.map(o=>o.group))];
  return <><select id="funding-applicant_choice" value={key} disabled={disabled} onChange={e=>{const option=q.options.find(o=>applicantKey(o.choice)===e.target.value);if(!option)throw Error("Unknown applicant option.");onChange(option.choice);}}>
    {review&&<option value="" disabled>Choose which applicant you mean</option>}
    {groups.map(group=><optgroup key={group} label={group}>{q.options.filter(o=>o.group===group).map(o=><option key={applicantKey(o.choice)} value={applicantKey(o.choice)}>{o.label}</option>)}</optgroup>)}
  </select>{value?.kind==="potential"&&!["nonprofit","public"].includes(value.legal_form)&&<label htmlFor="funding-applicant-other-form">Hypothetical applicant type<select id="funding-applicant-other-form" value={value.legal_form===null?"":value.legal_form} disabled={disabled} onChange={e=>onChange({kind:"potential",legal_form:e.target.value===""?null:e.target.value})}><option value="">Unknown / not decided</option>{q.other_forms.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}</>;
}

export function FundingAnswers({questions,open,onOpen,onEdit,onUnknown,onRestore,onParcel,disabled}){
  const [wide,setWide]=useState(()=>matchMedia("(min-width:801px)").matches);
  useEffect(()=>{const media=matchMedia("(min-width:801px)"),changed=()=>setWide(media.matches);media.addEventListener("change",changed);return()=>media.removeEventListener("change",changed);},[]);
  const relevant=questions.filter(q=>q.relevant),unknown=relevant.filter(q=>q.unknown),known=relevant.filter(q=>!q.unknown);
  const retained=questions.filter(q=>!q.relevant&&!q.retired&&(q.overridden||!q.unknown));
  const previous=questions.filter(q=>q.retired&&(q.overridden||!q.unknown));
  function reset(e,q,action){e.currentTarget.closest("details").open=false;action(q.id);}
  function rows(items){return <div className="funding-answer-list">{items.map(q=><article className="funding-answer-row" data-question-id={q.id} key={q.id}>
    <strong title={q.label}>{q.short_label}</strong><span className="funding-answer-value">{q.display_value}</span>
    <span className="funding-answer-origin"><span className={`funding-origin-badge funding-origin-${q.unknown?"unknown":q.overridden?"assumed":"inherited"}`}>{q.unknown?"Unknown":q.overridden?"Assumed":"Inherited"}</span><FundingHelp label={`Origin of ${q.short_label}`} details={<><p>{q.provenance.detail}</p><p>Initial: {q.initial_label}</p>{q.provenance.parcel_ids.map(id=><button type="button" key={id} onClick={()=>onParcel(id)}>Open parcel record</button>)}</>}>{q.origin}</FundingHelp></span>
    <details className="funding-answer-actions" open={wide?true:undefined}><summary>Edit / reset</summary><div><button type="button" disabled={disabled} onClick={e=>onEdit(q.id,e.currentTarget)}>{q.type==="selection"?"Open in graph":"Edit"}</button>{q.type!=="selection"&&<details className="funding-answer-reset"><summary>Reset</summary><div><button type="button" disabled={disabled||explicitlyUnknown(q)} onClick={e=>reset(e,q,onUnknown)}>Set to Unknown</button><button type="button" disabled={disabled||!q.overridden} onClick={e=>reset(e,q,onRestore)}>Restore initial: {q.initial_label}</button></div></details>}</div></details>
  </article>)}</div>;}
  return <details className="panel funding-answers" open={open} onToggle={e=>onOpen(e.currentTarget.open)}><summary>Your answers and assumptions · {known.filter(q=>q.overridden).length} assumed · {known.filter(q=>!q.overridden).length} inherited · {unknown.length} unknown</summary>
    <p className="funding-answer-intro">Inherited context may include planning defaults. Edit opens the full question; Reset offers Unknown or the captured initial value.</p>
    {rows(known)}<details><summary>Unknown questions ({unknown.length})</summary>{rows(unknown)}</details>
    {retained.length>0&&<details><summary>Other activity answers ({retained.length})</summary>{rows(retained)}</details>}
    {previous.length>0&&<details><summary>Previous catalogue answers ({previous.length}) — retained for traceability</summary>{rows(previous)}</details>}
  </details>;
}
