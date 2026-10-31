import React from "react";
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

export function FundingAnswers({questions,open,onOpen,onEdit,onUnknown,onRestore,disabled}){
  const relevant=questions.filter(q=>q.relevant),unknown=relevant.filter(q=>q.unknown),known=relevant.filter(q=>!q.unknown);
  const retained=questions.filter(q=>!q.relevant&&(q.overridden||!q.unknown));
  function rows(items){return <div className="funding-answer-list">{items.map(q=><article className="funding-answer-row" data-question-id={q.id} key={q.id}><strong>{q.label}</strong><span>{q.display_value}</span><small>{q.origin}</small>{!q.relevant&&<small>Outside the current activity’s question flow</small>}<div className="funding-actions"><button type="button" disabled={disabled} onClick={()=>onEdit(q.id)}>Edit</button><button type="button" disabled={disabled||explicitlyUnknown(q)} onClick={()=>onUnknown(q.id)}>Set to Unknown</button><button type="button" disabled={disabled||!q.overridden} onClick={()=>onRestore(q.id)}>Restore initial: {q.initial_label}</button></div></article>)}</div>;}
  return <details className="panel funding-answers" open={open} onToggle={e=>onOpen(e.currentTarget.open)}><summary>Your answers and assumptions · {known.filter(q=>q.overridden).length} chosen · {known.filter(q=>!q.overridden).length} inherited · {unknown.length} unknown</summary>
    <p>Review or reset any input directly. Inherited values may include planning defaults. Unknown clears an assumption; Restore initial returns to the captured baseline.</p>
    {rows(known)}<details><summary>Unknown questions ({unknown.length})</summary>{rows(unknown)}</details>
    {retained.length>0&&<details><summary>Other activity answers ({retained.length})</summary>{rows(retained)}</details>}
  </details>;
}
