// Presentation-only comparisons of accepted Python results. No eligibility math.
export const initialFundingVisual = {context:null, token:null, inputKey:null, status:"idle", value:null, changes:null, latestFields:[], error:""};

export function assessmentChanges(previous, next) {
  if (previous === null) return null;
  const fields = Object.keys(next.assessment.facts).filter(k => previous.assessment.facts[k] !== next.assessment.facts[k]);
  const oldConditions = new Map(previous.visualisation.conditions.map(c => [c.id,c]));
  const changedConditions = next.visualisation.conditions.filter(c => {
    const before = oldConditions.get(c.id);
    return !before || before.result !== c.result || before.value !== c.value || before.message !== c.message;
  }).map(c => ({...c, resolved:oldConditions.get(c.id)?.result === "unknown" && c.result !== "unknown"}));
  const oldOptions = new Map(previous.assessment.results.map(r => [r.id,r]));
  const options = next.assessment.results.flatMap(r => {
    const before = oldOptions.get(r.id);
    if (!before) return [];
    const conditions = changedConditions.filter(c => c.option_id === r.id);
    const fit = before.status !== r.status;
    const amount = before.finance.estimate !== r.finance.estimate || JSON.stringify(before.finance.schedule) !== JSON.stringify(r.finance.schedule);
    const scope = before.relevant !== r.relevant;
    return fit || amount || scope || conditions.length ? [{id:r.id,fit,amount,scope,conditions,before:before.status,after:r.status,previousAmount:before.finance.estimate,nextAmount:r.finance.estimate}] : [];
  });
  return {fields,conditions:changedConditions,options};
}

export function fundingVisualReducer(state, event) {
  if (event.type === "reset") return initialFundingVisual;
  if (event.type === "start") return {...initialFundingVisual, context:event.context,token:event.token,inputKey:event.inputKey,status:"pending",value:state.context === event.context ? state.value : null,changes:state.context === event.context ? state.changes : null,latestFields:state.context === event.context ? state.latestFields : []};
  if (!["success","error"].includes(event.type)) throw Error(`Unknown funding visual event: ${event.type}`);
  if (state.token !== event.token || state.context !== event.context) return state;
  if (event.type === "error") return {...state,status:"error",error:event.error};
  const changes=assessmentChanges(state.value,event.value);
  return {...state,status:"success",error:"",value:event.value,changes,latestFields:changes?.fields.length ? changes.fields : state.latestFields};
}

export function visualScope(results, {group,shortlistOnly,selected,page, pageSize=12}) {
  const scoped = results.filter(r => shortlistOnly ? selected.includes(r.id) : r.group === group);
  return {options:scoped.slice(page*pageSize,(page+1)*pageSize), count:scoped.length, pages:Math.max(1,Math.ceil(scoped.length/pageSize))};
}

export function conditionText(c) {
  if (c.effect === "amount") return c.result === "unknown" ? "? Amount unresolved" : c.result === "fail" ? "− No addition" : "✓ Amount condition supplied";
  return c.result === "unknown" ? "? Unresolved" : c.result === "fail" ? "× Conflicts" : "✓ Meets condition";
}
