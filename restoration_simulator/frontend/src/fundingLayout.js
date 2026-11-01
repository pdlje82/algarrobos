// Presentation geometry only. All four columns stay in the same coordinate system.
export const FUNDING_GRAPH_COLUMNS=[
  {id:"exploration",label:"Exploration",minimum:180},
  {id:"programme",label:"Programme",minimum:260},
  {id:"requirements",label:"Route requirements",minimum:320},
  {id:"routes",label:"Funding routes",minimum:320},
];
export const DEFAULT_FUNDING_COLUMNS=[.25,.45,.75];
export const DEFAULT_FUNDING_COLUMN_VIEW="auto";
export const INITIAL_FUNDING_VIEWPORT=FUNDING_GRAPH_COLUMNS.reduce((n,c)=>n+c.minimum,0);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const windows=(values,count)=>Array.from({length:5-count},(_,i)=>values.slice(i,i+count).reduce((a,b)=>a+b,0));

export function fundingColumns(width,splits,minimums=FUNDING_GRAPH_COLUMNS.map(c=>c.minimum)){
  if(!Number.isFinite(width)||!Array.isArray(minimums)||minimums.length!==4||minimums.some(v=>!Number.isFinite(v)||v<=0)||width<minimums.reduce((a,b)=>a+b,0)-1e-6||!Array.isArray(splits)||splits.length!==3||!splits.every(Number.isFinite)||!(splits[0]>0&&splits[0]<splits[1]&&splits[1]<splits[2]&&splits[2]<1))throw Error("Invalid four-column funding graph geometry. Reset column widths.");
  const dividers=[];let previous=0;
  for(let i=0;i<3;i++){dividers.push(clamp(width*splits[i],previous+minimums[i],width-minimums.slice(i+1).reduce((a,b)=>a+b,0)));previous=dividers[i];}
  const points=[0,...dividers,width],columns=FUNDING_GRAPH_COLUMNS.map((c,i)=>({...c,index:i,left:points[i]+12,right:points[i+1]-12,width:points[i+1]-points[i]-24,start:points[i],end:points[i+1]}));
  return {columns,points,dividers,limits:dividers.map((_,i)=>[points[i]+minimums[i],points[i+2]-minimums[i+1]]),originWidth:columns[0].width,programmeLeft:columns[1].left,programmeWidth:columns[1].width,circumstanceLeft:columns[2].left,circumstanceWidth:columns[2].width,optionLeft:columns[3].left,optionWidth:columns[3].width};
}
export function fundingViewport(width,preference,splits){
  if(!Number.isFinite(width)||width<224||!["auto","3","4"].includes(preference))throw Error("The funding graph needs at least 224 pixels of available width and a supported column view.");
  const mins=FUNDING_GRAPH_COLUMNS.map(c=>c.minimum),requested=preference==="auto"?4:Number(preference);
  let count=requested;
  while(count>1&&(count===3?3*Math.max(...mins):Math.max(...windows(mins,count)))>width)count--;
  const canvasWidth=count===4?width:width*4/count;
  const minimums=count===1?[width,width,width,width]:mins;
  let layout=fundingColumns(canvasWidth,splits,minimums);
  function boundaryLimits(points,i){
    let lo=points[i]+minimums[i],hi=points[i+2]-minimums[i+1];
    for(let start=0;start<=4-count;start++){
      if(start===i+1)lo=Math.max(lo,points[start+count]-width);
      if(start+count===i+1)hi=Math.min(hi,points[start]+width);
    }
    return [lo,hi];
  }
  if(windows(layout.columns.map(c=>c.end-c.start),count).some(w=>w>width+1e-6)){
    // Reflow custom widths explicitly when a narrower view cannot fit them.
    // Start from a feasible proportional layout and move each boundary toward
    // its requested position while keeping every column window readable.
    const outer=Math.max(mins[0],canvasWidth-width),last=Math.max(mins[3],canvasWidth-width);
    const extra=canvasWidth-outer-last-mins[1]-mins[2];
    const baseline=count===3?[outer,mins[1]+extra/2,mins[2]+extra/2,last]:[width/2,width/2,width/2,width/2],points=[0];
    for(const size of baseline)points.push(points.at(-1)+size);
    const desired=layout.dividers;
    for(let pass=0;pass<4;pass++)for(let i=0;i<3;i++)points[i+1]=clamp(desired[i],...boundaryLimits(points,i));
    layout=fundingColumns(canvasWidth,points.slice(1,4).map(x=>x/canvasWidth),minimums);
  }
  const limits=layout.dividers.map((_,i)=>boundaryLimits(layout.points,i));

  return {...layout,limits,viewportWidth:width,canvasWidth,count,maxStart:4-count};
}
export function fundingWindowOffset(layout,start){
  if(!Number.isInteger(start)||start<0||start>layout.maxStart)throw Error("Invalid funding column window.");
  return clamp(layout.points[start],0,layout.canvasWidth-layout.viewportWidth);
}
export function fundingWindowStart(layout,left){
  if(!Number.isFinite(left))throw Error("Invalid funding horizontal scroll position.");
  return Array.from({length:layout.maxStart+1},(_,i)=>i).reduce((best,i)=>Math.abs(fundingWindowOffset(layout,i)-left)<Math.abs(fundingWindowOffset(layout,best)-left)?i:best,0);
}
export function resizeFundingColumn(width,splits,index,position,preference=DEFAULT_FUNDING_COLUMN_VIEW){
  if(![0,1,2].includes(index)||!Number.isFinite(position))throw Error("Invalid funding column resize.");
  const layout=fundingViewport(width,preference,splits),next=layout.dividers.slice();
  next[index]=clamp(position,...layout.limits[index]);
  return next.map(value=>value/layout.canvasWidth);
}
// Explicit reveal requests are transient UI events, including focus restoration.
export function revealFundingColumn(node,column){
  if(!FUNDING_GRAPH_COLUMNS.some(c=>c.id===column))throw Error("Unknown funding graph column.");
  const workspace=node.closest(".funding-workspace");
  if(workspace!==null)workspace.dispatchEvent(new CustomEvent("funding-reveal-column",{detail:{column},bubbles:false}));
}
export function constrainFundingEditor(position,size,viewport){
  if(position.maxHeight!==undefined){
    const top=clamp(position.top,8,Math.max(8,viewport.height-Math.min(120,size.height)-8));
    return {left:clamp(position.left,8,Math.max(8,viewport.width-size.width-8)),top,maxHeight:viewport.height-top-8};
  }
  return {left:clamp(position.left,8,Math.max(8,viewport.width-size.width-8)),top:clamp(position.top,8,Math.max(8,viewport.height-size.height-8))};
}
export function placeFundingEditor(anchor,size,viewport){
  if(viewport.width<=1000)return constrainFundingEditor({left:8,top:viewport.height-size.height-8},size,viewport);
  if(anchor.placement==="below"){
    // Never clamp a graph editor upward over the protected nodes. Its body
    // scrolls within the remaining space; graph context is revealed first.
    const top=anchor.bottom+12;
    return {left:clamp(anchor.right-size.width,8,Math.max(8,viewport.width-size.width-8)),top,maxHeight:Math.max(0,viewport.height-top-8)};
  }
  return constrainFundingEditor({left:anchor.right+12,top:anchor.top},size,viewport);
}

export function fundingEditorContextShift(context,viewport,naturalEditorHeight){
  const contextHeight=context.bottom-context.top;
  const editorHeight=Math.min(naturalEditorHeight,Math.max(120,viewport.height-contextHeight-36));
  return Math.max(0,context.bottom+12+editorHeight+8-viewport.height);
}
