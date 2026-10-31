// Presentation-only comparisons of accepted Python results. No eligibility math.
export const initialFundingVisual = {context:null, token:null, inputKey:null, status:"idle", value:null, changes:null, latestFields:[], error:""};

export function assessmentChanges(previous, next) {
  if (previous === null) return null;
  const beforeQuestions=new Map(previous.input_context.questions.map(q=>[q.id,q]));
  const fields=next.input_context.questions.filter(q=>JSON.stringify(beforeQuestions.get(q.id)?.current_value)!==JSON.stringify(q.current_value)).map(q=>q.id);
  const oldConditions = new Map(previous.visualisation.conditions.map(c => [c.id,c]));
  const nextIds=new Set(next.visualisation.conditions.map(c=>c.id));
  const changedConditions = next.visualisation.conditions.filter(c => {
    const before = oldConditions.get(c.id);
    return !before || before.result !== c.result || before.value !== c.value || before.message !== c.message;
  }).map(c => ({...c, before_result:oldConditions.get(c.id)?.result ?? null, before_value:oldConditions.get(c.id)?.value ?? null,resolved:oldConditions.get(c.id)?.result === "unknown" && c.result !== "unknown"}));
  const removed=previous.visualisation.conditions.filter(c=>!nextIds.has(c.id)).map(c=>({...c,removed:true,before_result:c.result,before_value:c.value,resolved:false}));
  changedConditions.push(...removed);
  const affectedConditions=[...next.visualisation.conditions.filter(c=>c.fields.some(f=>fields.includes(f))).map(c=>({...c,before_result:oldConditions.get(c.id)?.result ?? null,before_value:oldConditions.get(c.id)?.value ?? null})),...removed];
  const oldOptions = new Map(previous.assessment.results.map(r => [r.id,r]));
  const options = next.assessment.results.flatMap(r => {
    const before = oldOptions.get(r.id);
    if (!before) return [];
    const conditions = changedConditions.filter(c => c.option_id === r.id);
    const affected=affectedConditions.filter(c=>c.option_id===r.id);
    const fit = before.status !== r.status;
    const amount = before.finance.estimate !== r.finance.estimate || JSON.stringify(before.finance.schedule) !== JSON.stringify(r.finance.schedule);
    const scope = before.relevant !== r.relevant;
    return fit || amount || scope || conditions.length || affected.length || fields.includes("activity") ? [{id:r.id,fit,amount,scope,conditions,affected,before:before.status,after:r.status,previousAmount:before.finance.estimate,nextAmount:r.finance.estimate}] : [];
  });
  const answers=fields.map(id=>({id,label:next.input_context.questions.find(q=>q.id===id).label,before:beforeQuestions.get(id)?.display_value ?? "Not previously specified",after:next.input_context.questions.find(q=>q.id===id).display_value}));
  return {fields,answers,conditions:changedConditions,options,applicantFormBefore:previous.assessment.facts.applicant_kind,applicantFormAfter:next.assessment.facts.applicant_kind};
}

export function fundingVisualReducer(state, event) {
  if (event.type === "reset") return initialFundingVisual;
  if (event.type === "start") return {...initialFundingVisual, context:event.context,token:event.token,inputKey:event.inputKey,status:"pending",value:state.context === event.context ? state.value : null,changes:state.context === event.context ? state.changes : null,latestFields:state.context === event.context ? state.latestFields : []};
  if (!["success","error"].includes(event.type)) throw Error(`Unknown funding visual event: ${event.type}`);
  if (state.token !== event.token || state.context !== event.context) return state;
  if (event.type === "error") return {...state,status:"error",error:event.error};
  const changes=assessmentChanges(state.value,event.value);
  return {...state,status:"success",error:"",value:event.value,changes:changes?.fields.length?changes:state.changes,latestFields:changes?.fields.length ? changes.fields : state.latestFields};
}

export function visualScope(results, {group,shortlistOnly,selected,page, pageSize=12,expanded=false}) {
  const scoped = results.filter(r => shortlistOnly ? selected.includes(r.id) : r.group === group);
  return {options:expanded ? scoped : scoped.slice(page*pageSize,(page+1)*pageSize), count:scoped.length, pages:Math.max(1,Math.ceil(scoped.length/pageSize))};
}

export function graphQuestions(questions,conditions,scopeIds,{focus,currentField,showAmount}){
  if(focus)return questions.filter(q=>q.id===currentField);
  const inScope=new Set(scopeIds),fit=new Set(),amount=new Set();
  for(const c of conditions){if(inScope.has(c.option_id))for(const id of c.fields)(c.effect==="eligibility"?fit:amount).add(id);}
  return [...questions.filter(q=>fit.has(q.id)),...questions.filter(q=>showAmount&&!fit.has(q.id)&&amount.has(q.id))];
}

export function conditionText(c) {
  if (c.effect === "amount") return c.result === "unknown" ? "? Amount unresolved" : c.result === "fail" ? "− No addition" : "✓ Amount condition supplied";
  return c.result === "unknown" ? "? Unresolved" : c.result === "fail" ? "× Conflicts" : "✓ Meets condition";
}

// Summarise authoritative condition results for display, never applicant facts.
// These are linked conditions, not an additional overall eligibility verdict.
export function graphLinkStatus(conditions){
  if(!conditions.length||conditions.some(c=>!["pass","unknown","fail"].includes(c.result)))throw Error("Invalid funding connection results.");
  return conditions.some(c=>c.result==="fail")?"fail":conditions.some(c=>c.result==="unknown")?"unknown":"pass";
}

export function graphAnswerStatus(field,conditions,scopeIds,{workingOption,showAmount}){
  const scope=new Set(workingOption===null?scopeIds:[workingOption]);
  const linked=conditions.filter(c=>scope.has(c.option_id)&&c.fields.includes(field));
  const fit=linked.filter(c=>c.effect==="eligibility"),amount=linked.filter(c=>c.effect==="amount");
  const effect=fit.length?"eligibility":showAmount&&amount.length?"amount":null;
  const checks=effect==="eligibility"?fit:effect==="amount"?amount:[];
  const groups=new Map();
  for(const check of checks){if(!groups.has(check.option_id))groups.set(check.option_id,[]);groups.get(check.option_id).push(check);}
  const connections=[...groups].map(([id,checks])=>({id,status:graphLinkStatus(checks)}));
  const counts={pass:0,unknown:0,fail:0};for(const c of connections)counts[c.status]++;
  const states=Object.keys(counts).filter(key=>counts[key]>0),status=states.length>1?"mixed":states.length===1?states[0]:"neutral";
  const labels=effect==="amount"?{pass:"✓ Amount input supplied",unknown:"? Amount unresolved",fail:"− No addition",mixed:"Mixed amount conditions",neutral:"No modelled amount condition"}:{pass:"✓ Linked conditions met",unknown:"? Linked conditions unresolved",fail:"× Linked condition conflicts",mixed:"Mixed across programmes",neutral:"No modelled condition"};
  const label=labels[status];
  const detail=connections.length?connections.map(c=>`${c.id}: ${labels[c.status]}`).join("; "):"No modelled condition in this scope. This is not an eligibility conclusion.";
  return {status,effect,counts,label,detail};
}
