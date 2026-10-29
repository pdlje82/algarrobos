import React, { useEffect, useRef } from "react";
import { Alert } from "./Alert.jsx";

export function DesignerLibraryDialog({ dialog, busy, error, limit, canSave, onCancel, onName, onSubmit, onSaveBefore, onDiscard }) {
  const ref=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement, node=ref.current;
    node.showModal();
    return ()=>{if(node.open)node.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
  },[]);
  const title=dialog.kind==="reload"?"Reload saved design?":dialog.kind==="unsaved"?"Unsaved design changes":dialog.kind==="delete"?"Delete saved design?":dialog.operation==="rename"?"Rename design":dialog.copy?"Save design as":"Save design";
  const tone=["unsaved","reload"].includes(dialog.kind)?"app-alert app-alert--warning":dialog.kind==="delete"?"app-alert app-alert--danger":"";
  return <dialog ref={ref} className={`designer-library-dialog ${tone}`} aria-labelledby="designer-library-dialog-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}>
    <h2 id="designer-library-dialog-title">{tone!==""&&<span className="app-alert-icon" aria-hidden="true">{dialog.kind==="delete"?"! ":"⚠ "}</span>}{title}</h2>
    {error&&<Alert variant="error" title="Design action failed">{error}</Alert>}
    {dialog.kind==="name"?<form onSubmit={e=>{e.preventDefault();onSubmit();}}>
      <label>Design name<input autoFocus value={dialog.name} maxLength={limit} required onChange={e=>onName(e.target.value)}/></label>
      <div className="designer-dialog-actions"><button type="submit" disabled={busy||dialog.name.trim().length===0}>{dialog.operation==="rename"?"Rename":"Save"}</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
    </form>:dialog.kind==="reload"?<>
      <p>Discard changes and reload “{dialog.name}”?</p>
      <p>This restores its last saved version. Saving after Clear replaces that checkpoint; use Save as… to keep alternatives.</p>
      <div className="designer-dialog-actions"><button type="button" disabled={busy} onClick={onDiscard}>Reload saved version</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
    </>:dialog.kind==="unsaved"?<>
      <p>Save changes to “{dialog.name}” before {dialog.action.operation==="new"?"starting a new design":dialog.action.operation==="reload"?"reloading":"loading another design"}?</p>
      {!canSave&&<p>Finish, correct or discard pending diameter edits and incomplete plant inputs before saving. Choose Cancel to return to them, or Discard to continue without them.</p>}
      <div className="designer-dialog-actions"><button type="button" disabled={busy||!canSave} onClick={onSaveBefore}>Save</button><button type="button" disabled={busy} onClick={onDiscard}>Discard</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
    </>:<>
      <p>Delete “{dialog.name}” from this project's saved designs?</p>
      {dialog.unsaved&&<p>Its current unsaved edits will also be discarded.</p>}
      <p>Any already applied demonstrator plan is retained.</p>
      <div className="designer-dialog-actions"><button type="button" className="remove-parcel" disabled={busy} onClick={onSubmit}>Delete design</button><button type="button" disabled={busy} onClick={onCancel}>Cancel</button></div>
    </>}
  </dialog>;
}

