import React, {useEffect,useId,useLayoutEffect,useRef,useState} from "react";

// Hover, keyboard focus and touch share the same explanation. Fixed positioning
// keeps text inside the viewport even in a scrolling matrix or on a narrow phone.
export function FundingHelp({label,children}) {
  const id=useId(),root=useRef(null),button=useRef(null),popup=useRef(null);
  const [open,setOpen]=useState(false),[pinned,setPinned]=useState(false);
  const [position,setPosition]=useState({left:8,top:8});
  function close(){setOpen(false);setPinned(false);}
  function place() {
    if(!button.current||!popup.current)return;
    const b=button.current.getBoundingClientRect(),p=popup.current.getBoundingClientRect();
    if(b.bottom<0||b.top>innerHeight){close();return;}
    setPosition({left:Math.max(8,Math.min(b.left,innerWidth-p.width-8)),top:b.bottom+p.height+16>innerHeight ? Math.max(8,b.top-p.height-8) : b.bottom+8});
  }
  useLayoutEffect(()=>{if(open)place();},[open]);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current.contains(e.target))close();};
    const escape=e=>{if(e.key==="Escape"){e.stopPropagation();close();}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    window.addEventListener("scroll",place,true);window.addEventListener("resize",place);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);window.removeEventListener("scroll",place,true);window.removeEventListener("resize",place);};
  },[open]);
  return <span ref={root} className="funding-help" onPointerEnter={e=>{if(e.pointerType==="mouse")setOpen(true);}} onPointerLeave={()=>{if(!pinned)setOpen(false);}}>
    <button ref={button} type="button" aria-label={`About ${label}`} aria-expanded={open} aria-controls={id} aria-describedby={open?id:undefined}
      onFocus={e=>{if(e.currentTarget.matches(":focus-visible"))setOpen(true);}} onBlur={()=>{if(!pinned)setOpen(false);}}
      onClick={()=>{setPinned(!pinned);setOpen(!pinned);}}>ⓘ</button>
    {open&&<span ref={popup} id={id} role="tooltip" className="funding-help-popup" style={position}><strong>{label}</strong><span>{children}</span></span>}
  </span>;
}
