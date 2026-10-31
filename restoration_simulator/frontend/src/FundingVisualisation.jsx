import React, {useEffect, useRef, useState} from "react";
import {answerLabel,fundingClass,fundingStatus,fundingCounts,statusLabel,FUNDING_HELP} from "./fundingState.js";
import {FundingHelp} from "./FundingHelp.jsx";
import {conditionText, visualScope, graphQuestions,graphLinkStatus,graphAnswerStatus} from "./fundingVisualState.js";
import {money} from "./format.js";
import {DocumentLink} from "./DocumentLink.jsx";
import {DEFAULT_FUNDING_COLUMNS,fundingColumns,resizeFundingColumn} from "./fundingLayout.js";
import {FundingSelectionBranch} from "./FundingSelection.jsx";
import {selectionGraphLayout,selectionProfile,selectionSummary} from "./fundingSelectionState.js";
import {FundingWorkingOption} from "./FundingWorkingOption.jsx";

function Evidence({sources}) {
  return <ul className="funding-sources">{sources.map((s,i)=><li key={i}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink></li>)}</ul>;
}
function Changed({change}) {
  if(!change)return null;
  const labels=[change.fit&&"Fit changed",change.conditions.length>0&&"Condition changed",change.amount&&"Conditional amount changed",change.scope&&"Activity relevance changed"];
  if(!labels.some(Boolean))labels.push("Input affected · result unchanged");
  return <span className="funding-change-label">{labels.filter(Boolean).join(" · ")}</span>;
}

export function FundingVisualisation({annex=null,value,changes,latestFields,pending,failure,onRetry,results,catalogue,draft,currentField,onQuestion,editorOpen,canEditQuestions,onEditQuestions,navigation,inspected,onInspect,workingOption,onWork,renderOption,questions:questionStates}) {
  const [view,setView]=useState("graph"), [family,setFamily]=useState(Object.keys(catalogue.groups)[0]);
  const [page,setPage]=useState(0), [shortlistOnly,setShortlistOnly]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [fullView,setFullView]=useState(false);
  const [focusCurrent,setFocusCurrent]=useState(false),[showAmount,setShowAmount]=useState(false);
  const [diagramWidth,setDiagramWidth]=useState(800);
  const [columnSplits,setColumnSplits]=useState(DEFAULT_FUNDING_COLUMNS),[wide,setWide]=useState(()=>matchMedia("(min-width:1001px)").matches);
  const [resizing,setResizing]=useState(null),columnDrag=useRef(null);
  const [graphScroll,setGraphScroll]=useState(0);
  useEffect(()=>{
    if(annex===null||annex.signal===0)return;
    setView("graph");setExpanded(true);
    requestAnimationFrame(()=>visualRoot.current?.querySelector('.funding-circumstance[data-question-id="selection_score"]')?.scrollIntoView({block:"nearest",inline:"nearest"}));
  },[annex?.signal]);
  const graphPanel=useRef(null),matrixPanel=useRef(null),expandButton=useRef(null),compactScroll=useRef(null);
  const visualRoot=useRef(null);
  useEffect(()=>{const media=matchMedia("(min-width:1001px)"),change=()=>setWide(media.matches);media.addEventListener("change",change);return()=>media.removeEventListener("change",change);},[]);
  useEffect(()=>{
    if(view!=="graph"||!graphPanel.current)return;
    const panel=graphPanel.current;
    const resize=()=>setDiagramWidth(Math.max(800,panel.clientWidth));
    resize();
    const observer=new ResizeObserver(resize);observer.observe(panel);
    return()=>observer.disconnect();
  },[view,value!==null]);
  useEffect(()=>{
    if(!inspected)return;
    const modalOpen=()=>document.querySelector("[role='dialog']")!==null;
    const outside=e=>{if(!modalOpen()&&!visualRoot.current.closest(".funding-workspace").contains(e.target))onInspect(null);};
    const escape=e=>{
      if(e.key!=="Escape"||modalOpen()||document.querySelector(".funding-help-popup"))return;
      const trigger=visualRoot.current.querySelector(`[data-option-id="${inspected}"] button`)||visualRoot.current.querySelector(`[data-option-id="${inspected}"]`);
      onInspect(null);trigger?.focus({preventScroll:true});
    };
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[inspected,onInspect]);
  const model=value?.visualisation;
  const allResults=value?.assessment.results ?? [];
  const facts=value?.assessment.facts;
  const changed=new Map((changes?.options ?? []).map(c=>[c.id,c]));
  const scope=visualScope(results,{group:family,shortlistOnly,selected:draft.selected,page,expanded:fullView});
  // Filters may shorten a page. Clamp the display without changing catalogue order.
  const displayedPage=Math.min(page,scope.pages-1);
  const visible=displayedPage===page ? scope : visualScope(results,{group:family,shortlistOnly,selected:draft.selected,page:displayedPage,expanded:fullView});
  const counts=fundingCounts(results);
  const option=allResults.find(r=>r.id===inspected);
  const working=allResults.find(r=>r.id===workingOption);
  const conditions=model?.conditions ?? [];
  const fullScope=visualScope(results,{group:family,shortlistOnly,selected:draft.selected,page:0,expanded:true});
  const scopeIds=fullScope.options.map(r=>r.id);
  const questions=graphQuestions(questionStates,conditions,workingOption===null?scopeIds:[...new Set([...scopeIds,workingOption])],{focus:focusCurrent,currentField,showAmount});
  const nodeStates=new Map(questions.map(q=>[q.id,graphAnswerStatus(q.id,conditions,scopeIds,{workingOption,showAmount})]));
  const workingFields=new Set(conditions.filter(c=>c.option_id===workingOption&&(c.effect==="eligibility"||showAmount)).flatMap(c=>c.fields));
  if(model!==undefined&&![1,2].includes(model.version))throw Error("Unsupported funding graph response. Restart the backend and refresh the app.");
  if(model!==undefined&&draft.version===4&&(model.version!==2||!model.annex||model.annex.version!==1))throw Error("The AL20 graph response is incomplete. Restart the backend and retry assessment.");
  const annexProfile=annex!==null&&annex.route!==null?selectionProfile(draft,annex.route):null;
  const annexScore=model?.version===2&&annex!==null&&annex.route!==null?model.annex.routes[annex.route]:null;
  if(model?.version===2&&annex!==null&&annex.route!==null&&!annexScore)throw Error("The selected AL20 route assessment is missing. Retry assessment.");
  const layout=selectionGraphLayout(questions,{open:annex!==null&&annex.open,route:annex===null?null:annex.route,profile:annexProfile,groups:annex===null?[]:annex.groups});
  const questionY=q=>layout.tops.get(q.id)+48;
  const diagramHeight=Math.max(layout.height,Math.max(1,visible.options.length)*132+48);
  const columns=fundingColumns(diagramWidth,wide?columnSplits:DEFAULT_FUNDING_COLUMNS);
  const {originWidth,circumstanceLeft,circumstanceWidth,optionLeft,optionWidth}=columns;
  const originRight=12+originWidth,circumstanceRight=circumstanceLeft+circumstanceWidth;
  const originCurve=(originRight+circumstanceLeft)/2,fitCurve=(circumstanceRight+optionLeft)/2;
  function startColumnResize(e,index){
    if(e.button!==0)return;e.preventDefault();e.currentTarget.focus({preventScroll:true});
    const bounds=graphPanel.current.getBoundingClientRect();
    columnDrag.current={id:e.pointerId,index,offset:e.clientX-bounds.left+graphPanel.current.scrollLeft-columns.dividers[index]};
    e.currentTarget.setPointerCapture(e.pointerId);setResizing(index);
  }
  function moveColumn(e){
    const drag=columnDrag.current;if(drag===null||drag.id!==e.pointerId)return;
    const x=e.clientX-graphPanel.current.getBoundingClientRect().left+graphPanel.current.scrollLeft-drag.offset;
    setColumnSplits(current=>resizeFundingColumn(diagramWidth,current,drag.index,x));
  }
  function endColumnResize(e){if(columnDrag.current?.id!==e.pointerId)return;columnDrag.current=null;setResizing(null);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
  function resizeColumnByKey(e,index){
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();
    const position=e.key==="Home"?columns.limits[index][0]:e.key==="End"?columns.limits[index][1]:columns.dividers[index]+(e.key==="ArrowLeft"?-1:1)*(e.shiftKey?40:10);
    setColumnSplits(current=>resizeFundingColumn(diagramWidth,current,index,position));
  }
  const coverage=id=>model.coverage.find(c=>c.option_id===id);
  const effects=id=>conditions.filter(c=>c.option_id===id && c.fields.some(f=>changes!==null?changes.fields.includes(f):currentField?f===currentField:latestFields.includes(f)));
  const effectText=id=>{
    const matches=effects(id);
    if (!matches.length) return coverage(id).requirements==="research_only" ? "Assessment not implemented" : currentField==="activity" ? (facts.activity===null ? "Activity unknown; scope not narrowed" : allResults.find(r=>r.id===id).relevant ? "Within activity scope" : "Outside activity scope") : "No modelled condition for this answer";
    return matches.map(c=>`${c.effect==="amount" ? "Amount" : "Fit"}: ${conditionText(c)}`).join(" · ");
  };
  function choose(id) {onInspect(inspected===id ? null : id);}
  function toggleFullView() {
    if(!fullView){compactScroll.current={windowY:window.scrollY,graphY:graphPanel.current?.scrollTop ?? 0,graphX:graphPanel.current?.scrollLeft ?? 0,matrixY:matrixPanel.current?.scrollTop ?? 0,matrixX:matrixPanel.current?.scrollLeft ?? 0};setFullView(true);return;}
    setFullView(false);
    requestAnimationFrame(()=>{
      const s=compactScroll.current;
      if(graphPanel.current){graphPanel.current.scrollTop=s.graphY;graphPanel.current.scrollLeft=s.graphX;}
      if(matrixPanel.current){matrixPanel.current.scrollTop=s.matrixY;matrixPanel.current.scrollLeft=s.matrixX;}
      expandButton.current.focus({preventScroll:true});window.scrollTo({top:s.windowY,behavior:"instant"});
    });
  }
  function effectBrief(r){
    if(coverage(r.id).requirements==="research_only")return "The effect cannot be assessed: programme-specific requirements are not implemented. More answers alone cannot resolve this gap.";
    const delta=changed.get(r.id);
    if(!delta)return effectText(r.id);
    const answers=changes.answers.map(a=>`${a.label}: ${a.before} → ${a.after}`).join("; ");
    const fit=delta.fit?`${statusLabel(delta.before)} → ${statusLabel(delta.after)}`:`Fit remains ${fundingStatus(r)}.`;
    const state=delta.conditions.length?"A condition result or input changed.":"The same modelled conditions remain satisfied, conflicting or unresolved.";
    const amount=delta.amount?` Conditional estimate: ${money(delta.previousAmount)} → ${money(delta.nextAmount)}; inspect payment details if the estimate is unchanged.`:" Conditional estimate unchanged.";
    const sameForm=changes.fields.includes("applicant_choice")&&changes.applicantFormBefore===changes.applicantFormAfter ? ` Modelled legal form remains ${changes.applicantFormAfter===null?"unknown":changes.applicantFormAfter.replaceAll("_"," ")}.` : "";
    return `${answers}. ${fit} ${state}${sameForm}${amount}`;
  }
  function conditionChange(c){
    if(c.removed)return "Condition no longer applies to this applicant.";
    if(c.before_result===null)return `Newly applicable condition · ${conditionText(c)}`;
    if(c.before_result===c.result&&c.before_value===c.value)return `Input affected · result unchanged: ${conditionText(c)}`;
    return `${c.effect==="amount"?"Amount condition":"Fit condition"}: ${c.before_result} → ${c.result}${c.effect==="amount"?` · ${money(c.before_value)} → ${money(c.value)}`:""}`;
  }
  function effectDetails(r){
    const delta=changed.get(r.id);
    return <section className="funding-option-effects" aria-label={`Answer effects for ${r.id}`}><h4>Answer effects</h4><p>{effectBrief(r)}</p>{delta&&delta.affected.map(c=><div className={`funding-check funding-check-${c.result}`} key={c.id}><strong>{conditionChange(c)}</strong><p>{c.message}</p><Evidence sources={c.sources}/></div>)}</section>;
  }
  function details(r) {
    return <div className="funding-inspection" aria-label={`Requirements for ${r.id}`}>
      {effectDetails(r)}
      {renderOption(r)}
      <h4>Modelled requirement network</h4>
      {coverage(r.id).requirements==="research_only" ? <p>Assessment not implemented. Programme requirements must be verified and modelled before this option can be assessed. Answering more questions cannot resolve this gap.</p> : conditions.filter(c=>c.option_id===r.id).map(c=><div key={c.id} className={`funding-check funding-check-${c.result} ${changes?.conditions.some(x=>x.id===c.id) ? "funding-affected" : ""}`}>
        <strong>{c.effect==="amount" ? "Amount condition" : "Fit condition"} · {conditionText(c)}</strong>
        <p>{c.message}</p>
        {c.effect==="amount" && c.value!==null && <p>Input / uncapped addition: {money(c.value)}. The overall conditional estimate remains subject to the assessment’s caps and conditions.</p>}
        <div>{c.fields.map(id=>{const q=questionStates.find(q=>q.id===id);return <button type="button" key={id} onClick={e=>onQuestion(id,e.currentTarget)}>{q.label}: {q.display_value}</button>;})}</div>
        <Evidence sources={c.sources}/>
      </div>)}
    </div>;
  }
  return <aside ref={visualRoot} className={`panel funding-visual ${fullView ? "is-full" : ""}`} aria-label="Live funding consequences">
    <div className="funding-visual-heading"><h2>Funding possibilities</h2>
    <div className="funding-visual-status" role="status">{value!==null&&<span className="funding-visual-counts">{[["matches","meet modelled fit conditions"],["needs_answers","need your answers"],["conflicts","conflict with current scenario"],["unimplemented","assessments not implemented"]].map(([key,label])=><span className={`funding-metric funding-outcome-${key}`} key={key}>{counts[key]} {label}<FundingHelp label={label}>{FUNDING_HELP[key]}</FundingHelp></span>)}</span>}<span className="funding-assessment-notice">{pending ? value ? "Updating—showing previous assessment" : "Updating funding assessment…" : failure ? value ? "Assessment failed—showing previous assessment" : "Assessment unavailable" : ""}</span></div>
    {navigation}</div>
    {failure && <div role="alert"><p>{failure}</p><button type="button" onClick={onRetry}>Retry assessment</button></div>}
    <button type="button" className="funding-mobile-expand" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded ? "Collapse" : "Expand"} funding visual workspace</button>
    <div className={`funding-visual-body ${expanded ? "is-expanded" : ""}`}>
      <div className="funding-visual-controls"><div className="funding-visual-toolbar" role="group" aria-label="Funding visual view"><button type="button" className="funding-edit-questions" disabled={!canEditQuestions} aria-haspopup="dialog" aria-controls="funding-answer-editor" aria-expanded={editorOpen} onClick={onEditQuestions}>Answer questions</button><button type="button" aria-pressed={view==="graph"} onClick={()=>setView("graph")}>Graph</button><button type="button" aria-pressed={view==="matrix"} onClick={()=>setView("matrix")}>Matrix</button><button ref={expandButton} type="button" aria-expanded={fullView} onClick={toggleFullView}>{fullView ? "Compact view" : "Expand view"}</button><button type="button" aria-pressed={shortlistOnly} onClick={()=>{setShortlistOnly(v=>!v);setPage(0);}}>{shortlistOnly ? "Show family options" : `Focus shortlist (${draft.selected.length})`}</button></div>
      <label className="funding-family-chooser">Funding family<select aria-label="Funding family" value={shortlistOnly ? "shortlist" : family} onChange={e=>{if(e.target.value==="shortlist"){setShortlistOnly(true);}else{setFamily(e.target.value);setShortlistOnly(false);}setPage(0);}}>{Object.entries(catalogue.groups).map(([id,label])=><option key={id} value={id}>{label} ({results.filter(r=>r.group===id).length} in scope / {catalogue.entries.filter(e=>e.group===id).length} total){results.filter(r=>r.group===id&&changed.has(r.id)).length>0?` · ${results.filter(r=>r.group===id&&changed.has(r.id)).length} affected`:""}</option>)}<option value="shortlist">Shortlist ({draft.selected.length})</option></select></label>
      </div>
      <div className="funding-working-summary" role="status" aria-label="Working funding option">
        {workingOption===null?<span>Choose the circle in a funding option to work on it. Colours currently summarise this family/shortlist.</span>:<>
          <span title={working?.title}><strong>Working option: {workingOption}</strong>. Controls answer colours.
            {!visible.options.some(r=>r.id===workingOption)&&" It is outside the displayed page/family or current filters."}
            {value!==null&&!working&&" Its assessment is unavailable; retry the assessment or clear the working option."}</span>
          <button type="button" onClick={()=>onInspect(workingOption)}>View working option</button>
          <button type="button" onClick={()=>onWork(null)}>Clear working option</button>
        </>}
      </div>
      {view==="graph"&&<div className="funding-graph-controls"><div role="group" aria-label="Graph requirement scope"><button type="button" aria-pressed={!focusCurrent} onClick={()=>setFocusCurrent(false)}>All fit requirements</button><button type="button" aria-pressed={focusCurrent} onClick={()=>setFocusCurrent(true)}>Focus current question</button></div><label className="funding-pick"><input type="checkbox" checked={showAmount} onChange={e=>setShowAmount(e.target.checked)}/>Show amount conditions</label>{wide&&<button type="button" onClick={()=>setColumnSplits(DEFAULT_FUNDING_COLUMNS)}>Reset column widths</button>}{currentField&&!questions.some(q=>q.id===currentField)&&<span>The current question has no visible modelled fit connection.</span>}</div>}
      {draft.version===4&&draft.legacy_selection_score!==null&&<p className="funding-selection-legacy">Previous manual AL20 score: {draft.legacy_selection_score} points · historical information only; not used in the annex calculation.</p>}
      <div className="funding-scope-bar"><p>{results.length} in browsing scope · {catalogue.entries.length} catalogue entries. {shortlistOnly ? "Shortlist focus" : catalogue.groups[family]} · {fullView ? `Showing all ${scope.count} options; scroll the explorer` : `Page ${displayedPage+1} of ${scope.pages} · ${scope.count} options`}{results.filter(r=>changed.has(r.id)&&!visible.options.some(v=>v.id===r.id)).length>0&&` · ${results.filter(r=>changed.has(r.id)&&!visible.options.some(v=>v.id===r.id)).length} affected outside this page/family`}</p>
      <div className="funding-actions">{!fullView&&<><button type="button" disabled={displayedPage===0} onClick={()=>setPage(displayedPage-1)}>Previous options</button><button type="button" disabled={displayedPage>=scope.pages-1} onClick={()=>setPage(displayedPage+1)}>Next options</button></>}{inspected && <button type="button" onClick={()=>onInspect(null)}>Clear inspection</button>}</div></div>
      <details className="funding-view-help"><summary>How to read this view</summary><p className="funding-feedback-key">Use the circle to choose one working option for answer colours and emphasised connections. Clicking a card opens its details without changing the working option. Shortlist checkboxes are separate; only clicking the control changes a checked selection. Working on an option does not adopt a plan or create an application.</p><p>Inset outlines show the effects of your latest answer. Fit nodes cover this family/shortlist and the working option, including options on other pages. Question navigation keeps their positions. Focus current question shows only the active question.</p><p className="funding-network-explanation">All applicable requirements must be satisfied. A single connection does not establish eligibility. Amount connections affect the conditional estimate; call availability is separate. Neutral scope connections describe activity browsing only.</p></details>
      {view==="matrix"&&model?.version===2&&<div className="funding-selection-matrix-summary"><strong>AL20 selection assessments</strong>{Object.entries(model.annex.routes).map(([id,score])=><p key={id}>{id} · {selectionSummary(score)} <button type="button" onClick={e=>{annex.onRoute(id);onQuestion("selection_score",e.currentTarget);}}>Open in graph</button></p>)}</div>}
      {value && <><p className="funding-network-legend">All applicable requirements must be satisfied. ✓ Meets · × Conflicts · ? Unresolved · {workingOption===null?"Mixed: results differ across programmes. Choose a working option for its colours.":`Colours and emphasised connections: ${workingOption}.`} Call availability is separate from fit.</p>
        {view==="graph" ? <div ref={graphPanel} className={`funding-diagram-scroll${resizing!==null?" is-resizing":""}`} onScroll={e=>setGraphScroll(e.currentTarget.scrollTop)} tabIndex={0} aria-label="Funding graph, scroll to explore"><div className="funding-diagram" style={{width:diagramWidth,height:diagramHeight}}>
          {wide&&columns.dividers.map((left,index)=><div key={index} className="funding-column-divider" role="separator" aria-label={index===0?"Resize exploration and circumstances columns":"Resize circumstances and funding options columns"} aria-orientation="vertical" aria-valuemin={Math.round(columns.limits[index][0])} aria-valuemax={Math.round(columns.limits[index][1])} aria-valuenow={Math.round(left)} aria-valuetext={`${Math.round(left)} pixels from the graph’s left edge`} tabIndex={0} style={{left:left-9}} title="Drag to resize columns. Arrow keys move 10 pixels; Shift moves 40. Home/End reach the limits." onPointerDown={e=>startColumnResize(e,index)} onPointerMove={moveColumn} onPointerUp={endColumnResize} onPointerCancel={endColumnResize} onLostPointerCapture={()=>{columnDrag.current=null;setResizing(null);}} onKeyDown={e=>resizeColumnByKey(e,index)}><span aria-hidden="true">⋮</span></div>)}
          <div className="funding-layer-label" style={{left:12}}>Exploration</div><div className="funding-layer-label" style={{left:circumstanceLeft}}>Circumstances / answers</div><div className="funding-layer-label" style={{left:optionLeft}}>Funding options</div>
          <svg aria-hidden="true" width={diagramWidth} height={diagramHeight}>
            {layout.rows.slice(1).map((row,index)=>{const previous=layout.rows[index];return <path key={`annex-${index}`} className="funding-edge-neutral" d={`M ${circumstanceLeft+5} ${previous.top+previous.height/2} L ${circumstanceLeft+5} ${row.top+row.height/2} L ${circumstanceLeft+(row.kind==="choice"||row.kind==="calculation"?24:12)} ${row.top+row.height/2}`}/>;})}
            {questions.map((q,i)=><path key={`root-${q.id}`} className="funding-edge-neutral" d={`M ${originRight} 92 C ${originCurve} 92,${originCurve} ${questionY(q)},${circumstanceLeft} ${questionY(q)}`}/>)}
            {visible.options.flatMap((r,j)=>questions.flatMap((q,i)=>{
              const links=conditions.filter(c=>c.option_id===r.id && c.fields.includes(q.id) && (c.effect==="eligibility"||showAmount));
              if(coverage(r.id).scope_fields.includes(q.id)) return <g key={`${q.id}-${r.id}-scope`}><title>{q.label} → {r.id}: Activity browsing scope only; no eligibility conclusion</title><path className="funding-edge-neutral" d={`M ${circumstanceRight} ${questionY(q)} C ${fitCurve} ${questionY(q)},${fitCurve} ${92+j*132},${optionLeft} ${92+j*132}`}/><text x={fitCurve} y={84+(i+j)*66}>scope</text></g>;
              if(!links.length) return [];
              const active=workingOption!==null?workingOption===r.id:q.id===currentField;
              const groups=["eligibility","amount"].map(effect=>({effect,checks:links.filter(c=>c.effect===effect)})).filter(group=>group.checks.length);
              return groups.map(({effect,checks})=>{
                const status=graphLinkStatus(checks),kind=effect==="amount"?"amount":"fit",offset=groups.length>1?(effect==="amount"?5:-5):0;
                return <g key={`${q.id}-${r.id}-${effect}`} data-connection-option={r.id} className={active?"funding-connection-active":"funding-connection-muted"}><title>{q.label} → {r.id}: {checks.map(conditionText).join("; ")}</title><path className={`funding-edge-${status} ${kind==="amount" ? "funding-edge-amount" : ""}`} d={`M ${circumstanceRight} ${questionY(q)+offset} C ${fitCurve} ${questionY(q)+offset},${fitCurve} ${92+j*132+offset},${optionLeft} ${92+j*132+offset}`}/>{active&&<text x={fitCurve} y={84+(i+j)*66+offset}>{kind} {status==="fail" ? "×" : status==="unknown" ? "?" : "✓"}</text>}</g>;
              });
            }))}
          </svg>
          <div className="funding-graph-origin" style={{top:44,left:12,width:originWidth}}><strong>{draft.name}</strong><small>{pending||failure ? "Current selection · previous result" : "Current assessed answers"}</small></div>
          {questions.map((q,i)=>{
            const state=nodeStates.get(q.id);
            return <button type="button" key={q.id} data-question-id={q.id} data-condition-status={state.status}
              className={`funding-circumstance funding-node-${state.status} ${q.id===currentField?"is-current":""} ${workingOption!==null&&!workingFields.has(q.id)?"is-muted":""} ${changes?.fields.includes(q.id) ? "funding-affected" : ""}`}
              style={{top:layout.tops.get(q.id),left:circumstanceLeft,width:circumstanceWidth}} title={`${q.label}\n${q.display_value}\n${q.origin}\n${state.detail}`}
              aria-expanded={q.type==="selection"?annex.open:undefined} aria-haspopup={q.type==="selection"?undefined:"dialog"} aria-controls={q.type==="selection"?"funding-annex-branch":"funding-answer-editor"} onClick={e=>q.type==="selection"&&annex.open?annex.onCollapse():onQuestion(q.id,e.currentTarget)}>
              <span className="funding-node-rail" aria-hidden="true">{Object.entries(state.counts).filter(([,count])=>count>0).map(([key,count])=><span key={key} className={`funding-node-segment-${key}`} style={{flex:count}}/>)}</span>
              <strong>{q.label}</strong><span>{q.type==="selection"&&annexScore!==null?selectionSummary(annexScore):q.display_value}</span><small>{q.origin}</small>
              <span className="funding-node-status" aria-label={state.detail}>{state.status==="mixed"?<>
                <span className="funding-node-status-label">{state.label}</span>
                {[["pass","✓"],["unknown","?"],["fail","×"]].filter(([key])=>state.counts[key]>0).map(([key,symbol])=><span key={key} className={`funding-node-count funding-node-count-${key}`}>{symbol} {state.counts[key]}</span>)}
              </>:state.label}</span>
            </button>;
          })}
          {annex!==null&&annex.open&&<div id="funding-annex-branch"><FundingSelectionBranch rows={layout.rows} left={circumstanceLeft} width={circumstanceWidth} route={annex.route} routes={draft.bundle.selection.routes} score={annexScore} answers={annex.route===null?null:draft.selection_assessments[annex.route]} onRoute={annex.onRoute} onGroup={annex.onGroup} onCriterion={annex.onCriterion} onCollapse={annex.onCollapse} disabled={annex.disabled}/></div>}
          {annex!==null&&annex.open&&annexScore!==null&&graphScroll>Math.max(1,visible.options.length)*132&&<aside className="funding-annex-live-result" aria-label="Live AL20 route result" style={{top:graphScroll+44,left:optionLeft,width:optionWidth}}>
            <strong>{annex.route}</strong><p>{selectionSummary(annexScore)}</p><p>{pending?"Updating — showing previous assessment":failure?"Assessment failed — showing previous assessment":fundingStatus(allResults.find(r=>r.id===annex.route))}</p><small>All other funding conditions still apply.</small><div className="funding-actions"><button type="button" onClick={()=>onInspect(annex.route)}>Inspect funding option</button><button type="button" onClick={()=>graphPanel.current.scrollTo({top:0,behavior:"instant"})}>Back to funding options</button></div>
          </aside>}
          {visible.options.map((r,i)=><div key={r.id} data-option-id={r.id} className={`funding-graph-option ${workingOption===r.id?"is-working":""} ${inspected===r.id?"is-inspected":""} ${workingOption!==null&&workingOption!==r.id?"is-muted":""} ${changed.has(r.id) ? "funding-affected" : ""}`} style={{top:44+i*132,left:optionLeft,width:optionWidth}} title={`${r.id} · ${r.title}`} onClick={()=>choose(r.id)}>
            <button type="button" className="funding-option-open" aria-expanded={inspected===r.id}><strong>{r.id} · {r.title}</strong><span className={`funding-outcome-${fundingClass(r)}`}>{fundingStatus(r)}</span><small>{coverage(r.id).requirements==="research_only" ? "Assessment not implemented" : `${coverage(r.id).unresolved_count} unresolved conditions`}</small><Changed change={changed.get(r.id)}/></button>
            <FundingWorkingOption id={r.id} checked={workingOption===r.id} onChange={onWork} group="funding-working-graph" compact/>
          </div>)}
          {!questions.length && <p className="funding-no-connections">Choose a question or inspect an option to see its modelled dependencies.</p>}
        </div></div> : <div ref={matrixPanel} className="funding-table funding-matrix" tabIndex={0} aria-label="Funding matrix, scroll to explore"><table><caption>Funding options · {shortlistOnly ? "Shortlist" : catalogue.groups[family]}</caption><thead><tr><th>Funding option</th><th>Overall fit</th><th>Current / latest answer</th><th>Unresolved conditions</th><th>Call availability</th></tr></thead><tbody>{visible.options.map(r=><React.Fragment key={r.id}><tr data-option-id={r.id} className={`${workingOption===r.id?"is-working":""} ${inspected===r.id?"is-inspected":""} ${changed.has(r.id)?"funding-affected":""}`}><th scope="row"><button type="button" onClick={()=>choose(r.id)} aria-expanded={inspected===r.id}>{r.id} · {r.title}</button><FundingWorkingOption id={r.id} checked={workingOption===r.id} onChange={onWork} group="funding-working-matrix"/></th><td className={changed.get(r.id)?.fit?"funding-cell-changed":""}><span className={`funding-fit-text funding-outcome-${fundingClass(r)}`}>{fundingStatus(r)}</span><FundingHelp label={fundingStatus(r)}>{FUNDING_HELP[fundingClass(r)]}</FundingHelp><Changed change={changed.get(r.id)}/></td><td className={changed.get(r.id)?.amount?"funding-cell-changed funding-cell-amount":changed.get(r.id)?.conditions.length?"funding-cell-changed":""}><span>{effectText(r.id)}</span><FundingHelp label={`answer effect on ${r.id}`}>{effectBrief(r)}</FundingHelp><button type="button" onClick={()=>onInspect(r.id)} aria-label={`Inspect effects for ${r.id}`}>Inspect effects</button>{changed.get(r.id)?.amount&&<strong className="funding-amount-change">Conditional amount changed: {money(changed.get(r.id).previousAmount)} → {money(changed.get(r.id).nextAmount)}</strong>}</td><td>{coverage(r.id).requirements==="research_only" ? "Not modelled" : coverage(r.id).unresolved_count}</td><td>{r.availability}</td></tr>{inspected===r.id && <tr><td colSpan={5}>{details(r)}</td></tr>}</React.Fragment>)}</tbody></table></div>}
        {visible.options.length===0 && <p>No options in this scope. Adjust the browsing filters, choose another family or leave shortlist focus.</p>}
        {option && (view==="graph" || !visible.options.some(r=>r.id===option.id)) && <><h3>Inspecting {option.id}</h3>{!visible.options.some(r=>r.id===option.id) && <p>This option is outside the displayed family/page or current filters. Its assessment is still available below.</p>}{details(option)}</>}
      </>}
    </div>
  </aside>;
}
