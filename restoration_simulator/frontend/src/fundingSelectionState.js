import {detachLocationCriterion} from "./fundingStatisticsState.js";
// Editing and geometry only. Scores and applicability come from Python/the snapshot.
export function selectionSummary(score){
  if(!score||!Number.isFinite(score.subtotal)||!Number.isInteger(score.unresolved)||score.unresolved<0)throw Error("The AL20 scoring response is incompatible. Restart the backend and refresh the app.");
  if(score.version===3)return `${score.subtotal} points · threshold ${score.threshold}`+(score.unresolved?` · ${score.unresolved} criteria need inputs`:"");
  const provisional=Object.hasOwn(score,"location_basis")&&score.location_basis!==null?" · provisional location data":"";
  return (score.total===null?`Partial subtotal: ${score.subtotal} points · ${score.unresolved} criteria unresolved`:`Calculated score: ${score.total} points · self-assessed`)+provisional;
}
export function selectionProfile(draft,route){
  if(draft.version!==4||!Object.hasOwn(draft.bundle.selection.routes,route))throw Error("Choose a supported AL20 assessment route.");
  return draft.bundle.selection.profiles[draft.bundle.selection.routes[route]];
}
export function selectionChoices(criterion,route){return criterion.choices.filter(c=>c.routes.includes(route));}
export function editSelectionRow(draft,route,id,row){
  selectionProfile(draft,route);
  if(!Object.hasOwn(draft.selection_assessments[route].criteria,id))throw Error("The AL20 criterion is missing from this assessment.");
  const assessment=draft.selection_assessments[route];
  const next={...assessment,criteria:{...assessment.criteria,[id]:row}};
  if(Object.hasOwn(assessment,"location_lookup")&&assessment.location_lookup.automated.includes(id)&&JSON.stringify(row.answers)!==JSON.stringify(assessment.criteria[id].answers))next.location_lookup=detachLocationCriterion(assessment,id).location_lookup;
  return {...draft,selection_assessments:{...draft.selection_assessments,[route]:next}};
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

export function proposeSelectionChoice(row,criterion,id,value){
  if(!Object.hasOwn(row.answers,id)||![true,false,null].includes(value))throw Error("Invalid AL20 subcriterion selection.");
  const answers={...row.answers,[id]:value},visiting=new Set();
  function include(key){
    if(visiting.has(key))throw Error("The scoring prerequisites contain a cycle. Review the catalogue.");
    visiting.add(key);answers[key]=true;
    if(Object.hasOwn(criterion.requires,key))for(const parent of criterion.requires[key])include(parent);
    visiting.delete(key);
  }
  if(value===true){
    include(id);
    for(const group of criterion.exclusive_groups)if(group.includes(id))for(const other of group)if(other!==id&&answers[other]===true)answers[other]=false;
  }
  let changed=true;
  while(changed){changed=false;for(const [child,parents] of Object.entries(criterion.requires))if(answers[child]===true&&parents.some(parent=>answers[parent]!==true)){answers[child]=false;changed=true;}}
  if(answers[id]!==value)throw Error("This choice conflicts with its required selections. Review the related items first.");
  const next=setSelectionChoice({...row,answers},criterion,id,value);
  return {row:next,related:Object.keys(answers).filter(key=>key!==id&&answers[key]!==row.answers[key])};
}

export function editChoiceContext(row,id,field,value){
  if(!Object.hasOwn(row.answers,id)||!["reference","notes"].includes(field)||typeof value!=="string")throw Error("Invalid sub-node annotation.");
  const previous=Object.hasOwn(row,"choice_context")?row.choice_context:{version:1,items:{}};
  if(previous.version!==1)throw Error("Unsupported sub-node notes version. Retain your draft and reload.");
  const item=Object.hasOwn(previous.items,id)?previous.items[id]:{reference:"",notes:""};
  return {...row,choice_context:{...previous,items:{...previous.items,[id]:{...item,[field]:value}}}};
}
export function selectionNodeIndent(kind,width){
  const levels={route:1,group:2,choice:3,calculation:3,total:2};
  if(!Object.hasOwn(levels,kind)||!Number.isFinite(width)||width<=160)throw Error("Invalid AL20 branch geometry. Refresh the funding graph.");
  // Three visible levels, while retaining at least 160px for the deepest node.
  return levels[kind]*Math.min(32,(width-160)/3);
}
export function selectionBranchConnections(rows,left,width,assessmentTop){
  const edges=[],groups=new Map();let route=null;
  for(const row of rows){
    const x=left+selectionNodeIndent(row.kind,width);
    let parent;
    if(row.kind==="route"){
      if(!Number.isFinite(assessmentTop))throw Error("The AL20 assessment parent is missing. Retry the funding graph.");
      parent={x:left,top:assessmentTop,height:124};
    }else if(row.kind==="choice"||row.kind==="calculation")parent=groups.get(row.criterion.id);
    else parent=route;
    if(!parent)throw Error("The AL20 branch parent is missing. Retry the funding graph.");
    const spine=parent.x+8,y=row.top+row.height/2;
    edges.push({key:`${row.kind}-${row.choice?row.choice.id:row.criterion?row.criterion.id:"route"}`,path:`M ${spine} ${parent.top+parent.height} L ${spine} ${y} L ${x} ${y}`});
    const node={x,top:row.top,height:row.height};
    if(row.kind==="route")route=node;
    if(row.kind==="group")groups.set(row.criterion.id,node);
  }
  return edges;
}
export function selectionGraphLayout(questions,branch,metGroup=null){
  const tops=new Map(),rows=[];
  let y=44,metHeaderTop=null;
  for(const q of questions){
    if(metGroup!==null&&metHeaderTop===null&&metGroup.ids.includes(q.id)){metHeaderTop=y;y+=80;}
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
  if(metGroup!==null&&metHeaderTop===null){metHeaderTop=y;y+=80;}
  return {tops,rows,height:y+24,metHeaderTop};
}
