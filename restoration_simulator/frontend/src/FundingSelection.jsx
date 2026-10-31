import React,{useState} from "react";
import {DocumentLink} from "./DocumentLink.jsx";
import {selectionChoices,selectionSummary,setSelectionChoice,clearSelectionRow} from "./fundingSelectionState.js";

export function SelectionSources({sources}){
  return <ul className="funding-sources">{sources.map((s,i)=><li key={i}><DocumentLink documentId={s.document_id} page={s.page} expectedSha256={s.sha256}>{s.label}</DocumentLink><small> · {s.role}</small></li>)}</ul>;
}
export function SelectionRoute({routes,route,onRoute,disabled}){
  return <label>AL20 assessment route<select aria-label="AL20 assessment route" value={route===null?"":route} disabled={disabled} onChange={e=>onRoute(e.target.value===""?null:e.target.value)}><option value="">Choose a funding route</option>{Object.keys(routes).map(id=><option key={id} value={id}>{id}</option>)}</select></label>;
}
function SelectionGuidance({text}){
  return text.split("\n\n").map((paragraph,index)=><p key={index}>{paragraph.split(/(https:\/\/[^\s]+)/g).map((part,i)=>part.startsWith("https://")?<DocumentLink key={i} href={part} target="_blank" rel="noreferrer">{part}</DocumentLink>:part)}</p>);
}
export function FundingSelectionEditor({route,criterion,row,result,onChange,disabled,focusChoice}){
  const [error,setError]=useState("");
  const choices=selectionChoices(criterion,route);
  const radio=criterion.method==="sum"&&criterion.exclusive_groups.some(g=>g.length===choices.length&&choices.every(c=>g.includes(c.id)));
  function update(next){setError("");onChange(next);}
  function choose(id,value){try{update(setSelectionChoice(row,criterion,id,value));}catch(e){setError(e.message);}}
  function numeric(key,value){
    if(value!==""&&(!Number.isFinite(Number(value))||Number(value)<0)){setError("Enter a finite nonnegative value.");return;}
    update({...row,inputs:{...row.inputs,[key]:value===""?null:Number(value)}});
  }
  return <div className="funding-selection-editor">
    <p className="eyebrow">{route} · Self-assessed</p><h3>{criterion.id} · {criterion.label}</h3>
    <SelectionGuidance text={criterion.guidance}/><p>Criterion subtotal: {result.subtotal} / {result.cap} points{result.complete?" · Complete":" · Incomplete"}{result.uncapped>result.cap?` · Uncapped selections: ${result.uncapped}`:""}</p>
    {criterion.limitations.map(text=><p className="reason" key={text}>{text}</p>)}
    <SelectionSources sources={criterion.sources}/>
    {error&&<p role="alert">{error}</p>}
    {criterion.method==="ratio"?<fieldset disabled={disabled}><legend>Grant per qualifying quality job</legend><label>Explicit grant amount (€)<input type="number" min="0" max="1000000000000" step="any" value={row.inputs.grant===null?"":row.inputs.grant} onChange={e=>numeric("grant",e.target.value)}/></label><label>Qualifying quality jobs (one year / 1 UTA each)<input type="number" min="0" max="1000000000000" step="1" value={row.inputs.quality_jobs===null?"":row.inputs.quality_jobs} onChange={e=>numeric("quality_jobs",e.target.value)}/></label><p>Use zero jobs to explicitly record that no quality jobs are claimed. The backend selects the applicable strict ratio band.</p>{choices.map(c=><p key={c.id}>{c.id} · {c.label} · {c.points} points</p>)}</fieldset>:
      <fieldset disabled={disabled}><legend>{radio?"Choose one alternative":"Select, reject or leave each subcriterion unanswered"}</legend>
      {choices.map(c=><div className="funding-selection-choice" key={c.id}>
        <label htmlFor={`al20-${c.id}`}>{c.id} · {c.label} <strong>({c.points} points)</strong></label>
        {radio?<input id={`al20-${c.id}`} type="radio" name={`al20-${route}-${criterion.id}`} checked={row.answers[c.id]===true} autoFocus={focusChoice===c.id} onChange={()=>update({...row,answers:Object.fromEntries(choices.map(x=>[x.id,x.id===c.id]))})}/>:
          <select id={`al20-${c.id}`} value={row.answers[c.id]===null?"unknown":row.answers[c.id]?"yes":"no"} autoFocus={focusChoice===c.id} onChange={e=>choose(c.id,e.target.value==="unknown"?null:e.target.value==="yes")}><option value="unknown">Unanswered</option><option value="yes">Selected</option><option value="no">Does not apply</option></select>}
        <small>{c.character.replaceAll("_"," ")}{criterion.requires[c.id]?` · Requires ${criterion.requires[c.id].join(", ")}`:""}</small>
        <details><summary>Spanish wording and sources</summary><p lang="es">{c.printed_code} · {c.label_es}</p><SelectionSources sources={c.sources}/></details>
      </div>)}
      {criterion.method==="employment"&&<label>Selected jobs meet the minimum one-year / 1 UTA conditions<select aria-label="Employment duration and UTA confirmation" value={row.inputs.qualifying_uta===null?"unknown":row.inputs.qualifying_uta?"yes":"no"} onChange={e=>update({...row,inputs:{qualifying_uta:e.target.value==="unknown"?null:e.target.value==="yes"}})}><option value="unknown">Not confirmed</option><option value="yes">Confirmed for this self-assessment</option><option value="no">Does not meet the documented conditions</option></select></label>}
    </fieldset>}
    <div className="funding-actions"><button type="button" disabled={disabled} onClick={()=>update(clearSelectionRow(row,false))}>None of these applies</button><button type="button" disabled={disabled} onClick={()=>update(clearSelectionRow(row,null))}>Reset selections to unanswered</button></div>
    {result.issues.map(issue=><p role="status" key={issue}>{issue}</p>)}
    <label htmlFor="al20-supporting-reference">Supporting reference (optional)</label><input id="al20-supporting-reference" maxLength={2000} value={row.reference} disabled={disabled} onChange={e=>update({...row,reference:e.target.value})}/>
    <label htmlFor="al20-assessment-notes">Assessment notes (optional)</label><textarea id="al20-assessment-notes" maxLength={4000} value={row.notes} disabled={disabled} onChange={e=>update({...row,notes:e.target.value})}/>
    <details><summary>Original criterion wording</summary><p lang="es">{criterion.label_es}</p></details>
  </div>;
}

export function FundingSelectionBranch({rows,left,width,route,routes,score,answers,onRoute,onGroup,onCriterion,onCollapse,disabled}){
  return rows.map(r=>{
    const position={top:r.top,left:left+(r.kind==="choice"||r.kind==="calculation"?24:r.kind==="group"?12:0),width:width-(r.kind==="choice"||r.kind==="calculation"?24:r.kind==="group"?12:0),height:r.height};
    if(r.kind==="route")return <div key="route" className="funding-annex-route" style={position}><SelectionRoute routes={routes} route={route} onRoute={onRoute} disabled={disabled}/><button type="button" onClick={onCollapse}>Collapse annex</button></div>;
    if(r.kind==="total")return <div key="total" className={`funding-annex-total funding-node-${score.result}`} style={position}><strong>{selectionSummary(score)}</strong><small>Threshold: {score.threshold} points · {route}</small></div>;
    const result=score.criteria.find(c=>c.id===r.criterion.id);
    if(!result)throw Error("The AL20 criterion result is missing. Retry assessment.");
    const choice=r.kind==="choice"?r.choice:null;
    const value=choice===null?null:answers.criteria[r.criterion.id].answers[choice.id];
    const status=choice!==null?(value===null?"unknown":value?"pass":"neutral"):result.complete?(result.subtotal>0?"pass":"neutral"):"unknown";
    return <button type="button" key={`${r.kind}-${choice?choice.id:r.criterion.id}`} data-annex-criterion={r.criterion.id} data-annex-choice={choice?choice.id:undefined}
      className={`funding-annex-node funding-annex-${r.kind} funding-node-${status}`} style={position} title={choice?choice.label:r.kind==="group"?`${r.criterion.label}\n\n${r.criterion.guidance}`:r.criterion.label}
      aria-expanded={r.kind==="group"?rows.some(x=>x.criterion?.id===r.criterion.id&&x.kind!=="group"):undefined}
      aria-haspopup={r.kind==="group"?undefined:"dialog"} onClick={e=>r.kind==="group"?onGroup(r.criterion.id):onCriterion(r.criterion.id,e.currentTarget,choice===null?null:choice.id)}>
      <strong>{choice?`${choice.id} · ${choice.label}`:r.kind==="calculation"?"Enter grant and qualifying jobs":`${r.criterion.id} · ${r.criterion.label}`}</strong>
      <span>{choice?`${value===null?"? Unanswered":value?"✓ Selected":"− Does not apply"} · ${choice.points} points`:`${result.subtotal} / ${result.cap} points · ${result.complete?"Complete":"Incomplete"}`}</span>
    </button>;
  });
}
