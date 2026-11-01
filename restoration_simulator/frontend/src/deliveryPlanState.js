import configuration from "../../scenarios/funding-delivery-plan-v1.json" with {type:"json"};
import documents from "../../scenarios/documents.json" with {type:"json"};
const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const string=v=>typeof v==="string";
function require(ok){if(!ok)throw Error("Incompatible delivery-plan information. Retain your draft, restart Python and retry the matching delivery library.");}
export const DELIVERY_TOPICS=["comparison","novelty","monitoring","participation","sharing","publication"];
export function validateDeliveryLibrary(value){
 require(object(value)&&value.version===1&&/^[a-f0-9]{64}$/.test(value.library_hash));const d=value.library;
 require(exact(d,Object.keys(configuration))&&d.version===1&&d.id===configuration.id&&JSON.stringify(d.routes)===JSON.stringify(configuration.routes)&&exact(d.topics,DELIVERY_TOPICS)&&exact(d.defaults.topics,DELIVERY_TOPICS)&&object(d.sources));
 for(const [id,t] of Object.entries(d.topics)){
  require(exact(t,["label","kind","routes","options","explanation","sources","extra_fields"])&&[t.label,t.explanation].every(string)&&["single","multiple"].includes(t.kind)&&Array.isArray(t.routes)&&t.routes.length>0&&t.routes.every(r=>d.routes.includes(r))&&Array.isArray(t.options)&&t.options.length>0&&new Set(t.options.map(o=>o.id)).size===t.options.length&&t.options.every(o=>exact(o,["id","label","routes"])&&string(o.id)&&string(o.label)&&o.routes.length>0&&o.routes.every(r=>t.routes.includes(r)))&&t.sources.length>0&&t.sources.every(s=>Object.hasOwn(d.sources,s)));
  const v=d.defaults.topics[id];require(exact(v,["answer","reviewed","explanation","reference","activity_ids",...t.extra_fields])&&v.reviewed===false&&JSON.stringify(v.answer)===(t.kind==="multiple"?"[]":"null")&&v.activity_ids.length===0&&["explanation","reference",...t.extra_fields].every(k=>v[k]===""));
 }
 for(const s of Object.values(d.sources)){const doc=documents.documents.find(x=>x.id===s.document_id);require(doc!==undefined&&doc.sha256===s.sha256&&Number.isInteger(s.page)&&s.page>0&&s.page<=doc.pages);}
 require(exact(d.legacy_fields,DELIVERY_TOPICS)&&exact(d.monitoring_legacy,["photo_cover","photo_survival","infiltration"])&&d.minimum_publication_years===3&&JSON.stringify(d.execution_financing)==='["self","partner"]');
 return value;
}
export function validateDeliveryPlan(plan,concept,library=configuration){
 require(exact(plan,["version","library_id","library_hash","topics","legacy_source"])&&plan.version===1&&plan.library_id===library.id&&/^[a-f0-9]{64}$/.test(plan.library_hash)&&exact(plan.topics,DELIVERY_TOPICS));
 require(plan.legacy_source===null||exact(plan.legacy_source,Object.values(library.legacy_fields))&&Object.values(plan.legacy_source).every(string));
 const activities=concept.activities.map(a=>a.id);
 for(const id of DELIVERY_TOPICS){const t=library.topics[id],v=plan.topics[id],allowed=t.options.filter(o=>o.routes.includes(concept.route)).map(o=>o.id);
  require(exact(v,["answer","reviewed","explanation","reference","activity_ids",...t.extra_fields])&&typeof v.reviewed==="boolean"&&["explanation","reference",...t.extra_fields].every(k=>string(v[k])&&v[k].length<=10000)&&Array.isArray(v.activity_ids)&&new Set(v.activity_ids).size===v.activity_ids.length&&v.activity_ids.every(a=>activities.includes(a)));
  require(t.kind==="multiple"?Array.isArray(v.answer)&&new Set(v.answer).size===v.answer.length&&v.answer.every(a=>allowed.includes(a)):v.answer===null||allowed.includes(v.answer));
  if(!t.routes.includes(concept.route))require(v.answer===null&&!v.reviewed&&v.activity_ids.length===0);
 }return plan;
}
export function validateDeliveryPrepared(value){require(object(value)&&value.version===1&&object(value.plan)&&["unresolved","saved_execution","committed_execution","scenario_defaults"].includes(value.origin)&&string(value.notice)&&(value.retained_settings===null||object(value.retained_settings)));return value;}
export function validateExecutionReview(v){require(object(v)&&v.version===1&&string(v.concept_id)&&string(v.route)&&Array.isArray(v.changes)&&v.changes.every(c=>exact(c,["field","before","after"]))&&object(v.choices)&&object(v.proposed_inputs)&&Array.isArray(v.blockers)&&v.blockers.every(string)&&Array.isArray(v.notices)&&v.notices.every(string)&&typeof v.can_apply==="boolean"&&v.can_apply===(v.blockers.length===0)&&/^[a-f0-9]{64}$/.test(v.preview_hash));return v;}
export function editDeliveryTopic(concept,id,field,value){
 const plan=concept.delivery_plan,previous=plan.topics[id];
 if(!Object.hasOwn(previous,field))throw Error("Unsupported delivery topic field.");
 return {...concept,delivery_plan:{...plan,topics:{...plan.topics,[id]:{...previous,[field]:value,reviewed:field==="reviewed"?value:false}}}};
}
export function deliveryActivityLinks(concept,id){return Object.hasOwn(concept,"delivery_plan")?DELIVERY_TOPICS.filter(t=>concept.delivery_plan.topics[t].activity_ids.includes(id)):[];}
export function removeConceptActivity(concept,id){
 const next={...concept,activities:concept.activities.filter(a=>a.id!==id)};
 if(Object.hasOwn(concept,"delivery_plan"))next.delivery_plan={...concept.delivery_plan,topics:Object.fromEntries(Object.entries(concept.delivery_plan.topics).map(([tid,v])=>[tid,v.activity_ids.includes(id)?{...v,reviewed:false,activity_ids:v.activity_ids.filter(a=>a!==id)}:v]))};
 return next;
}
