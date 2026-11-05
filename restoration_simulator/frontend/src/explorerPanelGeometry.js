// Presentation geometry only. null height means the intentional automatic size.
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function constrainInspector(next,size,frame,minTop){
  if(![next.left,next.top,size.width,size.height,frame.width,frame.height,minTop].every(Number.isFinite)||!(next.height===null||Number.isFinite(next.height)))throw Error('Invalid record-details geometry. Reopen the Explorer after restoring compatible layout data.');
  const available=Math.max(0,frame.height-minTop-8),automatic=Math.min(640,available*.82),minimum=Math.min(180,available);
  const height=next.height===null?null:clamp(next.height,minimum,available),actual=height===null?Math.min(size.height,automatic):height;
  const top=clamp(next.top,minTop,Math.max(minTop,frame.height-actual-8));
  return {left:clamp(next.left,8,Math.max(8,frame.width-size.width-8)),top,height,maxHeight:height===null?automatic:Math.max(0,frame.height-top-8)};
}
export function resizedInspector(start,delta,frame){
  if(![start.left,start.top,start.height,delta,frame.height].every(Number.isFinite))throw Error('Invalid record-details resize. Reopen the Explorer and retry.');
  const maximum=Math.max(0,frame.height-start.top-8),minimum=Math.min(180,maximum);
  return {left:start.left,top:start.top,height:clamp(start.height+delta,minimum,maximum),maxHeight:maximum};
}
