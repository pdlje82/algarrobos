import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlantChecklist } from "./PlantChecklist.jsx";
import { PlantPortrait, plantIllustration } from "./PlantPortrait.jsx";
import { GuideViews } from "./PlantingExplorer.jsx";
import guideData from "./carob-planting-guide.json";
import modelData from "./restoration-models.json";
import { validatePlantingGuide } from "./plantingGuide.js";
import { validateRestorationModels } from "./restorationModels.js";
import { ModelsBody } from "./RestorationModelExplorer.jsx";
import { Fields } from "./LandAccess.jsx";
import { money } from "./format.js";
import { required } from "./contracts.js";
import "./SiteDesigner.css";
import { DesignerPlan } from "./DesignerPlan.jsx";
import { DensityControl } from "./DensityControl.jsx";
import { DesignerLibraryDialog } from "./DesignerLibraryDialog.jsx";
import { PlantSymbol, PlantSymbolLegend } from "./PlantSymbol.jsx";
import { symbolForPlant } from "./plantSymbols.js";
import {DocumentLink} from "./DocumentLink.jsx";
import { DesignGuide, FeatureHelp, PocketHelp } from "./DesignerHelp.jsx";
import { designerHelp } from "./designerHelp.js";
import { createEditQueue, initialCrownEditor, sameCrownEditor, validCrownEditor } from "./dimensionEditor.js";
import { locatedPlantCounts } from "./designerInteractions.js";
import { Alert } from "./Alert.jsx";
import { displayPlant, plantNames } from "./plantNames.js";
import { PlantNames } from "./PlantNames.jsx";
import { applyReadiness } from "./applyReadiness.js";
import { ApplyReadiness } from "./ApplyReadiness.jsx";
import {PlantOrderList} from "./PlantOrderList.jsx";

export const DESIGNER_FIELDS = new Set(["parcel_id","restoration_area","vegetation_system","objective","water_plan","planting_method","plant_selection"]);

function NumberEdit({ label, value, onCommit, min = 0, max = 1000000, step = "any" }) {
  const display=v=>v===null?"":typeof v==="number"?String(Number(v.toFixed(3))):String(v);
  const [text,setText] = useState(display(value));
  const touched=useRef(false);
  useEffect(() => {setText(display(value));touched.current=false;},[value]);
  return <label>{label}<input type="number" value={text} min={min} max={max} step={step} onChange={e=>{setText(e.target.value);touched.current=true;}} onBlur={()=>{ const next=text===""?null:Number(text); if(touched.current&&next!==value){touched.current=false;onCommit(next);} }} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}} /></label>;
}

export function SiteDesigner({ data, request, onHandoff, beforeHandoff, active }) {
  required(typeof active==="boolean","Site Designer needs its workspace visibility state.");
  const [workspace,setWorkspace] = useState(null), [evaluation,setEvaluation] = useState(null);
  const [error,setError] = useState(""), [operationBusy,setBusy] = useState(false), [message,setMessage] = useState("");
  const [queuedEdits,setQueuedEdits]=useState(0);
  const busy=operationBusy||queuedEdits>0;
  const editQueue=useRef(null);
  if(editQueue.current===null)editQueue.current=createEditQueue();
  const crownSubmissions=useRef(new Map());
  const [dirty,setDirty] = useState(false), [tab,setTab] = useState("Zone"), [selection,setSelection] = useState(null);
  const [locatedSpecies,setLocatedSpecies]=useState(null);
  const [reveal,setReveal]=useState(null),revealCount=useRef(0);
  function selectDrawing(id){
    setSelection(id);setReference(null);
    const instance=state.current.instances.find(p=>p.id===id);
    if(instance!==undefined){setTab("Plants");setReveal({species:instance.species,token:++revealCount.current});}
    else setReveal(null);
  }
  const locateSpecies=useCallback(id=>setLocatedSpecies(id),[]);
  const locatedExists=locatedSpecies!==null&&evaluation!==null&&workspace!==null&&(workspace.catalogue.plants.some(p=>p.id===locatedSpecies)||evaluation.draft.selection.entries.some(p=>p.id===locatedSpecies));
  const highlightedSpecies=active&&tab==="Plants"&&locatedExists?locatedSpecies:null;
  const [failedEdit,setFailedEdit]=useState(false), [editorEpoch,setEditorEpoch]=useState(0);
  const [cartEdit,setCartEdit] = useState(null);
  const [crownEdits,setCrownEdits] = useState({});
  const [crownErrors,setCrownErrors]=useState({});
  const hasCrownEdits=Object.keys(crownEdits).length>0;
  const crownEditsRef=useRef(crownEdits);crownEditsRef.current=crownEdits;
  const cartTimer=useRef(null);
  const [pending,setPending] = useState(null), [review,setReview] = useState(null), [reference,setReference] = useState(null);
  const [zoom,setZoom] = useState(1), [pan,setPan] = useState({x:0,y:0});
  const [showRoots,setShowRoots]=useState(true), [showCrowns,setShowCrowns]=useState(true), [showClearance,setShowClearance]=useState(false);
  const history=useRef({undo:[],redo:[]}), savedDraft=useRef(null), lastCommand=useRef(null);
  const [libraryDialog,setLibraryDialog]=useState(null), [dialogError,setDialogError]=useState("");
  const lastRetry=useRef(null), mutationAttempt=useRef(null);
  const libraryError=useRef(false);
  const libraryMenu=useRef(null);
  const designerHost=useRef(null),saveButton=useRef(null);
  const [,renderHistory]=useState(0);
  const requestBusy = useRef(false), state = useRef(null), epoch = useRef(0), modelsTrigger = useRef(null);
  const projectId = data.project.id;
  async function load() {
    const token=++epoch.current; lastCommand.current=null;setBusy(true); setError("");
    try { const result=await request("designer"); required(result.evaluation?.draft && Array.isArray(result.fields),"Missing designer contract. Restart Python and reload.");
      if(token!==epoch.current)return;
      setWorkspace(result);setEvaluation(result.evaluation);state.current=result.evaluation;setDirty(false);setReview(null);setPending(null);
      savedDraft.current=JSON.stringify(result.evaluation.draft);history.current={undo:[],redo:[]};renderHistory(v=>v+1);setCartEdit(null);setCrownInputs(()=>({}));setCrownErrors({});setSelection(null);setFailedEdit(false);setEditorEpoch(v=>v+1);
    } catch(e){if(token===epoch.current)setError(e.message);} finally{if(token===epoch.current)setBusy(false);}
  }
  useEffect(()=>{load();return()=>{epoch.current++;clearTimeout(cartTimer.current);};},[projectId]);
  useEffect(()=>{
    if(!dirty&&cartEdit===null&&!failedEdit&&!hasCrownEdits)return;
    const warn=e=>{e.preventDefault();e.returnValue="";};
    window.addEventListener("beforeunload",warn);
    return ()=>window.removeEventListener("beforeunload",warn);
  },[dirty,cartEdit,failedEdit,hasCrownEdits]);
  // External project actions require an explicit reload; never replace an unsaved draft.
  const stale=workspace!==null && workspace.project_revision!==data.revision;
  function accept(next,record=true){if(record&&state.current!==null){history.current.undo.push(state.current);history.current.redo=[];}setEvaluation(next);state.current=next;setDirty(JSON.stringify(next.draft)!==savedDraft.current);setReview(null);setPending(null);setError("");setCartEdit(null);if(next.draft.version>=2)setMessage(next.message);renderHistory(v=>v+1);}
  async function travel(direction){if(requestBusy.current||history.current[direction].length===0)return;lastCommand.current=null;requestBusy.current=true;setBusy(true);setError("");try{const source=history.current[direction];const next=await request("designer/preview",{revision:data.revision,draft:source[source.length-1].draft});history.current[direction==="undo"?"redo":"undo"].push(state.current);source.pop();accept(next,false);setMessage(direction==="undo"?"Previous design restored.":"Design change restored.");}catch(e){setError(e.message);}finally{requestBusy.current=false;setBusy(false);}}
  function editCart(value){setCartEdit(value);setDirty(true);setReview(null);clearTimeout(cartTimer.current);cartTimer.current=setTimeout(()=>command({kind:"selection",selection:value}),350);}
  function command(cmd) {
    const token=epoch.current;
    setQueuedEdits(n=>n+1);
    return editQueue.current(async()=>{
      if(token!==epoch.current)return false; // Explicit workspace replacement cancelled this old edit.
      return executeCommand(cmd);
    }).finally(()=>setQueuedEdits(n=>n-1));
  }
  async function executeCommand(cmd) {
    if(requestBusy.current){lastCommand.current=cmd;lastRetry.current=()=>command(cmd);setError("Another operation is in progress. Your edit is retained; retry after it finishes.");setFailedEdit(true);return false;}
    const crown=cmd.kind==="dimension"&&cmd.feature==="crown";
    if(crown&&cmd.value!==null&&sameCrownEditor({...cmd.value,diameter:String(cmd.value.diameter)},initialCrownEditor(state.current.display.crown_editors[cmd.id]))){
      const input=crownEditsRef.current[cmd.id];
      if(input!==undefined&&sameCrownEditor(input,{...cmd.value,diameter:String(cmd.value.diameter)}))discardCrownEdit(cmd.id);
      return true;
    }
    requestBusy.current=true;setBusy(true);setError("");setMessage("");
    const token=epoch.current;
    lastCommand.current=cmd;lastRetry.current=crown&&cmd.value!==null?()=>completeCrown(cmd.id):()=>command(cmd);libraryError.current=false;
    try { const next=await request("designer/preview",{revision:data.revision,draft:state.current.draft,command:cmd});
      if(token!==epoch.current)return false;
      setFailedEdit(false);if(cmd.kind==="upgrade_rules")setPending(next);else accept(next);
      if(cmd.kind==="clear"){setSelection(null);setReference(null);setCrownInputs(()=>({}));setCrownErrors({});}
      if(cmd.kind==="dimension"&&cmd.feature==="crown"&&cmd.value!==null){
        const input=crownEditsRef.current[cmd.id];
        if(input!==undefined&&Number(input.diameter)===cmd.value.diameter&&input.basis===cmd.value.basis&&input.note===cmd.value.note)discardCrownEdit(cmd.id);
      }
      return true;
    } catch(e){if(token===epoch.current){setError(e.message);setFailedEdit(true);if(crown)setCrownErrors(values=>({...values,[cmd.id]:e.message}));}return false;} finally{requestBusy.current=false;if(token===epoch.current)setBusy(false);}
  }
  function setCrownInputs(update){const next=update(crownEditsRef.current);crownEditsRef.current=next;setCrownEdits(next);}
  function discardCrownEdit(id){
    setCrownInputs(values=>{const next={...values};delete next[id];return next;});
    setCrownErrors(values=>{const next={...values};delete next[id];return next;});
    const last=lastCommand.current;
    if(last!==null&&last.kind==="dimension"&&last.feature==="crown"&&last.id===id){setError("");setFailedEdit(false);lastRetry.current=null;}
  }
  function editCrown(id,value){
    const baseline=initialCrownEditor(state.current.display.crown_editors[id]);
    if(sameCrownEditor(value,baseline)&&!crownSubmissions.current.has(id))discardCrownEdit(id);
    else setCrownInputs(values=>({...values,[id]:value}));
    setCrownErrors(values=>{const next={...values};delete next[id];return next;});
    setReview(null);
  }
  function completeCrown(id,value=crownEditsRef.current[id]){
    if(value===undefined)return Promise.resolve(true); // No changed field to submit.
    if(!validCrownEditor(value)){
      setCrownErrors(values=>({...values,[id]:"Enter a diameter greater than 0 and no more than 200 m, choose a dimension basis, and keep the note within 500 characters."}));
      return Promise.resolve(false);
    }
    const signature=JSON.stringify([id,Number(value.diameter),value.basis,value.note]);
    const latest=crownSubmissions.current.get(id);
    if(latest!==undefined&&latest.signature===signature)return latest.promise;
    const result=command({kind:"dimension",id,feature:"crown",value:{diameter:Number(value.diameter),basis:value.basis,note:value.note}}).finally(()=>{
      if(crownSubmissions.current.get(id)?.promise===result)crownSubmissions.current.delete(id);
    });
    crownSubmissions.current.set(id,{signature,promise:result});
    return result;
  }
  function inspectSpecies(id){setReveal(null);setSelection(`species:${id}`);setReference(null);}
  async function placeNext(id){
    if(await command({kind:"position",id,x:state.current.width/2,y:state.current.height/2})){
      setSelection(id);setReference(null);
      requestAnimationFrame(()=>{const node=document.querySelector(`[data-instance="${CSS.escape(id)}"]`);if(node!==null)node.focus({preventScroll:true});});
    }
  }
  function mutationBody(fields,base) {
    const content={...fields,revision:data.revision,design_revision:base.design_revision};
    const key=JSON.stringify(content);
    if(mutationAttempt.current!==null&&mutationAttempt.current.key===key)return mutationAttempt.current.body;
    const body={...content,request_id:crypto.randomUUID()};
    mutationAttempt.current={key,body};return body;
  }
  function acceptWorkspace(result,resetHistory) {
    setWorkspace(result);setEvaluation(result.evaluation);state.current=result.evaluation;
    savedDraft.current=JSON.stringify(result.evaluation.draft);setDirty(false);setError("");setDialogError("");setFailedEdit(false);libraryError.current=false;
    setReview(null);setPending(null);setCartEdit(null);clearTimeout(cartTimer.current);
    if(resetHistory){setCrownInputs(()=>({}));setCrownErrors({});history.current={undo:[],redo:[]};renderHistory(v=>v+1);setEditorEpoch(v=>v+1);setSelection(null);setReference(null);setPan({x:0,y:0});setZoom(1);setTab("Zone");}
    if(resetHistory)setReveal(null);
  }
  async function persistSave(spec,continuation=null) {
    if(Object.keys(crownEditsRef.current).length>0){setDialogError("Finish, correct or discard pending diameter edits before saving.");setMessage("Finish, correct or discard pending diameter edits before saving.");return false;}
    if(requestBusy.current)return false;
    lastCommand.current=null;requestBusy.current=true;setBusy(true);setError("");setDialogError("");
    lastRetry.current=()=>persistSave(spec,continuation);
    let result=null;
    try{
      result=await request("designer/save",mutationBody({draft:state.current.draft,...spec},workspace));
      mutationAttempt.current=null;acceptWorkspace(result,false);setLibraryDialog(null);
      setMessage("Design saved. Simulation time, cash and history are unchanged.");
    }catch(e){libraryError.current=true;setError(e.message);setDialogError(e.message);}
    finally{requestBusy.current=false;setBusy(false);}
    if(result!==null&&continuation!==null)return performLibrary(continuation,result);
    return result!==null;
  }
  function beginSave(copy=false,continuation=null) {
    setDialogError("");
    if(copy||workspace.active_design_id===null){
      setLibraryDialog({kind:"name",operation:"create",copy,name:workspace.suggested_name,continuation});
    }else{
      persistSave({mode:"update",design_id:workspace.active_design_id,name:null},continuation);
    }
  }
  async function performLibrary(action,base=workspace) {
    if(requestBusy.current)return false;
    if(action.operation==="reload"){setLibraryDialog(null);await load();return true;}
    lastCommand.current=null;requestBusy.current=true;setBusy(true);setError("");setDialogError("");clearTimeout(cartTimer.current);
    lastRetry.current=()=>performLibrary(action);
    try{
      const result=await request("designer/library",mutationBody(action,base));
      mutationAttempt.current=null;
      if(action.operation==="rename"){
        // Renaming metadata must never replace local unsaved geometry or inputs.
        setWorkspace(result);setError("");setDialogError("");
      }else acceptWorkspace(result,true);
      setLibraryDialog(null);setMessage(action.operation==="new"?"New empty design. Save it under a name when ready.":action.operation==="load"?"Saved design loaded.":action.operation==="rename"?"Design renamed.":"Saved design deleted.");
      return true;
    }catch(e){libraryError.current=true;setError(e.message);setDialogError(e.message);return false;}
    finally{requestBusy.current=false;setBusy(false);}
  }
  function requestLibraryAction(action) {
    setDialogError("");
    if(dirty||cartEdit!==null||failedEdit||hasCrownEdits){
      const active=workspace.library.find(r=>r.id===workspace.active_design_id);
      setLibraryDialog({kind:"unsaved",name:active===undefined?workspace.library_defaults.unnamed_label:active.name,action});
    }else performLibrary(action);
  }
  function reloadSavedDesign(){
    const action={operation:"load",design_id:workspace.active_design_id,name:null,confirm:false};
    required(workspace.active_design_id!==null,"Save a named design before reloading it.");
    setDialogError("");
    if(dirty||cartEdit!==null||failedEdit||hasCrownEdits||error!==""){
      const record=workspace.library.find(r=>r.id===workspace.active_design_id);
      required(record!==undefined,"The active saved design is missing from the library.");
      setLibraryDialog({kind:"reload",name:record.name,action});
    }else performLibrary(action);
  }
  function focusApplyAction(action){
    if(action==="save"){saveButton.current.focus({preventScroll:true});saveButton.current.scrollIntoView({block:"nearest"});return;}
    if(action==="reload_project"){requestLibraryAction({operation:"reload"});return;}
    if(action==="parcel")setTab("Zone");
    if(action==="plants")setTab("Plants");
    if(action==="diameter"){const id=Object.keys(crownEditsRef.current)[0];required(id!==undefined,"No pending diameter edit to open.");inspectSpecies(id);}
    requestAnimationFrame(()=>{
      const host=designerHost.current;
      const selectors={parcel:'#field-parcel_id',plants:'.designer-controls input[type="search"]',diameter:'.crown-editor input',rules:'.designer-review button',failed:'.app-alert--error button, .designer-pending-dimensions button, .app-alert--error'};
      required(Object.hasOwn(selectors,action),"Unknown Apply guidance action.");
      const target=host.querySelector(selectors[action]);
      if(target===null){setError("The requested design control is unavailable. Reload the frontend to restore its controls.");return;}
      if(!target.matches('button,input,select,textarea,a,[tabindex]'))target.tabIndex=-1;
      target.focus({preventScroll:true});target.scrollIntoView({block:"nearest"});
    });
  }
  function closeLibraryMenu(){const menu=libraryMenu.current;menu.open=false;menu.querySelector("summary").focus();}
  function nameSubmit() {
    if(libraryDialog.operation==="rename"){
      performLibrary({operation:"rename",design_id:workspace.active_design_id,name:libraryDialog.name,confirm:false});
    }else if(libraryDialog.kind==="delete"){
      performLibrary({operation:"delete",design_id:workspace.active_design_id,name:null,confirm:true});
    }else persistSave({mode:"create",design_id:null,name:libraryDialog.name},libraryDialog.continuation);
  }
  async function importPlan(){if(busy)return;lastCommand.current=null;setBusy(true);setError("");try{const next=await request("designer/import-plan",{revision:data.revision,action_id:"demonstrator",inputs:{}});accept(next);setMessage("Recorded plants and prices imported. Coordinates are new assumptions.");}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function previewApply(){if(hasCrownEdits)return;lastCommand.current=null;setBusy(true);setError("");try{
    const planning=await beforeHandoff();if(planning===false)throw new Error("Save or retry unfinished Project planning edits before transferring this design.");
    lastRetry.current=previewApply;
    const result=await request("designer/handoff-preview",{revision:data.revision,design_revision:workspace.design_revision,planning_revision:planning.planning_revision});setReview({...result,request_id:crypto.randomUUID()});
  }catch(e){setError(e.message);}finally{setBusy(false);}}
  async function apply(){lastCommand.current=null;lastRetry.current=apply;setBusy(true);setError("");try{const result=await request("designer/handoff",{revision:data.revision,design_revision:workspace.design_revision,planning_revision:review.planning.planning_revision,request_id:review.request_id});setReview(null);onHandoff(result);}catch(e){setError(e.message);}finally{setBusy(false);}}
  if(workspace===null || evaluation===null)return <section className="panel"><h1>Site Designer</h1>{error?<><p className="error" role="alert">{error}</p><button onClick={load}>Retry loading designer</button></>:<p>Opening the planting workspace…</p>}</section>;
  const draft=evaluation.draft, bundle=draft.bundle;
  const modern=draft.version>=2, editable=draft.version===3;
  const activeDesign=workspace.library.find(r=>r.id===workspace.active_design_id);
  const designName=activeDesign===undefined?workspace.library_defaults.unnamed_label:activeDesign.name;
  const libraryBlocked=busy||stale||pending!==null||review!==null;
  const patch=(section,values)=>command({kind:"patch",section,values});
  const toggle=(collection,id,enabled)=>command({kind:"toggle",collection,id,enabled});
  const field=workspace.fields.find(f=>f.name==="plant_selection");
  required(field!==undefined,"Python did not provide the priced plant catalogue.");
  const selected=evaluation.instances.find(p=>p.id===selection);
  const selectedSpecies=selected!==undefined?selected.species:selection!==null&&selection.startsWith("species:")&&modern&&Object.hasOwn(evaluation.overlays,selection.slice(8))?selection.slice(8):null;
  const species=selectedSpecies===null?null:workspace.catalogue.plants.find(p=>p.id===selectedSpecies);
  const selectedRow=selectedSpecies===null?null:modern?draft.preferences[selectedSpecies].entry:draft.selection.entries.find(p=>p.id===selectedSpecies);
  const selectedDensity=modern&&selectedSpecies!==null?evaluation.species.find(p=>p.id===selectedSpecies):null;
  const displaySelection=modern?{version:2,entries:evaluation.species.map(p=>p.entry)}:draft.selection;
  const planCatalogue=[...workspace.catalogue.plants.map(displayPlant),...draft.selection.entries.filter(p=>p.id.startsWith("custom-"))];
  function plantName(id){const plant=workspace.catalogue.plants.find(p=>p.id===id);if(plant!==undefined)return plantNames(id).spanish;if(modern&&draft.legacy_exclusions.includes(id)&&!Object.hasOwn(draft.preferences,id))return "Legacy custom plant — name not recorded";required(modern&&id.startsWith("custom-")&&Object.hasOwn(draft.preferences,id),`Missing plant identity for ${id}.`);return draft.preferences[id].entry.label;}
  const readiness=applyReadiness({busy,stale,available:workspace.available,reason:workspace.reason,saved:workspace.saved,dirty,failedEdit,error,pendingRules:pending!==null,plantInputs:cartEdit!==null,diameterInputs:hasCrownEdits,plants:evaluation.summary.plants,parcel:draft.physical.parcel_id});
  const physicalFields=workspace.fields.filter(f=>DESIGNER_FIELDS.has(f.name)&&!["restoration_area","plant_selection"].includes(f.name));
  return <section ref={designerHost} className="site-designer" aria-labelledby="designer-title">
    <header className="designer-header"><div><p className="eyebrow">An editable example · no suitability forecast</p><h1 id="designer-title">Site Designer</h1><p>Assumed geometry · planting zone only</p></div>
      <div className="designer-actions"><button type="button" ref={saveButton} disabled={busy||stale||error!==""||failedEdit||cartEdit!==null||hasCrownEdits||pending!==null||(!dirty&&workspace.saved)} onClick={()=>beginSave()}>Save</button><button type="button" disabled={libraryBlocked||cartEdit!==null||hasCrownEdits||failedEdit||error!==""} onClick={()=>beginSave(true)}>Save as…</button><button type="button" disabled={libraryBlocked} onClick={()=>requestLibraryAction({operation:"new",design_id:null,name:null,confirm:false})}>New design</button><ApplyReadiness readiness={readiness} onApply={previewApply} onAction={focusApplyAction}/>
        <button type="button" disabled={busy||stale||cartEdit!==null||history.current.undo.length===0} onClick={()=>travel("undo")}>Undo</button><button type="button" disabled={busy||stale||cartEdit!==null||history.current.redo.length===0} onClick={()=>travel("redo")}>Redo</button>
        {workspace.saved?<a href={`/api/designer/report?design_id=${workspace.active_design_id}`} target="_blank" rel="noreferrer">Saved design report ↗</a>:<span className="muted">Save a named design to download its report</span>}</div></header>
    <div className="designer-library-toolbar">
      <label>Design<select value={workspace.active_design_id===null?"":workspace.active_design_id} disabled={libraryBlocked} onChange={e=>requestLibraryAction({operation:"load",design_id:e.target.value,name:null,confirm:false})}>
        {workspace.active_design_id===null&&<option value="" disabled>{workspace.library_defaults.unnamed_label}</option>}
        {workspace.library.map(record=><option key={record.id} value={record.id}>{record.name} · {record.area} m² · {record.plants} plants</option>)}
      </select></label>
      <button type="button" disabled={libraryBlocked||workspace.active_design_id===null} onClick={reloadSavedDesign}>Reload saved design</button>
      <details ref={libraryMenu} className="designer-library-menu"><summary>Design actions</summary><div>
        <button type="button" disabled={!editable||libraryBlocked||cartEdit!==null||failedEdit||hasCrownEdits} onClick={()=>{closeLibraryMenu();command({kind:"clear"});}}>Clear planting zone</button>
        <button type="button" disabled={libraryBlocked||!workspace.saved||cartEdit!==null||failedEdit} onClick={()=>{closeLibraryMenu();setDialogError("");setLibraryDialog({kind:"name",operation:"rename",name:designName});}}>Rename design</button>
        <button type="button" className="remove-parcel" disabled={libraryBlocked||!workspace.saved} onClick={()=>{closeLibraryMenu();setDialogError("");setLibraryDialog({kind:"delete",name:designName,unsaved:dirty||cartEdit!==null||failedEdit||hasCrownEdits});}}>Delete saved design</button>
      </div></details>
    </div>
    {libraryDialog!==null&&<DesignerLibraryDialog key={libraryDialog.kind+libraryDialog.operation} dialog={libraryDialog} busy={busy} error={dialogError} limit={workspace.library_defaults.name_limit} canSave={!hasCrownEdits&&!failedEdit&&cartEdit===null&&(error===""||libraryError.current)&&!stale} onCancel={()=>{setLibraryDialog(null);setDialogError("");if(libraryError.current){setError("");libraryError.current=false;}}} onName={name=>{setLibraryDialog(v=>({...v,name}));setDialogError("");}} onSubmit={nameSubmit} onSaveBefore={()=>beginSave(false,libraryDialog.action)} onDiscard={()=>performLibrary(libraryDialog.action)}/>}
    <Alert variant={busy?"info":(dirty||failedEdit||cartEdit!==null||hasCrownEdits)?"warning":workspace.saved?"success":"info"} title={busy?"Updating…":(dirty||failedEdit||cartEdit!==null||hasCrownEdits)?"Unsaved changes":workspace.saved?`Saved design · ${designName}`:"Unsaved design — save when ready"} className="designer-status">{message!==""&&<p>{message}</p>}</Alert>
    {hasCrownEdits&&<Alert variant="warning" title="Finish diameter edits" className="designer-pending-dimensions"><p>Finish, correct or discard diameter edits before Save or transfer to planning. Press Enter or leave the field to update its circle.</p>{Object.keys(crownEdits).map(id=><p key={id}>{plantName(id)}{modern&&Object.hasOwn(evaluation.overlays,id)&&<button type="button" onClick={()=>inspectSpecies(id)}>Open diameter for {plantName(id)}</button>}<button type="button" data-crown-action="discard" disabled={busy} onClick={()=>discardCrownEdit(id)}>Discard diameter edit for {plantName(id)}</button></p>)}</Alert>}
    {error&&<Alert variant="error" title="Design update failed"><p>{error} Your design remains visible.</p>{lastRetry.current!==null&&<button type="button" disabled={busy} onClick={()=>lastRetry.current()}>Retry</button>}</Alert>}
    {!editable&&<Alert variant="warning" title="Designer upgrade available"><p>This saved design uses the earlier designer. Review the upgrade to enable the new diameter defaults and tree–shrub placement. Its recorded plants, prices and positions will be retained.</p><button type="button" disabled={busy||stale} onClick={()=>command({kind:"upgrade_rules"})}>Review designer upgrade</button></Alert>}
    {cartEdit!==null&&<Alert variant="warning" title="Finish plant inputs"><p>Plant inputs are being edited. The plan retains its last valid preview.</p><button type="button" onClick={()=>{clearTimeout(cartTimer.current);setCartEdit(null);setError("");setFailedEdit(false);setDirty(JSON.stringify(state.current.draft)!==savedDraft.current);}}>Discard incomplete plant edits</button></Alert>}
    {stale&&<Alert variant="warning" title="Project changed"><p>Your draft is retained. Reload the saved designer before continuing.</p><button type="button" onClick={()=>requestLibraryAction({operation:"reload"})}>Reload saved designer</button></Alert>}
    {pending&&<Alert variant="warning" title="Review updated rules" announce={false} className="designer-review" role="region" aria-label="Review design changes">
      <ul>{pending.removed.map(p=><li key={p.id}>{plantName(p.id)}: {p.reason}</li>)}</ul><p>Current: {evaluation.summary.plants} plants · {money(evaluation.summary.plant_cost)}. Proposed: {pending.summary.plants} plants · {money(pending.summary.plant_cost)}. Manual overrides are retained.</p><details><summary>Rule changes</summary>{pending.draft.bundle.rules.filter(r=>JSON.stringify(r)!==JSON.stringify(bundle.rules.find(v=>v.id===r.id))).map(r=><p key={r.id}><strong>{r.title}</strong>: {r.description}</p>)}<p>Bundle: {bundle.manifest.ruleset_id} → {pending.draft.bundle.manifest.ruleset_id}. Geometry defaults and source register are included in the saved report.</p></details>
      <button type="button" onClick={()=>accept(pending)}>Confirm design changes</button> <button type="button" onClick={()=>{setPending(null);setCartEdit(null);}}>Keep current design</button></Alert>}
    {review&&<Alert variant="warning" title="Review transfer to planning" announce={false} className="designer-review" role="region" aria-label="Design transfer review"><p>{review.notice}</p>
      <p>{review.previous===null?"No previously selected planting list.":`Previous planting list: ${review.previous.plant_selection.entries.reduce((n,p)=>n+p.quantity,0)} plants on ${review.previous.restoration_area} m².`} New design: {evaluation.summary.trees} trees and {evaluation.summary.shrubs} shrubs / grasses on {draft.physical.restoration_area} m².</p>
      <p>Recorded plant subtotal: {money(evaluation.summary.plant_cost)}. Review the complete budget later in Project.</p>
      <PlantOrderList demonstrator={{status:"Not planned"}} planning={review.planning}/>
      <details><summary>Physical settings being transferred</summary><dl>{Object.entries(draft.physical).map(([k,v])=><React.Fragment key={k}><dt>{k.replaceAll("_"," ")}</dt><dd>{String(v)}</dd></React.Fragment>)}</dl></details>
      <button type="button" disabled={busy} onClick={apply}>Use design in planning</button> <button type="button" onClick={()=>setReview(null)}>Cancel</button></Alert>}
    <div className="designer-workspace">
      <aside className="designer-controls" aria-label="Design controls"><nav aria-label="Designer panels">{["Zone","Approaches","Plants","Establishment"].map(t=><button key={t} type="button" aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
        <fieldset key={editorEpoch} disabled={!editable||busy||stale||pending!==null||(cartEdit!==null&&tab!=="Plants")}><legend>{tab}</legend>
          {tab==="Zone"&&<><p>Choose an assumed rectangle. Proportions preserve area; this is not a survey.</p>
            <NumberEdit label="Planting area (m²)" value={draft.physical.restoration_area} min="0.01" onCommit={v=>patch("physical",{restoration_area:v})}/>
            <NumberEdit label="Width / height ratio" value={draft.zone.aspect} min="0.05" max="20" onCommit={v=>patch("zone",{aspect:v})}/>
            <NumberEdit label="Zone width (m, area fixed)" value={evaluation.width} min="0.01" onCommit={length=>command({kind:"resize",axis:"width",length})}/><NumberEdit label="Zone height (m, area fixed)" value={evaluation.height} min="0.01" onCommit={length=>command({kind:"resize",axis:"height",length})}/>
            <p>{evaluation.width.toFixed(2)} m × {evaluation.height.toFixed(2)} m</p>
            {modern&&evaluation.density_update!==null&&<Alert variant="warning" title="Area changed" className="density-update"><p>Current plants were retained. Previous density targets would give:</p><ul>{evaluation.density_update.map(p=><li key={p.id}>{plantName(p.id)}: {p.quantity} plants at requested {p.density.toFixed(2)}/ha</li>)}</ul><button type="button" onClick={()=>command({kind:"restore_densities"})}>Update plants to previous densities</button></Alert>}
            <label>Reference boundary side<select value={draft.zone.boundary_side} onChange={e=>patch("zone",{boundary_side:e.target.value})}>{bundle.defaults.boundary_sides.map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Reference boundary type<select value={draft.zone.boundary_type} onChange={e=>patch("zone",{boundary_type:e.target.value})}>{bundle.defaults.boundary_types.map(v=><option key={v}>{v}</option>)}</select></label>
            {draft.zone.boundary_type==="custom"&&<label>Boundary description<input value={draft.zone.boundary_custom} onChange={e=>patch("zone",{boundary_custom:e.target.value})}/></label>}
            <Fields fields={physicalFields.filter(f=>["parcel_id","objective","vegetation_system"].includes(f.name))} inputs={{...draft.physical,parcel_id:draft.physical.parcel_id===null?"":draft.physical.parcel_id}} onChange={next=>patch("physical",Object.fromEntries(["parcel_id","objective","vegetation_system"].map(k=>[k,k==="parcel_id"&&next[k]===""?null:next[k]])))} disabled={busy}/>
            <details><summary>Assumed site context</summary><NumberEdit label="Assumed annual rainfall (mm/year), blank if unknown" value={draft.site.rainfall} onCommit={v=>patch("site",{rainfall:v})}/><label>Soil context<select value={draft.site.soil} onChange={e=>patch("site",{soil:e.target.value})}>{["unknown","calcareous","siliceous","rocky / shallow","other"].map(v=><option key={v}>{v}</option>)}</select></label><p>Recorded assumptions only; no suitability score is calculated.</p></details>
            {workspace.can_import&&<button type="button" onClick={importPlan}>Create assumed layout from this plan</button>}
            <button type="button" onClick={()=>command({kind:"existing",plants:[...draft.existing,{id:crypto.randomUUID(),species:bundle.defaults.pocket_species,x:evaluation.width/2,y:evaluation.height/2,radius:bundle.defaults.footprint_radius}]})}>Add existing vegetation symbol</button>
            {draft.existing.map(p=><details key={p.id}><summary>Existing {plantName(p.species)}</summary><ExistingEditor plant={p} catalogue={workspace.catalogue.plants.map(displayPlant)} onChange={next=>command({kind:"existing",plants:draft.existing.map(v=>v.id===p.id?next:v)})}/><button type="button" onClick={()=>command({kind:"existing",plants:draft.existing.filter(v=>v.id!==p.id)})}>Remove existing symbol</button></details>)}
          </>}
          {tab==="Approaches"&&<><FeatureHelp id="approaches"/>{["mr1","mr2"].map(id=>{const r=bundle.rules.find(v=>v.id===id);return <label className="designer-choice" key={id}><input type="checkbox" checked={draft.approaches.includes(id)} onChange={e=>toggle("approaches",id,e.target.checked)}/><span><strong>{r.title}</strong><small>{designerHelp.rules[id].text}</small></span></label>;})}
            {editable&&!Object.hasOwn(bundle.defaults.placement,"treeless_series")&&<Alert variant="warning" title="Earlier series placement rules">Review with updated rules to allow new lentisco and coscoja series shrubs to stand alone without plotted trees. Existing positions will be retained.</Alert>}
            {evaluation.display.density_defaults!==null&&<p className="density-scenario">Algarrobo starts at {evaluation.display.density_defaults.carob}/ha in this design’s saved settings. Change its density below. See Design guide for density and spacing.</p>}
            {modern&&draft.approaches.length>0&&evaluation.species.some(p=>p.id==="carob")&&<div className="density-scenario"><strong>Algarrobo density for this design</strong><DensityControl row={evaluation.species.find(p=>p.id==="carob")} label="Algarrobo in approaches" disabled={busy||stale} onDensity={value=>command({kind:"density",id:"carob",value})} onStep={step=>command({kind:"density_step",id:"carob",step})}/></div>}
            {bundle.vegetation_combinations.filter(c=>!c.id.endsWith("_mix")).map(c=><div className="designer-combination" key={c.id}><label className="designer-choice"><input type="checkbox" checked={draft.combinations.includes(c.id)} onChange={e=>toggle("combinations",c.id,e.target.checked)}/><strong>{c.title}</strong></label><small>{designerHelp.combinations[c.id]===undefined?`Help unavailable for ${c.id}.`:designerHelp.combinations[c.id]}</small></div>)}
            {bundle.vegetation_combinations.filter(c=>draft.combinations.includes(c.id)||draft.approaches.some(id=>c.id===id+"_mix")).filter(c=>c.optional.length>0).map(c=><details key={c.id} open><summary>Optional companions · {c.title}</summary><p>{designerHelp.combinations[c.id]===undefined?`Help unavailable for ${c.id}.`:designerHelp.combinations[c.id]}</p>{c.optional.map(id=><label className="designer-choice" key={id}><input type="checkbox" checked={draft.optional_members.includes(id)} onChange={e=>toggle("optional_members",id,e.target.checked)}/>{plantIllustration(id).spanish_name}</label>)}</details>)}
            {draft.exclusions.length>0&&<details open><summary>Excluded from automatic suggestions ({draft.exclusions.length})</summary>{draft.exclusions.map(id=><p key={id}>{plantName(id)}{modern&&draft.legacy_exclusions.includes(id)?" · legacy persistent exclusion":""} <button type="button" onClick={()=>command({kind:"exclude",id,enabled:false})}>Allow suggestions</button></p>)}<button type="button" onClick={()=>command({kind:"reset_exclusions"})}>Clear all persistent exclusions</button></details>}<button type="button" ref={modelsTrigger} onClick={()=>setReference("models")}>Explore restoration models</button>
            <button type="button" disabled={!workspace.rules_update_available} onClick={()=>command({kind:"upgrade_rules"})}>Review with updated rules</button>
          </>}
          <div hidden={tab!=="Plants"}><PlantChecklist field={field} value={cartEdit===null?displaySelection:cartEdit} onChange={editCart} disabled={!editable||busy||stale} request={request} designerMode={modern} designer={modern?{species:evaluation.species,exclusions:draft.exclusions,defaults:editable?bundle.defaults.density_defaults:{tree:bundle.defaults.density_defaults.other,shrub:bundle.defaults.density_defaults.other,grass:bundle.defaults.density_defaults.other},placement:editable?evaluation.placement:null,command,inspectSpecies,combinations:bundle.vegetation_combinations}:undefined} selectedSpecies={selectedSpecies} reveal={reveal} onPlantInformation={()=>setReference("plant")} onLocate={locateSpecies} active={active&&tab==="Plants"}/></div>
          {tab==="Establishment"&&<><Fields fields={physicalFields.filter(f=>["water_plan","planting_method"].includes(f.name))} inputs={draft.physical} onChange={next=>patch("physical",Object.fromEntries(["water_plan","planting_method"].map(k=>[k,next[k]])))} disabled={busy}/>
            <label className="designer-choice"><input type="checkbox" checked={draft.pocket.enabled} onChange={e=>patch("pocket",{enabled:e.target.checked})}/>Assumed moisture pocket with example encina</label>
            {draft.pocket.enabled&&<><NumberEdit label="Pocket radius (m, assumed)" value={draft.pocket.radius} min="0.01" onCommit={v=>patch("pocket",{radius:v})}/><NumberEdit label="Pocket x (m)" value={draft.pocket.x} onCommit={v=>patch("pocket",{x:v})}/><NumberEdit label="Pocket y (m)" value={draft.pocket.y} onCommit={v=>patch("pocket",{y:v})}/><PocketHelp facts={evaluation.display.pocket} showCrowns={showCrowns}/></>}
            <label className="designer-choice"><input type="checkbox" checked={draft.mulch.enabled} onChange={e=>patch("mulch",{enabled:e.target.checked})}/>Surface mulch treatment</label>
            {draft.mulch.enabled&&<><label>Mulch type<select value={draft.mulch.type} onChange={e=>patch("mulch",{type:e.target.value})}>{bundle.treatments.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label><NumberEdit label="Mulch radius (m, assumed)" value={draft.mulch.radius} onCommit={v=>patch("mulch",{radius:v})}/><FeatureHelp id="mulch"/>{draft.selection.entries.map(p=><label className="designer-choice" key={p.id}><input type="checkbox" checked={draft.mulch.plant_ids.includes(p.id)} onChange={e=>patch("mulch",{plant_ids:e.target.checked?[...draft.mulch.plant_ids,p.id]:draft.mulch.plant_ids.filter(v=>v!==p.id)})}/>{plantName(p.id)}</label>)}</>}
            <button type="button" onClick={()=>setReference("plant")}>Algarrobo planting and establishment guidance</button>
          </>}
        </fieldset>
      </aside>
      <div className="designer-plan"><div className="designer-plan-tools"><strong>Top-down planting zone</strong><button type="button" onClick={()=>setZoom(v=>v*1.25)} aria-label="Zoom in">＋</button><button type="button" onClick={()=>setZoom(v=>v/1.25)} aria-label="Zoom out">−</button><button type="button" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}>Fit zone</button></div>
        {modern?<><div className="designer-overlay-controls"><label><input type="checkbox" checked={showRoots} onChange={e=>setShowRoots(e.target.checked)}/>Root balls at planting</label><label><input type="checkbox" checked={showCrowns} onChange={e=>setShowCrowns(e.target.checked)}/>Indicative mature crowns</label><details><summary>Advanced display</summary><label><input type="checkbox" checked={showClearance} onChange={e=>setShowClearance(e.target.checked)}/>Assumed layout clearance</label></details></div>
        <DesignerPlan evaluation={evaluation} catalogue={planCatalogue} selected={selection} highlightedSpecies={highlightedSpecies} onSelect={selectDrawing} onCommand={command} zoom={zoom} pan={pan} setPan={setPan} disabled={!editable||busy||stale||pending!==null||cartEdit!==null} showRoots={showRoots} showCrowns={showCrowns} showClearance={showClearance}/></>:<Plan evaluation={evaluation} selected={selection} onSelect={selectDrawing} onMove={()=>{}} zoom={zoom} pan={pan} setPan={setPan} disabled/>}
        <p className="designer-locate-status" role="status">{highlightedSpecies!==null&&(()=>{const counts=locatedPlantCounts(evaluation,highlightedSpecies);return `${plantName(highlightedSpecies)}: ${counts.placed} shown · ${counts.unplaced} unplaced${counts.placed===0?". None currently shown in the zone.":"."}`;})()}</p>
        {modern&&<PlantSymbolLegend plants={planCatalogue.filter(p=>draft.selection.entries.some(row=>row.id===p.id))}/>}
        <p className="designer-legend">{!modern&&<span>▲ Tree · ● Shrub/grass</span>}<span>◇ Existing vegetation</span><span>◌ Moisture pocket</span><span>▧ Surface mulch</span><span>Solid: root ball · Dashed: crown / plant diameter</span></p>{evaluation.summary.unplaced>0&&<div><strong>Unplaced plants</strong>{draft.selection.entries.filter(row=>evaluation.instances.filter(p=>p.species===row.id).length<row.quantity).map(row=>{const placed=new Set(evaluation.instances.filter(p=>p.species===row.id).map(p=>p.id));let i=0;while(placed.has(`${row.id}:${i}`))i++;return <p key={row.id}>{plantName(row.id)}: {row.quantity-placed.size} unplaced <button type="button" disabled={!editable||busy||i>=bundle.defaults.max_instances} onClick={()=>placeNext(`${row.id}:${i}`)}>Place next in zone</button></p>;})}</div>}<p className="muted">Drag blank ground to pan, edge handles to reshape, or the pocket outline to move it. Drag plants or focus a symbol and use arrow keys; Shift moves further and Escape cancels. Crown / plant circles are editable drawing estimates, not growth forecasts. Only new plants are positioned automatically. Hover or focus a checklist row to locate that species.</p>
        <div className="designer-summary" aria-live="polite"><span>Zone<strong>{draft.physical.restoration_area} m²</strong></span><span>New plants<strong>{evaluation.summary.plants}</strong></span><span>Trees / shrubs & grasses<strong>{evaluation.summary.trees} / {evaluation.summary.shrubs}</strong></span><span>Tree density<strong>{evaluation.summary.tree_density.toFixed(1)}/ha</strong></span><span>Algarrobo density<strong>{evaluation.summary.carob_density.toFixed(1)}/ha</strong></span><span>Plant estimate<strong>{money(evaluation.summary.plant_cost)}</strong></span><span>Unplaced<strong>{evaluation.summary.unplaced}</strong></span></div>
        {modern&&<p className="designer-density-totals">Shrubs/grasses: <strong>{evaluation.summary.shrub_density.toFixed(1)}/ha</strong> · All new plants: <strong>{evaluation.summary.overall_density.toFixed(1)}/ha</strong><small>Densities use the whole planting zone, not spacing inside groups. Existing vegetation is counted separately.</small></p>}
        <details open={evaluation.issues.length>0}><summary>Unresolved information ({evaluation.issues.length})</summary><ul>{evaluation.issues.map(v=><li key={v}>{v}</li>)}</ul>{!workspace.available&&<p>{workspace.reason}</p>}</details>
      </div>
      <aside className="designer-inspector" aria-label="Selected element and evidence">
        {reference!==null?<><button type="button" onClick={()=>setReference(null)}>Back to selection</button>{reference==="plant"?<GuideViews guide={validatePlantingGuide(guideData)} onExploreModels={()=>setReference("models")} modelsTrigger={modelsTrigger}/>:<ModelsBody guide={validateRestorationModels(modelData,guideData)}/>}</>:<>
          <h2>{selection==="pocket"?"Assumed moisture pocket":selection==="zone"?"Planting zone":selectedSpecies===null?"Your design":plantName(selectedSpecies)}</h2>
          {selection==="pocket"&&modern&&<>
            <PocketHelp facts={evaluation.display.pocket} showCrowns={showCrowns}/>
            <fieldset disabled={!editable||busy||stale}><legend>Pocket size and position</legend><NumberEdit label="Selected pocket radius (m, assumed)" value={draft.pocket.radius} min="0.01" onCommit={radius=>patch("pocket",{radius})}/><NumberEdit label="Selected pocket x (m)" value={draft.pocket.x} onCommit={x=>patch("pocket",{x})}/><NumberEdit label="Selected pocket y (m)" value={draft.pocket.y} onCommit={y=>patch("pocket",{y})}/></fieldset>
            {evaluation.display.pocket.plotted&&<button type="button" onClick={()=>{setSelection(evaluation.display.pocket.example_id);setReference(null);}}>Select example encina</button>}
          </>}
          {selection==="zone"&&modern&&<><FeatureHelp id="zone"/><fieldset disabled={!editable||busy||stale}><legend>Area-preserving dimensions</legend><NumberEdit label="Selected zone width (m)" value={evaluation.width} min="0.01" onCommit={length=>command({kind:"resize",axis:"width",length})}/><NumberEdit label="Selected zone height (m)" value={evaluation.height} min="0.01" onCommit={length=>command({kind:"resize",axis:"height",length})}/><p>{draft.physical.restoration_area} m² · Centre and area stay fixed.</p></fieldset></>}
          {selectedSpecies!==null&&<>
            <p className="plant-symbol-selected"><PlantSymbol appearance={symbolForPlant(species===undefined?selectedRow:species)}/>{plantName(selectedSpecies)}{selected!==undefined&&` · ${Number(selected.id.split(":")[1])+1}`}</p>
            {modern&&<CrownEditor key={`crown:${selectedSpecies}`} id={selectedSpecies} facts={evaluation.display.crown_editors[selectedSpecies]} pending={Object.hasOwn(crownEdits,selectedSpecies)?crownEdits[selectedSpecies]:null} error={Object.hasOwn(crownErrors,selectedSpecies)?crownErrors[selectedSpecies]:""} onEdit={value=>editCrown(selectedSpecies,value)} onComplete={value=>completeCrown(selectedSpecies,value)} onDiscard={()=>discardCrownEdit(selectedSpecies)} command={command} busy={busy} disabled={!editable||stale||libraryDialog!==null||pending!==null||review!==null}/>}
            {species!==undefined&&<><PlantPortrait id={selectedSpecies}/><p className="plant-names"><PlantNames id={selectedSpecies}/></p></>}
            <fieldset disabled={!editable||busy||stale}><legend>Selected plant</legend>
              <label className="designer-choice"><input type="checkbox" checked={draft.manual_ids.includes(selectedSpecies)} onChange={e=>toggle("manual_ids",selectedSpecies,e.target.checked)}/>Keep this species when combinations change</label>
              {modern&&<DensityControl row={selectedDensity} label={plantName(selectedSpecies)} disabled={busy||stale} onDensity={value=>command({kind:"density",id:selectedSpecies,value})} onStep={step=>command({kind:"density_step",id:selectedSpecies,step})}/>}
            </fieldset>
            {selected!==undefined&&<p>{designerHelp.placement[evaluation.display.plants[selected.id].mode].replace("{parent}",evaluation.display.plants[selected.id].parent_name)}</p>}
            {editable&&selected!==undefined&&Object.values(draft.associations).some(link=>link.parent_id===selected.id)&&<p>Moves with this tree: {Object.entries(draft.associations).filter(([,link])=>link.parent_id===selected.id).map(([id])=>`${plantName(id.split(":")[0])} ${Number(id.split(":")[1])+1}`).join(", ")}. Move a shrub separately to keep its own position.</p>}
            {editable&&<>{(species===undefined?selectedRow.group:species.group)!=="tree"&&<PlacementControl species={selectedSpecies} category={evaluation.placement.categories[selectedSpecies]} command={command} disabled={busy||stale}/>}<p>New plants are placed at least {evaluation.placement.minimum_clearance} m apart, measured between their centres. You can move them closer; the app will warn you.</p></>}
            {modern&&<PlantDimensions key={selectedSpecies} id={selectedSpecies} draft={draft} overlays={evaluation.overlays[selectedSpecies]} command={command} disabled={!editable||busy||stale}/>}
            <details><summary>Why this plant is included</summary><p>{evaluation.reasons.find(row=>row.species===selectedSpecies).reasons.map(reason=>reason==="manual"?"Selected or kept by you":reason==="pocket"?"Example encina for the moisture pocket":bundle.vegetation_combinations.find(c=>"combination:"+c.id===reason).title).join("; ")}</p></details>
            {selectedSpecies==="carob"&&<button type="button" onClick={()=>setReference("plant")}>Planting information</button>}
            {selected!==undefined&&<details><summary>Advanced layout clearance</summary><NumberEdit label="Layout clearance radius (m, assumed)" value={selected.radius} min="0.01" onCommit={v=>command({kind:"radius",id:selectedSpecies,radius:v})}/><p>This older drawing size is separate from the root ball and crown. It does not control where new plants are placed.</p></details>}
          </>}
          {selectedSpecies===null&&selection!=="pocket"&&selection!=="zone"&&<p>Select a plant, the pocket or a zone edge to see its controls. The guides below explain the design choices.</p>}
          {evaluation.display.unplaced.length>0&&<details><summary>Why plants are unplaced ({evaluation.display.unplaced.length})</summary><FeatureHelp id="unplaced"/><ul>{evaluation.display.unplaced.map(p=><li key={p.id}>{p.name}: {designerHelp.unplaced[p.reason]}</li>)}</ul></details>}
          <DesignGuide evaluation={evaluation} showCrowns={showCrowns} onReference={setReference}/>
        </>}
      </aside>
    </div>
  </section>;
}

function ExistingEditor({plant,catalogue,onChange}){return <><label>Species<select value={plant.species} onChange={e=>onChange({...plant,species:e.target.value})}>{catalogue.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>{["x","y","radius"].map(k=><NumberEdit key={k} label={`Existing ${k} (m)`} value={plant[k]} onCommit={v=>onChange({...plant,[k]:v})}/>)}</>;}

function CrownEditor({id,facts,pending,error,onEdit,onComplete,onDiscard,command,busy,disabled}) {
  required(facts!==undefined,`Crown diameter information unavailable for ${id}. Restart Python and reload.`);
  const value=pending===null?initialCrownEditor(facts):pending;
  const complete=()=>{if(pending!==null)onComplete(value);};
  const blur=e=>{if(!(e.relatedTarget instanceof Element)||e.relatedTarget.closest("[data-crown-action]")===null)complete();};
  const fieldKey=(e,field)=>{
    if(e.key==="Enter"){e.preventDefault();complete();}
    if(e.key==="Escape"){e.preventDefault();e.stopPropagation();onEdit({...value,[field]:initialCrownEditor(facts)[field]});}
  };
  return <section className="dimension-editor crown-editor" aria-label="Crown diameter editor"><h3>Crown / plant diameter</h3>
    <p>Applies to every plant of this species in this design. The circle is a drawing estimate, not a growth forecast.</p>
    {facts.value===null&&<p className="reason">{facts.range===null?"Diameter not established; no circle is drawn.":`This saved design records a ${facts.range[0]}–${facts.range[1]} m range, not a single diameter.`} Review the designer upgrade before editing.</p>}
    {facts.default_value!==null&&Number(value.diameter)!==facts.default_value&&<p>Configured drawing default: <strong>{facts.default_value} m</strong>.</p>}
    <fieldset disabled={disabled||!facts.editable}>
      <label>Crown / plant diameter (m)<input type="number" min="0.001" max="200" step="any" value={value.diameter} aria-invalid={error!==""} onChange={e=>onEdit({...value,diameter:e.target.value})} onBlur={blur} onKeyDown={e=>fieldKey(e,"diameter")}/></label>
      <label>Dimension basis<select aria-label="Dimension basis" value={value.basis} onChange={e=>{const next={...value,basis:e.target.value};onEdit(next);onComplete(next);}}><option value="assumption">My planning assumption</option><option value="measured">Measured / supplied dimensions</option></select></label>
      <label>Note (optional)<input value={value.note} maxLength="500" onChange={e=>onEdit({...value,note:e.target.value})} onBlur={blur} onKeyDown={e=>fieldKey(e,"note")}/></label>
      <p className="muted">Press Enter or leave a field to update the design.</p>
      {error!==""&&<div className="error" role="alert">{error}<button type="button" data-crown-action="retry" disabled={busy} onClick={complete}>Retry diameter edit</button></div>}
      {facts.has_override&&<button type="button" data-crown-action="reset" disabled={busy} onClick={async()=>{if(await command({kind:"dimension",id,feature:"crown",value:null}))onDiscard();}}>Reset to default</button>}
      {pending!==null&&<button type="button" data-crown-action="discard" disabled={busy} onClick={onDiscard}>Discard diameter edit</button>}
    </fieldset>
  </section>;
}

function PlantDimensions({id,draft,overlays,command,disabled}) {
  const record=draft.bundle.plant_dimensions.plants.find(p=>p.id===id);
  return <section className="plant-dimensions"><FeatureHelp id="dimensions"/>
    <DimensionEditor id={id} feature={{key:"root_ball",label:"Root-ball diameter at planting"}} overlay={overlays.root_ball} command={command} disabled={disabled} hasOverride={Object.hasOwn(draft.dimensions,id)&&draft.dimensions[id].root_ball!==null}/>
    {record===undefined&&<p>Custom plant: no botanical dimensions have been verified.</p>}
    {record!==undefined&&<details><summary>Sources and details · dimensions</summary><p>{record.stock}</p><p>{record.limitations}</p>{draft.version===3&&<><p>{record.planning.basis}</p><p>Original published horizontal range: {record.crown===null?"Not established":`${record.crown.diameter_m.join("–")} m · ${record.crown.context}`}. The chosen drawing value is separate from this evidence.</p></>}<p>Reviewed {record.reviewed}. Garden spread ranges are not dryland growth predictions. The shared root-ball drawing default is an assumption; actual stock dimensions can replace it.</p>{record.references.map(url=><p key={url}><DocumentLink href={url} target="_blank" rel="noreferrer">Botanical/reference source ↗</DocumentLink></p>)}</details>}
  </section>;
}

function DimensionEditor({id,feature,overlay,command,disabled,hasOverride}) {
  const [diameter,setDiameter]=useState(""), [basis,setBasis]=useState(""), [note,setNote]=useState("");
  const valid=diameter!==""&&Number(diameter)>0&&Number(diameter)<=200&&basis!=="";
  return <div className="dimension-editor"><strong>{feature.label}</strong>
    {overlay===null?<p>Not established · no circle drawn.</p>:<p>{overlay.diameter_m[0]===overlay.diameter_m[1]?overlay.diameter_m[0]:`${overlay.diameter_m[0]}–${overlay.diameter_m[1]}`} m · {overlay.evidence}<small>{overlay.context}</small>{overlay.source!==null&&<DocumentLink href={overlay.source} target="_blank" rel="noreferrer">Source · {overlay.section} ↗</DocumentLink>}</p>}
    <details><summary>{hasOverride?"Edit your dimension":"Enter a measured or assumed dimension"}</summary><fieldset disabled={disabled}>
      <label>{feature.label} (m)<input type="number" min="0.001" max="200" step="any" value={diameter} onChange={e=>setDiameter(e.target.value)}/></label>
      <label>Dimension basis<select aria-label="Dimension basis" value={basis} onChange={e=>setBasis(e.target.value)}><option value="">Choose basis</option><option value="measured">Measured / supplied stock dimensions</option><option value="assumption">My planning assumption</option></select></label>
      <label>Measurement or assumption note<input value={note} onChange={e=>setNote(e.target.value)} maxLength="500"/></label>
      <button type="button" disabled={!valid} onClick={()=>command({kind:"dimension",id,feature:feature.key,value:{diameter:Number(diameter),basis,note}})}>Use this diameter</button>
      {hasOverride&&<button type="button" onClick={()=>command({kind:"dimension",id,feature:feature.key,value:null})}>Reset to default</button>}
    </fieldset></details>
  </div>;
}

function Plan({evaluation,selected,onSelect,onMove,zoom,pan,setPan,disabled}){
  const svg=useRef(null), drag=useRef(null), [moving,setMoving]=useState(null);
  const {draft,width,height}=evaluation, padding=Math.max(width,height)/12;
  const point=e=>{const p=svg.current.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.current.getScreenCTM().inverse());};
  function down(e,id){if(disabled)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const p=point(e);drag.current={id,x:p.x,y:p.y,clientX:e.clientX,clientY:e.clientY,scale:svg.current.getScreenCTM().a,pan};if(id!==null)onSelect(id);}
  function move(e){if(drag.current===null)return;const p=point(e),d=drag.current;if(d.id===null)setPan({x:d.pan.x-(e.clientX-d.clientX)/d.scale,y:d.pan.y-(e.clientY-d.clientY)/d.scale});else setMoving({id:d.id,x:Math.max(0,Math.min(width,p.x)),y:Math.max(0,Math.min(height,p.y))});}
  function up(e){const d=drag.current;drag.current=null;if(d!==null&&d.id!==null&&moving!==null){onMove(d.id,moving.x,moving.y);setMoving(null);}}
  const boundary={bottom:[0,height,width,height],top:[0,0,width,0],left:[0,0,0,height],right:[width,0,width,height]}[draft.zone.boundary_side];
  return <svg ref={svg} className="designer-svg" viewBox={`${-padding+pan.x} ${-padding+pan.y} ${(width+2*padding)/zoom} ${(height+2*padding)/zoom}`} role="group" aria-label="Assumed planting zone, top-down plan" onPointerDown={e=>down(e,null)} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null;setMoving(null);}}>
    <defs><pattern id="designer-organic" width=".25" height=".25" patternUnits="userSpaceOnUse"><path d="M0 .05L.2 .15M.05 .2L.25 .25" stroke="currentColor" strokeWidth=".035"/></pattern><pattern id="designer-stones" width="0.25" height="0.25" patternUnits="userSpaceOnUse"><circle cx="0.09" cy="0.08" r="0.05" fill="currentColor"/><path d="M.15 .2l.06-.02" stroke="currentColor" strokeWidth=".025"/></pattern><marker id="designer-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>
    <title>Assumed rectangular planting zone</title><desc>Earlier saved design shown for reference. Review the designer upgrade before editing its layout.</desc>
    <rect x="0" y="0" width={width} height={height} className="designer-ground"/>
    <line x1={boundary[0]} y1={boundary[1]} x2={boundary[2]} y2={boundary[3]} className="designer-boundary"/>
    <text x={width/2} y={height+padding*.6} textAnchor="middle" fontSize={padding*.3}>{width.toFixed(1)} m · {draft.zone.boundary_side} boundary: {draft.zone.boundary_type==="custom"?draft.zone.boundary_custom:draft.zone.boundary_type}</text>
    <text x={width/2} y={-padding*.3} textAnchor="middle" fontSize={padding*.35}>Assumed geometry · {draft.physical.restoration_area} m²</text>
    {evaluation.features.catchment!==null&&<g className="designer-catchment" aria-label="Conceptual rainfall capture">{(()=>{const c=evaluation.features.catchment;return <><rect x={c.donor[0]} y={c.donor[1]} width={c.donor[2]} height={c.donor[3]} rx=".1"/><text x={c.donor_label[0]} y={c.donor_label[1]} textAnchor="middle" fontSize={padding*.3}>Assumed donor catchment</text>{c.islands.map((p,i)=><g key={i}><path d={`M${p.x} ${p.flow_start}V${p.y-p.width/2}`} markerEnd="url(#designer-arrow)"/><path d={`M${p.x-p.width/2} ${p.y}q${p.width/2} ${p.depth} ${p.width} 0`}/></g>)}<path d={`M${c.overflow[0]} ${c.overflow[1]}L${c.overflow[2]} ${c.overflow[3]}`} markerEnd="url(#designer-arrow)"/><text x={c.overflow_label[0]} y={c.overflow_label[1]} fontSize={padding*.25}>Review safe overflow</text></>;})()}</g>}
    {draft.pocket.enabled&&<g><circle cx={draft.pocket.x} cy={draft.pocket.y} r={draft.pocket.radius} className="designer-pocket"/><text x={draft.pocket.x} y={draft.pocket.y-draft.pocket.radius} fontSize={padding*.25} textAnchor="middle">Assumed moisture pocket</text></g>}
    {draft.existing.map(p=><g key={p.id} className="designer-existing"><circle cx={p.x} cy={p.y} r={p.radius}/><path d={`M${p.x} ${p.y-.2}l.2 .2-.2 .2-.2-.2Z`}/><title>Existing {p.species}, assumed position</title></g>)}
    {evaluation.instances.map(p=>{const v=moving!==null&&moving.id===p.id?moving:p;return <g key={p.id} className={`designer-plant ${selected===p.id?"is-selected":""}`} role="button" tabIndex="0" aria-label={`Select ${p.species} ${p.id.split(":")[1]}`} aria-pressed={selected===p.id} onClick={e=>{e.stopPropagation();onSelect(p.id);}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(p.id);}}} onPointerDown={e=>{e.stopPropagation();down(e,p.id);}}>
      {draft.mulch.enabled&&draft.mulch.plant_ids.includes(p.species)&&<circle cx={v.x} cy={v.y} r={(draft.mulch.radius+draft.bundle.defaults.collar_gap)/2} className="designer-mulch" style={{fill:"none",stroke:`url(#designer-${draft.bundle.treatments.find(t=>t.id===draft.mulch.type).pattern})`,strokeWidth:draft.mulch.radius-draft.bundle.defaults.collar_gap}}/>}
      <circle cx={v.x} cy={v.y} r={p.radius}/><circle cx={v.x} cy={v.y} r={Math.min(p.radius/3,.15)} className="designer-centre"/><text x={v.x} y={v.y+p.radius+.2} textAnchor="middle" fontSize=".22">{p.species.replaceAll("_"," ")}</text><title>{p.species} · assumed radius {p.radius} m · {p.reasons.join(", ")}</title>
    </g>;})}
  </svg>;
}


function PlacementControl({species,category,command,disabled}) {
  return <label>Automatic placement for new plants<select value={category} disabled={disabled} onChange={e=>command({kind:"placement",id:species,category:e.target.value})}>
    <option value="within_crowns">Within tree crowns</option><option value="open_ground">Open ground</option><option value="independent">Independent</option>
  </select><small>Changes apply to future additions. Existing positions stay unchanged. Woodland companionship is an illustrative assumption.</small></label>;
}
