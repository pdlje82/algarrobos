import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {FUNDING_GRAPH_COLUMNS,DEFAULT_FUNDING_COLUMN_VIEW,INITIAL_FUNDING_VIEWPORT,fundingViewport,fundingWindowOffset,fundingWindowStart} from "./fundingLayout.js";

export function useFundingGraphWindow(panelRef,rootRef,ready,splits){
  // The seed is presentation-only before measurement; hidden panels retain their last geometry.
  const [width,setWidth]=useState(INITIAL_FUNDING_VIEWPORT),[preference,setPreference]=useState(DEFAULT_FUNDING_COLUMN_VIEW);
  const [scroll,setScroll]=useState({left:0,top:0,height:0});
  const pending=useRef(null),focused=useRef(null),start=useRef(0),initialised=useRef(false),latest=useRef(null);
  const layout=fundingViewport(width,preference,splits);
  function update(){const p=panelRef.current;if(p===null)return;const next={left:p.scrollLeft,top:p.scrollTop,height:p.clientHeight};start.current=fundingWindowStart(layout,next.left);setScroll(old=>old.left===next.left&&old.top===next.top&&old.height===next.height?old:next);}
  function goWindow(index){const p=panelRef.current;if(p===null)return;const target=Math.max(0,Math.min(layout.maxStart,index));start.current=target;p.scrollTo({left:fundingWindowOffset(layout,target),top:p.scrollTop,behavior:"instant"});update();}
  function fullyVisible(index){const p=panelRef.current,c=layout.columns[index];return p!==null&&c.left>=p.scrollLeft+1&&c.right<=p.scrollLeft+p.clientWidth-1;}
  function reveal(index){
    if(!Number.isInteger(index)||index<0||index>3)throw Error("Unknown funding graph column.");
    const p=panelRef.current;
    if(p===null||p.clientWidth===0||Math.abs(p.clientWidth-width)>1){pending.current=index;return;}
    pending.current=null;
    if(!fullyVisible(index))goWindow(Math.min(index,layout.maxStart));
  }
  latest.current={layout,update,goWindow,reveal};
  useEffect(()=>{
    if(!ready||panelRef.current===null)return;
    const p=panelRef.current,measure=()=>{if(p.clientWidth===0)return;setWidth(p.clientWidth);latest.current.update();};
    measure();const observer=new ResizeObserver(measure);observer.observe(p);return()=>observer.disconnect();
  },[ready]);
  useLayoutEffect(()=>{
    const p=panelRef.current;if(!ready||p===null||p.clientWidth===0||Math.abs(p.clientWidth-width)>1)return;
    if(pending.current!==null)reveal(pending.current);
    else if(!initialised.current)goWindow(layout.count===1?1:0);
    else if(focused.current!==null)reveal(focused.current);
    else goWindow(Math.min(start.current,layout.maxStart));
    initialised.current=true;update();
  },[ready,width,preference,layout.points.join(",")]);
  useEffect(()=>{
    const root=rootRef.current;if(root===null)return;
    const workspace=root.closest(".funding-workspace"),handle=e=>{const index=FUNDING_GRAPH_COLUMNS.findIndex(c=>c.id===e.detail.column);if(index<0)throw Error("Unknown requested funding graph column.");latest.current.reveal(index);};
    workspace.addEventListener("funding-reveal-column",handle);return()=>workspace.removeEventListener("funding-reveal-column",handle);
  },[ready]);
  const current=fundingWindowStart(layout,scroll.left);
  return {layout,scroll,preference,start:current,
    changePreference:(value,target)=>{pending.current=target;focused.current=null;setPreference(value);},
    pan:direction=>{focused.current=null;goWindow(current+direction);},reveal,fullyVisible,onScroll:update,
    onKeyDown:e=>{if(e.target===e.currentTarget&&["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();focused.current=null;goWindow(fundingWindowStart(layout,e.currentTarget.scrollLeft)+(e.key==="ArrowLeft"?-1:1));}},
    onFocus:e=>{const c=e.target.closest("[data-graph-column]");if(c!==null&&panelRef.current.contains(c)){const index=FUNDING_GRAPH_COLUMNS.findIndex(x=>x.id===c.dataset.graphColumn);focused.current=index;reveal(index);}},
  };
}
