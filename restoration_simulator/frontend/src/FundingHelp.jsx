import React, {useEffect,useId,useLayoutEffect,useRef,useState} from "react";

// Hover, keyboard focus and touch share the same explanation. Fixed positioning
// keeps text inside the viewport even in a scrolling matrix or on a narrow phone.
export function FundingHelp({label,children,details=null}) {
  const id=useId(),root=useRef(null),button=useRef(null),popup=useRef(null);
  const suppressFocus=useRef(false);
  const [open,setOpen]=useState(false),[pinned,setPinned]=useState(false);
  const [position,setPosition]=useState({left:8,top:8});
  function close(restore=false){if(restore){suppressFocus.current=true;button.current.focus({preventScroll:true});suppressFocus.current=false;}setOpen(false);setPinned(false);}
  const pdfOpen=()=>document.querySelector("dialog.document-viewer[open]")!==null;
  function place() {
    if(!button.current||!popup.current)return;
    if(pdfOpen())return;
    const b=button.current.getBoundingClientRect(),p=popup.current.getBoundingClientRect();
    if(b.bottom<0||b.top>innerHeight){close();return;}
    setPosition({left:Math.max(8,Math.min(b.left,innerWidth-p.width-8)),top:b.bottom+p.height+16>innerHeight ? Math.max(8,b.top-p.height-8) : b.bottom+8});
  }
  useLayoutEffect(()=>{if(open){place();if(pinned&&details!==null)popup.current.focus({preventScroll:true});}},[open,pinned]);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!pdfOpen()&&!root.current.contains(e.target))close();};
    const escape=e=>{if(e.key==="Escape"&&!pdfOpen()){e.stopPropagation();close(pinned);}};
    document.addEventListener("pointerdown",outside);document.addEventListener("focusin",outside);document.addEventListener("keydown",escape);
    window.addEventListener("scroll",place,true);window.addEventListener("resize",place);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("focusin",outside);document.removeEventListener("keydown",escape);window.removeEventListener("scroll",place,true);window.removeEventListener("resize",place);};
  },[open,pinned]);
  return <span ref={root} className="funding-help" onPointerEnter={e=>{if(e.pointerType==="mouse")setOpen(true);}} onPointerLeave={()=>{if(!pinned)setOpen(false);}}>
    <button ref={button} type="button" aria-label={`About ${label}`} aria-haspopup={details===null?undefined:"dialog"} aria-expanded={open} aria-controls={id} aria-describedby={open&&!pinned?id:undefined}
      onFocus={e=>{if(!suppressFocus.current&&e.currentTarget.matches(":focus-visible"))setOpen(true);}} onBlur={()=>{if(!pinned)setOpen(false);}}
      onClick={()=>{setPinned(!pinned);setOpen(!pinned);}}>ⓘ</button>
    {open&&<span ref={popup} id={id} role={pinned&&details!==null?"dialog":"tooltip"} aria-label={pinned&&details!==null?`About ${label}`:undefined} tabIndex={pinned&&details!==null?-1:undefined} className={`funding-help-popup${pinned&&details!==null?" is-interactive":""}`} style={position}><strong>{label}</strong><span>{children}</span>{pinned&&details!==null&&<><span className="funding-help-detail">{details}</span><button type="button" onClick={()=>close(true)}>Close explanation</button></>}</span>}
  </span>;
}
