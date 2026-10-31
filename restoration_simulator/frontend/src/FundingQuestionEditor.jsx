import React,{useEffect,useLayoutEffect,useRef,useState} from "react";
import {constrainFundingEditor,placeFundingEditor,fundingEditorContextShift} from "./fundingLayout.js";

// A modeless editor: the graph remains interactive, including while editing an answer.
export function FundingQuestionEditor({question,anchor,positionLabel,onClose,children,title="Edit funding answer",focusTarget=null}){
  const root=useRef(null),drag=useRef(null),moved=useRef(false),currentAnchor=useRef(anchor),previousViewport=useRef({width:innerWidth,height:innerHeight});
  const [position,setPosition]=useState(null),[dragging,setDragging]=useState(false);
  const [wide,setWide]=useState(()=>matchMedia("(min-width:1001px)").matches);
  useEffect(()=>{const media=matchMedia("(min-width:1001px)"),change=()=>setWide(media.matches);media.addEventListener("change",change);return()=>media.removeEventListener("change",change);},[]);
  const viewport=()=>({width:innerWidth,height:innerHeight});
  function constrain(next){return constrainFundingEditor(next,root.current.getBoundingClientRect(),viewport());}
  function graphAnchor(reveal){
    const graph=currentAnchor.current.graph;
    if(!graph||!graph.node.isConnected||innerWidth<=1000)return currentAnchor.current;
    const bounds=()=>{
      const nodes=[...graph.panel.querySelectorAll(".funding-circumstance,.funding-annex-node")],index=nodes.indexOf(graph.node);
      // Keep this node and the following clickable node clear. The final node
      // uses its predecessor; read the current scope after answer changes.
      const context=nodes.slice(index===nodes.length-1?Math.max(0,index-1):index,index+2);
      const rects=context.map(node=>node.getBoundingClientRect()),node=graph.node.getBoundingClientRect();
      return {placement:"below",right:node.right,top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))};
    };
    if(reveal){
      let context=bounds();
      const panel=graph.panel.getBoundingClientRect();
      const naturalHeight=root.current.querySelector(".funding-editor-header").offsetHeight+root.current.querySelector(".funding-editor-body").scrollHeight+2;
      // Scroll the diagram first, retaining both nodes. Only move the page
      // when its surrounding controls leave too little room below the graph.
      graph.panel.scrollBy({top:Math.min(fundingEditorContextShift(context,viewport(),naturalHeight),Math.max(0,context.top-Math.max(8,panel.top+8))),behavior:"instant"});
      context=bounds();
      window.scrollBy({top:Math.min(fundingEditorContextShift(context,viewport(),naturalHeight),Math.max(0,context.top-8)),behavior:"instant"});
    }
    return bounds();
  }
  useLayoutEffect(()=>{
    currentAnchor.current=anchor;moved.current=false;
    setPosition(placeFundingEditor(graphAnchor(true),root.current.getBoundingClientRect(),viewport()));
  },[anchor]);
  useLayoutEffect(()=>{
    if(position===null)return;
    const input=focusTarget===null?root.current.querySelector(`#funding-${question.id}`):document.getElementById(focusTarget);
    if(input!==null&&!input.disabled)input.focus({preventScroll:true});else root.current.focus({preventScroll:true});
  },[question.id,position!==null,anchor,focusTarget]);
  useEffect(()=>{
    const resize=(reveal=false)=>{
      // Content changes and nested PDFs must not re-anchor to a graph that the
      // user has since scrolled away from. Only opening/resizing reveals it.
      const anchored=reveal&&!moved.current&&currentAnchor.current.graph?.node.isConnected&&!document.querySelector("dialog.document-viewer[open]");
      const placement=anchored?placeFundingEditor(graphAnchor(reveal),root.current.getBoundingClientRect(),viewport()):null;
      setPosition(current=>{
        if(current===null)return current;
        const next=anchored?placement:constrain(current);
        return next.left===current.left&&next.top===current.top&&next.maxHeight===current.maxHeight?current:next;
      });
    };
    const resized=()=>{
      const graph=currentAnchor.current.graph;
      let visible=false;
      if(graph?.node.isConnected){
        const node=graph.node.getBoundingClientRect(),panel=graph.panel.getBoundingClientRect();
        visible=node.top>=Math.max(0,panel.top)-1&&node.bottom<=Math.min(innerHeight,previousViewport.current.height,panel.bottom)+1;
      }
      previousViewport.current=viewport();
      // A resize while reading an option/source elsewhere must not scroll back
      // to an off-screen graph or move the editor outside the current viewport.
      resize(visible);
    },observer=new ResizeObserver(()=>resize());observer.observe(root.current);window.addEventListener("resize",resized);
    const escape=e=>{
      if(e.key==="Escape"&&!e.defaultPrevented&&!document.querySelector("dialog.document-viewer[open],.funding-help-popup")){e.preventDefault();e.stopPropagation();onClose();}
    };
    document.addEventListener("keydown",escape,true);
    return()=>{observer.disconnect();window.removeEventListener("resize",resized);document.removeEventListener("keydown",escape,true);};
  },[onClose]);
  function start(e){
    if(e.button!==0||!matchMedia("(min-width:1001px)").matches)return;
    e.preventDefault();const bounds=root.current.getBoundingClientRect();
    drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,left:bounds.left,top:bounds.top};
    e.currentTarget.setPointerCapture(e.pointerId);setDragging(true);
  }
  function move(e){
    const start=drag.current;if(start===null||start.id!==e.pointerId)return;
    moved.current=true;setPosition(constrain({left:start.left+e.clientX-start.x,top:start.top+e.clientY-start.y}));
  }
  function end(e){if(drag.current?.id!==e.pointerId)return;drag.current=null;setDragging(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}
  function moveByKey(e){
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)||!matchMedia("(min-width:1001px)").matches)return;
    e.preventDefault();moved.current=true;const amount=e.shiftKey?40:10,bounds=root.current.getBoundingClientRect();
    setPosition(constrain({left:bounds.left+(e.key==="ArrowLeft"?-amount:e.key==="ArrowRight"?amount:0),top:bounds.top+(e.key==="ArrowUp"?-amount:e.key==="ArrowDown"?amount:0)}));
  }
  const Handle=wide?"button":"div";
  return <section ref={root} id="funding-answer-editor" className={`funding-question-editor${dragging?" is-dragging":""}`} role="dialog" aria-modal="false" aria-labelledby="funding-answer-editor-title" tabIndex={-1} style={position===null?{visibility:"hidden"}:position}>
    <header className="funding-editor-header"><Handle type={wide?"button":undefined} className="funding-editor-handle" aria-label={wide?"Move question editor":undefined} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={()=>{drag.current=null;setDragging(false);}} onKeyDown={moveByKey}><strong id="funding-answer-editor-title">{title}</strong><small>{positionLabel}</small><span className="funding-editor-move-hint">Drag here to move · arrow keys also work</span></Handle><button type="button" className="funding-editor-close" aria-label="Close question editor" onClick={onClose}>×</button></header>
    <div className="funding-editor-body">{children}</div>
  </section>;
}
