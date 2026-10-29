import React,{useEffect,useRef,useState} from "react";
import {money,year} from "./format.js";
import {Alert} from "./Alert.jsx";

export function DemonstratorRemoval({revision,busy,onPreview,onConfirm}){
  const [impact,setImpact]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const sequence=useRef(0),button=useRef(null),heading=useRef(null);
  const counted=(count,label)=>`${count} ${label}${count===1?"":"s"}`;
  useEffect(()=>{sequence.current++;setImpact(null);setLoading(false);setError("");return()=>{sequence.current++;};},[revision]);
  useEffect(()=>{if(impact!==null)heading.current.focus();},[impact]);
  async function preview(){
    const token=++sequence.current;setLoading(true);setError("");
    try{const result=await onPreview();if(token===sequence.current)setImpact({...result,request_id:crypto.randomUUID()});}
    catch(e){if(token===sequence.current)setError(e.message);}
    finally{if(token===sequence.current)setLoading(false);}
  }
  function cancel(){sequence.current++;setImpact(null);setLoading(false);setError("");button.current.focus();}
  async function confirm(){
    setError("");
    try{const result=await onConfirm(impact);if(!result.ok)setError(result.error);}
    catch(e){setError(e.message);}
  }
  return <div className="parcel-removal demonstrator-removal">
    <button ref={button} type="button" className="remove-parcel" disabled={busy||loading} aria-expanded={impact!==null} aria-controls={impact===null?undefined:"demonstrator-removal-preview"} onClick={preview}>Remove demonstrator…</button>
    {loading&&<p role="status">Checking the demonstrator and dependent choices…</p>}
    {error!==""&&<Alert variant="error" title="Removal not completed"><p>{error}</p>{impact===null&&<button type="button" disabled={busy||loading} onClick={preview}>Retry removal preview</button>}</Alert>}
    {impact!==null&&<section id="demonstrator-removal-preview" className="parcel-removal-preview app-alert app-alert--danger" aria-labelledby="demonstrator-removal-title" onKeyDown={e=>{if(e.key==="Escape"&&!busy){e.preventDefault();e.stopPropagation();cancel();}}}>
      <h3 ref={heading} id="demonstrator-removal-title" tabIndex={-1}>{impact.title}: {impact.name}</h3>
      <p>{impact.explanation}</p>
      {!impact.can_remove&&<Alert variant="warning" title="Land records depend on this demonstrator">{impact.blocked_reason}</Alert>}
      <details open><summary>Choices to remove ({impact.removed_actions.length})</summary><ul>{impact.removed_actions.map((action,index)=><li key={index}><strong>{action.title}</strong> · year {year(action.year)}<br/>{action.reason}</li>)}</ul></details>
      {impact.can_remove&&<dl className="removal-costs"><div><dt>Cash after rebuilding</dt><dd>{money(impact.cash_after)}</dd></div><div><dt>Cash adjustment</dt><dd>{money(impact.cash_change)}</dd></div><div><dt>Project year before → after</dt><dd>{year(impact.year_before)} → {year(impact.year_after)}</dd></div></dl>}
      <p>{impact.can_remove?`${counted(impact.remaining_parcels,"parcel")} and ${counted(impact.preserved_designs,"saved site design")} will remain.`:"No records will be removed while the land dependency remains."}</p>
      <p>{impact.planning_preserved?"Your planning draft stays available for reworking.":"No saved planning draft exists. You can start again in Site Designer."}</p>
      {impact.can_remove&&impact.removed_applied_snapshots>0&&<p>Saved copies attached to the committed plans will also be removed. Named saved designs are kept.</p>}
      <p className="muted">{impact.undo_notice}</p>
      <div className="form-actions"><button type="button" className="remove-parcel" disabled={busy||loading||!impact.can_remove} onClick={confirm}>Confirm removal</button><button type="button" disabled={busy} onClick={cancel}>Cancel</button></div>
    </section>}
  </div>;
}
