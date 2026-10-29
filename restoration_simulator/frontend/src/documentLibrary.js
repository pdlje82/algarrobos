import configuration from "../../scenarios/documents.json" with {type:"json"};
import {properties,required} from "./contracts.js";

export function validateDocumentCatalogue(value){
  properties(value,["version","viewer","documents"],"document catalogue");
  required(value.version===1&&Array.isArray(value.documents)&&value.documents.length>0,"Unsupported document catalogue.");
  properties(value.viewer,["initial_page","initial_scale","zoom_factor","min_scale","max_scale","desktop_width_vw","desktop_height_dvh","mobile_breakpoint_px"],"PDF viewer defaults");
  required(value.viewer.initial_page===1&&value.viewer.initial_scale==="page-width","Invalid PDF starting view.");
  for(const [key,n] of Object.entries(value.viewer))if(key!=="initial_scale")required(Number.isFinite(n)&&n>0,`Invalid PDF default ${key}.`);
  required(value.viewer.zoom_factor>1&&value.viewer.min_scale<value.viewer.max_scale&&value.viewer.desktop_width_vw<=100&&value.viewer.desktop_height_dvh<=100,"Invalid PDF zoom/dialog defaults.");
  const ids=new Set(),aliases=new Set();
  for(const d of value.documents){
    properties(d,["id","title","filename","pages","sha256","aliases","printed_pages","mapping_note"],"registered PDF");
    required(typeof d.id==="string"&&/^[A-Z]+-\d{3}$/.test(d.id)&&!ids.has(d.id),"Invalid or duplicate document ID.");ids.add(d.id);
    required([d.title,d.filename,d.mapping_note].every(v=>typeof v==="string"&&v.trim())&&d.filename.endsWith(".pdf")&&!/[\\/:]/.test(d.filename),"Invalid PDF description or filename.");
    required(Number.isInteger(d.pages)&&d.pages>0&&/^[a-f0-9]{64}$/.test(d.sha256)&&Array.isArray(d.aliases),"Invalid PDF page count, checksum or aliases.");
    properties(d.printed_pages,[],"printed-page mapping");
    for(const [label,page] of Object.entries(d.printed_pages))required(label.trim()&&Number.isInteger(page)&&page>0&&page<=d.pages,"Invalid printed-page mapping.");
    required(new Set(Object.values(d.printed_pages)).size===Object.keys(d.printed_pages).length,"Ambiguous printed-page mapping.");
    for(const alias of d.aliases){required(typeof alias==="string"&&(alias.startsWith("/api/")||alias.startsWith("https://"))&&!alias.includes("#")&&!aliases.has(alias),"Invalid or duplicate PDF alias.");aliases.add(alias);}
  }
  return value;
}
export const documentCatalogue=validateDocumentCatalogue(configuration);
export const pdfDefaults=documentCatalogue.viewer;
export function pdfZoomScale(current,direction,defaults){
  required(Number.isFinite(current)&&current>0&&(direction===1||direction===-1),"Invalid PDF zoom command.");
  const next=current*(direction>0?defaults.zoom_factor:1/defaults.zoom_factor);
  // Fit-to-width may start outside button limits for unusually wide/small pages.
  // A minus click must never zoom in, nor a plus click zoom out, in that case.
  return direction>0?Math.max(current,Math.min(defaults.max_scale,next)):Math.min(current,Math.max(defaults.min_scale,next));
}
export function documentRecord(id){const d=documentCatalogue.documents.find(d=>d.id===id);required(d!==undefined,`Library PDF ${id} is not registered.`);return d;}
export function validPdfPage(page,count){return Number.isInteger(page)&&page>=1&&page<=count;}
export function resolveDocumentPage(document,page,basis){
  if(page===null)return pdfDefaults.initial_page;
  if(basis==="printed"){
    required(Object.hasOwn(document.printed_pages,String(page)),`Printed page ${page} has not been mapped for ${document.id}. No substitute page was opened.`);
    return document.printed_pages[String(page)];
  }
  required(basis==="pdf"&&validPdfPage(page,document.pages),`PDF page ${page} is outside ${document.id} (1–${document.pages}).`);
  return page;
}
export function printedLabel(document,pdfPage){const entry=Object.entries(document.printed_pages).find(([,p])=>p===pdfPage);return entry===undefined?null:entry[0];}
export function documentFileUrl(id,expectedSha256,download=false){
  const d=documentRecord(id),sha=expectedSha256===null?d.sha256:expectedSha256;
  const query=new URLSearchParams({expected_sha256:sha});if(download)query.set("download","true");
  return `/api/documents/${id}/file?${query}`;
}
export function documentTarget({href,documentId=null,page=null,pageBasis="pdf",expectedSha256=null}){
  let d;
  if(documentId!==null)d=documentRecord(documentId);
  else{
    const url=new URL(href,"http://algarroba.local");
    const fragment=url.hash;url.hash="";
    const base=url.origin==="http://algarroba.local"?url.pathname+url.search:url.href;
    d=documentCatalogue.documents.find(entry=>entry.aliases.includes(base)||base===`/api/documents/${entry.id}/file`);
    if(d===undefined)return null; // Deliberate boundary: images/websites/unregistered external PDFs are ordinary links.
    if(fragment!==""){
      required(/^#page=\d+$/.test(fragment),"This PDF reference has an unsupported page fragment.");
      page=Number(fragment.slice(6));
    }
  }
  const pdfPage=resolveDocumentPage(d,page,pageBasis);
  return {id:d.id,title:d.title,pdfPage,expectedSha256:expectedSha256===null?d.sha256:expectedSha256,error:null};
}
export function validateDocumentMetadata(data,target){
  properties(data,["version","id","title","filename","pages","sha256","aliases","printed_pages","mapping_note","file_url","media_type"],"document metadata");
  const d=documentRecord(target.id);
  required(data.version===1&&data.id===target.id&&data.media_type==="application/pdf"&&data.file_url===`/api/documents/${target.id}/file`,"Incompatible document metadata. Restart Python and reload.");
  required(data.sha256===target.expectedSha256&&data.sha256===d.sha256&&data.pages===d.pages&&JSON.stringify(data.printed_pages)===JSON.stringify(d.printed_pages),"The source edition or page mapping has changed. Reload the app and verify the reference; no replacement was opened.");
  required(validPdfPage(target.pdfPage,data.pages),"Requested PDF page is unavailable.");
  return data;
}
