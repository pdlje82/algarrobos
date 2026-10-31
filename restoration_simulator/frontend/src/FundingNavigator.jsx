import React, {useEffect, useReducer, useRef, useState} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {Alert} from "./Alert.jsx";
import {money} from "./format.js";
import {FUNDING_STEPS, effectiveFacts, overrideAnswer, resetAnswer, fundingResults, answerLabel, fundingStatus, fundingClass, FUNDING_HELP, presentQuestion, logicalQuestionId, assumptionCount, explicitlyUnknown} from "./fundingState.js";
import {FundingHelp} from "./FundingHelp.jsx";
import {ApplicantPicker,FundingAnswers} from "./FundingAnswers.jsx";
import {FundingQuestionHelp} from "./FundingQuestionHelp.jsx";
import {FundingMunicipality} from "./FundingMunicipality.jsx";
import {FundingVisualisation} from "./FundingVisualisation.jsx";
import {FundingQuestionEditor} from "./FundingQuestionEditor.jsx";
import {FundingWorkingOption} from "./FundingWorkingOption.jsx";
import {fundingVisualReducer, initialFundingVisual} from "./fundingVisualState.js";
import {FundingSelectionEditor} from "./FundingSelection.jsx";
import {selectionProfile,selectionSummary,editSelectionRow,clearSelectionRow} from "./fundingSelectionState.js";
import "./FundingNavigator.css";

function Sources({sources}) {
  return <ul className="funding-sources">{sources.map((s, i) => <li key={i}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink><small> · {s.role}</small></li>)}</ul>;
}
function Text({value}) {
  return <div className="funding-research">{value.split("\n").filter(line => line.trim()).map((line, i) => <p key={i}>{line.replace(/^[-*]\s*/, "").replace(/\*\*/g, "")}</p>)}</div>;
}
function Option({result:r, selected, disabled=false, onSelect,working,onWork,workingGroup}) {
  return <article className="funding-option">
    <div className="funding-pick"><input type="checkbox" aria-label={`Shortlist ${r.id}`} checked={selected} disabled={disabled} onChange={onSelect}/><strong>{r.id} · {r.title}</strong></div>
    <FundingWorkingOption id={r.id} checked={working} onChange={onWork} group={workingGroup}/>
    <p className={`funding-status funding-outcome-${fundingClass(r)}`}>{fundingStatus(r)} <FundingHelp label={fundingStatus(r)}>{FUNDING_HELP[fundingClass(r)]}</FundingHelp></p>
    <p>{r.mechanism.replaceAll("_", " ")} · {r.availability}</p>
    <p>{r.finance.basis}{r.finance.estimate !== null ? ` · Conditional estimate ${money(r.finance.estimate)}` : " · Amount unconfirmed"}</p>
    <details><summary>Why this result? Definitions and conditions</summary>
      <dl className="funding-meta"><dt>Availability</dt><dd>{r.availability}</dd><dt>Evidence</dt><dd>{r.source_strength}</dd><dt>Maturity</dt><dd>{r.maturity}</dd><dt>Source check</dt><dd>{r.checked_on}</dd></dl>
      {r.checks.map((c, i) => <div className={`funding-check funding-check-${c.result}`} key={i}><strong>{c.result === "fail" ? "Requires a change" : c.result === "unknown" ? "Unresolved" : "Matches this answer"}</strong><p>{c.message}</p><Sources sources={c.sources}/></div>)}
      {r.source_gaps.map(g => <p className="reason" key={g}>{g}</p>)}
      <details><summary>Read the research context</summary><Text value={r.description}/><Sources sources={r.sources}/></details>
      {r.related.length > 0 && <p>Related descriptions of financing: {r.related.join(", ")}. Check for overlap before combining.</p>}
    </details>
  </article>;
}

export function FundingNavigator({data, active, entry, request, onNavigate, onSaved, onSimulationFinancing, guardRef}) {
  const [workspace, setWorkspace] = useState(null), [draft, setDraft] = useState(null);
  const [live,dispatchVisual] = useReducer(fundingVisualReducer,initialFundingVisual);
  const [visualContext,setVisualContext] = useState(0), [visualRetry,setVisualRetry] = useState(0), [inspected,setInspected] = useState(null);
  const [workingOption,setWorkingOption] = useState(null);
  const [step, setStep] = useState(0), [questionId, setQuestionId] = useState(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [review, setReview] = useState(null);
  const [query, setQuery] = useState(""), [requireChanges, setRequireChanges] = useState(true), [all, setAll] = useState(false);
  const [scope, setScope] = useState("activity"), [parcels, setParcels] = useState([]), [compareIds, setCompareIds] = useState([]);
  const [loadedScenarioId, setLoadedScenarioId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [answersOpen,setAnswersOpen]=useState(false),[upgrade,setUpgrade]=useState(null);
  const [catalogueReview,setCatalogueReview]=useState(null),[answerReset,setAnswerReset]=useState(0);
  const [editor,setEditor]=useState(null);
  const [annexOpen,setAnnexOpen]=useState(false),[annexRoute,setAnnexRoute]=useState(null),[annexGroups,setAnnexGroups]=useState({}),[annexSignal,setAnnexSignal]=useState(0);
  const scoringRoute=draft?.version===4&&Object.hasOwn(draft.bundle.selection.routes,workingOption)?workingOption:annexRoute;
  useEffect(()=>{if(editor?.criterion&&editor.route!==scoringRoute)setEditor(null);},[scoringRoute]);
  const editorOpener=useRef(null);
  const evaluationDelay=useRef(0);
  const serial = useRef(0), retry = useRef(null), editSerial = useRef(0), draftRef = useRef(null);
  const loadSerial = useRef(0);
  draftRef.current = draft;
  const revision = data.revision, planningRevision = data.planning.planning_revision;
  const visualInputKey = JSON.stringify({draft,revision,planningRevision,visualRetry});
  const visualValue = live.context === visualContext ? live.value : null;
  const assessment = visualValue?.assessment ?? null;
  const evaluating = draft !== null && (live.context !== visualContext || live.inputKey !== visualInputKey || live.status === "pending" || live.status === "idle");
  const visualFailure = live.context === visualContext && live.inputKey === visualInputKey ? live.error : "";
  function resetVisual() {setAnnexOpen(false);setAnnexRoute(null);setAnnexGroups({});serial.current++;dispatchVisual({type:"reset"});setVisualContext(k=>k+1);setInspected(null);setWorkingOption(null);setCatalogueReview(null);setAnswerReset(k=>k+1);setEditor(null);}
  async function context(target, parcelIds) {
    return request("funding/context", {revision, planning_revision: planningRevision, design_revision: data.designer_revision, target, parcel_ids: parcelIds});
  }
  useEffect(() => {
    const token = ++loadSerial.current; setBusy(true); setError("");
    (async () => {
      try {
        const w = await request("funding");
        let d = w.attachment.draft;
        if (entry?.target || d === null) d = await context(entry?.target ?? "activity", entry?.parcelId ? [entry.parcelId] : []);
        let editingNotice="";
        let applicantReview=null;
        if(d.version<3){const prepared=await request("funding/prepare",{revision,draft:d});d=prepared.draft;editingNotice=prepared.notice;applicantReview=prepared.applicant_review;}
        if (token === loadSerial.current) {resetVisual();setWorkspace(w); setDraft(d); setScope(d.baseline.target); setParcels(d.baseline.parcel_ids); setStep(0); setQuestionId(null); setDirty(false); setReview(null); setLoadedScenarioId(null); setNotice(editingNotice);setUpgrade(applicantReview===null?null:{review:applicantReview,visible:true,previous:null,targetStep:1});retry.current = null;}
      } catch (e) {if (token === loadSerial.current) setError(e.message);}
      finally {if (token === loadSerial.current) setBusy(false);}
    })();
    return () => {loadSerial.current++;};
  }, [data.project.id, entry?.token, reloadKey]);
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
    if (!dirty || busy || workspace === null || draft === null || ![3,4].includes(draft.version) || retry.current !== null || !active) return;
    const timer = setTimeout(() => save("draft"), 1200);
    return () => clearTimeout(timer);
  }, [draft, dirty, busy, active]);
  function edit(next,delay=0) {evaluationDelay.current=delay;setDraft(next); setDirty(true); setReview(null); setNotice(""); editSerial.current++;}
  useEffect(()=>{if(guardRef)guardRef.current={dirty,flush:()=>save("draft")};return()=>{if(guardRef)guardRef.current=null;};});
  async function save(operation, recordId = null) {
    if (busy || workspace === null || operation!=="delete"&&![3,4].includes(draft.version)) return false;
    if(operation === "save" && recordId === null)recordId=loadedScenarioId;
    const body = retry.current ?? {revision, funding_revision: workspace.funding_revision, planning_revision: planningRevision, design_revision: data.designer_revision, request_id: crypto.randomUUID(), operation, draft: operation === "delete" ? null : draft, record_id: recordId};
    if (body.operation !== operation) {setError("Retry the failed save or reload saved funding before a different operation."); return false;}
    retry.current = body; const editedAt = editSerial.current; setBusy(true); setError("");
    try {
      const w = await request("funding/save", body); setWorkspace(w); retry.current = null;
      if (editSerial.current === editedAt && operation !== "delete") setDirty(false);
      if(operation !== "draft")setReview(null); setNotice(operation === "adopt" ? "Funding plan adopted. No cash, simulation time, application or ownership changed." : operation === "save" ? "Named exploration saved." : operation === "delete" ? "Funding record deleted." : "Exploration draft saved.");
      if(operation === "delete" && recordId === loadedScenarioId)setLoadedScenarioId(null);
      await onSaved(); return true;
    } catch(e) {setError(e.message);return false;}
    finally {setBusy(false);}
  }
  async function refresh() {
    if(![3,4].includes(draft.version)){setError("Review the applicant choice before refreshing this previous assessment.");return;}
    setBusy(true); setError("");
    try {const latest=await request("project");const prepared=await request("funding/prepare",{revision:latest.revision,draft,adopt_current_catalogue:true});if(prepared.applicant_review!==null)throw Error("Review the applicant choice before updating the catalogue.");await onSaved();setCatalogueReview({prepared,input:JSON.stringify(draft)});}
    catch (e) {setError(e.message);} finally {setBusy(false);}
  }
  async function applyCatalogueReview(){
    if(catalogueReview.input!==JSON.stringify(draft)){setError("Answers changed while the update was being reviewed. Prepare the update again.");setCatalogueReview(null);return;}
    const next=catalogueReview.prepared.draft;resetVisual();edit(next);retry.current=null;setNotice("Updated baseline and catalogue applied to this editing copy. Saved alternatives and adopted plans are unchanged.");
  }
  async function start() {
    setBusy(true); setError("");
    try {if (dirty) throw new Error("Save the current draft before starting a separate exploration."); const d = await context(scope, parcels); resetVisual();edit(d);setUpgrade(null); setLoadedScenarioId(null); setQuestionId(null); setStep(0);}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function previewAdoption() {
    setBusy(true); setError("");
    try {const a = await request("funding/plan-preview", {revision, draft}); setReview(a);}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function openSaved(record,targetStep,duplicate=false) {
    if(dirty&&!await save("draft"))return;
    const previous={draft:draftRef.current,step,questionId,loadedScenarioId};
    setBusy(true);setError("");
    try {
      const prepared=await request("funding/prepare",{revision,draft:record.draft});
      resetVisual();const next={...prepared.draft,name:duplicate ? (prepared.draft.name+" copy").slice(0,80) : prepared.draft.name};
      if(prepared.applicant_review===null){edit(next);setUpgrade(null);}else{setDraft(next);setDirty(false);setReview(null);setUpgrade({review:prepared.applicant_review,visible:true,previous,targetStep});}
      setLoadedScenarioId(targetStep===3&&!duplicate ? record.id : null);setStep(targetStep);setQuestionId(null);setNotice(prepared.notice);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  if (draft === null || workspace === null) return <section className="panel"><h1>Funding Navigator</h1>{error ? <Alert variant="error" title="Funding unavailable">{error}<button onClick={()=>setReloadKey(k=>k+1)}>Retry loading funding</button></Alert> : <p role="status">Loading funding context…</p>}</section>;
  const facts=effectiveFacts(draft),c=draft.bundle,parties=draft.baseline.parties;
  const definitions=visualValue===null?[]:visualValue.input_context.questions;
  const questionStates=definitions.map(q=>presentQuestion(q,draft));
  const requested=questionStates.find(q=>q.id===questionId);
  const questionStep=requested===undefined?(step===2?1:step):requested.step;
  const questions=questionStates.filter(q=>q.step===questionStep&&q.relevant);
  const q=requested===undefined?questions[0]:requested;
  const questionIndex=q===undefined?-1:questions.findIndex(x=>x.id===q.id);
  const current=assessment!==null&&[3,4].includes(draft.version)&&live.status==="success"&&live.inputKey===visualInputKey&&!evaluating;
  const readOnly=![3,4].includes(draft.version);
  const results=assessment===null?[]:assessment.results,selected=results.filter(r=>draft.selected.includes(r.id));
  const filtered=fundingResults(results,{query,requireChanges,all});
  const visualStep=[0,1,2,4].includes(step);
  const activityPending=evaluating&&(assessment===null||assessment.facts.activity!==facts.activity);
  if(assessment!==null&&JSON.stringify(assessment.draft)===JSON.stringify(draft))Object.assign(facts,assessment.facts);
  function focusQuestion(id,trigger=null){
    const logical=logicalQuestionId(id),target=questionStates.find(x=>x.id===logical);
    if(target===undefined)throw Error("Funding question is unavailable in the current context.");
    if(target.type==="selection"){
      setStep(1);setQuestionId(logical);setEditor(null);setAnnexOpen(true);setAnnexSignal(k=>k+1);return;
    }
    const opener=trigger===null?document.activeElement:trigger;
    editorOpener.current=opener;
    const bounds=opener.getBoundingClientRect();
    const anchor={left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom};
    if(opener.matches(".funding-circumstance")){
      anchor.graph={panel:opener.closest(".funding-diagram-scroll"),node:opener};
    }
    setQuestionId(logical);setEditor({anchor});
  }
  function closeEditor(){setEditor(null);requestAnimationFrame(()=>{const trigger=editorOpener.current;if(trigger?.isConnected&&trigger.getClientRects().length)trigger.focus({preventScroll:true});else document.querySelector(".funding-edit-questions")?.focus({preventScroll:true});});}
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
  function questionNavigation(){return <div className="funding-actions funding-question-navigation"><button disabled={activityPending||questionIndex<=0} onClick={()=>setQuestionId(questions[questionIndex-1].id)}>Previous question</button><button disabled={activityPending||questionIndex<0||questionIndex>=questions.length-1} onClick={()=>setQuestionId(questions[questionIndex+1].id)}>Next question</button>{questionIndex<0&&questions.length>0&&<button onClick={()=>setQuestionId(questions[0].id)}>Return to current questions</button>}</div>;}
  function stageNavigation(){return <div className="funding-actions funding-stage-navigation"><button disabled={step===0} onClick={()=>navigateStep(step-1)}>← Previous</button><button disabled={step===5} onClick={()=>navigateStep(step+1)}>Next →</button></div>;}
  function openCriterion(id,trigger,choice=null){
    if(scoringRoute===null)throw Error("Choose an AL20 scoring route first.");
    editorOpener.current=trigger;
    const bounds=trigger.getBoundingClientRect(),anchor={left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom};
    anchor.graph={panel:trigger.closest(".funding-diagram-scroll"),node:trigger};
    setQuestionId("selection_score");setEditor({anchor,criterion:id,route:scoringRoute,choice});
  }
  function chooseScoringRoute(route){setAnnexRoute(route);setWorkingOption(route);setEditor(null);}
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
      :question.type==="choice"?<select id={`funding-${question.id}`} value={value===null?"":value} disabled={busy||readOnly} onChange={e=>changeAnswer(question.id,e.target.value===""?null:e.target.value)}><option value="">Unknown / I don’t know yet</option>{question.options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      :question.type==="party"?<select id={`funding-${question.id}`} value={value===null?"":value} disabled={busy||readOnly} onChange={e=>changeAnswer(question.id,e.target.value===""?null:e.target.value)}><option value="">Unknown / not chosen</option>{parties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}<option value="hypothetical">A hypothetical partner / organisation</option></select>
      :<input id={`funding-${question.id}`} type={question.type==="number"?"number":"text"} min={question.min} max={question.max} step="any" value={value===null?"":value} disabled={busy||readOnly} placeholder="Unknown" onChange={e=>changeAnswer(question.id,e.target.value===""?null:question.type==="number"?Number(e.target.value):e.target.value,200)} onBlur={flushAssessment} onKeyDown={e=>{if(e.key==="Enter")flushAssessment();}}/>}</div>
      <div className="funding-question-tools"><div className="funding-actions funding-answer-controls"><button type="button" disabled={busy||readOnly||explicitlyUnknown(question)} onClick={()=>clearAnswer(question.id)}>Set to Unknown</button><button type="button" disabled={busy||readOnly||!question.overridden} onClick={()=>restoreAnswer(question.id)}>Restore initial: {question.initial_label}</button></div>{navigate&&questionNavigation()}</div>
      <p className="funding-basis">{question.origin} · Initial: {question.initial_label}</p>
      {question.type==="applicant"&&<p className="funding-applicant-note">{question.display_value}. Planned or potential applicants are assumptions; no organisation or agreement is created.</p>}
    </div>;
  }
  return <section className="funding-workspace" aria-labelledby="funding-title">
    <header className="panel"><p className="eyebrow">Explore · learn · compare</p><h1 id="funding-title">Funding Navigator</h1><p>Explore arrangements for land, activities and businesses. Save alternatives, then choose a funding plan.</p>
      <details><summary>Start a separate exploration</summary><label>Activity scope<select value={scope} onChange={e => setScope(e.target.value)}><option value="activity">Parcel / other activity</option><option value="demonstrator">Current demonstrator planning</option><option value="business">Start a self-employed rural business</option></select></label><fieldset><legend>Linked parcels (optional)</legend>{data.project.parcels.map(p => <label className="funding-pick" key={p.id}><input type="checkbox" checked={parcels.includes(p.id)} onChange={e => setParcels(e.target.checked ? [...parcels,p.id] : parcels.filter(id => id !== p.id))}/>{p.name}</label>)}</fieldset><button type="button" disabled={busy || dirty} onClick={start}>Start separate exploration</button></details>
    </header>
    <nav className="funding-steps" aria-label="Funding exploration steps">{FUNDING_STEPS.map((s,i) => <button key={s} type="button" disabled={busy||activityPending} aria-current={step === i ? "step" : undefined} onClick={() => navigateStep(i)}>{i+1}. {s}</button>)}</nav>
    {error && <Alert variant="error" title="Exploration retained">{error}{retry.current && <button disabled={busy} onClick={() => save(retry.current.operation, retry.current.record_id)}>Retry failed save</button>}<button disabled={busy} onClick={refresh}>Reload revisions and update assessment</button></Alert>}
    {!visualStep && evaluating && <p role="status">{assessment ? "Updating—showing previous assessment" : "Updating funding assessment…"}</p>}
    {!visualStep && visualFailure && <Alert variant="error" title="Assessment unavailable">{visualFailure}<p>{assessment ? "Showing previous assessment. Entered answers are retained." : "Entered answers are retained."}</p><button type="button" onClick={()=>setVisualRetry(k=>k+1)}>Retry assessment</button></Alert>}
    <p className="funding-notice" role="status">{notice}</p>
    {assessment?.catalogue_changed&&<div className="panel funding-edition-notice"><p>This exploration retains catalogue edition {draft.bundle.version}. New question definitions and guidance require an explicit update; saved assessments remain unchanged.</p><button type="button" disabled={busy||readOnly} onClick={refresh}>Review catalogue and baseline update</button></div>}
    {catalogueReview!==null&&<section className="panel funding-catalogue-review" aria-label="Catalogue and baseline update review"><h2>Review catalogue and baseline update</h2><p>Edition {catalogueReview.prepared.catalogue_review.from_edition} → {catalogueReview.prepared.catalogue_review.to_edition}</p>{catalogueReview.prepared.catalogue_review.messages.map(text=><p key={text}>{text}</p>)}{catalogueReview.prepared.catalogue_review.changes.map(row=><p key={row.id}><strong>{row.label}</strong>: {String(row.before??"Unknown")} → {String(row.after??"Unknown")}</p>)}{catalogueReview.prepared.catalogue_review.retained_answers.map(row=><p key={row.id}>Retained previous answer: {row.label} · {String(row.value)}</p>)}<button type="button" onClick={applyCatalogueReview}>Apply baseline and catalogue update</button><button type="button" onClick={()=>setCatalogueReview(null)}>Keep current assessment</button></section>}
    {readOnly&&<section className="panel funding-legacy-review" aria-label="Legacy applicant review"><h2>Previous assessment—applicant selection needs review</h2>{upgrade?.visible&&questionStates.find(q=>q.id==="applicant_choice")?<><p>Previous applicant: {upgrade.review.party_name} · Separate legal form: {upgrade.review.legal_form===null?"Unknown":upgrade.review.legal_form}</p><p>{upgrade.review.message}</p><label htmlFor="funding-applicant_choice">Who would apply for the funding?</label><ApplicantPicker question={questionStates.find(q=>q.id==="applicant_choice")} value={null} disabled={busy} review onChange={resolveApplicant}/><button disabled={busy} onClick={cancelUpgrade}>Keep saved assessment</button></>:<><p>This is the original assessment. Editing and adoption remain unavailable until you choose a coherent applicant.</p><button disabled={busy||upgrade===null} onClick={()=>setUpgrade({...upgrade,visible:true})}>Review applicant choice</button></>}</section>}
    {questionStates.length>0&&<FundingAnswers questions={questionStates} open={answersOpen} onOpen={setAnswersOpen} onEdit={focusQuestion} onUnknown={clearAnswer} onRestore={restoreAnswer} onParcel={id=>onNavigate("land",id)} disabled={busy||readOnly}/>}

    <div className={`funding-layout ${visualStep ? "has-visual" : ""}`}>
    {step!==1&&<main className="panel funding-main">
      <div className="funding-main-heading"><h2>{FUNDING_STEPS[step]}</h2>{visualStep&&stageNavigation()}</div>
      {step === 0 && !readOnly && <><label>Exploration name<input maxLength={80} disabled={busy} value={draft.name} onChange={e => edit({...draft,name:e.target.value})}/></label><p>Activity: {questionStates.length===0?"Loading activity…":questionStates.find(q=>q.id==="activity").display_value}<button type="button" disabled={busy||questionStates.length===0} onClick={e=>focusQuestion("activity",e.currentTarget)}>Choose activity</button></p><p>Business creation can be explored without a planting design. LEADER 2.7 includes a conditional €37,000 base and additions up to a €50,000 overall maximum.</p></>}
      {step===4&&!readOnly&&q&&<button type="button" onClick={e=>focusQuestion(q.id,e.currentTarget)}>Edit budget assumptions</button>}
      {step === 2 && <><p>Browse families in the visual workspace. Inspect an option to read its requirements, then explicitly shortlist it.</p><label>Search mechanisms<input value={query} onChange={e => setQuery(e.target.value)}/></label><label className="funding-pick"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)}/>Browse the full catalogue, beyond this activity</label><label className="funding-pick"><input type="checkbox" checked={requireChanges} onChange={e => setRequireChanges(e.target.checked)}/>Show options that conflict with this scenario</label><p>{filtered.length} options · {c.entries.length} catalogue entries</p><p>{draft.selected.length} explicitly shortlisted. Inspecting never changes your shortlist.</p></>}
      {step === 3 && <><p>Compare mechanisms under the same assumptions, or saved scenarios under different arrangements.</p><div className="funding-table"><table><caption>Shortlisted mechanisms</caption><thead><tr><th>Mechanism</th><th>Fit</th><th>Financial basis</th><th>Conditional estimate</th></tr></thead><tbody>{selected.map(r => <tr key={r.id}><th>{r.id} · {r.title}</th><td>{fundingStatus(r)}</td><td>{r.finance.basis}</td><td>{r.finance.estimate === null ? "Unknown" : money(r.finance.estimate)}</td></tr>)}</tbody></table></div>
        <fieldset><legend>Saved alternatives to compare</legend>{workspace.attachment.scenarios.map(r => <label className="funding-pick" key={r.id}><input type="checkbox" checked={compareIds.includes(r.id)} onChange={e => setCompareIds(e.target.checked ? [...compareIds,r.id] : compareIds.filter(id => id !== r.id))}/>{r.draft.name}</label>)}</fieldset>
        {workspace.attachment.scenarios.filter(r => compareIds.includes(r.id)).map(r => <article key={r.id}><h3>{r.draft.name}</h3><p>Applicant: {r.assessment.facts.applicant_kind ?? "Unknown"} · Activity: {r.assessment.facts.activity ?? "Unknown"}</p>{r.assessment.results.filter(x => r.draft.selected.includes(x.id)).map(x => <p key={x.id}>{x.id} · {fundingStatus(x)} · {x.finance.estimate === null ? "Amount unknown" : money(x.finance.estimate)}{r.draft.version===4&&x.selection_assessment&&` · ${selectionSummary(x.selection_assessment)}`}</p>)}<p>{assumptionCount(r.draft)} explicit assumptions · source snapshot {r.assessment.catalogue_hash.slice(0,8)}</p></article>)}
      </>}
      {step === 4 && !readOnly && <>
        {draft.baseline.work_budget && <details><summary>Budget supplied by demonstrator planning</summary>{draft.baseline.work_budget.rows.map(row => <p key={row.label}>{row.label}: {money(row.amount)}</p>)}<p>Total: {money(draft.baseline.work_budget.total)}</p><button onClick={() => onNavigate("demonstrator")}>Edit work costs in demonstrator planning</button></details>}
        {selected.map(r => <article className="funding-option" key={r.id}><h3>{r.id} · Financial preview</h3><p>{r.finance.basis}: {r.finance.estimate === null ? "Amount unconfirmed" : money(r.finance.estimate)}</p>{r.finance.schedule.map(s => <p key={s.label}>{s.label}: {money(s.amount)}</p>)}{r.finance.notes.map(n => <p key={n}>{n}</p>)}<Sources sources={r.sources}/>{r.finance.bonus_unknowns?.length > 0 && <p>Unanswered bonus conditions: {r.finance.bonus_unknowns.map(s => c.questions.find(q => q.id === s).label).join("; ")}</p>}</article>)}
        <h3>Proposed allocations</h3><p>Allocations are intentions. Available funds, anticipated receipts, repayable loans and in-kind contributions stay distinct.</p>
        {draft.allocations.map((a,i) => <fieldset key={i}><legend>Allocation {i+1}</legend><label>Mechanism<select value={a.mechanism_id} onChange={e => edit({...draft, allocations:draft.allocations.map((v,j) => j === i ? {...v,mechanism_id:e.target.value} : v)})}>{draft.selected.map(id => <option key={id}>{id}</option>)}</select></label><label>Activity / cost line<input value={a.cost_line} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,cost_line:e.target.value} : v)})}/></label><label>Amount (€; blank means unknown)<input type="number" min="0" step="any" value={a.amount ?? ""} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,amount:e.target.value === "" ? null : Number(e.target.value)} : v)})}/></label><label>Contribution type<select value={a.kind} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,kind:e.target.value} : v)})}>{["anticipated","available","loan","in_kind"].map(k => <option key={k} value={k}>{k.replaceAll("_"," ")}</option>)}</select></label><button onClick={() => edit({...draft,allocations:draft.allocations.filter((_,j) => j !== i)})}>Remove allocation</button></fieldset>)}
        <button disabled={!draft.selected.length} onClick={() => edit({...draft,allocations:[...draft.allocations,{mechanism_id:draft.selected[0],cost_line:"Activity contribution",amount:null,kind:"anticipated"}]})}>Add allocation</button>
        {assessment && <dl><dt>Available allocations</dt><dd>{money(assessment.allocation_totals.available)}</dd><dt>Anticipated allocations</dt><dd>{money(assessment.allocation_totals.anticipated)}</dd><dt>Loans</dt><dd>{money(assessment.allocation_totals.loan)}</dd><dt>In-kind</dt><dd>{money(assessment.allocation_totals.in_kind)}</dd><dt>Uncovered estimated cost</dt><dd>{assessment.uncovered === null ? "Unknown" : money(assessment.uncovered)}</dd><dt>Upfront cash shortfall</dt><dd>{assessment.upfront_shortfall === null ? "Unknown" : money(assessment.upfront_shortfall)}</dd></dl>}
        <label>Optional calendar start for the activity<input type="date" value={draft.calendar_start ?? ""} onChange={e => edit({...draft,calendar_start:e.target.value || null})}/></label><p>{assessment?.calendar_note}</p><p>Relative simulator years remain separately labelled; this date does not change the simulation clock.</p>
      </>}
      {step === 5 && !readOnly && <><p>Review the differences, selected mechanisms and unresolved conditions before using this plan.</p><h3>Review proposed changes</h3>{assessment?.differences.length ? assessment.differences.map(d => <div className="funding-check" key={d.field}><strong>{d.label}</strong><p>Recorded: {String(d.recorded ?? "Unknown")} → Scenario: {String(d.assumed ?? "Unknown")}</p><button onClick={e => {if(d.editor==="funding"){chooseScoringRoute(d.field.split(":")[1]);focusQuestion("selection_score",e.currentTarget);}else onNavigate(d.editor);}}>Review in {d.editor === "funding" ? "Funding Navigator" : d.editor === "land" ? "land and parcel tools" : d.editor === "demonstrator" ? "demonstrator planning" : "Project"}</button></div>) : <p>No overrides differ from this recorded baseline.</p>}<p>Creating an organisation, changing land rights or employment status requires its own actual arrangement. Assumptions remain provisional here.</p><label>Plan notes<textarea value={draft.notes} maxLength={10000} onChange={e => edit({...draft,notes:e.target.value})}/></label><button disabled={busy || !current || !draft.selected.length} onClick={previewAdoption}>Review selected funding plan</button>
        {review && <section className="funding-review" aria-label="Funding plan review"><h3>Confirm preferred plan</h3><p>{draft.name} · {draft.selected.join(", ")}</p><p>{review.differences.length} scenario overrides. {review.results.filter(r => draft.selected.includes(r.id)).reduce((n,r) => n+r.checks.filter(c => c.result !== "pass").length,0)} conditions require changes or verification.</p><p>Using this plan changes planning records only. Existing AL20 application and payment actions remain separate. Other mechanisms, including 2.7, are planning previews.</p><button disabled={busy || review.stale || review.catalogue_changed} onClick={() => save("adopt")}>Use this funding plan</button><button onClick={() => setReview(null)}>Keep exploring</button></section>}
      </>}
      {!visualStep&&stageNavigation()}
    </main>}<div hidden={!visualStep} className="funding-visual-column"><FundingVisualisation annex={draft.version===4?annex:null} value={visualValue} latestFields={live.context===visualContext ? live.latestFields : []} changes={live.context===visualContext ? live.changes : null} pending={evaluating} failure={visualFailure} onRetry={()=>setVisualRetry(k=>k+1)} results={filtered} catalogue={c} draft={draft} currentField={q?.id ?? null} questions={questionStates} onQuestion={focusQuestion} editorOpen={editor!==null} canEditQuestions={!readOnly&&q!==undefined} onEditQuestions={e=>focusQuestion(q.id,e.currentTarget)} navigation={step===1?stageNavigation():null} inspected={inspected} onInspect={setInspected} workingOption={workingOption} onWork={setWorkingOption} renderOption={r=><Option result={r} selected={draft.selected.includes(r.id)} disabled={readOnly} onSelect={()=>selectOption(r.id)} working={workingOption===r.id} onWork={setWorkingOption} workingGroup="funding-working-details"/>}/></div></div>
    {active&&!readOnly&&editor!==null&&q!==undefined&&<FundingQuestionEditor question={q} anchor={editor.anchor} onClose={closeEditor} title={editor.criterion?"Edit AL20 criterion":"Edit funding answer"} focusTarget={editor.choice?`al20-${editor.choice}`:null} positionLabel={editor.criterion?`${editor.route} · ${editor.criterion}`:`${FUNDING_STEPS[q.step]} · ${questionIndex<0?"Retained answer—outside the current activity’s question flow":`Question ${questionIndex+1} of ${questions.length}`}`}>
      {editor.criterion?<FundingSelectionEditor key={`${editor.route}-${editor.criterion}`} route={editor.route} criterion={selectionProfile(draft,editor.route).criteria.find(c=>c.id===editor.criterion)} row={draft.selection_assessments[editor.route].criteria[editor.criterion]} result={visualValue.visualisation.annex.routes[editor.route].criteria.find(c=>c.id===editor.criterion)} disabled={busy||readOnly} focusChoice={editor.choice} onChange={row=>edit(editSelectionRow(draft,editor.route,editor.criterion,row),150)}/>:answer(q,true)}
    </FundingQuestionEditor>}
    <aside className="panel funding-context"><h2>Your exploration</h2><p>{draft.name} · {draft.selected.length} shortlisted · {assumptionCount(draft)} assumptions</p><p>{draft.baseline.target} · {draft.baseline.parcel_ids.length} linked parcel(s)</p>{draft.baseline.target==="demonstrator"&&data.planning.context.municipality_conflict&&draft.baseline.parcel_ids.includes(data.planning.context.parcel.id)&&<p className="reason">Current planning municipality: {data.planning.context.planning_municipality}; recorded parcel location: {data.planning.context.parcel.municipality}. This exploration retains its captured baseline and explicit assumptions. <button type="button" onClick={()=>onNavigate("demonstrator")}>Review demonstrator context</button></p>}<details className="funding-admin"><summary>Saved explorations, context and funding projects</summary><p>{draft.name}</p><p>{draft.selected.length} shortlisted mechanism(s) · {assumptionCount(draft)} overrides</p><p>Applicant: {facts.applicant_kind ?? "Unknown"}</p><p role="status">{busy ? "Saving / loading…" : dirty ? "Draft not yet saved" : "Draft saved or recorded context loaded"}{evaluating ? " · Updating assessment…" : ""}</p><button disabled={busy||readOnly} onClick={() => save("draft")}>Save draft</button><button disabled={busy || readOnly || !draft.name.trim()} onClick={() => save("save")}>{loadedScenarioId === null ? "Save exploration" : "Update saved exploration"}</button><button disabled={busy||readOnly} onClick={refresh}>Update assessment / refresh baseline</button><p>Refresh keeps your explicit overrides and adopts current recorded facts and source rules.</p>{assessment?.warnings.map((w,i) => <p className="reason" key={i}>{w}</p>)}
      <h3>Saved explorations</h3>{workspace.attachment.scenarios.map(r => <div key={r.id}><strong>{r.draft.name}</strong><button disabled={busy} onClick={() => openSaved(r,3)}>Load / rename</button><button disabled={busy} onClick={() => openSaved(r,0,true)}>Duplicate exploration</button><button disabled={busy} onClick={() => save("delete",r.id)}>Delete exploration</button></div>)}
      <h3>Funding projects</h3>{workspace.attachment.plans.length === 0 && <p>No adopted plans yet.</p>}{workspace.attachment.plans.map(r => <details key={r.id}><summary>{r.draft.name} · {r.active ? "Preferred / provisional" : "Previous revision"}</summary><p>{r.draft.selected.join(", ")}</p><p>{r.assessment.warnings.join(" ")}</p><button disabled={busy} onClick={() => openSaved(r,5)}>Review / revise plan</button><button disabled={busy} onClick={() => save("delete",r.id)}>Delete funding plan</button></details>)}
      {workspace.legacy && <details><summary>Existing demonstrator financing</summary><p>{workspace.legacy.label} · {workspace.legacy.route ?? "Legacy"}</p><p>Grant status: {workspace.legacy.grant.status}</p><button onClick={() => onNavigate("demonstrator")}>Open existing planning and funding actions</button></details>}
      {draft.baseline.target === "demonstrator" && <details><summary>Configure existing simulation financing</summary><p>These actions transfer only financing settings into the demonstrator planning draft for its separate review. They do not create receipts or execute unsupported mechanisms.</p>{draft.selected.includes("LEADER-AL20-3.4") && <button disabled={busy||!current} onClick={()=>onSimulationFinancing("al20_34",facts)}>Use potential AL20 3.4 in planning draft</button>}<button disabled={busy||!current} onClick={()=>onSimulationFinancing("self",facts)}>Use funds already in project cash</button><button disabled={busy||!current} onClick={()=>onSimulationFinancing("partner",facts)}>Use partner funds already in project cash</button></details>}
      <details><summary>Source review and coverage</summary><p>{c.source_review}</p><a href={c.official_pages.territory} target="_blank" rel="noreferrer">Official AL20 territory and local documents</a></details>
    </details></aside>
  </section>;
}
