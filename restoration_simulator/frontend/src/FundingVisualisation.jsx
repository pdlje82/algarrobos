import React, {useEffect, useRef, useState} from "react";
import {fundingClass,fundingStatus,fundingCounts,statusLabel,FUNDING_HELP} from "./fundingState.js";
import {FundingHelp} from "./FundingHelp.jsx";
import {conditionText, visualScope,graphAnswerStatus} from "./fundingVisualState.js";
import {money} from "./format.js";
import {DocumentLink} from "./DocumentLink.jsx";
import {DEFAULT_FUNDING_COLUMNS,resizeFundingColumn,FUNDING_GRAPH_COLUMNS} from "./fundingLayout.js";
import {FundingSelectionBranch} from "./FundingSelection.jsx";
import {selectionGraphLayout,selectionProfile,selectionSummary,selectionBranchConnections} from "./fundingSelectionState.js";
import {FundingWorkingOption} from "./FundingWorkingOption.jsx";
import {FundingProgrammeGuide} from "./FundingProgrammes.jsx";
import {FundingProgrammeNodes} from "./FundingProgrammeNodes.jsx";
import {programmeNodeLayout} from "./fundingProgrammeNodes.js";
import {useFundingGraphWindow} from "./useFundingGraphWindow.js";
import {FundingColumnControls,FundingContinuationMarkers} from "./FundingGraphWindow.jsx";
import {fundingGraphConnections,fundingContinuations} from "./fundingGraphConnections.js";
import {programmeMembers,routeCoverage} from "./fundingProgrammeState.js";

function Evidence({sources}) {
  return <ul className="funding-sources">{sources.map((s,i)=><li key={i}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink></li>)}</ul>;
}
function Changed({change}) {
  if(!change)return null;
  const labels=[change.fit&&"Fit changed",change.conditions.length>0&&"Condition changed",change.amount&&"Conditional amount changed",change.scope&&"Activity relevance changed"];
  if(!labels.some(Boolean))labels.push("Input affected · result unchanged");
  return <span className="funding-change-label">{labels.filter(Boolean).join(" · ")}</span>;
}

export function FundingVisualisation({annex=null,displayConditions,programmeState,programme,programmeDisplay,onProgramme,onDisplay,guideProgramme,onProgrammeGuide,onCloseProgrammeGuide,routeScope,groupedMetIds,displayedQuestions,value,changes,latestFields,pending,failure,onRetry,results,catalogue,draft,currentField,onQuestion,editorOpen,canEditQuestions,onEditQuestions,navigation,inspected,onInspect,workingOption,onWork,renderOption,questions:questionStates}) {
  const family=programme===null?null:programme.family;
  const [page,setPage]=useState(0), [shortlistOnly,setShortlistOnly]=useState(false);
  useEffect(()=>{setShortlistOnly(false);setPage(0);},[programme===null?null:programme.id]);
  const [expanded,setExpanded]=useState(false);
  const [fullView,setFullView]=useState(false);
  const showAmount=programmeDisplay!==null&&programmeDisplay.show_amount;
  const comparing=programmeDisplay!==null&&programmeDisplay.compare;
  const [columnSplits,setColumnSplits]=useState(DEFAULT_FUNDING_COLUMNS);
  const [browse,setBrowse]=useState(false),[search,setSearch]=useState(""),[expandedFamilies,setExpandedFamilies]=useState([]);
  useEffect(()=>{setBrowse(false);setSearch("");},[programme?.id]);
  const [resizing,setResizing]=useState(null),columnDrag=useRef(null);
  const [nodesExpanded,setNodesExpanded]=useState(false);
  const nodeCompactScroll=useRef(null);
  useEffect(()=>{
    if(annex===null||annex.signal===0)return;
    setExpanded(true);
    requestAnimationFrame(()=>{view.reveal(2);visualRoot.current?.querySelector('.funding-circumstance[data-question-id="selection_score"]')?.scrollIntoView({block:"nearest",inline:"nearest"});});
  },[annex?.signal]);
  const graphPanel=useRef(null),compactScroll=useRef(null);
  const visualRoot=useRef(null);
  const view=useFundingGraphWindow(graphPanel,visualRoot,value!==null,columnSplits);
  const columns=view.layout,diagramWidth=columns.canvasWidth,graphScroll=view.scroll.top;
  useEffect(()=>{if(programme!==null)view.reveal(3);},[programme?.id]);
  useEffect(()=>{if(workingOption!==null)view.reveal(routeScope!==null&&routeScope.all.length>0?2:3);},[workingOption]);
  useEffect(()=>{
    if(!inspected)return;
    const modalOpen=()=>document.querySelector("[role='dialog'],dialog[open]")!==null;
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
  const memberIds=programme===null?[]:programmeMembers(programme,catalogue);
  const allProgrammeRows=allResults.filter(r=>memberIds.includes(r.id));
  const filteredIds=new Set(results.map(r=>r.id));
  const programmeRows=allProgrammeRows.filter(r=>r.id===workingOption||filteredIds.has(r.id)&&(!shortlistOnly||draft.selected.includes(r.id)));
  const onlyWorking=workingOption!==null&&!comparing&&programmeDisplay!==null&&!programmeDisplay.show_other_routes;
  const rows=onlyWorking?programmeRows.filter(r=>r.id===workingOption):programmeRows;
  const scope=visualScope(rows,{group:family,shortlistOnly:false,selected:draft.selected,page,expanded:fullView});
  const displayedPage=Math.min(page,scope.pages-1);
  const visible=displayedPage===page?scope:visualScope(rows,{group:family,shortlistOnly:false,selected:draft.selected,page:displayedPage,expanded:fullView});
  const counts=fundingCounts(allProgrammeRows);
  const option=allResults.find(r=>r.id===inspected);
  const working=allResults.find(r=>r.id===workingOption);
  const conditions=displayConditions===null?[]:displayConditions;
  const scopeIds=comparing?memberIds:workingOption===null?[]:[workingOption];
  const questions=displayedQuestions;
  const nodeStates=new Map(questions.map(q=>[q.id,graphAnswerStatus(q.id,conditions,scopeIds,{workingOption:comparing?null:workingOption,showAmount})]));
  const workingFields=new Set(conditions.filter(c=>c.option_id===workingOption&&(c.effect==="eligibility"||showAmount)).flatMap(c=>c.fields));
  if(model!==undefined&&![1,2].includes(model.version))throw Error("Unsupported funding graph response. Restart the backend and refresh the app.");
  if(model!==undefined&&draft.version===4&&(model.version!==2||!model.annex||model.annex.version!==1))throw Error("The AL20 graph response is incomplete. Restart the backend and retry assessment.");
  const annexProfile=annex!==null&&annex.route!==null?selectionProfile(draft,annex.route):null;
  const annexScore=model?.version===2&&annex!==null&&annex.route!==null?model.annex.routes[annex.route]:null;
  if(model?.version===2&&annex!==null&&annex.route!==null&&!annexScore)throw Error("The selected AL20 route assessment is missing. Retry assessment.");
  const metIds=routeScope===null?[]:routeScope.met.map(q=>q.id);
  const layout=selectionGraphLayout(questions,{open:annex!==null&&annex.open,route:annex===null?null:annex.route,profile:annexProfile,groups:annex===null?[]:annex.groups},metIds.length===0&&groupedMetIds.length===0?null:{ids:groupedMetIds});
  const questionY=q=>layout.tops.get(q.id)+48;
  const programmes=programmeNodeLayout(programmeState.value,catalogue,programme===null?null:programme.id,{browse,search,expandedFamilies});
  const diagramHeight=Math.max(layout.height,Math.max(1,visible.options.length)*132+48,programmes.height);
  const connections=fundingGraphConnections({columns:columns.columns,programmeRows:programmes.rows,programme,questions,questionY,options:visible.options,conditions,showAmount,workingOption,comparing,currentField});
  const continuations=view.scroll.height>0?fundingContinuations(connections,{left:view.scroll.left,top:graphScroll,width:columns.viewportWidth,height:view.scroll.height}):[];
  function toggleNodeHeight(e){
    const trigger=e.currentTarget,panel=graphPanel.current;
    if(!nodesExpanded){nodeCompactScroll.current={trigger,top:panel.scrollTop,left:panel.scrollLeft,windowY:window.scrollY};setNodesExpanded(true);return;}
    setNodesExpanded(false);
    const previous=nodeCompactScroll.current;
    // Expand view can reveal the complete canvas without a node-area opener.
    requestAnimationFrame(()=>{if(previous!==null){panel.scrollTop=previous.top;panel.scrollLeft=previous.left;window.scrollTo({top:previous.windowY,behavior:"instant"});}const opener=previous!==null&&previous.trigger.isConnected?previous.trigger:trigger;opener.focus({preventScroll:true});});
  }
  const {originWidth,circumstanceLeft,circumstanceWidth,optionLeft,optionWidth}=columns;
  function startColumnResize(e,index){
    if(e.button!==0)return;e.preventDefault();e.currentTarget.focus({preventScroll:true});
    const bounds=graphPanel.current.getBoundingClientRect();
    columnDrag.current={id:e.pointerId,index,offset:e.clientX-bounds.left+graphPanel.current.scrollLeft-columns.dividers[index]};
    e.currentTarget.setPointerCapture(e.pointerId);setResizing(index);
  }
  function moveColumn(e){
    const drag=columnDrag.current;if(drag===null||drag.id!==e.pointerId)return;
    const x=e.clientX-graphPanel.current.getBoundingClientRect().left+graphPanel.current.scrollLeft-drag.offset;
    setColumnSplits(current=>resizeFundingColumn(columns.viewportWidth,current,drag.index,x,view.preference));
  }
  function endColumnResize(e){if(columnDrag.current?.id!==e.pointerId)return;columnDrag.current=null;setResizing(null);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
  function resizeColumnByKey(e,index){
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();
    const position=e.key==="Home"?columns.limits[index][0]:e.key==="End"?columns.limits[index][1]:columns.dividers[index]+(e.key==="ArrowLeft"?-1:1)*(e.shiftKey?40:10);
    setColumnSplits(current=>resizeFundingColumn(columns.viewportWidth,current,index,position,view.preference));
  }
  const coverage=id=>model.coverage.find(c=>c.option_id===id);
  const effects=id=>conditions.filter(c=>c.option_id===id && c.fields.some(f=>changes!==null?changes.fields.includes(f):currentField?f===currentField:latestFields.includes(f)));
  const effectText=id=>{
    const matches=effects(id);
    if (!matches.length) return coverage(id).requirements==="research_only" ? "Automated assessment unavailable" : currentField==="activity" ? (facts.activity===null ? "Activity unknown; scope not narrowed" : allResults.find(r=>r.id===id).relevant ? "Within activity scope" : "Outside activity scope") : "No modelled condition for this answer";
    return matches.map(c=>`${c.effect==="amount" ? "Amount" : "Fit"}: ${conditionText(c)}`).join(" · ");
  };
  function choose(id) {onInspect(inspected===id ? null : id);}
  function toggleFullView(event) {
    const trigger=event.currentTarget;
    if(!fullView){const panel=graphPanel.current;compactScroll.current={nodesExpanded,windowY:window.scrollY,graph:panel===null?null:{top:panel.scrollTop,left:panel.scrollLeft}};setNodesExpanded(true);setFullView(true);return;}
    setFullView(false);
    setNodesExpanded(compactScroll.current.nodesExpanded);
    requestAnimationFrame(()=>{
      const s=compactScroll.current;
      if(s.graph!==null){const panel=graphPanel.current;if(panel===null)throw Error("The funding graph is unavailable. Reload Funding Navigator before restoring its scroll position.");panel.scrollTop=s.graph.top;panel.scrollLeft=s.graph.left;}
      trigger.focus({preventScroll:true});window.scrollTo({top:s.windowY,behavior:"instant"});
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
    if(coverage(r.id).requirements==="research_only")return <div className="funding-inspection" aria-label={`Introduction and research for ${r.id}`}>{renderOption(r)}</div>;
    return <div className="funding-inspection" aria-label={`Requirements for ${r.id}`}>
      {effectDetails(r)}
      {renderOption(r)}
      <h4>Modelled requirement network</h4>
      {conditions.filter(c=>c.option_id===r.id).map(c=><div key={c.id} className={`funding-check funding-check-${c.result} ${changes?.conditions.some(x=>x.id===c.id) ? "funding-affected" : ""}`}>
        <strong>{c.effect==="amount" ? "Amount condition" : "Fit condition"} · {conditionText(c)}</strong>
        <p>{c.message}</p>
        {c.effect==="amount" && c.value!==null && <p>Input / uncapped addition: {money(c.value)}. The overall conditional estimate remains subject to the assessment’s caps and conditions.</p>}
        <div>{c.fields.map(id=>{const q=questionStates.find(q=>q.id===id);return <button type="button" key={id} onClick={e=>onQuestion(id,e.currentTarget,r.id)}>{q.label}: {q.display_value}</button>;})}</div>
        <Evidence sources={c.sources}/>
      </div>)}
    </div>;
  }
  return <aside ref={visualRoot} className={`panel funding-visual ${fullView ? "is-full" : ""}`} aria-label="Live funding consequences">
    <div className="funding-visual-heading"><h2>Funding possibilities</h2>
    <div className="funding-visual-status" role="status">{value!==null&&programme!==null&&<span className="funding-visual-counts">{[["matches","meet modelled fit conditions"],["needs_answers","need your answers"],["conflicts","conflict with current scenario"],["unimplemented","reference options"]].map(([key,label])=><span className={`funding-metric funding-outcome-${key}`} key={key}>{counts[key]} {label}<FundingHelp label={label}>{FUNDING_HELP[key]}</FundingHelp></span>)}</span>}<span className="funding-assessment-notice">{pending ? value ? "Updating—showing previous assessment" : "Updating funding assessment…" : failure ? value ? "Assessment failed—showing previous assessment" : "Assessment unavailable" : ""}</span></div>
    {navigation}</div>
    {failure && <div role="alert"><p>{failure}</p><button type="button" onClick={onRetry}>Retry assessment</button></div>}
    <button type="button" className="funding-mobile-expand" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded ? "Collapse" : "Expand"} funding visual workspace</button>
    <div className={`funding-visual-body ${expanded ? "is-expanded" : ""}`}>
      <label className="funding-programme-search">Find a programme or approach<input type="search" aria-label="Find a programme or approach" value={search} disabled={programmeState.value===null} onFocus={()=>{setBrowse(true);view.reveal(1);}} onChange={e=>{setSearch(e.target.value);setBrowse(true);view.reveal(1);if(graphPanel.current!==null)graphPanel.current.scrollTop=0;}}/></label>
      <div className="funding-visual-controls"><div className="funding-visual-toolbar" role="group" aria-label="Funding graph controls"><button type="button" className="funding-edit-questions" disabled={!canEditQuestions||questions.length===0} aria-haspopup="dialog" aria-controls="funding-answer-editor" aria-expanded={editorOpen} onClick={onEditQuestions}>Answer route questions</button><button type="button" aria-expanded={fullView} onClick={toggleFullView}>{fullView?"Compact view":"Expand view"}</button><button type="button" aria-pressed={shortlistOnly} onClick={()=>{setShortlistOnly(v=>!v);setPage(0);}}>{shortlistOnly?"Show programme routes":`Focus shortlist (${draft.selected.length})`}</button></div></div>
      <div className="funding-working-summary" role="status" aria-label="Working funding option">
        {workingOption===null?<span>Choose a programme node, then a funding route to see its requirements. Read guide opens each programme’s introduction.</span>:<>
          <span title={working?.title}><strong>Working option: {workingOption}</strong>. {comparing?"Comparing all programme routes.":"Showing this route’s requirements."}
            {!visible.options.some(r=>r.id===workingOption)&&" It is outside the displayed page/family or current filters."}
            {value!==null&&!working&&" Its assessment is unavailable; retry the assessment or clear the working option."}</span>
          <button type="button" onClick={()=>onInspect(workingOption)}>View working option</button>
          <button type="button" onClick={()=>onWork(null)}>Clear working option</button>
        </>}
      </div>
      {programmeDisplay!==null&&programme!==null&&<div className="funding-graph-controls"><div role="group" aria-label="Graph requirement scope"><button type="button" aria-pressed={!comparing} onClick={()=>onDisplay({...programmeDisplay,compare:false})}>Route questions</button><button type="button" aria-pressed={comparing} onClick={()=>onDisplay({...programmeDisplay,compare:true})}>Compare programme routes</button></div><label className="funding-pick"><input type="checkbox" checked={showAmount} onChange={e=>onDisplay({...programmeDisplay,show_amount:e.target.checked})}/>Show amount questions</label>{workingOption!==null&&memberIds.length>1&&!comparing&&<button type="button" aria-expanded={programmeDisplay.show_other_routes} onClick={()=>onDisplay({...programmeDisplay,show_other_routes:!programmeDisplay.show_other_routes})}>Other programme routes ({memberIds.length-1})</button>}{routeScope!==null&&<span role="status">{routeScope.attention.length} needing attention · {routeScope.met.length} met · {routeScope.all.length} total questions</span>}</div>}
      {draft.version===4&&draft.legacy_selection_score!==null&&<p className="funding-selection-legacy">Previous manual AL20 score: {draft.legacy_selection_score} points · historical information only; not used in the annex calculation.</p>}
      <div className="funding-scope-bar"><p>{programme===null?"Choose a programme to see its routes.":`${programme.title} · ${memberIds.length} routes · ${fullView?`Showing ${scope.count} routes`:`Page ${displayedPage+1} of ${scope.pages} · ${scope.count} displayed routes`}`}</p><div className="funding-actions">{!fullView&&scope.pages>1&&<><button type="button" disabled={displayedPage===0} onClick={()=>setPage(displayedPage-1)}>Previous options</button><button type="button" disabled={displayedPage>=scope.pages-1} onClick={()=>setPage(displayedPage+1)}>Next options</button></>}{inspected&&<button type="button" onClick={()=>onInspect(null)}>Clear inspection</button>}</div></div>
      <details className="funding-view-help"><summary>How to read this view</summary><p>Choose a programme, then use a route’s circle to work on it. Card titles open descriptions without changing your working route or shortlist. Questions come from that route’s modelled checks; satisfied requirements can be expanded below. Compare programme routes shows their combined questions and mixed results.</p><p>Sources and descriptions do not certify eligibility. Amount questions supply funding estimates. Answers are retained when you switch focus; only explicit plan actions adopt a funding plan.</p></details>
      {value && <><p className="funding-network-legend">All applicable requirements must be satisfied. ✓ Meets · × Conflicts · ? Unresolved · {comparing?"Mixed: results differ across programme routes.":workingOption===null?"Choose a route for its requirements.":`Colours and connections: ${workingOption}.`} Call availability is separate from fit.</p>
        <FundingColumnControls view={view} hasProgramme={programme!==null} onReset={()=>setColumnSplits(DEFAULT_FUNDING_COLUMNS)}/>
        <div className="funding-offscreen-columns" aria-hidden="true"><span>{view.scroll.left>1?`← ${FUNDING_GRAPH_COLUMNS[Math.max(0,view.start-1)].label}`:""}</span><span>{view.scroll.left+columns.viewportWidth<diagramWidth-1?`${FUNDING_GRAPH_COLUMNS[Math.min(3,view.start+columns.count)].label} →`:""}</span></div>
        <div className="funding-node-area"><div className="funding-node-height-controls"><strong>Node area</strong><button type="button" aria-expanded={nodesExpanded} onClick={toggleNodeHeight}>{nodesExpanded?"Collapse node area":"Expand node area"}</button></div><div className="funding-graph-window"><div ref={graphPanel} className={`funding-diagram-scroll${resizing!==null?" is-resizing":""}`} style={nodesExpanded?{maxHeight:"none",overscrollBehavior:"auto"}:undefined} onScroll={view.onScroll} onKeyDown={view.onKeyDown} onFocusCapture={view.onFocus} tabIndex={0} aria-label="Funding graph, scroll to explore"><div className="funding-diagram" style={{width:diagramWidth,height:diagramHeight}}>
          {columns.dividers.map((left,index)=>view.fullyVisible(index)&&view.fullyVisible(index+1)&&<div key={index} className="funding-column-divider" role="separator" aria-label={`Resize ${FUNDING_GRAPH_COLUMNS[index].label} and ${FUNDING_GRAPH_COLUMNS[index+1].label} columns`} aria-orientation="vertical" aria-valuemin={Math.round(columns.limits[index][0])} aria-valuemax={Math.round(columns.limits[index][1])} aria-valuenow={Math.round(left)} aria-valuetext={`${Math.round(left)} pixels from the graph’s left edge`} tabIndex={0} style={{left:left-9}} title="Drag to resize columns. Arrow keys move 10 pixels; Shift moves 40. Home/End reach the limits." onPointerDown={e=>startColumnResize(e,index)} onPointerMove={moveColumn} onPointerUp={endColumnResize} onPointerCancel={endColumnResize} onLostPointerCapture={()=>{columnDrag.current=null;setResizing(null);}} onKeyDown={e=>resizeColumnByKey(e,index)}><span aria-hidden="true">⋮</span></div>)}
          {columns.columns.map(c=><div key={c.id} className="funding-layer-label" style={{left:c.left}}>{c.label}</div>)}
          <svg aria-hidden="true" width={diagramWidth} height={diagramHeight}>
            {selectionBranchConnections(layout.rows,circumstanceLeft,circumstanceWidth,layout.tops.get("selection_score")).map(edge=><path key={`annex-${edge.key}`} className="funding-edge-neutral funding-annex-edge" d={edge.path}/>)}
            {connections.map(edge=><g key={edge.id} data-connection-id={edge.id} data-connection-option={edge.optionId} className={edge.active?"funding-connection-active":"funding-connection-muted"}><title>{edge.label}</title><path className={`funding-edge-${edge.status} ${edge.effect==="amount"?"funding-edge-amount":""} ${edge.effect==="structure"?"funding-edge-structure":""}`} d={edge.path}/></g>)}
          </svg>
          <FundingProgrammeNodes layout={programmes} column={columns.columns[1]} state={programmeState} selected={programme===null?null:programme.id} browse={browse} onBrowse={setBrowse} onFamily={(id,open)=>setExpandedFamilies(current=>open?[...new Set([...current,id])]:current.filter(x=>x!==id))} onSelect={id=>{setPage(0);setSearch("");setBrowse(false);graphPanel.current.scrollTop=0;onProgramme(id);}} onGuide={onProgrammeGuide} catalogue={catalogue} conditions={displayConditions}/>
          <div data-graph-column="exploration" className="funding-graph-origin" style={{top:44,left:12,width:originWidth}}><strong>{draft.name}</strong><small>{programme===null?"No programme selected":programme.title}{workingOption===null?"":` · ${workingOption}`}</small><small>{pending||failure ? "Current selection · previous result" : "Current assessed answers"}</small></div>
          {layout.metHeaderTop!==null&&<button type="button" data-graph-column="requirements" className="funding-requirements-met" style={{position:"absolute",top:layout.metHeaderTop,left:circumstanceLeft,width:circumstanceWidth,height:64}} aria-expanded={programmeDisplay.show_met} onClick={()=>onDisplay({...programmeDisplay,show_met:!programmeDisplay.show_met})}>Requirements met ({metIds.length}) · {programmeDisplay.show_met?"Hide":"Show"}</button>}
          {questions.map((q,i)=>{
            const state=nodeStates.get(q.id);
            return <button type="button" key={q.id} data-question-id={q.id} data-graph-column="requirements" data-condition-status={state.status}
              className={`funding-circumstance funding-node-${state.status} ${q.id===currentField?"is-current":""} ${!comparing&&workingOption!==null&&!workingFields.has(q.id)?"is-muted":""} ${changes?.fields.includes(q.id) ? "funding-affected" : ""}`}
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
          {annex!==null&&annex.open&&<div id="funding-annex-branch" data-graph-column="requirements"><FundingSelectionBranch rows={layout.rows} left={circumstanceLeft} width={circumstanceWidth} route={annex.route} routes={draft.bundle.selection.routes} score={annexScore} answers={annex.route===null?null:draft.selection_assessments[annex.route]} onRoute={annex.onRoute} onGroup={annex.onGroup} onCriterion={annex.onCriterion} onCollapse={annex.onCollapse} disabled={annex.disabled}/></div>}
          {annex!==null&&annex.open&&annexScore!==null&&graphScroll>Math.max(1,visible.options.length)*132&&<aside className="funding-annex-live-result" aria-label="Live AL20 route result" style={{top:graphScroll+44,left:optionLeft,width:optionWidth}}>
            <strong>{annex.route}</strong><p>{selectionSummary(annexScore)}</p><p>{pending?"Updating — showing previous assessment":failure?"Assessment failed — showing previous assessment":fundingStatus(allResults.find(r=>r.id===annex.route))}</p><small>All other funding conditions still apply.</small><div className="funding-actions"><button type="button" onClick={()=>onInspect(annex.route)}>Inspect funding option</button><button type="button" onClick={()=>graphPanel.current.scrollTo({top:0,behavior:"instant"})}>Back to funding options</button></div>
          </aside>}
          {visible.options.map((r,i)=><div key={r.id} data-option-id={r.id} data-graph-column="routes" className={`funding-graph-option ${workingOption===r.id?"is-working":""} ${inspected===r.id?"is-inspected":""} ${workingOption!==null&&workingOption!==r.id?"is-muted":""} ${changed.has(r.id) ? "funding-affected" : ""}`} style={{top:44+i*132,left:optionLeft,width:optionWidth}} title={`${r.id} · ${r.title}`} onClick={()=>choose(r.id)}>
            <button type="button" className="funding-option-open" aria-expanded={inspected===r.id}><strong>{r.id} · {r.title}</strong><span className={`funding-outcome-${fundingClass(r)}`}>{fundingStatus(r)}</span><small>{routeCoverage(conditions,r.id).fit?`${coverage(r.id).unresolved_count} unresolved conditions · Modelled eligibility checks`:routeCoverage(conditions,r.id).amount?"Amount calculations only":"Reference guide only"}</small><Changed change={changed.get(r.id)}/></button>
            <FundingWorkingOption id={r.id} checked={workingOption===r.id} onChange={onWork} group="funding-working-graph" compact/>
          </div>)}
          {!questions.length&&<p className="funding-no-connections" style={{left:circumstanceLeft,width:circumstanceWidth,top:layout.metHeaderTop===null?58:layout.metHeaderTop+80}}>{programmeState.value===null?"Programme metadata is loading or unavailable. Use Retry programme list in the Programme column.":programme===null?"Choose a programme node.":workingOption===null&&!comparing?"Choose a funding route on the right.":routeScope!==null&&routeScope.all.length>0?"All displayed requirements are met. Expand Requirements met to inspect them.":workingOption!==null&&routeCoverage(conditions,workingOption).amount?"Amount calculations are available. Open Show amount questions to supply the inputs; no eligibility questionnaire is modelled.":"Reference guide only: read the programme and route descriptions. No automated eligibility questionnaire or score is available."}</p>}
        </div></div><FundingContinuationMarkers markers={continuations} onReveal={view.reveal} hiddenLeft={view.scroll.left>1} hiddenRight={view.scroll.left+columns.viewportWidth<diagramWidth-1}/></div><button type="button" className="funding-node-height-toggle" aria-expanded={nodesExpanded} aria-label={nodesExpanded?"Collapse node area completely":"Expand node area completely"} onClick={toggleNodeHeight}><span aria-hidden="true">{nodesExpanded?"▴":"▾"}</span> {nodesExpanded?"Collapse node area":"Expand node area completely"}</button></div>
        {programme!==null&&visible.options.length===0 && <p>No options in this scope. Adjust the browsing filters, choose another family or leave shortlist focus.</p>}
        {guideProgramme===undefined?<div role="alert"><p>The requested programme guide is absent from this reference edition. Close the guide and retry the programme list.</p><button type="button" onClick={onCloseProgrammeGuide}>Close programme guide</button><button type="button" onClick={programmeState.retry}>Retry programme list</button></div>:guideProgramme!==null&&<FundingProgrammeGuide programme={guideProgramme} workingProgramme={programme} onClose={onCloseProgrammeGuide}/>}
        {option && <><h3>Inspecting {option.id}</h3>{!visible.options.some(r=>r.id===option.id) && <p>This option is outside the displayed family/page or current filters. Its assessment is still available below.</p>}{details(option)}</>}
      </>}
    </div>
  </aside>;
}
