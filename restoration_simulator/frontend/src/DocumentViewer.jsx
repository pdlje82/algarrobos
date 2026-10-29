import React,{useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {documentFileUrl,pdfDefaults,printedLabel,validPdfPage,validateDocumentMetadata} from "./documentLibrary.js";
import "./DocumentViewer.css";

export function DocumentViewer({target,opener,onClose}){
  const dialog=useRef(null),closeButton=useRef(null),container=useRef(null),engine=useRef(null);
  const [attempt,setAttempt]=useState(0),[phase,setPhase]=useState("loading"),[error,setError]=useState(""),[metadata,setMetadata]=useState(null);
  const [rendered,setRendered]=useState(false),[page,setPage]=useState(target.pdfPage),[pageInput,setPageInput]=useState(target.pdfPage===null?"":String(target.pdfPage));
  const [pageError,setPageError]=useState(""),[scale,setScale]=useState(null),[query,setQuery]=useState(""),[searchStatus,setSearchStatus]=useState("");
  const inputDirty=useRef(false),heading=useId();
  const [phone,setPhone]=useState(()=>window.matchMedia(`(max-width:${pdfDefaults.mobile_breakpoint_px}px)`).matches);
  useEffect(()=>{const media=window.matchMedia(`(max-width:${pdfDefaults.mobile_breakpoint_px}px)`);const update=()=>setPhone(media.matches);media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
  useEffect(()=>{
    const node=dialog.current,previousOverflow=document.body.style.overflow;
    node.showModal();document.body.style.overflow="hidden";closeButton.current.focus({preventScroll:true});
    return()=>{node.close();document.body.style.overflow=previousOverflow;if(opener!==null&&opener.isConnected)opener.focus({preventScroll:true});};
  },[opener]);
  useEffect(()=>{
    let cancelled=false,instance=null;const controller=new AbortController();
    setPhase("loading");setRendered(false);setError("");setSearchStatus("");
    const fail=message=>{if(!cancelled){setError(message);setPhase("error");}};
    async function start(){
      try{
        if(target.error!==null)throw new Error(target.error);
        const response=await fetch(`/api/documents/${target.id}?`+new URLSearchParams({expected_sha256:target.expectedSha256}),{signal:controller.signal});
        let body;
        try{body=await response.json();}catch(e){throw new Error("The document service returned an unreadable response. Check that Python is running, then retry.",{cause:e});}
        if(!response.ok)throw new Error(`Cannot open the library PDF (HTTP ${response.status}): ${typeof body.detail==="string"?body.detail:JSON.stringify(body)}. If the app was just updated, restart Python and retry.`);
        const data=validateDocumentMetadata(body,target);
        if(cancelled)return;setMetadata(data);
        const {createPdfEngine}=await import("./pdfEngine.js");
        if(cancelled)return;
        instance=createPdfEngine({container:container.current,url:documentFileUrl(target.id,target.expectedSha256),
          page:target.pdfPage,expectedPages:data.pages,defaults:pdfDefaults,
          onReady:n=>{if(!cancelled){setPage(n);if(!inputDirty.current)setPageInput(String(n));setRendered(true);setPhase("ready");}},
          onPage:n=>{if(!cancelled){setPage(n);if(!inputDirty.current)setPageInput(String(n));}},
          onScale:n=>{if(!cancelled)setScale(n);},onSearch:text=>{if(!cancelled)setSearchStatus(text);},onError:fail});
        engine.current=instance;
      }catch(e){if(!cancelled)fail(e.message);}
    }
    start();
    return()=>{cancelled=true;controller.abort();engine.current=null;if(instance!==null)instance.destroy();};
  },[target,attempt]);
  function jump(){
    const n=pageInput.trim()===""?NaN:Number(pageInput);
    if(metadata===null||!validPdfPage(n,metadata.pages)){setPageError(`Enter a whole PDF page from 1 to ${metadata===null?"the document’s last page":metadata.pages}.`);return;}
    inputDirty.current=false;setPageError("");engine.current.go(n);setPage(n);setPageInput(String(n));
  }
  function move(direction){const n=page+direction;if(metadata!==null&&validPdfPage(n,metadata.pages)){inputDirty.current=false;setPageError("");setPageInput(String(n));setPage(n);engine.current.go(n);}}
  function containKeys(event){
    if(event.key==="Escape"){event.preventDefault();event.stopPropagation();onClose();return;}
    if(event.key!=="Tab")return;
    const controls=[...dialog.current.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex='0']")].filter(el=>el.getClientRects().length>0);
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  const enabled=phase==="ready",book=metadata===null?null:printedLabel(metadata,page);
  const file=target.id===null?null:metadata===null?null:documentFileUrl(target.id,target.expectedSha256);
  return createPortal(<dialog ref={dialog} className={`document-viewer${phone?" is-phone":""}`} aria-labelledby={heading} aria-modal="true" style={{"--document-width":pdfDefaults.desktop_width_vw+"vw","--document-height":pdfDefaults.desktop_height_dvh+"dvh"}}
    onKeyDown={containKeys} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}}>
    <header className="document-heading"><div><p className="eyebrow">Document library{target.id!==null?` · ${target.id}`:""}</p><h2 id={heading}>{target.title}</h2></div><button type="button" ref={closeButton} onClick={onClose}>Close PDF</button></header>
    <div className="document-toolbar" aria-label="PDF controls">
      <div className="document-page-controls"><button type="button" aria-label="Previous PDF page" disabled={!enabled||page<=1} onClick={()=>move(-1)}>←</button>
        <form onSubmit={e=>{e.preventDefault();jump();}}><label>PDF page<input aria-label="PDF page" inputMode="numeric" value={pageInput} disabled={!enabled} onChange={e=>{inputDirty.current=true;setPageInput(e.target.value);setPageError("");}} onBlur={()=>{if(inputDirty.current&&enabled)jump();}}/></label><span>of {metadata===null?"…":metadata.pages}</span><button type="submit" disabled={!enabled}>Go</button></form>
        <button type="button" aria-label="Next PDF page" disabled={!enabled||metadata===null||page>=metadata.pages} onClick={()=>move(1)}>→</button></div>
      <div className="document-zoom-controls"><button type="button" aria-label="Zoom out PDF" disabled={!enabled} onClick={()=>engine.current.zoom(-1)}>−</button><span aria-live="polite">{scale===null?"…":`${Math.round(scale*100)}%`}</span><button type="button" aria-label="Zoom in PDF" disabled={!enabled} onClick={()=>engine.current.zoom(1)}>＋</button><button type="button" disabled={!enabled} onClick={()=>engine.current.fit()}>Fit to width</button></div>
      {file!==null&&<div className="document-file-actions"><a href={documentFileUrl(target.id,target.expectedSha256,true)} download>Download PDF</a><a href={`${file}#page=${page}`} target="_blank" rel="noreferrer">Open in new tab</a></div>}
      <form className="document-search" onSubmit={e=>{e.preventDefault();engine.current.search(query);}}><label>Find in document<input type="search" value={query} disabled={!enabled} onChange={e=>{setQuery(e.target.value);setSearchStatus("");}}/></label><button type="button" aria-label="Previous text match" disabled={!enabled||query.trim()===""} onClick={()=>engine.current.search(query,true)}>↑</button><button type="submit" aria-label="Next text match" disabled={!enabled||query.trim()===""}>↓</button><span role="status">{searchStatus}</span></form>
    </div>
    {book!==null&&book!==String(page)&&<p className="document-page-label">Printed page {book} · PDF page {page}</p>}
    {pageError!==""&&<p className="document-error" role="alert">{pageError} The displayed page has been retained.</p>}
    {error!==""&&<div className="document-error" role="alert"><p>{error}</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>Retry PDF</button></div>}
    <div className="document-reading-area" aria-busy={phase==="loading"}>
      <div ref={container} className="document-pages" style={{visibility:rendered?"visible":"hidden"}} tabIndex={enabled?0:-1} aria-label="PDF pages"><div className="pdfViewer"/></div>
      {phase==="loading"&&<p className="document-loading" role="status">Opening {target.pdfPage===null?"the document":`PDF page ${target.pdfPage}`}…</p>}
    </div>
  </dialog>,document.body);
}
