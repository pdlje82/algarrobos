import React, { useEffect, useId, useRef, useState } from "react";

export function ApplyReadiness({readiness,onApply,onAction}){
  const [open,setOpen]=useState(false),host=useRef(null),trigger=useRef(null),id=useId();
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!host.current.contains(e.target))setOpen(false);};
    const escape=e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current.focus({preventScroll:true});}};
    document.addEventListener("pointerdown",outside);host.current.addEventListener("keydown",escape);
    const node=host.current;
    return()=>{document.removeEventListener("pointerdown",outside);node.removeEventListener("keydown",escape);};
  },[open]);
  return <div className="designer-apply-help" ref={host} onPointerEnter={e=>{if(e.pointerType!=="touch")setOpen(true);}} onPointerLeave={()=>{if(!host.current.contains(document.activeElement))setOpen(false);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
    <button type="button" disabled={!readiness.canApply} onClick={onApply} aria-describedby={open?id:undefined}>Use in demonstrator planning</button>
    <button type="button" className="designer-apply-help-trigger" ref={trigger} aria-expanded={open} aria-controls={id} onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)}>{readiness.canApply?"Ready to review":"Why unavailable?"}</button>
    {open&&<div id={id} className={`designer-apply-popover app-alert app-alert--${readiness.processing||readiness.canApply?"info":"warning"}`} role="region" aria-label="Transfer requirements">
      <strong className="app-alert-title">{readiness.canApply?"Ready to review":readiness.processing?"Updating design":"Before transferring"}</strong>
      {readiness.canApply?<p>Review the physical changes, then continue in Project planning. A demonstrator is created only after you commit its plan there.</p>:<ul>{readiness.reasons.map(reason=><li key={reason.id}>{reason.text}{reason.action!==null&&<button type="button" disabled={readiness.processing} onClick={()=>{setOpen(false);onAction(reason.action);}}>{reason.actionLabel}</button>}</li>)}</ul>}
    </div>}
  </div>;
}
