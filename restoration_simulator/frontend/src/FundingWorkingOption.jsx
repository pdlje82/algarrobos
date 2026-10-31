import React from "react";

// The input alone changes the working option. Text/card clicks never check it.
export function FundingWorkingOption({id,checked,onChange,group,compact=false}){
  return <div className={`funding-working-control${compact?" is-compact":""}`} onClick={e=>e.stopPropagation()}>
    <input type="radio" name={group} value={id} className="funding-working-radio" aria-label={`Work on ${id}`} checked={checked} onChange={()=>onChange(id)}/>
    <span>{compact?"Work":"Work on this option"}</span>
  </div>;
}
