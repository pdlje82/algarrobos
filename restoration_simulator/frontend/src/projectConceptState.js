import {validateDeliveryPlan} from "./deliveryPlanState.js";
import configuration from "../../scenarios/funding-project-concept-v1.json" with {type:"json"};
import documents from "../../scenarios/documents.json" with {type:"json"};
import funding from "../../scenarios/funding.json" with {type:"json"};
import edl from "../../scenarios/funding-edl-v1.json" with {type:"json"};

export const CONCEPT_ROUTES=["LEADER-AL20-3.4","LEADER-AL20-3.5"];
export const ACTIVITY_FIELDS=["title","description","outcome","responsible","timing","evidence","reference"];
const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const text=v=>typeof v==="string";
const uuid=v=>text(v)&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
function require(ok){if(!ok)throw Error("Incompatible project concept data. Retain your edits, restart Python and reload the matching concept library.");}
function keys(v,names){return object(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));}
function ids(v,allowed){return Array.isArray(v)&&v.every(x=>text(x)&&allowed.includes(x))&&new Set(v).size===v.length;}
function source(s){const record=documents.documents.find(x=>x.id===s.document_id);require(record!==undefined&&record.sha256===s.sha256&&Number.isInteger(s.page)&&s.page>0&&s.page<=record.pages&&text(s.label)&&text(s.role));}
const bindingIds=[...funding.selection.profiles.line3.criteria.flatMap(c=>c.choices.map(x=>x.id)),...edl.items.filter(x=>x.classification==="prioritised_need").map(x=>x.id)];

export function validateConceptGuide(value){
  require(object(value)&&value.version===1&&text(value.library_hash)&&/^[a-f0-9]{64}$/.test(value.library_hash));
  const d=value.library;
  require(keys(d,["version","id","checked_on","defaults","limits","ui","publications","sources","bindings","templates","core_suggestions"])&&d.version===1&&d.id==="al20-project-concept-v1"&&text(d.checked_on));
  require(keys(d.defaults,["title","purpose","notes","activity"])&&[d.defaults.title,d.defaults.purpose,d.defaults.notes].every(text)&&d.defaults.title.trim()&&keys(d.defaults.activity,ACTIVITY_FIELDS)&&Object.values(d.defaults.activity).every(text));
  require(keys(d.limits,["activities","short_text","long_text"])&&Object.values(d.limits).every(n=>Number.isInteger(n)&&n>0)&&keys(d.ui,["preview_delay_ms","autosave_delay_ms"])&&Object.values(d.ui).every(n=>Number.isInteger(n)&&n>0));
  require(object(d.sources)&&object(d.templates)&&keys(d.bindings,bindingIds)&&object(d.publications));
  for(const s of Object.values(d.sources)){source(s);require(Object.hasOwn(d.publications,s.document_id));}
  for(const [id,p] of Object.entries(d.publications))require(documents.documents.some(d=>d.id===id&&d.sha256===p.sha256)&&text(p.download_url)&&p.download_url.startsWith("https://"));
  const refs=v=>Array.isArray(v)&&v.length>0&&v.every(id=>Object.hasOwn(d.sources,id));
  for(const t of Object.values(d.templates))require(ids(t.routes,CONCEPT_ROUTES)&&t.routes.length>0&&[t.title,t.description,t.outcome].every(text)&&t.title.trim()&&t.description.trim()&&refs(t.sources));
  for(const b of Object.values(d.bindings))require(keys(b,["label","kind","template_ids","explanation","sources","confirmation"])&&text(b.label)&&text(b.explanation)&&["starter","evidence_only","manual"].includes(b.kind)&&ids(b.template_ids,Object.keys(d.templates))&&(b.kind==="starter")===(b.template_ids.length>0)&&refs(b.sources)&&(b.confirmation===null||text(b.confirmation)));
  require(JSON.stringify(d.core_suggestions)===JSON.stringify(["NPL3","NPL4","NPL8"]));
  return value;
}

export function validateConcept(c,guide=configuration){
  require(keys(c,["version","id","route","guide_id","guide_hash","title","purpose","objectives","activities","justifications","notes",...(Object.hasOwn(c,"delivery_plan")?["delivery_plan"]:[])])&&c.version===1&&uuid(c.id)&&CONCEPT_ROUTES.includes(c.route)&&c.guide_id===guide.id&&/^[a-f0-9]{64}$/.test(c.guide_hash));
  require([c.title,c.purpose,c.notes].every(v=>text(v)&&v.length<=guide.limits.long_text)&&c.title.trim()&&ids(c.objectives,Object.keys(guide.bindings).filter(id=>id.startsWith("NPL")))&&object(c.justifications)&&Object.entries(c.justifications).every(([id,v])=>Object.hasOwn(guide.bindings,id)&&text(v)&&v.length<=guide.limits.long_text));
  require(Array.isArray(c.activities)&&c.activities.length<=guide.limits.activities&&new Set(c.activities.map(a=>a.id)).size===c.activities.length);
  for(const a of c.activities)require(keys(a,[...ACTIVITY_FIELDS,"id","template_id","bindings"])&&uuid(a.id)&&ACTIVITY_FIELDS.every(k=>text(a[k])&&a[k].length<=guide.limits.long_text)&&a.title.trim()&&a.title.length<=guide.limits.short_text&&ids(a.bindings,Object.keys(guide.bindings))&&(a.template_id===null||Object.hasOwn(guide.templates,a.template_id)&&guide.templates[a.template_id].routes.includes(c.route)));
  if(Object.hasOwn(c,"delivery_plan"))validateDeliveryPlan(c.delivery_plan,c);
  return c;
}

export function validateConceptReport(value){
  require(object(value)&&value.version===1&&object(value.context)&&Array.isArray(value.gaps)&&value.gaps.every(text)&&Array.isArray(value.selected_claims)&&Array.isArray(value.supporting_references)&&Array.isArray(value.sources)&&text(value.markdown)&&object(value.score)&&Number.isFinite(value.score.subtotal)&&Number.isInteger(value.score.unresolved));
  for(const s of value.sources)source(s);
  validateConcept(value.concept);return value;
}

export function validateTransfer(value){
  require(object(value)&&value.version===1&&uuid(value.concept_id)&&CONCEPT_ROUTES.includes(value.route)&&typeof value.first_transfer==="boolean"&&text(value.notice)&&/^[a-f0-9]{64}$/.test(value.preview_hash)&&Array.isArray(value.fields));
  for(const f of value.fields)require(keys(f,["path","baseline","navigator","demonstrator","conflict","suggested"])&&Array.isArray(f.path)&&f.path.every(text)&&typeof f.conflict==="boolean"&&(f.suggested===null||["navigator","demonstrator"].includes(f.suggested)));
  return value;
}

export function includeActivity(concept,library,templateId,bindingIds,id){
  validateConcept(concept,library);
  if(!uuid(id))throw Error("Create a valid activity identity.");
  let fields={...library.defaults.activity};
  if(templateId!==null){
    if(!Object.hasOwn(library.templates,templateId)||!library.templates[templateId].routes.includes(concept.route))throw Error("This activity starter is unavailable for the selected route.");
    const t=library.templates[templateId];fields={...fields,title:t.title,description:t.description,outcome:t.outcome};
  }
  const next={...concept,activities:[...concept.activities,{...fields,id,template_id:templateId,bindings:[...bindingIds]}]};
  return validateConcept(next,library);
}

export function copyConcepts(concepts){
  return Object.fromEntries(Object.entries(concepts).map(([route,c])=>{
    const next=structuredClone(c),mapping=new Map(c.activities.map(a=>[a.id,crypto.randomUUID()]));next.id=crypto.randomUUID();next.activities=next.activities.map(a=>({...a,id:mapping.get(a.id)}));
    if(Object.hasOwn(next,"delivery_plan"))for(const topic of Object.values(next.delivery_plan.topics))topic.activity_ids=topic.activity_ids.map(id=>{if(!mapping.has(id))throw Error("A delivery activity link is missing. Resolve it before duplicating.");return mapping.get(id);});
    return [route,next];
  }));
}
