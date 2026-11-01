import React,{useEffect,useRef,useState} from "react";
import {Alert} from "./Alert.jsx";
import {proposeSelectionChoice} from "./fundingSelectionState.js";

// One atomic selection interaction, shared by the overview and graph editors.
export function ScoringChoice({row,criterion,item,onChange,disabled,onPending,onApplied,inputId}){
 const [proposal,setProposal]=useState(null),[error,setError]=useState("");
 const warning=useRef(null),answer=useRef(null);
 const snapshot=()=>JSON.stringify({answers:row.answers,inputs:row.inputs});
 useEffect(()=>{if(proposal!==null){warning.current.scrollIntoView({block:"nearest"});warning.current.focus({preventScroll:true});}},[proposal]);
 useEffect(()=>()=>{if(onPending)onPending(false);},[]);
 function pending(value){setProposal(value);if(onPending)onPending(value!==null);}
 function apply(next){onChange({...row,answers:next.answers});if(onApplied)onApplied();}
 function choose(value){try{setError("");const next=proposeSelectionChoice(row,criterion,item.id,value);if(next.related.length)pending({...next,value,before:{...row.answers},input:snapshot()});else{pending(null);apply(next.row);}}catch(e){setError(e.message);}}
 function finish(accept){if(accept){if(snapshot()!==proposal.input){setError("Related selections or inputs changed. Your notes are retained; select the item again.");pending(null);answer.current.focus();return;}apply(proposal.row);}pending(null);requestAnimationFrame(()=>{if(answer.current?.isConnected)answer.current.focus();});}
 const label=value=>value===true?"Selected":"Not selected";
 return <div className="scoring-choice-control">{proposal!==null&&<div ref={warning} role="group" aria-label="Related scoring changes" tabIndex={-1} className="funding-answer-proposal"><Alert variant={proposal.related.some(id=>proposal.before[id]===true&&proposal.row.answers[id]!==true)?"danger":"warning"} title="Confirmation needed" announce={false}><p>{item.id} · {item.label}: {label(proposal.before[item.id])} → {label(proposal.value)} — awaiting confirmation.</p><ul>{proposal.related.map(id=><li key={id}>{id} · {criterion.choices.find(c=>c.id===id).label}: {label(proposal.before[id])} → {label(proposal.row.answers[id])}</li>)}</ul><p>Points and saved selections change only after confirmation. Closing cancels this proposal.</p><button type="button" disabled={disabled} onClick={()=>finish(true)}>Confirm selection and related changes</button><button type="button" disabled={disabled} onClick={()=>finish(false)}>Keep current answers</button></Alert></div>}
 <label className="funding-pick"><input ref={answer} id={inputId} type="checkbox" aria-label={`Selected ${item.id}`} checked={proposal===null?row.answers[item.id]===true:proposal.value} disabled={disabled} onChange={e=>choose(e.target.checked)}/>{proposal!==null?"Awaiting confirmation":row.answers[item.id]===true?"Selected":"Not selected"}</label>{error&&<p role="alert">{error}</p>}</div>;
}
