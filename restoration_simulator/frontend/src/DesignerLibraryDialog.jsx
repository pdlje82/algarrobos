import React, { useEffect, useRef } from "react";

export function DesignerLibraryDialog({ dialog, busy, error, limit, canSave, onCancel, onName, onSubmit, onSaveBefore, onDiscard }) {
  const ref=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement, node=ref.current;
    node.showModal();
    return ()=>{if(node.open)node.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
  },[]);
  const title=dialog.kind==="unsaved"?"Unsaved design changes":dialog.kind==="delete"?"Delete saved design?":dialog.operation==="rename"?"Rename design":dialog.copy?"Save design as":"Save design";
  return <dialog ref={ref} className="designer-library-dialog" aria-labelledby="designer-library-dialog-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}>
    <h2 id="designer-library-dialog-title">{title}</h2>
    {error&&<p className="error" role="alert">{error}</p>}
    {dialog.kind==="name"?<form onSubmit={e=>{e.preventDefault();onSubmit();}}>
      <label>Design name<input autoFocus value={dialog.name} maxLength={limit} required onChange={e=>onName(e.target.value)}/></label>
      <div className="designer-dialog-actions"><button type="submit" disabled={busy||dialog.name.trim().length===0}>{dialog.operation==="rename"?"Rename":"Save"}</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
    </form>:dialog.kind==="unsaved"?<>
      <p>Save changes to “{dialog.name}” before {dialog.action.operation==="new"?"starting a new design":dialog.action.operation==="reload"?"reloading":"loading another design"}?</p>
      {!canSave&&<p>Use or discard pending diameter edits and finish incomplete plant inputs before saving. Choose Cancel to return to them, or Discard to continue without them.</p>}
      <div className="designer-dialog-actions"><button type="button" disabled={busy||!canSave} onClick={onSaveBefore}>Save</button><button type="button" disabled={busy} onClick={onDiscard}>Discard</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
    </>:<>
      <p>Delete “{dialog.name}” from this project's saved designs?</p>
      {dialog.unsaved&&<p>Its current unsaved edits will also be discarded.</p>}
      <p>Any already applied demonstrator plan is retained.</p>
      <div className="designer-dialog-actions"><button type="button" className="remove-parcel" disabled={busy} onClick={onSubmit}>Delete design</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
    </>}
  </dialog>;
}

