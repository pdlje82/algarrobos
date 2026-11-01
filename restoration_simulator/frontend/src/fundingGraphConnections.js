import {graphLinkStatus,conditionText} from "./fundingVisualState.js";
import {routeCoverage} from "./fundingProgrammeState.js";
import {FUNDING_GRAPH_COLUMNS} from "./fundingLayout.js";

export function graphConnection(id,from,to,source,target,status,label,active=true,effect="structure",optionId=null){
  if(!["neutral","pass","fail","unknown"].includes(status)||![from,to].every(i=>Number.isInteger(i)&&i>=0&&i<4)||from>=to||source===null||target===null||![source?.x,source?.y,target?.x,target?.y].every(Number.isFinite)||source.x>=target.x)throw Error("Invalid funding connection geometry. Reset column widths and retry assessment.");
  const curve=(source.x+target.x)/2;
  return {id,from,to,source,target,status,label,active,effect,optionId,curve,path:`M ${source.x} ${source.y} C ${curve} ${source.y},${curve} ${target.y},${target.x} ${target.y}`};
}
export function fundingGraphConnections({columns,programmeRows,programme,questions,questionY,options,conditions,showAmount,workingOption,comparing,currentField}){
  const edges=[],[origin,programmes,requirements,routes]=columns;
  for(const row of programmeRows){
    if(!["family","programme"].includes(row.kind))continue;
    const name=row.kind==="family"?row.title:row.programme.title;
    edges.push(graphConnection(`programme:${row.key}`,0,1,{x:origin.right,y:92},{x:programmes.left+(row.indented?16:0),y:row.top+row.height/2},"neutral",`Exploration → ${name}`,row.selected===true));
  }
  if(programme===null)return edges;
  const selected=programmeRows.find(r=>r.kind==="programme"&&r.programme.id===programme.id);
  if(selected===undefined)throw Error("The selected programme node is missing from the graph.");
  const programmeY=selected.top+selected.height/2;
  for(const q of questions)edges.push(graphConnection(`question:${q.id}`,1,2,{x:programmes.right,y:programmeY},{x:requirements.left,y:questionY(q)},"neutral",`${programme.title} → ${q.label}`));
  for(const [index,r] of options.entries()){
    let linked=false;
    for(const q of questions){
      const checks=conditions.filter(c=>c.option_id===r.id&&c.fields.includes(q.id)&&(c.effect==="eligibility"||showAmount));
      const groups=["eligibility","amount"].map(effect=>({effect,checks:checks.filter(c=>c.effect===effect)})).filter(g=>g.checks.length>0);
      for(const group of groups){
        linked=true;const offset=groups.length===2?(group.effect==="amount"?5:-5):0;
        edges.push(graphConnection(`${q.id}:${r.id}:${group.effect}`,2,3,{x:requirements.right,y:questionY(q)+offset},{x:routes.left,y:92+index*132+offset},graphLinkStatus(group.checks),`${q.label} → ${r.id}: ${group.checks.map(conditionText).join("; ")}`,comparing?q.id===currentField:workingOption===r.id,group.effect,r.id));
      }
    }
    if(!linked){
      const coverage=routeCoverage(conditions,r.id),label=coverage.fit?"Programme route; modelled requirements are available":coverage.amount?"Amount calculations available":"Reference guide only";
      edges.push(graphConnection(`membership:${r.id}`,1,3,{x:programmes.right,y:programmeY},{x:routes.left,y:92+index*132},"neutral",`${programme.title} → ${r.id}: ${label}`,workingOption===r.id,"structure",r.id));
    }
  }
  return edges;
}
// Cubics are monotonic in x; intersect the same path used to draw the connection.
export function connectionAtX(edge,x){
  if(!Number.isFinite(x)||x<=edge.source.x||x>=edge.target.x)return null;
  let low=0,high=1;
  const bezier=(a,b,c,d,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d;
  for(let i=0;i<36;i++){const t=(low+high)/2;if(bezier(edge.source.x,edge.curve,edge.curve,edge.target.x,t)<x)low=t;else high=t;}
  return bezier(edge.source.y,edge.source.y,edge.target.y,edge.target.y,(low+high)/2);
}
export function fundingContinuations(edges,{left,top,width,height}){
  if(![left,top,width,height].every(Number.isFinite)||width<=0||height<=0)throw Error("Invalid funding graph viewport bounds.");
  const markers=[];
  for(const side of ["left","right"]){
    const x=side==="left"?left:left+width,points=edges.flatMap(edge=>{
      const y=connectionAtX(edge,x);
      return y!==null&&y>=top&&y<=top+height?[{edge,y:y-top}]:[];
    }).sort((a,b)=>a.y-b.y);
    const groups=[];
    for(const point of points){const last=groups.at(-1);if(last!==undefined&&point.y-last.at(-1).y<44)last.push(point);else groups.push([point]);}
    for(const group of groups){
      const ids=[...new Set(group.map(p=>side==="left"?p.edge.from:p.edge.to))],column=side==="left"?Math.max(...ids):Math.min(...ids);
      const label=ids.length===1?FUNDING_GRAPH_COLUMNS[column].label:side==="left"?"Earlier columns":"Later columns";
      markers.push({side,column,label,y:Math.max(22,Math.min(height-22,group.reduce((n,p)=>n+p.y,0)/group.length)),count:group.length,statuses:[...new Set(group.map(p=>p.edge.status))],details:group.map(p=>p.edge.label).join("\n")});
    }
  }
  return markers;
}
