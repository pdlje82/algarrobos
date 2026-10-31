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
