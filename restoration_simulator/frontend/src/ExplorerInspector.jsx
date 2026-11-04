import React,{useEffect,useLayoutEffect,useRef,useState} from "react";

// Transient presentation only: moving this panel never changes graph selection.
export function ExplorerInspector({active,open,narrow,containerRef,panelRef,recordId,mode,onClose,children}){
  const drag=useRef(null),body=useRef(null);
  const [position,setPosition]=useState(null),[dragging,setDragging]=useState(false);
  function constrain(next){
    const frame=containerRef.current.getBoundingClientRect(),size=panelRef.current.getBoundingClientRect();
    const surface=containerRef.current.querySelector('.explorer-canvas,.explorer-list').getBoundingClientRect(),minTop=surface.top-frame.top;
    // Keep the graph controls clear and leave room to move vertically. The body
    // scrolls independently; a resize never strands the title bar off screen.
    const maxHeight=Math.min(640,Math.max(0,(frame.height-minTop-8)*.82));
    return {left:Math.max(8,Math.min(next.left,frame.width-size.width-8)),top:Math.max(minTop,Math.min(next.top,frame.height-Math.min(size.height,maxHeight)-8)),maxHeight};
  }
  // Observe after the parent stage ref has been attached, beyond child layout effects.
  useEffect(()=>{
    if(!active||!open||narrow)return;
    const resize=()=>setPosition(current=>{
      const frame=containerRef.current.getBoundingClientRect(),size=panelRef.current.getBoundingClientRect();
      const surface=containerRef.current.querySelector('.explorer-canvas,.explorer-list').getBoundingClientRect();
      const next=constrain(current===null?{left:frame.width-size.width-16,top:surface.top-frame.top+16}:current);
      return current!==null&&current.left===next.left&&current.top===next.top&&current.maxHeight===next.maxHeight?current:next;
    });
    resize();const observer=new ResizeObserver(resize);observer.observe(containerRef.current);observer.observe(panelRef.current);
    return()=>observer.disconnect();
  },[active,open,narrow,mode,containerRef,panelRef]);
  useLayoutEffect(()=>{if(open)body.current.scrollTop=0;},[recordId,open]);
  function start(e){
    if(narrow||e.button!==0)return;
    e.preventDefault();e.currentTarget.focus({preventScroll:true});
    const frame=containerRef.current.getBoundingClientRect(),size=panelRef.current.getBoundingClientRect();
    drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,left:size.left-frame.left,top:size.top-frame.top};
    e.currentTarget.setPointerCapture(e.pointerId);setDragging(true);
  }
  function move(e){
    const start=drag.current;if(start===null||start.id!==e.pointerId)return;
    setPosition(constrain({left:start.left+e.clientX-start.x,top:start.top+e.clientY-start.y}));
  }
  function end(e){
    if(drag.current===null||drag.current.id!==e.pointerId)return;
    drag.current=null;setDragging(false);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function moveByKey(e){
    if(narrow||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    const frame=containerRef.current.getBoundingClientRect(),size=panelRef.current.getBoundingClientRect(),step=e.shiftKey?40:10;
    setPosition(constrain({left:size.left-frame.left+(e.key==="ArrowRight"?step:e.key==="ArrowLeft"?-step:0),top:size.top-frame.top+(e.key==="ArrowDown"?step:e.key==="ArrowUp"?-step:0)}));
  }
  const Handle=narrow?"div":"button";
  return <aside ref={panelRef} id="explorer-record-details" className={`explorer-inspector${dragging?" is-dragging":""}`} aria-label="Knowledge record details" hidden={!active||!open} tabIndex={-1} style={narrow||position===null?undefined:position} onKeyDown={e=>{if(e.key==="Escape"&&!e.defaultPrevented){e.preventDefault();e.stopPropagation();onClose();}}}>
    <div className="explorer-inspector-heading"><Handle className="explorer-inspector-handle" type={narrow?undefined:"button"} aria-label={narrow?undefined:"Move record details"} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={()=>{drag.current=null;setDragging(false);}} onKeyDown={moveByKey}><strong>Record details</strong><small>{narrow?"Read the selected record":"Drag to move · arrow keys also work"}</small></Handle><button type="button" aria-label="Close record details" onClick={onClose}>×</button></div>
    <div ref={body} className="explorer-inspector-body">{children}</div>
  </aside>;
}
