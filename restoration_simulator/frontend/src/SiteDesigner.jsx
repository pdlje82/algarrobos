import React, { useEffect, useRef, useState } from "react";
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

export const DESIGNER_FIELDS = new Set(["parcel_id","restoration_area","vegetation_system","objective","water_plan","planting_method","plant_selection"]);

function NumberEdit({ label, value, onCommit, min = 0, max = 1000000, step = "any" }) {
  const display=v=>v===null?"":typeof v==="number"?String(Number(v.toFixed(3))):String(v);
  const [text,setText] = useState(display(value));
  const touched=useRef(false);
  useEffect(() => {setText(display(value));touched.current=false;},[value]);
  return <label>{label}<input type="number" value={text} min={min} max={max} step={step} onChange={e=>{setText(e.target.value);touched.current=true;}} onBlur={()=>{ const next=text===""?null:Number(text); if(touched.current&&next!==value){touched.current=false;onCommit(next);} }} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}} /></label>;
}

export function SiteDesigner({ data, request, onApplied, onSaved, planningInputs }) {
  const [workspace,setWorkspace] = useState(null), [evaluation,setEvaluation] = useState(null);
  const [error,setError] = useState(""), [busy,setBusy] = useState(false), [message,setMessage] = useState("");
  const [dirty,setDirty] = useState(false), [tab,setTab] = useState("Zone"), [selection,setSelection] = useState(null);
  const [cartEdit,setCartEdit] = useState(null);
  const cartTimer=useRef(null);
  const [pending,setPending] = useState(null), [review,setReview] = useState(null), [reference,setReference] = useState(null);
  const [zoom,setZoom] = useState(1), [pan,setPan] = useState({x:0,y:0});
  const [showRoots,setShowRoots]=useState(true), [showCrowns,setShowCrowns]=useState(true), [showClearance,setShowClearance]=useState(false);
  const history=useRef({undo:[],redo:[]}), savedDraft=useRef(null), lastCommand=useRef(null);
  const [,renderHistory]=useState(0);
  const requestBusy = useRef(false), state = useRef(null), epoch = useRef(0), modelsTrigger = useRef(null);
  const projectId = data.project.id;
  async function load() {
    const token=++epoch.current; setBusy(true); setError("");
    try { const result=await request("designer"); required(result.evaluation?.draft && Array.isArray(result.fields),"Missing designer contract. Restart Python and reload.");
      if(token!==epoch.current)return;
      setWorkspace(result);setEvaluation(result.evaluation);state.current=result.evaluation;setDirty(false);setReview(null);setPending(null);
      savedDraft.current=JSON.stringify(result.evaluation.draft);history.current={undo:[],redo:[]};renderHistory(v=>v+1);setCartEdit(null);setSelection(null);
    } catch(e){if(token===epoch.current)setError(e.message);} finally{if(token===epoch.current)setBusy(false);}
  }
  useEffect(()=>{load();return()=>{epoch.current++;clearTimeout(cartTimer.current);};},[projectId]);
  // External project actions require an explicit reload; never replace an unsaved draft.
  const stale=workspace!==null && workspace.project_revision!==data.revision;
  function accept(next,record=true){if(record&&state.current!==null){history.current.undo.push(state.current);history.current.redo=[];}setEvaluation(next);state.current=next;setDirty(JSON.stringify(next.draft)!==savedDraft.current);setReview(null);setPending(null);setError("");setCartEdit(null);if(next.draft.version===2)setMessage(next.message);renderHistory(v=>v+1);}
  async function travel(direction){if(requestBusy.current||history.current[direction].length===0)return;requestBusy.current=true;setBusy(true);setError("");try{const source=history.current[direction];const next=await request("designer/preview",{revision:data.revision,draft:source[source.length-1].draft});history.current[direction==="undo"?"redo":"undo"].push(state.current);source.pop();accept(next,false);setMessage(direction==="undo"?"Previous design restored.":"Design change restored.");}catch(e){setError(e.message);}finally{requestBusy.current=false;setBusy(false);}}
  function editCart(value){setCartEdit(value);setDirty(true);setReview(null);clearTimeout(cartTimer.current);cartTimer.current=setTimeout(()=>command({kind:"selection",selection:value}),350);}
  async function command(cmd) {
    if(requestBusy.current)return false;
    requestBusy.current=true;setBusy(true);setError("");setMessage("");
    const token=epoch.current;
    lastCommand.current=cmd;
    try { const next=await request("designer/preview",{revision:data.revision,draft:state.current.draft,command:cmd});
      if(token!==epoch.current)return false;
      if(cmd.kind==="upgrade_rules")setPending(next);else accept(next);
      return true;
    } catch(e){if(token===epoch.current)setError(e.message);return false;} finally{requestBusy.current=false;if(token===epoch.current)setBusy(false);}
  }
  async function save() {
    if(requestBusy.current)return;
    requestBusy.current=true;setBusy(true);setError("");
    try {const result=await request("designer/save",{revision:data.revision,design_revision:workspace.design_revision,request_id:crypto.randomUUID(),draft:state.current.draft});
      setWorkspace(w=>({...w,design_revision:result.design_revision,saved:true}));setDirty(false);onSaved({...state.current.draft.physical,plant_selection:state.current.draft.selection});setMessage("Draft saved. Simulation time, cash and history are unchanged.");
      savedDraft.current=JSON.stringify(state.current.draft);
    }catch(e){setError(e.message);}finally{requestBusy.current=false;setBusy(false);}
  }
  async function importPlan(){if(busy)return;setBusy(true);setError("");try{const next=await request("designer/import-plan",{revision:data.revision,action_id:"demonstrator",inputs:{}});accept(next);setMessage("Recorded plants and prices imported. Coordinates are new assumptions.");}catch(e){setError(e.message);}finally{setBusy(false);}}
  function administration(){return Object.fromEntries(workspace.fields.filter(f=>!DESIGNER_FIELDS.has(f.name)).map(f=>[f.name,planningInputs!==null&&Object.hasOwn(planningInputs,f.name)?planningInputs[f.name]:f.default]));}
  async function previewApply(){setBusy(true);setError("");try{const admin=administration();const result=await request("designer/apply-preview",{revision:data.revision,design_revision:workspace.design_revision,administration:admin});setReview({...result,administration:admin});}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function apply(){setBusy(true);setError("");try{const result=await request("designer/apply",{revision:data.revision,design_revision:workspace.design_revision,request_id:crypto.randomUUID(),administration:review.administration});setReview(null);onApplied(result);await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
  if(workspace===null || evaluation===null)return <section className="panel"><h1>Site Designer</h1>{error?<><p className="error" role="alert">{error}</p><button onClick={load}>Retry loading designer</button></>:<p>Opening the planting workspace…</p>}</section>;
  const draft=evaluation.draft, bundle=draft.bundle;
  const modern=draft.version===2;
  const patch=(section,values)=>command({kind:"patch",section,values});
  const toggle=(collection,id,enabled)=>command({kind:"toggle",collection,id,enabled});
  const field=workspace.fields.find(f=>f.name==="plant_selection");
  required(field!==undefined,"Python did not provide the priced plant catalogue.");
  const selected=evaluation.instances.find(p=>p.id===selection);
  const species=selected===undefined?null:workspace.catalogue.plants.find(p=>p.id===selected.species);
  const selectedRow=selected===undefined?null:draft.selection.entries.find(p=>p.id===selected.species);
  const selectedDensity=modern&&selected!==undefined?evaluation.species.find(p=>p.id===selected.species):null;
  const displaySelection=modern?{version:2,entries:evaluation.species.map(p=>p.entry)}:draft.selection;
  const planCatalogue=[...workspace.catalogue.plants,...draft.selection.entries.filter(p=>p.id.startsWith("custom-"))];
  function plantName(id){const plant=workspace.catalogue.plants.find(p=>p.id===id);if(plant!==undefined)return plant.label;if(modern&&draft.legacy_exclusions.includes(id)&&!Object.hasOwn(draft.preferences,id))return "Legacy custom plant — name not recorded";required(modern&&id.startsWith("custom-")&&Object.hasOwn(draft.preferences,id),`Missing plant identity for ${id}.`);return draft.preferences[id].entry.label;}
  const canApply=error===""&&pending===null&&cartEdit===null&&workspace.available&&!dirty&&workspace.saved&&!stale&&evaluation.summary.plants>0&&draft.physical.parcel_id!==null;
  const physicalFields=workspace.fields.filter(f=>DESIGNER_FIELDS.has(f.name)&&!["restoration_area","plant_selection"].includes(f.name)).map(f=>f.name==="parcel_id"?{...f,options:[{value:"",label:"Unlinked — choose a parcel"},...f.options]}:f);
  return <section className="site-designer" aria-labelledby="designer-title">
    <header className="designer-header"><div><p className="eyebrow">An editable example · no suitability forecast</p><h1 id="designer-title">Site Designer</h1><p>Assumed geometry · planting zone only</p></div>
      <div className="designer-actions"><button type="button" disabled={busy||stale||error!==""||cartEdit!==null||pending!==null||!dirty} onClick={save}>Save draft</button><button type="button" disabled={busy||!canApply} onClick={previewApply}>Apply to demonstrator</button>
        <button type="button" disabled={busy||stale||cartEdit!==null||history.current.undo.length===0} onClick={()=>travel("undo")}>Undo</button><button type="button" disabled={busy||stale||cartEdit!==null||history.current.redo.length===0} onClick={()=>travel("redo")}>Redo</button>
        <a href="/api/designer/report" target="_blank" rel="noreferrer" aria-disabled={!workspace.saved}>Saved design report ↗</a></div></header>
    <div className="designer-status" aria-live="polite">{busy?"Updating…":dirty?"Unsaved design changes":workspace.saved?"Saved draft":"New draft — save when ready"}{message&&<span> · {message}</span>}</div>
    {error&&<p className="error" role="alert">{error} Your design remains visible. {lastCommand.current!==null&&<button type="button" disabled={busy} onClick={()=>command(lastCommand.current)}>Retry edit</button>}</p>}
    {!modern&&<div className="reason"><p>This saved design uses the earlier designer. Review the upgrade to enable density controls and direct editing. Its recorded plants, prices and positions will be retained.</p><button type="button" disabled={busy||stale} onClick={()=>command({kind:"upgrade_rules"})}>Review designer upgrade</button></div>}
    {cartEdit!==null&&<p className="reason">Plant inputs are being edited. The plan retains its last valid preview. <button type="button" onClick={()=>{clearTimeout(cartTimer.current);setCartEdit(null);setError("");}}>Discard incomplete plant edits</button></p>}
    {stale&&<p className="reason">The project changed. Your draft is retained. <button type="button" onClick={load}>Reload saved designer</button></p>}
    {pending&&<div className="designer-review" role="region" aria-label="Review design changes"><h2>Review updated rules</h2>
      <ul>{pending.removed.map(p=><li key={p.id}>{p.id}: {p.reason}</li>)}</ul><p>Current: {evaluation.summary.plants} plants · {money(evaluation.summary.plant_cost)}. Proposed: {pending.summary.plants} plants · {money(pending.summary.plant_cost)}. Manual overrides are retained.</p><details><summary>Rule changes</summary>{pending.draft.bundle.rules.filter(r=>JSON.stringify(r)!==JSON.stringify(bundle.rules.find(v=>v.id===r.id))).map(r=><p key={r.id}><strong>{r.title}</strong>: {r.description}</p>)}<p>Bundle: {bundle.manifest.ruleset_id} → {pending.draft.bundle.manifest.ruleset_id}. Geometry defaults and source register are included in the saved report.</p></details>
      <button type="button" onClick={()=>accept(pending)}>Confirm design changes</button> <button type="button" onClick={()=>{setPending(null);setCartEdit(null);}}>Keep current design</button></div>}
    {review&&<div className="designer-review" role="region" aria-label="Apply design review"><h2>Review application to demonstrator</h2><p>{review.notice}</p><p>{review.previous===null?"No previous demonstrator.":`Previous: ${review.previous.plan.trees} trees and ${review.previous.plan.shrubs} shrubs / grasses.`} New design: {evaluation.summary.trees} trees and {evaluation.summary.shrubs} shrubs / grasses on {draft.physical.restoration_area} m².</p>
      <p>Total planned budget: {money(review.preview.demonstrator.budget.total)}. Plant subtotal: {money(evaluation.summary.plant_cost)}.</p><details><summary>Retained administration and other budget inputs</summary><dl>{Object.entries(review.administration).map(([k,v])=><React.Fragment key={k}><dt>{k.replaceAll("_"," ")}</dt><dd>{String(v)}</dd></React.Fragment>)}</dl></details>
      <button type="button" disabled={busy} onClick={apply}>Confirm apply to demonstrator</button> <button type="button" onClick={()=>setReview(null)}>Cancel</button></div>}
    <div className="designer-workspace">
      <aside className="designer-controls" aria-label="Design controls"><nav aria-label="Designer panels">{["Zone","Approaches","Plants","Establishment"].map(t=><button key={t} type="button" aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
        <fieldset disabled={!modern||busy||stale||pending!==null||(cartEdit!==null&&tab!=="Plants")}><legend>{tab}</legend>
          {tab==="Zone"&&<><p>Choose an assumed rectangle. Proportions preserve area; this is not a survey.</p>
            <NumberEdit label="Planting area (m²)" value={draft.physical.restoration_area} min="0.01" onCommit={v=>patch("physical",{restoration_area:v})}/>
            <NumberEdit label="Width / height ratio" value={draft.zone.aspect} min="0.05" max="20" onCommit={v=>patch("zone",{aspect:v})}/>
            <NumberEdit label="Zone width (m, area fixed)" value={evaluation.width} min="0.01" onCommit={length=>command({kind:"resize",axis:"width",length})}/><NumberEdit label="Zone height (m, area fixed)" value={evaluation.height} min="0.01" onCommit={length=>command({kind:"resize",axis:"height",length})}/>
            <p>{evaluation.width.toFixed(2)} m × {evaluation.height.toFixed(2)} m</p>
            {modern&&evaluation.density_update!==null&&<div className="density-update"><p>Area changed; current plants were retained. Previous density targets would give:</p><ul>{evaluation.density_update.map(p=><li key={p.id}>{plantName(p.id)}: {p.quantity} plants at requested {p.density.toFixed(2)}/ha</li>)}</ul><button type="button" onClick={()=>command({kind:"restore_densities"})}>Update plants to previous densities</button></div>}
            <label>Reference boundary side<select value={draft.zone.boundary_side} onChange={e=>patch("zone",{boundary_side:e.target.value})}>{bundle.defaults.boundary_sides.map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Reference boundary type<select value={draft.zone.boundary_type} onChange={e=>patch("zone",{boundary_type:e.target.value})}>{bundle.defaults.boundary_types.map(v=><option key={v}>{v}</option>)}</select></label>
            {draft.zone.boundary_type==="custom"&&<label>Boundary description<input value={draft.zone.boundary_custom} onChange={e=>patch("zone",{boundary_custom:e.target.value})}/></label>}
            <Fields fields={physicalFields.filter(f=>["parcel_id","objective","vegetation_system"].includes(f.name))} inputs={{...draft.physical,parcel_id:draft.physical.parcel_id===null?"":draft.physical.parcel_id}} onChange={next=>patch("physical",Object.fromEntries(["parcel_id","objective","vegetation_system"].map(k=>[k,k==="parcel_id"&&next[k]===""?null:next[k]])))} disabled={busy}/>
            <details><summary>Assumed site context</summary><NumberEdit label="Assumed annual rainfall (mm/year), blank if unknown" value={draft.site.rainfall} onCommit={v=>patch("site",{rainfall:v})}/><label>Soil context<select value={draft.site.soil} onChange={e=>patch("site",{soil:e.target.value})}>{["unknown","calcareous","siliceous","rocky / shallow","other"].map(v=><option key={v}>{v}</option>)}</select></label><p>Recorded assumptions only; no suitability score is calculated.</p></details>
            {workspace.can_import&&<button type="button" onClick={importPlan}>Create assumed layout from this plan</button>}
            <button type="button" onClick={()=>command({kind:"existing",plants:[...draft.existing,{id:crypto.randomUUID(),species:bundle.defaults.pocket_species,x:evaluation.width/2,y:evaluation.height/2,radius:bundle.defaults.footprint_radius}]})}>Add existing vegetation symbol</button>
            {draft.existing.map(p=><details key={p.id}><summary>Existing {p.species}</summary><ExistingEditor plant={p} catalogue={workspace.catalogue.plants} onChange={next=>command({kind:"existing",plants:draft.existing.map(v=>v.id===p.id?next:v)})}/><button type="button" onClick={()=>command({kind:"existing",plants:draft.existing.filter(v=>v.id!==p.id)})}>Remove existing symbol</button></details>)}
          </>}
          {tab==="Approaches"&&<><p>Approaches control the example arrangement. Combinations suggest plants; neither establishes suitability.</p>{["mr1","mr2"].map(id=>{const r=bundle.rules.find(v=>v.id===id);return <label className="designer-choice" key={id}><input type="checkbox" checked={draft.approaches.includes(id)} onChange={e=>toggle("approaches",id,e.target.checked)}/><span><strong>{r.title}</strong><small>{r.description}</small></span></label>;})}
            {modern&&<p className="density-scenario">Carob starts at 350/ha: seven plants on 200 m². This editable project assumption equals, rather than satisfies, the book’s strict &lt;350 figure. Other passages use &lt;100 or &lt;200 in different contexts.</p>}
            {modern&&draft.approaches.length>0&&evaluation.species.some(p=>p.id==="carob")&&<div className="density-scenario"><strong>Carob density for this design</strong><DensityControl row={evaluation.species.find(p=>p.id==="carob")} label="Carob in approaches" disabled={busy||stale} onDensity={value=>command({kind:"density",id:"carob",value})} onStep={step=>command({kind:"density_step",id:"carob",step})}/></div>}
            {bundle.vegetation_combinations.filter(c=>!c.id.endsWith("_mix")).map(c=><div className="designer-combination" key={c.id}><label className="designer-choice"><input type="checkbox" checked={draft.combinations.includes(c.id)} onChange={e=>toggle("combinations",c.id,e.target.checked)}/><strong>{c.title}</strong></label><small>{c.description}</small></div>)}
            {bundle.vegetation_combinations.filter(c=>draft.combinations.includes(c.id)||draft.approaches.some(id=>c.id===id+"_mix")).filter(c=>c.optional.length>0).map(c=><details key={c.id} open><summary>Optional companions · {c.title}</summary>{c.optional.map(id=><label className="designer-choice" key={id}><input type="checkbox" checked={draft.optional_members.includes(id)} onChange={e=>toggle("optional_members",id,e.target.checked)}/>{plantIllustration(id).spanish_name}</label>)}</details>)}
            {draft.exclusions.length>0&&<details open><summary>Excluded from automatic suggestions ({draft.exclusions.length})</summary>{draft.exclusions.map(id=><p key={id}>{plantName(id)}{modern&&draft.legacy_exclusions.includes(id)?" · legacy persistent exclusion":""} <button type="button" onClick={()=>command({kind:"exclude",id,enabled:false})}>Allow suggestions</button></p>)}<button type="button" onClick={()=>command({kind:"reset_exclusions"})}>Clear all persistent exclusions</button></details>}<button type="button" ref={modelsTrigger} onClick={()=>setReference("models")}>Explore restoration models</button>
            <button type="button" disabled={!workspace.rules_update_available} onClick={()=>command({kind:"upgrade_rules"})}>Review with updated rules</button>
          </>}
          {tab==="Plants"&&<PlantChecklist field={field} value={cartEdit===null?displaySelection:cartEdit} onChange={editCart} disabled={!modern||busy||stale} request={request} designerMode={modern} designer={modern?{species:evaluation.species,exclusions:draft.exclusions,defaults:bundle.defaults.density_defaults,command}:undefined} onPlantInformation={()=>setReference("plant")}/>}
          {tab==="Establishment"&&<><Fields fields={physicalFields.filter(f=>["water_plan","planting_method"].includes(f.name))} inputs={draft.physical} onChange={next=>patch("physical",Object.fromEntries(["water_plan","planting_method"].map(k=>[k,next[k]])))} disabled={busy}/>
            <label className="designer-choice"><input type="checkbox" checked={draft.pocket.enabled} onChange={e=>patch("pocket",{enabled:e.target.checked})}/>Assumed moisture pocket + conditional encina example</label>
            {draft.pocket.enabled&&<><NumberEdit label="Pocket radius (m, assumed)" value={draft.pocket.radius} min="0.01" onCommit={v=>patch("pocket",{radius:v})}/><NumberEdit label="Pocket x (m)" value={draft.pocket.x} onCommit={v=>patch("pocket",{x:v})}/><NumberEdit label="Pocket y (m)" value={draft.pocket.y} onCommit={v=>patch("pocket",{y:v})}/><p>Its size does not establish available moisture or tree survival.</p></>}
            <label className="designer-choice"><input type="checkbox" checked={draft.mulch.enabled} onChange={e=>patch("mulch",{enabled:e.target.checked})}/>Surface mulch treatment</label>
            {draft.mulch.enabled&&<><label>Mulch type<select value={draft.mulch.type} onChange={e=>patch("mulch",{type:e.target.value})}>{bundle.treatments.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label><NumberEdit label="Mulch radius (m, assumed)" value={draft.mulch.radius} onCommit={v=>patch("mulch",{radius:v})}/><p>Choose treated species below. Material, labour and water costs remain separately configured; none are inferred from ring size.</p>{draft.selection.entries.map(p=><label className="designer-choice" key={p.id}><input type="checkbox" checked={draft.mulch.plant_ids.includes(p.id)} onChange={e=>patch("mulch",{plant_ids:e.target.checked?[...draft.mulch.plant_ids,p.id]:draft.mulch.plant_ids.filter(v=>v!==p.id)})}/>{p.id}</label>)}</>}
            <button type="button" onClick={()=>setReference("plant")}>Carob planting and establishment guidance</button>
          </>}
        </fieldset>
      </aside>
      <div className="designer-plan"><div className="designer-plan-tools"><strong>Top-down planting zone</strong><button type="button" onClick={()=>setZoom(v=>v*1.25)} aria-label="Zoom in">＋</button><button type="button" onClick={()=>setZoom(v=>v/1.25)} aria-label="Zoom out">−</button><button type="button" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}>Fit zone</button><button type="button" disabled={busy||stale} onClick={()=>command({kind:"rearrange"})}>Rearrange generated plants</button></div>
        {modern?<><div className="designer-overlay-controls"><label><input type="checkbox" checked={showRoots} onChange={e=>setShowRoots(e.target.checked)}/>Root balls at planting</label><label><input type="checkbox" checked={showCrowns} onChange={e=>setShowCrowns(e.target.checked)}/>Indicative mature crowns</label><details><summary>Advanced display</summary><label><input type="checkbox" checked={showClearance} onChange={e=>setShowClearance(e.target.checked)}/>Assumed layout clearance</label></details></div>
        <DesignerPlan evaluation={evaluation} catalogue={planCatalogue} selected={selection} onSelect={id=>{setSelection(id);setReference(null);}} onCommand={command} zoom={zoom} pan={pan} setPan={setPan} disabled={busy||stale||pending!==null||cartEdit!==null} showRoots={showRoots} showCrowns={showCrowns} showClearance={showClearance}/></>:<Plan evaluation={evaluation} selected={selection} onSelect={setSelection} onMove={()=>{}} zoom={zoom} pan={pan} setPan={setPan} disabled/>}
        <p className="designer-legend"><span>▲ Tree · ● Shrub/grass</span><span>◇ Existing vegetation</span><span>◌ Moisture pocket</span><span>▧ Surface mulch</span><span>Solid: root ball · Dashed: crown range</span></p>{evaluation.summary.unplaced>0&&<div><strong>Unplaced plants</strong>{draft.selection.entries.filter(row=>evaluation.instances.filter(p=>p.species===row.id).length<row.quantity).map(row=>{const placed=new Set(evaluation.instances.filter(p=>p.species===row.id).map(p=>p.id));let i=0;while(placed.has(`${row.id}:${i}`))i++;return <p key={row.id}>{row.id}: {row.quantity-placed.size} unplaced <button type="button" disabled={!modern||busy||i>=bundle.defaults.max_instances} onClick={()=>command({kind:"position",id:`${row.id}:${i}`,x:evaluation.width/2,y:evaluation.height/2})}>Place next in zone</button></p>;})}</div>}<p className="muted">Drag blank ground to pan, edge handles to reshape, or the pocket outline to move it. Crown ranges are references, not forecasts. Missing dimensions stay unspecified; select a plant for evidence.</p>
        <div className="designer-summary" aria-live="polite"><span>Zone<strong>{draft.physical.restoration_area} m²</strong></span><span>New plants<strong>{evaluation.summary.plants}</strong></span><span>Trees / shrubs & grasses<strong>{evaluation.summary.trees} / {evaluation.summary.shrubs}</strong></span><span>Tree density<strong>{evaluation.summary.tree_density.toFixed(1)}/ha</strong></span><span>Carob density<strong>{evaluation.summary.carob_density.toFixed(1)}/ha</strong></span><span>Plant estimate<strong>{money(evaluation.summary.plant_cost)}</strong></span><span>Unplaced<strong>{evaluation.summary.unplaced}</strong></span></div>
        {modern&&<p className="designer-density-totals">Shrubs/grasses: <strong>{evaluation.summary.shrub_density.toFixed(1)}/ha</strong> · All new plants: <strong>{evaluation.summary.overall_density.toFixed(1)}/ha</strong><small>Densities use the whole planting zone, not spacing inside groups. Existing vegetation is counted separately.</small></p>}
        <details open={evaluation.issues.length>0}><summary>Unresolved information ({evaluation.issues.length})</summary><ul>{evaluation.issues.map(v=><li key={v}>{v}</li>)}</ul>{!workspace.available&&<p>{workspace.reason}</p>}</details>
      </div>
      <aside className="designer-inspector" aria-label="Selected element and evidence">
        {reference!==null?<><button type="button" onClick={()=>setReference(null)}>Back to selection</button>{reference==="plant"?<GuideViews guide={validatePlantingGuide(guideData)} onExploreModels={()=>setReference("models")} modelsTrigger={modelsTrigger}/>:<ModelsBody guide={validateRestorationModels(modelData,guideData)}/>}</>:<><h2>{selection==="pocket"?"Assumed moisture pocket":selection==="zone"?"Planting zone":species===null?"Design evidence":species===undefined?selectedRow.label:species.label}</h2>
          {selection==="pocket"&&modern&&<fieldset disabled={busy||stale}><legend>Pocket position</legend><NumberEdit label="Selected pocket x (m)" value={draft.pocket.x} onCommit={x=>patch("pocket",{x})}/><NumberEdit label="Selected pocket y (m)" value={draft.pocket.y} onCommit={y=>patch("pocket",{y})}/><NumberEdit label="Selected pocket radius (m, assumed)" value={draft.pocket.radius} min="0.01" onCommit={radius=>patch("pocket",{radius})}/><p>Its automatic example encina follows the pocket. Manually positioned plants stay where you placed them.</p></fieldset>}
          {selection==="zone"&&modern&&<fieldset disabled={busy||stale}><legend>Area-preserving dimensions</legend><NumberEdit label="Selected zone width (m)" value={evaluation.width} min="0.01" onCommit={length=>command({kind:"resize",axis:"width",length})}/><NumberEdit label="Selected zone height (m)" value={evaluation.height} min="0.01" onCommit={length=>command({kind:"resize",axis:"height",length})}/><p>{draft.physical.restoration_area} m² · Centre and area stay fixed. Out-of-zone plants remain listed as unplaced.</p></fieldset>}
          {selected!==undefined&&<>{species!==undefined&&<><PlantPortrait id={selected.species}/><p lang="es">{plantIllustration(selected.species).spanish_name} · <i>{plantIllustration(selected.species).scientific_name}</i></p></>}
            <fieldset disabled={!modern||busy||stale}><legend>Selected plant</legend><NumberEdit label="Plant x (m)" value={selected.x} onCommit={v=>command({kind:"position",id:selected.id,x:v,y:selected.y})}/><NumberEdit label="Plant y (m)" value={selected.y} onCommit={v=>command({kind:"position",id:selected.id,x:selected.x,y:v})}/><details><summary>Advanced layout clearance</summary><NumberEdit label="Layout clearance radius (m, assumed)" value={selected.radius} min="0.01" onCommit={v=>command({kind:"radius",id:selected.species,radius:v})}/><p>This assumed clearance is separate from nursery root-ball and crown dimensions.</p></details><label className="designer-choice"><input type="checkbox" checked={draft.manual_ids.includes(selected.species)} onChange={e=>toggle("manual_ids",selected.species,e.target.checked)}/>Keep this species when combinations change</label>
              {modern&&<DensityControl row={selectedDensity} label={species===undefined?selectedRow.label:species.label} disabled={busy||stale} onDensity={value=>command({kind:"density",id:selected.species,value})} onStep={step=>command({kind:"density_step",id:selected.species,step})}/>}
            </fieldset><p>Position: {selected.manual?"placed manually":"generated example"}.</p>{modern&&<PlantDimensions key={selected.species} id={selected.species} draft={draft} overlays={evaluation.overlays[selected.species]} command={command} disabled={busy||stale}/>}<details><summary>Why this plant is included</summary><p>{selected.reasons.map(reason=>reason==="manual"?"Selected or retained by you":reason==="pocket"?"Conditional example for the moisture pocket":bundle.vegetation_combinations.find(c=>"combination:"+c.id===reason).title).join("; ")}</p></details>{selected.species==="carob"&&<button type="button" onClick={()=>setReference("plant")}>Planting information</button>}</>}
          <p>All generated geometry and starter quantities are editable assumptions. Source guidance is shown separately.</p>
          {evaluation.rules.map(r=><details key={r.id} open={r.condition!=="always"&&selected!==undefined&&evaluation.reasons.find(v=>v.species===selected.species)?.rules.includes(r.id)}><summary>{r.title}</summary><small>{r.evidence} · {r.id}</small><p>{r.description}</p><p className="muted">{r.limitations}</p><SourceLinks refs={r.sources}/></details>)}
          {draft.combinations.map(id=>{const c=bundle.vegetation_combinations.find(v=>v.id===id);return <details key={id}><summary>{c.title}</summary><p>{c.description}</p><SourceLinks refs={c.sources}/></details>;})}
          <details><summary>Manual edits and overrides ({draft.overrides.length})</summary><pre>{JSON.stringify(draft.overrides,null,2)}</pre></details>
        </>}
      </aside>
    </div>
  </section>;
}

function SourceLinks({refs}){return <p>{refs.map(ref=><span key={ref.id}>{ref.pages.map(page=><a key={page} href={`/api/designer/sources/${ref.id}#page=${page}`} target="_blank" rel="noreferrer">{ref.id} p. {page} </a>)}</span>)}</p>;}
function ExistingEditor({plant,catalogue,onChange}){return <><label>Species<select value={plant.species} onChange={e=>onChange({...plant,species:e.target.value})}>{catalogue.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>{["x","y","radius"].map(k=><NumberEdit key={k} label={`Existing ${k} (m)`} value={plant[k]} onCommit={v=>onChange({...plant,[k]:v})}/>)}</>;}

function PlantDimensions({id,draft,overlays,command,disabled}) {
  const record=draft.bundle.plant_dimensions.plants.find(p=>p.id===id);
  return <section className="plant-dimensions"><h3>Plant dimensions</h3>
    <p>{record===undefined?"Custom plant: no botanical dimensions have been verified.":record.stock}</p>
    {[{key:"root_ball",label:"Root-ball diameter at planting"},{key:"crown",label:"Indicative mature crown diameter"}].map(feature=><DimensionEditor key={feature.key} id={id} feature={feature} overlay={overlays[feature.key]} command={command} disabled={disabled} hasOverride={Object.hasOwn(draft.dimensions,id)&&draft.dimensions[id][feature.key]!==null}/>)}
    {record!==undefined&&<details><summary>Stock, evidence and limitations</summary><p>{record.limitations}</p><p>Reviewed {record.reviewed}. Garden spread ranges are not dryland growth predictions. Root-ball width must be measured or supplied for the actual nursery stock.</p>{record.references.map(url=><p key={url}><a href={url} target="_blank" rel="noreferrer">Botanical/reference source ↗</a></p>)}</details>}
  </section>;
}

function DimensionEditor({id,feature,overlay,command,disabled,hasOverride}) {
  const [diameter,setDiameter]=useState(""), [basis,setBasis]=useState(""), [note,setNote]=useState("");
  const valid=diameter!==""&&Number(diameter)>0&&Number(diameter)<=200&&basis!=="";
  return <div className="dimension-editor"><strong>{feature.label}</strong>
    {overlay===null?<p>Not established · no circle drawn.</p>:<p>{overlay.diameter_m[0]===overlay.diameter_m[1]?overlay.diameter_m[0]:`${overlay.diameter_m[0]}–${overlay.diameter_m[1]}`} m · {overlay.evidence}<small>{overlay.context}</small>{overlay.source!==null&&<a href={overlay.source} target="_blank" rel="noreferrer">Source · {overlay.section} ↗</a>}</p>}
    <details><summary>{hasOverride?"Edit your dimension":"Enter a measured or assumed dimension"}</summary><fieldset disabled={disabled}>
      <label>{feature.label} (m)<input type="number" min="0.001" max="200" step="any" value={diameter} onChange={e=>setDiameter(e.target.value)}/></label>
      <label>Dimension basis<select value={basis} onChange={e=>setBasis(e.target.value)}><option value="">Choose basis</option><option value="measured">Measured / supplied stock dimensions</option><option value="assumption">My planning assumption</option></select></label>
      <label>Measurement or assumption note<input value={note} onChange={e=>setNote(e.target.value)} maxLength="500"/></label>
      <button type="button" disabled={!valid} onClick={()=>command({kind:"dimension",id,feature:feature.key,value:{diameter:Number(diameter),basis,note}})}>Use this diameter</button>
      {hasOverride&&<button type="button" onClick={()=>command({kind:"dimension",id,feature:feature.key,value:null})}>Clear override</button>}
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
    <title>Assumed rectangular planting zone</title><desc>Proposed plants, existing vegetation, optional moisture pocket and surface mulch. Plant symbols can be selected using the keyboard; coordinates can be edited in the inspector.</desc>
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
