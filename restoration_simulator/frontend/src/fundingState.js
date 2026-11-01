import {edlHasEvidence} from "./fundingEdlState.js";
export const FUNDING_STEPS = ["Explore and score", "Project overview", "Activities and delivery", "Budget and review"];
// Opening a context resumes its draft; changing context needs an explicit choice
// so that the next autosave cannot overwrite unrelated work.
export function fundingEntryAction(draft,entry){
  const target=entry?.target;
  if(target!==undefined&&!["activity","demonstrator","business"].includes(target))throw Error("Unsupported funding entry context.");
  if(draft===null)return "create";
  if(target===undefined)return "resume";
  const parcelIds=entry.parcelId===undefined?[]:[entry.parcelId];
  if(parcelIds.some(id=>typeof id!=="string"||!id))throw Error("The funding entry parcel is invalid.");
  const captured=draft.baseline.parcel_ids;
  if(!Array.isArray(captured))throw Error("The saved funding context is incomplete. Reload the project and review the saved exploration.");
  return draft.baseline.target===target&&captured.length===parcelIds.length&&captured.every(id=>parcelIds.includes(id))?"resume":"review";
}
export function fundingSaveIsCurrent(savedDraft,currentDraft){
  return JSON.stringify(savedDraft)===JSON.stringify(currentDraft);
}
export function effectiveFacts(draft) { return {...draft.baseline.facts, ...draft.overrides}; }
export function assumptionCount(draft){
  const scoring=draft.version===4?Object.values(draft.selection_assessments).filter(a=>Object.values(a.criteria).some(row=>Object.values(row.answers).some(v=>v!==null)||Object.values(row.inputs).some(v=>v!==null)||edlHasEvidence(row))).length:0;
  return Object.keys(draft.overrides).length+([3,4].includes(draft.version)&&draft.applicant_choice!==null?1:0)+scoring;
}
export function explicitlyUnknown(question){return question.overridden&&(question.type==="applicant"?question.current_value.kind==="unknown":question.current_value===null);}
export function overrideAnswer(draft, field, value) {
  if(field==="selection_score"&&draft.version===4)throw Error("Open the AL20 annex to edit selections; manual totals are not supported.");
  if(field==="applicant_choice")return {...draft,applicant_choice:value};
  if([3,4].includes(draft.version)&&["applicant_id","applicant_kind"].includes(field))throw Error("Choose the applicant as one complete choice.");
  return {...draft, overrides: {...draft.overrides, [field]: value}};
}
export function resetAnswer(draft, field) {
  if(field==="applicant_choice")return {...draft,applicant_choice:null};
  const overrides = {...draft.overrides}; delete overrides[field]; return {...draft, overrides};
}
export function logicalQuestionId(id){return ["applicant_id","applicant_kind"].includes(id)?"applicant_choice":id;}
export function applicantKey(choice){
  if(choice===null)return "";
  if(choice.kind==="recorded")return `recorded:${choice.party_id}`;
  if(["planned","potential"].includes(choice.kind))return `${choice.kind}:${choice.legal_form===null?"":choice.legal_form}`;
  if(choice.kind==="unknown")return "unknown";
  throw Error("Unsupported applicant choice.");
}
export function presentQuestion(q,draft){
  if(![3,4].includes(draft.version))return q;
  if(q.type==="selection"){
    const pending=JSON.stringify(draft.selection_assessments)!==JSON.stringify(q.current_value);
    return {...q,current_value:draft.selection_assessments,display_value:pending?"Updating self-assessment…":q.display_value,origin:pending?"Updating annex selections…":q.origin};
  }
  const applicant=q.id==="applicant_choice";
  const overridden=applicant?draft.applicant_choice!==null:Object.hasOwn(draft.overrides,q.id);
  const value=applicant?(draft.applicant_choice===null?q.initial_value:draft.applicant_choice):(overridden?draft.overrides[q.id]:draft.baseline.facts[q.id]);
  let display;
  if(applicant){
    if(value.kind!=="recorded"){
      if(value.kind==="unknown"||value.legal_form===null)display="Not entered";
      else{if(!Array.isArray(q.forms))throw Error("Applicant type options are missing. Restart Python and reload project context.");const form=q.forms.find(([id])=>id===value.legal_form);if(form===undefined)throw Error("The selected applicant type is missing from this version.");display=`Applicant type · ${form[1]}`;}
    }else{
    const match=q.options.find(o=>applicantKey(o.choice)===applicantKey(value));
    if(match)display=match.label;
    else throw Error("Applicant option is missing from the question model.");
    }
  }else display=answerLabel(q,value,draft.baseline.parties);
  const unknown=applicant?value.kind==="unknown"||value.kind==="potential"&&value.legal_form===null:value===null||q.id==="municipality"&&value==="unknown";
  const pending=JSON.stringify(value)!==JSON.stringify(q.current_value)||overridden!==q.overridden;
  return {...q,assessed_value:q.current_value,current_value:value,display_value:unknown&&!applicant?"Unknown / not decided":display,unknown,overridden,origin:pending?"Updating answer…":q.origin};
}
export const FUNDING_HELP = {
  matches:"The inputs in this version meet the modelled requirements. Official rules and call availability are available in the source information.",
  needs_answers:"Add the inputs listed for this route to calculate its result. Original values and their sources remain in Project context.",
  unimplemented:"Explore the introduction, practical examples, limitations and sources for this option. Automated assessment is unavailable; completing more questions cannot resolve this. Eligibility and financial terms need separate verification.",
  conflicts:"At least one requirement needs a change in this version. Open the route to see the relevant inputs.",
  fit_changes:"Options whose overall assessment changed since the previous successful assessment, for example from needing answers to meeting the modelled conditions.",
  resolved:"Previously unknown conditions now have a definite result: satisfied or conflicting. Resolved does not necessarily mean eligible. Other unknowns can leave the overall fit unchanged.",
  amount_changes:"Conditional funding estimates or previewed payment schedules changed, for example through a bonus or an eligible-cost answer. These are not awards or received cash. An amount condition can change without changing the estimate when a cap applies.",
};
export function statusLabel(status) {
  const labels={"Needs information":"Needs your answers","Does not match these facts":"Conflicts with current scenario","Possible match — eligibility unverified":"Modelled requirements met"};
  if(!Object.hasOwn(labels,status))throw Error(`Unsupported funding status: ${status}`);
  return labels[status];
}
export function fundingClass(result) {
  if(!Array.isArray(result.checks)||!result.checks.length)throw Error("Funding requirements are missing. Reload the app and backend.");
  if(result.checks.every(c=>c.field===null))return "unimplemented";
  if(result.status==="Needs information")return "needs_answers";
  if(result.status==="Does not match these facts")return "conflicts";
  if(result.status==="Possible match — eligibility unverified")return "matches";
  throw Error(`Unsupported funding status: ${result.status}`);
}
export function fundingStatus(result) {
  return fundingClass(result)==="unimplemented" ? "Explore this option" : statusLabel(result.status);
}
export function fundingCounts(results) {
  const counts={matches:0,needs_answers:0,conflicts:0,unimplemented:0};
  for(const r of results)counts[fundingClass(r)]++;
  return counts;
}
export function fundingResults(results, {query = "", group = "", requireChanges = false}) {
  const text = query.trim().toLowerCase();
  return results.filter(r => (!group || r.group === group) && (requireChanges || r.status !== "Does not match these facts") && (!text || `${r.id} ${r.title} ${r.description}`.toLowerCase().includes(text)));
}
export function answerLabel(question, value, parties) {
  if (value === null) return "Unknown / not yet recorded";
  if (question.type === "choice") return question.options.find(([id]) => id === value)?.[1] ?? String(value);
  if (question.type === "party") return parties.find(p => p.id === value)?.name ?? String(value);
  return String(value);
}

export function fundingLanding(draft){return Object.hasOwn(draft,"navigator_focus")&&draft.navigator_focus.programme_id!==null&&draft.navigator_focus.route_id!==null?1:0;}
