import React, {useEffect, useState} from "react";
import {answerLabel} from "./fundingState.js";
import {conditionText, visualScope} from "./fundingVisualState.js";
import {money} from "./format.js";
import {DocumentLink} from "./DocumentLink.jsx";

function Evidence({sources}) {
  return <ul className="funding-sources">{sources.map((s,i)=><li key={i}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink></li>)}</ul>;
}
function Changed({change}) {
  if (!change) return null;
  return <span className="funding-change-label">{[change.fit && "Fit changed",change.conditions.some(c=>c.resolved) && "Condition resolved",change.amount && "Conditional amount changed",change.scope && "Activity relevance changed",!change.fit && !change.amount && !change.scope && change.conditions.length>0 && "Condition changed"].filter(Boolean).join(" · ")}</span>;
}

export function FundingVisualisation({value,changes,latestFields,pending,failure,onRetry,results,catalogue,draft,currentField,onQuestion,inspected,onInspect,renderOption}) {
  const [view,setView]=useState("graph"), [family,setFamily]=useState(Object.keys(catalogue.groups)[0]);
  const [page,setPage]=useState(0), [shortlistOnly,setShortlistOnly]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const model=value?.visualisation;
  const allResults=value?.assessment.results ?? [];
  const facts=value?.assessment.facts;
  const changed=new Map((changes?.options ?? []).map(c=>[c.id,c]));
  const scope=visualScope(results,{group:family,shortlistOnly,selected:draft.selected,page});
  // Filters may shorten a page. Clamp the display without changing catalogue order.
  const displayedPage=Math.min(page,scope.pages-1);
  const visible=displayedPage===page ? scope : visualScope(results,{group:family,shortlistOnly,selected:draft.selected,page:displayedPage});
  const option=allResults.find(r=>r.id===inspected);
  useEffect(()=>{
    if(!inspected) return;
    const r=results.find(r=>r.id===inspected);
    if(!r) return; // Inspection remains available outside explicitly chosen filters.
    const rows=results.filter(x=>shortlistOnly ? draft.selected.includes(x.id) : x.group===r.group);
    if(!shortlistOnly)setFamily(r.group);
    const index=rows.findIndex(x=>x.id===inspected);
    if(index>=0)setPage(Math.floor(index/12));
  },[inspected]);
  const conditions=model?.conditions ?? [];
  const requirements=conditions.filter(c=>c.option_id===inspected);
  const fields=new Set(inspected ? requirements.flatMap(c=>c.fields) : currentField ? [currentField] : latestFields);
  const questions=catalogue.questions.filter(q=>fields.has(q.id));
  const diagramHeight=Math.max(1,questions.length,visible.options.length)*132+48;
  const coverage=id=>model.coverage.find(c=>c.option_id===id);
  const effects=id=>conditions.filter(c=>c.option_id===id && c.fields.some(f=>currentField ? f===currentField : latestFields.includes(f)));
  const effectText=id=>{
    const matches=effects(id);
    if (!matches.length) return coverage(id).requirements==="research_only" ? "Requirements not yet modelled" : currentField==="activity" ? (facts.activity===null ? "Activity unknown; scope not narrowed" : allResults.find(r=>r.id===id).relevant ? "Within activity scope" : "Outside activity scope") : "No modelled condition for this answer";
    return matches.map(c=>`${c.effect==="amount" ? "Amount" : "Fit"}: ${conditionText(c)}`).join(" · ");
  };
  function choose(id) {onInspect(inspected===id ? null : id);}
  function changedOption(c) {
    return <p key={c.id}><button type="button" onClick={()=>onInspect(c.id)}>{c.id}</button><Changed change={c}/>{c.fit && <span>{c.before} → {c.after}</span>}{c.amount && <strong> · {c.previousAmount===c.nextAmount ? "Milestone payment schedule changed" : `${money(c.previousAmount)} → ${money(c.nextAmount)}`}</strong>}</p>;
  }
  function details(r) {
    return <div className="funding-inspection" aria-label={`Requirements for ${r.id}`}>
      {renderOption(r)}
      <h4>Modelled requirement network</h4>
      {coverage(r.id).requirements==="research_only" ? <p>Requirements not yet modelled. This research entry has no modelled eligibility dependencies.</p> : conditions.filter(c=>c.option_id===r.id).map(c=><div key={c.id} className={`funding-check funding-check-${c.result} ${changes?.conditions.some(x=>x.id===c.id) ? "funding-affected" : ""}`}>
        <strong>{c.effect==="amount" ? "Amount condition" : "Fit condition"} · {conditionText(c)}</strong>
        <p>{c.message}</p>
        {c.effect==="amount" && c.value!==null && <p>Input / uncapped addition: {money(c.value)}. The overall conditional estimate remains subject to the assessment’s caps and conditions.</p>}
        <div>{c.fields.map(id=>{const q=catalogue.questions.find(q=>q.id===id);return <button type="button" key={id} onClick={()=>onQuestion(id)}>{q.label}: {answerLabel(q,facts[id],draft.baseline.parties)}</button>;})}</div>
        <Evidence sources={c.sources}/>
      </div>)}
    </div>;
  }
  return <aside className="panel funding-visual" aria-label="Live funding consequences">
    <h2>Funding possibilities</h2>
    <p className="funding-visual-status" role="status">{pending ? value ? "Updating—showing previous assessment" : "Updating funding assessment…" : failure ? value ? "Assessment failed—showing previous assessment" : "Assessment unavailable" : `${results.filter(r=>r.status.startsWith("Possible match")).length} possible matches · ${results.filter(r=>r.status==="Needs information").length} need information · ${results.filter(r=>r.status==="Does not match these facts").length} require changes`}</p>
    {failure && <div role="alert"><p>{failure}</p><button type="button" onClick={onRetry}>Retry assessment</button></div>}
    <div className="funding-change-summary" role="status" aria-live="polite" aria-atomic="true"><strong>What changed</strong>
      {changes===null ? <p>Answer a question to compare its consequences with this assessment.</p> : !changes.fields.length ? <p>No funding answers changed in this update.</p> : <><p>{changes.fields.map(id=>catalogue.questions.find(q=>q.id===id).label).join("; ")}</p><p>{changes.options.filter(c=>c.fit).length} fit changes · {changes.conditions.filter(c=>c.resolved).length} conditions resolved · {changes.options.filter(c=>c.amount).length} conditional amount changes</p>{changes.options.length===0 && <p>No modelled funding conditions changed. Unmodelled requirements still need verification.</p>}<div className="funding-change-preview">{changes.options.slice(0,2).map(changedOption)}</div>{changes.options.length>2 && <details><summary>Inspect remaining changed options ({changes.options.length-2})</summary>{changes.options.slice(2).map(changedOption)}</details>}</>}
    </div>
    <button type="button" className="funding-mobile-expand" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded ? "Collapse" : "Expand"} funding visual workspace</button>
    <div className={`funding-visual-body ${expanded ? "is-expanded" : ""}`}>
      <div className="funding-visual-toolbar" role="group" aria-label="Funding visual view"><button type="button" aria-pressed={view==="graph"} onClick={()=>setView("graph")}>Graph</button><button type="button" aria-pressed={view==="matrix"} onClick={()=>setView("matrix")}>Matrix</button><button type="button" aria-pressed={shortlistOnly} onClick={()=>{setShortlistOnly(v=>!v);setPage(0);}}>{shortlistOnly ? "Show family options" : `Focus shortlist (${draft.selected.length})`}</button></div>
      <label className="funding-family-chooser">Expanded funding family<select aria-label="Funding family" value={shortlistOnly ? "shortlist" : family} onChange={e=>{if(e.target.value==="shortlist"){setShortlistOnly(true);}else{setFamily(e.target.value);setShortlistOnly(false);}setPage(0);}}>{Object.entries(catalogue.groups).map(([id,label])=><option key={id} value={id}>{label} ({results.filter(r=>r.group===id).length} in scope / {catalogue.entries.filter(e=>e.group===id).length} total)</option>)}<option value="shortlist">Shortlist ({draft.selected.length})</option></select></label>
      <p>{results.length} in browsing scope · {catalogue.entries.length} catalogue entries. {shortlistOnly ? "Shortlist focus" : catalogue.groups[family]} · Page {displayedPage+1} of {scope.pages} · {scope.count} options</p>
      <div className="funding-actions"><button type="button" disabled={displayedPage===0} onClick={()=>setPage(displayedPage-1)}>Previous options</button><button type="button" disabled={displayedPage>=scope.pages-1} onClick={()=>setPage(displayedPage+1)}>Next options</button>{inspected && <button type="button" onClick={()=>onInspect(null)}>Clear inspection</button>}</div>
      {value && <><p className="funding-network-explanation">All applicable requirements must be satisfied. A single connection does not establish eligibility. ✓ Meets · × Conflicts · ? Unresolved. Amount connections affect the conditional estimate; call availability is separate. Neutral scope connections describe activity browsing only.</p>
        {view==="graph" ? <div className="funding-diagram-scroll" tabIndex={0} aria-label="Funding graph, scroll to explore"><div className="funding-diagram" style={{width:800,height:diagramHeight}}>
          <div className="funding-layer-label" style={{left:12}}>Exploration</div><div className="funding-layer-label" style={{left:190}}>Circumstances / answers</div><div className="funding-layer-label" style={{left:510}}>Funding options</div>
          <svg aria-hidden="true" width="800" height={diagramHeight}>
            {questions.map((q,i)=><path key={`root-${q.id}`} className="funding-edge-neutral" d={`M 162 92 C 176 92,176 ${92+i*132},190 ${92+i*132}`}/>)}
            {visible.options.flatMap((r,j)=>questions.flatMap((q,i)=>{
              const links=conditions.filter(c=>c.option_id===r.id && c.fields.includes(q.id) && (!inspected || inspected===r.id));
              if(!inspected && coverage(r.id).scope_fields.includes(q.id)) return <g key={`${q.id}-${r.id}-scope`}><title>{q.label} → {r.id}: Activity browsing scope only; no eligibility conclusion</title><path className="funding-edge-neutral" d={`M 410 ${92+i*132} C 460 ${92+i*132},460 ${92+j*132},510 ${92+j*132}`}/><text x={453} y={84+j*132}>scope</text></g>;
              if(!links.length) return [];
              const fail=links.some(c=>c.result==="fail"), unknown=links.some(c=>c.result==="unknown");
              const status=fail ? "fail" : unknown ? "unknown" : "pass";
              const kind=links.every(c=>c.effect==="amount") ? "amount" : links.some(c=>c.effect==="amount") ? "fit + amount" : "fit";
              return <g key={`${q.id}-${r.id}`}><title>{q.label} → {r.id}: {links.map(conditionText).join("; ")}</title><path className={`funding-edge-${status} ${kind==="amount" ? "funding-edge-amount" : ""}`} d={`M 410 ${92+i*132} C 460 ${92+i*132},460 ${92+j*132},510 ${92+j*132}`}/><text x={inspected||questions.length>1 ? 418 : 453} y={(inspected||questions.length>1 ? 92+i*132 : 92+j*132)-8}>{kind} {fail ? "×" : unknown ? "?" : "✓"}</text></g>;
            }))}
          </svg>
          <div className="funding-graph-origin" style={{top:44,left:12,width:150}}><strong>{draft.name}</strong><small>{pending||failure ? "Previous assessed answers" : "Assessed answers"}</small></div>
          {questions.map((q,i)=><button type="button" key={q.id} className={`funding-circumstance ${changes?.fields.includes(q.id) ? "funding-affected" : ""}`} style={{top:44+i*132,left:190,width:220}} title={q.label} onClick={()=>onQuestion(q.id)}><strong>{q.label}</strong><span>{answerLabel(q,facts[q.id],draft.baseline.parties)}</span><small>{Object.hasOwn(value.assessment.draft.overrides,q.id) ? "Assumed" : facts[q.id]===null ? "Unknown" : "Recorded"}</small></button>)}
          {visible.options.map((r,i)=><button type="button" key={r.id} data-option-id={r.id} className={`funding-graph-option ${changed.has(r.id) ? "funding-affected" : ""}`} style={{top:44+i*132,left:510,width:274}} aria-pressed={inspected===r.id} title={`${r.id} · ${r.title}`} onClick={()=>choose(r.id)}><strong>{r.id} · {r.title}</strong><span>{r.status}</span><small>{coverage(r.id).requirements==="research_only" ? "Requirements not yet modelled" : `${coverage(r.id).unresolved_count} unresolved conditions`}</small><Changed change={changed.get(r.id)}/></button>)}
          {!questions.length && <p className="funding-no-connections">Choose a question or inspect an option to see its modelled dependencies.</p>}
        </div></div> : <div className="funding-table funding-matrix" tabIndex={0} aria-label="Funding matrix, scroll to explore"><table><caption>Funding options · {shortlistOnly ? "Shortlist" : catalogue.groups[family]}</caption><thead><tr><th>Funding option</th><th>Overall fit</th><th>Current / latest answer</th><th>Unresolved conditions</th><th>Call availability</th></tr></thead><tbody>{visible.options.map(r=><React.Fragment key={r.id}><tr data-option-id={r.id} className={changed.has(r.id) ? "funding-affected" : ""}><th scope="row"><button type="button" onClick={()=>choose(r.id)} aria-expanded={inspected===r.id}>{r.id} · {r.title}</button></th><td>{r.status}<Changed change={changed.get(r.id)}/></td><td>{effectText(r.id)}</td><td>{coverage(r.id).requirements==="research_only" ? "Not modelled" : coverage(r.id).unresolved_count}</td><td>{r.availability}</td></tr>{inspected===r.id && <tr><td colSpan={5}>{details(r)}</td></tr>}</React.Fragment>)}</tbody></table></div>}
        {visible.options.length===0 && <p>No options in this scope. Adjust the browsing filters, choose another family or leave shortlist focus.</p>}
        {option && (view==="graph" || !visible.options.some(r=>r.id===option.id)) && <><h3>Inspecting {option.id}</h3>{!visible.options.some(r=>r.id===option.id) && <p>This option is outside the displayed family/page or current filters. Its assessment is still available below.</p>}{details(option)}</>}
      </>}
    </div>
  </aside>;
}
