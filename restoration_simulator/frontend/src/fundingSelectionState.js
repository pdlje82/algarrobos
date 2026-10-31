// Editing and geometry only. Scores and applicability come from Python/the snapshot.
export function selectionSummary(score){
  if(!score||!Number.isFinite(score.subtotal)||!Number.isInteger(score.unresolved)||score.unresolved<0)throw Error("The AL20 scoring response is incompatible. Restart the backend and refresh the app.");
  return score.total===null?`Partial subtotal: ${score.subtotal} points · ${score.unresolved} criteria unresolved`:`Calculated score: ${score.total} points · self-assessed`;
}
export function selectionProfile(draft,route){
  if(draft.version!==4||!Object.hasOwn(draft.bundle.selection.routes,route))throw Error("Choose a supported AL20 assessment route.");
  return draft.bundle.selection.profiles[draft.bundle.selection.routes[route]];
}
export function selectionChoices(criterion,route){return criterion.choices.filter(c=>c.routes.includes(route));}
export function editSelectionRow(draft,route,id,row){
  selectionProfile(draft,route);
  if(!Object.hasOwn(draft.selection_assessments[route].criteria,id))throw Error("The AL20 criterion is missing from this assessment.");
  return {...draft,selection_assessments:{...draft.selection_assessments,[route]:{criteria:{...draft.selection_assessments[route].criteria,[id]:row}}}};
}
export function setSelectionChoice(row,criterion,id,value){
  if(!Object.hasOwn(row.answers,id)||![true,false,null].includes(value))throw Error("Invalid AL20 subcriterion selection.");
  const answers={...row.answers,[id]:value};
  const selected=Object.keys(answers).filter(k=>answers[k]===true);
  for(const group of criterion.exclusive_groups){
    const conflicts=selected.filter(k=>group.includes(k));
    if(conflicts.length>1)throw Error(`Clear ${conflicts.filter(k=>k!==id).join(", ")} first; these choices are mutually exclusive.`);
  }
  for(const [child,parents] of Object.entries(criterion.requires)){
    if(answers[child]===true&&parents.some(p=>answers[p]!==true))throw Error(`Select ${parents.join(", ")} before ${child}, or clear that addition first.`);
  }
  return {...row,answers};
}
export function clearSelectionRow(row,value){
  return {...row,answers:Object.fromEntries(Object.keys(row.answers).map(k=>[k,value])),inputs:Object.fromEntries(Object.keys(row.inputs).map(k=>[k,value===false?(k==="qualifying_uta"?false:0):null]))};
}
export function selectionGraphLayout(questions,branch){
  const tops=new Map(),rows=[];
  let y=44;
  for(const q of questions){
    tops.set(q.id,y);y+=132;
    if(q.id!=="selection_score"||!branch.open)continue;
    rows.push({kind:"route",top:y,height:132});y+=148;
    if(branch.route===null)continue;
    for(const criterion of branch.profile.criteria){
      rows.push({kind:"group",criterion,top:y,height:88});y+=104;
      if(branch.groups.includes(criterion.id)){
        if(criterion.method==="ratio"){
          rows.push({kind:"calculation",criterion,top:y,height:88});y+=104;
        }else for(const choice of selectionChoices(criterion,branch.route)){
          rows.push({kind:"choice",criterion,choice,top:y,height:88});y+=104;
        }
      }
    }
    rows.push({kind:"total",top:y,height:112});y+=132;
  }
  return {tops,rows,height:y+24};
}
