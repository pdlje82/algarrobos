import React, {useEffect, useReducer, useRef, useState} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {Alert} from "./Alert.jsx";
import {money} from "./format.js";
import {FUNDING_STEPS, effectiveFacts, overrideAnswer, resetAnswer, fundingResults, answerLabel, fundingStatus, fundingClass, FUNDING_HELP} from "./fundingState.js";
import {FundingHelp} from "./FundingHelp.jsx";
import {FundingVisualisation} from "./FundingVisualisation.jsx";
import {fundingVisualReducer, initialFundingVisual} from "./fundingVisualState.js";
import "./FundingNavigator.css";

function Sources({sources}) {
  return <ul className="funding-sources">{sources.map((s, i) => <li key={i}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink><small> · {s.role}</small></li>)}</ul>;
}
function Text({value}) {
  return <div className="funding-research">{value.split("\n").filter(line => line.trim()).map((line, i) => <p key={i}>{line.replace(/^[-*]\s*/, "").replace(/\*\*/g, "")}</p>)}</div>;
}
function Option({result:r, selected, onSelect}) {
  return <article className="funding-option">
    <label className="funding-pick"><input type="checkbox" checked={selected} onChange={onSelect}/><strong>{r.id} · {r.title}</strong></label>
    <p className="funding-status">{fundingStatus(r)} <FundingHelp label={fundingStatus(r)}>{FUNDING_HELP[fundingClass(r)]}</FundingHelp></p>
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
  const [step, setStep] = useState(0), [questionIndex, setQuestionIndex] = useState(0), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [review, setReview] = useState(null);
  const [query, setQuery] = useState(""), [requireChanges, setRequireChanges] = useState(true), [all, setAll] = useState(false);
  const [scope, setScope] = useState("activity"), [parcels, setParcels] = useState([]), [compareIds, setCompareIds] = useState([]);
  const [loadedScenarioId, setLoadedScenarioId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const serial = useRef(0), retry = useRef(null), editSerial = useRef(0), draftRef = useRef(null);
  const loadSerial = useRef(0);
  draftRef.current = draft;
  const revision = data.revision, planningRevision = data.planning.planning_revision;
  const visualInputKey = JSON.stringify({draft,revision,planningRevision,visualRetry});
  const visualValue = live.context === visualContext ? live.value : null;
  const assessment = visualValue?.assessment ?? null;
  const evaluating = draft !== null && (live.context !== visualContext || live.inputKey !== visualInputKey || live.status === "pending" || live.status === "idle");
  const visualFailure = live.context === visualContext && live.inputKey === visualInputKey ? live.error : "";
  function resetVisual() {serial.current++;dispatchVisual({type:"reset"});setVisualContext(k=>k+1);setInspected(null);}
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
        if(d.version===1){const prepared=await request("funding/prepare",{revision,draft:d});d=prepared.draft;editingNotice=prepared.notice;}
        if (token === loadSerial.current) {resetVisual();setWorkspace(w); setDraft(d); setScope(d.baseline.target); setParcels(d.baseline.parcel_ids); setStep(0); setQuestionIndex(0); setDirty(false); setReview(null); setLoadedScenarioId(null); setNotice(editingNotice);retry.current = null;}
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
    }, 200);
    return () => {clearTimeout(timer); serial.current++;};
  }, [draft, revision, planningRevision, active, visualContext, visualRetry]);
  useEffect(() => {
    const warn = e => {if (dirty) {e.preventDefault(); e.returnValue = "";}};
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // Autosave is draft-only. Named alternatives and adoption remain explicit actions.
  useEffect(() => {
    if (!dirty || busy || workspace === null || draft === null || retry.current !== null || !active) return;
    const timer = setTimeout(() => save("draft"), 1200);
    return () => clearTimeout(timer);
  }, [draft, dirty, busy, active]);
  function edit(next) {setDraft(next); setDirty(true); setReview(null); setNotice(""); editSerial.current++;}
  useEffect(()=>{if(guardRef)guardRef.current={dirty,flush:()=>save("draft")};return()=>{if(guardRef)guardRef.current=null;};});
  async function save(operation, recordId = null) {
    if (busy || workspace === null) return false;
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
    setBusy(true); setError("");
    try {const latest=await request("project");const seed=await request("funding/context",{revision:latest.revision,planning_revision:latest.planning.planning_revision,design_revision:latest.designer_revision,target:draft.baseline.target,parcel_ids:draft.baseline.parcel_ids});resetVisual();edit({...draft,version:seed.version,baseline:seed.baseline,bundle:seed.bundle});retry.current=null;const w=await request("funding");setWorkspace(w);await onSaved();}
    catch (e) {setError(e.message);} finally {setBusy(false);}
  }
  async function start() {
    setBusy(true); setError("");
    try {if (dirty) throw new Error("Save the current draft before starting a separate exploration."); const d = await context(scope, parcels); resetVisual();edit(d); setLoadedScenarioId(null); setQuestionIndex(0); setStep(0);}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function previewAdoption() {
    setBusy(true); setError("");
    try {const a = await request("funding/plan-preview", {revision, draft}); setReview(a);}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function openSaved(record,targetStep,duplicate=false) {
    setBusy(true);setError("");
    try {
      const prepared=await request("funding/prepare",{revision,draft:record.draft});
      resetVisual();edit({...prepared.draft,name:duplicate ? (prepared.draft.name+" copy").slice(0,80) : prepared.draft.name});
      setLoadedScenarioId(targetStep===3&&!duplicate ? record.id : null);setStep(targetStep);setQuestionIndex(0);setNotice(prepared.notice);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  if (draft === null || workspace === null) return <section className="panel"><h1>Funding Navigator</h1>{error ? <Alert variant="error" title="Funding unavailable">{error}<button onClick={()=>setReloadKey(k=>k+1)}>Retry loading funding</button></Alert> : <p role="status">Loading funding context…</p>}</section>;
  const facts = effectiveFacts(draft), c = draft.bundle, parties = draft.baseline.parties;
  const assessedDraftMatches=assessment!==null&&JSON.stringify(assessment.draft)===JSON.stringify(draft);
  const derivedForm=draft.version===2&&!Object.hasOwn(draft.overrides,"applicant_kind");
  if(derivedForm)facts.applicant_kind=assessedDraftMatches ? assessment.facts.applicant_kind : null;
  const applicantContext=assessedDraftMatches ? visualValue.applicant_context : null;
  const businessWithoutLand = ["business","monitoring"].includes(facts.activity) && draft.baseline.parcel_ids.length === 0;
  const budgetFields = ["budget_total", "eligible_cost", "available_contribution", "cash_before_receipts"];
  function questionsFor(targetStep) {return c.questions.filter(q => q.id !== "activity" && (!q.activities || q.activities.includes(facts.activity)) && (!businessWithoutLand || !["owner_id","operator_id","rights","rights_sufficient","area_m2","public_access","permits","related_competence"].includes(q.id)) && (targetStep === 1 ? !budgetFields.includes(q.id) : targetStep === 4 ? budgetFields.includes(q.id) : false));}
  const questions = questionsFor(step);
  const q = questions[Math.min(questionIndex, Math.max(0, questions.length-1))];
  const current = assessment !== null && live.status === "success" && live.inputKey === visualInputKey && !evaluating;
  const results = assessment?.results ?? [], selected = results.filter(r => draft.selected.includes(r.id));
  const filtered = fundingResults(results, {query, requireChanges, all});
  const visualStep = [0,1,2,4].includes(step);
  function focusQuestion(id) {
    const targetStep = id === "activity" ? 0 : budgetFields.includes(id) ? 4 : 1;
    const index = id === "activity" ? 0 : questionsFor(targetStep).findIndex(q=>q.id===id);
    if(index<0) {setNotice("This condition’s question is outside the current activity’s question flow. Change the activity to explore that circumstance.");return;}
    setStep(targetStep);setQuestionIndex(index);
    requestAnimationFrame(()=>document.getElementById(`funding-${id}`)?.focus());
  }
  function selectOption(id) {edit({...draft,selected:draft.selected.includes(id) ? draft.selected.filter(v=>v!==id) : [...draft.selected,id],allocations:draft.selected.includes(id) ? draft.allocations.filter(a=>a.mechanism_id!==id) : draft.allocations});}
  function answer(question) {
    const value = facts[question.id], overridden = Object.hasOwn(draft.overrides, question.id);
    const followingApplicant=question.id==="applicant_kind"&&derivedForm;
    const waitingForForm=followingApplicant&&!assessedDraftMatches;
    return <div className="funding-question" key={question.id}><label htmlFor={`funding-${question.id}`}>{question.label}</label>{question.help?.trim() && <p className="funding-question-help">{question.help}</p>}
      {question.type === "choice" ? <select id={`funding-${question.id}`} value={value ?? ""} disabled={busy||waitingForForm} onChange={e => edit(overrideAnswer(draft, question.id, e.target.value === "" ? null : e.target.value))}><option value="">{waitingForForm ? "Updating inherited applicant form…" : "Unknown / I don’t know yet"}</option>{question.options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      : question.type === "party" ? <select id={`funding-${question.id}`} value={value ?? ""} disabled={busy} onChange={e => edit(overrideAnswer(draft, question.id, e.target.value === "" ? null : e.target.value))}><option value="">Unknown / not chosen</option>{parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="hypothetical">A hypothetical partner / organisation</option></select>
      : <input id={`funding-${question.id}`} type={question.type === "number" ? "number" : "text"} min={question.min} max={question.max} step="any" value={value ?? ""} disabled={busy} placeholder="Unknown" onChange={e => edit(overrideAnswer(draft, question.id, e.target.value === "" ? null : question.type === "number" ? Number(e.target.value) : e.target.value))}/>}
      <p className="funding-basis">{followingApplicant ? waitingForForm ? "Updating from the selected applicant’s recorded type…" : applicantContext.party_name===null ? "No recorded type for this applicant. The legal form is unknown." : `Inherited from selected applicant: ${applicantContext.party_name} · not answered here` : overridden ? "Explicit scenario assumption" : "Inherited context · not answered here; may include planning defaults"} · Original context: {answerLabel(question, draft.baseline.facts[question.id], parties)}</p>
      {question.id==="applicant_kind"&&applicantContext?.override_conflict&&<p className="reason">Your explicit legal-form assumption differs from {applicantContext.party_name}’s recorded type. It is retained for this hypothetical scenario.</p>}
      {overridden && <button type="button" disabled={busy} onClick={() => edit(resetAnswer(draft, question.id))}>{question.id==="applicant_kind" ? "Use selected applicant’s legal form" : "Restore recorded value"}</button>}
    </div>;
  }
  return <section className="funding-workspace" aria-labelledby="funding-title">
    <header className="panel"><p className="eyebrow">Explore · learn · compare</p><h1 id="funding-title">Funding Navigator</h1><p>Explore arrangements for land, activities and businesses. Save alternatives, then choose a funding plan.</p>
      <details><summary>Start a separate exploration</summary><label>Activity scope<select value={scope} onChange={e => setScope(e.target.value)}><option value="activity">Parcel / other activity</option><option value="demonstrator">Current demonstrator planning</option><option value="business">Start a self-employed rural business</option></select></label><fieldset><legend>Linked parcels (optional)</legend>{data.project.parcels.map(p => <label className="funding-pick" key={p.id}><input type="checkbox" checked={parcels.includes(p.id)} onChange={e => setParcels(e.target.checked ? [...parcels,p.id] : parcels.filter(id => id !== p.id))}/>{p.name}</label>)}</fieldset><button type="button" disabled={busy || dirty} onClick={start}>Start separate exploration</button></details>
    </header>
    <nav className="funding-steps" aria-label="Funding exploration steps">{FUNDING_STEPS.map((s,i) => <button key={s} type="button" disabled={busy} aria-current={step === i ? "step" : undefined} onClick={() => {setStep(i); setQuestionIndex(0);}}>{i+1}. {s}</button>)}</nav>
    {error && <Alert variant="error" title="Exploration retained">{error}{retry.current && <button disabled={busy} onClick={() => save(retry.current.operation, retry.current.record_id)}>Retry failed save</button>}<button disabled={busy} onClick={refresh}>Reload revisions and update assessment</button></Alert>}
    {!visualStep && evaluating && <p role="status">{assessment ? "Updating—showing previous assessment" : "Updating funding assessment…"}</p>}
    {!visualStep && visualFailure && <Alert variant="error" title="Assessment unavailable">{visualFailure}<p>{assessment ? "Showing previous assessment. Entered answers are retained." : "Entered answers are retained."}</p><button type="button" onClick={()=>setVisualRetry(k=>k+1)}>Retry assessment</button></Alert>}
    {notice && <p role="status">{notice}</p>}
    <div className={`funding-layout ${visualStep ? "has-visual" : ""}`}><main className="panel funding-main">
      <h2>{FUNDING_STEPS[step]}</h2>
      {step === 0 && <><label>Exploration name<input maxLength={80} disabled={busy} value={draft.name} onChange={e => edit({...draft,name:e.target.value})}/></label>{answer(c.questions.find(q => q.id === "activity"))}<p>Business creation can be explored without a planting design. LEADER 2.7 includes a conditional €37,000 base and additions up to a €50,000 overall maximum.</p></>}
      {(step === 1 || step === 4) && q && <><p>Question {Math.min(questionIndex+1, questions.length)} of {questions.length}</p>{answer(q)}<div className="funding-actions"><button disabled={questionIndex === 0} onClick={() => setQuestionIndex(i => i-1)}>Previous question</button><button disabled={questionIndex >= questions.length-1} onClick={() => setQuestionIndex(i => i+1)}>Next question</button></div></>}
      {step === 2 && <><p>Browse families in the visual workspace. Inspect an option to read its requirements, then explicitly shortlist it.</p><label>Search mechanisms<input value={query} onChange={e => setQuery(e.target.value)}/></label><label className="funding-pick"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)}/>Browse the full catalogue, beyond this activity</label><label className="funding-pick"><input type="checkbox" checked={requireChanges} onChange={e => setRequireChanges(e.target.checked)}/>Show options that conflict with this scenario</label><p>{filtered.length} options · {c.entries.length} catalogue entries</p><p>{draft.selected.length} explicitly shortlisted. Inspecting never changes your shortlist.</p></>}
      {step === 3 && <><p>Compare mechanisms under the same assumptions, or saved scenarios under different arrangements.</p><div className="funding-table"><table><caption>Shortlisted mechanisms</caption><thead><tr><th>Mechanism</th><th>Fit</th><th>Financial basis</th><th>Conditional estimate</th></tr></thead><tbody>{selected.map(r => <tr key={r.id}><th>{r.id} · {r.title}</th><td>{fundingStatus(r)}</td><td>{r.finance.basis}</td><td>{r.finance.estimate === null ? "Unknown" : money(r.finance.estimate)}</td></tr>)}</tbody></table></div>
        <fieldset><legend>Saved alternatives to compare</legend>{workspace.attachment.scenarios.map(r => <label className="funding-pick" key={r.id}><input type="checkbox" checked={compareIds.includes(r.id)} onChange={e => setCompareIds(e.target.checked ? [...compareIds,r.id] : compareIds.filter(id => id !== r.id))}/>{r.draft.name}</label>)}</fieldset>
        {workspace.attachment.scenarios.filter(r => compareIds.includes(r.id)).map(r => <article key={r.id}><h3>{r.draft.name}</h3><p>Applicant: {r.assessment.facts.applicant_kind ?? "Unknown"} · Activity: {r.assessment.facts.activity ?? "Unknown"}</p>{r.assessment.results.filter(x => r.draft.selected.includes(x.id)).map(x => <p key={x.id}>{x.id} · {fundingStatus(x)} · {x.finance.estimate === null ? "Amount unknown" : money(x.finance.estimate)}</p>)}<p>{Object.keys(r.draft.overrides).length} explicit assumptions · source snapshot {r.assessment.catalogue_hash.slice(0,8)}</p></article>)}
      </>}
      {step === 4 && <>
        {draft.baseline.work_budget && <details><summary>Budget supplied by demonstrator planning</summary>{draft.baseline.work_budget.rows.map(row => <p key={row.label}>{row.label}: {money(row.amount)}</p>)}<p>Total: {money(draft.baseline.work_budget.total)}</p><button onClick={() => onNavigate("demonstrator")}>Edit work costs in demonstrator planning</button></details>}
        {selected.map(r => <article className="funding-option" key={r.id}><h3>{r.id} · Financial preview</h3><p>{r.finance.basis}: {r.finance.estimate === null ? "Amount unconfirmed" : money(r.finance.estimate)}</p>{r.finance.schedule.map(s => <p key={s.label}>{s.label}: {money(s.amount)}</p>)}{r.finance.notes.map(n => <p key={n}>{n}</p>)}<Sources sources={r.sources}/>{r.finance.bonus_unknowns?.length > 0 && <p>Unanswered bonus conditions: {r.finance.bonus_unknowns.map(s => c.questions.find(q => q.id === s).label).join("; ")}</p>}</article>)}
        <h3>Proposed allocations</h3><p>Allocations are intentions. Available funds, anticipated receipts, repayable loans and in-kind contributions stay distinct.</p>
        {draft.allocations.map((a,i) => <fieldset key={i}><legend>Allocation {i+1}</legend><label>Mechanism<select value={a.mechanism_id} onChange={e => edit({...draft, allocations:draft.allocations.map((v,j) => j === i ? {...v,mechanism_id:e.target.value} : v)})}>{draft.selected.map(id => <option key={id}>{id}</option>)}</select></label><label>Activity / cost line<input value={a.cost_line} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,cost_line:e.target.value} : v)})}/></label><label>Amount (€; blank means unknown)<input type="number" min="0" step="any" value={a.amount ?? ""} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,amount:e.target.value === "" ? null : Number(e.target.value)} : v)})}/></label><label>Contribution type<select value={a.kind} onChange={e => edit({...draft,allocations:draft.allocations.map((v,j) => j === i ? {...v,kind:e.target.value} : v)})}>{["anticipated","available","loan","in_kind"].map(k => <option key={k} value={k}>{k.replaceAll("_"," ")}</option>)}</select></label><button onClick={() => edit({...draft,allocations:draft.allocations.filter((_,j) => j !== i)})}>Remove allocation</button></fieldset>)}
        <button disabled={!draft.selected.length} onClick={() => edit({...draft,allocations:[...draft.allocations,{mechanism_id:draft.selected[0],cost_line:"Activity contribution",amount:null,kind:"anticipated"}]})}>Add allocation</button>
        {assessment && <dl><dt>Available allocations</dt><dd>{money(assessment.allocation_totals.available)}</dd><dt>Anticipated allocations</dt><dd>{money(assessment.allocation_totals.anticipated)}</dd><dt>Loans</dt><dd>{money(assessment.allocation_totals.loan)}</dd><dt>In-kind</dt><dd>{money(assessment.allocation_totals.in_kind)}</dd><dt>Uncovered estimated cost</dt><dd>{assessment.uncovered === null ? "Unknown" : money(assessment.uncovered)}</dd><dt>Upfront cash shortfall</dt><dd>{assessment.upfront_shortfall === null ? "Unknown" : money(assessment.upfront_shortfall)}</dd></dl>}
        <label>Optional calendar start for the activity<input type="date" value={draft.calendar_start ?? ""} onChange={e => edit({...draft,calendar_start:e.target.value || null})}/></label><p>{assessment?.calendar_note}</p><p>Relative simulator years remain separately labelled; this date does not change the simulation clock.</p>
      </>}
      {step === 5 && <><p>Review the differences, selected mechanisms and unresolved conditions before using this plan.</p><h3>Review proposed changes</h3>{assessment?.differences.length ? assessment.differences.map(d => <div className="funding-check" key={d.field}><strong>{d.label}</strong><p>Recorded: {String(d.recorded ?? "Unknown")} → Scenario: {String(d.assumed ?? "Unknown")}</p><button onClick={() => onNavigate(d.editor)}>Review in {d.editor === "land" ? "land and parcel tools" : d.editor === "demonstrator" ? "demonstrator planning" : "Project"}</button></div>) : <p>No overrides differ from this recorded baseline.</p>}<p>Creating an organisation, changing land rights or employment status requires its own actual arrangement. Assumptions remain provisional here.</p><label>Plan notes<textarea value={draft.notes} maxLength={10000} onChange={e => edit({...draft,notes:e.target.value})}/></label><button disabled={busy || !current || !draft.selected.length} onClick={previewAdoption}>Review selected funding plan</button>
        {review && <section className="funding-review" aria-label="Funding plan review"><h3>Confirm preferred plan</h3><p>{draft.name} · {draft.selected.join(", ")}</p><p>{review.differences.length} scenario overrides. {review.results.filter(r => draft.selected.includes(r.id)).reduce((n,r) => n+r.checks.filter(c => c.result !== "pass").length,0)} conditions require changes or verification.</p><p>Using this plan changes planning records only. Existing AL20 application and payment actions remain separate. Other mechanisms, including 2.7, are planning previews.</p><button disabled={busy || review.stale || review.catalogue_changed} onClick={() => save("adopt")}>Use this funding plan</button><button onClick={() => setReview(null)}>Keep exploring</button></section>}
      </>}
      <div className="funding-actions"><button disabled={step === 0} onClick={() => {setStep(s => s-1);setQuestionIndex(0);}}>← Previous</button><button disabled={step === 5} onClick={() => {setStep(s => s+1);setQuestionIndex(0);}}>Next →</button></div>
    </main><div hidden={!visualStep} className="funding-visual-column"><FundingVisualisation value={visualValue} latestFields={live.context===visualContext ? live.latestFields : []} changes={live.context===visualContext ? live.changes : null} pending={evaluating} failure={visualFailure} onRetry={()=>setVisualRetry(k=>k+1)} results={filtered} catalogue={c} draft={draft} currentField={step===0 ? "activity" : q?.id ?? null} onQuestion={focusQuestion} inspected={inspected} onInspect={setInspected} renderOption={r=><Option result={r} selected={draft.selected.includes(r.id)} onSelect={()=>selectOption(r.id)}/>}/></div></div>
    <aside className="panel funding-context"><h2>Your exploration</h2><p>{draft.name} · {draft.selected.length} shortlisted · {Object.keys(draft.overrides).length} assumptions</p><p>{draft.baseline.target} · {draft.baseline.parcel_ids.length} linked parcel(s)</p><details className="funding-admin"><summary>Saved explorations, context and funding projects</summary><p>{draft.name}</p><p>{draft.selected.length} shortlisted mechanism(s) · {Object.keys(draft.overrides).length} overrides</p><p>Applicant: {facts.applicant_kind ?? "Unknown"}</p><p role="status">{busy ? "Saving / loading…" : dirty ? "Draft not yet saved" : "Draft saved or recorded context loaded"}{evaluating ? " · Updating assessment…" : ""}</p><button disabled={busy} onClick={() => save("draft")}>Save draft</button><button disabled={busy || !draft.name.trim()} onClick={() => save("save")}>{loadedScenarioId === null ? "Save exploration" : "Update saved exploration"}</button><button disabled={busy} onClick={refresh}>Update assessment / refresh baseline</button><p>Refresh keeps your explicit overrides and adopts current recorded facts and source rules.</p>{assessment?.warnings.map((w,i) => <p className="reason" key={i}>{w}</p>)}
      <h3>Saved explorations</h3>{workspace.attachment.scenarios.map(r => <div key={r.id}><strong>{r.draft.name}</strong><button disabled={busy} onClick={() => openSaved(r,3)}>Load / rename</button><button disabled={busy} onClick={() => openSaved(r,0,true)}>Duplicate exploration</button><button disabled={busy} onClick={() => save("delete",r.id)}>Delete exploration</button></div>)}
      <h3>Funding projects</h3>{workspace.attachment.plans.length === 0 && <p>No adopted plans yet.</p>}{workspace.attachment.plans.map(r => <details key={r.id}><summary>{r.draft.name} · {r.active ? "Preferred / provisional" : "Previous revision"}</summary><p>{r.draft.selected.join(", ")}</p><p>{r.assessment.warnings.join(" ")}</p><button disabled={busy} onClick={() => openSaved(r,5)}>Review / revise plan</button><button disabled={busy} onClick={() => save("delete",r.id)}>Delete funding plan</button></details>)}
      {workspace.legacy && <details><summary>Existing demonstrator financing</summary><p>{workspace.legacy.label} · {workspace.legacy.route ?? "Legacy"}</p><p>Grant status: {workspace.legacy.grant.status}</p><button onClick={() => onNavigate("demonstrator")}>Open existing planning and funding actions</button></details>}
      {draft.baseline.target === "demonstrator" && <details><summary>Configure existing simulation financing</summary><p>These actions transfer only financing settings into the demonstrator planning draft for its separate review. They do not create receipts or execute unsupported mechanisms.</p>{draft.selected.includes("LEADER-AL20-3.4") && <button disabled={busy} onClick={()=>onSimulationFinancing("al20_34",facts)}>Use potential AL20 3.4 in planning draft</button>}<button disabled={busy} onClick={()=>onSimulationFinancing("self",facts)}>Use funds already in project cash</button><button disabled={busy} onClick={()=>onSimulationFinancing("partner",facts)}>Use partner funds already in project cash</button></details>}
      <details><summary>Source review and coverage</summary><p>{c.source_review}</p><a href={c.official_pages.territory} target="_blank" rel="noreferrer">Official AL20 territory and local documents</a></details>
    </details></aside>
  </section>;
}
