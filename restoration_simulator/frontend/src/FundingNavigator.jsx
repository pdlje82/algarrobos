import {detachLocationCriterion} from "./fundingStatisticsState.js";
import React, {useEffect, useReducer, useRef, useState} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {Alert} from "./Alert.jsx";
import {money} from "./format.js";
import {FUNDING_STEPS, effectiveFacts, overrideAnswer, resetAnswer, fundingResults, answerLabel, fundingStatus, fundingClass, FUNDING_HELP, presentQuestion, logicalQuestionId, assumptionCount, explicitlyUnknown,fundingEntryAction,fundingSaveIsCurrent,fundingLanding} from "./fundingState.js";
import {FundingHelp} from "./FundingHelp.jsx";
import {ApplicantPicker,FundingAnswers} from "./FundingAnswers.jsx";
import {FundingQuestionHelp} from "./FundingQuestionHelp.jsx";
import {FundingMunicipality} from "./FundingMunicipality.jsx";
import {FundingVisualisation} from "./FundingVisualisation.jsx";
import {revealFundingColumn} from "./fundingLayout.js";
import {FundingQuestionEditor} from "./FundingQuestionEditor.jsx";
import {FundingWorkingOption} from "./FundingWorkingOption.jsx";
import {fundingVisualReducer, initialFundingVisual} from "./fundingVisualState.js";
import {FundingSelectionEditor} from "./FundingSelection.jsx";
import {FundingSelectionGuidanceProvider} from "./FundingSelectionGuidance.jsx";
import {selectionProfile,selectionSummary,editSelectionRow,clearSelectionRow} from "./fundingSelectionState.js";
import "./FundingNavigator.css";
import {FundingEdlProvider,FundingEdlNode,FundingEdlOpenButton} from "./FundingEdl.jsx";
import {FundingGuideProvider,FundingGuide} from "./FundingGuide.jsx";
import {useFundingProgrammes} from "./FundingProgrammes.jsx";
import {programmeForRoute,programmeMembers,validateProgrammeMembership,routeQuestionScope,visibleRouteQuestions,programmeConditions} from "./fundingProgrammeState.js";
import {FundingConceptProvider,FundingConceptPanel,ItemActivities} from "./ProjectConcept.jsx";
import {FundingOverview,FundingVersionComparison} from "./FundingOverview.jsx";
import {copyConcepts} from "./projectConceptState.js";
import {fundingFocus,editFundingFocus,validateFundingFocusMembership} from "./fundingFocusState.js";

function Sources({sources}) {
  return <ul className="funding-sources">{sources.map((s, i) => <li key={i}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink><small> · {s.role}</small></li>)}</ul>;
}
function Text({value}) {
  return <div className="funding-research">{value.split("\n").filter(line => line.trim()).map((line, i) => <p key={i}>{line.replace(/^[-*]\s*/, "").replace(/\*\*/g, "").split(/(https:\/\/[^\s]+)/g).map((part,j)=>part.startsWith("https://")?<DocumentLink key={j} href={part} target="_blank" rel="noreferrer">{part}</DocumentLink>:part)}</p>)}</div>;
}
function Option({result:r, selected, disabled=false, onSelect,working,onWork,workingGroup,programmeStandalone=false,onReadProgramme}) {
  if(fundingClass(r)==="unimplemented")return <article className="funding-option">
    {programmeStandalone?<button type="button" onClick={onReadProgramme}>Read programme or approach guide</button>:<FundingGuide id={r.id}/>}
    <div className="funding-pick"><input type="checkbox" aria-label={`Shortlist ${r.id}`} checked={selected} disabled={disabled} onChange={onSelect}/><strong>{r.id} · {r.title}</strong></div>
    <FundingWorkingOption id={r.id} checked={working} onChange={onWork} group={workingGroup}/>
    <details><summary>Original research and saved assessment context</summary>
      <p>This context belongs to the exploration’s catalogue snapshot. The dated introduction above is current reference information.</p>
      <dl className="funding-meta"><dt>Recorded availability</dt><dd>{r.availability}</dd><dt>Evidence</dt><dd>{r.source_strength}</dd><dt>Maturity</dt><dd>{r.maturity}</dd><dt>Source check</dt><dd>{r.checked_on}</dd></dl>
      <Text value={r.description}/><Sources sources={r.sources}/>
      {r.source_gaps.map(g=><p className="reason" key={g}>{g}</p>)}
      <FundingEdlNode bindingId={r.id}/>
    </details>
  </article>;
  return <article className="funding-option">
    <div className="funding-pick"><input type="checkbox" aria-label={`Shortlist ${r.id}`} checked={selected} disabled={disabled} onChange={onSelect}/><strong>{r.id} · {r.title}</strong></div>
    <FundingWorkingOption id={r.id} checked={working} onChange={onWork} group={workingGroup}/>
    <p className={`funding-status funding-outcome-${fundingClass(r)}`}>{fundingStatus(r)} <FundingHelp label={fundingStatus(r)}>{FUNDING_HELP[fundingClass(r)]}</FundingHelp></p>
    <p>{r.mechanism.replaceAll("_", " ")} · {r.availability}</p>
    <p>{r.finance.basis}{r.finance.estimate !== null ? ` · Conditional estimate ${money(r.finance.estimate)}` : " · Amount not entered"}</p>
    <details><summary>Why this result? Definitions and conditions</summary>
      <dl className="funding-meta"><dt>Availability</dt><dd>{r.availability}</dd><dt>Evidence</dt><dd>{r.source_strength}</dd><dt>Maturity</dt><dd>{r.maturity}</dd><dt>Source check</dt><dd>{r.checked_on}</dd></dl>
      {r.checks.map((c, i) => <div className={`funding-check funding-check-${c.result}`} key={i}><strong>{c.result === "fail" ? "Requires a change" : c.result === "unknown" ? "Unresolved" : "Matches this answer"}</strong><p>{c.message}</p><Sources sources={c.sources}/></div>)}
      {r.source_gaps.map(g => <p className="reason" key={g}>{g}</p>)}
      <details><summary>Read the research context</summary><Text value={r.description}/><Sources sources={r.sources}/></details>
      <FundingEdlNode bindingId={r.id}/>
      {r.related.length > 0 && <p>Related descriptions of financing: {r.related.join(", ")}. Check for overlap before combining.</p>}
    </details>
  </article>;
}

export function FundingNavigator({data, active, entry, request, onNavigate, onSaved, onSimulationFinancing, guardRef,beforeConceptTransfer,exploring=false}) {
  const [workspace, setWorkspace] = useState(null), [draft, setDraft] = useState(null);
  const [live,dispatchVisual] = useReducer(fundingVisualReducer,initialFundingVisual);
  const [visualContext,setVisualContext] = useState(0), [visualRetry,setVisualRetry] = useState(0), [inspected,setInspected] = useState(null);
  const [legacyFocus,setLegacyFocus] = useState({version:1,programme_id:null,route_id:null});
  const focus=draft===null||![3,4].includes(draft.version)?legacyFocus:fundingFocus(draft);
  const workingOption=focus.route_id,programmeId=focus.programme_id;
  const [programmeGuide,setProgrammeGuide]=useState(null);
  const programmeState=useFundingProgrammes(request);
  const [programmeDisplay,setProgrammeDisplay]=useState(null),[heldQuestionIds,setHeldQuestionIds]=useState([]),[heldMetIds,setHeldMetIds]=useState([]);
  useEffect(()=>{if(programmeState.value!==null)setProgrammeDisplay(current=>current===null?{...programmeState.value.library.defaults}:current);},[programmeState.value,programmeDisplay===null]);
  const [step, setStep] = useState(0), [questionId, setQuestionId] = useState(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [review, setReview] = useState(null);
  const [query, setQuery] = useState(""), [requireChanges, setRequireChanges] = useState(true);
  const [scope, setScope] = useState("activity"), [parcels, setParcels] = useState([]), [compareIds, setCompareIds] = useState([]);
  const [loadedScenarioId, setLoadedScenarioId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [answersOpen,setAnswersOpen]=useState(false),[upgrade,setUpgrade]=useState(null);
  const [workspaceReview,setWorkspaceReview]=useState(null),[comparison,setComparison]=useState(false);
  const [editingReview,setEditingReview]=useState(null);
  const [catalogueReview,setCatalogueReview]=useState(null),[answerReset,setAnswerReset]=useState(0);
  const [editor,setEditor]=useState(null);
  const [conceptTransferPending,setConceptTransferPending]=useState(false);
  const [saveRecovery,setSaveRecovery]=useState(null);
  const recoveryRequest=useRef(null);
  const [groupTool,setGroupTool]=useState(null),[groupReview,setGroupReview]=useState(null);
  const [entryReview,setEntryReview]=useState(null);
  const [annexOpen,setAnnexOpen]=useState(false),[annexRoute,setAnnexRoute]=useState(null),[annexGroups,setAnnexGroups]=useState({}),[annexSignal,setAnnexSignal]=useState(0);
  const scoringRoute=draft?.version===4&&Object.hasOwn(draft.bundle.selection.routes,workingOption)?workingOption:annexRoute;
  useEffect(()=>{if(editor?.criterion&&editor.route!==scoringRoute)setEditor(null);},[scoringRoute]);
  const editorOpener=useRef(null);
  const evaluationDelay=useRef(0);
  const serial = useRef(0), retry = useRef(null), draftRef = useRef(null);
  const loadSerial = useRef(0);
  draftRef.current = draft;
  const revision = data.revision, planningRevision = data.planning.planning_revision;
  const visualInputKey = JSON.stringify({draft,revision,planningRevision,visualRetry});
  const visualValue = live.context === visualContext ? live.value : null;
  const assessment = visualValue?.assessment ?? null;
  const evaluating = draft !== null && (live.context !== visualContext || live.inputKey !== visualInputKey || live.status === "pending" || live.status === "idle");
  const visualFailure = live.context === visualContext && live.inputKey === visualInputKey ? live.error : "";
  function resetVisual() {setProgrammeGuide(null);setLegacyFocus({version:1,programme_id:null,route_id:null});setHeldQuestionIds([]);setProgrammeDisplay(programmeState.value===null?null:{...programmeState.value.library.defaults});setAnnexOpen(false);setAnnexRoute(null);setAnnexGroups({});serial.current++;dispatchVisual({type:"reset"});setVisualContext(k=>k+1);setInspected(null);setCatalogueReview(null);setAnswerReset(k=>k+1);setEditor(null);}
  async function context(target, parcelIds) {
    return request("funding/context", {revision, planning_revision: planningRevision, design_revision: data.designer_revision, target, parcel_ids: parcelIds});
  }
  useEffect(() => {
    const token = ++loadSerial.current; setBusy(true); setError("");
    (async () => {
      try {
        const w = await request("funding");
        let d = w.attachment.draft;
        const entryAction=fundingEntryAction(d,entry);
        if (entryAction==="create") d = await context(entry?.target ?? "activity", entry?.parcelId ? [entry.parcelId] : []);
        let editingNotice=entryAction==="resume"?"Resumed your saved funding exploration, including its answers, annex selections and notes.":"";
        let applicantReview=null;
        if(d.version<3)editingNotice="This version retains its original editing format. Review the format before editing.";
        if (token === loadSerial.current) {resetVisual();setEntryReview(entryAction==="review"?{target:entry.target,parcelIds:entry.parcelId===undefined?[]:[entry.parcelId]}:null);setWorkspace(w); setDraft(d); setScope(d.baseline.target); setParcels(d.baseline.parcel_ids); setStep(fundingLanding(d)); setQuestionId(null); setDirty(!fundingSaveIsCurrent(d,w.attachment.draft)); setReview(null); setLoadedScenarioId(null); setNotice(editingNotice);setUpgrade(applicantReview===null?null:{review:applicantReview,visible:true,previous:null,targetStep:0});retry.current = null;}
      } catch (e) {if (token === loadSerial.current) setError(e.message);}
      finally {if (token === loadSerial.current) setBusy(false);}
    })();
    return () => {loadSerial.current++;};
  }, [data.project.id, entry?.token, reloadKey]);
  useEffect(()=>{
    if(workspace===null||busy||dirty||workspace.funding_revision===data.funding_revision)return;
    let disposed=false;
    request("funding").then(w=>{if(!disposed){setWorkspace(w);if(w.attachment.draft===null)throw Error("The saved exploration is missing. Reload funding explicitly.");setDraft(w.attachment.draft);}}).catch(e=>{if(!disposed)setError(e.message);});
    return()=>{disposed=true;};
  },[data.funding_revision,workspace?.funding_revision,busy,dirty]);
  useEffect(() => {
    if (draft === null || !active) return;
    const token = ++serial.current;
    dispatchVisual({type:"start",context:visualContext,token,inputKey:visualInputKey});
    const timer = setTimeout(async () => {
      try {const value = await request("funding/visualise", {revision, draft}); if (serial.current === token) dispatchVisual({type:"success",context:visualContext,token,value});}
      catch (e) {if (serial.current === token) dispatchVisual({type:"error",context:visualContext,token,error:e.message});}
    }, evaluationDelay.current);
    return () => {clearTimeout(timer); serial.current++;};
  }, [draft, revision, planningRevision, active, visualContext, visualRetry]);
  useEffect(() => {
    const warn = e => {if (dirty) {e.preventDefault(); e.returnValue = "";}};
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // Autosave is draft-only. Named alternatives and adoption remain explicit actions.
  useEffect(() => {
    if (!dirty || busy || conceptTransferPending || workspace === null || draft === null || ![3,4].includes(draft.version) || retry.current !== null || !active) return;
    const timer = setTimeout(() => save("draft"), 1200);
    return () => clearTimeout(timer);
  }, [draft, dirty, busy, active,conceptTransferPending,revision,planningRevision,workspace?.funding_revision]);
  function edit(next,delay=0) {evaluationDelay.current=delay;setDraft(next); setDirty(true); setReview(null); setNotice("");}
  useEffect(()=>{if(guardRef)guardRef.current={dirty:dirty||conceptTransferPending,flush:()=>save("draft")};return()=>{if(guardRef)guardRef.current=null;};});
  async function save(operation, recordId = null, suppliedDraft=undefined) {
    if(conceptTransferPending){setError("Wait for the reviewed concept transfer to finish, then retry saving.");return false;}
    if (busy || workspace === null || !["delete","activate","duplicate","create_version"].includes(operation)&&![3,4].includes(draft?.version)) return false;
    if(operation === "save" && recordId === null)recordId=loadedScenarioId;
    const body = retry.current ?? {revision, funding_revision: workspace.funding_revision, planning_revision: planningRevision, design_revision: data.designer_revision, request_id: crypto.randomUUID(), operation, draft: ["delete","activate","duplicate"].includes(operation) ? null : suppliedDraft===undefined?draft:suppliedDraft, record_id: operation==="draft"&&workspace.attachment.version===2?workspace.attachment.active_version_id:recordId, ...(operation==="upgrade_workspace"?{preview_hash:workspaceReview.value.preview_hash}:{})};
    if (body.operation !== operation) {setError("Retry the failed save or reload saved funding before a different operation."); return false;}
    retry.current = body; setBusy(true); setError("");
    try {
      const w = await request("funding/save", body);
      const expectedId=["duplicate","create_version"].includes(operation)?body.request_id:["activate","upgrade_workspace"].includes(operation)?body.record_id:null;
      if(expectedId!==null&&w.attachment.active_version_id!==expectedId){setSaveRecovery(w);throw Error("The version operation was recorded, but another window changed the active version. Review the current versions before continuing.");}
      setWorkspace(w); retry.current = null;
      if(["upgrade_workspace","activate","duplicate","create_version"].includes(operation)||operation==="delete"&&recordId===workspace.attachment.active_version_id){resetVisual();setDraft(w.attachment.draft);setDirty(false);setLoadedScenarioId(w.attachment.active_version_id);if(w.attachment.draft!==null){setStep(fundingLanding(w.attachment.draft));setScope(w.attachment.draft.baseline.target);setParcels(w.attachment.draft.baseline.parcel_ids);}setWorkspaceReview(null);setComparison(false);await onSaved();return true;}
      const savedCurrent=operation!=="delete"&&fundingSaveIsCurrent(body.draft,draftRef.current);
      if (savedCurrent) setDirty(false);
      if(operation !== "draft")setReview(null); setNotice(operation === "adopt" ? "Funding plan adopted. No cash, simulation time, application or ownership changed." : operation === "save" ? "Named exploration saved." : operation === "delete" ? "Funding record deleted." : savedCurrent?"Exploration draft saved.":"Earlier draft saved; your latest edits are still waiting to be saved.");
      if(operation === "delete" && recordId === loadedScenarioId)setLoadedScenarioId(null);
      await onSaved(); return operation==="delete"||savedCurrent;
    } catch(e) {setError(e.message);return false;}
    finally {setBusy(false);}
  }
  async function previewWorkspace(){
    setBusy(true);setError("");try{const latest=await request("project"),input=JSON.stringify(draftRef.current),original=draftRef.current,value=await request("funding/workspace-preview",{revision:latest.revision,draft:original,version_id:crypto.randomUUID()});if(input!==JSON.stringify(draftRef.current))throw Error("The draft changed. Review the workspace update again.");await onSaved();setWorkspaceReview({value,input,original});}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function confirmWorkspace(){if(workspaceReview.input!==JSON.stringify(draftRef.current)){setError("The draft changed. Prepare the update again.");return;}await save("upgrade_workspace",workspaceReview.value.version_id,workspaceReview.original);}
  async function previewEditingFormat(){setBusy(true);setError("");try{const prepared=await request("funding/prepare",{revision,draft});if(prepared.applicant_review===null)setEditingReview({prepared,input:JSON.stringify(draft)});else setUpgrade({review:prepared.applicant_review,visible:true,previous:null,targetStep:0});}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function activateVersion(id){if(id===workspace.attachment.active_version_id)return;if(dirty&&!await save("draft"))return;await save("activate",id);}
  async function duplicateVersion(){if(dirty&&!await save("draft"))return;await save("duplicate",workspace.attachment.active_version_id);}
  async function refresh() {
    if(![3,4].includes(draft.version)){setError("Review the applicant choice before refreshing this previous assessment.");return;}
    setBusy(true); setError("");
    try {const latest=await request("project");const prepared=await request("funding/prepare",{revision:latest.revision,draft,adopt_current_catalogue:true});if(prepared.applicant_review!==null)throw Error("Review the applicant choice before updating the catalogue.");await onSaved();setCatalogueReview({prepared,input:JSON.stringify(draft)});}
    catch (e) {setError(e.message);} finally {setBusy(false);}
  }
  async function recoverSavedContext(){
    if(conceptTransferPending)return;
    setBusy(true);setError("");
    try{const w=await request("funding");if(workspace.attachment.version!==w.attachment.version||workspace.attachment.version===2&&workspace.attachment.active_version_id!==w.attachment.active_version_id||!fundingSaveIsCurrent(w.attachment.draft,workspace.attachment.draft)&&!fundingSaveIsCurrent(w.attachment.draft,draftRef.current)){recoveryRequest.current=null;setSaveRecovery(w);return;}setWorkspace(w);retry.current=null;setDirty(!fundingSaveIsCurrent(draftRef.current,w.attachment.draft));await onSaved();setNotice("Save revisions refreshed. Your current draft and its recorded baseline are retained.");}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function resolveSaveRecovery(keepLocal){
    setBusy(true);setError("");
    try{
      let restored=saveRecovery;
      if(keepLocal&&saveRecovery.attachment.version===2&&(workspace.attachment.version===1||workspace.attachment.active_version_id!==saveRecovery.attachment.active_version_id)){
        if(recoveryRequest.current===null){const current=await request("project"),oldId=workspace.attachment.version===2?workspace.attachment.active_version_id:null;
          if(oldId!==null&&!saveRecovery.attachment.scenarios.some(r=>r.id===oldId))throw Error("Your original version was removed. Your draft is retained in the comparison; copy it before choosing another saved version.");
          let copy=draftRef.current;if(oldId===null&&Object.hasOwn(copy,"project_concepts"))copy={...copy,project_concepts:copyConcepts(copy.project_concepts)};
          recoveryRequest.current={revision:current.revision,funding_revision:saveRecovery.funding_revision,planning_revision:current.planning.planning_revision,design_revision:current.designer_revision,request_id:crypto.randomUUID(),operation:oldId===null?"create_version":"activate",record_id:oldId,draft:oldId===null?copy:null};
        }
        restored=await request("funding/save",recoveryRequest.current);const expected=recoveryRequest.current.operation==="activate"?recoveryRequest.current.record_id:recoveryRequest.current.request_id;
        if(restored.attachment.active_version_id!==expected)throw Error("The active version changed again. Refresh saved versions and review the comparison; your draft is retained.");
        if(recoveryRequest.current.operation==="create_version")setDraft(restored.attachment.draft);
      }
      setWorkspace(restored);retry.current=null;recoveryRequest.current=null;
      if(!keepLocal){if(restored.attachment.draft===null)throw Error("The saved draft is absent. Copy your local draft before choosing another version.");resetVisual();setDraft(restored.attachment.draft);setStep(fundingLanding(restored.attachment.draft));setDirty(false);}else setDirty(true);
      setSaveRecovery(null);await onSaved();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function applyCatalogueReview(){
    if(conceptTransferPending){setError("Wait for the reviewed concept transfer to finish before changing exploration context.");return;}
    if(catalogueReview.input!==JSON.stringify(draft)){setError("Answers changed while the update was being reviewed. Prepare the update again.");setCatalogueReview(null);return;}
    const next=catalogueReview.prepared.draft;resetVisual();edit(next);retry.current=null;setNotice("Updated baseline and catalogue applied to this editing copy. Saved alternatives and adopted plans are unchanged.");
  }
  async function start() {
    if(conceptTransferPending){setError("Wait for the reviewed concept transfer to finish before changing exploration context.");return;}
    setBusy(true); setError("");
    try {if (dirty) throw new Error("Save the current draft before starting a separate exploration."); const d = await context(scope, parcels);if(workspace.attachment.version===2){setBusy(false);await save("create_version",null,d);}else{resetVisual();edit(d);}setUpgrade(null); setLoadedScenarioId(null); setQuestionId(null); setStep(0);}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function switchEntryContext(){
    if(conceptTransferPending){setError("Wait for the reviewed concept transfer to finish before changing exploration context.");return;}
    setBusy(true);setError("");
    let next;
    try{next=await context(entryReview.target,entryReview.parcelIds);}
    catch(e){setError(e.message);return;}
    finally{setBusy(false);}
    // Save the current exploration by name before replacing the active draft.
    // Read failures above and failed writes below leave the current draft intact.
    const alreadyNamed=workspace.attachment.scenarios.some(record=>fundingSaveIsCurrent(record.draft,draftRef.current));
    if(!await save(alreadyNamed?"draft":"save"))return;
    resetVisual();edit(next);setScope(next.baseline.target);setParcels(next.baseline.parcel_ids);setStep(0);setQuestionId(null);setLoadedScenarioId(null);setEntryReview(null);
    setNotice("Previous exploration preserved as a named alternative. The new exploration will autosave separately as the active draft.");
  }
  async function previewAdoption() {
    setBusy(true); setError("");
    try {const a = await request("funding/plan-preview", {revision, draft}); setReview(a);}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function openSaved(record,targetStep,duplicate=false) {
    if(conceptTransferPending){setError("Wait for the reviewed concept transfer to finish before changing exploration context.");return;}
    if(dirty&&!await save("draft"))return;
    if(workspace.attachment.version===2){if(targetStep===5){const next={...record.draft,name:(record.draft.name+" revision").slice(0,80)};if(Object.hasOwn(next,"project_concepts"))next.project_concepts=copyConcepts(next.project_concepts);await save("create_version",null,next);}else{await activateVersion(record.id);}return;}
    if(record.draft.version<3){resetVisual();setDraft(record.draft);setDirty(false);setUpgrade(null);setStep(0);setLoadedScenarioId(record.id);return;}
    const previous={draft:draftRef.current,step,questionId,loadedScenarioId};
    setBusy(true);setError("");
    try {
      const prepared=await request("funding/prepare",{revision,draft:record.draft});
      resetVisual();const next={...prepared.draft,name:duplicate ? (prepared.draft.name+" copy").slice(0,80) : prepared.draft.name};
      if(duplicate&&Object.hasOwn(next,"project_concepts"))next.project_concepts=copyConcepts(next.project_concepts);
      if(prepared.applicant_review===null){edit(next);setUpgrade(null);}else{setDraft(next);setDirty(false);setReview(null);setUpgrade({review:prepared.applicant_review,visible:true,previous,targetStep});}
      setLoadedScenarioId(!duplicate ? record.id : null);setStep(targetStep===5?3:fundingLanding(next));setQuestionId(null);setNotice(prepared.notice);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  if(draft===null&&workspace?.attachment.version===2)return <section className="panel"><h1>Funding Navigator</h1><p>No active version. Choose a saved version or create another.</p>{workspace.attachment.scenarios.map(record=><button key={record.id} disabled={busy} onClick={()=>save("activate",record.id)}>{record.draft.name}</button>)}<button disabled={busy} onClick={start}>Create project version</button>{error&&<Alert variant="error" title="Version retained">{error}{retry.current&&<button onClick={()=>save(retry.current.operation,retry.current.record_id)}>Retry version operation</button>}</Alert>}</section>;
  if (draft === null || workspace === null) return <section className="panel"><h1>Funding Navigator</h1>{error ? <Alert variant="error" title="Funding unavailable">{error}<button onClick={()=>setReloadKey(k=>k+1)}>Retry loading funding</button></Alert> : <p role="status">Loading funding context…</p>}</section>;
  const facts=effectiveFacts(draft),c=draft.bundle,parties=draft.baseline.parties;
  const definitions=visualValue===null?[]:visualValue.input_context.questions;
  const questionStates=definitions.map(q=>presentQuestion(q,draft));
  const requested=questionStates.find(q=>q.id===questionId);
  let programmeFailure="";
  if(programmeState.value!==null){try{validateProgrammeMembership(programmeState.value,c);validateFundingFocusMembership(programmeState.value,draft);}catch(e){programmeFailure=e.message;}}
  let programme=programmeState.value===null||programmeId===null||programmeFailure!==""?null:programmeState.value.library.programmes.find(p=>p.id===programmeId);
  if(programme===undefined){programmeFailure="The selected programme is absent from this reference edition. Clear programme focus or retry the programme list.";programme=null;}
  const effectiveProgrammeState=programmeFailure===""?programmeState:{...programmeState,value:null,error:programmeFailure};
  const programmeRoutes=programme===null?[]:programmeMembers(programme,c);
  const questionRouteIds=programmeDisplay!==null&&programmeDisplay.compare?programmeRoutes:workingOption===null?[]:[workingOption];
  const displayConditions=visualValue===null?null:programmeConditions(visualValue.visualisation.conditions,c);
  const routeScope=visualValue===null||programmeDisplay===null||programme===null?null:routeQuestionScope(questionStates,displayConditions,questionRouteIds,programmeDisplay.show_amount);
  const graphQuestionList=routeScope===null?[]:visibleRouteQuestions(routeScope,{showMet:programmeDisplay.show_met,heldIds:editor===null?[]:heldQuestionIds,pinnedIds:annexOpen?["selection_score"]:[]});
  const budgetQuestions=questionStates.filter(q=>q.step===4&&q.relevant);
  const questions=editor!==null&&editor.flow==="budget"?budgetQuestions:graphQuestionList;
  const q=requested===undefined?questions[0]:requested;
  const questionIndex=q===undefined?-1:questions.findIndex(x=>x.id===q.id);
  const current=assessment!==null&&[3,4].includes(draft.version)&&live.status==="success"&&live.inputKey===visualInputKey&&!evaluating;
  const readOnly=![3,4].includes(draft.version);
  const results=assessment===null?[]:assessment.results,selected=results.filter(r=>draft.selected.includes(r.id));
  const filtered=fundingResults(results,{query,requireChanges});
  const visualStep=step===0;
  const activityPending=evaluating&&(assessment===null||assessment.facts.activity!==facts.activity);
  if(assessment!==null&&JSON.stringify(assessment.draft)===JSON.stringify(draft))Object.assign(facts,assessment.facts);
  function updateFocus(pid,rid){
    if([3,4].includes(draft.version))edit(editFundingFocus(draft,pid,rid));
    else setLegacyFocus({version:1,programme_id:pid,route_id:rid});
  }
  function workOnRoute(id,selectedProgramme=programmeId){
    if(conceptTransferPending){setError("Wait for the reviewed concept transfer to finish before changing routes.");return false;}
    if(effectiveProgrammeState.value===null){setError("Load the programme list before choosing a route. Use Retry programme list if loading failed.");return false;}
    if(id!==null){
      let p;try{p=programmeForRoute(programmeState.value,id);}catch(e){setError(e.message);return false;}
      if(!c.entries.some(e=>e.id===id)){setError("This route is absent from the saved catalogue. Review the catalogue update before selecting it.");return false;}
      selectedProgramme=p.id;
    }
    updateFocus(selectedProgramme,id);setInspected(null);setEditor(null);setQuestionId(null);setAnnexOpen(false);setAnnexRoute(null);setHeldQuestionIds([]);setProgrammeDisplay({...programmeState.value.library.defaults});return true;
  }
  function openProgrammeGuide(id,opener){
    if(effectiveProgrammeState.value===null||!effectiveProgrammeState.value.library.programmes.some(p=>p.id===id)){setError("The programme guide is unavailable. Retry the programme list.");return;}
    setProgrammeGuide({id,opener});
  }
  function closeProgrammeGuide(){const opener=programmeGuide.opener;setProgrammeGuide(null);requestAnimationFrame(()=>{if(opener.isConnected){const column=opener.closest("[data-graph-column]");if(column!==null)revealFundingColumn(opener,column.dataset.graphColumn);opener.scrollIntoView({block:"nearest",inline:"nearest"});opener.focus({preventScroll:true});}});}
  function chooseProgramme(id){
    if(conceptTransferPending){setError("Wait for the reviewed concept transfer to finish before changing exploration context.");return;}
    setProgrammeGuide(null);
    if(id===null){updateFocus(null,null);setEditor(null);setQuestionId(null);setAnnexOpen(false);setAnnexRoute(null);setHeldQuestionIds([]);setProgrammeDisplay(programmeState.value===null?null:{...programmeState.value.library.defaults});return;}
    if(effectiveProgrammeState.value===null){setError("The programme list is unavailable. Retry loading it.");return;}
    const p=programmeState.value.library.programmes.find(p=>p.id===id);
    if(p===undefined){setError("Unknown funding programme. Retry the programme list.");return;}
    setQuery("");setRequireChanges(true);
    const members=programmeMembers(p,c);
    if(members.length===1){workOnRoute(members[0]);return;}
    workOnRoute(null,id);
  }
  function holdMetGroup(scope){setHeldMetIds(scope!==null&&programmeDisplay!==null&&programmeDisplay.show_met?scope.met.filter(q=>!(annexOpen&&q.id==="selection_score")).map(q=>q.id):[]);}
  function navigateQuestion(id,trigger){
    const target=questionStates.find(q=>q.id===id);
    if(target===undefined)throw Error("The route question is unavailable. Retry assessment.");
    if(target.type==="selection"){focusQuestion(id,trigger);return;}
    holdMetGroup(routeScope);setHeldQuestionIds(routeScope===null?[]:[...new Set([...visibleRouteQuestions(routeScope,{showMet:programmeDisplay.show_met,heldIds:[],pinnedIds:annexOpen?["selection_score"]:[]}).map(q=>q.id),id])]);setQuestionId(id);
  }
  function focusQuestion(id,trigger=null,routeId=null,flow="route"){
    if(routeId!==null&&!workOnRoute(routeId))return;
    const logical=logicalQuestionId(id),target=questionStates.find(x=>x.id===logical);
    if(target===undefined)throw Error("Funding question is unavailable in the current context.");
    if(target.type==="selection"){
      const targetRoute=routeId===null?scoringRoute:routeId;
      if(targetRoute===null){chooseProgramme("LEADER-AL20");setStep(0);setNotice("Choose an AL20 assessment route on the right to open its annex.");return;}
      setAnnexRoute(targetRoute);setStep(0);setQuestionId(logical);setEditor(null);setAnnexOpen(true);setAnnexSignal(k=>k+1);return;
    }
    const editingScope=routeId===null?routeScope:routeQuestionScope(questionStates,displayConditions,[routeId],programmeDisplay.show_amount);
    holdMetGroup(editingScope);setHeldQuestionIds(editingScope===null?[]:[...new Set([...(routeId===null?graphQuestionList:editingScope.attention).map(q=>q.id),logical])]);
    const opener=trigger===null?document.activeElement:trigger;
    editorOpener.current=opener;
    if(step===0&&opener.closest(".funding-diagram-scroll")!==null&&editingScope!==null&&editingScope.all.some(q=>q.id===logical))revealFundingColumn(opener,"requirements");
    const bounds=opener.getBoundingClientRect();
    const anchor={left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom};
    if(opener.matches(".funding-circumstance")){
      anchor.graph={panel:opener.closest(".funding-diagram-scroll"),node:opener};
    }
    setQuestionId(logical);setEditor({anchor,flow});
  }
  function closeEditor(){setEditor(null);requestAnimationFrame(()=>{const opener=editorOpener.current;const trigger=opener?.isConnected&&opener.getClientRects().length?opener:document.querySelector(".funding-requirements-met")||document.querySelector(".funding-edit-questions");if(trigger!==null){const column=trigger.closest("[data-graph-column]");if(column!==null)revealFundingColumn(trigger,column.dataset.graphColumn);trigger.focus({preventScroll:true});}});}

  function navigateStep(next){setEditor(null);setStep(next);setQuestionId(null);}
  function changeAnswer(id,value,delay=0){edit(overrideAnswer(draft,id,value),delay);}
  function clearAnswer(id){if(id==="selection_score"&&draft.version===4){
    const next=Object.fromEntries(Object.entries(draft.selection_assessments).map(([route,a])=>[route,{criteria:Object.fromEntries(Object.entries(a.criteria).map(([cid,row])=>[cid,clearSelectionRow(row,null)]))}]));
    edit({...draft,selection_assessments:next});return;
  }setAnswerReset(k=>k+1);changeAnswer(id,id==="applicant_choice"?{kind:"unknown"}:null);}
  function restoreAnswer(id){if(id==="selection_score"&&draft.version===4){clearAnswer(id);return;}setAnswerReset(k=>k+1);edit(resetAnswer(draft,id));}
  function flushAssessment(){if(evaluationDelay.current){evaluationDelay.current=0;setVisualRetry(k=>k+1);}}
  function selectOption(id){edit({...draft,selected:draft.selected.includes(id)?draft.selected.filter(v=>v!==id):[...draft.selected,id],allocations:draft.selected.includes(id)?draft.allocations.filter(a=>a.mechanism_id!==id):draft.allocations});}
  async function resolveApplicant(choice){
    setBusy(true);setError("");
    try{const prepared=await request("funding/prepare",{revision,draft,applicant_choice:choice});resetVisual();edit(prepared.draft);setStep(upgrade.targetStep);setQuestionId("applicant_choice");setNotice(prepared.notice);setUpgrade(null);}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function cancelUpgrade(){
    if(upgrade.previous!==null){const previous=upgrade.previous;resetVisual();setDraft(previous.draft);setStep(previous.step);setQuestionId(previous.questionId);setLoadedScenarioId(previous.loadedScenarioId);setDirty(false);setUpgrade(null);}
    else setUpgrade({...upgrade,visible:false});
  }
  function questionNavigation(){return <div className="funding-actions funding-question-navigation"><button disabled={activityPending||questionIndex<=0} onClick={e=>navigateQuestion(questions[questionIndex-1].id,e.currentTarget)}>Previous question</button><button disabled={activityPending||questionIndex<0||questionIndex>=questions.length-1} onClick={e=>navigateQuestion(questions[questionIndex+1].id,e.currentTarget)}>Next question</button>{questionIndex<0&&questions.length>0&&<button onClick={e=>navigateQuestion(questions[0].id,e.currentTarget)}>Return to current questions</button>}</div>;}
  function stageNavigation(){return <div className="funding-actions funding-stage-navigation"><button disabled={step===0} onClick={()=>navigateStep(step-1)}>← Previous</button><button disabled={step===3} onClick={()=>navigateStep(step+1)}>Next →</button></div>;}
  function openCriterion(id,trigger,choice=null){
    setHeldQuestionIds(graphQuestionList.map(q=>q.id));holdMetGroup(routeScope);
    if(scoringRoute===null)throw Error("Choose an AL20 scoring route first.");
    if(step===0)revealFundingColumn(trigger,"requirements");
    editorOpener.current=trigger;
    const bounds=trigger.getBoundingClientRect(),anchor={left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom};
    if(step===0)anchor.graph={panel:trigger.closest(".funding-diagram-scroll"),node:trigger};
    setQuestionId("selection_score");setEditor({anchor,criterion:id,route:scoringRoute,choice});
  }
  function chooseScoringRoute(route){if(workOnRoute(route)){setAnnexRoute(route);setAnnexOpen(true);}}
  async function reviewLocationLookup(settings,datasetHash){return request("funding/location-decision-preview",{revision,draft:draftRef.current,route:editor.route,settings,dataset_hash:datasetHash});}
  async function applyLocationLookup(settings,criteria,datasetHash,previewHash){
    const input=draftRef.current,route=editor.route;
    setBusy(true);
    try{
      const next=await request("funding/location-apply",{revision,draft:input,route,settings,criteria,dataset_hash:datasetHash,preview_hash:previewHash});
      if(!fundingSaveIsCurrent(input,draftRef.current))throw Error("Answers changed while the location lookup was calculated. Your newer answers are retained; apply the lookup again.");
      edit(next);setNotice(`Location comparison applied to ${criteria.join(" and ")}. Notes and references retained; autosave pending.`);
    }finally{setBusy(false);}
  }
  function manualLocationCriterion(id){
    const route=editor.route,assessment=draft.selection_assessments[route];
    if(!Object.hasOwn(assessment,"location_lookup"))throw Error("This route has no automatic location setup.");
    edit({...draft,selection_assessments:{...draft.selection_assessments,[route]:detachLocationCriterion(assessment,id)}});
  }
  const annex={open:annexOpen,signal:annexSignal,route:scoringRoute,groups:scoringRoute===null?[]:(Object.hasOwn(annexGroups,scoringRoute)?annexGroups[scoringRoute]:[]),
    onRoute:chooseScoringRoute,onCriterion:openCriterion,
    onGroup:id=>setAnnexGroups(current=>{const before=Object.hasOwn(current,scoringRoute)?current[scoringRoute]:[];return {...current,[scoringRoute]:before.includes(id)?before.filter(x=>x!==id):[...before,id]};}),
    onCollapse:()=>{setAnnexOpen(false);setEditor(null);requestAnimationFrame(()=>document.querySelector('.funding-circumstance[data-question-id="selection_score"]')?.focus({preventScroll:true}));},disabled:busy||readOnly};
  function answer(question,navigate=false){
    if(question.type==="selection")return <div className="funding-question"><h3>AL20 selection assessment</h3><p>{question.display_value}</p><button type="button" onClick={e=>focusQuestion(question.id,e.currentTarget)}>Open in graph</button>{question.legacy_selection_score!==null&&<p>Previous manual score: {question.legacy_selection_score} points (historical only; not used in this assessment).</p>}{navigate&&questionNavigation()}</div>;
    const value=question.current_value;
    return <div className="funding-question" key={question.id}><div className="funding-question-heading"><label htmlFor={`funding-${question.id}`}>{question.label}</label><FundingQuestionHelp question={question}/></div>
      <div className="funding-question-input">{question.type==="applicant"?<ApplicantPicker question={question} value={value} disabled={busy||readOnly} onChange={v=>changeAnswer(question.id,v)}/>
      :question.input_kind==="municipality"?<FundingMunicipality question={question} value={value} disabled={busy||readOnly} resetKey={answerReset} onChange={(v,delay=0)=>changeAnswer(question.id,v,delay)} onFlush={flushAssessment}/>
      :question.type==="choice"?<select id={`funding-${question.id}`} value={value===null?"":value} disabled={busy||readOnly} onChange={e=>changeAnswer(question.id,e.target.value===""?null:e.target.value)}><option value="">Not entered</option>{question.options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      :question.type==="party"?<select id={`funding-${question.id}`} value={value===null?"":value} disabled={busy||readOnly} onChange={e=>changeAnswer(question.id,e.target.value===""?null:e.target.value)}><option value="">Not entered</option>{parties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}<option value="hypothetical">Choose another partner / organisation</option></select>
      :<input id={`funding-${question.id}`} type={question.type==="number"?"number":"text"} min={question.min} max={question.max} step="any" value={value===null?"":value} disabled={busy||readOnly} placeholder="Not entered" onChange={e=>changeAnswer(question.id,e.target.value===""?null:question.type==="number"?Number(e.target.value):e.target.value,200)} onBlur={flushAssessment} onKeyDown={e=>{if(e.key==="Enter")flushAssessment();}}/>}</div>
      <div className="funding-question-tools"><div className="funding-actions funding-answer-controls"><button type="button" disabled={busy||readOnly||explicitlyUnknown(question)} onClick={()=>clearAnswer(question.id)}>Clear value</button><button type="button" disabled={busy||readOnly||!question.overridden} onClick={()=>restoreAnswer(question.id)}>Restore initial: {question.initial_label}</button></div>{navigate&&questionNavigation()}</div>
      <details><summary>Source context and original value</summary><p className="funding-basis">{question.origin} · Initial: {question.initial_label}</p></details>
      {question.type==="applicant"&&<p className="funding-applicant-note">Applicant type selected for this version.</p>}
    </div>;
  }
  function contextLabel(target,ids){
    const labels={activity:"Parcel/activity funding",demonstrator:"Demonstrator funding",business:"Business funding"};
    const names=ids.map(id=>{const parcel=data.project.parcels.find(p=>p.id===id);if(parcel===undefined)throw Error("The funding entry refers to a missing parcel. Reload the project.");return parcel.name;});
    return `${labels[target]} · ${names.length===0?"no linked parcels":names.join(", ")}`;
  }
  async function conceptTransferred(data,{preserveDraft}){const w=await request("funding");if(w.attachment.draft===null)throw Error("The synchronised exploration is missing. Reload the saved workspace.");setWorkspace(w);retry.current=null;setError("");if(!preserveDraft){setDraft(w.attachment.draft);setDirty(false);}else{setDirty(true);setNotice("The reviewed concept was synchronised. Your newer local edits are retained and still need saving.");}await onSaved();}
  return <FundingConceptProvider draft={draft} request={request} revision={revision} onChange={edit} disabled={busy||readOnly} beforeTransfer={async()=>await save("draft")&&await beforeConceptTransfer()} onTransferred={conceptTransferred} onTransferPending={setConceptTransferPending} transferPending={conceptTransferPending}><FundingGuideProvider request={request}><FundingEdlProvider request={request}><FundingSelectionGuidanceProvider request={request}><section className="funding-workspace" aria-labelledby="funding-title">
    <header className="panel"><p className="eyebrow">Explore · learn · compare</p><h1 id="funding-title">Funding Navigator</h1><p>Explore funding routes, shape your project and compare versions.</p>
      <div className="funding-version-header"><label>Version name<input id="funding-version-name" aria-label="Version name" maxLength={80} value={draft.name} disabled={busy||readOnly} onChange={e=>edit({...draft,name:e.target.value})}/></label><label>Open version<select aria-label="Open version" disabled={busy||conceptTransferPending} value={workspace.attachment.version===2?workspace.attachment.active_version_id===null?"":workspace.attachment.active_version_id:""} onChange={e=>{const record=workspace.attachment.scenarios.find(r=>r.id===e.target.value);if(record!==undefined)workspace.attachment.version===2?activateVersion(record.id):openSaved(record,1);}}><option value="" disabled>Working exploration</option>{workspace.attachment.scenarios.map(r=><option key={r.id} value={r.id}>{r.draft.name}</option>)}</select></label><div className="funding-actions"><button type="button" disabled={busy||readOnly} onClick={()=>document.getElementById("funding-version-name").focus()}>Rename</button><button type="button" disabled={busy||workspace.attachment.version!==2||conceptTransferPending} onClick={duplicateVersion}>Duplicate version</button><button type="button" disabled={busy||workspace.attachment.scenarios.length<2} onClick={async()=>{if(dirty&&!await save("draft"))return;setComparison(true);}}>Compare versions</button></div><p><strong>Programme:</strong> {programmeId===null?"Not selected":programme===null?programmeId:programme.title} · <strong>Route:</strong> {workingOption===null?"Not selected":workingOption}</p></div>
      <details className="funding-setup"><summary>Activity, site and other tools</summary><FundingEdlOpenButton/>
      {questionStates.length>0&&<p>Activity: {questionStates.find(q=>q.id==="activity").display_value} <button type="button" disabled={busy} onClick={e=>focusQuestion("activity",e.currentTarget)}>Choose activity</button></p>}
      <details><summary>Start a separate exploration</summary><label>Activity scope<select value={scope} onChange={e => setScope(e.target.value)}><option value="activity">Parcel / other activity</option><option value="demonstrator">Current demonstrator planning</option><option value="business">Start a self-employed rural business</option></select></label><fieldset><legend>Linked parcels (optional)</legend>{data.project.parcels.map(p => <label className="funding-pick" key={p.id}><input type="checkbox" checked={parcels.includes(p.id)} onChange={e => setParcels(e.target.checked ? [...parcels,p.id] : parcels.filter(id => id !== p.id))}/>{p.name}</label>)}</fieldset><button type="button" disabled={busy || dirty} onClick={start}>Start separate exploration</button></details></details>
    </header>
    <div className="panel funding-save-status" role="status" aria-label="Funding save status"><strong>{busy?"Saving / loading…":retry.current!==null?"Save failed — latest changes are not saved":dirty?"Unsaved changes — autosave pending":"Saved to this computer"}</strong><span>Answers, annex selections and notes autosave after 1.2 seconds without an edit. Wait for “Saved to this computer” before reloading.</span><button type="button" disabled={busy||readOnly||retry.current!==null} onClick={()=>save("draft")}>Save now</button></div>
    {entryReview!==null&&<section className="panel funding-entry-review" aria-label="Funding context review"><h2>Keep your saved exploration</h2><p>Saved exploration: {contextLabel(draft.baseline.target,draft.baseline.parcel_ids)}. Its answers have been retained.</p><p>Requested exploration: {contextLabel(entryReview.target,entryReview.parcelIds)}.</p><p>Continue the saved exploration, or preserve it as a named alternative before opening the requested activity.</p><button type="button" disabled={busy} onClick={()=>setEntryReview(null)}>Continue saved exploration</button><button type="button" disabled={busy||readOnly||retry.current!==null} onClick={switchEntryContext}>Save and open requested exploration</button>{readOnly&&<p>Review the previous applicant choice before saving and opening another exploration.</p>}</section>}
    {workspace.attachment.version===1&&<section className="panel funding-workspace-update"><p>Review the update to autosaved named versions and selected/not selected scoring. Your existing saved alternatives and adopted plans are retained.</p><button type="button" disabled={busy||readOnly} onClick={previewWorkspace}>Review workspace update</button></section>}
    {workspaceReview!==null&&<section className="panel funding-review" aria-label="Workspace update review"><h2>Review project version update</h2>{workspaceReview.value.messages.map((m,i)=><p key={i}>{m}</p>)}{workspaceReview.value.catalogue_review!==null&&<>{workspaceReview.value.catalogue_review.messages.map((m,i)=><p key={i}>{m}</p>)}{workspaceReview.value.catalogue_review.changes.map(c=><p key={c.id}>{c.label}: {String(c.before)} → {String(c.after)}</p>)}</>}<button type="button" disabled={busy} onClick={confirmWorkspace}>Use autosaved versions and selected-items scoring</button><button type="button" disabled={busy} onClick={()=>setWorkspaceReview(null)}>Keep current workspace</button></section>}
    {comparison&&<FundingVersionComparison versions={workspace.attachment.scenarios} currentId={workspace.attachment.version===2?workspace.attachment.active_version_id:null} request={request} revision={revision} onClose={()=>setComparison(false)}/>}
    <nav className="funding-steps" aria-label="Funding exploration areas">{FUNDING_STEPS.map((s,i) => <button key={s} type="button" disabled={busy||activityPending} aria-current={step === i ? "page" : undefined} onClick={() => navigateStep(i)}>{s}</button>)}</nav>
    {error && <Alert variant="error" title="Exploration retained">{error}{retry.current && <button disabled={busy} onClick={() => save(retry.current.operation, retry.current.record_id)}>Retry failed save</button>}<button disabled={busy||conceptTransferPending} onClick={recoverSavedContext}>Refresh save revisions and keep draft</button><button disabled={busy||conceptTransferPending} onClick={refresh}>Reload revisions and update assessment</button></Alert>}
    {saveRecovery!==null&&<section className="panel funding-review" aria-label="Review newer saved exploration"><h2>Review newer saved exploration</h2><p>The saved exploration changed since this editing copy was loaded. Choose explicitly before replacing either version. Local: {draft.name}; saved: {saveRecovery.attachment.draft===null?"No saved draft":saveRecovery.attachment.draft.name}.</p><details><summary>Compare answers, concepts and notes</summary><div className="concept-comparison">{[["Your current draft",draft],["Newer saved draft",saveRecovery.attachment.draft]].map(([label,value])=><div key={label}><strong>{label}</strong><pre>{value===null?"Absent":JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>key!=="bundle")),null,2)}</pre></div>)}</div></details><button type="button" disabled={busy} onClick={()=>resolveSaveRecovery(true)}>Keep my draft in its original version</button><button type="button" disabled={busy||saveRecovery.attachment.draft===null} onClick={()=>resolveSaveRecovery(false)}>Use saved exploration and discard local edits</button></section>}
    {!visualStep && evaluating && <p role="status">{assessment ? "Updating—showing previous assessment" : "Updating funding assessment…"}</p>}
    {!visualStep && visualFailure && <Alert variant="error" title="Assessment unavailable">{visualFailure}<p>{assessment ? "Showing previous assessment. Entered answers are retained." : "Entered answers are retained."}</p><button type="button" onClick={()=>setVisualRetry(k=>k+1)}>Retry assessment</button></Alert>}
    <p className="funding-notice" role="status">{notice}</p>
    {step===1&&<FundingOverview draft={draft} route={workingOption} request={request} revision={revision} versionId={workspace.attachment.version===2?workspace.attachment.active_version_id:"legacy"} onChange={edit} onItem={openCriterion} onExplore={()=>navigateStep(0)} onActivities={()=>navigateStep(2)} disabled={busy||readOnly}/> }
    {step===2&&(draft.version===4&&["LEADER-AL20-3.4","LEADER-AL20-3.5"].includes(scoringRoute)?<FundingConceptPanel route={scoringRoute}/>:<section className="panel"><h2>Activities and delivery</h2><p>Shared project activities and delivery planning currently support AL20 routes 3.4 and 3.5.</p><button type="button" onClick={()=>navigateStep(0)}>Explore routes</button></section>)}
    {draft.version===4&&annexOpen&&scoringRoute!==null&&<details className="panel"><summary>Criterion-wide assessment tools · {scoringRoute}</summary><p>These controls affect every answer in the chosen criterion. Notes, EDL references and project activities are retained.</p><div className="funding-group-tools"><label>Criterion<select aria-label="Criterion" value={groupTool===null?"":groupTool} onChange={e=>{setGroupTool(e.target.value);setGroupReview(null);}}><option value="" disabled>Choose a criterion</option>{selectionProfile(draft,scoringRoute).criteria.map(c=><option key={c.id} value={c.id}>{c.id} · {c.label}</option>)}</select></label><button type="button" disabled={busy||groupTool===null} onClick={()=>setGroupReview({route:scoringRoute,id:groupTool,value:false,input:JSON.stringify(draft.selection_assessments[scoringRoute])})}>None applies to this criterion…</button><button type="button" disabled={busy||groupTool===null} onClick={()=>setGroupReview({route:scoringRoute,id:groupTool,value:null,input:JSON.stringify(draft.selection_assessments[scoringRoute])})}>Reset criterion answers…</button></div>{groupReview!==null&&<div role="group" aria-label="Confirm criterion-wide change"><p>Set all {groupReview.id} answers to {groupReview.value===null?"Unanswered":"Does not apply"}? Activities and references remain.</p><button type="button" disabled={busy} onClick={()=>{if(groupReview.route!==scoringRoute||groupReview.input!==JSON.stringify(draft.selection_assessments[scoringRoute])){setError("Assessment changed. Review the criterion-wide operation again.");setGroupReview(null);return;}edit(editSelectionRow(draft,scoringRoute,groupReview.id,clearSelectionRow(draft.selection_assessments[scoringRoute].criteria[groupReview.id],groupReview.value)));setGroupReview(null);}}>Confirm criterion-wide change</button><button type="button" onClick={()=>setGroupReview(null)}>Keep answers</button></div>}</details>}
    {assessment?.catalogue_changed&&<div className="panel funding-edition-notice"><p>{draft.version===4&&draft.bundle.selection.version<3?"This version retains its original scoring rules. Review selected-items scoring to count only the items you select. Saved records retain their original editions.":`This exploration retains catalogue edition ${draft.bundle.version}. New question definitions and guidance require an explicit update; saved assessments remain unchanged.`}</p><button type="button" disabled={busy||readOnly} onClick={refresh}>{draft.version===4&&draft.bundle.selection.version<3?"Review selected-items scoring update":"Review catalogue and baseline update"}</button></div>}
    {catalogueReview!==null&&<section className="panel funding-catalogue-review" aria-label="Catalogue and baseline update review"><h2>Review catalogue and baseline update</h2><p>Edition {catalogueReview.prepared.catalogue_review.from_edition} → {catalogueReview.prepared.catalogue_review.to_edition}</p>{catalogueReview.prepared.catalogue_review.messages.map(text=><p key={text}>{text}</p>)}{catalogueReview.prepared.catalogue_review.changes.map(row=><p key={row.id}><strong>{row.label}</strong>: {String(row.before??"Unknown")} → {String(row.after??"Unknown")}</p>)}{catalogueReview.prepared.catalogue_review.retained_answers.map(row=><p key={row.id}>Retained previous answer: {row.label} · {String(row.value)}</p>)}<button type="button" onClick={applyCatalogueReview}>Apply baseline and catalogue update</button><button type="button" onClick={()=>setCatalogueReview(null)}>Keep current assessment</button></section>}
    {readOnly&&<section className="panel funding-legacy-review" aria-label="Legacy applicant review"><h2>Original editing format</h2>{upgrade?.visible&&questionStates.find(q=>q.id==="applicant_choice")?<><p>Previous applicant: {upgrade.review.party_name} · Separate legal form: {upgrade.review.legal_form===null?"Unknown":upgrade.review.legal_form}</p><p>{upgrade.review.message}</p><label htmlFor="funding-applicant_choice">Who would apply for the funding?</label><ApplicantPicker question={questionStates.find(q=>q.id==="applicant_choice")} value={null} disabled={busy} review onChange={resolveApplicant}/><button disabled={busy} onClick={cancelUpgrade}>Keep saved assessment</button></>:<><p>This is the original assessment. Editing and adoption remain unavailable until you choose a coherent applicant.</p><button disabled={busy} onClick={previewEditingFormat}>Review applicant type</button></>}</section>}
    {editingReview!==null&&<section className="panel funding-review" aria-label="Review editing format"><h2>Review editing format</h2><p>{editingReview.prepared.notice}</p><p>The original scoring rules and entered values are retained. This updates the applicant control for this editing version.</p><button type="button" disabled={busy} onClick={()=>{if(editingReview.input!==JSON.stringify(draft)){setError("The version changed. Review its editing format again.");return;}resetVisual();edit(editingReview.prepared.draft);setEditingReview(null);}}>Use updated editing format</button><button type="button" onClick={()=>setEditingReview(null)}>Keep original format</button></section>}

    {questionStates.length>0&&<FundingAnswers questions={questionStates} selectionScores={draft.version===4?visualValue.visualisation.annex.routes:null} onSelection={(id,trigger)=>{focusQuestion("selection_score",trigger,id);}} open={answersOpen} onOpen={setAnswersOpen} onEdit={focusQuestion} onUnknown={clearAnswer} onRestore={restoreAnswer} onParcel={id=>onNavigate("land",id)} disabled={busy||readOnly}/>}

    <div className={`funding-layout ${visualStep ? "has-visual" : ""}`}>
    {step===3&&<main className="panel funding-main">
      <div className="funding-main-heading"><h2>{FUNDING_STEPS[step]}</h2>{visualStep&&stageNavigation()}</div>
      {!readOnly&&budgetQuestions.length>0&&<button type="button" onClick={e=>focusQuestion(budgetQuestions[0].id,e.currentTarget,null,"budget")}>Edit budget inputs</button>}
      {step === 3 && !readOnly && <>
        {draft.baseline.work_budget && <details><summary>Budget supplied by demonstrator planning</summary>{draft.baseline.work_budget.rows.map(row => <p key={row.label}>{row.label}: {money(row.amount)}</p>)}<p>Total: {money(draft.baseline.work_budget.total)}</p><button onClick={() => onNavigate("demonstrator")}>Edit work costs in demonstrator planning</button></details>}
        {selected.map(r => <article className="funding-option" key={r.id}><h3>{r.id} · Financial preview</h3><p>{r.finance.basis}: {r.finance.estimate === null ? "Amount not entered" : money(r.finance.estimate)}</p>{r.finance.schedule.map(s => <p key={s.label}>{s.label}: {money(s.amount)}</p>)}{r.finance.notes.map(n => <p key={n}>{n}</p>)}<Sources sources={r.sources}/>{r.finance.bonus_unknowns?.length > 0 && <p>Unanswered bonus conditions: {r.finance.bonus_unknowns.map(s => c.questions.find(q => q.id === s).label).join("; ")}</p>}</article>)}
        <h3>Proposed allocations</h3><p>Allocations are intentions. Available funds, anticipated receipts, repayable loans and in-kind contributions stay distinct.</p>
        {draft.allocations.map((a,i) => <fieldset key={i}><legend>Allocation {i+1}</legend><label>Mechanism<select value={a.mechanism_id} onChange={e => edit({...draft, allocations:draft.allocations.map((v,j) => j === i ? {...v,mechanism_id:e.target.value} : v)})}>{draft.selected.map(id => <option key={id}>{id}</option>)}</select></label><label>Activity / cost line<input value={a.cost_line} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,cost_line:e.target.value} : v)})}/></label><label>Amount (€; blank means unknown)<input type="number" min="0" step="any" value={a.amount ?? ""} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,amount:e.target.value === "" ? null : Number(e.target.value)} : v)})}/></label><label>Contribution type<select value={a.kind} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,kind:e.target.value} : v)})}>{["anticipated","available","loan","in_kind"].map(k => <option key={k} value={k}>{k.replaceAll("_"," ")}</option>)}</select></label><button onClick={() => edit({...draft,allocations:draft.allocations.filter((_,j) => j !== i)})}>Remove allocation</button></fieldset>)}
        <button disabled={!draft.selected.length} onClick={() => edit({...draft,allocations:[...draft.allocations,{mechanism_id:draft.selected[0],cost_line:"Activity contribution",amount:null,kind:"anticipated"}]})}>Add allocation</button>
        {assessment && <dl><dt>Available allocations</dt><dd>{money(assessment.allocation_totals.available)}</dd><dt>Anticipated allocations</dt><dd>{money(assessment.allocation_totals.anticipated)}</dd><dt>Loans</dt><dd>{money(assessment.allocation_totals.loan)}</dd><dt>In-kind</dt><dd>{money(assessment.allocation_totals.in_kind)}</dd><dt>Uncovered estimated cost</dt><dd>{assessment.uncovered === null ? "Unknown" : money(assessment.uncovered)}</dd><dt>Upfront cash shortfall</dt><dd>{assessment.upfront_shortfall === null ? "Unknown" : money(assessment.upfront_shortfall)}</dd></dl>}
        <label>Optional calendar start for the activity<input type="date" value={draft.calendar_start ?? ""} onChange={e => edit({...draft,calendar_start:e.target.value || null})}/></label><p>{assessment?.calendar_note}</p><p>Relative simulator years remain separately labelled; this date does not change the simulation clock.</p>
      </>}
      {step === 3 && !readOnly && <><p>Review the differences, selected mechanisms and unresolved conditions before using this plan.</p><h3>Review proposed changes</h3>{assessment?.differences.length ? assessment.differences.map(d => <div className="funding-check" key={d.field}><strong>{d.label}</strong><p>Recorded: {String(d.recorded ?? "Unknown")} → Scenario: {String(d.assumed ?? "Unknown")}</p><button onClick={e => {if(d.editor==="funding"){focusQuestion("selection_score",e.currentTarget,d.field.split(":")[1]);}else onNavigate(d.editor);}}>Review in {d.editor === "funding" ? "Funding Navigator" : d.editor === "land" ? "land and parcel tools" : d.editor === "demonstrator" ? "demonstrator planning" : "Project"}</button></div>) : <p>No overrides differ from this recorded baseline.</p>}<p>Creating an organisation, changing land rights or employment status requires its own actual arrangement. These choices belong to this project version.</p><label>Plan notes<textarea value={draft.notes} maxLength={10000} onChange={e => edit({...draft,notes:e.target.value})}/></label><button disabled={busy || !current || !draft.selected.length} onClick={previewAdoption}>Review selected funding plan</button>
        {review && <section className="funding-review" aria-label="Funding plan review"><h3>Confirm preferred plan</h3><p>{draft.name} · {draft.selected.join(", ")}</p><p>{review.differences.length} scenario overrides. {review.results.filter(r => draft.selected.includes(r.id)).reduce((n,r) => n+r.checks.filter(c => c.result !== "pass").length,0)} conditions require changes or verification.</p><p>Using this plan changes planning records only. Existing AL20 application and payment actions remain separate. Other mechanisms, including 2.7, are planning previews.</p><button disabled={busy || review.stale || review.catalogue_changed} onClick={() => save("adopt")}>Use this funding plan</button><button onClick={() => setReview(null)}>Keep exploring</button></section>}
      </>}
      {!visualStep&&stageNavigation()}
    </main>}<div hidden={!visualStep} className="funding-visual-column"><FundingVisualisation key={visualContext} guideProgramme={programmeGuide===null||effectiveProgrammeState.value===null?null:effectiveProgrammeState.value.library.programmes.find(p=>p.id===programmeGuide.id)} onProgrammeGuide={openProgrammeGuide} onCloseProgrammeGuide={closeProgrammeGuide} annex={draft.version===4?annex:null} displayConditions={displayConditions} programmeState={effectiveProgrammeState} programme={programme} programmeDisplay={programmeDisplay} onProgramme={chooseProgramme} onDisplay={setProgrammeDisplay} routeScope={routeScope} groupedMetIds={editor!==null?heldMetIds:programmeDisplay!==null&&programmeDisplay.show_met&&routeScope!==null?routeScope.met.filter(q=>!(annexOpen&&q.id==="selection_score")).map(q=>q.id):[]} displayedQuestions={graphQuestionList} value={visualValue} latestFields={live.context===visualContext ? live.latestFields : []} changes={live.context===visualContext ? live.changes : null} pending={evaluating} failure={visualFailure} onRetry={()=>setVisualRetry(k=>k+1)} results={filtered} catalogue={c} draft={draft} currentField={q?.id ?? null} questions={questionStates} onQuestion={focusQuestion} editorOpen={editor!==null} canEditQuestions={!readOnly&&graphQuestionList.length>0} onEditQuestions={e=>focusQuestion(graphQuestionList.some(x=>x.id===q?.id)?q.id:graphQuestionList[0].id,e.currentTarget)} navigation={null} inspected={inspected} onInspect={setInspected} workingOption={workingOption} onWork={workOnRoute} onShortlist={selectOption} renderOption={r=><Option result={r} selected={draft.selected.includes(r.id)} disabled={readOnly} onSelect={()=>selectOption(r.id)} working={workingOption===r.id} onWork={workOnRoute} onReadProgramme={e=>openProgrammeGuide(programme.id,e.currentTarget)} programmeStandalone={programme!==null&&programmeRoutes.length===1} workingGroup="funding-working-details"/>}/></div></div>
    {(active||exploring)&&!readOnly&&editor!==null&&q!==undefined&&<FundingQuestionEditor suspended={exploring} question={q} anchor={editor.anchor} onClose={closeEditor} title={editor.criterion?(editor.choice?`Edit ${editor.choice}`:"Edit AL20 calculation"):"Edit funding answer"} focusTarget={editor.choice?`editor-al20-${editor.choice}`:null} positionLabel={editor.criterion?`${editor.route} · ${editor.criterion}`:`${editor.flow==="budget"?"Budget inputs":workingOption===null?"Exploration context":`Route ${workingOption}`} · ${questionIndex<0?"Outside current route; retained in Project context":`Question ${questionIndex+1} of ${questions.length}`}`}>
      {editor.criterion?<FundingSelectionEditor key={`${editor.route}-${editor.criterion}-${editor.choice}`} onItem={choice=>setEditor({...editor,choice})} activityPanel={editor.choice===null?null:<ItemActivities route={editor.route} itemId={editor.choice}/>} route={editor.route} assessment={draft.selection_assessments[editor.route]} municipality={visualValue.input_context.questions.find(q=>q.id==="municipality").municipality_selection} request={request} onLookup={applyLocationLookup} onLookupReview={reviewLocationLookup} onManual={manualLocationCriterion} criterion={selectionProfile(draft,editor.route).criteria.find(c=>c.id===editor.criterion)} row={draft.selection_assessments[editor.route].criteria[editor.criterion]} result={visualValue.visualisation.annex.routes[editor.route].criteria.find(c=>c.id===editor.criterion)} disabled={busy||readOnly} focusChoice={editor.choice} scoringVersion={draft.bundle.selection.version} onChange={row=>edit(editSelectionRow(draft,editor.route,editor.criterion,row),150)}/>:answer(q,true)}
    </FundingQuestionEditor>}
    <aside className="panel funding-context"><h2>Your exploration</h2><p>{draft.name} · {draft.selected.length} shortlisted</p><p>{draft.baseline.target} · {draft.baseline.parcel_ids.length} linked parcel(s)</p>{draft.baseline.target==="demonstrator"&&data.planning.context.municipality_conflict&&draft.baseline.parcel_ids.includes(data.planning.context.parcel.id)&&<p className="reason">Planning municipality: {data.planning.context.planning_municipality}; parcel location: {data.planning.context.parcel.municipality}. Review the location used by this version. <button type="button" onClick={()=>onNavigate("demonstrator")}>Review demonstrator context</button></p>}<details className="funding-admin"><summary>Saved versions and funding plans</summary><p>{draft.name}</p><p>{draft.selected.length} shortlisted mechanism(s)</p><p>Applicant: {facts.applicant_kind ?? "Unknown"}</p><p role="status">{busy ? "Saving / loading…" : dirty ? "Draft not yet saved" : "Draft saved or recorded version loaded"}{evaluating ? " · Updating assessment…" : ""}</p><button disabled={busy||readOnly} onClick={() => save("draft")}>Save draft</button>{workspace.attachment.version===1&&<button disabled={busy || readOnly || !draft.name.trim()} onClick={() => save("save")}>{workspace.attachment.version===2?"Save version now":loadedScenarioId === null ? "Save exploration" : "Update saved exploration"}</button>}<button disabled={busy||readOnly} onClick={refresh}>Update assessment / refresh baseline</button><p>Refresh keeps your explicit overrides and adopts current recorded facts and source rules.</p>{assessment?.warnings.map((w,i) => <p className="reason" key={i}>{w}</p>)}
      <h3>Saved explorations</h3>{workspace.attachment.scenarios.map(r => <div key={r.id}><strong>{r.draft.name}</strong><button disabled={busy} onClick={() => openSaved(r,3)}>Open version</button>{workspace.attachment.version===1&&<button disabled={busy} onClick={() => openSaved(r,0,true)}>Duplicate saved exploration</button>}<button disabled={busy} onClick={() => save("delete",r.id)}>Delete exploration</button></div>)}
      <h3>Funding projects</h3>{workspace.attachment.plans.length === 0 && <p>No adopted plans yet.</p>}{workspace.attachment.plans.map(r => <details key={r.id}><summary>{r.draft.name} · {r.active ? "Adopted plan" : "Previous revision"}</summary><p>{r.draft.selected.join(", ")}</p><p>{r.assessment.warnings.join(" ")}</p><button disabled={busy} onClick={() => openSaved(r,5)}>Revise as new version</button><button disabled={busy} onClick={() => save("delete",r.id)}>Delete funding plan</button></details>)}
      {workspace.legacy && <details><summary>Existing demonstrator financing</summary><p>{workspace.legacy.label} · {workspace.legacy.route ?? "Legacy"}</p><p>Grant status: {workspace.legacy.grant.status}</p><button onClick={() => onNavigate("demonstrator")}>Open existing planning and funding actions</button></details>}
      {draft.baseline.target === "demonstrator" && <details><summary>Configure existing simulation financing</summary><p>These actions transfer only financing settings into the demonstrator planning draft for its separate review. They do not create receipts or execute unsupported mechanisms.</p>{draft.selected.includes("LEADER-AL20-3.4") && <button disabled={busy||!current} onClick={()=>onSimulationFinancing("al20_34",facts)}>Use potential AL20 3.4 in planning draft</button>}<button disabled={busy||!current} onClick={()=>onSimulationFinancing("self",facts)}>Use funds already in project cash</button><button disabled={busy||!current} onClick={()=>onSimulationFinancing("partner",facts)}>Use partner funds already in project cash</button></details>}
      <details><summary>Source review and coverage</summary><p>{c.source_review}</p><a href={c.official_pages.territory} target="_blank" rel="noreferrer">Official AL20 territory and local documents</a></details>
    </details></aside>
  </section></FundingSelectionGuidanceProvider></FundingEdlProvider></FundingGuideProvider></FundingConceptProvider>;
}
