// Presentation geometry only. Funding assessments remain authoritative in Python.
export const DEFAULT_FUNDING_COLUMNS=[.22,.575];
const MIN_COLUMNS=[160,264,310];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function fundingColumns(width,splits){
  if(!Number.isFinite(width)||width<800||!Array.isArray(splits)||splits.length!==2||!splits.every(Number.isFinite)||!(splits[0]>0&&splits[0]<splits[1]&&splits[1]<1))throw Error("Invalid funding graph column geometry.");
  const first=clamp(width*splits[0],MIN_COLUMNS[0],width-MIN_COLUMNS[1]-MIN_COLUMNS[2]);
  const second=clamp(width*splits[1],first+MIN_COLUMNS[1],width-MIN_COLUMNS[2]);
  return {dividers:[first,second],limits:[[MIN_COLUMNS[0],second-MIN_COLUMNS[1]],[first+MIN_COLUMNS[1],width-MIN_COLUMNS[2]]],originWidth:first-26,circumstanceLeft:first+14,circumstanceWidth:second-first-64,optionLeft:second+50,optionWidth:width-second-66};
}
export function resizeFundingColumn(width,splits,index,position){
  if(![0,1].includes(index)||!Number.isFinite(position))throw Error("Invalid funding column resize.");
  const layout=fundingColumns(width,splits),next=layout.dividers.slice();
  next[index]=clamp(position,...layout.limits[index]);
  return next.map(value=>value/width);
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
