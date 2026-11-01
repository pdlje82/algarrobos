// Current editorial advice never writes to an assessment or its frozen rules.
import documents from "../../scenarios/documents.json" with {type:"json"};
import catalogue from "../../scenarios/funding.json" with {type:"json"};

export const SELECTION_GUIDANCE_ROUTES=["LEADER-AL20-3.4","LEADER-AL20-3.5"];
export function validateSelectionGuidanceResponse(value){
  function require(ok){if(!ok)throw Error("Incompatible AL20 selection guidance. Restart Python and retry the guidance; retain your assessment.");}
  const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
  const text=v=>typeof v==="string"&&v.trim().length>0;
  const keys=(v,expected)=>object(v)&&Object.keys(v).length===expected.length&&expected.every(k=>Object.hasOwn(v,k));
  const unique=v=>Array.isArray(v)&&v.every(text)&&new Set(v).size===v.length;
  const date=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  require(keys(value,["version","library_hash","library"])&&value.version===1&&/^[a-f0-9]{64}$/.test(value.library_hash));
  const d=value.library;
  require(keys(d,["version","title","checked_on","routes","publications","sources","route_contexts","recommendations","nodes"])&&d.version===1&&text(d.title)&&date(d.checked_on));
  require(unique(d.routes)&&d.routes.length===2&&d.routes.every(r=>SELECTION_GUIDANCE_ROUTES.includes(r)));
  require(keys(d.publications,["FUND-004","FUND-008","FUND-009","FUND-010","FUND-013"]));
  for(const [id,p] of Object.entries(d.publications)){
    const record=documents.documents.find(r=>r.id===id);
    require(keys(p,["title","edition","publication_url","download_url","review_note","sha256"])&&Object.values(p).every(text)&&record!==undefined&&record.sha256===p.sha256);
    require([p.publication_url,p.download_url].every(url=>/^https:\/\/[^/\s]+/.test(url)));
  }
  require(object(d.sources)&&Object.keys(d.sources).length>0&&Object.keys(d.sources).every(text));
  for(const s of Object.values(d.sources)){
    require(keys(s,["document_id","page","sha256","label","role","verified_on"])&&text(s.label)&&text(s.role)&&date(s.verified_on)&&s.verified_on<=d.checked_on&&Object.hasOwn(d.publications,s.document_id));
    const record=documents.documents.find(r=>r.id===s.document_id);
    require(record!==undefined&&record.sha256===s.sha256&&Number.isInteger(s.page)&&s.page>=1&&s.page<=record.pages);
  }
  const refs=v=>unique(v)&&v.length>0&&v.every(id=>Object.hasOwn(d.sources,id));
  const block=v=>keys(v,["text","sources"])&&text(v.text)&&refs(v.sources);
  require(keys(d.route_contexts,d.routes)&&object(d.recommendations)&&Object.keys(d.recommendations).length>0&&Object.keys(d.recommendations).every(text));
  for(const c of Object.values(d.route_contexts))require(keys(c,["official","follow_up"])&&block(c.official)&&block(c.follow_up));
  for(const r of Object.values(d.recommendations))require(keys(r,["routes","text","sources"])&&unique(r.routes)&&r.routes.length>0&&r.routes.every(route=>d.routes.includes(route))&&text(r.text)&&refs(r.sources));
  const expected=[...new Set(Object.values(catalogue.selection.profiles).flatMap(p=>p.criteria.flatMap(c=>c.choices.filter(x=>x.routes.some(r=>d.routes.includes(r))).map(x=>x.id))))];
  require(keys(d.nodes,expected));
  const used=new Set();
  for(const node of Object.values(d.nodes)){
    require(keys(node,["official","restoration","application","payment","follow_up","recommendations","unresolved"])&&["official","restoration","application","payment","follow_up"].every(k=>block(node[k])));
    require(unique(node.recommendations)&&node.recommendations.length>0&&node.recommendations.every(id=>Object.hasOwn(d.recommendations,id))&&Array.isArray(node.unresolved)&&node.unresolved.every(block));
    for(const route of d.routes)require(node.recommendations.some(id=>d.recommendations[id].routes.includes(route)));
    node.recommendations.forEach(id=>used.add(id));
  }
  require(used.size===Object.keys(d.recommendations).length);
  return value;
}

export function selectionGuidanceFor(value,route,id){
  if(!value.library.routes.includes(route))throw Error("Choose a supported AL20 assessment route for this guidance.");
  if(!Object.hasOwn(value.library.nodes,id))throw Error(`No selection guidance is registered for ${id}. Retry the guidance; retain your answers.`);
  const node=value.library.nodes[id];
  const recommendations=node.recommendations.map(key=>({id:key,...value.library.recommendations[key]})).filter(r=>r.routes.includes(route));
  if(recommendations.length===0)throw Error(`No recommendations are registered for ${id} on ${route}. Retry the guidance.`);
  return {...node,recommendations};
}
