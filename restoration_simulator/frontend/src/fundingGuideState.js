// Current reference content never edits the saved assessment or its rule snapshot.
export const GUIDE_SECTIONS=[
  ["what","What is it?"], ["fit","Why consider it for Algarrobos?"],
  ["advantages","What makes it interesting?"], ["limitations","What are the limitations?"],
  ["next_steps","What would we investigate next?"],
];
export function validateGuideResponse(value){
  function require(ok){if(!ok)throw Error("Incompatible funding guide library. Reload the reference information or restart Python.");}
  const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
  const text=v=>typeof v==="string"&&v.trim().length>0;
  const date=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  require(object(value)&&value.version===1&&typeof value.library_hash==="string"&&/^[a-f0-9]{64}$/.test(value.library_hash));
  const data=value.library;
  require(object(data)&&data.version===1&&date(data.checked_on)&&object(data.guides)&&Object.keys(data.guides).length>0&&object(data.sources)&&Object.keys(data.sources).length>0);
  for(const s of Object.values(data.sources)){
    require(object(s)&&["title","issuer","url","note"].every(k=>text(s[k]))&&/^https:\/\/[^/\s]+/.test(s.url)&&date(s.checked_on)&&s.checked_on<=data.checked_on&&(s.date===null||date(s.date)));
    require(s.document_id===null?s.page===null&&s.sha256===null:text(s.document_id)&&Number.isInteger(s.page)&&s.page>0&&typeof s.sha256==="string"&&/^[a-f0-9]{64}$/.test(s.sha256));
  }
  for(const g of Object.values(data.guides)){
    require(object(g)&&[...GUIDE_SECTIONS.map(([key])=>key),"title","availability"].every(k=>text(g[k]))&&["programme","programme_family","legal_framework","historical","mechanism","emerging","advisory"].includes(g.kind)&&date(g.checked_on)&&g.checked_on<=data.checked_on);
    for(const key of ["source_ids","unresolved","related"])require(Array.isArray(g[key])&&g[key].every(text)&&new Set(g[key]).size===g[key].length);
    require(g.source_ids.length>0&&g.source_ids.every(id=>Object.hasOwn(data.sources,id)));
  }
  return value;
}
export function guideFor(value,id){
  if(!Object.hasOwn(value.library.guides,id))throw Error(`No current introduction is registered for ${id}. Reload the guide library; the saved assessment is retained.`);
  return value.library.guides[id];
}
