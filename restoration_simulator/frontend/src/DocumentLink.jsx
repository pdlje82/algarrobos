import React, {createContext,useCallback,useContext,useState} from "react";
import {documentFileUrl,documentTarget} from "./documentLibrary.js";
import {DocumentViewer} from "./DocumentViewer.jsx";

const Documents=createContext(null);
export function DocumentProvider({children}){
  const [session,setSession]=useState(null);
  const open=useCallback((target,opener)=>setSession({target,opener,key:crypto.randomUUID()}),[]);
  return <Documents.Provider value={open}>{children}{session!==null&&<DocumentViewer key={session.key} target={session.target} opener={session.opener} onClose={()=>setSession(null)}/>}</Documents.Provider>;
}

export function DocumentLink({href,documentId=null,page=null,pageBasis="pdf",expectedSha256=null,children,...attributes}){
  const open=useContext(Documents);
  let target=null,error=null;
  try{target=documentTarget({href,documentId,page,pageBasis,expectedSha256});}catch(e){error=e.message;}
  if(error!==null){
    const {target:unusedTarget,rel:unusedRel,...buttonAttributes}=attributes;
    return <button {...buttonAttributes} type="button" className="document-reference-error" title={error} onClick={event=>{
      if(open===null)throw new Error("Document links require the app document provider.");
      open({id:documentId,title:"Document reference unavailable",pdfPage:null,expectedSha256,error},event.currentTarget);
    }}>{children}</button>;
  }
  const destination=target===null?href:`${documentFileUrl(target.id,target.expectedSha256)}#page=${target.pdfPage}`;
  return <a {...attributes} href={destination} onClick={event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||attributes.download!==undefined)return;
    if(target===null)return;
    event.preventDefault();
    if(open===null)throw new Error("Document links require the app document provider.");
    open(target,event.currentTarget);
  }}>{children}</a>;
}
